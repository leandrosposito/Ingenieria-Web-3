# Plan de trabajo y prompts diarios — Ingeniería Web 3

Guía de las dos semanas de mejoras sobre el proyecto importado desde `Ing-Web-3` (estado del 20/10/2026, commit `b373f65`). El proyecto ya cumple todos los requisitos del parcial y del final: estas jornadas **no rehacen** lo que existe, agregan mejoras reales.

Estado verificado antes de escribir esta guía (22/10/2026): backend **46 tests, 0 fallos** (Maven en Docker, `EXIT=0`); frontend **16 tests, 4 archivos, todos pasan** y `npm run build` compila.

## Cómo utilizar esta guía

1. **Cada uno trabaja solo en su rama** (`lean`, `fran`, `fabri`) y **desde su propia PC y cuenta de GitHub**, así los commits quedan a nombre de quien hizo el trabajo. `main` solo recibe lo que está probado.
2. **Un día de la guía = una jornada real.** No adelantar días ni correr varios prompts juntos.
3. Copiá **tu** prompt del día y pegalo en Claude Code abierto en la raíz del repo. Cada prompt empieza verificando que lo de los días anteriores esté hecho; si algo falta, Claude se detiene y te avisa.
4. **Clonar el repo fuera de OneDrive/Dropbox.** En carpetas sincronizadas, Vitest se cuelga ("Timeout waiting for worker to respond").
5. Antes del primer día: `git config user.name "Tu Nombre"` y `git config user.email "tu@mail"` con **tus** datos. Lean tiene que agregar a Fran y Fabri como colaboradores (GitHub → Settings → Collaborators).
6. Si un prompt choca con lo que encontrás en el código (por ejemplo, la tarea ya está hecha o el problema no existe), **gana el código**: Claude tiene que verificarlo, decirlo y proponer qué hacer, no forzar la tarea.

Comandos de prueba (los usan todos los prompts):

| Qué | Comando |
|---|---|
| Frontend | `cd frontend && npm ci && npm test && npm run build` (`npm ci` solo la primera vez o si cambió `package-lock.json`) |
| Backend (con JDK 21) | `cd backend && ./mvnw test` (Windows: `.\mvnw.cmd test`) |
| Backend (sin JDK, con Docker) | `docker run --rm -v "<ruta-al-repo>/backend:/app" -v iw3-m2:/root/.m2 -w /app maven:3.9-eclipse-temurin-21 mvn -q -B test` y los totales en `backend/target/surefire-reports/TEST-*.xml` |
| Todo el sistema | `docker compose up --build` → web en http://localhost:3000, Swagger en :8080/swagger-ui.html, Mailpit en :8025 |
| Postman por consola | `npx newman run postman/IW3-ordenes-de-carga.postman_collection.json` (con el sistema levantado) |

## Distribución de responsabilidades

| Integrante | Área | Complejidad | Por qué |
|---|---|---|---|
| **Lean** | Sección **Órdenes** del frontend: listado con filtro y búsqueda, detalle de la orden (cabecera, historial de estados, detalle de carga), componente de estado, mensajes de error y "cargando", link desde Conciliaciones. Documentación y README. | **Baja** | Son pantallas que **leen** endpoints que ya existen (`GET /ordenes`, `/ordenes/{n}`, `/historial-estados`, `/detalle`). No hay lógica de negocio, seguridad ni concurrencia: el flujo es *click → `api()` → mostrar el resultado*. Cada pieza se demuestra en pantalla en segundos. |
| **Fran** | **Seguridad, autenticación y validaciones**: validar el `JWT_SECRET`, sacar el usuario en memoria que Spring crea por defecto, tests de `JwtService` y `LoginView`, aviso de sesión vencida, validaciones del alta de orden (cisternas repetidas, largos de texto), límite de 72 bytes de BCrypt, permisos de las consultas. | Media-alta | Requiere entender Spring Security, JWT, Bean Validation y el manejo de errores. |
| **Fabri** | **Monitoreo, alarmas y pruebas**: tests de `usePolling`, `MonitoreoView` y aceptación de alarmas en el frontend, respuestas desordenadas al filtrar por patente, bloqueo al aceptar una alarma, destinatarios con espacios, polling sin pedidos superpuestos, `openapi.json` actualizado. | Media-alta | Requiere entender concurrencia (bloqueo de fila), eventos y asincronía, y tests con temporizadores falsos. |

### Quién toca qué (para no pisarse)

| Archivo o carpeta | Dueño | Regla |
|---|---|---|
| `frontend/src/views/OrdenesView*`, `OrdenDetalleView*`, `components/EstadoBadge.vue`, `utils/estados.js`, `views/ConciliacionesView*` | Lean | Nadie más los modifica. |
| `frontend/src/router/index.js`, `frontend/src/App.vue` | Lean | Si otro necesita una ruta o un link, se lo pide a Lean. |
| `README.md`, `docs/plan-lean.md`, `docs/prompts-diarios.md` | Lean | Fran y Fabri mandan su texto en `docs/partes/<nombre>.md` y Lean lo integra el Día 13. |
| `backend/.../security/*`, `AuthController`, `dto/*Request.java` (validaciones), `exception/GlobalExceptionHandler.java`, `Iw3BackendApplication.java` | Fran | |
| `frontend/src/stores/auth*`, `api/http.js`, `api/errores.js`, `views/LoginView*` | Fran | Lean y Fabri los **usan** (`api()`), no los cambian. |
| `backend/.../service/Alarma*`, `ConfiguracionAlarma*`, `NotificadorAlarmas`, `Monitoreo*`, `CalculosMonitoreo`, `repository/AlarmaRepository` | Fabri | |
| `frontend/src/views/MonitoreoView*`, `AlarmasView*`, `composables/usePolling*`, `utils/formato*`, `docs/openapi.json` | Fabri | |
| `backend/src/main/resources/application.properties` | Compartido | Fran solo las líneas `app.seguridad.*`; Fabri solo `app.alarma.*` y `spring.mail.*`. |
| `postman/*.json` | Compartido | Solo Fran lo edita el Día 11; nadie más ese día. |
| `docs/decisiones.md` | Compartido | Cada uno solo su sección. Numeración de decisiones nuevas: **Lean 40–49, Fran 50–59, Fabri 60–69**. |
| `docs/partes/<nombre>.md` | Cada uno el suyo | |

**Contratos que no se cambian sin avisar:** las respuestas `OrdenResponse`, `CambioEstadoResponse`, `DetalleCargaResponse`, `MonitoreoOrdenResponse` y `AlarmaResponse` (las usan las pantallas de otros), y la función `api(ruta, { method, body })` de `frontend/src/api/http.js`.

**Dependencias entre ramas:**
- Fabri, Día 9: usa `frontend/src/utils/estados.js` y la ruta `/ordenes/:numero` de Lean. Tienen que estar en `main` (Lean los integra el Día 7). Verificación: `git fetch origin && git show origin/main:frontend/src/utils/estados.js`.
- Fabri, Día 12: regenera `openapi.json` después de que Fran integre sus validaciones (Días 5 y 10).
- Lean, Día 11: prueba sus pantallas con el aviso de sesión vencida de Fran (Día 6) si ya está en `main`; si no, lo anota como pendiente.

**Integración en `main`** (Días 7 y 14; en otros días, solo si la tarea está terminada y probada): primero `git merge origin/main` en tu rama y correr **todos** los tests; después `git checkout main && git pull origin main && git merge --no-ff <rama> -m "merge: <rama> - <resumen>"`; volver a correr los tests sobre `main` y recién ahí `git push origin main`. Orden sugerido: Lean → Fran → Fabri (cada uno avisa al grupo cuando terminó).

---

## Día 1

### Lean

```text
Soy Lean. Trabajamos en el TP de Ingeniería Web 3 (sistema de órdenes de carga de gas licuado:
Spring Boot 4.1 + Java 21, Vue 3 + Vite, MySQL/H2, Docker Compose). Repo local:
C:\Users\leand\Proyectos\Ingenieria-Web-3. Remoto: https://github.com/leandrosposito/Ingenieria-Web-3.git
(público, hoy vacío). El repo original Ing-Web-3 NO se toca.

OBJETIVO DEL DÍA: dejar el repo nuevo publicado con main, lean, fran y fabri sobre una base común,
y mi plan de trabajo en la rama lean.

ANTES DE EMPEZAR (verificá, no supongas):
- git status --short --branch, git branch -a, git remote -v, git log --oneline -5.
- git ls-remote https://github.com/leandrosposito/Ingenieria-Web-3.git (tiene que estar vacío).
- Si algún paso de abajo ya está hecho, no lo repitas: informalo y seguí con el siguiente.

TAREAS:
1. Verificar que lo preparado para commit sea idéntico a main del original:
   git write-tree tiene que dar el mismo hash que
   git -C "C:\Users\leand\OneDrive\Desktop\Facu\Ing Web 3\Ing-Web-3" rev-parse "main^{tree}".
   docs/plan-lean.md y docs/prompts-diarios.md NO van en este commit.
2. Revisar que no haya .env reales ni credenciales en lo preparado (git ls-files, git grep --cached),
   sin mostrar valores.
3. git remote add origin https://github.com/leandrosposito/Ingenieria-Web-3.git
4. Commit de la base en main:
   "chore: importar el proyecto desde Ing-Web-3 (estado de b373f65, 20/10/2026)"
5. git checkout -b lean. Commit de docs/plan-lean.md y docs/prompts-diarios.md:
   "docs: plan de trabajo y prompts diarios del equipo"
6. Integrar lean en main (git checkout main && git merge --no-ff lean -m "merge: lean - plan de trabajo
   y prompts diarios") y crear fran y fabri desde main (git branch fran, git branch fabri).
7. Correr las pruebas (abajo). Si pasan, publicar SIN --force:
   git push -u origin main lean fran fabri
8. Verificar el push: git ls-remote origin y git branch -vv. Las cuatro ramas tienen que existir en el
   remoto, y main, fran y fabri apuntar al mismo commit.

TERMINADO CUANDO: las 4 ramas existen local y remotamente, comparten el commit base, y lean y main
contienen el plan.

PRUEBAS: frontend: cd frontend && npm ci && npm test && npm run build.
Backend: ./mvnw test, o con Docker si no hay JDK 21 (contar los totales en target/surefire-reports).
Informá los números reales; si algo no se pudo correr, decilo.

DIFF Y COMMIT: antes de cada commit mostrame git diff --cached --stat y revisalo.
PUSH: solo después de que pasen las pruebas (paso 7), sin --force, y verificado con git ls-remote origin (paso 8).

RESUMEN FINAL: hashes de los commits, salida de git ls-remote origin, resultado de las pruebas,
y recordame agregar a Fran y Fabri como colaboradores en GitHub.

REGLAS: inspeccioná antes de actuar. No inventes resultados. Nunca push --force, reset --hard ni
rebase sobre ramas publicadas. No afirmes que el push salió bien sin verificarlo. Commit con mi
identidad (git config user.name / user.email). Si algo no coincide con lo esperado, detenete y explicalo.
```

#### Aprendizaje y defensa oral — Día 1

- **Qué hice:** publiqué el proyecto en un repo nuevo con una rama por integrante. El primer commit es una copia exacta del proyecto anterior y lo dice en el mensaje, así el historial no aparenta haber construido desde cero algo que ya existía.
- **Flujo:** `main` = versión estable. `lean`, `fran` y `fabri` salen del mismo commit; cada uno trabaja en la suya y, cuando algo está probado, lo integra en `main` con `merge --no-ff`.
- **Archivos:** `docs/plan-lean.md` (mi plan) y `docs/prompts-diarios.md` (esta guía). `.gitignore` evita subir `.env`, `node_modules/`, `target/` y `dist/`.
- **Preguntas posibles:**
  1. *¿Por qué una rama por integrante?* Para trabajar en paralelo sin romper `main`. Cada uno prueba en su rama y solo integra lo que funciona.
  2. *¿Qué hace `merge --no-ff`?* Crea siempre un commit de merge, aunque se pudiera avanzar directo. Así en el historial se ve qué bloque de trabajo entró y cuándo.
  3. *¿Cómo evitan subir contraseñas?* El `.gitignore` excluye los `.env`; en el repo solo hay `.env.example` con valores de ejemplo, y los reales se pasan por variables de entorno.

### Fran

```text
Soy Fran, integrante de un equipo de 3 de Ingeniería Web 3 (4.º año de Ing. Informática).
Repo: https://github.com/leandrosposito/Ingenieria-Web-3 — trabajo SOLO en la rama `fran`.
Guía del equipo: docs/prompts-diarios.md (sección "Quién toca qué").

El proyecto ya cumple todos los requisitos (Spring Boot 4.1 + Java 21, Vue 3, MySQL/H2, Docker Compose).
Mi área: SEGURIDAD, AUTENTICACIÓN Y VALIDACIONES (docs/partes/fran.md, docs/decisiones.md sección 3).

OBJETIVO DEL DÍA: entorno funcionando, entender mi parte y confirmar con evidencia mi plan de 13 días.

ANTES DE EMPEZAR:
- Clonar FUERA de OneDrive/Dropbox. git config user.name / user.email con MIS datos.
- git fetch origin, git checkout fran, git status -sb, git log --oneline -5 y
  git log --oneline -5 origin/main. Si docs/plan-fran.md ya existe, este día ya se hizo: avisame.

TAREAS:
1. Pruebas de base (abajo). Anotá los números reales.
2. Leer: security/* (SecurityConfig, JwtService, JwtAuthFilter, AuthService, UsuariosDemo,
   H2ConsoleSecurityConfig, UsuarioActual), controller/AuthController, exception/GlobalExceptionHandler,
   dto/OrdenSapRequest y sus DTOs anidados (CamionDto, CisternaDto, ChoferDto, ClienteDto, ProductoDto),
   frontend: stores/auth.js, api/http.js, api/errores.js, views/LoginView.vue, router/index.js.
3. Verificar UNO POR UNO estos posibles problemas (con un test, un curl o leyendo el código) y
   anotar si existe o no:
   a) Al correr los tests aparece "Using generated security password": Spring arma un usuario en memoria
      (UserDetailsServiceAutoConfiguration) que el proyecto no usa.
   b) JWT_SECRET: application.properties y docker-compose.yml traen el mismo valor de desarrollo; con el
      repo público, cualquiera puede firmar tokens si se despliega sin cambiarlo. Ojo: hacer que el
      backend NO arranque con ese valor rompería `docker compose up` sin .env.
   c) Con un JWT_SECRET de menos de 32 caracteres, ¿el error al arrancar es claro?
   d) LoginView.vue no tiene tests (auth.test.js cubre el store, api() y el guard).
   e) Cuando el token vence, api() cierra la sesión y se vuelve al login sin ningún aviso.
   f) El alta de orden acepta cisternas con el mismo número dentro de un camión.
   g) nombre, apellido, documento, razonSocial, contacto y la descripción/nombre del producto no tienen
      @Size: las columnas son de 255. ¿Qué responde la API con 300 caracteres?
   h) Login con una contraseña de más de 72 bytes (límite de BCrypt): ¿qué responde?
4. Escribir docs/plan-fran.md: tabla con cada punto (existe / no existe y la evidencia) y el plan de
   días 2 a 14 según la guía, ajustado a lo encontrado.

TERMINADO CUANDO: tests de base corridos y docs/plan-fran.md con evidencia por punto.
PRUEBAS: backend (./mvnw test o Docker) y frontend (npm ci, npm test, npm run build).
DIFF Y COMMIT: git diff --stat; commit "docs: plan de trabajo de Fran con el análisis de seguridad".
PUSH: git push origin fran; verificá con git log origin/fran -1.
RESUMEN FINAL: qué se verificó, el resultado de cada punto a-h, el commit, las pruebas (ejecutadas y no
ejecutadas) y el push verificado.

REGLAS: inspeccioná antes de actuar; no repitas tareas hechas; no inventes resultados de pruebas; no
toques archivos fuera de la tarea; nunca push --force, reset --hard ni rebase sobre ramas publicadas; no
commitees .env; no afirmes que un push salió bien sin verificarlo; si hay conflictos con trabajo ajeno,
detenete. Código claro para 4.º año, en el estilo del proyecto, comentarios en español solo si aportan,
sin dependencias nuevas sin justificar.
```

### Fabri

