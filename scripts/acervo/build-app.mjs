// Gera os arquivos que o app carrega em runtime (public/acervo/), a partir das saídas dos parsers.
// Uso: node scripts/acervo/build-app.mjs
// Saída: public/acervo/questoes.json, flashcards.json, arquivos.json
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'

const DATA = new URL('../../data/acervo/', import.meta.url)
const OUT = new URL('../../public/acervo/', import.meta.url)
const read = async f => JSON.parse(await readFile(new URL(f, DATA), 'utf8'))

const INTERNATO = { APS: 'Atenção Primária', CC: 'Clínica Cirúrgica', CM: 'Clínica Médica', GO: 'Ginecologia e Obstetrícia', PED: 'Pediatria', UESM: 'Urgência, Emergência e Saúde Mental' }

// disciplina = módulo como o aluno chama ("SOI 4", "HAM 4", "Integradora 4"); internato e provas externas viram a própria área
function disciplina(o) {
  if (o.area === 'internato') return `Internato · ${INTERNATO[o.modulo] || o.modulo}`
  if (o.area === 'tpi') return 'TPI'
  if (o.area === 'enamed') return 'ENAMED'
  if (o.moduloNum) return `${o.modulo} ${o.moduloNum}`
  return o.modulo ? `${o.modulo} · ${o.periodoNum}º` : 'Outros'
}
const periodo = o => o.area === 'internato' ? 9 : o.area === 'periodo' ? o.periodoNum : 0
const drop = obj => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ''))

// Prova de origem a partir do cabeçalho da devolutiva (Afya), do nome do arquivo ou da linha "(2025.1) ROT.1-A-14T: Q.29"
// das compilações: "N2 · 2025.1 · Rot. 2 · B", "Integradora · 2024.1", "TPI · 2023.2"
function prova(o, rec) {
  const src = [o.cabecalho, rec?.nome, o.provaOriginal].filter(Boolean).join(' | ')
  const sem = o.semestre || (src.match(/\b(20\d\d)[ .]?([12])\b/) || []).slice(1).join('.') || null
  const tipo =
    o.area === 'tpi' || /TESTE DE PROGRESSO|\bTPI\b/i.test(src) ? 'TPI' :
    o.area === 'enamed' ? (/SERIADO/i.test(src) ? 'Simulado seriado' : /SIMULADO/i.test(src) ? 'Simulado ENAMED' : 'ENAMED') :
    /INTEGRADORA/i.test(src) && o.modulo === 'Integradora' ? 'Integradora' :
    /\bN\s?2\b|N2[_ ]/i.test(src) || o.area === 'internato' ? 'N2' :
    /\bN[1I]\b|N[1I][_ ]/i.test(src) ? 'N1' : null
  const extras = []
  if (/REPOSI[ÇC][ÃA]O|SUBSTITUTIVA/i.test(src)) extras.push('Reposição')
  if (/IRREGULAR/i.test(src)) extras.push('Irregular')
  const rot = src.match(/ROT(?:A[ÇC][ÃA]O)?\.?\s*(\d|I{1,3})\b/i)
  if (rot) extras.push(`Rot. ${{ I: 1, II: 2, III: 3 }[rot[1].toUpperCase()] ?? rot[1]}`)
  const ver = rec?.versao || (src.match(/ROT\.?\s*\d-([AB])-|TEMA ([AB])\b|- ([AB]) -/i) || []).slice(1).find(Boolean)
  if (ver) extras.push(ver.toUpperCase())
  const label = [tipo, sem, ...extras].filter(Boolean).join(' · ')
  // número da questão na prova original: "Q.29" nas compilações, posição no caderno na devolutiva
  const numero = +((o.provaOriginal || '').match(/Q\.\s*(\d+)/) || [])[1] || (rec?.tipo === 'prova' ? o.numero : undefined)
  return { label: label || null, numero }
}

// matéria, assunto e palavras-chave da classificação pela API (scripts/acervo/classify.mjs), quando já houver
const classes = await readFile(new URL('classificacao.json', DATA), 'utf8').then(JSON.parse, () => ({}))
// assunto canônico por matéria (scripts/acervo/consolidate.mjs); o nome fino original vira palavra-chave
const canon = await readFile(new URL('assuntos-canonicos.json', DATA), 'utf8').then(JSON.parse, () => ({}))
function assunto(c) {
  if (!c) return {}
  const tema = canon[c.materia]?.[c.assunto] || c.assunto
  return { tema, palavras: tema === c.assunto ? c.palavras : [c.assunto, ...c.palavras] }
}

const catalog = await read('catalog.json')
const byId = new Map(catalog.map(r => [r.id, r]))
const meta = o => ({ ...o, periodoNum: byId.get(o.arquivo)?.periodo })

// todas as saídas de parser: questoes*.json / flashcards*.json
const files = await readdir(DATA)
// o arquivo principal (ex.: questoes.json, da Afya) vem antes dos demais (questoes-acervo.json…)
const load = async prefix => (await Promise.all(files.filter(f => f.startsWith(prefix) && f.endsWith('.json'))
  .sort((a, b) => (b === `${prefix}.json`) - (a === `${prefix}.json`) || a.localeCompare(b)).map(read))).flat()

