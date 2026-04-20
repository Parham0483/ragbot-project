import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { chatbotAPI } from '../../services/api';
import { Check, ContentCopy, OpenInNew, Code, Lock } from '@mui/icons-material';
import styles from './ActionsTab.module.css';

export default function ActionsTab() {
  const { id } = useParams();
  const [embedCode, setEmbedCode] = useState('');
  const [widgetUrl, setWidgetUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  // allowed domains state
  const [domains, setDomains] = useState([]);
  const [newDomain, setNewDomain] = useState('');
  const [domainSaved, setDomainSaved] = useState(false);

  useEffect(() => {
    chatbotAPI.embedCode(id)
      .then(res => {
        setEmbedCode(res.data.embed_code);
        setWidgetUrl(res.data.widget_url);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    chatbotAPI.get(id).then(res => {
      const raw = res.data.allowed_domains || '';
      setDomains(raw.split('\n').map(d => d.trim()).filter(Boolean));
    }).catch(console.error);
  }, [id]);

  const saveDomains = async (updated) => {
    await chatbotAPI.patch(id, { allowed_domains: updated.join('\n') });
    setDomainSaved(true);
    setTimeout(() => setDomainSaved(false), 2000);
  };

  const addDomain = () => {
    const d = newDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!d || domains.includes(d)) { setNewDomain(''); return; }
    const updated = [...domains, d];
    setDomains(updated);
    setNewDomain('');
    saveDomains(updated);
  };

  const removeDomain = (d) => {
    const updated = domains.filter(x => x !== d);
    setDomains(updated);
    saveDomains(updated);
  };

  const copy = () => {
    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>Deploy</h2>
      <p className={styles.sub}>
        Embed your agent on any website — paste one line of code into your HTML.
      </p>

      {loading ? (
        <div className={styles.loading}>Loading embed code…</div>
      ) : (
        <>
          {/* embed code */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <Code sx={{ fontSize: 18, color: '#1A1A1A' }} />
              <span className={styles.cardTitle}>Embed Code</span>
            </div>
            <p className={styles.cardDesc}>
              Copy this snippet and paste it just before the <code>&lt;/body&gt;</code> closing tag of your website. A chat bubble will appear in the corner; visitors click it to open the chat.
            </p>
            <div className={styles.codeBlock}>
              <pre className={styles.code}>{embedCode}</pre>
              <button className={styles.copyBtn} onClick={copy}>
                {copied
                  ? <><Check sx={{ fontSize: 16 }} /> Copied!</>
                  : <><ContentCopy sx={{ fontSize: 16 }} /> Copy</>
                }
              </button>
            </div>
          </div>

          {/* allowed domains */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <Lock sx={{ fontSize: 18, color: '#1A1A1A' }} />
              <span className={styles.cardTitle}>Allowed Domains</span>
              {domainSaved && <span className={styles.savedBadge}>Saved ✓</span>}
            </div>
            <p className={styles.cardDesc}>
              Only these websites can load your widget. Leave empty to allow all domains (useful for testing).
            </p>
            <div className={styles.domainList}>
              {domains.length === 0 && (
                <span className={styles.domainEmpty}>No restrictions — anyone can embed this widget.</span>
              )}
              {domains.map(d => (
                <div key={d} className={styles.domainTag}>
                  <span>{d}</span>
                  <button className={styles.domainRemove} onClick={() => removeDomain(d)}>×</button>
                </div>
              ))}
            </div>
            <div className={styles.domainAddRow}>
              <input
                className={styles.domainInput}
                placeholder="e.g. mywebsite.com"
                value={newDomain}
                onChange={e => setNewDomain(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addDomain()}
              />
              <button className={styles.domainAddBtn} onClick={addDomain}>Add</button>
            </div>
          </div>

          {/* widget url */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <OpenInNew sx={{ fontSize: 18, color: '#1A1A1A' }} />
              <span className={styles.cardTitle}>Widget URL</span>
            </div>
            <p className={styles.cardDesc}>Direct link to the widget — open it standalone or use it as an iframe src.</p>
            <div className={styles.urlRow}>
              <span className={styles.urlText}>{widgetUrl}</span>
              <a href={widgetUrl} target="_blank" rel="noopener noreferrer" className={styles.openBtn}>
                Open <OpenInNew sx={{ fontSize: 14 }} />
              </a>
            </div>
          </div>

          {/* live preview */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Live Preview</span>
              <button
                className={styles.previewToggle}
                onClick={() => setShowPreview(v => !v)}
              >
                {showPreview ? 'Hide' : 'Show preview'}
              </button>
            </div>
            {showPreview && (
              <div className={styles.previewWrap}>
                <iframe
                  src={widgetUrl}
                  title="Widget preview"
                  className={styles.previewFrame}
                  allow="clipboard-write"
                />
              </div>
            )}
          </div>

          {/* steps */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>How to embed</span>
            </div>
            <ol className={styles.steps}>
              <li>Copy the embed code above</li>
              <li>Open your website editor (Wix, WordPress, Squarespace, etc.)</li>
              <li>Add a <strong>Custom HTML</strong> block and paste just before <code>&lt;/body&gt;</code></li>
              <li>Paste the code and publish — your agent is live</li>
            </ol>
          </div>
        </>
      )}
    </div>
  );
}
