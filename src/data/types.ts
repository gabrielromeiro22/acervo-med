export type Dificuldade = 'facil' | 'media' | 'dificil'

export interface Question {
  id: string
  disciplina: string
  tema: string
  periodo: number
  dificuldade: Dificuldade
  enunciado: string
  alternativas: string[]
  correta: number
  comentario: string
  referencia?: string
  fonte?: string
}

export interface Flashcard {
  id: string
  disciplina: string
  tema: string
  frente: string
  verso: string
  deck?: string
}

export interface Material {
  id: string
  titulo: string
  disciplina: string
  periodo: number
  tipo: 'resumo' | 'checklist' | 'mapa'
  conteudo: string
}
