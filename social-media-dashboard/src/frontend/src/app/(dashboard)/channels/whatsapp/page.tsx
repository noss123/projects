'use client';

import { ChannelDashboard } from '@/components/channel/ChannelDashboard';
import { MessageCircle } from 'lucide-react';

export default function WhatsAppPage() {
    return (
        <ChannelDashboard
            channel="whatsapp"
            channelName="WhatsApp"
            channelColor="#25D366"
            channelIcon={<MessageCircle className="h-5 w-5" />}
        />
    );
}
