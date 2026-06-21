import React, { useState } from 'react';
import { Page, Card, FormLayout, TextField, Button, Banner, Text } from '@shopify/polaris';
import { useTranslation } from 'react-i18next';

export default function ConnectPage() {
  const { t } = useTranslation();
  const [domain, setDomain] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [connected, setConnected] = useState(localStorage.getItem('shopConnected') === 'true');
  const [loading, setLoading] = useState(false);

  const handleConnect = () => {
    setLoading(true);
    setTimeout(() => {
      localStorage.setItem('shopConnected', 'true');
      setConnected(true);
      setLoading(false);
    }, 1000);
  };

  return (
    <Page title={t('connectStore')}>
      <Card>
        <div style={{ padding: 24 }}>
          {connected
            ? <Banner tone="success">{t('connected')}</Banner>
            : <FormLayout>
                <Text as="p" tone="subdued">{t('demoModeNoCredentials')}</Text>
                <TextField label={t('shopDomain')} value={domain} onChange={setDomain} placeholder="your-store.myshopify.com" />
                <TextField label={t('apiKey')} value={apiKey} onChange={setApiKey} />
                <Button variant="primary" loading={loading} onClick={handleConnect}>{t('connect')}</Button>
              </FormLayout>
          }
        </div>
      </Card>
    </Page>
  );
}
