'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartCard, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from '@/components/charts/ChartComponents';
import { competitors as initialCompetitors, CLUB_ARTIZEN_STUB } from '@/lib/stub-data/competitors';
import { competitorInsights as stubCompInsights } from '@/lib/stub-data/predictive';
import { useAllChannelsData } from '@/lib/hooks/useAllChannelsData';
import { getCompetitors, refreshCompetitors, addCompetitor, AddCompetitorPayload } from '@/lib/api/competitors-api';
import { getTrendsInsights, type TrendsInsightsResponse } from '@/lib/api/trends-api';
import { Plus, Award, Wifi, WifiOff, RefreshCw, Loader2, TrendingUp, Check, AlertCircle, Eye, Users, Lightbulb } from 'lucide-react';
import { Competitor, CompetitorInsight } from '@/types';

const trendColors = ['#E4405F', '#0A66C2', '#9B6AD4', '#50B88C', '#E5A100', '#C75B39'];

const sourceStyles: Record<string, { label: string; className: string }> = {
    live: { label: '🟢 Live Data', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    cache: { label: 'Cached', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    fallback: { label: '📊 Sample Data', className: 'bg-stone-100 text-stone-600 border-stone-200' },
};

export default function CompetitorsPage() {
    // ── Competitor API State ────────────────────────────────────────────────
    const [compList, setCompList] = useState<Competitor[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [compLoading, setCompLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [dataSource, setDataSource] = useState<string>('fallback');
    const [lastUpdated, setLastUpdated] = useState<string>('');
    const [trendsData, setTrendsData] = useState<TrendsInsightsResponse | null>(null);

    // ── Add Competitor Form State ───────────────────────────────────────────
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState<AddCompetitorPayload>({
        name: '',
        instagram: '',
        facebook: '',
        linkedin: '',
        youtube: '',
        website: '',
    });
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

    // ── Live data for Club Artizen's own row ────────────────────────────────
    const { channelStats, followerGrowthTrend, loading: artizenLoading } = useAllChannelsData();

    // Derive Club Artizen's metrics from live data (falls back to stubs)
    const igStats = channelStats.find(s => s.channel === 'instagram');
    const fbStats = channelStats.find(s => s.channel === 'facebook');
    const liStats = channelStats.find(s => s.channel === 'linkedin');
    const ytStats = channelStats.find(s => s.channel === 'youtube');

    const artizenInstagram = igStats?.followers ?? CLUB_ARTIZEN_STUB.instagram;
    const artizenFacebook = fbStats?.followers ?? CLUB_ARTIZEN_STUB.facebook;
    const artizenLinkedIn = liStats?.followers ?? CLUB_ARTIZEN_STUB.linkedin;
    const artizenYouTube = ytStats?.followers ?? CLUB_ARTIZEN_STUB.youtube;

    const engRates = [igStats, fbStats, liStats, ytStats].filter(Boolean).map(s => s!.engagementRate);
    const artizenEngagement = engRates.length > 0
        ? Number((engRates.reduce((a, b) => a + b, 0) / engRates.length).toFixed(1))
        : CLUB_ARTIZEN_STUB.engagement;

    const growthRates = [igStats, fbStats, liStats].filter(Boolean).map(s => s!.followerGrowth);
    const artizenGrowth = growthRates.length > 0
        ? Number((growthRates.reduce((a, b) => a + b, 0) / growthRates.length).toFixed(1))
        : CLUB_ARTIZEN_STUB.growth;

    const artizenIgGrowthSeries = (followerGrowthTrend[0]?.data ?? []).map(p => p.value);
    const hasLiveData = !artizenLoading && (igStats || fbStats || liStats) !== undefined;

    // ── Fetch Competitor Data API ───────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setCompLoading(true);
        try {
            const result = await getCompetitors();
            setCompList(result.competitors);
            setSelected(result.competitors.map(c => c.id));
            setDataSource(result.source);
            setLastUpdated(result.lastUpdated);
        } catch {
            // FALLBACK TO STUBS if the API fails
            setCompList(initialCompetitors);
            setSelected(initialCompetitors.map(c => c.id));
            setDataSource('fallback');
        } finally {
            setCompLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const loadTrendsInsights = async () => {
            const result = await getTrendsInsights();
            setTrendsData(result);
        };
        loadTrendsInsights().catch(() => setTrendsData(null));
    }, []);

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await refreshCompetitors();
            await fetchData();
        } catch {
            // Refresh failed — data stays as-is
        } finally {
            setRefreshing(false);
        }
    };

    const handleAddCompetitor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;

        setIsSubmitting(true);
        setSubmitStatus('idle');

        try {
            // Filter out empty strings
            const payload: AddCompetitorPayload = {
                name: formData.name,
                ...(formData.instagram && { instagram: formData.instagram }),
                ...(formData.facebook && { facebook: formData.facebook }),
                ...(formData.linkedin && { linkedin: formData.linkedin }),
                ...(formData.youtube && { youtube: formData.youtube }),
                ...(formData.website && { website: formData.website }),
            };

            await addCompetitor(payload);
            setSubmitStatus('success');

            // Refresh the list after a short delay
            setTimeout(() => {
                fetchData();
                setIsAddOpen(false);
                setFormData({ name: '', instagram: '', facebook: '', linkedin: '', youtube: '', website: '' });
                setSubmitStatus('idle');
            }, 1500);
        } catch (err) {
            console.error('Failed to add competitor:', err);
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Derived Chart & Insight Data ────────────────────────────────────────
    const filtered = compList.filter(c => selected.includes(c.id));

    const growthData = filtered[0]?.growthTrend.map((_, i) => {
        const point: Record<string, string | number> = {
            date: filtered[0].growthTrend[i].date.slice(5),
        };
        filtered.forEach(c => { point[c.name] = c.growthTrend[i]?.value ?? 0; });

        // Club Artizen: use live Instagram follower growth series, or stub
        const stubArtizenValues = [24200, 25400, 26800, 27600, 28400];
        point['Club Artizen'] = artizenIgGrowthSeries[i] ?? stubArtizenValues[i] ?? 0;
        return point;
    }) ?? [];

    const toggleCompetitor = (id: string) => {
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    // Calculate insights
    const bestComp = [...filtered].sort((a, b) => b.metrics.engagement - a.metrics.engagement)[0];
    const fastestComp = [...filtered].sort((a, b) => b.metrics.growth - a.metrics.growth)[0];
    const sourceInfo = sourceStyles[dataSource] || sourceStyles.fallback;
    const compInsights: CompetitorInsight[] = trendsData?.competitor_insights?.map(ci => ({
        competitorName: ci.competitor_name,
        observation: ci.observation,
        opportunity: ci.opportunity,
    })) || stubCompInsights;

    // ── Loading State ───────────────────────────────────────────────────────
    if (compLoading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-heading font-bold text-stone-900">Competitors</h1>
                    <p className="text-sm text-stone-500 mt-1">Loading competitor data…</p>
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

    // ── Main Render ─────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-heading font-bold text-stone-900">Competitors</h1>
                    <p className="text-sm text-stone-500 mt-1">Track and compare against your competitors.</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Club Artizen Live Data Indicator */}
                    <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${hasLiveData
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-stone-100 text-stone-500 border border-stone-200'
                        }`}>
                        {hasLiveData
                            ? <><Wifi className="h-3 w-3" /> Your data is live</>
                            : <><WifiOff className="h-3 w-3" /> Using stub data</>
                        }
                    </div>

                    {/* Competitor API Status Indicator */}
                    <Badge variant="outline" className={`text-xs ${sourceInfo.className}`}>
                        {sourceInfo.label}
                    </Badge>

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

                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                                <Plus className="mr-2 h-4 w-4" /> Add Competitor
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Add New Competitor</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleAddCompetitor} className="space-y-4 pt-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">Name</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Company Name"
                                        className="col-span-3"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="ig" className="text-right text-xs">Instagram</Label>
                                    <Input
                                        id="ig"
                                        value={formData.instagram}
                                        onChange={e => setFormData({ ...formData, instagram: e.target.value })}
                                        placeholder="handle (no @)"
                                        className="col-span-3 h-8 text-sm"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="fb" className="text-right text-xs">Facebook</Label>
                                    <Input
                                        id="fb"
                                        value={formData.facebook}
                                        onChange={e => setFormData({ ...formData, facebook: e.target.value })}
                                        placeholder="page-id or name"
                                        className="col-span-3 h-8 text-sm"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="li" className="text-right text-xs">LinkedIn</Label>
                                    <Input
                                        id="li"
                                        value={formData.linkedin}
                                        onChange={e => setFormData({ ...formData, linkedin: e.target.value })}
                                        placeholder="company-slug"
                                        className="col-span-3 h-8 text-sm"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="yt" className="text-right text-xs">YouTube</Label>
                                    <Input
                                        id="yt"
                                        value={formData.youtube}
                                        onChange={e => setFormData({ ...formData, youtube: e.target.value })}
                                        placeholder="@channelhandle"
                                        className="col-span-3 h-8 text-sm"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="web" className="text-right text-xs">Website</Label>
                                    <Input
                                        id="web"
                                        value={formData.website}
                                        onChange={e => setFormData({ ...formData, website: e.target.value })}
                                        placeholder="https://..."
                                        className="col-span-3 h-8 text-sm"
                                    />
                                </div>

                                <div className="flex flex-col gap-2 pt-4">
                                    <Button
                                        type="submit"
                                        className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                                        disabled={isSubmitting || submitStatus === 'success'}
                                    >
                                        {isSubmitting ? (
                                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...</>
                                        ) : submitStatus === 'success' ? (
                                            <><Check className="mr-2 h-4 w-4" /> Added Successfully</>
                                        ) : (
                                            'Add Competitor'
                                        )}
                                    </Button>

                                    {submitStatus === 'error' && (
                                        <div className="flex items-center gap-2 text-xs text-red-600 justify-center">
                                            <AlertCircle className="h-3 w-3" />
                                            Failed to add competitor. Please try again.
                                        </div>
                                    )}
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Competitor Chips */}
            <div className="flex flex-wrap gap-2">
                {compList.map(c => (
                    <Badge
                        key={c.id}
                        variant={selected.includes(c.id) ? 'default' : 'outline'}
                        className={`cursor-pointer transition-all text-sm py-1 px-3 ${selected.includes(c.id) ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'hover:bg-stone-100'}`}
                        onClick={() => toggleCompetitor(c.id)}
                    >
                        {c.name}
                    </Badge>
                ))}
            </div>

            {/* Competitor Spotlight */}
            <div>
                <h2 className="text-sm font-medium text-stone-700 mb-3 flex items-center gap-2">
                    <Eye className="h-4 w-4 text-amber-500" /> Competitor Spotlight
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {compInsights.map((ci, idx) => (
                        <Card key={idx} className="card-hover border-l-4 border-l-amber-400">
                            <CardContent className="pt-4 pb-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <Users className="h-4 w-4 text-stone-400" />
                                    <span className="text-sm font-medium text-stone-800">{ci.competitorName}</span>
                                </div>
                                <p className="text-xs text-stone-500 leading-relaxed mb-3">{ci.observation}</p>
                                <div className="p-2 rounded-md bg-emerald-50 border border-emerald-200">
                                    <p className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                                        <Lightbulb className="h-3 w-3" /> Opportunity
                                    </p>
                                    <p className="text-xs text-emerald-600 mt-0.5">{ci.opportunity}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Comparison Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium text-stone-700">Comparison Data</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Company</TableHead>
                                <TableHead className="text-right">Instagram</TableHead>
                                <TableHead className="text-right">Facebook</TableHead>
                                <TableHead className="text-right">LinkedIn</TableHead>
                                <TableHead className="text-right">YouTube</TableHead>
                                <TableHead className="text-right">Avg Engagement</TableHead>
                                <TableHead className="text-right">Posts/Week</TableHead>
                                <TableHead className="text-right">Avg Growth</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {/* Club Artizen row — sourced from live data */}
                            <TableRow className="bg-amber-50/50">
                                <TableCell className="font-medium text-amber-800">
                                    Club Artizen (You)
                                    {hasLiveData && (
                                        <Badge className="ml-2 text-[9px] bg-emerald-100 text-emerald-700 py-0">Live</Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                    {artizenLoading ? '…' : artizenInstagram.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                    {artizenLoading ? '…' : artizenFacebook.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                    {artizenLoading ? '…' : artizenLinkedIn.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                    {artizenLoading ? '…' : artizenYouTube.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                    {artizenLoading ? '…' : `${artizenEngagement}%`}
                                </TableCell>
                                <TableCell className="text-right">
                                    {CLUB_ARTIZEN_STUB.postsPerWeek}
                                    <span className="text-[10px] text-stone-400 ml-1">(est.)</span>
                                </TableCell>
                                <TableCell className="text-right text-emerald-600 font-medium">
                                    {artizenLoading ? '…' : `+${artizenGrowth}%`}
                                </TableCell>
                            </TableRow>

                            {/* Competitor rows */}
                            {filtered.map(c => (
                                <TableRow key={c.id}>
                                    <TableCell className="font-medium">{c.name}</TableCell>
                                    <TableCell className="text-right">{c.metrics.instagram?.toLocaleString() ?? '-'}</TableCell>
                                    <TableCell className="text-right">{c.metrics.facebook?.toLocaleString() ?? '-'}</TableCell>
                                    <TableCell className="text-right">{c.metrics.linkedin?.toLocaleString() ?? '-'}</TableCell>
                                    <TableCell className="text-right">{c.metrics.youtube?.toLocaleString() ?? '-'}</TableCell>
                                    <TableCell className="text-right">{c.metrics.engagement}%</TableCell>
                                    <TableCell className="text-right">{c.metrics.postsPerWeek}</TableCell>
                                    <TableCell className="text-right text-emerald-600">+{c.metrics.growth}%</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Growth Trends */}
            <ChartCard title="Instagram Follower Growth Comparison" description="Club Artizen vs competitors — sourced from live data when available">
                <div className="h-72">
                    {growthData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-stone-400 text-sm">
                            No growth data available — select at least one competitor.
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={growthData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#78716C' }} />
                                <YAxis tick={{ fontSize: 11, fill: '#78716C' }} />
                                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E7E5E4', fontSize: 12 }} />
                                <Line type="monotone" dataKey="Club Artizen" stroke="#E5A100" strokeWidth={2.5} dot={{ r: 3 }} />
                                {filtered.map((c, i) => (
                                    <Line
                                        key={c.id}
                                        type="monotone"
                                        dataKey={c.name}
                                        stroke={trendColors[i % trendColors.length]}
                                        strokeWidth={1.5}
                                        strokeDasharray="5 5"
                                        dot={{ r: 2 }}
                                    />
                                ))}
                                <Legend />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </ChartCard>

            {/* Dynamic Insight Callouts Combined */}
            {filtered.length > 0 && bestComp && fastestComp && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-amber-200 bg-amber-50/50">
                        <CardContent className="py-4">
                            <div className="flex items-start gap-3">
                                <Award className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-amber-900">Your Standing</p>
                                    <p className="text-xs text-amber-700 mt-1">
                                        <strong>{bestComp.name}</strong> leads with {bestComp.metrics.engagement}% engagement
                                        — {bestComp.metrics.postsPerWeek} posts/week vs your {CLUB_ARTIZEN_STUB.postsPerWeek}.
                                        {bestComp.metrics.engagement > artizenEngagement
                                            ? ` They outperform your current ${artizenEngagement}% avg engagement rate. Consider increasing content frequency to close the gap.`
                                            : ` You are outperforming them on engagement (${artizenEngagement}% vs ${bestComp.metrics.engagement}%). Keep up the great work!`
                                        }
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-emerald-200 bg-emerald-50/50">
                        <CardContent className="py-4">
                            <div className="flex items-start gap-3">
                                <TrendingUp className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-emerald-900">Market Movers</p>
                                    <p className="text-xs text-emerald-700 mt-1">
                                        <strong>{fastestComp.name}</strong> is currently growing the fastest at a rate of +{fastestComp.metrics.growth}%.
                                        Meanwhile, <strong>{bestComp.name}</strong> captures the highest audience interaction at {bestComp.metrics.engagement}% engagement.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Last updated */}
            {lastUpdated && (
                <p className="text-[10px] text-stone-400 text-right">
                    Last updated: {new Date(lastUpdated).toLocaleString()}
                </p>
            )}
        </div>
    );
}
