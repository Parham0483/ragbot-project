import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Send } from '@mui/icons-material';
import { Switch } from '@mui/material';
import { chatbotAPI } from '../../services/api';
import { MODELS } from '../../constants/models';
import styles from './CompareTab.module.css';

const DEFAULT_PANEL = (modelIdx) => ({
  model: MODELS[modelIdx],
  synced: true,
  messages: [],
  input: '',
  loading: false,
});

function ProviderBadge({ model }) {
  // Grok uses dark bg so white text; others use coloured bg with white text
  const textColor = model.provider === 'grok' ? '#fff' : '#fff';
  return (
    <span className={styles.badge} style={{ background: model.color, color: textColor }}>
      {model.abbr}
    </span>
  );
}

function ChatPanel({ panel, onModelChange, onSyncChange, onInputChange, onSend, bottomRef }) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div className={styles.modelSelector}>
          <ProviderBadge model={panel.model} />
          <select
            className={styles.modelSelect}
            value={panel.model.id}
            onChange={e => onModelChange(MODELS.find(m => m.id === e.target.value))}
          >
            {MODELS.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>
        <div className={styles.syncRow}>
          <span className={styles.syncLabel}>Sync</span>
          <Switch
            size="small"
            checked={panel.synced}
            onChange={e => onSyncChange(e.target.checked)}
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': { color: '#B10000' },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#B10000' },
            }}
          />
        </div>
      </div>

      <div className={styles.messages}>
        {panel.messages.length === 0 && (
          <p className={styles.emptyMsg}>Send a message to compare responses</p>
        )}
        {panel.messages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? styles.userBubble : styles.botBubble}>
            {msg.content}
            {msg.response_time_ms != null && (
              <span className={styles.timeBadge}>{(msg.response_time_ms / 1000).toFixed(1)}s</span>
            )}
          </div>
        ))}
        {panel.loading && <div className={styles.typing}><span /><span /><span /></div>}
        <div ref={bottomRef} />
      </div>

      <div className={styles.inputRow}>
        <input
          className={styles.input}
          placeholder="Message..."
          value={panel.input}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && onSend()}
          disabled={panel.loading}
        />
        <button className={styles.sendBtn} onClick={onSend} disabled={panel.loading || !panel.input.trim()}>
          <Send sx={{ fontSize: 18 }} />
        </button>
      </div>
    </div>
  );
}

export default function CompareTab() {
  const { id } = useParams();
  const [panels, setPanels] = useState([DEFAULT_PANEL(0), DEFAULT_PANEL(3)]); // GPT-4 + Claude Sonnet 3.7
  const bottomRefs = [useRef(null), useRef(null)];

  // scroll to bottom on new messages
  useEffect(() => {
    bottomRefs.forEach(r => r.current?.scrollIntoView({ behavior: 'smooth' }));
  }, [panels]);

  const updatePanel = (idx, patch) =>
    setPanels(prev => prev.map((p, i) => i === idx ? { ...p, ...patch } : p));

  async function handleSend(senderIdx) {
    const sender = panels[senderIdx];
    const text = sender.input.trim();
    if (!text) return;

    // figure out which panels to send to
    const targetIdxs = sender.synced
      ? panels.map((p, i) => ({ p, i })).filter(({ p }) => p.synced).map(({ i }) => i)
      : [senderIdx];

    // update all target panels to loading state
    setPanels(prev => prev.map((p, i) =>
      targetIdxs.includes(i)
        ? { ...p, input: '', loading: true, messages: [...p.messages, { role: 'user', content: text }] }
        : p
    ));

    const modelList = targetIdxs.map(i => ({ model_id: panels[i].model.id, provider: panels[i].model.provider }));

    try {
      const res = await chatbotAPI.compare(id, { message: text, models: modelList });
      const results = res.data.results;

      setPanels(prev => prev.map((p, i) => {
        const pos = targetIdxs.indexOf(i);
        if (pos === -1) return p;
        const result = results[pos];
        const errText = result.error?.length > 120 ? result.error.slice(0, 120) + '…' : result.error;
        const botMsg = result.success
          ? { role: 'assistant', content: result.response, response_time_ms: result.response_time_ms }
          : { role: 'assistant', content: `⚠ ${errText}`, response_time_ms: null };
        return { ...p, loading: false, messages: [...p.messages, botMsg] };
      }));
    } catch {
      setPanels(prev => prev.map((p, i) =>
        targetIdxs.includes(i)
          ? { ...p, loading: false, messages: [...p.messages, { role: 'assistant', content: 'Request failed.' }] }
          : p
      ));
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h2 className={styles.title}>Compare</h2>
        <p className={styles.subtitle}>Enable Sync to see the response for the same prompt in different Models</p>
      </div>

      <div className={styles.panels}>
        {panels.map((panel, idx) => (
          <ChatPanel
            key={idx}
            panel={panel}
            bottomRef={bottomRefs[idx]}
            onModelChange={model => updatePanel(idx, { model })}
            onSyncChange={synced => updatePanel(idx, { synced })}
            onInputChange={input => updatePanel(idx, { input })}
            onSend={() => handleSend(idx)}
          />
        ))}
      </div>
    </div>
  );
}
