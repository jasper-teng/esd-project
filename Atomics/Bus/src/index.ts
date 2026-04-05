import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { getDistanceBetweenStops } from "./distance";

const app = new Hono();

// GET /bus-distance?from=11519&to=75009
app.get("/bus-distance", async (c) => {
    const from = c.req.query("from");
    const to = c.req.query("to");

    if (!from || !to) {
        return c.json({ error: "Missing 'from' or 'to' query params" }, 400);
    }

    const result = await getDistanceBetweenStops(from, to);

    if (!result) {
        return c.json({ error: "No common bus route found between these stops" }, 404);
    }

    return c.json({
        from,
        to,
        serviceNo: result.serviceNo,
        distanceKm: result.distance,
    });
});

const port = 3003;
serve({ fetch: app.fetch, port });
console.log(`Bus MS running on http://localhost:${port}`);