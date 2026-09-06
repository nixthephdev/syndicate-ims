<#
.SYNOPSIS
    Builds a clean, self-contained copy of Syndicate IMS to install on
    another Windows laptop. See SETUP.md for what the recipient does with it.

.DESCRIPTION
    Produces a folder that runs on another Windows laptop with nothing but
    XAMPP installed. vendor/ and public/build are included on purpose: the
    target machine gets no Composer, no Node, and possibly no internet.

    The configured .env ships too, so mail and the app key work immediately
    and the recipient skips most of SETUP.md. The accounts behind it are
    test accounts, which is the developer's call to make and the reason this
    is the default rather than a flag.

    It refuses to run if the frontend has not been built -- the recipient
    has no Node.js, so a missing public/build cannot be fixed there.

    -Clean produces a sanitised copy instead: no .env, no uploaded files.
    Use that if this ever goes to someone outside the project.

    Logs and framework caches are dropped either way. That is not caution,
    it is correctness -- stale compiled views and old sessions cause real
    misbehaviour on a fresh install, and old logs are just noise.

.EXAMPLE
    ./deploy/package-for-handover.ps1
    ./deploy/package-for-handover.ps1 -Destination D:\handover
    ./deploy/package-for-handover.ps1 -Clean
#>

param(
    [string]$Destination = "$env:USERPROFILE\Desktop\syndicate-ims-handover",

    # Strip the .env and everything under storage/app. Off by default.
    [switch]$Clean
)

# Everything below was written the other way round; one flip keeps it honest.
$IncludePrivateData = -not $Clean

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

if ($IncludePrivateData) { $include += '.env' }

foreach ($item in $include) {
    $source = Join-Path $root $item
    if (-not (Test-Path $source)) { Warn "skipped (missing): $item"; continue }
    Copy-Item $source -Destination $Destination -Recurse -Force
    Write-Host "  + $item"
}

Step 'Clearing caches and logs'

# storage/ is copied for its directory STRUCTURE (Laravel will not boot
# without framework/views, framework/cache, etc.) but its content belongs to
# this machine, not the handover.
#
# Logs and caches go regardless of -IncludePrivateData: old OTP codes and
# stale sessions are noise on a fresh install, and a session cache keyed to
# a different APP_KEY actively misbehaves.
$purge = @(
    'storage\logs',
    'storage\framework\cache\data',
    'storage\framework\sessions',
    'storage\framework\views',
    'bootstrap\cache'
)

if (-not $IncludePrivateData) {
    $purge += 'storage\app\private-ids'
    $purge += 'storage\app\private-payment-proofs'
}

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
# files -- the first version of this script quietly removed
# laravel/sail/database/pgsql/create-testing-database.sql, which had nothing
# to do with anything. Nothing private is ever written into vendor/ anyway;
# secrets live in .env, storage/ and the project root.
$vendorPath = Join-Path $Destination 'vendor'
$appDataPath = Join-Path $Destination 'storage\app'

Get-ChildItem $Destination -Recurse -File -Force -ErrorAction SilentlyContinue |
    Where-Object { -not $_.FullName.StartsWith($vendorPath, 'OrdinalIgnoreCase') } |
    Where-Object {
        # Uploaded receipts are .jpg, so they never match below -- but keep
        # storage/app out of the sweep entirely when it is being shipped
        # deliberately, so nothing here can second-guess that choice.
        -not ($IncludePrivateData -and $_.FullName.StartsWith($appDataPath, 'OrdinalIgnoreCase'))
    } |
    Where-Object {
        ($_.Name -eq '.env' -and -not $IncludePrivateData) -or
        $_.Extension -in '.sql', '.sqlite', '.log'
    } |
    ForEach-Object { Remove-Item $_.FullName -Force; Write-Host "  - removed $($_.Name)" }

Step 'Verifying'

$uploads = @(Get-ChildItem (Join-Path $Destination 'storage\app') -Recurse -File -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -ne '.gitignore' })

if ($IncludePrivateData) {
    Write-Host "  includes .env and $($uploads.Count) uploaded file(s)"
} else {
    $leaks = @()
    if (Test-Path (Join-Path $Destination '.env')) { $leaks += '.env is present' }
    if ($uploads.Count -gt 0) { $leaks += "$($uploads.Count) file(s) left under storage/app" }

    if ($leaks.Count -gt 0) {
        Die ("Refusing to finish - " + ($leaks -join '; '))
    }
}

$size = [math]::Round((Get-ChildItem $Destination -Recurse -File -Force |
    Measure-Object -Property Length -Sum).Sum / 1MB, 1)

Write-Host "`n  Done. $size MB at:" -ForegroundColor Green
Write-Host "  $Destination`n"

Write-Host 'Next:' -ForegroundColor Cyan
Write-Host '  1. Copy that folder to the other laptop as C:\xampp\htdocs\syndicate-ims'

if ($IncludePrivateData) {
    Write-Host '  2. Install XAMPP and start MySQL (SETUP.md steps 1-3)'
    Write-Host '  3. Create the database, then run:  php artisan migrate --seed'
    Write-Host '  4. They run start-syndicate.bat'
    Write-Host ''
    Write-Host '  .env is already configured - mail and the app key work as-is.' -ForegroundColor Cyan
    Write-Host '  Only check DB_DATABASE matches the database they create.' -ForegroundColor Cyan
} else {
    Write-Host '  2. Have them follow SETUP.md (XAMPP, database, .env, migrate --seed)'
    Write-Host '  3. They run start-syndicate.bat'
    Write-Host ''
    Write-Host '  Note: no .env is included, on purpose. They generate their own' -ForegroundColor Yellow
    Write-Host '  APP_KEY and use their own mail credentials - see SETUP.md step 6.' -ForegroundColor Yellow
}
Write-Host ''
