# Plan de trabajo — Fabri (días 1 a 14)

## Estado de la revisión del 30/10/2026

El diagnóstico y el calendario de abajo se conservan como plan inicial. Ya se implementaron
el bloqueo al aceptar alarmas, la normalización de destinatarios, la protección contra
respuestas viejas en Monitoreo y Alarmas, y el polling sin superposición entre sus turnos.
Los errores de aceptación se muestran por separado para que una recarga no los borre.

Verificación local: 49 tests de backend y 33 de frontend pasan; el build de Vite también.
El test concurrente usa operador y administrador, y comprueba el usuario y la observación
del ganador. Los tests de las vistas incluyen respuestas y errores fuera de orden.

Queda validar con Java 21 y MySQL en Docker: esta ejecución local usó Java 22 y H2.
También queda la prueba manual de correo con Mailpit y la revisión con el equipo.

---

## Día 1 — Entorno funcionando y análisis del código

### Pruebas de base

| Suite | Resultado | Comando |
|---|---|---|
| Backend (Maven) | **46 tests, 0 fallos, 0 errores** | `.\mvnw.cmd test` (01:12 min) |
| Frontend (Vitest) | **16 tests, 0 fallos** | `npm test` (3.89 s) |
| Frontend build | **BUILD SUCCESS** (dist/ 111 kB JS, 2.6 kB CSS) | `npm run build` |

Todas las pruebas pasaron sin cambiar una línea de código.

---

## Análisis punto a punto (puntos a–g)

### a) usePolling.js y MonitoreoView.vue no tienen tests en el frontend

**EXISTE el problema.**

- `usePolling.js`: no hay ningún archivo `usePolling.test.js` ni referencia a ese composable en ningún test.
  Evidencia: `Get-ChildItem frontend\src -Recurse` lista solo `formato.test.js`, `AlarmasView.test.js`, `ConciliacionesView.test.js` y `auth.test.js`. No hay test de `usePolling`.
- `MonitoreoView.vue`: tampoco tiene test.
  Evidencia: misma búsqueda. No existe `MonitoreoView.test.js`.

El documento `docs/partes/fabri.md` dice:
> `utils/formato.js` (+ test)

y

> `npm test # 16 tests (incluye AlarmasView.test.js: el formulario de configuración)`

Solo se menciona explícitamente test de `formato.js` y de `AlarmasView`; `usePolling` y `MonitoreoView` no están listados como cubiertos.

---

### b) MonitoreoView: el watch(filtros, cargar) puede mostrar un resultado viejo si las respuestas llegan desordenadas

**EXISTE el problema (race condition latente).**

Código en `MonitoreoView.vue` línea 65:
```js
watch(filtros, cargar)
```

Y `cargar()` (líneas 35–46):
```js
async function cargar() {
  const params = new URLSearchParams(...)
  ...
  ordenes.value = await api(...)   // asigna SIEMPRE el resultado que llegue
}
```

No hay cancelación del pedido anterior. Si el usuario escribe "AB" y luego "A":
1. Sale pedido P1 (?patente=AB) — demora 800 ms.
2. Sale pedido P2 (?patente=A) — demora 100 ms.
3. Llega P2: `ordenes.value` = resultados de "A". ✓
4. Llega P1: `ordenes.value` = resultados de "AB". ✗ — pantalla incorrecta.

La solución estándar es un `AbortController` por pedido o una versión del número de request. No está implementada.

---

### c) AlarmaService.aceptar: findById sin lock puede dejar que dos operadores acepten a la vez

**EXISTE el problema (race condition en aceptación concurrente).**

Código en `AlarmaService.java` líneas 59–69:
```java
@Transactional
public AlarmaResponse aceptar(Long id, AceptarAlarmaRequest req) {
    Alarma alarma = alarmaRepository.findById(id)      // <-- lectura sin lock
            .orElseThrow(...);
    if (alarma.getEstado() == EstadoAlarma.ACEPTADA) {  // <-- check
        throw new ConflictoException(...);
    }
    alarma.setEstado(EstadoAlarma.ACEPTADA);
    alarma.setUsuarioAceptacion(UsuarioActual.nombre()); // <-- set
    ...
}
```

