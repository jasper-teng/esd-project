import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { card } from './db/schema.js';

const db = drizzle(process.env.CARD_DATABASE_URL!);

const app = new Hono();

const portno: number = process.env.CARD_ATOM_PORT ? Number(process.env.CARD_ATOM_PORT) : 3000; //default or env

app.get('/', (c) => {
  return c.text('Hello test card!')
})

app.post("/", async (c) => {
  const { name, name2 } = await c.req.json();

  // if (!username || !email || !password) {
  //   return c.json({ message: "All fields are required" }, 400);
  // }
  
  const NewCard = await db
    .insert(card)
    .values({ name, name2 })
    .returning();


  return c.json({ message: "User created successfully", user: NewCard });
});


app.get('/test', async (c) => {
  console.log(process.env.CARD_DATABASE_URL)
  const result = await db.select().from(card);
  console.log(result)
  return c.json(result)
})

serve({
  fetch: app.fetch,
  port: portno,
}, (info) => {
  console.log(`Server is running on http://localhost:${portno}`)
})


