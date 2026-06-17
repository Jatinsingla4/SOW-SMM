'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JobsTable } from '@/components/sow/JobsTable';
import { AddJobModal } from '@/components/sow/AddJobModal';
import { jobService } from '@/services/jobService';
import { sowService } from '@/services/sowService';

export default function MyTasksPage() {
    const { user, isLoading: isAuthLoading } = useAuth();

    const [jobs, setJobs] = useState<any[]>([]);
    const [isLoadingTasks, setIsLoadingTasks] = useState(true);
    const [isAddJobOpen, setIsAddJobOpen] = useState(false);
    const [jobToEdit, setJobToEdit] = useState<any>(null);
    const [clients, setClients] = useState<any[]>([]);

    const fetchClients = useCallback(async () => {
        try {
            const res = await sowService.getClients();
            setClients((res.data || []) as any);
        } catch (error) {
            console.error('Failed to fetch clients', error);
        }
    }, []);

    const fetchMyTasks = useCallback(async () => {
        setIsLoadingTasks(true);
        try {
            // jobRouter.list (accessed via jobService.getJobs) handles hierarchical filtering automatically
            const res = await jobService.getJobs({});
            if (res.success) {
                setJobs(res.data || []);
            } else {
                toast.error('Failed to load your tasks');
            }
        } catch (error) {
            toast.error('Error loading tasks');
        } finally {
            setIsLoadingTasks(false);
        }
    }, []);

    useEffect(() => {
        if (!isAuthLoading && user) {
            fetchMyTasks();
            fetchClients();
        }
    }, [isAuthLoading, user, fetchMyTasks, fetchClients]);

    const handleJobAdded = () => {
        setIsAddJobOpen(false);
        setJobToEdit(null);
        fetchMyTasks();
    };

    if (isAuthLoading || (isLoadingTasks && jobs.length === 0)) {
        return (
            <div className="flex h-[calc(100vh-64px)] items-center justify-center bg-slate-50/50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-slate-300" />
                    <p className="text-slate-400 font-medium">Loading your workspace...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl border shadow-sm">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight italic">My Workspace</h1>
                        <p className="text-slate-500 font-medium">Assigned tasks and daily hour logs across your projects.</p>
                    </div>

                    <Button
                        onClick={() => setIsAddJobOpen(true)}
                        className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-6 py-6 h-auto font-semibold shadow-lg shadow-slate-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        + Add New Task
                    </Button>
                </div>

                {/* Tasks Content */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-800 ml-1">Current Active Tasks</h2>
                    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                        <JobsTable
                            jobs={jobs}
                            isLoading={isLoadingTasks}
                            onJobUpdated={fetchMyTasks}
                            onEditJob={(job) => {
                                setJobToEdit(job);
                                setIsAddJobOpen(true);
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Add Job Modal (Add Task) */}
            <AddJobModal
                open={isAddJobOpen}
                onOpenChange={(open) => {
                    setIsAddJobOpen(open);
                    if (!open) setJobToEdit(null);
                }}
                clients={clients}
                job={jobToEdit}
                onJobAdded={handleJobAdded}
            />
        </div>
    );
}
