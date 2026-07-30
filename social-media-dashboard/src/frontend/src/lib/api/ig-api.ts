/**
 * Typed fetch helpers for the FastAPI Instagram backend.
 *
 * Usage:
 *   import { getIGOverview } from '@/lib/api/ig-api';
 *   const data = await getIGOverview();
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
  category: string;
  value: number;
  count: number;
}

// ── Response types ────────────────────────────────────────────────────────────

export interface IGOverview {
  followers: number;
  followers_change: number;
  reach: number;
  reach_change: number;
  impressions: number;
  impressions_change: number;
  engagement_rate: number;
  engagement_rate_change: number;
  profile_visits: number;
  profile_visits_change: number;
  website_clicks: number;
  website_clicks_change: number;
  period_days: number;
}

export interface IGReach {
  series: TimeSeriesPoint[];
  total: number;
  period_days: number;
}

export interface IGImpressions {
  series: TimeSeriesPoint[];
  total: number;
  period_days: number;
}

export interface IGPostMetric {
  post_id: string;
  caption: string;
  published: string;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  impressions: number;
  engagement_rate: number;
  post_type: string;
}

export interface IGTopPosts {
  posts: IGPostMetric[];
  period_days: number;
}

export interface IGAudienceDemographics {
  by_age: DemographicItem[];
  by_gender: DemographicItem[];
  by_city: DemographicItem[];
  by_country: DemographicItem[];
  period_days: number;
}

export interface IGEngagement {
  series: TimeSeriesPoint[];
  avg_engagement_rate: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  total_saves: number;
  period_days: number;
}

export interface IGFollowerGrowth {
  series: TimeSeriesPoint[];
  total_gained: number;
  total_lost: number;
  net_change: number;
  period_days: number;
}

export interface IGStoryMetric {
  story_id: string;
  published: string;
  impressions: number;
  reach: number;
  exits: number;
  replies: number;
  taps_forward: number;
  taps_back: number;
}

export interface IGStories {
  stories: IGStoryMetric[];
  period_days: number;
}

export interface IGContentBreakdownItem {
  content_type: string;
  count: number;
  avg_reach: number;
  avg_engagement_rate: number;
  avg_saves: number;
}

export interface IGContentPerformance {
  breakdown: IGContentBreakdownItem[];
  period_days: number;
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
    throw new Error(`Instagram API ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Overview metrics for the Instagram business account. */
export function getIGOverview(days = 30): Promise<IGOverview> {
  return apiFetch<IGOverview>('/api/ig/overview', { days: String(days) });
}

/** Reach time series + total. */
export function getIGReach(days = 30): Promise<IGReach> {
  return apiFetch<IGReach>('/api/ig/reach', { days: String(days) });
}

/** Impressions time series + total. */
export function getIGImpressions(days = 30): Promise<IGImpressions> {
  return apiFetch<IGImpressions>('/api/ig/impressions', { days: String(days) });
}

/** Top performing posts sorted by reach. */
export function getIGTopPosts(days = 30): Promise<IGTopPosts> {
  return apiFetch<IGTopPosts>('/api/ig/top-posts', { days: String(days) });
}

/** Audience demographics — age, gender, city, country. */
export function getIGDemographics(days = 30): Promise<IGAudienceDemographics> {
  return apiFetch<IGAudienceDemographics>('/api/ig/demographics', { days: String(days) });
}

/** Engagement rate time series + overall average. */
export function getIGEngagement(days = 30): Promise<IGEngagement> {
  return apiFetch<IGEngagement>('/api/ig/engagement', { days: String(days) });
}

/** Follower growth time series + net gain. */
export function getIGFollowerGrowth(days = 30): Promise<IGFollowerGrowth> {
  return apiFetch<IGFollowerGrowth>('/api/ig/follower-growth', { days: String(days) });
}

/** Recent stories with per-story metrics. */
export function getIGStories(days = 30): Promise<IGStories> {
  return apiFetch<IGStories>('/api/ig/stories', { days: String(days) });
}

/** Content type breakdown — images, videos, carousels, reels. */
export function getIGContentBreakdown(days = 30): Promise<IGContentPerformance> {
  return apiFetch<IGContentPerformance>('/api/ig/content-breakdown', { days: String(days) });
}
