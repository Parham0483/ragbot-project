import time
from concurrent.futures import ThreadPoolExecutor
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from django.shortcuts import get_object_or_404
from django.utils import timezone

from chatbots.models import Chatbot, Conversation, Message
from services.rag_service import rag_service
from accounts.utils import get_monthly_usage

MAX_MESSAGE_LENGTH = 2000
MAX_COMPARE_MODELS = 4

# 20 messages/min for anon,
# 60/min for authenticated users on the chat endpoint
class ChatAnonThrottle(AnonRateThrottle):
    rate = '20/minute'
    scope = 'widget_chat'

class ChatUserThrottle(UserRateThrottle):
    rate = '60/minute'
    scope = 'user'

ALLOWED_MODELS = {
    'openai': ['gpt-4o', 'gpt-4', 'gpt-3.5-turbo'],
    'gemini': ['gemini-1.5-pro-002', 'gemini-2.0-flash'],
    'grok':   ['grok-2', 'grok-beta'],
}


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([ChatAnonThrottle, ChatUserThrottle])
def chat_endpoint(request, chatbot_id):
    try:
        # Lookup chatbot
        try:
            chatbot = Chatbot.objects.get(id=chatbot_id)
        except Chatbot.DoesNotExist:
            return Response({'error': 'Chatbot not found'}, status=status.HTTP_404_NOT_FOUND)
        if not chatbot.is_active:
            return Response({'error': 'This chatbot is not active'}, status=status.HTTP_403_FORBIDDEN)

        # Get user message
        user_message = request.data.get('message', '').strip()
        if not user_message:
            return Response(
                {'error': 'Message cannot be empty'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if len(user_message) > MAX_MESSAGE_LENGTH:
            return Response(
                {'error': f'Message exceeds {MAX_MESSAGE_LENGTH} character limit'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Enforce monthly quota on the chatbot owner (covers both authenticated and anon users)
        owner = chatbot.owner
        if get_monthly_usage(owner) >= owner.max_queries_per_month:
            return Response(
                {'error': 'This chatbot has reached its monthly message limit.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        # Also enforce the calling user's own quota when logged in
        if request.user.is_authenticated and request.user != owner:
            if get_monthly_usage(request.user) >= request.user.max_queries_per_month:
                return Response(
                    {'error': 'Monthly message limit reached. Please upgrade your plan.'},
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )

        # Get or create conversation
        conversation_id = request.data.get('conversation_id')
        if conversation_id:
            # Use filter+first so a bad/foreign ID gives the same 404 as a missing one
            conversation = Conversation.objects.filter(id=conversation_id, chatbot=chatbot).first()
            if not conversation:
                return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)
        else:
            conversation = Conversation.objects.create(
                chatbot=chatbot,
                user=request.user if request.user.is_authenticated else None,
                title=user_message[:50] + '...' if len(user_message) > 50 else user_message
            )

        # Save user message
        user_msg = Message.objects.create(
            conversation=conversation,
            role='user',
            content=user_message
        )

        # Get conversation history (last 5 messages for context)
        history = []
        previous_messages = conversation.messages.order_by('-created_at')[:5]
        for msg in reversed(list(previous_messages)):
            if msg.id != user_msg.id:  # Don't include the message we just created
                history.append({
                    'role': msg.role,
                    'content': msg.content
                })

        # Model selection
        model_id = request.data.get('model_id') or chatbot.ai_model
        provider  = request.data.get('provider') or chatbot.ai_provider
        if provider not in ALLOWED_MODELS or model_id not in ALLOWED_MODELS.get(provider, []):
            model_id, provider = 'gpt-3.5-turbo', 'openai'

        # Generate AI response using RAG, timing the call
        t0 = time.monotonic()
        rag_result = rag_service.generate_response(
            chatbot=chatbot,
            user_message=user_message,
            conversation_history=history,
            model=model_id,
            provider=provider,
        )
        response_time_ms = int((time.monotonic() - t0) * 1000)

        if not rag_result['success']:
            return Response(
                {'error': rag_result.get('error', 'Failed to generate response')},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Save AI response with timing
        ai_msg = Message.objects.create(
            conversation=conversation,
            role='assistant',
            content=rag_result['response'],
            context_used=rag_result.get('chunks_used', []),
            tokens_used=rag_result.get('tokens_used', 0),
            response_time_ms=response_time_ms,
        )

        # Return response
        return Response({
            'conversation_id': conversation.id,
            'user_message': {
                'id': user_msg.id,
                'content': user_msg.content,
                'created_at': user_msg.created_at
            },
            'ai_response': {
                'id': ai_msg.id,
                'content': ai_msg.content,
                'created_at': ai_msg.created_at,
                'tokens_used': ai_msg.tokens_used
            },
            'context': rag_result.get('chunks_used', [])
        })

    except Exception:
        return Response(
            {'error': 'Something went wrong. Please try again.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def conversation_history(request, conversation_id):

    try:
        conversation = get_object_or_404(Conversation, id=conversation_id)

        # Check user has access
        if request.user != conversation.chatbot.owner and conversation.user != request.user:
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        messages = conversation.messages.order_by('created_at')

        return Response({
            'conversation_id': conversation.id,
            'title': conversation.title,
            'created_at': conversation.created_at,
            'messages': [
                {
                    'id': msg.id,
                    'role': msg.role,
                    'content': msg.content,
                    'created_at': msg.created_at,
                    'tokens_used': msg.tokens_used,
                    'context_used': msg.context_used
                }
                for msg in messages
            ]
        })

    except Exception:
        return Response(
            {'error': 'Something went wrong. Please try again.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['PATCH'])
@permission_classes([AllowAny])
def message_feedback(request, chatbot_id, message_id):
    msg = get_object_or_404(
        Message,
        id=message_id,
        role='assistant',
        conversation__chatbot_id=chatbot_id
    )
    was_helpful = request.data.get('was_helpful')
    if was_helpful is None or not isinstance(was_helpful, bool):
        return Response({'error': 'was_helpful must be true or false'}, status=status.HTTP_400_BAD_REQUEST)
    msg.was_helpful = was_helpful
    msg.save(update_fields=['was_helpful'])
    return Response({'status': 'ok'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def compare_endpoint(request, chatbot_id):
    chatbot = get_object_or_404(Chatbot, id=chatbot_id, owner=request.user)

    # check monthly quota before doing anything
    if get_monthly_usage(request.user) >= request.user.max_queries_per_month:
        return Response(
            {'error': 'Monthly message limit reached. Please upgrade your plan.'},
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )

    message = request.data.get('message', '').strip()
    models  = request.data.get('models', [])

    if not message:
        return Response({'error': 'Message required'}, status=status.HTTP_400_BAD_REQUEST)
    if len(message) > MAX_MESSAGE_LENGTH:
        return Response({'error': f'Message exceeds {MAX_MESSAGE_LENGTH} characters'}, status=status.HTTP_400_BAD_REQUEST)
    if not models or not isinstance(models, list):
        return Response({'error': 'models list required'}, status=status.HTTP_400_BAD_REQUEST)
    if len(models) > MAX_COMPARE_MODELS:
        return Response({'error': f'Maximum {MAX_COMPARE_MODELS} models per compare'}, status=status.HTTP_400_BAD_REQUEST)

    for m in models:
        provider = m.get('provider', '')
        model_id = m.get('model_id', '')
        if provider not in ALLOWED_MODELS or model_id not in ALLOWED_MODELS[provider]:
            return Response({'error': f'Invalid model: {model_id}'}, status=status.HTTP_400_BAD_REQUEST)

    # Build RAG prompt once and share it across all models
    prompt_messages, chunks_used = rag_service.prepare_prompt(chatbot, message)

    def call(m):
        t0 = time.monotonic()
        result = rag_service.call_model(
            messages=prompt_messages,
            model_id=m['model_id'],
            provider=m['provider'],
            temperature=chatbot.temperature,
            max_tokens=chatbot.max_tokens,
        )
        return {**result, 'model_id': m['model_id'], 'provider': m['provider'],
                'response_time_ms': int((time.monotonic() - t0) * 1000)}

    with ThreadPoolExecutor(max_workers=MAX_COMPARE_MODELS) as executor:
        results = list(executor.map(call, models))

    return Response({'results': results, 'chunks_used': chunks_used})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_conversation(request, conversation_id):
    # delete the conversation and everything in it
    try:
        conversation = get_object_or_404(Conversation, id=conversation_id)

        # Check user has access
        if request.user != conversation.chatbot.owner:
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        conversation.delete()

        return Response(
            {'message': 'Conversation deleted'},
            status=status.HTTP_204_NO_CONTENT
        )

    except Exception:
        return Response(
            {'error': 'Something went wrong. Please try again.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )