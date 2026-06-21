import React, { useEffect, useState } from 'react';
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

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await api.post('/api/erp/settings', { erp_type: erpType, url, database_name: databaseName, username, password });
      setMessage({ tone: 'success', text: t('connected') });
      const { data } = await api.get('/api/erp/settings');
      setSettings(data.settings);
    } catch (e) {
      setMessage({ tone: 'danger', text: e.response?.data?.error || 'Error' });
    }
    setLoading(false);
  };

  const handleTest = async () => {
    setTestLoading(true);
    setMessage(null);
    try {
      const { data } = await api.post('/api/erp/test', {});
      setMessage({ tone: data.success ? 'success' : 'danger', text: data.message });
      if (data.success) {
        const { data: settingsData } = await api.get('/api/erp/settings');
        setSettings(settingsData.settings);
      }
    } catch (e) {
      setMessage({ tone: 'danger', text: e.response?.data?.error || 'Error' });
    }
    setTestLoading(false);
  };

  const bannerClass =
    message?.tone === 'success'
      ? 'border-success bg-success/10 text-success'
      : 'border-danger bg-danger/10 text-danger';

  return (
    <div className="space-y-lg">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">settings_ethernet</span>
        <h2 className="font-headline text-headline-md text-on-surface">{t('erp')}</h2>
        {settings?.is_connected && (
          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 font-label-caps text-label-caps text-success">
            <span className="h-2 w-2 rounded-full bg-success animate-pulseDot" />
            {t('connected')}
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="card max-w-xl space-y-md">
        {message && (
          <div className={`flex items-center justify-between rounded-md border p-md ${bannerClass}`}>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">
                {message.tone === 'success' ? 'check_circle' : 'error'}
              </span>
              <span className="font-body-sm text-body-sm">{message.text}</span>
            </div>
            <button type="button" onClick={() => setMessage(null)} className="rounded-full p-1 hover:bg-surface">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}
        <div>
          <label className="field-label">{t('erpType')}</label>
          <select value={erpType} onChange={(e) => setErpType(e.target.value)} className="field-input">
            <option value="odoo">{t('odoo')}</option>
          </select>
        </div>
        <div>
          <label className="field-label">{t('erpUrl')}</label>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://localhost:8069" className="field-input" />
        </div>
        <div>
          <label className="field-label">{t('erpDatabase')}</label>
          <input value={databaseName} onChange={(e) => setDatabaseName(e.target.value)} className="field-input" />
        </div>
        <div>
          <label className="field-label">{t('erpUsername')}</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} className="field-input" />
        </div>
        <div>
          <label className="field-label">{t('erpPassword')}</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="field-input" />
        </div>
        <div className="flex gap-sm">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
            {t('saveSettings')}
          </button>
          <button type="button" onClick={handleTest} disabled={testLoading} className="btn-ghost">
            {testLoading && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
            {t('testConnection')}
          </button>
        </div>
      </form>
    </div>
  );
}
