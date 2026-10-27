import { useMemo } from 'react'
import { Bar, Empty, PageHeader, Stat } from '../components/ui'
import { pct, sortDisc } from '../lib/format'
import { useQuestions, useStore } from '../lib/store'

const tone = (p: number) => (p >= 70 ? 'accent' : p >= 50 ? 'warn' : 'danger')

export default function Estatisticas() {
  const questions = useQuestions()
  const attempts = useStore((s) => s.attempts)

  const { all, byDisc, weakTemas, days } = useMemo(() => {
    const byId = new Map(questions.map((q) => [q.id, q]))
    const all = Object.entries(attempts).flatMap(([id, xs]) => {
      const q = byId.get(id)
      return q ? xs.map((a) => ({ ...a, q })) : []
    })

    const disc = new Map<string, { total: number; seen: Set<string>; n: number; ok: number }>()
    for (const q of questions) {
      const d = disc.get(q.disciplina) ?? { total: 0, seen: new Set(), n: 0, ok: 0 }
      d.total += 1
      disc.set(q.disciplina, d)
    }
    const temas = new Map<string, { n: number; ok: number }>()
    for (const a of all) {
      const d = disc.get(a.q.disciplina)!
      d.seen.add(a.q.id); d.n += 1; if (a.correct) d.ok += 1
      const key = `${a.q.disciplina} · ${a.q.tema}`
      const t = temas.get(key) ?? { n: 0, ok: 0 }
      t.n += 1; if (a.correct) t.ok += 1
      temas.set(key, t)
    }

    const day0 = new Date().setHours(0, 0, 0, 0)
    const days = Array.from({ length: 14 }, (_, k) => {
      const start = day0 - (13 - k) * 86_400_000
      const xs = all.filter((a) => a.at >= start && a.at < start + 86_400_000)
      return { start, n: xs.length, ok: xs.filter((a) => a.correct).length }
    })

    return {
      all,
      byDisc: [...disc.entries()].sort(([a], [b]) => sortDisc(a, b)),
      weakTemas: [...temas.entries()].filter(([, t]) => t.n >= 2).sort(([, a], [, b]) => a.ok / a.n - b.ok / b.n).slice(0, 5),
      days,
    }
  }, [questions, attempts])

  if (!all.length) {
    return (
      <>
        <PageHeader title="Estatísticas" />
        <Empty>Resolva algumas questões para ver seu desempenho aqui.</Empty>
      </>
    )
  }

  const ok = all.filter((a) => a.correct).length
  const avgSec = all.reduce((s, a) => s + a.ms, 0) / all.length / 1000
  const max = Math.max(1, ...days.map((d) => d.n))

  return (
    <>
      <PageHeader title="Estatísticas" sub="Acertos, tempo e evolução." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Tentativas" value={all.length} />
        <Stat label="Aproveitamento" value={`${pct(ok, all.length)}%`} hint={`${ok} acertos`} />
        <Stat label="Tempo médio" value={`${Math.round(avgSec)}s`} hint="por questão" />
        <Stat label="Questões vistas" value={Object.keys(attempts).length} hint={`de ${questions.length}`} />
      </div>

      <section className="card mt-6 p-5">
        <h2 className="mb-4 font-semibold">Últimos 14 dias</h2>
        <div className="flex h-36 items-end gap-1.5">
          {days.map((d) => (
            <div key={d.start} className="flex h-full flex-1 flex-col justify-end" title={`${new Date(d.start).toLocaleDateString('pt-BR')}: ${d.ok}/${d.n}`}>
              <div className="flex flex-col overflow-hidden rounded-md bg-danger/60" style={{ height: `${(d.n / max) * 100}%` }}>
                <div className="mt-auto bg-accent" style={{ height: `${pct(d.ok, d.n)}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-mute">
          <span>{new Date(days[0].start).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
          <span><span className="text-accent">■</span> acertos <span className="ml-2 text-danger">■</span> erros</span>
          <span>hoje</span>
        </div>
      </section>

      <section className="card mt-6 p-5">
        <h2 className="mb-4 font-semibold">Por disciplina</h2>
        <ul className="space-y-4">
          {byDisc.map(([name, d]) => {
            const p = pct(d.ok, d.n)
            return (
              <li key={name}>
                <div className="mb-1 flex justify-between gap-3 text-sm">
                  <span>{name}</span>
                  <span className="tabular-nums text-mute">
                    {d.n ? `${p}% · ${d.ok}/${d.n}` : '—'} <span className="hidden sm:inline">· {d.seen.size}/{d.total} vistas</span>
                  </span>
                </div>
                <Bar value={d.n ? p : 0} tone={tone(p)} />
              </li>
            )
          })}
        </ul>
      </section>

      {weakTemas.length > 0 && (
        <section className="card mt-6 p-5">
          <h2 className="mb-1 font-semibold">Temas para reforçar</h2>
          <p className="mb-4 text-xs text-mute">Menor aproveitamento entre temas com 2+ tentativas.</p>
          <ul className="divide-y divide-line">
            {weakTemas.map(([name, t]) => (
              <li key={name} className="flex justify-between py-2 text-sm">
                <span>{name}</span>
                <span className={`tabular-nums ${tone(pct(t.ok, t.n)) === 'danger' ? 'text-danger' : 'text-mute'}`}>{pct(t.ok, t.n)}% ({t.ok}/{t.n})</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
