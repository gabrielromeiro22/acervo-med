// Parser do formato "Relatório de devolutiva de prova" (Afya):
//   Nª QUESTÃO / Código / Enunciado: / Alternativas: / (alternativa X) (CORRETA) /
//   Grau de dificuldade: / Resposta comentada: / Referências: / -Filtros da questão: [Chave] valor
// Uso: node scripts/acervo/parse-afya.mjs
// Entrada: data/acervo/catalog.json + data/acervo/txt/*.txt
// Saída:   data/acervo/questoes.json (válidas, sem duplicatas) e data/acervo/parse-report.json
import { readFile, writeFile, access } from 'node:fs/promises'
import { createHash } from 'node:crypto'

const DIR = new URL('../../data/acervo/', import.meta.url)
const exists = p => access(p).then(() => true, () => false)

// ---------- limpeza ----------
const NOISE = [
  /^P[áa]?gina \d+ de \d+$/i,
  /^\d{6}\.[0-9a-f]{6}(\.[0-9a-f]+)+$/i,       // hash de rodapé da Afya
  /acervo\.(top|vip)|acervotop\.com|doe@acervo/i,
  /^Treine as provas online/i,
  /^o acervo é 100% gratuito|^ajude ele a continuar/i,
  /^NOTA FINAL$/,
  /^· voltar à categoria$/,
  /^Módulo ?\(s\):/i,
]
// desfaz ligaduras do PDF (ﬁ, ﬀ…), que quebram as regex de ruído e o texto (NFKC no texto todo trocaria ª/º)
const clean = txt => txt.replace(/[\uFB00-\uFB06]/g, c => c.normalize('NFKC')).replace(/\f/g, '\n')
  .replace(/^-+(?=(Resposta comentada|Justificativa|Grau de dificuldade|Refer[êe]ncia|Feedback|\d{6}\.))/gm, '') // "-" vazio de alternativas grudado no próximo rótulo
  .split('\n').map(l => l.trimEnd()).filter(l => !NOISE.some(re => re.test(l.trim()))).join('\n')

// junta linhas quebradas pelo PDF em parágrafos, preservando listas/marcadores
const para = s => s.trim()
  .split(/\n{2,}/).map(b => b.split('\n').map(l => l.trim()).filter(Boolean)
    .reduce((acc, l) => (/^([◗•\-–*]|\d+[.)]|[a-e]\))\s/.test(l) || !acc ? acc + (acc ? '\n' : '') + l : acc + ' ' + l), ''))
  .filter(Boolean).join('\n\n').replace(/[ \t]+/g, ' ')

// ---------- blocos ----------
const Q_HEAD = /^-?(\d+)ª QUEST[ÃA]O\b.*$/gim
const LABELS = [
  ['codigo', /^Código da questão:\s*/im],
  ['tipoQ', /^Tipo da questão:\s*/im],
  ['unidade', /^Unidade de avaliação:\s*/im],
  ['enunciado', /^Enunciado:\s*/im],
  ['alternativas', /^Alternativas:\s*/im],
  ['dificuldade', /^Grau de dificuldade:\s*/im],
  ['comentario', /^(Resposta comentada|Justificativa|Coment[áa]rio):\s*/im],
  ['referencias', /^Refer[êe]ncias?:?\s*$|^Refer[êe]ncias?:\s*/im],
  ['feedback', /^Feedback:\s*/im],
  ['filtros', /^-?Filtros da questão:\s*/im],
]

function sections(block) {
  const marks = []
  for (const [k, re] of LABELS) {
    const g = new RegExp(re.source, 'gim'); let m
    while ((m = g.exec(block))) marks.push({ k, at: m.index, end: m.index + m[0].length })
  }
  // alternativas sem o rótulo "Alternativas:" (começa direto em "(alternativa A)")
  const firstAlt = block.search(ALT_HEAD)
  if (firstAlt >= 0 && !marks.some(x => x.k === 'alternativas')) marks.push({ k: 'alternativas', at: firstAlt, end: firstAlt })
  marks.sort((a, b) => a.at - b.at)
  const out = {}
  marks.forEach((m, i) => {
    if (out[m.k] !== undefined && m.k !== 'comentario') return // mantém a 1ª ocorrência
    const body = block.slice(m.end, marks[i + 1]?.at ?? block.length).trim()
    out[m.k] = out[m.k] && m.k === 'comentario' ? out[m.k] + '\n\n' + body : body
  })
  // enunciado sem rótulo: tudo antes das alternativas
  if (out.enunciado === undefined && firstAlt >= 0) out.enunciado = block.slice(0, firstAlt).trim()
  return out
}

