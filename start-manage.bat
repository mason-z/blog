@echo off
cd /d "%~dp0"

echo.
echo [meiso-manage] 博客控制台页面: http://127.0.0.1:5174/
echo [meiso-manage] 后端 API:          http://127.0.0.1:8770/api/health
echo.

set "VITE_OK=0"
set "API_OK=0"

curl.exe -s -o NUL --connect-timeout 2 http://127.0.0.1:5174/ >NUL 2>&1
if %errorlevel%==0 set "VITE_OK=1"

curl.exe -s -o NUL --connect-timeout 2 http://127.0.0.1:8770/api/health >NUL 2>&1
if %errorlevel%==0 set "API_OK=1"

if "%VITE_OK%"=="1" if "%API_OK%"=="1" (
  echo [meiso-manage] 前后端已在运行，正在打开浏览器…
  start "" "http://127.0.0.1:5174/"
  pause
  exit /b 0
)

if "%VITE_OK%"=="1" if "%API_OK%"=="0" (
  echo [meiso-manage] 警告: 页面 5174 在运行但 API 8770 未响应（会出现 Failed to fetch^）
  echo [meiso-manage] 请关闭旧的黑窗口后重新运行本脚本，不要只开前端。
  echo.
)

if not exist "node_modules\" (
  echo [meiso-manage] 首次运行: npm install ...
  call npm.cmd install
  if errorlevel 1 goto fail
)

if not exist "manage\node_modules\" (
  echo [meiso-manage] 首次运行: manage:install ...
  call npm.cmd run manage:install
  if errorlevel 1 goto fail
)

echo [meiso-manage] 正在启动前后端… 约 6 秒后打开浏览器，请勿关闭本窗口。
echo [meiso-manage] 日常用请双击「博客控制台.bat」；默认无黑框，日志在 .manage-console.log

ping 127.0.0.1 -n 7 >nul
start "" "http://127.0.0.1:5174/"

call npm.cmd run manage:dev
if errorlevel 1 goto fail
exit /b 0

:fail
echo.
echo [meiso-manage] 启动失败。请检查 5174 / 8770 端口是否被占用。
echo.
pause
exit /b 1
