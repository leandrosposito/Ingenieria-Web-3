# Guía de Defensa Oral — Fran (Seguridad, Autenticación y Validaciones)

Documento de preparación para el coloquio de **Ingeniería Web 3** (4.º año de Ingeniería en Informática). Contiene los conceptos teóricos clave, decisiones de diseño, justificaciones arquitectónicas y una guía paso a paso para la demo en vivo ante los docentes.

---

## 1. Responsabilidad en el proyecto

- **Área:** Seguridad, Autenticación, Autorización, Validaciones de entrada y Manejo de sesión en Frontend.
- **Rama:** `fran`.
- **Archivos principales:**
  - Backend: `security/*` (`SecurityConfig`, `JwtService`, `JwtAuthFilter`, `AuthService`, `UsuariosDemo`, `H2ConsoleSecurityConfig`, `UsuarioActual`), `controller/AuthController`, `dto/LoginRequest`, `dto/CamionDto` (y validaciones en `ChoferDto`, `ClienteDto`, `ProductoDto`), `exception/GlobalExceptionHandler`.
  - Frontend: `src/stores/auth.js`, `src/api/http.js`, `src/views/LoginView.vue`, `src/views/LoginView.test.js`, `src/stores/auth.test.js`.
  - Integración: `postman/IW3-ordenes-de-carga.postman_collection.json`.

---

## 2. Conceptos teóricos fundamentales para la defensa

### Autenticación vs. Autorización
- **Autenticación ("¿Quién sos?"):** Proceso de verificar la identidad del cliente. Se realiza en `POST /api/v1/auth/login`, donde `AuthService` comprueba que la contraseña recibida coincida con el hash BCrypt almacenado en la tabla `usuario`. Si coincide, emite un token JWT con la identidad (`subject`) y el `rol`.
- **Autorización ("¿Qué tenés permitido hacer?"):** Proceso de verificar si el usuario autenticado posee los privilegios necesarios para ejecutar una acción sobre un endpoint. Se configura en `SecurityConfig.java` mediante reglas `.requestMatchers()`, comprobando los roles del JWT.

### Cómo viaja y cómo está compuesto el JWT
- Viaja en el header HTTP estándar: `Authorization: Bearer <token>`.
- Estructura compacta en tres partes separadas por puntos (`Header.Payload.Signature`) codificadas en Base64URL:
  1. **Header:** Algoritmo de firma (`{"alg": "HS256", "typ": "JWT"}`).
  2. **Payload (Claims):** Datos no sensibles de la sesión: `sub` (username), `rol` (rol del enum `Rol`), `iat` (fecha de emisión) y `exp` (timestamp de expiración en segundos).
  3. **Signature:** Hash HMAC-SHA256 calculado sobre `Header.Payload` utilizando la clave secreta `JWT_SECRET`. Garantiza integridad: si alguien modifica un carácter del payload, la firma deja de coincidir y el backend rechaza el token con 401.

### Ciclo de vida del filtro `JwtAuthFilter`
- Extiende `OncePerRequestFilter`: se ejecuta exactamente una vez por cada request HTTP que llega al servlet container, antes del `UsernamePasswordAuthenticationFilter`.
- **Flujo interno:**
  1. Lee el header `Authorization`. Si no existe o no empieza con `Bearer `, pasa la solicitud al siguiente filtro de la cadena (si el endpoint requiere autenticación, `SecurityConfig` lo interceptará devolviendo 401).
  2. Extrae la cadena del token y llama a `jwtService.validarToken(token)`.
  3. Si es válido, extrae el usuario y el rol, crea una autoridad `ROLE_<ROL>` y construye un `UsernamePasswordAuthenticationToken`.
  4. Deposita este objeto en el `SecurityContextHolder.getContext().setAuthentication(auth)`.
  5. Desde ese momento, Spring Security y los controladores consideran al usuario como autenticado.

### ¿Por qué CSRF está desactivado?
- **CSRF (Cross-Site Request Forgery)** se aprovecha del comportamiento automático de los navegadores al adjuntar cookies de sesión en peticiones hacia otro dominio.
- En nuestra arquitectura:
  1. La API es completamente **stateless** (`SessionCreationPolicy.STATELESS`): no hay sesiones HTTP ni cookies de sesión en el servidor.
  2. La autenticación se envía en el header personalizado `Authorization: Bearer ...`.
  3. Un sitio web malicioso de terceros no puede adjuntar automáticamente un header personalizado en peticiones cross-origin sin pasar por CORS preflight checks.
  4. Por ende, la protección contra CSRF no aplica y debe desactivarse (`csrf.disable()`).

### BCrypt y el límite de 72 bytes
- **Funcionamiento:** BCrypt es una función de derivación de claves basada en el algoritmo Blowfish. Incluye salt criptográfico aleatorio y costo configurable de iteraciones.
- **Límite técnico:** Blowfish procesa bloques con una clave máxima de 72 bytes. Por diseño, BCrypt **trunca silenciosamente** cualquier contraseña a sus primeros 72 bytes.
- **Riesgo:** Si un atacante envía contraseñas de varios kilobytes, el servidor consume excesivos ciclos de CPU calculando el hash, abriendo la puerta a ataques de Denegación de Servicio (DoS).
- **Nuestra solución:** Se agregó validación Bean Validation `@Size(max = 72)` en `LoginRequest.password`. Si la contraseña excede 72 caracteres, el backend responde de inmediato `400 Bad Request` sin invocar a BCrypt.

