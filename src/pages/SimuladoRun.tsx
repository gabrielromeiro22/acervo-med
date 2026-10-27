import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Check, CircleCheck, CircleMinus, CircleX, Clock, Download, FileText, Flag, Home, ListChecks, Pencil, RotateCcw, ScanLine, Target, TriangleAlert, X } from 'lucide-react'
import { Aviso } from '../components/Aviso'
import { Comentario } from '../components/Comentario'
import { Rabiscos } from '../components/Rabiscos'
import { RichText } from '../components/RichText'
import { QuestionCard } from '../components/QuestionCard'
import { TreinoModal } from '../components/TreinoModal'
import { Empty } from '../components/ui'
import type { Question } from '../data/types'
import { LETTERS, fmtTime, textoParaIA } from '../lib/format'
import { baixarTexto, relatorioTxt } from '../lib/relatorio'
import { lerCaderno } from '../lib/correcao'
import { recordAttempt, redoSimulado, setState, useQuestions, useStore, type Simulado } from '../lib/store'

export default function SimuladoRun() {
  const { id = '' } = useParams()
  return <Run key={id} id={id} />
}

function Run({ id }: { id: string }) {
  const sim = useStore((s) => s.simulados.find((x) => x.id === id))
  const questions = useQuestions()
  const navigate = useNavigate()
  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions])
  const [elapsed, setElapsed] = useState(sim?.elapsedSec ?? 0)
  const [pos, setPos] = useState(0)
  const [pausado, setPausado] = useState(false)
  const [rabiscando, setRabiscando] = useState(false)
  const [aviso, setAviso] = useState<'anular' | 'reiniciar' | 'finalizar'>()
  // alternativa escolhida e ainda não confirmada (gabarito "depois de responder")
  const [sel, setSel] = useState<{ qid: string; i: number }>()
  const finished = !!sim?.finishedAt
  const modo = sim?.gabarito ?? 'final'
  const qid = sim?.questionIds[pos]
  const respondida = !!sim && !!qid && (sim.answers[qid] !== undefined || !!sim.anuladas?.includes(qid))
  // Prova feita no papel: sem cronômetro, só o lançamento das respostas.
  // "Pausar o timer na resposta comentada": parado enquanto o comentário da questão respondida está aberto.
  const paused = finished || !!sim?.papel || pausado || (modo === 'depois' && respondida && sim?.pausaComentario !== false)

  const patch = useCallback((p: Partial<Simulado>) => {
    setState((s) => ({ ...s, simulados: s.simulados.map((x) => (x.id === id ? { ...x, ...p } : x)) }))
  }, [id])

  const finish = useCallback((total: number) => {
    if (!sim || sim.finishedAt) return
    const answered = sim.questionIds.filter((x) => sim.answers[x] !== undefined && !sim.anuladas?.includes(x))
    const ms = answered.length ? (total * 1000) / answered.length : 0
    // Treino não entra nas estatísticas; questão anulada também não.
    if (!sim.treino) {
      for (const x of answered) {
        const q = byId.get(x)
        if (q) recordAttempt(q, sim.answers[x], ms)
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
  const faltam = ids.filter((x) => sim.answers[x] === undefined && !sim.anuladas?.includes(x)).length
  const left = sim.durationSec ? sim.durationSec - elapsed : 0
  const answer = (i: number) => patch({ answers: { ...sim.answers, [ids[pos]]: i }, elapsedSec: elapsed })
  const anulada = !!q && !!sim.anuladas?.includes(q.id)
  const reveal = modo === 'agora' || (modo === 'depois' && respondida)
  const travada = reveal || anulada
  const escolhida = q ? (sel?.qid === q.id ? sel.i : sim.answers[q.id]) : undefined
  const riscadas = (q && sim.riscadas?.[q.id]) || []
  const marcada = !!q && !!sim.marcadas?.includes(q.id)
  const ultima = pos >= ids.length - 1
  const ir = (i: number) => { setPos(i); setSel(undefined); setRabiscando(false); window.scrollTo({ top: 0 }) }
  const escolher = (i: number) => {
    if (!q || travada || riscadas.includes(i)) return
    if (modo === 'depois') setSel(escolhida === i && sel ? undefined : { qid: q.id, i })
    else answer(i)
  }
  const riscar = (i: number) => {
    if (!q || travada) return
    const r = riscadas.includes(i) ? riscadas.filter((x) => x !== i) : [...riscadas, i]
    patch({ riscadas: { ...sim.riscadas, [q.id]: r } })
    if (sel?.i === i) setSel(undefined)
  }
  const certa = q && sim.answers[q.id] === q.correta
  const copiar = () => q && navigator.clipboard?.writeText(textoParaIA(q, reveal)).then(() => toast.success('Questão copiada'), () => toast.error('Não foi possível copiar'))
  const pill = 'inline-flex items-center gap-1.5 rounded-full border-2 border-white/80 px-3 py-1.5 text-sm font-semibold transition hover:bg-white/10'
  const hms = (t: number) => { const v = Math.max(0, t); return [Math.floor(v / 3600), Math.floor((v % 3600) / 60), v % 60].map((n) => String(n).padStart(2, '0')).join(':') }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
        <div className="flex gap-1.5 sm:gap-2">
          <button className={pill} onClick={() => navigate('/app')} aria-label="Início"><Home className="size-4" /> <span className="hidden sm:inline">Início</span></button>
          <button className={pill} onClick={() => setAviso('reiniciar')} aria-label="Reiniciar"><RotateCcw className="size-4" /> <span className="hidden sm:inline">Reiniciar</span></button>
        </div>
        <span className="rounded-full bg-[#c80e58] px-4 py-1 font-extrabold tabular-nums">{pos + 1}/{ids.length}</span>
        <div className="flex items-center justify-end gap-2 sm:gap-3">
          <span className={`inline-flex items-center gap-1.5 font-mono text-sm font-bold tabular-nums sm:text-lg ${pausado ? 'text-warn' : ''}`}>
            <Clock className="hidden size-5 text-red-500 sm:block" /> {hms(sim.durationSec ? left : elapsed)}
          </span>
          <button role="switch" aria-checked={!pausado} aria-label={pausado ? 'Retomar' : 'Pausar'} onClick={() => setPausado(!pausado)}
            className={`relative h-7 w-12 shrink-0 rounded-full border-2 border-white/70 transition sm:w-14 ${pausado ? 'bg-zinc-700' : 'bg-zinc-900'}`}>
            <i className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${pausado ? 'left-0.5' : 'left-5 sm:left-7'}`} />
          </button>
        </div>
      </div>

      <div className="mb-8 flex flex-wrap justify-center gap-2">
        {ids.map((x, i) => {
          const a = sim.answers[x], c = byId.get(x)?.correta, an = sim.anuladas?.includes(x)
          const tom = i === pos ? 'border-[#c80e58] bg-[#c80e58] text-white'
            : an ? 'border-zinc-500 bg-zinc-600 text-white'
              : a === undefined ? 'border-white/50 text-ink'
                : modo === 'final' ? 'border-indigo-500 bg-indigo-600 text-white'
                  : a === c ? 'border-green-600 bg-green-600 text-white' : 'border-red-600 bg-red-600 text-white'
          return (
            <button key={x} onClick={() => ir(i)} className={`relative grid size-9 place-items-center rounded-full border-2 text-sm font-bold tabular-nums transition ${tom}`}>
              {i + 1}
              {sim.marcadas?.includes(x) && <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full border-2 border-bg bg-warn" />}
            </button>
          )
        })}
      </div>

      {!q ? <Empty>Esta questão não está mais no acervo (talvez tenha sido removida da importação).</Empty> : (
        <Rabiscos key={q.id} prova={sim.id} questao={q.id} ativo={rabiscando} onSair={() => setRabiscando(false)}>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="font-display text-2xl font-bold">Questão {pos + 1}</h2>
            {sim.mostrarAssunto !== false && (
              <span className="max-w-xs truncate rounded-full border-2 border-white/60 px-3 py-0.5 text-xs font-extrabold tracking-wider uppercase" title={`${q.materia ?? ''} · ${q.tema}`}>{q.tema}</span>
            )}
            <span className="ml-auto flex flex-wrap gap-2">
              <button className={`${pill} ${anulada ? 'border-zinc-400 bg-zinc-600' : ''}`} onClick={() => anulada ? patch({ anuladas: sim.anuladas!.filter((x) => x !== q.id) }) : setAviso('anular')}>
                <CircleX className="size-4" /> {anulada ? 'Anulada' : 'Anular'}
              </button>
              <button className={`${pill} ${marcada ? 'border-warn bg-warn text-bg' : ''}`}
                onClick={() => patch({ marcadas: marcada ? sim.marcadas!.filter((x) => x !== q.id) : [...(sim.marcadas ?? []), q.id] })}>
                <Flag className={`size-4 ${marcada ? 'fill-bg' : ''}`} /> Marcar
              </button>
              <button className={`${pill} ${rabiscando ? 'border-lime-300 bg-lime-300 text-bg' : ''}`} onClick={() => setRabiscando(!rabiscando)}>
                <Pencil className="size-4" /> {rabiscando ? 'Sair' : 'Rabiscar'}
              </button>
              <Link to={`/app/notas?qid=${q.id}`} className={`${pill} px-2`} title="Reportar problema ou anotar" aria-label="Reportar problema"><TriangleAlert className="size-4" /></Link>
            </span>
          </div>

          <div className="text-[17px] leading-relaxed"><RichText text={q.enunciado} /></div>
          {q.arquivo && (
            <a href={`https://drive.google.com/file/d/${q.arquivo}/view`} target="_blank" rel="noopener"
              className={`mt-3 inline-flex items-center gap-1.5 text-xs font-semibold hover:underline ${q.imagem ? 'text-warn' : 'text-mute'}`}>
              <FileText className="size-3.5" /> {q.imagem ? 'Esta questão tem imagem: ver no PDF original' : 'Ver PDF original'}
            </a>
          )}

          {anulada && <p className="mt-5 rounded-xl border border-zinc-500 bg-zinc-800 px-4 py-2 text-sm text-zinc-300">Questão anulada: conta como acerto na nota. Toque em "Anulada" para desfazer.</p>}

          <ol className="mt-6 space-y-3">
            {q.alternativas.map((alt, i) => {
              const riscada = riscadas.includes(i) && !reveal
              const ok = reveal && i === q.correta, errada = reveal && i === escolhida && i !== q.correta
              const tom = ok ? 'border-green-500 ring-2 ring-green-500/60'
                : errada ? 'border-red-500 ring-2 ring-red-500/60'
                  : !reveal && escolhida === i ? 'border-violet-400 ring-2 ring-violet-400/50'
                    : 'border-[#2b3170]'
              return (
                <li key={i}>
                  <div onClick={() => escolher(i)} role="button" aria-pressed={escolhida === i}
                    className={`flex items-start gap-3 rounded-2xl border-2 bg-gradient-to-b from-[#1b2052] to-[#11153a] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition ${tom} ${travada || riscada ? 'cursor-default' : 'cursor-pointer hover:border-[#4a52a8]'} ${reveal && !ok && !errada ? 'opacity-45' : ''}`}>
                    <span className="pt-0.5 font-extrabold text-[#e0156b]">{LETTERS[i]})</span>
                    <span className={`flex-1 pt-0.5 text-[15.5px] leading-relaxed ${riscada ? 'line-through opacity-40' : ''}`}><RichText text={alt} /></span>
                    {modo === 'depois' && !travada && sel?.qid === q.id && sel.i === i && (
                      <button onClick={(e) => { e.stopPropagation(); answer(i); setSel(undefined) }} aria-label="Confirmar resposta" title="Confirmar resposta"
                        className="grid size-10 shrink-0 place-items-center rounded-full bg-green-500 text-white shadow-[0_3px_0_#14532d] transition hover:brightness-110"><Check className="size-5" /></button>
                    )}
                    {!travada && (
                      <button onClick={(e) => { e.stopPropagation(); riscar(i) }} aria-label={riscada ? 'Desfazer risco' : 'Riscar alternativa'}
                        className={`grid size-10 shrink-0 place-items-center rounded-full transition ${riscada ? 'bg-zinc-500 text-white' : 'bg-zinc-300 text-zinc-800 hover:bg-white'}`}><X className="size-5" /></button>
                    )}
                    {ok && <span className="grid size-10 shrink-0 place-items-center rounded-full bg-green-500 text-white"><Check className="size-5" /></span>}
                    {errada && <span className="grid size-10 shrink-0 place-items-center rounded-full bg-red-500 text-white"><X className="size-5" /></span>}
                  </div>
                </li>
              )
            })}
          </ol>

          {modo === 'depois' && respondida && !anulada && (
            <div className={`mt-6 flex flex-wrap items-center gap-3 rounded-2xl p-4 ${certa ? 'bg-green-100 text-green-900' : 'bg-rose-100 text-rose-900'}`}>
              <span className="grid size-10 place-items-center rounded-full border-2 border-current">{certa ? <Check className="size-5" /> : <X className="size-5" />}</span>
              <span className="min-w-0 flex-1">
                <b className="block text-lg">{certa ? 'Boa, doutor(a)!' : 'Cuidado, doutor(a)…'}</b>
                <small className="font-semibold">A resposta correta é a {LETTERS[q.correta]}</small>
              </span>
              <button className="btn bg-[#c80e58] text-white shadow-[0_3px_0_#7a0836]" onClick={() => ultima ? setAviso('finalizar') : ir(pos + 1)}>
                {ultima ? 'Ver resultado' : 'Próxima questão'} <ArrowRight className="size-4" />
              </button>
            </div>
          )}
          {reveal && <Comentario q={q} acertou={modo === 'depois' ? !!certa : undefined} onCopiar={copiar} onReportar={() => navigate(`/app/notas?qid=${q.id}`)} />}
        </Rabiscos>
      )}

      <div className="mt-8 flex items-center justify-between gap-3">
        <button className="inline-flex items-center gap-1.5 rounded-full bg-[#141a3a] px-4 py-2 text-sm font-semibold text-zinc-300 disabled:opacity-40" disabled={pos === 0} onClick={() => ir(pos - 1)}>
          <ArrowLeft className="size-4" /> Anterior
        </button>
        {ultima ? (
          <button className="rounded-xl bg-green-500 px-8 py-3 font-bold text-bg shadow-[0_3px_0_#14532d] transition hover:brightness-110" onClick={() => setAviso('finalizar')}>Finalizar Exame</button>
        ) : (
          <button className="inline-flex items-center gap-1.5 rounded-full bg-[#141a3a] px-4 py-2 text-sm font-semibold text-zinc-300" onClick={() => ir(pos + 1)}>
            Próxima <ArrowRight className="size-4" />
          </button>
        )}
      </div>

      {aviso === 'anular' && q && (
        <Aviso titulo="Anular esta questão?" acao="Anular questão" onFechar={() => setAviso(undefined)}
          onConfirmar={() => { patch({ anuladas: [...(sim.anuladas ?? []), q.id] }); setSel(undefined); setAviso(undefined) }}>
          <div className="rounded-xl border-[3px] border-black bg-amber-50 p-4 shadow-[4px_4px_0_#000]">
            <p className="mb-2 text-sm font-extrabold tracking-[0.18em] uppercase">Quando faz sentido anular?</p>
            <ul className="list-disc space-y-1 pl-5 text-[15px]">
              <li>O assunto não vai cair na sua prova</li>
              <li>O gabarito oficial está errado</li>
              <li>A questão veio com problema (texto ou imagem faltando)</li>
            </ul>
          </div>
          <p className="mt-3 text-sm text-zinc-600 italic">A questão anulada conta como acerto na nota final da prova e não entra nas suas estatísticas. Dá para desfazer depois.</p>
        </Aviso>
      )}
      {aviso === 'reiniciar' && (
        <Aviso titulo="Reiniciar prova?" acao="Reiniciar" onFechar={() => setAviso(undefined)}
          onConfirmar={() => { patch({ answers: {}, riscadas: {}, marcadas: [], anuladas: [], elapsedSec: 0 }); setElapsed(0); setSel(undefined); setAviso(undefined); ir(0) }}>
          <p className="text-[15px] text-zinc-700">Você vai recomeçar do zero. Respostas, marcações, riscos e anulações atuais serão apagados.</p>
        </Aviso>
      )}
      {aviso === 'finalizar' && (
        <Aviso titulo="Finalizar prova?" acao="Finalizar" onFechar={() => setAviso(undefined)} onConfirmar={() => { setAviso(undefined); finish(elapsed) }}>
          <p className="text-[15px] text-zinc-700">{faltam ? `Ainda há ${faltam} questão(ões) sem resposta. Elas contam como erro.` : 'Todas as questões foram respondidas.'}</p>
        </Aviso>
      )}
    </div>
  )
}

