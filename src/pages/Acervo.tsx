import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronRight, Clock, Folder, Search, Star, CircleCheck } from 'lucide-react'
import { ArquivoRow } from '../components/ArquivoRow'
import { PdfViewer } from '../components/PdfViewer'
import { Empty } from '../components/ui'
import { arvore, limpa, pastaEm, semestreDe, todos, type Pasta } from '../lib/acervo'
import { normalize, pct } from '../lib/format'
import { useAcervoPronto, useArquivos, useStore, type Arquivo } from '../lib/store'
import { useTermo } from '../lib/useTermo'

const MAX = 300
const ABAS = [
  { v: '', label: 'Pastas', icon: Folder },
  { v: 'fav', label: 'Favoritos', icon: Star },
  { v: 'feitos', label: 'Feitos', icon: CircleCheck },
  { v: 'recentes', label: 'Recentes', icon: Clock },
] as const

// Navega o acervo do Drive pasta a pasta (?pasta=…), com busca (?q=…) e as listas pessoais (?aba=…).
export default function Acervo() {
  const [params, setParams] = useSearchParams()
  const arquivos = useArquivos()
  const pronto = useAcervoPronto()
  const feitos = useStore((s) => s.feitos)
  const favs = useStore((s) => s.favArquivos)
  const recentes = useStore((s) => s.recentes)
  const [open, setOpen] = useState<Arquivo>()
  const path = params.get('pasta') ?? '', aba = params.get('aba') ?? ''
  const [campo, setCampo, term] = useTermo()
  const set = (p: Record<string, string>) => setParams((cur) => {
    for (const [k, v] of Object.entries(p)) { if (v) cur.set(k, v); else cur.delete(k) }
    return cur
  }, { replace: 'q' in p })

  const raiz = arvore(arquivos)
  const pasta = pastaEm(raiz, path) ?? raiz
  const feitoSet = useMemo(() => new Set(feitos), [feitos])
  const prog = (n: Pasta) => { const fs = todos(n); const d = fs.filter((a) => feitoSet.has(a.id)).length; return { t: fs.length, d, p: pct(d, fs.length) } }
  const byId = useMemo(() => new Map(arquivos.map((a) => [a.id, a])), [arquivos])

  if (!pronto) return <Empty>Carregando o acervo…</Empty>
  if (!arquivos.length) return <Empty>Acervo vazio. Rode <code>npm run acervo</code> para baixar e processar os arquivos.</Empty>

  const words = normalize(term).split(/\s+/).filter(Boolean)
  const lista = aba ? (aba === 'fav' ? favs : aba === 'feitos' ? feitos : recentes).map((id) => byId.get(id)).filter((a): a is Arquivo => !!a) : []
  const achados = words.length ? todos(pasta).filter((a) => { const p = normalize(a.path); return words.every((w) => p.includes(w)) }) : []
  const p = prog(pasta)
  const segs = path.split('/').filter(Boolean)

  // provas da pasta, das mais novas para as mais antigas, agrupadas por ano quando houver mais de um
  const grupos = new Map<string, Arquivo[]>()
  for (const a of [...pasta.arquivos].sort((a, b) => semestreDe(b).localeCompare(semestreDe(a)) || a.nome.localeCompare(b.nome, 'pt', { numeric: true }))) {
    const k = semestreDe(a).slice(0, 4) || 'Outros'
    grupos.set(k, [...(grupos.get(k) ?? []), a])
  }
  const ordem = (n: string) => { const l = limpa(n); return /PER[ÍI]ODO/.test(l) ? parseInt(l) : /INTERNATO/.test(l) ? 20 : /TPI/.test(l) ? 21 : /ENAMED/.test(l) ? 22 : 30 }
  const filhas = [...pasta.filhas.values()].sort((a, b) => (path ? 0 : ordem(a.nome) - ordem(b.nome)) || a.nome.localeCompare(b.nome, 'pt', { numeric: true }))

  return (
    <>
      <nav className="mb-2 flex flex-wrap items-center gap-1 text-sm text-mute">
        <button className="hover:text-ink" onClick={() => set({ pasta: '', q: '', aba: '' })}>Acervo</button>
        {segs.map((s, i) => (
          <span key={i} className="flex items-center gap-1"><ChevronRight className="size-3.5" />
            <button className="hover:text-ink" onClick={() => set({ pasta: segs.slice(0, i + 1).join('/'), q: '', aba: '' })}>{limpa(s)}</button>
          </span>
        ))}
      </nav>

      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{path ? limpa(pasta.nome) : 'Acervo'}</h1>
          <p className="mt-1 text-mute">{p.t} arquivos · {p.d} feitos ({p.p}%)</p>
        </div>
        <label className="relative w-full sm:w-96">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-mute" />
          <input className="input h-12 rounded-2xl pl-10 text-base" value={campo} onChange={(e) => { setCampo(e.target.value); if (aba) set({ aba: '' }) }}
            placeholder={path ? `Buscar em ${limpa(pasta.nome)}…` : 'Ex.: HAM 4 2025, pré-natal, gabarito…'} />
        </label>
      </div>

      {!path && !words.length && (
        <div className="mb-5 flex flex-wrap gap-2">
          {ABAS.map(({ v, label, icon: I }) => {
            const n = v === 'fav' ? favs.length : v === 'feitos' ? feitos.length : v === 'recentes' ? recentes.length : 0
            return (
              <button key={v} onClick={() => set({ aba: v })}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${aba === v ? 'border-ink bg-ink text-bg' : 'border-line bg-panel text-mute hover:text-ink'}`}>
                <I className="size-4" /> {label}{v && <span className="tabular-nums opacity-70">{n}</span>}
              </button>
            )
          })}
        </div>
      )}

      {words.length ? (
        <Lista arquivos={achados.slice(0, MAX)} onOpen={setOpen} caminho vazio="Nada encontrado." />
      ) : aba ? (
        <Lista arquivos={lista} onOpen={setOpen} caminho
          vazio={aba === 'fav' ? 'Toque na estrela de um PDF para guardá-lo aqui.' : aba === 'feitos' ? 'Marque as provas que você já fez.' : 'Os PDFs que você abrir aparecem aqui.'} />
      ) : (
        <>
          {filhas.length > 0 && (
            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filhas.map((k) => {
                const pk = prog(k)
                return (
                  <button key={k.path} onClick={() => set({ pasta: k.path })}
                    className="group flex flex-col gap-2.5 rounded-2xl border border-line bg-panel p-4 text-left transition hover:border-accent/60">
                    <Folder className="size-5 text-accent" />
                    <span className="font-display text-lg font-bold leading-tight">{limpa(k.nome)}</span>
                    <span className="text-xs text-mute">{pk.t} arquivos · {pk.d} feitos</span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-white/5"><span className="block h-full rounded-full bg-accent" style={{ width: `${pk.p}%` }} /></span>
                  </button>
                )
              })}
            </div>
          )}
          {grupos.size > 0 && (
            <div className="overflow-hidden rounded-2xl border border-line bg-panel">
              {[...grupos].map(([ano, fs]) => (
                <div key={ano}>
                  {grupos.size > 1 && <p className="border-t border-line bg-panel-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-mute first:border-t-0">{ano}</p>}
                  <ul className="divide-y divide-line border-t border-line first:border-t-0">{fs.map((a) => <ArquivoRow key={a.id} a={a} onOpen={setOpen} />)}</ul>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {words.length > 0 && achados.length > MAX && <p className="mt-3 text-center text-sm text-mute">Mostrando {MAX} de {achados.length}. Refine a busca para ver o resto.</p>}
      {!path && !words.length && !aba && (
        <p className="mt-6 text-center text-xs text-mute">PDFs abertos direto do Drive. Seu progresso fica salvo neste navegador. <Link to="/app/minhas-provas" className="text-accent hover:underline">Minhas provas</Link></p>
      )}
      {open && <PdfViewer arquivo={open} onClose={() => setOpen(undefined)} />}
    </>
  )
}

function Lista({ arquivos, onOpen, caminho, vazio }: { arquivos: Arquivo[]; onOpen: (a: Arquivo) => void; caminho?: boolean; vazio: string }) {
  if (!arquivos.length) return <Empty>{vazio}</Empty>
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">
      {arquivos.map((a) => <ArquivoRow key={a.id} a={a} onOpen={onOpen} caminho={caminho} />)}
    </ul>
  )
}
