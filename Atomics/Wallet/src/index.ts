import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { wallet } from './db/schema.js';

const db = drizzle(process.env.WALLET_DATABASE_URL!);

const app = new Hono();

const portno:number = process.env.WALLET_ATOM_PORT ? Number(process.env.WALLET_ATOM_PORT) : 3000; //default or env

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/test', async (c) => {
  console.log(process.env.WALLET_DATABASE_URL)
  const result = await db.select().from(wallet);
  console.log(result)
  return c.json(result)
})

serve({
  fetch: app.fetch,
  port: portno,
}, (info) => {
  console.log(`Server is running on http://localhost:${portno}`)
})
