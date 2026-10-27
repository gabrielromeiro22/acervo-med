import type { Question } from '../data/types'

// ordem do currículo: módulos por período, depois internato e provas externas
export const DISC_ORDER = [
  'SOI', 'HAM', 'IESC', 'MCM', 'CC', 'CI', 'Integradora', 'Provas', 'Não', 'Internato', 'TPI', 'ENAMED', // pela 1ª palavra
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

// "SOI 4" ordena pelo módulo ("SOI") e depois pelo número
export function sortDisc(a: string, b: string) {
  const rank = (d: string) => { const i = DISC_ORDER.indexOf(d.split(' ')[0]); return i < 0 ? 99 : i }
  return rank(a) - rank(b) || a.localeCompare(b, 'pt', { numeric: true })
}

// período 0 = provas externas (TPI/ENAMED); 9 = internato
export const periodoLabel = (p: number) => (p === 0 ? 'TPI / ENAMED' : p > 8 ? 'Internato' : `${p}º período`)

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
// A chave pode vir do agrupamento por disciplina (módulo) ou por matéria ("Cardiologia › Insuficiência cardíaca").
export const matchesAssuntos = (q: Question, keys: string[]) =>
  !keys.length || keys.includes(q.disciplina) || keys.includes(q.disciplina + SEP + q.tema) ||
  (!!q.materia && (keys.includes(q.materia) || keys.includes(q.materia + SEP + q.tema)))

// Áreas do internato no acervo (pasta → nome exibido como "Internato · …")
export const INTERNATO: Record<string, string> = {
  APS: 'Atenção Primária', CC: 'Clínica Cirúrgica', CM: 'Clínica Médica', GO: 'Ginecologia e Obstetrícia', PED: 'Pediatria', UESM: 'Urgência, Emergência e Saúde Mental',
}
// "SOI 4" → { modulo: 'SOI' }; "Internato · Clínica Médica" → { modulo: 'CM' }; "TPI" → {} (a área toda)
export function moduloDe(disciplina: string): { modulo?: string } {
  if (disciplina === 'TPI' || disciplina === 'ENAMED') return {}
  const interno = Object.keys(INTERNATO).find((k) => disciplina === `Internato · ${INTERNATO[k]}`)
  return { modulo: interno ?? disciplina.split(' ')[0] }
}

// texto sem as figuras [[IMG:…]] do Meu Acervo (para copiar ou resumir)
export const semFiguras = (t: string) => t.replace(/\[\[IMG:[\w.-]+\]\]/g, '[imagem no PDF original]')

// Texto da questão para colar num assistente de IA (com gabarito só quando já foi revelado)
export function textoParaIA(q: Question, reveal: boolean) {
  let t = `Questão de prova de Medicina (${[q.disciplina, q.prova].filter(Boolean).join(' · ')}).\n\n${semFiguras(q.enunciado)}\n\n`
  t += q.alternativas.map((a, i) => `${LETTERS[i]}) ${semFiguras(a)}`).join('\n')
  if (reveal) t += `\n\nGabarito oficial: ${LETTERS[q.correta]}\n\nComentário oficial:\n${semFiguras(q.comentario)}`
  return t + '\n\nExplique a questão, o raciocínio clínico e por que cada alternativa está certa ou errada.'
}
