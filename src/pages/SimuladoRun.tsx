import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, CircleCheck, CircleMinus, CircleX, Clock, Download, Flag, ListChecks, Minus, RotateCcw, ScanLine, Target, Timer, X } from 'lucide-react'
import { QuestionCard } from '../components/QuestionCard'
import { TreinoModal } from '../components/TreinoModal'
import { Empty } from '../components/ui'
import type { Question } from '../data/types'
import { LETTERS, fmtTime } from '../lib/format'
import { recordAttempt, redoSimulado, setState, useQuestions, useStore, type Simulado } from '../lib/store'

export default function SimuladoRun() {
  const { id = '' } = useParams()
  return <Run key={id} id={id} />
}

function Run({ id }: { id: string }) {
  const sim = useStore((s) => s.simulados.find((x) => x.id === id))
  const questions = useQuestions()
  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions])
  const [elapsed, setElapsed] = useState(sim?.elapsedSec ?? 0)
  const [pos, setPos] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const finished = !!sim?.finishedAt
  // Prova feita no papel: sem cronômetro, só o lançamento das respostas.
  const paused = finished || !!sim?.papel

  const patch = useCallback((p: Partial<Simulado>) => {
    setState((s) => ({ ...s, simulados: s.simulados.map((x) => (x.id === id ? { ...x, ...p } : x)) }))
  }, [id])

  const finish = useCallback((total: number) => {
    if (!sim || sim.finishedAt) return
    const answered = sim.questionIds.filter((qid) => sim.answers[qid] !== undefined)
    const ms = answered.length ? (total * 1000) / answered.length : 0
    // Treino não entra nas estatísticas.
    if (!sim.treino) {
      for (const qid of answered) {
        const q = byId.get(qid)
        if (q) recordAttempt(q, sim.answers[qid], ms)
      }
    }
    patch({ finishedAt: Date.now(), elapsedSec: total })
    window.scrollTo({ top: 0 })
  }, [sim, byId, patch])

  useEffect(() => {
    if (paused) return
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [paused])

  // Salva o cronômetro a cada 5 s e encerra quando o tempo acaba.
  useEffect(() => {
    if (!sim || paused) return
    if (sim.durationSec && elapsed >= sim.durationSec) finish(sim.durationSec)
    else if (elapsed % 5 === 0 && sim.elapsedSec !== elapsed) patch({ elapsedSec: elapsed })
  }, [elapsed, sim, paused, finish, patch])

  if (!sim) {
    return <Empty>Prova não encontrada. <Link to="/app/minhas-provas" className="text-accent hover:underline">Voltar às minhas provas</Link></Empty>
  }
  if (finished) return <Resultado sim={sim} byId={byId} />
  if (sim.papel) return <Correcao sim={sim} byId={byId} />

  const ids = sim.questionIds
  const q = byId.get(ids[pos])
  const answeredCount = ids.filter((qid) => sim.answers[qid] !== undefined).length
  const left = sim.durationSec ? sim.durationSec - elapsed : 0
  const answer = (i: number) => patch({ answers: { ...sim.answers, [ids[pos]]: i }, elapsedSec: elapsed })

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link to="/app/minhas-provas" className="text-xs text-mute hover:text-ink">← Minhas provas</Link>
          <h1 className="truncate font-display text-2xl font-bold">{sim.nome}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className={`chip px-3 py-1 text-sm tabular-nums ${sim.durationSec && left < 300 ? 'border-danger/50 text-danger' : ''}`}>
            <Timer className="size-4" /> {sim.durationSec ? fmtTime(left) : fmtTime(elapsed)}
          </span>
          {confirming ? (
            <>
              <button className="btn-ghost" onClick={() => setConfirming(false)}>Cancelar</button>
              <button className="btn-primary" onClick={() => finish(elapsed)}>Confirmar entrega</button>
            </>
          ) : (
            <button className="btn-primary" onClick={() => setConfirming(true)}><Flag className="size-4" /> Finalizar</button>
          )}
        </div>
      </div>

      {confirming && answeredCount < ids.length && (
        <p className="mb-4 rounded-xl border border-warn/40 bg-warn/5 p-3 text-sm text-warn">
          {ids.length - answeredCount} questão(ões) em branco serão contadas como erro.
        </p>
      )}

      <div className="mb-5 flex flex-wrap gap-1.5">
        {ids.map((qid, i) => (
          <button key={qid} onClick={() => setPos(i)}
            className={`size-8 rounded-lg border text-xs font-semibold tabular-nums transition ${
              sim.answers[qid] === undefined ? 'border-line text-mute' : 'border-accent/50 bg-white/5 text-ink'
            } ${i === pos ? 'ring-2 ring-accent/60' : ''}`}>
            {i + 1}
          </button>
        ))}
      </div>

      {q ? (
        <QuestionCard q={q} chosen={sim.answers[q.id]} reveal={false} onChoose={answer} index={`${pos + 1}/${ids.length}`} />
      ) : (
        <Empty>Esta questão não está mais no acervo (talvez tenha sido removida da importação).</Empty>
      )}

      <div className="mt-5 flex justify-between gap-3">
        <button className="btn-ghost" disabled={pos === 0} onClick={() => setPos(pos - 1)}><ArrowLeft className="size-4" /> Anterior</button>
        <button className="btn-primary" disabled={pos >= ids.length - 1} onClick={() => setPos(pos + 1)}>Próxima <ArrowRight className="size-4" /></button>
      </div>
    </>
  )
}

