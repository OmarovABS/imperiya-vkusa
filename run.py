#!/usr/bin/env python3
"""
Скрипт для запуска бэкенда и открытия браузера.
Сначала запускает FastAPI сервер, ждёт инициализации, затем открывает сайт.
"""
import subprocess
import sys
import time
import webbrowser
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BACKEND_CMD = ["python", "-m", "app.main"]


def main():
    print("🚀 Запуск Империи Вкуса...")
    print("=" * 50)

    # Запускаем бэкенд в отдельном процессе
    print("📡 Запуск бэкенда (FastAPI)...")
    backend_process = subprocess.Popen(
        BACKEND_CMD,
        cwd=Path(__file__).parent,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True
    )

    # Ждём инициализации сервера
    print("⏳ Ожидание инициализации сервера...")
    time.sleep(3)

    # Проверяем, что процесс запущен
    if backend_process.poll() is not None:
        print("❌ Ошибка: бэкенд не запустился")
        print("Проверьте установку зависимостей: pip install -r requirements.txt")
        return

    print("✅ Бэкенд запущен успешно!")
    print("🌐 Открытие сайта в браузере...")

    # Открываем браузер
    webbrowser.open("http://localhost:8001")

    print("=" * 50)
    print("🎉 Сайт доступен по адресу: http://localhost:8001")
    print("📋 Админка: http://localhost:8001/admin.html")
    print("📚 API документация: http://localhost:8001/docs")
    print("=" * 50)
    print("💡 Нажмите Ctrl+C для остановки сервера")

    try:
        # Читаем вывод сервера
        for line in backend_process.stdout:
            print(line, end='')
    except KeyboardInterrupt:
        print("\n\n⏹️  Остановка сервера...")
        backend_process.terminate()
        backend_process.wait()
        print("✅ Сервер остановлен")


if __name__ == "__main__":
    main()