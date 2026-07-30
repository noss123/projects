// ============================================================
// Club Artizen Social Media Analytics Dashboard — Type Definitions
// ============================================================

// --- Auth & Users ---
export type UserRole = 'admin' | 'co-founder' | 'marketing';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  lastLogin: string;
  isActive: boolean;
}

// --- Channels ---
export type ChannelSlug = 'instagram' | 'linkedin' | 'whatsapp' | 'youtube' | 'facebook';

export interface Channel {
  id: string;
  slug: ChannelSlug;
  name: string;
  icon: string;
  color: string;
  isConnected: boolean;
  followers: number;
  healthScore: number; // 0-100
  lastSynced: string;
}

// --- Metrics ---
export interface MetricCard {
  label: string;
  value: string | number;
  change: number; // percentage change
  changeLabel: string;
  icon?: string;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface TimeSeries {
  label: string;
  data: TimeSeriesPoint[];
  color?: string;
}

// --- Statistics ---
export interface ChannelStats {
  channel: ChannelSlug;
  followers: number;
  followerGrowth: number;
  engagement: number;
  engagementRate: number;
  impressions: number;
  reach: number;
  ctr: number;
  paidReach?: number;
  organicReach?: number;
  paidImpressions?: number;
  organicImpressions?: number;
}

export interface DemographicData {
  label: string;
  value: number;
  percentage: number;
}

// --- Analytics ---
export interface PostTypePerformance {
  type: string;
  reach: number;
  comments: number;
  shares: number;
  engagement: number;
}

export interface OptimalPostingTime {
  hour: number;
  day: string;
  engagement: number;
}

export interface HeatmapCell {
  day: string;
  hour: number;
  value: number;
}

// --- Widgets ---
export type WidgetSize = 'sm' | 'md' | 'lg';

export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  defaultSize: WidgetSize;
  minW: number;
  minH: number;
  channel?: ChannelSlug | 'all';
  apiMetric?: string;
  chartType?: string;
}

export interface WidgetInstance {
  i: string; // layout key
  definitionId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardLayout {
  id: string;
  widgets: WidgetInstance[];
}

// --- Alerts ---
export type AlertSeverity = 'high' | 'medium' | 'low';
export type AlertStatus = 'active' | 'resolved' | 'dismissed';

export interface Alert {
  id: string;
  title: string;
  description: string;
  channel: ChannelSlug;
  severity: AlertSeverity;
  status: AlertStatus;
  metric: string;
  threshold: number;
  currentValue: number;
  createdAt: string;
  resolvedAt?: string;
}

// --- Competitors ---
export interface Competitor {
  id: string;
  name: string;
  handle: string;
  avatar?: string;
  metrics: {
    facebook: number;
    instagram: number;
    linkedin: number;
    youtube: number;
    engagement: number;
    postsPerWeek: number;
    growth: number;
  };
  growthTrend: TimeSeriesPoint[];
}

// --- Predictive Insights ---
export interface TrendingTopic {
  id: string;
  category: string;
  topic: string;
  change: number;
  confidence: number;
  signal: 'rising' | 'steady' | 'emerging';
  sources?: string[]; // competitor names this trend was observed in
  source?: 'ai' | 'competitor' | 'manual'; // provenance
}

export interface SuggestedAction {
  id: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  channel: ChannelSlug;
  expectedImpact: string;
  relatedTrend?: string;
}

export interface CompetitorInsight {
  competitorName: string;
  observation: string;
  opportunity: string;
}

// --- Posts (Instagram, LinkedIn, WhatsApp) ---
export type InstagramPostType = 'feed' | 'reel' | 'story' | 'carousel';
export type LinkedInPostType = 'post' | 'article' | 'document' | 'video';
export type WhatsAppMessageType = 'template' | 'session' | 'interactive';
export type YouTubeVideoType = 'video' | 'short' | 'live' | 'premiere';

export type PostType = InstagramPostType | LinkedInPostType | WhatsAppMessageType | YouTubeVideoType;

export interface PostBase {
  id: string;
  channel: ChannelSlug;
  caption: string;
  mediaUrl?: string;
  publishedAt: string;
  type: PostType;
}

// Instagram post with Graph API metrics
export interface InstagramPost extends PostBase {
  channel: 'instagram';
  type: InstagramPostType;
  performance: {
    reach: number;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saved: number;
    totalInteractions: number;
    follows: number;
    profileVisits: number;
    // Reels-specific
    avgWatchTime?: number;
    totalViewTime?: number;
    // Story-specific
    navigation?: {
      forward: number;
      back: number;
      exit: number;
      nextStory: number;
    };
    profileActivity?: {
      bioLinkClicked: number;
      call: number;
      email: number;
      direction: number;
    };
  };
}

// LinkedIn post with Marketing API metrics
export interface LinkedInPost extends PostBase {
  channel: 'linkedin';
  type: LinkedInPostType;
  performance: {
    impressionCount: number;
    uniqueImpressionsCount: number;
    clickCount: number;
    likeCount: number;
    commentCount: number;
    shareCount: number;
    engagement: number;
    engagementRate: number;
  };
}

// WhatsApp message with Business API metrics
export interface WhatsAppMessage extends PostBase {
  channel: 'whatsapp';
  type: WhatsAppMessageType;
  templateName?: string;
  performance: {
    sent: number;
    delivered: number;
    read: number;
    deliveryRate: number;
    openRate: number;
    buttonClicks: number;
    ctr: number;
    responseTime: number; // minutes
    cost: number;
  };
}

// YouTube video with Data API / Analytics API metrics
export interface YouTubeVideo extends PostBase {
  channel: 'youtube';
  type: YouTubeVideoType;
  performance: {
    views: number;
    watchTimeHours: number;
    likes: number;
    comments: number;
    shares: number;
    subscribersGained: number;
    estimatedRevenue: number;
    impressions: number;
    impressionsCTR: number; // percentage
    avgViewDuration: number; // seconds
    avgViewPercentage: number; // percentage
  };
}

export type Post = InstagramPost | LinkedInPost | WhatsAppMessage | YouTubeVideo;

export interface PostFilter {
  channel: ChannelSlug;
  type?: PostType[];
  dateRange?: { from: string; to: string };
  search?: string;
  sortBy?: 'date' | 'engagement' | 'reach' | 'likes';
  sortOrder?: 'asc' | 'desc';
}

// --- Date Range ---
export interface DateRange {
  from: Date;
  to: Date;
  label?: string;
}
