import React from 'react';
import { t } from '../lib/i18n';
import SyncBadge from './SyncBadge';

export default function ProductCard({ product, available, syncStatus, onAdjust, loading }) {
  return (
    <div className="mx-auto -mt-6 w-full max-w-[420px] rounded-xl border border-border-subtle bg-surface p-lg shadow-card-elevated">
      <div className="mb-md flex items-start justify-between">
        <div className="flex items-start gap-md">
          {product.image_url ? (
            <img src={product.image_url} alt={product.title} className="h-16 w-16 rounded-lg object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-surface-container-high">
              <span className="material-symbols-outlined text-on-surface-variant">image</span>
            </div>
          )}
          <div>
            <h3 className="font-headline text-headline-sm text-on-surface">{product.title}</h3>
            <p className="font-body-sm text-body-sm text-text-secondary">
              <span className="font-mono">{product.sku}</span>
            </p>
            <p className="font-body-sm text-body-sm text-text-secondary">
              <span className="font-mono">{product.barcode}</span>
            </p>
          </div>
        </div>
        {syncStatus && <SyncBadge status={syncStatus} />}
      </div>

      <div className="mb-md flex items-center justify-between rounded-lg bg-bg-main p-md">
        <span className="font-body-sm text-body-sm text-text-secondary">{t('currentStock')}</span>
        <span className="font-rubik text-data-stock text-primary">{available} {t('units')}</span>
      </div>

      <div className="flex gap-sm">
        <button
          onClick={() => onAdjust(-1)}
          disabled={loading || available === 0}
          className="btn-scan-action bg-danger disabled:opacity-50"
        >
          <span className="material-symbols-outlined">remove</span>
          {t('sell')}
        </button>
        <button
          onClick={() => onAdjust(1)}
          disabled={loading}
          className="btn-scan-action bg-success disabled:opacity-50"
        >
          <span className="material-symbols-outlined">add</span>
          {t('receive')}
        </button>
      </div>
    </div>
  );
}
