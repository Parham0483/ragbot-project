#!/usr/bin/env python3
# RAGBot performance benchmark — naive RAG vs agentic RAG
# Usage: python scripts/benchmark_compare.py --chatbot-id 12 --count 10

import os
import sys
import json
import time
import argparse
import statistics
from datetime import datetime
from pathlib import Path

# load .env before Django so API keys are available
_env_path = Path(__file__).resolve().parent.parent / "backend" / ".env"
if _env_path.exists():
    for _line in _env_path.read_text().splitlines():
        _line = _line.strip()
        if _line and not _line.startswith('#') and '=' in _line:
            _k, _v = _line.split('=', 1)
            os.environ.setdefault(_k.strip(), _v.strip())

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ragbot_backend.settings")

import django
django.setup()

from chatbots.models import Chatbot
from services.rag_service import rag_service

EVIDENCE_DIR = Path(__file__).resolve().parent.parent / "tests/evidence/performance"
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)

# 15 realistic queries that actually need document retrieval to answer
TEST_QUERIES = [
    "What are the main services provided?",
    "What are the key policies mentioned in the documents?",
    "Can you summarise the main topics covered?",
    "What procedures or processes are described?",
    "Are there any specific requirements or criteria mentioned?",
    "What recommendations are made in the documents?",
    "Describe the roles and responsibilities mentioned.",
    "What are the stated goals or objectives?",
    "What challenges or limitations are discussed?",
    "Are there any guidelines or standards referenced?",
    "What is the overall purpose of this system?",
    "What information is available about costs or fees?",
    "What are the key findings or conclusions?",
    "Who are the intended users or beneficiaries?",
    "What steps or stages are described in the process?",
]


def run_naive(chatbot, query):
    t0 = time.monotonic()
    result = rag_service.generate_response(
        chatbot=chatbot,
        user_message=query,
        conversation_history=None,
        model=chatbot.ai_model,
        provider=chatbot.ai_provider,
    )
    ms = int((time.monotonic() - t0) * 1000)
    return result, ms


def run_agentic(chatbot, query):
    t0 = time.monotonic()
    result = rag_service.generate_response_agentic(
        chatbot=chatbot,
        user_message=query,
        conversation_history=None,
    )
    ms = int((time.monotonic() - t0) * 1000)
    return result, ms


def fmt(ms):
    if ms is None or not isinstance(ms, (int, float)):
        return "N/A"
    return f"{int(ms):,}ms"


def calc_stats(results):
    successful = [r for r in results if r['success']]
    times  = [r['response_time_ms'] for r in successful]
    tokens = [r['tokens_used']      for r in successful]
    chunks = [r['chunks_retrieved'] for r in successful]
    if not times:
        return {'error': 'no successful queries'}
    return {
        'total': len(results),
        'successful': len(successful),
        'success_rate_pct': round(len(successful) / len(results) * 100, 1),
        'avg_ms': round(statistics.mean(times)),
        'median_ms': round(statistics.median(times)),
        'min_ms': min(times),
        'max_ms': max(times),
        'stdev_ms': round(statistics.stdev(times)) if len(times) > 1 else 0,
        'p95_ms': round(sorted(times)[int(len(times) * 0.95)]) if len(times) >= 5 else None,
        'avg_tokens': round(statistics.mean(tokens)),
        'avg_chunks': round(statistics.mean(chunks), 1),
        'meets_nfr1': round(statistics.mean(times)) < 3000,
    }