type Status = 'certa' | 'errada' | 'branco'

const verdict = (p: number) =>
  p >= 90 ? 'Excelente!' : p >= 75 ? 'Muito bom!' : p >= 60 ? 'Bom, continue assim.' : p >= 40 ? 'Dá para melhorar.' : 'Hora de revisar o tema.'

function Ring({ value }: { value: number }) {
  const r = 52, c = 2 * Math.PI * r
  const color = value >= 75 ? 'var(--color-accent)' : value >= 50 ? 'var(--color-warn)' : 'var(--color-danger)'
  return (
    <div className="relative mx-auto size-40">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="8" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} className="transition-[stroke-dashoffset] duration-700" />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-display text-3xl font-bold tabular-nums" style={{ color }}>
        {value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
      </span>
    </div>
  )
}

function Resultado({ sim, byId }: { sim: Simulado; byId: Map<string, Question> }) {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<'' | Status>('')

  const rows = sim.questionIds.map((qid, i) => {
    const q = byId.get(qid)
    const a = sim.answers[qid]
    const status: Status = a === undefined ? 'branco' : a === q?.correta ? 'certa' : 'errada'
    return { qid, n: i + 1, q, a, status }
  })
  const count = (s: Status) => rows.filter((r) => r.status === s).length
  const total = rows.length
  const nota = total ? (count('certa') / total) * 100 : 0
  const notRight = rows.filter((r) => r.status !== 'certa').map((r) => r.qid)
  const [treino, setTreino] = useState(false)
  const redo = (ids: string[], suffix: string, isTreino = false) => navigate(`/app/simulados/${redoSimulado(sim, ids, suffix, isTreino)}`)

  const report = () => {
    const lines = [
      sim.nome, `Concluída em ${new Date(sim.finishedAt!).toLocaleString('pt-BR')}`,
      `Nota: ${nota.toFixed(1)}% · ${count('certa')} acertos · ${count('errada')} erros · ${count('branco')} em branco · tempo ${fmtTime(sim.elapsedSec)}`, '',
      ...rows.map((r) => `Questão ${r.n} — ${r.status === 'certa' ? 'Correta' : r.status === 'errada' ? 'Errada' : 'Em branco'}` +
        (r.q ? ` · sua resposta: ${r.a === undefined ? '—' : LETTERS[r.a]} · gabarito: ${LETTERS[r.q.correta]} · ${r.q.disciplina} / ${r.q.tema}` : '')),
    ]
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain' }))
    Object.assign(document.createElement('a'), { href: url, download: `${sim.nome.replace(/[^\w\- ]+/g, '').trim() || 'prova'}.txt` }).click()
    URL.revokeObjectURL(url)
  }

  const TILES = [
    { label: 'Acertos', value: count('certa'), icon: Target, bg: 'from-[#2f9e6e] to-[#1f7a55]' },
    { label: 'Erros', value: count('errada'), icon: CircleX, bg: 'from-[#e0475b] to-[#b8283f]' },
    { label: 'Tempo', value: fmtTime(sim.elapsedSec), icon: Clock, bg: 'from-[#3f74f0] to-[#2a4fd0]' },
    { label: 'Em branco', value: count('branco'), icon: CircleMinus, bg: 'from-[#5b6475] to-[#3b4250]' },
  ]
  const TABS = [
    { v: '' as const, label: 'Todas', n: total, icon: ListChecks },
    { v: 'certa' as const, label: 'Acertos', n: count('certa'), icon: Check },
    { v: 'errada' as const, label: 'Erros', n: count('errada'), icon: X },
    { v: 'branco' as const, label: 'Em branco', n: count('branco'), icon: Minus },
  ]
  const BADGE = {
    certa: <span className="chip border-accent/40 bg-accent/15 font-semibold text-accent"><CircleCheck className="size-3.5" /> Correta</span>,
    errada: <span className="chip border-danger/40 bg-danger/15 font-semibold text-danger"><CircleX className="size-3.5" /> Errada</span>,
    branco: <span className="chip font-semibold"><CircleMinus className="size-3.5" /> Em branco</span>,
  }

  return (
    <>
      <Link to="/app/minhas-provas" className="btn-ghost mb-6"><ArrowLeft className="size-4" /> Voltar</Link>

      <section className="grid gap-6 rounded-3xl border-2 border-ink/90 bg-panel p-6 sm:p-8 md:grid-cols-2">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="rounded-lg bg-[#c8285a] px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white">{sim.treino ? 'Treino concluído' : 'Prova concluída'}</span>
          <span className="max-w-full truncate rounded-lg bg-ink px-4 py-1.5 font-bold uppercase tracking-[0.12em] text-bg">{sim.nome}</span>
          <Ring value={nota} />
          <p className="font-display text-lg font-bold text-accent">{verdict(nota)}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button className="btn bg-[#c8285a] text-white hover:brightness-110" onClick={() => redo(sim.questionIds, 'refazer')}><RotateCcw className="size-4" /> Refazer prova</button>
            {notRight.length > 0 && (
              <button className="btn bg-warn text-bg hover:brightness-110" onClick={() => setTreino(true)}><Target className="size-4" /> Refazer erradas</button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:border-l md:border-line md:pl-6">
          {TILES.map(({ label, value, icon: I, bg }) => (
            <div key={label} className={`grid aspect-square place-items-center content-center gap-1 rounded-2xl bg-gradient-to-br ${bg} text-white shadow-[0_8px_24px_-12px_rgba(0,0,0,0.7)]`}>
              <I className="size-6" />
              <span className="font-display text-3xl font-bold tabular-nums">{value}</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-white/80">{label}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-10 mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold">Revisão das questões</h2>
        <button className="btn bg-[#c8285a] text-xs uppercase tracking-wider text-white hover:brightness-110" onClick={report}><Download className="size-4" /> Relatório TXT</button>
      </div>

      <div className="mb-5 inline-flex flex-wrap gap-1 rounded-2xl border border-line bg-panel p-1">
        {TABS.map(({ v, label, n, icon: I }) => (
          <button key={label} onClick={() => setFilter(v)}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm transition ${filter === v ? 'border border-[#c8285a]/60 bg-[#c8285a]/15 font-semibold text-ink' : 'text-mute hover:text-ink'}`}>
            <I className="size-4" /> {label}
            <span className={`rounded-full px-1.5 text-xs tabular-nums ${filter === v ? 'bg-[#c8285a] text-white' : 'bg-white/10'}`}>{n}</span>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {rows.filter((r) => !filter || r.status === filter).map((r) => r.q ? (
          <QuestionCard key={r.qid} q={r.q} chosen={r.a} reveal index={`Questão ${r.n}`} badge={BADGE[r.status]} />
        ) : (
          <Empty key={r.qid}>Questão {r.n} não está mais no acervo.</Empty>
        ))}
      </div>
      {treino && <TreinoModal count={notRight.length} onCancel={() => setTreino(false)} onConfirm={() => redo(notRight, 'erradas', true)} />}
    </>
  )
}

function Correcao({ sim, byId }: { sim: Simulado; byId: Map<string, Question> }) {
  const [answers, setAnswers] = useState<Record<string, number>>(sim.answers)
  const [min, setMin] = useState('')
  const filled = sim.questionIds.filter((qid) => answers[qid] !== undefined).length

  const corrigir = () => {
    const total = Math.max(0, Math.round(Number(min) * 60) || 0)
    const ms = filled ? (total * 1000) / filled : 0
    for (const qid of sim.questionIds) {
      const q = byId.get(qid)
      if (q && answers[qid] !== undefined) recordAttempt(q, answers[qid], ms)
    }
    setState((s) => ({ ...s, simulados: s.simulados.map((x) => (x.id === sim.id ? { ...x, answers, elapsedSec: total, finishedAt: Date.now() } : x)) }))
    window.scrollTo({ top: 0 })
  }

  return (
    <>
      <Link to="/app/minhas-provas" className="text-xs text-mute hover:text-ink">← Minhas provas</Link>
      <h1 className="mt-1 font-display text-2xl font-bold">{sim.nome}</h1>
      <p className="mb-6 text-sm text-mute">Lance as respostas da sua folha. Questões sem marcação contam como em branco.</p>

      <div className="card divide-y divide-line">
        {sim.questionIds.map((qid, i) => {
          const q = byId.get(qid)
          return (
            <div key={qid} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
              <span className="w-10 font-display font-bold tabular-nums">{i + 1}</span>
              {q ? q.alternativas.map((_, k) => (
                <button key={k} onClick={() => setAnswers((a) => (a[qid] === k ? Object.fromEntries(Object.entries(a).filter(([x]) => x !== qid)) : { ...a, [qid]: k }))}
                  className={`grid size-8 place-items-center rounded-full border text-xs font-bold transition ${answers[qid] === k ? 'border-accent bg-accent text-bg' : 'border-line text-mute hover:border-accent/60 hover:text-ink'}`}>
                  {LETTERS[k]}
                </button>
              )) : <span className="text-xs text-mute">Questão não está mais no acervo</span>}
              {q && <span className="ml-auto hidden truncate text-xs text-mute sm:block">{q.tema}</span>}
            </div>
          )
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
        <label className="block">
          <span className="label">Tempo gasto (min, opcional)</span>
          <input className="input w-40" type="number" min={0} value={min} onChange={(e) => setMin(e.target.value)} />
        </label>
        <div className="flex items-center gap-3">
          <span className="text-sm text-mute tabular-nums">{filled}/{sim.questionIds.length} marcadas</span>
          <button className="btn-primary" disabled={!filled} onClick={corrigir}><ScanLine className="size-4" /> Corrigir</button>
        </div>
      </div>
    </>
  )
}
