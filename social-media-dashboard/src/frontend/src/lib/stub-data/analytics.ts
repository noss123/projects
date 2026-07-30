import { PostTypePerformance, OptimalPostingTime, HeatmapCell } from '@/types';

export const postTypePerformance: PostTypePerformance[] = [
    { type: 'IG Reel', reach: 45000, comments: 890, shares: 1200, engagement: 5.2 },
    { type: 'IG Carousel', reach: 32000, comments: 620, shares: 450, engagement: 4.1 },
    { type: 'IG Feed Post', reach: 28000, comments: 340, shares: 280, engagement: 3.5 },
    { type: 'IG Story', reach: 18000, comments: 0, shares: 120, engagement: 2.8 },
    { type: 'FB Post', reach: 38000, comments: 520, shares: 680, engagement: 4.3 },
    { type: 'FB Reel', reach: 52000, comments: 710, shares: 1400, engagement: 5.8 },
    { type: 'LI Article', reach: 12000, comments: 180, shares: 340, engagement: 3.9 },
    { type: 'LI Post', reach: 9500, comments: 140, shares: 210, engagement: 3.2 },
    { type: 'YT Video', reach: 67800, comments: 312, shares: 890, engagement: 5.6 },
    { type: 'YT Short', reach: 128000, comments: 456, shares: 2340, engagement: 7.8 },
];

export const optimalPostingTimes: OptimalPostingTime[] = [
    { hour: 9, day: 'Monday', engagement: 4.2 },
    { hour: 12, day: 'Tuesday', engagement: 5.1 },
    { hour: 18, day: 'Wednesday', engagement: 6.3 },
    { hour: 10, day: 'Thursday', engagement: 4.8 },
    { hour: 14, day: 'Friday', engagement: 5.5 },
    { hour: 11, day: 'Saturday', engagement: 7.2 },
    { hour: 16, day: 'Sunday', engagement: 4.0 },
];

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const heatmapData: HeatmapCell[] = days.flatMap(day =>
    Array.from({ length: 24 }, (_, hour) => ({
        day,
        hour,
        value: Math.floor(Math.random() * 100),
    }))
);

// Scores are normalised 0-100; reflect the relative platform strengths
// consistent with the follower/engagement ratios in statistics stub data
export const spiderChartData = [
    { metric: 'Reach',           instagram: 85, facebook: 79, linkedin: 60, whatsapp: 40, youtube: 78 },
    { metric: 'Engagement',      instagram: 78, facebook: 62, linkedin: 55, whatsapp: 92, youtube: 72 },
    { metric: 'Growth',          instagram: 65, facebook: 57, linkedin: 48, whatsapp: 88, youtube: 74 },
    { metric: 'Content Quality', instagram: 90, facebook: 82, linkedin: 75, whatsapp: 60, youtube: 85 },
    { metric: 'Response Time',   instagram: 45, facebook: 50, linkedin: 50, whatsapp: 95, youtube: 35 },
    { metric: 'Conversion',      instagram: 55, facebook: 60, linkedin: 70, whatsapp: 82, youtube: 62 },
];
