from django.urls import path
from . import views

app_name = 'analytics'

urlpatterns = [
    path('<int:chatbot_id>/messages-per-day/', views.messages_per_day, name='messages-per-day'),
    path('<int:chatbot_id>/frequent-questions/', views.frequent_questions, name='frequent-questions'),
    path('<int:chatbot_id>/summary/', views.chatbot_summary, name='summary'),
]
