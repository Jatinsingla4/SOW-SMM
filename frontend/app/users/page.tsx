'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Settings, Users, ShieldCheck, Trash2 } from 'lucide-react';
import { userService } from '@/services/userService';
import { BrandAssignmentModal } from '@/components/users/BrandAssignmentModal';

import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"

interface UserData {
    id: number;
    email: string;
    name: string;
    picture?: string;
    role?: 'OWNER' | 'GROUP_HEAD' | 'ACCOUNT_MANAGER' | 'SOCIAL_MEDIA_EXECUTIVE' | 'MOTION_DESIGNER' | 'STATIC_DESIGNER' | 'CLIENT';
    clientId?: number | null;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt: string | Date;
}

const ROLES = ['GROUP_HEAD', 'ACCOUNT_MANAGER', 'SOCIAL_MEDIA_EXECUTIVE', 'MOTION_DESIGNER', 'STATIC_DESIGNER', 'CLIENT'] as const;

const ROLE_DISPLAY: Record<string, string> = {
    OWNER: 'Owner',
    GROUP_HEAD: 'Group Head',
    ACCOUNT_MANAGER: 'Account Manager',
    SOCIAL_MEDIA_EXECUTIVE: 'Social Media Executive',
    MOTION_DESIGNER: 'Motion Designer',
    STATIC_DESIGNER: 'Static Designer',
    CLIENT: 'Client'
};

