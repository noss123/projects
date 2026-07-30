'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ChartCardProps {
    title: string;
    description?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}

export function ChartCard({ title, description, children, className }: ChartCardProps) {
    return (
        <Card className={`card-hover ${className || ''}`}>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-stone-700">{title}</CardTitle>
                {description && <div className="text-xs text-stone-400">{description}</div>}
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
}

interface MetricKPIProps {
    label: string;
    value: string | number;
    change?: number;
    changeLabel?: string;
    icon?: React.ReactNode;
}

export function MetricKPI({ label, value, change, changeLabel, icon }: MetricKPIProps) {
    const isPositive = (change ?? 0) >= 0;
    return (
        <Card className="card-hover">
            <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">{label}</p>
                        <p className="text-2xl font-semibold text-stone-900 mt-1">{typeof value === 'number' ? value.toLocaleString() : value}</p>
                        {change !== undefined && (
                            <p className={`text-xs mt-1 font-medium ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                                {isPositive ? '↑' : '↓'} {Math.abs(change)}% {changeLabel || ''}
                            </p>
                        )}
                    </div>
                    {icon && <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">{icon}</div>}
                </div>
            </CardContent>
        </Card>
    );
}

// Re-export recharts components for convenience
export { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend };
