const pure = require('../utils/pureApiClient');

function unwrap(resp) {
  return resp && typeof resp === 'object' && 'data' in resp ? resp.data : resp;
}

async function listCarouselItems() {
  const resp = await pure.get('/api/carousel');
  return unwrap(resp) || [];
}

// Admin: ต้องส่ง token เพื่อให้ pure-api ตรวจสิทธิ์ admin (ถ้าฝั่ง pure-api เปิด jwtAuth)
async function createCarouselItem({ itemIndex, title, subtitle, description, imageDataUrl }, token) {
  const resp = await pure.post('/api/admin/carousel', {
    token,
    body: {
      item_index: itemIndex !== undefined ? Number(itemIndex) : 0,
      title: title || null,
      subtitle: subtitle || null,
      description: description || null,
      image_dataurl: imageDataUrl,
    },
  });
  return unwrap(resp);
}

async function updateCarouselItem(id, { itemIndex, title, subtitle, description, imageDataUrl }, token) {
  const resp = await pure.put(`/api/admin/carousel/${encodeURIComponent(id)}`, {
    token,
    body: {
      item_index: itemIndex !== undefined && itemIndex !== '' ? Number(itemIndex) : undefined,
      title: title !== undefined ? title : undefined,
      subtitle: subtitle !== undefined ? subtitle : undefined,
      description: description !== undefined ? description : undefined,
      image_dataurl: imageDataUrl !== undefined ? imageDataUrl : undefined,
    },
  });
  return unwrap(resp) || null;
}

async function deleteCarouselItem(id, token) {
  await pure.del(`/api/admin/carousel/${encodeURIComponent(id)}`, { token });
}

module.exports = { listCarouselItems, createCarouselItem, updateCarouselItem, deleteCarouselItem };
