import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '../stores/auth'
import AlarmasView from './AlarmasView.vue'

const CONFIG = { temperaturaUmbral: 40, destinatarios: ['uno@planta.local', 'dos@planta.local'] }

// fetch falso: registra las llamadas y responde segun la URL
function simularBackend() {
  const fetchFalso = vi.fn(async (url, opciones) => {
    const cuerpo = url.includes('/configuracion')
      ? (opciones.method === 'PUT' ? JSON.parse(opciones.body) : CONFIG)
      : []
    return { ok: true, status: 200, json: async () => cuerpo }
  })
  vi.stubGlobal('fetch', fetchFalso)
  return fetchFalso
}

let pantallaActual

function montarComo(rol) {
  const auth = useAuthStore()
  auth.token = 'token-falso'
  auth.rol = rol
  pantallaActual = mount(AlarmasView)
  return pantallaActual
}

beforeEach(() => {
  setActivePinia(createPinia())
})

afterEach(() => {
  pantallaActual?.unmount()
  pantallaActual = null
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('el admin ve la configuracion actual y puede guardarla', async () => {
  const fetchFalso = simularBackend()
  const pantalla = montarComo('ADMIN')
  await flushPromises()

  const [umbral, destinatarios] = pantalla.findAll('.config input')
  expect(umbral.element.value).toBe('40')
  expect(destinatarios.element.value).toBe('uno@planta.local, dos@planta.local')

  await umbral.setValue('55.5')
  await destinatarios.setValue('nuevo@planta.local, otro@planta.local')
  await pantalla.find('.config').trigger('submit')
  await flushPromises()

  const put = fetchFalso.mock.calls.find(([, op]) => op?.method === 'PUT')
  expect(put[0]).toBe('/api/v1/alarmas/configuracion')
  expect(JSON.parse(put[1].body)).toEqual({
    temperaturaUmbral: 55.5,
    destinatarios: ['nuevo@planta.local', 'otro@planta.local'],
  })
  expect(pantalla.text()).toContain('Configuración guardada')
})

it('un operador no ve el formulario ni pide la configuracion', async () => {
  const fetchFalso = simularBackend()
  const pantalla = montarComo('OPERADOR')
  await flushPromises()

  expect(pantalla.find('.config').exists()).toBe(false)
  expect(fetchFalso.mock.calls.some(([url]) => url.includes('/configuracion'))).toBe(false)
})

const PENDIENTE = {
  id: 1, numeroOrden: 8001, temperatura: 50, umbral: 40,
  fechaHora: '2026-10-30T10:00:00', estado: 'PENDIENTE',
}
const ACEPTADA = { ...PENDIENTE, id: 2, numeroOrden: 8002, estado: 'ACEPTADA', usuarioAceptacion: 'admin' }
const respuesta = (datos) => ({ ok: true, status: 200, json: async () => datos })

function pedidoPendiente() {
  let resolver
  const promesa = new Promise((resolve) => { resolver = resolve })
  return { promesa, resolver }
}

it('acepta con la observacion ingresada y actualiza la lista de pendientes', async () => {
  const fetchFalso = vi.fn()
    .mockResolvedValueOnce(respuesta([PENDIENTE]))
    .mockResolvedValueOnce(respuesta({ ...PENDIENTE, estado: 'ACEPTADA' }))
    .mockResolvedValueOnce(respuesta([]))
  vi.stubGlobal('fetch', fetchFalso)
  const pantalla = montarComo('OPERADOR')
  await flushPromises()
  await pantalla.find('tbody input').setValue('Revisado por Fabri')
  await pantalla.find('tbody button').trigger('click')
  await flushPromises()
  const [url, opciones] = fetchFalso.mock.calls[1]
  expect(url).toBe('/api/v1/alarmas/1/aceptar')
  expect(opciones.method).toBe('POST')
  expect(JSON.parse(opciones.body)).toEqual({ observacion: 'Revisado por Fabri' })
  expect(pantalla.text()).toContain('No hay alarmas para mostrar.')
})

it('conserva el error 409 despues de recargar y del siguiente polling', async () => {
  vi.useFakeTimers()
  const fetchFalso = vi.fn()
    .mockResolvedValueOnce(respuesta([PENDIENTE]))
    .mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ mensaje: 'Ya fue aceptada por admin' }) })
    .mockResolvedValue(respuesta([]))
  vi.stubGlobal('fetch', fetchFalso)
  const pantalla = montarComo('OPERADOR')
  await flushPromises()
  await pantalla.find('tbody button').trigger('click')
  await flushPromises()
  expect(pantalla.text()).toContain('Ya fue aceptada por admin')
  expect(pantalla.text()).toContain('No hay alarmas para mostrar.')
  await vi.advanceTimersByTimeAsync(10000)
  expect(fetchFalso).toHaveBeenCalledTimes(4)
  expect(pantalla.text()).toContain('Ya fue aceptada por admin')
})

it.each(['respuesta', 'error'])('ignora una %s vieja al cambiar el filtro', async (tipo) => {
  const viejo = pedidoPendiente()
  const fetchFalso = vi.fn()
    .mockReturnValueOnce(viejo.promesa)
    .mockResolvedValueOnce(respuesta([ACEPTADA]))
  vi.stubGlobal('fetch', fetchFalso)
  const pantalla = montarComo('OPERADOR')
  await pantalla.find('select').setValue('ACEPTADA')
  await flushPromises()
  expect(fetchFalso.mock.calls[1][0]).toBe('/api/v1/alarmas?estado=ACEPTADA')
  viejo.resolver(tipo === 'respuesta'
    ? respuesta([PENDIENTE])
    : { ok: false, status: 500, json: async () => ({ mensaje: 'Error viejo' }) })
  await flushPromises()
  expect(pantalla.find('tbody').text()).toContain('8002')
  expect(pantalla.find('tbody').text()).not.toContain('8001')
  expect(pantalla.find('.error').exists()).toBe(false)
})

it('un polling anterior no restaura la alarma despues de aceptarla', async () => {
  vi.useFakeTimers()
  const viejo = pedidoPendiente()
  const fetchFalso = vi.fn()
    .mockResolvedValueOnce(respuesta([PENDIENTE]))
    .mockReturnValueOnce(viejo.promesa)
    .mockResolvedValueOnce(respuesta({ ...PENDIENTE, estado: 'ACEPTADA' }))
    .mockResolvedValueOnce(respuesta([]))
  vi.stubGlobal('fetch', fetchFalso)
  const pantalla = montarComo('OPERADOR')
  await flushPromises()
  await vi.advanceTimersByTimeAsync(10000)
  await pantalla.find('tbody button').trigger('click')
  await flushPromises()
  expect(pantalla.text()).toContain('No hay alarmas para mostrar.')
  viejo.resolver(respuesta([PENDIENTE]))
  await flushPromises()
  expect(pantalla.text()).toContain('No hay alarmas para mostrar.')
  expect(pantalla.find('tbody button').exists()).toBe(false)
})
