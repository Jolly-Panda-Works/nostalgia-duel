@echo off
cd /d "%~dp0"
call npm run build
if errorlevel 1 goto failed
echo Open the Local or LAN address printed below in your browsers.
node online\server.mjs
goto end
:failed
echo Build failed. Run npm ci first.
:end
pause
