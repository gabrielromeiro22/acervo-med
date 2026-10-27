import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Check, Copy, FileText, MessageSquareText, NotebookPen, Star, X } from 'lucide-react'
import type { Question } from '../data/types'
import { DIF_LABEL, LETTERS, periodoLabel } from '../lib/format'
import { toggleFavorite, useStore } from '../lib/store'
import { RichText } from './RichText'
import { textoParaIA } from '../lib/format'

export function QuestionCard({ q, chosen, reveal, onChoose, index, badge, riscadas = [], onRiscar, aviso }: {
  q: Question
  chosen?: number
  reveal: boolean
  onChoose?: (i: number) => void
  index?: string
  badge?: ReactNode
  riscadas?: number[] // alternativas riscadas pelo aluno
  onRiscar?: (i: number) => void
  aviso?: ReactNode // retorno logo acima da resposta comentada (modo prova)
}) {
  const fav = useStore((s) => s.favorites.includes(q.id))
  const copiar = () => navigator.clipboard?.writeText(textoParaIA(q, reveal)).then(() => toast.success('Questão copiada'), () => toast.error('Não foi possível copiar'))

  return (
    <article className="card p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {index && <span className="chip border-accent/40 font-semibold text-accent">{index}</span>}
        <span className="chip">{q.disciplina}</span>
        {q.materia && <span className="chip border-accent/30 text-ink">{q.materia}</span>}
        <span className="chip">{q.tema}</span>
        {q.periodo > 0 && <span className="chip">{periodoLabel(q.periodo)}</span>}
        <span className="chip">{DIF_LABEL[q.dificuldade]}</span>
        {q.prova ? <span className="chip" title={q.fonte}>{q.prova}{q.numero ? ` · Q${q.numero}` : ''}</span> : q.fonte && <span className="chip">{q.fonte}</span>}
        <span className="ml-auto" />
        {badge}
        <button className="rounded-full p-1.5 text-mute transition hover:bg-white/5 hover:text-ink" onClick={copiar} aria-label="Copiar questão para uma IA" title="Copiar para uma IA">
          <Copy className="size-4" />
        </button>
        <button
          className=" rounded-full p-1.5 text-mute transition hover:bg-white/5 hover:text-warn"
          onClick={() => toggleFavorite(q.id)}
          aria-label={fav ? 'Remover dos favoritos' : 'Favoritar'}
        >
          <Star className={`size-4 ${fav ? 'fill-warn text-warn' : ''}`} />
        </button>
      </div>

      <p className="leading-relaxed"><RichText text={q.enunciado} /></p>
      {q.arquivo && (
        <a href={`https://drive.google.com/file/d/${q.arquivo}/view`} target="_blank" rel="noopener"
          className={`mt-3 inline-flex items-center gap-1.5 text-xs font-semibold hover:underline ${q.imagem ? 'text-warn' : 'text-mute'}`}>
          <FileText className="size-3.5" /> {q.imagem ? 'Esta questão tem imagem: ver no PDF original' : 'Ver PDF original'}
        </a>
      )}

      <ol className="mt-5 space-y-2">
        {q.alternativas.map((alt, i) => {
          const right = reveal && i === q.correta
          const wrong = reveal && i === chosen && i !== q.correta
          const picked = !reveal && i === chosen
          const riscada = !reveal && riscadas.includes(i)
          return (
            <li key={i} className="flex items-start gap-2">
              <button
                disabled={!onChoose || riscada}
                onClick={() => onChoose?.(i)}
                className={`flex min-w-0 flex-1 items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition disabled:cursor-default ${
                  right ? 'border-accent bg-accent/10'
                    : wrong ? 'border-danger bg-danger/10'
                      : picked ? 'border-accent/60 bg-white/5'
                        : 'border-line enabled:hover:bg-white/5'
                }`}
              >
                <span className={`grid size-6 shrink-0 place-items-center rounded-full border text-xs font-bold ${
                  right ? 'border-accent bg-accent text-bg' : wrong ? 'border-danger bg-danger text-bg' : picked ? 'border-accent text-accent' : 'border-line text-mute'
                }`}>
                  {right ? <Check className="size-3.5" /> : wrong ? <X className="size-3.5" /> : LETTERS[i]}
                </span>
                <span className="pt-0.5">
                  {reveal && (i === chosen || right) && (
                    <span className="mb-1 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                      {i === chosen && <span className={right ? 'text-accent' : 'text-danger'}>Sua resposta</span>}
                      {right && <span className="rounded-full bg-accent px-1.5 text-bg">Gabarito</span>}
                    </span>
                  )}
                  <RichText text={alt} className={riscada ? 'line-through opacity-40' : ''} />
                </span>
              </button>
              {onRiscar && (
                <button onClick={() => onRiscar(i)} aria-label={riscada ? 'Desfazer risco' : 'Riscar alternativa'} title={riscada ? 'Desfazer risco' : 'Riscar alternativa'}
                  className={`mt-1.5 grid size-7 shrink-0 place-items-center rounded-full transition ${riscada ? 'bg-white/15 text-ink' : 'bg-white/5 text-mute hover:text-ink'}`}>
                  <X className="size-3.5" />
                </button>
              )}
            </li>
          )
        })}
      </ol>

      {aviso}
      {reveal && (
        <div className="mt-5 rounded-xl border border-line bg-panel-2 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><MessageSquareText className="size-4 text-accent" /> Resposta comentada · gabarito {LETTERS[q.correta]}</p>
          <p className="text-sm leading-relaxed text-mute"><RichText text={q.comentario} /></p>
          {q.referencia && (
            <p className="mt-3 border-t border-line pt-3 text-xs text-mute/80">
              <span className="label mb-0.5">Referência</span>{q.referencia}
            </p>
          )}
          <Link to={`/app/notas?qid=${q.id}`} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline">
            <NotebookPen className="size-3.5" /> Anotar sobre esta questão
          </Link>
        </div>
      )}
    </article>
  )
}
