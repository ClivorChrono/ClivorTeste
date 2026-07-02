// =============================================================
//  KAPPA_DUNGEON.JS — Chronicles of Clivor
//  Masmorra do Kappa — Arquivo separado, sem opção de voltar
//  Depende de: palDinh.js (G, setScene, setStory, hideEnemy,
//              notify, addLog, updateHUD, addItem),
//              vilarejo.js (registerDungeon, storyNode_vilarejo)
// =============================================================

'use strict';

// ─────────────────────────────────────────────────────────────
//  REGISTRO NA TORRE DAS MASMORRAS
// ─────────────────────────────────────────────────────────────

(function _registerKappa() {
  function _doRegister() {
    if (typeof registerDungeon !== 'function') {
      setTimeout(_doRegister, 200); return;
    }
    registerDungeon({
      id:        'kappa',
      ordem:     2,
      nome:      'O Santuário Submerso de Kawatarō',
      bossNome:  'Kappa',
      bossIcon:  'Imagens/icones/kappi1.png',
      // descricao e status são avaliados dinamicamente no momento de exibir
      get descricao() {
        return (typeof G !== 'undefined' && G.dungeonTemploVazioCleared)
          ? 'Um vilarejo silencioso. Um deus aquático esquecido. E um velho que perdeu tudo em nome da fé.'
          : 'Complete a primeira masmorra para revelar este santuário.';
      },
      get status() {
        return (typeof G !== 'undefined' && G.dungeonTemploVazioCleared)
          ? 'ativa'
          : 'bloqueada';
      },
      stats: [
        { label: 'Dificuldade', value: '★★★★☆' },
        { label: 'Recompensa',  value: '3× Runa D' },
      ],
      entrar: storyNode_kappa_intro,
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _doRegister);
  } else {
    _doRegister();
  }
})();

// ─────────────────────────────────────────────────────────────
//  IA DO KARAKASA-OBAKE — registro seguro no ENEMY_AI
//  Aguarda o DOM estar pronto para garantir que ENEMY_AI existe
// ─────────────────────────────────────────────────────────────

(function _registerKarakasaAI() {
  function _doRegisterAI() {
    if (typeof ENEMY_AI === 'undefined') {
      setTimeout(_doRegisterAI, 200); return;
    }
    ENEMY_AI['karakasa_obake'] = {
      name: 'parasita',
      specialName: 'Golpe do Guarda-Chuva',
      specialIcon: '☂️',
      specialDesc: 'Ignora 100% da DEF! O dano causado cura o Karakasa-obake.',
      special(bs, p, e) {
        // Ignora DEF: dano puro baseado só no ATQ
        const dano = Math.max(1, Math.floor(e.atk * 1.3 + Math.random() * 6));
        p.hp = Math.max(0, p.hp - dano);
        // Cura 100% do dano causado
        bs.enemyHp = Math.min(bs.enemyMaxHp, bs.enemyHp + dano);
        if (typeof appendBattleLog === 'function') {
          appendBattleLog(`☂️ Golpe do Guarda-Chuva! Ignora DEF! -${dano} HP! Karakasa se cura +${dano}!`, '#6080c0');
        }
        if (typeof showFloatingNumber === 'function') {
          showFloatingNumber('hero', dano, 'dmg');
          showFloatingNumber('enemy', dano, 'heal');
        }
        if (typeof flashDamage === 'function') flashDamage('hero');
        if (typeof updateHUD === 'function') updateHUD();
        if (typeof updateBattleHUD === 'function') updateBattleHUD();
      }
    };
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _doRegisterAI);
  } else {
    _doRegisterAI();
  }
})();

// ─────────────────────────────────────────────────────────────
//  INTRODUÇÃO — Velho senhor na entrada do vilarejo abandonado
// ─────────────────────────────────────────────────────────────

function storyNode_kappa_intro() {
  // Verificar chave do vazio
  const inv = G.player.inventory || [];
  const chaveItem = inv.find(i => i.id === 'chave_vazio' && (i.qty || 1) > 0);
  if (!chaveItem) {
    notify('🔒 Você precisa de 1× Chave do Vazio para entrar nesta masmorra!', 'red');
    if (typeof storyNode_vilarejo === 'function') storyNode_vilarejo();
    return;
  }
  // Consumir a chave
  chaveItem.qty = (chaveItem.qty || 1) - 1;
  if (chaveItem.qty <= 0) {
    G.player.inventory = inv.filter(i => i !== chaveItem);
  }
  notify('🗝️ Chave do Vazio consumida. Entrando no Santuário...', 'gold');

  setScene('kappa-k1');
  hideEnemy();
  setStory(
    'DESCONHECIDO',
    `O silêncio do vilarejo abandonado pesa como pedra úmida. Casas vazias, janelas abertas para o nada — e nenhum som além do vento.\n\nUm velho senhor espera junto à entrada. Ele te observa por alguns instantes antes de falar, como se estivesse medindo algo em você.\n\n"Eu sempre adorei o todo-poderoso Kappa... Mas minha fé nunca foi suficiente. Como punição, ele tirou tudo de mim."\n\nCom um olhar triste, ele aponta para uma antiga estátua coberta por musgos ao lado do caminho.\n\n"Se deseja receber uma bênção do Kappa, deverá oferecer um pepino à sua estátua. Apenas aqueles considerados dignos podem seguir adiante."`,
    [
      { icon:'🥒', text:'Escutar em silêncio', action: storyNode_kappa_intro_nome },
    ],
    'Imagens/personagens/K01.png'
  );
}

