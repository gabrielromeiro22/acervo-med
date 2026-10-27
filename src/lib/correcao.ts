import { AnnotationMode, GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { Posicao } from './caderno'

GlobalWorkerOptions.workerSrc = workerUrl

// Lê o caderno do tablet respondido (o PDF baixado do Acervo Med, pintado num app de notas):
// desenha cada página com as anotações e mede quanto de cada bolinha ficou pintado.
export interface Leitura { resposta?: number; duvida: boolean; rever: boolean }

const ESCALA = 3
// fração "pintada" do miolo do círculo: pixel escuro ou colorido (a letra impressa ocupa uns 15%)
function preenchido(ctx: CanvasRenderingContext2D, alturaPt: number, [x, y, r]: [number, number, number]) {
  const cx = x * ESCALA, cy = (alturaPt - y) * ESCALA, rr = r * ESCALA * 0.8
  const img = ctx.getImageData(Math.round(cx - rr), Math.round(cy - rr), Math.round(2 * rr), Math.round(2 * rr)).data
  let tinta = 0, total = 0
  for (let j = 0; j < 2 * rr; j++) for (let i = 0; i < 2 * rr; i++) {
    if ((i - rr) ** 2 + (j - rr) ** 2 > rr * rr) continue
    const k = (Math.round(j) * Math.round(2 * rr) + Math.round(i)) * 4
    const [r1, g, b] = [img[k], img[k + 1], img[k + 2]]
    const max = Math.max(r1, g, b), min = Math.min(r1, g, b)
    total++
    if (max < 170 || max - min > 70) tinta++
  }
  return total ? tinta / total : 0
}

export async function lerCaderno(arquivo: File, layout: Posicao[], paginasEsperadas?: number): Promise<{ leituras: Leitura[]; aviso?: string }> {
  const doc = await getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()) }).promise
  const aviso = paginasEsperadas && doc.numPages !== paginasEsperadas
    ? `O PDF enviado tem ${doc.numPages} páginas e o caderno gerado tinha ${paginasEsperadas}. Confira se é o arquivo certo.` : undefined
  const cache = new Map<number, { ctx: CanvasRenderingContext2D; h: number }>()
  const pagina = async (n: number) => {
    if (!cache.has(n)) {
      const p = await doc.getPage(n + 1)
      const vp = p.getViewport({ scale: ESCALA })
      const cv = document.createElement('canvas')
      cv.width = vp.width; cv.height = vp.height
      const ctx = cv.getContext('2d', { willReadFrequently: true })!
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height)
      await p.render({ canvasContext: ctx, viewport: vp, annotationMode: AnnotationMode.ENABLE }).promise
      cache.set(n, { ctx, h: p.getViewport({ scale: 1 }).height })
    }
    return cache.get(n)!
  }
  const leituras: Leitura[] = []
  for (const pos of layout) {
    const fracoes: number[] = []
    for (const [i, b] of pos.bolhas.entries()) {
      const n = pos.paginas?.[i] ?? pos.pagina
      if (n >= doc.numPages) { fracoes.push(0); continue }
      const { ctx, h } = await pagina(n)
      fracoes.push(preenchido(ctx, h, b))
    }
    const ordem = fracoes.map((f, i) => [f, i] as const).sort((a, b) => b[0] - a[0])
    const [melhor, segunda] = ordem
    const marcada = melhor && melhor[0] > 0.42
    // duas bolinhas pintadas, ou uma só meio pintada: deixa para o aluno conferir
    const duvida = !!marcada && ((segunda && segunda[0] > 0.42) || melhor[0] < 0.55)
    let rever = false
    if (pos.olho && (pos.olhoPagina ?? pos.pagina) < doc.numPages) {
      const { ctx, h } = await pagina(pos.olhoPagina ?? pos.pagina)
      rever = preenchido(ctx, h, pos.olho) > 0.35
    }
    leituras.push({ resposta: marcada && !(segunda && segunda[0] > 0.42) ? melhor[1] : undefined, duvida, rever })
  }
  return { leituras, aviso }
}
