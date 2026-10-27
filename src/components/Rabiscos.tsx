import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronRight, Eraser, Highlighter, MousePointer2, Redo2, Trash2, Undo2 } from 'lucide-react'

// Rabiscos por cima da questão (como num tablet). Coordenadas normalizadas pela largura da área,
// para sobreviverem a mudanças de tamanho da janela. Ficam no navegador, por prova e questão.
type Traco = { c: string; p: number[] } // p = [x0, y0, x1, y1, …] / largura
const CORES = ['#facc15', '#ef4444', '#22d3ee', '#4ade80']
const chave = (prova: string) => `acervo:rabiscos:${prova}`
const ler = (prova: string): Record<string, Traco[]> => { try { return JSON.parse(localStorage.getItem(chave(prova)) || '{}') } catch { return {} } }
const gravar = (prova: string, v: Record<string, Traco[]>) => { try { localStorage.setItem(chave(prova), JSON.stringify(v)) } catch { /* cota cheia */ } }

export function Rabiscos({ prova, questao, ativo, onSair, children }: {
  prova: string; questao: string; ativo: boolean; onSair: () => void; children: ReactNode
}) {
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [tracos, setTracos] = useState<Traco[]>(() => ler(prova)[questao] ?? [])
  const [refazer, setRefazer] = useState<Traco[]>([])
  const [ferramenta, setFerramenta] = useState<'caneta' | 'borracha'>('caneta')
  const [cor, setCor] = useState(CORES[0])
  const atual = useRef<Traco | null>(null)

  const salvar = (t: Traco[]) => { setTracos(t); const v = ler(prova); v[questao] = t; gravar(prova, v) }

  const desenhar = useCallback(() => {
    const cv = canvas.current, el = box.current
    if (!cv || !el) return
    const w = el.clientWidth, h = el.scrollHeight, dpr = window.devicePixelRatio || 1
    if (cv.width !== w * dpr || cv.height !== h * dpr) { cv.width = w * dpr; cv.height = h * dpr; cv.style.width = `${w}px`; cv.style.height = `${h}px` }
    const ctx = cv.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 14; ctx.globalAlpha = 0.4
    for (const t of [...tracos, ...(atual.current ? [atual.current] : [])]) {
      ctx.strokeStyle = t.c; ctx.beginPath()
      for (let i = 0; i < t.p.length; i += 2) (i ? ctx.lineTo : ctx.moveTo).call(ctx, t.p[i] * w, t.p[i + 1] * w)
      ctx.stroke()
    }
  }, [tracos])

  useEffect(() => { desenhar() }, [desenhar])
  useEffect(() => {
    const ro = new ResizeObserver(desenhar)
    if (box.current) ro.observe(box.current)
    return () => ro.disconnect()
  }, [desenhar])

  const ponto = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect(), w = box.current!.clientWidth
    return [(e.clientX - r.left) / w, (e.clientY - r.top) / w]
  }
  const apagarPerto = (x: number, y: number) => {
    const raio = 18 / box.current!.clientWidth
    const resto = tracos.filter((t) => !t.p.some((v, i) => i % 2 === 0 && Math.hypot(v - x, t.p[i + 1] - y) < raio))
    if (resto.length !== tracos.length) salvar(resto)
  }
  const down = (e: React.PointerEvent) => {
    if (!ativo) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const [x, y] = ponto(e)
    if (ferramenta === 'borracha') { apagarPerto(x, y); return }
    atual.current = { c: cor, p: [x, y] }
  }
  const move = (e: React.PointerEvent) => {
    if (!ativo || e.buttons !== 1) return
    const [x, y] = ponto(e)
    if (ferramenta === 'borracha') { apagarPerto(x, y); return }
    if (atual.current) { atual.current.p.push(x, y); desenhar() }
  }
  const up = () => {
    if (atual.current && atual.current.p.length > 2) { salvar([...tracos, atual.current]); setRefazer([]) }
    atual.current = null
  }

  const btn = 'grid size-11 place-items-center rounded-xl transition hover:bg-white/10'
  return (
    <div ref={box} className="relative">
      {children}
      <canvas ref={canvas} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        className={`absolute inset-0 z-10 touch-none ${ativo ? (ferramenta === 'borracha' ? 'cursor-cell' : 'cursor-crosshair') : 'pointer-events-none'}`} />
      {ativo && (
        <div className="fixed top-1/2 right-3 z-40 flex -translate-y-1/2 flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-[#16171d] p-2 shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
          <button className={btn} onClick={onSair} title="Voltar a responder" aria-label="Voltar a responder"><MousePointer2 className="size-5" /></button>
          <button className={`${btn} ${ferramenta === 'caneta' ? 'bg-white/10' : ''}`} onClick={() => setFerramenta('caneta')} title="Marca-texto" aria-label="Marca-texto"><Highlighter className="size-5" /></button>
          <div className="grid grid-cols-2 gap-1.5 py-1">
            {CORES.map((c) => (
              <button key={c} onClick={() => { setCor(c); setFerramenta('caneta') }} aria-label={`Cor ${c}`}
                className={`size-7 rounded-full transition ${cor === c && ferramenta === 'caneta' ? 'ring-2 ring-white ring-offset-2 ring-offset-[#16171d]' : ''}`} style={{ background: c }} />
            ))}
          </div>
          <button className={`${btn} ${ferramenta === 'borracha' ? 'bg-white/10' : ''}`} onClick={() => setFerramenta('borracha')} title="Borracha" aria-label="Borracha"><Eraser className="size-5" /></button>
          <span className="my-1 h-px w-8 bg-white/10" />
          <span className="flex">
            <button className={`${btn} size-9 disabled:opacity-30`} disabled={!tracos.length} aria-label="Desfazer"
              onClick={() => { setRefazer([tracos[tracos.length - 1], ...refazer]); salvar(tracos.slice(0, -1)) }}><Undo2 className="size-4" /></button>
            <button className={`${btn} size-9 disabled:opacity-30`} disabled={!refazer.length} aria-label="Refazer"
              onClick={() => { salvar([...tracos, refazer[0]]); setRefazer(refazer.slice(1)) }}><Redo2 className="size-4" /></button>
          </span>
          <button className={`${btn} text-red-500`} onClick={() => { setRefazer([]); salvar([]) }} title="Apagar tudo" aria-label="Apagar tudo"><Trash2 className="size-5" /></button>
          <span className="my-1 h-px w-8 bg-white/10" />
          <button className={btn} onClick={onSair} title="Fechar" aria-label="Fechar"><ChevronRight className="size-5" /></button>
        </div>
      )}
    </div>
  )
}
