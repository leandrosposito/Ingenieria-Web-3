import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import { useAuthStore } from './auth'
import { api } from '../api/http'
import { crearRouter } from '../router'

function respuesta(status, cuerpo) {
  return { ok: status < 400, status, json: async () => cuerpo }
}

function crearTokenJwt(payload) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
  const body = btoa(JSON.stringify(payload))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
  return `${header}.${body}.firmaFalsa`
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  vi.restoreAllMocks()
})

describe('store de autenticacion', () => {
  it('login guarda token, usuario y rol (tambien en localStorage)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(200, { token: 'abc', username: 'tms', rol: 'TMS' })))
    const auth = useAuthStore()

    await auth.login('tms', 'demo1234')

    expect(auth.estaLogueado).toBe(true)
    expect(auth.rol).toBe('TMS')
    expect(auth.tieneRol('ADMIN', 'TMS')).toBe(true)
    expect(JSON.parse(localStorage.getItem('iw3_sesion')).token).toBe('abc')
  })

  it('login con credenciales malas lanza el mensaje del backend', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(401, { mensaje: 'Usuario o contrasena incorrectos' })))
    const auth = useAuthStore()

    await expect(auth.login('x', 'y')).rejects.toThrow('Usuario o contrasena incorrectos')
    expect(auth.estaLogueado).toBe(false)
  })

  it('logout borra la sesion', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(200, { token: 'abc', username: 'tms', rol: 'TMS' })))
    const auth = useAuthStore()
    await auth.login('tms', 'demo1234')

    auth.logout()

    expect(auth.estaLogueado).toBe(false)
    expect(auth.avisoSesion).toBeNull()
    expect(localStorage.getItem('iw3_sesion')).toBeNull()
  })

  it('restaura sesion cuando el token en localStorage esta vigente', () => {
    const token = crearTokenJwt({ exp: Math.floor(Date.now() / 1000) + 3600, sub: 'admin', rol: 'ADMIN' })
    localStorage.setItem('iw3_sesion', JSON.stringify({ token, username: 'admin', rol: 'ADMIN' }))

    setActivePinia(createPinia())
    const auth = useAuthStore()

    expect(auth.estaLogueado).toBe(true)
    expect(auth.username).toBe('admin')
    expect(auth.token).toBe(token)
    expect(auth.avisoSesion).toBeNull()
  })

  it('descarta sesion y avisa cuando el token en localStorage esta expirado', () => {
    const tokenExpirado = crearTokenJwt({ exp: Math.floor(Date.now() / 1000) - 3600, sub: 'admin', rol: 'ADMIN' })
    localStorage.setItem('iw3_sesion', JSON.stringify({ token: tokenExpirado, username: 'admin', rol: 'ADMIN' }))

    setActivePinia(createPinia())
    const auth = useAuthStore()

    expect(auth.estaLogueado).toBe(false)
    expect(auth.token).toBeNull()
    expect(auth.avisoSesion).toBe('Tu sesión venció, ingresá de nuevo')
    expect(localStorage.getItem('iw3_sesion')).toBeNull()
  })

  it('descarta sesion sin error cuando el token en localStorage es corrupto', () => {
    localStorage.setItem('iw3_sesion', JSON.stringify({ token: 'token-invalido-corrupto', username: 'admin', rol: 'ADMIN' }))

    setActivePinia(createPinia())
    const auth = useAuthStore()

    expect(auth.estaLogueado).toBe(false)
    expect(auth.token).toBeNull()
    expect(auth.avisoSesion).toBeNull()
    expect(localStorage.getItem('iw3_sesion')).toBeNull()
  })

  it('login exitoso limpia el aviso de sesion vencida', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(200, { token: 'abc', username: 'tms', rol: 'TMS' })))
    const auth = useAuthStore()
    auth.avisoSesion = 'Tu sesión venció, ingresá de nuevo'

    await auth.login('tms', 'demo1234')

    expect(auth.estaLogueado).toBe(true)
    expect(auth.avisoSesion).toBeNull()
  })
})

describe('api()', () => {
  it('manda el token en el header Authorization', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respuesta(200, []))
    vi.stubGlobal('fetch', fetchMock)
    const auth = useAuthStore()
    auth.token = 'abc'

    await api('/api/v1/ordenes')

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer abc')
  })

  it('ante un 401 cierra la sesion y activa el aviso de sesion vencida', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(401, { mensaje: 'token vencido' })))
    const auth = useAuthStore()
    auth.token = 'vencido'

    await expect(api('/api/v1/ordenes')).rejects.toThrow('token vencido')
    expect(auth.estaLogueado).toBe(false)
    expect(auth.avisoSesion).toBe('Tu sesión venció, ingresá de nuevo')
  })
})

describe('guard del router', () => {
  it('sin sesion redirige al login', async () => {
    const router = crearRouter(createMemoryHistory())
    await router.push('/')
    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('con sesion deja entrar y no muestra el login', async () => {
    const auth = useAuthStore()
    auth.token = 'abc'
    const router = crearRouter(createMemoryHistory())

    await router.push('/')
    expect(router.currentRoute.value.path).toBe('/')

    await router.push('/login')
    expect(router.currentRoute.value.path).toBe('/')
  })
})
