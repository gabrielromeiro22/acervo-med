import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Markdown } from '../components/Markdown'
import { Empty, PageHeader, Select } from '../components/ui'
import { normalize, sortDisc, uniq } from '../lib/format'
import { useMaterials } from '../lib/store'

const TIPO = { resumo: 'Resumo', checklist: 'Checklist', mapa: 'Mapa' } as const

export default function Materiais() {
  const { id } = useParams()
  const materials = useMaterials()
  const [params] = useSearchParams()
  const [disc, setDisc] = useState(() => params.get('disciplina') ?? '')
  const [term, setTerm] = useState('')

  if (id) {
    const m = materials.find((x) => x.id === id)
    return (
      <>
        <Link to="/app/materiais" className="mb-6 inline-flex items-center gap-1.5 text-sm text-mute hover:text-ink"><ArrowLeft className="size-4" /> Materiais</Link>
        {!m ? <Empty>Material não encontrado.</Empty> : (
          <article className="card p-6 sm:p-8">
            <div className="mb-5 flex flex-wrap gap-2">
              <span className="chip">{m.disciplina}</span>
              <span className="chip">{m.periodo}º período</span>
              <span className="chip">{TIPO[m.tipo]}</span>
            </div>
            <Markdown source={m.conteudo} />
          </article>
        )}
      </>
    )
  }

  const shown = materials.filter((m) =>
    (!disc || m.disciplina === disc) && (!term || normalize(`${m.titulo} ${m.conteudo}`).includes(normalize(term))))
  const groups = uniq(shown.map((m) => m.disciplina)).sort(sortDisc)

  return (
    <>
      <PageHeader title="Materiais" sub="Resumos, checklists e mapas por disciplina." />
      <div className="mb-6 grid gap-3 sm:grid-cols-[16rem_1fr]">
        <Select label="Disciplina" value={disc} onChange={setDisc}
          options={[{ value: '', label: 'Todas' }, ...uniq(materials.map((m) => m.disciplina)).sort(sortDisc).map((d) => ({ value: d, label: d }))]} />
        <label className="block">
          <span className="label">Buscar</span>
          <input className="input" placeholder="Título ou conteúdo" value={term} onChange={(e) => setTerm(e.target.value)} />
        </label>
      </div>

      {!materials.length ? (
        <Empty>Os resumos do acervo estão em PDF. <Link to="/app/acervo?tipo=resumo" className="text-accent hover:underline">Ver resumos no Acervo</Link></Empty>
      ) : !groups.length ? <Empty>Nenhum material encontrado.</Empty> : groups.map((g) => (
        <section key={g} className="mb-8">
          <h2 className="mb-3 font-display text-lg font-semibold">{g}</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {shown.filter((m) => m.disciplina === g).map((m) => (
              <li key={m.id}>
                <Link to={`/app/materiais/${m.id}`} className="card block p-4 transition hover:border-accent/40 hover:shadow-[4px_4px_0_#2dea96]">
                  <p className="font-semibold">{m.titulo}</p>
                  <p className="mt-1 text-xs text-mute">{TIPO[m.tipo]} · {m.periodo}º período</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}
