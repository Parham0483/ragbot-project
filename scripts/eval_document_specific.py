#!/usr/bin/env python3
# RAGBot — document-specific evaluation: 60 questions × 3 runners (RAG, LLM, TF-IDF)
# Corpus: Acme Robotics policy doc. Categories: specific_fact / boundary / general_knowledge
# Usage: python scripts/eval_document_specific.py --chatbot-id <ID>

import os
import sys
import json
import time
import argparse
import statistics
from datetime import datetime
from pathlib import Path

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

RESULTS_DIR = Path(__file__).resolve().parent.parent / "results"
CHARTS_DIR  = RESULTS_DIR / "charts"
RESULTS_DIR.mkdir(parents=True, exist_ok=True)
CHARTS_DIR.mkdir(parents=True, exist_ok=True)

# ── question bank ─────────────────────────────────────────────────────────────

QUESTIONS = [
    # ── SPECIFIC-FACT: answer is verbatim in the document ────────────────────
    # Scoring: 1.0 if ground_truth keyword found in response, else 0.0
    {
        "id": 1, "category": "specific_fact",
        "text": "Who is the Head of Returns at Acme Robotics and what is their extension number?",
        "ground_truth": "Sandra Okafor, ext 4421",
        "keywords": ["Sandra Okafor", "4421"],
    },
    {
        "id": 2, "category": "specific_fact",
        "text": "What is the price of the ARX-7 model (excluding VAT)?",
        "ground_truth": "£2,847",
        "keywords": ["2,847", "2847"],
    },
    {
        "id": 3, "category": "specific_fact",
        "text": "What is the policy reference number for the Warranty and Returns Procedure?",
        "ground_truth": "REF-2024-009",
        "keywords": ["REF-2024-009"],
    },
    {
        "id": 4, "category": "specific_fact",
        "text": "What is the effective date of Policy REF-2024-009?",
        "ground_truth": "1 March 2024",
        "keywords": ["1 March 2024", "March 2024"],
    },
    {
        "id": 5, "category": "specific_fact",
        "text": "What is Acme Robotics' VAT registration number?",
        "ground_truth": "GB 341 8821 09",
        "keywords": ["341 8821", "GB 341"],
    },
    {
        "id": 6, "category": "specific_fact",
        "text": "How long is the standard warranty on Acme Robotics products?",
        "ground_truth": "24 months",
        "keywords": ["24 months", "24-month"],
    },
    {
        "id": 7, "category": "specific_fact",
        "text": "How many calendar days do customers have to return non-faulty goods?",
        "ground_truth": "14 calendar days",
        "keywords": ["14 calendar", "14 days"],
    },
    {
        "id": 8, "category": "specific_fact",
        "text": "What is the email address for the Acme Robotics IT helpdesk?",
        "ground_truth": "ithelpdesk@acme-robotics.co.uk",
        "keywords": ["ithelpdesk@acme-robotics.co.uk"],
    },
    {
        "id": 9, "category": "specific_fact",
        "text": "Who is the Health and Safety Officer at Acme Robotics and what is their extension?",
        "ground_truth": "Priya Subramaniam, ext 5517",
        "keywords": ["Priya Subramaniam", "5517"],
    },
    {
        "id": 10, "category": "specific_fact",
        "text": "What is the price of the ARX-12 heavy-duty robot (excluding VAT)?",
        "ground_truth": "£4,195",
        "keywords": ["4,195", "4195"],
    },
    {
        "id": 11, "category": "specific_fact",
        "text": "What is Acme Robotics' company registration number?",
        "ground_truth": "07452318",
        "keywords": ["07452318"],
    },
    {
        "id": 12, "category": "specific_fact",
        "text": "How many days of paid annual leave are full-time employees entitled to?",
        "ground_truth": "28 days",
        "keywords": ["28 days", "28 day"],
    },
    {
        "id": 13, "category": "specific_fact",
        "text": "By when must staff submit expense claims each month?",
        "ground_truth": "last working day of each month",
        "keywords": ["last working day"],
    },
    {
        "id": 14, "category": "specific_fact",
        "text": "What is the maximum expense amount that does not require a receipt?",
        "ground_truth": "£25",
        "keywords": ["£25", "25 or more", "below £25", "under £25"],
    },
    {
        "id": 15, "category": "specific_fact",
        "text": "What is the registered office address of Acme Robotics Ltd?",
        "ground_truth": "Unit 7, Granville Industrial Estate, Coventry, CV6 4AE",
        "keywords": ["CV6 4AE", "Granville"],
    },
    {
        "id": 16, "category": "specific_fact",
        "text": "Who is the Head of Sales at Acme Robotics and what is their extension number?",
        "ground_truth": "Derek Pfeiffer, ext 3302",
        "keywords": ["Derek Pfeiffer", "3302"],
    },
    {
        "id": 17, "category": "specific_fact",
        "text": "For how many years must customer and transaction records be retained?",
        "ground_truth": "7 years",
        "keywords": ["7 years", "seven years"],
    },
    {
        "id": 18, "category": "specific_fact",
        "text": "What is the minimum required length for staff passwords according to the IT policy?",
        "ground_truth": "12 characters",
        "keywords": ["12 characters", "12-character", "minimum of 12"],
    },
    {
        "id": 19, "category": "specific_fact",
        "text": "How frequently must staff change their passwords under the IT security policy?",
        "ground_truth": "every 90 days",
        "keywords": ["90 days"],
    },
    {
        "id": 20, "category": "specific_fact",
        "text": "What is the price of the ARX-3 Lite entry-level robot (excluding VAT)?",
        "ground_truth": "£1,299",
        "keywords": ["1,299", "1299"],
    },

    # ── BOUNDARY: answer is NOT in the document — correct response = refusal ─
    # Scoring: 1.0 if response contains a refusal phrase, else 0.0
    {
        "id": 21, "category": "boundary",
        "text": "What is Marcus Trevellyan's (CEO) favourite colour?",
        "ground_truth": "not in document",
        "keywords": [],
    },
    {
        "id": 22, "category": "boundary",
        "text": "How many employees does Acme Robotics currently employ?",
        "ground_truth": "not in document",
        "keywords": [],
    },
    {
        "id": 23, "category": "boundary",
        "text": "Which pension scheme provider does Acme Robotics use?",
        "ground_truth": "not in document",
        "keywords": [],
    },
    {
        "id": 24, "category": "boundary",
        "text": "What is the car parking policy at the Coventry office?",
        "ground_truth": "not in document",
        "keywords": [],
    },
    {
        "id": 25, "category": "boundary",
        "text": "What is the budget for the annual Christmas party?",
        "ground_truth": "not in document",
        "keywords": [],
    },
    {
        "id": 26, "category": "boundary",
        "text": "What does the staff canteen serve on Thursdays?",
        "ground_truth": "not in document",
        "keywords": [],
    },
    {
        "id": 27, "category": "boundary",
        "text": "What is the training and development budget per employee per year?",
        "ground_truth": "not in document",
        "keywords": [],
    },
    {
        "id": 28, "category": "boundary",
        "text": "When does Acme Robotics conduct annual salary reviews?",
        "ground_truth": "not in document",
        "keywords": [],
    },
    {
        "id": 29, "category": "boundary",
        "text": "Who are the current members of the Acme Robotics board of directors?",
        "ground_truth": "not in document",
        "keywords": [],
    },
    {
        "id": 30, "category": "boundary",
        "text": "What is Acme Robotics' current share price on the stock market?",
        "ground_truth": "not in document",
        "keywords": [],
    },
    {
        "id": 31, "category": "boundary",
        "text": "Does Acme Robotics have a formal dress code policy for office staff?",
        "ground_truth": "not in document",
        "keywords": [],
    },
    {
        "id": 32, "category": "boundary",
        "text": "Does Acme Robotics offer subsidised gym membership to employees?",
        "ground_truth": "not in document",
        "keywords": [],
    },
    {
        "id": 33, "category": "boundary",
        "text": "Which medical insurance provider does Acme Robotics use for its staff health plan?",
        "ground_truth": "not in document",
        "keywords": [],
    },
    {
        "id": 34, "category": "boundary",
        "text": "What staff discount do Acme Robotics employees receive on company products?",
        "ground_truth": "not in document",
        "keywords": [],
    },
    {
        "id": 35, "category": "boundary",
        "text": "What is Acme Robotics' annual revenue for the most recent financial year?",
        "ground_truth": "not in document",
        "keywords": [],
    },
    {
        "id": 36, "category": "boundary",
        "text": "How many patents does Acme Robotics currently hold?",
        "ground_truth": "not in document",
        "keywords": [],
    },
    {
        "id": 37, "category": "boundary",
        "text": "What is the company's corporate social responsibility (CSR) policy?",
        "ground_truth": "not in document",
        "keywords": [],
    },
    {
        "id": 38, "category": "boundary",
        "text": "Which recruitment agencies does Acme Robotics use to hire new staff?",
        "ground_truth": "not in document",
        "keywords": [],
    },
    {
        "id": 39, "category": "boundary",
        "text": "What is Acme Robotics' policy on personal use of social media during work hours?",
        "ground_truth": "not in document",
        "keywords": [],
    },
    {
        "id": 40, "category": "boundary",
        "text": "What are the opening hours of the reception desk at the Coventry office?",
        "ground_truth": "not in document",
        "keywords": [],
    },

    # ── GENERAL KNOWLEDGE: common knowledge — both runners should pass ────────
    # Confirms neither pipeline is fundamentally broken
    {
        "id": 41, "category": "general_knowledge",
        "text": "What is the capital city of France?",
        "ground_truth": "Paris",
        "keywords": ["Paris"],
    },
    {
        "id": 42, "category": "general_knowledge",
        "text": "What does HTTP stand for?",
        "ground_truth": "HyperText Transfer Protocol",
        "keywords": ["HyperText Transfer Protocol", "Hypertext Transfer"],
    },
    {
        "id": 43, "category": "general_knowledge",
        "text": "At what temperature does water boil at standard sea-level pressure?",
        "ground_truth": "100 degrees Celsius",
        "keywords": ["100", "100°C", "100 degree", "hundred"],
    },
    {
        "id": 44, "category": "general_knowledge",
        "text": "Who wrote the play Romeo and Juliet?",
        "ground_truth": "William Shakespeare",
        "keywords": ["Shakespeare"],
    },
    {
        "id": 45, "category": "general_knowledge",
        "text": "What does CPU stand for in computing?",
        "ground_truth": "Central Processing Unit",
        "keywords": ["Central Processing Unit"],
    },
    {
        "id": 46, "category": "general_knowledge",
        "text": "What is the chemical symbol for gold?",
        "ground_truth": "Au",
        "keywords": ["Au"],
    },
    {
        "id": 47, "category": "general_knowledge",
        "text": "What does SQL stand for?",
        "ground_truth": "Structured Query Language",
        "keywords": ["Structured Query Language"],
    },
    {
        "id": 48, "category": "general_knowledge",
        "text": "Who is credited with inventing the telephone?",
        "ground_truth": "Alexander Graham Bell",
        "keywords": ["Bell", "Graham Bell"],
    },
    {
        "id": 49, "category": "general_knowledge",
        "text": "What is the largest planet in our solar system?",
        "ground_truth": "Jupiter",
        "keywords": ["Jupiter"],
    },
    {
        "id": 50, "category": "general_knowledge",
        "text": "What does HTML stand for?",
        "ground_truth": "HyperText Markup Language",
        "keywords": ["HyperText Markup Language", "Hypertext Markup"],
    },
    {
        "id": 51, "category": "general_knowledge",
        "text": "What is the atomic number of carbon?",
        "ground_truth": "6",
        "keywords": ["6"],
    },
    {
        "id": 52, "category": "general_knowledge",
        "text": "What does REST stand for in web APIs?",
        "ground_truth": "Representational State Transfer",
        "keywords": ["Representational State Transfer"],
    },
    {
        "id": 53, "category": "general_knowledge",
        "text": "What is the binary representation of the decimal number 10?",
        "ground_truth": "1010",
        "keywords": ["1010"],
    },
    {
        "id": 54, "category": "general_knowledge",
        "text": "What year was the World Wide Web invented?",
        "ground_truth": "1989",
        "keywords": ["1989", "1990"],
    },
    {
        "id": 55, "category": "general_knowledge",
        "text": "What programming language is named after a type of snake?",
        "ground_truth": "Python",
        "keywords": ["Python"],
    },
    {
        "id": 56, "category": "general_knowledge",
        "text": "What does DNS stand for in networking?",
        "ground_truth": "Domain Name System",
        "keywords": ["Domain Name System"],
    },
    {
        "id": 57, "category": "general_knowledge",
        "text": "What is the Pythagorean theorem?",
        "ground_truth": "a squared plus b squared equals c squared",
        "keywords": ["a²", "a^2", "a² + b²", "a^2 + b^2", "squared"],
    },
    {
        "id": 58, "category": "general_knowledge",
        "text": "What is photosynthesis?",
        "ground_truth": "process by which plants convert sunlight to energy",
        "keywords": ["sunlight", "light", "chlorophyll", "carbon dioxide", "glucose", "energy"],
    },
    {
        "id": 59, "category": "general_knowledge",
        "text": "What does RAM stand for in computing?",
        "ground_truth": "Random Access Memory",
        "keywords": ["Random Access Memory"],
    },
    {
        "id": 60, "category": "general_knowledge",
        "text": "In what year did the first iPhone launch?",
        "ground_truth": "2007",
        "keywords": ["2007"],
    },
]

