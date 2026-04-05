import { numeric, pgTable, varchar, uuid, integer } from "drizzle-orm/pg-core";

// Keeps Drizzle from dropping the existing cards table
export const cards = pgTable("cards", {
  id:    integer().primaryKey().generatedAlwaysAsIdentity(),
  name:  varchar({ length: 255 }).notNull(),
  name2: varchar({ length: 255 }).notNull(),
});

export const wallet = pgTable("wallets", {
  wallet_id:   uuid().primaryKey().defaultRandom(),
  card_id:     varchar({ length: 255 }).notNull(),   // changed from integer → varchar
  balance:     numeric({ precision: 10, scale: 2 }).notNull().default("0.00"),
  min_balance: numeric({ precision: 10, scale: 2 }).notNull().default("10.00"),  // auto top-up threshold
  topup_amount: numeric({ precision: 10, scale: 2 }).notNull().default("50.00"), // how much to top up
});

export type Wallet    = typeof wallet.$inferSelect;
export type NewWallet = typeof wallet.$inferInsert;
