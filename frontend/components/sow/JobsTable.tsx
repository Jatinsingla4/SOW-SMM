"use client";

import { Job } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Search, CheckCircle2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import React, { useState, useRef, useMemo } from "react";
import { jobService } from "@/services/jobService";
import { useToast } from "@/components/ui/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAuth } from "@/lib/auth-context";

interface JobsTableProps {
    jobs: Job[];
    isLoading: boolean;
    onJobUpdated: () => void;
    onEditJob: (job: Job) => void;
}

const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
        case "COMPLETED":
            return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Completed</Badge>;
        case "WIP":
            return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">In Progress</Badge>;
        case "REWORKED":
            return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none">Reworked</Badge>;
        default:
            return <Badge variant="secondary">Not Started</Badge>;
    }
};

export const JobsTable = React.memo(({ jobs, isLoading, onJobUpdated, onEditJob }: JobsTableProps) => {
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
    const [internalToast, setInternalToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const { toast } = useToast();
    const { user } = useAuth();
    const isManagerOrPC = ['OWNER', 'GROUP_HEAD', 'ACCOUNT_MANAGER'].includes(user?.role || '');
    const parentRef = useRef<HTMLDivElement>(null);

    const filteredJobs = useMemo(() => jobs.filter(job =>
        job.jobHeading.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        job.person?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        job.team?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        job.deliverableType?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        job.jobDescription?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    ), [jobs, debouncedSearchTerm]);

    const rowVirtualizer = useVirtualizer({
        count: filteredJobs.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 72,
        overscan: 10,
    });

    const virtualItems = rowVirtualizer.getVirtualItems();
    const paddingTop = virtualItems.length > 0 ? virtualItems[0]?.start : 0;
    const paddingBottom = virtualItems.length > 0 ? rowVirtualizer.getTotalSize() - (virtualItems[virtualItems.length - 1]?.end ?? 0) : 0;

    const handleDelete = async (id: number) => {
        try {
            await jobService.deleteJob(id);
            setInternalToast({ message: "Job deleted successfully", type: 'success' });
            setTimeout(() => setInternalToast(null), 3000);
            onJobUpdated();
        } catch (error) {
            setInternalToast({ message: "Failed to delete job", type: 'error' });
            setTimeout(() => setInternalToast(null), 3000);
        } finally {
            setShowDeleteConfirm(null);
        }
    };

    if (isLoading) {
        return <div className="h-64 flex items-center justify-center bg-white rounded-xl border border-dashed text-slate-400">Loading jobs...</div>;
    }

    return (
        <div className="space-y-4 relative">
            {internalToast && (
                <div className={`absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg text-sm font-medium z-50 animate-in fade-in slide-in-from-top-4 duration-300 ${internalToast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    <div className="flex items-center gap-2">
                        {internalToast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        {internalToast.message}
                    </div>
                </div>
            )}
            <div className="flex gap-4 items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search jobs or people..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm !== debouncedSearchTerm && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="h-4 w-4 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div
                    ref={parentRef}
                    className="overflow-x-auto overflow-y-auto scrollbar-thin max-h-[600px]"
                >
                    <Table>
                        <TableHeader className="bg-slate-50/50 sticky top-0 z-10 shadow-sm">
                            <TableRow>
                                <TableHead className="font-semibold text-slate-700 bg-slate-50/50">Deliverable Heading</TableHead>
                                <TableHead className="font-semibold text-slate-700 bg-slate-50/50">Brand</TableHead>
                                <TableHead className="font-semibold text-slate-700 bg-slate-50/50">Type</TableHead>
                                <TableHead className="font-semibold text-slate-700 bg-slate-50/50">Team</TableHead>
                                <TableHead className="font-semibold text-slate-700 bg-slate-50/50">Brief Date</TableHead>
                                <TableHead className="font-semibold text-slate-700 bg-slate-50/50">Finish Date</TableHead>
                                <TableHead className="font-semibold text-slate-700 bg-slate-50/50">Assigned To</TableHead>
                                <TableHead className="font-semibold text-slate-700 text-right bg-slate-50/50">Qty</TableHead>
                                <TableHead className="font-semibold text-slate-700 bg-slate-50/50">Status</TableHead>
                                <TableHead className="font-semibold text-slate-700 text-right bg-slate-50/50">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paddingTop > 0 && (
                                <TableRow style={{ height: `${paddingTop}px`, border: 0 }}>
                                    <TableCell colSpan={10} style={{ padding: 0 }} />
                                </TableRow>
                            )}
                            {filteredJobs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="h-32 text-center text-slate-500">No deliverables found.</TableCell>
                                </TableRow>
                            ) : (
                                virtualItems.map((virtualItem) => {
                                    const job = filteredJobs[virtualItem.index];
                                    return (
                                        <TableRow
                                            key={job.id}
                                            className="hover:bg-slate-50/50 transition-colors"
                                            style={{ height: `${virtualItem.size}px` }}
                                        >
                                            <TableCell className="font-medium whitespace-nowrap min-w-[200px]">
                                                <div>
                                                    <span className="block truncate max-w-[300px]" title={job.jobHeading ?? undefined}>{job.jobHeading}</span>
                                                    <p className="text-xs text-slate-500 font-normal line-clamp-1 max-w-[300px]" title={job.jobDescription ?? undefined}>{job.jobDescription}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                                                    {(job as any).brandName || "-"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                <span className="text-xs font-semibold px-2 py-1 bg-primary/5 text-primary rounded-md border border-primary/10">
                                                    {job.deliverableType || "-"}
                                                </span>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">{job.team || "-"}</TableCell>
                                            <TableCell className="whitespace-nowrap">{job.briefDate ? new Date(job.briefDate).toLocaleDateString() : "-"}</TableCell>
                                            <TableCell className="whitespace-nowrap">{job.finishedDate ? new Date(job.finishedDate).toLocaleDateString() : "-"}</TableCell>
                                            <TableCell className="whitespace-nowrap">{job.person || "-"}</TableCell>
                                            <TableCell className="text-right tabular-nums whitespace-nowrap">{job.quantity || 0}</TableCell>
                                            <TableCell className="whitespace-nowrap"><StatusBadge status={job.status} /></TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    {showDeleteConfirm === job.id ? (
                                                        <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-200">
                                                            <span className="text-[10px] font-semibold text-slate-400 mr-1 uppercase tracking-wider">Delete?</span>
                                                            <Button variant="ghost" size="sm" className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(job.id)}>Yes</Button>
                                                            <Button variant="ghost" size="sm" className="h-7 px-2 text-slate-500 hover:bg-slate-100" onClick={() => setShowDeleteConfirm(null)}>No</Button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500" onClick={() => onEditJob(job)}><Edit className="h-4 w-4" /></Button>
                                                            {isManagerOrPC && (
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => setShowDeleteConfirm(job.id)}><Trash2 className="h-4 w-4" /></Button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                            {paddingBottom > 0 && (
                                <TableRow style={{ height: `${paddingBottom}px`, border: 0 }}>
                                    <TableCell colSpan={10} style={{ padding: 0 }} />
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
});
