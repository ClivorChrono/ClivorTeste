// =============================================================
//  DUNGEON_SOMBRAS.JS — Chronicles of Clivor
//  Dungeon das Sombras: sequência de entrada, navegação e cenas
//  Depende de: palDinh.js (G, setScene, setStory, hideEnemy,
//              notify, addLog, updateHUD)
//              vilarejo.js (storyNode_vilarejo, storyNode_taverna)
// =============================================================

'use strict';

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
  img: 'Imagens/personagens/sombra.png',
  desc: 'Um fragmento de escuridão que ganhou forma. Lento, mas persistente.',
  loot: [{ id:'po_sombra', name:'Pó de Sombra', icon:'🌑', imgSrc:'Imagens/icones/materiais/poCrista.png', chance:0.6, weight:0.1, type:'material', desc:'Resíduo das criaturas das sombras.' }],
};
const _DS_ESPECTRO_MENOR = {
  id: 'espectro_menor', name: 'Espectro Menor', icon: '👻',
  hp: 35, atk: 14, def: 3, xp: 20, gold: 10, isBoss: false,
  img: 'Imagens/personagens/sombra.png',
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
        G._dungeonBattleCallback = function() {
          prog.kills++;
          if (prog.kills < 3) {
            storyNode_dungeon_f1_onda1();
          } else {
            storyNode_dungeon_f1_onda2();
          }
        };
        startBattle(inimigo);
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
        G._dungeonBattleCallback = function() {
          prog.kills++;
          if (prog.kills < 6) {
            storyNode_dungeon_f1_cont();
          } else {
            storyNode_dungeon_f1_preminiboss();
          }
        };
        startBattle(inimigo);
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
  G._dungeonBattleCallback = function() {
    _getDS1Progress().bossDefeated = true;
    storyNode_dungeon_f1_vitoria();
  };
  startBattle({ ..._DS_MINIBOSS_D1 });
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
        G._dungeonBattleCallback = function() {
          prog.kills++;
          if (prog.kills < 4) {
            storyNode_dungeon_f2_zombies();
          } else {
            storyNode_dungeon_f2_pre_olho();
          }
        };
        startBattle(inimigo);
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
  G._dungeonBattleCallback = function() {
    _getDS2Progress().bossDefeated = true;
    storyNode_dungeon_f2_vitoria();
  };
  startBattle({ ..._DS_OLHO_ESPECTRAL });
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
      { icon:'🚪', text:'Avançar para a Fase 3 (Em breve)', action: () => {
        notify('🌑 A Fase 3 ainda está sendo explorada...', 'purple');
        addLog('Aguardando Fase 3 da Dungeon das Sombras.', 'info');
        setScene('dungeon-fase2');
        hideEnemy();
        setStory('NARRADOR',
          `Você para diante da porta da Fase 3.\n\nUma energia diferente — mais densa, mais antiga — pulsa do outro lado.\n\nPor agora, algo te diz para descansar. Para se preparar.\n\nO que espera na Fase 3 exigirá mais do que você já demonstrou.`,
          [
            { icon:'↩', text:'Retornar ao vilarejo', action: () => {
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
window.storyNode_dungeon_f2_vitoria = storyNode_dungeon_f2_vitoria;

