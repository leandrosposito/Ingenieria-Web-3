# Parte de Lean: conciliaciones, despliegue y documentación

Rama `lean`. Cuatro cosas:

1. La **pantalla de conciliaciones**.
2. **Docker Compose**: levantar todo el sistema con un solo comando.
3. La **colección de Postman** con login.
4. El **README** con cómo levantar el proyecto y la checklist al día.

---

## 1. Pantalla de conciliaciones

### Qué hace
Una pantalla con dos paneles. A la izquierda, la lista de órdenes **finalizadas** (estado 4). Al hacer click en una, a la derecha aparece su conciliación: tara, pesaje final, producto cargado, neto por balanza, diferencia y los promedios.

### Archivos
| Archivo | Qué tiene |
|---|---|
| `frontend/src/views/ConciliacionesView.vue` | La pantalla completa (lista + detalle). |
| `frontend/src/views/ConciliacionesView.test.js` | 2 tests de la pantalla. |
| `frontend/src/router/index.js` y `App.vue` | La ruta `/conciliaciones` y el link del menú. |

### Cómo funciona (son solo dos llamadas a la API)
1. Al abrirse la pantalla: `GET /api/v1/ordenes?estado=FINALIZADA` → la lista de la izquierda.
2. Al hacer click en una fila: `GET /api/v1/ordenes/{numero}/conciliacion` → la tabla de la derecha.

No hizo falta tocar el backend. La conciliación no se guarda: se calcula cada vez, así nunca queda desactualizada.

Los cálculos (para saber explicarlos):

| Dato | Cuenta |
|---|---|
| Neto por balanza | pesaje final − pesaje inicial |
| Diferencia | neto por balanza − producto cargado |
| Producto cargado | última masa acumulada que midió el caudalímetro |
| Promedios | temperatura, densidad y caudal de los datos almacenados |

No hay refresco automático (una orden finalizada no cambia): hay un botón "Actualizar lista".

---

## 2. Docker Compose

`docker compose up --build` levanta todo el sistema. Son 4 servicios:

| Servicio | Qué es | Puerto en tu PC |
|---|---|---|
| `mysql` | Base de datos (`mysql:8.4`) | no se publica |
| `mailpit` | Servidor de mails de prueba: recibe las alarmas y las muestra en una web | 8025 |
| `backend` | La API; se arma con `backend/Dockerfile` | 8080 |
| `frontend` | Las pantallas, servidas por nginx; se arma con `frontend/Dockerfile` | 3000 |

- Los Dockerfiles tienen dos etapas: una compila (Maven o Node) y la final solo copia el resultado (`.jar` o `dist`), así la imagen no lleva las herramientas de compilación.
- `nginx.conf` devuelve `index.html` para las rutas de Vue y reenvía `/api/` al backend, así el navegador habla con un solo origen (sin CORS).
- Los servicios se encuentran por nombre dentro de la red de Compose (`mysql`, `mailpit`). El backend espera a MySQL con un `healthcheck`.
- Los datos de MySQL están en el volumen `datos-mysql`: `docker compose down` los conserva, `down -v` los borra.
- Los valores `${VAR:-valor}` se pueden pisar con un `.env` (no se sube al repo; hay un `.env.example`).

---

## 3. Colección de Postman

Archivo: `postman/IW3-ordenes-de-carga.postman_collection.json`.

### Qué cambió
- **Un login por usuario de demo** (`00 [Auth] Login sap`, `tms`, `carga`, `operador`, `admin`): cada uno hace `POST /auth/login` y **guarda su token** en una variable de colección (`tokenSap`, `tokenTms`, `tokenCarga`, `tokenOperador`, `tokenAdmin`).
- **Cada request usa el token del sistema que corresponde** (pestaña *Authorization* de cada request, Bearer `{{tokenXxx}}`): `sap` crea órdenes, `tms` hace pesaje inicial y final, `carga` habilita, envía datos y cierra, `operador` consulta y acepta alarmas, `admin` solo cambia la configuración de alarmas. Si un permiso estuviera mal configurado, el request correspondiente fallaría.
- **Ejemplo de 403** (`03b`): `tms` intenta crear una orden; la API responde 403 porque eso es de `sap`.
- **Flujo de alarmas** (`13b` a `13e`): `carga` manda un dato con temperatura de 200 °C → `operador` ve la alarma pendiente de esa orden (`13c`) → la acepta (`13d`, queda `operador`, fecha y observación) → aceptarla de nuevo da 409 (`13e`).
- **Historial de estados** (`19`): además del orden de los estados, verifica que los usuarios sean `sap`, `tms`, `carga`, `tms`, o sea que la auditoría guarda el usuario autenticado.
- Dos requests de contraste: `00b` (login con contraseña incorrecta → 401) y `00c` (consulta sin token → 401).
- Al final, consultas de Monitoreo y Alarmas, y la configuración de alarmas con `admin`.
- La variable `passwordDemo` se puede cambiar. Ya no hace falta la variable `usuario`: cada request trae el suyo.

### Cómo se ejecuta
- En Postman: importar el archivo y correr con el **Collection Runner** (el orden importa: el login va primero).
- Por consola: `npx newman run postman/IW3-ordenes-de-carga.postman_collection.json`.
- Resultado verificado contra el backend levantado con el perfil H2: **43 requests, 84 aserciones, 0 fallos**.

