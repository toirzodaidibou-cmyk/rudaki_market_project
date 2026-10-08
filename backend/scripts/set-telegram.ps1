# RUDAKI MARKET: пайваст кардани боти Telegram барои рамзи даромад.
# 1) Дар Telegram ба @BotFather нависед: /newbot → ном → username (бояд бо "bot" тамом шавад).
# 2) Иҷро: PowerShell → cd "...\RYDAKIMARKET\backend" → .\scripts\set-telegram.ps1
# Токен дар dotnet user-secrets нигоҳ дошта мешавад (на дар код ва на дар git).

$ErrorActionPreference = "Stop"
$api = Join-Path $PSScriptRoot "..\src\RudakiMarket.Api"

Write-Host ""
Write-Host "Боти Telegram — маълумотро аз @BotFather нависед" -ForegroundColor Cyan
$username = (Read-Host "Username-и бот (масалан RudakiMarketBot)").Trim().TrimStart("@")
$secure   = Read-Host "Токени бот (масалан 123456:ABC...)" -AsSecureString
$token    = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))

if (-not $username -or -not $token) { throw "Ҳарду майдон ҳатмианд." }

# Санҷиши токен: Telegram бояд ҳамин ботро шиносад
$me = Invoke-RestMethod "https://api.telegram.org/bot$token/getMe"
if (-not $me.ok) { throw "Токен нодуруст аст." }
if ($me.result.username -ne $username) {
    Write-Host "Огоҳӣ: токен ба @$($me.result.username) тааллуқ дорад — ҳамин истифода мешавад." -ForegroundColor Yellow
    $username = $me.result.username
}

Push-Location $api
try {
    dotnet user-secrets set "Telegram:BotUsername" $username | Out-Null
    dotnet user-secrets set "Telegram:BotToken" $token | Out-Null
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "Тайёр! Боти @$username пайваст шуд. Backend-ро аз нав сар диҳед (dotnet run)." -ForegroundColor Green
