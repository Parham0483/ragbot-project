import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { CircularProgress } from '@mui/material';
import { chatbotAPI } from '../../services/api';
import BotAvatar from '../Common/BotAvatar';
import styles from './UISettingConfig.module.css';

// live widget preview; this shows the chat at real size
function WidgetPreview({ name, primaryColor, placeholder, widgetWidth, widgetHeight, avatarUrl }) {
  const accent = primaryColor || '#B10000';
  const w = widgetWidth || 380;
  const h = widgetHeight || 600;
  const initial = (name || 'A')[0].toUpperCase();

  const avatarEl = avatarUrl
    ? <img src={avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
    : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#fff' }}>{initial}</div>;

  const bubbleContent = avatarUrl
    ? <img src={avatarUrl} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }} />
    : <div style={{ width: 44, height: 44, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, color: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>{initial}</div>;

  return (
    <div className={styles.previewWrap}>
      {/* chat window at real dimensions */}
      <div style={{
        width: w,
        height: h,
        background: '#111',
        borderRadius: 16,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      }}>
        {/* header */}
        <div style={{ background: accent, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {avatarEl}
          <span style={{ color: '#fff', fontSize: 15, fontWeight: 600, flex: 1 }}>{name || 'Agent'}</span>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4CAF50' }} />
        </div>

        {/* messages */}
        <div style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
          <div style={{ background: '#2a2a2a', borderRadius: 12, padding: '10px 14px', fontSize: 14, color: '#fff', maxWidth: '80%' }}>
            Hi! I'm {name || 'Agent'}. How can I help you?
          </div>
          <div style={{ background: accent, borderRadius: 12, padding: '10px 14px', fontSize: 14, color: '#fff', maxWidth: '80%', alignSelf: 'flex-end' }}>
            What can you do?
          </div>
          <div style={{ background: '#2a2a2a', borderRadius: 12, padding: '10px 14px', fontSize: 14, color: '#fff', maxWidth: '80%' }}>
            I can answer questions about our products and services!
          </div>
        </div>

        {/* input */}
        <div style={{ borderTop: '1px solid #222', padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <div style={{ flex: 1, background: '#1e1e1e', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', fontSize: 14, color: '#555' }}>
            {placeholder || 'Message...'}
          </div>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: accent, flexShrink: 0 }} />
        </div>

        <div style={{ textAlign: 'center', fontSize: 11, color: '#444', padding: '4px 0 8px' }}>Powered by SmartChat</div>
      </div>

      {/* floating bubble below the chat */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, width: w }}>
        {bubbleContent}
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
  const [widgetWidth, setWidgetWidth] = useState(380);
  const [widgetHeight, setWidgetHeight] = useState(600);
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
      setWidgetWidth(r.data.widget_width || 380);
      setWidgetHeight(r.data.widget_height || 600);
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
        widget_width: Math.max(280, Math.min(800, Number(widgetWidth))),
        widget_height: Math.max(400, Math.min(900, Number(widgetHeight))),
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

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Chat Width (px)</label>
          <div className={styles.sizeRow}>
            <input
              type="range"
              min={280} max={800} step={10}
              value={widgetWidth}
              onChange={e => setWidgetWidth(Number(e.target.value))}
              className={styles.slider}
            />
            <input
              type="number"
              min={280} max={800}
              value={widgetWidth}
              onChange={e => setWidgetWidth(Number(e.target.value))}
              className={`${styles.input} ${styles.sizeInput}`}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Chat Height (px)</label>
          <div className={styles.sizeRow}>
            <input
              type="range"
              min={400} max={900} step={10}
              value={widgetHeight}
              onChange={e => setWidgetHeight(Number(e.target.value))}
              className={styles.slider}
            />
            <input
              type="number"
              min={400} max={900}
              value={widgetHeight}
              onChange={e => setWidgetHeight(Number(e.target.value))}
              className={`${styles.input} ${styles.sizeInput}`}
            />
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
        <WidgetPreview
          name={displayName}
          primaryColor={primaryColor}
          placeholder={placeholder}
          widgetAlign={widgetAlign}
          widgetWidth={widgetWidth}
          widgetHeight={widgetHeight}
          avatarUrl={avatarUrl}
        />
      </div>
    </div>
  );
}
