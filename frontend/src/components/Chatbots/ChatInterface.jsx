import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Box, TextField, Button, Paper, Typography, IconButton, Avatar, CircularProgress, Chip, Collapse } from '@mui/material';
import { ArrowBack, Send, SmartToy, Person, ExpandMore } from '@mui/icons-material';
import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

function ChatInterface() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [chatbot, setChatbot] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [expandedContext, setExpandedContext] = useState({});
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadChatbot();
    // Start with a welcome message
    setMessages([
      {
        role: 'assistant',
        content: 'Hello! I\'m your AI assistant. I can answer questions based on the documents uploaded to this chatbot. What would you like to know?',
        id: 'welcome'
      }
    ]);
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadChatbot = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API_URL}/chatbots/${id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChatbot(response.data);
    } catch (error) {
      console.error('Failed to load chatbot', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      role: 'user',
      content: input,
      id: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const token = localStorage.getItem('access_token');

      const response = await axios.post(
        `${API_URL}/chat/${id}/`,
        {
          message: input,
          conversation_id: conversationId
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
      );

      // Save conversation ID for future messages
      if (!conversationId && response.data.conversation_id) {
        setConversationId(response.data.conversation_id);
      }

      // Add AI response
      const aiMessage = {
        role: 'assistant',
        content: response.data.ai_response.content,
        id: response.data.ai_response.id,
        tokens_used: response.data.ai_response.tokens_used,
        context: response.data.context || []
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Chat error:', error);

      // Add error message
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please make sure documents have been uploaded and processed, or try again later.',
        id: 'error-' + Date.now(),
        isError: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleContext = (messageId) => {
    setExpandedContext(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  if (!chatbot) return <CircularProgress />;

  return (
    <Container maxWidth="md" sx={{ height: '100vh', display: 'flex', flexDirection: 'column', py: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={() => navigate(`/chatbot/${id}`)}>
          <ArrowBack />
        </IconButton>
        <Box sx={{ textAlign: 'center', flex: 1 }}>
          <Typography variant="h6">{chatbot.name}</Typography>
          <Typography variant="caption" color="text.secondary">
            AI-Powered by RAG
          </Typography>
        </Box>
        <Box sx={{ width: 40 }} />
      </Box>

      {/* Messages Area */}
      <Paper sx={{ flex: 1, overflow: 'auto', p: 2, mb: 2, bgcolor: '#f5f5f5' }}>
        {messages.map((msg) => (
          <Box key={msg.id} sx={{ mb: 3 }}>
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                alignItems: 'flex-start'
              }}
            >
              {msg.role === 'assistant' && (
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <SmartToy />
                </Avatar>
              )}

              <Box sx={{ maxWidth: '70%' }}>
                <Paper
                  elevation={1}
                  sx={{
                    p: 2,
                    bgcolor: msg.role === 'user' ? 'primary.main' : 'white',
                    color: msg.role === 'user' ? 'white' : 'text.primary',
                    ...(msg.isError && { bgcolor: 'error.light' })
                  }}
                >
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {msg.content}
                  </Typography>

                  {/* Show tokens used */}
                  {msg.tokens_used && (
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.7 }}>
                      {msg.tokens_used} tokens used
                    </Typography>
                  )}
                </Paper>

                {/* Context Sources */}
                {msg.context && msg.context.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Button
                      size="small"
                      onClick={() => toggleContext(msg.id)}
                      endIcon={<ExpandMore />}
                    >
                      {expandedContext[msg.id] ? 'Hide' : 'Show'} Sources ({msg.context.length})
                    </Button>
                    <Collapse in={expandedContext[msg.id]}>
                      <Paper sx={{ p: 1.5, mt: 1, bgcolor: '#f9f9f9' }}>
                        {msg.context.map((source, idx) => (
                          <Box key={idx} sx={{ mb: 1 }}>
                            <Chip
                              label={source.document}
                              size="small"
                              sx={{ mr: 1 }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              Relevance: {(source.similarity * 100).toFixed(1)}%
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                              "{source.content_preview}"
                            </Typography>
                          </Box>
                        ))}
                      </Paper>
                    </Collapse>
                  </Box>
                )}
              </Box>

              {msg.role === 'user' && (
                <Avatar sx={{ bgcolor: 'secondary.main' }}>
                  <Person />
                </Avatar>
              )}
            </Box>
          </Box>
        ))}

        {loading && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <SmartToy />
            </Avatar>
            <Paper elevation={1} sx={{ p: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" sx={{ ml: 2, display: 'inline' }}>
                Thinking...
              </Typography>
            </Paper>
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Paper>

      {/* Input Area */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder="Ask me anything about the documents..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
        />
        <Button
          variant="contained"
          onClick={handleSend}
          disabled={loading || !input.trim()}
          sx={{ minWidth: 100 }}
        >
          {loading ? <CircularProgress size={24} /> : <Send />}
        </Button>
      </Box>

      {/* Info Box */}
      <Box sx={{ mt: 1, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          This chatbot uses RAG (Retrieval-Augmented Generation) to answer questions based on uploaded documents.
          {conversationId && ` • Conversation ID: ${conversationId}`}
        </Typography>
      </Box>
    </Container>
  );
}

export default ChatInterface;