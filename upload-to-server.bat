@echo off
REM Скрипт для загрузки файлов на сервер через SCP
REM Использование: upload-to-server.bat

set SERVER=root@85.198.103.35
set SERVER_PATH=/var/www/spy-dashboard
set LOCAL_PATH=C:\Users\840G5\Desktop\spyservice\spy-dashboard

echo Загрузка обновленных файлов на сервер...
echo.

REM Загрузка обновленного API route для стран
scp "%LOCAL_PATH%\src\app\api\references\[type]\route.ts" %SERVER%:%SERVER_PATH%/src/app/api/references/[type]/route.ts

echo.
echo Файлы загружены!
echo Теперь на сервере выполните:
echo   cd /var/www/spy-dashboard
echo   npm run build
echo   pm2 restart spy-dashboard

pause

