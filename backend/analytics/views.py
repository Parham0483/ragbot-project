from django.utils import timezone
from datetime import timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count
from django.db.models.functions import TruncDate
from chatbots.models import Chatbot, Message


def get_chatbot_or_403(chatbot_id, user):
    try:
        return Chatbot.objects.get(id=chatbot_id, owner=user)
    except Chatbot.DoesNotExist:
        return None


def date_filter(queryset, days_param):
    if days_param:
        try:
            days = int(days_param)
            cutoff = timezone.now() - timedelta(days=days)
            queryset = queryset.filter(created_at__gte=cutoff)
        except ValueError:
            pass
    return queryset


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def messages_per_day(request, chatbot_id):
    chatbot = get_chatbot_or_403(chatbot_id, request.user)
    if not chatbot:
        return Response({'error': 'Not found'}, status=404)

    days = request.query_params.get('days')
    messages = Message.objects.filter(
        conversation__chatbot=chatbot,
        role='user'
    )
    messages = date_filter(messages, days)

    data = (
        messages
        .annotate(date=TruncDate('created_at'))
        .values('date')
        .annotate(count=Count('id'))
        .order_by('date')
    )

    return Response([
        {'date': str(row['date']), 'count': row['count']}
        for row in data
    ])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def frequent_questions(request, chatbot_id):
    chatbot = get_chatbot_or_403(chatbot_id, request.user)
    if not chatbot:
        return Response({'error': 'Not found'}, status=404)

    days = request.query_params.get('days')
    messages = Message.objects.filter(
        conversation__chatbot=chatbot,
        role='user'
    )
    messages = date_filter(messages, days)

    data = (
        messages
        .values('content')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )

    return Response([
        {'question': row['content'], 'count': row['count']}
        for row in data
    ])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def chatbot_summary(request, chatbot_id):
    chatbot = get_chatbot_or_403(chatbot_id, request.user)
    if not chatbot:
        return Response({'error': 'Not found'}, status=404)

    days = request.query_params.get('days')
    messages = Message.objects.filter(
        conversation__chatbot=chatbot,
        role='user'
    )
    messages = date_filter(messages, days)

    total_messages = messages.count()
    total_conversations = chatbot.conversations.count()

    return Response({
        'total_messages': total_messages,
        'total_conversations': total_conversations,
        'chatbot_name': chatbot.name,
    })
