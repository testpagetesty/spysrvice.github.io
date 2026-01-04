# Проверка и исправление проблемы со странами

## Проблема
В дашборде и админке показываются только те страны, в которых есть креативы (Germany, Spain, Argentina, United States), вместо всех 61 страны из базы данных.

## Причина
Запрос с `withCounts=true` использует `LEFT JOIN`, который должен возвращать все страны, но возможно:
1. В базе данных не все страны загружены
2. Запрос работает правильно, но проблема в другом месте

## Решение

### Шаг 1: Проверить количество стран в БД

На сервере выполните:

```bash
psql -h localhost -U spyservice -d spyservice_db -c "SELECT COUNT(*) FROM countries;"
```

Должно быть **61 страна**. Если меньше - выполните:

```bash
cd /var/www/spy-dashboard
psql -h localhost -U spyservice -d spyservice_db -f database_schema.sql
```

### Шаг 2: Проверить API endpoint

```bash
curl http://localhost:3000/api/references/countries?withCounts=true | jq '.data | length'
```

Должно вернуть **61**.

### Шаг 3: Проверить, что запрос возвращает все страны

```bash
psql -h localhost -U spyservice -d spyservice_db -c "
SELECT 
  co.code,
  co.name,
  COUNT(c.id)::int as count
FROM countries co
LEFT JOIN creatives c ON c.country_code = co.code AND c.status = 'published'
GROUP BY co.code, co.name
ORDER BY co.name
LIMIT 10;
"
```

Должны быть показаны все страны, даже с count = 0.

### Шаг 4: Если стран меньше 61 - загрузить их

```bash
cd /var/www/spy-dashboard
psql -h localhost -U spyservice -d spyservice_db -f database_schema.sql
```

Введите пароль: `Kk199107991@`

### Шаг 5: Перезапустить приложение

```bash
pm2 restart spy-dashboard
```

### Шаг 6: Проверить в браузере

Обновите страницу - должны отображаться все 61 страна.

