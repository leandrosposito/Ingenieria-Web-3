<script setup>
import { onMounted, ref } from 'vue'
import { api } from '../api/http'
import { formatearFechaHora, formatearNumero } from '../utils/formato'

const ordenes = ref([])
const error = ref('')

async function cargarOrdenes() {
  try {
    ordenes.value = await api('/api/v1/ordenes')
    error.value = ''
  } catch (e) {
    error.value = e.message
  }
}

onMounted(cargarOrdenes)
</script>

<template>
  <h1>Órdenes</h1>
  <p class="ayuda">Listado general de órdenes de carga en el sistema.</p>
  <p v-if="error" class="error">{{ error }}</p>

  <div class="acciones">
    <button @click="cargarOrdenes">Actualizar lista</button>
  </div>

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
        <td>{{ o.numeroOrden }}</td>
        <td>{{ o.estadoNumero }} · {{ o.estadoDescripcion }}</td>
        <td>{{ o.camion?.patente || '-' }}</td>
        <td>{{ o.cliente?.razonSocial || '-' }}</td>
        <td>{{ o.producto?.nombre || '-' }}</td>
        <td>{{ formatearNumero(o.preset, 0) }} kg</td>
        <td>{{ formatearFechaHora(o.fechaPrevistaCarga) }}</td>
      </tr>
      <tr v-if="ordenes.length === 0">
        <td colspan="7">No hay órdenes para mostrar.</td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.ayuda { color: #52606d; }
.acciones { margin-bottom: 0.75rem; }
</style>