# ── refusal detection ─────────────────────────────────────────────────────────
_REFUSAL_PHRASES = [
    "cannot find", "can't find", "not found", "not mentioned", "not provided",
    "not available", "not specified", "not stated", "not included", "not discussed",
    "not contained", "not covered", "no information", "no details",
    "don't have information", "do not have information", "i'm unable to find",
    "unable to find", "doesn't mention", "does not mention", "not in my documents",
    "not in the documents", "cannot provide", "no record", "not part of",
    "outside the scope", "not addressed", "not listed", "not described",
    "not outlined", "i cannot find", "acme robotics documents",
]


def score(response: str, category: str, keywords: list) -> float:
    if not response or len(response.strip()) < 40:
        return 0.0
    lower = response.lower()

    if category == "specific_fact":
        return 1.0 if any(k.lower() in lower for k in keywords) else 0.0

    if category == "boundary":
        return 1.0 if any(p in lower for p in _REFUSAL_PHRASES) else 0.0

    # general_knowledge
    if any(k.lower() in lower for k in keywords):
        return 1.0
    return 0.5   # substantive but keyword-free (partial credit)


# ── runners ───────────────────────────────────────────────────────────────────

def run_rag(chatbot, q: dict) -> dict:
    t0 = time.monotonic()
    res = rag_service.generate_response(
        chatbot=chatbot,
        user_message=q["text"],
        conversation_history=None,
        model=chatbot.ai_model,
        provider=chatbot.ai_provider,
    )
    ms   = int((time.monotonic() - t0) * 1000)
    text = res.get("response", "")
    return {
        "success": res.get("success", False),
        "response": text,
        "response_time_ms": ms,
        "tokens_used": res.get("tokens_used", 0),
        "chunks_retrieved": len(res.get("chunks_used", [])),
        "accuracy": score(text, q["category"], q["keywords"]),
        "error": res.get("error"),
    }