export default function UserManagementPage() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();
    const [approvedUsers, setApprovedUsers] = useState<UserData[]>([]);
    const [pendingUsers, setPendingUsers] = useState<UserData[]>([]);
    const [clients, setClients] = useState<{id: number, name: string}[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Brand Modal State
    const [selectedUser, setSelectedUser] = useState<{ id: number; name: string } | null>(null);
    const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);

    useEffect(() => {
        if (!isAuthLoading && user) {
            const isManager = ['OWNER', 'GROUP_HEAD', 'ACCOUNT_MANAGER'].includes(user.role || '');
            if (!isManager) {
                router.push('/');
                return;
            }
            fetchData();
        }
    }, [user, isAuthLoading, router]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [approved, pending, clientsData] = await Promise.all([
                userService.list(),
                userService.listPending(),
                trpc.clients.list.query()
            ]);
            setApprovedUsers(approved as UserData[]);
            setPendingUsers(pending as UserData[]);
            setClients(clientsData.data || []);
        } catch (error) {
            toast.error('Failed to load users');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRoleChange = async (userId: number, newRole: any, clientId?: number) => {
        try {
            await userService.updateRole(userId, newRole, clientId);
            setApprovedUsers(approvedUsers.map(u => u.id === userId ? { ...u, role: newRole, clientId: clientId || null } : u));
            toast.success('User updated successfully');
        } catch (error) {
            toast.error('Failed to update user');
        }
    };

    const handleApprove = async (userId: number, role: any, clientId?: number) => {
        try {
            await userService.approveUser(userId, role, clientId);
            toast.success('User approved successfully');
            fetchData(); // Refresh lists
        } catch (error) {
            toast.error('Failed to approve user');
        }
    };

    const handleDeleteUser = async (userId: number, userName: string) => {
        if (!window.confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
            return;
        }

        try {
            await userService.deleteUser(userId);
            toast.success('User deleted successfully');
            fetchData();
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete user');
        }
    };

    const openBrandManager = (userId: number, userName: string) => {
        setSelectedUser({ id: userId, name: userName });
        setIsBrandModalOpen(true);
    };

    if (isAuthLoading || isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50/50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
                    <p className="text-sm font-medium text-slate-400">Loading User Directory...</p>
                </div>
            </div>
        );
    }

    const UserTable = ({ usersList, isPending = false }: { usersList: UserData[], isPending?: boolean }) => (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <Table>
                <TableHeader className="bg-slate-50/50">
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 w-[25%]">Member</TableHead>
                        <TableHead className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 w-[25%]">Email Address</TableHead>
                        <TableHead className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 w-[15%]">Joined</TableHead>
                        <TableHead className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 w-[20%]">{isPending ? 'Requested Role' : 'Global Role'}</TableHead>
                        <TableHead className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 text-right w-[15%]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {usersList.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="py-12 text-center text-slate-400 font-medium italic">
                                No members found in this category.
                            </TableCell>
                        </TableRow>
                    ) : (
                        usersList.map((u) => {
                            const isMe = u.id === user?.id;
                            const isRestricted = ['SOCIAL_MEDIA_EXECUTIVE', 'MOTION_DESIGNER', 'STATIC_DESIGNER'].includes(u.role || '');
                            const isClient = u.role === 'CLIENT';

                            return (
                                <TableRow key={u.id} className="group hover:bg-slate-50/50 transition-colors">
                                    <TableCell className="py-4 px-6 font-medium">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-10 w-10 border-2 border-slate-100 shadow-sm">
                                                <AvatarImage src={u.picture || ''} />
                                                <AvatarFallback className="bg-primary/5 text-primary text-sm font-bold">
                                                    {u.name.charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="text-slate-900 font-semibold">{u.name} {isMe && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full ml-1">You</span>}</span>
                                                <span className="text-xs text-slate-400">ID: #{u.id}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4 px-6 text-slate-600 font-medium">{u.email}</TableCell>
                                    <TableCell className="py-4 px-6 text-slate-500 text-sm italic">
                                        {new Date(u.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </TableCell>
                                        <TableCell className="py-4 px-6">
                                            {isPending ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                                                    {ROLE_DISPLAY[u.role || ''] || u.role}
                                                </span>
                                            ) : (
                                                <>
                                                    {u.role === 'OWNER' ? (
                                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-md font-bold text-sm w-[180px] border border-primary/20">
                                                            <ShieldCheck className="h-4 w-4" />
                                                            Owner
                                                        </div>
                                                    ) : (
                                                        <Select
                                                            value={u.role || ""}
                                                            onValueChange={(val) => handleRoleChange(u.id, val as any, u.clientId || undefined)}
                                                            disabled={isMe}
                                                        >
                                                            <SelectTrigger className="w-[180px] h-9 bg-white border-slate-200 hover:border-primary/40 transition-all font-medium">
                                                                <SelectValue placeholder="Assign Role" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {ROLES.map((r) => (
                                                                    <SelectItem key={r} value={r} className="font-medium">
                                                                        {ROLE_DISPLAY[r] || r}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                    {isClient && (
                                                        <Select
                                                            value={u.clientId?.toString() || ""}
                                                            onValueChange={(val) => handleRoleChange(u.id, 'CLIENT', parseInt(val))}
                                                        >
                                                            <SelectTrigger className="w-[180px] h-9 mt-2 bg-white border-primary/20 hover:border-primary/40 transition-all font-medium">
                                                                <SelectValue placeholder="Select Client" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {clients.map((c) => (
                                                                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                </>
                                            )}
                                        </TableCell>
                                    <TableCell className="py-4 px-6 text-right">
                                        {isPending ? (
                                            <div className="flex items-center gap-2 justify-end">
                                                <Button
                                                    size="sm"
                                                    className="h-9 px-4 gap-2 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                                                    onClick={() => handleApprove(u.id, u.role)}
                                                >
                                                    <ShieldCheck className="h-4 w-4" />
                                                    Approve
                                                </Button>
                                                {user?.role === 'OWNER' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                                        onClick={() => handleDeleteUser(u.id, u.name)}
                                                        title="Delete Request"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        ) : (
                                            u.role !== 'OWNER' && !isClient && (
                                                <div className="flex items-center gap-2 justify-end">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-9 px-4 gap-2 border-slate-200 text-slate-600 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all group/btn shadow-sm"
                                                        onClick={() => openBrandManager(u.id, u.name)}
                                                        title={isRestricted ? "Manage project visibility" : "Managers see all projects"}
                                                    >
                                                        <Settings className="h-4 w-4 group-hover/btn:rotate-90 transition-transform duration-500" />
                                                        Manage Access
                                                        {isRestricted && <span className="flex h-2 w-2 rounded-full bg-amber-400 absolute -top-0.5 -right-0.5 shadow-sm" />}
                                                    </Button>

                                                    {user?.role === 'OWNER' && !isMe && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                                            onClick={() => handleDeleteUser(u.id, u.name)}
                                                            title="Delete Member"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            )
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    );

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-end border-b pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Users className="h-6 w-6 text-slate-400" />
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Team Management</h1>
                    </div>
                    <p className="text-sm text-slate-500 max-w-md">
                        Assign roles and control project access. Role-based permissions ensure data security and focused dashboards.
                    </p>
                </div>
            </div>

            <Tabs defaultValue="approved" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 mb-2 max-w-md">
                    <TabsTrigger value="approved" className="px-6 py-2">
                        Team Members ({approvedUsers.length})
                    </TabsTrigger>
                    <TabsTrigger value="pending" className="px-6 py-2 relative">
                        Pending Access ({pendingUsers.length})
                        {pendingUsers.length > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold">
                                {pendingUsers.length}
                            </span>
                        )}
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="approved">
                    <UserTable usersList={approvedUsers} />
                </TabsContent>
                <TabsContent value="pending">
                    <UserTable usersList={pendingUsers} isPending={true} />
                </TabsContent>
            </Tabs>

            {selectedUser && (
                <BrandAssignmentModal
                    userId={selectedUser.id}
                    userName={selectedUser.name}
                    open={isBrandModalOpen}
                    onOpenChange={setIsBrandModalOpen}
                />
            )}
        </div>
    );
}
