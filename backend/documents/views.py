from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from .models import Document, DocumentChunk
from .serializers import (
    DocumentSerializer,
    DocumentUploadSerializer,
    DocumentChunkSerializer
)
from chatbots.models import Chatbot

class DocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Document operations
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return DocumentUploadSerializer
        return DocumentSerializer
    
    def get_queryset(self):
        """Return documents for user's chatbots"""
        user_chatbots = Chatbot.objects.filter(owner=self.request.user)
        return Document.objects.filter(chatbot__in=user_chatbots)
    
    def create(self, request, *args, **kwargs):
        """Upload a document"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        document = serializer.save()
        
        # Return full document data
        return Response(
            DocumentSerializer(document, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['get'])
    def chunks(self, request, pk=None):
        """Get all chunks for a document"""
        document = self.get_object()
        chunks = document.chunks.all()
        serializer = DocumentChunkSerializer(chunks, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def reprocess(self, request, pk=None):
        """Mark document for reprocessing"""
        document = self.get_object()
        document.status = 'pending'
        document.error_message = None
        document.save()
        
        return Response({
            'message': 'Document marked for reprocessing',
            'status': document.status
        })
