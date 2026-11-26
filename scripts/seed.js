// Usage: npm run seed            -> insert sample data only if the table is empty
//        npm run seed -- --reset -> wipe tasks and re-insert sample data
require("dotenv").config();
const db = require("../src/db/database");
const { seedIfEmpty, reseed } = require("../src/db/seed");

const reset = process.argv.includes("--reset");
const inserted = reset ? reseed(db) : seedIfEmpty(db);

console.log(
  inserted
    ? `Seeded ${inserted} sample tasks.`
    : "Tasks table already has data; nothing seeded (use --reset to overwrite)."
);
db.close();
