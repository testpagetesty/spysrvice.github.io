# Исправление проблемы с загрузкой стран

## Проблема
В выпадающем списке стран отображаются только 4 страны вместо всех 61.

## Причина
В базе данных PostgreSQL не все страны загружены из `database_schema.sql`.

## Решение

### Вариант 1: Проверить количество стран в БД

На сервере выполните:

```bash
psql -h localhost -U spyservice -d spyservice_db -c "SELECT COUNT(*) FROM countries;"
```

Должно быть 61 страна. Если меньше - выполните:

```bash
psql -h localhost -U spyservice -d spyservice_db -f database_schema.sql
```

### Вариант 2: Исправить SQL запрос для стран

Если проблема в запросе с `withCounts=true`, он должен возвращать ВСЕ страны, даже без креативов. Запрос уже правильный (LEFT JOIN), но нужно убедиться, что данные есть в БД.

### Вариант 3: Проверить API endpoint

Проверьте работу API:

```bash
curl http://localhost:3000/api/references/countries?withCounts=true
```

Должен вернуть все страны из базы данных.

## Команды для проверки на сервере

```bash
# Подключение к БД
psql -h localhost -U spyservice -d spyservice_db

# Проверка количества стран
SELECT COUNT(*) FROM countries;

# Просмотр всех стран
SELECT code, name FROM countries ORDER BY name LIMIT 10;

# Если стран мало - выполните database_schema.sql
\q
psql -h localhost -U spyservice -d spyservice_db -f /var/www/spy-dashboard/database_schema.sql
```

