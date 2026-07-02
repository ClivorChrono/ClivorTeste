// =============================================================
//  DUNGEON_SOMBRAS.JS — Chronicles of Clivor
//  Dungeon das Sombras: sequência de entrada, navegação e cenas
//  Depende de: palDinh.js (G, setScene, setStory, hideEnemy,
//              notify, addLog, updateHUD)
//              vilarejo.js (storyNode_vilarejo, storyNode_taverna)
// =============================================================

'use strict';

// ─────────────────────────────────────────────────────────────
//  HELPER: define callback de batalha duplo (principal + resume)
//  Protege contra o bug de double-call do endBattle quando
//  efeitos de status (veneno/queimadura) e golpe final coincidem,
//  fazendo o callback principal ser consumido antes do setTimeout.
// ─────────────────────────────────────────────────────────────
function _dsSetBattle(callbackFn, enemy) {
  G._dungeonBattleCallback = callbackFn;
  G._dungeonResumeCallback = callbackFn; // backup para o guard de cena
  startBattle(enemy);
}
window._dsSetBattle = _dsSetBattle;

// ─────────────────────────────────────────────────────────────
//  LOOT GERAL — "Caveiras" da Dungeon das Sombras
//  Pool de drop compartilhado pelos esqueletos comuns da dungeon
//  (Samurai Caveira, Guarda Caveira). Itens só de venda/material
//  por enquanto, sem efeito especial. Cada item é rolado de forma
//  independente, sempre com chance acima de 10%.
// ─────────────────────────────────────────────────────────────
const _DS_LOOT_CAVEIRAS_GERAL = [
  { id:'espada_enferrujada',   name:'Espada Enferrujada',   icon:'🗡️', imgSrc:'Imagens/icones/materiais/Picsart_26-06-20_18-28-51-893.png', chance:0.12, weight:1.2, type:'material', desc:'Lâmina cega e enferrujada, tirada de um esqueleto da dungeon. Boa só para vender.' },
  { id:'po_osso',              name:'Pó de Osso',           icon:'⚱️',  imgSrc:'Imagens/icones/materiais/Picsart_26-06-20_19-01-17-749.png', chance:0.15, weight:0.2, type:'material', desc:'Restos triturados de ossos antigos. Usado por alquimistas e curandeiros.' },
  { id:'essencia_espiritual',  name:'Essência Espiritual',  icon:'👻',  imgSrc:'Imagens/icones/materiais/Picsart_26-06-20_18-40-20-098.png', chance:0.12, weight:0.3, type:'material', desc:'Resíduo etéreo que escapa de um esqueleto destruído. Tem um leve brilho azulado.' },
  { id:'osso',                 name:'Osso',                 icon:'🦴',  imgSrc:'Imagens/icones/materiais/Picsart_26-06-20_18-24-05-536.png', chance:0.18, weight:0.4, type:'material', desc:'Um osso comum, ainda inteiro. Material simples de venda.' },
];

// ─────────────────────────────────────────────────────────────
//  1. INTRO — Conversa com o Viajante na taverna
// ─────────────────────────────────────────────────────────────

function storyNode_dungeon_sombras_intro() {
  setScene('vilarejo');
  setStory('VIAJANTE',
    `O viajante no canto da taverna baixa o copo devagar ao te ouvir mencionar a ilha.\n\n"Você quer saber sobre a Dungeon das Sombras."\n\nNão é uma pergunta. Ele olha ao redor, como se alguém pudesse estar ouvindo, e inclina a cabeça.\n\n"Já levei três grupos até lá. Dois voltaram. Um voltou sozinho." Ele fecha a mão em torno do copo. "O portão fica numa ilha ao sul — os nativos chamam de Ilha do Silêncio. Nenhum pássaro canta lá. Nem o vento faz barulho."\n\nUma pausa longa.\n\n"Eu conheço o caminho de barco. Se quiser ir... me diga."`,
    [
      { icon:'⛵', text:'"Me leve até lá."', action: storyNode_dungeon_sombras_barco },
      { icon:'↩', text:'"Talvez outro dia..."', action: storyNode_taverna },
    ], 'Imagens/personagens/Tviajante.png'
  );
}
window.storyNode_dungeon_sombras_intro = storyNode_dungeon_sombras_intro;

// ─────────────────────────────────────────────────────────────
//  2. BARCO — Chegando na Ilha (D0.png)
// ─────────────────────────────────────────────────────────────

function storyNode_dungeon_sombras_barco() {
  setScene('dungeon-barco');
  hideEnemy();
  setStory('VIAJANTE',
    `O barco desliza pela névoa em silêncio. O viajante rema sem pressa, os olhos fixos à frente.\n\n"A primeira vez que vim aqui, achei que era medo o que sentia." Ele não desvia o olhar do horizonte sombrio. "Mas não era. Era o lugar te reconhecendo. Como se ele soubesse que você chegou."\n\nA ilha aparece aos poucos entre a neblina — pedras negras, árvores mortas, e ao centro, uma estrutura de pedra que não deveria existir num lugar tão isolado.\n\n"Estamos chegando." O viajante puxa os remos. "Daqui em diante, ando junto até o portão. Depois... é com você."`,
    [
      { icon:'🏚️', text:'Avançar em direção ao castelo', action: storyNode_dungeon_sombras_castel },
    ], 'Imagens/personagens/Tviajante.png'
  );
}
window.storyNode_dungeon_sombras_barco = storyNode_dungeon_sombras_barco;

// ─────────────────────────────────────────────────────────────
//  3. CASTELO — Frente ao portão (castel.png)
// ─────────────────────────────────────────────────────────────

function storyNode_dungeon_sombras_castel() {
  setScene('dungeon-castel');
  hideEnemy();
  setStory('VIAJANTE',
    `O portão é maior do que parecia de longe. Pedra negra coberta de símbolos que você não reconhece — mas que parecem reconhecer você.\n\nO viajante para a alguns metros atrás.\n\n"Aqui fico." Sua voz é firme, sem vergonha. "Não porque tenho medo — já passei desse medo faz tempo. Mas cada vez que alguém entra, alguém tem que ficar do lado de fora. Para contar o que aconteceu, se for preciso."\n\nEle cruza os braços.\n\n"O portão não abre à primeira tentativa. Nunca abre. É como se testasse se você realmente quer entrar. Tente de novo — ele vai ceder."`,
    [
      { icon:'🚪', text:'Tentar abrir o portão...', action: storyNode_dungeon_portao_1 },
    ], 'Imagens/personagens/Tviajante.png'
  );
}
window.storyNode_dungeon_sombras_castel = storyNode_dungeon_sombras_castel;

// ─────────────────────────────────────────────────────────────
//  4. PORTÃO — 1ª tentativa (falha)
// ─────────────────────────────────────────────────────────────

function storyNode_dungeon_portao_1() {
  setScene('dungeon-castel');
  hideEnemy();
  notify('🚪 O portão não se move. Uma resistência estranha empurra suas mãos de volta.', 'purple');
  addLog('Tentou abrir o portão das Sombras — resistiu.', 'info');
  setStory('NARRADOR',
    `Você empurra o portão com força.\n\nNada. A pedra não cede — mas você sente algo estranho nas palmas das mãos. Uma vibração fria, como se o portão estivesse vivo e deliberadamente te bloqueando.\n\nO viajante observa em silêncio.\n\n"De novo." É tudo que ele diz.`,
    [
      { icon:'💪', text:'Forçar o portão uma segunda vez', action: storyNode_dungeon_portao_2 },
      { icon:'↩', text:'Recuar por agora', action: storyNode_dungeon_sombras_castel },
    ]
  );
}
window.storyNode_dungeon_portao_1 = storyNode_dungeon_portao_1;

// ─────────────────────────────────────────────────────────────
//  5. PORTÃO — 2ª tentativa (entra) + viajante vai embora
// ─────────────────────────────────────────────────────────────

function storyNode_dungeon_portao_2() {
  setScene('dungeon-castel');
  hideEnemy();
  notify('⚫ O portão cede. Você entra.', 'gold');
  addLog('Portão das Sombras aberto. Entrando na Dungeon das Sombras.', 'xp');
  setStory('VIAJANTE',
    `Desta vez, o portão recua lentamente — não como pedra cedendo à força, mas como uma decisão sendo tomada.\n\nO viajante dá um passo para trás involuntariamente quando as pedras começam a se mover.\n\n"Vá." Sua voz é baixa. "Estarei no barco quando você voltar."\n\nEle vira as costas e começa a caminhar de volta à costa. Você o vê partir enquanto o portão continua a se abrir à sua frente.`,
    [
      { icon:'⚫', text:'Entrar pelo portão', action: storyNode_dungeon_dentro },
    ], 'Imagens/personagens/Tviajante.png'
  );
}
window.storyNode_dungeon_portao_2 = storyNode_dungeon_portao_2;

// ─────────────────────────────────────────────────────────────
//  6. DENTRO — Interior da dungeon (D0.1.png)
// ─────────────────────────────────────────────────────────────

function storyNode_dungeon_dentro() {
  setScene('dungeon-dentro');
  hideEnemy();
  G.dungeonSombrasBloqueio = true;
  addLog('Entrou na Dungeon das Sombras.', 'xp');
  setStory('NARRADOR',
    `O portão fecha-se atrás de você com um som surdo e definitivo.\n\nA escuridão não é completa — cristais roxos incrustados nas paredes emitem uma luz fraca e pulsante, como se respirassem.\n\nO ar é frio. Denso. Cada passo ecoa mais do que deveria.\n\nVocê está dentro da Dungeon das Sombras. À frente, um corredor longo desaparece na penumbra. Sons distantes — arranhados, murmúrios, algo que não deveria estar vivo.`,
    [
      { icon:'⚔', text:'Avançar pelo corredor — Fase 1', action: storyNode_dungeon_fase1_intro },
    ]
  );
}
window.storyNode_dungeon_dentro = storyNode_dungeon_dentro;

// ─────────────────────────────────────────────────────────────
//  FASE 1 — Corredor das Sombras (D1.png)
//  6 inimigos fracos + mini-boss D1
// ─────────────────────────────────────────────────────────────

