import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, Clock, FolderOpen, X } from 'lucide-react'
import { ArquivoRow } from '../components/ArquivoRow'
import { PdfViewer } from '../components/PdfViewer'
import { Empty } from '../components/ui'
import { arvore, etiquetas, limpa, pastaDaDisciplina, pastaEm, semestreDe } from '../lib/acervo'
import { pct, periodoLabel } from '../lib/format'
import { acertou, useArquivos, useQuestoesProva, useStore, type Arquivo, type Simulado } from '../lib/store'

const complemento = (nome: string, disc: string, rotulo: string) => {
  const sem = nome.match(/\(?\s*20\d\d\.[12]\s*(?:-\s*([^)]+))?\)?\s*(?:-\s*(.+))?$/)
  if (sem) {
    // o que já aparece em outra etiqueta sai: "S_alt" (Só gabarito), "ROT. 1 - A" e "N2" (rótulo da prova)
    const t = [sem[1], sem[2]].filter(Boolean).join(' · ').replace(/\s+/g, ' ').trim()
      .replace(/^(?:local_)?s_?\s?alt\s*\d*$|^alt$/i, '').replace(/^ROT\.?\s*\d\s*-\s*[AB]\s*-?\s*/i, '')
    return t && !rotulo.toLowerCase().includes(t.toLowerCase()) ? t : ''
  }
  // sem semestre: o nome todo, menos a disciplina ("Questões Repetidas - TPIs" → "Questões Repetidas")
  return nome.replace(new RegExp(`\\b${disc}s?\\b`, 'i'), '').replace(/^[\s\-–]+|[\s\-–]+$/g, '').trim()
}

// nota de uma tentativa: acertos sobre o total de questões (em branco conta como erro)
const notaDe = (s: Simulado, correta: (id: string) => number | undefined) =>
  pct(s.questionIds.filter((id) => acertou(s, id, correta(id))).length, s.questionIds.length)

