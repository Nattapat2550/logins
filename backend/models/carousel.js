// backend/models/carousel.js
const { callPureApi } = require('../utils/pureApi');

async function listCarouselItems() {
  const rows = await callPureApi('/carousel/list', 'GET');
  return rows || [];
}

async function createCarouselItem(data) {
  const row = await callPureApi('/carousel/create', 'POST', data);
  return row;
}

async function updateCarouselItem(id, data) {
  const row = await callPureApi('/carousel/update', 'POST', { id, ...data });
  return row;
}

async function deleteCarouselItem(id) {
  await callPureApi('/carousel/delete', 'POST', { id });
}

module.exports = { listCarouselItems, createCarouselItem, updateCarouselItem, deleteCarouselItem };