-- Полная настройка политик Storage для Supabase
-- Выполните этот SQL в Supabase Dashboard SQL Editor

-- ШАГ 1: Создаем RPC функцию для выполнения SQL (если её еще нет)
CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE sql_query;
END;
$$;

-- Предоставляем права на выполнение функции
GRANT EXECUTE ON FUNCTION exec_sql(text) TO anon;
GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;

-- ШАГ 2: Удаляем старые политики
DROP POLICY IF EXISTS "Authenticated users can upload creatives media" ON storage.objects;
DROP POLICY IF EXISTS "Anonymous users can upload creatives media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update creatives media" ON storage.objects;
DROP POLICY IF EXISTS "Anonymous users can update creatives media" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for creatives media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete creatives media" ON storage.objects;

-- ШАГ 3: Создаем новые политики

-- Политика для чтения (публичный доступ)
CREATE POLICY "Public read access for creatives media" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'creatives-media');

-- Политика для загрузки (анонимные пользователи)
CREATE POLICY "Anonymous users can upload creatives media" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'creatives-media');

-- Политика для обновления (анонимные пользователи)
CREATE POLICY "Anonymous users can update creatives media" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'creatives-media') 
WITH CHECK (bucket_id = 'creatives-media');

-- Политика для удаления (только аутентифицированные пользователи)
CREATE POLICY "Authenticated users can delete creatives media" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'creatives-media' 
  AND auth.role() = 'authenticated'
);

-- ШАГ 4: RLS уже включен по умолчанию для storage.objects в Supabase
-- Не нужно выполнять ALTER TABLE, так как это системная таблица

