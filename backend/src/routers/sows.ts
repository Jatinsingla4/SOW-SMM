import { router, publicProcedure, protectedProcedure } from "../trpc";
import { z } from "zod";
import { drizzle } from "drizzle-orm/d1";
import { sows, jobs, userBrands } from "../db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const sowRouter = router({
    list: protectedProcedure
        .input(z.object({
            clientId: z.number().optional(),
            brandId: z.number().optional(),
            month: z.string().optional(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            const db = drizzle(ctx.env.DB);
            let filters = [];

            // Hierarchy Filtering
            if (!['OWNER', 'GROUP_HEAD', 'ACCOUNT_MANAGER'].includes(ctx.user.role || '')) {
                const assignedBrands = await db
                    .select({ id: userBrands.brandId })
                    .from(userBrands)
                    .where(eq(userBrands.userId, ctx.user.id))
                    .all();
                
                const brandIds = assignedBrands.map(b => b.id);
                if (brandIds.length === 0) {
                    return { success: true, data: [] };
                }
                filters.push(inArray(sows.brandId, brandIds));
            }

            if (input.clientId) filters.push(eq(sows.clientId, input.clientId));
            if (input.brandId) filters.push(eq(sows.brandId, input.brandId));
            if (input.month) filters.push(eq(sows.month, input.month));
            
            const results = await db
                .select()
                .from(sows)
                .where(and(...filters))
                .all();
            
            // Add mock metrics if they don't exist
            const resultsWithMetrics = results.map(sow => ({
                ...sow,
                metrics: {
                    totalSowHours: sow.totalSowHours,
                    utilisedHours: 0,
                    variance: 0,
                    hoursLeft: sow.totalSowHours,
                    totalJobs: 0,
                    completedJobs: 0,
                    pendingJobs: 0,
                }
            }));

            return { success: true, data: resultsWithMetrics };
        }),

    getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ ctx, input }) => {
            const db = drizzle(ctx.env.DB);
            const res = await db.select().from(sows).where(eq(sows.id, input.id)).get();
            return { success: true, data: res };
        }),

    create: protectedProcedure
        .input(z.object({
            clientId: z.number(),
            brandId: z.number(),
            month: z.string(),
            startDate: z.string(),
            endDate: z.string(),
            totalSowHours: z.number(),
        }))
        .mutation(async ({ ctx, input }) => {
            if (!['OWNER', 'GROUP_HEAD', 'ACCOUNT_MANAGER'].includes(ctx.user.role || '')) {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to create SOWs' });
            }
            const db = drizzle(ctx.env.DB);
            const res = await db.insert(sows).values({
                clientId: input.clientId,
                brandId: input.brandId,
                month: input.month,
                startDate: new Date(input.startDate),
                endDate: new Date(input.endDate),
                totalSowHours: input.totalSowHours,
            }).returning().get();
            return { success: true, data: res };
        }),
});
