-- Настройка Storage для медиа-файлов
-- Выполнить в SQL Editor в Supabase после создания bucket через UI

-- Создание политик для bucket 'creatives-media'
-- (bucket нужно создать через UI: Storage -> New bucket -> 'creatives-media', Public: true)

-- Политика для чтения файлов (публичный доступ)
CREATE POLICY "Public read access for creatives media" ON storage.objects
FOR SELECT USING (bucket_id = 'creatives-media');

-- Политика для загрузки файлов (аутентифицированные пользователи)
CREATE POLICY "Authenticated users can upload creatives media" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'creatives-media' 
    AND auth.role() = 'authenticated'
);

-- Политика для обновления файлов
CREATE POLICY "Authenticated users can update creatives media" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'creatives-media' 
    AND auth.role() = 'authenticated'
);

-- Политика для удаления файлов
CREATE POLICY "Authenticated users can delete creatives media" ON storage.objects
FOR DELETE USING (
    bucket_id = 'creatives-media' 
    AND auth.role() = 'authenticated'
);

-- Включаем RLS для storage.objects (если еще не включено)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
