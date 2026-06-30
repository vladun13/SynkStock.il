import { APIRequestContext } from '@playwright/test';
import { API_URL } from './env';

export type AdjustBody = {
  barcode: string;
  locationId: string;
  delta: number;
  actionId: string;
};

/** POST /api/inventory/adjust — 200 {available, syncStatus}; 409 on oversell/duplicate. */
export function adjust(
  request: APIRequestContext,
  token: string,
  body: AdjustBody
) {
  return request.post(`${API_URL}/api/inventory/adjust`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: body,
  });
}

/** POST /api/demo/reset — restores seeded stock (DEMO_MODE only). */
export function resetDemo(request: APIRequestContext, token: string) {
  return request.post(`${API_URL}/api/demo/reset`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function genActionId(prefix = 'e2e') {
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}
