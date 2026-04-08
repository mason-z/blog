@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist "node_modules\http-server\" (
  echo [首次运行] 正在安装 http-server ...
  call npm.cmd install
  if errorlevel 1 (
    echo 安装失败。
    pause
    exit /b 1
  )
)

set "PORT=4002"
echo.
echo 仅浏览已生成的 public 文件夹（需先 npm run build）
echo 不要用「双击 index.html」—— file:/// 无法加载 /css 等根路径资源。
echo 本窗口将启动： http://localhost:%PORT%/
echo 关闭本窗口即停止。
echo.

start "" cmd /c "timeout /t 1 /nobreak >nul & start http://localhost:%PORT%/"

call npx.cmd http-server public -p %PORT% -c-1
pause