// ─────────────────────────────────────────────────────────────
//  INTRODUÇÃO — O velho se apresenta
// ─────────────────────────────────────────────────────────────

function storyNode_kappa_intro_nome() {
  setScene('kappa-k1');
  hideEnemy();
  setStory(
    'DESCONHECIDO',
    `O velho olha para a estátua por um longo momento. Seus dedos tocam levemente o cinto, onde uma velha bolsa de couro pende vazia.\n\nDepois, finalmente, ele se vira para você e inclina a cabeça.`,
    [
      { icon:'▶', text:'Continuar', action: storyNode_kappa_intro_continua },
    ],
    'Imagens/personagens/K01.png'
  );
}

function storyNode_kappa_intro_continua() {
  setScene('kappa-k1');
  hideEnemy();
  setStory(
    'HIDEO',
    `"Me chamo Hideo. Fui o último habitante deste vilarejo — e o único que ficou depois que o Kappa levou os demais."\n\nEle não parece com raiva. Apenas... vazio.\n\n"Entre, viajante. O Kappa está esperando por alguém digno há muito tempo. Talvez seja você."`,
    [
      { icon:'🗝️', text:'Entrar na masmorra', action: storyNode_kappa_fase1 },
    ],
    'Imagens/personagens/K01.png'
  );
}

// ─────────────────────────────────────────────────────────────
//  FASE 1 — Ikki, Guardião da Harmonia
// ─────────────────────────────────────────────────────────────

// Mapa: classe → { stat, label, apply }
const IKKI_BENCAO = {
  mago:      { stat: 'mag', label: 'MAG+10', apply: p => { p.mag = (p.mag || 0) + 10; } },
  paladino:  { stat: 'def', label: 'DEF+10', apply: p => { p.def = (p.def || 0) + 10; } },
  monge:     { stat: 'atk', label: 'ATQ+10', apply: p => { p.atk = (p.atk || 0) + 10; } },
  assassino: { stat: 'atk', label: 'ATQ+10', apply: p => { p.atk = (p.atk || 0) + 10; } },
  arqueiro:  { stat: 'atk', label: 'ATQ+10', apply: p => { p.atk = (p.atk || 0) + 10; } },
  guerreiro: { stat: 'atk', label: 'ATQ+10', apply: p => { p.atk = (p.atk || 0) + 10; } },
};

function storyNode_kappa_fase1() {
  setScene('kappa-k1');
  hideEnemy();
  setStory(
    'IKKI',
    `Você atravessa o portal de pedra coberto de musgo.\n\nDentro, uma figura serena aguarda de joelhos diante de uma pequena fonte. Ele se levanta devagar ao ouvir seus passos.\n\n"Ikki — Guardião da Harmonia."\n\nSeus olhos te observam com atenção, como se lessem algo que você mesmo não sabe que carrega.\n\n"Sinto uma grande determinação no seu coração. Se realmente pretende enfrentar o mal que habita esta masmorra... permita-me ajudá-lo."`,
    [
      { icon:'🎶', text:'Aceitar a ajuda de Ikki', action: storyNode_kappa_bencao_ikki },
    ],
    'Imagens/personagens/K01.png'
  );
}

function storyNode_kappa_bencao_ikki() {
  setScene('kappa-k1');
  hideEnemy();

  // Aplica bênção uma única vez por run
  if (!G.kappa) G.kappa = {};
  if (!G.kappa.bencaoIkki) {
    G.kappa.bencaoIkki = true;
    const cls  = G.player.class || 'guerreiro';
    const benc = IKKI_BENCAO[cls] || IKKI_BENCAO['guerreiro'];
    benc.apply(G.player);
    updateHUD();
    notify(`🎶 Bênção de Ikki: ${benc.label}!`, 'gold');
    addLog(`Bênção de Ikki recebida: ${benc.label}.`, 'loot');
  }

  const cls  = G.player.class || 'guerreiro';
  const benc = IKKI_BENCAO[cls] || IKKI_BENCAO['guerreiro'];

  setStory(
    'IKKI',
    `Ikki começa a tocar uma melodia serena com os dedos sobre a superfície da fonte. A música ecoa por todo o vilarejo, envolvendo você em uma energia acolhedora.\n\nVocê sente seu corpo responder ao som.\n\n✦ Bênção de Ikki concedida: ${benc.label}\n\n"Que essa harmonia te guie adiante, viajante."`,
    [
      { icon:'▶', text:'Seguir em frente', action: storyNode_kappa_fase2 },
    ],
    'Imagens/personagens/K01.png'
  );
}

