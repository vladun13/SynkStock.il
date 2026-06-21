import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page, Card, FormLayout, TextField, Button, Banner, Text } from '@shopify/polaris';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('demo@syncstock.dev');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      navigate('/');
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: '80px auto', padding: '0 16px' }}>
      <Page>
        <Card>
          <div style={{ padding: 24 }}>
            <Text as="h1" variant="headingLg" alignment="center">SyncStock IL</Text>
            <div style={{ marginTop: 8, marginBottom: 24, textAlign: 'center' }}>
              <Text as="p" tone="subdued">{t('demoHint')}</Text>
            </div>
            {error && (
              <div style={{ marginBottom: 16 }}>
                <Banner tone="critical">{error}</Banner>
              </div>
            )}
            <FormLayout>
              <TextField label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
              <TextField label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
              <Button variant="primary" fullWidth loading={loading} onClick={handleSubmit}>{t('signIn')}</Button>
            </FormLayout>
          </div>
        </Card>
      </Page>
    </div>
  );
}
