import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { chatbotAPI, documentAPI } from '../../services/api';
import { Container, Grid, Card, CardContent, Typography, Box, Button, LinearProgress } from '@mui/material';
import { SmartToy, Description, Chat, TrendingUp, ArrowBack } from '@mui/icons-material';

function Analytics() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalChatbots: 0,
    activeChatbots: 0,
    totalDocuments: 0,
    totalConversations: 0,
    storageUsed: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [chatbotsRes, documentsRes] = await Promise.all([
        chatbotAPI.list(),
        documentAPI.list()
      ]);

      const chatbots = chatbotsRes.data.results || chatbotsRes.data;
      const documents = documentsRes.data.results || documentsRes.data;
// This component visualises chatbot usage metrics to support evaluation in IPD

      const activeBots = chatbots.filter(bot => bot.is_active).length;
      const totalConvos = chatbots.reduce((sum, bot) => sum + bot.conversation_count, 0);
      const storage = documents.reduce((sum, doc) => sum + doc.file_size, 0);

      setStats({
        totalChatbots: chatbots.length,
        activeChatbots: activeBots,
        totalDocuments: documents.length,
        totalConversations: totalConvos,
        storageUsed: storage
      });
    } catch (error) {
      console.error('Failed to load stats', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, subtitle, icon, color }) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <Box>
            <Typography color="text.secondary" gutterBottom>{title}</Typography>
            <Typography variant="h3" sx={{ mb: 1 }}>{value}</Typography>
            <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
          </Box>
          <Box sx={{ bgcolor: color, borderRadius: 2, p: 1.5 }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) return <Container><LinearProgress /></Container>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
        <Typography variant="h4">Analytics Dashboard</Typography>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/dashboard')}>
          Back
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6} lg={3}>
          <StatCard
            title="Total Chatbots"
            value={stats.totalChatbots}
            subtitle={`${user?.max_chatbots - stats.totalChatbots} remaining`}
            icon={<SmartToy sx={{ color: 'white', fontSize: 32 }} />}
            color="primary.main"
          />
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <StatCard
            title="Active Bots"
            value={stats.activeChatbots}
            subtitle={`${stats.totalChatbots - stats.activeChatbots} inactive`}
            icon={<TrendingUp sx={{ color: 'white', fontSize: 32 }} />}
            color="success.main"
          />
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <StatCard
            title="Documents"
            value={stats.totalDocuments}
            subtitle={`${(stats.storageUsed / 1024 / 1024).toFixed(2)} MB used`}
            icon={<Description sx={{ color: 'white', fontSize: 32 }} />}
            color="info.main"
          />
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <StatCard
            title="Conversations"
            value={stats.totalConversations}
            subtitle="Total chats"
            icon={<Chat sx={{ color: 'white', fontSize: 32 }} />}
            color="warning.main"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Plan Usage</Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Chatbots</Typography>
                  <Typography variant="body2">{stats.totalChatbots}/{user?.max_chatbots}</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(stats.totalChatbots / user?.max_chatbots) * 100}
                  sx={{ height: 8, borderRadius: 1 }}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Documents per Chatbot</Typography>
                  <Typography variant="body2">
                    {stats.totalChatbots > 0 ? Math.round(stats.totalDocuments / stats.totalChatbots) : 0}/
                    {user?.max_documents_per_chatbot}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={stats.totalChatbots > 0 ? (stats.totalDocuments / stats.totalChatbots / user?.max_documents_per_chatbot) * 100 : 0}
                  sx={{ height: 8, borderRadius: 1 }}
                  color="secondary"
                />
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  Current Plan: <strong>{user?.plan.toUpperCase()}</strong>
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Quick Stats</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Account Type</Typography>
                  <Typography variant="body2" fontWeight="bold">{user?.plan}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Storage Used</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {(stats.storageUsed / 1024 / 1024).toFixed(2)} MB
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Avg Docs per Bot</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {stats.totalChatbots > 0 ? (stats.totalDocuments / stats.totalChatbots).toFixed(1) : 0}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Avg Conversations</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {stats.totalChatbots > 0 ? (stats.totalConversations / stats.totalChatbots).toFixed(1) : 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>System Status</Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">API Status</Typography>
              <Typography variant="h6" color="success.main">Online</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">Database</Typography>
              <Typography variant="h6" color="success.main">Connected</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">Storage</Typography>
              <Typography variant="h6" color="success.main">Available</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">Uptime</Typography>
              <Typography variant="h6">99.9%</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Container>
  );
}

export default Analytics;
