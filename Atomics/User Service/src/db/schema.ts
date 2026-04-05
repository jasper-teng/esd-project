import { boolean, integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const userCard = pgTable("user_cards", {
  id:                  integer().primaryKey().generatedAlwaysAsIdentity(),
  user_id:             varchar({ length: 255 }).notNull(),
  card_id:             varchar({ length: 255 }).notNull(),
  concession_type:     varchar({ length: 50 }).notNull().default("adult"), // 'adult' | 'student' | 'senior' | 'workfare' | 'child'
  is_active:           boolean().notNull().default(true),
  interim_start_date:  timestamp(),                            // set when concession card is created (Scenario 2)
  existing_card_id:    varchar({ length: 255 }),               // old card used during interim period (Scenario 2)
  created_at:          timestamp().notNull().defaultNow(),
});
