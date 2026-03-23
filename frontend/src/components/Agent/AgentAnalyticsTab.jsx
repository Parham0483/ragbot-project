import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CircularProgress } from '@mui/material';
import { CalendarMonth } from '@mui/icons-material';
import { analyticsAPI } from '../../services/api';
import styles from './AgentAnalyticsTab.module.css';

export default function AgentAnalyticsTab() {
  const { id } = useParams();
  const [summary, setSummary] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const PAGE_SIZE = 4;

  useEffect(() => {
    const load = async () => {
      try {
        const [sumRes, qRes] = await Promise.all([
          analyticsAPI.summary(id),
          analyticsAPI.frequentQuestions(id),
        ]);
        setSummary(sumRes.data);
        setQuestions(Array.isArray(qRes.data) ? qRes.data : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return (
    <div className={styles.loading}><CircularProgress size={32} /></div>
  );

  const totalPages = Math.ceil(questions.length / PAGE_SIZE);
  const pageItems = questions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // date range label (last 30 days)
  const now = new Date();
  const past = new Date(now);
  past.setDate(past.getDate() - 30);
  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const dateRange = `${fmt(past)} - ${fmt(now)}`;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>Agent Analytics</h2>
        <div className={styles.dateRange}>
          <CalendarMonth sx={{ fontSize: 18, color: '#666' }} />
          <span>{dateRange}</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className={styles.statRow}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Chats</span>
          <span className={styles.statValue}>{summary?.total_messages ?? 0}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Useful Chats</span>
          <span className={styles.statValue}>{summary?.helpful_count ?? 0}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Avg Response Time</span>
          <span className={styles.statValue}>
            {summary?.avg_response_time_ms != null
              ? `${(summary.avg_response_time_ms / 1000).toFixed(1)}s`
              : '—'}
          </span>
        </div>
      </div>

      {/* Frequent questions */}
      <h3 className={styles.sectionTitle}>Chats</h3>
      <div className={styles.questionList}>
        {pageItems.length === 0 && (
          <p className={styles.empty}>No conversations yet</p>
        )}
        {pageItems.map((q, i) => (
          <div key={i} className={styles.questionItem}>
            {q.question}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button className={styles.pageBtn} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            ‹
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              className={`${styles.pageBtn} ${page === p ? styles.pageBtnActive : ''}`}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          ))}
          {totalPages > 5 && <span className={styles.pageDots}>…</span>}
          {totalPages > 5 && (
            <button
              className={`${styles.pageBtn} ${page === totalPages ? styles.pageBtnActive : ''}`}
              onClick={() => setPage(totalPages)}
            >
              {totalPages}
            </button>
          )}
          <button className={styles.pageBtn} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            ›
          </button>
        </div>
      )}
    </div>
  );
}
