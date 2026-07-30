'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DayPicker, DateRange } from 'react-day-picker';
import {
    ChartCard,
    MetricKPI,
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from '@/components/charts/ChartComponents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// LinkedIn data now comes entirely from /manual/linkedin/ endpoint
import {
    getGAOverview,
    getGAPageviews,
    getGAEngagement,
    getGAConversions,
    type GAOverview,
    type GAPageviews,
    type GAEngagement,
    type GAConversions,
} from '@/lib/api/ga-api';
import {
    CalendarDays,
    Globe,
    Loader2,
    MessageCircleHeart,
    RefreshCw,
    Users,
    Eye,
} from 'lucide-react';

const API_BASE =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) ||
    'http://localhost:8000';
const INSTAGRAM_USER_ID = 'ClubArtizen';
const FACEBOOK_USER_ID = 'ClubArtizen';
const LINKEDIN_ORG_ID = 'ClubArtizen';

// LinkedIn metrics available from /manual/linkedin/insights
const LI_METRICS = [
    'impressions',
    'clicks',
    'reactions',
    'comments',
    'reposts',
] as const;

type LinkedInMetricKey = (typeof LI_METRICS)[number];
type LinkedInSeries = Record<LinkedInMetricKey, ValuePoint[]>;

function isLinkedInMetricKey(key: string): key is LinkedInMetricKey {
    return LI_METRICS.includes(key as LinkedInMetricKey);
}

function createEmptyLinkedInSeries(): LinkedInSeries {
    return {
        impressions: [],
        clicks: [],
        reactions: [],
        comments: [],
        reposts: [],
    };
}

function parseLinkedInInsights(payload: ManualInsightsResponse): LinkedInSeries {
    const parsed = createEmptyLinkedInSeries();
    const entries = Array.isArray(payload.data) ? payload.data : [];
    for (const entry of entries) {
        if (!entry || typeof entry.name !== 'string') continue;
        if (!isLinkedInMetricKey(entry.name)) continue;
        parsed[entry.name] = parseManualPoints(entry.values);
    }
    return parsed;
}

async function fetchLinkedInInsights(): Promise<LinkedInSeries> {
    const metricParams = new URLSearchParams({
        metric: LI_METRICS.join(','),
        period: 'day',
    });
    const payload = await fetchManualInsights([
        `/manual/linkedin/insights/${encodeURIComponent(LINKEDIN_ORG_ID)}?${metricParams.toString()}`,
    ]);
    return parseLinkedInInsights(payload);
}

const IG_METRICS = [
    'reach',
    'views',
    'content_interactions',
    'instagram_link_clicks',
    'instagram_follows',
] as const;

const FB_METRICS = [
    'views',
    'viewers',
    'content_interactions',
    'facebook_link_clicks',
    'facebook_follows',
] as const;

const BASIS_PAGES = [
    { id: 'audience', label: 'Audience Base' },
    { id: 'visibility', label: 'Visibility & Viewers' },
    { id: 'engagement', label: 'Engagement Base' },
    { id: 'traffic', label: 'Traffic & Conversion' },
] as const;

type BasisId = (typeof BASIS_PAGES)[number]['id'];
type InstagramMetricKey = (typeof IG_METRICS)[number];
type FacebookMetricKey = (typeof FB_METRICS)[number];

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

interface ValuePoint {
    date: string;
    dateLabel: string;
    value: number;
    timestamp: number;
}

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

type InstagramSeries = Record<InstagramMetricKey, ValuePoint[]>;
type FacebookSeries = Record<FacebookMetricKey, ValuePoint[]>;

function normalizeOffsetDate(dateText: string): string {
    return dateText.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
}

function parseDate(dateText: string): Date | null {
    const parsed = new Date(normalizeOffsetDate(dateText));
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
}

