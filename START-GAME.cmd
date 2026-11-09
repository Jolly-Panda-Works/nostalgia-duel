@echo off
cd /d "%~dp0"
call npm run build
if errorlevel 1 goto failed
node scripts\standalone.mjs
if errorlevel 1 goto failed
start "" "%~dp0out\play.html"
exit /b 0
:failed
echo Could not prepare the game. Run npm ci and try again.
pause
