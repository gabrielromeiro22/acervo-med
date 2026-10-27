import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowUp, Check, Eye, GripVertical, Play, RotateCcw, Shuffle, Tag, Trash2, X } from 'lucide-react'
import type { Question } from '../data/types'
import { assuntoDe, shuffle } from '../lib/format'
import { createSimulado, useStore } from '../lib/store'

interface Assunto { nome: string; qs: Question[]; ok: number; err: number; faltam: Question[] }
type Modo = 'faltam' | 'todas'
interface Escolha { nome: string; modo: Modo }

const semestre = (q: Question) => q.prova?.match(/20\d\d\.[12]/)?.[0] ?? ''
const ordem = (a: Question, b: Question) => semestre(a).localeCompare(semestre(b)) || (a.prova ?? '').localeCompare(b.prova ?? '') || (a.numero ?? 0) - (b.numero ?? 0)
const dois = (n: number) => String(n).padStart(2, '0')

// Questões por assunto: escolhe os assuntos da disciplina, monta "Minha prova" na ordem desejada e inicia.
// O progresso de cada assunto vem da última tentativa de cada questão (certa, errada ou ainda não feita).
export function AssuntosModal({ disciplina, periodo, qs, onClose }: { disciplina: string; periodo?: number; qs: Question[]; onClose: () => void }) {
  const navigate = useNavigate()
  const attempts = useStore((s) => s.attempts)
  const [prova, setProva] = useState<Escolha[]>([])
  const [concluido, setConcluido] = useState<Assunto>()
  const [arrastando, setArrastando] = useState<number>()
  const [aleatoria, setAleatoria] = useState(false)
  const [mostrar, setMostrar] = useState(true)

  const assuntos = useMemo(() => {
    const m = new Map<string, Question[]>()
    for (const q of qs) { const a = assuntoDe(q); if (a) m.set(a, [...(m.get(a) ?? []), q]) }
    return [...m].map(([nome, xs]): Assunto => {
      const ult = (q: Question) => { const xs = attempts[q.id]; return xs?.[xs.length - 1] }
      return { nome, qs: xs.sort(ordem), ok: xs.filter((q) => ult(q)?.correct).length, err: xs.filter((q) => ult(q) && !ult(q)!.correct).length, faltam: xs.filter((q) => !ult(q)) }
    }).sort((a, b) => b.qs.length - a.qs.length || a.nome.localeCompare(b.nome, 'pt'))
  }, [qs, attempts])
  const byNome = new Map(assuntos.map((a) => [a.nome, a]))
  const vao = (e: Escolha) => { const a = byNome.get(e.nome)!; return e.modo === 'todas' ? a.qs : a.faltam }
  const total = prova.reduce((n, e) => n + vao(e).length, 0)
  const livres = assuntos.filter((a) => !prova.some((e) => e.nome === a.nome))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (concluido ? setConcluido(undefined) : onClose())
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, concluido])

  const adiciona = (a: Assunto, modo?: Modo) => {
    if (!modo && !a.faltam.length) return setConcluido(a)
    setProva((p) => [...p, { nome: a.nome, modo: modo ?? (a.faltam.length < a.qs.length ? 'faltam' : 'todas') }])
  }
  const todos = () => setProva((p) => [...p, ...livres.filter((a) => a.faltam.length).map((a): Escolha => ({ nome: a.nome, modo: a.faltam.length < a.qs.length ? 'faltam' : 'todas' }))])
  const move = (de: number, para: number) => setProva((p) => { const n = [...p]; const [x] = n.splice(de, 1); n.splice(para, 0, x); return n })
  const modo = (i: number, m: Modo) => setProva((p) => p.map((e, k) => (k === i ? { ...e, modo: m } : e)))

  const iniciar = () => {
    const sel = prova.filter((e) => vao(e).length)
    const ids = sel.flatMap((e) => { const xs = vao(e).map((q) => q.id); return aleatoria ? shuffle(xs) : xs })
    const nome = `${disciplina} · ${sel.length === 1 ? sel[0].nome : `${sel.length} assuntos`}`
    navigate(`/app/simulados/${createSimulado(nome, ids, 0, false, false, { gabarito: 'depois', mostrarAssunto: mostrar, assuntos: sel.map((e) => ({ nome: e.nome, n: vao(e).length })) })}`)
  }
  // Rever: as questões já feitas do assunto, com gabarito e comentários abertos (não conta nas estatísticas)
  const rever = (a: Assunto) => {
    const ids = a.qs.filter((q) => attempts[q.id]?.length).map((q) => q.id)
    navigate(`/app/simulados/${createSimulado(`${disciplina} · ${a.nome} · revisão`, ids, 0, true, false, { gabarito: 'agora', assuntos: [{ nome: a.nome, n: ids.length }] })}`)
  }

  const barra = (a: Assunto, vai?: number) => {
    const n = a.qs.length
    return (
      <div className="flex h-5 min-w-0 flex-1 overflow-hidden rounded-md border-2 border-black bg-white text-[10px] font-extrabold">
        {a.ok > 0 && <span className="grid place-items-center bg-green-500 px-1.5 text-white" style={{ width: `${(a.ok / n) * 100}%` }}><span className="truncate">✓ {a.ok}</span></span>}
        {a.err > 0 && <span className="grid place-items-center bg-red-500 px-1.5 text-white" style={{ width: `${(a.err / n) * 100}%` }}><span className="truncate">✕ {a.err}</span></span>}
        {vai !== undefined
          ? <span className="grid flex-1 place-items-center truncate bg-[#c80e58] text-white">{vai} {vai === 1 ? 'vai' : 'vão'}</span>
          : a.faltam.length > 0 ? <span className="grid flex-1 place-items-center truncate text-zinc-700">{a.faltam.length} {a.faltam.length === 1 ? 'falta' : 'faltam'}</span>
          : <span className="grid flex-1 place-items-center bg-green-100 text-green-800"><Check className="size-3" /></span>}
      </div>
    )
  }
  const qtd = (n: number, cheio = n) => (
    <span className="flex w-14 shrink-0 items-center justify-center gap-px border-l-2 border-black font-display text-lg font-extrabold text-black" style={{ background: `color-mix(in oklab, #e11d48 ${25 + Math.min(1, cheio / 12) * 75}%, white)` }}>
      {n}<small className="text-[11px]">Q</small>
    </span>
  )
  const btn = 'inline-flex items-center gap-1 rounded-md border-2 border-black bg-white px-1.5 py-0.5 text-[10px] font-extrabold text-black uppercase'

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-2 backdrop-blur-md sm:p-4" onClick={onClose} role="dialog" aria-modal aria-label={`${disciplina}: questões por assunto`}>
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-[1.5rem] border-[3px] border-white bg-[#10131f]" onClick={(e) => e.stopPropagation()}>
        <header className="flex flex-wrap items-stretch border-b-2 border-white/15">
          <div className="bg-[#c80e58] px-5 py-3">
            <b className="block font-display text-2xl font-extrabold leading-tight">{disciplina}</b>
            <span className="inline-block rounded bg-[#f6d43a] px-1.5 text-[10px] font-extrabold tracking-wider text-black uppercase">Questões por assunto</span>
          </div>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-4 px-5 py-3">
            <span className="text-right text-xs text-zinc-400">
              <b className="block font-display text-base text-white">{qs.length} questões · {assuntos.length} assuntos</b>
              {periodo ? `${periodo}º período · ` : ''}provas anteriores
            </span>
            <button onClick={onClose} aria-label="Fechar" className="grid size-9 place-items-center rounded-full border-2 border-white bg-white text-black hover:bg-[#c80e58] hover:text-white"><X className="size-4" /></button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 md:grid-cols-2 md:overflow-hidden">
          <section className="flex min-h-0 flex-col">
            <h3 className="mb-2 flex items-center gap-2 border-l-4 border-[#c80e58] pl-2 text-xs font-extrabold tracking-[0.15em] uppercase">
              Assuntos <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] tabular-nums">{livres.length}/{assuntos.length}</span>
            </h3>
            <ul className="min-h-0 flex-1 space-y-2.5 rounded-2xl bg-black/30 p-2.5 md:overflow-y-auto">
              {assuntos.map((a, i) => {
                const dentro = prova.some((e) => e.nome === a.nome)
                return (
                  <li key={a.nome} className={dentro ? 'opacity-35' : ''}>
                    <div className="flex items-stretch overflow-hidden rounded-xl border-2 border-black bg-white text-black shadow-[3px_3px_0_#000]">
                      <span className="flex min-w-0 flex-1 items-center px-3 py-2 text-sm font-bold leading-snug"><span className="mr-1.5 text-zinc-400 tabular-nums">{dois(i + 1)})</span>{a.nome}</span>
                      {qtd(a.qs.length)}
                      <button disabled={dentro} onClick={() => adiciona(a)} aria-label={`Adicionar ${a.nome}`} className="grid w-9 shrink-0 place-items-center border-l-2 border-black hover:bg-[#c80e58] hover:text-white disabled:cursor-not-allowed">
                        {dentro ? <Check className="size-4" /> : <ArrowRight className="size-4" />}
                      </button>
                    </div>
                    {(a.ok + a.err > 0) && (
                      <div className="mx-1 mt-1 flex items-center gap-1.5">
                        {barra(a)}
                        <button className={btn} onClick={() => rever(a)}><Eye className="size-3" /> Rever</button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="flex min-h-0 flex-col">
            <h3 className="mb-2 flex items-center gap-2 border-l-4 border-[#c80e58] pl-2 text-xs font-extrabold tracking-[0.15em] uppercase">
              Minha prova <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] tabular-nums normal-case tracking-normal">{prova.length} assuntos · {total} questões</span>
              <span className="ml-auto flex gap-1.5">
                {prova.length > 0 && <button onClick={() => setProva([])} className="rounded-full border border-white/30 px-2.5 py-1 text-[10px] font-extrabold text-zinc-300 hover:text-white">Limpar</button>}
                <button onClick={todos} disabled={!livres.some((a) => a.faltam.length)} className="rounded-full bg-white px-3 py-1 text-[10px] font-extrabold text-black disabled:opacity-40">Todos</button>
              </span>
            </h3>
            <ol className="min-h-40 flex-1 space-y-2.5 rounded-2xl bg-black/30 p-2.5 md:overflow-y-auto">
              {!prova.length && <li className="grid h-full min-h-32 place-items-center text-center text-sm text-zinc-500">Toque na seta de um assunto para montar sua prova.<br />A ordem aqui é a ordem das questões.</li>}
              {prova.map((e, i) => {
                const a = byNome.get(e.nome)!
                const parcial = a.faltam.length > 0 && a.faltam.length < a.qs.length
                return (
                  <li key={e.nome} draggable onDragStart={() => setArrastando(i)} onDragEnd={() => setArrastando(undefined)}
                    onDragOver={(ev) => { ev.preventDefault(); if (arrastando !== undefined && arrastando !== i) { move(arrastando, i); setArrastando(i) } }}
                    className={arrastando === i ? 'opacity-50' : ''}>
                    <div className="flex items-stretch overflow-hidden rounded-xl border-2 border-black bg-white text-black shadow-[3px_3px_0_#000]">
                      <span className="grid w-9 shrink-0 place-items-center"><span className="grid size-6 place-items-center rounded-full bg-black text-[11px] font-extrabold text-white">{i + 1}</span></span>
                      <span className="flex min-w-0 flex-1 items-center py-2 pr-2 text-sm font-bold leading-snug">{a.nome}</span>
                      {qtd(vao(e).length, a.qs.length)}
                      <span className="flex shrink-0 flex-col border-l-2 border-black">
                        <button onClick={() => i && move(i, i - 1)} disabled={!i} aria-label="Subir" className="grid flex-1 place-items-center px-1.5 hover:bg-zinc-100 disabled:opacity-25"><ArrowUp className="size-3.5" /></button>
                        <span className="grid flex-1 cursor-grab place-items-center px-1.5 text-zinc-500"><GripVertical className="size-3.5" /></span>
                      </span>
                    </div>
                    <div className="mx-1 mt-1 flex items-center gap-1.5">
                      {barra(a, vao(e).length)}
                      {parcial && (
                        <span className="flex overflow-hidden rounded-md border-2 border-black text-[10px] font-extrabold uppercase">
                          {(['faltam', 'todas'] as const).map((m) => (
                            <button key={m} onClick={() => modo(i, m)} className={`px-1.5 py-0.5 ${e.modo === m ? 'bg-[#c80e58] text-white' : 'bg-white text-zinc-600'}`}>{m}</button>
                          ))}
                        </span>
                      )}
                      {!a.faltam.length && <span className={`${btn} bg-green-100 text-green-800`}><Check className="size-3" /> Refazer</span>}
                      <button className={`${btn} px-1`} onClick={() => setProva((p) => p.filter((_, k) => k !== i))} aria-label={`Tirar ${a.nome}`}><Trash2 className="size-3" /></button>
                    </div>
                  </li>
                )
              })}
            </ol>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button onClick={() => setAleatoria(!aleatoria)} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${aleatoria ? 'border-white bg-white text-black' : 'border-white/25 text-zinc-300'}`}><Shuffle className="size-3.5" /> Aleatorizar</button>
              <button onClick={() => setMostrar(!mostrar)} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${mostrar ? 'border-white bg-white text-black' : 'border-white/25 text-zinc-300'}`}><Tag className="size-3.5" /> Mostrar assunto</button>
              <span className="text-[11px] text-zinc-500">Cronômetro desativado em assuntos</span>
              <button onClick={iniciar} disabled={!total}
                className="ml-auto inline-flex items-center gap-2 rounded-full border-2 border-black bg-white py-1.5 pr-4 pl-1.5 text-sm font-extrabold text-black uppercase shadow-[3px_3px_0_#c80e58] disabled:opacity-40">
                <span className="grid size-7 place-items-center rounded-full bg-[#c80e58] text-white"><Play className="size-3.5 fill-white" /></span>
                Iniciar {prova.length} {prova.length === 1 ? 'assunto' : 'assuntos'} · {total}Q
              </button>
            </div>
          </section>
        </div>
      </div>

      {concluido && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4" onClick={(ev) => { ev.stopPropagation(); setConcluido(undefined) }}>
          <div className="w-full max-w-md rounded-2xl border-[3px] border-white bg-[#10131f] p-5" onClick={(ev) => ev.stopPropagation()}>
            <div className="mb-4 flex items-start gap-3">
              <span className="min-w-0 flex-1 border-l-4 border-[#c80e58] pl-2">
                <b className="block font-display text-xl">Você já concluiu este assunto</b>
                <span className="text-[10px] font-bold tracking-[0.15em] text-zinc-400 uppercase">Escolha como montar a prova</span>
              </span>
              <button onClick={() => setConcluido(undefined)} aria-label="Fechar" className="grid size-8 place-items-center rounded-full bg-white text-black"><X className="size-4" /></button>
            </div>
            <div className="mb-4 rounded-xl border-2 border-black bg-white p-2 text-black">
              <p className="mb-1.5 text-sm font-bold">{concluido.nome}</p>
              {barra(concluido)}
            </div>
            <div className="space-y-2.5">
              <button onClick={() => setConcluido(undefined)} className="flex w-full items-stretch overflow-hidden rounded-xl border-2 border-black bg-white text-left text-black shadow-[3px_3px_0_#000]">
                <span className="min-w-0 flex-1 px-3 py-2"><b className="block text-sm uppercase">Pular este assunto</b><small className="text-zinc-600">A prova segue só com os outros assuntos.</small></span>
                {qtd(total, 12)}
                <span className="grid w-10 place-items-center border-l-2 border-black"><ArrowRight className="size-4" /></span>
              </button>
              <button onClick={() => { adiciona(concluido, 'todas'); setConcluido(undefined) }} className="flex w-full items-stretch overflow-hidden rounded-xl border-2 border-black bg-white text-left text-black shadow-[3px_3px_0_#000]">
                <span className="min-w-0 flex-1 px-3 py-2"><b className="block text-sm uppercase">Refazer este assunto</b><small className="text-zinc-600">Ao finalizar, as respostas novas passam a valer.</small></span>
                {qtd(total + concluido.qs.length, 12)}
                <span className="grid w-10 place-items-center border-l-2 border-black"><RotateCcw className="size-4" /></span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
