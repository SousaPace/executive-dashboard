<#
  Registra el dashboard para que arranque solo al encender el servidor (tarea programada como
  SYSTEM, sin cuenta de usuario abierta), lo reinicia si se cae y abre el puerto en el firewall
  para que las televisiones lo vean.

  Uso (PowerShell como administrador, después de instalar.ps1):
    powershell -ExecutionPolicy Bypass -File .\windows\servicio.ps1              # instalar / reiniciar
    powershell -ExecutionPolicy Bypass -File .\windows\servicio.ps1 -Port 8080   # otro puerto
    powershell -ExecutionPolicy Bypass -File .\windows\servicio.ps1 -Quitar      # desinstalar
#>
param([int]$Port = 3100, [switch]$Quitar)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$taskName = 'Dashboard Capital de Trabajo'

$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) { throw 'Abre PowerShell como administrador (clic derecho > Ejecutar como administrador).' }

function Stop-Dashboard {
  if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
    Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
  }
  # Detener la tarea cierra cmd.exe pero puede dejar vivo a node.exe: cerrarlo también.
  Get-CimInstance Win32_Process -Filter "Name='cmd.exe'" |
    Where-Object { $_.CommandLine -like '*iniciar-servidor.cmd*' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
    Where-Object { $_.CommandLine -like "*$root*" } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}

if ($Quitar) {
  Stop-Dashboard
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
  Get-NetFirewallRule -DisplayName $taskName -ErrorAction SilentlyContinue | Remove-NetFirewallRule
  Write-Host 'Dashboard desinstalado (los datos en storage\ se conservan).' -ForegroundColor Green
  return
}

if (-not (Test-Path (Join-Path $root '.next\BUILD_ID'))) { throw 'Falta compilar: corre primero .\windows\instalar.ps1' }
$node = (Get-Command node -ErrorAction Stop).Source
$launcher = Join-Path $PSScriptRoot 'iniciar-servidor.cmd'
New-Item -ItemType Directory -Force -Path (Join-Path $root 'logs') | Out-Null

Stop-Dashboard
$action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument "/c `"`"$launcher`" `"$node`" $Port`"" -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
  -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null

if (-not (Get-NetFirewallRule -DisplayName $taskName -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName $taskName -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow | Out-Null
}

Start-ScheduledTask -TaskName $taskName
Write-Host "Arrancando en el puerto $Port..."
$ok = $false
for ($i = 0; $i -lt 30 -and -not $ok; $i++) {
  Start-Sleep -Seconds 2
  try { $ok = (Invoke-WebRequest "http://localhost:$Port/api/version" -UseBasicParsing -TimeoutSec 5).StatusCode -eq 200 } catch {}
}
if (-not $ok) { throw "No respondió en el puerto $Port. Revisa logs\servidor.log" }

$ips = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | Select-Object -ExpandProperty IPAddress
Write-Host "`nDashboard funcionando. Abre en cada televisión:" -ForegroundColor Green
foreach ($ip in $ips) { Write-Host "  http://${ip}:$Port   (inicio)   /todos  /finanzas  /inventario  /ventas" }
Write-Host "  Cargar el Excel: http://<servidor>:$Port/cargar"
