import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { usePolling } from './usePolling'

/**
 * usePolling usa onMounted/onUnmounted, que solo se activan dentro de un componente Vue.
 * Por eso creamos un componente mínimo en el test que llama al composable, y lo montamos
 * con @vue/test-utils. Al montar se dispara onMounted; al desmontar, onUnmounted.
 */
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

/**
 * Temporizadores falsos (vi.useFakeTimers):
 * En lugar de esperar 5 segundos reales, Vitest "congela" el reloj del proceso.
 * vi.advanceTimersByTime(N) hace avanzar ese reloj N ms de forma instantánea,
 * lo que dispara los setInterval/setTimeout que hubieran expirado en ese lapso.
 * Así podemos probar comportamiento que depende del tiempo sin ralentizar la suite.
 * vi.useRealTimers() restaura el reloj real al final de cada test.
 */
beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

it('al montar ejecuta la accion exactamente una vez', () => {
  const accion = vi.fn()

  mount(crearComponente(accion))

  // onMounted ya se ejecutó: debe haber una llamada
  expect(accion).toHaveBeenCalledTimes(1)
})

it('a los 5000 ms ejecuta 2 veces en total y a los 10000 ms ejecuta 3 veces', async () => {
  const accion = vi.fn()

  mount(crearComponente(accion))
  // 1 llamada inmediata (onMounted)
  expect(accion).toHaveBeenCalledTimes(1)

  // Avanzamos el reloj 5000 ms: el setInterval dispara una vez más
  await vi.advanceTimersByTimeAsync(5000)
  expect(accion).toHaveBeenCalledTimes(2)

  // Avanzamos otros 5000 ms (10000 ms en total): otra ejecución
  await vi.advanceTimersByTimeAsync(5000)
  expect(accion).toHaveBeenCalledTimes(3)
})

it('despues de desmontar el componente ya no ejecuta la accion', async () => {
  const accion = vi.fn()

  const wrapper = mount(crearComponente(accion))
  // 1 llamada inmediata
  expect(accion).toHaveBeenCalledTimes(1)

  // Desmontamos: onUnmounted llama clearInterval
  wrapper.unmount()

  // Avanzamos el reloj: el interval ya fue cancelado, no debe ejecutarse más
  await vi.advanceTimersByTimeAsync(15000)
  expect(accion).toHaveBeenCalledTimes(1)
})

it('no superpone peticiones si la accion tarda mas que el intervalo y saltea el turno', async () => {
  let resolverPrimerPedido
  const accion = vi.fn(() => new Promise((resolve) => {
    resolverPrimerPedido = resolve
  }))

  mount(crearComponente(accion))
  // Al montar arranca la 1ra petición
  expect(accion).toHaveBeenCalledTimes(1)

  // A los 5000 ms el temporizador dispara, pero el primer pedido sigue en vuelo: se saltea el turno
  await vi.advanceTimersByTimeAsync(5000)
  expect(accion).toHaveBeenCalledTimes(1)

  // El primer pedido termina a los 7000 ms
  resolverPrimerPedido()
  await flushPromises()

  // Al llegar el siguiente intervalo (10000 ms en total), como ya no hay nada en vuelo, se lanza el 2do pedido
  await vi.advanceTimersByTimeAsync(5000)
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

  // A los 5000 ms se ejecuta la siguiente llamada normalmente sin interrumpir el polling
  debeFallar = false
  await vi.advanceTimersByTimeAsync(5000)
  expect(accion).toHaveBeenCalledTimes(2)
})
