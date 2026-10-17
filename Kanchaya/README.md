# KanchaYA - entorno de desarrollo

Entorno reproducible basado en Docker Compose para la Seccion 6.6 del Plan de Proyecto.

## Servicios

| Servicio | Puerto local | Uso |
| --- | ---: | --- |
| PostgreSQL 16 | 5432 | Base de datos principal |
| Redis 7 | 6379 | Cache y colas |
| Elasticsearch 8.15 | 9200 | Busqueda e indexacion |
| API | 3000 | Microservicio HTTP de desarrollo |
| Worker | 3001 | Microservicio de trabajos en segundo plano |

## Puesta en marcha

Desde esta carpeta (`Kanchaya`):

```powershell
Copy-Item .env.example .env
# Completa en .env las contraseñas locales y URLs necesarias antes de continuar.
docker compose config
docker compose up -d --build
```

El comando `docker compose config` valida la sintaxis y la interpolacion de variables antes de levantar contenedores.

## Verificacion

```powershell
docker compose ps
Invoke-WebRequest http://localhost:3000/health
Invoke-WebRequest http://localhost:3001/health
Invoke-WebRequest http://localhost:9200/_cluster/health
```

Todos los servicios deben aparecer como `running` y las respuestas HTTP deben ser exitosas. La primera ejecucion puede tardar mas de 60 segundos si Docker necesita descargar las imagenes; con las imagenes ya descargadas, el objetivo de arranque es inferior a 60 segundos.

Para seguir los logs:

```powershell
docker compose logs -f api worker
```

## Base de datos de desarrollo

Después de copiar `.env.example` a `.env`, define contraseñas locales únicas para PostgreSQL, MinIO, JWT y `SEED_PASSWORD`. Configura `DATABASE_URL` con la misma contraseña de PostgreSQL, codificada para URL. No compartas `.env` ni reutilices estas credenciales en staging o producción. Luego levanta PostgreSQL y ejecuta desde esta carpeta:

```powershell
pnpm db:plan
pnpm db:migrate
pnpm db:seed
pnpm db:verify
```

La migración crea las tablas, relaciones e índices definidos en `apps/api/prisma/contract.prisma`. El seed es idempotente y crea los roles `PLAYER`, `VENUE_MANAGER`, `TOURNAMENT_ORGANIZER` y `PLATFORM_ADMIN`, cada uno con su usuario de prueba asociado. El seed toma la clave de prueba de `SEED_PASSWORD`; no hay una contraseña compartida ni credenciales embebidas en el repositorio.

| Rol | Usuario de prueba |
| --- | --- |
| `PLAYER` | `player@kanchaya.test` |
| `VENUE_MANAGER` | `venue.manager@kanchaya.test` |
| `TOURNAMENT_ORGANIZER` | `tournament.organizer@kanchaya.test` |
| `PLATFORM_ADMIN` | `platform.admin@kanchaya.test` |

## Registro de cuentas

El formulario web llama a `POST http://localhost:3003/auth/register`. Inicia PostgreSQL y Redis (`docker compose up -d postgres redis`) y la API NestJS y la web desde esta carpeta con:

```powershell
pnpm dev
```

El registro recibe `name`, `email` y `password`; normaliza el correo, rechaza duplicados con `409 Conflict`, asigna el rol `PLAYER`, y guarda el hash Argon2 y el evento `ACCOUNT_CREATED` en la base de datos.

La lógica de autenticación está en `AuthModule`. Configura `JWT_SECRET` con al menos 32 bytes aleatorios y no lo compartas ni lo guardes en Git. Las contraseñas se guardan con Argon2id (19 MiB, 2 iteraciones, paralelismo 1 y salt aleatorio). `POST /auth/login` devuelve un JWT Bearer firmado con HS256, emisor y audiencia validados, y expiración de una hora por defecto; `ACCESS_TOKEN_TTL_SECONDS` acepta valores entre 300 y 86400. El inicio y cierre de sesión se auditan sin guardar contraseñas ni tokens. `POST /auth/logout` recibe el JWT como `Authorization: Bearer <token>` y revoca su `jti` hasta que caduque.

