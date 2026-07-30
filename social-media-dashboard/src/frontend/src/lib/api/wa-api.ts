/**
 * Typed fetch helpers for the FastAPI WhatsApp Business backend.
 *
 * Usage:
 *   import { getWAOverview } from '@/lib/api/wa-api';
 *   const data = await getWAOverview();
 *
 * Configure NEXT_PUBLIC_API_BASE_URL in .env.local (defaults to http://localhost:8000).
 */

const BASE_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) ||
  'http://localhost:8000';

// ── Shared types ─────────────────────────────────────────────────────────────

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

// ── Response types ────────────────────────────────────────────────────────────

export interface WAOverview {
  conversations: number;
  conversations_change: number;
  messages_sent: number;
  messages_sent_change: number;
  messages_received: number;
  messages_received_change: number;
  messages_delivered: number;
  delivery_rate: number;
  messages_read: number;
  read_rate: number;
  avg_response_time_minutes: number;
  avg_response_time_change: number;
  period_days: number;
}

export interface WAMessageVolume {
  series: TimeSeriesPoint[];
  total_sent: number;
  total_received: number;
  period_days: number;
}

export interface WAConversations {
  series: TimeSeriesPoint[];
  total: number;
  user_initiated: number;
  business_initiated: number;
  period_days: number;
}

export interface WATemplateMetric {
  template_name: string;
  sent: number;
  delivered: number;
  read: number;
  delivery_rate: number;
  read_rate: number;
  category: string;
}

export interface WATemplatePerformance {
  templates: WATemplateMetric[];
  period_days: number;
}

export interface WAResponseTime {
  series: TimeSeriesPoint[];
  avg_minutes: number;
  median_minutes: number;
  p95_minutes: number;
  period_days: number;
}

export interface WAQualityMetrics {
  quality_rating: string;
  messaging_limit: string;
  phone_number_status: string;
  current_tier: string;
}

export interface WAHourlyDistribution {
  hour: number;
  sent: number;
  received: number;
}

export interface WAMessageDistribution {
  hourly: WAHourlyDistribution[];
  busiest_hour: number;
  quietest_hour: number;
  period_days: number;
}

export interface WAUnsupportedMetric {
  metric: string;
  reason: string;
  available_alternative: string | null;
}

export interface WALimitations {
  unsupported: WAUnsupportedMetric[];
  note: string;
}

// ── Fetch helper ──────────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`WhatsApp API ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Overview metrics — conversations, messages, delivery/read rates. */
export function getWAOverview(days = 30): Promise<WAOverview> {
  return apiFetch<WAOverview>('/api/wa/overview', { days: String(days) });
}

/** Message volume time series + totals. */
export function getWAMessageVolume(days = 30): Promise<WAMessageVolume> {
  return apiFetch<WAMessageVolume>('/api/wa/message-volume', { days: String(days) });
}

/** Conversation breakdown — user vs business initiated. */
export function getWAConversations(days = 30): Promise<WAConversations> {
  return apiFetch<WAConversations>('/api/wa/conversations', { days: String(days) });
}

/** Template message performance — delivery and read rates per template. */
export function getWATemplatePerformance(days = 30): Promise<WATemplatePerformance> {
  return apiFetch<WATemplatePerformance>('/api/wa/template-performance', { days: String(days) });
}

/** Response time statistics — average, median, p95 + time series. */
export function getWAResponseTime(days = 30): Promise<WAResponseTime> {
  return apiFetch<WAResponseTime>('/api/wa/response-time', { days: String(days) });
}

/** Account quality — rating, tier, phone status. */
export function getWAQuality(): Promise<WAQualityMetrics> {
  return apiFetch<WAQualityMetrics>('/api/wa/quality');
}

/** Message distribution by hour of day. */
export function getWAMessageDistribution(days = 30): Promise<WAMessageDistribution> {
  return apiFetch<WAMessageDistribution>('/api/wa/message-distribution', { days: String(days) });
}

/** API limitations — metrics unavailable on WhatsApp Business API. */
export function getWALimitations(): Promise<WALimitations> {
  return apiFetch<WALimitations>('/api/wa/limitations');
}
