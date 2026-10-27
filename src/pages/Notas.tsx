import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Empty, PageHeader } from '../components/ui'
import { fmtDate, normalize } from '../lib/format'
import { allQuestions, getState, setState, uid, useQuestions, useStore, type Note } from '../lib/store'

const blank = (qid?: string): Note => {
  const q = qid ? allQuestions().find((x) => x.id === qid) : undefined
  return { id: uid(), title: q ? `${q.disciplina} · ${q.tema}` : '', body: '', qid, updatedAt: 0 }
}

export default function Notas() {
  const notes = useStore((s) => s.notes)
  const questions = useQuestions()
  const [params, setParams] = useSearchParams()
  const [term, setTerm] = useState('')
  const [draft, setDraft] = useState<Note | null>(() => {
    const qid = params.get('qid')
    if (!qid) return null
    return getState().notes.find((n) => n.qid === qid) ?? blank(qid)
  })

  const linked = draft?.qid ? questions.find((q) => q.id === draft.qid) : undefined
  const shown = notes
    .filter((n) => !term || normalize(`${n.title} ${n.body}`).includes(normalize(term)))
    .sort((a, b) => b.updatedAt - a.updatedAt)

  const close = () => { setDraft(null); if (params.has('qid')) setParams({}, { replace: true }) }

  const save = () => {
    if (!draft) return
    if (!draft.title.trim() && !draft.body.trim()) return close()
    const note = { ...draft, title: draft.title.trim() || 'Sem título', updatedAt: Date.now() }
    setState((s) => ({
      ...s,
      notes: s.notes.some((n) => n.id === note.id) ? s.notes.map((n) => (n.id === note.id ? note : n)) : [note, ...s.notes],
    }))
    toast.success('Nota salva')
    close()
  }

  const remove = (id: string) => {
    setState((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) }))
    if (draft?.id === id) close()
  }

  return (
    <>
      <PageHeader
        title="Minhas notas"
        sub="Anotações livres ou ligadas a uma questão."
        action={<button className="btn-primary" onClick={() => setDraft(blank())}><Plus className="size-4" /> Nova nota</button>}
      />

      {draft && (
        <section className="card mb-6 p-5">
          {linked && (
            <p className="mb-3 rounded-xl border border-line bg-panel-2 p-3 text-xs text-mute">
              <b className="text-ink">Questão:</b> {linked.enunciado.slice(0, 220)}{linked.enunciado.length > 220 ? '…' : ''}
            </p>
          )}
          <input className="input mb-3 font-semibold" placeholder="Título" value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <textarea className="input min-h-40 leading-relaxed" placeholder="Escreva aqui…" value={draft.body} autoFocus
            onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
          <div className="mt-3 flex justify-end gap-2">
            <button className="btn-ghost" onClick={close}>Cancelar</button>
            <button className="btn-primary" onClick={save}>Salvar</button>
          </div>
        </section>
      )}

      {notes.length > 0 && (
        <input className="input mb-4" placeholder="Filtrar notas…" value={term} onChange={(e) => setTerm(e.target.value)} />
      )}

      {!shown.length ? (
        <Empty>{notes.length ? 'Nenhuma nota encontrada.' : 'Nenhuma nota ainda. Use “Anotar sobre esta questão” no comentário de qualquer questão.'}</Empty>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {shown.map((n) => (
            <li key={n.id} className="card group flex flex-col p-4">
              <button className="text-left" onClick={() => setDraft(n)}>
                <p className="font-semibold group-hover:text-accent">{n.title}</p>
                <p className="mt-1 line-clamp-4 whitespace-pre-line text-sm text-mute">{n.body}</p>
              </button>
              <div className="mt-auto flex items-center justify-between pt-3 text-xs text-mute">
                <span>{fmtDate(n.updatedAt)}{n.qid ? ' · ligada a questão' : ''}</span>
                <button className="rounded-full p-1.5 hover:bg-white/5 hover:text-danger" onClick={() => remove(n.id)} aria-label="Excluir nota">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
