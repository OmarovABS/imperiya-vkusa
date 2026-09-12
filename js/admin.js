// ===================== АДМИН-ПАНЕЛЬ (подключение к FastAPI бэкенду) =====================
// Все данные хранятся в базе данных SQLite на бэкенде.

const CATEGORY_LABELS = { pizza:'Пиццы', rolls:'Роллы', burgers:'Бургеры', snacks:'Закуски' };

let products = [];
let orders = [];
let activeCategory = 'pizza';
let searchTerm = '';
let editingId = null;
let deletingId = null;

// ---------- аутентификация ----------
function checkSession() {
  if (isAuthenticated()) {
    unlockAdmin();
  } else {
    showLogin();
  }
}

// ---------- хранилище ----------
// Данные теперь хранятся в бэкенде, localStorage не используется

// ---------- API-обёртки (бэкенд) ----------
async function apiGetMenu() {
  return await apiRequest('/api/products');
}

async function apiCreateDish(data) {
  const formData = new FormData();
  formData.append('name', data.title);
  formData.append('price', data.price);
  formData.append('category', data.category);
  formData.append('description', data.description || '');
  formData.append('is_available', !data.soldout);
  // Для загрузки файла изображения нужно использовать multipart/form-data
  // Пока используем URL изображения
  formData.append('image_url', data.img || '');
  
  return await apiRequest('/api/admin/products', {
    method: 'POST',
    body: formData,
    headers: {} // Content-Type set automatically for FormData
  });
}

async function apiUpdateDish(id, data) {
  const formData = new FormData();
  if (data.title !== undefined) formData.append('name', data.title);
  if (data.price !== undefined) formData.append('price', data.price);
  if (data.category !== undefined) formData.append('category', data.category);
  if (data.description !== undefined) formData.append('description', data.description);
  if (data.soldout !== undefined) formData.append('is_available', !data.soldout);
  if (data.img !== undefined) formData.append('image_url', data.img);
  
  return await apiRequest(`/api/admin/products/${id}`, {
    method: 'PUT',
    body: formData,
    headers: {}
  });
}

async function apiDeleteDish(id) {
  return await apiRequest(`/api/admin/products/${id}`, {
    method: 'DELETE'
  });
}

async function apiGetOrders() {
  return await apiRequest('/api/admin/orders');
}

async function apiDeleteOrder(id) {
  return await apiRequest(`/api/admin/orders/${id}`, {
    method: 'DELETE'
  });
}

async function apiUpdateOrderStatus(id, status) {
  return await apiRequest(`/api/admin/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}

async function apiClearOrders() {
  return await apiRequest('/api/admin/orders', {
    method: 'DELETE'
  });
}

// ---------- utils ----------
function showToast(text){
  const toast = document.getElementById('adminToast');
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2200);
}

const fmtMoney = n => n.toLocaleString('ru-RU') + ' \u20BD';

function formatTime(ts){
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}.${mm} ${hh}:${mi}`;
}

// ---------- загрузка данных ----------
async function loadProducts(){
  try {
    const dishes = await apiGetMenu();
    products = dishes.map(d => ({
      id: d.id,
      category: d.category,
      name: d.name,
      desc: d.description,
      price: d.price,
      img: resolveImageUrl(d.image_url) || '/img/dishes/placeholder.jpg',
      rawImg: d.image_url || '',
      alt: d.name,
      tag: '', // Бэкенд пока не поддерживает теги
      tagClass: '',
      soldout: !d.is_available
    }));
  } catch (e) {
    console.error('Не удалось загрузить меню:', e);
    products = [];
  }
}

async function loadOrdersData(){
  try {
    const backendOrders = await apiGetOrders();
    orders = backendOrders.map(o => ({
      id: o.id,
      user_name: o.customer_name,
      user_telephone: o.phone,
      total_price: o.total_price,
      created_at: o.created_at,
      done: o.status === 'completed',
      delivery_type: 'delivery', // По умолчанию доставка
      items: o.items.map(i => ({
        dish_title: i.product_name,
        quantity: i.quantity,
        price: i.price
      }))
    }));
  } catch (e) {
    console.error('Не удалось загрузить заказы:', e);
    orders = [];
  }
}

// ---------- rendering ----------
function renderStats(){
  const total = products.length;
  const pizza = products.filter(p => p.category === 'pizza').length;
  const rolls = products.filter(p => p.category === 'rolls').length;
  const other = products.filter(p => p.category === 'burgers' || p.category === 'snacks').length;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todays = orders.filter(o => new Date(o.created_at).getTime() >= todayStart);
  const profit = todays.reduce((s, o) => s + parseFloat(o.total_price || 0), 0);
  document.getElementById('statTotal').textContent = total;
  document.getElementById('statPizza').textContent = pizza;
  document.getElementById('statRolls').textContent = rolls;
  document.getElementById('statOther').textContent = other;
  document.getElementById('statOrders').textContent = todays.length;
  document.getElementById('statProfit').textContent = fmtMoney(profit);
}

function matchesFilters(p){
  const inCat = p.category === activeCategory;
  const inSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm);
  return inCat && inSearch;
}

