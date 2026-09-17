# Smoke test V0.1 - Passport Muestra
# Requiere el servidor corriendo (npm run dev).
param([string]$Base = 'http://localhost:8787')

$ErrorActionPreference = 'Stop'

function Invoke-Api($Method, $Path, $Body) {
  $params = @{ Uri = "$Base$Path"; Method = $Method; UseBasicParsing = $true }
  if ($null -ne $Body) { $params.Body = ($Body | ConvertTo-Json); $params.ContentType = 'application/json' }
  try {
    $r = Invoke-WebRequest @params
    $resp = $r.Content | ConvertFrom-Json
    return @{ ok = $true; data = $resp; status = [int]$r.StatusCode }
  } catch {
    $st = [int]$_.Exception.Response.StatusCode
    $resp = $_.ErrorDetails.Message | ConvertFrom-Json
    return @{ ok = $false; data = $resp; status = $st }
  }
}

$pass = 0; $fail = 0
function Check($Name, $Cond) {
  if ($Cond) { $script:pass++; Write-Host "PASS  $Name" -ForegroundColor Green }
  else { $script:fail++; Write-Host "FAIL  $Name" -ForegroundColor Red }
}

# 1. crear visitante
$v = Invoke-Api POST '/api/visitors' @{ name = 'Test Autor' }
Check 'crear visitante -> 201' ($v.ok -and $v.status -eq 201)
$vt = $v.data.visitor.token

# 2. listar stands (15)
$s = Invoke-Api GET '/api/stands' $null
Check 'listar stands -> 15' ($s.ok -and ($s.data.stands).Count -eq 15)
$tok1 = $s.data.stands[0].token
$tok2 = $s.data.stands[1].token
$tok3 = $s.data.stands[2].token

# 3. visitar stand 1
$r1 = Invoke-Api POST '/api/visits' @{ vt = $vt; tok = $tok1 }
Check 'visitar stand 1 -> 201' ($r1.ok -and $r1.status -eq 201 -and $r1.data.visits.Count -eq 1)

# 4. visitar stands 2 y 3
$r2 = Invoke-Api POST '/api/visits' @{ vt = $vt; tok = $tok2 }
$r3 = Invoke-Api POST '/api/visits' @{ vt = $vt; tok = $tok3 }
Check 'visitar stands 2 y 3 -> 201' ($r2.ok -and $r3.ok)

# 5. duplicado stand 1 -> 409 (caso clave del anti-duplicado)
$dup = Invoke-Api POST '/api/visits' @{ vt = $vt; tok = $tok1 }
Check 'duplicado stand 1 -> 409' (-not $dup.ok -and $dup.status -eq 409 -and $dup.data.already)

# 6. pasaporte tiene 3 visitas, NO 4
$p = Invoke-Api GET "/api/passport?vt=$vt" $null
Check 'pasaporte -> 3 visitas (no 4)' ($p.ok -and $p.data.visits.Count -eq 3)

Write-Host ""
Write-Host "Resultado: $pass pass, $fail fail" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })
exit $fail