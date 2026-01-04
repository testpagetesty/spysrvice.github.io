# Инструкция по деплою на Beget VPS

## 📋 Что было изменено

1. ✅ Заменен Supabase на PostgreSQL (прямые SQL запросы)
2. ✅ Заменен Supabase Storage на S3 (Beget S3 или другой S3-compatible)
3. ✅ Обновлены все API routes
4. ✅ Создан новый клиентский API (`src/lib/api-client.ts`)
5. ✅ Добавлены зависимости: `pg`, `@aws-sdk/client-s3`

---

## 🚀 Пошаговая инструкция по деплою

### Шаг 1: Подготовка сервера

#### 1.1 Установка Node.js

```bash
# Обновление системы
apt update && apt upgrade -y

# Установка Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Проверка версии
node --version
npm --version
```

#### 1.2 Установка PostgreSQL

```bash
# Установка PostgreSQL
apt install -y postgresql postgresql-contrib

# Запуск PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Создание пользователя и базы данных
sudo -u postgres psql
```

В psql консоли:
```sql
CREATE USER spyservice WITH PASSWORD 'your_secure_password';
CREATE DATABASE spyservice_db OWNER spyservice;
GRANT ALL PRIVILEGES ON DATABASE spyservice_db TO spyservice;
\q
```

#### 1.3 Создание таблиц в PostgreSQL

```bash
# Копируем SQL файл на сервер и выполняем
psql -U spyservice -d spyservice_db -f database_schema.sql
```

Или выполните SQL вручную через psql:
```bash
psql -U spyservice -d spyservice_db
```

Затем скопируйте содержимое `database_schema.sql` и выполните.

---

### Шаг 2: Настройка S3 Storage (Beget)

#### 2.1 Создание S3 bucket в Beget

1. В панели Beget: Облако → Объектное хранилище S3
2. Создайте bucket: `creatives-media`
3. Сохраните:
   - Endpoint URL
   - Access Key
   - Secret Key

#### 2.2 Настройка публичного доступа

Убедитесь, что bucket настроен для публичного чтения файлов.

---

### Шаг 3: Загрузка проекта на сервер

#### 3.1 Клонирование репозитория

```bash
cd /var/www
git clone https://github.com/your-username/spy-dashboard.git
cd spy-dashboard
```

Или загрузите файлы через FTP/SFTP в `/var/www/spy-dashboard`

#### 3.2 Установка зависимостей

```bash
cd /var/www/spy-dashboard
npm install
```

---

### Шаг 4: Настройка переменных окружения

```bash
cd /var/www/spy-dashboard
nano .env.production
```

Вставьте (замените значения на ваши):

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=spyservice_db
DB_USER=spyservice
DB_PASSWORD=your_secure_password

# S3 Storage Configuration
S3_ENDPOINT=https://s3.beget.com
S3_REGION=us-east-1
S3_ACCESS_KEY=your_s3_access_key
S3_SECRET_KEY=your_s3_secret_key
S3_BUCKET=creatives-media
S3_PUBLIC_URL=https://profitlabspy.com/storage

# Next.js Configuration
NEXT_PUBLIC_API_URL=https://profitlabspy.com
NODE_ENV=production
PORT=3000
```

Сохраните: `Ctrl+O`, `Enter`, `Ctrl+X`

---

### Шаг 5: Сборка проекта

```bash
cd /var/www/spy-dashboard
npm run build
```

---

### Шаг 6: Запуск приложения с PM2

#### 6.1 Установка PM2

```bash
npm install -g pm2
```

#### 6.2 Создание конфигурации PM2

```bash
cd /var/www/spy-dashboard
nano ecosystem.config.js
```

Вставьте:

```javascript
module.exports = {
  apps: [{
    name: 'spy-dashboard',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/var/www/spy-dashboard',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/spy-dashboard-error.log',
    out_file: '/var/log/pm2/spy-dashboard-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '2G'
  }]
}
```

#### 6.3 Запуск приложения

```bash
# Создание директории для логов
mkdir -p /var/log/pm2

# Запуск
pm2 start ecosystem.config.js

# Сохранение конфигурации
pm2 save

# Настройка автозапуска
pm2 startup
```

---

### Шаг 7: Настройка Nginx (уже настроен для SSL)

Nginx уже настроен для работы с доменом `profitlabspy.com`.

Проверьте конфигурацию:

```bash
nginx -t
systemctl status nginx
```

---

### Шаг 8: Проверка работы

1. Откройте: `https://profitlabspy.com`
2. Проверьте работу API: `https://profitlabspy.com/api/test`
3. Проверьте логи: `pm2 logs spy-dashboard`

---

## 🔧 Полезные команды

### Управление приложением

```bash
# Просмотр статуса
pm2 status

# Просмотр логов
pm2 logs spy-dashboard

# Перезапуск
pm2 restart spy-dashboard

# Остановка
pm2 stop spy-dashboard
```

### Управление PostgreSQL

```bash
# Подключение к БД
psql -U spyservice -d spyservice_db

# Просмотр таблиц
\dt

# Выход
\q
```

### Проверка работы

```bash
# Проверка порта 3000
netstat -tlnp | grep 3000

# Проверка процессов Node.js
ps aux | grep node

# Проверка логов Nginx
tail -f /var/log/nginx/error.log
```

---

## 📝 Важные замечания

1. **Переменные окружения:** Убедитесь, что `.env.production` содержит правильные данные
2. **S3 доступ:** Проверьте, что S3 bucket доступен и ключи правильные
3. **PostgreSQL:** Убедитесь, что БД создана и таблицы созданы
4. **Порты:** Убедитесь, что порт 3000 доступен для Nginx

---

## 🐛 Решение проблем

### Ошибка: "Cannot connect to database"

Проверьте:
- PostgreSQL запущен: `systemctl status postgresql`
- Правильные данные в `.env.production`
- Пользователь и БД созданы

### Ошибка: "S3 upload failed"

Проверьте:
- Правильные S3 ключи в `.env.production`
- S3 bucket существует
- Endpoint URL правильный

### Ошибка: "502 Bad Gateway"

Проверьте:
- Приложение запущено: `pm2 status`
- Порт 3000 слушается: `netstat -tlnp | grep 3000`
- Логи приложения: `pm2 logs spy-dashboard`

---

## ✅ Чеклист деплоя

- [ ] Node.js установлен
- [ ] PostgreSQL установлен и настроен
- [ ] Таблицы созданы в БД
- [ ] S3 bucket создан и настроен
- [ ] Проект загружен на сервер
- [ ] Зависимости установлены (`npm install`)
- [ ] Переменные окружения настроены (`.env.production`)
- [ ] Проект собран (`npm run build`)
- [ ] PM2 настроен и приложение запущено
- [ ] Nginx настроен и работает
- [ ] SSL сертификат настроен
- [ ] Сайт доступен по HTTPS

---

**Готово!** Ваш проект должен работать на `https://profitlabspy.com`

