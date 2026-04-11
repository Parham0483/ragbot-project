import re
from rest_framework import serializers
from .models import Chatbot, Conversation, Message
from django.contrib.auth import get_user_model

User = get_user_model()

# strip any HTML/script tags from text fields
_TAG_RE = re.compile(r'<[^>]+>')

def strip_tags(value):
    return _TAG_RE.sub('', value).strip()


class ChatbotSerializer(serializers.ModelSerializer):
    owner_email = serializers.EmailField(source='owner.email', read_only=True)
    document_count = serializers.IntegerField(read_only=True)
    conversation_count = serializers.IntegerField(read_only=True)
    avatar_url = serializers.SerializerMethodField()

    def get_avatar_url(self, obj):
        if not obj.avatar:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.avatar.url)
        return obj.avatar.url

    class Meta:
        model = Chatbot
        fields = [
            'id', 'name', 'description', 'owner', 'owner_email',
            'system_prompt', 'temperature', 'max_tokens',
            'ai_model', 'ai_provider',
            'is_active', 'document_count', 'conversation_count',
            'avatar_url', 'theme_colour', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'owner', 'created_at', 'updated_at']
    
    def validate_name(self, value):
        value = strip_tags(value)
        if len(value) < 3:
            raise serializers.ValidationError("Name must be at least 3 characters long")
        return value

    def validate_description(self, value):
        return strip_tags(value)

    def validate_welcome_message(self, value):
        return strip_tags(value) if value else value
    
    def validate_temperature(self, value):
        if not 0 <= value <= 1:
            raise serializers.ValidationError("Temperature must be between 0 and 1")
        return value


# max tokens allowed per plan
MAX_TOKENS_BY_PLAN = {'free': 500, 'pro': 1000, 'enterprise': 4000}

class ChatbotCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chatbot
        fields = ['name', 'description', 'system_prompt', 'temperature', 'max_tokens']

    def validate_max_tokens(self, value):
        user = self.context['request'].user
        limit = MAX_TOKENS_BY_PLAN.get(user.plan, 500)
        if value > limit:
            raise serializers.ValidationError(
                f"Your {user.plan} plan allows a maximum of {limit} tokens per response."
            )
        return value

    def create(self, validated_data):
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['id', 'role', 'content', 'context_used', 'tokens_used', 'created_at']
        read_only_fields = ['id', 'created_at']


class ConversationSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    message_count = serializers.IntegerField(read_only=True)
    chatbot_name = serializers.CharField(source='chatbot.name', read_only=True)
    
    class Meta:
        model = Conversation
        fields = [
            'id', 'chatbot', 'chatbot_name', 'user', 'title',
            'message_count', 'messages', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
