#!/usr/bin/env python3
# RAGBot — 60-question evaluation: RAG vs plain LLM vs TF-IDF
# Usage: python scripts/eval_full.py --chatbot-id 1
# Saves results/eval_final.json and results/charts/*.png

import os
import sys
import json
import time
import argparse
import statistics
from datetime import datetime
from pathlib import Path

# load .env before Django imports
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
from documents.models import DocumentChunk
from services.rag_service import rag_service
from openai import OpenAI

# ── output dirs ──────────────────────────────────────────────────────────────
RESULTS_DIR = Path(__file__).resolve().parent.parent / "results"
CHARTS_DIR  = RESULTS_DIR / "charts"
RESULTS_DIR.mkdir(parents=True, exist_ok=True)
CHARTS_DIR.mkdir(parents=True, exist_ok=True)

# ── 60 categorised questions ─────────────────────────────────────────────────
# 5 categories × 12 questions = 60
# expected_keywords drives the accuracy scorer — a response scores 1.0 if it
# contains at least one keyword and is substantive, 0.5 if it is substantive
# but keyword-free, and 0.0 if it is an empty/error/refusal response.
QUESTIONS = [
    # ── document_retrieval (tests whether the system finds doc-specific info) ──
    {"id": 1,  "category": "document_retrieval", "text": "What are the main services or topics covered in your documents?", "keywords": ["service","topic","document","information","cover"]},
    {"id": 2,  "category": "document_retrieval", "text": "What key policies or rules are described?",                     "keywords": ["policy","rule","guideline","procedure","requirement"]},
    {"id": 3,  "category": "document_retrieval", "text": "Who are the intended users or target audience mentioned?",       "keywords": ["user","audience","customer","client","stakeholder"]},
    {"id": 4,  "category": "document_retrieval", "text": "What are the stated goals or objectives?",                       "keywords": ["goal","objective","aim","purpose","mission"]},
    {"id": 5,  "category": "document_retrieval", "text": "What recommendations or best practices are mentioned?",          "keywords": ["recommend","best practice","suggest","advise","guidance"]},
    {"id": 6,  "category": "document_retrieval", "text": "Are there any specific requirements or eligibility criteria?",   "keywords": ["require","criteria","eligible","condition","must"]},
    {"id": 7,  "category": "document_retrieval", "text": "What are the key findings or conclusions in the documents?",     "keywords": ["finding","conclusion","result","outcome","summary"]},
    {"id": 8,  "category": "document_retrieval", "text": "What challenges or limitations are discussed?",                  "keywords": ["challenge","limitation","issue","problem","constraint"]},
    {"id": 9,  "category": "document_retrieval", "text": "What processes or workflows are described step by step?",        "keywords": ["step","process","workflow","stage","phase"]},
    {"id": 10, "category": "document_retrieval", "text": "Are there any costs, fees, or pricing details mentioned?",       "keywords": ["cost","fee","price","charge","payment"]},
    {"id": 11, "category": "document_retrieval", "text": "What roles or responsibilities are assigned to different parties?","keywords": ["role","responsibility","duty","task","assign"]},
    {"id": 12, "category": "document_retrieval", "text": "What standards or guidelines are referenced?",                   "keywords": ["standard","guideline","compliance","regulation","framework"]},

    # ── procedural (how-to questions — retrieval helps if docs have procedures) ──
    {"id": 13, "category": "procedural", "text": "How do I get started with using this service?",                   "keywords": ["start","begin","first","step","register","create"]},
    {"id": 14, "category": "procedural", "text": "What steps should I follow to complete the main process?",        "keywords": ["step","follow","process","complete","procedure"]},
    {"id": 15, "category": "procedural", "text": "How do I submit or apply for something?",                         "keywords": ["submit","apply","application","form","upload","send"]},
    {"id": 16, "category": "procedural", "text": "What do I need to do if I encounter a problem?",                  "keywords": ["problem","issue","contact","support","report","help"]},
    {"id": 17, "category": "procedural", "text": "How can I update or change my information?",                      "keywords": ["update","change","edit","modify","profile","setting"]},
    {"id": 18, "category": "procedural", "text": "How do I cancel or terminate a service?",                         "keywords": ["cancel","terminate","stop","close","end","discontinue"]},
    {"id": 19, "category": "procedural", "text": "What is the process for getting approval or permission?",          "keywords": ["approval","permission","authorise","grant","request"]},
    {"id": 20, "category": "procedural", "text": "How do I contact support or get help?",                           "keywords": ["contact","support","help","email","phone","reach"]},
    {"id": 21, "category": "procedural", "text": "How long does the process typically take?",                       "keywords": ["time","duration","days","weeks","turnaround","take"]},
    {"id": 22, "category": "procedural", "text": "What documents or information do I need to provide?",             "keywords": ["document","information","provide","require","upload","attach"]},
    {"id": 23, "category": "procedural", "text": "Are there any deadlines I should be aware of?",                   "keywords": ["deadline","date","expire","by","before","within"]},
    {"id": 24, "category": "procedural", "text": "How do I track the status of my request?",                        "keywords": ["track","status","progress","check","monitor","update"]},

    # ── general_knowledge (factual Q — LLM should handle without docs) ──────
    {"id": 25, "category": "general_knowledge", "text": "What is artificial intelligence?",                             "keywords": ["artificial intelligence","AI","machine","learning","algorithm"]},
    {"id": 26, "category": "general_knowledge", "text": "What is a chatbot?",                                           "keywords": ["chatbot","bot","conversation","automated","response"]},
    {"id": 27, "category": "general_knowledge", "text": "What does RAG stand for in AI?",                               "keywords": ["retrieval","augmented","generation","RAG","document"]},
    {"id": 28, "category": "general_knowledge", "text": "What is a large language model?",                              "keywords": ["language model","LLM","GPT","transformer","token"]},
    {"id": 29, "category": "general_knowledge", "text": "What is natural language processing?",                         "keywords": ["natural language","NLP","text","understand","process"]},
    {"id": 30, "category": "general_knowledge", "text": "What is vector search or semantic search?",                    "keywords": ["vector","semantic","embedding","similarity","search"]},
    {"id": 31, "category": "general_knowledge", "text": "What is the difference between supervised and unsupervised learning?", "keywords": ["supervised","unsupervised","label","train","cluster"]},
    {"id": 32, "category": "general_knowledge", "text": "What is TF-IDF?",                                             "keywords": ["TF-IDF","term frequency","inverse document","weight","score"]},
    {"id": 33, "category": "general_knowledge", "text": "What is a neural network?",                                   "keywords": ["neural","network","layer","neuron","deep","weight"]},
    {"id": 34, "category": "general_knowledge", "text": "What is the difference between precision and recall?",        "keywords": ["precision","recall","F1","true positive","false"]},
    {"id": 35, "category": "general_knowledge", "text": "What is an API?",                                             "keywords": ["API","application programming","interface","endpoint","request"]},
    {"id": 36, "category": "general_knowledge", "text": "What is data privacy and why does it matter?",                "keywords": ["privacy","data","personal","protect","GDPR","regulation"]},

    # ── definitions (conceptual — LLM strong, retrieval adds domain depth) ──
    {"id": 37, "category": "definitions", "text": "Define knowledge base as used in information systems.",              "keywords": ["knowledge base","information","store","repository","retrieve"]},
    {"id": 38, "category": "definitions", "text": "What is meant by context in AI language models?",                   "keywords": ["context","window","prompt","history","token","input"]},
    {"id": 39, "category": "definitions", "text": "What is meant by hallucination in AI?",                             "keywords": ["hallucination","fabricate","incorrect","false","confabulate","invent"]},
    {"id": 40, "category": "definitions", "text": "What is meant by embeddings in machine learning?",                  "keywords": ["embedding","vector","representation","semantic","dimension"]},
    {"id": 41, "category": "definitions", "text": "What is chunking in the context of document processing?",           "keywords": ["chunk","split","segment","piece","overlap","token"]},
    {"id": 42, "category": "definitions", "text": "What is cosine similarity?",                                        "keywords": ["cosine","similarity","angle","vector","dot product","distance"]},
    {"id": 43, "category": "definitions", "text": "What is a prompt in the context of language models?",               "keywords": ["prompt","instruction","input","template","system","user"]},
    {"id": 44, "category": "definitions", "text": "What is the difference between accuracy and relevance in search?",  "keywords": ["accuracy","relevance","recall","precision","result","relevant"]},
    {"id": 45, "category": "definitions", "text": "What is zero-shot versus few-shot prompting?",                      "keywords": ["zero-shot","few-shot","example","prompt","in-context","learning"]},
    {"id": 46, "category": "definitions", "text": "What is fine-tuning a language model?",                             "keywords": ["fine-tune","train","adapt","dataset","specific","task"]},
    {"id": 47, "category": "definitions", "text": "What is tokenisation in NLP?",                                      "keywords": ["token","tokenise","word","subword","BPE","split"]},
    {"id": 48, "category": "definitions", "text": "What is a system prompt in a chatbot?",                             "keywords": ["system prompt","instruction","role","persona","guide","behaviour"]},

    # ── analytical (comparison / reasoning — benefits from context) ─────────
    {"id": 49, "category": "analytical", "text": "Compare the advantages and disadvantages of RAG versus fine-tuning.", "keywords": ["RAG","fine-tuning","advantage","disadvantage","compare","trade"]},
    {"id": 50, "category": "analytical", "text": "What are the trade-offs between retrieval speed and accuracy?",       "keywords": ["speed","accuracy","trade-off","latency","precision","recall"]},
    {"id": 51, "category": "analytical", "text": "Why might a chatbot give incorrect answers even with RAG?",           "keywords": ["incorrect","hallucinate","chunk","retrieval","context","wrong"]},
    {"id": 52, "category": "analytical", "text": "How does chunk size affect retrieval quality?",                       "keywords": ["chunk","size","retrieval","quality","overlap","granularity"]},
    {"id": 53, "category": "analytical", "text": "When should you use keyword search versus semantic search?",          "keywords": ["keyword","semantic","search","use","when","TF-IDF","embedding"]},
    {"id": 54, "category": "analytical", "text": "What factors influence the response quality of an AI chatbot?",      "keywords": ["factor","quality","context","model","prompt","temperature"]},
    {"id": 55, "category": "analytical", "text": "How does conversation history improve chatbot responses?",            "keywords": ["history","conversation","context","previous","follow","coherent"]},
    {"id": 56, "category": "analytical", "text": "What are the privacy implications of storing user conversations?",    "keywords": ["privacy","store","conversation","data","user","personal","GDPR"]},
    {"id": 57, "category": "analytical", "text": "How do you evaluate the quality of a RAG system?",                   "keywords": ["evaluate","metric","faithfulness","relevance","accuracy","score"]},
    {"id": 58, "category": "analytical", "text": "What is the role of temperature in language model generation?",       "keywords": ["temperature","diversity","deterministic","creative","output","sample"]},
    {"id": 59, "category": "analytical", "text": "Why is document chunking important for retrieval accuracy?",          "keywords": ["chunk","retrieval","accuracy","split","granularity","context"]},
    {"id": 60, "category": "analytical", "text": "How does the number of retrieved chunks affect answer quality?",      "keywords": ["chunk","number","top-k","quality","noise","context","answer"]},
]

