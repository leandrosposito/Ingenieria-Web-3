import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MonitoreoView from './MonitoreoView.vue'

const ORDEN_MONITOREO = {
  numeroOrden: 1001,
  estadoNumero: 2,
  estadoDescripcion: 'Cargando',
  patente: 'AA123BB',
  preset: 25000,
  ultimaMasaAcumulada: 12500,
  ultimaTemperatura: 21.5,
  ultimaDensidad: 0.812,
  ultimoCaudal: 1200,
  etaHoras: 1.5,
  tiempoTranscurridoSegundos: 3600,
  fechaUltimoDato: '2026-11-10T08:30:00',
}

function simularBackend(datos = [ORDEN_MONITOREO]) {
  const fetchFalso = vi.fn(async () => {
    return { ok: true, status: 200, json: async () => datos }
  })
  vi.stubGlobal('fetch', fetchFalso)
  return fetchFalso
}

let wrapper

beforeEach(() => {
  setActivePinia(createPinia())
})

afterEach(() => {
  if (wrapper) {
    wrapper.unmount()
    wrapper = null
  }
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it.each(['respuesta', 'error'])('ignora %s de un pedido anterior cuando cambia la patente', async (tipo) => {
  let resolverViejo
  const viejo = new Promise((resolve) => { resolverViejo = resolve })
  const fetchFalso = vi.fn()
    .mockReturnValueOnce(viejo)
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [{ ...ORDEN_MONITOREO, patente: 'NUEVA123' }] })
  vi.stubGlobal('fetch', fetchFalso)
  wrapper = mount(MonitoreoView)
  await wrapper.find('input').setValue('NUEVA123')
  await flushPromises()
  expect(fetchFalso.mock.calls[1][0]).toContain('patente=NUEVA123')
  resolverViejo(tipo === 'respuesta'
    ? { ok: true, status: 200, json: async () => [ORDEN_MONITOREO] }
    : { ok: false, status: 500, json: async () => ({ mensaje: 'Error viejo' }) })
  await flushPromises()
  expect(wrapper.find('tbody').text()).toContain('NUEVA123')
  expect(wrapper.find('tbody').text()).not.toContain('AA123BB')
  expect(wrapper.find('.error').exists()).toBe(false)
})

it('al montarse pide /api/v1/monitoreo?ordenarPor=numeroOrden&direccion=asc y muestra las filas', async () => {
  const fetchFalso = simularBackend()
  wrapper = mount(MonitoreoView)
  await flushPromises()

  expect(fetchFalso.mock.calls[0][0]).toBe('/api/v1/monitoreo?ordenarPor=numeroOrden&direccion=asc')
  const texto = wrapper.text()
  expect(texto).toContain('1001')
  expect(texto).toContain('AA123BB')
  expect(texto).toContain('1 h 30 min')
})

it('elegir un estado en el select agrega &estado=... al siguiente pedido', async () => {
  const fetchFalso = simularBackend()
  wrapper = mount(MonitoreoView)
  await flushPromises()

  const select = wrapper.find('select')
  await select.setValue('CON_PESAJE_INICIAL')
  await flushPromises()

  expect(fetchFalso).toHaveBeenCalledTimes(2)
  expect(fetchFalso.mock.calls[1][0]).toBe(
    '/api/v1/monitoreo?ordenarPor=numeroOrden&direccion=asc&estado=CON_PESAJE_INICIAL'
  )
})

it('click en el encabezado "Temp. (°C)" pide ordenarPor=temperatura asc; un segundo click, desc', async () => {
  const fetchFalso = simularBackend()
  wrapper = mount(MonitoreoView)
  await flushPromises()

  const thTemp = wrapper.findAll('th').find((th) => th.text().includes('Temp. (°C)'))
  expect(thTemp).toBeDefined()

  // Primer click: asc
  await thTemp.trigger('click')
  await flushPromises()

  expect(fetchFalso.mock.calls[1][0]).toBe('/api/v1/monitoreo?ordenarPor=temperatura&direccion=asc')
  expect(thTemp.text()).toContain('▲')

  // Segundo click: desc
  await thTemp.trigger('click')
  await flushPromises()

  expect(fetchFalso.mock.calls[2][0]).toBe('/api/v1/monitoreo?ordenarPor=temperatura&direccion=desc')
  expect(thTemp.text()).toContain('▼')
})

it('si el backend responde error, se ve el mensaje', async () => {
  const fetchFalso = vi.fn(async () => {
    return {
      ok: false,
      status: 500,
      json: async () => ({ mensaje: 'Error al consultar el monitoreo' }),
    }
  })
  vi.stubGlobal('fetch', fetchFalso)

  wrapper = mount(MonitoreoView)
  await flushPromises()

  expect(wrapper.find('.error').exists()).toBe(true)
  expect(wrapper.find('.error').text()).toBe('Error al consultar el monitoreo')
})

it('realiza polling cada 5 s y se detiene al desmontar el componente', async () => {
  vi.useFakeTimers()
  const fetchFalso = simularBackend()

  wrapper = mount(MonitoreoView)
  await flushPromises()
  expect(fetchFalso).toHaveBeenCalledTimes(1)

  // Avanza 5 segundos
  await vi.advanceTimersByTimeAsync(5000)
  expect(fetchFalso).toHaveBeenCalledTimes(2)

  // Desmonta el componente para limpiar el intervalo
  wrapper.unmount()
  wrapper = null

  // Avanza otros 5 segundos: no deben realizarse más llamadas
  await vi.advanceTimersByTimeAsync(5000)
  expect(fetchFalso).toHaveBeenCalledTimes(2)
})
