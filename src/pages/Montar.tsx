import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { BookOpenCheck, CircleHelp, FileDown, Loader2, Printer, ScanLine, Tablet, Trash2, X } from 'lucide-react'
import { Empty } from '../components/ui'
import type { Question } from '../data/types'
import { baixarPdf, gerarCaderno, type Comentarios, type Formato } from '../lib/caderno'
import { periodoLabel, shuffle, uniq } from '../lib/format'
import { createSimulado, setState, useQuestions, useStore } from '../lib/store'

const FORMATOS: { v: Formato; t: string; d: string; passos: string[]; icon: typeof Printer; tom: string; marca: string }[] = [
  { v: 'impresso', t: 'Vou imprimir', d: 'Prova e folha de respostas no papel.', icon: Printer, tom: 'bg-pink-100', marca: 'bg-pink-200',
    passos: ['Baixe e imprima a prova (a folha de respostas vem no fim).', 'Marque as respostas na folha com caneta.', 'Lance as letras aqui para corrigir.'] },
  { v: 'tablet', t: 'Vou fazer no tablet', d: 'PDF para responder num app de anotações.', icon: Tablet, tom: 'bg-cyan-100', marca: 'bg-cyan-200',
    passos: ['Baixe o caderno e abra no seu app de anotações.', 'Pinte as bolinhas das alternativas.', 'Envie o PDF respondido aqui: a correção é automática.'] },
  { v: 'respostas', t: 'PDF com respostas', d: 'Prova com gabarito e comentários, para estudar.', icon: BookOpenCheck, tom: 'bg-violet-100', marca: 'bg-violet-200',
    passos: ['Baixe a prova já com as respostas.', 'Escolha: só o gabarito, comentários no fim ou em cada questão.', 'É para estudar: sem folha de respostas nem correção.'] },
]
// assunto do roteiro quando houver, senão o assunto da classificação
const temaDe = (q: Question) => q.roteiro ?? q.tema
const COMENTARIOS: { v: Comentarios; t: string }[] = [{ v: 'nenhum', t: 'Só o gabarito' }, { v: 'final', t: 'Comentários no fim' }, { v: 'cada', t: 'Comentário em cada questão' }]

