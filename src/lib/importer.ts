import type { Dificuldade, Flashcard, Material, Question } from '../data/types'
import { uid, type State } from './store'

export type Imported = State['imported']
export type ParseResult = { kind: 'backup'; state: State } | { kind: 'content'; content: Imported }

const DIFS: Dificuldade[] = ['facil', 'media', 'dificil']
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '')

function toQuestion(r: Record<string, unknown>): Question | null {
  const alternativas = Array.isArray(r.alternativas) ? r.alternativas.map(str).filter(Boolean) : []
  const correta = typeof r.correta === 'number' ? r.correta : 'ABCDEFGH'.indexOf(str(r.correta).toUpperCase())
  const enunciado = str(r.enunciado)
  if (!enunciado || alternativas.length < 2 || correta < 0 || correta >= alternativas.length) return null
  const dif = normalizeDif(str(r.dificuldade))
  return {
    id: str(r.id) || `imp-${uid()}`,
    disciplina: str(r.disciplina) || 'Outras',
    tema: str(r.tema) || 'Geral',
    periodo: Number(r.periodo) || 0,
    dificuldade: dif,
    enunciado,
    alternativas,
    correta,
    comentario: str(r.comentario) || 'Sem comentário.',
    ...(str(r.referencia) && { referencia: str(r.referencia) }),
    ...(str(r.fonte) && { fonte: str(r.fonte) }),
  }
}

function normalizeDif(s: string): Dificuldade {
  const t = s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  return DIFS.find((d) => t.startsWith(d.slice(0, 3))) ?? 'media'
}

function toFlashcard(r: Record<string, unknown>): Flashcard | null {
  const frente = str(r.frente), verso = str(r.verso)
  if (!frente || !verso) return null
  return { id: str(r.id) || `imp-${uid()}`, disciplina: str(r.disciplina) || 'Outras', tema: str(r.tema) || 'Geral', frente, verso }
}

function toMaterial(r: Record<string, unknown>): Material | null {
  const titulo = str(r.titulo), conteudo = str(r.conteudo)
  if (!titulo || !conteudo) return null
  const tipo = (['resumo', 'checklist', 'mapa'] as const).find((t) => t === r.tipo) ?? 'resumo'
  return { id: str(r.id) || `imp-${uid()}`, titulo, disciplina: str(r.disciplina) || 'Outras', periodo: Number(r.periodo) || 0, tipo, conteudo }
}

const rows = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object') : [])
const keep = <T>(xs: (T | null)[]) => xs.filter((x): x is T => x !== null)

export function parseJSON(text: string): ParseResult {
  const data: unknown = JSON.parse(text)
  if (data && typeof data === 'object' && !Array.isArray(data) && 'attempts' in data && 'imported' in data) {
    return { kind: 'backup', state: data as State }
  }
  // Um array solto é tratado como lista de questões.
  const obj = (Array.isArray(data) ? { questions: data } : data) as Record<string, unknown>
  return {
    kind: 'content',
    content: {
      questions: keep(rows(obj.questions).map(toQuestion)),
      flashcards: keep(rows(obj.flashcards).map(toFlashcard)),
      materials: keep(rows(obj.materials).map(toMaterial)),
    },
  }
}

// CSV com cabeçalho; separador "," ou ";". Alternativas nas colunas A–E (até H).
export function parseCSV(text: string): Imported {
  const first = text.split('\n', 1)[0]
  const sep = (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ';' : ','
  const table = splitCSV(text.replace(/^\uFEFF/, ''), sep)
  const head = (table.shift() ?? []).map((h) => h.trim().toLowerCase())
  const questions = table.map((cells) => {
    const r: Record<string, unknown> = {}
    head.forEach((h, i) => { r[h] = cells[i] ?? '' })
    r.alternativas = 'abcdefgh'.split('').map((l) => str(r[l])).filter(Boolean)
    const c = str(r.correta)
    r.correta = /^\d+$/.test(c) ? Number(c) - 1 : c
    return toQuestion(r)
  })
  return { questions: keep(questions), flashcards: [], materials: [] }
}

function splitCSV(text: string, sep: string) {
  const out: string[][] = []
  let row: string[] = [], cell = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === sep) { row.push(cell); cell = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.some((c) => c.trim())) out.push(row)
      row = []
    } else cell += ch
  }
  row.push(cell)
  if (row.some((c) => c.trim())) out.push(row)
  return out
}

export function mergeImported(cur: Imported, add: Imported): Imported {
  const merge = <T extends { id: string }>(a: T[], b: T[]) => {
    const ids = new Set(b.map((x) => x.id))
    return [...a.filter((x) => !ids.has(x.id)), ...b]
  }
  return {
    questions: merge(cur.questions, add.questions),
    flashcards: merge(cur.flashcards, add.flashcards),
    materials: merge(cur.materials, add.materials),
  }
}

export const CSV_TEMPLATE = `disciplina;tema;periodo;dificuldade;enunciado;a;b;c;d;e;correta;comentario;referencia;fonte
Cardiologia;HAS;7;media;"Qual classe de anti-hipertensivo é preferida em paciente com DM e albuminúria?";Tiazídico;IECA ou BRA;Betabloqueador;Bloqueador de canal de cálcio;Alfabloqueador;B;"IECA/BRA reduzem a progressão da nefropatia diabética.";Diretriz Brasileira de HAS 2020;Prova X 2024
`

export const JSON_TEMPLATE = JSON.stringify({
  questions: [{
    disciplina: 'Cardiologia', tema: 'HAS', periodo: 7, dificuldade: 'media',
    enunciado: 'Enunciado da questão', alternativas: ['A', 'B', 'C', 'D', 'E'], correta: 1,
    comentario: 'Explicação', referencia: 'Opcional', fonte: 'Opcional',
  }],
  flashcards: [{ disciplina: 'Farmacologia', tema: 'Antídotos', frente: 'Pergunta', verso: 'Resposta' }],
  materials: [{ titulo: 'Título', disciplina: 'Pediatria', periodo: 10, tipo: 'resumo', conteudo: '# Título\n- item' }],
}, null, 2)
