import type { Question } from '../data/types'

export const DISC_ORDER = [
  'Anatomia', 'Fisiologia', 'Farmacologia', 'Medicina Preventiva', 'Cardiologia', 'Pneumologia',
  'Gastroenterologia', 'Nefrologia', 'Endocrinologia', 'Hematologia', 'Infectologia', 'Neurologia',
  'Psiquiatria', 'Cirurgia', 'Pediatria', 'Ginecologia e Obstetrícia',
]

export const LETTERS = 'ABCDEFGH'

export const DIF_LABEL = { facil: 'Fácil', media: 'Média', dificil: 'Difícil' } as const

export function pct(n: number, d: number) {
  return d ? Math.round((n / d) * 100) : 0
}

export function fmtTime(sec: number) {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  return (h ? `${h}:` : '') + `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

export function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function uniq<T>(xs: T[]) {
  return [...new Set(xs)]
}

export function sortDisc(a: string, b: string) {
  const ia = DISC_ORDER.indexOf(a), ib = DISC_ORDER.indexOf(b)
  return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b)
}

export function shuffle<T>(xs: T[]) {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function normalize(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

// Uma chave é a disciplina inteira ("Cardiologia") ou um tema dela ("Cardiologia › IC").
export const SEP = ' › '
export const matchesAssuntos = (q: Question, keys: string[]) =>
  !keys.length || keys.includes(q.disciplina) || keys.includes(q.disciplina + SEP + q.tema)
