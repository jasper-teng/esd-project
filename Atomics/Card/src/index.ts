import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import { card } from './db/schema.js'

const db = drizzle(process.env.CARD_DATABASE_URL!)

const app = new Hono()
app.use('*', cors({ origin: '*' }))

const portno: number = process.env.CARD_ATOM_PORT ? Number(process.env.CARD_ATOM_PORT) : 3001

app.get('/', (c) => c.text('Card Service running!'))

// GET /getCard — list all cards (dev only)
app.get('/getCard', async (c) => {
  const result = await db.select().from(card)
  return c.json(result)
})

// GET /getCard/:id — get card by id
app.get('/getCard/:id', async (c) => {
  const id = c.req.param('id')
  const result = await db.select().from(card).where(eq(card.id, Number(id)))

  if (result.length === 0) {
    return c.json({ code: 404, message: 'Card not found' }, 404)
  }

  return c.json({ code: 200, data: result[0] })
})

// POST /addCard — create a new card
app.post('/addCard', async (c) => {
  const {
    holder_name,
    concession_type,
    cardStatus,
    email,
    contact_number,
    postal_code,
    unit_number,
  } = await c.req.json()

  const [newCard] = await db
    .insert(card)
    .values({
      holder_name:     holder_name     ?? null,
      concession_type: concession_type ?? 'adult',
      cardStatus:      cardStatus      ?? 'ACTIVE',
      email:           email           ?? null,
      contact_number:  contact_number  ?? null,
      postal_code:     postal_code     ?? null,
      unit_number:     unit_number     ?? null,
    })
    .returning()

  return c.json({ message: 'Card created successfully', data: newCard }, 201)
})

// PUT /updateCard/:id — update card fields (e.g. block lost card)
app.put('/updateCard/:id', async (c) => {
  const id = c.req.param('id')
  const { cardStatus, concession_type, email, contact_number, postal_code, unit_number } = await c.req.json()

  const updated = await db
    .update(card)
    .set({
      ...(cardStatus       !== undefined && { cardStatus }),
      ...(concession_type  !== undefined && { concession_type }),
      ...(email            !== undefined && { email }),
      ...(contact_number   !== undefined && { contact_number }),
      ...(postal_code      !== undefined && { postal_code }),
      ...(unit_number      !== undefined && { unit_number }),
    })
    .where(eq(card.id, Number(id)))
    .returning()

  if (updated.length === 0) {
    return c.json({ code: 404, message: 'Card not found' }, 404)
  }

  return c.json({ code: 200, data: updated[0] })
})

serve({ fetch: app.fetch, port: portno }, () => {
  console.log(`Card Service running on http://localhost:${portno}`)
})
