# Decisiones de diseño e interpretación del enunciado

Lo que decidimos y por qué. Cualquiera del grupo tiene que poder defenderlo en el coloquio.

## 1. Interpretaciones de partes ambiguas del enunciado

| # | Ambigüedad | Qué hicimos | Por qué |
|---|---|---|---|
| 1 | ¿Quién genera la contraseña de activación? La tabla de estados dice "desde el sistema TMS", pero el diagrama la ubica en el backend. | La genera el **backend** (entero aleatorio de 10000 a 99999, con `SecureRandom`) y la devuelve en la respuesta del pesaje inicial. | El backend es el que después la valida en la habilitación, así que tiene que conocerla. Coincide con el diagrama ("Se genera la password de activación"). |
| 2 | ¿En qué estado se carga? El anexo dice "estado 2: en proceso de carga", pero el diagrama de secuencia pone la carga junto al estado 3. | Los datos de carga solo se aceptan en **estado 2**. El cierre pasa la orden a 3 y desde ahí se rechazan (409). | El punto 4 dice que el cierre "bloquea la recepción de nuevos datos de detalle", así que la carga tiene que ocurrir antes, en el estado 2. |
| 3 | Número de orden: el punto 1 dice que los códigos externos son `string`, y el anexo dice que el número de orden es un "identificador único (entero)". | `numeroOrden` es un `Long` único y funciona como código externo de la orden. Camión, chofer, cliente y producto usan `codigoExterno` de tipo `String`. | Respeta las dos partes del enunciado. El punto 3 llama al número de orden "código externo". |
| 4 | Densidad fuera de rango. El enunciado dice que vale entre 0 y 1, pero no la incluye en los criterios de descarte. | Se **descarta** el dato si la densidad no está en (0, 1]. | Un dato fuera del rango definido no es un "valor válido", y la cabecera solo guarda valores válidos. Si la cátedra lo interpreta distinto, se cambia en una sola línea de `ReglasDetalleCarga`. |
| 5 | Masa igual a la anterior. | Se **acepta**. | El enunciado descarta solo la masa "menor que el valor anterior". Una masa igual puede pasar si la bomba no avanzó entre dos lecturas. |
| 6 | ¿Cómo se responde un dato descartado? | `200 OK` con `aceptado: false` y `motivoDescarte`. | El request está bien formado; el dato simplemente no cumple las reglas. El sistema de carga manda datos todo el tiempo y no debería tratar esto como un error. Si faltan campos, sí es un error del request: 400. |
| 7 | ¿Se valida la contraseña en cada dato de carga? | No, solo en la habilitación (3.1). Cada dato se valida contra el estado de la orden. | En el diagrama, el paso 3.3 solo envía los datos de carga. |
| 8 | ¿Pesaje final menor que la tara? | No se rechaza; solo se exige que sea positivo. | El enunciado no lo pide. Una diferencia rara queda visible en la conciliación, que es justamente para eso. |
| 9 | "Usuario o proceso" en la auditoría. | Se registra el sistema que hizo el cambio: `SAP`, `TMS` o `SISTEMA_CARGA`. | En el parcial no hay login. En el final, con seguridad, pasa a ser el usuario autenticado. |
| 10 | ¿Qué pasa si SAP manda un camión (o chofer, cliente, producto) que ya existe? | Upsert por `codigoExterno`: si existe se actualizan sus datos (incluido el cisternado), si no se crea. | "Sincronizar" implica mantener nuestros datos iguales a los de SAP. Ojo: como es la misma entidad, el cambio se ve en todas las órdenes que la usan. |
| 11 | ¿Se puede cerrar una orden sin datos de carga? | Sí. En ese caso, el producto cargado de la conciliación es 0 y los promedios son `null`. | El enunciado no lo prohíbe, y una carga puede abortarse. |
| 12 | Inicio y fin de carga. | Inicio = momento del primer dato **válido** recibido. Fin = momento del último dato válido recibido. | Es lo que dice el anexo. Usamos los datos recibidos, no solo los almacenados. |

## 2. Decisiones de diseño

