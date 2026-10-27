import type { Question } from '../data/types'
import type { Arquivo } from './store'
import { normalize } from './format'

// Árvore de pastas do acervo no Drive, montada a partir do caminho de cada PDF.
export interface Pasta { nome: string; path: string; filhas: Map<string, Pasta>; arquivos: Arquivo[] }

// "✅[5º PERÍODO]" → "5º PERÍODO"; "📄 RESUMOS 5" → "RESUMOS 5"; "🎯🆕 ASSUNTOS…" → "ASSUNTOS…"
export const limpa = (s: string) =>
  s.replace(/\s*\((?:https?:\/\/)?www\.[^)]*\)/gi, '').replace(/^[✅🔍📄🎯🆕\s]+/u, '').replace(/[✅🔍📄🎯🆕]/gu, '').replace(/\[\s*|\s*\]/g, '').replace(/\.pdf$/i, '').trim()

let memo: { de?: Arquivo[]; raiz?: Pasta } = {}
export function arvore(arquivos: Arquivo[]): Pasta {
  if (memo.de === arquivos && memo.raiz) return memo.raiz
  const raiz: Pasta = { nome: 'Acervo', path: '', filhas: new Map(), arquivos: [] }
  for (const a of arquivos) {
    let n = raiz
    for (const p of a.path.split('/').slice(0, -1)) {
      if (!n.filhas.has(p)) n.filhas.set(p, { nome: p, path: n.path ? `${n.path}/${p}` : p, filhas: new Map(), arquivos: [] })
      n = n.filhas.get(p)!
    }
    n.arquivos.push(a)
  }
  memo = { de: arquivos, raiz }
  return raiz
}

export const pastaEm = (raiz: Pasta, path: string) =>
  path.split('/').filter(Boolean).reduce<Pasta | undefined>((n, p) => n?.filhas.get(p), raiz)

export const todos = (n: Pasta): Arquivo[] => [...n.arquivos, ...[...n.filhas.values()].flatMap(todos)]

// Pasta de primeiro nível da área: TPI, ENAMED, INTERNATO, 5º PERÍODO…
export const pastaDaArea = (raiz: Pasta, nome: string) =>
  [...raiz.filhas.values()].find((k) => normalize(limpa(k.nome)) === normalize(nome) || normalize(k.nome).includes(normalize(nome)))
export const pastaDoPeriodo = (raiz: Pasta, p: number) =>
  [...raiz.filhas.values()].find((k) => /PER[ÍI]ODO/.test(k.nome) && parseInt(limpa(k.nome)) === p)

export const semestreDe = (a: Arquivo) => a.semestre || (a.nome.match(/(20\d\d\.[12])/) || [])[1] || ''

// Etiquetas pelo nome do arquivo, como no Meu Acervo
export function etiquetas(a: Arquivo): [string, 'rec' | 'alt' | 'gab'][] {
  const n = a.nome, out: [string, 'rec' | 'alt' | 'gab'][] = []
  if (/recurso/i.test(n)) out.push(['Recurso', 'rec'])
  if (/s_ ?alt/i.test(n)) out.push(['Só gabarito', 'alt'])
  if (/gabarito|comentad/i.test(n)) out.push([/comentad/i.test(n) ? 'Comentada' : 'Gabarito', 'gab'])
  if (/anulada/i.test(n)) out.push(['Anulada', 'rec'])
  return out
}

// Pasta dos PDFs de uma disciplina: a mais comum entre os arquivos de origem das questões dela;
// sem questões, a pasta do período (ou da área) com o mesmo nome.
export function pastaDaDisciplina(raiz: Pasta, arquivos: Arquivo[], questions: Question[], disciplina: string, periodo?: number) {
  const byId = new Map(arquivos.map((a) => [a.id, a]))
  const conta = new Map<string, number>()
  for (const q of questions) {
    if (q.disciplina !== disciplina || (periodo !== undefined && q.periodo !== periodo) || !q.arquivo) continue
    const a = byId.get(q.arquivo)
    if (a) { const dir = a.path.split('/').slice(0, -1).join('/'); conta.set(dir, (conta.get(dir) ?? 0) + 1) }
  }
  const top = [...conta].sort((a, b) => b[1] - a[1])[0]?.[0]
  if (top !== undefined) return top
  const base = periodo && periodo <= 8 ? pastaDoPeriodo(raiz, periodo) : undefined
  const alvo = normalize(disciplina.replace(/^Internato · /, ''))
  const achada = base && [...base.filhas.values()].find((k) => normalize(limpa(k.nome)) === alvo)
  return achada?.path ?? base?.path ?? ''
}

// "✅[5º PERÍODO]/CC 1/CC 1 - (2023.1).pdf" → "5º PERÍODO · CC 1"
export const caminhoDe = (a: Arquivo) => a.path.split('/').slice(0, -1).map(limpa).join(' · ')

export const driveView = (id: string) => `https://drive.google.com/file/d/${id}/view`
export const drivePreview = (id: string) => `https://drive.google.com/file/d/${id}/preview`