// Inimigos fracos da Fase 1
const _DS_SOMBRA_RASTEJANTE = {
  id: 'sombra_rastejante', name: 'Sombra Rastejante', icon: '👤',
  hp: 80, atk: 14, def: 5, xp: 24, gold: 12, isBoss: false,
  elemento: 'sombra',
  img: 'Imagens/personagens/file_0000000013d4720ebe453f8960ea84f4.png',
  desc: 'Um fragmento de escuridão que ganhou forma. Lento, mas persistente.',
  loot: [{ id:'po_sombra', name:'Pó de Sombra', icon:'🌑', imgSrc:'Imagens/icones/materiais/poCrista.png', chance:0.6, weight:0.1, type:'material', desc:'Resíduo das criaturas das sombras.' }],
};
const _DS_ESPECTRO_MENOR = {
  id: 'espectro_menor', name: 'Espectro Menor', icon: '👻',
  hp: 70, atk: 16, def: 4, xp: 28, gold: 14, isBoss: false,
  elemento: 'sombra',
  img: 'Imagens/personagens/file_00000000247c71f58871ae58a3990a1d.png',
  desc: 'Alma perdida presa entre os mundos. Ataca com frio sobrenatural.',
  loot: [{ id:'po_sombra', name:'Pó de Sombra', icon:'🌑', imgSrc:'Imagens/icones/materiais/poCrista.png', chance:0.5, weight:0.1, type:'material', desc:'Resíduo das criaturas das sombras.' }],
};
const _DS_GUARDIAO_CRISTAL = {
  id: 'guardiao_cristal', name: 'Guardião de Cristal', icon: '💎',
  hp: 110, atk: 13, def: 15, xp: 35, gold: 18, isBoss: false,
  elemento: 'cristal',
  img: 'Imagens/personagens/file_00000000412871f5b312b16e4cc02f65.png',
  desc: 'Construto de cristal negro que protege os corredores internos.',
  loot: [{ id:'fragmento_cristal', name:'Fragmento de Cristal Negro', icon:'🔮', imgSrc:'Imagens/icones/materiais/poCrista.png', chance:0.4, weight:0.3, type:'material', desc:'Cristal da dungeon das sombras.' }],
};

// Mini-Boss Fase 1
const _DS_MINIBOSS_D1 = {
  id: 'sentinela_sombras', name: 'Sentinela das Sombras', icon: '🗡️',
  hp: 320, atk: 26, def: 16, xp: 110, gold: 55, isBoss: true,
  elemento: 'sombra',
  img: 'Imagens/personagens/file_000000004480720ebae4a22a12db7146.png',
  desc: 'O guardião do primeiro corredor. Uma armadura vazia animada por escuridão pura — sem mente, sem misericórdia.',
  loot: [
    { id:'essencia_sombra', name:'Essência das Sombras', icon:'⚫', imgSrc:'Imagens/icones/materiais/poCrista.png', chance:1.0, weight:0.2, type:'material', desc:'Núcleo do Sentinela. Valioso.' },
  ],
};

// Controle de progresso da Fase 1
function _getDS1Progress() {
  if (!G.dungeonSombras) G.dungeonSombras = {};
  if (!G.dungeonSombras.f1) G.dungeonSombras.f1 = { kills: 0, bossDefeated: false };
  return G.dungeonSombras.f1;
}

function storyNode_dungeon_fase1_intro() {
  setScene('dungeon-fase1');
  hideEnemy();
  const prog = _getDS1Progress();
  prog.kills = 0;
  prog.bossDefeated = false;
  addLog('Fase 1 — Corredor das Sombras.', 'info');
  setStory('NARRADOR',
    `O corredor se abre numa câmara larga, iluminada por braseiros de chama roxa.\n\nFormas se movem nas sombras das colunas — criaturas que não deveriam existir, feitas de escuridão coagulada e ódio antigo.\n\nVocê conta ao menos seis delas. E lá no fundo, algo maior se mexe.\n\nNão há caminho que não passe por elas.`,
    [
      { icon:'⚔', text:'Enfrentar as criaturas das sombras', action: storyNode_dungeon_f1_onda1 },
    ]
  );
}
window.storyNode_dungeon_fase1_intro = storyNode_dungeon_fase1_intro;

function storyNode_dungeon_f1_onda1() {
  setScene('dungeon-fase1');
  const prog = _getDS1Progress();
  // 3 inimigos fracos em sequência (onda 1 de 2)
  const inimigos = [_DS_SOMBRA_RASTEJANTE, _DS_ESPECTRO_MENOR, _DS_SOMBRA_RASTEJANTE];
  const idx = prog.kills % inimigos.length;
  const inimigo = { ...inimigos[idx] };
  setStory('NARRADOR',
    `Uma ${inimigo.name} avança das sombras!\n\n${inimigo.desc}`,
    [
      { icon:'⚔', text:`Batalhar contra ${inimigo.name}!`, action: () => {
        _dsSetBattle(function() {
          prog.kills++;
          if (prog.kills < 3) {
            storyNode_dungeon_f1_onda1();
          } else {
            storyNode_dungeon_f1_onda2();
          }
        }, inimigo);
      }},
    ]
  );
}
window.storyNode_dungeon_f1_onda1 = storyNode_dungeon_f1_onda1;

function storyNode_dungeon_f1_onda2() {
  setScene('dungeon-fase1');
  hideEnemy();
  setStory('NARRADOR',
    `Três criaturas caem.\n\nMas o silêncio que se segue é pesado demais. Outros três pares de olhos brilham no escuro, avançando pelo corredor.\n\nE ao fundo, a figura grande ainda não se moveu. Ainda está esperando.`,
    [
      { icon:'⚔', text:'Continuar lutando', action: storyNode_dungeon_f1_cont },
    ]
  );
}
window.storyNode_dungeon_f1_onda2 = storyNode_dungeon_f1_onda2;

function storyNode_dungeon_f1_cont() {
  setScene('dungeon-fase1');
  const prog = _getDS1Progress();
  const inimigos = [_DS_GUARDIAO_CRISTAL, _DS_ESPECTRO_MENOR, _DS_GUARDIAO_CRISTAL];
  const subIdx = (prog.kills - 3) % inimigos.length;
  const inimigo = { ...inimigos[subIdx] };
  setStory('NARRADOR',
    `Um ${inimigo.name} bloqueia o caminho!\n\n${inimigo.desc}`,
    [
      { icon:'⚔', text:`Batalhar contra ${inimigo.name}!`, action: () => {
        _dsSetBattle(function() {
          prog.kills++;
          if (prog.kills < 6) {
            storyNode_dungeon_f1_cont();
          } else {
            storyNode_dungeon_f1_preminiboss();
          }
        }, inimigo);
      }},
    ]
  );
}
window.storyNode_dungeon_f1_cont = storyNode_dungeon_f1_cont;

function storyNode_dungeon_f1_preminiboss() {
  setScene('dungeon-fase1');
  hideEnemy();
  notify('⚫ Seis criaturas derrotadas. Algo maior se aproxima...', 'purple');
  addLog('Fase 1 — 6 criaturas derrotadas. Mini-boss surgindo.', 'xp');
  setStory('NARRADOR',
    `O corredor fica em silêncio absoluto.\n\nAs seis criaturas jazem dissolvidas em fumaça negra aos seus pés.\n\nEntão você ouve — ou melhor, sente — passos. Pesados. Ritmados. Cada um faz as pedras do chão vibrarem levemente.\n\nDo fundo da câmara emerge uma armadura negra de três metros. Sem rosto. Sem olhos. Apenas escuridão dentro de cada abertura da armadura.\n\nA Sentinela das Sombras. O guardião deste corredor.\n\nEla levanta uma lâmina longa como você mesmo.`,
    [
      { icon:'💀', text:'Enfrentar a Sentinela das Sombras!', action: storyNode_dungeon_f1_miniboss },
    ]
  );
}
window.storyNode_dungeon_f1_preminiboss = storyNode_dungeon_f1_preminiboss;

function storyNode_dungeon_f1_miniboss() {
  setScene('dungeon-fase1');
  _dsSetBattle(function() {
    _getDS1Progress().bossDefeated = true;
    storyNode_dungeon_f1_vitoria();
  }, { ..._DS_MINIBOSS_D1 });
}
window.storyNode_dungeon_f1_miniboss = storyNode_dungeon_f1_miniboss;

function storyNode_dungeon_f1_vitoria() {
  setScene('dungeon-fase1');
  hideEnemy();
  notify('✦ Fase 1 concluída! O caminho para a Fase 2 está aberto.', 'gold');
  addLog('Fase 1 — Sentinela derrotada. Acesso à Fase 2 liberado.', 'xp');
  setStory('NARRADOR',
    `A armadura treme, oscila, e desmorona — peça por peça — num barulho ensurdecedor que ecoa pelos corredores.\n\nOnde ela estava, resta apenas uma porta de pedra negra, agora entreaberta. Uma luz estranha — nem fria nem quente — pulsa do outro lado.\n\nVocê derrotou seis criaturas das sombras e a Sentinela que as comandava.\n\nO que vem a seguir está além dessa porta.`,
    [
      { icon:'🚪', text:'Avançar para a Fase 2', action: storyNode_dungeon_fase2_intro },
    ]
  );
}
window.storyNode_dungeon_f1_vitoria = storyNode_dungeon_f1_vitoria;

// ─────────────────────────────────────────────────────────────
//  FASE 2 — Câmara dos Mortos (D2.png)
//  4 Samurai Caveira (2 formas, vento) + mini-boss Olho Espectral
// ─────────────────────────────────────────────────────────────

// Inimigos da Fase 2 — dois Samurai Caveira (vento, rápidos e fortes), mesma alcunha, formas diferentes
const _DS_SAMURAI_CAVEIRA_1 = {
  id: 'samurai_caveira_1', name: 'Samurai Caveira', icon: '💀',
  hp: 150, atk: 26, def: 9, xp: 46, gold: 22, isBoss: false,
  elemento: 'vento',
  img: 'Imagens/Dungeon das sombras/WA_1781973635077.png',
  desc: 'Esqueleto vestido com armadura de samurai esfarrapada. Move-se rápido demais para ser apenas ossos — o vento da dungeon parece empurrá-lo.',
  loot: [
    { id:'lamina_quebrada', name:'Lâmina Quebrada', icon:'🗡️', imgSrc:'Imagens/icones/materiais/poCrista.png', chance:0.5, weight:0.4, type:'material', desc:'Fragmento de katana de um Samurai Caveira.' },
    ..._DS_LOOT_CAVEIRAS_GERAL,
  ],
};

