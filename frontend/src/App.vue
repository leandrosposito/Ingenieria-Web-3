<script setup>
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'

const auth = useAuthStore()
const router = useRouter()

// Si la sesion se cierra (boton Salir o token vencido), se vuelve al login
watch(
  () => auth.estaLogueado,
  (logueado) => {
    if (!logueado) router.push('/login')
  },
)
</script>

<template>
  <header v-if="auth.estaLogueado" class="barra">
    <strong class="marca"><span class="logo">IW3</span> Órdenes de carga</strong>
    <nav>
      <RouterLink to="/">
        <svg class="icono-nav" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span>Inicio</span>
      </RouterLink>
      <RouterLink to="/monitoreo">
        <svg class="icono-nav" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
          <path d="M7 10h2l2-3 2 6 2-3h2" />
        </svg>
        <span>Monitoreo</span>
      </RouterLink>
      <RouterLink to="/ordenes">
        <svg class="icono-nav" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          <path d="M9 12h6" />
          <path d="M9 16h6" />
        </svg>
        <span>Órdenes</span>
      </RouterLink>
      <RouterLink to="/alarmas">
        <svg class="icono-nav" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span>Alarmas</span>
      </RouterLink>
      <RouterLink to="/conciliaciones">
        <svg class="icono-nav" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
          <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
          <path d="M7 21h10" />
          <path d="M12 3v18" />
          <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
        </svg>
        <span>Conciliaciones</span>
      </RouterLink>
    </nav>
    <span class="usuario">{{ auth.username }} ({{ auth.rol }})</span>
    <button @click="auth.logout()">Salir</button>
  </header>
  <main>
    <RouterView />
  </main>
</template>
