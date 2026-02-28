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

export const authAPI = {
  login: (credentials) => api.post('/auth/login/', credentials),
  register: (data) => api.post('/auth/register/', data),
  getProfile: () => api.get('/auth/profile/'),
};

export const chatbotAPI = {
  list: () => api.get('/chatbots/'),
  create: (data) => api.post('/chatbots/', data),
  get: (id) => api.get(`/chatbots/${id}/`),
  update: (id, data) => api.put(`/chatbots/${id}/`, data),
  delete: (id) => api.delete(`/chatbots/${id}/`),
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

export default api;
