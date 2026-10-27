# Plan de trabajo de Fran (rama `fran`) — Seguridad, Autenticación y Validaciones

## 1. Punto de partida y estado base

El proyecto base fue importado desde el repositorio original (`Ing-Web-3`, commit `b373f65`). Cumple con la arquitectura base requerida (Spring Boot 4.1 + Java 21, Vue 3 + Vite, MySQL/H2 y Docker Compose).

### Pruebas de base ejecutadas (Día 1)
- **Backend (Maven / JDK 21.0.7):**
  - Comando: `.\mvnw.cmd test`
  - Resultado: **46 tests ejecutados, 0 fallos, 0 errores, 0 omitidos** (`BUILD SUCCESS`).
  - Desglose por clase de test:
    - `AlarmasTest`: 5 tests
    - `CircuitoOrdenTest`: 2 tests
    - `ConfiguracionAlarmaTest`: 4 tests
    - `H2ConsolaCerradaTest`: 2 tests
    - `H2ConsolaPerfilH2Test`: 2 tests
    - `MonitoreoTest`: 4 tests
    - `SeguridadTest`: 7 tests
    - `Iw3BackendApplicationTests`: 1 test
    - `EstadoOrdenTest`: 3 tests
    - `CalculosMonitoreoTest`: 6 tests
    - `ReglasAlmacenamientoTest`: 4 tests
    - `ReglasDetalleCargaTest`: 6 tests
- **Frontend (Node v24.14.1 / Vitest 5.0.5):**
  - Comandos: `npm ci`, `npm test`, `npm run build`
  - Resultado: **16 tests pasados en 4 archivos** (`ConciliacionesView.test.js`: 2, `auth.test.js`: 7, `AlarmasView.test.js`: 2, `formato.test.js`: 5).
  - Build: compilación de Vite exitosa (`dist/` generado en 613 ms).

---

## 2. Diagnóstico de problemas y verificación con evidencia

A continuación se detalla la verificación empírica punto por punto de los 8 aspectos de seguridad y validaciones analizados:

