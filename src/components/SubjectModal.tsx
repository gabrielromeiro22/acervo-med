import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, BookOpen, ClipboardList, Printer, X } from 'lucide-react'
import { useMaterials, useQuestions } from '../lib/store'

export function SubjectModal({ disciplina, periodo, onClose }: { disciplina: string; periodo?: number; onClose: () => void }) {
  const nQ = useQuestions().filter((q) => q.disciplina === disciplina).length
  const nM = useMaterials().filter((m) => m.disciplina === disciplina).length
  const enc = encodeURIComponent(disciplina)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const ACTIONS = [
    { to: `/imprimir/${enc}`, t: 'Gerar PDF', d: `${nQ} questões com gabarito`, icon: Printer, bg: 'from-[#3a66e8] to-[#2747c4]', text: 'text-white', ok: nQ > 0 },
    { to: `/app/materiais?disciplina=${enc}`, t: 'Materiais de estudo', d: `${nM} material(is)`, icon: BookOpen, bg: 'from-[#f7d95c] to-[#e9b934]', text: 'text-bg', ok: nM > 0 },
    { to: `/app/questoes?disciplina=${enc}${periodo ? `&periodo=${periodo}` : ''}`, t: 'Fazer questões', d: `${nQ} no banco`, icon: ClipboardList, bg: 'from-[#dd4436] to-[#a92a20]', text: 'text-white', ok: nQ > 0 },
  ]

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-md" onClick={onClose} role="dialog" aria-modal aria-label={disciplina}>
      <div className="relative w-full max-w-4xl rounded-[2rem] border-4 border-ink bg-panel p-6 sm:p-8" onClick={(e) => e.stopPropagation()}>
        <div className="mb-6 flex justify-center">
          <span className="rounded-full bg-ink px-5 py-2 font-display text-xl font-bold text-bg">{disciplina}</span>
        </div>
        <button className="absolute top-6 right-6 grid size-9 place-items-center rounded-full bg-ink text-bg hover:bg-accent" onClick={onClose} aria-label="Fechar">
          <X className="size-5" />
        </button>
        <div className="grid gap-4 sm:grid-cols-3">
          {ACTIONS.map(({ to, t, d, icon: I, bg, text, ok }) => ok ? (
            <Link key={t} to={to} onClick={onClose}
              className={`group relative flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-2xl bg-gradient-to-b ${bg} ${text} p-5 text-center shadow-[0_10px_30px_-12px_rgba(0,0,0,0.8)] transition hover:-translate-y-1`}>
              <ArrowUpRight className="absolute top-3 right-3 size-5 opacity-80 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              <span className="grid size-16 place-items-center rounded-2xl bg-white/20 shadow-inner"><I className="size-8" /></span>
              <span className="font-display text-xl font-bold leading-tight">{t}</span>
              <span className="text-xs opacity-80">{d}</span>
            </Link>
          ) : (
            <div key={t} className="flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-2xl bg-white/5 p-5 text-center text-mute">
              <span className="grid size-16 place-items-center rounded-2xl bg-white/5"><I className="size-8" /></span>
              <span className="font-display text-xl font-bold leading-tight">{t}</span>
              <span className="text-xs">Indisponível</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
