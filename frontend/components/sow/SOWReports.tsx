'use client';

import { useState, useMemo, useEffect } from 'react';
import { sowService } from '@/services/sowService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Calendar, Clock, BarChart3, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function SOWReports() {
    const [selectedClientId, setSelectedClientId] = useState<number | undefined>();
    const [selectedBrandId, setSelectedBrandId] = useState<number | undefined>();

    const [clients, setClients] = useState<any[]>([]);
    const [clientsLoading, setClientsLoading] = useState(true);

    const [reportData, setReportData] = useState<any[]>([]);
    const [reportLoading, setReportLoading] = useState(false);

    useEffect(() => {
        async function fetchClients() {
            try {
                const res = await sowService.getClients();
                setClients(res.data || []);
            } catch (err) {
                console.error(err);
            } finally {
                setClientsLoading(false);
            }
        }
        fetchClients();
    }, []);

    useEffect(() => {
        async function fetchReport() {
            if (!selectedBrandId) {
                setReportData([]);
                return;
            }
            setReportLoading(true);
            try {
                const res = await sowService.getMonthlyReport(selectedBrandId);
                setReportData(res.data || []);
            } catch (err) {
                console.error(err);
            } finally {
                setReportLoading(false);
            }
        }
        fetchReport();
    }, [selectedBrandId]);

    const brands = useMemo(() => {
        if (!selectedClientId) return [];
        return clients.find((c: any) => c.id === selectedClientId)?.brands || [];
    }, [clients, selectedClientId]);

    // Format utility
    const formatHours = (hours: number) => {
        return Math.round(hours * 10) / 10;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="w-full sm:w-1/3">
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Client</label>
                    <Select
                        value={selectedClientId?.toString()}
                        onValueChange={(val) => {
                            setSelectedClientId(parseInt(val));
                            setSelectedBrandId(undefined); // Reset brand when client changes
                        }}
                    >
                        <SelectTrigger className="bg-white">
                            <SelectValue placeholder={clientsLoading ? "Loading..." : "Select Client"} />
                        </SelectTrigger>
                        <SelectContent>
                            {clients.map((c: any) => (
                                <SelectItem key={c.id} value={c.id.toString()}>
                                    {c.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="w-full sm:w-1/3">
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Brand / Project</label>
                    <Select
                        value={selectedBrandId?.toString()}
                        onValueChange={(val) => setSelectedBrandId(parseInt(val))}
                        disabled={!selectedClientId || brands.length === 0}
                    >
                        <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select Brand" />
                        </SelectTrigger>
                        <SelectContent>
                            {brands.map((b: any) => (
                                <SelectItem key={b.id} value={b.id.toString()}>
                                    {b.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {selectedBrandId && (
                <div className="space-y-6 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {reportLoading ? (
                        <div className="flex justify-center items-center py-20">
                            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                            <span className="ml-3 text-slate-500 font-medium">Generating Monthly Report...</span>
                        </div>
                    ) : reportData.length === 0 ? (
                        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
                            <Calendar className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                            <h3 className="text-lg font-semibold text-slate-900">No Contract Data</h3>
                            <p className="text-slate-500 mt-2 max-w-sm mx-auto">This project does not have a contract start and end date defined, or has no SOW tracking data.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {reportData.map((data: any, idx: number) => {
                                const utilisationPercentage = data.totalSowHours > 0 
                                    ? Math.min(100, Math.round((data.utilisedHours / data.totalSowHours) * 100))
                                    : 0;
                                    
                                const isOverUtilised = data.utilisedHours > data.totalSowHours;

                                return (
                                    <Card key={idx} className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                        <div className={`h-1.5 w-full ${isOverUtilised ? 'bg-red-500' : 'bg-indigo-500'}`} />
                                        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                                            <div className="flex justify-between items-center">
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-slate-400" />
                                                    {data.month}
                                                </CardTitle>
                                                {isOverUtilised && (
                                                    <div className="flex items-center text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full">
                                                        <AlertTriangle className="h-3 w-3 mr-1" /> Over
                                                    </div>
                                                )}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pt-5 space-y-5">
                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <p className="text-sm text-slate-500 mb-1 flex items-center gap-1.5">
                                                        <BarChart3 className="h-3.5 w-3.5" /> Used Hours
                                                    </p>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className={`text-3xl font-bold tracking-tight ${isOverUtilised ? 'text-red-600' : 'text-slate-900'}`}>
                                                            {formatHours(data.utilisedHours)}
                                                        </span>
                                                        <span className="text-sm text-slate-500 font-medium">/ {formatHours(data.totalSowHours)}h</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-1.5 flex flex-col justify-end">
                                                <div className="flex justify-between text-xs font-medium">
                                                    <span className="text-slate-600">Utilization</span>
                                                    <span className={isOverUtilised ? 'text-red-600' : 'text-indigo-600'}>{utilisationPercentage}%</span>
                                                </div>
                                                <Progress 
                                                    value={utilisationPercentage} 
                                                    className={`h-2.5 ${isOverUtilised ? 'bg-red-100 [&>div]:bg-red-500' : 'bg-indigo-50 [&>div]:bg-indigo-500'}`} 
                                                />
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                                                <div>
                                                     <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Status</p>
                                                     <p className={`text-sm font-semibold truncate ${isOverUtilised ? 'text-red-600' : data.variance === 0 ? 'text-slate-400' : 'text-emerald-600'}`}>
                                                         {isOverUtilised ? 'Exceeded Budget' : data.variance === 0 ? 'Fully Utilised' : 'Within Budget'}
                                                     </p>
                                                </div>
                                                <div className="text-right">
                                                     <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Hours Left</p>
                                                     <p className={`text-sm font-semibold flex items-center justify-end gap-1 ${isOverUtilised ? 'text-red-600' : 'text-slate-900'}`}>
                                                         <Clock className="h-3.5 w-3.5 text-slate-400" />
                                                         {isOverUtilised ? `-${formatHours(Math.abs(data.variance))}` : formatHours(data.variance)}h
                                                     </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
