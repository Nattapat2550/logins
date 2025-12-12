const express = require("express");
const { Readable } = require("stream");

const router = express.Router();

const PURE_API_BASE_URL = process.env.PURE_API_BASE_URL; // https://pure-api-pry6.onrender.com
const PURE_API_KEY = process.env.PURE_API_KEY;           // docker-key-123

function must(name, v) {
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function proxyDownload(req, res, targetPath, filename) {
  const base = must("PURE_API_BASE_URL", PURE_API_BASE_URL).replace(/\/+$/, "");
  const key = must("PURE_API_KEY", PURE_API_KEY);

  const r = await fetch(`${base}${targetPath}`, {
    method: "GET",
    headers: { "x-api-key": key }
  });

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    return res.status(r.status).send(text || `Download failed (${r.status})`);
  }

  // ส่ง headers ที่เกี่ยวกับไฟล์กลับไป
  const ct = r.headers.get("content-type");
  const cl = r.headers.get("content-length");
  if (ct) res.setHeader("content-type", ct);
  if (cl) res.setHeader("content-length", cl);

  res.setHeader("content-disposition", `attachment; filename="${filename}"`);

  // stream body กลับไปให้ user
  if (!r.body) return res.status(500).send("No body");
  const nodeStream = Readable.fromWeb(r.body);
  nodeStream.pipe(res);
}

router.get("/windows", (req, res) =>
  proxyDownload(req, res, "/api/download/windows", "MyAppSetup.exe")
);

router.get("/android", (req, res) =>
  proxyDownload(req, res, "/api/download/android", "app-release.apk")
);

module.exports = router;