// ─────────────────────────────────────────────────────────────
//  FASE 2 — Caverna. O pequeno demônio ataca de surpresa
// ─────────────────────────────────────────────────────────────

function storyNode_kappa_fase2() {
  setScene('kappa-caverna');
  hideEnemy();
  setStory(
    'NARRADOR',
    `Ao atravessar a entrada da caverna, o ambiente torna-se frio e úmido.\n\nO som constante de gotas caindo das pedras ecoa pelos corredores escuros.\n\nTudo parece calmo...`,
    [
      { icon:'▶', text:'Avançar', action: storyNode_kappa_fase2_ataque },
    ]
  );
}

function storyNode_kappa_fase2_ataque() {
  setScene('kappa-caverna');
  hideEnemy();

  // Dano surpresa de 40 HP
  const dano = 40;
  G.player.hp = Math.max(0, G.player.hp - dano);
  updateHUD();
  notify(`💥 Ataque surpresa! −${dano} HP!`, 'red');
  addLog(`Pequeno Demônio atacou de surpresa: −${dano} HP.`, 'dmg');

  setStory(
    'NARRADOR',
    `Até que um pequeno demônio salta das sombras.\n\nSua aparência parece inofensiva. Ele segura um velho guarda-chuva e sorri de forma assustadora.\n\nSem dar qualquer chance de reação... ele ataca primeiro.\n\nA ponta afiada do guarda-chuva atravessa sua defesa.\n\n💥 Você perdeu ${dano} HP!`,
    [
      { icon:'⚔️', text:'Reagir ao ataque', action: storyNode_kappa_fase3 },
    ]
  );
}

// ─────────────────────────────────────────────────────────────
//  DADOS DO KARAKASA-OBAKE
// ─────────────────────────────────────────────────────────────

function _karakasaData() {
  return {
    id:       'karakasa_obake',
    name:     'Karakasa-obake',
    icon:     '☂️',
    img:      'Imagens/personagens/osake.png',
    elemento: 'sombra',
    hp:       300,
    atk:      22,
    def:      0,
    xp:       0,
    gold:     0,
    isBoss:   false,
    desc:     'Um demônio guarda-chuva de aparência inofensiva. Ignora defesas e se cura com cada golpe.',
    loot:     [],
  };
}

// ─────────────────────────────────────────────────────────────
//  FASE 3 — Primeira batalha com o Karakasa-obake
// ─────────────────────────────────────────────────────────────

function storyNode_kappa_fase3() {
  setScene('kappa-caverna');
  hideEnemy();

  if (!G.kappa) G.kappa = {};
  G.kappa.karakasaOndas = 0; // reinicia contador de ondas

  G.location = 'dungeon-kappa';

  setStory(
    'NARRADOR',
    `Você se recompõe. O demônio sorri, girando o guarda-chuva entre os dedos com uma agilidade inquietante.\n\nSem dar mais tempo para reagir... ele avança.`,
    [
      { icon:'⚔️', text:'Lutar!', action: _kappa_iniciarBatalhaKarakasa },
    ]
  );
}

function _kappa_iniciarBatalhaKarakasa() {
  const inimigo = _karakasaData();

  // Ataque de iniciativa APENAS na primeira onda
  if (G.kappa.karakasaOndas === 0) {
    const ataqueInicial = 15;
    G.player.hp = Math.max(1, G.player.hp - ataqueInicial);
    updateHUD();
    notify(`☂️ Karakasa ataca primeiro! −${ataqueInicial} HP!`, 'red');
    addLog(`Karakasa-obake: ataque de iniciativa −${ataqueInicial} HP.`, 'dmg');
  }

  // Callback de vitória: verifica quantas ondas já passaram
  G._dungeonBattleCallback = function() {
    G.kappa.karakasaOndas = (G.kappa.karakasaOndas || 0) + 1;

    if (G.kappa.karakasaOndas < 4) {
      storyNode_kappa_karakasa_onda();
    } else {
      storyNode_kappa_pos_karakasa();
    }
  };

  startBattle(inimigo);
}

