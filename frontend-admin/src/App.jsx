import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ProtectedRoute from './components/ProtectedRoute';
import AppFrame from './components/AppFrame';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ActivityPage from './pages/ActivityPage';
import ConnectPage from './pages/ConnectPage';
import ErpSettingsPage from './pages/ErpSettingsPage';

function AuthedLayout({ children }) {
  return (
    <ProtectedRoute>
      <AppFrame>{children}</AppFrame>
    </ProtectedRoute>
  );
}

export default function App() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'he';
  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className={isRTL ? 'font-heebo' : 'font-inter'}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<AuthedLayout><DashboardPage /></AuthedLayout>} />
          <Route path="/activity" element={<AuthedLayout><ActivityPage /></AuthedLayout>} />
          <Route path="/connect" element={<AuthedLayout><ConnectPage /></AuthedLayout>} />
          <Route path="/erp" element={<AuthedLayout><ErpSettingsPage /></AuthedLayout>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}