### Aviso de sesión vencida y descarte en frontend
- **En tiempo de ejecución:** Si un token expira mientras el usuario navega, la siguiente petición a la API devuelve `401 Unauthorized`. La función centralizada `api()` en `http.js` captura el 401 en presencia de sesión activa, invoca `auth.logout(true)` (activando `avisoSesion = 'Tu sesión venció, ingresá de nuevo'`). El `watch` en `App.vue` detecta que el usuario ya no está logueado y lo redirige a `/login`, donde se muestra el cartel de aviso. Si el usuario hace clic en "Salir", se invoca `auth.logout(false)` y no se muestra ningún cartel.
- **Al iniciar o recargar la app:** `leerSesion()` en `auth.js` decodifica el payload del JWT de `localStorage` utilizando `atob` y base64url. Si el campo `exp` ya caducó (o el token está mal formado), descarta la sesión y levanta el aviso de inmediato, sin esperar a que un pedido de red falle.

---

## 3. Preguntas típicas de examen y cómo responderlas

1. **¿Qué pasa si un usuario altera el payload de su token para ponerse rol ADMIN?**
   > *Al alterar cualquier byte del payload, la firma digital ya no coincide con el hash calculado con `JWT_SECRET`. En `JwtService`, `parser.parseSignedClaims(token)` arroja `SignatureException` y el filtro no autentica al usuario, devolviendo `401 Unauthorized`.*

2. **¿Por qué `JWT_SECRET` debe tener al menos 32 caracteres?**
   > *El algoritmo HS256 requiere una clave simétrica de al menos 256 bits (32 bytes UTF-8). Si se usa una clave menor, el algoritmo es vulnerable a ataques de fuerza bruta. Spring Boot valida esto al inicio; si tiene menos de 32 bytes lanzamos una excepción clara exigiendo corregir la variable.*

3. **¿Por qué excluimos `UserDetailsServiceAutoConfiguration`?**
   > *Spring Security autoconfigura un usuario en memoria con contraseña aleatoria en los logs (`Using generated security password`) si no encuentra un bean `UserDetailsService`. Como nosotros implementamos autenticación propia basada en JWT y base de datos con `AuthService`, ese usuario en memoria es redundante. Excluirlo en `@SpringBootApplication` mantiene el log limpio.*

4. **¿Por qué los endpoints `GET` están permitidos para cualquier usuario logueado?**
   > *Porque la lectura de órdenes, monitoreo y conciliación no muta el estado del sistema, y el enunciado especifica que la conciliación la puede consultar "cualquier cliente". Para endpoints de mutación (`POST`), cada rol tiene restringida su competencia (`SAP` crea, `TMS` pesa, `SISTEMA_CARGA` habilita/carga).*

5. **¿Qué responde `GET /ordenes/{n}/conciliacion` si la orden no está finalizada?**
   > *Responde `409 Conflict` (producido por `OperacionInvalidaException` en el service). Es vital comprobar que responde 409 y **no** 403 Forbidden, demostrando que la seguridad autoriza la consulta y el error es exclusivamente de la regla de negocio.*

---

## 4. Guía práctica para la demostración en vivo (Demo)

Tener levantado el backend (`.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=h2"`):

### Caso 1: Intentar crear una orden con el rol equivocado (TMS) → 403 Forbidden
```bash
# 1. Obtenemos el token de TMS
TOKEN_TMS=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"tms","password":"demo1234"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# 2. Intentamos crear una orden (solo permitido para SAP y ADMIN)
curl -i -X POST http://localhost:8080/api/v1/ordenes \
  -H "Authorization: Bearer $TOKEN_TMS" \
  -H "Content-Type: application/json" \
  -d '{"numeroOrden":1001}'
# Esperado: HTTP/1.1 403 Forbidden con ErrorResponse JSON
```

### Caso 2: Petición sin token → 401 Unauthorized
```bash
curl -i http://localhost:8080/api/v1/ordenes
# Esperado: HTTP/1.1 401 Unauthorized
```

### Caso 3: Petición con token adulterado → 401 Unauthorized
```bash
curl -i http://localhost:8080/api/v1/ordenes \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tokenfalso.invalido"
# Esperado: HTTP/1.1 401 Unauthorized
```

### Caso 4: Login con contraseña mayor a 72 caracteres → 400 Bad Request
```bash
curl -i -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}'
# Esperado: HTTP/1.1 400 Bad Request indicando que no puede superar los 72 caracteres
```

### Caso 5: Validación de cisternas duplicadas en el camión → 400 Bad Request
```bash
TOKEN_SAP=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"sap","password":"demo1234"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

curl -i -X POST http://localhost:8080/api/v1/ordenes \
  -H "Authorization: Bearer $TOKEN_SAP" \
  -H "Content-Type: application/json" \
  -d '{"numeroOrden":9991,"camion":{"codigoExterno":"C1","patente":"AB123CD","cisternas":[{"numero":1,"capacidadLitros":10000},{"numero":1,"capacidadLitros":5000}]},"chofer":{"codigoExterno":"CH1","nombre":"Juan","apellido":"Perez","documento":"123"},"cliente":{"codigoExterno":"CL1","razonSocial":"Gas S.A."},"producto":{"codigoExterno":"P1","nombre":"Propano"},"fechaPrevistaCarga":"2026-11-10T08:00:00","preset":20000}'
# Esperado: HTTP/1.1 400 Bad Request con detalle "No puede haber numeros de cisterna repetidos en el camion"
```

### Caso 6: Validación en frontend (sesión vencida vs. logout manual)
- En el navegador (`http://localhost:5173`), iniciar sesión con `operador` / `demo1234`.
- Al hacer clic en "Salir", la sesión se destruye limpiamente y se muestra la pantalla de Login sin mensajes de error.
- Si el token en `localStorage` tiene un `exp` en el pasado, al recargar la página la aplicación descarta el token automáticamente y muestra: *"Tu sesión venció, ingresá de nuevo"*.
