import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { chatbotAPI } from '../../services/api';
import { Container, Box, TextField, Button, Paper, Typography, IconButton, Avatar, CircularProgress } from '@mui/material';
import { ArrowBack, Send, SmartToy, Person } from '@mui/icons-material';

function ChatInterface() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [chatbot, setChatbot] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadChatbot();
    setMessages([
      { role: 'assistant', content: 'Hello! I\'m your AI assistant. Ask me anything!' }
    ]);
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadChatbot = async () => {
    try {
      const response = await chatbotAPI.get(id);
      setChatbot(response.data);
    } catch (error) {
      console.error('Failed to load chatbot', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);

    setTimeout(() => {
      const responses = [
        "I'm a demo chatbot! RAG integration coming soon.",
        "That's an interesting question! Once RAG is integrated, I'll be able to answer based on your uploaded documents.",
        "I understand you're asking about that. My knowledge base will be connected soon!",
        "Great question! I'll have access to your documents soon to provide accurate answers.",
        "I'm currently in demo mode. Real AI responses with document retrieval will be available after RAG integration."
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      setMessages(prev => [...prev, { role: 'assistant', content: randomResponse }]);
      setLoading(false);
    }, 1000);
  };

  if (!chatbot) return <CircularProgress />;

  return (
    <Container maxWidth="md" sx={{ height: '100vh', display: 'flex', flexDirection: 'column', py: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={() => navigate(`/chatbot/${id}`)}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h6">{chatbot.name}</Typography>
        <Box sx={{ width: 40 }} />
      </Box>

      <Paper sx={{ flex: 1, overflow: 'auto', p: 2, mb: 2, bgcolor: '#f5f5f5' }}>
        {messages.map((msg, idx) => (
          <Box
            key={idx}
            sx={{
              display: 'flex',
              gap: 1,
              mb: 2,
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
            }}
          >
            {msg.role === 'assistant' && (
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                <SmartToy />
              </Avatar>
            )}
            <Paper
              sx={{
                p: 2,
                maxWidth: '70%',
                bgcolor: msg.role === 'user' ? 'primary.main' : 'white',
                color: msg.role === 'user' ? 'white' : 'text.primary'
              }}
            >
              <Typography>{msg.content}</Typography>
            </Paper>
            {msg.role === 'user' && (
              <Avatar sx={{ bgcolor: 'secondary.main' }}>
                <Person />
              </Avatar>
            )}
          </Box>
        ))}
        {loading && (
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <SmartToy />
            </Avatar>
            <Paper sx={{ p: 2 }}>
              <CircularProgress size={20} />
            </Paper>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Paper>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          disabled={loading}
        />
        <Button
          variant="contained"
          endIcon={<Send />}
          onClick={handleSend}
          disabled={loading || !input.trim()}
        >
          Send
        </Button>
      </Box>
    </Container>
  );
}

export default ChatInterface;
