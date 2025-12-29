-- Скрипт для удаления лишних данных из справочников
-- Выполнить в SQL Editor в Supabase после обновления database_schema.sql

-- Удаляем лишние форматы (оставляем только 'teaser')
DELETE FROM formats WHERE code NOT IN ('teaser');

-- Удаляем лишние размещения (оставляем только 'demand_gen')
DELETE FROM placements WHERE code NOT IN ('demand_gen');

-- Удаляем лишние платформы (оставляем только 'youtube' и 'discovery')
DELETE FROM platforms WHERE code NOT IN ('youtube', 'discovery');

-- Проверяем результат
SELECT 'Formats' as table_name, code, name FROM formats
UNION ALL
SELECT 'Placements' as table_name, code, name FROM placements
UNION ALL
SELECT 'Platforms' as table_name, code, name FROM platforms
ORDER BY table_name, code;

