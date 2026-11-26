function notFound(req, res) {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: `Route ${req.method} ${req.originalUrl} was not found.` }
  });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      error: { code: "INVALID_JSON", message: "Request body must contain valid JSON." }
    });
  }

  console.error(err);
  return res.status(500).json({
    success: false,
    error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected server error occurred." }
  });
}

module.exports = { notFound, errorHandler };
