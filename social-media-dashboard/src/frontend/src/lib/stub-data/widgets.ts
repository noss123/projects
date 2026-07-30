import { WidgetDefinition } from '@/types';

// Main dashboard widgets
export const mainDashboardWidgets: WidgetDefinition[] = [
    { id: 'w-overview', name: 'Channel Health Overview', description: 'Color-coded health status of all channels', category: 'Overview', defaultSize: 'lg', minW: 4, minH: 2, channel: 'all', chartType: 'scorecard' },
    { id: 'w-followers', name: 'Total Followers', description: 'Combined follower count across all channels', category: 'Overview', defaultSize: 'sm', minW: 2, minH: 2, channel: 'all', chartType: 'kpi' },
    { id: 'w-engagement-trend', name: 'Engagement Trend', description: '30-day engagement trend line', category: 'Engagement', defaultSize: 'md', minW: 3, minH: 2, channel: 'all', chartType: 'line' },
    { id: 'w-reach-overview', name: 'Reach Overview', description: 'Total reach across channels', category: 'Overview', defaultSize: 'sm', minW: 2, minH: 2, channel: 'all', chartType: 'kpi' },
    { id: 'w-top-posts', name: 'Top Performing Posts', description: 'Highest engagement posts this week', category: 'Content', defaultSize: 'md', minW: 3, minH: 3, channel: 'all', chartType: 'list' },
    { id: 'w-channel-comparison', name: 'Channel Comparison', description: 'Side-by-side channel metrics', category: 'Overview', defaultSize: 'lg', minW: 4, minH: 2, channel: 'all', chartType: 'grouped-bar' },
];

// Instagram-specific widgets (based on META Graph API)
export const instagramWidgets: WidgetDefinition[] = [
    { id: 'ig-reach', name: 'Reach Over Time', description: 'Daily reach with media product type breakdown', category: 'Reach', defaultSize: 'md', minW: 3, minH: 2, channel: 'instagram', apiMetric: 'reach', chartType: 'area' },
    { id: 'ig-follower-growth', name: 'Follower Growth', description: 'Follows and unfollows trend', category: 'Audience', defaultSize: 'md', minW: 3, minH: 2, channel: 'instagram', apiMetric: 'follows_and_unfollows', chartType: 'line' },
    { id: 'ig-engagement', name: 'Engagement Breakdown', description: 'Likes, comments, shares, saves, reposts per day', category: 'Engagement', defaultSize: 'md', minW: 3, minH: 2, channel: 'instagram', apiMetric: 'likes,comments,shares,saves,reposts', chartType: 'stacked-bar' },
    { id: 'ig-content-perf', name: 'Content Performance by Type', description: 'Total interactions by media product type', category: 'Content', defaultSize: 'md', minW: 3, minH: 2, channel: 'instagram', apiMetric: 'total_interactions', chartType: 'bar' },
    { id: 'ig-profile-activity', name: 'Profile Activity', description: 'Bio link clicks, calls, emails, directions', category: 'Profile', defaultSize: 'sm', minW: 2, minH: 2, channel: 'instagram', apiMetric: 'profile_links_taps', chartType: 'donut' },
    { id: 'ig-views', name: 'Views by Content Type', description: 'Views breakdown by media type and follower type', category: 'Reach', defaultSize: 'md', minW: 3, minH: 2, channel: 'instagram', apiMetric: 'views', chartType: 'grouped-bar' },
    { id: 'ig-demographics', name: 'Audience Demographics', description: 'Follower age, gender, city, country breakdown', category: 'Audience', defaultSize: 'lg', minW: 4, minH: 3, channel: 'instagram', apiMetric: 'follower_demographics', chartType: 'pie-bar' },
    { id: 'ig-accounts-engaged', name: 'Accounts Engaged', description: 'Daily engaged accounts count', category: 'Engagement', defaultSize: 'sm', minW: 2, minH: 2, channel: 'instagram', apiMetric: 'accounts_engaged', chartType: 'kpi-sparkline' },
    { id: 'ig-reels-watch', name: 'Reels Avg Watch Time', description: 'Average time spent watching reels', category: 'Content', defaultSize: 'sm', minW: 2, minH: 2, channel: 'instagram', apiMetric: 'ig_reels_avg_watch_time', chartType: 'kpi' },
    { id: 'ig-story-nav', name: 'Story Navigation', description: 'Story exits, forward, back, next actions', category: 'Content', defaultSize: 'sm', minW: 2, minH: 2, channel: 'instagram', apiMetric: 'navigation', chartType: 'horizontal-bar' },
];