function toNumber(value: unknown): number | null {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    return numeric;
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

function stringifyDetail(detail: unknown): string {
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map(stringifyDetail).filter(Boolean).join(', ');
    if (detail && typeof detail === 'object') return JSON.stringify(detail);
    return '';
}

function isInstagramMetricKey(key: string): key is InstagramMetricKey {
    return IG_METRICS.includes(key as InstagramMetricKey);
}

function isFacebookMetricKey(key: string): key is FacebookMetricKey {
    return FB_METRICS.includes(key as FacebookMetricKey);
}

function parseManualPoints(values: ManualInsightValue[] | undefined): ValuePoint[] {
    const points: ValuePoint[] = [];
    for (const item of values ?? []) {
        const value = toNumber(item?.value);
        const parsed = typeof item?.end_time === 'string' ? parseDate(item.end_time) : null;
        if (value === null || parsed === null) continue;
        points.push({
            date: parsed.toISOString().slice(0, 10),
            dateLabel: formatDateWithYear(parsed),
            value,
            timestamp: parsed.getTime(),
        });
    }
    points.sort((a, b) => a.timestamp - b.timestamp);
    return points;
}

function createEmptyInstagramSeries(): InstagramSeries {
    return {
        reach: [],
        views: [],
        content_interactions: [],
        instagram_link_clicks: [],
        instagram_follows: [],
    };
}

function createEmptyFacebookSeries(): FacebookSeries {
    return {
        views: [],
        viewers: [],
        content_interactions: [],
        facebook_link_clicks: [],
        facebook_follows: [],
    };
}

function parseInstagramInsights(payload: ManualInsightsResponse): InstagramSeries {
    const parsed = createEmptyInstagramSeries();
    const entries = Array.isArray(payload.data) ? payload.data : [];
    for (const entry of entries) {
        if (!entry || typeof entry.name !== 'string') continue;
        if (!isInstagramMetricKey(entry.name)) continue;
        parsed[entry.name] = parseManualPoints(entry.values);
    }
    return parsed;
}

function parseFacebookInsights(payload: ManualInsightsResponse): FacebookSeries {
    const parsed = createEmptyFacebookSeries();
    const entries = Array.isArray(payload.data) ? payload.data : [];
    for (const entry of entries) {
        if (!entry || typeof entry.name !== 'string') continue;
        if (!isFacebookMetricKey(entry.name)) continue;
        parsed[entry.name] = parseManualPoints(entry.values);
    }
    return parsed;
}

async function fetchManualInsights(paths: string[]): Promise<ManualInsightsResponse> {
    let lastErrorMessage = '';

    for (const path of paths) {
        const response = await fetch(`${API_BASE}${path}`, { cache: 'no-store' });
        let payload: unknown = null;
        try {
            payload = await response.json();
        } catch {
            payload = null;
        }
        if (response.ok) {
            return (payload ?? {}) as ManualInsightsResponse;
        }
        const detail =
            payload && typeof payload === 'object' && payload && 'detail' in payload
                ? (payload as { detail: unknown }).detail
                : payload;
        lastErrorMessage = stringifyDetail(detail) || `Manual insights request failed (${response.status}).`;
    }

    throw new Error(lastErrorMessage || 'Manual insights request failed.');
}

async function fetchInstagramInsights(): Promise<InstagramSeries> {
    const metricParams = new URLSearchParams({
        metric: IG_METRICS.join(','),
        period: 'day',
    });
    const payload = await fetchManualInsights([
        `/manual/instagram/insights/${encodeURIComponent(INSTAGRAM_USER_ID)}?${metricParams.toString()}`,
        `/manual/insta/insights/${encodeURIComponent(INSTAGRAM_USER_ID)}?${metricParams.toString()}`,
    ]);
    return parseInstagramInsights(payload);
}

async function fetchFacebookInsights(): Promise<FacebookSeries> {
    const metricParams = new URLSearchParams({
        metric: FB_METRICS.join(','),
        period: 'day',
    });
    const payload = await fetchManualInsights([
        `/manual/facebook/insights/${encodeURIComponent(FACEBOOK_USER_ID)}?${metricParams.toString()}`,
    ]);
    return parseFacebookInsights(payload);
}

function mapSeries(series: { date: string; value: number }[] | undefined): ValuePoint[] {
    const points: ValuePoint[] = [];
    for (const point of series ?? []) {
        const parsed = parseDate(point.date) ?? new Date(point.date);
        if (Number.isNaN(parsed.getTime())) continue;
        points.push({
            date: parsed.toISOString().slice(0, 10),
            dateLabel: formatDateWithYear(parsed),
            value: point.value,
            timestamp: parsed.getTime(),
        });
    }
    points.sort((a, b) => a.timestamp - b.timestamp);
    return points;
}

function filterPointsByRange(points: ValuePoint[], range: DateRangeBounds | null): ValuePoint[] {
    if (!range) return points;
    return points.filter((point) => point.timestamp >= range.startMs && point.timestamp <= range.endMs);
}

function sumValues(points: ValuePoint[]): number {
    return points.reduce((sum, point) => sum + point.value, 0);
}

function average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function latestDateLabel(points: ValuePoint[]): string {
    const latest = points[points.length - 1];
    return latest ? latest.dateLabel : '—';
}

function buildTrendData(
    seriesMap: Array<{ key: string; points: ValuePoint[] }>,
): Array<Record<string, string | number>> {
    const rows = new Map<string, Record<string, string | number>>();

    for (const series of seriesMap) {
        for (const point of series.points) {
            const existing = rows.get(point.date) ?? {
                dateLabel: point.dateLabel,
                sortValue: point.timestamp,
            };
            existing.dateLabel = point.dateLabel;
            existing.sortValue = point.timestamp;
            existing[series.key] = point.value;
            rows.set(point.date, existing);
        }
    }

    return Array.from(rows.values())
        .sort((a, b) => Number(a.sortValue) - Number(b.sortValue))
        .map((row) => {
            const { sortValue: _sortValue, ...rest } = row;
            return rest;
        });
}

export default function ComparativeStatisticsPage() {
    const [selectedCalendarRange, setSelectedCalendarRange] = useState<DateRange | undefined>(getLastThirtyDaysRange());
    const [dashboardTimeframe, setDashboardTimeframe] = useState<DashboardTimeframePreset>('last_30_days');
    const [basisIndex, setBasisIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

    const [instagramSeries, setInstagramSeries] = useState<InstagramSeries>(createEmptyInstagramSeries());
    const [facebookSeries, setFacebookSeries] = useState<FacebookSeries>(createEmptyFacebookSeries());
    const [linkedInSeries, setLinkedInSeries] = useState<LinkedInSeries>(createEmptyLinkedInSeries());
    const [gaOverview, setGaOverview] = useState<GAOverview | null>(null);
    const [gaPageviews, setGaPageviews] = useState<GAPageviews | null>(null);
    const [gaEngagement, setGaEngagement] = useState<GAEngagement | null>(null);
    const [gaConversions, setGaConversions] = useState<GAConversions | null>(null);

    const selectedDateRange = useMemo<DateRangeBounds | null>(() => {
        if (!selectedCalendarRange?.from || !selectedCalendarRange.to) return null;
        return {
            startMs: startOfDay(selectedCalendarRange.from).getTime(),
            endMs: endOfDay(selectedCalendarRange.to).getTime(),
            startDate: selectedCalendarRange.from,
            endDate: selectedCalendarRange.to,
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

    const fetchDashboardData = useCallback(
        async (showFullLoader: boolean) => {
            if (showFullLoader) setLoading(true);
            else setRefreshing(true);
            setErrorMessage(null);

            try {
                const [
                    igSeriesRes,
                    fbSeriesRes,
                    liSeriesRes,
                    gaOverviewRes,
                    gaPageviewsRes,
                    gaEngagementRes,
                    gaConversionsRes,
                ] = await Promise.all([
                    fetchInstagramInsights(),
                    fetchFacebookInsights(),
                    fetchLinkedInInsights(),
                    getGAOverview(apiStartDate, apiEndDate),
                    getGAPageviews('day', apiStartDate, apiEndDate),
                    getGAEngagement(apiStartDate, apiEndDate),
                    getGAConversions(apiStartDate, apiEndDate),
                ]);

                setInstagramSeries(igSeriesRes);
                setFacebookSeries(fbSeriesRes);
                setLinkedInSeries(liSeriesRes);
                setGaOverview(gaOverviewRes);
                setGaPageviews(gaPageviewsRes);
                setGaEngagement(gaEngagementRes);
                setGaConversions(gaConversionsRes);
                setLastRefreshedAt(new Date());
            } catch (error) {
                setErrorMessage((error as Error).message || 'Failed to load comparative statistics.');
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [apiEndDate, apiStartDate],
    );

    useEffect(() => {
        if (selectedCalendarRange?.from && !selectedCalendarRange.to) return;
        void fetchDashboardData(true);
    }, [fetchDashboardData, selectedCalendarRange]);

    const gaPageviewsSeries = useMemo(() => mapSeries(gaPageviews?.series), [gaPageviews]);

    // Instagram filtered series
    const filteredIgFollows = useMemo(() => filterPointsByRange(instagramSeries.instagram_follows, selectedDateRange), [instagramSeries.instagram_follows, selectedDateRange]);
    const filteredIgReach = useMemo(() => filterPointsByRange(instagramSeries.reach, selectedDateRange), [instagramSeries.reach, selectedDateRange]);
    const filteredIgViews = useMemo(() => filterPointsByRange(instagramSeries.views, selectedDateRange), [instagramSeries.views, selectedDateRange]);
    const filteredIgInteractions = useMemo(() => filterPointsByRange(instagramSeries.content_interactions, selectedDateRange), [instagramSeries.content_interactions, selectedDateRange]);
    const filteredIgClicks = useMemo(() => filterPointsByRange(instagramSeries.instagram_link_clicks, selectedDateRange), [instagramSeries.instagram_link_clicks, selectedDateRange]);

    // Facebook filtered series
    const filteredFbFollows = useMemo(() => filterPointsByRange(facebookSeries.facebook_follows, selectedDateRange), [facebookSeries.facebook_follows, selectedDateRange]);
    const filteredFbViews = useMemo(() => filterPointsByRange(facebookSeries.views, selectedDateRange), [facebookSeries.views, selectedDateRange]);
    const filteredFbViewers = useMemo(() => filterPointsByRange(facebookSeries.viewers, selectedDateRange), [facebookSeries.viewers, selectedDateRange]);
    const filteredFbInteractions = useMemo(() => filterPointsByRange(facebookSeries.content_interactions, selectedDateRange), [facebookSeries.content_interactions, selectedDateRange]);
    const filteredFbClicks = useMemo(() => filterPointsByRange(facebookSeries.facebook_link_clicks, selectedDateRange), [facebookSeries.facebook_link_clicks, selectedDateRange]);

    // LinkedIn filtered series — from /manual/linkedin/
    const filteredLiImpressions = useMemo(() => filterPointsByRange(linkedInSeries.impressions, selectedDateRange), [linkedInSeries.impressions, selectedDateRange]);
    const filteredLiClicks = useMemo(() => filterPointsByRange(linkedInSeries.clicks, selectedDateRange), [linkedInSeries.clicks, selectedDateRange]);
    const filteredLiReactions = useMemo(() => filterPointsByRange(linkedInSeries.reactions, selectedDateRange), [linkedInSeries.reactions, selectedDateRange]);
    const filteredLiComments = useMemo(() => filterPointsByRange(linkedInSeries.comments, selectedDateRange), [linkedInSeries.comments, selectedDateRange]);
    const filteredLiReposts = useMemo(() => filterPointsByRange(linkedInSeries.reposts, selectedDateRange), [linkedInSeries.reposts, selectedDateRange]);

    const filteredGaPageviews = useMemo(() => filterPointsByRange(gaPageviewsSeries, selectedDateRange), [gaPageviewsSeries, selectedDateRange]);

    // LinkedIn aggregated metrics
    const liTotalImpressions = useMemo(() => sumValues(filteredLiImpressions), [filteredLiImpressions]);
    const liTotalClicks = useMemo(() => sumValues(filteredLiClicks), [filteredLiClicks]);
    // Engagement = Reactions + Comments + Reposts
    const liTotalEngagement = useMemo(
        () => sumValues(filteredLiReactions) + sumValues(filteredLiComments) + sumValues(filteredLiReposts),
        [filteredLiReactions, filteredLiComments, filteredLiReposts],
    );
    const liEngagementRate = useMemo(() => {
        const impressions = Math.max(liTotalImpressions, 1);
        return (liTotalEngagement / impressions) * 100;
    }, [liTotalEngagement, liTotalImpressions]);
    const liImpressionsSeries = useMemo(() => filteredLiImpressions, [filteredLiImpressions]);

    const igEngagementRate = useMemo(() => {
        const interactions = sumValues(filteredIgInteractions);
        const reach = Math.max(sumValues(filteredIgReach), 1);
        return (interactions / reach) * 100;
    }, [filteredIgInteractions, filteredIgReach]);

    const fbEngagementRate = useMemo(() => {
        const interactions = sumValues(filteredFbInteractions);
        const views = Math.max(sumValues(filteredFbViews), 1);
        return (interactions / views) * 100;
    }, [filteredFbInteractions, filteredFbViews]);

    const igCtr = useMemo(() => {
        const clicks = sumValues(filteredIgClicks);
        const views = Math.max(sumValues(filteredIgViews), 1);
        return (clicks / views) * 100;
    }, [filteredIgClicks, filteredIgViews]);

    const fbCtr = useMemo(() => {
        const clicks = sumValues(filteredFbClicks);
        const views = Math.max(sumValues(filteredFbViews), 1);
        return (clicks / views) * 100;
    }, [filteredFbClicks, filteredFbViews]);

    const liCtr = useMemo(() => {
        const impressions = Math.max(liTotalImpressions, 1);
        return (liTotalClicks / impressions) * 100;
    }, [liTotalClicks, liTotalImpressions]);

    const gaConversionRate = useMemo(() => {
        const sessions = Math.max(gaOverview?.sessions ?? 0, 1);
        return ((gaConversions?.total ?? 0) / sessions) * 100;
    }, [gaConversions?.total, gaOverview?.sessions]);

    // Impressions-based trend for LinkedIn visibility
    const liImpressionsTrendSeries = useMemo(() => liImpressionsSeries, [liImpressionsSeries]);

    const activeBasis = BASIS_PAGES[basisIndex] ?? BASIS_PAGES[0];

    const visibilityTrendData = useMemo(
        () =>
            buildTrendData([
                { key: 'instagram', points: filteredIgReach },
                { key: 'facebook', points: filteredFbViews },
                { key: 'linkedin', points: liImpressionsTrendSeries },
                { key: 'website', points: filteredGaPageviews },
            ]),
        [filteredFbViews, filteredGaPageviews, filteredIgReach, liImpressionsTrendSeries],
    );

    const engagementTrendData = useMemo(
        () =>
            buildTrendData([
                { key: 'instagram', points: filteredIgInteractions },
                { key: 'facebook', points: filteredFbInteractions },
            ]),
        [filteredFbInteractions, filteredIgInteractions],
    );

    const audienceBarData = useMemo(
        () => [
            { channel: 'Instagram', value: sumValues(filteredIgFollows) },
            { channel: 'Facebook', value: sumValues(filteredFbFollows) },
            // LinkedIn followers not provided by /manual/linkedin/ endpoint — omit from bar
            { channel: 'Website', value: gaOverview?.users ?? 0 },
        ],
        [filteredFbFollows, filteredIgFollows, gaOverview?.users],
    );

    const visibilityBarData = useMemo(
        () => [
            { channel: 'Instagram', value: sumValues(filteredIgReach) },
            { channel: 'Facebook', value: sumValues(filteredFbViews) },
            { channel: 'LinkedIn', value: liTotalImpressions },
            { channel: 'Website', value: sumValues(filteredGaPageviews) },
        ],
        [filteredFbViews, filteredGaPageviews, filteredIgReach, liTotalImpressions],
    );

    const engagementRateData = useMemo(
        () => [
            { channel: 'Instagram', value: Number(igEngagementRate.toFixed(2)) },
            { channel: 'Facebook', value: Number(fbEngagementRate.toFixed(2)) },
            { channel: 'LinkedIn', value: Number(liEngagementRate.toFixed(2)) },
            { channel: 'Website', value: Number((gaEngagement?.engagement_rate ?? 0).toFixed(2)) },
        ],
        [fbEngagementRate, gaEngagement?.engagement_rate, igEngagementRate, liEngagementRate],
    );

    const trafficBarData = useMemo(
        () => [
            { channel: 'Instagram', value: sumValues(filteredIgClicks) },
            { channel: 'Facebook', value: sumValues(filteredFbClicks) },
            { channel: 'LinkedIn', value: liTotalClicks },
            { channel: 'Website', value: gaConversions?.total ?? 0 },
        ],
        [filteredFbClicks, filteredIgClicks, gaConversions?.total, liTotalClicks],
    );

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-heading font-bold text-stone-900">Comparative Statistics</h1>
                    <p className="text-sm text-stone-500 mt-1">
                        Comprehensive channel comparison across Instagram, Facebook, LinkedIn, and Google Analytics.
                    </p>
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
                                <CalendarDays className="mr-1.5 h-3.5 w-3.5 text-violet-600" />
                                {formatDateRangeLabel(selectedCalendarRange)}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-auto p-0">
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
                                classNames={{
                                    months: 'flex flex-col gap-4 sm:flex-row sm:gap-6',
                                    month: 'space-y-4',
                                    month_caption:
                                        'flex items-center justify-center px-1 pt-1 text-sm font-medium text-stone-700',
                                    nav: 'flex items-center gap-1',
                                    button_previous:
                                        'rounded-md border border-stone-200 p-1 text-stone-600 hover:bg-stone-100',
                                    button_next:
                                        'rounded-md border border-stone-200 p-1 text-stone-600 hover:bg-stone-100',
                                    month_grid: 'w-full border-collapse',
                                    weekdays: 'flex',
                                    weekday:
                                        'w-9 text-center text-[11px] font-medium uppercase text-stone-400',
                                    week: 'mt-1 flex w-full',
                                    day: 'h-9 w-9 p-0 text-center',
                                    day_button:
                                        'h-9 w-9 rounded-md text-sm text-stone-700 transition-colors hover:bg-violet-50',
                                    selected:
                                        'bg-violet-600 text-white hover:bg-violet-600 hover:text-white focus:bg-violet-600 focus:text-white',
                                    range_start:
                                        'bg-violet-600 text-white hover:bg-violet-600 hover:text-white',
                                    range_end:
                                        'bg-violet-600 text-white hover:bg-violet-600 hover:text-white',
                                    range_middle: 'bg-violet-100 text-violet-900',
                                    outside: 'text-stone-300',
                                    today: 'font-semibold text-violet-700',
                                    disabled: 'text-stone-300',
                                }}
                            />
                        </PopoverContent>
                    </Popover>
                    <Button
                        type="button"
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
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => void fetchDashboardData(false)}
                        disabled={refreshing}
                    >
                        {refreshing ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1 h-3.5 w-3.5" />}
                        Refresh
                    </Button>
                </div>
            </div>

            <div className="text-xs text-stone-500">
                {selectedDateRange
                    ? `Selected range: ${formatDateWithYear(selectedDateRange.startDate)} - ${formatDateWithYear(selectedDateRange.endDate)}`
                    : `Selected range: ${dashboardTimeframe === 'all_time' ? 'All time' : 'Last 30 days'}`}
                {lastRefreshedAt ? ` · Last refreshed: ${formatDateWithYear(lastRefreshedAt)}` : ''}
            </div>

            <div className="rounded-xl border border-stone-200 bg-white px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm text-stone-700">
                        <span className="font-medium">Comparison Basis:</span> {activeBasis.label}
                        <span className="text-stone-400"> · Page {basisIndex + 1} of {BASIS_PAGES.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {BASIS_PAGES.map((basis, index) => (
                            <Button
                                key={basis.id}
                                variant={index === basisIndex ? 'default' : 'outline'}
                                size="sm"
                                className="h-8 px-3 text-xs"
                                onClick={() => setBasisIndex(index)}
                            >
                                {basis.label}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>

            {errorMessage && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {errorMessage}
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }, (_, index) => (
                        <Card key={index} className="animate-pulse">
                            <CardContent className="pt-5 pb-4">
                                <div className="h-4 bg-stone-200 rounded w-2/3 mb-3" />
                                <div className="h-6 bg-stone-200 rounded w-1/2 mb-2" />
                                <div className="h-3 bg-stone-100 rounded w-3/4" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : activeBasis.id === 'audience' ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricKPI label="Instagram Follows" value={sumValues(filteredIgFollows)} icon={<Users className="h-5 w-5" />} />
                        <MetricKPI label="Facebook Follows" value={sumValues(filteredFbFollows)} icon={<MessageCircleHeart className="h-5 w-5" />} />
                        <div className="relative">
                            <MetricKPI label="LinkedIn Followers" value="--" icon={<Users className="h-5 w-5" />} />
                            <span className="absolute top-2 right-2 text-[9px] bg-stone-100 text-stone-400 border border-stone-200 rounded px-1 py-0.5">not provided</span>
                        </div>
                        <MetricKPI label="Website Users" value={gaOverview?.users ?? 0} icon={<Globe className="h-5 w-5" />} />
                    </div>

                    <ChartCard title="Audience Comparison" description="Primary audience metric by channel for the selected range.">
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={audienceBarData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                                    <XAxis dataKey="channel" tick={{ fontSize: 11, fill: '#78716C' }} />
                                    <YAxis tick={{ fontSize: 11, fill: '#78716C' }} />
                                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E7E5E4', fontSize: 12 }} />
                                    <Bar dataKey="value" fill="#E5A100" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </ChartCard>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-stone-700">Audience Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
                                            <th className="py-2 pr-3">Channel</th>
                                            <th className="py-2 pr-3">Audience Metric</th>
                                            <th className="py-2 pr-3">Value</th>
                                            <th className="py-2">Latest Data Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b border-stone-100">
                                            <td className="py-2 pr-3 font-medium text-stone-800">Instagram</td>
                                            <td className="py-2 pr-3 text-stone-700">Follows</td>
                                            <td className="py-2 pr-3 text-stone-700">{sumValues(filteredIgFollows).toLocaleString()}</td>
                                            <td className="py-2 text-stone-700">{latestDateLabel(filteredIgFollows)}</td>
                                        </tr>
                                        <tr className="border-b border-stone-100">
                                            <td className="py-2 pr-3 font-medium text-stone-800">Facebook</td>
                                            <td className="py-2 pr-3 text-stone-700">Follows</td>
                                            <td className="py-2 pr-3 text-stone-700">{sumValues(filteredFbFollows).toLocaleString()}</td>
                                            <td className="py-2 text-stone-700">{latestDateLabel(filteredFbFollows)}</td>
                                        </tr>
                                        <tr className="border-b border-stone-100">
                                            <td className="py-2 pr-3 font-medium text-stone-800">LinkedIn</td>
                                            <td className="py-2 pr-3 text-stone-700">
                                                Followers
                                                <span className="ml-1.5 text-[9px] bg-stone-100 text-stone-400 border border-stone-200 rounded px-1 py-0.5">not provided</span>
                                            </td>
                                            <td className="py-2 pr-3 text-stone-700">—</td>
                                            <td className="py-2 text-stone-700">—</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 pr-3 font-medium text-stone-800">Website (GA4)</td>
                                            <td className="py-2 pr-3 text-stone-700">Users</td>
                                            <td className="py-2 pr-3 text-stone-700">{(gaOverview?.users ?? 0).toLocaleString()}</td>
                                            <td className="py-2 text-stone-700">{latestDateLabel(filteredGaPageviews)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </>
            ) : activeBasis.id === 'visibility' ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricKPI label="Instagram Reach" value={sumValues(filteredIgReach)} icon={<Eye className="h-5 w-5" />} />
                        <MetricKPI label="Facebook Views" value={sumValues(filteredFbViews)} icon={<Eye className="h-5 w-5" />} />
                        <MetricKPI label="LinkedIn Impressions" value={liTotalImpressions} icon={<Eye className="h-5 w-5" />} />
                        <MetricKPI label="Website Pageviews" value={sumValues(filteredGaPageviews)} icon={<Globe className="h-5 w-5" />} />
                    </div>

                    <ChartCard title="Visibility Comparison" description="Reach/view metrics compared across channels.">
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={visibilityBarData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                                    <XAxis dataKey="channel" tick={{ fontSize: 11, fill: '#78716C' }} />
                                    <YAxis tick={{ fontSize: 11, fill: '#78716C' }} />
                                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E7E5E4', fontSize: 12 }} />
                                    <Bar dataKey="value" fill="#0EA5E9" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </ChartCard>

                    <ChartCard title="Visibility Trend" description="Daily visibility trend in the selected range.">
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={visibilityTrendData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                                    <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: '#78716C' }} minTickGap={28} />
                                    <YAxis tick={{ fontSize: 11, fill: '#78716C' }} />
                                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E7E5E4', fontSize: 12 }} />
                                    <Legend />
                                    <Line type="monotone" dataKey="instagram" name="Instagram" stroke="#E4405F" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="facebook" name="Facebook" stroke="#1877F2" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="linkedin" name="LinkedIn" stroke="#0A66C2" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="website" name="Website" stroke="#E5A100" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </ChartCard>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-stone-700">Viewer-Level Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
                                            <th className="py-2 pr-3">Channel</th>
                                            <th className="py-2 pr-3">Primary Visibility</th>
                                            <th className="py-2 pr-3">Viewer Metric</th>
                                            <th className="py-2">Latest Data Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b border-stone-100">
                                            <td className="py-2 pr-3 font-medium text-stone-800">Instagram</td>
                                            <td className="py-2 pr-3 text-stone-700">{sumValues(filteredIgReach).toLocaleString()} reach</td>
                                            <td className="py-2 pr-3 text-stone-700">{sumValues(filteredIgViews).toLocaleString()} views</td>
                                            <td className="py-2 text-stone-700">{latestDateLabel(filteredIgReach)}</td>
                                        </tr>
                                        <tr className="border-b border-stone-100">
                                            <td className="py-2 pr-3 font-medium text-stone-800">Facebook</td>
                                            <td className="py-2 pr-3 text-stone-700">{sumValues(filteredFbViews).toLocaleString()} views</td>
                                            <td className="py-2 pr-3 text-stone-700">{sumValues(filteredFbViewers).toLocaleString()} viewers</td>
                                            <td className="py-2 text-stone-700">{latestDateLabel(filteredFbViews)}</td>
                                        </tr>
                                        <tr className="border-b border-stone-100">
                                            <td className="py-2 pr-3 font-medium text-stone-800">LinkedIn</td>
                                            <td className="py-2 pr-3 text-stone-700">{liTotalImpressions.toLocaleString()} impressions</td>
                                            <td className="py-2 pr-3 text-stone-700">{liTotalClicks.toLocaleString()} link clicks</td>
                                            <td className="py-2 text-stone-700">{latestDateLabel(filteredLiImpressions)}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 pr-3 font-medium text-stone-800">Website (GA4)</td>
                                            <td className="py-2 pr-3 text-stone-700">{sumValues(filteredGaPageviews).toLocaleString()} pageviews</td>
                                            <td className="py-2 pr-3 text-stone-700">{(gaOverview?.users ?? 0).toLocaleString()} users</td>
                                            <td className="py-2 text-stone-700">{latestDateLabel(filteredGaPageviews)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </>
            ) : activeBasis.id === 'engagement' ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricKPI label="IG Interactions" value={sumValues(filteredIgInteractions)} icon={<MessageCircleHeart className="h-5 w-5" />} />
                        <MetricKPI label="FB Interactions" value={sumValues(filteredFbInteractions)} icon={<MessageCircleHeart className="h-5 w-5" />} />
                        <MetricKPI label="LI Engagement" value={liTotalEngagement} icon={<MessageCircleHeart className="h-5 w-5" />} />
                        <MetricKPI label="GA Engaged Sessions" value={gaEngagement?.engaged_sessions ?? 0} icon={<Globe className="h-5 w-5" />} />
                    </div>

                    <ChartCard title="Engagement Rate Comparison (%)" description="Per-channel engagement rates in the selected range.">
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={engagementRateData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                                    <XAxis dataKey="channel" tick={{ fontSize: 11, fill: '#78716C' }} />
                                    <YAxis tick={{ fontSize: 11, fill: '#78716C' }} />
                                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E7E5E4', fontSize: 12 }} />
                                    <Bar dataKey="value" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </ChartCard>

                    <ChartCard title="Interaction Trend" description="Daily interaction trend for Instagram and Facebook.">
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={engagementTrendData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                                    <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: '#78716C' }} minTickGap={28} />
                                    <YAxis tick={{ fontSize: 11, fill: '#78716C' }} />
                                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E7E5E4', fontSize: 12 }} />
                                    <Legend />
                                    <Line type="monotone" dataKey="instagram" name="Instagram" stroke="#E4405F" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="facebook" name="Facebook" stroke="#1877F2" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </ChartCard>
                </>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricKPI label="IG Link Clicks" value={sumValues(filteredIgClicks)} icon={<Eye className="h-5 w-5" />} />
                        <MetricKPI label="FB Link Clicks" value={sumValues(filteredFbClicks)} icon={<Eye className="h-5 w-5" />} />
                        <MetricKPI label="LI Link Clicks" value={liTotalClicks} icon={<Eye className="h-5 w-5" />} />
                        <MetricKPI label="GA Conversions" value={gaConversions?.total ?? 0} icon={<Globe className="h-5 w-5" />} />
                    </div>

                    <ChartCard title="Traffic / Conversion Volume" description="Clicks and conversion totals by channel.">
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={trafficBarData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                                    <XAxis dataKey="channel" tick={{ fontSize: 11, fill: '#78716C' }} />
                                    <YAxis tick={{ fontSize: 11, fill: '#78716C' }} />
                                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E7E5E4', fontSize: 12 }} />
                                    <Bar dataKey="value" fill="#16A34A" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </ChartCard>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-stone-700">Traffic & Conversion Rates</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
                                            <th className="py-2 pr-3">Channel</th>
                                            <th className="py-2 pr-3">Volume</th>
                                            <th className="py-2 pr-3">Rate</th>
                                            <th className="py-2">Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b border-stone-100">
                                            <td className="py-2 pr-3 font-medium text-stone-800">Instagram</td>
                                            <td className="py-2 pr-3 text-stone-700">{sumValues(filteredIgClicks).toLocaleString()} clicks</td>
                                            <td className="py-2 pr-3 text-stone-700">{igCtr.toFixed(2)}% CTR</td>
                                            <td className="py-2 text-stone-700">Clicks / views from manual Instagram insights</td>
                                        </tr>
                                        <tr className="border-b border-stone-100">
                                            <td className="py-2 pr-3 font-medium text-stone-800">Facebook</td>
                                            <td className="py-2 pr-3 text-stone-700">{sumValues(filteredFbClicks).toLocaleString()} clicks</td>
                                            <td className="py-2 pr-3 text-stone-700">{fbCtr.toFixed(2)}% CTR</td>
                                            <td className="py-2 text-stone-700">Clicks / views from manual Facebook insights</td>
                                        </tr>
                                        <tr className="border-b border-stone-100">
                                            <td className="py-2 pr-3 font-medium text-stone-800">LinkedIn</td>
                                            <td className="py-2 pr-3 text-stone-700">{liTotalClicks.toLocaleString()} link clicks</td>
                                            <td className="py-2 pr-3 text-stone-700">{liCtr.toFixed(2)}% CTR</td>
                                            <td className="py-2 text-stone-700">Link clicks / impressions from manual LinkedIn insights</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 pr-3 font-medium text-stone-800">Website (GA4)</td>
                                            <td className="py-2 pr-3 text-stone-700">{(gaConversions?.total ?? 0).toLocaleString()} conversions</td>
                                            <td className="py-2 pr-3 text-stone-700">{gaConversionRate.toFixed(2)}% conversion rate</td>
                                            <td className="py-2 text-stone-700">Conversions / sessions from GA4</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {(gaConversions?.events?.length ?? 0) > 0 && (
                                <div className="mt-4 rounded-lg border border-stone-200 p-3">
                                    <p className="text-xs font-medium text-stone-700 mb-2">Top GA Conversion Events</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {(gaConversions?.events ?? []).slice(0, 6).map((event) => (
                                            <div key={event.event_name} className="flex items-center justify-between rounded bg-stone-50 px-2 py-1.5 text-xs">
                                                <span className="text-stone-600">{event.event_name}</span>
                                                <span className="font-medium text-stone-800">{event.count.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
