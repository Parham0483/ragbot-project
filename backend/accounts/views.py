import secrets

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.utils import timezone
from datetime import timedelta
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.exceptions import AuthenticationFailed

from .serializers import UserRegistrationSerializer, UserSerializer, UserUpdateSerializer
from .utils import get_monthly_usage, validate_email_deliverable

User = get_user_model()


class VerifiedTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        if not self.user.is_email_verified:
            raise AuthenticationFailed(
                'Email address not verified. Check your inbox for the verification link.'
            )
        return data


class LoginView(TokenObtainPairView):
    serializer_class = VerifiedTokenObtainPairSerializer


def _issue_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {'refresh': str(refresh), 'access': str(refresh.access_token)}


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = UserRegistrationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Layer 1 is Abstract API deliverability check
        email = serializer.validated_data.get('email', '')
        deliverable, reason = validate_email_deliverable(email)
        if not deliverable:
            return Response(
                {'email': ['Please provide a valid, deliverable email address.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = serializer.save()

        # Layer 2 will be generate verification token and send email
        token = secrets.token_urlsafe(32)
        user.email_verification_token = token
        user.save(update_fields=['email_verification_token'])

        verify_link = (
            f"{settings.FRONTEND_URL}/verify-email"
            f"?token={token}&uid={user.id}"
        )
        send_mail(
            subject='Verify your RAGBot email address',
            message=(
                f"Hi {user.first_name or user.username},\n\n"
                f"Please verify your email address by clicking the link below:\n\n"
                f"{verify_link}\n\n"
                f"This link does not expire. If you did not create an account, ignore this email.\n\n"
                f"— The RAGBot Team"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )

        return Response(
            {
                'message': 'Account created! Please check your email to verify your account before logging in.',
                'user': {'id': user.id, 'email': user.email},
            },
            status=status.HTTP_201_CREATED,
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_email_view(request):

    token = request.data.get('token', '').strip()
    uid = request.data.get('uid')

    if not token or not uid:
        return Response({'error': 'token and uid are required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(id=uid)
    except (User.DoesNotExist, ValueError):
        return Response({'error': 'Invalid verification link.'}, status=status.HTTP_400_BAD_REQUEST)

    if user.is_email_verified:
        # Already verified  just returns tokens so the link works as a login too
        return Response({
            'message': 'Email already verified.',
            'tokens': _issue_tokens(user),
            'user': UserSerializer(user).data,
        })

    if not user.email_verification_token or user.email_verification_token != token:
        return Response({'error': 'Invalid or expired verification token.'}, status=status.HTTP_400_BAD_REQUEST)

    user.is_email_verified = True
    user.email_verification_token = None
    user.last_login_at = timezone.now()
    user.save(update_fields=['is_email_verified', 'email_verification_token', 'last_login_at'])

    return Response({
        'message': 'Email verified successfully! You are now logged in.',
        'tokens': _issue_tokens(user),
        'user': UserSerializer(user).data,
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request_view(request):
    email = request.data.get('email', '').strip().lower()
    _SAFE_RESPONSE = Response(
        {'message': 'If that email exists, a password reset link has been sent.'},
        status=status.HTTP_200_OK,
    )

    if not email:
        return _SAFE_RESPONSE

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return _SAFE_RESPONSE

    token = secrets.token_urlsafe(32)
    user.password_reset_token = token
    user.password_reset_token_expires = timezone.now() + timedelta(hours=1)
    user.save(update_fields=['password_reset_token', 'password_reset_token_expires'])

    reset_link = (
        f"{settings.FRONTEND_URL}/reset-password"
        f"?token={token}&uid={user.id}"
    )
    send_mail(
        subject='Reset your RAGBot password',
        message=(
            f"Hi {user.first_name or user.username},\n\n"
            f"Click the link below to reset your password. This link expires in 1 hour.\n\n"
            f"{reset_link}\n\n"
            f"If you did not request a password reset, ignore this email.\n\n"
            f"— The RAGBot Team"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=True,
    )

    return _SAFE_RESPONSE


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm_view(request):
    token = request.data.get('token', '').strip()
    uid = request.data.get('uid')
    new_password = request.data.get('new_password', '')
    new_password_confirm = request.data.get('new_password_confirm', '')

    if not all([token, uid, new_password, new_password_confirm]):
        return Response({'error': 'All fields are required.'}, status=status.HTTP_400_BAD_REQUEST)

    if new_password != new_password_confirm:
        return Response({'error': "Passwords don't match."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(id=uid)
    except (User.DoesNotExist, ValueError):
        return Response({'error': 'Invalid reset link.'}, status=status.HTTP_400_BAD_REQUEST)

    if not user.password_reset_token or user.password_reset_token != token:
        return Response({'error': 'Invalid or expired reset token.'}, status=status.HTTP_400_BAD_REQUEST)

    if user.password_reset_token_expires and timezone.now() > user.password_reset_token_expires:
        return Response({'error': 'Reset token has expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        validate_password(new_password, user)
    except ValidationError as exc:
        return Response({'error': list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.password_reset_token = None
    user.password_reset_token_expires = None
    user.save(update_fields=['password', 'password_reset_token', 'password_reset_token_expires'])

    return Response({'message': 'Password reset successfully. You can now log in.'}, status=status.HTTP_200_OK)


class UserProfileView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class UserUpdateView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserUpdateSerializer

    def get_object(self):
        return self.request.user


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def usage_view(request):
    user = request.user
    used = get_monthly_usage(user)
    limit = user.max_queries_per_month

    now = timezone.now()
    if now.month == 12:
        reset = now.replace(year=now.year + 1, month=1, day=1)
    else:
        reset = now.replace(month=now.month + 1, day=1)

    return Response({
        'messages_used': used,
        'messages_limit': limit,
        'messages_remaining': max(0, limit - used),
        'reset_date': reset.strftime('%Y-%m-%d'),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'error': 'Refresh token required'}, status=status.HTTP_400_BAD_REQUEST)
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)
    except Exception:
        return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)
