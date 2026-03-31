import os
import csv
import argparse
from pathlib import Path
from datetime import datetime, timedelta, timezone

# --- Configure Django ---
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ragbot_backend.settings")

import django
django.setup()

from chatbots.models import Message, Conversation
from chatbots.models import Chatbot  # if Chatbot is in chatbots app


def parse_args():
    p = argparse.ArgumentParser(
        description="Export real usage metrics from DB (saved in background during UI testing)."
    )

    # filters
    p.add_argument("--chatbot-id", type=int, default=None, help="Export only for a specific chatbot id")
    p.add_argument("--chatbot-name", type=str, default=None, help="Export only for chatbots matching this name")
    p.add_argument("--hours", type=int, default=None, help="Export only last N hours (e.g., 24)")
    p.add_argument("--only-assistant", action="store_true", help="Export only assistant messages (AI responses)")

    # output
    p.add_argument("--out", type=str, default="ipd_real_usage_metrics.csv", help="CSV output filename")

    # cost estimate
    p.add_argument("--cost-per-1k", type=float, default=None,
                   help="Optional estimated cost per 1k tokens (e.g., 0.001). Adds estimated_cost column.")

    return p.parse_args()


def safe_top_source(context_used):
    # context_used is a JSON list of dicts — each has document name, similarity score, and a content preview
    if not isinstance(context_used, list) or len(context_used) == 0:
        return None, None, 0

    top = context_used[0] or {}
    top_doc = top.get("document")
    top_sim = top.get("similarity")
    return top_doc, top_sim, len(context_used)


def main():
    args = parse_args()
    out_path = Path(args.out).resolve()

    qs = Message.objects.select_related("conversation", "conversation__chatbot").order_by("created_at")

    # Filter: chatbot id
    if args.chatbot_id is not None:
        qs = qs.filter(conversation__chatbot_id=args.chatbot_id)

    # Filter: chatbot name
    if args.chatbot_name:
        qs = qs.filter(conversation__chatbot__name__icontains=args.chatbot_name)

    # Filter: last N hours
    if args.hours is not None:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=args.hours)
        qs = qs.filter(created_at__gte=cutoff)

    # Filter: only assistant messages (AI responses)
    if args.only_assistant:
        qs = qs.filter(role="assistant")

    rows = []
    total_tokens = 0
    total_assistant_msgs = 0

    for m in qs:
        chatbot = m.conversation.chatbot
        ctx = m.context_used or []
        top_doc, top_sim, num_sources = safe_top_source(ctx)

        tokens = m.tokens_used or 0
        if m.role == "assistant":
            total_assistant_msgs += 1
            total_tokens += tokens

        est_cost = None
        if args.cost_per_1k is not None:
            est_cost = round((tokens / 1000.0) * args.cost_per_1k, 6)

        rows.append({
            "created_at": m.created_at.isoformat() if m.created_at else "",
            "chatbot_id": chatbot.id,
            "chatbot_name": chatbot.name,
            "conversation_id": m.conversation.id,
            "message_id": m.id,
            "role": m.role,
            "content": (m.content or "").replace("\n", " ").strip(),
            "tokens_used": tokens,
            "num_sources": num_sources,
            "top_doc": top_doc,
            "top_similarity": top_sim,
            "estimated_cost": est_cost,
        })

    # Write CSV
    fieldnames = [
        "created_at",
        "chatbot_id",
        "chatbot_name",
        "conversation_id",
        "message_id",
        "role",
        "content",
        "tokens_used",
        "num_sources",
        "top_doc",
        "top_similarity",
        "estimated_cost",
    ]

    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    # Print summary
    print(f"[OK] Exported {len(rows)} messages to: {out_path}")
    if total_assistant_msgs > 0:
        avg_tokens = total_tokens / total_assistant_msgs
        print(f"[SUMMARY] Assistant messages: {total_assistant_msgs}")
        print(f"[SUMMARY] Total tokens used (assistant msgs): {total_tokens}")
        print(f"[SUMMARY] Avg tokens / assistant msg: {avg_tokens:.2f}")

        if args.cost_per_1k is not None:
            total_cost = (total_tokens / 1000.0) * args.cost_per_1k
            print(f"[SUMMARY] Estimated total cost: {total_cost:.6f}")
    else:
        print("[SUMMARY] No assistant messages found for the selected filters.")


if __name__ == "__main__":
    main()
