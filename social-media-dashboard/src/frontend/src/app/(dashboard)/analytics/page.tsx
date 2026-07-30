'use client';

import { ChartCard, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from '@/components/charts/ChartComponents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { heatmapData } from '@/lib/stub-data/analytics';
import { getGAConversions, getGAEngagement, getGAOverview, getGAPageviews } from '@/lib/api/ga-api';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { Lightbulb, Clock, TrendingUp, Instagram, Linkedin, Wifi, WifiOff, CalendarDays } from 'lucide-react';
import { useAllChannelsData } from '@/lib/hooks/useAllChannelsData';
import { useChannelAnalytics } from '@/lib/hooks/useChannelAnalytics';
import { DayPicker, DateRange } from 'react-day-picker';

const API_BASE =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) ||
    'http://localhost:8000';
const INSTAGRAM_USER_ID = 'ClubArtizen';
const FACEBOOK_USER_ID = 'ClubArtizen';
const LINKEDIN_ORG_ID = 'ClubArtizen';

interface ManualInsightValue {
    value: number | string;
    end_time?: string;
}

interface ManualInsightEntry {
    name?: string;
    values?: ManualInsightValue[];
}

interface ManualPostInsightItem {
    post_id?: string;
    post_type?: string;
    insights?: ManualInsightEntry[];
}

interface ManualPostInsightsResponse {
    data?: unknown[];
}

interface PostInsightRecord {
    postId: string;
    postType: string;
    metrics: Record<string, number>;
}

interface MetricGoalConfig {
    title: string;
    metricCandidates: string[];
    actionPrefix: string;
}

interface BestTypeMetric {
    postType: string;
    metricKey: string;
    average: number;
    sampleSize: number;
}

type HeatmapChannelKey = 'instagram' | 'facebook' | 'linkedin' | 'website';

interface ManualInsightsResponse {
    data?: ManualInsightEntry[];
}

interface DailyMetricPoint {
    date: string;
    day: string;
    value: number;
}

interface NormalizedSpiderRow {
    metric: 'ARR' | 'ER' | 'CTR';
    instagram: number;
    facebook: number;
    linkedin: number;
    website: number;
    linkedinUnavailable?: boolean;
}

interface DateRangeBounds {
    startMs: number;
    endMs: number;
    startDate: Date;
    endDate: Date;
}

type DashboardTimeframePreset =
    | 'last_7_days'
    | 'last_30_days'
    | 'last_90_days'
    | 'all_time'
    | 'custom';

const DASHBOARD_TIMEFRAME_OPTIONS: Array<{ value: DashboardTimeframePreset; label: string }> = [
    { value: 'last_7_days', label: 'Last 7 days' },
    { value: 'last_30_days', label: 'Last 30 days' },
    { value: 'last_90_days', label: 'Last 90 days' },
    { value: 'all_time', label: 'All time' },
    { value: 'custom', label: 'Custom range' },
];

const INSTAGRAM_METRIC_GOALS: MetricGoalConfig[] = [
    {
        title: 'Reach winner',
        metricCandidates: ['reach', 'views'],
        actionPrefix: 'Increase the share of',
    },
    {
        title: 'Engagement winner',
        metricCandidates: ['total_interactions', 'likes', 'comments', 'shares', 'saved'],
        actionPrefix: 'Use more',
    },
    {
        title: 'Growth signal',
        metricCandidates: ['follows', 'saved', 'shares'],
        actionPrefix: 'Prioritise CTA-led',
    },
];

const LINKEDIN_METRIC_GOALS: MetricGoalConfig[] = [
    {
        title: 'Reach winner',
        metricCandidates: ['impressions', 'views', 'offsite_views'],
        actionPrefix: 'Scale',
    },
    {
        title: 'Engagement winner',
        metricCandidates: ['engagement_rate', 'total_interactions', 'likes', 'comments', 'reposts'],
        actionPrefix: 'Publish more',
    },
    {
        title: 'Traffic winner',
        metricCandidates: ['clicks', 'click_through_rate', 'follows'],
        actionPrefix: 'Use more conversion-oriented',
    },
];

const HEATMAP_DAYS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HEATMAP_CHANNELS: Array<{ key: HeatmapChannelKey; label: string }> = [
    { key: 'instagram', label: 'Instagram' },
    { key: 'facebook', label: 'Facebook' },
    { key: 'linkedin', label: 'LinkedIn' },
    { key: 'website', label: 'GA4 Website' },
];

const STUB_NORMALIZED_SPIDER_ROWS: NormalizedSpiderRow[] = [
    { metric: 'ARR', instagram: 34, facebook: 33, linkedin: 0, website: 33, linkedinUnavailable: true },
    { metric: 'ER', instagram: 26, facebook: 24, linkedin: 22, website: 28 },
    { metric: 'CTR', instagram: 24, facebook: 26, linkedin: 20, website: 30 },
];

function stringifyDetail(detail: unknown): string {
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map(stringifyDetail).filter(Boolean).join(', ');
    if (detail && typeof detail === 'object') return JSON.stringify(detail);
    return '';
}

async function fetchJson<T>(path: string): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, { cache: 'no-store' });
    let payload: unknown = null;
    try {
        payload = await response.json();
    } catch {
        payload = null;
    }

    if (!response.ok) {
        const detail =
            payload && typeof payload === 'object' && 'detail' in payload
                ? (payload as { detail: unknown }).detail
                : payload;
        throw new Error(stringifyDetail(detail) || `Request failed (${response.status}).`);
    }

    return payload as T;
}

function toNumber(value: unknown): number | null {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
}

function safeRatio(numerator: number, denominator: number): number | null {
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null;
    return numerator / denominator;
}

function normalizeOffsetDate(dateText: string): string {
    return dateText.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
}

