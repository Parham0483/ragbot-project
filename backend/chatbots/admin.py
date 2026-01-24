from django.contrib import admin
from .models import Chatbot, Conversation, Message

@admin.register(Chatbot)
class ChatbotAdmin(admin.ModelAdmin):
    list_display = ['name', 'owner', 'is_active', 'document_count', 'conversation_count', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'owner__email']
    readonly_fields = ['created_at', 'updated_at', 'document_count', 'conversation_count']
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('owner', 'name', 'description', 'is_active')
        }),
        ('Configuration', {
            'fields': ('system_prompt', 'temperature', 'max_tokens')
        }),
        ('Statistics', {
            'fields': ('document_count', 'conversation_count', 'created_at', 'updated_at')
        }),
    )

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ['title', 'chatbot', 'user', 'message_count', 'created_at']
    list_filter = ['created_at']
    search_fields = ['title', 'chatbot__name']
    readonly_fields = ['created_at', 'updated_at', 'message_count']

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['conversation', 'role', 'content_preview', 'created_at']
    list_filter = ['role', 'created_at']
    search_fields = ['content']
    readonly_fields = ['created_at']
    
    def content_preview(self, obj):
        return obj.content[:50] + "..." if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Content'
