import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, CalendarDays, Clock, ClipboardCheck, Eye, Play, Plus, RotateCcw, ScanLine, Search, Target, Trash2 } from 'lucide-react'
import { TreinoModal } from '../components/TreinoModal'
import { Empty } from '../components/ui'
import { normalize, pct, uniq } from '../lib/format'
import { acertou, redoSimulado, setState, useQuestoesProva, useStore, type Simulado } from '../lib/store'

const tone = (p: number) =>
  p >= 85 ? 'bg-accent text-bg' : p >= 70 ? 'bg-lime-300 text-bg' : p >= 50 ? 'bg-warn text-bg' : 'bg-danger text-bg'

const fmtMin = (sec: number) => (sec < 60 ? `${sec}s` : `${Math.round(sec / 60)}min`)

export default function MinhasProvas() {
  const questions = useQuestoesProva()
  const simulados = useStore((s) => s.simulados)
  const navigate = useNavigate()
  const [term, setTerm] = useState('')
  const [tag, setTag] = useState('')

  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions])
  const rows = simulados.map((s) => {
    const discs = uniq(s.questionIds.map((id) => byId.get(id)?.disciplina).filter((d): d is string => !!d))
    const wrong = s.questionIds.filter((id) => !acertou(s, id, byId.get(id)?.correta))
    return { s, materia: discs.length === 1 ? discs[0] : 'Misto', discs, right: s.questionIds.length - wrong.length, wrong }
  })
  const tags = uniq(rows.map((r) => r.materia)).sort()
  const shown = rows.filter((r) =>
    (!tag || r.materia === tag) && (!term || normalize(`${r.s.nome} ${r.discs.join(' ')}`).includes(normalize(term))))
  const done = simulados.filter((s) => s.finishedAt && !s.treino).length
  const [treino, setTreino] = useState<{ s: Simulado; ids: string[] }>()

  const redo = (s: Simulado, ids: string[], suffix: string, isTreino = false) => navigate(`/app/simulados/${redoSimulado(s, ids, suffix, isTreino)}`)
  const remove = (id: string) => setState((st) => ({ ...st, simulados: st.simulados.filter((x) => x.id !== id) }))

  return (
    <>
      <header className="mb-6 flex overflow-hidden rounded-2xl border border-line bg-panel">
        <div className="flex items-center gap-3 bg-gradient-to-r from-[#7b3fe4] to-[#d63c8f] px-5 py-4 text-white sm:px-6">
          <span className="grid size-10 place-items-center rounded-full bg-white/90 text-[#7b3fe4]"><ClipboardCheck className="size-5" /></span>
          <span>
            <span className="block text-xs tracking-wider text-white/75">Histórico</span>
            <span className="block font-display text-2xl font-bold leading-tight">Minhas provas</span>
          </span>
        </div>
        <div className="flex flex-1 items-center justify-between gap-3 px-5 py-4">
          <span>
            <span className="label">Total concluído</span>
            <span className="font-display text-2xl font-bold">{done} {done === 1 ? 'prova' : 'provas'}</span>
          </span>
          <Link to="/app/simulados" className="btn-primary hidden sm:inline-flex"><Plus className="size-4" /> Nova prova</Link>
        </div>
      </header>

      <label className="relative mb-4 block">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-mute" />
        <input className="input py-2.5 pl-10" placeholder="Buscar por matéria, prova…" value={term} onChange={(e) => setTerm(e.target.value)} />
      </label>

      {tags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {[['', 'Todas', rows.length] as const, ...tags.map((t) => [t, t, rows.filter((r) => r.materia === t).length] as const)].map(([v, label, n]) => (
            <button key={label} onClick={() => setTag(v)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                tag === v ? 'border-ink bg-ink text-bg' : 'border-line text-mute hover:text-ink'
              }`}>
              {label} <span className={`rounded-md px-1.5 py-0.5 tabular-nums ${tag === v ? 'bg-bg text-ink' : 'bg-white/10'}`}>{n}</span>
            </button>
          ))}
        </div>
      )}

      {!shown.length ? (
        <Empty>
          {simulados.length ? 'Nenhuma prova encontrada.' : <>Você ainda não fez nenhuma prova. <Link to="/app/simulados" className="text-accent hover:underline">Montar um simulado</Link></>}
        </Empty>
      ) : (
        <ul className="grid gap-5 lg:grid-cols-2">
          {shown.map(({ s, materia, right, wrong }) => {
            const total = s.questionIds.length
            const nota = pct(right, total)
            const when = new Date(s.finishedAt ?? s.createdAt)
            return (
              <li key={s.id} className="overflow-hidden rounded-2xl border-2 border-ink/90 bg-panel">
                <div className="flex">
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 bg-ink px-5 py-4 text-bg">
                    {(!s.finishedAt || s.treino || s.papel) && (
                      <span className="flex gap-1.5">
                        {!s.finishedAt && <span className="w-fit rounded-full border border-bg/40 px-2 py-0.5 text-[10px] font-bold uppercase">{s.papel ? 'Aguardando correção' : 'Em andamento'}</span>}
                        {s.papel && <span className="w-fit rounded-full bg-cyan-300 px-2 py-0.5 text-[10px] font-bold uppercase">Papel</span>}
                        {s.treino && <span className="w-fit rounded-full bg-warn px-2 py-0.5 text-[10px] font-bold uppercase">Treino</span>}
                      </span>
                    )}
                    <span className="truncate font-display text-xl font-bold sm:text-2xl">{s.nome}</span>
                  </div>
                  {s.finishedAt ? (
                    <div className={`grid w-24 shrink-0 place-items-center content-center ${tone(nota)}`}>
                      <span className="font-display text-3xl font-bold leading-none">{nota}<span className="text-base">%</span></span>
                      <span className="mt-1 text-[10px] font-bold uppercase tracking-widest">Nota</span>
                    </div>
                  ) : (
                    <div className="grid w-24 shrink-0 place-items-center content-center border-l border-bg/20 bg-ink text-bg">
                      <span className="font-display text-3xl font-bold leading-none">{total}</span>
                      <span className="mt-1 text-[10px] font-bold uppercase tracking-widest">Questões</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 divide-x divide-line border-y border-line text-center">
                  <div className="p-3">
                    {s.finishedAt ? (
                      <>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-mute">Questões</p>
                        <p className="font-display text-lg font-bold">{total}</p>
                        <p className="flex justify-center gap-1 text-[11px] font-bold">
                          <span className="rounded-full bg-accent/20 px-1.5 text-accent">✓ {right}</span>
                          <span className="rounded-full bg-danger/20 px-1.5 text-danger">✗ {wrong.length}</span>
                        </p>
                      </>
                    ) : (
                      <><BookOpen className="mx-auto size-4 text-mute" /><p className="mt-1 truncate text-sm font-semibold">{materia}</p></>
                    )}
                  </div>
                  <div className="grid place-items-center content-center p-3">
                    <Clock className="size-4 text-danger" />
                    <p className="mt-1 font-semibold">{fmtMin(s.elapsedSec)}</p>
                  </div>
                  <div className="grid place-items-center content-center p-3">
                    <CalendarDays className="size-4 text-danger" />
                    <p className="mt-1 font-semibold tabular-nums">{when.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</p>
                    <p className="text-[11px] text-mute tabular-nums">{when.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>

                <div className="flex text-xs font-bold uppercase tracking-wider">
                  {s.finishedAt ? (
                    <>
                      <Link to={`/app/simulados/${s.id}`} className="flex flex-1 items-center justify-center gap-1.5 py-3 hover:bg-white/5"><Eye className="size-4" /> Rever</Link>
                      <button onClick={() => redo(s, s.questionIds, 'refazer')} className="flex flex-1 items-center justify-center gap-1.5 border-l border-line py-3 hover:bg-white/5"><RotateCcw className="size-4" /> Refazer</button>
                      {wrong.length > 0 && (
                        <button onClick={() => setTreino({ s, ids: wrong })} className="flex flex-1 items-center justify-center gap-1.5 bg-warn py-3 text-bg hover:brightness-110"><Target className="size-4" /> Erradas</button>
                      )}
                    </>
                  ) : (
                    s.papel ? (
                      <Link to={`/app/simulados/${s.id}`} className="flex flex-1 items-center justify-center gap-1.5 bg-cyan-300 py-3 text-bg hover:brightness-110"><ScanLine className="size-4" /> Corrigir</Link>
                    ) : (
                      <Link to={`/app/simulados/${s.id}`} className="flex flex-1 items-center justify-center gap-1.5 bg-accent py-3 text-bg hover:brightness-110"><Play className="size-4" /> Continuar</Link>
                    )
                  )}
                  <button onClick={() => remove(s.id)} aria-label="Excluir prova" className="grid w-12 place-items-center bg-danger text-bg hover:brightness-110"><Trash2 className="size-4" /></button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {treino && <TreinoModal count={treino.ids.length} onCancel={() => setTreino(undefined)} onConfirm={() => redo(treino.s, treino.ids, 'erradas', true)} />}
    </>
  )
}
