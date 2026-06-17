'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { trpc } from './trpc';

interface User {
    id: number;
    email: string;
    name: string;
    picture?: string | null;
    role?: string | null;
    clientId?: number | null;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (userData: User) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// TODO: Re-enable authentication (Google OAuth + JWT) later
const DEV_USER: User = {
    id: 1,
    email: 'dev@test.com',
    name: 'Dev User',
    picture: 'https://avatar.vercel.sh/dev',
    role: 'OWNER',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('auth_token');
            if (token) {
                try {
                    // We can either decode locally or fetch from /users/getMe
                    // For now, let's fetch to ensure token is valid
                    const userData = await trpc.users.getMe.query();
                    setUser({
                        id: userData.id,
                        email: userData.email,
                        name: userData.name,
                        picture: userData.picture,
                        role: userData.role || undefined,
                        clientId: userData.clientId
                    });
                } catch (err) {
                    console.error('Auth check failed:', err);
                    localStorage.removeItem('auth_token');
                }
            }
            setIsLoading(false);
        };
        checkAuth();
    }, []);

    useEffect(() => {
        if (!isLoading) {
            const publicPaths = ['/login', '/register'];
            if (!user && !publicPaths.includes(pathname)) {
                router.push('/login');
            } else if (user && publicPaths.includes(pathname)) {
                const isTechRole = ['UI_UX', 'FRONTEND', 'BACKEND', 'SERVER'].includes(user.role || '');
                router.push(isTechRole ? '/my-tasks' : '/sow');
            }
        }
    }, [user, isLoading, pathname, router]);

    const login = (userData: User) => {
        setUser(userData);
        const isTechRole = ['UI_UX', 'FRONTEND', 'BACKEND', 'SERVER'].includes(userData.role || '');
        router.push(isTechRole ? '/my-tasks' : '/sow');
    };

    const logout = () => {
        localStorage.removeItem('auth_token');
        setUser(null);
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
