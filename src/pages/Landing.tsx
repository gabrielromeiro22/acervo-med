import { Link } from 'react-router-dom'
import { ArrowRight, BarChart3, ClipboardList, FileText, Layers, MessageSquareText, Timer } from 'lucide-react'
import { Logo } from '../components/Logo'
import { useQuestions, useFlashcards, useMaterials } from '../lib/store'

const FEATURES = [
  { icon: ClipboardList, t: 'Banco de questões', d: 'Filtre por período, disciplina, tema, dificuldade e status.' },
  { icon: Timer, t: 'Simulados direcionados', d: 'Monte provas por disciplina com cronômetro e correção.' },
  { icon: MessageSquareText, t: 'Respostas comentadas', d: 'Explicação e referência em cada alternativa.' },
  { icon: Layers, t: 'Flashcards', d: 'Repetição espaçada para revisar no momento certo.' },
  { icon: BarChart3, t: 'Estatísticas', d: 'Acertos por disciplina, tempo médio e evolução diária.' },
  { icon: FileText, t: 'Importe suas provas', d: 'Traga suas questões em CSV ou JSON e estude tudo no mesmo lugar.' },
]

export default function Landing() {
  const q = useQuestions().length, f = useFlashcards().length, m = useMaterials().length
  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_50%_0%,rgba(45,234,150,0.14),transparent_34rem)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <Logo className="text-lg" />
        <Link to="/app" className="btn-ghost">Abrir o app</Link>
      </header>

      <section className="mx-auto max-w-6xl px-4 pt-12 pb-20 sm:pt-20">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-accent">Estudo de Medicina, sem enrolação</p>
        <h1 className="mt-4 max-w-4xl font-display text-5xl font-bold leading-[1.02] tracking-[-0.04em] sm:text-7xl">
          Se adiantando nos estudos? <span className="text-accent">Comece por aqui.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-mute">
          Questões comentadas, simulados, flashcards e materiais organizados por período e disciplina.
          Sem cadastro: abra e estude. Seu progresso fica salvo no navegador.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/app/questoes" className="btn-primary px-6 py-3 text-base">Resolver questões <ArrowRight className="size-4" /></Link>
          <Link to="/app/simulados" className="btn-ghost px-6 py-3 text-base">Montar simulado</Link>
        </div>
        <div className="mt-14 flex flex-wrap gap-8 text-sm text-mute">
          <span><b className="font-display text-2xl text-ink">{q}</b> questões</span>
          <span><b className="font-display text-2xl text-ink">{f}</b> flashcards</span>
          <span><b className="font-display text-2xl text-ink">{m}</b> materiais</span>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <h2 className="mb-6 font-display text-2xl font-bold">Tudo para você <span className="text-accent">passar</span></h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, t, d }) => (
            <li key={t} className="card p-5 transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[4px_4px_0_#2dea96]">
              <Icon className="size-5 text-accent" />
              <h3 className="mt-3 font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-mute">{d}</p>
            </li>
          ))}
        </ul>
      </section>
      <footer className="border-t border-line py-6 text-center text-xs text-mute">Acervo Med · feito para estudo</footer>
    </div>
  )
}