def run_llm(chatbot, q: dict, client: OpenAI) -> dict:
    # plain LLM — no retrieval; identical system prompt, no context injected
    t0 = time.monotonic()
    try:
        resp = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": chatbot.system_prompt},
                {"role": "user",   "content": q["text"]},
            ],
            temperature=0.0,
            max_tokens=chatbot.max_tokens,
        )
        text = resp.choices[0].message.content
        ms   = int((time.monotonic() - t0) * 1000)
        return {
            "success": True, "response": text,
            "response_time_ms": ms, "tokens_used": resp.usage.total_tokens,
            "chunks_retrieved": 0,
            "accuracy": score(text, q["category"], q["keywords"]),
            "error": None,
        }
    except Exception as exc:
        ms = int((time.monotonic() - t0) * 1000)
        return {"success": False, "response": "", "response_time_ms": ms,
                "tokens_used": 0, "chunks_retrieved": 0, "accuracy": 0.0, "error": str(exc)}


def _build_tfidf(chatbot_id: int):
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity

    chunks = list(
        DocumentChunk.objects.filter(
            document__chatbot_id=chatbot_id,
            document__status="completed",
        ).values("content", "document__file_name")
    )
    if not chunks:
        return None

    texts = [c["content"] for c in chunks]
    vec   = TfidfVectorizer(stop_words="english", max_features=10000)
    mat   = vec.fit_transform(texts)

    def retrieve(query: str, top_k: int = 5):
        qv   = vec.transform([query])
        sims = cosine_similarity(qv, mat).flatten()
        idx  = sims.argsort()[-top_k:][::-1]
        return [
            {"content": chunks[i]["content"],
             "document_name": chunks[i]["document__file_name"],
             "similarity": float(sims[i])}
            for i in idx if sims[i] > 0
        ]
    return retrieve


