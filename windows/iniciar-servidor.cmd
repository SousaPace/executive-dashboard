@echo off
rem Arranca el dashboard y lo vuelve a levantar si se cae. Lo usa la tarea programada.
rem (ping espera 5 s: "timeout" no funciona sin consola, como corre la tarea)
rem Uso: iniciar-servidor.cmd "C:\Program Files\nodejs\node.exe" 3100
setlocal
cd /d "%~dp0.."
set "ROOT=%CD%"
set "NODE_EXE=%~1"
if "%NODE_EXE%"=="" set "NODE_EXE=node"
set "PORT=%~2"
if "%PORT%"=="" set "PORT=3100"
if not exist logs mkdir logs
:loop
echo [%date% %time%] Iniciando en el puerto %PORT% >> logs\servidor.log
rem Ruta absoluta: asi los scripts encuentran este node.exe por su linea de comando para detenerlo.
"%NODE_EXE%" "%ROOT%\node_modules\next\dist\bin\next" start -p %PORT% >> logs\servidor.log 2>&1
echo [%date% %time%] Se detuvo (codigo %errorlevel%), reinicio en 5 s >> logs\servidor.log
ping -n 6 127.0.0.1 > nul
goto loop