const ADMIN_PAGE_SIZE = 6;
let adminVisibleCount = ADMIN_PAGE_SIZE;
let adminSentinelObserver = null;

function renderGrid(){
  adminVisibleCount = ADMIN_PAGE_SIZE;
  renderGridBatch();
}

function renderGridBatch(){
  const grid = document.getElementById('productGrid');
  const list = products.filter(matchesFilters);

  if (list.length === 0){
    grid.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'admin-empty';
    empty.textContent = 'Товары не найдены. Измените фильтр или добавьте новый товар.';
    grid.appendChild(empty);
    return;
  }

  grid.innerHTML = '';
  const slice = list.slice(0, adminVisibleCount);
  slice.forEach((p, idx) => grid.appendChild(createAdminCard(p, idx)));

  let sentinel = grid.querySelector('.admin-load-more');
  if (!sentinel){
    sentinel = document.createElement('div');
    sentinel.className = 'admin-load-more';
    grid.appendChild(sentinel);
  }

  if (list.length <= adminVisibleCount){
    sentinel.style.display = 'none';
  } else {
    sentinel.style.display = '';
    observeSentinel(sentinel);
  }
}

function loadMoreProducts(){
  adminVisibleCount += ADMIN_PAGE_SIZE;
  const grid = document.getElementById('productGrid');
  const list = products.filter(matchesFilters);
  if (adminVisibleCount > list.length) adminVisibleCount = list.length;
  const slice = list.slice(0, adminVisibleCount);
  grid.innerHTML = '';
  const startIdx = Math.max(0, adminVisibleCount - ADMIN_PAGE_SIZE);
  slice.forEach((p, idx) => grid.appendChild(createAdminCard(p, startIdx + idx)));

  let sentinel = grid.querySelector('.admin-load-more');
  if (list.length > adminVisibleCount){
    if (!sentinel){
      sentinel = document.createElement('div');
      sentinel.className = 'admin-load-more';
      grid.appendChild(sentinel);
    }
    observeSentinel(sentinel);
  }
}

function observeSentinel(sentinel){
  if (adminSentinelObserver) adminSentinelObserver.disconnect();
  adminSentinelObserver = new IntersectionObserver((entries) => {
    if (entries.some(e => e.isIntersecting)) loadMoreProducts();
  }, { rootMargin: '200px' });
  adminSentinelObserver.observe(sentinel);
}

