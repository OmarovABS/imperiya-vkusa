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

  const infoBtn = document.createElement('button');
  infoBtn.className = 'food-info-btn';
  infoBtn.type = 'button';
  infoBtn.textContent = 'i';
  infoBtn.title = 'Описание';
  infoBtn.setAttribute('aria-label', 'Показать описание');
  infoBtn.setAttribute('aria-expanded', 'false');
  infoBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = !card.classList.contains('open');
    closeOpenCards();
    if (willOpen) {
      card.classList.add('open');
      infoBtn.setAttribute('aria-expanded', 'true');
    }
  });
  media.appendChild(infoBtn);

  card.appendChild(media);

  const body = document.createElement('div');
  body.className = 'food-body';

  const h3 = document.createElement('h3');
  h3.textContent = item.name;
  body.appendChild(h3);

  const p = document.createElement('p');
  p.className = 'food-desc';
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

function closeOpenCards(except) {
  document.querySelectorAll('.food-card.open').forEach(card => {
    if (card === except) return;
    card.classList.remove('open');
    const btn = card.querySelector('.food-info-btn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  });
}

document.addEventListener('click', (e) => {
  closeOpenCards(e.target.closest('.food-card'));
});

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

// ---- живая синхронизация с бэкендом ----
// Меню опрашивается каждые 5 секунд, поэтому блюда, добавленные через
// админку, появляются на сайте автоматически без перезагрузки страницы.
async function refreshMenuFromAPI() {
  try {
    const data = await fetchMenuData();
    if (!data) return;
    if (JSON.stringify(data) !== JSON.stringify(menuCache)) {
      menuCache = data;
      menuAnimOn = false;
      ['pizza', 'rolls', 'burgers', 'snacks'].forEach(cat => {
        const count = menuCountPerCat[cat] || MENU_PAGE_SIZE;
        renderCategory(cat, count);
      });
    }
  } catch (e) { /* ignore */ }
}

setInterval(() => { refreshMenuFromAPI(); }, 5000);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') refreshMenuFromAPI();
});

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
const checkoutEmail = document.getElementById('checkoutEmail');
const checkoutPhone = document.getElementById('checkoutPhone');
const checkoutAddress = document.getElementById('checkoutAddress');
const checkoutAddressField = document.getElementById('checkoutAddressField');
const checkoutConfirm = document.getElementById('checkoutConfirm');
const checkoutCancel = document.getElementById('checkoutCancel');
const STORE_ADDRESS = 'Кизляр, ул. Победы 91/1';
const WHATSAPP_NUMBER = '79898851080'; // Номер телефона для WhatsApp (без +)

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
  checkoutName.value = ''; checkoutEmail.value = ''; checkoutPhone.value = ''; checkoutAddress.value = '';
  checkoutAddressField.style.display = deliveryType === 'pickup' ? 'none' : '';
  checkoutModal.classList.add('open');
});

checkoutCancel.addEventListener('click', () => checkoutModal.classList.remove('open'));
checkoutModal.addEventListener('click', e => { if (e.target === checkoutModal) checkoutModal.classList.remove('open'); });

// ---- заказы: отправка в WhatsApp ----
checkoutConfirm.addEventListener('click', () => {
  const name = checkoutName.value.trim();
  const email = checkoutEmail.value.trim();
  const phone = checkoutPhone.value.trim();
  const address = checkoutAddress.value.trim();
  const consent = document.getElementById('checkoutConsent').checked;

  if (!name || !phone) { alert('Заполните имя и телефон'); return; }
  if (deliveryType === 'delivery' && address.length < 5) { alert('Укажите адрес доставки'); return; }
  if (!consent) { alert('Необходимо согласие на обработку персональных данных'); return; }

  // Формируем красивое сообщение для WhatsApp
  let message = `🍕 *Новый заказ от NightBite*\n\n`;
  message += `👤 Имя: ${name}\n`;
  if (email) message += `📧 Email: ${email}\n`;
  message += `📱 Телефон: ${phone}\n`;
  message += `📍 Адрес: ${deliveryType === 'pickup' ? `Самовывоз: ${STORE_ADDRESS}` : address}\n\n`;
  message += `📦 *Заказ:*\n`;

  let total = 0;
  cart.forEach(i => {
    const itemTotal = i.price * i.qty;
    total += itemTotal;
    message += `• ${i.name} × ${i.qty} — ${fmt(itemTotal)}\n`;
  });

  message += `\n💰 *Итого: ${fmt(total)}*`;

  // Кодируем сообщение для URL
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;

  // Открываем WhatsApp в новой вкладке
  window.open(whatsappUrl, '_blank');

  // Очищаем корзину и закрываем модалку
  cart.clear();
  renderCart();
  checkoutModal.classList.remove('open');
});

renderCart();
