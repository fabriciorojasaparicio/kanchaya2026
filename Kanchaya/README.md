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
