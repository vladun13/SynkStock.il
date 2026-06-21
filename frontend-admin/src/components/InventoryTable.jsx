import React, { useState } from 'react';
import { DataTable, Thumbnail, Badge, Button, InlineStack } from '@shopify/polaris';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';

export default function InventoryTable({ rows, locationId, onAdjust }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState({});

  const adjust = async (row, delta) => {
    const key = `${row.product_id}:${delta}`;
    setLoading(prev => ({ ...prev, [key]: true }));
    try {
      await api.post('/api/inventory/adjust', {
        barcode: row.barcode,
        locationId,
        delta,
        actionId: `admin:${row.product_id}:${Date.now()}`,
      });
      onAdjust();
    } catch (e) {
      console.error('Adjust failed', e);
    }
    setLoading(prev => ({ ...prev, [key]: false }));
  };

  const stockBadge = (qty) => {
    if (qty === 0) return <Badge tone="critical">{qty}</Badge>;
    if (qty <= 3) return <Badge tone="warning">{qty}</Badge>;
    return <Badge tone="success">{qty}</Badge>;
  };

  const tableRows = rows.map(row => [
    <Thumbnail source={row.image_url} alt={row.title} size="small" />,
    row.title,
    row.sku,
    row.barcode,
    stockBadge(row.available),
    <InlineStack gap="100">
      <Button size="slim" onClick={() => adjust(row, -1)} loading={!!loading[`${row.product_id}:-1`]}>−</Button>
      <Button size="slim" onClick={() => adjust(row, 1)} loading={!!loading[`${row.product_id}:1`]}>+</Button>
    </InlineStack>,
  ]);

  return (
    <DataTable
      columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
      headings={['', t('product'), t('sku'), t('barcode'), t('available'), t('actions')]}
      rows={tableRows}
    />
  );
}
