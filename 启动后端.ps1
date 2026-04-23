# 小孩菜后端启动脚本 - PowerShell版
# 右键 -> 用 PowerShell 运行

$ErrorActionPreference = "Continue"
$BackendDir = Join-Path $PSScriptRoot "backend"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  小孩菜 - Backend Launcher" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Find Python
$PythonPaths = @(
    "C:\Program Files\Python312\python.exe",
    "C:\Program Files\Python311\python.exe",
    "C:\Program Files\Python39\python.exe"
)
$Python = $null
foreach ($p in $PythonPaths) {
    if (Test-Path $p) { $Python = $p; break }
}
if (-not $Python) {
    $found = Get-Command python -ErrorAction SilentlyContinue
    if ($found) { $Python = $found.Source }
}
if (-not $Python) {
    $found = Get-Command python3 -ErrorAction SilentlyContinue
    if ($found) { $Python = $found.Source }
}

if (-not $Python) {
    Write-Host "ERROR: Python not found!" -ForegroundColor Red
    Write-Host "Download: https://www.python.org/downloads/" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Python: $Python" -ForegroundColor Green
& $Python --version
Write-Host ""

# Install deps
Write-Host "[1/3] Installing flask & flask-cors..." -ForegroundColor Yellow
& $Python -m pip install flask flask-cors --quiet 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "pip install failed, trying..." -ForegroundColor Yellow
    & $Python -m pip install --upgrade pip --quiet 2>$null
    & $Python -m pip install flask flask-cors 2>$null
}
Write-Host "Done" -ForegroundColor Green

# Start server
Write-Host ""
Write-Host "[2/3] Starting server..." -ForegroundColor Yellow
Write-Host "URL:    http://localhost:5000" -ForegroundColor Cyan
Write-Host "Backend: $BackendDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $BackendDir
& $Python app.py
