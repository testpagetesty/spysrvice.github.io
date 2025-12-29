# Настройка синхронизации настроек дашборда через Supabase

## Шаг 1: Создание таблицы в Supabase

1. Откройте Supabase Dashboard
2. Перейдите в SQL Editor
3. Выполните SQL скрипт из файла `create_dashboard_settings.sql`

Это создаст:
- Таблицу `dashboard_settings` для хранения настроек
- Начальные настройки по умолчанию
- Политики безопасности для публичного чтения

## Шаг 2: Проверка работы

После выполнения SQL скрипта:

1. Откройте админ-панель (`/admin`)
2. Перейдите в раздел "Настройка дашборда"
3. Измените видимость любого фильтра
4. Настройки автоматически сохранятся в Supabase
5. Откройте дашборд (`/`) - изменения применятся автоматически

## Как это работает

- **Админ-панель**: Сохраняет настройки через API `/api/dashboard-settings`
- **Дашборд**: Загружает настройки с сервера при загрузке страницы
- **Синхронизация**: Все устройства и пользователи видят одинаковые настройки
- **Fallback**: Если API недоступен, используется localStorage

## Структура данных

Настройки хранятся в формате:
```json
{
  "filters": {
    "date": true,
    "format": true,
    "type": true,
    "placement": true,
    "country": true,
    "platform": true,
    "cloaking": true
  },
  "display": {
    "itemsPerPage": 20,
    "defaultSort": "newest",
    "showThumbnails": true,
    "showDescriptions": true
  },
  "advanced": {
    "enableAutoRefresh": false,
    "autoRefreshInterval": 60,
    "enableNotifications": true
  }
}
```

