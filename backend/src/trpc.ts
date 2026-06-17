import { initTRPC, TRPCError } from '@trpc/server';
import jwt from '@tsndr/cloudflare-worker-jwt';
import { drizzle } from 'drizzle-orm/d1';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';

// Define the environment type
export interface Env {
    DB: D1Database;
    JWT_SECRET: string;
    GOOGLE_CLIENT_ID: string;
    AMC_FILES: R2Bucket;
    RUNPOD_API_KEY: string;
    RUNPOD_ENDPOINT_ID: string;
    CHAT_DO: DurableObjectNamespace;
}

// Context for tRPC
export interface UserPayload {
    id: number;
    email: string;
    role: 'OWNER' | 'GROUP_HEAD' | 'ACCOUNT_MANAGER' | 'SOCIAL_MEDIA_EXECUTIVE' | 'MOTION_DESIGNER' | 'STATIC_DESIGNER' | 'CLIENT';
    name?: string;
    clientId?: number | null;
}

export interface Context {
    req: Request;
    env: Env;
    user?: UserPayload;
}

export const createContext = async (req: Request, env: Env): Promise<Context> => {
    return { req, env };
};

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

// Auth middleware
export const isAuthorized = middleware(async ({ ctx, next }) => {
    const authHeader = ctx.req.headers.get('Authorization');
    
    // For local development, we might still want a way to bypass OR we just use a test token
    if (!authHeader?.startsWith('Bearer ')) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const isValid = await jwt.verify(token, ctx.env.JWT_SECRET);

    if (!isValid) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid or expired token' });
    }

    const { payload } = jwt.decode(token) as { payload: UserPayload };
    
    if (!payload || !payload.id) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid token payload' });
    }

    const db = drizzle(ctx.env.DB);
    const dbUser = await db.select().from(users).where(eq(users.id, payload.id)).get();

    if (!dbUser || dbUser.status !== 'APPROVED') {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found or account deactivated' });
    }

    return next({
        ctx: { 
            ...ctx, 
            user: {
                id: dbUser.id,
                email: dbUser.email,
                role: dbUser.role as any,
                name: dbUser.name,
                clientId: dbUser.clientId
            }
        },
    });
});

export const protectedProcedure = t.procedure.use(isAuthorized);
