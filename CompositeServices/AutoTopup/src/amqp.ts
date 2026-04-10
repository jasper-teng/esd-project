import amqplib, { Connection, Channel, ConsumeMessage } from 'amqplib'

const RABBITMQ_URL     = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@rabbitmq:5672/'
const NOTIFY_QUEUE     = process.env.QUEUE_NAME   ?? 'notifications'
const AUTO_TOPUP_QUEUE = 'auto_topup'

export async function publishNotification(payload: object): Promise<void> {
  let connection: Connection | undefined
  try {
    connection = await amqplib.connect(RABBITMQ_URL) as unknown as Connection
    const channel: Channel = await (connection as any).createChannel()
    await channel.assertQueue(NOTIFY_QUEUE, { durable: true })
    channel.sendToQueue(
      NOTIFY_QUEUE,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true }
    )
    console.log(`[AMQP] Published notification:`, payload)
    await channel.close()
  } catch (err) {
    console.error('[AMQP] Failed to publish notification:', err)
  } finally {
    if (connection) await (connection as any).close()
  }
}

type AutoTopupHandler = (payload: { card_id: string; amount: number; payment_method: string }) => Promise<void>

export async function startAutoTopupConsumer(handler: AutoTopupHandler): Promise<void> {
  const connectWithRetry = async (): Promise<any> => {
    while (true) {
      try {
        const conn = await amqplib.connect(RABBITMQ_URL)
        console.log('[AMQP] Connected to RabbitMQ — consuming auto_topup queue')
        return conn
      } catch {
        console.warn('[AMQP] RabbitMQ not ready, retrying in 5s...')
        await new Promise(r => setTimeout(r, 5000))
      }
    }
  }

  const connection = await connectWithRetry()
  const channel: Channel = await connection.createChannel()
  await channel.assertQueue(AUTO_TOPUP_QUEUE, { durable: true })
  await channel.prefetch(1)

  channel.consume(AUTO_TOPUP_QUEUE, async (msg: ConsumeMessage | null) => {
    if (!msg) return
    try {
      const payload = JSON.parse(msg.content.toString())
      console.log('[AMQP] Received auto_topup message:', payload)
      await handler(payload)
      channel.ack(msg)
    } catch (err) {
      console.error('[AMQP] Failed to process auto_topup message:', err)
      channel.nack(msg, false, false)
    }
  })
}
