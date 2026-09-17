# Smoke test V0.3.1 - Passport Muestra
# Requiere el servidor corriendo (npm run dev) y la contraseña admin.
# La contraseña se toma, en orden, de: -AdminPassword, $env:ADMIN_PASSWORD o .dev.vars.
param(
  [string]$Base = 'http://localhost:8787',
  [string]$AdminPassword = ''
)

$ErrorActionPreference = 'Stop'

if (-not $AdminPassword) { $AdminPassword = $env:ADMIN_PASSWORD }
$devVars = Join-Path $PSScriptRoot '..\.dev.vars'
if (-not $AdminPassword -and (Test-Path $devVars)) {
  $m = Select-String -Path $devVars -Pattern '^\s*ADMIN_PASSWORD\s*=\s*(.+)$' | Select-Object -First 1
  if ($m) { $AdminPassword = $m.Matches[0].Groups[1].Value.Trim().Trim('"').Trim("'") }
}
if (-not $AdminPassword) {
  Write-Host 'Falta la contraseña admin: usá -AdminPassword, $env:ADMIN_PASSWORD o .dev.vars' -ForegroundColor Red
  exit 1
}

$script:adminCookie = $null
$script:lastSetCookie = $null

function Invoke-Api($Method, $Path, $Body, [string]$Cookie = $null) {
  $params = @{ Uri = "$Base$Path"; Method = $Method; UseBasicParsing = $true; TimeoutSec = 30 }
  if ($null -ne $Body) { $params.Body = ($Body | ConvertTo-Json); $params.ContentType = 'application/json' }
  $useCookie = if ($PSBoundParameters.ContainsKey('Cookie')) { $Cookie } else { $script:adminCookie }
  if ($useCookie) { $params.Headers = @{ Cookie = $useCookie } }
  try {
    $r = Invoke-WebRequest @params
    $resp = if ($r.Content) { $r.Content | ConvertFrom-Json } else { $null }
    return @{ ok = $true; data = $resp; status = [int]$r.StatusCode }
  } catch {
    $status = 0
    if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
    $resp = $null
    if ($_.ErrorDetails.Message) { $resp = $_.ErrorDetails.Message | ConvertFrom-Json }
    return @{ ok = $false; data = $resp; status = $status }
  }
}

function Get-Raw($Path, [string]$Cookie = $null) {
  $params = @{ Uri = "$Base$Path"; Method = 'GET'; UseBasicParsing = $true; TimeoutSec = 30 }
  $useCookie = if ($PSBoundParameters.ContainsKey('Cookie')) { $Cookie } else { $script:adminCookie }
  if ($useCookie) { $params.Headers = @{ Cookie = $useCookie } }
  try {
    $r = Invoke-WebRequest @params
    return @{ ok = $true; status = [int]$r.StatusCode; raw = $r.Content }
  } catch {
    $status = 0
    if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
    return @{ ok = $false; status = $status; raw = '' }
  }
}

