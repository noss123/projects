import { Channel } from '@/types';

/**
 * Static channel metadata: id, slug, name, icon, colour, connection status.
 * Health scores are NOT stored here — they are computed by the backend
 * and served via /dashboard/summary → channelHealth.
 * The healthScore field is set to 0 as a safe default; the dashboard
 * reads the backend value instead.
 */
export const channels: Channel[] = [
    {
        id: 'ch-ig',
        slug: 'instagram',
        name: 'Instagram',
        icon: 'Instagram',
        color: '#E4405F',
        isConnected: true,
        followers: 28400,
        healthScore: 0,
        lastSynced: '2026-03-04T18:30:00Z',
    },
    {
        id: 'ch-li',
        slug: 'linkedin',
        name: 'LinkedIn',
        icon: 'Linkedin',
        color: '#0A66C2',
        isConnected: true,
        followers: 12300,
        healthScore: 0,
        lastSynced: '2026-03-04T18:25:00Z',
    },
    {
        id: 'ch-wa',
        slug: 'whatsapp',
        name: 'WhatsApp',
        icon: 'MessageCircle',
        color: '#25D366',
        isConnected: true,
        followers: 5200,
        healthScore: 0,
        lastSynced: '2026-03-04T18:28:00Z',
    },
    {
        id: 'ch-yt',
        slug: 'youtube',
        name: 'YouTube',
        icon: 'Youtube',
        color: '#FF0000',
        isConnected: true,
        followers: 8750,
        healthScore: 0,
        lastSynced: '2026-03-04T18:20:00Z',
    },
    {
        id: 'ch-facebook',
        name: 'Facebook',
        slug: 'facebook',
        color: '#1877F2',
        healthScore: 0,
        followers: 0,
        icon: 'facebook',
        isConnected: true,
        lastSynced: 'Just now',
    },
];
