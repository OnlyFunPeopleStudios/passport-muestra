# Passport Muestra

**Pasaporte digital para la Muestra Escolar — 28 de Octubre de 2026.**

El visitante crea su pasaporte desde el celular (sin instalar nada), recorre los stands, escanea su QR con la cámara y cada stand le sella la **bandera de su país** en el pasaporte. Después puntúa con estrellas y deja un comentario. Los organizadores ven todo en el **Centro de Mando** (próximamente) y exportan los datos a Excel.

## Estado del proyecto

| Versión | Estado |
|---|---|
| **V0.1** | ✅ Loop básico: crear visitante, 15 stands seed, QR generable/imprimible, escaneo, sello, anti-duplicado `UNIQUE(visitor_id, stand_id)` |
| V0.2 | ⏳ Puntuación ⭐ y comentarios |
| V0.3 | ⏳ Centro de Mando (estadísticas + moderación) |
| V0.4 | ⏳ Exportación CSV/XLSX + banderas SVG |
| V0.5 | ⏳ Seguridad, pruebas y deploy en Cloudflare |

## Stack

- **Cloudflare Workers** (JavaScript, sin dependencias de runtime) → API.
- **Cloudflare D1** (SQLite) → base de datos. Anti-duplicado resuelto en la DB: `UNIQUE(visitor_id, stand_id)`.
- **Static Assets** de Cloudflare → PWA del visitante (HTML/CSS/JS vanilla, sin framework).
- QR: `html5-qrcode` (lectura con cámara) + `qrcode-generator` (generación/imán impresión), ambos MIT.

Una sola pieza de servidor. Dev local con `wrangler dev`; el mismo código se despliega en Cloudflare sin reescribir nada.

## Arquitectura

```
Celular (PWA) ──┐
                 ├─► Cloudflare Worker (/api/*) ──► D1 (SQLite)
Notebook admin ─┘        │
                         └─► static assets: index.html, app.js, style.css
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
npm run db:init    # crea el esquema en la DB local (migrations/0001_init.sql)
npm run db:seed    # carga 15 stands de prueba
npm run dev        # sirve en http://localhost:8787
```

Probar el loop completo (API):

```bash
pwsh -NoProfile -File scripts/smoke.ps1
```

Para probar con el celular en la misma red, arrancar con `npx wrangler dev --ip 0.0.0.0` y entrar desde el teléfono a `http://<ip-pc>:8787`. **La cámara solo funciona sobre HTTPS o localhost** (el navegador lo exige); en la feria ya estará el dominio final con HTTPS.

## Uso

1. Abrí `http://localhost:8787` → **Crear mi pasaporte** (nombre opcional).
2. Desde el menú **🖨️ QR**: generá el QR de cada stand, descargalo e imprimilo para pegarlo en el stand.
3. Desde el menú **📷 Escanear**: apuntá la cámara al QR de un stand.
4. El sello (bandera del país del stand) aparece en **🛂 Pasaporte**, con progreso `8 / 15 · 53%`.
5. El botón **Visitar** en **🏫 Stands** simula el escaneo (útil sin cámara, para pruebas).
6. Volver a escanear el mismo stand → «Este stand ya forma parte de tu pasaporte.» (HTTP 409, garantizado por `UNIQUE` en la DB).

## Variables de entorno

No hay secretos en V0.1. En V0.3 el Centro de Mando agregará una contraseña de administración como variable de entorno (`ADMIN_PASSWORD`).

## Base de datos

DB: D1 (SQLite). Migraciones en `migrations/`, seed en `seed/`.

```
stands   (id, slug, name, course, description, area, flag, is_published, token)
visitors (id, name, token)
visits   (id, visitor_id, stand_id, rating, comment, is_hidden, created_at)
         UNIQUE (visitor_id, stand_id)   ← anti-duplicados
```

La columna `flag` guarda el **código ISO 3166-1 alpha-2** (ej. `ar`). El front lo muestra como emoji por ahora; en V0.4 se cambiará a SVG sin tocar la DB.

### Crear / editar stands

Por ahora los stands viven en el seed (SQL). La administración CRUD de stands llega en V0.3. Para regenerar el token de un stand (por ejemplo si un QR se perdió o se expone):

```bash
wrangler d1 execute passport-db --local --command "UPDATE stands SET token = 'nuevo-token' WHERE id = 1"
```

Después regenerar el QR desde **🖨️ QR**.

## API

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/visitors` | Crea visitante `{ name? }` → `{ visitor }` (token del pasaporte) |
| GET | `/api/stands` | Lista stands publicados (incluye token: tan público como el QR impreso) |
| GET | `/api/passport?vt=` | Pasaporte del visitante (sellos + progreso) |
| POST | `/api/visits` | `{ vt, tok }` → sella el stand. 409 si ya fue visitado |

## Deployment futuro en Cloudflare

1. `npx wrangler login`
2. `npx wrangler d1 create passport-db` → copiar el `database_id` en `wrangler.jsonc`.
3. `npx wrangler d1 execute passport-db --remote --file=migrations/0001_init.sql`
4. `npx wrangler d1 execute passport-db --remote --file=seed/seed.sql`
5. `npx wrangler deploy`
6. Bindear el dominio: `pasaporte.onlyfunpeople.com.ar` → este Worker.

## Assets y licencias

- **`html5-qrcode`** (lector QR con cámara) — MIT. Vendor en `public/vendor/`, licencia en `LICENSE.html5-qrcode`.
- **`qrcode-generator`** (generación de QR) — MIT. Vendor en `public/vendor/`, licencia en `LICENSE.qrcode-generator`.
- **Banderas**: emojis de bandera (códigos ISO) en V0.1. Para V0.4 se migrará a **`flag-icons`** (https://github.com/lipis/flag-icons, MIT): colección SVG completa, permiso comercial y de modificación, sin atribución obligatoria (se documentará igual en el README).
- Icono de la app: propio.
- **Patrones reutilizados** de proyectos open source auditados (como *referencia conceptual*, sin copiar código): `bsides-passport-pwa` (estructura pasaporte/QR/admin), `nxsummit-game` (patrón `UNIQUE` anti-duplicado), `DomesticTouristPassport` (flujo visita+valoración+comentario), `kiosk-guestbook` (moderación/exportación), `holoquest` (token→hash). Proyecto nuevo e independiente desde cero.

## Roadmap

- **V0.1** ✅ crear visitante → stand → QR → escaneo → sello → anti-duplicado.
- **V0.2**: estrellas ⭐ 1–5 y comentarios con límite de caracteres y filtro básico de lenguaje.
- **V0.3**: Centro de Mando (totales, ranking por stand, últimas visitas, moderación de comentarios, CRUD de stands, regenerar QR).
- **V0.4**: exportación Excel (hojas: visitantes, visitas, evaluaciones, resumen por stand, resumen general) + banderas SVG.
- **V0.5**: pruebas reales, seguridad y deploy en Cloudflare con `pasaporte.onlyfunpeople.com.ar`.