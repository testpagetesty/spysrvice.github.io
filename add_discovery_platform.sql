-- Добавление/обновление платформы "Discovery" в таблицу platforms
-- Выполнить в SQL Editor в Supabase

-- Используем UPSERT: если платформа существует - обновляем название, если нет - создаем новую
INSERT INTO platforms (code, name)
VALUES ('discovery', 'Discovery')
ON CONFLICT (code) 
DO UPDATE SET name = 'Discovery';

-- Проверяем результат
SELECT * FROM platforms WHERE code = 'discovery';

