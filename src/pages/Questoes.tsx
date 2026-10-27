import { useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Play, Search, Shuffle } from 'lucide-react'
import { QuestionCard } from '../components/QuestionCard'
import { Empty, PageHeader, Select } from '../components/ui'
import { DIF_LABEL, normalize, periodoLabel, shuffle, sortDisc, uniq } from '../lib/format'
import { createSimulado, getState, recordAttempt, useQuestions, useStore } from '../lib/store'

const STATUS = [
  { value: '', label: 'Todas' },
  { value: 'novas', label: 'Não resolvidas' },
  { value: 'erradas', label: 'Errei por último' },
  { value: 'certas', label: 'Acertei por último' },
  { value: 'favoritas', label: 'Favoritas' },
]

type Filters = { periodo: string; disciplina: string; prova: string; roteiro: string; materia: string; tema: string; dificuldade: string; status: string; busca: string }
const NONE: Filters = { periodo: '', disciplina: '', prova: '', roteiro: '', materia: '', tema: '', dificuldade: '', status: '', busca: '' }
// mudar um filtro limpa os que dependem dele
const DEPENDE: Partial<Record<keyof Filters, (keyof Filters)[]>> = {
  periodo: ['disciplina', 'prova', 'roteiro'], disciplina: ['prova', 'roteiro'], materia: ['tema'],
}
// "fazer a prova inteira": ordem original e ~3 min por questão
const MIN_POR_QUESTAO = 3

