import { Fragment } from 'react'

// Texto das questões com as figuras do Meu Acervo: [[IMG:arquivo]] aponta para public/acervo/img/.
// r_*.png é um trecho da página recortado em 2x (texto que o OCR não leu bem): mostra no tamanho da letra.
const IMG = /\[\[IMG:([\w.-]+)\]\]/g
const src = (f: string) => `${import.meta.env.BASE_URL}acervo/img/${f}`

export function RichText({ text, className = '' }: { text: string; className?: string }) {
  if (!text.includes('[[IMG:')) return <span className={`whitespace-pre-line ${className}`}>{text}</span>
  const parts = text.split(IMG) // [texto, arquivo, texto, arquivo, …]
  return (
    <span className={`whitespace-pre-line ${className}`}>
      {parts.map((p, i) => i % 2 === 0 ? <Fragment key={i}>{p}</Fragment> : p.startsWith('r_') ? (
        <img key={i} src={src(p)} alt="Trecho do PDF" className="inline-block max-w-full rounded bg-white align-middle"
          onLoad={(e) => { const im = e.currentTarget; im.style.width = `${im.naturalWidth / 1.3}px` }} />
      ) : (
        <a key={i} href={src(p)} target="_blank" rel="noopener" className="my-3 block">
          <img src={src(p)} alt="Imagem da questão" loading="lazy" className="max-h-[28rem] max-w-full rounded-xl border border-line bg-white" />
        </a>
      ))}
    </span>
  )
}
