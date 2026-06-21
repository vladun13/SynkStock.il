import React, { useState } from 'react';
import { Button, Modal, Text } from '@shopify/polaris';
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

  return (
    <>
      <Button size="slim" tone="critical" onClick={() => setOpen(true)}>{t('resetDemo')}</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('resetDemo')}
        primaryAction={{ content: t('confirm'), destructive: true, loading, onAction: handleReset }}
        secondaryActions={[{ content: t('cancel'), onAction: () => setOpen(false) }]}
      >
        <Modal.Section><Text>{t('resetConfirm')}</Text></Modal.Section>
      </Modal>
    </>
  );
}
