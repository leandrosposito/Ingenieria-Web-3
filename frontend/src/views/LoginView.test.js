import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '../stores/auth'
import LoginView from './LoginView.vue'

let querySimulada = {}
const pushFalso = vi.fn()

vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router')
  return {
    ...actual,
    useRouter: () => ({ push: pushFalso }),
    useRoute: () => ({ query: querySimulada }),
  }
})

function respuesta(status, cuerpo) {
  return { ok: status < 400, status, json: async () => cuerpo }
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  pushFalso.mockClear()
  querySimulada = {}
  vi.restoreAllMocks()
})

describe('LoginView.vue', () => {
  it('login exitoso redirige al inicio por defecto', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(respuesta(200, { token: 'jwt-valido', username: 'admin', rol: 'ADMIN' }))
    )

    const wrapper = mount(LoginView)
    const [inputUsuario, inputPassword] = wrapper.findAll('input')

    await inputUsuario.setValue('admin')
    await inputPassword.setValue('demo1234')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(pushFalso).toHaveBeenCalledWith('/')
    expect(wrapper.find('.error').exists()).toBe(false)
  })

  it('login exitoso respeta query.redirect si fue enviado desde otra ruta', async () => {
    querySimulada = { redirect: '/monitoreo' }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(respuesta(200, { token: 'jwt-valido', username: 'admin', rol: 'ADMIN' }))
    )

    const wrapper = mount(LoginView)
    const [inputUsuario, inputPassword] = wrapper.findAll('input')

    await inputUsuario.setValue('admin')
    await inputPassword.setValue('demo1234')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(pushFalso).toHaveBeenCalledWith('/monitoreo')
  })

  it('muestra mensaje de error cuando las credenciales son invalidas', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(respuesta(401, { mensaje: 'Usuario o contrasena incorrectos' }))
    )

    const wrapper = mount(LoginView)
    const [inputUsuario, inputPassword] = wrapper.findAll('input')

    await inputUsuario.setValue('admin')
    await inputPassword.setValue('clave-incorrecta')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const error = wrapper.find('.error')
    expect(error.exists()).toBe(true)
    expect(error.text()).toBe('Usuario o contrasena incorrectos')
    expect(pushFalso).not.toHaveBeenCalled()
  })

  it('el boton de submit se deshabilita mientras se envia la solicitud', async () => {
    let resolverPromesa
    const promesaPendiente = new Promise((resolve) => {
      resolverPromesa = resolve
    })

    vi.stubGlobal('fetch', vi.fn().mockReturnValue(promesaPendiente))

    const wrapper = mount(LoginView)
    const boton = wrapper.find('button[type="submit"]')
    const [inputUsuario, inputPassword] = wrapper.findAll('input')

    expect(boton.attributes('disabled')).toBeUndefined()

    await inputUsuario.setValue('admin')
    await inputPassword.setValue('demo1234')
    await wrapper.find('form').trigger('submit')

    expect(boton.attributes('disabled')).toBeDefined()

    resolverPromesa(respuesta(200, { token: 'ok', username: 'admin', rol: 'ADMIN' }))
    await flushPromises()

    expect(boton.attributes('disabled')).toBeUndefined()
  })

  it('muestra el aviso de sesion vencida si esta presente en el store', () => {
    const auth = useAuthStore()
    auth.avisoSesion = 'Tu sesión venció, ingresá de nuevo'

    const wrapper = mount(LoginView)
    const aviso = wrapper.find('.aviso')

    expect(aviso.exists()).toBe(true)
    expect(aviso.text()).toBe('Tu sesión venció, ingresá de nuevo')
  })
})
