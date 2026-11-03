# Parte de Fran: seguridad y login

Rama `fran`. Agrega autenticación con JWT, roles por endpoint, auditoría con el usuario real, validaciones de seguridad en DTOs y el frontend con login y manejo de expiración de sesión.

## Qué se implementó

### Backend (`backend/src/main/java/ar/edu/iua/iw3/`)

| Archivo | Qué hace |
|---|---|
| `model/Usuario.java`, `model/Rol.java`, `repository/UsuarioRepository.java` | Usuario (username, hash BCrypt, rol) y los 5 roles. |
| `controller/AuthController.java` | `POST /api/v1/auth/login`: recibe usuario y contraseña, devuelve el token JWT. |
| `dto/LoginRequest.java` | Validación de credenciales: `@Size(max = 50)` en username y `@Size(max = 72)` en password para mitigar vectores de denegación de servicio por el límite de 72 bytes de BCrypt. |
| `security/AuthService.java` | Verifica la contraseña con BCrypt y pide el token. |
| `security/JwtService.java` | Genera y valida tokens JWT (HS256). Valida longitud mínima de 32 caracteres para `JWT_SECRET` al iniciar y emite log `WARN` si se detecta la clave por defecto de desarrollo sin interrumpir entornos locales. |
| `security/JwtAuthFilter.java` | En cada request lee `Authorization: Bearer ...` y deja al usuario autenticado. |
| `security/SecurityConfig.java` | Qué rol puede llamar a cada endpoint, API sin sesión (stateless), respuestas 401/403 en formato JSON estándar. Permite consultas GET a todos los usuarios autenticados. |
| `security/H2ConsoleSecurityConfig.java` | Cadena de seguridad propia para `/h2-console`, **solo con el perfil `h2`**: sin token (la consola tiene su propio login de base), sin CSRF y con `frameOptions` en `sameOrigin` porque la consola se dibuja con frames. Sin el perfil la clase no existe y la consola no está habilitada. |
| `security/UsuariosDemo.java` | Crea un usuario por rol al arrancar si la tabla está vacía. |
| `security/UsuarioActual.java` | Devuelve el nombre del usuario autenticado. |
| `service/OrdenService.java` | `cambiarEstado()` guarda en la auditoría al usuario autenticado. |
| `exception/GlobalExceptionHandler.java` | Manejo global de excepciones: 401 para credenciales inválidas o token vencido, 400 para violaciones de Bean Validation, 403 para accesos prohibidos. |
| `config/OpenApiConfig.java` | Botón **Authorize** en Swagger. |
| `dto/CamionDto.java` | Validación `@AssertTrue` para rechazar números de cisterna repetidos dentro del mismo camión (400 Bad Request). |
| `dto/ChoferDto.java`, `ClienteDto.java`, `ProductoDto.java` | Validación `@Size(max = 255)` en todos los campos de texto abiertos para responder 400 Bad Request antes de llegar a la base de datos. |

### Quién puede qué

| Rol | Endpoints |
|---|---|
| `SAP` | `POST /ordenes` |
| `TMS` | `POST /ordenes/{n}/pesaje-inicial` y `/pesaje-final` |
| `SISTEMA_CARGA` | `POST /ordenes/{n}/habilitar-carga`, `/detalle` y `/cierre` |
| `OPERADOR` | consultas y aceptar alarmas |
| `ADMIN` | todo |
| cualquier usuario logueado | todos los `GET` (consultas, monitoreo y conciliación) |
| sin token | solo `login` y Swagger |

### Usuarios de demo

`sap`, `tms`, `carga`, `operador` y `admin`. Todos con la contraseña de la variable `PASSWORD_DEMO` (por defecto `demo1234`, solo para desarrollo).

### Frontend (`frontend/`)

| Archivo | Qué hace |
|---|---|
| `src/stores/auth.js` | Guarda token, usuario y rol (Pinia + `localStorage`). Decodifica el payload JWT en base64url al iniciar (`leerSesion`); si el token expiró o está corrupto, descarta la sesión y activa el aviso. Acciones `login` y `logout`. |
| `src/api/http.js` | Función `api()` que agrega el header `Authorization`. Si el backend responde 401, expira la sesión y registra `avisoSesion`. |
| `src/api/errores.js` | Convierte la respuesta de error del backend en un `Error` con su mensaje amigable. |
| `src/router/index.js` | Rutas y *guard*: sin sesión redirige a `/login` preservando `redirect`. |
| `src/views/LoginView.vue` | Formulario de login: deshabilita el botón mientras envía, muestra errores de autenticación y cartel `"Tu sesión venció, ingresá de nuevo"`. |
| `src/views/LoginView.test.js` | 5 tests de componente para `LoginView.vue`. |
| `src/stores/auth.test.js` | 11 tests unitarios para el store, manejo de tokens expirados, `api()` y guard de navegación. |
| `src/App.vue` | Barra superior con el usuario logueado, rol y botón Salir. |

