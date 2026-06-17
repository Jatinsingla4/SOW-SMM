'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { LogOut, Users, FileText, CheckSquare, BarChart3 } from 'lucide-react';

export default function Navbar() {
    const { user, logout } = useAuth();
    const pathname = usePathname();

    if (!user || pathname === '/login' || pathname === '/pending-role') {
        return null; // Don't show navbar on login or pending role pages
    }

    const isManagerRole = ['OWNER', 'GROUP_HEAD', 'ACCOUNT_MANAGER'].includes(user.role || '');
    const isRestrictedRole = ['SOCIAL_MEDIA_EXECUTIVE', 'MOTION_DESIGNER', 'STATIC_DESIGNER'].includes(user.role || '');
    const isClient = user.role === 'CLIENT';

    const ROLE_DISPLAY: Record<string, string> = {
        OWNER: 'Owner',
        GROUP_HEAD: 'Group Head',
        ACCOUNT_MANAGER: 'Account Manager',
        SOCIAL_MEDIA_EXECUTIVE: 'Social Media Executive',
        MOTION_DESIGNER: 'Motion Designer',
        STATIC_DESIGNER: 'Static Designer',
        CLIENT: 'Client'
    };

    return (
        <nav className="border-b bg-white border-slate-200 sticky top-0 z-50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <span className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                                SOW
                            </span>
                        </div>
                        <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
                            {(isManagerRole || isClient) && (
                                <>
                                    <Link
                                        href="/sow"
                                        className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${pathname === '/sow'
                                            ? 'border-indigo-500 text-slate-900'
                                            : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                                            }`}
                                    >
                                        <FileText className="w-4 h-4 mr-2" />
                                        Global Dashboard
                                    </Link>
                                    <Link
                                        href="/reports"
                                        className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${pathname === '/reports'
                                            ? 'border-indigo-500 text-slate-900'
                                            : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                                            }`}
                                    >
                                        <BarChart3 className="w-4 h-4 mr-2" />
                                        Monthly Reports
                                    </Link>
                                </>
                            )}

                            {isRestrictedRole && (
                                <Link
                                    href="/my-tasks"
                                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${pathname === '/my-tasks'
                                        ? 'border-indigo-500 text-slate-900'
                                        : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                                        }`}
                                >
                                    <CheckSquare className="w-4 h-4 mr-2" />
                                    My Tasks
                                </Link>
                            )}

                            {isManagerRole && (
                                <Link
                                    href="/users"
                                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${pathname === '/users'
                                        ? 'border-indigo-500 text-slate-900'
                                        : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                                        }`}
                                >
                                    <Users className="w-4 h-4 mr-2" />
                                    User Management
                                </Link>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center">
                        <div className="flex items-center gap-4">
                            <div className="hidden md:flex flex-col items-end">
                                <span className="text-sm font-medium text-slate-900">{user.name}</span>
                                <span className="text-xs text-slate-500">{ROLE_DISPLAY[user.role || ''] || 'Pending'}</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={logout} className="text-slate-500">
                                <LogOut className="w-4 h-4 mr-2" />
                                Logout
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