function parseDate(dateText: string): Date | null {
    const trimmed = dateText.trim();
    if (!trimmed) return null;

    const dashed = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dashed) {
        const parsed = new Date(Date.UTC(Number(dashed[1]), Number(dashed[2]) - 1, Number(dashed[3])));
        if (!Number.isNaN(parsed.getTime())) return parsed;
    }

    const compact = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (compact) {
        const parsed = new Date(Date.UTC(Number(compact[1]), Number(compact[2]) - 1, Number(compact[3])));
        if (!Number.isNaN(parsed.getTime())) return parsed;
    }

    const compactSingleDigitDay = trimmed.match(/^(\d{4})(\d{2})(\d)$/);
    if (compactSingleDigitDay) {
        const parsed = new Date(
            Date.UTC(
                Number(compactSingleDigitDay[1]),
                Number(compactSingleDigitDay[2]) - 1,
                Number(compactSingleDigitDay[3]),
            ),
        );
        if (!Number.isNaN(parsed.getTime())) return parsed;
    }

    const parsed = new Date(normalizeOffsetDate(trimmed));
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
}

function formatDateWithYear(date: Date): string {
    return date.toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function formatDateRangeLabel(range: DateRange | undefined): string {
    if (!range?.from) return 'Select date range';
    if (!range.to) return `${formatDateWithYear(range.from)} - Select end date`;
    return `${formatDateWithYear(range.from)} - ${formatDateWithYear(range.to)}`;
}

function startOfDay(date: Date): Date {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
}

function endOfDay(date: Date): Date {
    const copy = new Date(date);
    copy.setHours(23, 59, 59, 999);
    return copy;
}

function getLastThirtyDaysRange(): DateRange {
    const to = endOfDay(new Date());
    const from = startOfDay(new Date(to));
    from.setDate(from.getDate() - 29);
    return { from, to };
}

function getRelativeDateRange(days: number): DateRange {
    const to = endOfDay(new Date());
    const from = startOfDay(new Date(to));
    from.setDate(from.getDate() - (days - 1));
    return { from, to };
}

function toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function normalizePostType(postType: string | undefined): string {
    if (!postType || !postType.trim()) return 'Unknown';
    return postType
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function parsePostInsightRecords(payload: ManualPostInsightsResponse): PostInsightRecord[] {
    const rows = Array.isArray(payload.data) ? payload.data : [];
    const records: PostInsightRecord[] = [];

    for (const row of rows) {
        if (!row || typeof row !== 'object') continue;
        const item = row as ManualPostInsightItem;
        if (typeof item.post_id !== 'string' || !item.post_id.trim()) continue;
        if (!Array.isArray(item.insights)) continue;

        const metrics: Record<string, number> = {};
        for (const insight of item.insights) {
            if (!insight || typeof insight.name !== 'string') continue;
            const firstValue = Array.isArray(insight.values) && insight.values.length > 0
                ? toNumber(insight.values[0].value)
                : null;
            if (firstValue === null) continue;
            metrics[insight.name] = firstValue;
        }

        records.push({
            postId: item.post_id,
            postType: normalizePostType(item.post_type),
            metrics,
        });
    }

    return records;
}

function formatMetricLabel(metricKey: string): string {
    const known: Record<string, string> = {
        total_interactions: 'interactions',
        engagement_rate: 'engagement rate',
        click_through_rate: 'CTR',
        offsite_views: 'offsite views',
    };
    return known[metricKey] || metricKey.replace(/_/g, ' ');
}

function formatMetricValue(metricKey: string, value: number): string {
    if (metricKey.includes('rate') || metricKey.includes('ctr')) {
        return `${value.toFixed(2)}%`;
    }
    return Math.round(value).toLocaleString();
}

function buildEmptyDayRates(): Record<string, number> {
    return Object.fromEntries(HEATMAP_DAYS.map((day) => [day, 0]));
}

function buildStubHeatmapRates(): Record<HeatmapChannelKey, Record<string, number>> {
    const sums: Record<string, number> = buildEmptyDayRates();
    const counts: Record<string, number> = buildEmptyDayRates();
    for (const cell of heatmapData) {
        if (!Object.prototype.hasOwnProperty.call(sums, cell.day)) continue;
        sums[cell.day] += cell.value;
        counts[cell.day] += 1;
    }
    const dayRates: Record<string, number> = buildEmptyDayRates();
    for (const day of HEATMAP_DAYS) {
        const count = counts[day];
        dayRates[day] = count > 0 ? Number((sums[day] / count).toFixed(2)) : 0;
    }
    return {
        instagram: { ...dayRates },
        facebook: { ...dayRates },
        linkedin: { ...dayRates },
        website: { ...dayRates },
    };
}

function parseManualMetricMap(payload: ManualInsightsResponse): Map<string, DailyMetricPoint[]> {
    const map = new Map<string, DailyMetricPoint[]>();
    const entries = Array.isArray(payload.data) ? payload.data : [];
    for (const entry of entries) {
        if (!entry || typeof entry.name !== 'string' || !Array.isArray(entry.values)) continue;
        const points: DailyMetricPoint[] = [];
        for (const value of entry.values) {
            const numeric = toNumber(value?.value);
            if (numeric === null || typeof value?.end_time !== 'string') continue;
            const parsed = parseDate(value.end_time);
            if (!parsed) continue;
            points.push({
                date: parsed.toISOString().slice(0, 10),
                day: parsed.toLocaleDateString('en-US', { weekday: 'short' }),
                value: numeric,
            });
        }
        map.set(entry.name, points);
    }
    return map;
}

function sumPointSetsByDate(pointSets: DailyMetricPoint[][]): DailyMetricPoint[] {
    const map = new Map<string, { day: string; value: number }>();
    for (const points of pointSets) {
        for (const point of points) {
            const current = map.get(point.date) || { day: point.day, value: 0 };
            current.value += point.value;
            map.set(point.date, current);
        }
    }
    return Array.from(map.entries()).map(([date, data]) => ({
        date,
        day: data.day,
        value: data.value,
    }));
}

function sumDailyValues(points: DailyMetricPoint[]): number {
    return points.reduce((sum, point) => sum + point.value, 0);
}

function pointsByDate(points: DailyMetricPoint[]): Map<string, DailyMetricPoint> {
    const map = new Map<string, DailyMetricPoint>();
    for (const point of points) {
        const existing = map.get(point.date);
        if (!existing) {
            map.set(point.date, point);
        } else {
            map.set(point.date, { ...existing, value: existing.value + point.value });
        }
    }
    return map;
}

function filterPointsByDateRange(
    points: DailyMetricPoint[],
    range: DateRangeBounds | null,
): DailyMetricPoint[] {
    if (!range) return points;
    return points.filter((point) => {
        const parsed = parseDate(point.date);
        if (!parsed) return false;
        const timestamp = parsed.getTime();
        return timestamp >= range.startMs && timestamp <= range.endMs;
    });
}

function filterMetricMapByDateRange(
    metricMap: Map<string, DailyMetricPoint[]>,
    range: DateRangeBounds | null,
): Map<string, DailyMetricPoint[]> {
    if (!range) return metricMap;
    const filtered = new Map<string, DailyMetricPoint[]>();
    for (const [metricKey, points] of metricMap.entries()) {
        filtered.set(metricKey, filterPointsByDateRange(points, range));
    }
    return filtered;
}

function averagePointsByDay(points: DailyMetricPoint[]): Record<string, number> {
    const sums: Record<string, number> = buildEmptyDayRates();
    const counts: Record<string, number> = buildEmptyDayRates();

    for (const point of points) {
        if (!Object.prototype.hasOwnProperty.call(sums, point.day)) continue;
        sums[point.day] += point.value;
        counts[point.day] += 1;
    }

    const averages: Record<string, number> = buildEmptyDayRates();
    for (const day of HEATMAP_DAYS) {
        averages[day] = counts[day] > 0 ? Number((sums[day] / counts[day]).toFixed(2)) : 0;
    }
    return averages;
}

function buildEngagementRateByDay(
    numeratorPointSets: DailyMetricPoint[][],
    denominatorPoints: DailyMetricPoint[],
): Record<string, number> {
    const numeratorByDate = pointsByDate(sumPointSetsByDate(numeratorPointSets));
    const denominatorByDate = pointsByDate(denominatorPoints);
    const rates: DailyMetricPoint[] = [];

    for (const [date, numerator] of numeratorByDate.entries()) {
        const denominator = denominatorByDate.get(date);
        if (!denominator || denominator.value <= 0) continue;
        rates.push({
            date,
            day: numerator.day,
            value: (numerator.value / denominator.value) * 100,
        });
    }

    return averagePointsByDay(rates);
}

function buildGaEngagementRateByDay(
    engagementRate: number,
    pageviewSeries: { date: string; value: number }[] | undefined,
): Record<string, number> {
    const points: DailyMetricPoint[] = [];
    for (const point of pageviewSeries ?? []) {
        const parsed = parseDate(point.date) ?? new Date(point.date);
        if (Number.isNaN(parsed.getTime())) continue;
        points.push({
            date: parsed.toISOString().slice(0, 10),
            day: parsed.toLocaleDateString('en-US', { weekday: 'short' }),
            value: engagementRate,
        });
    }

    if (points.length === 0) {
        return Object.fromEntries(HEATMAP_DAYS.map((day) => [day, Number(engagementRate.toFixed(2))]));
    }

    return averagePointsByDay(points);
}

function normalizeByChannelSum(
    values: Record<HeatmapChannelKey, number | null>,
): Record<HeatmapChannelKey, number> {
    let total = 0;
    for (const value of Object.values(values)) {
        if (value !== null && Number.isFinite(value) && value >= 0) total += value;
    }
    if (total <= 0) {
        return { instagram: 0, facebook: 0, linkedin: 0, website: 0 };
    }

    return {
        instagram: values.instagram !== null ? Number(((values.instagram / total) * 100).toFixed(2)) : 0,
        facebook: values.facebook !== null ? Number(((values.facebook / total) * 100).toFixed(2)) : 0,
        linkedin: values.linkedin !== null ? Number(((values.linkedin / total) * 100).toFixed(2)) : 0,
        website: values.website !== null ? Number(((values.website / total) * 100).toFixed(2)) : 0,
    };
}

function buildNormalizedSpiderRows(params: {
    igReach: number;
    igFollowers: number;
    igInteractions: number;
    igLinkClicks: number;
    fbViews: number;
    fbFollowers: number;
    fbInteractions: number;
    fbLinkClicks: number;
    liImpressions: number;
    liInteractions: number;
    liClicks: number;
    websiteUsers: number;
    websitePageviews: number;
    websiteEngagedSessions: number;
    websiteConversions: number;
}): NormalizedSpiderRow[] {
    const arrRaw: Record<HeatmapChannelKey, number | null> = {
        instagram: safeRatio(params.igReach, params.igFollowers),
        facebook: safeRatio(params.fbViews, params.fbFollowers),
        linkedin: null, // LinkedIn follower metric is unavailable from current source.
        website: safeRatio(params.websiteUsers, params.websitePageviews),
    };
    const erRaw: Record<HeatmapChannelKey, number | null> = {
        instagram: safeRatio(params.igInteractions, params.igReach),
        facebook: safeRatio(params.fbInteractions, params.fbViews),
        linkedin: safeRatio(params.liInteractions, params.liImpressions),
        website: safeRatio(params.websiteEngagedSessions, params.websitePageviews),
    };
    const ctrRaw: Record<HeatmapChannelKey, number | null> = {
        instagram: safeRatio(params.igLinkClicks, params.igReach),
        facebook: safeRatio(params.fbLinkClicks, params.fbViews),
        linkedin: safeRatio(params.liClicks, params.liImpressions),
        website: safeRatio(params.websiteConversions, params.websitePageviews),
    };

    const arrNormalized = normalizeByChannelSum(arrRaw);
    const erNormalized = normalizeByChannelSum(erRaw);
    const ctrNormalized = normalizeByChannelSum(ctrRaw);

    return [
        {
            metric: 'ARR',
            instagram: arrNormalized.instagram,
            facebook: arrNormalized.facebook,
            linkedin: arrNormalized.linkedin,
            website: arrNormalized.website,
            linkedinUnavailable: true,
        },
        {
            metric: 'ER',
            instagram: erNormalized.instagram,
            facebook: erNormalized.facebook,
            linkedin: erNormalized.linkedin,
            website: erNormalized.website,
        },
        {
            metric: 'CTR',
            instagram: ctrNormalized.instagram,
            facebook: ctrNormalized.facebook,
            linkedin: ctrNormalized.linkedin,
            website: ctrNormalized.website,
        },
    ];
}

function findBestTypeByMetric(posts: PostInsightRecord[], metricCandidates: string[]): BestTypeMetric | null {
    for (const metricKey of metricCandidates) {
        const byType = new Map<string, { sum: number; count: number }>();

        for (const post of posts) {
            const metricValue = post.metrics[metricKey];
            if (!Number.isFinite(metricValue)) continue;
            const bucket = byType.get(post.postType) || { sum: 0, count: 0 };
            bucket.sum += metricValue;
            bucket.count += 1;
            byType.set(post.postType, bucket);
        }

        if (byType.size === 0) continue;

        let best: BestTypeMetric | null = null;
        for (const [postType, stats] of byType.entries()) {
            const average = stats.sum / Math.max(stats.count, 1);
            if (!best || average > best.average) {
                best = { postType, metricKey, average, sampleSize: stats.count };
            }
        }

        if (best) return best;
    }

    return null;
}

function buildActionableRecommendations(
    posts: PostInsightRecord[],
    goals: MetricGoalConfig[],
): string[] {
    if (posts.length === 0) return [];

    const recommendations: string[] = [];
    for (const goal of goals) {
        const best = findBestTypeByMetric(posts, goal.metricCandidates);
        if (!best) continue;
        recommendations.push(
            `${goal.title}: ${best.postType} posts lead with ${formatMetricValue(best.metricKey, best.average)} avg ${formatMetricLabel(best.metricKey)} per post (${best.sampleSize} posts). ${goal.actionPrefix} ${best.postType} posts in your next content cycle.`,
        );
    }

    return recommendations;
}

function SourceChip({
    live,
    label,
    offlineLabel = 'Stub data',
}: {
    live: boolean;
    label: string;
    offlineLabel?: string;
}) {
    return (
        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${
            live
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-stone-100 text-stone-500 border-stone-200'
        }`}>
            {live ? <Wifi className="h-2.5 w-2.5" /> : <WifiOff className="h-2.5 w-2.5" />}
            {live ? `Live${label ? ' · ' + label : ''}` : offlineLabel}
        </span>
    );
}

export default function AnalyticsPage() {
    const [metric, setMetric] = useState<'reach' | 'comments' | 'shares' | 'engagement'>('reach');
    const [selectedCalendarRange, setSelectedCalendarRange] = useState<DateRange | undefined>(getLastThirtyDaysRange());
    const [dashboardTimeframe, setDashboardTimeframe] = useState<DashboardTimeframePreset>('last_30_days');

    const selectedDateRange = useMemo<DateRangeBounds | null>(() => {
        if (!selectedCalendarRange?.from || !selectedCalendarRange?.to) return null;
        const startDate = startOfDay(selectedCalendarRange.from);
        const endDate = endOfDay(selectedCalendarRange.to);
        return {
            startMs: startDate.getTime(),
            endMs: endDate.getTime(),
            startDate,
            endDate,
        };
    }, [selectedCalendarRange]);

    const apiStartDate = selectedDateRange
        ? toIsoDate(selectedDateRange.startDate)
        : dashboardTimeframe === 'all_time'
            ? '365daysAgo'
            : '30daysAgo';
    const apiEndDate = selectedDateRange ? toIsoDate(selectedDateRange.endDate) : 'today';

    const applyDashboardTimeframe = useCallback((preset: DashboardTimeframePreset) => {
        setDashboardTimeframe(preset);
        if (preset === 'all_time') {
            setSelectedCalendarRange(undefined);
            return;
        }
        if (preset === 'last_7_days') {
            setSelectedCalendarRange(getRelativeDateRange(7));
            return;
        }
        if (preset === 'last_30_days') {
            setSelectedCalendarRange(getRelativeDateRange(30));
            return;
        }
        if (preset === 'last_90_days') {
            setSelectedCalendarRange(getRelativeDateRange(90));
            return;
        }
    }, []);

    // ── Live channel-level data (CSV-backed for IG/FB/LI) ────────────────────
    const { channelStats, loading: channelLoading } = useAllChannelsData();

    // ── Analytics data: post types, posting times, spider chart ──────────────
    // useChannelAnalytics accepts live channelStats so spider scores are always
    // computed from the freshest data available.
    const {
        postTypePerformance,
        optimalPostingTimes,
        loading: analyticsLoading,
        livePostTypes,
        livePostingTimes,
    } = useChannelAnalytics(channelStats);

    const [instagramPostRecords, setInstagramPostRecords] = useState<PostInsightRecord[]>([]);
    const [linkedinPostRecords, setLinkedinPostRecords] = useState<PostInsightRecord[]>([]);
    const [instagramInsightsLive, setInstagramInsightsLive] = useState(false);
    const [linkedinInsightsLive, setLinkedinInsightsLive] = useState(false);
    const [postInsightsLoading, setPostInsightsLoading] = useState(true);
    const [postInsightsError, setPostInsightsError] = useState<string | null>(null);
    const [engagementHeatmapRates, setEngagementHeatmapRates] =
        useState<Record<HeatmapChannelKey, Record<string, number>>>(buildStubHeatmapRates());
    const [engagementHeatmapLive, setEngagementHeatmapLive] = useState(false);
    const [engagementHeatmapLoading, setEngagementHeatmapLoading] = useState(true);
    const [engagementHeatmapError, setEngagementHeatmapError] = useState<string | null>(null);
    const [normalizedSpiderRows, setNormalizedSpiderRows] =
        useState<NormalizedSpiderRow[]>(STUB_NORMALIZED_SPIDER_ROWS);
    const [normalizedSpiderLive, setNormalizedSpiderLive] = useState(false);
    const [normalizedSpiderLoading, setNormalizedSpiderLoading] = useState(true);
    const [normalizedSpiderError, setNormalizedSpiderError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const loadPostInsights = async () => {
            setPostInsightsLoading(true);
            setPostInsightsError(null);

            const [instagramResult, linkedinResult] = await Promise.allSettled([
                fetchJson<ManualPostInsightsResponse>(
                    `/manual/insta/posts/${encodeURIComponent(INSTAGRAM_USER_ID)}/insights?period=lifetime`,
                ).then(parsePostInsightRecords),
                fetchJson<ManualPostInsightsResponse>(
                    `/manual/linkedin/posts/${encodeURIComponent(LINKEDIN_ORG_ID)}/insights?period=lifetime`,
                ).then(parsePostInsightRecords),
            ]);

            if (cancelled) return;

            const errors: string[] = [];

            if (instagramResult.status === 'fulfilled') {
                setInstagramPostRecords(instagramResult.value);
                setInstagramInsightsLive(true);
            } else {
                setInstagramPostRecords([]);
                setInstagramInsightsLive(false);
                errors.push(`Instagram: ${(instagramResult.reason as Error).message}`);
            }

            if (linkedinResult.status === 'fulfilled') {
                setLinkedinPostRecords(linkedinResult.value);
                setLinkedinInsightsLive(true);
            } else {
                setLinkedinPostRecords([]);
                setLinkedinInsightsLive(false);
                errors.push(`LinkedIn: ${(linkedinResult.reason as Error).message}`);
            }

            setPostInsightsError(errors.length > 0 ? errors.join(' ') : null);
            setPostInsightsLoading(false);
        };

        loadPostInsights().catch((error) => {
            if (cancelled) return;
            setPostInsightsError((error as Error).message || 'Failed to load post insights.');
            setPostInsightsLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, []);

    const instagramRecommendations = useMemo(
        () => buildActionableRecommendations(instagramPostRecords, INSTAGRAM_METRIC_GOALS),
        [instagramPostRecords],
    );
    const linkedinRecommendations = useMemo(
        () => buildActionableRecommendations(linkedinPostRecords, LINKEDIN_METRIC_GOALS),
        [linkedinPostRecords],
    );

    useEffect(() => {
        let cancelled = false;

        const loadEngagementHeatmap = async () => {
            setEngagementHeatmapLoading(true);
            setEngagementHeatmapError(null);
            setNormalizedSpiderLoading(true);
            setNormalizedSpiderError(null);

            const igParams = new URLSearchParams({
                metric: 'reach,content_interactions,instagram_link_clicks,instagram_follows',
                period: 'day',
            });
            const fbParams = new URLSearchParams({
                metric: 'views,content_interactions,facebook_link_clicks,facebook_follows',
                period: 'day',
            });
            const liParams = new URLSearchParams({
                metric: 'impressions,reactions,comments,reposts,clicks',
                period: 'day',
            });

            const [
                igResult,
                fbResult,
                liResult,
                gaEngagementResult,
                gaPageviewsResult,
                gaOverviewResult,
                gaConversionsResult,
            ] = await Promise.allSettled([
                fetchJson<ManualInsightsResponse>(
                    `/manual/insta/insights/${encodeURIComponent(INSTAGRAM_USER_ID)}?${igParams.toString()}`,
                ),
                fetchJson<ManualInsightsResponse>(
                    `/manual/facebook/insights/${encodeURIComponent(FACEBOOK_USER_ID)}?${fbParams.toString()}`,
                ),
                fetchJson<ManualInsightsResponse>(
                    `/manual/linkedin/insights/${encodeURIComponent(LINKEDIN_ORG_ID)}?${liParams.toString()}`,
                ),
                getGAEngagement(apiStartDate, apiEndDate),
                getGAPageviews('day', apiStartDate, apiEndDate),
                getGAOverview(apiStartDate, apiEndDate),
                getGAConversions(apiStartDate, apiEndDate),
            ]);

            if (cancelled) return;

            const nextRates = buildStubHeatmapRates();
            const errors: string[] = [];
            let liveCount = 0;
            const spiderErrors: string[] = [];
            let spiderLiveCount = 0;
            let igMetricMap: Map<string, DailyMetricPoint[]> | null = null;
            let fbMetricMap: Map<string, DailyMetricPoint[]> | null = null;
            let liMetricMap: Map<string, DailyMetricPoint[]> | null = null;

            if (igResult.status === 'fulfilled') {
                const metricMap = filterMetricMapByDateRange(parseManualMetricMap(igResult.value), selectedDateRange);
                igMetricMap = metricMap;
                nextRates.instagram = buildEngagementRateByDay(
                    [metricMap.get('content_interactions') || []],
                    metricMap.get('reach') || [],
                );
                liveCount += 1;
                spiderLiveCount += 1;
            } else {
                errors.push(`Instagram: ${(igResult.reason as Error).message}`);
                spiderErrors.push(`Instagram: ${(igResult.reason as Error).message}`);
            }

            if (fbResult.status === 'fulfilled') {
                const metricMap = filterMetricMapByDateRange(parseManualMetricMap(fbResult.value), selectedDateRange);
                fbMetricMap = metricMap;
                nextRates.facebook = buildEngagementRateByDay(
                    [metricMap.get('content_interactions') || []],
                    metricMap.get('views') || [],
                );
                liveCount += 1;
                spiderLiveCount += 1;
            } else {
                errors.push(`Facebook: ${(fbResult.reason as Error).message}`);
                spiderErrors.push(`Facebook: ${(fbResult.reason as Error).message}`);
            }

            if (liResult.status === 'fulfilled') {
                const metricMap = filterMetricMapByDateRange(parseManualMetricMap(liResult.value), selectedDateRange);
                liMetricMap = metricMap;
                nextRates.linkedin = buildEngagementRateByDay(
                    [
                        metricMap.get('reactions') || [],
                        metricMap.get('comments') || [],
                        metricMap.get('reposts') || [],
                    ],
                    metricMap.get('impressions') || [],
                );
                liveCount += 1;
                spiderLiveCount += 1;
            } else {
                errors.push(`LinkedIn: ${(liResult.reason as Error).message}`);
                spiderErrors.push(`LinkedIn: ${(liResult.reason as Error).message}`);
            }

            if (gaEngagementResult.status === 'fulfilled') {
                const gaRate = Number((gaEngagementResult.value.engagement_rate || 0).toFixed(2));
                const gaPageviewSeries =
                    gaPageviewsResult.status === 'fulfilled' ? gaPageviewsResult.value.series : undefined;
                nextRates.website = buildGaEngagementRateByDay(gaRate, gaPageviewSeries);
                liveCount += 1;
                spiderLiveCount += 1;
            } else {
                errors.push(`GA4: ${(gaEngagementResult.reason as Error).message}`);
                spiderErrors.push(`GA engagement: ${(gaEngagementResult.reason as Error).message}`);
            }

            setEngagementHeatmapRates(nextRates);
            setEngagementHeatmapLive(liveCount >= 3);
            setEngagementHeatmapError(errors.length > 0 ? errors.join(' ') : null);
            setEngagementHeatmapLoading(false);

            const pageviewsForWebsite =
                gaOverviewResult.status === 'fulfilled'
                    ? Math.max(gaOverviewResult.value.pageviews, 0)
                    : gaPageviewsResult.status === 'fulfilled'
                        ? Math.max(gaPageviewsResult.value.total, 0)
                        : 0;
            const spiderRows = buildNormalizedSpiderRows({
                igReach: sumDailyValues(igMetricMap?.get('reach') || []),
                igFollowers: sumDailyValues(igMetricMap?.get('instagram_follows') || []),
                igInteractions: sumDailyValues(igMetricMap?.get('content_interactions') || []),
                igLinkClicks: sumDailyValues(igMetricMap?.get('instagram_link_clicks') || []),
                fbViews: sumDailyValues(fbMetricMap?.get('views') || []),
                fbFollowers: sumDailyValues(fbMetricMap?.get('facebook_follows') || []),
                fbInteractions: sumDailyValues(fbMetricMap?.get('content_interactions') || []),
                fbLinkClicks: sumDailyValues(fbMetricMap?.get('facebook_link_clicks') || []),
                liImpressions: sumDailyValues(liMetricMap?.get('impressions') || []),
                liInteractions:
                    sumDailyValues(liMetricMap?.get('reactions') || []) +
                    sumDailyValues(liMetricMap?.get('comments') || []) +
                    sumDailyValues(liMetricMap?.get('reposts') || []),
                liClicks: sumDailyValues(liMetricMap?.get('clicks') || []),
                websiteUsers: gaOverviewResult.status === 'fulfilled' ? gaOverviewResult.value.users : 0,
                websitePageviews: pageviewsForWebsite,
                websiteEngagedSessions: gaEngagementResult.status === 'fulfilled'
                    ? gaEngagementResult.value.engaged_sessions
                    : 0,
                websiteConversions: gaConversionsResult.status === 'fulfilled' ? gaConversionsResult.value.total : 0,
            });
            setNormalizedSpiderRows(spiderRows);
            setNormalizedSpiderLive(spiderLiveCount >= 3);
            setNormalizedSpiderError(spiderErrors.length > 0 ? spiderErrors.join(' ') : null);
            setNormalizedSpiderLoading(false);
        };

        loadEngagementHeatmap().catch((error) => {
            if (cancelled) return;
            setEngagementHeatmapError((error as Error).message || 'Failed to load engagement heatmap.');
            setEngagementHeatmapLoading(false);
            setNormalizedSpiderError((error as Error).message || 'Failed to load normalized spider graph.');
            setNormalizedSpiderLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [apiEndDate, apiStartDate, selectedDateRange]);

    const heatmapMaxValue = useMemo(() => {
        let maxValue = 0;
        for (const channel of HEATMAP_CHANNELS) {
            for (const day of HEATMAP_DAYS) {
                const value = engagementHeatmapRates[channel.key]?.[day] ?? 0;
                if (value > maxValue) maxValue = value;
            }
        }
        return maxValue > 0 ? maxValue : 1;
    }, [engagementHeatmapRates]);

    const loading =
        channelLoading ||
        analyticsLoading ||
        postInsightsLoading ||
        engagementHeatmapLoading ||
        normalizedSpiderLoading;

    // ── Bar chart data ────────────────────────────────────────────────────────
    const barData = postTypePerformance.map(p => ({
        type: p.type,
        value: metric === 'reach'      ? p.reach
             : metric === 'comments'  ? p.comments
             : metric === 'shares'    ? p.shares
             : p.engagement,
    }));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-heading font-bold text-stone-900">Analytics</h1>
                    <p className="text-sm text-stone-500 mt-1">Deep-dive into your content performance and audience behaviour.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Select
                        value={dashboardTimeframe}
                        onValueChange={(value) => applyDashboardTimeframe(value as DashboardTimeframePreset)}
                    >
                        <SelectTrigger className="h-8 w-[150px] text-xs">
                            <SelectValue placeholder="Timeframe" />
                        </SelectTrigger>
                        <SelectContent>
                            {DASHBOARD_TIMEFRAME_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 text-xs text-stone-700">
                                <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                                {formatDateRangeLabel(selectedCalendarRange)}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <DayPicker
                                mode="range"
                                selected={selectedCalendarRange}
                                onSelect={(range) => {
                                    setSelectedCalendarRange(range);
                                    if (!range?.from && !range?.to) {
                                        setDashboardTimeframe('all_time');
                                        return;
                                    }
                                    if (range?.from && range.to) {
                                        setDashboardTimeframe('custom');
                                    }
                                }}
                                numberOfMonths={2}
                                disabled={{ after: new Date() }}
                                className="p-3"
                            />
                        </PopoverContent>
                    </Popover>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => {
                            setSelectedCalendarRange(undefined);
                            setDashboardTimeframe('all_time');
                        }}
                        disabled={!selectedCalendarRange?.from && !selectedCalendarRange?.to}
                    >
                        Clear dates
                    </Button>
                    {loading && (
                        <span className="text-xs text-stone-400 animate-pulse">Loading live data…</span>
                    )}
                </div>
            </div>
            <div className="text-xs text-stone-500">
                {selectedDateRange
                    ? `Selected range: ${formatDateWithYear(selectedDateRange.startDate)} - ${formatDateWithYear(selectedDateRange.endDate)}`
                    : `Selected range: ${dashboardTimeframe === 'all_time' ? 'All time' : 'Last 30 days'}`}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* ── Post / Content Type Performance ───────────────────────── */}
                <ChartCard
                    title="Content Performance by Type"
                    description={
                        <span className="flex items-center gap-2">
                            Reach, engagement, comments & shares per content type
                            <SourceChip live={livePostTypes} label={livePostTypes ? 'IG API + LI API' : ''} />
                        </span>
                    }
                >
                    <div className="mb-3">
                        <Tabs value={metric} onValueChange={v => setMetric(v as typeof metric)}>
                            <TabsList className="bg-stone-100 h-8">
                                <TabsTrigger value="reach"      className="text-xs">Reach</TabsTrigger>
                                <TabsTrigger value="comments"   className="text-xs">Comments</TabsTrigger>
                                <TabsTrigger value="shares"     className="text-xs">Shares</TabsTrigger>
                                <TabsTrigger value="engagement" className="text-xs">Engagement %</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                                <XAxis dataKey="type" tick={{ fontSize: 9, fill: '#78716C' }} />
                                <YAxis tick={{ fontSize: 11, fill: '#78716C' }} />
                                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E7E5E4', fontSize: 12 }} />
                                <Bar dataKey="value" fill="#E5A100" radius={[4, 4, 0, 0]} name={metric} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                {/* ── Optimal Posting Times ──────────────────────────────────── */}
                <ChartCard
                    title="Optimal Posting Times"
                    description={
                        <span className="flex items-center gap-2">
                            Best performing posting days this period
                            <SourceChip live={livePostingTimes} label={livePostingTimes ? 'IG engagement series' : ''} />
                        </span>
                    }
                >
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={optimalPostingTimes.map(t => ({
                                label: `${t.day.slice(0, 3)} ${String(t.hour).padStart(2, '0')}:00`,
                                engagement: t.engagement,
                            }))}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#78716C' }} />
                                <YAxis tick={{ fontSize: 11, fill: '#78716C' }} domain={[0, 'auto']} />
                                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E7E5E4', fontSize: 12 }} />
                                <Bar dataKey="engagement" fill="#4A90D9" radius={[4, 4, 0, 0]} name="Engagement %" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    {(() => {
                        const best = [...optimalPostingTimes].sort((a, b) => b.engagement - a.engagement)[0];
                        return best ? (
                            <div className="mt-3 px-3 py-2 bg-amber-50 rounded-lg border border-amber-200">
                                <p className="text-xs text-amber-800 font-medium">
                                    🌟 Best time: {best.day} at {String(best.hour).padStart(2, '0')}:00
                                    — {best.engagement}% engagement {livePostingTimes ? '(from your live data)' : '(estimated)'}
                                </p>
                            </div>
                        ) : null;
                    })()}
                </ChartCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* ── Multi-Channel Radar ────────────────────────────────────── */}
                <ChartCard
                    title="Normalized ARR/ER/CTR Radar"
                    description={
                        <span className="flex items-center gap-2">
                            Share-normalized rates using the same engagement-base sourcing as comparative statistics
                            <SourceChip
                                live={normalizedSpiderLive}
                                label={normalizedSpiderLive ? 'IG + FB + LI + GA4' : ''}
                                offlineLabel="Fallback model"
                            />
                        </span>
                    }
                >
                    {normalizedSpiderRows.length === 0 ? (
                        <div className="h-72 flex items-center justify-center text-stone-400 text-sm animate-pulse">
                            Computing scores from live data…
                        </div>
                    ) : (
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart data={normalizedSpiderRows}>
                                    <PolarGrid stroke="#E7E5E4" />
                                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#78716C' }} />
                                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: '#A8A29E' }} />
                                    <Radar name="Instagram" dataKey="instagram" stroke="#E4405F" fill="#E4405F" fillOpacity={0.15} strokeWidth={2} />
                                    <Radar name="Facebook"  dataKey="facebook"  stroke="#1877F2" fill="#1877F2" fillOpacity={0.12} strokeWidth={2} />
                                    <Radar name="LinkedIn"  dataKey="linkedin"  stroke="#0A66C2" fill="#0A66C2" fillOpacity={0.15} strokeWidth={2} />
                                    <Radar name="GA4 Website" dataKey="website" stroke="#4A90D9" fill="#4A90D9" fillOpacity={0.12} strokeWidth={2} />
                                    <Legend />
                                    <Tooltip
                                        contentStyle={{ borderRadius: 8, border: '1px solid #E7E5E4', fontSize: 12 }}
                                        formatter={(value, name, item) => {
                                            const row = (item?.payload || {}) as NormalizedSpiderRow;
                                            if (row.metric === 'ARR' && name === 'LinkedIn') return ['--', name];
                                            const numeric = typeof value === 'number' ? value : Number(value);
                                            if (!Number.isFinite(numeric)) return ['--', name];
                                            return [`${numeric.toFixed(2)}%`, name];
                                        }}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                    <p className="mt-2 text-[10px] text-stone-400 text-center">
                        Normalization: channel metric / sum(all channels for that metric) × 100.
                    </p>
                    <p className="mt-1 text-[10px] text-stone-400 text-center">
                        LinkedIn ARR is shown as -- (followers are unavailable in the current LinkedIn source).
                    </p>
                    {normalizedSpiderError && (
                        <p className="mt-1 text-[10px] text-amber-700 text-center">
                            Some live rate inputs could not be loaded: {normalizedSpiderError}
                        </p>
                    )}
                </ChartCard>

                {/* ── Engagement Heatmap ─────────────────────────────────────── */}
                <ChartCard
                    title="Engagement Heatmap (Cross-Channel)"
                    description={
                        <span className="flex items-center gap-2">
                            Day-wise engagement intensity using comparative-statistics formulas
                            <SourceChip
                                live={engagementHeatmapLive}
                                label={engagementHeatmapLive ? 'IG + FB + LI + GA4' : ''}
                                offlineLabel="Fallback model"
                            />
                        </span>
                    }
                >
                    <div className="overflow-x-auto">
                        <div className="min-w-[420px]">
                            <div className="grid grid-cols-[90px_repeat(7,1fr)] gap-0.5">
                                <div />
                                {HEATMAP_DAYS.map(day => (
                                    <div key={day} className="text-[10px] text-stone-400 text-center">{day}</div>
                                ))}
                                {HEATMAP_CHANNELS.map(channel => (
                                    <div key={channel.key} className="contents">
                                        <div className="text-[10px] text-stone-600 flex items-center pr-2">{channel.label}</div>
                                        {HEATMAP_DAYS.map(day => {
                                            const value = engagementHeatmapRates[channel.key]?.[day] ?? 0;
                                            const opacity = Math.max(0.1, value / heatmapMaxValue);
                                            return (
                                                <div
                                                    key={`${channel.key}-${day}`}
                                                    className="h-7 rounded-sm cursor-pointer transition-all hover:ring-1 hover:ring-amber-500"
                                                    style={{ backgroundColor: `rgba(229, 161, 0, ${opacity})` }}
                                                    title={`${channel.label} • ${day}: ${value.toFixed(2)}% engagement`}
                                                />
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-2 mt-2 justify-end">
                                <span className="text-[9px] text-stone-400">Low</span>
                                <div className="flex gap-0.5">
                                    {[0.1, 0.25, 0.45, 0.65, 0.85].map(o => (
                                        <div key={o} className="w-4 h-2 rounded-sm" style={{ backgroundColor: `rgba(229, 161, 0, ${o})` }} />
                                    ))}
                                </div>
                                <span className="text-[9px] text-stone-400">High</span>
                            </div>
                        </div>
                    </div>
                    <p className="mt-2 text-[10px] text-stone-500">
                        Formula: IG = interactions/reach, FB = interactions/views, LI = (reactions+comments+reposts)/impressions, GA4 = engagement rate.
                    </p>
                    {engagementHeatmapError && (
                        <p className="mt-1 text-[10px] text-amber-700">
                            Some live series could not be loaded: {engagementHeatmapError}
                        </p>
                    )}
                </ChartCard>

            </div>

            {/* ── Actionable insights from MongoDB post datasets ─────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-stone-700 flex items-center gap-2">
                            <Instagram className="h-4 w-4 text-pink-600" />
                            Instagram Actionable Insights
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <Badge className="text-[9px] bg-stone-100 text-stone-600 font-normal">
                                {instagramPostRecords.length} posts analysed
                            </Badge>
                            <SourceChip
                                live={instagramInsightsLive}
                                label={instagramInsightsLive ? 'MongoDB post insights' : ''}
                                offlineLabel="Unavailable"
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {instagramRecommendations.length === 0 ? (
                            <p className="text-sm text-stone-500">
                                No Instagram post-level insights are available yet for this account.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {instagramRecommendations.map((text, index) => {
                                    const Icon = index === 0 ? TrendingUp : index === 1 ? Lightbulb : Clock;
                                    return (
                                        <div key={text} className="flex items-start gap-3 p-3 rounded-lg bg-stone-50">
                                            <div className="mt-0.5 text-amber-600 shrink-0">
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <p className="text-sm text-stone-700">{text}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-stone-700 flex items-center gap-2">
                            <Linkedin className="h-4 w-4 text-[#0A66C2]" />
                            LinkedIn Actionable Insights
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <Badge className="text-[9px] bg-stone-100 text-stone-600 font-normal">
                                {linkedinPostRecords.length} posts analysed
                            </Badge>
                            <SourceChip
                                live={linkedinInsightsLive}
                                label={linkedinInsightsLive ? 'MongoDB post insights' : ''}
                                offlineLabel="Unavailable"
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {linkedinRecommendations.length === 0 ? (
                            <p className="text-sm text-stone-500">
                                No LinkedIn post-level insights are available yet for this account.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {linkedinRecommendations.map((text, index) => {
                                    const Icon = index === 0 ? TrendingUp : index === 1 ? Lightbulb : Clock;
                                    return (
                                        <div key={text} className="flex items-start gap-3 p-3 rounded-lg bg-stone-50">
                                            <div className="mt-0.5 text-amber-600 shrink-0">
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <p className="text-sm text-stone-700">{text}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            {postInsightsError && (
                <p className="text-xs text-amber-700">
                    Some live post-insights datasets could not be loaded: {postInsightsError}
                </p>
            )}
        </div>
    );
}
