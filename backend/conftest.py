import os
import tempfile

import pytest


@pytest.fixture(autouse=True, scope="session")
def _set_test_env_vars():
    """Ensure required env vars exist before Django imports modules.

    The project instantiates `rag_service = RAGService()` at import time.
    That class requires OPENAI_API_KEY to be set, even if we mock all network calls.
    """
    os.environ.setdefault("OPENAI_API_KEY", "test-api-key")
    os.environ.setdefault("SECRET_KEY", "test-secret")
    os.environ.setdefault("DEBUG", "True")


@pytest.fixture(autouse=True)
def _use_sqlite_db(settings):
    """Use SQLite for tests so contributors don't need local Postgres."""
    settings.DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": ":memory:",
        }
    }


@pytest.fixture(autouse=True)
def _temp_media_root(settings):
    """Write uploaded test files into a temp directory."""
    with tempfile.TemporaryDirectory() as tmp:
        settings.MEDIA_ROOT = tmp
        yield


@pytest.fixture
def api_client():
    from rest_framework.test import APIClient

    return APIClient()


@pytest.fixture
def user(db):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    return User.objects.create_user(
        email="user1@example.com",
        username="user1",
        password="Password123!",
        first_name="User",
        last_name="One",
    )


@pytest.fixture
def other_user(db):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    return User.objects.create_user(
        email="user2@example.com",
        username="user2",
        password="Password123!",
        first_name="User",
        last_name="Two",
    )


@pytest.fixture
def auth_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def other_auth_client(api_client, other_user):
    api_client.force_authenticate(user=other_user)
    return api_client


@pytest.fixture
def chatbot(db, user):
    from chatbots.models import Chatbot

    return Chatbot.objects.create(
        owner=user,
        name="Test Bot",
        description="Test",
        system_prompt="You are a helpful assistant.",
        temperature=0.2,
        max_tokens=100,
        is_active=True,
    )
