# Respaldo de las fotos de Cloudinary

Cloudinary está en el plan gratis (25 créditos por mes, ~1 crédito = 1 GB de ancho
de banda). Si la cuenta se corta, las fotos dejan de verse. Para eso hay una copia
propia en el servidor y un interruptor para usarla.

- Copia: `/srv/celimap/shared/img-mirror` (fuera de `releases/`, no se pierde con los deploys).
- Se sirve en `https://img.celimap.com.ar` (Caddy). Ya está permitido en `next.config.js`
  (imágenes y CSP) y en `lib/avatar-url.ts`.
- Conversión de URLs: `lib/image-mirror.ts`. La URL espejo conserva la versión, así
  que el cambio es exactamente reversible:

  ```
  https://res.cloudinary.com/<cloud>/image/upload/v123/places/abc.jpg
  https://img.celimap.com.ar/v123/places/abc.jpg      → archivo places/abc.jpg
  ```

## 1. DNS (una vez)

En la zona de `celimap.com.ar` (hoy en Vercel): registro **A** `img` → `149.104.92.59`.

## 2. Caddy (una vez)

Agregar al Caddyfile y recargar (`systemctl reload caddy`):

```caddy
img.celimap.com.ar {
	# Sólo imágenes: el manifiesto, las carpetas y todo lo demás dan 404.
	@noImagen not path_regexp \.(jpe?g|png|webp|gif|avif)$
	respond @noImagen 404

	# La URL trae la versión de Cloudinary (v123/); el archivo no.
	@conVersion path_regexp ver ^/v[0-9]+/(.+)$
	rewrite @conVersion /{re.ver.1}

	root * /srv/celimap/shared/img-mirror
	header {
		Cache-Control "public, max-age=2592000"
		match status 200
	}
	header X-Content-Type-Options nosniff
	file_server
}
```

Si da 403: Caddy tiene que poder leer la carpeta (`chmod -R o+rX /srv/celimap/shared/img-mirror`)
y, con SELinux, mirar `ausearch -m avc -ts recent`; si aparece caddy, `chcon -R -t httpd_sys_content_t /srv/celimap/shared/img-mirror`.

## 3. Hacer / actualizar la copia

Desde la carpeta de la app, con las variables de producción cargadas:

```bash
cd /srv/celimap/current
set -a; . /srv/celimap/shared/.env.production; set +a
npx tsx scripts/cloudinary-backup.ts                 # dry-run: cuánto falta y cuántos MB
npx tsx scripts/cloudinary-backup.ts --write --max 20  # prueba chica
npx tsx scripts/cloudinary-backup.ts --write         # todo lo que falta
```

Bajar originales gasta ancho de banda de Cloudinary (~1 crédito por GB; el dry-run lo dice).
Sólo baja lo que falta, así que se puede correr cada semana (cron):

```cron
0 4 * * 1  cd /srv/celimap/current && set -a && . /srv/celimap/shared/.env.production && set +a && npx tsx scripts/cloudinary-backup.ts --write >> /var/log/celimap-img-backup.log 2>&1
```

Sumar `/srv/celimap/shared/img-mirror` al backup cifrado de B2.

Comprobar: `curl -I https://img.celimap.com.ar/<una ruta del .manifest.json>` → 200 `image/jpeg`.

## 4. Interruptor (sólo si Cloudinary deja de entregar)

```bash
cd /srv/celimap/current
set -a; . /srv/celimap/shared/.env.production; set +a
npx tsx scripts/cloudinary-mirror-urls.ts --a-copia            # dry-run
npx tsx scripts/cloudinary-mirror-urls.ts --a-copia --write
```

Cambia `places.photos`, `ventures.photos`, `reviews.evidencePhotos`, `lists.coverImage` y
`users.image`. Sólo pasa a la copia las fotos que están en la carpeta; las demás quedan
como estaban y se listan. El mapa se actualiza en ~15 min y las fichas en ~1 h.

Volver a Cloudinary cuando la cuenta esté bien:

```bash
npx tsx scripts/cloudinary-mirror-urls.ts --a-cloudinary --write
```

### Lo que el interruptor no cubre

- Las fotos nuevas se siguen subiendo a Cloudinary (`/api/upload`). Si la cuenta está
  cortada del todo, subir fotos falla: hay que avisar en admin o pasar las subidas al
  servidor (cambio aparte).
- Las imágenes de Google Wallet (`lib/wallet/wallet-images.ts`) y las de redes del admin
  siguen apuntando a Cloudinary.
- Las URLs con transformaciones guardadas en la base (raro) no se convierten; se listan.