# ── accuracy scoring ─────────────────────────────────────────────────────────
# refusal phrases that indicate the model gave up
_REFUSAL = [
    "i don't have", "i do not have", "i'm unable", "i am unable",
    "no information", "cannot find", "can't find", "not found",
    "no relevant", "don't know", "do not know", "i apologize",
    "i'm sorry, i encountered an error",
]

def score_response(response_text: str, keywords: list[str]) -> float:
    if not response_text or len(response_text.strip()) < 60:
        return 0.0
    lower = response_text.lower()
    if any(r in lower for r in _REFUSAL):
        return 0.0
    if any(k.lower() in lower for k in keywords):
        return 1.0
    # substantive but keyword-free → partial credit
    return 0.5


# ── runners ──────────────────────────────────────────────────────────────────

def run_rag(chatbot, question: dict) -> dict:
    t0 = time.monotonic()
    result = rag_service.generate_response(
        chatbot=chatbot,
        user_message=question["text"],
        conversation_history=None,
        model=chatbot.ai_model,
        provider=chatbot.ai_provider,
    )
    ms = int((time.monotonic() - t0) * 1000)
    text = result.get("response", "")
    return {
        "success": result.get("success", False),
        "response": text,
        "response_time_ms": ms,
        "tokens_used": result.get("tokens_used", 0),
        "chunks_retrieved": len(result.get("chunks_used", [])),
        "accuracy": score_response(text, question["keywords"]),
        "error": result.get("error"),
    }


