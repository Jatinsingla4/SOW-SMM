import { trpc } from '@/lib/trpc';
import { Client, Brand, SOW, SOWFilters } from '@/types';

export const sowService = {
    getClients: () =>
        trpc.clients.list.query(),

    getBrands: (clientId: number) =>
        trpc.clients.getBrands.query({ clientId }),

    getSOWs: (filters: SOWFilters = {}) => {
        return trpc.sows.list.query({
            clientId: filters.clientId,
            brandId: filters.brandId,
            month: filters.month,
            startDate: filters.startDate,
            endDate: filters.endDate,
        });
    },

    getSOW: (id: number) =>
        trpc.sows.getById.query({ id }),

    createSOW: (data: any) =>
        trpc.sows.create.mutate(data),

    updateSOW: (id: number, data: Partial<SOW>) =>
        // Need to add updateSOW to backend if needed
        Promise.resolve({ success: true, data: {} as any }),

    createClient: (data: { 
        name: string, 
        brandName: string, 
        totalSowHours: number, 
        contractStartDate: string, 
        contractEndDate: string,
        caroCount?: number,
        staticSystemCount?: number,
        staticAiCount?: number,
        gifCount?: number,
        systemVideo15sCount?: number,
        systemVideo30sCount?: number,
        systemVideo45sCount?: number,
        shootReel15sCount?: number,
        shootReel30sCount?: number,
        shootReel45sCount?: number,
        aiVideo15sCount?: number,
        aiVideo30sCount?: number,
        aiVideo45sCount?: number,
        ytVideoCount?: number,
    }) =>
        trpc.clients.create.mutate(data),

    deleteClient: (id: number) =>
        trpc.clients.delete.mutate({ id }),

    getClientSummary: (startDate?: string, endDate?: string) => {
        return trpc.clients.getSummary.query({ startDate, endDate });
    },

    getDashboardStats: (clientId: number, brandId: number, startDate?: string, endDate?: string) => {
        return trpc.clients.getDashboardStats.query({ clientId, brandId, startDate, endDate });
    },

    getMonthlyReport: (brandId: number) => {
        return trpc.clients.getMonthlyReport.query({ brandId });
    },
};
