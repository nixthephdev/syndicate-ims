<#
.SYNOPSIS
    Creates a Windows/XAMPP handoff folder and ZIP without local credentials.
.DESCRIPTION
    Run npm.cmd run build first. Includes tracked application source, vendor,
    and public/build. Excludes AI instructions, Git history, node_modules,
    local .env files, database dumps, uploads, sessions, logs, and caches.
    Requires Git and PowerShell on the packaging machine, only XAMPP on the
    receiving machine. Never overwrites an existing destination or ZIP.
.EXAMPLE
    ./deploy/package-for-handover.ps1
#>
param(
    [string]$Destination = '',
    # Retained for compatibility; every handoff is now clean.
    [switch]$Clean,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
if (-not $Destination) {
    $Destination = Join-Path $root ("dist\handover-" + (Get-Date -Format 'yyyyMMdd-HHmmss') + '\syndicate-ims')
}
$Destination = [IO.Path]::GetFullPath($Destination)
$zipPath = "$Destination.zip"
if ((Test-Path -LiteralPath $Destination) -or (Test-Path -LiteralPath $zipPath)) {
    throw 'Destination or ZIP already exists. Choose a new destination.'
}
if (-not (Test-Path -LiteralPath (Join-Path $root 'vendor\autoload.php'))) {
    throw 'Missing vendor dependencies. Run composer install first.'
}
$manifestPath = Join-Path $root 'public\build\manifest.json'
if (-not (Test-Path -LiteralPath $manifestPath)) {
    throw 'Missing frontend build. Run npm.cmd run build first.'
}
$newerInputs = @(Get-ChildItem (Join-Path $root 'resources\js'), (Join-Path $root 'resources\css') -File -Recurse |
    Where-Object { $_.LastWriteTime -gt (Get-Item -LiteralPath $manifestPath).LastWriteTime })
if ($newerInputs.Count -and -not $Force) {
    throw 'Frontend sources are newer than the build. Run npm.cmd run build first.'
}

function IsExcluded([string]$relative) {
    return ($relative -match '(?i)(^|/)([^/]*claude[^/]*|\.codex|\.agents|AGENTS\.md|\.git|node_modules)(/|$)') -or
        (($relative -match '(?i)(^|/)(\.env(\..*)?|auth\.json|[^/]+\.(sql|sqlite|sqlite3|log|pem|key))$') -and
        $relative -ne '.env.example')
}

function CopyRelative([string]$relative) {
    if (IsExcluded $relative) { return }
    $source = Join-Path $root $relative
    $target = Join-Path $Destination $relative
    New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
    Copy-Item -LiteralPath $source -Destination $target -Force
}

Write-Host 'Copying application source and runtime assets...'
New-Item -ItemType Directory -Path $Destination -Force | Out-Null
$tracked = @(& git -C $root ls-files)
if ($LASTEXITCODE -ne 0) { throw 'Unable to list application source using Git.' }
$sourceFiles = $tracked | Where-Object {
    $_ -match '^(app|config|database|lang|public|resources|routes|tests)/' -and
    $_ -notmatch '^public/(storage|hot|build)(/|$)' -and
    $_ -notmatch '^database/.*\.(sql|sqlite|sqlite3)$'
}
foreach ($relative in $sourceFiles) { CopyRelative $relative }
foreach ($relative in @(
    'bootstrap/app.php', 'artisan', 'composer.json', 'composer.lock',
    'package.json', 'package-lock.json', 'phpunit.xml', 'vite.config.js',
    'tailwind.config.js', 'postcss.config.js', 'jsconfig.json', '.editorconfig',
    '.env.example', 'SETUP.md', 'start-syndicate.bat'
)) { CopyRelative $relative }

# These dependencies and compiled assets are not tracked in Git.
foreach ($directory in @('vendor', 'public/build')) {
    foreach ($file in Get-ChildItem (Join-Path $root $directory) -File -Recurse -Force) {
        $relative = $file.FullName.Substring($root.Length + 1).Replace('\', '/')
        # Keep dependency fixtures verbatim, except AI instruction files.
        if ($relative -match '(?i)(^|/)([^/]*claude[^/]*|\.codex|\.agents|AGENTS\.md)(/|$)') { continue }
        $target = Join-Path $Destination $relative
        New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
        Copy-Item -LiteralPath $file.FullName -Destination $target -Force
    }
}

# Generate empty runtime directories instead of copying local user data.
foreach ($directory in @(
    'bootstrap/cache', 'storage/app/public', 'storage/framework/cache/data',
    'storage/framework/sessions', 'storage/framework/views', 'storage/logs'
)) {
    $path = Join-Path $Destination $directory
    New-Item -ItemType Directory -Path $path -Force | Out-Null
    [IO.File]::WriteAllText((Join-Path $path '.gitignore'), "*`n!.gitignore`n")
}

Write-Host 'Creating ZIP...'
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::CreateFromDirectory($Destination, $zipPath, [IO.Compression.CompressionLevel]::Optimal, $true)
$archive = [IO.Compression.ZipFile]::OpenRead($zipPath)
try {
    $prefix = (Split-Path -Leaf $Destination) + '/'
    $entries = @($archive.Entries | ForEach-Object { $_.FullName.Replace('\', '/') })
    foreach ($required in @('artisan', '.env.example', 'SETUP.md', 'start-syndicate.bat', 'vendor/autoload.php', 'public/build/manifest.json', 'public/models/board.glb', 'public/models/wheels.glb')) {
        if (($prefix + $required) -notin $entries) { throw "ZIP is missing $required" }
    }
    foreach ($entry in $entries) {
        $relative = $entry.Substring($prefix.Length)
        if ($relative -match '^(storage|bootstrap/cache)/.*[^/]$' -and $relative -notmatch '/\.gitignore$') {
            throw "Unexpected runtime data in ZIP: $relative"
        }
        if ($relative -notmatch '^vendor/' -and (IsExcluded $relative)) {
            throw "Unexpected private file in ZIP: $relative"
        }
    }
    Write-Host "Verified $($archive.Entries.Count) ZIP entries."
} finally { $archive.Dispose() }
$hash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash
[IO.File]::WriteAllText("$zipPath.sha256", "$hash  $([IO.Path]::GetFileName($zipPath))`n")
Write-Host "ZIP: $zipPath"
Write-Host "Size: $([math]::Round((Get-Item -LiteralPath $zipPath).Length / 1MB, 1)) MB"
Write-Host 'Give the client the ZIP and direct them to SETUP.md inside it.'
Write-Host 'Configure their PayMongo key and Gmail app password separately on their laptop.'
