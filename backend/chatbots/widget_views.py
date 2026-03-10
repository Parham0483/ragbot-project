from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import AnonRateThrottle
from django.conf import settings
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from chatbots.models import Chatbot, Conversation, Message
from services.rag_service import rag_service
from accounts.utils import get_monthly_usage

MAX_MESSAGE_LENGTH = 2000


class WidgetChatThrottle(AnonRateThrottle):
    rate = '20/minute'


@api_view(['GET'])
@permission_classes([AllowAny])
def widget_config(request, chatbot_id):
    # Fetch chatbot regardless of is_active so embed always loads config
    chatbot = get_object_or_404(Chatbot, id=chatbot_id)
    return Response({
        'name': chatbot.name,
        'avatar_url': None,          # placeholder — no avatar field yet
        'welcome_message': f"Hi! I'm {chatbot.name}. How can I help you?",
        'theme_colour': '#B10000',   # default accent colour
        'active': chatbot.is_active,
    })


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([WidgetChatThrottle])
def widget_chat(request, chatbot_id):
    chatbot = get_object_or_404(Chatbot, id=chatbot_id)
    if not chatbot.is_active:
        return Response(
            {'error': 'Chatbot is currently offline'},
            status=status.HTTP_403_FORBIDDEN
        )

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

    # Enforce owner's monthly quota — widget bypasses chat_endpoint so check here
    owner = chatbot.owner
    if get_monthly_usage(owner) >= owner.max_queries_per_month:
        return Response(
            {'error': 'This chatbot has reached its monthly message limit'},
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )

    # Get or create conversation
    conversation_id = request.data.get('conversation_id')
    if conversation_id:
        conversation = get_object_or_404(Conversation, id=conversation_id, chatbot=chatbot)
    else:
        conversation = Conversation.objects.create(
            chatbot=chatbot,
            user=None,  # always anonymous from widget
            title=user_message[:50] + '...' if len(user_message) > 50 else user_message
        )

    # Save user message
    user_msg = Message.objects.create(
        conversation=conversation,
        role='user',
        content=user_message
    )

    # Build recent history (last 5 msgs, excluding the one just saved)
    history = []
    for msg in reversed(list(conversation.messages.order_by('-created_at')[:5])):
        if msg.id != user_msg.id:
            history.append({'role': msg.role, 'content': msg.content})

    # Call RAG
    rag_result = rag_service.generate_response(
        chatbot=chatbot,
        user_message=user_message,
        conversation_history=history
    )

    if not rag_result['success']:
        return Response(
            {'error': rag_result.get('error', 'Failed to generate response')},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    # Save AI reply
    ai_msg = Message.objects.create(
        conversation=conversation,
        role='assistant',
        content=rag_result['response'],
        context_used=rag_result.get('chunks_used', []),
        tokens_used=rag_result.get('tokens_used', 0)
    )

    return Response({
        'reply': ai_msg.content,
        'conversation_id': conversation.id,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def embed_code(request, chatbot_id):
    # Owner-only: 404 if chatbot doesn't belong to this user
    chatbot = get_object_or_404(Chatbot, id=chatbot_id, owner=request.user)
    base = settings.BASE_URL.rstrip('/')
    widget_url = f"{base}/widget/{chatbot.id}/"
    iframe = f'<iframe src="{widget_url}" width="400" height="600" frameborder="0"></iframe>'
    return Response({
        'embed_code': iframe,
        'widget_url': widget_url,
    })