function createAdminCard(p, animIndex){
  const card = document.createElement('div');
  card.className = 'food-card admin-card admin-anim' + (p.soldout ? ' is-soldout' : '');
  card.style.animationDelay = ((animIndex || 0) * 0.06) + 's';

  const media = document.createElement('div');
  media.className = 'food-media loaded';

  if (p.tag){
    const tagEl = document.createElement('span');
    tagEl.className = 'food-tag ' + (p.tagClass || TAG_CLASS_MAP[p.tag] || '');
    tagEl.textContent = p.tag;
    media.appendChild(tagEl);
  }

  const img = document.createElement('img');
  img.src = p.img;
  img.alt = p.alt || p.name;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.onerror = () => { img.style.opacity = '0.25'; };
  media.appendChild(img);

  const actions = document.createElement('div');
  actions.className = 'admin-card-actions';

  const outBtn = document.createElement('button');
  outBtn.className = 'icon-btn soldout' + (p.soldout ? ' on' : '');
  outBtn.type = 'button';
  outBtn.title = p.soldout ? 'В наличии' : 'Закончилось';
  outBtn.setAttribute('aria-label', 'Переключить наличие');
  outBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>';
  outBtn.addEventListener('click', () => toggleSoldout(p));
  actions.appendChild(outBtn);

  const editBtn = document.createElement('button');
  editBtn.className = 'icon-btn edit';
  editBtn.type = 'button';
  editBtn.setAttribute('aria-label', 'Редактировать');
  editBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
  editBtn.addEventListener('click', () => openModal(p));
  actions.appendChild(editBtn);

  const delBtn = document.createElement('button');
  delBtn.className = 'icon-btn delete';
  delBtn.type = 'button';
  delBtn.setAttribute('aria-label', 'Удалить');
  delBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>';
  delBtn.addEventListener('click', () => openConfirm(p));
  actions.appendChild(delBtn);

  media.appendChild(actions);

  const catChip = document.createElement('span');
  catChip.className = 'admin-card-cat';
  catChip.textContent = CATEGORY_LABELS[p.category] || p.category;
  media.appendChild(catChip);

  if (p.soldout){
    const badge = document.createElement('span');
    badge.className = 'admin-card-soldout';
    badge.textContent = 'Закончилось';
    media.appendChild(badge);
  }

  card.appendChild(media);

  const body = document.createElement('div');
  body.className = 'food-body';

  const h3 = document.createElement('h3');
  h3.textContent = p.name;
  body.appendChild(h3);

  const desc = document.createElement('p');
  desc.textContent = p.desc;
  body.appendChild(desc);

  const foot = document.createElement('div');
  foot.className = 'food-foot';
  const price = document.createElement('span');
  price.className = 'price';
  price.textContent = p.price + ' \u20BD';
  foot.appendChild(price);
  body.appendChild(foot);

  card.appendChild(body);
  return card;
}

// ---------- category filters ----------
document.getElementById('categoryFilters').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  document.querySelectorAll('#categoryFilters .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  activeCategory = btn.dataset.cat;
  renderGrid();
});

// ---------- search ----------
document.getElementById('searchInput').addEventListener('input', (e) => {
  searchTerm = e.target.value.trim().toLowerCase();
  renderGrid();
});

// ---------- add / edit modal ----------
const productModal = document.getElementById('productModal');
const pmTitle = document.getElementById('pmTitle');
const pmName = document.getElementById('pmName');
const pmCategory = document.getElementById('pmCategory');
const pmPrice = document.getElementById('pmPrice');
const pmTag = document.getElementById('pmTag');
const pmImg = document.getElementById('pmImg');
const pmDesc = document.getElementById('pmDesc');
const pmPreview = document.getElementById('pmPreview');

function updatePreview(){
  const url = resolveImageUrl(pmImg.value.trim());
  if (!url){
    pmPreview.textContent = 'Ссылка на фото появится здесь';
    return;
  }
  pmPreview.innerHTML = '';
  const img = document.createElement('img');
  img.src = url;
  img.alt = 'Предпросмотр';
  img.onerror = () => { pmPreview.textContent = 'Не удалось загрузить изображение'; };
  pmPreview.appendChild(img);
}
pmImg.addEventListener('input', updatePreview);

function openModal(product){
  editingId = product ? product.id : null;
  pmTitle.textContent = product ? 'Редактировать товар' : 'Новый товар';
  pmName.value = product ? product.name : '';
  pmCategory.value = product ? product.category : activeCategory;
  pmPrice.value = product ? product.price : '';
  pmTag.value = product ? (product.tag || '') : '';
  pmImg.value = product ? (product.rawImg || product.img) : '';
  pmDesc.value = product ? product.desc : '';
  updatePreview();
  productModal.classList.add('open');
  pmName.focus();
}
function closeModal(){ productModal.classList.remove('open'); editingId = null; }

document.getElementById('addFab').addEventListener('click', () => openModal(null));
document.getElementById('pmClose').addEventListener('click', closeModal);
document.getElementById('pmCancel').addEventListener('click', closeModal);
productModal.addEventListener('click', (e) => { if (e.target === productModal) closeModal(); });

document.getElementById('pmSave').addEventListener('click', async () => {
  const name = pmName.value.trim();
  const price = parseInt(pmPrice.value, 10);
  const img = pmImg.value.trim();
  const category = pmCategory.value;
  const desc = pmDesc.value.trim();
  const tag = pmTag.value;

  if (!name || !img || !price || price <= 0){
    showToast('Заполните название, цену и ссылку на фото');
    return;
  }

  try {
    if (editingId){
      await apiUpdateDish(editingId, {
        title: name,
        price: price,
        category: category,
        description: desc,
        img: img,
        tag: tag,
        alt: name,
        soldout: false
      });
      showToast('Товар обновлён');
    } else {
      await apiCreateDish({
        title: name,
        price: price,
        category: category,
        description: desc,
        img: img,
        tag: tag,
        alt: name,
        soldout: false
      });
      showToast('Товар добавлен');
    }
    await loadProducts();
    renderStats();
    renderGrid();
    closeModal();
  } catch (err) {
    showToast('Ошибка: ' + err.message);
  }
});

