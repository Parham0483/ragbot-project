from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.views.static import serve as static_serve
from chatbots import chat_views, widget_views
from documents.urls import protected_media_urlpatterns

urlpatterns = [
    path('admin/', admin.site.urls),

    # Authentication
    path('api/auth/', include('accounts.urls', namespace='accounts')),

    # Chatbots & Documents
    path('api/', include('chatbots.urls', namespace='chatbots')),
    path('api/', include('documents.urls', namespace='documents')),

    # Analytics
    path('api/analytics/', include('analytics.urls', namespace='analytics')),

    # Widget endpoints (public, no auth)
    path('api/widget/<int:chatbot_id>/config/', widget_views.widget_config, name='widget-config'),
    path('api/widget/<int:chatbot_id>/chat/', widget_views.widget_chat, name='widget-chat'),

    # Embed code (authenticated, owner only)
    path('api/chatbots/<int:chatbot_id>/embed-code/', widget_views.embed_code, name='embed-code'),

    # Chat endpoints
    path('api/chat/<int:chatbot_id>/compare/', chat_views.compare_endpoint, name='compare'),
    path('api/chat/<int:chatbot_id>/', chat_views.chat_endpoint, name='chat'),
    path('api/chat/<int:chatbot_id>/message/<int:message_id>/feedback/', chat_views.message_feedback, name='message-feedback'),
    path('api/chat/conversation/<int:conversation_id>/', chat_views.conversation_history, name='conversation-history'),
    path('api/chat/conversation/<int:conversation_id>/delete/', chat_views.delete_conversation,
         name='conversation-delete'),
]

# Protected document downloads (auth required) — must come before any static fallback
urlpatterns += protected_media_urlpatterns

# Chatbot avatars are public — serve in both dev and production
urlpatterns += [
    re_path(r'^media/chatbot_avatars/(?P<path>.+)$', static_serve,
            {'document_root': str(settings.MEDIA_ROOT) + '/chatbot_avatars'}),
]

admin.site.site_header = "RAGBot Administration"
admin.site.site_title = "RAGBot Admin"