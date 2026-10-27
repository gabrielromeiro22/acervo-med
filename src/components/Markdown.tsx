import type { ReactNode } from 'react'

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="font-semibold text-ink">{part.slice(2, -2)}</strong>
      : part,
  )
}

export function Markdown({ source }: { source: string }) {
  const out: ReactNode[] = []
  let list: string[] = []
  const flush = () => {
    if (!list.length) return
    out.push(
      <ul key={out.length} className="my-3 space-y-1.5 pl-1">
        {list.map((li, i) => (
          <li key={i} className="flex gap-2 text-mute"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" /><span>{inline(li)}</span></li>
        ))}
      </ul>,
    )
    list = []
  }
  for (const line of source.split('\n')) {
    const t = line.trim()
    if (t.startsWith('- ')) { list.push(t.slice(2)); continue }
    flush()
    if (!t) continue
    if (t.startsWith('## ')) out.push(<h3 key={out.length} className="mt-6 mb-2 font-display text-lg font-semibold">{inline(t.slice(3))}</h3>)
    else if (t.startsWith('# ')) out.push(<h2 key={out.length} className="mb-3 font-display text-2xl font-bold">{inline(t.slice(2))}</h2>)
    else out.push(<p key={out.length} className="my-2 leading-relaxed text-mute">{inline(t)}</p>)
  }
  flush()
  return <div>{out}</div>
}