const _DS_SAMURAI_CAVEIRA_2 = {
  id: 'samurai_caveira_2', name: 'Samurai Caveira', icon: '💀',
  hp: 160, atk: 28, def: 10, xp: 48, gold: 24, isBoss: false,
  elemento: 'vento',
  img: 'Imagens/Dungeon das sombras/WA_1781973622680.png',
  desc: 'Outra forma do mesmo espírito guerreiro — postura diferente, mesma fome de combate. A lâmina corta antes que você veja o movimento.',
  loot: [
    { id:'lamina_quebrada', name:'Lâmina Quebrada', icon:'🗡️', imgSrc:'Imagens/icones/materiais/poCrista.png', chance:0.5, weight:0.4, type:'material', desc:'Fragmento de katana de um Samurai Caveira.' },
    ..._DS_LOOT_CAVEIRAS_GERAL,
  ],
};

// Mini-Boss Fase 2
const _DS_OLHO_ESPECTRAL = {
  id: 'olho_espectral', name: 'Olho Espectral', icon: '👁️',
  hp: 900, atk: 32, def: 12, xp: 280, gold: 120, isBoss: true,
  elemento: 'sombra',
  img: 'Imagens/personagens/olho.png',
  desc: 'Uma entidade antiga que habita a câmara há séculos. Seu ataque psíquico penetra defesas físicas e corrói a mente.',
  specialAtk: 'psiquico',
  loot: [
    { id:'humor_espectral', name:'Humor Espectral', icon:'👁️', imgSrc:'Imagens/icones/materiais/poCrista.png', chance:1.0, weight:0.1, type:'material', desc:'Fluido raro do Olho Espectral. Valiosíssimo.' },
  ],
};

function _getDS2Progress() {
  if (!G.dungeonSombras) G.dungeonSombras = {};
  if (!G.dungeonSombras.f2) G.dungeonSombras.f2 = { kills: 0, bossDefeated: false };
  return G.dungeonSombras.f2;
}

function storyNode_dungeon_fase2_intro() {
  setScene('dungeon-fase2');
  hideEnemy();
  const prog = _getDS2Progress();
  prog.kills = 0;
  prog.bossDefeated = false;
  addLog('Fase 2 — Câmara dos Mortos.', 'info');
  setStory('NARRADOR',
    `A porta se fecha atrás de você.\n\nA câmara é enorme — colunas de pedra negra se perdem no teto invisível, e o chão é coberto de névoa baixa e cinzenta.\n\nEntão você os vê. Quatro esqueletos vestidos com armaduras de samurai esfarrapadas, espalhados pelo chão, imóveis.\n\nMas antes que você possa dar mais dois passos, eles se levantam — e o vento da câmara parece se curvar ao redor deles.\n\nE no centro da câmara, suspenso no ar, um olho colossal se abre lentamente — uma pupila vertical, brilhando em roxo escuro. Ele te observa. Você sente sua presença dentro da sua cabeça.`,
    [
      { icon:'⚔', text:'Enfrentar os Samurai Caveira primeiro', action: storyNode_dungeon_f2_zombies },
    ]
  );
}
window.storyNode_dungeon_fase2_intro = storyNode_dungeon_fase2_intro;

function storyNode_dungeon_f2_zombies() {
  setScene('dungeon-fase2');
  const prog = _getDS2Progress();
  // Alterna entre as duas formas do Samurai Caveira a cada encontro
  const base = (prog.kills % 2 === 0) ? _DS_SAMURAI_CAVEIRA_1 : _DS_SAMURAI_CAVEIRA_2;
  const inimigo = { ...base };
  setStory('NARRADOR',
    `Um Samurai Caveira avança, lâmina pronta, movimentos rápidos demais para algo feito só de ossos.\n\n${inimigo.desc}\n\n(${prog.kills + 1}/4 samurais)`,
    [
      { icon:'⚔', text:'Batalhar contra o Samurai Caveira!', action: () => {
        _dsSetBattle(function() {
          prog.kills++;
          if (prog.kills < 4) {
            storyNode_dungeon_f2_zombies();
          } else {
            storyNode_dungeon_f2_pre_olho();
          }
        }, inimigo);
      }},
    ]
  );
}
window.storyNode_dungeon_f2_zombies = storyNode_dungeon_f2_zombies;

function storyNode_dungeon_f2_pre_olho() {
  setScene('dungeon-fase2');
  hideEnemy();
  notify('👁️ O Olho Espectral te fita. Sua mente treme.', 'purple');
  addLog('Fase 2 — 4 samurais derrotados. Olho Espectral ativado.', 'xp');
  setStory('NARRADOR',
    `Os quatro Samurai Caveira jazem imóveis no chão da câmara.\n\nO Olho Espectral não se move. Mas você sente — uma pressão crescente dentro do crânio, como se algo tentasse entrar.\n\n\"Você destruiu meus servos.\" A voz não vem de fora. Ela ressoa diretamente na sua mente. \"Agora veja o que é enfrentar algo que não pode ser cortado por aço.\"\n\nA pupila vertical se expande.\n\nO ataque psíquico começa.`,
    [
      { icon:'💀', text:'Enfrentar o Olho Espectral!', action: storyNode_dungeon_f2_olho },
    ]
  );
}
window.storyNode_dungeon_f2_pre_olho = storyNode_dungeon_f2_pre_olho;

function storyNode_dungeon_f2_olho() {
  setScene('dungeon-fase2');
  _dsSetBattle(function() {
    _getDS2Progress().bossDefeated = true;
    storyNode_dungeon_f2_vitoria();
  }, { ..._DS_OLHO_ESPECTRAL });
}
window.storyNode_dungeon_f2_olho = storyNode_dungeon_f2_olho;

function storyNode_dungeon_f2_vitoria() {
  setScene('dungeon-fase2');
  hideEnemy();
  notify('✦ Fase 2 concluída! O caminho para a Fase 3 está aberto.', 'gold');
  addLog('Fase 2 — Olho Espectral derrotado. Acesso à Fase 3 liberado.', 'xp');
  setStory('NARRADOR',
    `O Olho Espectral emite um som que não é som — uma frequência que você sente nos dentes e nos ossos — e então implode.\n\nA névoa da câmara se dissipa rapidamente. O ar fica mais leve. O peso dentro da sua cabeça desaparece.\n\nOnde o Olho estava, resta apenas um brilho roxo no ar que se apaga devagar.\n\nAo fundo da câmara, uma segunda porta de pedra começa a se mover por conta própria, como se reconhecesse que você merece passar.\n\nA Fase 3 aguarda.`,
    [
      { icon:'🚪', text:'Avançar para a Fase 3', action: storyNode_dungeon_fase3_intro },
    ]
  );
}
window.storyNode_dungeon_f2_vitoria = storyNode_dungeon_f2_vitoria;


// ─────────────────────────────────────────────────────────────
//  FASE 3 — Câmara dos Gigantes (D3.png)
//  2 Ogros: Ogro Guardião (terra) + Ogro Guardião II (planta)
// ─────────────────────────────────────────────────────────────

const _DS_OGRO_TERRA = {
  id: 'ogro_terra', name: 'Ogro Guardião', icon: '🗿',
  hp: 380, atk: 22, def: 10, xp: 70, gold: 32, isBoss: false,
  elemento: 'terra',
  img: 'Imagens/Dungeon das sombras/file_00000000a124720e8a9efe9827364609.png',
  desc: 'Colosso feito de lama comprimida e raízes negras. Lento, mas cada golpe abala o chão inteiro — e esmaga qualquer guarda.',
  loot: [{ id:'argila_sombria', name:'Argila Sombria', icon:'🟫', imgSrc:'Imagens/icones/materiais/poCrista.png', chance:0.8, weight:1.0, type:'material', desc:'Terra densa da dungeon. Material raro.' }],
};

const _DS_OGRO_GRANITO = {
  id: 'ogro_granito', name: 'Ogro Guardião II', icon: '🌿',
  hp: 420, atk: 24, def: 17, xp: 80, gold: 38, isBoss: false,
  elemento: 'planta',
  img: 'Imagens/Dungeon das sombras/file_0000000090d071f5974425e11b49c22b.png',
  desc: 'Corpo coberto de musgo espesso e raízes vivas. Não tem pressa — os esporos que solta ao se mover já fazem o trabalho por ele.',
  loot: [{ id:'musgo_sombrio', name:'Musgo Sombrio', icon:'🌿', imgSrc:'Imagens/icones/materiais/poCrista.png', chance:0.8, weight:1.5, type:'material', desc:'Fragmento do Ogro Guardião II. Pulsa com vida própria.' }],
};

function _getDS3Progress() {
  if (!G.dungeonSombras) G.dungeonSombras = {};
  if (!G.dungeonSombras.f3) G.dungeonSombras.f3 = { kills: 0 };
  return G.dungeonSombras.f3;
}

function storyNode_dungeon_fase3_intro() {
  setScene('dungeon-fase3');
  hideEnemy();
  const prog = _getDS3Progress();
  prog.kills = 0;
  addLog('Fase 3 — Câmara dos Gigantes.', 'info');
  setStory('NARRADOR',
    `A terceira câmara é diferente das anteriores.\n\nO teto é alto demais para ser visto. As paredes estão cobertas de marcas — não escritas, mas esculpidas por algo grande demais para usar mãos humanas.\n\nEntão você os vê.\n\nDois gigantes. Um feito de terra comprimida e raízes escuras, o outro coberto de musgo espesso e raízes vivas. Eles não correm. Não precisam. Eles apenas giram as cabeças pesadas na sua direção e começam a se mover.\n\nLentos. Inevitáveis.`,
    [
      { icon:'⚔', text:'Enfrentar o Ogro Guardião primeiro', action: storyNode_dungeon_f3_ogro1 },
    ]
  );
}
window.storyNode_dungeon_fase3_intro = storyNode_dungeon_fase3_intro;

