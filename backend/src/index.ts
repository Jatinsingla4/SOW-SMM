import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from './routers/_app';
import { createContext } from './trpc';

export interface Env {
    APP_ENV: string
    DB: D1Database
    AMC_FILES: R2Bucket
    CHAT_DO: DurableObjectNamespace
    JWT_SECRET: string;
    GOOGLE_CLIENT_ID: string;
    RUNPOD_API_KEY: string;
    RUNPOD_ENDPOINT_ID: string;
}

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url);

        // CORS Headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-trpc-source',
        };

        // Handle OPTIONS
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders });
        }

        // 1. Health check
        if (url.pathname === "/health") {
            return Response.json({
                status: "ok",
                env: env.APP_ENV
            })
        }

        // 2. Handle WebSockets for Durable Objects
        if (request.headers.get('Upgrade') === 'websocket') {
            const id = env.CHAT_DO.idFromName('global');
            const obj = env.CHAT_DO.get(id);
            return obj.fetch(request);
        }

        // 3. Handle tRPC requests
        if (url.pathname.startsWith('/trpc')) {
            const response = await fetchRequestHandler({
                endpoint: '/trpc',
                req: request,
                router: appRouter,
                createContext: () => createContext(request, env),
            });

            // Add CORS to the tRPC response
            Object.entries(corsHeaders).forEach(([key, value]) => {
                response.headers.set(key, value);
            });

            return response;
        }

        // 4. Fallback
        return new Response("AMC Tracker Worker Running 🚀")
    },
};

// Export Durable Object class as required by Cloudflare
export { ChatDO } from './objects/ChatDO';