import pytest
from chatbots.models import Conversation, Message


@pytest.fixture
def conversation(db, chatbot):
    return Conversation.objects.create(chatbot=chatbot, title="Test conv")


@pytest.fixture
def user_message(db, conversation):
    return Message.objects.create(
        conversation=conversation, role='user', content='How do I reset my password?'
    )


@pytest.fixture
def assistant_message(db, conversation):
    return Message.objects.create(
        conversation=conversation, role='assistant', content='Click forgot password.'
    )


def test_summary_requires_auth(api_client, chatbot):
    resp = api_client.get(f'/api/analytics/{chatbot.id}/summary/')
    assert resp.status_code == 401


def test_summary_other_user_returns_404(other_auth_client, chatbot):
    resp = other_auth_client.get(f'/api/analytics/{chatbot.id}/summary/')
    assert resp.status_code == 404


def test_summary_returns_expected_fields(auth_client, chatbot):
    resp = auth_client.get(f'/api/analytics/{chatbot.id}/summary/')
    assert resp.status_code == 200
    for field in ('total_messages', 'total_conversations', 'helpful_count', 'not_helpful_count'):
        assert field in resp.data, f'Missing field: {field}'


def test_summary_total_messages_counts_user_messages(auth_client, chatbot, user_message, assistant_message):
    # total_messages should only count user messages, not assistant messages
    resp = auth_client.get(f'/api/analytics/{chatbot.id}/summary/')
    assert resp.status_code == 200
    assert resp.data['total_messages'] == 1


def test_summary_helpful_count(auth_client, chatbot, conversation):
    Message.objects.create(conversation=conversation, role='assistant', content='A', was_helpful=True)
    Message.objects.create(conversation=conversation, role='assistant', content='B', was_helpful=True)
    Message.objects.create(conversation=conversation, role='assistant', content='C', was_helpful=False)
    resp = auth_client.get(f'/api/analytics/{chatbot.id}/summary/')
    assert resp.data['helpful_count'] == 2
    assert resp.data['not_helpful_count'] == 1


def test_summary_empty_chatbot(auth_client, chatbot):
    resp = auth_client.get(f'/api/analytics/{chatbot.id}/summary/')
    assert resp.status_code == 200
    assert resp.data['total_messages'] == 0
    assert resp.data['helpful_count'] == 0


def test_frequent_questions_requires_auth(api_client, chatbot):
    resp = api_client.get(f'/api/analytics/{chatbot.id}/frequent-questions/')
    assert resp.status_code == 401


def test_frequent_questions_returns_list(auth_client, chatbot, user_message):
    resp = auth_client.get(f'/api/analytics/{chatbot.id}/frequent-questions/')
    assert resp.status_code == 200
    assert isinstance(resp.data, list)
    assert resp.data[0]['question'] == user_message.content
    assert 'count' in resp.data[0]


def test_frequent_questions_sorted_by_frequency(auth_client, chatbot, conversation):
    # ask the same question 3 times and a different one once
    for _ in range(3):
        Message.objects.create(conversation=conversation, role='user', content='common question')
    Message.objects.create(conversation=conversation, role='user', content='rare question')
    resp = auth_client.get(f'/api/analytics/{chatbot.id}/frequent-questions/')
    assert resp.status_code == 200
    assert resp.data[0]['question'] == 'common question'
    assert resp.data[0]['count'] == 3


def test_frequent_questions_other_user_returns_404(other_auth_client, chatbot):
    resp = other_auth_client.get(f'/api/analytics/{chatbot.id}/frequent-questions/')
    assert resp.status_code == 404
