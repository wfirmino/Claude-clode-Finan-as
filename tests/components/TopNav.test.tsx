import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import TopNav from '../../src/components/TopNav'

describe('TopNav', () => {
  it('renderiza todas as abas de navegação', () => {
    render(<MemoryRouter><TopNav /></MemoryRouter>)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Transações')).toBeInTheDocument()
    expect(screen.getByText('Parcelamentos')).toBeInTheDocument()
    expect(screen.getByText('Metas')).toBeInTheDocument()
    expect(screen.getByText('Relatórios')).toBeInTheDocument()
    expect(screen.getByText('Categorias')).toBeInTheDocument()
  })

  it('tem aria-label para acessibilidade', () => {
    render(<MemoryRouter><TopNav /></MemoryRouter>)
    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument()
  })
})
