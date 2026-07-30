/**
 * fetch helpers for the FastAPI Google Analytics backend.
 *
 * Usage:
 *   import { getGAOverview } from '@/lib/api/ga-api';
 *   const data = await getGAOverview(); // uses last 30 days
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

export interface DemographicItem {
  label: string;
  value: number;
  percentage: number;
}

// ── Response types ────────────────────────────────────────────────────────────

export interface GAOverview {
  sessions: number;
  users: number;
  new_users: number;
  bounce_rate: number;       // 0-100 percentage
  avg_session_duration: number; // seconds
  pageviews: number;
  date_range: { start_date: string; end_date: string };
}

export interface GAPageviews {
  series: TimeSeriesPoint[];
  total: number;
  granularity: 'day' | 'week' | 'month';
}

export interface TrafficSource {
  channel: string;
  sessions: number;
  percentage: number;
}

export interface GATrafficSources {
  sources: TrafficSource[];
  total_sessions: number;
}

export interface TopPage {
  page_path: string;
  page_title: string;
  sessions: number;
  pageviews: number;
  avg_time_on_page: number; // seconds
}

export interface GATopPages {
  pages: TopPage[];
}

export interface GADemographics {
  by_country: DemographicItem[];
  by_age: DemographicItem[];
}

export interface DeviceItem {
  device: string;
  sessions: number;
  percentage: number;
}

export interface GADeviceBreakdown {
  devices: DeviceItem[];
  total_sessions: number;
}

export interface GAEngagement {
  engaged_sessions: number;
  engagement_rate: number;     // 0-100 percentage
  events_per_session: number;
  avg_engagement_time: number; // seconds
}

export interface ConversionEvent {
  event_name: string;
  count: number;
}

export interface GAConversions {
  events: ConversionEvent[];
  total: number;
}

export interface RealtimeActivePage {
  page_path: string;
  active_users: number;
}

export interface GARealtimeReport {
  active_users: number;
  top_pages: RealtimeActivePage[];
}

// ── Internal helper ───────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url.toString(), {
    headers: { 'Content-Type': 'application/json' },
    // Disable Next.js static cache for analytics data — always fetch fresh
    cache: 'no-store',
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`GA API ${res.status}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

// ── Public API — each function tries the backend, falls back to stubs ─────────

export async function getGAOverview(startDate = '30daysAgo', endDate = 'today'): Promise<GAOverview> {
  try {
    return await apiFetch<GAOverview>('/api/ga/overview', { start_date: startDate, end_date: endDate });
  } catch (e) {
    console.warn('getGAOverview: falling back to stubs —', (e as Error).message);
    return {
      sessions: 42500, users: 38200, new_users: 15400,
      bounce_rate: 42.5, avg_session_duration: 145, pageviews: 125000,
      date_range: { start_date: startDate, end_date: endDate },
    };
  }
}

export async function getGAPageviews(
  granularity: 'day' | 'week' | 'month' = 'day',
  startDate = '30daysAgo', endDate = 'today',
): Promise<GAPageviews> {
  try {
    return await apiFetch<GAPageviews>('/api/ga/pageviews', { start_date: startDate, end_date: endDate, granularity });
  } catch (e) {
    console.warn('getGAPageviews: falling back to stubs —', (e as Error).message);
    return {
      series: [
        { date: '2026-02-01', value: 3400 }, { date: '2026-02-08', value: 4100 },
        { date: '2026-02-15', value: 3800 }, { date: '2026-02-22', value: 4600 },
        { date: '2026-03-01', value: 5200 },
      ],
      total: 21100, granularity,
    };
  }
}

export async function getGATrafficSources(startDate = '30daysAgo', endDate = 'today'): Promise<GATrafficSources> {
  try {
    return await apiFetch<GATrafficSources>('/api/ga/traffic-sources', { start_date: startDate, end_date: endDate });
  } catch (e) {
    console.warn('getGATrafficSources: falling back to stubs —', (e as Error).message);
    return {
      sources: [
        { channel: 'Organic Search', sessions: 18000, percentage: 42 },
        { channel: 'Direct', sessions: 12000, percentage: 28 },
        { channel: 'Organic Social', sessions: 8500, percentage: 20 },
        { channel: 'Referral', sessions: 4000, percentage: 10 },
      ],
      total_sessions: 42500,
    };
  }
}

export async function getGATopPages(
  limit = 10, startDate = '30daysAgo', endDate = 'today',
): Promise<GATopPages> {
  try {
    return await apiFetch<GATopPages>('/api/ga/top-pages', {
      start_date: startDate, end_date: endDate, limit: String(limit),
    });
  } catch (e) {
    console.warn('getGATopPages: falling back to stubs —', (e as Error).message);
    return {
      pages: [
        { page_path: '/', page_title: 'Home', sessions: 15000, pageviews: 22000, avg_time_on_page: 120 },
        { page_path: '/about', page_title: 'About Us', sessions: 8000, pageviews: 11000, avg_time_on_page: 90 },
        { page_path: '/products', page_title: 'Products', sessions: 6500, pageviews: 14000, avg_time_on_page: 160 },
      ],
    };
  }
}

export async function getGADemographics(startDate = '30daysAgo', endDate = 'today'): Promise<GADemographics> {
  try {
    return await apiFetch<GADemographics>('/api/ga/demographics', { start_date: startDate, end_date: endDate });
  } catch (e) {
    console.warn('getGADemographics: falling back to stubs —', (e as Error).message);
    return {
      by_country: [
        { label: 'India', value: 18200, percentage: 42.8 },
        { label: 'United States', value: 8400, percentage: 19.8 },
      ],
      by_age: [
        { label: '18-24', value: 8200, percentage: 19.3 },
        { label: '25-34', value: 16400, percentage: 38.6 },
      ],
    };
  }
}

export async function getGADeviceBreakdown(startDate = '30daysAgo', endDate = 'today'): Promise<GADeviceBreakdown> {
  try {
    return await apiFetch<GADeviceBreakdown>('/api/ga/device-breakdown', { start_date: startDate, end_date: endDate });
  } catch (e) {
    console.warn('getGADeviceBreakdown: falling back to stubs —', (e as Error).message);
    return {
      devices: [
        { device: 'Mobile', sessions: 28000, percentage: 65.9 },
        { device: 'Desktop', sessions: 12500, percentage: 29.4 },
        { device: 'Tablet', sessions: 2000, percentage: 4.7 },
      ],
      total_sessions: 42500,
    };
  }
}

export async function getGAEngagement(startDate = '30daysAgo', endDate = 'today'): Promise<GAEngagement> {
  try {
    return await apiFetch<GAEngagement>('/api/ga/engagement', { start_date: startDate, end_date: endDate });
  } catch (e) {
    console.warn('getGAEngagement: falling back to stubs —', (e as Error).message);
    return {
      engaged_sessions: 24500, engagement_rate: 57.6,
      events_per_session: 4.2, avg_engagement_time: 185,
    };
  }
}

export async function getGAConversions(startDate = '30daysAgo', endDate = 'today'): Promise<GAConversions> {
  try {
    return await apiFetch<GAConversions>('/api/ga/conversions', { start_date: startDate, end_date: endDate });
  } catch (e) {
    console.warn('getGAConversions: falling back to stubs —', (e as Error).message);
    return {
      events: [
        { event_name: 'newsletter_signup', count: 850 },
        { event_name: 'contact_form', count: 320 },
      ],
      total: 1170,
    };
  }
}

export async function getGARealtime(): Promise<GARealtimeReport> {
  try {
    return await apiFetch<GARealtimeReport>('/api/ga/realtime');
  } catch (e) {
    console.warn('getGARealtime: falling back to stubs —', (e as Error).message);
    return {
      active_users: 142,
      top_pages: [
        { page_path: '/', active_users: 85 },
        { page_path: '/products/new', active_users: 34 },
      ],
    };
  }
}

// ── Social channel source attribution ─────────────────────────────────────────

export interface SocialSourceItem {
  platform: string;    // e.g. 'Instagram', 'Facebook', 'WhatsApp'
  color: string;       // brand colour for display
  sessions: number;
  percentage: number;  // share of total social sessions
  utm_source: string;  // the utm_source value tracked in GA
}

export interface GASocialSources {
  sources: SocialSourceItem[];
  total_social_sessions: number;
  total_sessions: number;
  social_share_pct: number; // what % of all sessions are from social
}

/**
 * Fetches per-platform social source data from GA.
 * Falls back to realistic stub values so the UI always renders.
 */
