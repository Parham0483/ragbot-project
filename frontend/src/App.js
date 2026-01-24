import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/Layout/ProtectedRoute';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboard from './components/Dashboard/Dashboard';
import CreateChatbot from './components/Chatbots/CreateChatbot';
import ChatbotDetail from './components/Chatbots/ChatbotDetail';
import ChatInterface from './components/Chatbots/ChatInterface';
import Analytics from './components/Analytics/Analytics';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/create-chatbot" element={<ProtectedRoute><CreateChatbot /></ProtectedRoute>} />
          <Route path="/chatbot/:id" element={<ProtectedRoute><ChatbotDetail /></ProtectedRoute>} />
          <Route path="/chat/:id" element={<ProtectedRoute><ChatInterface /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
