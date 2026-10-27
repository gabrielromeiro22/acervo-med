# Acervo Med

App de estudo (questões, flashcards e materiais) feito com React + TypeScript + Vite.

## Rodando no localhost

Pré-requisitos: [Node.js](https://nodejs.org/) 20 ou superior (vem com o npm) e Git.

```bash
# 1. Clonar o repositório
git clone https://github.com/pcarvalhor/acervo-med.git
cd acervo-med

# 2. Instalar as dependências
npm install

# 3. Subir o servidor de desenvolvimento
npm run dev
```

Depois abra **http://localhost:5173** no navegador. As alterações no código recarregam a página automaticamente. Para parar o servidor, use `Ctrl + C` no terminal.

Os dados que o app usa (`public/acervo/*.json`) já estão no repositório, então não precisa rodar mais nada para ver as questões e os flashcards.

### Versão de produção (opcional)

```bash
npm run build     # gera a pasta dist/
npm run preview   # serve o build em http://localhost:4173
```

## Regerando o acervo (opcional)

Os PDFs e textos baixados (`data/acervo/pdf` e `data/acervo/txt`) não vão para o Git. Para baixar e processar tudo de novo:

```bash
npm run acervo                        # crawl → catalog → fetch → parse
node scripts/acervo/build-app.mjs     # atualiza public/acervo/*.json
```

### Meu Acervo (`meu-acervo/`)

O conversor de provas do Meu Acervo agora vive neste repositório. Ele baixa os PDFs do Drive, extrai as questões
(com OCR quando o PDF não tem texto), recorta figuras e tabelas e marca o assunto do roteiro de cada questão.
O `meu-acervo/index.html` é o app original em HTML, que continua funcionando sozinho.

Requisitos: Python 3 com PyMuPDF (`fitz`) e Pillow, e `swiftc` (o `tools/ocr.swift` é compilado sozinho).

```bash
cd meu-acervo
python3 atualizar_drive.py 1TQU9bdNlLGHEYGuIQkRbVCDSYmMO7bCI acervo_tree.json   # só para atualizar a árvore do Drive
python3 converter_provas.py "1º PERÍODO" "2º PERÍODO" TPI ENAMED INTERNATO       # grupos parciais funcionam
python3 assuntos.py                                                              # sempre depois do conversor
cd ..
node scripts/acervo/merge-meuacervo.mjs   # traz as questões e as figuras para data/acervo e public/acervo/img
node scripts/acervo/build-app.mjs         # junta tudo, descarta repetidas e prefere o texto com parágrafos e figuras
```

O cache de PDFs (`meu-acervo/_cache`, ~740 MB), as provas geradas e as figuras brutas ficam fora do Git.
Questões novas sem matéria precisam de classificação (`npm run acervo:classificar`, com a chave da API em `.env.local`).

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento em http://localhost:5173 |
| `npm run build` | Checa os tipos e gera o build em `dist/` |
| `npm run preview` | Serve o build em http://localhost:4173 |
| `npm run lint` | Roda o ESLint |
| `npm run acervo` | Pipeline completo de coleta e parsing do acervo |
