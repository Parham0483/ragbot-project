from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import RegexValidator

class User(AbstractUser):
    email = models.EmailField(unique=True, error_messages={'unique': 'A user with this email already exists.'})
    organization = models.CharField(max_length=200, blank=True, help_text="Company or organization name")
    phone_regex = RegexValidator(regex=r'^\+?1?\d{9,15}$', message="Phone must be: '+999999999'. Up to 15 digits.")
    phone = models.CharField(validators=[phone_regex], max_length=17, blank=True)
    openai_api_key = models.CharField(max_length=500, blank=True, null=True, help_text="Optional: User's OpenAI API key")
    
    PLAN_CHOICES = [('free', 'Free'), ('pro', 'Pro'), ('enterprise', 'Enterprise')]
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default='free')
    max_chatbots = models.IntegerField(default=3)
    max_documents_per_chatbot = models.IntegerField(default=10)
    max_queries_per_month = models.IntegerField(default=100)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']
    
    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.email} ({self.get_full_name()})"
    
    def get_full_name(self):
        full_name = f"{self.first_name} {self.last_name}"
        return full_name.strip() or self.username
    
    @property
    def chatbot_count(self):
        return self.chatbot_set.count() if hasattr(self, 'chatbot_set') else 0
    
    @property
    def can_create_chatbot(self):
        return self.chatbot_count < self.max_chatbots
    
    def save(self, *args, **kwargs):
        self.email = self.email.lower()
        super().save(*args, **kwargs)
