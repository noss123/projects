'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { alerts } from '@/lib/stub-data/alerts';
import { AlertCircle, CheckCircle, Clock, Bell, X, Instagram, Linkedin, MessageCircle, Youtube, Filter } from 'lucide-react';
import { Alert as AlertType, AlertSeverity, AlertStatus } from '@/types';

const channelIcons: Record<string, React.ReactNode> = {
    instagram: <Instagram className="h-3.5 w-3.5" />,
    linkedin: <Linkedin className="h-3.5 w-3.5" />,
    whatsapp: <MessageCircle className="h-3.5 w-3.5" />,
    youtube: <Youtube className="h-3.5 w-3.5" />,
};

export default function AlertsPage() {
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [severityFilter, setSeverityFilter] = useState<string>('all');
    const [alertList, setAlertList] = useState<AlertType[]>(alerts);

    const filtered = alertList.filter(a => {
        if (statusFilter !== 'all' && a.status !== statusFilter) return false;
        if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
        return true;
    });

    const activeCt = alertList.filter(a => a.status === 'active').length;
    const highCt = alertList.filter(a => a.severity === 'high' && a.status === 'active').length;
    const medCt = alertList.filter(a => a.severity === 'medium' && a.status === 'active').length;
    const resolvedToday = alertList.filter(a => a.status === 'resolved').length;

    const markResolved = (id: string) => {
        setAlertList(prev => prev.map(a => a.id === id ? { ...a, status: 'resolved' as AlertStatus, resolvedAt: new Date().toISOString() } : a));
    };

    const dismissAlert = (id: string) => {
        setAlertList(prev => prev.map(a => a.id === id ? { ...a, status: 'dismissed' as AlertStatus } : a));
    };

    const sevColor = (s: AlertSeverity) => s === 'high' ? 'bg-red-100 text-red-700' : s === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700';
    const sevDot = (s: AlertSeverity) => s === 'high' ? 'bg-red-500' : s === 'medium' ? 'bg-amber-500' : 'bg-blue-500';

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-heading font-bold text-stone-900">Alerts</h1>
                <p className="text-sm text-stone-500 mt-1">Monitor threshold breaches and important notifications.</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Active', value: activeCt, icon: <Bell className="h-4 w-4" />, color: 'text-amber-600 bg-amber-50' },
                    { label: 'High Priority', value: highCt, icon: <AlertCircle className="h-4 w-4" />, color: 'text-red-600 bg-red-50' },
                    { label: 'Medium Priority', value: medCt, icon: <Clock className="h-4 w-4" />, color: 'text-amber-600 bg-amber-50' },
                    { label: 'Resolved', value: resolvedToday, icon: <CheckCircle className="h-4 w-4" />, color: 'text-emerald-600 bg-emerald-50' },
                ].map(card => (
                    <Card key={card.label} className="card-hover">
                        <CardContent className="pt-5">
                            <div className="flex items-center gap-3">
                                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${card.color}`}>{card.icon}</div>
                                <div>
                                    <p className="text-xs text-stone-500">{card.label}</p>
                                    <p className="text-xl font-semibold text-stone-900">{card.value}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
                <Filter className="h-4 w-4 text-stone-400" />
                <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                    <TabsList className="bg-stone-100 h-8">
                        <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                        <TabsTrigger value="active" className="text-xs">Active</TabsTrigger>
                        <TabsTrigger value="resolved" className="text-xs">Resolved</TabsTrigger>
                    </TabsList>
                </Tabs>
                <Tabs value={severityFilter} onValueChange={setSeverityFilter}>
                    <TabsList className="bg-stone-100 h-8">
                        <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                        <TabsTrigger value="high" className="text-xs">High</TabsTrigger>
                        <TabsTrigger value="medium" className="text-xs">Medium</TabsTrigger>
                        <TabsTrigger value="low" className="text-xs">Low</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Alert List */}
            <div className="space-y-3">
                {filtered.length === 0 && (
                    <Card><CardContent className="py-12 text-center text-stone-400 text-sm">No alerts match the current filters.</CardContent></Card>
                )}
                {filtered.map(alert => (
                    <Card key={alert.id} className="card-hover">
                        <CardContent className="py-4">
                            <div className="flex items-start gap-4">
                                <div className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${sevDot(alert.severity)}`} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-sm font-medium text-stone-800">{alert.title}</h3>
                                        <Badge variant="outline" className={`text-[10px] ${sevColor(alert.severity)}`}>{alert.severity}</Badge>
                                        <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                                            {channelIcons[alert.channel]} {alert.channel}
                                        </Badge>
                                        {alert.status === 'resolved' && <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Resolved</Badge>}
                                    </div>
                                    <p className="text-xs text-stone-500">{alert.description}</p>
                                    <div className="flex items-center gap-4 mt-2 text-[10px] text-stone-400">
                                        <span>Metric: {alert.metric}</span>
                                        <span>Threshold: {alert.threshold}</span>
                                        <span>Current: {alert.currentValue}</span>
                                        <span>{new Date(alert.createdAt).toLocaleString()}</span>
                                    </div>
                                </div>
                                {alert.status === 'active' && (
                                    <div className="flex gap-1.5 shrink-0">
                                        <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => markResolved(alert.id)}>
                                            <CheckCircle className="mr-1 h-3 w-3" /> Resolve
                                        </Button>
                                        <Button variant="ghost" size="sm" className="text-xs h-7 text-stone-400" onClick={() => dismissAlert(alert.id)}>
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
