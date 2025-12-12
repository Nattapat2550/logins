const pure = require('../utils/pureApiClient');

function unwrap(resp) {
  return resp && typeof resp === 'object' && 'data' in resp ? resp.data : resp;
}

// Public list for homepage
async function listCarouselItems() {
  const resp = await pure.get('/api/carousel');
  return unwrap(resp) || [];
}

// Admin operations: ส่ง token ของ user (admin) เพื่อให้ pure-api ตรวจสิทธิ์ซ้ำได้
async function createCarouselItem(payload, token) {
  const resp = await pure.post('/api/admin/carousel', { body: payload, token });
  return unwrap(resp);
}

async function updateCarouselItem(id, payload, token) {
  const resp = await pure.put(`/api/admin/carousel/${encodeURIComponent(id)}`, {
    body: payload,
    token,
  });
  return unwrap(resp) || null;
}

async function deleteCarouselItem(id, token) {
  await pure.del(`/api/admin/carousel/${encodeURIComponent(id)}`, { token });
}

module.exports = {
  listCarouselItems,
  createCarouselItem,
  updateCarouselItem,
  deleteCarouselItem,
};
