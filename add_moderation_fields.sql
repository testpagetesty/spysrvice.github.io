-- Добавление полей модерации в существующую таблицу creatives

-- Добавляем поле статуса (если еще не существует)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'creatives' AND column_name = 'status') THEN
        ALTER TABLE creatives ADD COLUMN status TEXT NOT NULL DEFAULT 'draft';
    END IF;
END $$;

-- Добавляем поле времени модерации (если еще не существует)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'creatives' AND column_name = 'moderated_at') THEN
        ALTER TABLE creatives ADD COLUMN moderated_at TIMESTAMPTZ;
    END IF;
END $$;

-- Добавляем поле модератора (если еще не существует)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'creatives' AND column_name = 'moderated_by') THEN
        ALTER TABLE creatives ADD COLUMN moderated_by TEXT;
    END IF;
END $$;

-- Создаем индексы для статуса (если еще не существуют)
CREATE INDEX IF NOT EXISTS creatives_status_idx ON creatives (status);
CREATE INDEX IF NOT EXISTS creatives_status_created_idx ON creatives (status, created_at DESC);

-- Обновляем существующие креативы до статуса 'published' (если они уже есть)
UPDATE creatives 
SET status = 'published', 
    moderated_at = created_at,
    moderated_by = 'system_migration'
WHERE status = 'draft' AND created_at < NOW() - INTERVAL '1 minute';

-- Добавляем ограничение на статус (только 2 статуса)
DO $$ 
BEGIN
    -- Удаляем старое ограничение если есть
    IF EXISTS (SELECT 1 FROM information_schema.check_constraints 
               WHERE constraint_name = 'creatives_status_check') THEN
        ALTER TABLE creatives DROP CONSTRAINT creatives_status_check;
    END IF;
    
    -- Добавляем новое ограничение только на 2 статуса
    ALTER TABLE creatives ADD CONSTRAINT creatives_status_check 
    CHECK (status IN ('draft', 'published'));
END $$;

-- Комментарии для полей
COMMENT ON COLUMN creatives.status IS 'Статус креатива: draft (новый), published (опубликован)';
COMMENT ON COLUMN creatives.moderated_at IS 'Время модерации креатива';
COMMENT ON COLUMN creatives.moderated_by IS 'Кто модерировал креатив (admin, system, etc.)';
