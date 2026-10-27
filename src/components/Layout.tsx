import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  BarChart3, BookOpen, CalendarRange, ClipboardCheck, ClipboardList, FileText, Home, Layers, Menu, NotebookPen, Search, Upload, X,
} from 'lucide-react'
import { Logo } from './Logo'

const NAV = [
  { to: '/app', label: 'Início', icon: Home, end: true },
  { to: '/app/questoes', label: 'Banco de questões', icon: ClipboardList },
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

export default function Layout() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const focus = /\/app\/simulados\/.+/.test(pathname)

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to} to={to} end={end} onClick={() => setOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
              isActive ? 'bg-accent/10 font-semibold text-accent' : 'text-mute hover:bg-white/5 hover:text-ink'
            }`}
        >
          <Icon className="size-4" /> {label}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_50%_-10%,rgba(45,234,150,0.10),transparent_36rem)]">
      {!focus && (
        <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col gap-6 border-r border-line bg-bg/80 p-4 backdrop-blur lg:flex">
          <Link to="/" className="px-2 pt-1"><Logo /></Link>
          {nav}
          <p className="mt-auto px-2 text-xs text-mute/70">Progresso salvo neste navegador.</p>
        </aside>
      )}
      <header className={`sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/80 px-4 py-3 backdrop-blur ${focus ? '' : 'lg:hidden'}`}>
        <Link to="/"><Logo /></Link>
        {!focus && (
          <button className="btn-ghost px-2.5" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        )}
      </header>
      {open && <div className="border-b border-line bg-bg p-4 lg:hidden">{nav}</div>}
      <main className={`${focus ? '' : 'lg:pl-60'}`}>
        <div className={`mx-auto w-full px-4 py-6 sm:py-10 ${pathname === '/app' ? 'max-w-7xl' : 'max-w-5xl'}`}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
