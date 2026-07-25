$ErrorActionPreference = "Stop"

$expectedBranch = "AKUN-ADMIN"
$path = "supabase/migrations/20260725023000_admin_rbac_direct_roles_v1.sql"
$commitMessage = "fix(admin-rbac): correct profiles record assignment in migration"

$currentBranch = (git branch --show-current).Trim()
if ($LASTEXITCODE -ne 0) {
    throw "Gagal membaca branch Git."
}
if ($currentBranch -ne $expectedBranch) {
    throw "Branch aktif '$currentBranch'. Pindah ke branch '$expectedBranch' terlebih dahulu."
}

if (-not (Test-Path -LiteralPath $path)) {
    throw "File migration tidak ditemukan: $path"
}

$existingStatus = git status --porcelain -- $path
if ($LASTEXITCODE -ne 0) {
    throw "Gagal memeriksa status file migration."
}
if ($existingStatus) {
    throw "File migration sudah memiliki perubahan lokal. Script dihentikan agar perubahan lain tidak tertimpa."
}

$content = [System.IO.File]::ReadAllText((Resolve-Path -LiteralPath $path))
$newLine = if ($content.Contains("`r`n")) { "`r`n" } else { "`n" }

$pattern = "(?ms)^  select profile_row, lower\(coalesce\(profile_row\.email,''\)\)\r?\n  into target_row, target_email\r?\n  from public\.profiles profile_row\r?\n  where profile_row\.id = p_profile_id\r?\n  for update;\r?\n\r?\n  if not found then raise exception 'Profil tidak ditemukan'; end if;"

$replacementLines = @(
    "  select profile_row.*"
    "  into target_row"
    "  from public.profiles profile_row"
    "  where profile_row.id = p_profile_id"
    "  for update;"
    ""
    "  if not found then raise exception 'Profil tidak ditemukan'; end if;"
    "  target_email := lower(coalesce(target_row.email,''));"
)
$replacement = $replacementLines -join $newLine

$matches = [regex]::Matches($content, $pattern)
if ($matches.Count -eq 0) {
    if (
        $content.Contains("select profile_row.*") -and
        $content.Contains("target_email := lower(coalesce(target_row.email,''));")
    ) {
        Write-Host "File migration sudah menggunakan perbaikan yang benar." -ForegroundColor Yellow
    } else {
        throw "Baseline migration berbeda. Tidak ada file yang ditimpa."
    }
} elseif ($matches.Count -ne 1) {
    throw "Ditemukan $($matches.Count) blok target. Script dihentikan."
} else {
    $updated = [regex]::Replace($content, $pattern, [System.Text.RegularExpressions.MatchEvaluator]{
        param($match)
        return $replacement
    }, 1)

    $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText((Resolve-Path -LiteralPath $path), $updated, $utf8NoBom)
    Write-Host "Migration source berhasil diperbaiki." -ForegroundColor Green
}

git diff --check -- $path
if ($LASTEXITCODE -ne 0) {
    throw "git diff --check gagal."
}

$changed = git status --porcelain -- $path
if (-not $changed) {
    Write-Host "Tidak ada perubahan baru untuk di-commit." -ForegroundColor Yellow
    exit 0
}

git add -- $path
if ($LASTEXITCODE -ne 0) {
    throw "git add gagal."
}

git commit -m $commitMessage
if ($LASTEXITCODE -ne 0) {
    throw "git commit gagal."
}

git push origin $expectedBranch
if ($LASTEXITCODE -ne 0) {
    throw "git push gagal."
}

Write-Host ""
Write-Host "SELESAI: satu file migration sudah diperbaiki, di-commit, dan di-push ke AKUN-ADMIN." -ForegroundColor Green
