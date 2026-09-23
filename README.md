# Passport Muestra

**Pasaporte digital a medida de tu evento.** El visitante crea su pasaporte desde el celular (sin instalar nada), recorre los stands, escanea su QR con la cámara y cada stand le sella el pasaporte. Puntúa con estrellas ⭐ y deja comentarios. Los organizadores personalizan todo el evento (nombre, colores, logo, sellos, textos) y lo ven en el **Centro de Mando** (`/admin`) con estadísticas, moderación y exportación CSV.

Mismo motor, distinto evento: cambiá la configuración y tenés un pasaporte nuevo.

## Estado del proyecto

| Versión | Estado |
|---|---|
| **V0.1** | ✅ Loop básico: crear visitante, 15 stands seed, QR generable/imprimible, escaneo, sello, anti-duplicado `UNIQUE(visitor_id, stand_id)` |
| **V0.2** | ✅ Puntuación ⭐ 1–5 + comentario 💬 (validados en el worker, una evaluación por stand) |
| **V0.3** | ✅ Centro de Mando: configuración del evento (identidad, paleta, presets, logo, sellos, textos), CRUD de stands, estadísticas, moderación de comentarios, visitantes, export CSV |
| **V0.3.1** | ✅ Autenticación del Centro de Mando con contraseña (PBKDF2 + sesión HttpOnly), cambio de contraseña y dashboard estabilizado |
| V0.4 | ✅ Sellos: 4 tipos (bandera/ícono/imagen/color), banderas SVG de los 13 países y motor único de render |
| V0.5 | 🟡 Deploy en Cloudflare **operativo** en `pasaporte.onlyfunpeople.com.ar`; pruebas reales pendientes |
| **V0.6** | ✅ Modo offline del visitante: service worker, catálogo de stands y visitas en el dispositivo, cola de sincronización idempotente |
| **V0.7** | ✅ Palabra secreta del stand: vía alternativa al QR para registrar visitas, funciona online y offline, con `visit_method` (`qr`/`secret`) y CSV actualizado |
| **V0.8** | ✅ UI del visitante y del Centro de Mando reescrita en **React + Vite + TypeScript** (código en `frontend/`, sirve desde `public/assets/` como build). Centro de Mando con toggle **Activo/Oculto** en la grilla y botón **Reiniciar visitas** (confirma contraseña) |

## Stack

- **Cloudflare Workers** (JavaScript, sin dependencias de runtime) → API.
- **Cloudflare D1** (SQLite) → base de datos. Anti-duplicado resuelto en la DB: `UNIQUE(visitor_id, stand_id)`.
- **Static Assets** de Cloudflare → PWA: **React + Vite + TypeScript** (UI del visitante y del Centro de Mando en `frontend/`; se despliega como build en `public/assets/`).
- QR: `html5-qrcode` (lectura con cámara, Apache-2.0) + `qrcode-generator` (generación/impresión, MIT). Banderas SVG: `flag-icons` (MIT). Detalle de licencias en `THIRD_PARTY.md`.

Una sola pieza de servidor. Dev local con `wrangler dev`; el mismo código se despliega en Cloudflare sin reescribir nada.

## Arquitectura

```
Celular (PWA) ──┐
                 ├─► Cloudflare Worker (/api/*) ──► D1 (SQLite)
Notebook admin ─┘        │
                         └─► static assets: index.html + public/assets/ (build React)
```

El visitante recorre el circuito:

```
CREAR PASAPORTE → ESCANEAR QR DEL STAND → SELLO (bandera) → PUNTUAR ⭐ → COMENTAR → CENTRO DE MANDO → EXPORT
```

Los QR de los stands codifican la URL del propio sitio con el *token* del stand (`#/scan?tok=…`). El token es tan público como el QR impreso; su función es regenerable y no predecible.

## Requisitos

- Node 20+ (para `wrangler`).
- `npm install -g wrangler` (o usar `npx wrangler`).

## Instalación y ejecución local