La API limita cada dirección IP a 120 solicitudes por minuto y los endpoints de registro e inicio de sesión a 5 solicitudes por minuto. Usa Redis compartido mediante `REDIS_URL` para que los contadores se mantengan entre procesos; en producción la API no inicia si falta esa configuración. Define `CORS_ALLOWED_ORIGINS` como una lista separada por comas de orígenes exactos, por ejemplo `https://kanchaya.example,https://app.kanchaya.example`. El acceso nativo de mobile no está sujeto a CORS; si mobile usa un WebView con origen web, ese origen sí debe configurarse. No se habilitan credenciales CORS porque los clientes envían Bearer tokens.

`TRUST_PROXY_HOPS` debe coincidir con la topología de proxies de confianza delante de la API; déjalo en `0` si no hay proxy. Si web y API se despliegan por separado, el proxy del BFF debe sobrescribir `X-Real-IP` con la IP del cliente y la API debe confiar solo en los saltos reales del proxy. La API también envía CSP, HSTS en producción, `X-Content-Type-Options`, `X-Frame-Options` y `Referrer-Policy`, y elimina `X-Powered-By`. Los errores HTTP mantienen `statusCode` y `message` para los clientes, agregan un código y `requestId`, y nunca devuelven stack traces, errores SQL ni mensajes internos. Los logs de errores internos guardan solo el identificador, el estado y el tipo de excepción.

El navegador llama al BFF Next.js en el mismo origen. El JWT web vive en una cookie `HttpOnly`, `SameSite=Lax` y `Secure` en producción; el BFF lo convierte a Bearer al comunicarse con la API, así que el código del navegador no puede leer el token. Mobile usa la API directamente y debe almacenar el Bearer solo en Keychain/Keystore. Las credenciales opcionales de Observe se leen de variables de entorno, sus logs redactan credenciales y PII, y la captura/transmisión de fragmentos del código fuente está desactivada.

## Directorio de centros deportivos

`GET /sports-centers` es público y devuelve los centros deportivos existentes en PostgreSQL con el nombre de cada centro y sus canchas. La portada lo consume mediante el BFF del mismo origen en `/api/sports-centers`; el buscador filtra por nombre de centro o de cancha sin navegar a rutas individuales. Configura `FEATURED_SPORTS_CENTER_IDS` con IDs separados por comas para establecer el orden editorial del carrusel. Si queda vacío, el carrusel prioriza los centros que tienen más canchas registradas.

## Administración de canchas

La pantalla web `/center/courts` permite a una persona con rol `VENUE_MANAGER` crear y editar canchas de los centros que tenga asignados de forma activa. Cada cancha tiene nombre, etiquetas seleccionadas desde el catálogo compartido y estado `ENABLED`, `DISABLED` o `MAINTENANCE`. La portada solo anuncia canchas habilitadas.

La persona responsable también puede subir y quitar fotos desde la edición de cada cancha. Se aceptan JPG, PNG y WebP de hasta 5 MB, con un máximo de 8 fotos por cancha. La API comprueba el tipo real del archivo y su tamaño; al completarse la carga, la foto queda publicada en la galería pública. La API solo firma una URL de carga de cinco minutos y el navegador transfiere el archivo directamente a MinIO/S3, sin incluir sus bytes en el formulario ni en la base de datos. En el directorio público, la galería solicita sus metadatos al abrirse y las imágenes se descargan de forma diferida.

El precio se define en soles peruanos (PEN) por hora. Se guarda como céntimos enteros para evitar errores de precisión monetaria y se muestra como importe por hora en la ficha pública. Desde la edición de una cancha, el responsable autorizado actualiza el precio mediante `PATCH /sports-centers/managed/:centerId/courts/:courtId/price`; el permiso `PRICE_MANAGE` y la asignación activa al centro se validan en cada solicitud. Se aceptan importes mayores que cero con hasta dos decimales.

