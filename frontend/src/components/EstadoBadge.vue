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

const claseBadge = computed(() => {
  switch (props.estado) {
    case 'PENDIENTE_PESAJE_INICIAL':
      return 'badge-pendiente'
    case 'CON_PESAJE_INICIAL':
      return 'badge-cargando'
    case 'CERRADA_PARA_CARGA':
      return 'badge-cerrada'
    case 'FINALIZADA':
      return 'badge-finalizada'
    default:
      return 'badge-default'
  }
})
</script>

<template>
  <span :class="['badge', claseBadge]">
    {{ texto }}
  </span>
</template>

<style scoped>
.badge {
  display: inline-block;
  padding: 0.2rem 0.55rem;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 4px;
  line-height: 1.2;
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
