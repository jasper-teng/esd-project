import { boolean, numeric, pgTable, varchar, uuid } from "drizzle-orm/pg-core";

export const wallet = pgTable("wallets", {
  wallet_id:          uuid().primaryKey().defaultRandom(),
  card_id:            varchar({ length: 255 }).notNull(),
  balance:            numeric({ precision: 10, scale: 2 }).notNull().default("0.00"),
  auto_topup_enabled: boolean().notNull().default(false),
});

export type Wallet    = typeof wallet.$inferSelect;
export type NewWallet = typeof wallet.$inferInsert;
