param(
    [ValidateSet('web', 'backend', 'frontend', 'fallback', 'check', 'api')]
    [string]$Mode = 'web'
)
$ErrorActionPreference = 'Stop'
$env:PYTHONIOENCODING = 'utf-8'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$OutputEncoding = [Console]::OutputEncoding
$projectRoot = $PSScriptRoot
$projectPython = Join-Path $projectRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $projectPython)) { throw 'Missing .venv. See README.md for setup.' }
function Start-PracticeFrontend {
    $frontendRoot = Join-Path $projectRoot 'frontend'
    $viteEntry = Join-Path $frontendRoot 'node_modules\vite\bin\vite.js'
    if (-not (Test-Path -LiteralPath $viteEntry)) { throw 'Missing frontend dependencies. Run npm.cmd --prefix frontend ci.' }
    & node.exe $viteEntry $frontendRoot --host 127.0.0.1 --port 5173 --strictPort
}
Push-Location $projectRoot
try {
    switch ($Mode) {
        'check' { & $projectPython 'scripts\check_environment.py'; exit $LASTEXITCODE }
        'api' { & $projectPython 'scripts\check_api.py'; exit $LASTEXITCODE }
        'backend' { & $projectPython -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 }
        'frontend' { Start-PracticeFrontend }
        'fallback' { & $projectPython -m streamlit run fallback\app.py --server.address 127.0.0.1 --server.port 8501 --server.headless true --browser.gatherUsageStats false }
        'web' {
            $occupied = Get-NetTCPConnection -State Listen -LocalPort 8000,5173 -ErrorAction SilentlyContinue
            if ($occupied) { throw 'Port 8000 or 5173 is busy. Stop its existing server first.' }
            $backendProcess = Start-Process -FilePath $projectPython -ArgumentList @('-m','uvicorn','backend.main:app','--host','127.0.0.1','--port','8000') -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $projectRoot 'backend.stdout.log') -RedirectStandardError (Join-Path $projectRoot 'backend.stderr.log')
            try {
                $ready = $false
                for ($attempt = 0; $attempt -lt 30; $attempt++) {
                    if ($backendProcess.HasExited) { throw 'Backend exited. Read backend.stderr.log.' }
                    try {
                        $health = Invoke-RestMethod 'http://127.0.0.1:8000/api/health' -TimeoutSec 1
                        if ($health.status -eq 'ok') { $ready = $true; break }
                    } catch { Start-Sleep -Milliseconds 300 }
                }
                if (-not $ready) { throw 'Backend did not become ready. Read backend.stderr.log.' }
                Write-Host 'Practice UI: http://127.0.0.1:5173'
                Write-Host 'API docs:    http://127.0.0.1:8000/docs'
                Write-Host 'Press Ctrl+C to stop. No AI request is made by this practice UI.'
                Start-PracticeFrontend
            } finally {
                if (-not $backendProcess.HasExited) { Stop-Process -Id $backendProcess.Id -ErrorAction SilentlyContinue }
            }
        }
    }
} finally { Pop-Location }
