from rest_framework import serializers
from .models import Chatbot, Conversation, Message
from django.contrib.auth import get_user_model

User = get_user_model()

class ChatbotSerializer(serializers.ModelSerializer):
    owner_email = serializers.EmailField(source='owner.email', read_only=True)
    document_count = serializers.IntegerField(read_only=True)
    conversation_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Chatbot
        fields = [
            'id', 'name', 'description', 'owner', 'owner_email',
            'system_prompt', 'temperature', 'max_tokens',
            'is_active', 'document_count', 'conversation_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'owner', 'created_at', 'updated_at']
    
    def validate_name(self, value):
        if len(value) < 3:
            raise serializers.ValidationError("Name must be at least 3 characters long")
        return value
    
    def validate_temperature(self, value):
        if not 0 <= value <= 1:
            raise serializers.ValidationError("Temperature must be between 0 and 1")
        return value


class ChatbotCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chatbot
        fields = ['name', 'description', 'system_prompt', 'temperature', 'max_tokens']
    
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
