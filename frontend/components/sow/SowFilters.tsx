"use client";

import { Client, Brand, SOWFilters } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";

interface SowFiltersProps {
    clients: Client[];
    brands: Brand[];
    filters: SOWFilters;
    onFilterChange: (filters: SOWFilters) => void;
    isClientDisabled?: boolean;
}

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

export function SowFiltersComponent({ clients, brands, filters, onFilterChange, isClientDisabled }: SowFiltersProps) {
    const handleMonthChange = (val: string) => {
        const [monthName, yearStr] = val.split(" ");
        const year = parseInt(yearStr);
        const monthIndex = MONTHS.indexOf(monthName);

        const start = new Date(year, monthIndex, 1);
        const end = new Date(year, monthIndex + 1, 0);

        onFilterChange({
            ...filters,
            month: val,
            startDate: formatDate(start),
            endDate: formatDate(end)
        });
    };

    const handleQuickRange = (months: number) => {
        const end = new Date();
        const start = new Date();
        start.setMonth(start.getMonth() - months);

        onFilterChange({
            ...filters,
            startDate: formatDate(start),
            endDate: formatDate(end),
            month: undefined // Clear month when doing custom range
        });
    };

    return (
        <Card className="border-none shadow-sm bg-white/50 backdrop-blur-sm">
            <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    <div className="space-y-2">
                        <Label>Client</Label>
                        <Select
                            value={filters.clientId?.toString()}
                            onValueChange={(val) => {
                                const clientId = parseInt(val);
                                const client = clients.find(c => c.id === clientId);
                                const firstBrand = client?.brands?.[0];
                                onFilterChange({ 
                                    ...filters, 
                                    clientId, 
                                    brandId: firstBrand?.id 
                                });
                            }}
                            disabled={isClientDisabled}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Client" />
                            </SelectTrigger>
                            <SelectContent>
                                {clients.map((c) => (
                                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Brand</Label>
                        <Select
                            value={filters.brandId?.toString()}
                            onValueChange={(val) => onFilterChange({ ...filters, brandId: parseInt(val) })}
                            disabled={!filters.clientId}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={filters.clientId ? "Select Brand" : "Select client first"} />
                            </SelectTrigger>
                            <SelectContent>
                                {brands.map((b) => (
                                    <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Month</Label>
                        <Select
                            value={filters.month}
                            onValueChange={handleMonthChange}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Month" />
                            </SelectTrigger>
                            <SelectContent>
                                {MONTHS.map((m) => {
                                    const year = new Date().getFullYear();
                                    const val = `${m} ${year}`;
                                    return (
                                        <SelectItem key={m} value={val}>{val}</SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2 lg:col-span-2">
                        <div className="flex justify-between items-center mb-0.5">
                            <Label>Date Range</Label>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5" onClick={() => handleQuickRange(3)}>3m</Button>
                                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5" onClick={() => handleQuickRange(6)}>6m</Button>
                                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5" onClick={() => handleQuickRange(12)}>1y</Button>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Input
                                type="date"
                                className="h-9 px-2 text-xs"
                                value={filters.startDate || ""}
                                onChange={(e) => onFilterChange({ ...filters, startDate: e.target.value, month: undefined })}
                            />
                            <Input
                                type="date"
                                className="h-9 px-2 text-xs"
                                value={filters.endDate || ""}
                                onChange={(e) => onFilterChange({ ...filters, endDate: e.target.value, month: undefined })}
                            />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
