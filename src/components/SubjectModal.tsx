import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, BookOpen, ClipboardList, Printer, X } from 'lucide-react'
import { moduloDe } from '../lib/format'
import { useArquivos, useQuestions } from '../lib/store'
import { Icon3D } from './Icon3D'

export function SubjectModal({ disciplina, periodo, onClose }: { disciplina: string; periodo?: number; onClose: () => void }) {
  const nQ = useQuestions().filter((q) => q.disciplina === disciplina && (periodo === undefined || q.periodo === periodo)).length
  // PDFs do acervo deste módulo: "SOI 4" → arquivos do 4º período com módulo SOI (inclui os resumos)
  const { modulo } = moduloDe(disciplina)
  const area = periodo === undefined ? '' : periodo === 0 ? disciplina.toLowerCase() : periodo > 8 ? 'internato' : `p${periodo}`
  const nM = useArquivos().filter((a) => (area.startsWith('p') ? a.area === 'periodo' && a.periodo === periodo : !area || a.area === area) &&
    (!modulo || a.modulo === modulo || a.path.includes(`/${modulo}/`))).length
  const enc = encodeURIComponent(disciplina)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const ACTIONS = [
    { to: `/imprimir/${enc}${periodo !== undefined ? `?periodo=${periodo}` : ''}`, t: 'Gerar PDF', d: `${nQ} questões com gabarito`, icon: Printer, img: 'printer', bg: 'from-[#3a66e8] to-[#2747c4]', text: 'text-white', ok: nQ > 0 },
    { to: `/app/acervo?${area ? `area=${area}&` : ''}${modulo ? `q=${encodeURIComponent(modulo)}` : ''}`, t: 'Provas e resumos', d: `${nM} PDF(s) no acervo`, icon: BookOpen, img: 'file_folder', bg: 'from-[#f7d95c] to-[#e9b934]', text: 'text-bg', ok: nM > 0 },
    { to: `/app/questoes?disciplina=${enc}${periodo ? `&periodo=${periodo}` : ''}`, t: 'Fazer questões', d: `${nQ} no banco`, icon: ClipboardList, img: 'laptop', bg: 'from-[#dd4436] to-[#a92a20]', text: 'text-white', ok: nQ > 0 },
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
          {ACTIONS.map(({ to, t, d, icon: I, img, bg, text, ok }) => ok ? (
            <Link key={t} to={to} onClick={onClose}
              className={`group relative flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-2xl bg-gradient-to-b ${bg} ${text} p-5 text-center shadow-[0_10px_30px_-12px_rgba(0,0,0,0.8)] transition hover:-translate-y-1`}>
              <ArrowUpRight className="absolute top-3 right-3 size-5 opacity-80 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              <Icon3D name={img} className="size-24 drop-shadow-[0_10px_14px_rgba(0,0,0,0.45)] sm:size-28" />
              <span className="font-display text-xl font-bold leading-tight [text-shadow:0_2px_6px_rgb(0_0_0/0.25)]">{t}</span>
              <span className="text-xs opacity-80">{d}</span>
            </Link>
          ) : (
            <div key={t} className="flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-2xl bg-white/5 p-5 text-center text-mute">
              <span className="relative"><Icon3D name={img} still className="size-24 opacity-30 grayscale sm:size-28" /><I className="absolute right-0 bottom-0 size-5" /></span>
              <span className="font-display text-xl font-bold leading-tight">{t}</span>
              <span className="text-xs">Indisponível</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
