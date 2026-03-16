import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CircularProgress } from '@mui/material';
import { chatbotAPI } from '../../services/api';
import styles from './GeneralConfig.module.css';

export default function GeneralConfig() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [chatbot, setChatbot] = useState(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    chatbotAPI.get(id).then(r => {
      setChatbot(r.data);
      setName(r.data.name);
    }).catch(console.error);
  }, [id]);

  const saveName = async () => {
    if (!name.trim() || name === chatbot.name) return;
    setSaving(true);
    try {
      await chatbotAPI.patch(id, { name: name.trim() });
      setChatbot(prev => ({ ...prev, name: name.trim() }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const deleteAgent = async () => {
    if (!window.confirm(`Delete "${chatbot.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await chatbotAPI.delete(id);
      navigate('/dashboard');
    } catch (e) {
      console.error(e);
      setDeleting(false);
    }
  };

  if (!chatbot) return (
    <div className={styles.loading}><CircularProgress size={32} /></div>
  );

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>General Setting</h2>

      {/* Agent ID */}
      <div className={styles.row}>
        <span className={styles.label}>Agent ID</span>
        <span className={styles.idValue}>{chatbot.id}</span>
      </div>

      {/* Name */}
      <div className={styles.row}>
        <span className={styles.label}>Name</span>
        <div className={styles.nameField}>
          <input
            className={styles.input}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveName()}
          />
          <button className={styles.saveBtn} onClick={saveName} disabled={saving || name === chatbot.name || !name.trim()}>
            {saving ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : saved ? 'Saved ✓' : 'Save'}
          </button>
        </div>
      </div>

      {/* Delete all conversations */}
      <div className={styles.dangerCard}>
        <div className={styles.dangerHeader}>Delete all conversations</div>
        <p className={styles.dangerText}>
          Once you delete all your conversations, they cannot be recovered.<br />
          Please make sure you're certain before proceeding.
        </p>
        <div className={styles.dangerFooter}>
          <button className={styles.dangerBtn} disabled title="Coming soon">Delete</button>
        </div>
      </div>

      {/* Delete agent */}
      <div className={styles.dangerCard}>
        <div className={styles.dangerHeader}>Delete this agent</div>
        <p className={styles.dangerText}>
          Once you delete your agent, it cannot be undone.<br />
          Please be sure before proceeding.
        </p>
        <div className={styles.dangerFooter}>
          <button className={styles.dangerBtn} onClick={deleteAgent} disabled={deleting}>
            {deleting ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
