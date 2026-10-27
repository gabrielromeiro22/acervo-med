// Consolida os assuntos da classificação: por matéria, junta sinônimos e variações finas num nome canônico
// ("Insuficiência cardíaca descompensada" → "Insuficiência cardíaca"), para o filtro de assunto não ter
// centenas de itens com uma questão só. O nome fino continua nas palavras-chave (build-app).
// Uso: node --env-file=.env.local scripts/acervo/consolidate.mjs
// Entrada: data/acervo/classificacao.json   Saída: data/acervo/assuntos-canonicos.json ({ materia: { assunto: canônico } })
import Anthropic from '@anthropic-ai/sdk'
import { readFile, writeFile } from 'node:fs/promises'

const MODEL = 'claude-opus-5-5'
const DATA = new URL('../../data/acervo/', import.meta.url)

const SYSTEM = `Você organiza o índice de assuntos de um banco de questões de Medicina, dentro de uma matéria.
Recebe a lista de assuntos usados, com o número de questões de cada um. Para cada assunto da lista, devolva o assunto canônico em que ele deve ser agrupado.

Regras:
- Junte sinônimos, grafias diferentes e variações mais estreitas do mesmo tema ("Insuficiência cardíaca descompensada" e "Insuficiência cardíaca avançada" → "Insuficiência cardíaca"; "Tratamento da hipertensão arterial" → "Hipertensão arterial sistêmica").
- Mantenha separados temas que um estudante estudaria como capítulos diferentes (Fibrilação atrial e Bradiarritmias podem virar "Arritmias cardíacas", mas Endocardite infecciosa não se junta a Febre reumática).
- Prefira como nome canônico o assunto já existente com mais questões, ou um nome de capítulo de livro-texto em português, 2 a 6 palavras.
- Mire em grupos de pelo menos 3 questões; um assunto pequeno e realmente distinto pode ficar sozinho.
- Todo assunto da entrada deve aparecer exatamente uma vez em "de".`

const SCHEMA = {
  type: 'object',
  properties: {
    mapa: {
      type: 'array',
      items: {
        type: 'object',
        properties: { de: { type: 'string' }, para: { type: 'string' } },
        required: ['de', 'para'],
        additionalProperties: false,
      },
    },
  },
  required: ['mapa'],
  additionalProperties: false,
}

const classes = JSON.parse(await readFile(new URL('classificacao.json', DATA), 'utf8'))
const porMateria = {}
for (const c of Object.values(classes)) {
  const m = (porMateria[c.materia] ||= {})
  m[c.assunto] = (m[c.assunto] || 0) + 1
}

const client = new Anthropic()
const out = {}
let entrada = 0, saida = 0
const fila = Object.entries(porMateria).filter(([, a]) => Object.keys(a).length > 1)
await Promise.all(Array.from({ length: 8 }, async () => {
  for (let item; (item = fila.shift());) {
    const [materia, assuntos] = item
    const lista = Object.entries(assuntos).sort((a, b) => b[1] - a[1]).map(([a, n]) => `${a} (${n})`).join('\n')
    try {
      const msg = await client.withOptions({ maxRetries: 6 }).messages.create({
        model: MODEL,
        max_tokens: 32000,
        output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
        system: SYSTEM,
        messages: [{ role: 'user', content: `Matéria: ${materia}\n\nAssuntos (questões):\n${lista}` }],
      })
      entrada += msg.usage.input_tokens; saida += msg.usage.output_tokens
      if (msg.stop_reason !== 'end_turn') { console.error(`${materia}: stop_reason ${msg.stop_reason}`); continue }
      const { mapa } = JSON.parse(msg.content.filter(b => b.type === 'text').map(b => b.text).join(''))
      out[materia] = Object.fromEntries(mapa.filter(x => assuntos[x.de]).map(x => [x.de, x.para.trim()]))
      const antes = Object.keys(assuntos).length, depois = new Set(Object.values(out[materia])).size
      console.error(`${materia}: ${antes} → ${depois} assuntos`)
    } catch (e) {
      if (e instanceof Anthropic.APIError) console.error(`${materia}: erro ${e.status}`)
      else throw e
    }
  }
}))
await writeFile(new URL('assuntos-canonicos.json', DATA), JSON.stringify(out, null, 1))
console.error(`US$ ${((entrada * 4 + saida * 20) / 1e6).toFixed(2)}`)
