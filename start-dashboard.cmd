@echo off
cd /d "%~dp0"
start "" "http://localhost:8010"
node server.js
pause
