const express = require("express");
const pure = require("../utils/pureApiClient");

const router = express.Router();

/**
 * ดึง JWT token จาก cookie หรือ Authorization header
 */
function extractToken(req) {
  const cookieToken = req.cookies?.token;
  const authHeader = req.headers.authorization;

  if (cookieToken) return cookieToken;
  if (authHeader && authHeader.startsWith("Bearer ")) return authHeader.slice(7);
  return null;
}

/**
 * GET /api/users/me
 * backend -> pure-api: GET /api/auth/me
 */
router.get("/me", async (req, res) => {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: "Unauthorized (missing token)" });

    const r = await pure.get("/api/auth/me", { token }); // expected { ok:true, data:{...} }
    return res.json(r?.data ?? r);
  } catch (e) {
    const status = e.status || 500;
    return res.status(status).json({
      error: "Failed to fetch user",
      detail: e.payload || e.message
    });
  }
});

/**
 * PATCH /api/users/me
 * backend -> pure-api: PATCH /api/users/me
 *
 * รองรับ body ได้ทั้ง:
 *  - { username, profile_picture_url }
 *  - { username, profilePictureUrl }
 */
router.patch("/me", async (req, res) => {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: "Unauthorized (missing token)" });

    const { username } = req.body || {};

    // รับได้ทั้ง snake_case และ camelCase
    const incomingProfileUrl =
      (req.body && req.body.profile_picture_url) ||
      (req.body && req.body.profilePictureUrl) ||
      null;

    const r = await pure.patch("/api/users/me", {
      token,
      body: {
        username: typeof username === "string" ? username : undefined,
        profile_picture_url: incomingProfileUrl !== null ? incomingProfileUrl : undefined
      }
    });

    // ❗ ห้าม destructure ซ้ำชื่อเดิมแบบชนกัน
    const updatedUser = r?.data ?? r;

    return res.json(updatedUser);
  } catch (e) {
    const status = e.status || 500;
    return res.status(status).json({
      error: "Failed to update profile",
      detail: e.payload || e.message
    });
  }
});

module.exports = router;