```text
Soy Fabri, integrante de un equipo de 3 de Ingeniería Web 3 (4.º año de Ing. Informática).
Repo: https://github.com/leandrosposito/Ingenieria-Web-3 — trabajo SOLO en la rama `fabri`.
Guía del equipo: docs/prompts-diarios.md (sección "Quién toca qué").

El proyecto ya cumple todos los requisitos (Spring Boot 4.1 + Java 21, Vue 3, MySQL/H2, Docker Compose).
Mi área: MONITOREO, ALARMAS Y PRUEBAS (docs/partes/fabri.md, docs/decisiones.md sección 4).

OBJETIVO DEL DÍA: entorno funcionando, entender mi parte y confirmar con evidencia mi plan de 13 días.

ANTES DE EMPEZAR:
- Clonar FUERA de OneDrive/Dropbox. git config user.name / user.email con MIS datos.
- git fetch origin, git checkout fabri, git status -sb, git log --oneline -5 y
  git log --oneline -5 origin/main. Si docs/plan-fabri.md ya existe, este día ya se hizo: avisame.

TAREAS:
1. Pruebas de base (abajo). Anotá los números reales.
2. Leer: service/AlarmaService, ConfiguracionAlarmaService, NotificadorAlarmas, AlarmaCreada,
   MonitoreoService, CalculosMonitoreo, repository/AlarmaRepository y OrdenRepository (buscarParaMonitoreo,
   el @Lock de findByNumeroOrdenParaActualizar), los tests AlarmasTest, MonitoreoTest,
   ConfiguracionAlarmaTest y CalculosMonitoreoTest; frontend: MonitoreoView.vue, AlarmasView.vue (+ test),
   composables/usePolling.js, utils/formato.js.
3. Verificar UNO POR UNO estos posibles problemas y anotar si existe o no, con evidencia:
   a) usePolling.js y MonitoreoView.vue no tienen tests en el frontend.
   b) MonitoreoView: el filtro de patente dispara un pedido por cada tecla (watch sobre filtros). Si las
      respuestas llegan desordenadas, ¿puede quedar en pantalla el resultado de un filtro viejo?
   c) AlarmaService.aceptar: busca con findById, sin bloqueo. Si dos operadores aceptan la misma alarma
      a la vez, ¿pueden responder 200 los dos y el segundo pisar el usuario del primero?
   d) AlarmaService.evaluar arma los destinatarios con split(",") sin trim: el valor inicial de
      ALARMA_DESTINATARIOS "a@x.com, b@y.com" deja un espacio delante del segundo mail
      (actualizar() sí hace trim).
   e) AlarmasView.test.js solo prueba la configuración, no el botón Aceptar.
   f) usePolling: si un pedido tarda más de 5 s, ¿se superponen pedidos?
   g) docs/partes/fabri.md: ¿las cantidades de tests y los nombres de tests citados coinciden con el código?
   Ya está cubierto, no hace falta repetirlo: el fallo del SMTP
   (AlarmasTest.siFallaElMailLaAlarmaIgualQuedaGuardadaYElDatoSeAcepta).
4. Escribir docs/plan-fabri.md: tabla con cada punto (existe / no existe y la evidencia) y el plan de
   días 2 a 14 según la guía, ajustado a lo encontrado.

TERMINADO CUANDO: tests de base corridos y docs/plan-fabri.md con evidencia por punto.
PRUEBAS: backend (./mvnw test o Docker) y frontend (npm ci, npm test, npm run build).
DIFF Y COMMIT: git diff --stat; commit "docs: plan de trabajo de Fabri con el análisis de monitoreo y alarmas".
PUSH: git push origin fabri; verificá con git log origin/fabri -1.
RESUMEN FINAL: qué se verificó, el resultado de cada punto a-g, el commit, las pruebas (ejecutadas y no
ejecutadas) y el push verificado.

REGLAS: inspeccioná antes de actuar; no repitas tareas hechas; no inventes resultados de pruebas; no
toques archivos fuera de la tarea; nunca push --force, reset --hard ni rebase sobre ramas publicadas; no
commitees .env; no afirmes que un push salió bien sin verificarlo; si hay conflictos con trabajo ajeno,
detenete. Código claro para 4.º año, en el estilo del proyecto, comentarios en español solo si aportan,
sin dependencias nuevas sin justificar.
```

---

## Día 2

### Lean

```text
Soy Lean (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `lean`.
Guía: docs/prompts-diarios.md y docs/plan-lean.md. Mis archivos: views/Ordenes*, OrdenDetalleView*,
utils/estados.js, components/EstadoBadge.vue, ConciliacionesView*, router/index.js, App.vue.

OBJETIVO DEL DÍA: una pantalla "Órdenes" que liste todas las órdenes (cualquier estado).

ANTES DE EMPEZAR: git fetch origin; git checkout lean; git status -sb; git log --oneline -8;
git log --oneline -5 origin/main. Verificá que esté el Día 1 (commit "docs: plan de trabajo y prompts
diarios del equipo" y las ramas en el remoto). Si origin/main tiene commits que lean no tiene,
git merge origin/main (si hay conflictos, detenete). Si views/OrdenesView.vue ya existe, avisame.

ARCHIVOS: leer views/ConciliacionesView.vue (es el modelo a seguir: mismo estilo de api(), error y tabla),
api/http.js, utils/formato.js, router/index.js, App.vue y el record OrdenResponse
(backend/.../dto/OrdenResponse.java) para saber qué campos llegan.
Crear frontend/src/views/OrdenesView.vue. Modificar router/index.js (ruta /ordenes) y App.vue (link
"Órdenes" en el menú, entre Monitoreo y Alarmas).

TAREAS:
1. OrdenesView.vue con <script setup>: al montarse llama a api('/api/v1/ordenes') y guarda la lista.
2. Tabla con: Orden (numeroOrden), Estado (estadoNumero · estadoDescripcion), Camión (camion.patente),
   Cliente (cliente.razonSocial), Producto (producto.nombre), Preset (kg, formatearNumero(…, 0)),
   Fecha prevista (formatearFechaHora).
3. Si la lista está vacía: fila "No hay órdenes para mostrar." Si falla: <p class="error"> con e.message.
4. Botón "Actualizar lista" que vuelve a pedir los datos (sin polling: no es una pantalla en tiempo real).
5. NO modificar el backend ni MonitoreoView.

TERMINADO CUANDO: logueado, el menú muestra "Órdenes", /ordenes lista las órdenes y sin backend
se ve el mensaje de error.
PRUEBAS: cd frontend && npm test && npm run build (los 16 tests anteriores tienen que seguir pasando).
Si podés, probalo a mano: backend con perfil h2 + npm run dev, crear una orden con Postman (request 01)
y verla en /ordenes. Si no lo probás a mano, decilo.
DIFF Y COMMIT: git diff y git status; revisá que no haya cambios fuera de esos 3 archivos.
Commit: "feat: pantalla de listado de órdenes".
PUSH: git push origin lean; verificá con git log origin/lean -1.
RESUMEN FINAL: qué se hizo, archivos, hash del commit, pruebas (números reales), push verificado, pendientes.

REGLAS: inspeccioná antes de actuar; no repitas tareas hechas; no inventes resultados; no toques archivos
fuera de la tarea sin justificarlo; nunca push --force, reset --hard ni rebase sobre ramas publicadas; no
afirmes que un push salió bien sin verificarlo; si hay conflictos con trabajo ajeno, detenete. Código
claro, en el estilo de ConciliacionesView, comentarios en español solo si aportan. Explicame al final el
código como a un estudiante que lo tiene que defender.
```

#### Aprendizaje y defensa oral — Día 2

- **Qué resuelve:** hasta ahora una orden solo se veía en Monitoreo (con datos de carga) o en Conciliaciones (si estaba finalizada). Con esta pantalla se ven **todas**, en cualquier estado.
- **Flujo:** se abre `/ordenes` → el router muestra `OrdenesView` → `onMounted` llama a `api('/api/v1/ordenes')` → `api()` agrega el token y hace `fetch` → el backend (`ConsultaController.listar`) devuelve una lista de `OrdenResponse` en JSON → se guarda en `ordenes` (un `ref`) → Vue redibuja la tabla.
- **Archivos importantes:** `OrdenesView.vue` (la pantalla), `router/index.js` (asocia la URL con la pantalla), `App.vue` (link del menú), `api/http.js` (de Fran: agrega el token).
- **Preguntas posibles:**
  1. *¿Qué es `ref`?* Una variable reactiva: cuando cambia su `.value`, Vue vuelve a dibujar lo que la usa.
  2. *¿Por qué no hay actualización automática como en Monitoreo?* Es una consulta general; el tiempo real está en Monitoreo. Hay un botón para recargar cuando hace falta.
  3. *¿Cómo sabe el backend quién pide los datos?* `api()` manda el token en el header `Authorization: Bearer …`; si falta, el backend responde 401.

### Fran

```text
Soy Fran (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `fran`.
Guía: docs/prompts-diarios.md; mi plan: docs/plan-fran.md.

OBJETIVO DEL DÍA: que Spring Security no cree el usuario en memoria con contraseña aleatoria que el
proyecto no usa (log "Using generated security password").

ANTES DE EMPEZAR: git fetch origin; git checkout fran; git status -sb; git log --oneline -8;
git log --oneline -5 origin/main. Verificá que exista docs/plan-fran.md (Día 1) y qué dice del punto a).
Si el punto a) no existe o ya se resolvió, avisame y no sigas con esta tarea.
Si origin/main tiene commits nuevos: git merge origin/main (conflictos → detenete).

ARCHIVOS: leer Iw3BackendApplication.java, security/SecurityConfig.java, security/AuthService.java.
Modificar lo mínimo (probablemente Iw3BackendApplication.java).

TAREAS:
1. Confirmar por qué se crea: el proyecto no declara un UserDetailsService ni un AuthenticationManager, y
   Spring Boot autoconfigura uno en memoria (UserDetailsServiceAutoConfiguration). Buscá el nombre y el
   paquete exactos de esa clase en Spring Boot 4.1 (el logger del warning da una pista; verificalo en el
   jar con mvn dependency:tree o en el IDE), no lo supongas.
2. Elegir la solución más simple y explicable. Opciones: excluir esa autoconfiguración en
   @SpringBootApplication, o declarar un UserDetailsService propio. Justificá la elección (el login
   propio de AuthService ya valida usuario y contraseña con BCrypt).
3. Verificar que el login, el 401 sin token y el 403 por rol siguen igual (SeguridadTest).

TERMINADO CUANDO: el warning ya no aparece al arrancar ni en los tests, y todos los tests pasan.
PRUEBAS: backend completo (./mvnw test o Docker); buscá "generated security password" en la salida (no
tiene que aparecer). Frontend: npm test (no debería cambiar nada).
DIFF Y COMMIT: git diff; commit "fix: quitar el usuario en memoria que Spring Security crea por defecto".
PUSH: git push origin fran; verificá con git log origin/fran -1.
RESUMEN FINAL: causa, solución elegida y por qué, archivos, commit, pruebas (números reales), push verificado.

REGLAS: inspeccioná antes de actuar; no repitas tareas hechas; no inventes resultados; no toques archivos
fuera de la tarea sin justificarlo; nunca push --force, reset --hard ni rebase sobre ramas publicadas; no
afirmes que un push salió bien sin verificarlo; si hay conflictos con trabajo ajeno, detenete. Código claro
para 4.º año, comentarios en español solo si aportan, sin dependencias nuevas. Explicame el cambio para
poder defenderlo.
```

### Fabri

```text
Soy Fabri (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `fabri`.
Guía: docs/prompts-diarios.md; mi plan: docs/plan-fabri.md.

OBJETIVO DEL DÍA: tests de frontend para composables/usePolling.js.

ANTES DE EMPEZAR: git fetch origin; git checkout fabri; git status -sb; git log --oneline -8;
git log --oneline -5 origin/main. Verificá que exista docs/plan-fabri.md (Día 1). Si ya existe
usePolling.test.js, avisame. Si origin/main tiene commits nuevos: git merge origin/main (conflictos → detenete).

ARCHIVOS: leer composables/usePolling.js, views/ConciliacionesView.test.js y AlarmasView.test.js (estilo
de tests del proyecto), vite.config.js (config de Vitest). Crear composables/usePolling.test.js.

TAREAS:
1. Como usePolling usa onMounted/onUnmounted, probalo montando un componente mínimo definido en el test
   (defineComponent con setup que llama usePolling(accion, 5000)), con @vue/test-utils.
2. Usar temporizadores falsos de Vitest (vi.useFakeTimers / vi.advanceTimersByTime) y restaurarlos al final.
3. Casos: (a) al montar ejecuta la acción una vez; (b) a los 5000 ms la vuelve a ejecutar y a los 10000 ms
   van 3; (c) después de desmontar (unmount) ya no se ejecuta más.
4. No cambiar usePolling.js hoy (si encontrás un problema, anotalo para el Día 8).

TERMINADO CUANDO: los 3 casos pasan y los 16 tests anteriores siguen pasando.
PRUEBAS: cd frontend && npm test && npm run build.
DIFF Y COMMIT: git diff --stat (solo el archivo nuevo). Commit "test: pruebas del composable usePolling".
PUSH: git push origin fabri; verificá con git log origin/fabri -1.
RESUMEN FINAL: qué prueba cada test, archivos, commit, pruebas (números reales), push verificado, pendientes.

REGLAS: inspeccioná antes de actuar; no repitas tareas hechas; no inventes resultados; no toques archivos
fuera de la tarea sin justificarlo; nunca push --force, reset --hard ni rebase sobre ramas publicadas; no
afirmes que un push salió bien sin verificarlo; si hay conflictos con trabajo ajeno, detenete. Código claro
para 4.º año, comentarios en español solo si aportan, sin dependencias nuevas. Explicame los temporizadores
falsos para poder defenderlo.
```

---

## Día 3

### Lean

```text
Soy Lean (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `lean`.
Guía: docs/prompts-diarios.md y docs/plan-lean.md.

OBJETIVO DEL DÍA: filtrar el listado de órdenes por estado.

ANTES DE EMPEZAR: git fetch origin; git checkout lean; git status -sb; git log --oneline -8;
git log --oneline -5 origin/main. Verificá el Día 2 (commit "feat: pantalla de listado de órdenes" y
views/OrdenesView.vue). Si ya existe utils/estados.js o el filtro, avisame.
Si origin/main tiene commits nuevos: git merge origin/main (conflictos → detenete).

ARCHIVOS: leer views/OrdenesView.vue, la lista ESTADOS de views/MonitoreoView.vue (NO la modifiques: es de
Fabri, la va a reemplazar el Día 9) y backend/.../model/EstadoOrden.java (valores válidos).
Crear frontend/src/utils/estados.js. Modificar views/OrdenesView.vue.

TAREAS:
1. utils/estados.js: exportar ESTADOS_ORDEN, la lista de los 4 estados en orden
   ({ valor: 'PENDIENTE_PESAJE_INICIAL', texto: '1 · Pendiente de pesaje inicial' }, … hasta FINALIZADA),
   y una función textoEstado(valor) que devuelva el texto o el valor si no lo encuentra. Es la lista que
   después van a compartir el listado, el detalle y el monitoreo.
2. En OrdenesView: un <select> con "Todos" + ESTADOS_ORDEN. Al cambiarlo se vuelve a pedir la lista:
   sin estado → /api/v1/ordenes; con estado → /api/v1/ordenes?estado=VALOR (armalo con URLSearchParams,
   como MonitoreoView).
3. El botón "Actualizar lista" respeta el filtro elegido.

TERMINADO CUANDO: al elegir "4 · Finalizada" solo aparecen las finalizadas y "Todos" vuelve a mostrar todas.
PRUEBAS: cd frontend && npm test && npm run build. Prueba manual si podés (o decí que no la hiciste).
DIFF Y COMMIT: git diff; solo estados.js y OrdenesView.vue. Commit "feat: filtro por estado en el listado de órdenes".
PUSH: git push origin lean; verificá con git log origin/lean -1.
RESUMEN FINAL: qué se hizo, archivos, commit, pruebas, push verificado y aviso para Fabri: "utils/estados.js
existe en lean; llega a main el Día 7".

REGLAS: inspeccioná antes de actuar; no repitas tareas hechas; no inventes resultados; no toques archivos
fuera de la tarea sin justificarlo; nunca push --force, reset --hard ni rebase sobre ramas publicadas; no
afirmes que un push salió bien sin verificarlo; si hay conflictos con trabajo ajeno, detenete. Código claro,
comentarios en español solo si aportan. Explicame el código para poder defenderlo.
```

#### Aprendizaje y defensa oral — Día 3

- **Qué resuelve:** con muchas órdenes, ver solo las de un estado (por ejemplo, las que esperan la tara).
- **Flujo:** elijo un estado en el `<select>` → `v-model` actualiza la variable del filtro → un `watch` (o el `@change`) llama a `cargar()` → se pide `/api/v1/ordenes?estado=FINALIZADA` → el backend filtra en la base (`findByEstadoOrderByNumeroOrdenAsc`) → se redibuja la tabla.
- **Archivos importantes:** `utils/estados.js` (la lista de estados en un solo lugar, la van a usar varias pantallas), `OrdenesView.vue`.
- **Preguntas posibles:**
  1. *¿Por qué el filtro lo hace el backend y no el frontend?* Así no se bajan órdenes que no se van a mostrar, y el backend ya tenía el parámetro `estado`.
  2. *¿Qué pasa si mando un estado que no existe?* Spring no puede convertir el texto al enum `EstadoOrden` y responde 400 (`MethodArgumentTypeMismatchException` en `GlobalExceptionHandler`). Desde la pantalla no puede pasar, porque solo se eligen valores de la lista.
  3. *¿Para qué sirve `URLSearchParams`?* Arma la parte `?clave=valor` de la URL y codifica bien los caracteres especiales.

### Fran

