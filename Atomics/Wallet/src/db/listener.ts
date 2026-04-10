import pg from 'pg'
import amqplib from 'amqplib'

const { Client } = pg

const RABBITMQ_URL      = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@rabbitmq:5672/'
const AUTO_TOPUP_QUEUE  = 'auto_topup'
const AUTO_TOPUP_AMOUNT = 20.00

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

async function publishAutoTopup(payload: object): Promise<void> {
  let connection
  try {
    connection = await amqplib.connect(RABBITMQ_URL)
    const channel = await connection.createChannel()
    await channel.assertQueue(AUTO_TOPUP_QUEUE, { durable: true })
    channel.sendToQueue(
      AUTO_TOPUP_QUEUE,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true }
    )
    console.log(`[listener] Published to AMQP queue '${AUTO_TOPUP_QUEUE}':`, payload)
    await channel.close()
  } catch (err) {
    console.error('[listener] Failed to publish to AMQP:', err)
  } finally {
    if (connection) await connection.close()
  }
}

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

    // Publish to AMQP — Manage Auto-Top-up composite will consume this
    await publishAutoTopup({
      card_id,
      amount: AUTO_TOPUP_AMOUNT,
      payment_method: 'saved',
    })
  })

  client.on('error', (err) => {
    console.error('[listener] pg client error:', err)
  })
}
