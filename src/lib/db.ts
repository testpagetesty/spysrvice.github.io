import { Pool } from 'pg'

// Создаем connection pool для эффективного использования соединений
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'spyservice_db',
  user: process.env.DB_USER || 'spyservice',
  password: process.env.DB_PASSWORD,
  max: 20, // Максимум соединений в pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Обработка ошибок подключения
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err)
  process.exit(-1)
})

export { pool }

// Типы для результатов запросов
export interface CreativeRow {
  id: string
  title: string | null
  description: string | null
  captured_at: Date
  format_id: string | null
  type_id: string | null
  placement_id: string | null
  country_code: string | null
  platform_id: string | null
  cloaking: boolean
  media_url: string | null
  thumbnail_url: string | null
  landing_url: string | null
  source_link: string | null
  download_url: string | null
  source_device: string | null
  project_id: string | null
  status: 'draft' | 'published'
  moderated_at: Date | null
  moderated_by: string | null
  created_at: Date
  updated_at: Date
}

// Вспомогательная функция для выполнения запросов
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number }> {
  const start = Date.now()
  try {
    const res = await pool.query(text, params)
    const duration = Date.now() - start
    console.log('Executed query', { text: text.substring(0, 100), duration, rows: res.rowCount })
    return res
  } catch (error) {
    console.error('Database query error', { text: text.substring(0, 100), error })
    throw error
  }
}

