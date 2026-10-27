// Classifica cada questão em matéria (lista fixa), assunto e palavras-chave com a API do Claude.
// Lê public/acervo/questoes.json (gerado pelo build-app) e grava data/acervo/classificacao.json ({ id: {...} }),
// que o build-app incorpora na próxima execução. Só manda questões ainda não classificadas.
//
// Uso (a chave fica em .env.local, ANTHROPIC_API_KEY):
//   node --env-file=.env.local scripts/acervo/classify.mjs --amostra 30   síncrono, para validar
//   node --env-file=.env.local scripts/acervo/classify.mjs --lote         cria um Message Batch (50% mais barato)
//   node --env-file=.env.local scripts/acervo/classify.mjs --coletar      busca o resultado do lote
import Anthropic from '@anthropic-ai/sdk'
import { readFile, writeFile, access } from 'node:fs/promises'

const MODEL = 'claude-opus-5-5'
const POR_PEDIDO = 10
const DATA = new URL('../../data/acervo/', import.meta.url)
const OUT = new URL('classificacao.json', DATA)
const BATCH = new URL('classify-batch.json', DATA)
const exists = p => access(p).then(() => true, () => false)

export const MATERIAS = [
  'Anatomia', 'Histologia e Embriologia', 'Fisiologia', 'Bioquímica', 'Biologia Celular e Genética', 'Farmacologia', 'Patologia',
  'Microbiologia e Parasitologia', 'Imunologia', 'Semiologia', 'Comunicação e Relação Médico-Paciente', 'Saúde Coletiva e Epidemiologia',
  'Medicina de Família e Comunidade', 'Metodologia Científica e Bioestatística', 'Ética e Medicina Legal', 'Cardiologia', 'Pneumologia',
  'Gastroenterologia e Hepatologia', 'Nefrologia', 'Endocrinologia', 'Hematologia', 'Oncologia', 'Infectologia', 'Neurologia', 'Psiquiatria',
  'Reumatologia', 'Dermatologia', 'Geriatria', 'Ginecologia', 'Obstetrícia', 'Pediatria', 'Cirurgia Geral', 'Trauma', 'Ortopedia',
  'Urologia', 'Otorrinolaringologia', 'Oftalmologia', 'Anestesiologia', 'Urgência e Emergência',
]

const SYSTEM = `Você classifica questões de provas de graduação em Medicina (Afya, Brasil) para um banco de questões de estudo.

Para cada questão, devolva:
- materia: exatamente uma da lista permitida. Escolha pelo conteúdo cobrado, não pelo módulo da prova (uma questão de SOI sobre insuficiência cardíaca é Cardiologia; uma de HAM sobre técnica de aferir pressão é Semiologia; uma de IESC sobre princípios do SUS é Saúde Coletiva e Epidemiologia). Questões de ciclo básico ficam na ciência básica cobrada (Fisiologia, Anatomia…), mesmo com caso clínico.
- assunto: o tópico específico, como aparece em sumários de livro-texto ou editais de residência, em português, 2 a 6 palavras, primeira letra maiúscula (ex.: "Insuficiência cardíaca", "Síndrome coronariana aguda", "Princípios do SUS", "Exame físico do abdome", "Pré-eclâmpsia", "Ciclo cardíaco"). Prefira nomes gerais e reutilizáveis a descrições da questão: questões sobre o mesmo tema devem receber o mesmo assunto.
- palavras_chave: 3 a 6 termos que um estudante usaria para buscar esta questão (doenças, fármacos, estruturas, exames), sem repetir o assunto.

Matérias permitidas: ${MATERIAS.join('; ')}.`

const SCHEMA = {
  type: 'object',
  properties: {
    itens: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          materia: { type: 'string', enum: MATERIAS },
          assunto: { type: 'string' },
          palavras_chave: { type: 'array', items: { type: 'string' } },
        },
        required: ['id', 'materia', 'assunto', 'palavras_chave'],
        additionalProperties: false,
      },
    },
  },
  required: ['itens'],
  additionalProperties: false,
}

// o que o modelo vê de cada questão: contexto da prova, enunciado, alternativas, gabarito e o começo do comentário
const LETRAS = 'ABCDE'
const render = q => [
  `<questao id="${q.id}">`,
  `Prova: ${q.disciplina} · ${q.periodo === 0 ? 'TPI/ENAMED' : q.periodo > 8 ? 'Internato' : q.periodo + 'º período'}${q.tema && !/^Prova /.test(q.tema) ? ` · tópico informado: ${q.tema}` : ''}`,
  q.enunciado,
  ...q.alternativas.map((a, i) => `${LETRAS[i]}) ${a}`),
  `Gabarito: ${LETRAS[q.correta]}`,
  q.comentario ? `Comentário: ${q.comentario.slice(0, 700)}` : '',
  '</questao>',
].filter(Boolean).join('\n')

const params = grupo => ({
  model: MODEL,
  max_tokens: 6000,
  output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
  system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
  messages: [{ role: 'user', content: `Classifique as ${grupo.length} questões abaixo.\n\n${grupo.map(render).join('\n\n')}` }],
})

function aplicar(classes, msg, ids) {
  if (msg.stop_reason !== 'end_turn') return `stop_reason ${msg.stop_reason}`
  const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('')
  let itens
  try { itens = JSON.parse(text).itens } catch { return 'JSON inválido' }
  for (const it of itens) {
    if (!ids.includes(it.id)) continue
    classes[it.id] = { materia: it.materia, assunto: it.assunto.trim(), palavras: it.palavras_chave.map(p => p.trim()).filter(Boolean) }
  }
  return null
}

