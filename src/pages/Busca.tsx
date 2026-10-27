import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTermo } from '../lib/useTermo'
import { Search } from 'lucide-react'
import { QuestionCard } from '../components/QuestionCard'
import { Empty, PageHeader } from '../components/ui'
import { normalize } from '../lib/format'
import { useArquivos, useFlashcards, useMaterials, useQuestions, useStore } from '../lib/store'
import { semFiguras } from '../lib/format'

const LIMIT = 20

export default function Busca() {
  // campo responde na hora; a busca roda com o termo já gravado na URL
  const [campo, setCampo, q] = useTermo()
  const questions = useQuestions()
  const cards = useFlashcards()
  const materials = useMaterials()
  const notes = useStore((s) => s.notes)
  const arquivos = useArquivos()
  // texto normalizado de cada questão/card, calculado uma vez (o acervo tem milhares de itens)
  const qIdx = useMemo(() => questions.map((x) => normalize(`${x.disciplina} ${x.materia ?? ''} ${x.tema} ${x.prova ?? ''} ${(x.palavras ?? []).join(' ')} ${x.fonte ?? ''} ${x.enunciado} ${x.alternativas.join(' ')} ${x.comentario}`)), [questions])
  const cIdx = useMemo(() => cards.map((x) => normalize(`${x.disciplina} ${x.tema} ${x.frente} ${x.verso}`)), [cards])

  const terms = normalize(q).split(/\s+/).filter(Boolean)
  const hit = (text: string) => { const t = normalize(text); return terms.every((w) => t.includes(w)) }

  const has = (t: string) => terms.every((w) => t.includes(w))
  const rq = terms.length ? questions.filter((_, i) => has(qIdx[i])) : []
  const rc = terms.length ? cards.filter((_, i) => has(cIdx[i])) : []
  const ra = terms.length ? arquivos.filter((x) => hit(x.path)) : []
  const rm = terms.length ? materials.filter((x) => hit(`${x.disciplina} ${x.titulo} ${x.conteudo}`)) : []
  const rn = terms.length ? notes.filter((x) => hit(`${x.title} ${x.body}`)) : []
  const total = rq.length + rc.length + rm.length + rn.length + ra.length

  return (
    <>
      <PageHeader title="Busca" sub="Questões, flashcards, PDFs do acervo e notas." />
      <label className="relative mb-8 block">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-mute" />
        <input className="input py-3 pl-10 text-base" placeholder="Ex.: hipercalemia, Parkland, sensibilidade…" autoFocus
          value={campo} onChange={(e) => setCampo(e.target.value)} />
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
                  <span className="text-mute">{semFiguras(x.enunciado).slice(0, 180)}{x.enunciado.length > 180 ? '…' : ''}</span>
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

      {ra.length > 0 && (
        <section className="mb-8">
          <h2 className="label mb-3">PDFs do acervo ({ra.length})</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {ra.slice(0, LIMIT).map((x) => (
              <li key={x.id}>
                <a href={`https://drive.google.com/file/d/${x.id}/view`} target="_blank" rel="noopener" className="card block p-4 hover:border-accent/40">
                  <p className="truncate font-semibold">{x.nome}</p>
                  <p className="truncate text-xs text-mute">{x.path.split('/').slice(0, -1).join(' › ').replace(/[✅🔍📄🎯🆕[\]]/gu, '')}</p>
                </a>
              </li>
            ))}
          </ul>
          {ra.length > LIMIT && <Link to={`/app/acervo?q=${encodeURIComponent(q)}`} className="mt-2 inline-block text-xs text-accent hover:underline">Ver os {ra.length} no Acervo</Link>}
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
