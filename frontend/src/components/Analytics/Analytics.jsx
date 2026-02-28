import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { chatbotAPI, analyticsAPI } from '../../services/api';
import {
  Container, Grid, Card, CardContent, Typography, Box, Button,
  LinearProgress, Select, MenuItem, FormControl, Divider, CircularProgress,
} from '@mui/material';
import { SmartToy, Chat, ArrowBack, TrendingUp, QuestionAnswer } from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const DATE_RANGES = [
  { label: 'All', value: '' },
  { label: '7 Days', value: '7' },
  { label: '30 Days', value: '30' },
];

const ACCENT = '#B10000';

function StatCard({ title, value, subtitle, icon, color }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>{title}</Typography>
            <Typography variant="h3" fontWeight="bold" sx={{ mb: 0.5 }}>{value}</Typography>
            <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
          </Box>
          <Box sx={{ bgcolor: color, borderRadius: 2, p: 1.5, flexShrink: 0 }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

function Analytics() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [chatbots, setChatbots] = useState([]);
  const [selectedChatbot, setSelectedChatbot] = useState('');
  const [dateRange, setDateRange] = useState('');

  const [summary, setSummary] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [questions, setQuestions] = useState([]);

  const [overallStats, setOverallStats] = useState({ totalChatbots: 0, activeChatbots: 0 });
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);

  // Load chatbot list + overall stats on mount
  useEffect(() => {
    chatbotAPI.list().then(res => {
      const bots = res.data.results || res.data;
      setChatbots(bots);
      const active = bots.filter(b => b.is_active).length;
      setOverallStats({ totalChatbots: bots.length, activeChatbots: active });
      if (bots.length > 0) setSelectedChatbot(String(bots[0].id));
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const loadAnalytics = useCallback(async (chatbotId, days) => {
    if (!chatbotId) return;
    setChartLoading(true);
    try {
      const [summaryRes, chartRes, questionsRes] = await Promise.all([
        analyticsAPI.summary(chatbotId, days),
        analyticsAPI.messagesPerDay(chatbotId, days),
        analyticsAPI.frequentQuestions(chatbotId, days),
      ]);
      setSummary(summaryRes.data);
      setChartData(chartRes.data);
      setQuestions(questionsRes.data);
    } catch (err) {
      console.error('Failed to load analytics', err);
    } finally {
      setChartLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedChatbot) loadAnalytics(selectedChatbot, dateRange);
  }, [selectedChatbot, dateRange, loadAnalytics]);

  const totalMessages = summary?.total_messages ?? 0;
  const totalConversations = summary?.total_conversations ?? 0;

  if (loading) return <Container><LinearProgress sx={{ mt: 4 }} /></Container>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" fontWeight="bold">Analytics</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {/* Date range filter */}
          <FormControl size="small">
            <Select
              value={dateRange}
              onChange={e => setDateRange(e.target.value)}
              displayEmpty
              sx={{ minWidth: 100 }}
            >
              {DATE_RANGES.map(r => (
                <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Chatbot selector */}
          <FormControl size="small">
            <Select
              value={selectedChatbot}
              onChange={e => setSelectedChatbot(e.target.value)}
              displayEmpty
              sx={{ minWidth: 160 }}
            >
              {chatbots.map(bot => (
                <MenuItem key={bot.id} value={String(bot.id)}>{bot.name}</MenuItem>
              ))}
              {chatbots.length === 0 && (
                <MenuItem value="" disabled>No chatbots</MenuItem>
              )}
            </Select>
          </FormControl>

          <Button startIcon={<ArrowBack />} onClick={() => navigate('/dashboard')}>Back</Button>
        </Box>
      </Box>

      {/* Summary cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Messages"
            value={totalMessages}
            subtitle={dateRange ? `Last ${dateRange} days` : 'All time'}
            icon={<Chat sx={{ color: 'white', fontSize: 28 }} />}
            color={ACCENT}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Conversations"
            value={totalConversations}
            subtitle="For this chatbot"
            icon={<QuestionAnswer sx={{ color: 'white', fontSize: 28 }} />}
            color="primary.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Chatbots"
            value={overallStats.activeChatbots}
            subtitle={`of ${overallStats.totalChatbots} total`}
            icon={<SmartToy sx={{ color: 'white', fontSize: 28 }} />}
            color="success.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Plan"
            value={user?.plan?.toUpperCase() ?? '—'}
            subtitle={`${user?.max_chatbots - overallStats.totalChatbots} chatbot slots left`}
            icon={<TrendingUp sx={{ color: 'white', fontSize: 28 }} />}
            color="info.main"
          />
        </Grid>
      </Grid>

      {/* Messages per day chart */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>Messages Per Day</Typography>
          {chartLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : chartData.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography color="text.secondary">No data for this period</Typography>
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={d => {
                    const dt = new Date(d);
                    return `${dt.toLocaleString('default', { month: 'short' })} ${dt.getDate()}`;
                  }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  formatter={(val) => [val, 'Messages']}
                  labelFormatter={d => new Date(d).toLocaleDateString()}
                />
                <Bar dataKey="count" fill={ACCENT} radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Frequent questions */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>Top 10 Frequent Questions</Typography>
          {chartLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : questions.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No questions yet</Typography>
            </Box>
          ) : (
            <Box>
              {questions.map((q, i) => (
                <React.Fragment key={i}>
                  <Box sx={{ display: 'flex', alignItems: 'center', py: 1.5, gap: 2 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        width: 24, height: 24, borderRadius: '50%',
                        bgcolor: i === 0 ? ACCENT : 'action.selected',
                        color: i === 0 ? 'white' : 'text.primary',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 'bold', flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </Typography>
                    <Typography variant="body2" sx={{ flex: 1, wordBreak: 'break-word' }}>
                      {q.question}
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      sx={{ color: ACCENT, flexShrink: 0 }}
                    >
                      ×{q.count}
                    </Typography>
                  </Box>
                  {i < questions.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}

export default Analytics;
