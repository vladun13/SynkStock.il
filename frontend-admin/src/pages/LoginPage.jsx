import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('demo@syncstock.dev');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isRTL = i18n.language === 'he';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) setError(authError.message);
    else navigate('/');
  };

  const toggleLang = () => {
    const next = i18n.language === 'he' ? 'en' : 'he';
    i18n.changeLanguage(next);
    localStorage.setItem('language', next);
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className={`flex min-h-screen items-center justify-center bg-bg-main p-md ${isRTL ? 'font-heebo' : 'font-inter'}`}>
      <div className="w-full max-w-sm">
        <div className="mb-lg flex flex-col items-center">
          <div className="mb-md flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary shadow-card-elevated">
            <span className="material-symbols-outlined text-on-primary" style={{ fontSize: 36 }}>warehouse</span>
          </div>
          <h1 className="bg-gradient-to-l from-primary to-secondary bg-clip-text font-headline text-headline-md font-bold text-transparent">
            SyncStock IL
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
            <label className="field-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="field-input"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
            {t('signIn')}
          </button>
          <button
            type="button"
            onClick={toggleLang}
            className="flex w-full items-center justify-center gap-1 font-body-sm text-body-sm text-text-secondary hover:text-primary"
          >
            <span className="material-symbols-outlined text-[16px]">language</span>
            {i18n.language === 'he' ? 'English' : 'עברית'}
          </button>
        </form>
      </div>
    </div>
  );
}