const ALT_HEAD = /^\(alternativa [A-E]\)/m
function alternativas(s) {
  // o texto da alternativa pode começar na mesma linha do marcador
  const parts = s.split(/^\(alternativa ([A-E])\)((?:[ \t]*\((?:CORRETA|ANULADA|INCORRETA)\))*)[ \t]*/m)
  const alts = []
  for (let i = 1; i < parts.length; i += 3) {
    // às vezes o "(CORRETA)" cai na linha de baixo, colado ao texto
    const marks = parts[i + 1] + ((parts[i + 2] || '').match(/^\s*\((?:CORRETA|ANULADA)\)/)?.[0] || '')
    const texto = (parts[i + 2] || '').replace(/^\s*\((?:CORRETA|ANULADA)\)\s*/, '')
    alts.push({ letra: parts[i], texto: para(texto), correta: /CORRETA/.test(marks), anulada: /ANULADA/.test(marks) })
  }
  return alts
}

function filtros(s = '') {
  const out = {}
  const parts = s.split(/^\[([^\]]+)\]\s*$/m)
  for (let i = 1; i < parts.length; i += 2) {
    const vals = [...new Set(parts[i + 1].split('\n').map(x => x.trim()).filter(Boolean))]
    out[parts[i].trim()] = vals.join(' ')
  }
  return out
}

const DIF = { 'fácil': 'facil', facil: 'facil', 'médio': 'media', medio: 'media', 'média': 'media', 'difícil': 'dificil', dificil: 'dificil' }
const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\W+/g, ' ').trim()

function parseFile(rec, raw) {
  const txt = clean(raw)
  const heads = [...txt.matchAll(Q_HEAD)]
  const qs = [], rejects = []
  heads.forEach((h, i) => {
    const num = +h[1]
    const block = txt.slice(h.index + h[0].length, heads[i + 1]?.index ?? txt.length)
    if (block.replace(/\s/g, '').length < 40) return // linha de índice (ex.: Checklist), não é questão
    const s = sections(block)
    let alts = alternativas(s.alternativas || '')
    // S_alt às vezes deixa só o marcador das erradas: sobrou uma alternativa com texto e ela é a correta
    const cheias = alts.filter(a => a.texto)
    if (cheias.length === 1 && cheias[0].correta) alts = cheias
    const corretas = alts.filter(a => a.correta)
    const f = filtros(s.filtros)
    const enunciado = para((s.enunciado || '').replace(/^\(([A-ZÀ-Ú .-]{3,})\)\s*/, ''))
    const ies = f['IES'] || ((s.enunciado || '').match(/^\(([A-ZÀ-Ú .-]{3,})\)/) || [])[1] || null
    const comentario = para(s.comentario || '')
    const discursiva = alts.length === 0 && /^-*$/.test((s.alternativas || '').trim()) && !!comentario
    const why =
      !enunciado ? 'sem enunciado' :
      discursiva ? null :
      alts.length < 1 ? 'alternativas: 0' :
      alts.length && corretas.length !== 1 ? `corretas: ${corretas.length}` : null
    const base = { arquivo: rec.id, numero: num }
    if (why) { rejects.push({ ...base, motivo: why }); return }
    const codigo = (s.codigo || '').match(/^\d+/)?.[0] || null
    const dif = DIF[(s.dificuldade || '').split('\n')[0].trim().toLowerCase()] || null
    qs.push({
      id: `${rec.id.slice(0, 10)}-${num}`,
      disciplina: f['Áreas de Conhecimento'] || [rec.modulo, rec.moduloNum].filter(Boolean).join(' ') || rec.area,
      tema: f['Subáreas de Conhecimento'] || '',
      periodo: rec.periodo ?? (rec.area === 'internato' ? 9 : 0),
      dificuldade: dif || 'media',
      enunciado,
      alternativas: alts.map(a => a.texto),
      correta: alts.indexOf(corretas[0]),
      comentario,
      referencia: s.referencias ? para(s.referencias) : undefined,
      fonte: [[rec.modulo, rec.moduloNum].filter(Boolean).join(' '), rec.semestre, ies].filter(Boolean).join(' · '),
      origem: {
        arquivo: rec.id, caminho: rec.path, numero: num, codigo, area: rec.area, modulo: rec.modulo, moduloNum: rec.moduloNum,
        semestre: rec.semestre, ies, unidade: s.unidade?.split('\n')[0] || null, dificuldadeOriginal: dif ? undefined : 'ausente',
        competencia: f['Competências (Objetivos)'] || undefined, semana: f['Semanas'] || undefined,
        // enunciado curto que cita imagem/figura: o PDF provavelmente tinha uma imagem que não veio no texto
        alternativaVazia: alts.length > 1 && alts.some(a => !a.texto) || undefined,
        possivelImagem: /\b(imagem|figura|foto|radiografia|eletrocardiograma|tomografia|lâmina)\b/i.test(enunciado) || undefined,
      },
    })
  })
  return { qs, rejects, heads: heads.length }
}

