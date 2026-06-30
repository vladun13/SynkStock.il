import { APIRequestContext } from '@playwright/test';
import { SUPABASE_URL, SUPABASE_ANON_KEY, DEMO_EMAIL, DEMO_PASSWORD } from './env';

/** Supabase password grant → JWT. The backend expects this as `Bearer <token>`. */
export async function login(request: APIRequestContext) {
  const res = await request.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      data: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
    }
  );
  if (!res.ok()) {
    throw new Error(`Supabase login failed: ${res.status()} ${await res.text()}`);
  }
  const j = await res.json();
  return { token: j.access_token as string, userId: j.user.id as string };
}

/** Read through PostgREST with the user's JWT (RLS scopes rows to this shop). */
export async function rest<T = any>(
  request: APIRequestContext,
  token: string,
  pathAndQuery: string
): Promise<T> {
  const res = await request.get(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!res.ok()) {
    throw new Error(`REST ${pathAndQuery} -> ${res.status()} ${await res.text()}`);
  }
  return res.json();
}

export type InvRow = {
  available: number;
  location_id: string;
  product_id: string;
  products: { title: string; barcode: string; sku: string };
};

export function getLocations(request: APIRequestContext, token: string) {
  return rest(
    request,
    token,
    'locations?select=id,name,shopify_location_id&order=shopify_location_id'
  ) as Promise<{ id: string; name: string; shopify_location_id: string }[]>;
}

/** First inventory row at an exact quantity (e.g. a product sitting at 1). */
export async function findOneAtQty(
  request: APIRequestContext,
  token: string,
  qty: number
): Promise<InvRow> {
  const rows = await rest<InvRow[]>(
    request,
    token,
    `inventory_levels?available=eq.${qty}&select=available,location_id,product_id,products(title,barcode,sku)&limit=1`
  );
  if (!rows.length) throw new Error(`No inventory row found at qty=${qty}`);
  return rows[0];
}

export async function inventoryForLocation(
  request: APIRequestContext,
  token: string,
  locationId: string
): Promise<InvRow[]> {
  return rest<InvRow[]>(
    request,
    token,
    `inventory_levels?location_id=eq.${locationId}&select=available,location_id,product_id,products(title,barcode,sku)&order=available.desc`
  );
}

export async function getQty(
  request: APIRequestContext,
  token: string,
  productId: string,
  locationId: string
): Promise<number> {
  const rows = await rest<{ available: number }[]>(
    request,
    token,
    `inventory_levels?product_id=eq.${productId}&location_id=eq.${locationId}&select=available`
  );
  return rows[0]?.available;
}
