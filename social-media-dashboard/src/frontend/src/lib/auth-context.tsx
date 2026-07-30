'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@/types';
import { users, validCredentials } from '@/lib/stub-data/users';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
console.log("API_BASE:", API_BASE);
interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    loginAttempts: number;
}

interface AuthContextType extends AuthState {
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    hasRole: (role: UserRole | UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MAX_LOGIN_ATTEMPTS = 5;

export function AuthProvider({ children }: { children: ReactNode }) {
    console.log("AuthProvider rendering");
    const [state, setState] = useState<AuthState>({
        user: null,
        isAuthenticated: false,
        isLoading: true, // true while we check for an existing session
        error: null,
        loginAttempts: 0,
    });

    // ── Session verification on mount ──────────────────────────────────────
    useEffect(() => {
        const verifySession = async () => {
            console.log("verifySession running");
            const token = localStorage.getItem("auth_token") ||
                localStorage.getItem("token");

            const savedUser = localStorage.getItem('auth_user');

            // Try JWT token first
            if (token) {
                try {
                    console.log("calling /auth/me");
                    const res = await fetch(`${API_BASE}/auth/me`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    console.log("auth/me status:", res.status);
                    if (res.ok) {
                        const userData = await res.json();
                        setState(prev => ({
                            ...prev,
                            user: {
                                id: userData.id,
                                email: userData.email,
                                name: userData.email.split('@')[0],
                                role: userData.role as UserRole,
                                avatar: undefined,
                                isActive: true,
                                lastLogin: new Date().toISOString(),
                            },
                            isAuthenticated: true,
                            isLoading: false,
                        }));
                        return;
                    }
                } catch (err) {
                    console.error("auth/me failed:", err);
                }
                // Token invalid — clear it
                localStorage.removeItem('auth_token');
            }

            // Restore stub session from localStorage
            if (savedUser) {
                try {
                    const user = JSON.parse(savedUser) as User;
                    setState(prev => ({
                        ...prev,
                        user,
                        isAuthenticated: true,
                        isLoading: false,
                    }));
                    return;
                } catch {
                    localStorage.removeItem('auth_user');
                }
            }

            setState(prev => ({ ...prev, isLoading: false }));
        };

        verifySession();
    }, []);

    // ── Login: try backend JWT first, fall back to stubs ───────────────────
    const login = useCallback(async (email: string, password: string): Promise<boolean> => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        if (state.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: 'Account locked. Too many failed login attempts. Please contact an administrator.',
            }));
            return false;
        }

        // --- Attempt 1: real backend JWT auth ---
        try {
            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);

            const loginRes = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString(),
            });

            if (loginRes.ok) {
                const { access_token } = await loginRes.json();
                localStorage.setItem('auth_token', access_token);

                // Fetch user profile
                const meRes = await fetch(`${API_BASE}/auth/me`, {
                    headers: { Authorization: `Bearer ${access_token}` },
                });

                if (meRes.ok) {
                    const userData = await meRes.json();
                    setState({
                        user: {
                            id: userData.id,
                            email: userData.email,
                            name: userData.email.split('@')[0],
                            role: userData.role as UserRole,
                            avatar: undefined,
                            isActive: true,
                            lastLogin: new Date().toISOString(),
                        },
                        isAuthenticated: true,
                        isLoading: false,
                        error: null,
                        loginAttempts: 0,
                    });
                    return true;
                }
            }

            // Backend responded but credentials were wrong — check if it's a 401
            if (loginRes.status === 401) {
                // Don't fall back to stubs for wrong credentials — propagate error
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    error: 'Invalid email or password. Please try again.',
                    loginAttempts: prev.loginAttempts + 1,
                }));
                return false;
            }

            // Other backend error (500, etc.) — fall through to stub fallback
            console.warn(`Backend auth returned ${loginRes.status}, falling back to stub credentials.`);
        } catch (err) {
            // Network error — backend is unreachable, fall through to stubs
            console.warn('Backend unreachable for auth, falling back to stub credentials:', err);
        }

        // --- Attempt 2: stub credential check (offline / backend down) ---
        const cred = validCredentials.find(c => c.email === email && c.password === password);

        if (!cred) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: 'Invalid email or password. Please try again.',
                loginAttempts: prev.loginAttempts + 1,
            }));
            return false;
        }

        const user = users.find(u => u.email === email)!;
        localStorage.setItem('auth_user', JSON.stringify(user));
        setState({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            loginAttempts: 0,
        });
        return true;
    }, [state.loginAttempts]);

    // ── Logout ────────────────────────────────────────────────────────────
    const logout = useCallback(() => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            loginAttempts: 0,
        });
    }, []);

    const hasRole = useCallback((role: UserRole | UserRole[]) => {
        if (!state.user) return false;
        const roles = Array.isArray(role) ? role : [role];
        return roles.includes(state.user.role);
    }, [state.user]);

    return (
        <AuthContext.Provider value={{ ...state, login, logout, hasRole }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
}
