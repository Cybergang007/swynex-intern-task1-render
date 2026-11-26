const express = require("express");
const swaggerUi = require("swagger-ui-express");
const healthRoutes = require("./routes/health.routes");
const taskRoutes = require("./routes/task.routes");
const openapi = require("./docs/openapi.json");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "10kb" }));

app.get("/", (req, res) => {
  res.json({
    success: true,
    service: "swynex-task-api",
    version: openapi.info.version,
    docs: "/docs",
    health: "/health",
    tasks: "/api/tasks"
  });
});

app.use("/", healthRoutes);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: "Swynex Task API" }));
app.get("/openapi.json", (req, res) => res.json(openapi));
app.use("/api/tasks", taskRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
