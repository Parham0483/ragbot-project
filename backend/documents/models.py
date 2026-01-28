from django.db import models
from django.core.validators import FileExtensionValidator
from chatbots.models import Chatbot
import os

def document_upload_path(instance, filename):

    return f'documents/chatbot_{instance.chatbot.id}/{filename}'

class Document(models.Model):

    FILE_TYPE_CHOICES = [
        ('pdf', 'PDF'),
        ('txt', 'Text File'),
        ('docx', 'Word Document'),
        ('md', 'Markdown'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending Processing'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    chatbot = models.ForeignKey(
        Chatbot,
        on_delete=models.CASCADE,
        related_name='documents'
    )
    
    file = models.FileField(
        upload_to=document_upload_path,
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'txt', 'docx', 'md'])],
        help_text="Upload PDF, TXT, DOCX, or MD files"
    )
    
    file_name = models.CharField(
        max_length=255,
        help_text="Original filename"
    )
    
    file_type = models.CharField(
        max_length=10,
        choices=FILE_TYPE_CHOICES
    )
    
    file_size = models.IntegerField(
        help_text="File size in bytes"
    )
    
    # Processing status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    
    # Vector storage info
    chunk_count = models.IntegerField(
        default=0,
        help_text="Number of chunks created from this document"
    )
    
    error_message = models.TextField(
        blank=True,
        null=True,
        help_text="Error message if processing failed"
    )
    
    # Timestamps
    uploaded_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'documents'
        verbose_name = 'Document'
        verbose_name_plural = 'Documents'
        ordering = ['-uploaded_at']
        indexes = [
            models.Index(fields=['chatbot', '-uploaded_at']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.file_name} ({self.chatbot.name})"
    
    def save(self, *args, **kwargs):
        """Auto-populate file metadata on save"""
        if self.file and not self.file_name:
            self.file_name = os.path.basename(self.file.name)
            
        if self.file and not self.file_size:
            self.file_size = self.file.size
            
        if self.file and not self.file_type:
            ext = os.path.splitext(self.file_name)[1].lower().replace('.', '')
            self.file_type = ext
            
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        """Delete file from storage when document is deleted"""
        if self.file:
            if os.path.isfile(self.file.path):
                os.remove(self.file.path)
        super().delete(*args, **kwargs)


class DocumentChunk(models.Model):

    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='chunks'
    )
    
    content = models.TextField(
        help_text="Chunk text content"
    )
    
    chunk_index = models.IntegerField(
        help_text="Order of this chunk in the document"
    )
    
    embedding = models.JSONField(
        null=True,
        blank=True,
        help_text="Vector embedding of this chunk"
    )
    
    # Metadata
    metadata = models.JSONField(
        default=dict,
        help_text="Additional metadata (page number, section, etc.)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'document_chunks'
        verbose_name = 'Document Chunk'
        verbose_name_plural = 'Document Chunks'
        ordering = ['document', 'chunk_index']
        indexes = [
            models.Index(fields=['document', 'chunk_index']),
        ]
    
    def __str__(self):
        preview = self.content[:50] + "..." if len(self.content) > 50 else self.content
        return f"Chunk {self.chunk_index}: {preview}"