```text
Soy Fran (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `fran`.
Guía: docs/prompts-diarios.md; mi plan: docs/plan-fran.md.

OBJETIVO DEL DÍA: validar el JWT_SECRET al arrancar: error claro si es corto y advertencia si es el de desarrollo.

ANTES DE EMPEZAR: git fetch origin; git checkout fran; git status -sb; git log --oneline -8;
git log --oneline -5 origin/main. Verificá el Día 2 (commit "fix: quitar el usuario en memoria…").
Revisá en docs/plan-fran.md los puntos b) y c). Si origin/main tiene commits nuevos: git merge origin/main.

ARCHIVOS: leer security/JwtService.java, application.properties (solo las líneas app.seguridad.*),
docker-compose.yml (JWT_SECRET), backend/.env.example, .env.example, src/test/resources/application.properties.
Modificar security/JwtService.java (y lo mínimo necesario).

TAREAS:
1. Secreto corto: hoy Keys.hmacShaKeyFor lanza una excepción poco clara. Antes de crear la clave, si el
   secreto tiene menos de 32 bytes en UTF-8, lanzar IllegalStateException con un mensaje en castellano que
   diga qué variable cambiar (JWT_SECRET) y el mínimo.
2. Secreto de desarrollo: si se usa el valor por defecto, NO impedir el arranque (romperías docker compose
   up sin .env, que es como lo levanta el profe); registrar un log.warn claro. Pensá cómo detectarlo sin
   copiar el mismo texto en tres lugares y justificá la elección (por ejemplo, una propiedad booleana o
   comparar contra una constante única).
3. No cambiar el algoritmo, la duración ni el formato de los tokens.

TERMINADO CUANDO: con un secreto corto el backend no arranca y el mensaje dice por qué; con el de
desarrollo arranca y avisa en el log; con uno propio, sin aviso. Todos los tests pasan.
PRUEBAS: backend completo. Probá a mano: JWT_SECRET=corto (no arranca, mensaje claro) y sin JWT_SECRET
(arranca y advierte). Decí cuáles corriste y cuáles no.
DIFF Y COMMIT: git diff; commit "feat: validar el JWT_SECRET al arrancar y avisar si es el de desarrollo".
PUSH: git push origin fran; verificá con git log origin/fran -1.
RESUMEN FINAL: decisión tomada y por qué, archivos, commit, pruebas, push verificado, pendientes.

REGLAS: inspeccioná antes de actuar; no repitas tareas hechas; no inventes resultados; no toques archivos
fuera de la tarea sin justificarlo; nunca push --force, reset --hard ni rebase sobre ramas publicadas; no
afirmes que un push salió bien sin verificarlo; si hay conflictos con trabajo ajeno, detenete. Código claro
para 4.º año, comentarios en español solo si aportan, sin dependencias nuevas.
```

### Fabri

```text
Soy Fabri (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `fabri`.
Guía: docs/prompts-diarios.md; mi plan: docs/plan-fabri.md.

OBJETIVO DEL DÍA: tests de frontend de la pantalla de monitoreo (views/MonitoreoView.vue).

ANTES DE EMPEZAR: git fetch origin; git checkout fabri; git status -sb; git log --oneline -8;
git log --oneline -5 origin/main. Verificá el Día 2 (usePolling.test.js). Si ya existe MonitoreoView.test.js,
avisame. Si origin/main tiene commits nuevos: git merge origin/main (conflictos → detenete).

ARCHIVOS: leer views/MonitoreoView.vue y views/ConciliacionesView.test.js (cómo se simula el backend con
un fetch falso y se usa Pinia). Crear views/MonitoreoView.test.js. No modificar MonitoreoView.vue hoy.

TAREAS (cada una, un test):
1. Al montarse pide /api/v1/monitoreo?ordenarPor=numeroOrden&direccion=asc y muestra las filas (número,
   patente, ETA formateado).
2. Elegir un estado en el select agrega &estado=… al siguiente pedido.
3. Click en el encabezado "Temp. (°C)" pide ordenarPor=temperatura asc; un segundo click, desc (y la flecha cambia).
4. Si el backend responde error, se ve el mensaje.
5. Como hay polling cada 5 s, usá temporizadores falsos o desmontá el componente al final para que no
   queden intervalos vivos.

TERMINADO CUANDO: los tests nuevos pasan y los anteriores siguen pasando.
PRUEBAS: cd frontend && npm test && npm run build.
DIFF Y COMMIT: git diff --stat; commit "test: pruebas de la pantalla de monitoreo".
PUSH: git push origin fabri; verificá con git log origin/fabri -1.
RESUMEN FINAL: qué prueba cada test, archivos, commit, pruebas (números reales), push verificado, y si
apareció algún comportamiento raro (anotarlo para el Día 4).

REGLAS: inspeccioná antes de actuar; no repitas tareas hechas; no inventes resultados; no toques archivos
fuera de la tarea sin justificarlo; nunca push --force, reset --hard ni rebase sobre ramas publicadas; no
afirmes que un push salió bien sin verificarlo; si hay conflictos con trabajo ajeno, detenete. Código claro
para 4.º año, comentarios en español solo si aportan, sin dependencias nuevas.
```

---

## Día 4

### Lean

```text
Soy Lean (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `lean`.
Guía: docs/prompts-diarios.md y docs/plan-lean.md.

OBJETIVO DEL DÍA: tests automáticos del listado de órdenes.

ANTES DE EMPEZAR: git fetch origin; git checkout lean; git status -sb; git log --oneline -8;
git log --oneline -5 origin/main. Verificá los Días 2 y 3 (OrdenesView.vue con filtro, utils/estados.js).
Si ya existe views/OrdenesView.test.js, avisame. Si origin/main tiene commits nuevos: git merge origin/main.

ARCHIVOS: leer views/ConciliacionesView.test.js (copiar su forma: fetch falso con vi.fn y vi.stubGlobal,
Pinia con setActivePinia, mount y flushPromises). Crear views/OrdenesView.test.js.

TAREAS (un test cada una):
1. Al montarse pide /api/v1/ordenes y muestra número, patente y cliente de cada orden.
2. Al elegir "FINALIZADA" en el select, el siguiente pedido es /api/v1/ordenes?estado=FINALIZADA.
3. Lista vacía: aparece "No hay órdenes para mostrar."
4. Si el backend responde un error (ok: false, status 500, json con { mensaje }), se ve ese mensaje.
5. Opcional (si es corto): textoEstado de utils/estados.js devuelve el texto de un estado conocido y el valor
   tal cual si no lo conoce (en utils/estados.test.js).
No cambies OrdenesView.vue salvo que un test descubra un error; si pasa, explicame el error antes de corregirlo.

TERMINADO CUANDO: los tests nuevos pasan y los 16 anteriores también.
PRUEBAS: cd frontend && npm test && npm run build. Informá la cantidad total real de tests.
DIFF Y COMMIT: git diff --stat; commit "test: pruebas del listado de órdenes".
PUSH: git push origin lean; verificá con git log origin/lean -1.
RESUMEN FINAL: qué prueba cada test, archivos, commit, pruebas, push verificado, pendientes.

REGLAS: inspeccioná antes de actuar; no repitas tareas hechas; no inventes resultados; no toques archivos
fuera de la tarea sin justificarlo; nunca push --force, reset --hard ni rebase sobre ramas publicadas; no
afirmes que un push salió bien sin verificarlo; si hay conflictos con trabajo ajeno, detenete. Código claro,
comentarios en español solo si aportan. Explicame cómo funciona el fetch falso para poder defenderlo.
```

#### Aprendizaje y defensa oral — Día 4

- **Qué resuelve:** comprobar automáticamente que el listado sigue funcionando cada vez que alguien cambia algo, sin levantar el backend.
- **Flujo de un test:** reemplazo `fetch` por una función falsa (`vi.fn`) que devuelve órdenes de ejemplo → monto la pantalla con `mount` → `flushPromises` espera que terminen las promesas → reviso el texto (`pantalla.text()`) y con qué URL se llamó a `fetch` (`fetchFalso.mock.calls`).
- **Archivos importantes:** `OrdenesView.test.js`; `ConciliacionesView.test.js` como modelo.
- **Preguntas posibles:**
  1. *¿Por qué simulan el backend?* El test prueba la pantalla, no el backend (que tiene sus propios tests). Además es rápido y no depende de una base de datos.
  2. *¿Qué hace `flushPromises`?* Espera a que se resuelvan las promesas pendientes (el `fetch` simulado), así el DOM ya muestra los datos cuando lo reviso.
  3. *¿Qué pasa si alguien cambia la URL del endpoint?* El test que revisa `mock.calls` falla y avisa antes de que llegue a `main`.

### Fran

```text
Soy Fran (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `fran`.
Guía: docs/prompts-diarios.md; mi plan: docs/plan-fran.md.

OBJETIVO DEL DÍA: tests unitarios de security/JwtService (hoy solo se prueba a través de MockMvc).

ANTES DE EMPEZAR: git fetch origin; git checkout fran; git status -sb; git log --oneline -8;
git log --oneline -5 origin/main. Verificá el Día 3 (validación del JWT_SECRET). Si ya existe
JwtServiceTest, avisame. Si origin/main tiene commits nuevos: git merge origin/main.

ARCHIVOS: leer security/JwtService.java (con el cambio del Día 3), los tests de service/ (ejemplo de test
unitario sin Spring: ReglasAlmacenamientoTest). Crear backend/src/test/java/ar/edu/iua/iw3/security/JwtServiceTest.java.

TAREAS: tests unitarios con new JwtService(secreto, minutos), sin levantar Spring:
1. Un token generado se valida y trae el usuario (subject) y el rol (claim "rol").
2. Un token con un carácter cambiado (adulterado) no se valida (Optional vacío).
3. Un token vencido no se valida (por ejemplo, con expiración negativa).
4. Un token firmado con otro secreto no se valida.
5. Un secreto de menos de 32 bytes lanza la excepción del Día 3 con el mensaje esperado.
No cambies JwtService salvo que un test muestre un error real (explicámelo primero).

TERMINADO CUANDO: los 5 tests pasan y el resto del backend también.
PRUEBAS: backend completo (./mvnw test o Docker). Informá los totales reales (antes eran 46).
DIFF Y COMMIT: git diff --stat; commit "test: pruebas unitarias de JwtService".
PUSH: git push origin fran; verificá con git log origin/fran -1.
RESUMEN FINAL: qué prueba cada test, archivos, commit, pruebas, push verificado.

REGLAS: inspeccioná antes de actuar; no repitas tareas hechas; no inventes resultados; no toques archivos
fuera de la tarea sin justificarlo; nunca push --force, reset --hard ni rebase sobre ramas publicadas; no
afirmes que un push salió bien sin verificarlo; si hay conflictos con trabajo ajeno, detenete. Código claro
para 4.º año, comentarios en español solo si aportan, sin dependencias nuevas.
```

### Fabri

```text
Soy Fabri (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `fabri`.
Guía: docs/prompts-diarios.md; mi plan: docs/plan-fabri.md.

OBJETIVO DEL DÍA: que el monitoreo no muestre el resultado de un filtro viejo cuando las respuestas llegan
desordenadas (punto b del plan).

ANTES DE EMPEZAR: git fetch origin; git checkout fabri; git status -sb; git log --oneline -8;
git log --oneline -5 origin/main. Verificá el Día 3 (MonitoreoView.test.js). Revisá en docs/plan-fabri.md
el punto b): si se determinó que el problema NO existe, avisame y no cambies nada.
Si origin/main tiene commits nuevos: git merge origin/main.

ARCHIVOS: views/MonitoreoView.vue y views/MonitoreoView.test.js (los dos son míos).

TAREAS:
1. Primero un test que reproduzca el problema: dos pedidos donde el primero (filtro viejo) responde
   DESPUÉS que el segundo; hoy la tabla queda con el resultado viejo. El test tiene que fallar antes del arreglo.
2. Arreglo simple: numerar cada pedido (un contador) y descartar la respuesta si no es la del último pedido.
   No agregar librerías. Si además querés esperar a que el usuario deje de tipear (debounce), justificalo;
   si no hace falta, no lo agregues.
3. Mantener la actualización automática cada 5 s y los tests del Día 3.

TERMINADO CUANDO: el test nuevo falla sin el arreglo y pasa con él; los demás siguen pasando.
PRUEBAS: cd frontend && npm test && npm run build.
DIFF Y COMMIT: git diff; commit "fix: el monitoreo ignora respuestas viejas al cambiar los filtros".
PUSH: git push origin fabri; verificá con git log origin/fabri -1.
RESUMEN FINAL: cómo se reprodujo, el arreglo, archivos, commit, pruebas, push verificado.

REGLAS: inspeccioná antes de actuar; no repitas tareas hechas; no inventes resultados; no toques archivos
fuera de la tarea sin justificarlo; nunca push --force, reset --hard ni rebase sobre ramas publicadas; no
afirmes que un push salió bien sin verificarlo; si hay conflictos con trabajo ajeno, detenete. Código claro
para 4.º año, comentarios en español solo si aportan, sin dependencias nuevas.
```

---

## Día 5

### Lean

```text
Soy Lean (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `lean`.
Guía: docs/prompts-diarios.md y docs/plan-lean.md.

OBJETIVO DEL DÍA: pantalla de detalle de una orden (cabecera), en la ruta /ordenes/:numero.

ANTES DE EMPEZAR: git fetch origin; git checkout lean; git status -sb; git log --oneline -8;
git log --oneline -5 origin/main. Verificá el Día 4 (OrdenesView.test.js). Si ya existe
views/OrdenDetalleView.vue, avisame. Si origin/main tiene commits nuevos: git merge origin/main.

ARCHIVOS: leer backend/.../dto/OrdenResponse.java, CamionResponse.java, ChoferDto.java, ClienteDto.java,
ProductoDto.java (qué campos llegan), views/ConciliacionesView.vue (tabla de dos columnas th/td) y
router/index.js. Crear views/OrdenDetalleView.vue. Modificar router/index.js (ruta /ordenes/:numero).

TAREAS:
1. OrdenDetalleView lee el número de la URL (useRoute().params.numero) y llama a
   api(`/api/v1/ordenes/${numero}`).
2. Mostrar, en tablas simples de dos columnas:
   - Orden: número, estado (estadoNumero · estadoDescripcion), fecha prevista, preset (kg).
   - Camión: patente, descripción, cisternas (número y litros) y capacidad total (capacidadTotalLitros).
   - Chofer (nombre, apellido, documento), Cliente (razón social, contacto), Producto (nombre, descripción).
   - Circuito: fecha de recepción, pesaje inicial (kg y fecha), inicio y fin de carga, pesaje final (kg y fecha).
   - Últimos valores de carga: masa acumulada, densidad, temperatura, caudal y fecha del último dato.
   Los datos que faltan muestran "-" (ya lo hacen formatearNumero y formatearFechaHora).
3. Link "← Volver al listado" (RouterLink a /ordenes).
4. Si falla (por ejemplo, 404), mostrar el mensaje en <p class="error">. El caso 404 se pule el Día 10.
5. Todavía sin historial ni detalle de carga (Días 6 y 8).

TERMINADO CUANDO: entrando a /ordenes/1001 (con esa orden creada) se ven todos los datos, y los que faltan con "-".
PRUEBAS: cd frontend && npm test && npm run build. Prueba manual con una orden creada por Postman (decí si la hiciste).
DIFF Y COMMIT: git diff; commit "feat: pantalla de detalle de una orden".
PUSH: git push origin lean; verificá con git log origin/lean -1.
RESUMEN FINAL: qué se hizo, archivos, commit, pruebas, push verificado, pendientes.

REGLAS: inspeccioná antes de actuar; no repitas tareas hechas; no inventes resultados; no toques archivos
fuera de la tarea sin justificarlo; nunca push --force, reset --hard ni rebase sobre ramas publicadas; no
afirmes que un push salió bien sin verificarlo; si hay conflictos con trabajo ajeno, detenete. Código claro,
comentarios en español solo si aportan. Explicame las rutas con parámetros para poder defenderlo.
```

#### Aprendizaje y defensa oral — Día 5

- **Qué resuelve:** ver todo lo que el sistema sabe de una orden en una sola pantalla: lo que mandó SAP, las fechas de cada paso del circuito y los últimos valores de carga.
- **Flujo:** entro a `/ordenes/1001` → el router ve el patrón `/ordenes/:numero` y muestra `OrdenDetalleView` → `useRoute().params.numero` vale `"1001"` → se pide `GET /api/v1/ordenes/1001` → `ConsultaController.buscar` → `OrdenService.buscar` → `OrdenMapper` arma el `OrdenResponse` → se muestra.
- **Archivos importantes:** `OrdenDetalleView.vue`, `router/index.js`; en el backend (solo para entender, no lo toqué): `OrdenResponse` (lo que se expone) y `OrdenMapper`.
- **Preguntas posibles:**
  1. *¿Se ve la contraseña de activación?* No. `OrdenResponse` no la incluye a propósito; solo sale en la respuesta del pesaje inicial.
  2. *¿Qué es `:numero` en la ruta?* Un parámetro: cualquier valor en esa posición de la URL llega a la pantalla en `route.params.numero`.
  3. *¿De dónde sale la capacidad total del camión?* El backend suma las capacidades de las cisternas (`capacidadTotalLitros` de `CamionResponse`); el frontend solo la muestra.

