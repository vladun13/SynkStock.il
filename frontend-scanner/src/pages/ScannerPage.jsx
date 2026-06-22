import React, { useState, useEffect, useCallback } from 'react';
import Scanner from '../components/Scanner';
import ProductCard from '../components/ProductCard';
import { supabase } from '../lib/supabase';
import api from '../lib/api';
import { enqueueAction, getPendingActions, removeAction } from '../lib/db';
import { t, getLanguage, setLanguage, isRTL } from '../lib/i18n';

function generateActionId() {
  return `scanner:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

export default function ScannerPage({ session }) {
  const shopId = session.user.id;
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [inventoryCache, setInventoryCache] = useState([]);
  const [scannedProduct, setScannedProduct] = useState(null);
  const [available, setAvailable] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastScanned, setLastScanned] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [lang, setLang] = useState(getLanguage());
  const rtl = isRTL();

  useEffect(() => {
    supabase.from('locations').select('id, name').eq('shop_id', shopId).then(({ data }) => {
      setLocations(data || []);
      if (data?.length) setSelectedLocationId(data[0].id);
    });
  }, [shopId]);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const refreshPending = useCallback(async () => {
    const pending = await getPendingActions();
    setPendingCount(pending.length);
  }, []);

  const drainQueue = useCallback(async () => {
    const pending = await getPendingActions();
    for (const action of pending) {
      try {
        await api.post('/api/inventory/adjust', action);
        await removeAction(action.actionId);
      } catch (e) {
        if (e.response?.status === 409) await removeAction(action.actionId);
      }
    }
    refreshPending();
  }, [refreshPending]);

  useEffect(() => { refreshPending(); }, [refreshPending]);
  useEffect(() => { if (isOnline) drainQueue(); }, [isOnline, drainQueue]);

  const loadInventory = useCallback(async (locationId) => {
    if (!locationId) return;
    const { data } = await api.get(`/api/inventory/${locationId}`).catch(() => ({ data: [] }));
    setInventoryCache(data || []);
  }, []);

  useEffect(() => { if (selectedLocationId) loadInventory(selectedLocationId); }, [selectedLocationId, loadInventory]);

  useEffect(() => {
    if (!scannedProduct) return;
    const channel = supabase.channel('scanner-sync-rt')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'sync_logs',
        filter: `shop_id=eq.${shopId}`,
      }, (payload) => {
        if (payload.new.product_id === scannedProduct.productId && payload.new.status === 'synced') {
          setSyncStatus('synced');
        }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [scannedProduct, shopId]);

  // Shared by camera scan and manual entry: show the product card for a row.
  const selectRow = useCallback((row) => {
    setScannedProduct({
      productId: row.product_id,
      title: row.title,
      sku: row.sku,
      barcode: row.barcode,
      image_url: row.image_url,
    });
    setAvailable(row.available);
    setSyncStatus(null);
  }, []);

  const handleScan = useCallback((barcode) => {
    if (barcode === lastScanned) return;
    setLastScanned(barcode);
    const row = inventoryCache.find((r) => r.barcode === barcode);
    if (!row) { alert(t('productNotFound')); return; }
    selectRow(row);
  }, [inventoryCache, lastScanned, selectRow]);

  // Manual fallback: resolve a typed barcode OR sku against the cached inventory
  // (mirrors the backend barcodeService.resolve barcode-OR-sku lookup, offline-capable).
  const handleManualSubmit = (e) => {
    if (e) e.preventDefault();
    const code = manualCode.trim();
    if (!code) return;
    const row = inventoryCache.find((r) => r.barcode === code || r.sku === code);
    if (!row) { alert(t('productNotFound')); return; }
    selectRow(row);
    setManualCode('');
  };

  const handleAdjust = async (delta) => {
    if (!scannedProduct || !selectedLocationId) return;
    const actionId = generateActionId();
    const payload = { barcode: scannedProduct.barcode, locationId: selectedLocationId, delta, actionId };

    setAvailable((prev) => prev + delta);
    setSyncStatus('pending');
    setAdjustLoading(true);

    if (!isOnline) {
      await enqueueAction(payload);
      refreshPending();
      setAdjustLoading(false);
      return;
    }

    try {
      const { data } = await api.post('/api/inventory/adjust', payload);
      setAvailable(data.available);
    } catch (e) {
      if (e.response?.status === 409) {
        setAvailable((prev) => prev - delta);
        setSyncStatus('error');
        alert(e.response.data?.error || t('insufficientStock'));
      } else {
        await enqueueAction(payload);
        refreshPending();
      }
    }
    setAdjustLoading(false);
  };

  const toggleLang = () => {
    const next = lang === 'he' ? 'en' : 'he';
    setLang(next);
    setLanguage(next);
  };

  const tabs = [
    { key: 'scan', icon: 'qr_code_scanner', active: true },
    { key: 'products', icon: 'list_alt', active: false },
    { key: 'movements', icon: 'swap_horiz', active: false },
    { key: 'profile', icon: 'account_circle', active: false },
  ];

  return (
    <div className={`relative flex h-screen w-full flex-col overflow-hidden bg-inverse-surface font-body-sm ${rtl ? 'font-heebo' : 'font-inter'}`}>
      {/* Header overlay */}
      <header className={`absolute left-0 top-0 z-30 flex w-full items-center justify-between bg-surface/10 px-md py-sm backdrop-blur-md ${rtl ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className="bg-gradient-to-l from-primary-fixed to-secondary-fixed bg-clip-text font-rubik text-[22px] font-bold leading-tight text-transparent drop-shadow-md">
          {t('brand')}
        </div>
        <div className="flex items-center gap-sm">
          {/* Location selector */}
          <select
            value={selectedLocationId || ''}
            onChange={(e) => { setSelectedLocationId(e.target.value); setLastScanned(null); }}
            className="rounded-md border border-outline-variant/40 bg-surface/90 px-2 py-1 font-body-sm text-body-sm text-on-surface"
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{t(`locationNames.${loc.name}`, loc.name)}</option>
            ))}
          </select>
          <button
            onClick={toggleLang}
            className="flex items-center gap-1 rounded-full border border-outline-variant/40 bg-surface/90 px-2 py-1 font-label-caps text-label-caps text-on-surface"
          >
            <span className="material-symbols-outlined text-[14px]">language</span>
            {lang === 'he' ? 'EN' : 'עב'}
          </button>
          {/* Manual entry toggle */}
          <button
            onClick={() => setManualMode((m) => !m)}
            aria-pressed={manualMode}
            title={manualMode ? t('scanCamera') : t('typeCode')}
            className={`flex items-center gap-1 rounded-full border border-outline-variant/40 px-2 py-1 font-label-caps text-label-caps ${manualMode ? 'bg-primary text-on-primary' : 'bg-surface/90 text-on-surface'}`}
          >
            <span className="material-symbols-outlined text-[14px]">{manualMode ? 'photo_camera' : 'keyboard'}</span>
            <span className="hidden sm:inline">{manualMode ? t('scanCamera') : t('typeCode')}</span>
          </button>
          {/* Connection status */}
          <div className={`flex items-center gap-xs rounded-full px-sm py-[2px] font-label-caps text-label-caps shadow-sm ${isOnline ? 'bg-success/15 text-success' : 'bg-error-container text-on-error-container'}`}>
            <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              {isOnline ? 'cloud_done' : 'cloud_off'}
            </span>
            <span className="hidden sm:inline">{isOnline ? t('online') : t('offline')}</span>
          </div>
        </div>
      </header>

      {/* Main camera area */}
      <main className="relative flex flex-grow flex-col items-center justify-center overflow-hidden pb-24 pt-16">
        {/* Camera feed container */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-full w-full max-w-[420px] overflow-hidden">
            <Scanner onScan={handleScan} />
          </div>
        </div>

        {/* Manual entry panel — fallback alongside the camera */}
        {manualMode && !scannedProduct && (
          <form
            onSubmit={handleManualSubmit}
            className={`z-30 mt-[58vh] flex w-[88vw] max-w-[420px] items-center gap-sm rounded-xl border border-outline-variant/30 bg-surface/95 p-sm shadow-lg backdrop-blur-md ${rtl ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <input
              type="text"
              inputMode="text"
              autoFocus
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder={t('enterBarcodeOrSku')}
              dir={rtl ? 'rtl' : 'ltr'}
              className="min-w-0 flex-grow rounded-lg border border-outline-variant/50 bg-surface px-3 py-2 font-body text-body-md text-on-surface outline-none focus:border-primary"
            />
            <button
              type="submit"
              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 font-label-caps text-label-caps font-bold text-on-primary active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">search</span>
              <span className="hidden sm:inline">{t('lookup')}</span>
            </button>
          </form>
        )}

        {/* Scan prompt below viewfinder when no product yet */}
        {!scannedProduct && !manualMode && (
          <div className="z-20 mt-[60vh] rounded-full border border-outline-variant/30 bg-inverse-surface/60 px-md py-2 backdrop-blur-sm">
            <p className="font-headline text-headline-sm text-white drop-shadow-lg tracking-wide">{t('scanPrompt')}</p>
          </div>
        )}

        {/* Product result card slides up over camera */}
        {scannedProduct && (
          <div className="absolute bottom-24 left-0 right-0 z-40 px-md">
            <ProductCard
              product={scannedProduct}
              available={available}
              syncStatus={syncStatus}
              onAdjust={handleAdjust}
              loading={adjustLoading}
            />
          </div>
        )}
      </main>

      {/* Pending scans warning bar */}
      {pendingCount > 0 && (
        <div className={`absolute bottom-20 left-0 z-40 flex w-full items-center justify-center gap-2 bg-warning py-2 font-label-caps text-label-caps text-on-tertiary-fixed shadow-[0_-2px_10px_rgba(245,158,11,0.3)]`}>
          <span className="material-symbols-outlined text-[16px]">sync_problem</span>
          {pendingCount} {t('scansPending')}
        </div>
      )}

      {/* Bottom navigation */}
      <nav className={`fixed bottom-0 left-0 z-50 flex h-20 w-full items-center justify-around rounded-t-xl bg-surface px-md shadow-[0_-4px_10px_rgba(0,0,0,0.05)] ${rtl ? 'flex-row-reverse' : 'flex-row'}`}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`flex w-16 flex-col items-center justify-center rounded-2xl py-1 transition-transform active:scale-90 ${
              tab.active ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: tab.active ? "'FILL' 1" : "'FILL' 0" }}>
              {tab.icon}
            </span>
            <span className="mt-1 font-body-sm text-body-sm font-medium">{t(tab.key)}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
