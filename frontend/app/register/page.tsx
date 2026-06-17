'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Lock, Mail, User, Briefcase, ChevronRight } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Client } from '@/types';

const ROLES = [
    { id: 'GROUP_HEAD', label: 'Group Head' },
    { id: 'ACCOUNT_MANAGER', label: 'Account Manager' },
    { id: 'SOCIAL_MEDIA_EXECUTIVE', label: 'Social Media Executive' },
    { id: 'MOTION_DESIGNER', label: 'Motion Designer' },
    { id: 'STATIC_DESIGNER', label: 'Static Designer' },
    { id: 'CLIENT', label: 'Client' },
];

export default function RegisterPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState(ROLES[0].id);
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [clients, setClients] = useState<Pick<Client, 'id' | 'name'>[]>([]);

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const res = await trpc.clients.listPublic.query();
                setClients(res);
            } catch (error) {
                console.error('Failed to fetch clients:', error);
            }
        };
        fetchClients();
    }, []);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (role === 'CLIENT' && !selectedClientId) {
            toast({
                title: 'Selection Required',
                description: 'Please select your company/client.',
                variant: 'destructive',
            });
            return;
        }

        setIsSubmitting(true);
        try {
            await trpc.auth.register.mutate({ 
                email, 
                password, 
                name, 
                role: role as any,
                clientId: role === 'CLIENT' ? parseInt(selectedClientId) : undefined
            });
            toast({
                title: 'Request Submitted',
                description: 'Your account is pending approval by an administrator.',
            });
            router.push('/login');
        } catch (error: any) {
            toast({
                title: 'Registration Failed',
                description: error.message || 'Something went wrong.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
            {/* Subtle background patterns */}
            <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]"></div>

            <div className="relative z-10 w-full max-w-xl p-6">
                <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-200/50">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Request Access</h2>
                            <p className="mt-1 text-slate-500 text-sm">Join the SOW tracking system</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                            <User className="h-6 w-6 text-primary" />
                        </div>
                    </div>

                    <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-sm font-semibold text-slate-700 ml-1">Full Name</label>
                            <div className="relative group">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-white border border-slate-200 text-slate-900 pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400 text-sm"
                                    placeholder="John Doe"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 ml-1">Email</label>
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

                        <div className={`space-y-1.5 transition-all duration-300 ${role === 'CLIENT' ? 'col-span-1 opacity-100' : 'hidden opacity-0'}`}>
                            <label className="text-sm font-semibold text-slate-700 ml-1">Company / Client</label>
                            <div className="relative group">
                                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                <select
                                    value={selectedClientId}
                                    onChange={(e) => setSelectedClientId(e.target.value)}
                                    className="w-full bg-white border border-slate-200 text-slate-900 pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer text-sm"
                                    required={role === 'CLIENT'}
                                >
                                    <option value="" disabled className="text-slate-400">Select Client</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id} className="text-slate-900">{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className={`space-y-1.5 transition-all duration-300 ${role === 'CLIENT' ? 'col-span-1' : 'col-span-1'}`}>
                            <label className="text-sm font-semibold text-slate-700 ml-1">Role</label>
                            <div className="relative group">
                                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full bg-white border border-slate-200 text-slate-900 pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer text-sm"
                                >
                                    {ROLES.map(r => (
                                        <option key={r.id} value={r.id} className="text-slate-900">{r.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-sm font-semibold text-slate-700 ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white border border-slate-200 text-slate-900 pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400 text-sm"
                                    placeholder="Min. 6 characters"
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2 pt-4">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-xl shadow-md shadow-primary/10 transition-all flex items-center justify-center disabled:opacity-70 group text-sm"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <>
                                        Submit Request
                                        <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 text-center pt-6 border-t border-slate-100">
                        <span className="text-slate-500 text-sm">Already have an account? </span>
                        <Link href="/login" className="text-primary hover:underline text-sm font-semibold transition-colors">
                            Log In
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
