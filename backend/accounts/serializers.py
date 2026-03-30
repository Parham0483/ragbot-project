import hashlib

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework.validators import UniqueValidator

User = get_user_model()

class UserRegistrationSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True, validators=[UniqueValidator(queryset=User.objects.all())])
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 'organization', 'phone', 'password', 'password_confirm']
        extra_kwargs = {'first_name': {'required': True}, 'last_name': {'required': True}}
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords didn't match."})
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        return User.objects.create_user(**validated_data)

def _mask_key(key):
    # show first 6 and last 4 chars, hide the rest
    if not key or len(key) < 12:
        return None
    return key[:6] + '••••••••' + key[-4:]


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    can_create_chatbot = serializers.BooleanField(read_only=True)
    gravatar_url = serializers.SerializerMethodField()
    api_keys = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 'full_name', 'organization',
                  'phone', 'plan', 'max_chatbots', 'chatbot_count', 'can_create_chatbot', 'created_at',
                  'gravatar_url', 'is_email_verified', 'api_keys']
        read_only_fields = ['id', 'email', 'plan', 'created_at', 'gravatar_url', 'is_email_verified']

    def get_gravatar_url(self, obj):
        email_hash = hashlib.md5(obj.email.lower().encode()).hexdigest()
        return f"https://www.gravatar.com/avatar/{email_hash}?d=identicon&s=80"

    def get_api_keys(self, obj):
        # returns has/masked for each provider — never the real key
        return {
            'openai':    {'has_key': bool(obj.openai_api_key),    'masked': _mask_key(obj.openai_api_key)},
            'anthropic': {'has_key': bool(obj.anthropic_api_key), 'masked': _mask_key(obj.anthropic_api_key)},
            'google':    {'has_key': bool(obj.google_api_key),    'masked': _mask_key(obj.google_api_key)},
            'xai':       {'has_key': bool(obj.xai_api_key),       'masked': _mask_key(obj.xai_api_key)},
        }


class UserUpdateSerializer(serializers.ModelSerializer):
    # email is optional on update — validated for uniqueness against other users
    email = serializers.EmailField(required=False)

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'organization', 'phone', 'email',
                  'openai_api_key', 'anthropic_api_key', 'google_api_key', 'xai_api_key']

    def validate_email(self, value):
        value = value.lower()
        qs = User.objects.filter(email=value).exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value
