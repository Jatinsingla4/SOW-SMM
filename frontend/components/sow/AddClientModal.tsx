"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { sowService } from "@/services/sowService";
import { Plus, MonitorPlay, Film, Cpu, Youtube, Settings, Image as ImageIcon, Video, Share2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { formatDate } from "@/lib/utils";

interface AddClientModalProps {
    onClientAdded: () => void;
}

export function AddClientModal({ onClientAdded }: AddClientModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("general");
    const { toast } = useToast();

    const today = formatDate(new Date());

    const [formValues, setFormValues] = useState({
        clientName: "",
        brandName: "",
        contractStartDate: today,
        contractEndDate: "",
        caroCount: 0,
        staticSystemCount: 0,
        staticAiCount: 0,
        gifCount: 0,
        systemVideo15sCount: 0,
        systemVideo30sCount: 0,
        systemVideo45sCount: 0,
        shootReel15sCount: 0,
        shootReel30sCount: 0,
        shootReel45sCount: 0,
        aiVideo15sCount: 0,
        aiVideo30sCount: 0,
        aiVideo45sCount: 0,
        ytVideoCount: 0,
    });

    const handleInputChange = (field: string, value: string | number) => {
        setFormValues(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await sowService.createClient({
                name: formValues.clientName,
                brandName: formValues.brandName,
                contractStartDate: formValues.contractStartDate,
                contractEndDate: formValues.contractEndDate,
                totalSowHours: 0,
                caroCount: formValues.caroCount,
                staticSystemCount: formValues.staticSystemCount,
                staticAiCount: formValues.staticAiCount,
                gifCount: formValues.gifCount,
                systemVideo15sCount: formValues.systemVideo15sCount,
                systemVideo30sCount: formValues.systemVideo30sCount,
                systemVideo45sCount: formValues.systemVideo45sCount,
                shootReel15sCount: formValues.shootReel15sCount,
                shootReel30sCount: formValues.shootReel30sCount,
                shootReel45sCount: formValues.shootReel45sCount,
                aiVideo15sCount: formValues.aiVideo15sCount,
                aiVideo30sCount: formValues.aiVideo30sCount,
                aiVideo45sCount: formValues.aiVideo45sCount,
                ytVideoCount: formValues.ytVideoCount,
            });

            toast({ title: "Success", description: "Client and brand added successfully" });
            onClientAdded();
            setIsOpen(false);
            // Reset form
            setActiveTab("general");
        } catch (error: any) {
            const message = error?.message || "Failed to add client. Please check your inputs.";
            toast({ title: "Error", description: message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) setActiveTab("general");
        }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Client
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col p-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Plus className="h-5 w-5 text-primary" />
                        Add New Client & SOW
                    </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
                    <ScrollArea className="flex-1 p-6 pt-2">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-4 mb-6">
                                <TabsTrigger value="general" className="text-xs flex items-center gap-1.5">
                                    <Settings className="h-3.5 w-3.5" /> General
                                </TabsTrigger>
                                <TabsTrigger value="graphics" className="text-xs flex items-center gap-1.5">
                                    <ImageIcon className="h-3.5 w-3.5" /> Graphics
                                </TabsTrigger>
                                <TabsTrigger value="videos" className="text-xs flex items-center gap-1.5">
                                    <Video className="h-3.5 w-3.5" /> Videos
                                </TabsTrigger>
                                <TabsTrigger value="other" className="text-xs flex items-center gap-1.5">
                                    <Share2 className="h-3.5 w-3.5" /> Other
                                </TabsTrigger>
                            </TabsList>

                            {/* General Tab */}
                            <TabsContent value="general" className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300 pointer-events-auto">
                                <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-5">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                        <div className="h-3 w-1 bg-amber-500 rounded-full" />
                                        Brand Identity
                                    </h3>
                                    <div className="grid gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="clientName">Client Name *</Label>
                                            <Input id="clientName" value={formValues.clientName} onChange={(e) => handleInputChange("clientName", e.target.value)} placeholder="e.g. Acme Corp" required className="h-10" />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="brandName">Brand Name *</Label>
                                            <Input id="brandName" value={formValues.brandName} onChange={(e) => handleInputChange("brandName", e.target.value)} placeholder="e.g. Nike India" required className="h-10" />
                                        </div>
                                    </div>
                                    
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 pt-2">
                                        <div className="h-3 w-1 bg-blue-500 rounded-full" />
                                        Contract Duration
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="contractStartDate">Start Date *</Label>
                                            <Input id="contractStartDate" type="date" value={formValues.contractStartDate} onChange={(e) => handleInputChange("contractStartDate", e.target.value)} required className="h-10" />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="contractEndDate">End Date *</Label>
                                            <Input id="contractEndDate" type="date" value={formValues.contractEndDate} onChange={(e) => handleInputChange("contractEndDate", e.target.value)} required className="h-10" />
                                        </div>
                                    </div>
                                    <Button type="button" onClick={() => setActiveTab("graphics")} className="w-full mt-4 bg-slate-800 hover:bg-slate-900">Next: Graphics</Button>
                                </div>
                            </TabsContent>

                            {/* Graphics Tab */}
                            <TabsContent value="graphics" className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
                                <div className="bg-blue-50/30 p-5 rounded-xl border border-blue-100 space-y-5">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
                                        <ImageIcon className="h-3.5 w-3.5" /> Statics & Graphics
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label className="text-xs font-bold text-slate-600">System Statics</Label>
                                            <Input type="number" value={formValues.staticSystemCount} onChange={(e) => handleInputChange("staticSystemCount", parseInt(e.target.value || "0"))} className="h-10" />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label className="text-xs font-bold text-slate-600">AI Statics</Label>
                                            <Input type="number" value={formValues.staticAiCount} onChange={(e) => handleInputChange("staticAiCount", parseInt(e.target.value || "0"))} className="h-10" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label className="text-xs font-bold text-slate-600">Monthly GIFs</Label>
                                            <Input type="number" value={formValues.gifCount} onChange={(e) => handleInputChange("gifCount", parseInt(e.target.value || "0"))} className="h-10" />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label className="text-xs font-bold text-slate-600">Carousels</Label>
                                            <Input type="number" value={formValues.caroCount} onChange={(e) => handleInputChange("caroCount", parseInt(e.target.value || "0"))} className="h-10" />
                                        </div>
                                    </div>
                                    <Button type="button" onClick={() => setActiveTab("videos")} className="w-full mt-4 bg-blue-600 hover:bg-blue-700">Next: Videos</Button>
                                </div>
                            </TabsContent>

                            {/* Videos Tab */}
                            <TabsContent value="videos" className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
                                <div className="space-y-4">
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <h4 className="text-[10px] font-black uppercase text-slate-500 mb-4 flex items-center gap-2">
                                            <MonitorPlay className="h-3.5 w-3.5" /> System Videos
                                        </h4>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="grid gap-1.5 text-center">
                                                <Label className="text-[10px] text-slate-400">15s</Label>
                                                <Input type="number" value={formValues.systemVideo15sCount} onChange={(e) => handleInputChange("systemVideo15sCount", parseInt(e.target.value || "0"))} className="h-9 text-center" />
                                            </div>
                                            <div className="grid gap-1.5 text-center">
                                                <Label className="text-[10px] text-slate-400">30s</Label>
                                                <Input type="number" value={formValues.systemVideo30sCount} onChange={(e) => handleInputChange("systemVideo30sCount", parseInt(e.target.value || "0"))} className="h-9 text-center" />
                                            </div>
                                            <div className="grid gap-1.5 text-center">
                                                <Label className="text-[10px] text-slate-400">45s</Label>
                                                <Input type="number" value={formValues.systemVideo45sCount} onChange={(e) => handleInputChange("systemVideo45sCount", parseInt(e.target.value || "0"))} className="h-9 text-center" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-orange-50/30 p-4 rounded-xl border border-orange-100">
                                        <h4 className="text-[10px] font-black uppercase text-orange-600 mb-4 flex items-center gap-2">
                                            <Film className="h-3.5 w-3.5" /> Shoot Reels
                                        </h4>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="grid gap-1.5 text-center">
                                                <Label className="text-[10px] text-slate-400">15s</Label>
                                                <Input type="number" value={formValues.shootReel15sCount} onChange={(e) => handleInputChange("shootReel15sCount", parseInt(e.target.value || "0"))} className="h-9 text-center" />
                                            </div>
                                            <div className="grid gap-1.5 text-center">
                                                <Label className="text-[10px] text-slate-400">30s</Label>
                                                <Input type="number" value={formValues.shootReel30sCount} onChange={(e) => handleInputChange("shootReel30sCount", parseInt(e.target.value || "0"))} className="h-9 text-center" />
                                            </div>
                                            <div className="grid gap-1.5 text-center">
                                                <Label className="text-[10px] text-slate-400">45s</Label>
                                                <Input type="number" value={formValues.shootReel45sCount} onChange={(e) => handleInputChange("shootReel45sCount", parseInt(e.target.value || "0"))} className="h-9 text-center" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-purple-50/30 p-4 rounded-xl border border-purple-100">
                                        <h4 className="text-[10px] font-black uppercase text-purple-600 mb-4 flex items-center gap-2">
                                            <Cpu className="h-3.5 w-3.5" /> AI Videos
                                        </h4>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="grid gap-1.5 text-center">
                                                <Label className="text-[10px] text-slate-400">15s</Label>
                                                <Input type="number" value={formValues.aiVideo15sCount} onChange={(e) => handleInputChange("aiVideo15sCount", parseInt(e.target.value || "0"))} className="h-9 text-center" />
                                            </div>
                                            <div className="grid gap-1.5 text-center">
                                                <Label className="text-[10px] text-slate-400">30s</Label>
                                                <Input type="number" value={formValues.aiVideo30sCount} onChange={(e) => handleInputChange("aiVideo30sCount", parseInt(e.target.value || "0"))} className="h-9 text-center" />
                                            </div>
                                            <div className="grid gap-1.5 text-center">
                                                <Label className="text-[10px] text-slate-400">45s</Label>
                                                <Input type="number" value={formValues.aiVideo45sCount} onChange={(e) => handleInputChange("aiVideo45sCount", parseInt(e.target.value || "0"))} className="h-9 text-center" />
                                            </div>
                                        </div>
                                    </div>
                                    <Button type="button" onClick={() => setActiveTab("other")} className="w-full mt-4 bg-orange-600 hover:bg-orange-700">Next: YouTube & Other</Button>
                                </div>
                            </TabsContent>

                            {/* Other Tab */}
                            <TabsContent value="other" className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
                                <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-6">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="grid gap-2">
                                            <Label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                                <Youtube className="h-3.5 w-3.5 text-red-600" /> Long YT Video
                                            </Label>
                                            <Input type="number" value={formValues.ytVideoCount} onChange={(e) => handleInputChange("ytVideoCount", parseInt(e.target.value || "0"))} className="h-10" />
                                        </div>
                                    </div>
                                    
                                    <Button type="submit" disabled={isLoading} className="w-full h-11 text-base font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 mt-6">
                                        {isLoading ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                                Creating Project...
                                            </>
                                        ) : (
                                            "Create Project & SOW"
                                        )}
                                    </Button>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </ScrollArea>
                </form>
            </DialogContent>
        </Dialog>
    );
}
