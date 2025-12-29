-- Создание таблицы для настроек дашборда
-- Выполнить в SQL Editor в Supabase

CREATE TABLE IF NOT EXISTS dashboard_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Индекс для быстрого поиска по ключу
CREATE INDEX IF NOT EXISTS dashboard_settings_key_idx ON dashboard_settings (key);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION set_dashboard_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для обновления updated_at
DROP TRIGGER IF EXISTS set_dashboard_settings_updated_at_trigger ON dashboard_settings;
CREATE TRIGGER set_dashboard_settings_updated_at_trigger
    BEFORE UPDATE ON dashboard_settings
    FOR EACH ROW
    EXECUTE FUNCTION set_dashboard_settings_updated_at();

-- Вставляем начальные настройки (если их еще нет)
INSERT INTO dashboard_settings (key, value) VALUES 
    ('filters', '{
        "date": true,
        "format": true,
        "type": true,
        "placement": true,
        "country": true,
        "platform": true,
        "cloaking": true
    }'::jsonb),
    ('display', '{
        "itemsPerPage": 20,
        "defaultSort": "newest",
        "showThumbnails": true,
        "showDescriptions": true
    }'::jsonb),
    ('advanced', '{
        "enableAutoRefresh": false,
        "autoRefreshInterval": 60,
        "enableNotifications": true
    }'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Разрешаем публичный доступ на чтение (для дашборда)
ALTER TABLE dashboard_settings ENABLE ROW LEVEL SECURITY;

-- Политика для публичного чтения
DROP POLICY IF EXISTS "Public read access for dashboard settings" ON dashboard_settings;
CREATE POLICY "Public read access for dashboard settings"
    ON dashboard_settings
    FOR SELECT
    USING (true);

-- Политика для записи только через service role (будет использоваться в API)
-- Запись через API с service role key, поэтому не нужна отдельная политика для записи

