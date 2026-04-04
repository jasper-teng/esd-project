import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import Stripe from 'stripe';

// ---------------------------------------------------------------------------
// Payment Gateway — External Service (Stripe Sandbox)
//
// Architecture: External Service called by Handle Transit composite service
// Handles: card-based manual top-up, auto top-up, saved payment methods
// Does NOT depend on any Atomic microservice — fully self-contained
// ---------------------------------------------------------------------------

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

const PORT = process.env.PAYMENT_GATEWAY_PORT ? Number(process.env.PAYMENT_GATEWAY_PORT) : 3010;
const app = new Hono();
app.use('*', cors({ origin: '*' }));

// ---------------------------------------------------------------------------
// Wallet service integration — credit balance after successful charge
// ---------------------------------------------------------------------------
const WALLET_URL = process.env.WALLET_SERVICE_URL ?? 'http://localhost:3002';

async function creditWallet(travel_card_id: string, amount_sgd: number): Promise<void> {
  const cardId = parseInt(travel_card_id);
  if (isNaN(cardId)) return; // skip for non-numeric IDs (mock data)
  try {
    await fetch(`${WALLET_URL}/topup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_id: cardId, amount: amount_sgd }),
    });
  } catch (err) {
    console.warn('[WALLET] Failed to credit wallet:', err instanceof Error ? err.message : err);
  }
}

// ---------------------------------------------------------------------------
// In-memory stores (no DB dependency — swap with Wallet/Card service DB in prod)
// ---------------------------------------------------------------------------

// userId → Stripe Customer ID
const userCustomers = new Map<string, string>();

// `${userId}:${travelCardId}` → auto top-up config
type AutoTopupConfig = {
  enabled: boolean;
  threshold_sgd: number;     // trigger top-up when balance < this
  topup_amount_sgd: number;  // amount to charge
  payment_method_id: string; // which saved card to charge
};
const autoTopupSettings = new Map<string, AutoTopupConfig>();

// ---------------------------------------------------------------------------
// Helper — ensure a Stripe Customer exists for a user, create if not
// ---------------------------------------------------------------------------
async function ensureCustomer(userId: string): Promise<string> {
  const existing = userCustomers.get(userId);
  if (existing) return existing;
  const customer = await stripe.customers.create({
    description: `SimplyGo user ${userId}`,
    metadata: { user_id: userId },
  });
  userCustomers.set(userId, customer.id);
  return customer.id;
}

// ---------------------------------------------------------------------------
// HEALTH CHECK
// GET /
// ---------------------------------------------------------------------------
app.get('/', (c) => c.json({
  service: 'payment-gateway',
  status: 'ok',
  stripe_mode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_live') ? 'LIVE 🔴' : 'TEST 🟡',
}));

// ---------------------------------------------------------------------------
// SAVE CARD — Step 1: Create a SetupIntent
// POST /setup-intent
// Body: { user_id: string }
// Returns: { client_secret } — frontend uses this with Stripe Elements to save a card
//
// Flow:
//   1. Backend creates SetupIntent (this endpoint)
//   2. Frontend mounts Stripe CardElement, user enters card details
//   3. Frontend calls stripe.confirmCardSetup(client_secret, { payment_method: { card: cardElement } })
//   4. Card is saved to Stripe Customer — call GET /payment-methods/:userId to see it
// ---------------------------------------------------------------------------
app.post('/setup-intent', async (c) => {
  try {
    const { user_id } = await c.req.json<{ user_id: string }>();
    if (!user_id) return c.json({ error: 'user_id required' }, 400);

    const customerId = await ensureCustomer(user_id);

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      metadata: { user_id },
    });

    return c.json({
      client_secret: setupIntent.client_secret,
      setup_intent_id: setupIntent.id,
    });
  } catch (err: unknown) {
    console.error('[STRIPE] /setup-intent error:', err);
    return c.json({ error: err instanceof Error ? err.message : 'Stripe error' }, 500);
  }
});

// ---------------------------------------------------------------------------
// LIST SAVED CARDS
// GET /payment-methods/:userId
// Returns all saved cards for this user
// ---------------------------------------------------------------------------
app.get('/payment-methods/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const customerId = userCustomers.get(userId);

    if (!customerId) return c.json({ payment_methods: [] });

    const pms = await stripe.paymentMethods.list({ customer: customerId, type: 'card' });

    return c.json({
      payment_methods: pms.data.map((pm) => ({
        id: pm.id,
        brand: pm.card?.brand ?? 'unknown',
        last4: pm.card?.last4 ?? '????',
        exp_month: pm.card?.exp_month,
        exp_year: pm.card?.exp_year,
      })),
    });
  } catch (err: unknown) {
    return c.json({ error: err instanceof Error ? err.message : 'Stripe error' }, 500);
  }
});

// ---------------------------------------------------------------------------
// DELETE SAVED CARD
// DELETE /payment-methods/:userId/:pmId
// Detaches the payment method from the Stripe Customer
// ---------------------------------------------------------------------------
app.delete('/payment-methods/:userId/:pmId', async (c) => {
  try {
    await stripe.paymentMethods.detach(c.req.param('pmId'));
    return c.json({ success: true });
  } catch (err: unknown) {
    return c.json({ error: err instanceof Error ? err.message : 'Stripe error' }, 500);
  }
});

// ---------------------------------------------------------------------------
// MANUAL TOP-UP — new card (step 1: create intent, frontend confirms)
// POST /topup/intent
// Body: { user_id, travel_card_id, amount_sgd, save_card? }
// Returns: { client_secret, payment_intent_id }
//
// Flow:
//   1. Backend creates PaymentIntent (this endpoint)
//   2. Frontend calls stripe.confirmCardPayment(client_secret, { payment_method: { card: cardElement } })
//   3. If save_card = true, card is saved for future use (setup_future_usage: 'off_session')
//   4. On success, credit the travel card balance
// ---------------------------------------------------------------------------
app.post('/topup/intent', async (c) => {
  try {
    const body = await c.req.json<{
      user_id: string;
      travel_card_id: string;
      amount_sgd: number;
      save_card?: boolean;
    }>();

    if (!body.user_id || !body.travel_card_id || !body.amount_sgd || body.amount_sgd <= 0) {
      return c.json({ error: 'user_id, travel_card_id, and a positive amount_sgd are required' }, 400);
    }

    const customerId = await ensureCustomer(body.user_id);

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(body.amount_sgd * 100),
      currency: 'sgd',
      customer: customerId,
      payment_method_types: ['card'],
      // If save_card is true, save this payment method for future off-session charges
      setup_future_usage: body.save_card ? 'off_session' : undefined,
      metadata: {
        user_id: body.user_id,
        travel_card_id: body.travel_card_id,
        amount_sgd: String(body.amount_sgd),
        source: 'manual_topup_new_card',
      },
    });

    return c.json({
      client_secret: intent.client_secret,
      payment_intent_id: intent.id,
    });
  } catch (err: unknown) {
    console.error('[STRIPE] /topup/intent error:', err);
    return c.json({ error: err instanceof Error ? err.message : 'Stripe error' }, 500);
  }
});

// ---------------------------------------------------------------------------
// MANUAL TOP-UP — with saved card (off-session, no card entry needed)
// POST /topup/saved
// Body: { user_id, travel_card_id, amount_sgd, payment_method_id }
// Returns: { success, payment_intent_id, amount_sgd }
//
// Uses off_session: true — no customer interaction needed
// ---------------------------------------------------------------------------
app.post('/topup/saved', async (c) => {
  try {
    const { user_id, travel_card_id, amount_sgd, payment_method_id } = await c.req.json<{
      user_id: string;
      travel_card_id: string;
      amount_sgd: number;
      payment_method_id: string;
    }>();

    const customerId = userCustomers.get(user_id);
    if (!customerId) {
      return c.json({ error: 'No saved cards found for this user. Add a card first.' }, 400);
    }

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount_sgd * 100),
      currency: 'sgd',
      customer: customerId,
      payment_method: payment_method_id,
      payment_method_types: ['card'],
      off_session: true,
      confirm: true,
      metadata: {
        user_id,
        travel_card_id,
        amount_sgd: String(amount_sgd),
        source: 'manual_topup_saved_card',
      },
    });

    if (intent.status !== 'succeeded') {
      return c.json({ error: `Unexpected status: ${intent.status}` }, 400);
    }

    // Credit wallet balance in Wallet atomic service
    await creditWallet(travel_card_id, amount_sgd);

    return c.json({ success: true, payment_intent_id: intent.id, amount_sgd });

  } catch (err: unknown) {
    console.error('[STRIPE] /topup/saved error:', err);
    if (err instanceof Stripe.errors.StripeCardError) {
      return c.json({ error: err.message, decline_code: err.decline_code }, 402);
    }
    return c.json({ error: err instanceof Error ? err.message : 'Stripe error' }, 500);
  }
});

// ---------------------------------------------------------------------------
// AUTO TOP-UP SETTINGS — get
// GET /auto-topup/:userId/:travelCardId
// ---------------------------------------------------------------------------
app.get('/auto-topup/:userId/:travelCardId', (c) => {
  const key = `${c.req.param('userId')}:${c.req.param('travelCardId')}`;
  const config = autoTopupSettings.get(key);
  return c.json(config ?? {
    enabled: false,
    threshold_sgd: 5,
    topup_amount_sgd: 20,
    payment_method_id: '',
  });
});

// ---------------------------------------------------------------------------
// AUTO TOP-UP SETTINGS — update
// PUT /auto-topup/:userId/:travelCardId
// Body: { enabled, threshold_sgd, topup_amount_sgd, payment_method_id }
// ---------------------------------------------------------------------------
app.put('/auto-topup/:userId/:travelCardId', async (c) => {
  try {
    const key = `${c.req.param('userId')}:${c.req.param('travelCardId')}`;
    const body = await c.req.json<AutoTopupConfig>();
    autoTopupSettings.set(key, body);
    return c.json({ success: true, config: body });
  } catch (err: unknown) {
    return c.json({ error: err instanceof Error ? err.message : 'error' }, 500);
  }
});

// ---------------------------------------------------------------------------
// AUTO TOP-UP — trigger (called by Handle Transit on tap-in)
// POST /topup/auto
// Body: { user_id, travel_card_id, current_balance_sgd }
// Returns: { triggered, success?, amount_sgd?, payment_intent_id?, reason? }
//
// Handle Transit calls this when processing a tap-in event.
// If balance < threshold and auto top-up is enabled, charges the saved card.
// ---------------------------------------------------------------------------
app.post('/topup/auto', async (c) => {
  try {
    const { user_id, travel_card_id, current_balance_sgd } = await c.req.json<{
      user_id: string;
      travel_card_id: string;
      current_balance_sgd: number;
    }>();

    const key = `${user_id}:${travel_card_id}`;
    const config = autoTopupSettings.get(key);

    if (!config?.enabled) {
      return c.json({ triggered: false, reason: 'auto_topup_disabled' });
    }
    if (current_balance_sgd >= config.threshold_sgd) {
      return c.json({ triggered: false, reason: 'balance_above_threshold' });
    }
    if (!config.payment_method_id) {
      return c.json({ triggered: false, reason: 'no_payment_method_configured' });
    }

    const customerId = userCustomers.get(user_id);
    if (!customerId) {
      return c.json({ triggered: false, reason: 'no_stripe_customer_found' });
    }

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(config.topup_amount_sgd * 100),
      currency: 'sgd',
      customer: customerId,
      payment_method: config.payment_method_id,
      payment_method_types: ['card'],
      off_session: true,
      confirm: true,
      metadata: {
        user_id,
        travel_card_id,
        amount_sgd: String(config.topup_amount_sgd),
        source: 'auto_topup',
      },
    });

    const succeeded = intent.status === 'succeeded';

    // Credit wallet balance if charge succeeded
    if (succeeded) {
      await creditWallet(travel_card_id, config.topup_amount_sgd);
    }

    return c.json({
      triggered: true,
      success: succeeded,
      payment_intent_id: intent.id,
      amount_sgd: config.topup_amount_sgd,
    });

  } catch (err: unknown) {
    console.error('[STRIPE] /topup/auto error:', err);
    if (err instanceof Stripe.errors.StripeCardError) {
      return c.json({ triggered: true, success: false, error: err.message, decline_code: err.decline_code }, 402);
    }
    return c.json({ error: err instanceof Error ? err.message : 'Stripe error' }, 500);
  }
});

// ---------------------------------------------------------------------------
// STRIPE WEBHOOK
// POST /webhook
// stripe listen --forward-to localhost:3010/webhook
// ---------------------------------------------------------------------------
app.post('/webhook', async (c) => {
  const sig    = c.req.header('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET!;

  if (!sig) return c.json({ error: 'Missing stripe-signature header' }, 400);

  const rawBody = await c.req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err: unknown) {
    console.error('[STRIPE] Webhook signature failed:', err instanceof Error ? err.message : err);
    return c.json({ error: 'Webhook signature verification failed' }, 400);
  }

  console.log(`[STRIPE] Webhook: ${event.type}`);

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const intent = event.data.object as Stripe.PaymentIntent;
      console.log(`[STRIPE] payment_intent.succeeded — user=${intent.metadata.user_id} card=${intent.metadata.travel_card_id} amount=$${intent.amount / 100} source=${intent.metadata.source}`);
      // Handle Transit should credit Wallet Service here
      break;
    }
    case 'setup_intent.succeeded': {
      const si = event.data.object as Stripe.SetupIntent;
      console.log(`[STRIPE] setup_intent.succeeded — user=${si.metadata?.user_id} pm=${si.payment_method}`);
      break;
    }
    case 'payment_intent.payment_failed': {
      const intent = event.data.object as Stripe.PaymentIntent;
      console.warn(`[STRIPE] Payment failed — ${intent.last_payment_error?.message}`);
      break;
    }
    default:
      break;
  }

  return c.json({ received: true });
});

// ---------------------------------------------------------------------------
// TEST — view in-memory state
// GET /test/state
// ---------------------------------------------------------------------------
app.get('/test/state', (c) => {
  if (process.env.NODE_ENV === 'production') return c.json({ error: 'Not available in production' }, 403);
  return c.json({
    user_customers: Object.fromEntries(userCustomers),
    auto_topup_settings: Object.fromEntries(autoTopupSettings),
  });
});

// ---------------------------------------------------------------------------
// START SERVER
// ---------------------------------------------------------------------------
serve({ fetch: app.fetch, port: PORT }, () => {
  const mode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_live') ? '🔴 LIVE MODE' : '🟡 TEST MODE (sandbox)';
  console.log(`\n╔══════════════════════════════════════════════════╗`);
  console.log(`║        Payment Gateway — SimplyGo ESD            ║`);
  console.log(`╠══════════════════════════════════════════════════╣`);
  console.log(`║  URL:    http://localhost:${PORT}                 ║`);
  console.log(`║  Stripe: ${mode}                  ║`);
  console.log(`╠══════════════════════════════════════════════════╣`);
  console.log(`║  POST /setup-intent           Save a card         ║`);
  console.log(`║  GET  /payment-methods/:uid   List saved cards    ║`);
  console.log(`║  DELETE /payment-methods/:u/:pm  Remove card      ║`);
  console.log(`║  POST /topup/intent           New card top-up     ║`);
  console.log(`║  POST /topup/saved            Saved card top-up   ║`);
  console.log(`║  GET  /auto-topup/:u/:card    Get settings        ║`);
  console.log(`║  PUT  /auto-topup/:u/:card    Update settings     ║`);
  console.log(`║  POST /topup/auto             Handle Transit call  ║`);
  console.log(`║  POST /webhook                Stripe events       ║`);
  console.log(`║  GET  /test/state             Debug state [TEST]  ║`);
  console.log(`╚══════════════════════════════════════════════════╝\n`);
});
