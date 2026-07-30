'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { MetricKPI, ChartCard, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from '@/components/charts/ChartComponents';
import { PieChart, Pie, Cell } from 'recharts';
import { LinkedInConversionMetrics } from '@/components/channel/LinkedInConversionMetrics';
import { getWidgetsForChannel } from '@/lib/stub-data/widgets';
import { getPostsByChannel } from '@/lib/stub-data/posts';
import { channels } from '@/lib/stub-data/channels';
import { followerGrowthTrend, geographyData, ageData, channelStats } from '@/lib/stub-data/statistics';
import { ChannelSlug, ChannelStats, TimeSeriesPoint, Post, InstagramPost, LinkedInPost, WhatsAppMessage, YouTubeVideo, WidgetDefinition } from '@/types';
import { Plus, Search, Grid3X3, List, ArrowUpDown, Eye, Heart, Share2, MessageSquare, Bookmark, Clock, MousePointerClick, Users, TrendingUp, BarChart3, GripVertical } from 'lucide-react';
import { getIGOverview } from '@/lib/api/ig-api';
import { getWAOverview } from '@/lib/api/wa-api';
import { getLIOverview } from '@/lib/api/li-api';
import { getYTOverview, getYTSubscriberGrowth } from '@/lib/api/yt-api';

const COLORS = ['#E5A100', '#4A90D9', '#50B88C', '#9B6AD4', '#C75B39', '#3AAFA9'];

// Simple deterministic hash — produces a number 0-1 from a string + index
function seededRandom(seed: string, index: number): number {
    let h = 0;
    const s = seed + String(index);
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return (((h >>> 0) % 10000) / 10000);
}

