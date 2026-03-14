import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { users } from './db/schema.js';

const db = drizzle(process.env.DATABASE_URL!);

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/test', async (c) => {
  console.log(process.env.DATABASE_URL)
  const result = await db.select().from(users);
  console.log(result)
  return c.json(result)
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