// ─────────────────────────────────────────────────────────────
//  ONDAS 2, 3 e 4 — Outros três Karakasas surgem das sombras
// ─────────────────────────────────────────────────────────────

function storyNode_kappa_karakasa_onda() {
  setScene('kappa-caverna');
  hideEnemy();

  const onda = (G.kappa.karakasaOndas || 1) + 1; // exibe 2, 3 ou 4

  setStory(
    'NARRADOR',
    `O Karakasa-obake cai.\n\nMas antes que o silêncio se instale... outros três surgem das sombras, seus guarda-chuvas girando em sincronia.\n\nEles precisam ser derrotados.`,
    [
      { icon:'⚔️', text:`Enfrentar o Karakasa ${onda}/4`, action: _kappa_iniciarBatalhaKarakasa },
    ]
  );
}

// ─────────────────────────────────────────────────────────────
//  PÓS-BATALHA — Silêncio, palavras de Ikki e descida
// ─────────────────────────────────────────────────────────────

function storyNode_kappa_pos_karakasa() {
  setScene('kappa-caverna');
  hideEnemy();
  G.location = 'dungeon-kappa';

  setStory(
    'NARRADOR',
    `O último Karakasa-obake se desfaz em névoa.\n\nO silêncio retorna à caverna.`,
    [
      { icon:'▶', text:'Continuar', action: storyNode_kappa_palavras_ikki },
    ]
  );
}

function storyNode_kappa_palavras_ikki() {
  setScene('kappa-caverna');
  hideEnemy();
  setStory(
    'IKKI',
    `Naquele instante, as palavras de Ikki ecoam em sua mente.\n\n"Nem todos os demônios que encontrará são reais... Alguns são apenas ilusões criadas pelo Kappa para testar aqueles que ousam invadir seu domínio."`,
    [
      { icon:'▶', text:'Seguir em frente', action: storyNode_kappa_descida },
    ]
  );
}

function storyNode_kappa_descida() {
  setScene('kappa-caverna');
  hideEnemy();
  setStory(
    'NARRADOR',
    `Com essas palavras ecoando em sua mente, você continua descendo pelas antigas escadarias de pedra.\n\nQuanto mais desce... mais frio o ambiente se torna.\n\nUma música misteriosa começa a ecoar pelas profundezas da caverna.\n\nCada passo parece aproximá-lo de algo gigantesco.\n\nA iluminação desaparece lentamente. Apenas o reflexo da água nas paredes ilumina o caminho.`,
    [
      { icon:'▶', text:'Avançar', action: storyNode_kappa_guardian },
    ]
  );
}

function storyNode_kappa_guardian() {
  setScene('kappa-caverna');
  hideEnemy();
  setStory(
    'NARRADOR',
    `Ao avançar mais alguns metros...\n\nUma enorme criatura bloqueia completamente a passagem.\n\nEla permanece imóvel. Como se estivesse esperando justamente pela chegada do viajante.\n\nO verdadeiro guardião daquela caverna finalmente revela sua presença...`,
    [
      { icon:'▶', text:'Avançar', action: storyNode_kappa_fase2_boss },
    ]
  );
}

// ─────────────────────────────────────────────────────────────
//  FASE 2 — O Guardião das Águas: Ooni Blindado
// ─────────────────────────────────────────────────────────────

function storyNode_kappa_fase2_boss() {
  setScene('kappa-k2');
  hideEnemy();
  setStory(
    'NARRADOR',
    `Ao descer a longa escadaria de pedra, a temperatura da caverna cai drasticamente.\n\nO som de água escorrendo pelas paredes ecoa por todos os lados.\n\nUma melodia misteriosa começa a preencher o ambiente.\n\nNão parece ser apenas uma música... É como se alguém estivesse observando cada passo do viajante.\n\nVocê continua avançando lentamente, tentando enxergar através da escuridão.\n\nO brilho refletido pelas águas revela uma enorme silhueta parada no centro da caverna.`,
    [
      { icon:'▶', text:'Aproximar', action: storyNode_kappa_fase2_boss_conteudo },
    ]
  );
}

function storyNode_kappa_fase2_boss_conteudo() {
  setScene('kappa-k2');
  hideEnemy();
  setStory(
    'NARRADOR',
    `Quando se aproxima o suficiente...\n\nA criatura ergue lentamente sua gigantesca clava.\n\nO caminho está completamente bloqueado.\n\nO guardião do Kappa finalmente mostra sua verdadeira forma.`,
    [
      { icon:'⚔️', text:'Enfrentar o guardião', action: _kappa_iniciarBatalhaOoni },
    ],
    'Imagens/personagens/ooni.png'
  );
}

// ─────────────────────────────────────────────────────────────
//  DADOS DO OONI BLINDADO
// ─────────────────────────────────────────────────────────────

