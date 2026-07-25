$ErrorActionPreference = "Stop"

$packageRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $packageRoot

$required = @(
  "package.json",
  "app/page.tsx",
  "app/globals.css",
  "components/PublicStoreLocator.tsx",
  "components/PublicFooter.tsx"
)

foreach ($relative in $required) {
  if (-not (Test-Path (Join-Path $repoRoot $relative))) {
    throw "STOP: Root repo tidak valid atau file tidak ditemukan: $relative"
  }
}

$pageCurrent = Get-Content (Join-Path $repoRoot "app/page.tsx") -Raw
$cssCurrent = Get-Content (Join-Path $repoRoot "app/globals.css") -Raw

if ($pageCurrent -notmatch 'className="public-site landing-nike') {
  throw "STOP: Baseline landing-nike tidak ditemukan. Jangan terapkan package ini."
}

if ($cssCurrent -notmatch 'DEBRODER_LANDING_VISUAL_BATCH_2') {
  throw "STOP: Baseline Batch 2 tidak ditemukan. Pull source terbaru terlebih dahulu."
}

if ($cssCurrent -match 'DEBRODER_LANDING_VISUAL_BATCH_3') {
  throw "STOP: Batch 3 sudah pernah diterapkan."
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupBase = Join-Path $env:TEMP "DEBRODER_BACKUPS"
$backupRoot = Join-Path $backupBase "landing-batch3-$timestamp"
New-Item -ItemType Directory -Path (Join-Path $backupRoot "app") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $backupRoot "components") -Force | Out-Null

$files = @(
  "app/page.tsx",
  "app/globals.css",
  "components/PublicStoreLocator.tsx",
  "components/PublicFooter.tsx"
)

foreach ($relative in $files) {
  $source = Join-Path $packageRoot $relative
  $target = Join-Path $repoRoot $relative
  $backup = Join-Path $backupRoot $relative

  Copy-Item $target $backup -Force
  Copy-Item $source $target -Force
}

Write-Host "PASS: LANDING VISUAL BATCH 3 diterapkan." -ForegroundColor Green
Write-Host "Scope: Store, Cara Order, About, Footer, final mobile polish."
Write-Host "Tidak ada build, commit, push, deploy, database, atau admin change."
Write-Host "Backup: $backupRoot"
