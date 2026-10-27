import { useEffect, type ReactNode } from 'react'
import { Flag, X } from 'lucide-react'

// Janela de confirmação clara, com etiqueta amarela (anular questão, reiniciar prova…)
export function Aviso({ titulo, children, acao, onConfirmar, onFechar, tag = 'Atenção' }: {
  titulo: string; children?: ReactNode; acao: string; onConfirmar: () => void; onFechar: () => void; tag?: string
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onFechar])
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onFechar} role="dialog" aria-modal aria-label={titulo}>
      <div className="relative w-full max-w-md rounded-[1.75rem] border-[3px] border-black bg-white p-6 text-black shadow-[0_8px_0_#000]" onClick={(e) => e.stopPropagation()}>
        <button onClick={onFechar} aria-label="Fechar" className="absolute top-5 right-5 grid size-10 place-items-center rounded-full border-[3px] border-black"><X className="size-5" /></button>
        <span className="inline-flex items-center gap-2 rounded-full border-[3px] border-black bg-yellow-400 px-4 py-1.5 text-xs font-extrabold tracking-[0.2em] uppercase shadow-[2px_2px_0_#000]">
          <Flag className="size-4" /> {tag}
        </span>
        <h2 className="mt-4 mb-4 text-2xl font-extrabold">{titulo}</h2>
        {children}
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onFechar} className="rounded-xl border-[3px] border-black px-5 py-2.5 font-bold shadow-[0_4px_0_#000]">Cancelar</button>
          <button onClick={onConfirmar} className="rounded-xl border-[3px] border-black bg-red-500 px-5 py-2.5 font-bold text-white shadow-[0_4px_0_#000] transition hover:brightness-110">{acao}</button>
        </div>
      </div>
    </div>
  )
}