```bash
npm install
npm run db:init    # crea el esquema en la DB local (migraciones 0001 a 0006)
npm run db:seed    # carga 14 stands (13 países, con palabras secretas; Marruecos tiene 2 stands independientes)
npm install --prefix frontend && npm run build --prefix frontend   # build React (deja assets en public/assets/)
npm run db:demo    # opcional: 8 visitantes y ~30 evaluaciones de ejemplo (para el Centro de Mando)
npm run dev        # sirve en http://localhost:8787
```

Probar el loop completo (API), incluidos los casos de duplicados, validaciones y toda la configuración V0.3:

```bash
npm test
```

Corre primero las pruebas de la lógica offline (`scripts/offline.test.mjs`, sin navegador) y después el smoke completo contra el servidor local (`scripts/smoke.ps1`, 109 chequeos).

Para probar con el celular en la misma red, arrancar con `npx wrangler dev --ip 0.0.0.0` y entrar desde el teléfono a `http://<ip-pc>:8787`. **La cámara solo funciona sobre HTTPS o localhost** (el navegador lo exige); en la feria ya estará el dominio final con HTTPS.

## Uso

1. Abrí `http://localhost:8787` → **Crear mi pasaporte** (nombre opcional).
2. Desde el menú **🖨️ QR**: generá el QR de cada stand, descargalo e imprimilo para pegarlo en el stand (escribe la palabra secreta en un cartel junto al QR).
3. Desde el menú **📷 Escanear**: apuntá la cámara al QR de un stand. Si no tenés cámara, tocá **🔑 Tengo la palabra del stand** y escribí la palabra que ves en el cartel del stand.
4. El sello (bandera del país del stand) aparece en **🛂 Pasaporte**, con progreso `8 / 14 · 57%`. En el sello se muestran las estrellas si ya lo evaluaste.
5. Justo después de visitar un stand se abre la evaluación: **⭐ 1–5** (obligatoria para guardar) + **comentario opcional** (máx. 200 caracteres, con contador y filtro básico de lenguaje).
6. El botón **Visitar** en **🏫 Stands** simula el escaneo (útil sin cámara, para pruebas).
7. Volver a escanear el mismo stand → «Este stand ya forma parte de tu pasaporte.» (HTTP 409, garantizado por `UNIQUE` en la DB). Mostrará tu evaluación si ya la dejaste, o un botón **Evaluar ahora** si no.

### Modo offline

Después de la primera visita **con conexión**, la app sigue funcionando sin Internet (útil en la feria, donde el WiFi de los stands puede fallar):

- El **service worker** (`public/sw.js`) cachea la app, los stands (incluyendo sus palabras secretas) y los sellos; el panel `/admin` y los datos de otros visitantes nunca se cachean.
- Escanear un stand sin conexión registra la visita en el dispositivo (IndexedDB) y la sella al instante, sin duplicados. La palabra secreta funciona exactamente igual: se resuelve contra el catálogo del dispositivo y se sincroniza al recuperar la conexión.
- Puntuar y comentar también funciona offline.
- Al recuperar la conexión se **sincroniza sola** (al volver a abrir, al pasar a primer plano o al detectar red). Cada operación lleva un `operation_id` local y el reenvío es idempotente: `UNIQUE(visitor_id, stand_id)` responde 409 en visitas y `/api/evaluate` es un `UPDATE`, así que reintentar nunca duplica ni pierde datos.
- Un indicador discreto abajo muestra el estado: `● Conectado`, `○ Sin conexión · guardado en este dispositivo` o `↻ N pendientes`.

### Centro de Mando (`/admin`)

Los organizadores entran a `/admin` y tienen:

- **📊 Resumen**: totales (visitantes, sellos, stands activos, evaluaciones, promedio ⭐), ranking de stands, actividad reciente y exportación rápida.
- **🏫 Stands**: crear, editar (incluyendo **palabra secreta** para registrar visitas sin QR), reordenar, activar/desactivar, regenerar QR y eliminar (borrado lógico: se ocultan conservando visitas y evaluaciones).
- **🎨 Diseño y marca**: nombre, subtítulo, institución, descripción, **paleta de colores** (6 presets), **logo** del evento, estilo del sello (circular/estampilla/cuadrado) y todos los textos de la app. Todo con **vista previa en vivo**; nada cambia hasta tocar **Guardar**.
- **💬 Comentarios**: marcar como revisado ✅, ocultar/mostrar 👁️ o borrar 🗑️ (borrar el comentario conserva la valoración).
- **🧑‍🎓 Visitantes**: lista con progreso y última actividad.
- **⚙️ Configuración**: **Seguridad** (cambiar la contraseña del panel) y exportación CSV de visitas y resumen.

Todo lo guardado se refleja **al instante** en la app pública (colores, textos, sellos).

## Administración

El Centro de Mando (`/admin`) está protegido por contraseña. Se guarda **cifrada** en la base (PBKDF2-SHA256, salt aleatorio, 100 000 iteraciones — el máximo que admite WebCrypto en Cloudflare Workers): nunca en texto plano. La sesión viaja en una cookie **HttpOnly + SameSite=Lax** (y `Secure` en HTTPS) y se invalida al cerrar sesión o al cambiar la contraseña. El visitante nunca ve un login: solo se protege `/api/admin/*`.

### Primer ingreso y contraseña de emergencia

`ADMIN_PASSWORD` es la **clave de arranque y recuperación**:

- Si todavía no hay contraseña guardada, entrás al panel con `ADMIN_PASSWORD`.
- Si la olvidás, `ADMIN_PASSWORD` siempre te deja entrar para volver a cambiarla.

Se define como variable de entorno (en local `dev.vars`, ignorado por git; en Cloudflare `wrangler secret put ADMIN_PASSWORD`). No se muestra en la interfaz.

Flujo recomendado: entrás con `ADMIN_PASSWORD` → **Configuración → Seguridad** → cambiás la contraseña → esa pasa a ser la del panel.

### Cambiar la contraseña

Desde **Configuración → Seguridad** (contraseña actual, nueva y repetir; mínimo 8 caracteres). Al cambiarla se cierran las sesiones abiertas, incluida la actual: hay que volver a entrar con la nueva. Sirve para entregar el panel a otra persona entre eventos.

## Variables de entorno

- `ADMIN_PASSWORD` (requerida): clave de arranque/recuperación y bootstrap del panel. En local va en `.dev.vars` (ignorado por git); en producción, `wrangler secret put ADMIN_PASSWORD`. La contraseña habitual del día a día se cambia desde **Configuración → Seguridad** y queda cifrada en la DB.

## Base de datos

DB: D1 (SQLite). Migraciones en `migrations/`, seed en `seed/`.

```
event_config (id=1: nombre, subtítulo, institución, descripción, logo, 6 colores, stamp_style, texts_json)
stands    (id, slug, name, course, description, area, flag, is_published, token, secret_word, visit_method, schedule, location, stamp_style, stamp_icon, stamp_color, sort_order)
visitors  (id, name, token)
visits    (id, visitor_id, stand_id, rating, comment, is_hidden, is_reviewed, created_at)
          UNIQUE (visitor_id, stand_id)   ← anti-duplicados
admin_auth (id=1: password_hash, salt, iterations, session_token, session_expires)   ← contraseña y sesión del panel
```

Los textos personalizables viven en `texts_json` (el API siempre completa los que falten con el texto por defecto). `secret_word` + `visit_method` (V0.7) agregan la vía de palabra secreta (`qr`/`secret`); `schedule`, `location` y `stamp_style` (migración 0006) agregan horario/lugar por stand y estilo de sello (sale de la config del evento). La columna `flag` guarda el **código ISO 3166-1 alpha-2** (ej. `ar`); el front lo muestra como emoji por ahora, y en V0.4 se cambiará a SVG sin tocar la DB.

### Crear / editar stands

Desde **Stands** del Centro de Mando. Para regenerar el token de un stand desde la consola (por ejemplo si un QR se perdió):

```bash
wrangler d1 execute passport-db --local --command "UPDATE stands SET token = 'nuevo-token' WHERE id = 1"
```