// ---------- soldout toggle ----------
async function toggleSoldout(p){
  try {
    await apiUpdateDish(p.id, { soldout: !p.soldout });
    await loadProducts();
    showToast(!p.soldout ? 'Товар отмечен как «Закончилось»' : 'Товар снова в наличии');
    renderStats();
    renderGrid();
  } catch (err) {
    showToast('Ошибка: ' + err.message);
  }
}

// ---------- delete confirm ----------
const confirmModal = document.getElementById('confirmModal');
const confirmText = document.getElementById('confirmText');

function openConfirm(product){
  deletingId = product.id;
  confirmText.textContent = `Удалить «${product.name}» из меню?`;
  confirmModal.classList.add('open');
}
function closeConfirm(){ confirmModal.classList.remove('open'); deletingId = null; }

document.getElementById('confirmCancel').addEventListener('click', closeConfirm);
confirmModal.addEventListener('click', (e) => { if (e.target === confirmModal) closeConfirm(); });
document.getElementById('confirmDelete').addEventListener('click', async () => {
  if (!deletingId) return;
  try {
    await apiDeleteDish(deletingId);
    await loadProducts();
    showToast('Товар удалён');
    renderStats();
    renderGrid();
    closeConfirm();
  } catch (err) {
    showToast('Ошибка: ' + err.message);
  }
});

// ---------- orders rendering ----------
function createOrderCard(o){
  const card = document.createElement('div');
  card.className = 'order-card' + (o.done ? ' done' : '');

  const head = document.createElement('div');
  head.className = 'order-head';

  const status = document.createElement('span');
  status.className = 'order-status' + (o.done ? ' on' : '');
  status.textContent = o.done ? 'Выполнен' : 'Новый';

  const meta = document.createElement('div');
  meta.className = 'order-meta';
  const typeLabel = o.delivery_type === 'delivery' ? 'Доставка' : 'Самовывоз';
  const idLabel = o.id ? '#' + o.id : '';
  meta.textContent = [formatTime(o.created_at), typeLabel, idLabel].filter(Boolean).join(' \u00B7 ');

  head.appendChild(status);
  head.appendChild(meta);
  card.appendChild(head);

  const link = document.createElement('div');
  link.className = 'order-customer';
  const nameEl = document.createElement('b');
  nameEl.textContent = o.user_name;
  link.appendChild(nameEl);
  if (o.user_telephone){
    const tel = document.createElement('a');
    tel.href = 'tel:' + o.user_telephone.replace(/[^\d+]/g, '');
    tel.textContent = o.user_telephone;
    link.appendChild(tel);
  }
  card.appendChild(link);

  const items = document.createElement('div');
  items.className = 'order-items';
  (o.items || []).forEach(i => {
    const row = document.createElement('div');
    row.className = 'order-item';
    const name = document.createElement('span');
    name.textContent = `${i.dish_title} \u00D7 ${i.quantity}`;
    const price = document.createElement('b');
    price.textContent = fmtMoney(parseFloat(i.price) * i.quantity);
    row.appendChild(name);
    row.appendChild(price);
    items.appendChild(row);
  });
  card.appendChild(items);

  const foot = document.createElement('div');
  foot.className = 'order-foot';

  const total = document.createElement('span');
  total.className = 'order-total';
  total.textContent = fmtMoney(parseFloat(o.total_price || 0));
  foot.appendChild(total);

  const controls = document.createElement('div');
  controls.className = 'order-controls';

  const doneBtn = document.createElement('button');
  doneBtn.className = 'icon-btn order-done' + (o.done ? ' on' : '');
  doneBtn.type = 'button';
  doneBtn.title = o.done ? 'Вернуть в «Новые»' : 'Отметить выполненным';
  doneBtn.setAttribute('aria-label', 'Отметить выполненным');
  doneBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 6 9 17l-5-5"/></svg>';
  doneBtn.addEventListener('click', () => toggleOrderDone(o));
  controls.appendChild(doneBtn);

  const delBtn = document.createElement('button');
  delBtn.className = 'icon-btn order-del';
  delBtn.type = 'button';
  delBtn.title = 'Удалить заказ';
  delBtn.setAttribute('aria-label', 'Удалить заказ');
  delBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>';
  delBtn.addEventListener('click', () => deleteOrder(o));
  controls.appendChild(delBtn);

  foot.appendChild(controls);
  card.appendChild(foot);

  return card;
}

