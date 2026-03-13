import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/Layout/ProtectedRoute';
import AppLayout from './components/Layout/AppLayout';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import VerifyEmail from './components/Auth/VerifyEmail';
import ForgotPassword from './components/Auth/ForgotPassword';
import ResetPassword from './components/Auth/ResetPassword';
import Dashboard from './components/Dashboard/Dashboard';
import CreateChatbot from './components/Chatbots/CreateChatbot';
import ChatbotDetail from './components/Chatbots/ChatbotDetail';
import ChatInterface from './components/Chatbots/ChatInterface';
import Analytics from './components/Analytics/Analytics';

// wraps a page in both auth guard and the shared sidebar/navbar layout
function AppRoute({ children }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID || ''}>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard"     element={<AppRoute><Dashboard /></AppRoute>} />
          <Route path="/create-chatbot" element={<AppRoute><CreateChatbot /></AppRoute>} />
          <Route path="/chatbot/:id"   element={<AppRoute><ChatbotDetail /></AppRoute>} />
          <Route path="/chat/:id"      element={<AppRoute><ChatInterface /></AppRoute>} />
          <Route path="/analytics"     element={<AppRoute><Analytics /></AppRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
