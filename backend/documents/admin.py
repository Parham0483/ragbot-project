from django.contrib import admin
from .models import Document, DocumentChunk

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['file_name', 'chatbot', 'file_type', 'status', 'chunk_count', 'uploaded_at']
    list_filter = ['status', 'file_type', 'uploaded_at']
    search_fields = ['file_name', 'chatbot__name']
    readonly_fields = ['uploaded_at', 'processed_at', 'file_size', 'chunk_count']
    
    fieldsets = (
        ('File Info', {
            'fields': ('chatbot', 'file', 'file_name', 'file_type', 'file_size')
        }),
        ('Processing', {
            'fields': ('status', 'chunk_count', 'error_message', 'uploaded_at', 'processed_at')
        }),
    )

@admin.register(DocumentChunk)
class DocumentChunkAdmin(admin.ModelAdmin):
    list_display = ['document', 'chunk_index', 'content_preview', 'created_at']
    list_filter = ['created_at']
    search_fields = ['content', 'document__file_name']
    readonly_fields = ['created_at']
    
    def content_preview(self, obj):
        return obj.content[:50] + "..." if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Content'
