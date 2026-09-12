// ---- nav scroll state ----
const nav = document.getElementById('nav');
const onNavScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
document.addEventListener('scroll', onNavScroll, { passive:true });
onNavScroll();

// ---- mobile burger (simple toggle of nav-links visibility) ----
const burger = document.getElementById('burger');
const navLinks = document.querySelector('.nav-links');
burger.addEventListener('click', () => {
  const open = navLinks.style.display === 'flex';
  navLinks.style.cssText = open ? '' : 'display:flex; position:fixed; top:70px; left:20px; right:20px; background:#1D160F; border:1px solid rgba(243,232,214,0.12); border-radius:18px; padding:22px; flex-direction:column; gap:18px; z-index:300;';
});

// ---- reveal on scroll ----
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const io = reduceMotion
  ? { observe: (el) => el.classList.add('in'), unobserve: () => {} }
  : new IntersectionObserver((entries, obs) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
    }, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// ---- lazy-load menu images with staggered reveal ----
const mediaIO = new IntersectionObserver((entries, obs) => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const media = e.target;
    const img = media.querySelector('img');
    if (!img) return;

    const show = () => { media.classList.add('loaded'); };

    if (img.complete && img.naturalWidth > 0) {
      show();
    } else {
      img.addEventListener('load', show, { once: true });
      img.addEventListener('error', show, { once: true });
    }
    obs.unobserve(media);
  });
}, { rootMargin: '200px 0px' });

// ---- tabs ----
const tabBtns = document.querySelectorAll('.tab-btn');
const panels = document.querySelectorAll('.tab-panel');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    if (btn.classList.contains('active')) return;
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    panels.forEach(p => { p.style.display = (p.dataset.panel === target) ? 'block' : 'none'; });
    if (menuSectionVisible) {
      menuAnimOn = false;
      showCurrentCategory();
    }
    refreshMenuFromAPI();
  });
});

// ===================== MENU RENDER + PAGINATION =====================
const MENU_PAGE_SIZE = 6;
const menuCountPerCat = {};
let menuCache = null;
let menuAnimOn = true;

async function getMenuDataAsync() {
  if (menuCache) return menuCache;
  const data = await fetchMenuData();
  if (data) {
    menuCache = data;
    return menuCache;
  }
  return { pizza: [], rolls: [], burgers: [], snacks: [] };
}

function createFoodCard(item, animIndex) {
  const card = document.createElement('div');
  card.className = 'food-card reveal' + (menuAnimOn ? ' menu-anim' : '') + (item.soldout ? ' is-soldout' : '');
  if (menuAnimOn && typeof animIndex === 'number') card.style.animationDelay = (animIndex * 0.06) + 's';

  const media = document.createElement('div');
  media.className = 'food-media';

  if (item.soldout) {
    const soldEl = document.createElement('span');
    soldEl.className = 'food-soldout';
    soldEl.textContent = 'Закончилось';
    media.appendChild(soldEl);
  } else if (item.tag) {
    const tagEl = document.createElement('span');
    tagEl.className = 'food-tag ' + item.tagClass;
    tagEl.textContent = item.tag;
    media.appendChild(tagEl);
  }

  const img = document.createElement('img');
  img.src = item.img;
  img.alt = item.alt || item.name;
  img.loading = 'lazy';
  img.decoding = 'async';
  media.appendChild(img);
  card.appendChild(media);

  const body = document.createElement('div');
  body.className = 'food-body';

  const h3 = document.createElement('h3');
  h3.textContent = item.name;
  body.appendChild(h3);

  const p = document.createElement('p');
  p.textContent = item.desc;
  body.appendChild(p);

  const foot = document.createElement('div');
  foot.className = 'food-foot';

  const price = document.createElement('span');
  price.className = 'price';
  price.textContent = item.price + ' ₽';
  foot.appendChild(price);

  const addBtn = document.createElement('button');
  addBtn.className = 'add-btn';
  addBtn.type = 'button';
  if (item.soldout) {
    addBtn.textContent = '—';
    addBtn.disabled = true;
    addBtn.title = 'Нет в наличии';
  } else {
    addBtn.textContent = '+';
    addBtn.addEventListener('click', () => addToCart(item.name, item.price, item.img, item.id));
  }
  foot.appendChild(addBtn);

  body.appendChild(foot);
  card.appendChild(body);

  io.observe(card);
  mediaIO.observe(media);

  return card;
}

