import "dotenv/config";
import { db } from "./index.js";
import { students } from "./schema.js";

// School names MUST match exactly what apply.vue sends
const seedData = [
  { identification_number: "S1234567A", name: "Alice Tan",   school: "Singapore Management University (SMU)",              date_of_birth: "2002-03-15" },
  { identification_number: "S9876543B", name: "Bob Lim",     school: "Nanyang Technological University (NTU)",             date_of_birth: "2001-07-22" },
  { identification_number: "T1111111C", name: "Carol Ng",    school: "National University of Singapore (NUS)",             date_of_birth: "2003-01-10" },
  { identification_number: "S2222222D", name: "David Koh",   school: "Singapore Polytechnic",                              date_of_birth: "2004-05-30" },
  { identification_number: "S3333333E", name: "Emma Wong",   school: "Ngee Ann Polytechnic",                               date_of_birth: "2004-11-18" },
  { identification_number: "T4444444F", name: "Frank Lee",   school: "Republic Polytechnic",                               date_of_birth: "2003-09-05" },
  { identification_number: "S5555555G", name: "Grace Tan",   school: "Temasek Polytechnic",                                date_of_birth: "2004-02-14" },
  { identification_number: "S6666666H", name: "Henry Goh",   school: "Singapore Institute of Technology (SIT)",            date_of_birth: "2002-08-25" },
  { identification_number: "S7777777I", name: "Ivan Chua",   school: "Singapore University of Technology & Design (SUTD)", date_of_birth: "2003-04-20" },
  { identification_number: "S8888888J", name: "Jane Ong",    school: "Singapore University of Social Sciences (SUSS)",     date_of_birth: "2004-07-11" },
  { identification_number: "T9999999K", name: "Kevin Yap",   school: "Nanyang Polytechnic",                                date_of_birth: "2003-12-01" },
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
