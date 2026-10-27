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
  materia?: string // grande área (Cardiologia, Pediatria…), classificada por scripts/acervo/classify.mjs
  prova?: string // prova de origem, ex. "N2 · 2025.1 · Rot. 2 · B"
  numero?: number // número da questão na prova original
  palavras?: string[] // palavras-chave para busca
  arquivo?: string // id do PDF de origem no Drive (questões do acervo)
  imagem?: 1 // o enunciado cita imagem/figura que não veio no texto
  aberta?: 'gabarito' | 'discursiva' // prova sem alternativas: a única "alternativa" é a resposta esperada
  roteiro?: string // assunto do roteiro oficial do período (Meu Acervo), ex. "Segurança do paciente"
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