function _ooniData() {
  return {
    id:              'ooni_blindado',
    name:            'Ooni Blindado',
    icon:            '👹',
    img:             'Imagens/personagens/ooni.png',
    elemento:        'terra',
    hp:              3500,
    atk:             100,
    def:             80,
    _ignoraDefBasico: true,
    _immuneControl:   true,
    xp:              120,
    gold:            60,
    isBoss:          true,
    dificuldade:     '⭐⭐⭐⭐☆',
    desc:            '"Poucos atravessam o caminho do Ooni Blindado e permanecem vivos para contar a história. Ele não protege tesouros. Não protege terras. Protege apenas a vontade do Kappa."',
    loot: [
      { id:'fragmento_de_sombra', name:'Fragmento de Sombra', icon:'🌑', qty:1,
        imgSrc:'Imagens/itens/fragmento_sombra.png' },
    ],
  };
}

function _guardiaoKappaData() {
  return {
    id:              'guardiao_kappa',
    name:            'Guardião do Kappa',
    icon:            '👹',
    img:             'Imagens/personagens/ooni.png',
    elemento:        'agua',
    hp:              4000,
    atk:             110,
    def:             20,
    _ignoraDefBasico: true,   // Clava Brutal: ataque normal ignora 100% da DEF
    _immuneControl:   true,   // Armadura Natural: resistente a efeitos de controle e imune a Empurrão
    gold:            200,
    isBoss:          true,
    desc:            'Um demônio colossal coberto por armadura natural de espinhos, conchas, algas e pedras das profundezas. Sua força é mais assustadora que uma muralha.',
    loot: [
      { id:'runa_d_mat', name:'Runa D', icon:'💎', qty:1,
        imgSrc:'Imagens/itens/runa_d.png', _isRunaMaterial: 'D' },
      { id:'fragmento_de_sombra', name:'Fragmento de Sombra', icon:'🌑', qty:2,
        imgSrc:'Imagens/itens/fragmento_sombra.png' },
    ],
  };
}

// ─────────────────────────────────────────────────────────────
//  BATALHA DO OONI
// ─────────────────────────────────────────────────────────────

function _kappa_iniciarBatalhaOoni() {
  if (!G.kappa) G.kappa = {};
  G.location = 'dungeon-kappa';

  G._dungeonBattleCallback = function() {
    storyNode_kappa_pos_ooni();
  };

  startBattle(_ooniData());
}

// ─────────────────────────────────────────────────────────────
//  PÓS-BATALHA OONI
// ─────────────────────────────────────────────────────────────

function storyNode_kappa_pos_ooni() {
  setScene('kappa-k2');
  hideEnemy();
  G.location = 'dungeon-kappa';

  setStory(
    'NARRADOR',
    `Após uma longa batalha, o enorme guardião finalmente cai de joelhos.\n\nSua armadura começa a se desfazer lentamente.\n\nAs águas da caverna, antes agitadas pela violência da luta, voltam a ficar calmas.\n\nPor alguns segundos...\n\nO silêncio domina completamente o ambiente.\n\n【 Ooni Blindado Derrotado 】\n\nVocê obteve:\n【 Amuleto Inoo 】`,
    [
      { icon:'▶', text:'Continuar', action: storyNode_kappa_sereia_surge },
    ]
  );
}

// ─────────────────────────────────────────────────────────────
//  FASE 2.5 — A Sereia das Profundezas
// ─────────────────────────────────────────────────────────────

function storyNode_kappa_sereia_surge() {
  setScene('kappa-k2');
  hideEnemy();
  setStory(
    'NARRADOR',
    `Enquanto observa o corpo do Ooni desaparecer lentamente nas águas...\n\nUm grito aterrorizante ecoa por toda a caverna.\n\nLogo em seguida...\n\nUm misterioso canto de sereia começa a preencher o ambiente.\n\nA água ao redor passa a vibrar intensamente.\n\nUma energia gigantesca atravessa o corpo do viajante.\n\nA sensação é sufocante.\n\nComo se toda a caverna estivesse viva.`,
    [
      { icon:'▶', text:'Olhar ao redor', action: storyNode_kappa_sereia_aparece },
    ]
  );
}

function storyNode_kappa_sereia_aparece() {
  setScene('kappa-k2');
  hideEnemy();
  setStory(
    'NARRADOR',
    `Então...\n\nEla surge.\n\nSeus olhos encontram imediatamente o local onde o Ooni foi derrotado.\n\nPor um breve instante, o silêncio retorna.\n\nMas logo seu olhar muda completamente.\n\nA tristeza transforma-se em fúria.\n\nSem dizer uma única palavra...\n\nEla decide vingar seu companheiro.\n\nDesta vez...\n\nNão existe conversa.\n\nA batalha começa imediatamente.`,
    [
      { icon:'⚔️', text:'Enfrentar a Sereia', action: _kappa_iniciarBatalhaSereia },
    ],
    'Imagens/personagens/sereia.png'
  );
}

