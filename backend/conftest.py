import os
import tempfile

import pytest


@pytest.fixture(autouse=True, scope="session")
def _set_test_env_vars():
    # set env vars before Django loads — rag_service is a module-level singleton that needs OPENAI_API_KEY at import time
    os.environ.setdefault("OPENAI_API_KEY", "test-api-key")
    os.environ.setdefault("SECRET_KEY", "test-secret")
    os.environ.setdefault("DEBUG", "True")


@pytest.fixture(autouse=True)
def _use_sqlite_db(settings):
    # use SQLite in memory so we don't need a real Postgres running
    settings.DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": ":memory:",
        }
    }


@pytest.fixture(autouse=True)
def _temp_media_root(settings):
    # put uploaded files in a temp folder so they get cleaned up after each test
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
