-- Создание RPC функции для выполнения SQL через REST API
-- Выполните этот SQL в Supabase Dashboard SQL Editor ОДИН РАЗ

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

-- Предоставляем права на выполнение функции анонимным пользователям
GRANT EXECUTE ON FUNCTION exec_sql(text) TO anon;
GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;

