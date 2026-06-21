import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';

export default function ProtectedRoute({ children }) {
  const { t } = useTranslation();
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-main">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined animate-spin text-primary" style={{ fontSize: 40 }}>
            progress_activity
          </span>
          <p className="font-body-md text-body-md text-text-secondary">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return session ? children : <Navigate to="/login" replace />;
}
