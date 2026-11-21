@echo off
chcp 65001 >nul
cd /d "%~dp0"

set "LOG=%~dp0.manage-console.log"

>>"%LOG%" echo.
>>"%LOG%" echo === manage service %date% %time% ===
>>"%LOG%" echo [cleanup] stop old 5174/8770
node.exe manage\server\stop-manage.mjs >>"%LOG%" 2>&1
ping 127.0.0.1 -n 3 >nul

if not exist "node_modules\" (
  >>"%LOG%" echo [install] npm install ...
  call npm.cmd install >>"%LOG%" 2>&1
  if errorlevel 1 exit /b 1
)

if not exist "manage\node_modules\" (
  >>"%LOG%" echo [install] manage:install ...
  call npm.cmd run manage:install >>"%LOG%" 2>&1
  if errorlevel 1 exit /b 1
)

>>"%LOG%" echo [run] npm run manage:dev
call npm.cmd run manage:dev >>"%LOG%" 2>&1
exit /b %errorlevel%
