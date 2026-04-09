/**
 * Seed script — creates 5 cards and their matching wallets.
 *
 * Run from the Card service directory:
 *   npm run seed
 *
 * Requires env vars (local ports when running outside Docker):
 *   CARD_DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres
 *   WALLET_DATABASE_URL=postgres://postgres:postgres@localhost:5433/postgres
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { numeric, pgTable, uuid, varchar } from 'drizzle-orm/pg-core';
import { card } from './db/schema.js';

const CARD_URL   = process.env.CARD_DATABASE_URL;
const WALLET_URL = process.env.WALLET_DATABASE_URL;

if (!CARD_URL)   { console.error('Missing CARD_DATABASE_URL');   process.exit(1); }
if (!WALLET_URL) { console.error('Missing WALLET_DATABASE_URL'); process.exit(1); }

// Inline wallet schema to avoid cross-package imports
const wallet = pgTable('wallets', {
  wallet_id: uuid().primaryKey().defaultRandom(),
  card_id:   varchar({ length: 255 }).notNull(),
  balance:   numeric({ precision: 10, scale: 2 }).notNull().default('0.00'),
});

const cardDb   = drizzle(CARD_URL);
const walletDb = drizzle(WALLET_URL);

const SEED_CARDS = [
  {
    holder_name:     'Alice Tan',
    cardStatus:      'ACTIVE',
    concession_type: 'adult',
    email:           'alice.tan@example.com',
    contact_number:  '91234567',
    postal_code:     '560123',
    unit_number:     '#05-12',
  },
  {
    holder_name:     'Bob Lim',
    cardStatus:      'ACTIVE',
    concession_type: 'student',
    email:           'bob.lim@example.com',
    contact_number:  '82345678',
    postal_code:     '730456',
    unit_number:     '#03-08',
  },
  {
    holder_name:     'Carol Wong',
    cardStatus:      'ACTIVE',
    concession_type: 'senior',
    email:           'carol.wong@example.com',
    contact_number:  '93456789',
    postal_code:     '520789',
    unit_number:     '#10-22',
  },
  {
    holder_name:     'David Ng',
    cardStatus:      'ACTIVE',
    concession_type: 'adult',
    email:           'david.ng@example.com',
    contact_number:  '84567890',
    postal_code:     '680234',
    unit_number:     '#07-15',
  },
  {
    holder_name:     'Eve Chua',
    cardStatus:      'ACTIVE',
    concession_type: 'student',
    email:           'eve.chua@example.com',
    contact_number:  '95678901',
    postal_code:     '310567',
    unit_number:     '#02-04',
  },
];

async function seed() {
  const existing = await cardDb.select({ id: card.id }).from(card).limit(1);
  if (existing.length > 5) {
    console.log('Cards already exist — skipping seed.');
    process.exit(0);
  }

  console.log('Seeding cards...');
  const insertedCards = await cardDb
    .insert(card)
    .values(SEED_CARDS)
    .returning({ id: card.id, holder_name: card.holder_name });

  console.log(`Inserted ${insertedCards.length} cards:`);
  for (const c of insertedCards) {
    console.log(`  Card #${c.id} — ${c.holder_name}`);
  }

  console.log('\nSeeding wallets...');
  const walletRows = insertedCards.map(c => ({
    card_id: String(c.id),
    balance: '50.00',
  }));

  const insertedWallets = await walletDb
    .insert(wallet)
    .values(walletRows)
    .returning();

  console.log(`Inserted ${insertedWallets.length} wallets:`);
  for (const w of insertedWallets) {
    console.log(`  Wallet ${w.wallet_id} — card_id=${w.card_id}  balance=$${w.balance}`);
  }

  console.log('\nDone!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
