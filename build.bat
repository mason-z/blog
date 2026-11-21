@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist "node_modules\hexo\" (
  echo [一键构建] 首次运行: npm install ...
  call npm.cmd install
  if errorlevel 1 (
    echo 安装失败。请先安装 Node.js：https://nodejs.org/
    pause
    exit /b 1
  )
)

echo.
echo [一键构建] 1/2 手机 Syncthing 通道 → 博客
call node tools\sync-phone-channel.cjs
if errorlevel 1 (
  echo 同步失败，请检查 tools\sync-phone-channel.config.json
  pause
  exit /b 1
)

echo.
echo [一键构建] 2/2 生成 public\（npm run build）...
call npm.cmd run build
if errorlevel 1 (
  echo 生成失败，请查看上方报错。
  pause
  exit /b 1
)

echo.
echo [一键构建] 完成。本地预览: npm run dev（4001）
echo 上线请双击 deploy.bat
echo.
pause