export default function Questoes() {
  const questions = useQuestions()
  const attempts = useStore((s) => s.attempts)
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [f, setF] = useState<Filters>(() => ({ ...NONE, periodo: params.get('periodo') ?? '', disciplina: params.get('disciplina') ?? '', materia: params.get('materia') ?? '', roteiro: params.get('roteiro') ?? '' }))
  const [seed, setSeed] = useState(0)
  const [pos, setPos] = useState(0)
  const [chosen, setChosen] = useState<number>()
  const shownAt = useRef(Date.now())

  // texto normalizado para a busca por conteúdo (enunciado, alternativas, assunto e palavras-chave)
  const idx = useMemo(() => new Map(questions.map((q) => [q.id,
    normalize(`${q.materia ?? ''} ${q.tema} ${(q.palavras ?? []).join(' ')} ${q.enunciado} ${q.alternativas.join(' ')}`)])), [questions])
  const words = normalize(f.busca).split(/\s+/).filter(Boolean)

  // A lista é congelada ao mudar os filtros: responder não tira a questão da tela.
  const list = useMemo(() => {
    const { attempts: at, favorites } = getState()
    const out = questions.filter((q) => {
      const xs = at[q.id], last = xs?.[xs.length - 1]
      if (f.periodo && q.periodo !== Number(f.periodo)) return false
      if (f.disciplina && q.disciplina !== f.disciplina) return false
      if (f.prova && q.prova !== f.prova) return false
      if (f.roteiro && q.roteiro !== f.roteiro) return false
      if (f.materia && q.materia !== f.materia) return false
      if (f.tema && q.tema !== f.tema) return false
      if (words.length && !words.every((w) => idx.get(q.id)!.includes(w))) return false
      if (f.dificuldade && q.dificuldade !== f.dificuldade) return false
      if (f.status === 'novas') return !last
      if (f.status === 'erradas') return last?.correct === false
      if (f.status === 'certas') return last?.correct === true
      if (f.status === 'favoritas') return favorites.includes(q.id)
      return true
    })
    // uma prova inteira aparece na ordem original
    if (f.prova) out.sort((a, b) => (a.numero ?? 999) - (b.numero ?? 999))
    return seed ? shuffle(out) : out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, f, seed, idx])

  const q = list[pos]
  const history = q ? attempts[q.id] ?? [] : []
  const prior = chosen === undefined ? history : history.slice(0, -1)

  const go = (to: number) => { setPos(to); setChosen(undefined); shownAt.current = Date.now() }
  const set = (k: keyof Filters, v: string) => {
    setF((cur) => ({ ...cur, [k]: v, ...Object.fromEntries((DEPENDE[k] ?? []).map((d) => [d, ''])) }))
    go(0)
  }
  const choose = (i: number) => {
    if (!q || chosen !== undefined) return
    setChosen(i)
    recordAttempt(q, i, Date.now() - shownAt.current)
  }

  // opções em cascata: cada filtro só oferece o que existe dentro dos filtros acima dele
  const doPeriodo = questions.filter((x) => !f.periodo || x.periodo === Number(f.periodo))
  const daDisc = doPeriodo.filter((x) => !f.disciplina || x.disciplina === f.disciplina)
  const periodos = uniq(questions.map((x) => x.periodo)).sort((a, b) => a - b)
  const disciplinas = uniq(doPeriodo.map((x) => x.disciplina)).sort(sortDisc)
  const provas = f.disciplina ? uniq(daDisc.map((x) => x.prova).filter((x): x is string => !!x)).sort((a, b) => b.localeCompare(a, 'pt', { numeric: true })) : []
  // assuntos do roteiro oficial do período (vindos do Meu Acervo), só quando a disciplina tem
  const roteiros = f.disciplina ? uniq(daDisc.map((x) => x.roteiro).filter((x): x is string => !!x)).sort((a, b) => a.localeCompare(b, 'pt')) : []
  const materias = uniq(daDisc.map((x) => x.materia).filter((x): x is string => !!x)).sort()
  const temas = uniq(daDisc.filter((x) => !f.materia || x.materia === f.materia).map((x) => x.tema)).sort()
  const opt = (xs: (string | number)[], all: string) => [{ value: '', label: all }, ...xs.map((x) => ({ value: String(x), label: String(x) }))]

  const fazerProva = () => {
    const ids = [...list].sort((a, b) => (a.numero ?? 999) - (b.numero ?? 999)).map((x) => x.id)
    const nome = [f.disciplina, f.prova || f.roteiro].filter(Boolean).join(' · ')
    navigate(`/app/simulados/${createSimulado(nome, ids, ids.length * MIN_POR_QUESTAO * 60, false, false, f.roteiro ? { gabarito: 'depois' } : {})}`)
  }

  return (
    <>
      <PageHeader
        title="Banco de questões"
        sub={`${list.length} questões no filtro atual`}
        action={<button className="btn-ghost" onClick={() => { setSeed((s) => s + 1); go(0) }}><Shuffle className="size-4" /> Embaralhar</button>}
      />

      <label className="relative mb-3 block">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-mute" />
        <input className="input py-2.5 pl-10" placeholder="Buscar por conteúdo: insuficiência cardíaca, pré-natal, SUS…" value={f.busca}
          onChange={(e) => set('busca', e.target.value)} />
      </label>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Select label="Período" value={f.periodo} onChange={(v) => set('periodo', v)}
          options={[{ value: '', label: 'Todos' }, ...periodos.map((p) => ({ value: String(p), label: periodoLabel(p) }))]} />
        <Select label="Disciplina" value={f.disciplina} onChange={(v) => set('disciplina', v)} options={opt(disciplinas, 'Todas')} />
        <Select label="Prova" value={f.prova} onChange={(v) => set('prova', v)}
          options={f.disciplina ? opt(provas, 'Todas') : [{ value: '', label: 'Escolha a disciplina' }]} />
        {roteiros.length > 0 && (
          <Select label="Assunto do roteiro" value={f.roteiro} onChange={(v) => set('roteiro', v)} options={opt(roteiros, 'Todos')} />
        )}
        <Select label="Matéria" value={f.materia} onChange={(v) => set('materia', v)} options={opt(materias, 'Todas')} />
        <Select label="Assunto" value={f.tema} onChange={(v) => set('tema', v)} options={opt(temas, 'Todos')} />
        <Select label="Dificuldade" value={f.dificuldade} onChange={(v) => set('dificuldade', v)}
          options={[{ value: '', label: 'Todas' }, ...Object.entries(DIF_LABEL).map(([value, label]) => ({ value, label }))]} />
        <Select label="Status" value={f.status} onChange={(v) => set('status', v)} options={STATUS} />
      </div>

      {(f.prova || f.roteiro) && list.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-4">
          <p className="text-sm"><b>{f.disciplina} · {f.prova || f.roteiro}</b> <span className="text-mute">· {list.length} questões{f.prova ? ' na ordem original' : ' deste assunto'}</span></p>
          <button className="btn-primary" onClick={fazerProva}><Play className="size-4" /> Fazer esta prova</button>
        </div>
      )}

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
