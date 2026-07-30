/**
 * Fetch helpers for the Predictive Trends / Competitor Insights backend.
 *
 * Usage:
 *   import { getTrendsInsights } from '@/lib/api/trends-api';
 *   const data = await getTrendsInsights();
 *
 * Falls back to stub data if the backend is unreachable.
 */

const BASE_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) ||
  'http://localhost:8000';

// ── Response types ────────────────────────────────────────────────────────────

export interface CompetitorTrend {
  id: string;
  category: string;
  topic: string;
  change: number;
  confidence: number;
  signal: 'rising' | 'steady' | 'emerging';
  sources: string[];
}

export interface TrendSuggestion {
  id: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  channel: string;
  expected_impact: string;
  related_trend?: string;
}

export interface TrendGrowthPoint {
  date: string;
  value: number;
}

export interface TrendTrajectory {
  label: string;
  color: string;
  data: TrendGrowthPoint[];
}

export interface CompetitorInsight {
  competitor_name: string;
  observation: string;
  opportunity: string;
}

export interface TrendsInsightsResponse {
  trending_topics: CompetitorTrend[];
  suggested_actions: TrendSuggestion[];
  trend_trajectories: TrendTrajectory[];
  competitor_insights: CompetitorInsight[];
  last_updated: string;
  source: 'ai' | 'cache' | 'fallback';
}

export interface TrendingTopicsResponse {
  topics: CompetitorTrend[];
  source: string;
}

export interface RefreshResponse {
  status: string;
  message: string;
  source: string;
}

export interface SchedulerStatus {
  last_run: string | null;
  next_run: string | null;
  last_status: 'pending' | 'running' | 'ok' | 'error';
  last_error: string | null;
  interval_hours: number;
}

// ── Internal helper ───────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    ...init,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Trends API ${res.status}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

// ── Fallback stub data ───────────────────────────────────────────────────────

