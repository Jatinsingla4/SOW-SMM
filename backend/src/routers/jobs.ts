import { router, protectedProcedure } from "../trpc";
import { z } from "zod";
import { drizzle } from "drizzle-orm/d1";
import { jobs, sows, userBrands, brands } from "../db/schema";
import { eq, inArray, and, gte, lte, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const jobRouter = router({
    list: protectedProcedure
        .input(z.object({
            sowId: z.union([z.number(), z.array(z.number())]).optional(),
            brandId: z.number().optional(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
            search: z.string().optional(),
            status: z.string().optional(),
            limit: z.number().max(1000).default(500),
            offset: z.number().min(0).default(0),
        }))
        .query(async ({ ctx, input }) => {
            const db = drizzle(ctx.env.DB);
            let filters = [];

            // Hierarchy Filtering - Creative Root Work Fix
            const isManager = ['OWNER', 'GROUP_HEAD', 'ACCOUNT_MANAGER'].includes(ctx.user.role || '');
            const isClient = ctx.user.role === 'CLIENT';
            const isTechRole = ['SOCIAL_MEDIA_EXECUTIVE', 'MOTION_DESIGNER', 'STATIC_DESIGNER'].includes(ctx.user.role || '');

            // 1. If brandId is provided, enforce brand-level filtering
            if (input.brandId) {
                // Security Check: If not a manager, verify they have brand access
                if (!isManager) {
                    if (isClient) {
                        // CLIENT: check if the brand belongs to their client
                        const brand = await db.select().from(brands).where(eq(brands.id, input.brandId)).get();
                        if (!brand || brand.clientId !== ctx.user.clientId) {
                            throw new TRPCError({ code: 'FORBIDDEN', message: 'You only have access to your own brand tasks' });
                        }
                    } else {
                        // Tech/PC: check brand assignment
                        const assigned = await db.select()
                            .from(userBrands)
                            .where(and(eq(userBrands.userId, ctx.user.id), eq(userBrands.brandId, input.brandId)))
                            .get();
                        if (!assigned) {
                            throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have access to this brand tasks' });
                        }
                    }
                }
                filters.push(eq(sows.brandId, input.brandId));
            } else if (input.sowId) {
                // If sowId is provided but not brandId, we still apply common sow filter below
                // Security check for sowId is usually implicit if we join with sows
            } else {
                // 2. ROOT FIX: If NO specific brand is selected, ONLY show tasks assigned to the user
                // This prevents Managers/PCs from seeing a "mess" of all brands on global pages
                if (isClient) {
                    // Clients: if no brand selected, show all their client's brands? 
                    // No, user said "select brand me se jispe click krege vo dikhe".
                    // But for "My Workspace" equivalent, they might see nothing unless brand is select.
                    // Let's filter by their clientId
                    if (ctx.user.clientId) {
                        filters.push(eq(sows.clientId, ctx.user.clientId));
                    } else {
                        return { success: true, data: [] };
                    }
                } else if (isManager || isTechRole) {
                    // Show only jobs where they are the assigned person
                    filters.push(eq(jobs.person, ctx.user.name || ""));
                } else {
                    return { success: true, data: [] };
                }
            }

            if (input.sowId) {
                if (Array.isArray(input.sowId)) {
                    filters.push(inArray(jobs.sowId, input.sowId));
                } else {
                    filters.push(eq(jobs.sowId, input.sowId));
                }
            }

            // Date filtering
            if (input.startDate && input.endDate) {
                filters.push(lte(sows.startDate, new Date(input.endDate)));
                filters.push(gte(sows.endDate, new Date(input.startDate)));
            } else if (input.startDate) {
                filters.push(gte(sows.endDate, new Date(input.startDate)));
            } else if (input.endDate) {
                filters.push(lte(sows.startDate, new Date(input.endDate)));
            }
            
            const res = await db
                .select({
                    id: jobs.id,
                    sowId: jobs.sowId,
                    clientId: sows.clientId,
                    brandId: sows.brandId,
                    brandName: brands.name,
                    jobHeading: jobs.jobHeading,
                    jobDescription: jobs.jobDescription,
                    team: jobs.team,
                    person: jobs.person,
                    deliverableType: jobs.deliverableType,
                    quantity: jobs.quantity,
                    targetedHours: jobs.targetedHours,
                    allocatedHours: jobs.allocatedHours,
                    briefDate: jobs.briefDate,
                    finishedDate: jobs.finishedDate,
                    status: jobs.status,
                    version: jobs.version,
                    createdAt: jobs.createdAt,
                    updatedAt: jobs.updatedAt,
                })
                .from(jobs)
                .innerJoin(sows, eq(jobs.sowId, sows.id))
                .innerJoin(brands, eq(sows.brandId, brands.id))
                .where(filters.length > 0 ? and(...filters) : undefined)
                .orderBy(jobs.createdAt)
                .limit(input.limit)
                .offset(input.offset)
                .all();

            // Note: Returning 'nextOffset' for potential frontend Infinite Scroll implementation
            return { 
                success: true, 
                data: res as any,
                nextOffset: res.length === input.limit ? input.offset + input.limit : null
            };
        }),

    create: protectedProcedure
        .input(z.object({
            clientId: z.number(),
            brandId: z.number(),
            jobHeading: z.string(),
            jobDescription: z.string().nullable().optional(),
            team: z.string().nullable().optional(),
            person: z.string().nullable().optional(), // Now dynamic
            personEmail: z.string().nullable().optional(), // To send notification
            allocatedHours: z.number().optional(),
            targetedHours: z.number().optional(),
            deliverableType: z.string().nullable().optional(),
            quantity: z.number().optional().default(1),
            briefDate: z.string().nullable().optional(),
            status: z.enum(['NOT_STARTED', 'WIP', 'COMPLETED', 'REWORKED']).optional(),
            finishedDate: z.string().nullable().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const db = drizzle(ctx.env.DB);
            const isManager = ['OWNER', 'GROUP_HEAD', 'ACCOUNT_MANAGER'].includes(ctx.user.role || '');
            const isTechRole = ['SOCIAL_MEDIA_EXECUTIVE', 'MOTION_DESIGNER', 'STATIC_DESIGNER'].includes(ctx.user.role || '');
            
            if (!isManager && !isTechRole) {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not authorized to create tasks' });
            }

            const isClient = ctx.user.role === 'CLIENT';

            // Security Check: Brand Ownership
            if (isClient) {
                const brand = await db.select().from(brands).where(eq(brands.id, input.brandId)).get();
                if (!brand || brand.clientId !== ctx.user.clientId) {
                    throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized brand selection' });
                }
            } else if (!isManager) {
                // Tech roles must be assigned to the brand
                const assigned = await db.select().from(userBrands).where(and(eq(userBrands.userId, ctx.user.id), eq(userBrands.brandId, input.brandId))).get();
                if (!assigned) {
                    throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not assigned to this project' });
                }
            }

            // Tech roles auto-assign to themselves
            let person = input.person;
            let personEmail = input.personEmail;
            let team = input.team;

            if (!isManager) {
                person = ctx.user.name || "Unknown";
                personEmail = ctx.user.email || "";
                // Map tech role to team name
                const roleMapping: Record<string, string> = {
                    'CONTENT_CREATOR': 'Content Creator',
                    'VIDEO_EDITOR': 'Video Editor',
                    'SOCIAL_MEDIA_MANAGER': 'Social Media Manager',
                    'ACCOUNT_MANAGER': 'Account Manager'
                };
                team = roleMapping[ctx.user.role || ''] || input.team;
            }

            // 1. Get or Create SOW for the correct month (either now or from finishedDate)
            const refDate = input.finishedDate ? new Date(input.finishedDate) : new Date();
            const monthName = refDate.toLocaleString('default', { month: 'long' }) + " " + refDate.getFullYear();
            const startOfMonth = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
            const endOfMonth = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0);

            let sow = await db.select().from(sows).where(and(
                eq(sows.brandId, input.brandId),
                eq(sows.month, monthName)
            )).get();

            if (!sow) {
                // Fetch brand to get monthly hours
                const brand = await db.select().from(brands).where(eq(brands.id, input.brandId)).get();
                sow = await db.insert(sows).values({
                    clientId: input.clientId,
                    brandId: input.brandId,
                    month: monthName,
                    startDate: startOfMonth,
                    endDate: endOfMonth,
                    totalSowHours: brand?.monthlySowHours || 0,
                }).returning().get();
            }

            if (!sow) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to find or create SOW' });

            // 2. Insert Job
            const res = await db.insert(jobs).values({
                sowId: sow.id,
                jobHeading: input.jobHeading,
                jobDescription: input.jobDescription,
                deliverableType: input.deliverableType,
                quantity: input.quantity,
                team: team,
                person: person, // Assigned person's name
                allocatedHours: input.allocatedHours || 0,
                targetedHours: input.targetedHours || 0,
                briefDate: input.briefDate ? new Date(input.briefDate) : new Date(),
                status: input.status || 'NOT_STARTED',
                finishedDate: input.finishedDate ? new Date(input.finishedDate) : null,
                updatedAt: new Date(),
            }).returning().get();

            // 3. Mock Email Notification
            if (personEmail) {
                // TODO: Integrate actual email service (e.g., SendGrid/AWS SES) here
                // Email sent to: personEmail with subject: New Task Assigned: input.jobHeading
            }

            return { success: true, data: res };
        }),

    update: protectedProcedure
        .input(z.object({
            id: z.number(),
            data: z.any(), // Revert to z.any() to log the exact raw payload before Zod rejects it
        }))
        .mutation(async ({ ctx, input }) => {
            const db = drizzle(ctx.env.DB);
            
            const job = await db.select().from(jobs).where(eq(jobs.id, input.id)).get();
            if (!job) throw new TRPCError({ code: 'NOT_FOUND', message: 'Job not found' });

            const isManager = ['OWNER', 'GROUP_HEAD', 'ACCOUNT_MANAGER'].includes(ctx.user.role || '');
            const isRestrictedRole = ['SOCIAL_MEDIA_EXECUTIVE', 'MOTION_DESIGNER', 'STATIC_DESIGNER'].includes(ctx.user.role || '');
            const isClient = ctx.user.role === 'CLIENT';

            // Security Check: Does user have access to this job's brand?
            const sow = await db.select().from(sows).where(eq(sows.id, job.sowId)).get();
            if (sow) {
                if (isClient) {
                    if (sow.clientId !== ctx.user.clientId) {
                        throw new TRPCError({ code: 'FORBIDDEN', message: 'Unauthorized task access' });
                    }
                } else if (!isManager) {
                    const assigned = await db.select().from(userBrands).where(and(eq(userBrands.userId, ctx.user.id), eq(userBrands.brandId, sow.brandId))).get();
                    if (!assigned && job.person !== ctx.user.name) {
                        throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not authorized to update this task' });
                    }
                }
            }

            let updateData: any;

            if (isRestrictedRole) {
                if (job.status === 'COMPLETED') {
                    throw new TRPCError({ 
                        code: 'FORBIDDEN', 
                        message: 'This task is completed and locked. Only a manager can make further changes.' 
                    });
                }

                const allowedFields = ['status', 'allocatedHours', 'finishedDate', 'updatedAt', 'version'];
                const filteredData: any = {};
                allowedFields.forEach(field => {
                    if (input.data[field] !== undefined) {
                        filteredData[field] = input.data[field];
                    }
                });
                updateData = { ...filteredData, updatedAt: new Date() };
            } else {
                updateData = { ...input.data, updatedAt: new Date() };
            }

            // Helper to normalize dates to YYYY-MM-DD
            const normalizeDate = (d: any): string | null => {
                if (!d) return null;
                try {
                    const dateObj = new Date(d);
                    if (isNaN(dateObj.getTime())) return null;
                    return dateObj.toISOString().split('T')[0];
                } catch (e) {
                    return null;
                }
            };

            // Validation: Completion date is mandatory for COMPLETED status
            if (input.data.status === 'COMPLETED') {
                const finished = normalizeDate(input.data.finishedDate || job.finishedDate);
                if (!finished) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'Completion date is mandatory when status is COMPLETED.'
                    });
                }
            }

            // Validation: Completed Date >= Brief Date
            if (input.data.finishedDate && (input.data.briefDate || job.briefDate)) {
                const finished = normalizeDate(input.data.finishedDate);
                const brief = normalizeDate(input.data.briefDate || job.briefDate);
                
                if (finished && brief && finished < brief) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: `Completed date (${finished}) cannot be before brief date (${brief}).`
                    });
                }
            }

            // Convert date strings to Date objects for SQLite/Drizzle
            if (updateData.finishedDate) {
                const d = new Date(updateData.finishedDate);
                updateData.finishedDate = isNaN(d.getTime()) ? null : d;
            }
            if (updateData.briefDate) {
                const d = new Date(updateData.briefDate);
                updateData.briefDate = isNaN(d.getTime()) ? null : d;
            }
            if (updateData.updatedAt) {
                const d = new Date(updateData.updatedAt);
                updateData.updatedAt = isNaN(d.getTime()) ? new Date() : d;
            }

            // 2. Dynamic SOW Linkage based on finishedDate
            if (updateData.finishedDate instanceof Date && !isNaN(updateData.finishedDate.getTime())) {
                const finishedDate = updateData.finishedDate;
                const prevFinishedDate = job.finishedDate ? new Date(job.finishedDate) : null;
                
                // Only re-link if finishedDate actually changed or was previously null
                if (!prevFinishedDate || finishedDate.getTime() !== prevFinishedDate.getTime()) {
                    const monthName = finishedDate.toLocaleString('default', { month: 'long' }) + " " + finishedDate.getFullYear();
                    
                    const currentSow = await db.select({ brandId: sows.brandId, clientId: sows.clientId }).from(sows).where(eq(sows.id, job.sowId)).get();
                    
                    if (currentSow) {
                        let targetSow = await db.select().from(sows).where(and(
                            eq(sows.brandId, currentSow.brandId),
                            eq(sows.month, monthName)
                        )).get();

                        if (!targetSow) {
                            const brand = await db.select().from(brands).where(eq(brands.id, currentSow.brandId)).get();
                            const startOfMonth = new Date(finishedDate.getFullYear(), finishedDate.getMonth(), 1);
                            const endOfMonth = new Date(finishedDate.getFullYear(), finishedDate.getMonth() + 1, 0);
                            
                            targetSow = await db.insert(sows).values({
                                clientId: currentSow.clientId,
                                brandId: currentSow.brandId,
                                month: monthName,
                                startDate: startOfMonth,
                                endDate: endOfMonth,
                                totalSowHours: brand?.monthlySowHours || 0,
                            }).returning().get();
                        }
                        
                        if (targetSow) {
                            updateData.sowId = targetSow.id;
                        }
                    }
                }
            }

            // Remove fields that do not exist in the 'jobs' table
            delete updateData.clientId;
            delete updateData.brandId;
            delete updateData.personEmail;

            const res = await db.update(jobs)
                .set(updateData)
                .where(eq(jobs.id, input.id))
                .returning().get();
            return { success: true, data: res };
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
            const db = drizzle(ctx.env.DB);
            
            // Only Owner, Group Head, or AM
            const isAuthorizedRole = ['OWNER', 'GROUP_HEAD', 'ACCOUNT_MANAGER'].includes(ctx.user.role || '');
            if (!isAuthorizedRole) {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not authorized to delete jobs' });
            }

            await db.delete(jobs).where(eq(jobs.id, input.id)).run();
            return { success: true, data: null };
        }),
});
