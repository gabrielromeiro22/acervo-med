import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

// Texto de busca guardado na URL (?q=…) sem perder teclas: o campo usa um estado local e a URL
// (que dispara a filtragem pesada) só é atualizada depois de uma pausa na digitação.
export function useTermo(chave = 'q', espera = 250) {
  const [params, setParams] = useSearchParams()
  const naUrl = params.get(chave) ?? ''
  const [valor, setValor] = useState(naUrl)
  const ultimo = useRef(naUrl)
  // a URL mudou por fora (voltar, link): acompanha
  useEffect(() => { if (naUrl !== ultimo.current) { ultimo.current = naUrl; setValor(naUrl) } }, [naUrl])
  useEffect(() => {
    if (valor === ultimo.current) return
    const t = setTimeout(() => {
      ultimo.current = valor
      setParams((cur) => { if (valor) cur.set(chave, valor); else cur.delete(chave); return cur }, { replace: true })
    }, espera)
    return () => clearTimeout(t)
  }, [valor, chave, espera, setParams])
  return [valor, setValor, naUrl] as const
}
