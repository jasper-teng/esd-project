import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import Stripe from 'stripe';

// ---------------------------------------------------------------------------
// Payment Gateway — External Service (Stripe Sandbox)
//
// This service is the Payment Gateway boundary described in the project spec.
// It is called by Handle Transit (composite service) for:
//   - Auto top-up when a card balance is below $5 (Scenario 1)
//   - Manual top-up via PayNow QR (supplementary)
//
// Architecture position: External Service (not an Atomic Service)
// Called by: Handle Transit composite service
// Calls:     Stripe API only
//
// SWAP sk_test_ → sk_live_ and whsec_ for production credentials
// ---------------------------------------------------------------------------

// [STRIPE] Initialise Stripe client with test secret key
// SWAP: sk_test_... → sk_live_... for production
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

const PORT = process.env.PAYMENT_GATEWAY_PORT ? Number(process.env.PAYMENT_GATEWAY_PORT) : 3010;

const app = new Hono();
app.use('*', cors({ origin: '*' }));

// ---------------------------------------------------------------------------
// In-memory store — holds saved Stripe customer/payment method per card_id
// In production: Handle Transit passes stripe_customer_id + payment_method_id
// from wherever your team persists them (Wallet Service DB, Card Service DB, etc.)
// ---------------------------------------------------------------------------
const savedMethods = new Map<string, {
  stripe_customer_id: string;
  stripe_payment_method_id: string;
}>();

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
// MANUAL TOP-UP — PayNow QR code
// POST /topup/paynow
// Called by: Handle Transit (or directly from frontend for testing)
//
// Body:
//   card_id    string  — EZ-Link card identifier (stored in intent metadata)
//   amount_sgd number  — top-up amount in SGD (e.g. 20 for $20.00)
//
// Returns:
//   payment_intent_id  string  — used to poll status
//   qr_code_image_url  string  — PNG image URL to display to user
//   qr_data            string  — raw QR string (fallback if image fails)
//   reference          string  — PayNow reference number
//   expires_at         number  — Unix timestamp when QR expires
//
// Flow:
//   1. Create PaymentIntent in SGD with payment_method_types: ['paynow']
//   2. Confirm server-side — Stripe returns QR in next_action.paynow_display_qr_code
//   3. Frontend displays QR; user scans with banking app
//   4. Stripe fires payment_intent.succeeded webhook → Handle Transit credits wallet
// ---------------------------------------------------------------------------
app.post('/topup/paynow', async (c) => {
  try {
    const { card_id, amount_sgd } = await c.req.json<{ card_id: string; amount_sgd: number }>();

    if (!card_id || !amount_sgd || amount_sgd <= 0) {
      return c.json({ error: 'card_id and a positive amount_sgd are required' }, 400);
    }

    // [STRIPE] Step 1 — Create PaymentIntent for PayNow in SGD
    // SWAP: update metadata fields to match your card schema if needed
    const intent = await stripe.paymentIntents.create({
      amount:   Math.round(amount_sgd * 100), // Stripe uses smallest currency unit (cents)
      currency: 'sgd',
      payment_method_types: ['paynow'],
      metadata: {
        card_id,
        amount_sgd: String(amount_sgd),
        source: 'manual_topup',
      },
    });

    // [STRIPE] Step 2 — Confirm intent to generate the PayNow QR code
    // PayNow requires inline payment_method_data (no reusable PM ID exists for paynow)
    const confirmed = await stripe.paymentIntents.confirm(intent.id, {
      payment_method_data: { type: 'paynow' },
    } as any);

    const qr = (confirmed.next_action as any)?.paynow_display_qr_code;

    return c.json({
      payment_intent_id: confirmed.id,
      status:            confirmed.status,      // 'requires_action' while awaiting payment
      qr_code_image_url: qr?.image_url_png ?? null,
      qr_code_svg_url:   qr?.image_url_svg ?? null,
      qr_data:           qr?.data ?? null,
      hosted_url:        qr?.hosted_instructions_url ?? null,
      reference:         qr?.reference ?? null,
      expires_at:        qr?.expires_at ?? null,
    });

  } catch (err: unknown) {
    console.error('[STRIPE] /topup/paynow error:', err);
    return c.json({ error: err instanceof Error ? err.message : 'Stripe error' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POLL PAYMENT STATUS
// GET /topup/status/:payment_intent_id
// Called by: Frontend (polls every 2s after displaying PayNow QR)
//
// Returns:
//   status     string  — 'requires_action' | 'processing' | 'succeeded' | 'canceled'
//   amount_sgd number  — original top-up amount
// ---------------------------------------------------------------------------
app.get('/topup/status/:payment_intent_id', async (c) => {
  try {
    // [STRIPE] Retrieve live PaymentIntent status
    const intent = await stripe.paymentIntents.retrieve(c.req.param('payment_intent_id'));
    return c.json({
      payment_intent_id: intent.id,
      status:            intent.status,
      amount_sgd:        intent.amount / 100,
      card_id:           intent.metadata.card_id,
    });
  } catch (err: unknown) {
    return c.json({ error: err instanceof Error ? err.message : 'Stripe error' }, 500);
  }
});

// ---------------------------------------------------------------------------
// AUTO TOP-UP — charge saved payment method (card / bank debit)
// POST /topup/auto
// Called by: Handle Transit when tap-in balance < $5 and auto_topup_enabled = true
//
// Body:
//   card_id              string  — EZ-Link card identifier
//   amount_sgd           number  — amount to charge (default $10)
//   stripe_customer_id   string  — Stripe Customer ID (stored in Wallet/Card service)
//   stripe_payment_method_id  string  — saved payment method ID
//
// Returns:
//   success            boolean
//   payment_intent_id  string
//   amount_sgd         number
//
// NOTE: PayNow does NOT support off-session/recurring charges.
//       Auto top-up uses a saved card or bank debit only.
//
// If stripe_customer_id / stripe_payment_method_id are not passed in,
// this service checks its own in-memory store (set via POST /setup-payment-method).
// ---------------------------------------------------------------------------
app.post('/topup/auto', async (c) => {
  try {
    const body = await c.req.json<{
      card_id: string;
      amount_sgd: number;
      stripe_customer_id?: string;
      stripe_payment_method_id?: string;
    }>();

    const { card_id, amount_sgd } = body;

    // Resolve customer + payment method — from request body or in-memory store
    let stripe_customer_id       = body.stripe_customer_id;
    let stripe_payment_method_id = body.stripe_payment_method_id;

    if (!stripe_customer_id || !stripe_payment_method_id) {
      const saved = savedMethods.get(card_id);
      if (!saved) {
        return c.json({
          error: 'no_saved_payment_method',
          message: 'No saved card or bank debit found for this card. Set one up via POST /setup-payment-method.',
        }, 402);
      }
      stripe_customer_id       = saved.stripe_customer_id;
      stripe_payment_method_id = saved.stripe_payment_method_id;
    }

    // [STRIPE] Create + immediately confirm PaymentIntent off-session
    // off_session: true  — no customer interaction required
    // confirm: true      — charge happens right now
    // SWAP keys for production
    const intent = await stripe.paymentIntents.create({
      amount:         Math.round(amount_sgd * 100),
      currency:       'sgd',
      customer:       stripe_customer_id,
      payment_method: stripe_payment_method_id,
      payment_method_types: ['card'], // PayNow excluded — no recurring support
      off_session: true,
      confirm:     true,
      metadata: {
        card_id,
        amount_sgd: String(amount_sgd),
        source: 'auto_topup',
      },
    });

    if (intent.status !== 'succeeded') {
      return c.json({ error: `Unexpected status: ${intent.status}` }, 400);
    }

    return c.json({
      success: true,
      payment_intent_id: intent.id,
      amount_sgd,
    });

  } catch (err: unknown) {
    console.error('[STRIPE] /topup/auto error:', err);
    if (err instanceof Stripe.errors.StripeCardError) {
      return c.json({ error: err.message, decline_code: err.decline_code }, 402);
    }
    return c.json({ error: err instanceof Error ? err.message : 'Stripe error' }, 500);
  }
});

// ---------------------------------------------------------------------------
// SAVE PAYMENT METHOD — attach a card/bank debit for auto top-up
// POST /setup-payment-method
//
// Body:
//   card_id             string  — EZ-Link card identifier
//   payment_method_id   string  — Stripe payment method ID
//                                 Test mode: use 'pm_card_visa' (always succeeds)
//
// In production: payment_method_id comes from Stripe Elements (SetupIntent flow in UI)
// For testing:   pass 'pm_card_visa' directly
// ---------------------------------------------------------------------------
app.post('/setup-payment-method', async (c) => {
  try {
    const { card_id, payment_method_id } = await c.req.json<{
      card_id: string;
      payment_method_id: string;
    }>();

    // Check if a customer already exists for this card
    const existing = savedMethods.get(card_id);
    let customerId: string;

    if (existing?.stripe_customer_id) {
      customerId = existing.stripe_customer_id;
    } else {
      // [STRIPE] Create a Stripe Customer — acts as a container for payment methods
      const customer = await stripe.customers.create({
        description: `SimplyGo EZ-Link card ${card_id}`,
        metadata:    { card_id },
      });
      customerId = customer.id;
    }

    // [STRIPE] Attach the payment method to this customer
    await stripe.paymentMethods.attach(payment_method_id, { customer: customerId });

    // [STRIPE] Set as default for future off-session charges
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: payment_method_id },
    });

    // Persist in memory (in production: your Handle Transit or Wallet service stores these)
    savedMethods.set(card_id, {
      stripe_customer_id:      customerId,
      stripe_payment_method_id: payment_method_id,
    });

    return c.json({ success: true, stripe_customer_id: customerId, payment_method_id });

  } catch (err: unknown) {
    console.error('[STRIPE] /setup-payment-method error:', err);
    return c.json({ error: err instanceof Error ? err.message : 'Stripe error' }, 500);
  }
});

// ---------------------------------------------------------------------------
// STRIPE WEBHOOK — Stripe calls this URL when a payment event occurs
// POST /webhook
//
// Set this URL in Stripe Dashboard → Developers → Webhooks
// Local dev: stripe listen --forward-to localhost:3010/webhook
//
// On payment_intent.succeeded:
//   — Handle Transit should credit the wallet via Wallet Service
//   — This webhook fires for PayNow top-ups only (auto top-up is synchronous)
//
// IMPORTANT: Raw body required for signature verification — do NOT parse JSON first
// SWAP: STRIPE_WEBHOOK_SECRET for production webhook signing secret
// ---------------------------------------------------------------------------
app.post('/webhook', async (c) => {
  const sig    = c.req.header('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET!;

  if (!sig) return c.json({ error: 'Missing stripe-signature header' }, 400);

  const rawBody = await c.req.text(); // must be raw string, not parsed

  let event: Stripe.Event;
  try {
    // [STRIPE] Verify webhook came from Stripe, not a forged request
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err: unknown) {
    console.error('[STRIPE] Webhook signature failed:', err instanceof Error ? err.message : err);
    return c.json({ error: 'Webhook signature verification failed' }, 400);
  }

  console.log(`[STRIPE] Webhook received: ${event.type}`);

  switch (event.type) {

    case 'payment_intent.succeeded': {
      const intent  = event.data.object as Stripe.PaymentIntent;
      const card_id = intent.metadata.card_id;
      const amount  = intent.amount / 100;
      const source  = intent.metadata.source;

      console.log(`[STRIPE] payment_intent.succeeded — card_id=${card_id} amount=$${amount} source=${source}`);

      // TODO: Handle Transit should call Wallet Service here to credit balance
      // [BACKEND] POST /wallets/{card_id}/credit  { amount: ${amount} }
      // Wallet Service endpoint: POST /wallets/{card_id}/credit
      // This is Handle Transit's responsibility per the architecture
      break;
    }

    case 'payment_intent.payment_failed': {
      const intent = event.data.object as Stripe.PaymentIntent;
      console.warn(`[STRIPE] Payment failed — card ${intent.metadata.card_id}: ${intent.last_payment_error?.message}`);
      break;
    }

    default:
      console.log(`[STRIPE] Unhandled event: ${event.type}`);
  }

  return c.json({ received: true });
});

// ---------------------------------------------------------------------------
// TEST ONLY — simulate PayNow payment without scanning the QR code
// POST /test/simulate-paynow-success
// Body: { payment_intent_id: string }
//
// Use this when you don't have Stripe CLI running to forward webhooks.
// Returns the card_id and amount so the caller can credit the wallet.
// REMOVE THIS ENDPOINT IN PRODUCTION
// ---------------------------------------------------------------------------
app.post('/test/simulate-paynow-success', async (c) => {
  if (process.env.NODE_ENV === 'production') {
    return c.json({ error: 'Not available in production' }, 403);
  }
  try {
    const { payment_intent_id } = await c.req.json<{ payment_intent_id: string }>();

    // [STRIPE TEST] Retrieve intent to read metadata
    const intent = await stripe.paymentIntents.retrieve(payment_intent_id);

    return c.json({
      success:           true,
      simulated:         true,
      card_id:           intent.metadata.card_id,
      amount_sgd:        intent.amount / 100,
      payment_intent_id: intent.id,
      // Caller (frontend / Handle Transit) should credit wallet with amount_sgd
    });
  } catch (err: unknown) {
    return c.json({ error: err instanceof Error ? err.message : 'Stripe error' }, 500);
  }
});

// ---------------------------------------------------------------------------
// TEST ONLY — view saved payment methods in memory
// GET /test/saved-methods
// REMOVE THIS ENDPOINT IN PRODUCTION
// ---------------------------------------------------------------------------
app.get('/test/saved-methods', (c) => {
  if (process.env.NODE_ENV === 'production') {
    return c.json({ error: 'Not available in production' }, 403);
  }
  return c.json(Object.fromEntries(savedMethods));
});

// ---------------------------------------------------------------------------
// START SERVER
// ---------------------------------------------------------------------------
serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║       Payment Gateway — SimplyGo ESD         ║`);
  console.log(`╠══════════════════════════════════════════════╣`);
  console.log(`║  URL:    http://localhost:${PORT}               ║`);
  console.log(`║  Stripe: ${process.env.STRIPE_SECRET_KEY?.startsWith('sk_live') ? '🔴 LIVE MODE' : '🟡 TEST MODE (sandbox)  '}         ║`);
  console.log(`╠══════════════════════════════════════════════╣`);
  console.log(`║  Endpoints:                                  ║`);
  console.log(`║  POST /topup/paynow         Manual top-up   ║`);
  console.log(`║  GET  /topup/status/:id     Poll status      ║`);
  console.log(`║  POST /topup/auto           Auto top-up      ║`);
  console.log(`║  POST /setup-payment-method Save card        ║`);
  console.log(`║  POST /webhook              Stripe events    ║`);
  console.log(`║  POST /test/simulate-paynow-success [TEST]  ║`);
  console.log(`╚══════════════════════════════════════════════╝\n`);
});
