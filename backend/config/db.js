/**
 * IMPORTANT:
 * โปรเจคนี้ "ห้าม" ต่อ PostgreSQL ตรงอีกแล้ว
 * ทุกอย่างต้องวิ่งผ่าน pure-api เท่านั้น
 *
 * ถ้าเจอ import db แล้วเรียก db.query(...) ให้ไปแก้ service นั้น
 * ให้เรียก pureApiClient แทน
 */

function notAllowed() {
  throw new Error(
    "[projectdocker] Direct DB access is disabled. Use pure-api instead."
  );
}

module.exports = {
  query: notAllowed,
  connect: notAllowed
};
