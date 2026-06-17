import { trpc } from '@/lib/trpc';
import { Job, JobFormData } from '@/types';

interface JobsQuery {
    sowId?: number | number[];
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    offset?: number;
}

export const jobService = {
    getJobs: (query: JobsQuery = {}) => {
        return trpc.jobs.list.query({
            sowId: query.sowId,
            brandId: (query as any).brandId,
            startDate: query.startDate,
            endDate: query.endDate,
            search: query.search,
            status: query.status,
            limit: query.limit,
            offset: query.offset,
        });
    },

    createJob: (data: JobFormData) =>
        trpc.jobs.create.mutate(data as any),

    updateJob: (id: number, data: Partial<JobFormData>) =>
        trpc.jobs.update.mutate({ id, data }),

    deleteJob: (id: number) =>
        trpc.jobs.delete.mutate({ id }),
};