### Fran

```text
Soy Fran (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `fran`.
Guía: docs/prompts-diarios.md; mi plan: docs/plan-fran.md.

OBJETIVO DEL DÍA: validaciones del alta de orden (punto 1, SAP): cisternas con número repetido y largo
máximo de los textos.

ANTES DE EMPEZAR: git fetch origin; git checkout fran; git status -sb; git log --oneline -8;
git log --oneline -5 origin/main. Verificá el Día 4 (JwtServiceTest). Revisá en docs/plan-fran.md los
puntos f) y g): hacé solo los que se confirmaron. Si origin/main tiene commits nuevos: git merge origin/main.

ARCHIVOS: leer dto/OrdenSapRequest, CamionDto, CisternaDto, ChoferDto, ClienteDto, ProductoDto,
model/Chofer, Cliente, Producto, Camion, Cisterna (largos de columna), service/SincronizacionService,
exception/GlobalExceptionHandler, test/controller/CircuitoOrdenTest y TestAuth.
Modificar los DTOs necesarios. Crear test/controller/ValidacionOrdenTest.java.

TAREAS:
1. Antes de cambiar nada, comprobar con un test qué responde hoy la API con: (a) dos cisternas con el mismo
   número; (b) un nombre de chofer de 300 caracteres. Anotá el status real.
2. Cisternas repetidas → 400 con un mensaje claro. Preferí Bean Validation en el DTO (por ejemplo, un método
   @AssertTrue en CamionDto) para que el error salga con el mismo formato que los demás 400; verificá que
   funcione en un record.
3. Agregar @Size(max = 255) (el largo de la columna) a los textos que no lo tienen, así el error es 400
   antes de llegar a la base. Revisá descripcion y documento también.
4. ValidacionOrdenTest (MockMvc, usuario sap): cisternas repetidas → 400; texto de 256 → 400;
   texto de 255 → 201 (el límite entra).
5. No cambiar el formato de ErrorResponse ni las validaciones que ya existen.

TERMINADO CUANDO: los casos dan 400 con mensaje claro y todo el backend pasa.
PRUEBAS: backend completo. Informá los totales reales.
DIFF Y COMMIT: git diff; commit "feat: validar cisternas repetidas y largo de los textos al crear una orden".
PUSH: git push origin fran; verificá con git log origin/fran -1.
RESUMEN FINAL: comportamiento antes y después, archivos, commit, pruebas, push verificado. Avisá al grupo que
cambió la validación del alta de orden (Fabri regenera openapi.json el Día 12).

REGLAS: inspeccioná antes de actuar; no repitas tareas hechas; no inventes resultados; no toques archivos
fuera de la tarea sin justificarlo; nunca push --force, reset --hard ni rebase sobre ramas publicadas; no
afirmes que un push salió bien sin verificarlo; si hay conflictos con trabajo ajeno, detenete. Código claro
para 4.º año, comentarios en español solo si aportan, sin dependencias nuevas.
```

### Fabri

```text
Soy Fabri (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `fabri`.
Guía: docs/prompts-diarios.md; mi plan: docs/plan-fabri.md.

OBJETIVO DEL DÍA: que dos aceptaciones simultáneas de la misma alarma no respondan 200 las dos (punto c del plan).

ANTES DE EMPEZAR: git fetch origin; git checkout fabri; git status -sb; git log --oneline -8;
git log --oneline -5 origin/main. Verificá el Día 4. Revisá el punto c) en docs/plan-fabri.md; si no se
confirmó, avisame. Si origin/main tiene commits nuevos: git merge origin/main.

ARCHIVOS: leer service/AlarmaService.aceptar, repository/AlarmaRepository, repository/OrdenRepository
(findByNumeroOrdenParaActualizar con @Lock(PESSIMISTIC_WRITE): es el patrón que ya usa el proyecto) y
test/controller/AlarmasTest. Modificar AlarmaRepository, AlarmaService y AlarmasTest.

TAREAS:
1. Explicar el problema: dos requests leen la alarma PENDIENTE al mismo tiempo, los dos pasan el if y los dos
   la marcan ACEPTADA; el segundo pisa el usuario y la fecha del primero.
2. Arreglo coherente con el resto del proyecto: un método en AlarmaRepository que lea la alarma con
   @Lock(LockModeType.PESSIMISTIC_WRITE) (SELECT … FOR UPDATE) y usarlo en aceptar(). El segundo request
   espera, ve ACEPTADA y recibe 409. Compará con @Version (bloqueo optimista) y justificá la elección.
3. Test: como mínimo, que aceptar dos veces seguidas da 200 y 409 y que se conserva el primer usuario. Si
   podés probar la concurrencia real con dos hilos de forma confiable en H2, agregalo; si da resultados
   inestables, no lo dejes y explicá por qué.

TERMINADO CUANDO: aceptar usa el bloqueo, los tests pasan y la explicación queda clara.
PRUEBAS: backend completo (./mvnw test o Docker). Informá los totales reales.
DIFF Y COMMIT: git diff; commit "fix: bloquear la alarma al aceptarla para evitar dos aceptaciones simultáneas".
PUSH: git push origin fabri; verificá con git log origin/fabri -1.
RESUMEN FINAL: problema, solución, archivos, commit, pruebas, push verificado.

REGLAS: inspeccioná antes de actuar; no repitas tareas hechas; no inventes resultados; no toques archivos
fuera de la tarea sin justificarlo; nunca push --force, reset --hard ni rebase sobre ramas publicadas; no
afirmes que un push salió bien sin verificarlo; si hay conflictos con trabajo ajeno, detenete. Código claro
para 4.º año, comentarios en español solo si aportan, sin dependencias nuevas.
```

---

## Día 6

### Lean

```text
Soy Lean (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `lean`.
Guía: docs/prompts-diarios.md y docs/plan-lean.md.

OBJETIVO DEL DÍA: mostrar el historial de cambios de estado (log de auditoría) en el detalle de la orden.

ANTES DE EMPEZAR: git fetch origin; git checkout lean; git status -sb; git log --oneline -8;
git log --oneline -5 origin/main. Verificá el Día 5 (OrdenDetalleView.vue y la ruta /ordenes/:numero).
Si el detalle ya muestra el historial, avisame. Si origin/main tiene commits nuevos: git merge origin/main.

ARCHIVOS: leer backend/.../dto/CambioEstadoResponse.java (estadoAnterior, estadoNuevo, fechaHora, usuario,
observaciones), utils/estados.js (textoEstado). Modificar views/OrdenDetalleView.vue.

TAREAS:
1. Además de la cabecera, pedir api(`/api/v1/ordenes/${numero}/historial-estados`).
2. Sección "Historial de estados": tabla con Fecha y hora, De, A, Usuario, Observaciones.
   De y A con textoEstado(). En el alta, estadoAnterior viene null: mostrar "(alta de la orden)".
3. Las observaciones vacías se muestran con "-".
4. Si el historial falla pero la cabecera no, mostrar el error sin borrar la cabecera.

TERMINADO CUANDO: con una orden que hizo el circuito completo se ven 4 filas, con los usuarios
sap, tms, carga, tms (son los que registra la auditoría).
PRUEBAS: cd frontend && npm test && npm run build. Prueba manual con el circuito de Postman (decí si la hiciste).
DIFF Y COMMIT: git diff; commit "feat: historial de estados en el detalle de la orden".
PUSH: git push origin lean; verificá con git log origin/lean -1.
RESUMEN FINAL: qué se hizo, archivos, commit, pruebas, push verificado, pendientes.

REGLAS: inspeccioná antes de actuar; no repitas tareas hechas; no inventes resultados; no toques archivos
fuera de la tarea sin justificarlo; nunca push --force, reset --hard ni rebase sobre ramas publicadas; no
afirmes que un push salió bien sin verificarlo; si hay conflictos con trabajo ajeno, detenete. Código claro,
comentarios en español solo si aportan. Explicame qué es el log de auditoría para poder defenderlo.
```

#### Aprendizaje y defensa oral — Día 6

- **Qué resuelve:** el enunciado pide que cada cambio de estado quede registrado con fecha y hora, usuario y observaciones, y recomienda un log de auditoría. El backend ya lo guardaba; ahora se puede **ver**.
- **Flujo:** al abrir el detalle se hacen dos pedidos: la cabecera y `GET /api/v1/ordenes/1001/historial-estados` → `OrdenService.historialEstados` lee la tabla de `CambioEstado` en orden cronológico → la pantalla traduce los estados con `textoEstado()` y arma la tabla.
- **Archivos importantes:** `OrdenDetalleView.vue`, `utils/estados.js`; en el backend: `CambioEstado` (la entidad) y `OrdenService.cambiarEstado()`, el único lugar donde cambia el estado y se registra la auditoría.
- **Preguntas posibles:**
  1. *¿Quién queda como usuario en el historial?* El usuario autenticado que hizo el cambio (sale del token): `sap` crea, `tms` registra los pesajes y `carga` cierra.
  2. *¿Por qué la primera fila no tiene estado anterior?* Es el alta de la orden: pasa de "nada" al estado 1.
  3. *¿Se puede volver a un estado anterior?* No. `EstadoOrden.puedePasarA()` solo permite el siguiente; si no, el backend responde 409 y no se registra nada.

### Fran

```text
Soy Fran (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `fran`.
Guía: docs/prompts-diarios.md; mi plan: docs/plan-fran.md.

OBJETIVO DEL DÍA: cuando el token vence, avisar en el login "Tu sesión venció, ingresá de nuevo"
(hoy se vuelve al login sin explicación).

ANTES DE EMPEZAR: git fetch origin; git checkout fran; git status -sb; git log --oneline -8;
git log --oneline -5 origin/main. Verificá el Día 5 (ValidacionOrdenTest). Revisá el punto e) del plan.
Si origin/main tiene commits nuevos: git merge origin/main.

ARCHIVOS: stores/auth.js, api/http.js, views/LoginView.vue, App.vue (solo leerlo: el watch que redirige
es de Lean), stores/auth.test.js. Modificar stores/auth.js, api/http.js, LoginView.vue y auth.test.js.

TAREAS:
1. Distinguir "cerré sesión con el botón Salir" (sin aviso) de "el backend respondió 401 con una sesión
   abierta" (con aviso). Por ejemplo: un estado avisoSesion en el store, que api() completa al recibir un 401
   y LoginView muestra y limpia al loguearse.
2. El login con credenciales incorrectas sigue mostrando su propio mensaje (no el de sesión vencida).
3. No cambiar la firma de api(ruta, { method, body }): la usan las pantallas de Lean y Fabri.
4. Tests en auth.test.js: un 401 con sesión deja el aviso; logout() no deja aviso; un login exitoso lo limpia.

TERMINADO CUANDO: probando con JWT_EXPIRACION_MINUTOS=1, al minuto cualquier acción lleva al login con el
aviso; al tocar Salir no aparece.
PRUEBAS: cd frontend && npm test && npm run build. Prueba manual con expiración de 1 minuto (decí si la hiciste).
DIFF Y COMMIT: git diff; commit "feat: avisar en el login cuando la sesión venció".
PUSH: git push origin fran; verificá con git log origin/fran -1.
RESUMEN FINAL: qué se hizo, archivos, commit, pruebas, push verificado.

REGLAS: inspeccioná antes de actuar; no repitas tareas hechas; no inventes resultados; no toques archivos
fuera de la tarea sin justificarlo; nunca push --force, reset --hard ni rebase sobre ramas publicadas; no
afirmes que un push salió bien sin verificarlo; si hay conflictos con trabajo ajeno, detenete. Código claro
para 4.º año, comentarios en español solo si aportan, sin dependencias nuevas.
```

### Fabri

```text
Soy Fabri (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `fabri`.
Guía: docs/prompts-diarios.md; mi plan: docs/plan-fabri.md.

OBJETIVO DEL DÍA: que los destinatarios iniciales de la alarma no queden con espacios (punto d del plan).

ANTES DE EMPEZAR: git fetch origin; git checkout fabri; git status -sb; git log --oneline -8;
git log --oneline -5 origin/main. Verificá el Día 5 (bloqueo al aceptar). Revisá el punto d); si no se
confirmó, avisame. Si origin/main tiene commits nuevos: git merge origin/main.

ARCHIVOS: service/AlarmaService.evaluar (arma la lista con split(",")), service/ConfiguracionAlarmaService
(obtener() crea la fila con el valor de app.alarma.destinatarios; actualizar() ya hace trim),
test/controller/ConfiguracionAlarmaTest y AlarmasTest. NO modificar src/test/resources/application.properties
(lo usan todos los tests): si necesitás otro valor, usá @TestPropertySource en tu clase de test.

TAREAS:
1. Reproducir con un test: con destinatarios iniciales "a@planta.local, b@planta.local", el evento
   AlarmaCreada lleva " b@planta.local" (con espacio).
2. Arreglarlo en un solo lugar (decidí si conviene normalizar al crear la configuración o al armar la lista, y
   explicá por qué). Descartar los elementos vacíos (por ejemplo, una coma al final).
3. El test nuevo pasa y los de alarmas siguen pasando.

TERMINADO CUANDO: el evento lleva los mails limpios y todos los tests pasan.
PRUEBAS: backend completo. Informá los totales reales.
DIFF Y COMMIT: git diff; commit "fix: quitar espacios de los destinatarios iniciales de la alarma".
PUSH: git push origin fabri; verificá con git log origin/fabri -1.
RESUMEN FINAL: qué se hizo, archivos, commit, pruebas, push verificado.

REGLAS: inspeccioná antes de actuar; no repitas tareas hechas; no inventes resultados; no toques archivos
fuera de la tarea sin justificarlo; nunca push --force, reset --hard ni rebase sobre ramas publicadas; no
afirmes que un push salió bien sin verificarlo; si hay conflictos con trabajo ajeno, detenete. Código claro
para 4.º año, comentarios en español solo si aportan, sin dependencias nuevas.
```

---

## Día 7 — Revisión e integración parcial

Orden de integración en `main`: **Lean → Fran → Fabri**. Cada uno avisa al grupo cuando terminó su merge, y el siguiente arranca trayendo `origin/main`.

### Lean

```text
Soy Lean (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `lean`.
Guía: docs/prompts-diarios.md y docs/plan-lean.md. Hoy integro primero en main.

OBJETIVO DEL DÍA: abrir el detalle con un click desde el listado, tests del detalle y primer merge de lean en main.

ANTES DE EMPEZAR: git fetch origin; git checkout lean; git status -sb; git log --oneline -10;
git log --oneline -5 origin/main. Verificá los Días 2 a 6 (listado, filtro, tests del listado, detalle con
historial). Si falta algo, avisame antes de integrar. Si origin/main tiene commits nuevos: git merge origin/main.

ARCHIVOS: views/OrdenesView.vue, views/OrdenDetalleView.vue; crear views/OrdenDetalleView.test.js.

TAREAS:
1. En el listado, el número de orden es un RouterLink a /ordenes/{numero} (o toda la fila con
   router.push). Elegí lo más simple y accesible (un link se puede abrir con el teclado o en otra pestaña).
2. OrdenDetalleView.test.js: el fetch falso responde según la URL (cabecera o historial). Tests: muestra
   datos de la cabecera (patente, cliente); muestra el historial con "(alta de la orden)" en la primera fila;
   si la cabecera responde 404 con { mensaje }, se ve el mensaje. Para la ruta, montá con un router de memoria
   (createRouter + createMemoryHistory) o simulá useRoute; elegí lo más simple.
3. Commits separados: "feat: abrir el detalle de la orden desde el listado" y "test: pruebas del detalle de orden".
4. INTEGRACIÓN: con todo commiteado y pusheado en lean, correr TODOS los tests (frontend y backend).
   Si pasan: git checkout main && git pull origin main && git merge --no-ff lean -m "merge: lean - sección
   Órdenes (listado, filtro y detalle con historial)". Volver a correr los tests SOBRE main. Si pasan,
   git push origin main. Si hay conflictos o algo falla, NO pushees main: detenete y explicámelo.
5. Volver a la rama lean (git checkout lean).

TERMINADO CUANDO: main contiene la sección Órdenes, los tests pasan sobre main y el push está verificado
(git log origin/main --oneline -3).
PRUEBAS: frontend (npm test, npm run build) y backend (./mvnw test o Docker), en lean y después en main.
DIFF: git diff antes de cada commit y git log --oneline main..lean antes del merge (qué va a entrar).
PUSH: git push origin lean y, si corresponde, git push origin main. Verificá los dos.
RESUMEN FINAL: commits, qué entró a main, pruebas en lean y en main (números reales), pushes verificados, y
el mensaje para el grupo: "lean integrado en main (utils/estados.js y /ordenes/:numero disponibles)".

REGLAS: inspeccioná antes de actuar; no repitas tareas hechas; no inventes resultados; no toques archivos
fuera de la tarea sin justificarlo; nunca push --force, reset --hard ni rebase sobre ramas publicadas; no
afirmes que un push o merge salió bien sin verificarlo; si hay conflictos con trabajo ajeno, detenete.
Explicame el merge para poder defenderlo.
```

