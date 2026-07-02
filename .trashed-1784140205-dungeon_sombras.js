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
    `O portão fecha-se atrás de você com um som surdo e definitivo.\n\nA escuridão não é completa — cristais roxos incrustados nas paredes emitem uma luz fraca e pulsante, como se respirassem.\n\nO ar é frio. Denso. Cada passo ecoa mais do que deveria.\n\nVocê está dentro da Dungeon das Sombras.`,
    [
      { icon:'↩', text:'(Em breve — voltar ao vilarejo)', action: () => {
          setScene('vilarejo');
          G.dungeonSombrasBloqueio = false;
          storyNode_vilarejo();
          notify('🌑 A Dungeon das Sombras aguarda sua exploração...', 'purple');
      }},
    ]
  );
}
window.storyNode_dungeon_dentro = storyNode_dungeon_dentro;