function _sereiaKappaData() {
  return {
    id:              'sereia_kappa',
    name:            'Sereia das Profundezas',
    icon:            '🧜',
    img:             'Imagens/personagens/sereia.png',
    elemento:        'agua',
    hp:              2500,
    atk:             110,
    def:             50,
    _immuneControl:  false,
    xp:              180,
    gold:            80,
    isBoss:          true,
    desc:            'Guardiã das águas profundas. Seu canto drena a força dos intrusos enquanto a proteção das águas a mantém intocável.',
    loot: [
      { id:'escama_sereia', name:'Escama de Sereia', icon:'🐟', qty:1,
        imgSrc:'Imagens/itens/escama_sereia.png',
        chance: 1.0, weight: 0.2, type: 'material',
        desc: 'Escama iridescente de uma sereia das profundezas. Pulsa com energia aquática.' },
    ],
  };
}

function _kappa_iniciarBatalhaSereia() {
  if (!G.kappa) G.kappa = {};
  G.location = 'dungeon-kappa';

  G._dungeonBattleCallback = function() {
    storyNode_kappa_pos_sereia();
  };

  startBattle(_sereiaKappaData());
}

function storyNode_kappa_pos_sereia() {
  setScene('kappa-k2');
  hideEnemy();
  G.location = 'dungeon-kappa';

  setStory(
    'NARRADOR',
    `O canto abissal finalmente silencia.\n\nA sereia pousa lentamente na superfície da água, seus olhos fechando devagar.\n\nAs águas voltam a ficar calmas — desta vez, de verdade.\n\nComo se a própria caverna estivesse de luto.\n\nO caminho à frente está livre.`,
    [
      { icon:'▶', text:'Avançar', action: storyNode_kappa_fase3_intro },
    ]
  );
}

// ─────────────────────────────────────────────────────────────
//  TRANSIÇÃO — Introdução à Fase 3
// ─────────────────────────────────────────────────────────────

function storyNode_kappa_fase3_intro() {
  setScene('kappa-k2');
  hideEnemy();
  setStory(
    'IKKI',
    `As palavras de Ikki ecoam em sua mente.\n\n"Você superou o guardião... Mas o Kappa ainda não foi encontrado. As profundezas guardam segredos ainda mais sombrios."\n\n"Avance com cuidado. O que vem a seguir não é apenas força bruta."`,
    [
      { icon:'▶', text:'Descer mais fundo', action: storyNode_kappa_boss_final_intro },
    ]
  );
}

// ─────────────────────────────────────────────────────────────
//  BOSS FINAL — O Kappa
// ─────────────────────────────────────────────────────────────

function storyNode_kappa_boss_final_intro() {
  setScene('kappa-k3');
  hideEnemy();
  setStory(
    'NARRADOR',
    `As escadarias terminam.\n\nUma câmara diferente de tudo que você viu até agora.\n\nA água cobre o chão inteiro como um espelho perfeito.\n\nNo centro, sentado sobre uma pedra coberta de musgo... ele está lá.\n\nO Kappa.\n\nMenor do que o esperado. Mas sua presença preenche cada centímetro da sala.\n\nEle te olha com calma. Como se soubesse exatamente o que você é, de onde veio, e o que carrega.`,
    [
      { icon:'▶', text:'Aproximar', action: storyNode_kappa_encontro },
    ],
    'Imagens/personagens/kappa.png'
  );
}

function storyNode_kappa_encontro() {
  setScene('kappa-k3');
  hideEnemy();
  setStory(
    'NARRADOR',
    `Você se aproxima devagar.\n\nO Kappa não se move. Apenas observa.\n\nSeus olhos — fundos como poços — seguem cada um dos seus passos.\n\nUm silêncio absoluto domina a câmara.\n\nVocê se lembra do que Hideo disse lá fora...\n\n"Ofereça um pepino. Apenas aqueles considerados dignos podem receber uma bênção."`,
    [
      { icon:'🥒', text:'Oferecer o pepino como oferenda', action: storyNode_kappa_oferenda },
    ],
    'Imagens/personagens/kappa.png'
  );
}

function storyNode_kappa_oferenda() {
  setScene('kappa-k3');
  hideEnemy();
  setStory(
    'NARRADOR',
    `Com cuidado, você retira o pepino da bolsa e estende em direção ao Kappa.\n\nEle olha para o pepino.\n\nDepois para você.\n\nDepois para o pepino novamente.\n\nPor um instante... parece que vai aceitar.`,
    [
      { icon:'▶', text:'Aguardar a resposta do Kappa', action: storyNode_kappa_traicao },
    ],
    'Imagens/personagens/kappa.png'
  );
}

