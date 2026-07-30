'use client';

import { ChannelDashboard } from '@/components/channel/ChannelDashboard';
import { Youtube } from 'lucide-react';

export default function YouTubePage() {
    return (
        <ChannelDashboard
            channel="youtube"
            channelName="YouTube"
            channelColor="#FF0000"
            channelIcon={<Youtube className="h-5 w-5" />}
        />
    );
}
