<script setup>
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()

// Accesos rápidos a cada sección del sistema con identificadores para sus iconos SVG
const secciones = [
  { id: 'ordenes', ruta: '/ordenes', titulo: 'Órdenes', texto: 'Listado, búsqueda y detalle de cada orden de carga.' },
  { id: 'monitoreo', ruta: '/monitoreo', titulo: 'Monitoreo', texto: 'Seguimiento en vivo de las cargas en curso.' },
  { id: 'alarmas', ruta: '/alarmas', titulo: 'Alarmas', texto: 'Alarmas de temperatura y su configuración.' },
  { id: 'conciliaciones', ruta: '/conciliaciones', titulo: 'Conciliaciones', texto: 'Balanza contra caudalímetro en órdenes finalizadas.' },
]
</script>

<template>
  <h1>Inicio</h1>
  <p class="saludo">Hola <strong>{{ auth.username }}</strong>. Tu rol es <strong>{{ auth.rol }}</strong>.</p>

  <div class="accesos">
    <RouterLink v-for="s in secciones" :key="s.ruta" :to="s.ruta" class="acceso">
      <span class="icono">
        <svg
          v-if="s.id === 'ordenes'"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          <path d="M9 12h6" />
          <path d="M9 16h6" />
        </svg>

        <svg
          v-else-if="s.id === 'monitoreo'"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
          <path d="M7 10h2l2-3 2 6 2-3h2" />
        </svg>

        <svg
          v-else-if="s.id === 'alarmas'"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        <svg
          v-else-if="s.id === 'conciliaciones'"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
          <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
          <path d="M7 21h10" />
          <path d="M12 3v18" />
          <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
        </svg>
      </span>
      <h2>{{ s.titulo }}</h2>
      <p>{{ s.texto }}</p>
    </RouterLink>
  </div>
</template>

<style scoped>
.saludo { color: var(--texto-suave); margin: 0 0 1.5rem; }
.accesos { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 1rem; }
.acceso {
  display: block;
  padding: 1.25rem;
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-radius: var(--radio);
  box-shadow: var(--sombra);
  color: inherit;
  text-decoration: none;
  transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
}
.acceso:hover {
  transform: translateY(-2px);
  border-color: var(--acento);
  box-shadow: 0 6px 16px rgba(22, 38, 61, 0.12);
}
.acceso:hover .icono {
  color: var(--acento-oscuro);
}
.icono {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  color: var(--acento);
}
.icono svg {
  width: 1.75rem;
  height: 1.75rem;
}
.acceso h2 { margin: 0.5rem 0 0.25rem; font-size: 1.1rem; }
.acceso p { margin: 0; color: var(--texto-suave); font-size: 0.9rem; }
</style>
