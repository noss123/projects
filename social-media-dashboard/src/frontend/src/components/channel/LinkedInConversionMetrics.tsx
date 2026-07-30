import React, { useEffect, useState } from 'react';
import { getLIConversions, getLICampaignPerformance, getLIROI, LIConversionResponse, LICampaignConversionResponse, LIROIResponse } from '@/lib/api/li-api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface ConversionMetricsProps {
    startDate: string;
    endDate: string;
}

export function LinkedInConversionMetrics({ startDate, endDate }: ConversionMetricsProps) {
    const [conversions, setConversions] = useState<LIConversionResponse | null>(null);
    const [campaigns, setCampaigns] = useState<LICampaignConversionResponse | null>(null);
    const [roi, setROI] = useState<LIROIResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [convData, campData, roiData] = await Promise.all([
                    getLIConversions(startDate, endDate),
                    getLICampaignPerformance(startDate, endDate),
                    getLIROI(startDate, endDate),
                ]);

                setConversions(convData);
                setCampaigns(campData);
                setROI(roiData);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load conversion metrics');
                console.error('Error fetching conversion metrics:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [startDate, endDate]);

    if (loading) {
        return <ConversionMetricsLoading />;
    }

    if (error) {
        return (
            <Card className="border-red-200 bg-red-50">
                <CardHeader>
                    <CardTitle>Error Loading Conversions</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-red-600">{error}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Conversion Overview</TabsTrigger>
                <TabsTrigger value="campaigns">Campaign Performance</TabsTrigger>
                <TabsTrigger value="roi">ROI Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
                <ConversionOverviewTab data={conversions} />
            </TabsContent>

            <TabsContent value="campaigns" className="space-y-4">
                <CampaignPerformanceTab data={campaigns} />
            </TabsContent>

            <TabsContent value="roi" className="space-y-4">
                <ROIAnalysisTab data={roi} />
            </TabsContent>
        </Tabs>
    );
}

function ConversionOverviewTab({ data }: { data: LIConversionResponse | null }) {
    if (!data) return null;

    const summary = data.summary;

    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total Conversions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{summary.total_conversions}</div>
                    <p className="text-xs text-gray-500">
                        {summary.unique_conversions} unique conversions
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        ${summary.total_conversion_value.toFixed(2)}
                    </div>
                    <p className="text-xs text-gray-500">USD</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Avg Value</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        ${summary.avg_conversion_value.toFixed(2)}
                    </div>
                    <p className="text-xs text-gray-500">per conversion</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{summary.conversion_rate.toFixed(2)}%</div>
                    <p className="text-xs text-gray-500">of total clicks</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Reporting Date</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-sm font-medium">{summary.date}</div>
                    <p className="text-xs text-gray-500">Latest update</p>
                </CardContent>
            </Card>

            <Card className="md:col-span-2 lg:col-span-5">
                <CardHeader>
                    <CardTitle className="text-sm">Recent Conversions</CardTitle>
                    <CardDescription>Latest conversion records</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {data.conversions.slice(0, 5).map((conv) => (
                            <div key={conv.conversion_id} className="flex items-center justify-between border-b pb-3 last:border-0">
                                <div className="flex-1">
                                    <p className="text-sm font-medium">{conv.campaign_name}</p>
                                    <p className="text-xs text-gray-500">{conv.conversion_type}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium">${conv.conversion_value.toFixed(2)}</p>
                                    <p className="text-xs text-gray-500">{conv.date}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function CampaignPerformanceTab({ data }: { data: LICampaignConversionResponse | null }) {
    if (!data) return null;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${data.total_spend.toFixed(2)}</div>
                        <p className="text-xs text-gray-500">All campaigns</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Conversions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.total_conversions}</div>
                        <p className="text-xs text-gray-500">Total conversions</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${data.total_conversion_value.toFixed(2)}</div>
                        <p className="text-xs text-gray-500">Return</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">ROAS</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.overall_roas.toFixed(2)}x</div>
                        <p className="text-xs text-gray-500">Overall return</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Campaign Performance Details</CardTitle>
                    <CardDescription>Individual campaign metrics and performance</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {data.campaigns.map((camp) => (
                            <div key={camp.campaign_id} className="border rounded-lg p-4 space-y-3">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-semibold">{camp.campaign_name}</p>
                                        <p className="text-xs text-gray-500">{camp.campaign_id}</p>
                                    </div>
                                    <Badge variant={camp.status === 'active' ? 'default' : 'secondary'}>
                                        {camp.status}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                                    <div>
                                        <p className="text-xs text-gray-500">Spend</p>
                                        <p className="font-semibold">${camp.spend.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Conversions</p>
                                        <p className="font-semibold">{camp.conversions}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Value</p>
                                        <p className="font-semibold">${camp.conversion_value.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">ROAS</p>
                                        <p className="font-semibold">{camp.roas.toFixed(2)}x</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                                    <div>
                                        <p className="text-xs text-gray-500">CPC</p>
                                        <p className="text-sm font-medium">${camp.cpc.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">CTR</p>
                                        <p className="text-sm font-medium">{camp.ctr.toFixed(2)}%</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Impressions</p>
                                        <p className="text-sm font-medium">{(camp.impressions / 1000).toFixed(0)}K</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function ROIAnalysisTab({ data }: { data: LIROIResponse | null }) {
    if (!data) return null;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Portfolio ROI</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.portfolio_roi.toFixed(1)}%</div>
                        <p className="text-xs text-gray-500">Overall return</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${data.total_spend.toFixed(2)}</div>
                        <p className="text-xs text-gray-500">Investment</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${data.total_revenue.toFixed(2)}</div>
                        <p className="text-xs text-gray-500">Generated</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${(data.total_revenue - data.total_spend).toFixed(2)}
                        </div>
                        <p className="text-xs text-gray-500">Revenue - Spend</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Campaign ROI Breakdown</CardTitle>
                    <CardDescription>Individual campaign ROI analysis</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {data.roi_data.map((roi) => (
                            <div key={roi.campaign_id} className="border rounded-lg p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold">{roi.campaign_name}</p>
                                        <p className="text-xs text-gray-500">{roi.campaign_id}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-2xl font-bold ${roi.roi_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {roi.roi_percentage.toFixed(1)}%
                                        </p>
                                        <p className="text-xs text-gray-500">ROI</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                                    <div>
                                        <p className="text-xs text-gray-500">Spend</p>
                                        <p className="font-semibold">${roi.total_spend.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Revenue</p>
                                        <p className="font-semibold">${roi.total_revenue.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Multiplier</p>
                                        <p className="font-semibold">{roi.roi_multiplier.toFixed(2)}x</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Payback</p>
                                        <p className="font-semibold">{roi.payback_period_days} days</p>
                                    </div>
                                </div>

                                {roi.break_even_date && (
                                    <div className="pt-2 border-t">
                                        <p className="text-xs text-gray-500">Break-even date</p>
                                        <p className="text-sm font-medium">{roi.break_even_date}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function ConversionMetricsLoading() {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                {[...Array(5)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="pb-3">
                            <Skeleton className="h-4 w-3/4" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-1/2" />
                            <Skeleton className="mt-2 h-3 w-3/4" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
