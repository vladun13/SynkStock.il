import React from 'react';
import { useTranslation } from 'react-i18next';

export default function SyncBadge({ status }) {
  const { t } = useTranslation();
  if (status === 'synced') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 font-label-caps text-label-caps text-success">
        <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
        {t('synced')}
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-1 font-label-caps text-label-caps text-warning">
        <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>
        {t('syncing')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2 py-1 font-label-caps text-label-caps text-on-surface-variant">
      {status}
    </span>
  );
}
