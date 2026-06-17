"use client";

import { SOWMetrics } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, CheckCircle2, AlertCircle, LayoutGrid, Timer, ArrowUpRight, ArrowDownRight, Info, Video, Users, Smartphone, Image, Sparkles, Zap, Film, Cpu, Youtube, MonitorPlay, Palette } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { sowService } from "@/services/sowService";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";

interface SowSummaryCardsProps {
    sowId?: number;
    metrics?: SOWMetrics;
    version?: number;
    isLoading: boolean;
    onUpdate?: () => void;
}

const MetricCard = ({ title, value, icon: Icon, color, tooltip, trend }: any) => (
    <Card className="overflow-hidden border-none shadow-md transition-all hover:shadow-lg group relative bg-white">
        <div className={`absolute top-0 left-0 w-1 h-full ${color}`} />
        <CardContent className="p-6">
            <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {title}
                        {tooltip && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Info className="h-3 w-3" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="w-48 text-xs">{tooltip}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                    <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-bold tracking-tight text-slate-900">{value}</p>
                        {trend && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${trend.type === 'up' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                {trend.value}
                            </span>
                        )}
                    </div>
                </div>
                <div className={`p-3 rounded-2xl ${color.replace('bg-', 'bg-').replace('text-', 'text-')} bg-opacity-10 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>
        </CardContent>
    </Card>
);

export const SowSummaryCards = React.memo(({ metrics, isLoading }: SowSummaryCardsProps) => {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-32 bg-white rounded-2xl border border-slate-100 shadow-sm" />
                ))}
            </div>
        );
    }

    const data = metrics || {
        totalSowHours: 0,
        utilisedHours: 0,
        variance: 0,
        hoursLeft: 0,
        totalJobs: 0,
        completedJobs: 0,
        pendingJobs: 0,
        hourlyCharge: 0,
        totalCharges: 0,
        deliverables: {}
    };

    const deliverables = (data.deliverables || {}) as any;
    
    const totalDeliverablesDone = Object.values(deliverables).reduce((acc: number, curr: any) => acc + (curr.done || 0), 0);
    const totalDeliverablesTarget = Object.values(deliverables).reduce((acc: number, curr: any) => acc + (curr.total || 0), 0);

    const deliverableGroups = [
        {
            title: "Statics & Graphics",
            color: "text-blue-600",
            bg: "bg-blue-50",
            items: [
                { key: "staticSystem", label: "System Statics", icon: Palette, color: "bg-blue-500" },
                { key: "staticAi", label: "AI Statics", icon: Sparkles, color: "bg-indigo-500" },
                { key: "gif", label: "GIFs", icon: Zap, color: "bg-amber-500" },
                { key: "caro", label: "Carousels", icon: LayoutGrid, color: "bg-emerald-500" },
            ]
        },
        {
            title: "System Videos",
            color: "text-slate-600",
            bg: "bg-slate-50",
            items: [
                { key: "systemVideo15s", label: "System 15s", icon: MonitorPlay, color: "bg-slate-600" },
                { key: "systemVideo30s", label: "System 30s", icon: MonitorPlay, color: "bg-slate-700" },
                { key: "systemVideo45s", label: "System 45s", icon: MonitorPlay, color: "bg-slate-800" },
            ]
        },
        {
            title: "Shoot Reels",
            color: "text-orange-600",
            bg: "bg-orange-50",
            items: [
                { key: "shootReel15s", label: "Reel 15s", icon: Film, color: "bg-orange-500" },
                { key: "shootReel30s", label: "Reel 30s", icon: Film, color: "bg-orange-600" },
                { key: "shootReel45", label: "Reel 45s", icon: Film, color: "bg-orange-700" },
            ]
        },
        {
            title: "AI & Long Format",
            color: "text-purple-600",
            bg: "bg-purple-50",
            items: [
                { key: "aiVideo15s", label: "AI Video 15s", icon: Cpu, color: "bg-purple-500" },
                { key: "aiVideo30s", label: "AI Video 30s", icon: Cpu, color: "bg-purple-600" },
                { key: "aiVideo45s", label: "AI Video 45s", icon: Cpu, color: "bg-purple-700" },
                { key: "ytVideo", label: "YT Long Format", icon: Youtube, color: "bg-red-600" },
            ]
        }
    ];

    const CompactCard = ({ item }: { item: any }) => {
        const stats = deliverables[item.key] || { done: 0, total: 0 };
        const percent = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
        const Icon = item.icon;

        return (
            <Card className="overflow-hidden border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 group bg-white hover:-translate-y-1">
                <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                        <div className={`p-2.5 rounded-xl ${item.color} bg-opacity-10 group-hover:bg-opacity-20 transition-colors`}>
                            <Icon className={`h-5 w-5 ${item.color.replace('bg-', 'text-')}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 truncate">{item.label}</span>
                                <span className="text-xs font-black text-slate-900 ml-1">{stats.done}<span className="text-slate-300 mx-0.5">/</span>{stats.total}</span>
                            </div>
                            <div className="w-full bg-slate-50 rounded-full h-1.5 relative overflow-hidden">
                                <div 
                                    className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out ${percent >= 100 ? 'bg-emerald-500' : item.color}`} 
                                    style={{ width: `${Math.min(100, percent)}%` }} 
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="space-y-8">
            {/* Main Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MetricCard
                    title="Overall Progress"
                    value={`${totalDeliverablesTarget > 0 ? Math.round((totalDeliverablesDone / totalDeliverablesTarget) * 100) : 0}%`}
                    icon={CheckCircle2}
                    color="bg-emerald-600 text-emerald-600"
                />
                <MetricCard
                    title="Pending Tasks"
                    value={data.pendingJobs}
                    icon={AlertCircle}
                    color="bg-orange-500 text-orange-500"
                />
            </div>

            {/* Creative Deliverables Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
                {deliverableGroups.map((group, idx) => {
                    return (
                        <div key={idx} className="space-y-6">
                            <div className="flex items-center gap-3 border-b-2 pb-4 border-slate-50">
                                <div className={`h-6 w-1 rounded-full ${group.color.replace('text-', 'bg-')}`} />
                                <h3 className={`text-[12px] font-black uppercase tracking-[0.4em] ${group.color}`}>{group.title}</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                {group.items.map((item) => (
                                    <CompactCard key={item.key} item={item} />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Legacy/Other Deliverables (if any exist and aren't in groups) */}
            {Object.entries(deliverables).some(([key, val]: any) => 
                !deliverableGroups.some(g => g.items.some(i => i.key === key)) && (val.total > 0 || val.done > 0)
            ) && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                        <div className="h-4 w-1 rounded-full bg-slate-300" />
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Other Deliverables</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {Object.entries(deliverables).map(([key, value]: [string, any]) => {
                            if (deliverableGroups.some(g => g.items.some(i => i.key === key))) return null;
                            if (value.total === 0 && value.done === 0) return null;
                            const percent = value.total > 0 ? Math.round((value.done / value.total) * 100) : 0;
                            return (
                                <Card key={key} className="overflow-hidden border-none shadow-sm bg-white">
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-semibold text-slate-600 truncate">{key}</span>
                                            <span className="text-xs font-bold text-primary">{value.done} / {value.total}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                            <div 
                                                className={`h-1.5 rounded-full transition-all duration-500 ${percent >= 100 ? 'bg-emerald-500' : 'bg-primary'}`} 
                                                style={{ width: `${Math.min(100, percent)}%` }} 
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
});
