import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CircularProgress } from '@mui/material';
import { chatbotAPI } from '../../services/api';
import { MODELS, findModel } from '../../constants/models';
import styles from './AIModelsConfig.module.css';

// static widget preview
function WidgetPreview({ name }) {
  return (
    <div className={styles.previewWidget}>
      <div className={styles.previewHeader}>
        <div className={styles.previewAvatar} />
        <span className={styles.previewName}>{name || 'Agent'}</span>
      </div>
      <div className={styles.previewBody}>
        <div className={styles.previewBubbleBot}>What can i help you with?</div>
        <div className={styles.previewBubbleUser}>I want to learn Front - End, where should i start?</div>
        <div className={styles.previewBubbleBot}>You can start with HTML, CSS, JS course</div>
      </div>
      <div className={styles.previewInput}>
        <span className={styles.previewPlaceholder}>Message...</span>
      </div>
    </div>
  );
}

export default function AIModelsConfig() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [chatbot, setChatbot] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    chatbotAPI.get(id).then(r => {
      setChatbot(r.data);
      setSystemPrompt(r.data.system_prompt || '');
      setSelectedModel(findModel(r.data.ai_model));
    }).catch(console.error);
  }, [id]);

  const confirm = async () => {
    setSaving(true);
    try {
      await chatbotAPI.patch(id, {
        system_prompt: systemPrompt,
        ai_model: selectedModel.id,
        ai_provider: selectedModel.provider,
      });
      setSaved(true);
      setTimeout(() => navigate(`/chatbot/${id}/playground`), 1200);
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  };

  if (!chatbot) return (
    <div className={styles.loading}><CircularProgress size={32} /></div>
  );

  return (
    <div className={styles.layout}>
      {/* left */}
      <div className={styles.formPanel}>
        <h2 className={styles.title}>AI Models</h2>
        <p className={styles.subtitle}>Choose your AI model then test it in the Playground</p>

        {/* Model cards */}
        <div className={styles.modelGrid}>
          {MODELS.map(m => (
            <div
              key={m.id}
              className={`${styles.modelCard} ${selectedModel?.id === m.id ? styles.modelCardActive : ''}`}
              onClick={() => setSelectedModel(m)}
            >
              <div className={styles.modelCardBadge} style={{ background: m.color }}>
                <img src={m.logo} alt={m.provider} className={styles.modelCardLogo} />
              </div>
              <span className={styles.modelCardLabel}>{m.label}</span>
            </div>
          ))}
        </div>

        {/* System prompt */}
        <div className={styles.field}>
          <label className={styles.fieldLabel}>System Instructions</label>
          <textarea
            className={styles.textarea}
            value={systemPrompt}
            onChange={e => setSystemPrompt(e.target.value)}
            rows={7}
          />
          <p className={styles.hint}>Describe how your agent should behave</p>
        </div>

        <button className={styles.confirmBtn} onClick={confirm} disabled={saving || saved}>
          {saving
            ? <CircularProgress size={16} sx={{ color: '#fff' }} />
            : saved
              ? 'Saved — opening Playground…'
              : 'Confirm & Test in Playground'}
        </button>
      </div>

      {/* right - preview */}
      <div className={styles.previewPanel}>
        <WidgetPreview name={chatbot.name} />
      </div>
    </div>
  );
}
