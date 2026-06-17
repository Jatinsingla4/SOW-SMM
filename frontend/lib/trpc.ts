import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../backend/src/routers/_app';

export const trpc = createTRPCProxyClient<AppRouter>({
    links: [
        httpBatchLink({
            url: process.env.NEXT_PUBLIC_TRPC_URL || 'http://localhost:8787/trpc',
            headers() {
                // Add auth headers if token exists
                const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
                return token ? { Authorization: `Bearer ${token}` } : {};
            },
        }),
    ],
});
