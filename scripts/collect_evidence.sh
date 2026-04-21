#!/bin/bash
# =============================================================
# RAGBot Evidence Collection Script
# Run after every Claude Code feature prompt
# Usage: ./scripts/collect_evidence.sh "feature-name" "what was built"
# =============================================================

FEATURE="${1:-unknown-feature}"
DESCRIPTION="${2:-no description provided}"
DATE=$(date +%Y%m%d_%H%M%S)
DATE_READABLE=$(date '+%d %B %Y, %H:%M')
EVIDENCE_DIR="tests/evidence"
SESSION_DIR="${EVIDENCE_DIR}/sessions/${DATE}_${FEATURE}"

# Colours for terminal output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}  RAGBot Evidence Collector${NC}"
echo -e "${BLUE}  Feature: ${FEATURE}${NC}"
echo -e "${BLUE}  Date: ${DATE_READABLE}${NC}"
echo -e "${BLUE}=================================================${NC}"

# Create session directory
mkdir -p "${SESSION_DIR}/screenshots"
mkdir -p "${EVIDENCE_DIR}/screenshots"
mkdir -p "${EVIDENCE_DIR}/performance"
mkdir -p "${EVIDENCE_DIR}/tests"

# ── 1. RUN BACKEND TESTS ──────────────────────────────────────
echo -e "\n${YELLOW}[1/5] Running backend tests...${NC}"
cd backend
source venv/bin/activate 2>/dev/null || true

TEST_OUTPUT=$(python -m pytest -v --tb=short 2>&1)
TEST_EXIT=$?
echo "$TEST_OUTPUT" > "../${SESSION_DIR}/test-results.txt"

# Count pass/fail
PASSED=$(echo "$TEST_OUTPUT" | grep -c "PASSED" || echo 0)
FAILED=$(echo "$TEST_OUTPUT" | grep -c "FAILED" || echo 0)
ERRORS=$(echo "$TEST_OUTPUT" | grep -c "ERROR" || echo 0)

if [ $TEST_EXIT -eq 0 ]; then
    echo -e "${GREEN}  ✓ Tests passed: ${PASSED} passed, ${FAILED} failed${NC}"
else
    echo -e "${RED}  ✗ Tests failed: ${PASSED} passed, ${FAILED} failed, ${ERRORS} errors${NC}"
fi

echo "PASSED=${PASSED}" > "../${SESSION_DIR}/test-summary.txt"
echo "FAILED=${FAILED}" >> "../${SESSION_DIR}/test-summary.txt"
echo "ERRORS=${ERRORS}" >> "../${SESSION_DIR}/test-summary.txt"
echo "EXIT_CODE=${TEST_EXIT}" >> "../${SESSION_DIR}/test-summary.txt"

cd ..

# ── 2. PERFORMANCE METRICS FROM DATABASE ─────────────────────
echo -e "\n${YELLOW}[2/5] Collecting performance metrics...${NC}"
cd backend
source venv/bin/activate 2>/dev/null || true

PERF_OUTPUT=$(python manage.py shell -c "
import json
from django.db.models import Avg, Max, Min, Count
from django.db.models.functions import Percentile

try:
    from chatbots.models import Message, Chatbot
    from documents.models import Document, DocumentChunk

    # Response time stats
    stats = Message.objects.filter(
        role='assistant',
        response_time_ms__isnull=False
    ).aggregate(
        avg_ms=Avg('response_time_ms'),
        max_ms=Max('response_time_ms'),
        min_ms=Min('response_time_ms'),
        count=Count('id')
    )

    # Token usage
    token_stats = Message.objects.filter(
        tokens_used__isnull=False
    ).aggregate(
        avg_tokens=Avg('tokens_used'),
        total_tokens=Count('tokens_used')
    )

    # Feedback stats
    helpful = Message.objects.filter(was_helpful=True).count()
    not_helpful = Message.objects.filter(was_helpful=False).count()

    # System counts
    total_chatbots = Chatbot.objects.count()
    active_chatbots = Chatbot.objects.filter(is_active=True).count()
    total_docs = Document.objects.count()
    total_chunks = DocumentChunk.objects.count()
    total_messages = Message.objects.count()

    result = {
        'response_time': {
            'avg_ms': round(stats['avg_ms'] or 0, 2),
            'max_ms': stats['max_ms'] or 0,
            'min_ms': stats['min_ms'] or 0,
            'sample_count': stats['count']
        },
        'tokens': {
            'avg_per_query': round(token_stats['avg_tokens'] or 0, 2),
            'total_recorded': token_stats['total_tokens']
        },
        'feedback': {
            'helpful': helpful,
            'not_helpful': not_helpful,
            'rate': round(helpful / (helpful + not_helpful) * 100, 1) if (helpful + not_helpful) > 0 else 0
        },
        'system': {
            'total_chatbots': total_chatbots,
            'active_chatbots': active_chatbots,
            'total_documents': total_docs,
            'total_chunks': total_chunks,
            'total_messages': total_messages
        }
    }
    print(json.dumps(result, indent=2))

except Exception as e:
    print(json.dumps({'error': str(e)}))
" 2>/dev/null)

echo "$PERF_OUTPUT" > "../${SESSION_DIR}/performance-metrics.json"
echo "$PERF_OUTPUT" >> "../${EVIDENCE_DIR}/performance/all-metrics.jsonl"

# Extract key number for terminal
AVG_MS=$(echo "$PERF_OUTPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('response_time',{}).get('avg_ms','N/A'))" 2>/dev/null || echo "N/A")
echo -e "${GREEN}  ✓ Avg response time: ${AVG_MS}ms${NC}"

cd ..

# ── 3. API ENDPOINT HEALTH CHECK ─────────────────────────────
echo -e "\n${YELLOW}[3/5] Checking API endpoints...${NC}"

# Start server in background if not running
SERVER_STARTED=false
if ! curl -s http://localhost:8000/api/auth/ > /dev/null 2>&1; then
    echo "  Starting Django server..."
    cd backend
    source venv/bin/activate 2>/dev/null || true
    python manage.py runserver --noreload > /dev/null 2>&1 &
    SERVER_PID=$!
    sleep 3
    SERVER_STARTED=true
    cd ..
fi

# Check each key endpoint
ENDPOINTS=(
    "GET http://localhost:8000/api/auth/ auth-health"
    "GET http://localhost:8000/api/chatbots/ chatbots-list"
)

ENDPOINT_RESULTS=""
for entry in "${ENDPOINTS[@]}"; do
    METHOD=$(echo $entry | cut -d' ' -f1)
    URL=$(echo $entry | cut -d' ' -f2)
    NAME=$(echo $entry | cut -d' ' -f3)
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X $METHOD "$URL" \
        -H "Content-Type: application/json" 2>/dev/null)
    
    if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "401" || "$HTTP_CODE" == "403" ]]; then
        STATUS="✓ REACHABLE (${HTTP_CODE})"
        echo -e "${GREEN}  ✓ ${NAME}: ${HTTP_CODE}${NC}"
    else
        STATUS="✗ UNREACHABLE (${HTTP_CODE})"
        echo -e "${RED}  ✗ ${NAME}: ${HTTP_CODE}${NC}"
    fi
    ENDPOINT_RESULTS="${ENDPOINT_RESULTS}\n${NAME}: ${STATUS}"
