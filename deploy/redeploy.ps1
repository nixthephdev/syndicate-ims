<#
.SYNOPSIS
    Redeploys Syndicate IMS to the live Hostinger site.

.DESCRIPTION
    Codifies the manual deploy process from 2026-09-04 into one command:
    build frontend assets, package the app (excluding dev-only files),
    upload, install PHP deps, migrate, fix permissions.

    Deliberately does NOT touch the server's .env — that file is never
    part of the uploaded package, so production secrets (DB password,
    APP_KEY) are untouched on every redeploy.

    Deliberately does NOT run `--seed` — DatabaseSeeder uses Product::create()
    with no dedupe guard, so re-seeding an already-seeded database would
    create duplicate rows, not update existing ones. Only `migrate --force`
    runs, which is safe to repeat (Laravel tracks which migrations already ran).

.NOTES
    Requires: the SSH key already added to Hostinger (see hpanel > SSH Access
    > SSH keys) — C:\Users\Nix\.ssh\hostinger_syndicate as of this writing.
    Uses `tar`, not `Compress-Archive` — PowerShell's zip creation stores
    backslash path separators that confuse Linux `unzip` into creating
    directories with broken (mode 000) permissions. Learned that one the
    hard way on the very first deploy; do not switch back to zip.
#>

$ErrorActionPreference = 'Stop'

# Defensive: node/php/composer/ssh aren't always on PATH in every shell this
# might run from (e.g. a fresh non-interactive session). Harmless to prepend
# even when they're already resolvable.
$env:PATH = "C:\Program Files\nodejs;C:\xampp\php;C:\composer;C:\Users\Nix\AppData\Local\Programs\Git\cmd;" + $env:PATH

$ProjectRoot = "c:\xampp\htdocs\syndicate-ims"
$SshKey = "C:\Users\Nix\.ssh\hostinger_syndicate"
$SshPort = 65002
$SshHost = "u816959808@153.92.9.239"
$RemoteAppDir = "~/syndicate-ims"
$ScratchDir = Join-Path $env:TEMP "syndicate-redeploy"

function Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }

Step "Building frontend assets"
Push-Location $ProjectRoot
& npm run build
if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }
Pop-Location

Step "Packaging (excluding dev-only files)"
if (Test-Path $ScratchDir) { Remove-Item $ScratchDir -Recurse -Force }
New-Item -ItemType Directory -Path $ScratchDir | Out-Null

robocopy $ProjectRoot $ScratchDir /E `
    /XD node_modules vendor .git tests reference docs .claude .vscode .idea .fleet deploy "$ProjectRoot\public\files" `
    /XF .env .env.backup .env.production .phpunit.result.cache Homestead.json Homestead.yaml auth.json npm-debug.log yarn-error.log "*.key" `
    /NFL /NDL /NJH /NP | Out-Null
# robocopy's own "files copied" exit code (1) is success, not failure —
# only >= 8 is a real error. $LASTEXITCODE isn't reliable here across
# PowerShell versions, so this step deliberately does not check it.

# Vite's dev-server marker — if `npm run dev` was running locally when this
# packages, this file exists and would make the LIVE site try to load assets
# from a dev server that doesn't exist there. Must never ship.
Remove-Item (Join-Path $ScratchDir "public\hot") -Force -ErrorAction SilentlyContinue

# Local-only runtime artifacts — safe to clear, Laravel regenerates them.
Get-ChildItem (Join-Path $ScratchDir "storage\framework\sessions") -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -ne '.gitignore' } | Remove-Item -Force
Get-ChildItem (Join-Path $ScratchDir "storage\framework\views") -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -ne '.gitignore' } | Remove-Item -Force
Get-ChildItem (Join-Path $ScratchDir "storage\framework\cache\data") -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -ne '.gitignore' } | Remove-Item -Force
Remove-Item (Join-Path $ScratchDir "storage\logs\laravel.log") -Force -ErrorAction SilentlyContinue

$TarPath = Join-Path $ScratchDir "..\deploy.tar.gz"
if (Test-Path $TarPath) { Remove-Item $TarPath -Force }
Push-Location $ScratchDir
& tar -czf $TarPath *
Pop-Location
$sizeMB = [math]::Round((Get-Item $TarPath).Length / 1MB, 1)
Write-Host "Package: $sizeMB MB"

Step "Uploading"
& scp -P $SshPort -i $SshKey $TarPath "${SshHost}:~/deploy.tar.gz"
if ($LASTEXITCODE -ne 0) { throw "scp upload failed" }

Step "Extracting and installing on server"
$remoteCmd = "cd $RemoteAppDir && tar -xzf ~/deploy.tar.gz && rm ~/deploy.tar.gz && " +
    "composer install --no-dev --optimize-autoloader --no-interaction && " +
    "php artisan migrate --force && " +
    "chmod -R 775 storage bootstrap/cache && " +
    "echo REDEPLOY_OK"
& ssh -p $SshPort -i $SshKey $SshHost $remoteCmd
if ($LASTEXITCODE -ne 0) { throw "Remote deploy steps failed" }

Step "Cleaning up local staging files"
Remove-Item $ScratchDir -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $TarPath -Force -ErrorAction SilentlyContinue

Write-Host "`nDone. https://lightblue-echidna-162258.hostingersite.com" -ForegroundColor Green
