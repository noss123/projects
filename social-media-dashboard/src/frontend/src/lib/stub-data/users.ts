import { User } from '@/types';

export const users: User[] = [
    {
        id: 'u-1',
        name: 'Priya Sharma',
        email: 'priya@clubartizen.com',
        role: 'admin',
        avatar: '',
        lastLogin: '2026-03-04T18:30:00Z',
        isActive: true,
    },
    {
        id: 'u-2',
        name: 'Rahul Patel',
        email: 'rahul@clubartizen.com',
        role: 'co-founder',
        avatar: '',
        lastLogin: '2026-03-04T12:00:00Z',
        isActive: true,
    },
    {
        id: 'u-3',
        name: 'Ananya Desai',
        email: 'ananya@clubartizen.com',
        role: 'marketing',
        avatar: '',
        lastLogin: '2026-03-03T09:00:00Z',
        isActive: true,
    },
];

export const currentUser = users[0];

// Stubbed credentials for login
export const validCredentials = [
    { email: 'priya@clubartizen.com', password: 'admin123' },
    { email: 'rahul@clubartizen.com', password: 'cofounder123' },
    { email: 'ananya@clubartizen.com', password: 'marketing123' },
];
