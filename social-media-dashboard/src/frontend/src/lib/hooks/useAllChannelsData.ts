/**
 * useAllChannelsData — fetches combined channel stats for all platforms.
 *
 * For Meta channels (Instagram, Facebook) data comes from the manual
 * CSV-upload endpoints on the main backend (/manual/insta/insights,
 * /manual/facebook/insights, /manual/linkedin/insights). Website time-series
 * is read from GA API helpers.
 *
 * Returns the same shape as the static `channelStats` and
 * `followerGrowthTrend` arrays from `@/lib/stub-data/statistics` so any
 * page can swap the import for this hook with zero structural changes.
 */

import { useState, useEffect } from 'react';
import { ChannelStats, TimeSeries, Alert } from '@/types';
import {
    channelStats as stubStats,
    followerGrowthTrend as stubGrowth,
} from '@/lib/stub-data/statistics';
import { alerts as stubAlerts } from '@/lib/stub-data/alerts';
import { getGAConversions, getGAEngagement, getGAOverview, getGAPageviews } from '@/lib/api/ga-api';

const API_BASE =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) ||
    'http://localhost:8000';

const INSTA_ACCOUNT_ID = 'ClubArtizen';
const FACEBOOK_USER_ID = 'ClubArtizen';
const LINKEDIN_ORG_ID = 'ClubArtizen';
/* ── Shared response shapes (mirror the channel pages) ─────────────────────── */

interface ManualInsightValue {
    value: number | string;
    end_time?: string;
}

interface ManualInsightEntry {
    name?: string;
    values?: ManualInsightValue[];
}

interface ManualInsightsResponse {
    data?: ManualInsightEntry[];
}

interface MetricSeries {
    key: string;
    total: number;
    latest: number;
    points: { date: string; value: number }[];
}

/* ── Helpers ────────────────────────────────────────────────────────────────── */

function toNumber(value: unknown): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function toIsoUtcDate(year: number, month: number, day: number): string {
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return '';
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (
        Number.isNaN(parsed.getTime()) ||
        parsed.getUTCFullYear() !== year ||
        parsed.getUTCMonth() !== month - 1 ||
        parsed.getUTCDate() !== day
    ) {
        return '';
    }
    return parsed.toISOString().slice(0, 10);
}

function normalizeDateKey(rawTime: string): string {
    const trimmed = rawTime.trim();
    if (!trimmed) return '';

    const dashed = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dashed) {
        return toIsoUtcDate(Number(dashed[1]), Number(dashed[2]), Number(dashed[3]));
    }

    const compact = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (compact) {
        return toIsoUtcDate(Number(compact[1]), Number(compact[2]), Number(compact[3]));
    }

    const compactSingleDigitDay = trimmed.match(/^(\d{4})(\d{2})(\d)$/);
    if (compactSingleDigitDay) {
        return toIsoUtcDate(
            Number(compactSingleDigitDay[1]),
            Number(compactSingleDigitDay[2]),
            Number(compactSingleDigitDay[3]),
        );
    }

    const normalised = trimmed.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
    const parsed = normalised ? new Date(normalised) : null;
    return parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : '';
}

function extractDatePart(rawTime: string): string {
    return normalizeDateKey(rawTime);
}

function windowStartDate(days: number): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().slice(0, 10);
}

function buildRecentZeroPoints(days: number): { date: string; value: number }[] {
    const points: { date: string; value: number }[] = [];
    const end = new Date();
    for (let i = days - 1; i >= 0; i -= 1) {
        const current = new Date(end);
        current.setUTCDate(end.getUTCDate() - i);
        points.push({ date: current.toISOString().slice(0, 10), value: 0 });
    }
    return points;
}

function parseManualSeries(payload: ManualInsightsResponse): Map<string, MetricSeries> {
    const map = new Map<string, MetricSeries>();
    const entries = Array.isArray(payload.data) ? payload.data : [];
    const startDate = windowStartDate(30);

    for (const entry of entries) {
        if (!entry || typeof entry.name !== 'string') continue;
        const values = Array.isArray(entry.values) ? entry.values : [];
        const points: { date: string; value: number }[] = [];

        for (const v of values) {
            const num = toNumber(v?.value);
            const rawTime = typeof v?.end_time === 'string' ? v.end_time : '';
            const dateStr = extractDatePart(rawTime);
            points.push({ date: dateStr, value: num });
        }

        const monthPoints = points
            .filter((p) => Boolean(p.date) && p.date >= startDate)
            .sort((a, b) => a.date.localeCompare(b.date));
        const total = monthPoints.reduce((s, p) => s + p.value, 0);
        const latest = monthPoints.length > 0 ? monthPoints[monthPoints.length - 1].value : 0;

        map.set(entry.name, { key: entry.name, total, latest, points: monthPoints });
    }

    return map;
}

