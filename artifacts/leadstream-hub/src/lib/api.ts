// All API calls go through the Replit path-based proxy to /api/*
const BASE = "/api";

async function request<T>(
  path: string,
  opts?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json() as { error?: string };
      message = body.error ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export interface AppSettings {
  stripe_publishable_key: string;
  zelle_phone: string;
  zelle_name: string;
}

export function fetchSettings(): Promise<AppSettings> {
  return request<AppSettings>("/settings");
}

export function createPaymentIntent(
  amountCents: number,
  opts?: { email?: string; name?: string }
): Promise<{
  client_secret: string;
  payment_intent_id: string;
  customer_id: string | null;
}> {
  return request("/orders/payment-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount_cents: amountCents, ...opts }),
  });
}

export async function uploadFile(file: File): Promise<{
  file_id: string;
  url: string;
  path: string;
}> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${BASE}/orders/upload`, { method: "POST", body: fd });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { msg = ((await res.json()) as { error?: string }).error ?? msg; } catch { /* */ }
    throw new Error(msg);
  }
  return res.json() as Promise<{ file_id: string; url: string; path: string }>;
}

export interface OrderItem {
  category: string;
  type: string;
  quantity: number;
  price_cents: number;
  savings_cents?: number;
}

export interface SubmitOrderPayload {
  customer: {
    first_name: string;
    last_name: string;
    agency_name?: string;
    phone: string;
    email: string;
  };
  items: OrderItem[];
  payment: {
    method: "card" | "zelle";
    payment_intent_id?: string;
    zelle_file_id?: string;
  };
  default_settings?: Record<string, unknown>;
  product_answers?: Record<string, Record<string, unknown>>;
  additional_instructions?: string;
}

export function submitOrder(payload: SubmitOrderPayload): Promise<{
  order_number: string;
  order_id: string;
}> {
  return request("/orders/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
