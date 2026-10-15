// ═══════════════════════════════════════════════════════════════════
//  BESTIÁRIO — tela cheia, abas por dungeon/zona, cards travados com "?"
//  Segue o mesmo padrão do achievements_gallery.js: bridge file isolado,
//  nunca mexe no palDinh.js, reaproveita G.player / notify() do jogo.
//
//  COMO INTEGRAR (2 passos):
//  1) <script src="bestiario.js"></script> no gat-1.html (depois do
//     hubi.js, por exemplo — ordem não importa muito, só precisa vir
//     depois de palDinh.js pra G existir).
//  2) Botão na tela de Opções chamando openBestiary() — não sei o nome
//     do seu arquivo/tela de opções ainda, então só cola algo tipo:
//       <button onclick="openBestiary()">Bestiário</button>
//  3) Em CADA lugar que uma batalha começa contra um inimigo do
//     BESTIARY_DEFS, chama uma linha:
//       Bestiary.markFound('onibi_cinzas');
//     (troque pelo id certo). Se ele já foi encontrado antes, a função
//     não faz nada — pode chamar toda vez sem medo de duplicar.
// ═══════════════════════════════════════════════════════════════════

// ─── DADOS DOS INIMIGOS ───────────────────────────────────────────
// zone = aba onde ele aparece. portrait = imagem parada (card no menu).
// icon = fallback emoji (usado quando não tem portrait ainda).
// Levantado direto dos arquivos reais do jogo (palDinh.js, dungeon_sombras.js,
// kappa_dungeon.js, templo_vazio_ecoante.js, inazami_completo.js, nulkhar.js).
// Ids batem com o `enemy.id`/`groupId` real usado no motor de batalha, então
// markFound(enemy.id) já funciona sem tradução nenhuma.
//
// "fraqueza" — o jogo tem uma tabela de afinidade elemental (AFINIDADE_ELEMENTAL,
// definida em core/elementos.js) que não foi enviada junto, então por enquanto
// deixei "—" em quase tudo pra não chutar errado. Só preenchi onde o próprio
// arquivo do inimigo já cravava o valor (ex.: Nul'Khar). Manda o elementos.js
// que eu preencho o resto certinho.
//
// Ainda faltam (arquivos não enviados até agora): Tengu Dungeon (T1–T6),
// torre do vilarejo (Dona Mitsue / Chave de Ferro), cão guardião do LV2.
const BESTIARY_DEFS = [
  // ══ FLORESTA — encontros aleatórios do mundo aberto ══
  {
    id: 'rato', name: 'Rato das Sombras', zone: 'floresta',
    elem: 'Sombra', fraqueza: 'Magia Negra / Luz', hp: 15, loot: 'Pelo Rançoso',
    curiosidade: "Anda em bandos de até uma dezena — se você viu um, é bem provável que não seja o único por perto.",
    desc: 'Um rato enorme e fétido, corrompido pela névoa do Lich. Seus dentes afiados rasgam com agilidade traiçoeira.',
    icon: '🐀', portrait: 'Imagens/personagens/ratin.png',
  },
  {
    id: 'aranha', name: 'Aranha Venenosa', zone: 'floresta',
    elem: 'Veneno', fraqueza: 'Energia / Vento', hp: 22, loot: 'Glândula Venenosa',
    curiosidade: "Tece teias tão finas que ficam quase invisíveis à luz do dia — só brilham sob luar cheio.",
    desc: 'Aranha negra do tamanho de um gato. Seu veneno causa dormência e visão turva. Tece armadilhas nas sombras.',
    icon: '🕷️', portrait: 'Imagens/personagens/aranha.png',
  },
  {
    id: 'corvo', name: 'Corvo das Cinzas', zone: 'floresta',
    elem: 'Vento', fraqueza: 'Gelo / Elétrico', hp: 18, loot: 'Pena de Corvo',
    curiosidade: "Os corvos do Castelo Maldito nunca dormem: revezam-se em bandos pra vigiar a floresta dia e noite.",
    desc: 'Corvo mensageiro do Castelo Maldito. Suas penas escuras cortam como lâminas e seus grasnidos desorientam.',
    icon: '🐦‍⬛', portrait: 'Imagens/personagens/Corvo.png',
  },
  {
    id: 'cobra', name: 'Serpente das Trevas', zone: 'floresta',
    elem: 'Veneno', fraqueza: 'Energia / Vento', hp: 26, loot: 'Pele de Cobra',
    curiosidade: "Prefere ficar imóvel entre as raízes por horas, esperando a presa chegar perto o bastante pro bote certeiro.",
    desc: 'Cobra colossal que rasteja silenciosa entre as raízes podres. Um único bote pode ser fatal.',
    icon: '🐍', portrait: 'Imagens/personagens/cobra.png',
  },
  {
    id: 'lobo', name: 'Lobo das Sombras', zone: 'floresta',
    elem: 'Sombra', fraqueza: 'Magia Negra / Luz', hp: 30, loot: 'Pele de Lobo',
    curiosidade: "A matilha se comunica por uivos que carregam o eco da névoa — dizem que dá pra senti-los antes mesmo de ouvi-los.",
    desc: 'Lobo corrompido pela névoa do Senhor das Cinzas. Seus olhos brilham com um roxo sinistro e ataca em manadas.',
    icon: '🐺', portrait: 'Imagens/personagens/Lobo.png',
  },
  {
    id: 'raposa', name: 'Raposa das Neblinas', zone: 'floresta',
    elem: 'Fogo', fraqueza: 'Água', hp: 24, loot: 'Calda de Raposa',
    curiosidade: "Deixa rastros de fogo-fátuo tão sutis que viajantes costumam confundi-los com vaga-lumes.",
    desc: 'Uma raposa espectral que vaga pela névoa da floresta, ágil e traiçoeira, deixando rastros de fogo-fátuo por onde passa.',
    icon: '🦊', portrait: 'Imagens/personagens/raposa.png',
  },
  {
    id: 'lobo_ii', name: 'Lobo das Sombras II', zone: 'floresta',
    elem: 'Sombra', fraqueza: 'Magia Negra / Luz', hp: 75, loot: 'Pele de Lobo',
    curiosidade: "Não caça mais em bando — a névoa o transformou no solitário que a própria matilha teme obedecer.",
    desc: 'A névoa do Senhor das Cinzas consumiu esse lobo por completo. Maior, mais rápido, e sedento por sangue — não caça mais em manada, ele domina a matilha.',
    icon: '🐺', portrait: 'Imagens/personagens/lobo_ii.png',
  },
  {
    id: 'corvo_ii', name: 'Corvo das Cinzas II', zone: 'floresta',
    elem: 'Vento', fraqueza: 'Gelo / Elétrico', hp: 45, loot: 'Pena de Corvo',
    curiosidade: "Seu grasnido carrega um eco capaz de confundir a mente de quem ouve de perto demais.",
    desc: 'Não é mais um simples mensageiro — suas penas viraram lâminas de sombra, e seu grasnido carrega um eco que corta a mente de quem ouve.',
    icon: '🐦‍⬛', portrait: 'Imagens/personagens/corvo_ii.png',
  },
  {
    id: 'aranha_ii', name: 'Aranha Venenosa II', zone: 'floresta',
    elem: 'Veneno', fraqueza: 'Energia / Vento', hp: 55, loot: 'Glândula Venenosa',
    curiosidade: "Cresceu tanto na escuridão que já não cabe mais nas teias que ela mesma tecia quando era menor.",
    desc: 'Cresceu no escuro se alimentando da névoa corrompida. Seu veneno agora não só entorpece — apodrece a carne de quem é mordido.',
    icon: '🕷️', portrait: 'Imagens/personagens/aranha_ii.png',
  },
  {
    id: 'ovelha_encantada', name: 'Ovelha Encantada', zone: 'floresta',
    elem: 'Luz', fraqueza: 'Caos', hp: 60, loot: 'Lã Encantada',
    curiosidade: "A luz suave que emana da sua lã é, na verdade, um encantamento antigo — não um brilho natural.",
    desc: 'Uma ovelha de lã que brilha com uma luz suave e enganosa — sob a aparência dócil esconde um encantamento antigo que confunde quem se aproxima.',
    icon: '🐑', portrait: 'Imagens/personagens/ovelha_encantada.png',
  },
  {
    id: 'urso_pardo', name: 'Urso Pardo', zone: 'floresta',
    elem: 'Terra', fraqueza: 'Planta / Gelo', hp: 260, loot: 'Garra de Urso Pardo',
    curiosidade: "Só aparece na floresta depois que o mérito 'Herói do Vilarejo' é conquistado — um chefe reservado a quem já provou valor.",
    desc: 'Um urso pardo colossal, músculos à mostra sob o pelo áspero. Chefe da floresta liberado a partir do mérito "Herói do Vilarejo".',
    icon: '🐻', portrait: 'Imagens/personagens/urso_pardo.png',
  },
  {
    id: 'cobra_verde', name: 'Cobra Verde', zone: 'floresta',
    elem: 'Veneno', fraqueza: 'Energia / Vento', hp: 160, loot: 'Peçonha Esmeralda',
    curiosidade: "Escamas verde-esmeralda tão raras que caçadores costumam confundi-la com joia viva à distância.",
    desc: 'Serpente de escamas verde-esmeralda, bem maior que qualquer cobra comum da floresta. Seu veneno age rápido demais pra ser ignorado.',
    icon: '🐍', portrait: 'Imagens/personagens/cobra_verde.png',
  },
  {
    id: 'urso_kodiak', name: 'Urso Kodiak', zone: 'floresta',
    elem: 'Gelo', fraqueza: 'Fogo', hp: 210, loot: 'Garra de Urso Kodiak',
    curiosidade: "Maior e mais pesado que o Urso Pardo — dizem que as pegadas sozinhas já assustam o resto da floresta.",
    desc: 'Um urso Kodiak imenso, pelagem grossa gelada ao toque. Mais alto e mais pesado que o Urso Pardo, cada golpe carrega o peso de puro gelo e músculo.',
    icon: '🐻‍❄️', portrait: 'Imagens/personagens/urso_kodiak.png',
  },
  {
    id: 'gorila', name: 'Gorila — Rei da Selva', zone: 'floresta',
    elem: 'Planta', fraqueza: 'Fogo / Elétrico', hp: 600, loot: 'Essência do Rei da Selva',
    curiosidade: "Encontro raríssimo, com apenas 13% de chance de aparecer — e só depois de conquistar o mérito 'Lendário'.",
    desc: 'O Rei da Selva em pessoa. Encontro raríssimo (13% de chance), só a partir do mérito "Lendário". Poucos que o veem sobrevivem pra contar como foi.',
    icon: '🦍', portrait: 'Imagens/personagens/gorila.png',
  },
  {
    id: 'nulkhar', name: "Nul'Khar", zone: 'floresta',
    elem: 'Sombra', fraqueza: 'Luz', hp: 1200, loot: '—',
    curiosidade: "Uma lenda sussurrada entre os galhos mais antigos da Floresta Eterna — ele não caça, espera.",
    desc: 'Uma lenda sussurrada entre os galhos mais antigos da Floresta Eterna. Não caça — espera. (No momento este chefe está desativado no jogo; pode voltar a aparecer futuramente.)',
    icon: '🗡️', portrait: 'Imagens/personagens/Nul`kar/Picsart_26-07-09_01-42-36-585.png',
  },

  // ══ Floresta Maligna — evento noturno aleatório ══
  {
    id: 'flm_lobo', name: 'Kurogami', zone: 'floresta_maligna',
    elem: 'Sombra', fraqueza: 'Magia Negra / Luz', hp: 95, loot: 'Pedaço de Pergaminho',
    curiosidade: "Nome herdado dos lobos antigos que já vagavam pela floresta — só que agora com os olhos mais fundos na escuridão.",
    desc: 'Um lobo sombrio que só aparece durante os surtos da Floresta Maligna, quando a névoa noturna vira algo mais perigoso. Rápido e feroz, mas o mais fraco entre os que rondam essa versão corrompida da floresta.',
    icon: '🐺', portrait: 'Imagens/personagens/LobOi.png',
  },
  {
    id: 'flm_lobo_oni', name: 'Lobo Oni', zone: 'floresta_maligna',
    elem: 'Sombra', fraqueza: 'Magia Negra / Luz', hp: 135, loot: 'Pedaço de Pergaminho',
    curiosidade: "Carrega o nome 'oni' com razão — algo na sua postura lembra mais um demônio do que um lobo comum.",
    desc: 'Uma versão mais brutal do Kurogami, com presas maiores e golpes mais duros. Caça em silêncio, esperando o momento certo pra atacar.',
    icon: '👹', portrait: 'Imagens/personagens/LoboOni.png',
  },
  {
    id: 'flm_colosso_verde', name: 'Colosso Verde da Floresta', zone: 'floresta_maligna',
    elem: 'Planta', fraqueza: 'Fogo / Elétrico', hp: 175, loot: 'Casca de Árvore',
    curiosidade: "Cascas de árvore comuns racham perto dele — como se reconhecessem um parente distorcido.",
    desc: 'Um tronco vivo que ganhou consciência sob a corrupção da Floresta Maligna. Lento, mas absurdamente resistente — prefere aguentar o golpe a desviar dele.',
    icon: '🌲', portrait: 'Imagens/personagens/ColossoVerde.png',
  },
  {
    id: 'flm_colosso_arboreo', name: 'Colosso Arbóreo', zone: 'floresta_maligna',
    elem: 'Planta', fraqueza: 'Fogo / Elétrico', hp: 195, loot: 'Casca de Árvore',
    curiosidade: "Dizem que quanto mais tempo fica parado, mais suas raízes se entrelaçam com o solo maligno ao redor.",
    desc: 'Irmão maior do Colosso Verde, com raízes mais profundas e casca mais grossa. Um verdadeiro muro vivo no meio da floresta corrompida.',
    icon: '🌳', portrait: 'Imagens/personagens/arvored.png',
  },
  {
    id: 'flm_raposa', name: 'Raposa Japonesa', zone: 'floresta_maligna',
    elem: 'Fogo', fraqueza: 'Água', hp: 100, loot: 'Pérola das Nove',
    curiosidade: "Alguns caçadores juram já ter visto rastros de mais de uma cauda, embora ninguém tenha confirmado de perto.",
    desc: 'Uma raposa veloz de pelagem avermelhada, movendo-se entre as sombras com golpes rápidos e imprevisíveis. Defesa quase inexistente — compensa isso com velocidade.',
    icon: '🦊', portrait: 'Imagens/personagens/Raposajasa.png', portraitAlt: ['Imagens/personagens/flm_raposa.png'],
  },
  {
    id: 'flm_mago', name: 'Mago', zone: 'floresta_maligna',
    elem: 'Energia', fraqueza: 'Caos', hp: 115, loot: 'Pergaminho',
    curiosidade: "Os pergaminhos que carrega ainda ardem ao toque — sinal de que o feitiço que o corrompeu nunca parou de queimar.",
    desc: 'Um conjurador arcano que se perdeu na floresta durante a corrupção. Seus feitiços causam dano absurdo, mas ele quase não aguenta um golpe de volta.',
    icon: '🧙', portrait: 'Imagens/personagens/flm_mago.png',
  },
  {
    id: 'flm_urso_yokai', name: 'Urso Yokai', zone: 'floresta_maligna',
    elem: 'Sombra', fraqueza: 'Magia Negra / Luz', hp: 225, loot: 'Osso do Guardião Furioso',
    curiosidade: "O pelo escurecido brilha de leve sob a lua — um dos sinais mais visíveis da corrupção que domina a floresta à noite.",
    desc: 'Um urso tomado pela névoa da Floresta Maligna, maior e mais agressivo que qualquer urso comum da região. Seus golpes críticos são especialmente perigosos.',
    icon: '🐻', portrait: 'Imagens/personagens/ursobYokai.png',
  },
  {
    id: 'flm_boss_samurai_mascara', name: 'Samurai da Máscara Partida', zone: 'floresta_maligna',
    elem: 'Sombra', fraqueza: 'Magia Negra / Luz', hp: 1300, loot: 'Metade da Máscara Partida',
    curiosidade: "'A Guerreira dos Dois Destinos' — ninguém sabe ao certo qual dos dois ela escolheu no fim.",
    desc: 'Chefe 1 de 4 da Floresta Maligna. Uma guerreira caída, com metade do rosto coberto por uma máscara rachada. Ataca com precisão letal e crítico alto.',
    icon: '🗡️', portrait: 'Imagens/personagens/guerreironn.png',
  },
  {
    id: 'flm_boss_guardia_yokai', name: 'Guardiã Yokai', zone: 'floresta_maligna',
    elem: 'Sombra', fraqueza: 'Magia Negra / Luz', hp: 700, loot: 'Sino do Silêncio Eterno',
    curiosidade: "Vigia um santuário que não existe mais — só ela parece lembrar onde ele ficava.",
    desc: 'Chefe 2 de 4 da Floresta Maligna. Menor em vida que os outros três chefes, mas compensa com ataque e defesa muito acima da média.',
    icon: '⛩️', portrait: 'Imagens/personagens/escorpios.png',
  },
  {
    id: 'flm_boss_serpentinos', name: 'Serpentinos', zone: 'floresta_maligna',
    elem: 'Veneno', fraqueza: 'Energia / Vento', hp: 1800, loot: 'Escama da Lua Negra',
    curiosidade: "Metade dos golpes carrega veneno o suficiente pra continuar drenando muito depois da luta terminar.",
    desc: 'Chefe 3 de 4 da Floresta Maligna. Serpente colossal cujas presas embebidas em veneno corroem lentamente quem ousa enfrentá-la.',
    icon: '🐍', portrait: 'Imagens/personagens/serpentinos.png',
  },
  {
    id: 'flm_boss_rubrios_yk', name: 'Rubrios Yk', zone: 'floresta_maligna',
    elem: 'Fogo', fraqueza: 'Água', hp: 2000, loot: 'Selo da Fortuna da Floresta',
    curiosidade: "Poucos sobrevivem tempo suficiente pra ver de perto o selo raro que ele às vezes deixa cair.",
    desc: 'Chefe final da Floresta Maligna. O maior HP e a maior defesa entre os quatro chefes — um verdadeiro muro de fogo. Seu drop lendário é extremamente raro.',
    icon: '🔥', portrait: 'Imagens/personagens/RubriosYK.png',
  },

  // ══ Templo do Vazio Ecoante ══
  {
    id: 'espectro_menor', name: 'Espectro Menor', zone: 'vazio',
    elem: 'Sombra', fraqueza: 'Magia Negra / Luz', hp: 280, loot: 'Cinza Espectral',
    curiosidade: "A mesma espécie reaparece, bem mais fraca, nos corredores da Dungeon das Sombras.",
    desc: 'Uma forma espectral sem rosto. Flutua em silêncio absoluto — exceto pelo eco distante de um grito antigo que ressoa ao seu redor. (A mesma espécie reaparece, bem mais fraca, na Dungeon das Sombras.)',
    icon: '👻', portrait: 'Imagens/personagens/file_00000000247c71f58871ae58a3990a1d.png',
  },
  {
    id: 'espirito_ancestral', name: 'Espírito Ancestral', zone: 'vazio',
    elem: 'Fantasma', fraqueza: 'Luz / Energia', hp: 950, loot: 'Essência Fantasmal',
    curiosidade: "Não tem corpo — por isso, seu HP nunca chega a ser exibido durante o combate.",
    desc: 'Uma forma espectral que existiu antes do templo ser construído. Não tem corpo — e por isso, não pode ser ferido normalmente. Suga a força vital dos vivos para manter sua forma coesa. HP nunca é exibido em combate.',
    icon: '🌀', portrait: 'Imagens/O Templo do Vazio Ecoante/espíritoances/Eancetral1.png',
  },
  {
    id: 'ecorrom', name: 'Espectro Ancestral (Ecorrom)', zone: 'vazio',
    elem: 'Vazio', fraqueza: 'Energia / Luz', hp: 1800, loot: 'Eco Cristalizado',
    curiosidade: "Cerca de metade dos seus ataques simplesmente erram; quase intocável, mas também impreciso.",
    desc: 'Boss final do templo. Entidade ancestral que habita o núcleo desde antes de sua construção. Kesa-Giri é um corte que bloqueia cura por turnos, e 55% dos seus ataques simplesmente erram — quase intocável.',
    icon: '👁️', portrait: 'Imagens/personagens/Ecorrom.png',
  },

  // ══ Dungeon das Sombras ══
  {
    id: 'sombra_rastejante', name: 'Sombra Rastejante', zone: 'sombras',
    elem: 'Sombra', fraqueza: 'Magia Negra / Luz', hp: 80, loot: 'Pó de Sombra',
    curiosidade: "Guardião do primeiro corredor da dungeon — lento, mas nunca desiste da perseguição.",
    desc: 'Um fragmento de escuridão que ganhou forma. Lento, mas persistente. (Fase 1)',
    icon: '👤', portrait: 'Imagens/personagens/file_0000000013d4720ebe453f8960ea84f4.png',
  },
  {
    id: 'guardiao_cristal', name: 'Guardião de Cristal', zone: 'sombras',
    elem: 'Cristal', fraqueza: 'Veneno / Elétrico', hp: 110, loot: 'Fragmento de Cristal Negro',
    curiosidade: "Feito do mesmo cristal negro que forma os corredores internos que ele protege.",
    desc: 'Construto de cristal negro que protege os corredores internos. (Fase 1)',
    icon: '💎', portrait: 'Imagens/personagens/file_00000000412871f5b312b16e4cc02f65.png',
  },
  {
    id: 'sentinela_sombras', name: 'Sentinela das Sombras', zone: 'sombras',
    elem: 'Sombra', fraqueza: 'Magia Negra / Luz', hp: 320, loot: 'Essência das Sombras',
    curiosidade: "Uma armadura vazia, animada por pura escuridão — sem mente e sem misericórdia.",
    desc: 'Mini-boss da Fase 1. O guardião do primeiro corredor. Uma armadura vazia animada por escuridão pura — sem mente, sem misericórdia.',
    icon: '🗡️', portrait: 'Imagens/personagens/file_000000004480720ebae4a22a12db7146.png',
  },
  {
    id: 'samurai_caveira_1', name: 'Samurai Caveira', zone: 'sombras',
    elem: 'Vento', fraqueza: 'Gelo / Elétrico', hp: 150, loot: 'Lâmina Quebrada',
    curiosidade: "Troca de forma quatro vezes ao longo da Fase 2, antes de liberar o mini-boss seguinte.",
    desc: 'Esqueleto vestido com armadura de samurai esfarrapada, rápido demais para ser apenas ossos. Alterna entre duas formas ao longo da Fase 2 — quatro no total até liberar o mini-boss.',
    icon: '💀', portrait: 'Imagens/personagens/WA_1781973635077.png',
  },
  {
    id: 'olho_espectral', name: 'Olho Espectral', zone: 'sombras',
    elem: 'Sombra', fraqueza: 'Magia Negra / Luz', hp: 480, loot: 'Humor Espectral',
    curiosidade: "Habita a câmara há séculos — seu ataque psíquico ignora armaduras físicas por completo.",
    desc: 'Mini-boss da Fase 2. Entidade antiga que habita a câmara há séculos. Seu ataque psíquico penetra defesas físicas e corrói a mente.',
    icon: '👁️', portrait: 'Imagens/personagens/olho.png', portraitAlt: ['Imagens/personagens/Olho.png'],
  },
  {
    id: 'ogro_terra', name: 'Ogro Guardião', zone: 'sombras',
    elem: 'Terra', fraqueza: 'Planta / Gelo', hp: 700, loot: 'Argila Sombria',
    curiosidade: "Cada passo seu abala o chão da dungeon inteira, mesmo sendo lento pra se mover.",
    desc: 'Colosso feito de lama comprimida e raízes negras. Lento, mas cada golpe abala o chão inteiro. (Fase 3)',
    icon: '🗿', portrait: 'Imagens/personagens/file_00000000a124720e8a9efe9827364609.png',
  },
  {
    id: 'ogro_granito', name: 'Ogro Guardião II', zone: 'sombras',
    elem: 'Planta', fraqueza: 'Fogo / Elétrico', hp: 780, loot: 'Musgo Sombrio',
    curiosidade: "Os esporos que solta ao se mover já bastam pra fazer o trabalho sujo por ele.",
    desc: 'Corpo coberto de musgo espesso e raízes vivas. Não tem pressa — os esporos que solta ao se mover já fazem o trabalho por ele. (Fase 3)',
    icon: '🌿', portrait: 'Imagens/personagens/file_0000000090d071f5974425e11b49c22b.png',
  },
  {
    id: 'guarda_caveira_siu', name: 'Guarda Caveira', zone: 'sombras',
    elem: 'Pedra', fraqueza: 'Vento / Água', hp: 380, loot: 'Osso da Marionete',
    curiosidade: "Um fantoche de osso e sombra — não pensa, apenas obedece à vontade de Siu.",
    desc: 'Esqueleto animado pela vontade de Siu. Não pensa — apenas obedece. Um fantoche de osso e sombra.',
    icon: '💀', portrait: 'Imagens/personagens/file_000000001ca4720e941d21e3167bd546.png',
  },
  {
    id: 'guarda_rei_dungeon', name: 'Guarda do Rei', zone: 'sombras',
    elem: 'Sombra', fraqueza: 'Magia Negra / Luz', hp: 140, loot: 'Emblema do Rei Maldito',
    curiosidade: "Soldado reanimado a serviço do Lich, obediente até o último golpe.",
    desc: 'Soldado reanimado a serviço do Lich. Obediente até a destruição.',
    icon: '⚔️', portrait: 'Imagens/personagens/Cave.png',
  },
  {
    id: 'kakuri_muichi', name: 'Kakuri Muichi', zone: 'sombras',
    elem: 'Vento', fraqueza: 'Gelo / Elétrico', hp: 1200, loot: 'Katana de Muichi',
    curiosidade: "Espadachim lendário — dizem que a lâmina corta o ar antes mesmo do golpe ser visto.",
    desc: 'Espadachim lendário ressuscitado como lorde do Lich. Ágil como o vento — a lâmina corta o ar antes mesmo de você perceber o movimento. Passiva: golpes críticos frequentes.',
    icon: '💀', portrait: 'Imagens/personagens/muichi.png',
  },
  {
    id: 'siu_sacerdotisa_negra', name: 'Siu — Sacerdotisa Negra', zone: 'sombras',
    elem: 'Magia Negra', fraqueza: 'Luz', hp: 2000, loot: 'Pedra da Sacerdotisa Negra',
    curiosidade: "Irmã gêmea de Yuki — toda cura tentada perto dela acaba se revertendo contra quem ousou lançá-la.",
    desc: 'A irmã gêmea de Yuki, sacerdotisa do equilíbrio sombrio. Toda magia que ela lança devolve um pouco de vida — inclusive a sua, se você ousar se curar perto dela.',
    icon: '🌑', portrait: 'Imagens/personagens/Siu.png',
  },
  {
    id: 'lorde_das_sombras', name: 'Lorde das Sombras', zone: 'sombras',
    elem: 'Magia Negra', fraqueza: 'Luz', hp: 4000, loot: 'Essência do Lorde',
    curiosidade: "A entidade mais poderosa da dungeon. Não fala sua língua — e nunca precisou.",
    desc: 'Boss final da dungeon. A entidade mais poderosa deste lugar. Não fala sua língua. Não precisa.',
    icon: '🌑', portrait: 'Imagens/personagens/LordT.png',
  },

  // ══ Kappa Dungeon ══
  {
    id: 'karakasa_obake', name: 'Karakasa-obake', zone: 'kappa',
    elem: 'Sombra', fraqueza: 'Magia Negra / Luz', hp: 300, loot: '—',
    curiosidade: "Um guarda-chuva amaldiçoado de aparência inofensiva — e por isso mesmo, o mais subestimado do Kappa.",
    desc: 'Um demônio guarda-chuva de aparência inofensiva. Ignora defesas e se cura com cada golpe.',
    icon: '☂️', portrait: 'Imagens/personagens/osake.png',
  },
  {
    id: 'ooni_blindado', name: 'Ooni Blindado', zone: 'kappa',
    elem: 'Terra', fraqueza: 'Planta / Gelo', hp: 3500, loot: 'Fragmento de Sombra',
    curiosidade: "Não protege tesouro nenhum — só a vontade do Kappa. Poucos o enfrentam e vivem pra contar.",
    desc: 'Poucos atravessam o caminho do Ooni Blindado e permanecem vivos para contar a história. Ele não protege tesouros. Protege apenas a vontade do Kappa. Ignora defesa e imune a controle.',
    icon: '👹', portrait: 'Imagens/personagens/ooni.png',
  },
  {
    id: 'guardiao_kappa', name: 'Guardião do Kappa', zone: 'kappa',
    elem: 'Água', fraqueza: 'Planta', hp: 4000, loot: 'Runa D',
    curiosidade: "A armadura natural é feita de espinhos, conchas e algas acumuladas ao longo de gerações nas profundezas.",
    desc: 'Um demônio colossal coberto por armadura natural de espinhos, conchas, algas e pedras das profundezas. Sua força é mais assustadora que uma muralha.',
    icon: '👹', portrait: 'Imagens/personagens/ooni.png',
  },
  {
    id: 'sereia_kappa', name: 'Sereia das Profundezas', zone: 'kappa',
    elem: 'Água', fraqueza: 'Planta', hp: 2500, loot: 'Escama de Sereia',
    curiosidade: "Seu canto drena força à distância — a proteção das águas a torna quase intocável enquanto canta.",
    desc: 'Guardiã das águas profundas. Seu canto drena a força dos intrusos enquanto a proteção das águas a mantém intocável.',
    icon: '🧜', portrait: 'Imagens/personagens/onna.png',
  },
  {
    id: 'kappa_lider', name: 'Kappa — Líder Supremo', zone: 'kappa',
    elem: 'Água', fraqueza: 'Planta', hp: 5500, loot: 'Prato do Kappa',
    curiosidade: "Quanto mais sangra em batalha, mais crítico seus golpes se tornam — um adversário mais perigoso quando ferido.",
    desc: 'Boss final da masmorra. Corpo pesado com velocidade absurda — e quanto mais sangra, mais crítico causa.',
    icon: '🐢', portrait: 'Imagens/personagens/kappi.png',
  },

  // ══ Masmorra Inazami ══
  {
    id: 'onibi_cinzas_trio', name: 'Onibi das Cinzas (trio)', zone: 'inazami',
    elem: 'Fogo', fraqueza: 'Água', hp: 220, loot: 'Pedra Esper',
    curiosidade: "Nasceram das fagulhas do selo de Hi-no-Kagutsuchi — cada chama explode ao ser derrotada.",
    desc: 'Três chamas azuis que giram como uma só — Onibi Errante, Onibi Sussurrante e Onibi Voraz — nascidas das fagulhas do selo de Hi-no-Kagutsuchi. Individualmente fracas, juntas são perigosas: cada uma explode ao morrer.',
    icon: '🔥', portrait: 'Imagens/personagens/file_000000009750720e8bf77a669cb77087.png',
  },
  {
    id: 'corredor_estatuas', name: 'Estátuas do Oni das Chamas (trio)', zone: 'inazami',
    elem: 'Fogo', fraqueza: 'Água', hp: 1600, loot: 'Fragmento Final do Amuleto',
    curiosidade: "Regra, Sonho e Ordem agem em ordem sorteada a cada rodada — nunca dá pra prever quem ataca primeiro.",
    desc: 'Regra, Sonho e Ordem — três guardiãs de pedra do Oni das Chamas, cada uma com sua própria punição. Agem em ordem sorteada a cada rodada, sem prioridade fixa.',
    icon: '🗿', portrait: 'Imagens/personagens/regrEst.png', portraitAlt: ['Imagens/personagens/sonhest.png','Imagens/personagens/ordemest.png'],
  },
  {
    id: 'eir_incompleta', name: 'Eir, a Incompleta', zone: 'inazami',
    elem: 'Fogo', fraqueza: 'Água', hp: 0, loot: '—',
    curiosidade: "Uma valquíria ainda em formação, presa por correntes de luz ao núcleo que continua moldando-a.",
    desc: 'Uma valquíria ainda em formação, presa por correntes de luz a um núcleo que continua a moldá-la. Filha de Hi-no-Kagutsuchi. (Boss ainda em desenvolvimento no jogo — stats de combate são placeholder por enquanto.)',
    icon: '⚡', portrait: 'Imagens/personagens/eir_valkiria.png',
  },

  // ══ PONTE DA FRONTEIRA / TRAVESSIA DE KUROGANE — capangas da bruxa Furrengro ══
  // Travessia ainda é um stub em vilarejo.js ("conteúdo completo entra
  // depois"). Furrengro (apelidada de "Furren") e seus 3 filhos ogros —
  // todo nome de ogro termina em "-gro" — foram expulsos do Vilarejo da
  // Pedra Branca e vivem na margem, além da vila, roubando (e às vezes
  // matando) quem cruza a Ponte da Fronteira, sempre por meios sujos.
  // Sem stats de combate reais ainda — placeholder até a dungeon entrar
  // em produção de verdade (mesmo tratamento dado à Eir, a Incompleta).
  {
    id: 'apegro', name: 'Apegro', zone: 'kurogane',
    elem: '—', fraqueza: '—', hp: 0, loot: '—',
    curiosidade: "O mais velho dos três — é o primeiro a avançar sempre que alguém se aproxima demais da ponte da mãe.",
    desc: 'Ogro, filho de Furrengro e capanga dela na Ponte da Fronteira. Corpulento e agressivo, avança na frente dos irmãos. (Ainda em desenvolvimento no jogo — stats de combate são placeholder por enquanto.)',
    icon: '👹',
  },
  {
    id: 'jungro', name: 'Jungro', zone: 'kurogane',
    elem: '—', fraqueza: '—', hp: 0, loot: '—',
    curiosidade: "Carrega um tronco arrancado da própria ponte como arma — a mãe nunca precisou lhe dar uma de verdade.",
    desc: 'Ogro, filho de Furrengro e capanga dela na Ponte da Fronteira. Usa força bruta e o que estiver por perto como arma. (Ainda em desenvolvimento no jogo — stats de combate são placeholder por enquanto.)',
    icon: '👹',
  },
  {
    id: 'jegro', name: 'Jegro', zone: 'kurogane',
    elem: '—', fraqueza: '—', hp: 0, loot: '—',
    curiosidade: "O mais novo dos três — ainda corre pra trás da mãe no meio da briga, mesmo já sendo maior que um homem.",
    desc: 'Ogro, filho de Furrengro e capanga dela na Ponte da Fronteira. O caçula do trio, ainda assim tão perigoso quanto os irmãos. (Ainda em desenvolvimento no jogo — stats de combate são placeholder por enquanto.)',
    icon: '👹',
  },
  {
    id: 'furren_crianca', name: 'Furren (disfarce infantil)', zone: 'kurogane',
    elem: '—', fraqueza: '—', hp: 0, loot: '—',
    curiosidade: "Ninguém desconfia de uma criança perdida pedindo ajuda — é exatamente por isso que ela escolheu essa forma.",
    desc: 'A verdadeira Furrengro se disfarça de criança indefesa para atrair viajantes de bom coração. No momento em que a vítima menos espera, ela ataca — rouba os mais fortes, mata os mais fracos. Ninguém sabe ao certo de onde ela veio; só que foi expulsa do Vilarejo da Pedra Branca há muito tempo e nunca mais foi embora da região. (Ainda em desenvolvimento no jogo — stats de combate são placeholder por enquanto.)',
    icon: '🧒',
  },
  {
    id: 'furrengro', name: 'Furrengro, a Verdadeira', zone: 'kurogane',
    elem: '—', fraqueza: '—', hp: 0, loot: '—',
    curiosidade: "\"Furren\" é só o nome que ela dá pros outros — o \"-gro\" no fim do nome verdadeiro entrega o que ela realmente é.",
    desc: 'Ogra e mãe de Apegro, Jungro e Jegro. Expulsa do Vilarejo da Pedra Branca, encontrou na Ponte da Fronteira um jeito de sobreviver: emboscar viajantes por meios sujos, com a ajuda dos filhos. Por trás do disfarce infantil, essa é a forma verdadeira dela. (Ainda em desenvolvimento no jogo — stats de combate são placeholder por enquanto.)',
    icon: '👹',
  },

  // ══ Masmorra 4 — O Ninho dos Fios Ilusórios (Vila de Tsumugi) ══
  // Ids batem com o motor: 'aranha_filhos_tsumugi' é o groupId da luta dos
  // gêmeos (multi_enemy_battle) e 'tsumugi' é o enemy.id do chefe.
  // A forma 2 e o Kagerō (que só luta contra a Hiroto, nunca contra o
  // jogador) são liberados junto com a Tsumugi — ver `alsoMarks`.
  // Sub-boss Tsukumo e fases 2–3 ainda são TODO em terra_aranhas.js.
  {
    id: 'aranha_filhos_tsumugi', name: 'Itsuki & Kumiko', zone: 'aranhas',
    elem: 'Veneno', fraqueza: 'Energia / Vento', hp: 2700, loot: '—',
    curiosidade: "Lutam como um só: cada golpe tem 40% de chance de envenenar, e a Carapaça de Seda deixa a defesa deles cada vez mais alta.",
    desc: 'Os filhos de Tsumugi — dois irmãos aranha que lutam como um só. Envenenam, endurecem a carapaça de seda e prendem quem se aproxima numa teia que enfraquece o seu ataque.',
    icon: '🕷️', portrait: 'Imagens/personagens/trurish.png',
  },
  {
    id: 'tsumugi', name: 'Tsumugi, a Rainha Aranha', zone: 'aranhas',
    elem: 'Veneno', fraqueza: 'Energia / Vento', hp: 7500, loot: '—',
    alsoMarks: ['tsumugi_forma2', 'kagero'],
    formas: ['tsumugi', 'tsumugi_forma2'],   // deslizar no detalhe troca de forma
    curiosidade: "Tece os fios que prendem a vila inteira — e não cai enquanto o filho dela ainda estiver de pé.",
    desc: 'Chefe final da Masmorra 4. A Rainha Aranha tece os fios que prendem a vila inteira. Seu veneno se acumula a cada golpe, e ela rouba vida com a Teia Dourada Drenante. Zerar o HP dela é só o começo: a luta tem duas formas.',
    icon: '🕷️', portrait: 'Imagens/personagens/tsumugiBa.png',
  },
  {
    id: 'tsumugi_forma2', name: 'Tsumugi, a Tecelã Carmesim', zone: 'aranhas', hidden: true,   // só aparece deslizando o card da Tsumugi
    elem: 'Veneno', fraqueza: 'Energia / Vento', hp: 9500, loot: '—',
    curiosidade: "Abaixo de 40% de HP ela entra em fúria: o ATQ sobe e ela ganha um golpe extra a cada turno.",
    desc: 'A segunda forma da Rainha. Oito patas vermelhas como brasa rasgam as costas dela, e os golpes passam a vir carregados, em combos, com drenos e veneno forte. "Você me obrigou a mostrar isso."',
    icon: '🕸️', portrait: 'Imagens/personagens/tsumugiFina.png',
  },
  {
    id: 'kagero', name: 'Kagerō', zone: 'aranhas',
    elem: 'Veneno', fraqueza: 'Energia / Vento', hp: 2000, loot: '—',
    curiosidade: "Você nunca o enfrenta de frente: a luta dele é com a Hiroto, e a Rainha só pode cair depois que ele cai.",
    desc: 'Terceiro filho de Tsumugi. Enquanto você luta contra a Rainha, ele trava um duelo paralelo com a Hiroto — e, se ela cair, passa a atacar você também.',
    icon: '🕷️',
  },
];

