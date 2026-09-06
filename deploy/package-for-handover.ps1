<#
.SYNOPSIS
    Builds a clean, self-contained copy of Syndicate IMS to install on
    another Windows laptop. See SETUP.md for what the recipient does with it.

.DESCRIPTION
    Copying the project folder by hand is the obvious approach and the wrong
    one -- it hands over things nobody should be handing over:

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

    -IncludePrivateData flips that for a trusted handover: it ships the .env
    as-is (mail credentials, app key -- so the recipient skips most of
    SETUP.md's configuration) and keeps whatever is under storage/app.

    Use it knowingly. The .env carries a Gmail App Password, which grants
    full access to that Google account, not just the ability to send mail;
    and storage/app is where customers' uploaded IDs and payment receipts
    live, which belong to them rather than to the project. It is off by
    default so that is a decision, never an accident.

    Logs and framework caches are purged either way -- old OTP codes and
    stale sessions are noise on a fresh install, not something to hand over.

.EXAMPLE
    ./deploy/package-for-handover.ps1
    ./deploy/package-for-handover.ps1 -Destination D:\handover
    ./deploy/package-for-handover.ps1 -IncludePrivateData
#>

param(
    [string]$Destination = "$env:USERPROFILE\Desktop\syndicate-ims-handover",

    # Ship the .env and everything under storage/app. See the note above.
    [switch]$IncludePrivateData
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

if ($IncludePrivateData) { $include += '.env' }

foreach ($item in $include) {
    $source = Join-Path $root $item
    if (-not (Test-Path $source)) { Warn "skipped (missing): $item"; continue }
    Copy-Item $source -Destination $Destination -Recurse -Force
    Write-Host "  + $item"
}

Step 'Removing anything private'

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
    # Nothing to refuse -- this is the deliberate path. Say plainly what is
    # going out, so it is visible rather than assumed.
    Warn 'Shipping PRIVATE DATA, because -IncludePrivateData was passed:'
    Warn '  .env  -- includes mail credentials and the app key'
    Warn "  storage/app -- $($uploads.Count) uploaded file(s)"
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

Write-Host "`n  Clean. $size MB at:" -ForegroundColor Green
Write-Host "  $Destination`n"

Write-Host 'Next:' -ForegroundColor Cyan
Write-Host '  1. Copy that folder to the other laptop as C:\xampp\htdocs\syndicate-ims'

if ($IncludePrivateData) {
    Write-Host '  2. Install XAMPP and start MySQL (SETUP.md steps 1-3)'
    Write-Host '  3. Create the database, then run:  php artisan migrate --seed'
    Write-Host '  4. They run start-syndicate.bat'
    Write-Host ''
    Write-Host '  The .env is already configured, so SETUP.md steps 5 and 6 are' -ForegroundColor Yellow
    Write-Host '  mostly done - but DB_DATABASE must still match the database they' -ForegroundColor Yellow
    Write-Host '  create, and the app key is shared with this machine.' -ForegroundColor Yellow
} else {
    Write-Host '  2. Have them follow SETUP.md (XAMPP, database, .env, migrate --seed)'
    Write-Host '  3. They run start-syndicate.bat'
    Write-Host ''
    Write-Host '  Note: no .env is included, on purpose. They generate their own' -ForegroundColor Yellow
    Write-Host '  APP_KEY and use their own mail credentials - see SETUP.md step 6.' -ForegroundColor Yellow
}
Write-Host ''
