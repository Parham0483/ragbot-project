import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { CircularProgress } from '@mui/material';
import { chatbotAPI } from '../../services/api';
import BotAvatar from '../Common/BotAvatar';
import styles from './UISettingConfig.module.css';

// static widget preview using current settings
function WidgetPreview({ name, primaryColor, placeholder }) {
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
          <span className={styles.previewPlaceholder}>{placeholder || 'Message...'}</span>
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
  const [placeholder, setPlaceholder] = useState('Message...');
  const [widgetAlign, setWidgetAlign] = useState('right');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const avatarInputRef = useRef(null);

  useEffect(() => {
    chatbotAPI.get(id).then(r => {
      setChatbot(r.data);
      setDisplayName(r.data.name);
      setAvatarUrl(r.data.avatar_url || null);
      setPrimaryColor(r.data.theme_colour || '#B10000');
      setPlaceholder(r.data.placeholder || 'Message...');
      setWidgetAlign(r.data.widget_align || 'right');
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
      await chatbotAPI.patch(id, {
        name: displayName.trim() || chatbot.name,
        theme_colour: primaryColor,
        placeholder,
        widget_align: widgetAlign,
      });
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
      {/* left - form */}
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
          <input
            className={styles.input}
            value={placeholder}
            onChange={e => setPlaceholder(e.target.value)}
            maxLength={100}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Widget Align</label>
          <div className={styles.alignToggle}>
            <button
              type="button"
              className={`${styles.alignBtn} ${widgetAlign === 'left' ? styles.alignBtnActive : ''}`}
              onClick={() => setWidgetAlign('left')}
            >Left</button>
            <button
              type="button"
              className={`${styles.alignBtn} ${widgetAlign === 'right' ? styles.alignBtnActive : ''}`}
              onClick={() => setWidgetAlign('right')}
            >Right</button>
          </div>
        </div>

        <button className={styles.saveBtn} onClick={saveChanges} disabled={saving}>
          {saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : saved ? 'Saved ✓' : 'Save Changes'}
        </button>
      </div>

      {/* right - preview */}
      <div className={styles.previewPanel}>
        <h3 className={styles.previewTitle}>Preview</h3>
        <p className={styles.subtitle}>Customize widget for your website</p>
        <WidgetPreview name={displayName} primaryColor={primaryColor} placeholder={placeholder} />
      </div>
    </div>
  );
}
