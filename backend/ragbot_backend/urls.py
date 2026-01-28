from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

# Import chat views
from chatbots import chat_views

urlpatterns = [
    path('admin/', admin.site.urls),

    # Authentication
    path('api/auth/', include('accounts.urls', namespace='accounts')),

    # Chatbots & Documents
    path('api/', include('chatbots.urls', namespace='chatbots')),
    path('api/', include('documents.urls', namespace='documents')),

    # Chat endpoints
    path('api/chat/<int:chatbot_id>/', chat_views.chat_endpoint, name='chat'),
    path('api/chat/conversation/<int:conversation_id>/', chat_views.conversation_history, name='conversation-history'),
    path('api/chat/conversation/<int:conversation_id>/delete/', chat_views.delete_conversation,
         name='conversation-delete'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

admin.site.site_header = "RAGBot Administration"
admin.site.site_title = "RAGBot Admin"