#### Aprendizaje y defensa oral — Día 7

- **Qué resuelve:** navegar del listado al detalle con un click y dejar la sección Órdenes en `main`, la versión estable que usa todo el equipo.
- **Flujo:** click en el número → `RouterLink` cambia la URL a `/ordenes/1001` sin recargar la página → el router muestra `OrdenDetalleView`. Integración: `merge origin/main` en mi rama → tests → `merge --no-ff lean` en `main` → tests de nuevo → `push`.
- **Archivos importantes:** `OrdenesView.vue` (el link), `OrdenDetalleView.test.js`.
- **Preguntas posibles:**
  1. *¿Por qué `RouterLink` y no un `<a href>` común?* `RouterLink` cambia de pantalla sin recargar la aplicación (no se pierde el estado ni se vuelve a bajar todo), y genera un `<a>` real, que se puede abrir en otra pestaña.
  2. *¿Por qué correr los tests otra vez sobre `main` después del merge?* Porque el merge junta mi trabajo con el de otros; algo que andaba por separado puede fallar combinado.
  3. *¿Qué hacen si hay un conflicto?* Se resuelve en la rama personal (al traer `origin/main`), nunca directamente en `main`, y se avisa al compañero si el conflicto toca su código.

### Fran

```text
Soy Fran (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `fran`.
Guía: docs/prompts-diarios.md. Hoy integro en main DESPUÉS de Lean.

OBJETIVO DEL DÍA: tests de views/LoginView.vue e integrar la rama fran en main.

ANTES DE EMPEZAR: git fetch origin; git checkout fran; git status -sb; git log --oneline -10;
git log --oneline -8 origin/main. Verificá mis Días 2 a 6. Verificá si Lean ya integró
(git log origin/main --oneline | grep "merge: lean"); si no, hacé la parte 1 y esperá para la parte 2.
Si ya existe LoginView.test.js, avisame.

ARCHIVOS: views/LoginView.vue, stores/auth.js, stores/auth.test.js (cómo se simula fetch y el router).
Crear views/LoginView.test.js.

TAREAS:
1. LoginView.test.js: (a) login correcto guarda la sesión y navega a ?redirect= o a "/"; (b) credenciales
   incorrectas muestran el mensaje del backend y no navegan; (c) mientras envía, el botón queda deshabilitado;
   (d) si hay aviso de sesión vencida (Día 6), se muestra y desaparece al loguearse.
   Commit "test: pruebas de la pantalla de login".
2. INTEGRACIÓN (cuando Lean ya integró): git merge origin/main en fran → todos los tests (frontend y backend)
   → git checkout main && git pull origin main && git merge --no-ff fran -m "merge: fran - validación del
   JWT_SECRET, tests de JwtService, validaciones del alta y aviso de sesión vencida" → tests SOBRE main →
   si pasan, git push origin main. Si hay conflictos con archivos de otros, NO los resuelvas a ciegas: detenete.
3. Volver a fran.

TERMINADO CUANDO: LoginView tiene tests, main contiene fran y los tests pasan sobre main.
PRUEBAS: frontend y backend completos, en fran y en main. Números reales.
DIFF: git diff antes del commit; git log --oneline main..fran antes del merge.
PUSH: git push origin fran y, si corresponde, origin main; verificá los dos.
RESUMEN FINAL: commits, qué entró a main, pruebas, pushes verificados, aviso al grupo.

REGLAS: inspeccioná antes de actuar; no repitas tareas hechas; no inventes resultados; no toques archivos
fuera de la tarea sin justificarlo; nunca push --force, reset --hard ni rebase sobre ramas publicadas; no
afirmes que un push o merge salió bien sin verificarlo; si hay conflictos con trabajo ajeno, detenete.
```

### Fabri

```text
Soy Fabri (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `fabri`.
Guía: docs/prompts-diarios.md. Hoy integro en main ÚLTIMO (después de Lean y Fran).

OBJETIVO DEL DÍA: test de aceptación de alarmas en la pantalla e integrar la rama fabri en main.

ANTES DE EMPEZAR: git fetch origin; git checkout fabri; git status -sb; git log --oneline -10;
git log --oneline -8 origin/main. Verificá mis Días 2 a 6. Verificá si Lean y Fran ya integraron
(git log origin/main --oneline | grep "merge:"); si no, hacé la parte 1 y esperá para la parte 2.

ARCHIVOS: views/AlarmasView.vue y views/AlarmasView.test.js (míos).

TAREAS:
1. Agregar tests a AlarmasView.test.js: (a) un OPERADOR ve el botón Aceptar en una alarma pendiente; al
   aceptar con observación se llama POST /api/v1/alarmas/{id}/aceptar con { observacion } y la lista se
   recarga; (b) un usuario TMS ve "Solo un operador o administrador puede aceptarla" y no el botón;
   (c) si el backend responde 409, se muestra el mensaje. Commit "test: aceptar una alarma desde la pantalla".
2. INTEGRACIÓN (cuando Lean y Fran ya integraron): git merge origin/main en fabri → todos los tests →
   git checkout main && git pull origin main && git merge --no-ff fabri -m "merge: fabri - tests de
   monitoreo y polling, respuestas viejas, bloqueo al aceptar alarmas, destinatarios" → tests SOBRE main →
   si pasan, git push origin main. Si hay conflictos con archivos de otros, detenete.
3. Volver a fabri. Levantar docker compose up --build sobre main y verificar que arranca (prueba de humo).

TERMINADO CUANDO: tests de aceptación agregados, main contiene las tres ramas, tests verdes sobre main.
PRUEBAS: frontend y backend completos en fabri y en main; docker compose como prueba de humo (decí si se hizo).
DIFF: git diff antes del commit; git log --oneline main..fabri antes del merge.
PUSH: git push origin fabri y, si corresponde, origin main; verificá los dos.
RESUMEN FINAL: commits, qué entró a main, pruebas, pushes verificados, estado de main para el grupo.

REGLAS: inspeccioná antes de actuar; no repitas tareas hechas; no inventes resultados; no toques archivos
fuera de la tarea sin justificarlo; nunca push --force, reset --hard ni rebase sobre ramas publicadas; no
afirmes que un push o merge salió bien sin verificarlo; si hay conflictos con trabajo ajeno, detenete.
```

---

## Día 8

### Lean

```text
Soy Lean (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `lean`.
Guía: docs/prompts-diarios.md y docs/plan-lean.md.

OBJETIVO DEL DÍA: mostrar el detalle de carga almacenado (registros históricos) en el detalle de la orden.

ANTES DE EMPEZAR: git fetch origin; git checkout lean; git status -sb; git log --oneline -8;
git log --oneline -8 origin/main. Verificá el Día 7 (merge de lean en main). Traé lo que integraron Fran y
Fabri: git merge origin/main (conflictos → detenete). Si el detalle ya muestra la carga, avisame.

ARCHIVOS: backend/.../dto/DetalleCargaResponse.java (masaAcumulada, densidad, temperatura, caudal, fechaHora),
views/OrdenDetalleView.vue y OrdenDetalleView.test.js.

TAREAS:
1. Pedir api(`/api/v1/ordenes/${numero}/detalle`).
2. Sección "Detalle de carga almacenado": cantidad de registros y una tabla con Fecha y hora, Masa acumulada
   (kg), Densidad (3 decimales), Temperatura (°C), Caudal (kg/h).
3. Sin registros: "Esta orden todavía no tiene datos de carga almacenados." (pasa en los estados 1 y 2 sin datos).
4. Una aclaración corta: se guardan según FRECUENCIA_DETALLE_SEGUNDOS, así que puede haber menos registros
   que datos recibidos.
5. Un test nuevo en OrdenDetalleView.test.js para la tabla de carga y otro para el caso sin registros.

TERMINADO CUANDO: con una orden cargada por Postman se ven los registros; sin datos se ve el mensaje.
PRUEBAS: cd frontend && npm test && npm run build. Prueba manual (decí si la hiciste).
DIFF Y COMMIT: git diff; commit "feat: detalle de carga almacenado en el detalle de la orden".
PUSH: git push origin lean; verificá con git log origin/lean -1.
RESUMEN FINAL: qué se hizo, archivos, commit, pruebas, push verificado, pendientes.

REGLAS: inspeccioná antes de actuar; no repitas tareas hechas; no inventes resultados; no toques archivos
fuera de la tarea sin justificarlo; nunca push --force, reset --hard ni rebase sobre ramas publicadas; no
afirmes que un push salió bien sin verificarlo; si hay conflictos con trabajo ajeno, detenete. Código claro,
comentarios en español solo si aportan. Explicame la frecuencia de almacenamiento para poder defenderlo.
```

#### Aprendizaje y defensa oral — Día 8

- **Qué resuelve:** ver los datos históricos de la carga que guardó el sistema (masa, densidad, temperatura y caudal en cada momento).
- **Flujo:** `GET /api/v1/ordenes/1001/detalle` → `CargaService.listarDetalle` lee la tabla de `DetalleCarga` → la pantalla la muestra. Cómo se llenó esa tabla: cada dato válido que manda el sistema de carga actualiza la cabecera, pero solo se **guarda** en el detalle si pasaron N segundos desde el último guardado (`ReglasAlmacenamiento.debeAlmacenar`).
- **Archivos importantes:** `OrdenDetalleView.vue` (mío); para entender: `CargaService` y `ReglasAlmacenamiento` (del parcial).
- **Preguntas posibles:**
  1. *¿Por qué hay menos registros que datos enviados?* Por la frecuencia de almacenamiento: con 10 s y un dato por segundo, en un minuto llegan 60 y se guardan 6, como el ejemplo del enunciado. Con 0 se guardan todos.
  2. *¿Qué datos no aparecen nunca?* Los descartados (caudal ≤ 0, masa ≤ 0 o menor que la anterior, densidad fuera de (0, 1]): no actualizan la cabecera ni se guardan.
  3. *¿De dónde salen los promedios de la conciliación?* De estos mismos registros almacenados (un `AVG` en la consulta), como pide el enunciado.

### Fran

```text
Soy Fran (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `fran`.
Guía: docs/prompts-diarios.md; mi plan: docs/plan-fran.md.

OBJETIVO DEL DÍA: al abrir la aplicación, descartar la sesión guardada si el token ya venció (hoy se muestran
las pantallas y recién el primer pedido da 401).

ANTES DE EMPEZAR: git fetch origin; git checkout fran; git status -sb; git log --oneline -8;
git log --oneline -8 origin/main. Verificá el Día 7 (fran integrado en main). git merge origin/main.
Si auth.js ya revisa el vencimiento, avisame.

ARCHIVOS: stores/auth.js (leerSesion), stores/auth.test.js, LoginView.vue (aviso del Día 6).

TAREAS:
1. El token es un JWT: la parte del medio es JSON en base64url y trae "exp" (segundos desde 1970). Al leer la
   sesión de localStorage, decodificarla (atob, reemplazando - por + y _ por /) y, si exp ya pasó, no restaurar
   la sesión y dejar el aviso de sesión vencida.
2. Si el token está mal formado, tratarlo como sesión inválida (sin romper la app).
3. Aclarar en un comentario corto que esto es solo para la experiencia de uso: la validación real del token
   (firma y vencimiento) la hace el backend.
4. Tests: token vigente → sigue logueado; vencido → no logueado y con aviso; mal formado → no logueado.
   Armá los tokens de prueba en el test (no hace falta firmarlos).

TERMINADO CUANDO: los tests pasan y, con un token vencido en localStorage, al recargar se va al login con el aviso.
PRUEBAS: cd frontend && npm test && npm run build. Prueba manual (decí si la hiciste).
DIFF Y COMMIT: git diff; commit "feat: descartar la sesión guardada si el token ya venció".
PUSH: git push origin fran; verificá con git log origin/fran -1.
RESUMEN FINAL: qué se hizo, archivos, commit, pruebas, push verificado.

REGLAS: inspeccioná antes de actuar; no repitas tareas hechas; no inventes resultados; no toques archivos
fuera de la tarea sin justificarlo; nunca push --force, reset --hard ni rebase sobre ramas publicadas; no
afirmes que un push salió bien sin verificarlo; si hay conflictos con trabajo ajeno, detenete. Código claro
para 4.º año, comentarios en español solo si aportan, sin dependencias nuevas (no agregar jwt-decode).
```

### Fabri

```text
Soy Fabri (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `fabri`.
Guía: docs/prompts-diarios.md; mi plan: docs/plan-fabri.md.

OBJETIVO DEL DÍA: que el polling no superponga pedidos cuando el backend tarda más que el intervalo (punto f del plan).

ANTES DE EMPEZAR: git fetch origin; git checkout fabri; git status -sb; git log --oneline -8;
git log --oneline -8 origin/main. Verificá el Día 7 (fabri integrado en main). git merge origin/main.
Revisá el punto f); si se determinó que no hace falta, proponé otra mejora real de monitoreo, explicámela y
esperá mi confirmación antes de hacerla.

ARCHIVOS: composables/usePolling.js y usePolling.test.js; views/MonitoreoView.vue (solo leerlo: ojo con el
arreglo del Día 4, el contador de pedidos, para no duplicar lógica).

TAREAS:
1. Test que reproduzca el problema: una acción que devuelve una promesa que tarda más de 5 s; con temporizadores
   falsos, ver que hoy se lanza otra antes de que termine la primera.
2. Arreglo en usePolling: si la ejecución anterior todavía no terminó, saltear ese turno. Mantener la firma
   usePolling(accion, cadaMs). Si la acción falla, el polling sigue (no se corta).
3. Los tests del Día 2 siguen pasando.

TERMINADO CUANDO: el test nuevo falla sin el arreglo y pasa con él; MonitoreoView sigue actualizándose cada 5 s.
PRUEBAS: cd frontend && npm test && npm run build.
DIFF Y COMMIT: git diff; commit "fix: el polling no superpone pedidos si el anterior no terminó".
PUSH: git push origin fabri; verificá con git log origin/fabri -1.
RESUMEN FINAL: problema, arreglo, archivos, commit, pruebas, push verificado.

REGLAS: inspeccioná antes de actuar; no repitas tareas hechas; no inventes resultados; no toques archivos
fuera de la tarea sin justificarlo; nunca push --force, reset --hard ni rebase sobre ramas publicadas; no
afirmes que un push salió bien sin verificarlo; si hay conflictos con trabajo ajeno, detenete. Código claro
para 4.º año, comentarios en español solo si aportan, sin dependencias nuevas.
```

---

## Día 9 — Integración entre módulos

### Lean

```text
Soy Lean (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `lean`.
Guía: docs/prompts-diarios.md y docs/plan-lean.md.

OBJETIVO DEL DÍA: un componente visual para el estado de la orden, usado en el listado y el detalle, y un
link desde Conciliaciones al detalle de la orden.

ANTES DE EMPEZAR: git fetch origin; git checkout lean; git status -sb; git log --oneline -8;
git log --oneline -8 origin/main. Verificá el Día 8 (detalle de carga). git merge origin/main.
Si ya existe components/EstadoBadge.vue, avisame.

ARCHIVOS: crear frontend/src/components/EstadoBadge.vue. Modificar OrdenesView.vue, OrdenDetalleView.vue,
ConciliacionesView.vue (es mía) y sus tests si cambian textos. Leer style.css (colores existentes).

TAREAS:
1. EstadoBadge.vue: recibe la prop estado (por ejemplo 'CON_PESAJE_INICIAL') y muestra textoEstado(estado)
   dentro de un <span> con un color por estado (4 clases CSS scoped). Sin lógica extra.
2. Usarlo en la columna Estado del listado y en la cabecera del detalle (reemplaza "estadoNumero · descripción").
3. En ConciliacionesView, debajo de la tabla de conciliación: link "Ver orden completa" a
   /ordenes/{numeroOrden} (RouterLink).
4. Actualizar los tests que dependan del texto del estado y agregar uno de EstadoBadge (muestra el texto correcto).
5. Avisale a Fabri que EstadoBadge está disponible (lo puede usar en Monitoreo cuando llegue a main), pero
   no toques MonitoreoView.

TERMINADO CUANDO: el estado se ve igual en listado y detalle, el link de Conciliaciones funciona y los tests pasan.
PRUEBAS: cd frontend && npm test && npm run build.
DIFF Y COMMIT: dos commits: "feat: componente EstadoBadge para mostrar el estado de la orden" y
"feat: link desde Conciliaciones al detalle de la orden".
PUSH: git push origin lean; verificá con git log origin/lean -1.
RESUMEN FINAL: qué se hizo, archivos, commits, pruebas, push verificado, aviso a Fabri.

REGLAS: inspeccioná antes de actuar; no repitas tareas hechas; no inventes resultados; no toques archivos
fuera de la tarea sin justificarlo; nunca push --force, reset --hard ni rebase sobre ramas publicadas; no
afirmes que un push salió bien sin verificarlo; si hay conflictos con trabajo ajeno, detenete. Código claro,
comentarios en español solo si aportan. Explicame qué son las props para poder defenderlo.
```