function observeCategorySentinel(cat) {
  const sentinel = document.querySelector(`[data-grid="${cat}"] .menu-load-more`);
  if (!sentinel) return;
  const obs = window['_menuObs_' + cat];
  if (obs) obs.disconnect();
  window['_menuObs_' + cat] = new IntersectionObserver((entries, ob) => {
    if (entries.some(e => e.isIntersecting)) loadMoreCategory(cat);
  }, { rootMargin: '200px' });
  window['_menuObs_' + cat].observe(sentinel);
}

async function renderCategory(cat, count) {
  const menuData = await getMenuDataAsync();
  const items = menuData[cat] || [];
  const visible = typeof count === 'number' ? count : (menuCountPerCat[cat] || MENU_PAGE_SIZE);
  menuCountPerCat[cat] = visible;

  const grid = document.querySelector(`[data-grid="${cat}"]`);
  if (!grid) return;
  grid.innerHTML = '';
  grid.scrollLeft = 0;

  if (items.length === 0) {
    const hint = document.createElement('div');
    hint.className = 'menu-load-failed';
    if (window.MENU_LOAD_FAILED) {
      hint.textContent = 'Не удалось загрузить меню. Запустите сервер (python main.py) и откройте сайт по адресу http://localhost:8000';
    } else {
      hint.textContent = 'В этой категории пока нет блюд — загляните позже.';
    }
    grid.appendChild(hint);
    return;
  }

  items.slice(0, visible).forEach((item, i) => {
    grid.appendChild(createFoodCard(item, i));
  });

  let sentinel = grid.querySelector('.menu-load-more');
  if (!sentinel) {
    sentinel = document.createElement('div');
    sentinel.className = 'menu-load-more';
    grid.appendChild(sentinel);
  }

  if (items.length <= visible) {
    sentinel.style.display = 'none';
  } else {
    sentinel.style.display = '';
    observeCategorySentinel(cat);
  }
}

function loadMoreCategory(cat) {
  menuAnimOn = false;
  const menuData = menuCache || {};
  const items = menuData[cat] || [];
  const from = menuCountPerCat[cat] || MENU_PAGE_SIZE;
  const visible = Math.min(items.length, from + MENU_PAGE_SIZE);
  menuCountPerCat[cat] = visible;

  const grid = document.querySelector(`[data-grid="${cat}"]`);
  if (!grid) return;

  const sentinel = grid.querySelector('.menu-load-more');
  items.slice(from, visible).forEach((item, i) => {
    const card = createFoodCard(item, from + i);
    if (sentinel) grid.insertBefore(card, sentinel);
    else grid.appendChild(card);
  });

  if (items.length > visible) {
    observeCategorySentinel(cat);
  } else if (sentinel) {
    sentinel.style.display = 'none';
  }
}

// Предзагружаем меню и сразу при открытии страницы отдаём все блюда —
// все категории рендерятся заранее, без ожидания прокрутки до блока "Меню".
let menuSectionVisible = true;

function showCurrentCategory() {
  const active = document.querySelector('.tab-btn.active');
  if (!active) return;
  const cat = active.dataset.tab;
  menuCountPerCat[cat] = MENU_PAGE_SIZE;
  renderCategory(cat);
}

(async () => {
  await getMenuDataAsync();
  ['pizza', 'rolls', 'burgers', 'snacks'].forEach(cat => {
    menuCountPerCat[cat] = MENU_PAGE_SIZE;
    renderCategory(cat);
  });
})();

