# RUDAKI MARKET: фармоишҳо ХУДКОР ба WhatsApp-и мағоза (CallMeBot, ройгон).
#
# Калидро як бор гиред:
#   1) Дар телефон рақами +34 623 75 84 18 -ро ба контактҳо илова кунед (ном: CallMeBot).
#   2) Аз WhatsApp-и мағоза (+992 00 268 15 15) ба он ҳамин матнро фиристед:
#        I allow callmebot to send me messages
#   3) Ҷавоб меояд: "API Activated for your phone number. Your APIKEY is 123456"
#
# Баъд иҷро кунед: PowerShell → cd "...\RYDAKIMARKET\backend" → .\scripts\set-callmebot.ps1
# Калид дар dotnet user-secrets нигоҳ дошта мешавад (на дар код ва на дар git).

$ErrorActionPreference = "Stop"
$api   = Join-Path $PSScriptRoot "..\src\RudakiMarket.Api"
$phone = "+992002681515"

Write-Host ""
Write-Host "CallMeBot — калидро аз паёми WhatsApp нависед" -ForegroundColor Green
$key = (Read-Host "APIKEY").Trim()
if (-not $key) { throw "Калид холӣ аст." }

# Санҷиш: паёми кӯтоҳ ба WhatsApp-и мағоза
$text = [uri]::EscapeDataString("✅ RUDAKI MARKET: фармоишҳо акнун ба ин WhatsApp меоянд.")
$response = Invoke-WebRequest -UseBasicParsing "https://api.callmebot.com/whatsapp.php?phone=$([uri]::EscapeDataString($phone))&text=$text&apikey=$([uri]::EscapeDataString($key))"
if ($response.Content -match "error|invalid") {
    throw "CallMeBot калидро қабул накард: $($response.Content)"
}

Push-Location $api
try {
    dotnet user-secrets set "Orders:CallMeBotApiKey" $key | Out-Null
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "Тайёр! Ба WhatsApp-и $phone паёми санҷишӣ фиристода шуд." -ForegroundColor Green
Write-Host "Backend-ро аз нав сар диҳед (dotnet run) — фармоишҳои нав худкор меоянд."
