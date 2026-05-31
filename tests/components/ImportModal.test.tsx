import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import ImportModal from '../../src/components/ImportModal'

const mockOnImport = vi.fn().mockResolvedValue(undefined)
const mockOnClose = vi.fn()

describe('ImportModal', () => {
  it('renders upload area when open', () => {
    render(<ImportModal open={true} cardName="Nubank" onClose={mockOnClose} onImport={mockOnImport} />)
    expect(screen.getByText(/Importar para Nubank/i)).toBeInTheDocument()
    expect(screen.getByText(/Arraste e solte/i)).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<ImportModal open={false} cardName="Nubank" onClose={mockOnClose} onImport={mockOnImport} />)
    expect(screen.queryByText(/Importar para Nubank/i)).not.toBeInTheDocument()
  })

  it('shows parsed transactions after CSV file upload', async () => {
    render(<ImportModal open={true} cardName="Nubank" onClose={mockOnClose} onImport={mockOnImport} />)
    const csv = 'Data,Descrição,Valor\n2026-05-15,Netflix,-44.90\n2026-05-10,Pagamento,1240.00'
    const file = new File([csv], 'extrato.csv', { type: 'text/csv' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => {
      expect(screen.getByText('Netflix')).toBeInTheDocument()
      expect(screen.getByText('Pagamento')).toBeInTheDocument()
    })
  })

  it('calls onImport with selected transactions', async () => {
    render(<ImportModal open={true} cardName="Nubank" onClose={mockOnClose} onImport={mockOnImport} />)
    const csv = 'Data,Descrição,Valor\n2026-05-15,Netflix,-44.90'
    const file = new File([csv], 'extrato.csv', { type: 'text/csv' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => screen.getByText('Netflix'))
    fireEvent.click(screen.getByRole('button', { name: /importar 1/i }))
    await waitFor(() => {
      expect(mockOnImport).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ title: 'Netflix', type: 'expense' })])
      )
    })
  })
})