// ---- живая синхронизация с бэкеном ----
// Меню обновляется по действиям пользователя и при возврате на вкладку
// (без постоянного фонового опроса), чтобы не нагружать сервер.
async function refreshMenuFromAPI() {
  try {
    const data = await fetchMenuData();
    if (!data) return;
    if (JSON.stringify(data) !== JSON.stringify(menuCache)) {
      menuCache = data;
      const active = document.querySelector('.tab-btn.active');
      if (active) {
        const cat = active.dataset.tab;
        const count = menuCountPerCat[cat] || MENU_PAGE_SIZE;
        renderCategory(cat, count);
      }
    }
  } catch (e) { /* ignore */ }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') refreshMenuFromAPI();
});

// ---- build the slicing pizza SVG ----
const NUM_SLICES = 8;
const CX = 300, CY = 300, R = 280;
const PIZZA_IMG = 'img/hero/pizza-hero.jpg';
const svgNS = 'http://www.w3.org/2000/svg';
const xlinkNS = 'http://www.w3.org/1999/xlink';
const svg = document.getElementById('pizzaSvg');
const defs = document.createElementNS(svgNS, 'defs');
svg.appendChild(defs);

const slices = [];
for (let i = 0; i < NUM_SLICES; i++) {
  const a1 = (-90 + i * (360 / NUM_SLICES)) * Math.PI / 180;
  const a2 = (-90 + (i + 1) * (360 / NUM_SLICES)) * Math.PI / 180;
  const x1 = CX + R * Math.cos(a1), y1 = CY + R * Math.sin(a1);
  const x2 = CX + R * Math.cos(a2), y2 = CY + R * Math.sin(a2);
  const d = `M${CX},${CY} L${x1.toFixed(2)},${y1.toFixed(2)} A${R},${R} 0 0 1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`;

  const clipId = 'slice-clip-' + i;
  const clipPath = document.createElementNS(svgNS, 'clipPath');
  clipPath.setAttribute('id', clipId);
  const clipPathShape = document.createElementNS(svgNS, 'path');
  clipPathShape.setAttribute('d', d);
  clipPath.appendChild(clipPathShape);
  defs.appendChild(clipPath);

  const g = document.createElementNS(svgNS, 'g');
  g.setAttribute('clip-path', `url(#${clipId})`);

  const img = document.createElementNS(svgNS, 'image');
  img.setAttributeNS(xlinkNS, 'href', PIZZA_IMG);
  img.setAttribute('href', PIZZA_IMG);
  img.setAttribute('x', 0);
  img.setAttribute('y', 0);
  img.setAttribute('width', 600);
  img.setAttribute('height', 600);
  img.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  g.appendChild(img);

  const divider = document.createElementNS(svgNS, 'path');
  divider.setAttribute('d', d);
  divider.setAttribute('fill', 'none');
  divider.setAttribute('stroke', 'rgba(20,16,13,0.6)');
  divider.setAttribute('stroke-width', '3');
  g.appendChild(divider);

  svg.appendChild(g);
  slices.push({ g, angle: (a1 + a2) / 2 });
}

function updateSlices(progress) {
  const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
  slices.forEach((s, i) => {
    const dist = eased * 130;
    const dx = Math.cos(s.angle) * dist;
    const dy = Math.sin(s.angle) * dist;
    const rot = eased * 9 * (i % 2 === 0 ? 1 : -1);
    s.g.setAttribute('transform', `translate(${dx.toFixed(2)}, ${dy.toFixed(2)}) rotate(${rot.toFixed(2)} 300 300)`);
    s.g.style.filter = `drop-shadow(0 ${(10 * eased).toFixed(1)}px ${(20 * eased).toFixed(1)}px rgba(0,0,0,${(0.5 * eased).toFixed(2)}))`;
  });
}

