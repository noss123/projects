'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    BarChart3,
    Bookmark,
    CalendarDays,
    ExternalLink,
    Eye,
    Grid3X3,
    GripVertical,
    Heart,
    Instagram,
    List,
    MessageSquare,
    Plus,
    RefreshCw,
    Search,
    Share2,
    TrendingUp,
    Users,
    X,
} from 'lucide-react';
import Link from 'next/link';
import { PieChart, Pie, Cell, ScatterChart, Scatter } from 'recharts';
import { DayPicker, DateRange } from 'react-day-picker';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from '@/components/charts/ChartComponents';
import { useAuth } from '@/lib/auth-context';
import {
    fetchInstagramDashboardLayout,
    saveInstagramDashboardLayout,
    type InstagramDashboardLayoutWidget,
} from '@/lib/api/manual-insights-api';
import { cn } from '@/lib/utils';

const API_BASE =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) ||
    'http://localhost:8000';
const INSTAGRAM_USER_ID = 'ClubArtizen';
const CHANNEL_METRICS = [
    'views',
    'reach',
    'content_interactions',
    'instagram_link_clicks',
    'instagram_profile_visits',
    'instagram_follows',
] as const;

const METRIC_LABELS: Record<string, string> = {
    views: 'Views',
    reach: 'Reach',
    content_interactions: 'Content Interactions',
    instagram_link_clicks: 'Link Clicks',
    instagram_profile_visits: 'Profile Visits',
    instagram_follows: 'Follows',
    likes: 'Likes',
    comments: 'Comments',
    shares: 'Shares',
    saved: 'Saved',
    total_interactions: 'Total Interactions',
};

const METRIC_COLORS: Record<string, string> = {
    views: '#7C3AED',
    reach: '#2563EB',
    content_interactions: '#059669',
    instagram_link_clicks: '#D97706',
    instagram_profile_visits: '#0EA5E9',
    instagram_follows: '#EC4899',
    total_interactions: '#16A34A',
};

const PIE_COLORS = ['#7C3AED', '#2563EB', '#059669', '#D97706', '#0EA5E9', '#EC4899', '#14B8A6'];
const POST_TYPE_GROWTH_METRIC_OPTIONS = [
    { value: 'total_interactions', label: 'Interactions' },
    { value: 'views', label: 'Views' },
    { value: 'reach', label: 'Reach' },
    { value: 'likes', label: 'Likes' },
    { value: 'comments', label: 'Comments' },
    { value: 'shares', label: 'Shares' },
    { value: 'saved', label: 'Saved' },
    { value: 'follows', label: 'Follows' },
] as const;
type PostMetricKey = (typeof POST_TYPE_GROWTH_METRIC_OPTIONS)[number]['value'];
const POST_METRIC_KEYS = new Set<PostMetricKey>(POST_TYPE_GROWTH_METRIC_OPTIONS.map((option) => option.value));

interface ManualInsightValue {
    value: number | string;
    end_time?: string;
}

interface ManualInsightEntry {
    name?: string;
    title?: string;
    description?: string;
    period?: string;
    values?: ManualInsightValue[];
}

interface ManualInsightsResponse {
    data?: ManualInsightEntry[];
}

interface ManualPostInsightItem {
    post_id?: string;
    ig_user_id?: string;
    account_id?: string;
    account_username?: string;
    account_name?: string;
    description?: string;
    post_type?: string;
    publish_time?: string;
    permalink?: string;
    insights?: ManualInsightEntry[];
}

interface ManualPostInsightsResponse {
    data?: ManualPostInsightItem[];
}

interface MetricPoint {
    dateKey: string;
    dateLabel: string;
    value: number;
    sortValue: number;
}

interface MetricSeries {
    key: string;
    label: string;
    title: string;
    description: string;
    points: MetricPoint[];
    total: number;
    latest: number;
}

interface InstagramPostRecord {
    postId: string;
    title: string;
    description: string | null;
    igUserId: string | null;
    accountId: string | null;
    accountUsername: string | null;
    accountName: string | null;
    postType: string;
    publishTime: string | null;
    permalink: string | null;
    metrics: Record<string, number>;
}

type WidgetKind =
    | 'channel-overview'
    | 'metric-line'
    | 'dynamic-metric-line'
    | 'metric-scatter-compare'
    | 'post-type-distribution'
    | 'top-posts'
    | 'post-engagement'
    | 'post-reach-vs-views'
    | 'post-metric-trend'
    | 'post-type-metric-overlay';

interface DashboardWidget {
    id: string;
    title: string;
    description: string;
    kind: WidgetKind;
    metricKey?: string;
}

interface DashboardWidgetConfig {
    metricKey?: string;
    xMetricKey?: string;
    yMetricKey?: string;
    postMetricKey?: PostMetricKey;
    postType?: string;
}

interface DashboardWidgetInstance {
    instanceId: string;
    widgetId: string;
    config: DashboardWidgetConfig;
}

interface ActiveDashboardWidget {
    template: DashboardWidget;
    instance: DashboardWidgetInstance;
}

const POST_WIDGET_KINDS = new Set<WidgetKind>([
    'post-type-distribution',
    'top-posts',
    'post-engagement',
    'post-reach-vs-views',
    'post-metric-trend',
    'post-type-metric-overlay',
]);
const AGGREGATE_POST_TYPE = 'all';

type PostTimeFilter =
    | 'all'
    | 'last_7_days'
    | 'last_30_days'
    | 'last_90_days'
    | 'last_180_days'
    | 'last_365_days';

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

function stringifyDetail(detail: unknown): string {
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
        return detail.map(stringifyDetail).filter(Boolean).join(', ');
    }
    if (detail && typeof detail === 'object') return JSON.stringify(detail);
    return '';
}

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

function formatShortDate(dateText: string): string {
    const date = parseDate(dateText);
    if (!date) return dateText;
    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
    });
}

function formatDateWithYear(date: Date): string {
    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
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

function getLastWeekDateRange(): DateRange {
    const to = new Date();
    const from = new Date(to);
    from.setDate(to.getDate() - 6);
    return { from, to };
}

function getRelativeDateRange(days: number): DateRange {
    const to = endOfDay(new Date());
    const from = startOfDay(new Date(to));
    from.setDate(from.getDate() - (days - 1));
    return { from, to };
}

function getLatestWeekDateRangeFromTimestamps(timestamps: number[]): DateRange | null {
    let earliestTimestamp = Number.POSITIVE_INFINITY;
    let latestTimestamp = Number.NEGATIVE_INFINITY;

    for (const timestamp of timestamps) {
        if (!Number.isFinite(timestamp)) continue;
        if (timestamp < earliestTimestamp) earliestTimestamp = timestamp;
        if (timestamp > latestTimestamp) latestTimestamp = timestamp;
    }

    if (!Number.isFinite(earliestTimestamp) || !Number.isFinite(latestTimestamp)) {
        return null;
    }

    const to = endOfDay(new Date(latestTimestamp));
    const earliestDate = startOfDay(new Date(earliestTimestamp));
    const fromCandidate = startOfDay(new Date(latestTimestamp));
    fromCandidate.setDate(fromCandidate.getDate() - 6);

    return {
        from: fromCandidate.getTime() < earliestDate.getTime() ? earliestDate : fromCandidate,
        to,
    };
}

function formatMetricLabel(metricKey: string): string {
    return METRIC_LABELS[metricKey] || metricKey.replace(/_/g, ' ').replace(/\b\w/g, (x) => x.toUpperCase());
}

function metricColor(metricKey: string): string {
    return METRIC_COLORS[metricKey] || '#7C3AED';
}

function sortByPublishTimeDescending(a: InstagramPostRecord, b: InstagramPostRecord): number {
    const aDate = a.publishTime ? parseDate(a.publishTime) : null;
    const bDate = b.publishTime ? parseDate(b.publishTime) : null;
    const aValue = aDate ? aDate.getTime() : 0;
    const bValue = bDate ? bDate.getTime() : 0;
    return bValue - aValue;
}

function deriveTotalInteractions(metrics: Record<string, number>): number {
    if (typeof metrics.total_interactions === 'number') return metrics.total_interactions;
    const likes = metrics.likes || 0;
    const comments = metrics.comments || 0;
    const shares = metrics.shares || 0;
    const saved = metrics.saved || 0;
    return likes + comments + shares + saved;
}

function getPostMetricValue(post: InstagramPostRecord, metricKey: PostMetricKey): number {
    if (metricKey === 'total_interactions') {
        return typeof post.metrics.total_interactions === 'number'
            ? post.metrics.total_interactions
            : deriveTotalInteractions(post.metrics);
    }
    return post.metrics[metricKey] || 0;
}

function rankPostsByMetric(posts: InstagramPostRecord[], metricKey: PostMetricKey, limit = 8): InstagramPostRecord[] {
    return [...posts]
        .sort((a, b) => getPostMetricValue(b, metricKey) - getPostMetricValue(a, metricKey))
        .slice(0, limit);
}

function buildWidgetInstanceId(widgetId: string): string {
    const randomSuffix = Math.random().toString(36).slice(2, 8);
    return `${widgetId}-${Date.now()}-${randomSuffix}`;
}

function normalizePostMetricKey(value: string | undefined, fallback: PostMetricKey = 'total_interactions'): PostMetricKey {
    if (!value) return fallback;
    if (POST_METRIC_KEYS.has(value as PostMetricKey)) return value as PostMetricKey;
    return fallback;
}

function normalizeWidgetPostType(value: string | undefined, availablePostTypes: string[]): string {
    if (!value || !availablePostTypes.includes(value)) return AGGREGATE_POST_TYPE;
    return value;
}

function createWidgetInstance(widgetId: string, config: DashboardWidgetConfig = {}): DashboardWidgetInstance {
    return {
        instanceId: buildWidgetInstanceId(widgetId),
        widgetId,
        config,
    };
}

function applyWidgetConfigPatch(
    instances: DashboardWidgetInstance[],
    instanceId: string,
    patch: Partial<DashboardWidgetConfig>,
): DashboardWidgetInstance[] {
    let didPatch = false;
    const nextInstances = instances.map((instance) => {
        if (instance.instanceId !== instanceId) return instance;
        didPatch = true;
        return {
            ...instance,
            config: {
                ...instance.config,
                ...patch,
            },
        };
    });
    return didPatch ? nextInstances : instances;
}

function toLayoutWidget(instance: DashboardWidgetInstance): InstagramDashboardLayoutWidget {
    const config: Record<string, string | number | boolean | null> = {};
    if (typeof instance.config.metricKey === 'string') config.metricKey = instance.config.metricKey;
    if (typeof instance.config.xMetricKey === 'string') config.xMetricKey = instance.config.xMetricKey;
    if (typeof instance.config.yMetricKey === 'string') config.yMetricKey = instance.config.yMetricKey;
    if (typeof instance.config.postMetricKey === 'string') config.postMetricKey = instance.config.postMetricKey;
    if (typeof instance.config.postType === 'string') config.postType = instance.config.postType;

    return {
        instance_id: instance.instanceId,
        widget_id: instance.widgetId,
        config,
    };
}

function fromLayoutWidget(widget: InstagramDashboardLayoutWidget): DashboardWidgetInstance | null {
    const widgetId = typeof widget.widget_id === 'string' ? widget.widget_id.trim() : '';
    const instanceId = typeof widget.instance_id === 'string' ? widget.instance_id.trim() : '';
    if (!widgetId || !instanceId) return null;

    const rawConfig = widget.config;
    const config: DashboardWidgetConfig = {};
    if (rawConfig && typeof rawConfig === 'object') {
        const metricsConfig = rawConfig as Record<string, unknown>;
        if (typeof metricsConfig.metricKey === 'string') config.metricKey = metricsConfig.metricKey;
        if (typeof metricsConfig.xMetricKey === 'string') config.xMetricKey = metricsConfig.xMetricKey;
        if (typeof metricsConfig.yMetricKey === 'string') config.yMetricKey = metricsConfig.yMetricKey;
        if (typeof metricsConfig.postMetricKey === 'string') {
            config.postMetricKey = normalizePostMetricKey(metricsConfig.postMetricKey);
        }
        if (typeof metricsConfig.postType === 'string') {
            config.postType = metricsConfig.postType;
        }
    }

    return {
        instanceId,
        widgetId,
        config,
    };
}

function buildPostMetricTrendData(posts: InstagramPostRecord[], metricKey: PostMetricKey) {
    const byDate = new Map<
        string,
        {
            value: number;
            sortValue: number;
            dateLabel: string;
        }
    >();

    for (const post of posts) {
        if (!post.publishTime) continue;
        const publishDate = parseDate(post.publishTime);
        if (!publishDate) continue;

        const dateKey = publishDate.toISOString().slice(0, 10);
        const existing = byDate.get(dateKey) || {
            value: 0,
            sortValue: publishDate.getTime(),
            dateLabel: formatDateWithYear(publishDate),
        };
        existing.value += getPostMetricValue(post, metricKey);
        byDate.set(dateKey, existing);
    }

    return Array.from(byDate.values())
        .sort((a, b) => a.sortValue - b.sortValue)
        .map((row) => ({
            date: row.dateLabel,
            value: Math.round(row.value),
        }));
}

function buildPostTypeMetricOverlayData(posts: InstagramPostRecord[], metricKey: PostMetricKey): {
    data: Array<Record<string, string | number>>;
    series: Array<{ postType: string; dataKey: string; color: string }>;
} {
    const byDate = new Map<
        string,
        {
            sortValue: number;
            dateLabel: string;
            valuesByPostType: Record<string, number>;
        }
    >();
    const postTypes = new Set<string>();

    for (const post of posts) {
        if (!post.publishTime) continue;
        const publishDate = parseDate(post.publishTime);
        if (!publishDate) continue;

        const dateKey = publishDate.toISOString().slice(0, 10);
        const normalizedPostType = normalizePostTypeLabel(post.postType);
        const existing = byDate.get(dateKey) || {
            sortValue: publishDate.getTime(),
            dateLabel: formatDateWithYear(publishDate),
            valuesByPostType: {},
        };

        existing.valuesByPostType[normalizedPostType] =
            (existing.valuesByPostType[normalizedPostType] || 0) + getPostMetricValue(post, metricKey);

        byDate.set(dateKey, existing);
        postTypes.add(normalizedPostType);
    }

    const series = Array.from(postTypes)
        .sort((a, b) => a.localeCompare(b))
        .map((postType, index) => ({
            postType,
            dataKey: `post_type_${index}`,
            color: PIE_COLORS[index % PIE_COLORS.length],
        }));

    const data = Array.from(byDate.values())
        .sort((a, b) => a.sortValue - b.sortValue)
        .map((row) => {
            const chartRow: Record<string, string | number> = {
                date: row.dateLabel,
            };

            for (const seriesItem of series) {
                chartRow[seriesItem.dataKey] = Math.round(row.valuesByPostType[seriesItem.postType] || 0);
            }

            return chartRow;
        });

    return { data, series };
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
            payload && typeof payload === 'object' && payload && 'detail' in payload
                ? (payload as { detail: unknown }).detail
                : payload;
        throw new Error(stringifyDetail(detail) || `Request failed (${response.status}).`);
    }

    return payload as T;
}

