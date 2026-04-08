@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist "node_modules\hexo\" (
  echo [首次运行] 正在安装依赖 npm install ...
  call npm.cmd install
  if errorlevel 1 (
    echo.
    echo 安装失败。请先安装 Node.js：https://nodejs.org/
    pause
    exit /b 1
  )
)

echo.
echo 正在生成 public/（与本地预览相同配置：npm run build）...
echo.

call npm.cmd run build
if errorlevel 1 (
  echo.
  echo 生成失败，请查看上方报错。
  pause
  exit /b 1
)

echo.
echo 已完成：输出目录为 public\
echo 需要本地预览请另开终端执行：npm run server  或  npm run server:4001
echo.
pause
