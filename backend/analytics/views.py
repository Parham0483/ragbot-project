from django.utils import timezone
from datetime import timedelta, date
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Avg
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

    # Always show last 30 days, filling zeros for empty days
    today = timezone.now().date()
    start = today - timedelta(days=29)

    counts = {
        row['date']: row['count']
        for row in (
            Message.objects
            .filter(conversation__chatbot=chatbot, role='user', created_at__date__gte=start)
            .annotate(date=TruncDate('created_at'))
            .values('date')
            .annotate(count=Count('id'))
        )
    }

    result = []
    for i in range(30):
        d = start + timedelta(days=i)
        result.append({'date': str(d), 'count': counts.get(d, 0)})

    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def frequent_questions(request, chatbot_id):
    chatbot = get_chatbot_or_403(chatbot_id, request.user)
    if not chatbot:
        return Response({'error': 'Not found'}, status=404)

    data = (
        Message.objects
        .filter(conversation__chatbot=chatbot, role='user')
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

    user_msgs = Message.objects.filter(conversation__chatbot=chatbot, role='user')
    assistant_msgs = Message.objects.filter(conversation__chatbot=chatbot, role='assistant')

    total_messages = user_msgs.count()
    total_conversations = chatbot.conversations.count()

    # avg response time from assistant messages that have it recorded
    avg_rt = assistant_msgs.filter(response_time_ms__isnull=False).aggregate(
        avg=Avg('response_time_ms')
    )['avg']

    # days that had at least 1 user message
    active_days = (
        user_msgs
        .annotate(date=TruncDate('created_at'))
        .values('date')
        .distinct()
        .count()
    )

    helpful_count = assistant_msgs.filter(was_helpful=True).count()
    not_helpful_count = assistant_msgs.filter(was_helpful=False).count()
    rated_total = helpful_count + not_helpful_count
    helpfulness_rate = round(helpful_count / rated_total * 100, 1) if rated_total > 0 else None

    return Response({
        'total_messages': total_messages,
        'total_conversations': total_conversations,
        'avg_response_time_ms': round(avg_rt) if avg_rt is not None else None,
        'active_days': active_days,
        'helpful_count': helpful_count,
        'not_helpful_count': not_helpful_count,
        'helpfulness_rate': helpfulness_rate,
    })


#  Overview endpoints (aggregate across ALL user chatbots)

def _user_messages(user, days):
    # get all user messages, filter by date if a days param is given
    qs = Message.objects.filter(
        conversation__chatbot__owner=user,
        role='user'
    )
    return date_filter(qs, days)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def overview_messages_per_day(request):
    days = request.query_params.get('days')
    data = (
        _user_messages(request.user, days)
        .annotate(date=TruncDate('created_at'))
        .values('date')
        .annotate(count=Count('id'))
        .order_by('date')
    )
    return Response([{'date': str(r['date']), 'count': r['count']} for r in data])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def overview_frequent_questions(request):
    days = request.query_params.get('days')
    data = (
        _user_messages(request.user, days)
        .values('content')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )
    return Response([{'question': r['content'], 'count': r['count']} for r in data])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def overview_summary(request):
    days = request.query_params.get('days')
    total_messages = _user_messages(request.user, days).count()
    total_conversations = (
        Chatbot.objects.filter(owner=request.user)
        .aggregate(total=Count('conversations'))['total'] or 0
    )
    avg_rt = Message.objects.filter(
        conversation__chatbot__owner=request.user,
        role='assistant',
        response_time_ms__isnull=False,
    ).aggregate(avg=Avg('response_time_ms'))['avg']
    return Response({
        'total_messages': total_messages,
        'total_conversations': total_conversations,
        'avg_response_time_ms': round(avg_rt) if avg_rt is not None else None,
        'chatbot_name': 'All Agents',
    })
