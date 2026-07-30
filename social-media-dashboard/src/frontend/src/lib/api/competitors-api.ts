/**
 * Fetch helpers for the Competitor Metrics backend.
 *
 * Usage:
 *   import { getCompetitors } from '@/lib/api/competitors-api';
 *   const data = await getCompetitors();
 *
 * Falls back to stub data if the backend is unreachable.
 */

import { Competitor } from '@/types';
import { competitors as stubCompetitors } from '@/lib/stub-data/competitors';

const BASE_URL =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) ||
    'http://localhost:8000';

// ── Response types ────────────────────────────────────────────────────────────

export interface CompetitorMetricsResponse {
    facebook: number;
    instagram: number;
    linkedin: number;
    youtube: number;
    engagement: number;
    posts_per_week: number;
    growth: number;
}

export interface CompetitorGrowthPointResponse {
    date: string;
    value: number;
}

export interface CompetitorDataResponse {
    id: string;
    name: string;
    handle: string;
    metrics: CompetitorMetricsResponse;
    growth_trend: CompetitorGrowthPointResponse[];
}

export interface CompetitorsApiResponse {
    competitors: CompetitorDataResponse[];
    last_updated: string;
    source: 'live' | 'cache' | 'fallback';
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
        throw new Error(`Competitors API ${res.status}: ${detail}`);
    }
    return res.json() as Promise<T>;
}

// ── Transform backend response to frontend Competitor type ────────────────────

function toCompetitor(data: CompetitorDataResponse): Competitor {
    return {
        id: data.id,
        name: data.name,
        handle: data.handle,
        metrics: {
            facebook: data.metrics.facebook,
            instagram: data.metrics.instagram,
            linkedin: data.metrics.linkedin,
            youtube: data.metrics.youtube,
            engagement: data.metrics.engagement,
            postsPerWeek: data.metrics.posts_per_week,
            growth: data.metrics.growth,
        },
        growthTrend: (data.growth_trend || []).map(p => ({
            date: p.date,
            value: p.value,
        })),
    };
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface CompetitorsResult {
    competitors: Competitor[];
    source: 'live' | 'cache' | 'fallback';
    lastUpdated: string;
}

export async function getCompetitors(): Promise<CompetitorsResult> {
    try {
        const resp = await apiFetch<CompetitorsApiResponse>('/api/competitors');
        return {
            competitors: resp.competitors.map(toCompetitor),
            source: resp.source,
            lastUpdated: resp.last_updated,
        };
    } catch (e) {
        console.warn('getCompetitors: falling back to stubs —', (e as Error).message);
        return {
            competitors: stubCompetitors,
            source: 'fallback',
            lastUpdated: new Date().toISOString(),
        };
    }
}

export async function refreshCompetitors(): Promise<{ status: string; source: string }> {
    return apiFetch('/api/competitors/refresh', { method: 'POST' });
}

export interface AddCompetitorPayload {
    name: string;
    instagram?: string;
    facebook?: string;
    linkedin?: string;
    youtube?: string;
    website?: string;
}

export async function addCompetitor(payload: AddCompetitorPayload): Promise<any> {
    return apiFetch('/api/competitors', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}
