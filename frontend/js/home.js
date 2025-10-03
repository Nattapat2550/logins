async function init() {
  try {
    const me = await api('/api/users/me');
    const uname = document.getElementById('uname');
    const avatar = document.getElementById('avatar');
    if (uname) uname.textContent = me.username || me.email;
    if (avatar && me.profile_picture_url) avatar.src = me.profile_picture_url;

    const content = await api('/api/homepage');
    const map = Object.fromEntries(content.map(c => [c.section_name, c.content]));
    const wh = document.getElementById('welcome_header');
    const mp = document.getElementById('main_paragraph');
    if (wh) wh.textContent = map.welcome_header || `Welcome, ${me.username || me.email}`;
    if (mp) mp.textContent = map.main_paragraph || 'This is your dashboard.';

    const items = await api('/api/carousel');
    buildCarousel(items);
  } catch {
    location.replace('index.html');
    return;
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try { await api('/api/auth/logout', { method:'POST' }); } catch {}
      location.replace('index.html');
    });
  }
}
init();

function buildCarousel(items) {
  const track = document.getElementById('carousel-track');
  const dotsBox = document.getElementById('carousel-indicators');
  const prevBtn = document.getElementById('carousel-prev');
  const nextBtn = document.getElementById('carousel-next');
  const shell = document.getElementById('carousel');

  if (!track || !dotsBox || !shell) return;

  track.innerHTML = '';
  dotsBox.innerHTML = '';

  let slides = items;
  if (!Array.isArray(items) || items.length === 0) {
    slides = [{ title:'No slides yet', subtitle:'', description:'', image_dataurl:'images/user.png' }];
  }

  // === สร้างสไลด์ ===
  slides.forEach((it) => {
    const slide = document.createElement('div');
    slide.className = 'carousel-slide';
    const img = document.createElement('img');
    img.src = it.image_dataurl;
    img.alt = it.title || 'Slide';
    slide.appendChild(img);
    track.appendChild(slide);
  });

  // === Indicators เป็น thumbnail วงกลม ===
  slides.forEach((it, idx) => {
    const btn = document.createElement('button');
    const im = document.createElement('img');
    im.src = it.image_dataurl;
    im.alt = it.title || `Slide ${idx+1}`;
    btn.appendChild(im);
    if (idx === 0) btn.classList.add('active');
    btn.addEventListener('click', () => goTo(idx));
    dotsBox.appendChild(btn);
  });

  let index = 0;

  function setCaption(i) {
    const it = slides[i] || {};
    const t = document.getElementById('cc-title');
    const s = document.getElementById('cc-subtitle');
    const d = document.getElementById('cc-desc');
    if (t) t.textContent = it.title || '';
    if (s) s.textContent = it.subtitle || '';
    if (d) d.textContent = it.description || '';
  }

  function update() {
    const width = shell.clientWidth || shell.offsetWidth || 0;
    track.style.transform = `translateX(${-index * width}px)`;
    Array.from(dotsBox.children).forEach((d, i) => d.classList.toggle('active', i === index));
    setCaption(index);
  }

  function goTo(i) {
    const len = slides.length;
    // === วนลูป ===
    index = ((i % len) + len) % len; // รองรับค่าติดลบ
    update();
  }

  // ปุ่มก่อนหน้า/ถัดไป — วนลูป
  if (prevBtn) prevBtn.addEventListener('click', () => goTo(index - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => goTo(index + 1));

  window.addEventListener('resize', update);

  // Swipe วนลูป
  let startX = 0, isDown = false;
  track.addEventListener('pointerdown', (e) => { isDown = true; startX = e.clientX; });
  window.addEventListener('pointerup', (e) => {
    if (!isDown) return;
    const dx = e.clientX - startX;
    if (dx > 40) goTo(index - 1);
    else if (dx < -40) goTo(index + 1);
    isDown = false;
  });

  // init
  setCaption(0);
  update();
}
