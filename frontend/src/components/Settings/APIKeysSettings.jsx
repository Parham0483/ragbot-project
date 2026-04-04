import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../services/api';
import { Visibility, VisibilityOff, ContentCopy, Delete } from '@mui/icons-material';
import styles from './APIKeysSettings.module.css';

const PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    logo: '/logos/openai.svg',
    placeholder: 'sk-...',
    docUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    logo: '/logos/anthropic.svg',
    placeholder: 'sk-ant-...',
    docUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'google',
    name: 'Google (Gemini)',
    logo: '/logos/google.svg',
    placeholder: 'AIza...',
    docUrl: 'https://aistudio.google.com/app/apikey',
  },
  {
    id: 'xai',
    name: 'xAI (Grok)',
    logo: '/logos/xai.svg',
    placeholder: 'xai-...',
    docUrl: 'https://console.x.ai',
  },
];

function ProviderCard({ provider, keyInfo, onSaved, onDeleted }) {
  const [adding, setAdding]     = useState(false);
  const [newKey, setNewKey]     = useState('');
  const [saving, setSaving]     = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [fullKey, setFullKey]   = useState(null);
  const [copied, setCopied]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState('');

  const handleReveal = async () => {
    if (revealed) { setRevealed(false); return; }
    try {
      const res = await authAPI.getApiKey(provider.id);
      setFullKey(res.data.masked);
      setRevealed(true);
    } catch {
      setError('Could not load key.');
    }
  };

  const handleCopy = async () => {
    const val = fullKey || keyInfo?.masked;
    if (!val) return;
    await navigator.clipboard.writeText(val);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!newKey.trim()) { setError('Paste your API key first.'); return; }
    setError('');
    setSaving(true);
    try {
      await authAPI.saveApiKey(provider.id, newKey.trim());
      onSaved();
      setAdding(false);
      setNewKey('');
    } catch {
      setError('Failed to save key.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await authAPI.deleteApiKey(provider.id);
      setRevealed(false);
      setFullKey(null);
      onDeleted();
    } catch {
      setError('Failed to remove key.');
    } finally {
      setDeleting(false);
    }
  };

  const displayKey = revealed && fullKey ? fullKey : (keyInfo?.masked || '');
  const hasKey = keyInfo?.has_key;

  return (
    <div className={styles.card}>
      {/* header */}
      <div className={styles.cardHeader}>
        <div className={styles.logoWrap}>
          <img src={provider.logo} alt={provider.name} className={styles.providerLogo} />
        </div>
        <span className={styles.providerName}>{provider.name}</span>
        <a href={provider.docUrl} target="_blank" rel="noreferrer" className={styles.docLink}>
          Read docs
        </a>
      </div>

      {/* key display */}
      {hasKey ? (
        <div className={styles.keyRow}>
          <span className={styles.keyText}>{displayKey}</span>
          <div className={styles.keyActions}>
            <button className={styles.iconBtn} onClick={handleReveal} title={revealed ? 'Hide' : 'Show'}>
              {revealed
                ? <VisibilityOff sx={{ fontSize: 18 }} />
                : <Visibility sx={{ fontSize: 18 }} />}
            </button>
            <button className={styles.iconBtn} onClick={handleCopy} title="Copy">
              <ContentCopy sx={{ fontSize: 18 }} />
              {copied && <span className={styles.copiedToast}>Copied!</span>}
            </button>
            <button
              className={`${styles.iconBtn} ${styles.deleteBtn}`}
              onClick={handleDelete}
              disabled={deleting}
              title="Remove"
            >
              <Delete sx={{ fontSize: 18 }} />
            </button>
          </div>
        </div>
      ) : (
        <p className={styles.noKey}>No key set</p>
      )}

      {/* add key input */}
      {adding ? (
        <div className={styles.addRow}>
          <input
            className={styles.keyInput}
            type="text"
            placeholder={provider.placeholder}
            value={newKey}
            onChange={e => setNewKey(e.target.value)}
            autoFocus
          />
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button className={styles.cancelBtn} onClick={() => { setAdding(false); setNewKey(''); setError(''); }}>
            Cancel
          </button>
        </div>
      ) : (
        <button
          className={styles.addBtn}
          onClick={() => { setAdding(true); setError(''); }}
        >
          {hasKey ? 'Replace key' : '+ Add key'}
        </button>
      )}

      {error && <p className={styles.errorMsg}>{error}</p>}
    </div>
  );
}

export default function APIKeysSettings() {
  const { user, setUser } = useAuth();

  // refresh profile to get updated key info
  const reload = async () => {
    const profile = await authAPI.getProfile();
    setUser(profile.data);
  };

  const apiKeys = user?.api_keys || {};

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>API Keys</h1>
      <p className={styles.subtitle}>
        Add your own keys to use your personal billing for each provider.
      </p>

      <div className={styles.list}>
        {PROVIDERS.map(p => (
          <ProviderCard
            key={p.id}
            provider={p}
            keyInfo={apiKeys[p.id]}
            onSaved={reload}
            onDeleted={reload}
          />
        ))}
      </div>
    </div>
  );
}
