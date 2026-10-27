import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronRight, FileText, Search } from 'lucide-react'
import { ArquivoRow } from '../components/ArquivoRow'
import { PdfViewer } from '../components/PdfViewer'
import { Empty } from '../components/ui'
import { arvore, limpa, pastaDoPeriodo, pastaEm, todos, type Pasta } from '../lib/acervo'
import { normalize, periodoLabel } from '../lib/format'
import { useAcervoPronto, useArquivos, type Arquivo } from '../lib/store'
import { useTermo } from '../lib/useTermo'

// Cor de cada autora (as demais caem no tom neutro)
const TOM: Record<string, { tab: string; card: string; nome: string; avatar: string }> = {
  'JÚLIA MORBECK': { tab: 'bg-pink-500', card: 'bg-pink-50', nome: 'text-pink-800', avatar: 'from-pink-200 to-pink-400 text-pink-900' },
  'MARIA VITÓRIA': { tab: 'bg-cyan-500', card: 'bg-cyan-50', nome: 'text-cyan-800', avatar: 'from-cyan-200 to-sky-400 text-cyan-950' },
}
const NEUTRO = { tab: 'bg-teal-600', card: 'bg-teal-50', nome: 'text-teal-800', avatar: 'from-teal-200 to-teal-400 text-teal-950' }
const iniciais = (n: string) => n.split(/\s+/).map((p) => p[0]).slice(0, 2).join('')
const titulo = (n: string) => limpa(n).toLowerCase().replace(/(^|\s)\p{L}/gu, (c) => c.toUpperCase())

// pasta com uma única subpasta e nenhum arquivo ("SOI/SOI V/…"): desce direto
const desce = (n: Pasta) => { while (n.filhas.size === 1 && !n.arquivos.length) n = [...n.filhas.values()][0]; return n }