---

## Resultados de pruebas funcionales y de seguridad (Día 8)

### 1. Tests automáticos

- **Backend (Maven / JDK 21.0.7):**
  - Comando: `cd backend; .\mvnw.cmd test`
  - Resultado: **57 tests ejecutados, 0 fallos, 0 errores, 0 omitidos** (`BUILD SUCCESS`).
  - Cobertura de seguridad y validaciones:
    - `SeguridadTest` (9 tests): login exitoso, login inválido, usuario requerido, password > 72 caracteres rechazado con 400 Bad Request, consulta sin token da 401, endpoints protegidos dan 403 con rol incorrecto, consultas GET permitidas a los 5 roles.
    - `JwtServiceTest` (6 tests): generación de claims y roles, verificación de token adulterado, token expirado, firma inválida, validación de secreto menor a 32 bytes y alerta de clave por defecto.
    - `ValidacionOrdenTest` (3 tests): validación de cisternas duplicadas (400), nombres mayores a 255 caracteres (400) y longitud válida (201).
    - `Iw3BackendApplicationTests` (1 test): verificación de arranque limpio sin el warning `Using generated security password`.
    - Resto de la suite (38 tests): flujo completo de orden, alarmas, monitoreo, pesajes y conciliación.

- **Frontend (Node v24.14.1 / Vitest 5.0.5):**
  - Comando: `cd frontend; npm test`
  - Resultado: **45 tests pasados en 8 suites de prueba**.
    - `LoginView.test.js`: 5 tests.
    - `auth.test.js`: 11 tests.
    - `OrdenesView.test.js`: 11 tests.
    - `OrdenDetalleView.test.js`: 6 tests.
    - `ConciliacionesView.test.js`: 2 tests.
    - `AlarmasView.test.js`: 2 tests.
    - `EstadoBadge.test.js`: 3 tests.
    - `formato.test.js`: 5 tests.
  - Compilación de producción: `npm run build` genera `dist/` sin errores de tipos ni advertencias.

### 2. Pruebas de integración con Newman / Postman

- Colección: `postman/IW3-ordenes-de-carga.postman_collection.json`
- Comando: `npx newman run postman/IW3-ordenes-de-carga.postman_collection.json`
- Resultado: **47 requests ejecutados, 92 aserciones exitosas, 0 fallos**.
- Casos específicos verificados:
  - `00d [Auth] Consulta con token alterado (401)`: respuesta 401 Unauthorized y cuerpo con `ErrorResponse`.
  - `00e [Auth] Login con password mayor a 72 caracteres (400)`: respuesta 400 Bad Request con detalle explicativo del límite.
  - `03c [SAP] Crear orden con cisternas repetidas (400)`: respuesta 400 Bad Request con mensaje indicando números de cisterna duplicados.
  - `03d [SAP] Crear orden con texto mayor a 255 caracteres (400)`: respuesta 400 Bad Request por Bean Validation antes de llegar a la base de datos.
  - Circuito completo de la orden de carga: estados 1 a 4, pesajes inicial y final, monitoreo, alarmas y conciliación.

### 3. Pruebas funcionales manuales y verificación de seguridad

1. **Aviso de sesión vencida:**
   - Al configurar `app.seguridad.jwt-expiracion-minutos=1`, tras un minuto de inactividad cualquier llamada de red recibe 401; la aplicación redirige al login mostrando: *"Tu sesión venció, ingresá de nuevo"*.
   - Al cerrar sesión manualmente mediante el botón "Salir", se vuelve a `/login` de forma limpia sin mostrar el aviso de vencimiento.
   - Si un usuario abre la aplicación con un token expirado guardado en `localStorage`, la función `leerSesion` lo decodifica sin peticiones al servidor, limpia el almacenamiento y exhibe el aviso.
2. **Control de credenciales y repositorio limpio:**
   - Verificación ejecutada: `git ls-files | Select-String -Pattern "\.env"`. Únicamente se encuentran versionadas las plantillas `.env.example` y `backend/.env.example`. No existen archivos `.env` reales ni credenciales productivas en el repositorio.
3. **Manejo del usuario por defecto de Spring Security:**
   - La exclusión de `UserDetailsServiceAutoConfiguration` en `Iw3BackendApplication.java` garantiza que el backend no cree usuarios aleatorios en memoria al arrancar ni emita logs innecesarios.
