import React, { useEffect, useState, useCallback } from 'react';
import { Page, Layout, Card, Tabs, Spinner, Text, InlineStack, Box, Button, Banner, Modal } from '@shopify/polaris';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import api from '../lib/api';
import InventoryTable from '../components/InventoryTable';

function StatCard({ label, value, bg }) {
  return (
    <div style={{ background: bg, borderRadius: 8, padding: '16px 24px', minWidth: 140 }}>
      <Text as="p" variant="bodyMd">{label}</Text>
      <Text as="p" variant="headingXl">{value}</Text>
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
  const [simulateOpen, setSimulateOpen] = useState(false);
  const [simulateLoading, setSimulateLoading] = useState(false);
  const [simulateMessage, setSimulateMessage] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const id = session?.user?.id;
      setShopId(id);
      if (!id) return;
      supabase.from('locations').select('id, name').eq('shop_id', id).then(({ data }) => {
        setLocations(data || []);
      });
      const since = new Date(Date.now() - 86400000).toISOString();
      supabase.from('sync_logs').select('status').eq('shop_id', id).gte('created_at', since).then(({ data: logs }) => {
        if (logs?.length) {
          setSyncHealth(Math.round((logs.filter(r => r.status === 'synced').length / logs.length) * 100));
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

  const selectedLocationId = locations[selectedTab]?.id;

  useEffect(() => {
    if (selectedLocationId) fetchInventory(selectedLocationId);
  }, [selectedLocationId, fetchInventory]);

  useEffect(() => {
    if (!selectedLocationId) return;
    const channel = supabase.channel('inv-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_levels' }, () => {
        fetchInventory(selectedLocationId);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [selectedLocationId, fetchInventory]);

  const handleSimulateOrder = async () => {
    setSimulateLoading(true);
    try {
      // Use the first product with available stock in the selected location
      const row = inventory.find(r => r.available > 0);
      if (!row || !selectedLocationId) {
        setSimulateMessage({ tone: 'warning', text: 'No in-stock product to simulate' });
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
      setSimulateMessage({ tone: 'critical', text: e.response?.data?.error || 'Error' });
    }
    setSimulateLoading(false);
    setSimulateOpen(false);
  };

  const totalSKUs = inventory.length;
  const lowStock = inventory.filter(r => r.available > 0 && r.available <= 3).length;
  const outOfStock = inventory.filter(r => r.available === 0).length;
  const tabs = locations.map(loc => ({ id: loc.id, content: loc.name }));

  return (
    <Page title={t('dashboard')}>
      {simulateMessage && (
        <div style={{ marginBottom: 16 }}>
          <Banner tone={simulateMessage.tone} onDismiss={() => setSimulateMessage(null)}>
            {simulateMessage.text}
          </Banner>
        </div>
      )}
      <Layout>
        <Layout.Section>
          <InlineStack gap="400" wrap={false}>
            <StatCard label={t('totalSKUs')} value={totalSKUs} bg="#E4E5E7" />
            <StatCard label={t('lowStock')} value={lowStock} bg="#FFD79D" />
            <StatCard label={t('outOfStock')} value={outOfStock} bg="#FEAD9A" />
            <StatCard label={t('syncHealth')} value={syncHealth !== null ? `${syncHealth}%` : '—'} bg="#AEE9D1" />
          </InlineStack>
        </Layout.Section>
        <Layout.Section>
          <InlineStack gap="400" align="end">
            <Button onClick={() => setSimulateOpen(true)}>{t('simulateOrder')}</Button>
          </InlineStack>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab} />
            <Box padding="0">
              {loading
                ? <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>
                : <InventoryTable rows={inventory} locationId={selectedLocationId} onAdjust={() => fetchInventory(selectedLocationId)} />
              }
            </Box>
          </Card>
        </Layout.Section>
      </Layout>

      <Modal
        open={simulateOpen}
        onClose={() => setSimulateOpen(false)}
        title={t('simulateOrder')}
        primaryAction={{ content: t('simulate'), loading: simulateLoading, onAction: handleSimulateOrder }}
        secondaryActions={[{ content: t('cancel'), onAction: () => setSimulateOpen(false) }]}
      >
        <Modal.Section><Text>{t('simulateOrderConfirm')}</Text></Modal.Section>
      </Modal>
    </Page>
  );
}
