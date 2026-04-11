import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatbotAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import BotAvatar from '../Common/BotAvatar';
import styles from './CreateChatbot.module.css';

const MAX_TOKENS_BY_PLAN = { free: 500, pro: 1000, enterprise: 4000 };

// each preset pre-fills the system prompt when selected
const TONE_PRESETS = [
  { label: 'General AI',        prompt: 'You are a helpful AI assistant. Answer questions based on the provided context.' },
  { label: 'Customer Support',  prompt: 'You are a friendly customer support agent. Help users solve problems politely and efficiently using the provided documentation.' },
  { label: 'Sales Agent',       prompt: 'You are a knowledgeable sales assistant. Help potential customers understand the product benefits and guide them toward a purchase decision using the provided context.' },
  { label: 'Technical Expert',  prompt: 'You are a technical expert. Provide precise, detailed answers using the provided documentation. Use technical language where appropriate.' },
  { label: 'Teacher',           prompt: 'You are a patient teacher. Explain concepts clearly and simply using the provided material. Break down complex ideas into easy steps.' },
  { label: 'Formal',            prompt: 'You are a professional assistant. Respond in a formal, concise, and business-appropriate tone using the provided context.' },
  { label: 'Casual',            prompt: 'You are a warm and conversational assistant. Keep responses friendly, approachable, and easy to understand based on the provided context.' },
];

export default function CreateChatbot() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const maxTokensLimit = MAX_TOKENS_BY_PLAN[user?.plan] ?? 500;
  const [name, setName]               = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState(TONE_PRESETS[0].prompt);
  const [activeTone, setActiveTone]   = useState('General AI');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens]     = useState(500);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState('');
  const [avatarFile, setAvatarFile]   = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const avatarInputRef = useRef(null);

  const handleAvatarPick = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  // pick a tone chip and fill in the prompt
  const pickTone = (preset) => {
    setActiveTone(preset.label);
    setSystemPrompt(preset.prompt);
  };

  // typing in the prompt clears the active tone chip
  const handlePromptChange = (e) => {
    setActiveTone('');
    setSystemPrompt(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await chatbotAPI.create({ name, description, system_prompt: systemPrompt, temperature, max_tokens: maxTokens });
      // upload avatar if one was selected
      if (avatarFile) {
        const form = new FormData();
        form.append('avatar', avatarFile);
        await chatbotAPI.uploadAvatar(res.data.id, form);
      }
      navigate('/dashboard');
    } catch (err) {
      const status = err.response?.status;
      if (status === 403) {
        setError(err.response?.data?.error || 'You have reached your plan limit. Upgrade to create more agents.');
      } else if (status === 429) {
        setError('Monthly message limit reached. Upgrade your plan to continue.');
      } else {
        setError(err.response?.data?.name?.[0] || err.response?.data?.error || 'Failed to create agent.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>

        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Create New Agent</h1>
          <p className={styles.pageSub}>Set up your AI agent — you can always edit these settings later</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.grid}>

            {/* left: form */}
            <div>

              {/* Basic info card */}
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>Basic Info</h2>
                <p className={styles.cardSub}>Give your agent a name and description</p>
                <hr className={styles.divider} />

                {/* click avatar to change it */}
                <div className={styles.avatarPickerRow}>
                  <button type="button" className={styles.avatarPickerBtn} onClick={() => avatarInputRef.current?.click()}>
                    <BotAvatar name={name || 'Agent'} avatarUrl={avatarPreview} size={56} />
                    <span className={styles.avatarPickerOverlay}>Change</span>
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className={styles.hiddenInput}
                    onChange={handleAvatarPick}
                  />
                  <div>
                    <p className={styles.label}>Profile Picture</p>
                    <p className={styles.hint}>JPG, PNG up to 1MB — or use initials</p>
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Agent Name *</label>
                  <input
                    className={styles.input}
                    placeholder="e.g. Support Bot"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Description</label>
                  <input
                    className={styles.input}
                    placeholder="What does this agent do?"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </div>
              </div>

              {/* Tone & instructions card */}
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>Tone & Instructions</h2>
                <p className={styles.cardSub}>Pick a preset or write your own system prompt</p>
                <hr className={styles.divider} />

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Tone Preset</label>
                  <div className={styles.toneChips}>
                    {TONE_PRESETS.map(p => (
                      <button
                        key={p.label}
                        type="button"
                        className={`${styles.toneChip} ${activeTone === p.label ? styles.toneChipActive : ''}`}
                        onClick={() => pickTone(p)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>System Prompt</label>
                  <textarea
                    className={styles.textarea}
                    rows={5}
                    value={systemPrompt}
                    onChange={handlePromptChange}
                    placeholder="Describe how your agent should behave..."
                  />
                  <p className={styles.hint}>Select a preset above or write custom instructions</p>
                </div>
              </div>

              {/* Model settings card */}
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>Model Settings</h2>
                <p className={styles.cardSub}>Fine-tune how the AI generates responses</p>
                <hr className={styles.divider} />

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Temperature — {temperature}</label>
                  <div className={styles.tempRow}>
                    <span className={styles.hint}>Focused</span>
                    <input
                      type="range"
                      className={styles.tempSlider}
                      min={0} max={1} step={0.1}
                      value={temperature}
                      onChange={e => setTemperature(parseFloat(e.target.value))}
                    />
                    <span className={styles.hint}>Creative</span>
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Max Tokens</label>
                  <input
                    className={styles.input}
                    type="number"
                    min={100}
                    max={maxTokensLimit}
                    value={maxTokens}
                    onChange={e => setMaxTokens(Math.min(parseInt(e.target.value) || 100, maxTokensLimit))}
                  />
                  <p className={styles.hint}>
                    Max response length (100–{maxTokensLimit})
                    {user?.plan === 'free' && <span className={styles.planNote}> — upgrade to Pro for up to 1000</span>}
                  </p>
                </div>
              </div>

              {error && <p className={styles.errorMsg}>{error}</p>}

              <div className={styles.actions}>
                <button type="button" className={styles.cancelBtn} onClick={() => navigate('/dashboard')}>
                  Cancel
                </button>
                <button type="submit" className={styles.submitBtn} disabled={submitting || !name.trim()}>
                  {submitting ? 'Creating…' : 'Create Agent'}
                </button>
              </div>

            </div>

            {/* right: live preview */}
            <div className={styles.previewWrap}>
              <div className={styles.previewCard}>
                <p className={styles.previewLabel}>Preview</p>

                <div className={styles.previewIcon}>
                  <BotAvatar name={name || 'Agent'} avatarUrl={avatarPreview} size={56} />
                </div>

                <p className={`${styles.previewName} ${!name ? styles.previewEmpty : ''}`}>
                  {name || 'Agent Name'}
                </p>

                {activeTone && (
                  <span className={styles.previewToneBadge}>{activeTone}</span>
                )}

                <hr className={styles.dividerLine} />

                <div className={styles.previewPrompt}>
                  {systemPrompt || 'System prompt will appear here…'}
                </div>

                <div className={styles.previewStat}>
                  <span>Temperature</span>
                  <span className={styles.previewStatVal}>{temperature}</span>
                </div>
                <div className={styles.previewStat}>
                  <span>Max tokens</span>
                  <span className={styles.previewStatVal}>{maxTokens}</span>
                </div>
              </div>
            </div>

          </div>
        </form>

      </div>
    </div>
  );
}
