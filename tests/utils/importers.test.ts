import { describe, it, expect } from 'vitest'
import { parseOFX, parseCSV } from '../../src/utils/importers'

const OFX_SGML = `
OFXHEADER:100
DATA:OFXSGML

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260501120000
<TRNAMT>-150.00
<FITID>001
<MEMO>SUPERMERCADO ABC
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260510
<TRNAMT>1240.00
<FITID>002
<MEMO>PAGAMENTO RECEBIDO
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
`

const OFX_XML = `
<OFX>
<BANKTRANLIST>
<STMTTRN>
  <TRNTYPE>DEBIT</TRNTYPE>
  <DTPOSTED>20260515</DTPOSTED>
  <TRNAMT>-89.90</TRNAMT>
  <MEMO>NETFLIX</MEMO>
</STMTTRN>
</BANKTRANLIST>
</OFX>
`

const CSV_NUBANK = `Data,Descrição,Valor
2026-05-15,Supermercado,-150.0
2026-05-10,Pagamento,1240.0
`

const CSV_BR = `Data;Histórico;Valor
15/05/2026;SUPERMERCADO;-150,00
10/05/2026;PAGAMENTO RECEBIDO;1.240,00
`

describe('parseOFX', () => {
  it('parses SGML OFX with two transactions', () => {
    const txs = parseOFX(OFX_SGML)
    expect(txs).toHaveLength(2)
    expect(txs[0]).toMatchObject({ date: '2026-05-01', amount: 150, type: 'expense', description: 'SUPERMERCADO ABC' })
    expect(txs[1]).toMatchObject({ date: '2026-05-10', amount: 1240, type: 'income', description: 'PAGAMENTO RECEBIDO' })
  })

  it('parses XML OFX', () => {
    const txs = parseOFX(OFX_XML)
    expect(txs).toHaveLength(1)
    expect(txs[0]).toMatchObject({ date: '2026-05-15', amount: 89.9, type: 'expense' })
  })

  it('returns empty array for invalid content', () => {
    expect(parseOFX('not ofx content')).toHaveLength(0)
  })
})

describe('parseCSV', () => {
  it('parses Nubank CSV (comma delimiter, ISO date)', () => {
    const txs = parseCSV(CSV_NUBANK)
    expect(txs).toHaveLength(2)
    expect(txs[0]).toMatchObject({ date: '2026-05-15', amount: 150, type: 'expense' })
    expect(txs[1]).toMatchObject({ date: '2026-05-10', amount: 1240, type: 'income' })
  })

  it('parses BR CSV (semicolon delimiter, DD/MM/YYYY date, PT-BR amount)', () => {
    const txs = parseCSV(CSV_BR)
    expect(txs).toHaveLength(2)
    expect(txs[0]).toMatchObject({ date: '2026-05-15', amount: 150, type: 'expense' })
    expect(txs[1]).toMatchObject({ date: '2026-05-10', amount: 1240, type: 'income' })
  })

  it('returns empty array for empty content', () => {
    expect(parseCSV('')).toHaveLength(0)
  })
})
