# Plan de trabajo de Lean (rama `lean`)

## Punto de partida

El proyecto se importó desde el repo anterior (`Ing-Web-3`) con todos los requisitos del parcial y del final ya implementados. En estas dos semanas se agregan mejoras reales, sin rehacer lo que ya funciona.

## Qué agrega Lean

Una sección **Órdenes** en el frontend para consultar cualquier orden, no solo las finalizadas (Conciliaciones) o las que se están cargando (Monitoreo):

- **Listado de órdenes** con filtro por estado.
- **Detalle de una orden**: datos de SAP (camión, chofer, cliente, producto), fechas de cada paso, últimos valores de carga, historial de cambios de estado (auditoría) y detalle de carga almacenado.

**Por qué hace falta:** el enunciado pide "administración y monitoreo" de las órdenes y recomienda un log de auditoría para la trazabilidad. El backend ya guarda y expone esa información, pero hoy solo se puede ver desde Swagger o Postman.

**Cómo se hace:** solo con el frontend (Vue). Se usan endpoints que ya existen, sin cambiar el backend:

| Endpoint | Para qué |
|---|---|
| `GET /api/v1/ordenes?estado=` | Listado (el filtro es opcional) |
| `GET /api/v1/ordenes/{numero}` | Cabecera de la orden |
| `GET /api/v1/ordenes/{numero}/historial-estados` | Auditoría de estados |
| `GET /api/v1/ordenes/{numero}/detalle` | Registros de carga almacenados |

## Cronograma

| Día | Tarea | Archivos |
|---|---|---|
| 1 | Repo nuevo, base importada, tests verificados, este plan y la guía de prompts | `docs/plan-lean.md`, `docs/prompts-diarios.md` |
| 2 | Pantalla de listado de órdenes, ruta y link en el menú | `views/OrdenesView.vue`, `router/index.js`, `App.vue` |
| 3 | Filtro por estado en el listado y lista de estados compartida | `views/OrdenesView.vue`, `utils/estados.js` |
| 4 | Tests del listado | `views/OrdenesView.test.js` |
| 5 | Pantalla de detalle: cabecera de la orden | `views/OrdenDetalleView.vue`, `router/index.js` |
| 6 | Historial de estados en el detalle | `views/OrdenDetalleView.vue` |
| 7 | Del listado al detalle con un click, tests del detalle, primer merge a `main` | `OrdenesView.vue`, `OrdenDetalleView.test.js` |
| 8 | Detalle de carga almacenado en el detalle | `views/OrdenDetalleView.vue` |
| 9 | Componente `EstadoBadge` y link desde Conciliaciones al detalle | `components/EstadoBadge.vue`, `views/ConciliacionesView.vue` |
| 10 | Buscar una orden por número (validación) y casos límite: 404, "Cargando…", listas vacías | vistas de órdenes + tests |
| 11 | Prueba completa con Docker Compose y Postman, correcciones | según lo que aparezca, `docs/partes/lean.md` |
| 12 | Pantallas chicas, textos consistentes y revisión del código | vistas de órdenes |
| 13 | README y `docs/partes/lean.md` actualizados | `README.md`, `docs/partes/lean.md` |
| 14 | Merge final a `main`, verificación desde un clon limpio, guía de defensa | `docs/defensa-lean.md` |

El cronograma es una guía: si una tarea termina antes o aparece un error, se ajusta. Los prompts de cada día (para los tres) están en `docs/prompts-diarios.md`.

## Cómo se verifica cada día

```bash
cd frontend
npm test        # tests de Vitest
npm run build   # que compile
```

Cuando se tocan cosas que dependen del backend, también: `cd backend && ./mvnw test` (o con Docker si no hay JDK 21).
