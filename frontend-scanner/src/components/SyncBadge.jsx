import React from 'react';
import { t } from '../lib/i18n';

const S = {
  synced: { background: '#AEE9D1', color: '#003B2B', borderRadius: 12, padding: '2px 10px', fontSize: 13 },
  pending: { background: '#FFD79D', color: '#7E5700', borderRadius: 12, padding: '2px 10px', fontSize: 13 },
  error: { background: '#FEAD9A', color: '#700000', borderRadius: 12, padding: '2px 10px', fontSize: 13 },
};

export default function SyncBadge({ status }) {
  if (status === 'synced') return <span style={S.synced}>{t('synced')}</span>;
  if (status === 'pending') return <span style={S.pending}>{t('syncing')}</span>;
  return <span style={S.error}>{status}</span>;
}
