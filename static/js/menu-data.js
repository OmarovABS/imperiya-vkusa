// ===================== МЕНЮ (подключение к FastAPI бэкенду) =====================
// Блюда загружаются из бэкенда API. Если бэкенд недоступен (сайт открыт как
// файл file:// или на статическом хостинге), используется STATIC_MENU ниже,
// поэтому сайт выглядит одинаково в обоих режимах. Чтобы меню показывалось и
// без сервера, заполните STATIC_MENU так же, как товары в базе данных.

const TAG_CLASS_MAP = { 'Хит': 'tag-hit', 'Острый': 'tag-hot', 'Новинка': 'tag-new' };

// Резервное меню для работы без бэкенда. Дублирует товары из базы данных.
// Новые блюда, добавленные через админку, показываются на сайте через сервер
// автоматически; чтобы они были видны и без сервера — добавьте их сюда.
const STATIC_MENU = {
  pizza: [
    {
      id: 32,
      name: 'Пепперони',
      desc: 'Пицца «Пепперони» — это один из самых популярных и узнаваемых видов пиццы в мире, отличающийся своим минималистичным составом и пикантным, островатым вкусом',
      price: 400,
      img: 'https://zmktver.ru/upload/medialibrary/b58/tsq661cf7s2d73d8b0v8pp8jnj68xsjd/2149187953.jpg',
      alt: 'Пепперони',
      tag: '',
      tagClass: '',
      soldout: false
    }
  ],
  rolls: [],
  burgers: [],
  snacks: []
};
// Relative — works whether the site runs on localhost or a real domain,
// since main.py now serves the frontend and the API from the same origin.
// Set as a shared global so it can be safely defined once even when both
// menu-data.js and admin-config.js are loaded on the same page.
window.API_BASE_URL = window.API_BASE_URL || '';

// Приводит путь к изображению к абсолютному URL:
// - пути бэкенда (/static/...) склеиваются с API_BASE_URL
// - абсолютные http(s) возвращаются как есть
// - локальные пути (img/...) возвращаются как есть
function resolveImageUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return API_BASE_URL + url;
  return url;
}

// Флаг: удалось ли связаться с бэкендом. true = каталог не загрузился
// (сайт открыт как файл file:// или сервер не запущен).
window.MENU_LOAD_FAILED = false;

async function fetchMenuData() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/products`);
    if (!response.ok) {
      console.warn('Бэкенд недоступен, использую STATIC_MENU. Статус:', response.status);
      return STATIC_MENU;
    }
    window.MENU_LOAD_FAILED = false;
    
    const dishes = await response.json();
    const grouped = { pizza: [], rolls: [], burgers: [], snacks: [] };
    
    dishes.forEach(d => {
      if (!grouped[d.category]) return;
      grouped[d.category].push({
        id: d.id,
        name: d.name,
        desc: d.description,
        price: d.price,
        img: resolveImageUrl(d.image_url) || 'img/dishes/placeholder.jpg',
        alt: d.name,
        tag: '', // Бэкенд пока не поддерживает теги
        tagClass: '',
        soldout: !d.is_available
      });
    });
    
    return grouped;
  } catch (e) {
    console.warn('Бэкенд недоступен, использую STATIC_MENU:', e);
    return STATIC_MENU;
  }
}

const ORDERS_STORAGE_KEY = 'imperiya_orders';

function loadOrders() {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) { return []; }
}

function saveOrders(list) {
  try { localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
}

async function apiCreateOrder(orderData) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer_name: orderData.user_name,
        phone: orderData.user_telephone,
        address: orderData.address || 'Кизляр, ул. Победы 91/1',
        items: (orderData.items || []).map(i => ({
          product_id: i.id || 0,
          product_name: i.dish_title,
          quantity: i.quantity,
          price: i.price
        }))
      })
    });
    
    if (!response.ok) {
      console.error('Ошибка создания заказа:', response.status);
      // Fallback to localStorage if backend fails
      return await apiCreateOrderFallback(orderData);
    }
    
    return await response.json();
  } catch (e) {
    console.error('Ошибка создания заказа:', e);
    // Fallback to localStorage if backend fails
    return await apiCreateOrderFallback(orderData);
  }
}

// Fallback function for localStorage if backend is unavailable
async function apiCreateOrderFallback(orderData) {
  const orders = loadOrders();
  const now = new Date();
  const newOrder = {
    id: orders.reduce((m, o) => Math.max(m, o.id || 0), 0) + 1,
    user_name: orderData.user_name,
    user_telephone: orderData.user_telephone,
    delivery_type: orderData.delivery_type || 'delivery',
    total_price: (orderData.items || []).reduce((s, i) => s + (parseFloat(i.price) || 0) * (i.quantity || 1), 0),
    done: false,
    created_at: now.toISOString(),
    items: (orderData.items || []).map(i => ({
      dish_title: i.dish_title,
      price: i.price,
      quantity: i.quantity
    }))
  };
  orders.unshift(newOrder);
  saveOrders(orders);
  return newOrder;
}