// ---- Widget Renderer ----
function WidgetRenderer({ widget, channel, stats, growthData }: {
    widget: WidgetDefinition;
    channel: ChannelSlug;
    stats: ChannelStats | null;
    growthData: { date: string; value: number }[];
}) {

    // Render different chart types based on widget definition
    if (widget.chartType === 'line' || widget.chartType === 'area') {
        return (
            <div className="h-full p-3">
                <p className="text-xs font-medium text-stone-600 mb-2">{widget.name}</p>
                <div className="h-[calc(100%-24px)]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={growthData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                            <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#78716C' }} />
                            <YAxis tick={{ fontSize: 9, fill: '#78716C' }} />
                            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                            <Area type="monotone" dataKey="value" stroke={channels.find(c => c.slug === channel)?.color || '#E5A100'} fill={channels.find(c => c.slug === channel)?.color || '#E5A100'} fillOpacity={0.1} strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    }

    if (widget.chartType === 'stacked-bar' || widget.chartType === 'grouped-bar' || widget.chartType === 'bar' || widget.chartType === 'horizontal-bar') {
        const barData = [
            { label: 'Likes', value: Math.floor(seededRandom(widget.id, 0) * 2000 + 500) },
            { label: 'Comments', value: Math.floor(seededRandom(widget.id, 1) * 500 + 100) },
            { label: 'Shares', value: Math.floor(seededRandom(widget.id, 2) * 800 + 200) },
            { label: 'Saves', value: Math.floor(seededRandom(widget.id, 3) * 600 + 150) },
        ];
        return (
            <div className="h-full p-3">
                <p className="text-xs font-medium text-stone-600 mb-2">{widget.name}</p>
                <div className="h-[calc(100%-24px)]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} layout={widget.chartType === 'horizontal-bar' ? 'vertical' : 'horizontal'}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                            {widget.chartType === 'horizontal-bar' ? (
                                <>
                                    <XAxis type="number" tick={{ fontSize: 9, fill: '#78716C' }} />
                                    <YAxis type="category" dataKey="label" tick={{ fontSize: 9, fill: '#78716C' }} width={50} />
                                </>
                            ) : (
                                <>
                                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#78716C' }} />
                                    <YAxis tick={{ fontSize: 9, fill: '#78716C' }} />
                                </>
                            )}
                            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                            <Bar dataKey="value" fill={channels.find(c => c.slug === channel)?.color || '#E5A100'} radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    }

    if (widget.chartType === 'donut' || widget.chartType === 'pie-bar') {
        const pieData = [
            { name: 'Bio Link', value: 45 },
            { name: 'Call', value: 12 },
            { name: 'Email', value: 18 },
            { name: 'Direction', value: 8 },
            { name: 'Other', value: 17 },
        ];
        return (
            <div className="h-full p-3">
                <p className="text-xs font-medium text-stone-600 mb-2">{widget.name}</p>
                <div className="h-[calc(100%-24px)]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} dataKey="value" nameKey="name" label={(props: any) => `${props.name || ''} ${((props.percent || 0) * 100).toFixed(0)}%`} labelLine={false}>
                                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    }

    if (widget.chartType === 'kpi' || widget.chartType === 'kpi-sparkline' || widget.chartType === 'kpi-cards') {
        return (
            <div className="h-full p-4 flex flex-col justify-center">
                <p className="text-xs text-stone-500">{widget.name}</p>
                <p className="text-2xl font-semibold text-stone-900 mt-1">{stats ? stats.followers.toLocaleString() : '—'}</p>
                <p className="text-xs text-emerald-600 mt-1">↑ {stats?.followerGrowth || 0}%</p>
            </div>
        );
    }

    if (widget.chartType === 'funnel') {
        const funnelData = [
            { stage: 'Sent', value: 4200, color: '#E5A100' },
            { stage: 'Delivered', value: 3980, color: '#4A90D9' },
            { stage: 'Read', value: 3150, color: '#50B88C' },
        ];
        return (
            <div className="h-full p-3">
                <p className="text-xs font-medium text-stone-600 mb-3">{widget.name}</p>
                <div className="space-y-2">
                    {funnelData.map((d, i) => (
                        <div key={d.stage}>
                            <div className="flex justify-between text-[10px] text-stone-500 mb-0.5">
                                <span>{d.stage}</span>
                                <span>{d.value.toLocaleString()} ({i === 0 ? '100%' : `${((d.value / funnelData[0].value) * 100).toFixed(1)}%`})</span>
                            </div>
                            <div className="h-5 rounded bg-stone-100 overflow-hidden">
                                <div className="h-full rounded transition-all" style={{ width: `${(d.value / funnelData[0].value) * 100}%`, backgroundColor: d.color }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Default: table or ranked list
    return (
        <div className="h-full p-3">
            <p className="text-xs font-medium text-stone-600 mb-2">{widget.name}</p>
            <p className="text-[11px] text-stone-400">{widget.description}</p>
            <div className="mt-3 space-y-1.5">
                {Array.from({ length: 3 }, (_, i) => (
                    <div key={i} className="flex justify-between text-[10px] p-1.5 rounded bg-stone-50">
                        <span className="text-stone-600">Item {i + 1}</span>
                        <span className="text-stone-400">{Math.floor(seededRandom(widget.id, i) * 1000 + 100)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ---- Post Detail Dialog ----
function PostDetailDialog({ post, open, onClose }: { post: Post | null; open: boolean; onClose: () => void }) {
    if (!post) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-base">Post Performance</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    {/* Post preview */}
                    <div className="p-3 rounded-lg bg-stone-50">
                        <p className="text-sm text-stone-700">{post.caption}</p>
                        <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-[10px] capitalize">{post.type}</Badge>
                            <span className="text-[10px] text-stone-400">{new Date(post.publishedAt).toLocaleDateString()}</span>
                        </div>
                    </div>

                    <Separator />

                    {/* Platform-specific metrics */}
                    {post.channel === 'instagram' && (() => {
                        const p = post as InstagramPost;
                        return (
                            <div>
                                <h4 className="text-xs font-medium text-stone-500 mb-2">Instagram Metrics (Graph API)</h4>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { label: 'Reach', value: p.performance.reach },
                                        { label: 'Views', value: p.performance.views },
                                        { label: 'Likes', value: p.performance.likes },
                                        { label: 'Comments', value: p.performance.comments },
                                        { label: 'Shares', value: p.performance.shares },
                                        { label: 'Saved', value: p.performance.saved },
                                        { label: 'Total Interactions', value: p.performance.totalInteractions },
                                        { label: 'Follows', value: p.performance.follows },
                                        { label: 'Profile Visits', value: p.performance.profileVisits },
                                    ].map(m => (
                                        <div key={m.label} className="p-2 rounded bg-stone-50 text-center">
                                            <p className="text-[10px] text-stone-400">{m.label}</p>
                                            <p className="text-sm font-semibold text-stone-800">{m.value.toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>
                                {p.performance.avgWatchTime && (
                                    <div className="mt-3 p-2 rounded bg-purple-50 border border-purple-200">
                                        <p className="text-[10px] text-purple-600">Reels: Avg Watch Time {p.performance.avgWatchTime}s · Total View Time {(p.performance.totalViewTime || 0).toLocaleString()}s</p>
                                    </div>
                                )}
                                {p.performance.navigation && (
                                    <div className="mt-2 p-2 rounded bg-blue-50 border border-blue-200">
                                        <p className="text-[10px] text-blue-600 mb-1">Story Navigation</p>
                                        <div className="grid grid-cols-4 gap-1">
                                            {Object.entries(p.performance.navigation).map(([k, v]) => (
                                                <div key={k} className="text-center">
                                                    <p className="text-[9px] text-blue-400 capitalize">{k}</p>
                                                    <p className="text-xs font-medium text-blue-700">{v}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {post.channel === 'linkedin' && (() => {
                        const p = post as LinkedInPost;
                        return (
                            <div>
                                <h4 className="text-xs font-medium text-stone-500 mb-2">LinkedIn Metrics (Marketing API)</h4>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { label: 'Impressions', value: p.performance.impressionCount },
                                        { label: 'Unique Reach', value: p.performance.uniqueImpressionsCount },
                                        { label: 'Clicks', value: p.performance.clickCount },
                                        { label: 'Likes', value: p.performance.likeCount },
                                        { label: 'Comments', value: p.performance.commentCount },
                                        { label: 'Shares', value: p.performance.shareCount },
                                        { label: 'Engagement', value: p.performance.engagement },
                                        { label: 'Eng. Rate', value: `${p.performance.engagementRate}%` },
                                    ].map(m => (
                                        <div key={m.label} className="p-2 rounded bg-stone-50 text-center">
                                            <p className="text-[10px] text-stone-400">{m.label}</p>
                                            <p className="text-sm font-semibold text-stone-800">{typeof m.value === 'number' ? m.value.toLocaleString() : m.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}

                    {post.channel === 'whatsapp' && (() => {
                        const p = post as WhatsAppMessage;
                        return (
                            <div>
                                <h4 className="text-xs font-medium text-stone-500 mb-2">WhatsApp Metrics (Business API)</h4>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { label: 'Sent', value: p.performance.sent },
                                        { label: 'Delivered', value: p.performance.delivered },
                                        { label: 'Read', value: p.performance.read },
                                        { label: 'Delivery Rate', value: `${p.performance.deliveryRate}%` },
                                        { label: 'Open Rate', value: `${p.performance.openRate}%` },
                                        { label: 'Button Clicks', value: p.performance.buttonClicks },
                                        { label: 'CTR', value: `${p.performance.ctr}%` },
                                        { label: 'Response Time', value: `${p.performance.responseTime}m` },
                                        { label: 'Cost', value: `$${p.performance.cost.toFixed(2)}` },
                                    ].map(m => (
                                        <div key={m.label} className="p-2 rounded bg-stone-50 text-center">
                                            <p className="text-[10px] text-stone-400">{m.label}</p>
                                            <p className="text-sm font-semibold text-stone-800">{typeof m.value === 'number' ? m.value.toLocaleString() : m.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}

                    {post.channel === 'youtube' && (() => {
                        const p = post as YouTubeVideo;
                        return (
                            <div>
                                <h4 className="text-xs font-medium text-stone-500 mb-2">YouTube Metrics (Data API / Analytics API)</h4>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { label: 'Views', value: p.performance.views },
                                        { label: 'Watch Time (hrs)', value: p.performance.watchTimeHours },
                                        { label: 'Likes', value: p.performance.likes },
                                        { label: 'Comments', value: p.performance.comments },
                                        { label: 'Shares', value: p.performance.shares },
                                        { label: 'Subs Gained', value: p.performance.subscribersGained },
                                        { label: 'Impressions', value: p.performance.impressions },
                                        { label: 'Impressions CTR', value: `${p.performance.impressionsCTR}%` },
                                        { label: 'Avg View Duration', value: `${Math.floor(p.performance.avgViewDuration / 60)}m ${p.performance.avgViewDuration % 60}s` },
                                    ].map(m => (
                                        <div key={m.label} className="p-2 rounded bg-stone-50 text-center">
                                            <p className="text-[10px] text-stone-400">{m.label}</p>
                                            <p className="text-sm font-semibold text-stone-800">{typeof m.value === 'number' ? m.value.toLocaleString() : m.value}</p>
                                        </div>
                                    ))}
                                </div>
                                {p.performance.estimatedRevenue > 0 && (
                                    <div className="mt-3 p-2 rounded bg-green-50 border border-green-200">
                                        <p className="text-[10px] text-green-600">Estimated Revenue: ${p.performance.estimatedRevenue.toFixed(2)} · Avg View: {p.performance.avgViewPercentage}% watched</p>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ---- Main Channel Dashboard ----
interface ChannelDashboardProps {
    channel: ChannelSlug;
    channelName: string;
    channelColor: string;
    channelIcon: React.ReactNode;
}

export function ChannelDashboard({ channel, channelName, channelColor, channelIcon }: ChannelDashboardProps) {
    const [liveStats, setLiveStats] = useState<ChannelStats | null>(null);
    const [liveGrowth, setLiveGrowth] = useState<TimeSeriesPoint[] | null>(null);

    useEffect(() => {
        let cancelled = false;

        const loadLiveData = async () => {
            try {
                if (channel === 'instagram') {
                    const overview = await getIGOverview(30);
                    if (cancelled) return;
                    setLiveStats({
                        channel: 'instagram',
                        followers: overview.followers,
                        followerGrowth: overview.followers_change,
                        engagement: Math.round(overview.followers * overview.engagement_rate / 100),
                        engagementRate: overview.engagement_rate,
                        impressions: overview.impressions,
                        reach: overview.reach,
                        ctr: 0,
                    });
                } else if (channel === 'whatsapp') {
                    const overview = await getWAOverview(30);
                    if (cancelled) return;
                    setLiveStats({
                        channel: 'whatsapp',
                        followers: overview.conversations,
                        followerGrowth: overview.conversations_change,
                        engagement: overview.messages_read,
                        engagementRate: overview.read_rate,
                        impressions: overview.messages_sent,
                        reach: overview.messages_delivered,
                        ctr: overview.delivery_rate,
                    });
                } else if (channel === 'linkedin') {
                    const overview = await getLIOverview('30daysAgo', 'today');
                    if (cancelled) return;
                    setLiveStats({
                        channel: 'linkedin',
                        followers: overview.total_followers,
                        followerGrowth: overview.new_followers,
                        engagement: Math.round(overview.total_followers * overview.avg_engagement_rate / 100),
                        engagementRate: overview.avg_engagement_rate,
                        impressions: overview.total_post_impressions,
                        reach: overview.total_page_views,
                        ctr: 0,
                    });
                } else if (channel === 'youtube') {
                    const [overview, growth] = await Promise.all([
                        getYTOverview('30daysAgo', 'today'),
                        getYTSubscriberGrowth('30daysAgo', 'today'),
                    ]);
                    if (cancelled) return;
                    setLiveStats({
                        channel: 'youtube',
                        followers: overview.subscribers,
                        followerGrowth: growth.net_change,
                        engagement: Math.round(overview.total_views * overview.engagement_rate / 100),
                        engagementRate: overview.engagement_rate,
                        impressions: overview.total_views,
                        reach: overview.views_last_30d,
                        ctr: 0,
                    });
                    setLiveGrowth(
                        (growth.series || []).map((point) => ({
                            date: point.date,
                            value: point.net,
                        }))
                    );
                }
            } catch {
                // Keep stub data fallback when API is unavailable.
                setLiveStats(null);
            }
        };

        setLiveStats(null);
        setLiveGrowth(null);
        loadLiveData();

        return () => {
            cancelled = true;
        };
    }, [channel]);

    const widgets = getWidgetsForChannel(channel);
    const posts = getPostsByChannel(channel);
    const [activeWidgets, setActiveWidgets] = useState<WidgetDefinition[]>(widgets.slice(0, 6));
    const [view, setView] = useState<'widgets' | 'posts'>('widgets');
    const [postView, setPostView] = useState<'grid' | 'list'>('grid');
    const [searchQ, setSearchQ] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('date');
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [widgetSheetOpen, setWidgetSheetOpen] = useState(false);

    // Drag-to-reorder state
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const dragItemRef = useRef<string | null>(null);

    const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
        dragItemRef.current = id;
        e.dataTransfer.effectAllowed = 'move';
        // Make the drag image semi-transparent
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '0.5';
        }
    }, []);

    const handleDragEnd = useCallback((e: React.DragEvent) => {
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '1';
        }
        setDragOverId(null);
        dragItemRef.current = null;
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragItemRef.current && dragItemRef.current !== id) {
            setDragOverId(id);
        }
    }, []);

    const handleDragLeave = useCallback(() => {
        setDragOverId(null);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        const sourceId = dragItemRef.current;
        if (!sourceId || sourceId === targetId) return;

        setActiveWidgets(prev => {
            const newWidgets = [...prev];
            const sourceIdx = newWidgets.findIndex(w => w.id === sourceId);
            const targetIdx = newWidgets.findIndex(w => w.id === targetId);
            if (sourceIdx === -1 || targetIdx === -1) return prev;
            // Remove from source and insert at target position
            const [moved] = newWidgets.splice(sourceIdx, 1);
            newWidgets.splice(targetIdx, 0, moved);
            return newWidgets;
        });

        setDragOverId(null);
        dragItemRef.current = null;
    }, []);

    const filteredPosts = useMemo(() => {
        let result = [...posts];
        if (typeFilter !== 'all') result = result.filter(p => p.type === typeFilter);
        if (searchQ) result = result.filter(p => p.caption.toLowerCase().includes(searchQ.toLowerCase()));
        result.sort((a, b) => {
            if (sortBy === 'date') return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
            // For engagement sorting, use a common metric
            const engA = 'totalInteractions' in (a as InstagramPost).performance
                ? (a as InstagramPost).performance.totalInteractions
                : 'engagement' in (a as LinkedInPost).performance
                    ? (a as LinkedInPost).performance.engagement
                    : a.channel === 'youtube'
                        ? (a as YouTubeVideo).performance.views
                        : (a as WhatsAppMessage).performance.read;
            const engB = 'totalInteractions' in (b as InstagramPost).performance
                ? (b as InstagramPost).performance.totalInteractions
                : 'engagement' in (b as LinkedInPost).performance
                    ? (b as LinkedInPost).performance.engagement
                    : b.channel === 'youtube'
                        ? (b as YouTubeVideo).performance.views
                        : (b as WhatsAppMessage).performance.read;
            return engB - engA;
        });
        return result;
    }, [posts, typeFilter, searchQ, sortBy]);

    const stats = liveStats || channelStats.find(s => s.channel === channel) || null;
    // CHANNEL_TAB_ORDER matches the stub followerGrowthTrend array order:
    // [Instagram=0, LinkedIn=1, WhatsApp=2, YouTube=3, Facebook=4]
    const GROWTH_TREND_ORDER = ['instagram', 'linkedin', 'whatsapp', 'youtube', 'facebook'];
    const chIdx = GROWTH_TREND_ORDER.indexOf(channel);
    const growthData = (liveGrowth || (chIdx >= 0 ? followerGrowthTrend[chIdx]?.data : null) || [])
        .map(p => ({ date: p.date.slice(5), value: p.value }));
    const postTypes = channel === 'instagram' ? ['feed', 'reel', 'story', 'carousel'] : channel === 'linkedin' ? ['post', 'article', 'document', 'video'] : channel === 'youtube' ? ['video', 'short', 'live', 'premiere'] : ['template', 'session', 'interactive'];

    const addWidget = (w: WidgetDefinition) => {
        if (!activeWidgets.find(aw => aw.id === w.id)) {
            setActiveWidgets(prev => [...prev, w]);
        }
        setWidgetSheetOpen(false);
    };

    const removeWidget = (id: string) => {
        setActiveWidgets(prev => prev.filter(w => w.id !== id));
    };

    // Get engagement value for display
    const getEngagement = (post: Post): string => {
        if (post.channel === 'instagram') return `${(post as InstagramPost).performance.totalInteractions.toLocaleString()} interactions`;
        if (post.channel === 'linkedin') return `${(post as LinkedInPost).performance.engagement.toLocaleString()} engagement`;
        if (post.channel === 'youtube') return `${(post as YouTubeVideo).performance.views.toLocaleString()} views`;
        return `${(post as WhatsAppMessage).performance.read.toLocaleString()} read`;
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${channelColor}15`, color: channelColor }}>
                        {channelIcon}
                    </div>
                    <div>
                        <h1 className="text-2xl font-heading font-bold text-stone-900">{channelName}</h1>
                        <p className="text-sm text-stone-500">
                            {stats ? stats.followers.toLocaleString() : '…'} {channel === 'youtube' ? 'subscribers' : 'followers'} · {stats ? `${stats.engagementRate}%` : '…'} engagement rate
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Tabs value={view} onValueChange={(v) => setView(v as 'widgets' | 'posts')}>
                        <TabsList className="bg-stone-100">
                            <TabsTrigger value="widgets" className="text-xs"><BarChart3 className="h-3 w-3 mr-1" /> Dashboard</TabsTrigger>
                            <TabsTrigger value="posts" className="text-xs"><Grid3X3 className="h-3 w-3 mr-1" /> Posts</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricKPI label={channel === 'youtube' ? 'Subscribers' : 'Followers'} value={stats?.followers || 0} change={stats?.followerGrowth} icon={<Users className="h-5 w-5" />} />
                <MetricKPI label="Engagement Rate" value={`${stats?.engagementRate}%`} change={1.2} icon={<TrendingUp className="h-5 w-5" />} />
                <MetricKPI label="Reach" value={stats?.reach || 0} change={8.5} icon={<Eye className="h-5 w-5" />} />
                <MetricKPI label={channel === 'youtube' ? 'Views' : 'Impressions'} value={stats?.impressions || 0} change={12.4} icon={<BarChart3 className="h-5 w-5" />} />
            </div>

            {/* LinkedIn Conversions Section */}
            {channel === 'linkedin' && (
                <Card className="border-blue-100 bg-blue-50/30">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                            LinkedIn Conversions & ROI
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <LinkedInConversionMetrics startDate="30daysAgo" endDate="today" />
                    </CardContent>
                </Card>
            )}

            {view === 'widgets' ? (
                <>
                    {/* Widget Grid */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-medium text-stone-700 flex items-center gap-1.5">
                            <GripVertical className="h-3.5 w-3.5 text-stone-400" /> Drag widgets to rearrange
                        </h2>
                        <Sheet open={widgetSheetOpen} onOpenChange={setWidgetSheetOpen}>
                            <SheetTrigger asChild>
                                <Button variant="outline" size="sm" className="text-xs"><Plus className="mr-1 h-3 w-3" /> Add Widget</Button>
                            </SheetTrigger>
                            <SheetContent className="overflow-hidden">
                                <SheetHeader><SheetTitle>Widget Catalog — {channelName}</SheetTitle></SheetHeader>
                                <div className="mt-4 flex-1 min-h-0 overflow-y-auto">
                                    <div className="space-y-2 pr-1">
                                        {widgets.map(w => {
                                            const isActive = !!activeWidgets.find(aw => aw.id === w.id);
                                            return (
                                                <button
                                                    key={w.id}
                                                    onClick={() => addWidget(w)}
                                                    disabled={isActive}
                                                    className="w-full text-left p-3 rounded-lg bg-stone-50 hover:bg-stone-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="text-sm font-medium text-stone-800">{w.name}</p>
                                                            <p className="text-[11px] text-stone-400 mt-0.5">{w.description}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className="text-[9px] shrink-0">{w.chartType}</Badge>
                                                            {isActive && <Badge className="text-[9px] bg-emerald-100 text-emerald-700">Added</Badge>}
                                                        </div>
                                                    </div>
                                                    {w.apiMetric && <p className="text-[9px] text-stone-300 mt-1 font-mono">API: {w.apiMetric}</p>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeWidgets.map(w => (
                            <Card
                                key={w.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, w.id)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => handleDragOver(e, w.id)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, w.id)}
                                className={`card-hover relative group min-h-[220px] transition-all duration-200 ${dragOverId === w.id
                                    ? 'ring-2 ring-amber-400 ring-offset-2 scale-[1.02]'
                                    : ''
                                    }`}
                            >
                                {/* Drag handle */}
                                <div className="absolute top-0 left-0 right-0 h-7 flex items-center justify-center cursor-grab active:cursor-grabbing z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-b from-stone-100/80 to-transparent rounded-t-lg">
                                    <GripVertical className="h-3.5 w-3.5 text-stone-400" />
                                </div>
                                {/* Remove button */}
                                <button onClick={() => removeWidget(w.id)} className="absolute top-1.5 right-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-1 shadow-sm text-stone-400 hover:text-red-500 hover:bg-red-50">
                                    ×
                                </button>
                                <WidgetRenderer widget={w} channel={channel} stats={stats} growthData={growthData} />
                            </Card>
                        ))}
                        {activeWidgets.length === 0 && (
                            <Card className="col-span-full py-12">
                                <CardContent className="text-center text-stone-400">
                                    <p>No widgets added. Click &ldquo;Add Widget&rdquo; to start building your dashboard.</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </>
            ) : (
                <>
                    {/* Post Browser */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
                            <Input placeholder="Search posts..." value={searchQ} onChange={e => setSearchQ(e.target.value)} className="pl-9 h-8 text-sm" />
                        </div>
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                {postTypes.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="date">By Date</SelectItem>
                                <SelectItem value="engagement">By Engagement</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="flex gap-1">
                            <Button variant={postView === 'grid' ? 'default' : 'outline'} size="icon" className="h-8 w-8" onClick={() => setPostView('grid')}><Grid3X3 className="h-3.5 w-3.5" /></Button>
                            <Button variant={postView === 'list' ? 'default' : 'outline'} size="icon" className="h-8 w-8" onClick={() => setPostView('list')}><List className="h-3.5 w-3.5" /></Button>
                        </div>
                    </div>

                    {filteredPosts.length === 0 ? (
                        <Card><CardContent className="py-12 text-center text-stone-400 text-sm">No posts match the current filters.</CardContent></Card>
                    ) : postView === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredPosts.map(post => (
                                <Card key={post.id} className="card-hover cursor-pointer" onClick={() => setSelectedPost(post)}>
                                    <CardContent className="pt-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Badge variant="outline" className="text-[10px] capitalize">{post.type}</Badge>
                                            <span className="text-[10px] text-stone-400">{new Date(post.publishedAt).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-sm text-stone-700 line-clamp-2">{post.caption}</p>
                                        <Separator className="my-2" />
                                        <p className="text-xs text-stone-500">{getEngagement(post)}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredPosts.map(post => (
                                <Card key={post.id} className="card-hover cursor-pointer" onClick={() => setSelectedPost(post)}>
                                    <CardContent className="py-3">
                                        <div className="flex items-center gap-4">
                                            <Badge variant="outline" className="text-[10px] capitalize shrink-0">{post.type}</Badge>
                                            <p className="text-sm text-stone-700 flex-1 truncate">{post.caption}</p>
                                            <span className="text-xs text-stone-500 shrink-0">{getEngagement(post)}</span>
                                            <span className="text-[10px] text-stone-400 shrink-0">{new Date(post.publishedAt).toLocaleDateString()}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Post Detail Dialog */}
            <PostDetailDialog post={selectedPost} open={!!selectedPost} onClose={() => setSelectedPost(null)} />
        </div>
    );
}
