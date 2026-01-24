import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { chatbotAPI } from '../../services/api';
import { Container, Grid, Card, CardContent, Typography, Button, Box, IconButton } from '@mui/material';
import { Add, Delete, Chat } from '@mui/icons-material';

function Dashboard() {
  const [chatbots, setChatbots] = useState([]);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadChatbots();
  }, []);

  const loadChatbots = async () => {
    try {
      const response = await chatbotAPI.list();
      const data = response.data.results || response.data;
      setChatbots(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load chatbots', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this chatbot?')) {
      try {
        await chatbotAPI.delete(id);
        loadChatbots();
      } catch (error) {
        console.error('Failed to delete', error);
      }
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
        <Box>
          <Typography variant="h4">My Chatbots</Typography>
          <Typography color="text.secondary">
            {user?.email} | {chatbots.length}/{user?.max_chatbots} chatbots
          </Typography>
        </Box>
        <Box>
          <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/create-chatbot')} sx={{ mr: 2 }}>
            Create Chatbot
          </Button>
          <Button variant="outlined" onClick={logout}>Logout</Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {chatbots.map((bot) => (
          <Grid item xs={12} md={6} lg={4} key={bot.id}>
            <Card>
              <CardContent>
                <Typography variant="h6">{bot.name}</Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>{bot.description}</Typography>
                <Typography variant="body2">
                  Documents: {bot.document_count} | Conversations: {bot.conversation_count}
                </Typography>
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button size="small" startIcon={<Chat />} onClick={() => navigate(`/chatbot/${bot.id}`)}>
                    Open
                  </Button>
                  <IconButton size="small" color="error" onClick={() => handleDelete(bot.id)}>
                    <Delete />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {chatbots.length === 0 && (
        <Box sx={{ textAlign: 'center', mt: 8 }}>
          <Typography variant="h6" color="text.secondary">No chatbots yet</Typography>
          <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/create-chatbot')} sx={{ mt: 2 }}>
            Create Your First Chatbot
          </Button>
        </Box>
      )}
    </Container>
  );
}

export default Dashboard;