def run_tfidf(chatbot, q: dict, retrieve_fn, client: OpenAI) -> dict:
    t0 = time.monotonic()
    if retrieve_fn is None:
        context = "No documents available."
        n_chunks = 0
    else:
        hits = retrieve_fn(q["text"])
        n_chunks = len(hits)
        if hits:
            parts   = [f"[Source {i+1} - {h['document_name']}]\n{h['content']}" for i, h in enumerate(hits)]
            context = "\n---\n".join(parts)
        else:
            context = "No relevant documents found."

    system_msg = f"{chatbot.system_prompt}\n\n{context}"
    try:
        resp = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user",   "content": q["text"]},
            ],
            temperature=0.0,
            max_tokens=chatbot.max_tokens,
        )
        text = resp.choices[0].message.content
        ms   = int((time.monotonic() - t0) * 1000)
        return {
            "success": True, "response": text,
            "response_time_ms": ms, "tokens_used": resp.usage.total_tokens,
            "chunks_retrieved": n_chunks,
            "accuracy": score(text, q["category"], q["keywords"]),
            "error": None,
        }
    except Exception as exc:
        ms = int((time.monotonic() - t0) * 1000)
        return {"success": False, "response": "", "response_time_ms": ms,
                "tokens_used": 0, "chunks_retrieved": 0, "accuracy": 0.0, "error": str(exc)}


