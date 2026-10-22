import { sqliteTable, text, primaryKey, index } from 'drizzle-orm/sqlite-core';
export const repositoryVotes = sqliteTable('repository_votes', {
  repository: text('repository').notNull(),
  userId: text('user_id').notNull(),
  createdAt: text('created_at').notNull(),
}, table => [primaryKey({columns:[table.repository,table.userId]}),index('repository_votes_user_idx').on(table.userId)]);
