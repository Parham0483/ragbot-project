from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, LoginView, UserProfileView, UserUpdateView,
    logout_view, usage_view,
    verify_email_view,
    password_reset_request_view, password_reset_confirm_view,
    google_login_view, delete_account_view,
    email_change_request_view, email_change_confirm_view,
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
    path('google/', google_login_view, name='google-login'),
    path('delete/', delete_account_view, name='delete-account'),
    path('email-change/request/', email_change_request_view, name='email-change-request'),
    path('email-change/confirm/', email_change_confirm_view, name='email-change-confirm'),
]
