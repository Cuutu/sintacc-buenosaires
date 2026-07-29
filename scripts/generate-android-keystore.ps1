# Genera keystore de release para Play Store.
# Output: secrets/celimap-release.keystore + android/key.properties
# NUNCA commitear esos archivos.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$secretsDir = Join-Path $root "secrets"
$keystorePath = Join-Path $secretsDir "celimap-release.keystore"
$keyPropsPath = Join-Path $root "android\key.properties"

New-Item -ItemType Directory -Force -Path $secretsDir | Out-Null

if (Test-Path $keystorePath) {
  Write-Host "Keystore ya existe: $keystorePath"
  Write-Host "Si queres regenerar, borralo primero."
  exit 0
}

$keytool = Get-Command keytool -ErrorAction SilentlyContinue
if (-not $keytool) {
  $javaHome = $env:JAVA_HOME
  if ($javaHome) {
    $keytoolPath = Join-Path $javaHome "bin\keytool.exe"
  } else {
    Write-Error "keytool no encontrado. Instala JDK 17+ y agrega al PATH."
  }
} else {
  $keytoolPath = $keytool.Source
}

$storePassword = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 24 | ForEach-Object { [char]$_ })
$keyPassword = $storePassword

& $keytoolPath -genkeypair `
  -v `
  -storetype PKCS12 `
  -keystore $keystorePath `
  -alias celimap `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000 `
  -storepass $storePassword `
  -keypass $keyPassword `
  -dname "CN=Celimap, OU=Mobile, O=Celimap, L=Buenos Aires, ST=CABA, C=AR"

@"
storePassword=$storePassword
keyPassword=$keyPassword
keyAlias=celimap
storeFile=../secrets/celimap-release.keystore
"@ | Set-Content -Path $keyPropsPath -Encoding UTF8

Write-Host ""
Write-Host "OK keystore: $keystorePath"
Write-Host "OK key.properties: $keyPropsPath"
Write-Host "BACKUP offline de secrets/ y key.properties. Sin esto no podes actualizar la app en Play."