// LinkedIn-specific widgets (based on Marketing API)
export const linkedinWidgets: WidgetDefinition[] = [
    { id: 'li-follower-growth', name: 'Follower Growth Trend', description: 'Time-bound follower count changes', category: 'Audience', defaultSize: 'md', minW: 3, minH: 2, channel: 'linkedin', apiMetric: 'followerCounts', chartType: 'line' },
    { id: 'li-demographics', name: 'Follower Demographics', description: 'Geolocation, industry, seniority, company size', category: 'Audience', defaultSize: 'lg', minW: 4, minH: 3, channel: 'linkedin', apiMetric: 'followerDemographics', chartType: 'bar-pie' },
    { id: 'li-page-views', name: 'Page Views', description: 'Mobile vs desktop page views over time', category: 'Reach', defaultSize: 'md', minW: 3, minH: 2, channel: 'linkedin', apiMetric: 'pageViews', chartType: 'stacked-area' },
    { id: 'li-impressions', name: 'Post Impressions Trend', description: 'Impression count and unique impressions', category: 'Reach', defaultSize: 'md', minW: 3, minH: 2, channel: 'linkedin', apiMetric: 'impressionCount', chartType: 'line' },
    { id: 'li-engagement-rate', name: 'Engagement Rate', description: 'Engagement / impressions per post', category: 'Engagement', defaultSize: 'md', minW: 3, minH: 2, channel: 'linkedin', apiMetric: 'engagementRate', chartType: 'line' },
    { id: 'li-content-perf', name: 'Content Performance', description: 'Clicks, likes, comments, shares per post', category: 'Content', defaultSize: 'md', minW: 3, minH: 2, channel: 'linkedin', apiMetric: 'clickCount,likeCount,commentCount,shareCount', chartType: 'grouped-bar' },
    { id: 'li-top-content', name: 'Top Performing Content', description: 'Posts ranked by engagement', category: 'Content', defaultSize: 'md', minW: 3, minH: 3, channel: 'linkedin', apiMetric: 'engagement', chartType: 'ranked-list' },
    { id: 'li-audience-insights', name: 'Audience Insights', description: 'Job functions, seniorities, industries', category: 'Audience', defaultSize: 'md', minW: 3, minH: 2, channel: 'linkedin', apiMetric: 'audienceInsights', chartType: 'horizontal-bar' },
];

// WhatsApp-specific widgets (based on Business Management API)
export const whatsappWidgets: WidgetDefinition[] = [
    { id: 'wa-delivery-funnel', name: 'Message Delivery Funnel', description: 'Sent → Delivered → Read conversion', category: 'Delivery', defaultSize: 'md', minW: 3, minH: 2, channel: 'whatsapp', apiMetric: 'sent,delivered,read', chartType: 'funnel' },
    { id: 'wa-response-time', name: 'Response Time Trend', description: 'Average and first response time', category: 'Performance', defaultSize: 'md', minW: 3, minH: 2, channel: 'whatsapp', apiMetric: 'avgResponseTime', chartType: 'line' },
    { id: 'wa-conversation-vol', name: 'Conversation Volume', description: 'Daily/weekly/monthly conversation trends', category: 'Volume', defaultSize: 'md', minW: 3, minH: 2, channel: 'whatsapp', apiMetric: 'conversationVolume', chartType: 'area' },
    { id: 'wa-template-perf', name: 'Template Performance', description: 'Delivery rate, read rate, CTR per template', category: 'Templates', defaultSize: 'lg', minW: 4, minH: 3, channel: 'whatsapp', apiMetric: 'templateAnalytics', chartType: 'table-sparkline' },
    { id: 'wa-categories', name: 'Conversation Categories', description: 'Marketing / Utility / Service / Auth split', category: 'Volume', defaultSize: 'sm', minW: 2, minH: 2, channel: 'whatsapp', apiMetric: 'conversationCategories', chartType: 'donut' },
    { id: 'wa-cost', name: 'Cost Analysis', description: 'Cost per delivered message, per click, total spend', category: 'Cost', defaultSize: 'md', minW: 3, minH: 2, channel: 'whatsapp', apiMetric: 'costMetrics', chartType: 'kpi-cards' },
    { id: 'wa-direction', name: 'Inbound vs Outbound', description: 'Message direction split', category: 'Volume', defaultSize: 'sm', minW: 2, minH: 2, channel: 'whatsapp', apiMetric: 'messageDirection', chartType: 'stacked-bar' },
    { id: 'wa-resolution', name: 'Resolution Metrics', description: 'Avg resolution time, responses until resolution', category: 'Performance', defaultSize: 'sm', minW: 2, minH: 2, channel: 'whatsapp', apiMetric: 'resolutionMetrics', chartType: 'kpi-cards' },
];

