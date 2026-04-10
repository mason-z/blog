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
echo [1/2] 仓库健康检查（合并冲突标记、site_cms.yml）...
call npm.cmd run validate
if errorlevel 1 (
  pause
  exit /b 1
)

echo.
echo [2/2] 启动 Hexo 本地预览（_config + _config.local，端口 4001）
echo 浏览器打开终端里显示的地址；仅预览站点，不含 Decap 代理。
echo 需要与远程同步时请在本目录自行执行： git pull
echo.
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:4001/"

call npm.cmd run preview
pause
