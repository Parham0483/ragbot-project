from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls', namespace='accounts')),
    path('api/', include('chatbots.urls', namespace='chatbots')),
    path('api/', include('documents.urls', namespace='documents')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

admin.site.site_header = "RAGBot Administration"
admin.site.site_title = "RAGBot Admin"