// ---------- execução ----------
const catalog = JSON.parse(await readFile(new URL('catalog.json', DIR), 'utf8'))
const all = [], report = { arquivos: 0, semFormato: 0, questoesBrutas: 0, rejeitadas: [], porArquivo: [] }
for (const rec of catalog) {
  const p = new URL(`txt/${rec.id}.txt`, DIR)
  if (!(await exists(p))) continue
  const raw = await readFile(p, 'utf8')
  if (!/^\(alternativa [A-E]\)/m.test(raw) || !/\(CORRETA\)/.test(raw)) { report.semFormato++; continue }
  report.arquivos++
  const { qs, rejects, heads } = parseFile(rec, raw)
  report.questoesBrutas += heads
  report.rejeitadas.push(...rejects.map(r => ({ ...r, caminho: rec.path })))
  report.porArquivo.push({ caminho: rec.path, cabecalhos: heads, ok: qs.length, rejeitadas: rejects.length })
  all.push(...qs)
}

// dedupe: mesmo código Afya, ou mesmo enunciado normalizado (enunciados curtos levam as alternativas junto).
// A versão completa (com todas as alternativas) ganha da versão "só a correta" (provas S_alt).
const keyOf = q => q.origem.codigo ? `c:${q.origem.codigo}` :
  'h:' + createHash('sha1').update(norm(q.enunciado.length > 80 ? q.enunciado : q.enunciado + '|' + q.alternativas.join('|'))).digest('hex')
const seen = new Map()
for (const q of [...all].sort((a, b) => b.alternativas.length - a.alternativas.length)) {
  const prev = seen.get(keyOf(q))
  if (prev) { (prev.origem.tambemEm ||= []).push(q.origem.caminho); continue }
  seen.set(keyOf(q), q)
}
const unicas = [...seen.values()]
const out = unicas.filter(q => q.alternativas.length > 1)
// só a alternativa correta (provas S_alt) ou discursiva → vira flashcard (frente = enunciado, verso = resposta)
const cards = unicas.filter(q => q.alternativas.length <= 1).map(({ id, disciplina, tema, enunciado, alternativas, comentario, origem }) =>
  alternativas.length
    ? { id: `fc-${id}`, tipo: 'so-correta', disciplina, tema, frente: enunciado, verso: alternativas[0], comentario, origem }
    : { id: `fc-${id}`, tipo: 'discursiva', disciplina, tema, frente: enunciado, verso: comentario, origem })

report.validas = all.length
report.unicas = out.length
report.flashcards = cards.length
report.duplicadas = all.length - unicas.length
report.motivos = report.rejeitadas.reduce((a, r) => (a[r.motivo] = (a[r.motivo] || 0) + 1, a), {})
report.comComentario = out.filter(q => q.comentario).length
report.comDificuldade = out.filter(q => !q.origem.dificuldadeOriginal).length
report.comArea = out.filter(q => q.tema).length
report.possivelImagem = out.filter(q => q.origem.possivelImagem).length
report.alternativaVazia = out.filter(q => q.origem.alternativaVazia).length
report.porPeriodo = out.reduce((a, q) => (a[q.periodo] = (a[q.periodo] || 0) + 1, a), {})

await writeFile(new URL('questoes.json', DIR), JSON.stringify(out, null, 1))
await writeFile(new URL('flashcards.json', DIR), JSON.stringify(cards, null, 1))
await writeFile(new URL('parse-report.json', DIR), JSON.stringify(report, null, 1))
const { rejeitadas, porArquivo, ...resumo } = report
console.error(JSON.stringify(resumo, null, 1))
