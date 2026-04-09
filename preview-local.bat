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
echo [1/3] 正在 git pull 同步远程 ...
git pull
if errorlevel 1 (
  echo git pull 失败，请处理冲突或网络后再试。
  pause
  exit /b 1
)

echo.
echo [2/3] 仓库健康检查（合并冲突标记、site_cms.yml）...
call npm.cmd run validate
if errorlevel 1 (
  pause
  exit /b 1
)

echo.
echo [3/3] 启动 Hexo 本地预览（_config + _config.local，端口 4001）
echo 浏览器打开终端里显示的地址；仅预览站点，不含 Decap 代理。
echo 若只要预览、不要每次 pull，可在终端执行： npm run preview
echo.
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:4001/"

call npm.cmd run preview
pause
