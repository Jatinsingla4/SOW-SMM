"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { sowService } from "@/services/sowService";
import { List, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { formatDate } from "@/lib/utils";

interface ClientSummaryModalProps {
    onClientDeleted?: () => void;
    refreshTrigger?: number;
    defaultStartDate?: string;
    defaultEndDate?: string;
    isAdmin?: boolean;
    onSelect?: (filters: { clientId: number; brandId: number; startDate: string; endDate: string }) => void;
}

export function ClientSummaryModal({ onClientDeleted, refreshTrigger, defaultStartDate, defaultEndDate, isAdmin, onSelect }: ClientSummaryModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [summary, setSummary] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    // Debouncing search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Default to 1st of current month to today
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

    const [startDate, setStartDate] = useState<string>(defaultStartDate || formatDate(firstDay));
    const [endDate, setEndDate] = useState<string>(defaultEndDate || formatDate(now));
    const { toast } = useToast();

    const fetchSummary = async () => {
        setIsLoading(true);
        try {
            const res = await sowService.getClientSummary(startDate || undefined, endDate || undefined);
            setSummary(res.data || []);
        } catch (error) {
            console.error("Failed to fetch client summary", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteClient = async (id: number, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"? This will delete all brands, SOWs, and jobs associated with this client.`)) {
            return;
        }

        try {
            await sowService.deleteClient(id);
            toast({ title: "Deleted", description: "Client deleted successfully" });
            if (onClientDeleted) onClientDeleted();
            fetchSummary();
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete client", variant: "destructive" });
        }
    };

    useEffect(() => {
        if (isOpen) {
            // Update local state if props change while modal is open (or just opened)
            if (defaultStartDate && startDate !== defaultStartDate && !startDate) setStartDate(defaultStartDate);
            if (defaultEndDate && endDate !== defaultEndDate && !endDate) setEndDate(defaultEndDate);
            fetchSummary();
        }
    }, [isOpen, startDate, endDate, refreshTrigger]);

    // Handle initial state when modal opens
    useEffect(() => {
        if (isOpen) {
            if (defaultStartDate) setStartDate(defaultStartDate);
            if (defaultEndDate) setEndDate(defaultEndDate);
        }
    }, [isOpen, defaultStartDate, defaultEndDate]);

    // Filtered summary based on search term
    const filteredSummary = summary.filter((item) => {
        const search = debouncedSearch.toLowerCase();
        return (
            item.clientName.toLowerCase().includes(search) ||
            item.brandName.toLowerCase().includes(search)
        );
    });

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" className="gap-2 text-slate-600 hover:text-slate-900">
                    <List className="h-4 w-4" />
                    Manage Clients
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Social Media Client Summary</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-4">
                    <div className="flex flex-col md:flex-row items-end gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <div className="grid gap-1.5 flex-[2]">
                            <label className="text-xs font-medium text-slate-500">Search Clients or Brands</label>
                            <Input
                                placeholder="Search by name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-9"
                            />
                        </div>
                        <div className="grid gap-1.5 flex-1">
                            <label className="text-xs font-medium text-slate-500">From Date</label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="h-9"
                            />
                        </div>
                        <div className="grid gap-1.5 flex-1">
                            <label className="text-xs font-medium text-slate-500">To Date</label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="h-9"
                            />
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                const n = new Date();
                                setStartDate(formatDate(new Date(n.getFullYear(), n.getMonth(), 1)));
                                setEndDate(formatDate(n));
                                setSearchTerm("");
                            }}
                            className="text-slate-500 h-9"
                        >
                            Clear
                        </Button>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-12 text-slate-500">
                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                            Updating data...
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Company & Project</TableHead>
                                        <TableHead className="text-right">SOW Deliverables Breakdown</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredSummary.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center py-8 text-slate-500">
                                                {summary.length === 0 ? "No project data found for this period." : "No results match your search."}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredSummary.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">
                                                    <div className="flex flex-col">
                                                        <span>{item.clientName}</span>
                                                        <span className="text-xs text-slate-500 font-normal">{item.brandName}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex flex-wrap justify-end gap-1.5 max-w-[500px] ml-auto">
                                                        {/* Statics group */}
                                                        {item.staticSystemCount > 0 && <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[9px] font-bold border border-blue-100">SYS ST: {item.staticSystemCount}</span>}
                                                        {item.staticAiCount > 0 && <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[9px] font-bold border border-indigo-100">AI ST: {item.staticAiCount}</span>}
                                                        {item.gifCount > 0 && <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 text-[9px] font-bold border border-amber-100">GIF: {item.gifCount}</span>}
                                                        {item.caroCount > 0 && <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[9px] font-bold border border-emerald-100">CR: {item.caroCount}</span>}
                                                        
                                                        {/* Videos group */}
                                                        {(item.systemVideo15sCount || 0) + (item.systemVideo30sCount || 0) + (item.systemVideo45sCount || 0) > 0 && (
                                                            <span className="px-1.5 py-0.5 rounded bg-slate-50 text-slate-600 text-[9px] font-bold border border-slate-200">
                                                                SYS VID: {[item.systemVideo15sCount, item.systemVideo30sCount, item.systemVideo45sCount].filter(v => v > 0).join('/')}
                                                            </span>
                                                        )}

                                                        {/* Reels group */}
                                                        {(item.shootReel15sCount || 0) + (item.shootReel30sCount || 0) + (item.shootReel45sCount || 0) > 0 && (
                                                            <span className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 text-[9px] font-bold border border-orange-100">
                                                                REEL: {[item.shootReel15sCount, item.shootReel30sCount, item.shootReel45sCount].filter(v => v > 0).join('/')}
                                                            </span>
                                                        )}

                                                        {/* AI Videos group */}
                                                        {(item.aiVideo15sCount || 0) + (item.aiVideo30sCount || 0) + (item.aiVideo45sCount || 0) > 0 && (
                                                            <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 text-[9px] font-bold border border-purple-100">
                                                                AI VID: {[item.aiVideo15sCount, item.aiVideo30sCount, item.aiVideo45sCount].filter(v => v > 0).join('/')}
                                                            </span>
                                                        )}

                                                        {/* Long Format */}
                                                        {item.ytVideoCount > 0 && <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 text-[9px] font-bold border border-red-100">YT: {item.ytVideoCount}</span>}
                                                    </div>
                                                </TableCell>
                                                 <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-primary hover:text-primary hover:bg-primary/10 text-xs h-8"
                                                            onClick={() => {
                                                                if (onSelect) {
                                                                    onSelect({ 
                                                                        clientId: item.clientId, 
                                                                        brandId: item.brandId,
                                                                        startDate,
                                                                        endDate
                                                                    });
                                                                    setIsOpen(false);
                                                                }
                                                            }}
                                                        >
                                                            View
                                                        </Button>
                                                        {isAdmin && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                onClick={() => handleDeleteClient(item.clientId, item.clientName)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
