from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
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
            ChatbotSerializer(chatbot, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        # flip the active flag on or off
        chatbot = self.get_object()
        chatbot.is_active = not chatbot.is_active
        chatbot.save()
        
        return Response({
            'message': f'Chatbot {"activated" if chatbot.is_active else "deactivated"}',
            'is_active': chatbot.is_active
        })
    
    @action(detail=True, methods=['get'])
    def conversations(self, request, pk=None):
        # return all conversations for this chatbot
        chatbot = self.get_object()
        conversations = chatbot.conversations.all()
        serializer = ConversationSerializer(conversations, many=True)
        return Response(serializer.data)
    
    # magic bytes for JPEG, PNG, GIF, WEBP
    _AVATAR_SIGNATURES = [
        b'\xff\xd8\xff',           # JPEG
        b'\x89PNG\r\n\x1a\n',      # PNG
        b'GIF87a', b'GIF89a',      # GIF
        b'RIFF',                   # WEBP (starts RIFF....WEBP)
    ]

    @action(detail=True, methods=['post'], url_path='upload-avatar')
    def upload_avatar(self, request, pk=None):
        chatbot = self.get_object()
        file = request.FILES.get('avatar')
        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        # 1 MB limit
        if file.size > 1024 * 1024:
            return Response({'error': 'File too large (max 1MB)'}, status=status.HTTP_400_BAD_REQUEST)
        # validate by magic bytes, not client-supplied Content-Type
        header = file.read(12)
        file.seek(0)
        is_webp = header[:4] == b'RIFF' and header[8:12] == b'WEBP'
        valid = is_webp or any(header.startswith(sig) for sig in self._AVATAR_SIGNATURES[:3])
        if not valid:
            return Response({'error': 'Only JPEG, PNG, GIF, or WEBP images allowed'}, status=status.HTTP_400_BAD_REQUEST)
        # delete old avatar to avoid orphaned files
        if chatbot.avatar:
            chatbot.avatar.delete(save=False)
        chatbot.avatar = file
        chatbot.save(update_fields=['avatar'])
        return Response(ChatbotSerializer(chatbot, context={'request': request}).data)

    @action(detail=True, methods=['get'])
    def documents(self, request, pk=None):
        # return all documents uploaded to this chatbot
        from documents.serializers import DocumentSerializer
        chatbot = self.get_object()
        documents = chatbot.documents.all()
        serializer = DocumentSerializer(documents, many=True, context={'request': request})
        return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def toggle_chatbot(request, chatbot_id):
    # Only the owner can toggle
    chatbot = get_object_or_404(Chatbot, id=chatbot_id, owner=request.user)
    chatbot.is_active = not chatbot.is_active
    chatbot.save(update_fields=['is_active'])
    return Response({'is_active': chatbot.is_active})


class ConversationViewSet(viewsets.ModelViewSet):

    permission_classes = [IsAuthenticated]
    serializer_class = ConversationSerializer
    
    def get_queryset(self):
        user_chatbots = Chatbot.objects.filter(owner=self.request.user)
        return Conversation.objects.filter(chatbot__in=user_chatbots)
    
    @action(detail=True, methods=['post'])
    def add_message(self, request, pk=None):
        # add a new message to this conversation
        conversation = self.get_object()
        
        serializer = MessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = serializer.save(conversation=conversation)
        
        return Response(
            MessageSerializer(message).data,
            status=status.HTTP_201_CREATED
        )
