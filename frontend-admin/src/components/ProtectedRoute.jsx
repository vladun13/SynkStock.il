import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Spinner, Frame } from '@shopify/polaris';
import { supabase } from '../lib/supabase';

export default function ProtectedRoute({ children }) {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <Frame>
        <div style={{ padding: 40, textAlign: 'center' }}>
          <Spinner />
        </div>
      </Frame>
    );
  }

  return session ? children : <Navigate to="/login" replace />;
}
