import amqplib from 'amqplib'

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672/'
const QUEUE_NAME   = process.env.QUEUE_NAME   || 'notifications'

export async function publishNotification(payload: object): Promise<void> {
  let connection
  try {
    connection = await amqplib.connect(RABBITMQ_URL)
    const channel = await connection.createChannel()
    await channel.assertQueue(QUEUE_NAME, { durable: true })
    channel.sendToQueue(
      QUEUE_NAME,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true }
    )
    console.log(`[AMQP] Published notification:`, payload)
    await channel.close()
  } catch (err) {
    console.error('[AMQP] Failed to publish notification:', err)
  } finally {
    if (connection) await connection.close()
  }
}
