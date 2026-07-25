$ErrorActionPreference = "Stop"

$PackageDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $PackageDir

if (-not (Test-Path (Join-Path $RepoRoot ".git"))) {
  throw "Folder paket harus berada langsung di root repository DEBRODER."
}

Set-Location $RepoRoot
$branch = (git branch --show-current).Trim()
if ($branch -ne "LANDING-PAGE-PUBLIC") {
  throw "Branch aktif harus LANDING-PAGE-PUBLIC. Branch saat ini: $branch"
}

$targets = @(
  "app/page.tsx",
  "app/globals.css",
  "components/CampaignBanners.tsx"
)

foreach ($target in $targets) {
  if (-not (Test-Path (Join-Path $RepoRoot $target))) {
    throw "Target tidak ditemukan: $target"
  }
}

git diff --quiet -- $targets
if ($LASTEXITCODE -ne 0) {
  throw "Ada perubahan lokal pada file target. Commit/stash dulu agar patch tidak menimpa pekerjaan lain."
}
git diff --cached --quiet -- $targets
if ($LASTEXITCODE -ne 0) {
  throw "Ada staged changes pada file target. Commit/unstage dulu."
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $RepoRoot ".debroder-backups/landing-visual-batch2-$stamp"
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
foreach ($target in $targets) {
  $backupPath = Join-Path $backupRoot $target
  New-Item -ItemType Directory -Path (Split-Path -Parent $backupPath) -Force | Out-Null
  Copy-Item (Join-Path $RepoRoot $target) $backupPath -Force
}

node (Join-Path $PackageDir "apply-landing-visual-batch2.mjs")
if ($LASTEXITCODE -ne 0) {
  throw "Patch gagal. File cadangan: $backupRoot"
}

git diff --check
if ($LASTEXITCODE -ne 0) {
  throw "git diff --check gagal. File cadangan: $backupRoot"
}

Write-Host "PASS: Landing Visual Batch 2 diterapkan." -ForegroundColor Green
Write-Host "Scope: Campaign Banner, Fresh Drop, Shop by Category."
Write-Host "Backup: $backupRoot"
Write-Host "Berikutnya: pnpm.cmd build"
Write-Host "Belum commit, push, atau deploy."
