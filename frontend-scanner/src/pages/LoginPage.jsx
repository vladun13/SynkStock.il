import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('demo@syncstock.dev');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      onLogin();
    }
  };

  return (
    <div dir="rtl" style={{ maxWidth: 360, margin: '80px auto', padding: 24, fontFamily: 'Heebo, sans-serif' }}>
      <h1 style={{ textAlign: 'center', marginBottom: 8 }}>SyncStock IL</h1>
      <p style={{ textAlign: 'center', color: '#637381', marginBottom: 24 }}>חשבון דמו — לחץ על כניסה</p>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <label style={{ display: 'block', marginBottom: 4 }}>אימייל</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
          style={{ width: '100%', padding: 8, marginBottom: 12, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }} />
        <label style={{ display: 'block', marginBottom: 4 }}>סיסמה</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          style={{ width: '100%', padding: 8, marginBottom: 16, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }} />
        <button type="submit" disabled={loading}
          style={{ width: '100%', padding: 12, background: '#008060', color: 'white', border: 'none', borderRadius: 4, fontSize: 16, cursor: 'pointer' }}>
          {loading ? '...' : 'כניסה'}
        </button>
      </form>
    </div>
  );
}
