import mimetypes
import os

from django.http import FileResponse, Http404
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.conf import settings
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
        # only show documents that belong to the current user's chatbots
        user_chatbots = Chatbot.objects.filter(owner=self.request.user)
        return Document.objects.filter(chatbot__in=user_chatbots)

    def create(self, request, *args, **kwargs):
        # upload a doc and kick off RAG processing straight away
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        document = serializer.save()
        try:
            result = rag_service.process_document(document.id)

            return Response(
                {
                    'document': DocumentSerializer(document, context={'request': request}).data,
                    'processing': result
                },
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
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
        # delete old chunks and reprocess the document from scratch
        document = self.get_object()
        DocumentChunk.objects.filter(document=document).delete()
        result = rag_service.process_document(document.id)

        return Response(result)

    def destroy(self, request, *args, **kwargs):
        # remove the document and all its vector chunks
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {'message': 'Document and all associated chunks deleted'},
            status=status.HTTP_204_NO_CONTENT
        )

    def chunks(self, request, pk=None):
        document = self.get_object()
        chunks = document.chunks.all()
        serializer = DocumentChunkSerializer(chunks, many=True)
        return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def serve_document(request, path):
    # only the owner of the chatbot may download the file
    full_path = os.path.join(settings.MEDIA_ROOT, 'documents', path)
    full_path = os.path.normpath(full_path)

    # prevent path traversal escaping MEDIA_ROOT/documents/
    allowed_root = os.path.normpath(os.path.join(settings.MEDIA_ROOT, 'documents'))
    if not full_path.startswith(allowed_root + os.sep):
        raise Http404

    try:
        doc = Document.objects.select_related('chatbot__owner').get(file=f'documents/{path}')
    except Document.DoesNotExist:
        raise Http404

    if doc.chatbot.owner != request.user:
        from rest_framework.response import Response as R
        from rest_framework import status as st
        return R({'error': 'Access denied'}, status=st.HTTP_403_FORBIDDEN)

    if not os.path.isfile(full_path):
        raise Http404

    mime_type, _ = mimetypes.guess_type(full_path)
    return FileResponse(open(full_path, 'rb'), content_type=mime_type or 'application/octet-stream')

