// Percorre a pasta pública do Drive e gera o índice do acervo.
// Uso: node scripts/acervo/crawl.mjs [folderId]
// Saída: data/acervo/index.json  →  [{ id, path, name, dir }]
import { mkdir, writeFile } from 'node:fs/promises'

const ROOT = process.argv[2] || '1TQU9bdNlLGHEYGuIQkRbVCDSYmMO7bCI'
const OUT = new URL('../../data/acervo/index.json', import.meta.url)
const CONCURRENCY = 6

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" }
const decode = s => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) =>
  e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e] ?? m)

async function list(id, tries = 3) {
  const res = await fetch(`https://drive.google.com/embeddedfolderview?id=${id}`)
  if (!res.ok) {
    if (tries > 1) return new Promise(r => setTimeout(r, 1500)).then(() => list(id, tries - 1))
    throw new Error(`HTTP ${res.status} em ${id}`)
  }
  const html = await res.text()
  const re = /<div class="flip-entry" id="entry-([\w-]+)"[\s\S]*?<a href="([^"]+)"[\s\S]*?<div class="flip-entry-title">([\s\S]*?)<\/div>/g
  const out = []
  for (const m of html.matchAll(re)) {
    out.push({ id: m[1], folder: /\/folders\//.test(m[2]), name: decode(m[3]).replace(/\s+/g, ' ').trim() })
  }
  return out
}

const queue = [[ROOT, '']]
const files = []
let folders = 0, busy = 0

async function worker() {
  while (queue.length || busy) {
    const job = queue.shift()
    if (!job) { await new Promise(r => setTimeout(r, 100)); continue }
    busy++
    const [id, dir] = job
    try {
      for (const it of await list(id)) {
        const path = dir ? `${dir}/${it.name}` : it.name
        if (it.folder) queue.push([it.id, path])
        else files.push({ id: it.id, path, name: it.name, dir })
      }
      if (++folders % 25 === 0) console.error(`${folders} pastas, ${files.length} arquivos…`)
    } catch (e) {
      console.error(`ERRO ${dir || '(raiz)'}: ${e.message}`)
    } finally {
      busy--
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker))
files.sort((a, b) => a.path.localeCompare(b.path, 'pt'))
await mkdir(new URL('.', OUT), { recursive: true })
await writeFile(OUT, JSON.stringify(files, null, 1))
console.error(`OK: ${folders} pastas, ${files.length} arquivos → data/acervo/index.json`)
