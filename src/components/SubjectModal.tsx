import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, X } from 'lucide-react'
import { arvore, pastaDaDisciplina, pastaDoPeriodo, pastaEm, todos } from '../lib/acervo'
import { moduloDe } from '../lib/format'
import { useArquivos, useQuestions } from '../lib/store'
import { Icon3D } from './Icon3D'

interface Tile { to: string; t: string; d: string; img: string; bg: string; text: string; ok: boolean }

// Menu da disciplina em dois passos, como no Meu Acervo:
// 1) PDFs da disciplina · materiais de estudo · fazer questões; 2) provas anteriores · por assunto · gerar PDF.
export function SubjectModal({ disciplina, periodo, onClose }: { disciplina: string; periodo?: number; onClose: () => void }) {
  const questions = useQuestions()
  const arquivos = useArquivos()
  const [passo, setPasso] = useState<1 | 2>(1)
  const qs = questions.filter((q) => q.disciplina === disciplina && (periodo === undefined || q.periodo === periodo))
  const nProvas = new Set(qs.map((q) => q.arquivo).filter(Boolean)).size

  const raiz = arvore(arquivos)
  const dir = pastaDaDisciplina(raiz, arquivos, questions, disciplina, periodo)
  const nPdf = dir ? todos(pastaEm(raiz, dir) ?? raiz).length : 0
  // resumos do período, filtrados pelo módulo ("SOI", "HAM"…)
  const per = periodo && periodo <= 8 ? pastaDoPeriodo(raiz, periodo) : undefined
  const resumos = per && [...per.filhas.values()].find((k) => /RESUMOS/.test(k.nome))
  const { modulo } = moduloDe(disciplina)
  const nRes = resumos ? todos(resumos).filter((a) => !modulo || a.modulo === modulo).length : 0
  const enc = encodeURIComponent(disciplina)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const PASSO1: (Tile & { passo?: boolean })[] = [
    { to: `/app/acervo?pasta=${encodeURIComponent(dir)}`, t: 'Provas em PDF', d: `${nPdf} arquivo(s) no Drive`, img: 'printer', bg: 'from-[#3b6cf0] to-[#2442b8]', text: 'text-white', ok: nPdf > 0 },
    { to: `/app/resumos?periodo=${periodo}&disciplina=${enc}${modulo ? `&modulo=${encodeURIComponent(modulo)}` : ''}`, t: 'Materiais de estudo', d: `${nRes} resumo(s) do período`, img: 'books', bg: 'from-[#f6d43a] to-[#e2ae14]', text: 'text-[#3a2a00]', ok: nRes > 0 },
    { to: '', t: 'Fazer questões', d: `${qs.length} no banco`, img: 'laptop', bg: 'from-[#ef3b3b] to-[#c51d2a]', text: 'text-white', ok: qs.length > 0, passo: true },
  ]
  const PASSO2: Tile[] = [
    { to: `/app/provas?disciplina=${enc}${periodo !== undefined ? `&periodo=${periodo}` : ''}`, t: 'Provas anteriores', d: `${nProvas} prova(s) por semestre`, img: 'clipboard', bg: 'from-[#ef3b3b] to-[#c51d2a]', text: 'text-white', ok: nProvas > 0 },
    { to: `/app/questoes?disciplina=${enc}${periodo ? `&periodo=${periodo}` : ''}`, t: 'Por assunto', d: `${qs.length} questões com filtros`, img: 'bullseye', bg: 'from-[#ef3b3b] to-[#c51d2a]', text: 'text-white', ok: qs.length > 0 },
    { to: `/app/montar?disciplina=${enc}${periodo !== undefined ? `&periodo=${periodo}` : ''}`, t: 'Gerar PDF', d: 'Papel, tablet ou com respostas', img: 'memo', bg: 'from-[#ef3b3b] to-[#c51d2a]', text: 'text-white', ok: qs.length > 0 },
  ]
  const cls = 'group relative flex aspect-[4/3] flex-col items-center justify-end gap-1 rounded-2xl p-4 text-center shadow-[inset_0_-6px_0_rgba(0,0,0,0.2)] transition'

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-md" onClick={onClose} role="dialog" aria-modal aria-label={disciplina}>
      <div className="relative w-full max-w-3xl rounded-[1.75rem] border-[3px] border-ink bg-[#0b0b12] p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-center">
          {passo === 2 && (
            <button className="absolute top-5 left-5 grid size-8 place-items-center rounded-full bg-ink text-bg hover:bg-accent sm:top-6 sm:left-6" onClick={() => setPasso(1)} aria-label="Voltar">
              <ArrowLeft className="size-4" />
            </button>
          )}
          <span className="rounded-full bg-ink px-4 py-1.5 font-display text-lg font-bold text-bg">{disciplina}</span>
          <button className="absolute top-5 right-5 grid size-8 place-items-center rounded-full bg-ink text-bg hover:bg-accent sm:top-6 sm:right-6" onClick={onClose} aria-label="Fechar">
            <X className="size-4" />
          </button>
        </div>
        <div className="grid gap-3.5 sm:grid-cols-3">
          {(passo === 1 ? PASSO1 : PASSO2).map((x) => {
            const corpo = (
              <>
                <span className="grid flex-1 place-items-center"><Icon3D name={x.img} still={!x.ok} className="size-20 drop-shadow-[0_8px_10px_rgba(0,0,0,0.45)] sm:size-24" /></span>
                <b className="font-display text-lg leading-tight">{x.t}</b>
                <small className="text-[11px] uppercase tracking-wider opacity-85">{x.ok ? x.d : 'Indisponível'}</small>
              </>
            )
            if (!x.ok) return <div key={x.t} className={`${cls} bg-gradient-to-b ${x.bg} ${x.text} cursor-not-allowed opacity-40`}>{corpo}</div>
            if ('passo' in x && x.passo) return <button key={x.t} onClick={() => setPasso(2)} className={`${cls} bg-gradient-to-b ${x.bg} ${x.text} hover:-translate-y-1`}>{corpo}</button>
            return (
              <Link key={x.t} to={x.to} onClick={onClose} className={`${cls} bg-gradient-to-b ${x.bg} ${x.text} hover:-translate-y-1`}>
                <ArrowUpRight className="absolute top-3 right-3 size-5 opacity-80" />{corpo}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
