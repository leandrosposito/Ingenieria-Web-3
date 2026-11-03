import { onMounted, onUnmounted } from 'vue'

/**
 * Ejecuta accion al mostrar la pantalla y despues cada cadaMs milisegundos (polling); se detiene al salir.
 * Si una llamada tarda mas que el intervalo, se saltea el turno para no superponer peticiones concurrentes.
 * Si la accion falla, el ciclo continua normalmente en el siguiente intervalo.
 */
export function usePolling(accion, cadaMs) {
  let temporizador = null
  let enCurso = false

  async function ejecutar() {
    if (enCurso) return
    enCurso = true
    try {
      await accion()
    } catch {
      // Si la accion falla, permitimos que el ciclo continue en el proximo intervalo
    } finally {
      enCurso = false
    }
  }

  onMounted(() => {
    ejecutar()
    temporizador = setInterval(ejecutar, cadaMs)
  })

  onUnmounted(() => {
    clearInterval(temporizador)
  })
}