function storyNode_dungeon_f3_ogro1() {
  setScene('dungeon-fase3');
  setStory('NARRADOR',
    `O Ogro Guardião se posiciona à sua frente, bloqueando a passagem.\n\nCada passo seu faz a câmara vibrar. A lama escura que compõe seu corpo pulsa como se estivesse viva.\n\nEle levanta os braços.`,
    [
      { icon:'⚔', text:'Batalhar contra o Ogro Guardião! (1000 HP)', action: () => {
        _dsSetBattle(function() {
          _getDS3Progress().kills++;
          storyNode_dungeon_f3_entre_ogros();
        }, { ..._DS_OGRO_TERRA });
      }},
    ]
  );
}
window.storyNode_dungeon_f3_ogro1 = storyNode_dungeon_f3_ogro1;

function storyNode_dungeon_f3_entre_ogros() {
  setScene('dungeon-fase3');
  hideEnemy();
  notify('🗿 Ogro Guardião derrotado. O segundo avança.', 'gold');
  setStory('NARRADOR',
    `O Ogro Guardião racha — uma fissura percorre seu torso do ombro à cintura — e desmorona em pedaços de lama e raiz que se dissolvem no chão.\n\nO silêncio dura exatamente dois segundos.\n\nEntão o Ogro Guardião II dá um passo à frente, deixando um rastro de esporos no ar. Ele não está com raiva. Está apenas... cumprindo uma função.`,
    [
      { icon:'⚔', text:'Enfrentar o Ogro Guardião II! (1000 HP)', action: storyNode_dungeon_f3_ogro2 },
    ]
  );
}
window.storyNode_dungeon_f3_entre_ogros = storyNode_dungeon_f3_entre_ogros;

function storyNode_dungeon_f3_ogro2() {
  setScene('dungeon-fase3');
  _dsSetBattle(function() {
    _getDS3Progress().kills++;
    storyNode_dungeon_f3_vitoria();
  }, { ..._DS_OGRO_GRANITO });
}
window.storyNode_dungeon_f3_ogro2 = storyNode_dungeon_f3_ogro2;

function storyNode_dungeon_f3_vitoria() {
  setScene('dungeon-fase3');
  hideEnemy();
  notify('✦ Fase 3 concluída! O caminho para a Fase 4 está aberto.', 'gold');
  addLog('Fase 3 — Dois Ogros derrotados. Acesso à Fase 4 liberado.', 'xp');
  setStory('NARRADOR',
    `O Ogro Guardião II cai de joelhos — o impacto abre rachaduras no chão de pedra ao seu redor — e então se imobiliza. Estátua. Silêncio.\n\nVocê está de pé. Ainda respirando.\n\nAtrás dos dois gigantes caídos, uma abertura na parede — não uma porta, apenas a pedra que se partiu sozinha — revela um corredor diferente. Não há escuridão lá. Há uma luz estranha. Quieta.\n\nComo a presença de algo que está esperando há muito tempo.`,
    [
      { icon:'🚪', text:'Avançar para a Fase 4', action: storyNode_dungeon_fase4_entrada },
    ]
  );
}
window.storyNode_dungeon_f3_vitoria = storyNode_dungeon_f3_vitoria;

// ─────────────────────────────────────────────────────────────
//  FASE 4 — O Encontro (D4.png)
//  Sem batalha. Conversa com a Sacerdotisa Negra (Siu).
//  Pressão psíquica: -50% HP atual ao final.
// ─────────────────────────────────────────────────────────────

function storyNode_dungeon_fase4_entrada() {
  setScene('dungeon-fase4');
  hideEnemy();
  addLog('Fase 4 — O Encontro. Sacerdotisa das Sombras.', 'info');
  setStory('NARRADOR',
    `O corredor termina numa câmara circular.\n\nSem monstros. Sem armadilhas. Apenas silêncio e uma luz roxo-escura que não vem de lugar nenhum que você consiga identificar.\n\nNo centro da câmara, sentada sobre o que parece ser pedra negra esculpida em forma de trono, há uma mulher.\n\nNão é jovem nem velha. O cabelo é negro como tinta. As vestes são escuras com bordados que parecem se mover quando você tenta olhar diretamente.\n\nEla levanta os olhos para você. Não com surpresa. Com... reconhecimento.\n\n"Eu sabia que você chegaria até aqui."\n\nA voz é calma. Familiar de um jeito que você não consegue explicar.`,
    [
      { icon:'👁', text:'Aproximar-se dela', action: storyNode_dungeon_f4_apresentacao },
    ]
  );
}
window.storyNode_dungeon_fase4_entrada = storyNode_dungeon_fase4_entrada;

function storyNode_dungeon_f4_apresentacao() {
  setScene('dungeon-fase4');
  hideEnemy();
  setStory('SIU — SACERDOTISA DAS SOMBRAS',
    `"Meu nome é Siu. Não que isso signifique muito para você agora."\n\nEla inclina a cabeça levemente.\n\n"Mas talvez você reconheça outro nome. Yuki. Minha irmã."\n\nUma pausa.\n\n"Sim. A sacerdotisa do seu vilarejo. A guardiã da luz. A que serve o templo com tanta... devoção." Algo na voz dela — não é ódio. É algo mais antigo. "Somos duas metades do mesmo altar. Ela escolheu o que floresce. Eu escolhi o que permanece."`,
    [
      { icon:'❓', text:'"Como assim — duas metades?"', action: storyNode_dungeon_f4_origem },
      { icon:'⚔', text:'"Você é a ameaça que vim enfrentar?"', action: storyNode_dungeon_f4_ameaca },
    ], 'Imagens/personagens/Siu.png'
  );
}
window.storyNode_dungeon_f4_apresentacao = storyNode_dungeon_f4_apresentacao;

function storyNode_dungeon_f4_origem() {
  setScene('dungeon-fase4');
  hideEnemy();
  setStory('SIU — SACERDOTISA DAS SOMBRAS',
    `"Yuki e eu nascemos do mesmo ritual. Gêmeas de sangue e propósito — consagradas ao equilíbrio entre a luz e a sombra que sustenta este mundo."\n\nSiu se levanta do trono devagar. Não ameaçadora. Apenas... presente.\n\n"Quando chegou a hora de escolher nossos caminhos, Yuki foi para o sol. Plantou templos, curou feridas, reuniu os fracos sob bênçãos douradas." Uma pausa. "Eu fui para onde nenhum de nós queria ir. Para o que cresce no escuro. Para o que dura quando a luz se apaga."\n\n"Não somos inimigas. Somos necessárias. Mas ela nunca aceitou isso. Pra Yuki, sombra é ausência de luz. Pra mim..." — os olhos dela brilham levemente — "...luz é ausência de sombra."`,
    [
      { icon:'🌗', text:'"Então vocês são opostos. Ying e Yang."', action: storyNode_dungeon_f4_yingyang },
      { icon:'❓', text:'"Por que você está nesta dungeon?"', action: storyNode_dungeon_f4_razao },
    ], 'Imagens/personagens/Siu.png'
  );
}
window.storyNode_dungeon_f4_origem = storyNode_dungeon_f4_origem;

function storyNode_dungeon_f4_ameaca() {
  setScene('dungeon-fase4');
  hideEnemy();
  setStory('SIU — SACERDOTISA DAS SOMBRAS',
    `Ela ri. Não com crueldade — com algo que parece cansaço antigo.\n\n"Ameaça." Ela repete a palavra como se estivesse testando o peso dela. "Você foi até aqui destruindo o que eu cuido há séculos. Minhas criaturas. Meus guardiões. O Olho que plantei aqui quando Clivor ainda era jovem."\n\nEla não avança. Fica onde está.\n\n"E ainda assim você me pergunta se sou a ameaça." Uma pausa. "Eu sou o que existe quando ninguém quer olhar para o que está embaixo da luz bonita que a minha irmã projeta. Sou a sombra que ela finge não ter."`,
    [
      { icon:'❓', text:'"Quem é sua irmã?"', action: storyNode_dungeon_f4_origem },
      { icon:'🌗', text:'"Então vocês são opostos."', action: storyNode_dungeon_f4_yingyang },
    ], 'Imagens/personagens/Siu.png'
  );
}
window.storyNode_dungeon_f4_ameaca = storyNode_dungeon_f4_ameaca;

function storyNode_dungeon_f4_yingyang() {
  setScene('dungeon-fase4');
  hideEnemy();
  setStory('SIU — SACERDOTISA DAS SOMBRAS',
    `"Opostos." Ela considera. "Não exatamente. Opostos se repelem. Nós... nos completamos. Sem Yuki espalhando luz, eu afogaria este mundo em escuridão sem forma. Sem mim contendo a sombra, a luz dela queimaria tudo até cinzas brancas."\n\nEla caminha lentamente ao redor de você. Não como predador. Como quem avalia.\n\n"O problema é que ela passou décadas tentando me apagar. Enviou heróis aqui. Enviou exércitos. Enviou suas orações." Uma pausa. "Nenhum deles chegou até onde você chegou." Os olhos dela encontram os seus. "Por quê?"\n\n"O que você quer, realmente, no fundo desta dungeon?"`,
    [
      { icon:'🗡️', text:'"Quero derrotar o Lich. Restaurar Clivor."', action: storyNode_dungeon_f4_proposito },
      { icon:'🌗', text:'"Não sei. Talvez entender o que existe aqui."', action: storyNode_dungeon_f4_sabedoria },
    ], 'Imagens/personagens/Siu.png'
  );
}
window.storyNode_dungeon_f4_yingyang = storyNode_dungeon_f4_yingyang;