Después regenerar el QR desde el Centro de Mando o **🖨️ QR**.

## API

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/visitors` | Crea visitante `{ name? }` → `{ visitor }` (token del pasaporte) |
| GET | `/api/stands` | Lista stands publicados (incluye token: tan público como el QR impreso) |
| GET | `/api/config` | Configuración pública del evento (identidad, colores, sellos, textos con fallback) |
| GET | `/api/passport?vt=` | Pasaporte del visitante (sellos + progreso) |
| POST | `/api/visits` | `{ vt, tok }` o `{ vt, word }` → sella el stand (por token QR o palabra secreta). 409 si ya fue visitado (devuelve la evaluación existente) |
| POST | `/api/evaluate` | `{ vt, tok, rating, comment }` → evalúa un stand ya visitado. Valida: rating entero 1–5, comentario ≤200 caracteres, trim, filtro de lenguaje. 400/404 si los datos no son válidos |

**Admin** (requieren sesión iniciada; cookie HttpOnly):

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/admin/login` | `{ password }` → inicia sesión (401 si es incorrecta) |
| POST | `/api/admin/logout` | Cierra la sesión |
| POST | `/api/admin/password` | `{ current, next, confirm }` → cambia la contraseña e invalida las sesiones |
| GET | `/api/admin/config` / `PUT` | Leer / guardar configuración completa (logo incluido) |
| GET | `/api/admin/dashboard` | Totales + ranking de stands + actividad reciente |
| GET/POST | `/api/admin/stands` | Listar (con stats) / crear stand |
| PUT/DELETE | `/api/admin/stands/:id` | Editar / eliminar (lógico) |
| POST | `/api/admin/stands/:id/token` | Regenerar token (QR nuevo) |
| GET | `/api/admin/comments` | Comentarios para moderar |
| POST | `/api/admin/comments/:id/hide` / `review` / `delete` | Ocultar / marcar revisado / borrar (conserva la valoración) |
| GET | `/api/admin/visitors` | Visitantes con progreso |
| GET | `/api/admin/export/visitas.csv` / `summary.csv` | Exportación CSV (UTF-8, abre en Excel) |
| POST | `/api/admin/reset-visits` | `{ password }` → vacía `visits` tras confirmar la contraseña actual/password de arranque (mantiene stands, visitantes, config) |
| POST | `/api/admin/reset-visitors` | `{ password }` → borra TODOS los visitantes y su actividad (visitas/evaluaciones). Conserva stands y config |

## Deployment en Cloudflare

> **Estado: desplegado y operativo.** El Worker `passport-muestra` sirve la **UI React (V0.8)** en **https://pasaporte.onlyfunpeople.com.ar** (custom domain declarado en `wrangler.jsonc` → `routes` con `custom_domain: true`). La D1 `passport-db` ya está creada y su `database_id` está cargado. Los pasos 1-2 solo hacen falta si se rehace desde cero.
>
> **Migraciones aplicadas:** la 0005 agrega `secret_word`/`visit_method` y la **0006** agrega `schedule`/`location`/`stamp_style` (todas no destructivas). Para aplicar sobre la DB de producción existente:
> `npx wrangler d1 execute passport-db --remote --file=migrations/0005_secret_word.sql`
> `npx wrangler d1 execute passport-db --remote --file=migrations/0006_schedule_location_stamp_style.sql`
>
> **Antes de cada deploy:** `npm install --prefix frontend && npm run build --prefix frontend` (vaciar `public/assets/` primero para no acumular bundles viejos), luego `npx wrangler deploy`.

1. `npx wrangler login`
2. `npx wrangler d1 create passport-db` → copiar el `database_id` en `wrangler.jsonc`.
3. Aplicar el esquema remoto, en orden:
   - `npx wrangler d1 execute passport-db --remote --file=migrations/0001_init.sql`
   - `npx wrangler d1 execute passport-db --remote --file=migrations/0002_admin_config.sql`
   - `npx wrangler d1 execute passport-db --remote --file=migrations/0003_admin_auth.sql`
   - `npx wrangler d1 execute passport-db --remote --file=migrations/0004_stamps.sql`
   - `npx wrangler d1 execute passport-db --remote --file=migrations/0005_secret_word.sql`
   - `npx wrangler d1 execute passport-db --remote --file=migrations/0006_schedule_location_stamp_style.sql`
