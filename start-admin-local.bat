@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist "node_modules\decap-server\" (
  echo [首次运行] 正在安装依赖 ...
  call npm.cmd install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)

echo.
echo 本地后台：Decap 代理(8081) + Hexo(4001)
echo 等终端出现「Hexo is running at http://localhost:4001/」后再打开浏览器。
echo 地址请用（末尾必须有斜杠）：  http://localhost:4001/admin/
echo 关闭本窗口会同时停止代理与 Hexo。
echo.
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:4001/admin/"

call npm.cmd run dev:admin
pause
