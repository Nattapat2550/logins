/**
 * IMPORTANT (architecture change)
 * ------------------------------------------------------------
 * โปรเจค backend ตัวนี้ "ห้าม" ต่อ PostgreSQL ตรง ๆ แล้ว
 * ทุกการอ่าน/เขียน DB ต้องวิ่งผ่านบริการ pure-api เท่านั้น
 *
 * ถ้าไฟล์ไหนยัง require('../config/db') แล้วเรียก pool.query(...)
 * ให้แก้ไปเรียก backend/utils/pureApiClient.js แทน
 */

function notAllowed() {
  throw new Error(
    "[backend] Direct DB access is disabled. Use pure-api (PURE_API_BASE_URL) instead."
  );
}

module.exports = {
  query: notAllowed,
  connect: notAllowed,
};