Patrón clásico check-then-act sin exclusión mutua:
- Operador A y B llegan al `findById` al mismo tiempo: ambos leen `PENDIENTE`.
- Ambos pasan el if (estado != ACEPTADA).
- Ambos hacen `setEstado(ACEPTADA)` y `setUsuarioAceptacion(...)`.
- El commit del último gana: ambos reciben 200, pero solo queda registrado el usuario del que hizo commit último.

La corrección sería agregar `@Lock(LockModeType.PESSIMISTIC_WRITE)` en el método de repositorio que lee la alarma (igual que `findByNumeroOrdenParaActualizar` en `OrdenRepository`).

---

### d) AlarmaService.evaluar usa split(",") sin trim: espacios en destinatarios

**EXISTE el problema (con matices).**

Código en `AlarmaService.java` línea 47:
```java
List.of(config.getDestinatarios().split(","))
```

Si el valor almacenado tiene espacios (por ejemplo `"a@x.com, b@y.com"`), el segundo destinatario queda `" b@y.com"` con el espacio incluido — muchos servidores de mail lo rechazan.

**Cuándo pasa:**
- `ConfiguracionAlarmaService.actualizar()` línea 39 sí hace trim:
  ```java
  config.setDestinatarios(String.join(",", req.destinatarios().stream().map(String::trim).toList()));
  ```
  → Los destinatarios editados desde la API quedan limpios.
- El valor **inicial** de la propiedad `app.alarma.destinatarios` en `application.properties` es `operaciones@planta.local` (un solo mail, sin coma). No hay problema con el default de producción.
- El valor en los tests (`uno@test.local,dos@test.local`) tampoco tiene espacios.
- Pero si alguien define `ALARMA_DESTINATARIOS=a@x.com, b@y.com` (con espacio) en Docker o en el `.env`, el split genera `" b@y.com"` en el evento `AlarmaCreada`, y ese mail puede ser rechazado por el SMTP.

El bug es real pero solo se activa con variables de entorno mal formadas; nunca se activa a través de la API por el trim de `actualizar()`.

---

### e) AlarmasView.test.js solo prueba la configuración, no el botón Aceptar

**EXISTE el problema.**

`AlarmasView.test.js` tiene exactamente 2 tests:
1. `'el admin ve la configuracion actual y puede guardarla'` — prueba el formulario config.
2. `'un operador no ve el formulario ni pide la configuracion'` — prueba el ocultamiento del form.

Ambos simulan un backend que devuelve `[]` (lista vacía) para `/api/v1/alarmas`. No hay ningún test que:
- Monte la vista con una alarma pendiente.
- Verifique que aparece el botón **Aceptar**.
- Haga click en Aceptar y verifique que se llama a `POST /api/v1/alarmas/{id}/aceptar`.

Evidencia: líneas 11–15 de `AlarmasView.test.js`:
```js
const cuerpo = url.includes('/configuracion')
  ? (opciones.method === 'PUT' ? JSON.parse(opciones.body) : CONFIG)
  : []   // <-- alarmas siempre vacío
```

---

### f) usePolling: si un pedido tarda más de 5 s, se superponen pedidos

**EXISTE el problema.**

`usePolling.js` completo:
```js
export function usePolling(accion, cadaMs) {
  let temporizador = null
  onMounted(() => {
    accion()
    temporizador = setInterval(accion, cadaMs)  // dispara cada 5 s sin importar si el anterior terminó
  })
  onUnmounted(() => clearInterval(temporizador))
}
```

`setInterval` dispara la `accion` cada 5 s incondicionalmente. Si la `accion` (la llamada a la API) demora más de 5 s por un problema de red o servidor lento, se lanza una nueva antes de que la anterior termine. Con N segundos de demora y polling cada 5 s habrá ⌊N/5⌋ requests activas en paralelo.

