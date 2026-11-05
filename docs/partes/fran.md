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

## Trabajo de noviembre

Durante las jornadas de trabajo de noviembre se identificaron, corrigieron y probaron las siguientes mejoras de seguridad y validaciones:

### 1. Desactivación del usuario en memoria autogenerado por Spring Security
- **Problema:** Al no declarar un `UserDetailsService` explícito, Spring Boot autoconfiguraba un usuario en memoria (`UserDetailsServiceAutoConfiguration`) con una contraseña aleatoria en cada arranque y ejecución de tests (`Using generated security password`).
- **Solución:** Se excluyó dicha clase en `@SpringBootApplication(exclude = { UserDetailsServiceAutoConfiguration.class })` dentro de `Iw3BackendApplication.java`. El login propio de `AuthService` ya valida contra base con BCrypt y emite JWT.
- **Archivos:** `backend/src/main/java/ar/edu/iua/iw3/Iw3BackendApplication.java`.

### 2. Validación de `JWT_SECRET` y alerta de clave por defecto
- **Problema:** Un secreto menor a 32 bytes lanzaba excepciones crípticas de JJWT (`WeakKeyException`) sin indicar cómo solucionarlo, y el uso del secreto por defecto en el repositorio público podía pasar inadvertido.
- **Solución:** Se validó en `JwtService` que la longitud sea ≥ 32 caracteres (256 bits para HS256) lanzando `IllegalStateException` con un mensaje claro en español. Se añadió detección del secreto de desarrollo emitiendo un `WARN` visible sin interrumpir el arranque.
- **Archivos:** `backend/src/main/java/ar/edu/iua/iw3/security/JwtService.java`.
- **Tests nuevos:** `backend/src/test/java/ar/edu/iua/iw3/security/JwtServiceTest.java` (6 tests).

### 3. Validaciones en el alta de orden SAP (cisternas y textos)
- **Problema:** El alta de orden aceptaba camiones con números de cisterna duplicados, y textos de más de 255 caracteres provocaban `DataIntegrityViolationException` de Hibernate que se traducía erróneamente como 409 Conflict.
- **Solución:** Se incorporó validación `@AssertTrue` en `CamionDto` para impedir cisternas repetidas y anotaciones `@Size(max = 255)` en los campos abiertos de `ChoferDto`, `ClienteDto`, `ProductoDto` y `CamionDto`. Ambos casos responden de forma homogénea con `400 Bad Request`.
- **Archivos:** `CamionDto.java`, `ChoferDto.java`, `ClienteDto.java`, `ProductoDto.java`.
- **Tests nuevos:** `backend/src/test/java/ar/edu/iua/iw3/controller/ValidacionOrdenTest.java` (3 tests).

### 4. Aviso de sesión vencida y descarte de token expirado en frontend
- **Problema:** Al vencer el token JWT, el usuario era redirigido a `/login` sin explicación. Si volvía a abrir la página con un token vencido en `localStorage`, la app montaba las pantallas vacías hasta que el primer fetch fallaba.
- **Solución:** En `api()` (`http.js`), ante una respuesta 401 de una sesión activa se invoca `auth.logout(true)`, fijando el mensaje `"Tu sesión venció, ingresá de nuevo"` en `LoginView.vue`. Además, `leerSesion()` (`auth.js`) decodifica el campo `exp` del JWT al arrancar: si ya venció o está corrupto, descarta los datos y deja visible el aviso de inmediato.
- **Archivos:** `frontend/src/stores/auth.js`, `frontend/src/api/http.js`, `frontend/src/views/LoginView.vue`.
- **Tests nuevos:** `frontend/src/stores/auth.test.js` (11 tests), `frontend/src/views/LoginView.test.js` (5 tests).

### 5. Límite de BCrypt en contraseña de login
- **Problema:** BCrypt solo considera los primeros 72 bytes de una contraseña. Contraseñas arbitrariamente extensas consumían ciclos de CPU calculando hashes innecesarios.
- **Solución:** Se limitó `LoginRequest.password` a `@Size(max = 72)` y `username` a `@Size(max = 50)`, respondiendo `400 Bad Request` antes de invocar a BCrypt.
- **Archivos:** `backend/src/main/java/ar/edu/iua/iw3/dto/LoginRequest.java`.
- **Tests nuevos:** `loginConPasswordMayorA72CaracteresDa400` en `SeguridadTest.java`.

