# Spy Service - Настройка базы данных

## Шаги для настройки Supabase

### 1. Создание таблиц
1. Зайдите в Supabase Dashboard
2. Откройте SQL Editor
3. Скопируйте и выполните содержимое файла `database_schema.sql`

### 2. Настройка Storage
1. В Supabase Dashboard перейдите в Storage
2. Создайте новый bucket с именем `creatives-media`
3. Установите Public: `true`
4. В SQL Editor выполните содержимое файла `setup_storage.sql`

### 3. Структура данных

#### Справочники:
- `formats` - форматы креативов (teaser, video, banner, image)
- `types` - типы/вертикали (crypt, gambling, nutra, news, etc.)
- `placements` - каналы размещения (demand_gen, uac, facebook_ads, etc.)
- `platforms` - платформы (web, google, youtube, facebook, etc.)
- `countries` - страны (код ISO + название)

#### Основная таблица:
- `creatives` - рекламные креативы с привязкой к справочникам

### 4. API endpoints
После создания таблиц будут доступны REST endpoints:
- `GET /rest/v1/creatives` - получение креативов
- `POST /rest/v1/creatives` - создание креатива
- `GET /rest/v1/formats` - получение форматов
- `GET /rest/v1/types` - получение типов
- и т.д.

### 5. Фильтрация
Примеры запросов с фильтрами:
- По стране: `/rest/v1/creatives?country_code=eq.DE`
- По типу: `/rest/v1/creatives?type_id=eq.uuid`
- По дате: `/rest/v1/creatives?captured_at=gte.2024-01-01`
- Комбинированные: `/rest/v1/creatives?country_code=eq.DE&cloaking=eq.true`

### 6. Storage
Медиа-файлы загружаются в bucket `creatives-media`:
- Структура: `/{creative_id}/{filename}`
- Публичный доступ для чтения
- Аутентификация для загрузки/изменения

## Ключи Supabase
Ключи находятся в файле `supabase-keys.txt`
