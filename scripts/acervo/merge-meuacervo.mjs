// Cruza as provas do app "Meu Acervo" (provas.js, gerado por converter_provas.py) com o acervo deste repositório.
// Uso: node scripts/acervo/merge-meuacervo.mjs [meu-acervo/provas.js]
// Saída: data/acervo/questoes-meuacervo.json (múltipla escolha) e flashcards-meuacervo.json (só gabarito / discursivas),
// no mesmo formato dos parsers, e as figuras citadas ([[IMG:arquivo]]) copiadas para public/acervo/img/.
// O build-app.mjs junta tudo, descarta repetidas e fica com o texto que tem parágrafos e figuras.
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import { createHash } from 'node:crypto'

const src = (process.argv[2] || fileURLToPath(new URL('../../meu-acervo/provas.js', import.meta.url))).replace(/^~/, homedir())
const DATA = new URL('../../data/acervo/', import.meta.url)
const read = async f => JSON.parse(await readFile(new URL(f, DATA), 'utf8'))

// provas.js define window.PROVAS; nas versões novas ele só carrega provas/<grupo>.js (Object.assign por grupo)
const base = dirname(src)
const ctx = vm.createContext({ window: { PROVAS: {} }, document: { write() {} } })
vm.runInContext(await readFile(src, 'utf8'), ctx)
const grupos = await readdir(join(base, 'provas')).catch(() => [])
for (const f of grupos.filter(f => f.endsWith('.js')).sort()) vm.runInContext(await readFile(join(base, 'provas', f), 'utf8'), ctx)
const PV = ctx.window.PROVAS
const catalog = new Map((await read('catalog.json')).map(r => [r.id, r]))

// enunciados que o repositório já tem, para contar o que é novo
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\W+/g, ' ').trim()
const seen = new Set()
for (const f of ['questoes.json', 'questoes-acervo.json', 'flashcards.json']) {
  for (const q of await read(f).catch(() => [])) seen.add(norm(q.enunciado ?? q.frente).slice(0, 200))
}

// figuras citadas no texto, para copiar junto
const IMG = /\[\[IMG:([\w.-]+)\]\]/g
const figuras = new Set()
const marca = t => { for (const [, f] of (t || '').matchAll(IMG)) figuras.add(f); return t }

// rodapés que o conversor do Meu Acervo deixou grudados na última alternativa
const limpa = t => t.replace(/\s*Grau de dificuldade:.*$/is, '').replace(/\s*(https?:\/\/)?www\.acervo\S*.*$/is, '').trim()

const questoes = [], flashcards = []
let novasQ = 0, novosF = 0, semCatalogo = 0
const usados = new Set()
let quebradas = 0, compilacoes = 0
for (const [arquivo, p] of Object.entries(PV)) {
  if (!p.q?.length) continue
  // compilações (ex.: "Checklist [2023.2 a 2025.1] - INTEGRADORAS VI") repetem questões das provas de cada semestre
  if (/checklist|compila/i.test(`${p.name} ${p.title}`)) { compilacoes += p.q.length; continue }
  const r = catalog.get(arquivo)
  if (!r) { semCatalogo += p.q.length; continue }
  const origem = {
    arquivo, caminho: r.path, area: r.area, modulo: r.modulo ?? null, moduloNum: r.moduloNum ?? null,
    semestre: r.semestre ?? p.sem ?? null, cabecalho: p.title || undefined,
  }
  const disciplina = p.disc, periodo = r.periodo
  p.q.forEach((q, i) => {
    // OCR falhou: sem enunciado não dá para resolver (continua no PDF)
    if (!q.e?.trim()) { quebradas++; return }
    // id pelo texto (não pela posição): o conversor pode reordenar as questões e a classificação fica presa ao id
    let id = `ma-${arquivo.slice(0, 10)}-${createHash('sha1').update(norm(q.e.replace(IMG, ' ')).slice(0, 300)).digest('hex').slice(0, 8)}`
    while (usados.has(id)) id += 'b'
    usados.add(id)
    const comentario = marca((q.k || '').trim())
    marca(q.e); (q.a || []).forEach(([, t]) => marca(t)); marca(q.r)
    const roteiro = q.s && q.s !== 'Outros' ? q.s : undefined // assunto do roteiro oficial do período
    const novo = !seen.has(norm(q.e).slice(0, 200))
    if (q.t === 'mc') {
      const correta = q.a.findIndex(([L]) => L === q.c)
      if (correta < 0) return // anulada: sem gabarito para corrigir
      if (q.a.some(([, t]) => !limpa(t))) { quebradas++; return } // alternativa em branco
      questoes.push({
        id, disciplina, tema: '', periodo, dificuldade: 'media', enunciado: q.e.trim(), alternativas: q.a.map(([, t]) => limpa(t)),
        correta, comentario: comentario || 'Sem comentário no material original.', fonte: `${disciplina} · ${p.sem}`,
        roteiro, origem: { ...origem, numero: i + 1 },
      })
      novasQ += novo
    } else {
      const verso = q.t === 'one' ? q.r : comentario
      if (!verso) return
      flashcards.push({
        id: `fc-${id}`, tipo: q.t === 'one' ? 'so-correta' : 'discursiva', disciplina, tema: '', frente: q.e.trim(), verso,
        ...(q.t === 'one' && comentario && { comentario }), origem: { ...origem, numero: i + 1 },
      })
      novosF += novo
    }
  })
}

const OUT_IMG = new URL('../../public/acervo/img/', import.meta.url)
await mkdir(OUT_IMG, { recursive: true })
let copiadas = 0
// figuras de importações anteriores que nenhuma questão usa mais
for (const f of await readdir(OUT_IMG)) if (!figuras.has(f)) await rm(new URL(f, OUT_IMG))
for (const f of figuras) await copyFile(join(base, 'img', f), new URL(f, OUT_IMG)).then(() => copiadas++, () => console.error(`figura ausente: ${f}`))
await writeFile(new URL('questoes-meuacervo.json', DATA), JSON.stringify(questoes, null, 1))
await writeFile(new URL('flashcards-meuacervo.json', DATA), JSON.stringify(flashcards, null, 1))
console.error(`questoes-meuacervo.json  ${questoes.length} (${novasQ} que o repositório não tinha)`)
console.error(`flashcards-meuacervo.json  ${flashcards.length} (${novosF} novos)`)
console.error(`questões descartadas por falha de OCR (sem enunciado ou alternativa em branco): ${quebradas}`)
console.error(`questões de compilações ignoradas: ${compilacoes}`)
console.error(`figuras copiadas para public/acervo/img: ${copiadas}`)
if (semCatalogo) console.error(`${semCatalogo} questões ignoradas: arquivo fora do catálogo`)
