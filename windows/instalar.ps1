<#
  Instala y compila el dashboard en Windows (Windows Server 2022 / PowerShell 5.1).
  Requisito: Node.js 22 LTS (instalador .msi x64 de https://nodejs.org).

  Uso (PowerShell como administrador, en la carpeta del proyecto):
    powershell -ExecutionPolicy Bypass -File .\windows\instalar.ps1
    powershell -ExecutionPolicy Bypass -File .\windows\instalar.ps1 -Password "orion123"
#>
param([string]$Password)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

function Run([string]$what, [scriptblock]$cmd) {
  Write-Host "`n==> $what" -ForegroundColor Cyan
  & $cmd
  if ($LASTEXITCODE -ne 0) { throw "Falló: $what (código $LASTEXITCODE)" }
}

# 1. Node.js
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  throw 'No encontré Node.js. Instala Node.js 22 LTS (.msi x64) desde https://nodejs.org, abre una nueva ventana de PowerShell y vuelve a correr este script.'
}
$nodeVersion = [version]((& node -v).Trim().TrimStart('v'))
if ($nodeVersion -lt [version]'20.9.0') {
  throw "Node.js $nodeVersion es muy viejo: se necesita 20.9 o mayor (recomendado 22 LTS)."
}
Write-Host "Node.js $nodeVersion en $($node.Source)"

# 2. pnpm (la versión exacta que pide package.json)
$pkg = Get-Content (Join-Path $root 'package.json') -Raw | ConvertFrom-Json
$pnpmVersion = ($pkg.packageManager -split '@')[1]
$pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $pnpm -or ((& pnpm -v).Trim() -ne $pnpmVersion)) {
  Run "Instalar pnpm $pnpmVersion" { npm install -g "pnpm@$pnpmVersion" }
}

# 3. Dependencias y compilación
Run 'Instalar dependencias' { pnpm install --frozen-lockfile }

# 4. Contraseña de carga del Excel (.env.local, no se sube a git)
$envFile = Join-Path $root '.env.local'
if ($Password) {
  Set-Content -Path $envFile -Value "UPLOAD_PASSWORD=$Password" -Encoding ASCII
  Write-Host 'Contraseña de carga guardada en .env.local'
} elseif (-not (Test-Path $envFile) -or -not (Select-String -Path $envFile -Pattern '^UPLOAD_PASSWORD=.+' -Quiet)) {
  $secure = Read-Host 'Contraseña para subir el Excel en /cargar' -AsSecureString
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
  if (-not $plain) { throw 'La contraseña no puede quedar vacía.' }
  Set-Content -Path $envFile -Value "UPLOAD_PASSWORD=$plain" -Encoding ASCII
}

Run 'Compilar (next build)' { pnpm build }

Write-Host "`nListo. Siguiente paso: .\windows\servicio.ps1 para que arranque solo con el servidor." -ForegroundColor Green
