import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatbotAPI } from '../../services/api';
import { Container, Box, TextField, Button, Typography, Alert, Slider, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

// each preset pre-fills the system prompt when selected
const TONE_PRESETS = [
  { label: 'Custom', prompt: '' },
  { label: 'General AI',        prompt: 'You are a helpful AI assistant. Answer questions based on the provided context.' },
  { label: 'Customer Support',  prompt: 'You are a friendly customer support agent. Help users solve problems politely and efficiently using the provided documentation.' },
  { label: 'Sales Agent',       prompt: 'You are a knowledgeable sales assistant. Help potential customers understand the product benefits and guide them toward a purchase decision using the provided context.' },
  { label: 'Technical Expert',  prompt: 'You are a technical expert. Provide precise, detailed answers using the provided documentation. Use technical language where appropriate.' },
  { label: 'Teacher',           prompt: 'You are a patient teacher. Explain concepts clearly and simply using the provided material. Break down complex ideas into easy steps.' },
  { label: 'Formal & Professional', prompt: 'You are a professional assistant. Respond in a formal, concise, and business-appropriate tone using the provided context.' },
  { label: 'Friendly & Casual', prompt: 'You are a warm and conversational assistant. Keep responses friendly, approachable, and easy to understand based on the provided context.' },
];

function CreateChatbot() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    system_prompt: 'You are a helpful AI assistant. Answer questions based on the provided context.',
    temperature: 0.7,
    max_tokens: 500
  });
  const [tone, setTone] = useState('General AI');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleToneChange = (e) => {
    const selected = TONE_PRESETS.find(p => p.label === e.target.value);
    setTone(selected.label);
    // only overwrite prompt if not Custom
    if (selected.prompt) setFormData(prev => ({ ...prev, system_prompt: selected.prompt }));
  };

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
          <FormControl fullWidth margin="normal">
            <InputLabel>Tone Preset</InputLabel>
            <Select value={tone} label="Tone Preset" onChange={handleToneChange}>
              {TONE_PRESETS.map(p => (
                <MenuItem key={p.label} value={p.label}>{p.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            margin="normal"
            label="System Prompt"
            name="system_prompt"
            multiline
            rows={4}
            value={formData.system_prompt}
            onChange={e => {
              setTone('Custom');
              handleChange(e);
            }}
            helperText="Select a tone preset above or write your own instructions"
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
