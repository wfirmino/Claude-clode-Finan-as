import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import ProfileTabs from '../../src/components/ProfileTabs'
import type { Perfil } from '../../src/types'

describe('ProfileTabs', () => {
  it('renders three tabs', () => {
    render(<ProfileTabs active="pessoal" onChange={vi.fn()} />)
    expect(screen.getByRole('tab', { name: /pessoal/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /empresarial/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /kommo/i })).toBeInTheDocument()
  })

  it('marks active tab with aria-selected=true', () => {
    render(<ProfileTabs active="empresarial" onChange={vi.fn()} />)
    expect(screen.getByRole('tab', { name: /empresarial/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /pessoal/i })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: /kommo/i })).toHaveAttribute('aria-selected', 'false')
  })

  it('calls onChange with the clicked perfil', () => {
    const onChange = vi.fn()
    render(<ProfileTabs active="pessoal" onChange={onChange} />)
    fireEvent.click(screen.getByRole('tab', { name: /kommo/i }))
    expect(onChange).toHaveBeenCalledWith('kommo' as Perfil)
  })
})
