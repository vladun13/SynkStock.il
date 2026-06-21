import React, { useState, useEffect, useCallback } from 'react';
import Scanner from '../components/Scanner';
import ProductCard from '../components/ProductCard';
import { supabase } from '../lib/supabase';
import api from '../lib/api';
import { enqueueAction, getPendingActions, removeAction } from '../lib/db';
import { t, getLanguage, setLanguage } from '../lib/i18n';

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
  const [lang, setLang] = useState(getLanguage());

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
  }, []);

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

  const handleScan = useCallback((barcode) => {
    if (barcode === lastScanned) return;
    setLastScanned(barcode);
    const row = inventoryCache.find(r => r.barcode === barcode);
    if (!row) { alert(t('productNotFound')); return; }
    setScannedProduct({
      productId: row.product_id,
      title: row.title,
      sku: row.sku,
      barcode: row.barcode,
      image_url: row.image_url,
    });
    setAvailable(row.available);
    setSyncStatus(null);
  }, [inventoryCache, lastScanned]);

  const handleAdjust = async (delta) => {
    if (!scannedProduct || !selectedLocationId) return;
    const actionId = generateActionId();
    const payload = { barcode: scannedProduct.barcode, locationId: selectedLocationId, delta, actionId };

    setAvailable(prev => prev + delta);
    setSyncStatus('pending');
    setAdjustLoading(true);

    if (!isOnline) {
      await enqueueAction(payload);
      setAdjustLoading(false);
      return;
    }

    try {
      const { data } = await api.post('/api/inventory/adjust', payload);
      setAvailable(data.available);
    } catch (e) {
      if (e.response?.status === 409) {
        setAvailable(prev => prev - delta);
        setSyncStatus('error');
        alert(e.response.data?.error || t('error'));
      } else {
        await enqueueAction(payload);
      }
    }
    setAdjustLoading(false);
  };

  const toggleLang = () => {
    const next = lang === 'he' ? 'en' : 'he';
    setLang(next);
    setLanguage(next);
  };

  return (
    <div dir={lang === 'he' ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: '#F6F6F7', fontFamily: 'Heebo, sans-serif', paddingBottom: 40 }}>
      <div style={{
        background: '#008060',
        color: 'white',
        padding: '12px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontWeight: 700, fontSize: 18 }}>SyncStock</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={selectedLocationId || ''} onChange={e => { setSelectedLocationId(e.target.value); setLastScanned(null); }}
            style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 14 }}>
            {locations.map(loc => <option key={loc.id} value={loc.id} style={{ color: 'black' }}>{loc.name}</option>)}
          </select>
          <button onClick={toggleLang}
            style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer' }}>
            {lang === 'he' ? 'EN' : 'עב'}
          </button>
          {!isOnline && <span style={{ fontSize: 12, background: '#FFD79D', color: '#7E5700', borderRadius: 12, padding: '2px 8px' }}>{t('offline')}</span>}
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {selectedLocationId && <Scanner onScan={handleScan} />}
      </div>

      {scannedProduct
        ? <ProductCard product={scannedProduct} available={available} syncStatus={syncStatus}
            onAdjust={handleAdjust} loading={adjustLoading} />
        : <div style={{ textAlign: 'center', color: '#637381', marginTop: 16 }}>{t('scanPrompt')}</div>
      }
    </div>
  );
}
