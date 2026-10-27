import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarClock, ChevronRight, CircleHelp, FileText, Flame, FolderOpen, Hospital, Library, Moon, ScanLine, Settings, Stethoscope, Sun, Sunrise, Syringe, Timer, X } from 'lucide-react'
import { Agenda } from '../components/Agenda'
import { Icon3D } from '../components/Icon3D'
import { PdfViewer } from '../components/PdfViewer'
import { SubjectModal } from '../components/SubjectModal'
import { arvore, caminhoDe, limpa, pastaDaArea, pastaDoPeriodo, todos } from '../lib/acervo'
import { INTERNATO, pct, periodoLabel, sortDisc, uniq } from '../lib/format'
import { setState, useAcervoPronto, useArquivos, useFlashcards, useMaterials, useQuestions, useStore, type Arquivo } from '../lib/store'

function greeting() {
  const h = new Date().getHours()
  if (h < 12 && h >= 5) return { text: 'Bom dia', Icon: Sunrise }
  if (h < 18 && h >= 12) return { text: 'Boa tarde', Icon: Sun }
  return { text: 'Boa noite', Icon: Moon }
}

// Internato: sigla da área ('Internato · Clínica Médica' → 'CM')
const sigla = (d: string) => Object.keys(INTERNATO).find((k) => d === `Internato · ${INTERNATO[k]}`)

const FUNDOS = [['escuro', 'Escuro'], ['claro', 'Claro'], ['animado', 'Animado']] as const
const white = 'rounded-2xl border-2 border-black bg-gradient-to-b from-white to-zinc-200 text-bg shadow-[inset_0_-24px_32px_-20px_rgba(0,0,0,0.25)]'

