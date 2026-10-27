import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Play } from 'lucide-react'
import { toast } from 'sonner'
import { AssuntoPicker } from '../components/AssuntoPicker'
import { PageHeader } from '../components/ui'
import { fmtDate, matchesAssuntos, shuffle } from '../lib/format'
import { createSimulado, useQuestions, useStore } from '../lib/store'

export default function Simulados() {
  const questions = useQuestions()
  const simulados = useStore((s) => s.simulados)
  const attempts = useStore((s) => s.attempts)
  const navigate = useNavigate()
  const [nome, setNome] = useState('')
  const [assuntos, setAssuntos] = useState<string[]>([])
  const [n, setN] = useState(10)
  const [min, setMin] = useState(30)
  const [onlyNew, setOnlyNew] = useState(false)

  const pool = questions.filter((q) => matchesAssuntos(q, assuntos) && (!onlyNew || !attempts[q.id]?.length))

  const create = () => {
    if (!pool.length) return toast.error('Nenhuma questão disponível com essa seleção.')
    const ids = shuffle(pool).slice(0, n).map((q) => q.id)
    navigate(`/app/simulados/${createSimulado(nome.trim() || `Simulado de ${fmtDate(Date.now())}`, ids, min * 60)}`)
  }

  return (
    <>
      <PageHeader title="Simulados" sub="Escolha áreas ou temas e monte uma prova cronometrada." />

      <section className="card p-5 sm:p-6">
        <label className="block">
          <span className="label">Nome</span>
          <input className="input" placeholder="Ex.: Revisão de clínica médica" value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>

        <p className="label mt-5">Assuntos filtrados</p>
        <AssuntoPicker questions={questions} value={assuntos} onChange={setAssuntos} />

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="label">Questões</span>
            <input className="input" type="number" min={1} max={200} value={n} onChange={(e) => setN(Math.max(1, Number(e.target.value) || 1))} />
          </label>
          <label className="block">
            <span className="label">Tempo (min, 0 = livre)</span>
            <input className="input" type="number" min={0} max={600} value={min} onChange={(e) => setMin(Math.max(0, Number(e.target.value) || 0))} />
          </label>
          <label className="col-span-2 flex items-center gap-2 self-end pb-2 text-sm text-mute sm:col-span-1">
            <input type="checkbox" className="accent-accent" checked={onlyNew} onChange={(e) => setOnlyNew(e.target.checked)} />
            Só questões não resolvidas
          </label>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-mute">{Math.min(n, pool.length)} de {pool.length} questões disponíveis</p>
          <button className="btn-primary" onClick={create}><Play className="size-4" /> Começar</button>
        </div>
      </section>

      <Link to="/app/minhas-provas" className="card mt-6 flex items-center justify-between p-4 transition hover:border-accent/40">
        <span><b>Minhas provas</b> <span className="text-mute">· {simulados.length} no histórico</span></span>
        <ArrowRight className="size-4 text-accent" />
      </Link>
    </>
  )
}
