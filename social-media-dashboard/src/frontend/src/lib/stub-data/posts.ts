import { InstagramPost, LinkedInPost, WhatsAppMessage, YouTubeVideo, Post } from '@/types';

// --- Instagram Posts ---
const instagramPosts: InstagramPost[] = [
    {
        id: 'ig-post-1', channel: 'instagram', type: 'reel', caption: '✨ Behind the scenes of our latest mural project! Watch the magic unfold 🎨 #ClubArtizen #MuralArt #BTS', mediaUrl: '/placeholder-reel.jpg', publishedAt: '2026-03-03T14:00:00Z',
        performance: { reach: 12400, views: 18600, likes: 1890, comments: 234, shares: 156, saved: 420, totalInteractions: 2700, follows: 89, profileVisits: 340, avgWatchTime: 12.5, totalViewTime: 232500, },
    },
    {
        id: 'ig-post-2', channel: 'instagram', type: 'carousel', caption: 'Our top 5 art collections this season 🖼️ Swipe to explore each masterpiece → #ArtCollection #ContemporaryArt', mediaUrl: '/placeholder-carousel.jpg', publishedAt: '2026-03-02T10:00:00Z',
        performance: { reach: 9800, views: 14200, likes: 1456, comments: 189, shares: 98, saved: 312, totalInteractions: 2055, follows: 45, profileVisits: 210, },
    },
    {
        id: 'ig-post-3', channel: 'instagram', type: 'story', caption: 'Quick poll: Which color palette speaks to you? 🎨', mediaUrl: '/placeholder-story.jpg', publishedAt: '2026-03-03T09:00:00Z',
        performance: { reach: 6200, views: 8100, likes: 0, comments: 0, shares: 45, saved: 0, totalInteractions: 890, follows: 12, profileVisits: 78, navigation: { forward: 3200, back: 420, exit: 980, nextStory: 1500 }, },
    },
    {
        id: 'ig-post-4', channel: 'instagram', type: 'feed', caption: 'Introducing our newest artist-in-residence: Maya Chen 🌟 Her work explores the intersection of nature and technology.', mediaUrl: '/placeholder-feed.jpg', publishedAt: '2026-03-01T16:00:00Z',
        performance: { reach: 8900, views: 11200, likes: 1234, comments: 167, shares: 89, saved: 256, totalInteractions: 1746, follows: 67, profileVisits: 190, profileActivity: { bioLinkClicked: 45, call: 3, email: 12, direction: 8 }, },
    },
    {
        id: 'ig-post-5', channel: 'instagram', type: 'reel', caption: '60 seconds of pure creativity 🎬 Watch our artists transform a blank canvas into a masterpiece!', mediaUrl: '/placeholder-reel2.jpg', publishedAt: '2026-02-28T11:00:00Z',
        performance: { reach: 15600, views: 24800, likes: 2340, comments: 312, shares: 234, saved: 567, totalInteractions: 3453, follows: 124, profileVisits: 456, avgWatchTime: 18.3, totalViewTime: 454000, },
    },
    {
        id: 'ig-post-6', channel: 'instagram', type: 'carousel', caption: 'From sketch to sculpture — the complete journey of "Ethereal Dawn" ✏️→🗿', mediaUrl: '/placeholder-carousel2.jpg', publishedAt: '2026-02-27T13:00:00Z',
        performance: { reach: 7600, views: 10800, likes: 980, comments: 145, shares: 67, saved: 198, totalInteractions: 1390, follows: 34, profileVisits: 156, },
    },
];

