from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone

from chatbots.models import Chatbot, Conversation, Message
from services.rag_service import rag_service


@api_view(['POST'])
@permission_classes([AllowAny])  # Allow anonymous users to chat
def chat_endpoint(request, chatbot_id):
    """
    Main chat endpoint - handles user messages and generates AI responses

    POST /api/chat/<chatbot_id>/
    Body: {
        "message": "What is RAG?",
        "conversation_id": 123  // optional
    }
    """
    try:
        # Get chatbot
        chatbot = get_object_or_404(Chatbot, id=chatbot_id, is_active=True)

        # Get user message
        user_message = request.data.get('message', '').strip()
        if not user_message:
            return Response(
                {'error': 'Message cannot be empty'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get or create conversation
        conversation_id = request.data.get('conversation_id')
        if conversation_id:
            conversation = get_object_or_404(
                Conversation,
                id=conversation_id,
                chatbot=chatbot
            )
        else:
            # Create new conversation
            conversation = Conversation.objects.create(
                chatbot=chatbot,
                user=request.user if request.user.is_authenticated else None,
                title=user_message[:50] + '...' if len(user_message) > 50 else user_message
            )

        # Save user message
        user_msg = Message.objects.create(
            conversation=conversation,
            role='user',
            content=user_message
        )

        # Get conversation history (last 5 messages for context)
        history = []
        previous_messages = conversation.messages.order_by('-created_at')[:5]
        for msg in reversed(list(previous_messages)):
            if msg.id != user_msg.id:  # Don't include the message we just created
                history.append({
                    'role': msg.role,
                    'content': msg.content
                })

        # Generate AI response using RAG
        rag_result = rag_service.generate_response(
            chatbot=chatbot,
            user_message=user_message,
            conversation_history=history
        )

        if not rag_result['success']:
            return Response(
                {'error': rag_result.get('error', 'Failed to generate response')},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Save AI response
        ai_msg = Message.objects.create(
            conversation=conversation,
            role='assistant',
            content=rag_result['response'],
            context_used=rag_result.get('chunks_used', []),
            tokens_used=rag_result.get('tokens_used', 0)
        )

        # Return response
        return Response({
            'conversation_id': conversation.id,
            'user_message': {
                'id': user_msg.id,
                'content': user_msg.content,
                'created_at': user_msg.created_at
            },
            'ai_response': {
                'id': ai_msg.id,
                'content': ai_msg.content,
                'created_at': ai_msg.created_at,
                'tokens_used': ai_msg.tokens_used
            },
            'context': rag_result.get('chunks_used', [])
        })

    except Chatbot.DoesNotExist:
        return Response(
            {'error': 'Chatbot not found or inactive'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def conversation_history(request, conversation_id):
    """
    Get all messages in a conversation

    GET /api/chat/conversation/<conversation_id>/
    """
    try:
        conversation = get_object_or_404(Conversation, id=conversation_id)

        # Check user has access
        if request.user != conversation.chatbot.owner and conversation.user != request.user:
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        messages = conversation.messages.order_by('created_at')

        return Response({
            'conversation_id': conversation.id,
            'title': conversation.title,
            'created_at': conversation.created_at,
            'messages': [
                {
                    'id': msg.id,
                    'role': msg.role,
                    'content': msg.content,
                    'created_at': msg.created_at,
                    'tokens_used': msg.tokens_used,
                    'context_used': msg.context_used
                }
                for msg in messages
            ]
        })

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_conversation(request, conversation_id):
    """
    Delete a conversation and all its messages

    DELETE /api/chat/conversation/<conversation_id>/
    """
    try:
        conversation = get_object_or_404(Conversation, id=conversation_id)

        # Check user has access
        if request.user != conversation.chatbot.owner:
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        conversation.delete()

        return Response(
            {'message': 'Conversation deleted'},
            status=status.HTTP_204_NO_CONTENT
        )

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )