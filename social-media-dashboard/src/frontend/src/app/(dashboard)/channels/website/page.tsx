'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
    Globe, Users, Eye, TrendingUp, Clock, Zap, Target,
    Smartphone, Monitor, Tablet, RefreshCw, AlertCircle, Loader2,
} from 'lucide-react';

import {
    getGAOverview,
    getGAPageviews,
    getGATrafficSources,
    getGADeviceBreakdown,
    getGATopPages,
    getGADemographics,
    getGAEngagement,
    getGAConversions,
    getGARealtime,
    GAOverview,
    GAPageviews,
    GATrafficSources,
    GADeviceBreakdown,
    GATopPages,
    GADemographics,
    GAEngagement,
    GAConversions,
    GARealtimeReport,
} from '@/lib/api/ga-api';

// ── Colour palette ─────────────────────────────────────────────────────────────
const COLORS = ['#E5A100', '#4A90D9', '#50B88C', '#9B6AD4', '#C75B39', '#3AAFA9'];
const DEVICE_COLORS: Record<string, string> = {
    Mobile: '#E5A100',
    Desktop: '#4A90D9',
    Tablet: '#50B88C',
};

// ── Helper: format seconds → "2m 05s" ─────────────────────────────────────────
function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return m > 0 ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`;
}

// ── Metric KPI card ────────────────────────────────────────────────────────────
function KpiCard({
    label, value, sub, icon, color = '#E5A100'
}: {
    label: string;
    value: string | number;
    sub?: string;
    icon: React.ReactNode;
    color?: string;
}) {
    return (
        <Card className="relative overflow-hidden">
            <CardContent className="pt-5 pb-4 px-5">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs text-stone-500 font-medium uppercase tracking-wider">{label}</p>
                        <p className="mt-1 text-2xl font-bold text-stone-900 tabular-nums">
                            {typeof value === 'number' ? value.toLocaleString() : value}
                        </p>
                        {sub && <p className="text-xs text-stone-400 mt-0.5">{sub}</p>}
                    </div>
                    <div className="rounded-xl p-2.5" style={{ backgroundColor: `${color}18`, color }}>
                        {icon}
                    </div>
                </div>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 opacity-40" style={{ backgroundColor: color }} />
        </Card>
    );
}

// ── Loading skeleton ───────────────────────────────────────────────────────────
function SectionSkeleton({ rows = 1, height = 'h-48' }: { rows?: number; height?: string }) {
    return (
        <div className="space-y-3 animate-pulse">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className={`${height} rounded-xl bg-stone-100`} />
            ))}
        </div>
    );
}

// ── Error notice ───────────────────────────────────────────────────────────────
function ErrorBanner({ message }: { message: string }) {
    return (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{message}</span>
        </div>
    );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function WebsitePage() {
    const [dateRange, setDateRange] = useState<'7daysAgo' | '30daysAgo' | '90daysAgo'>('30daysAgo');
    const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('day');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const [overview, setOverview] = useState<GAOverview | null>(null);
    const [pageviews, setPageviews] = useState<GAPageviews | null>(null);
    const [traffic, setTraffic] = useState<GATrafficSources | null>(null);
    const [devices, setDevices] = useState<GADeviceBreakdown | null>(null);
    const [topPages, setTopPages] = useState<GATopPages | null>(null);
    const [demographics, setDemographics] = useState<GADemographics | null>(null);
    const [engagement, setEngagement] = useState<GAEngagement | null>(null);
    const [conversions, setConversions] = useState<GAConversions | null>(null);
    const [realtime, setRealtime] = useState<GARealtimeReport | null>(null);

    const fetchAll = useCallback(async (start: string, gran: 'day' | 'week' | 'month', showFullLoader = false) => {
        if (showFullLoader) setLoading(true);
        else setRefreshing(true);
        setError(null);
        try {
            const [ov, pv, tr, dv, tp, dem, eng, cv, rt] = await Promise.all([
                getGAOverview(start),
                getGAPageviews(gran, start),
                getGATrafficSources(start),
                getGADeviceBreakdown(start),
                getGATopPages(10, start),
                getGADemographics(start),
                getGAEngagement(start),
                getGAConversions(start),
                getGARealtime(),
            ]);
            setOverview(ov);
            setPageviews(pv);
            setTraffic(tr);
            setDevices(dv);
            setTopPages(tp);
            setDemographics(dem);
            setEngagement(eng);
            setConversions(cv);
            setRealtime(rt);
        } catch (e) {
            setError((e as Error).message ?? 'Failed to load GA data. Is the backend running?');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Initial load
    useEffect(() => { fetchAll(dateRange, granularity, true); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Refetch when date range changes
    useEffect(() => { fetchAll(dateRange, granularity); }, [dateRange, granularity, fetchAll]);

    const dateLabel: Record<string, string> = {
        '7daysAgo': 'Last 7 days',
        '30daysAgo': 'Last 30 days',
        '90daysAgo': 'Last 90 days',
    };

    return (
        <div className="space-y-6 pb-10">

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-heading font-bold text-stone-900 flex items-center gap-2">
                        <Globe className="h-6 w-6 text-amber-500" /> Website Analytics
                    </h1>
                    <p className="text-sm text-stone-500 mt-1">
                        Google Analytics 4 — real-time & historical performance for Club Artizen.
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Tabs value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
                        <TabsList className="bg-stone-100">
                            <TabsTrigger value="7daysAgo" className="text-xs">7d</TabsTrigger>
                            <TabsTrigger value="30daysAgo" className="text-xs">30d</TabsTrigger>
                            <TabsTrigger value="90daysAgo" className="text-xs">90d</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <button
                        onClick={() => fetchAll(dateRange, granularity)}
                        disabled={refreshing}
                        className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-50 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {error && <ErrorBanner message={error} />}

            {/* ── Real-time strip ──────────────────────────────────────────── */}
            {realtime && (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    </span>
                    <p className="text-sm font-semibold text-emerald-800">
                        {realtime.active_users} users active right now
                    </p>
                    <span className="text-stone-300">·</span>
                    <p className="text-xs text-emerald-700 flex-1 truncate">
                        Top page: {realtime.top_pages[0]?.page_path ?? '—'} ({realtime.top_pages[0]?.active_users ?? 0} users)
                    </p>
                    <div className="flex gap-2 flex-wrap">
                        {realtime.top_pages.slice(0, 4).map((pg, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] bg-white border-emerald-200 text-emerald-700 font-mono">
                                {pg.page_path} <span className="ml-1 text-emerald-400">{pg.active_users}</span>
                            </Badge>
                        ))}
                    </div>
                </div>
            )}

            {/* ── KPI overview ────────────────────────────────────────────── */}
            {loading ? <SectionSkeleton rows={2} height="h-24" /> : overview ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <KpiCard label="Sessions" value={overview.sessions} icon={<TrendingUp className="h-5 w-5" />} color="#E5A100" />
                    <KpiCard label="Users" value={overview.users} icon={<Users className="h-5 w-5" />} color="#4A90D9" />
                    <KpiCard label="New Users" value={overview.new_users} icon={<Users className="h-5 w-5" />} color="#50B88C" />
                    <KpiCard label="Pageviews" value={overview.pageviews} icon={<Eye className="h-5 w-5" />} color="#9B6AD4" />
                    <KpiCard label="Bounce Rate" value={`${overview.bounce_rate.toFixed(1)}%`} icon={<Target className="h-5 w-5" />} color="#C75B39" />
                    <KpiCard label="Avg Duration" value={formatDuration(overview.avg_session_duration)} icon={<Clock className="h-5 w-5" />} color="#3AAFA9" />
                </div>
            ) : null}

            {/* ── Pageviews trend ──────────────────────────────────────────── */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-stone-700">Page Views Trend</CardTitle>
                    <Tabs value={granularity} onValueChange={(v) => setGranularity(v as typeof granularity)}>
                        <TabsList className="bg-stone-100 h-7">
                            <TabsTrigger value="day" className="text-[11px] h-6 px-2.5">Day</TabsTrigger>
                            <TabsTrigger value="week" className="text-[11px] h-6 px-2.5">Week</TabsTrigger>
                            <TabsTrigger value="month" className="text-[11px] h-6 px-2.5">Month</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </CardHeader>
                <CardContent>
                    {loading ? <SectionSkeleton /> :
                        !pageviews ? <p className="text-sm text-stone-400">No data</p> : (
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={pageviews.series.map(p => ({ date: p.date, views: p.value }))}>
                                        <defs>
                                            <linearGradient id="pvGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#E5A100" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#E5A100" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#78716C' }}
                                            tickFormatter={(v) => v.length === 8 ? v.slice(4) : v} />
                                        <YAxis tick={{ fontSize: 10, fill: '#78716C' }} />
                                        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E7E5E4', fontSize: 12 }}
                                            formatter={(val: unknown) => [Number(val).toLocaleString(), 'Page Views']} />
                                        <Area type="monotone" dataKey="views" stroke="#E5A100" strokeWidth={2}
                                            fill="url(#pvGrad)" name="Page Views" />
                                    </AreaChart>
                                </ResponsiveContainer>
                                <p className="text-xs text-stone-400 text-right mt-1">
                                    Total: <span className="font-medium text-stone-600">{pageviews.total.toLocaleString()}</span> views · {dateLabel[dateRange]}
                                </p>
                            </div>
                        )}
                </CardContent>
            </Card>

            {/* ── Traffic Sources + Device Breakdown ──────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Traffic Sources */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-stone-700">Traffic Sources</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? <SectionSkeleton /> :
                            !traffic ? <p className="text-sm text-stone-400">No data</p> : (
                                <div className="flex flex-col lg:flex-row items-center gap-6">
                                    <div className="h-52 w-full max-w-[200px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={traffic.sources} dataKey="sessions" nameKey="channel"
                                                    cx="50%" cy="50%" innerRadius={50} outerRadius={78}>
                                                    {traffic.sources.map((_, i) => (
                                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }}
                                                    formatter={(v: unknown) => [Number(v).toLocaleString(), 'Sessions']} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex-1 w-full space-y-2">
                                        {traffic.sources.map((s, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <div className="h-2.5 w-2.5 rounded-full shrink-0"
                                                    style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                                <span className="text-xs text-stone-700 truncate flex-1">{s.channel}</span>
                                                <span className="text-xs font-medium text-stone-600 tabular-nums">{s.percentage.toFixed(1)}%</span>
                                                <span className="text-xs text-stone-400 tabular-nums">({s.sessions.toLocaleString()})</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                    </CardContent>
                </Card>

                {/* Device Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-stone-700">Device Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? <SectionSkeleton /> :
                            !devices ? <p className="text-sm text-stone-400">No data</p> : (
                                <div className="space-y-3">
                                    {devices.devices.map((d, i) => {
                                        const DevIcon = d.device === 'Mobile' ? Smartphone
                                            : d.device === 'Tablet' ? Tablet : Monitor;
                                        const color = DEVICE_COLORS[d.device] ?? COLORS[i];
                                        return (
                                            <div key={i}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-1.5 text-xs text-stone-700">
                                                        <DevIcon className="h-3.5 w-3.5" style={{ color }} />
                                                        {d.device}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-medium text-stone-700">{d.percentage.toFixed(1)}%</span>
                                                        <span className="text-xs text-stone-400 tabular-nums">({d.sessions.toLocaleString()})</span>
                                                    </div>
                                                </div>
                                                <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                                                    <div className="h-full rounded-full transition-all duration-700"
                                                        style={{ width: `${d.percentage}%`, backgroundColor: color }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {devices.total_sessions > 0 && (
                                        <p className="text-xs text-stone-400 text-right pt-1">
                                            Total: <span className="font-medium text-stone-600">{devices.total_sessions.toLocaleString()}</span> sessions
                                        </p>
                                    )}
                                </div>
                            )}
                    </CardContent>
                </Card>
            </div>

            {/* ── Demographics ────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* By Country */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-stone-700">Audience by Country</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? <SectionSkeleton /> :
                            !demographics ? <p className="text-sm text-stone-400">No data</p> : (
                                <div className="h-56">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={demographics.by_country} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                                            <XAxis type="number" tick={{ fontSize: 10, fill: '#78716C' }} />
                                            <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: '#78716C' }} width={90} />
                                            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }}
                                                formatter={(v: unknown) => [Number(v).toLocaleString(), 'Users']} />
                                            <Bar dataKey="value" fill="#E5A100" radius={[0, 4, 4, 0]} name="Users" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                    </CardContent>
                </Card>

                {/* By Age */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-stone-700">Audience by Age</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? <SectionSkeleton /> :
                            !demographics ? <p className="text-sm text-stone-400">No data</p> : (
                                <div className="h-56 flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={demographics.by_age} dataKey="value" nameKey="label"
                                                cx="50%" cy="50%" outerRadius={90} innerRadius={50}
                                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                label={(p: any) => `${p.name} (${((p.percent || 0) * 100).toFixed(0)}%)`}
                                                labelLine={{ stroke: '#A8A29E', strokeWidth: 1 }}>
                                                {demographics.by_age.map((_, i) => (
                                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }}
                                                formatter={(v: unknown) => [Number(v).toLocaleString(), 'Users']} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                    </CardContent>
                </Card>
            </div>

            {/* ── Engagement KPIs ──────────────────────────────────────────── */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium text-stone-700 flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-500" /> Engagement Quality
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? <SectionSkeleton rows={1} height="h-20" /> :
                        !engagement ? <p className="text-sm text-stone-400">No data</p> : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <KpiCard label="Engaged Sessions" value={engagement.engaged_sessions}
                                    icon={<TrendingUp className="h-5 w-5" />} color="#E5A100" />
                                <KpiCard label="Engagement Rate" value={`${engagement.engagement_rate.toFixed(1)}%`}
                                    icon={<Target className="h-5 w-5" />} color="#4A90D9" />
                                <KpiCard label="Events / Session" value={engagement.events_per_session.toFixed(1)}
                                    icon={<Zap className="h-5 w-5" />} color="#50B88C" />
                                <KpiCard label="Avg Engagement" value={formatDuration(engagement.avg_engagement_time)}
                                    icon={<Clock className="h-5 w-5" />} color="#9B6AD4" />
                            </div>
                        )}
                </CardContent>
            </Card>

            {/* ── Conversions + Top Pages ──────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Conversions table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-stone-700 flex items-center gap-2">
                            <Target className="h-4 w-4 text-amber-500" /> Key Events (Conversions)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? <SectionSkeleton rows={3} height="h-10" /> :
                            !conversions ? <p className="text-sm text-stone-400">No data</p> : (
                                <div className="space-y-2">
                                    {conversions.events.length === 0 ? (
                                        <p className="text-sm text-stone-400">No conversion events recorded.</p>
                                    ) : conversions.events.map((ev, i) => (
                                        <div key={i} className="flex items-center gap-3 rounded-lg bg-stone-50 px-3 py-2.5">
                                            <span className="text-[10px] font-bold text-amber-500 w-5">#{i + 1}</span>
                                            <span className="text-xs text-stone-700 flex-1 font-mono truncate">{ev.event_name}</span>
                                            <span className="text-xs font-semibold text-stone-900 tabular-nums">{ev.count.toLocaleString()}</span>
                                            <div className="w-20 h-1.5 rounded-full bg-stone-200 overflow-hidden">
                                                <div className="h-full bg-amber-400 rounded-full"
                                                    style={{ width: `${(ev.count / conversions.total) * 100}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                    {conversions.total > 0 && (
                                        <p className="text-xs text-stone-400 text-right pt-1">
                                            Total: <span className="font-medium text-stone-600">{conversions.total.toLocaleString()}</span> conversions
                                        </p>
                                    )}
                                </div>
                            )}
                    </CardContent>
                </Card>

                {/* Top pages table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-stone-700 flex items-center gap-2">
                            <Eye className="h-4 w-4 text-amber-500" /> Top Pages
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? <SectionSkeleton rows={5} height="h-9" /> :
                            !topPages ? <p className="text-sm text-stone-400">No data</p> : (
                                <div className="space-y-1">
                                    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-2 py-1 text-[10px] font-medium text-stone-400 uppercase tracking-wider">
                                        <span>Page</span>
                                        <span className="text-right">Sessions</span>
                                        <span className="text-right">Views</span>
                                        <span className="text-right">Avg Time</span>
                                    </div>
                                    {topPages.pages.map((pg, i) => (
                                        <div key={i}
                                            className="grid grid-cols-[1fr_auto_auto_auto] gap-2 rounded-lg px-2 py-2 hover:bg-stone-50 transition-colors">
                                            <div className="min-w-0">
                                                <p className="text-xs font-mono text-stone-700 truncate">{pg.page_path}</p>
                                                <p className="text-[10px] text-stone-400 truncate">{pg.page_title}</p>
                                            </div>
                                            <span className="text-xs text-stone-700 tabular-nums text-right self-center">
                                                {pg.sessions.toLocaleString()}
                                            </span>
                                            <span className="text-xs text-stone-500 tabular-nums text-right self-center">
                                                {pg.pageviews.toLocaleString()}
                                            </span>
                                            <span className="text-xs text-stone-400 tabular-nums text-right self-center">
                                                {formatDuration(pg.avg_time_on_page)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                    </CardContent>
                </Card>
            </div>

            {/* ── Real-time detail ─────────────────────────────────────────── */}
            {realtime && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium text-stone-700 flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                            </span>
                            Real-Time — {realtime.active_users} Active Users
                        </CardTitle>
                        <button
                            onClick={() => getGARealtime().then(setRealtime)}
                            className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600 transition-colors"
                        >
                            <Loader2 className="h-3 w-3" /> Refresh
                        </button>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                            {realtime.top_pages.map((pg, i) => (
                                <div key={i} className="rounded-xl border border-stone-100 bg-stone-50 px-3 py-2.5">
                                    <p className="text-[10px] font-mono text-stone-500 truncate">{pg.page_path}</p>
                                    <p className="mt-1 text-xl font-bold text-stone-900">{pg.active_users}</p>
                                    <p className="text-[9px] text-stone-400 uppercase tracking-wider">active users</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

        </div>
    );
}
