import { pgTable, uuid, text, integer, date, timestamp, unique } from 'drizzle-orm/pg-core';

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  inviteCode: text('invite_code').notNull().unique(),
  discordWebhookUrl: text('discord_webhook_url'),
  discordGeneralChannelId: text('discord_general_channel_id'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const teamMembers = pgTable('team_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  displayName: text('display_name').notNull(),
  role: text('role').notNull().default('member'),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow()
}, (t) => [
  unique().on(t.teamId, t.userId)
]);

export const checkins = pgTable('checkins', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  clarityScore: integer('clarity_score').notNull(),
  executionScore: integer('execution_score').notNull(),
  qualityScore: integer('quality_score').notNull(),
  reflection: text('reflection').notNull(),
  tag: text('tag'),
  weekOf: date('week_of').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (t) => [
  unique().on(t.userId, t.teamId, t.weekOf)
]);

export * from './auth.schema';
