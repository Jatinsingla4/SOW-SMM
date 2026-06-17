import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import { drizzle } from "drizzle-orm/d1";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { hashPassword, verifyPassword } from "../utils/auth";
import jwt from '@tsndr/cloudflare-worker-jwt';

export const authRouter = router({
    register: publicProcedure
        .input(z.object({
            email: z.string().email(),
            password: z.string().min(6),
            name: z.string(),
            role: z.enum(['OWNER', 'GROUP_HEAD', 'ACCOUNT_MANAGER', 'SOCIAL_MEDIA_EXECUTIVE', 'MOTION_DESIGNER', 'STATIC_DESIGNER', 'CLIENT']),
            clientId: z.number().int().nullish()
        }))
        .mutation(async ({ ctx, input }) => {
            const db = drizzle(ctx.env.DB);
            
            // Check if user exists
            const existingUser = await db.select().from(users).where(eq(users.email, input.email)).get();
            if (existingUser) {
                throw new TRPCError({ code: 'CONFLICT', message: 'User already exists' });
            }

            const hashedPassword = await hashPassword(input.password);
            
            await db.insert(users).values({
                email: input.email,
                password: hashedPassword,
                name: input.name,
                role: input.role,
                clientId: input.clientId,
                status: 'PENDING' // Needs approval
            }).run();

            return { success: true, message: 'Registration successful, pending approval' };
        }),

    login: publicProcedure
        .input(z.object({
            email: z.string().email(),
            password: z.string()
        }))
        .mutation(async ({ ctx, input }) => {
            const db = drizzle(ctx.env.DB);
            const user = await db.select().from(users).where(eq(users.email, input.email)).get();

            if (!user || !user.password) {
                throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });
            }

            if (user.status !== 'APPROVED') {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'Account pending approval' });
            }

            const isValid = await verifyPassword(input.password, user.password);
            if (!isValid) {
                throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });
            }

            const token = await jwt.sign({
                id: user.id,
                email: user.email,
                role: user.role,
                name: user.name,
                clientId: user.clientId,
                exp: Math.floor(Date.now() / 1000) + (24 * (60 * 60)) // 24 hours
            }, ctx.env.JWT_SECRET);

            return { token, user: { id: user.id, email: user.email, role: user.role, name: user.name, clientId: user.clientId } };
        }),

    seedOwner: publicProcedure
        .mutation(async ({ ctx }) => {
            const db = drizzle(ctx.env.DB);
            
            // Check if specifically the owner user exists
            const existingOwner = await db.select()
                .from(users)
                .where(eq(users.email, 'owner@amctracker.com'))
                .get();
            
            if (existingOwner) {
                // If it exists, make sure it's approved and has the right role
                await db.update(users)
                    .set({ status: 'APPROVED', role: 'OWNER' })
                    .where(eq(users.email, 'owner@amctracker.com'))
                    .run();
                return { success: true, message: 'Owner already existed, ensured status is APPROVED' };
            }

            const hashedPassword = await hashPassword('ownerpassword123');
            await db.insert(users).values({
                email: 'owner@amctracker.com',
                password: hashedPassword,
                name: 'System Owner',
                role: 'OWNER',
                status: 'APPROVED'
            }).run();

            return { success: true, message: 'Owner created: owner@amctracker.com / ownerpassword123' };
        })
});
