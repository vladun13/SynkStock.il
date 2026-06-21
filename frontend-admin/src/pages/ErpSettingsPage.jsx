import React, { useEffect, useState } from 'react';
import { Page, Card, FormLayout, TextField, Button, Banner, Text, Select, InlineStack } from '@shopify/polaris';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';

export default function ErpSettingsPage() {
  const { t } = useTranslation();
  const [erpType, setErpType] = useState('odoo');
  const [url, setUrl] = useState('');
  const [databaseName, setDatabaseName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    api.get('/api/erp/settings').then(({ data }) => {
      if (data.settings) {
        setSettings(data.settings);
        setErpType(data.settings.erp_type);
        setUrl(data.settings.url || '');
        setDatabaseName(data.settings.database_name || '');
        setUsername(data.settings.username || '');
      }
    });
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await api.post('/api/erp/settings', {
        erp_type: erpType,
        url,
        database_name: databaseName,
        username,
        password,
      });
      setMessage({ tone: 'success', text: t('connected') });
      const { data } = await api.get('/api/erp/settings');
      setSettings(data.settings);
    } catch (e) {
      setMessage({ tone: 'critical', text: e.response?.data?.error || 'Error' });
    }
    setLoading(false);
  };

  const handleTest = async () => {
    setTestLoading(true);
    setMessage(null);
    try {
      const { data } = await api.post('/api/erp/test', {});
      setMessage({ tone: data.success ? 'success' : 'critical', text: data.message });
      if (data.success) {
        const { data: settingsData } = await api.get('/api/erp/settings');
        setSettings(settingsData.settings);
      }
    } catch (e) {
      setMessage({ tone: 'critical', text: e.response?.data?.error || 'Error' });
    }
    setTestLoading(false);
  };

  const erpOptions = [
    { label: t('odoo'), value: 'odoo' },
  ];

  return (
    <Page title={t('erp')}>
      <Card>
        <div style={{ padding: 24 }}>
          {settings?.is_connected && (
            <div style={{ marginBottom: 16 }}>
              <Banner tone="success">{t('connected')}</Banner>
            </div>
          )}
          {message && (
            <div style={{ marginBottom: 16 }}>
              <Banner tone={message.tone} onDismiss={() => setMessage(null)}>{message.text}</Banner>
            </div>
          )}
          <FormLayout>
            <Select label={t('erpType')} options={erpOptions} value={erpType} onChange={setErpType} />
            <TextField label={t('erpUrl')} value={url} onChange={setUrl} placeholder="http://localhost:8069" />
            <TextField label={t('erpDatabase')} value={databaseName} onChange={setDatabaseName} />
            <TextField label={t('erpUsername')} value={username} onChange={setUsername} />
            <TextField label={t('erpPassword')} type="password" value={password} onChange={setPassword} />
            <InlineStack gap="400">
              <Button variant="primary" loading={loading} onClick={handleSave}>{t('saveSettings')}</Button>
              <Button loading={testLoading} onClick={handleTest}>{t('testConnection')}</Button>
            </InlineStack>
          </FormLayout>
        </div>
      </Card>
    </Page>
  );
}
