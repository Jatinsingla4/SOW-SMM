'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Lock, Mail, UserPlus, ShieldCheck } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';

export default function LoginPage() {
    const { login, isLoading, user } = useAuth();
    const { toast } = useToast();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [isSeeding, setIsSeeding] = useState(false);

    if (isLoading || user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAuthenticating(true);
        try {
            const res = await trpc.auth.login.mutate({ email, password });
            localStorage.setItem('auth_token', res.token);
            toast({
                title: 'Welcome Back',
                description: `Logged in as ${res.user.name}`,
            });
            login(res.user);
        } catch (error: any) {
            toast({
                title: 'Login Failed',
                description: error.message || 'Invalid credentials or pending approval.',
                variant: 'destructive',
            });
        } finally {
            setIsAuthenticating(false);
        }
    };

    const handleSeedOwner = async () => {
        setIsSeeding(true);
        try {
            const res = await trpc.auth.seedOwner.mutate();
            if (res.success) {
                toast({
                    title: 'System Initialized',
                    description: res.message,
                });
            } else {
                toast({
                    title: 'Already Initialized',
                    description: res.message,
                    variant: 'warning' as any,
                });
            }
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsSeeding(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
            {/* Subtle background patterns */}
            <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]"></div>
            
            <div className="relative z-10 w-full max-w-md p-6">
                <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-200/50">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4 shadow-lg shadow-primary/20">
                            <ShieldCheck className="h-7 w-7 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">SOW Tracker</h2>
                        <p className="mt-1 text-slate-500 text-sm">Unified Resource Management Platform</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-white border border-slate-200 text-slate-900 pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400 text-sm"
                                    placeholder="name@company.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white border border-slate-200 text-slate-900 pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400 text-sm"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isAuthenticating}
                            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 rounded-xl shadow-md shadow-primary/10 transition-all flex items-center justify-center disabled:opacity-70 text-sm"
                        >
                            {isAuthenticating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'Log In'}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-100 space-y-4">
                        <div className="text-center">
                            <span className="text-slate-500 text-sm">Need access? </span>
                            <Link href="/register" className="text-primary hover:underline text-sm font-semibold transition-colors inline-flex items-center">
                                <UserPlus className="h-3.5 w-3.5 mr-1" /> Request Account
                            </Link>
                        </div>

                        <button
                            onClick={handleSeedOwner}
                            disabled={isSeeding}
                            className="w-full text-slate-400 hover:text-slate-600 text-[10px] font-medium uppercase tracking-wider py-2 transition-colors border border-dashed border-slate-200 hover:border-slate-300 rounded-lg"
                        >
                            {isSeeding ? 'Initializing...' : 'Initialize System'}
                        </button>
                    </div>
                </div>

                <p className="mt-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">
                    Enterprise Solutions Portal
                </p>
            </div>
        </div>
    );
}
