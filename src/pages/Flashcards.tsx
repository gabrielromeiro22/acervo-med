import { useEffect, useState, type ReactNode } from 'react'
import { ArrowUp, GraduationCap, Layers, Pencil, Play, Plus, RotateCcw, Trash2 } from 'lucide-react'
import type { Flashcard } from '../data/types'
import { fmtDate, sortDisc, uniq } from '../lib/format'
import { reviewCard, setState, uid, useFlashcards, useStore, type Deck } from '../lib/store'
import { RichText } from '../components/RichText'

const MAX_DECKS = 30

type Sel = { k: 'estudar' } | { k: 'deck'; id: string } | { k: 'disc'; nome: string }

const isDue = (srs: Record<string, { due: number }>, c: Flashcard, now: number) => !srs[c.id] || srs[c.id].due <= now

function patchDeck(id: string, fn: (d: Deck) => Deck) {
  setState((s) => ({ ...s, decks: s.decks.map((d) => (d.id === id ? fn(d) : d)) }))
}

export default function Flashcards() {
  const cards = useFlashcards()
  const decks = useStore((s) => s.decks)
  const srs = useStore((s) => s.srs)
  const [sel, setSel] = useState<Sel>(() => ({ k: 'estudar' }))
  const [nomeNovo, setNomeNovo] = useState<string | null>(null)

  const now = Date.now()
  const acervo = uniq(cards.filter((c) => !c.deck).map((c) => c.disciplina)).sort(sortDisc)
  const deck = sel.k === 'deck' ? decks.find((d) => d.id === sel.id) : undefined

  const criar = () => {
    const nome = nomeNovo?.trim()
    setNomeNovo(null)
    if (!nome || decks.length >= MAX_DECKS) return
    const d: Deck = { id: uid(), nome, createdAt: Date.now(), cards: [] }
    setState((s) => ({ ...s, decks: [...s.decks, d] }))
    setSel({ k: 'deck', id: d.id })
  }

  const item = (active: boolean) =>
    `flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${active ? 'bg-accent/10 font-semibold text-accent' : 'text-mute hover:bg-white/5 hover:text-ink'}`
  const dueBadge = (pool: Flashcard[]) => {
    const n = pool.filter((c) => isDue(srs, c, now)).length
    return <span className="shrink-0 text-xs tabular-nums opacity-70">{n}/{pool.length}</span>
  }

  return (
    <div className="-mx-4 -mt-20 -mb-10 grid min-h-dvh md:grid-cols-[16rem_1fr] lg:-mt-10">
      <aside className="flex flex-col gap-1 border-b border-line bg-panel/60 p-4 pt-20 md:border-r md:border-b-0">
        <div className="mb-3 px-1">
          <p className="text-sm font-bold uppercase tracking-[0.14em]">Meus flashcards</p>
          <p className="text-xs text-mute">Estude no seu ritmo.</p>
        </div>
        {nomeNovo !== null ? (
          <input className="input" placeholder="Nome do baralho" autoFocus value={nomeNovo}
            onChange={(e) => setNomeNovo(e.target.value)} onBlur={criar}
            onKeyDown={(e) => { if (e.key === 'Enter') criar(); if (e.key === 'Escape') setNomeNovo(null) }} />
        ) : (
          <button className="btn-ghost justify-start bg-ink/5" disabled={decks.length >= MAX_DECKS} onClick={() => setNomeNovo('')}>
            <Plus className="size-4" /> Novo baralho
          </button>
        )}
        <button className={`${item(sel.k === 'estudar')} mt-1`} onClick={() => setSel({ k: 'estudar' })}>
          <span className="flex items-center gap-2"><GraduationCap className="size-4" /> Estudar tudo</span>
          {dueBadge(cards)}
        </button>

        <p className="mt-4 mb-1 flex justify-between px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-mute">
          Baralhos <span className="tabular-nums">{decks.length}/{MAX_DECKS}</span>
        </p>
        {!decks.length && <p className="px-3 text-xs text-mute">Nenhum baralho ainda. Crie o primeiro acima.</p>}
        {decks.map((d) => (
          <button key={d.id} className={item(sel.k === 'deck' && sel.id === d.id)} onClick={() => setSel({ k: 'deck', id: d.id })}>
            <span className="truncate">{d.nome}</span>
            {dueBadge(cards.filter((c) => c.deck === d.id))}
          </button>
        ))}

        <p className="mt-4 mb-1 px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-mute">Do acervo</p>
        {acervo.map((nome) => (
          <button key={nome} className={item(sel.k === 'disc' && sel.nome === nome)} onClick={() => setSel({ k: 'disc', nome })}>
            <span className="truncate">{nome}</span>
            {dueBadge(cards.filter((c) => !c.deck && c.disciplina === nome))}
          </button>
        ))}
      </aside>

      <section className="min-w-0 p-4 pt-20 sm:p-6 sm:pt-20">
        {sel.k === 'estudar' && <Study title="Estudar tudo" sub="Cartões de todos os baralhos e do acervo" pool={cards} />}
        {sel.k === 'disc' && <Study title={sel.nome} sub="Flashcards do acervo" pool={cards.filter((c) => !c.deck && c.disciplina === sel.nome)} />}
        {sel.k === 'deck' && (deck
          ? <DeckView key={deck.id} deck={deck} pool={cards.filter((c) => c.deck === deck.id)} onDelete={() => setSel({ k: 'estudar' })} />
          : <Header title="Nenhum baralho" sub="Crie um baralho na coluna da esquerda" />)}
      </section>
    </div>
  )
}

