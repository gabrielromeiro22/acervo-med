import type { Question } from './types'

// Questões de exemplo autorais. Substitua ou complemente pelo importador (/app/importar).
export const QUESTIONS: Question[] = [
  // ───────── Fisiologia
  {
    id: 'fis-01', disciplina: 'Fisiologia', tema: 'Cardiovascular', periodo: 2, dificuldade: 'facil',
    enunciado: 'Segundo o mecanismo de Frank-Starling, o aumento do volume diastólico final do ventrículo esquerdo, dentro dos limites fisiológicos, leva a:',
    alternativas: ['Redução do volume sistólico', 'Aumento da força de contração e do volume sistólico', 'Redução da pré-carga', 'Aumento exclusivo da frequência cardíaca', 'Diminuição da fração de ejeção obrigatoriamente'],
    correta: 1,
    comentario: 'Maior enchimento distende os sarcômeros para um comprimento mais próximo do ótimo de sobreposição actina-miosina e aumenta a sensibilidade ao cálcio, elevando a força de contração e o volume sistólico. A frequência cardíaca não é o mecanismo envolvido.',
    referencia: 'Guyton & Hall – Tratado de Fisiologia Médica, cap. Coração como bomba',
  },
  {
    id: 'fis-02', disciplina: 'Fisiologia', tema: 'Renal', periodo: 2, dificuldade: 'media',
    enunciado: 'A maior parte do sódio filtrado (cerca de 65%) é reabsorvida em qual segmento do néfron?',
    alternativas: ['Túbulo contorcido proximal', 'Ramo descendente fino da alça de Henle', 'Ramo ascendente espesso da alça de Henle', 'Túbulo contorcido distal', 'Ducto coletor cortical'],
    correta: 0,
    comentario: 'O túbulo proximal reabsorve aproximadamente dois terços do sódio e da água filtrados, de forma isosmótica. A alça ascendente espessa reabsorve cerca de 25%, o distal ~5% e o coletor a fração final, sob regulação da aldosterona.',
    referencia: 'Guyton & Hall – Tratado de Fisiologia Médica, cap. Reabsorção tubular',
  },
  {
    id: 'fis-03', disciplina: 'Fisiologia', tema: 'Respiratória', periodo: 2, dificuldade: 'media',
    enunciado: 'Qual das condições abaixo desvia a curva de dissociação da oxi-hemoglobina para a direita?',
    alternativas: ['Alcalose', 'Hipotermia', 'Redução do 2,3-BPG', 'Aumento da PaCO2', 'Presença de hemoglobina fetal'],
    correta: 3,
    comentario: 'Desvio para a direita (menor afinidade, maior liberação de O2 aos tecidos) ocorre com aumento de CO2, acidose, hipertermia e aumento do 2,3-BPG (efeito Bohr). Hemoglobina fetal, alcalose e hipotermia desviam para a esquerda.',
  },
  // ───────── Farmacologia
  {
    id: 'far-01', disciplina: 'Farmacologia', tema: 'Autonômico', periodo: 4, dificuldade: 'facil',
    enunciado: 'O antídoto de escolha na intoxicação grave por organofosforados, para reverter os efeitos muscarínicos, é:',
    alternativas: ['Flumazenil', 'Naloxona', 'Atropina', 'N-acetilcisteína', 'Fisostigmina'],
    correta: 2,
    comentario: 'Organofosforados inibem a acetilcolinesterase, causando síndrome colinérgica. A atropina (antagonista muscarínico) é titulada até secar secreções brônquicas; a pralidoxima pode ser associada para reativar a enzima. Fisostigmina agravaria o quadro.',
  },
  {
    id: 'far-02', disciplina: 'Farmacologia', tema: 'Antimicrobianos', periodo: 4, dificuldade: 'media',
    enunciado: 'Qual efeito adverso é classicamente associado aos aminoglicosídeos?',
    alternativas: ['Síndrome do homem vermelho', 'Ototoxicidade e nefrotoxicidade', 'Prolongamento do QT com torsades como efeito mais comum', 'Descoloração dentária em crianças', 'Ruptura de tendão'],
    correta: 1,
    comentario: 'Aminoglicosídeos (gentamicina, amicacina) são nefrotóxicos e ototóxicos, além de poderem causar bloqueio neuromuscular. Homem vermelho = vancomicina; dentes = tetraciclinas; tendão = fluoroquinolonas.',
  },
  {
    id: 'far-03', disciplina: 'Farmacologia', tema: 'Cardiovascular', periodo: 4, dificuldade: 'media',
    enunciado: 'Tosse seca persistente em paciente hipertenso que iniciou recentemente um anti-hipertensivo sugere uso de:',
    alternativas: ['Bloqueador do receptor de angiotensina', 'Inibidor da ECA', 'Bloqueador de canal de cálcio', 'Tiazídico', 'Betabloqueador'],
    correta: 1,
    comentario: 'Os IECA reduzem a degradação de bradicinina, que se acumula e provoca tosse seca (e, raramente, angioedema). A troca por um BRA costuma resolver, pois este não interfere na bradicinina.',
  },
  // ───────── Cardiologia
  {
    id: 'car-01', disciplina: 'Cardiologia', tema: 'Síndrome coronariana aguda', periodo: 7, dificuldade: 'media',
    enunciado: 'Homem de 58 anos com dor precordial em aperto há 1 hora. ECG com supradesnivelamento de ST em V1–V4. A parede acometida e a artéria mais provavelmente ocluída são:',
    alternativas: ['Inferior – coronária direita', 'Lateral – circunflexa', 'Anterior – descendente anterior', 'Posterior – circunflexa', 'Ventrículo direito – coronária direita'],
    correta: 2,
    comentario: 'Supra de ST em V1–V4 indica infarto de parede anterior/anterosseptal, irrigada pela artéria descendente anterior. DII, DIII e aVF correspondem à parede inferior; DI, aVL, V5–V6 à lateral.',
  },
  {
    id: 'car-02', disciplina: 'Cardiologia', tema: 'Insuficiência cardíaca', periodo: 7, dificuldade: 'dificil',
    enunciado: 'Em paciente com insuficiência cardíaca com fração de ejeção reduzida, sintomático, qual classe de medicamento NÃO demonstrou redução de mortalidade?',
    alternativas: ['Betabloqueador (carvedilol, bisoprolol, succinato de metoprolol)', 'Antagonista mineralocorticoide', 'Inibidor de SGLT2', 'Diurético de alça', 'Sacubitril-valsartana'],
    correta: 3,
    comentario: 'Diuréticos de alça aliviam congestão e sintomas, mas não reduzem mortalidade. Os quatro pilares com benefício de sobrevida são: betabloqueador, IECA/BRA/INRA, antagonista mineralocorticoide e iSGLT2.',
  },
  {
    id: 'car-03', disciplina: 'Cardiologia', tema: 'Arritmias', periodo: 7, dificuldade: 'media',
    enunciado: 'Paciente com fibrilação atrial não valvar, 72 anos, hipertenso e diabético. Seu escore CHA2DS2-VASc (sexo masculino) e a conduta quanto à anticoagulação são:',
    alternativas: ['2 – anticoagulação indicada', '3 – anticoagulação indicada', '1 – não anticoagular', '4 – apenas AAS', '3 – apenas AAS'],
    correta: 1,
    comentario: 'Idade 65–74 = 1, HAS = 1, DM = 1 → total 3. Em homens, escore ≥2 indica anticoagulação oral (preferencialmente DOAC na FA não valvar). AAS isolado não é alternativa adequada para prevenção de AVC na FA.',
  },
  // ───────── Pneumologia
  {
    id: 'pne-01', disciplina: 'Pneumologia', tema: 'Asma', periodo: 7, dificuldade: 'facil',
    enunciado: 'Na espirometria, o achado que caracteriza resposta significativa ao broncodilatador em adultos (critério clássico) é:',
    alternativas: ['Aumento do VEF1 ≥ 12% e ≥ 200 mL', 'Redução da CVF ≥ 10%', 'Relação VEF1/CVF > 0,9', 'Aumento do PFE de 5%', 'Queda do VEF1 ≥ 20%'],
    correta: 0,
    comentario: 'O critério clássico de reversibilidade é aumento do VEF1 ≥ 12% e ≥ 200 mL após broncodilatador. A queda ≥ 20% do VEF1 é usada em testes de broncoprovocação.',
  },
  {
    id: 'pne-02', disciplina: 'Pneumologia', tema: 'Tromboembolismo pulmonar', periodo: 8, dificuldade: 'media',
    enunciado: 'Paciente com suspeita de TEP, probabilidade clínica baixa pelo escore de Wells. O próximo passo mais adequado é:',
    alternativas: ['Angiotomografia imediata', 'Dosagem de D-dímero', 'Trombólise empírica', 'Arteriografia pulmonar', 'Iniciar varfarina'],
    correta: 1,
    comentario: 'Com probabilidade baixa/intermediária, o D-dímero tem alto valor preditivo negativo: se normal, praticamente exclui TEP. Se elevado, prossegue-se com angio-TC. Na alta probabilidade, vai-se direto à imagem.',
  },
  // ───────── Gastroenterologia
  {
    id: 'gas-01', disciplina: 'Gastroenterologia', tema: 'Hepatites', periodo: 8, dificuldade: 'media',
    enunciado: 'Perfil sorológico: HBsAg negativo, anti-HBc total negativo, anti-HBs positivo. A interpretação é:',
    alternativas: ['Hepatite B aguda', 'Hepatite B crônica', 'Imunidade por vacinação', 'Imunidade por infecção prévia', 'Janela imunológica'],
    correta: 2,
    comentario: 'Anti-HBs isolado (sem anti-HBc) indica imunidade vacinal, já que a vacina contém apenas HBsAg. Infecção prévia curada teria anti-HBc e anti-HBs positivos.',
  },
  {
    id: 'gas-02', disciplina: 'Gastroenterologia', tema: 'Hemorragia digestiva', periodo: 8, dificuldade: 'dificil',
    enunciado: 'Cirrótico com hematêmese volumosa por provável varizes esofágicas. Além da estabilização, qual combinação deve ser iniciada antes da endoscopia?',
    alternativas: ['Omeprazol isolado', 'Vasoconstritor esplâncnico (terlipressina/octreotide) e antibioticoprofilaxia', 'Betabloqueador não seletivo endovenoso', 'Transfusão para Hb > 12 g/dL', 'Balão de Sengstaken como primeira medida'],
    correta: 1,
    comentario: 'Na suspeita de hemorragia varicosa, inicia-se vasoconstritor esplâncnico e antibiótico profilático (ex.: ceftriaxona), com endoscopia em até 12 h para ligadura elástica. Transfusão deve ser restritiva (alvo Hb ~7–8). Betabloqueador é para profilaxia, não para a fase aguda.',
  },
  // ───────── Nefrologia
  {
    id: 'nef-01', disciplina: 'Nefrologia', tema: 'Distúrbios hidroeletrolíticos', periodo: 8, dificuldade: 'dificil',
    enunciado: 'Paciente com hipercalemia (K+ 7,1 mEq/L) e alterações eletrocardiográficas. A primeira medida, visando estabilizar a membrana do miocárdio, é:',
    alternativas: ['Bicarbonato de sódio', 'Gluconato de cálcio endovenoso', 'Insulina regular com glicose', 'Furosemida', 'Resina de troca (poliestirenossulfonato)'],
    correta: 1,
    comentario: 'O gluconato de cálcio estabiliza a membrana cardíaca em minutos, sem reduzir o potássio. Em seguida, desloca-se o K+ para o intracelular (insulina + glicose, β2-agonista) e promove-se sua eliminação (diurético, resinas, diálise).',
  },
  {
    id: 'nef-02', disciplina: 'Nefrologia', tema: 'Glomerulopatias', periodo: 8, dificuldade: 'media',
    enunciado: 'Criança de 7 anos com edema, hematúria, hipertensão e oligúria, 2 semanas após faringoamigdalite. Espera-se encontrar:',
    alternativas: ['C3 baixo, normalizando em até 8 semanas', 'C3 normal e proteinúria nefrótica', 'ANCA positivo', 'Anti-membrana basal positivo', 'IgA sérica muito elevada com hematúria simultânea à infecção'],
    correta: 0,
    comentario: 'Glomerulonefrite pós-estreptocócica: síndrome nefrítica após período de latência, com consumo de complemento (C3 baixo) que se normaliza em 6–8 semanas. Na nefropatia por IgA, a hematúria ocorre simultaneamente à infecção.',
  },
  // ───────── Endocrinologia
  {
    id: 'end-01', disciplina: 'Endocrinologia', tema: 'Diabetes', periodo: 8, dificuldade: 'facil',
    enunciado: 'Qual dos critérios abaixo, isoladamente e confirmado, estabelece o diagnóstico de diabetes mellitus?',
    alternativas: ['Glicemia de jejum de 110 mg/dL', 'HbA1c de 6,0%', 'Glicemia de 2 h no TOTG de 210 mg/dL', 'Glicemia casual de 180 mg/dL sem sintomas', 'Glicemia de jejum de 120 mg/dL'],
    correta: 2,
    comentario: 'Critérios: jejum ≥ 126 mg/dL, TOTG 2 h ≥ 200 mg/dL, HbA1c ≥ 6,5% ou glicemia casual ≥ 200 mg/dL com sintomas. Os demais valores caracterizam pré-diabetes ou são insuficientes.',
  },
  {
    id: 'end-02', disciplina: 'Endocrinologia', tema: 'Tireoide', periodo: 8, dificuldade: 'media',
    enunciado: 'Mulher com TSH elevado e T4 livre baixo, anti-TPO positivo. O diagnóstico mais provável é:',
    alternativas: ['Doença de Graves', 'Tireoidite de Hashimoto com hipotireoidismo primário', 'Hipotireoidismo central', 'Bócio multinodular tóxico', 'Hipertireoidismo subclínico'],
    correta: 1,
    comentario: 'TSH alto com T4L baixo define hipotireoidismo primário; anti-TPO positivo aponta Hashimoto, a causa mais comum em regiões com iodo suficiente. No hipotireoidismo central, o TSH estaria baixo ou inapropriadamente normal.',
  },
  // ───────── Infectologia
  {
    id: 'inf-01', disciplina: 'Infectologia', tema: 'Arboviroses', periodo: 9, dificuldade: 'media',
    enunciado: 'Paciente com dengue no 4º dia de doença apresenta dor abdominal intensa e contínua e vômitos persistentes. Segundo a classificação de risco, ele pertence ao grupo:',
    alternativas: ['A', 'B', 'C', 'D', 'Não se classifica, pois está na fase febril'],
    correta: 2,
    comentario: 'Presença de sinais de alarme (dor abdominal intensa, vômitos persistentes, sangramento de mucosa, letargia, hepatomegalia, aumento do hematócrito) classifica no grupo C, com hidratação venosa e internação. Grupo D = sinais de choque.',
  },
  {
    id: 'inf-02', disciplina: 'Infectologia', tema: 'Tuberculose', periodo: 9, dificuldade: 'facil',
    enunciado: 'O esquema básico para tratamento da tuberculose pulmonar em adultos no Brasil é:',
    alternativas: ['2RHZE / 4RH', '6RHZE', '2RH / 4RHZE', '9RH', '2HZE / 10RH'],
    correta: 0,
    comentario: 'Fase intensiva de 2 meses com rifampicina, isoniazida, pirazinamida e etambutol, seguida de 4 meses de manutenção com rifampicina e isoniazida.',
    referencia: 'Ministério da Saúde – Manual de Recomendações para o Controle da TB',
  },
  {
    id: 'inf-03', disciplina: 'Infectologia', tema: 'HIV', periodo: 9, dificuldade: 'media',
    enunciado: 'Em paciente com HIV e CD4 < 200 células/mm³, está indicada profilaxia primária para:',
    alternativas: ['Toxoplasmose apenas', 'Pneumocistose com sulfametoxazol-trimetoprim', 'Complexo Mycobacterium avium com azitromicina, sempre', 'Criptococose com fluconazol', 'Citomegalovírus com ganciclovir'],
    correta: 1,
    comentario: 'CD4 < 200 indica profilaxia para P. jirovecii com SMX-TMP (que também protege contra toxoplasmose quando CD4 < 100 e IgG positivo). Profilaxias para MAC, criptococo e CMV não são recomendadas de rotina com TARV.',
  },
  // ───────── Pediatria
  {
    id: 'ped-01', disciplina: 'Pediatria', tema: 'Neonatologia', periodo: 10, dificuldade: 'facil',
    enunciado: 'Recém-nascido a termo com icterícia surgida nas primeiras 24 horas de vida. Essa icterícia deve ser considerada:',
    alternativas: ['Fisiológica', 'Do leite materno', 'Patológica, exigindo investigação', 'Normal se o RN estiver mamando bem', 'Secundária a hipotireoidismo, sempre'],
    correta: 2,
    comentario: 'Icterícia antes de 24 h de vida é sempre patológica — pensar em doença hemolítica (incompatibilidade ABO/Rh), infecção, entre outras. A fisiológica surge após 24 h e tem pico entre o 3º e 5º dia.',
  },
  {
    id: 'ped-02', disciplina: 'Pediatria', tema: 'Imunizações', periodo: 10, dificuldade: 'facil',
    enunciado: 'Quais vacinas são aplicadas ao nascer, segundo o calendário do PNI?',
    alternativas: ['BCG e hepatite B', 'Pentavalente e VIP', 'Tríplice viral', 'Rotavírus e pneumocócica', 'Febre amarela'],
    correta: 0,
    comentario: 'Ao nascer: BCG (dose única) e hepatite B (primeiras 12–24 h). Pentavalente, VIP, rotavírus e pneumocócica começam aos 2 meses.',
  },
  {
    id: 'ped-03', disciplina: 'Pediatria', tema: 'Desidratação', periodo: 10, dificuldade: 'media',
    enunciado: 'Criança de 2 anos com diarreia, irritada, olhos fundos, sedenta, com sinal da prega desaparecendo lentamente. Pelo plano da OMS/MS, a conduta é:',
    alternativas: ['Plano A – domiciliar', 'Plano B – terapia de reidratação oral na unidade de saúde', 'Plano C – hidratação venosa imediata', 'Apenas zinco', 'Antibiótico empírico'],
    correta: 1,
    comentario: 'Dois ou mais sinais (irritabilidade, olhos fundos, sede, prega que desaparece lentamente) = desidratação → Plano B, com TRO supervisionada. Plano C é para desidratação grave (letargia, incapaz de beber, prega muito lenta).',
  },
  // ───────── Ginecologia e Obstetrícia
  {
    id: 'go-01', disciplina: 'Ginecologia e Obstetrícia', tema: 'Hipertensão na gestação', periodo: 10, dificuldade: 'media',
    enunciado: 'Gestante de 34 semanas com PA 170x110 mmHg, cefaleia e escotomas. Além do anti-hipertensivo, a medicação prioritária é:',
    alternativas: ['Diazepam', 'Sulfato de magnésio', 'Fenitoína', 'Furosemida', 'Ocitocina'],
    correta: 1,
    comentario: 'Pré-eclâmpsia com sinais de gravidade (iminência de eclâmpsia) exige sulfato de magnésio para prevenção de convulsões, além de controle pressórico (hidralazina, nifedipino). Avaliar reflexos, diurese e FR pelo risco de intoxicação; antídoto: gluconato de cálcio.',
  },
  {
    id: 'go-02', disciplina: 'Ginecologia e Obstetrícia', tema: 'Rastreamento', periodo: 10, dificuldade: 'facil',
    enunciado: 'Segundo as diretrizes brasileiras (citologia), o rastreamento do câncer de colo do útero deve iniciar aos:',
    alternativas: ['18 anos', '21 anos', '25 anos, em mulheres que já iniciaram atividade sexual', 'Na primeira relação sexual', '30 anos'],
    correta: 2,
    comentario: 'O rastreamento citológico inicia aos 25 anos para quem já teve atividade sexual, com dois exames anuais iniciais e, se normais, a cada 3 anos até os 64 anos. Verifique atualizações locais sobre o rastreamento por teste de DNA-HPV.',
  },
  // ───────── Cirurgia
  {
    id: 'cir-01', disciplina: 'Cirurgia', tema: 'Trauma', periodo: 9, dificuldade: 'facil',
    enunciado: 'Na avaliação primária do politraumatizado (ATLS), a primeira prioridade é:',
    alternativas: ['Controle de hemorragia externa grave e via aérea com proteção da coluna cervical', 'Exame neurológico com escala de Glasgow', 'Exposição completa do paciente', 'Radiografia de tórax', 'FAST'],
    correta: 0,
    comentario: 'O ATLS atualizado propõe o xABCDE: controle de hemorragia exsanguinante (x) e, em seguida, via aérea com restrição de movimento da coluna cervical (A). Glasgow pertence ao D; exames complementares são adjuntos.',
  },
  {
    id: 'cir-02', disciplina: 'Cirurgia', tema: 'Abdome agudo', periodo: 9, dificuldade: 'media',
    enunciado: 'Dor que se inicia em região periumbilical e migra para fossa ilíaca direita, com anorexia e febre baixa, é sugestiva de:',
    alternativas: ['Colecistite aguda', 'Apendicite aguda', 'Diverticulite de sigmoide', 'Pancreatite aguda', 'Úlcera perfurada'],
    correta: 1,
    comentario: 'A migração da dor (visceral periumbilical → parietal em FID) com anorexia, náuseas e febre baixa é a apresentação clássica da apendicite. Escore de Alvarado auxilia na estratificação.',
  },
  {
    id: 'cir-03', disciplina: 'Cirurgia', tema: 'Queimaduras', periodo: 9, dificuldade: 'media',
    enunciado: 'Adulto de 70 kg com 30% de superfície corporal queimada (2º e 3º graus). Pela fórmula de Parkland, o volume nas primeiras 8 horas é:',
    alternativas: ['2.100 mL', '4.200 mL', '8.400 mL', '6.300 mL', '1.050 mL'],
    correta: 1,
    comentario: 'Parkland: 4 mL × peso × %SCQ = 4 × 70 × 30 = 8.400 mL em 24 h; metade (4.200 mL) nas primeiras 8 h a partir da queimadura. Ajustar pela diurese (alvo 0,5 mL/kg/h em adultos). O ATLS atual sugere iniciar com 2 mL/kg/%SCQ.',
  },
  // ───────── Medicina Preventiva
  {
    id: 'pre-01', disciplina: 'Medicina Preventiva', tema: 'Epidemiologia', periodo: 5, dificuldade: 'media',
    enunciado: 'Em um teste diagnóstico, a probabilidade de o resultado ser negativo entre os indivíduos que NÃO têm a doença é chamada de:',
    alternativas: ['Sensibilidade', 'Especificidade', 'Valor preditivo positivo', 'Valor preditivo negativo', 'Acurácia'],
    correta: 1,
    comentario: 'Especificidade = VN / (VN + FP): capacidade de identificar corretamente os não doentes. Sensibilidade = VP / (VP + FN). Valores preditivos dependem da prevalência.',
  },
  {
    id: 'pre-02', disciplina: 'Medicina Preventiva', tema: 'Estudos epidemiológicos', periodo: 5, dificuldade: 'media',
    enunciado: 'Um estudo seleciona pacientes com câncer de pulmão e controles sem a doença, investigando exposição prévia ao tabaco. A medida de associação adequada é:',
    alternativas: ['Risco relativo', 'Odds ratio', 'Incidência acumulada', 'Prevalência', 'Hazard ratio'],
    correta: 1,
    comentario: 'Em estudos caso-controle parte-se do desfecho, não sendo possível calcular incidência; usa-se a razão de chances (odds ratio). Risco relativo é próprio de coortes.',
  },
  {
    id: 'pre-03', disciplina: 'Medicina Preventiva', tema: 'SUS', periodo: 3, dificuldade: 'facil',
    enunciado: 'O princípio do SUS que determina tratar desigualmente os desiguais, priorizando quem mais precisa, é a:',
    alternativas: ['Universalidade', 'Integralidade', 'Equidade', 'Descentralização', 'Participação social'],
    correta: 2,
    comentario: 'Equidade busca reduzir desigualdades, ofertando mais a quem mais necessita. Universalidade = acesso a todos; integralidade = atenção em todos os níveis. Descentralização e participação social são diretrizes organizativas.',
  },
  // ───────── Anatomia
  {
    id: 'ana-01', disciplina: 'Anatomia', tema: 'Membro superior', periodo: 1, dificuldade: 'media',
    enunciado: 'Fratura da diáfise do úmero no sulco radial pode lesar o nervo radial, causando:',
    alternativas: ['Mão em garra', 'Mão caída (queda do punho)', 'Mão de bênção', 'Perda de abdução do ombro', 'Anestesia da região tenar apenas'],
    correta: 1,
    comentario: 'O nervo radial inerva os extensores do punho e dedos; sua lesão na diáfise umeral gera queda do punho. Garra ulnar = nervo ulnar; mão de bênção = mediano proximal; abdução do ombro = axilar.',
  },
  {
    id: 'ana-02', disciplina: 'Anatomia', tema: 'Coração', periodo: 1, dificuldade: 'facil',
    enunciado: 'A valva localizada entre o átrio direito e o ventrículo direito é a:',
    alternativas: ['Mitral', 'Tricúspide', 'Aórtica', 'Pulmonar', 'Bicúspide'],
    correta: 1,
    comentario: 'A tricúspide separa átrio e ventrículo direitos; a mitral (bicúspide) separa as câmaras esquerdas. Aórtica e pulmonar são valvas semilunares.',
  },
  // ───────── Neurologia
  {
    id: 'neu-01', disciplina: 'Neurologia', tema: 'AVC', periodo: 9, dificuldade: 'media',
    enunciado: 'Paciente com AVC isquêmico, início dos sintomas há 2 horas, TC sem sangramento, PA 170x95 mmHg. Quanto à trombólise venosa:',
    alternativas: ['Contraindicada pela PA, que deve ser < 140x90', 'Indicada, desde que a PA seja mantida < 185x110 antes e < 180x105 após', 'Só pode ser feita após RM', 'Contraindicada após 1 hora', 'Indicada apenas se NIHSS > 25'],
    correta: 1,
    comentario: 'A trombólise pode ser realizada até 4,5 h do início, desde que a PA esteja < 185x110 mmHg antes e mantida < 180x105 nas 24 h seguintes. PA 170x95 não contraindica.',
  },
  {
    id: 'neu-02', disciplina: 'Neurologia', tema: 'Cefaleias', periodo: 9, dificuldade: 'facil',
    enunciado: 'Cefaleia súbita, de forte intensidade ("a pior da vida"), atingindo o pico em segundos, deve levantar suspeita principal de:',
    alternativas: ['Migrânea sem aura', 'Cefaleia tensional', 'Hemorragia subaracnóidea', 'Cefaleia em salvas', 'Sinusite'],
    correta: 2,
    comentario: 'Cefaleia em trovoada é sinal de alarme para HSA (aneurisma roto). Investigar com TC de crânio sem contraste e, se negativa e houver suspeita, punção lombar.',
  },
  // ───────── Psiquiatria
  {
    id: 'psi-01', disciplina: 'Psiquiatria', tema: 'Psicofarmacologia', periodo: 9, dificuldade: 'media',
    enunciado: 'Paciente em uso de lítio apresenta tremor grosseiro, ataxia, confusão e diarreia após iniciar hidroclorotiazida. O quadro sugere:',
    alternativas: ['Síndrome serotoninérgica', 'Intoxicação por lítio', 'Síndrome neuroléptica maligna', 'Hipotireoidismo induzido', 'Abstinência'],
    correta: 1,
    comentario: 'Tiazídicos (assim como IECA e AINEs) reduzem a excreção renal de lítio, elevando sua concentração. Sintomas neurológicos e gastrointestinais indicam toxicidade; dosar litemia e suspender o fármaco.',
  },
  // ───────── Hematologia
  {
    id: 'hem-01', disciplina: 'Hematologia', tema: 'Anemias', periodo: 7, dificuldade: 'facil',
    enunciado: 'Anemia microcítica e hipocrômica com ferritina baixa e RDW aumentado é compatível com:',
    alternativas: ['Anemia ferropriva', 'Talassemia minor', 'Anemia de doença crônica', 'Anemia megaloblástica', 'Anemia aplásica'],
    correta: 0,
    comentario: 'Ferritina baixa é o marcador mais específico de deficiência de ferro; o RDW tende a estar elevado (anisocitose). Na talassemia minor o RDW costuma ser normal e a ferritina normal.',
  },
  {
    id: 'hem-02', disciplina: 'Hematologia', tema: 'Anemias', periodo: 7, dificuldade: 'media',
    enunciado: 'Paciente vegano estrito há anos com anemia macrocítica, parestesias e alteração de propriocepção. A deficiência mais provável é de:',
    alternativas: ['Ácido fólico', 'Vitamina B12', 'Ferro', 'Vitamina B6', 'Cobre isoladamente'],
    correta: 1,
    comentario: 'A B12 é obtida de alimentos de origem animal. Sua deficiência causa anemia megaloblástica e alterações neurológicas (degeneração combinada subaguda da medula). O folato não causa manifestações neurológicas desse tipo.',
  },
]
