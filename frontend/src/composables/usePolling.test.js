import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { usePolling } from './usePolling'

function crearComponente(accion) {
  return defineComponent({
    setup() {
      usePolling(accion, 5000)
    },
    render() {
      return h('div')
    },
  })
}

// Desmontamos los componentes antes de restaurar el reloj.
enableAutoUnmount(afterEach)

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

it('al montar ejecuta la accion exactamente una vez', () => {
  const accion = vi.fn()

  mount(crearComponente(accion))

  expect(accion).toHaveBeenCalledTimes(1)
})

it('a los 5000 ms ejecuta 2 veces en total y a los 10000 ms ejecuta 3 veces', async () => {
  const accion = vi.fn()

  mount(crearComponente(accion))
  expect(accion).toHaveBeenCalledTimes(1)

  await vi.advanceTimersByTimeAsync(5000)
  expect(accion).toHaveBeenCalledTimes(2)

  await vi.advanceTimersByTimeAsync(5000)
  expect(accion).toHaveBeenCalledTimes(3)
})

it('despues de desmontar el componente ya no ejecuta la accion', async () => {
  const accion = vi.fn()

  const wrapper = mount(crearComponente(accion))
  expect(accion).toHaveBeenCalledTimes(1)

  wrapper.unmount()

  await vi.advanceTimersByTimeAsync(15000)
  expect(accion).toHaveBeenCalledTimes(1)
})

it('no superpone peticiones si la accion tarda mas que el intervalo y saltea el turno', async () => {
  let resolverPrimerPedido
  const accion = vi.fn(() => new Promise((resolve) => {
    resolverPrimerPedido = resolve
  }))

  mount(crearComponente(accion))
  expect(accion).toHaveBeenCalledTimes(1)

  await vi.advanceTimersByTimeAsync(5000)
  expect(accion).toHaveBeenCalledTimes(1)

  await vi.advanceTimersByTimeAsync(2000)
  resolverPrimerPedido()
  await flushPromises()

  await vi.advanceTimersByTimeAsync(3000)
  expect(accion).toHaveBeenCalledTimes(2)
})

it('si una peticion falla el ciclo de polling continua en el proximo intervalo', async () => {
  let debeFallar = true
  const accion = vi.fn(async () => {
    if (debeFallar) {
      throw new Error('Fallo de red simulado')
    }
  })

  mount(crearComponente(accion))
  expect(accion).toHaveBeenCalledTimes(1)

  debeFallar = false
  await vi.advanceTimersByTimeAsync(5000)
  expect(accion).toHaveBeenCalledTimes(2)
})