const BESTIARY_ZONES = {
  todos: 'Todos',
  floresta: 'Floresta',
  floresta_maligna: 'Floresta Maligna',
  vazio: 'Templo do Vazio Ecoante',
  sombras: 'Dungeon das Sombras',
  kappa: 'Kappa Dungeon',
  inazami: 'Masmorra Inazami',
  kurogane: 'Kurogane',
  aranhas: 'Ninho dos Fios Ilusórios',
};

let bstActiveZone = 'todos';
let bstDetailId = null;

// ─── ESTADO (persistido em G.player) ──────────────────────────────
const Bestiary = {
  init() {
    if (!G.player.bestiaryFound) G.player.bestiaryFound = [];
  },
  isFound(id) {
    this.init();
    return G.player.bestiaryFound.includes(id);
  },
  // chama isso no início de cada batalha contra o inimigo — idempotente,
  // pode chamar toda vez sem duplicar nem re-disparar o efeito visual.
  markFound(id) {
    this.init();
    if (this.isFound(id)) return;
    G.player.bestiaryFound.push(id);
    const def = BESTIARY_DEFS.find(d => d.id === id);
    // entradas ligadas (ex.: forma 2 e Kagerō liberam junto com a Tsumugi)
    if (def && Array.isArray(def.alsoMarks)) {
      def.alsoMarks.forEach(x => {
        if (!G.player.bestiaryFound.includes(x)) G.player.bestiaryFound.push(x);
      });
    }
    if (typeof notify === 'function' && def) {
      notify(`📖 Novo registro no Bestiário: ${def.name}`);
    }
    // se a galeria estiver aberta na hora, mostra o reveal animado na hora;
    // senão só fica salvo e aparece já revelado da próxima vez que abrir.
    if (document.getElementById('bst-overlay')?.classList.contains('active')) {
      bstPendingReveal = id;
      bstRenderGallery();
    }
  },
  // guarda a imagem que o próprio jogo usou na batalha — é a prova de que o
  // caminho existe. Só entra como reserva (depois do portrait do BESTIARY_DEFS),
  // ou como imagem principal quando a entrada não tem portrait.
  learnImg(id, img) {
    if (!id || typeof img !== 'string' || !img) return;
    this.init();
    if (!G.player.bestiaryImgs) G.player.bestiaryImgs = {};
    if (G.player.bestiaryImgs[id] !== img) G.player.bestiaryImgs[id] = img;
  },
  learnFromEnemy(e) {
    if (!e || typeof e !== 'object') return;
    if (e.id && e.img) this.learnImg(e.id, e.img);
    const gid = e.groupId;
    const ms = Array.isArray(e.members) ? e.members : null;
    if (ms) {
      ms.forEach(m => { if (m && m.id && m.img) this.learnImg(m.id, m.img); });
      const first = ms.find(m => m && m.img);
      if (gid && first) this.learnImg(gid, first.img);
    }
  },
  // diagnóstico: testa a imagem de todas as entradas já encontradas.
  // No Eruda:  await Bestiary.testImages()
  async testImages() {
    this.init();
    const out = [];
    for (const id of G.player.bestiaryFound) {
      const def = BESTIARY_DEFS.find(d => d.id === id);
      if (!def) continue;
      const list = bstImgList(def);
      let ok = null;
      for (const src of list) {
        ok = await new Promise(res => { const i = new Image(); i.onload = () => res(src); i.onerror = () => res(null); i.src = src; });
        if (ok) break;
      }
      out.push({ id, nome: def.name, tentou: list.length, carregou: ok || (list.length ? '❌ NENHUM' : '— sem imagem (emoji)') });
    }
    console.table(out);
    return out;
  },
};

