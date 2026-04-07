import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { drizzle } from 'drizzle-orm/node-postgres'
import { and, eq, isNotNull, ne } from 'drizzle-orm'
import { userCard } from './db/schema.js'

const db = drizzle(process.env.USER_DATABASE_URL!);

const app = new Hono();
app.use('*', cors({ origin: '*' }));

const port = process.env.USER_ATOM_PORT ? Number(process.env.USER_ATOM_PORT) : 3006;

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'healthy', service: 'user-service' });
});

// POST /user/card — link a user to a card
app.post('/user/card', async (c) => {
  const body = await c.req.json();
  const { user_id, card_id, interim_start_date, existing_card_id } = body;

  if (!user_id || !card_id) {
    return c.json({ code: 400, message: 'user_id and card_id are required' }, 400);
  }

  const newLink = await db.insert(userCard).values({
    user_id,
    card_id,
    is_active: true,
    interim_start_date: interim_start_date ? new Date(interim_start_date) : null,
    existing_card_id: existing_card_id ?? null,
  }).returning();

  return c.json({ code: 201, data: newLink[0] }, 201);
});

// GET /user/cards/:user_id — get all cards linked to a user
app.get('/user/cards/:user_id', async (c) => {
  const user_id = c.req.param('user_id');

  const result = await db.select().from(userCard).where(eq(userCard.user_id, user_id));

  if (result.length === 0) {
    return c.json({ code: 404, message: 'No cards found for this user' }, 404);
  }

  return c.json({ code: 200, data: result });
});

// GET /user/by-card/:card_id — get user linked to a card
app.get('/user/by-card/:card_id', async (c) => {
  const card_id = c.req.param('card_id');

  const result = await db.select().from(userCard).where(
    and(eq(userCard.card_id, card_id), eq(userCard.is_active, true))
  );

  if (result.length === 0) {
    return c.json({ code: 404, message: 'No user found for this card' }, 404);
  }

  return c.json({ code: 200, data: result[0] });
});

// GET /user/active-cards/:lost_card_id — get other active cards for the same user
// Used in Scenario 3 (lost card) to find destination card for balance transfer
app.get('/user/active-cards/:lost_card_id', async (c) => {
  const lost_card_id = c.req.param('lost_card_id');

  // Find the user who owns the lost card
  const owner = await db.select().from(userCard).where(
    eq(userCard.card_id, lost_card_id)
  );

  if (owner.length === 0) {
    return c.json({ code: 404, message: 'Card not linked to any user' }, 404);
  }

  const user_id = owner[0].user_id;

  // Get all other active cards for this user
  const activeCards = await db.select().from(userCard).where(
    and(
      eq(userCard.user_id, user_id),
      eq(userCard.is_active, true),
      ne(userCard.card_id, lost_card_id)
    )
  );

  if (activeCards.length === 0) {
    return c.json({ code: 404, message: 'No other active cards found for this user' }, 404);
  }

  return c.json({ code: 200, data: activeCards });
});

// GET /user/interim-cards — get all user-card links with an active interim period
app.get('/user/interim-cards', async (c) => {
  const result = await db.select().from(userCard).where(isNotNull(userCard.interim_start_date));
  return c.json({ code: 200, data: result });
});

// PUT /user/card/:card_id — update card link (e.g. deactivate on loss, or clear interim)
app.put('/user/card/:card_id', async (c) => {
  const card_id = c.req.param('card_id');
  const body = await c.req.json();
  const { is_active, clear_interim } = body;

  const updated = await db.update(userCard).set({
    ...(is_active !== undefined && { is_active }),
    ...(clear_interim && { interim_start_date: null }),
  }).where(eq(userCard.card_id, card_id)).returning();

  if (updated.length === 0) {
    return c.json({ code: 404, message: 'Card link not found' }, 404);
  }

  return c.json({ code: 200, data: updated[0] });
});

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`User Service running on http://localhost:${port}`);
});
