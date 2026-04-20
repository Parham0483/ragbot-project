from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import AnonRateThrottle
from django.conf import settings
from django.http import HttpResponse
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from urllib.parse import urlparse

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
    avatar_url = None
    if chatbot.avatar:
        avatar_url = request.build_absolute_uri(chatbot.avatar.url)
    return Response({
        'name': chatbot.name,
        'avatar_url': avatar_url,
        'welcome_message': f"Hi! I'm {chatbot.name}. How can I help you?",
        'theme_colour': chatbot.theme_colour,
        'placeholder': chatbot.placeholder,
        'widget_align': chatbot.widget_align,
        'widget_width': chatbot.widget_width,
        'widget_height': chatbot.widget_height,
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

    # Enforce owner's monthly quota; widget bypasses chat_endpoint so check here
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

    # Call RAG using the chatbot's saved model
    model_id = chatbot.ai_model or 'gpt-3.5-turbo'
    provider  = chatbot.ai_provider or 'openai'
    rag_result = rag_service.generate_response(
        chatbot=chatbot,
        user_message=user_message,
        conversation_history=history,
        model=model_id,
        provider=provider,
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


def _domain_allowed(referer: str, allowed_domains: str) -> bool:
    # empty list = unrestricted
    domains = [d.strip().lower() for d in allowed_domains.splitlines() if d.strip()]
    if not domains:
        return True
    try:
        host = urlparse(referer).netloc.lower().split(':')[0]
    except Exception:
        return False
    return any(host == d or host.endswith('.' + d) for d in domains)


@api_view(['GET'])
@permission_classes([AllowAny])
def widget_script(request, chatbot_id):
    # Serves the floating-bubble
    chatbot = get_object_or_404(Chatbot, id=chatbot_id)

    referer = request.META.get('HTTP_REFERER', '')
    if not _domain_allowed(referer, chatbot.allowed_domains):
        # return silent empty script so the host page doesn't break
        return HttpResponse('/* domain not authorised */', content_type='application/javascript', status=403)
    base = settings.BASE_URL.rstrip('/')
    widget_url = f"{base}/widget/{chatbot.id}/"
    color = chatbot.theme_colour or '#B10000'
    side = 'right' if (chatbot.widget_align or 'right') == 'right' else 'left'
    width = chatbot.widget_width or 380
    height = chatbot.widget_height or 600

    initial = (chatbot.name or 'A')[0].upper()
    avatar_url = request.build_absolute_uri(chatbot.avatar.url) if chatbot.avatar else None

    if avatar_url:
        open_inner = f'<img src="{avatar_url}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;" />'
    else:
        open_inner = f'<span style="color:#fff;font-size:18px;font-weight:700;">{initial}</span>'

    close_inner = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg>'

    js = f"""(function(){{
  var W='{widget_url}',C='{color}',S='{side}';
  var btn=document.createElement('div');
  btn.style.cssText='position:fixed;bottom:20px;'+S+':20px;width:44px;height:44px;border-radius:50%;background:'+C+';cursor:pointer;z-index:2147483646;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,0.2);transition:transform .2s;overflow:hidden;';
  btn.innerHTML='{open_inner}';
  btn.onmouseenter=function(){{btn.style.transform='scale(1.08)';}};
  btn.onmouseleave=function(){{btn.style.transform='scale(1)';}};
  var frame=document.createElement('iframe');
  frame.src=W;frame.allow='clipboard-write';
  frame.style.cssText='position:fixed;bottom:76px;'+S+':20px;width:{width}px;height:{height}px;border:none;border-radius:16px;z-index:2147483647;box-shadow:0 8px 32px rgba(0,0,0,0.2);display:none;';
  var open=false;
  btn.addEventListener('click',function(){{
    open=!open;
    frame.style.display=open?'block':'none';
    btn.innerHTML=open?'{close_inner}':'{open_inner}';
  }});
  document.body.appendChild(frame);
  document.body.appendChild(btn);
}})();"""

    return HttpResponse(js, content_type='application/javascript')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def embed_code(request, chatbot_id):
    # Owner-only: 404 if chatbot doesn't belong to this user
    chatbot = get_object_or_404(Chatbot, id=chatbot_id, owner=request.user)
    base = settings.BASE_URL.rstrip('/')
    widget_url = f"{base}/widget/{chatbot.id}/"
    script_url = f"{base}/api/widget/{chatbot.id}/embed.js"
    snippet = f'<script src="{script_url}"></script>'

    return Response({
        'embed_code': snippet,
        'widget_url': widget_url,
    })
