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
echo [1/2] 完整构建（与 build.bat 相同：检查、生成 public）...
call npm.cmd run build
if errorlevel 1 (
  echo.
  echo 构建失败，请查看上方报错。
  pause
  exit /b 1
)

echo.
echo [2/2] 启动 Hexo 本地预览（优先端口 4001；若被占用则自动换 4010、4011…）...
echo 浏览器将在服务就绪后自动打开；仅预览站点，不含 Decap 代理。需要与远程同步时请在本目录执行： git pull
echo.

REM -o：等服务启动后再打开浏览器。端口占用时请看终端提示的实际地址（可能与 _config.local.yml 中 url 不一致属正常）
call node tools\hexo-preview-port.cjs -o
if errorlevel 1 (
  echo.
  echo 预览进程异常退出。
  pause
  exit /b 1
)

pause