export default function Dashboard() {
  const questions = useQuestions()
  const pronto = useAcervoPronto()
  const cards = useFlashcards()
  const materials = useMaterials()
  const attempts = useStore((s) => s.attempts)
  const srs = useStore((s) => s.srs)
  const simulados = useStore((s) => s.simulados)
  const agenda = useStore((s) => s.agenda)
  const grade = useStore((s) => s.grade)
  const saved = useStore((s) => s.periodo)
  const fundo = useStore((s) => s.fundo)
  const driveUrl = useStore((s) => s.driveUrl)
  const [modal, setModal] = useState<{ d: string; p?: number }>()
  const [dicas, setDicas] = useState(false)
  const [config, setConfig] = useState(false)
  const [editDrive, setEditDrive] = useState(false)
  const arquivos = useArquivos()
  const nome = useStore((s) => s.nome)
  const recentes = useStore((s) => s.recentes)
  const feitos = useStore((s) => s.feitos)
  const [pdf, setPdf] = useState<Arquivo>()

  const { text, Icon } = greeting()
  const due = cards.filter((c) => !srs[c.id] || srs[c.id].due <= Date.now()).length
  const all = Object.values(attempts).flat()
  const right = all.filter((a) => a.correct).length
  const fundoAtual = fundo === 'claro' || fundo === 'animado' ? fundo : 'escuro'

  const periodos = uniq(questions.map((q) => q.periodo)).sort((a, b) => a - b)
  // padrão: 1º período (o 0 é TPI/ENAMED)
  const periodo = saved !== undefined && periodos.includes(saved) ? saved : periodos.find((p) => p > 0) ?? periodos[0]
  const doPeriodo = questions.filter((q) => q.periodo === periodo)
  const discs = uniq(doPeriodo.map((q) => q.disciplina)).sort(sortDisc)
  const tiles = uniq([...discs, ...grade.filter((m) => m.periodo === periodo).map((m) => m.nome)])
  const pill = 'inline-flex items-center gap-1.5 rounded-full border-2 border-bg px-3 py-1 text-xs font-bold uppercase transition hover:bg-bg hover:text-ink'

  // Pendências: provas abertas, provas de papel para corrigir e eventos dos próximos 30 dias.
  const hoje = new Date().toLocaleDateString('sv-SE')
  const limite = new Date(Date.now() + 30 * 86_400_000).toLocaleDateString('sv-SE')
  const pendencias = [
    ...simulados.filter((s) => !s.finishedAt).map((s) => ({
      key: s.id, to: `/app/simulados/${s.id}`, t: s.nome, sub: `${s.questionIds.length} questões`,
      tag: s.papel ? 'Corrigir' : 'Em andamento', tone: s.papel ? 'bg-cyan-300 text-bg' : 'bg-ink text-bg', icon: s.papel ? ScanLine : Timer,
    })),
    ...agenda.filter((a) => !a.done && a.date >= hoje && a.date <= limite).sort((a, b) => a.date.localeCompare(b.date)).map((a) => ({
      key: a.id, to: '/app', t: a.title, sub: `${a.date.slice(8)}/${a.date.slice(5, 7)}${a.start ? `, ${a.start}` : ''}`,
      tag: a.date === hoje ? 'Hoje' : 'Pendente', tone: a.date === hoje ? 'bg-warn text-bg' : 'bg-ink text-bg', icon: CalendarClock,
    })),
  ]

  // Acervo do Drive: áreas de primeiro nível, PDFs recentes e os atalhos do período escolhido
  const byArq = new Map(arquivos.map((a) => [a.id, a]))
  const raiz = arvore(arquivos)
  const AREAS = [
    { nome: 'TPI', icon: Flame, bg: 'from-[#f0702a] via-[#e2463f] to-[#d8433f]' },
    { nome: 'ENAMED', icon: Stethoscope, bg: 'from-[#3c9a6c] via-[#46a07f] to-[#5aa38f]' },
    { nome: 'INTERNATO', icon: Hospital, bg: 'from-[#3a64d8] via-[#3c7ce0] to-[#4a8fe0]' },
  ].map((a) => ({ ...a, pasta: pastaDaArea(raiz, a.nome) }))
  const recentesPdf = recentes.map((id) => byArq.get(id)).filter((a): a is Arquivo => !!a).slice(0, 6)
  const perPasta = periodo !== undefined ? pastaDoPeriodo(raiz, periodo) : undefined
  const resumos = perPasta && [...perPasta.filhas.values()].find((k) => /RESUMOS/.test(k.nome))
  const assuntos = perPasta?.arquivos.find((a) => a.tipo === 'assuntos')

  const TRACKS = [
    { to: '/app/questoes', t: 'Banco de questões', d: `${questions.length} questões`, img: 'books', bg: 'from-[#ef4f23] to-[#e2761a]' },
    { to: '/app/simulados', t: 'Simulados', d: 'Monte sua prova por assunto', img: 'stopwatch', bg: 'from-[#1f8f68] to-[#3fa36f]' },
    { to: '/app/flashcards', t: 'Flashcards', d: `${due} para revisar hoje`, img: 'card_index', bg: 'from-[#2b55d9] to-[#3f8ae6]' },
  ]
  const SHORTCUTS: { to?: string; open?: Arquivo; t: string; img: string; d: string }[] = [
    { to: '/app/minhas-provas', t: 'Minhas provas', img: 'clipboard', d: `${simulados.filter((s) => s.finishedAt && !s.treino).length} finalizadas · ${feitos.length} PDFs feitos` },
    resumos
      ? { to: `/app/resumos?periodo=${periodo}`, t: `Resumos do ${periodoLabel(periodo!)}`, img: 'books', d: `${todos(resumos).length} arquivos` }
      : { to: '/app/notas', t: 'Minhas notas', img: 'memo', d: 'Anotações por questão' },
    assuntos
      ? { open: assuntos, t: 'Assuntos do período', img: 'bullseye', d: 'O que cai em cada prova' }
      : { to: '/app/acervo', t: 'Acervo', img: 'file_folder', d: 'Provas e resumos em PDF' },
    { to: '/app/grade', t: 'Minha grade', img: 'spiral_calendar', d: 'Tópicos e presença' },
  ]

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1.45fr_1fr_0.42fr]">
        <section className="relative rounded-3xl border border-fuchsia-400/15 bg-[#0c0b17]/95 p-5 shadow-[0_0_70px_-25px_rgba(192,38,211,0.55)] sm:p-6">
          <button className="absolute top-4 right-4 grid size-9 place-items-center rounded-full border border-line text-mute hover:bg-white/5 hover:text-ink"
            onClick={() => setConfig((c) => !c)} aria-label="Configurações" aria-expanded={config}>
            {config ? <X className="size-4" /> : <Settings className="size-4" />}
          </button>
          {config && (
            <div className="absolute top-14 right-4 z-20 w-72 rounded-2xl border border-line bg-panel-2 p-4 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.8)]">
              <p className="text-sm font-bold">Configurações</p>
              <p className="mb-3 text-xs text-mute">Personalize a saudação e o fundo da tela.</p>
              <label className="mb-3 block">
                <span className="label">Como te chamar</span>
                <input className="input" placeholder="Ex.: Dr Gabriel" defaultValue={nome}
                  onBlur={(e) => { const v = e.target.value.trim(); setState((s) => ({ ...s, nome: v || undefined })) }}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
              </label>
              <p className="label">Tema do fundo</p>
              <div className="grid grid-cols-3 gap-1.5">
                {FUNDOS.map(([v, label]) => (
                  <button key={v} onClick={() => setState((s) => ({ ...s, fundo: v }))}
                    className={`rounded-full border px-2 py-1.5 text-xs font-semibold transition ${fundoAtual === v ? 'border-ink bg-ink text-bg' : 'border-line text-mute hover:text-ink'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <h1 className="mb-5 flex items-center justify-center gap-2 font-display text-2xl font-bold sm:text-3xl">
            <Icon className="size-7 fill-warn text-warn" /> {text}{nome ? `, ${nome}` : ''}!
          </h1>
          <Agenda />
        </section>

        <div className="grid gap-3">
          {TRACKS.map(({ to, t, d, img, bg }) => (
            <Link key={t} to={to} className={`group flex items-center gap-4 rounded-2xl bg-gradient-to-r ${bg} p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_10px_30px_-14px_rgba(0,0,0,0.8)] transition hover:-translate-y-0.5`}>
              <span className="grid size-14 shrink-0 place-items-center rounded-full bg-white/15">
                <Icon3D name={img} className="size-11 drop-shadow-[0_6px_8px_rgba(0,0,0,0.35)]" />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-xl font-extrabold uppercase leading-tight tracking-tight sm:text-2xl">{t}</span>
                <span className="block text-sm text-white/80">{d}</span>
              </span>
              <ChevronRight className="ml-auto size-6 shrink-0 transition group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>

        <Link to="/app/estatisticas" className="group relative flex min-h-48 flex-col items-center justify-center gap-2 overflow-hidden rounded-3xl border border-line bg-gradient-to-b from-[#3a2a1e] via-[#16222c] to-[#0e1a33] p-4 text-center transition hover:-translate-y-0.5">
          <Icon3D name="bar_chart" className="size-20 drop-shadow-[0_10px_14px_rgba(0,0,0,0.5)]" />
          <span className="font-display text-4xl font-extrabold tabular-nums">{all.length ? `${pct(right, all.length)}%` : '—'}</span>
          <span className="text-xs text-mute">{all.length ? `de acerto em ${all.length} tentativas` : 'Resolva questões para ver seu desempenho'}</span>
          <span className="mt-2 rounded-full border border-line bg-black/60 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">Estatísticas</span>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {AREAS.map(({ nome: n, icon: I, bg, pasta }) => pasta && (
          // TPI e ENAMED abrem o menu (provas, materiais, questões); o Internato abre as áreas na grade de períodos
          <Link key={n} to={n === 'INTERNATO' ? '#periodo' : `/app/acervo?pasta=${encodeURIComponent(pasta.path)}`}
            onClick={(e) => {
              if (n === 'INTERNATO') { e.preventDefault(); setState((s) => ({ ...s, periodo: 9 })); document.getElementById('periodo')?.scrollIntoView({ behavior: 'smooth' }) }
              else { e.preventDefault(); setModal({ d: n === 'TPI' ? 'TPI' : 'ENAMED', p: 0 }) }
            }}
            className={`group flex items-center gap-3 rounded-2xl bg-gradient-to-r ${bg} p-4 text-white transition hover:-translate-y-0.5 hover:brightness-105`}>
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/20"><I className="size-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-xl font-extrabold leading-tight sm:text-2xl">{n}</span>
              <span className="block text-xs font-semibold opacity-85">{todos(pasta).length} arquivos</span>
            </span>
            <ChevronRight className="size-5 shrink-0 transition group-hover:translate-x-0.5" />
          </Link>
        ))}
        <Link to="/app/acervo" className="group flex items-center gap-3 rounded-2xl border border-[#3a2a20] bg-gradient-to-br from-[#3a2216] via-[#0b0b10] to-[#0d1530] p-4 transition hover:-translate-y-0.5">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/10"><Library className="size-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-xl font-extrabold leading-tight sm:text-2xl">Acervo</span>
            <span className="block text-xs font-semibold text-mute">{arquivos.length} arquivos · {feitos.length} feitos</span>
          </span>
          <ChevronRight className="size-5 shrink-0 transition group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.95fr_0.95fr_1.75fr]">
        <section className="flex min-h-80 flex-col overflow-hidden rounded-2xl border-2 border-ink bg-black">
          <div className="flex items-center justify-between bg-ink px-4 py-2.5 text-bg">
            <p className="text-xs font-bold uppercase tracking-[0.14em]">Continuar <span className="ml-1 font-semibold normal-case tracking-normal opacity-60">{pendencias.length + recentesPdf.length}</span></p>
            <Link to="/app/minhas-provas" aria-label="Ver provas"><ArrowRight className="size-4" /></Link>
          </div>
          {!pendencias.length && !recentesPdf.length ? (
            <p className="m-auto px-6 text-center text-sm text-mute">Nada pendente. Provas em andamento, eventos da agenda e os últimos PDFs abertos aparecem aqui.</p>
          ) : (
            <ul className="divide-y divide-line overflow-y-auto">
              {recentesPdf.map((a) => (
                <li key={a.id}>
                  <button onClick={() => setPdf(a)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink text-bg"><FileText className="size-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{limpa(a.nome)}</span>
                      <span className="block truncate text-[11px] uppercase text-mute">{caminhoDe(a)}</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${feitos.includes(a.id) ? 'bg-accent text-bg' : 'bg-ink text-bg'}`}>{feitos.includes(a.id) ? 'Feita' : 'PDF'}</span>
                  </button>
                </li>
              ))}
              {pendencias.map(({ key, to, t, sub, tag, tone, icon: I }) => (
                <li key={key}>
                  <Link to={to} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-warn text-bg"><I className="size-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{t}</span>
                      <span className="block truncate text-[11px] uppercase text-mute">{sub}</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${tone}`}>{tag}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          {SHORTCUTS.map(({ to, open, t, d, img }) => {
            const corpo = (
              <>
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-zinc-300/70"><Icon3D name={img} className="size-8" /></span>
                <span className="min-w-0">
                  <span className="block font-bold">{t}</span>
                  <span className="block truncate text-xs text-zinc-600">{d}</span>
                </span>
                <ArrowRight className="ml-auto hidden size-4 shrink-0 text-zinc-500 transition group-hover:translate-x-0.5 sm:block" />
              </>
            )
            const cls = `group flex items-center gap-3 p-4 text-left transition hover:-translate-y-0.5 ${white}`
            return open
              ? <button key={t} onClick={() => setPdf(open)} className={cls}>{corpo}</button>
              : <Link key={t} to={to!} className={cls}>{corpo}</Link>
          })}
        </div>

        <section id="periodo" className="scroll-mt-4 overflow-hidden rounded-2xl border-2 border-ink bg-black">
          <div className="relative flex flex-wrap items-center gap-2 bg-ink px-4 py-2.5 text-bg">
            <p className="mr-auto flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em]">
              <Syringe className="size-4" /> {periodo !== undefined ? periodoLabel(periodo) : 'Período'}
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
              {periodos.map((p) => <option key={p} value={p} className="bg-panel text-ink">{periodoLabel(p)}</option>)}
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
            <p className="p-8 text-center text-sm text-mute">{pronto ? 'Nada cadastrado para este período.' : 'Carregando o acervo…'}</p>
          ) : (
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              {tiles.map((d, i) => {
                const qs = doPeriodo.filter((q) => q.disciplina === d)
                const seen = qs.filter((q) => attempts[q.id]?.length).length
                const nProvas = new Set(qs.map((q) => q.arquivo).filter(Boolean)).size
                const off = !qs.length && !materials.some((m) => m.disciplina === d)
                const lone = tiles.length % 2 === 1 && i === tiles.length - 1
                return (
                  <button key={d} onClick={() => setModal({ d, p: periodo })}
                    className={`group flex min-h-32 items-center justify-between gap-3 p-5 text-left transition hover:-translate-y-0.5 ${
                      off ? 'rounded-2xl border-2 border-black bg-gradient-to-b from-zinc-500 to-zinc-600 text-zinc-900' : white
                    } ${lone ? 'sm:col-span-2 sm:mx-auto sm:w-[calc(50%-0.375rem)]' : ''}`}>
                    <span className="min-w-0">
                      {sigla(d) ? (
                        <><span className="block font-display text-3xl font-bold leading-tight">{sigla(d)}</span>
                          <span className="block text-sm font-semibold leading-tight opacity-80">{d.replace(/^Internato · /, '')}</span></>
                      ) : <span className="block font-display text-3xl font-bold leading-tight">{d}</span>}
                      <span className="mt-1 block text-xs font-medium opacity-70">{off ? 'Indisponível' : `${nProvas} provas · ${seen}/${qs.length} questões vistas`}</span>
                      {!off && <span className="mt-2 block h-1.5 w-40 max-w-full overflow-hidden rounded-full bg-black/10"><span className="block h-full rounded-full bg-[#b83fd6]" style={{ width: `${pct(seen, qs.length)}%` }} /></span>}
                    </span>
                    <ChevronRight className="size-6 shrink-0 transition group-hover:translate-x-0.5" />
                  </button>
                )
              })}
            </div>
          )}
        </section>
      </div>
      {pdf && <PdfViewer arquivo={pdf} onClose={() => setPdf(undefined)} />}
      {modal && <SubjectModal disciplina={modal.d} periodo={modal.p} onClose={() => setModal(undefined)} />}
    </div>
  )
}
