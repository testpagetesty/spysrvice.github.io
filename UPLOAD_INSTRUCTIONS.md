# Инструкция по загрузке файлов на сервер через PuTTY/SCP

## Вариант 1: Через SCP (если установлен OpenSSH в Windows)

### Шаг 1: Откройте командную строку Windows (CMD)

### Шаг 2: Выполните команды для загрузки файлов

```cmd
cd C:\Users\840G5\Desktop\spyservice\spy-dashboard

REM Загрузка обновленного API route для стран
scp src\app\api\references\[type]\route.ts root@85.198.103.35:/var/www/spy-dashboard/src/app/api/references/[type]/route.ts
```

Введите пароль: `ObuCTBE8e%2L`

### Шаг 3: После загрузки на сервере выполните

В PuTTY:

```bash
cd /var/www/spy-dashboard
npm run build
pm2 restart spy-dashboard
```

---

## Вариант 2: Через WinSCP (рекомендуется)

### Шаг 1: Откройте WinSCP

### Шаг 2: Подключитесь к серверу

- Host: `85.198.103.35`
- Username: `root`
- Password: `ObuCTBE8e%2L`
- Port: `22`

### Шаг 3: Перейдите в папку проекта

На сервере: `/var/www/spy-dashboard`

### Шаг 4: Загрузите файлы

С локального компьютера загрузите:
- `src/app/api/references/[type]/route.ts` → `/var/www/spy-dashboard/src/app/api/references/[type]/route.ts`

### Шаг 5: На сервере выполните команды

В PuTTY:

```bash
cd /var/www/spy-dashboard
npm run build
pm2 restart spy-dashboard
```

---

## Вариант 3: Через FileZilla (SFTP)

### Шаг 1: Откройте FileZilla

### Шаг 2: Подключитесь к серверу

- Host: `sftp://85.198.103.35`
- Username: `root`
- Password: `ObuCTBE8e%2L`
- Port: `22`

### Шаг 3: Загрузите файлы

Перетащите файл `src/app/api/references/[type]/route.ts` из локальной папки в папку на сервере `/var/www/spy-dashboard/src/app/api/references/[type]/`

### Шаг 4: На сервере выполните команды

В PuTTY:

```bash
cd /var/www/spy-dashboard
npm run build
pm2 restart spy-dashboard
```

---

## Быстрый способ: Обновить все файлы через Git

Если Git настроен на сервере:

```bash
cd /var/www/spy-dashboard
git pull
npm run build
pm2 restart spy-dashboard
```

Это самый простой способ!

