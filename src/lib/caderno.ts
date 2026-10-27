import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib'
import type { Question } from '../data/types'
import { LETTERS } from './format'

// Caderno de prova em PDF (A4, duas colunas), gerado no navegador.
// formato 'tablet': bolinhas ao lado das alternativas e círculo "rever" em cada questão, para pintar num app de notas;
//   as posições das bolinhas voltam em `layout`, para a correção automática do PDF respondido.
// formato 'impresso': o mesmo caderno + folha de respostas no fim.
// formato 'respostas': gabarito marcado e comentários (no fim ou em cada questão), para estudar.
export type Formato = 'tablet' | 'impresso' | 'respostas'
export type Comentarios = 'nenhum' | 'final' | 'cada'
export interface Posicao { pagina: number; paginas?: number[]; bolhas: [number, number, number][]; olho?: [number, number, number]; olhoPagina?: number }

const A4 = { w: 595.28, h: 841.89 }, M = 36, GAP = 18, COL = (A4.w - 2 * M - GAP) / 2, TOPO = A4.h - 110, BASE = M + 14
const MAG = rgb(0.78, 0.05, 0.35), CINZA = rgb(0.45, 0.45, 0.5), FUNDO = rgb(0.95, 0.95, 0.97), VERDE = rgb(0.09, 0.64, 0.29)
const IMG = /\[\[IMG:([\w.-]+)\]\]/g

// Helvetica do PDF só tem o alfabeto latino (WinAnsi): troca o que ela não desenha
const TROCA: Record<string, string> = {
  '≥': '>=', '≤': '<=', '≠': '!=', '→': '->', '←': '<-', '↑': '^', '↓': 'v', '✓': 'v', '✔': 'v', '✗': 'x', 'μ': 'µ', 'α': 'alfa', 'β': 'beta',
  'γ': 'gama', 'δ': 'delta', 'Δ': 'Delta', 'κ': 'kappa', 'λ': 'lambda', 'ﬁ': 'fi', 'ﬂ': 'fl', 'ﬀ': 'ff', 'ﬃ': 'ffi', '‐': '-', '‑': '-', '−': '-',
  ' ': ' ', '​': '', ' ': ' ', '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '⁺': '+', '⁻': '-', '²': '²', '³': '³', '½': '½',
}
const WIN = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ')
const ansi = (t: string) => [...t.normalize('NFC')].map((c) => {
  const k = c.charCodeAt(0)
  if (k === 10 || (k >= 32 && k < 127) || (k >= 160 && k <= 255) || WIN.has(c)) return c
  return TROCA[c] ?? (c.normalize('NFD').replace(/[̀-ͯ]/g, '').charCodeAt(0) < 256 ? c.normalize('NFD').replace(/[̀-ͯ]/g, '') : '?')
}).join('')

type Peca = { tipo: 'texto'; t: string } | { tipo: 'img'; f: string }
const pecas = (t: string): Peca[] => t.split(IMG).map((p, i) => (i % 2 ? { tipo: 'img' as const, f: p } : { tipo: 'texto' as const, t: p })).filter((p) => p.tipo === 'img' || p.t.trim())

function quebra(t: string, font: PDFFont, size: number, larg: number) {
  const linhas: string[] = []
  for (const par of ansi(t).split(/\n/)) {
    if (!par.trim()) { linhas.push(''); continue }
    let cur = ''
    for (const w of par.split(/\s+/)) {
      const tent = cur ? `${cur} ${w}` : w
      if (font.widthOfTextAtSize(tent, size) <= larg) cur = tent
      else {
        if (cur) linhas.push(cur)
        cur = w
        while (font.widthOfTextAtSize(cur, size) > larg) { // palavra maior que a linha
          let k = cur.length; while (k > 1 && font.widthOfTextAtSize(cur.slice(0, k), size) > larg) k--
          linhas.push(cur.slice(0, k)); cur = cur.slice(k)
        }
      }
    }
    linhas.push(cur)
  }
  while (linhas.length && !linhas[linhas.length - 1]) linhas.pop()
  return linhas
}

