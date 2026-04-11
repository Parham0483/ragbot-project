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
import ChatInterface from './components/Chatbots/ChatInterface';
import Analytics from './components/Analytics/Analytics';
import GeneralSettings from './components/Settings/GeneralSettings';
import PlansSettings from './components/Settings/PlansSettings';
import APIKeysSettings from './components/Settings/APIKeysSettings';
import CheckoutPage from './components/Settings/CheckoutPage';
import HomePage from './components/Landing/HomePage';
import PricingPage from './components/Landing/PricingPage';

// Per-agent layout and tabs
import AgentLayout from './components/Agent/AgentLayout';
import PlaygroundTab from './components/Agent/PlaygroundTab';
import ActionsTab from './components/Agent/ActionsTab';
import AgentAnalyticsTab from './components/Agent/AgentAnalyticsTab';
import CompareTab from './components/Agent/CompareTab';
import GeneralConfig from './components/Agent/GeneralConfig';
import UISettingConfig from './components/Agent/UISettingConfig';
import AIModelsConfig from './components/Agent/AIModelsConfig';
import WidgetPage from './components/Widget/WidgetPage';

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
          <Route path="/dashboard"      element={<AppRoute><Dashboard /></AppRoute>} />
          <Route path="/create-chatbot" element={<AppRoute><CreateChatbot /></AppRoute>} />
          <Route path="/chat/:id"       element={<AppRoute><ChatInterface /></AppRoute>} />
          <Route path="/analytics"      element={<AppRoute><Analytics /></AppRoute>} />
          <Route path="/settings/general" element={<AppRoute><GeneralSettings /></AppRoute>} />
          <Route path="/settings/plans"    element={<AppRoute><PlansSettings /></AppRoute>} />
          <Route path="/settings/api-keys" element={<AppRoute><APIKeysSettings /></AppRoute>} />
          <Route path="/checkout"          element={<CheckoutPage />} />

          {/* Per-agent nested layout */}
          <Route
            path="/chatbot/:id"
            element={<ProtectedRoute><AgentLayout /></ProtectedRoute>}
          >
            <Route index element={<Navigate to="playground" replace />} />
            <Route path="playground"        element={<PlaygroundTab />} />
            <Route path="actions"           element={<ActionsTab />} />
            <Route path="analytics"         element={<AgentAnalyticsTab />} />
            <Route path="compare"           element={<CompareTab />} />
            <Route path="config/general"    element={<GeneralConfig />} />
            <Route path="config/ui-setting" element={<UISettingConfig />} />
            <Route path="config/ai-models"  element={<AIModelsConfig />} />
          </Route>

          {/* Embeddable widget — no auth, standalone page for iframe */}
          <Route path="/widget/:id" element={<WidgetPage />} />

          <Route path="/" element={<HomePage />} />
          <Route path="/pricing" element={<PricingPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