- **Endpoints por evento, no PATCH del estado.** Cada transición es un `POST` a un sub-recurso (`/pesaje-inicial`, `/cierre`, etc.). Son eventos con efectos secundarios (generar la contraseña, calcular la conciliación), y así nadie puede saltearse las reglas mandando `{ "estado": 4 }`.
- **`numeroOrden` en la URL, no el `id` interno.** Los sistemas externos solo conocen el número de orden. Los IDs internos nunca salen de la API.
- **Un único lugar donde cambia el estado.** `OrdenService.cambiarEstado()` valida la transición con `EstadoOrden.puedePasarA()` (solo al estado siguiente) y guarda el registro de auditoría. Todo ocurre dentro de la transacción del método que lo llama: si falla la auditoría, el estado no cambia.
- **Concurrencia.** Las operaciones que modifican una orden la leen con `SELECT ... FOR UPDATE` (`@Lock(PESSIMISTIC_WRITE)`). Si llegan dos datos de carga a la vez, o un dato y el cierre, se procesan de a uno. Así no se pisa la "última masa" ni entra un dato después del cierre.
- **La conciliación no se persiste.** Se calcula a partir de datos que ya están en la base (los promedios con `AVG` en la query), así nunca queda desactualizada.
- **Frecuencia de almacenamiento.** La cabecera se actualiza con cada dato válido. Un registro de detalle se guarda si pasaron al menos N segundos desde el último guardado (N configurable; 0 = guardar todos). La regla es una función pura (`ReglasAlmacenamiento`), testeada con horas fijas.
- **DTOs como `record` y mapper manual.** Queda explícito qué se expone (por ejemplo, la contraseña solo sale en la respuesta del pesaje inicial). Para pocas clases no justifica sumar una librería de mapeo.
- **Errores.** Un único `@RestControllerAdvice` traduce las excepciones a 400/401/404/409 con el mismo formato JSON.
- **Perfiles.** MySQL por defecto (las credenciales salen de variables de entorno o de un `.env` que no se sube). El perfil `h2` y los tests usan H2 en memoria, así se puede probar sin instalar nada.

## 3. Seguridad y login (parte de Fran)

| # | Decisión | Por qué |
|---|---|---|
| 13 | **Un solo rol por usuario** (`Usuario.rol`, enum con SAP, TMS, SISTEMA_CARGA, OPERADOR, ADMIN). | Cada integración hace una sola cosa. Varios roles por usuario obligarían a una tabla intermedia sin ningún beneficio acá. |
| 14 | **JWT con la librería jjwt**, firmado con HS256 y con vencimiento configurable (120 min por defecto). | Es la opción más directa y fácil de explicar: generar y validar un token son 2 métodos. No hay refresh token: al vencer, se vuelve a loguear. |
| 15 | **Los `GET` los puede usar cualquier usuario logueado.** | El enunciado dice que la conciliación la consulta "cualquier cliente", y las consultas no modifican nada. Los `POST` sí se restringen por rol (ADMIN puede todo). |
| 16 | **La auditoría guarda el username** (`sap`, `tms`, `carga`...), ya no el nombre del sistema. | Cierra el punto 9 de la sección 1: en el final el "usuario o proceso" es el usuario autenticado. |
| 17 | **Usuarios de demo creados al arrancar** con la contraseña de `PASSWORD_DEMO` (por defecto `demo1234`, solo desarrollo). | Los equipos necesitan poder entrar sin cargar datos a mano, y la contraseña no queda fija en el código. No hay ABM de usuarios porque el enunciado no lo pide. |
| 18 | **El token se guarda en `localStorage`** y se manda en el header `Authorization`. | Es lo más simple de implementar y explicar. El riesgo (XSS) se mitiga con tokens de vida corta. |
| 19 | **Los 401/403 los arma `SecurityConfig` con el mismo JSON** que `GlobalExceptionHandler`. | Esos errores ocurren en los filtros, antes de llegar a un controller, por eso el `@RestControllerAdvice` no los ve. |
| 39 | **La consola de H2 (`/h2-console`) solo existe con el perfil `h2`**: la habilita `application-h2.properties` y su seguridad (`H2ConsoleSecurityConfig`, `@Profile("h2")`) la deja pasar sin token, sin CSRF y con `frameOptions` en `sameOrigin`. Sin el perfil, queda cerrada (401 sin token, 404 con token). | Antes el perfil `h2` la habilitaba pero la cadena de seguridad la bloqueaba (pedía JWT y prohibía los frames), así que no se podía usar. Abrirla sin autenticación es aceptable solo para la base en memoria de desarrollo; en un servidor sería acceso directo a la base. La API sigue protegida igual. |

