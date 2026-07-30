'use client';

import { useAuth } from '@/lib/auth-context';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

export function Header() {
    const { user, logout } = useAuth();
    const router = useRouter();

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    const initials = user?.name
        ?.split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase() || 'U';

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-stone-200 bg-white/80 backdrop-blur-sm px-6">
            {/* Search */}
            <div className="relative w-80">
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
                {/* Notifications */}

                {/* User menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="flex items-center gap-2 h-9 px-2">
                            <Avatar className="h-7 w-7">
                                <AvatarFallback className="bg-amber-100 text-amber-800 text-xs font-medium">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium text-stone-700">{user?.name}</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <div className="px-2 py-1.5 text-xs text-stone-500">{user?.email}</div>
                        <div className="px-2 py-1 mb-1">
                            <Badge variant="outline" className="text-[10px] capitalize">{user?.role}</Badge>
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                            <LogOut className="mr-2 h-3.5 w-3.5" />
                            Sign out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
