from django.utils import timezone
from chatbots.models import Message


def get_monthly_usage(user):
    """Count user-role messages across all of this user's chatbots in the current calendar month."""
    now = timezone.now()
    return Message.objects.filter(
        conversation__chatbot__owner=user,
        role='user',
        created_at__year=now.year,
        created_at__month=now.month,
    ).count()
