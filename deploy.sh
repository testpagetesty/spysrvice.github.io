#!/bin/bash

# Скрипт автоматического деплоя на Beget VPS
# Использование: bash deploy.sh

set -e

echo "🚀 Начало деплоя проекта на Beget VPS"
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Проверка Node.js
echo "📦 Проверка Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js не установлен${NC}"
    echo "Установка Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
else
    echo -e "${GREEN}✅ Node.js установлен: $(node --version)${NC}"
fi

# Проверка PostgreSQL
echo ""
echo "📦 Проверка PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL не установлен${NC}"
    echo "Установка PostgreSQL..."
    apt update
    apt install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
else
    echo -e "${GREEN}✅ PostgreSQL установлен${NC}"
fi

# Проверка PM2
echo ""
echo "📦 Проверка PM2..."
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}⚠️  PM2 не установлен${NC}"
    echo "Установка PM2..."
    npm install -g pm2
else
    echo -e "${GREEN}✅ PM2 установлен${NC}"
fi

# Установка зависимостей проекта
echo ""
echo "📦 Установка зависимостей проекта..."
npm install

# Проверка .env файла
echo ""
echo "📝 Проверка переменных окружения..."
if [ ! -f .env.production ]; then
    echo -e "${YELLOW}⚠️  Файл .env.production не найден${NC}"
    echo "Создайте файл .env.production на основе .env.example"
    echo "Или выполните: cp .env.example .env.production"
    exit 1
else
    echo -e "${GREEN}✅ Файл .env.production найден${NC}"
fi

# Сборка проекта
echo ""
echo "🔨 Сборка проекта..."
npm run build

# Создание директории для логов PM2
echo ""
echo "📁 Создание директории для логов..."
mkdir -p /var/log/pm2

# Запуск через PM2
echo ""
echo "🚀 Запуск приложения через PM2..."
if pm2 list | grep -q "spy-dashboard"; then
    echo "Приложение уже запущено, перезапускаем..."
    pm2 restart spy-dashboard
else
    pm2 start ecosystem.config.js
fi

pm2 save

echo ""
echo -e "${GREEN}✅ Деплой завершен!${NC}"
echo ""
echo "Проверьте статус: pm2 status"
echo "Просмотр логов: pm2 logs spy-dashboard"
echo ""

