import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { CircularProgress } from '@mui/material';
import { chatbotAPI } from '../../services/api';
import BotAvatar from '../Common/BotAvatar';
import styles from './UISettingConfig.module.css';

// static widget preview using current settings
function WidgetPreview({ name, primaryColor }) {
  return (
    <div className={styles.previewWrap}>
      <div className={styles.previewWidget}>
        <div className={styles.previewHeader} style={{ background: primaryColor || '#B10000' }}>
          <div className={styles.previewAvatar} />
          <span className={styles.previewName}>{name || 'Agent'}</span>
        </div>
        <div className={styles.previewBody}>
          <div className={styles.previewBubbleBot} style={{ background: primaryColor || '#B10000' }}>
            What can i help you with?
          </div>
          <div className={styles.previewBubbleUser}>I want to reset my password</div>
          <div className={styles.previewBubbleBot} style={{ background: primaryColor || '#B10000' }}>
            What is your Email address?
          </div>
        </div>
        <div className={styles.previewFooter}>Powered by SmartChat</div>
        <div className={styles.previewInput}>
          <span className={styles.previewPlaceholder}>Message...</span>
        </div>
      </div>
    </div>
  );
}

export default function UISettingConfig() {
  const { id } = useParams();
  const [chatbot, setChatbot] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#B10000');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const avatarInputRef = useRef(null);

  useEffect(() => {
    chatbotAPI.get(id).then(r => {
      setChatbot(r.data);
      setDisplayName(r.data.name);
      setAvatarUrl(r.data.avatar_url || null);
    }).catch(console.error);
  }, [id]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const form = new FormData();
    form.append('avatar', file);
    try {
      const r = await chatbotAPI.uploadAvatar(id, form);
      setAvatarUrl(r.data.avatar_url);
    } catch (err) {
      console.error(err);
    }
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      await chatbotAPI.patch(id, { name: displayName.trim() || chatbot.name });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (!chatbot) return (
    <div className={styles.loading}><CircularProgress size={32} /></div>
  );

  return (
    <div className={styles.layout}>
      {/* ── Left — form ── */}
      <div className={styles.formPanel}>
        <h2 className={styles.title}>UI Setting</h2>
        <p className={styles.subtitle}>Customize widget for your website</p>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Display name</label>
          <input
            className={styles.input}
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Mode</label>
          <div className={styles.modeToggle}>
            <button className={`${styles.modeBtn} ${styles.modeBtnActive}`}>☀</button>
            <button className={styles.modeBtn}>🌙</button>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Primary Color</label>
          <div className={styles.colorRow}>
            <input
              type="color"
              className={styles.colorSwatch}
              value={primaryColor}
              onChange={e => setPrimaryColor(e.target.value)}
            />
            <input
              className={`${styles.input} ${styles.colorInput}`}
              value={primaryColor.toUpperCase()}
              onChange={e => setPrimaryColor(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Secondary Color</label>
          <div className={styles.colorRow}>
            <div className={styles.colorSwatchStatic} style={{ background: '#FFFFFF', border: '1px solid #E0E0E0' }} />
            <input className={`${styles.input} ${styles.colorInput}`} defaultValue="#FFFFFF" readOnly />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Text Color</label>
          <div className={styles.colorRow}>
            <div className={styles.colorSwatchStatic} style={{ background: '#FFFFFF', border: '1px solid #E0E0E0' }} />
            <input className={`${styles.input} ${styles.colorInput}`} defaultValue="#FFFFFF" readOnly />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Chat Icon Color</label>
          <div className={styles.colorRow}>
            <div className={styles.colorSwatchStatic} style={{ background: '#000000' }} />
            <input className={`${styles.input} ${styles.colorInput}`} defaultValue="#000000" readOnly />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Profile</label>
          <div className={styles.uploadRow}>
            <BotAvatar name={displayName} avatarUrl={avatarUrl} size={48} />
            <button className={styles.uploadBtn} type="button" onClick={() => avatarInputRef.current?.click()}>
              Upload
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className={styles.hiddenInput}
              onChange={handleAvatarChange}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Placeholder</label>
          <input className={styles.input} defaultValue="Message..." readOnly />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>
            Chat Icon
            <span className={styles.hint}>JPG, PNG, and SVG up to 1MB</span>
          </label>
          <button className={styles.uploadBtn}>Upload</button>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Chat Icon Align</label>
          <div className={styles.alignToggle}>
            <button className={`${styles.alignBtn} ${styles.alignBtnActive}`}>Left</button>
            <button className={styles.alignBtn}>Right</button>
          </div>
        </div>

        <button className={styles.saveBtn} onClick={saveChanges} disabled={saving}>
          {saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : saved ? 'Saved ✓' : 'Save Changes'}
        </button>
      </div>

      {/* ── Right — preview ── */}
      <div className={styles.previewPanel}>
        <h3 className={styles.previewTitle}>Preview</h3>
        <p className={styles.subtitle}>Customize widget for your website</p>
        <WidgetPreview name={displayName} primaryColor={primaryColor} />
      </div>
    </div>
  );
}
