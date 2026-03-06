from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.utils import timezone
from .serializers import UserRegistrationSerializer, UserSerializer, UserUpdateSerializer
from .utils import get_monthly_usage

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = UserRegistrationSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        user.last_login_at = timezone.now()
        user.save(update_fields=['last_login_at'])
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {'refresh': str(refresh), 'access': str(refresh.access_token)},
            'message': 'Registration successful!'
        }, status=status.HTTP_201_CREATED)

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

    # reset_date = 1st of next month
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
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response({"error": "Refresh token required"}, status=status.HTTP_400_BAD_REQUEST)
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response({"message": "Logout successful"}, status=status.HTTP_200_OK)
    except:
        return Response({"error": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST)
