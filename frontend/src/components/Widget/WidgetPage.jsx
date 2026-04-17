import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { widgetAPI } from '../../services/api';

export default function WidgetPage() {
  const { id } = useParams();
  const [config, setConfig] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [inactive, setInactive] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    widgetAPI.config(id)
      .then(res => {
        const cfg = res.data;
        setConfig(cfg);
        if (!cfg.active) {
          setInactive(true);
          return;
        }
        setMessages([{ role: 'bot', text: cfg.welcome_message }]);
      })
      .catch(() => setInactive(true));
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const send = async () => {
    const text = input.trim();
    if (!text || typing) return;

    setMessages(prev => [...prev, { role: 'user', text }]);
    setInput('');
    setTyping(true);

    try {
      const res = await widgetAPI.chat(id, text, conversationId);
      const { reply, conversation_id } = res.data;
      if (!conversationId) setConversationId(conversation_id);
      setMessages(prev => [...prev, { role: 'bot', text: reply }]);
    } catch (err) {
      const status = err.response?.status;
      let errorText = 'Something went wrong. Please try again.';
      if (status === 429) errorText = 'Message limit reached. Please try again later.';
      else if (status === 403) errorText = 'This assistant is currently offline.';
      setMessages(prev => [...prev, { role: 'error', text: errorText }]);
    } finally {
      setTyping(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const accent = config?.theme_colour || '#B10000';

  if (inactive) {
    return (
      <div style={s.root}>
        <div style={{ ...s.header, background: accent }}>
          <span style={s.headerName}>Assistant</span>
        </div>
        <div style={s.body}>
          <div style={s.offline}>This assistant is currently offline.</div>
        </div>
      </div>
    );
  }

  if (!config) return <div style={s.root} />;

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={{ ...s.header, background: accent }}>
        {config.avatar_url
          ? <img src={config.avatar_url} alt="" style={s.headerAvatar} />
          : <div style={s.headerInitial}>{(config.name || 'A')[0].toUpperCase()}</div>
        }
        <span style={s.headerName}>{config.name}</span>
        <span style={s.onlineDot} />
      </div>

      {/* Messages */}
      <div style={s.body}>
        {messages.map((msg, i) => {
          if (msg.role === 'user') return (
            <div key={i} style={{ ...s.bubble, ...s.bubbleUser, background: accent }}>{msg.text}</div>
          );
          if (msg.role === 'error') return (
            <div key={i} style={{ ...s.bubble, ...s.bubbleError }}>{msg.text}</div>
          );
          return <div key={i} style={{ ...s.bubble, ...s.bubbleBot }}>{msg.text}</div>;
        })}

        {typing && (
          <div style={{ ...s.bubble, ...s.bubbleBot, ...s.typingWrap }}>
            <span style={s.dot} /><span style={{ ...s.dot, animationDelay: '0.2s' }} /><span style={{ ...s.dot, animationDelay: '0.4s' }} />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={s.footer}>
        <input
          ref={inputRef}
          style={s.input}
          placeholder={config.placeholder || 'Type a message…'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={typing}
          maxLength={2000}
        />
        <button
          style={{ ...s.sendBtn, background: accent, opacity: (!input.trim() || typing) ? 0.5 : 1 }}
          onClick={send}
          disabled={!input.trim() || typing}
          aria-label="Send"
        >
          ➤
        </button>
      </div>

      <div style={s.poweredBy}>Powered by SmartChat</div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

// all styles inline so the widget works isolated inside an iframe
const s = {
  root: {
    display: 'flex', flexDirection: 'column',
    height: '100vh', width: '100%',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    background: '#111', color: '#fff', overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '12px 16px', flexShrink: 0,
  },
  headerAvatar: { width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' },
  headerInitial: {
    width: 32, height: 32, borderRadius: '50%',
    background: 'rgba(255,255,255,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 14,
  },
  headerName: { fontWeight: 600, fontSize: 15, flex: 1 },
  onlineDot: {
    width: 8, height: 8, borderRadius: '50%',
    background: '#4CAF50', flexShrink: 0,
  },
  body: {
    flex: 1, overflowY: 'auto',
    padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 10,
  },
  bubble: {
    maxWidth: '80%', padding: '10px 14px',
    borderRadius: 12, fontSize: 14, lineHeight: 1.5,
    wordBreak: 'break-word',
  },
  bubbleBot: { background: '#2a2a2a', color: '#fff', alignSelf: 'flex-start' },
  bubbleUser: { color: '#fff', alignSelf: 'flex-end' },
  bubbleError: { background: '#3a1a1a', color: '#ff8888', alignSelf: 'flex-start' },
  typingWrap: { display: 'flex', gap: 4, alignItems: 'center', padding: '12px 14px' },
  dot: {
    width: 8, height: 8, borderRadius: '50%',
    background: '#888', display: 'inline-block',
    animation: 'bounce 1.4s infinite ease-in-out',
  },
  offline: { color: '#888', fontSize: 14, textAlign: 'center', marginTop: 40 },
  footer: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 12px', borderTop: '1px solid #222', flexShrink: 0,
  },
  input: {
    flex: 1, background: '#1e1e1e', border: '1px solid #333',
    borderRadius: 8, padding: '8px 12px',
    color: '#fff', fontSize: 14, outline: 'none',
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 8, border: 'none',
    color: '#fff', cursor: 'pointer', fontSize: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, transition: 'opacity 0.2s',
  },
  poweredBy: {
    textAlign: 'center', fontSize: 11, color: '#444',
    padding: '4px 0 8px', flexShrink: 0,
  },
};
