import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../lib/i18n';
import { supabase } from '../lib/supabase';
import SyncBadge from '../components/SyncBadge';

export default function ActivityPage() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shopId, setShopId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setShopId(session?.user?.id));
  }, []);

  const fetchLogs = async (id) => {
    const { data } = await supabase
      .from('sync_logs')
      .select('id, origin, delta, available_after, status, created_at, products(title), locations(name)')
      .eq('shop_id', id)
      .order('created_at', { ascending: false })
      .limit(50);
    setLogs(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!shopId) return;
    fetchLogs(shopId);
    const channel = supabase
      .channel('sync-logs-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sync_logs', filter: `shop_id=eq.${shopId}` }, () => fetchLogs(shopId))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sync_logs', filter: `shop_id=eq.${shopId}` }, () => fetchLogs(shopId))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [shopId]);

  return (
    <div className="space-y-lg">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">history</span>
        <h2 className="font-headline text-headline-md text-on-surface">{t('activity')}</h2>
      </div>

      <div className="overflow-hidden rounded-lg bg-surface shadow-card">
        {loading ? (
          <div className="flex items-center justify-center py-xl">
            <span className="material-symbols-outlined animate-spin text-primary" style={{ fontSize: 32 }}>progress_activity</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-xl text-text-secondary">
            <span className="material-symbols-outlined" style={{ fontSize: 40 }}>history</span>
            <p className="font-body-md text-body-md">{t('noSyncLogs')}</p>
          </div>
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="divide-y divide-border-subtle md:hidden">
              {logs.map((log) => (
                <div key={log.id} className="space-y-2 p-md">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 font-body-sm text-body-sm">
                      <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                        {log.origin === 'scan' ? 'qr_code_scanner' : log.origin === 'order' ? 'shopping_cart' : 'edit'}
                      </span>
                      {t(`origin_${log.origin}`) || log.origin}
                    </span>
                    <SyncBadge status={log.status} />
                  </div>
                  <p className="font-body-md text-body-md font-medium text-on-surface">{log.products?.title || '—'}</p>
                  <div className="flex items-center justify-between font-body-sm text-body-sm">
                    <span className={log.delta > 0 ? 'text-success' : 'text-danger'}>
                      {log.delta > 0 ? `+${log.delta}` : log.delta} → {log.available_after}
                    </span>
                    <span className="text-text-secondary">{log.locations?.name ? t(`locationNames.${log.locations.name}`, { defaultValue: log.locations.name }) : '—'}</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-text-secondary">
                    {new Date(log.created_at).toLocaleString(i18n?.language || 'he-IL')}
                  </p>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-right">
                <thead className="bg-surface-container-low font-label-caps text-label-caps text-on-surface-variant">
                  <tr>
                    <th className="p-md font-semibold">{t('source')}</th>
                    <th className="p-md font-semibold">{t('product')}</th>
                    <th className="p-md font-semibold">{t('change')}</th>
                    <th className="p-md font-semibold">{t('after')}</th>
                    <th className="p-md font-semibold">{t('location')}</th>
                    <th className="p-md font-semibold">{t('status')}</th>
                    <th className="p-md font-semibold">{t('time')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-container-low">
                      <td className="p-md font-body-sm text-body-sm">
                        <span className="inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                            {log.origin === 'scan' ? 'qr_code_scanner' : log.origin === 'order' ? 'shopping_cart' : 'edit'}
                          </span>
                          {t(`origin_${log.origin}`) || log.origin}
                        </span>
                      </td>
                      <td className="p-md font-body-sm text-body-sm font-medium text-on-surface">{log.products?.title || '—'}</td>
                      <td className="p-md font-body-sm text-body-sm font-mono">
                        <span className={log.delta > 0 ? 'text-success' : 'text-danger'}>
                          {log.delta > 0 ? `+${log.delta}` : log.delta}
                        </span>
                      </td>
                      <td className="p-md font-body-sm text-body-sm font-mono text-on-surface">{log.available_after}</td>
                      <td className="p-md font-body-sm text-body-sm text-text-secondary">{log.locations?.name ? t(`locationNames.${log.locations.name}`, { defaultValue: log.locations.name }) : '—'}</td>
                      <td className="p-md"><SyncBadge status={log.status} /></td>
                      <td className="p-md font-body-sm text-body-sm text-text-secondary">
                        {new Date(log.created_at).toLocaleString(i18n?.language || 'he-IL')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
