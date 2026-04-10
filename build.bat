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
echo 一键生成 public\（npm run build：同步后台配置、检查、压缩宠物图、生成站点）...
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
echo 本地预览：npm run dev 或 npm run start（均为 4001，与 _config.local.yml 一致）
echo.
pause
