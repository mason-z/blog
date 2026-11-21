@echo off
chcp 65001 >nul
cd /d "%~dp0"

if /I "%~1"=="debug" (
  echo [博客控制台] 调试模式（显示 CMD 窗口）
  call "%~dp0start-manage.bat"
  exit /b %errorlevel%
)

wscript.exe //nologo "%~dp0start-manage-hidden.vbs"
exit /b 0
