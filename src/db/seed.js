const fs = require("fs");
const path = require("path");

const seedFile = path.join(__dirname, "../../seed/tasks.json");

function loadSeed() {
  return JSON.parse(fs.readFileSync(seedFile, "utf8"));
}

function insertAll(db, items) {
  const insert = db.prepare(
    "INSERT INTO tasks (title, description, completed) VALUES (@title, @description, @completed)"
  );
  const run = db.transaction((rows) => {
    for (const row of rows) {
      insert.run({
        title: row.title,
        description: row.description || "",
        completed: row.completed ? 1 : 0
      });
    }
  });
  run(items);
  return items.length;
}

// Inserts the sample data only when the tasks table is empty. Returns rows inserted.
function seedIfEmpty(db) {
  const { count } = db.prepare("SELECT COUNT(*) AS count FROM tasks").get();
  return count === 0 ? insertAll(db, loadSeed()) : 0;
}

// Wipes the tasks table and re-inserts the sample data.
function reseed(db) {
  db.exec("DELETE FROM tasks; DELETE FROM sqlite_sequence WHERE name = 'tasks';");
  return insertAll(db, loadSeed());
}

module.exports = { seedIfEmpty, reseed };
