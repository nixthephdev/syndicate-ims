@echo off
REM ---------------------------------------------------------------------
REM  Syndicate IMS - double-click to run.
REM
REM  Deliberately does the three checks that account for almost every
REM  "it's broken" report, before starting anything:
REM
REM    1. a leftover public\hot file, which makes the whole site load
REM       unstyled with no error anywhere (by far the most common one)
REM    2. .env missing, i.e. setup was never finished
REM    3. MySQL not running
REM
REM  See SETUP.md for the one-time install.
REM ---------------------------------------------------------------------

title Syndicate IMS
cd /d "%~dp0"

echo.
echo   SYNDICATE IMS
echo   =============
echo.

REM --- find PHP -------------------------------------------------------
set "PHP=php"
where php >nul 2>&1
if errorlevel 1 (
    if exist "C:\xampp\php\php.exe" (
        set "PHP=C:\xampp\php\php.exe"
    ) else (
        echo   [X] PHP not found.
        echo.
        echo       Install XAMPP, or add PHP to your PATH.
        echo       See SETUP.md step 1.
        echo.
        pause
        exit /b 1
    )
)

REM --- setup finished? ------------------------------------------------
if not exist ".env" (
    echo   [X] No .env file - setup was never finished.
    echo.
    echo       Work through SETUP.md steps 4 and 5 first.
    echo.
    pause
    exit /b 1
)

if not exist "vendor\autoload.php" (
    echo   [X] The vendor folder is missing or incomplete.
    echo.
    echo       Re-copy it from the handover folder. It is large,
    echo       so a copy can fail part-way without saying so.
    echo.
    pause
    exit /b 1
)

REM --- the unstyled-site trap ------------------------------------------
if exist "public\hot" (
    echo   [!] Found a leftover public\hot file.
    echo       This makes the site load with no styling at all.
    echo       Removing it.
    del /q "public\hot"
    echo.
)

REM --- is MySQL up? -----------------------------------------------------
netstat -an | findstr /r /c:":3306 .*LISTENING" >nul
if errorlevel 1 (
    echo   [!] MySQL does not look like it is running.
    echo.
    echo       Open XAMPP Control Panel and press Start next to MySQL,
    echo       then run this again. Continuing anyway...
    echo.
)

echo   Starting on http://localhost:8000
echo   Close this window or press Ctrl+C to stop.
echo.

REM Give the server a moment to bind before the browser races it.
start "" /b cmd /c "timeout /t 2 >nul & start http://localhost:8000"

"%PHP%" artisan serve
