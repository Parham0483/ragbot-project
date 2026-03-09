import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { chatbotAPI, documentAPI } from '../../services/api';
import { Container, Box, Typography, Button, Card, CardContent, Grid, TextField, LinearProgress, IconButton, Chip } from '@mui/material';
import { ArrowBack, Upload, Delete, Description, Chat } from '@mui/icons-material';

function ChatbotDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [chatbot, setChatbot] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null); // "X / Y"

  useEffect(() => {
    loadChatbot();
    loadDocuments();
  }, [id]);

  const loadChatbot = async () => {
    try {
      const response = await chatbotAPI.get(id);
      setChatbot(response.data);
    } catch (error) {
      console.error('Failed to load chatbot', error);
    }
  };

  const loadDocuments = async () => {
    try {
      const response = await documentAPI.list();
      const allDocs = response.data.results || response.data;
      setDocuments(allDocs.filter(doc => doc.chatbot === parseInt(id)));
    } catch (error) {
      console.error('Failed to load documents', error);
    }
  };

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleUpload = async () => {
    if (!files.length) return;

    setUploading(true);
    const failed = [];

    for (let i = 0; i < files.length; i++) {
      setUploadProgress(`${i + 1} / ${files.length}`);
      const formData = new FormData();
      formData.append('file', files[i]);
      formData.append('chatbot', id);
      try {
        await documentAPI.upload(formData);
      } catch (error) {
        console.error('Upload failed for', files[i].name, error);
        failed.push(files[i].name);
      }
    }

    setFiles([]);
    setUploadProgress(null);
    setUploading(false);
    loadDocuments();
    loadChatbot();

    if (failed.length) {
      alert(`Failed to upload: ${failed.join(', ')}\nCheck file types (PDF, TXT, DOCX, MD only)`);
    }
  };

  const handleDelete = async (docId) => {
    if (window.confirm('Delete this document?')) {
      try {
        await documentAPI.delete(docId);
        loadDocuments();
        loadChatbot();
      } catch (error) {
        console.error('Delete failed', error);
      }
    }
  };

  if (!chatbot) return <div>Loading...</div>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/dashboard')} sx={{ mb: 2 }}>
        Back to Dashboard
      </Button>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <Box>
              <Typography variant="h4">{chatbot.name}</Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>{chatbot.description}</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Chip label={`${documents.length} documents`} />
                <Chip label={`${chatbot.conversation_count} conversations`} />
                <Chip label={chatbot.is_active ? 'Active' : 'Inactive'} color={chatbot.is_active ? 'success' : 'default'} />
              </Box>
            </Box>
            <Button variant="contained" startIcon={<Chat />} onClick={() => navigate(`/chat/${id}`)}>
              Test Chat
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Upload Documents</Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              type="file"
              onChange={handleFileChange}
              inputProps={{ accept: '.pdf,.txt,.docx,.md', multiple: true }}
              fullWidth
            />
            <Button
              variant="contained"
              startIcon={<Upload />}
              onClick={handleUpload}
              disabled={!files.length || uploading}
            >
              {uploading ? uploadProgress : 'Upload'}
            </Button>
          </Box>
          {uploading && <LinearProgress sx={{ mt: 2 }} />}
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Supported: PDF, TXT, DOCX, MD (max 10MB) — select up to 10 files at once
          </Typography>
        </CardContent>
      </Card>

      <Typography variant="h6" gutterBottom>Documents</Typography>
      <Grid container spacing={2}>
        {documents.map((doc) => (
          <Grid item xs={12} md={6} key={doc.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'start' }}>
                    <Description />
                    <Box>
                      <Typography variant="subtitle1">{doc.file_name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {doc.file_type.toUpperCase()} • {(doc.file_size / 1024).toFixed(1)} KB
                      </Typography>
                      <br />
                      <Chip label={doc.status} size="small" sx={{ mt: 1 }} />
                    </Box>
                  </Box>
                  <IconButton size="small" color="error" onClick={() => handleDelete(doc.id)}>
                    <Delete />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {documents.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary">No documents uploaded yet</Typography>
        </Box>
      )}
    </Container>
  );
}

export default ChatbotDetail;
