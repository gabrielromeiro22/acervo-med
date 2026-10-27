// Gera os arquivos que o app carrega em runtime (public/acervo/), a partir das saídas dos parsers.
// Uso: node scripts/acervo/build-app.mjs
// Saída: public/acervo/questoes.json, flashcards.json, arquivos.json
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises'

const DATA = new URL('../../data/acervo/', import.meta.url)
const OUT = new URL('../../public/acervo/', import.meta.url)
const read = async f => JSON.parse(await readFile(new URL(f, DATA), 'utf8'))

const INTERNATO = { APS: 'Atenção Primária', CC: 'Clínica Cirúrgica', CM: 'Clínica Médica', GO: 'Ginecologia e Obstetrícia', PED: 'Pediatria', UESM: 'Urgência, Emergência e Saúde Mental' }

// disciplina = módulo do currículo (o período já separa SOI 3 de SOI 4); internato e provas externas viram a própria área
function disciplina(o) {
  if (o.area === 'internato') return `Internato · ${INTERNATO[o.modulo] || o.modulo}`
  if (o.area === 'tpi') return 'TPI'
  if (o.area === 'enamed') return 'ENAMED'
  return o.modulo || 'Outros'
}
const periodo = o => o.area === 'internato' ? 9 : o.area === 'periodo' ? o.periodoNum : 0
// área de conhecimento quando a Afya informa; senão agrupa pela prova
const tema = (t, o) => t || (o.semestre ? `Prova ${o.semestre}` : 'Geral')
const drop = obj => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ''))

const catalog = await read('catalog.json')
const byId = new Map(catalog.map(r => [r.id, r]))
const meta = o => ({ ...o, periodoNum: byId.get(o.arquivo)?.periodo })

// todas as saídas de parser: questoes*.json / flashcards*.json
const files = await readdir(DATA)
const load = async prefix => (await Promise.all(files.filter(f => f.startsWith(prefix) && f.endsWith('.json')).map(read))).flat()

const seen = new Set()
const questoes = (await load('questoes')).filter(q => !seen.has(q.id) && seen.add(q.id)).map(q => {
  const o = meta(q.origem)
  return drop({
    id: q.id, disciplina: disciplina(o), tema: tema(q.tema, o), periodo: periodo(o), dificuldade: q.dificuldade,
    enunciado: q.enunciado, alternativas: q.alternativas, correta: q.correta, comentario: q.comentario,
    referencia: q.referencia, fonte: q.fonte, arquivo: o.arquivo, imagem: o.possivelImagem || o.alternativaVazia ? 1 : undefined,
  })
})
const flashcards = (await load('flashcards')).map(c => {
  const o = meta(c.origem)
  const verso = c.comentario && c.tipo === 'so-correta' ? `${c.verso}\n\n${c.comentario}` : c.verso
  return drop({ id: c.id, disciplina: disciplina(o), tema: tema(c.tema, o), frente: c.frente, verso, arquivo: o.arquivo })
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