| 50 | **Exclusión de `UserDetailsServiceAutoConfiguration` en `Iw3BackendApplication`.** | Spring Boot autoconfigura un usuario en memoria con contraseña aleatoria en los logs (`Using generated security password`) al no detectar un `UserDetailsService` explícito. Como el login propio de `AuthService` valida contra base con BCrypt y emite JWT, excluir esa autoconfiguración evita crear un usuario innecesario y limpia los logs de arranque y tests. |
| 51 | **Validación de longitud mínima de `JWT_SECRET` (≥ 32 bytes) y advertencia para el secreto por defecto.** | HS256 requiere al menos 256 bits (32 caracteres UTF-8). Si es menor, se lanza `IllegalStateException` con un mensaje claro que indica la variable a configurar; si coincide con el valor de desarrollo, se emite un `WARN` sin impedir el arranque para no romper entornos locales ni `docker compose up` sin `.env`. |
| 52 | **Validación de unicidad de cisternas por camión (`@AssertTrue` en `CamionDto`).** | Una orden no debe admitir camiones con números de cisterna duplicados. Validarlo con Bean Validation en el DTO responde de forma estándar con `400 Bad Request` antes de alcanzar la capa de persistencia. |
| 53 | **Largo máximo `@Size(max = 255)` en campos abiertos del alta de orden (`ChoferDto`, `ClienteDto`, `ProductoDto`, `CamionDto`).** | Las columnas en base de datos son de 255 caracteres. Sin Bean Validation, cadenas mayores a 255 provocan `DataIntegrityViolationException` (que se traducía erróneamente a 409 Conflict). Con `@Size(max = 255)` la respuesta es `400 Bad Request` con el detalle de los campos inválidos. |
| 54 | **Límite de longitud de contraseña en el login (`@Size(max = 72)` en `LoginRequest`).** | El algoritmo BCrypt trunca silenciosamente las contraseñas a 72 bytes. Aceptar contraseñas arbitrariamente largas ignora los bytes extra y consume tiempo innecesario de CPU calculando hashes extensos (vector DoS). Se rechaza con `400 Bad Request` antes de invocar a BCrypt. |
| 55 | **Aviso de sesión expirada y descarte proactivo de token en frontend (`leerSesion` y 401 en `api()`).** | Distingue un logout voluntario (sin aviso) de una expiración real (con aviso "Tu sesión venció, ingresá de nuevo"). Al recargar la aplicación, `leerSesion` decodifica el campo `exp` del JWT: si expiró o está corrupto, descarta la sesión de `localStorage` y muestra el aviso de inmediato, sin esperar al primer request fallido al backend. |

## 4. Monitoreo y alarmas (parte de Fabri)

