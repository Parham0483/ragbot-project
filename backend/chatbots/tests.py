import pytest
from chatbots.models import Chatbot, Conversation, Message


@pytest.fixture
def conversation(db, chatbot):
    return Conversation.objects.create(chatbot=chatbot, title="Test")


@pytest.fixture
def assistant_message(db, conversation):
    return Message.objects.create(
        conversation=conversation, role='assistant', content='Hello!'
    )


def test_feedback_thumbs_up(api_client, chatbot, assistant_message):
    url = f'/api/chat/{chatbot.id}/message/{assistant_message.id}/feedback/'
    resp = api_client.patch(url, {'was_helpful': True}, format='json')
    assert resp.status_code == 200
    assert resp.data['status'] == 'ok'
    assistant_message.refresh_from_db()
    assert assistant_message.was_helpful is True


def test_feedback_thumbs_down(api_client, chatbot, assistant_message):
    url = f'/api/chat/{chatbot.id}/message/{assistant_message.id}/feedback/'
    resp = api_client.patch(url, {'was_helpful': False}, format='json')
    assert resp.status_code == 200
    assistant_message.refresh_from_db()
    assert assistant_message.was_helpful is False


def test_feedback_missing_field_returns_400(api_client, chatbot, assistant_message):
    url = f'/api/chat/{chatbot.id}/message/{assistant_message.id}/feedback/'
    resp = api_client.patch(url, {}, format='json')
    assert resp.status_code == 400


def test_feedback_wrong_chatbot_returns_404(api_client, chatbot, assistant_message):
    url = f'/api/chat/9999/message/{assistant_message.id}/feedback/'
    resp = api_client.patch(url, {'was_helpful': True}, format='json')
    assert resp.status_code == 404


def test_feedback_user_message_returns_404(api_client, chatbot, conversation):
    user_msg = Message.objects.create(
        conversation=conversation, role='user', content='hi'
    )
    url = f'/api/chat/{chatbot.id}/message/{user_msg.id}/feedback/'
    resp = api_client.patch(url, {'was_helpful': True}, format='json')
    assert resp.status_code == 404
