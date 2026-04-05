import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";

const app = new Hono();
app.use("*", cors({ origin: "*" }));

const BUS_SERVICE_URL = process.env.BUS_SERVICE_URL || "http://bus_ms:3003";
const MRT_SERVICE_URL = process.env.MRT_SERVICE_URL || "http://mrt_ms:3004";
const port = process.env.LTA_PORT ? Number(process.env.LTA_PORT) : 3007;

// GET /distance?from=xxx&to=yyy&transport_type=bus|train
app.get("/distance", async (c) => {
  const from = c.req.query("from");
  const to = c.req.query("to");
  const transport_type = c.req.query("transport_type");

  if (!from || !to || !transport_type) {
    return c.json({ code: 400, message: "from, to, and transport_type are required" }, 400);
  }

  try {
    let url: string;

    if (transport_type === "bus") {
      url = `${BUS_SERVICE_URL}/bus-distance?from=${from}&to=${to}`;
    } else if (transport_type === "train") {
      url = `${MRT_SERVICE_URL}/mrt-distance?from=${from}&to=${to}`;
    } else {
      return c.json({ code: 400, message: "transport_type must be 'bus' or 'train'" }, 400);
    }

    const response = await fetch(url);
    const data = await response.json() as any;

    if (!response.ok) {
      return c.json({ code: response.status, message: data.error || "Upstream error" }, response.status as any);
    }

    return c.json({
      code: 200,
      data: {
        from,
        to,
        transport_type,
        distance_km: data.distanceKm,
      }
    });

  } catch (err) {
    return c.json({ code: 500, message: `Failed to reach ${transport_type} service` }, 500);
  }
});

app.get("/health", (c) => {
  return c.json({ code: 200, status: "healthy", service: "lta-distance-service" });
});

serve({ fetch: app.fetch, port }, () => {
  console.log(`LTA Distance Service running on http://localhost:${port}`);
});
