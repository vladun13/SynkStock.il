import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';

function stockTone(qty) {
  if (qty === 0) return 'danger';
  if (qty <= 3) return 'warning';
  return 'success';
}

export default function InventoryTable({ rows, locationId, onAdjust, filter }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState({});

  const adjust = async (row, delta) => {
    const key = `${row.product_id}:${delta}`;
    setLoading((prev) => ({ ...prev, [key]: true }));
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
    setLoading((prev) => ({ ...prev, [key]: false }));
  };

  const visible = rows.filter((r) => {
    if (filter === 'low') return r.available > 0 && r.available <= 3;
    return true;
  });

  if (visible.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-xl text-text-secondary">
        <span className="material-symbols-outlined" style={{ fontSize: 40 }}>inventory_2</span>
        <p className="font-body-md text-body-md">{t('noInventory')}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-3 overflow-y-auto pr-2">
      {visible.map((row) => {
        const tone = stockTone(row.available);
        const borderClass = tone === 'danger' ? 'border-danger' : tone === 'warning' ? 'border-warning' : 'border-outline-variant';
        const textClass = tone === 'danger' ? 'text-danger' : tone === 'warning' ? 'text-warning' : 'text-on-surface';
        const lowBar = row.available > 0 && row.available <= 3;
        return (
          <div
            key={row.product_id}
            className={`relative flex items-center justify-between rounded-md border bg-surface-container-low p-3 transition-colors hover:bg-surface-container ${borderClass} ${
              lowBar ? 'overflow-hidden' : ''
            }`}
          >
            {lowBar && <div className="absolute right-0 top-0 bottom-0 w-1 bg-danger" />}
            <div className="flex items-center gap-md">
              {row.image_url ? (
                <img src={row.image_url} alt={row.title} className="h-12 w-12 rounded object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded bg-surface-container-high">
                  <span className="material-symbols-outlined text-on-surface-variant">image</span>
                </div>
              )}
              <div>
                <p className="font-body-md text-body-md font-semibold text-on-surface">{row.title}</p>
                <p className="font-body-sm text-body-sm text-text-secondary">
                  {t('sku')}: <span className="font-mono text-sku-mono">{row.sku}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-md">
              <div className={`flex items-center overflow-hidden rounded-md border bg-surface ${borderClass}`}>
                <button
                  onClick={() => adjust(row, 1)}
                  disabled={!!loading[`${row.product_id}:1`]}
                  className={`border-l ${borderClass} px-3 py-1 text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-50`}
                >
                  {loading[`${row.product_id}:1`]
                    ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    : <span className="material-symbols-outlined text-[18px]">add</span>}
                </button>
                <span className={`px-4 font-rubik text-data-stock ${textClass}`}>{row.available}</span>
                <button
                  onClick={() => adjust(row, -1)}
                  disabled={!!loading[`${row.product_id}:-1`] || row.available === 0}
                  className={`border-r ${borderClass} px-3 py-1 text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-50`}
                >
                  {loading[`${row.product_id}:-1`]
                    ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    : <span className="material-symbols-outlined text-[18px]">remove</span>}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
