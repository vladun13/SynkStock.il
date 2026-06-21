import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Frame, Navigation, TopBar } from '@shopify/polaris';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import ResetDemoButton from './ResetDemoButton';

export default function NavBar({ children }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isRTL = i18n.language === 'he';

  const toggleLang = () => {
    const next = i18n.language === 'he' ? 'en' : 'he';
    i18n.changeLanguage(next);
    localStorage.setItem('language', next);
  };

  const nav = (
    <Navigation location={pathname}>
      <Navigation.Section
        items={[
          { label: t('dashboard'), url: '/', onClick: () => navigate('/') },
          { label: t('activity'), url: '/activity', onClick: () => navigate('/activity') },
          { label: t('connect'), url: '/connect', onClick: () => navigate('/connect') },
          { label: t('erp'), url: '/erp', onClick: () => navigate('/erp') },
        ]}
      />
    </Navigation>
  );

  const topBar = (
    <TopBar
      showNavigationToggle
      secondaryMenu={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={toggleLang}
            style={{ background: 'none', border: '1px solid #ccc', borderRadius: 4, padding: '4px 8px', cursor: 'pointer' }}
          >
            {i18n.language === 'he' ? 'EN' : 'עב'}
          </button>
          <ResetDemoButton />
          <button
            onClick={() => supabase.auth.signOut()}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#637381' }}
          >
            {t('signOut')}
          </button>
        </div>
      }
    />
  );

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ fontFamily: isRTL ? 'Heebo, sans-serif' : 'Inter, sans-serif' }}>
      <Frame navigation={nav} topBar={topBar}>{children}</Frame>
    </div>
  );
}