| Punto | Descripción | ¿Existe? | Evidencia empírica y análisis técnico |
|---|---|:---:|---|
| **a** | Log `"Using generated security password"` al correr tests (usuario en memoria que no se usa). | **SÍ** | Al ejecutar `.\mvnw.cmd test`, en la ejecución de `Iw3BackendApplicationTests` se genera el log: `WARN ... .s.a.UserDetailsServiceAutoConfiguration : Using generated security password: <uuid>` y `Global AuthenticationManager configured with UserDetailsService bean with name inMemoryUserDetailsManager`. Ocurre porque Spring Security detecta la falta de un bean `UserDetailsService` explícito y autoconfigura uno en memoria, cuando el proyecto autentica mediante `AuthService` y `JwtAuthFilter`. |
| **b** | `JWT_SECRET` con valor por defecto de desarrollo en `application.properties` y `docker-compose.yml`. | **SÍ** | En `backend/src/main/resources/application.properties` (línea 38) y `docker-compose.yml` (línea 40) figura la misma clave en texto plano: `clave-solo-para-desarrollo-cambiar-en-produccion-123456`. Al estar el repositorio público, cualquiera podría firmar tokens válidos. Bloquear el arranque rompería `docker compose up` sin `.env`; se debe emitir un `WARN` visible si se detecta dicha clave por defecto. |
| **c** | Mensaje de error al iniciar con un `JWT_SECRET` menor a 32 caracteres (256 bits). | **SÍ** (el error **no es claro**) | Al ejecutar con `-Dapp.seguridad.jwt-secret=secreto-corto`, el arranque falla con `UnsatisfiedDependencyException` en `jwtAuthFilter` envolviendo una excepción interna `io.jsonwebtoken.security.WeakKeyException: The specified key byte array is 104 bits which is not secure enough... (RFC 7518 Section 3.2)`. Produce más de 100 líneas de stacktrace sin un mensaje amigable al operador indicando que la propiedad en `.env` debe tener al menos 32 caracteres. |
| **d** | `LoginView.vue` no posee tests de componente. | **SÍ** | En `frontend/src/views/` no existe `LoginView.test.js`. El archivo `src/stores/auth.test.js` cubre el store Pinia, la función `api()` y el guard del router, pero ninguna prueba monta el formulario de login, valida los campos requeridos, el estado de carga (`:disabled="enviando"`), la visualización de errores ni la redirección tras el submit. |
| **e** | Cierre silencioso de sesión al expirar el token JWT sin aviso al usuario. | **SÍ** | En `frontend/src/api/http.js` (líneas 18-20), al recibir 401 con token activo se ejecuta `auth.logout()` y se lanza el error. En `frontend/src/App.vue` (líneas 10-15), un `watch` detecta `!auth.estaLogueado` y llama a `router.push('/login')` sin parámetros ni notificaciones. El usuario es redirigido a `/login` sin saber por qué expiró la sesión. |
| **f** | Alta de orden acepta cisternas con el mismo número dentro de un mismo camión. | **SÍ** | Se probó un `POST /api/v1/ordenes` con un camión que contenía dos cisternas con `"numero": 1`. La API respondió `201 Created` y guardó ambas. Ni `CamionDto` valida números únicos en la lista, ni la tabla `cisterna` posee restricción de unicidad para `(camion_id, numero)`. |
| **g** | Campos de texto sin `@Size(max = 255)`: respuesta ante strings de 300 caracteres. | **SÍ** | Se probó `POST /api/v1/ordenes` enviando un chofer con nombre de 300 caracteres. La API respondió **409 Conflict** (`"El dato ya existe o viola una restriccion de la base"`). Al no haber `@Size(max = 255)` en los DTOs (`ChoferDto`, `ClienteDto`, `ProductoDto`, `CamionDto`), Bean Validation pasa, Hibernate intenta persistir en una columna `VARCHAR(255)` y la base lanza `DataIntegrityViolationException`. `GlobalExceptionHandler.integridad()` la captura y responde erróneamente 409 en vez de un 400 Bad Request detallado. |
| **h** | Login con contraseña mayor a 72 bytes (límite de BCrypt). | **SÍ** | Se probó `POST /api/v1/auth/login` con una contraseña de 100 caracteres. La API respondió **401 Unauthorized** ejecutando BCrypt. `LoginRequest` no valida `@Size(max = 72)`. Como BCrypt trunca silenciosamente a 72 bytes, cualquier carácter adicional es ignorado y contraseñas arbitrariamente largas consumen tiempo de CPU innecesariamente (vector DoS), debiendo rechazarse con 400 Bad Request. |

---

## 3. Plan de trabajo (Días 2 a 14)

El plan se ajusta a la guía de responsabilidades y a los problemas verificados:

| Día | Objetivo y Tareas | Archivos involucrados |
|:---:|---|---|
| **1** | **Entorno, pruebas de base y confirmación del plan**<br>Ejecutar pruebas iniciales reales, verificar puntos de diagnóstico (a–h) con evidencia y redactar este documento. | `docs/plan-fran.md` |
| **2** | **Desactivación del usuario autogenerado en memoria (Punto a)**<br>Excluir `UserDetailsServiceAutoConfiguration` en `Iw3BackendApplication.java` para evitar el log `"Using generated security password"` sin afectar la autenticación basada en JWT. | `backend/src/main/java/ar/edu/iua/iw3/Iw3BackendApplication.java` |
| **3** | **Validación clara y advertencia de `JWT_SECRET` (Puntos b y c)**<br>Validar en `JwtService` que el secreto posea al menos 32 caracteres con un mensaje claro en caso contrario; advertir mediante log `WARN` si se detecta el valor por defecto de desarrollo sin romper `docker compose up`. | `backend/src/main/java/ar/edu/iua/iw3/security/JwtService.java` |
| **4** | **Tests unitarios para `JwtService`**<br>Crear tests unitarios directos (sin levantar contexto Spring): generación de token con claims, firma HS256, expiración, validación de token adulterado o vencido, y validación de clave corta. | `backend/src/test/java/ar/edu/iua/iw3/security/JwtServiceTest.java` |
| **5** | **Validaciones en el alta de orden (Puntos f y g)**<br>Validar que las cisternas no repitan número en el camión. Agregar `@Size(max = 255)` en campos de texto de DTOs (`ChoferDto`, `ClienteDto`, `ProductoDto`, `CamionDto`) para garantizar respuesta HTTP 400 Bad Request en lugar de 409 Conflict. | `dto/OrdenSapRequest.java`, `dto/CamionDto.java`, `dto/ChoferDto.java`, `dto/ClienteDto.java`, `dto/ProductoDto.java`, `model/Cisterna.java`, tests de controller |
| **6** | **Aviso de sesión expirada en el frontend (Punto e)**<br>Modificar `api()` y `auth.js` para registrar que la sesión expiró por 401; redirigir a `/login?expirada=true` y mostrar un aviso visible al usuario en `LoginView.vue`. | `frontend/src/api/http.js`, `frontend/src/stores/auth.js`, `frontend/src/views/LoginView.vue` |
| **7** | **Tests de `LoginView.vue` y primer merge a `main` (Punto d)**<br>Crear suite de pruebas para `LoginView.vue` (renderizado de inputs, botón submit, bloqueo mientras envía, manejo de error y aviso de expiración). Sincronizar e integrar en `main`. | `frontend/src/views/LoginView.test.js` |
| **8** | **Restricción y control de permisos en consultas GET**<br>Verificar exhaustivamente en `SecurityConfig` y `SeguridadTest` que las consultas (`GET /ordenes`, `/ordenes/{n}`, etc.) sean accesibles por cualquier usuario autenticado y respondan 401 sin token. | `backend/src/main/java/ar/edu/iua/iw3/security/SecurityConfig.java`, `SeguridadTest.java` |
| **9** | **Contrato de consultas para pantallas de órdenes de Lean**<br>Asegurar con tests de integración los endpoints requeridos por el frontend de Lean (`/historial-estados`, `/detalle`, `/conciliacion`). | `backend/src/test/java/ar/edu/iua/iw3/controller/SeguridadTest.java` |
| **10** | **Casos límite del login (Punto h)**<br>Agregar `@Size(max = 72)` a la contraseña y `@Size(max = 50)` al usuario en `LoginRequest` para rechazar con 400 Bad Request solicitudes con sobrecarga de caracteres antes de invocar a BCrypt. | `backend/src/main/java/ar/edu/iua/iw3/dto/LoginRequest.java`, tests de seguridad |
| **11** | **Ampliación de la colección de Postman**<br>Agregar a `postman/IW3-ordenes-de-carga.postman_collection.json` las peticiones de prueba para cisternas duplicadas, textos > 255 caracteres, contraseñas > 72 bytes, tokens inválidos y roles. | `postman/IW3-ordenes-de-carga.postman_collection.json` |
| **12** | **Revisión de calidad y documentación de decisiones**<br>Limpieza de código de seguridad, verificación de no regresión y registro de decisiones nuevas de seguridad (50–59) en `docs/decisiones.md`. | `docs/decisiones.md`, archivos de seguridad |
| **13** | **Actualización de documentación de la parte de Fran**<br>Completar sección "Trabajo de noviembre" en `docs/partes/fran.md` con cantidades reales de tests y guía de pruebas manuales; coordinar con Lean para el README. | `docs/partes/fran.md`, `docs/plan-fran.md` |
| **14** | **Merge final a `main` y guía de defensa oral**<br>Integración definitiva en `main`, verificación de checklist de entrega (sin secretos en repo, roles validados) y redacción de `docs/defensa-fran.md`. | `docs/defensa-fran.md` |

---

## 4. Comandos de verificación continua

```powershell
# Backend (raíz backend/)
.\mvnw.cmd test

# Frontend (raíz frontend/)
npm test
npm run build

# Verificación de git antes de commits
git status -sb
git diff --stat
```