En la práctica, con la API local o Docker el timeout es bajo y el problema raramente ocurre. La solución estándar es usar un `setTimeout` recursivo que solo dispara el siguiente pedido después de que terminó el anterior.

---

### g) docs/partes/fabri.md: verificación de cantidades y nombres de tests

**Discrepancia menor encontrada.**

El documento dice:
> `46 tests en total. Los de Fabri: CalculosMonitoreoTest, MonitoreoTest, AlarmasTest y ConfiguracionAlarmaTest`

Y en el frontend:
> `16 tests (incluye AlarmasView.test.js: el formulario de configuración)`

Conteo real de tests de Fabri en el backend (verificado con `mvnw test`):

| Clase | Tests |
|---|---|
| `CalculosMonitoreoTest` | 6 |
| `MonitoreoTest` | 4 |
| `AlarmasTest` | 5 |
| `ConfiguracionAlarmaTest` | 4 |
| **Total Fabri backend** | **19** |

Los nombres de los tests coinciden exactamente:
- `CalculosMonitoreoTest`: `etaEsLoQueFaltaDividoElCaudal`, `etaEsCeroSiYaSeLlegoAlPreset`, `etaNoSeCalculaSinCaudalValidoOSinDatos`, `etaSoloParaOrdenesEnEstado2`, `tiempoTranscurridoEsLaDiferenciaConElInicioDeCarga`, `tiempoTranscurridoSoloEnEstado2YConCargaIniciada`
- `MonitoreoTest`: `calculaEtaYTiempoSoloEnEstado2`, `filtraPorEstadoYPatente`, `ordenaPorLaColumnaPedida`, `requiereEstarLogueado`
- `AlarmasTest`: `sinSuperarElUmbralNoHayAlarmaNiMail`, `superarElUmbralMandaUnSoloMailHastaQueSeAcepta`, `siFallaElMailLaAlarmaIgualQuedaGuardadaYElDatoSeAcepta`, `unDatoDescartadoNoGeneraAlarma`, `elMailNoDemoraLaRespuestaDelDato`
- `ConfiguracionAlarmaTest`: `laConfiguracionInicialSaleDeLasPropiedades`, `soloAdminPuedeVerlaYCambiarla`, `rechazaValoresInvalidos`, `elCambioRigeEnElProximoDatoSinReiniciar`

**El total de 46 del backend y 16 del frontend es correcto.** Los nombres de las clases citadas también son correctos. La única imprecisión es que el doc no detalla cuántos tests tiene cada clase de Fabri — no es un error, solo falta de detalle.

---

## Resumen de puntos a–g

| Punto | ¿Existe el problema? | Evidencia |
|---|---|---|
| **a** usePolling y MonitoreoView sin test | ✅ Existe | No hay `*.test.js` para ninguno de los dos |
| **b** Race condition de filtro de patente | ✅ Existe | `watch(filtros, cargar)` sin AbortController — línea 65 MonitoreoView.vue |
| **c** Race condition en aceptar alarma | ✅ Existe | `findById` sin lock — línea 60 AlarmaService.java |
| **d** split(",") sin trim en destinatarios | ✅ Existe (latente) | Línea 47 AlarmaService.java; solo afecta variable de entorno con espacios |
| **e** AlarmasView.test.js no prueba Aceptar | ✅ Existe | 2 tests solo de config; fetch falso devuelve `[]` para alarmas |
| **f** usePolling superpone pedidos lentos | ✅ Existe | `setInterval` sin guardia — línea 9 usePolling.js |
| **g** Cantidades y nombres de tests en fabri.md | ⚠️ Menor imprecisión | Nombres correctos; no detalla el conteo por clase (19 tests Fabri en backend) |

---

## Plan de trabajo días 2–14

