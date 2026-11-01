import { beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import OrdenesView from './OrdenesView.vue'

const ORDEN = {
  numeroOrden: 1001,
  estado: 'PENDIENTE_PESAJE_INICIAL',
  estadoNumero: 1,
  estadoDescripcion: 'Pendiente de pesaje inicial',
  camion: { patente: 'AB123CD' },
  cliente: { razonSocial: 'YPF Gas' },
  producto: { nombre: 'Propano' },
  preset: 25000,
  fechaPrevistaCarga: '2026-11-10T08:00:00',
}

function simularBackend(cuerpo = [ORDEN], status = 200, ok = true) {
  const fetchFalso = vi.fn(async () => ({
    ok,
    status,
    json: async () => cuerpo,
  }))
  vi.stubGlobal('fetch', fetchFalso)
  return fetchFalso
}

beforeEach(() => {
  setActivePinia(createPinia())
})

it('al montarse pide /api/v1/ordenes y muestra los datos principales', async () => {
  const fetchFalso = simularBackend()
  const pantalla = mount(OrdenesView)
  await flushPromises()

  expect(fetchFalso.mock.calls[0][0]).toBe('/api/v1/ordenes')
  const texto = pantalla.text()
  expect(texto).toContain('1001')
  expect(texto).toContain('AB123CD')
  expect(texto).toContain('YPF Gas')
})

it('al seleccionar un estado en el select pide las ordenes filtradas', async () => {
  const fetchFalso = simularBackend()
  const pantalla = mount(OrdenesView)
  await flushPromises()

  const select = pantalla.find('#filtro-estado')
  await select.setValue('FINALIZADA')
  await flushPromises()

  expect(fetchFalso).toHaveBeenCalledTimes(2)
  expect(fetchFalso.mock.calls[1][0]).toBe('/api/v1/ordenes?estado=FINALIZADA')
})

it('si la lista está vacía muestra el mensaje correspondiente', async () => {
  simularBackend([])
  const pantalla = mount(OrdenesView)
  await flushPromises()

  expect(pantalla.text()).toContain('No hay órdenes para mostrar.')
})

it('si la API responde error muestra el mensaje en pantalla', async () => {
  simularBackend({ mensaje: 'Error al conectar con la base de datos' }, 500, false)
  const pantalla = mount(OrdenesView)
  await flushPromises()

  expect(pantalla.text()).toContain('Error al conectar con la base de datos')
  expect(pantalla.find('.error').exists()).toBe(true)
})