let bstPendingReveal = null;

// ─── UI ────────────────────────────────────────────────────────────
function openBestiary() {
  // fecha a tela de Configurações se estiver aberta (senão o Bestiário abre
  // atrás dela, já que #config-overlay usa z-index:9000)
  if (typeof closeConfig === 'function') {
    try { closeConfig(); } catch (e) {}
  }
  bstEnsureUI();
  Bestiary.init();
  document.getElementById('bst-overlay').classList.add('active');
  bstRenderGallery();
}

function closeBestiary() {
  document.getElementById('bst-overlay')?.classList.remove('active');
}

function bstSetZone(zone) {
  bstActiveZone = zone;
  bstRenderGallery();
}

function bstRenderGallery() {
  Bestiary.init();
  const visiveis = BESTIARY_DEFS.filter(d => !d.hidden);
  const total = visiveis.length;
  const foundCount = visiveis.filter(d => Bestiary.isFound(d.id)).length;
  const pct = total ? Math.round((foundCount / total) * 100) : 0;

  const header = document.getElementById('bst-header-stat');
  if (header) header.textContent = `${foundCount} de ${total} encontrados · ${pct}%`;
  const bar = document.getElementById('bst-header-bar-fill');
  if (bar) bar.style.width = pct + '%';

  const chips = document.getElementById('bst-chips');
  if (chips) {
    chips.innerHTML = Object.keys(BESTIARY_ZONES).map(z => {
      const count = z === 'todos' ? total : visiveis.filter(d => d.zone === z).length;
      if (count === 0 && z !== 'todos') return '';
      return `<div class="bst-chip${z === bstActiveZone ? ' active' : ''}" onclick="bstSetZone('${z}')">${BESTIARY_ZONES[z]} <span>${count}</span></div>`;
    }).join('');
  }

  const list = visiveis.filter(d => bstActiveZone === 'todos' || d.zone === bstActiveZone);
  const grid = document.getElementById('bst-grid');
  if (!list.length) {
    grid.innerHTML = `<div class="bst-empty">Nenhum inimigo nesta aba ainda.</div>`;
    return;
  }

  grid.innerHTML = list.map(def => {
    const isFound = Bestiary.isFound(def.id);
    const justRevealed = bstPendingReveal === def.id;
    return `
      <div class="bst-card ${isFound ? '' : 'locked'} ${justRevealed ? 'revealing' : ''}" onclick="bstShowDetail('${def.id}')">
        ${isFound ? bstPortraitHtml(def, 'small') : `<div class="bst-mark">?</div>`}
        <div class="bst-card-name">${isFound ? def.name : '???'}</div>
        ${isFound && def.formas ? `<div class="bst-forms-badge">⇆ ${def.formas.length} formas</div>` : ''}
      </div>`;
  }).join('');

  bstPendingReveal = null;
}

