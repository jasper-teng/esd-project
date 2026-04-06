import amqplib from 'amqplib'

const RABBITMQ_URL  = process.env.RABBITMQ_URL        || 'amqp://guest:guest@rabbitmq:5672/'
const PUBLISH_QUEUE = process.env.QUEUE_NAME           || 'notifications'
const CONSUME_QUEUE = process.env.CARD_SHIPPED_QUEUE   || 'card_shipped'

// ── Publish ──────────────────────────────────────────────────────────────────

export async function publishNotification(payload: object): Promise<void> {
  let connection
  try {
    connection = await amqplib.connect(RABBITMQ_URL)
    const channel = await connection.createChannel()
    await channel.assertQueue(PUBLISH_QUEUE, { durable: true })
    channel.sendToQueue(
      PUBLISH_QUEUE,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true }
    )
    console.log('[AMQP] Published notification:', payload)
    await channel.close()
  } catch (err) {
    console.error('[AMQP] Failed to publish notification:', err)
  } finally {
    if (connection) await connection.close()
  }
}

// ── Consume ───────────────────────────────────────────────────────────────────
// Subscribes to the card_shipped queue. Retries up to 10 times with a 3s delay
// so that the service survives RabbitMQ slow-starts in Docker Compose.

export async function startCardShippedConsumer(
  handler: (payload: { card_id: string; concession_type: string }) => Promise<void>
): Promise<void> {
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      const connection = await amqplib.connect(RABBITMQ_URL)
      const channel = await connection.createChannel()
      await channel.assertQueue(CONSUME_QUEUE, { durable: true })
      channel.prefetch(1)
      console.log(`[AMQP] Subscribed to queue: ${CONSUME_QUEUE}`)

      channel.consume(CONSUME_QUEUE, async (msg) => {
        if (!msg) return
        try {
          const payload = JSON.parse(msg.content.toString())
          await handler(payload)
          channel.ack(msg)
        } catch (err) {
          console.error('[AMQP] Error processing card_shipped message:', err)
          channel.nack(msg, false, false) // discard — do not requeue
        }
      })

      return // connected successfully
    } catch (err) {
      console.error(`[AMQP] Consumer connect attempt ${attempt}/10 failed:`, err)
      if (attempt < 10) await new Promise(r => setTimeout(r, 3000))
    }
  }
  console.error('[AMQP] Could not connect consumer after 10 attempts — interim refund AMQP trigger disabled')
}
