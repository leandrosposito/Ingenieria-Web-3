<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api/http'
import EstadoBadge from '../components/EstadoBadge.vue'
import { ESTADOS_ORDEN } from '../utils/estados'
import { formatearFechaHora, formatearNumero } from '../utils/formato'

const router = useRouter()

const ordenes = ref([])
const filtroEstado = ref('')
const error = ref('')
const cargando = ref(false)

const numeroBuscado = ref('')
const errorBusqueda = ref('')

// Solo enteros positivos: 12 sirve; 0, -3, 1.5 o vacio no
function buscarOrden() {
  const numero = Number(numeroBuscado.value)
  if (!Number.isInteger(numero) || numero <= 0) {
    errorBusqueda.value = 'Ingresá un número de orden entero mayor a 0.'
    return
  }
  errorBusqueda.value = ''
  router.push(`/ordenes/${numero}`)
}

async function cargarOrdenes() {
  const params = new URLSearchParams()
  if (filtroEstado.value) params.set('estado', filtroEstado.value)
  const ruta = params.toString() ? `/api/v1/ordenes?${params}` : '/api/v1/ordenes'

  cargando.value = true
  try {
    ordenes.value = await api(ruta)
    error.value = ''
  } catch (e) {
    error.value = e.message
  } finally {
    cargando.value = false
  }
}

onMounted(cargarOrdenes)
</script>

<template>
  <h1>Órdenes</h1>
  <p class="ayuda">Listado general de órdenes de carga en el sistema.</p>
  <p v-if="error" class="error">{{ error }}</p>

  <form class="buscador" novalidate @submit.prevent="buscarOrden">
    <label for="buscar-orden">Buscar orden por número:</label>
    <input id="buscar-orden" v-model="numeroBuscado" type="number" min="1" step="1" placeholder="Ej: 1001" />
    <button type="submit">Ver orden</button>
  </form>
  <p v-if="errorBusqueda" class="error">{{ errorBusqueda }}</p>

  <div class="acciones">
    <label for="filtro-estado">Estado:</label>
    <select id="filtro-estado" v-model="filtroEstado" @change="cargarOrdenes">
      <option value="">Todos</option>
      <option v-for="e in ESTADOS_ORDEN" :key="e.valor" :value="e.valor">
        {{ e.texto }}
      </option>
    </select>
    <button @click="cargarOrdenes">Actualizar lista</button>
  </div>

  <div class="tabla-scroll">
  <table>
    <thead>
      <tr>
        <th>Orden</th>
        <th>Estado</th>
        <th>Camión</th>
        <th>Cliente</th>
        <th>Producto</th>
        <th>Preset</th>
        <th>Fecha prevista</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="o in ordenes" :key="o.numeroOrden">
        <td>
          <RouterLink :to="`/ordenes/${o.numeroOrden}`" class="link-orden">
            {{ o.numeroOrden }}
          </RouterLink>
        </td>
        <td><EstadoBadge :estado="o.estado" /></td>
        <td>{{ o.camion?.patente || '-' }}</td>
        <td>{{ o.cliente?.razonSocial || '-' }}</td>
        <td>{{ o.producto?.nombre || '-' }}</td>
        <td>{{ formatearNumero(o.preset, 0) }} kg</td>
        <td>{{ formatearFechaHora(o.fechaPrevistaCarga) }}</td>
      </tr>
      <tr v-if="cargando">
        <td colspan="7">Cargando...</td>
      </tr>
      <tr v-else-if="ordenes.length === 0">
        <td colspan="7">No hay órdenes para mostrar.</td>
      </tr>
    </tbody>
  </table>
  </div>
</template>

<style scoped>
.ayuda { color: var(--texto-suave); margin-top: 0; margin-bottom: 1.25rem; }
/* Buscador y filtro: barras de herramientas en forma de tarjeta */
.buscador, .acciones {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-radius: var(--radio);
  box-shadow: var(--sombra);
}
.buscador input { width: 9rem; }
.buscador + .error { margin: -0.25rem 0 0.75rem 0.25rem; }
.link-orden { color: var(--acento); font-weight: 600; text-decoration: none; }
.link-orden:hover { text-decoration: underline; }
</style>
