import { router, publicProcedure, protectedProcedure } from "../trpc";
import { z } from "zod";
import { drizzle } from "drizzle-orm/d1";
import { clients, brands, sows, jobs, users, userBrands } from "../db/schema";
import { eq, and, gte, lte, sql, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const clientRouter = router({
    listPublic: publicProcedure.query(async ({ ctx }) => {
        const db = drizzle(ctx.env.DB);
        return await db.select({
            id: clients.id,
            name: clients.name
        }).from(clients).all();
    }),

    list: protectedProcedure.query(async ({ ctx }) => {
        const db = drizzle(ctx.env.DB);
        
        const isManager = ['OWNER', 'GROUP_HEAD', 'ACCOUNT_MANAGER'].includes(ctx.user.role || '');
        const isClient = ctx.user.role === 'CLIENT';
        let allowedBrandIds: number[] | null = null;

        if (!isManager && !isClient) {
            const assigned = await db.select({ id: userBrands.brandId }).from(userBrands).where(eq(userBrands.userId, ctx.user.id)).all();
            allowedBrandIds = assigned.map(a => a.id);
        }

        let clientQuery = db.select().from(clients);
        let allClients = await clientQuery.all();
        
        // Optimize: Fetch all relevant brands in one go rather than N+1 map loops
        let allBrands = await db.select().from(brands).all();

        const clientsWithBrands = allClients.map((client) => {
            let clientBrands = allBrands.filter(b => b.clientId === client.id);

            // CLIENT role: only see their assigned client and ALL its brands
            if (isClient) {
                if (client.id !== ctx.user.clientId) return { ...client, brands: [] };
                return { ...client, brands: clientBrands };
            }

            // Tech roles: filter by assigned brands
            if (!isManager && allowedBrandIds) {
                if (allowedBrandIds.length === 0) return { ...client, brands: [] };
                clientBrands = clientBrands.filter(b => allowedBrandIds.includes(b.id));
                return { ...client, brands: clientBrands };
            }

            return { ...client, brands: clientBrands };
        });

        // Filter out clients that have no permitted brands (for tech roles AND clients missing access)
        const finalData = isManager ? clientsWithBrands : clientsWithBrands.filter(c => c.brands.length > 0);
        
        return { success: true, data: finalData };
    }),

    getBrands: protectedProcedure
        .input(z.object({ clientId: z.number() }))
        .query(async ({ ctx, input }) => {
            const db = drizzle(ctx.env.DB);
            
                const isManager = ['OWNER', 'GROUP_HEAD', 'ACCOUNT_MANAGER'].includes(ctx.user.role || '');
            const isClient = ctx.user.role === 'CLIENT';
            let filters = [eq(brands.clientId, input.clientId)];

            if (isClient) {
                if (input.clientId !== ctx.user.clientId) return { success: true, data: [] };
                // No additional filters, CLIENT gets all brands of their client
            } else if (!isManager) {
                const assigned = await db.select({ id: userBrands.brandId }).from(userBrands).where(eq(userBrands.userId, ctx.user.id)).all();
                const allowedBrandIds = assigned.map(a => a.id);
                if (allowedBrandIds.length === 0) return { success: true, data: [] };
                filters.push(inArray(brands.id, allowedBrandIds));
            }

            const res = await db
                .select()
                .from(brands)
                .where(and(...filters))
                .all();
            return { success: true, data: res };
        }),

    create: protectedProcedure
        .input(z.object({
            name: z.string().min(1).regex(/^[a-zA-Z0-9\s.\-_&'!,()]+$/, "Contains invalid characters"),
            brandName: z.string().min(1).regex(/^[a-zA-Z0-9\s.\-_&'!,()]+$/, "Contains invalid characters"),
            totalSowHours: z.number().min(0),
            contractStartDate: z.string().min(1),
            contractEndDate: z.string().min(1),
            caroCount: z.number().optional().default(0),
            staticSystemCount: z.number().optional().default(0),
            staticAiCount: z.number().optional().default(0),
            gifCount: z.number().optional().default(0),
            systemVideo15sCount: z.number().optional().default(0),
            systemVideo30sCount: z.number().optional().default(0),
            systemVideo45sCount: z.number().optional().default(0),
            shootReel15sCount: z.number().optional().default(0),
            shootReel30sCount: z.number().optional().default(0),
            shootReel45sCount: z.number().optional().default(0),
            aiVideo15sCount: z.number().optional().default(0),
            aiVideo30sCount: z.number().optional().default(0),
            aiVideo45sCount: z.number().optional().default(0),
            ytVideoCount: z.number().optional().default(0),
        }))
        .mutation(async ({ ctx, input }) => {
            const db = drizzle(ctx.env.DB);
            
            // Only Owner, Group Head, or AM can create clients/brands
            if (!['OWNER', 'GROUP_HEAD', 'ACCOUNT_MANAGER'].includes(ctx.user.role || '')) {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'Only Owners, Group Heads, and Account Managers can create new clients' });
            }

            // 0. Validate dates
            const startDate = new Date(input.contractStartDate);
            const endDate = new Date(input.contractEndDate);
            
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: "Invalid date format provided for contract duration",
                });
            }

            if (endDate < startDate) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: "Contract end date cannot be before start date",
                });
            }

            // 1. Get or Create client (Case-Insensitive)
            let clientRes = await db
                .select()
                .from(clients)
                .where(sql`LOWER(${clients.name}) = LOWER(${input.name})`)
                .get();
            
            if (!clientRes) {
                clientRes = await db.insert(clients).values({
                    name: input.name,
                }).returning().get();
            }

            // 2. Check if brand already exists for this client (Case-Insensitive)
            const existingBrand = await db
                .select()
                .from(brands)
                .where(and(
                    eq(brands.clientId, clientRes.id), 
                    sql`LOWER(${brands.name}) = LOWER(${input.brandName})`
                ))
                .get();

            if (existingBrand) {
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: `Brand "${input.brandName}" already exists for client "${input.name}" (Case-insensitive check). Please choose a different brand name.`,
                });
            }

            try {
                const brandRes = await db.insert(brands).values({
                    clientId: clientRes.id,
                    name: input.brandName,
                    monthlySowHours: input.totalSowHours,
                    contractStartDate: startDate,
                    contractEndDate: endDate,
                    caroCount: input.caroCount,
                    staticSystemCount: input.staticSystemCount,
                    staticAiCount: input.staticAiCount,
                    gifCount: input.gifCount,
                    systemVideo15sCount: input.systemVideo15sCount,
                    systemVideo30sCount: input.systemVideo30sCount,
                    systemVideo45sCount: input.systemVideo45sCount,
                    shootReel15sCount: input.shootReel15sCount,
                    shootReel30sCount: input.shootReel30sCount,
                    shootReel45sCount: input.shootReel45sCount,
                    aiVideo15sCount: input.aiVideo15sCount,
                    aiVideo30sCount: input.aiVideo30sCount,
                    aiVideo45sCount: input.aiVideo45sCount,
                    ytVideoCount: input.ytVideoCount,
                }).returning().get();

                if (!brandRes) {
                    throw new Error("Failed to retrieve created brand record");
                }

                return { success: true, data: { ...clientRes, brands: [brandRes] } };
            } catch (err: any) {
                console.error("Error creating brand:", err);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Database error while creating brand: ${err.message}`,
                });
            }
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
            const db = drizzle(ctx.env.DB);
            if (ctx.user.role !== 'OWNER') {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'Only owners can delete clients' });
            }
            await db.delete(clients).where(eq(clients.id, input.id)).run();
            return { success: true };
        }),
        
    getSummary: protectedProcedure
        .input(z.object({
            startDate: z.string().optional(),
            endDate: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            const db = drizzle(ctx.env.DB);
            
            const isManager = ['OWNER', 'GROUP_HEAD', 'ACCOUNT_MANAGER'].includes(ctx.user.role || '');
            const isClient = ctx.user.role === 'CLIENT';

            let allBrands;
            if (isManager) {
                allBrands = await db
                    .select({
                        clientId: clients.id,
                        clientName: clients.name,
                        brandId: brands.id,
                        brandName: brands.name,
                        contractStartDate: brands.contractStartDate,
                        contractEndDate: brands.contractEndDate,
                        monthlySowHours: brands.monthlySowHours,
                        caroCount: brands.caroCount,
                        staticSystemCount: brands.staticSystemCount,
                        staticAiCount: brands.staticAiCount,
                        gifCount: brands.gifCount,
                        systemVideo15sCount: brands.systemVideo15sCount,
                        systemVideo30sCount: brands.systemVideo30sCount,
                        systemVideo45sCount: brands.systemVideo45sCount,
                        shootReel15sCount: brands.shootReel15sCount,
                        shootReel30sCount: brands.shootReel30sCount,
                        shootReel45sCount: brands.shootReel45sCount,
                        aiVideo15sCount: brands.aiVideo15sCount,
                        aiVideo30sCount: brands.aiVideo30sCount,
                        aiVideo45sCount: brands.aiVideo45sCount,
                        ytVideoCount: brands.ytVideoCount,
                    })
                    .from(clients)
                    .innerJoin(brands, eq(clients.id, brands.clientId))
                    .all();
            } else if (isClient) {
                if (!ctx.user.clientId) return { success: true, data: [] };
                allBrands = await db
                    .select({
                        clientId: clients.id,
                        clientName: clients.name,
                        brandId: brands.id,
                        brandName: brands.name,
                        contractStartDate: brands.contractStartDate,
                        contractEndDate: brands.contractEndDate,
                        monthlySowHours: brands.monthlySowHours,
                        caroCount: brands.caroCount,
                        staticSystemCount: brands.staticSystemCount,
                        staticAiCount: brands.staticAiCount,
                        gifCount: brands.gifCount,
                        systemVideo15sCount: brands.systemVideo15sCount,
                        systemVideo30sCount: brands.systemVideo30sCount,
                        systemVideo45sCount: brands.systemVideo45sCount,
                        shootReel15sCount: brands.shootReel15sCount,
                        shootReel30sCount: brands.shootReel30sCount,
                        shootReel45sCount: brands.shootReel45sCount,
                        aiVideo15sCount: brands.aiVideo15sCount,
                        aiVideo30sCount: brands.aiVideo30sCount,
                        aiVideo45sCount: brands.aiVideo45sCount,
                        ytVideoCount: brands.ytVideoCount,
                    })
                    .from(clients)
                    .innerJoin(brands, eq(clients.id, brands.clientId))
                    .where(eq(clients.id, ctx.user.clientId))
                    .all();
            } else {
                const assigned = await db.select({ id: userBrands.brandId }).from(userBrands).where(eq(userBrands.userId, ctx.user.id)).all();
                const allowedIds = assigned.map(a => a.id);
                if (allowedIds.length === 0) return { success: true, data: [] };
                
                allBrands = await db
                    .select({
                        clientId: clients.id,
                        clientName: clients.name,
                        brandId: brands.id,
                        brandName: brands.name,
                        contractStartDate: brands.contractStartDate,
                        contractEndDate: brands.contractEndDate,
                        monthlySowHours: brands.monthlySowHours,
                        caroCount: brands.caroCount,
                        staticSystemCount: brands.staticSystemCount,
                        staticAiCount: brands.staticAiCount,
                        gifCount: brands.gifCount,
                        systemVideo15sCount: brands.systemVideo15sCount,
                        systemVideo30sCount: brands.systemVideo30sCount,
                        systemVideo45sCount: brands.systemVideo45sCount,
                        shootReel15sCount: brands.shootReel15sCount,
                        shootReel30sCount: brands.shootReel30sCount,
                        shootReel45sCount: brands.shootReel45sCount,
                        aiVideo15sCount: brands.aiVideo15sCount,
                        aiVideo30sCount: brands.aiVideo30sCount,
                        aiVideo45sCount: brands.aiVideo45sCount,
                        ytVideoCount: brands.ytVideoCount,
                    })
                    .from(clients)
                    .innerJoin(brands, eq(clients.id, brands.clientId))
                    .where(inArray(brands.id, allowedIds))
                    .all();
            }

            const queryStart = input.startDate ? new Date(input.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            const queryEnd = input.endDate ? new Date(input.endDate) : new Date();

            // 1. Fetch ALL job aggregations for our brands within the relevant global timeframe in 1 QUERY
            const brandIds = allBrands.map(b => b.brandId);
            let jobAggregations: Record<number, number> = {};

            if (brandIds.length > 0) {
                const globalAggs = await db.select({
                    brandId: sows.brandId,
                    totalAllocated: sql<number>`SUM(${jobs.allocatedHours})`
                })
                .from(jobs)
                .innerJoin(sows, eq(jobs.sowId, sows.id))
                .where(and(
                    inArray(sows.brandId, brandIds),
                    // For the global bounds, we pull everything overlapping our max query window 
                    lte(sows.startDate, queryEnd),
                    gte(sows.endDate, queryStart)
                ))
                .groupBy(sows.brandId)
                .all();

                globalAggs.forEach(row => {
                    jobAggregations[row.brandId] = row.totalAllocated || 0;
                });
            }

            const summaryData = allBrands.map((brand) => {
                const contractStart = brand.contractStartDate ? new Date(brand.contractStartDate) : null;
                const contractEnd = brand.contractEndDate ? new Date(brand.contractEndDate) : null;

                // Intersection of Query Range and Contract Range
                const intersectStart = contractStart && contractStart > queryStart ? contractStart : queryStart;
                const intersectEnd = contractEnd && contractEnd < queryEnd ? contractEnd : queryEnd;

                let numMonths = 0;
                if (intersectStart <= intersectEnd) {
                    const startYear = intersectStart.getFullYear();
                    const startMonth = intersectStart.getMonth();
                    const endYear = intersectEnd.getFullYear();
                    const endMonth = intersectEnd.getMonth();
                    
                    numMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
                }

                const totalSowHours = numMonths * (brand.monthlySowHours || 0);

                // Since our global query limits to the Query Start/End, we use the pre-calculated aggregation.
                // NOTE: This assumes accurate SOW mapping, which our job insertion maintains.
                const utilisedHours = jobAggregations[brand.brandId] || 0;
                const variance = totalSowHours - utilisedHours;
                return {
                    id: brand.brandId,
                    clientId: brand.clientId,
                    clientName: brand.clientName,
                    brandId: brand.brandId,
                    brandName: brand.brandName,
                    contractStartDate: brand.contractStartDate,
                    contractEndDate: brand.contractEndDate,
                    totalSowHours,
                    utilisedHours,
                    variance,
                };
            });

            return { success: true, data: summaryData };
        }),

    getDashboardStats: protectedProcedure
        .input(z.object({
            clientId: z.number(),
            brandId: z.number(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            const db = drizzle(ctx.env.DB);

            const isManager = ['OWNER', 'GROUP_HEAD', 'ACCOUNT_MANAGER'].includes(ctx.user.role || '');
            const isClient = ctx.user.role === 'CLIENT';
            
            if (isClient) {
                const brand = await db.select().from(brands).where(eq(brands.id, input.brandId)).get();
                if (!brand || brand.clientId !== ctx.user.clientId) {
                    throw new TRPCError({ code: 'FORBIDDEN', message: "You don't have access to this brand's data" });
                }
            } else if (!isManager) {
                if (!ctx.user.id) throw new TRPCError({ code: 'UNAUTHORIZED' });
                const permission = await db
                    .select()
                    .from(userBrands)
                    .where(and(
                        eq(userBrands.userId, ctx.user.id),
                        eq(userBrands.brandId, input.brandId)
                    ))
                    .get();
                if (!permission) throw new TRPCError({ code: 'FORBIDDEN', message: "You don't have access to this project" });
            }
            
            const brand = await db
                .select()
                .from(brands)
                .where(eq(brands.id, input.brandId))
                .get();

            if (!brand) throw new TRPCError({ code: 'NOT_FOUND', message: "Brand not found" });

            const queryStart = input.startDate ? new Date(input.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            const queryEnd = input.endDate ? new Date(input.endDate) : new Date();

            const contractStart = brand.contractStartDate ? new Date(brand.contractStartDate) : queryStart;
            const contractEnd = brand.contractEndDate ? new Date(brand.contractEndDate) : queryEnd;

            const intersectStart = new Date(Math.max(queryStart.getTime(), contractStart.getTime()));
            const intersectEnd = new Date(Math.min(queryEnd.getTime(), contractEnd.getTime()));

            let numMonths = 0;
            if (intersectEnd >= intersectStart) {
                numMonths = (intersectEnd.getFullYear() - intersectStart.getFullYear()) * 12 + (intersectEnd.getMonth() - intersectStart.getMonth()) + 1;
            }

            const totalSowHours = numMonths * (brand.monthlySowHours || 0);

            // Fetch aggregated job stats for this brand within the intersection range using SQL directly
            // This prevents loading potentially thousands of rows into server RAM
            const aggregatedStats = await db
                .select({
                    utilisedHours: sql<number>`COALESCE(SUM(${jobs.allocatedHours}), 0)`,
                    totalJobs: sql<number>`COUNT(${jobs.id})`,
                    completedJobs: sql<number>`SUM(CASE WHEN ${jobs.status} = 'COMPLETED' THEN 1 ELSE 0 END)`,
                    pendingJobs: sql<number>`SUM(CASE WHEN ${jobs.status} != 'COMPLETED' THEN 1 ELSE 0 END)`,
                    // social media deliverables stats
                    caroDone: sql<number>`SUM(CASE WHEN ${jobs.deliverableType} = 'Caro' AND ${jobs.status} = 'COMPLETED' THEN ${jobs.quantity} ELSE 0 END)`,
                    staticSystemDone: sql<number>`SUM(CASE WHEN LOWER(${jobs.deliverableType}) IN ('statics (system)', 'statics (system 1)', 'statics (system 2)', 'statics (system based)') AND ${jobs.status} = 'COMPLETED' THEN ${jobs.quantity} ELSE 0 END)`,
                    staticAiDone: sql<number>`SUM(CASE WHEN LOWER(${jobs.deliverableType}) IN ('statics (ai)', 'ai static', 'ai based statics') AND ${jobs.status} = 'COMPLETED' THEN ${jobs.quantity} ELSE 0 END)`,
                    gifDone: sql<number>`SUM(CASE WHEN ${jobs.deliverableType} = 'GIFs' AND ${jobs.status} = 'COMPLETED' THEN ${jobs.quantity} ELSE 0 END)`,
                    systemVideo15sDone: sql<number>`SUM(CASE WHEN ${jobs.deliverableType} = 'System Video (15s)' AND ${jobs.status} = 'COMPLETED' THEN ${jobs.quantity} ELSE 0 END)`,
                    systemVideo30sDone: sql<number>`SUM(CASE WHEN ${jobs.deliverableType} = 'System Video (30s)' AND ${jobs.status} = 'COMPLETED' THEN ${jobs.quantity} ELSE 0 END)`,
                    systemVideo45sDone: sql<number>`SUM(CASE WHEN ${jobs.deliverableType} = 'System Video (45s)' AND ${jobs.status} = 'COMPLETED' THEN ${jobs.quantity} ELSE 0 END)`,
                    shootReel15sDone: sql<number>`SUM(CASE WHEN ${jobs.deliverableType} = 'Shoot Reel (15s)' AND ${jobs.status} = 'COMPLETED' THEN ${jobs.quantity} ELSE 0 END)`,
                    shootReel30sDone: sql<number>`SUM(CASE WHEN ${jobs.deliverableType} = 'Shoot Reel (30s)' AND ${jobs.status} = 'COMPLETED' THEN ${jobs.quantity} ELSE 0 END)`,
                    shootReel45sDone: sql<number>`SUM(CASE WHEN ${jobs.deliverableType} = 'Shoot Reel (45s)' AND ${jobs.status} = 'COMPLETED' THEN ${jobs.quantity} ELSE 0 END)`,
                    aiVideo15sDone: sql<number>`SUM(CASE WHEN ${jobs.deliverableType} = 'AI Video (15s)' AND ${jobs.status} = 'COMPLETED' THEN ${jobs.quantity} ELSE 0 END)`,
                    aiVideo30sDone: sql<number>`SUM(CASE WHEN ${jobs.deliverableType} = 'AI Video (30s)' AND ${jobs.status} = 'COMPLETED' THEN ${jobs.quantity} ELSE 0 END)`,
                    aiVideo45sDone: sql<number>`SUM(CASE WHEN ${jobs.deliverableType} = 'AI Video (45s)' AND ${jobs.status} = 'COMPLETED' THEN ${jobs.quantity} ELSE 0 END)`,
                    ytVideoDone: sql<number>`SUM(CASE WHEN ${jobs.deliverableType} = 'YT Video (Long format)' AND ${jobs.status} = 'COMPLETED' THEN ${jobs.quantity} ELSE 0 END)`,
                })
                .from(jobs)
                .innerJoin(sows, eq(jobs.sowId, sows.id))
                .where(and(
                    eq(sows.brandId, input.brandId),
                    lte(sows.startDate, intersectEnd),
                    gte(sows.endDate, intersectStart)
                ))
                .get();

            const utilisedHours = aggregatedStats?.utilisedHours || 0;
            const completedJobs = aggregatedStats?.completedJobs || 0;
            const pendingJobs = aggregatedStats?.pendingJobs || 0;
            const totalJobs = aggregatedStats?.totalJobs || 0;

            const variance = totalSowHours - utilisedHours;

            return {
                success: true,
                data: {
                    totalSowHours,
                    utilisedHours,
                    variance,
                    hoursLeft: Math.max(0, variance),
                    totalJobs,
                    completedJobs,
                    pendingJobs,
                    deliverables: {
                        caro: { done: (aggregatedStats as any).caroDone || 0, total: numMonths * (brand.caroCount || 0) },
                        staticSystem: { done: (aggregatedStats as any).staticSystemDone || 0, total: numMonths * (brand.staticSystemCount || 0) },
                        staticAi: { done: (aggregatedStats as any).staticAiDone || 0, total: numMonths * (brand.staticAiCount || 0) },
                        gif: { done: (aggregatedStats as any).gifDone || 0, total: numMonths * (brand.gifCount || 0) },
                        systemVideo15s: { done: (aggregatedStats as any).systemVideo15sDone || 0, total: numMonths * (brand.systemVideo15sCount || 0) },
                        systemVideo30s: { done: (aggregatedStats as any).systemVideo30sDone || 0, total: numMonths * (brand.systemVideo30sCount || 0) },
                        systemVideo45s: { done: (aggregatedStats as any).systemVideo45sDone || 0, total: numMonths * (brand.systemVideo45sCount || 0) },
                        shootReel15s: { done: (aggregatedStats as any).shootReel15sDone || 0, total: numMonths * (brand.shootReel15sCount || 0) },
                        shootReel30s: { done: (aggregatedStats as any).shootReel30sDone || 0, total: numMonths * (brand.shootReel30sCount || 0) },
                        shootReel45: { done: (aggregatedStats as any).shootReel45sDone || 0, total: numMonths * (brand.shootReel45sCount || 0) },
                        aiVideo15s: { done: (aggregatedStats as any).aiVideo15sDone || 0, total: numMonths * (brand.aiVideo15sCount || 0) },
                        aiVideo30s: { done: (aggregatedStats as any).aiVideo30sDone || 0, total: numMonths * (brand.aiVideo30sCount || 0) },
                        aiVideo45s: { done: (aggregatedStats as any).aiVideo45sDone || 0, total: numMonths * (brand.aiVideo45sCount || 0) },
                        ytVideo: { done: (aggregatedStats as any).ytVideoDone || 0, total: numMonths * (brand.ytVideoCount || 0) },
                    }
                }
            };
        }),

    getMonthlyReport: protectedProcedure
        .input(z.object({
            brandId: z.number(),
        }))
        .query(async ({ ctx, input }) => {
            const db = drizzle(ctx.env.DB);

            const isManager = ['PM', 'OWNER'].includes(ctx.user.role || '');
            const isClient = ctx.user.role === 'CLIENT';
            
            // 1. RBAC Verification
            if (isClient) {
                const brand = await db.select().from(brands).where(eq(brands.id, input.brandId)).get();
                if (!brand || brand.clientId !== ctx.user.clientId) {
                    throw new TRPCError({ code: 'FORBIDDEN', message: "You don't have access to this brand's data" });
                }
            } else if (!isManager) {
                if (!ctx.user.id) throw new TRPCError({ code: 'UNAUTHORIZED' });
                const permission = await db
                    .select()
                    .from(userBrands)
                    .where(and(
                        eq(userBrands.userId, ctx.user.id),
                        eq(userBrands.brandId, input.brandId)
                    ))
                    .get();
                if (!permission) throw new TRPCError({ code: 'FORBIDDEN', message: "You don't have access to this project" });
            }
            
            // 2. Fetch Brand to get contract dates
            const brand = await db
                .select()
                .from(brands)
                .where(eq(brands.id, input.brandId))
                .get();

            if (!brand) throw new TRPCError({ code: 'NOT_FOUND', message: "Brand not found" });

            if (!brand.contractStartDate || !brand.contractEndDate) {
                return { success: true, data: [] }; // No contract timeline 
            }

            const startDate = new Date(brand.contractStartDate);
            const endDate = new Date(brand.contractEndDate);
            
            // 3. Generate list of month strings for the duration
            const months: string[] = [];
            const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
            const finalDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

            while (currentDate <= finalDate) {
                months.push(currentDate.toLocaleString('default', { month: 'long' }) + " " + currentDate.getFullYear());
                currentDate.setMonth(currentDate.getMonth() + 1);
            }

            // 4. Fetch all SOWs for this brand in the date range
            const brandSows = await db.select().from(sows).where(
                and(
                    eq(sows.brandId, input.brandId),
                    inArray(sows.month, months)
                )
            ).all();

            // 5. Fetch and aggregate all job hours grouped by sowId directly in SQL
            // using db.select({ ... }).from(jobs).where(inArray(jobs.sowId, validSowIds)).groupBy(...)
            // However, Drizzle D1 doesn't perfectly type-infer groupBy natively without raw SQL,
            // so we will fetch just what we need or do a safe query.

            const sowIds = brandSows.map(s => s.id);
            let jobAggregations: Record<number, any> = {};
            if (sowIds.length > 0) {
                const aggResult = await db.select({
                    sowId: jobs.sowId,
                    totalAllocated: sql<number>`SUM(${jobs.allocatedHours})`,
                    caro: sql<number>`SUM(CASE WHEN ${jobs.deliverableType} = 'Caro' AND ${jobs.status} = 'COMPLETED' THEN ${jobs.quantity} ELSE 0 END)`,
                    staticSystem: sql<number>`SUM(CASE WHEN LOWER(${jobs.deliverableType}) IN ('statics (system)', 'statics (system 1)', 'statics (system 2)', 'statics (system based)') AND ${jobs.status} = 'COMPLETED' THEN ${jobs.quantity} ELSE 0 END)`,
                    staticAi: sql<number>`SUM(CASE WHEN LOWER(${jobs.deliverableType}) IN ('statics (ai)', 'ai static', 'ai based statics') AND ${jobs.status} = 'COMPLETED' THEN ${jobs.quantity} ELSE 0 END)`,
                    gif: sql<number>`SUM(CASE WHEN ${jobs.deliverableType} = 'GIFs' AND ${jobs.status} = 'COMPLETED' THEN ${jobs.quantity} ELSE 0 END)`,
                    systemVideo15s: sql<number>`SUM(CASE WHEN ${jobs.deliverableType} = 'System Video (15s)' AND ${jobs.status} = 'COMPLETED' THEN ${jobs.quantity} ELSE 0 END)`,
                    systemVideo30s: sql<number>`SUM(CASE WHEN ${jobs.deliverableType} = 'System Video (30s)' AND ${jobs.status} = 'COMPLETED' THEN ${jobs.quantity} ELSE 0 END)`,
                    systemVideo45s: sql<number>`SUM(CASE WHEN ${jobs.deliverableType} = 'System Video (45s)' AND ${jobs.status} = 'COMPLETED' THEN ${jobs.quantity} ELSE 0 END)`,
                    shootReel15s: sql<number>`SUM(CASE WHEN ${jobs.deliverableType} = 'Shoot Reel (15s)' AND ${jobs.status} = 'COMPLETED' THEN ${jobs.quantity} ELSE 0 END)`,
                    shootReel30s: sql<number>`SUM(CASE WHEN ${jobs.deliverableType} = 'Shoot Reel (30s)' AND ${jobs.status} = 'COMPLETED' THEN ${jobs.quantity} ELSE 0 END)`,
                    shootReel45s: sql<number>`SUM(CASE WHEN ${jobs.deliverableType} = 'Shoot Reel (45s)' AND ${jobs.status} = 'COMPLETED' THEN ${jobs.quantity} ELSE 0 END)`,
                    aiVideo15s: sql<number>`SUM(CASE WHEN ${jobs.deliverableType} = 'AI Video (15s)' AND ${jobs.status} = 'COMPLETED' THEN ${jobs.quantity} ELSE 0 END)`,
                    aiVideo30s: sql<number>`SUM(CASE WHEN ${jobs.deliverableType} = 'AI Video (30s)' AND ${jobs.status} = 'COMPLETED' THEN ${jobs.quantity} ELSE 0 END)`,
                    aiVideo45s: sql<number>`SUM(CASE WHEN ${jobs.deliverableType} = 'AI Video (45s)' AND ${jobs.status} = 'COMPLETED' THEN ${jobs.quantity} ELSE 0 END)`,
                    ytVideo: sql<number>`SUM(CASE WHEN ${jobs.deliverableType} = 'YT Video (Long format)' AND ${jobs.status} = 'COMPLETED' THEN ${jobs.quantity} ELSE 0 END)`,
                })
                .from(jobs)
                .where(inArray(jobs.sowId, sowIds))
                .groupBy(jobs.sowId)
                .all();

                aggResult.forEach(row => {
                    (jobAggregations as any)[row.sowId] = row;
                });
            }

            const monthlyData = months.map((monthStr) => {
                const monthSow = brandSows.find(s => s.month === monthStr);
                const stats: any = monthSow ? jobAggregations[monthSow.id] || {} : {};

                return {
                    month: monthStr,
                    utilisedHours: stats.totalAllocated || 0,
                    deliverables: {
                        staticSystem: { done: stats.staticSystem || 0, total: brand.staticSystemCount || 0 },
                        staticAi: { done: stats.staticAi || 0, total: brand.staticAiCount || 0 },
                        gif: { done: stats.gif || 0, total: brand.gifCount || 0 },
                        systemVideo15s: { done: stats.systemVideo15s || 0, total: brand.systemVideo15sCount || 0 },
                        systemVideo30s: { done: stats.systemVideo30s || 0, total: brand.systemVideo30sCount || 0 },
                        systemVideo45s: { done: stats.systemVideo45s || 0, total: brand.systemVideo45sCount || 0 },
                        shootReel15s: { done: stats.shootReel15s || 0, total: brand.shootReel15sCount || 0 },
                        shootReel30s: { done: stats.shootReel30s || 0, total: brand.shootReel30sCount || 0 },
                        shootReel45: { done: stats.shootReel45s || 0, total: brand.shootReel45sCount || 0 },
                        aiVideo15s: { done: stats.aiVideo15s || 0, total: brand.aiVideo15sCount || 0 },
                        aiVideo30s: { done: stats.aiVideo30s || 0, total: brand.aiVideo30sCount || 0 },
                        aiVideo45s: { done: stats.aiVideo45s || 0, total: brand.aiVideo45sCount || 0 },
                        ytVideo: { done: stats.ytVideo || 0, total: brand.ytVideoCount || 0 },
                    }
                };
            });

            return { success: true, data: monthlyData };
        }),
});
