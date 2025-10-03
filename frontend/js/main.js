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
  const track = document.getElementById('carousel-track');
  const dotsBox = document.getElementById('carousel-indicators');
  const prevBtn = document.getElementById('carousel-prev');
  const nextBtn = document.getElementById('carousel-next');
  track.innerHTML = ''; dotsBox.innerHTML = '';

  let slides = items;
  if (!Array.isArray(items) || items.length === 0) {
    slides = [{ title:'No slides yet', subtitle:'', description:'', image_dataurl:'images/user.png' }];
  }

  // สร้างสไลด์
  slides.forEach((it) => {
    const slide = document.createElement('div');
    slide.className = 'carousel-slide';
    const img = document.createElement('img');
    img.src = it.image_dataurl;
    img.alt = it.title || 'Slide';
    slide.appendChild(img);
    track.appendChild(slide);
  });

  // Indicators เป็นรูปย่อ (thumbnail)
  slides.forEach((it, idx) => {
    const btn = document.createElement('button');
    const im = document.createElement('img');
    im.src = it.image_dataurl; im.alt = (it.title || `Slide ${idx+1}`);
    btn.appendChild(im);
    if (idx === 0) btn.classList.add('active');
    btn.addEventListener('click', () => goTo(idx));
    dotsBox.appendChild(btn);
  });

  let index = 0;

  function setCaption(i) {
    const it = slides[i] || {};
    document.getElementById('cc-title').textContent = it.title || '';
    document.getElementById('cc-subtitle').textContent = it.subtitle || '';
    document.getElementById('cc-desc').textContent = it.description || '';
  }

  function updateButtons() {
    // ไม่วนลูป: ปิดปุ่มเมื่อสุดขอบ
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === slides.length - 1;
  }

  function update() {
    const width = document.getElementById('carousel').clientWidth;
    track.style.transform = `translateX(${-index * width}px)`;
    Array.from(dotsBox.children).forEach((d, i) => d.classList.toggle('active', i === index));
    setCaption(index);
    updateButtons();
  }

  function goTo(i) {
    index = Math.max(0, Math.min(slides.length - 1, i));
    update();
  }

  prevBtn.addEventListener('click', () => {
    if (index > 0) goTo(index - 1);
  });
  nextBtn.addEventListener('click', () => {
    if (index < slides.length - 1) goTo(index + 1);
  });
  window.addEventListener('resize', update);

  // Swipe เบื้องต้น (ไม่วน)
  let startX = 0, isDown = false;
  track.addEventListener('pointerdown', (e) => { isDown = true; startX = e.clientX; });
  window.addEventListener('pointerup', (e) => {
    if (!isDown) return;
    const dx = e.clientX - startX;
    if (dx > 40 && index > 0) goTo(index - 1);
    else if (dx < -40 && index < slides.length - 1) goTo(index + 1);
    isDown = false;
  });

  // init
  setCaption(0);
  update();
}
