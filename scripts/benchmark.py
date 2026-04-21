#!/usr/bin/env python3
# RAGBot performance benchmark — records response times for NFR1 evidence
# Usage: python scripts/benchmark.py --chatbot-id 1 --count 20

import argparse
import json
import time
import requests
import statistics
from datetime import datetime
from pathlib import Path

EVIDENCE_DIR = Path("tests/evidence/performance")
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)

# Test queries that simulate real use (from your use cases)
TEST_QUERIES = [
    "What are your opening hours?",
    "Do you have gluten-free options?",
    "How can I contact you?",
    "What documents do you support?",
    "Tell me about your services",
    "What is your refund policy?",
    "How do I get started?",
    "What are the pricing plans?",
    "Can I upload PDF files?",
    "How accurate are the responses?",
    "What is RAG technology?",
    "How many chatbots can I create?",
    "Is there a free tier available?",
    "How do I embed the chatbot on my website?",
    "What file formats are supported?",
]


def run_benchmark(base_url: str, chatbot_id: int, count: int, auth_token: str = None):
    results = []
    headers = {"Content-Type": "application/json"}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
    
    print(f"\n{'='*50}")
    print(f"RAGBot Performance Benchmark")
    print(f"Chatbot ID: {chatbot_id}")
    print(f"Queries: {count}")
    print(f"{'='*50}\n")
    
    # Use widget endpoint (public, no auth needed)
    url = f"{base_url}/api/widget/{chatbot_id}/chat/"
    
    for i in range(count):
        query = TEST_QUERIES[i % len(TEST_QUERIES)]
        
        start = time.time()
        try:
            resp = requests.post(
                url,
                json={"message": query},
                timeout=30
            )
            elapsed_ms = (time.time() - start) * 1000
            
            success = resp.status_code == 200
            status = "✓" if success else "✗"
            
            result = {
                "query_num": i + 1,
                "query": query,
                "response_time_ms": round(elapsed_ms, 2),
                "status_code": resp.status_code,
                "success": success,
                "timestamp": datetime.now().isoformat()
            }
            
            if success:
                data = resp.json()
                result["response_preview"] = data.get("response", "")[:100]
            
            results.append(result)
            print(f"  {status} Query {i+1:2d}: {elapsed_ms:7.0f}ms — {query[:50]}")
            
        except Exception as e:
            elapsed_ms = (time.time() - start) * 1000
            results.append({
                "query_num": i + 1,
                "query": query,
                "response_time_ms": elapsed_ms,
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            })
            print(f"  ✗ Query {i+1:2d}: ERROR — {e}")
        
        # Small delay between queries
        time.sleep(0.5)
    
    # Calculate statistics
    successful = [r for r in results if r.get("success")]
    times = [r["response_time_ms"] for r in successful]
    
    if times:
        stats = {
            "total_queries": count,
            "successful": len(successful),
            "failed": count - len(successful),
            "success_rate": round(len(successful) / count * 100, 1),
            "avg_ms": round(statistics.mean(times), 2),
            "median_ms": round(statistics.median(times), 2),
            "min_ms": round(min(times), 2),
            "max_ms": round(max(times), 2),
            "p95_ms": round(sorted(times)[int(len(times) * 0.95)], 2) if len(times) >= 20 else None,
            "stdev_ms": round(statistics.stdev(times), 2) if len(times) > 1 else 0,
            "meets_nfr1_target": round(statistics.mean(times), 2) < 3000,  # NFR1: <3s
            "nfr1_target_ms": 3000
        }
    else:
        stats = {"error": "No successful queries"}
    
    # Print summary
    print(f"\n{'='*50}")
    print(f"BENCHMARK RESULTS")
    print(f"{'='*50}")
    print(f"  Success rate:    {stats.get('success_rate', 0)}%")
    print(f"  Avg response:    {stats.get('avg_ms', 'N/A')}ms")
    print(f"  Median:          {stats.get('median_ms', 'N/A')}ms")
    print(f"  P95:             {stats.get('p95_ms', 'N/A')}ms")
    print(f"  Min/Max:         {stats.get('min_ms', 'N/A')}ms / {stats.get('max_ms', 'N/A')}ms")
    print(f"  NFR1 (<3000ms):  {'✓ MEETS TARGET' if stats.get('meets_nfr1_target') else '✗ FAILS TARGET'}")
    print(f"{'='*50}\n")
    
    # Save results
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output = {
        "benchmark_date": datetime.now().isoformat(),
        "chatbot_id": chatbot_id,
        "statistics": stats,
        "individual_results": results
    }
    
    filepath = EVIDENCE_DIR / f"benchmark_{timestamp}.json"
    with open(filepath, "w") as f:
        json.dump(output, f, indent=2)
    
    # Also append to cumulative log
    with open(EVIDENCE_DIR / "benchmark-history.jsonl", "a") as f:
        f.write(json.dumps({
            "date": datetime.now().isoformat(),
            "stats": stats
        }) + "\n")
    
    print(f"Results saved to: {filepath}")
    
    # Generate report-ready text
    report_text = f"""
PERFORMANCE TESTING RESULTS (Chapter 7 Evidence)
Generated: {datetime.now().strftime('%d %B %Y, %H:%M')}

Test Setup:
  - {count} queries sent to chatbot ID {chatbot_id}
  - Widget endpoint: POST /api/widget/{chatbot_id}/chat/
  - Queries drawn from realistic use-case scenarios

Results:
  - Success rate: {stats.get('success_rate', 0)}%
  - Average response time: {stats.get('avg_ms', 'N/A')}ms
  - Median response time: {stats.get('median_ms', 'N/A')}ms  
  - 95th percentile: {stats.get('p95_ms', 'N/A')}ms
  - Minimum: {stats.get('min_ms', 'N/A')}ms
  - Maximum: {stats.get('max_ms', 'N/A')}ms

NFR1 Compliance:
  Target: <3000ms average response time
  Result: {stats.get('avg_ms', 'N/A')}ms average
  Status: {'PASS — meets NFR1 requirement' if stats.get('meets_nfr1_target') else 'FAIL — exceeds NFR1 target'}
"""
    
    report_path = EVIDENCE_DIR / f"benchmark_{timestamp}_report-ready.txt"
    with open(report_path, "w") as f:
        f.write(report_text)
    
    print(f"Report-ready text: {report_path}")
    return output


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="RAGBot Performance Benchmark")
    parser.add_argument("--base-url", default="http://localhost:8000", help="Backend URL")
    parser.add_argument("--chatbot-id", type=int, default=1, help="Chatbot ID to test")
    parser.add_argument("--count", type=int, default=20, help="Number of queries to run")
    parser.add_argument("--token", default=None, help="Auth token if needed")
    
    args = parser.parse_args()
    run_benchmark(args.base_url, args.chatbot_id, args.count, args.token)
