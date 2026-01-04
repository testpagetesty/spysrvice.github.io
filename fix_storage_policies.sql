-- Исправление политик доступа для Supabase Storage
-- Выполнить в SQL Editor в Supabase Dashboard

-- Удаляем старые политики, которые требуют аутентификации
DROP POLICY IF EXISTS "Authenticated users can upload creatives media" ON storage.objects;
DROP POLICY IF EXISTS "Anonymous users can upload creatives media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update creatives media" ON storage.objects;
DROP POLICY IF EXISTS "Anonymous users can update creatives media" ON storage.objects;

-- Создаем новую политику для загрузки файлов (анонимные пользователи могут загружать)
-- Это нужно для мобильного приложения, которое загружает файлы напрямую в Supabase
CREATE POLICY "Anonymous users can upload creatives media" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'creatives-media'
);

-- Политика для обновления файлов (анонимные пользователи)
CREATE POLICY "Anonymous users can update creatives media" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'creatives-media'
);

-- Политика для чтения файлов (публичный доступ)
-- Удаляем старую если существует, затем создаем новую
DROP POLICY IF EXISTS "Public read access for creatives media" ON storage.objects;
CREATE POLICY "Public read access for creatives media" ON storage.objects
FOR SELECT USING (bucket_id = 'creatives-media');

-- Политика для удаления файлов (только аутентифицированные пользователи)
DROP POLICY IF EXISTS "Authenticated users can delete creatives media" ON storage.objects;
CREATE POLICY "Authenticated users can delete creatives media" ON storage.objects
FOR DELETE USING (
    bucket_id = 'creatives-media' 
    AND auth.role() = 'authenticated'
);

-- RLS уже включен по умолчанию для storage.objects в Supabase
-- Не нужно выполнять ALTER TABLE, так как это системная таблица

