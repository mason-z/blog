@echo off
rem 旧控制台已退役：统一从 blog-admin 启动（后台 8780 + 预览 4010）
cd /d "%~dp0"

if exist "..\blog-admin\启动后台.bat" (
  call "..\blog-admin\启动后台.bat"
  exit /b %errorlevel%
)

echo.
echo 找不到 ..\blog-admin\启动后台.bat
echo 请确认 blog-admin 目录与 mcblog_git_public 在同一级。
pause
exit /b 1
