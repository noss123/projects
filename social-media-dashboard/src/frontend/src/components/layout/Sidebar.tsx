'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    BarChart3,
    TrendingUp,
    Users,
    Bell,
    Lightbulb,
    Settings,
    Instagram,
    Facebook,
    Linkedin,
    MessageCircle,
    Youtube,
    ChevronDown,
    ChevronRight,
    Palette,
    Globe,
    FileUp,
} from 'lucide-react';

interface NavItem {
    label: string;
    href: string;
    icon: React.ElementType;
    children?: NavItem[];
}

const navigation: NavItem[] = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    {
        label: 'Channels',
        href: '#',
        icon: Palette,
        children: [
            { label: 'Instagram', href: '/channels/instagram', icon: Instagram },
            { label: 'Facebook', href: '/channels/facebook', icon: Facebook },
            { label: 'LinkedIn', href: '/channels/linkedin', icon: Linkedin },
            { label: 'WhatsApp', href: '/channels/whatsapp', icon: MessageCircle },
            { label: 'YouTube', href: '/channels/youtube', icon: Youtube },
            { label: 'Manual Uploads', href: '/channels/manual-upload', icon: FileUp },
        ],
    },
    { label: 'Comparative Statistics', href: '/statistics', icon: BarChart3 },
    { label: 'Analytics', href: '/analytics', icon: TrendingUp },
    { label: 'Website', href: '/website', icon: Globe },
    { label: 'Competitors', href: '/competitors', icon: Users },
    { label: 'Alerts', href: '/alerts', icon: Bell },
    { label: 'Predictive Insights', href: '/predictive', icon: Lightbulb },
];

const bottomNav: NavItem[] = [
    { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const [channelsOpen, setChannelsOpen] = React.useState(
        pathname.startsWith('/channels')
    );

    return (
        <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-stone-200 bg-white">
            {/* Logo */}
            <div className="flex h-16 items-center gap-3 border-b border-stone-200 px-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold text-sm">
                    CA
                </div>
                <div>
                    <h1 className="text-base font-semibold text-stone-900" style={{ fontFamily: 'Playfair Display, serif' }}>
                        Club Artizen
                    </h1>
                    <p className="text-[10px] text-stone-500 uppercase tracking-widest">Analytics</p>
                </div>
            </div>

            {/* Main Nav */}
            <nav className="flex-1 overflow-y-auto px-3 py-4">
                <ul className="space-y-1">
                    {navigation.map(item => (
                        <li key={item.label}>
                            {item.children ? (
                                <div>
                                    <button
                                        onClick={() => setChannelsOpen(!channelsOpen)}
                                        className={cn(
                                            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                                            pathname.startsWith('/channels')
                                                ? 'bg-amber-50 text-amber-900'
                                                : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                                        )}
                                    >
                                        <item.icon className="h-4 w-4" />
                                        <span className="flex-1 text-left">{item.label}</span>
                                        {channelsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                    </button>
                                    {channelsOpen && (
                                        <ul className="ml-4 mt-1 space-y-0.5 border-l border-stone-200 pl-3">
                                            {item.children.map(child => (
                                                <li key={child.href}>
                                                    <Link
                                                        href={child.href}
                                                        className={cn(
                                                            'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                                                            pathname === child.href
                                                                ? 'bg-amber-50 text-amber-900 font-medium'
                                                                : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900'
                                                        )}
                                                    >
                                                        <child.icon className="h-3.5 w-3.5" />
                                                        {child.label}
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            ) : (
                                <Link
                                    href={item.href}
                                    className={cn(
                                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                                        pathname === item.href
                                            ? 'bg-amber-50 text-amber-900'
                                            : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    {item.label}
                                </Link>
                            )}
                        </li>
                    ))}
                </ul>
            </nav>

            {/* Bottom Nav */}
            <div className="border-t border-stone-200 px-3 py-3">
                {bottomNav.map(item => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                            pathname === item.href
                                ? 'bg-amber-50 text-amber-900'
                                : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                        )}
                    >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                    </Link>
                ))}
            </div>
        </aside>
    );
}
