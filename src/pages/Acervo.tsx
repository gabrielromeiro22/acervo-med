import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ExternalLink, FileText, Folder, X } from 'lucide-react'
import { Empty, PageHeader, Select } from '../components/ui'
import { normalize, uniq } from '../lib/format'
import { useAcervoPronto, useArquivos, type Arquivo } from '../lib/store'

const TIPO: Record<string, string> = {
  prova: 'Prova', gabarito: 'Gabarito', comentada: 'Comentada', recurso: 'Recurso', resumo: 'Resumo',
  assuntos: 'Assuntos', repetidas: 'Repetidas', imagem: 'Imagem',
}
const AREAS = [
  { value: 'p1', label: '1º período' }, { value: 'p2', label: '2º período' }, { value: 'p3', label: '3º período' },
  { value: 'p4', label: '4º período' }, { value: 'p5', label: '5º período' }, { value: 'p6', label: '6º período' },
  { value: 'p7', label: '7º período' }, { value: 'p8', label: '8º período' },
  { value: 'internato', label: 'Internato' }, { value: 'tpi', label: 'TPI' }, { value: 'enamed', label: 'ENAMED' },
]
const inArea = (a: Arquivo, v: string) => !v || (v.startsWith('p') ? a.area === 'periodo' && a.periodo === +v.slice(1) : a.area === v)
// "✅[4º PERÍODO]/📄 RESUMOS 4/JÚLIA MORBECK/SOI" → "4º PERÍODO › RESUMOS 4 › JÚLIA MORBECK › SOI"
const pasta = (p: string) => p.split('/').slice(0, -1).map((s) => s.replace(/[✅🔍📄🎯🆕[\]]/gu, '').trim()).join(' › ')
const MAX = 400

export default function Acervo() {
  const [params, setParams] = useSearchParams()
  const files = useArquivos()
  const pronto = useAcervoPronto()
  const [open, setOpen] = useState<Arquivo>()
  const area = params.get('area') ?? '', tipo = params.get('tipo') ?? '', term = params.get('q') ?? ''
  const set = (k: string, v: string) => setParams((p) => { if (v) p.set(k, v); else p.delete(k); return p }, { replace: true })

  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(undefined)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [open])

  const scoped = useMemo(() => files.filter((a) => inArea(a, area)), [files, area])
  const shown = useMemo(() => {
    const words = normalize(term).split(/\s+/).filter(Boolean)
    return scoped.filter((a) => (!tipo || a.tipo === tipo) && words.every((w) => normalize(a.path).includes(w)))
  }, [scoped, tipo, term])
  const groups = useMemo(() => {
    const m = new Map<string, Arquivo[]>()
    for (const a of shown.slice(0, MAX)) { const k = pasta(a.path); m.set(k, [...(m.get(k) ?? []), a]) }
    return [...m]
  }, [shown])
  const tipos = uniq(scoped.map((a) => a.tipo))

  if (!pronto) return <><PageHeader title="Acervo" /><Empty>Carregando o acervo…</Empty></>
  if (!files.length) return <><PageHeader title="Acervo" /><Empty>Acervo vazio. Rode <code>npm run acervo</code> para baixar e processar os arquivos.</Empty></>

  return (
    <>
      <PageHeader title="Acervo" sub={`${files.length} arquivos · provas, gabaritos e resumos por período`} />

      <div className="mb-4 grid gap-3 sm:grid-cols-[12rem_1fr]">
        <Select label="Período / área" value={area} onChange={(v) => set('area', v)} options={[{ value: '', label: 'Tudo' }, ...AREAS]} />
        <label className="block">
          <span className="label">Buscar</span>
          <input className="input" placeholder="Ex.: SOI 4 2025, pré-natal, gabarito…" value={term} onChange={(e) => set('q', e.target.value)} />
        </label>
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {[['', 'Todos'] as const, ...tipos.map((t) => [t, TIPO[t] ?? t] as const)].map(([v, label]) => (
          <button key={label} onClick={() => set('tipo', v)}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
              tipo === v ? 'border-ink bg-ink text-bg' : 'border-line text-mute hover:text-ink'
            }`}>
            {label} <span className="tabular-nums opacity-70">{(v ? scoped.filter((a) => a.tipo === v) : scoped).length}</span>
          </button>
        ))}
      </div>

      {!groups.length ? <Empty>Nada encontrado.</Empty> : groups.map(([dir, xs]) => (
        <section key={dir} className="mb-6">
          <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-mute"><Folder className="size-3.5" /> {dir || 'Raiz'}</h2>
          <ul className="card divide-y divide-line overflow-hidden">
            {xs.map((a) => (
              <li key={a.id}>
                <button onClick={() => setOpen(a)} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-white/5">
                  <FileText className="size-4 shrink-0 text-mute" />
                  <span className="min-w-0 flex-1 truncate">{a.nome}</span>
                  {a.semestre && <span className="chip hidden sm:inline-flex">{a.semestre}</span>}
                  <span className="chip">{TIPO[a.tipo] ?? a.tipo}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {shown.length > MAX && <p className="text-center text-sm text-mute">Mostrando {MAX} de {shown.length}. Refine a busca para ver o resto.</p>}

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-bg/95 p-3 backdrop-blur sm:p-5" role="dialog" aria-label={open.nome}>
          <div className="mb-3 flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate font-semibold">{open.nome}</p>
            <a className="btn-ghost" href={`https://drive.google.com/file/d/${open.id}/view`} target="_blank" rel="noopener"><ExternalLink className="size-4" /> <span className="hidden sm:inline">Abrir no Drive</span></a>
            <button className="btn-ghost" onClick={() => setOpen(undefined)} aria-label="Fechar"><X className="size-4" /></button>
          </div>
          <iframe title={open.nome} src={`https://drive.google.com/file/d/${open.id}/preview`} className="w-full flex-1 rounded-xl border border-line bg-white" allow="autoplay" />
        </div>
      )}
    </>
  )
}
