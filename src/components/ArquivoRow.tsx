import { Check, Star } from 'lucide-react'
import { caminhoDe, etiquetas, limpa } from '../lib/acervo'
import { toggleFavArquivo, toggleFeito, useStore, type Arquivo } from '../lib/store'

const TOM = { rec: 'bg-warn/15 text-warn', alt: 'bg-violet-500/20 text-violet-300', gab: 'bg-accent/15 text-accent' }

// Linha de um PDF do acervo: feito, nome (abre o PDF), etiquetas e favorito.
export function ArquivoRow({ a, onOpen, caminho }: { a: Arquivo; onOpen: (a: Arquivo) => void; caminho?: boolean }) {
  const feito = useStore((s) => s.feitos.includes(a.id))
  const fav = useStore((s) => s.favArquivos.includes(a.id))
  return (
    <li className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03]">
      <button onClick={() => toggleFeito(a.id)} aria-label={feito ? 'Desmarcar feita' : 'Marcar como feita'}
        className={`grid size-7 shrink-0 place-items-center rounded-full border-2 transition ${feito ? 'border-accent bg-accent text-bg' : 'border-zinc-600 hover:border-accent/60'}`}>
        {feito && <Check className="size-4" />}
      </button>
      <button className="min-w-0 flex-1 text-left" onClick={() => onOpen(a)}>
        <span className={`block truncate text-sm font-semibold ${feito ? 'text-mute' : ''}`}>{limpa(a.nome)}</span>
        {caminho && <span className="block truncate text-xs text-mute">{caminhoDe(a)}</span>}
      </button>
      {etiquetas(a).map(([t, tom]) => (
        <span key={t} className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider sm:inline ${TOM[tom]}`}>{t}</span>
      ))}
      <button onClick={() => toggleFavArquivo(a.id)} aria-label={fav ? 'Remover dos favoritos' : 'Favoritar'}
        className={`shrink-0 rounded-full p-1.5 transition ${fav ? 'text-warn' : 'text-zinc-600 hover:text-warn'}`}>
        <Star className={`size-4 ${fav ? 'fill-warn' : ''}`} />
      </button>
    </li>
  )
}
