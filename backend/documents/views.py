"""
Updated Document Views with RAG Processing
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone

from .models import Document, DocumentChunk
from .serializers import DocumentSerializer, DocumentUploadSerializer, DocumentChunkSerializer
from chatbots.models import Chatbot

# Import RAG service
from services.rag_service import rag_service


class DocumentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_serializer_class(self):
        if self.action == 'create':
            return DocumentUploadSerializer
        return DocumentSerializer

    def get_queryset(self):
        """Only return documents for user's chatbots"""
        user_chatbots = Chatbot.objects.filter(owner=self.request.user)
        return Document.objects.filter(chatbot__in=user_chatbots)

    def create(self, request, *args, **kwargs):
        """
        Upload document and automatically process it with RAG
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        document = serializer.save()

        # Automatically start processing
        try:
            # Process document in background (for production, use Celery)
            # For now, process synchronously
            result = rag_service.process_document(document.id)

            return Response(
                {
                    'document': DocumentSerializer(document, context={'request': request}).data,
                    'processing': result
                },
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            # Document created but processing failed
            return Response(
                {
                    'document': DocumentSerializer(document, context={'request': request}).data,
                    'processing': {
                        'success': False,
                        'error': str(e)
                    }
                },
                status=status.HTTP_201_CREATED
            )

    @action(detail=True, methods=['post'])
    def reprocess(self, request, pk=None):
        """Manually reprocess a document"""
        document = self.get_object()

        # Delete existing chunks
        DocumentChunk.objects.filter(document=document).delete()

        # Reprocess
        result = rag_service.process_document(document.id)

        return Response(result)

    @action(detail=True, methods=['get'])
    def chunks(self, request, pk=None):
        """Get all chunks for a document"""
        document = self.get_object()
        chunks = document.chunks.all()
        serializer = DocumentChunkSerializer(chunks, many=True)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        """Delete document and all its chunks"""
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {'message': 'Document and all associated chunks deleted'},
            status=status.HTTP_204_NO_CONTENT
        )