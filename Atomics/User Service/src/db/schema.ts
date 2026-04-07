import { boolean, integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id:           integer().primaryKey().generatedAlwaysAsIdentity(),
  email:        varchar({ length: 255 }).notNull().unique(),
  password:     varchar({ length: 255 }).notNull(), // bcrypt hash
  name:         varchar({ length: 255 }),
  created_at:   timestamp().notNull().defaultNow(),
});

export const userCard = pgTable("user_cards", {
  id:                  integer().primaryKey().generatedAlwaysAsIdentity(),
  user_id:             varchar({ length: 255 }).notNull(),
  card_id:             varchar({ length: 255 }).notNull(),
  is_active:           boolean().notNull().default(true),
  interim_start_date:  timestamp(),
  existing_card_id:    varchar({ length: 255 }),
  created_at:          timestamp().notNull().defaultNow(),
});

export type User    = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
