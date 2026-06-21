import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { t, getLanguage, setLanguage, isRTL } from '../lib/i18n';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('demo@syncstock.dev');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const rtl = isRTL();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) setError(err.message);
    else onLogin();
  };

  const toggleLang = () => {
    const next = getLanguage() === 'he' ? 'en' : 'he';
    setLanguage(next);
    window.location.reload();
  };

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} className={`flex min-h-screen items-center justify-center bg-bg-main p-md ${rtl ? 'font-heebo' : 'font-inter'}`}>
      <div className="w-full max-w-sm">
        <div className="mb-lg flex flex-col items-center">
          <div className="mb-md flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary shadow-card-elevated">
            <span className="material-symbols-outlined text-on-primary" style={{ fontSize: 36 }}>qr_code_scanner</span>
          </div>
          <h1 className="bg-gradient-to-l from-primary to-secondary bg-clip-text font-rubik text-headline-md font-bold text-transparent">
            {t('brand')}
          </h1>
          <p className="mt-1 font-body-sm text-body-sm text-text-secondary">{t('demoHint')}</p>
        </div>
        <form onSubmit={handleSubmit} className="card space-y-md">
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-danger bg-danger/10 p-md font-body-sm text-body-sm text-danger">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          )}
          <div>
            <label className="field-label">{t('email')}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field-input" />
          </div>
          <div>
            <label className="field-label">{t('password')}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="field-input" />
          </div>
          <button type="submit" disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-l from-primary to-secondary px-4 py-2 font-headline text-headline-sm text-on-primary shadow-sm transition-opacity hover:opacity-90 active:scale-95">
            {loading && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
            {t('signIn')}
          </button>
          <button type="button" onClick={toggleLang}
            className="flex w-full items-center justify-center gap-1 font-body-sm text-body-sm text-text-secondary hover:text-primary">
            <span className="material-symbols-outlined text-[16px]">language</span>
            {getLanguage() === 'he' ? 'English' : 'עברית'}
          </button>
        </form>
      </div>
    </div>
  );
}