function Header({ title, sub, action }: { title: string; sub: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="border-l-4 border-accent pl-3">
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        <p className="text-sm text-mute">{sub}</p>
      </div>
      {action}
    </div>
  )
}

function DeckView({ deck, pool, onDelete }: { deck: Deck; pool: Flashcard[]; onDelete: () => void }) {
  const [studying, setStudying] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [frente, setFrente] = useState<string | null>(null)
  const [text, setText] = useState('')

  if (studying) {
    return <Study title={deck.nome} sub="Estudando este baralho" pool={pool} back={() => setStudying(false)} />
  }

  // Enter registra a frente; o próximo Enter registra o verso e salva o cartão.
  const submit = () => {
    const t = text.trim()
    if (!t) return
    if (frente === null) { setFrente(t); setText(''); return }
    patchDeck(deck.id, (d) => ({ ...d, cards: [...d.cards, { id: uid(), frente, verso: t }] }))
    setFrente(null)
    setText('')
  }
  const remover = () => {
    setState((s) => ({ ...s, decks: s.decks.filter((d) => d.id !== deck.id) }))
    onDelete()
  }

  return (
    <div className="flex min-h-[calc(100dvh-9rem)] flex-col">
      <Header
        title={deck.nome}
        sub={`${deck.cards.length} cartão(ões) · criado em ${fmtDate(deck.createdAt)}`}
        action={
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" disabled={!pool.length} onClick={() => setStudying(true)}><Play className="size-4" /> Estudar</button>
            <button className="btn-ghost px-2.5" onClick={() => setRenaming(true)} aria-label="Renomear"><Pencil className="size-4" /></button>
            {confirm ? (
              <button className="btn border border-danger text-danger hover:bg-danger/10" onClick={remover}>Apagar baralho?</button>
            ) : (
              <button className="btn-ghost px-2.5 hover:text-danger" onClick={() => setConfirm(true)} aria-label="Apagar baralho"><Trash2 className="size-4" /></button>
            )}
          </div>
        }
      />

      {renaming && (
        <input className="input mb-4" autoFocus defaultValue={deck.nome}
          onBlur={(e) => { const v = e.target.value.trim(); if (v) patchDeck(deck.id, (d) => ({ ...d, nome: v })); setRenaming(false) }}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
      )}

      <div className="flex-1">
        {!deck.cards.length ? (
          <p className="py-16 text-center text-sm text-mute">Baralho vazio. Escreva a frente do primeiro cartão abaixo.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {deck.cards.map((c) => (
              <li key={c.id} className="card group relative p-4 text-sm">
                <p className="font-semibold">{c.frente}</p>
                <p className="mt-2 border-t border-line pt-2 text-mute">{c.verso}</p>
                <button className="absolute top-2 right-2 rounded-full p-1.5 text-mute opacity-0 transition group-hover:opacity-100 hover:text-danger"
                  onClick={() => patchDeck(deck.id, (d) => ({ ...d, cards: d.cards.filter((x) => x.id !== c.id) }))} aria-label="Excluir cartão">
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="sticky bottom-4 mx-auto mt-6 w-full max-w-2xl">
        <div className="rounded-3xl border border-line bg-panel-2 p-4 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.8)]">
          {frente !== null && (
            <p className="mb-2 rounded-xl bg-white/5 px-3 py-2 text-sm">
              <span className="label mb-0.5">Frente</span>{frente}
              <button className="ml-2 text-xs text-mute hover:text-ink" onClick={() => { setText(frente); setFrente(null) }}>editar</button>
            </p>
          )}
          <p className="label border-b border-line pb-1.5">{frente === null ? 'Frente' : 'Verso'}</p>
          <div className="flex items-end gap-2 pt-2">
            <textarea rows={1} className="max-h-40 min-h-10 flex-1 resize-none bg-transparent py-2 text-sm outline-none placeholder:text-mute/60"
              placeholder={frente === null ? 'Pergunta, termo ou conceito…' : 'Resposta…'} value={text} autoFocus
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }} />
            <button className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-bg disabled:bg-white/10 disabled:text-mute"
              disabled={!text.trim()} onClick={submit} aria-label="Registrar">
              <ArrowUp className="size-5" />
            </button>
          </div>
        </div>
        <p className="mt-2 text-center text-xs text-mute">Enter registra a {frente === null ? 'frente' : 'verso'} · Shift+Enter quebra linha</p>
      </div>
    </div>
  )
}

const GRADES = [
  { g: 0, label: 'Errei', cls: 'border-danger/50 text-danger hover:bg-danger/10' },
  { g: 1, label: 'Difícil', cls: 'border-warn/50 text-warn hover:bg-warn/10' },
  { g: 2, label: 'Bom', cls: 'border-accent/50 text-accent hover:bg-accent/10' },
  { g: 3, label: 'Fácil', cls: 'border-accent bg-accent/10 text-accent hover:bg-accent/20' },
] as const

function Study({ title, sub, pool, back }: { title: string; sub: string; pool: Flashcard[]; back?: () => void }) {
  const srs = useStore((s) => s.srs)
  const [livre, setLivre] = useState(false)
  const [i, setI] = useState(0)
  const [flip, setFlip] = useState(false)

  const now = Date.now()
  const queue = livre ? pool : pool.filter((c) => isDue(srs, c, now))
  const card = queue.length ? queue[livre ? i % queue.length : 0] : undefined
  const next = pool.map((c) => srs[c.id]?.due).filter((d): d is number => !!d && d > now).sort((a, b) => a - b)[0]
  const novos = pool.filter((c) => !srs[c.id]).length
  const maduros = pool.filter((c) => (srs[c.id]?.interval ?? 0) >= 21).length

  const grade = (g: 0 | 1 | 2 | 3) => {
    if (!card) return
    reviewCard(card.id, g)
    setFlip(false)
    if (livre) setI((x) => x + 1)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select')) return
      if (e.code === 'Space') { e.preventDefault(); setFlip((f) => !f) }
      else if (flip && ['1', '2', '3', '4'].includes(e.key)) grade((Number(e.key) - 1) as 0 | 1 | 2 | 3)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <>
      <Header title={title} sub={sub} action={back && <button className="btn-ghost" onClick={back}><Layers className="size-4" /> Ver cartões</button>} />

      <div className="mb-5 flex flex-wrap items-center gap-2 text-xs">
        <span className="chip">{pool.filter((c) => isDue(srs, c, now)).length} para hoje</span>
        <span className="chip">{novos} novos</span>
        <span className="chip">{maduros} maduros</span>
        <label className="ml-auto flex items-center gap-2 text-sm text-mute">
          <input type="checkbox" className="accent-accent" checked={livre} onChange={(e) => { setLivre(e.target.checked); setI(0); setFlip(false) }} />
          Revisão livre
        </label>
      </div>

      {!card ? (
        <p className="card border-dashed p-10 text-center text-mute">
          {pool.length ? 'Nada para revisar agora. 🎉' : 'Sem cartões aqui ainda.'}
          {next && <span className="mt-1 block text-sm">Próxima revisão em {fmtDate(next)}.</span>}
        </p>
      ) : (
        <div className="mx-auto max-w-2xl">
          <button onClick={() => setFlip((f) => !f)}
            className="card flex min-h-64 w-full flex-col items-center justify-center p-8 text-center transition hover:border-accent/40">
            <span className="chip mb-5">{card.disciplina} · {card.tema}</span>
            <p className="font-display text-xl font-semibold leading-snug sm:text-2xl"><RichText text={card.frente} /></p>
            {flip ? (
              <p className="mt-6 max-w-xl border-t border-line pt-6 leading-relaxed text-mute"><RichText text={card.verso} /></p>
            ) : (
              <span className="mt-6 inline-flex items-center gap-1.5 text-xs text-mute"><RotateCcw className="size-3.5" /> Clique ou aperte espaço para virar</span>
            )}
          </button>
          {flip && (
            <div className="mt-4 grid grid-cols-4 gap-2">
              {GRADES.map(({ g, label, cls }) => (
                <button key={g} onClick={() => grade(g)} className={`btn border ${cls}`}>
                  {label} <span className="hidden text-xs opacity-60 sm:inline">{g + 1}</span>
                </button>
              ))}
            </div>
          )}
          <p className="mt-3 text-center text-xs text-mute">{queue.length} cartão(ões) na fila</p>
        </div>
      )}
    </>
  )
}
