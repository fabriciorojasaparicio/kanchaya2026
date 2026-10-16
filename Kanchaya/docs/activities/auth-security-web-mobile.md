# E1-A10 — Autenticación segura para web y mobile

Estas actividades amplían E1-A10 y mantienen un único contrato de autenticación para los clientes web y mobile.

## E1-A11 — Endurecer la API de autenticación

**Estado:** Implementada en la API; pendiente validación de aceptación.

- [x] Guardar contraseñas con Argon2id y parámetros explícitos mínimos de 19 MiB, 2 iteraciones y paralelismo 1.
- [x] Emitir JWT con expiración `exp`, duración configurable y acotada, algoritmo HS256, emisor y audiencia verificados.
- [x] Limitar solicitudes por IP globalmente y aplicar un límite más estricto a registro e inicio de sesión.
- [x] Compartir los contadores del límite entre réplicas mediante Redis; exigir Redis en producción.
- [x] Restringir CORS a orígenes HTTP/HTTPS exactos configurados; mantener Bearer auth sin credenciales CORS.
- [x] Añadir cabeceras CSP, HSTS en producción, `nosniff`, protección de framing y política de referrer.
- [x] Normalizar errores HTTP y ocultar trazas, datos SQL y mensajes internos; no incluir credenciales ni tokens en logs.
- [x] Cargar credenciales opcionales de Observe desde configuración, redactar secretos/PII y desactivar el envío de fragmentos de código fuente.
- [ ] Ejecutar aceptación de seguridad con solicitudes válidas e inválidas antes del despliegue.

## E1-A12 — Integrar y endurecer la sesión web

**Estado:** Integrada la sesión HttpOnly en el cliente web; pendiente aceptación.

- [ ] Mantener el contrato Bearer y gestionar expiración, cierre de sesión y respuestas `401`, `403` y `429` con mensajes claros y sin volver a intentar credenciales automáticamente.
- [x] Sustituir `sessionStorage` por rutas BFF del mismo origen y cookie `HttpOnly`, `SameSite=Lax`, `Secure` en producción; validar `Origin` en las operaciones que cambian estado.
- [ ] Configurar el proxy de entrada para sobrescribir `X-Real-IP` y ajustar `TRUST_PROXY_HOPS`; la ruta BFF lo reenvía a la API para que los límites distingan a cada visitante.
- [ ] Revisar la alternativa de sesión y las protecciones CSRF en el dominio de producción.
- [ ] Verificar que el build del navegador no incluya secretos de servidor y que los errores no muestren datos personales, tokens ni respuestas internas.

## E1-A13 — Integrar autenticación en mobile

**Estado:** Pendiente de la aplicación mobile.

- [ ] Consumir los endpoints compartidos de registro, login, perfil, actualización del perfil y logout; respetar el `expiresIn` comunicado por la API.
- [ ] Guardar el token en Keychain (iOS) / Keystore (Android) mediante almacenamiento seguro de la plataforma; no usar preferencias simples, SQLite sin cifrar ni logs.
- [ ] Manejar `401` limpiando la sesión local, `403` con una pantalla de acceso denegado y `429` respetando `Retry-After`.
- [ ] Evitar guardar contraseñas, tokens y datos personales en telemetría, crash reports, notificaciones o caché compartida.
- [ ] Documentar el origen de WebView, si existe; las aplicaciones nativas no requieren una entrada CORS.

## E1-A14 — Configurar seguridad por entorno

**Estado:** Pendiente para staging y producción.

- [ ] Inyectar `JWT_SECRET` y credenciales Redis desde un gestor de secretos; exigir un secreto nuevo y aleatorio por entorno.
- [ ] Configurar TLS público y TLS/autenticación en Redis administrado; validar que el límite distribuido siga disponible en todas las réplicas.
- [ ] Definir orígenes exactos web/WebView y `TRUST_PROXY_HOPS` según el proxy real; no confiar en `X-Forwarded-For` arbitrario.
- [ ] Configurar `ACCESS_TOKEN_TTL_SECONDS` y rotación del secreto con un procedimiento de invalidación/re-login.
- [ ] Revisar límites globales y de login con la carga esperada de clientes web y mobile.

## E1-A15 — Verificar el flujo de punta a punta

**Estado:** Pendiente.

- [ ] Verificar registro, inicio, consulta/actualización del perfil, cierre de sesión, token expirado y rutas sin autorización en web y mobile.
- [ ] Verificar bloqueo `429`, encabezado `Retry-After`, origen CORS permitido/rechazado y acceso nativo sin encabezado `Origin`.
- [ ] Comprobar que respuestas 5xx no exponen stack, SQL, configuración, secretos ni datos personales; comprobar que los logs no contienen contraseñas ni tokens.
- [ ] Revisar accesibilidad, estados de carga/error y comportamiento de reconexión en tamaños móviles y web.
