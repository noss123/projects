'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    BarChart3,
    CalendarDays,
    ExternalLink,
    Eye,
    Grid3X3,
    GripVertical,
    Heart,
    Linkedin,
    List,
    MessageSquare,
    Plus,
    RefreshCw,
    Search,
    Share2,
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
    fetchLinkedInDashboardLayout,
    saveLinkedInDashboardLayout,
    type InstagramDashboardLayoutWidget,
} from '@/lib/api/manual-insights-api';
import { cn } from '@/lib/utils';

const API_BASE =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) ||
    'http://localhost:8000';
const LINKEDIN_ORG_ID = 'ClubArtizen';
const CHANNEL_METRICS = [
    'impressions_organic',
    'impressions_sponsored',
    'impressions_total',
    'unique_impressions_organic',
    'clicks_organic',
    'clicks_sponsored',
    'clicks_total',
    'reactions_organic',
    'reactions_sponsored',
    'reactions_total',
    'comments_organic',
    'comments_sponsored',
    'comments_total',
    'reposts_organic',
    'reposts_sponsored',
    'reposts_total',
    'engagement_rate_organic',
    'engagement_rate_sponsored',
    'engagement_rate_total',
] as const;

const METRIC_LABELS: Record<string, string> = {
    impressions_organic: 'Impressions (Organic)',
    impressions_sponsored: 'Impressions (Sponsored)',
    impressions_total: 'Impressions (Total)',
    unique_impressions_organic: 'Unique Impressions (Organic)',
    clicks_organic: 'Clicks (Organic)',
    clicks_sponsored: 'Clicks (Sponsored)',
    clicks_total: 'Clicks (Total)',
    reactions_organic: 'Reactions (Organic)',
    reactions_sponsored: 'Reactions (Sponsored)',
    reactions_total: 'Reactions (Total)',
    comments_organic: 'Comments (Organic)',
    comments_sponsored: 'Comments (Sponsored)',
    comments_total: 'Comments (Total)',
    reposts_organic: 'Reposts (Organic)',
    reposts_sponsored: 'Reposts (Sponsored)',
    reposts_total: 'Reposts (Total)',
    engagement_rate_organic: 'Engagement Rate (Organic)',
    engagement_rate_sponsored: 'Engagement Rate (Sponsored)',
    engagement_rate_total: 'Engagement Rate (Total)',
    impressions: 'Impressions',
    views: 'Views',
    offsite_views: 'Offsite Views',
    clicks: 'Clicks',
    click_through_rate: 'Click Through Rate',
    likes: 'Likes',
    comments: 'Comments',
    reposts: 'Reposts',
    follows: 'Follows',
    total_interactions: 'Total Interactions',
};

const METRIC_COLORS: Record<string, string> = {
    impressions_total: '#0A66C2',
    clicks_total: '#378FE9',
    reactions_total: '#004182',
    comments_total: '#5E9DD7',
    reposts_total: '#66A3E0',
    engagement_rate_total: '#82B9EA',
    impressions: '#0A66C2',
    clicks: '#378FE9',
    likes: '#004182',
    comments: '#5E9DD7',
    reposts: '#66A3E0',
    total_interactions: '#0B5CAD',
};

const PIE_COLORS = ['#0A66C2', '#004182', '#378FE9', '#5E9DD7', '#66A3E0', '#82B9EA', '#A6D0F5'];
const POST_TYPE_GROWTH_METRIC_OPTIONS = [
    { value: 'total_interactions', label: 'Interactions' },
    { value: 'impressions', label: 'Impressions' },
    { value: 'clicks', label: 'Clicks' },
    { value: 'engagement_rate', label: 'Engagement Rate' },
    { value: 'views', label: 'Views' },
    { value: 'click_through_rate', label: 'Click Through Rate' },
    { value: 'offsite_views', label: 'Offsite Views' },
    { value: 'likes', label: 'Likes' },
    { value: 'comments', label: 'Comments' },
    { value: 'reposts', label: 'Reposts' },
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
    li_org_id?: string;
    title?: string;
    post_link?: string;
    content_type?: string;
    account_id?: string;
    account_username?: string;
    account_name?: string;
    description?: string;
    post_type?: string;
    created_date?: string;
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

interface LinkedInPostRecord {
    postId: string;
    title: string;
    description: string | null;
    liOrgId: string | null;
    accountId: string | null;
    accountUsername: string | null;
    accountName: string | null;
    postType: string;
    contentType: string;
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
    | 'content-type-distribution'
    | 'top-posts'
    | 'top-posts-by-content-type'
    | 'post-engagement'
    | 'post-impressions-vs-clicks'
    | 'post-metric-trend'
    | 'post-metric-trend-by-content-type'
    | 'post-type-metric-overlay'
    | 'content-type-metric-overlay';

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
    contentType?: string;
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
    'content-type-distribution',
    'top-posts',
    'top-posts-by-content-type',
    'post-engagement',
    'post-impressions-vs-clicks',
    'post-metric-trend',
    'post-metric-trend-by-content-type',
    'post-type-metric-overlay',
    'content-type-metric-overlay',
]);
const AGGREGATE_POST_TYPE = 'all';
const AGGREGATE_CONTENT_TYPE = 'all';

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
    return METRIC_COLORS[metricKey] || '#0A66C2';
}

