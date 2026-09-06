<#
.SYNOPSIS
    Builds a clean, self-contained copy of Syndicate IMS to install on
    another Windows laptop. See SETUP.md for what the recipient does with it.

.DESCRIPTION
    Copying the project folder by hand is the obvious approach and the wrong
    one — it hands over things nobody should be handing over:

      .env                              the developer's real Gmail App
                                        Password, and the app key
      storage/app/private-ids           customers' uploaded government IDs
      storage/app/private-payment-proofs customers' payment receipts
      storage/logs                      OTP codes and customer email
                                        addresses in plain text
      database backups / *.sql          whatever was lying around

    This script copies what is needed and nothing else, and refuses to run
    if the frontend has not been built (the recipient has no Node.js, so a
    missing public/build cannot be fixed on their machine).

    vendor/ and public/build ARE included on purpose: the target laptop gets
    no Composer, no Node, and possibly no internet.

.EXAMPLE
    ./deploy/package-for-handover.ps1
    ./deploy/package-for-handover.ps1 -Destination D:\handover
#>

param(
    [string]$Destination = "$env:USERPROFILE\Desktop\syndicate-ims-handover"
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

function Step($m) { Write-Host "`n=== $m ===" -ForegroundColor Cyan }
function Warn($m) { Write-Host "  ! $m" -ForegroundColor Yellow }
function Die($m)  { Write-Host "`n  X $m`n" -ForegroundColor Red; exit 1 }

Step 'Checking the build'

if (-not (Test-Path (Join-Path $root 'public\build\manifest.json'))) {
    Die @'
public/build is missing. The target laptop has no Node.js, so this cannot
be fixed there. Build it here first:

    npm.cmd run build
'@
}

# A stale build is worse than an obvious one: it silently ships old JS.
$manifest = Get-Item (Join-Path $root 'public\build\manifest.json')
$newestSource = Get-ChildItem (Join-Path $root 'resources') -Recurse -File |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1

if ($newestSource -and $newestSource.LastWriteTime -gt $manifest.LastWriteTime) {
    Warn "resources/ has changed since the last build ($($newestSource.Name))."
    Warn 'Run  npm.cmd run build  first, or the handover ships stale assets.'
    $answer = Read-Host '  Continue anyway? (y/N)'
    if ($answer -ne 'y') { exit 1 }
}

Step "Preparing $Destination"

if (Test-Path $Destination) {
    Remove-Item $Destination -Recurse -Force
}
New-Item -ItemType Directory -Path $Destination -Force | Out-Null

Step 'Copying'

# Everything the app needs to run, and nothing that identifies anyone.
$include = @(
    'app', 'bootstrap', 'config', 'database', 'lang', 'public', 'resources',
    'routes', 'storage', 'vendor', 'tests',
    'artisan', 'composer.json', 'composer.lock', 'phpunit.xml',
    '.env.example', 'SETUP.md', 'start-syndicate.bat', 'CLAUDE.md'
)

foreach ($item in $include) {
    $source = Join-Path $root $item
    if (-not (Test-Path $source)) { Warn "skipped (missing): $item"; continue }
    Copy-Item $source -Destination $Destination -Recurse -Force
    Write-Host "  + $item"
}

Step 'Removing anything private'

# storage/ is copied for its directory STRUCTURE (Laravel will not boot
# without framework/views, framework/cache, etc.) but every scrap of
# content in it belongs to this machine, not the handover.
$purge = @(
    'storage\app\private-ids',
    'storage\app\private-payment-proofs',
    'storage\logs',
    'storage\framework\cache\data',
    'storage\framework\sessions',
    'storage\framework\views',
    'bootstrap\cache'
)

foreach ($dir in $purge) {
    $path = Join-Path $Destination $dir
    if (Test-Path $path) {
        Get-ChildItem $path -Recurse -Force -ErrorAction SilentlyContinue |
            Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  - emptied $dir"
    }
    New-Item -ItemType Directory -Path $path -Force | Out-Null
    # Laravel needs these to exist; git normally keeps them with .gitignore.
    Set-Content -Path (Join-Path $path '.gitignore') -Value "*`n!.gitignore" -Encoding utf8
}

# Belt and braces: nothing that looks like a secret or a leftover dump.
#
# vendor/ is EXCLUDED from this sweep. It is a dependency tree that ships
# verbatim, and pattern-matching filenames inside it deletes other people's
# files — the first version of this script quietly removed
# laravel/sail/database/pgsql/create-testing-database.sql, which had nothing
# to do with anything. Nothing private is ever written into vendor/ anyway;
# secrets live in .env, storage/ and the project root.
$vendorPath = Join-Path $Destination 'vendor'

Get-ChildItem $Destination -Recurse -File -Force -ErrorAction SilentlyContinue |
    Where-Object { -not $_.FullName.StartsWith($vendorPath, 'OrdinalIgnoreCase') } |
    Where-Object { $_.Name -eq '.env' -or $_.Extension -in '.sql', '.sqlite', '.log' } |
    ForEach-Object { Remove-Item $_.FullName -Force; Write-Host "  - removed $($_.Name)" }

Step 'Verifying'

$leaks = @()
if (Test-Path (Join-Path $Destination '.env')) { $leaks += '.env is present' }

$idPhotos = Get-ChildItem (Join-Path $Destination 'storage\app') -Recurse -File -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -ne '.gitignore' }
if ($idPhotos) { $leaks += "$($idPhotos.Count) file(s) left under storage/app" }

if ($leaks.Count -gt 0) {
    Die ("Refusing to finish - " + ($leaks -join '; '))
}

$size = [math]::Round((Get-ChildItem $Destination -Recurse -File -Force |
    Measure-Object -Property Length -Sum).Sum / 1MB, 1)

Write-Host "`n  Clean. $size MB at:" -ForegroundColor Green
Write-Host "  $Destination`n"

Write-Host 'Next:' -ForegroundColor Cyan
Write-Host '  1. Copy that folder to the other laptop as C:\xampp\htdocs\syndicate-ims'
Write-Host '  2. Have them follow SETUP.md (XAMPP, database, .env, migrate --seed)'
Write-Host '  3. They run start-syndicate.bat'
Write-Host ''
Write-Host '  Note: no .env is included, on purpose. They generate their own' -ForegroundColor Yellow
Write-Host '  APP_KEY and use their own mail credentials - see SETUP.md step 6.' -ForegroundColor Yellow
Write-Host ''
