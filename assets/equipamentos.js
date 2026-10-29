/* Catálogo técnico dos equipamentos. Fonte: manuais IMIC do projeto "Manutenção Britagem".
   Vínculo TAG × modelo das peneiras conferido no fluxograma AMB003-02-2115-FL-M-0002 e no arranjo AMB003-02-2115-DS-M-0001.
   Para corrigir um TAG ou modelo, edite somente este arquivo. */
window.EQUIP = {
  ordem: ['AL 01', 'BM 01', 'PN 01', 'TC 01', 'TC 01A', 'TC 11', 'TC 12', 'TC 13', 'BC 01', 'PN 02', 'PN 03', 'CV 01', 'UH 01', 'TC 02', 'TC 03', 'TC 04', 'TC 05', 'TC 06', 'TC 07', 'TC 08', 'TC 09', 'TC 10', 'BA 01', 'PLC', 'Geral'],
  tipos: {
    AL: 'Alimentador vibratório', BM: 'Britador de mandíbulas', BC: 'Britador cônico', PN: 'Peneira vibratória',
    TC: 'Transportador de correia', CV: 'Calha vibratória', UH: 'Unidade hidráulica', BA: 'Bombeamento / aspersão',
    PLC: 'Automação (PLC / supervisório)', GERAL: 'Paradas gerais da etapa'
  },
  etapa: {
    'AL 01': 'P', 'BM 01': 'P', 'PN 01': 'P', 'TC 01': 'P', 'TC 01A': 'P', 'TC 11': 'P', 'TC 12': 'P', 'TC 13': 'P',
    'BC 01': 'S', 'PN 02': 'S', 'PN 03': 'S', 'CV 01': 'S', 'UH 01': 'S', 'TC 02': 'S', 'TC 03': 'S', 'TC 04': 'S', 'TC 05': 'S',
    'TC 06': 'S', 'TC 07': 'S', 'TC 08': 'S', 'TC 09': 'S', 'TC 10': 'S', 'BA 01': 'G', 'PLC': 'G', 'Geral': 'G'
  },
  funcao: {
    'TC 01': 'Descarga para a pilha pulmão (balança integradora)', 'TC 12': 'Bica corrida (balança integradora)',
    'TC 04': 'Rachão (balança integradora)', 'TC 05': 'Lastro / Brita 3 (balança integradora)', 'TC 09': 'Brita 0 (balança integradora)',
    'TC 08': 'Brita 1 (balança integradora)', 'TC 07': 'Brita 2 (balança integradora)', 'TC 10': 'Pó de brita (balança integradora)',
    'UH 01': 'Unidade hidráulica do britador cônico', 'PLC': 'Controlador e rede de comunicação da planta (Vale)',
    'Geral': 'Eventos sem equipamento específico: DSS, refeição, troca de turno, clima, falta de alimentação'
  },
  fichas: {
    'AL 01': {
      modelo: 'IMIC AV 40120', manual: 'Manual de Instruções - Alimentador Vibratório 40120 - Des. 50641',
      specs: [['Acionamento', 'Motor 30 cv, 8 polos, eixo cardã MB 1113 (500 mm)'], ['Vibrador', 'Caixa de 2 eixos sincronizados por engrenagens, ângulo de ataque 45°'],
        ['Rolamentos', '4 × 22316 (SKF EJA/VA405 · FAG E1-XL-T41A), folga C4'], ['Molas de apoio', '12 × F31,75 × DI145 × DE208,4 × A305'], ['Peso', '≈ 4.800 kg (sem tremonha)']],
      lub: [['Óleo do vibrador', 'CLP ISO VG 320 sintético, 26 L. 1ª troca com 50 h; depois a cada 700 h ou 60 dias'], ['Selo de graxa (labirinto)', 'Graxa lítio EP NLGI 2, até purgar, a cada 40 h'],
        ['Cardã', 'Mesma graxa nas cruzetas e luva estriada, a cada 40 h'], ['Temperatura', 'Vibrador ≤ ambiente + 50 °C (≤ +60 °C nas primeiras 100 h)']],
      pecas: [['Rolamento do vibrador', '04338 · 22316'], ['Engrenagem do vibrador', '27222'], ['Retentor', '01416 · 00366 B Sabó'], ['Mola de apoio', '01413'], ['Cardã', '01532 · MB 1113 500 mm'], ['Filtro de ar (respiro)', '16585 · FAR76 HDA 3/4"']],
      rotina: ['Diário: vazamentos, respiros, ruído de rolamento, alinhamento do cardã, molas e acúmulo de material', 'Periódico: nível e contaminação do óleo, trincas nas vigas e trilhos, desgaste dos revestimentos', 'Lavar a caixa vibratória a cada 3 trocas de óleo']
    },
    'BM 01': {
      modelo: 'IMIC BMI 1209 C', manual: 'Manual de Instruções Britador BMI 1209C - Des. 26308',
      specs: [['Acionamento', 'Motor 175 cv, 6 polos, 8 correias perfil C-315'], ['Rotação de trabalho', '270 rpm (não exceder)'], ['Capacidade (APF)', '125 mm: 270-355 t/h · 150 mm: 325-430 t/h · 175 mm: 385-505 t/h'],
        ['Rolamentos', 'Queixo 2 × 24068 CC/W33 C3 · Carcaça 2 × 23164 CCK/W33 C3 + bucha AOH 3164 G'], ['Peso', '24.170 kg (queixo 13.209 kg · carcaça 10.961 kg)'], ['Ruído', '121 a 127 dB(A) com carga nominal']],
      lub: [['Mancais', 'Graxa lítio EP NLGI 2, 480 g por rolamento a cada 40 h (carga inicial 5 kg por mancal)'], ['Temperatura', 'Investigar mancal acima de 80 °C'], ['Não lubrificar', 'Abanadeira e calhas da abanadeira']],
      pecas: [['Mandíbula fixa', '16934'], ['Mandíbula móvel', '16621'], ['Cunha lateral superior', 'S1-026072-000 (2)'], ['Cunha lateral inferior', 'S1-026073-000 (2)'], ['Cunha de fixação das mandíbulas', '16617 (4)'], ['Placa de proteção do queixo', '16622'],
        ['Parafusos mandíbula fixa / móvel', '16453 / 15013'], ['Mola de tensão', '14648 (2)'], ['Tirante de mola', '16623 (2)'], ['Calha da abanadeira', '16616 (2)'], ['Abanadeira 76-152 mm', 'AC-026264-000'], ['Abanadeira 153-228 mm', 'AC-020766-000'], ['Abanadeira 229-275 mm', 'AC-015695-000']],
      rotina: ['Reapertar mandíbulas e revestimentos após 5 a 6 h da partida e periodicamente', 'Evitar operar na abertura mínima', 'Substituir tirantes e molas a cada 2 a 3 anos (fadiga)', 'Torque dos alojamentos de mancal: 5.700 N·m']
    },
    'BC 01': {
      modelo: 'IMIC BCI 300 H (HDR)', manual: 'Manual de Instruções Britador Cônico BCI300HDR - Des. 40136',
      specs: [['Acionamento', 'Motor 300 cv, 4 polos, correias 8V'], ['Capacidade', '68 a 258 m³/h (estimativa do fabricante)'], ['Alimentação máx.', '175 mm (câmara grossa)'], ['Peso', '18.941 kg · manto 775 kg · eixo com manto 3.500 kg'],
        ['Hidráulica', 'Pressão de travamento 120 a 140 bar (desarma abaixo de 110 bar)']],
      lub: [['Óleo de lubrificação', 'ISO VG 150 (até 32 °C ambiente), 400 L. Troca a cada 2.000 h ou 6 meses'], ['Óleo hidráulico', 'ISO VG 68, 100 L. Troca a cada 4.000 h ou 12 meses'],
        ['Bucha da aranha', '300 g de graxa a cada 40 h'], ['Intertravamentos', 'Óleo > 30 °C liga trocador · > 60 °C desliga britador · pressão < 1 bar desliga · retorno < 110 L/min alarma'], ['Acumulador', 'Verificar pressão de carga a cada 30 dias']],
      pecas: [['Sobressalentes de fornecimento', 'Anel de enchimento médio · eixo principal + cone (montado) · manta A']],
      rotina: ['Diário: folgas dos revestimentos superiores da carcaça', 'Limpar filtro de retorno e filtro de sucção da bomba de lubrificação', 'Trocar bucha da aranha a cada troca de revestimentos']
    },
    'PN 02': {
      modelo: 'IMIC PV 50020 2D Scalper (óleo)', manual: 'Manual de Instruções PV 50020 2D - Scalper - A Óleo Des. 53793',
      specs: [['Acionamento', 'Motor 30 cv, 8 polos, cardã MB 1113 500 mm'], ['Vibrador', 'AC-034120-000 a óleo, 2 × 22332 CCJA/W33VA405'], ['Deck', '2 decks · área 10 m² · telas de 1/8" a 4"'], ['Amplitude', 'Movimento circular de 4 a 10 mm'], ['Molas', '12 × F28,6 × DI145 × DE202,2 × A305']],
      lub: [['Óleo do vibrador', 'CLP ISO VG 320 sintético, 11 L. 1ª troca com 50 h; depois 700 h ou 60 dias'], ['Labirintos', 'Graxa lítio EP NLGI 3, 50 g por labirinto a cada 50 h'], ['Temperatura', 'Mancais ≤ ambiente + 60 °C']],
      pecas: [['Rolamento do vibrador', '04797 · 22332 (2)'], ['Retentor', '01444 (trocar a cada 6 meses)'], ['Mancal dir./esq.', 'S1-008963-000'], ['Molas', '30095 (1 jogo)'], ['Cardã', '01532'], ['Telas', '2 jogos (referência)']],
      rotina: ['Diário: ruído e temperatura dos mancais', '50 h: fixação das telas, livre movimento, acúmulo sob a peneira', '200 h: reaperto dos parafusos do vibrador', 'Teste dos cartões de amplitude nos 4 cantos (velocidade crítica)']
    },
    'PN 01': {
      modelo: 'IMIC PV 30012 2D Scalper (graxa)', manual: 'Manual de Instruções - Peneira Vibratória PV 30012 - 2D - Des. 53903',
      specs: [['Acionamento', 'Motor 20 cv, 8 polos, cardã 1113 × 530 mm'], ['Vibrador', 'AC-006282-000 a graxa, 2 × 22324 CCJA/W33VA405'], ['Deck', '2 decks · área 3,6 m² · telas de 30 mesh a 4"'], ['Molas', '4 × F31,75 × DI145 × DE208,4 × A305']],
      lub: [['Mancais', 'Graxa lítio EP NLGI 3, 180 g por mancal a cada 50 h'], ['Labirintos', '40 g por labirinto'], ['Temperatura', 'Mancais ≤ ambiente + 60 °C']],
      pecas: [['Rolamento do vibrador', '03733 · 22324 (2)'], ['Mancal do rolamento', 'S1-006179-000 (2)'], ['Tampa do mancal', 'S1-006180-000 (2)'], ['Labirinto', 'S1-006178-000 (2)'], ['Molas', '01413 (1 jogo)'], ['Cardã', '01532']],
      rotina: ['Diário: ruído e temperatura dos mancais', '50 h: telas, livre movimento e relubrificação', '200 h: reaperto dos parafusos do vibrador']
    },
    'PN 03': {
      modelo: 'IMIC PV 50020 3D (óleo)', manual: 'Manual de Instruções PV 50020 3D - Óleo Des. 47837',
      specs: [['Acionamento', 'Motor 30 cv, 8 polos, cardã MB 1113 500 mm'], ['Vibrador', 'AC-034120-000 a óleo, 2 × 22332 CCJA/W33VA405'], ['Deck', '3 decks · área 10 m² por deck · telas de 1/8" a 4"'], ['Molas', '12 × F28,6 × DI145 × DE202,2 × A305']],
      lub: [['Óleo do vibrador', 'CLP ISO VG 320 sintético, 11 L. 1ª troca com 50 h; depois 700 h ou 60 dias'], ['Labirintos', 'Graxa complexo de lítio NLGI 3, 50 g por labirinto a cada 50 h'], ['Temperatura', 'Mancais ≤ ambiente + 60 °C']],
      pecas: [['Rolamento do vibrador', '04797 · 22332 (2)'], ['Retentor', '01444 (trocar a cada 6 meses)'], ['Mancal dir./esq.', 'S1-008963-000'], ['Bucha cromada', 'S1-008955-000'], ['Molas', '30095 (1 jogo)'], ['Cardã', '01532']],
      rotina: ['Diário: ruído e temperatura dos mancais', '50 h: telas, livre movimento e relubrificação', '200 h: reaperto dos parafusos do vibrador']
    },
    'CV 01': {
      modelo: 'IMIC CV 2012', manual: 'Manual de Instruções Calha CV 2012 - Des. 24741',
      specs: [['Acionamento', 'Motor 10 cv, 4 polos, 4 correias A-58, cardã Toyota 320 mm'], ['Vibrador', 'Caixa AV 27070, 2 × 22313 E/VA405'], ['Molas', '8 × F25,4 × DI120 × DE170,8 × A240'], ['Peso', '≈ 2.900 kg']],
      lub: [['Óleo do vibrador', 'CLP ISO VG 320 sintético, 12 L. 1ª troca com 50 h; depois 700 h ou 60 dias'], ['Selo de graxa', 'Graxa lítio EP NLGI 2 a cada 40 h']],
      pecas: [['Rolamento do vibrador', '01525 · 22313 (2)'], ['Retentor', '01435 · 00164 BR'], ['Engrenagem', 'S1-005737-000 (2)'], ['Molas', '28119 (8)'], ['Correias', '03273 · A-58 (4)']],
      rotina: ['Diário: vazamentos, respiros, ruído, molas e acúmulo de material', 'Periódico: nível do óleo e desgaste das chapas da bandeja']
    }
  }
};
