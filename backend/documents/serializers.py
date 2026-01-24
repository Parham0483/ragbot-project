from rest_framework import serializers
from .models import Document, DocumentChunk

class DocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Document
        fields = [
            'id', 'chatbot', 'file', 'file_url', 'file_name',
            'file_type', 'file_size', 'status', 'chunk_count',
            'error_message', 'uploaded_at', 'processed_at'
        ]
        read_only_fields = [
            'id', 'file_name', 'file_type', 'file_size',
            'status', 'chunk_count', 'error_message',
            'uploaded_at', 'processed_at'
        ]
    
    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
        return None
    
    def validate_file(self, value):
        # Check file size (max 10MB)
        max_size = 10 * 1024 * 1024  # 10MB
        if value.size > max_size:
            raise serializers.ValidationError("File size must be less than 10MB")
        return value


class DocumentUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ['chatbot', 'file']
    
    def validate(self, data):
        chatbot = data.get('chatbot')
        user = self.context['request'].user
        
        # Check if user owns the chatbot
        if chatbot.owner != user:
            raise serializers.ValidationError("You don't have permission to upload to this chatbot")
        
        # Check document limit
        if chatbot.documents.count() >= user.max_documents_per_chatbot:
            raise serializers.ValidationError(
                f"Document limit reached. Maximum {user.max_documents_per_chatbot} documents per chatbot."
            )
        
        return data


class DocumentChunkSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentChunk
        fields = ['id', 'document', 'content', 'chunk_index', 'metadata', 'created_at']
        read_only_fields = ['id', 'created_at']
