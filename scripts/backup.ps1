# RUDAKI MARKET: нусхаи эҳтиётии базаи воқеӣ (Supabase) ва суратҳо ба диски E:.
# Иҷро: клики рост → "Run with PowerShell"  (ё дар PowerShell: .\scripts\backup.ps1)
# Талабот: PostgreSQL 18 (pg_dump) дар компютер; калидҳо дар E:\rudaki-market\deploy\render.env (на дар git).
#
# Чӣ мекунад:
#   1. База: pg_dump (танҳо схемаи public — ҷадвалҳои мағоза) → backups\db\rudaki-YYYY-MM-DD_HHmm.dump
#      Файл бо pg_restore --list санҷида мешавад. 30 нусхаи охирин нигоҳ дошта мешаванд.
#   2. Суратҳо: bucket-и Supabase → backups\uploads\... — танҳо файлҳои нав зеркашӣ мешаванд.
#      Файлҳое, ки дар Supabase нест шудаанд, дар нусха мемонанд (нест намешаванд).
#
# Барқарор кардан (дар базаи холӣ; 2026-10-13 санҷида шуд — ҳамаи 17 ҷадвал ва 44 индекс):
#   psql -d "<база>" -c "CREATE EXTENSION IF NOT EXISTS pg_trgm"     (индексҳои ҷустуҷӯ ба он ниёз доранд)
#   pg_restore --list rudaki-....dump | Where-Object { $_ -notmatch ' SCHEMA - public ' } | Set-Content -Encoding ASCII list.txt
#   pg_restore -d "<база>" --no-owner --no-privileges --exit-on-error --use-list=list.txt rudaki-....dump
#   (сатри "CREATE SCHEMA public" хориҷ мешавад — дар базаи нав схемаи public аллакай ҳаст)
#   суратҳо: папкаи backups\uploads → bucket-и "uploads" (ҳамон роҳҳо).