#### Aprendizaje y defensa oral — Día 9

- **Qué resuelve:** el estado se muestra igual (mismo texto y color) en todas las pantallas, y desde una conciliación se llega a la orden completa (con su historial y su detalle de carga).
- **Flujo:** `OrdenesView` dibuja `<EstadoBadge :estado="o.estado" />` → el componente recibe `estado` como prop → `textoEstado(estado)` busca el texto en `utils/estados.js` → la clase CSS le da el color.
- **Archivos importantes:** `components/EstadoBadge.vue`, `utils/estados.js`, `ConciliacionesView.vue`.
- **Preguntas posibles:**
  1. *¿Qué es una prop?* Un dato que el componente padre le pasa al hijo. El hijo no lo modifica, solo lo muestra.
  2. *¿Por qué un componente y no copiar el `<span>` en cada pantalla?* Se usa en varios lugares: si cambia un color o un texto, se cambia en un solo archivo.
  3. *¿Por qué el link a la orden está en Conciliaciones?* La conciliación muestra números finales; para entender una diferencia rara conviene ver el historial y los datos de carga de esa orden.

### Fran

```text
Soy Fran (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `fran`.
Guía: docs/prompts-diarios.md; mi plan: docs/plan-fran.md.

OBJETIVO DEL DÍA: asegurar con tests los permisos de las consultas que usa la sección Órdenes de Lean (contrato
entre módulos): GET /ordenes, /ordenes/{n}, /historial-estados, /detalle y /conciliacion.

ANTES DE EMPEZAR: git fetch origin; git checkout fran; git status -sb; git log --oneline -8;
git log --oneline -8 origin/main. Verificá el Día 8. git merge origin/main.

ARCHIVOS: security/SecurityConfig.java, test/controller/SeguridadTest.java (ver qué cubre
consultasLasPuedeUsarCualquierUsuarioLogueado), TestAuth.java. Modificar SeguridadTest.java.

TAREAS:
1. Revisar qué endpoints GET ya están probados por rol y cuáles no. No duplicar lo que ya está.
2. Agregar lo que falte: cada uno de los 5 roles puede hacer los GET de consulta (200, o 404 si la orden no
   existe, pero nunca 403); sin token → 401 con el formato de ErrorResponse; un GET de conciliación de una
   orden no finalizada → 409 (no 403).
3. Si encontrás un permiso mal configurado, NO lo cambies sin explicármelo antes: es un contrato con Lean y Fabri.
4. Revisar a mano, con el frontend de main, que las pantallas de Lean (Órdenes) y Fabri (Monitoreo) muestran
   bien el aviso de sesión vencida (Días 6 y 8). Si algo no anda, anotalo y avisale al dueño de la pantalla.

TERMINADO CUANDO: los permisos de las consultas están cubiertos por tests y todo el backend pasa.
PRUEBAS: backend completo; frontend si tocaste algo. Prueba manual de sesión vencida (decí si la hiciste).
DIFF Y COMMIT: git diff; commit "test: permisos de las consultas de órdenes por rol".
PUSH: git push origin fran; verificá con git log origin/fran -1.
RESUMEN FINAL: qué ya estaba cubierto, qué agregaste, commit, pruebas, push verificado, observaciones para Lean y Fabri.

REGLAS: inspeccioná antes de actuar; no repitas tareas hechas; no inventes resultados; no toques archivos
fuera de la tarea sin justificarlo; nunca push --force, reset --hard ni rebase sobre ramas publicadas; no
afirmes que un push salió bien sin verificarlo; si hay conflictos con trabajo ajeno, detenete.
```

### Fabri

```text
Soy Fabri (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `fabri`.
Guía: docs/prompts-diarios.md; mi plan: docs/plan-fabri.md.

OBJETIVO DEL DÍA: integrar el monitoreo con la sección Órdenes de Lean: usar la lista de estados compartida y
enlazar cada orden con su detalle.

DEPENDENCIA: necesito utils/estados.js y la ruta /ordenes/:numero de Lean EN MAIN. Verificalo:
git fetch origin && git show origin/main:frontend/src/utils/estados.js && git grep -n "ordenes/:numero"
origin/main -- frontend/src/router/index.js. Si no están, NO los copies: avisame y hacé solo lo que no dependa de eso.

ANTES DE EMPEZAR: git checkout fabri; git status -sb; git log --oneline -8; git merge origin/main
(conflictos → detenete). Verificá el Día 8 (polling sin superposición).

ARCHIVOS: views/MonitoreoView.vue y MonitoreoView.test.js (míos); leer utils/estados.js (de Lean, no lo modifiques).

TAREAS:
1. Reemplazar la lista ESTADOS de MonitoreoView por ESTADOS_ORDEN de utils/estados.js (más la opción "Todos").
   Ojo: MonitoreoView usaba "2 · Cargando" como texto; si preferís mantener ese texto, hablalo con Lean
   antes de cambiar estados.js (es suyo).
2. El número de orden de cada fila: RouterLink a /ordenes/{numeroOrden}.
3. Opcional: si EstadoBadge de Lean ya está en main, usarlo en la columna Estado.
4. Actualizar MonitoreoView.test.js (los textos de estado, el link).

TERMINADO CUANDO: el monitoreo usa la lista compartida, cada orden enlaza a su detalle y los tests pasan.
PRUEBAS: cd frontend && npm test && npm run build.
DIFF Y COMMIT: git diff; commit "refactor: el monitoreo usa la lista de estados compartida y enlaza al detalle de la orden".
PUSH: git push origin fabri; verificá con git log origin/fabri -1.
RESUMEN FINAL: dependencia verificada (sí/no), qué se hizo, archivos, commit, pruebas, push verificado.

REGLAS: inspeccioná antes de actuar; no repitas tareas hechas; no inventes resultados; no toques archivos
fuera de la tarea sin justificarlo; nunca push --force, reset --hard ni rebase sobre ramas publicadas; no
afirmes que un push salió bien sin verificarlo; si hay conflictos con trabajo ajeno, detenete.
```

---

## Día 10 — Validaciones, errores y casos límite

### Lean

```text
Soy Lean (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `lean`.
Guía: docs/prompts-diarios.md y docs/plan-lean.md.

OBJETIVO DEL DÍA: buscar una orden por número (con validación simple) y manejar bien los casos límite de la
sección Órdenes: orden inexistente, cargando, listas vacías.

ANTES DE EMPEZAR: git fetch origin; git checkout lean; git status -sb; git log --oneline -8;
git log --oneline -8 origin/main. Verificá el Día 9 (EstadoBadge y link de Conciliaciones).
git merge origin/main (conflictos → detenete).

ARCHIVOS: views/OrdenesView.vue, views/OrdenDetalleView.vue y sus tests.

TAREAS:
1. Buscador en OrdenesView: un input "Buscar orden n°" y un botón "Ver". Validación antes de navegar: tiene que
   ser un entero positivo (solo dígitos, mayor a 0). Si no, mensaje "Ingresá un número de orden válido" y no
   se navega. Si es válido, router.push(`/ordenes/${numero}`).
2. Detalle con una orden inexistente: el backend responde 404 con { mensaje } ("No existe la orden …"). Mostrar
   ese mensaje, ocultar las secciones vacías y dejar el link para volver al listado.
3. Mientras se cargan los datos, mostrar "Cargando…" (en el listado y en el detalle), y no mostrar "No hay
   órdenes" antes de que llegue la respuesta.
4. Tests: número inválido ("abc", "0", "-3") muestra el mensaje y no navega; número válido navega; 404 muestra el
   mensaje del backend; "Cargando…" aparece antes de que responda el fetch falso.

TERMINADO CUANDO: los casos de arriba funcionan a mano y con tests.
PRUEBAS: cd frontend && npm test && npm run build. Prueba manual de /ordenes/999999 (decí si la hiciste).
DIFF Y COMMIT: dos commits: "feat: buscar una orden por número desde el listado" y
"fix: mensajes de orden inexistente y de carga en la sección Órdenes".
PUSH: git push origin lean; verificá con git log origin/lean -1.
RESUMEN FINAL: qué se hizo, archivos, commits, pruebas, push verificado, pendientes.

REGLAS: inspeccioná antes de actuar; no repitas tareas hechas; no inventes resultados; no toques archivos
fuera de la tarea sin justificarlo; nunca push --force, reset --hard ni rebase sobre ramas publicadas; no
afirmes que un push salió bien sin verificarlo; si hay conflictos con trabajo ajeno, detenete. Código claro,
comentarios en español solo si aportan. Explicame las validaciones para poder defenderlas.
```

#### Aprendizaje y defensa oral — Día 10

- **Qué resuelve:** ir directo a una orden sabiendo su número, y que la pantalla responda bien cuando algo sale mal (la orden no existe, el backend tarda o no hay datos).
- **Flujo del buscador:** escribo "1001" → al tocar "Ver" se valida con una expresión simple (solo dígitos y mayor que 0) → si es válido, `router.push('/ordenes/1001')`; si no, aparece el mensaje y no se hace ningún pedido. Flujo del 404: el backend lanza `RecursoNoEncontradoException` → `GlobalExceptionHandler` responde 404 con `{ mensaje }` → `leerError` (de Fran) arma un `Error` con ese mensaje → la pantalla lo muestra.
- **Archivos importantes:** `OrdenesView.vue`, `OrdenDetalleView.vue` y sus tests.
- **Preguntas posibles:**
  1. *¿Por qué validar en el frontend si el backend también valida?* Para avisar al instante y no hacer pedidos inútiles. La validación que manda es la del backend: si se le pasa un valor inválido, responde 400 o 404 igual.
  2. *¿Qué pasa si escribo "12a"?* No pasa la validación (no son solo dígitos): se muestra el mensaje y no se navega.
  3. *¿Por qué el estado "Cargando…"?* Sin él, la tabla vacía mostraría "No hay órdenes" durante un instante aunque sí haya. La variable `cargando` distingue "todavía no sé" de "no hay".

### Fran

```text
Soy Fran (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `fran`.
Guía: docs/prompts-diarios.md; mi plan: docs/plan-fran.md.

OBJETIVO DEL DÍA: casos límite del login: contraseña de más de 72 bytes (límite de BCrypt) y largos máximos de
usuario y contraseña (punto h del plan).

ANTES DE EMPEZAR: git fetch origin; git checkout fran; git status -sb; git log --oneline -8;
git log --oneline -8 origin/main. Verificá el Día 9. git merge origin/main. Revisá el punto h).

ARCHIVOS: dto/LoginRequest.java, security/AuthService.java, exception/GlobalExceptionHandler.java,
model/Usuario.java (largo de username), test/controller/SeguridadTest.java.

TAREAS:
1. Reproducir con un test: login con una contraseña de 100 caracteres. Anotar el status real (en las
   versiones nuevas de Spring Security, BCryptPasswordEncoder rechaza más de 72 bytes con una excepción;
   verificá qué pasa acá: si da 500, es un error a corregir).
2. Corregir con Bean Validation en LoginRequest (@Size en username según la columna y en password con máximo
   72), así la respuesta es 400 con el formato de siempre. Pensá si 72 caracteres alcanza (bytes vs caracteres
   con tildes) y dejalo explicado en una línea.
3. Tests: contraseña de 100 → 400; usuario vacío → 400; login correcto sigue dando 200.
4. Verificar que el frontend muestra bien ese 400 en LoginView (el mensaje sale de leerError).

TERMINADO CUANDO: ningún login responde 500; los casos dan 400 o 401 según corresponda y todo pasa.
PRUEBAS: backend completo; frontend (npm test).
DIFF Y COMMIT: git diff; commit "fix: limitar el largo de usuario y contraseña en el login (BCrypt usa 72 bytes)".
PUSH: git push origin fran; verificá con git log origin/fran -1.
RESUMEN FINAL: comportamiento antes y después, archivos, commit, pruebas, push verificado.

REGLAS: inspeccioná antes de actuar; no repitas tareas hechas; no inventes resultados; no toques archivos
fuera de la tarea sin justificarlo; nunca push --force, reset --hard ni rebase sobre ramas publicadas; no
afirmes que un push salió bien sin verificarlo; si hay conflictos con trabajo ajeno, detenete. Código claro
para 4.º año, comentarios en español solo si aportan, sin dependencias nuevas.
```

### Fabri

```text
Soy Fabri (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `fabri`.
Guía: docs/prompts-diarios.md; mi plan: docs/plan-fabri.md.

OBJETIVO DEL DÍA: cubrir los casos límite de las alarmas que todavía no tienen test.

ANTES DE EMPEZAR: git fetch origin; git checkout fabri; git status -sb; git log --oneline -8;
git log --oneline -8 origin/main. Verificá el Día 9. git merge origin/main.

ARCHIVOS: service/AlarmaService, dto/AceptarAlarmaRequest (@Size 500), controller/AlarmaController,
test/controller/AlarmasTest y ConfiguracionAlarmaTest, test/service/CalculosMonitoreoTest.

TAREAS:
1. Listar qué casos ya están cubiertos (no repetirlos). Revisar al menos:
   a) temperatura EXACTAMENTE igual al umbral → no alarma (la regla es "supera");
   b) alarma pendiente en la orden A no impide que la orden B alarme;
   c) aceptar una alarma inexistente → 404;
   d) observación de más de 500 caracteres → 400;
   e) GET /alarmas?estado=PENDIENTE y ?estado=ACEPTADA filtran bien;
   f) ETA con masa mayor que el preset (0) y con caudal 0 o null (null).
2. Agregar solo los tests que falten. Si alguno muestra un error real, explicámelo antes de corregir el código.

TERMINADO CUANDO: los casos a-f están cubiertos (por tests nuevos o existentes, indicando cuál) y todo pasa.
PRUEBAS: backend completo. Informá los totales reales.
DIFF Y COMMIT: git diff; commit "test: casos límite de alarmas y monitoreo".
PUSH: git push origin fabri; verificá con git log origin/fabri -1.
RESUMEN FINAL: tabla caso → test que lo cubre, commit, pruebas, push verificado.

REGLAS: inspeccioná antes de actuar; no repitas tareas hechas; no inventes resultados; no toques archivos
fuera de la tarea sin justificarlo; nunca push --force, reset --hard ni rebase sobre ramas publicadas; no
afirmes que un push salió bien sin verificarlo; si hay conflictos con trabajo ajeno, detenete. Código claro
para 4.º año, comentarios en español solo si aportan, sin dependencias nuevas.
```

---

## Día 11 — Pruebas funcionales y correcciones

### Lean

```text
Soy Lean (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `lean`.
Guía: docs/prompts-diarios.md y docs/plan-lean.md.

OBJETIVO DEL DÍA: probar la sección Órdenes con el sistema completo (Docker Compose + Postman) y corregir lo que
aparezca. Hoy NO edito la colección de Postman (le toca a Fran).

ANTES DE EMPEZAR: git fetch origin; git checkout lean; git status -sb; git log --oneline -8;
git log --oneline -8 origin/main. Verificá el Día 10 (buscador y casos límite). git merge origin/main.

TAREAS:
1. docker compose up --build (desde la rama lean, que ya tiene lo último de main). Si no arranca, anotá el error real.
2. Correr la colección: npx newman run postman/IW3-ordenes-de-carga.postman_collection.json. Anotá cuántos
   requests y tests pasaron o fallaron (números reales).
3. En http://localhost:3000, con operador / demo1234, recorrer: Órdenes → filtro por cada estado → buscador
   (válido, inválido, inexistente) → detalle de la orden del circuito (cabecera, historial con sap, tms, carga,
   tms, detalle de carga) → Conciliaciones → "Ver orden completa". Repetir con el usuario tms (solo lectura:
   tiene que poder ver todo). Si Fran ya integró el aviso de sesión vencida, probalo; si no, anotalo como pendiente.
4. Corregir los errores encontrados en MIS archivos (un commit por corrección: "fix: …"). Si el error está en
   archivos de otro, anotalo y avisale; no lo corrijas vos.
5. Registrar los resultados en docs/partes/lean.md, sección "Pruebas funcionales (Día 11)": qué se probó,
   resultado real, problemas y correcciones. Commit "docs: resultados de las pruebas funcionales de la sección Órdenes".
6. docker compose down al terminar.

TERMINADO CUANDO: todo el recorrido está probado y registrado, y lo que falló está corregido o anotado con su responsable.
PRUEBAS: newman, recorrido manual, npm test y npm run build después de cada corrección.
DIFF Y COMMIT: git diff antes de cada commit.
PUSH: git push origin lean; verificá con git log origin/lean -1.
RESUMEN FINAL: resultados reales, correcciones, commits, push verificado, problemas de otros módulos.

REGLAS: inspeccioná antes de actuar; no repitas tareas hechas; no inventes resultados (si algo no se pudo
probar, decilo); no toques archivos fuera de la tarea sin justificarlo; nunca push --force, reset --hard ni
rebase sobre ramas publicadas; no afirmes que un push salió bien sin verificarlo; si hay conflictos con
trabajo ajeno, detenete.
```

