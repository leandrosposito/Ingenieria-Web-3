<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../api/http'
import EstadoBadge from '../components/EstadoBadge.vue'
import { textoEstado } from '../utils/estados'
import { formatearFechaHora, formatearNumero } from '../utils/formato'

const route = useRoute()
const numero = route.params.numero

const orden = ref(null)
const error = ref('')
const cargando = ref(true)

const historial = ref([])
const errorHistorial = ref('')

const detalleCarga = ref([])
const errorDetalleCarga = ref('')

const textoChofer = computed(() => {
  const c = orden.value?.chofer
  return c ? `${c.nombre} ${c.apellido} (Doc: ${c.documento})` : '-'
})
const textoCliente = computed(() => {
  const c = orden.value?.cliente
  return c ? `${c.razonSocial} (${c.contacto})` : '-'
})
const textoProducto = computed(() => {
  const p = orden.value?.producto
  return p ? `${p.nombre} - ${p.descripcion}` : '-'
})
const textoCisternas = computed(() => {
  const cisternas = orden.value?.camion?.cisternas || []
  return cisternas.map((c) => `C${c.numero}: ${c.capacidadLitros} L`).join(' | ') || '-'
})

async function cargarOrden() {
  try {
    orden.value = await api(`/api/v1/ordenes/${numero}`)
    error.value = ''
  } catch (e) {
    error.value = e.message
  }
}

async function cargarHistorial() {
  try {
    historial.value = await api(`/api/v1/ordenes/${numero}/historial-estados`)
    errorHistorial.value = ''
  } catch (e) {
    errorHistorial.value = e.message
  }
}

async function cargarDetalleCarga() {
  try {
    detalleCarga.value = await api(`/api/v1/ordenes/${numero}/detalle`)
    errorDetalleCarga.value = ''
  } catch (e) {
    errorDetalleCarga.value = e.message
  }
}

async function cargarTodo() {
  await cargarOrden()
  cargando.value = false
  // Si la orden no existe (404) no tiene sentido pedir el historial ni las mediciones
  if (orden.value) {
    cargarHistorial()
    cargarDetalleCarga()
  }
}

onMounted(cargarTodo)
</script>

