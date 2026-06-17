export type JobStatus = 'NOT_STARTED' | 'WIP' | 'COMPLETED' | 'REWORKED';

export interface Client {
    id: number;
    name: string;
    createdAt: string;
    brands?: Brand[];
}

export interface Brand {
    id: number;
    clientId: number;
    name: string;
    contractStartDate?: string;
    contractEndDate?: string;
    monthlySowHours?: number;
    caroCount?: number;
    staticSystemCount?: number;
    staticAiCount?: number;
    gifCount?: number;
    systemVideo15sCount?: number;
    systemVideo30sCount?: number;
    systemVideo45sCount?: number;
    shootReel15sCount?: number;
    shootReel30sCount?: number;
    shootReel45sCount?: number;
    aiVideo15sCount?: number;
    aiVideo30sCount?: number;
    aiVideo45sCount?: number;
    ytVideoCount?: number;
    createdAt: string;
}

export interface SOW {
    id: number;
    clientId: number;
    brandId: number;
    month: string;
    startDate: string;
    endDate: string;
    totalSowHours: number;
    version?: number;
    createdAt: string;
    client?: Client;
    brand?: Brand;
    metrics?: SOWMetrics;
}

export interface SOWMetrics {
    totalSowHours: number;
    utilisedHours: number;
    variance: number;
    hoursLeft: number;
    percentVariance: number;
    totalJobs: number;
    completedJobs: number;
    pendingJobs: number;
    deliverables?: {
        [key: string]: { done: number; total: number };
    };
}

export interface Job {
    id: number;
    sowId: number;
    clientId?: number;
    brandId?: number;
    jobHeading: string;
    jobDescription?: string | null;
    team?: string | null;
    pm?: string | null;
    uiux?: string | null;
    frontend?: string | null;
    backend?: string | null;
    server?: string | null;
    person?: string | null;
    deliverableType?: string | null;
    quantity?: number | null;
    targetedHours?: number | null;
    allocatedHours: number;
    briefDate?: string | null;
    workingDate?: string | null;
    finishedDate?: string | null;
    status: JobStatus;
    version?: number;
    createdAt: string;
    updatedAt: string;
}

export interface JobFormData {
    sowId?: number;
    clientId: number;
    brandId: number;
    jobHeading: string;
    jobDescription?: string;
    team?: string;
    person?: string;
    deliverableType?: string;
    quantity?: number;
    targetedHours?: number;
    allocatedHours: number;
    briefDate?: string;
    finishedDate?: string;
    status: JobStatus;
    version?: number;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    errors?: unknown[];
}

export interface PaginatedApiResponse<T> extends ApiResponse<T> {
    pagination?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface SOWFilters {
    clientId?: number;
    brandId?: number;
    month?: string;
    startDate?: string;
    endDate?: string;
}