export async function gerarCaderno(questoes: Question[], o: {
  titulo: string; subtitulo?: string; aluno?: string; formato: Formato; comentarios?: Comentarios
}): Promise<{ bytes: Uint8Array; layout: Posicao[]; paginas: number }> {
  const pdf = await PDFDocument.create()
  pdf.setTitle(o.titulo); pdf.setCreator('Acervo Med')
  const R = await pdf.embedFont(StandardFonts.Helvetica), B = await pdf.embedFont(StandardFonts.HelveticaBold)
  const imgs = new Map<string, PDFImage | null>()
  const imagem = async (f: string) => {
    if (!imgs.has(f)) {
      try {
        const buf = await (await fetch(`${import.meta.env.BASE_URL}acervo/img/${f}`)).arrayBuffer()
        imgs.set(f, /\.png$/i.test(f) ? await pdf.embedPng(buf) : await pdf.embedJpg(buf))
      } catch { imgs.set(f, null) }
    }
    return imgs.get(f)!
  }

  let page!: PDFPage, col = 0, y = 0
  const x0 = () => M + col * (COL + GAP)
  const novaPagina = () => {
    page = pdf.addPage([A4.w, A4.h]); col = 0; y = TOPO
    const n = pdf.getPageCount()
    page.drawText(ansi(o.titulo), { x: M, y: A4.h - 46, size: n === 1 ? 20 : 12, font: B, color: rgb(0.1, 0.1, 0.15) })
    if (o.subtitulo) page.drawText(ansi(o.subtitulo), { x: M, y: A4.h - (n === 1 ? 64 : 60), size: 9, font: R, color: CINZA })
    if (o.aluno && n === 1) page.drawText(ansi(o.aluno.toUpperCase()), { x: M, y: A4.h - 78, size: 8, font: B, color: CINZA })
    page.drawText('Acervo Med', { x: A4.w - M - B.widthOfTextAtSize('Acervo Med', 9), y: A4.h - 46, size: 9, font: B, color: MAG })
    page.drawLine({ start: { x: M, y: A4.h - 90 }, end: { x: A4.w - M, y: A4.h - 90 }, thickness: 1.2, color: rgb(0.15, 0.15, 0.2) })
    page.drawLine({ start: { x: A4.w / 2, y: TOPO + 6 }, end: { x: A4.w / 2, y: BASE - 4 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.85) })
    page.drawText(`${n}`, { x: A4.w / 2 - 3, y: M - 12, size: 8, font: R, color: CINZA })
  }
  const precisa = (h: number) => {
    if (y - h >= BASE) return
    if (col === 0) { col = 1; y = TOPO } else novaPagina()
  }
  const texto = (t: string, { size = 9.5, font = R, recuo = 0, cor = rgb(0.1, 0.1, 0.12), larg = COL } = {}) => {
    const lh = size * 1.32
    for (const l of quebra(t, font, size, larg - recuo)) {
      precisa(lh)
      y -= lh
      if (l) page.drawText(l, { x: x0() + recuo, y: y + 2, size, font, color: cor })
    }
  }
  const bloco = async (t: string, opts: Parameters<typeof texto>[1] = {}) => {
    for (const p of pecas(t)) {
      if (p.tipo === 'texto') { texto(p.t.trim(), opts); continue }
      const im = await imagem(p.f)
      if (!im) { texto('[imagem no PDF original]', { ...opts, cor: CINZA }); continue }
      // recorte de texto (r_*) no tamanho da letra; figura até a largura da coluna
      const escala = p.f.startsWith('r_') ? 0.5 : 0.75
      let w = im.width * escala, h = im.height * escala
      const maxW = COL - (opts.recuo ?? 0)
      if (w > maxW) { h *= maxW / w; w = maxW }
      if (h > TOPO - BASE - 20) { w *= (TOPO - BASE - 20) / h; h = TOPO - BASE - 20 }
      precisa(h + 4)
      y -= h + 3
      page.drawImage(im, { x: x0() + (opts.recuo ?? 0), y, width: w, height: h })
      y -= 1
    }
  }

  novaPagina()
  if (o.formato !== 'respostas') {
    const h = 54
    page.drawRectangle({ x: x0(), y: y - h, width: COL, height: h, color: rgb(1, 0.97, 0.8), borderColor: rgb(0.15, 0.15, 0.2), borderWidth: 1 })
    page.drawText('COMO RESPONDER', { x: x0() + 8, y: y - 13, size: 7.5, font: B })
    const passos = o.formato === 'tablet'
      ? ['Pinte a bolinha da sua resposta (caneta escura, preenchida).', 'Pinte o círculo "rever" nas questões que quer revisar.', 'Envie este PDF respondido no Acervo Med para corrigir.']
      : ['Responda no caderno e passe as respostas para a folha', 'de respostas no fim. Depois lance as letras no Acervo Med.', '']
    passos.forEach((p, i) => p && page.drawText(ansi(p), { x: x0() + 8, y: y - 25 - i * 10, size: 7.5, font: R }))
    y -= h + 12
  }

  const layout: Posicao[] = []
  for (const [n, q] of questoes.entries()) {
    precisa(22 + 3 * 12.5)
    // cabeçalho da questão
    y -= 18
    page.drawRectangle({ x: x0(), y, width: COL, height: 16, color: FUNDO })
    page.drawRectangle({ x: x0(), y, width: 2.5, height: 16, color: MAG })
    page.drawText(`${n + 1}ª QUESTÃO`, { x: x0() + 8, y: y + 4.5, size: 8.5, font: B })
    const pos: Posicao = { pagina: pdf.getPageCount() - 1, bolhas: [] }
    if (o.formato === 'tablet') {
      const cx = x0() + COL - 10, cy = y + 8
      page.drawCircle({ x: cx, y: cy, size: 5.5, borderColor: rgb(0.2, 0.2, 0.25), borderWidth: 1 })
      page.drawText('rever', { x: cx - 32, y: y + 5, size: 7, font: R, color: CINZA })
      pos.olho = [cx, cy, 5.5]; pos.olhoPagina = pdf.getPageCount() - 1
    }
    y -= 6
    await bloco(q.enunciado)
    y -= 4
    const bolhaPag: number[] = []
    for (const [i, alt] of q.alternativas.entries()) {
      const primeira = quebra(alt.replace(IMG, ' ').trim() || ' ', R, 9.5, COL - 22).length
      precisa(Math.min(primeira, 2) * 12.5 + 4)
      y -= 3
      // a bolinha fica no início da alternativa (página e coluna de antes do texto, que pode continuar na outra coluna)
      const pg = page, cx = x0() + 9, cy = y - 7, certa = o.formato === 'respostas' && i === q.correta
      pg.drawCircle({ x: cx, y: cy, size: 7, borderColor: certa ? VERDE : rgb(0.2, 0.2, 0.25), borderWidth: 0.9, color: certa ? VERDE : undefined })
      pg.drawText(LETTERS[i], { x: cx - B.widthOfTextAtSize(LETTERS[i], 7.5) / 2, y: cy - 2.7, size: 7.5, font: B, color: certa ? rgb(1, 1, 1) : rgb(0.2, 0.2, 0.25) })
      bolhaPag.push(pdf.getPageCount() - 1)
      pos.bolhas.push([cx, cy, 7])
      await bloco(alt, { recuo: 22 })
    }
    // a correção lê uma página por questão: guarda a página de cada bolinha (normalmente todas iguais)
    pos.pagina = bolhaPag[0] ?? pos.pagina
    if (bolhaPag.some((p) => p !== pos.pagina)) pos.paginas = bolhaPag
    layout.push(pos)
    if (o.formato === 'respostas' && o.comentarios === 'cada') {
      y -= 4
      texto(`Gabarito: ${LETTERS[q.correta]}`, { font: B, size: 9, cor: VERDE })
      if (q.comentario) await bloco(q.comentario, { size: 8.5, cor: rgb(0.25, 0.25, 0.3) })
    }
    y -= 12
  }

  if (o.formato === 'respostas' && o.comentarios !== 'cada') {
    novaPagina()
    texto('GABARITO', { font: B, size: 12 })
    y -= 4
    texto(questoes.map((q, i) => `${i + 1}-${LETTERS[q.correta]}`).join('   '), { size: 9.5, larg: A4.w - 2 * M })
    if (o.comentarios === 'final') {
      y -= 10
      for (const [i, q] of questoes.entries()) {
        precisa(30)
        y -= 4
        texto(`${i + 1}ª QUESTÃO · gabarito ${LETTERS[q.correta]}`, { font: B, size: 9, cor: MAG })
        await bloco(q.comentario || 'Sem comentário no material original.', { size: 8.5 })
        y -= 6
      }
    }
  }

  if (o.formato === 'impresso') {
    novaPagina()
    texto('FOLHA DE RESPOSTAS', { font: B, size: 12 })
    y -= 6
    for (const [i, q] of questoes.entries()) {
      precisa(20)
      y -= 20
      page.drawText(`${i + 1}`.padStart(2, ' '), { x: x0() + 4, y: y + 4, size: 10, font: B })
      q.alternativas.forEach((_, k) => {
        const cx = x0() + 40 + k * 26
        page.drawCircle({ x: cx, y: y + 7, size: 8, borderColor: rgb(0.2, 0.2, 0.25), borderWidth: 1 })
        page.drawText(LETTERS[k], { x: cx - B.widthOfTextAtSize(LETTERS[k], 8) / 2, y: y + 4.2, size: 8, font: B, color: rgb(0.35, 0.35, 0.4) })
      })
    }
  }

  return { bytes: await pdf.save(), layout, paginas: pdf.getPageCount() }
}

export function baixarPdf(nome: string, bytes: Uint8Array) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }))
  Object.assign(document.createElement('a'), { href: url, download: `${nome.replace(/\s*·\s*/g, ' - ').replace(/[^\p{L}\p{N}\- .]+/gu, '').trim() || 'prova'}.pdf` }).click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
