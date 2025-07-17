@echo off
REM ——————————————————————————————
REM URIA Startup Script
REM Arranca la GUI sin abrir consola visible
REM ——————————————————————————————

REM Cambia al directorio del batch (ubicación de main_gui.exe)
cd /d "%~dp0"

REM Ejecuta el .exe
start "" "main_gui.exe"

REM Salir del script
exit /b
