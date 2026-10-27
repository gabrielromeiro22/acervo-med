// Parser das compilações do próprio Acervo (HAM 5–8 e internato "Tópicos A/B", Questões Repetidas TPI):
// PDF em duas colunas, com cabeçalhos de tópico e, nas versões "Comentada", "ALTERNATIVA CORRETA: X".
//   Nª QUESTÃO / (2025.1) Q.8 / OK ○ Revisar ○ / [Enunciado:] / A) … E) / RESPOSTA COMENTADA: / ALTERNATIVA CORRETA: A
// Uso: node scripts/acervo/parse-acervo.mjs
// Saída: data/acervo/questoes-acervo.json (+ entra no parse-report-acervo.json)
import { readFile, writeFile, access } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createHash } from 'node:crypto'

const run = promisify(execFile)
const DIR = new URL('../../data/acervo/', import.meta.url)
const exists = p => access(p).then(() => true, () => false)

// texto em ordem de leitura: coluna esquerda e depois a direita, página a página
async function columns(pdf) {
  const { stdout: info } = await run('pdfinfo', [pdf])
  const pages = +info.match(/Pages:\s+(\d+)/)[1]
  const [, w, h] = info.match(/Page size:\s+([\d.]+) x ([\d.]+)/).map(Number)
  const half = Math.floor(w / 2)
  const col = (p, x) => run('pdftotext', ['-enc', 'UTF-8', '-f', p, '-l', p, '-x', x, '-y', 0, '-W', half, '-H', Math.ceil(h), pdf, '-'].map(String), { maxBuffer: 1 << 24 }).then(r => r.stdout)
  const out = []
  for (let p = 1; p <= pages; p++) out.push(await col(p, 0), await col(p, half))
  return out.join('\n')
}

const NOISE = [/^(OK|Revisar) ○$/, /acervo\.(top|vip)|acervotop\.com|doe@acervo|^PIX:/i, /^o acervo é 100% gratuito|^ajude ele a continuar/i, /^\d+ QTS$/, /^P[áa]?gina \d+/i]
const isNoise = l => NOISE.some(re => re.test(l))
const para = s => s.trim().split(/\n{2,}/).map(b => b.split('\n').map(l => l.trim()).filter(Boolean)
  .reduce((acc, l) => (/^([IVX]+[.)]|[◗•\-–*]|\d+[.)])\s/.test(l) || l === 'PORQUE' || !acc ? acc + (acc ? '\n' : '') + l : acc + ' ' + l), ''))
  .filter(Boolean).join('\n\n').replace(/[ \t]+/g, ' ')
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\W+/g, ' ').trim()

// O título do tópico é desenhado duas vezes (preenchimento + contorno), então cada palavra sai em par, às vezes
// em linhas sobrepostas: "AVALIAÇÃO / AVALIAÇÃO DE / DE DOR / … / EE / LOMBALGIA / LOMBALGIA".
// Fica com a 1ª, 3ª, 5ª… ocorrência de cada palavra ("EE" e "++" são o par colado de "E" e "+").
function heading(lines) {
  const toks = lines.join(' ').split(/\s+/).flatMap(t => (/^(\p{Lu}|\+|-)\1$/u.test(t) ? [t[0], t[0]] : [t]))
  const seen = {}, out = []
  for (const t of toks) if ((seen[t] = (seen[t] || 0) + 1) % 2 === 1) out.push(t)
  return out.join(' ').replace(/\s*[+-]+\s*$/, '').replace(/\s+([+-])\s+/g, ' · ')
}
const isHeadLine = l => l.length < 70 && /\p{Lu}{2}/u.test(l) && !/\p{Ll}/u.test(l) && !/[:.]$|^[A-E]\)|QUESTÃO|CORRETA|PORQUE|^[IVX]+\./.test(l)

