#!/bin/bash

# Скрипт настройки PostgreSQL базы данных
# Использование: bash setup-database.sh

set -e

echo "🗄️  Настройка PostgreSQL базы данных"
echo ""

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Проверка PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL не установлен${NC}"
    exit 1
fi

# Запрос данных для подключения
read -p "Имя пользователя БД (по умолчанию: spyservice): " DB_USER
DB_USER=${DB_USER:-spyservice}

read -p "Имя базы данных (по умолчанию: spyservice_db): " DB_NAME
DB_NAME=${DB_NAME:-spyservice_db}

read -sp "Пароль для пользователя БД: " DB_PASSWORD
echo ""

# Создание пользователя и базы данных
echo ""
echo "📝 Создание пользователя и базы данных..."

sudo -u postgres psql <<EOF
-- Создание пользователя (если не существует)
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '$DB_USER') THEN
        CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
    ELSE
        ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
    END IF;
END
\$\$;

-- Создание базы данных (если не существует)
SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Выдача прав
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
\q
EOF

echo -e "${GREEN}✅ Пользователь и база данных созданы${NC}"

# Создание таблиц
echo ""
echo "📋 Создание таблиц..."

if [ -f database_schema.sql ]; then
    PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -f database_schema.sql
    echo -e "${GREEN}✅ Таблицы созданы${NC}"
else
    echo -e "${RED}❌ Файл database_schema.sql не найден${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ База данных настроена!${NC}"
echo ""
echo "Данные для подключения:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Password: [скрыт]"
echo ""

