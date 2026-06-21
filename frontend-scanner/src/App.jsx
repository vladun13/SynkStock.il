import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { isRTL } from './lib/i18n';
import LoginPage from './pages/LoginPage';
import ScannerPage from './pages/ScannerPage';

export default function App() {
  const [session, setSession] = useState(undefined);
  const rtl = isRTL();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} className={rtl ? 'font-heebo' : 'font-inter'}>
      {session === undefined ? (
        <div className="flex min-h-screen items-center justify-center bg-inverse-surface">
          <span className="material-symbols-outlined animate-spin text-primary-fixed-dim" style={{ fontSize: 40 }}>
            progress_activity
          </span>
        </div>
      ) : !session ? (
        <LoginPage onLogin={() => {}} />
      ) : (
        <ScannerPage session={session} />
      )}
    </div>
  );
}
