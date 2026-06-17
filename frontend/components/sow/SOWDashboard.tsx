"use client";

import { useState, useEffect, useCallback } from "react";
import { sowService } from "@/services/sowService";
import { jobService } from "@/services/jobService";
import { Client, Brand, SOW, Job, SOWFilters, SOWMetrics } from "@/types";
import { SowFiltersComponent } from "@/components/sow/SowFilters";
import { SowSummaryCards } from "@/components/sow/SowSummaryCards";
import { JobsTable } from "@/components/sow/JobsTable";
import { useToast } from "@/components/ui/use-toast";
import dynamic from 'next/dynamic';
import { formatDate } from "@/lib/utils";

// Lazy-loaded components for better First-Load performance
const AddJobModal = dynamic(() => import("@/components/sow/AddJobModal").then(mod => mod.AddJobModal), { ssr: false });
const AddClientModal = dynamic(() => import("@/components/sow/AddClientModal").then(mod => mod.AddClientModal), { ssr: false });
const ClientSummaryModal = dynamic(() => import("@/components/sow/ClientSummaryModal").then(mod => mod.ClientSummaryModal), { ssr: false });
import { useAuth } from "@/lib/auth-context";

export function SOWDashboard() {
    const { user } = useAuth();
    const isManager = ['OWNER', 'GROUP_HEAD', 'ACCOUNT_MANAGER'].includes(user?.role || '');
    const isClient = user?.role === 'CLIENT';

    const [clients, setClients] = useState<Client[]>([]);
    const [filters, setFilters] = useState<SOWFilters>({});
    const [stats, setStats] = useState<any>(null);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const [refreshKey, setRefreshKey] = useState(0);

    const fetchClients = useCallback(async (isInitial = false) => {
        try {
            const res = await sowService.getClients();
            const fetchedClients = (res.data || []) as any[];
            setClients(fetchedClients);

            // Auto-select first client/brand for non-client roles on initial load
            if (!isClient && fetchedClients.length > 0 && isInitial) {
                const firstClient = fetchedClients[0];
                const firstBrand = firstClient.brands?.[0];
                const now = new Date();
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                
                setFilters({
                    clientId: firstClient.id,
                    brandId: firstBrand?.id,
                    startDate: formatDate(firstDay),
                    endDate: formatDate(now)
                });
            }

            setRefreshKey(prev => prev + 1);
        } catch (error) {
            console.error("Failed to fetch clients", error);
        }
    }, [isClient]);

    const handleClientAdded = async () => {
        try {
            const res = await sowService.getClients();
            const newClients = res.data || [];

            if (newClients.length > clients.length) {
                const existingIds = new Set(clients.map(c => c.id));
                const addedClient = newClients.find(c => !existingIds.has(c.id));

                if (addedClient) {
                    const firstBrand = addedClient.brands?.[0];
                    const now = new Date();
                    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                    setFilters(prev => ({
                        ...prev,
                        clientId: addedClient.id,
                        brandId: firstBrand?.id,
                        startDate: formatDate(firstDay),
                        endDate: formatDate(now)
                    }));
                }
            }

            setClients((newClients || []) as any);
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            console.error("Failed to add client/refresh", error);
        }
    };

    const handleClientDeleted = () => {
        fetchClients();
        setFilters({});
    };

    // Derived brands based on selected client
    const activeBrands = clients.find(c => c.id === filters.clientId)?.brands || [];

    const fetchDashboardData = useCallback(async () => {
        const { clientId, brandId, startDate, endDate } = filters;

        if (!clientId || !brandId) {
            setStats(null);
            setJobs([]);
            return;
        }

        setIsLoading(true);
        try {
            // 1. Fetch range-based stats from the new API
            const statsRes = await sowService.getDashboardStats(clientId, brandId, startDate, endDate);
            setStats(statsRes.data);

            // 2. Fetch jobs for the table (we still use jobService for this)
            const jobsRes = await jobService.getJobs({
                brandId, // Changed to filter by brandId directly if supported, or use SOW IDs
                startDate,
                endDate
            } as any);
            setJobs((jobsRes.data || []) as any);
            
        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
            toast({
                title: "Error",
                description: "Failed to load dashboard data.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }, [filters, toast]);

    useEffect(() => {
        fetchClients(true);
    }, [fetchClients]);

    // Deleted redundant fetchBrands effect

    useEffect(() => {
        if (isClient && user?.clientId && clients.length > 0) {
            const userClient = clients.find(c => c.id === user.clientId);
            const firstBrand = userClient?.brands?.[0];
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

            setFilters(prev => ({ 
                ...prev, 
                clientId: user.clientId as number,
                brandId: prev.brandId || firstBrand?.id,
                startDate: prev.startDate || formatDate(firstDay),
                endDate: prev.endDate || formatDate(now)
            }));
        }
    }, [isClient, user?.clientId, clients]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const [editingJob, setEditingJob] = useState<Job | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const handleEditJob = (job: Job) => {
        setEditingJob(job);
        setIsEditModalOpen(true);
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl border shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Social Media SOW</h1>
                    <p className="text-slate-500">Track deliverables, content, and campaign progress</p>
                </div>
                <div className="flex gap-3">
                    <ClientSummaryModal
                        onClientDeleted={handleClientDeleted}
                        refreshTrigger={refreshKey}
                        defaultStartDate={filters.startDate}
                        defaultEndDate={filters.endDate}
                        isAdmin={isManager}
                        onSelect={(selection) => setFilters(prev => ({ ...prev, ...selection }))}
                    />
                    {isManager && <AddClientModal onClientAdded={handleClientAdded} />}
                </div>
            </div>

            <SowFiltersComponent
                clients={clients}
                brands={activeBrands as any}
                filters={filters}
                onFilterChange={setFilters}
                isClientDisabled={isClient}
            />

            <SowSummaryCards
                metrics={stats}
                isLoading={isLoading}
                onUpdate={fetchDashboardData}
            />

            {!isClient && (
                <>
                    <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-slate-900">Deliverable Tasks</h2>
                        <AddJobModal
                            clients={clients}
                            filters={filters as any}
                            onJobAdded={fetchDashboardData}
                        />
                    </div>

                    <JobsTable
                        jobs={jobs}
                        isLoading={isLoading}
                        onJobUpdated={fetchDashboardData}
                        onEditJob={handleEditJob}
                    />
                </>
            )}

            {isEditModalOpen && (
                <AddJobModal
                    clients={clients}
                    filters={filters as any}
                    job={editingJob}
                    open={isEditModalOpen}
                    onOpenChange={setIsEditModalOpen}
                    onJobAdded={fetchDashboardData}
                />
            )}
        </div>
    );
}
