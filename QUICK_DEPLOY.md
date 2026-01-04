# Быстрый деплой на Beget VPS

## 🚀 Быстрый старт

### Шаг 1: Подключение к серверу

```bash
ssh root@85.198.103.35
# Пароль: ObuCTBE8e%2L
```

---

### Шаг 2: Подготовка сервера

Выполните команды по порядку:

```bash
# Обновление системы
apt update && apt upgrade -y

# Установка Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Установка PostgreSQL
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql

# Установка PM2
npm install -g pm2

# Установка Git (если нужно)
apt install -y git
```

---

### Шаг 3: Загрузка проекта

#### Вариант A: Через Git (если есть репозиторий)

```bash
cd /var/www
git clone https://github.com/your-username/spy-dashboard.git
cd spy-dashboard
```

#### Вариант B: Через SFTP/FTP

1. Загрузите все файлы проекта в `/var/www/spy-dashboard`
2. Подключитесь через SFTP или используйте FTP клиент

---

### Шаг 4: Настройка базы данных

```bash
cd /var/www/spy-dashboard

# Сделайте скрипт исполняемым
chmod +x setup-database.sh

# Запустите настройку БД
bash setup-database.sh
```

Или вручную:

```bash
# Создание пользователя и БД
sudo -u postgres psql
```

В psql консоли:
```sql
CREATE USER spyservice WITH PASSWORD 'your_secure_password';
CREATE DATABASE spyservice_db OWNER spyservice;
GRANT ALL PRIVILEGES ON DATABASE spyservice_db TO spyservice;
\q
```

Затем создайте таблицы:
```bash
psql -U spyservice -d spyservice_db -f database_schema.sql
```

---

### Шаг 5: Настройка переменных окружения

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

# S3 Storage Configuration (Beget S3)
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

### Шаг 6: Настройка S3 Storage

1. В панели Beget: Облако → Объектное хранилище S3
2. Создайте bucket: `creatives-media`
3. Сохраните:
   - Endpoint URL
   - Access Key
   - Secret Key
4. Добавьте эти данные в `.env.production`

---

### Шаг 7: Установка зависимостей и сборка

```bash
cd /var/www/spy-dashboard

# Установка зависимостей
npm install

# Сборка проекта
npm run build
```

---

### Шаг 8: Запуск приложения

```bash
cd /var/www/spy-dashboard

# Создание директории для логов
mkdir -p /var/log/pm2

# Запуск через PM2
pm2 start ecosystem.config.js

# Сохранение конфигурации
pm2 save

# Настройка автозапуска
pm2 startup
```

---

### Шаг 9: Проверка работы

```bash
# Проверка статуса
pm2 status

# Просмотр логов
pm2 logs spy-dashboard

# Проверка порта
netstat -tlnp | grep 3000
```

Откройте в браузере: `https://profitlabspy.com`

---

## 🔧 Полезные команды

### Управление приложением

```bash
# Статус
pm2 status

# Логи
pm2 logs spy-dashboard

# Перезапуск
pm2 restart spy-dashboard

# Остановка
pm2 stop spy-dashboard

# Удаление
pm2 delete spy-dashboard
```

### Управление базой данных

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
# Проверка Node.js процессов
ps aux | grep node

# Проверка порта 3000
netstat -tlnp | grep 3000

# Проверка логов Nginx
tail -f /var/log/nginx/error.log
```

---

## ⚠️ Решение проблем

### Ошибка: "Cannot connect to database"

```bash
# Проверьте PostgreSQL
systemctl status postgresql

# Проверьте подключение
psql -U spyservice -d spyservice_db
```

### Ошибка: "S3 upload failed"

Проверьте:
- Правильные S3 ключи в `.env.production`
- S3 bucket существует
- Endpoint URL правильный

### Ошибка: "502 Bad Gateway"

```bash
# Проверьте приложение
pm2 status
pm2 logs spy-dashboard

# Проверьте порт
netstat -tlnp | grep 3000
```

---

## ✅ Чеклист

- [ ] Node.js установлен
- [ ] PostgreSQL установлен и настроен
- [ ] Таблицы созданы в БД
- [ ] S3 bucket создан и настроен
- [ ] Проект загружен на сервер
- [ ] Зависимости установлены (`npm install`)
- [ ] Переменные окружения настроены (`.env.production`)
- [ ] Проект собран (`npm run build`)
- [ ] PM2 настроен и приложение запущено
- [ ] Сайт доступен по HTTPS

---

**Готово!** Ваш проект должен работать на `https://profitlabspy.com`

