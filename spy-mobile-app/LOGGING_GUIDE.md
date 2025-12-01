# 📋 Руководство по логированию SpyService

## 🏷️ Теги логирования

Все логи используют централизованную систему с тегами:

### Основные теги:
- `SpyService_App` - Инициализация приложения
- `SpyService_Repository` - Работа репозиториев
- `SpyService_Service` - Сервисы (Capture, Screenshot, etc.)
- `SpyService_UI` - UI компоненты (Activity, ViewModel)
- `SpyService_Capture` - Процесс захвата креативов
- `SpyService_Screenshot` - Создание скриншотов
- `SpyService_Database` - Работа с базой данных
- `SpyService_Network` - Сетевые запросы
- `SpyService_Permission` - Разрешения системы
- `SpyService_ERROR` - Критические ошибки

## 🔍 Как читать логи

### 1. Фильтрация в Android Studio Logcat:
```
SpyService
```

### 2. Фильтрация по конкретному компоненту:
```
SpyService_Capture
SpyService_Screenshot
SpyService_Permission
```

### 3. Фильтрация по типу сообщения:
- `🔍` - Debug информация
- `ℹ️` - Информационные сообщения
- `⚠️` - Предупреждения
- `❌` - Ошибки
- `📋 STEP` - Пошаговое выполнение
- `✅ SUCCESS` - Успешные операции
- `💥 FAILURE` - Критические ошибки
- `🎯 CHECKPOINT` - Контрольные точки с данными

## 📊 Ключевые checkpoint'ы для отладки

### При запуске приложения:
```
SpyService_App: 🎯 CHECKPOINT [PRE_INIT]
SpyService_App: 🎯 CHECKPOINT [POST_INIT]
```

### При захвате креатива:
```
SpyService_Capture: 🎯 CHECKPOINT [PRE_CAPTURE]
SpyService_Screenshot: 🎯 CHECKPOINT [PERMISSION_CHECK]
SpyService_Service: 🎯 CHECKPOINT [CAPTURE_INIT]
SpyService_Capture: 🎯 CHECKPOINT [FILES_CHECK]
```

### При проблемах с разрешениями:
```
SpyService_Permission: 🎯 CHECKPOINT [MEDIA_PROJECTION_RESULT]
SpyService_Permission: 🎯 CHECKPOINT [PERMISSION_GRANTED]
```

## 🚨 Типичные проблемы и их логи

### 1. MediaProjection не инициализирован:
```
SpyService_Screenshot: ❌ FAILURE: MediaProjection not initialized!
SpyService_Permission: ⚠️ User needs to grant screen capture permission first!
```

### 2. Сервисы не инициализированы:
```
SpyService_Repository: ❌ FAILURE: Capture service is null!
SpyService_Capture: ❌ FAILURE: Capture service not initialized
```

### 3. Файлы не создаются:
```
SpyService_Capture: 🎯 CHECKPOINT [FILES_CHECK] landingImage=null, screenshot=null
SpyService_Screenshot: ❌ FAILURE: Screen capture returned null bitmap
```

### 4. Проблемы с базой данных:
```
SpyService_Database: ❌ FAILURE: Error saving creative to local DB
```

## 🔧 Отладка по шагам

### Шаг 1: Проверить инициализацию приложения
Искать: `SpyService_App`
Ожидать: `✅ SUCCESS: Application initialized successfully`

### Шаг 2: Проверить разрешения
Искать: `SpyService_Permission`
Ожидать: `🎯 CHECKPOINT [PERMISSION_GRANTED] mediaProjection=true`

### Шаг 3: Проверить инициализацию сервисов
Искать: `SpyService_Repository`
Ожидать: `✅ SUCCESS: CaptureService created successfully`

### Шаг 4: Проверить процесс захвата
Искать: `SpyService_Capture`
Следить за: `📋 STEP 1`, `📋 STEP 2`, `📋 STEP 3`

### Шаг 5: Проверить создание файлов
Искать: `SpyService_Screenshot`
Ожидать: `✅ SUCCESS: Screen captured successfully`

## 📱 Команды для терминала

### Фильтрация логов через adb:
```bash
# Все логи SpyService
adb logcat | grep "SpyService"

# Только ошибки
adb logcat | grep "SpyService.*❌\|SpyService.*💥"

# Только процесс захвата
adb logcat | grep "SpyService_Capture\|SpyService_Screenshot"

# Только разрешения
adb logcat | grep "SpyService_Permission"
```

## 🎯 Быстрая диагностика

1. **Приложение не запускается** → `SpyService_App`
2. **Кнопка захвата не работает** → `SpyService_UI`
3. **Нет скриншотов** → `SpyService_Screenshot` + `SpyService_Permission`
4. **Данные не сохраняются** → `SpyService_Database`
5. **Сервисы не работают** → `SpyService_Repository` + `SpyService_Service`
