'use client';
console.log("HELLO")

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { login, isLoading, error } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await login(email, password);
        if (success) {
            router.push('/');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FAFAF7] via-amber-50/40 to-orange-50/30 px-4">
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-amber-100/40 blur-3xl" />
                <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-orange-100/30 blur-3xl" />
            </div>

            <Card className="w-full max-w-md relative z-10 shadow-xl border-stone-200/60 bg-white/90 backdrop-blur-sm">
                <CardHeader className="text-center pb-2">
                    {/* Logo */}
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold text-xl shadow-lg shadow-amber-200/50">
                        CA
                    </div>
                    <CardTitle className="text-2xl font-heading">Welcome Back</CardTitle>
                    <CardDescription className="text-stone-500">
                        Sign in to your Club Artizen Analytics Dashboard
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 animate-fade-in">
                                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-stone-700">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@clubartizen.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="bg-stone-50/50"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-stone-700">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="bg-stone-50/50 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md shadow-amber-200/40 h-10"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 pt-4 border-t border-stone-100">
                        <p className="text-xs text-stone-400 text-center">
                            Demo credentials: priya@clubartizen.com / admin123
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