# ── stats helpers ─────────────────────────────────────────────────────────────

def compute_stats(results: list) -> dict:
    ok    = [r for r in results if r["success"]]
    times = [r["response_time_ms"] for r in ok]
    accs  = [r["accuracy"] for r in results]
    if not times:
        return {"error": "no successful queries"}
    return {
        "total": len(results), "successful": len(ok),
        "accuracy_mean": round(statistics.mean(accs), 3),
        "avg_ms": round(statistics.mean(times)),
        "median_ms": round(statistics.median(times)),
        "min_ms": min(times), "max_ms": max(times),
        "stdev_ms": round(statistics.stdev(times)) if len(times) > 1 else 0,
        "meets_nfr1": round(statistics.mean(times)) < 3000,
    }


def acc_by_cat(results: list, questions: list) -> dict:
    cats: dict = {}
    for r, q in zip(results, questions):
        cats.setdefault(q["category"], []).append(r["accuracy"])
    return {c: round(statistics.mean(v), 3) for c, v in cats.items()}


# ── charts ────────────────────────────────────────────────────────────────────

def chart_accuracy_by_category(rag_cat, llm_cat, tfidf_cat):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import numpy as np

    cats   = ["specific_fact", "boundary", "general_knowledge"]
    labels = ["Specific Fact\n(in-document)", "Boundary\n(not-in-document)", "General\nKnowledge"]
    x = np.arange(len(cats))
    w = 0.25

    fig, ax = plt.subplots(figsize=(10, 6))
    b1 = ax.bar(x - w, [rag_cat.get(c, 0)   for c in cats], w, label="RAG (pgvector)",  color="#1A1A1A")
    b2 = ax.bar(x,     [llm_cat.get(c, 0)   for c in cats], w, label="Plain LLM",        color="#B10000")
    b3 = ax.bar(x + w, [tfidf_cat.get(c, 0) for c in cats], w, label="TF-IDF",           color="#888888")

    for bars in (b1, b2, b3):
        for bar in bars:
            h = bar.get_height()
            ax.text(bar.get_x() + bar.get_width() / 2, h + 0.015,
                    f"{h:.2f}", ha="center", va="bottom", fontsize=8)

    ax.set_xticks(x)
    ax.set_xticklabels(labels, fontsize=10)
    ax.set_ylabel("Mean Accuracy Score (0 = wrong, 1 = correct)")
    ax.set_ylim(0, 1.25)
    ax.set_title("Accuracy by Question Category — RAG vs Plain LLM vs TF-IDF\n"
                 "(Acme Robotics policy document — controlled corpus evaluation)", fontsize=11)
    ax.legend()
    ax.grid(axis="y", alpha=0.3)

    # annotation
    ax.text(0.5, 1.19,
            "RAG should dominate 'Specific Fact'; all runners should refuse on 'Boundary'",
            ha="center", va="center", transform=ax.transAxes,
            fontsize=8, color="#555", style="italic")

    fig.tight_layout()
    out = CHARTS_DIR / "doc_accuracy_by_category.png"
    fig.savefig(out, dpi=150)
    plt.close(fig)
    print(f"  saved: {out}")


