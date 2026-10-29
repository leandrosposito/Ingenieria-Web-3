<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../api/http'
import { formatearFechaHora, formatearNumero } from '../utils/formato'

const route = useRoute()
const numero = route.params.numero

const orden = ref(null)
const error = ref('')

async function cargarOrden() {
  try {
    orden.value = await api(`/api/v1/ordenes/${numero}`)
    error.value = ''
  } catch (e) {
    error.value = e.message
  }
}

onMounted(cargarOrden)
</script>

<template>
  <div class="cabecera-detalle">
    <RouterLink to="/ordenes" class="volver">← Volver al listado</RouterLink>
    <h1>Orden {{ numero }}</h1>
  </div>

  <p v-if="error" class="error">{{ error }}</p>

  <div v-if="orden" class="contenedor-tablas">
    <section class="bloque">
      <h2>Datos generales</h2>
      <table>
        <tbody>
          <tr><th>Número de orden</th><td>{{ orden.numeroOrden }}</td></tr>
          <tr><th>Estado</th><td>{{ orden.estadoNumero }} · {{ orden.estadoDescripcion }}</td></tr>
          <tr><th>Preset</th><td>{{ formatearNumero(orden.preset, 0) }} kg</td></tr>
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
          <tr v-if="orden.camion?.cisternas?.length">
            <th>Cisternas</th>
            <td>
              {{ orden.camion.cisternas.map(c => `C${c.numero}: ${c.capacidadLitros} L`).join(' | ') }}
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="bloque">
      <h2>Chofer, Cliente y Producto</h2>
      <table>
        <tbody>
          <tr><th>Chofer</th><td>{{ orden.chofer ? `${orden.chofer.nombre} ${orden.chofer.apellido} (Doc: ${orden.chofer.documento})` : '-' }}</td></tr>
          <tr><th>Cliente</th><td>{{ orden.cliente ? `${orden.cliente.razonSocial} (${orden.cliente.contacto})` : '-' }}</td></tr>
          <tr><th>Producto</th><td>{{ orden.producto ? `${orden.producto.nombre} - ${orden.producto.descripcion}` : '-' }}</td></tr>
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
      <h2>Últimos valores registrados</h2>
      <table>
        <tbody>
          <tr><th>Masa acumulada</th><td>{{ formatearNumero(orden.ultimaMasaAcumulada) }} kg</td></tr>
          <tr><th>Densidad</th><td>{{ formatearNumero(orden.ultimaDensidad, 3) }}</td></tr>
          <tr><th>Temperatura</th><td>{{ formatearNumero(orden.ultimaTemperatura) }} °C</td></tr>
          <tr><th>Caudal</th><td>{{ formatearNumero(orden.ultimoCaudal) }} kg/h</td></tr>
          <tr><th>Fecha del último dato</th><td>{{ formatearFechaHora(orden.fechaUltimoDato) }}</td></tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.cabecera-detalle { margin-bottom: 1rem; }
.volver { display: inline-block; margin-bottom: 0.5rem; color: #2f6fb5; text-decoration: none; }
.volver:hover { text-decoration: underline; }
.contenedor-tablas { display: flex; flex-direction: column; gap: 1.5rem; }
.bloque h2 { margin: 0 0 0.5rem 0; font-size: 1.15rem; color: #1f3a5f; }
.bloque table th { width: 40%; background: #f4f5f7; }
</style>