function storyNode_dungeon_f4_razao() {
  setScene('dungeon-fase4');
  hideEnemy();
  setStory('SIU — SACERDOTISA DAS SOMBRAS',
    `"Por que estou aqui." Ela para. "A mesma razão que Yuki está no templo dela. Este é o meu lugar. Sempre foi."\n\n"Esta dungeon não foi construída por um inimigo. Foi construída por mim, séculos atrás, como contrapeso. Cada templo de luz que Yuki ergue precisa de uma câmara de sombra equivalente. Caso contrário o mundo desregula — doenças que a luz não cura, mortes que as orações não explicam, o lado de baixo que ninguém quer nomear."\n\n"Eu sou aquilo que mantém o equilíbrio. Não a ameaça." Uma pausa longa. "Mas você destruiu boa parte da minha obra chegando até aqui. Então devo reconhecer: você é forte."`,
    [
      { icon:'🌗', text:'"Então vocês são opostos. Ying e Yang."', action: storyNode_dungeon_f4_yingyang },
    ], 'Imagens/personagens/Siu.png'
  );
}
window.storyNode_dungeon_f4_razao = storyNode_dungeon_f4_razao;

function storyNode_dungeon_f4_proposito() {
  setScene('dungeon-fase4');
  hideEnemy();
  setStory('SIU — SACERDOTISA DAS SOMBRAS',
    `"O Lich." Algo muda na expressão dela. Não medo — preocupação genuína. "Então você sabe que ele existe."\n\nEla volta ao trono. Senta.\n\n"Valdris quebrou os selos do equilíbrio. Não apenas os de luz — os de sombra também. Ele não é mais nem um nem outro. É... algo à parte." Uma pausa. "Você precisará de mais do que força para chegar até ele. Precisará entender que luz e sombra não são inimigos. São a mesma coisa vista de lados diferentes."\n\nOs olhos dela brilham.\n\n"Deixarei você passar. Mas não de graça. O equilíbrio cobra seu preço."`,
    [
      { icon:'⚡', text:'"Que preço?"', action: storyNode_dungeon_f4_pressao },
    ], 'Imagens/personagens/Siu.png'
  );
}
window.storyNode_dungeon_f4_proposito = storyNode_dungeon_f4_proposito;

function storyNode_dungeon_f4_sabedoria() {
  setScene('dungeon-fase4');
  hideEnemy();
  setStory('SIU — SACERDOTISA DAS SOMBRAS',
    `Ela para. Pela primeira vez, algo como respeito aparece nos olhos dela.\n\n"Honesto." Ela não esperava essa resposta. "Quase nenhum dos que chegaram até aqui disse isso. Todos vieram com certezas — matar o mal, salvar o reino, voltar com glória."\n\nEla se senta novamente no trono.\n\n"Entender é mais perigoso do que qualquer espada. Quem entende a sombra não consegue mais ignorá-la — nem nos inimigos, nem em si mesmo." Uma pausa. "Yuki nunca me perdoou por isso. Por entender o que ela prefere não ver."\n\nEla estende a mão — não agressivamente. Como quem oferece algo.\n\n"Vou deixar você passar. Mas o equilíbrio exige um preço. Não de mim — da própria passagem."`,
    [
      { icon:'⚡', text:'"Que preço?"', action: storyNode_dungeon_f4_pressao },
    ], 'Imagens/personagens/Siu.png'
  );
}
window.storyNode_dungeon_f4_sabedoria = storyNode_dungeon_f4_sabedoria;

function storyNode_dungeon_f4_pressao() {
  setScene('dungeon-fase4');
  hideEnemy();
  setStory('SIU — SACERDOTISA DAS SOMBRAS',
    `"A pressão das sombras." Ela diz com simplicidade. "Não é punição. É o que este lugar faz com tudo que passa por ele. Você já a sentiu — nos corredores, na mente, no peso do ar."\n\n"Atravessar a câmara seguinte custa metade do que você tem agora. Não mais. Não menos. Exatamente metade."\n\nEla se levanta uma última vez.\n\n"Se você tem pouco, perderá pouco. Se tem muito, perderá muito. O equilíbrio não discrimina."\n\nOs olhos dela encontram os seus pela última vez.\n\n"Boa sorte, viajante. Diga à minha irmã que estou bem."`,
    [
      { icon:'💜', text:'Aceitar a passagem e avançar', action: storyNode_dungeon_f4_aplicar_pressao },
    ], 'Imagens/personagens/Siu.png'
  );
}
window.storyNode_dungeon_f4_pressao = storyNode_dungeon_f4_pressao;

function storyNode_dungeon_f4_aplicar_pressao() {
  setScene('dungeon-fase4');
  hideEnemy();

  // Aplica 50% do HP atual como dano — independente do valor
  const p = G.player;
  const hpAtual = p.hp || 1;
  const dano = Math.max(1, Math.floor(hpAtual * 0.5));
  p.hp = hpAtual - dano;
  // Garante mínimo de 1 HP (não mata)
  if (p.hp < 1) p.hp = 1;
  updateHUD();

  notify(`💜 Pressão das Sombras: -${dano} HP (metade do HP atual)`, 'purple');
  addLog(`Pressão das Sombras de Siu: -${dano} HP. HP restante: ${p.hp}.`, 'info');

  setStory('NARRADOR',
    `Você dá um passo em direção à saída da câmara.\n\nA pressão chega sem aviso — não dor, mas peso. Como se o ar triplicasse de densidade ao seu redor, empurrando de todos os lados ao mesmo tempo.\n\nVocê dobra o joelho. Respira fundo. Levanta.\n\nA metade que você perdeu fica para trás, dissolvida no ar da câmara.\n\nSiu não está mais lá quando você olha para trás. O trono está vazio.\n\nMas você ouve, muito baixo, quase pensamento:\n\n"Continue."`,
    [
      { icon:'🚪', text:'Avançar para a Fase 5', action: storyNode_dungeon_fase5_intro },
    ]
  );
}
window.storyNode_dungeon_f4_aplicar_pressao = storyNode_dungeon_f4_aplicar_pressao;

// ─────────────────────────────────────────────────────────────
//  FASE 5 — Marionetes de Siu (D5.png)
//  3 Guardas Caveira + reencuentro com Siu (sem batalha)
// ─────────────────────────────────────────────────────────────

const _DS_GUARDA_CAVEIRA = {
  id: 'guarda_caveira_siu', name: 'Guarda Caveira', icon: '💀',
  hp: 200, atk: 26, def: 12, xp: 60, gold: 28, isBoss: false,
  elemento: 'sombra',
  img: 'Imagens/personagens/file_000000001ca4720e941d21e3167bd546.png',
  desc: 'Esqueleto animado pela vontade de Siu. Não pensa — apenas obedece. Um fantoche de osso e sombra.',
  loot: [
    { id:'osso_siu', name:'Osso da Marionete', icon:'🦴', imgSrc:'Imagens/icones/materiais/poCrista.png', chance:0.7, weight:0.3, type:'material', desc:'Fragmento de um guarda de Siu.' },
    ..._DS_LOOT_CAVEIRAS_GERAL,
  ],
};

function _getDS5Progress() {
  if (!G.dungeonSombras) G.dungeonSombras = {};
  if (!G.dungeonSombras.f5) G.dungeonSombras.f5 = { kills: 0 };
  return G.dungeonSombras.f5;
}

function storyNode_dungeon_fase5_intro() {
  setScene('dungeon-fase5');
  hideEnemy();
  const prog = _getDS5Progress();
  prog.kills = 0;
  addLog('Fase 5 — Marionetes de Siu.', 'info');
  setStory('NARRADOR',
    `O corredor depois da câmara de Siu é estreito e silencioso.\n\nVocê ainda sente o peso da pressão das sombras nos ombros — metade do que tinha, dissolvida no ar daquela câmara.\n\nEntão eles aparecem.\n\nTrês figuras emergem das paredes como se a pedra as cuspisse. Esqueletos. Mas não como os da Fase 2 — esses se movem com precisão estranha, coordenada. Como marionetes puxadas por fios invisíveis.\n\nFios que você sabe exatamente onde terminam.`,
    [
      { icon:'⚔', text:'Enfrentar os Guardas Caveira', action: storyNode_dungeon_f5_guarda },
    ]
  );
}
window.storyNode_dungeon_fase5_intro = storyNode_dungeon_fase5_intro;

function storyNode_dungeon_f5_guarda() {
  setScene('dungeon-fase5');
  const prog = _getDS5Progress();
  const num = prog.kills + 1;
  setStory('NARRADOR',
    `Guarda Caveira ${num}/3 avança com movimentos mecânicos e silenciosos.\n\nNão respira. Não hesita. Apenas obedece.`,
    [
      { icon:'⚔', text:`Batalhar! (${num}/3)`, action: () => {
        _dsSetBattle(function() {
          prog.kills++;
          if (prog.kills < 3) {
            storyNode_dungeon_f5_guarda();
          } else {
            storyNode_dungeon_f5_pos_guardas();
          }
        }, { ..._DS_GUARDA_CAVEIRA });
      }},
    ]
  );
}
window.storyNode_dungeon_f5_guarda = storyNode_dungeon_f5_guarda;

function storyNode_dungeon_f5_pos_guardas() {
  setScene('dungeon-fase5');
  hideEnemy();
  notify('💀 Três Guardas Caveira destruídos.', 'gold');
  addLog('Fase 5 — 3 Guardas de Siu derrotados.', 'xp');
  setStory('NARRADOR',
    `Os três esqueletos caem — não com barulho, mas com um estalo seco — e os fios invisíveis que os moviam se rompem no ar como fumaça.\n\nO corredor fica em silêncio absoluto.\n\nEntão, da escuridão à frente, uma forma familiar se materializa.\n\nSiu.`,
    [
      { icon:'👁', text:'Encarar Siu', action: storyNode_dungeon_f5_siu_1 },
    ]
  );
}
window.storyNode_dungeon_f5_pos_guardas = storyNode_dungeon_f5_pos_guardas;

function storyNode_dungeon_f5_siu_1() {
  setScene('dungeon-fase5');
  hideEnemy();
  setStory('SIU — SACERDOTISA DAS SOMBRAS',
    `"Você derrubou meus três últimos guardas neste corredor."\n\nEla não parece irritada. Parece... pensativa.\n\n"Eu disse que deixaria você passar. E deixei. Mas há uma diferença entre a porta aberta e o caminho livre." Os olhos dela percorrem você de cima a baixo. "Você já perdeu metade de si mesmo atravessando minha câmara. E ainda avança."\n\nUma pausa longa.\n\n"Talvez eu tenha subestimado o que Yuki semeia no mundo lá fora."`,
    [
      { icon:'🗡️', text:'"Não vou parar. Deixe-me passar."', action: storyNode_dungeon_f5_siu_insiste },
      { icon:'🌗', text:'"Você mesmo disse que devo continuar."', action: storyNode_dungeon_f5_siu_lembra },
    ], 'Imagens/personagens/Siu.png'
  );
}
window.storyNode_dungeon_f5_siu_1 = storyNode_dungeon_f5_siu_1;

