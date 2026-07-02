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
  hp: 40, atk: 12, def: 4, xp: 18, gold: 8, isBoss: false,
  img: 'Imagens/personagens/file_0000000013d4720ebe453f8960ea84f4.png',
  desc: 'Um fragmento de escuridão que ganhou forma. Lento, mas persistente.',
  loot: [{ id:'po_sombra', name:'Pó de Sombra', icon:'🌑', imgSrc:'Imagens/icones/materiais/poCrista.png', chance:0.6, weight:0.1, type:'material', desc:'Resíduo das criaturas das sombras.' }],
};
const _DS_ESPECTRO_MENOR = {
  id: 'espectro_menor', name: 'Espectro Menor', icon: '👻',
  hp: 35, atk: 14, def: 3, xp: 20, gold: 10, isBoss: false,
  img: 'Imagens/personagens/file_00000000247c71f58871ae58a3990a1d.png',
  desc: 'Alma perdida presa entre os mundos. Ataca com frio sobrenatural.',
  loot: [{ id:'po_sombra', name:'Pó de Sombra', icon:'🌑', imgSrc:'Imagens/icones/materiais/poCrista.png', chance:0.5, weight:0.1, type:'material', desc:'Resíduo das criaturas das sombras.' }],
};
const _DS_GUARDIAO_CRISTAL = {
  id: 'guardiao_cristal', name: 'Guardião de Cristal', icon: '💎',
  hp: 55, atk: 10, def: 12, xp: 25, gold: 12, isBoss: false,
  img: 'Imagens/personagens/sombra.png',
  desc: 'Construto de cristal negro que protege os corredores internos.',
  loot: [{ id:'fragmento_cristal', name:'Fragmento de Cristal Negro', icon:'🔮', imgSrc:'Imagens/icones/materiais/poCrista.png', chance:0.4, weight:0.3, type:'material', desc:'Cristal da dungeon das sombras.' }],
};

// Mini-Boss Fase 1
const _DS_MINIBOSS_D1 = {
  id: 'sentinela_sombras', name: 'Sentinela das Sombras', icon: '🗡️',
  hp: 180, atk: 22, def: 14, xp: 80, gold: 40, isBoss: true,
  img: 'Imagens/personagens/sombra.png',
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
//  4 zombies + mini-boss Olho Espectral
// ─────────────────────────────────────────────────────────────

// Inimigos da Fase 2
const _DS_ZOMBIE = {
  id: 'zombie_sombras', name: 'Zombie das Sombras', icon: '🧟',
  hp: 70, atk: 16, def: 6, xp: 30, gold: 14, isBoss: false,
  img: 'Imagens/personagens/sombra.png',
  desc: 'Corpo reanimado pela magia negra da dungeon. Lento, resistente, implacável.',
  loot: [{ id:'osso_podre', name:'Osso Podre', icon:'🦴', imgSrc:'Imagens/icones/materiais/poCrista.png', chance:0.5, weight:0.4, type:'material', desc:'Osso de um zombie das sombras.' }],
};

// Mini-Boss Fase 2
const _DS_OLHO_ESPECTRAL = {
  id: 'olho_espectral', name: 'Olho Espectral', icon: '👁️',
  hp: 600, atk: 28, def: 10, xp: 200, gold: 90, isBoss: true,
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
    `A porta se fecha atrás de você.\n\nA câmara é enorme — colunas de pedra negra se perdem no teto invisível, e o chão é coberto de névoa baixa e cinzenta.\n\nEntão você vê os corpos. Espalhados pelo chão, imóveis. Quatro deles.\n\nMas antes que você possa dar mais dois passos, eles se levantam.\n\nE no centro da câmara, suspenso no ar, um olho colossal se abre lentamente — uma pupila vertical, brilhando em roxo escuro. Ele te observa. Você sente sua presença dentro da sua cabeça.`,
    [
      { icon:'⚔', text:'Enfrentar os zombies primeiro', action: storyNode_dungeon_f2_zombies },
    ]
  );
}
window.storyNode_dungeon_fase2_intro = storyNode_dungeon_fase2_intro;

