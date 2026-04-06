import { integer, pgTable, varchar } from "drizzle-orm/pg-core";

export const card = pgTable("cards", {
  id:               integer().primaryKey().generatedAlwaysAsIdentity(),
  holder_name:      varchar({ length: 255 }),
  cardStatus:       varchar({ length: 50 }).default('ACTIVE'),
  concession_type:  varchar({ length: 50 }).default('adult'),
  email:            varchar({ length: 255 }),
  contact_number:   varchar({ length: 50 }),
  postal_code:      varchar({ length: 20 }),
  unit_number:      varchar({ length: 50 }),
});
