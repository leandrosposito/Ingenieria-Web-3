<script setup>
import { computed } from 'vue'
import { textoEstado } from '../utils/estados'

const props = defineProps({
  estado: {
    type: String,
    required: true,
  },
})

const texto = computed(() => textoEstado(props.estado))

// Que clase de color le toca a cada estado
const CLASES = {
  PENDIENTE_PESAJE_INICIAL: 'badge-pendiente',
  CON_PESAJE_INICIAL: 'badge-cargando',
  CERRADA_PARA_CARGA: 'badge-cerrada',
  FINALIZADA: 'badge-finalizada',
}

const claseBadge = computed(() => CLASES[props.estado] || 'badge-default')
</script>

<template>
  <span :class="['badge', claseBadge]">
    {{ texto }}
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.2rem 0.55rem;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 999px;
  line-height: 1.2;
}

.badge::before {
  content: '';
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: currentColor;
}

.badge-pendiente {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}

.badge-cargando {
  background: #dbeafe;
  color: #1e40af;
  border: 1px solid #bfdbfe;
}

.badge-cerrada {
  background: #fed7aa;
  color: #9a3412;
  border: 1px solid #fdba74;
}

.badge-finalizada {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.badge-default {
  background: #e5e7eb;
  color: #374151;
}
</style>
