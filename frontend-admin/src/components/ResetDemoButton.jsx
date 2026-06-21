import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';

export default function ResetDemoButton() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    setLoading(true);
    try {
      await api.post('/api/demo/reset');
    } catch (e) {
      console.error('Reset failed', e);
    }
    setLoading(false);
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-full p-2 text-danger transition-colors hover:bg-error-container/30"
        title={t('resetDemo')}
      >
        <span className="material-symbols-outlined text-[20px]">restart_alt</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-xl bg-surface p-lg shadow-card-elevated">
        <div className="mb-md flex items-center gap-2">
          <span className="material-symbols-outlined text-danger">warning</span>
          <h3 className="font-headline text-headline-sm text-on-surface">{t('resetDemo')}</h3>
        </div>
        <p className="mb-lg font-body-md text-body-md text-on-surface-variant">{t('resetConfirm')}</p>
        <div className="flex justify-end gap-sm">
          <button onClick={() => setOpen(false)} className="btn-ghost">{t('cancel')}</button>
          <button onClick={handleReset} disabled={loading} className="btn-danger">
            {loading && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
            {t('confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
