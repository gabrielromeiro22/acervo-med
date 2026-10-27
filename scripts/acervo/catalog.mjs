// Classifica cada arquivo do índice pelo caminho/nome.
// Uso: node scripts/acervo/catalog.mjs
// Entrada: data/acervo/index.json   Saída: data/acervo/catalog.json
import { readFile, writeFile } from 'node:fs/promises'

const IN = new URL('../../data/acervo/index.json', import.meta.url)
const OUT = new URL('../../data/acervo/catalog.json', import.meta.url)

// "✅[4º PERÍODO]" → "4º PERÍODO"; "📄 RESUMOS 4" → "RESUMOS 4"
const clean = s => s.replace(/[✅🔍📄🎯🆕]/gu, '').replace(/[[\]]/g, '').replace(/\s+/g, ' ').trim()

const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 }

function semestre(name) {
  let m = name.match(/\b(20\d\d)[ .]?([12])\b/) || name.match(/\b(20\d\d)0([12])\b/)
  if (m) return `${m[1]}.${m[2]}`
  m = name.match(/\b(2\d)\.([12])\b/)
  return m ? `20${m[1]}.${m[2]}` : null
}

function tipo(f, segs) {
  const n = f.name
  if (!/\.pdf$/i.test(n)) return /\.(jpe?g|png)$/i.test(n) ? 'imagem' : 'atalho'
  if (segs.some(s => /^RESUMOS\b/.test(s))) return 'resumo'
  if (/ASSUNTOS/i.test(n)) return 'assuntos'
  if (/REPETIDAS/i.test(n)) return 'repetidas'
  if (/comentad/i.test(n)) return 'comentada'
  if (/gabarito/i.test(n)) return 'gabarito'
  if (/recurso|errata/i.test(n) || segs.some(s => /RECURSO/i.test(s) && !/Provas-Recursos/i.test(s))) return 'recurso'
  return 'prova'
}

function modulo(seg) {
  if (!seg) return { modulo: null, moduloNum: null }
  const m = seg.match(/^(HAM|SOI|IESC|MCM|CC|CI|Integradora)\s+([IVX]+|\d+)$/i)
  if (m) return { modulo: /integradora/i.test(m[1]) ? 'Integradora' : m[1].toUpperCase(), moduloNum: ROMAN[m[2].toUpperCase()] ?? +m[2] }
  return { modulo: seg, moduloNum: null }
}

const files = JSON.parse(await readFile(IN, 'utf8'))
const out = files.map(f => {
  const segs = f.path.split('/').slice(0, -1).map(clean)
  const top = segs[0] || ''
  const per = top.match(/^(\d)º PERÍODO$/)
  const area = per ? 'periodo' : /TPI/.test(top) ? 'tpi' : /ENAMED/.test(top) ? 'enamed' : /INTERNATO/.test(top) ? 'internato' : 'outro'
  const t = tipo(f, segs)
  const rec = {
    id: f.id,
    path: f.path,
    nome: f.name.replace(/\.pdf$/i, ''),
    area,
    periodo: per ? +per[1] : null,
    tipo: t,
    semestre: semestre(f.name),
    ...modulo(t === 'resumo' ? segs[3] : segs[1]),
  }
  if (t === 'resumo') rec.autor = segs[2] ?? null
  if (area === 'internato') {
    const r = f.name.match(/ROT(?:A[CÇ][AÃ]O|\.)?\s*(\d)/i); if (r) rec.rotacao = +r[1]
    const v = f.name.match(/(?:Topicos|ROT\.?\s*\d)\s*-\s*([AB])\b/i); if (v) rec.versao = v[1].toUpperCase()
  }
  const flags = []
  if (/s_ ?alt/i.test(f.name)) flags.push('sem-alternativas')
  if (/substitutiva/i.test(f.name)) flags.push('substitutiva')
  if (/anulad/i.test(f.name)) flags.push('anulada')
  if (/\bN2\b/.test(f.path)) flags.push('n2')
  if (/tablet|ipad/i.test(f.path)) flags.push('tablet')
  if (flags.length) rec.flags = flags
  return rec
})

await writeFile(OUT, JSON.stringify(out, null, 1))
const count = k => Object.entries(out.reduce((a, r) => (a[r[k] ?? '—'] = (a[r[k] ?? '—'] || 0) + 1, a), {})).map(([v, n]) => `${v}: ${n}`).join(' · ')
console.error(`OK: ${out.length} arquivos → data/acervo/catalog.json`)
console.error(`tipo      ${count('tipo')}`)
console.error(`área      ${count('area')}`)
console.error(`semestre  ${out.filter(r => r.tipo !== 'resumo' && r.semestre).length}/${out.filter(r => r.tipo !== 'resumo').length} provas/gabaritos com semestre`)
