@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist "node_modules\hexo\" (
  echo [首次运行] 正在安装依赖 ...
  call npm.cmd install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)

echo.
echo [1/2] 完整构建（与 build.bat 相同：检查、压缩宠物图、生成 public）...
call npm.cmd run build
if errorlevel 1 (
  echo.
  echo 构建失败，请查看上方报错。
  pause
  exit /b 1
)

echo.
echo [2/2] 启动 Hexo 本地预览（端口 4001，与 _config.local.yml 中 url 一致）...
echo 浏览器将在服务就绪后自动打开；仅预览站点，不含 Decap 代理。需要与远程同步时请在本目录执行： git pull
echo.

REM -o：等服务启动后再打开浏览器，避免「页面无法连接」。请始终访问 http://localhost:4001/
call npx.cmd hexo server -p 4001 -o --config _config.yml,_config.local.yml
if errorlevel 1 (
  echo.
  echo 预览进程异常退出。
  pause
  exit /b 1
)

pause