done

echo -e "${ENDPOINT_RESULTS}" > "${SESSION_DIR}/endpoint-health.txt"

# ── 4. GIT DIFF — WHAT CHANGED ───────────────────────────────
echo -e "\n${YELLOW}[4/5] Recording code changes...${NC}"

# Files changed
GIT_STATUS=$(git status --short 2>/dev/null || echo "not a git repo")
GIT_DIFF=$(git diff --stat 2>/dev/null || echo "")
GIT_DIFF_FULL=$(git diff 2>/dev/null | head -500 || echo "")

echo "=== Git Status ===" > "${SESSION_DIR}/code-changes.txt"
echo "$GIT_STATUS" >> "${SESSION_DIR}/code-changes.txt"
echo "" >> "${SESSION_DIR}/code-changes.txt"
echo "=== Diff Summary ===" >> "${SESSION_DIR}/code-changes.txt"
echo "$GIT_DIFF" >> "${SESSION_DIR}/code-changes.txt"
echo "" >> "${SESSION_DIR}/code-changes.txt"
echo "=== Full Diff (first 500 lines) ===" >> "${SESSION_DIR}/code-changes.txt"
echo "$GIT_DIFF_FULL" >> "${SESSION_DIR}/code-changes.txt"

FILES_CHANGED=$(echo "$GIT_STATUS" | grep -v "^$" | wc -l | tr -d ' ')
echo -e "${GREEN}  ✓ ${FILES_CHANGED} files changed${NC}"

# ── 5. WRITE SESSION JOURNAL ENTRY ───────────────────────────
echo -e "\n${YELLOW}[5/5] Writing evidence journal entry...${NC}"

JOURNAL_ENTRY="
================================================================================
SESSION: ${DATE_READABLE}
FEATURE: ${FEATURE}
DESCRIPTION: ${DESCRIPTION}
================================================================================

TEST RESULTS:
  Passed:  ${PASSED}
  Failed:  ${FAILED}
  Errors:  ${ERRORS}
  Status:  $([ $TEST_EXIT -eq 0 ] && echo 'ALL PASSING' || echo 'FAILURES PRESENT')

PERFORMANCE:
  Avg Response Time: ${AVG_MS}ms
  Target (NFR1):     <3000ms
  Meeting Target:    $(python3 -c "print('YES' if float('${AVG_MS}'.replace('N/A','9999')) < 3000 else 'NO')" 2>/dev/null || echo 'N/A')

FILES CHANGED:
${GIT_STATUS}

EVIDENCE SAVED TO:
  ${SESSION_DIR}/

--------------------------------------------------------------------------------
"

echo "$JOURNAL_ENTRY" >> "${EVIDENCE_DIR}/EVIDENCE_JOURNAL.txt"
echo "$JOURNAL_ENTRY" > "${SESSION_DIR}/journal-entry.txt"

echo -e "${GREEN}  ✓ Journal updated${NC}"

# ── FINAL SUMMARY ─────────────────────────────────────────────
echo -e "\n${BLUE}=================================================${NC}"
echo -e "${BLUE}  Evidence Collection Complete${NC}"
echo -e "${BLUE}=================================================${NC}"
echo -e "  Session folder: ${SESSION_DIR}/"
echo -e "  Journal:        ${EVIDENCE_DIR}/EVIDENCE_JOURNAL.txt"
echo -e "  Tests:          $([ $TEST_EXIT -eq 0 ] && echo -e '${GREEN}PASSING${NC}' || echo -e '${RED}FAILING${NC}')"
echo -e "  Avg resp time:  ${AVG_MS}ms"
echo ""
echo -e "${YELLOW}  → Screenshots: ask Claude Code to take them and save to${NC}"
echo -e "${YELLOW}    ${SESSION_DIR}/screenshots/${NC}"
echo ""

# Kill background server if we started it
if [ "$SERVER_STARTED" = true ]; then
    kill $SERVER_PID 2>/dev/null || true
fi
