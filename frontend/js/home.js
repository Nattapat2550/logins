async function init() {
  try {
    const me = await api('/api/users/me');
    document.getElementById('uname').textContent = me.username || me.email;
    if (me.profile_picture_url) document.getElementById('avatar').src = me.profile_picture_url;

    const content = await api('/api/homepage');
    const map = Object.fromEntries(content.map(c => [c.section_name, c.content]));
    document.getElementById('welcome_header').textContent = map.welcome_header || `Welcome, ${me.username || me.email}`;
    document.getElementById('main_paragraph').textContent = map.main_paragraph || 'This is your dashboard.';

    const items = await api('/api/carousel');
    buildCarousel(items);
  } catch {
    location.replace('index.html');
  }

  document.getElementById('logoutBtn').onclick = async () => {
    await api('/api/auth/logout', { method:'POST' });
    location.replace('index.html');
  };
}
init();

function buildCarousel(items) {
  const ind = document.getElementById('carousel-indicators');
  const inner = document.getElementById('carousel-inner');
  ind.innerHTML = ''; inner.innerHTML='';

  if (!Array.isArray(items) || items.length === 0) {
    const li = document.createElement('li');
    li.setAttribute('data-target','#carouselExampleIndicators');
    li.setAttribute('data-slide-to','0');
    li.className='active'; ind.appendChild(li);
    const div = document.createElement('div');
    div.className='carousel-item active';
    div.innerHTML = `<img class="d-block w-100" src="images/user.png" alt="Slide"/>`;
    inner.appendChild(div);
    setCaption({ title:'No slides yet', subtitle:'', description:'' });
    return;
  }

  items.forEach((it, idx)=>{
    const li = document.createElement('li');
    li.setAttribute('data-target','#carouselExampleIndicators');
    li.setAttribute('data-slide-to', String(idx));
    if (idx===0) li.className='active';
    ind.appendChild(li);

    const div = document.createElement('div');
    div.className = 'carousel-item' + (idx===0 ? ' active' : '');
    const alt = (it.title || `Slide ${idx+1}`).replace(/"/g,'&quot;');
    div.innerHTML = `<img class="d-block w-100" src="${it.image_dataurl}" alt="${alt}">`;
    inner.appendChild(div);
  });

  setCaption(items[0] || {});
  $('#carouselExampleIndicators').on('slide.bs.carousel', function(e){
    const it = items[e.to];
    setCaption(it || {});
  });
}

function setCaption(it) {
  document.getElementById('cc-title').textContent = it.title || '';
  document.getElementById('cc-subtitle').textContent = it.subtitle || '';
  document.getElementById('cc-desc').textContent = it.description || '';
}