function storyNode_dungeon_f5_siu_insiste() {
  setScene('dungeon-fase5');
  hideEnemy();
  setStory('SIU — SACERDOTISA DAS SOMBRAS',
    `Ela te olha por um longo momento.\n\n"Não vou parar." Ela repete suas palavras, devagar. "Quantos disseram isso aqui. Quantos acreditaram nisso."\n\nMas ela dá um passo para o lado.\n\n"Talvez você seja diferente. Ou talvez eu esteja curiosa para ver até onde isso vai." Uma expressão que não é bem um sorriso. "O que espera na próxima parte desta dungeon não foi construído por mim. Boa sorte com o que o rei enviou."`,
    [
      { icon:'🚶', text:'"O rei?"', action: storyNode_dungeon_f5_siu_cede },
    ], 'Imagens/personagens/Siu.png'
  );
}
window.storyNode_dungeon_f5_siu_insiste = storyNode_dungeon_f5_siu_insiste;

function storyNode_dungeon_f5_siu_lembra() {
  setScene('dungeon-fase5');
  hideEnemy();
  setStory('SIU — SACERDOTISA DAS SOMBRAS',
    `Ela para.\n\nUma expressão atravessa o rosto dela — rápida demais para nomear. Não é irritação. É algo mais próximo de ser surpreendida consigo mesma.\n\n"...Eu disse isso." Ela concede, baixinho.\n\nUm silêncio.\n\n"Você ouviu com mais atenção do que eu esperava." Ela vira o rosto levemente. "A maioria que chega até aqui não escuta. Apenas reage."\n\nEla dá um passo para o lado, liberando o caminho.\n\n"O que vem a seguir não é meu. É do rei. Prepare-se para encontrar o que ele enviou para te impedir."`,
    [
      { icon:'🚶', text:'"O rei enviou algo aqui dentro?"', action: storyNode_dungeon_f5_siu_cede },
    ], 'Imagens/personagens/Siu.png'
  );
}
window.storyNode_dungeon_f5_siu_lembra = storyNode_dungeon_f5_siu_lembra;

function storyNode_dungeon_f5_siu_cede() {
  setScene('dungeon-fase5');
  hideEnemy();
  setStory('SIU — SACERDOTISA DAS SOMBRAS',
    `"O Lich Valdris não controla apenas o castelo." Ela fala com uma calma que não é indiferença — é o tipo de calma de quem carrega um segredo faz muito tempo. "Ele estende influência por baixo da terra. Infiltrou agentes nos corredores mais fundos desta dungeon há décadas."\n\n"Seis guardas do rei. E um lorde — Kakuri Muichi. Um espadachim que morreu a serviço do rei e foi reanimado como lâmina viva." Uma pausa. "Rápido. Preciso. Não luta com força — luta com corte."\n\nOs olhos dela encontram os seus uma última vez.\n\n"Agora vá. E desta vez..." — algo na voz dela se suaviza um pouco — "...volte vivo."`,
    [
      { icon:'🚪', text:'Avançar para a Fase 6', action: storyNode_dungeon_fase6_intro },
    ], 'Imagens/personagens/Siu.png'
  );
}
window.storyNode_dungeon_f5_siu_cede = storyNode_dungeon_f5_siu_cede;

// ─────────────────────────────────────────────────────────────
//  FASE 6 — Silhueta do Rei / Lâminas do Rei (D6.png)
//  Silhueta do Rei → 6 Guardas + Kakuri Muichi (leve)
// ─────────────────────────────────────────────────────────────

const _DS_GUARDA_REI = {
  id: 'guarda_rei_dungeon', name: 'Guarda do Rei', icon: '⚔️',
  hp: 140, atk: 20, def: 8, xp: 45, gold: 22, isBoss: false,
  elemento: 'sombra',
  img: 'Imagens/personagens/sombra.png',
  desc: 'Soldado reanimado a serviço do Lich. Obediente até a destruição.',
  loot: [{ id:'emblema_rei', name:'Emblema do Rei Maldito', icon:'👑', imgSrc:'Imagens/icones/materiais/poCrista.png', chance:0.4, weight:0.2, type:'material', desc:'Insígnia de um servo do Lich.' }],
};

const _DS_MUICHI = {
  id: 'kakuri_muichi', name: 'Kakuri Muichi', icon: '💀',
  hp: 380, atk: 34, def: 8, xp: 280, gold: 120, isBoss: true,
  elemento: 'vento',
  img: 'Imagens/personagens/muichi.png',
  desc: 'Espadachim lendário ressuscitado como lorde do Lich. Ágil como o vento — a lâmina corta o ar antes mesmo de você perceber o movimento. Passiva: golpes críticos frequentes.',
  passiva: 'critico_alto',
  critico_chance: 0.35,
  critico_mult: 1.8,
  loot: [
    { id:'katana_muichi', name:'Katana de Muichi', icon:'🗡️', imgSrc:'Imagens/icones/materiais/poCrista.png', chance:1.0, weight:1.5, type:'material', desc:'Lâmina do espadachim lendário. Ainda afiada após séculos.' },
  ],
};

function _getDS6Progress() {
  if (!G.dungeonSombras) G.dungeonSombras = {};
  if (!G.dungeonSombras.f6) G.dungeonSombras.f6 = { kills: 0, muichiDefeated: false };
  return G.dungeonSombras.f6;
}

function storyNode_dungeon_fase6_intro() {
  setScene('dungeon-fase6');
  hideEnemy();
  const prog = _getDS6Progress();
  prog.kills = 0;
  prog.muichiDefeated = false;
  addLog('Fase 6 — Silhueta do Rei. Lâminas do Lich.', 'info');
  setStory('NARRADOR',
    `Você entra na câmara e para.\n\nNo fundo da sala, projetada contra a pedra escura pela luz fraca das tochas, há uma silhueta.\n\nAlta. Com coroa. Manto longo arrastando no chão.\n\nEla não se move. Não fala. Apenas... está lá. Como uma sombra que decidiu ter forma.\n\nEntão uma voz chega — não de dentro da sala, mas de dentro da sua cabeça:\n\n"Você foi longe demais, intruso. Meus guardas vão corrigir isso."`,
    [
      { icon:'👁', text:'Encarar a silhueta', action: storyNode_dungeon_f6_silhueta },
    ]
  );
}
window.storyNode_dungeon_fase6_intro = storyNode_dungeon_fase6_intro;

function storyNode_dungeon_f6_silhueta() {
  setScene('dungeon-fase6');
  hideEnemy();
  setStory('NARRADOR',
    `Você avança em direção à silhueta — e ela se dissolve.\n\nNão era ele. Era apenas uma projeção. Uma presença à distância, observando por um instante antes de virar as costas para você.\n\nMas os guardas que ele enviou são bem reais.\n\nSeis figuras emergem das sombras laterais da câmara. Armaduras pesadas. Brasão antigo. Olhos vazios.\n\nAtrás deles, parado com os braços ao longo do corpo e uma katana no cinto, há uma figura diferente — mais magra, mais quieta. Ossos visíveis. Postura de quem já lutou mil vezes e não tem mais nada a provar.\n\nEle te olha.\n\n"Kakuri Muichi." O nome parece já estar no ar antes de você pensar nele.`,
    [
      { icon:'⚔', text:'Enfrentar os Guardas do Rei', action: storyNode_dungeon_f6_guardas },
    ]
  );
}
window.storyNode_dungeon_f6_silhueta = storyNode_dungeon_f6_silhueta;

function storyNode_dungeon_f6_guardas() {
  setScene('dungeon-fase6');
  const prog = _getDS6Progress();
  const num = prog.kills + 1;
  const obs = num === 4
    ? '\n\nMuichi ainda não se mexeu. Só observa.' : '';
  setStory('NARRADOR',
    `Guarda do Rei ${num}/6 avança.${obs}`,
    [
      { icon:'⚔', text:`Batalhar! (${num}/6)`, action: () => {
        _dsSetBattle(function() {
          prog.kills++;
          if (prog.kills < 6) {
            storyNode_dungeon_f6_guardas();
          } else {
            storyNode_dungeon_f6_pre_muichi();
          }
        }, { ..._DS_GUARDA_REI });
      }},
    ]
  );
}
window.storyNode_dungeon_f6_guardas = storyNode_dungeon_f6_guardas;

function storyNode_dungeon_f6_pre_muichi() {
  setScene('dungeon-fase6');
  hideEnemy();
  notify('⚔ Seis guardas caídos. Kakuri Muichi avança.', 'gold');
  addLog('Fase 6 — 6 guardas derrotados. Muichi se prepara.', 'xp');
  setStory('NARRADOR',
    `Os seis guardas caem um a um.\n\nMuichi não tentou ajudá-los. Ficou onde estava, de braços ao lado do corpo, olhando cada combate com atenção fria.\n\nAgora ele dá um único passo à frente.\n\nA katana sai do cinto em um movimento tão rápido que você quase não vê — o vento que ela corta chega antes do som.\n\n"Você não é ruim." A voz é seca. Sem elogio. Só constatação. "Mas eu sou mais rápido."\n\nEle assume postura. Levíssimo. Pés no lugar certo. Lâmina apontada de lado.\n\nO ar ao redor da katana vibra.`,
    [
      { icon:'💀', text:'Enfrentar Kakuri Muichi!', action: storyNode_dungeon_f6_muichi },
    ]
  );
}
window.storyNode_dungeon_f6_pre_muichi = storyNode_dungeon_f6_pre_muichi;

