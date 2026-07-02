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
      bossIcon:  'imagens/icones/kappi1.png',
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
        { label: 'Dificuldade', value: '★★☆☆☆' },
        { label: 'Recompensa',  value: 'Runa S' },
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
  setScene('imagens/KappaMasmorra/k1.png');
  hideEnemy();
  setStory(
    'DESCONHECIDO',
    `O silêncio do vilarejo abandonado pesa como pedra úmida. Casas vazias, janelas abertas para o nada — e nenhum som além do vento.\n\nUm velho senhor espera junto à entrada. Ele te observa por alguns instantes antes de falar, como se estivesse medindo algo em você.\n\n"Eu sempre adorei o todo-poderoso Kappa... Mas minha fé nunca foi suficiente. Como punição, ele tirou tudo de mim."\n\nCom um olhar triste, ele aponta para uma antiga estátua coberta por musgos ao lado do caminho.\n\n"Se deseja receber uma bênção do Kappa, deverá oferecer um pepino à sua estátua. Apenas aqueles considerados dignos podem seguir adiante."`,
    [
      { icon:'🥒', text:'Escutar em silêncio', action: storyNode_kappa_intro_nome },
    ],
    'imagens/personagens/K01.png'
  );
}

// ─────────────────────────────────────────────────────────────
//  INTRODUÇÃO — O velho se apresenta
// ─────────────────────────────────────────────────────────────

function storyNode_kappa_intro_nome() {
  setScene('imagens/KappaMasmorra/k1.png');
  hideEnemy();
  setStory(
    'DESCONHECIDO',
    `O velho olha para a estátua por um longo momento. Seus dedos tocam levemente o cinto, onde uma velha bolsa de couro pende vazia.\n\nDepois, finalmente, ele se vira para você e inclina a cabeça.`,
    [
      { icon:'▶', text:'Continuar', action: storyNode_kappa_intro_continua },
    ],
    'imagens/personagens/K01.png'
  );
}

function storyNode_kappa_intro_continua() {
  setScene('imagens/KappaMasmorra/k1.png');
  hideEnemy();
  setStory(
    'HIDEO',
    `"Me chamo Hideo. Fui o último habitante deste vilarejo — e o único que ficou depois que o Kappa levou os demais."\n\nEle não parece com raiva. Apenas... vazio.\n\n"Entre, viajante. O Kappa está esperando por alguém digno há muito tempo. Talvez seja você."`,
    [
      { icon:'🗝️', text:'Entrar na masmorra', action: storyNode_kappa_fase1 },
    ],
    'imagens/personagens/K01.png'
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
  setScene('imagens/KappaMasmorra/k1.png');
  hideEnemy();
  setStory(
    'IKKI',
    `Você atravessa o portal de pedra coberto de musgo.\n\nDentro, uma figura serena aguarda de joelhos diante de uma pequena fonte. Ele se levanta devagar ao ouvir seus passos.\n\n"Ikki — Guardião da Harmonia."\n\nSeus olhos te observam com atenção, como se lessem algo que você mesmo não sabe que carrega.\n\n"Sinto uma grande determinação no seu coração. Se realmente pretende enfrentar o mal que habita esta masmorra... permita-me ajudá-lo."`,
    [
      { icon:'🎶', text:'Aceitar a ajuda de Ikki', action: storyNode_kappa_bencao_ikki },
    ],
    'imagens/personagens/K01.png'
  );
}

function storyNode_kappa_bencao_ikki() {
  setScene('imagens/KappaMasmorra/k1.png');
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
    'imagens/personagens/K01.png'
  );
}

// ─────────────────────────────────────────────────────────────
//  FASE 2 — Caverna. O pequeno demônio ataca de surpresa
// ─────────────────────────────────────────────────────────────

function storyNode_kappa_fase2() {
  setScene('imagens/KappaMasmorra/cavernaE.png');
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
  setScene('imagens/KappaMasmorra/cavernaE.png');
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
    img:      'imagens/personagens/osake.png',
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
  setScene('imagens/KappaMasmorra/cavernaE.png');
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
  setScene('imagens/KappaMasmorra/cavernaE.png');
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
  setScene('imagens/KappaMasmorra/cavernaE.png');
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
  setScene('imagens/KappaMasmorra/cavernaE.png');
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
  setScene('imagens/KappaMasmorra/cavernaE.png');
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
  setScene('imagens/KappaMasmorra/cavernaE.png');
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
//  PLACEHOLDER — Fase 2 Boss (a ser implementada)
// ─────────────────────────────────────────────────────────────

function storyNode_kappa_fase2_boss() {
  setScene('imagens/KappaMasmorra/cavernaE.png');
  hideEnemy();
  setStory(
    'NARRADOR',
    `A criatura se move lentamente na sua direção.`,
    [
      { icon:'▶', text:'Avançar', action: storyNode_kappa_fase2_boss_conteudo },
    ]
  );
}

function storyNode_kappa_fase2_boss_conteudo() {
  setScene('imagens/KappaMasmorra/cavernaE.png');
  hideEnemy();
  setStory(
    'NARRADOR',
    `...`,
    [
      // Próximo conteúdo virá aqui
    ]
  );
}

window.storyNode_kappa_intro              = storyNode_kappa_intro;

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
      bossIcon:  'imagens/icones/kappi1.png',
      descricao: _kappaBloqueada
        ? 'Complete a primeira masmorra para revelar este santuário.'
        : 'Um vilarejo silencioso. Um deus aquático esquecido. E um velho que perdeu tudo em nome da fé.',
      status:    _kappaBloqueada ? 'bloqueada' : 'ativa',
      stats: [
        { label: 'Dificuldade', value: '★★☆☆☆' },
        { label: 'Recompensa',  value: 'Runa S' },
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