def run_llm(chatbot, question: dict, openai_client: OpenAI) -> dict:
    # plain LLM: system prompt only, no retrieval
    t0 = time.monotonic()
    try:
        resp = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": chatbot.system_prompt},
                {"role": "user",   "content": question["text"]},
            ],
            temperature=chatbot.temperature,
            max_tokens=chatbot.max_tokens,
        )
        text = resp.choices[0].message.content
        ms   = int((time.monotonic() - t0) * 1000)
        return {
            "success": True,
            "response": text,
            "response_time_ms": ms,
            "tokens_used": resp.usage.total_tokens,
            "chunks_retrieved": 0,
            "accuracy": score_response(text, question["keywords"]),
            "error": None,
        }
    except Exception as exc:
        ms = int((time.monotonic() - t0) * 1000)
        return {
            "success": False,
            "response": "",
            "response_time_ms": ms,
            "tokens_used": 0,
            "chunks_retrieved": 0,
            "accuracy": 0.0,
            "error": str(exc),
        }


def _build_tfidf_retriever(chatbot_id: int):
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    import numpy as np

    chunks = list(
        DocumentChunk.objects.filter(
            document__chatbot_id=chatbot_id,
            document__status="completed",
        ).values("id", "content", "document__file_name")
    )
    if not chunks:
        return None, chunks

    texts = [c["content"] for c in chunks]
    vectorizer = TfidfVectorizer(stop_words="english", max_features=10000)
    tfidf_matrix = vectorizer.fit_transform(texts)

    def retrieve(query: str, top_k: int = 5):
        qv = vectorizer.transform([query])
        sims = cosine_similarity(qv, tfidf_matrix).flatten()
        top_idx = sims.argsort()[-top_k:][::-1]
        return [
            {
                "content": chunks[i]["content"],
                "document_name": chunks[i]["document__file_name"],
                "similarity": float(sims[i]),
            }
            for i in top_idx
            if sims[i] > 0
        ]

    return retrieve, chunks


