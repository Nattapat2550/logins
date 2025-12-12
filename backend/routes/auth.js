const express = require("express");
const pure = require("../utils/pureApiClient");
const { setAuthCookie, clearAuthCookie } = require("../middleware/auth");

const router = express.Router();

/**
 * POST /api/auth/register
 * frontend -> backend -> pure-api (/api/auth/register)
 * - สำเร็จ: set cookie token
 * - ล้มเหลว: forward status + detail จาก pure-api
 */
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, remember } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "Missing email/password" });
    }

    const r = await pure.post("/api/auth/register", {
      body: { username, email, password }
    });

    // pure-api: { ok:true, data:{ token, user } }
    const token = r?.data?.token;
    if (token) {
      setAuthCookie(res, token, !!remember);
    }

    return res.json(r.data);
  } catch (e) {
    const status = e.status || 500;
    return res.status(status).json({
      error: "Register failed",
      detail: e.payload || e.message
    });
  }
});

/**
 * POST /api/auth/login
 * frontend -> backend -> pure-api (/api/auth/login)
 * - สำเร็จ: set cookie token
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password, remember } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "Missing email/password" });
    }

    const r = await pure.post("/api/auth/login", {
      body: { email, password }
    });

    const token = r?.data?.token;
    if (token) {
      setAuthCookie(res, token, !!remember);
    }

    return res.json(r.data);
  } catch (e) {
    const status = e.status || 500;
    return res.status(status).json({
      error: "Login failed",
      detail: e.payload || e.message
    });
  }
});

/**
 * POST /api/auth/logout
 * - ลบ cookie token
 */
router.post("/logout", async (_req, res) => {
  clearAuthCookie(res);
  return res.json({ ok: true });
});

module.exports = router;
