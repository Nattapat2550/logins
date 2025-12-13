// backend/config/db.js
// ไม่ต้องใช้ pg แล้ว เพราะย้ายไป Pure-API หมดแล้ว
module.exports = {
  query: () => {
    console.error("LEGACY DB CALL: This should not happen. Please check pureApi migration.");
    throw new Error("Legacy DB connection removed. Use pureApi instead.");
  }
};