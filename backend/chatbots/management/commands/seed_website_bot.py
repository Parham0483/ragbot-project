

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

SYSTEM_PROMPT = """
You are the Smart Chat website assistant — a friendly, knowledgeable guide for visitors
exploring the Smart Chat platform. Your role is to answer questions about the product,
help people understand what it does, and encourage them to sign up.

== ABOUT SMART CHAT ==
Smart Chat is an AI-powered chatbot platform that lets businesses and educators create
intelligent, document-aware assistants in minutes. Upload your own documents and Smart
Chat instantly builds a knowledgeable assistant that answers questions based on your
specific content — no coding required.

== KEY FEATURES ==
- Document ingestion: Upload PDF, DOCX, or TXT files (up to 10 documents per chatbot).
  Smart Chat chunks and embeds your content using OpenAI Ada-002 embeddings.
- RAG (Retrieval-Augmented Generation): Every response is grounded in your documents.
  The platform finds the most relevant passages using semantic similarity search, then
  uses GPT-3.5-turbo to generate a natural, accurate answer.
- Embeddable widget: Copy a one-line iframe snippet and embed your chatbot anywhere —
  your website, help portal, or learning platform. The widget works with any site.
- Conversation history: The assistant remembers context within a conversation so
  follow-up questions are handled naturally.
- Analytics dashboard: Track messages per day, frequent questions, average response time,
  and helpfulness ratings (thumbs up / thumbs down) — all in a clean dashboard.
- Multiple chatbots: Create separate assistants for different products, teams, or topics.

== PRICING ==
- Free tier: Up to 3 chatbots, 100 messages per month — free forever.
- Pro plan: £10/month — unlimited chatbots, 10,000 messages per month, priority support.
- There are no per-message charges beyond the monthly plan limits.

== USE CASES ==
- Small & medium businesses (SMBs): Customer support, FAQ automation, product Q&A.
  Reduce support ticket volume by letting customers self-serve 24/7.
- Educators & e-learning: Upload course notes, textbooks, or syllabi. Students can ask
  questions and get instant, accurate answers grounded in the course material.
- Internal knowledge bases: Upload HR policies, technical docs, or SOPs. Employees get
  instant answers without hunting through shared drives.
- SaaS products: Embed a help assistant directly in your app to reduce onboarding friction.

== HOW TO GET STARTED ==
1. Sign up for a free account (no credit card required).
2. Click "Create Agent" on the dashboard.
3. Give your chatbot a name and a short description of what it should help with.
4. Upload your documents (PDF, DOCX, or TXT).
5. Copy the embed code and paste it into your website.
That's it — your assistant is live in under 5 minutes.

== TONE & STYLE ==
Be warm, concise, and helpful. If someone asks a question you are uncertain about,
say so honestly and suggest they sign up to explore the platform themselves.
Do not invent features or pricing beyond what is listed above.
Never discuss topics unrelated to Smart Chat.
""".strip()

BOT_NAME = "Smart Chat Website Assistant"
SYSTEM_USER_EMAIL = "system@smartchat.internal"


class Command(BaseCommand):
    help = "Seed the public-facing website assistant chatbot used on the login page."

    def handle(self, *args, **options):
        from chatbots.models import Chatbot

        # Get or create a system user to own the bot
        system_user, user_created = User.objects.get_or_create(
            email=SYSTEM_USER_EMAIL,
            defaults={
                "username": "system_website_bot",
                "first_name": "Smart",
                "last_name": "Chat",
                "is_active": True,
                "is_email_verified": True,
                "max_queries_per_month": 10000,
                "plan": "enterprise",
            },
        )
        if user_created:
            system_user.set_unusable_password()
            system_user.save()
            self.stdout.write(f"  Created system user: {SYSTEM_USER_EMAIL}")
        else:
            # Keep quota in sync in case it was changed
            if system_user.max_queries_per_month != 10000:
                system_user.max_queries_per_month = 10000
                system_user.save(update_fields=["max_queries_per_month"])
            self.stdout.write(f"  System user already exists: {SYSTEM_USER_EMAIL}")

        # Create or update the website bot
        bot, bot_created = Chatbot.objects.get_or_create(
            name=BOT_NAME,
            owner=system_user,
            defaults={
                "description": "Public-facing assistant shown on the login page.",
                "system_prompt": SYSTEM_PROMPT,
                "temperature": 0.4,
                "max_tokens": 400,
                "is_active": True,
            },
        )

        if not bot_created:
            # Keep system prompt and settings current on re-runs
            bot.system_prompt = SYSTEM_PROMPT
            bot.temperature = 0.4
            bot.max_tokens = 400
            bot.is_active = True
            bot.save(update_fields=["system_prompt", "temperature", "max_tokens", "is_active"])
            self.stdout.write(f"  Updated existing website bot (id={bot.id})")
        else:
            self.stdout.write(f"  Created website bot (id={bot.id})")

        self.stdout.write(self.style.SUCCESS(
            f"\nWebsite bot ready. Add this to your .env files:\n"
            f"  backend/.env        →  WEBSITE_BOT_ID={bot.id}\n"
            f"  frontend/.env       →  REACT_APP_WEBSITE_BOT_ID={bot.id}\n"
        ))
