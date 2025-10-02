const msg = document.getElementById('msg');

async function load() {
  try {
    const me = await api('/api/users/me');
    if (me.role !== 'admin') return location.replace('home.html');
    document.getElementById('uname').textContent = me.username || me.email;
    if (me.profile_picture_url) document.getElementById('avatar').src = me.profile_picture_url;

    // Users
    const users = await api('/api/admin/users');
    const tbody = document.querySelector('#usersTable tbody');
    tbody.innerHTML = '';
    users.forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${u.id}</td>
        <td><input value="${u.username || ''}" data-id="${u.id}" data-field="username" /></td>
        <td><input value="${u.email}" data-id="${u.id}" data-field="email" /></td>
        <td>
          <select data-id="${u.id}" data-field="role">
            <option ${u.role==='user'?'selected':''}>user</option>
            <option ${u.role==='admin'?'selected':''}>admin</option>
          </select>
        </td>
        <td><button class="btn small" data-save="${u.id}">Save</button></td>
      `;
      tbody.appendChild(tr);
    });

    tbody.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-save');
      if (!id) return;
      const row = e.target.closest('tr');
      const inputs = row.querySelectorAll('[data-id]');
      const payload = {};
      inputs.forEach(inp => payload[inp.getAttribute('data-field')] = inp.value);
      try { await api(`/api/admin/users/${id}`, { method:'PUT', body: payload }); msg.textContent = 'Saved'; }
      catch (err) { msg.textContent = err.message; }
    }, { once: true });

    // Homepage content form
    document.getElementById('homeForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const section = document.getElementById('section').value.trim();
      const content = document.getElementById('content').value;
      try { await api('/api/homepage', { method:'PUT', body:{ section_name: section, content }}); msg.textContent = `Section "${section}" saved.`; }
      catch (err) { msg.textContent = err.message; }
    });

    // Carousel
    await loadCarousel();

    document.getElementById('logoutBtn').onclick = async () => {
      await api('/api/auth/logout', { method:'POST' });
      location.replace('index.html');
    };
  } catch { location.replace('index.html'); }
}
load();

// ===== Carousel Admin =====
async function loadCarousel() {
  const items = await api('/api/admin/carousel');
  const tbody = document.querySelector('#carouselTable tbody');
  tbody.innerHTML = '';
  items.forEach(it => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${it.id}</td>
      <td><input type="number" value="${it.item_index}" data-id="${it.id}" data-field="item_index" style="width:80px"/></td>
      <td><img src="${it.image_dataurl}" alt="preview" style="width:120px;height:60px;object-fit:cover;border-radius:.25rem"/></td>
      <td><input type="text" value="${it.title || ''}" data-id="${it.id}" data-field="title"/></td>
      <td><input type="text" value="${it.subtitle || ''}" data-id="${it.id}" data-field="subtitle"/></td>
      <td><textarea rows="2" data-id="${it.id}" data-field="description">${it.description || ''}</textarea></td>
      <td><input type="file" data-id="${it.id}" data-field="image" accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"/></td>
      <td>
        <button class="btn" data-save="${it.id}">Save</button>
        <button class="btn danger" data-del="${it.id}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.addEventListener('click', async (e) => {
    const saveId = e.target.getAttribute('data-save');
    const delId = e.target.getAttribute('data-del');
    if (saveId) await saveCarouselRow(saveId, e.target.closest('tr'));
    else if (delId) {
      if (!confirm('Delete this slide?')) return;
      await api(`/api/admin/carousel/${delId}`, { method: 'DELETE' });
      document.getElementById('msg').textContent = 'Deleted.';
      loadCarousel();
    }
  }, { once: true });
}

async function saveCarouselRow(id, tr) {
  const fields = tr.querySelectorAll('[data-id="'+id+'"]');
  const fd = new FormData();
  fields.forEach(el => {
    const field = el.getAttribute('data-field');
    if (field === 'image' && el.files && el.files[0]) fd.append('image', el.files[0]);
    else fd.append(field, el.value);
  });
  const res = await fetch(`${API_BASE_URL}/api/admin/carousel/${id}`, {
    method: 'PUT', credentials: 'include', body: fd
  });
  if (!res.ok) {
    const j = await res.json().catch(()=>({error:'Update failed'}));
    throw new Error(j.error || 'Update failed');
  }
  document.getElementById('msg').textContent = 'Saved.';
  loadCarousel();
}

document.getElementById('carouselForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const file = document.getElementById('cImage').files[0];
  if (!file) { msg.textContent = 'Please choose an image.'; return; }
  const fd = new FormData();
  fd.append('image', file);
  fd.append('itemIndex', document.getElementById('cIndex').value);
  fd.append('title', document.getElementById('cTitle').value);
  fd.append('subtitle', document.getElementById('cSubtitle').value);
  fd.append('description', document.getElementById('cDesc').value);
  const res = await fetch(`${API_BASE_URL}/api/admin/carousel`, {
    method:'POST', credentials:'include', body: fd
  });
  if (!res.ok) {
    const j = await res.json().catch(()=>({error:'Create failed'}));
    msg.textContent = j.error || 'Create failed'; return;
  }
  msg.textContent = 'Slide added.';
  e.target.reset();
  loadCarousel();
});