// Resumos do período separados por autora: ?periodo=5&modulo=SOI, depois &autor=…&pasta=… (relativa à autora)
export default function Resumos() {
  const [params, setParams] = useSearchParams()
  const arquivos = useArquivos()
  const pronto = useAcervoPronto()
  const [open, setOpen] = useState<Arquivo>()
  const periodo = Number(params.get('periodo')), modulo = params.get('modulo') ?? '', disc = params.get('disciplina') ?? ''
  const autor = params.get('autor') ?? '', sub = params.get('pasta') ?? ''
  const [campo, setCampo, term] = useTermo()
  const set = (p: Record<string, string>) => setParams((cur) => {
    for (const [k, v] of Object.entries(p)) { if (v) cur.set(k, v); else cur.delete(k) }
    return cur
  }, { replace: 'q' in p })

  if (!pronto) return <Empty>Carregando o acervo…</Empty>
  const raiz = arvore(arquivos)
  const per = pastaDoPeriodo(raiz, periodo)
  const resumos = per && [...per.filhas.values()].find((k) => /RESUMOS/.test(k.nome))
  // pasta de cada autora já no módulo pedido ("JÚLIA MORBECK/SOI")
  const autoras = [...(resumos?.filhas.values() ?? [])].map((a) => {
    const base = modulo ? [...a.filhas.values()].find((k) => limpa(k.nome) === modulo) : a
    return { nome: limpa(a.nome), base, n: base ? todos(base).length : 0 }
  }).filter((a) => a.n > 0)
  const nomeTela = disc || (modulo ? `${modulo} ${periodo}` : periodoLabel(periodo))

  const cab = (
    <div className="mb-8 flex flex-col items-center gap-3">
      <h1 className="rounded-2xl bg-[#c80e58] px-6 py-3 text-center font-display text-2xl font-bold uppercase shadow-[0_6px_0_#000] sm:text-3xl">
        {nomeTela} : Materiais
      </h1>
      {!modulo && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
            <button key={p} onClick={() => set({ periodo: String(p), autor: '', pasta: '', q: '' })}
              className={`rounded-full border px-3 py-1 text-xs font-bold ${p === periodo ? 'border-white bg-white text-black' : 'border-white/20 text-zinc-400 hover:text-white'}`}>{p}º</button>
          ))}
        </div>
      )}
    </div>
  )
  if (!autoras.length) return <>{cab}<Empty>Nenhum resumo encontrado para {nomeTela}.</Empty></>

  const atual = autoras.find((a) => a.nome === autor)
  if (!atual) {
    return (
      <section className="rounded-[1.75rem] border-2 border-ink bg-[#0b0b12] p-5 sm:p-8">
        {cab}
        <div className={`grid gap-x-8 gap-y-10 ${autoras.length > 1 ? 'md:grid-cols-2' : 'mx-auto max-w-lg'}`}>
          {autoras.map((a) => {
            const t = TOM[a.nome] ?? NEUTRO
            return (
              <div key={a.nome} className="relative pt-7">
                {/* folhas atrás do cartão e a aba "Materiais" */}
                <div className="absolute top-4 right-2 left-48 h-24 rounded-t-lg border-2 border-black bg-zinc-200" />
                <div className="absolute top-2 right-4 left-52 h-24 rounded-t-lg border-2 border-black bg-zinc-100" />
                <span className={`absolute top-0 left-0 z-10 rounded-t-xl border-2 border-b-0 border-black px-6 py-1.5 text-sm font-extrabold text-black uppercase ${t.tab}`}>Materiais</span>
                <div className={`relative z-10 rounded-2xl rounded-tl-none border-[3px] border-black p-6 text-black shadow-[6px_6px_0_#000] ${t.card}`}>
                  <div className="flex items-center gap-5">
                    <span className={`grid size-20 shrink-0 place-items-center rounded-full border-[3px] border-black bg-gradient-to-br font-display text-2xl font-extrabold shadow-[3px_3px_0_#000] ${t.avatar}`}>{iniciais(a.nome)}</span>
                    <span className="min-w-0">
                      <span className={`block font-display text-2xl font-extrabold leading-tight sm:text-3xl ${t.nome}`}>{titulo(a.nome)}</span>
                      <span className="text-sm font-semibold text-zinc-600">{a.n} PDFs</span>
                    </span>
                  </div>
                  <div className="my-5 h-px bg-black/10" />
                  <div className="flex justify-end">
                    <button onClick={() => set({ autor: a.nome, pasta: '', q: '' })}
                      className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-6 py-2.5 font-extrabold uppercase shadow-[3px_3px_0_#000] transition hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0_#000]">
                      Acessar pasta <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    )
  }

  const base = atual.base!
  const pasta = desce(pastaEm(raiz, sub ? `${base.path}/${sub}` : base.path) ?? base)
  const rel = (p: Pasta) => p.path.slice(base.path.length + 1)
  const words = normalize(term).split(/\s+/).filter(Boolean)
  const achados = words.length ? todos(pasta).filter((a) => words.every((w) => normalize(a.path).includes(w))) : []
  const filhas = [...pasta.filhas.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt', { numeric: true }))
  const arqs = [...pasta.arquivos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt', { numeric: true }))
  const t = TOM[atual.nome] ?? NEUTRO
  const trilha = rel(pasta) ? rel(pasta).split('/') : []

  return (
    <section className="rounded-[1.75rem] border-2 border-ink bg-[#0b0b12] p-5 sm:p-8">
      {cab}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button onClick={() => set({ autor: '', pasta: '', q: '' })}
          className={`inline-flex items-center gap-2 rounded-xl border-2 border-black px-3 py-1.5 font-extrabold text-black shadow-[3px_3px_0_#000] ${t.card}`}>
          <span className={`grid size-8 place-items-center rounded-full border-2 border-black bg-gradient-to-br text-xs ${t.avatar}`}>{iniciais(atual.nome)}</span>
          {titulo(atual.nome)}
        </button>
        <nav className="flex flex-wrap items-center gap-1 text-sm text-mute">
          {trilha.map((s, i) => (
            <span key={i} className="flex items-center gap-1"><ChevronRight className="size-3.5" />
              <button className="hover:text-ink" onClick={() => set({ pasta: trilha.slice(0, i + 1).join('/'), q: '' })}>{limpa(s)}</button>
            </span>
          ))}
        </nav>
      </div>
      <label className="relative mb-6 block">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-mute" />
        <input className="input h-11 rounded-xl pl-10" placeholder="Buscar nos materiais…" value={campo} onChange={(e) => setCampo(e.target.value)} />
      </label>

      {words.length ? (
        achados.length ? <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">{achados.map((a) => <ArquivoRow key={a.id} a={a} onOpen={setOpen} />)}</ul>
          : <Empty>Nada encontrado.</Empty>
      ) : (
        <>
          {filhas.length > 0 && (
            <div className="mb-8 grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {filhas.map((k) => (
                <div key={k.path} className="relative pt-5">
                  <span className="absolute top-0 left-3 z-10 rounded-t-lg border-2 border-b-0 border-black bg-[#c2410c] px-3 py-0.5 text-[11px] font-extrabold text-white uppercase">{todos(k).length} PDFs</span>
                  <div className="relative z-10 flex h-full flex-col gap-3 rounded-2xl border-[3px] border-black bg-gradient-to-b from-[#f6c453] to-[#eaa93a] p-4 shadow-[5px_5px_0_#000]">
                    <span className="flex items-center gap-3 rounded-xl border-2 border-black bg-white px-3 py-3 text-black">
                      <FileText className="size-6 shrink-0 text-[#c80e58]" />
                      <b className="font-display text-lg leading-tight uppercase">{limpa(k.nome)}</b>
                    </span>
                    <button onClick={() => set({ pasta: rel(desce(k)), q: '' })}
                      className="mt-auto inline-flex items-center justify-center gap-1.5 self-center rounded-full border-2 border-black bg-white px-4 py-1.5 text-xs font-extrabold text-black uppercase shadow-[2px_2px_0_#000]">
                      Acessar pasta <ChevronRight className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {arqs.length > 0 && (
            <>
              {filhas.length > 0 && <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-mute">Documentos gerais</h2>}
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">{arqs.map((a) => <ArquivoRow key={a.id} a={a} onOpen={setOpen} />)}</ul>
            </>
          )}
        </>
      )}
      <p className="mt-6 text-center text-xs text-mute">
        <Link to={`/app/acervo?pasta=${encodeURIComponent(base.path)}`} className="hover:text-ink">Ver no acervo do Drive</Link>
      </p>
      {open && <PdfViewer arquivo={open} onClose={() => setOpen(undefined)} />}
    </section>
  )
}
