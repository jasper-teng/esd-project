import { int } from "drizzle-orm/mysql-core";
import { integer, numeric, pgTable, varchar, uuid } from "drizzle-orm/pg-core";

export const wallet = pgTable("wallets", {
  wallet_id: uuid().primaryKey().defaultRandom(),
  card_id: integer().notNull(),
  balance: numeric({precision: 2}).notNull(),
});
