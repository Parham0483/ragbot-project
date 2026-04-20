import React, { useState, useEffect, useRef } from 'react';
import { widgetAPI } from '../../services/api';
import styles from './WebsiteChat.module.css';

const BOT_ID = process.env.REACT_APP_WEBSITE_BOT_ID;

const GREETING = "Hi! I'm the Smart Chat assistant. Ask me anything about the platform — features, pricing, how to get started, or what you can build with it!";

export default function WebsiteChat() {
  const [messages, setMessages] = useState([
    { role: 'bot', text: GREETING },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const messagesRef = useRef(null);
  const inputRef = useRef(null);

  // scroll the messages box itself — never the page
  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  const send = async () => {
    const text = input.trim();
    if (!text || typing) return;

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    setTyping(true);

    try {
      const res = await widgetAPI.chat(BOT_ID, text, conversationId);
      const { reply, conversation_id } = res.data;
      if (!conversationId) setConversationId(conversation_id);
      setMessages((prev) => [...prev, { role: 'bot', text: reply }]);
    } catch (err) {
      const status = err.response?.status;
      let errorText = 'Something went wrong. Please try again.';
      if (status === 429) errorText = "You've reached the message limit. Please try again later.";
      else if (status === 403) errorText = 'The assistant is currently offline.';
      setMessages((prev) => [...prev, { role: 'error', text: errorText }]);
    } finally {
      setTyping(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <div className={styles.header}>
        <img src="/cs-logo.png" alt="Smart Chat" className={styles.headerLogo} />
        <span className={styles.headerTitle}>Smart Chat</span>
        <span className={styles.onlineDot} title="Online" />
      </div>

      {/* Messages */}
      <div className={styles.messages} ref={messagesRef}>
        {messages.map((msg, i) => {
          if (msg.role === 'user') return <div key={i} className={styles.msgUser}>{msg.text}</div>;
          if (msg.role === 'error') return <div key={i} className={styles.msgError}>{msg.text}</div>;
          return <div key={i} className={styles.msgBot}>{msg.text}</div>;
        })}

        {typing && (
          <div className={styles.typing}>
            <span className={styles.typingDot} />
            <span className={styles.typingDot} />
            <span className={styles.typingDot} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className={styles.inputRow}>
        <input
          ref={inputRef}
          className={styles.input}
          placeholder="Ask anything about Smart Chat…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={typing}
          maxLength={500}
        />
        <button
          className={styles.sendBtn}
          onClick={send}
          disabled={typing || !input.trim()}
          aria-label="Send message"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