// a mesma questão aparece na prova original (Afya) e nas compilações do Acervo: fica a primeira versão vista
// (questoes.json da Afya vem antes de questoes-acervo.json), herdando o tópico da compilação quando faltar
// as figuras [[IMG:…]] do Meu Acervo não contam para reconhecer a mesma questão
const norm = s => s.replace(/\[\[IMG:[^\]]+\]\]/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\W+/g, ' ').trim()
// o Meu Acervo mantém a instituição no começo do enunciado ("(AFYA IPATINGA) Homem, 62 anos…"); não conta para comparar
// dentro do mesmo PDF. Entre PDFs diferentes não: uma questão repetida em outro semestre continua na prova dela.
const normE = s => norm(s.replace(/^\s*\([^)]{2,60}\)\s*/, ''))
const keyOf = q => createHash('sha1').update(norm(q.enunciado).slice(0, 300) + '|' + norm(q.alternativas.join('|')).slice(0, 200)).digest('hex')
// dentro do mesmo PDF, enunciado inteiro + gabarito bastam: as alternativas podem vir mal lidas pelo OCR numa versão e
// recortadas na outra. Inteiro, porque um caso clínico longo serve de base para várias questões e só a pergunta final muda.
const keyArq = q => q.origem?.arquivo && `${q.origem.arquivo}|${q.correta}|${normE(q.enunciado)}`
// o Meu Acervo (questoes-meuacervo.json) guarda as quebras de parágrafo ("I - …", "II - …"); o texto dele vence o achatado
const rico = t => (t?.includes('\n') ? 1 : 0) + (t?.includes('[[IMG:') ? 2 : 0)
const paragrafos = (prev, q, campos) => {
  const igual = (c, a, b) => (c === 'enunciado' || c === 'frente' ? normE(a) === normE(b) : norm(a) === norm(b))
  for (const c of campos) if (rico(q[c]) > rico(prev[c]) && igual(c, q[c], prev[c] || '')) prev[c] = q[c]
  if (q.roteiro && !prev.roteiro) prev.roteiro = q.roteiro
  // alternativas recortadas do PDF trocam as mal lidas, se o gabarito for o mesmo
  if (q.alternativas?.some(a => a.includes('[[IMG:')) && q.alternativas.length === prev.alternativas?.length && q.correta === prev.correta) prev.alternativas = q.alternativas
}
const unique = new Map(), porArquivo = new Map(), ids = new Set()
for (const q of await load('questoes')) {
  const k = keyOf(q), ka = keyArq(q), prev = unique.get(k) || (ka && porArquivo.get(ka))
  if (prev) { if (!prev.tema && q.tema) prev.tema = q.tema; paragrafos(prev, q, ['enunciado', 'comentario']); continue }
  if (ids.has(q.id)) continue
  const novo = { ...q }
  ids.add(q.id); unique.set(k, novo)
  if (ka) porArquivo.set(ka, novo)
}
const questoes = [...unique.values()].map(q => {
  const o = meta(q.origem), c = classes[q.id], a = assunto(c), p = prova(o, byId.get(o.arquivo))
  return drop({
    id: q.id, disciplina: disciplina(o), materia: c?.materia, tema: a.tema || q.tema || 'Geral', periodo: periodo(o), dificuldade: q.dificuldade,
    enunciado: q.enunciado, alternativas: q.alternativas, correta: q.correta, comentario: q.comentario,
    referencia: q.referencia, fonte: q.fonte, prova: p.label, numero: p.numero, palavras: a.palavras,
    roteiro: q.roteiro, arquivo: o.arquivo,
    imagem: (o.possivelImagem || o.alternativaVazia) && !q.enunciado.includes('[[IMG:') ? 1 : undefined,
  })
})
console.error(`classificadas: ${questoes.filter(q => q.materia).length}/${questoes.length} · com prova: ${questoes.filter(q => q.prova).length}`)
const cards = new Map()
for (const c of await load('flashcards')) {
  const k = normE(c.frente).slice(0, 300), prev = cards.get(k)
  if (prev) paragrafos(prev, c, ['frente', 'verso', 'comentario'])
  else cards.set(k, { ...c })
}
const flashcards = [...cards.values()].map(c => {
  const o = meta(c.origem)
  const verso = c.comentario && c.tipo === 'so-correta' ? `${c.verso}\n\n${c.comentario}` : c.verso
  return drop({ id: c.id, disciplina: disciplina(o), tema: c.tema || 'Geral', frente: c.frente, verso, arquivo: o.arquivo })
})
// catálogo navegável (sem os atalhos "SITE: WWW.ACERVO.VIP")
const arquivos = catalog.filter(r => r.tipo !== 'atalho').map(r => drop({
  id: r.id, path: r.path, nome: r.nome, area: r.area, periodo: r.periodo, tipo: r.tipo, semestre: r.semestre,
  modulo: r.modulo, autor: r.autor,
}))

await mkdir(OUT, { recursive: true })
for (const [name, data] of Object.entries({ questoes, flashcards, arquivos })) {
  const json = JSON.stringify(data)
  await writeFile(new URL(`${name}.json`, OUT), json)
  console.error(`${name}.json  ${data.length} itens  ${(json.length / 1e6).toFixed(1)} MB`)
}
