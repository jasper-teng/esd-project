import { Hono } from "hono";
import { dijkstra } from "./dijkstra";
import { graph } from "./stations";

const app = new Hono();

// GET /distance?from=Admiralty&to=Bishan
app.get("/distance", (c) => {
  const from = c.req.query("from");
  const to   = c.req.query("to");

  if (!from || !to) {
    return c.json({ error: "Missing 'from' or 'to' query params" }, 400);
  }

  if (!graph[from] || !graph[to]) {
    return c.json({ error: "Invalid station name" }, 400);
  }

  const { distance, path } = dijkstra(from, to);

  if (distance === Infinity) {
    return c.json({ error: "No route found" }, 404);
  }

  return c.json({
    from,
    to,
    route: path,
    distanceKm: distance.toFixed(2),
  });
});

import { serve } from "@hono/node-server";

const port = 3000;
serve({ fetch: app.fetch, port });
console.log(`Server running on http://localhost:${port}`);


// const port = 3000;
// console.log(`Server running on http://localhost:${port}`);

// export default {
//   port,
//   fetch: app.fetch,
// };

// export default app;