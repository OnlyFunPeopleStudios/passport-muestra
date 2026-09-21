# Terceros (Third-Party Notices)

Este proyecto incluye el siguiente software de terceros. Todas las licencias son
permisivas y compatibles con el uso previsto (incluido el comercial).

## Librerías vendorizadas

### html5-qrcode — Apache License 2.0

- Versión: 2.3.8
- Uso: lectura de QR con la cámara (visitante).
- Archivo: `public/vendor/html5-qrcode.min.js`
- Licencia: Apache-2.0. Copia completa en `public/vendor/LICENSE.html5-qrcode`.
- Copyright: © Minhaz (html5-qrcode, https://github.com/mebjas/html5-qrcode).

### ZXing (incluido dentro de html5-qrcode) — Apache License 2.0

- Uso: decodificación de códigos, empaquetado dentro de `html5-qrcode.min.js`
  (upstream: `html5-qrcode/third_party/zxing-js.umd.js`).
- Licencia: Apache-2.0.
- Copyright: © 2008 ZXing authors (https://github.com/zxing-js/library).
- Se conserva el aviso de copyright de ZXing; la licencia Apache-2.0 aplicable
  es la misma que la de `html5-qrcode` (`public/vendor/LICENSE.html5-qrcode`).

### qrcode-generator — MIT License

- Versión: 1.5.2
- Uso: generación de QR (páginas `#/qr` y descargas del Centro de Mando).
- Archivo: `public/vendor/qrcode-generator.js`
- Licencia: MIT. Copia en `public/vendor/LICENSE.qrcode-generator`.
- Copyright: © 2009 Kazuhiko Arase (https://github.com/kazuhikoarase/qrcode-generator).

### flag-icons — MIT License

- Versión: 7.5.0
- Uso: SVG de banderas de los stands en `public/stamps/` (13 archivos).
- Licencia: MIT.
- Copyright: © 2013 Panayiotis Lipiridis (https://github.com/lipis/flag-icons).
- Los SVG conservan el identificador `flag-icons-<iso>`.

```
The MIT License (MIT)

Copyright (c) 2013 Panayiotis Lipiridis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Proyectos de referencia (sin código incorporado)

Los siguientes repositorios se consultaron **solo como referencia conceptual**
(estructura, patrones). No se copió código; por lo tanto no imponen obligaciones
de licencia sobre este proyecto:

- `bsides-passport-pwa` — MIT
- `nxsummit-game` — MIT
- `tmdinosaurcenter/kiosk-guestbook` — MIT
- `DomesticTouristPassport` — sin licencia declarada
- `davidwolfpaw/scavenger-hunt-web-app` — sin licencia declarada
- `anhkhoado932/scavengerhunt` — sin licencia declarada
- `holoquest` — no verificado