| # | Decisión | Por qué |
|---|---|---|
| 20 | **ETA y tiempo transcurrido solo para órdenes en estado 2.** Sin caudal válido (nulo o ≤ 0), el ETA es `null`. Si la masa ya alcanzó el preset, el ETA es 0. | El enunciado pide el tiempo "solo para estado 2" y el ETA es el tiempo que falta para llenar: no tiene sentido en una orden cerrada o sin cargar. `null` evita dividir por cero. |
| 21 | **Los valores derivados se calculan al consultar**, no se guardan. | Se deducen de datos que ya están en la cabecera de la orden, así nunca quedan desactualizados. |
| 22 | **Filtros (estado, patente) y orden se resuelven en el backend**, con una lista blanca de columnas. | El frontend no baja lo que no muestra y no se arma un `ORDER BY` con texto del cliente. |
| 23 | **Actualización automática por polling cada 5 s** (no WebSockets ni SSE). | Alcanza para "se actualiza sola", mantiene la API REST común y es lo más fácil de explicar. |
| 24 | **Umbral y destinatarios se guardan en la base y los edita el `ADMIN`** (tabla `configuracion_alarma`, una sola fila; `GET` y `PUT /api/v1/alarmas/configuracion` y formulario en la pantalla de alarmas). Las variables `ALARMA_TEMPERATURA_UMBRAL` y `ALARMA_DESTINATARIOS` son solo el valor inicial, cuando la tabla está vacía. | Con variables de entorno había que reiniciar el backend. Ahora el cambio rige en el próximo dato porque la configuración se lee en cada evaluación. Validación: umbral entre -50 y 200 y de 1 a 10 mails válidos; se guarda quién y cuándo la cambió. La alarma guarda el umbral con el que se disparó. |
| 25 | **Alarma = dato válido con `temperatura > umbral`**. Un dato descartado no alarma. El umbral usado queda guardado en la alarma. | La cabecera solo guarda datos válidos. Guardar el umbral permite auditar la alarma aunque después cambie la configuración. |
| 26 | **Una sola alarma pendiente por orden.** Mientras exista, no se crean más ni se mandan más mails; después de aceptarla, un nuevo dato sobre el umbral vuelve a alarmar. | Es la regla "no se vuelve a enviar hasta que un usuario autorizado la acepte". |
| 27 | **El mail se manda después del commit** (`@TransactionalEventListener`) y **si falla solo se registra en el log**. | No debe salir un mail de una alarma que no se guardó, y un SMTP caído no debe impedir recibir los datos de carga. La alarma queda visible en la pantalla igualmente. |
| 28 | **Aceptar una alarma: solo `OPERADOR` y `ADMIN`.** La observación es opcional; el usuario sale del token y la fecha/hora del servidor. | "Usuario autorizado" del enunciado. Tomar el usuario del token evita aceptar a nombre de otro. |
| 37 | **Las consultas de monitoreo y del listado de órdenes usan `join fetch`** de camión, chofer, cliente y producto, y las cisternas se traen con `@BatchSize(50)`. | Evita el problema N+1: sin el `join fetch`, 4 órdenes hacían 12 consultas en el monitoreo y 9 en el listado, y crecía con cada orden. Ahora son 1 en el monitoreo y como máximo 2 en el listado, sin importar cuántas órdenes haya. |
| 38 | **El mail de la alarma se manda con `@Async`** (más `@EnableAsync`), después del commit. | El SMTP puede ser lento y el sistema de carga manda datos todo el tiempo: no debe esperar al mail para recibir su respuesta. Complementa el punto 27 (si el mail falla solo se registra en el log). |

## 5. Conciliaciones, despliegue y Postman (parte de Lean)

| # | Decisión | Por qué |
|---|---|---|
| 29 | **La pantalla de conciliaciones usa los endpoints del parcial** (`GET /ordenes?estado=FINALIZADA` y `GET /ordenes/{n}/conciliacion`); no se agregó nada al backend. | Ya hacían exactamente lo que necesita la pantalla. Menos piezas, menos para explicar. |
| 30 | **Sin refresco automático en conciliaciones** (solo un botón "Actualizar lista"). | Una orden finalizada no cambia, a diferencia del monitoreo. |
| 31 | **Docker Compose con 4 servicios** (MySQL, backend, frontend con nginx, Mailpit) y **Dockerfiles de dos etapas**. | Un solo comando levanta todo; la imagen final no lleva las herramientas de compilación. |
| 32 | **nginx del frontend reenvía `/api` al backend**, y el frontend llama siempre a rutas relativas. | Igual que el proxy de Vite en desarrollo. El navegador habla con un único origen y no hace falta configurar CORS. |
| 33 | **Solo se publican los puertos 3000 (web), 8080 (API/Swagger) y 8025 (Mailpit).** MySQL queda interno. | Evita choques con un MySQL local en el 3306 y no expone la base. |
| 34 | **Valores por defecto de desarrollo en el compose** (`${VAR:-valor}`); para cambiarlos se usa un `.env` que no se sube (hay un `.env.example`). | El proyecto arranca sin configurar nada (útil para el coloquio), sin dejar secretos reales en el repo. |
| 35 | **Postman: un login por usuario de demo y cada request con el token de su rol** (`tokenSap`, `tokenTms`, `tokenCarga`, `tokenOperador`, `tokenAdmin`). Incluye un 403 (`tms` intentando crear una orden), el flujo de alarmas (dato sobre el umbral, alarma pendiente, aceptarla con `operador`, aceptarla de nuevo da 409) y la verificación de que el historial guarda `sap`, `tms`, `carga`, `tms`. | Con un solo `admin` la colección no probaba la seguridad: nada fallaba aunque los permisos estuvieran mal. El dato de alarma usa 200 °C para disparar cualquier umbral sin depender de la configuración vigente. |
| 36 | **La regla "guardar o no este dato" es una función pura** (`ReglasAlmacenamiento.debeAlmacenar(ultimoGuardado, ahora, frecuencia)`), separada de `CargaService`. | Se puede testear con horas fijas, sin base ni reloj: con frecuencia de 10 s y un dato por segundo durante 60 s se guardan 6, como en el ejemplo del enunciado (`ReglasAlmacenamientoTest`). `CargaService` solo busca la fecha del último detalle guardado y le pregunta a la regla. |