function parseChannelMetricSeries(payload: ManualInsightsResponse): MetricSeries[] {
    const entries = Array.isArray(payload.data) ? payload.data : [];
    const parsed: MetricSeries[] = [];

    for (const entry of entries) {
        if (!entry || typeof entry.name !== 'string') continue;
        const values = Array.isArray(entry.values) ? entry.values : [];
        const points: MetricPoint[] = [];

        values.forEach((value, index) => {
            const numericValue = toNumber(value?.value);
            if (numericValue === null) return;

            const rawEndTime = typeof value?.end_time === 'string' ? value.end_time : '';
            const parsedDate = rawEndTime ? parseDate(rawEndTime) : null;
            const fallbackSort = index + 1;
            const dateKey =
                parsedDate !== null
                    ? parsedDate.toISOString().slice(0, 10)
                    : `point-${fallbackSort.toString().padStart(4, '0')}`;
            const dateLabel =
                parsedDate !== null
                    ? formatDateWithYear(parsedDate)
                    : `Point ${fallbackSort}`;

            points.push({
                dateKey,
                dateLabel,
                value: numericValue,
                sortValue: parsedDate !== null ? parsedDate.getTime() : fallbackSort,
            });
        });

        points.sort((a, b) => a.sortValue - b.sortValue);

        const total = points.reduce((sum, point) => sum + point.value, 0);
        const latest = points.length > 0 ? points[points.length - 1].value : 0;

        parsed.push({
            key: entry.name,
            label: formatMetricLabel(entry.name),
            title: typeof entry.title === 'string' ? entry.title : formatMetricLabel(entry.name),
            description:
                typeof entry.description === 'string'
                    ? entry.description
                    : `Daily trend for ${formatMetricLabel(entry.name)}.`,
            points,
            total,
            latest,
        });
    }

    return parsed;
}

function parsePostRecords(payload: ManualPostInsightsResponse): InstagramPostRecord[] {
    const data = Array.isArray(payload.data) ? payload.data : [];
    const records: InstagramPostRecord[] = [];

    for (const item of data) {
        if (!item || typeof item.post_id !== 'string') continue;
        const insights = Array.isArray(item.insights) ? item.insights : [];
        const metrics: Record<string, number> = {};
        const description = normalizeDescriptionText(
            typeof item.description === 'string' ? item.description : null,
        );
        const title = derivePostTitle(description, item.post_id);

        for (const insight of insights) {
            if (!insight || typeof insight.name !== 'string') continue;
            const values = Array.isArray(insight.values) ? insight.values : [];
            const numeric = values.length > 0 ? toNumber(values[0].value) : null;
            if (numeric === null) continue;
            metrics[insight.name] = numeric;
        }

        metrics.total_interactions = deriveTotalInteractions(metrics);

        records.push({
            postId: item.post_id,
            title,
            description,
            igUserId: typeof item.ig_user_id === 'string' ? item.ig_user_id : null,
            accountId: typeof item.account_id === 'string' ? item.account_id : null,
            accountUsername: typeof item.account_username === 'string' ? item.account_username : null,
            accountName: typeof item.account_name === 'string' ? item.account_name : null,
            postType: typeof item.post_type === 'string' ? item.post_type : 'Unknown',
            publishTime: typeof item.publish_time === 'string' ? item.publish_time : null,
            permalink: typeof item.permalink === 'string' ? item.permalink : null,
            metrics,
        });
    }

    return records.sort(sortByPublishTimeDescending);
}

function buildWidgetCatalog(series: MetricSeries[], posts: InstagramPostRecord[]): DashboardWidget[] {
    const widgets: DashboardWidget[] = [];
    const metricSeriesWithData = series.filter((metricSeries) => metricSeries.points.length > 0);

    if (metricSeriesWithData.length > 0) {
        widgets.push({
            id: 'channel-overview',
            title: 'Channel Metrics Overview',
            description: 'Total values by available channel metrics.',
            kind: 'channel-overview',
        });

        widgets.push({
            id: 'dynamic-metric-line',
            title: 'Custom Metric Trend',
            description: 'Pick any channel metric and view its trend over time.',
            kind: 'dynamic-metric-line',
        });

        if (metricSeriesWithData.length > 1) {
            widgets.push({
                id: 'metric-scatter-compare',
                title: 'Metric X vs Y Comparison',
                description: 'Choose two metrics and compare their relationship on X and Y axes.',
                kind: 'metric-scatter-compare',
            });
        }
    }

    for (const metricSeries of metricSeriesWithData) {
        widgets.push({
            id: `metric-${metricSeries.key}`,
            title: `${metricSeries.label} Trend`,
            description: `Daily ${metricSeries.label.toLowerCase()} values for ${INSTAGRAM_USER_ID}.`,
            kind: 'metric-line',
            metricKey: metricSeries.key,
        });
    }

    if (posts.length > 0) {
        widgets.push({
            id: 'post-type-distribution',
            title: 'Post Type Distribution',
            description: 'Count of imported posts by post type.',
            kind: 'post-type-distribution',
        });

        widgets.push({
            id: 'top-posts',
            title: 'Top Posts',
            description: 'Posts ranked by selected metric.',
            kind: 'top-posts',
        });

        widgets.push({
            id: 'post-metric-trend',
            title: 'Post Metric Over Time',
            description: 'Pick a post metric and track how it changes over publish dates.',
            kind: 'post-metric-trend',
        });

        const hasEngagementBreakdown = posts.some(
            (post) =>
                post.metrics.likes ||
                post.metrics.comments ||
                post.metrics.shares ||
                post.metrics.saved,
        );
        if (hasEngagementBreakdown) {
            widgets.push({
                id: 'post-engagement',
                title: 'Post Engagement Breakdown',
                description: 'Aggregate likes, comments, shares, and saved from post insights.',
                kind: 'post-engagement',
            });
        }

        const hasViewsOrReach = posts.some((post) => post.metrics.views || post.metrics.reach);
        if (hasViewsOrReach) {
            widgets.push({
                id: 'post-reach-vs-views',
                title: 'Post Views vs Reach',
                description: 'Top posts comparison for views and reach.',
                kind: 'post-reach-vs-views',
            });
        }

        widgets.push({
            id: 'post-type-metric-overlay',
            title: 'Post Type Metric Comparison',
            description: 'Compare all post types on one trend graph for the selected post metric.',
            kind: 'post-type-metric-overlay',
        });
    }

    return widgets;
}

function getMetricChange(
    allPoints: MetricPoint[],
    windowPoints: MetricPoint[],
    dateRange: DateRangeBounds | null,
): number | undefined {
    if (dateRange === null) {
        if (allPoints.length < 2) return undefined;
        const latest = allPoints[allPoints.length - 1].value;
        const previous = allPoints[allPoints.length - 2].value;
        if (previous === 0) return undefined;
        return Number((((latest - previous) / previous) * 100).toFixed(1));
    }

    const currentRangeTotal = windowPoints.reduce((sum, point) => sum + point.value, 0);
    const currentRangeDurationMs = dateRange.endMs - dateRange.startMs;
    const previousRangeEndMs = dateRange.startMs - 1;
    const previousRangeStartMs = previousRangeEndMs - currentRangeDurationMs;

    const previousRangeTotal = allPoints.reduce((sum, point) => {
        if (point.sortValue < previousRangeStartMs || point.sortValue > previousRangeEndMs) return sum;
        return sum + point.value;
    }, 0);

    if (previousRangeTotal === 0) return undefined;
    return Number((((currentRangeTotal - previousRangeTotal) / previousRangeTotal) * 100).toFixed(1));
}

