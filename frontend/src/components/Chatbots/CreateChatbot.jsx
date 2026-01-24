import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatbotAPI } from '../../services/api';
import { Container, Box, TextField, Button, Typography, Alert, Slider } from '@mui/material';

function CreateChatbot() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    system_prompt: 'You are a helpful AI assistant. Answer questions based on the provided context.',
    temperature: 0.7,
    max_tokens: 500
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await chatbotAPI.create(formData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create chatbot');
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>Create New Chatbot</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            margin="normal"
            label="Chatbot Name"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Description"
            name="description"
            multiline
            rows={2}
            value={formData.description}
            onChange={handleChange}
          />
          <TextField
            fullWidth
            margin="normal"
            label="System Prompt"
            name="system_prompt"
            multiline
            rows={4}
            value={formData.system_prompt}
            onChange={handleChange}
          />
          <Box sx={{ mt: 3 }}>
            <Typography gutterBottom>Temperature: {formData.temperature}</Typography>
            <Slider
              value={formData.temperature}
              onChange={(e, val) => setFormData({ ...formData, temperature: val })}
              min={0}
              max={1}
              step={0.1}
            />
          </Box>
          <TextField
            fullWidth
            margin="normal"
            label="Max Tokens"
            name="max_tokens"
            type="number"
            value={formData.max_tokens}
            onChange={handleChange}
          />
          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button type="submit" variant="contained" fullWidth>Create Chatbot</Button>
            <Button variant="outlined" onClick={() => navigate('/dashboard')} fullWidth>Cancel</Button>
          </Box>
        </Box>
      </Box>
    </Container>
  );
}

export default CreateChatbot;
