import React, { useEffect, useState } from 'react';
import { Page, Card, DataTable, Badge, Spinner } from '@shopify/polaris';
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
    const { data } = await supabase.from('sync_logs')
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
    const channel = supabase.channel('sync-logs-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sync_logs', filter: `shop_id=eq.${shopId}` }, () => fetchLogs(shopId))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sync_logs', filter: `shop_id=eq.${shopId}` }, () => fetchLogs(shopId))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [shopId]);

  const rows = logs.map(log => [
    t(`origin_${log.origin}`) || log.origin,
    log.products?.title || '—',
    log.delta > 0 ? `+${log.delta}` : String(log.delta),
    log.available_after,
    log.locations?.name || '—',
    <SyncBadge status={log.status} />,
    new Date(log.created_at).toLocaleString(i18n?.language || 'he-IL'),
  ]);

  return (
    <Page title={t('activity')}>
      <Card>
        {loading
          ? <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>
          : <DataTable
              columnContentTypes={['text', 'text', 'numeric', 'numeric', 'text', 'text', 'text']}
              headings={[t('source'), t('product'), t('change'), t('after'), t('location'), t('status'), t('time')]}
              rows={rows}
            />
        }
      </Card>
    </Page>
  );
}
