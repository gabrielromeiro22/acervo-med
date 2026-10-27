import { Link, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { QuestionCard } from '../components/QuestionCard'
import { Empty, PageHeader } from '../components/ui'
import { normalize } from '../lib/format'
import { useFlashcards, useMaterials, useQuestions, useStore } from '../lib/store'

const LIMIT = 20

export default function Busca() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const questions = useQuestions()
  const cards = useFlashcards()
  const materials = useMaterials()
  const notes = useStore((s) => s.notes)

  const terms = normalize(q).split(/\s+/).filter(Boolean)
  const hit = (text: string) => { const t = normalize(text); return terms.every((w) => t.includes(w)) }

  const rq = terms.length ? questions.filter((x) => hit(`${x.disciplina} ${x.tema} ${x.enunciado} ${x.alternativas.join(' ')} ${x.comentario}`)) : []
  const rc = terms.length ? cards.filter((x) => hit(`${x.disciplina} ${x.tema} ${x.frente} ${x.verso}`)) : []
  const rm = terms.length ? materials.filter((x) => hit(`${x.disciplina} ${x.titulo} ${x.conteudo}`)) : []
  const rn = terms.length ? notes.filter((x) => hit(`${x.title} ${x.body}`)) : []
  const total = rq.length + rc.length + rm.length + rn.length

  return (
    <>
      <PageHeader title="Busca" sub="Questões, flashcards, materiais e notas." />
      <label className="relative mb-8 block">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-mute" />
        <input className="input py-3 pl-10 text-base" placeholder="Ex.: hipercalemia, Parkland, sensibilidade…" autoFocus
          value={q} onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })} />
      </label>

      {terms.length > 0 && !total && <Empty>Nada encontrado para “{q}”.</Empty>}

      {rq.length > 0 && (
        <section className="mb-8">
          <h2 className="label mb-3">Questões ({rq.length})</h2>
          <div className="space-y-3">
            {rq.slice(0, LIMIT).map((x) => (
              <details key={x.id} className="group">
                <summary className="card cursor-pointer list-none p-4 text-sm group-open:border-accent/40">
                  <span className="chip mr-2">{x.disciplina}</span>
                  <span className="text-mute">{x.enunciado.slice(0, 180)}{x.enunciado.length > 180 ? '…' : ''}</span>
                </summary>
                <div className="mt-2"><QuestionCard q={x} reveal /></div>
              </details>
            ))}
            {rq.length > LIMIT && <p className="text-xs text-mute">Mostrando {LIMIT} de {rq.length}. Refine a busca.</p>}
          </div>
        </section>
      )}

      {rc.length > 0 && (
        <section className="mb-8">
          <h2 className="label mb-3">Flashcards ({rc.length})</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {rc.slice(0, LIMIT).map((x) => (
              <li key={x.id} className="card p-4 text-sm">
                <p className="font-semibold">{x.frente}</p>
                <p className="mt-1 text-mute">{x.verso}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {rm.length > 0 && (
        <section className="mb-8">
          <h2 className="label mb-3">Materiais ({rm.length})</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {rm.map((x) => (
              <li key={x.id}>
                <Link to={`/app/materiais/${x.id}`} className="card block p-4 hover:border-accent/40">
                  <p className="font-semibold">{x.titulo}</p>
                  <p className="text-xs text-mute">{x.disciplina}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {rn.length > 0 && (
        <section className="mb-8">
          <h2 className="label mb-3">Notas ({rn.length})</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {rn.map((x) => (
              <li key={x.id} className="card p-4 text-sm">
                <Link to="/app/notas" className="font-semibold hover:text-accent">{x.title}</Link>
                <p className="mt-1 line-clamp-3 text-mute">{x.body}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
