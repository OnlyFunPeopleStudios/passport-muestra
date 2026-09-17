# Smoke test V0.2 - Passport Muestra
# Requiere el servidor corriendo (npm run dev).
param([string]$Base = 'http://localhost:8787')

$ErrorActionPreference = 'Stop'

function Invoke-Api($Method, $Path, $Body) {
  $params = @{ Uri = "$Base$Path"; Method = $Method; UseBasicParsing = $true }
  if ($null -ne $Body) { $params.Body = ($Body | ConvertTo-Json); $params.ContentType = 'application/json' }
  try {
    $r = Invoke-WebRequest @params
    $resp = $r.Content | ConvertFrom-Json
    $script:lastStatus = [int]$r.StatusCode
    return @{ ok = $true; data = $resp; status = $script:lastStatus }
  } catch {
    $script:lastStatus = [int]$_.Exception.Response.StatusCode
    $resp = $_.ErrorDetails.Message | ConvertFrom-Json
    return @{ ok = $false; data = $resp; status = $script:lastStatus }
  }
}

$pass = 0; $fail = 0
function Check($Name, $Cond) {
  if ($Cond) { $script:pass++; Write-Host "PASS  $Name" -ForegroundColor Green }
  else { $script:fail++; Write-Host "FAIL  $Name" -ForegroundColor Red }
}

function VisitOf($Passport, $StandId) {
  return $Passport.data.visits | Where-Object { $_.stand_id -eq $StandId } | Select-Object -First 1
}

# ---------- V0.1 (regresión) ----------
Write-Host "== V0.1 (regresión) ==" -ForegroundColor Cyan

$v = Invoke-Api POST '/api/visitors' @{ name = 'Test Autor' }
Check 'crear visitante -> 201' ($v.ok -and $v.status -eq 201)
$vt = $v.data.visitor.token

$s = Invoke-Api GET '/api/stands' $null
Check 'listar stands -> 15' ($s.ok -and ($s.data.stands).Count -eq 15)
$tok1 = $s.data.stands[0].token
$tok2 = $s.data.stands[1].token
$tok3 = $s.data.stands[2].token
$tok4 = $s.data.stands[3].token

$r1 = Invoke-Api POST '/api/visits' @{ vt = $vt; tok = $tok1 }
Check 'visitar stand 1 -> 201' ($r1.ok -and $r1.status -eq 201 -and $r1.data.visits.Count -eq 1)

$r2 = Invoke-Api POST '/api/visits' @{ vt = $vt; tok = $tok2 }
$r3 = Invoke-Api POST '/api/visits' @{ vt = $vt; tok = $tok3 }
Check 'visitar stands 2 y 3 -> 201' ($r2.ok -and $r3.ok)

$dup = Invoke-Api POST '/api/visits' @{ vt = $vt; tok = $tok1 }
Check 'duplicado stand 1 -> 409' (-not $dup.ok -and $dup.status -eq 409 -and $dup.data.already)

$p = Invoke-Api GET "/api/passport?vt=$vt" $null
Check 'pasaporte -> 3 visitas (no 4)' ($p.ok -and $p.data.visits.Count -eq 3)

# ---------- V0.2: evaluaciones ----------
Write-Host ""
Write-Host "== V0.2 (evaluaciones) ==" -ForegroundColor Cyan

$b = Invoke-Api POST '/api/visitors' @{ name = 'Visitante Eval' }
$vte = $b.data.visitor.token
foreach ($t in $tok1, $tok2, $tok3, $tok4) {
  Invoke-Api POST '/api/visits' @{ vt = $vte; tok = $t } | Out-Null
}

# Caso 1: stand 1 -> 5 estrellas + comentario
$e1 = Invoke-Api POST '/api/evaluate' @{ vt = $vte; tok = $tok1; rating = 5; comment = 'Me encantó la explicación.' }
$p1 = Invoke-Api GET "/api/passport?vt=$vte" $null
$v1 = VisitOf $p1 1
Check 'Caso 1: evaluar stand 1 (5 + comentario)' ($e1.ok -and $v1.rating -eq 5 -and $v1.comment -eq 'Me encantó la explicación.')

# Caso 2: stand 2 -> 4 estrellas, sin comentario -> comment NULL
$e2 = Invoke-Api POST '/api/evaluate' @{ vt = $vte; tok = $tok2; rating = 4 }
$p2 = Invoke-Api GET "/api/passport?vt=$vte" $null
$v2 = VisitOf $p2 2
Check 'Caso 2: evaluar stand 2 (4, sin comentario -> NULL)' ($e2.ok -and $v2.rating -eq 4 -and $null -eq $v2.comment)

# Caso 3: reescaneo del stand 1 -> 409 + devuelve la evaluación existente
$dup2 = Invoke-Api POST '/api/visits' @{ vt = $vte; tok = $tok1 }
Check 'Caso 3: reescaneo -> 409 + eval existente' (-not $dup2.ok -and $dup2.status -eq 409 -and $dup2.data.visit.rating -eq 5 -and $dup2.data.visit.comment -eq 'Me encantó la explicación.')

# Caso 4: ratings inválidos -> 400
$bad = 0
foreach ($rv in 0, 6, -1, 10) {
  $x = Invoke-Api POST '/api/evaluate' @{ vt = $vte; tok = $tok3; rating = $rv }
  if ($x.status -eq 400) { $bad++ }
}
Check 'Caso 4: ratings 0/6/-1/10 -> 400 (x4)' ($bad -eq 4)
$str = Invoke-Api POST '/api/evaluate' @{ vt = $vte; tok = $tok3; rating = '5' }
Check 'Caso 4b: rating string "5" -> 400 (request manipulada)' ($str.status -eq 400)

# Caso 5: comentario > 200 chars -> 400
$long = 'a' * 201
$x = Invoke-Api POST '/api/evaluate' @{ vt = $vte; tok = $tok3; rating = 3; comment = $long }
Check 'Caso 5: comentario 201 chars -> 400' ($x.status -eq 400)

# Caso 6: comentario solo espacios -> se guarda como NULL, rating ok
$x = Invoke-Api POST '/api/evaluate' @{ vt = $vte; tok = $tok3; rating = 3; comment = '   ' }
$p6 = Invoke-Api GET "/api/passport?vt=$vte" $null
$v6 = VisitOf $p6 3
Check 'Caso 6: comentario solo espacios -> NULL' ($x.ok -and $v6.rating -eq 3 -and $null -eq $v6.comment)

# Caso 7: evaluar sin haber visitado -> 404
$c = Invoke-Api POST '/api/visitors' @{ name = 'Sin Visitas' }
$x = Invoke-Api POST '/api/evaluate' @{ vt = $c.data.visitor.token; tok = $tok1; rating = 5 }
Check 'Caso 7: evaluar sin visitar -> 404' ($x.status -eq 404)

# Extra: filtro de lenguaje inapropiado
$x = Invoke-Api POST '/api/evaluate' @{ vt = $vte; tok = $tok4; rating = 5; comment = 'este proyecto es una mierda' }
$p7 = Invoke-Api GET "/api/passport?vt=$vte" $null
$v7 = VisitOf $p7 4
Check 'Extra: profanity filtrado -> ***' ($x.ok -and $v7.comment -match '\*{3}' -and $v7.comment -notmatch 'mierda')

# Una evaluación por stand: pasaporte de B sigue con 4 visitas
$pf = Invoke-Api GET "/api/passport?vt=$vte" $null
Check 'evaluaciones no crean visitas (siguen 4)' ($pf.data.visits.Count -eq 4)

Write-Host ""
Write-Host "Resultado: $pass pass, $fail fail" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })
exit $fail