def run_tfidf(chatbot, question: dict, retrieve_fn, openai_client: OpenAI) -> dict:
    t0 = time.monotonic()
    if retrieve_fn is None:
        context = "No documents available."
        chunks_used = 0
    else:
        chunks = retrieve_fn(question["text"])
        chunks_used = len(chunks)
        if chunks:
            parts = [f"[Source {i+1} - {c['document_name']}]\n{c['content']}" for i, c in enumerate(chunks)]
            context = "\n---\n".join(parts)
        else:
            context = "No relevant documents found."

    system_msg = f"{chatbot.system_prompt}\n\n{context}"
    try:
        resp = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user",   "content": question["text"]},
            ],
            temperature=chatbot.temperature,
            max_tokens=chatbot.max_tokens,
        )
        text = resp.choices[0].message.content
        ms   = int((time.monotonic() - t0) * 1000)
        return {
            "success": True,
            "response": text,
            "response_time_ms": ms,
            "tokens_used": resp.usage.total_tokens,
            "chunks_retrieved": chunks_used,
            "accuracy": score_response(text, question["keywords"]),
            "error": None,
        }
    except Exception as exc:
        ms = int((time.monotonic() - t0) * 1000)
        return {
            "success": False,
            "response": "",
            "response_time_ms": ms,
            "tokens_used": 0,
            "chunks_retrieved": 0,
            "accuracy": 0.0,
            "error": str(exc),
        }


# ── aggregate stats ──────────────────────────────────────────────────────────

def compute_stats(results: list[dict]) -> dict:
    successful = [r for r in results if r["success"]]
    times  = [r["response_time_ms"] for r in successful]
    scores = [r["accuracy"] for r in results]
    if not times:
        return {"error": "no successful queries"}
    return {
        "total": len(results),
        "successful": len(successful),
        "accuracy_mean": round(statistics.mean(scores), 3),
        "avg_ms": round(statistics.mean(times)),
        "median_ms": round(statistics.median(times)),
        "min_ms": min(times),
        "max_ms": max(times),
        "stdev_ms": round(statistics.stdev(times)) if len(times) > 1 else 0,
        "meets_nfr1": round(statistics.mean(times)) < 3000,
    }


def accuracy_by_category(results: list[dict], questions: list[dict]) -> dict:
    cat_scores: dict[str, list[float]] = {}
    for q, r in zip(questions, results):
        cat = q["category"]
        cat_scores.setdefault(cat, []).append(r["accuracy"])
    return {cat: round(statistics.mean(vals), 3) for cat, vals in cat_scores.items()}


# ── charts ────────────────────────────────────────────────────────────────────

