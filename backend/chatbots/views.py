from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import Chatbot, Conversation, Message
from .serializers import (
    ChatbotSerializer, 
    ChatbotCreateSerializer,
    ConversationSerializer,
    MessageSerializer
)

class ChatbotViewSet(viewsets.ModelViewSet):

    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ChatbotCreateSerializer
        return ChatbotSerializer
    
    def get_queryset(self):
        return Chatbot.objects.filter(owner=self.request.user)
    
    def create(self, request, *args, **kwargs):

        user = request.user
        
        # Check if user can create more chatbots
        if not user.can_create_chatbot:
            return Response({
                'error': f'Chatbot limit reached. Maximum {user.max_chatbots} chatbots allowed.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        chatbot = serializer.save()
        
        return Response(
            ChatbotSerializer(chatbot).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Toggle chatbot active status"""
        chatbot = self.get_object()
        chatbot.is_active = not chatbot.is_active
        chatbot.save()
        
        return Response({
            'message': f'Chatbot {"activated" if chatbot.is_active else "deactivated"}',
            'is_active': chatbot.is_active
        })
    
    @action(detail=True, methods=['get'])
    def conversations(self, request, pk=None):
        """Get all conversations for a chatbot"""
        chatbot = self.get_object()
        conversations = chatbot.conversations.all()
        serializer = ConversationSerializer(conversations, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def documents(self, request, pk=None):
        """Get all documents for a chatbot"""
        from documents.serializers import DocumentSerializer
        chatbot = self.get_object()
        documents = chatbot.documents.all()
        serializer = DocumentSerializer(documents, many=True, context={'request': request})
        return Response(serializer.data)


class ConversationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Conversation operations
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ConversationSerializer
    
    def get_queryset(self):
        """Return conversations for user's chatbots"""
        user_chatbots = Chatbot.objects.filter(owner=self.request.user)
        return Conversation.objects.filter(chatbot__in=user_chatbots)
    
    @action(detail=True, methods=['post'])
    def add_message(self, request, pk=None):
        """Add a message to conversation"""
        conversation = self.get_object()
        
        serializer = MessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = serializer.save(conversation=conversation)
        
        return Response(
            MessageSerializer(message).data,
            status=status.HTTP_201_CREATED
        )
