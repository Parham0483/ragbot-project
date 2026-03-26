import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LinearProgress, CircularProgress } from '@mui/material';
import BotAvatar from '../Common/BotAvatar';
import { Description, Delete, Upload, Send } from '@mui/icons-material';
import { chatbotAPI, documentAPI } from '../../services/api';
import { MODELS, findModel, DEFAULT_MODEL } from '../../constants/models';
import axios from 'axios';
import styles from './PlaygroundTab.module.css';

const API_URL = 'http://localhost:8000/api';

function timeAgo(dateStr) {
  if (!dateStr) return 'never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h} hour${h !== 1 ? 's' : ''} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d !== 1 ? 's' : ''} ago`;
}

export default function PlaygroundTab() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [chatbot, setChatbot] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [feedback, setFeedback] = useState({});
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: "Hello! I'm your AI assistant. Ask me anything about the uploaded documents.",
      id: 'welcome',
    }]);
    setConversationId(null);
    loadChatbot();
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadChatbot = async () => {
    try {
      const r = await chatbotAPI.get(id);
      setChatbot(r.data);
      setSelectedModel(findModel(r.data.ai_model));
    } catch (e) { console.error(e); }
  };

  const loadDocuments = async () => {
    try {
      const r = await documentAPI.list();
      const all = r.data.results || r.data;
      setDocuments(all.filter(d => d.chatbot === parseInt(id)));
    } catch (e) { console.error(e); }
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    const failed = [];
    for (let i = 0; i < files.length; i++) {
      setUploadProgress(`${i + 1} / ${files.length}`);
      const form = new FormData();
      form.append('file', files[i]);
      form.append('chatbot', id);
      try { await documentAPI.upload(form); }
      catch (e) { failed.push(files[i].name); }
    }
    setFiles([]);
    setUploadProgress(null);
    setUploading(false);
    loadDocuments();
    loadChatbot();
    if (failed.length) alert(`Failed to upload: ${failed.join(', ')}`);
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await documentAPI.delete(docId);
      loadDocuments();
      loadChatbot();
    } catch (e) { console.error(e); }
  };

  const handleSend = async () => {
    if (!input.trim() || chatLoading) return;
    const userMsg = { role: 'user', content: input, id: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setChatLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const r = await axios.post(
        `${API_URL}/chat/${id}/`,
        { message: input, conversation_id: conversationId, model_id: selectedModel.id, provider: selectedModel.provider },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (!conversationId && r.data.conversation_id) setConversationId(r.data.conversation_id);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: r.data.ai_response.content,
        id: r.data.ai_response.id,
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Error — check that documents have been uploaded and processed.',
        id: 'err-' + Date.now(),
        isError: true,
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const sendFeedback = async (messageId, wasHelpful) => {
    if (feedback[messageId] !== undefined) return;
    setFeedback(prev => ({ ...prev, [messageId]: wasHelpful }));
    try {
      await axios.patch(`${API_URL}/chat/${id}/message/${messageId}/feedback/`, { was_helpful: wasHelpful });
    } catch (e) { console.error(e); }
  };

  if (!chatbot) return (
    <div className={styles.loading}><CircularProgress size={32} /></div>
  );

  return (
    <div className={styles.layout}>

      {/* ── Left Panel ── */}
      <div className={styles.leftPanel}>
        <h2 className={styles.title}>Playground</h2>
        <span className={styles.trainedBadge}>last trained {timeAgo(chatbot.updated_at)}</span>

        <button className={styles.compareBtn} onClick={() => navigate(`/chatbot/${id}/compare`)}>
          Compare ai models
        </button>

        {/* Training Data */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Training Data</div>

          <label className={styles.fileLabel}>
            <input
              type="file"
              accept=".pdf,.txt,.docx,.md"
              multiple
              onChange={e => setFiles(Array.from(e.target.files))}
              className={styles.fileInput}
            />
            <span className={styles.filePickerBtn}>
              <Upload sx={{ fontSize: 15 }} /> Choose files
            </span>
          </label>

          {files.length > 0 && (
            <div className={styles.fileNames}>{files.map(f => f.name).join(', ')}</div>
          )}

          <button
            className={styles.uploadBtn}
            onClick={handleUpload}
            disabled={!files.length || uploading}
          >
            {uploading ? uploadProgress : 'Upload'}
          </button>

          {uploading && <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />}

          <div className={styles.docList}>
            {documents.map(doc => (
              <div key={doc.id} className={styles.docItem}>
                <Description sx={{ fontSize: 16, color: '#888', flexShrink: 0 }} />
                <div className={styles.docInfo}>
                  <span className={styles.docName}>{doc.file_name}</span>
                  <span className={styles.docMeta}>
                    {doc.file_type?.toUpperCase()} • {(doc.file_size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <button className={styles.deleteDocBtn} onClick={() => handleDeleteDoc(doc.id)}>
                  <Delete sx={{ fontSize: 15 }} />
                </button>
              </div>
            ))}
            {documents.length === 0 && <p className={styles.emptyDocs}>No documents yet</p>}
          </div>
        </div>

        {/* Model */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Model</div>
          <select
            className={styles.modelSelect}
            value={selectedModel.id}
            onChange={e => setSelectedModel(MODELS.find(m => m.id === e.target.value))}
          >
            {MODELS.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Instructions */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Instructions</div>
          <p className={styles.instructionPreview}>
            {chatbot.system_prompt?.substring(0, 120)}
            {chatbot.system_prompt?.length > 120 ? '…' : ''}
          </p>
          <button className={styles.editLink} onClick={() => navigate(`/chatbot/${id}/config/ai-models`)}>
            Edit instructions →
          </button>
        </div>
      </div>

      {/* ── Right Panel — live dark widget ── */}
      <div className={styles.rightPanel}>
        <div className={styles.widgetWrap}>

          <div className={styles.widgetHeader}>
            <BotAvatar name={chatbot.name} avatarUrl={chatbot.avatar_url} size={34} />
            <span className={styles.widgetName}>{chatbot.name}</span>
          </div>

          <div className={styles.widgetMessages}>
            {messages.map(msg => (
              <div key={msg.id} className={`${styles.msgRow} ${msg.role === 'user' ? styles.msgRowUser : ''}`}>
                {msg.role === 'assistant' && (
                  <div className={`${styles.bubble} ${styles.bubbleBot} ${msg.isError ? styles.bubbleError : ''}`}>
                    {msg.content}
                    {typeof msg.id === 'number' && !msg.isError && (
                      <div className={styles.feedbackRow}>
                        <button
                          className={styles.feedbackBtn}
                          style={{ color: feedback[msg.id] === true ? '#fff' : '#555' }}
                          onClick={() => sendFeedback(msg.id, true)}
                        >▲</button>
                        <button
                          className={styles.feedbackBtn}
                          style={{
                            color: feedback[msg.id] === false ? '#B10000' : '#555',
                            pointerEvents: feedback[msg.id] !== undefined ? 'none' : 'auto',
                          }}
                          onClick={() => sendFeedback(msg.id, false)}
                        >▼</button>
                      </div>
                    )}
                  </div>
                )}
                {msg.role === 'user' && (
                  <div className={`${styles.bubble} ${styles.bubbleUser}`}>{msg.content}</div>
                )}
              </div>
            ))}

            {chatLoading && (
              <div className={styles.msgRow}>
                <div className={`${styles.bubble} ${styles.bubbleBot}`}>
                  <CircularProgress size={14} sx={{ color: '#666' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className={styles.widgetFooter}>
            <span className={styles.widgetPowered}>Powered by SmartChat</span>
          </div>

          <div className={styles.widgetInput}>
            <textarea
              className={styles.inputField}
              placeholder="Message..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={chatLoading}
            />
            <button
              className={styles.sendBtn}
              onClick={handleSend}
              disabled={!input.trim() || chatLoading}
            >
              <Send sx={{ fontSize: 18, color: input.trim() ? '#ccc' : '#444' }} />
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}
