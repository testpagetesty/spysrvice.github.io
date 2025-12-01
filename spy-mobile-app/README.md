# Spy Service Mobile App

Android приложение для захвата и отправки рекламных креативов.

## Требования

- **Минимальная версия Android**: 10 (API level 29)
- **Целевая версия Android**: 14 (API level 34)
- **Kotlin**: 1.9.20
- **Gradle**: 8.2.0

## Структура проекта

```
app/
├── src/main/
│   ├── java/com/spyservice/mobile/
│   │   ├── data/
│   │   │   ├── api/          # Retrofit API клиенты
│   │   │   ├── model/         # Модели данных
│   │   │   └── repository/    # Репозитории
│   │   ├── service/           # Сервисы (Accessibility, Overlay)
│   │   └── ui/
│   │       ├── main/          # Главный экран
│   │       └── settings/     # Экран настроек
│   └── res/                   # Ресурсы (layouts, strings, etc.)
```

## API Endpoints

### Создание креатива
```
POST https://spysrvice-github-io-2b22.vercel.app/api/creatives
Content-Type: multipart/form-data
```

### Получение справочников
```
GET https://oilwcbfyhutzyjzlqbuk.supabase.co/rest/v1/formats
GET https://oilwcbfyhutzyjzlqbuk.supabase.co/rest/v1/types
GET https://oilwcbfyhutzyjzlqbuk.supabase.co/rest/v1/placements
GET https://oilwcbfyhutzyjzlqbuk.supabase.co/rest/v1/platforms
GET https://oilwcbfyhutzyjzlqbuk.supabase.co/rest/v1/countries
```

## Разрешения

- `INTERNET` - для API запросов
- `SYSTEM_ALERT_WINDOW` - для overlay окна
- `BIND_ACCESSIBILITY_SERVICE` - для Accessibility Service
- `READ_EXTERNAL_STORAGE` - для чтения файлов
- `FOREGROUND_SERVICE` - для фоновых задач

## Сборка

```bash
./gradlew assembleDebug
```

## Установка

1. Включите "Установку из неизвестных источников"
2. Установите APK файл
3. Предоставьте необходимые разрешения:
   - Overlay permission
   - Accessibility Service
   - Storage permission

## Использование

1. При первом запуске откройте Settings и настройте параметры
2. Нажмите кнопку Capture для захвата креатива
3. Данные автоматически сохраняются локально и отправляются на сервер

