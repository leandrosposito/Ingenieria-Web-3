# Defensa de Fabri · Monitoreo y alarmas

## ¿Cuánto falta para completar la carga?

El backend toma la última medición válida de la orden. En estado 2, con preset y masa conocidos y caudal positivo, calcula las horas restantes como `max(preset − masa acumulada, 0) / caudal`. Con un objetivo de 10 000 kg, 5500 kg cargados y 3000 kg/h, faltan 4500 kg, o **1 h 30 min** si se mantiene ese caudal. Alcanzado el preset, el resultado es cero. Si falta un dato, el caudal es cero o negativo, o la orden está en otro estado, devuelve `null`.

El tiempo transcurrido responde otra pregunta. En estado 2, el backend cuenta los segundos entre el primer dato válido y el instante de la consulta. Si todavía no empezó la carga, devuelve `null`. Vue presenta los valores de la API: redondea el ETA al minuto, muestra 3725 segundos como `01:02:05` y representa un valor desconocido con `-`. Las cuentas están en [CalculosMonitoreo.java](../backend/src/main/java/ar/edu/iua/iw3/service/CalculosMonitoreo.java) y la presentación en [formato.js](../frontend/src/utils/formato.js).

## ¿Por qué consultamos cada pocos segundos?

La tabla necesita la última foto de la carga. Al abrir Monitoreo se hace un GET y se repite cada 5 s. Alarmas usa 10 s. Reutilizamos los endpoints REST con sus permisos y filtros. El costo es una consulta periódica por pantalla abierta y una demora hasta el siguiente refresco. WebSockets permitiría avisar apenas cambia un dato, pero requeriría mantener conexiones, distribuir eventos a los clientes y recuperar el estado al reconectar. Para este TP aceptamos la demora de unos segundos.

Si una consulta del polling sigue en curso, se saltea el turno siguiente. Un cambio de filtro sí puede iniciar otra consulta enseguida. La vista numera los pedidos y solo aplica la respuesta o el error del más reciente. Al salir se limpia el intervalo.

## ¿Qué pasa si dos operadores aceptan la misma alarma?

Dentro de la transacción, `aceptar` lee la fila usando `@Lock(PESSIMISTIC_WRITE)` antes de revisar su estado. El primero que obtiene el bloqueo guarda usuario, hora y observación. Si confirma la transacción, el segundo lee la alarma aceptada y recibe HTTP 409. En pantalla se vuelve a consultar la lista y se conserva el mensaje del conflicto.

Con bloqueo optimista, una columna `@Version` permitiría que ambos leyeran la misma versión. Al actualizar, uno encontraría una versión distinta y habría que traducir ese conflicto a 409. Elegimos el pesimista porque la aceptación es corta y queremos decidir con el estado actual de esa fila. El costo es la espera si dos operadores coinciden. [Consulta del repositorio](../backend/src/main/java/ar/edu/iua/iw3/repository/AlarmaRepository.java)

## ¿Cuándo sale el correo?

Durante la carga se bloquea la orden. Si un dato válido supera estrictamente el umbral y esa orden carece de alarma pendiente, el servicio guarda la alarma y publica un evento con los destinatarios vigentes. La pendiente evita otra notificación por mediciones posteriores de esa misma orden.

`@TransactionalEventListener` procesa el evento después del commit. Así, un rollback evita enviar un aviso por una alarma que nunca se guardó. `@Async` ejecuta el envío en otro hilo para que la respuesta al sistema de carga no dependa de la velocidad del SMTP. Si el envío falla, se registra el error y la alarma sigue visible. Una alarma pendiente evita disparos repetidos, pero el envío por SMTP no garantiza entrega. [NotificadorAlarmas.java](../backend/src/main/java/ar/edu/iua/iw3/service/NotificadorAlarmas.java)

## Demo de tres minutos

Antes del coloquio, levantar Docker Compose, preparar una orden nueva en estado 2 con preset de 10 000 kg, confirmar umbral de 40 °C y dejar listo en Postman el POST a `/api/v1/ordenes/{numeroOrden}/detalle` con el token de carga. Abrir Monitoreo y Alarmas con el usuario operador en localhost:3000 y Mailpit en localhost:8025. Buscar el número de esa orden en Mailpit para contar solo sus correos. En las tres mediciones usar densidad 0.5 y caudal 3000 kg/h.

| Tiempo | Acción y resultado esperado |
|---|---|
| 0:00–1:00 | Enviar masa acumulada 4000 kg y temperatura 45 °C. Mostrar el ETA de 2 h tras el refresco y el primer correo en Mailpit. |
| 1:00–2:00 | Enviar 5500 kg a 48 °C. El ETA pasa a 1 h 30 min y sigue habiendo un solo correo. En Alarmas, aceptar la pendiente con la observación «Temperatura revisada». |
| 2:00–3:00 | Enviar 6000 kg a 50 °C. Aparece una nueva pendiente y llega el segundo correo de esa orden. Mostrar la primera en Aceptadas con el usuario y la observación. |
