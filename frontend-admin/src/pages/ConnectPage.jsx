import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function ConnectPage() {
  const { t } = useTranslation();
  const [domain, setDomain] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [connected, setConnected] = useState(localStorage.getItem('shopConnected') === 'true');
  const [loading, setLoading] = useState(false);

  const handleConnect = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      localStorage.setItem('shopConnected', 'true');
      setConnected(true);
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="space-y-lg">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">storefront</span>
        <h2 className="font-headline text-headline-md text-on-surface">{t('connectStore')}</h2>
      </div>

      <div className="card max-w-xl">
        {connected ? (
          <div className="flex items-center gap-3 rounded-lg bg-success/10 p-md text-success">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            <span className="font-body-md text-body-md font-medium">{t('connected')}</span>
          </div>
        ) : (
          <form onSubmit={handleConnect} className="space-y-md">
            <p className="font-body-sm text-body-sm text-text-secondary">{t('demoModeNoCredentials')}</p>
            <div>
              <label className="field-label">{t('shopDomain')}</label>
              <input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="your-store.myshopify.com"
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label">{t('apiKey')}</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="field-input"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
              {t('connect')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
