import { useAuthStore } from '../stores/auth'
import { leerError } from './errores'

/** Llama a la API con el token y devuelve el JSON. Ej: await api('/api/v1/ordenes') */
export async function api(ruta, { method = 'GET', body } = {}) {
  const auth = useAuthStore()
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`

  const res = await fetch(ruta, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!res.ok) {
    // 401 con sesion abierta = token vencido: se cierra la sesion y se muestra aviso de expiracion
    if (res.status === 401 && auth.token) auth.logout(true)
    throw await leerError(res)
  }
  return res.status === 204 ? null : res.json()
}