const wrapper = document.getElementById('splitWrapper');
const pizzaWrap = document.getElementById('pizzaWrap');
const flyGrid = document.getElementById('flyGrid');
const flyStage = flyGrid.parentElement;

let animStarted = false;
function playSliceAnimation() {
  if (animStarted) return;
  animStarted = true;
  flyStage.classList.add('expanded');
  const DURATION = 1500;
  const start = performance.now();
  function frame(now) {
    const p = Math.min(1, Math.max(0, (now - start) / DURATION));
    updateSlices(p);
    if (p < 1) {
      requestAnimationFrame(frame);
    } else {
      pizzaWrap.classList.add('gone');
      flyGrid.classList.add('show');
    }
  }
  requestAnimationFrame(frame);
}

if (reduceMotion) {
  updateSlices(0.15);
  pizzaWrap.classList.add('gone');
  flyGrid.classList.add('show');
  flyStage.classList.add('expanded');
} else {
  const sliceIO = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        playSliceAnimation();
        sliceIO.unobserve(e.target);
      }
    });
  }, { threshold: 0.4 });
  sliceIO.observe(wrapper);
}

// ---- phone call modal ----
const phoneModal = document.getElementById('phoneModal');
const phoneNumber = 'tel:89898851080';

function openPhoneModal(e) {
  e.preventDefault();
  phoneModal.classList.add('open');
}
function closePhoneModal() {
  phoneModal.classList.remove('open');
}

document.querySelectorAll('.nav-phone, .footer-phone').forEach(el => {
  el.addEventListener('click', openPhoneModal);
});
document.getElementById('phoneCall').addEventListener('click', () => {
  window.location.href = phoneNumber;
});
document.getElementById('phoneCancel').addEventListener('click', closePhoneModal);
phoneModal.addEventListener('click', (e) => {
  if (e.target === phoneModal) closePhoneModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closePhoneModal();
});

// ===================== CART =====================
const cartFab = document.getElementById('cartFab');
const cartPanel = document.getElementById('cartPanel');
const cartItems = document.getElementById('cartItems');
const cartEmpty = document.getElementById('cartEmpty');
const cartBadge = document.getElementById('cartBadge');
const cartTotal = document.getElementById('cartTotal');
const cartGrandTotal = document.getElementById('cartGrandTotal');
const cartClose = document.getElementById('cartClose');
const cartCheckoutBtn = document.getElementById('cartCheckout');
const checkoutModal = document.getElementById('checkoutModal');
const checkoutList = document.getElementById('checkoutList');
const checkoutTotal = document.getElementById('checkoutTotal');
const checkoutName = document.getElementById('checkoutName');
const checkoutPhone = document.getElementById('checkoutPhone');
const checkoutAddress = document.getElementById('checkoutAddress');
const checkoutAddressField = document.getElementById('checkoutAddressField');
const checkoutConfirm = document.getElementById('checkoutConfirm');
const checkoutCancel = document.getElementById('checkoutCancel');
const STORE_ADDRESS = 'Кизляр, ул. Победы 91/1';

const cart = new Map();
let deliveryType = 'delivery';

