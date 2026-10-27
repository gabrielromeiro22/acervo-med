import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BarChart3, BookOpen, CalendarRange, ChevronRight, CircleHelp, ClipboardList, FileText, FolderOpen, Layers, Moon, NotebookPen, Sun, Sunrise, Syringe } from 'lucide-react'
import { Agenda } from '../components/Agenda'
import { SubjectModal } from '../components/SubjectModal'
import { pct, sortDisc, uniq } from '../lib/format'
import { setState, useFlashcards, useMaterials, useQuestions, useStore } from '../lib/store'

function greeting() {
  const h = new Date().getHours()
  if (h < 12 && h >= 5) return { text: 'Bom dia', Icon: Sunrise }
  if (h < 18 && h >= 12) return { text: 'Boa tarde', Icon: Sun }
  return { text: 'Boa noite', Icon: Moon }
}

export default function Dashboard() {
  const questions = useQuestions()
  const cards = useFlashcards()
  const attempts = useStore((s) => s.attempts)
  const srs = useStore((s) => s.srs)
  const simulados = useStore((s) => s.simulados)
  const saved = useStore((s) => s.periodo)
  const [modal, setModal] = useState<string>()
  const [dicas, setDicas] = useState(false)
  const [editDrive, setEditDrive] = useState(false)
  const driveUrl = useStore((s) => s.driveUrl)
  const grade = useStore((s) => s.grade)
  const materials = useMaterials()

  const { text, Icon } = greeting()
  const due = cards.filter((c) => !srs[c.id] || srs[c.id].due <= Date.now()).length
  const open = simulados.find((s) => !s.finishedAt)
  const all = Object.values(attempts).flat()
  const right = all.filter((a) => a.correct).length

  const periodos = uniq(questions.map((q) => q.periodo)).sort((a, b) => a - b)
  const periodo = saved && periodos.includes(saved) ? saved : periodos[0]
  const doPeriodo = questions.filter((q) => q.periodo === periodo)
  const discs = uniq(doPeriodo.map((q) => q.disciplina)).sort(sortDisc)
  const tiles = uniq([...discs, ...grade.filter((m) => m.periodo === periodo).map((m) => m.nome)])
  const pill = 'inline-flex items-center gap-1.5 rounded-full border-2 border-bg px-3 py-1 text-xs font-bold uppercase transition hover:bg-bg hover:text-ink'

  const TRACKS = [
    { to: '/app/questoes', t: 'Banco de questões', d: `${questions.length} questões`, icon: ClipboardList, bg: 'from-[#f05a28] to-[#e8890c]' },
    { to: '/app/simulados', t: 'Simulados', d: open ? 'Um em andamento' : 'Cronometrados, com correção', icon: FileText, bg: 'from-[#1f9d6b] to-[#2dea96]' },
    { to: '/app/flashcards', t: 'Flashcards', d: `${due} para revisar hoje`, icon: Layers, bg: 'from-[#2d5be3] to-[#4aa3f0]' },
  ]
  const SHORTCUTS = [
    { to: '/app/minhas-provas', t: 'Minhas provas', icon: FileText, d: `${simulados.filter((s) => s.finishedAt).length} finalizadas` },
    { to: '/app/grade', t: 'Minha grade', icon: CalendarRange, d: 'Tópicos e presença' },
    { to: '/app/materiais', t: 'Materiais', icon: BookOpen, d: 'Resumos e checklists' },
    { to: '/app/estatisticas', t: 'Estatísticas', icon: BarChart3, d: all.length ? `${pct(right, all.length)}% de acerto` : 'Sem tentativas ainda' },
    { to: '/app/notas', t: 'Minhas notas', icon: NotebookPen, d: 'Anotações por questão' },
  ]

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <section className="card p-5 sm:p-6">
          <h1 className="mb-5 flex items-center justify-center gap-2 font-display text-2xl font-bold sm:text-3xl">
            <Icon className="size-6 text-warn" /> {text}!
          </h1>
          <Agenda />
        </section>

        <div className="grid gap-3">
          {TRACKS.map(({ to, t, d, icon: I, bg }) => (
            <Link key={t} to={to} className={`group flex items-center gap-4 rounded-2xl bg-gradient-to-r ${bg} p-5 text-white shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6)] transition hover:-translate-y-0.5`}>
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/15"><I className="size-5" /></span>
              <span className="min-w-0">
                <span className="block font-display text-xl font-bold leading-tight sm:text-2xl">{t}</span>
                <span className="block text-sm text-white/80">{d}</span>
              </span>
              <ChevronRight className="ml-auto size-5 shrink-0 transition group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </div>

      {open && (
        <Link to={`/app/simulados/${open.id}`} className="flex items-center justify-between rounded-2xl border border-accent/40 bg-accent/5 p-4">
          <span><b>Simulado em andamento:</b> <span className="text-mute">{open.nome}</span></span>
          <ArrowRight className="size-4 text-accent" />
        </Link>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_1.5fr]">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          {SHORTCUTS.map(({ to, t, d, icon: I }) => (
            <Link key={t} to={to} className="card group flex items-center gap-3 p-4 transition hover:border-accent/40">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/5"><I className="size-4 text-accent" /></span>
              <span className="min-w-0">
                <span className="block font-semibold">{t}</span>
                <span className="block truncate text-xs text-mute">{d}</span>
              </span>
              <ArrowRight className="ml-auto hidden size-4 shrink-0 text-mute transition group-hover:translate-x-0.5 group-hover:text-accent sm:block" />
            </Link>
          ))}
        </div>

        <section className="overflow-hidden rounded-2xl border-2 border-ink bg-bg">
          <div className="relative flex flex-wrap items-center gap-2 bg-ink px-4 py-2.5 text-bg">
            <p className="mr-auto flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em]">
              <Syringe className="size-4" /> {periodo ? `${periodo}º período` : 'Período'}
            </p>
            <button className={`${pill} ${dicas ? 'bg-bg text-ink' : ''}`} onClick={() => setDicas((d) => !d)}><CircleHelp className="size-4" /> Dicas</button>
            {driveUrl && !editDrive ? (
              <a href={driveUrl} target="_blank" rel="noreferrer" className={`${pill} px-2`} title="Abrir minha pasta do Drive"
                onContextMenu={(e) => { e.preventDefault(); setEditDrive(true) }}><FolderOpen className="size-4" /></a>
            ) : (
              <button className={`${pill} px-2`} onClick={() => setEditDrive((v) => !v)} title="Definir link da sua pasta do Drive"><FolderOpen className="size-4" /></button>
            )}
            <select className="rounded-full border-2 border-bg bg-transparent px-3 py-1 text-xs font-bold uppercase outline-none" value={periodo ?? ''}
              onChange={(e) => setState((s) => ({ ...s, periodo: Number(e.target.value) }))} aria-label="Escolher período">
              {periodos.map((p) => <option key={p} value={p} className="bg-panel text-ink">{p}º período</option>)}
            </select>
            {editDrive && (
              <form className="flex w-full gap-2 pt-2" onSubmit={(e) => {
                e.preventDefault()
                const v = String(new FormData(e.currentTarget).get('url') ?? '').trim()
                setState((s) => ({ ...s, driveUrl: /^https?:\/\//.test(v) ? v : undefined }))
                setEditDrive(false)
              }}>
                <input name="url" className="input flex-1" placeholder="https://drive.google.com/… (link da sua pasta; vazio remove)" defaultValue={driveUrl} autoFocus />
                <button className="btn-primary">Salvar</button>
              </form>
            )}
          </div>
          {dicas && (
            <ul className="space-y-1.5 border-b border-line bg-panel px-5 py-4 text-sm text-mute">
              <li>• Clique numa matéria para gerar o PDF, abrir os materiais ou fazer questões.</li>
              <li>• Matérias da sua <Link to="/app/grade" className="text-accent hover:underline">grade</Link> sem questões aparecem como indisponíveis.</li>
              <li>• Traga suas próprias questões em <Link to="/app/importar" className="text-accent hover:underline">Importar</Link> (CSV ou JSON).</li>
              <li>• Clique com o botão direito no ícone da pasta para trocar o link do Drive.</li>
            </ul>
          )}
          {!tiles.length ? (
            <p className="p-8 text-center text-sm text-mute">Nada cadastrado para este período.</p>
          ) : (
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              {tiles.map((d, i) => {
                const qs = doPeriodo.filter((q) => q.disciplina === d)
                const seen = qs.filter((q) => attempts[q.id]?.length).length
                const off = !qs.length && !materials.some((m) => m.disciplina === d)
                const lone = tiles.length % 2 === 1 && i === tiles.length - 1
                return (
                  <button key={d} onClick={() => setModal(d)}
                    className={`group flex min-h-28 items-center justify-between gap-3 rounded-2xl border-2 border-black p-5 text-left shadow-[inset_0_-24px_32px_-20px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 ${
                      off ? 'bg-gradient-to-b from-zinc-500 to-zinc-600 text-zinc-900' : 'bg-gradient-to-b from-white to-zinc-200 text-bg'
                    } ${lone ? 'sm:col-span-2 sm:mx-auto sm:w-[calc(50%-0.375rem)]' : ''}`}>
                    <span className="min-w-0">
                      <span className="block font-display text-2xl font-bold leading-tight sm:text-3xl">{d}</span>
                      <span className="mt-1 block text-xs font-medium opacity-70">{off ? 'Indisponível' : `${seen}/${qs.length} questões vistas`}</span>
                    </span>
                    <ChevronRight className="size-6 shrink-0 transition group-hover:translate-x-0.5" />
                  </button>
                )
              })}
            </div>
          )}
        </section>
      </div>
      {modal && <SubjectModal disciplina={modal} periodo={periodo} onClose={() => setModal(undefined)} />}
    </div>
  )
}
