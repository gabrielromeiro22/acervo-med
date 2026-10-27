import { useState } from 'react'
import { CalendarClock, Check, ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react'
import { setState, uid, useStore } from '../lib/store'

const WEEK = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const pad = (n: number) => String(n).padStart(2, '0')
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export function Agenda() {
  const agenda = useStore((s) => s.agenda)
  const now = new Date()
  const today = iso(now)
  const [month, setMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1))
  const [draft, setDraft] = useState<{ date: string; start: string; end: string; title: string } | null>(null)

  const y = month.getFullYear(), m = month.getMonth()
  const prefix = `${y}-${pad(m + 1)}`
  const days = new Date(y, m + 1, 0).getDate()
  const cells = [...Array(month.getDay()).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  const items = agenda.filter((a) => a.date.startsWith(prefix)).sort((a, b) => (a.date + (a.start ?? '')).localeCompare(b.date + (b.start ?? '')))
  const marked = new Set(items.map((a) => a.date))

  const shift = (k: number) => setMonth(new Date(y, m + k, 1))
  const openDraft = (date: string) => setDraft({ date, start: '', end: '', title: '' })
  const save = () => {
    if (!draft?.title.trim()) return
    const item = { id: uid(), date: draft.date, title: draft.title.trim(), done: false, ...(draft.start && { start: draft.start }), ...(draft.end && { end: draft.end }) }
    setState((s) => ({ ...s, agenda: [...s.agenda, item] }))
    setDraft(null)
  }
  const patch = (id: string, done: boolean) => setState((s) => ({ ...s, agenda: s.agenda.map((a) => (a.id === id ? { ...a, done } : a)) }))
  const remove = (id: string) => setState((s) => ({ ...s, agenda: s.agenda.filter((a) => a.id !== id) }))

  return (
    <div className="grid gap-5 md:grid-cols-[17rem_1fr]">
      <div className="overflow-hidden rounded-2xl border-4 border-ink bg-ink text-bg">
        <div className="flex items-center justify-between px-3 py-2.5">
          <button className="rounded-full border-2 border-bg p-0.5 hover:bg-bg hover:text-ink" onClick={() => shift(-1)} aria-label="Mês anterior"><ChevronLeft className="size-4" /></button>
          <span className="text-xs font-bold uppercase tracking-[0.14em]">{month.toLocaleDateString('pt-BR', { month: 'long', year: y === now.getFullYear() ? undefined : 'numeric' })}</span>
          <button className="rounded-full border-2 border-bg p-0.5 hover:bg-bg hover:text-ink" onClick={() => shift(1)} aria-label="Próximo mês"><ChevronRight className="size-4" /></button>
        </div>
        <div className="grid grid-cols-7 gap-y-1 bg-black px-2 py-3 text-center text-xs text-ink">
          {WEEK.map((d, i) => <span key={i} className="pb-1 text-[10px] font-semibold text-mute">{d}</span>)}
          {cells.map((d, i) => {
            if (!d) return <span key={i} />
            const date = `${prefix}-${pad(d)}`
            return (
              <button key={i} onClick={() => openDraft(date)} title="Adicionar evento"
                className={`mx-auto grid size-7 place-items-center rounded-full tabular-nums transition hover:bg-white/10 ${
                  date === today ? 'bg-fuchsia-600 font-bold text-white hover:bg-fuchsia-600' : marked.has(date) ? 'ring-2 ring-fuchsia-500' : ''
                }`}>
                {d}
              </button>
            )
          })}
        </div>
        <p className="flex items-center justify-center gap-1.5 py-2 text-xs font-semibold">
          <CalendarClock className="size-3.5" />
          {now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}, {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      <div className="min-w-0">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.14em]">
            Agenda do mês <span className="ml-1 text-mute">{items.filter((a) => a.done).length}/{items.length}</span>
          </p>
          <button className="grid size-7 place-items-center rounded-full bg-ink text-bg hover:bg-accent" onClick={() => openDraft(today.startsWith(prefix) ? today : `${prefix}-01`)} aria-label="Novo evento">
            <Plus className="size-4" />
          </button>
        </div>

        {draft && (
          <div className="mb-3 grid grid-cols-[1fr_auto_auto] gap-2 rounded-2xl border border-accent/40 bg-panel-2 p-3">
            <input className="input col-span-3" placeholder="Ex.: N2 Específica" value={draft.title} autoFocus
              onChange={(e) => setDraft({ ...draft, title: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && save()} />
            <input className="input" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
            <input className="input w-24" type="time" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} aria-label="Início" />
            <input className="input w-24" type="time" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} aria-label="Fim" />
            <div className="col-span-3 flex justify-end gap-2">
              <button className="btn-ghost px-3 py-1.5" onClick={() => setDraft(null)}><X className="size-4" /></button>
              <button className="btn-primary px-3 py-1.5" onClick={save}>Adicionar</button>
            </div>
          </div>
        )}

        {!items.length && !draft ? (
          <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-mute">Nenhuma prova ou evento neste mês. Clique num dia para adicionar.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((a) => (
              <li key={a.id} className={`group flex items-center gap-2.5 rounded-3xl border border-line bg-black py-1.5 pr-2 pl-1.5 text-sm ${a.done ? 'opacity-50' : ''}`}>
                <button onClick={() => patch(a.id, !a.done)} aria-label={a.done ? 'Desmarcar' : 'Concluir'}
                  className={`grid size-6 shrink-0 place-items-center rounded-full border ${a.done ? 'border-accent bg-accent text-bg' : 'border-mute/50 hover:border-accent'}`}>
                  {a.done && <Check className="size-3.5" />}
                </button>
                <span className="shrink-0 rounded-md bg-fuchsia-600 px-1.5 py-0.5 text-xs font-bold text-white tabular-nums">{a.date.slice(8)}/{a.date.slice(5, 7)}</span>
                {a.start && <span className="shrink-0 rounded-md bg-white/5 px-1.5 py-0.5 text-xs text-mute tabular-nums">{a.start}{a.end && `–${a.end}`}</span>}
                <span className={`min-w-0 line-clamp-2 text-xs leading-tight font-semibold uppercase ${a.done ? 'line-through' : ''}`}>{a.title}</span>
                <button className="ml-auto rounded-full p-1 text-mute opacity-0 group-hover:opacity-100 hover:text-danger" onClick={() => remove(a.id)} aria-label="Excluir">
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
