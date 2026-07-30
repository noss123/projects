'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

console.log("RootLayout running");

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading) {
        return <div className="p-6">Loading...</div>;
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 ml-64">
                <Header />
                <main className="p-6 animate-fade-in">{children}</main>
            </div>
        </div>
    );
}
