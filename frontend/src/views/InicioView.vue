<script setup>
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()

// Accesos rápidos a cada sección del sistema
const secciones = [
  { ruta: '/ordenes', icono: '📋', titulo: 'Órdenes', texto: 'Listado, búsqueda y detalle de cada orden de carga.' },
  { ruta: '/monitoreo', icono: '📡', titulo: 'Monitoreo', texto: 'Seguimiento en vivo de las cargas en curso.' },
  { ruta: '/alarmas', icono: '🔔', titulo: 'Alarmas', texto: 'Alarmas de temperatura y su configuración.' },
  { ruta: '/conciliaciones', icono: '⚖️', titulo: 'Conciliaciones', texto: 'Balanza contra caudalímetro en órdenes finalizadas.' },
]
</script>

<template>
  <h1>Inicio</h1>
  <p class="saludo">Hola <strong>{{ auth.username }}</strong>. Tu rol es <strong>{{ auth.rol }}</strong>.</p>

  <div class="accesos">
    <RouterLink v-for="s in secciones" :key="s.ruta" :to="s.ruta" class="acceso">
      <span class="icono">{{ s.icono }}</span>
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
.acceso:hover { transform: translateY(-2px); border-color: var(--acento); box-shadow: 0 6px 16px rgba(22, 38, 61, 0.12); }
.icono { font-size: 1.6rem; }
.acceso h2 { margin: 0.5rem 0 0.25rem; font-size: 1.1rem; }
.acceso p { margin: 0; color: var(--texto-suave); font-size: 0.9rem; }
</style>
