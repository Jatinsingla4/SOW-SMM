import { SOWDashboard } from "../../components/sow/SOWDashboard";

export const metadata = {
    title: 'SOW Management',
};

export default function SOWPage() {
    return (
        <main className="flex-1 container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 animate-fade-in">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">SOW Management</h1>
                <p className="text-muted-foreground">Manage and track Statement of Work hours and project allocations.</p>
            </div>

            <SOWDashboard />
        </main>
    );
}
