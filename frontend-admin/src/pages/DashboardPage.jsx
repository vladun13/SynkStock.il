import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import api from '../lib/api';
import InventoryTable from '../components/InventoryTable';

function StatCard({ label, value, tone = 'primary', icon }) {
  const border = {
    primary: 'border-primary',
    danger: 'border-danger',
    success: 'border-success',
    secondary: 'border-secondary',
  }[tone];
  const valueColor = tone === 'danger' ? 'text-danger' : 'text-on-surface';
  return (
    <div className={`flex h-24 flex-col justify-between rounded-lg border-l-4 ${border} bg-surface p-md shadow-card`}>
      <div className="flex items-center justify-between">
        <span className="font-body-sm text-body-sm text-text-secondary">{label}</span>
        <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>{icon}</span>
      </div>
      <span className={`font-rubik text-display-lg ${valueColor}`}>{value}</span>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const [locations, setLocations] = useState([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncHealth, setSyncHealth] = useState(null);
  const [shopId, setShopId] = useState(null);
  const [syncLogs, setSyncLogs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [simulateOpen, setSimulateOpen] = useState(false);
  const [simulateLoading, setSimulateLoading] = useState(false);
  const [simulateMessage, setSimulateMessage] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const id = session?.user?.id;
      setShopId(id);
      if (!id) return;
      supabase.from('locations').select('id, name').eq('shop_id', id).then(({ data }) => setLocations(data || []));
      const since = new Date(Date.now() - 86400000).toISOString();
      supabase.from('sync_logs').select('status').eq('shop_id', id).gte('created_at', since).then(({ data: logs }) => {
        if (logs?.length) {
          setSyncHealth(Math.round((logs.filter((r) => r.status === 'synced').length / logs.length) * 100));
        } else {
          setSyncHealth(100);
        }
      });
    });
  }, []);

  const fetchInventory = useCallback(async (locationId) => {
    if (!locationId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/api/inventory/${locationId}`);
      setInventory(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  const fetchLogs = useCallback(async (id) => {
    if (!id) return;
    const { data } = await supabase
      .from('sync_logs')
      .select('id, origin, delta, available_after, status, created_at, products(title), locations(name)')
      .eq('shop_id', id)
      .order('created_at', { ascending: false })
      .limit(12);
    setSyncLogs(data || []);
  }, []);

  const selectedLocationId = locations[selectedTab]?.id;

  useEffect(() => {
    if (selectedLocationId) fetchInventory(selectedLocationId);
  }, [selectedLocationId, fetchInventory]);

  useEffect(() => {
    if (shopId) fetchLogs(shopId);
  }, [shopId, fetchLogs]);

  useEffect(() => {
    if (!selectedLocationId) return;
    const channel = supabase
      .channel('inv-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_levels' }, () => {
        fetchInventory(selectedLocationId);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [selectedLocationId, fetchInventory]);

  useEffect(() => {
    if (!shopId) return;
    const channel = supabase
      .channel('sync-logs-dash')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sync_logs', filter: `shop_id=eq.${shopId}` }, () => fetchLogs(shopId))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sync_logs', filter: `shop_id=eq.${shopId}` }, () => fetchLogs(shopId))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [shopId, fetchLogs]);

  const handleSimulateOrder = async () => {
    setSimulateLoading(true);
    try {
      const row = inventory.find((r) => r.available > 0);
      if (!row || !selectedLocationId) {
        setSimulateMessage({ tone: 'warning', text: t('noInventory') });
        setSimulateLoading(false);
        setSimulateOpen(false);
        return;
      }
      await api.post('/api/orders/webhook', {
        order_id: `demo-${Date.now()}`,
        webhook_id: `wh-demo-${Date.now()}`,
        line_items: [{ barcode: row.barcode, quantity: 1, location_id: selectedLocationId }],
      });
      setSimulateMessage({ tone: 'success', text: t('orderSimulated') });
    } catch (e) {
      setSimulateMessage({ tone: 'danger', text: e.response?.data?.error || 'Error' });
    }
    setSimulateLoading(false);
    setSimulateOpen(false);
  };

  const totalSKUs = inventory.length;
  const lowStock = inventory.filter((r) => r.available > 0 && r.available <= 3).length;
  const todaySales = syncLogs.filter((l) => l.origin === 'order').length;

  const bannerTone =
    simulateMessage?.tone === 'success'
      ? 'bg-success/10 text-success border-success'
      : simulateMessage?.tone === 'warning'
      ? 'bg-warning/10 text-warning border-warning'
      : 'bg-danger/10 text-danger border-danger';

  return (
    <div className="space-y-lg">
      {simulateMessage && (
        <div className={`flex items-center justify-between rounded-lg border p-md ${bannerTone}`}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              {simulateMessage.tone === 'success' ? 'check_circle' : simulateMessage.tone === 'warning' ? 'warning' : 'error'}
            </span>
            <span className="font-body-md text-body-md">{simulateMessage.text}</span>
          </div>
          <button onClick={() => setSimulateMessage(null)} className="rounded-full p-1 hover:bg-surface">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-md md:grid-cols-4">
        <StatCard label={t('totalSKUs')} value={totalSKUs} tone="primary" icon="inventory_2" />
        <StatCard label={t('lowStock')} value={lowStock} tone="danger" icon="warning" />
        <StatCard label={t('salesToday')} value={todaySales} tone="success" icon="trending_up" />
        <StatCard
          label={t('syncHealth')}
          value={syncHealth !== null ? `${syncHealth}%` : '—'}
          tone="secondary"
          icon="sync"
        />
      </div>

      {/* Location tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {locations.map((loc, i) => (
          <button
            key={loc.id}
            onClick={() => setSelectedTab(i)}
            className={`rounded-full px-4 py-1.5 font-label-caps text-label-caps transition-colors ${
              i === selectedTab ? 'bg-primary text-on-primary' : 'bg-surface text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            {loc.name}
          </button>
        ))}
      </div>

      {/* Main panels */}
      <div className="grid grid-cols-1 gap-gutter">
        {/* Warehouse management */}
        <div className="flex min-h-[440px] flex-col rounded-lg bg-surface p-md shadow-card md:p-lg">
          <div className="mb-md flex flex-col gap-sm border-b border-border-subtle pb-sm sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-headline text-headline-sm text-on-surface">
              {t('mainWarehouse')}
              {locations[selectedTab]?.name ? ` — ${locations[selectedTab].name}` : ''}
            </h3>
            <button onClick={() => setSimulateOpen(true)} className="btn-primary self-start sm:self-auto">
              <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
              <span className="hidden sm:inline">{t('simulateOrder')}</span>
            </button>
          </div>
          {/* Filters */}
          <div className="mb-md flex gap-4">
            <button
              onClick={() => setFilter('all')}
              className={`border-b-2 pb-1 font-body-sm text-body-sm transition-colors ${
                filter === 'all' ? 'border-primary font-bold text-primary' : 'border-transparent text-text-secondary hover:text-primary'
              }`}
            >
              {t('all')}
            </button>
            <button
              onClick={() => setFilter('low')}
              className={`border-b-2 pb-1 font-body-sm text-body-sm transition-colors ${
                filter === 'low' ? 'border-primary font-bold text-primary' : 'border-transparent text-text-secondary hover:text-primary'
              }`}
            >
              {t('lowStockOnly')}
            </button>
          </div>
          {loading ? (
            <div className="flex flex-1 items-center justify-center">
              <span className="material-symbols-outlined animate-spin text-primary" style={{ fontSize: 32 }}>progress_activity</span>
            </div>
          ) : (
            <InventoryTable rows={inventory} locationId={selectedLocationId} onAdjust={() => fetchInventory(selectedLocationId)} filter={filter} />
          )}
        </div>

        {/* Shopify live view */}
        <div className="flex min-h-[440px] flex-col rounded-lg bg-surface p-md shadow-card md:p-lg">
          <div className="mb-md flex items-center gap-2 border-b border-border-subtle pb-sm">
            <span className="material-symbols-outlined text-success">storefront</span>
            <h3 className="font-headline text-headline-sm text-on-surface">{t('shopifyLive')}</h3>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto">
            {syncLogs.length === 0 && (
              <p className="py-md text-center font-body-sm text-body-sm text-text-secondary">{t('noSyncLogs')}</p>
            )}
            {syncLogs.map((log) => {
              const ok = log.status === 'synced';
              return (
                <div key={log.id} className="flex items-start gap-3 border-b border-border-subtle pb-3 last:border-0">
                  <div
                    className={`mt-1 rounded-full p-1 ${ok ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}
                  >
                    <span className="material-symbols-outlined block text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {ok ? 'check_circle' : 'sync_problem'}
                    </span>
                  </div>
                  <div>
                    <p className="font-body-sm text-body-sm font-semibold text-on-surface">
                      {log.products?.title || '—'}
                    </p>
                    <p className="font-body-sm text-body-sm text-text-secondary">
                      {t(`origin_${log.origin}`) || log.origin} · {log.delta > 0 ? '+' : ''}{log.delta} → {log.available_after}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sync log */}
      <div className="rounded-lg bg-surface p-lg shadow-card">
        <h3 className="mb-md font-headline text-headline-sm text-on-surface">{t('syncLog')}</h3>
        <div className="h-32 space-y-2 overflow-y-auto rounded border border-outline-variant bg-surface-container-low p-md font-mono text-sku-mono text-text-secondary">
          {syncLogs.length === 0 ? (
            <span>{t('noSyncLogs')}</span>
          ) : (
            syncLogs.slice(0, 8).map((log) => {
              const ok = log.status === 'synced';
              const time = new Date(log.created_at).toLocaleTimeString('en-GB');
              return (
                <div key={log.id} className="flex gap-4">
                  <span className="w-20 shrink-0 text-on-surface-variant">[{time}]</span>
                  <span className={ok ? 'text-success' : 'text-warning'}>
                    {ok ? 'SUCCESS' : 'PENDING'}: {log.products?.title || '—'} ({log.delta > 0 ? '+' : ''}{log.delta}) — {log.status}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Simulate order modal */}
      {simulateOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-xl bg-surface p-lg shadow-card-elevated">
            <div className="mb-md flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">shopping_cart</span>
              <h3 className="font-headline text-headline-sm text-on-surface">{t('simulateOrder')}</h3>
            </div>
            <p className="mb-lg font-body-md text-body-md text-on-surface-variant">{t('simulateOrderConfirm')}</p>
            <div className="flex justify-end gap-sm">
              <button onClick={() => setSimulateOpen(false)} className="btn-ghost">{t('cancel')}</button>
              <button onClick={handleSimulateOrder} disabled={simulateLoading} className="btn-primary">
                {simulateLoading && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
                {t('simulate')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