// Monte · imprima · corrija: caderno em PDF de uma prova anterior ou por assunto, para papel, tablet ou estudo.
export default function Montar() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const disciplina = params.get('disciplina') ?? ''
  const periodo = params.has('periodo') ? Number(params.get('periodo')) : undefined
  const questions = useQuestions()
  const simulados = useStore((s) => s.simulados)
  const nome = useStore((s) => s.nome)
  const [formato, setFormato] = useState<Formato>()
  const [fonte, setFonte] = useState<'prova' | 'assunto'>('prova')
  const [prova, setProva] = useState('')
  const [assuntos, setAssuntos] = useState<string[]>([])
  const [qtd, setQtd] = useState(20)
  const [comentarios, setComentarios] = useState<Comentarios>('final')
  const [gerando, setGerando] = useState(false)
  const [ajuda, setAjuda] = useState(false)

  const qs = useMemo(() => questions.filter((q) => q.disciplina === disciplina && (periodo === undefined || q.periodo === periodo)), [questions, disciplina, periodo])
  const provas = useMemo(() => {
    const m = new Map<string, { id: string; rotulo: string; n: number }>()
    for (const q of qs) if (q.arquivo) {
      const p = m.get(q.arquivo) ?? { id: q.arquivo, rotulo: q.prova || q.fonte || 'Prova', n: 0 }
      p.n++; m.set(q.arquivo, p)
    }
    return [...m.values()].sort((a, b) => b.rotulo.localeCompare(a.rotulo, 'pt', { numeric: true }))
  }, [qs])
  const temas = useMemo(() => uniq(qs.map(temaDe)).map((t) => [t, qs.filter((q) => temaDe(q) === t).length] as const).sort((a, b) => b[1] - a[1]), [qs])
  const pendentes = simulados.filter((s) => s.papel && !s.finishedAt && s.questionIds.some((id) => qs.some((q) => q.id === id)))

  const escolhidas = () => {
    if (fonte === 'prova') return qs.filter((q) => q.arquivo === prova).sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0))
    return shuffle(qs.filter((q) => assuntos.includes(temaDe(q)))).slice(0, qtd || undefined)
  }
  const nomeProva = () => fonte === 'prova'
    ? `${disciplina} · ${provas.find((p) => p.id === prova)?.rotulo ?? ''}`
    : `${disciplina} · ${assuntos.length === 1 ? assuntos[0] : `${assuntos.length} assuntos`}`

  const gerar = async () => {
    const lista = escolhidas()
    if (!formato || !lista.length) return
    setGerando(true)
    try {
      const titulo = nomeProva()
      const { bytes, layout, paginas } = await gerarCaderno(lista, {
        titulo, subtitulo: `${periodo !== undefined ? periodoLabel(periodo) + ' · ' : ''}${lista.length} questões`, aluno: nome, formato, comentarios,
      })
      baixarPdf(`${titulo} - ${formato === 'tablet' ? 'Caderno para tablet' : formato === 'impresso' ? 'Prova para imprimir' : 'Com respostas'}`, bytes)
      if (formato !== 'respostas') {
        createSimulado(titulo, lista.map((q) => q.id), 0, false, true, { formato, ...(formato === 'tablet' && { layout, paginas }) })
        toast.success('PDF baixado. A prova está esperando correção aqui embaixo.')
      } else toast.success('PDF baixado.')
    } catch (e) {
      toast.error('Não foi possível gerar o PDF.'); console.error(e)
    } finally { setGerando(false) }
  }

  if (!disciplina) return <Empty>Escolha uma disciplina na tela inicial.</Empty>
  const pronto = formato && (fonte === 'prova' ? !!prova : assuntos.length > 0)

  return (
    <div className="overflow-hidden rounded-[1.75rem] border-[3px] border-ink bg-[#10131f]">
      <div className="flex items-center gap-4 bg-[#c80e58] px-6 py-5">
        <span className="grid size-14 place-items-center rounded-2xl border-[3px] border-black bg-white text-black shadow-[3px_3px_0_#000]"><ScanLine className="size-7" /></span>
        <span>
          <span className="block text-xs font-bold tracking-[0.25em] text-pink-100 uppercase">Monte · imprima · corrija</span>
          <span className="block font-display text-3xl font-extrabold">{disciplina}</span>
        </span>
        <button onClick={() => setAjuda(true)} className="ml-auto inline-flex items-center gap-2 rounded-xl border-[3px] border-black bg-white px-4 py-2 font-bold text-black shadow-[3px_3px_0_#000]">
          <CircleHelp className="size-5" /> Como funciona?
        </button>
      </div>

      <div className="space-y-6 p-5 sm:p-7">
        {pendentes.length > 0 && (
          <Etapa titulo="Esperando correção" extra={<span className="rounded-full border border-white/30 px-2.5 py-0.5 text-xs font-bold">{pendentes.length}</span>}>
            <div className="grid gap-4 md:grid-cols-2">
              {pendentes.map((s) => (
                <div key={s.id} className="overflow-hidden rounded-2xl border-[3px] border-white bg-white text-black">
                  <div className="flex items-stretch">
                    <div className="flex-1 p-4">
                      <span className="flex gap-1.5">
                        <span className="rounded-full border-2 border-black px-2 py-0.5 text-[10px] font-extrabold uppercase">Aguardando correção</span>
                        <span className="rounded-full border-2 border-black bg-cyan-300 px-2 py-0.5 text-[10px] font-extrabold uppercase">{s.formato === 'tablet' ? 'Tablet' : 'Papel'}</span>
                      </span>
                      <p className="mt-2 font-display text-xl font-extrabold leading-tight">{s.nome}</p>
                    </div>
                    <div className="grid w-24 place-items-center border-l-[3px] border-black text-center">
                      <span><b className="block font-display text-3xl">{s.questionIds.length}</b><span className="text-[10px] font-bold tracking-widest uppercase">questões</span></span>
                    </div>
                  </div>
                  <div className="flex border-t-[3px] border-black">
                    <Link to={`/app/simulados/${s.id}`} className="flex flex-1 items-center justify-center gap-2 bg-cyan-300 py-3 font-extrabold uppercase"><ScanLine className="size-4" /> Corrigir</Link>
                    <button aria-label="Descartar" onClick={() => setState((st) => ({ ...st, simulados: st.simulados.filter((x) => x.id !== s.id) }))}
                      className="grid w-14 place-items-center border-l-[3px] border-black bg-zinc-900 text-white"><Trash2 className="size-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </Etapa>
        )}

        <Etapa n={1} titulo="Monte sua prova" sub="Como você quer a prova">
          <div className="grid gap-4 md:grid-cols-3">
            {FORMATOS.map(({ v, t, d, passos, icon: I, tom, marca }) => (
              <button key={v} onClick={() => setFormato(v)}
                className={`flex flex-col rounded-2xl border-[3px] bg-white p-4 text-left text-black transition ${formato === v ? 'border-[#c80e58] ring-4 ring-[#c80e58]/40' : 'border-black'}`}>
                <span className={`mb-4 grid h-28 place-items-center rounded-xl border-[3px] border-black ${tom}`}><I className="size-14" strokeWidth={1.5} /></span>
                <span className="flex items-start justify-between gap-2">
                  <span><b className={`px-1 font-display text-xl ${marca}`}>{t}</b><span className="mt-1 block text-sm text-zinc-600">{d}</span></span>
                  <span className={`mt-1 size-6 shrink-0 rounded-full border-2 ${formato === v ? 'border-[#c80e58] bg-[#c80e58] shadow-[inset_0_0_0_3px_#fff]' : 'border-zinc-400'}`} />
                </span>
                <ol className="mt-3 list-decimal space-y-1 border-t border-zinc-200 pt-3 pl-5 text-sm text-zinc-700">{passos.map((p) => <li key={p}>{p}</li>)}</ol>
              </button>
            ))}
          </div>
        </Etapa>

        <Etapa n={2} titulo="O que vai cair">
          <div className="mb-4 inline-flex rounded-xl border border-white/15 bg-black/30 p-1">
            {(['prova', 'assunto'] as const).map((f) => (
              <button key={f} onClick={() => setFonte(f)} className={`rounded-lg px-4 py-1.5 text-sm font-semibold ${fonte === f ? 'bg-white text-black' : 'text-zinc-400'}`}>
                {f === 'prova' ? 'Prova anterior' : 'Por assunto'}
              </button>
            ))}
          </div>
          {fonte === 'prova' ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {provas.map((p) => (
                <button key={p.id} onClick={() => setProva(p.id)}
                  className={`rounded-xl border-2 px-4 py-3 text-left transition ${prova === p.id ? 'border-[#c80e58] bg-[#c80e58]/15' : 'border-white/10 bg-white/5 hover:border-white/30'}`}>
                  <b className="block">{p.rotulo}</b><span className="text-xs text-zinc-400">{p.n} questões</span>
                </button>
              ))}
              {!provas.length && <p className="text-sm text-zinc-400">Nenhuma prova desta disciplina virou questões ainda.</p>}
            </div>
          ) : (
            <>
              <div className="flex max-h-72 flex-wrap gap-2 overflow-y-auto pr-1">
                {temas.map(([t, n]) => {
                  const on = assuntos.includes(t)
                  return (
                    <button key={t} onClick={() => setAssuntos(on ? assuntos.filter((x) => x !== t) : [...assuntos, t])}
                      className={`rounded-full border px-3 py-1.5 text-left text-sm transition ${on ? 'border-[#c80e58] bg-[#c80e58] text-white' : 'border-white/15 text-zinc-300 hover:border-white/40'}`}>
                      {t} <span className="opacity-60">{n}</span>
                    </button>
                  )
                })}
              </div>
              <label className="mt-4 flex items-center gap-3 text-sm">Quantidade
                <select className="input w-auto" value={qtd} onChange={(e) => setQtd(Number(e.target.value))}>
                  {[10, 20, 30, 50, 0].map((n) => <option key={n} value={n}>{n ? `até ${n}` : 'todas'}</option>)}
                </select>
                <span className="text-zinc-400">{Math.min(qtd || Infinity, qs.filter((q) => assuntos.includes(temaDe(q))).length)} questões</span>
              </label>
            </>
          )}
        </Etapa>

        {formato === 'respostas' && (
          <Etapa n={3} titulo="Respostas no PDF">
            <div className="flex flex-wrap gap-2">
              {COMENTARIOS.map(({ v, t }) => (
                <button key={v} onClick={() => setComentarios(v)} className={`rounded-xl border-2 px-4 py-2 text-sm font-semibold ${comentarios === v ? 'border-[#c80e58] bg-[#c80e58]/15' : 'border-white/10 bg-white/5'}`}>{t}</button>
              ))}
            </div>
          </Etapa>
        )}

        <button disabled={!pronto || gerando} onClick={gerar}
          className="relative flex w-full items-center justify-center gap-2 rounded-full bg-white py-4 font-extrabold tracking-wider text-black transition hover:brightness-90 disabled:opacity-40">
          {gerando ? <><Loader2 className="size-5 animate-spin" /> GERANDO PDF…</> : <><FileDown className="size-5" /> CONSTRUIR MEU PDF</>}
        </button>
        {!nome && <p className="text-center text-xs text-zinc-500">Dica: coloque seu nome na engrenagem da tela inicial para ele sair no cabeçalho da prova.</p>}
        <p className="text-center text-xs text-zinc-500"><button className="underline" onClick={() => navigate(-1)}>Voltar</button></p>
      </div>
      {ajuda && <ComoFunciona onFechar={() => setAjuda(false)} />}
    </div>
  )
}

function Etapa({ n, titulo, sub, extra, children }: { n?: number; titulo: string; sub?: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#161a2b] p-5">
      <h2 className="mb-1 flex items-center gap-3 font-display text-xl font-bold">
        {n && <span className="grid size-8 place-items-center rounded-full border-2 border-black bg-white text-sm text-black">{n}</span>}
        {titulo} {extra}
      </h2>
      {sub && <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-zinc-400 uppercase">{sub}</p>}
      <div className="mt-3">{children}</div>
    </section>
  )
}

function ComoFunciona({ onFechar }: { onFechar: () => void }) {
  const passos = [
    ['Monte', 'Escolha o formato (papel, tablet ou com respostas) e o que vai cair: uma prova anterior ou os assuntos que você quer treinar.'],
    ['Baixe', 'O Acervo Med gera o PDF no seu navegador. Nada sai do seu computador.'],
    ['Responda', 'No papel, use a folha de respostas do fim. No tablet, pinte a bolinha da alternativa e o círculo "rever" das questões que quer revisar.'],
    ['Envie', 'Abra a prova em "Esperando correção". No tablet, envie o PDF respondido e as respostas são lidas sozinhas; no papel, toque nas letras.'],
    ['Confira', 'Confira as letras lidas, corrija e veja a nota, o gabarito e os comentários. O resultado fica em Minhas provas.'],
  ]
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onFechar} role="dialog" aria-modal>
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border-[3px] border-black bg-white text-black" onClick={(e) => e.stopPropagation()}>
        <div className="bg-[#c80e58] px-5 py-3 text-white"><b>COMO FUNCIONA?</b><span className="block text-xs opacity-80">Do PDF à nota, em 5 passos</span></div>
        <button onClick={onFechar} aria-label="Fechar" className="absolute top-3 right-3 grid size-8 place-items-center rounded-full bg-white text-black"><X className="size-4" /></button>
        <ol className="space-y-3 p-5">
          {passos.map(([t, d], i) => (
            <li key={t} className="flex gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-black font-bold text-white">{i + 1}</span>
              <span><b>{t}</b><span className="block text-sm text-zinc-600">{d}</span></span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
