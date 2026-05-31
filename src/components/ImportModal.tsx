import { useState } from 'react'
import { parseOFX, parseCSV, type ImportedTransaction } from '../utils/importers'
import { formatCurrency, formatDate } from '../utils/formatters'
import Modal from './Modal'

interface ImportRow {
  title: string
  amount: number
  type: 'income' | 'expense'
  date: string
  perfil: 'cartao'
  card_id: string
  category_id: null
  notes: null
}

interface Props {
  open: boolean
  cardName: string
  cardId?: string
  onClose: () => void
  onImport: (rows: ImportRow[]) => Promise<void>
}

export default function ImportModal({ open, cardName, cardId = '', onClose, onImport }: Props) {
  const [parsed, setParsed] = useState<ImportedTransaction[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')

  function reset() { setParsed([]); setSelected(new Set()); setError(null); setFileName('') }

  function handleFile(file: File) {
    setError(null)
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = e => {
      const content = e.target?.result as string
      const txs = file.name.toLowerCase().endsWith('.ofx') ? parseOFX(content) : parseCSV(content)
      if (txs.length === 0) {
        setError('Nenhuma transação encontrada. Verifique se o formato é suportado.')
        return
      }
      setParsed(txs)
      setSelected(new Set(txs.map((_, i) => i)))
    }
    reader.readAsText(file, 'ISO-8859-1')
  }

  function toggleRow(i: number) {
    const next = new Set(selected)
    next.has(i) ? next.delete(i) : next.add(i)
    setSelected(next)
  }

  function toggleAll() {
    setSelected(selected.size === parsed.length ? new Set() : new Set(parsed.map((_, i) => i)))
  }

  async function handleImport() {
    const rows: ImportRow[] = [...selected].sort((a, b) => a - b).map(i => ({
      title: parsed[i].description,
      amount: parsed[i].amount,
      type: parsed[i].type,
      date: parsed[i].date,
      perfil: 'cartao' as const,
      card_id: cardId,
      category_id: null,
      notes: null,
    }))
    setImporting(true)
    try { await onImport(rows); reset(); onClose() }
    finally { setImporting(false) }
  }

  const n = selected.size
  const plural = n !== 1 ? 'ões' : 'ão'

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} titleId="import-modal-title">
      <h3 id="import-modal-title" className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Importar para {cardName}
      </h3>

      {parsed.length === 0 ? (
        <div>
          <div
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            onDragOver={e => e.preventDefault()}
            onClick={() => document.getElementById('import-file-input')?.click()}
            className="border-2 border-dashed border-gray-300 dark:border-[#2a2a2a] rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors"
          >
            <svg className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Arraste e solte seu arquivo aqui</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">ou clique para selecionar</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">Suporta .ofx e .csv</p>
          </div>
          <input id="import-file-input" type="file" accept=".ofx,.csv" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <details className="mt-4">
            <summary className="text-xs text-gray-400 dark:text-gray-500 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300">Bancos suportados</summary>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 leading-relaxed">
              OFX: Itaú, Bradesco, Santander, Banco do Brasil, Caixa, Nubank.<br />
              CSV: Nubank, Inter, C6, XP e outros com colunas Data, Descrição e Valor.
            </p>
          </details>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-[200px]">{fileName}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{parsed.length} transações encontradas</p>
            </div>
            <button onClick={reset} className="text-xs text-indigo-600 hover:underline">Trocar arquivo</button>
          </div>

          <div className="border border-gray-200 dark:border-[#2a2a2a] rounded-lg overflow-hidden mb-3">
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-[#111111] sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">
                      <input type="checkbox" checked={selected.size === parsed.length} onChange={toggleAll} />
                    </th>
                    <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400 font-medium">Data</th>
                    <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400 font-medium">Descrição</th>
                    <th className="px-3 py-2 text-right text-gray-500 dark:text-gray-400 font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#2a2a2a]">
                  {parsed.map((t, i) => (
                    <tr key={i} className={selected.has(i) ? '' : 'opacity-40'}>
                      <td className="px-3 py-2"><input type="checkbox" checked={selected.has(i)} onChange={() => toggleRow(i)} /></td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDate(t.date)}</td>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-200 max-w-[180px] truncate">{t.description}</td>
                      <td className={`px-3 py-2 text-right font-medium tabular-nums whitespace-nowrap ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">{n} de {parsed.length} selecionadas</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => { reset(); onClose() }} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg">Cancelar</button>
              <button onClick={handleImport} disabled={n === 0 || importing} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60">
                {importing ? 'Importando...' : `Importar ${n} transaç${plural}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
