'use client';

import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { LogOut, Clock } from 'lucide-react';

export default function PendingRolePage() {
    const { logout } = useAuth();

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 max-w-md w-full text-center space-y-6">
                <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock size={32} />
                </div>

                <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Role Assignment Pending</h1>

                <p className="text-slate-500 leading-relaxed">
                    Your account has been created successfully, but you haven't been assigned a role yet.
                    Please wait for a Project Manager or Owner to assign your role so you can access your dashboard.
                </p>

                <div className="pt-6 border-t border-slate-100 flex justify-center">
                    <Button
                        variant="ghost"
                        onClick={logout}
                        className="text-slate-500 hover:text-slate-700"
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out for Now
                    </Button>
                </div>
            </div>
        </div>
    );
}
