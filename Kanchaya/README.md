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
