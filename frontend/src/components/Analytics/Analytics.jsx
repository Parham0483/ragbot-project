import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { chatbotAPI, analyticsAPI } from '../../services/api';
import {
  Box, Card, CardContent, Typography, LinearProgress, Select,
  MenuItem, FormControl, CircularProgress, Grid,
} from '@mui/material';
import { CalendarToday } from '@mui/icons-material';
import css from './Analytics.module.css';
import {
  BarChart, Bar, XAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList, Cell,
} from 'recharts';

const ACCENT = '#B10000';
const DARK   = '#1A1A1A';

const DATE_RANGES = [
  { label: 'All',     value: '' },
  { label: '7 Days',  value: '7' },
  { label: '30 Days', value: '30' },
];

const SELECT_SX = {
  bgcolor: '#fff', border: '1px solid #E0E0E0', borderRadius: 1,
  fontSize: 14,
  '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
};

function CircularStatCard({ value, max, label }) {
  const unlimited = max === null || max === undefined || max === 0;
  const pct = unlimited ? 100 : Math.min((value / max) * 100, 100);

  return (
    <Card sx={{ border: '1px solid #E0E0E0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', bgcolor: '#fff' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3, py: '20px !important' }}>
        <Box sx={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
          <CircularProgress variant="determinate" value={100} size={72} thickness={5}
            sx={{ color: '#E0E0E0', position: 'absolute', top: 0, left: 0 }} />
          <CircularProgress variant="determinate" value={pct} size={72} thickness={5}
            sx={{ color: DARK }} />
        </Box>
        <Box>
          {unlimited ? (
            <Typography variant="h5" fontWeight="bold" sx={{ color: DARK, lineHeight: 1.2 }}>Unlimited</Typography>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
              <Typography variant="h4" fontWeight="bold" sx={{ color: DARK, lineHeight: 1 }}>{value}</Typography>
              <Typography variant="body1" sx={{ color: '#666' }}>/ {max}</Typography>
            </Box>
          )}
          <Typography variant="body2" sx={{ color: '#666', mt: 0.5 }}>{label}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

function BarTopLabel({ x, y, width, value }) {
  if (!value) return null;
  return (
    <text x={x + width / 2} y={y - 5} textAnchor="middle" fontSize={10} fill={DARK}>{value}</text>
  );
}

function Analytics() {
  const { user } = useAuth();

  const [chatbots, setChatbots]               = useState([]);
  const [selectedChatbot, setSelectedChatbot] = useState('all'); // 'all' or chatbot id string
  const [dateRange, setDateRange]             = useState('');

  const [summary, setSummary]           = useState(null);
  const [chartData, setChartData]       = useState([]);
  const [questions, setQuestions]       = useState([]);
  const [overallStats, setOverallStats] = useState({ total: 0, active: 0 });
  const [loading, setLoading]           = useState(true);
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    chatbotAPI.list().then(res => {
      const bots = res.data.results || res.data;
      setChatbots(bots);
      setOverallStats({ total: bots.length, active: bots.filter(b => b.is_active).length });
      // stay on 'all' by default — don't auto-select first bot
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const loadAnalytics = useCallback(async (chatbotId, days) => {
    setChartLoading(true);
    try {
      const isAll = chatbotId === 'all';
      const [sumRes, chartRes, qRes] = await Promise.all([
        isAll ? analyticsAPI.overviewSummary(days)            : analyticsAPI.summary(chatbotId, days),
        isAll ? analyticsAPI.overviewMessagesPerDay(days)     : analyticsAPI.messagesPerDay(chatbotId, days),
        isAll ? analyticsAPI.overviewFrequentQuestions(days)  : analyticsAPI.frequentQuestions(chatbotId, days),
      ]);
      setSummary(sumRes.data);
      setChartData(chartRes.data);
      setQuestions(qRes.data);
    } catch (err) {
      console.error('analytics load failed', err);
    } finally {
      setChartLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics(selectedChatbot, dateRange);
  }, [selectedChatbot, dateRange, loadAnalytics]);

  const totalMessages = summary?.total_messages ?? 0;
  const creditsMax    = user?.max_queries_per_month ?? null;

  const now          = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const fmt          = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const dateLabel    = dateRange ? `Last ${dateRange} days` : `${fmt(startOfMonth)} - ${fmt(now)}`;

  const maxCount = chartData.length ? Math.max(...chartData.map(d => d.count)) : 0;

  if (loading) return <LinearProgress sx={{ mt: 4 }} />;

  return (
    <Box>

      {/* ── Header ── */}
      <div className={css.header}>
        <h1 className={css.title}>Analytics</h1>

        <div className={css.filters}>
          {/* Agent filter */}
          <FormControl size="small">
            <Select
              value={selectedChatbot}
              onChange={e => setSelectedChatbot(e.target.value)}
              sx={{ ...SELECT_SX, minWidth: 140 }}
            >
              <MenuItem value="all">All Agents</MenuItem>
              {chatbots.map(bot => (
                <MenuItem key={bot.id} value={String(bot.id)}>{bot.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Date range filter */}
          <FormControl size="small">
            <Select
              value={dateRange}
              onChange={e => setDateRange(e.target.value)}
              displayEmpty
              sx={{ ...SELECT_SX, minWidth: 90 }}
            >
              {DATE_RANGES.map(r => (
                <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Date pill */}
          <div className={css.datePill}>
            <CalendarToday sx={{ fontSize: 15, color: '#666' }} />
            <span>{dateLabel}</span>
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6}>
          <CircularStatCard value={totalMessages} max={creditsMax} label="Credits used" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CircularStatCard value={overallStats.active} max={overallStats.total} label="Agents" />
        </Grid>
      </Grid>

      {/* ── Bar chart ── */}
      <div className={css.chartCard}>
        {chartLoading ? (
          <div className={css.emptyChart}><CircularProgress size={28} sx={{ color: ACCENT }} /></div>
        ) : chartData.length === 0 ? (
          <div className={css.emptyChart}>No data for this period</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D0D0D0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#666' }}
                tickFormatter={d => {
                  const dt = new Date(d);
                  return `${dt.toLocaleString('default', { month: 'short' })} ${dt.getDate()}`;
                }}
                interval="preserveStartEnd"
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={val => [val, 'Messages']}
                labelFormatter={d => new Date(d).toLocaleDateString()}
                cursor={{ fill: 'rgba(0,0,0,0.04)' }}
              />
              <Bar dataKey="count" radius={[2, 2, 0, 0]} maxBarSize={28}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.count === maxCount && maxCount > 0 ? ACCENT : DARK} />
                ))}
                <LabelList dataKey="count" content={<BarTopLabel />} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Chats ── */}
      {questions.length > 0 && (
        <div className={css.chatsCard}>
          <div className={css.chatsTitle}>Chats</div>
          {questions.map((q, i) => (
            <div key={i} className={css.chatRow}>
              <span className={css.chatQuestion}>{q.question}</span>
              <span className={css.chatCount}>×{q.count}</span>
            </div>
          ))}
        </div>
      )}

    </Box>
  );
}

export default Analytics;
