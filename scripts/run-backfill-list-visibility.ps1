# Backfill visibility de listas — MongoDB Atlas
# Uso:
#   1) Pegá tu MONGODB_URI abajo (o dejá vacío si ya está en .env.local)
#   2) PowerShell:  .\scripts\run-backfill-list-visibility.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

# --- PEGÁ ACÁ TU URI DE ATLAS (o dejá "" para usar .env.local) ---
$AtlasUri = ""

if ($AtlasUri -and $AtlasUri.Trim().Length -gt 0) {
  $env:MONGODB_URI = $AtlasUri.Trim()
}

if (-not $env:MONGODB_URI) {
  $envFile = Join-Path (Get-Location) ".env.local"
  if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
      $line = $_.Trim()
      if (-not $line -or $line.StartsWith("#")) { return }
      $eq = $line.IndexOf("=")
      if ($eq -lt 1) { return }
      $key = $line.Substring(0, $eq).Trim()
      $val = $line.Substring($eq + 1).Trim().Trim('"').Trim("'")
      if ($key -eq "MONGODB_URI" -and -not $env:MONGODB_URI) {
        $env:MONGODB_URI = $val
      }
    }
  }
}

if (-not $env:MONGODB_URI) {
  Write-Host ""
  Write-Host "Falta MONGODB_URI." -ForegroundColor Red
  Write-Host "Editá este archivo y pegá la URI en `$AtlasUri, o creá .env.local con:"
  Write-Host '  MONGODB_URI=mongodb+srv://USER:PASS@CLUSTER.mongodb.net/dbname?retryWrites=true&w=majority'
  Write-Host ""
  exit 1
}

Write-Host "Corriendo backfill contra Atlas..." -ForegroundColor Cyan
npm run backfill:list-visibility