function storyNode_kappa_traicao() {
  setScene('kappa-k3');
  hideEnemy();
  setStory(
    'NARRADOR',
    `O Kappa pega o pepino.\n\nMorde.\n\nMasca devagar.\n\nE então...\n\nSe levanta de um salto.\n\nSeu olhar muda completamente.\n\nIsso não era uma bênção.\n\nEra uma armadilha.\n\nEle sabe exatamente que você invadiu o seu território.\n\nE não perdoa.`,
    [
      { icon:'⚔️', text:'Lutar contra o Kappa!', action: storyNode_kappa_batalha_final },
    ],
    'Imagens/personagens/kappa.png'
  );
}

// ─────────────────────────────────────────────────────────────
//  DADOS E BATALHA DO KAPPA
// ─────────────────────────────────────────────────────────────

function _kappaData() {
  return {
    id:              'kappa_lider',
    name:            'Kappa — Líder Supremo',
    icon:            '🐢',
    img:             'Imagens/personagens/kappa.png',
    elemento:        'agua',
    hp:              5500,
    atk:             150,
    def:             150,
    spd:             50,
    crit:            100,       // crítico base (dobra progressivamente)
    _ignoraDefBasico: false,
    _immuneControl:  true,
    _kappaVelocidade: true,
    xp:              800,
    gold:            350,
    isBoss:          true,
    desc:            'O Líder Supremo da Masmorra. Sumo pesado com velocidade absurda — e quanto mais sangra, mais crítico causa.',
    loot: [
      { id:'runa_d_mat', name:'Runa D', icon:'💎', qty:1,
        imgSrc:'Imagens/itens/runa_d.png', chance: 1.0, _isRunaMaterial: 'D' },
      { id:'prato_kappa', name:'Prato do Kappa', icon:'🥣', qty:1,
        imgSrc:'Imagens/icones/materiais/Inoo.png', chance: 1.0,
        weight: 0.1, type: 'equipamento', equipSlot: 'acessorio',
        atk: 20, spd: 15,
        _critBonus: 0.12,
        _prataKappaPassiva: true,
        _prataKappaLendario: true,
        desc: 'O prato de água sagrada da cabeça do Kappa.\n+20 ATQ | +12% Crítico | +15 VEL\nPassiva: Após sofrer Dano Verdadeiro, o próximo ataque seu causa 40% a mais de dano.\nEfeito Lendário (1x/batalha): Ao cair abaixo de 20% HP, recupera 200 HP instantaneamente.' },
    ],
  };
}

function storyNode_kappa_batalha_final() {
  if (!G.kappa) G.kappa = {};
  G.location = 'dungeon-kappa';

  G._dungeonBattleCallback = function() {
    storyNode_kappa_vitoria();
  };

  startBattle(_kappaData());
}

// ─────────────────────────────────────────────────────────────
//  VITÓRIA — Kappa derrotado
// ─────────────────────────────────────────────────────────────

function storyNode_kappa_vitoria() {
  setScene('kappa-k3');
  hideEnemy();
  G.location = 'dungeon-kappa';
  G.dungeonKappaCleared = true;
  saveGame();

  setStory(
    'NARRADOR',
    `O Kappa tropeça para trás.\n\nCai sentado na água rasa, levantando uma onda que apaga as últimas tochas da câmara.\n\nPor um instante, escuridão total.\n\nDepois, uma luz azul suave emerge do centro do lago — emanando do próprio corpo do Kappa.\n\nEle te olha em silêncio.\n\nNão com raiva.\n\nCom algo que parece... respeito.`,
    [
      { icon:'🏆', text:'Receber recompensa', action: storyNode_kappa_recompensa },
    ]
  );
}

function storyNode_kappa_recompensa() {
  setScene('kappa-k3');
  hideEnemy();

  // Recompensa: 3× Runa D como material de fusão
  if (typeof addRunaMaterial === 'function') {
    addRunaMaterial('D', 3);
  }
  saveGame();

  setStory(
    'HIDEO',
    `Hideo aparece lentamente na entrada da câmara.\n\nSeus olhos marejam ao ver o Kappa sentado, derrotado mas vivo.\n\n"Você fez algo que ninguém mais conseguiu..."\n\nEle coloca três runas frias em sua mão — cada uma gravada com o símbolo das profundezas.\n\n"O Kappa finalmente reconheceu alguém como digno. Isso não acontecia há gerações."\n\nUm leve sorriso — o primeiro desde que você o conheceu.\n\n"Leve isso. São Runas D — o material bruto do qual toda grandeza começa. Use-as com sabedoria na ferraria."`,
    [
      { icon:'💎', text:'Receber as 3× Runa D e partir', action: storyNode_kappa_fim },
    ],
    'Imagens/personagens/K01.png'
  );
}

