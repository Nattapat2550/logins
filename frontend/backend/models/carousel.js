const pool = require('../config/db');

async function listCarouselItems() {
  const { rows } = await pool.query(
    `SELECT id, item_index, title, subtitle, description, image_dataurl
       FROM carousel_items
      ORDER BY item_index ASC, id ASC`
  );
  return rows;
}

async function createCarouselItem({ itemIndex, title, subtitle, description, imageDataUrl }) {
  const { rows } = await pool.query(
    `INSERT INTO carousel_items (item_index, title, subtitle, description, image_dataurl)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id, item_index, title, subtitle, description, image_dataurl`,
    [itemIndex ?? 0, title || null, subtitle || null, description || null, imageDataUrl]
  );
  return rows[0];
}

async function updateCarouselItem(id, { itemIndex, title, subtitle, description, imageDataUrl }) {
  const { rows } = await pool.query(
    `UPDATE carousel_items
        SET item_index = COALESCE($2, item_index),
            title = COALESCE($3, title),
            subtitle = COALESCE($4, subtitle),
            description = COALESCE($5, description),
            image_dataurl = COALESCE($6, image_dataurl)
      WHERE id=$1
      RETURNING id, item_index, title, subtitle, description, image_dataurl`,
    [id, itemIndex, title || null, subtitle || null, description || null, imageDataUrl || null]
  );
  return rows[0] || null;
}

async function deleteCarouselItem(id) {
  await pool.query('DELETE FROM carousel_items WHERE id=$1', [id]);
}

module.exports = { listCarouselItems, createCarouselItem, updateCarouselItem, deleteCarouselItem };