function storyNode_dungeon_f2_zombies() {
  setScene('dungeon-fase2');
  const prog = _getDS2Progress();
  const inimigo = { ..._DS_ZOMBIE };
  setStory('NARRADOR',
    `Um Zombie das Sombras avança com passos pesados e irregulares.\n\n${inimigo.desc}\n\n(${prog.kills + 1}/4 zombies)`,
    [
      { icon:'⚔', text:'Batalhar contra o Zombie!', action: () => {
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
  addLog('Fase 2 — 4 zombies derrotados. Olho Espectral ativado.', 'xp');
  setStory('NARRADOR',
    `Os quatro zombies jazem imóveis no chão da câmara.\n\nO Olho Espectral não se move. Mas você sente — uma pressão crescente dentro do crânio, como se algo tentasse entrar.\n\n\"Você destruiu meus servos.\" A voz não vem de fora. Ela ressoa diretamente na sua mente. \"Agora veja o que é enfrentar algo que não pode ser cortado por aço.\"\n\nA pupila vertical se expande.\n\nO ataque psíquico começa.`,
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
//  2 Ogros: Ogro de Terra + Ogro de Granito
// ─────────────────────────────────────────────────────────────

const _DS_OGRO_TERRA = {
  id: 'ogro_terra', name: 'Ogro de Terra', icon: '🗿',
  hp: 1000, atk: 18, def: 8, xp: 150, gold: 60, isBoss: false,
  img: 'Imagens/personagens/sombra.png',
  desc: 'Colosso feito de lama comprimida e raízes negras. Lento, mas cada golpe abala o chão inteiro.',
  loot: [{ id:'argila_sombria', name:'Argila Sombria', icon:'🟫', imgSrc:'Imagens/icones/materiais/poCrista.png', chance:0.8, weight:1.0, type:'material', desc:'Terra densa da dungeon. Material raro.' }],
};

const _DS_OGRO_GRANITO = {
  id: 'ogro_granito', name: 'Ogro de Granito', icon: '🪨',
  hp: 1000, atk: 20, def: 14, xp: 160, gold: 65, isBoss: false,
  img: 'Imagens/personagens/sombra.png',
  desc: 'Carne de pedra cinzenta. Praticamente imune ao frio. Prefere esmagar a cortar.',
  loot: [{ id:'granito_sombrio', name:'Granito Sombrio', icon:'⬛', imgSrc:'Imagens/icones/materiais/poCrista.png', chance:0.8, weight:1.5, type:'material', desc:'Fragmento do Ogro de Granito. Dureza excepcional.' }],
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
    `A terceira câmara é diferente das anteriores.\n\nO teto é alto demais para ser visto. As paredes estão cobertas de marcas — não escritas, mas esculpidas por algo grande demais para usar mãos humanas.\n\nEntão você os vê.\n\nDois gigantes. Um feito de terra comprimida e raízes escuras, o outro de pedra cinzenta maciça. Eles não correm. Não precisam. Eles apenas giram as cabeças pesadas na sua direção e começam a se mover.\n\nLentos. Inevitáveis.`,
    [
      { icon:'⚔', text:'Enfrentar o Ogro de Terra primeiro', action: storyNode_dungeon_f3_ogro1 },
    ]
  );
}
window.storyNode_dungeon_fase3_intro = storyNode_dungeon_fase3_intro;

function storyNode_dungeon_f3_ogro1() {
  setScene('dungeon-fase3');
  setStory('NARRADOR',
    `O Ogro de Terra se posiciona à sua frente, bloqueando a passagem.\n\nCada passo seu faz a câmara vibrar. A lama escura que compõe seu corpo pulsa como se estivesse viva.\n\nEle levanta os braços.`,
    [
      { icon:'⚔', text:'Batalhar contra o Ogro de Terra! (1000 HP)', action: () => {
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
  notify('🗿 Ogro de Terra derrotado. O segundo avança.', 'gold');
  setStory('NARRADOR',
    `O Ogro de Terra racha — uma fissura percorre seu torso do ombro à cintura — e desmorona em pedaços de lama e raiz que se dissolvem no chão.\n\nO silêncio dura exatamente dois segundos.\n\nEntão o Ogro de Granito dá um passo à frente. O impacto do pé no chão solta poeira do teto invisível lá em cima.\n\nEle não está com raiva. Está apenas... cumprindo uma função.`,
    [
      { icon:'⚔', text:'Enfrentar o Ogro de Granito! (1000 HP)', action: storyNode_dungeon_f3_ogro2 },
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
    `O Ogro de Granito cai de joelhos — o impacto abre rachaduras no chão de pedra ao seu redor — e então se imobiliza. Estátua. Silêncio.\n\nVocê está de pé. Ainda respirando.\n\nAtrás dos dois gigantes caídos, uma abertura na parede — não uma porta, apenas a pedra que se partiu sozinha — revela um corredor diferente. Não há escuridão lá. Há uma luz estranha. Quieta.\n\nComo a presença de algo que está esperando há muito tempo.`,
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
  hp: 120, atk: 22, def: 10, xp: 45, gold: 20, isBoss: false,
  img: 'Imagens/personagens/sombra.png',
  desc: 'Esqueleto animado pela vontade de Siu. Não pensa — apenas obedece. Um fantoche de osso e sombra.',
  loot: [{ id:'osso_siu', name:'Osso da Marionete', icon:'🦴', imgSrc:'Imagens/icones/materiais/poCrista.png', chance:0.7, weight:0.3, type:'material', desc:'Fragmento de um guarda de Siu.' }],
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
//  FASE 6 — Lâminas do Rei (D6.png)
//  6 Guardas do Rei + Lorde Kakuri Muichi (espadachim)
// ─────────────────────────────────────────────────────────────

const _DS_GUARDA_REI = {
  id: 'guarda_rei_dungeon', name: 'Guarda do Rei', icon: '⚔️',
  hp: 90, atk: 19, def: 8, xp: 35, gold: 16, isBoss: false,
  img: 'Imagens/personagens/sombra.png',
  desc: 'Soldado reanimado a serviço do Lich. Obediente até a destruição.',
  loot: [{ id:'emblema_rei', name:'Emblema do Rei Maldito', icon:'👑', imgSrc:'Imagens/icones/materiais/poCrista.png', chance:0.4, weight:0.2, type:'material', desc:'Insígnia de um servo do Lich.' }],
};

const _DS_MUICHI = {
  id: 'kakuri_muichi', name: 'Kakuri Muichi', icon: '💀',
  hp: 260, atk: 35, def: 8, xp: 220, gold: 95, isBoss: true,
  img: 'Imagens/personagens/muichi.png',
  desc: 'Espadachim lendário ressuscitado como lorde do Lich. Ágil como vento, preciso como agulha. Especialista em golpes críticos — cada corte calcula o ângulo exato da lâmina.',
  // Passiva de crítico — aplicada no AI do inimigo via campo especial
  passiva: 'critico_alto',
  critico_chance: 0.40,   // 40% chance de crítico
  critico_mult: 2.0,       // dano dobrado no crítico
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
  addLog('Fase 6 — Lâminas do Rei.', 'info');
  setStory('NARRADOR',
    `A câmara seguinte é diferente de todas as anteriores.\n\nNão tem cristais roxos. Não tem névoa. É iluminada por tochas comuns — laranjas, quentes, quase normais — como se pertencesse a outro lugar que foi instalado aqui à força.\n\nE no centro, seis figuras enfileiradas. Armaduras pesadas com o brasão do rei — mas não o rei atual. Um brasão antigo, de um rei que deveria estar morto.\n\nAtrás deles, parado com os braços cruzados e uma katana no cinto, há uma figura magra. Ossos visíveis através de roupa de combate desgastada. Olhos que não têm brilho de vida mas têm brilho de propósito.\n\nEle inclina a cabeça levemente quando te vê. Quase um cumprimento.\n\n"Kakuri Muichi." O nome ecoa sozinho.`,
    [
      { icon:'⚔', text:'Enfrentar os Guardas do Rei', action: storyNode_dungeon_f6_guardas },
    ]
  );
}
window.storyNode_dungeon_fase6_intro = storyNode_dungeon_fase6_intro;

function storyNode_dungeon_f6_guardas() {
  setScene('dungeon-fase6');
  const prog = _getDS6Progress();
  const num = prog.kills + 1;
  // A cada 3 guardas, Muichi observa
  const comentario = num === 3
    ? '\n\nMuichi observa em silêncio. Não interfere. Apenas analisa.'
    : num === 6
    ? '\n\nMuichi se desdobra dos braços cruzados devagar. Sua mão vai ao cabo da katana.'
    : '';
  setStory('NARRADOR',
    `Guarda do Rei ${num}/6 avança.${comentario}`,
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
    `Os seis guardas jazem no chão da câmara.\n\nMuichi não se apressou para ajudá-los. Ficou onde estava, observando cada golpe, cada movimento seu, com aqueles olhos sem vida mas cheios de cálculo.\n\nAgora ele dá um passo à frente. Tira a katana do cinto em um movimento tão suave que o metal quase não faz barulho.\n\n"Você é rápido." A voz dele é seca. Neutra. "Mas rápido não é suficiente contra uma lâmina que já mapeou seus padrões."\n\nEle assume posição de combate.\n\nA katana aponta para o chão. Os pés dele são precisos como régua.\n\n"Vamos ver se você consegue me surpreender."`,
    [
      { icon:'💀', text:'Enfrentar Kakuri Muichi!', action: storyNode_dungeon_f6_muichi },
    ]
  );
}
window.storyNode_dungeon_f6_pre_muichi = storyNode_dungeon_f6_pre_muichi;

function storyNode_dungeon_f6_muichi() {
  setScene('dungeon-fase6');
  // Injeta passiva de crítico alto no sistema de batalha
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
  addLog('Fase 6 — Kakuri Muichi derrotado. Acesso à Fase 8 liberado.', 'xp');
  setStory('NARRADOR',
    `Muichi cai de joelhos.\n\nA katana pousa no chão com um toque leve — quase cerimonial. Ele olha para a lâmina por um momento.\n\n"...Surpreendente." Ele diz. Não com raiva. Com algo que talvez seja respeito.\n\nE então o que resta dele se dissolve. Não em poeira — em silêncio. Como se ele simplesmente decidisse parar de existir.\n\nA câmara fica vazia. As tochas piscam uma vez e apagam.\n\nUma abertura se forma na parede do fundo — e pelo que dá para ver, o que está do outro lado é... diferente. Maior. Mais antigo.\n\nA Fase 8 aguarda.`,
    [
      { icon:'🚪', text:'Avançar para a Fase 8', action: () => {
        notify('🌑 A Fase 8 aguarda...', 'purple');
        addLog('Aguardando Fase 8 da Dungeon das Sombras.', 'info');
        setScene('dungeon-fase6');
        hideEnemy();
        setStory('NARRADOR',
          `Você para diante da abertura para a Fase 8.\n\nO ar que vem de lá é mais pesado. Mais antigo. Como se o tempo passasse diferente do outro lado.\n\nVocê vai precisar estar preparado.`,
          [
            { icon:'↩', text:'Retornar ao vilarejo para descansar', action: () => {
              setScene('vilarejo');
              G.dungeonSombrasBloqueio = false;
              if (typeof storyNode_vilarejo === 'function') storyNode_vilarejo();
              notify('🌑 A Dungeon das Sombras aguarda seu retorno...', 'purple');
            }},
          ]
        );
      }},
    ]
  );
}
window.storyNode_dungeon_f6_vitoria = storyNode_dungeon_f6_vitoria;
