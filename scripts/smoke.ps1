# Smoke test V0.2 - Passport Muestra
# Requiere el servidor corriendo (npm run dev).
param([string]$Base = 'http://localhost:8787')

$ErrorActionPreference = 'Stop'

function Invoke-Api($Method, $Path, $Body) {
  $params = @{ Uri = "$Base$Path"; Method = $Method; UseBasicParsing = $true; TimeoutSec = 20 }
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

# ---------- V0.3: configuración + centro de mando ----------
Write-Host ""
Write-Host "== V0.3 (configuración y centro de mando) ==" -ForegroundColor Cyan

# 1. GET /api/config público
$cfg = Invoke-Api GET '/api/config' $null
Check '1. GET /api/config -> 200 con event_name' ($cfg.ok -and $cfg.data.config.event_name.Length -gt 0)

# 2. PUT /api/admin/config actualiza identidad
$saved = Invoke-Api PUT '/api/admin/config' @{ config = @{ event_name = 'Feria de Ciencias 2026'; event_subtitle = '24 de Noviembre'; stamp_style = 'estampilla' } }
$c2 = Invoke-Api GET '/api/config' $null
Check '2. actualizar identidad -> persiste' ($saved.ok -and $c2.data.config.event_name -eq 'Feria de Ciencias 2026' -and $c2.data.config.stamp_style -eq 'estampilla')

# 3. Colores custom
$r = Invoke-Api PUT '/api/admin/config' @{ config = @{ primary_color = '#123456'; accent_color = '#ff0000' } }
$c3 = Invoke-Api GET '/api/config' $null
Check '3. colores guardados' ($r.ok -and $c3.data.config.primary_color -eq '#123456' -and $c3.data.config.accent_color -eq '#ff0000')

# 4. Color inválido -> fallback a default (no rompe la app)
$r = Invoke-Api PUT '/api/admin/config' @{ config = @{ primary_color = 'rojo' } }
$c4 = Invoke-Api GET '/api/config' $null
Check '4. color inválido -> fallback' ($r.ok -and $c4.data.config.primary_color -eq '#0f4c81')

# 5. Textos custom + textos por defecto completan
$r = Invoke-Api PUT '/api/admin/config' @{ config = @{ texts = @{ welcome_text = 'Bienvenidos!'; footer_text = 'Hecho con cariño' } } }
$c5 = Invoke-Api GET '/api/config' $null
Check '5. textos custom + restantes por defecto' ($r.ok -and $c5.data.config.texts.welcome_text -eq 'Bienvenidos!' -and $c5.data.config.texts.footer_text -eq 'Hecho con cariño' -and $c5.data.config.texts.progress_suffix -eq 'stands visitados')

# 6. CRUD stand: crear
$ns = Invoke-Api POST '/api/admin/stands' @{ name = 'Stand de Prueba V0.3'; course = '6°'; flag = 'CL'; sort_order = 99 }
Check '6. crear stand -> 201' ($ns.ok -and $ns.status -eq 201)
$nsId = $ns.data.stand.id
$nsTok = $ns.data.stand.token

# 7. Editar stand
$up = Invoke-Api PUT "/api/admin/stands/$nsId" @{ name = 'Stand de Prueba Renombrado'; is_published = $true }
$s2 = Invoke-Api GET '/api/stands' $null
$visSt = $s2.data.stands | Where-Object { $_.id -eq $nsId }
Check '7. editar stand -> se refleja en público' ($up.ok -and $visSt.name -eq 'Stand de Prueba Renombrado')

# 8. Visitar el stand nuevo (activo)
$vv = Invoke-Api POST '/api/visitors' @{ name = 'Prueba Baja' }
$nv = Invoke-Api POST '/api/visits' @{ vt = $vv.data.visitor.token; tok = $nsTok }
Check '8. visitar stand creado -> 201' ($nv.ok -and $nv.status -eq 201)

# 9. Desactivar: se oculta del público, conserva la visita
$off = Invoke-Api PUT "/api/admin/stands/$nsId" @{ name = 'Stand de Prueba Renombrado'; is_published = $false }
$s4 = Invoke-Api GET '/api/stands' $null
$p9 = Invoke-Api GET "/api/passport?vt=$($vv.data.visitor.token)" $null
Check '9. desactivar -> oculto, visita conservada' ($off.ok -and ($s4.data.stands | Where-Object { $_.id -eq $nsId }).Count -eq 0 -and $p9.data.visits.Count -ge 1)

# 10. Eliminar (lógico) -> conserva visitas/evaluaciones
$del = Invoke-Api DELETE "/api/admin/stands/$nsId" $null
$p10 = Invoke-Api GET "/api/passport?vt=$($vv.data.visitor.token)" $null
Check '10. eliminar (lógico) -> conserva visitas' ($del.ok -and $p10.data.visits.Count -ge 1)

# 11. Dashboard admin
$dash = Invoke-Api GET '/api/admin/dashboard' $null
Check '11. dashboard -> totals + stands con stats' ($dash.ok -and $dash.data.totals.visitors -gt 0 -and $dash.data.stands.Count -gt 0)

# 12. Comentarios: listado + moderación (ocultar/mostrar/revisar, no borra rating)
$com = Invoke-Api GET '/api/admin/comments' $null
$cid = ($com.data.comments | Where-Object { $_.comment -match 'Me encantó' } | Select-Object -First 1 -ExpandProperty id)
$hid = Invoke-Api POST "/api/admin/comments/$cid/hide" @{}
$sho = Invoke-Api POST "/api/admin/comments/$cid/hide" @{}
$rev = Invoke-Api POST "/api/admin/comments/$cid/review" @{}
$p12 = Invoke-Api GET "/api/passport?vt=$vte" $null
$v12 = VisitOf $p12 1
Check '12. moderación -> ok y conserva rating' ($hid.ok -and $sho.ok -and $rev.ok -and $v12.rating -eq 5)

# 13. Visitantes (admin)
$adm = Invoke-Api GET '/api/admin/visitors' $null
Check '13. lista de visitantes con progreso' ($adm.ok -and $adm.data.visitors.Count -gt 0)

# 14. Export CSV
$csvA = Invoke-WebRequest -Uri "$Base/api/admin/export/visitas.csv" -UseBasicParsing
$csvB = Invoke-WebRequest -Uri "$Base/api/admin/export/summary.csv" -UseBasicParsing
Check '14. export CSV (visitas + resumen)' ($csvA.StatusCode -eq 200 -and $csvB.StatusCode -eq 200 -and $csvA.Content -match 'comentario' -and $csvB.Content -match 'promedio')

# 15. Login (dev abierto sin ADMIN_PASSWORD)
$lg = Invoke-Api POST '/api/admin/login' @{ password = 'x' }
Check '15. login admin OK (dev abierto)' ($lg.ok)

# Restaurar configuración demo "Muestra Escolar 2026"
Invoke-Api PUT '/api/admin/config' @{
  config = @{
    event_name = 'Muestra Escolar 2026'; event_subtitle = 'Muestra de los y las estudiantes';
    stamp_style = 'circular'; logo = $null
  }
} | Out-Null
$cfgEnd = Invoke-Api GET '/api/config' $null
Check 'restaurar configuración demo' ($cfgEnd.data.config.event_name -eq 'Muestra Escolar 2026')

Write-Host ""
Write-Host "Resultado: $pass pass, $fail fail" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })
exit $fail