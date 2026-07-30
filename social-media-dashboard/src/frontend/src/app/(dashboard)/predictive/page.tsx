'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ChartCard, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from '@/components/charts/ChartComponents';
import { trendingTopics as stubTopics, suggestedActions as stubActions, trendGrowthTrajectory as stubTrajectory } from '@/lib/stub-data/predictive';
import { competitors as stubCompetitors } from '@/lib/stub-data/competitors';
import { getTrendsInsights, refreshTrends, getTrendsStatus, type TrendsInsightsResponse, type SchedulerStatus } from '@/lib/api/trends-api';
import { getCompetitors, type CompetitorsResult } from '@/lib/api/competitors-api';
import { MlInsightsStudio } from '@/components/predictive/MlInsightsStudio';
import { TrendingUp, Zap, ArrowRight, Sparkles, Target, Instagram, Linkedin, MessageCircle, RefreshCw, Loader2, Facebook, Youtube, BarChart3 } from 'lucide-react';

const channelIcons: Record<string, React.ReactNode> = {
    instagram: <Instagram className="h-3.5 w-3.5" />,
    linkedin: <Linkedin className="h-3.5 w-3.5" />,
    whatsapp: <MessageCircle className="h-3.5 w-3.5" />,
};

const signalColors: Record<string, string> = {
    rising: 'bg-red-100 text-red-700',
    steady: 'bg-blue-100 text-blue-700',
    emerging: 'bg-purple-100 text-purple-700',
};

const priorityColors: Record<string, string> = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-blue-100 text-blue-700',
};

