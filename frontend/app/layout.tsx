import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Providers } from './providers';
import Navbar from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'SOW Dashboard',
    description: 'Production-ready SOW Management Dashboard',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="h-full antialiased">
            <body className={`${inter.className} min-h-screen bg-slate-50 text-slate-900 flex flex-col`}>
                <Providers>
                    <div className="flex-1 flex flex-col">
                        <Navbar />
                        {children}
                    </div>
                    <Toaster />
                </Providers>
            </body>
        </html>
    );
}