type Status = 'certa' | 'errada' | 'branco' | 'anulada'

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
    const status: Status = sim.anuladas?.includes(qid) ? 'anulada' : a === undefined ? 'branco' : a === q?.correta ? 'certa' : 'errada'
    return { qid, n: i + 1, q, a, status }
  })
  const count = (s: Status) => rows.filter((r) => r.status === s).length
  const total = rows.length
  // anulada conta como acerto; em branco conta como erro
  const nota = total ? ((count('certa') + count('anulada')) / total) * 100 : 0
  const erros = count('errada') + count('branco')
  const notRight = rows.filter((r) => r.status === 'errada' || r.status === 'branco').map((r) => r.qid)
  const [treino, setTreino] = useState(false)
  const redo = (ids: string[], suffix: string, isTreino = false) => navigate(`/app/simulados/${redoSimulado(sim, ids, suffix, isTreino)}`)

  const report = () => baixarTexto(`Relatorio_${sim.nome}`, relatorioTxt(sim, byId))

  const TILES = [
    { label: 'Acertos', value: count('certa'), icon: Target, bg: 'from-[#2f9e6e] to-[#1f7a55]' },
    { label: 'Erros', value: erros, icon: CircleX, bg: 'from-[#e0475b] to-[#b8283f]' },
    { label: 'Tempo', value: fmtTime(sim.elapsedSec), icon: Clock, bg: 'from-[#3f74f0] to-[#2a4fd0]' },
    { label: 'Anuladas', value: count('anulada'), icon: CircleMinus, bg: 'from-[#5b6475] to-[#3b4250]' },
  ]
  const TABS = [
    { v: '' as const, label: 'Todas', n: total, icon: ListChecks },
    { v: 'certa' as const, label: 'Acertos', n: count('certa'), icon: Check },
    { v: 'errada' as const, label: 'Erros', n: erros, icon: X },
    { v: 'anulada' as const, label: 'Anuladas', n: count('anulada'), icon: CircleMinus },
  ]
  const BADGE = {
    certa: <span className="chip border-accent/40 bg-accent/15 font-semibold text-accent"><CircleCheck className="size-3.5" /> Correta</span>,
    errada: <span className="chip border-danger/40 bg-danger/15 font-semibold text-danger"><CircleX className="size-3.5" /> Errada</span>,
    branco: <span className="chip font-semibold"><CircleMinus className="size-3.5" /> Em branco</span>,
    anulada: <span className="chip border-zinc-500 bg-zinc-700 font-semibold text-zinc-200"><CircleMinus className="size-3.5" /> Anulada</span>,
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
        {rows.filter((r) => !filter || r.status === filter || (filter === 'errada' && r.status === 'branco')).map((r) => r.q ? (
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
  // caderno do tablet: lê as bolinhas pintadas do PDF respondido; as duvidosas ficam em destaque para conferir
  const [duvidas, setDuvidas] = useState<Set<string>>(new Set())
  const [lendo, setLendo] = useState(false)
  const enviar = async (f?: File) => {
    if (!f || !sim.layout) return
    setLendo(true)
    try {
      const { leituras, aviso } = await lerCaderno(f, sim.layout, sim.paginas)
      const novas: Record<string, number> = {}, d = new Set<string>(), rever: string[] = []
      leituras.forEach((l, i) => {
        const qid = sim.questionIds[i]
        if (l.resposta !== undefined) novas[qid] = l.resposta
        if (l.duvida || l.resposta === undefined) d.add(qid)
        if (l.rever) rever.push(qid)
      })
      setAnswers(novas); setDuvidas(d)
      setState((s) => ({ ...s, simulados: s.simulados.map((x) => (x.id === sim.id ? { ...x, marcadas: rever } : x)) }))
      if (aviso) toast.warning(aviso)
      toast.success(`${Object.keys(novas).length} de ${sim.questionIds.length} respostas lidas. Confira as destacadas.`)
    } catch (e) {
      console.error(e); toast.error('Não consegui ler esse PDF.')
    } finally { setLendo(false) }
  }
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
      <p className="mb-6 text-sm text-mute">{sim.formato === 'tablet' ? 'Envie o caderno respondido no tablet: as bolinhas pintadas viram as respostas. Depois confira e corrija.' : 'Lance as respostas da sua folha. Questões sem marcação contam como em branco.'}</p>
      {sim.formato === 'tablet' && sim.layout && (
        <label className={`mb-6 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-cyan-300/60 bg-cyan-300/5 p-6 font-semibold text-cyan-200 hover:bg-cyan-300/10 ${lendo ? 'pointer-events-none opacity-60' : ''}`}>
          <ScanLine className="size-5" /> {lendo ? 'Lendo o PDF…' : 'Enviar o PDF respondido'}
          <input type="file" accept="application/pdf" className="hidden" onChange={(e) => enviar(e.target.files?.[0])} />
        </label>
      )}

      <div className="card divide-y divide-line">
        {sim.questionIds.map((qid, i) => {
          const q = byId.get(qid)
          return (
            <div key={qid} className={`flex flex-wrap items-center gap-2 px-4 py-2.5 ${duvidas.has(qid) ? 'bg-warn/10' : ''}`}>
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
