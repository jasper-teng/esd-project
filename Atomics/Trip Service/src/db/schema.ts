import { boolean, integer, numeric, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const trip = pgTable("trips", {
  trip_id:                integer().primaryKey().generatedAlwaysAsIdentity(),
  card_id:                varchar({ length: 255 }).notNull(),
  origin:                 varchar({ length: 255 }).notNull(),
  destination:            varchar({ length: 255 }),
  transport_type:         varchar({ length: 50 }).notNull(),   // 'bus' | 'train'
  tap_in_time:            timestamp().notNull(),
  tap_out_time:           timestamp(),
  status:                 varchar({ length: 50 }).notNull().default("in_progress"), // 'in_progress' | 'completed' | 'incomplete' | 'settled'
  fare_charged:           numeric({ precision: 10, scale: 2 }),
  settlement_reason:      text(),
  cumulative_distance_km: numeric({ precision: 10, scale: 4 }),
  journey_id:             integer(),                            // groups transfer legs into one journey
  is_transfer:            boolean().notNull().default(false),
});
