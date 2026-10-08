# RUDAKI MARKET: пайванди муваққатии ройгон (Cloudflare) — сайтро аз телефон ва ба дигарон нишон додан.
# Иҷро: клики рост → "Run with PowerShell"  (ё дар PowerShell: .\scripts\demo-link.ps1)
# Талабот: PostgreSQL кор мекунад; E:\rudaki-market\tools\cloudflared.exe ҳаст.
# Компютер бояд фурӯзон бошад — агар хомӯш шавад, пайванд кор намекунад. Ҳар бор пайванди нав дода мешавад.

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$cloudflared = "E:\rudaki-market\tools\cloudflared.exe"
$log = Join-Path $env:TEMP "rudaki-tunnel.log"

function Test-Port($port) { [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) }

# 1. Backend (API) — агар кор накунад
if (-not (Test-Port 5080)) {
    Write-Host "Backend сар мешавад..." -ForegroundColor Yellow
    Start-Process -WindowStyle Minimized -WorkingDirectory (Join-Path $root "backend") dotnet "run --project src/RudakiMarket.Api --launch-profile http"
}

# 2. Сайт (production, бо прокси /backend — суратҳо ва API аз ҳамон суроға)
if (-not (Test-Port 3200)) {
    Write-Host "Сайт сохта ва сар мешавад (1–2 дақиқа)..." -ForegroundColor Yellow
    $env:NEXT_PUBLIC_API_URL = "/backend"
    $env:API_URL = "http://localhost:5080"
    $frontend = Join-Path $root "frontend"
    Push-Location $frontend
    try { npx next build | Out-Null } finally { Pop-Location }
    Start-Process -WindowStyle Minimized -WorkingDirectory $frontend cmd "/c npx next start -p 3200"
}
while (-not (Test-Port 3200)) { Start-Sleep -Seconds 2 }

# 3. Пайванди Cloudflare (ройгон, бе домен)
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force
Remove-Item $log -ErrorAction SilentlyContinue
Start-Process -WindowStyle Minimized $cloudflared "tunnel --no-autoupdate --url http://localhost:3200 --logfile `"$log`""
Write-Host "Пайванд сохта мешавад..." -ForegroundColor Yellow
$url = $null
for ($i = 0; $i -lt 60 -and -not $url; $i++) {
    Start-Sleep -Seconds 2
    if (Test-Path $log) {
        $m = Select-String -Path $log -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" | Select-Object -First 1
        if ($m) { $url = $m.Matches[0].Value }
    }
}
if (-not $url) { throw "Пайванд сохта нашуд. Интернетро санҷед ва аз нав кӯшиш кунед." }

Write-Host ""
Write-Host "Тайёр! Пайванди сайт:" -ForegroundColor Green
Write-Host "   $url/tg" -ForegroundColor Cyan
Set-Clipboard -Value "$url/tg"
Write-Host "(нусха шуд — дар Telegram/WhatsApp гузоред: Ctrl+V)"
Start-Process "$url/tg"
Read-Host "Барои пӯшидани ин равзана Enter-ро пахш кунед (сайт кор карданро давом медиҳад)"
