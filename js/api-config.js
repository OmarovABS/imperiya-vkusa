// ============================================================
// КОНФИГУРАЦИЯ АДРЕСА БЭКЕНДА
// ============================================================
// Сайт и API хостятся раздельно:
//   - сайт (статика)  : Surge
//   - API (FastAPI)    : Render
//
// Подключомы ПЕРЕД menu-data.js / admin-config.js — они просто
// дополняют этот глобал (window.API_BASE_URL = window.API_BASE_URL || '').
// Если бэкенд ещё не задеплоен, оставьте 'https://imperiya-vkusa-api.onrender.com'.

window.API_BASE_URL = 'https://imperiya-vkusa-api.onrender.com';