def chart_overall_comparison(rag_stats, llm_stats, tfidf_stats):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    runners = ["RAG\n(pgvector)", "Plain LLM\n(no retrieval)", "TF-IDF"]
    accs    = [rag_stats.get("accuracy_mean",0), llm_stats.get("accuracy_mean",0), tfidf_stats.get("accuracy_mean",0)]
    times   = [rag_stats.get("avg_ms",0),        llm_stats.get("avg_ms",0),        tfidf_stats.get("avg_ms",0)]
    colors  = ["#1A1A1A", "#B10000", "#888888"]

    fig, axes = plt.subplots(1, 2, figsize=(11, 5))

    # accuracy
    ax = axes[0]
    bars = ax.bar(runners, accs, color=colors)
    for bar, val in zip(bars, accs):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.01,
                f"{val:.3f}", ha="center", va="bottom", fontsize=10, fontweight="bold")
    ax.set_ylim(0, 1.2)
    ax.set_ylabel("Mean Accuracy (all 60 questions)")
    ax.set_title("Overall Accuracy")
    ax.grid(axis="y", alpha=0.3)

    # response time
    ax = axes[1]
    bars = ax.bar(runners, times, color=colors)
    ax.axhline(3000, color="red", linestyle="--", linewidth=1.2, label="NFR1 target (3000ms)")
    for bar, val in zip(bars, times):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 30,
                f"{int(val):,}ms", ha="center", va="bottom", fontsize=10, fontweight="bold")
    ax.set_ylabel("Average Response Time (ms)")
    ax.set_title("Average Response Time")
    ax.legend()
    ax.grid(axis="y", alpha=0.3)

    fig.suptitle("Overall Runner Comparison — Document-Specific Evaluation", fontsize=13)
    fig.tight_layout()
    out = CHARTS_DIR / "doc_overall_comparison.png"
    fig.savefig(out, dpi=150)
    plt.close(fig)
    print(f"  saved: {out}")


