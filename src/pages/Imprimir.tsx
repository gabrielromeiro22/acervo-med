import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { DIF_LABEL, LETTERS } from '../lib/format'
import { useQuestions } from '../lib/store'

// Página clara e sem navegação, pensada para "Imprimir → Salvar como PDF".
export default function Imprimir() {
  const { disciplina = '' } = useParams()
  const qs = useQuestions().filter((q) => q.disciplina === disciplina)
  const [gabarito, setGabarito] = useState(true)
  const [comentarios, setComentarios] = useState(true)

  return (
    <div className="min-h-dvh bg-white text-zinc-900 print:min-h-0">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur print:hidden">
        <Link to="/app" className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100"><ArrowLeft className="size-4" /> Voltar</Link>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={gabarito} onChange={(e) => setGabarito(e.target.checked)} /> Gabarito no final</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={comentarios} disabled={!gabarito} onChange={(e) => setComentarios(e.target.checked)} /> Comentários</label>
        <button className="ml-auto inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700" onClick={() => window.print()}>
          <Printer className="size-4" /> Imprimir / salvar PDF
        </button>
      </div>

      <main className="mx-auto max-w-3xl px-6 py-10 print:max-w-none print:p-0">
        <header className="mb-8 border-b-2 border-zinc-900 pb-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Acervo Med · caderno de questões</p>
          <h1 className="mt-1 font-display text-3xl font-bold">{disciplina}</h1>
          <p className="mt-1 text-sm text-zinc-500">{qs.length} questões · gerado em {new Date().toLocaleDateString('pt-BR')}</p>
        </header>

        {!qs.length && <p className="text-zinc-500">Nenhuma questão desta disciplina.</p>}

        <ol className="space-y-7">
          {qs.map((q, i) => (
            <li key={q.id} className="break-inside-avoid">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-zinc-500">
                Questão {i + 1} · {q.tema} · {DIF_LABEL[q.dificuldade]}{q.fonte ? ` · ${q.fonte}` : ''}
              </p>
              <p className="whitespace-pre-line leading-relaxed">{q.enunciado}</p>
              <ol className="mt-2 space-y-1">
                {q.alternativas.map((a, k) => <li key={k} className="flex gap-2 text-sm"><b>{LETTERS[k]})</b> <span>{a}</span></li>)}
              </ol>
            </li>
          ))}
        </ol>

        {gabarito && qs.length > 0 && (
          <section className="mt-12 break-before-page border-t-2 border-zinc-900 pt-6">
            <h2 className="mb-4 font-display text-2xl font-bold">Gabarito{comentarios ? ' comentado' : ''}</h2>
            {comentarios ? (
              <ol className="space-y-4">
                {qs.map((q, i) => (
                  <li key={q.id} className="break-inside-avoid text-sm">
                    <p className="font-bold">{i + 1}. {LETTERS[q.correta]}</p>
                    <p className="whitespace-pre-line leading-relaxed text-zinc-700">{q.comentario}</p>
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
