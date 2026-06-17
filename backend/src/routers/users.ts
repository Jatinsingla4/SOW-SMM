import { router, publicProcedure, protectedProcedure } from "../trpc";
import { z } from "zod";
import { drizzle } from "drizzle-orm/d1";
import { users, userBrands, brands } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const userRouter = router({

    // Get current logged-in user
    getMe: protectedProcedure.query(async ({ ctx }) => {
        const db = drizzle(ctx.env.DB);
        const email = ctx.user.email;

        const user = await db
            .select({
                id: users.id,
                email: users.email,
                name: users.name,
                picture: users.picture,
                role: users.role,
                status: users.status,
                clientId: users.clientId,
                createdAt: users.createdAt,
            })
            .from(users)
            .where(eq(users.email, email))
            .get();

        if (!user) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "User not found",
            });
        }

        return user;
    }),

    // List pending users for approval (Owner/PM only)
    listPending: protectedProcedure.query(async ({ ctx }) => {
        if (!['OWNER', 'GROUP_HEAD', 'ACCOUNT_MANAGER'].includes(ctx.user.role || '')) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
        }
        const db = drizzle(ctx.env.DB);
        return await db
            .select({
                id: users.id,
                email: users.email,
                name: users.name,
                picture: users.picture,
                role: users.role,
                status: users.status,
                clientId: users.clientId,
                createdAt: users.createdAt,
            })
            .from(users)
            .where(eq(users.status, 'PENDING'))
            .all();
    }),

    approveUser: protectedProcedure
        .input(z.object({ 
            userId: z.number().int(), 
            role: z.enum(['OWNER', 'GROUP_HEAD', 'ACCOUNT_MANAGER', 'SOCIAL_MEDIA_EXECUTIVE', 'MOTION_DESIGNER', 'STATIC_DESIGNER', 'CLIENT']),
            clientId: z.number().int().nullish()
        }))
        .mutation(async ({ ctx, input }) => {
            if (!['OWNER', 'GROUP_HEAD', 'ACCOUNT_MANAGER'].includes(ctx.user.role || '')) {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
            }
            const db = drizzle(ctx.env.DB);
            await db
                .update(users)
                .set({ status: 'APPROVED', role: input.role, clientId: input.clientId })
                .where(eq(users.id, input.userId))
                .run();
            return { success: true };
        }),

    // Update user profile
    updateProfile: protectedProcedure
        .input(
            z.object({
                name: z.string().min(2),
                picture: z.string().url().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const db = drizzle(ctx.env.DB);
            const email = ctx.user.email;

            await db
                .update(users)
                .set({
                    name: input.name,
                    picture: input.picture,
                })
                .where(eq(users.email, email))
                .run();

            return {
                success: true,
            };
        }),

    // List all approved users
    list: protectedProcedure.query(async ({ ctx }) => {
        const db = drizzle(ctx.env.DB);
        return await db
            .select({
                id: users.id,
                email: users.email,
                name: users.name,
                picture: users.picture,
                role: users.role,
                status: users.status,
                clientId: users.clientId,
                createdAt: users.createdAt,
            })
            .from(users)
            .where(eq(users.status, 'APPROVED'))
            .orderBy(users.createdAt)
            .all();
    }),

    // Update user role
    updateRole: protectedProcedure
        .input(
            z.object({
                userId: z.number().int(),
                role: z.enum(['OWNER', 'GROUP_HEAD', 'ACCOUNT_MANAGER', 'SOCIAL_MEDIA_EXECUTIVE', 'MOTION_DESIGNER', 'STATIC_DESIGNER', 'CLIENT']),
                clientId: z.number().int().nullish()
            })
        )
        .mutation(async ({ ctx, input }) => {
            if (!['OWNER', 'GROUP_HEAD', 'ACCOUNT_MANAGER'].includes(ctx.user.role || '')) {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
            }
            const db = drizzle(ctx.env.DB);

            // Fetch the user to check their current role
            const targetUser = await db
                .select()
                .from(users)
                .where(eq(users.id, input.userId))
                .get();

            if (targetUser?.role === 'OWNER') {
                throw new TRPCError({ 
                    code: 'FORBIDDEN', 
                    message: 'Owner role cannot be changed' 
                });
            }

            await db
                .update(users)
                .set({ role: input.role, clientId: input.clientId })
                .where(eq(users.id, input.userId))
                .run();
            return { success: true };
        }),

    // Assign brand to user
    assignBrand: protectedProcedure
        .input(
            z.object({
                userId: z.number().int(),
                brandId: z.number().int(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            if (!['OWNER', 'GROUP_HEAD', 'ACCOUNT_MANAGER'].includes(ctx.user.role || '')) {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
            }
            const db = drizzle(ctx.env.DB);
            await db
                .insert(userBrands)
                .values({
                    userId: input.userId,
                    brandId: input.brandId,
                })
                .onConflictDoNothing()
                .run();
            return { success: true };
        }),

    // Remove brand from user
    removeBrand: protectedProcedure
        .input(
            z.object({
                userId: z.number().int(),
                brandId: z.number().int(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            if (!['OWNER', 'GROUP_HEAD', 'ACCOUNT_MANAGER'].includes(ctx.user.role || '')) {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
            }
            const db = drizzle(ctx.env.DB);
            await db
                .delete(userBrands)
                .where(
                    and(
                        eq(userBrands.userId, input.userId),
                        eq(userBrands.brandId, input.brandId)
                    )
                )
                .run();
            return { success: true };
        }),

    // List approved users by role
    listByRole: protectedProcedure
        .input(z.object({ 
            role: z.enum(['OWNER', 'GROUP_HEAD', 'ACCOUNT_MANAGER', 'SOCIAL_MEDIA_EXECUTIVE', 'MOTION_DESIGNER', 'STATIC_DESIGNER', 'CLIENT']) 
        }))
        .query(async ({ ctx, input }) => {
            const db = drizzle(ctx.env.DB);
            return await db
                .select({
                    id: users.id,
                    name: users.name,
                    email: users.email
                })
                .from(users)
                .where(and(
                    eq(users.role, input.role),
                    eq(users.status, 'APPROVED')
                ))
                .all();
        }),

    // Get brands for a user
    getUserBrands: protectedProcedure
        .input(z.object({ userId: z.number().int() }))
        .query(async ({ ctx, input }) => {
            const db = drizzle(ctx.env.DB);
            return await db
                .select({
                    id: brands.id,
                    name: brands.name,
                })
                .from(userBrands)
                .innerJoin(brands, eq(userBrands.brandId, brands.id))
                .where(eq(userBrands.userId, input.userId))
                .all();
        }),

    // Delete user (Owner only)
    delete: protectedProcedure
        .input(z.object({ userId: z.number().int() }))
        .mutation(async ({ ctx, input }) => {
            if (ctx.user.role !== 'OWNER') {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'Only Owners can delete members' });
            }

            // Prevent self-deletion
            if (ctx.user.id === input.userId) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'You cannot delete your own account' });
            }

            const db = drizzle(ctx.env.DB);

            // 1. Delete user brand assignments
            await db.delete(userBrands).where(eq(userBrands.userId, input.userId)).run();

            // 2. Delete the user
            await db.delete(users).where(eq(users.id, input.userId)).run();

            return { success: true };
        }),
});