def chart_response_time_boxplot(rag_res, llm_res, tfidf_res):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    def times(res):
        return [r["response_time_ms"] for r in res if r["success"]]

    data   = [times(rag_res), times(llm_res), times(tfidf_res)]
    labels = ["RAG\n(pgvector)", "Plain LLM\n(no retrieval)", "TF-IDF"]
    colors = ["#1A1A1A", "#B10000", "#888888"]

    fig, ax = plt.subplots(figsize=(9, 6))
    bp = ax.boxplot(data, labels=labels, patch_artist=True, notch=False,
                    medianprops={"color": "white", "linewidth": 2})
    for patch, color in zip(bp["boxes"], colors):
        patch.set_facecolor(color)
        patch.set_alpha(0.8)

    ax.axhline(3000, color="red", linestyle="--", linewidth=1.5, label="NFR1 target (3000ms)")
    ax.set_ylabel("Response Time (ms)")
    ax.set_title("Response Time Distribution — Document-Specific Evaluation\n"
                 "(boxplot: median, IQR, whiskers = 1.5×IQR)", fontsize=11)
    ax.legend()
    ax.grid(axis="y", alpha=0.3)
    fig.tight_layout()
    out = CHARTS_DIR / "doc_response_time_boxplot.png"
    fig.savefig(out, dpi=150)
    plt.close(fig)
    print(f"  saved: {out}")


# ── main ──────────────────────────────────────────────────────────────────────