<template>
  <div class="cabecera-detalle">
    <RouterLink to="/ordenes" class="volver">← Volver al listado</RouterLink>
    <div class="titulo-orden">
      <h1>Orden {{ numero }}</h1>
      <EstadoBadge v-if="orden" :estado="orden.estado" />
    </div>
  </div>

  <p v-if="cargando" class="cargando">Cargando...</p>
  <p v-else-if="error" class="error">{{ error }}</p>

  <div v-if="orden" class="resumen">
    <div class="kpi">
      <span class="kpi-etiqueta">Preset</span>
      <strong>{{ formatearNumero(orden.preset, 0) }} kg</strong>
    </div>
    <div class="kpi">
      <span class="kpi-etiqueta">Masa acumulada</span>
      <strong>{{ formatearNumero(orden.ultimaMasaAcumulada) }} kg</strong>
    </div>
    <div class="kpi">
      <span class="kpi-etiqueta">Temperatura</span>
      <strong>{{ formatearNumero(orden.ultimaTemperatura) }} °C</strong>
    </div>
    <div class="kpi">
      <span class="kpi-etiqueta">Caudal</span>
      <strong>{{ formatearNumero(orden.ultimoCaudal) }} kg/h</strong>
    </div>
  </div>

  <div v-if="orden" class="contenedor-tablas">
    <section class="bloque">
      <h2>Datos generales</h2>
      <table>
        <tbody>
          <tr><th>Número de orden</th><td>{{ orden.numeroOrden }}</td></tr>
          <tr><th>Fecha prevista de carga</th><td>{{ formatearFechaHora(orden.fechaPrevistaCarga) }}</td></tr>
          <tr><th>Fecha de recepción</th><td>{{ formatearFechaHora(orden.fechaRecepcion) }}</td></tr>
        </tbody>
      </table>
    </section>

    <section class="bloque">
      <h2>Camión y Transporte</h2>
      <table>
        <tbody>
          <tr><th>Patente</th><td>{{ orden.camion?.patente || '-' }}</td></tr>
          <tr><th>Descripción</th><td>{{ orden.camion?.descripcion || '-' }}</td></tr>
          <tr><th>Capacidad total</th><td>{{ formatearNumero(orden.camion?.capacidadTotalLitros, 0) }} L</td></tr>
          <tr><th>Cisternas</th><td>{{ textoCisternas }}</td></tr>
        </tbody>
      </table>
    </section>

    <section class="bloque">
      <h2>Chofer, Cliente y Producto</h2>
      <table>
        <tbody>
          <tr><th>Chofer</th><td>{{ textoChofer }}</td></tr>
          <tr><th>Cliente</th><td>{{ textoCliente }}</td></tr>
          <tr><th>Producto</th><td>{{ textoProducto }}</td></tr>
        </tbody>
      </table>
    </section>

    <section class="bloque">
      <h2>Circuito de Carga</h2>
      <table>
        <tbody>
          <tr>
            <th>Pesaje inicial (tara)</th>
            <td>{{ formatearNumero(orden.pesajeInicial) }} kg ({{ formatearFechaHora(orden.fechaPesajeInicial) }})</td>
          </tr>
          <tr>
            <th>Inicio de carga</th>
            <td>{{ formatearFechaHora(orden.fechaInicioCarga) }}</td>
          </tr>
          <tr>
            <th>Fin de carga</th>
            <td>{{ formatearFechaHora(orden.fechaFinCarga) }}</td>
          </tr>
          <tr>
            <th>Pesaje final</th>
            <td>{{ formatearNumero(orden.pesajeFinal) }} kg ({{ formatearFechaHora(orden.fechaPesajeFinal) }})</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="bloque">
      <h2>Último dato recibido</h2>
      <p class="aclaracion">Masa, temperatura y caudal están en las tarjetas de arriba.</p>
      <table>
        <tbody>
          <tr><th>Densidad</th><td>{{ formatearNumero(orden.ultimaDensidad, 3) }}</td></tr>
          <tr><th>Fecha del último dato</th><td>{{ formatearFechaHora(orden.fechaUltimoDato) }}</td></tr>
        </tbody>
      </table>
    </section>

    <section class="bloque ancho">
      <h2>Historial de estados (auditoría)</h2>
      <p v-if="errorHistorial" class="error">{{ errorHistorial }}</p>
      <div v-else class="tabla-scroll">
      <table class="tabla-listado">
        <thead>
          <tr>
            <th>Fecha y hora</th>
            <th>Estado anterior</th>
            <th>Estado nuevo</th>
            <th>Usuario</th>
            <th>Observaciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(h, idx) in historial" :key="idx">
            <td>{{ formatearFechaHora(h.fechaHora) }}</td>
            <td>{{ h.estadoAnterior ? textoEstado(h.estadoAnterior) : '(alta de la orden)' }}</td>
            <td>{{ textoEstado(h.estadoNuevo) }}</td>
            <td>{{ h.usuario }}</td>
            <td>{{ h.observaciones || '-' }}</td>
          </tr>
          <tr v-if="historial.length === 0">
            <td colspan="5">No hay cambios de estado registrados.</td>
          </tr>
        </tbody>
      </table>
      </div>
    </section>

    <section class="bloque ancho">
      <h2>Detalle de carga almacenado</h2>
      <p class="aclaracion">
        Registros históricos de la carga. Se almacenan según FRECUENCIA_DETALLE_SEGUNDOS, por lo que puede haber menos registros que datos recibidos en tiempo real.
      </p>
      <p v-if="errorDetalleCarga" class="error">{{ errorDetalleCarga }}</p>
      <template v-else>
        <p v-if="detalleCarga.length === 0" class="vacio">
          Esta orden todavía no tiene datos de carga almacenados.
        </p>
        <div v-else class="tabla-scroll">
        <table class="tabla-listado">
          <thead>
            <tr>
              <th>Fecha y hora</th>
              <th>Masa acumulada</th>
              <th>Densidad</th>
              <th>Temperatura</th>
              <th>Caudal</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, idx) in detalleCarga" :key="idx">
              <td>{{ formatearFechaHora(d.fechaHora) }}</td>
              <td>{{ formatearNumero(d.masaAcumulada) }} kg</td>
              <td>{{ formatearNumero(d.densidad, 3) }}</td>
              <td>{{ formatearNumero(d.temperatura) }} °C</td>
              <td>{{ formatearNumero(d.caudal) }} kg/h</td>
            </tr>
          </tbody>
        </table>
        </div>
      </template>
    </section>
  </div>
</template>

<style scoped>
.cabecera-detalle { margin-bottom: 1.25rem; }
.titulo-orden { display: flex; align-items: center; gap: 0.9rem; flex-wrap: wrap; }
.titulo-orden h1 { margin: 0; }

.resumen { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
.kpi {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.9rem 1.1rem;
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-left: 4px solid var(--acento);
  border-radius: var(--radio);
  box-shadow: var(--sombra);
}
.kpi-etiqueta { color: var(--texto-suave); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; }
.kpi strong { font-size: 1.35rem; color: var(--barra); }
.volver { display: inline-block; margin-bottom: 0.5rem; color: var(--acento); text-decoration: none; font-weight: 500; }
.volver:hover { text-decoration: underline; }

.contenedor-tablas { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 1.25rem; align-items: start; }
.ancho { grid-column: 1 / -1; }
.bloque h2 { margin: 0 0 0.5rem 0; font-size: 1.05rem; }
.bloque table th { width: 42%; background: #f4f6f9; font-weight: 600; }
.bloque table.tabla-listado th { width: auto; background: var(--encabezado-tabla); }
.aclaracion { color: var(--texto-suave); font-size: 0.9rem; margin-top: 0; margin-bottom: 0.75rem; }
.cargando { color: var(--texto-suave); font-style: italic; }
.vacio { color: var(--texto-suave); font-style: italic; margin: 0.5rem 0; }

@media (max-width: 800px) {
  .contenedor-tablas { grid-template-columns: minmax(0, 1fr); }
}
</style>
