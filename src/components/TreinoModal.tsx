import { ArrowLeft, Dumbbell } from 'lucide-react'

export function TreinoModal({ count, onCancel, onConfirm }: { count: number; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onCancel} role="dialog" aria-modal>
      <div className="w-full max-w-sm rounded-2xl border-2 border-ink bg-panel p-5" onClick={(e) => e.stopPropagation()}>
        <span className="chip border-warn/50 bg-warn/15 font-bold uppercase text-warn"><Dumbbell className="size-3.5" /> Treino</span>
        <h2 className="mt-3 font-display text-xl font-bold">Refazer questões que errei</h2>
        <p className="mt-2 text-sm leading-relaxed text-mute">
          Você vai refazer {count} questão(ões) que errou ou deixou em branco. É um treino: não conta como prova concluída,
          não entra nas estatísticas e não substitui a tentativa original no seu histórico.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onCancel}><ArrowLeft className="size-4" /> Voltar</button>
          <button className="btn bg-warn text-bg hover:brightness-110" onClick={onConfirm}>Entendi, começar</button>
        </div>
      </div>
    </div>
  )
}
