"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Shield } from "lucide-react";
import { userService } from "@/services/userService";
import { sowService } from "@/services/sowService";
import { toast } from "sonner";

interface BrandAssignmentModalProps {
    userId: number;
    userName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function BrandAssignmentModal({ userId, userName, open, onOpenChange }: BrandAssignmentModalProps) {
    const [clients, setClients] = useState<any[]>([]);
    const [assignedBrands, setAssignedBrands] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (open) {
            fetchData();
        }
    }, [open, userId]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [clientsRes, assignedRes] = await Promise.all([
                sowService.getClients(),
                userService.getUserBrands(userId)
            ]);
            setClients(clientsRes.data || []);
            setAssignedBrands((assignedRes || []).map((b: any) => b.id));
        } catch (error) {
            toast.error("Failed to load brand data");
        } finally {
            setIsLoading(true);
            // Small delay for smooth transition
            setTimeout(() => setIsLoading(false), 300);
        }
    };

    const handleToggleBrand = async (brandId: number, isAssigned: boolean) => {
        try {
            if (isAssigned) {
                await userService.removeBrand(userId, brandId);
                setAssignedBrands(prev => prev.filter(id => id !== brandId));
            } else {
                await userService.assignBrand(userId, brandId);
                setAssignedBrands(prev => [...prev, brandId]);
            }
        } catch (error) {
            toast.error("Failed to update brand access");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        Project Access: {userName}
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        Select which brands this user should have access to.
                    </p>
                </DialogHeader>

                <div className="flex-1 overflow-hidden px-6 pb-6">
                    {isLoading ? (
                        <div className="flex h-full items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                        </div>
                    ) : (
                        <ScrollArea className="h-full pr-4 border rounded-lg bg-slate-50/50">
                            <div className="p-4 space-y-6">
                                {clients.map((client) => (
                                    <div key={client.id} className="space-y-3">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                            {client.name}
                                        </h3>
                                        <div className="space-y-2">
                                            {client.brands?.map((brand: any) => {
                                                const isAssigned = assignedBrands.includes(brand.id);
                                                return (
                                                    <div key={brand.id} className="flex items-center justify-between group">
                                                        <label
                                                            htmlFor={`brand-${brand.id}`}
                                                            className="text-sm font-medium text-slate-700 cursor-pointer group-hover:text-primary transition-colors"
                                                        >
                                                            {brand.name}
                                                        </label>
                                                        <Checkbox
                                                            id={`brand-${brand.id}`}
                                                            checked={isAssigned}
                                                            onCheckedChange={() => handleToggleBrand(brand.id, isAssigned)}
                                                        />
                                                    </div>
                                                );
                                            })}
                                            {(!client.brands || client.brands.length === 0) && (
                                                <p className="text-xs text-slate-400 italic">No brands added yet</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {clients.length === 0 && (
                                    <div className="text-center py-8">
                                        <p className="text-sm text-slate-500">No clients found. Add clients first.</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    )}
                </div>

                <DialogFooter className="p-6 bg-slate-50 border-t">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
