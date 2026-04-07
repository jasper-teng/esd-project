import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { drizzle } from 'drizzle-orm/node-postgres'
import { and, eq, isNotNull, ne } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { users, userCard } from './db/schema.js'

const db = drizzle(process.env.USER_DATABASE_URL!);

const app = new Hono();
app.use('*', cors({ origin: '*' }));

const port = process.env.USER_ATOM_PORT ? Number(process.env.USER_ATOM_PORT) : 3006;

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'healthy', service: 'user-service' });
});

// ---------------------------------------------------------------------------
// POST /auth/register — create a new user account
// ---------------------------------------------------------------------------
app.post('/auth/register', async (c) => {
  const { email, password, name } = await c.req.json();

  if (!email || !password) {
    return c.json({ code: 400, message: 'email and password are required' }, 400);
  }

  const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
  if (existing.length > 0) {
    return c.json({ code: 409, message: 'Email already registered' }, 409);
  }

  const hashed = await bcrypt.hash(password, 10);

  const [user] = await db.insert(users).values({
    email: email.toLowerCase(),
    password: hashed,
    name: name ?? null,
  }).returning();

  return c.json({ code: 201, data: { id: user.id, email: user.email, name: user.name } }, 201);
});

// ---------------------------------------------------------------------------
// POST /auth/login — authenticate user, return user info + linked cards
// ---------------------------------------------------------------------------
app.post('/auth/login', async (c) => {
  const { email, password } = await c.req.json();

  if (!email || !password) {
    return c.json({ code: 400, message: 'email and password are required' }, 400);
  }

  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));

  if (!user) {
    return c.json({ code: 401, message: 'Invalid email or password' }, 401);
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return c.json({ code: 401, message: 'Invalid email or password' }, 401);
  }

  // Get linked cards
  const cards = await db.select().from(userCard).where(
    and(eq(userCard.user_id, String(user.id)), eq(userCard.is_active, true))
  );

  return c.json({
    code: 200,
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      cards: cards.map(c => c.card_id),
    }
  });
});

// ---------------------------------------------------------------------------
// POST /user/card — link a user to a card
// ---------------------------------------------------------------------------
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

// GET /user/active-cards/:lost_card_id
app.get('/user/active-cards/:lost_card_id', async (c) => {
  const lost_card_id = c.req.param('lost_card_id');

  const owner = await db.select().from(userCard).where(eq(userCard.card_id, lost_card_id));

  if (owner.length === 0) {
    return c.json({ code: 404, message: 'Card not linked to any user' }, 404);
  }

  const user_id = owner[0].user_id;

  const activeCards = await db.select().from(userCard).where(
    and(eq(userCard.user_id, user_id), eq(userCard.is_active, true), ne(userCard.card_id, lost_card_id))
  );

  if (activeCards.length === 0) {
    return c.json({ code: 404, message: 'No other active cards found for this user' }, 404);
  }

  return c.json({ code: 200, data: activeCards });
});

// GET /user/interim-cards
app.get('/user/interim-cards', async (c) => {
  const result = await db.select().from(userCard).where(isNotNull(userCard.interim_start_date));
  return c.json({ code: 200, data: result });
});

// PUT /user/card/:card_id
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
