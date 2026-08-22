param(
  [string]$ConfigPath = "data/certificate-sync.json"
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$config = Get-Content -Raw (Join-Path $root $ConfigPath) | ConvertFrom-Json
$sourceDirectory = [Environment]::ExpandEnvironmentVariables($config.sourceDirectory)

if (-not (Test-Path -LiteralPath $sourceDirectory)) {
  throw "No existe la carpeta configurada: $sourceDirectory"
}

$knownHashes = @{}
Get-ChildItem -LiteralPath (Join-Path $root "certificados") -File -Filter "*.pdf" | ForEach-Object {
  $knownHashes[(Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash] = $true
}

$ignored = @{}
$config.ignoredFiles | ForEach-Object { $ignored[$_] = $true }

$newCertificates = Get-ChildItem -LiteralPath $sourceDirectory -File | Where-Object {
  $_.Extension -in @(".pdf", ".png", ".jpg", ".jpeg") -and -not $ignored.ContainsKey($_.Name)
} | ForEach-Object {
  $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash
  if (-not $knownHashes.ContainsKey($hash)) {
    [PSCustomObject]@{
      name = $_.Name
      path = $_.FullName
      modified = $_.LastWriteTime.ToString("o")
      sha256 = $hash
    }
  }
}

$newCertificates | ConvertTo-Json -Depth 3
if (-not $newCertificates) {
  Write-Host "No se encontraron certificados nuevos."
}
