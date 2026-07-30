'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    CalendarDays,
    Eye,
    Facebook,
    GripVertical,
    MousePointerClick,
    Plus,
    RefreshCw,
    TrendingUp,
    Users,
    X,
} from 'lucide-react';
import Link from 'next/link';
import { DayPicker, DateRange } from 'react-day-picker';
import { ScatterChart, Scatter } from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from '@/components/charts/ChartComponents';
import { useAuth } from '@/lib/auth-context';
import {
    fetchFacebookDashboardLayout,
    saveFacebookDashboardLayout,
    type InstagramDashboardLayoutWidget,
} from '@/lib/api/manual-insights-api';
import { cn } from '@/lib/utils';

const API_BASE =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) ||
    'http://localhost:8000';
const FACEBOOK_USER_ID = 'ClubArtizen';
const CHANNEL_METRICS = [
    'views',
    'viewers',
    'content_interactions',
    'facebook_link_clicks',
    'facebook_visits',
    'facebook_follows',
] as const;

const METRIC_LABELS: Record<string, string> = {
    views: 'Views',
    viewers: 'Viewers',
    content_interactions: 'Content Interactions',
    facebook_link_clicks: 'Link Clicks',
    facebook_visits: 'Page Visits',
    facebook_follows: 'Follows',
};

const METRIC_COLORS: Record<string, string> = {
    views: '#1877F2',
    viewers: '#2563EB',
    content_interactions: '#059669',
    facebook_link_clicks: '#D97706',
    facebook_visits: '#0EA5E9',
    facebook_follows: '#9333EA',
};

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

type WidgetKind =
    | 'channel-overview'
    | 'metric-line'
    | 'dynamic-metric-line'
    | 'metric-scatter-compare';

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
    return METRIC_COLORS[metricKey] || '#1877F2';
}

function buildWidgetInstanceId(widgetId: string): string {
    const randomSuffix = Math.random().toString(36).slice(2, 8);
    return `${widgetId}-${Date.now()}-${randomSuffix}`;
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
    }

    return {
        instanceId,
        widgetId,
        config,
    };
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

