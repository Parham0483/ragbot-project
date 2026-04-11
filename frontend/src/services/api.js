import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// one refresh at a time — shared so multiple failing requests don't each start their own
let refreshPromise = null;

function clearAuthAndRedirect() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  refreshPromise = null;
  // replace so login page doesn't stack in browser history
  window.location.replace('/login');
}

// if token expired, try to get a new one and redo the request
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    const is401 = err.response?.status === 401;
    const alreadyRetried = original._retry;
    const isRefreshEndpoint = original.url?.includes('token/refresh');

    if (is401 && !alreadyRetried && !isRefreshEndpoint) {
      original._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (!refresh) {
        clearAuthAndRedirect();
        return Promise.reject(err);
      }

      // if another request already started a refresh, wait for that one
      if (!refreshPromise) {
        refreshPromise = axios
          .post(`${API_URL}/auth/token/refresh/`, { refresh })
          .then((r) => {
            localStorage.setItem('access_token', r.data.access);
            return r.data.access;
          })
          .catch(() => {
            clearAuthAndRedirect();
            return Promise.reject(new Error('Session expired'));
          })
          .finally(() => { refreshPromise = null; });
      }

      try {
        const newAccess = await refreshPromise;
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch {
        return Promise.reject(err);
      }
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login/', credentials),
  register: (data) => api.post('/auth/register/', data),
  getProfile: () => api.get('/auth/profile/'),
  verifyEmail: (data) => api.post('/auth/verify-email/', data),
  passwordResetRequest: (data) => api.post('/auth/password-reset-request/', data),
  passwordResetConfirm: (data) => api.post('/auth/password-reset-confirm/', data),
  googleLogin: (credential) => api.post('/auth/google/', { credential }),
  updateProfile: (data) => api.patch('/auth/profile/update/', data),
  deleteAccount: () => api.delete('/auth/delete/'),
  emailChangeRequest: (new_email) => api.post('/auth/email-change/request/', { new_email }),
  emailChangeConfirm: (otp) => api.post('/auth/email-change/confirm/', { otp }),
  getApiKey: (provider) => api.get('/auth/api-key/', { params: { provider } }),
  saveApiKey: (provider, key) => api.patch('/auth/profile/update/', { [`${provider}_api_key`]: key }),
  deleteApiKey: (provider) => api.delete('/auth/api-key/', { params: { provider } }),
};

export const chatbotAPI = {
  list: () => api.get('/chatbots/'),
  create: (data) => api.post('/chatbots/', data),
  get: (id) => api.get(`/chatbots/${id}/`),
  update: (id, data) => api.put(`/chatbots/${id}/`, data),
  patch: (id, data) => api.patch(`/chatbots/${id}/`, data),
  delete: (id) => api.delete(`/chatbots/${id}/`),
  compare: (id, data) => api.post(`/chat/${id}/compare/`, data),
  uploadAvatar: (id, formData) => api.post(`/chatbots/${id}/upload-avatar/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

export const documentAPI = {
  list: () => api.get('/documents/'),
  upload: (data) => api.post('/documents/', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => api.delete(`/documents/${id}/`),
};

export const analyticsAPI = {
  // single chatbot
  messagesPerDay: (chatbotId, days) =>
    api.get(`/analytics/${chatbotId}/messages-per-day/`, { params: days ? { days } : {} }),
  frequentQuestions: (chatbotId, days) =>
    api.get(`/analytics/${chatbotId}/frequent-questions/`, { params: days ? { days } : {} }),
  summary: (chatbotId, days) =>
    api.get(`/analytics/${chatbotId}/summary/`, { params: days ? { days } : {} }),
  // all chatbots aggregate
  overviewMessagesPerDay: (days) =>
    api.get('/analytics/overview/messages-per-day/', { params: days ? { days } : {} }),
  overviewFrequentQuestions: (days) =>
    api.get('/analytics/overview/frequent-questions/', { params: days ? { days } : {} }),
  overviewSummary: (days) =>
    api.get('/analytics/overview/summary/', { params: days ? { days } : {} }),
};

export const widgetAPI = {
  config: (botId) => axios.get(`${API_URL}/widget/${botId}/config/`),
  chat: (botId, message, conversationId) =>
    axios.post(`${API_URL}/widget/${botId}/chat/`, {
      message,
      ...(conversationId ? { conversation_id: conversationId } : {}),
    }),
};

export default api;
