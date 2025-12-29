-- Скрипт для обновления данных в Supabase
-- Выполнить в SQL Editor в Supabase
-- Этот скрипт очистит лишние данные и оставит только нужные значения

-- 1. Добавляем платформу Discovery, если её нет
INSERT INTO platforms (code, name)
VALUES ('discovery', 'Discovery')
ON CONFLICT (code) 
DO UPDATE SET name = 'Discovery';

-- 2. Удаляем лишние платформы (оставляем только 'youtube' и 'discovery')
-- ВНИМАНИЕ: Перед удалением проверьте, нет ли креативов, связанных с удаляемыми платформами
-- Если есть, их нужно будет обновить или удалить

-- Сначала обновляем креативы с удаляемыми платформами на youtube или discovery
-- Если хотите сохранить данные, раскомментируйте и настройте эту часть:
-- UPDATE creatives 
-- SET platform_id = (SELECT id FROM platforms WHERE code = 'youtube')
-- WHERE platform_id IN (SELECT id FROM platforms WHERE code NOT IN ('youtube', 'discovery'));

-- Удаляем лишние платформы
DELETE FROM platforms WHERE code NOT IN ('youtube', 'discovery');

-- 3. Удаляем лишние размещения (оставляем только 'demand_gen')
-- ВНИМАНИЕ: Перед удалением проверьте, нет ли креативов, связанных с удаляемыми размещениями

-- Обновляем креативы с удаляемыми размещениями на demand_gen (если нужно):
-- UPDATE creatives 
-- SET placement_id = (SELECT id FROM placements WHERE code = 'demand_gen')
-- WHERE placement_id IN (SELECT id FROM placements WHERE code != 'demand_gen');

DELETE FROM placements WHERE code != 'demand_gen';

-- 4. Удаляем лишние форматы (оставляем только 'teaser')
-- ВНИМАНИЕ: Перед удалением проверьте, нет ли креативов, связанных с удаляемыми форматами

-- Обновляем креативы с удаляемыми форматами на teaser (если нужно):
-- UPDATE creatives 
-- SET format_id = (SELECT id FROM formats WHERE code = 'teaser')
-- WHERE format_id IN (SELECT id FROM formats WHERE code != 'teaser');

DELETE FROM formats WHERE code != 'teaser';

-- 5. Проверяем результат
SELECT 'Platforms' as table_name, code, name FROM platforms ORDER BY code;
SELECT 'Placements' as table_name, code, name FROM placements ORDER BY code;
SELECT 'Formats' as table_name, code, name FROM formats ORDER BY code;

-- 6. Проверяем, остались ли креативы с несуществующими связями
-- (должно вернуть 0 строк, если все в порядке)
SELECT 
    'Creatives with invalid platform_id' as issue,
    COUNT(*) as count
FROM creatives c
LEFT JOIN platforms p ON c.platform_id = p.id
WHERE c.platform_id IS NOT NULL AND p.id IS NULL

UNION ALL

SELECT 
    'Creatives with invalid placement_id' as issue,
    COUNT(*) as count
FROM creatives c
LEFT JOIN placements pl ON c.placement_id = pl.id
WHERE c.placement_id IS NOT NULL AND pl.id IS NULL

UNION ALL

SELECT 
    'Creatives with invalid format_id' as issue,
    COUNT(*) as count
FROM creatives c
LEFT JOIN formats f ON c.format_id = f.id
WHERE c.format_id IS NOT NULL AND f.id IS NULL;

