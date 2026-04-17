from django.urls import path
from . import views

app_name = 'analytics'

urlpatterns = [
    # per-chatbot
    path('<int:chatbot_id>/messages-per-day/', views.messages_per_day, name='messages-per-day'),
    path('<int:chatbot_id>/frequent-questions/', views.frequent_questions, name='frequent-questions'),
    path('<int:chatbot_id>/summary/', views.chatbot_summary, name='summary'),
    # all chatbots aggregate
    path('overview/messages-per-day/', views.overview_messages_per_day, name='overview-messages-per-day'),
    path('overview/frequent-questions/', views.overview_frequent_questions, name='overview-frequent-questions'),
    path('overview/summary/', views.overview_summary, name='overview-summary'),
    path('overview/per-bot/', views.overview_per_bot, name='overview-per-bot'),
]