#### Aprendizaje y defensa oral — Día 11

- **Qué resuelve:** los tests automáticos prueban piezas aisladas; hoy se prueba **todo junto**, como lo va a usar el profesor: base MySQL real, backend, frontend servido por nginx y datos creados por la colección de Postman.
- **Flujo:** `docker compose up` levanta 4 contenedores (MySQL, backend, frontend, Mailpit) → newman ejecuta el circuito completo de una orden (SAP → TMS → carga → cierre → pesaje final) → reviso en el navegador que mis pantallas muestran esa orden correctamente.
- **Archivos importantes:** `docker-compose.yml` y `postman/…json` (solo los uso); `docs/partes/lean.md` (donde registro los resultados).
- **Preguntas posibles:**
  1. *¿Qué diferencia hay entre los tests de Vitest y esta prueba?* Vitest simula el backend y prueba una pantalla sola; esto prueba el sistema real de punta a punta.
  2. *¿Por qué el usuario tms puede ver las órdenes?* Todos los GET están permitidos para cualquier usuario logueado (decisión 15 de `decisiones.md`); los roles restringen las operaciones que **modifican** datos.
  3. *¿Cómo llega el frontend al backend dentro de Docker?* nginx reenvía `/api` al contenedor del backend, así el navegador habla con un solo origen y no hace falta CORS.

### Fran

```text
Soy Fran (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `fran`.
Guía: docs/prompts-diarios.md; mi plan: docs/plan-fran.md. Hoy SOLO YO edito la colección de Postman.

OBJETIVO DEL DÍA: agregar a la colección de Postman los casos de seguridad y validación nuevos, y probar la
seguridad con el sistema completo.

ANTES DE EMPEZAR: git fetch origin; git checkout fran; git status -sb; git log --oneline -8;
git log --oneline -8 origin/main. Verificá el Día 10. git merge origin/main.

ARCHIVOS: postman/IW3-ordenes-de-carga.postman_collection.json (ver cómo están armados 00b, 00c, 03 y 03b:
tokens por rol, variables, tests con pm.test). Modificarla con cuidado: es JSON, validalo al terminar.

TAREAS:
1. Agregar, siguiendo la numeración y el estilo existentes: token adulterado → 401; login con contraseña de
   más de 72 caracteres → 400; alta de orden con cisternas repetidas → 400; alta con un nombre de 256
   caracteres → 400. Cada uno con su pm.test del status y del campo "mensaje".
2. Validar el JSON (por ejemplo, node -e "JSON.parse(require('fs').readFileSync(...))").
3. docker compose up --build y npx newman run … con la colección completa: números reales de requests y tests.
4. Probar a mano en el navegador: sesión vencida (JWT_EXPIRACION_MINUTOS=1 en un .env local que NO se sube),
   login inválido, Salir.
5. Corregir lo que falle en mis archivos; lo de otros, anotarlo y avisar.
6. Registrar los resultados en docs/partes/fran.md, sección "Pruebas funcionales (Día 11)".

TERMINADO CUANDO: la colección pasa completa con newman y los resultados quedan registrados.
PRUEBAS: newman con la colección completa (números reales), JSON validado, y backend y frontend completos si
corregiste código. Decí qué no se pudo correr.
DIFF Y COMMIT: git diff --stat; commits "test: casos de seguridad y validación en la colección de Postman" y
"docs: resultados de las pruebas funcionales de seguridad".
PUSH: git push origin fran; verificá con git log origin/fran -1. docker compose down al terminar.
RESUMEN FINAL: resultados reales de newman, correcciones, commits, push verificado.

REGLAS: inspeccioná antes de actuar; no repitas tareas hechas; no inventes resultados; no toques archivos
fuera de la tarea sin justificarlo; nunca push --force, reset --hard ni rebase sobre ramas publicadas; no
commitees .env; no afirmes que un push salió bien sin verificarlo; si hay conflictos con trabajo ajeno, detenete.
```

### Fabri

```text
Soy Fabri (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `fabri`.
Guía: docs/prompts-diarios.md; mi plan: docs/plan-fabri.md. Hoy NO edito la colección de Postman (le toca a Fran).

OBJETIVO DEL DÍA: prueba de punta a punta de monitoreo y alarmas con Docker Compose y Mailpit, y corregir lo que aparezca.

ANTES DE EMPEZAR: git fetch origin; git checkout fabri; git status -sb; git log --oneline -8;
git log --oneline -8 origin/main. Verificá el Día 10. git merge origin/main.

TAREAS:
1. docker compose up --build. Con Postman o curl (usuarios de demo): crear una orden, tara, habilitar y mandar
   datos con masa creciente cada pocos segundos.
2. En http://localhost:3000 (operador): Monitoreo se actualiza solo, ETA y tiempo transcurrido tienen
   sentido, los filtros y el orden funcionan, el número abre el detalle de la orden.
3. Dato con temperatura sobre el umbral → llega UN mail a Mailpit (http://localhost:8025); más datos sobre el
   umbral → no llegan más; aceptar desde la pantalla con observación → otro dato sobre el umbral → llega un
   segundo mail. Como admin, cambiar umbral y destinatarios y verificar que rige en el próximo dato.
4. Si podés, aceptar la misma alarma desde dos pestañas casi a la vez: una responde OK y la otra 409.
5. Corregir lo que falle en mis archivos; lo de otros, anotarlo y avisar.
6. Registrar los resultados en docs/partes/fabri.md, sección "Pruebas funcionales (Día 11)".

TERMINADO CUANDO: el recorrido completo está probado y registrado con resultados reales.
PRUEBAS: el recorrido manual con Mailpit, y después de cada corrección, npm test, npm run build y los tests del
backend. Decí qué no se pudo probar.
DIFF Y COMMIT: git diff antes de cada commit; correcciones "fix: …" y
"docs: resultados de las pruebas funcionales de monitoreo y alarmas".
PUSH: git push origin fabri; verificá con git log origin/fabri -1. docker compose down al terminar.
RESUMEN FINAL: resultados reales, correcciones, commits, push verificado, problemas de otros módulos.

REGLAS: inspeccioná antes de actuar; no repitas tareas hechas; no inventes resultados; no toques archivos
fuera de la tarea sin justificarlo; nunca push --force, reset --hard ni rebase sobre ramas publicadas; no
afirmes que un push salió bien sin verificarlo; si hay conflictos con trabajo ajeno, detenete.
```

---

## Día 12 — Usabilidad, consistencia y calidad

### Lean

```text
Soy Lean (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `lean`.
Guía: docs/prompts-diarios.md y docs/plan-lean.md.

OBJETIVO DEL DÍA: que la sección Órdenes se vea bien en pantallas chicas, tenga textos consistentes y código
prolijo, sin cambiar lo que funciona.

ANTES DE EMPEZAR: git fetch origin; git checkout lean; git status -sb; git log --oneline -8;
git log --oneline -8 origin/main. Verificá el Día 11 (pruebas funcionales registradas). git merge origin/main.

ARCHIVOS: mis vistas y componentes (OrdenesView, OrdenDetalleView, EstadoBadge, estados.js, ConciliacionesView),
style.css (solo si hace falta una regla general; si la cambiás, avisá al grupo).

TAREAS:
1. Pantallas chicas: con el navegador en 375 px de ancho, las tablas anchas no tienen que romper la página
   (por ejemplo, un contenedor con overflow-x: auto). Revisar listado, detalle y conciliaciones.
2. Textos: tildes, mayúsculas y unidades (kg, °C, kg/h) iguales en todas mis pantallas y coherentes con Monitoreo.
3. Código: revisá el diff completo de todo lo mío desde la base (git diff <commit base> -- <mis archivos>):
   código repetido entre listado y detalle, nombres poco claros, comentarios que repiten el código. Corregí solo
   lo que mejore la lectura; nada de reescrituras grandes.
4. Accesibilidad básica: labels en el select y el input del buscador, el link de cada orden se puede usar con el teclado.

TERMINADO CUANDO: se ve bien a 375 px, textos consistentes, tests y build verdes.
PRUEBAS: cd frontend && npm test && npm run build; revisión visual (decí en qué navegador y ancho).
DIFF Y COMMIT: commits chicos por tema, por ejemplo "fix: tablas de la sección Órdenes en pantallas chicas" y
"refactor: textos y nombres consistentes en la sección Órdenes".
PUSH: git push origin lean; verificá con git log origin/lean -1.
RESUMEN FINAL: qué se mejoró y por qué, commits, pruebas, push verificado.

REGLAS: inspeccioná antes de actuar; no repitas tareas hechas; no inventes resultados; no toques archivos
fuera de la tarea sin justificarlo; nunca push --force, reset --hard ni rebase sobre ramas publicadas; no
afirmes que un push salió bien sin verificarlo; si hay conflictos con trabajo ajeno, detenete. No cambies
código que funciona solo para que se vea distinto.
```

#### Aprendizaje y defensa oral — Día 12

- **Qué resuelve:** que la sección se pueda usar desde una tablet o un celular en planta, y que el código quede fácil de leer para cualquiera del grupo.
- **Flujo:** no cambia el flujo de datos. Cambia cómo se dibuja: la tabla queda dentro de un contenedor que se desplaza horizontalmente en lugar de ensanchar toda la página.
- **Archivos importantes:** mis vistas y, si hizo falta, `style.css`.
- **Preguntas posibles:**
  1. *¿Por qué `overflow-x: auto` y no achicar la letra?* La tabla mantiene todas sus columnas legibles y se desplaza solo esa parte, no toda la página.
  2. *¿Qué refactorizaste y por qué?* Solo lo que mejoraba la lectura (nombres, repeticiones). Sin cambiar el comportamiento, y con los tests como red de seguridad.
  3. *¿Para qué sirven los `<label>`?* Asocian el texto con el campo: se puede hacer click en el texto, y los lectores de pantalla saben qué se está completando.

### Fran

```text
Soy Fran (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `fran`.
Guía: docs/prompts-diarios.md; mi plan: docs/plan-fran.md.

OBJETIVO DEL DÍA: revisión de calidad de mi parte y registrar las decisiones nuevas de seguridad en docs/decisiones.md.

ANTES DE EMPEZAR: git fetch origin; git checkout fran; git status -sb; git log --oneline -8;
git log --oneline -8 origin/main. Verificá el Día 11. git merge origin/main.

TAREAS:
1. Revisar el diff completo de mi trabajo desde la base (git log --oneline --author="<mi nombre>" y
   git diff <commit base> -- backend/src/main/java/ar/edu/iua/iw3/security backend/src/main/java/ar/edu/iua/iw3/dto
   frontend/src/stores frontend/src/api frontend/src/views/LoginView.vue): código muerto, nombres poco claros,
   comentarios que sobran o que quedaron desactualizados. Corregir solo eso.
2. docs/decisiones.md, sección 3 (solo la mía), decisiones nuevas numeradas desde 50: usuario en memoria
   desactivado, validación y aviso del JWT_SECRET, validaciones del alta (cisternas, largos), aviso de sesión
   vencida y descarte del token vencido en el frontend, límite de 72 bytes. Formato: decisión | por qué
   (igual que las existentes).
3. No tocar las secciones de Lean y Fabri.

TERMINADO CUANDO: el código revisado y las decisiones documentadas; tests verdes.
PRUEBAS: backend y frontend completos.
DIFF Y COMMIT: "refactor: limpieza del código de seguridad" (solo si hubo cambios) y "docs: decisiones de seguridad nuevas".
PUSH: git push origin fran; verificá con git log origin/fran -1.
RESUMEN FINAL: qué se limpió, decisiones agregadas, commits, pruebas, push verificado.

REGLAS: inspeccioná antes de actuar; no repitas tareas hechas; no inventes resultados; no toques archivos
fuera de la tarea sin justificarlo; nunca push --force, reset --hard ni rebase sobre ramas publicadas; no
afirmes que un push salió bien sin verificarlo; si hay conflictos con trabajo ajeno, detenete.
```

### Fabri

```text
Soy Fabri (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `fabri`.
Guía: docs/prompts-diarios.md; mi plan: docs/plan-fabri.md.

OBJETIVO DEL DÍA: regenerar docs/openapi.json con las validaciones nuevas, registrar mis decisiones y revisar la
calidad de mi parte.

DEPENDENCIA: openapi.json tiene que reflejar las validaciones de Fran (Días 5 y 10). Verificá que estén en main:
git log origin/main --oneline | grep -i "validar". Si no están, regenerá igual pero avisá que hay que repetirlo
después de su merge.

ANTES DE EMPEZAR: git fetch origin; git checkout fabri; git status -sb; git log --oneline -8; git merge origin/main.
Verificá el Día 11.

TAREAS:
1. Levantar el backend (perfil h2 o docker compose) y guardar GET http://localhost:8080/v3/api-docs con formato
   legible en docs/openapi.json. Revisar con git diff que los cambios sean los esperados (validaciones nuevas, sin
   ruido de formato). Si el diff es enorme solo por el formato, formatealo igual que el archivo existente.
2. docs/decisiones.md, sección 4 (solo la mía), decisiones nuevas desde 60: respuestas viejas en monitoreo,
   bloqueo pesimista al aceptar una alarma, destinatarios normalizados, polling sin superposición.
3. Revisar el diff de mi trabajo desde la base: código muerto, nombres, comentarios desactualizados. Corregir solo eso.

TERMINADO CUANDO: openapi.json actualizado y verificado, decisiones escritas, tests verdes.
PRUEBAS: backend y frontend completos.
DIFF Y COMMIT: "docs: openapi.json con las validaciones nuevas", "docs: decisiones de monitoreo y alarmas nuevas"
y, si hubo cambios, "refactor: limpieza de monitoreo y alarmas".
PUSH: git push origin fabri; verificá con git log origin/fabri -1.
RESUMEN FINAL: commits, pruebas, push verificado, si la dependencia con Fran estaba resuelta.

REGLAS: inspeccioná antes de actuar; no repitas tareas hechas; no inventes resultados; no toques archivos
fuera de la tarea sin justificarlo; nunca push --force, reset --hard ni rebase sobre ramas publicadas; no
afirmes que un push salió bien sin verificarlo; si hay conflictos con trabajo ajeno, detenete.
```

---

## Día 13 — Documentación y README

Fran y Fabri actualizan **su** `docs/partes/<nombre>.md` temprano y lo pushean; Lean lo usa para el README. Solo Lean edita `README.md`.

### Lean

```text
Soy Lean (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `lean`.
Guía: docs/prompts-diarios.md y docs/plan-lean.md. Hoy SOLO YO edito README.md.

OBJETIVO DEL DÍA: README completo y fiel a lo que existe, y docs/partes/lean.md con mi trabajo de estas dos semanas.

ANTES DE EMPEZAR: git fetch origin; git checkout lean; git status -sb; git log --oneline -8;
git log --oneline -8 origin/main. Verificá el Día 12. git merge origin/main. Para leer lo que escribieron los
demás: git show origin/fran:docs/partes/fran.md y git show origin/fabri:docs/partes/fabri.md (si todavía no lo
actualizaron, pediles que lo pusheen y usá lo que haya, aclarándolo).

TAREAS:
1. README.md: revisar y completar sin inventar nada (cada dato tiene que salir del código o de una prueba real):
   nombre y descripción; problema y objetivo del TP; funcionalidades (agregar la sección Órdenes: listado,
   filtro, búsqueda, detalle con historial y carga); tecnologías y por qué; requisitos previos; instalación paso
   a paso (incluir "clonar fuera de OneDrive" por Vitest); variables de entorno y .env.example (sin credenciales
   reales); cómo ejecutar (Docker y sin Docker); base de datos (MySQL / H2, tablas principales); estructura de
   carpetas (agregar components/ y utils/estados.js); cómo correr las pruebas, con la cantidad REAL de tests que
   da hoy cada comando; integrantes y responsabilidades reales (las del proyecto original y las de estas dos
   semanas, según docs/partes); flujo de Git y ramas; limitaciones conocidas y pendientes.
2. docs/partes/lean.md: agregar la sección "Sección Órdenes (noviembre)": qué hice, archivos, endpoints que
   uso, cómo se prueba y los resultados del Día 11. No borrar lo que ya estaba (es la historia del parcial y de
   la primera versión del final).
3. docs/plan-lean.md: marcar qué días se completaron y qué cambió respecto del plan.
4. Correr los comandos que cita el README para comprobar que funcionan tal como están escritos.

TERMINADO CUANDO: el README sigue los pasos reales y cada comando citado se probó (o se aclara cuál no).
PRUEBAS: frontend y backend completos (para los números del README); seguir la instalación del README en limpio
si podés (decí si lo hiciste).
DIFF Y COMMIT: "docs: README actualizado con la sección Órdenes, pruebas y responsabilidades" y
"docs: mi parte del trabajo de noviembre en docs/partes/lean.md".
PUSH: git push origin lean; verificá con git log origin/lean -1.
RESUMEN FINAL: qué secciones cambiaron, comandos verificados, commits, push verificado, pendientes.

REGLAS: inspeccioná antes de actuar; no repitas tareas hechas; no inventes funcionalidades, resultados ni
decisiones; no toques archivos fuera de la tarea sin justificarlo; nunca push --force, reset --hard ni rebase
sobre ramas publicadas; no afirmes que un push salió bien sin verificarlo; si hay conflictos con trabajo ajeno,
detenete.
```

