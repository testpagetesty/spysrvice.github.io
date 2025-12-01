-- Обновление платформы с google_search на youtube

-- 1. Получаем ID платформы YouTube
-- 2. Обновляем все креативы с google_search на youtube

DO $$
DECLARE
    youtube_platform_id UUID;
    google_search_platform_id UUID;
BEGIN
    -- Получаем ID платформы YouTube
    SELECT id INTO youtube_platform_id 
    FROM platforms 
    WHERE code = 'youtube' 
    LIMIT 1;
    
    -- Получаем ID платформы Google Search (если существует)
    SELECT id INTO google_search_platform_id 
    FROM platforms 
    WHERE code = 'google_search' 
    LIMIT 1;
    
    -- Если YouTube платформа найдена
    IF youtube_platform_id IS NOT NULL THEN
        -- Если есть креативы с google_search, обновляем их на youtube
        IF google_search_platform_id IS NOT NULL THEN
            UPDATE creatives 
            SET platform_id = youtube_platform_id,
                updated_at = NOW()
            WHERE platform_id = google_search_platform_id;
            
            RAISE NOTICE 'Обновлены креативы с google_search на youtube. ID YouTube: %', youtube_platform_id;
        ELSE
            RAISE NOTICE 'Платформа google_search не найдена в базе данных';
        END IF;
        
        -- Удаляем старую платформу google_search если она есть
        DELETE FROM platforms WHERE code = 'google_search';
        RAISE NOTICE 'Платформа google_search удалена из базы данных';
        
    ELSE
        RAISE NOTICE 'Платформа YouTube не найдена в базе данных';
    END IF;
END $$;

-- Проверяем результат
SELECT 
    p.code, 
    p.name, 
    COUNT(c.id) as creatives_count
FROM platforms p
LEFT JOIN creatives c ON c.platform_id = p.id
WHERE p.code IN ('youtube', 'google_search')
GROUP BY p.id, p.code, p.name
ORDER BY p.code;
