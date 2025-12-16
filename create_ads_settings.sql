-- Создание таблицы для настроек рекламы

CREATE TABLE IF NOT EXISTS ad_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position TEXT NOT NULL UNIQUE, -- 'modal', 'between_creatives', 'sidebar', etc.
    type TEXT NOT NULL DEFAULT 'code', -- 'code', 'image', 'html'
    title TEXT, -- Название рекламного блока
    enabled BOOLEAN DEFAULT TRUE,
    content TEXT, -- Код рекламы, HTML или URL изображения
    image_url TEXT, -- URL изображения (если type = 'image')
    link_url TEXT, -- Ссылка для перехода (если type = 'image')
    width TEXT DEFAULT 'auto', -- Ширина блока
    height TEXT DEFAULT 'auto', -- Высота блока
    priority INTEGER DEFAULT 0, -- Приоритет показа
    display_conditions JSONB, -- Условия показа (например, для определенных стран)
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Индексы
CREATE INDEX IF NOT EXISTS ad_settings_position_idx ON ad_settings (position);
CREATE INDEX IF NOT EXISTS ad_settings_enabled_idx ON ad_settings (enabled);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_ad_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ad_settings_updated_at_trigger
    BEFORE UPDATE ON ad_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_ad_settings_updated_at();

-- Вставляем начальные настройки для рекламного блока в модалке
INSERT INTO ad_settings (position, type, title, enabled, content, width, height)
VALUES (
    'modal',
    'code',
    'Реклама в модальном окне креатива',
    TRUE,
    'Здесь может быть твоя реклама',
    '100%',
    'auto'
)
ON CONFLICT (position) DO NOTHING;

-- Комментарии
COMMENT ON TABLE ad_settings IS 'Настройки рекламных блоков для разных позиций на сайте';
COMMENT ON COLUMN ad_settings.position IS 'Позиция рекламного блока: modal, between_creatives, sidebar';
COMMENT ON COLUMN ad_settings.type IS 'Тип рекламы: code (код рекламы), image (изображение), html (HTML код)';
COMMENT ON COLUMN ad_settings.content IS 'Содержимое: код рекламы, HTML или текст для изображения';
COMMENT ON COLUMN ad_settings.enabled IS 'Включен ли рекламный блок';
