const db = require("../db/database");

const selectAll = db.prepare(
  "SELECT id, title, description, completed, created_at, updated_at FROM tasks ORDER BY id DESC"
);
const selectOne = db.prepare(
  "SELECT id, title, description, completed, created_at, updated_at FROM tasks WHERE id = ?"
);
const insertTask = db.prepare(
  "INSERT INTO tasks (title, description, completed) VALUES (?, ?, ?)"
);
const updateTask = db.prepare(
  "UPDATE tasks SET title = ?, description = ?, completed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
);
const deleteTask = db.prepare("DELETE FROM tasks WHERE id = ?");

function asTask(row) {
  return row ? { ...row, completed: Boolean(row.completed) } : null;
}

function parseId(value) {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

function validateTask(body, isUpdate = false) {
  const errors = [];
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { errors: [{ field: "body", message: "Request body must be a JSON object." }] };
  }

  const allowed = ["title", "description", "completed"];
  for (const key of Object.keys(body)) {
    if (!allowed.includes(key)) errors.push({ field: key, message: "Unknown field is not allowed." });
  }

  if (!isUpdate || Object.hasOwn(body, "title")) {
    if (typeof body.title !== "string" || body.title.trim().length === 0) {
      errors.push({ field: "title", message: "Title is required and must be a non-empty string." });
    } else if (body.title.trim().length > 120) {
      errors.push({ field: "title", message: "Title must be at most 120 characters." });
    }
  }

  if (Object.hasOwn(body, "description")) {
    if (typeof body.description !== "string") {
      errors.push({ field: "description", message: "Description must be a string." });
    } else if (body.description.length > 1000) {
      errors.push({ field: "description", message: "Description must be at most 1000 characters." });
    }
  } else if (!isUpdate) {
    body.description = "";
  }

  if (Object.hasOwn(body, "completed")) {
    if (typeof body.completed !== "boolean") {
      errors.push({ field: "completed", message: "Completed must be a boolean." });
    }
  } else if (!isUpdate) {
    body.completed = false;
  }

  if (isUpdate && allowed.every((key) => !Object.hasOwn(body, key))) {
    errors.push({ field: "body", message: "Provide at least one field to update." });
  }

  return { errors };
}

function invalid(res, errors) {
  return res.status(400).json({
    success: false,
    error: { code: "VALIDATION_ERROR", message: "Request validation failed.", details: errors }
  });
}

function getTasks(req, res) {
  res.json({ success: true, data: selectAll.all().map(asTask) });
}

function getTask(req, res) {
  const id = parseId(req.params.id);
  if (!id) return invalid(res, [{ field: "id", message: "ID must be a positive integer." }]);
  const task = asTask(selectOne.get(id));
  if (!task) return res.status(404).json({ success: false, error: { code: "TASK_NOT_FOUND", message: "Task not found." } });
  res.json({ success: true, data: task });
}

function createTask(req, res) {
  const { errors } = validateTask(req.body);
  if (errors.length) return invalid(res, errors);
  const result = insertTask.run(req.body.title.trim(), (req.body.description || "").trim(), req.body.completed ? 1 : 0);
  res.status(201).json({ success: true, data: asTask(selectOne.get(result.lastInsertRowid)) });
}

function updateTaskById(req, res) {
  const id = parseId(req.params.id);
  if (!id) return invalid(res, [{ field: "id", message: "ID must be a positive integer." }]);
  const existing = selectOne.get(id);
  if (!existing) return res.status(404).json({ success: false, error: { code: "TASK_NOT_FOUND", message: "Task not found." } });
  const { errors } = validateTask(req.body, true);
  if (errors.length) return invalid(res, errors);

  const body = req.body;
  const title = Object.hasOwn(body, "title") ? body.title.trim() : existing.title;
  const description = Object.hasOwn(body, "description") ? body.description.trim() : existing.description;
  const completed = Object.hasOwn(body, "completed") ? (body.completed ? 1 : 0) : existing.completed;
  updateTask.run(title, description, completed, id);
  res.json({ success: true, data: asTask(selectOne.get(id)) });
}

function deleteTaskById(req, res) {
  const id = parseId(req.params.id);
  if (!id) return invalid(res, [{ field: "id", message: "ID must be a positive integer." }]);
  const result = deleteTask.run(id);
  if (!result.changes) return res.status(404).json({ success: false, error: { code: "TASK_NOT_FOUND", message: "Task not found." } });
  res.json({ success: true, message: "Task deleted successfully." });
}

module.exports = { getTasks, getTask, createTask, updateTaskById, deleteTaskById };