function sortByPublishTimeDescending(a: LinkedInPostRecord, b: LinkedInPostRecord): number {
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
    const reposts = metrics.reposts || 0;
    return likes + comments + reposts;
}

function hasNumericMetric(metrics: Record<string, number>, metricKey: string): boolean {
    return typeof metrics[metricKey] === 'number' && Number.isFinite(metrics[metricKey]);
}

function getPostMetricValue(post: LinkedInPostRecord, metricKey: PostMetricKey): number | null {
    if (metricKey === 'total_interactions') {
        if (hasNumericMetric(post.metrics, 'total_interactions')) {
            return post.metrics.total_interactions;
        }

        const hasInteractionParts = ['likes', 'comments', 'reposts'].some((key) =>
            hasNumericMetric(post.metrics, key),
        );
        if (!hasInteractionParts) return null;
        return deriveTotalInteractions(post.metrics);
    }
    return hasNumericMetric(post.metrics, metricKey) ? post.metrics[metricKey] : null;
}

function rankPostsByMetric(posts: LinkedInPostRecord[], metricKey: PostMetricKey, limit = 8): LinkedInPostRecord[] {
    return posts
        .map((post) => ({
            post,
            value: getPostMetricValue(post, metricKey),
        }))
        .filter((item): item is { post: LinkedInPostRecord; value: number } => item.value !== null)
        .sort((a, b) => b.value - a.value)
        .slice(0, limit)
        .map((item) => item.post);
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

function normalizeWidgetContentType(value: string | undefined, availableContentTypes: string[]): string {
    if (!value || !availableContentTypes.includes(value)) return AGGREGATE_CONTENT_TYPE;
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
    if (typeof instance.config.contentType === 'string') config.contentType = instance.config.contentType;

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
        if (typeof metricsConfig.contentType === 'string') {
            config.contentType = metricsConfig.contentType;
        }
    }

    return {
        instanceId,
        widgetId,
        config,
    };
}

function buildPostMetricTrendData(posts: LinkedInPostRecord[], metricKey: PostMetricKey) {
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
        const metricValue = getPostMetricValue(post, metricKey);
        if (metricValue === null) continue;

        const dateKey = publishDate.toISOString().slice(0, 10);
        const existing = byDate.get(dateKey) || {
            value: 0,
            sortValue: publishDate.getTime(),
            dateLabel: formatDateWithYear(publishDate),
        };
        existing.value += metricValue;
        byDate.set(dateKey, existing);
    }

    return Array.from(byDate.values())
        .sort((a, b) => a.sortValue - b.sortValue)
        .map((row) => ({
            date: row.dateLabel,
            value: Math.round(row.value),
        }));
}

