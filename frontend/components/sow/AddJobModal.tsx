import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Job } from "@/types";
import { jobService } from "@/services/jobService";
import { userService } from "@/services/userService";
import { Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

interface AddJobModalProps {
    sowId?: number;
    clients?: any[];
    filters?: { clientId?: number; brandId?: number; startDate?: string; endDate?: string };
    job?: Job | null;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onJobAdded: () => void;
}

const DELIVERABLE_TYPES = [
    "Statics (System)",
    "Statics (AI)",
    "GIFs",
    "Caro",
    "System Video (15s)",
    "System Video (30s)",
    "System Video (45s)",
    "Shoot Reel (15s)",
    "Shoot Reel (30s)",
    "Shoot Reel (45s)",
    "AI Video (15s)",
    "AI Video (30s)",
    "AI Video (45s)",
    "YT Video (Long format)"
];

const ROLE_TO_TEAM: Record<string, string> = {
    "MOTION_DESIGNER": "Motion Designer",
    "STATIC_DESIGNER": "Static Designer",
};

export function AddJobModal({ clients, filters, job, open, onOpenChange, onJobAdded }: AddJobModalProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();

    const isOpen = open !== undefined ? open : internalOpen;
    const setIsOpen = onOpenChange !== undefined ? onOpenChange : setInternalOpen;

    const [selectedClientId, setSelectedClientId] = useState<number | undefined>(filters?.clientId || job?.clientId);
    const [selectedBrandId, setSelectedBrandId] = useState<number | undefined>(filters?.brandId || job?.brandId);
    
    const [selectedDeliverable, setSelectedDeliverable] = useState<string>(job?.deliverableType || "");
    const [selectedTeam, setSelectedTeam] = useState<string>(job?.team || "");
    const [teamMembers, setTeamMembers] = useState<{ id: number, name: string, email: string }[]>([]);
    const [selectedPerson, setSelectedPerson] = useState<string>(job?.person || "");

    const brands = clients?.find((c: any) => c.id === (selectedClientId || job?.clientId))?.brands || [];

    const isEditing = !!job;
    const isManager = ['OWNER', 'GROUP_HEAD', 'ACCOUNT_MANAGER'].includes(user?.role || '');
    const isResponsible = job?.person === user?.name;

    // Managers can always edit everything (general info and progress).
    // Tech roles can ONLY edit progress if it is their assigned task AND it's not already COMPLETED.
    const isCompleted = job?.status === 'COMPLETED';
    const canEditGeneral = isManager || (!isEditing);
    const canEditProgress = isManager || (isEditing && isResponsible && !isCompleted) || (!isEditing && !isManager);

    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        if (isOpen) {
            setSelectedClientId(job?.clientId || filters?.clientId);
            setSelectedBrandId(job?.brandId || filters?.brandId);
            setSelectedDeliverable(job?.deliverableType || "");
            setSelectedTeam(job?.team || "");
            setSelectedPerson(job?.person || "");
        } else {
            setSelectedClientId(filters?.clientId);
            setSelectedBrandId(filters?.brandId);
            setSelectedDeliverable("");
            setSelectedTeam("");
            setSelectedPerson("");
        }
    }, [isOpen, job, filters]);

    useEffect(() => {
        // Find the role for the selected team
        const role = Object.keys(ROLE_TO_TEAM).find(key => ROLE_TO_TEAM[key] === selectedTeam);
        if (selectedTeam && role) {
            userService.listByRole(role as any).then(res => {
                setTeamMembers(res);
            });
        } else {
            setTeamMembers([]);
        }
    }, [selectedTeam]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        const formData = new FormData(e.currentTarget);

        try {
            const status = (formData.get("status") as any) || "NOT_STARTED";
            const briefDate = formData.get("briefDate") as string || (job?.briefDate ? formatDate(job.briefDate) : "");
            const finishedDate = formData.get("finishedDate") as string;

            if (status === "COMPLETED" && !finishedDate) {
                toast({ title: "Validation Error", description: "Completion date is mandatory when status is COMPLETED.", variant: "destructive" });
                setIsLoading(false);
                return;
            }

            if (finishedDate && briefDate && finishedDate < briefDate) {
                toast({ title: "Validation Error", description: `Completed date (${finishedDate}) cannot be before brief date (${briefDate}).`, variant: "destructive" });
                setIsLoading(false);
                return;
            }
            
            const selectedMember = teamMembers?.find(m => m?.name === selectedPerson);

            let jobData: any = {
                status: status,
                finishedDate: finishedDate || (status === "COMPLETED" ? today : null),
                updatedAt: new Date(),
            };

            if (isManager) {
                jobData = {
                    ...jobData,
                    clientId: selectedClientId || filters?.clientId,
                    brandId: selectedBrandId || filters?.brandId,
                    jobHeading: formData.get("heading") as string,
                    jobDescription: formData.get("description") as string,
                    deliverableType: selectedDeliverable,
                    quantity: parseInt(formData.get("quantity") as string || "1"),
                    team: selectedTeam,
                    person: selectedPerson,
                    personEmail: selectedMember?.email,
                    briefDate: briefDate || (isEditing ? null : today),
                };
            } else {
                // Tech Role Self-Logging
                const heading = formData.get("heading") as string;
                const description = formData.get("description") as string;
                const clientId = selectedClientId || filters?.clientId;
                const brandId = selectedBrandId || filters?.brandId;

                if (!isEditing && (!clientId || !brandId || !heading || !description || !finishedDate)) {
                    toast({ title: "Validation Error", description: "Client, Brand, Heading, Description, and Completed Date are mandatory.", variant: "destructive" });
                    setIsLoading(false);
                    return;
                }

                jobData = {
                    ...jobData,
                    clientId,
                    brandId,
                    jobHeading: heading,
                    jobDescription: description,
                    status: "COMPLETED", // Tech roles log completed work
                    briefDate: finishedDate, // Set brief date to finished date for self-logged tasks
                };
            }

            if (isEditing && job) {
                let payload: any;
                if (isManager) {
                    payload = jobData;
                } else {
                    // Tech Role Update: ONLY send allowed fields to avoid "Restricted" error
                    const allowedEditFields = ['status', 'finishedDate'];
                    payload = {};
                    allowedEditFields.forEach(f => {
                        if (jobData[f] !== undefined) payload[f] = jobData[f];
                    });
                }
                payload.version = job.version;
                await jobService.updateJob(job.id, payload);
                toast({ title: "Success", description: "Job updated successfully" });
            } else {
                if (!jobData.clientId || !jobData.brandId) {
                    toast({ title: "Error", description: "Please select Client and Brand", variant: "destructive" });
                    setIsLoading(false);
                    return;
                }
                await jobService.createJob(jobData);
                toast({ title: "Success", description: "Job saved successfully" });
            }
            onJobAdded();
            setIsOpen(false);
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to save job", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {!isEditing && isManager && (
                <DialogTrigger asChild>
                    <Button className="gap-2 bg-primary text-white hover:bg-primary/90">
                        <Plus className="h-4 w-4" />
                        Add Deliverable
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[650px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Deliverable Details" : "Add New Deliverable"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} noValidate className="space-y-4 py-4">
                    {isEditing && !isManager && (
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 mb-4 flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Project</span>
                            <Badge variant="outline" className="bg-white text-slate-700 border-slate-300 px-3">
                                {(job as any).brandName || "Assigned Brand"}
                            </Badge>
                        </div>
                    )}

                    {!isEditing && (
                        <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200 mb-4">
                            <p className="text-sm font-medium text-slate-700 mb-2">Select Project Location</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-1.5">
                                    <Label className="text-xs">Client</Label>
                                    <Select 
                                        value={selectedClientId?.toString()}
                                        onValueChange={(val) => {
                                            const clientId = parseInt(val);
                                            setSelectedClientId(clientId);
                                            const client = clients?.find((c: any) => c.id === clientId);
                                            const firstBrand = client?.brands?.[0];
                                            setSelectedBrandId(firstBrand?.id);
                                        }}
                                    >
                                        <SelectTrigger className="h-9 text-xs">
                                            <SelectValue placeholder="Client" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {clients?.map((c: any) => <SelectItem key={c?.id} value={c?.id?.toString()}>{c?.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-1.5">
                                    <Label className="text-xs">Brand</Label>
                                    <Select
                                        disabled={!selectedClientId && !filters?.clientId}
                                        value={selectedBrandId?.toString()}
                                        onValueChange={(val) => setSelectedBrandId(parseInt(val))}
                                    >
                                        <SelectTrigger className="h-9 text-xs">
                                            <SelectValue placeholder="Brand" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {brands?.map((b: any) => <SelectItem key={b?.id} value={b?.id?.toString()}>{b?.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="deliverableType">Deliverable Type *</Label>
                            <Select name="deliverableType" value={selectedDeliverable} onValueChange={setSelectedDeliverable} disabled={!canEditGeneral}>
                                <SelectTrigger className={!canEditGeneral ? "bg-slate-50" : ""}>
                                    <SelectValue placeholder="Select Deliverable" />
                                </SelectTrigger>
                                <SelectContent>
                                    {DELIVERABLE_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="quantity">Quantity *</Label>
                            <Input id="quantity" name="quantity" type="number" min="1" defaultValue={job?.quantity || "1"} required readOnly={!canEditGeneral} className={!canEditGeneral ? "bg-slate-50" : ""} />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="heading">Deliverable Title *</Label>
                        <Input id="heading" name="heading" placeholder="e.g. Instagram Post - Brand X" defaultValue={job?.jobHeading} required readOnly={!canEditGeneral} className={!canEditGeneral ? "bg-slate-50" : ""} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="description">Description (Link, instructions, etc.)</Label>
                        <Input id="description" name="description" placeholder="Brief details about the job" defaultValue={job?.jobDescription || ""} readOnly={!canEditGeneral} className={!canEditGeneral ? "bg-slate-50" : ""} />
                    </div>

                    {isManager && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="team">Assign Team</Label>
                                    <Select name="team" defaultValue={job?.team || ""} onValueChange={setSelectedTeam} disabled={!canEditGeneral}>
                                        <SelectTrigger className={!canEditGeneral ? "bg-slate-50" : ""}>
                                            <SelectValue placeholder="Select Team" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.values(ROLE_TO_TEAM).map(team => <SelectItem key={team} value={team}>{team}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="person">Person Responsible</Label>
                                    <Select name="person" value={selectedPerson} onValueChange={setSelectedPerson} disabled={!canEditGeneral}>
                                        <SelectTrigger className={!canEditGeneral ? "bg-slate-50" : ""}>
                                            <SelectValue placeholder={selectedTeam ? "Select Person" : "Select team first"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {teamMembers.map(m => (
                                                <SelectItem key={m?.id} value={m?.name || ''}>{m?.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="briefDate">Brief Date</Label>
                                    <Input id="briefDate" name="briefDate" type="date" defaultValue={job?.briefDate ? formatDate(job.briefDate) : (isEditing ? "" : today)} readOnly={!canEditGeneral} className={!canEditGeneral ? "bg-slate-50" : ""} />
                                </div>
                            </div>
                        </>
                    )}
                    
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/10 space-y-4">
                        <p className="text-xs font-bold text-primary uppercase tracking-widest">Status & Completion</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="status">Status</Label>
                                <Select name="status" defaultValue={job?.status || (!isManager && !isEditing ? "COMPLETED" : "NOT_STARTED")} disabled={!canEditProgress}>
                                    <SelectTrigger className={!canEditProgress ? "bg-slate-50" : ""}>
                                        <SelectValue placeholder="Select Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                                        <SelectItem value="WIP">In Progress</SelectItem>
                                        <SelectItem value="COMPLETED">Completed</SelectItem>
                                        <SelectItem value="REWORKED">Reworked</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="finishedDate">Completed Date</Label>
                                <Input 
                                    id="finishedDate" 
                                    name="finishedDate" 
                                    type="date" 
                                    defaultValue={job?.finishedDate ? formatDate(job.finishedDate) : ""} 
                                    readOnly={!canEditProgress}
                                    className={!canEditProgress ? "bg-slate-50" : ""}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isLoading || (isEditing && !canEditGeneral && !canEditProgress)}>
                            {isLoading ? "Saving..." : (isEditing ? "Update Progress" : "Assign Task")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
