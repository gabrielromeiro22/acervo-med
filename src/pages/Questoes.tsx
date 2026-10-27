import { useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Shuffle } from 'lucide-react'
import { QuestionCard } from '../components/QuestionCard'
import { Empty, PageHeader, Select } from '../components/ui'
import { DIF_LABEL, shuffle, sortDisc, uniq } from '../lib/format'
import { getState, recordAttempt, useQuestions, useStore } from '../lib/store'

const STATUS = [
  { value: '', label: 'Todas' },
  { value: 'novas', label: 'Não resolvidas' },
  { value: 'erradas', label: 'Errei por último' },
  { value: 'certas', label: 'Acertei por último' },
  { value: 'favoritas', label: 'Favoritas' },
]

type Filters = { periodo: string; disciplina: string; tema: string; dificuldade: string; status: string }
const NONE: Filters = { periodo: '', disciplina: '', tema: '', dificuldade: '', status: '' }

export default function Questoes() {
  const questions = useQuestions()
  const attempts = useStore((s) => s.attempts)
  const [params] = useSearchParams()
  const [f, setF] = useState<Filters>(() => ({ ...NONE, periodo: params.get('periodo') ?? '', disciplina: params.get('disciplina') ?? '' }))
  const [seed, setSeed] = useState(0)
  const [pos, setPos] = useState(0)
  const [chosen, setChosen] = useState<number>()
  const shownAt = useRef(Date.now())

  // A lista é congelada ao mudar os filtros: responder não tira a questão da tela.
  const list = useMemo(() => {
    const { attempts: at, favorites } = getState()
    const out = questions.filter((q) => {
      const xs = at[q.id], last = xs?.[xs.length - 1]
      if (f.periodo && q.periodo !== Number(f.periodo)) return false
      if (f.disciplina && q.disciplina !== f.disciplina) return false
      if (f.tema && q.tema !== f.tema) return false
      if (f.dificuldade && q.dificuldade !== f.dificuldade) return false
      if (f.status === 'novas') return !last
      if (f.status === 'erradas') return last?.correct === false
      if (f.status === 'certas') return last?.correct === true
      if (f.status === 'favoritas') return favorites.includes(q.id)
      return true
    })
    return seed ? shuffle(out) : out
  }, [questions, f, seed])

  const q = list[pos]
  const history = q ? attempts[q.id] ?? [] : []
  const prior = chosen === undefined ? history : history.slice(0, -1)

  const go = (to: number) => { setPos(to); setChosen(undefined); shownAt.current = Date.now() }
  const set = (k: keyof Filters, v: string) => {
    setF((cur) => ({ ...cur, [k]: v, ...(k === 'disciplina' ? { tema: '' } : {}) }))
    go(0)
  }
  const choose = (i: number) => {
    if (!q || chosen !== undefined) return
    setChosen(i)
    recordAttempt(q, i, Date.now() - shownAt.current)
  }

  const disciplinas = uniq(questions.map((x) => x.disciplina)).sort(sortDisc)
  const temas = uniq(questions.filter((x) => !f.disciplina || x.disciplina === f.disciplina).map((x) => x.tema)).sort()
  const periodos = uniq(questions.map((x) => x.periodo)).sort((a, b) => a - b)
  const opt = (xs: (string | number)[], all: string) => [{ value: '', label: all }, ...xs.map((x) => ({ value: String(x), label: String(x) }))]

  return (
    <>
      <PageHeader
        title="Banco de questões"
        sub={`${list.length} questões no filtro atual`}
        action={<button className="btn-ghost" onClick={() => { setSeed((s) => s + 1); go(0) }}><Shuffle className="size-4" /> Embaralhar</button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Select label="Período" value={f.periodo} onChange={(v) => set('periodo', v)}
          options={[{ value: '', label: 'Todos' }, ...periodos.map((p) => ({ value: String(p), label: `${p}º` }))]} />
        <Select label="Disciplina" value={f.disciplina} onChange={(v) => set('disciplina', v)} options={opt(disciplinas, 'Todas')} />
        <Select label="Tema" value={f.tema} onChange={(v) => set('tema', v)} options={opt(temas, 'Todos')} />
        <Select label="Dificuldade" value={f.dificuldade} onChange={(v) => set('dificuldade', v)}
          options={[{ value: '', label: 'Todas' }, ...Object.entries(DIF_LABEL).map(([value, label]) => ({ value, label }))]} />
        <Select label="Status" value={f.status} onChange={(v) => set('status', v)} options={STATUS} />
      </div>

      {!q ? (
        <Empty>Nenhuma questão com esses filtros.</Empty>
      ) : (
        <>
          <QuestionCard q={q} chosen={chosen} reveal={chosen !== undefined} onChoose={choose} index={`${pos + 1}/${list.length}`} />
          {prior.length > 0 && (
            <p className="mt-3 text-xs text-mute">
              Você já respondeu esta questão {prior.length}× · {prior.filter((a) => a.correct).length} acerto(s).
            </p>
          )}
          <div className="mt-5 flex justify-between gap-3">
            <button className="btn-ghost" disabled={pos === 0} onClick={() => go(pos - 1)}><ArrowLeft className="size-4" /> Anterior</button>
            <button className="btn-primary" disabled={pos >= list.length - 1} onClick={() => go(pos + 1)}>
              {chosen === undefined ? 'Pular' : 'Próxima'} <ArrowRight className="size-4" />
            </button>
          </div>
        </>
      )}
    </>
  )
}
