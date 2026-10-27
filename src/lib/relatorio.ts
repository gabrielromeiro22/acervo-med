import type { Question } from '../data/types'
import { LETTERS, fmtTime, periodoLabel, semFiguras } from './format'
import { acertou, type Simulado } from './store'

// Relatório de prova em texto: informações, desempenho geral e cada questão errada (ou em branco) com
// enunciado, alternativas, sua resposta, gabarito e comentário. Depois as anuladas e a lista das certas.
const W = 62
const linha = (t = '', c = '=') => {
  if (!t) return c.repeat(W)
  const lado = Math.max(2, Math.floor((W - t.length - 2) / 2))
  return `${c.repeat(lado)} ${t} ${c.repeat(Math.max(2, W - lado - t.length - 2))}`
}
const campo = (k: string, v: string | number) => `${(k + ':').padEnd(22)}${v}`

export function relatorioTxt(sim: Simulado, byId: Map<string, Question>) {
  const qs = sim.questionIds.map((id, i) => ({ id, n: i + 1, q: byId.get(id), a: sim.answers[id] }))
  const total = qs.length
  const anuladas = qs.filter((r) => sim.anuladas?.includes(r.id))
  const certas = qs.filter((r) => !sim.anuladas?.includes(r.id) && r.q && r.a === r.q.correta)
  const erradas = qs.filter((r) => !acertou(sim, r.id, r.q?.correta))
  const pontos = certas.length + anuladas.length
  const q0 = qs.find((r) => r.q)?.q
  const out = [
    linha('', '═'),
    'RELATÓRIO DE PROVA'.padStart(40).padEnd(W),
    'Acervo Med'.padStart(36).padEnd(W),
    linha('', '═'), '',
    linha('INFORMAÇÕES DA PROVA'),
    campo('Prova', sim.nome),
    ...(q0 ? [campo('Período', periodoLabel(q0.periodo)), campo('Disciplina', q0.disciplina)] : []),
    campo('Concluída em', new Date(sim.finishedAt ?? Date.now()).toLocaleString('pt-BR')),
    campo('Tempo', fmtTime(sim.elapsedSec)),
    linha(), '',
    linha('DESEMPENHO GERAL'),
    campo('✔ Acertos', `${certas.length} / ${total}`),
    campo('✘ Erros', `${erradas.filter((r) => r.a !== undefined).length} / ${total}`),
    campo('○ Em branco', erradas.filter((r) => r.a === undefined).length),
    campo('⊘ Anuladas', anuladas.length),
    campo('Pontos obtidos', `${pontos} / ${total}`),
    campo('Percentual', `${total ? ((pontos / total) * 100).toFixed(1) : '0.0'}%`),
    linha(), '', '',
  ]
  const bloco = (titulo: string, rs: typeof qs, resposta: boolean) => {
    if (!rs.length) return
    out.push(linha(`${titulo} (${rs.length})`), '')
    for (const r of rs) {
      out.push(`[ QUESTÃO ${r.n} ]`, '')
      if (!r.q) { out.push('Questão não está mais no acervo.', linha('', '-'), ''); continue }
      out.push('Enunciado:', semFiguras(r.q.enunciado), '')
      r.q.alternativas.forEach((alt, i) => out.push(`  ${LETTERS[i]}) ${semFiguras(alt)}`))
      out.push('')
      if (resposta) out.push(`  » Sua resposta: ${r.a === undefined ? 'em branco' : LETTERS[r.a]}`)
      out.push(`  » Gabarito:     ${LETTERS[r.q.correta]}`, '', 'Comentário:', semFiguras(r.q.comentario || 'Sem comentário no material original.'))
      if (r.q.referencia) out.push('', `Referência: ${r.q.referencia}`)
      out.push(linha('', '-'), '')
    }
  }
  bloco('QUESTÕES INCORRETAS', erradas, true)
  bloco('QUESTÕES ANULADAS', anuladas, false)
  if (certas.length) out.push(linha(`QUESTÕES CORRETAS (${certas.length})`), certas.map((r) => `Questão ${r.n}`).join(' · '), linha())
  return out.join('\n')
}

export function baixarTexto(nome: string, texto: string) {
  const url = URL.createObjectURL(new Blob([texto], { type: 'text/plain;charset=utf-8' }))
  Object.assign(document.createElement('a'), { href: url, download: `${nome.replace(/\s*·\s*/g, ' - ').replace(/[^\p{L}\p{N}\- ]+/gu, '').trim() || 'prova'}.txt` }).click()
  URL.revokeObjectURL(url)
}
