import { useSyncExternalStore } from 'react'
import type { Flashcard, Material, Question } from '../data/types'
import { QUESTIONS } from '../data/questions'
import { FLASHCARDS } from '../data/flashcards'
import { MATERIALS } from '../data/materials'

export interface Attempt { chosen: number; correct: boolean; at: number; ms: number }
export interface Simulado {
  id: string
  nome: string
  createdAt: number
  questionIds: string[]
  answers: Record<string, number>
  durationSec: number
  elapsedSec: number
  finishedAt?: number
}
export interface CardState { ease: number; interval: number; due: number; reps: number }
export interface Note { id: string; title: string; body: string; qid?: string; updatedAt: number }
export interface AgendaItem { id: string; date: string; start?: string; end?: string; title: string; done: boolean }
export interface GradeItem { id: string; codigo: string; titulo: string; notas: string; data?: string; presenca?: 'presente' | 'falta' }
export interface Deck { id: string; nome: string; createdAt: number; cards: { id: string; frente: string; verso: string }[] }
export interface GradeModulo { id: string; nome: string; periodo: number; itens: GradeItem[] }

export interface State {
  attempts: Record<string, Attempt[]>
  simulados: Simulado[]
  srs: Record<string, CardState>
  notes: Note[]
  favorites: string[]
  agenda: AgendaItem[]
  grade: GradeModulo[]
  decks: Deck[]
  periodo?: number
  driveUrl?: string
  imported: { questions: Question[]; flashcards: Flashcard[]; materials: Material[] }
}

const KEY = 'acervo:v1'
const empty: State = {
  attempts: {}, simulados: [], srs: {}, notes: [], favorites: [], agenda: [], grade: [], decks: [],
  imported: { questions: [], flashcards: [], materials: [] },
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...empty, ...JSON.parse(raw) }
  } catch { /* storage indisponível */ }
  return empty
}

let state = load()
const listeners = new Set<() => void>()

export function setState(fn: (s: State) => State) {
  state = fn(state)
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* cota cheia */ }
  listeners.forEach((l) => l())
}

export function getState() { return state }

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l) },
    () => sel(state),
  )
}

// Acervo real (gerado por scripts/acervo): carregado em segundo plano a partir de /acervo/*.json.
let acervo: { questions: Question[]; flashcards: Flashcard[] } = { questions: [], flashcards: [] }
export async function loadAcervo() {
  const get = (f: string) => fetch(`${import.meta.env.BASE_URL}acervo/${f}`).then((r) => (r.ok ? r.json() : []), () => [])
  const [questions, flashcards] = await Promise.all([get('questoes.json'), get('flashcards.json')])
  acervo = { questions, flashcards }
  cache = {}
  listeners.forEach((l) => l())
}

// Os seletores abaixo devolvem arrays novos; memorize pela referência do estado.
let cache: { s?: State; q?: Question[]; f?: Flashcard[]; m?: Material[] } = {}
function catalog(s: State) {
  if (cache.s !== s) {
    cache = {
      s,
      q: [...QUESTIONS, ...acervo.questions, ...s.imported.questions],
      f: [
        ...FLASHCARDS, ...acervo.flashcards, ...s.imported.flashcards,
        ...s.decks.flatMap((d) => d.cards.map((c) => ({ ...c, disciplina: d.nome, tema: 'Meu baralho', deck: d.id }))),
      ],
      m: [...MATERIALS, ...s.imported.materials],
    }
  }
  return cache as Required<typeof cache>
}
export const useQuestions = () => useStore((s) => catalog(s).q)
export const useFlashcards = () => useStore((s) => catalog(s).f)
export const useMaterials = () => useStore((s) => catalog(s).m)
export const allQuestions = () => catalog(state).q

export const uid = () => Math.random().toString(36).slice(2, 10)

export function recordAttempt(q: Question, chosen: number, ms: number) {
  const a: Attempt = { chosen, correct: chosen === q.correta, at: Date.now(), ms }
  setState((s) => ({ ...s, attempts: { ...s.attempts, [q.id]: [...(s.attempts[q.id] ?? []), a] } }))
  return a
}

export function createSimulado(nome: string, questionIds: string[], durationSec: number) {
  const sim: Simulado = { id: uid(), nome, createdAt: Date.now(), questionIds, answers: {}, durationSec, elapsedSec: 0 }
  setState((s) => ({ ...s, simulados: [sim, ...s.simulados] }))
  return sim.id
}

// Nova prova a partir de outra (todas as questões ou só as erradas), com tempo proporcional.
export function redoSimulado(s: Simulado, ids: string[], suffix: string) {
  const dur = s.durationSec && Math.round((s.durationSec * ids.length) / s.questionIds.length)
  return createSimulado(`${s.nome} · ${suffix}`, ids, dur)
}

export function toggleFavorite(id: string) {
  setState((s) => ({
    ...s,
    favorites: s.favorites.includes(id) ? s.favorites.filter((f) => f !== id) : [...s.favorites, id],
  }))
}

// SM-2 simplificado. grade: 0 = errei, 1 = difícil, 2 = bom, 3 = fácil
export function reviewCard(id: string, grade: 0 | 1 | 2 | 3) {
  setState((s) => {
    const cur = s.srs[id] ?? { ease: 2.5, interval: 0, due: 0, reps: 0 }
    let { ease, interval, reps } = cur
    if (grade === 0) { reps = 0; interval = 0 } else {
      reps += 1
      interval = reps === 1 ? 1 : reps === 2 ? 3 : Math.round(interval * ease * (grade === 1 ? 0.7 : grade === 3 ? 1.3 : 1))
      ease = Math.max(1.3, ease + (grade === 1 ? -0.15 : grade === 3 ? 0.15 : 0))
    }
    const due = grade === 0 ? Date.now() + 60_000 : Date.now() + interval * 86_400_000
    return { ...s, srs: { ...s.srs, [id]: { ease, interval, reps, due } } }
  })
}

export function exportBackup() {
  return JSON.stringify(state, null, 2)
}

export function resetProgress() {
  setState((s) => ({ ...empty, imported: s.imported }))
}