function Login-Api($Password) {
  $params = @{
    Uri = "$Base/api/admin/login"; Method = 'POST'; UseBasicParsing = $true; TimeoutSec = 30
    Body = (@{ password = $Password } | ConvertTo-Json); ContentType = 'application/json'
  }
  try {
    $r = Invoke-WebRequest @params
    $sc = $r.Headers['Set-Cookie']
    if ($sc -is [array]) { $sc = $sc[0] }
    $script:lastSetCookie = $sc
    $script:adminCookie = ($sc -split ';')[0]
    return @{ ok = $true; status = [int]$r.StatusCode; data = ($r.Content | ConvertFrom-Json) }
  } catch {
    $script:adminCookie = $null
    $status = 0
    if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
    $data = $null
    if ($_.ErrorDetails.Message) { $data = $_.ErrorDetails.Message | ConvertFrom-Json }
    return @{ ok = $false; status = $status; data = $data }
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

$v = Invoke-Api POST '/api/visitors' @{ name = 'Test Autor' } -Cookie ''
Check 'crear visitante -> 201' ($v.ok -and $v.status -eq 201)
$vt = $v.data.visitor.token

$s = Invoke-Api GET '/api/stands' $null -Cookie ''
Check 'listar stands -> 15' ($s.ok -and ($s.data.stands).Count -eq 15)
$tok1 = $s.data.stands[0].token
$tok2 = $s.data.stands[1].token
$tok3 = $s.data.stands[2].token
$tok4 = $s.data.stands[3].token

$r1 = Invoke-Api POST '/api/visits' @{ vt = $vt; tok = $tok1 } -Cookie ''
Check 'visitar stand 1 -> 201' ($r1.ok -and $r1.status -eq 201 -and $r1.data.visits.Count -eq 1)

$r2 = Invoke-Api POST '/api/visits' @{ vt = $vt; tok = $tok2 } -Cookie ''
$r3 = Invoke-Api POST '/api/visits' @{ vt = $vt; tok = $tok3 } -Cookie ''
Check 'visitar stands 2 y 3 -> 201' ($r2.ok -and $r3.ok)

$dup = Invoke-Api POST '/api/visits' @{ vt = $vt; tok = $tok1 } -Cookie ''
Check 'duplicado stand 1 -> 409' (-not $dup.ok -and $dup.status -eq 409 -and $dup.data.already)

$p = Invoke-Api GET "/api/passport?vt=$vt" $null -Cookie ''
Check 'pasaporte -> 3 visitas (no 4)' ($p.ok -and $p.data.visits.Count -eq 3)

# ---------- V0.2: evaluaciones ----------
Write-Host ""
Write-Host "== V0.2 (evaluaciones) ==" -ForegroundColor Cyan

$b = Invoke-Api POST '/api/visitors' @{ name = 'Visitante Eval' } -Cookie ''
$vte = $b.data.visitor.token
foreach ($t in $tok1, $tok2, $tok3, $tok4) {
  Invoke-Api POST '/api/visits' @{ vt = $vte; tok = $t } -Cookie '' | Out-Null
}

# Caso 1: stand 1 -> 5 estrellas + comentario
$e1 = Invoke-Api POST '/api/evaluate' @{ vt = $vte; tok = $tok1; rating = 5; comment = 'Me encantó la explicación.' } -Cookie ''
$p1 = Invoke-Api GET "/api/passport?vt=$vte" $null -Cookie ''
$v1 = VisitOf $p1 1
Check 'Caso 1: evaluar stand 1 (5 + comentario)' ($e1.ok -and $v1.rating -eq 5 -and $v1.comment -eq 'Me encantó la explicación.')

# Caso 2: stand 2 -> 4 estrellas, sin comentario -> comment NULL
$e2 = Invoke-Api POST '/api/evaluate' @{ vt = $vte; tok = $tok2; rating = 4 } -Cookie ''
$p2 = Invoke-Api GET "/api/passport?vt=$vte" $null -Cookie ''
$v2 = VisitOf $p2 2
Check 'Caso 2: evaluar stand 2 (4, sin comentario -> NULL)' ($e2.ok -and $v2.rating -eq 4 -and $null -eq $v2.comment)

# Caso 3: reescaneo del stand 1 -> 409 + devuelve la evaluación existente
$dup2 = Invoke-Api POST '/api/visits' @{ vt = $vte; tok = $tok1 } -Cookie ''
Check 'Caso 3: reescaneo -> 409 + eval existente' (-not $dup2.ok -and $dup2.status -eq 409 -and $dup2.data.visit.rating -eq 5 -and $dup2.data.visit.comment -eq 'Me encantó la explicación.')

# Caso 4: ratings inválidos -> 400
$bad = 0
foreach ($rv in 0, 6, -1, 10) {
  $x = Invoke-Api POST '/api/evaluate' @{ vt = $vte; tok = $tok3; rating = $rv } -Cookie ''
  if ($x.status -eq 400) { $bad++ }
}
Check 'Caso 4: ratings 0/6/-1/10 -> 400 (x4)' ($bad -eq 4)
$str = Invoke-Api POST '/api/evaluate' @{ vt = $vte; tok = $tok3; rating = '5' } -Cookie ''
Check 'Caso 4b: rating string "5" -> 400 (request manipulada)' ($str.status -eq 400)

# Caso 5: comentario > 200 chars -> 400
$long = 'a' * 201
$x = Invoke-Api POST '/api/evaluate' @{ vt = $vte; tok = $tok3; rating = 3; comment = $long } -Cookie ''
Check 'Caso 5: comentario 201 chars -> 400' ($x.status -eq 400)

# Caso 6: comentario solo espacios -> se guarda como NULL, rating ok
$x = Invoke-Api POST '/api/evaluate' @{ vt = $vte; tok = $tok3; rating = 3; comment = '   ' } -Cookie ''
$p6 = Invoke-Api GET "/api/passport?vt=$vte" $null -Cookie ''
$v6 = VisitOf $p6 3
Check 'Caso 6: comentario solo espacios -> NULL' ($x.ok -and $v6.rating -eq 3 -and $null -eq $v6.comment)

# Caso 7: evaluar sin haber visitado -> 404
$c = Invoke-Api POST '/api/visitors' @{ name = 'Sin Visitas' } -Cookie ''
$x = Invoke-Api POST '/api/evaluate' @{ vt = $c.data.visitor.token; tok = $tok1; rating = 5 } -Cookie ''
Check 'Caso 7: evaluar sin visitar -> 404' ($x.status -eq 404)

# Extra: filtro de lenguaje inapropiado
$x = Invoke-Api POST '/api/evaluate' @{ vt = $vte; tok = $tok4; rating = 5; comment = 'este proyecto es una mierda' } -Cookie ''
$p7 = Invoke-Api GET "/api/passport?vt=$vte" $null -Cookie ''
$v7 = VisitOf $p7 4
Check 'Extra: profanity filtrado -> ***' ($x.ok -and $v7.comment -match '\*{3}' -and $v7.comment -notmatch 'mierda')

# Una evaluación por stand: pasaporte de B sigue con 4 visitas
$pf = Invoke-Api GET "/api/passport?vt=$vte" $null -Cookie ''
Check 'evaluaciones no crean visitas (siguen 4)' ($pf.data.visits.Count -eq 4)

# ---------- V0.3: configuración + centro de mando ----------
Write-Host ""
Write-Host "== V0.3 (configuración y centro de mando) ==" -ForegroundColor Cyan

# 1. GET /api/config público
$cfg = Invoke-Api GET '/api/config' $null -Cookie ''
Check '1. GET /api/config -> 200 con event_name' ($cfg.ok -and $cfg.data.config.event_name.Length -gt 0)

# 1b. Login admin (V0.3.1): habilita el resto de la sección
$login = Login-Api $AdminPassword
Check '1b. login admin -> 200 + cookie de sesión' ($login.ok -and $login.status -eq 200 -and $script:adminCookie)

# 2. PUT /api/admin/config actualiza identidad
$saved = Invoke-Api PUT '/api/admin/config' @{ config = @{ event_name = 'Feria de Ciencias 2026'; event_subtitle = '24 de Noviembre'; stamp_style = 'estampilla' } }
$c2 = Invoke-Api GET '/api/config' $null -Cookie ''
Check '2. actualizar identidad -> persiste' ($saved.ok -and $c2.data.config.event_name -eq 'Feria de Ciencias 2026' -and $c2.data.config.stamp_style -eq 'estampilla')

# 3. Colores custom
$r = Invoke-Api PUT '/api/admin/config' @{ config = @{ primary_color = '#123456'; accent_color = '#ff0000' } }
$c3 = Invoke-Api GET '/api/config' $null -Cookie ''
Check '3. colores guardados' ($r.ok -and $c3.data.config.primary_color -eq '#123456' -and $c3.data.config.accent_color -eq '#ff0000')

# 4. Color inválido -> fallback a default (no rompe la app)
$r = Invoke-Api PUT '/api/admin/config' @{ config = @{ primary_color = 'rojo' } }
$c4 = Invoke-Api GET '/api/config' $null -Cookie ''
Check '4. color inválido -> fallback' ($r.ok -and $c4.data.config.primary_color -eq '#0f4c81')

# 5. Textos custom + textos por defecto completan
$r = Invoke-Api PUT '/api/admin/config' @{ config = @{ texts = @{ welcome_text = 'Bienvenidos!'; footer_text = 'Hecho con cariño' } } }
$c5 = Invoke-Api GET '/api/config' $null -Cookie ''
Check '5. textos custom + restantes por defecto' ($r.ok -and $c5.data.config.texts.welcome_text -eq 'Bienvenidos!' -and $c5.data.config.texts.footer_text -eq 'Hecho con cariño' -and $c5.data.config.texts.progress_suffix -eq 'stands visitados')

# 6. CRUD stand: crear
$ns = Invoke-Api POST '/api/admin/stands' @{ name = 'Stand de Prueba V0.3'; course = '6°'; flag = 'CL'; sort_order = 99 }
Check '6. crear stand -> 201' ($ns.ok -and $ns.status -eq 201)
$nsId = $ns.data.stand.id
$nsTok = $ns.data.stand.token

# 6b. Stand recién creado (sin visitas ni evaluaciones): el dashboard no rompe y devuelve ceros
$d6 = Invoke-Api GET '/api/admin/dashboard' $null
$row6 = @($d6.data.stands) | Where-Object { $_.id -eq $nsId } | Select-Object -First 1
Check '6b. stand sin datos -> visits/evals en 0 y avg_rating null' ($null -ne $row6 -and $row6.visits -eq 0 -and $row6.evals -eq 0 -and $null -eq $row6.avg_rating)

# 7. Editar stand
$up = Invoke-Api PUT "/api/admin/stands/$nsId" @{ name = 'Stand de Prueba Renombrado'; is_published = $true }
$s2 = Invoke-Api GET '/api/stands' $null -Cookie ''
$visSt = $s2.data.stands | Where-Object { $_.id -eq $nsId }
Check '7. editar stand -> se refleja en público' ($up.ok -and $visSt.name -eq 'Stand de Prueba Renombrado')

# 8. Visitar el stand nuevo (activo)
$vv = Invoke-Api POST '/api/visitors' @{ name = 'Prueba Baja' } -Cookie ''
$nv = Invoke-Api POST '/api/visits' @{ vt = $vv.data.visitor.token; tok = $nsTok } -Cookie ''
Check '8. visitar stand creado -> 201' ($nv.ok -and $nv.status -eq 201)

# 9. Desactivar: se oculta del público, conserva la visita
$off = Invoke-Api PUT "/api/admin/stands/$nsId" @{ name = 'Stand de Prueba Renombrado'; is_published = $false }
$s4 = Invoke-Api GET '/api/stands' $null -Cookie ''
$p9 = Invoke-Api GET "/api/passport?vt=$($vv.data.visitor.token)" $null -Cookie ''
Check '9. desactivar -> oculto, visita conservada' ($off.ok -and ($s4.data.stands | Where-Object { $_.id -eq $nsId }).Count -eq 0 -and $p9.data.visits.Count -ge 1)

# 10. Eliminar (lógico) -> conserva visitas/evaluaciones
$del = Invoke-Api DELETE "/api/admin/stands/$nsId" $null
$p10 = Invoke-Api GET "/api/passport?vt=$($vv.data.visitor.token)" $null -Cookie ''
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
$p12 = Invoke-Api GET "/api/passport?vt=$vte" $null -Cookie ''
$v12 = VisitOf $p12 1
Check '12. moderación -> ok y conserva rating' ($hid.ok -and $sho.ok -and $rev.ok -and $v12.rating -eq 5)

# 13. Visitantes (admin)
$adm = Invoke-Api GET '/api/admin/visitors' $null
Check '13. lista de visitantes con progreso' ($adm.ok -and $adm.data.visitors.Count -gt 0)

# 14. Export CSV
$csvA = Invoke-WebRequest -Uri "$Base/api/admin/export/visitas.csv" -UseBasicParsing -Headers @{ Cookie = $script:adminCookie } -TimeoutSec 30
$csvB = Invoke-WebRequest -Uri "$Base/api/admin/export/summary.csv" -UseBasicParsing -Headers @{ Cookie = $script:adminCookie } -TimeoutSec 30
Check '14. export CSV (visitas + resumen)' ($csvA.StatusCode -eq 200 -and $csvB.StatusCode -eq 200 -and $csvA.Content -match 'comentario' -and $csvB.Content -match 'promedio')

# ---------- V0.3.1: estabilización + auth ----------
Write-Host ""
Write-Host "== V0.3.1 (dashboard + autenticación) ==" -ForegroundColor Cyan

# 15. Dashboard: contrato JSON (regresión del bug "d.stands.map is not a function")
$rawDash = Get-Raw '/api/admin/dashboard'
Check '15. dashboard -> 200' ($rawDash.ok -and $rawDash.status -eq 200)
Check '16. "stands" es arreglo JSON (no {})' ($rawDash.raw -match '"stands"\s*:\s*\[' -and $rawDash.raw -notmatch '"stands"\s*:\s*\{')
Check '17. "recent" es arreglo JSON' ($rawDash.raw -match '"recent"\s*:\s*\[')
$d3 = Invoke-Api GET '/api/admin/dashboard' $null
$st0 = @($d3.data.stands)[0]
Check '18. cada stand trae visits/evals/avg_rating/comments' ($null -ne $st0.visits -and $null -ne $st0.evals -and $null -ne $st0.comments)
$sinVisitas = @($d3.data.stands) | Where-Object { $_.id -eq $nsId } | Select-Object -First 1
Check '19. stand sin evaluaciones -> evals 0 y avg_rating null (dato ausente no rompe)' ($null -ne $sinVisitas -and $sinVisitas.evals -eq 0 -and $null -eq $sinVisitas.avg_rating)

# 20. Sin sesión no se accede al panel
$noSess = Invoke-Api GET '/api/admin/config' $null -Cookie ''
Check '20. endpoint admin sin sesión -> 401' (-not $noSess.ok -and $noSess.status -eq 401)

# 21. Login incorrecto / vacío -> 401 (mensaje genérico)
$badLogin = Login-Api 'definitivamente-incorrecta'
Check '21. login incorrecto -> 401' (-not $badLogin.ok -and $badLogin.status -eq 401)
$emptyLogin = Login-Api ''
Check '22. login vacío -> 401' (-not $emptyLogin.ok -and $emptyLogin.status -eq 401)

# 23. Login correcto + cookie HttpOnly + acceso permitido
$okLogin = Login-Api $AdminPassword
Check '23. login correcto -> 200' ($okLogin.ok -and $okLogin.status -eq 200)
Check '24. cookie de sesión admin_session HttpOnly' ($script:adminCookie -match '^admin_session=' -and $script:lastSetCookie -match 'HttpOnly')
$authd = Invoke-Api GET '/api/admin/config' $null
Check '25. endpoint admin con sesión -> 200' ($authd.ok -and $authd.status -eq 200)

# 26. Cambio de contraseña: validaciones
$P1 = 'Smoke031a-' + (-join ((48..57) + (97..122) | Get-Random -Count 8 | ForEach-Object { [char]$_ }))
$P2 = 'Smoke031b-' + (-join ((48..57) + (97..122) | Get-Random -Count 8 | ForEach-Object { [char]$_ }))
$short = Invoke-Api POST '/api/admin/password' @{ current = $AdminPassword; next = 'corta'; confirm = 'corta' }
Check '26. nueva contraseña < 8 -> 400' ($short.status -eq 400)
$mismatch = Invoke-Api POST '/api/admin/password' @{ current = $AdminPassword; next = 'claveLarga123'; confirm = 'otraClave123' }
Check '27. nueva y repetición no coinciden -> 400' ($mismatch.status -eq 400)
$wrongCur = Invoke-Api POST '/api/admin/password' @{ current = 'no-es-la-actual'; next = 'claveLarga123'; confirm = 'claveLarga123' }
Check '28. contraseña actual incorrecta -> 400' ($wrongCur.status -eq 400)

# 29. Cambio correcto e invalidación de la sesión vigente
$oldCookie = $script:adminCookie
$chg = Invoke-Api POST '/api/admin/password' @{ current = $AdminPassword; next = $P1; confirm = $P1 }
Check '29. cambio de contraseña correcto -> 200' ($chg.ok -and $chg.status -eq 200)
$inval = Invoke-Api GET '/api/admin/config' $null -Cookie $oldCookie
Check '30. sesión anterior invalidada tras el cambio -> 401' (-not $inval.ok -and $inval.status -eq 401)

# 31. La nueva contraseña funciona; la anterior deja de funcionar
$newLogin = Login-Api $P1
Check '31. login con la contraseña nueva -> 200' ($newLogin.ok)
$chg2 = Invoke-Api POST '/api/admin/password' @{ current = $P1; next = $P2; confirm = $P2 }
Check '32. segundo cambio (P1 -> P2) -> 200' ($chg2.ok)
$oldP1 = Login-Api $P1
Check '33. contraseña anterior (P1) deja de funcionar -> 401' (-not $oldP1.ok -and $oldP1.status -eq 401)
$newP2 = Login-Api $P2
Check '34. login con la nueva (P2) -> 200' ($newP2.ok)

# 35. Logout invalida la sesión
$logoutCookie = $script:adminCookie
$lo = Invoke-Api POST '/api/admin/logout' @{}
Check '35. logout -> 200' ($lo.ok -and $lo.status -eq 200)
$after = Invoke-Api GET '/api/admin/config' $null -Cookie $logoutCookie
Check '36. acceso después del logout -> 401' (-not $after.ok -and $after.status -eq 401)

# 37. Restaurar la contraseña de desarrollo (estado limpio para la próxima corrida)
$relogin = Login-Api $P2
$restorePw = Invoke-Api POST '/api/admin/password' @{ current = $P2; next = $AdminPassword; confirm = $AdminPassword }
Check '37. restaurar contraseña de desarrollo -> 200' ($restorePw.ok)
$relogin2 = Login-Api $AdminPassword
Check '38. login con la contraseña restaurada -> 200' ($relogin2.ok)

# 39. Lo público sigue sin pedir login
$pubCfg = Get-Raw '/api/config' -Cookie ''
$pubVis = Invoke-Api POST '/api/visitors' @{ name = 'Sin Login V031' } -Cookie ''
Check '39. /api/config público sin sesión -> 200' ($pubCfg.ok -and $pubCfg.status -eq 200)
Check '40. visitante público no requiere login -> 201' ($pubVis.ok -and $pubVis.status -eq 201)

# Restaurar configuración demo "Muestra Escolar 2026"
Invoke-Api PUT '/api/admin/config' @{
  config = @{
    event_name = 'Muestra Escolar 2026'; event_subtitle = 'Muestra de los y las estudiantes';
    stamp_style = 'circular'; logo = $null
  }
} | Out-Null
$cfgEnd = Invoke-Api GET '/api/config' $null -Cookie ''
Check 'restaurar configuración demo' ($cfgEnd.data.config.event_name -eq 'Muestra Escolar 2026')

Write-Host ""
Write-Host "Resultado: $pass pass, $fail fail" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })
exit $fail