// Lista de caminhos a tentar, em ordem. O retrato antigo era um background-image
// de CSS, que o img_autofix.js não corrige (ele só escuta <img>) — por isso um
// 404 de maiúscula/minúscula deixava o card vazio. Agora é <img> com fallback.
function bstImgList(def) {
  const out = [];
  const add = p => { if (p && typeof p === 'string' && !out.includes(p)) out.push(p); };
  const variantes = p => {
    add(p);
    add(p.replace(/\/[Pp]ersonagens\//, '/personagens/'));
    add(p.replace(/\/[Pp]ersonagens\//, '/Personagens/'));
    // nome do arquivo todo em minúsculo (o Android diferencia maiúscula/minúscula)
    add(p.replace(/[^\/]+$/, m => m.toLowerCase()));
    // acentos em NFD (alguns gerenciadores de arquivo salvam assim)
    try { add(p.normalize('NFD')); } catch (e) {}
  };
  if (def.portrait) variantes(def.portrait);
  (def.portraitAlt || []).forEach(variantes);
  // caminho que o próprio jogo declara pro inimigo (ex.: floresta_maligna.js)
  try {
    const fx = window.FLM_IMAGENS_FIXAS;
    if (fx && fx[def.id]) add(fx[def.id]);
  } catch (e) {}
  const learned = G.player && G.player.bestiaryImgs && G.player.bestiaryImgs[def.id];
  add(learned);
  return out;
}

function bstImgFail(img) {
  const def = BESTIARY_DEFS.find(d => d.id === img.dataset.bst);
  const list = def ? bstImgList(def) : [];
  const idx = parseInt(img.dataset.i || '0', 10);
  console.warn('[Bestiário] imagem não carregou:', img.getAttribute('src'));
  if (idx + 1 < list.length) {
    img.dataset.i = String(idx + 1);
    img.src = list[idx + 1];
    return;
  }
  const holder = img.parentNode;
  if (holder) {
    holder.classList.add('bst-portrait-emoji');
    holder.textContent = (def && def.icon) || '❔';
  }
}

// retrato pequeno (card da grade) ou grande (modal de detalhe)
function bstPortraitHtml(def, size) {
  const cls = size === 'big' ? 'bst-portrait-big' : 'bst-portrait-small';
  if (def.sprite) {
    return `<div class="${cls}" style="background-image:url('${def.sprite.src}'); background-size:${def.sprite.frameW * (size === 'big' ? 2 : 1)}px auto;"></div>`;
  }
  const list = bstImgList(def);
  if (list.length) {
    return `<div class="${cls}"><img src="${list[0]}" data-bst="${def.id}" data-i="0" alt="" draggable="false" onerror="bstImgFail(this)"></div>`;
  }
  return `<div class="${cls} bst-portrait-emoji">${def.icon || '❔'}</div>`;
}

function bstShowDetail(id, dir) {
  const def = BESTIARY_DEFS.find(d => d.id === id);
  if (!def) return;
  bstDetailId = id;
  const isFound = Bestiary.isFound(id);
  // formas: o card da grade é a 1ª; deslizar para o lado troca de página
  const grupo = BESTIARY_DEFS.find(d => Array.isArray(d.formas) && d.formas.includes(id));
  const formas = grupo ? grupo.formas : null;
  const idx = formas ? formas.indexOf(id) : 0;
  const dots = formas ? `<div class="bst-dots">${formas.map((f, k) => `<span class="${k === idx ? 'on' : ''}"></span>`).join('')}</div>` : '';
  const dica = formas ? `<div class="bst-swipe-hint">‹ deslize para ver a outra forma ›</div>` : '';
  const modal = document.getElementById('bst-modal-overlay');
  modal.innerHTML = `
    <div class="bst-diamond l" ${formas ? `onclick="event.stopPropagation(); bstTrocaForma(-1)"` : ''}></div>
    <div class="bst-modal${dir ? ' slide-' + dir : ''}" onclick="event.stopPropagation()">
      <div class="bst-modal-top">
        <div class="bst-zone-tag">${isFound ? BESTIARY_ZONES[def.zone] : '—'}</div>
        <div class="bst-status-dot ${isFound ? 'found' : 'locked'}"></div>
        ${isFound ? bstPortraitHtml(def, 'big') : `<div class="bst-mark big">?</div>`}
      </div>
      ${dots}
      <div class="bst-modal-body">
        <div class="bst-modal-name">${isFound ? def.name : '???'}</div>
        <div class="bst-modal-desc">${isFound ? def.desc : 'Inimigo ainda não encontrado. Enfrente-o em combate pra revelar o registro completo.'}</div>
      </div>
      <div class="bst-curio">
        <div class="bst-curio-label">✦ Curiosidade</div>
        <div class="bst-curio-text">${isFound ? (def.curiosidade || 'Nada de especial registrado sobre este inimigo ainda.') : '???'}</div>
      </div>
      <div class="bst-status ${isFound ? 'found' : 'locked'}">${isFound ? '✓ ENCONTRADO' : '🔒 NÃO ENCONTRADO'}</div>
      ${dica}
      <button class="bst-close" onclick="closeBstModal()">Fechar</button>
    </div>
    <div class="bst-diamond r" ${formas ? `onclick="event.stopPropagation(); bstTrocaForma(1)"` : ''}></div>`;
  modal.classList.add('active');
}

// troca de forma (deslizar ou tocar nos losangos). Dá a volta: 1ª ↔ 2ª.
function bstTrocaForma(passo) {
  const grupo = BESTIARY_DEFS.find(d => Array.isArray(d.formas) && d.formas.includes(bstDetailId));
  if (!grupo) return;
  const n = grupo.formas.length;
  const idx = grupo.formas.indexOf(bstDetailId);
  const novo = grupo.formas[(idx + passo + n) % n];
  bstShowDetail(novo, passo > 0 ? 'left' : 'right');
}

function closeBstModal() {
  document.getElementById('bst-modal-overlay')?.classList.remove('active');
}

// ─── injeta HTML + CSS uma única vez (sem precisar editar gat-1.html) ──
function bstEnsureUI() {
  if (document.getElementById('bst-overlay')) return;

  const style = document.createElement('style');
  style.textContent = `
    #bst-overlay{position:fixed; inset:0; background:#0b0a08; z-index:9200;
      display:none; flex-direction:column; font-family:'Zen Kaku Gothic New',sans-serif; color:#ece3d0;}
    #bst-overlay.active{display:flex;}
    .bst-topbar{padding:16px 16px 10px; border-bottom:1px solid #3a3020;}
    .bst-topbar h2{font-family:'Shippori Mincho',serif; color:#c9a35a; margin:0 0 8px; font-size:19px;}
    .bst-close-btn{position:absolute; top:14px; right:16px; background:none; border:none; color:#9c8f74; font-size:20px;}
    #bst-header-stat{font-size:12px; color:#9c8f74; margin-bottom:5px;}
    .bst-header-bar{height:6px; background:#0e0c08; border-radius:3px; overflow:hidden;}
    #bst-header-bar-fill{height:100%; background:#c9a35a; width:0%;}
    #bst-chips{display:flex; gap:6px; overflow-x:auto; padding:10px 16px; -webkit-overflow-scrolling:touch;}
    .bst-chip{flex:0 0 auto; background:#16130f; border:1px solid #3a3020; color:#9c8f74; font-size:11.5px; padding:7px 11px; border-radius:3px; white-space:nowrap;}
    .bst-chip.active{background:#c9a35a; border-color:#c9a35a; color:#0b0a08; font-weight:700;}
    .bst-chip span{opacity:.75; margin-left:3px;}
    #bst-grid{flex:1; overflow-y:auto; display:grid; grid-template-columns:repeat(3,1fr); gap:10px; padding:14px 16px 30px;}
    .bst-card{background:#16130f; border:1px solid #3a3020; border-radius:4px; padding:6px 5px; text-align:center; aspect-ratio:1/2; display:flex; flex-direction:column; align-items:center; justify-content:flex-start; gap:6px;}
    .bst-card{position:relative;}
    .bst-forms-badge{position:absolute; top:8px; right:8px; font-size:9.5px; color:#3ec9d6; background:rgba(5,13,15,.82); border:1px solid rgba(62,201,214,.45); border-radius:2px; padding:2px 5px;}
    .bst-card.locked{opacity:.7;}
    .bst-mark{font-family:'Shippori Mincho',serif; font-size:52px; color:#3a3020; line-height:1; flex:1; min-height:0; display:flex; align-items:center; justify-content:center;}
    .bst-mark.big{font-size:64px; flex:none;}
    .bst-card-name{font-size:11px; color:#9c8f74; line-height:1.3; flex:none;}
    .bst-card:not(.locked) .bst-card-name{color:#c9a35a; font-weight:700;}
    .bst-portrait-small{width:100%; flex:1; min-height:0; border-radius:3px; overflow:hidden; background-position:center; background-repeat:no-repeat; background-size:cover;}
    .bst-portrait-big{width:100%; height:100%; background-position:center; background-repeat:no-repeat; background-size:contain;}
    .bst-portrait-small img{width:100%; height:100%; object-fit:cover; object-position:center; display:block;}
    .bst-portrait-big img{width:100%; height:100%; object-fit:contain; object-position:center; display:block;}
    .bst-portrait-emoji{font-size:min(15vw,72px); display:flex; align-items:center; justify-content:center;}
    .bst-modal-top .bst-portrait-emoji{font-size:76px;}
    .bst-card.revealing{animation:bstReveal .6s ease;}
    @keyframes bstReveal{
      0%{transform:scale(.6) rotate(-6deg); opacity:0; box-shadow:0 0 0 rgba(201,163,90,0);}
      45%{transform:scale(1.12) rotate(2deg); opacity:1; box-shadow:0 0 22px rgba(201,163,90,.7);}
      100%{transform:scale(1) rotate(0); box-shadow:0 0 0 rgba(201,163,90,0);}
    }
    .bst-empty{grid-column:1/-1; text-align:center; color:#9c8f74; font-size:12.5px; padding:30px 0;}

    #bst-modal-overlay{position:fixed; inset:0; background:#0b0a08; z-index:9210; display:none; align-items:center; justify-content:center; padding:22px 30px; overflow-y:auto;}
    #bst-modal-overlay.active{display:flex;}
    .bst-diamond{width:13px; height:13px; background:#3ec9d6; clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%); box-shadow:0 0 10px #3ec9d6;}
    .bst-modal{width:100%; max-width:320px; background:linear-gradient(180deg,#0c1c1f,#050d0f); border:1px solid #3ec9d6; border-radius:2px; box-shadow:0 0 26px rgba(62,201,214,.3); position:relative;}
    .bst-modal-top{height:200px; display:flex; align-items:center; justify-content:center; position:relative; background:radial-gradient(circle at 50% 30%, rgba(62,201,214,.16), transparent 65%); border-bottom:1px solid rgba(62,201,214,.35);}
    .bst-zone-tag{position:absolute; top:12px; left:12px; font-size:10px; color:#3ec9d6; border:1px solid rgba(62,201,214,.45); padding:3px 9px; border-radius:2px;}
    .bst-status-dot{position:absolute; top:14px; right:14px; width:11px; height:11px; border-radius:50%;}
    .bst-status-dot.found{background:#c9a35a; box-shadow:0 0 8px #c9a35a;}
    .bst-status-dot.locked{background:#3a4547;}
    .bst-modal-body{padding:14px 20px 0; text-align:center;}
    .bst-modal-name{font-family:'Shippori Mincho',serif; font-size:20px; color:#c9a35a; margin-bottom:6px;}
    .bst-modal-desc{font-size:12px; color:#9c8f74; line-height:1.6; margin-bottom:14px;}
    .bst-curio{margin:0 18px 14px; background:rgba(62,201,214,.06); border:1px solid rgba(62,201,214,.3); border-radius:3px; padding:13px 15px;}
    .bst-curio-label{font-family:'Shippori Mincho',serif; font-size:11px; color:#3ec9d6; letter-spacing:.5px; margin-bottom:6px;}
    .bst-curio-text{font-size:12px; color:#c9bda0; line-height:1.6;}
    .bst-status{margin:14px 18px 20px; padding:13px; text-align:center; font-size:12px; border-radius:3px; border:1px solid rgba(62,201,214,.3);}
    .bst-status.found{color:#3ec9d6; border-color:#3ec9d6;}
    .bst-status.locked{color:#9c8f74;}
    .bst-dots{display:flex; justify-content:center; gap:7px; padding:9px 0 0;}
    .bst-dots span{width:7px; height:7px; border-radius:50%; background:#2a3a3d;}
    .bst-dots span.on{background:#3ec9d6; box-shadow:0 0 6px #3ec9d6;}
    .bst-swipe-hint{text-align:center; font-size:10.5px; color:#5d8a90; margin:-8px 0 10px; letter-spacing:.3px;}
    .bst-diamond[onclick]{cursor:pointer; padding:10px; box-sizing:content-box; background-clip:content-box;}
    .bst-modal.slide-left{animation:bstSlideL .28s ease;}
    .bst-modal.slide-right{animation:bstSlideR .28s ease;}
    @keyframes bstSlideL{from{transform:translateX(70px); opacity:0;} to{transform:none; opacity:1;}}
    @keyframes bstSlideR{from{transform:translateX(-70px); opacity:0;} to{transform:none; opacity:1;}}
    .bst-close{display:block; margin:0 auto 16px; background:none; border:none; color:#9c8f74; font-size:12px; padding:6px;}
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'bst-overlay';
  overlay.innerHTML = `
    <div class="bst-topbar" style="position:relative;">
      <button class="bst-close-btn" onclick="closeBestiary()">✕</button>
      <h2>Bestiário</h2>
      <div id="bst-header-stat">0 de 0 encontrados · 0%</div>
      <div class="bst-header-bar"><div id="bst-header-bar-fill"></div></div>
    </div>
    <div id="bst-chips"></div>
    <div id="bst-grid"></div>`;
  document.body.appendChild(overlay);

  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'bst-modal-overlay';
  modalOverlay.onclick = closeBstModal;
  // deslizar para o lado troca de forma (só vale pra entradas com `formas`)
  let tx = 0, ty = 0, tOk = false;
  modalOverlay.addEventListener('touchstart', e => {
    const t = e.touches[0]; tx = t.clientX; ty = t.clientY; tOk = e.touches.length === 1;
  }, { passive: true });
  modalOverlay.addEventListener('touchend', e => {
    if (!tOk) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - tx, dy = t.clientY - ty;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) bstTrocaForma(dx < 0 ? 1 : -1);
  }, { passive: true });
  document.body.appendChild(modalOverlay);
}

window.openBestiary = openBestiary;
window.closeBestiary = closeBestiary;
window.bstSetZone = bstSetZone;
window.bstShowDetail = bstShowDetail;
window.closeBstModal = closeBstModal;
window.bstImgFail = bstImgFail;
window.bstTrocaForma = bstTrocaForma;
window.Bestiary = Bestiary;

// ─── GANCHO AUTOMÁTICO — marca no Bestiário todo inimigo derrotado ────
// Sem isso o resto do arquivo funciona (a galeria abre certinho), mas
// nada nunca fica marcado como encontrado, porque nenhuma batalha do
// jogo chama Bestiary.markFound() sozinha.
//
// Em vez de editar cada masmorra uma por uma, a gente intercepta o
// endBattle() global, do mesmo jeito que multi_enemy_battle.js,
// dungeon_sombras.js e nulkhar.js já fazem — por isso este arquivo
// PRECISA continuar carregando logo depois do palDinh.js e ANTES de
// qualquer arquivo de masmorra no gat-1.html. Assim, quando a luta é
// contra um grupo (trio de Onibi, trio de Estátuas), o
// battleState.enemyData.id já foi trocado pro groupId certo pelo
// multi_enemy_battle.js antes de chegar aqui — e a gente marca só UMA
// vez, quando o grupo inteiro cai, não a cada membro.
if (typeof window.endBattle === 'function' && !window.endBattle._bstWrapped) {
  const _bstOrigEndBattle = window.endBattle;
  function _bstEndBattleHook(won, fled) {
    if (won && !fled) {
      try {
        const bs = (typeof battleState !== 'undefined') ? battleState : null;
        const id = bs && bs.enemyData && bs.enemyData.id;
        if (id) {
          Bestiary.learnFromEnemy(bs.enemyData);
          if (G._multiBattle && G._multiBattle.members) Bestiary.learnFromEnemy({ groupId: G._multiBattle.groupId, members: G._multiBattle.members });
          Bestiary.markFound(id);
        }
      } catch (e) {
        // nunca deixa um erro aqui travar o fim de uma batalha de verdade
        console.error('[Bestiário] falha ao marcar inimigo encontrado:', e);
      }
    }
    return _bstOrigEndBattle.apply(this, arguments);
  }
  _bstEndBattleHook._bstWrapped = true;
  window.endBattle = _bstEndBattleHook;
}

// Aprende a imagem de todo inimigo que entra em batalha (inclusive se o jogador
// perder ou fugir) — assim, entradas sem portrait definido ganham imagem sozinhas
// depois da próxima luta, com o caminho que o jogo realmente usa.
if (typeof window.startBattle === 'function' && !window.startBattle._bstWrapped) {
  const _bstOrigStartBattle = window.startBattle;
  const _bstStartBattleHook = function (enemy) {
    try { Bestiary.learnFromEnemy(enemy); } catch (e) {}
    return _bstOrigStartBattle.apply(this, arguments);
  };
  _bstStartBattleHook._bstWrapped = true;
  window.startBattle = _bstStartBattleHook;
}
