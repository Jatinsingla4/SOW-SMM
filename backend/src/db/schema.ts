import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  picture: text('picture'),
  password: text('password'), // Hashed password
  role: text('role', { enum: ['OWNER', 'GROUP_HEAD', 'ACCOUNT_MANAGER', 'SOCIAL_MEDIA_EXECUTIVE', 'MOTION_DESIGNER', 'STATIC_DESIGNER', 'CLIENT'] }),
  status: text('status', { enum: ['PENDING', 'APPROVED', 'REJECTED'] }).default('PENDING'),
  clientId: integer('client_id').references(() => clients.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow(),
});

export const clients = sqliteTable('clients', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow(),
});

export const brands = sqliteTable('brands', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clientId: integer('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  contractStartDate: integer('contract_start_date', { mode: 'timestamp' }),
  contractEndDate: integer('contract_end_date', { mode: 'timestamp' }),
  monthlySowHours: real('monthly_sow_hours'),
  caroCount: integer('caro_count').default(0),
  staticSystemCount: integer('static_system_count').default(0),
  staticAiCount: integer('static_ai_count').default(0),
  gifCount: integer('gif_count').default(0),
  systemVideo15sCount: integer('system_video_15s_count').default(0),
  systemVideo30sCount: integer('system_video_30s_count').default(0),
  systemVideo45sCount: integer('system_video_45s_count').default(0),
  shootReel15sCount: integer('shoot_reel_15s_count').default(0),
  shootReel30sCount: integer('shoot_reel_30s_count').default(0),
  shootReel45sCount: integer('shoot_reel_45s_count').default(0),
  aiVideo15sCount: integer('ai_video_15s_count').default(0),
  aiVideo30sCount: integer('ai_video_30s_count').default(0),
  aiVideo45sCount: integer('ai_video_45s_count').default(0),
  ytVideoCount: integer('yt_video_count').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow(),
}, (table) => ({
  clientBrandUnq: uniqueIndex('client_brand_unq_idx').on(table.clientId, table.name),
}));

export const contracts = sqliteTable('contracts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clientId: integer('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  r2Key: text('r2_key').notNull(), // Path in R2
  status: text('status', { enum: ['ACTIVE', 'EXPIRED', 'PENDING'] }).default('PENDING'),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow(),
});

export const sows = sqliteTable('sow', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clientId: integer('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  brandId: integer('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  month: text('month').notNull(),
  startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
  endDate: integer('end_date', { mode: 'timestamp' }).notNull(),
  totalSowHours: real('total_sow_hours'), // Optional now, deliverables are primary
  version: integer('version').default(1),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow(),
}, (table) => ({
  brandIdx: uniqueIndex('sow_brand_idx').on(table.brandId, table.month),
}));

export const jobs = sqliteTable('jobs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sowId: integer('sow_id').notNull().references(() => sows.id, { onDelete: 'cascade' }),
  jobHeading: text('job_heading').notNull(),
  jobDescription: text('job_description'),
  team: text('team'),
  person: text('person'),
  deliverableType: text('deliverable_type'),
  quantity: integer('quantity').default(1),
  targetedHours: real('targeted_hours'),
  allocatedHours: real('allocated_hours').default(0),
  briefDate: integer('brief_date', { mode: 'timestamp' }),
  workingDate: integer('working_date', { mode: 'timestamp' }),
  finishedDate: integer('finished_date', { mode: 'timestamp' }),
  status: text('status', { enum: ['NOT_STARTED', 'WIP', 'COMPLETED', 'REWORKED'] }).default('NOT_STARTED'),
  version: integer('version').default(1),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow(),
}, (table) => ({
  sowIdx: uniqueIndex('job_sow_idx').on(table.sowId, table.id),
  personIdx: uniqueIndex('job_person_idx').on(table.person, table.status),
}));

export const userBrands = sqliteTable('user_brands', {
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  brandId: integer('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow(),
}, (table) => ({
  pk: uniqueIndex('user_brand_pk').on(table.userId, table.brandId),
}));
