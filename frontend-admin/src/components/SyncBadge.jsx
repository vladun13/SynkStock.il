import React from 'react';
import { Badge } from '@shopify/polaris';
import { useTranslation } from 'react-i18next';

export default function SyncBadge({ status }) {
  const { t } = useTranslation();
  if (status === 'synced') return <Badge tone="success">{t('synced')}</Badge>;
  if (status === 'pending') return <Badge tone="warning">{t('syncing')}</Badge>;
  return <Badge>{status}</Badge>;
}
