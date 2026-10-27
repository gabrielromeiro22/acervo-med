import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  ArrowLeft, BarChart3, Flame, BookOpen, CalendarRange, ChevronDown, ClipboardCheck, ClipboardList, FileText, Home, Layers, Library, Maximize2, Minimize2,
  NotebookPen, Search, Upload, UserRound,
} from 'lucide-react'
import { Logo } from './Logo'
import { useStore } from '../lib/store'

const NAV = [
  { to: '/app', label: 'Início', icon: Home, end: true },
  { to: '/app/questoes', label: 'Banco de questões', icon: ClipboardList },
  { to: '/app/acervo', label: 'Acervo (PDFs)', icon: Library },
  { to: '/app/cobrados', label: 'Assuntos mais cobrados', icon: Flame },
  { to: '/app/simulados', label: 'Simulados', icon: FileText },
  { to: '/app/minhas-provas', label: 'Minhas provas', icon: ClipboardCheck },
  { to: '/app/grade', label: 'Grade acadêmica', icon: CalendarRange },
  { to: '/app/flashcards', label: 'Flashcards', icon: Layers },
  { to: '/app/materiais', label: 'Materiais', icon: BookOpen },
  { to: '/app/estatisticas', label: 'Estatísticas', icon: BarChart3 },
  { to: '/app/notas', label: 'Minhas notas', icon: NotebookPen },
  { to: '/app/busca', label: 'Busca', icon: Search },
  { to: '/app/importar', label: 'Importar / backup', icon: Upload },
]

const pill = 'inline-flex items-center gap-2 rounded-xl bg-ink px-3 py-2 text-sm font-semibold text-bg shadow-[2px_2px_0_#000] transition hover:brightness-90'

// Sem barra lateral: a tela inicial tem a barra do topo; as demais telas abrem cheias, com botão de voltar.
export default function Layout() {
  const [menu, setMenu] = useState(false)
  const [full, setFull] = useState(false)
  const { pathname } = useLocation()
  const fundo = useStore((s) => s.fundo)
  const home = pathname === '/app'

  useEffect(() => {
    const sync = () => setFull(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])
  const toggleFull = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {})

  return (
    <div className={`min-h-dvh ${fundo === 'claro' ? 'bg-claro' : fundo === 'animado' ? 'bg-animado' : 'bg-pontos'}`}>
      {home ? (
        <header className="relative z-30 mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 pt-5">
          <div className="relative">
            <button className={pill} onClick={() => setMenu((m) => !m)} aria-expanded={menu}>
              <UserRound className="size-4" /> Conta <ChevronDown className={`size-4 transition ${menu ? 'rotate-180' : ''}`} />
            </button>
            {menu && (
              <>
                <div className="fixed inset-0" onClick={() => setMenu(false)} />
                <nav className="absolute top-12 left-0 z-10 flex w-64 flex-col gap-0.5 rounded-2xl border border-line bg-panel-2 p-2 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.8)]">
                  {NAV.map(({ to, label, icon: Icon, end }) => (
                    <NavLink key={to} to={to} end={end} onClick={() => setMenu(false)}
                      className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${isActive ? 'bg-accent/10 font-semibold text-accent' : 'text-mute hover:bg-white/5 hover:text-ink'}`}>
                      <Icon className="size-4" /> {label}
                    </NavLink>
                  ))}
                  <p className="mt-1 border-t border-line px-3 pt-2 text-[11px] text-mute/70">Progresso salvo neste navegador.</p>
                </nav>
              </>
            )}
          </div>
          <Link to="/" className="absolute left-1/2 hidden -translate-x-1/2 min-[440px]:block"><Logo className="text-xl" /></Link>
          <div className="flex items-center gap-2">
            <Link to="/app/busca" className={`${pill} px-2.5`} aria-label="Busca"><Search className="size-4" /></Link>
            <button className={`${pill} px-2.5`} onClick={toggleFull} aria-label={full ? 'Sair da tela cheia' : 'Tela cheia'}>
              {full ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
          </div>
        </header>
      ) : (
        <Link to="/app" aria-label="Voltar ao início"
          className="fixed top-4 left-4 z-40 grid size-11 place-items-center rounded-full bg-ink text-bg shadow-[2px_2px_0_#000] transition hover:-translate-x-0.5 print:hidden">
          <ArrowLeft className="size-5" />
        </Link>
      )}
      <main className={`mx-auto w-full px-4 ${home ? 'max-w-7xl py-6' : 'max-w-5xl pt-20 pb-10 lg:pt-10'}`}>
        <Outlet />
      </main>
    </div>
  )
}
