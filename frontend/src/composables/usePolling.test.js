import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
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

it('a los 5000 ms ejecuta 2 veces en total y a los 10000 ms ejecuta 3 veces', () => {
  const accion = vi.fn()

  mount(crearComponente(accion))
  // 1 llamada inmediata (onMounted)
  expect(accion).toHaveBeenCalledTimes(1)

  // Avanzamos el reloj 5000 ms: el setInterval dispara una vez más
  vi.advanceTimersByTime(5000)
  expect(accion).toHaveBeenCalledTimes(2)

  // Avanzamos otros 5000 ms (10000 ms en total): otra ejecución
  vi.advanceTimersByTime(5000)
  expect(accion).toHaveBeenCalledTimes(3)
})

it('despues de desmontar el componente ya no ejecuta la accion', () => {
  const accion = vi.fn()

  const wrapper = mount(crearComponente(accion))
  // 1 llamada inmediata
  expect(accion).toHaveBeenCalledTimes(1)

  // Desmontamos: onUnmounted llama clearInterval
  wrapper.unmount()

  // Avanzamos el reloj: el interval ya fue cancelado, no debe ejecutarse más
  vi.advanceTimersByTime(15000)
  expect(accion).toHaveBeenCalledTimes(1)
})