const sourceStyles: Record<string, { label: string; className: string }> = {
    ai: { label: '🤖 AI-Powered', className: 'bg-purple-100 text-purple-700 border-purple-200' },
    cache: { label: 'Cached', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    fallback: { label: '📊 Sample Data', className: 'bg-stone-100 text-stone-600 border-stone-200' },
};

export default function PredictivePage() {
    const [data, setData] = useState<TrendsInsightsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showOverview, setShowOverview] = useState(false);
    const [liveCompetitors, setLiveCompetitors] = useState<CompetitorsResult | null>(null);
    const [loadingComps, setLoadingComps] = useState(false);
    const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const insights = await getTrendsInsights();
            setData(insights);
        } catch {
            setData(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        // Poll scheduler status every 30 seconds
        const pollStatus = async () => {
            const status = await getTrendsStatus();
            if (status) setSchedulerStatus(status);
        };
        pollStatus();
        const interval = setInterval(pollStatus, 30_000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await refreshTrends();
            await fetchData();
        } catch {
            // Refresh failed — data stays as-is
        } finally {
            setRefreshing(false);
        }
    };

    // Resolve data: API response or stubs
    const topics = data?.trending_topics?.map(t => ({
        id: t.id,
        category: t.category,
        topic: t.topic,
        change: t.change,
        confidence: t.confidence,
        signal: t.signal,
        sources: t.sources || [],
    })) || stubTopics;

    const actions = data?.suggested_actions?.map(a => ({
        id: a.id,
        priority: a.priority,
        title: a.title,
        description: a.description,
        channel: a.channel,
        expectedImpact: a.expected_impact,
        relatedTrend: a.related_trend,
    })) || stubActions;

    const trajectories = data?.trend_trajectories?.map(t => ({
        label: t.label,
        color: t.color,
        data: t.data,
    })) || stubTrajectory;

    const dataSource = data?.source || 'fallback';
    const sourceInfo = sourceStyles[dataSource] || sourceStyles.fallback;

    // Fetch live competitor data when Overview dialog opens
    const competitors = liveCompetitors?.competitors || stubCompetitors;
    const compSource = liveCompetitors?.source || 'fallback';

    const handleShowOverview = async () => {
        setShowOverview(true);
        if (!liveCompetitors) {
            setLoadingComps(true);
            try {
                const result = await getCompetitors();
                setLiveCompetitors(result);
            } catch {
                // keep stubs
            } finally {
                setLoadingComps(false);
            }
        }
    };

    // Build trajectory chart data
    const trajectoryData = trajectories[0]?.data.map((_, i) => {
        const point: Record<string, string | number> = { month: trajectories[0].data[i].date.slice(5) };
        trajectories.forEach(t => { point[t.label] = t.data[i]?.value || 0; });
        return point;
    }) || [];

    // Skeleton loader
    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-heading font-bold text-stone-900 flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-amber-500" /> Predictive Insights
                    </h1>
                    <p className="text-sm text-stone-500 mt-1">Loading AI-powered trends…</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[1, 2, 3].map(i => (
                        <Card key={i} className="animate-pulse">
                            <CardContent className="pt-4 pb-3">
                                <div className="h-4 bg-stone-200 rounded w-1/3 mb-3" />
                                <div className="h-5 bg-stone-200 rounded w-2/3 mb-2" />
                                <div className="h-3 bg-stone-100 rounded w-1/2" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-heading font-bold text-stone-900 flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-amber-500" /> Predictive Insights
                    </h1>
                    <p className="text-sm text-stone-500 mt-1">AI-powered trends and actionable suggestions from competitor analysis.</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Scheduler status badge */}
                    {schedulerStatus && (
                        <Badge
                            variant="outline"
                            className={`text-[10px] ${schedulerStatus.last_status === 'running'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                                    : schedulerStatus.last_status === 'error'
                                        ? 'bg-red-50 text-red-600 border-red-200'
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                            title={schedulerStatus.last_error ?? undefined}
                        >
                            {schedulerStatus.last_status === 'running' ? (
                                <><Loader2 className="h-2.5 w-2.5 mr-1 animate-spin" />Scraping now…</>
                            ) : schedulerStatus.next_run ? (
                                (() => {
                                    const diffMs = new Date(schedulerStatus.next_run).getTime() - Date.now();
                                    const diffH = Math.floor(diffMs / 3_600_000);
                                    const diffM = Math.floor((diffMs % 3_600_000) / 60_000);
                                    return diffMs > 0
                                        ? `⏱ Next scrape ${diffH > 0 ? `${diffH}h ` : ''}${diffM}m`
                                        : '⏱ Scraping soon';
                                })()
                            ) : (
                                `⏱ Every ${schedulerStatus.interval_hours}h`
                            )}
                        </Badge>
                    )}
                    <Badge variant="outline" className={`text-xs ${sourceInfo.className}`}>
                        {sourceInfo.label}
                    </Badge>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleShowOverview}
                        className="text-xs bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 text-amber-700 hover:from-amber-100 hover:to-orange-100"
                    >
                        <BarChart3 className="mr-1 h-3 w-3" /> Overview
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="text-xs"
                    >
                        {refreshing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}
                        Refresh
                    </Button>
                </div>
            </div>

            {/* ── ML Service Studio ───────────────────────────────────── */}
            <MlInsightsStudio />

            {/* ── Data source footer ──────────────────────────────────── */}
            {data?.last_updated && (
                <p className="text-[10px] text-stone-400 text-right">
                    Last updated: {new Date(data.last_updated).toLocaleString()}
                </p>
            )}

            {/* ── Competitor Overview Dialog ─────────────────────────── */}
            <Dialog open={showOverview} onOpenChange={setShowOverview}>
                <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            <BarChart3 className="h-5 w-5 text-amber-500" />
                            Competitor Overview
                        </DialogTitle>
                        <DialogDescription className="text-xs text-stone-500">
                            Real-time follower counts, engagement, and growth across all tracked competitors.
                            {compSource !== 'fallback' && (
                                <Badge variant="outline" className="ml-2 text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200">
                                    🟢 {compSource === 'live' ? 'Live' : 'Cached'}
                                </Badge>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    {loadingComps ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                            <span className="ml-2 text-sm text-stone-500">Loading live data…</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                            {competitors.map((comp) => (
                                <div
                                    key={comp.id}
                                    className="rounded-xl border border-stone-200 bg-gradient-to-br from-white to-stone-50 p-4 hover:shadow-md transition-shadow"
                                >
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <h3 className="text-sm font-semibold text-stone-800">{comp.name}</h3>
                                            <p className="text-[11px] text-stone-400">{comp.handle}</p>
                                        </div>
                                        <Badge
                                            className={`text-[10px] ${comp.metrics.growth >= 7
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : comp.metrics.growth >= 4
                                                    ? 'bg-amber-100 text-amber-700'
                                                    : 'bg-stone-100 text-stone-600'
                                                }`}
                                        >
                                            <TrendingUp className="h-3 w-3 mr-0.5" />
                                            +{comp.metrics.growth}%
                                        </Badge>
                                    </div>

                                    {/* Metrics Grid */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex items-center gap-2 p-2 rounded-lg bg-pink-50">
                                            <Instagram className="h-3.5 w-3.5 text-pink-500" />
                                            <div>
                                                <p className="text-xs font-semibold text-stone-800">
                                                    {comp.metrics.instagram >= 1000
                                                        ? `${(comp.metrics.instagram / 1000).toFixed(comp.metrics.instagram >= 100000 ? 0 : 1)}K`
                                                        : comp.metrics.instagram}
                                                </p>
                                                <p className="text-[9px] text-stone-400">Instagram</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50">
                                            <Facebook className="h-3.5 w-3.5 text-blue-600" />
                                            <div>
                                                <p className="text-xs font-semibold text-stone-800">
                                                    {comp.metrics.facebook >= 1000
                                                        ? `${(comp.metrics.facebook / 1000).toFixed(comp.metrics.facebook >= 100000 ? 0 : 1)}K`
                                                        : comp.metrics.facebook}
                                                </p>
                                                <p className="text-[9px] text-stone-400">Facebook</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 p-2 rounded-lg bg-sky-50">
                                            <Linkedin className="h-3.5 w-3.5 text-sky-600" />
                                            <div>
                                                <p className="text-xs font-semibold text-stone-800">
                                                    {comp.metrics.linkedin >= 1000
                                                        ? `${(comp.metrics.linkedin / 1000).toFixed(1)}K`
                                                        : comp.metrics.linkedin}
                                                </p>
                                                <p className="text-[9px] text-stone-400">LinkedIn</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50">
                                            <Youtube className="h-3.5 w-3.5 text-red-500" />
                                            <div>
                                                <p className="text-xs font-semibold text-stone-800">
                                                    {comp.metrics.youtube >= 1000
                                                        ? `${(comp.metrics.youtube / 1000).toFixed(1)}K`
                                                        : comp.metrics.youtube}
                                                </p>
                                                <p className="text-[9px] text-stone-400">YouTube</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bottom stats */}
                                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-100">
                                        <div className="flex items-center gap-1">
                                            <Zap className="h-3 w-3 text-amber-500" />
                                            <span className="text-[10px] text-stone-600">
                                                <span className="font-semibold">{comp.metrics.engagement}%</span> engagement
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-stone-400">
                                            {comp.metrics.postsPerWeek} posts/week
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Summary bar */}
                    <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                        <div className="flex items-start gap-2">
                            <Sparkles className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs font-medium text-amber-800">Quick Insight</p>
                                <p className="text-[11px] text-amber-700 mt-0.5">
                                    {(() => {
                                        const fastest = [...competitors].sort((a, b) => b.metrics.growth - a.metrics.growth)[0];
                                        const mostEngaged = [...competitors].sort((a, b) => b.metrics.engagement - a.metrics.engagement)[0];
                                        return `${fastest.name} is growing fastest at +${fastest.metrics.growth}% • ${mostEngaged.name} leads engagement at ${mostEngaged.metrics.engagement}%`;
                                    })()}
                                </p>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
