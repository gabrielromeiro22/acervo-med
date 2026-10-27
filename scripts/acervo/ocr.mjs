// OCR dos PDFs sem camada de texto (páginas rasterizadas), com o Vision do macOS (scripts/acervo/ocr.swift).
// Uso: node scripts/acervo/ocr.mjs [--force]
// Sobrescreve data/acervo/txt/<id>.txt e grava data/acervo/txt/<id>.ocr como marcador.
import { mkdtemp, readFile, writeFile, readdir, rm, access, stat } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const run = promisify(execFile)
const DIR = new URL('../../data/acervo/', import.meta.url)
const SRC = new URL('ocr.swift', import.meta.url).pathname
const BIN = new URL('.ocr', import.meta.url).pathname
const force = process.argv.includes('--force')
const exists = p => access(p).then(() => true, () => false)

// compila o binário se não existir ou estiver desatualizado
if (!(await exists(BIN)) || (await stat(SRC)).mtimeMs > (await stat(BIN)).mtimeMs) {
  console.error('compilando ocr.swift…')
  await run('swiftc', ['-O', SRC, '-o', BIN])
}

const catalog = JSON.parse(await readFile(new URL('catalog.json', DIR), 'utf8'))
const todo = []
for (const r of catalog) {
  const txt = new URL(`txt/${r.id}.txt`, DIR).pathname
  if (!(await exists(txt))) continue
  if (!force && (await exists(txt.replace(/\.txt$/, '.ocr')))) continue
  if ((await readFile(txt, 'utf8')).replace(/\s/g, '').length < 200) todo.push(r)
}
console.error(`${todo.length} PDFs sem texto para OCR`)

for (const [i, r] of todo.entries()) {
  const tmp = await mkdtemp(join(tmpdir(), 'acervo-ocr-'))
  try {
    await run('pdftoppm', ['-r', '200', '-png', new URL(`pdf/${r.id}.pdf`, DIR).pathname, join(tmp, 'p')], { maxBuffer: 1 << 26 })
    const pages = (await readdir(tmp)).filter(f => f.endsWith('.png')).sort().map(f => join(tmp, f))
    const { stdout } = await run(BIN, pages, { maxBuffer: 1 << 28 })
    const txt = new URL(`txt/${r.id}.txt`, DIR).pathname
    await writeFile(txt, stdout)
    await writeFile(txt.replace(/\.txt$/, '.ocr'), '')
    console.error(`${i + 1}/${todo.length}  ${pages.length} pág  ${r.path}`)
  } catch (e) {
    console.error(`FALHA ${r.path}: ${e.message.split('\n')[0]}`)
  } finally {
    await rm(tmp, { recursive: true, force: true })
  }
}
