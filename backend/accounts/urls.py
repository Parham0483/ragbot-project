from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, LoginView, UserProfileView, UserUpdateView,
    logout_view, usage_view,
    verify_email_view,
    password_reset_request_view, password_reset_confirm_view,
)

app_name = 'accounts'

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', logout_view, name='logout'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('profile/update/', UserUpdateView.as_view(), name='profile-update'),
    path('usage/', usage_view, name='usage'),
    path('verify-email/', verify_email_view, name='verify-email'),
    path('password-reset-request/', password_reset_request_view, name='password-reset-request'),
    path('password-reset-confirm/', password_reset_confirm_view, name='password-reset-confirm'),
]