function InstagramMetricCard({
    label,
    value,
    change,
    changeLabel,
    icon,
    showGlobalValue,
    globalValue,
}: {
    label: string;
    value: number;
    change?: number;
    changeLabel: string;
    icon: React.ReactNode;
    showGlobalValue: boolean;
    globalValue: number;
}) {
    const isPositive = (change ?? 0) >= 0;

    return (
        <Card className="card-hover border-stone-200">
            <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
                        <p className="mt-1 text-2xl font-semibold text-stone-900">{value.toLocaleString()}</p>
                        {showGlobalValue && (
                            <p className="mt-1 text-[11px] text-stone-500">Global: {globalValue.toLocaleString()}</p>
                        )}
                        {change !== undefined && (
                            <p className={`mt-1 text-xs font-medium ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                                {isPositive ? '↑' : '↓'} {Math.abs(change)}% {changeLabel}
                            </p>
                        )}
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                        {icon}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function normalizePostTypeLabel(postType: string): string {
    return postType.trim() || 'Unknown';
}

function normalizeDescriptionText(description: string | null): string | null {
    if (!description) return null;
    const normalized = description.replace(/\s+/g, ' ').trim();
    return normalized || null;
}

function derivePostTitle(description: string | null, postId: string): string {
    const normalizedDescription = normalizeDescriptionText(description);
    if (!normalizedDescription) {
        return `Post ${postId.slice(-8)}`;
    }

    const firstSentence = normalizedDescription.split(/(?<=[.!?])\s+/)[0] || normalizedDescription;
    const titleCandidate = firstSentence.length > 90 ? `${firstSentence.slice(0, 87)}...` : firstSentence;
    return titleCandidate.trim();
}

function normalizeFuzzyText(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function isSubsequence(query: string, target: string): boolean {
    if (!query) return true;
    let queryIndex = 0;
    for (let targetIndex = 0; targetIndex < target.length; targetIndex += 1) {
        if (target[targetIndex] === query[queryIndex]) {
            queryIndex += 1;
            if (queryIndex === query.length) return true;
        }
    }
    return false;
}

function levenshteinDistance(a: string, b: string, maxDistance = 2): number {
    if (Math.abs(a.length - b.length) > maxDistance) return maxDistance + 1;
    const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
    const current = new Array<number>(b.length + 1).fill(0);

    for (let i = 1; i <= a.length; i += 1) {
        current[0] = i;
        let rowMin = current[0];
        for (let j = 1; j <= b.length; j += 1) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            current[j] = Math.min(
                previous[j] + 1,
                current[j - 1] + 1,
                previous[j - 1] + cost,
            );
            rowMin = Math.min(rowMin, current[j]);
        }
        if (rowMin > maxDistance) return maxDistance + 1;
        for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
    }

    return previous[b.length];
}

function fuzzyMatchesPostQuery(post: InstagramPostRecord, query: string): boolean {
    const normalizedQuery = normalizeFuzzyText(query);
    if (!normalizedQuery) return true;

    const searchableText = normalizeFuzzyText(
        [
            post.postId,
            post.title,
            post.description || '',
            post.postType,
            post.accountUsername || '',
            post.accountName || '',
        ].join(' '),
    );

    if (!searchableText) return false;
    if (searchableText.includes(normalizedQuery)) return true;

    const queryTokens = normalizedQuery.split(' ').filter(Boolean);
    const words = searchableText.split(' ').filter(Boolean);

    return queryTokens.every((token) => {
        if (searchableText.includes(token)) return true;

        return words.some((word) => {
            if (word.includes(token) || word.startsWith(token) || token.startsWith(word)) return true;
            if (token.length >= 4 && word.length >= 4 && levenshteinDistance(token, word, 1) <= 1) return true;
            return isSubsequence(token, word);
        });
    });
}

function isPostWithinTimeRange(post: InstagramPostRecord, timeFilter: PostTimeFilter): boolean {
    if (timeFilter === 'all') return true;
    if (!post.publishTime) return false;
    const publishDate = parseDate(post.publishTime);
    if (!publishDate) return false;

    const now = new Date();
    const daysMap: Record<Exclude<PostTimeFilter, 'all'>, number> = {
        last_7_days: 7,
        last_30_days: 30,
        last_90_days: 90,
        last_180_days: 180,
        last_365_days: 365,
    };
    const dayWindow = daysMap[timeFilter];
    const threshold = new Date(now);
    threshold.setDate(now.getDate() - dayWindow);
    return publishDate >= threshold;
}

export default function InstagramPage() {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

    const [metricSeries, setMetricSeries] = useState<MetricSeries[]>([]);
    const [posts, setPosts] = useState<InstagramPostRecord[]>([]);

    const [view, setView] = useState<'dashboard' | 'posts'>('dashboard');
    const [widgetSheetOpen, setWidgetSheetOpen] = useState(false);
    const [activeWidgetInstances, setActiveWidgetInstances] = useState<DashboardWidgetInstance[]>([]);
    const [persistedWidgetInstances, setPersistedWidgetInstances] = useState<DashboardWidgetInstance[] | null>(null);
    const [isLayoutLoading, setIsLayoutLoading] = useState(true);
    const [isLayoutInitialized, setIsLayoutInitialized] = useState(false);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const dragItemRef = useRef<string | null>(null);
    const [postWidgetSheetOpen, setPostWidgetSheetOpen] = useState(false);
    const [activePostWidgetInstances, setActivePostWidgetInstances] = useState<DashboardWidgetInstance[]>([]);
    const [postWidgetDragOverId, setPostWidgetDragOverId] = useState<string | null>(null);
    const postWidgetDragItemRef = useRef<string | null>(null);
    const defaultDateRangeInitializedRef = useRef(false);
    const [selectedCalendarRange, setSelectedCalendarRange] = useState<DateRange | undefined>();
    const [dashboardTimeframe, setDashboardTimeframe] = useState<DashboardTimeframePreset>('last_7_days');

    const [postsMode, setPostsMode] = useState<'individual' | 'analytics'>('analytics');
    const [searchQ, setSearchQ] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [timeFilter, setTimeFilter] = useState<PostTimeFilter>('all');
    const [sortBy, setSortBy] = useState<'publish_time' | 'total_interactions' | 'views' | 'reach'>(
        'publish_time',
    );
    const postGrowthMetricKey: PostMetricKey = 'total_interactions';
    const [postView, setPostView] = useState<'grid' | 'list'>('grid');
    const [selectedPost, setSelectedPost] = useState<InstagramPostRecord | null>(null);
    const dashboardLayoutUserId = user?.id || INSTAGRAM_USER_ID;

    const loadDashboardData = useCallback(async () => {
        setIsLoading(true);
        setErrorMessage(null);

        try {
            const metricParams = new URLSearchParams({
                metric: CHANNEL_METRICS.join(','),
                period: 'day',
            });

            const [insightsPayload, postInsightsPayload] = await Promise.all([
                fetchJson<ManualInsightsResponse>(
                    `/manual/insta/insights/${encodeURIComponent(INSTAGRAM_USER_ID)}?${metricParams.toString()}`,
                ),
                fetchJson<ManualPostInsightsResponse>(
                    `/manual/insta/posts/${encodeURIComponent(INSTAGRAM_USER_ID)}/insights?period=lifetime`,
                ),
            ]);

            setMetricSeries(parseChannelMetricSeries(insightsPayload));
            setPosts(parsePostRecords(postInsightsPayload));
            setLastSyncedAt(new Date().toLocaleString());
        } catch (error) {
            setErrorMessage((error as Error).message || 'Failed to load Instagram insights.');
            setMetricSeries([]);
            setPosts([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadDashboardData();
    }, [loadDashboardData]);

    useEffect(() => {
        let cancelled = false;
        setIsLayoutLoading(true);
        setIsLayoutInitialized(false);
        setActiveWidgetInstances([]);
        setPersistedWidgetInstances(null);

        const loadLayout = async () => {
            try {
                const payload = await fetchInstagramDashboardLayout(INSTAGRAM_USER_ID, dashboardLayoutUserId);
                if (cancelled) return;

                const persistedWidgets = Array.isArray(payload.active_widgets)
                    ? payload.active_widgets.map(fromLayoutWidget).filter((widget): widget is DashboardWidgetInstance => widget !== null)
                    : [];
                setPersistedWidgetInstances(persistedWidgets);
            } catch {
                if (!cancelled) {
                    setPersistedWidgetInstances([]);
                }
            } finally {
                if (!cancelled) setIsLayoutLoading(false);
            }
        };

        void loadLayout();
        return () => {
            cancelled = true;
        };
    }, [dashboardLayoutUserId]);

    const allSeriesByKey = useMemo(() => {
        const map = new Map<string, MetricSeries>();
        metricSeries.forEach((series) => map.set(series.key, series));
        return map;
    }, [metricSeries]);

    const latestValidWeekRange = useMemo<DateRange | null>(() => {
        const timestamps = metricSeries.flatMap((series) => series.points.map((point) => point.sortValue));
        for (const post of posts) {
            if (!post.publishTime) continue;
            const publishDate = parseDate(post.publishTime);
            if (!publishDate) continue;
            timestamps.push(publishDate.getTime());
        }
        return getLatestWeekDateRangeFromTimestamps(timestamps);
    }, [metricSeries, posts]);

    useEffect(() => {
        if (defaultDateRangeInitializedRef.current || isLoading) return;
        setSelectedCalendarRange(latestValidWeekRange || getLastWeekDateRange());
        setDashboardTimeframe('last_7_days');
        defaultDateRangeInitializedRef.current = true;
    }, [isLoading, latestValidWeekRange]);

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

    const selectedDateRange = useMemo<DateRangeBounds | null>(() => {
        if (!selectedCalendarRange?.from || !selectedCalendarRange.to) return null;
        return {
            startMs: startOfDay(selectedCalendarRange.from).getTime(),
            endMs: endOfDay(selectedCalendarRange.to).getTime(),
            startDate: selectedCalendarRange.from,
            endDate: selectedCalendarRange.to,
        };
    }, [selectedCalendarRange]);
    const isDateRangeActive = selectedDateRange !== null;

    const seriesForDisplay = useMemo(() => {
        if (!isDateRangeActive || !selectedDateRange) return metricSeries;

        return metricSeries.map((series) => {
            const points = series.points.filter(
                (point) => point.sortValue >= selectedDateRange.startMs && point.sortValue <= selectedDateRange.endMs,
            );
            const total = points.reduce((sum, point) => sum + point.value, 0);
            const latest = points.length > 0 ? points[points.length - 1].value : 0;
            return {
                ...series,
                points,
                total,
                latest,
            };
        });
    }, [metricSeries, isDateRangeActive, selectedDateRange]);

    const seriesByKey = useMemo(() => {
        const map = new Map<string, MetricSeries>();
        seriesForDisplay.forEach((series) => map.set(series.key, series));
        return map;
    }, [seriesForDisplay]);

    const postsForDisplay = useMemo(() => {
        if (!isDateRangeActive || !selectedDateRange) return posts;

        return posts.filter((post) => {
            if (!post.publishTime) return false;
            const publishDate = parseDate(post.publishTime);
            if (!publishDate) return false;
            const timestamp = publishDate.getTime();
            return timestamp >= selectedDateRange.startMs && timestamp <= selectedDateRange.endMs;
        });
    }, [posts, isDateRangeActive, selectedDateRange]);

    const postTotals = useMemo(() => {
        const totals: Record<string, number> = {};
        for (const post of posts) {
            Object.entries(post.metrics).forEach(([metricKey, metricValue]) => {
                totals[metricKey] = (totals[metricKey] || 0) + metricValue;
            });
        }
        totals.total_interactions = deriveTotalInteractions(totals);
        return totals;
    }, [posts]);

    const postTotalsForDisplay = useMemo(() => {
        const totals: Record<string, number> = {};
        for (const post of postsForDisplay) {
            Object.entries(post.metrics).forEach(([metricKey, metricValue]) => {
                totals[metricKey] = (totals[metricKey] || 0) + metricValue;
            });
        }
        totals.total_interactions = deriveTotalInteractions(totals);
        return totals;
    }, [postsForDisplay]);

    const widgetCatalog = useMemo(
        () => buildWidgetCatalog(metricSeries, posts),
        [metricSeries, posts],
    );

    const channelMetricOptions = useMemo(
        () =>
            metricSeries
                .filter((series) => series.points.length > 0)
                .map((series) => ({ value: series.key, label: series.label })),
        [metricSeries],
    );
    const widgetPostTypeOptions = useMemo(
        () => [
            AGGREGATE_POST_TYPE,
            ...Array.from(new Set(postsForDisplay.map((post) => normalizePostTypeLabel(post.postType)))),
        ],
        [postsForDisplay],
    );

    const getDefaultWidgetConfig = useCallback(
        (widget: DashboardWidget): DashboardWidgetConfig => {
            if (widget.kind === 'dynamic-metric-line') {
                return {
                    metricKey: channelMetricOptions[0]?.value,
                };
            }

            if (widget.kind === 'metric-scatter-compare') {
                const xMetricKey = channelMetricOptions[0]?.value;
                const yMetricKey = channelMetricOptions.find((option) => option.value !== xMetricKey)?.value || xMetricKey;
                return {
                    xMetricKey,
                    yMetricKey,
                };
            }

            if (
                widget.kind === 'top-posts' ||
                widget.kind === 'post-metric-trend' ||
                widget.kind === 'post-type-metric-overlay'
            ) {
                return {
                    postMetricKey: postGrowthMetricKey,
                    postType: AGGREGATE_POST_TYPE,
                };
            }

            return {};
        },
        [channelMetricOptions, postGrowthMetricKey],
    );

    const normalizeWidgetConfig = useCallback(
        (widget: DashboardWidget, config: DashboardWidgetConfig): DashboardWidgetConfig => {
            const metricKeys = channelMetricOptions.map((option) => option.value);

            if (widget.kind === 'dynamic-metric-line') {
                const metricKey = metricKeys.includes(config.metricKey || '')
                    ? config.metricKey
                    : channelMetricOptions[0]?.value;
                return { metricKey };
            }

            if (widget.kind === 'metric-scatter-compare') {
                const defaultXMetricKey = channelMetricOptions[0]?.value;
                const xMetricKey = metricKeys.includes(config.xMetricKey || '') ? config.xMetricKey : defaultXMetricKey;
                const defaultYMetricKey =
                    channelMetricOptions.find((option) => option.value !== xMetricKey)?.value || xMetricKey;
                const yMetricKey = metricKeys.includes(config.yMetricKey || '') ? config.yMetricKey : defaultYMetricKey;
                return { xMetricKey, yMetricKey };
            }

            if (
                widget.kind === 'top-posts' ||
                widget.kind === 'post-metric-trend' ||
                widget.kind === 'post-type-metric-overlay'
            ) {
                return {
                    postMetricKey: normalizePostMetricKey(config.postMetricKey, postGrowthMetricKey),
                    postType: normalizeWidgetPostType(config.postType, widgetPostTypeOptions),
                };
            }

            return {};
        },
        [channelMetricOptions, postGrowthMetricKey, widgetPostTypeOptions],
    );

    useEffect(() => {
        if (isLayoutLoading || isLayoutInitialized) return;
        if (isLoading && widgetCatalog.length === 0) return;

        const widgetMap = new Map(widgetCatalog.map((widget) => [widget.id, widget]));
        const persistedInstances = (persistedWidgetInstances || [])
            .map((instance) => {
                const template = widgetMap.get(instance.widgetId);
                if (!template) return null;
                return {
                    ...instance,
                    config: normalizeWidgetConfig(template, instance.config),
                } satisfies DashboardWidgetInstance;
            })
            .filter((instance): instance is DashboardWidgetInstance => instance !== null);

        if (persistedInstances.length > 0) {
            setActiveWidgetInstances(persistedInstances);
        } else {
            const initialInstances = widgetCatalog
                .slice(0, 6)
                .map((widget) => createWidgetInstance(widget.id, getDefaultWidgetConfig(widget)));
            setActiveWidgetInstances(initialInstances);
        }

        setIsLayoutInitialized(true);
    }, [
        widgetCatalog,
        isLayoutLoading,
        isLayoutInitialized,
        isLoading,
        persistedWidgetInstances,
        normalizeWidgetConfig,
        getDefaultWidgetConfig,
    ]);

    useEffect(() => {
        if (!isLayoutInitialized) return;
        const validIds = new Set(widgetCatalog.map((widget) => widget.id));
        const widgetMap = new Map(widgetCatalog.map((widget) => [widget.id, widget]));
        setActiveWidgetInstances((previousInstances) => {
            const normalizedInstances = previousInstances
                .filter((instance) => validIds.has(instance.widgetId))
                .map((instance) => {
                    const template = widgetMap.get(instance.widgetId);
                    if (!template) return instance;
                    return {
                        ...instance,
                        config: normalizeWidgetConfig(template, instance.config),
                    };
                });

            if (normalizedInstances.length > 0) return normalizedInstances;
            return widgetCatalog
                .slice(0, 6)
                .map((widget) => createWidgetInstance(widget.id, getDefaultWidgetConfig(widget)));
        });
    }, [widgetCatalog, isLayoutInitialized, normalizeWidgetConfig, getDefaultWidgetConfig]);

    useEffect(() => {
        if (!isLayoutInitialized || isLayoutLoading) return;
        const saveTimer = window.setTimeout(() => {
            void saveInstagramDashboardLayout({
                igUserId: INSTAGRAM_USER_ID,
                dashboardUserId: dashboardLayoutUserId,
                activeWidgets: activeWidgetInstances.map(toLayoutWidget),
            });
        }, 300);

        return () => {
            window.clearTimeout(saveTimer);
        };
    }, [
        activeWidgetInstances,
        dashboardLayoutUserId,
        isLayoutInitialized,
        isLayoutLoading,
    ]);

    const widgetById = useMemo(() => {
        const map = new Map<string, DashboardWidget>();
        widgetCatalog.forEach((widget) => map.set(widget.id, widget));
        return map;
    }, [widgetCatalog]);

    const activeWidgets = useMemo(
        () =>
            activeWidgetInstances
                .map((instance) => {
                    const template = widgetById.get(instance.widgetId);
                    if (!template) return null;
                    return { template, instance } satisfies ActiveDashboardWidget;
                })
                .filter((widget): widget is ActiveDashboardWidget => widget !== null),
        [activeWidgetInstances, widgetById],
    );

    const availableWidgets = widgetCatalog;

    const postWidgetCatalog = useMemo(
        () => widgetCatalog.filter((widget) => POST_WIDGET_KINDS.has(widget.kind)),
        [widgetCatalog],
    );

    const postWidgetById = useMemo(() => {
        const map = new Map<string, DashboardWidget>();
        postWidgetCatalog.forEach((widget) => map.set(widget.id, widget));
        return map;
    }, [postWidgetCatalog]);

    const activePostWidgets = useMemo(
        () =>
            activePostWidgetInstances
                .map((instance) => {
                    const template = postWidgetById.get(instance.widgetId);
                    if (!template) return null;
                    return { template, instance } satisfies ActiveDashboardWidget;
                })
                .filter((widget): widget is ActiveDashboardWidget => widget !== null),
        [activePostWidgetInstances, postWidgetById],
    );

    const availablePostWidgets = postWidgetCatalog;

    useEffect(() => {
        const validIds = new Set(postWidgetCatalog.map((widget) => widget.id));
        const widgetMap = new Map(postWidgetCatalog.map((widget) => [widget.id, widget]));
        setActivePostWidgetInstances((previousInstances) => {
            const normalizedInstances = previousInstances
                .filter((instance) => validIds.has(instance.widgetId))
                .map((instance) => {
                    const template = widgetMap.get(instance.widgetId);
                    if (!template) return instance;
                    return {
                        ...instance,
                        config: normalizeWidgetConfig(template, instance.config),
                    };
                });

            if (normalizedInstances.length > 0 || postWidgetCatalog.length === 0) {
                return normalizedInstances;
            }

            return postWidgetCatalog
                .slice(0, 4)
                .map((widget) => createWidgetInstance(widget.id, getDefaultWidgetConfig(widget)));
        });
    }, [postWidgetCatalog, normalizeWidgetConfig, getDefaultWidgetConfig]);

    const postTypeDistribution = useMemo(() => {
        const counts = new Map<string, number>();
        postsForDisplay.forEach((post) => {
            const key = normalizePostTypeLabel(post.postType);
            counts.set(key, (counts.get(key) || 0) + 1);
        });
        return Array.from(counts.entries()).map(([type, count]) => ({ type, count }));
    }, [postsForDisplay]);

    const topPostsByMetric = useMemo(
        () => rankPostsByMetric(postsForDisplay, 'total_interactions'),
        [postsForDisplay],
    );

    const postEngagementBreakdown = useMemo(
        () => [
            { metric: 'Likes', value: postTotalsForDisplay.likes || 0 },
            { metric: 'Comments', value: postTotalsForDisplay.comments || 0 },
            { metric: 'Shares', value: postTotalsForDisplay.shares || 0 },
            { metric: 'Saved', value: postTotalsForDisplay.saved || 0 },
        ],
        [postTotalsForDisplay],
    );

    const postViewsVsReach = useMemo(
        () =>
            topPostsByMetric.slice(0, 8).map((post) => ({
                postId: post.postId.slice(-6),
                views: post.metrics.views || 0,
                reach: post.metrics.reach || 0,
            })),
        [topPostsByMetric],
    );

    const metricOverviewData = useMemo(
        () =>
            seriesForDisplay
                .filter((series) => series.points.length > 0)
                .map((series) => ({
                    metric: series.label,
                    total: Math.round(series.total),
                })),
        [seriesForDisplay],
    );

    const channelMetricRows = useMemo(() => {
        const rowsByDate = new Map<
            string,
            {
                dateLabel: string;
                sortValue: number;
                values: Record<string, number>;
            }
        >();

        for (const series of seriesForDisplay) {
            for (const point of series.points) {
                const existing = rowsByDate.get(point.dateKey) || {
                    dateLabel: point.dateLabel,
                    sortValue: point.sortValue,
                    values: {},
                };
                existing.values[series.key] = point.value;
                rowsByDate.set(point.dateKey, existing);
            }
        }

        return Array.from(rowsByDate.values()).sort((a, b) => a.sortValue - b.sortValue);
    }, [seriesForDisplay]);

    const typeOptions = useMemo(
        () => ['all', ...postTypeDistribution.map((item) => item.type)],
        [postTypeDistribution],
    );

    const postTimeFilterOptions: Array<{ value: PostTimeFilter; label: string }> = [
        { value: 'all', label: 'All time' },
        { value: 'last_7_days', label: 'Last 7 days' },
        { value: 'last_30_days', label: 'Last 30 days' },
        { value: 'last_90_days', label: 'Last 90 days' },
        { value: 'last_180_days', label: 'Last 180 days' },
        { value: 'last_365_days', label: 'Last 365 days' },
    ];

    const filteredPosts = useMemo(() => {
        let result = [...postsForDisplay];
        if (typeFilter !== 'all') {
            result = result.filter((post) => normalizePostTypeLabel(post.postType) === typeFilter);
        }
        result = result.filter((post) => isPostWithinTimeRange(post, timeFilter));
        if (searchQ.trim()) {
            result = result.filter((post) => fuzzyMatchesPostQuery(post, searchQ));
        }

        result.sort((a, b) => {
            if (sortBy === 'publish_time') return sortByPublishTimeDescending(a, b);
            return (b.metrics[sortBy] || 0) - (a.metrics[sortBy] || 0);
        });

        return result;
    }, [postsForDisplay, typeFilter, timeFilter, searchQ, sortBy]);

    const globalViewsSeries = allSeriesByKey.get('views');
    const globalReachSeries = allSeriesByKey.get('reach');
    const globalInteractionsSeries = allSeriesByKey.get('content_interactions');
    const globalFollowsSeries = allSeriesByKey.get('instagram_follows');

    const viewsSeries = seriesByKey.get('views');
    const reachSeries = seriesByKey.get('reach');
    const interactionsSeries = seriesByKey.get('content_interactions');
    const followsSeries = seriesByKey.get('instagram_follows');

    const globalTotalViews = globalViewsSeries ? Math.round(globalViewsSeries.total) : Math.round(postTotals.views || 0);
    const globalTotalReach = globalReachSeries ? Math.round(globalReachSeries.total) : Math.round(postTotals.reach || 0);
    const globalTotalInteractions = globalInteractionsSeries
        ? Math.round(globalInteractionsSeries.total)
        : Math.round(postTotals.total_interactions || 0);
    const globalTotalFollows = globalFollowsSeries
        ? Math.round(globalFollowsSeries.total)
        : Math.round(postTotals.follows || 0);

    const selectedRangeTotalViews = viewsSeries
        ? Math.round(viewsSeries.total)
        : Math.round(postTotalsForDisplay.views || 0);
    const selectedRangeTotalReach = reachSeries
        ? Math.round(reachSeries.total)
        : Math.round(postTotalsForDisplay.reach || 0);
    const selectedRangeTotalInteractions = interactionsSeries
        ? Math.round(interactionsSeries.total)
        : Math.round(postTotalsForDisplay.total_interactions || 0);
    const selectedRangeTotalFollows = followsSeries
        ? Math.round(followsSeries.total)
        : Math.round(postTotalsForDisplay.follows || 0);

    const totalViews = isDateRangeActive ? selectedRangeTotalViews : globalTotalViews;
    const totalReach = isDateRangeActive ? selectedRangeTotalReach : globalTotalReach;
    const totalInteractions = isDateRangeActive ? selectedRangeTotalInteractions : globalTotalInteractions;
    const totalFollows = isDateRangeActive ? selectedRangeTotalFollows : globalTotalFollows;

    const comparisonLabel = isDateRangeActive ? 'vs previous equal range' : 'vs previous day';

    const viewsChange = globalViewsSeries
        ? getMetricChange(globalViewsSeries.points, viewsSeries ? viewsSeries.points : [], selectedDateRange)
        : undefined;
    const reachChange = globalReachSeries
        ? getMetricChange(globalReachSeries.points, reachSeries ? reachSeries.points : [], selectedDateRange)
        : undefined;
    const interactionsChange = globalInteractionsSeries
        ? getMetricChange(
              globalInteractionsSeries.points,
              interactionsSeries ? interactionsSeries.points : [],
              selectedDateRange,
          )
        : undefined;
    const followsChange = globalFollowsSeries
        ? getMetricChange(globalFollowsSeries.points, followsSeries ? followsSeries.points : [], selectedDateRange)
        : undefined;

    const updateWidgetConfig = useCallback((instanceId: string, patch: Partial<DashboardWidgetConfig>) => {
        setActiveWidgetInstances((previousInstances) => applyWidgetConfigPatch(previousInstances, instanceId, patch));
        setActivePostWidgetInstances((previousInstances) => applyWidgetConfigPatch(previousInstances, instanceId, patch));
    }, []);

    const renderWidget = (widget: DashboardWidget, widgetInstance: DashboardWidgetInstance) => {
        if (widget.kind === 'channel-overview') {
            if (metricOverviewData.length === 0) {
                return (
                    <p className="text-xs text-stone-400">
                        No channelwise metric rows available for {INSTAGRAM_USER_ID}.
                    </p>
                );
            }

            return (
                <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={metricOverviewData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                            <XAxis dataKey="metric" tick={{ fontSize: 10, fill: '#78716C' }} />
                            <YAxis tick={{ fontSize: 10, fill: '#78716C' }} />
                            <Tooltip />
                            <Bar dataKey="total" fill="#7C3AED" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            );
        }

        if (widget.kind === 'metric-line' && widget.metricKey) {
            const series = seriesByKey.get(widget.metricKey);
            if (!series || series.points.length === 0) {
                return <p className="text-xs text-stone-400">No data points available for this metric.</p>;
            }

            const chartData = series.points.map((point) => ({
                date: point.dateLabel,
                value: point.value,
            }));

            return (
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-stone-500">
                        <span>Total: {Math.round(series.total).toLocaleString()}</span>
                        <span>Latest: {Math.round(series.latest).toLocaleString()}</span>
                    </div>
                    <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#78716C' }} />
                                <YAxis tick={{ fontSize: 10, fill: '#78716C' }} />
                                <Tooltip />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke={metricColor(series.key)}
                                    fill={metricColor(series.key)}
                                    fillOpacity={0.14}
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            );
        }

        if (widget.kind === 'dynamic-metric-line') {
            if (channelMetricOptions.length === 0) {
                return <p className="text-xs text-stone-400">No channel metrics available to visualize.</p>;
            }

            const selectedMetricKey = channelMetricOptions.some((option) => option.value === widgetInstance.config.metricKey)
                ? widgetInstance.config.metricKey || channelMetricOptions[0].value
                : channelMetricOptions[0].value;
            const selectedSeries = seriesByKey.get(selectedMetricKey);

            if (!selectedSeries || selectedSeries.points.length === 0) {
                return <p className="text-xs text-stone-400">No trend points available for this metric.</p>;
            }

            const chartData = selectedSeries.points.map((point) => ({
                date: point.dateLabel,
                value: point.value,
            }));

            return (
                <div className="space-y-2">
                    <Select
                        value={selectedMetricKey}
                        onValueChange={(value) =>
                            updateWidgetConfig(widgetInstance.instanceId, {
                                metricKey: value,
                            })
                        }
                    >
                        <SelectTrigger className="h-8 w-[190px] text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {channelMetricOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="flex items-center justify-between text-xs text-stone-500">
                        <span>Total: {Math.round(selectedSeries.total).toLocaleString()}</span>
                        <span>Latest: {Math.round(selectedSeries.latest).toLocaleString()}</span>
                    </div>
                    <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#78716C' }} />
                                <YAxis tick={{ fontSize: 10, fill: '#78716C' }} />
                                <Tooltip />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke={metricColor(selectedMetricKey)}
                                    fill={metricColor(selectedMetricKey)}
                                    fillOpacity={0.14}
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            );
        }

        if (widget.kind === 'metric-scatter-compare') {
            if (channelMetricOptions.length < 2) {
                return <p className="text-xs text-stone-400">At least two channel metrics are required to compare axes.</p>;
            }

            const defaultXMetricKey = channelMetricOptions[0].value;
            const selectedXMetricKey = channelMetricOptions.some((option) => option.value === widgetInstance.config.xMetricKey)
                ? widgetInstance.config.xMetricKey || defaultXMetricKey
                : defaultXMetricKey;

            const defaultYMetricKey =
                channelMetricOptions.find((option) => option.value !== selectedXMetricKey)?.value || selectedXMetricKey;
            const selectedYMetricKey = channelMetricOptions.some((option) => option.value === widgetInstance.config.yMetricKey)
                ? widgetInstance.config.yMetricKey || defaultYMetricKey
                : defaultYMetricKey;

            const scatterData = channelMetricRows
                .filter((row) => {
                    const xValue = row.values[selectedXMetricKey];
                    const yValue = row.values[selectedYMetricKey];
                    return Number.isFinite(xValue) && Number.isFinite(yValue);
                })
                .map((row) => ({
                    date: row.dateLabel,
                    x: row.values[selectedXMetricKey],
                    y: row.values[selectedYMetricKey],
                }));

            if (scatterData.length === 0) {
                return (
                    <p className="text-xs text-stone-400">
                        No overlapping points found for {formatMetricLabel(selectedXMetricKey)} and{' '}
                        {formatMetricLabel(selectedYMetricKey)}.
                    </p>
                );
            }

            return (
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <Select
                            value={selectedXMetricKey}
                            onValueChange={(value) =>
                                updateWidgetConfig(widgetInstance.instanceId, {
                                    xMetricKey: value,
                                })
                            }
                        >
                            <SelectTrigger className="h-8 w-[180px] text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {channelMetricOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        X: {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={selectedYMetricKey}
                            onValueChange={(value) =>
                                updateWidgetConfig(widgetInstance.instanceId, {
                                    yMetricKey: value,
                                })
                            }
                        >
                            <SelectTrigger className="h-8 w-[180px] text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {channelMetricOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        Y: {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="h-[240px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                                <XAxis
                                    type="number"
                                    dataKey="x"
                                    name={formatMetricLabel(selectedXMetricKey)}
                                    tick={{ fontSize: 10, fill: '#78716C' }}
                                />
                                <YAxis
                                    type="number"
                                    dataKey="y"
                                    name={formatMetricLabel(selectedYMetricKey)}
                                    tick={{ fontSize: 10, fill: '#78716C' }}
                                />
                                <Tooltip
                                    cursor={{ strokeDasharray: '3 3' }}
                                    formatter={(value, _name, props) => {
                                        const isXAxis = props.dataKey === 'x';
                                        const label = isXAxis
                                            ? formatMetricLabel(selectedXMetricKey)
                                            : formatMetricLabel(selectedYMetricKey);
                                        return [Number(value).toLocaleString(), label];
                                    }}
                                    labelFormatter={(_label, payload) => {
                                        if (!payload || payload.length === 0) return '';
                                        const row = payload[0]?.payload as { date?: string } | undefined;
                                        return row?.date || '';
                                    }}
                                />
                                <Scatter data={scatterData} fill="#7C3AED" />
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            );
        }

        if (widget.kind === 'post-type-distribution') {
            if (postTypeDistribution.length === 0) {
                return <p className="text-xs text-stone-400">No post rows available.</p>;
            }

            return (
                <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={postTypeDistribution}
                                dataKey="count"
                                nameKey="type"
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={85}
                                labelLine={false}
                            >
                                {postTypeDistribution.map((item, index) => (
                                    <Cell key={`${item.type}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            );
        }

        if (widget.kind === 'top-posts') {
            const selectedMetricKey = normalizePostMetricKey(widgetInstance.config.postMetricKey, postGrowthMetricKey);
            const selectedMetricLabel =
                POST_TYPE_GROWTH_METRIC_OPTIONS.find((option) => option.value === selectedMetricKey)?.label ||
                formatMetricLabel(selectedMetricKey);
            const selectedPostType = normalizeWidgetPostType(widgetInstance.config.postType, widgetPostTypeOptions);
            const selectedPostTypeLabel =
                selectedPostType === AGGREGATE_POST_TYPE ? 'All post types (Aggregate)' : selectedPostType;
            const postsForWidget =
                selectedPostType === AGGREGATE_POST_TYPE
                    ? postsForDisplay
                    : postsForDisplay.filter((post) => normalizePostTypeLabel(post.postType) === selectedPostType);
            const rankedPosts = rankPostsByMetric(postsForWidget, selectedMetricKey);

            if (rankedPosts.length === 0) {
                return <p className="text-xs text-stone-400">No post ranking data available for {selectedPostTypeLabel.toLowerCase()}.</p>;
            }

            return (
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <Select
                            value={selectedMetricKey}
                            onValueChange={(value) =>
                                updateWidgetConfig(widgetInstance.instanceId, {
                                    postMetricKey: value as PostMetricKey,
                                })
                            }
                        >
                            <SelectTrigger className="h-8 w-[180px] text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {POST_TYPE_GROWTH_METRIC_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={selectedPostType}
                            onValueChange={(value) =>
                                updateWidgetConfig(widgetInstance.instanceId, {
                                    postType: value,
                                })
                            }
                        >
                            <SelectTrigger className="h-8 w-[220px] text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {widgetPostTypeOptions.map((postTypeOption) => (
                                    <SelectItem key={postTypeOption} value={postTypeOption}>
                                        {postTypeOption === AGGREGATE_POST_TYPE
                                            ? 'All post types (Aggregate)'
                                            : postTypeOption}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {rankedPosts.slice(0, 6).map((post) => (
                        <button
                            key={post.postId}
                            type="button"
                            onClick={() => setSelectedPost(post)}
                            className="flex w-full items-center justify-between rounded-md border border-stone-100 bg-stone-50 px-3 py-2 text-left transition-colors hover:bg-stone-100"
                        >
                            <div className="min-w-0">
                                <p className="truncate text-xs font-medium text-stone-800">{post.title}</p>
                                <p className="text-[11px] text-stone-500">{normalizePostTypeLabel(post.postType)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-semibold text-stone-800">
                                    {Math.round(getPostMetricValue(post, selectedMetricKey)).toLocaleString()}
                                </p>
                                <p className="text-[11px] text-stone-500">
                                    {selectedMetricLabel.toLowerCase()}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            );
        }

        if (widget.kind === 'post-metric-trend') {
            const selectedMetricKey = normalizePostMetricKey(widgetInstance.config.postMetricKey, postGrowthMetricKey);
            const selectedMetricLabel =
                POST_TYPE_GROWTH_METRIC_OPTIONS.find((option) => option.value === selectedMetricKey)?.label ||
                formatMetricLabel(selectedMetricKey);
            const selectedPostType = normalizeWidgetPostType(widgetInstance.config.postType, widgetPostTypeOptions);
            const selectedPostTypeLabel =
                selectedPostType === AGGREGATE_POST_TYPE ? 'All post types (Aggregate)' : selectedPostType;
            const postsForWidget =
                selectedPostType === AGGREGATE_POST_TYPE
                    ? postsForDisplay
                    : postsForDisplay.filter((post) => normalizePostTypeLabel(post.postType) === selectedPostType);
            const trendData = buildPostMetricTrendData(postsForWidget, selectedMetricKey);

            if (trendData.length === 0) {
                return (
                    <p className="text-xs text-stone-400">
                        No publish-time trend data available for {selectedMetricLabel.toLowerCase()} in{' '}
                        {selectedPostTypeLabel.toLowerCase()}.
                    </p>
                );
            }

            return (
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <Select
                            value={selectedMetricKey}
                            onValueChange={(value) =>
                                updateWidgetConfig(widgetInstance.instanceId, {
                                    postMetricKey: value as PostMetricKey,
                                })
                            }
                        >
                            <SelectTrigger className="h-8 w-[180px] text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {POST_TYPE_GROWTH_METRIC_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={selectedPostType}
                            onValueChange={(value) =>
                                updateWidgetConfig(widgetInstance.instanceId, {
                                    postType: value,
                                })
                            }
                        >
                            <SelectTrigger className="h-8 w-[220px] text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {widgetPostTypeOptions.map((postTypeOption) => (
                                    <SelectItem key={postTypeOption} value={postTypeOption}>
                                        {postTypeOption === AGGREGATE_POST_TYPE
                                            ? 'All post types (Aggregate)'
                                            : postTypeOption}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#78716C' }} />
                                <YAxis tick={{ fontSize: 10, fill: '#78716C' }} />
                                <Tooltip />
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke={metricColor(selectedMetricKey)}
                                    strokeWidth={2}
                                    dot={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            );
        }

        if (widget.kind === 'post-type-metric-overlay') {
            const selectedMetricKey = normalizePostMetricKey(widgetInstance.config.postMetricKey, postGrowthMetricKey);
            const selectedMetricLabel =
                POST_TYPE_GROWTH_METRIC_OPTIONS.find((option) => option.value === selectedMetricKey)?.label ||
                formatMetricLabel(selectedMetricKey);
            const overlayData = buildPostTypeMetricOverlayData(postsForDisplay, selectedMetricKey);

            if (overlayData.data.length === 0 || overlayData.series.length === 0) {
                return (
                    <p className="text-xs text-stone-400">
                        No publish-time post-type comparison data available for {selectedMetricLabel.toLowerCase()}.
                    </p>
                );
            }

            return (
                <div className="space-y-2">
                    <Select
                        value={selectedMetricKey}
                        onValueChange={(value) =>
                            updateWidgetConfig(widgetInstance.instanceId, {
                                postMetricKey: value as PostMetricKey,
                            })
                        }
                    >
                        <SelectTrigger className="h-8 w-[220px] text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {POST_TYPE_GROWTH_METRIC_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="h-[240px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={overlayData.data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#78716C' }} />
                                <YAxis tick={{ fontSize: 10, fill: '#78716C' }} />
                                <Tooltip
                                    formatter={(value, name) => [Number(value).toLocaleString(), String(name)]}
                                />
                                <Legend />
                                {overlayData.series.map((seriesItem) => (
                                    <Line
                                        key={seriesItem.dataKey}
                                        type="monotone"
                                        dataKey={seriesItem.dataKey}
                                        name={seriesItem.postType}
                                        stroke={seriesItem.color}
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            );
        }

        if (widget.kind === 'post-engagement') {
            if (postEngagementBreakdown.every((item) => item.value === 0)) {
                return <p className="text-xs text-stone-400">No likes/comments/shares/saved data available.</p>;
            }

            return (
                <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={postEngagementBreakdown}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                            <XAxis dataKey="metric" tick={{ fontSize: 10, fill: '#78716C' }} />
                            <YAxis tick={{ fontSize: 10, fill: '#78716C' }} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#16A34A" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            );
        }

        if (widget.kind === 'post-reach-vs-views') {
            if (postViewsVsReach.length === 0) {
                return <p className="text-xs text-stone-400">No views/reach data available for posts.</p>;
            }

            return (
                <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={postViewsVsReach}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                            <XAxis dataKey="postId" tick={{ fontSize: 10, fill: '#78716C' }} />
                            <YAxis tick={{ fontSize: 10, fill: '#78716C' }} />
                            <Tooltip />
                            <Bar dataKey="views" fill="#7C3AED" radius={[6, 6, 0, 0]} />
                            <Bar dataKey="reach" fill="#2563EB" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            );
        }

        return <p className="text-xs text-stone-400">Unsupported widget type.</p>;
    };

    const renderWidgetPickerPreview = (widget: DashboardWidget) => (
        <div className="mt-3 rounded-md border border-stone-100 bg-stone-50 p-2">
            {widget.kind === 'metric-line' || widget.kind === 'dynamic-metric-line' ? (
                <div className="h-10 rounded bg-gradient-to-r from-violet-100 via-violet-50 to-white" />
            ) : widget.kind === 'metric-scatter-compare' ? (
                <div className="grid grid-cols-2 gap-1">
                    <div className="h-8 rounded bg-violet-100" />
                    <div className="h-8 rounded bg-blue-100" />
                </div>
            ) : widget.kind === 'post-type-distribution' ? (
                <div className="grid grid-cols-3 gap-1">
                    <div className="h-8 rounded-full bg-violet-100" />
                    <div className="h-8 rounded-full bg-blue-100" />
                    <div className="h-8 rounded-full bg-emerald-100" />
                </div>
            ) : (
                <div className="space-y-1.5">
                    <div className="h-2 rounded bg-stone-200" />
                    <div className="h-2 w-5/6 rounded bg-stone-200" />
                    <div className="h-2 w-2/3 rounded bg-stone-200" />
                </div>
            )}
        </div>
    );

    const addWidget = (widgetId: string) => {
        const template = widgetById.get(widgetId);
        if (!template) return;
        setActiveWidgetInstances((previousInstances) => [
            ...previousInstances,
            createWidgetInstance(widgetId, getDefaultWidgetConfig(template)),
        ]);
        setWidgetSheetOpen(false);
    };

    const removeWidget = (instanceId: string) => {
        setActiveWidgetInstances((previousInstances) =>
            previousInstances.filter((instance) => instance.instanceId !== instanceId),
        );
    };

    const addPostWidget = (widgetId: string) => {
        const template = postWidgetById.get(widgetId);
        if (!template) return;
        setActivePostWidgetInstances((previousInstances) => [
            ...previousInstances,
            createWidgetInstance(widgetId, getDefaultWidgetConfig(template)),
        ]);
        setPostWidgetSheetOpen(false);
    };

    const removePostWidget = (instanceId: string) => {
        setActivePostWidgetInstances((previousInstances) =>
            previousInstances.filter((instance) => instance.instanceId !== instanceId),
        );
    };

    const handleWidgetDragStart = useCallback((event: React.DragEvent<HTMLDivElement>, instanceId: string) => {
        dragItemRef.current = instanceId;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', instanceId);
        event.currentTarget.style.opacity = '0.6';
    }, []);

    const handleWidgetDragEnd = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.currentTarget.style.opacity = '1';
        setDragOverId(null);
        dragItemRef.current = null;
    }, []);

    const handleWidgetDragOver = useCallback((event: React.DragEvent<HTMLDivElement>, targetInstanceId: string) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        if (dragItemRef.current && dragItemRef.current !== targetInstanceId) {
            setDragOverId(targetInstanceId);
        }
    }, []);

    const handleWidgetDragLeave = useCallback(() => {
        setDragOverId(null);
    }, []);

    const handleWidgetDrop = useCallback((event: React.DragEvent<HTMLDivElement>, targetInstanceId: string) => {
        event.preventDefault();
        const sourceInstanceId = dragItemRef.current;
        if (!sourceInstanceId || sourceInstanceId === targetInstanceId) return;

        setActiveWidgetInstances((previousInstances) => {
            const nextInstances = [...previousInstances];
            const sourceIndex = nextInstances.findIndex((instance) => instance.instanceId === sourceInstanceId);
            const targetIndex = nextInstances.findIndex((instance) => instance.instanceId === targetInstanceId);
            if (sourceIndex < 0 || targetIndex < 0) return previousInstances;

            const [movedWidget] = nextInstances.splice(sourceIndex, 1);
            nextInstances.splice(targetIndex, 0, movedWidget);
            return nextInstances;
        });

        setDragOverId(null);
        dragItemRef.current = null;
    }, []);

    const handlePostWidgetDragStart = useCallback((event: React.DragEvent<HTMLDivElement>, instanceId: string) => {
        postWidgetDragItemRef.current = instanceId;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', instanceId);
        event.currentTarget.style.opacity = '0.6';
    }, []);

    const handlePostWidgetDragEnd = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.currentTarget.style.opacity = '1';
        setPostWidgetDragOverId(null);
        postWidgetDragItemRef.current = null;
    }, []);

    const handlePostWidgetDragOver = useCallback((event: React.DragEvent<HTMLDivElement>, targetInstanceId: string) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        if (postWidgetDragItemRef.current && postWidgetDragItemRef.current !== targetInstanceId) {
            setPostWidgetDragOverId(targetInstanceId);
        }
    }, []);

    const handlePostWidgetDragLeave = useCallback(() => {
        setPostWidgetDragOverId(null);
    }, []);

    const handlePostWidgetDrop = useCallback((event: React.DragEvent<HTMLDivElement>, targetInstanceId: string) => {
        event.preventDefault();
        const sourceInstanceId = postWidgetDragItemRef.current;
        if (!sourceInstanceId || sourceInstanceId === targetInstanceId) return;

        setActivePostWidgetInstances((previousInstances) => {
            const nextInstances = [...previousInstances];
            const sourceIndex = nextInstances.findIndex((instance) => instance.instanceId === sourceInstanceId);
            const targetIndex = nextInstances.findIndex((instance) => instance.instanceId === targetInstanceId);
            if (sourceIndex < 0 || targetIndex < 0) return previousInstances;

            const [movedWidget] = nextInstances.splice(sourceIndex, 1);
            nextInstances.splice(targetIndex, 0, movedWidget);
            return nextInstances;
        });

        setPostWidgetDragOverId(null);
        postWidgetDragItemRef.current = null;
    }, []);

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                        <Instagram className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-heading font-bold text-stone-900">Instagram</h1>
                        <p className="text-sm text-stone-500">
                            Insights dashboard · user_id:{' '}
                            <span className="font-semibold">{INSTAGRAM_USER_ID}</span>
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
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
                                <PopoverContent align="start" className="w-auto p-0">
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
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                    <Tabs value={view} onValueChange={(next) => setView(next as 'dashboard' | 'posts')}>
                        <TabsList className="bg-stone-100">
                            <TabsTrigger value="dashboard" className="text-xs">
                                <BarChart3 className="mr-1 h-3 w-3" />
                                Dashboard
                            </TabsTrigger>
                            <TabsTrigger value="posts" className="text-xs">
                                <Grid3X3 className="mr-1 h-3 w-3" />
                                Posts
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <Button asChild variant="outline" size="sm">
                        <Link href="/channels/manual-upload">Upload Data</Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => void loadDashboardData()} disabled={isLoading}>
                        <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
                        Refresh
                    </Button>
                </div>
            </div>

            {errorMessage && (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
                        <p className="text-sm text-red-700">{errorMessage}</p>
                        <Button size="sm" variant="outline" onClick={() => void loadDashboardData()}>
                            Retry
                        </Button>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <InstagramMetricCard
                    label="Views"
                    value={totalViews}
                    change={viewsChange}
                    changeLabel={comparisonLabel}
                    showGlobalValue={isDateRangeActive}
                    globalValue={globalTotalViews}
                    icon={<Eye className="h-5 w-5" />}
                />
                <InstagramMetricCard
                    label="Reach"
                    value={totalReach}
                    change={reachChange}
                    changeLabel={comparisonLabel}
                    showGlobalValue={isDateRangeActive}
                    globalValue={globalTotalReach}
                    icon={<TrendingUp className="h-5 w-5" />}
                />
                <InstagramMetricCard
                    label="Content Interactions"
                    value={totalInteractions}
                    change={interactionsChange}
                    changeLabel={comparisonLabel}
                    showGlobalValue={isDateRangeActive}
                    globalValue={globalTotalInteractions}
                    icon={<MessageSquare className="h-5 w-5" />}
                />
                <InstagramMetricCard
                    label="Follows"
                    value={totalFollows}
                    change={followsChange}
                    changeLabel={comparisonLabel}
                    showGlobalValue={isDateRangeActive}
                    globalValue={globalTotalFollows}
                    icon={<Users className="h-5 w-5" />}
                />
            </div>

            <Card className="border-stone-200">
                <CardContent className="pt-5">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600">
                        <Badge variant="outline">
                            Channel metrics: {seriesForDisplay.filter((series) => series.points.length > 0).length}
                        </Badge>
                        <Badge variant="outline">Post rows: {postsForDisplay.length}</Badge>
                        {lastSyncedAt && <span>Last synced: {lastSyncedAt}</span>}
                    </div>
                </CardContent>
            </Card>

            {view === 'dashboard' ? (
                <>
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-medium text-stone-700">Widget Dashboard</h2>
                        <Sheet open={widgetSheetOpen} onOpenChange={setWidgetSheetOpen}>
                            <SheetTrigger asChild>
                                <Button variant="outline" size="sm" className="text-xs">
                                    <Plus className="mr-1 h-3 w-3" />
                                    Add Widget
                                </Button>
                            </SheetTrigger>
                            <SheetContent className="overflow-hidden">
                                <SheetHeader>
                                    <SheetTitle>Instagram Widgets</SheetTitle>
                                </SheetHeader>
                                <div className="mt-4 flex-1 min-h-0 overflow-y-auto px-2">
                                    <div className="grid grid-cols-1 gap-3 pb-1">
                                        {availableWidgets.length === 0 ? (
                                            <p className="text-sm text-stone-500">
                                                Widget options will appear once metric or post data is available.
                                            </p>
                                        ) : (
                                            availableWidgets.map((widget) => (
                                                <button
                                                    key={widget.id}
                                                    type="button"
                                                    onClick={() => addWidget(widget.id)}
                                                    className="w-full rounded-xl border border-stone-200 bg-white p-3 text-left shadow-sm transition-all hover:border-violet-200 hover:shadow"
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <p className="text-sm font-medium text-stone-800">{widget.title}</p>
                                                            <p className="mt-1 text-xs text-stone-500">{widget.description}</p>
                                                        </div>
                                                        <Badge variant="outline" className="text-[10px]">
                                                            {widget.kind.replace(/-/g, ' ')}
                                                        </Badge>
                                                    </div>
                                                    {renderWidgetPickerPreview(widget)}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>

                    {isLoading ? (
                        <Card>
                            <CardContent className="py-10 text-center text-sm text-stone-500">
                                Loading Instagram insights...
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            {activeWidgets.length === 0 ? (
                                <Card className="col-span-full">
                                    <CardContent className="py-10 text-center text-sm text-stone-500">
                                        No widgets added. Use &ldquo;Add Widget&rdquo; to customize the dashboard.
                                    </CardContent>
                                </Card>
                            ) : (
                                activeWidgets.map(({ template, instance }) => (
                                    <Card
                                        key={instance.instanceId}
                                        draggable
                                        onDragStart={(event) => handleWidgetDragStart(event, instance.instanceId)}
                                        onDragEnd={handleWidgetDragEnd}
                                        onDragOver={(event) => handleWidgetDragOver(event, instance.instanceId)}
                                        onDragLeave={handleWidgetDragLeave}
                                        onDrop={(event) => handleWidgetDrop(event, instance.instanceId)}
                                        className={cn(
                                            'relative cursor-move border-stone-200 transition-colors',
                                            dragOverId === instance.instanceId && 'border-violet-400 bg-violet-50/50',
                                        )}
                                    >
                                        <div className="absolute right-2 top-2 flex items-center gap-1">
                                            <div className="rounded-full p-1 text-stone-400" aria-hidden>
                                                <GripVertical className="h-3.5 w-3.5" />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeWidget(instance.instanceId)}
                                                className="rounded-full p-1 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-500"
                                                aria-label={`Remove ${template.title}`}
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                        <CardHeader className="pb-2 pr-16">
                                            <CardTitle className="text-sm text-stone-800">{template.title}</CardTitle>
                                            <CardDescription className="text-xs">{template.description}</CardDescription>
                                        </CardHeader>
                                        <CardContent>{renderWidget(template, instance)}</CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    )}
                </>
            ) : (
                <>
                    <Tabs value={postsMode} onValueChange={(next) => setPostsMode(next as 'individual' | 'analytics')}>
                        <TabsList className="bg-stone-100">
                            <TabsTrigger value="individual" className="text-xs">
                                <Grid3X3 className="mr-1 h-3 w-3" />
                                Individual Post Analysis
                            </TabsTrigger>
                            <TabsTrigger value="analytics" className="text-xs">
                                <BarChart3 className="mr-1 h-3 w-3" />
                                Post Widgets & Graphs
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {postsMode === 'analytics' ? (
                        isLoading ? (
                            <Card>
                                <CardContent className="py-10 text-center text-sm text-stone-500">
                                    Loading Instagram post analytics...
                                </CardContent>
                            </Card>
                        ) : postsForDisplay.length === 0 ? (
                            <Card>
                                <CardContent className="py-10 text-center text-sm text-stone-500">
                                    No posts available for the selected date range.
                                </CardContent>
                            </Card>
                        ) : (
                            <>
                                <div className="flex items-center justify-between">
                                    <h2 className="flex items-center gap-1.5 text-sm font-medium text-stone-700">
                                        <GripVertical className="h-3.5 w-3.5 text-stone-400" />
                                        Drag post widgets to rearrange
                                    </h2>
                                    <Sheet open={postWidgetSheetOpen} onOpenChange={setPostWidgetSheetOpen}>
                                        <SheetTrigger asChild>
                                            <Button variant="outline" size="sm" className="text-xs">
                                                <Plus className="mr-1 h-3 w-3" />
                                                Add Widget
                                            </Button>
                                        </SheetTrigger>
                                        <SheetContent className="overflow-hidden">
                                            <SheetHeader>
                                                <SheetTitle>Instagram Post Widgets</SheetTitle>
                                            </SheetHeader>
                                            <div className="mt-4 flex-1 min-h-0 overflow-y-auto px-2">
                                                <div className="grid grid-cols-1 gap-3 pb-1">
                                                    {availablePostWidgets.length === 0 ? (
                                                        <p className="text-sm text-stone-500">
                                                            Post widget options will appear once post data is available.
                                                        </p>
                                                    ) : (
                                                        availablePostWidgets.map((widget) => (
                                                            <button
                                                                key={widget.id}
                                                                type="button"
                                                                onClick={() => addPostWidget(widget.id)}
                                                                className="w-full rounded-xl border border-stone-200 bg-white p-3 text-left shadow-sm transition-all hover:border-violet-200 hover:shadow"
                                                            >
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <div>
                                                                        <p className="text-sm font-medium text-stone-800">
                                                                            {widget.title}
                                                                        </p>
                                                                        <p className="mt-1 text-xs text-stone-500">
                                                                            {widget.description}
                                                                        </p>
                                                                    </div>
                                                                    <Badge variant="outline" className="text-[10px]">
                                                                        {widget.kind.replace(/-/g, ' ')}
                                                                    </Badge>
                                                                </div>
                                                                {renderWidgetPickerPreview(widget)}
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        </SheetContent>
                                    </Sheet>
                                </div>

                                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                                    {activePostWidgets.length === 0 ? (
                                        <Card className="col-span-full">
                                            <CardContent className="py-10 text-center text-sm text-stone-500">
                                                No post widgets added. Use &ldquo;Add Widget&rdquo; to customize post analytics.
                                            </CardContent>
                                        </Card>
                                    ) : (
                                        activePostWidgets.map(({ template, instance }) => (
                                            <Card
                                                key={instance.instanceId}
                                                draggable
                                                onDragStart={(event) => handlePostWidgetDragStart(event, instance.instanceId)}
                                                onDragEnd={handlePostWidgetDragEnd}
                                                onDragOver={(event) => handlePostWidgetDragOver(event, instance.instanceId)}
                                                onDragLeave={handlePostWidgetDragLeave}
                                                onDrop={(event) => handlePostWidgetDrop(event, instance.instanceId)}
                                                className={cn(
                                                    'relative cursor-move border-stone-200 transition-colors',
                                                    postWidgetDragOverId === instance.instanceId &&
                                                        'border-violet-400 bg-violet-50/50',
                                                )}
                                            >
                                                <div className="absolute right-2 top-2 flex items-center gap-1">
                                                    <div className="rounded-full p-1 text-stone-400" aria-hidden>
                                                        <GripVertical className="h-3.5 w-3.5" />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removePostWidget(instance.instanceId)}
                                                        className="rounded-full p-1 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-500"
                                                        aria-label={`Remove ${template.title}`}
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                                <CardHeader className="pb-2 pr-16">
                                                    <CardTitle className="text-sm text-stone-800">{template.title}</CardTitle>
                                                    <CardDescription className="text-xs">{template.description}</CardDescription>
                                                </CardHeader>
                                                <CardContent>{renderWidget(template, instance)}</CardContent>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            </>
                        )
                    ) : (
                        <>
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="relative min-w-[220px] flex-1">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
                                    <Input
                                        value={searchQ}
                                        onChange={(event) => setSearchQ(event.target.value)}
                                        placeholder="Fuzzy search by post title, description, ID, type, or account..."
                                        className="pl-9"
                                    />
                                </div>
                                <Select value={typeFilter} onValueChange={setTypeFilter}>
                                    <SelectTrigger className="w-[190px]">
                                        <SelectValue placeholder="Filter post type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {typeOptions.map((typeOption) => (
                                            <SelectItem key={typeOption} value={typeOption}>
                                                {typeOption === 'all' ? 'All post types' : typeOption}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={timeFilter}
                                    onValueChange={(value) => setTimeFilter(value as PostTimeFilter)}
                                >
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Filter time period" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {postTimeFilterOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={sortBy}
                                    onValueChange={(value) =>
                                        setSortBy(value as 'publish_time' | 'total_interactions' | 'views' | 'reach')
                                    }
                                >
                                    <SelectTrigger className="w-[190px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="publish_time">Sort by publish time</SelectItem>
                                        <SelectItem value="total_interactions">Sort by interactions</SelectItem>
                                        <SelectItem value="views">Sort by views</SelectItem>
                                        <SelectItem value="reach">Sort by reach</SelectItem>
                                    </SelectContent>
                                </Select>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant={postView === 'grid' ? 'default' : 'outline'}
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setPostView('grid')}
                                    >
                                        <Grid3X3 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        variant={postView === 'list' ? 'default' : 'outline'}
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setPostView('list')}
                                    >
                                        <List className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>

                            {isLoading ? (
                                <Card>
                                    <CardContent className="py-10 text-center text-sm text-stone-500">
                                        Loading Instagram post insights...
                                    </CardContent>
                                </Card>
                            ) : filteredPosts.length === 0 ? (
                                <Card>
                                    <CardContent className="py-10 text-center text-sm text-stone-500">
                                        No posts found for the current filters.
                                    </CardContent>
                                </Card>
                            ) : postView === 'grid' ? (
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    {filteredPosts.map((post) => (
                                        <Card
                                            key={post.postId}
                                            className="cursor-pointer border-stone-200 transition-shadow hover:shadow-md"
                                            onClick={() => setSelectedPost(post)}
                                        >
                                            <CardContent className="space-y-3 pt-5">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-semibold text-stone-800">
                                                            {post.title}
                                                        </p>
                                                        <p className="text-[11px] text-stone-500">
                                                            {post.publishTime
                                                                ? formatShortDate(post.publishTime)
                                                                : 'Unknown date'}
                                                        </p>
                                                    </div>
                                                    <Badge variant="outline" className="text-[10px]">
                                                        {normalizePostTypeLabel(post.postType)}
                                                    </Badge>
                                                </div>
                                                <p className="line-clamp-3 text-xs text-stone-600">
                                                    {post.description || `Post ID: ${post.postId}`}
                                                </p>

                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    <div className="rounded-md bg-stone-50 px-2 py-1">
                                                        <p className="text-[10px] text-stone-500">Views</p>
                                                        <p className="font-semibold text-stone-800">
                                                            {(post.metrics.views || 0).toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-md bg-stone-50 px-2 py-1">
                                                        <p className="text-[10px] text-stone-500">Reach</p>
                                                        <p className="font-semibold text-stone-800">
                                                            {(post.metrics.reach || 0).toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-md bg-stone-50 px-2 py-1">
                                                        <p className="text-[10px] text-stone-500">Interactions</p>
                                                        <p className="font-semibold text-stone-800">
                                                            {(post.metrics.total_interactions || 0).toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-md bg-stone-50 px-2 py-1">
                                                        <p className="text-[10px] text-stone-500">Follows</p>
                                                        <p className="font-semibold text-stone-800">
                                                            {(post.metrics.follows || 0).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>

                                                {post.permalink && (
                                                    <a
                                                        href={post.permalink}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 text-xs text-violet-700 hover:text-violet-800"
                                                        onClick={(event) => event.stopPropagation()}
                                                    >
                                                        Open permalink
                                                        <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredPosts.map((post) => (
                                        <Card
                                            key={post.postId}
                                            className="cursor-pointer border-stone-200 transition-shadow hover:shadow-md"
                                            onClick={() => setSelectedPost(post)}
                                        >
                                            <CardContent className="py-3">
                                                <div className="flex flex-wrap items-center gap-3 text-sm">
                                                    <Badge variant="outline" className="text-[10px]">
                                                        {normalizePostTypeLabel(post.postType)}
                                                    </Badge>
                                                    <span className="font-medium text-stone-800">{post.title}</span>
                                                    <span className="text-xs text-stone-500">
                                                        {post.publishTime
                                                            ? formatShortDate(post.publishTime)
                                                            : 'Unknown date'}
                                                    </span>
                                                    <span className="ml-auto text-xs text-stone-600">
                                                        {(post.metrics.total_interactions || 0).toLocaleString()} interactions
                                                    </span>
                                                </div>
                                                <p className="mt-2 line-clamp-2 text-xs text-stone-600">
                                                    {post.description || `Post ID: ${post.postId}`}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            <Dialog open={selectedPost !== null} onOpenChange={(open) => !open && setSelectedPost(null)}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="text-base">
                            {selectedPost ? selectedPost.title : 'Post Details'}
                        </DialogTitle>
                    </DialogHeader>

                    {selectedPost && (
                        <div className="space-y-4">
                            <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline">{normalizePostTypeLabel(selectedPost.postType)}</Badge>
                                    <span className="text-xs text-stone-500">
                                        {selectedPost.publishTime
                                            ? formatShortDate(selectedPost.publishTime)
                                            : 'Unknown date'}
                                    </span>
                                    <span className="text-xs text-stone-400">ID: {selectedPost.postId}</span>
                                </div>
                                <p className="mt-2 text-sm text-stone-700">
                                    {selectedPost.description || 'No description available for this post.'}
                                </p>
                                {selectedPost.permalink && (
                                    <a
                                        href={selectedPost.permalink}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-2 inline-flex items-center gap-1 text-xs text-violet-700 hover:text-violet-800"
                                    >
                                        Open permalink
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                )}
                            </div>

                            <Separator />

                            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                                {Object.entries(selectedPost.metrics)
                                    .sort(([metricA], [metricB]) => metricA.localeCompare(metricB))
                                    .map(([metricKey, metricValue]) => {
                                        const icon =
                                            metricKey === 'likes' ? (
                                                <Heart className="h-3.5 w-3.5 text-pink-600" />
                                            ) : metricKey === 'comments' ? (
                                                <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                                            ) : metricKey === 'shares' ? (
                                                <Share2 className="h-3.5 w-3.5 text-emerald-600" />
                                            ) : metricKey === 'saved' ? (
                                                <Bookmark className="h-3.5 w-3.5 text-violet-600" />
                                            ) : metricKey === 'views' ? (
                                                <Eye className="h-3.5 w-3.5 text-indigo-600" />
                                            ) : null;

                                        return (
                                            <div
                                                key={metricKey}
                                                className="rounded-md border border-stone-200 bg-white px-2 py-2"
                                            >
                                                <div className="mb-1 flex items-center gap-1 text-[11px] text-stone-500">
                                                    {icon}
                                                    <span>{formatMetricLabel(metricKey)}</span>
                                                </div>
                                                <p className="text-sm font-semibold text-stone-800">
                                                    {metricValue.toLocaleString()}
                                                </p>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
