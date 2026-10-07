<#
  Actualiza el dashboard a la última versión de GitHub y lo reinicia.
  Uso (PowerShell como administrador):
    powershell -ExecutionPolicy Bypass -File .\windows\actualizar.ps1
#>
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

function Run([string]$what, [scriptblock]$cmd) {
  Write-Host "`n==> $what" -ForegroundColor Cyan
  & $cmd
  if ($LASTEXITCODE -ne 0) { throw "Falló: $what (código $LASTEXITCODE)" }
}

Run 'Descargar cambios (git pull)' { git pull --ff-only }

# Windows no deja reemplazar archivos que el servidor tiene abiertos: detenerlo antes de compilar.
$taskName = 'Dashboard Capital de Trabajo'
Write-Host "`n==> Detener el dashboard" -ForegroundColor Cyan
Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
Get-CimInstance Win32_Process -Filter "Name='cmd.exe'" |
  Where-Object { $_.CommandLine -like '*iniciar-servidor.cmd*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -like "*$root*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2
Run 'Instalar dependencias' { pnpm install --frozen-lockfile }
Run 'Compilar (next build)' { pnpm build }
# Vuelve a registrar y arrancar la tarea (también si nunca se había instalado).
& (Join-Path $PSScriptRoot 'servicio.ps1')
