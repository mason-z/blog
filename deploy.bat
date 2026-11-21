@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist "node_modules\hexo\" (
  echo [一键上线] 首次运行: npm install ...
  call npm.cmd install
  if errorlevel 1 goto fail
)

echo.
echo [一键上线] 1/3 手机 Syncthing 通道 → 博客 source\_posts / assets
echo          配置: tools\sync-phone-channel.config.json
echo.
call node tools\sync-phone-channel.cjs
if errorlevel 1 goto fail

echo.
echo [一键上线] 2/3 检查 Cloudflare 登录 ...
call npx.cmd wrangler whoami >nul 2>&1
if errorlevel 1 (
  echo.
  echo [一键上线] 未登录 Cloudflare。请先在本窗口执行：
  echo   npx wrangler login
  echo 浏览器授权成功后，再双击本脚本。
  echo.
  pause
  exit /b 1
)

echo.
echo [一键上线] 3/3 构建 public + 上传 Pages ...
call npm.cmd run deploy
if errorlevel 1 goto fail

echo.
echo [一键上线] 完成: https://meiso-945.pages.dev/
echo.
pause
exit /b 0

:fail
echo.
echo [一键上线] 失败，请查看上方报错。
pause
exit /b 1
