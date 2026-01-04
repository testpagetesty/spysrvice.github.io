-- Проверка количества стран в базе данных
SELECT COUNT(*) as total_countries FROM countries;

-- Показать все страны
SELECT code, name FROM countries ORDER BY name;

