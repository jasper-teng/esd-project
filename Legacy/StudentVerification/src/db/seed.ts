import "dotenv/config";
import { db } from "./index.js";
import { students } from "./schema.js";

// School names MUST match exactly what apply.vue sends
const seedData = [
  { identification_number: "S1234567A", school: "Singapore Management University (SMU)" },
  { identification_number: "S9876543B", school: "Nanyang Technological University (NTU)" },
  { identification_number: "T1111111C", school: "National University of Singapore (NUS)" },
  { identification_number: "S2222222D", school: "Singapore Polytechnic" },
  { identification_number: "S3333333E", school: "Ngee Ann Polytechnic" },
  { identification_number: "T4444444F", school: "Republic Polytechnic" },
  { identification_number: "S5555555G", school: "Temasek Polytechnic" },
  { identification_number: "S6666666H", school: "Singapore Institute of Technology (SIT)" },
  { identification_number: "S7777777I", school: "Singapore University of Technology & Design (SUTD)" },
  { identification_number: "S8888888J", school: "Singapore University of Social Sciences (SUSS)" },
  { identification_number: "T9999999K", school: "Nanyang Polytechnic" },
];

async function seed() {
  console.log("Seeding students table...");

  for (const student of seedData) {
    await db
      .insert(students)
      .values(student)
      .onConflictDoNothing();   // skip if NRIC already exists
  }

  console.log(`Done — ${seedData.length} records processed (duplicates skipped).`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
