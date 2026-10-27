import { useEffect } from 'react'
import { Check, ExternalLink, Star, X } from 'lucide-react'
import { drivePreview, driveView, limpa } from '../lib/acervo'
import { abriuArquivo, toggleFavArquivo, toggleFeito, useStore, type Arquivo } from '../lib/store'

// PDF do Drive em tela cheia, com "marcar como feita" e favorito (como no Meu Acervo).
export function PdfViewer({ arquivo, onClose }: { arquivo: Arquivo; onClose: () => void }) {
  const feito = useStore((s) => s.feitos.includes(arquivo.id))
  const fav = useStore((s) => s.favArquivos.includes(arquivo.id))

  useEffect(() => { abriuArquivo(arquivo.id) }, [arquivo.id])
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  const btn = 'inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition'
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg p-3 sm:p-4" role="dialog" aria-label={arquivo.nome}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button className={`${btn} border-line bg-panel hover:bg-white/5`} onClick={onClose}><X className="size-4" /> Fechar</button>
        <p className="min-w-0 flex-1 truncate font-semibold">{limpa(arquivo.nome)}</p>
        <button onClick={() => toggleFeito(arquivo.id)}
          className={`${btn} ${feito ? 'border-accent bg-accent text-bg' : 'border-line bg-panel hover:bg-white/5'}`}>
          <Check className="size-4" /> {feito ? 'Feita' : 'Marcar como feita'}
        </button>
        <button onClick={() => toggleFavArquivo(arquivo.id)} aria-label={fav ? 'Remover dos favoritos' : 'Favoritar'}
          className={`${btn} ${fav ? 'border-warn bg-warn text-bg' : 'border-line bg-panel hover:bg-white/5'}`}>
          <Star className={`size-4 ${fav ? 'fill-bg' : ''}`} /> <span className="hidden sm:inline">Favorito</span>
        </button>
        <a className={`${btn} border-line bg-panel hover:bg-white/5`} href={driveView(arquivo.id)} target="_blank" rel="noopener">
          <ExternalLink className="size-4" /> <span className="hidden sm:inline">Abrir no Drive</span>
        </a>
      </div>
      <iframe title={arquivo.nome} src={drivePreview(arquivo.id)} className="w-full flex-1 rounded-2xl border border-line bg-white" allow="autoplay" />
    </div>
  )
}