// --- LinkedIn Posts ---
const linkedinPosts: LinkedInPost[] = [
    {
        id: 'li-post-1', channel: 'linkedin', type: 'article', caption: 'The Future of Art Spaces: How Technology is Reshaping Gallery Experiences', mediaUrl: '/placeholder-article.jpg', publishedAt: '2026-03-03T08:00:00Z',
        performance: { impressionCount: 18500, uniqueImpressionsCount: 12400, clickCount: 890, likeCount: 456, commentCount: 78, shareCount: 123, engagement: 1547, engagementRate: 8.4 },
    },
    {
        id: 'li-post-2', channel: 'linkedin', type: 'post', caption: 'Thrilled to announce our partnership with the National Arts Council! Together, we are bringing art education to 50+ underserved communities.', mediaUrl: '/placeholder-lipost.jpg', publishedAt: '2026-03-02T09:00:00Z',
        performance: { impressionCount: 12800, uniqueImpressionsCount: 8900, clickCount: 560, likeCount: 345, commentCount: 67, shareCount: 89, engagement: 1061, engagementRate: 8.3 },
    },
    {
        id: 'li-post-3', channel: 'linkedin', type: 'document', caption: '📊 Q1 2026 Art Market Report: Trends, insights, and opportunities for galleries and collectors.', mediaUrl: '/placeholder-doc.jpg', publishedAt: '2026-03-01T10:00:00Z',
        performance: { impressionCount: 9200, uniqueImpressionsCount: 6800, clickCount: 1200, likeCount: 234, commentCount: 45, shareCount: 178, engagement: 1657, engagementRate: 18.0 },
    },
    {
        id: 'li-post-4', channel: 'linkedin', type: 'video', caption: 'Watch: Our founder shares the vision behind Club Artizen and what is next for the creative community.', mediaUrl: '/placeholder-video.jpg', publishedAt: '2026-02-28T14:00:00Z',
        performance: { impressionCount: 14200, uniqueImpressionsCount: 10100, clickCount: 780, likeCount: 567, commentCount: 89, shareCount: 145, engagement: 1581, engagementRate: 11.1 },
    },
    {
        id: 'li-post-5', channel: 'linkedin', type: 'post', caption: 'We are hiring! Looking for a passionate Community Manager to join our growing team. #ArtJobs #Hiring', mediaUrl: '', publishedAt: '2026-02-26T11:00:00Z',
        performance: { impressionCount: 22000, uniqueImpressionsCount: 16500, clickCount: 2100, likeCount: 890, commentCount: 156, shareCount: 234, engagement: 3380, engagementRate: 15.4 },
    },
];

// --- WhatsApp Messages ---
const whatsappMessages: WhatsAppMessage[] = [
    {
        id: 'wa-msg-1', channel: 'whatsapp', type: 'template', caption: 'March Exhibition Opening — You are Invited!', templateName: 'exhibition_invite_march', publishedAt: '2026-03-03T10:00:00Z',
        performance: { sent: 4200, delivered: 3980, read: 3150, deliveryRate: 94.8, openRate: 79.1, buttonClicks: 890, ctr: 22.4, responseTime: 0, cost: 168.0 },
    },
    {
        id: 'wa-msg-2', channel: 'whatsapp', type: 'template', caption: 'Weekend Workshop Reminder — Watercolor Basics', templateName: 'workshop_reminder', publishedAt: '2026-03-02T08:00:00Z',
        performance: { sent: 1800, delivered: 1750, read: 1420, deliveryRate: 97.2, openRate: 81.1, buttonClicks: 456, ctr: 26.1, responseTime: 0, cost: 72.0 },
    },
    {
        id: 'wa-msg-3', channel: 'whatsapp', type: 'session', caption: 'Customer inquiry about membership plans', publishedAt: '2026-03-03T14:30:00Z',
        performance: { sent: 8, delivered: 8, read: 8, deliveryRate: 100, openRate: 100, buttonClicks: 0, ctr: 0, responseTime: 4.5, cost: 0.32 },
    },
    {
        id: 'wa-msg-4', channel: 'whatsapp', type: 'interactive', caption: 'Art Style Quiz — Discover Your Creative Personality', publishedAt: '2026-03-01T12:00:00Z',
        performance: { sent: 2500, delivered: 2380, read: 1950, deliveryRate: 95.2, openRate: 81.9, buttonClicks: 1230, ctr: 51.7, responseTime: 0, cost: 100.0 },
    },
    {
        id: 'wa-msg-5', channel: 'whatsapp', type: 'template', caption: 'Art Supply Sale — 30% Off This Weekend Only!', templateName: 'supply_sale_promo', publishedAt: '2026-02-28T09:00:00Z',
        performance: { sent: 3600, delivered: 3420, read: 2560, deliveryRate: 95.0, openRate: 74.9, buttonClicks: 780, ctr: 22.8, responseTime: 0, cost: 144.0 },
    },
];