function parseText(rec, txt) {
  const lines = txt.replace(/\f/g, '\n').replace(/[ﬀ-ﬆ]/g, c => c.normalize('NFKC')).split('\n').map(l => l.trim()).filter(l => !isNoise(l))
  const qs = [], rejects = []
  // tabela de gabarito no fim do arquivo ("99-E", "25-A"…), usada quando a questão não traz a correta
  const gabarito = Object.fromEntries([...txt.matchAll(/^(\d+)-([A-E])\b/gm)].map(m => [+m[1], m[2]]))
  let tema = '', cur = null
  const flush = () => {
    if (!cur) return
    // a linha de origem às vezes vem depois de outras (cabeçalho, ✓/✗): tira do enunciado e guarda como fonte
    const SRC = /^\(?\d{4}\.[12]\b.{0,40}Q\.\s*\d+$|^\d+x REPETIDAS?$/i
    const si = cur.lines.findIndex((l, i) => i < 6 && SRC.test(l))
    if (si >= 0) { if (!cur.src) cur.src = cur.lines[si].replace(/[()]/g, '').trim(); cur.lines.splice(si, 1) }
    const body = cur.lines.join('\n')
    const [pre, com = ''] = body.split(/^RESPOSTA COMENTADA:?\s*$/im)
    const altRe = /^([A-E])\)\s*/m
    const first = pre.search(altRe)
    const enunciado = para((first >= 0 ? pre.slice(0, first) : pre).replace(/^Enunciado:\s*/m, '').replace(/^Alternativas:\s*$/m, ''))
    const alts = first >= 0 ? pre.slice(first).split(/^([A-E])\)\s*/m).filter((_, i) => i % 2 === 0).slice(1).map(para) : []
    const letra = (com.match(/ALTERNATIVA CORRETA:?\s*([A-E])\b/) || body.match(/GABARITO:?\s*([A-E])\b/) ||
      // justificativa por alternativa: 'C) "texto…"' seguido de uma linha "CORRETA."
      com.match(/^([A-E])\)[^\n]*(?:\n(?!CORRETA|INCORRETA|[A-E]\))[^\n]*)*\nCORRETA\b/m) || [])[1] || gabarito[cur.num]
    const correta = letra ? 'ABCDE'.indexOf(letra) : -1
    const comentario = para(com.replace(/^ALTERNATIVA CORRETA:?\s*[A-E]\b.*$/m, '').replace(/^JUSTIFICATIVAS?:\s*$/m, ''))
    const why = !enunciado ? 'sem enunciado' : alts.length < 2 ? `alternativas: ${alts.length}` : correta < 0 || correta >= alts.length ? 'sem gabarito' : null
    if (why) rejects.push({ arquivo: rec.id, numero: cur.num, motivo: why })
    else {
      const anulada = /anulad/i.test(cur.src)
      qs.push({
        id: `${rec.id.slice(0, 10)}-${cur.num}`,
        disciplina: [rec.modulo, rec.moduloNum].filter(Boolean).join(' ') || rec.area,
        tema: cur.tema ? cur.tema.charAt(0) + cur.tema.slice(1).toLowerCase() : '',
        periodo: rec.periodo ?? (rec.area === 'internato' ? 9 : 0),
        dificuldade: 'media',
        enunciado, alternativas: alts, correta, comentario,
        fonte: [[rec.modulo, rec.moduloNum].filter(Boolean).join(' '), cur.src].filter(Boolean).join(' · '),
        origem: {
          arquivo: rec.id, caminho: rec.path, numero: cur.num, codigo: null, area: rec.area, modulo: rec.modulo, moduloNum: rec.moduloNum,
          semestre: (cur.src.match(/20\d\d\.[12]/) || [rec.semestre])[0], provaOriginal: cur.src || undefined, anulada: anulada || undefined,
          possivelImagem: /\b(imagem|figura|foto|radiografia|eletrocardiograma|tomografia|lâmina)\b/i.test(enunciado) || undefined,
        },
      })
    }
    cur = null
  }
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    const q = l.match(/^(\d+)ª QUESTÃO\b(.*)$/)
    if (q) {
      flush()
      // linha seguinte: prova de origem, ex. "(2025.1) Q.8", "2023.2-anulada Q.9", "7x REPETIDAS"
      let src = q[2].trim()
      if (!src && /Q\.\s*\d+|REPETID/i.test(lines[i + 1] || '')) src = lines[++i]
      cur = { num: +q[1], src: src.replace(/[()]/g, '').trim(), tema, lines: [] }
      continue
    }
    if (isHeadLine(l)) {
      // bloco de cabeçalho de tópico: linhas em caixa alta consecutivas
      const block = [l]
      while (i + 1 < lines.length && isHeadLine(lines[i + 1])) block.push(lines[++i])
      if (block.length >= 2) { tema = heading(block); continue }
    }
    if (cur && l) cur.lines.push(l)
    else if (cur) cur.lines.push('')
  }
  flush()
  return { qs, rejects }
}

const catalog = JSON.parse(await readFile(new URL('catalog.json', DIR), 'utf8'))
const all = [], report = { arquivos: 0, rejeitadas: [] }
for (const rec of catalog) {
  const txt = new URL(`txt/${rec.id}.txt`, DIR)
  if (!(await exists(txt)) || !/OK ○|Revisar ○/.test(await readFile(txt, 'utf8'))) continue
  // "Gabarito sem/com Topicos" e "Comentada Final" repetem as questões da "Comentada Seguida" (que traz o gabarito junto)
  if (rec.tipo === 'gabarito' || /Comentada Final/i.test(rec.nome)) continue
  report.arquivos++
  const { qs, rejects } = parseText(rec, await columns(new URL(`pdf/${rec.id}.pdf`, DIR).pathname))
  report.rejeitadas.push(...rejects.map(r => ({ ...r, caminho: rec.path })))
  all.push(...qs)
  console.error(`${String(qs.length).padStart(4)} ok ${String(rejects.length).padStart(3)} rej  ${rec.path}`)
}

const seen = new Map()
for (const q of all) {
  const k = createHash('sha1').update(norm(q.enunciado.length > 80 ? q.enunciado : q.enunciado + q.alternativas.join('|'))).digest('hex')
  if (!seen.has(k)) seen.set(k, q)
}
const out = [...seen.values()]
report.validas = all.length
report.unicas = out.length
report.motivos = report.rejeitadas.reduce((a, r) => (a[r.motivo] = (a[r.motivo] || 0) + 1, a), {})
await writeFile(new URL('questoes-acervo.json', DIR), JSON.stringify(out, null, 1))
await writeFile(new URL('parse-report-acervo.json', DIR), JSON.stringify(report, null, 1))
const { rejeitadas, ...resumo } = report
console.error(JSON.stringify(resumo, null, 1))
