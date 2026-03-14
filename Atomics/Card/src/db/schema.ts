import { integer, pgTable, varchar } from "drizzle-orm/pg-core";

export const card = pgTable("cards", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull()
});
