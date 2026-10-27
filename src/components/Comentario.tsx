import { Copy, TriangleAlert } from 'lucide-react'
import type { Question } from '../data/types'
import { LETTERS } from '../lib/format'
import { RichText } from './RichText'

// "A) …", "(B) …", "c. …" no início do parágrafo: comentário sobre uma alternativa
const LETRA = /^\s*\(?([A-Ea-e])\s*[).:-]\s+/
const TAG = /(\(?\b(?:IN)?CORRETA\b\)?\.?)/gi

function Paragrafo({ texto, certa }: { texto: string; certa: string }) {
  const m = texto.match(LETRA)
  const partes = texto.split(TAG)
  const corpo = partes.map((p, i) => i % 2 === 1
    ? <b key={i} className={/^\(?IN/i.test(p) ? 'text-red-700' : 'text-green-700'}>{p.toUpperCase()}</b>
    : <RichText key={i} text={p} claro />)
  if (!m) return <p className="leading-relaxed">{corpo}</p>
  const ok = m[1].toUpperCase() === certa
  return <p className={`rounded-xl border-l-4 px-3 py-2 leading-relaxed ${ok ? 'border-green-600 bg-green-200/70' : 'border-red-500 bg-red-200/60'}`}>{corpo}</p>
}

// Resposta comentada clara (verde se acertou, rosa se errou), com cada alternativa comentada em destaque
export function Comentario({ q, acertou, onCopiar, onReportar }: { q: Question; acertou?: boolean; onCopiar: () => void; onReportar: () => void }) {
  const certa = LETTERS[q.correta]
  const pars = (q.comentario || 'Sem comentário no material original.').split(/\n+/).map((t) => t.trim()).filter(Boolean)
  const ref = pars.findIndex((t) => /^refer[êe]ncias?\s*:?\s*$/i.test(t))
  const corpo = ref < 0 ? pars : pars.slice(0, ref), refs = ref < 0 ? [] : pars.slice(ref + 1)
  return (
    <div className={`mt-5 rounded-2xl p-5 text-[15px] text-zinc-900 ${acertou === false ? 'bg-rose-50' : 'bg-green-50'}`}>
      <p className="mb-3 text-xs font-extrabold tracking-[0.14em] text-zinc-500 uppercase">{q.aberta ? 'Comentário' : `Resposta comentada · gabarito ${certa}`}</p>
      <div className="space-y-3">{corpo.map((t, i) => <Paragrafo key={i} texto={t} certa={certa} />)}</div>
      {(refs.length > 0 || q.referencia) && (
        <div className="mt-4 border-t border-black/10 pt-3 text-xs text-zinc-500">
          <p className="mb-1 font-semibold">Referência:</p>
          {[...refs, ...(q.referencia ? [q.referencia] : [])].map((r, i) => <p key={i} className="mb-1">{r}</p>)}
        </div>
      )}
      <div className="mt-4 flex items-center justify-center gap-3">
        <button onClick={onReportar} aria-label="Reportar problema" title="Reportar problema" className="grid size-10 place-items-center rounded-full border-2 border-black"><TriangleAlert className="size-4" /></button>
        <button onClick={onCopiar} className="inline-flex items-center gap-2 rounded-lg border-2 border-black bg-white px-4 py-2 text-xs font-extrabold tracking-wider uppercase shadow-[3px_3px_0_#000]">
          <Copy className="size-4" /> Copiar questão para uma IA
        </button>
      </div>
    </div>
  )
}