## 6. Sección Órdenes del frontend (parte de Lean)

| # | Decisión | Por qué |
|---|---|---|
| 40 | **El buscador valida en el frontend** que sea un entero mayor a 0 y el `<form>` lleva `novalidate`. | Sin `novalidate`, el navegador mostraba su propio mensaje y no el nuestro. Así el texto del error es siempre el mismo y no se consulta a la API con basura (`abc`, `-3`, `1.5`). |
| 41 | **El listado de órdenes no se actualiza solo**: tiene un botón "Actualizar lista". | Las órdenes del listado no cambian cada segundo. El polling se usa solo en Monitoreo, donde sí hay datos en tiempo real (decisión 23). |
| 42 | **El filtro por estado se manda al backend** con `URLSearchParams` (`/api/v1/ordenes?estado=...`). | El backend ya filtra (decisión 22). `URLSearchParams` arma y codifica la query sin concatenar texto a mano, y sin filtro no agrega el parámetro. |
| 43 | **El detalle hace tres consultas independientes** (orden, historial y mediciones), cada una con su propio mensaje de error. Historial y mediciones solo se piden si la cabecera cargó. | Si falla una parte, las otras se siguen viendo. Si la orden no existe (404), no tiene sentido pedir lo demás. |
| 44 | **Orden inexistente (404): se muestra el mensaje que devuelve la API** y el botón "← Volver al listado". | El backend ya responde con un JSON de error claro (decisión 19); el frontend solo lo muestra, sin duplicar textos. |
| 45 | **`EstadoBadge` es un componente con una prop** (`estado`) y la lista de estados y sus textos está en un solo archivo (`utils/estados.js`). | El mismo estado se ve igual en listado, detalle e historial, y si cambia un texto se cambia en un solo lugar. |
| 46 | **Los números y fechas se muestran con `formatearNumero` y `formatearFechaHora`**; si falta el dato se muestra `-`. | Una orden recién creada no tiene pesajes ni mediciones: así no aparece `null` ni `NaN` en pantalla. |
| 47 | **Tablas responsive con un contenedor `.tabla-scroll`** (`overflow-x: auto`) en vez de rehacer las tablas como tarjetas. | Es una regla de CSS y una etiqueta `div`; no cambia la estructura de las tablas ni los tests, y se explica en una frase. |
| 48 | **Unidades fijas en pantalla:** kg (masa y pesajes), °C, kg/h y L. | Es lo que usa el enunciado y lo que devuelve la API; el operador no tiene que adivinar la unidad. |
| 49 | **El detalle lee el número de la URL una sola vez** (`route.params.numero`) y la pantalla se llega siempre desde el listado, el buscador o Conciliaciones. | Alcanza para esos recorridos (cada uno abre la pantalla de cero) y evita código extra. Si algún día se pudiera ir de una orden a otra sin salir de la pantalla, habría que mirar el cambio de parámetro con `watch`. |