param(
    [string]$EnvFile = "E:\rudaki-market\deploy\render.env",
    [string]$Target = "E:\rudaki-market\backups",
    [int]$Keep = 30
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$pgBin = "C:\Program Files\PostgreSQL\18\bin"
$started = Get-Date
$dbDir = Join-Path $Target "db"
$filesDir = Join-Path $Target "uploads"
$logFile = Join-Path $Target "backup.log"
New-Item -ItemType Directory -Force $dbDir, $filesDir | Out-Null

function Log($text, $color = "Gray") {
    $line = "{0:yyyy-MM-dd HH:mm:ss}  {1}" -f (Get-Date), $text
    Write-Host $line -ForegroundColor $color
    Add-Content -Path $logFile -Value $line -Encoding UTF8
}

# Калидҳо аз файли маҳаллӣ (ҳеҷ ҷо чоп намешаванд)
$cfg = @{}
foreach ($line in Get-Content $EnvFile -Encoding UTF8) {
    if ($line -match '^\s*([^#=][^=]*)=(.*)$') { $cfg[$Matches[1].Trim()] = $Matches[2].Trim() }
}

try {
    # ---------- 1. База ----------
    $cs = @{}
    foreach ($part in $cfg["ConnectionStrings__Default"] -split ';') {
        if ($part -match '^\s*([^=]+?)\s*=\s*(.*?)\s*$') { $cs[$Matches[1].ToLowerInvariant()] = $Matches[2] }
    }
    function Pick($names) { foreach ($n in $names) { if ($cs[$n]) { return $cs[$n] } } }
    $env:PGHOST = Pick @("host", "server")
    $env:PGPORT = Pick @("port"); if (-not $env:PGPORT) { $env:PGPORT = "5432" }
    $env:PGDATABASE = Pick @("database", "db")
    $env:PGUSER = Pick @("username", "user id", "userid", "user")
    $env:PGPASSWORD = Pick @("password")
    $env:PGSSLMODE = "require"
    if (-not ($env:PGHOST -and $env:PGDATABASE -and $env:PGUSER -and $env:PGPASSWORD)) { throw "ConnectionStrings__Default дар $EnvFile пурра нест." }

    $dump = Join-Path $dbDir ("rudaki-{0:yyyy-MM-dd_HHmm}.dump" -f $started)
    Log "База: pg_dump сар шуд..." Yellow
    & "$pgBin\pg_dump.exe" --format=custom --compress=9 --no-owner --no-privileges --schema=public --file="$dump"
    if ($LASTEXITCODE -ne 0) { throw "pg_dump бо хато тамом шуд (код $LASTEXITCODE)." }

    $toc = & "$pgBin\pg_restore.exe" --list "$dump"
    if ($LASTEXITCODE -ne 0) { throw "Файли нусха вайрон аст (pg_restore --list)." }
    $tables = @($toc | Where-Object { $_ -match ' TABLE DATA public ' }).Count
    $sizeMb = [math]::Round((Get-Item $dump).Length / 1MB, 1)
    Log "База: тайёр — $tables ҷадвал, $sizeMb MB → $(Split-Path $dump -Leaf)" Green

    $old = Get-ChildItem $dbDir -Filter "rudaki-*.dump" | Sort-Object Name -Descending | Select-Object -Skip $Keep
    foreach ($f in $old) { Remove-Item $f.FullName; Log "База: нусхаи кӯҳна нест шуд — $($f.Name)" }

    # ---------- 2. Суратҳо ----------
    $url = $cfg["Storage__Supabase__Url"].TrimEnd('/')
    $bucket = if ($cfg["Storage__Supabase__Bucket"]) { $cfg["Storage__Supabase__Bucket"] } else { "uploads" }
    if ($bucket -notmatch '^[a-z0-9_-]+$') { throw "Номи bucket нодуруст: $bucket" }

    # Рӯйхат мустақим аз ҷадвали storage.objects (API-и /object/list барои bucket-и калон 500 медиҳад)
    Log "Суратҳо: рӯйхат аз Supabase гирифта мешавад..." Yellow
    $rows = @(& "$pgBin\psql.exe" --no-psqlrc --tuples-only --no-align --field-separator "|" --command "select name, coalesce(metadata->>'size', '') from storage.objects where bucket_id = '$bucket' and name not like '%.emptyFolderPlaceholder' order by name")
    if ($LASTEXITCODE -ne 0) { throw "Рӯйхати суратҳо аз база гирифта нашуд (psql, код $LASTEXITCODE)." }
    $all = New-Object System.Collections.Generic.List[string]
    foreach ($row in $rows) {
        if (-not $row) { continue }
        $name, $size = $row -split '\|', 2
        if ($name -match '\.\.') { continue }
        # Файли 0-байта дар худи Supabase холӣ аст — чизе барои нусха нест (огоҳӣ, на хато)
        if ($size -eq "0") { Log "Суратҳо: ⚠ дар Supabase холӣ (0 байт) — $name" Yellow; continue }
        $all.Add($name)
    }

    $missing = @($all | Where-Object { -not (Test-Path -LiteralPath (Join-Path $filesDir $_)) })
    Log "Суратҳо: дар Supabase $($all.Count), нав барои зеркашӣ $($missing.Count)"

    if ($missing.Count -gt 0) {
        # curl --parallel: 2 файл ҳамзамон (бештар — Supabase 429 медиҳад); 429/5xx — то 6 кӯшиш бо танаффус; файл аввал ба .part навишта мешавад, то нимфайл «тайёр» ҳисоб нашавад
        $listFile = Join-Path $Target "download-list.txt"
        $lines = foreach ($p in $missing) {
            $out = (Join-Path $filesDir "$p.part") -replace '\\', '/'
            "url = `"$url/storage/v1/object/public/$bucket/$p`""
            "output = `"$out`""
        }
        [IO.File]::WriteAllLines($listFile, $lines, (New-Object Text.UTF8Encoding($false)))
        & curl.exe --silent --show-error --fail --parallel --parallel-max 2 --retry 6 --retry-delay 5 --create-dirs --config "$listFile"
        Remove-Item $listFile

        $ok = 0; $failedNames = @()
        foreach ($p in $missing) {
            $part = Join-Path $filesDir "$p.part"
            if ((Test-Path -LiteralPath $part) -and (Get-Item -LiteralPath $part).Length -gt 0) {
                Move-Item -LiteralPath $part -Destination (Join-Path $filesDir $p) -Force; $ok++
            } else {
                if (Test-Path -LiteralPath $part) { Remove-Item -LiteralPath $part }
                $failedNames += $p
            }
        }
        $failed = $failedNames.Count
        foreach ($n in ($failedNames | Select-Object -First 10)) { Log "Суратҳо: нашуд — $n" Red }
        Log "Суратҳо: зеркашӣ шуд $ok, нашуд $failed" $(if ($failed) { "Red" } else { "Green" })
        if ($failed) { throw "$failed сурат зеркашӣ нашуд — скриптро аз нав иҷро кунед (танҳо онҳо зеркашӣ мешаванд)." }
    }

    $total = (Get-ChildItem $filesDir -Recurse -File | Measure-Object Length -Sum)
    Log ("Суратҳо: дар нусха {0} файл, {1:N0} MB" -f $total.Count, ($total.Sum / 1MB)) Green
    Log ("ТАЙЁР — {0:N0} сония. Нусха: {1}" -f ((Get-Date) - $started).TotalSeconds, $Target) Green
    $exit = 0
}
catch {
    Log "ХАТО: $($_.Exception.Message)" Red
    $exit = 1
}
finally {
    Remove-Item Env:PGPASSWORD, Env:PGHOST, Env:PGPORT, Env:PGDATABASE, Env:PGUSER, Env:PGSSLMODE -ErrorAction SilentlyContinue
}
exit $exit