### 6. Contrato de consultas GET por rol y casos en Postman
- **Problema:** Era necesario garantizar que ningún usuario autenticado reciba `403 Forbidden` al consultar información de órdenes, monitoreo o conciliación (incluso no finalizada), y automatizar estos casos en Postman.
- **Solución:** Se agregaron pruebas de integración en `SeguridadTest.java` verificando `200 OK` en cabecera, historial y mediciones, y `409 Conflict` (no 403) al pedir la conciliación de una orden no finalizada. En la colección de Postman se añadieron las peticiones `00d`, `00e`, `03c` y `03d`.
- **Archivos:** `backend/src/test/java/ar/edu/iua/iw3/controller/SeguridadTest.java`, `postman/IW3-ordenes-de-carga.postman_collection.json`.

---

## Cómo probar cada mejora a mano

Con la aplicación iniciada (`.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=h2"` y `npm run dev`):

```bash
# 1. Login con contraseña mayor a 72 caracteres -> 400 Bad Request
curl -i -X POST http://localhost:8080/api/v1/auth/login -H "Content-Type: application/json" \
     -d "{\"username\":\"admin\",\"password\":\"$(python -c 'print("a"*73)')\"}"

# 2. Token adulterado -> 401 Unauthorized
curl -i http://localhost:8080/api/v1/ordenes -H "Authorization: Bearer token-invalido-o-adulterado"

# 3. Alta con cisternas repetidas -> 400 Bad Request
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login -H "Content-Type: application/json" \
  -d '{"username":"sap","password":"demo1234"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

curl -i -X POST http://localhost:8080/api/v1/ordenes -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"numeroOrden":999901,"camion":{"codigoExterno":"C1","patente":"AB123CD","cisternas":[{"numero":1,"capacidadLitros":10000},{"numero":1,"capacidadLitros":5000}]},"chofer":{"codigoExterno":"CH1","nombre":"Juan","apellido":"Perez","documento":"123"},"cliente":{"codigoExterno":"CL1","razonSocial":"Gas S.A."},"producto":{"codigoExterno":"P1","nombre":"Propano"},"fechaPrevistaCarga":"2026-11-10T08:00:00","preset":20000}'

# 4. Alta con texto mayor a 255 caracteres -> 400 Bad Request
curl -i -X POST http://localhost:8080/api/v1/ordenes -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d "{\"numeroOrden\":999902,\"camion\":{\"codigoExterno\":\"C1\",\"patente\":\"AB123CD\",\"cisternas\":[{\"numero\":1,\"capacidadLitros\":10000}]},\"chofer\":{\"codigoExterno\":\"CH1\",\"nombre\":\"$(python -c 'print("A"*256)')\",\"apellido\":\"Perez\",\"documento\":\"123\"},\"cliente\":{\"codigoExterno\":\"CL1\",\"razonSocial\":\"Gas S.A.\"},\"producto\":{\"codigoExterno\":\"P1\",\"nombre\":\"Propano\"},\"fechaPrevistaCarga\":\"2026-11-10T08:00:00\",\"preset\":20000}"

# 5. Conciliación de orden no finalizada -> 409 Conflict (no 403)
curl -i http://localhost:8080/api/v1/ordenes/999901/conciliacion -H "Authorization: Bearer $TOKEN"
```

**En el navegador:**
- **Sesión vencida:** Configurar `app.seguridad.jwt-expiracion-minutos=1` en `application.properties`. Iniciar sesión en `http://localhost:5173`. Esperar un minuto e intentar cualquier navegación o consulta: la pantalla redirige inmediatamente a `/login` con el mensaje visible *"Tu sesión venció, ingresá de nuevo"*.
- **Cierre voluntario:** Presionar el botón "Salir" en la barra superior: redirige a `/login` sin mostrar ningún aviso de error.

---

## Totales reales de pruebas automatizadas

- **Backend (Spring Boot Test / JUnit 5):** **65 tests ejecutados, 0 fallos, 0 errores, 0 omitidos** (`BUILD SUCCESS`).
- **Frontend (Vitest 5.0.5):** **63 tests pasados en 10 archivos de prueba**.
- **Postman / Newman:** **47 requests ejecutados, 92 aserciones exitosas, 0 fallos**.
