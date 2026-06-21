import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from '@shopify/polaris';
import enTranslations from '@shopify/polaris/locales/en.json';
import '@shopify/polaris/build/esm/styles.css';
import ProtectedRoute from './components/ProtectedRoute';
import NavBar from './components/NavBar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ActivityPage from './pages/ActivityPage';
import ConnectPage from './pages/ConnectPage';
import ErpSettingsPage from './pages/ErpSettingsPage';

function AuthedLayout({ children }) {
  return <ProtectedRoute><NavBar>{children}</NavBar></ProtectedRoute>;
}

export default function App() {
  return (
    <AppProvider i18n={enTranslations}>
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
    </AppProvider>
  );
}