// Provas anteriores de uma disciplina, uma por PDF de origem, como a grade de semestres do Meu Acervo.
export default function ProvasAnteriores() {
  const [params] = useSearchParams()
  const disciplina = params.get('disciplina') ?? ''
  const periodo = params.has('periodo') ? Number(params.get('periodo')) : undefined
  const questions = useQuestoesProva()
  const arquivos = useArquivos()
  const simulados = useStore((s) => s.simulados)
  const [open, setOpen] = useState<Arquivo>()

  const byArq = useMemo(() => new Map(arquivos.map((a) => [a.id, a])), [arquivos])
  const correta = useMemo(() => { const m = new Map(questions.map((q) => [q.id, q.correta])); return (id: string) => m.get(id) }, [questions])
  const qs = questions.filter((q) => q.disciplina === disciplina && (periodo === undefined || q.periodo === periodo))
  const raiz = arvore(arquivos)
  const dir = pastaDaDisciplina(raiz, arquivos, questions, disciplina, periodo)
  const pasta = dir ? pastaEm(raiz, dir) : undefined

  const provas = new Map<string, typeof qs>()
  for (const q of qs) if (q.arquivo) provas.set(q.arquivo, [...(provas.get(q.arquivo) ?? []), q])
  const daPasta = pasta?.arquivos ?? []
  const recursos = daPasta.filter((a) => a.tipo === 'recurso')
  // PDFs de prova da pasta que não viraram questões (escaneados, só imagem…)
  const semQuestoes = daPasta.filter((a) => a.tipo === 'prova' && !provas.has(a.id))
  const outros = daPasta.filter((a) => a.tipo !== 'prova' && a.tipo !== 'recurso')

  const cards = [...provas].map(([id, xs]) => {
    const a = byArq.get(id)
    const tentativas = simulados.filter((s) => s.arquivo === id)
    const feitas = tentativas.filter((s) => s.finishedAt && !s.treino)
    return {
      id, a, n: xs.length, sem: (a && semestreDe(a)) || xs[0].prova?.match(/20\d\d\.[12]/)?.[0] || '—',
      rotulo: xs[0].prova?.replace(/\s*·?\s*20\d\d\.[12]\s*·?\s*/, ' · ').replace(/^ · | · $/g, '') ?? '',
      // o que o nome do PDF diz além da disciplina e do semestre: "(2025.1 - PROUNIFIES)", "- Irregular", "Repetidas"
      extra: a ? complemento(limpa(a.nome), xs[0].disciplina, xs[0].prova ?? '') : '',
      melhor: feitas.length ? Math.max(...feitas.map((s) => notaDe(s, correta))) : undefined,
      aberta: tentativas.find((s) => !s.finishedAt && !s.papel),
    }
  }).sort((x, y) => y.sem.localeCompare(x.sem) || x.rotulo.localeCompare(y.rotulo))

  if (!disciplina) return <Empty>Escolha uma disciplina na tela inicial.</Empty>

  return (
    <>
      <nav className="mb-3 text-sm text-mute"><Link to="/app" className="hover:text-ink">Início</Link> › {disciplina} › Provas anteriores</nav>
      <section className="rounded-[1.75rem] border-2 border-ink bg-[#0b0b12] p-4 sm:p-6">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <h1 className="rounded-2xl bg-[#c80e58] px-6 py-3 font-display text-2xl font-bold shadow-[0_6px_0_#7a0836] sm:text-3xl">
            {disciplina}{periodo !== undefined && periodo > 0 && periodo <= 8 ? ` · ${periodoLabel(periodo)}` : ''}
          </h1>
          <div className="flex gap-2">
            {dir && <Link to={`/app/acervo?pasta=${encodeURIComponent(dir)}`} className="btn-ghost"><FolderOpen className="size-4" /> PDFs no Drive</Link>}
            <Link to="/app/minhas-provas" className="btn-ghost"><Clock className="size-4" /> Histórico</Link>
          </div>
        </div>

        {!cards.length && !semQuestoes.length ? (
          <Empty>Nenhuma prova desta disciplina virou questões ainda.</Empty>
        ) : (
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cards.map((c) => {
              const rec = recursos.filter((r) => semestreDe(r) === c.sem)
              return (
                <div key={c.id} className="relative flex min-h-44 flex-col gap-1.5 rounded-2xl bg-white p-3.5 text-[#0d0d12] shadow-[inset_0_-5px_0_rgba(0,0,0,0.12)]">
                  {c.melhor !== undefined && <span className="absolute top-2.5 right-2.5 rounded-full bg-green-600 px-2 py-0.5 text-[11px] font-extrabold text-white">✓ {c.melhor}%</span>}
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{c.n} questões</span>
                  <span className="font-display text-3xl font-bold tracking-tight">{c.sem === '—' ? (c.extra || 'Prova') : c.sem}</span>
                  <span className="flex min-h-5 flex-wrap gap-1">
                    {c.rotulo && <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-extrabold uppercase">{c.rotulo}</span>}
                    {c.extra && c.sem !== '—' && <span className="rounded-full bg-violet-200 px-2 py-0.5 text-[10px] font-extrabold uppercase text-violet-900">{c.extra}</span>}
                    {c.a && etiquetas(c.a).map(([t]) => <span key={t} className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-extrabold uppercase">{t}</span>)}
                    {rec.length > 0 && <span className="rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-extrabold uppercase text-yellow-950">Com recurso</span>}
                  </span>
                  <Link to={c.aberta ? `/app/simulados/${c.aberta.id}` : `/app/provas/${c.id}`}
                    className={`mt-auto inline-flex items-center justify-between gap-2 rounded-full border-2 px-3.5 py-2 text-xs font-extrabold uppercase tracking-wider ${c.aberta ? 'border-[#c80e58] bg-[#c80e58] text-white' : 'border-black'}`}>
                    {c.aberta ? 'Continuar' : 'Fazer prova'} <ArrowRight className="size-4" />
                  </Link>
                  <span className="flex flex-wrap gap-x-3 text-[11px] text-zinc-500">
                    {c.a && <button className="underline" onClick={() => setOpen(c.a)}>PDF</button>}
                    {rec.map((r) => <button key={r.id} className="underline" onClick={() => setOpen(r)}>{limpa(r.nome).replace(/^.*\)\s*-\s*/, '') || 'Recurso'}</button>)}
                  </span>
                </div>
              )
            })}
            {semQuestoes.map((a) => (
              <div key={a.id} className="flex min-h-44 flex-col gap-1.5 rounded-2xl bg-zinc-500 p-3.5 text-zinc-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider">{disciplina}</span>
                <span className="font-display text-3xl font-bold tracking-tight">{semestreDe(a) || '—'}</span>
                <span className="text-[11px]">{limpa(a.nome)}</span>
                <span className="mt-auto inline-flex items-center gap-2 rounded-full border-2 border-zinc-700 px-3.5 py-2 text-xs font-extrabold uppercase opacity-70"><X className="size-4" /> Só em PDF</span>
                <button className="text-left text-[11px] underline" onClick={() => setOpen(a)}>ver PDF</button>
              </div>
            ))}
          </div>
        )}

        {outros.length > 0 && (
          <>
            <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-[0.1em] text-mute">Outros materiais da pasta</h2>
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">
              {outros.map((a) => <ArquivoRow key={a.id} a={a} onOpen={setOpen} />)}
            </ul>
          </>
        )}
      </section>
      {open && <PdfViewer arquivo={open} onClose={() => setOpen(undefined)} />}
    </>
  )
}
