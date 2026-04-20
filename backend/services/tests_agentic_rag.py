import pytest
from types import SimpleNamespace
from unittest.mock import patch, MagicMock


@pytest.fixture
def svc():
    from services.rag_service import rag_service
    return rag_service


def _usage(inp=100, out=50):
    return SimpleNamespace(input_tokens=inp, output_tokens=out)


def _tool_use_response(query="what is the refund policy", tool_id="tu_abc"):
    # simulate claude deciding to search before answering
    tool_block = SimpleNamespace(type="tool_use", id=tool_id, input={"query": query})
    return SimpleNamespace(
        stop_reason="tool_use",
        content=[tool_block],
        usage=_usage(100, 10),
    )


def _end_turn_response(text="The refund policy is 30 days."):
    # simulate claude giving its final answer
    text_block = SimpleNamespace(text=text)
    return SimpleNamespace(
        stop_reason="end_turn",
        content=[text_block],
        usage=_usage(300, 80),
    )


FAKE_CHUNKS = [
    {
        'chunk_id': 1,
        'content': 'Refunds are processed within 30 days of purchase.',
        'metadata': {},
        'document_name': 'policy.pdf',
        'similarity': 0.91,
    }
]


def test_single_search_then_answer(svc, chatbot):
    # claude searches once then returns final answer
    mock_create = MagicMock(side_effect=[
        _tool_use_response("refund policy"),
        _end_turn_response("Refunds take 30 days."),
    ])

    with patch("anthropic.Anthropic") as MockClient, \
         patch.object(svc, "retrieve_relevant_chunks", return_value=FAKE_CHUNKS):

        MockClient.return_value.messages.create = mock_create

        result = svc.generate_response_agentic(
            chatbot=chatbot,
            user_message="What is the refund policy?",
        )

    assert result['success'] is True
    assert result['response'] == "Refunds take 30 days."
    assert len(result['chunks_used']) == 1
    assert result['chunks_used'][0]['document'] == 'policy.pdf'
    # tokens from both api calls should be added together
    assert result['tokens_used'] == (100 + 10) + (300 + 80)
    assert mock_create.call_count == 2


def test_multi_search_then_answer(svc, chatbot):
    # claude searches twice with different queries before answering
    mock_create = MagicMock(side_effect=[
        _tool_use_response("refund policy", tool_id="tu_1"),
        _tool_use_response("cancellation policy", tool_id="tu_2"),
        _end_turn_response("Refunds take 30 days and cancellations are free."),
    ])

    extra_chunk = {**FAKE_CHUNKS[0], 'document_name': 'terms.pdf', 'similarity': 0.88}

    def fake_retrieve(chatbot_id, query, top_k=5):
        if "cancel" in query:
            return [extra_chunk]
        return FAKE_CHUNKS

    with patch("anthropic.Anthropic") as MockClient, \
         patch.object(svc, "retrieve_relevant_chunks", side_effect=fake_retrieve):

        MockClient.return_value.messages.create = mock_create

        result = svc.generate_response_agentic(
            chatbot=chatbot,
            user_message="What are the refund and cancellation policies?",
        )

    assert result['success'] is True
    # chunks from both searches should be accumulated
    assert len(result['chunks_used']) == 2
    documents = {c['document'] for c in result['chunks_used']}
    assert documents == {'policy.pdf', 'terms.pdf'}
    assert mock_create.call_count == 3


def test_no_search_needed(svc, chatbot):
    # claude answers directly without calling the search tool
    mock_create = MagicMock(return_value=_end_turn_response("Hello! How can I help?"))

    with patch("anthropic.Anthropic") as MockClient, \
         patch.object(svc, "retrieve_relevant_chunks") as mock_retrieve:

        MockClient.return_value.messages.create = mock_create

        result = svc.generate_response_agentic(
            chatbot=chatbot,
            user_message="Hello",
        )

    assert result['success'] is True
    assert result['response'] == "Hello! How can I help?"
    assert result['chunks_used'] == []
    mock_retrieve.assert_not_called()
    assert mock_create.call_count == 1


def test_api_error_returns_failure_dict(svc, chatbot):
    # if the api throws an exception the method should return a clean error dict
    with patch("anthropic.Anthropic") as MockClient:
        MockClient.return_value.messages.create.side_effect = Exception("connection timeout")

        result = svc.generate_response_agentic(
            chatbot=chatbot,
            user_message="What are your hours?",
        )

    assert result['success'] is False
    assert "connection timeout" in result['error']
    assert result['response'] == "I'm sorry, I encountered an error processing your request."


def test_token_accumulation(svc, chatbot):
    # tokens from every loop iteration should be summed in the final result
    mock_create = MagicMock(side_effect=[
        _tool_use_response(),                   # 110 tokens
        _tool_use_response("follow up query"),  # 110 tokens
        _end_turn_response(),                   # 380 tokens
    ])

    with patch("anthropic.Anthropic") as MockClient, \
         patch.object(svc, "retrieve_relevant_chunks", return_value=FAKE_CHUNKS):

        MockClient.return_value.messages.create = mock_create

        result = svc.generate_response_agentic(
            chatbot=chatbot,
            user_message="Tell me everything about refunds and shipping.",
        )

    assert result['success'] is True
    assert result['tokens_used'] == 110 + 110 + 380