#### Aprendizaje y defensa oral — Día 13

- **Qué resuelve:** que cualquiera (el profesor, un compañero) pueda instalar, ejecutar y entender el proyecto solo leyendo el README, y que quede registrado qué hizo cada integrante.
- **Flujo:** leo el código y las partes de cada uno → escribo → ejecuto cada comando del README para comprobar que es correcto → corrijo lo que no coincida.
- **Archivos importantes:** `README.md`, `docs/partes/lean.md`, `docs/plan-lean.md`.
- **Preguntas posibles:**
  1. *¿Cómo levanto el proyecto desde cero?* `git clone`, y en la raíz `docker compose up --build`. Después http://localhost:3000 con `admin` / `demo1234`. Sin Docker: backend con `./mvnw spring-boot:run -Dspring-boot.run.profiles=h2` y frontend con `npm install && npm run dev`.
  2. *¿Dónde se configuran las credenciales?* En variables de entorno o en un `.env` que no se sube. Hay un `.env.example` de muestra; los valores por defecto son solo de desarrollo.
  3. *¿Qué limitaciones conocidas tiene?* Las que figuran en el README (por ejemplo, actualización por polling en lugar de WebSockets y token en `localStorage`), con el motivo de cada una.

### Fran

```text
Soy Fran (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `fran`.
Guía: docs/prompts-diarios.md; mi plan: docs/plan-fran.md. Hoy NO edito README.md (lo hace Lean).

OBJETIVO DEL DÍA: documentar mi trabajo en docs/partes/fran.md, temprano, para que Lean lo use en el README.

ANTES DE EMPEZAR: git fetch origin; git checkout fran; git status -sb; git log --oneline -8;
git log --oneline -8 origin/main. Verificá el Día 12. git merge origin/main.

TAREAS:
1. docs/partes/fran.md: agregar la sección "Trabajo de noviembre": cada mejora (qué problema había, cómo se
   resolvió, archivos), tests nuevos con la cantidad REAL (correlos hoy) y cómo probar cada cosa a mano. No
   borrar lo que ya estaba. Corregir números de tests desactualizados en el archivo.
2. docs/plan-fran.md: marcar qué se completó y qué cambió.
3. Mandarle a Lean, por el grupo, 3 o 4 líneas para la sección de seguridad del README (o indicarle qué
   párrafo de fran.md usar).
4. Si encontrás que el README dice algo falso sobre seguridad, avisale a Lean; no lo edites vos.

TERMINADO CUANDO: fran.md refleja el trabajo real con números reales y está pusheado temprano.
PRUEBAS: backend y frontend completos (para los números).
DIFF Y COMMIT: "docs: trabajo de noviembre en la parte de Fran".
PUSH: git push origin fran; verificá con git log origin/fran -1. Avisale a Lean.
RESUMEN FINAL: qué se documentó, números reales, commit, push verificado.

REGLAS: inspeccioná antes de actuar; no repitas tareas hechas; no inventes resultados ni decisiones; no toques
archivos fuera de la tarea; nunca push --force, reset --hard ni rebase sobre ramas publicadas; no afirmes que un
push salió bien sin verificarlo.
```

### Fabri

```text
Soy Fabri (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `fabri`.
Guía: docs/prompts-diarios.md; mi plan: docs/plan-fabri.md. Hoy NO edito README.md (lo hace Lean).

OBJETIVO DEL DÍA: documentar mi trabajo en docs/partes/fabri.md y corregir lo que estaba desactualizado, temprano,
para que Lean lo use en el README.

ANTES DE EMPEZAR: git fetch origin; git checkout fabri; git status -sb; git log --oneline -8;
git log --oneline -8 origin/main. Verificá el Día 12. git merge origin/main.

TAREAS:
1. docs/partes/fabri.md: corregir lo desactualizado que encontraste el Día 1 (cantidades de tests, tests que ya no
   existen). Agregar la sección "Trabajo de noviembre": cada mejora (problema, solución, archivos), tests nuevos
   con números REALES (correlos hoy) y cómo probarlo a mano con Mailpit. No borrar lo que sigue siendo cierto.
2. docs/plan-fabri.md: marcar qué se completó y qué cambió.
3. Mandarle a Lean, por el grupo, 3 o 4 líneas para la sección de monitoreo y alarmas del README.

TERMINADO CUANDO: fabri.md es fiel al código actual y está pusheado temprano.
PRUEBAS: backend y frontend completos (para los números).
DIFF Y COMMIT: "docs: trabajo de noviembre y correcciones en la parte de Fabri".
PUSH: git push origin fabri; verificá con git log origin/fabri -1. Avisale a Lean.
RESUMEN FINAL: qué se documentó y corrigió, números reales, commit, push verificado.

REGLAS: inspeccioná antes de actuar; no repitas tareas hechas; no inventes resultados ni decisiones; no toques
archivos fuera de la tarea; nunca push --force, reset --hard ni rebase sobre ramas publicadas; no afirmes que un
push salió bien sin verificarlo.
```

---

## Día 14 — Revisión final, integración estable y defensa oral

Orden: **Lean → Fran → Fabri** integran en `main`. Después de Fabri, Lean hace la verificación final desde un clon limpio. **No se agregan funcionalidades nuevas.**

### Lean

```text
Soy Lean (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `lean`.
Guía: docs/prompts-diarios.md (ver la checklist de entrega al final). Hoy NO se agregan funcionalidades.

OBJETIVO DEL DÍA: integrar lean en main por última vez, verificar main desde un clon limpio cuando las tres ramas
estén integradas y prepararme para la defensa.

ANTES DE EMPEZAR: git fetch origin; git checkout lean; git status -sb (sin cambios pendientes);
git log --oneline -10; git log --oneline -10 origin/main. Verificá el Día 13.

TAREAS:
1. INTEGRACIÓN: git merge origin/main → tests completos → git checkout main && git pull origin main &&
   git merge --no-ff lean -m "merge: lean - documentación final y ajustes de la sección Órdenes" → tests sobre
   main → git push origin main. Si hay conflictos, detenete. Avisá al grupo.
2. Cuando Fran y Fabri también integraron (git log origin/main --oneline | grep "merge:"), VERIFICACIÓN FINAL
   en una carpeta nueva fuera de OneDrive: git clone … verif-final && cd verif-final; docker compose up --build;
   npx newman run postman/…json; npm ci && npm test && npm run build en frontend/; tests del backend; recorrer
   las pantallas (login, Monitoreo, Alarmas, Conciliaciones, Órdenes). Completar la checklist de entrega con
   resultados REALES.
3. Si algo falla en main: NO lo arregles en main. Avisá al dueño, que lo corrige en su rama y lo integra.
4. DEFENSA: armá docs/defensa-lean.md juntando las secciones "Aprendizaje y defensa oral" de los Días 1 a 13,
   con un ejemplo concreto para demostrar cada funcionalidad (qué orden crear con Postman y qué mostrar en
   pantalla), y el recorrido de 3 minutos de mi parte. Que esté escrito para que lo entienda estudiando el código.
5. Verificar que ninguna rama tiene trabajo sin integrar que debería estar en main:
   git log --oneline origin/main..origin/lean (y lo mismo con fran y fabri).

TERMINADO CUANDO: main tiene todo, se verificó desde un clon limpio, la checklist está completa con resultados
reales y docs/defensa-lean.md existe.
PRUEBAS: backend y frontend completos en lean y sobre main después del merge; en el clon limpio, docker compose,
newman, npm test, npm run build y los tests del backend. Números reales; decí qué no se pudo correr.
DIFF Y COMMIT: "docs: guía de defensa oral de Lean" y, si corresponde, "docs: checklist de entrega verificada".
PUSH: git push origin lean (y main si hubo merge); verificá los dos.
RESUMEN FINAL: estado final de las 4 ramas (git ls-remote origin), resultados reales de la verificación, la
checklist, commits y lo que quede pendiente con su responsable.

REGLAS: inspeccioná antes de actuar; no inventes resultados; nunca push --force, reset --hard ni rebase sobre
ramas publicadas; no borres ramas; no afirmes que un push o merge salió bien sin verificarlo; si hay conflictos
con trabajo ajeno, detenete.
```

#### Aprendizaje y defensa oral — Día 14

- **Qué resuelve:** asegurar que lo que se entrega (la rama `main`) funciona desde cero en otra máquina, y llegar a la defensa entendiendo mi parte.
- **Flujo de la demo de mi parte (3 minutos):** login como `operador` → **Órdenes**: filtro "4 · Finalizada" → buscar la orden del circuito por número → detalle: cabecera (SAP, camión con cisternas, fechas), historial (sap, tms, carga, tms) y detalle de carga → **Conciliaciones** → "Ver orden completa" vuelve al mismo detalle. Mostrar también una orden inexistente (mensaje del 404) y un número inválido en el buscador.
- **Archivos importantes:** todos los de la sección Órdenes y `docs/defensa-lean.md`.
- **Preguntas posibles:**
  1. *¿Qué parte del sistema hiciste vos en estas dos semanas?* La sección Órdenes del frontend (listado, filtro, búsqueda, detalle con historial y carga, componente de estado) y la documentación. Usa endpoints que ya existían: no hizo falta cambiar el backend.
  2. *¿Cómo sabés que funciona?* Tests de Vitest de cada pantalla, más una prueba completa con Docker Compose y la colección de Postman (resultados en `docs/partes/lean.md`).
  3. *Si mañana el backend agrega un campo a la orden, ¿qué cambiás?* Solo la pantalla de detalle: el dato llega en el mismo JSON (`OrdenResponse`), y lo muestro con una fila más en la tabla.

### Fran

```text
Soy Fran (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `fran`.
Guía: docs/prompts-diarios.md (checklist al final). Hoy NO se agregan funcionalidades. Integro DESPUÉS de Lean.

OBJETIVO DEL DÍA: integrar fran en main por última vez y prepararme para la defensa de seguridad.

ANTES DE EMPEZAR: git fetch origin; git checkout fran; git status -sb (sin cambios pendientes);
git log --oneline -10; git log --oneline -10 origin/main. Verificá el Día 13 y que Lean ya integró hoy.

TAREAS:
1. INTEGRACIÓN: git merge origin/main → tests completos → git checkout main && git pull origin main &&
   git merge --no-ff fran -m "merge: fran - documentación final de seguridad" → tests sobre main →
   git push origin main. Si hay conflictos, detenete. Avisá al grupo.
2. Revisar los puntos de seguridad de la checklist de entrega (roles, 401/403, JWT_SECRET, ningún .env en el
   repo: git ls-files | grep -i env) y anotar los resultados reales.
3. DEFENSA: armá docs/defensa-fran.md: autenticación vs autorización, cómo viaja el JWT, qué valida
   JwtAuthFilter, por qué CSRF está desactivado, BCrypt y el límite de 72 bytes, el aviso de sesión vencida, y
   una demo concreta (login con tms → 403 al crear una orden; token adulterado → 401).
4. Verificar: git log --oneline origin/main..origin/fran (no tiene que quedar nada sin integrar).

TERMINADO CUANDO: main tiene todo lo de fran, tests verdes sobre main y docs/defensa-fran.md existe.
PRUEBAS: backend y frontend completos en fran y sobre main después del merge (números reales).
DIFF Y COMMIT: "docs: guía de defensa oral de Fran".
PUSH: git push origin fran (y main si hubo merge); verificá los dos.
RESUMEN FINAL: estado de main, resultados de los puntos de seguridad, commits, push verificado.

REGLAS: inspeccioná antes de actuar; no inventes resultados; nunca push --force, reset --hard ni rebase sobre
ramas publicadas; no borres ramas; no afirmes que un push o merge salió bien sin verificarlo; si hay conflictos
con trabajo ajeno, detenete.
```

### Fabri

```text
Soy Fabri (TP Ingeniería Web 3). Repo: https://github.com/leandrosposito/Ingenieria-Web-3, rama `fabri`.
Guía: docs/prompts-diarios.md (checklist al final). Hoy NO se agregan funcionalidades. Integro ÚLTIMO.

OBJETIVO DEL DÍA: integrar fabri en main por última vez y prepararme para la defensa de monitoreo y alarmas.

ANTES DE EMPEZAR: git fetch origin; git checkout fabri; git status -sb (sin cambios pendientes);
git log --oneline -10; git log --oneline -10 origin/main. Verificá el Día 13 y que Lean y Fran ya integraron hoy.

TAREAS:
1. INTEGRACIÓN: git merge origin/main → tests completos → git checkout main && git pull origin main &&
   git merge --no-ff fabri -m "merge: fabri - documentación final de monitoreo y alarmas" → tests sobre main →
   git push origin main. Si hay conflictos, detenete. Avisá a Lean para que haga la verificación final.
2. Revisar los puntos de monitoreo y alarmas de la checklist (ETA, tiempo transcurrido, filtros, un solo mail
   hasta aceptar, configuración por admin) con docker compose y Mailpit, y anotar los resultados reales.
3. DEFENSA: armá docs/defensa-fabri.md: ETA y tiempo transcurrido, polling vs WebSockets, evento +
   @TransactionalEventListener + @Async, bloqueo al aceptar, el problema N+1 y join fetch, y una demo concreta
   (dato a 200 °C → mail en Mailpit → aceptar → nuevo mail).
4. Verificar: git log --oneline origin/main..origin/fabri (no tiene que quedar nada sin integrar).

TERMINADO CUANDO: main tiene todo lo de fabri, tests verdes sobre main y docs/defensa-fabri.md existe.
PRUEBAS: backend y frontend completos en fabri y sobre main después del merge; docker compose con Mailpit para
los puntos de la checklist (números y resultados reales).
DIFF Y COMMIT: "docs: guía de defensa oral de Fabri".
PUSH: git push origin fabri (y main si hubo merge); verificá los dos.
RESUMEN FINAL: estado de main, resultados de los puntos de monitoreo y alarmas, commits, push verificado.

REGLAS: inspeccioná antes de actuar; no inventes resultados; nunca push --force, reset --hard ni rebase sobre
ramas publicadas; no borres ramas; no afirmes que un push o merge salió bien sin verificarlo; si hay conflictos
con trabajo ajeno, detenete.
```

---

## Checklist de entrega final

Completar el Día 14 **con resultados reales**, verificando sobre un clon limpio de `main`.

### Funcionalidades (enunciado)
- [ ] Punto 1: SAP crea la orden y sincroniza camión, chofer, cliente y producto por código externo → estado 1
- [ ] Punto 2: TMS registra la tara y se genera la contraseña de 5 dígitos → estado 2
- [ ] Punto 3: habilitar carga con contraseña (devuelve el preset); datos en tiempo real con descarte y frecuencia de almacenamiento
- [ ] Punto 4: cierre → estado 3; los datos posteriores se rechazan (409)
- [ ] Punto 5: pesaje final → estado 4, con conciliación; `GET /conciliacion` solo en estado 4
- [ ] Log de auditoría de estados con fecha, usuario y observaciones
- [ ] Roles: cada rol solo usa sus endpoints (403), sin token → 401
- [ ] Alarma de temperatura: mail a los destinatarios configurados, un solo mail hasta que se acepte; umbral y mails editables por el admin
- [ ] Frontend: login, monitoreo en tiempo real (filtros, orden, ETA, tiempo transcurrido), alarmas (ver, aceptar con observación), conciliaciones (solo estado 4)
- [ ] Sección Órdenes: listado, filtro, búsqueda, detalle con historial y detalle de carga

### Pruebas (anotar los números)
- [ ] Backend: `./mvnw test` → ___ tests, 0 fallos
- [ ] Frontend: `npm test` → ___ tests, 0 fallos; `npm run build` OK
- [ ] Postman: `npx newman run …` → ___ requests, ___ tests, 0 fallos
- [ ] `docker compose up --build` desde un clon limpio arranca y la web responde en :3000
- [ ] Recorrido manual de todas las pantallas con `operador` y `admin`

### Documentación
- [ ] README: todas las secciones, con comandos verificados y números de tests reales
- [ ] `docs/decisiones.md` con las decisiones nuevas de los tres
- [ ] `docs/partes/lean.md`, `fran.md` y `fabri.md` actualizados y fieles al código
- [ ] `docs/openapi.json` regenerado después de las últimas validaciones
- [ ] Guías de defensa: `docs/defensa-lean.md`, `defensa-fran.md` y `defensa-fabri.md`

### Ramas y repositorio
- [ ] `git ls-remote origin` muestra `main`, `lean`, `fran` y `fabri`
- [ ] `git log origin/main..origin/<rama>` vacío para las tres ramas (nada sin integrar)
- [ ] Commits de cada integrante con su propia identidad (`git shortlog -sne --all`)
- [ ] Ningún push forzado ni rama borrada
- [ ] Sin `.env` ni credenciales reales en el repo (`git ls-files | grep -i env` → solo los `.env.example`)
- [ ] Sin `node_modules/`, `target/` ni `dist/` versionados