4. `npx wrangler d1 execute passport-db --remote --file=seed/seed.sql`
5. `npx wrangler secret put ADMIN_PASSWORD` (clave de arranque/recuperación; nunca va en el repo).
6. `npx wrangler deploy`
7. Dominio: ya declarado en `wrangler.jsonc` (`routes` → `custom_domain`), `wrangler deploy` lo provisiona solo. Con el custom domain activo, `*.workers.dev` queda deshabilitado (para habilitarlo: `"workers_dev": true`).

## Assets y licencias

- **`html5-qrcode`** v2.3.8 (lector QR con cámara, incluye ZXing) — **Apache-2.0**. Vendor en `public/vendor/`, licencia en `LICENSE.html5-qrcode`.
- **`qrcode-generator`** (generación de QR) — MIT. Vendor en `public/vendor/`, licencia en `LICENSE.qrcode-generator`.
- **Banderas**: **`flag-icons`** v7.5.0 (https://github.com/lipis/flag-icons, MIT, © Panayiotis Lipiridis). Los SVG usados están en `public/stamps/`; la licencia MIT exige conservar el aviso de copyright, incluido en `THIRD_PARTY.md`.
- Icono de la app: propio.
- **Patrones reutilizados** de proyectos open source auditados (como *referencia conceptual*, sin copiar código): `bsides-passport-pwa` (estructura pasaporte/QR/admin), `nxsummit-game` (patrón `UNIQUE` anti-duplicado), `DomesticTouristPassport` (flujo visita+valoración+comentario), `kiosk-guestbook` (moderación/exportación), `holoquest` (token→hash). Proyecto nuevo e independiente desde cero.

## Roadmap

- **V0.1** ✅ crear visitante → stand → QR → escaneo → sello → anti-duplicado.
- **V0.2** ✅ estrellas ⭐ 1–5 + comentario (máx. 200 caracteres, contador, trim, filtro básico de lenguaje, una evaluación por stand, todo validado en el Worker).
- **V0.3** ✅ Centro de Mando: evento personalizable (motor único), presets de paleta, logo, sellos, textos, CRUD de stands, moderación de comentarios, visitantes, export CSV.
- **V0.3.1** ✅ dashboard estabilizado (contrato de arrays + contadores en 0) y login del Centro de Mando con contraseña cifrada, sesión HttpOnly y cambio de contraseña.
- **V0.4** ⏳ exportación Excel (hojas: visitantes, visitas, evaluaciones, resumen por stand, resumen general) + banderas SVG.
- **V0.5** 🟡 deploy en Cloudflare **operativo** en `pasaporte.onlyfunpeople.com.ar` (custom domain + HTTPS); pruebas reales en la feria pendientes.
- **V0.6** ✅ modo offline del visitante: service worker + Cache API (app, stands, sellos), IndexedDB (catálogo, visitas y cola), sincronización idempotente al recuperar la conexión e indicador de estado. Sin endpoints nuevos: reutiliza `/api/visits` (409 = ya aplicado) y `/api/evaluate` (UPDATE idempotente).
- **V0.7** ✅ palabra secreta del stand: vía alternativa al QR, `visit_method` (`qr`/`secret`), validación offline y online, PUT parcial del admin (no borra al activar/desactivar), CSV con columna `metodo`.
- **V0.8** ✅ UI React + Vite + TypeScript (visitante y Centro de Mando), toggle Activo/Oculto en grilla, Reiniciar visitas con confirmación, `schedule`/`location`/`stamp_style` por stand. Desplegado en producción.
- **Futuro** ⏳ exportación Excel (hojas: visitantes, visitas, evaluaciones, resumen por stand, resumen general) y banderas SVG.