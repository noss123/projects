import { TrendingTopic, SuggestedAction, TimeSeries, CompetitorInsight } from '@/types';

export const trendingTopics: TrendingTopic[] = [
    { id: 'tr-1', category: 'Design', topic: 'Handloom Revival in Home Décor', change: 210, confidence: 91, signal: 'rising', sources: ['Jaypore', 'iTokri', 'GoCoop'] },
    { id: 'tr-2', category: 'Sustainability', topic: 'Upcycled & Zero-Waste Packaging', change: 185, confidence: 89, signal: 'rising', sources: ['Sirohi', 'The Good Road'] },
    { id: 'tr-3', category: 'Marketing', topic: 'Artisan-Story-Led Branding', change: 160, confidence: 87, signal: 'rising', sources: ['Okhai', 'Jaypore'] },
    { id: 'tr-4', category: 'Content', topic: 'Behind-the-Loom Reels', change: 140, confidence: 82, signal: 'rising', sources: ['iTokri', 'GoCoop'] },
    { id: 'tr-5', category: 'Events', topic: 'Curated Artisan Hamper Gifting', change: 120, confidence: 78, signal: 'steady', sources: ['The Good Road', 'Jaypore'] },
    { id: 'tr-6', category: 'Community', topic: 'Women Artisan Empowerment Campaigns', change: 95, confidence: 84, signal: 'emerging', sources: ['Okhai', 'Sirohi'] },
];

export const suggestedActions: SuggestedAction[] = [
    { id: 'sa-1', priority: 'high', title: 'Launch Handloom Home Décor Reel Series', description: 'Jaypore and iTokri are doubling down on handloom content. Create a weekly Instagram Reel series showcasing your artisan weavers and their craft.', channel: 'instagram', expectedImpact: '+45% Reel engagement', relatedTrend: 'Handloom Revival in Home Décor' },
    { id: 'sa-2', priority: 'high', title: 'Sustainable Packaging LinkedIn Feature', description: "Sirohi's upcycled packaging is generating buzz. Publish a LinkedIn article detailing Club Artizen's own sustainable packaging journey.", channel: 'linkedin', expectedImpact: '+30% article reach', relatedTrend: 'Upcycled & Zero-Waste Packaging' },
    { id: 'sa-3', priority: 'medium', title: 'Artisan Story WhatsApp Campaign', description: "Share monthly artisan spotlight stories via WhatsApp broadcast — Okhai's artisan narratives are driving strong engagement.", channel: 'whatsapp', expectedImpact: '+25% open rate', relatedTrend: 'Artisan-Story-Led Branding' },
    { id: 'sa-4', priority: 'medium', title: 'Festive Hamper Pre-Order Instagram Campaign', description: "The Good Road's hamper gifting is trending. Launch a festive hamper pre-order campaign with Stories polls and countdowns.", channel: 'instagram', expectedImpact: '+35% story engagement', relatedTrend: 'Curated Artisan Hamper Gifting' },
    { id: 'sa-5', priority: 'low', title: 'Artisan Empowerment LinkedIn Post Series', description: "Highlight women artisans monthly on LinkedIn — Okhai and Sirohi are seeing strong traction with empowerment narratives.", channel: 'linkedin', expectedImpact: '+20% post engagement', relatedTrend: 'Women Artisan Empowerment Campaigns' },
];

export const trendGrowthTrajectory: TimeSeries[] = [
    { label: 'Handloom Home Décor', color: '#E5A100', data: [{ date: '2026-01', value: 20 }, { date: '2026-02', value: 35 }, { date: '2026-03', value: 55 }, { date: '2026-04', value: 75 }, { date: '2026-05', value: 90 }] },
    { label: 'Upcycled Packaging', color: '#50B88C', data: [{ date: '2026-01', value: 15 }, { date: '2026-02', value: 28 }, { date: '2026-03', value: 42 }, { date: '2026-04', value: 60 }, { date: '2026-05', value: 80 }] },
    { label: 'Artisan Storytelling', color: '#C75B39', data: [{ date: '2026-01', value: 10 }, { date: '2026-02', value: 22 }, { date: '2026-03', value: 38 }, { date: '2026-04', value: 52 }, { date: '2026-05', value: 70 }] },
];

export const competitorInsights: CompetitorInsight[] = [
    { competitorName: 'Jaypore', observation: 'Expanding curated handloom collections with strong editorial content and celebrity collaborations, driving high organic reach.', opportunity: "Create a 'Curated by Artizen' editorial series positioning your handloom artisans alongside trending home décor themes." },
    { competitorName: 'Okhai', observation: 'Leveraging women artisan empowerment narratives to build emotional brand connection; strong community engagement on Instagram.', opportunity: "Launch an 'Artisan of the Month' campaign showcasing your craftswomen's stories and skills." },
    { competitorName: 'iTokri', observation: 'Rapidly growing marketplace presence with SEO-optimized craft categories and active Pinterest strategy.', opportunity: 'Strengthen your product SEO and consider a Pinterest content strategy for décor and gift categories.' },
    { competitorName: 'GoCoop', observation: 'Positioning as the go-to cooperative handloom platform with government and NGO partnerships.', opportunity: "Highlight Club Artizen's direct artisan partnerships to differentiate from cooperative models." },
    { competitorName: 'Sirohi', observation: 'Leading the upcycled craft space — their packaging-as-product approach is resonating strongly on social media.', opportunity: 'Develop an upcycled/zero-waste packaging line and create unboxing content to showcase it.' },
    { competitorName: 'The Good Road', observation: 'Dominating the curated hamper gifting segment with seasonal collections and strong WhatsApp-based sales.', opportunity: 'Launch a competing festive hamper collection with artisan-made products and a WhatsApp pre-order flow.' },
];
