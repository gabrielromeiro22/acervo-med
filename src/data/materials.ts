import type { Material } from './types'

// Conteúdo em markdown simples: "# ", "## ", "- ", "**negrito**" e parágrafos.
export const MATERIALS: Material[] = [
  {
    id: 'mat-01', titulo: 'ECG em 10 minutos', disciplina: 'Cardiologia', periodo: 7, tipo: 'resumo',
    conteudo: `# ECG em 10 minutos
## Roteiro de leitura
- **Ritmo**: onda P antes de todo QRS, positiva em DII → sinusal.
- **Frequência**: 300 dividido pelo número de quadrados grandes entre dois R.
- **Eixo**: DI e aVF positivos → eixo normal.
- **Intervalos**: PR 120–200 ms; QRS < 120 ms; QTc < 440 ms (H) / 460 ms (M).
- **Segmento ST e onda T**: procure supra/infra e inversões por parede.

## Paredes e artérias
- Anterior (V1–V4): descendente anterior.
- Lateral (DI, aVL, V5–V6): circunflexa.
- Inferior (DII, DIII, aVF): coronária direita na maioria.

## Pegadinhas
Supra de ST difuso com infra de PR sugere pericardite, não IAM.`,
  },
  {
    id: 'mat-02', titulo: 'Distúrbios do potássio', disciplina: 'Nefrologia', periodo: 8, tipo: 'resumo',
    conteudo: `# Distúrbios do potássio
## Hipercalemia
- ECG: T apiculada → alargamento do QRS → onda sinusoidal.
- **Estabilizar**: gluconato de cálcio.
- **Deslocar**: insulina + glicose, β2-agonista, bicarbonato (se acidose).
- **Eliminar**: furosemida, resinas, diálise.

## Hipocalemia
- ECG: onda U, achatamento de T, infra de ST.
- Repor KCl; corrigir magnésio junto, ou a reposição falha.`,
  },
  {
    id: 'mat-03', titulo: 'Checklist do politrauma (xABCDE)', disciplina: 'Cirurgia', periodo: 9, tipo: 'checklist',
    conteudo: `# Checklist do politrauma
- x — Controle de hemorragia exsanguinante (compressão, torniquete)
- A — Via aérea pérvia com restrição de movimento cervical
- B — Ventilação: pneumotórax hipertensivo, aberto, hemotórax maciço
- C — Circulação: acessos calibrosos, cristaloide aquecido, hemocomponentes
- D — Glasgow, pupilas, glicemia
- E — Exposição completa e prevenção de hipotermia
## Adjuntos
- FAST, radiografia de tórax e pelve, sonda (se sem contraindicação), monitorização.`,
  },
  {
    id: 'mat-04', titulo: 'Testes diagnósticos sem mistério', disciplina: 'Medicina Preventiva', periodo: 5, tipo: 'mapa',
    conteudo: `# Testes diagnósticos
## Tabela 2×2
- Sensibilidade = VP / (VP + FN) — bom para **descartar** (SnNout).
- Especificidade = VN / (VN + FP) — bom para **confirmar** (SpPin).
- VPP = VP / (VP + FP); VPN = VN / (VN + FN).

## Prevalência
Quanto maior a prevalência, maior o VPP e menor o VPN. Sensibilidade e especificidade não mudam com a prevalência.`,
  },
  {
    id: 'mat-05', titulo: 'Calendário vacinal do 1º ano', disciplina: 'Pediatria', periodo: 10, tipo: 'checklist',
    conteudo: `# Calendário vacinal — primeiro ano (resumo)
- Ao nascer: BCG, hepatite B
- 2 meses: pentavalente, VIP, pneumocócica 10, rotavírus
- 3 meses: meningocócica C
- 4 meses: pentavalente, VIP, pneumocócica 10, rotavírus
- 5 meses: meningocócica C
- 6 meses: pentavalente, VIP
- 9 meses: febre amarela
- 12 meses: tríplice viral, pneumocócica 10 (reforço), meningocócica C (reforço)

Confirme sempre o calendário vigente do PNI, que é atualizado periodicamente.`,
  },
  {
    id: 'mat-06', titulo: 'Sorologia da hepatite B', disciplina: 'Gastroenterologia', periodo: 8, tipo: 'mapa',
    conteudo: `# Sorologia da hepatite B
- **HBsAg+** → infecção presente (aguda ou crônica > 6 meses).
- **Anti-HBc IgM+** → infecção aguda (ou janela imunológica).
- **Anti-HBc total+ e anti-HBs+** → infecção prévia curada.
- **Anti-HBs+ isolado** → vacinação.
- **HBeAg+** → replicação viral ativa.`,
  },
]
