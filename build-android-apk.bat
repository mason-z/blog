@echo off
set "JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot"
cd /d "%~dp0manage-android"
if not exist "gradle\wrapper\gradle-wrapper.jar" (
  echo [apk] Downloading Gradle wrapper jar...
  powershell -NoProfile -Command "Invoke-WebRequest -Uri 'https://github.com/gradle/gradle/raw/v8.7.0/gradle/wrapper/gradle-wrapper.jar' -OutFile 'gradle/wrapper/gradle-wrapper.jar'"
)
echo [apk] assembleDebug ...
call gradlew.bat assembleDebug
if errorlevel 1 exit /b 1
echo.
copy /Y "app\build\outputs\apk\debug\app-debug.apk" "%~dp0meiso-quicknote-debug.apk" >nul
echo [apk] OK: %~dp0meiso-quicknote-debug.apk
pause
