#!/usr/bin/env python3
# Creates the Acme Robotics eval chatbot, uploads the policy doc, and processes it into chunks.
# Prints chatbot_id for use with eval_document_specific.py
# Usage: python scripts/setup_eval_chatbot.py

import os
import sys
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

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from chatbots.models import Chatbot
from documents.models import Document
from services.rag_service import rag_service

User = get_user_model()

DOC_PATH = Path(__file__).resolve().parent / "test_docs" / "acme_robotics_policy.txt"

# reuse existing owner (first superuser or any staff user)
owner = User.objects.filter(is_staff=True).first() or User.objects.first()
if owner is None:
    print("ERROR: no users in the database. Create a user first.")
    sys.exit(1)

print(f"Using owner: {owner.email}")

# delete any stale eval chatbot from a previous run
Chatbot.objects.filter(name="Acme Robotics Eval Bot").delete()
print("Removed any existing 'Acme Robotics Eval Bot'.")

# create a fresh chatbot with a strict system prompt
chatbot = Chatbot.objects.create(
    owner=owner,
    name="Acme Robotics Eval Bot",
    description="Evaluation chatbot — Acme Robotics policy document only",
    # system prompt tells the model to refuse when info is absent
    system_prompt=(
        "You are an internal assistant for Acme Robotics Ltd. "
        "Answer questions using ONLY the information in the uploaded company documents. "
        "If the answer is not found in the documents, respond with exactly: "
        "'I cannot find that information in the Acme Robotics documents.' "
        "Do not use any external knowledge or make up details."
    ),
    temperature=0.0,   # deterministic for evaluation
    max_tokens=400,
    ai_model="gpt-3.5-turbo",
    ai_provider="openai",
    is_active=True,
)
print(f"Created chatbot id={chatbot.id}")

# upload the document via Django's storage layer
doc_bytes = DOC_PATH.read_bytes()
cf = ContentFile(doc_bytes, name="acme_robotics_policy.txt")

doc = Document(chatbot=chatbot)
doc.file.save("acme_robotics_policy.txt", cf, save=False)
doc.file_name  = "acme_robotics_policy.txt"
doc.file_type  = "txt"
doc.file_size  = len(doc_bytes)
doc.status     = "pending"
doc.save()
print(f"Document record id={doc.id} saved, processing …")

result = rag_service.process_document(doc.id)

if result["success"]:
    print(f"Processing complete: {result['chunks_created']} chunks created.")
    print(f"\nCHATBOT_ID={chatbot.id}")
else:
    print(f"ERROR: {result['error']}")
    sys.exit(1)
