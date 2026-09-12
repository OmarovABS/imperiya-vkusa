// ============================================================
// КОНФИГУРАЦИЯ АДМИН-ПАНЕЛИ (подключение к FastAPI бэкенду)
// ============================================================

// Relative — the admin panel is now served by the same FastAPI app as the
// API (see main.py), so this works on localhost and in production alike.
// If you ever host the admin panel separately from the backend, set this
// back to an absolute URL, e.g. 'https://api.your-domain.com'.
//
// NOTE: menu-data.js (loaded earlier on this page) also sets API_BASE_URL.
// A second top-level `const API_BASE_URL` would throw
// "Identifier 'API_BASE_URL' has already been declared" and silently kill
// the whole admin panel. So we set the shared global instead — bare
// references to API_BASE_URL in this file still resolve to it.
window.API_BASE_URL = window.API_BASE_URL || '';

// Ключ для хранения JWT токена в localStorage
const TOKEN_KEY = 'imperiya_admin_token';

// Получить токен из хранилища
function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// Сохранить токен
function setAuthToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

// Удалить токен (выход)
function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Проверить авторизацию
function isAuthenticated() {
  return !!getAuthToken();
}

// API запрос с авторизацией
async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...options.headers,
  };
  
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (response.status === 401) {
    clearAuthToken();
    window.location.reload();
    throw new Error('Сессия истекла. Войдите снова.');
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Ошибка запроса' }));
    throw new Error(error.detail || 'Ошибка запроса');
  }
  
  return response.json();
}

// Авторизация через бэкенд
async function apiLogin(username, password) {
  const formData = new FormData();
  formData.append('username', username);
  formData.append('password', password);
  
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Неверный логин или пароль' }));
    throw new Error(error.detail || 'Неверный логин или пароль');
  }
  
  const data = await response.json();
  setAuthToken(data.access_token);
  return data;
}