function renderOrders(){
  const listContainer = document.getElementById('ordersList');
  const countEl = document.getElementById('ordersCount');
  listContainer.innerHTML = '';
  countEl.textContent = 'Заказов: ' + orders.length;

  if (orders.length === 0){
    const empty = document.createElement('div');
    empty.className = 'admin-empty';
    empty.textContent = 'Здесь появятся заказы с сайта — посетитель оформляет заказ, и он приходит сюда автоматически.';
    listContainer.appendChild(empty);
    return;
  }

  orders.forEach(o => listContainer.appendChild(createOrderCard(o)));
}

async function toggleOrderDone(o){
  try {
    await apiUpdateOrderStatus(o.id, o.done ? 'pending' : 'completed');
    await refreshOrders();
    showToast(o.done ? 'Заказ возвращён в «Новые»' : 'Заказ отмечен выполненным');
  } catch (e) {
    showToast('Ошибка: ' + e.message);
  }
}

async function deleteOrder(o){
  try {
    await apiDeleteOrder(o.id);
    await refreshOrders();
    showToast('Заказ удалён');
  } catch (e) {
    showToast('Ошибка: ' + e.message);
  }
}

document.getElementById('clearOrders').addEventListener('click', async () => {
  if (!orders.length) return;
  if (!confirm('Удалить все заказы? Это действие нельзя отменить.')) return;
  try {
    await apiClearOrders();
    await refreshOrders();
    showToast('Все заказы удалены');
  } catch (e) {
    showToast('Ошибка: ' + e.message);
  }
});

// ---------- section switch (товары / заказы) ----------
document.getElementById('sectionTabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  document.querySelectorAll('#sectionTabs .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const section = btn.dataset.section;
  document.getElementById('productsSection').style.display = section === 'products' ? '' : 'none';
  document.getElementById('ordersSection').style.display = section === 'orders' ? '' : 'none';
  if (section === 'orders') renderOrders();
});

// ---------- автообновление заказов ----------
let refreshTimer = null;

function stopAutoRefresh() {
  if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
}

function startAutoRefresh() {
  stopAutoRefresh();
  refreshTimer = setInterval(refreshOrders, 10000);
}

async function refreshOrders(){
  try {
    await loadOrdersData();
    renderStats();
    renderOrders();
  } catch (e) { /* ignore */ }
}

// ---------- экран входа / разблокировка ----------
function showLogin() {
  const gate = document.getElementById('loginGate');
  gate.style.display = '';
  gate.classList.add('open');
  document.getElementById('adminShell').style.display = 'none';
  document.getElementById('addFab').style.display = 'none';
  stopAutoRefresh();
}

function unlockAdmin() {
  document.getElementById('loginGate').classList.remove('open');
  document.getElementById('loginGate').style.display = 'none';
  document.getElementById('adminShell').style.display = '';
  document.getElementById('addFab').style.display = '';
  startAutoRefresh();
  init();
}

// ---------- логин ----------
document.getElementById('loginSubmit').addEventListener('click', handleLogin);
['loginUsername', 'loginPassword'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
});

async function handleLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  errEl.style.display = 'none';
  const btn = document.getElementById('loginSubmit');
  btn.disabled = true;
  btn.textContent = 'Вход…';
  try {
    await apiLogin(username, password);
    document.getElementById('loginPassword').value = '';
    unlockAdmin();
  } catch (e) {
    errEl.textContent = e.message;
    errEl.style.display = '';
    document.getElementById('loginPassword').value = '';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Войти';
  }
}

// ---------- init ----------
async function init() {
  await Promise.all([loadProducts(), loadOrdersData()]);
  renderStats();
  renderGrid();
  renderOrders();
}

// ---------- вход/выход ----------
function logoutAdmin() {
  clearAuthToken();
  showLogin();
}
document.getElementById('logoutBtn').addEventListener('click', logoutAdmin);

// При загрузке: панель открывается, только если есть активная сессия.
checkSession();