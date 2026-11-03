import { expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import EstadoBadge from './EstadoBadge.vue'

it('muestra el texto del estado', () => {
  const badge = mount(EstadoBadge, { props: { estado: 'FINALIZADA' } })
  expect(badge.text()).toBe('4 · Finalizada')
})

it('usa una clase distinta según el estado', () => {
  const pendiente = mount(EstadoBadge, { props: { estado: 'PENDIENTE_PESAJE_INICIAL' } })
  const finalizada = mount(EstadoBadge, { props: { estado: 'FINALIZADA' } })
  expect(pendiente.classes()).toContain('badge-pendiente')
  expect(finalizada.classes()).toContain('badge-finalizada')
})

it('con un estado desconocido muestra el valor tal cual y el estilo por defecto', () => {
  const badge = mount(EstadoBadge, { props: { estado: 'OTRO' } })
  expect(badge.text()).toBe('OTRO')
  expect(badge.classes()).toContain('badge-default')
})
