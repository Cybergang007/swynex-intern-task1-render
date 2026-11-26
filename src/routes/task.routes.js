const express = require("express");
const router = express.Router();
const auth = require("../middleware/apiKeyAuth");
const tasks = require("../controllers/task.controller");

// Reading tasks is public. Mutating task data requires an API key.
router.get("/", tasks.getTasks);
router.get("/:id", tasks.getTask);
router.post("/", auth, tasks.createTask);
router.put("/:id", auth, tasks.updateTaskById);
router.delete("/:id", auth, tasks.deleteTaskById);

module.exports = router;