Criterio de prioridad: primero los bugs que afectan correctitud en producción (c, d), luego cobertura de tests (a, e), luego mejoras defensivas (b, f).

| Día | Tarea | Archivos afectados |
|---|---|---|
| **2** | Agregar `@Lock(PESSIMISTIC_WRITE)` en `AlarmaRepository` para `aceptar` (fix punto **c**) y escribir test de concurrencia en `AlarmasTest`. | `AlarmaRepository.java`, `AlarmaService.java`, `AlarmasTest.java` |
| **3** | Agregar `.trim()` en el `split(",")` de `AlarmaService.evaluar` (fix punto **d**). Verificar con test que envía `"a@x.com, b@y.com"` vía variable de entorno simulada. | `AlarmaService.java`, `AlarmasTest.java` |
| **4** | Escribir test del botón **Aceptar** en `AlarmasView.test.js` (fix punto **e**): montar con alarma pendiente, hacer click, verificar llamada POST. | `AlarmasView.test.js` |
| **5** | Escribir test de `usePolling.js` (parte del punto **a**): verificar que llama `accion()` al montar y luego cada N ms; verificar que al desmontar se detiene. Usar `vi.useFakeTimers()`. | `usePolling.test.js` (nuevo) |
| **6** | Escribir test de `MonitoreoView.vue` (parte del punto **a**): montar con fetch simulado, verificar que la tabla muestra las órdenes; verificar filtro de patente y ordenamiento. | `MonitoreoView.test.js` (nuevo) |
| **7** | Corregir la race condition del filtro de patente en `MonitoreoView` (fix punto **b**): implementar `AbortController` en `cargar()` para cancelar el pedido anterior al disparar uno nuevo. Ampliar test del día 6 para verificarlo. | `MonitoreoView.vue`, `MonitoreoView.test.js` |
| **8** | Corregir `usePolling` para evitar superposición (fix punto **f**): reemplazar `setInterval` por `setTimeout` recursivo que espera a que termine el pedido anterior. Actualizar test del día 5. | `usePolling.js`, `usePolling.test.js` |
| **9** | Verificar en conjunto: correr suite completa backend + frontend, verificar que los 46 + 16 tests (más los nuevos) pasan. Actualizar `docs/partes/fabri.md` con los tests nuevos y el detalle de conteo por clase. | `docs/partes/fabri.md` |
| **10** | Prueba de integración manual con Docker Compose: levantar todo, verificar flujo completo de alarma (dato → mail → aceptar → segundo mail), filtro de patente, polling automático. | — |
| **11** | Buffer para resolver cualquier problema encontrado en los días 9–10 o feedback del equipo. | — |
| **12** | Preparación para el coloquio: repasar `docs/decisiones.md` sección 4, poder explicar cada decisión (20–28, 37–38). Ensayar respuesta a "¿por qué `@TransactionalEventListener`?", "¿por qué `@Async`?", "¿qué es el N+1?". | — |
| **13** | Revisión cruzada con Lean y Fran: verificar que el Docker Compose levanta todo junto, que los tokens demo funcionan desde Postman, que las rutas `/monitoreo` y `/alarmas` arrancan correctamente. | — |
| **14** | Cierre: commit final con todos los cambios de la semana en rama `fabri`, verificar `git log origin/fabri`, revisar que no quedaron archivos modificados sin commitear. | — |

### Notas del plan

- Los días 2–8 producen cambios de código; cada uno termina con `git add -p` + commit descriptivo + push a `fabri`.
- No se tocan archivos fuera de la responsabilidad de Fabri (no modificar `CargaService.java` más allá de lo mínimo para el fix del punto d, no tocar rutas ni seguridad que son de Fran).
- Si algún fix genera conflicto con la rama `main` o con otra rama del equipo, se detiene y se coordina antes de continuar.
- Los tests nuevos siguen el estilo existente: Vitest + `@vue/test-utils` en el frontend, JUnit 5 + MockMvc en el backend.
