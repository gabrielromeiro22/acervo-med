import { useState } from 'react'
import { Check, ChevronDown, ClipboardPaste, GripVertical, Plus, Trash2, X } from 'lucide-react'
import { Bar, Empty } from '../components/ui'
import { pct } from '../lib/format'
import { setState, uid, useStore, type GradeItem, type GradeModulo } from '../lib/store'

const PERIODOS = Array.from({ length: 12 }, (_, i) => i + 1)
const fmtDia = (d: string) => new Date(`${d}T12:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })

function updateModulo(id: string, fn: (m: GradeModulo) => GradeModulo) {
  setState((s) => ({ ...s, grade: s.grade.map((m) => (m.id === id ? fn(m) : m)) }))
}
function updateItem(mid: string, iid: string, p: Partial<GradeItem>) {
  updateModulo(mid, (m) => ({ ...m, itens: m.itens.map((it) => (it.id === iid ? { ...it, ...p } : it)) }))
}

export default function Grade() {
  const grade = useStore((s) => s.grade)
  const periodo = useStore((s) => s.periodo) ?? 1
  const modulos = grade.filter((m) => m.periodo === periodo)
  const [tab, setTab] = useState<string>()
  const atual = modulos.find((m) => m.id === tab) ?? modulos[0]
  const [novoModulo, setNovoModulo] = useState<string | null>(null)

  const addModulo = () => {
    const nome = novoModulo?.trim()
    if (!nome) return setNovoModulo(null)
    const m: GradeModulo = { id: uid(), nome, periodo, itens: [] }
    setState((s) => ({ ...s, grade: [...s.grade, m] }))
    setTab(m.id)
    setNovoModulo(null)
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Grade acadêmica</h1>
        <select className="input w-auto font-semibold" value={periodo} aria-label="Período"
          onChange={(e) => { setState((s) => ({ ...s, periodo: Number(e.target.value) })); setTab(undefined) }}>
          {PERIODOS.map((p) => <option key={p} value={p}>{p}º período</option>)}
        </select>
      </div>

      <div className="mb-6 flex flex-wrap gap-1 rounded-2xl border border-line bg-panel p-1.5">
        {modulos.map((m) => (
          <button key={m.id} onClick={() => setTab(m.id)}
            className={`min-w-28 flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${m.id === atual?.id ? 'bg-[#c8285a] text-white shadow-[2px_2px_0_#000]' : 'text-mute hover:text-ink'}`}>
            {m.nome}
          </button>
        ))}
        {novoModulo !== null ? (
          <span className="flex flex-1 gap-1">
            <input className="input" placeholder="Ex.: Tutoria 5" autoFocus value={novoModulo}
              onChange={(e) => setNovoModulo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addModulo(); if (e.key === 'Escape') setNovoModulo(null) }} />
            <button className="btn-primary px-3" onClick={addModulo}><Check className="size-4" /></button>
          </span>
        ) : (
          <button className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm text-mute hover:bg-white/5 hover:text-ink" onClick={() => setNovoModulo('')}>
            <Plus className="size-4" /> Módulo
          </button>
        )}
      </div>

      {!atual ? (
        <Empty>
          Nenhum módulo no {periodo}º período.
          <span className="mt-1 block text-sm">Crie um módulo (ex.: tutoria, habilidades, integração) e cadastre os tópicos do seu semestre.</span>
        </Empty>
      ) : (
        <Modulo key={atual.id} m={atual} />
      )}
    </>
  )
}

function Modulo({ m }: { m: GradeModulo }) {
  const [open, setOpen] = useState<string>()
  const [drag, setDrag] = useState<number>()
  const [confirm, setConfirm] = useState<'' | 'reset' | 'apagar'>('')
  const [colar, setColar] = useState<string | null>(null)
  const [novo, setNovo] = useState({ codigo: '', titulo: '' })

  const total = m.itens.length
  const feitos = m.itens.filter((it) => it.presenca === 'presente').length
  const faltas = m.itens.filter((it) => it.presenca === 'falta').length
  const nextCode = (k: number) => `Tópico ${String(total + k + 1).padStart(2, '0')}`

  const add = (itens: Omit<GradeItem, 'id' | 'notas'>[]) =>
    updateModulo(m.id, (x) => ({ ...x, itens: [...x.itens, ...itens.map((it) => ({ ...it, id: uid(), notas: '' }))] }))

  const addOne = () => {
    if (!novo.titulo.trim()) return
    add([{ codigo: novo.codigo.trim() || nextCode(0), titulo: novo.titulo.trim() }])
    setNovo({ codigo: '', titulo: '' })
  }
  // Uma linha por tópico; "CÓDIGO - título" ou "CÓDIGO: título" separa o código.
  const addLista = () => {
    const linhas = (colar ?? '').split('\n').map((l) => l.trim()).filter(Boolean)
    add(linhas.map((l, k) => {
      const mm = l.match(/^(.{1,14}?)\s*[-:–]\s+(.+)$/)
      return mm ? { codigo: mm[1], titulo: mm[2] } : { codigo: nextCode(k), titulo: l }
    }))
    setColar(null)
  }
  const move = (from: number, to: number) => updateModulo(m.id, (x) => {
    const itens = [...x.itens]
    itens.splice(to, 0, ...itens.splice(from, 1))
    return { ...x, itens }
  })
  const doConfirm = () => {
    if (confirm === 'reset') updateModulo(m.id, (x) => ({ ...x, itens: x.itens.map((it) => ({ ...it, presenca: undefined })) }))
    if (confirm === 'apagar') setState((s) => ({ ...s, grade: s.grade.filter((x) => x.id !== m.id) }))
    setConfirm('')
  }

  return (
    <>
      <div className="card mb-5 flex flex-wrap items-center gap-4 p-4">
        <span className="text-sm font-semibold tabular-nums">{feitos}/{total} marcadas</span>
        {faltas > 0 && <span className="chip border-danger/40 text-danger">{faltas} falta(s)</span>}
        <div className="min-w-32 flex-1"><Bar value={pct(feitos, total)} /></div>
        <span className="text-sm font-semibold tabular-nums">{pct(feitos, total)}%</span>
        {confirm ? (
          <span className="flex items-center gap-2 text-sm">
            {confirm === 'reset' ? 'Desmarcar tudo?' : `Apagar o módulo ${m.nome}?`}
            <button className="btn-ghost px-3 py-1" onClick={() => setConfirm('')}>Não</button>
            <button className="btn border border-danger px-3 py-1 text-danger hover:bg-danger/10" onClick={doConfirm}>Sim</button>
          </span>
        ) : (
          <span className="flex gap-2">
            <button className="btn bg-warn px-3 py-1 text-bg hover:brightness-110" onClick={() => setConfirm('reset')} disabled={!feitos && !faltas}>Reset</button>
            <button className="rounded-full p-2 text-mute hover:bg-white/5 hover:text-danger" onClick={() => setConfirm('apagar')} aria-label="Apagar módulo"><Trash2 className="size-4" /></button>
          </span>
        )}
      </div>

      <ul className="space-y-3">
        {m.itens.map((it, i) => {
          const tone = it.presenca === 'presente' ? 'border-accent/40 bg-accent/10' : it.presenca === 'falta' ? 'border-danger/40 bg-danger/10' : 'border-line bg-panel'
          return (
            <li key={it.id} draggable onDragStart={() => setDrag(i)} onDragEnd={() => setDrag(undefined)}
              onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag !== undefined && drag !== i) move(drag, i); setDrag(undefined) }}
              className={`rounded-2xl border transition ${tone} ${drag === i ? 'opacity-40' : ''}`}>
              <div className="flex flex-wrap items-center gap-3 p-3 sm:p-4">
                <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setOpen(open === it.id ? undefined : it.id)}>
                  <span className="shrink-0 rounded-full border border-[#c8285a] bg-[#c8285a] px-2 py-0.5 text-[11px] font-bold uppercase text-white">{it.codigo}</span>
                  <span className="min-w-0 font-semibold">{it.titulo}</span>
                  <ChevronDown className={`size-4 shrink-0 text-mute transition ${open === it.id ? 'rotate-180' : ''}`} />
                </button>
                {it.presenca ? (
                  <span className="ml-auto flex items-center gap-3">
                    <span className="text-sm font-semibold">{it.presenca === 'falta' ? 'Faltei' : ''}{it.data ? `${it.presenca === 'falta' ? ' · ' : ''}${fmtDia(it.data)}` : ''}</span>
                    <button onClick={() => updateItem(m.id, it.id, { presenca: undefined })} aria-label="Desmarcar"
                      className={`grid size-9 place-items-center rounded-full text-bg shadow-[2px_2px_0_#000] ${it.presenca === 'presente' ? 'bg-accent' : 'bg-danger'}`}>
                      {it.presenca === 'presente' ? <Check className="size-5" /> : <X className="size-5" />}
                    </button>
                  </span>
                ) : (
                  <span className="ml-auto flex flex-wrap items-center gap-2">
                    <input type="date" className="input w-36 py-1.5" value={it.data ?? ''} aria-label="Data da aula"
                      onChange={(e) => updateItem(m.id, it.id, { data: e.target.value || undefined })} />
                    <button className="btn border border-accent/50 px-3 py-1.5 text-accent hover:bg-accent/10"
                      onClick={() => updateItem(m.id, it.id, { presenca: 'presente', data: it.data ?? new Date().toLocaleDateString('sv-SE') })}>
                      <Check className="size-4" /> Presente
                    </button>
                    <button className="btn border border-danger/50 px-3 py-1.5 text-danger hover:bg-danger/10"
                      onClick={() => updateItem(m.id, it.id, { presenca: 'falta' })}>
                      <X className="size-4" /> Faltei
                    </button>
                  </span>
                )}
                <GripVertical className="hidden size-4 shrink-0 cursor-grab text-mute sm:block" aria-hidden />
              </div>
              {open === it.id && (
                <div className="border-t border-line p-4">
                  <div className="mb-3 grid gap-2 sm:grid-cols-[9rem_1fr]">
                    <input className="input" value={it.codigo} aria-label="Código" onChange={(e) => updateItem(m.id, it.id, { codigo: e.target.value })} />
                    <input className="input" value={it.titulo} aria-label="Título" onChange={(e) => updateItem(m.id, it.id, { titulo: e.target.value })} />
                  </div>
                  <textarea className="input min-h-28 leading-relaxed" placeholder="Objetivos de aprendizagem, referências, anotações da aula…"
                    value={it.notas} onChange={(e) => updateItem(m.id, it.id, { notas: e.target.value })} />
                  <button className="mt-2 inline-flex items-center gap-1.5 text-xs text-mute hover:text-danger"
                    onClick={() => updateModulo(m.id, (x) => ({ ...x, itens: x.itens.filter((y) => y.id !== it.id) }))}>
                    <Trash2 className="size-3.5" /> Remover tópico
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <div className="card mt-5 p-4">
        {colar !== null ? (
          <>
            <textarea className="input min-h-36 font-mono text-xs" autoFocus value={colar} onChange={(e) => setColar(e.target.value)}
              placeholder={'Um tópico por linha. Ex.:\nAPG 01 - Título do primeiro tópico\nAPG 02 - Título do segundo tópico'} />
            <div className="mt-2 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setColar(null)}>Cancelar</button>
              <button className="btn-primary" onClick={addLista}>Adicionar {colar.split('\n').filter((l) => l.trim()).length} tópico(s)</button>
            </div>
          </>
        ) : (
          <div className="grid gap-2 sm:grid-cols-[9rem_1fr_auto_auto]">
            <input className="input" placeholder={nextCode(0)} value={novo.codigo} onChange={(e) => setNovo({ ...novo, codigo: e.target.value })} aria-label="Código" />
            <input className="input" placeholder="Título do tópico" value={novo.titulo} onChange={(e) => setNovo({ ...novo, titulo: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && addOne()} aria-label="Título" />
            <button className="btn-primary" onClick={addOne}><Plus className="size-4" /> Adicionar</button>
            <button className="btn-ghost" onClick={() => setColar('')}><ClipboardPaste className="size-4" /> Colar lista</button>
          </div>
        )}
      </div>
    </>
  )
}
