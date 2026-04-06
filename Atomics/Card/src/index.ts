import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { card } from './db/schema.js';

const db = drizzle(process.env.CARD_DATABASE_URL!);

const app = new Hono();

app.use('*', cors({ origin: '*' }))

const portno: number = process.env.CARD_ATOM_PORT ? Number(process.env.CARD_ATOM_PORT) : 3000; //default or env

app.get('/', (c) => {
  return c.text('Hello test card!')
})

app.post("/addCard", async (c) => {
  const { name, name2 } = await c.req.json();

  if (!name || !name2) {
    return c.json({ message: "All fields are required" }, 400);
  }
  
  const NewCard = await db
    .insert(card)
    .values({ name, name2 })
    .returning();

  return c.json({ message: "User created successfully", user: NewCard });
});

app.get('/getCard', async (c) => {
  console.log(process.env.CARD_DATABASE_URL)
  const result = await db.select().from(card);
  console.log(result)
  return c.json(result)
})

app.get('/getCard/:id', async (c) => {
  const id = c.req.param('id')
  const result = await db.select().from(card).where(eq(card.id, Number(id)))

  if (result.length === 0) {
    return c.json({ code: 404, message: 'Card not found' }, 404)
  }

  return c.json({ code: 200, data: result[0] })
})

app.put('/updateCard/:id', async (c) => {
  const id = c.req.param('id')
  const { cardStatus } = await c.req.json()

  const result = await db
    .update(card)
    .set({ cardStatus })
    .where(eq(card.id, Number(id)))
    .returning()

  if (result.length === 0) {
    return c.json({ code: 404, message: 'Card not found' }, 404)
  }

  return c.json({ code: 200, data: result[0] })
})

serve({
  fetch: app.fetch,
  port: portno,
}, (info) => {
  console.log(`Server is running on http://localhost:${portno}`)
})
