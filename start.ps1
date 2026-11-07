$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Write-Host "Starting KOBO COLLECT..." -ForegroundColor Cyan
Write-Host "App (frontend): http://127.0.0.1:8000"
Write-Host "API (backend):  http://127.0.0.1:8001"
Write-Host "Mode: Waitress multi-thread (concurrent sessions)"
Write-Host ""

$python = "$root\backend\venv\Scripts\python.exe"
if (-not (Test-Path $python)) {
  Write-Host "Missing backend venv. Run: cd backend; python -m venv venv; .\venv\Scripts\activate; pip install -r requirements.txt" -ForegroundColor Red
  exit 1
}

$backend = Start-Process -PassThru -WindowStyle Hidden `
  -FilePath $python `
  -ArgumentList "run_concurrent.py" `
  -WorkingDirectory "$root\backend"

Write-Host "Backend PID: $($backend.Id)"

try {
  Set-Location "$root\frontend"
  npm run dev -- --host 127.0.0.1 --port 8000
}
finally {
  if ($backend -and -not $backend.HasExited) {
    Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
  }
}