const deliveryToggle = document.getElementById('deliveryToggle');
deliveryToggle.addEventListener('click', e => {
  const btn = e.target.closest('.del-btn');
  if (!btn) return;
  deliveryType = btn.dataset.type;
  deliveryToggle.querySelectorAll('.del-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  checkoutAddressField.style.display = deliveryType === 'pickup' ? 'none' : '';
});

const fmt = n => n.toLocaleString('ru-RU') + ' \u20BD';

function addToCart(name, price, img, id){
  if (cart.has(name)) cart.get(name).qty += 1;
  else cart.set(name, { name, price, qty:1, img, id: id || 0 });
  renderCart();
}

function renderCart(){
  let count = 0, total = 0;
  cart.forEach(i => { count += i.qty; total += i.qty * i.price; });

  cartBadge.textContent = count;
  cartTotal.textContent = fmt(total);
  cartGrandTotal.textContent = fmt(total);
  cartFab.classList.toggle('hidden', count === 0);

  cartItems.innerHTML = '';
  cart.forEach(i => {
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <img class="cart-item-img" src="${i.img}" alt="">
      <div class="cart-item-info">
        <div class="cart-item-name">${i.name}</div>
        <div class="cart-item-price">${fmt(i.price)}</div>
      </div>
      <div class="cart-item-controls">
        <button class="qty-btn" data-act="dec" data-name="${encodeURIComponent(i.name)}">\u2212</button>
        <span class="qty-val">${i.qty}</span>
        <button class="qty-btn" data-act="inc" data-name="${encodeURIComponent(i.name)}">+</button>
        <button class="cart-item-remove" data-act="del" data-name="${encodeURIComponent(i.name)}">\u2715</button>
      </div>`;
    cartItems.appendChild(row);
  });
  cartEmpty.style.display = count === 0 ? 'block' : 'none';
}

cartItems.addEventListener('click', e => {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const key = decodeURIComponent(btn.dataset.name);
  const item = cart.get(key);
  if (!item) return;
  const act = btn.dataset.act;
  if (act === 'inc') item.qty += 1;
  else if (act === 'dec') { item.qty -= 1; if (item.qty <= 0) cart.delete(key); }
  else if (act === 'del') cart.delete(key);
  renderCart();
});

cartFab.addEventListener('click', () => cartPanel.classList.add('open'));
cartClose.addEventListener('click', () => cartPanel.classList.remove('open'));
cartPanel.addEventListener('click', e => { if (e.target === cartPanel) cartPanel.classList.remove('open'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') cartPanel.classList.remove('open'); });

cartCheckoutBtn.addEventListener('click', () => {
  if (cart.size === 0) return;
  checkoutList.innerHTML = '';
  let total = 0;
  cart.forEach(i => {
    total += i.price * i.qty;
    const row = document.createElement('div');
    row.className = 'cl-row';
    row.innerHTML = `<span>${i.name} \u00D7 ${i.qty}</span><b>${fmt(i.price * i.qty)}</b>`;
    checkoutList.appendChild(row);
  });
  checkoutTotal.textContent = fmt(total);
  checkoutName.value = ''; checkoutPhone.value = ''; checkoutAddress.value = '';
  checkoutAddressField.style.display = deliveryType === 'pickup' ? 'none' : '';
  checkoutModal.classList.add('open');
});

checkoutCancel.addEventListener('click', () => checkoutModal.classList.remove('open'));
checkoutModal.addEventListener('click', e => { if (e.target === checkoutModal) checkoutModal.classList.remove('open'); });

// ---- заказы: отправка на бэкенд ----
checkoutConfirm.addEventListener('click', async () => {
  const name = checkoutName.value.trim();
  const phone = checkoutPhone.value.trim();
  const address = checkoutAddress.value.trim();
  if (!name || !phone) { alert('Заполните имя и телефон'); return; }
  if (deliveryType === 'delivery' && address.length < 5) { alert('Укажите адрес доставки'); return; }

  const items = Array.from(cart.values()).map(i => ({
    id: i.id,
    dish_title: i.name,
    price: i.price,
    quantity: i.qty
  }));

  try {
    await apiCreateOrder({
      user_name: name,
      user_telephone: phone,
      delivery_type: deliveryType,
      address: deliveryType === 'pickup' ? `Самовывоз: ${STORE_ADDRESS}` : address,
      items: items
    });
    alert('Спасибо! Заказ отправлен — мы свяжемся с вами.');
    cart.clear();
    renderCart();
    checkoutModal.classList.remove('open');
  } catch (err) {
    alert('Ошибка при отправке заказа: ' + err.message);
  }
});

renderCart();
