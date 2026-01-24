from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChatbotViewSet, ConversationViewSet

router = DefaultRouter()
router.register(r'chatbots', ChatbotViewSet, basename='chatbot')
router.register(r'conversations', ConversationViewSet, basename='conversation')

app_name = 'chatbots'

urlpatterns = [
    path('', include(router.urls)),
]