function storyNode_dungeon_f6_muichi() {
  setScene('dungeon-fase6');
  G._dungeonEnemyPassiva = { tipo: 'critico_alto', chance: _DS_MUICHI.critico_chance, mult: _DS_MUICHI.critico_mult };
  _dsSetBattle(function() {
    G._dungeonEnemyPassiva = null;
    _getDS6Progress().muichiDefeated = true;
    storyNode_dungeon_f6_vitoria();
  }, { ..._DS_MUICHI });
}
window.storyNode_dungeon_f6_muichi = storyNode_dungeon_f6_muichi;

function storyNode_dungeon_f6_vitoria() {
  setScene('dungeon-fase6');
  hideEnemy();
  notify('✦ Fase 6 concluída! Kakuri Muichi derrotado.', 'gold');
  addLog('Fase 6 — Kakuri Muichi derrotado. Acesso à Fase 7 liberado.', 'xp');
  setStory('NARRADOR',
    `Muichi recua um passo. A katana baixa levemente.\n\nEle olha para a lâmina. Depois para você.\n\n"...Não esperava isso."\n\nSem dramatismo. Sem raiva. Ele inclina a cabeça uma vez — o mesmo gesto de quando você entrou — e então some. Não cai. Não explode. Simplesmente... deixa de estar lá.\n\nA câmara fica vazia. As tochas se apagam uma a uma.\n\nUma nova passagem se abre na parede do fundo.`,
    [
      { icon:'🚪', text:'Avançar para a Fase 7', action: storyNode_dungeon_fase7_intro },
    ]
  );
}
window.storyNode_dungeon_f6_vitoria = storyNode_dungeon_f6_vitoria;

// ─────────────────────────────────────────────────────────────
//  FASE 7 — A Interrupção de Yuki (sem batalha)
//  Yuki, sacerdotisa de luz e irmã gêmea de Siu, projeta-se à
//  distância usando uma técnica antiga, impede um combate que
//  estava prestes a começar e concede um buff temporário que
//  dura até o fim da dungeon: ATQ +3 e Crítico +7%.
// ─────────────────────────────────────────────────────────────

// Concede o Amuleto da Bênção de Yuki — item de verdade na bolsa, equipado
// automaticamente, mesmo padrão do Amuleto de Tierra (bônus aplicado direto
// em p.atk/p.critBonus + _accBonusApplied:true pra não duplicar depois).
function _dsApplyYukiBuff() {
  if (!G.dungeonSombras) G.dungeonSombras = {};
  if (G.dungeonSombras.yukiBuffActive) return; // já concedido — não duplicar
  G.dungeonSombras.yukiBuffActive = true;

  const p = G.player;
  p.atk = (p.atk || 0) + 3;
  p.critBonus = (p.critBonus || 0) + 0.07;

  if (typeof addItem === 'function') {
    addItem({ id: 'amuleto_yuki', equipped: true, _accBonusApplied: true }, 1);
  } else if (p.inventory) {
    p.inventory.push({ id:'amuleto_yuki', name:'Amuleto da Bênção de Yuki', icon:'✨',
      imgSrc:'Imagens/icones/materiais/Picsart_26-06-20_18-03-20-806.png',
      qty:1, weight:0.3, type:'equipamento', equipSlot:'acessorio', equipped:true,
      _accBonusApplied:true, atk:3, crit:7,
      desc:'Pingente de luz formado pela bênção de Yuki. A ligação se desfaz ao sair desta dungeon.' });
  }

  if (typeof updateHUD === 'function') updateHUD();
  if (typeof buildInventoryGrid === 'function') buildInventoryGrid();
  if (typeof updateEquippedGearHUD === 'function') updateEquippedGearHUD();
}
window._dsApplyYukiBuff = _dsApplyYukiBuff;

// Desfaz a bênção de Yuki e remove o amuleto da bolsa. Chamar sempre que o
// jogador deixar a dungeon (retorno ao vilarejo ou conclusão final) — nunca
// entre fases. Checa item.equipped pra não subtrair o bônus duas vezes caso
// o jogador já tenha desequipado o amuleto manualmente pela bolsa.
function _dsRevertYukiBuff() {
  if (!G.dungeonSombras || !G.dungeonSombras.yukiBuffActive) return;
  G.dungeonSombras.yukiBuffActive = false;

  const p = G.player;
  if (!p || !p.inventory) return;
  const idx = p.inventory.findIndex(i => i.id === 'amuleto_yuki');
  if (idx === -1) return; // amuleto já não está mais na bolsa

  const item = p.inventory[idx];
  if (item.equipped) {
    if (item.atk)  p.atk = Math.max(0, (p.atk || 0) - item.atk);
    if (item.crit) p.critBonus = Math.max(0, (p.critBonus || 0) - item.crit / 100);
  }
  p.inventory.splice(idx, 1); // a bênção se desfaz fora da dungeon

  if (typeof updateHUD === 'function') updateHUD();
  if (typeof buildInventoryGrid === 'function') buildInventoryGrid();
  if (typeof updateEquippedGearHUD === 'function') updateEquippedGearHUD();
}
window._dsRevertYukiBuff = _dsRevertYukiBuff;

function storyNode_dungeon_fase7_intro() {
  setScene('dungeon-fase6');
  hideEnemy();
  addLog('Fase 7 — A passagem da Sacerdotisa.', 'info');
  setStory('NARRADOR',
    `A passagem seguinte é estreita, quase um corredor de sepultura. No fundo, você sente algo se formando antes mesmo de enxergar — uma pressão no ar parecida com a da silhueta do rei, na fase anterior. Mas diferente. Mais quente.\n\nVultos começam a ganhar forma nas sombras à frente — figuras armadas, prontas para fechar o caminho.\n\nE então, no meio do processo, tudo simplesmente... para.`,
    [
      { icon:'✨', text:'Observar o que está acontecendo', action: storyNode_dungeon_fase7_yuki },
    ]
  );
}
window.storyNode_dungeon_fase7_intro = storyNode_dungeon_fase7_intro;

function storyNode_dungeon_fase7_yuki() {
  setScene('dungeon-fase6');
  hideEnemy();
  setStory('YUKI — SACERDOTISA DA LUZ',
    `As sombras que ganhavam forma se desfazem em fumaça antes de terminar. No lugar delas, uma luz suave pulsa no ar — calma, mas firme — desenhando aos poucos o contorno de uma mulher de véu e vestes claras.\n\n"Não é uma ilusão completa. Não tenho corpo aqui, só voz e um pouco de vontade." Ela sorri, visivelmente cansada. "Não uso esta técnica há anos. Ela cobra um preço."\n\nEla observa você com atenção, quase reconhecendo algo familiar.\n\n"Eu sou Yuki. Imagino que minha irmã já tenha falado de mim — à maneira dela."`,
    [
      { icon:'🗣', text:'"Você é a irmã de Siu..."', action: storyNode_dungeon_fase7_yuki2 },
    ], 'Imagens/personagens/Syuki.png'
  );
}
window.storyNode_dungeon_fase7_yuki = storyNode_dungeon_fase7_yuki;

function storyNode_dungeon_fase7_yuki2() {
  setScene('dungeon-fase6');
  hideEnemy();
  setStory('YUKI — SACERDOTISA DA LUZ',
    `"Sim." Algo na voz dela se aperta levemente ao dizer isso. "E sinto cada passo seu nesta dungeon desde que cruzou o portão — a luz que você carrega, mesmo sem perceber, ecoa até o templo onde eu sirvo."\n\n"As figuras que se formavam à sua frente não eram parte do equilíbrio da minha irmã. Eram uma armadilha do Rei Maldito, plantada para pegar de surpresa quem sobrevivesse até aqui." Uma pausa. "Não deixei que se completassem. É só isso que ainda consigo fazer por você, daqui de onde estou."\n\nA luz ao redor dela vacila, como uma vela sob vento fraco.`,
    [
      { icon:'🗣', text:'"Obrigado, Yuki."', action: storyNode_dungeon_fase7_buff },
    ], 'Imagens/personagens/Syuki.png'
  );
}
window.storyNode_dungeon_fase7_yuki2 = storyNode_dungeon_fase7_yuki2;

function storyNode_dungeon_fase7_buff() {
  setScene('dungeon-fase6');
  hideEnemy();
  _dsApplyYukiBuff();
  notify('✨ Amuleto da Bênção de Yuki obtido! ATQ+3 e Crítico+7% até o fim da dungeon.', 'gold');
  addLog('Fase 7 — Yuki concedeu o Amuleto da Bênção (ATQ+3, Crítico+7%).', 'xp');
  setStory('YUKI — SACERDOTISA DA LUZ',
    `Ela ergue a mão na sua direção. A luz ao redor dela se afina, escorre pelo ar como um fio, e se condensa diante do seu peito — um pequeno pingente, quente ao toque, pulsando fraco como um coração emprestado.\n\n"Isso vai durar apenas até o fim desta dungeon. Quando a ligação se romper, o amuleto vai se apagar com ela — e eu não consigo renová-lo." A voz dela já começa a se dissipar junto com a forma. "Mas deve bastar para o que vem a seguir. Eu espero."\n\nA imagem dela esmaece como fumaça ao vento.\n\n"Cuide-se. E... obrigada por ouvir Siu sem julgá-la."`,
    [
      { icon:'🚪', text:'Avançar para a Fase 8', action: storyNode_dungeon_fase8_intro },
    ]
  );
}
window.storyNode_dungeon_fase7_buff = storyNode_dungeon_fase7_buff;

// ─────────────────────────────────────────────────────────────
//  FASE 8 — O Duelo da Sacerdotisa Negra (D8.png)
//  Batalha real contra Siu. Passiva "siu_dreno_cura":
//    • Todo ataque dela (normal ou especial) cura 7% do dano causado.
//    • Toda cura que VOCÊ recebe também cura 30% daquele valor para ela.
//    • Barra de vida azul (feiticeira).
//  Vitória: Siu não morre de verdade — vira pedra e desaparece até
//  regenerar, abrindo o caminho para a Fase 9. Concede a Pedra da
//  Sacerdotisa Negra (+7% de cura permanente) e 150 de ouro.
// ─────────────────────────────────────────────────────────────

