import { useState } from 'react'
import { ChevronRight, FolderOpen, Plus, X } from 'lucide-react'
import type { Question } from '../data/types'
import { SEP, matchesAssuntos, sortDisc, uniq } from '../lib/format'

export function AssuntoPicker({ questions, value, onChange }: { questions: Question[]; value: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState<string>()
  const disciplinas = uniq(questions.map((q) => q.disciplina)).sort(sortDisc)
  const count = (key: string) => questions.filter((q) => matchesAssuntos(q, [key])).length
  const max = Math.max(1, ...disciplinas.map(count))

  const add = (key: string) => {
    if (value.includes(key)) return
    const disc = key.split(SEP)[0]
    // Escolher a disciplina inteira substitui temas soltos dela; escolher um tema remove a disciplina inteira.
    const next = key === disc ? value.filter((k) => !k.startsWith(disc + SEP)) : value.filter((k) => k !== disc)
    onChange([...next, key])
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-2xl border border-line bg-panel-2 p-2">
        <p className="flex items-center justify-between px-2 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-mute">
          Assuntos <span className="tabular-nums">{disciplinas.length} áreas · {questions.length} questões</span>
        </p>
        <ul className="max-h-80 space-y-1 overflow-y-auto pr-1">
          {disciplinas.map((d) => {
            const temas = uniq(questions.filter((q) => q.disciplina === d).map((q) => q.tema)).sort()
            const n = count(d)
            return (
              <li key={d}>
                <div className="flex items-stretch overflow-hidden rounded-xl border border-line bg-panel">
                  <button className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-sm" onClick={() => setOpen(open === d ? undefined : d)}>
                    <ChevronRight className={`size-4 shrink-0 text-mute transition ${open === d ? 'rotate-90' : ''}`} />
                    <span className="truncate font-semibold">{d}</span>
                  </button>
                  <span className="grid w-12 place-items-center text-xs font-bold tabular-nums text-bg" style={{ background: `color-mix(in oklab, var(--color-danger) ${25 + (n / max) * 75}%, var(--color-panel-2))` }}>
                    {n}q
                  </span>
                  <button className={`w-16 text-[11px] font-bold uppercase transition ${value.includes(d) ? 'bg-accent text-bg' : 'text-mute hover:bg-white/5 hover:text-ink'}`} onClick={() => add(d)}>
                    Todos
                  </button>
                </div>
                {open === d && (
                  <ul className="mt-1 ml-6 space-y-1">
                    {temas.map((t) => {
                      const key = d + SEP + t
                      const on = value.includes(key) || value.includes(d)
                      return (
                        <li key={t}>
                          <button disabled={on} onClick={() => add(key)}
                            className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-left text-sm text-mute transition enabled:hover:bg-white/5 enabled:hover:text-ink disabled:text-accent">
                            <span className="truncate">{t}</span>
                            <span className="flex items-center gap-2 text-xs tabular-nums">{count(key)}q <Plus className="size-3.5" /></span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      <div className="flex flex-col rounded-2xl border border-dashed border-line p-3">
        <p className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.14em] text-mute">
          Minha prova <span className="tabular-nums">{value.length} assunto(s) · {questions.filter((q) => value.length && matchesAssuntos(q, value)).length} questões</span>
        </p>
        {!value.length ? (
          <p className="m-auto flex flex-col items-center gap-2 py-8 text-center text-sm text-mute">
            <FolderOpen className="size-6" /> Nenhum assunto escolhido: a prova usa o banco todo.
          </p>
        ) : (
          <>
            <ul className="flex flex-wrap gap-2">
              {value.map((k) => (
                <li key={k} className="chip border-accent/40 py-1 text-ink">
                  {k} <span className="text-mute tabular-nums">{count(k)}</span>
                  <button onClick={() => onChange(value.filter((x) => x !== k))} aria-label={`Remover ${k}`} className="text-mute hover:text-danger"><X className="size-3.5" /></button>
                </li>
              ))}
            </ul>
            <button className="mt-auto self-end pt-3 text-xs text-mute hover:text-ink" onClick={() => onChange([])}>Limpar</button>
          </>
        )}
      </div>
    </div>
  )
}
