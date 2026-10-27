import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronDown, Flame, Play } from 'lucide-react'
import { Empty } from '../components/ui'
import type { Question } from '../data/types'
import { assuntoDe, periodoLabel, sortDisc } from '../lib/format'
import { useAcervoPronto, useQuestoesProva, useStore } from '../lib/store'

const semestre = (q: Question) => q.prova?.match(/20\d\d\.[12]/)?.[0] ?? '—'

interface Assunto { nome: string; n: number; provas: Map<string, { rotulo: string; disc: string; n: number }>; roteiro: boolean }

function ranking(qs: Question[]) {
  const m = new Map<string, Assunto>()
  for (const q of qs) {
    const nome = assuntoDe(q)
    if (!nome) continue
    const a = m.get(nome) ?? { nome, n: 0, provas: new Map(), roteiro: !!q.roteiro }
    a.n++
    const p = a.provas.get(q.arquivo!) ?? { rotulo: q.prova || semestre(q), disc: q.disciplina.replace(/^Internato · /, ''), n: 0 }
    p.n++; a.provas.set(q.arquivo!, p); m.set(nome, a)
  }
  return [...m.values()].sort((a, b) => b.n - a.n || b.provas.size - a.provas.size || a.nome.localeCompare(b.nome, 'pt'))
}

// Assuntos mais cobrados nas provas anteriores de cada disciplina do período
export default function Cobrados() {
  const [params, setParams] = useSearchParams()
  const salvo = useStore((s) => s.periodo)
  const periodo = params.has('periodo') ? Number(params.get('periodo')) : salvo ?? 4
  const pronto = useAcervoPronto()
  const todas = useQuestoesProva()
  const qs = useMemo(() => todas.filter((q) => q.periodo === periodo && q.arquivo && q.prova), [todas, periodo])
  const discs = useMemo(() => [...new Set(qs.map((q) => q.disciplina))].sort(sortDisc), [qs])
  const geral = useMemo(() => ranking(qs).slice(0, 10), [qs])
  const nProvas = new Set(qs.map((q) => q.arquivo)).size
  const sems = [...new Set(qs.map(semestre))].filter((s) => s !== '—').sort()

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[1.75rem] border-[3px] border-ink bg-[#10131f]">
        <div className="flex flex-wrap items-center gap-4 bg-[#c80e58] px-6 py-5">
          <span className="grid size-14 place-items-center rounded-2xl border-[3px] border-black bg-white text-[#c80e58] shadow-[3px_3px_0_#000]"><Flame className="size-7" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-bold tracking-[0.25em] text-pink-100 uppercase">Análise das provas anteriores</span>
            <span className="block font-display text-2xl font-extrabold sm:text-3xl">Assuntos mais cobrados · {periodoLabel(periodo)}</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-6 py-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((p) => (
            <button key={p} onClick={() => setParams({ periodo: String(p) }, { replace: true })}
              className={`rounded-full border px-3 py-1 text-xs font-bold ${p === periodo ? 'border-white bg-white text-black' : 'border-white/20 text-zinc-400 hover:text-white'}`}>
              {p === 0 ? 'TPI / ENAMED' : p === 9 ? 'Internato' : `${p}º`}
            </button>
          ))}
          {qs.length > 0 && <span className="ml-auto text-xs text-zinc-400">{qs.length} questões · {nProvas} provas · {sems[0]} a {sems[sems.length - 1]}</span>}
        </div>
        {geral.length > 0 && (
          <div className="p-5 sm:p-6">
            <h2 className="mb-3 text-xs font-extrabold tracking-[0.2em] text-zinc-400 uppercase">Top 10 do período</h2>
            <Lista itens={geral} periodo={periodo} max={geral[0].n} mostrarDisc={qs} />
          </div>
        )}
      </section>

      {!pronto ? <Empty>Carregando…</Empty> : !qs.length ? <Empty>Nenhuma prova com questões neste período ainda.</Empty> : discs.map((d) => {
        const dq = qs.filter((q) => q.disciplina === d)
        return <Disciplina key={d} disciplina={d} qs={dq} periodo={periodo} />
      })}
    </div>
  )
}

function Disciplina({ disciplina, qs, periodo }: { disciplina: string; qs: Question[]; periodo: number }) {
  const [todos, setTodos] = useState(false)
  const itens = useMemo(() => ranking(qs), [qs])
  const provas = new Set(qs.map((q) => q.arquivo)).size
  if (!itens.length) return null
  return (
    <section className="rounded-2xl border border-white/10 bg-[#161a2b] p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl font-bold">{disciplina.replace(/^Internato · /, '')}</h2>
        <span className="text-sm text-zinc-400">{qs.length} questões em {provas} provas · {itens.length} assuntos</span>
      </div>
      <Lista itens={todos ? itens : itens.slice(0, 8)} periodo={periodo} max={itens[0].n} disciplina={disciplina} />
      {itens.length > 8 && (
        <button onClick={() => setTodos(!todos)} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-zinc-300 hover:text-white">
          <ChevronDown className={`size-4 transition ${todos ? 'rotate-180' : ''}`} /> {todos ? 'Mostrar só os principais' : `Ver todos os ${itens.length} assuntos`}
        </button>
      )}
    </section>
  )
}

function Lista({ itens, max, periodo, disciplina, mostrarDisc }: { itens: Assunto[]; max: number; periodo: number; disciplina?: string; mostrarDisc?: Question[] }) {
  return (
    <ol className="space-y-2.5">
      {itens.map((a, i) => {
        const discs = mostrarDisc && [...new Set(mostrarDisc.filter((q) => assuntoDe(q) === a.nome).map((q) => q.disciplina))].sort(sortDisc)
        const treinar = `/app/questoes?periodo=${periodo}${disciplina ? `&disciplina=${encodeURIComponent(disciplina)}` : ''}&${a.roteiro ? 'roteiro' : 'tema'}=${encodeURIComponent(a.nome)}`
        const provas = [...a.provas.values()].sort((x, y) => sortDisc(x.disc, y.disc) || semestreDe(x.rotulo).localeCompare(semestreDe(y.rotulo)))
        return (
          <li key={a.nome} className="rounded-xl border border-white/10 bg-black/25 p-3">
            <div className="flex items-start gap-3">
              <span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-extrabold ${i < 3 ? 'bg-[#c80e58] text-white' : 'bg-white/10 text-zinc-300'}`}>{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-snug">{a.nome}</p>
                {discs && <p className="text-xs text-zinc-400">{discs.join(' · ')}</p>}
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#c80e58]" style={{ width: `${(a.n / max) * 100}%` }} /></div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {provas.map((p, k) => (
                    <span key={k} className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-zinc-300" title={p.rotulo}>
                      {mostrarDisc ? `${p.disc} · ${p.rotulo}` : p.rotulo}{p.n > 1 && <b className="ml-1 text-white">×{p.n}</b>}
                    </span>
                  ))}
                </div>
              </div>
              <span className="shrink-0 text-right">
                <b className="block font-display text-2xl leading-none">{a.n}</b>
                <span className="text-[10px] tracking-wider text-zinc-400 uppercase">{a.n === 1 ? 'questão' : 'questões'}</span>
              </span>
            </div>
            <div className="mt-2 flex justify-end">
              <Link to={treinar} className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold hover:bg-white/20"><Play className="size-3" /> Treinar este assunto</Link>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

const semestreDe = (t: string) => t.match(/20\d\d\.[12]/)?.[0] ?? ''
