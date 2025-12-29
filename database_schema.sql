-- Создание таблиц для spy service
-- Выполнить в SQL Editor в Supabase

-- Справочник форматов
CREATE TABLE IF NOT EXISTS formats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Справочник типов/вертикалей
CREATE TABLE IF NOT EXISTS types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Справочник размещений
CREATE TABLE IF NOT EXISTS placements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Справочник платформ
CREATE TABLE IF NOT EXISTS platforms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Справочник стран
CREATE TABLE IF NOT EXISTS countries (
    code CHAR(2) PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Основная таблица креативов
CREATE TABLE IF NOT EXISTS creatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT,
    description TEXT,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    format_id UUID REFERENCES formats(id),
    type_id UUID REFERENCES types(id),
    placement_id UUID REFERENCES placements(id),
    country_code CHAR(2) REFERENCES countries(code),
    platform_id UUID REFERENCES platforms(id),
    cloaking BOOLEAN DEFAULT FALSE,
    media_url TEXT,
    thumbnail_url TEXT,
    landing_url TEXT,
    source_link TEXT,
    download_url TEXT,
    source_device TEXT,
    project_id UUID,
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'published', 'rejected'
    moderated_at TIMESTAMPTZ,
    moderated_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS creatives_captured_at_idx ON creatives (captured_at DESC);
CREATE INDEX IF NOT EXISTS creatives_country_idx ON creatives (country_code);
CREATE INDEX IF NOT EXISTS creatives_type_idx ON creatives (type_id);
CREATE INDEX IF NOT EXISTS creatives_platform_idx ON creatives (platform_id);
CREATE INDEX IF NOT EXISTS creatives_format_idx ON creatives (format_id);
CREATE INDEX IF NOT EXISTS creatives_placement_idx ON creatives (placement_id);
CREATE INDEX IF NOT EXISTS creatives_status_idx ON creatives (status);
CREATE INDEX IF NOT EXISTS creatives_status_created_idx ON creatives (status, created_at DESC);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для обновления updated_at
DROP TRIGGER IF EXISTS set_creatives_updated_at ON creatives;
CREATE TRIGGER set_creatives_updated_at
    BEFORE UPDATE ON creatives
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- Заполнение справочников базовыми данными
INSERT INTO formats (code, name) VALUES 
    ('teaser', 'Teaser')
ON CONFLICT (code) DO NOTHING;

INSERT INTO types (code, name) VALUES 
    ('crypt', 'Crypt'),
    ('gambling', 'Gambling'),
    ('nutra', 'Nutra'),
    ('news', 'News'),
    ('product', 'Product'),
    ('nutra_vsl', 'Nutra (VSL)'),
    ('finance', 'Finance'),
    ('dating', 'Dating')
ON CONFLICT (code) DO NOTHING;

INSERT INTO placements (code, name) VALUES 
    ('demand_gen', 'Demand Gen')
ON CONFLICT (code) DO NOTHING;

INSERT INTO platforms (code, name) VALUES 
    ('youtube', 'YouTube'),
    ('discovery', 'Discovery')
ON CONFLICT (code) DO NOTHING;

INSERT INTO countries (code, name) VALUES 
    ('DE', 'Germany'),
    ('PL', 'Poland'),
    ('IT', 'Italy'),
    ('ES', 'Spain'),
    ('FR', 'France'),
    ('AR', 'Argentina'),
    ('US', 'United States'),
    ('RU', 'Russia'),
    ('BR', 'Brazil'),
    ('TR', 'Turkey'),
    ('RO', 'Romania'),
    ('CZ', 'Czech Republic'),
    ('AT', 'Austria'),
    ('HU', 'Hungary'),
    ('LT', 'Lithuania'),
    ('BD', 'Bangladesh'),
    ('BG', 'Bulgaria'),
    ('UA', 'Ukraine'),
    ('PT', 'Portugal'),
    ('IE', 'Ireland'),
    ('SK', 'Slovakia'),
    ('BE', 'Belgium'),
    ('GR', 'Greece'),
    ('AU', 'Australia'),
    ('SI', 'Slovenia'),
    ('GB', 'United Kingdom'),
    ('CA', 'Canada'),
    ('NL', 'Netherlands'),
    ('IN', 'India'),
    ('HR', 'Croatia'),
    ('LV', 'Latvia'),
    ('KZ', 'Kazakhstan'),
    ('KR', 'South Korea'),
    ('MY', 'Malaysia'),
    ('EE', 'Estonia'),
    ('SE', 'Sweden'),
    ('DK', 'Denmark'),
    ('CY', 'Cyprus'),
    ('PH', 'Philippines'),
    ('SG', 'Singapore'),
    ('VN', 'Vietnam'),
    ('AZ', 'Azerbaijan'),
    ('ZA', 'South Africa'),
    ('FI', 'Finland'),
    ('MX', 'Mexico'),
    ('PK', 'Pakistan'),
    ('NZ', 'New Zealand'),
    ('EG', 'Egypt'),
    ('CO', 'Colombia'),
    ('IS', 'Iceland'),
    ('ID', 'Indonesia'),
    ('PE', 'Peru'),
    ('NG', 'Nigeria'),
    ('AE', 'United Arab Emirates'),
    ('JP', 'Japan'),
    ('NO', 'Norway'),
    ('CL', 'Chile'),
    ('LU', 'Luxembourg'),
    ('TH', 'Thailand'),
    ('SA', 'Saudi Arabia'),
    ('HK', 'Hong Kong')
ON CONFLICT (code) DO NOTHING;
