from django.db import models
from django.conf import settings
from django.core.validators import MinLengthValidator

class Chatbot(models.Model):

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chatbot_set'
    )
    
    name = models.CharField(
        max_length=200,
        validators=[MinLengthValidator(3)],
        help_text="Chatbot name (min 3 characters)"
    )
    
    description = models.TextField(
        blank=True,
        help_text="Brief description of the chatbot's purpose"
    )
    
    # Configuration
    system_prompt = models.TextField(
        default="You are a helpful AI assistant. Answer questions based on the provided context.",
        help_text="System prompt that defines chatbot behavior"
    )
    
    temperature = models.FloatField(
        default=0.7,
        help_text="LLM temperature (0.0-1.0). Lower = more focused, Higher = more creative"
    )
    
    max_tokens = models.IntegerField(
        default=500,
        help_text="Maximum tokens in response"
    )
    
    # Status
    is_active = models.BooleanField(
        default=True,
        help_text="Whether the chatbot is active and can respond to queries"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'chatbots'
        verbose_name = 'Chatbot'
        verbose_name_plural = 'Chatbots'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['owner', '-created_at']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} (Owner: {self.owner.email})"
    
    @property
    def document_count(self):
        return self.documents.count()
    
    @property
    def conversation_count(self):
        return self.conversations.count()


class Conversation(models.Model):
    chatbot = models.ForeignKey(
        Chatbot,
        on_delete=models.CASCADE,
        related_name='conversations'
    )
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='conversations',
        null=True,
        blank=True,
        help_text="User who started the conversation (can be anonymous)"
    )
    
    title = models.CharField(
        max_length=200,
        default="New Conversation",
        help_text="Conversation title (auto-generated from first message)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'conversations'
        verbose_name = 'Conversation'
        verbose_name_plural = 'Conversations'
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['chatbot', '-updated_at']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.chatbot.name}"
    
    @property
    def message_count(self):
        return self.messages.count()


class Message(models.Model):
    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
        ('system', 'System'),
    ]
    
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        help_text="Who sent the message"
    )
    
    content = models.TextField(
        help_text="Message content"
    )

    context_used = models.JSONField(
        null=True,
        blank=True,
        help_text="Retrieved document chunks used to generate response"
    )
    
    # Metadata
    tokens_used = models.IntegerField(
        null=True,
        blank=True,
        help_text="Number of tokens used for this message"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'messages'
        verbose_name = 'Message'
        verbose_name_plural = 'Messages'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
        ]
    
    def __str__(self):
        preview = self.content[:50] + "..." if len(self.content) > 50 else self.content
        return f"{self.role}: {preview}"
