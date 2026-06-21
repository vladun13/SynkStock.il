import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import ResetDemoButton from './ResetDemoButton';

const NAV_ITEMS = [
  { key: 'dashboard', icon: 'dashboard', to: '/' },
  { key: 'inventory', icon: 'inventory_2', to: '/' },
  { key: 'orders', icon: 'shopping_cart', to: '/activity' },
  { key: 'suppliers', icon: 'local_shipping', to: '/connect' },
  { key: 'erp', icon: 'settings', to: '/erp' },
];

export default function AppFrame({ children }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isRTL = i18n.language === 'he';

  const toggleLang = () => {
    const next = i18n.language === 'he' ? 'en' : 'he';
    i18n.changeLanguage(next);
    localStorage.setItem('language', next);
  };

  const isActive = (to) => (to === '/' ? pathname === '/' : pathname.startsWith(to));

  return (
    <div className="min-h-screen bg-bg-main text-on-background font-body">
      {/* Top nav */}
      <nav
        className={`fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-outline-variant bg-surface/80 px-md shadow-sm backdrop-blur-md md:px-lg ${
          isRTL ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        <div className="flex min-w-0 items-center gap-md">
          <span className="bg-gradient-to-l from-primary to-secondary bg-clip-text font-rubik text-headline-md font-bold text-transparent">
            SyncStock IL
          </span>
        </div>
        <div className="flex items-center gap-xs sm:gap-sm font-body-md text-body-md">
          <button
            onClick={toggleLang}
            className="flex items-center gap-xs rounded-full border border-border-subtle px-2 py-1.5 font-medium text-primary transition-colors hover:bg-surface-container-low sm:px-3"
            aria-label="language"
          >
            <span className="material-symbols-outlined text-[18px]">language</span>
            <span className="hidden sm:inline">{i18n.language === 'he' ? 'עברית' : 'English'}</span>
          </button>
          <button className="hidden rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low active:scale-95 sm:block">
            <span className="material-symbols-outlined text-[20px]">wifi</span>
          </button>
          <button className="relative hidden rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low active:scale-95 sm:block">
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-danger" />
          </button>
          <ResetDemoButton />
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-1 rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low"
            title={t('signOut')}
            aria-label={t('signOut')}
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </nav>

      {/* Side nav (desktop) */}
      <aside
        className={`fixed top-16 z-40 hidden h-[calc(100vh-64px)] w-60 flex-col border-${
          isRTL ? 'l' : 'r'
        } border-outline-variant bg-surface py-md px-sm shadow-md md:flex ${isRTL ? 'right-0' : 'left-0'}`}
      >
        <div className="mb-lg flex flex-col items-center border-b border-border-subtle px-2 pb-md">
          <div className="mb-sm flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary">
            <span className="material-symbols-outlined text-on-primary" style={{ fontSize: 32 }}>
              warehouse
            </span>
          </div>
          <h2 className="text-center font-headline text-headline-sm text-on-surface">{t('warehouseManagement')}</h2>
          <p className="font-body-sm text-body-sm text-text-secondary">{t('connectedToShopify')}</p>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.to);
            return (
              <button
                key={item.key}
                onClick={() => navigate(item.to)}
                className={`flex w-full items-center gap-md rounded-lg px-4 py-3 font-label-caps text-label-caps transition-colors ${
                  active
                    ? 'bg-primary-fixed/30 font-bold text-primary'
                    : 'font-medium text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.icon}
                </span>
                {t(item.key)}
              </button>
            );
          })}
        </div>
        <div className="mt-auto border-t border-border-subtle pt-md">
          <button className="flex w-full items-center gap-md rounded-lg px-4 py-3 font-label-caps text-label-caps font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high">
            <span className="material-symbols-outlined">help</span>
            {t('help')}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main
        className={`mx-auto max-w-container-max space-y-lg p-md pb-24 pt-20 md:p-lg md:pt-20 ${
          isRTL ? 'md:mr-60' : 'md:ml-60'
        }`}
      >
        {children}
      </main>

      {/* Bottom status bar (desktop) */}
      <div
        className={`fixed bottom-0 z-50 hidden h-8 w-full items-center justify-between border-t border-outline bg-inverse-surface px-lg font-label-caps text-label-caps text-inverse-on-surface md:flex ${
          isRTL ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        <div className={`flex items-center gap-6 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success animate-pulseDot" />
            <span>Odoo: {t('connected')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-danger" />
            <span>Priority: —</span>
          </div>
        </div>
        <div className="text-text-secondary">v2.4.1 (SyncStock Core)</div>
      </div>

      {/* Bottom nav (mobile) */}
      <nav
        className={`fixed bottom-0 z-50 flex h-20 w-full items-center justify-around rounded-t-xl bg-surface px-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] md:hidden ${
          isRTL ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        {NAV_ITEMS.slice(0, 4).map((item) => {
          const active = isActive(item.to);
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.to)}
              className={`flex flex-col items-center justify-center rounded-2xl px-4 py-1 transition-transform active:scale-90 ${
                active ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
              >
                {item.icon}
              </span>
              <span className="mt-1 font-body-sm text-body-sm font-medium">{t(item.key)}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
