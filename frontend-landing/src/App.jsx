import React from 'react';
import { useTranslation } from 'react-i18next';
import LandingPage from './pages/LandingPage';

export default function App() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'he';
  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className={isRTL ? 'font-heebo' : 'font-inter'}>
      <LandingPage />
    </div>
  );
}
