import SOWReports from "../../components/sow/SOWReports";

export const metadata = {
    title: 'SOW Reports',
};

export default function ReportsPage() {
    return (
        <main className="flex-1 container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 animate-fade-in bg-slate-50 min-h-screen">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Month-by-Month Reports</h1>
                <p className="text-muted-foreground text-slate-500 max-w-2xl">Track SOW hour utilization across the entire lifespan of a project's contract. Select a client and project below.</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <SOWReports />
            </div>
        </main>
    );
}