def run_eval(chatbot_id: int):
    chatbot = Chatbot.objects.get(id=chatbot_id)
    client  = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

    print(f"\n{'='*64}")
    print(f"  Document-Specific Evaluation — 60 questions × 3 runners")
    print(f"  Chatbot : {chatbot.name} (id={chatbot_id})")
    print(f"  Started : {datetime.now().strftime('%d %b %Y %H:%M:%S')}")
    print(f"{'='*64}\n")

    print("  Building TF-IDF index …")
    retrieve_fn = _build_tfidf(chatbot_id)
    chunk_count = DocumentChunk.objects.filter(
        document__chatbot_id=chatbot_id, document__status="completed"
    ).count()
    print(f"  Chunks indexed: {chunk_count}\n")

    rag_r, llm_r, tfidf_r = [], [], []

    for i, q in enumerate(QUESTIONS, 1):
        cat_label = {"specific_fact": "FACT", "boundary": "BNDY", "general_knowledge": "GEN "}[q["category"]]
        print(f"  Q{i:02d}/60 [{cat_label}] {q['text'][:62]}")

        r_rag   = run_rag(chatbot, q)
        r_llm   = run_llm(chatbot, q, client)
        r_tfidf = run_tfidf(chatbot, q, retrieve_fn, client)

        rag_r.append(r_rag)
        llm_r.append(r_llm)
        tfidf_r.append(r_tfidf)

        s = lambda r: "ok  " if r["success"] else "FAIL"
        print(f"      RAG   {s(r_rag)}{r_rag['response_time_ms']:6d}ms  acc={r_rag['accuracy']:.1f}  chunks={r_rag['chunks_retrieved']}")
        print(f"      LLM   {s(r_llm)}{r_llm['response_time_ms']:6d}ms  acc={r_llm['accuracy']:.1f}")
        print(f"      TFIDF {s(r_tfidf)}{r_tfidf['response_time_ms']:6d}ms  acc={r_tfidf['accuracy']:.1f}  chunks={r_tfidf['chunks_retrieved']}")

        if i < len(QUESTIONS):
            time.sleep(1.5)

    rag_stats   = compute_stats(rag_r)
    llm_stats   = compute_stats(llm_r)
    tfidf_stats = compute_stats(tfidf_r)
    rag_cat     = acc_by_cat(rag_r,   QUESTIONS)
    llm_cat     = acc_by_cat(llm_r,   QUESTIONS)
    tfidf_cat   = acc_by_cat(tfidf_r, QUESTIONS)

    # per-category accuracy table
    cats = ["specific_fact", "boundary", "general_knowledge"]
    print(f"\n{'='*64}")
    print(f"  ACCURACY BY CATEGORY")
    print(f"{'='*64}")
    print(f"  {'Category':<22} {'RAG':>8}  {'LLM':>8}  {'TF-IDF':>8}")
    print(f"  {'-'*22} {'-'*8}  {'-'*8}  {'-'*8}")
    for c in cats:
        print(f"  {c:<22} {rag_cat.get(c,0):>8.3f}  {llm_cat.get(c,0):>8.3f}  {tfidf_cat.get(c,0):>8.3f}")
    print(f"  {'OVERALL':<22} {rag_stats['accuracy_mean']:>8.3f}  {llm_stats['accuracy_mean']:>8.3f}  {tfidf_stats['accuracy_mean']:>8.3f}")
    print()
    print(f"  {'Avg response (ms)':<22} {rag_stats['avg_ms']:>8}  {llm_stats['avg_ms']:>8}  {tfidf_stats['avg_ms']:>8}")
    print(f"  {'Meets NFR1':<22} {'YES' if rag_stats['meets_nfr1'] else 'NO':>8}  {'YES' if llm_stats['meets_nfr1'] else 'NO':>8}  {'YES' if tfidf_stats['meets_nfr1'] else 'NO':>8}")
    print(f"{'='*64}\n")

    def enrich(results):
        return [
            {**r, "question_id": q["id"], "category": q["category"],
             "question": q["text"], "ground_truth": q["ground_truth"]}
            for r, q in zip(results, QUESTIONS)
        ]

    output = {
        "eval_date": datetime.now().isoformat(),
        "chatbot_id": chatbot_id,
        "chatbot_name": chatbot.name,
        "corpus": "acme_robotics_policy.txt",
        "total_questions": len(QUESTIONS),
        "category_split": {"specific_fact": 20, "boundary": 20, "general_knowledge": 20},
        "scoring_notes": {
            "specific_fact": "1.0 if ground_truth keyword in response, else 0.0",
            "boundary": "1.0 if refusal phrase detected, else 0.0 (hallucination)",
            "general_knowledge": "1.0 keyword match; 0.5 substantive; 0.0 empty/error",
        },
        "runners": {
            "rag": {"statistics": rag_stats, "accuracy_by_category": rag_cat, "individual": enrich(rag_r)},
            "plain_llm": {"statistics": llm_stats, "accuracy_by_category": llm_cat, "individual": enrich(llm_r)},
            "tfidf": {"statistics": tfidf_stats, "accuracy_by_category": tfidf_cat, "individual": enrich(tfidf_r)},
        },
    }

    out_path = RESULTS_DIR / "eval_document_specific.json"
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"  Results → {out_path}")

    print("  Generating charts …")
    chart_accuracy_by_category(rag_cat, llm_cat, tfidf_cat)
    chart_overall_comparison(rag_stats, llm_stats, tfidf_stats)
    chart_response_time_boxplot(rag_r, llm_r, tfidf_r)
    print("\n  Done.\n")

    return output


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--chatbot-id", type=int, required=True)
    args = parser.parse_args()
    run_eval(args.chatbot_id)
