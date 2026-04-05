import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { drizzle } from 'drizzle-orm/node-postgres'
import { and, eq, isNull } from 'drizzle-orm'
import { trip } from './db/schema.js'

const db = drizzle(process.env.TRIP_DATABASE_URL!);

const app = new Hono();
app.use('*', cors({ origin: '*' }));

const port = process.env.TRIP_ATOM_PORT ? Number(process.env.TRIP_ATOM_PORT) : 3005;

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'healthy', service: 'trip-service' });
});

// POST /trip — create a new trip record on tap-in
app.post('/trip', async (c) => {
  const body = await c.req.json();
  const { card_id, origin, transport_type, tap_in_time, journey_id, is_transfer } = body;

  if (!card_id || !origin || !transport_type || !tap_in_time) {
    return c.json({ code: 400, message: 'card_id, origin, transport_type, tap_in_time are required' }, 400);
  }

  const newTrip = await db.insert(trip).values({
    card_id,
    origin,
    transport_type,
    tap_in_time: new Date(tap_in_time),
    status: 'in_progress',
    journey_id: journey_id ?? null,
    is_transfer: is_transfer ?? false,
  }).returning();

  return c.json({ code: 201, data: newTrip[0] }, 201);
});

// GET /trip/in-progress/:card_id — get current in-progress trip for a card
app.get('/trip/in-progress/:card_id', async (c) => {
  const card_id = c.req.param('card_id');

  const result = await db.select().from(trip).where(
    and(eq(trip.card_id, card_id), eq(trip.status, 'in_progress'))
  );

  if (result.length === 0) {
    return c.json({ code: 404, message: 'No in-progress trip found' }, 404);
  }

  return c.json({ code: 200, data: result[0] });
});

// GET /trip/incomplete/:card_id — get incomplete (no tap-out) trip for a card
app.get('/trip/incomplete/:card_id', async (c) => {
  const card_id = c.req.param('card_id');

  const result = await db.select().from(trip).where(
    and(eq(trip.card_id, card_id), eq(trip.status, 'incomplete'))
  );

  if (result.length === 0) {
    return c.json({ code: 404, message: 'No incomplete trip found' }, 404);
  }

  return c.json({ code: 200, data: result[0] });
});

// GET /trip/continuity/:card_id — check if current trip qualifies as a valid transfer
// Returns the ongoing journey's cumulative distance if valid, or null if new journey
app.get('/trip/continuity/:card_id', async (c) => {
  const card_id = c.req.param('card_id');
  const transport_type = c.req.query('transport_type'); // current tap-in transport
  const tap_in_time = c.req.query('tap_in_time');       // current tap-in time

  if (!transport_type || !tap_in_time) {
    return c.json({ code: 400, message: 'transport_type and tap_in_time are required' }, 400);
  }

  // Get the most recently completed trip for this card
  const result = await db.select().from(trip).where(
    and(eq(trip.card_id, card_id), eq(trip.status, 'completed'))
  );

  if (result.length === 0) {
    return c.json({ code: 200, data: { is_continuation: false } });
  }

  // Sort by tap_out_time descending to get latest
  const lastTrip = result.sort((a, b) =>
    new Date(b.tap_out_time!).getTime() - new Date(a.tap_out_time!).getTime()
  )[0];

  const lastTapOut = new Date(lastTrip.tap_out_time!);
  const currentTapIn = new Date(tap_in_time);
  const diffMinutes = (currentTapIn.getTime() - lastTapOut.getTime()) / 60000;

  // Transfer time limits per fare rules
  const isBusToTrain = lastTrip.transport_type !== 'train' && transport_type === 'train';
  const isTrainToTrain = lastTrip.transport_type === 'train' && transport_type === 'train';
  const maxTransferMinutes = isTrainToTrain ? 15 : 45;

  const is_continuation = diffMinutes <= maxTransferMinutes;

  return c.json({
    code: 200,
    data: {
      is_continuation,
      journey_id: is_continuation ? lastTrip.journey_id : null,
      cumulative_distance_km: is_continuation ? lastTrip.cumulative_distance_km : null,
      previous_trip_id: is_continuation ? lastTrip.trip_id : null,
    }
  });
});

// PUT /trip/:trip_id — update trip on tap-out or settlement
app.put('/trip/:trip_id', async (c) => {
  const trip_id = Number(c.req.param('trip_id'));
  const body = await c.req.json();

  const {
    destination,
    tap_out_time,
    status,
    fare_charged,
    settlement_reason,
    cumulative_distance_km,
    journey_id,
  } = body;

  const updated = await db.update(trip).set({
    ...(destination           !== undefined && { destination }),
    ...(tap_out_time          !== undefined && { tap_out_time: new Date(tap_out_time) }),
    ...(status                !== undefined && { status }),
    ...(fare_charged          !== undefined && { fare_charged }),
    ...(settlement_reason     !== undefined && { settlement_reason }),
    ...(cumulative_distance_km !== undefined && { cumulative_distance_km }),
    ...(journey_id            !== undefined && { journey_id }),
  }).where(eq(trip.trip_id, trip_id)).returning();

  if (updated.length === 0) {
    return c.json({ code: 404, message: 'Trip not found' }, 404);
  }

  return c.json({ code: 200, data: updated[0] });
});

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Trip Service running on http://localhost:${port}`);
});
