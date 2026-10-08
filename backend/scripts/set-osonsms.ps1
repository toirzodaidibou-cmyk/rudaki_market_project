# RUDAKI MARKET: пайваст кардани SMS-и воқеӣ (OsonSMS) дар компютери development.
# Иҷро: PowerShell → cd "...\RYDAKIMARKET\backend" → .\scripts\set-osonsms.ps1
# Маълумот дар dotnet user-secrets нигоҳ дошта мешавад (на дар код ва на дар git).

$ErrorActionPreference = "Stop"
$api = Join-Path $PSScriptRoot "..\src\RudakiMarket.Api"

Write-Host ""
Write-Host "OsonSMS — маълумотро аз кабинети osonsms.com нависед" -ForegroundColor Yellow
$login  = Read-Host "Логин (login)"
$secure = Read-Host "Токен (Bearer token)" -AsSecureString
$sender = Read-Host "Номи фиристанда (sender name, масалан RUDAKI)"
$token  = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))

if (-not $login -or -not $token -or -not $sender) { throw "Ҳамаи 3 майдон ҳатмианд." }

Push-Location $api
try {
    dotnet user-secrets set "Sms:Provider" "OsonSms" | Out-Null
    dotnet user-secrets set "Sms:OsonSms:Login" $login | Out-Null
    dotnet user-secrets set "Sms:OsonSms:Token" $token | Out-Null
    dotnet user-secrets set "Sms:OsonSms:Sender" $sender | Out-Null
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "Тайёр! SMS-и воқеӣ фаъол шуд. Backend-ро аз нав сар диҳед (dotnet run)." -ForegroundColor Green
Write-Host "Барои бозгашт ба реҷаи санҷишӣ: dotnet user-secrets set Sms:Provider Dev"
