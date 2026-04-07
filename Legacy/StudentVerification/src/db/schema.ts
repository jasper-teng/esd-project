import { pgTable, integer, varchar, timestamp } from "drizzle-orm/pg-core";

export const students = pgTable("students", {
  id:                    integer().primaryKey().generatedAlwaysAsIdentity(),
  identification_number: varchar({ length: 20 }).notNull().unique(),
  name:                  varchar({ length: 255 }),
  school:                varchar({ length: 255 }).notNull(),
  date_of_birth:         varchar({ length: 10 }),
  created_at:            timestamp().defaultNow(),
});

export type Student    = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
