export const ESTADOS_ORDEN = [
  { valor: 'PENDIENTE_PESAJE_INICIAL', texto: '1 · Pendiente de pesaje inicial' },
  { valor: 'CON_PESAJE_INICIAL', texto: '2 · Con pesaje inicial registrado' },
  { valor: 'CERRADA_PARA_CARGA', texto: '3 · Cerrada para carga' },
  { valor: 'FINALIZADA', texto: '4 · Finalizada' },
]

export function textoEstado(valor) {
  const estado = ESTADOS_ORDEN.find((e) => e.valor === valor)
  return estado ? estado.texto : valor
}
