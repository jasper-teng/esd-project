import pg from 'pg'

const { Client } = pg

const AUTO_TOPUP_URL = process.env.AUTO_TOPUP_URL ?? 'http://auto_topup_composite:4004'
const AUTO_TOPUP_AMOUNT = 20.00 // SGD amount to top up when triggered

const TRIGGER_SQL = `
  CREATE OR REPLACE FUNCTION notify_low_balance()
  RETURNS TRIGGER AS $$
  BEGIN
    IF NEW.balance::numeric < 5.00 AND OLD.balance::numeric >= 5.00 THEN
      PERFORM pg_notify(
        'low_balance',
        json_build_object('card_id', NEW.card_id, 'balance', NEW.balance)::text
      );
    END IF;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS wallet_low_balance_trigger ON wallets;

  CREATE TRIGGER wallet_low_balance_trigger
    AFTER UPDATE ON wallets
    FOR EACH ROW
    EXECUTE FUNCTION notify_low_balance();
`

export async function startLowBalanceListener() {
  const client = new Client({ connectionString: process.env.WALLET_DATABASE_URL })
  await client.connect()

  // Install the trigger function + trigger on startup
  await client.query(TRIGGER_SQL)
  console.log('[listener] DB trigger installed: wallet_low_balance_trigger')

  // Subscribe to the low_balance channel
  await client.query('LISTEN low_balance')
  console.log('[listener] LISTEN low_balance — waiting for notifications...')

  client.on('notification', async (msg) => {
    if (msg.channel !== 'low_balance' || !msg.payload) return

    let payload: { card_id: string; balance: string }
    try {
      payload = JSON.parse(msg.payload)
    } catch {
      console.error('[listener] Failed to parse notification payload:', msg.payload)
      return
    }

    const { card_id, balance } = payload
    console.log(`[listener] Low balance detected — card_id=${card_id}, balance=${balance}`)

    // Check if auto top-up is enabled for this wallet
    const walletCheck = await client.query(
      'SELECT auto_topup_enabled FROM wallets WHERE card_id = $1',
      [card_id]
    )
    if (!walletCheck.rows[0]?.auto_topup_enabled) {
      console.log(`[listener] Auto top-up disabled for card_id=${card_id}, skipping`)
      return
    }

    try {
      const res = await fetch(`${AUTO_TOPUP_URL}/auto-topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_id,
          amount: AUTO_TOPUP_AMOUNT,
          payment_method: 'saved',
        }),
      })
      const data = await res.json()
      if (res.ok) {
        console.log(`[listener] Auto top-up triggered for card_id=${card_id}:`, data)
      } else {
        console.warn(`[listener] Auto top-up failed for card_id=${card_id}:`, data)
      }
    } catch (err) {
      console.error(`[listener] Error calling auto-topup composite for card_id=${card_id}:`, err)
    }
  })

  client.on('error', (err) => {
    console.error('[listener] pg client error:', err)
  })
}
