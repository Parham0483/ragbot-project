from django.urls import path, include, re_path
from rest_framework.routers import DefaultRouter
from .views import DocumentViewSet, serve_document

router = DefaultRouter()
router.register(r'documents', DocumentViewSet, basename='document')

app_name = 'documents'

urlpatterns = [
    path('', include(router.urls)),
]

# Protected document download
protected_media_urlpatterns = [
    re_path(r'^media/documents/(?P<path>.+)$', serve_document, name='serve-document'),
]
