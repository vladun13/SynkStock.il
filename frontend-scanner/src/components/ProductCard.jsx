import React from 'react';
import { t } from '../lib/i18n';
import SyncBadge from './SyncBadge';

export default function ProductCard({ product, available, syncStatus, onAdjust, loading }) {
  return (
    <div dir="rtl" style={{
      background: 'white',
      borderRadius: 12,
      padding: 20,
      margin: '16px auto',
      maxWidth: 400,
      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
      fontFamily: 'Heebo, sans-serif',
    }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 12 }}>
        <img src={product.image_url} alt={product.title}
          style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{product.title}</div>
          <div style={{ color: '#637381', fontSize: 13 }}>{product.sku}</div>
          <div style={{ color: '#637381', fontSize: 13 }}>{product.barcode}</div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 24, fontWeight: 700 }}>{available}</span>
        {syncStatus && <SyncBadge status={syncStatus} />}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => onAdjust(-1)} disabled={loading || available === 0}
          style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #E0E0E0', background: '#FFF4F4', fontSize: 18, cursor: 'pointer' }}>
          − {t('sell')}
        </button>
        <button onClick={() => onAdjust(1)} disabled={loading}
          style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #E0E0E0', background: '#F4FFF9', fontSize: 18, cursor: 'pointer' }}>
          + {t('receive')}
        </button>
      </div>
    </div>
  );
}
