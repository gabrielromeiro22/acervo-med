import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, FileCheck2, Printer, Shuffle } from 'lucide-react'
import { DIF_LABEL, LETTERS, shuffle } from '../lib/format'
import { createSimulado, useQuestions } from '../lib/store'
import { RichText } from '../components/RichText'

type Modo = 'imprimir' | 'respostas'

const MODOS = [
  { v: 'imprimir' as const, t: 'Vou imprimir', d: 'Prova + folha de respostas. Depois você lança as respostas e o app corrige.', icon: Printer, tone: 'bg-pink-100 border-pink-300' },
  { v: 'respostas' as const, t: 'PDF com respostas', d: 'Prova com gabarito comentado no final, para estudar.', icon: FileCheck2, tone: 'bg-violet-100 border-violet-300' },
]

// Página clara e sem navegação, pensada para "Imprimir → Salvar como PDF".
export default function Imprimir() {
  const { disciplina = '' } = useParams()
  const questions = useQuestions()
  const per = useSearchParams()[0].get('periodo')
  const todas = useMemo(() => questions.filter((q) => q.disciplina === disciplina && (per === null || q.periodo === Number(per))), [questions, disciplina, per])
  const [modo, setModo] = useState<Modo>('imprimir')
  const [n, setN] = useState(20)
  const [seed, setSeed] = useState(0)
  const [comentarios, setComentarios] = useState(true)
  const [registrada, setRegistrada] = useState<string>()

  const qs = useMemo(() => (seed ? shuffle(todas) : todas).slice(0, n), [todas, seed, n])
  const alts = Math.max(0, ...qs.map((q) => q.alternativas.length))

  const imprimir = () => {
    // No modo papel a prova vira uma pendência em "Minhas provas" para corrigir depois.
    if (modo === 'imprimir' && !registrada) {
      setRegistrada(createSimulado(`${disciplina} · impressa`, qs.map((q) => q.id), 0, false, true))
    }
    setTimeout(() => window.print(), 50)
  }
  const reset = (fn: () => void) => { fn(); setRegistrada(undefined) }

  return (
    <div className="min-h-dvh bg-white text-zinc-900 print:min-h-0">
      <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3">
          <Link to="/app" className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100"><ArrowLeft className="size-4" /> Voltar</Link>
          <label className="flex items-center gap-2 text-sm">
            Questões
            <input type="number" min={1} max={todas.length || 1} value={n} className="w-20 rounded-lg border border-zinc-300 px-2 py-1"
              onChange={(e) => reset(() => setN(Math.max(1, Number(e.target.value) || 1)))} />
            <span className="text-zinc-500">de {todas.length}</span>
          </label>
          <button className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100" onClick={() => reset(() => setSeed((s) => s + 1))}>
            <Shuffle className="size-4" /> Sortear
          </button>
          {modo === 'respostas' && (
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={comentarios} onChange={(e) => setComentarios(e.target.checked)} /> Comentários</label>
          )}
          <button className="ml-auto inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-40" disabled={!qs.length} onClick={imprimir}>
            <Printer className="size-4" /> Imprimir / salvar PDF
          </button>
        </div>
        <div className="mx-auto mt-3 grid max-w-3xl gap-2 sm:grid-cols-2">
          {MODOS.map(({ v, t, d, icon: I, tone }) => (
            <button key={v} onClick={() => reset(() => setModo(v))}
              className={`flex items-start gap-3 rounded-2xl border-2 p-3 text-left transition ${modo === v ? `${tone} border-zinc-900` : 'border-zinc-200 hover:border-zinc-400'}`}>
              <I className="mt-0.5 size-5 shrink-0" />
              <span>
                <span className="block font-semibold">{t}</span>
                <span className="block text-xs text-zinc-600">{d}</span>
              </span>
            </button>
          ))}
        </div>
        {registrada && (
          <p className="mx-auto mt-3 flex max-w-3xl items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <CheckCircle2 className="size-4" /> Prova registrada. Depois de fazer no papel,
            <Link to={`/app/simulados/${registrada}`} className="font-semibold underline">lance suas respostas para corrigir</Link>.
          </p>
        )}
      </div>

      <main className="mx-auto max-w-3xl px-6 py-10 print:max-w-none print:p-0">
        <header className="mb-8 border-b-2 border-zinc-900 pb-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Acervo Med · {modo === 'imprimir' ? 'prova' : 'caderno com respostas'}</p>
          <h1 className="mt-1 font-display text-3xl font-bold">{disciplina}</h1>
          <p className="mt-1 text-sm text-zinc-500">{qs.length} questões · gerado em {new Date().toLocaleDateString('pt-BR')}</p>
          {modo === 'imprimir' && <p className="mt-3 text-sm">Nome: ______________________________________ &nbsp; Data: ____/____/______</p>}
        </header>

        {!qs.length && <p className="text-zinc-500">Nenhuma questão desta disciplina.</p>}

        <ol className="space-y-7">
          {qs.map((q, i) => (
            <li key={q.id} className="break-inside-avoid">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-zinc-500">
                Questão {i + 1} · {q.tema} · {DIF_LABEL[q.dificuldade]}{q.fonte ? ` · ${q.fonte}` : ''}
              </p>
              <p className="leading-relaxed"><RichText text={q.enunciado} claro /></p>
              <ol className="mt-2 space-y-1">
                {q.alternativas.map((a, k) => <li key={k} className="flex gap-2 text-sm"><b>{LETTERS[k]})</b> <RichText text={a} claro /></li>)}
              </ol>
            </li>
          ))}
        </ol>

        {modo === 'imprimir' && qs.length > 0 && (
          <section className="mt-12 break-before-page border-t-2 border-zinc-900 pt-6">
            <h2 className="mb-1 font-display text-2xl font-bold">Folha de respostas</h2>
            <p className="mb-5 text-sm text-zinc-500">Preencha uma bolinha por questão. Depois lance as respostas em “Minhas provas → Corrigir”.</p>
            <ol className="grid grid-cols-2 gap-x-10 gap-y-2 sm:grid-cols-3 print:grid-cols-3">
              {qs.map((q, i) => (
                <li key={q.id} className="flex items-center gap-2 text-sm tabular-nums">
                  <b className="w-7 text-right">{i + 1}</b>
                  {Array.from({ length: alts }, (_, k) => (
                    <span key={k} className={`grid size-6 place-items-center rounded-full border text-[10px] font-semibold ${k < q.alternativas.length ? 'border-zinc-500' : 'invisible'}`}>{LETTERS[k]}</span>
                  ))}
                </li>
              ))}
            </ol>
          </section>
        )}

        {modo === 'respostas' && qs.length > 0 && (
          <section className="mt-12 break-before-page border-t-2 border-zinc-900 pt-6">
            <h2 className="mb-4 font-display text-2xl font-bold">Gabarito{comentarios ? ' comentado' : ''}</h2>
            {comentarios ? (
              <ol className="space-y-4">
                {qs.map((q, i) => (
                  <li key={q.id} className="break-inside-avoid text-sm">
                    <p className="font-bold">{i + 1}. {LETTERS[q.correta]}</p>
                    <p className="leading-relaxed text-zinc-700"><RichText text={q.comentario} claro /></p>
                    {q.referencia && <p className="mt-1 text-xs text-zinc-500">Referência: {q.referencia}</p>}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="grid grid-cols-5 gap-2 text-sm sm:grid-cols-10">
                {qs.map((q, i) => <span key={q.id}><b>{i + 1}.</b> {LETTERS[q.correta]}</span>)}
              </p>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