function buildWidgetCatalog(series: MetricSeries[]): DashboardWidget[] {
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
            description: 'Pick any Facebook metric and view its trend over time.',
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
            description: `Daily ${metricSeries.label.toLowerCase()} values for ${FACEBOOK_USER_ID}.`,
            kind: 'metric-line',
            metricKey: metricSeries.key,
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

function FacebookMetricCard({
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        {icon}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default function FacebookPage() {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

    const [metricSeries, setMetricSeries] = useState<MetricSeries[]>([]);
    const [widgetSheetOpen, setWidgetSheetOpen] = useState(false);
    const [activeWidgetInstances, setActiveWidgetInstances] = useState<DashboardWidgetInstance[]>([]);
    const [persistedWidgetInstances, setPersistedWidgetInstances] = useState<DashboardWidgetInstance[] | null>(null);
    const [isLayoutLoading, setIsLayoutLoading] = useState(true);
    const [isLayoutInitialized, setIsLayoutInitialized] = useState(false);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const dragItemRef = useRef<string | null>(null);
    const defaultDateRangeInitializedRef = useRef(false);
    const [selectedCalendarRange, setSelectedCalendarRange] = useState<DateRange | undefined>();
    const [dashboardTimeframe, setDashboardTimeframe] = useState<DashboardTimeframePreset>('last_7_days');
    const dashboardLayoutUserId = user?.id || FACEBOOK_USER_ID;

    const loadDashboardData = useCallback(async () => {
        setIsLoading(true);
        setErrorMessage(null);

        try {
            const metricParams = new URLSearchParams({
                metric: CHANNEL_METRICS.join(','),
                period: 'day',
            });

            const insightsPayload = await fetchJson<ManualInsightsResponse>(
                `/manual/facebook/insights/${encodeURIComponent(FACEBOOK_USER_ID)}?${metricParams.toString()}`,
            );

            setMetricSeries(parseChannelMetricSeries(insightsPayload));
            setLastSyncedAt(new Date().toLocaleString());
        } catch (error) {
            setErrorMessage((error as Error).message || 'Failed to load Facebook insights.');
            setMetricSeries([]);
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
                const payload = await fetchFacebookDashboardLayout(FACEBOOK_USER_ID, dashboardLayoutUserId);
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

    const latestValidWeekRange = useMemo<DateRange | null>(
        () =>
            getLatestWeekDateRangeFromTimestamps(
                metricSeries.flatMap((series) => series.points.map((point) => point.sortValue)),
            ),
        [metricSeries],
    );

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

    const widgetCatalog = useMemo(
        () => buildWidgetCatalog(metricSeries),
        [metricSeries],
    );

    const channelMetricOptions = useMemo(
        () =>
            metricSeries
                .filter((series) => series.points.length > 0)
                .map((series) => ({ value: series.key, label: series.label })),
        [metricSeries],
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

            return {};
        },
        [channelMetricOptions],
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

            return {};
        },
        [channelMetricOptions],
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
            void saveFacebookDashboardLayout({
                fbUserId: FACEBOOK_USER_ID,
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

    const globalViewsSeries = allSeriesByKey.get('views');
    const globalViewersSeries = allSeriesByKey.get('viewers');
    const globalInteractionsSeries = allSeriesByKey.get('content_interactions');
    const globalFollowsSeries = allSeriesByKey.get('facebook_follows');

    const viewsSeries = seriesByKey.get('views');
    const viewersSeries = seriesByKey.get('viewers');
    const interactionsSeries = seriesByKey.get('content_interactions');
    const followsSeries = seriesByKey.get('facebook_follows');

    const globalTotalViews = globalViewsSeries ? Math.round(globalViewsSeries.total) : 0;
    const globalTotalViewers = globalViewersSeries ? Math.round(globalViewersSeries.total) : 0;
    const globalTotalInteractions = globalInteractionsSeries ? Math.round(globalInteractionsSeries.total) : 0;
    const globalTotalFollows = globalFollowsSeries ? Math.round(globalFollowsSeries.total) : 0;

    const selectedRangeTotalViews = viewsSeries ? Math.round(viewsSeries.total) : 0;
    const selectedRangeTotalViewers = viewersSeries ? Math.round(viewersSeries.total) : 0;
    const selectedRangeTotalInteractions = interactionsSeries ? Math.round(interactionsSeries.total) : 0;
    const selectedRangeTotalFollows = followsSeries ? Math.round(followsSeries.total) : 0;

    const totalViews = isDateRangeActive ? selectedRangeTotalViews : globalTotalViews;
    const totalViewers = isDateRangeActive ? selectedRangeTotalViewers : globalTotalViewers;
    const totalInteractions = isDateRangeActive ? selectedRangeTotalInteractions : globalTotalInteractions;
    const totalFollows = isDateRangeActive ? selectedRangeTotalFollows : globalTotalFollows;

    const comparisonLabel = isDateRangeActive ? 'vs previous equal range' : 'vs previous day';

    const viewsChange = globalViewsSeries
        ? getMetricChange(globalViewsSeries.points, viewsSeries ? viewsSeries.points : [], selectedDateRange)
        : undefined;
    const viewersChange = globalViewersSeries
        ? getMetricChange(globalViewersSeries.points, viewersSeries ? viewersSeries.points : [], selectedDateRange)
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
    }, []);

    const renderWidget = (widget: DashboardWidget, widgetInstance: DashboardWidgetInstance) => {
        if (widget.kind === 'channel-overview') {
            if (metricOverviewData.length === 0) {
                return (
                    <p className="text-xs text-stone-400">
                        No channelwise metric rows available for {FACEBOOK_USER_ID}.
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
                            <Bar dataKey="total" fill="#1877F2" radius={[6, 6, 0, 0]} />
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
                return <p className="text-xs text-stone-400">No Facebook metrics available to visualize.</p>;
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
                return <p className="text-xs text-stone-400">At least two metrics are required to compare axes.</p>;
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
                                <Scatter data={scatterData} fill="#1877F2" />
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
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
                    <div className="h-8 rounded bg-indigo-100" />
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

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                        <Facebook className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-heading font-bold text-stone-900">Facebook</h1>
                        <p className="text-sm text-stone-500">
                            Insights dashboard · user_id:{' '}
                            <span className="font-semibold">{FACEBOOK_USER_ID}</span>
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
                    <Button asChild variant="outline" size="sm">
                        <Link href="/channels/manual-upload">Upload Data</Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => void loadDashboardData()} disabled={isLoading}>
                        <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', isLoading && 'animate-spin')} />
                        Refresh
                    </Button>
                </div>
            </div>

            {errorMessage && (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="py-3 text-sm text-red-700">{errorMessage}</CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <FacebookMetricCard
                    label="Views"
                    value={totalViews}
                    change={viewsChange}
                    changeLabel={comparisonLabel}
                    showGlobalValue={isDateRangeActive}
                    globalValue={globalTotalViews}
                    icon={<Eye className="h-5 w-5" />}
                />
                <FacebookMetricCard
                    label="Viewers"
                    value={totalViewers}
                    change={viewersChange}
                    changeLabel={comparisonLabel}
                    showGlobalValue={isDateRangeActive}
                    globalValue={globalTotalViewers}
                    icon={<Users className="h-5 w-5" />}
                />
                <FacebookMetricCard
                    label="Interactions"
                    value={totalInteractions}
                    change={interactionsChange}
                    changeLabel={comparisonLabel}
                    showGlobalValue={isDateRangeActive}
                    globalValue={globalTotalInteractions}
                    icon={<TrendingUp className="h-5 w-5" />}
                />
                <FacebookMetricCard
                    label="Follows"
                    value={totalFollows}
                    change={followsChange}
                    changeLabel={comparisonLabel}
                    showGlobalValue={isDateRangeActive}
                    globalValue={globalTotalFollows}
                    icon={<MousePointerClick className="h-5 w-5" />}
                />
            </div>

            <Card className="border-stone-200">
                <CardContent className="pt-5">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600">
                        <Badge variant="outline">
                            Channel metrics: {seriesForDisplay.filter((series) => series.points.length > 0).length}
                        </Badge>
                        {lastSyncedAt && <span>Last synced: {lastSyncedAt}</span>}
                    </div>
                </CardContent>
            </Card>

            <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-sm font-medium text-stone-700">
                    <GripVertical className="h-3.5 w-3.5 text-stone-400" />
                    Drag widgets to rearrange
                </h2>
                <Sheet open={widgetSheetOpen} onOpenChange={setWidgetSheetOpen}>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="sm" className="text-xs">
                            <Plus className="mr-1 h-3 w-3" />
                            Add Widget
                        </Button>
                    </SheetTrigger>
                    <SheetContent className="overflow-hidden">
                        <SheetHeader>
                            <SheetTitle>Facebook Widgets</SheetTitle>
                        </SheetHeader>
                        <div className="mt-4 flex-1 min-h-0 overflow-y-auto px-2">
                            <div className="grid grid-cols-1 gap-3 pb-1">
                                {availableWidgets.length === 0 ? (
                                    <p className="text-sm text-stone-500">
                                        Widget options will appear once metric data is available.
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
                        Loading Facebook insights...
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
        </div>
    );
}