---

## 4. README

Se completó: roles y usuarios de demo, los endpoints nuevos, el despliegue con Docker, el stack, la estructura del repo, la configuración (variables de entorno), cómo probar, y la **checklist del examen final** marcada.

---

## Cómo probarlo

```powershell
# 1. Tests del frontend (incluyen la pantalla de conciliaciones)
cd frontend
npm test
npm run build

# 2. Todo el sistema con Docker
cd ..
docker compose up --build -d

# 3. Postman por consola
npx newman run postman/IW3-ordenes-de-carga.postman_collection.json

# 4. A mano: abrir http://localhost:3000, entrar con admin / demo1234,
#    ir a "Conciliaciones" y hacer click en una orden de la lista.
#    (la lista tiene datos después de correr el paso 3)

# 5. Apagar
docker compose down -v
```

---

## 5. Pruebas funcionales

Se probó la sección **Órdenes** con el sistema completo levantado con `docker compose up --build`.

**Postman / Newman** (`npx newman run postman/IW3-ordenes-de-carga.postman_collection.json`):

| Requests | Fallidos | Assertions | Fallidas |
|----------|----------|------------|----------|
| 43       | 0        | 84         | 0        |

**Recorrido en el navegador** (usuarios `operador` y `tms`), usando la orden que genera la colección de Postman (499065501):

| Caso | Resultado |
|------|-----------|
| Listado de órdenes | OK, muestra la orden con su badge de estado |
| Filtro "1 · Pendiente de pesaje inicial" | OK, muestra "No hay órdenes para mostrar." |
| Filtro "4 · Finalizada" | OK, aparece la orden |
| Buscador con `0` | OK, mensaje de error y no navega |
| Buscador con `999999` (inexistente) | OK, muestra "No existe la orden..." y el botón "← Volver al listado" |
| Detalle de la orden | OK: cabecera completa, historial con 4 cambios en orden cronológico (alta por SAP → Finalizada) y 6 mediciones de carga |
| Conciliaciones → "Ver orden completa" | OK, abre `/ordenes/499065501` |
| Consola del navegador | Sin errores |

**Tests y build del frontend:** `npm test` (36 tests, 7 archivos) y `npm run build` pasan.

**Observaciones:**
- No se encontraron bugs en `OrdenesView`, `OrdenDetalleView`, `EstadoBadge` ni el router, por lo que no hubo commits de fix.
- En la máquina de prueba el puerto 3000 estaba ocupado por otro proyecto, así que el frontend se publicó temporalmente en el 3001 con un archivo override fuera del repo. El `docker-compose.yml` no se modificó.
- Los datos de la orden de Postman incluyen una temperatura de 200 °C (es para disparar la alarma), por eso la conciliación muestra una diferencia de -900 kg.
- Se repitió el recorrido con el usuario `tms` (listado, detalle completo y orden inexistente): mismo resultado que con `operador`, sin 403 ni errores de consola.

---

---

## 6. Calidad, responsive y documentación (Día 9)

Se revisó la sección Órdenes y Conciliaciones a **375 px de ancho** (celular).

**Qué había mal:** las tablas de listado (Órdenes, Conciliaciones, historial y mediciones del detalle) se salían de la pantalla y la barra de menú no entraba en una línea.

**Qué se cambió:**

| Archivo | Cambio |
|---|---|
| `frontend/src/style.css` | Clase `.tabla-scroll` (`overflow-x: auto` + ancho mínimo de la tabla) y, en pantallas de hasta 600 px, la barra de navegación pasa a dos filas con el menú desplazable. |
| `OrdenesView.vue`, `OrdenDetalleView.vue`, `ConciliacionesView.vue` | Las tablas de listado van dentro de `<div class="tabla-scroll">`. |
| `ConciliacionesView.vue` | Los colores fijos pasaron a las variables CSS del tema, y `o.camion?.patente` / `o.cliente?.razonSocial` (si faltara un dato, antes la pantalla se rompía). |
| `ConciliacionesView.vue`, `OrdenDetalleView.vue` | Las grillas usan `minmax(0, 1fr)`: sin eso una columna de grilla no se achica por debajo de su contenido y la página se ensanchaba. |

**Cómo se verificó:** con el sistema en Docker, se abrió cada pantalla en un `iframe` de 375 px y se comparó `scrollWidth` con `clientWidth` de la página: **Inicio, Órdenes, Detalle de orden y Conciliaciones no desbordan** (las tablas anchas se desplazan dentro de su propio contenedor).

**Unidades:** se revisaron las tres vistas: masa y pesajes en `kg`, temperatura en `°C`, caudal en `kg/h`, capacidad de camión y cisternas en `L`. La densidad no lleva unidad (es relativa al agua).

**Números de hoy (4/11/2026, con los cambios de `main` ya integrados):**

| Qué | Resultado |
|---|---|
| `./mvnw test` | 62 tests, 0 fallos |
| `npm test` | 63 tests, 10 archivos, 0 fallos |
| `npm run build` | OK |
| Newman (con Docker) | 43 requests, 84 aserciones, 0 fallos |

