import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, BookOpen, Check, Clock, Pause, Play, Settings, Shuffle, Tag, Target, Trash2 } from 'lucide-react'
import { Empty } from '../components/ui'
import { pct, shuffle } from '../lib/format'
import { createSimulado, setState, useQuestions, useStore, type Gabarito } from '../lib/store'

const GABARITO: { v: Gabarito; t: string; d: string; icon: typeof Check }[] = [
  { v: 'depois', t: 'Depois de responder', d: 'Gabarito e comentário aparecem assim que você confirma a alternativa.', icon: Check },
  { v: 'final', t: 'Só no final', d: 'Gabarito e comentários depois de fazer todas as questões.', icon: Target },
  { v: 'agora', t: 'Agora', d: 'Prova completa com gabarito e comentários visíveis, para estudar.', icon: BookOpen },
]

// Configuração antes de fazer uma prova anterior (gabarito, cronômetro e ordem), como no Meu Acervo.
export default function ProvaConfig() {
  const { arquivo = '' } = useParams()
  const navigate = useNavigate()
  const qs = useQuestions().filter((q) => q.arquivo === arquivo).sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0))
  const abertas = useStore((s) => s.simulados).filter((x) => x.arquivo === arquivo && !x.finishedAt && !x.papel)
  const [gab, setGab] = useState<Gabarito>('depois')
  const [timer, setTimer] = useState(true)
  const [dur, setDur] = useState<number>()
  const [aleatoria, setAleatoria] = useState(false)
  const [assunto, setAssunto] = useState(true)
  const [pausaComentario, setPausaComentario] = useState(true)

  if (!qs.length) return <Empty>Prova não encontrada. <Link to="/app" className="text-accent hover:underline">Voltar ao início</Link></Empty>
  const q0 = qs[0]
  const nome = [q0.disciplina, q0.prova].filter(Boolean).join(' · ')
  const min = dur ?? Math.max(10, Math.round((qs.length * 3) / 5) * 5)
  const voltar = `/app/provas?disciplina=${encodeURIComponent(q0.disciplina)}&periodo=${q0.periodo}`

  const iniciar = () => {
    const ids = qs.map((q) => q.id)
    navigate(`/app/simulados/${createSimulado(nome, aleatoria ? shuffle(ids) : ids, timer ? min * 60 : 0, false, false, { arquivo, gabarito: gab, mostrarAssunto: assunto, pausaComentario })}`)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <nav className="mb-3 text-sm text-mute"><Link to={voltar} className="hover:text-ink">← Provas anteriores de {q0.disciplina}</Link></nav>
      <div className="overflow-hidden rounded-[1.75rem] border-2 border-ink bg-[#14141c]">
        <div className="flex flex-col items-start gap-1.5 bg-gradient-to-br from-[#e0156b] to-[#c80e58] px-6 py-5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 text-[11px] font-bold uppercase tracking-wider"><Settings className="size-3.5" /> Configurar prova</span>
          <span className="mt-1 text-[11px] uppercase tracking-wider opacity-85">Você está configurando a prova:</span>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{nome}</h1>
          <p className="text-sm opacity-85">{qs.length} questões{q0.fonte ? ` · ${q0.fonte}` : ''}</p>
        </div>

        {abertas.length > 0 && (
          <Secao>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {abertas.map((s) => {
                const r = Object.keys(s.answers).length
                return (
                  <div key={s.id} className="flex flex-col gap-1.5 rounded-2xl border border-[#2a2f55] bg-[#0d1020] p-3">
                    <span className="text-[11px] text-[#8b8fb0]">PROVA EM ANDAMENTO</span>
                    <b>{r}/{s.questionIds.length} respondidas</b>
                    <span className="h-1.5 overflow-hidden rounded-full bg-white/10"><span className="block h-full bg-[#c80e58]" style={{ width: `${pct(r, s.questionIds.length)}%` }} /></span>
                    <span className="text-[11px] text-[#8b8fb0]">Iniciada em {new Date(s.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                    <span className="flex gap-1.5">
                      <button aria-label="Descartar" className="grid h-8 w-9 place-items-center rounded-lg bg-red-500"
                        onClick={() => setState((st) => ({ ...st, simulados: st.simulados.filter((x) => x.id !== s.id) }))}><Trash2 className="size-4" /></button>
                      <Link to={`/app/simulados/${s.id}`} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-cyan-300 text-sm font-bold text-cyan-950"><Play className="size-3.5" /> Continuar</Link>
                    </span>
                  </div>
                )
              })}
            </div>
          </Secao>
        )}

        <Secao titulo="Quando o gabarito e os comentários devem aparecer?" icon={<Check className="size-5" />}>
          <div className="grid gap-2.5 sm:grid-cols-3">
            {GABARITO.map(({ v, t, d, icon: I }) => (
              <button key={v} onClick={() => setGab(v)}
                className={`flex flex-col gap-1.5 rounded-2xl border p-3.5 text-left transition ${gab === v ? 'border-[#c80e58] bg-[#c80e58]' : 'border-white/10 bg-[#1c1c26] hover:border-white/25'}`}>
                <I className="size-5" />
                <b className="text-[13px] uppercase tracking-wide">{t}</b>
                <small className={`text-xs leading-snug ${gab === v ? 'text-pink-100' : 'text-zinc-400'}`}>{d}</small>
              </button>
            ))}
          </div>
        </Secao>

        <Secao titulo="Ajustes da prova" icon={<Settings className="size-5" />}>
          <div className="flex flex-col gap-0.5 rounded-2xl bg-[#1c1c26] p-1.5">
            <Linha icon={<Clock className="size-5" />} t="Usar cronômetro"><Chave on={timer} onClick={() => setTimer(!timer)} /></Linha>
            {timer && (
              <div className="mx-1.5 flex items-center gap-3 rounded-xl bg-[#121218] p-3 text-sm font-semibold">
                <span className="flex-1">Duração da prova<small className="block text-[11px] font-medium text-zinc-500">{qs.length} questões</small></span>
                <span className="flex items-center gap-2.5">
                  <button className="size-8 rounded-full bg-ink text-lg font-bold text-bg" onClick={() => setDur(Math.max(5, min - 5))} aria-label="Menos 5 minutos">−</button>
                  <b className="min-w-20 rounded-xl border border-zinc-700 bg-black px-3 py-1.5 text-center tabular-nums">{min} min</b>
                  <button className="size-8 rounded-full bg-ink text-lg font-bold text-bg" onClick={() => setDur(min + 5)} aria-label="Mais 5 minutos">+</button>
                </span>
              </div>
            )}
            {gab === 'depois' && <Linha icon={<Pause className="size-5" />} t="Pausar o timer na resposta comentada"><Chave on={pausaComentario} onClick={() => setPausaComentario(!pausaComentario)} /></Linha>}
            <Linha icon={<Tag className="size-5" />} t="Mostrar assunto de cada questão"><Chave on={assunto} onClick={() => setAssunto(!assunto)} /></Linha>
            <Linha icon={<Shuffle className="size-5" />} t="Aleatorizar a ordem das questões"><Chave on={aleatoria} onClick={() => setAleatoria(!aleatoria)} /></Linha>
          </div>
        </Secao>

        <button onClick={iniciar}
          className="relative mx-5 mb-5 flex w-[calc(100%-2.5rem)] items-center justify-center rounded-full bg-ink py-4 font-extrabold tracking-wider text-bg transition hover:brightness-90">
          INICIAR PROVA <span className="absolute right-2.5 grid size-9 place-items-center rounded-full bg-bg text-ink"><ArrowRight className="size-5" /></span>
        </button>
      </div>
    </div>
  )
}

function Secao({ titulo, icon, children }: { titulo?: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="border-t border-white/10 px-5 py-4 first:border-t-0">
      {titulo && <h2 className="mb-3.5 flex items-center gap-2.5 font-bold uppercase">{icon} {titulo}</h2>}
      {children}
    </div>
  )
}

function Linha({ icon, t, children }: { icon: ReactNode; t: string; children: ReactNode }) {
  return <div className="flex items-center gap-3 p-3 text-sm font-semibold">{icon}<span className="flex-1">{t}</span>{children}</div>
}

function Chave({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button role="switch" aria-checked={on} onClick={onClick} className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? 'bg-[#c80e58]' : 'bg-zinc-600'}`}>
      <i className={`absolute top-[3px] size-[18px] rounded-full bg-white transition-all ${on ? 'left-[23px]' : 'left-[3px]'}`} />
    </button>
  )
}
