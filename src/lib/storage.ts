import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl as getS3SignedUrl } from '@aws-sdk/s3-request-presigner'

// Конфигурация S3 клиента (Beget S3 или другой S3-compatible storage)
const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT || process.env.MINIO_ENDPOINT || 'http://localhost:9000',
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || process.env.MINIO_ACCESS_KEY || '',
    secretAccessKey: process.env.S3_SECRET_KEY || process.env.MINIO_SECRET_KEY || '',
  },
  forcePathStyle: true, // Обязательно для S3-compatible storage
})

const BUCKET_NAME = process.env.S3_BUCKET || 'creatives-media'
const PUBLIC_URL = process.env.S3_PUBLIC_URL || process.env.MINIO_PUBLIC_URL || 'http://localhost:9000'

/**
 * Загрузка файла в S3 Storage
 */
export async function uploadFile(
  file: File | Buffer,
  path: string,
  contentType?: string
): Promise<string> {
  try {
    const buffer = file instanceof File 
      ? Buffer.from(await file.arrayBuffer())
      : file

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: path,
      Body: buffer,
      ContentType: contentType || (file instanceof File ? file.type : 'application/octet-stream'),
      CacheControl: 'public, max-age=3600',
    })

    await s3Client.send(command)

    // Возвращаем публичный URL
    return getPublicUrl(path)
  } catch (error) {
    console.error('Error uploading file to S3:', error)
    throw new Error(`Failed to upload file: ${error}`)
  }
}

/**
 * Получение публичного URL файла
 */
export function getPublicUrl(path: string): string {
  // Убираем начальный слеш если есть
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `${PUBLIC_URL}/${BUCKET_NAME}/${cleanPath}`
}

/**
 * Проверка существования файла
 */
export async function fileExists(path: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: path,
    })
    await s3Client.send(command)
    return true
  } catch (error: any) {
    if (error.name === 'NotFound') {
      return false
    }
    throw error
  }
}

/**
 * Удаление файла
 */
export async function deleteFile(path: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: path,
    })
    await s3Client.send(command)
  } catch (error) {
    console.error('Error deleting file from S3:', error)
    throw new Error(`Failed to delete file: ${error}`)
  }
}

/**
 * Получение подписанного URL для временного доступа (опционально)
 */
export async function getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: path,
  })
  
  return await getS3SignedUrl(s3Client, command, { expiresIn })
}