El horario semanal se registra una vez por centro y se muestra en cada una de sus canchas, que siguen exactamente los mismos días y horas de apertura y cierre. El responsable lo actualiza mediante `PATCH /sports-centers/managed/:centerId/opening-hours`; se admiten horas locales del centro y como máximo un tramo por día, con horas exactas, duración mínima de una hora y cierre posterior a la apertura dentro del mismo día. Los días omitidos quedan cerrados; `24:00` representa el final del día. La API codifica lunes como `1` y domingo como `7`. No se permiten incrementos de media hora ni tramos que crucen medianoche. Este horario es informativo: no calcula disponibilidad en tiempo real ni habilita reservas.

Las canchas empiezan como borradores y no aparecen en el marketplace hasta que la persona responsable las publique desde `/center/courts`. La pantalla muestra los requisitos pendientes y una vista previa; esta solo se habilita cuando los cambios se han guardado. Para publicar, la cancha debe estar habilitada y tener nombre, al menos una foto cargada, un precio mayor que cero, un día con un horario válido y al menos una etiqueta activa asignada al centro. La API vuelve a validar estas condiciones al publicar mediante `POST /sports-centers/managed/:centerId/courts/:courtId/publish`; se puede retirar la ficha explícitamente mediante `POST /sports-centers/managed/:centerId/courts/:courtId/withdraw`. Solo responsables con asignación activa al centro pueden administrar sus canchas y publicaciones.

Las fichas publicadas se consultan en `/sports-centers/:centerId/courts/:courtId` y desde el directorio público. El catálogo compartido de etiquetas se administra por `PLATFORM_ADMIN` en `/admin/sports-center-tags`; cada centro puede asignar hasta 10 etiquetas activas. La migración de publicación conserva visibles las canchas habilitadas existentes y les asigna la etiqueta neutral «Centro deportivo» a sus centros. Las canchas deshabilitadas no se publican automáticamente.

En desarrollo, `docker compose up -d minio minio-court-photos` crea el bucket `kanchaya-court-photos`, habilita lectura pública de fotos y permite cargas desde `http://localhost:3002`. Configura `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `COURT_PHOTOS_BUCKET` y `COURT_PHOTOS_PUBLIC_BASE_URL` en el entorno de la API; si las credenciales S3 quedan vacías, se usan las credenciales locales de MinIO. En producción, usa credenciales limitadas al bucket, habilita lectura pública de objetos publicados y permite CORS `POST`, `GET` y `HEAD` desde el origen de la web; configura `COURT_PHOTOS_PUBLIC_BASE_URL` con la URL pública/CDN del bucket. No uses las credenciales raíz de MinIO en producción.

Los endpoints móviles y web de gestión usan Bearer JWT: `GET /sports-centers/managed`, `POST /sports-centers/managed/:centerId/courts` y `PUT /sports-centers/managed/:centerId/courts/:courtId`. La API verifica el permiso y la asignación activa del responsable en cada solicitud; las escrituras también vuelven a comprobar el alcance dentro de la consulta/transacción.

Solo `PLATFORM_ADMIN` puede administrar el catálogo en `/admin/court-characteristics`, mediante `GET /court-characteristics`, `POST /court-characteristics` y `PUT /court-characteristics/:characteristicId`. Las etiquetas se archivan en vez de borrarse para preservar las descripciones existentes. El seed agrega Techado, Superficie sintética, Estacionamiento e Iluminación como opciones iniciales editables.

Los cambios de contrato están en [`apps/api/prisma/contract.prisma`](apps/api/prisma/contract.prisma); las migraciones planeadas se deben aplicar con `pnpm db:migrate` en el entorno correspondiente antes de usar la funcionalidad contra una base de datos actualizada.

## Actividades de autenticación web y mobile

El desglose y los criterios de aceptación están en [`docs/activities/auth-security-web-mobile.md`](docs/activities/auth-security-web-mobile.md). La actividad de hardening base de API está implementada en esta rama. Quedan las integraciones específicas del cliente mobile, el endurecimiento de la sesión web y la configuración/validación por entorno.

Para detener el entorno sin borrar los datos:

```powershell
docker compose down
```

Para detenerlo y borrar los volumenes locales:

```powershell
docker compose down -v
```

## Conexion desde otros contenedores

Usa los nombres de servicio como host: `postgres`, `redis` y `elasticsearch`. No uses `localhost` desde `api` o `worker`, porque dentro de un contenedor `localhost` apunta al propio contenedor.