const _DS_SIU_NEGRA = {
  id: 'siu_sacerdotisa_negra', name: 'Siu — Sacerdotisa Negra', icon: '🌑',
  hp: 550, atk: 30, def: 12, xp: 450, gold: 150, isBoss: true,
  elemento: 'magia_negra',
  img: 'Imagens/personagens/Siu.png',
  vidaAzul: true,
  desc: 'A irmã gêmea de Yuki, sacerdotisa do equilíbrio sombrio. Toda magia que ela lança devolve um pouco de vida — inclusive a sua, se você ousar se curar perto dela.',
  passiva: 'siu_dreno_cura',
  loot: [],
};

function _getDS8Progress() {
  if (!G.dungeonSombras) G.dungeonSombras = {};
  if (!G.dungeonSombras.f8) G.dungeonSombras.f8 = { siuDefeated: false, stoneGranted: false };
  return G.dungeonSombras.f8;
}

// Concede a Pedra da Sacerdotisa Negra — bônus permanente de +7% em toda
// cura recebida pelo jogador, independente de a pedra estar equipada ou
// não (diferente do Amuleto de Yuki, este vínculo não se desfaz).
function _dsApplySiuStone() {
  const prog = _getDS8Progress();
  if (prog.stoneGranted) return; // já concedida — não duplicar
  prog.stoneGranted = true;

  const p = G.player;
  p._pedraSiuBonusCura = (p._pedraSiuBonusCura || 0) + 0.07;

  if (typeof addItem === 'function') {
    addItem({ id: 'pedra_sacerdotisa_negra', equipped: true, _accBonusApplied: true }, 1);
  } else if (p.inventory) {
    p.inventory.push({ id:'pedra_sacerdotisa_negra', name:'Pedra da Sacerdotisa Negra', icon:'🔮',
      imgSrc:'Imagens/icones/materiais/Picsart_26-06-20_18-03-20-806.png',
      qty:1, weight:0.5, type:'equipamento', equipSlot:'acessorio', equipped:true,
      _accBonusApplied:true,
      desc:'Fragmento de pedra negra que pulsa com a essência de Siu. Sua cura é 7% mais eficaz, para sempre.' });
  }

  if (typeof updateHUD === 'function') updateHUD();
  if (typeof buildInventoryGrid === 'function') buildInventoryGrid();
  if (typeof updateEquippedGearHUD === 'function') updateEquippedGearHUD();
}
window._dsApplySiuStone = _dsApplySiuStone;

function storyNode_dungeon_fase8_intro() {
  setScene('dungeon-fase8');
  hideEnemy();
  addLog('Fase 8 — O Duelo da Sacerdotisa Negra.', 'info');
  setStory('NARRADOR',
    `A passagem se abre numa câmara diferente de todas as outras.\n\nNão há corredores laterais, não há colunas para se esconder. Apenas um círculo gravado no chão de pedra negra, brilhando fracamente em roxo — como se tivesse sido desenhado especificamente para você.\n\nO peso no ar que Siu mencionou na Fase 4 está de volta. Mas desta vez é diferente. Mais denso. Mais... pessoal.\n\nVocê sente que ela está esperando do outro lado do círculo, mesmo sem vê-la ainda.`,
    [
      { icon:'⚫', text:'Entrar no círculo', action: storyNode_dungeon_f8_siu_confronto },
    ]
  );
}
window.storyNode_dungeon_fase8_intro = storyNode_dungeon_fase8_intro;

function storyNode_dungeon_f8_siu_confronto() {
  setScene('dungeon-fase8');
  hideEnemy();
  setStory('SIU — SACERDOTISA DAS SOMBRAS',
    `Ela está lá no centro, esperando — desta vez sem trono, sem distância. De pé, vestes escuras imóveis mesmo sem vento.\n\n"Você passou pela projeção da minha irmã. Sobreviveu a Muichi. Carregou a bênção dela até aqui." Os olhos de Siu brilham fraco, roxo-escuro. "Impressionante. Mas Yuki só pode te proteger até onde a luz dela alcança. E aqui... a luz não alcança."\n\nEla ergue uma mão. O círculo sob os pés de vocês dois pulsa, fechando qualquer saída.\n\n"Desta vez não vou apenas cobrar uma passagem. Desta vez, você luta comigo. De verdade."`,
    [
      { icon:'❓', text:'"Por que agora, e não antes?"', action: storyNode_dungeon_f8_siu_motivo },
    ], 'Imagens/personagens/Siu.png'
  );
}
window.storyNode_dungeon_f8_siu_confronto = storyNode_dungeon_f8_siu_confronto;

function storyNode_dungeon_f8_siu_motivo() {
  setScene('dungeon-fase8');
  hideEnemy();
  setStory('SIU — SACERDOTISA DAS SOMBRAS',
    `"Porque o equilíbrio exige uma prova final antes de deixar qualquer um seguir para o que vem depois de mim." A voz dela é calma, quase gentil — o que torna mais perturbador. "Não posso simplesmente confiar nas suas palavras sobre o Lich. Preciso sentir sua força."\n\nEla gira o pulso. Magia escura se enrola entre os dedos como fumaça viva.\n\n"Um aviso, já que você foi honesto comigo antes: minha magia se alimenta de tudo que toca. Inclusive da cura mais gentil." Um leve sorriso, sem crueldade. "Cuidado com o que você cura perto de mim. Eu sinto cada gota."`,
    [
      { icon:'⚔', text:'"Estou pronto."', action: storyNode_dungeon_f8_pre_batalha },
    ], 'Imagens/personagens/Siu.png'
  );
}
window.storyNode_dungeon_f8_siu_motivo = storyNode_dungeon_f8_siu_motivo;

function storyNode_dungeon_f8_pre_batalha() {
  setScene('dungeon-fase8');
  hideEnemy();
  notify('🌑 Siu — Sacerdotisa Negra desperta para o duelo.', 'purple');
  setStory('NARRADOR',
    `Siu recua um passo e assume posição. A fumaça escura ao redor das mãos dela se condensa em runas que giram lentamente no ar.\n\nO círculo sob seus pés brilha mais forte.\n\nNão há mais palavras a trocar.`,
    [
      { icon:'💀', text:'Enfrentar Siu — Sacerdotisa Negra!', action: storyNode_dungeon_f8_batalha },
    ]
  );
}
window.storyNode_dungeon_f8_pre_batalha = storyNode_dungeon_f8_pre_batalha;

function storyNode_dungeon_f8_batalha() {
  setScene('dungeon-fase8');
  G._dungeonEnemyPassiva = { tipo: 'siu_dreno_cura', curaPctAtaque: 0.07, curaPctRoubo: 0.3 };
  battleState._siuLastPlayerHp = null; // recalibrado no início da batalha
  _dsSetBattle(function() {
    G._dungeonEnemyPassiva = null;
    _getDS8Progress().siuDefeated = true;
    storyNode_dungeon_f8_vitoria();
  }, { ..._DS_SIU_NEGRA });
}
window.storyNode_dungeon_f8_batalha = storyNode_dungeon_f8_batalha;

function storyNode_dungeon_f8_vitoria() {
  setScene('dungeon-fase8');
  hideEnemy();
  _dsApplySiuStone();
  notify('🌑 Siu foi derrotada... mas algumas coisas não morrem de verdade.', 'purple');
  notify('🔮 Pedra da Sacerdotisa Negra obtida! Cura +7% permanente. +150 moedas.', 'gold');
  addLog('Fase 8 — Siu derrotada. Pedra da Sacerdotisa Negra obtida. Acesso à Fase 9 liberado.', 'xp');
  setStory('NARRADOR',
    `Siu cai de joelhos. A fumaça escura ao redor dela se desfaz, e pela primeira vez você a vê verdadeiramente cansada — não derrotada como um inimigo qualquer, mas exaurida, como quem perdeu algo que não vai recuperar tão cedo.\n\n"Você é forte." Ela ergue os olhos. Não há rancor neles. "Mais forte do que eu esperava."\n\nUma nova mensagem se forma no ar entre vocês, quase como se a própria dungeon falasse:\n\n"SIU NÃO PODE MORRER ATÉ QUE SUA IRMÃ TAMBÉM MORRA. O EQUILÍBRIO ASSIM EXIGE."\n\nO corpo dela começa a endurecer, veias de pedra negra subindo pela pele como rachaduras de cristal. Ela não grita. Não resiste.\n\n"Continue..." A voz já soa distante, presa em pedra. "Eu vou estar aqui. Sempre vou estar aqui. Até o dia em que Yuki também cair — e nesse dia, nenhuma de nós vai mais precisar lutar."\n\nA estátua de pedra negra que já foi Siu racha ao meio e desmorona em pó fino, que se dissolve no ar antes de tocar o chão. Onde ela estava, resta apenas um fragmento de pedra pulsando fraco — a mesma essência dela, agora em suas mãos.\n\nO círculo no chão se apaga. Uma nova passagem se abre na parede ao fundo, revelando um corredor que nenhuma luz alcança por completo.\n\nA Fase 9 aguarda.`,
    [
      { icon:'🚪', text:'Avançar para a Fase 9', action: storyNode_dungeon_fase9_intro },
    ]
  );
}
window.storyNode_dungeon_f8_vitoria = storyNode_dungeon_f8_vitoria;

// ─────────────────────────────────────────────────────────────
//  FASE 9 — (Em construção)
// ─────────────────────────────────────────────────────────────

function storyNode_dungeon_fase9_intro() {
  setScene('dungeon-fase8');
  hideEnemy();
  addLog('Fase 9 — Em breve...', 'info');
  setStory('NARRADOR',
    `Você avança pela passagem.\n\nO ar aqui é diferente — mais pesado, mais antigo. Como se o tempo passasse de forma diferente do outro lado.\n\nA Fase 9 aguarda. Prepare-se.`,
    [
      { icon:'↩', text:'Retornar ao vilarejo para descansar', action: () => {
        setScene('vilarejo');
        G.dungeonSombrasBloqueio = false;
        if (typeof _dsRevertYukiBuff === 'function') _dsRevertYukiBuff(); // a bênção de Yuki não sobrevive fora da dungeon
        if (typeof storyNode_vilarejo === 'function') storyNode_vilarejo();
        notify('🌑 A Dungeon das Sombras aguarda seu retorno...', 'purple');
      }},
    ]
  );
}
window.storyNode_dungeon_fase9_intro = storyNode_dungeon_fase9_intro;
