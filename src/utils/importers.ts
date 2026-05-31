export interface ImportedTransaction {
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
}

// ─── OFX ────────────────────────────────────────────────────────────────────

function getOFXField(block: string, tag: string): string | null {
  const xmlRe = new RegExp(`<${tag}>([^<]+)</${tag}>`, 'i')
  const sgmlRe = new RegExp(`<${tag}>([^\n<]+)`, 'i')
  return (block.match(xmlRe) ?? block.match(sgmlRe))?.[1]?.trim() ?? null
}

function ofxDateToISO(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 8) return null
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
}

export function parseOFX(content: string): ImportedTransaction[] {
  const results: ImportedTransaction[] = []
  const hasXMLClose = content.includes('</STMTTRN>')
  const blocks = hasXMLClose
    ? [...content.matchAll(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi)].map(m => m[0])
    : content.split(/<STMTTRN>/i).slice(1).map(b => `<STMTTRN>${b}`)

  for (const block of blocks) {
    const dateRaw = getOFXField(block, 'DTPOSTED')
    const amountRaw = getOFXField(block, 'TRNAMT')
    const memo = getOFXField(block, 'MEMO') ?? getOFXField(block, 'NAME') ?? 'Importado'
    if (!dateRaw || !amountRaw) continue
    const date = ofxDateToISO(dateRaw)
    if (!date) continue
    const amount = parseFloat(amountRaw.replace(',', '.'))
    if (isNaN(amount) || amount === 0) continue
    results.push({
      date,
      description: memo.trim(),
      amount: Math.abs(amount),
      type: amount >= 0 ? 'income' : 'expense',
    })
  }
  return results
}

// ─── CSV ────────────────────────────────────────────────────────────────────

function detectDelimiter(line: string): string {
  const counts: Record<string, number> = { ';': 0, ',': 0, '\t': 0 }
  for (const ch of line) if (ch in counts) counts[ch]++
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
}

function parseAnyDate(s: string): string | null {
  const t = s.trim()
  const dmy = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t
  const ymd = t.match(/^(\d{4})\/(\d{2})\/(\d{2})$/)
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`
  return null
}

function parseAnyAmount(s: string): number | null {
  if (!s?.trim()) return null
  const clean = s.trim().replace(/R\$\s*/g, '').trim()
  if (clean.includes(',') && clean.includes('.')) {
    const v = clean.lastIndexOf(',') > clean.lastIndexOf('.')
      ? parseFloat(clean.replace(/\./g, '').replace(',', '.'))
      : parseFloat(clean.replace(/,/g, ''))
    return isNaN(v) ? null : v
  }
  if (clean.includes(',')) { const v = parseFloat(clean.replace(',', '.')); return isNaN(v) ? null : v }
  const v = parseFloat(clean.replace(/[^\d.\-]/g, ''))
  return isNaN(v) ? null : v
}

function colIdx(headers: string[], keywords: string[]): number {
  const lc = headers.map(h => h.toLowerCase().trim())
  for (const kw of keywords) { const i = lc.findIndex(h => h.includes(kw)); if (i >= 0) return i }
  return -1
}

export function parseCSV(content: string): ImportedTransaction[] {
  const lines = content.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  const delim = detectDelimiter(lines[0])
  const headers = lines[0].split(delim).map(h => h.replace(/^["']|["']$/g, '').trim())

  const dateCol = colIdx(headers, ['data', 'date', 'dt '])
  const descCol = colIdx(headers, ['histórico', 'historico', 'descrição', 'descricao', 'description', 'memo', 'lançamento', 'lancamento'])
  const amtCol  = colIdx(headers, ['valor', 'value', 'amount', 'quantia'])
  const debCol  = colIdx(headers, ['débito', 'debito', 'debit', 'saída', 'saida'])
  const creCol  = colIdx(headers, ['crédito', 'credito', 'credit', 'entrada'])

  if (dateCol < 0) return []

  const results: ImportedTransaction[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(delim).map(c => c.replace(/^["']|["']$/g, '').trim())
    if (cells.length < 2) continue
    const date = parseAnyDate(cells[dateCol] ?? '')
    if (!date) continue
    const desc = cells[descCol >= 0 ? descCol : 1] ?? 'Importado'

    let amount: number | null = null
    let type: 'income' | 'expense' = 'expense'

    if (amtCol >= 0 && cells[amtCol]) {
      amount = parseAnyAmount(cells[amtCol])
      if (amount !== null) { type = amount >= 0 ? 'income' : 'expense'; amount = Math.abs(amount) }
    } else if (debCol >= 0 || creCol >= 0) {
      const deb = debCol >= 0 ? parseAnyAmount(cells[debCol] ?? '') : null
      const cre = creCol >= 0 ? parseAnyAmount(cells[creCol] ?? '') : null
      if (cre && Math.abs(cre) > 0) { amount = Math.abs(cre); type = 'income' }
      else if (deb && Math.abs(deb) > 0) { amount = Math.abs(deb); type = 'expense' }
    }

    if (!amount || amount <= 0) continue
    results.push({ date, description: desc.trim(), amount, type })
  }
  return results
}
