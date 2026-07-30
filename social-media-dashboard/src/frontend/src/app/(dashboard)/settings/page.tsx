'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { channels } from '@/lib/stub-data/channels';
import { users } from '@/lib/stub-data/users';
import { useAuth } from '@/lib/auth-context';
import { Instagram, Linkedin, MessageCircle, Plus, CheckCircle, XCircle, Settings, Shield, Bell, Link2 } from 'lucide-react';

const channelIcons: Record<string, React.ReactNode> = {
    instagram: <Instagram className="h-5 w-5" />,
    linkedin: <Linkedin className="h-5 w-5" />,
    whatsapp: <MessageCircle className="h-5 w-5" />,
};

export default function SettingsPage() {
    const { hasRole } = useAuth();
    const [channelState, setChannelState] = useState(channels.map(c => ({ ...c })));

    const toggleChannel = (id: string) => {
        setChannelState(prev => prev.map(c => c.id === id ? { ...c, isConnected: !c.isConnected } : c));
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-heading font-bold text-stone-900">Settings</h1>
                <p className="text-sm text-stone-500 mt-1">Manage integrations, users, and alert configurations.</p>
            </div>

            <Tabs defaultValue="integrations" className="space-y-6">
                <TabsList className="bg-stone-100">
                    <TabsTrigger value="integrations" className="flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5" /> Integrations</TabsTrigger>
                    {hasRole('admin') && <TabsTrigger value="users" className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> User Management</TabsTrigger>}
                    <TabsTrigger value="alerts" className="flex items-center gap-1.5"><Bell className="h-3.5 w-3.5" /> Alert Config</TabsTrigger>
                </TabsList>

                {/* Integrations */}
                <TabsContent value="integrations" className="space-y-4">
                    <h2 className="text-sm font-medium text-stone-700">Connected Channels</h2>
                    <div className="grid gap-3">
                        {channelState.map(ch => (
                            <Card key={ch.id} className="card-hover">
                                <CardContent className="py-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${ch.color}15`, color: ch.color }}>
                                            {channelIcons[ch.slug]}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-medium text-stone-800">{ch.name}</h3>
                                                {ch.isConnected ?
                                                    <Badge className="bg-emerald-100 text-emerald-700 text-[10px]"><CheckCircle className="mr-1 h-2.5 w-2.5" /> Connected</Badge>
                                                    : <Badge variant="outline" className="text-stone-400 text-[10px]"><XCircle className="mr-1 h-2.5 w-2.5" /> Disconnected</Badge>
                                                }
                                            </div>
                                            {ch.isConnected && <p className="text-[11px] text-stone-400 mt-0.5">Last synced: {new Date(ch.lastSynced).toLocaleString()}</p>}
                                        </div>
                                        <Switch checked={ch.isConnected} onCheckedChange={() => toggleChannel(ch.id)} />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* User Management (Admin only) */}
                {hasRole('admin') && (
                    <TabsContent value="users" className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-medium text-stone-700">User Management</h2>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button size="sm" className="bg-amber-500 text-white"><Plus className="mr-1 h-3.5 w-3.5" /> Add User</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
                                    <div className="space-y-3 pt-2">
                                        <div><Label>Full Name</Label><Input placeholder="John Doe" className="mt-1" /></div>
                                        <div><Label>Email</Label><Input type="email" placeholder="john@clubartizen.com" className="mt-1" /></div>
                                        <div>
                                            <Label>Role</Label>
                                            <Select>
                                                <SelectTrigger className="mt-1"><SelectValue placeholder="Select role" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="admin">Admin</SelectItem>
                                                    <SelectItem value="co-founder">Co-Founder</SelectItem>
                                                    <SelectItem value="marketing">Marketing Team</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Button className="w-full bg-amber-500 text-white">Create User</Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <Card>
                            <CardContent className="pt-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Last Login</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {users.map(u => (
                                            <TableRow key={u.id}>
                                                <TableCell className="font-medium">{u.name}</TableCell>
                                                <TableCell className="text-stone-500 text-sm">{u.email}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="capitalize text-[10px]">{u.role}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={u.isActive ? 'bg-emerald-100 text-emerald-700 text-[10px]' : 'bg-stone-100 text-stone-500 text-[10px]'}>
                                                        {u.isActive ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs text-stone-400">{new Date(u.lastLogin).toLocaleDateString()}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}

                {/* Alert Configuration */}
                <TabsContent value="alerts" className="space-y-4">
                    <h2 className="text-sm font-medium text-stone-700">Alert Thresholds</h2>
                    <div className="grid gap-4 max-w-lg">
                        {[
                            { metric: 'Engagement Rate', channel: 'Instagram', threshold: '3.0', unit: '%' },
                            { metric: 'Delivery Rate', channel: 'WhatsApp', threshold: '90', unit: '%' },
                            { metric: 'CTR', channel: 'LinkedIn', threshold: '1.5', unit: '%' },
                            { metric: 'Response Time', channel: 'WhatsApp', threshold: '30', unit: 'min' },
                            { metric: 'Follower Growth', channel: 'All', threshold: '2.0', unit: '% / month' },
                        ].map((item, i) => (
                            <Card key={i}>
                                <CardContent className="py-3">
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-stone-800">{item.metric}</p>
                                            <p className="text-[11px] text-stone-400">{item.channel}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Input defaultValue={item.threshold} className="w-20 h-8 text-sm text-center" />
                                            <span className="text-xs text-stone-400 w-16">{item.unit}</span>
                                        </div>
                                        <Switch defaultChecked />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        <Button className="bg-amber-500 text-white w-fit">Save Thresholds</Button>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
