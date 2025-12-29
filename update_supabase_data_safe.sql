-- Безопасный скрипт для обновления данных в Supabase
-- Выполнить в SQL Editor в Supabase
-- Этот скрипт сначала проверит и обновит связанные данные, затем очистит лишние записи

BEGIN;

-- 1. Добавляем платформу Discovery, если её нет
INSERT INTO platforms (code, name)
VALUES ('discovery', 'Discovery')
ON CONFLICT (code) 
DO UPDATE SET name = 'Discovery';

-- 2. Проверяем, сколько креативов используют удаляемые платформы
DO $$
DECLARE
    affected_count INTEGER;
BEGIN
    -- Обновляем креативы с удаляемыми платформами на youtube (если нужно сохранить данные)
    SELECT COUNT(*) INTO affected_count
    FROM creatives c
    JOIN platforms p ON c.platform_id = p.id
    WHERE p.code NOT IN ('youtube', 'discovery');
    
    IF affected_count > 0 THEN
        RAISE NOTICE 'Обнаружено % креативов с удаляемыми платформами. Обновляю на youtube...', affected_count;
        
        UPDATE creatives 
        SET platform_id = (SELECT id FROM platforms WHERE code = 'youtube' LIMIT 1)
        WHERE platform_id IN (
            SELECT id FROM platforms WHERE code NOT IN ('youtube', 'discovery')
        );
        
        RAISE NOTICE 'Обновлено % креативов', affected_count;
    ELSE
        RAISE NOTICE 'Креативов с удаляемыми платформами не найдено';
    END IF;
END $$;

-- Удаляем лишние платформы
DELETE FROM platforms WHERE code NOT IN ('youtube', 'discovery');

-- 3. Проверяем и обновляем размещения
DO $$
DECLARE
    affected_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO affected_count
    FROM creatives c
    JOIN placements p ON c.placement_id = p.id
    WHERE p.code != 'demand_gen';
    
    IF affected_count > 0 THEN
        RAISE NOTICE 'Обнаружено % креативов с удаляемыми размещениями. Обновляю на demand_gen...', affected_count;
        
        UPDATE creatives 
        SET placement_id = (SELECT id FROM placements WHERE code = 'demand_gen' LIMIT 1)
        WHERE placement_id IN (
            SELECT id FROM placements WHERE code != 'demand_gen'
        );
        
        RAISE NOTICE 'Обновлено % креативов', affected_count;
    ELSE
        RAISE NOTICE 'Креативов с удаляемыми размещениями не найдено';
    END IF;
END $$;

DELETE FROM placements WHERE code != 'demand_gen';

-- 4. Проверяем и обновляем форматы
DO $$
DECLARE
    affected_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO affected_count
    FROM creatives c
    JOIN formats f ON c.format_id = f.id
    WHERE f.code != 'teaser';
    
    IF affected_count > 0 THEN
        RAISE NOTICE 'Обнаружено % креативов с удаляемыми форматами. Обновляю на teaser...', affected_count;
        
        UPDATE creatives 
        SET format_id = (SELECT id FROM formats WHERE code = 'teaser' LIMIT 1)
        WHERE format_id IN (
            SELECT id FROM formats WHERE code != 'teaser'
        );
        
        RAISE NOTICE 'Обновлено % креативов', affected_count;
    ELSE
        RAISE NOTICE 'Креативов с удаляемыми форматами не найдено';
    END IF;
END $$;

DELETE FROM formats WHERE code != 'teaser';

-- 5. Проверяем результат
SELECT '=== Platforms ===' as info;
SELECT code, name FROM platforms ORDER BY code;

SELECT '=== Placements ===' as info;
SELECT code, name FROM placements ORDER BY code;

SELECT '=== Formats ===' as info;
SELECT code, name FROM formats ORDER BY code;

-- 6. Проверяем, остались ли креативы с несуществующими связями
SELECT '=== Validation Check ===' as info;
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

COMMIT;

-- Если нужно откатить изменения, используйте ROLLBACK вместо COMMIT

