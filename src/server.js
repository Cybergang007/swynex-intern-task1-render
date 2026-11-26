require("dotenv").config();

const app = require("./app");
const db = require("./db/database");
const { seedIfEmpty } = require("./db/seed");

if (process.env.SEED_ON_EMPTY === "true") {
  const inserted = seedIfEmpty(db);
  if (inserted) console.log(`Seeded ${inserted} sample tasks.`);
}

if (!process.env.API_KEY) {
  console.warn("WARNING: API_KEY is not set. POST/PUT/DELETE requests will return 500 until it is configured.");
}

// Render injects PORT; bind to all interfaces so its router can reach the service.
const PORT = Number(process.env.PORT) || 3000;
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

// Render sends SIGTERM on deploys/restarts: finish in-flight requests, then close the DB.
function shutdown(signal) {
  console.log(`${signal} received, shutting down...`);
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