const FALLBACK: TrendsInsightsResponse = {
  trending_topics: [
    { id: 'tr-1', category: 'Design', topic: 'Handloom Revival in Home Décor', change: 210, confidence: 91, signal: 'rising', sources: ['Jaypore', 'iTokri', 'GoCoop'] },
    { id: 'tr-2', category: 'Sustainability', topic: 'Upcycled & Zero-Waste Packaging', change: 185, confidence: 89, signal: 'rising', sources: ['Sirohi', 'The Good Road'] },
    { id: 'tr-3', category: 'Marketing', topic: 'Artisan-Story-Led Branding', change: 160, confidence: 87, signal: 'rising', sources: ['Okhai', 'Jaypore'] },
    { id: 'tr-4', category: 'Content', topic: 'Behind-the-Loom Reels', change: 140, confidence: 82, signal: 'rising', sources: ['iTokri', 'GoCoop'] },
    { id: 'tr-5', category: 'Events', topic: 'Curated Artisan Hamper Gifting', change: 120, confidence: 78, signal: 'steady', sources: ['The Good Road', 'Jaypore'] },
    { id: 'tr-6', category: 'Community', topic: 'Women Artisan Empowerment Campaigns', change: 95, confidence: 84, signal: 'emerging', sources: ['Okhai', 'Sirohi'] },
  ],
  suggested_actions: [
    { id: 'sa-1', priority: 'high', title: 'Launch Handloom Home Décor Reel Series', description: 'Jaypore and iTokri are doubling down on handloom content. Create a weekly Instagram Reel series showcasing your artisan weavers.', channel: 'instagram', expected_impact: '+45% Reel engagement', related_trend: 'Handloom Revival in Home Décor' },
    { id: 'sa-2', priority: 'high', title: 'Sustainable Packaging LinkedIn Feature', description: "Sirohi's upcycled packaging is generating buzz. Publish a LinkedIn article detailing Club Artizen's sustainable packaging journey.", channel: 'linkedin', expected_impact: '+30% article reach', related_trend: 'Upcycled & Zero-Waste Packaging' },
    { id: 'sa-3', priority: 'medium', title: 'Artisan Story WhatsApp Campaign', description: "Share monthly artisan spotlight stories via WhatsApp broadcast — Okhai's artisan narratives are driving strong engagement.", channel: 'whatsapp', expected_impact: '+25% open rate', related_trend: 'Artisan-Story-Led Branding' },
    { id: 'sa-4', priority: 'medium', title: 'Festive Hamper Pre-Order Instagram Campaign', description: "The Good Road's hamper gifting is trending. Launch a festive hamper pre-order campaign with Stories polls and countdowns.", channel: 'instagram', expected_impact: '+35% story engagement', related_trend: 'Curated Artisan Hamper Gifting' },
  ],
  trend_trajectories: [
    { label: 'Handloom Home Décor', color: '#E5A100', data: [{ date: '2026-01', value: 20 }, { date: '2026-02', value: 35 }, { date: '2026-03', value: 55 }, { date: '2026-04', value: 75 }, { date: '2026-05', value: 90 }] },
    { label: 'Upcycled Packaging', color: '#50B88C', data: [{ date: '2026-01', value: 15 }, { date: '2026-02', value: 28 }, { date: '2026-03', value: 42 }, { date: '2026-04', value: 60 }, { date: '2026-05', value: 80 }] },
    { label: 'Artisan Storytelling', color: '#C75B39', data: [{ date: '2026-01', value: 10 }, { date: '2026-02', value: 22 }, { date: '2026-03', value: 38 }, { date: '2026-04', value: 52 }, { date: '2026-05', value: 70 }] },
  ],
  competitor_insights: [
    { competitor_name: 'Jaypore', observation: 'Expanding curated handloom collections with strong editorial content and celebrity collaborations.', opportunity: "Create a 'Curated by Artizen' editorial series positioning your handloom artisans alongside trending home décor themes." },
    { competitor_name: 'Okhai', observation: 'Leveraging women artisan empowerment narratives to build emotional brand connection on Instagram.', opportunity: "Launch an 'Artisan of the Month' campaign showcasing your craftswomen's stories and skills." },
    { competitor_name: 'iTokri', observation: 'Rapidly growing marketplace presence with SEO-optimized craft categories and active Pinterest strategy.', opportunity: 'Strengthen your product SEO and consider a Pinterest content strategy for décor and gift categories.' },
    { competitor_name: 'GoCoop', observation: 'Positioning as the go-to cooperative handloom platform with government and NGO partnerships.', opportunity: "Highlight Club Artizen's direct artisan partnerships to differentiate from cooperative models." },
    { competitor_name: 'Sirohi', observation: 'Leading the upcycled craft space — their packaging-as-product approach is resonating on social media.', opportunity: 'Develop an upcycled/zero-waste packaging line and create unboxing content to showcase it.' },
    { competitor_name: 'The Good Road', observation: 'Dominating the curated hamper gifting segment with seasonal collections and WhatsApp-based sales.', opportunity: 'Launch a competing festive hamper collection with artisan-made products and a WhatsApp pre-order flow.' },
  ],
  last_updated: new Date().toISOString(),
  source: 'fallback',
};

// ── Public API ────────────────────────────────────────────────────────────────

export async function getTrendsInsights(): Promise<TrendsInsightsResponse> {
  try {
    return await apiFetch<TrendsInsightsResponse>('/api/trends/insights');
  } catch (e) {
    console.warn('getTrendsInsights: falling back to stubs —', (e as Error).message);
    return FALLBACK;
  }
}

export async function getTrendingTopics(): Promise<TrendingTopicsResponse> {
  try {
    return await apiFetch<TrendingTopicsResponse>('/api/trends/trending');
  } catch (e) {
    console.warn('getTrendingTopics: falling back to stubs —', (e as Error).message);
    return { topics: FALLBACK.trending_topics, source: 'fallback' };
  }
}

export async function refreshTrends(): Promise<RefreshResponse> {
  return apiFetch<RefreshResponse>('/api/trends/refresh', { method: 'POST' });
}

export async function getTrendsStatus(): Promise<SchedulerStatus | null> {
  try {
    return await apiFetch<SchedulerStatus>('/api/trends/status');
  } catch {
    return null;
  }
}