def chart_accuracy_by_category(rag_cat, llm_cat, tfidf_cat):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import numpy as np

    cats = sorted(rag_cat.keys())
    x = np.arange(len(cats))
    w = 0.25

    fig, ax = plt.subplots(figsize=(10, 5))
    ax.bar(x - w, [rag_cat[c]   for c in cats], w, label="RAG",      color="#1A1A1A")
    ax.bar(x,     [llm_cat[c]   for c in cats], w, label="Plain LLM", color="#B10000")
    ax.bar(x + w, [tfidf_cat[c] for c in cats], w, label="TF-IDF",   color="#555555")

    ax.set_xticks(x)
    ax.set_xticklabels([c.replace("_", "\n") for c in cats], fontsize=9)
    ax.set_ylabel("Mean Accuracy Score (0–1)")
    ax.set_ylim(0, 1.15)
    ax.set_title("Accuracy by Category — RAG vs Plain LLM vs TF-IDF")
    ax.legend()
    ax.grid(axis="y", alpha=0.3)
    fig.tight_layout()
    out = CHARTS_DIR / "accuracy_by_category.png"
    fig.savefig(out, dpi=150)
    plt.close(fig)
    print(f"  saved: {out}")


def chart_runner_comparison(rag_stats, llm_stats, tfidf_stats):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import numpy as np

    metrics = ["accuracy_mean", "avg_ms"]
    labels  = ["Accuracy (0–1)", "Avg Response Time (ms)"]
    runners = ["RAG", "Plain LLM", "TF-IDF"]
    data = [
        [rag_stats.get("accuracy_mean",0),   rag_stats.get("avg_ms",0)],
        [llm_stats.get("accuracy_mean",0),   llm_stats.get("avg_ms",0)],
        [tfidf_stats.get("accuracy_mean",0), tfidf_stats.get("avg_ms",0)],
    ]

    fig, axes = plt.subplots(1, 2, figsize=(11, 5))
    colors = ["#1A1A1A", "#B10000", "#555555"]

    for ax, metric_idx, label in zip(axes, [0, 1], labels):
        vals = [row[metric_idx] for row in data]
        bars = ax.bar(runners, vals, color=colors)
        ax.set_title(label)
        ax.set_ylabel(label)
        for bar, val in zip(bars, vals):
            ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.01 * max(vals),
                    f"{val:.3f}" if metric_idx == 0 else f"{int(val):,}ms",
                    ha="center", va="bottom", fontsize=9)
        ax.grid(axis="y", alpha=0.3)

    fig.suptitle("Runner Comparison — RAG vs Plain LLM vs TF-IDF", fontsize=13)
    fig.tight_layout()
    out = CHARTS_DIR / "runner_comparison.png"
    fig.savefig(out, dpi=150)
    plt.close(fig)
    print(f"  saved: {out}")


def chart_response_time_distribution(rag_results, llm_results, tfidf_results):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    def times(results):
        return [r["response_time_ms"] for r in results if r["success"]]

    rag_t   = times(rag_results)
    llm_t   = times(llm_results)
    tfidf_t = times(tfidf_results)

    fig, ax = plt.subplots(figsize=(10, 5))
    bins = 15
    ax.hist(rag_t,   bins=bins, alpha=0.7, label="RAG",       color="#1A1A1A")
    ax.hist(llm_t,   bins=bins, alpha=0.7, label="Plain LLM", color="#B10000")
    ax.hist(tfidf_t, bins=bins, alpha=0.7, label="TF-IDF",    color="#888888")
    ax.axvline(3000, color="red", linestyle="--", linewidth=1.5, label="NFR1 target (3000ms)")
    ax.set_xlabel("Response Time (ms)")
    ax.set_ylabel("Frequency")
    ax.set_title("Response Time Distribution — RAG vs Plain LLM vs TF-IDF")
    ax.legend()
    ax.grid(axis="y", alpha=0.3)
    fig.tight_layout()
    out = CHARTS_DIR / "response_time_distribution.png"
    fig.savefig(out, dpi=150)
    plt.close(fig)
    print(f"  saved: {out}")


# ── main ──────────────────────────────────────────────────────────────────────