def run_benchmark(chatbot_id: int, count: int):
    chatbot = Chatbot.objects.get(id=chatbot_id)

    print(f"\n{'='*60}")
    print(f"  RAGBot — Naive RAG vs Agentic RAG Benchmark")
    print(f"  Chatbot : {chatbot.name} (id={chatbot_id})")
    print(f"  Queries : {count}")
    print(f"  Started : {datetime.now().strftime('%d %b %Y %H:%M:%S')}")
    print(f"{'='*60}\n")

    naive_results   = []
    agentic_results = []

    for i in range(count):
        query = TEST_QUERIES[i % len(TEST_QUERIES)]
        print(f"  Query {i+1:02d}/{count}: {query[:55]}")

        n_result, n_ms = run_naive(chatbot, query)
        n_ok = n_result.get('success', False)
        n_chunks = len(n_result.get('chunks_used', []))
        n_tokens = n_result.get('tokens_used', 0)
        naive_results.append({
            'query': query,
            'success': n_ok,
            'response_time_ms': n_ms,
            'tokens_used': n_tokens,
            'chunks_retrieved': n_chunks,
        })
        if n_ok:
            print(f"    naive   : ok    {fmt(n_ms)}  tokens={n_tokens}  chunks={n_chunks}")
        else:
            print(f"    naive   : FAIL  {fmt(n_ms)}  error={n_result.get('error','?')}")

        # Claude API rate limits ~5 req/min on new accounts
        time.sleep(15)

        a_result, a_ms = run_agentic(chatbot, query)
        a_ok = a_result.get('success', False)
        a_chunks = len(a_result.get('chunks_used', []))
        a_tokens = a_result.get('tokens_used', 0)
        agentic_results.append({
            'query': query,
            'success': a_ok,
            'response_time_ms': a_ms,
            'tokens_used': a_tokens,
            'chunks_retrieved': a_chunks,
        })
        if a_ok:
            print(f"    agentic : ok    {fmt(a_ms)}  tokens={a_tokens}  chunks={a_chunks}")
        else:
            print(f"    agentic : FAIL  {fmt(a_ms)}  error={a_result.get('error','?')}")
        print()

        time.sleep(15)

    n_stats = calc_stats(naive_results)
    a_stats = calc_stats(agentic_results)

    print(f"\n{'='*60}")
    print(f"  RESULTS")
    print(f"{'='*60}")
    print(f"  {'Metric':<28} {'Naive RAG':>12}  {'Agentic RAG':>12}")
    print(f"  {'-'*28} {'-'*12}  {'-'*12}")
    print(f"  {'Success rate':<28} {str(n_stats.get('success_rate_pct',''))+'%':>12}  {str(a_stats.get('success_rate_pct',''))+'%':>12}")
    print(f"  {'Avg response time':<28} {fmt(n_stats.get('avg_ms')):>12}  {fmt(a_stats.get('avg_ms')):>12}")
    print(f"  {'Median response time':<28} {fmt(n_stats.get('median_ms')):>12}  {fmt(a_stats.get('median_ms')):>12}")
    print(f"  {'Min response time':<28} {fmt(n_stats.get('min_ms')):>12}  {fmt(a_stats.get('min_ms')):>12}")
    print(f"  {'Max response time':<28} {fmt(n_stats.get('max_ms')):>12}  {fmt(a_stats.get('max_ms')):>12}")
    print(f"  {'Std deviation':<28} {fmt(n_stats.get('stdev_ms')):>12}  {fmt(a_stats.get('stdev_ms')):>12}")
    print(f"  {'Avg tokens used':<28} {str(n_stats.get('avg_tokens','N/A')):>12}  {str(a_stats.get('avg_tokens','N/A')):>12}")
    print(f"  {'Avg chunks retrieved':<28} {str(n_stats.get('avg_chunks','N/A')):>12}  {str(a_stats.get('avg_chunks','N/A')):>12}")
    print(f"  {'Meets NFR1 (<3000ms)':<28} {'YES' if n_stats.get('meets_nfr1') else 'NO':>12}  {'YES' if a_stats.get('meets_nfr1') else 'NO':>12}")
    print(f"{'='*60}\n")

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    output = {
        'benchmark_date': datetime.now().isoformat(),
        'chatbot_id': chatbot_id,
        'chatbot_name': chatbot.name,
        'query_count': count,
        'naive_rag': {'statistics': n_stats, 'individual': naive_results},
        'agentic_rag': {'statistics': a_stats, 'individual': agentic_results},
    }

    json_path = EVIDENCE_DIR / f"compare_{ts}.json"
    with open(json_path, 'w') as f:
        json.dump(output, f, indent=2)

    report = f"""PERFORMANCE BENCHMARK — Naive RAG vs Agentic RAG
Generated  : {datetime.now().strftime('%d %B %Y, %H:%M')}
Chatbot    : {chatbot.name} (id={chatbot_id})
Queries    : {count}

NAIVE RAG (OpenAI GPT-3.5-turbo + pgvector, unconditional retrieval)
  Success rate      : {n_stats.get('success_rate_pct')}%
  Average latency   : {n_stats.get('avg_ms')}ms
  Median latency    : {n_stats.get('median_ms')}ms
  P95 latency       : {n_stats.get('p95_ms')}ms
  Min / Max         : {n_stats.get('min_ms')}ms / {n_stats.get('max_ms')}ms
  Std deviation     : {n_stats.get('stdev_ms')}ms
  Avg tokens/query  : {n_stats.get('avg_tokens')}
  Avg chunks/query  : {n_stats.get('avg_chunks')} (always 5 retrieved)
  NFR1 (<3000ms)    : {'PASS' if n_stats.get('meets_nfr1') else 'FAIL'}

AGENTIC RAG (Claude Sonnet 4.6 + pgvector, tool-use retrieval)
  Success rate      : {a_stats.get('success_rate_pct')}%
  Average latency   : {a_stats.get('avg_ms')}ms
  Median latency    : {a_stats.get('median_ms')}ms
  P95 latency       : {a_stats.get('p95_ms')}ms
  Min / Max         : {a_stats.get('min_ms')}ms / {a_stats.get('max_ms')}ms
  Std deviation     : {a_stats.get('stdev_ms')}ms
  Avg tokens/query  : {a_stats.get('avg_tokens')}
  Avg chunks/query  : {a_stats.get('avg_chunks')} (only when Claude decides to search)
  NFR1 (<3000ms)    : {'PASS' if a_stats.get('meets_nfr1') else 'FAIL'}

LATENCY DELTA (agentic vs naive)
  Avg overhead      : +{a_stats.get('avg_ms',0) - n_stats.get('avg_ms',0)}ms
  Relative overhead : +{round((a_stats.get('avg_ms',0) / max(n_stats.get('avg_ms',1),1) - 1)*100)}%
"""

    txt_path = EVIDENCE_DIR / f"compare_{ts}_report.txt"
    with open(txt_path, 'w') as f:
        f.write(report)

    print(f"  JSON saved : {json_path}")
    print(f"  Report     : {txt_path}\n")

    return output


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--chatbot-id', type=int, default=12)
    parser.add_argument('--count', type=int, default=10)
    args = parser.parse_args()
    run_benchmark(args.chatbot_id, args.count)
