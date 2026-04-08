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

set "PORT=4001"
echo.
echo 启动 Hexo 预览  http://localhost:%PORT%/
echo 关闭本窗口即停止服务。
echo.

rem 稍后再打开浏览器，减少「页面打不开」；若仍空白请刷新一次
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:%PORT%/"

call npm.cmd run server:4001
pause
