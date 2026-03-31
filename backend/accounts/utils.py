import logging

import requests
from django.conf import settings
from django.utils import timezone
from chatbots.models import Message

logger = logging.getLogger(__name__)


def validate_email_deliverable(email: str) -> tuple[bool, str]:

    api_key = getattr(settings, 'ABSTRACT_API_KEY', '')
    if not api_key:
        return True, ''

    try:
        response = requests.get(
            'https://emailvalidation.abstractapi.com/v1/',
            params={'api_key': api_key, 'email': email},
            timeout=5,
        )
        if response.status_code != 200:
            logger.warning('Abstract API returned status %s for email validation', response.status_code)
            return True, ''

        data = response.json()

        # Block disposable addresses
        if data.get('is_disposable_email', {}).get('value', False):
            return False, 'Disposable email addresses are not permitted.'

        # Block invalid MX records (undeliverable domain)
        if not data.get('is_mx_found', {}).get('value', True):
            return False, 'Email domain has no valid mail server (MX record not found).'

        # Block addresses Abstract marks as invalid format/undeliverable
        deliverability = data.get('deliverability', 'UNKNOWN')
        if deliverability == 'UNDELIVERABLE':
            return False, 'Email address appears to be undeliverable.'

        return True, ''

    except Exception as exc:
        logger.warning('Abstract API email validation failed, failing open: %s', exc)
        return True, ''


def get_monthly_usage(user):
    # count how many messages the user sent this month across all their chatbots
    now = timezone.now()
    return Message.objects.filter(
        conversation__chatbot__owner=user,
        role='user',
        created_at__year=now.year,
        created_at__month=now.month,
    ).count()