// YouTube-specific widgets (based on YouTube Data API v3 / Analytics API)
export const youtubeWidgets: WidgetDefinition[] = [
    { id: 'yt-views', name: 'Views Over Time', description: 'Daily view count trend across all videos', category: 'Views', defaultSize: 'md', minW: 3, minH: 2, channel: 'youtube', apiMetric: 'views', chartType: 'area' },
    { id: 'yt-subscriber-growth', name: 'Subscriber Growth', description: 'Net subscribers gained/lost over time', category: 'Audience', defaultSize: 'md', minW: 3, minH: 2, channel: 'youtube', apiMetric: 'subscribersGained,subscribersLost', chartType: 'line' },
    { id: 'yt-engagement', name: 'Engagement Breakdown', description: 'Likes, comments, shares per video', category: 'Engagement', defaultSize: 'md', minW: 3, minH: 2, channel: 'youtube', apiMetric: 'likes,comments,shares', chartType: 'stacked-bar' },
    { id: 'yt-watch-time', name: 'Watch Time Analysis', description: 'Total watch time hours and average view duration', category: 'Performance', defaultSize: 'md', minW: 3, minH: 2, channel: 'youtube', apiMetric: 'estimatedMinutesWatched', chartType: 'area' },
    { id: 'yt-content-perf', name: 'Performance by Video Type', description: 'Views and engagement by video, short, live, premiere', category: 'Content', defaultSize: 'md', minW: 3, minH: 2, channel: 'youtube', apiMetric: 'views,engagement', chartType: 'grouped-bar' },
    { id: 'yt-ctr', name: 'Impressions CTR', description: 'Click-through rate from impressions to views', category: 'Performance', defaultSize: 'sm', minW: 2, minH: 2, channel: 'youtube', apiMetric: 'impressionsCTR', chartType: 'kpi-sparkline' },
    { id: 'yt-traffic-source', name: 'Traffic Sources', description: 'Where viewers find your videos: search, suggested, external', category: 'Reach', defaultSize: 'md', minW: 3, minH: 2, channel: 'youtube', apiMetric: 'trafficSource', chartType: 'donut' },
    { id: 'yt-demographics', name: 'Viewer Demographics', description: 'Age, gender, and geography of your audience', category: 'Audience', defaultSize: 'lg', minW: 4, minH: 3, channel: 'youtube', apiMetric: 'viewerDemographics', chartType: 'pie-bar' },
    { id: 'yt-revenue', name: 'Estimated Revenue', description: 'Ad revenue, RPM, and CPM trends', category: 'Revenue', defaultSize: 'sm', minW: 2, minH: 2, channel: 'youtube', apiMetric: 'estimatedRevenue', chartType: 'kpi-cards' },
    { id: 'yt-top-videos', name: 'Top Performing Videos', description: 'Highest view and engagement videos this month', category: 'Content', defaultSize: 'md', minW: 3, minH: 3, channel: 'youtube', apiMetric: 'topVideos', chartType: 'ranked-list' },
];

export function getWidgetsForChannel(channel: string): WidgetDefinition[] {
    switch (channel) {
        case 'instagram': return instagramWidgets;
        case 'linkedin': return linkedinWidgets;
        case 'whatsapp': return whatsappWidgets;
        case 'youtube': return youtubeWidgets;
        default: return mainDashboardWidgets;
    }
}
