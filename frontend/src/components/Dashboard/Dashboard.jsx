import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatbotAPI } from '../../services/api';
import styles from './Dashboard.module.css';

function timeAgo(dateStr) {
  if (!dateStr) return 'never';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  const days = Math.floor(diff / 86400);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

function AgentCard({ bot, onClick }) {
  return (
    <div className={styles.agentCard} onClick={onClick}>
      <div className={styles.cardPattern}>
        <span className={styles.cardName}>{bot.name}</span>
      </div>
      <div className={styles.cardFooter}>
        <span className={styles.cardMeta}>last trained&nbsp;&nbsp;{timeAgo(bot.updated_at)}</span>
      </div>
    </div>
  );
}

function Dashboard() {
  const [chatbots, setChatbots] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    chatbotAPI.list()
      .then(res => {
        const data = res.data.results || res.data;
        setChatbots(Array.isArray(data) ? data : []);
      })
      .catch(console.error);
  }, []);

  return (
    <div>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>AI Agents</h1>
        <button className={styles.createBtn} onClick={() => navigate('/create-chatbot')}>
          Create new
        </button>
      </div>

      {/* Agent grid */}
      {chatbots.length > 0 ? (
        <div className={styles.grid}>
          {chatbots.map(bot => (
            <AgentCard key={bot.id} bot={bot} onClick={() => navigate(`/chatbot/${bot.id}`)} />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>Create your first Agent now</p>
          <button className={styles.emptyBtn} onClick={() => navigate('/create-chatbot')}>
            Create
          </button>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
