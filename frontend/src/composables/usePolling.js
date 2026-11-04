import { onMounted, onUnmounted } from 'vue'

// Ejecuta al montar y luego por intervalo, sin superponer llamadas del polling.
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