async function fetchManualInsights(
    platform: 'insta' | 'facebook' | 'linkedin',
    metrics: string[],
): Promise<Map<string, MetricSeries>> {
    const params = new URLSearchParams({ metric: metrics.join(','), period: 'day' });
    let url = '';
    if (platform === 'insta') {
        url = `${API_BASE}/manual/insta/insights/${encodeURIComponent(INSTA_ACCOUNT_ID)}?${params}`;
    }
    else if (platform === 'linkedin') {
        url = `${API_BASE}/manual/linkedin/insights/${encodeURIComponent(LINKEDIN_ORG_ID)}?${params}`;
    }
    else {
        url = `${API_BASE}/manual/facebook/insights/${encodeURIComponent(FACEBOOK_USER_ID)}?${params}`;
    }
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${platform} insights ${res.status}`);
    const payload: ManualInsightsResponse = await res.json();
    return parseManualSeries(payload);
}

/* ── Dashboard summary types ─────────────────────────────────────────────── */

export interface TopPost {
    title: string;
    engagement: number;
    type: string;
    channel: string;
}

export interface DashboardSummary {
    channelHealth: Record<string, number>;
    kpiChanges: Record<string, number>;
    engagementTrend: { date: string; value: number }[];
    alerts: Alert[];
    topPosts: TopPost[];
}

export interface ChannelComparisonMetric {
    channel: 'instagram' | 'facebook' | 'linkedin' | 'website';
    followers: number;
    interactions: number;
    views: number;
    linkClicks: number;
}

// Deterministic stub engagement trend (matches backend stub shape)
const STUB_ENGAGEMENT_TREND: { date: string; value: number }[] = Array.from({ length: 30 }, (_, i) => {
    const d = new Date('2026-02-01');
    d.setDate(d.getDate() + i);
    return {
        date: d.toISOString().slice(0, 10),
        value: 2850 + 14 * i + (i % 7) * 45,
    };
});

const STUB_TOP_POSTS: TopPost[] = [
    { title: 'Behind the scenes of our latest mural installation', engagement: 2700, type: 'Reel', channel: 'instagram' },
    { title: '60 seconds of pure creativity 🎨', engagement: 3453, type: 'Reel', channel: 'instagram' },
    { title: 'Our top 5 art collections this season', engagement: 2055, type: 'Carousel', channel: 'instagram' },
];

const STUB_CHANNEL_HEALTH: Record<string, number> = {
    instagram: 0, facebook: 0, linkedin: 0, website: 0,
};

const EMPTY_KPI_CHANGES: Record<string, number> = {
    followers: 0, engagement: 0, impressions: 0, ctr: 0,
};

const EMPTY_CHANNEL_COMPARISON: ChannelComparisonMetric[] = [
    { channel: 'instagram', followers: 0, interactions: 0, views: 0, linkClicks: 0 },
    { channel: 'facebook', followers: 0, interactions: 0, views: 0, linkClicks: 0 },
    { channel: 'linkedin', followers: 0, interactions: 0, views: 0, linkClicks: 0 },
    { channel: 'website', followers: 0, interactions: 0, views: 0, linkClicks: 0 },
];

/* ── Hook ───────────────────────────────────────────────────────────────────── */

export interface AllChannelsData {
    channelStats: ChannelStats[];
    followerGrowthTrend: TimeSeries[];
    channelComparisonMetrics: ChannelComparisonMetric[];
    dashboardSummary: DashboardSummary;
    loading: boolean;
    error: string | null;
}

export function useAllChannelsData(): AllChannelsData {
    const [channelStats, setChannelStats] = useState<ChannelStats[]>(
        stubStats.filter((s) => s.channel !== 'whatsapp' && s.channel !== 'youtube'),
    );
    const [followerGrowthTrend, setFollowerGrowthTrend] = useState<TimeSeries[]>(
        stubGrowth.filter((s) => s.label !== 'WhatsApp' && s.label !== 'YouTube'),
    );
    const [channelComparisonMetrics, setChannelComparisonMetrics] = useState<ChannelComparisonMetric[]>(
        EMPTY_CHANNEL_COMPARISON,
    );
    const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary>({
        channelHealth: STUB_CHANNEL_HEALTH,
        kpiChanges: EMPTY_KPI_CHANGES,
        engagementTrend: STUB_ENGAGEMENT_TREND,
        alerts: stubAlerts,
        topPosts: STUB_TOP_POSTS,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setError(null);
            // Instagram metrics
            const igMetrics = [
                'views', 'reach', 'content_interactions',
                'instagram_link_clicks', 'instagram_profile_visits', 'instagram_follows',
            ];
            // Facebook metrics
            const fbMetrics = [
                'views', 'viewers', 'content_interactions',
                'facebook_link_clicks', 'facebook_visits', 'facebook_follows',
            ];
            // LinkedIn metrics from /manual/linkedin/insights
            const liMetrics = [
                'impressions',
                'clicks',
                'reactions',
                'comments',
                'reposts',
            ];

            let igData: Map<string, MetricSeries> | null = null;
            let fbData: Map<string, MetricSeries> | null = null;
            let liData: Map<string, MetricSeries> | null = null;
            let summaryData: DashboardSummary | null = null;
            let gaOverviewData: { users: number; pageviews: number } | null = null;
            let gaEngagementData: { engaged_sessions: number } | null = null;
            let gaConversionData: { total: number } | null = null;
            let gaPageviewsData: { series: { date: string; value: number }[] } | null = null;
            let fetchError: string | null = null;

            try {
                const [
                    igResult,
                    fbResult,
                    liResult,
                    summaryResult,
                    gaOverviewResult,
                    gaEngagementResult,
                    gaConversionResult,
                    gaPageviewsResult,
                ] = await Promise.all([
                    fetchManualInsights('insta', igMetrics).catch(() => null),
                    fetchManualInsights('facebook', fbMetrics).catch(() => null),
                    fetchManualInsights('linkedin', liMetrics).catch(() => null),
                    fetch(`${API_BASE}/dashboard/summary`, { cache: 'no-store' })
                        .then(r => r.ok ? r.json() as Promise<DashboardSummary> : null)
                        .catch(() => null),
                    getGAOverview().catch(() => null),
                    getGAEngagement().catch(() => null),
                    getGAConversions().catch(() => null),
                    getGAPageviews('day', '30daysAgo', 'today').catch(() => null),
                ]);
                igData = igResult;
                fbData = fbResult;
                liData = liResult;
                summaryData = summaryResult;
                gaOverviewData = gaOverviewResult;
                gaEngagementData = gaEngagementResult;
                gaConversionData = gaConversionResult;
                gaPageviewsData = gaPageviewsResult;
            } catch (err) {
                fetchError = (err as Error)?.message || 'Failed to load channel data';
            }

            if (cancelled) return;

            if (fetchError) setError(fetchError);

            // Stub fallbacks for all channels
            const igStub = stubStats.find(s => s.channel === 'instagram') ?? stubStats[0];
            const fbStub = stubStats.find(s => s.channel === 'facebook') ?? igStub;
            const liStub = stubStats.find(s => s.channel === 'linkedin') ?? stubStats[0];

            // ── Instagram ──────────────────────────────────────────────────

            const igStats: ChannelStats = igData
                ? {
                    channel: 'instagram',
                    followers: Math.round(igData.get('instagram_follows')?.total ?? igStub.followers),
                    followerGrowth: igData.get('instagram_follows')?.latest ?? igStub.followerGrowth,
                    engagement: Math.round(igData.get('content_interactions')?.total ?? igStub.engagement),
                    engagementRate:
                        igData.get('content_interactions') && igData.get('views')
                            ? Number(
                                (
                                    ((igData.get('content_interactions')!.total /
                                        Math.max(igData.get('views')!.total, 1)) *
                                        100
                                    ).toFixed(2)
                                ),
                            )
                            : igStub.engagementRate,
                    impressions: Math.round(igData.get('views')?.total ?? igStub.impressions),
                    reach: Math.round(igData.get('reach')?.total ?? igStub.reach),
                    ctr:
                        igData.get('instagram_link_clicks') && igData.get('views')
                            ? Number(
                                (
                                    ((igData.get('instagram_link_clicks')!.total /
                                        Math.max(igData.get('views')!.total, 1)) *
                                        100
                                    ).toFixed(2)
                                ),
                            )
                            : igStub.ctr,
                }
                : igStub;

            // ── Facebook (mapped to equivalent KPI fields) ───────────────
            // 'facebook' is not a valid ChannelSlug; data is merged into
            // the 'instagram' slot (both are Meta / CSV-sourced).
            const fbStats: ChannelStats = fbData
                ? {
                    channel: 'facebook', // Changed from 'instagram'
                    followers: Math.round(fbData.get('facebook_follows')?.total ?? fbStub.followers),
                    followerGrowth: fbData.get('facebook_follows')?.latest ?? fbStub.followerGrowth,
                    engagement: Math.round(fbData.get('content_interactions')?.total ?? fbStub.engagement),
                    engagementRate:
                        fbData.get('content_interactions') && fbData.get('views')
                            ? Number(
                                (
                                    ((fbData.get('content_interactions')!.total /
                                        Math.max(fbData.get('views')!.total, 1)) *
                                        100
                                    ).toFixed(2)
                                ),
                            )
                            : fbStub.engagementRate,
                    impressions: Math.round(fbData.get('views')?.total ?? fbStub.impressions),
                    reach: Math.round(fbData.get('viewers')?.total ?? fbStub.reach),
                    ctr:
                        fbData.get('facebook_link_clicks') && fbData.get('views')
                            ? Number(
                                (
                                    ((fbData.get('facebook_link_clicks')!.total /
                                        Math.max(fbData.get('views')!.total, 1)) *
                                        100
                                    ).toFixed(2)
                                ),
                            )
                            : fbStub.ctr,
                }
                : fbStub;

            const liStats: ChannelStats = liData
                ? {
                    channel: 'linkedin',
                    followers: 0, // not available from /manual/linkedin/ endpoint
                    followerGrowth: 0,
                    // Engagement = Reactions + Comments + Reposts
                    engagement: Math.round(
                        (liData.get('reactions')?.total ?? 0) +
                        (liData.get('comments')?.total ?? 0) +
                        (liData.get('reposts')?.total ?? 0)
                    ),
                    engagementRate:
                        liData.get('reactions') || liData.get('comments') || liData.get('reposts')
                            ? (() => {
                                const eng =
                                    (liData.get('reactions')?.total ?? 0) +
                                    (liData.get('comments')?.total ?? 0) +
                                    (liData.get('reposts')?.total ?? 0);
                                const imp = Math.max(liData.get('impressions')?.total ?? 0, 1);
                                return Number(((eng / imp) * 100).toFixed(2));
                            })()
                            : liStub.engagementRate,
                    // Views = Impressions
                    impressions: Math.round(liData.get('impressions')?.total ?? liStub.impressions),
                    reach: Math.round(liData.get('impressions')?.total ?? liStub.reach),
                    // Traffic & Conversion = Link Clicks
                    ctr:
                        liData.get('clicks') && liData.get('impressions')
                            ? Number(
                                (
                                    ((liData.get('clicks')!.total /
                                        Math.max(liData.get('impressions')!.total, 1)) *
                                        100
                                    ).toFixed(2)
                                ),
                            )
                            : liStub.ctr,
                }
                : liStub;


            const merged: ChannelStats[] = [
                igStats,
                fbStats,
                liStats,
            ];

            // ── Follower growth trend: derive from IG daily points ─────────
            const igFollowsSeries = igData?.get('instagram_follows');
            const igGrowthPoints =
                igFollowsSeries && igFollowsSeries.points.length > 0
                    ? igFollowsSeries.points
                        .filter(p => p.date)
                        .map(p => ({ date: p.date, value: p.value }))
                    : null;
            const fbFollowsSeries = fbData?.get('facebook_follows');
            const fbGrowthPoints =
                fbFollowsSeries && fbFollowsSeries.points.length > 0
                    ? fbFollowsSeries.points
                        .filter(p => p.date)
                        .map(p => ({ date: p.date, value: p.value }))
                    : null;
            const websiteGrowthPoints =
                gaPageviewsData?.series?.length
                    ? gaPageviewsData.series
                        .reduce<{ date: string; value: number }[]>((acc, point) => {
                            const normalizedDate = normalizeDateKey(point.date);
                            if (!normalizedDate || normalizedDate < windowStartDate(30)) return acc;
                            acc.push({ date: normalizedDate, value: point.value });
                            return acc;
                        }, [])
                    : null;
            const baseGrowthPoints =
                websiteGrowthPoints?.length
                    ? websiteGrowthPoints
                    : igGrowthPoints?.length
                        ? igGrowthPoints
                        : fbGrowthPoints?.length
                            ? fbGrowthPoints
                            : buildRecentZeroPoints(30);
            const zeroGrowthPoints = baseGrowthPoints.map((point) => ({
                date: point.date,
                value: 0,
            }));

            const mergedGrowth: TimeSeries[] = [
                {
                    label: igGrowthPoints ? 'Instagram' : 'Instagram (data not given)',
                    color: '#E4405F',
                    data: igGrowthPoints ?? zeroGrowthPoints,
                },
                // LinkedIn: follower data not available from /manual/linkedin/ endpoint
                { label: 'LinkedIn (data not given)', color: '#0A66C2', data: [] },
                {
                    label: 'Website',
                    color: '#4A90D9',
                    data: websiteGrowthPoints ?? zeroGrowthPoints,
                },
                {
                    label: fbGrowthPoints ? 'Facebook' : 'Facebook (data not given)',
                    color: '#1877F2',
                    data: fbGrowthPoints ?? zeroGrowthPoints,
                }
            ];

            const comparisonMetrics: ChannelComparisonMetric[] = [
                {
                    channel: 'instagram',
                    followers: Math.round(igData?.get('instagram_follows')?.total ?? 0),
                    interactions: Math.round(igData?.get('content_interactions')?.total ?? 0),
                    views: Math.round(igData?.get('reach')?.total ?? igData?.get('views')?.total ?? 0),
                    linkClicks: Math.round(igData?.get('instagram_link_clicks')?.total ?? 0),
                },
                {
                    channel: 'facebook',
                    followers: Math.round(fbData?.get('facebook_follows')?.total ?? 0),
                    interactions: Math.round(fbData?.get('content_interactions')?.total ?? 0),
                    views: Math.round(fbData?.get('views')?.total ?? fbData?.get('viewers')?.total ?? 0),
                    linkClicks: Math.round(fbData?.get('facebook_link_clicks')?.total ?? 0),
                },
                {
                    channel: 'linkedin',
                    followers: 0, // not provided by /manual/linkedin/ endpoint
                    // Engagement = Reactions + Comments + Reposts
                    interactions: Math.round(
                        (liData?.get('reactions')?.total ?? 0) +
                        (liData?.get('comments')?.total ?? 0) +
                        (liData?.get('reposts')?.total ?? 0)
                    ),
                    // Views = Impressions
                    views: Math.round(liData?.get('impressions')?.total ?? 0),
                    // Traffic & Conversion = Link Clicks
                    linkClicks: Math.round(liData?.get('clicks')?.total ?? 0),
                },
                {
                    channel: 'website',
                    followers: Math.round(gaOverviewData?.users ?? 0),
                    interactions: Math.round(gaEngagementData?.engaged_sessions ?? 0),
                    views: Math.round(gaOverviewData?.pageviews ?? 0),
                    linkClicks: Math.round(gaConversionData?.total ?? 0),
                },
            ];

            setChannelStats(merged);
            setFollowerGrowthTrend(mergedGrowth);
            setChannelComparisonMetrics(comparisonMetrics);

            // Apply dashboard summary from backend (or keep stubs)
            if (summaryData) {
                setDashboardSummary({
                    channelHealth: summaryData.channelHealth ?? STUB_CHANNEL_HEALTH,
                    kpiChanges: summaryData.kpiChanges ?? EMPTY_KPI_CHANGES,
                    engagementTrend: summaryData.engagementTrend ?? STUB_ENGAGEMENT_TREND,
                    alerts: summaryData.alerts ?? stubAlerts,
                    topPosts: summaryData.topPosts ?? STUB_TOP_POSTS,
                });
            }

            setLoading(false);
        }

        load().catch((err) => {
            if (!cancelled) {
                setError((err as Error)?.message || 'Unexpected error loading channel data');
                setLoading(false);
            }
        });
        return () => { cancelled = true; };
    }, []);

    return { channelStats, followerGrowthTrend, channelComparisonMetrics, dashboardSummary, loading, error };
}
