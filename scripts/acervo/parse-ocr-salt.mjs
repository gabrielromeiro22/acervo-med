// Devolutivas "S_alt" escaneadas (só a alternativa correta), lidas pelo OCR do macOS (meu-acervo/tools/ocr).
// Uso: node scripts/acervo/parse-ocr-salt.mjs <id do PDF no Drive> [...]
// Saída: data/acervo/flashcards-ocr.json (formato dos parsers, tipo 'so-correta'), que o build-app transforma em
// questões abertas da prova.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const RAIZ = new URL('../../', import.meta.url).pathname
const catalog = new Map(JSON.parse(readFileSync(`${RAIZ}data/acervo/catalog.json`, 'utf8')).map((r) => [r.id, r]))
const SAIDA = `${RAIZ}data/acervo/flashcards-ocr.json`
const atuais = existsSync(SAIDA) ? JSON.parse(readFileSync(SAIDA, 'utf8')) : []

const lixo = /^(?:\d{6}\.\S+.*|\.?[a-f0-9]{6}\.\S+|P[áa]?gina \d+ de \d+)$/i // código de rastreio e rodapé
const junta = (linhas) => linhas.filter((l) => !lixo.test(l.trim())).join(' ').replace(/\s+/g, ' ').trim()

for (const id of process.argv.slice(2)) {
  const r = catalog.get(id)
  if (!r) { console.error(`fora do catálogo: ${id}`); continue }
  const pdf = `${RAIZ}meu-acervo/_cache/pdfs/${id}.pdf`
  const txt = execFileSync(`${RAIZ}meu-acervo/tools/ocr`, [pdf], { encoding: 'utf8', maxBuffer: 64e6 })
  const linhas = txt.replace(/\f/g, '\n').split('\n').map((l) => l.split('\t').pop())
  const blocos = []
  for (const l of linhas) {
    const m = l.match(/^(\d+)\s*ª\s*QUEST/i)
    if (m) blocos.push({ n: +m[1], l: [] })
    else blocos.at(-1)?.l.push(l)
  }
  const itens = blocos.map(({ n, l }) => {
    const i = (rx) => l.findIndex((x) => rx.test(x))
    const ie = i(/^Enunciado:/i), ia = i(/^Alternativas:/i), ic = i(/^Resposta comentada:/i), ir = i(/^Refer[êe]ncias?:/i)
    if (ie < 0 || ia < 0) return null
    const resp = l.slice(ia + 1, ic < 0 ? undefined : ic)
    const k = resp.findIndex((x) => /\(CORRETA\)/i.test(x))
    const resposta = junta(resp.slice(k + 1))
    if (!resposta) return null
    return {
      id: `fc-ocr-${id.slice(0, 10)}-${n}`, tipo: 'so-correta', disciplina: `${r.modulo} ${r.moduloNum}`, tema: '',
      frente: junta(l.slice(ie + 1, ia)), verso: resposta,
      comentario: ic < 0 ? undefined : [junta(l.slice(ic + 1, ir < 0 ? undefined : ir)), ir < 0 ? '' : `Referências: ${junta(l.slice(ir + 1))}`].filter(Boolean).join('\n\n'),
      origem: { arquivo: id, caminho: r.path, area: r.area, modulo: r.modulo, moduloNum: r.moduloNum, semestre: r.semestre, numero: n },
    }
  }).filter(Boolean)
  console.error(`${r.nome}: ${itens.length} de ${blocos.length} questões`)
  for (const it of itens) { const j = atuais.findIndex((x) => x.id === it.id); if (j >= 0) atuais[j] = it; else atuais.push(it) }
}
writeFileSync(SAIDA, JSON.stringify(atuais, null, 1))
