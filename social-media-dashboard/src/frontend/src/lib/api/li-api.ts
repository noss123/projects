const BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:8000';

export interface LIDemographicData {
    category: string;
    value: string;
    follower_count: number;
    percentage: number;
}

export interface LIFollowerDemographics {
    total_followers: number;
    demographics: LIDemographicData[];
}

export interface LIPostPerformance {
    date: string;
    post_id: string;
    post_type: string;
    reach: number;
    impressions: number;
    likes: number;
    comments: number;
    shares: number;
    clicks: number;
    engagement_rate: number;
}

export interface LIPostResponse {
    posts: LIPostPerformance[];
}

export interface LIPageTraffic {
    date: string;
    page_views: number;
    unique_visitors: number;
    custom_button_clicks: number;
}

export interface LIPageTrafficResponse {
    traffic_data: LIPageTraffic[];
}

export interface LIOverview {
    total_followers: number;
    new_followers: number;
    total_page_views: number;
    total_post_impressions: number;
    avg_engagement_rate: number;
}

// Conversion API Interfaces
export interface LIConversion {
    date: string;
    conversion_id: string;
    campaign_id: string;
    campaign_name: string;
    conversion_type: string;
    conversion_value: number;
    currency: string;
    user_id?: string;
    email?: string;
}

export interface LIConversionSummary {
    date: string;
    total_conversions: number;
    total_conversion_value: number;
    avg_conversion_value: number;
    conversion_rate: number;
    unique_conversions: number;
}

export interface LIConversionResponse {
    conversions: LIConversion[];
    summary: LIConversionSummary;
}

export interface LICampaignPerformance {
    campaign_id: string;
    campaign_name: string;
    spend: number;
    conversions: number;
    conversion_value: number;
    cpc: number;
    roas: number;
    ctr: number;
    impressions: number;
    clicks: number;
    status: string;
}

export interface LICampaignConversionResponse {
    campaigns: LICampaignPerformance[];
    total_spend: number;
    total_conversions: number;
    total_conversion_value: number;
    overall_roas: number;
}

export interface LIROI {
    campaign_id: string;
    campaign_name: string;
    total_spend: number;
    total_revenue: number;
    roi_percentage: number;
    roi_multiplier: number;
    payback_period_days?: number;
    break_even_date?: string;
}

export interface LIROIResponse {
    roi_data: LIROI[];
    portfolio_roi: number;
    total_spend: number;
    total_revenue: number;
}

class LinkedInAPIError extends Error {
    constructor(message: string, public status?: number) {
        super(message);
        this.name = 'LinkedInAPIError';
    }
}

async function fetchLI<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${BASE_URL}/api/li${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString(), {
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new LinkedInAPIError(`API Error: ${response.statusText}`, response.status);
    }

    return response.json();
}

/** Get LinkedIn Follower Demographics */
export async function getLIDemographics() {
    try {
        return await fetchLI<LIFollowerDemographics>('/demographics');
    } catch (e) {
        console.warn('getLIDemographics: falling back to stubs —', (e as Error).message);
        return {
            total_followers: 12300,
            demographics: [
                { category: 'Geography', value: 'North America', follower_count: 5000, percentage: 40.6 },
                { category: 'Industry', value: 'Tech', follower_count: 8000, percentage: 65.0 },
            ],
        };
    }
}

/** Get LinkedIn Post Performance */
export async function getLIPostsPerformance(startDate: string, endDate: string) {
    try {
        return await fetchLI<LIPostResponse>('/posts', { start_date: startDate, end_date: endDate });
    } catch (e) {
        console.warn('getLIPostsPerformance: falling back to stubs —', (e as Error).message);
        return {
            posts: [
                {
                    date: '2026-03-01', post_id: 'li-1', post_type: 'Article', reach: 45000,
                    impressions: 55000, likes: 800, comments: 120, shares: 350, clicks: 1200, engagement_rate: 5.2,
                },
            ],
        };
    }
}

/** Get LinkedIn Page Traffic */
export async function getLIPageTraffic(startDate: string, endDate: string) {
    try {
        return await fetchLI<LIPageTrafficResponse>('/page-traffic', { start_date: startDate, end_date: endDate });
    } catch (e) {
        console.warn('getLIPageTraffic: falling back to stubs —', (e as Error).message);
        return {
            traffic_data: [
                { date: '2026-03-01', page_views: 4500, unique_visitors: 3200, custom_button_clicks: 15 },
            ],
        };
    }
}

/** Get LinkedIn Header Overview */
export async function getLIOverview(startDate: string, endDate: string) {
    try {
        return await fetchLI<LIOverview>('/overview', { start_date: startDate, end_date: endDate });
    } catch (e) {
        console.warn('getLIOverview: falling back to stubs —', (e as Error).message);
        return {
            total_followers: 12300, new_followers: 350,
            total_page_views: 4500, total_post_impressions: 87000,
            avg_engagement_rate: 3.2,
        };
    }
}

/** Get LinkedIn Conversions */
export async function getLIConversions(startDate: string, endDate: string) {
    try {
        return await fetchLI<LIConversionResponse>('/conversions', { start_date: startDate, end_date: endDate });
    } catch (e) {
        console.warn('getLIConversions: falling back to stubs —', (e as Error).message);
        return {
            conversions: [
                {
                    date: '2026-04-01',
                    conversion_id: 'conv_example_1',
                    campaign_id: 'camp_example',
                    campaign_name: 'B2B Lead Generation',
                    conversion_type: 'lead_submit',
                    conversion_value: 50.0,
                    currency: 'USD',
                },
            ],
            summary: {
                date: '2026-04-09',
                total_conversions: 45,
                total_conversion_value: 2250.0,
                avg_conversion_value: 50.0,
                conversion_rate: 2.5,
                unique_conversions: 42,
            },
        };
    }
}

/** Get LinkedIn Campaign Performance */
export async function getLICampaignPerformance(startDate: string, endDate: string) {
    try {
        return await fetchLI<LICampaignConversionResponse>('/campaigns/performance', {
            start_date: startDate,
            end_date: endDate,
        });
    } catch (e) {
        console.warn('getLICampaignPerformance: falling back to stubs —', (e as Error).message);
        return {
            campaigns: [
                {
                    campaign_id: 'camp_example',
                    campaign_name: 'B2B Lead Generation',
                    spend: 5000.0,
                    conversions: 95,
                    conversion_value: 4750.0,
                    cpc: 52.63,
                    roas: 0.95,
                    ctr: 3.2,
                    impressions: 125000,
                    clicks: 4000,
                    status: 'active',
                },
            ],
            total_spend: 5000.0,
            total_conversions: 95,
            total_conversion_value: 4750.0,
            overall_roas: 0.95,
        };
    }
}

/** Get LinkedIn ROI Analysis */
export async function getLIROI(startDate: string, endDate: string) {
    try {
        return await fetchLI<LIROIResponse>('/roi', { start_date: startDate, end_date: endDate });
    } catch (e) {
        console.warn('getLIROI: falling back to stubs —', (e as Error).message);
        return {
            roi_data: [
                {
                    campaign_id: 'camp_example',
                    campaign_name: 'B2B Lead Generation',
                    total_spend: 5000.0,
                    total_revenue: 9500.0,
                    roi_percentage: 90.0,
                    roi_multiplier: 1.9,
                    payback_period_days: 15,
                    break_even_date: '2026-03-25',
                },
            ],
            portfolio_roi: 90.0,
            total_spend: 5000.0,
            total_revenue: 9500.0,
        };
    }
}
