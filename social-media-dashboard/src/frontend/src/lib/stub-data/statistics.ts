import { ChannelStats, DemographicData, TimeSeries } from '@/types';

export const channelStats: ChannelStats[] = [
    {
        channel: 'instagram',
        followers: 28400,
        followerGrowth: 5.2,
        engagement: 3420,
        engagementRate: 4.8,
        impressions: 156000,
        reach: 89000,
        ctr: 2.3,
        paidReach: 32000,
        organicReach: 57000,
        paidImpressions: 62000,
        organicImpressions: 94000,
    },
    {
        channel: 'linkedin',
        followers: 12300,
        followerGrowth: 3.1,
        engagement: 1580,
        engagementRate: 3.2,
        impressions: 87000,
        reach: 45000,
        ctr: 1.8,
        paidReach: 15000,
        organicReach: 30000,
        paidImpressions: 35000,
        organicImpressions: 52000,
    },
    {
        channel: 'whatsapp',
        followers: 5200,
        followerGrowth: 8.7,
        engagement: 4100,
        engagementRate: 78.0,
        impressions: 12000,
        reach: 5100,
        ctr: 12.5,
    },
    {
        channel: 'youtube',
        followers: 8750,
        followerGrowth: 6.4,
        engagement: 2890,
        engagementRate: 5.6,
        impressions: 342000,
        reach: 198000,
        ctr: 4.2,
        paidReach: 48000,
        organicReach: 150000,
        paidImpressions: 92000,
        organicImpressions: 250000,
    },
    {
        channel: 'facebook',
        followers: 22800,
        followerGrowth: 4.6,
        engagement: 2740,
        engagementRate: 3.8,
        impressions: 124000,
        reach: 71000,
        ctr: 1.9,
        paidReach: 28000,
        organicReach: 43000,
        paidImpressions: 48000,
        organicImpressions: 76000,
    },
];

export const followerGrowthTrend: TimeSeries[] = [
    {
        label: 'Instagram',
        color: '#E4405F',
        data: [
            { date: '2026-01-01', value: 24200 },
            { date: '2026-01-15', value: 24800 },
            { date: '2026-02-01', value: 25600 },
            { date: '2026-02-15', value: 26900 },
            { date: '2026-03-01', value: 28400 },
        ],
    },
    {
        label: 'LinkedIn',
        color: '#0A66C2',
        data: [
            { date: '2026-01-01', value: 10800 },
            { date: '2026-01-15', value: 11100 },
            { date: '2026-02-01', value: 11500 },
            { date: '2026-02-15', value: 11900 },
            { date: '2026-03-01', value: 12300 },
        ],
    },
    {
        label: 'WhatsApp',
        color: '#25D366',
        data: [
            { date: '2026-01-01', value: 3800 },
            { date: '2026-01-15', value: 4100 },
            { date: '2026-02-01', value: 4500 },
            { date: '2026-02-15', value: 4800 },
            { date: '2026-03-01', value: 5200 },
        ],
    },
    {
        label: 'YouTube',
        color: '#FF0000',
        data: [
            { date: '2026-01-01', value: 6800 },
            { date: '2026-01-15', value: 7200 },
            { date: '2026-02-01', value: 7600 },
            { date: '2026-02-15', value: 8100 },
            { date: '2026-03-01', value: 8750 },
        ],
    },
    {
        label: 'Facebook',
        color: '#1877F2',
        data: [
            { date: '2026-01-01', value: 18500 },
            { date: '2026-01-15', value: 19200 },
            { date: '2026-02-01', value: 20100 },
            { date: '2026-02-15', value: 21400 },
            { date: '2026-03-01', value: 22800 },
        ],
    },
];

export const geographyData: DemographicData[] = [
    { label: 'India', value: 18200, percentage: 39.6 },
    { label: 'United States', value: 8400, percentage: 18.3 },
    { label: 'United Kingdom', value: 5100, percentage: 11.1 },
    { label: 'UAE', value: 3800, percentage: 8.3 },
    { label: 'Australia', value: 2900, percentage: 6.3 },
    { label: 'Others', value: 7500, percentage: 16.4 },
];

export const ageData: DemographicData[] = [
    { label: '18-24', value: 8200, percentage: 17.8 },
    { label: '25-34', value: 16400, percentage: 35.7 },
    { label: '35-44', value: 11800, percentage: 25.7 },
    { label: '45-54', value: 6100, percentage: 13.3 },
    { label: '55+', value: 3400, percentage: 7.5 },
];

export const engagementTrend: TimeSeries[] = [
    {
        label: 'Combined Engagement',
        color: '#E5A100',
        data: Array.from({ length: 30 }, (_, i) => ({
            date: `2026-02-${String(i + 1).padStart(2, '0')}`,
            value: Math.floor(2800 + Math.random() * 1200 + i * 15),
        })),
    },
];
