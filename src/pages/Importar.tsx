import { useState } from 'react'
import { Download, FileUp, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '../components/ui'
import { CSV_TEMPLATE, JSON_TEMPLATE, mergeImported, parseCSV, parseJSON } from '../lib/importer'
import { exportBackup, resetProgress, setState, useStore } from '../lib/store'

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  a.click()
  URL.revokeObjectURL(url)
}

export default function Importar() {
  const imported = useStore((s) => s.imported)
  const [confirm, setConfirm] = useState<'' | 'reset' | 'clear'>('')

  const onFile = async (file: File) => {
    try {
      const text = await file.text()
      if (file.name.toLowerCase().endsWith('.csv')) {
        const content = parseCSV(text)
        if (!content.questions.length) return toast.error('Nenhuma questão válida no CSV. Confira o cabeçalho e a coluna "correta".')
        setState((s) => ({ ...s, imported: mergeImported(s.imported, content) }))
        return toast.success(`${content.questions.length} questões importadas`)
      }
      const res = parseJSON(text)
      if (res.kind === 'backup') {
        setState((s) => ({ ...s, ...res.state }))
        return toast.success('Backup restaurado')
      }
      const { questions, flashcards, materials } = res.content
      if (!questions.length && !flashcards.length && !materials.length) return toast.error('Nenhum item válido encontrado no arquivo.')
      setState((s) => ({ ...s, imported: mergeImported(s.imported, res.content) }))
      toast.success(`Importados: ${questions.length} questões, ${flashcards.length} flashcards, ${materials.length} materiais`)
    } catch {
      toast.error('Não foi possível ler o arquivo. Use JSON ou CSV.')
    }
  }

  const doConfirm = () => {
    if (confirm === 'reset') { resetProgress(); toast.success('Progresso apagado') }
    if (confirm === 'clear') { setState((s) => ({ ...s, imported: { questions: [], flashcards: [], materials: [] } })); toast.success('Conteúdo importado removido') }
    setConfirm('')
  }

  return (
    <>
      <PageHeader title="Importar / backup" sub="Traga suas próprias questões e leve seu progresso para outro navegador." />

      <section className="card p-5 sm:p-6">
        <h2 className="font-semibold">Importar arquivo</h2>
        <p className="mt-1 text-sm text-mute">
          <b className="text-ink">CSV</b>: uma questão por linha, colunas <code className="text-accent">disciplina; tema; periodo; dificuldade; enunciado; a…e; correta; comentario</code>.{' '}
          <b className="text-ink">JSON</b>: questões, flashcards e materiais, ou um backup completo exportado aqui.
        </p>
        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line p-8 text-center text-sm text-mute transition hover:border-accent/50 hover:text-ink">
          <FileUp className="size-6 text-accent" />
          Clique para escolher um arquivo .json ou .csv
          <input type="file" accept=".json,.csv,application/json,text/csv" className="sr-only"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={() => download('modelo-questoes.csv', CSV_TEMPLATE, 'text/csv')}><Download className="size-4" /> Modelo CSV</button>
          <button className="btn-ghost" onClick={() => download('modelo-acervo.json', JSON_TEMPLATE, 'application/json')}><Download className="size-4" /> Modelo JSON</button>
        </div>
        <p className="mt-4 text-xs text-mute">
          Importado até agora: {imported.questions.length} questões · {imported.flashcards.length} flashcards · {imported.materials.length} materiais.
        </p>
      </section>

      <section className="card mt-6 p-5 sm:p-6">
        <h2 className="font-semibold">Backup</h2>
        <p className="mt-1 text-sm text-mute">Seu progresso fica só neste navegador. Exporte para não perder ou para continuar em outro aparelho.</p>
        <button className="btn-primary mt-4" onClick={() => download(`acervo-backup-${new Date().toISOString().slice(0, 10)}.json`, exportBackup(), 'application/json')}>
          <Download className="size-4" /> Exportar backup
        </button>
      </section>

      <section className="card mt-6 border-danger/30 p-5 sm:p-6">
        <h2 className="font-semibold text-danger">Zona de perigo</h2>
        {confirm ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <p className="text-sm">{confirm === 'reset' ? 'Apagar tentativas, simulados, flashcards e notas?' : 'Remover todo o conteúdo importado?'} Não dá para desfazer.</p>
            <button className="btn-ghost" onClick={() => setConfirm('')}>Cancelar</button>
            <button className="btn border border-danger bg-danger/10 text-danger hover:bg-danger/20" onClick={doConfirm}>Confirmar</button>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-ghost hover:text-danger" onClick={() => setConfirm('reset')}><Trash2 className="size-4" /> Apagar progresso</button>
            <button className="btn-ghost hover:text-danger" onClick={() => setConfirm('clear')}><Trash2 className="size-4" /> Remover conteúdo importado</button>
          </div>
        )}
      </section>
    </>
  )
}