const client = new Anthropic()
const classes = (await exists(OUT)) ? JSON.parse(await readFile(OUT, 'utf8')) : {}
const save = () => writeFile(OUT, JSON.stringify(classes, null, 1))
const arg = process.argv[2]

if (arg === '--coletar') {
  const { id, grupos } = JSON.parse(await readFile(BATCH, 'utf8'))
  const b = await client.messages.batches.retrieve(id)
  console.error(`lote ${id}: ${b.processing_status}`, b.request_counts)
  if (b.processing_status !== 'ended') process.exit(0)
  const falhas = []
  for await (const r of await client.messages.batches.results(id)) {
    if (r.result.type !== 'succeeded') { falhas.push(`${r.custom_id}: ${r.result.type}`); continue }
    const erro = aplicar(classes, r.result.message, grupos[r.custom_id])
    if (erro) falhas.push(`${r.custom_id}: ${erro}`)
  }
  await save()
  console.error(`classificadas: ${Object.keys(classes).length} · grupos com falha: ${falhas.length} (rode --lote de novo para reenviar)`)
  for (const f of falhas.slice(0, 20)) console.error('  ' + f)
  process.exit(0)
}

const questoes = JSON.parse(await readFile(new URL('../../public/acervo/questoes.json', import.meta.url), 'utf8'))
const todo = questoes.filter(q => !classes[q.id])
const grupos = []
for (let i = 0; i < todo.length; i += POR_PEDIDO) grupos.push(todo.slice(i, i + POR_PEDIDO))
console.error(`${questoes.length} questões, ${todo.length} sem classificação, ${grupos.length} pedidos de ${POR_PEDIDO}`)

if (arg === '--amostra') {
  const n = Math.ceil(Number(process.argv[3] || 30) / POR_PEDIDO)
  // espalha a amostra pelo acervo (períodos e módulos diferentes)
  const passo = Math.max(1, Math.floor(grupos.length / n))
  const escolhidos = Array.from({ length: n }, (_, i) => grupos[i * passo]).filter(Boolean)
  let entrada = 0, saida = 0, cache = 0
  await Promise.all(escolhidos.map(async (g, i) => {
    try {
      const msg = await client.messages.create(params(g))
      entrada += msg.usage.input_tokens; saida += msg.usage.output_tokens; cache += msg.usage.cache_read_input_tokens ?? 0
      const erro = aplicar(classes, msg, g.map(q => q.id))
      if (erro) console.error(`pedido ${i}: ${erro}`)
    } catch (e) {
      if (e instanceof Anthropic.RateLimitError) console.error(`pedido ${i}: limite de taxa, rode de novo`)
      else if (e instanceof Anthropic.APIError) console.error(`pedido ${i}: erro ${e.status} ${e.message.slice(0, 200)}`)
      else throw e
    }
  }))
  await save()
  // custo por questão medido na amostra, projetado para o resto (preço do lote = metade do síncrono)
  const nq = escolhidos.flat().length
  const usd = (entrada * 4 + saida * 20 + cache * 0.2) / 1e6
  console.error(`amostra: ${nq} questões · tokens entrada ${entrada} (cache ${cache}) saída ${saida} · US$ ${usd.toFixed(3)}`)
  console.error(`projeção para ${todo.length - nq} restantes via lote: ~US$ ${((usd / nq) * (todo.length - nq) / 2).toFixed(2)}`)
} else if (arg === '--rapido') {
  // síncrono em paralelo: termina em minutos, ao preço cheio (o lote custa metade, mas pode ficar horas na fila)
  const PARALELO = Number(process.argv[3] || 12)
  const fila = [...grupos.entries()]
  let feitos = 0, entrada = 0, saida = 0
  const falhas = []
  await Promise.all(Array.from({ length: PARALELO }, async () => {
    for (let item; (item = fila.shift());) {
      const [i, g] = item
      try {
        const msg = await client.withOptions({ maxRetries: 6 }).messages.create(params(g))
        entrada += msg.usage.input_tokens; saida += msg.usage.output_tokens
        const erro = aplicar(classes, msg, g.map(q => q.id))
        if (erro) falhas.push(`g${i}: ${erro}`)
      } catch (e) {
        if (e instanceof Anthropic.APIError) falhas.push(`g${i}: erro ${e.status}`)
        else throw e
      }
      // salva o progresso de tempos em tempos: interromper não perde o que já foi pago
      if (++feitos % 10 === 0) {
        await save()
        console.error(`${feitos}/${grupos.length} pedidos · US$ ${((entrada * 4 + saida * 20) / 1e6).toFixed(2)}`)
      }
    }
  }))
  await save()
  console.error(`fim: ${Object.keys(classes).length} classificadas · US$ ${((entrada * 4 + saida * 20) / 1e6).toFixed(2)} · falhas ${falhas.length} (rode de novo para reenviar)`)
  for (const f of falhas.slice(0, 20)) console.error('  ' + f)
} else if (arg === '--lote') {
  if (!grupos.length) { console.error('nada a classificar'); process.exit(0) }
  const mapa = Object.fromEntries(grupos.map((g, i) => [`g${i}`, g.map(q => q.id)]))
  const b = await client.messages.batches.create({ requests: grupos.map((g, i) => ({ custom_id: `g${i}`, params: params(g) })) })
  await writeFile(BATCH, JSON.stringify({ id: b.id, criado: new Date().toISOString(), grupos: mapa }, null, 1))
  console.error(`lote criado: ${b.id} (${grupos.length} pedidos). Depois: --coletar`)
} else {
  console.error('use --amostra N, --lote ou --coletar')
}