// --- YouTube Videos ---
const youtubeVideos: YouTubeVideo[] = [
    {
        id: 'yt-vid-1', channel: 'youtube', type: 'video', caption: 'How We Built a Giant Mural in 48 Hours | Club Artizen', mediaUrl: '/placeholder-yt-video.jpg', publishedAt: '2026-03-03T12:00:00Z',
        performance: { views: 45200, watchTimeHours: 3800, likes: 2340, comments: 189, shares: 456, subscribersGained: 234, estimatedRevenue: 128.50, impressions: 89000, impressionsCTR: 5.1, avgViewDuration: 302, avgViewPercentage: 68.2 },
    },
    {
        id: 'yt-vid-2', channel: 'youtube', type: 'short', caption: '60-Second Art Challenge: Painting with Only Primary Colors 🎨', mediaUrl: '/placeholder-yt-short.jpg', publishedAt: '2026-03-02T15:00:00Z',
        performance: { views: 128000, watchTimeHours: 1420, likes: 8900, comments: 456, shares: 2340, subscribersGained: 567, estimatedRevenue: 89.20, impressions: 342000, impressionsCTR: 3.7, avgViewDuration: 42, avgViewPercentage: 92.5 },
    },
    {
        id: 'yt-vid-3', channel: 'youtube', type: 'live', caption: 'LIVE: Friday Night Art Jam — Join Us and Create Together! 🔴', mediaUrl: '/placeholder-yt-live.jpg', publishedAt: '2026-02-28T19:00:00Z',
        performance: { views: 12400, watchTimeHours: 8200, likes: 1890, comments: 1245, shares: 89, subscribersGained: 145, estimatedRevenue: 45.80, impressions: 28000, impressionsCTR: 4.4, avgViewDuration: 2380, avgViewPercentage: 35.1 },
    },
    {
        id: 'yt-vid-4', channel: 'youtube', type: 'video', caption: 'Top 10 Art Techniques Every Beginner Should Know | Full Tutorial', mediaUrl: '/placeholder-yt-tutorial.jpg', publishedAt: '2026-02-25T10:00:00Z',
        performance: { views: 67800, watchTimeHours: 12400, likes: 4560, comments: 312, shares: 890, subscribersGained: 456, estimatedRevenue: 234.60, impressions: 156000, impressionsCTR: 4.3, avgViewDuration: 658, avgViewPercentage: 72.4 },
    },
    {
        id: 'yt-vid-5', channel: 'youtube', type: 'premiere', caption: 'Club Artizen 2026 Collection Reveal — World Premiere 🌍', mediaUrl: '/placeholder-yt-premiere.jpg', publishedAt: '2026-02-20T18:00:00Z',
        performance: { views: 23400, watchTimeHours: 4600, likes: 3120, comments: 567, shares: 345, subscribersGained: 289, estimatedRevenue: 167.30, impressions: 52000, impressionsCTR: 4.5, avgViewDuration: 708, avgViewPercentage: 58.9 },
    },
    {
        id: 'yt-vid-6', channel: 'youtube', type: 'short', caption: 'POV: You find a hidden art studio in your city 🏙️✨', mediaUrl: '/placeholder-yt-short2.jpg', publishedAt: '2026-03-01T08:00:00Z',
        performance: { views: 95600, watchTimeHours: 980, likes: 6780, comments: 234, shares: 1560, subscribersGained: 389, estimatedRevenue: 62.40, impressions: 278000, impressionsCTR: 3.4, avgViewDuration: 37, avgViewPercentage: 88.7 },
    },
];

// Combined and accessor
export const allPosts: Post[] = [...instagramPosts, ...linkedinPosts, ...whatsappMessages, ...youtubeVideos];

export function getPostsByChannel(channel: string): Post[] {
    return allPosts.filter(p => p.channel === channel);
}