def run_eval(chatbot_id: int):
    chatbot = Chatbot.objects.get(id=chatbot_id)
    openai_client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

    print(f"\n{'='*62}")
    print(f"  RAGBot Full Evaluation — 60 questions × 3 runners")
    print(f"  Chatbot : {chatbot.name} (id={chatbot_id})")
    print(f"  Started : {datetime.now().strftime('%d %b %Y %H:%M:%S')}")
    print(f"{'='*62}\n")

    print("  Building TF-IDF index from document chunks …")
    retrieve_fn, chunks = _build_tfidf_retriever(chatbot_id)
    print(f"  TF-IDF index: {len(chunks)} chunks\n")

    rag_results   = []
    llm_results   = []
    tfidf_results = []

    for i, q in enumerate(QUESTIONS, 1):
        print(f"  Q{i:02d}/{len(QUESTIONS)} [{q['category']}] {q['text'][:60]}")

        r_rag   = run_rag(chatbot, q)
        r_llm   = run_llm(chatbot, q, openai_client)
        r_tfidf = run_tfidf(chatbot, q, retrieve_fn, openai_client)

        rag_results.append(r_rag)
        llm_results.append(r_llm)
        tfidf_results.append(r_tfidf)

        status = lambda r: "ok" if r["success"] else "FAIL"
        print(f"      RAG   {status(r_rag):4s} {r_rag['response_time_ms']:5d}ms  acc={r_rag['accuracy']:.1f}")
        print(f"      LLM   {status(r_llm):4s} {r_llm['response_time_ms']:5d}ms  acc={r_llm['accuracy']:.1f}")
        print(f"      TFIDF {status(r_tfidf):4s} {r_tfidf['response_time_ms']:5d}ms  acc={r_tfidf['accuracy']:.1f}")

        # brief pause to avoid rate limiting
        if i < len(QUESTIONS):
            time.sleep(1.5)

    # per-runner stats
    rag_stats   = compute_stats(rag_results)
    llm_stats   = compute_stats(llm_results)
    tfidf_stats = compute_stats(tfidf_results)

    # per-category accuracy
    rag_cat   = accuracy_by_category(rag_results,   QUESTIONS)
    llm_cat   = accuracy_by_category(llm_results,   QUESTIONS)
    tfidf_cat = accuracy_by_category(tfidf_results, QUESTIONS)

    # print summary table
    print(f"\n{'='*62}")
    print(f"  SUMMARY")
    print(f"{'='*62}")
    print(f"  {'Metric':<28} {'RAG':>10}  {'LLM':>10}  {'TF-IDF':>10}")
    print(f"  {'-'*28} {'-'*10}  {'-'*10}  {'-'*10}")
    for key, label in [
        ("accuracy_mean", "Mean accuracy"),
        ("avg_ms",        "Avg response (ms)"),
        ("median_ms",     "Median response (ms)"),
        ("meets_nfr1",    "Meets NFR1 (<3000ms)"),
    ]:
        rv = rag_stats.get(key,"?")
        lv = llm_stats.get(key,"?")
        tv = tfidf_stats.get(key,"?")
        fmt = lambda v: ("YES" if v else "NO") if isinstance(v, bool) else str(v)
        print(f"  {label:<28} {fmt(rv):>10}  {fmt(lv):>10}  {fmt(tv):>10}")
    print(f"{'='*62}\n")

    # build final output
    def enrich(results, questions):
        return [
            {**r, "question_id": q["id"], "category": q["category"], "question": q["text"]}
            for r, q in zip(results, questions)
        ]

    output = {
        "eval_date": datetime.now().isoformat(),
        "chatbot_id": chatbot_id,
        "chatbot_name": chatbot.name,
        "total_questions": len(QUESTIONS),
        "runners": {
            "rag": {
                "statistics": rag_stats,
                "accuracy_by_category": rag_cat,
                "individual": enrich(rag_results, QUESTIONS),
            },
            "plain_llm": {
                "statistics": llm_stats,
                "accuracy_by_category": llm_cat,
                "individual": enrich(llm_results, QUESTIONS),
            },
            "tfidf": {
                "statistics": tfidf_stats,
                "accuracy_by_category": tfidf_cat,
                "individual": enrich(tfidf_results, QUESTIONS),
            },
        },
        "scoring_rubric": "1.0 = substantive + keyword hit; 0.5 = substantive, no keyword; 0.0 = error/refusal/empty",
    }

    out_path = RESULTS_DIR / "eval_final.json"
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"  Results → {out_path}")

    print("  Generating charts …")
    chart_accuracy_by_category(rag_cat, llm_cat, tfidf_cat)
    chart_runner_comparison(rag_stats, llm_stats, tfidf_stats)
    chart_response_time_distribution(rag_results, llm_results, tfidf_results)
    print("\n  Done.\n")

    return output


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--chatbot-id", type=int, required=True, help="Chatbot ID to evaluate")
    args = parser.parse_args()
    run_eval(args.chatbot_id)
