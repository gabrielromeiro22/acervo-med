// Baixa os PDFs do catálogo e extrai o texto com pdftotext (poppler).
// Uso: node scripts/acervo/fetch.mjs [--resumos]
// Saída: data/acervo/pdf/<id>.pdf  e  data/acervo/txt/<id>.txt  (pula o que já existe)
import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)
const DIR = new URL('../../data/acervo/', import.meta.url)
const CONCURRENCY = 4
const withResumos = process.argv.includes('--resumos')

const catalog = JSON.parse(await readFile(new URL('catalog.json', DIR), 'utf8'))
const todo = catalog.filter(r => r.path.toLowerCase().endsWith('.pdf') && (withResumos || r.tipo !== 'resumo'))
await mkdir(new URL('pdf/', DIR), { recursive: true })
await mkdir(new URL('txt/', DIR), { recursive: true })

const exists = p => access(p).then(() => true, () => false)
let done = 0, skipped = 0
const failed = []

async function one(r) {
  const pdf = new URL(`pdf/${r.id}.pdf`, DIR).pathname
  const txt = new URL(`txt/${r.id}.txt`, DIR).pathname
  if (await exists(txt)) { skipped++; return }
  if (!(await exists(pdf))) {
    const res = await fetch(`https://drive.usercontent.google.com/download?id=${r.id}&export=download&confirm=t`)
    const buf = Buffer.from(await res.arrayBuffer())
    if (!res.ok || buf.subarray(0, 5).toString() !== '%PDF-') throw new Error(`não é PDF (HTTP ${res.status})`)
    await writeFile(pdf, buf)
  }
  // sem -layout: mantém a ordem de leitura, que é o que o parser espera
  await run('pdftotext', ['-enc', 'UTF-8', pdf, txt], { maxBuffer: 64 << 20 })
}

const queue = [...todo]
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  for (let r; (r = queue.shift());) {
    try { await one(r) } catch (e) { failed.push([r.path, e.message]) }
    if (++done % 25 === 0) console.error(`${done}/${todo.length}…`)
  }
}))

console.error(`OK: ${todo.length - failed.length - skipped} novos, ${skipped} já existiam, ${failed.length} falhas`)
for (const [p, m] of failed) console.error(`  FALHA ${p}: ${m}`)
