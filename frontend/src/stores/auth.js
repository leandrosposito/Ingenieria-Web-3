import { defineStore } from 'pinia'
import { leerError } from '../api/errores'

const CLAVE = 'iw3_sesion'

/** Decodifica el payload (JSON) de un token JWT en formato base64url. */
function decodificarPayloadJwt(token) {
  if (typeof token !== 'string') return null
  const partes = token.split('.')
  if (partes.length !== 3) return null
  try {
    let base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4 !== 0) {
      base64 += '='
    }
    const jsonString = typeof atob === 'function'
      ? atob(base64)
      : Buffer.from(base64, 'base64').toString('utf-8')
    return JSON.parse(jsonString)
  } catch {
    return null
  }
}

/** Recupera la sesion guardada si el token aun no expiro. */
function leerSesion() {
  try {
    const raw = localStorage.getItem(CLAVE)
    if (!raw) return { sesion: {}, avisoSesion: null }
    const guardado = JSON.parse(raw)
    if (!guardado || !guardado.token) {
      return { sesion: {}, avisoSesion: null }
    }
    const payload = decodificarPayloadJwt(guardado.token)
    if (!payload) {
      // Token corrupto o mal formado
      localStorage.removeItem(CLAVE)
      return { sesion: {}, avisoSesion: null }
    }
    // exp del JWT viene en segundos
    if (typeof payload.exp === 'number' && Date.now() >= payload.exp * 1000) {
      // Token expirado
      localStorage.removeItem(CLAVE)
      return { sesion: {}, avisoSesion: 'Tu sesión venció, ingresá de nuevo' }
    }
    return { sesion: guardado, avisoSesion: null }
  } catch {
    return { sesion: {}, avisoSesion: null }
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => {
    const { sesion, avisoSesion } = leerSesion()
    return {
      token: sesion.token ?? null,
      username: sesion.username ?? null,
      rol: sesion.rol ?? null,
      avisoSesion: avisoSesion ?? null,
    }
  },

  getters: {
    estaLogueado: (state) => !!state.token,
    // tieneRol('ADMIN', 'OPERADOR') -> true si el usuario tiene alguno de esos roles
    tieneRol: (state) => (...roles) => roles.includes(state.rol),
  },

  actions: {
    async login(username, password) {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) throw await leerError(res)

      const datos = await res.json()
      this.token = datos.token
      this.username = datos.username
      this.rol = datos.rol
      this.avisoSesion = null
      localStorage.setItem(CLAVE, JSON.stringify(datos))
    },

    logout(porExpiracion = false) {
      this.token = null
      this.username = null
      this.rol = null
      this.avisoSesion = (porExpiracion === true) ? 'Tu sesión venció, ingresá de nuevo' : null
      localStorage.removeItem(CLAVE)
    },

    expirarSesion() {
      this.logout(true)
    },
  },
})
