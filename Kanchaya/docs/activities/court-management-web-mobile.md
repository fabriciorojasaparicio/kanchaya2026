# Gestión de canchas para web y mobile

## Objetivo

Permitir al responsable mantener la oferta de canchas de los centros que tiene asignados, mientras el administrador de plataforma conserva el control del catálogo de características.

## Campos de una cancha

- `name`: requerido, entre 2 y 80 caracteres.
- `characteristicIds`: lista de etiquetas del catálogo; puede estar vacía.
- `status`: requerido; acepta `ENABLED`, `DISABLED` o `MAINTENANCE`.
- `centerId`: se toma de la ruta. Nunca se acepta un centro enviado libremente en el cuerpo.

La pantalla presenta mensajes de validación en español. Las etiquetas archivadas siguen asociadas a las canchas que ya las tienen, pero no pueden asignarse a otras. El seed instala Techado, Superficie sintética, Estacionamiento e Iluminación como catálogo inicial; un administrador puede renombrarlas o archivarlas.

## Permisos

| Rol | Canchas | Catálogo de características |
| --- | --- | --- |
| `VENUE_MANAGER` | Consultar centros asignados; crear y actualizar sus canchas | Consultar opciones disponibles |
| `PLATFORM_ADMIN` | Conserva los permisos globales que ya define el proyecto | Consultar, crear, renombrar y archivar |
| Otros roles | Sin acceso de gestión | Sin acceso |

La API comprueba el rol, el permiso, y que la asignación `CenterManager` esté activa. Las consultas de lista filtran por el usuario autenticado; las escrituras verifican tanto centro como cancha y repiten el alcance de centro en la transacción. Un `centerId` o `courtId` recibido en URL no concede autorización.

## API

Los clientes mobile envían `Authorization: Bearer <token>`. La web usa las rutas BFF del mismo origen y la cookie HttpOnly existente.

### Gestión de canchas

- `GET /sports-centers/managed` — lista únicamente los centros activos asignados al responsable y las canchas de cada uno.
- `POST /sports-centers/managed/:centerId/courts` — crea una cancha dentro del centro autorizado.
- `PUT /sports-centers/managed/:centerId/courts/:courtId` — reemplaza el nombre, estado y etiquetas dentro del centro autorizado.

Ejemplo de cuerpo para crear o actualizar:

```json
{
  "name": "Cancha sintética 1",
  "status": "ENABLED",
  "characteristicIds": ["uuid-de-etiqueta"]
}
```

La respuesta de escritura devuelve la cancha persistida con su `centerId`, estado y etiquetas para que el cliente confirme el guardado o recargue el recurso.

### Catálogo (administrador de plataforma)

- `GET /court-characteristics` — lista las etiquetas activas y archivadas.
- `POST /court-characteristics` con `{ "name": "Techado" }` — agrega una etiqueta activa.
- `PUT /court-characteristics/:characteristicId` con `{ "name": "Techado", "isActive": false }` — renombra o archiva/reactiva una etiqueta.

Las etiquetas se archivan en lugar de borrarse para conservar la información histórica de las canchas. Los cambios de cancha y catálogo se registran en `AuditLog` sin incluir datos sensibles.

## Acceso web

- Responsable: `/center/courts`, accesible desde el perfil de rol `VENUE_MANAGER`.
- Administrador: `/admin/court-characteristics`, accesible desde el perfil de rol `PLATFORM_ADMIN`.
- Visitantes: solo ven las canchas en estado `ENABLED` en el directorio público.

## Base de datos

El contrato añade `Court.status` (por defecto `ENABLED`), `CourtCharacteristic` y la relación explícita `CourtCharacteristicOnCourt`. La migración `court_management` agrega las tablas, comprobaciones, índices y claves foráneas. Aplicar la migración en cada entorno antes de habilitar la API nueva.