function storyNode_kappa_fim() {
  setScene('kappa-k1');
  hideEnemy();
  notify('💎 3× Runa D obtidas! Masmorra do Kappa concluída!', 'gold');
  setStory(
    'NARRADOR',
    `Você sobe as escadarias de pedra.\n\nO Santuário Submerso de Kawatarō fica para trás.\n\nHideo acena lentamente da entrada.\n\nO canto das águas ainda ecoa em sua mente — desta vez, em paz.`,
    [
      { icon:'🏠', text:'Retornar ao vilarejo', action: () => { if (typeof storyNode_vilarejo === 'function') storyNode_vilarejo(); } },
    ]
  );
}



// ── Re-registro dinâmico: chamado ao abrir a Torre para refletir status atual ──
(function _setupKappaReregister() {
  function _doReregister() {
    if (typeof registerDungeon !== 'function') return;
    const _kappaBloqueada = !(typeof G !== 'undefined' && G.dungeonTemploVazioCleared);
    registerDungeon({
      id:        'kappa',
      ordem:     2,
      nome:      'O Santuário Submerso de Kawatarō',
      bossNome:  'Kappa',
      bossIcon:  'Imagens/icones/kappi1.png',
      descricao: _kappaBloqueada
        ? 'Complete a primeira masmorra para revelar este santuário.'
        : 'Um vilarejo silencioso. Um deus aquático esquecido. E um velho que perdeu tudo em nome da fé.',
      status:    _kappaBloqueada ? 'bloqueada' : 'ativa',
      stats: [
        { label: 'Dificuldade', value: '★★★★☆' },
        { label: 'Recompensa',  value: '3× Runa D' },
      ],
      entrar: storyNode_kappa_intro,
    });
  }
  const _prev = window._reregisterDungeons;
  window._reregisterDungeons = function() {
    if (typeof _prev === 'function') _prev();
    _doReregister();
  };
})();
window.storyNode_kappa_intro_nome         = storyNode_kappa_intro_nome;
window.storyNode_kappa_intro_continua     = storyNode_kappa_intro_continua;
window.storyNode_kappa_fase1              = storyNode_kappa_fase1;
window.storyNode_kappa_bencao_ikki        = storyNode_kappa_bencao_ikki;
window.storyNode_kappa_fase2              = storyNode_kappa_fase2;
window.storyNode_kappa_fase2_ataque       = storyNode_kappa_fase2_ataque;
window.storyNode_kappa_fase3              = storyNode_kappa_fase3;
window.storyNode_kappa_karakasa_onda      = storyNode_kappa_karakasa_onda;
window.storyNode_kappa_pos_karakasa       = storyNode_kappa_pos_karakasa;
window.storyNode_kappa_palavras_ikki      = storyNode_kappa_palavras_ikki;
window.storyNode_kappa_descida            = storyNode_kappa_descida;
window.storyNode_kappa_guardian           = storyNode_kappa_guardian;
window.storyNode_kappa_fase2_boss         = storyNode_kappa_fase2_boss;
window.storyNode_kappa_fase2_boss_conteudo = storyNode_kappa_fase2_boss_conteudo;
window._kappa_iniciarBatalhaOoni           = _kappa_iniciarBatalhaOoni;
window.storyNode_kappa_pos_ooni            = storyNode_kappa_pos_ooni;
window.storyNode_kappa_sereia_surge        = storyNode_kappa_sereia_surge;
window.storyNode_kappa_sereia_aparece      = storyNode_kappa_sereia_aparece;
window._kappa_iniciarBatalhaSereia         = _kappa_iniciarBatalhaSereia;
window.storyNode_kappa_pos_sereia          = storyNode_kappa_pos_sereia;
window.storyNode_kappa_fase3_intro         = storyNode_kappa_fase3_intro;
window.storyNode_kappa_boss_final_intro    = storyNode_kappa_boss_final_intro;
window.storyNode_kappa_encontro            = storyNode_kappa_encontro;
window.storyNode_kappa_oferenda            = storyNode_kappa_oferenda;
window.storyNode_kappa_traicao             = storyNode_kappa_traicao;
window.storyNode_kappa_batalha_final       = storyNode_kappa_batalha_final;
window.storyNode_kappa_vitoria             = storyNode_kappa_vitoria;
window.storyNode_kappa_recompensa          = storyNode_kappa_recompensa;
window.storyNode_kappa_fim                 = storyNode_kappa_fim;