function buildPostTypeMetricOverlayData(posts: LinkedInPostRecord[], metricKey: PostMetricKey): {
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
        const metricValue = getPostMetricValue(post, metricKey);
        if (metricValue === null) continue;

        const dateKey = publishDate.toISOString().slice(0, 10);
        const normalizedPostType = normalizePostTypeLabel(post.postType);
        const existing = byDate.get(dateKey) || {
            sortValue: publishDate.getTime(),
            dateLabel: formatDateWithYear(publishDate),
            valuesByPostType: {},
        };

        existing.valuesByPostType[normalizedPostType] =
            (existing.valuesByPostType[normalizedPostType] || 0) + metricValue;

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

function buildContentTypeMetricOverlayData(posts: LinkedInPostRecord[], metricKey: PostMetricKey): {
    data: Array<Record<string, string | number>>;
    series: Array<{ contentType: string; dataKey: string; color: string }>;
} {
    const byDate = new Map<
        string,
        {
            sortValue: number;
            dateLabel: string;
            valuesByContentType: Record<string, number>;
        }
    >();
    const contentTypes = new Set<string>();

    for (const post of posts) {
        if (!post.publishTime) continue;
        const publishDate = parseDate(post.publishTime);
        if (!publishDate) continue;
        const metricValue = getPostMetricValue(post, metricKey);
        if (metricValue === null) continue;

        const dateKey = publishDate.toISOString().slice(0, 10);
        const normalizedContentType = normalizeContentTypeLabel(post.contentType);
        const existing = byDate.get(dateKey) || {
            sortValue: publishDate.getTime(),
            dateLabel: formatDateWithYear(publishDate),
            valuesByContentType: {},
        };

        existing.valuesByContentType[normalizedContentType] =
            (existing.valuesByContentType[normalizedContentType] || 0) + metricValue;

        byDate.set(dateKey, existing);
        contentTypes.add(normalizedContentType);
    }

    const series = Array.from(contentTypes)
        .sort((a, b) => a.localeCompare(b))
        .map((contentType, index) => ({
            contentType,
            dataKey: `content_type_${index}`,
            color: PIE_COLORS[index % PIE_COLORS.length],
        }));

    const data = Array.from(byDate.values())
        .sort((a, b) => a.sortValue - b.sortValue)
        .map((row) => {
            const chartRow: Record<string, string | number> = {
                date: row.dateLabel,
            };

            for (const seriesItem of series) {
                chartRow[seriesItem.dataKey] = Math.round(row.valuesByContentType[seriesItem.contentType] || 0);
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

function parsePostRecords(payload: ManualPostInsightsResponse): LinkedInPostRecord[] {
    const data = Array.isArray(payload.data) ? payload.data : [];
    const records: LinkedInPostRecord[] = [];

    for (const item of data) {
        if (!item || typeof item.post_id !== 'string') continue;
        const insights = Array.isArray(item.insights) ? item.insights : [];
        const metrics: Record<string, number> = {};
        const description = normalizeDescriptionText(
            typeof item.description === 'string'
                ? item.description
                : typeof item.title === 'string'
                  ? item.title
                  : null,
        );
        const title = derivePostTitle(
            typeof item.title === 'string' ? item.title : description,
            item.post_id,
        );

        for (const insight of insights) {
            if (!insight || typeof insight.name !== 'string') continue;
            const values = Array.isArray(insight.values) ? insight.values : [];
            const numeric = values.length > 0 ? toNumber(values[0].value) : null;
            if (numeric === null) continue;
            metrics[insight.name] = numeric;
        }

        if (['likes', 'comments', 'reposts'].some((key) => hasNumericMetric(metrics, key))) {
            metrics.total_interactions = deriveTotalInteractions(metrics);
        }

        records.push({
            postId: item.post_id,
            title,
            description,
            liOrgId: typeof item.li_org_id === 'string' ? item.li_org_id : null,
            accountId: typeof item.account_id === 'string' ? item.account_id : null,
            accountUsername: typeof item.account_username === 'string' ? item.account_username : null,
            accountName: typeof item.account_name === 'string' ? item.account_name : null,
            postType: typeof item.post_type === 'string' ? item.post_type : 'Unknown',
            contentType: normalizeContentTypeLabel(
                typeof item.content_type === 'string' ? item.content_type : null,
            ),
            publishTime:
                typeof item.created_date === 'string'
                    ? item.created_date
                    : typeof item.publish_time === 'string'
                      ? item.publish_time
                      : null,
            permalink:
                typeof item.post_link === 'string'
                    ? item.post_link
                    : typeof item.permalink === 'string'
                      ? item.permalink
                      : null,
            metrics,
        });
    }

    return records.sort(sortByPublishTimeDescending);
}

function buildWidgetCatalog(series: MetricSeries[], posts: LinkedInPostRecord[]): DashboardWidget[] {
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
            description: `Daily ${metricSeries.label.toLowerCase()} values for ${LINKEDIN_ORG_ID}.`,
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
            id: 'content-type-distribution',
            title: 'Content Type Distribution',
            description: 'Count of imported posts by content type.',
            kind: 'content-type-distribution',
        });

        widgets.push({
            id: 'top-posts',
            title: 'Top Posts',
            description: 'Posts ranked by selected metric.',
            kind: 'top-posts',
        });

        widgets.push({
            id: 'top-posts-by-content-type',
            title: 'Top Posts by Content Type',
            description: 'Posts ranked by selected metric with content type filtering.',
            kind: 'top-posts-by-content-type',
        });

        widgets.push({
            id: 'post-metric-trend',
            title: 'Post Metric Over Time',
            description: 'Pick a post metric and track how it changes over publish dates.',
            kind: 'post-metric-trend',
        });

        widgets.push({
            id: 'post-metric-trend-by-content-type',
            title: 'Content Type Metric Over Time',
            description: 'Pick a post metric and track trend by content type.',
            kind: 'post-metric-trend-by-content-type',
        });

        const hasEngagementBreakdown = posts.some(
            (post) =>
                post.metrics.likes ||
                post.metrics.comments ||
                post.metrics.reposts,
        );
        if (hasEngagementBreakdown) {
            widgets.push({
                id: 'post-engagement',
                title: 'Post Engagement Breakdown',
                description: 'Aggregate likes, comments, and reposts from post insights.',
                kind: 'post-engagement',
            });
        }

        const hasImpressionsOrClicks = posts.some(
            (post) => getPostMetricValue(post, 'impressions') !== null || getPostMetricValue(post, 'clicks') !== null,
        );
        if (hasImpressionsOrClicks) {
            widgets.push({
                id: 'post-impressions-vs-clicks',
                title: 'Post Impressions vs Clicks',
                description: 'Top posts comparison for impressions and clicks.',
                kind: 'post-impressions-vs-clicks',
            });
        }

        widgets.push({
            id: 'post-type-metric-overlay',
            title: 'Post Type Metric Comparison',
            description: 'Compare all post types on one trend graph for the selected post metric.',
            kind: 'post-type-metric-overlay',
        });

        widgets.push({
            id: 'content-type-metric-overlay',
            title: 'Content Type Metric Comparison',
            description: 'Compare all content types on one trend graph for the selected post metric.',
            kind: 'content-type-metric-overlay',
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

function LinkedInMetricCard({
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
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

function normalizeContentTypeLabel(contentType: string | null | undefined): string {
    if (typeof contentType !== 'string') return 'Other';
    const normalized = contentType.trim();
    if (!normalized) return 'Other';
    if (normalized.toLowerCase() === 'na') return 'Other';
    return normalized || 'Other';
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

function fuzzyMatchesPostQuery(post: LinkedInPostRecord, query: string): boolean {
    const normalizedQuery = normalizeFuzzyText(query);
    if (!normalizedQuery) return true;

    const searchableText = normalizeFuzzyText(
        [
            post.postId,
            post.title,
            post.description || '',
            post.postType,
            post.contentType,
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

function isPostWithinTimeRange(post: LinkedInPostRecord, timeFilter: PostTimeFilter): boolean {
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

export default function LinkedInPage() {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

    const [metricSeries, setMetricSeries] = useState<MetricSeries[]>([]);
    const [posts, setPosts] = useState<LinkedInPostRecord[]>([]);

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
    const [sortBy, setSortBy] = useState<'publish_time' | 'total_interactions' | 'impressions' | 'clicks'>(
        'publish_time',
    );
    const postGrowthMetricKey: PostMetricKey = 'total_interactions';
    const [postView, setPostView] = useState<'grid' | 'list'>('grid');
    const [selectedPost, setSelectedPost] = useState<LinkedInPostRecord | null>(null);
    const dashboardLayoutUserId = user?.id || LINKEDIN_ORG_ID;

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
                    `/manual/linkedin/insights/${encodeURIComponent(LINKEDIN_ORG_ID)}?${metricParams.toString()}`,
                ),
                fetchJson<ManualPostInsightsResponse>(
                    `/manual/linkedin/posts/${encodeURIComponent(LINKEDIN_ORG_ID)}/insights?period=lifetime`,
                ),
            ]);

            setMetricSeries(parseChannelMetricSeries(insightsPayload));
            setPosts(parsePostRecords(postInsightsPayload));
            setLastSyncedAt(new Date().toLocaleString());
        } catch (error) {
            setErrorMessage((error as Error).message || 'Failed to load LinkedIn insights.');
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
                const payload = await fetchLinkedInDashboardLayout(LINKEDIN_ORG_ID, dashboardLayoutUserId);
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
    const widgetContentTypeOptions = useMemo(
        () => [
            AGGREGATE_CONTENT_TYPE,
            ...Array.from(new Set(postsForDisplay.map((post) => normalizeContentTypeLabel(post.contentType)))),
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

            if (
                widget.kind === 'top-posts-by-content-type' ||
                widget.kind === 'post-metric-trend-by-content-type' ||
                widget.kind === 'content-type-metric-overlay'
            ) {
                return {
                    postMetricKey: postGrowthMetricKey,
                    contentType: AGGREGATE_CONTENT_TYPE,
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

            if (
                widget.kind === 'top-posts-by-content-type' ||
                widget.kind === 'post-metric-trend-by-content-type' ||
                widget.kind === 'content-type-metric-overlay'
            ) {
                return {
                    postMetricKey: normalizePostMetricKey(config.postMetricKey, postGrowthMetricKey),
                    contentType: normalizeWidgetContentType(config.contentType, widgetContentTypeOptions),
                };
            }

            return {};
        },
        [channelMetricOptions, postGrowthMetricKey, widgetPostTypeOptions, widgetContentTypeOptions],
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
            void saveLinkedInDashboardLayout({
                liOrgId: LINKEDIN_ORG_ID,
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

    const contentTypeDistribution = useMemo(() => {
        const counts = new Map<string, number>();
        postsForDisplay.forEach((post) => {
            const key = normalizeContentTypeLabel(post.contentType);
            counts.set(key, (counts.get(key) || 0) + 1);
        });
        return Array.from(counts.entries()).map(([contentType, count]) => ({ contentType, count }));
    }, [postsForDisplay]);

    const topPostsByImpressions = useMemo(
        () => rankPostsByMetric(postsForDisplay, 'impressions'),
        [postsForDisplay],
    );

    const postEngagementBreakdown = useMemo(
        () => [
            { metric: 'Likes', value: postTotalsForDisplay.likes || 0 },
            { metric: 'Comments', value: postTotalsForDisplay.comments || 0 },
            { metric: 'Reposts', value: postTotalsForDisplay.reposts || 0 },
        ],
        [postTotalsForDisplay],
    );

    const postImpressionsVsClicks = useMemo(
        () =>
            topPostsByImpressions
                .slice(0, 8)
                .map((post) => ({
                    postId: post.postId.slice(-6),
                    impressions: getPostMetricValue(post, 'impressions') || 0,
                    clicks: getPostMetricValue(post, 'clicks') || 0,
                }))
                .filter((row) => row.impressions > 0 || row.clicks > 0),
        [topPostsByImpressions],
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
            const leftValue = b.metrics[sortBy];
            const rightValue = a.metrics[sortBy];
            const leftHasValue = typeof leftValue === 'number' && Number.isFinite(leftValue);
            const rightHasValue = typeof rightValue === 'number' && Number.isFinite(rightValue);
            if (!leftHasValue && !rightHasValue) return 0;
            if (!leftHasValue) return 1;
            if (!rightHasValue) return -1;
            return leftValue - rightValue;
        });

        return result;
    }, [postsForDisplay, typeFilter, timeFilter, searchQ, sortBy]);

    const globalImpressionsSeries = allSeriesByKey.get('impressions_total');
    const globalClicksSeries = allSeriesByKey.get('clicks_total');
    const globalReactionsSeries = allSeriesByKey.get('reactions_total');
    const globalCommentsSeries = allSeriesByKey.get('comments_total');

    const impressionsSeries = seriesByKey.get('impressions_total');
    const clicksSeries = seriesByKey.get('clicks_total');
    const reactionsSeries = seriesByKey.get('reactions_total');
    const commentsSeries = seriesByKey.get('comments_total');

    const globalTotalImpressions = globalImpressionsSeries
        ? Math.round(globalImpressionsSeries.total)
        : Math.round(postTotals.impressions || 0);
    const globalTotalClicks = globalClicksSeries
        ? Math.round(globalClicksSeries.total)
        : Math.round(postTotals.clicks || 0);
    const globalTotalReactions = globalReactionsSeries
        ? Math.round(globalReactionsSeries.total)
        : Math.round(postTotals.likes || 0);
    const globalTotalComments = globalCommentsSeries
        ? Math.round(globalCommentsSeries.total)
        : Math.round(postTotals.comments || 0);

    const selectedRangeTotalImpressions = impressionsSeries
        ? Math.round(impressionsSeries.total)
        : Math.round(postTotalsForDisplay.impressions || 0);
    const selectedRangeTotalClicks = clicksSeries
        ? Math.round(clicksSeries.total)
        : Math.round(postTotalsForDisplay.clicks || 0);
    const selectedRangeTotalReactions = reactionsSeries
        ? Math.round(reactionsSeries.total)
        : Math.round(postTotalsForDisplay.likes || 0);
    const selectedRangeTotalComments = commentsSeries
        ? Math.round(commentsSeries.total)
        : Math.round(postTotalsForDisplay.comments || 0);

    const totalImpressions = isDateRangeActive ? selectedRangeTotalImpressions : globalTotalImpressions;
    const totalClicks = isDateRangeActive ? selectedRangeTotalClicks : globalTotalClicks;
    const totalReactions = isDateRangeActive ? selectedRangeTotalReactions : globalTotalReactions;
    const totalComments = isDateRangeActive ? selectedRangeTotalComments : globalTotalComments;

    const comparisonLabel = isDateRangeActive ? 'vs previous equal range' : 'vs previous day';

    const impressionsChange = globalImpressionsSeries
        ? getMetricChange(
              globalImpressionsSeries.points,
              impressionsSeries ? impressionsSeries.points : [],
              selectedDateRange,
          )
        : undefined;
    const clicksChange = globalClicksSeries
        ? getMetricChange(globalClicksSeries.points, clicksSeries ? clicksSeries.points : [], selectedDateRange)
        : undefined;
    const reactionsChange = globalReactionsSeries
        ? getMetricChange(
              globalReactionsSeries.points,
              reactionsSeries ? reactionsSeries.points : [],
              selectedDateRange,
          )
        : undefined;
    const commentsChange = globalCommentsSeries
        ? getMetricChange(globalCommentsSeries.points, commentsSeries ? commentsSeries.points : [], selectedDateRange)
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
                        No channelwise metric rows available for {LINKEDIN_ORG_ID}.
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
                            <Bar dataKey="total" fill="#0A66C2" radius={[6, 6, 0, 0]} />
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
                                <Scatter data={scatterData} fill="#0A66C2" />
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

        if (widget.kind === 'content-type-distribution') {
            if (contentTypeDistribution.length === 0) {
                return <p className="text-xs text-stone-400">No content-type rows available.</p>;
            }

            return (
                <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={contentTypeDistribution}
                                dataKey="count"
                                nameKey="contentType"
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={85}
                                labelLine={false}
                            >
                                {contentTypeDistribution.map((item, index) => (
                                    <Cell key={`${item.contentType}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
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

                    {rankedPosts.slice(0, 6).map((post) => {
                        const postMetricValue = getPostMetricValue(post, selectedMetricKey);
                        return (
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
                                        {postMetricValue === null
                                            ? 'NA'
                                            : Math.round(postMetricValue).toLocaleString()}
                                    </p>
                                    <p className="text-[11px] text-stone-500">
                                        {selectedMetricLabel.toLowerCase()}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            );
        }

        if (widget.kind === 'top-posts-by-content-type') {
            const selectedMetricKey = normalizePostMetricKey(widgetInstance.config.postMetricKey, postGrowthMetricKey);
            const selectedMetricLabel =
                POST_TYPE_GROWTH_METRIC_OPTIONS.find((option) => option.value === selectedMetricKey)?.label ||
                formatMetricLabel(selectedMetricKey);
            const selectedContentType = normalizeWidgetContentType(
                widgetInstance.config.contentType,
                widgetContentTypeOptions,
            );
            const selectedContentTypeLabel =
                selectedContentType === AGGREGATE_CONTENT_TYPE ? 'All content types (Aggregate)' : selectedContentType;
            const postsForWidget =
                selectedContentType === AGGREGATE_CONTENT_TYPE
                    ? postsForDisplay
                    : postsForDisplay.filter(
                          (post) => normalizeContentTypeLabel(post.contentType) === selectedContentType,
                      );
            const rankedPosts = rankPostsByMetric(postsForWidget, selectedMetricKey);

            if (rankedPosts.length === 0) {
                return (
                    <p className="text-xs text-stone-400">
                        No post ranking data available for {selectedContentTypeLabel.toLowerCase()}.
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
                            value={selectedContentType}
                            onValueChange={(value) =>
                                updateWidgetConfig(widgetInstance.instanceId, {
                                    contentType: value,
                                })
                            }
                        >
                            <SelectTrigger className="h-8 w-[220px] text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {widgetContentTypeOptions.map((contentTypeOption) => (
                                    <SelectItem key={contentTypeOption} value={contentTypeOption}>
                                        {contentTypeOption === AGGREGATE_CONTENT_TYPE
                                            ? 'All content types (Aggregate)'
                                            : contentTypeOption}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {rankedPosts.slice(0, 6).map((post) => {
                        const postMetricValue = getPostMetricValue(post, selectedMetricKey);
                        return (
                            <button
                                key={post.postId}
                                type="button"
                                onClick={() => setSelectedPost(post)}
                                className="flex w-full items-center justify-between rounded-md border border-stone-100 bg-stone-50 px-3 py-2 text-left transition-colors hover:bg-stone-100"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-xs font-medium text-stone-800">{post.title}</p>
                                    <p className="text-[11px] text-stone-500">
                                        {normalizeContentTypeLabel(post.contentType)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-semibold text-stone-800">
                                        {postMetricValue === null
                                            ? 'NA'
                                            : Math.round(postMetricValue).toLocaleString()}
                                    </p>
                                    <p className="text-[11px] text-stone-500">
                                        {selectedMetricLabel.toLowerCase()}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
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

        if (widget.kind === 'post-metric-trend-by-content-type') {
            const selectedMetricKey = normalizePostMetricKey(widgetInstance.config.postMetricKey, postGrowthMetricKey);
            const selectedMetricLabel =
                POST_TYPE_GROWTH_METRIC_OPTIONS.find((option) => option.value === selectedMetricKey)?.label ||
                formatMetricLabel(selectedMetricKey);
            const selectedContentType = normalizeWidgetContentType(
                widgetInstance.config.contentType,
                widgetContentTypeOptions,
            );
            const selectedContentTypeLabel =
                selectedContentType === AGGREGATE_CONTENT_TYPE ? 'All content types (Aggregate)' : selectedContentType;
            const postsForWidget =
                selectedContentType === AGGREGATE_CONTENT_TYPE
                    ? postsForDisplay
                    : postsForDisplay.filter(
                          (post) => normalizeContentTypeLabel(post.contentType) === selectedContentType,
                      );
            const trendData = buildPostMetricTrendData(postsForWidget, selectedMetricKey);

            if (trendData.length === 0) {
                return (
                    <p className="text-xs text-stone-400">
                        No publish-time trend data available for {selectedMetricLabel.toLowerCase()} in{' '}
                        {selectedContentTypeLabel.toLowerCase()}.
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
                            value={selectedContentType}
                            onValueChange={(value) =>
                                updateWidgetConfig(widgetInstance.instanceId, {
                                    contentType: value,
                                })
                            }
                        >
                            <SelectTrigger className="h-8 w-[220px] text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {widgetContentTypeOptions.map((contentTypeOption) => (
                                    <SelectItem key={contentTypeOption} value={contentTypeOption}>
                                        {contentTypeOption === AGGREGATE_CONTENT_TYPE
                                            ? 'All content types (Aggregate)'
                                            : contentTypeOption}
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

        if (widget.kind === 'content-type-metric-overlay') {
            const selectedMetricKey = normalizePostMetricKey(widgetInstance.config.postMetricKey, postGrowthMetricKey);
            const selectedMetricLabel =
                POST_TYPE_GROWTH_METRIC_OPTIONS.find((option) => option.value === selectedMetricKey)?.label ||
                formatMetricLabel(selectedMetricKey);
            const overlayData = buildContentTypeMetricOverlayData(postsForDisplay, selectedMetricKey);

            if (overlayData.data.length === 0 || overlayData.series.length === 0) {
                return (
                    <p className="text-xs text-stone-400">
                        No publish-time content-type comparison data available for {selectedMetricLabel.toLowerCase()}.
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
                                        name={seriesItem.contentType}
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
                return <p className="text-xs text-stone-400">No likes/comments/reposts data available.</p>;
            }

            return (
                <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={postEngagementBreakdown}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                            <XAxis dataKey="metric" tick={{ fontSize: 10, fill: '#78716C' }} />
                            <YAxis tick={{ fontSize: 10, fill: '#78716C' }} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#004182" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            );
        }

        if (widget.kind === 'post-impressions-vs-clicks') {
            if (postImpressionsVsClicks.length === 0) {
                return <p className="text-xs text-stone-400">No impressions/clicks data available for posts.</p>;
            }

            return (
                <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={postImpressionsVsClicks}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                            <XAxis dataKey="postId" tick={{ fontSize: 10, fill: '#78716C' }} />
                            <YAxis tick={{ fontSize: 10, fill: '#78716C' }} />
                            <Tooltip />
                            <Bar dataKey="impressions" fill="#0A66C2" radius={[6, 6, 0, 0]} />
                            <Bar dataKey="clicks" fill="#378FE9" radius={[6, 6, 0, 0]} />
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
                <div className="h-10 rounded bg-gradient-to-r from-blue-100 via-blue-50 to-white" />
            ) : widget.kind === 'metric-scatter-compare' ? (
                <div className="grid grid-cols-2 gap-1">
                    <div className="h-8 rounded bg-blue-100" />
                    <div className="h-8 rounded bg-blue-100" />
                </div>
            ) : widget.kind === 'post-type-distribution' || widget.kind === 'content-type-distribution' ? (
                <div className="grid grid-cols-3 gap-1">
                    <div className="h-8 rounded-full bg-blue-100" />
                    <div className="h-8 rounded-full bg-blue-100" />
                    <div className="h-8 rounded-full bg-sky-100" />
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
                    <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                        <Linkedin className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-heading font-bold text-stone-900">LinkedIn</h1>
                        <p className="text-sm text-stone-500">
                            Insights dashboard · user_id:{' '}
                            <span className="font-semibold">{LINKEDIN_ORG_ID}</span>
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
                                        <CalendarDays className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
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
                                                'h-9 w-9 rounded-md text-sm text-stone-700 transition-colors hover:bg-blue-50',
                                            selected:
                                                'bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white',
                                            range_start:
                                                'bg-blue-600 text-white hover:bg-blue-600 hover:text-white',
                                            range_end:
                                                'bg-blue-600 text-white hover:bg-blue-600 hover:text-white',
                                            range_middle: 'bg-blue-100 text-blue-900',
                                            outside: 'text-stone-300',
                                            today: 'font-semibold text-blue-700',
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
                <LinkedInMetricCard
                    label="Impressions (Total)"
                    value={totalImpressions}
                    change={impressionsChange}
                    changeLabel={comparisonLabel}
                    showGlobalValue={isDateRangeActive}
                    globalValue={globalTotalImpressions}
                    icon={<Eye className="h-5 w-5" />}
                />
                <LinkedInMetricCard
                    label="Clicks (Total)"
                    value={totalClicks}
                    change={clicksChange}
                    changeLabel={comparisonLabel}
                    showGlobalValue={isDateRangeActive}
                    globalValue={globalTotalClicks}
                    icon={<ExternalLink className="h-5 w-5" />}
                />
                <LinkedInMetricCard
                    label="Reactions (Total)"
                    value={totalReactions}
                    change={reactionsChange}
                    changeLabel={comparisonLabel}
                    showGlobalValue={isDateRangeActive}
                    globalValue={globalTotalReactions}
                    icon={<Heart className="h-5 w-5" />}
                />
                <LinkedInMetricCard
                    label="Comments (Total)"
                    value={totalComments}
                    change={commentsChange}
                    changeLabel={comparisonLabel}
                    showGlobalValue={isDateRangeActive}
                    globalValue={globalTotalComments}
                    icon={<MessageSquare className="h-5 w-5" />}
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
                                    <SheetTitle>LinkedIn Widgets</SheetTitle>
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
                                                    className="w-full rounded-xl border border-stone-200 bg-white p-3 text-left shadow-sm transition-all hover:border-blue-200 hover:shadow"
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
                                Loading LinkedIn insights...
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
                                            dragOverId === instance.instanceId && 'border-blue-400 bg-blue-50/50',
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
                                    Loading LinkedIn post analytics...
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
                                                <SheetTitle>LinkedIn Post Widgets</SheetTitle>
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
                                                                className="w-full rounded-xl border border-stone-200 bg-white p-3 text-left shadow-sm transition-all hover:border-blue-200 hover:shadow"
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
                                                        'border-blue-400 bg-blue-50/50',
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
                                        setSortBy(value as 'publish_time' | 'total_interactions' | 'impressions' | 'clicks')
                                    }
                                >
                                    <SelectTrigger className="w-[190px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="publish_time">Sort by publish time</SelectItem>
                                        <SelectItem value="total_interactions">Sort by interactions</SelectItem>
                                        <SelectItem value="impressions">Sort by impressions</SelectItem>
                                        <SelectItem value="clicks">Sort by clicks</SelectItem>
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
                                        Loading LinkedIn post insights...
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
                                                        <p className="text-[10px] text-stone-500">Impressions</p>
                                                        <p className="font-semibold text-stone-800">
                                                            {hasNumericMetric(post.metrics, 'impressions')
                                                                ? post.metrics.impressions.toLocaleString()
                                                                : 'NA'}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-md bg-stone-50 px-2 py-1">
                                                        <p className="text-[10px] text-stone-500">Clicks</p>
                                                        <p className="font-semibold text-stone-800">
                                                            {hasNumericMetric(post.metrics, 'clicks')
                                                                ? post.metrics.clicks.toLocaleString()
                                                                : 'NA'}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-md bg-stone-50 px-2 py-1">
                                                        <p className="text-[10px] text-stone-500">Interactions</p>
                                                        <p className="font-semibold text-stone-800">
                                                            {hasNumericMetric(post.metrics, 'total_interactions')
                                                                ? post.metrics.total_interactions.toLocaleString()
                                                                : 'NA'}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-md bg-stone-50 px-2 py-1">
                                                        <p className="text-[10px] text-stone-500">Engagement Rate</p>
                                                        <p className="font-semibold text-stone-800">
                                                            {hasNumericMetric(post.metrics, 'engagement_rate')
                                                                ? post.metrics.engagement_rate.toLocaleString()
                                                                : 'NA'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {post.permalink && (
                                                    <a
                                                        href={post.permalink}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-800"
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
                                                        {hasNumericMetric(post.metrics, 'total_interactions')
                                                            ? `${post.metrics.total_interactions.toLocaleString()} interactions`
                                                            : 'NA interactions'}
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
                                        className="mt-2 inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-800"
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
                                                <Heart className="h-3.5 w-3.5 text-blue-700" />
                                            ) : metricKey === 'comments' ? (
                                                <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                                            ) : metricKey === 'reposts' ? (
                                                <Share2 className="h-3.5 w-3.5 text-sky-600" />
                                            ) : metricKey === 'clicks' ? (
                                                <ExternalLink className="h-3.5 w-3.5 text-blue-700" />
                                            ) : metricKey === 'views' ? (
                                                <Eye className="h-3.5 w-3.5 text-blue-600" />
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
