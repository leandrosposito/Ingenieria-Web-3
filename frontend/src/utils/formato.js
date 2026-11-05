// Todas devuelven "-" si no hay dato

const SIN_DATO = '-'

export function formatearDuracion(segundos) {
  if (segundos === null || segundos === undefined) return SIN_DATO
  const dos = (n) => String(n).padStart(2, '0')
  const horas = Math.floor(segundos / 3600)
  const minutos = Math.floor((segundos % 3600) / 60)
  return `${dos(horas)}:${dos(minutos)}:${dos(segundos % 60)}`
}

export function formatearEta(horas) {
  if (horas === null || horas === undefined) return SIN_DATO
  const minutosTotales = Math.round(horas * 60)
  const h = Math.floor(minutosTotales / 60)
  const m = minutosTotales % 60
  return h > 0 ? `${h} h ${m} min` : `${m} min`
}

export function formatearNumero(valor, decimales = 1) {
  if (valor === null || valor === undefined) return SIN_DATO
  return Number(valor).toFixed(decimales)
}

export function formatearFechaHora(iso) {
  if (!iso) return SIN_DATO
  return new Date(iso).toLocaleString('es-AR')
}
