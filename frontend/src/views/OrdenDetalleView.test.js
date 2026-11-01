import { beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import OrdenDetalleView from './OrdenDetalleView.vue'

vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router')
  return {
    ...actual,
    useRoute: () => ({
      params: { numero: '1001' },
    }),
  }
})

const ORDEN = {
  numeroOrden: 1001,
  estado: 'PENDIENTE_PESAJE_INICIAL',
  estadoNumero: 1,
  estadoDescripcion: 'Pendiente de pesaje inicial',
  preset: 30000,
  fechaPrevistaCarga: '2026-11-10T08:00:00',
  fechaRecepcion: '2026-11-10T07:30:00',
  camion: {
    patente: 'AA111AA',
    descripcion: 'Scania R450',
    capacidadTotalLitros: 35000,
    cisternas: [{ numero: 1, capacidadLitros: 35000 }],
  },
  chofer: {
    nombre: 'Carlos',
    apellido: 'Gómez',
    documento: '30123456',
  },
  cliente: {
    razonSocial: 'Gas del Sur',
    contacto: 'operaciones@gasdelsur.com',
  },
  producto: {
    nombre: 'Butano',
    descripcion: 'Gas licuado',
  },
}

const HISTORIAL = [
  {
    estadoAnterior: null,
    estadoNuevo: 'PENDIENTE_PESAJE_INICIAL',
    fechaHora: '2026-11-10T07:30:00',
    usuario: 'sap',
    observaciones: 'Creación desde SAP',
  },
  {
    estadoAnterior: 'PENDIENTE_PESAJE_INICIAL',
    estadoNuevo: 'CON_PESAJE_INICIAL',
    fechaHora: '2026-11-10T08:15:00',
    usuario: 'tms',
    observaciones: 'Pesaje inicial completado',
  },
]

const DETALLE_CARGA = [
  {
    fechaHora: '2026-11-10T08:30:00',
    masaAcumulada: 1200,
    densidad: 0.542,
    temperatura: 18.5,
    caudal: 45000,
  },
]

function simularBackend({ orden = ORDEN, historial = HISTORIAL, detalle = DETALLE_CARGA, status = 200, ok = true } = {}) {
  const fetchFalso = vi.fn(async (url) => {
    if (!ok) {
      return {
        ok: false,
        status,
        json: async () => ({ mensaje: `No existe la orden 1001` }),
      }
    }
    if (url.includes('/historial-estados')) {
      return { ok: true, status: 200, json: async () => historial }
    }
    if (url.includes('/detalle')) {
      return { ok: true, status: 200, json: async () => detalle }
    }
    return { ok: true, status: 200, json: async () => orden }
  })
  vi.stubGlobal('fetch', fetchFalso)
  return fetchFalso
}

beforeEach(() => {
  setActivePinia(createPinia())
})

it('muestra los datos de cabecera de la orden y el badge de estado', async () => {
  simularBackend()
  const pantalla = mount(OrdenDetalleView, {
    global: { stubs: ['RouterLink'] },
  })
  await flushPromises()

  const texto = pantalla.text()
  expect(texto).toContain('Orden 1001')
  expect(texto).toContain('AA111AA')
  expect(texto).toContain('Gas del Sur')
  expect(texto).toContain('Carlos Gómez')
  expect(texto).toContain('1 · Pendiente de pesaje inicial')
})

it('renderiza la tabla del historial de estados con alta de orden', async () => {
  simularBackend()
  const pantalla = mount(OrdenDetalleView, {
    global: { stubs: ['RouterLink'] },
  })
  await flushPromises()

  const texto = pantalla.text()
  expect(texto).toContain('(alta de la orden)')
  expect(texto).toContain('Creación desde SAP')
  expect(texto).toContain('tms')
})

it('renderiza el detalle de carga almacenado', async () => {
  simularBackend()
  const pantalla = mount(OrdenDetalleView, {
    global: { stubs: ['RouterLink'] },
  })
  await flushPromises()

  const texto = pantalla.text()
  expect(texto).toContain('1200.0 kg')
  expect(texto).toContain('0.542')
  expect(texto).toContain('18.5 °C')
})

it('si la orden no existe muestra el mensaje de error 404', async () => {
  simularBackend({ ok: false, status: 404 })
  const pantalla = mount(OrdenDetalleView, {
    global: { stubs: ['RouterLink'] },
  })
  await flushPromises()

  expect(pantalla.text()).toContain('No existe la orden 1001')
  expect(pantalla.find('.error').exists()).toBe(true)
})
