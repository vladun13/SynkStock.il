import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import LoginPage from './pages/LoginPage';
import ScannerPage from './pages/ScannerPage';

export default function App() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return <div style={{ padding: 40, textAlign: 'center' }}>טוען...</div>;
  if (!session) return <LoginPage onLogin={() => {}} />;
  return <ScannerPage session={session} />;
}
