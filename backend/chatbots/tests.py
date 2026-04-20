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
    # chatbot id 9999 doesn't exist so should get 404
    url = f'/api/chat/9999/message/{assistant_message.id}/feedback/'
    resp = api_client.patch(url, {'was_helpful': True}, format='json')
    assert resp.status_code == 404


def test_feedback_user_message_returns_404(api_client, chatbot, conversation):
    # only assistant messages can be rated, not user messages
    user_msg = Message.objects.create(
        conversation=conversation, role='user', content='hi'
    )
    url = f'/api/chat/{chatbot.id}/message/{user_msg.id}/feedback/'
    resp = api_client.patch(url, {'was_helpful': True}, format='json')
    assert resp.status_code == 404


def test_chatbot_patch_name(auth_client, chatbot):
    resp = auth_client.patch(f'/api/chatbots/{chatbot.id}/', {'name': 'New Name'}, format='json')
    assert resp.status_code == 200
    assert resp.data['name'] == 'New Name'
    chatbot.refresh_from_db()
    assert chatbot.name == 'New Name'


def test_chatbot_patch_system_prompt(auth_client, chatbot):
    new_prompt = 'You are a strict assistant.'
    resp = auth_client.patch(f'/api/chatbots/{chatbot.id}/', {'system_prompt': new_prompt}, format='json')
    assert resp.status_code == 200
    chatbot.refresh_from_db()
    assert chatbot.system_prompt == new_prompt


def test_chatbot_patch_partial_leaves_other_fields(auth_client, chatbot):
    # patching name should not wipe out the system prompt
    original_prompt = chatbot.system_prompt
    resp = auth_client.patch(f'/api/chatbots/{chatbot.id}/', {'name': 'Partial Update'}, format='json')
    assert resp.status_code == 200
    chatbot.refresh_from_db()
    assert chatbot.name == 'Partial Update'
    assert chatbot.system_prompt == original_prompt


def test_chatbot_patch_requires_auth(api_client, chatbot):
    resp = api_client.patch(f'/api/chatbots/{chatbot.id}/', {'name': 'X'}, format='json')
    assert resp.status_code == 401


def test_chatbot_patch_other_user_returns_404(other_auth_client, chatbot):
    # another user should not be able to edit someone else's chatbot
    resp = other_auth_client.patch(f'/api/chatbots/{chatbot.id}/', {'name': 'X'}, format='json')
    assert resp.status_code == 404


def test_chatbot_delete_removes_from_db(auth_client, chatbot):
    chatbot_id = chatbot.id
    resp = auth_client.delete(f'/api/chatbots/{chatbot_id}/')
    assert resp.status_code == 204
    assert not Chatbot.objects.filter(id=chatbot_id).exists()


def test_chatbot_delete_requires_auth(api_client, chatbot):
    resp = api_client.delete(f'/api/chatbots/{chatbot.id}/')
    assert resp.status_code == 401


def test_chatbot_delete_other_user_returns_404(other_auth_client, chatbot):
    resp = other_auth_client.delete(f'/api/chatbots/{chatbot.id}/')
    assert resp.status_code == 404
    # make sure it wasn't actually deleted
    assert Chatbot.objects.filter(id=chatbot.id).exists()
