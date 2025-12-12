const express = require("express");
const pure = require("../utils/pureApiClient");
const { authenticateJWT } = require("../middleware/auth");

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
 * - frontend -> backend
 * - backend -> pure-api: GET /api/auth/me
 */
router.get("/me", async (req, res) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized (missing token)" });
    }

    const r = await pure.get("/api/auth/me", { token }); // { ok:true, data:{...} }
    return res.json(r.data);
  } catch (e) {
    const status = e.status || 500;

    // ถ้า token หมดอายุ/ผิด ให้ตอบ 401 ชัด ๆ
    if (status === 401) {
      return res.status(401).json({ error: "Unauthorized", detail: e.payload || e.message });
    }

    return res.status(status).json({
      error: "Failed to fetch user",
      detail: e.payload || e.message
    });
  }
});

/**
 * PATCH /api/users/me
 * - update profile: username / profile_picture_url
 * - backend -> pure-api: PATCH /api/users/me
 */
router.patch("/me", async (req, res) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized (missing token)" });
    }

    const { username, profile_picture_url } = req.body || {};

    const r = await pure.patch("/api/users/me", {
      token,
      body: { username, profile_picture_url }
    });

    return res.json(r.data);
  } catch (e) {
    const status = e.status || 500;
    return res.status(status).json({
      error: "Failed to update profile",
      detail: e.payload || e.message
    });
  }
});

/**
 * (optional) GET /api/users/me (แบบบังคับ auth ด้วย middleware)
 * ถ้าคุณอยากใช้ authenticateJWT ของ backend เอง
 * หมายเหตุ: backend verify token ด้วย JWT_SECRET (ต้องตรงกับ pure-api)
 */
// router.get("/me-secure", authenticateJWT, async (req, res) => {
//   try {
//     const token = extractToken(req);
//     const r = await pure.get("/api/auth/me", { token });
//     return res.json(r.data);
//   } catch (e) {
//     const status = e.status || 500;
//     return res.status(status).json({ error: "Failed", detail: e.payload || e.message });
//   }
// });

module.exports = router;