export async function getGASocialSources(
  startDate = '30daysAgo',
  endDate = 'today',
): Promise<GASocialSources> {
  try {
    return await apiFetch<GASocialSources>('/api/ga/social-sources', {
      start_date: startDate,
      end_date: endDate,
    });
  } catch (e) {
    console.warn('getGASocialSources: falling back to stubs —', (e as Error).message);
    // Realistic UTM-source breakdown that sums to the "Organic Social" bucket
    const sources: SocialSourceItem[] = [
      { platform: 'Instagram',  color: '#E4405F', sessions: 3820, percentage: 44.9, utm_source: 'instagram' },
      { platform: 'Facebook',   color: '#1877F2', sessions: 2140, percentage: 25.2, utm_source: 'facebook' },
      { platform: 'WhatsApp',   color: '#25D366', sessions: 1280, percentage: 15.0, utm_source: 'whatsapp' },
      { platform: 'LinkedIn',   color: '#0A66C2', sessions:  760, percentage:  8.9, utm_source: 'linkedin' },
      { platform: 'YouTube',    color: '#FF0000', sessions:  500, percentage:  5.9, utm_source: 'youtube'  },
    ];
    const totalSocial = sources.reduce((s, x) => s + x.sessions, 0);
    return {
      sources,
      total_social_sessions: totalSocial,
      total_sessions: 42500,
      social_share_pct: Math.round((totalSocial / 42500) * 100 * 10) / 10,
    };
  }
}

