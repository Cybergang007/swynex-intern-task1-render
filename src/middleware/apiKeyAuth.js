const crypto = require("crypto");

// Hashing both values gives equal-length buffers, so timingSafeEqual never
// needs a length pre-check that would leak the key's length.
const sha256 = (value) => crypto.createHash("sha256").update(value).digest();

function apiKeyAuth(req, res, next) {
  const expected = process.env.API_KEY;
  const provided = req.get("x-api-key");

  if (!expected) {
    return res.status(500).json({
      success: false,
      error: { code: "AUTH_NOT_CONFIGURED", message: "API authentication is not configured." }
    });
  }

  const valid =
    typeof provided === "string" && crypto.timingSafeEqual(sha256(provided), sha256(expected));

  if (!valid) {
    return res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "A valid x-api-key header is required." }
    });
  }

  next();
}

module.exports = apiKeyAuth;
