import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { eq, and } from "drizzle-orm";
import { db } from "./db/index.js";
import { students } from "./db/schema.js";

const app = new Hono();
app.use("*", cors({ origin: "*" }));

const portno: number = process.env.STUDENT_VERIFICATION_PORT
  ? Number(process.env.STUDENT_VERIFICATION_PORT)
  : 3020;

app.get("/", (c) => c.text("Student Verification System running!"));

// ---------------------------------------------------------------------------
// POST /verify
// Called by apply.vue Phase 1 — checks NRIC + school + date_of_birth
// ---------------------------------------------------------------------------
app.post("/verify", async (c) => {
  const body = await c.req.json();
  const { identification_number, school, date_of_birth } = body;

  if (!identification_number || !school) {
    return c.json({ verified: false, reason: "identification_number and school are required" }, 400);
  }

  const id = String(identification_number).trim().toUpperCase();

  const [student] = await db
    .select()
    .from(students)
    .where(
      and(
        eq(students.identification_number, id),
        eq(students.school, school)
      )
    )
    .limit(1);

  if (!student) {
    return c.json({ verified: false, reason: "Student not found. Please check your NRIC and institution." });
  }

  if (date_of_birth && student.date_of_birth !== date_of_birth) {
    return c.json({ verified: false, reason: "Date of birth does not match our records." });
  }

  return c.json({
    verified: true,
    student: {
      name:                  student.name,
      school:                student.school,
      identification_number: student.identification_number,
    },
  });
});

// ---------------------------------------------------------------------------
// GET /students — list all students (dev/admin only)
// ---------------------------------------------------------------------------
app.get("/students", async (c) => {
  if (process.env.NODE_ENV === "production") {
    return c.json({ error: "Not available in production" }, 403);
  }
  const all = await db.select().from(students).orderBy(students.id);
  return c.json(all);
});

// ---------------------------------------------------------------------------
// POST /students — add a new student (admin)
// ---------------------------------------------------------------------------
app.post("/students", async (c) => {
  const body = await c.req.json();
  const { identification_number, name, school, date_of_birth } = body;

  if (!identification_number || !school) {
    return c.json({ error: "identification_number and school are required" }, 400);
  }

  const id = String(identification_number).trim().toUpperCase();

  try {
    const [inserted] = await db
      .insert(students)
      .values({ identification_number: id, name: name ?? null, school, date_of_birth: date_of_birth ?? null })
      .returning();

    return c.json({ success: true, student: inserted }, 201);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Postgres unique violation code
    if (msg.includes("unique") || msg.includes("23505")) {
      return c.json({ error: `NRIC ${id} already exists in the database` }, 409);
    }
    return c.json({ error: msg }, 500);
  }
});

// ---------------------------------------------------------------------------
// DELETE /students/:nric — remove a student (admin)
// ---------------------------------------------------------------------------
app.delete("/students/:nric", async (c) => {
  if (process.env.NODE_ENV === "production") {
    return c.json({ error: "Not available in production" }, 403);
  }

  const nric = c.req.param("nric").toUpperCase();

  const [deleted] = await db
    .delete(students)
    .where(eq(students.identification_number, nric))
    .returning();

  if (!deleted) {
    return c.json({ error: "Student not found" }, 404);
  }

  return c.json({ success: true, deleted: nric });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
serve({ fetch: app.fetch, port: portno }, () => {
  console.log(`Student Verification Service running on http://localhost:${portno}`);
});
