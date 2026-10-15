// ══════════════════════════════════════════════════════════════
//  CIDADE_KUROSAKI.JS — Chronicles of Clivor
//  Travessia de Kurogane → Cidade Kurosaki (Cidade das Pedra)
//
//  Contém:
//   1. Narrador — texto de ambientação sem retrato/nome
//   2. Olho de lobo — flash de presságio (1ª travessia da ponte)
//   3. Pin + balão do HuBi em tempo real — sistema GENÉRICO,
//      reaproveitável em qualquer cena futura da Cidade Kurosaki
//      (ou de qualquer outro lugar do jogo)
//   4. Pin de personagem — genérico, usado pela menina misteriosa
//   5. Emboscada de Kurogane: menina pede ajuda → Ogro → bruxa
//      revelada → dois filhos da bruxa (encadeados via
//      G._dungeonBattleCallback) → travessia livre
//   6. storyNode_travessia_kurogane() — chamado pelo pin ⛩️ já
//      existente na Ponte de Pedra (gat-1.html)
//   7. storyNode_cidade_kurosaki_entrada() — chegada na cidade
//
//  Depende de (palDinh.js / hubi.js):
//    G, setStory, setScene, notify, addLog, startBattle,
//    battleState, updateBattleHUD, appendBattleLog,
//    hubiInit, HUBI_CONFIG
//
//  Ordem de load no gat-1.html: depois de hubi.js
//
//  PASTA DE ASSETS: Imagens/Cidade das pedras/
// ══════════════════════════════════════════════════════════════

'use strict';

// ─────────────────────────────────────────────────────────────
//  1. ESTADO
// ─────────────────────────────────────────────────────────────
function kurosakiInit() {
  if (!G.kurosaki) {
    G.kurosaki = {
      olhoVistoNaPonte:    false, // já mostrou o flash do olho de lobo na 1ª travessia?
      hubiFalouNaPonte:    false, // já mostrou o pin/balão do HuBi na ponte?
      entradaCidadeVista:  false, // já mostrou o texto de chegada na cidade?
      hubiFalouNaCidade:   false, // já mostrou o pin/balão do HuBi na entrada da cidade?
      ogroDerrotado:       false, // o ogro (1ª fase da emboscada) já foi vencido?
      filhosDerrotados:    false, // os filhos da bruxa (2ª fase) já foram vencidos? = travessia livre
      _filhoAtual:         null,  // 'escudeiro' | 'atacante' — progresso da luta dos filhos
      pontePosVitoriaNarrada: false, // narrador já contou o que aconteceu, na Ponte da Fronteira, a 1ª vez que ela ficou livre?
      casaAlberonLiberada: false,    // a Casa do Alberon (e o armazém) só aparecem depois de zerar a masmorra Inazami
      casaAlberonPopupVisto: false,  // o pop-up de desbloqueio já foi mostrado?
      imperioPinLiberado:  false,    // pin preto do Império aparece depois de sair da casa do Alberon
      imperioReuniaoVista: false,    // a cutscene da reunião (Presidente/Valdris/Eirik) já passou?
      alberonPresidenteVisto: false, // o Alberon já apresentou o Presidente e avisou da reunião? (só então o pin do Império aparece)
      reuniaoAbates:       undefined,// abates do jogador no fim da reunião (a nova fala do Alberon libera X abates depois)
      alberonCuraVista:    false,    // já ouviu o Alberon pedir ajuda pra curar a cidade?
      hirotoAbatesBase:    undefined,// abates do jogador quando o Alberon terminou o pedido (contagem da Hiroto parte daqui)
      hirotoApresentada:   false,    // já falou com a Capitã Hiroto na rua?
      hirotoCenaCasaVista: false,    // já passou a cena dos 3 dentro da casa do Alberon?
    };
  }
  // Migração de saves antigos: quem já tinha mexido com o Alberon mantém a casa
  // liberada (sem pop-up, já viu a casa). Os demais esperam zerar Inazami.
  if (G.kurosaki.casaAlberonLiberada === undefined) {
    const jaUsou = !!(G.kurosaki.alberonConversaVista || G.kurosaki.alberonPedidoSelo || G.kurosaki.selosYuFortificado);
    G.kurosaki.casaAlberonLiberada = jaUsou;
    G.kurosaki.casaAlberonPopupVisto = jaUsou;
  }
}

// ─────────────────────────────────────────────────────────────
//  1b. CONFIG — Menina misteriosa da Travessia de Kurogane
//      (na verdade uma bruxa disfarçada — some quando revelada;
//      ver storyNode_kurogane_emboscada / bruxaRevelada mais abaixo)
// ─────────────────────────────────────────────────────────────
const KUROSAKI_MENINA_CONFIG = {
  IMG: 'Imagens/personagens/menin4r.png', // menina chorando (estado inicial, pedindo ajuda)
  X: 20, // posição aproximada na ponte (mesmo ponto marcado na arte de referência)
  Y: 40,
};

// A menina pede ajuda — ela precisa ver a família, veio a Pedra Branca pedir
// socorro e não consegue voltar sozinha. Diz que o gigante dorme no meio da
// ponte e não há outro caminho nem para onde fugir.
function storyNode_menina_kurogane() {
  setStory('MENINA MISTERIOSA',
    `"Por favor... preciso da sua ajuda."\n\nA garota aperta as próprias mãos, os olhos marejados. "Vim até Pedra Branca pedir socorro — preciso muito ver minha família, mas não consigo voltar sozinha. Aquela... aquela coisa dorme bem no meio da ponte. Não há outro caminho, e eu não tenho pra onde fugir."\n\n"Se alguém o acordasse e o afastasse dali... eu poderia atravessar."`,
    [
      { icon:'⚔', text:'Ajudar a acordar o gigante', action: storyNode_kurogane_emboscada },
      { icon:'↩', text:'Voltar', action: storyNode_travessia_kurogane },
    ],
    KUROSAKI_MENINA_CONFIG.IMG
  );
}

// A "ajuda" é uma armadilha — assim que você se aproxima do gigante, a
// máscara da garota escorrega e o bicho acorda sozinho.
function storyNode_kurogane_emboscada() {
  personagemPinRemover('menina_kurogane'); // a "garota inocente" já cumpriu seu papel
  setStory('',
    `Assim que você se aproxima do gigante adormecido, a garota sorri — um sorriso longo demais, errado demais.\n\n"...Obrigada por ser tão gentil," ela sussurra, e o gigante abre os olhos antes mesmo de você tocá-lo.\n\nFoi uma armadilha.`,
    [
      // Antes de entrar na luta, a máscara da garota cai de vez — a
      // animação de transformação (menina → bruxa) toca primeiro, e só
      // depois que ela termina a batalha contra o ogro começa.
      { icon:'⚔', text:'Lutar!', action: () => mostrarTransformacaoBruxa(kurosakiIniciarOgro) },
    ],
    null
  );
}

// ─────────────────────────────────────────────────────────────
//  5b. TRANSFORMAÇÃO — a garota se revela bruxa antes da luta com o ogro
//      Usa os dois cards feitos especificamente pra essa cena:
//        Imagens/personagens/file_00000000edf8720eb6267ab0cc0afcef.png (menina)
//        Imagens/personagens/file_000000000a5c720eade381074f65a1b1.png (bruxa)
//      Crossfade com flash/"rachadura" no meio — CSS cuida da animação
//      inteira (ver .transform-bruxa-* no gat-1.html); aqui só monta o
//      DOM uma vez e dispara/remove a classe .play.
// ─────────────────────────────────────────────────────────────
const TRANSFORM_BRUXA_CONFIG = {
  IMG_MENINA: 'Imagens/personagens/menin4r.png', // mesma arte da menina chorando
  IMG_BRUXA:  'Imagens/personagens/menin5r.png', // card de revelação (velha/bruxa)
  DURACAO_MS: 3400,
};

function _transformBruxaGarantirDOM() {
  if (document.getElementById('transform-bruxa-overlay')) return;
  const el = document.createElement('div');
  el.id = 'transform-bruxa-overlay';
  el.className = 'transform-bruxa-overlay';
  el.innerHTML = `
    <div class="transform-bruxa-stage">
      <img class="transform-bruxa-img transform-bruxa-menina" src="${TRANSFORM_BRUXA_CONFIG.IMG_MENINA}" alt="Menina misteriosa" onerror="this.style.display='none';">
      <img class="transform-bruxa-img transform-bruxa-bruxa" src="${TRANSFORM_BRUXA_CONFIG.IMG_BRUXA}" alt="Bruxa" onerror="this.style.display='none';">
      <div class="transform-bruxa-crack"></div>
    </div>
    <div class="transform-bruxa-legenda">A máscara escorrega — e algo bem mais antigo sorri por baixo dela.</div>
  `;
  document.body.appendChild(el);
}

/**
 * Toca a animação de transformação (menina → bruxa) e chama onFim ao
 * terminar. Não bloqueia toque do jogador durante a animação (overlay
 * captura os cliques via pointer-events, então não dá pra "pular" sem
 * querer pra tela de baixo).
 */
function mostrarTransformacaoBruxa(onFim) {
  _transformBruxaGarantirDOM();
  const el = document.getElementById('transform-bruxa-overlay');
  el.classList.remove('play');
  void el.offsetWidth; // força reflow pra permitir replay da animação
  el.classList.add('play');
  setTimeout(() => {
    el.classList.remove('play');
    if (typeof onFim === 'function') onFim();
  }, TRANSFORM_BRUXA_CONFIG.DURACAO_MS);
}

// ─────────────────────────────────────────────────────────────
//  2. NARRADOR — texto de ambientação, sem personagem
//     Uso: narradorMostrar('texto aqui'); // some sozinho ou ao tocar
// ─────────────────────────────────────────────────────────────
function _narradorGarantirDOM() {
  if (document.getElementById('narrador-box')) return;
  const box = document.createElement('div');
  box.id = 'narrador-box';
  box.className = 'narrador-box';
  document.body.appendChild(box);
}

/**
 * Mostra uma linha de narração (sem retrato, sem nome do falante), centralizada
 * na tela. Some sozinha depois de `opts.duracaoMs` OU ao ser tocada — o que
 * vier primeiro — a não ser que `opts.manual === true`.
 *
 * opts: { duracaoMs, manual, onClose }
 */
function narradorMostrar(texto, opts = {}) {
  _narradorGarantirDOM();
  const box = document.getElementById('narrador-box');
  const duracao = opts.duracaoMs != null ? opts.duracaoMs : 3800;

  box.innerHTML = `<div class="narrador-texto">${texto}</div>`;
  box.classList.remove('show');
  void box.offsetWidth;
  box.classList.add('show');

  const fechar = () => {
    box.classList.remove('show');
    box.onclick = null;
    clearTimeout(box._timer);
    if (typeof opts.onClose === 'function') opts.onClose();
  };
  box.onclick = fechar;

  clearTimeout(box._timer);
  if (!opts.manual) {
    box._timer = setTimeout(fechar, duracao);
  }
}

// ─────────────────────────────────────────────────────────────
//  3. OLHO DE LOBO — presságio na primeira travessia da ponte
// ─────────────────────────────────────────────────────────────
function _olhoLoboGarantirDOM() {
  if (document.getElementById('olho-lobo-flash')) return;
  const el = document.createElement('div');
  el.id = 'olho-lobo-flash';
  el.className = 'olho-lobo-flash';
  el.innerHTML = `<div class="olho-lobo-icone">👁️</div>`;
  document.body.appendChild(el);
}

function mostrarOlhoLobo(onFim) {
  _olhoLoboGarantirDOM();
  const el = document.getElementById('olho-lobo-flash');
  el.classList.remove('play');
  void el.offsetWidth;
  el.classList.add('play');
  setTimeout(() => {
    el.classList.remove('play');
    if (typeof onFim === 'function') onFim();
  }, 900);
}

// ─────────────────────────────────────────────────────────────
//  4. PIN + BALÃO DO HUBI EM TEMPO REAL
//
//     BUGFIX (relatado): o pin nascia "grudado" em qualquer canto do
//     mapa. Causa: ele aparece com um pequeno atraso proposital (pra
//     parecer que o HuBi "percebeu algo"), mas se o jogador trocasse
//     de cena ANTES desse atraso terminar, o pin era criado depois,
//     já dentro da cena NOVA — com coordenadas pensadas pra cena
//     antiga, sobrando em qualquer posição.
//     Correção:
//       a) guarda a cena-alvo no momento do agendamento e confere de
//          novo, ao criar o pin, se G.location não mudou;
//       b) toda troca de cena (setScene) cancela pin/balão pendentes
//          automaticamente, então nunca sobra "resto" na cena nova.
// ─────────────────────────────────────────────────────────────
const HUBI_PIN_CONFIG = {
  ATRASO_PADRAO_MS:    2200,
  AUTOCLOSE_PADRAO_MS: 5000,
};

let _hubiPinDelayTimer = null;

function hubiWorldPinRemover() {
  clearTimeout(_hubiPinDelayTimer);
  _hubiPinDelayTimer = null;
  const pin = document.getElementById('hubi-world-pin');
  if (pin) pin.remove();
  const bub = document.getElementById('hubi-world-bubble');
  if (bub) { clearTimeout(bub._timer); bub.remove(); }
}

/**
 * Faz o HuBi aparecer como um pin flutuante na cena atual.
 * opts: { x, y, texto, atrasoMs, autoCloseMs, onFala, onFechar }
 */
function hubiWorldPinMostrar(opts) {
  if (typeof hubiInit === 'function') hubiInit();
  hubiWorldPinRemover();

  const cenaAlvo = G.location;
  const atraso = opts.atrasoMs != null ? opts.atrasoMs : HUBI_PIN_CONFIG.ATRASO_PADRAO_MS;

  _hubiPinDelayTimer = setTimeout(() => {
    _hubiPinDelayTimer = null;
    if (G.location !== cenaAlvo) return; // saiu da cena antes do pin nascer — cancela

    const painel = document.querySelector('.scene-panel');
    if (!painel) return;

    const pin = document.createElement('div');
    pin.id = 'hubi-world-pin';
    pin.className = 'hubi-world-pin';
    pin.style.left = (opts.x != null ? opts.x : 50) + '%';
    pin.style.top  = (opts.y != null ? opts.y : 50) + '%';
    const iconSrc = (typeof HUBI_CONFIG !== 'undefined' && HUBI_CONFIG.ICON) ? HUBI_CONFIG.ICON : '';
    pin.innerHTML = iconSrc
      ? `<img src="${iconSrc}" onerror="this.parentElement.textContent='🌿';">`
      : '🌿';
    painel.appendChild(pin);

    pin.onclick = () => hubiWorldFalar(opts.texto, opts, cenaAlvo);
  }, atraso);
}

function hubiWorldFalar(texto, opts = {}, cenaAlvo) {
  if (cenaAlvo && G.location !== cenaAlvo) { hubiWorldPinRemover(); return; }

  const painel = document.querySelector('.scene-panel');
  const pin = document.getElementById('hubi-world-pin');
  if (!painel || !pin) return;

  let bub = document.getElementById('hubi-world-bubble');
  if (!bub) {
    bub = document.createElement('div');
    bub.id = 'hubi-world-bubble';
    bub.className = 'hubi-world-bubble';
    painel.appendChild(bub);
  }
  bub.style.left = pin.style.left;
  bub.style.top  = pin.style.top;
  bub.innerHTML = `<div class="hubi-world-bubble-label">HuBi</div><div class="hubi-world-bubble-texto">${texto}</div>`;
  bub.classList.add('show');

  if (typeof opts.onFala === 'function') opts.onFala();

  const autoClose = opts.autoCloseMs != null ? opts.autoCloseMs : HUBI_PIN_CONFIG.AUTOCLOSE_PADRAO_MS;
  clearTimeout(bub._timer);
  bub._timer = setTimeout(() => {
    hubiWorldPinRemover();
    if (typeof opts.onFechar === 'function') opts.onFechar();
  }, autoClose);
}

// Hook: qualquer troca de cena cancela pin/balão pendentes E remove
// qualquer pin de personagem — fecha o bug de vez, mesmo que algo escape
// da checagem de cena acima. Cada storyNode redesenha os pins que precisar.
if (typeof setScene === 'function' && !window._kurosakiOrigSetScene) {
  window._kurosakiOrigSetScene = setScene;
  setScene = function (loc) {
    hubiWorldPinRemover();
    personagemPinRemoverTodos();
    _kurosakiCasaRestaurarPainel();
    return window._kurosakiOrigSetScene(loc);
  };
}

// ─────────────────────────────────────────────────────────────
//  4b. PIN DE PERSONAGEM — genérico, pra qualquer NPC/figura que
//      precise aparecer como um "retrato-pin" fixo na cena (ex: a
//      menina misteriosa na Travessia de Kurogane). Ao contrário do
//      pin do HuBi, esse NÃO some sozinho — fica na tela até a cena
//      trocar ou até ser removido manualmente.
// ─────────────────────────────────────────────────────────────
function personagemPinMostrar(opts) {
  // opts: { id, x, y, img, alt, onClick, size }  (size = lado do pin em px; omita pra usar o tamanho padrão do CSS)
  const painel = document.querySelector('.scene-panel');
  if (!painel) return;
  personagemPinRemover(opts.id);

  const pin = document.createElement('div');
  pin.id = 'personagem-pin-' + opts.id;
  pin.className = 'personagem-pin';
  pin.style.left = (opts.x != null ? opts.x : 50) + '%';
  pin.style.top  = (opts.y != null ? opts.y : 50) + '%';
  pin.innerHTML = `<img src="${opts.img}" alt="${opts.alt || ''}">`;
  if (opts.size) {
    pin.style.width = pin.style.height = opts.size + 'px';
    const im = pin.firstElementChild;
    if (im) { im.style.width = '100%'; im.style.height = '100%'; im.style.objectFit = 'cover'; }
  }
  if (typeof opts.onClick === 'function') pin.onclick = opts.onClick;
  painel.appendChild(pin);
}

function personagemPinRemover(id) {
  const el = document.getElementById('personagem-pin-' + id);
  if (el) el.remove();
}

function personagemPinRemoverTodos() {
  document.querySelectorAll('.personagem-pin').forEach(el => el.remove());
}

// ─────────────────────────────────────────────────────────────
//  5. EMBOSCADA DE KUROGANE — Ogro → Bruxa revelada → Filhos da Bruxa
// ─────────────────────────────────────────────────────────────
function kurosakiTravessiaLivre() {
  kurosakiInit();
  return !!G.kurosaki.filhosDerrotados;
}

// ── Fase 1: o Ogro ──
const KUROSAKI_OGRO = {
  id: 'ogro_kurogane', name: 'Ogro de Kurogane', icon: '👹',
  img: 'Imagens/Cidade das pedras/ogorrin.png',
  elemento: 'veneno', // ataque corrosivo
  hp: 3500, atk: 100, def: 100, xp: 260, gold: 150, isBoss: true, minLevel: 1, maxLevel: 99,
  desc: 'Um gigante de pele rachada e escamosa, acorrentado e coberto de caveiras. Seu ataque corrosivo corrói até a armadura mais resistente.',
  loot: [],
};

function kurosakiIniciarOgro() {
  kurosakiInit();
  G._dungeonBattleCallback = () => {
    G.kurosaki.ogroDerrotado = true;
    setTimeout(storyNode_kurogane_bruxaRevelada, 500);
  };
  startBattle(KUROSAKI_OGRO);
}

// Fase 2 do Ogro: ao cair a 50% de HP, o ataque corrosivo sobe de 100 pra 110.
// Feito sem mexer no motor de batalha — só observa o HP e ajusta o atk do
// próprio inimigo (battleState.enemyData), que é o mesmo objeto lido pelo
// cálculo de dano do turno do inimigo.
function _kurosakiCheckFaseOgro() {
  if (typeof battleState === 'undefined' || !battleState || !battleState.enemyData) return;
  if (battleState.enemyData.id !== 'ogro_kurogane') return;
  if (battleState._ogroFase2) return;
  if (battleState.enemyHp / battleState.enemyMaxHp <= 0.5) {
    battleState._ogroFase2 = true;
    battleState.enemyData.atk = 110;
    if (typeof appendBattleLog === 'function') {
      appendBattleLog('⚠ O Ogro ruge — o ataque corrosivo fica mais forte! (ATQ 110)', '#ff5030');
    }
  }
}
if (typeof updateBattleHUD === 'function' && !window._kurosakiOrigUpdateBattleHUD) {
  window._kurosakiOrigUpdateBattleHUD = updateBattleHUD;
  updateBattleHUD = function () {
    window._kurosakiOrigUpdateBattleHUD();
    _kurosakiCheckFaseOgro();
    if (typeof _kurosakiCheckDueloHiroto === 'function') _kurosakiCheckDueloHiroto();
  };
}

// ── Entre fases: a bruxa se revela ──
function storyNode_kurogane_bruxaRevelada() {
  setStory('',
    `O ogro desaba com um estrondo que sacode toda a Travessia de Kurogane.\n\nA garota — se é que algum dia foi uma garota — solta uma risada seca. Sua pele racha como madeira velha, revelando uma bruxa curvada e sorridente por baixo da máscara.\n\n"Vocês, aventureiros, sempre tão dispostos a ajudar..." ela sibila. "Meus filhos vão terminar o que o ogro começou!"`,
    [
      { icon:'⚔', text:'Enfrentar os filhos da bruxa', action: kurosakiIniciarFilhosDaBruxa },
    ],
    null
  );
}

// ── Fase 3: os dois filhos da bruxa ──
// NOTA: o jogo já carrega um multi_enemy_battle.js (visto no gat-1.html),
// provavelmente feito pra exatamente esse tipo de luta — duas HP na tela,
// escolhendo quem atacar. Esse arquivo não foi enviado, então por enquanto
// implementei como DUAS lutas em sequência (escudeiro primeiro, depois o
// atacante), usando o mesmo motor de batalha de sempre. Funciona e é
// jogável, mas ainda não é a luta simultânea de verdade — me manda esse
// arquivo quando puder que eu troco certinho.
const KUROSAKI_FILHO_ESCUDEIRO = {
  id: 'filho_bruxa_escudeiro', name: 'Filho da Bruxa — Guardião', icon: '🛡️',
  img: 'Imagens/Cidade das pedras/ogon.png',
  elemento: 'terra',
  hp: 1500, atk: 95, def: 110, xp: 140, gold: 70, minLevel: 1, maxLevel: 99,
  desc: 'Um dos filhos da bruxa, escudo em punho — sua função é proteger o irmão enquanto ele ataca.',
  loot: [],
};
const KUROSAKI_FILHO_ATACANTE = {
  id: 'filho_bruxa_atacante', name: 'Filho da Bruxa — Lâmina', icon: '🗡️',
  img: 'Imagens/Cidade das pedras/ogen.png',
  elemento: 'sombra',
  hp: 900, atk: 110, def: 95, xp: 140, gold: 70, minLevel: 1, maxLevel: 99,
  desc: 'O outro filho da bruxa — golpes cortantes que arrancam bastante sangue a cada acerto.',
  loot: [],
};

function kurosakiIniciarFilhosDaBruxa() {
  kurosakiInit();
  G.kurosaki._filhoAtual = 'escudeiro';
  _kurosakiLutarFilho();
}

function _kurosakiLutarFilho() {
  kurosakiInit();
  const qual = G.kurosaki._filhoAtual;
  const inimigo = qual === 'escudeiro' ? KUROSAKI_FILHO_ESCUDEIRO : KUROSAKI_FILHO_ATACANTE;

  G._dungeonBattleCallback = () => {
    if (qual === 'escudeiro') {
      G.kurosaki._filhoAtual = 'atacante';
      setTimeout(_kurosakiLutarFilho, 400);
    } else {
      G.kurosaki.filhosDerrotados = true;
      setTimeout(storyNode_kurogane_bruxaFoge, 500);
    }
  };
  startBattle(inimigo);
}

// A bruxa foge sem dar chance de derrotá-la — o ogro também some, e a
// travessia fica livre (ver troca de imagem em _kurosakiAtualizarVisualPonte).
function storyNode_kurogane_bruxaFoge() {
  if (typeof notify === 'function') notify('🧙 A bruxa foge, levando o que restou do ogro com ela — a travessia está livre.', 'gold');
  if (typeof addLog === 'function') addLog('A bruxa fugiu após perder os dois filhos. A Travessia de Kurogane está livre.', 'xp');
  setTimeout(() => storyNode_travessia_kurogane(), 600);
}

// ─────────────────────────────────────────────────────────────
//  6. TRAVESSIA DE KUROGANE
//     Chamado pelo pin ⛩️ já existente em #scene-ponte-pins (gat-1.html)
// ─────────────────────────────────────────────────────────────
function storyNode_travessia_kurogane() {
  kurosakiInit();
  setScene('kurogane');
  _kurosakiAtualizarVisualPonte();

  if (!kurosakiTravessiaLivre()) {
    _kurosakiMostrarPonteBloqueada();
    return;
  }

  const primeiraVez = !G.kurosaki.olhoVistoNaPonte;

  // O caminho já está livre: navegação agora é pelos 3 pins do cenário
  // (Entr.png) — voltar à ponte, observatório e entrar em Kurosaki —
  // então o balão de diálogo fica só com o texto ambiente, sem botões.
  setStory('',
    `A trilha de pedra se abre à sua frente. À esquerda, um velho posto de observação vigia as montanhas; à direita, o caminho estreito segue rumo às silhuetas de Kurosaki — nenhuma luz se move lá.`,
    [],
    null
  );

  if (primeiraVez) {
    G.kurosaki.olhoVistoNaPonte = true;
    setTimeout(() => {
      mostrarOlhoLobo(() => {
        narradorMostrar('Por um instante, um olho amarelo se abre entre as pedras da ponte — e some antes que você tenha certeza de tê-lo visto.');
      });
    }, 650);
  }

  // O HuBi fica quieto até o ogro e os filhos da bruxa serem derrotados —
  // como chegar aqui já exige ter vencido os dois, essa fala só entra
  // depois desses inimigos serem enfrentados, como pedido.
  if (!G.kurosaki.hubiFalouNaPonte) {
    G.kurosaki.hubiFalouNaPonte = true;
    hubiWorldPinMostrar({
      x: 50, y: 44,
      texto: primeiraVez
        ? '...Você viu aquilo? Alguma coisa nos observou.'
        : 'Sinto algo estranho por aqui.',
      atrasoMs: 3000,
      autoCloseMs: 5500,
    });
  }
}

// Pin rosa do Entr.png — posto de observação: só um mirante pra ver ao
// longe o Vilarejo da Pedra Branca, sem nenhum evento ou recompensa.
// Usa obser45.png como cena própria (efeito de "focar o telescópio" ao entrar).
function storyNode_kurogane_observatorio() {
  setScene('kurogane-observatorio');
  hideEnemy();
  setStory('NARRADOR',
    `Do alto do posto de observação, o vento é mais frio. Entre a névoa das montanhas, dá pra distinguir os telhados baixos e as muralhas claras do Vilarejo da Pedra Branca — pequeno daqui, quase pacífico.\n\nNão há nada além da vista. Só um lembrete de quão longe você já chegou.`,
    [
      { icon:'↩', text:'Voltar', action: storyNode_travessia_kurogane },
    ],
    null
  );
}
window.storyNode_kurogane_observatorio = storyNode_kurogane_observatorio;

// Troca o plano de fundo da Travessia de Kurogane: enquanto o ogro/bruxa
// não foram resolvidos, mantém a imagem original (bloqueada); depois que
// tudo se resolve, passa pra imagem da ponte livre. Só usa a transição
// estilizada (dissolve + brilho) quando o estado realmente MUDA — em
// visitas normais, sem mudança nenhuma, troca na hora, sem efeito.
//
// IMPORTANTE: não dá pra checar isso lendo a classe do próprio elemento
// (bg.classList.contains('kurogane-livre')), porque o setScene() já
// zerou bg.className logo antes de chamar essa função — então a classe
// sempre "parece" ausente e o efeito disparava em TODA visita. Por isso
// o estado anterior fica guardado em G.kurosaki, não no DOM.
function _kurosakiAtualizarVisualPonte() {
  const bg = document.getElementById('scene-bg');
  if (!bg) return;
  // A cidade de Kurosaki (visual por horário / casa do Alberon) aplica o fundo
  // direto em bg.style, e o setScene() só zera a classe — sem isso o fundo da
  // cidade ficava "preso" na Travessia ao voltar. Limpa pra CSS mandar de novo.
  bg.style.backgroundImage = '';
  bg.style.backgroundSize = '';
  bg.style.backgroundPosition = '';
  const livre = kurosakiTravessiaLivre();
  const estadoAnterior = G.kurosaki._bgKuroganeLivre;
  const estadoMudou = (estadoAnterior !== undefined) && (estadoAnterior !== livre);
  G.kurosaki._bgKuroganeLivre = livre;
  if (estadoMudou && typeof trocarVisualCenaComTransicao === 'function') {
    trocarVisualCenaComTransicao(() => bg.classList.toggle('kurogane-livre', livre));
  } else {
    bg.classList.toggle('kurogane-livre', livre);
  }
}

function _kurosakiMostrarPonteBloqueada() {
  setStory('',
    `Um gigante adormecido ocupa toda a extensão de Kurogane, sua respiração pesada ecoando pelas vigas de madeira. Não há como atravessar sem lidar com ele.`,
    [
      { icon:'↩', text:'Voltar à Ponte de Pedra', action: () => {
          setScene('ponte-pedra');
          if (typeof storyNode_ponte_fronteira === 'function') storyNode_ponte_fronteira();
        }
      },
    ],
    null
  );

  // A menina misteriosa só aparece enquanto o ogro ainda bloqueia a ponte.
  personagemPinMostrar({
    id: 'menina_kurogane',
    x: KUROSAKI_MENINA_CONFIG.X,
    y: KUROSAKI_MENINA_CONFIG.Y,
    img: KUROSAKI_MENINA_CONFIG.IMG,
    alt: 'Menina misteriosa',
    onClick: storyNode_menina_kurogane,
  });
}

// ─────────────────────────────────────────────────────────────
//  7. CIDADE KUROSAKI — chegada
// ─────────────────────────────────────────────────────────────
//
//  CICLO DIA/NOITE — usa o MESMO relógio de jogo da floresta
//  (getPeriodoCiclo, em gat-1.html: 20 min = 1 dia, 4 períodos de 5 min:
//  amanhecer → manhã → tarde → noite). Assim floresta e cidade ficam
//  sempre no mesmo momento do dia, e o relógio do HUD também aparece aqui.
//  Antes a cidade usava a hora do aparelho — às 3h da manhã ficava
//  sempre escura e sem a casa do Alberon.
// ─────────────────────────────────────────────────────────────
const KUROSAKI_PERIODO_IMGS = {
  amanhecer: 'Imagens/Cidade das pedras/1tard.png', // sol baixo alaranjado (troque quando tiver uma imagem só de amanhecer)
  // manhã: sem entrada — usa o fundo padrão da cena (CSS)
  tarde:     'Imagens/Cidade das pedras/1tard.png',
  noite:     'Imagens/Cidade das pedras/2noit.png',
};

function _kurosakiPeriodoAtual() {
  if (typeof getPeriodoCiclo === 'function') return getPeriodoCiclo();
  // Reserva (só se o relógio da floresta não existir): hora do aparelho
  const h = new Date().getHours();
  if (h >= 5  && h < 7)  return 'amanhecer';
  if (h >= 7  && h < 12) return 'manha';
  if (h >= 12 && h < 18) return 'tarde';
  return 'noite';
}

// "Dia" = amanhecer, manhã e tarde. Só a noite é escura/trancada.
function _kurosakiEhDia() {
  return _kurosakiPeriodoAtual() !== 'noite';
}

// true enquanto o jogador está DENTRO da casa do Alberon (não pode trocar o fundo)
let _kurosakiEmCasaAlberon = false;

function _kurosakiAtualizarVisualPorHorario() {
  const bg = document.getElementById('scene-bg');
  if (!bg) return;
  const img = KUROSAKI_PERIODO_IMGS[_kurosakiPeriodoAtual()];
  if (img) {
    bg.style.backgroundImage = `url('${img}')`;
    bg.style.backgroundSize = 'cover';
    bg.style.backgroundPosition = 'center';
  } else {
    bg.style.backgroundImage = ''; // manhã: volta pro fundo padrão via CSS
  }
}

// Pin da casa do Alberon: só aparece DEPOIS de zerar a masmorra Inazami
// (G.kurosaki.casaAlberonLiberada). Liberada, fica sempre visível; a porta
// só abre de dia — ver storyNode_kurosaki_casa_alberon.
function _kurosakiSincronizarPinCasaAlberon() {
  kurosakiInit();
  if (!G.kurosaki.casaAlberonLiberada) {
    personagemPinRemover('casa_alberon_kurosaki');
    return;
  }
  if (_kurosakiEmCasaAlberon) {
    personagemPinRemover('casa_alberon_kurosaki');
    return;
  }
  personagemPinMostrar({
    id: 'casa_alberon_kurosaki',
    x: KUROSAKI_CASA_ALBERON_CONFIG.X,
    y: KUROSAKI_CASA_ALBERON_CONFIG.Y,
    img: 'Imagens/Cidade das pedras/caaber.png',
    alt: 'Casa de Alberon',
    onClick: storyNode_kurosaki_casa_alberon,
  });
}

// Chamado pelo relógio da floresta (gat-1.html) quando o período muda
// e o jogador está na cidade: troca o fundo e o pin na hora.
function kurosakiAoMudarPeriodo() {
  if (typeof G === 'undefined' || G.location !== 'cidade-kurosaki') return;
  if (_kurosakiEmCasaAlberon || G._kurosakiCutscene) return; // dentro da casa/cutscene: nada muda
  _kurosakiAtualizarVisualPorHorario();
  _kurosakiSincronizarPinCasaAlberon();
}
window.kurosakiAoMudarPeriodo = kurosakiAoMudarPeriodo;

// Posição do pin da casa do Alberon — estimativa visual (mesma ressalva
// do pin do Núcleo de Pedra: ajuste X/Y se não cair em cima da casa
// certa na sua tela).
const KUROSAKI_CASA_ALBERON_CONFIG = { X: 26, Y: 31 };

function storyNode_cidade_kurosaki_entrada() {
  kurosakiInit();
  if (typeof _dsGarantirRunaYu === 'function' && (G.dungeonSombrasConcluida || (G.dungeonSombras && G.dungeonSombras.f9ChestGranted))) _dsGarantirRunaYu();
  kurosakiIniciarArCorrosivo();
  _kurosakiEmCasaAlberon = false;
  setScene('cidade-kurosaki');
  _kurosakiAtualizarVisualPorHorario();

  if (!G.kurosaki.entradaCidadeVista) {
    G.kurosaki.entradaCidadeVista = true;
    narradorMostrar('Kurosaki. As pedras aqui não refletem a luz — parecem engoli-la.', { duracaoMs: 4200 });
  }

  setStory('',
    `As ruas de Kurosaki são silenciosas demais para uma cidade deste tamanho. As poucas pessoas que caminham por ali têm o mesmo olhar vazio, como se algo tivesse sido tirado delas, aos poucos, há muito tempo.`,
    [
      { icon:'↩', text:'Voltar à Travessia de Kurogane', action: storyNode_travessia_kurogane },
    ],
    null
  );

  if (!G.kurosaki.hubiFalouNaCidade) {
    G.kurosaki.hubiFalouNaCidade = true;
    hubiWorldPinMostrar({
      x: 60, y: 55,
      texto: 'Sinto a mesma coisa da ponte aqui... só que mais forte.',
      atrasoMs: 2600,
      autoCloseMs: 5200,
    });
  }

  // Pin da casa do Alberon — só depois de zerar Inazami; a porta só abre de dia
  // (amanhecer/manhã/tarde). Some ao trocar de cena (cleanup do setScene).
  _kurosakiSincronizarPinCasaAlberon();
  _kurosakiSincronizarPinImperio();
  _kurosakiSincronizarPinHiroto();

  // Pin clicável sobre o Núcleo de Pedra — some sozinho ao trocar de
  // cena, junto com os outros personagemPin (mesmo cleanup automático
  // do setScene, ver item 4b acima).
  personagemPinMostrar({
    id: 'pedra_nucleo_kurosaki',
    x: PEDRA_NUCLEO_KUROSAKI_CONFIG.X,
    y: PEDRA_NUCLEO_KUROSAKI_CONFIG.Y,
    img: 'Imagens/Cidade das pedras/kiuij.png',
    alt: 'Núcleo de Pedra',
    onClick: mostrarInfoPedraNucleo,
  });
}

// ─────────────────────────────────────────────────────────────
//  7b. CASA DE ALBERON — por dentro
//      Alberon Drumm (o anão do Caldeirão, na Masmorra Inazami) é natural
//      de Kurosaki. Ele volta de vez em quando à casa dele — é aqui que o
//      jogador o encontra, vê o card dele e pode puxar conversa.
//      Só abre de dia (amanhecer/manhã/tarde); à noite a porta está
//      trancada. O pin da casa fica sempre visível no mapa.
// ─────────────────────────────────────────────────────────────
const KUROSAKI_ALBERON_RETRATO = 'Imagens/personagens/aberonDrumm.png';
const KUROSAKI_ALBERON_CENARIO = 'Imagens/Cidade das pedras/caaber.png';

function _kurosakiAlberonCenario() {
  _kurosakiEmCasaAlberon = true;
  personagemPinRemover('casa_alberon_kurosaki');
  personagemPinRemover('pedra_nucleo_kurosaki');
  personagemPinRemover('hiroto_kurosaki');
  personagemPinRemover('imperio_kurosaki'); // o pin 帝 é da rua, não pode aparecer dentro da casa
  personagemPinRemover('npc_rua_1'); personagemPinRemover('npc_rua_2'); personagemPinRemover('npc_rua_3');
  const bg = document.getElementById('scene-bg');
  if (bg) {
    bg.style.backgroundImage = `url('${KUROSAKI_ALBERON_CENARIO}')`;
    bg.style.backgroundSize = 'cover';
    bg.style.backgroundPosition = 'center';
  }
  // Armazém (armazem.js): pin do baú no canto da casa
  if (typeof armazemPinMostrar === 'function') armazemPinMostrar();
}

// ── Minimizar o painel de conversa pra ver o cenário da casa (e o pin do
//    armazém). Um botão flutuante traz a conversa de volta. ──
function _kurosakiCasaRestaurarPainel() {
  const painel = document.getElementById('interaction-panel');
  if (painel) painel.style.removeProperty('display');
  const b = document.getElementById('casa-alberon-restaurar');
  if (b) b.remove();
}

function kurosakiCasaMinimizar() {
  const painel = document.getElementById('interaction-panel');
  const cena = document.querySelector('.scene-panel');
  if (!painel || !cena) return;
  painel.style.setProperty('display', 'none', 'important');
  if (document.getElementById('casa-alberon-restaurar')) return;
  const b = document.createElement('button');
  b.id = 'casa-alberon-restaurar';
  b.textContent = '▲ Voltar à conversa';
  b.style.cssText = "position:absolute;left:50%;bottom:14px;transform:translateX(-50%);z-index:25;"
    + "background:rgba(10,6,2,0.92);border:1px solid rgba(200,150,10,0.6);color:#f0c040;"
    + "padding:10px 18px;font-family:'Noto Serif JP',serif;font-size:0.72rem;letter-spacing:2px;"
    + "border-radius:20px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,0.6);";
  b.onclick = _kurosakiCasaRestaurarPainel;
  cena.appendChild(b);
}
window.kurosakiCasaMinimizar = kurosakiCasaMinimizar;

// ── Desbloqueio da Casa do Alberon (+ Armazém) ──
// Chamado quando o boss final de Inazami (Hi-no-Kagutsuchi) é derrotado
// (gancho no endBattle, palDinh.js). Pode ser chamado de qualquer lugar:
//   window.kurosakiLiberarCasaAlberon();
function kurosakiLiberarCasaAlberon() {
  kurosakiInit();
  if (G.kurosaki.casaAlberonLiberada && G.kurosaki.casaAlberonPopupVisto) return;
  G.kurosaki.casaAlberonLiberada = true;
  if (typeof addLog === 'function') addLog('🏠 Casa do Alberon desbloqueada em Kurosaki — com um armazém dentro.', 'xp');
  if (!G.kurosaki.casaAlberonPopupVisto) {
    G.kurosaki.casaAlberonPopupVisto = true;
    kurosakiMostrarDesbloqueioCasa(() => {
      if (G.location === 'cidade-kurosaki') _kurosakiSincronizarPinCasaAlberon();
    });
  }
}
window.kurosakiLiberarCasaAlberon = kurosakiLiberarCasaAlberon;

// Pop-up no mesmo estilo do "NOVO ALIADO" do HuBi (hubi.js), com as duas
// novidades organizadas numa mensagem só: a casa e o armazém.
function kurosakiMostrarDesbloqueioCasa(onContinue) {
  const old = document.getElementById('casa-alberon-desbloqueio');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'casa-alberon-desbloqueio';
  overlay.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;z-index:10000;
    background:rgba(0,0,0,0.88);display:flex;flex-direction:column;
    align-items:center;justify-content:center;padding:24px;text-align:center;overflow-y:auto;
  `;
  overlay.innerHTML = `
    <div style="font-family:'Noto Sans JP',sans-serif;font-size:0.6rem;letter-spacing:6px;color:#f0c040;margin-bottom:14px;">NOVO LOCAL DESBLOQUEADO</div>
    <img src="${KUROSAKI_ALBERON_CENARIO}" onerror="this.style.display='none';"
         style="max-width:250px;max-height:190px;object-fit:cover;border:1px solid rgba(240,192,64,0.45);filter:drop-shadow(0 0 18px rgba(240,192,64,0.5));margin-bottom:16px;">
    <div style="font-family:'Noto Serif JP',serif;font-size:1.2rem;color:var(--gold2);margin-bottom:12px;">Casa do Alberon</div>
    <div style="max-width:300px;text-align:left;font-family:'Noto Serif JP',serif;margin-bottom:22px;">
      <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:10px;">
        <span style="font-size:1.1rem;">🏠</span>
        <div>
          <div style="font-size:0.8rem;color:#f0c040;">Casa do Alberon</div>
          <div style="font-size:0.7rem;color:rgba(242,232,208,0.65);line-height:1.5;">Agora aparece em Kurosaki. Abre de dia — à noite a porta fica trancada.</div>
        </div>
      </div>
      <div style="display:flex;gap:10px;align-items:flex-start;">
        <span style="font-size:1.1rem;">📦</span>
        <div>
          <div style="font-size:0.8rem;color:#f0c040;">Armazém desbloqueado</div>
          <div style="font-size:0.7rem;color:rgba(242,232,208,0.65);line-height:1.5;">Dentro da casa dele. Guarde itens e retire quando precisar.</div>
        </div>
      </div>
    </div>
    <button id="_casa_alberon_continuar" style="
      font-family:'Noto Serif JP',serif;font-size:0.75rem;letter-spacing:1px;
      padding:10px 26px;border:1px solid rgba(240,192,64,0.55);background:rgba(200,150,10,0.16);
      color:#f0c040;cursor:pointer;">Continuar</button>
  `;
  document.body.appendChild(overlay);
  const btn = document.getElementById('_casa_alberon_continuar');
  if (btn) btn.onclick = () => {
    overlay.remove();
    if (typeof onContinue === 'function') onContinue();
  };
}
window.kurosakiMostrarDesbloqueioCasa = kurosakiMostrarDesbloqueioCasa;

function storyNode_kurosaki_casa_alberon() {
  kurosakiInit();
  fecharCardAlberon();
  _kurosakiCasaRestaurarPainel();

  // Casa ainda não liberada (só abre depois de zerar a masmorra Inazami)
  if (!G.kurosaki.casaAlberonLiberada) {
    setStory('',
      `A casa está fechada e coberta de poeira. Parece que ninguém vive ali há muito tempo.`,
      [{ icon:'↩', text:'Voltar', action: storyNode_cidade_kurosaki_entrada }],
      null
    );
    return;
  }

  if (!_kurosakiEhDia()) {
    setStory('',
      `A porta está trancada e não há luz nenhuma lá dentro. Alberon deve estar dormindo — volte quando o dia clarear (o relógio no topo mostra quanto falta).`,
      [{ icon:'↩', text:'Voltar', action: storyNode_cidade_kurosaki_entrada }],
      null
    );
    return;
  }

  _kurosakiAlberonCenario();

  // Entrar na casa mostra só o cenário (com o pin do armazém) e deixa o
  // jogador escolher: falar com o Alberon, abrir o armazém ou sair.
  setStory('',
    `A casa cheira a ervas secas e metal frio. Frascos enfileirados nas prateleiras, um caldeirão ainda soltando fagulhas azuis sobre a mesa e uma escada de madeira que sobe pro andar de cima. Embaixo da escada, num canto, o baú do armazém. Alberon está por perto, sem pressa de puxar assunto.`,
    [
      { icon:'💬', text:'Falar com Alberon', action: kurosakiAlberonAbrirConversa },
      { icon:'📦', text:'Abrir o armazém', action: () => { if (typeof armazemAbrir === 'function') armazemAbrir(); } },
      { icon:'🏠', text:'Ver a casa', action: kurosakiCasaMinimizar },
      { icon:'↩', text:'Sair da casa', action: kurosakiSairCasaAlberon },
    ],
    null
  );
}
window.storyNode_kurosaki_casa_alberon = storyNode_kurosaki_casa_alberon;

// Saudação do Alberon (antes era a primeira coisa que aparecia ao entrar)
function kurosakiAlberonAbrirConversa() {
  kurosakiInit();
  _kurosakiAlberonCenario();

  const jaConversou = !!G.kurosaki.alberonConversaVista;
  const aguardaMateriais = !!G.kurosaki.alberonPedidoSelo && !G.kurosaki.selosYuFortificado;
  const texto = kurosakiAlberonCuraLiberada()
    ? `Alberon está de pé, parado no meio da casa, como se estivesse esperando você abrir a porta.\n\n"Voltou. Bom. Senta um minuto, rapaz. Preciso falar contigo."`
    : aguardaMateriais
    ? `"Voltou..." Ele ergue os olhos devagar. "Trouxe o que pedi? O emblema, as pérolas, a peçonha? O caldeirão está pronto. É a única coisa por aqui que me obedece sem reclamar."`
    : G.kurosaki.selosYuFortificado
    ? `Alberon está sentado à janela, olhando a rua vazia. Só percebe você quando a porta range.\n\n"Hm. É você. Entra, mas limpa a bota. Não repara na casa, já não tenho ânimo pra arrumar."`
    : jaConversou
    ? `"Voltou..." A voz dele é baixa, cansada. "Entra, entra, mas não repara na bagunça. Ficar sozinho aqui pesa mais do que parece, e o pó não ajuda."`
    : `Um velho anão está sentado à mesa, as mãos paradas em volta de um frasco que já parou de borbulhar. Ele demora a erguer os olhos, e, quando ergue, parecem carregar mais anos do que o rosto.\n\n"Hmpf. Visita. Faz tempo que ninguém bate nessa porta, e eu já tinha me acostumado com o silêncio."\n\n"Alberon Drumm. Esta casa já foi cheia de barulho. Hoje até a poeira anda quieta."`;

  setStory('ALBERON', texto, _kurosakiAlberonOpcoes(), KUROSAKI_ALBERON_RETRATO);
}
window.kurosakiAlberonAbrirConversa = kurosakiAlberonAbrirConversa;

function _kurosakiAlberonOpcoes() {
  const k = G.kurosaki || {};
  // Menu principal enxuto: Conversar, Armazém, (Entregar a runa), Observar, Sair.
  // O card e a vista da casa ficam dentro de "Observar".
  const ops = [
    { icon:'💬', text:'Conversar' + ((kurosakiAlberonCuraLiberada() || kurosakiAlberonPresidentePendente()) ? ' ❗' : ''), action: kurosakiAlberonConversar },
    { icon:'📦', text:'Abrir o armazém', action: () => { if (typeof armazemAbrir === 'function') armazemAbrir(); } },
  ];
  if (k.alberonPedidoSelo && !k.selosYuFortificado) {
    ops.push({ icon:'🔴', text:'Entregar a runa' + (_kurosakiTemTodosMateriais() ? ' ✓' : ''), action: storyNode_kurosaki_alberon_entrega });
  }
  ops.push({ icon:'🔎', text:'Observar', action: kurosakiAlberonObservar });
  ops.push({ icon:'↩', text:'Sair da casa', action: kurosakiSairCasaAlberon });
  return ops;
}

// Volta ao menu principal sem repetir a saudação
function kurosakiAlberonMenu() {
  _kurosakiAlberonCenario();
  _alberonFala(`Alberon espera, as mãos paradas em volta do frasco.`, _kurosakiAlberonOpcoes());
}
window.kurosakiAlberonMenu = kurosakiAlberonMenu;

// "Observar": o card do Alberon e a vista da casa (saíram do menu principal)
function kurosakiAlberonObservar() {
  _kurosakiAlberonCenario();
  _alberonFala(
    `A casa cheira a ervas secas e metal frio. Alberon não liga pra você olhar em volta.`,
    [
      { icon:'🃏', text:'Ver card de Alberon', action: mostrarCardAlberon },
      { icon:'🏠', text:'Ver a casa', action: kurosakiCasaMinimizar },
      { icon:'↩', text:'Voltar', action: kurosakiAlberonMenu },
    ]
  );
}
window.kurosakiAlberonObservar = kurosakiAlberonObservar;

// Assuntos disponíveis agora. Com 1 só, o "Conversar" vai direto nele;
// com 2 ou mais, abre uma lista curta (o assunto novo vem primeiro, com ❗).
function _kurosakiAlberonTopicos() {
  const k = G.kurosaki;
  // 1ª vez: só existe a conversa de abertura
  if (!k.alberonConversaVista && !k.alberonPedidoSelo && !k.selosYuFortificado) {
    return [{ icon:'💬', text:'Puxar conversa', run: storyNode_kurosaki_alberon_conversa1 }];
  }
  const t = [];
  if (kurosakiAlberonPresidentePendente()) {
    t.push({ icon:'❗', text:'Quem governa Kurosaki?', run: storyNode_kurosaki_alberon_presidente1 });
  }
  if (kurosakiAlberonCuraLiberada()) {
    t.push({ icon:'❗', text:'A cidade e o Presidente', run: storyNode_kurosaki_alberon_cura1 });
  }
  if (k.selosYuFortificado)   t.push({ icon:'🔴', text:'A Runa Yu',        run: storyNode_kurosaki_alberon_pos_fortificado });
  else if (k.alberonPedidoSelo) t.push({ icon:'🔴', text:'O pedido da runa', run: storyNode_kurosaki_alberon_lembrete });
  else                          t.push({ icon:'🔴', text:'A Runa Yu',        run: storyNode_kurosaki_alberon_conversa7 });
  if (k.selosYuFortificado && k.alberonCuraVista) {
    t.push({ icon:'🧪', text:'O antídoto', run: storyNode_kurosaki_alberon_cura_lembrete });
  }
  // Save que já venceu o duelo da Hiroto antes do cristal existir: pega aqui
  const temCristal = ((G.player && G.player.inventory) || []).some(i => i && i.id === 'cristal_elo');
  if ((k.hirotoAcompanha || k.hirotoAliada || k.hirotoDueloVencido) && !temCristal) {
    t.push({ icon:'💠', text:'O cristal', run: storyNode_kurosaki_alberon_cristal1 });
  }
  return t;
}

function kurosakiAlberonConversar() {
  kurosakiInit();
  _kurosakiAlberonCenario();
  const topicos = _kurosakiAlberonTopicos();
  if (topicos.length === 1) return topicos[0].run();
  _alberonFala(
    `Ele ergue os olhos do frasco.\n\n"Fala. Sobre o quê?"`,
    topicos.map(t => ({ icon:t.icon, text:t.text, action:t.run })).concat([
      { icon:'↩', text:'Voltar', action: kurosakiAlberonMenu },
    ])
  );
}
window.kurosakiAlberonConversar = kurosakiAlberonConversar;

function kurosakiSairCasaAlberon() {
  fecharCardAlberon();
  _kurosakiCasaRestaurarPainel();
  if (typeof armazemPinRemover === 'function') armazemPinRemover();
  _kurosakiEmCasaAlberon = false;
  kurosakiInit();
  // (o pin preto do Império só aparece depois que o Alberon apresenta o Presidente e avisa da reunião)
  const bg = document.getElementById('scene-bg');
  if (bg) bg.style.backgroundImage = '';
  storyNode_cidade_kurosaki_entrada();
}
window.kurosakiSairCasaAlberon = kurosakiSairCasaAlberon;

// ── Card do Alberon (pop-up com a arte + botão pra iniciar a conversa) ──
function _cardAlberonGarantirDOM() {
  if (document.getElementById('alberon-card-overlay')) return;
  const el = document.createElement('div');
  el.id = 'alberon-card-overlay';
  el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.86);display:none;align-items:center;justify-content:center;z-index:9999;padding:16px;';
  el.onclick = (e) => { if (e.target === el) fecharCardAlberon(); };
  document.body.appendChild(el);
}

function mostrarCardAlberon() {
  _cardAlberonGarantirDOM();
  const overlay = document.getElementById('alberon-card-overlay');
  overlay.innerHTML = `
    <div style="background:#0f0a04;border:1px solid rgba(200,150,10,0.4);max-width:360px;width:100%;padding:0 0 16px;text-align:center;max-height:94vh;overflow:auto;">
      <img src="${KUROSAKI_ALBERON_RETRATO}" alt="Alberon Drumm" style="width:100%;max-height:58vh;object-fit:contain;display:block;background:#000;" onerror="this.style.display='none';">
      <div style="font-family:'Noto Serif JP',serif;font-size:1rem;color:#f0c040;letter-spacing:1px;margin:12px 0 4px;">ALBERON DRUMM</div>
      <div style="font-size:0.66rem;color:rgba(200,150,10,0.7);letter-spacing:2px;margin-bottom:8px;">ANÃO ALQUIMISTA · FILHO DE KUROSAKI</div>
      <div style="font-size:0.78rem;color:rgba(255,255,255,0.8);line-height:1.6;text-align:left;padding:0 18px;">Nascido em Kurosaki, carrega no rosto o peso de ver a cidade adoecer sem poder impedir. Passa os dias entre frascos e ervas secas, num silêncio que pesa mais que a poeira.</div>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:14px;padding:0 14px;">
        <button onclick="iniciarConversaAlberonDoCard()" style="flex:1;background:rgba(200,150,10,0.14);border:1px solid rgba(200,150,10,0.55);color:#f0c040;padding:9px 10px;font-family:'Noto Serif JP',serif;font-size:0.68rem;letter-spacing:2px;cursor:pointer;">💬 CONVERSAR</button>
        <button onclick="fecharCardAlberon()" style="flex:1;background:transparent;border:1px solid rgba(200,150,10,0.4);color:rgba(200,150,10,0.7);padding:9px 10px;font-family:'Noto Serif JP',serif;font-size:0.68rem;letter-spacing:2px;cursor:pointer;">FECHAR</button>
      </div>
    </div>
  `;
  overlay.style.display = 'flex';
}
window.mostrarCardAlberon = mostrarCardAlberon;

function fecharCardAlberon() {
  const overlay = document.getElementById('alberon-card-overlay');
  if (overlay) overlay.style.display = 'none';
}
window.fecharCardAlberon = fecharCardAlberon;

function iniciarConversaAlberonDoCard() {
  fecharCardAlberon();
  kurosakiAlberonConversar();
}
window.iniciarConversaAlberonDoCard = iniciarConversaAlberonDoCard;

// ── Conversa com o Alberon ──────────────────────────────────
//  Tom: um velho que SOFRE por Kurosaki, a cidade onde nasceu, e que foi
//  levado dali à força (obrigação, não serviço). De propósito NADA aqui
//  revela o que a Masmorra de Inazami conta — sem nomes, sem selo do Oni,
//  sem planos. Ele só deixa claro que não teve escolha.
function _alberonFala(texto, opcoes) {
  setStory('ALBERON', texto, opcoes, KUROSAKI_ALBERON_RETRATO);
}

function storyNode_kurosaki_alberon_conversa1() {
  _kurosakiAlberonCenario();
  _alberonFala(
    `"Conversar..." Ele repete a palavra devagar, como quem prova algo que já esqueceu o gosto. "Faz tempo que só falo com os frascos. Ouvem bem, mas nunca respondem. Pelo menos não discutem."\n\n"Você viu a cidade lá fora. Não precisa dizer nada, tá na sua cara."\n\nAlberon esfrega as mãos calejadas, sem olhar pra você.\n\n"Eu nasci nessa pedra, rapaz. Aprendi a andar nessas ruas. E vi cada uma delas apagar, uma depois da outra."`,
    [{ icon:'▶', text:'Continuar', action: storyNode_kurosaki_alberon_conversa2 }]
  );
}
window.storyNode_kurosaki_alberon_conversa1 = storyNode_kurosaki_alberon_conversa1;

function storyNode_kurosaki_alberon_conversa2() {
  _alberonFala(
    `"Kurosaki tá apodrecendo. Devagar, do jeito que apodrece o que ninguém cuida. Primeiro vem o silêncio... depois o resto."\n\n"Eu senti começar. Na pedra, no ar, até no gosto da água. Tentei segurar com o que sabia: ervas, banhos, remendos. Cada frasco que eu fazia era um remendo em pano podre."\n\nA voz dele falha por um instante, e ele pigarreia, bravo consigo mesmo.\n\n"E o pior... eu não pude ficar pra cuidar dela. Me tiraram daqui."`,
    [{ icon:'❓', text:'Tiraram você?', action: storyNode_kurosaki_alberon_conversa3 }]
  );
}
window.storyNode_kurosaki_alberon_conversa2 = storyNode_kurosaki_alberon_conversa2;

function storyNode_kurosaki_alberon_conversa3() {
  _alberonFala(
    `"Chamar de convite seria mentira. Foi ordem, de alguém que sabia que eu não tinha como dizer não."\n\nEle desvia o olhar pro frasco parado sobre a mesa.\n\n"Não me peça o resto. Se o seu caminho for por esse lado, você vê com os próprios olhos. Algumas coisas doem menos quando a gente descobre sozinho. Ou doem igual, mas pelo menos ninguém te contou antes."`,
    [{ icon:'💭', text:'Você não tinha escolha.', action: storyNode_kurosaki_alberon_conversa4 }]
  );
}
window.storyNode_kurosaki_alberon_conversa3 = storyNode_kurosaki_alberon_conversa3;

function storyNode_kurosaki_alberon_conversa4() {
  _alberonFala(
    `"Escolha..." Um sorriso curto, sem alegria nenhuma. "Tem gente que morre por escolher errado. Eu escolhi continuar vivo, e toda noite me pergunto se foi covardia."\n\n"Faço o que me mandam, com as mesmas mãos que já foram de Kurosaki. Não é serviço, rapaz. É dívida sem recibo. Corrente que ninguém enxerga, mas puxa."`,
    [{ icon:'🤝', text:'Isso não é covardia.', action: storyNode_kurosaki_alberon_conversa5 }]
  );
}
window.storyNode_kurosaki_alberon_conversa4 = storyNode_kurosaki_alberon_conversa4;

function storyNode_kurosaki_alberon_conversa5() {
  _alberonFala(
    `"Você quer ser gentil com um velho ranzinza. Aceito." Ele fecha os olhos por um momento. "Mas olha essa cidade e me diz se quem a viu definhar de longe consegue dormir em paz."\n\n"Só consigo voltar de vez em quando. Escondido, quase. Sento aqui e vejo o quanto piorou desde a última vez."`,
    [{ icon:'⚔️', text:'Eu vou fazer o que puder por Kurosaki.', action: storyNode_kurosaki_alberon_conversa6 }]
  );
}
window.storyNode_kurosaki_alberon_conversa5 = storyNode_kurosaki_alberon_conversa5;

function storyNode_kurosaki_alberon_conversa6() {
  G.kurosaki.alberonConversaVista = true;
  _alberonFala(
    `Ele demora a responder. Quando fala, a voz sai rouca:\n\n"Faz muito tempo que ninguém me diz isso. Obrigado, rapaz. De verdade."\n\n"Se um dia nossos caminhos se cruzarem longe daqui, procura o meu caldeirão. É o único canto que ainda é meu."\n\nAlberon faz menção de voltar ao frasco, mas o olhar cai sobre o que você carrega, e a mão para no ar.`,
    [{ icon:'▶', text:'Continuar', action: storyNode_kurosaki_alberon_conversa7 }]
  );
}
window.storyNode_kurosaki_alberon_conversa6 = storyNode_kurosaki_alberon_conversa6;

// ── Fortificação do Selo de Yu ──────────────────────────────
//  Alberon nota a Runa Yu que a sacerdotisa deu ao jogador (fim da
//  Dungeon das Sombras), diz que ele não aguenta a cidade apodrecendo e pede
//  materiais pra fortificá-lo. Entrega feita aqui mesmo, na casa, com
//  efeito visual de entrega + efeito visual do selo melhorando.
//  Ids e imagens conferidos com o ITEM_DB do palDinh.js.
// ── Lore oculta da Runa Yu ──────────────────────────────────
//  Texto que o jogador NÃO vê em lugar nenhum da interface (não entra em
//  desc/tooltip). Fica gravado no item como `loreOculta`, só pra consulta
//  de quem desenvolve e pra uso futuro (diálogos, easter eggs, bestiário).
const KUROSAKI_RUNA_YU_LORE_OCULTA =
  'Quando Alberon fortifica a Runa Yu, algo desperta nela. O brilho fraco que antes pulsava ao ritmo do seu coração agora arde firme, como brasa soprada.\n\n' +
  'Poucos sabem o que essa pedra realmente é. A sacerdotisa Yuki enxergou o que o jogador poderia se tornar e, por isso, não lhe entregou apenas uma runa: repartiu um pedaço do próprio poder e o selou dentro da pedra.\n\n' +
  'Foi esse fragmento que escondeu a chegada dele à cidade. O Presidente, que sente tudo o que cruza os seus muros, não percebeu nada. A Runa Yu é proteção contra todo mal e também apaga a presença de quem a carrega, de modo que o jogador passou diante dos olhos do mal sem deixar rastro.\n\n' +
  'O mesmo vale para a Cidade das Pedras, onde a runa o fez ser reconhecido como cidadão. A cidade guarda uma proteção imensa, que só parece frágil para quem não a conhece: um intruso que entra sem autorização é barrado. Com a runa, ele nunca foi um intruso.';

const KUROSAKI_FORTIFICAR_MATERIAIS = [
  { id:'emblema_rei_maldito', nome:'Emblema do Rei Maldito', qtd:1, icon:'👑',
    img:'Imagens/icones/materiais/Picsart_26-06-27_03-06-58-212.png' },
  { id:'perola_das_nove',     nome:'Pérola das Nove',        qtd:2, icon:'⚪', img:'Imagens/icones/materiais/perola_das_nove.png' },
  { id:'peconha_esmeralda',   nome:'Peçonha Esmeralda',      qtd:6, icon:'☠️', img:'Imagens/icones/materiais/peconha_esmeralda.png' },
];

function _kurosakiNorm(t) {
  return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
function _kurosakiCasaMaterial(it, mat) {
  return !!it && (it.id === mat.id || _kurosakiNorm(it.name) === _kurosakiNorm(mat.nome));
}
// Onde procurar os materiais: bolsa primeiro, depois o armazém do Alberon
// (G.armazem.itens, ver armazem.js) — material guardado lá também conta.
function _kurosakiListasMateriais() {
  const inv = (G.player && G.player.inventory) || [];
  const arm = (G.armazem && Array.isArray(G.armazem.itens)) ? G.armazem.itens : [];
  return [inv, arm];
}
function _kurosakiQtdMaterial(mat) {
  return _kurosakiListasMateriais().reduce((total, lista) =>
    total + lista.reduce((soma, it) => soma + (_kurosakiCasaMaterial(it, mat) ? (it.qty || 1) : 0), 0), 0);
}
function _kurosakiTemTodosMateriais() {
  return KUROSAKI_FORTIFICAR_MATERIAIS.every(m => _kurosakiQtdMaterial(m) >= m.qtd);
}
function _kurosakiConsumirMaterial(mat, qtd) {
  let falta = qtd;
  for (const lista of _kurosakiListasMateriais()) { // bolsa, depois armazém
    for (const it of lista.slice()) {
      if (falta <= 0) return;
      if (!_kurosakiCasaMaterial(it, mat)) continue;
      const q = it.qty || 1;
      const tira = Math.min(q, falta);
      if (q - tira <= 0) lista.splice(lista.indexOf(it), 1); else it.qty = q - tira;
      falta -= tira;
    }
  }
}
function _kurosakiListaMateriais() {
  return KUROSAKI_FORTIFICAR_MATERIAIS.map(m => {
    const tem = _kurosakiQtdMaterial(m);
    return `• ${m.nome}: ${Math.min(tem, m.qtd)}/${m.qtd}${tem >= m.qtd ? ' ✓' : ''}`;
  }).join('\n');
}
// Reconhece a Runa Yu pelo id, pelo nome OU pela imagem (cobre saves em que o
// item guardado ficou com id/nome diferente — era isso que fazia o Alberon
// dizer "E a runa?" mesmo com ela na Bolsa de Selos).
function _kurosakiEhYu(s) {
  return !!s && (s.id === 'runa_yu' || /^runa yu/i.test(s.name || '') ||
    /runa_yu\.png|Picsart_26-07-06_19-13-05-694/.test(s.imgSrc || s.img || ''));
}
// Todos os selos que o jogador tem (equipados, guardados e, por save antigo,
// a Runa Yu perdida no inventário comum).
function _kurosakiTodosSelos() {
  const p = (G && G.player) || {};
  const eq = (p.selosEquipados || []).filter(Boolean).map(s => ({ s, onde: 'Equipado' }));
  const gu = (p.selosGuardados || []).filter(Boolean).map(s => ({ s, onde: 'Guardado' }));
  const inv = (p.inventory || []).filter(it => _kurosakiEhYu(it)).map(s => ({ s, onde: 'Bolsa' }));
  return [].concat(eq, gu, inv);
}
function _kurosakiAcharSeloYu() {
  const ach = _kurosakiTodosSelos().find(x => _kurosakiEhYu(x.s));
  return ach ? ach.s : null;
}
// Runa Yu está EQUIPADA?
function _kurosakiRunaEquipada() {
  if (((G.player && G.player.selosEquipados) || []).some(s => _kurosakiEhYu(s))) return true;
  return (typeof playerTemRunaYu === 'function') ? !!playerTemRunaYu() : false;
}
// Outros scripts (efeito do selo dentro da cidade) podem consultar isto
function kurosakiSeloYuFortificado() { return !!(G.kurosaki && G.kurosaki.selosYuFortificado); }
window.kurosakiSeloYuFortificado = kurosakiSeloYuFortificado;

// ── AR CORROSIVO — dano em Kurosaki enquanto a Runa Yu não estiver fortificada ──
//  Andando pela cidade (fora de batalha e fora da casa do Alberon) o ar
//  corrói o jogador em tempo real: 10% do HP máximo a cada 4s, atualizando
//  a barra de HP do HUD a cada golpe.
//    • Runa fortificada E equipada ... nenhum dano
//    • qualquer outro caso ........... dano cheio
//  A cura do HuBi fica BLOQUEADA enquanto o ar está corroendo — o hubi.js
//  precisa checar kurosakiCuraBloqueada() antes de curar (ver abaixo).
//  Nunca mata (mínimo 1 HP) — mude MORRE pra true se quiser dano letal.
const KUROSAKI_AR_CONFIG = {
  INTERVALO_MS: 4000,
  DANO_PCT:     0.10,
  MORRE:        false,
};

function kurosakiRunaProtege() {
  const am = _kurosakiAcharSeloYu();
  return !!(am && _kurosakiRunaEquipada() && G.kurosaki && G.kurosaki.selosYuFortificado);
}
window.kurosakiRunaProtege = kurosakiRunaProtege;

// O ar está corroendo AGORA? (na cidade, fora da casa, sem proteção)
function _kurosakiArAtivo() {
  if (typeof G === 'undefined' || !G || !G.player) return false;
  if (G.location !== 'cidade-kurosaki' || _kurosakiEmCasaAlberon || G._kurosakiCutscene) return false;
  return !kurosakiRunaProtege();
}
// Use no hubi.js: if (window.kurosakiCuraBloqueada && kurosakiCuraBloqueada()) return;
function kurosakiCuraBloqueada() { return _kurosakiArAtivo(); }
window.kurosakiCuraBloqueada = kurosakiCuraBloqueada;

function _kurosakiFlashDanoAr() {
  _kurosakiEfeitosCSS();
  const d = document.createElement('div');
  d.className = 'kfx-dano';
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 1000);
}

// Número vermelho subindo perto da barra de HP
function _kurosakiNumeroDano(dano) {
  _kurosakiEfeitosCSS();
  const n = document.createElement('div');
  n.className = 'kfx-num';
  n.textContent = '-' + dano;
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 1200);
}

function _kurosakiTickAr() {
  if (!_kurosakiArAtivo()) return;
  if (window.__PG_DEBUG && window.__PG_DEBUG.noDamage) return; // modo debug: sem dano
  if (G.inBattle || G._kurosakiEntregando) return;

  const p = G.player;
  if ((p.hp || 0) <= (KUROSAKI_AR_CONFIG.MORRE ? 0 : 1)) return;
  const dano = Math.max(1, Math.floor((p.maxHp || 1) * KUROSAKI_AR_CONFIG.DANO_PCT));
  p.hp = KUROSAKI_AR_CONFIG.MORRE ? Math.max(0, p.hp - dano) : Math.max(1, p.hp - dano);
  if (typeof updateHUD === 'function') updateHUD(); // barra de HP em tempo real
  _kurosakiFlashDanoAr();
  _kurosakiNumeroDano(dano);

  kurosakiInit();
  if (!G.kurosaki.arAvisoSemRuna) {
    G.kurosaki.arAvisoSemRuna = true;
    notify('🩸 O pó corrosivo de Kurosaki queima você! Procure o Alberon — ele conhece a cidade.', 'red');
  }
}

function kurosakiIniciarArCorrosivo() {
  if (window._kurosakiArTimer) return;
  window._kurosakiArTimer = setInterval(() => { try { _kurosakiTickAr(); } catch (e) { console.error(e); } },
    KUROSAKI_AR_CONFIG.INTERVALO_MS);
}
window.kurosakiIniciarArCorrosivo = kurosakiIniciarArCorrosivo;
// Liga já no carregamento (o tick só age quando G.location === 'cidade-kurosaki'),
// assim o dano também vale se o save abrir direto dentro da cidade.
kurosakiIniciarArCorrosivo();

// ── Efeitos visuais (overlays autocontidos, sem depender de CSS do gat-1.html) ──
function _kurosakiEfeitosCSS() {
  if (document.getElementById('kurosaki-fx-css')) return;
  const st = document.createElement('style');
  st.id = 'kurosaki-fx-css';
  st.textContent = `
    .kfx-ov{position:fixed;inset:0;z-index:10050;display:flex;align-items:center;justify-content:center;flex-direction:column;
      background:radial-gradient(circle at 50% 55%,rgba(40,18,6,.96),rgba(0,0,0,.98));opacity:0;animation:kfxIn .35s ease forwards;}
    .kfx-ov.kfx-out{animation:kfxOut .45s ease forwards;}
    @keyframes kfxIn{to{opacity:1}} @keyframes kfxOut{to{opacity:0}}
    .kfx-txt{font-family:'Noto Serif JP',serif;color:#f0c040;letter-spacing:3px;font-size:.78rem;text-align:center;margin-top:18px;opacity:0;animation:kfxTxt .8s ease .4s forwards;padding:0 20px;}
    .kfx-sub{font-family:'Noto Serif JP',serif;color:rgba(255,255,255,.6);letter-spacing:2px;font-size:.62rem;margin-top:8px;opacity:0;animation:kfxTxt .8s ease 2.2s forwards;}
    @keyframes kfxTxt{to{opacity:1}}
    .kfx-skip{position:absolute;bottom:22px;font-size:.6rem;letter-spacing:2px;color:rgba(200,150,10,.45);font-family:'Noto Serif JP',serif;}
    .kfx-dano{position:fixed;inset:0;z-index:10040;pointer-events:none;box-shadow:inset 0 0 90px 30px rgba(190,20,20,.75);
      opacity:0;animation:kfxDano .9s ease-out forwards;}
    @keyframes kfxDano{0%{opacity:0}25%{opacity:1}100%{opacity:0}}
    .kfx-num{position:fixed;top:150px;right:22px;z-index:10045;pointer-events:none;font-family:'Noto Serif JP',serif;
      font-size:1.3rem;font-weight:700;color:#ff4a3a;text-shadow:0 0 8px #000,0 0 14px rgba(190,20,20,.9);
      animation:kfxNum 1.2s ease-out forwards;}
    @keyframes kfxNum{0%{opacity:0;transform:translateY(8px)}20%{opacity:1}100%{opacity:0;transform:translateY(-34px)}}
    /* ── entrega ── */
    .kfx-stage{position:relative;width:280px;height:330px;}
    .kfx-cauldron{position:absolute;left:50%;bottom:0;width:150px;height:150px;margin-left:-75px;border-radius:50%;
      background:radial-gradient(circle at 50% 40%,#3b2a4a,#150c1c 70%);border:2px solid rgba(200,150,10,.6);
      box-shadow:0 0 18px rgba(140,80,220,.5);display:flex;align-items:center;justify-content:center;font-size:3.4rem;
      animation:kfxCald 3.6s ease-in-out forwards;}
    @keyframes kfxCald{0%{box-shadow:0 0 14px rgba(140,80,220,.4)}30%{box-shadow:0 0 40px rgba(170,90,255,.9)}
      60%{box-shadow:0 0 55px rgba(120,255,160,.9)}85%{box-shadow:0 0 90px rgba(255,235,170,1)}100%{box-shadow:0 0 30px rgba(200,150,10,.7)}}
    .kfx-item{position:absolute;left:50%;top:0;width:64px;height:64px;margin-left:-32px;border-radius:50%;
      background:rgba(15,10,4,.9);border:1px solid rgba(200,150,10,.7);display:flex;align-items:center;justify-content:center;
      font-size:2rem;opacity:0;overflow:hidden;box-shadow:0 0 14px rgba(240,192,64,.6);
      animation:kfxDrop 1.1s ease-in forwards;animation-delay:var(--d);}
    .kfx-item img{width:100%;height:100%;object-fit:contain;}
    .kfx-item b{position:absolute;bottom:0;right:4px;font-size:.62rem;color:#f0c040;font-weight:700;text-shadow:0 0 4px #000;}
    @keyframes kfxDrop{0%{opacity:0;transform:translate(var(--dx),-20px) scale(.7)}
      20%{opacity:1;transform:translate(var(--dx),10px) scale(1)}
      75%{opacity:1;transform:translate(0,190px) scale(1)}100%{opacity:0;transform:translate(0,235px) scale(.25)}}
    .kfx-bub{position:absolute;bottom:60px;width:8px;height:8px;border-radius:50%;background:rgba(200,255,200,.65);opacity:0;
      animation:kfxBub 1.8s ease-in infinite;animation-delay:var(--d);}
    @keyframes kfxBub{0%{opacity:0;transform:translateY(0) scale(.5)}20%{opacity:.9}100%{opacity:0;transform:translateY(-130px) scale(1.3)}}
    .kfx-flash{position:absolute;inset:0;background:#fff;opacity:0;animation:kfxFlash .7s ease 2.9s forwards;pointer-events:none;}
    @keyframes kfxFlash{0%{opacity:0}35%{opacity:.85}100%{opacity:0}}
    /* ── selo melhorado ── */
    .kfx-selo{position:relative;width:250px;height:250px;display:flex;align-items:center;justify-content:center;}
    .kfx-ring{position:absolute;inset:0;border-radius:50%;border:2px dashed rgba(240,192,64,.65);animation:kfxSpin 6s linear infinite;}
    .kfx-ring.r2{inset:22px;border:1px solid rgba(190,120,255,.6);animation:kfxSpin 4s linear infinite reverse;}
    @keyframes kfxSpin{to{transform:rotate(360deg)}}
    .kfx-pulse{position:absolute;left:50%;top:50%;width:120px;height:120px;margin:-60px 0 0 -60px;border-radius:50%;
      border:2px solid rgba(255,220,120,.9);opacity:0;animation:kfxPulse 1.6s ease-out infinite;animation-delay:var(--d);}
    @keyframes kfxPulse{0%{opacity:.9;transform:scale(.6)}100%{opacity:0;transform:scale(2.4)}}
    .kfx-img{position:relative;z-index:2;width:130px;height:130px;display:flex;align-items:center;justify-content:center;font-size:4.5rem;
      animation:kfxSelo 3.6s ease forwards;}
    .kfx-img img{width:100%;height:100%;object-fit:contain;}
    @keyframes kfxSelo{0%{filter:brightness(.45) grayscale(.7) drop-shadow(0 0 0 transparent);transform:scale(.9)}
      40%{filter:brightness(.7) grayscale(.4) drop-shadow(0 0 6px rgba(240,192,64,.4));transform:scale(1)}
      55%{filter:brightness(2.6) grayscale(0) drop-shadow(0 0 30px #fff);transform:scale(1.25)}
      100%{filter:brightness(1.25) grayscale(0) drop-shadow(0 0 18px rgba(240,192,64,.95)) drop-shadow(0 0 34px rgba(170,90,255,.7));transform:scale(1.08)}}
    .kfx-spark{position:absolute;left:50%;top:50%;width:6px;height:6px;margin:-3px;border-radius:50%;background:#ffe9a0;
      box-shadow:0 0 8px #ffd35a;opacity:0;animation:kfxSpark 1.5s ease-out infinite;animation-delay:var(--d);}
    @keyframes kfxSpark{0%{opacity:0;transform:rotate(var(--a)) translateX(30px)}20%{opacity:1}
      100%{opacity:0;transform:rotate(var(--a)) translateX(135px)}}
  `;
  document.head.appendChild(st);
}

function _kurosakiFxImg(src, icon) {
  return src
    ? `<img src="${src}" alt="" onerror="this.outerHTML='${icon}'">`
    : icon;
}

// Roda um overlay por `ms` milissegundos (toque pula depois de 1s) e chama cb()
function _kurosakiRodarOverlay(html, ms, cb) {
  _kurosakiEfeitosCSS();
  const ov = document.createElement('div');
  ov.className = 'kfx-ov';
  ov.innerHTML = html + '<div class="kfx-skip">TOQUE PARA PULAR</div>';
  document.body.appendChild(ov);
  let feito = false;
  const t0 = Date.now();
  const fim = () => {
    if (feito) return; feito = true;
    ov.classList.add('kfx-out');
    setTimeout(() => { ov.remove(); if (typeof cb === 'function') cb(); }, 450);
  };
  ov.addEventListener('click', () => { if (Date.now() - t0 > 1000) fim(); });
  setTimeout(fim, ms);
}

// Efeito 1: os materiais caem um a um no caldeirão do Alberon
function _kurosakiEfeitoEntrega(itens, cb) {
  const dxs = ['-90px', '0px', '90px'];
  const its = itens.map((m, i) => `
    <div class="kfx-item" style="--d:${(0.5 + i * 0.75).toFixed(2)}s;--dx:${dxs[i % 3]};">
      ${_kurosakiFxImg(m.img, m.icon)}<b>×${m.qtd}</b>
    </div>`).join('');
  const bubs = Array.from({ length: 9 }, (_, i) =>
    `<div class="kfx-bub" style="left:${70 + Math.round(Math.random() * 140)}px;--d:${(i * 0.23).toFixed(2)}s"></div>`).join('');
  _kurosakiRodarOverlay(`
    <div class="kfx-stage">
      ${its}
      <div class="kfx-cauldron">⚗️</div>
      ${bubs}
    </div>
    <div class="kfx-txt">ALBERON RECEBE OS MATERIAIS</div>
    <div class="kfx-flash"></div>`, 3700, cb);
}

// Efeito 2: o Selo de Yu acende, treme e sai fortificado
function _kurosakiEfeitoSelo(seloItem, cb) {
  const img = seloItem ? (seloItem.imgSrc || seloItem.img || '') : '';
  const icon = (seloItem && seloItem.icon) || '🔴';
  const sparks = Array.from({ length: 16 }, (_, i) =>
    `<div class="kfx-spark" style="--a:${i * 22.5}deg;--d:${(1.4 + (i % 5) * 0.18).toFixed(2)}s"></div>`).join('');
  _kurosakiRodarOverlay(`
    <div class="kfx-selo">
      <div class="kfx-ring"></div><div class="kfx-ring r2"></div>
      <div class="kfx-pulse" style="--d:1.3s"></div>
      <div class="kfx-pulse" style="--d:1.9s"></div>
      <div class="kfx-pulse" style="--d:2.5s"></div>
      ${sparks}
      <div class="kfx-img">${_kurosakiFxImg(img, icon)}</div>
    </div>
    <div class="kfx-txt" style="animation-delay:1.6s">✦ RUNA YU FORTIFICADA ✦</div>
    <div class="kfx-sub">agora resiste ao ar de Kurosaki</div>`, 4200, cb);
}

function storyNode_kurosaki_alberon_conversa7() {
  _kurosakiAlberonCenario();
  _alberonFala(
    `Ele semicerra os olhos e se aproxima devagar, olhando a sua bolsa.\n\n"Esse selo aí... pedra fosca, sem brilho nenhum. Feio de dar dó. É da sacerdotisa, não é? A Runa Yu. Reconheço o trabalho da Yuki de longe."\n\nEle não diz isso com desprezo. Diz como quem conhece a dor que vem junto.\n\n"Deixa eu adivinhar: desde que você pisou nessas ruas, a pele anda ardendo e o seu HP só desce."`,
    [{ icon:'❓', text:'Como você sabe?', action: storyNode_kurosaki_alberon_conversa8 }]
  );
}
window.storyNode_kurosaki_alberon_conversa7 = storyNode_kurosaki_alberon_conversa7;

function storyNode_kurosaki_alberon_conversa8() {
  _alberonFala(
    `"É o pó corrosivo. Cai das pedras do núcleo, fino como cinza, e a cidade respira isso há anos. Quem é de fora e anda sem proteção sente na carne: queima por dentro, devagar, sem parar."\n\n"E não adianta se curar. Poção, cantoria do seu bichinho verde... enquanto o pó estiver no ar, a cura não pega. Pó não negocia com cantoria. O povo daqui nem sente mais, de tão acostumado. Ou de tão vazio."\n\nEle vira o olhar pra sua runa.\n\n"A Runa Yu é a única coisa que te protege, mas do jeito que está é mais enfeite que proteção. O pó come ela também. Ela precisa ser fortificada."`,
    [{ icon:'🔨', text:'Você consegue fazer isso?', action: storyNode_kurosaki_alberon_conversa9 }]
  );
}
window.storyNode_kurosaki_alberon_conversa8 = storyNode_kurosaki_alberon_conversa8;

function storyNode_kurosaki_alberon_conversa9() {
  kurosakiInit();
  G.kurosaki.alberonPedidoSelo = true;
  _alberonFala(
    `"Consigo. É das poucas coisas que ainda faço sem que ninguém mande."\n\n"Preciso de UM Emblema do Rei Maldito, DUAS Pérolas das Nove e SEIS Peçonhas Esmeralda. Coisas que já conviveram com maldição e sobreviveram, que nem eu."\n\n"Traz tudo e me entrega a runa. Quando eu terminar, deixa ela equipada na Bolsa de Selos, senão não protege. Não é grande coisa, mas é algo de bom que ainda posso fazer por Kurosaki."`,
    _kurosakiAlberonOpcoes()
  );
}
window.storyNode_kurosaki_alberon_conversa9 = storyNode_kurosaki_alberon_conversa9;

function storyNode_kurosaki_alberon_lembrete() {
  _kurosakiAlberonCenario();
  _alberonFala(
    `"Velho esquece as coisas. Deixa eu repetir:"\n\n${_kurosakiListaMateriais()}\n\n"Sem pressa. A cidade já aguentou tanto... aguenta mais um pouco. O seu HP, não sei."`,
    _kurosakiAlberonOpcoes()
  );
}
window.storyNode_kurosaki_alberon_lembrete = storyNode_kurosaki_alberon_lembrete;

// "Entregar a runa": abre um pop-up com os selos do jogador; ao escolher a
// Runa Yu, confere os materiais e roda o procedimento de fortificação.
function storyNode_kurosaki_alberon_entrega() {
  kurosakiInit();
  _kurosakiAlberonCenario();
  if (G.kurosaki.selosYuFortificado || G._kurosakiEntregando) return;
  _kurosakiAbrirPopupEntregaRuna();
}

function _kurosakiFecharPopupEntrega() {
  const o = document.getElementById('kurosaki-entrega-popup');
  if (o) o.remove();
}

function _kurosakiAbrirPopupEntregaRuna() {
  _kurosakiFecharPopupEntrega();
  const selos = _kurosakiTodosSelos();
  const ov = document.createElement('div');
  ov.id = 'kurosaki-entrega-popup';
  ov.style.cssText = 'position:fixed;inset:0;z-index:10020;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;padding:18px;';
  ov.onclick = (e) => { if (e.target === ov) _kurosakiFecharPopupEntrega(); };

  const cards = selos.length ? selos.map((x, i) => {
    const img = x.s.imgSrc || x.s.img || '';
    return `<div data-i="${i}" style="cursor:pointer;width:88px;text-align:center;">
      <div style="width:76px;height:76px;margin:0 auto 6px;border-radius:50%;border:2px solid rgba(240,192,64,0.6);background:rgba(15,10,4,0.95);
        display:flex;align-items:center;justify-content:center;overflow:hidden;font-size:2rem;box-shadow:0 0 12px rgba(240,192,64,0.25);">
        ${img ? `<img src="${img}" style="width:100%;height:100%;object-fit:contain;" onerror="this.outerHTML='${x.s.icon || '🔴'}'">` : (x.s.icon || '🔴')}
      </div>
      <div style="font-size:0.6rem;color:#f0c040;line-height:1.3;">${x.s.name || 'Selo'}</div>
      <div style="font-size:0.52rem;color:rgba(242,232,208,0.5);letter-spacing:1px;">${x.onde.toUpperCase()}</div>
    </div>`;
  }).join('') : `<div style="font-size:0.75rem;color:rgba(242,232,208,0.7);padding:10px;">Você não tem nenhum selo na Bolsa.</div>`;

  ov.innerHTML = `
    <div style="background:#0f0a04;border:1px solid rgba(200,150,10,0.45);max-width:360px;width:100%;padding:18px 14px 16px;text-align:center;font-family:'Noto Serif JP',serif;max-height:90vh;overflow:auto;">
      <div style="font-size:0.58rem;letter-spacing:5px;color:#f0c040;margin-bottom:6px;">ENTREGAR A RUNA</div>
      <div style="font-size:0.72rem;color:rgba(242,232,208,0.7);line-height:1.5;margin-bottom:16px;">Escolha a Runa Yu pra entregar a Alberon.</div>
      <div id="kurosaki-entrega-lista" style="display:flex;flex-wrap:wrap;gap:14px 10px;justify-content:center;margin-bottom:16px;">${cards}</div>
      <button id="kurosaki-entrega-cancelar" style="background:transparent;border:1px solid rgba(200,150,10,0.4);color:rgba(200,150,10,0.7);padding:8px 22px;font-family:'Noto Serif JP',serif;font-size:0.68rem;letter-spacing:2px;cursor:pointer;">CANCELAR</button>
    </div>`;
  document.body.appendChild(ov);
  document.getElementById('kurosaki-entrega-cancelar').onclick = _kurosakiFecharPopupEntrega;
  ov.querySelectorAll('[data-i]').forEach(el => {
    el.onclick = () => {
      const x = selos[parseInt(el.getAttribute('data-i'), 10)];
      _kurosakiFecharPopupEntrega();
      _kurosakiConfirmarEntregaRuna(x && x.s);
    };
  });
}

function _kurosakiConfirmarEntregaRuna(seloItem) {
  kurosakiInit();
  _kurosakiAlberonCenario();
  if (!seloItem || !_kurosakiEhYu(seloItem)) {
    _alberonFala(
      `Ele pega o selo, vira de um lado e do outro, e devolve.\n\n"Não é essa, rapaz. Eu preciso da Runa Yu, a que a sacerdotisa te deu. Essa aí eu não conheço, e não gosto do que não conheço."`,
      _kurosakiAlberonOpcoes()
    );
    return;
  }
  if (!_kurosakiTemTodosMateriais()) {
    _alberonFala(
      `Ele segura a runa com cuidado, depois espia a sua bolsa e o armazém, conta nos dedos e balança a cabeça, sem reprovação.\n\n"A runa é essa mesmo. Mas ainda falta coisa:"\n\n${_kurosakiListaMateriais()}\n\n"Não adianta me olhar assim, caldeirão não faz milagre sem ingrediente. Traz quando puder."`,
      _kurosakiAlberonOpcoes()
    );
    return;
  }
  _kurosakiExecutarFortificacao(seloItem);
}

function _kurosakiExecutarFortificacao(seloItem) {
  G._kurosakiEntregando = true;

  // Captura a arte dos materiais ANTES de consumir
  const visuais = KUROSAKI_FORTIFICAR_MATERIAIS.map(m => {
    const it = _kurosakiListasMateriais().reduce((ach, lista) => ach || lista.find(x => _kurosakiCasaMaterial(x, m)), null);
    return { icon: (it && it.icon) || m.icon, img: (it && (it.imgSrc || it.img)) || m.img, qtd: m.qtd };
  });

  // Consome e grava a fortificação JÁ (se recarregar no meio do efeito, nada se perde)
  KUROSAKI_FORTIFICAR_MATERIAIS.forEach(m => _kurosakiConsumirMaterial(m, m.qtd));
  G.kurosaki.selosYuFortificado = true;
  seloItem.fortificadoKurosaki = true;
  seloItem.loreOculta = KUROSAKI_RUNA_YU_LORE_OCULTA;
  seloItem.name = 'Runa Yu (Fortificada)';
  seloItem.desc = 'Runa entregue por Yuki e fortificada por Alberon. Protege contra o pó corrosivo da Cidade das Pedra enquanto estiver equipada no slot de Selo.';
  if (typeof updateHUD === 'function') updateHUD();
  if (typeof buildInventoryGrid === 'function') buildInventoryGrid();
  notify('🔨 Runa Yu fortificada por Alberon! Equipe-a na Bolsa (aba Selos) pra resistir ao ar de Kurosaki.', 'gold');
  addLog('Alberon fortificou a Runa Yu (1 Emblema do Rei Maldito, 2 Pérolas das Nove, 6 Peçonhas Esmeralda).', 'xp');

  _kurosakiEfeitoEntrega(visuais, () => {
    _kurosakiEfeitoSelo(seloItem, () => {
      G._kurosakiEntregando = false;
      storyNode_kurosaki_alberon_fortifica();
    });
  });
}
window.storyNode_kurosaki_alberon_entrega = storyNode_kurosaki_alberon_entrega;

function storyNode_kurosaki_alberon_fortifica() {
  _kurosakiAlberonCenario();
  _alberonFala(
    `Alberon pega cada material com as mãos trêmulas, como se cada um pesasse mais do que devia. O emblema vai primeiro, e o caldeirão gorgoleja roxo. As pérolas afundam sem barulho. A peçonha entra por último, verde e grossa, e a casa inteira cheira a erva queimada.\n\nEle mergulha a runa na mistura, murmurando algo numa língua antiga. Quando o retira, a runa brilha firme, quente, teimosa.\n\nPela primeira vez, o velho sorri de verdade.`,
    [{ icon:'▶', text:'Continuar', action: storyNode_kurosaki_alberon_fortifica2 }]
  );
}
window.storyNode_kurosaki_alberon_fortifica = storyNode_kurosaki_alberon_fortifica;

function storyNode_kurosaki_alberon_fortifica2() {
  _alberonFala(
    `Ele devolve a runa com as duas mãos.\n\n"Pronto. Agora ela aguenta o pó de Kurosaki. Equipe na Bolsa de Selos, que enfeite no bolso não protege ninguém."\n\n"Foi bom fazer algo que servisse a essa cidade, depois de tanto tempo fazendo o que me mandaram. Agradeça à Yuki, que fez a base. Eu só ajudei a resistir. ...E não me agradece, que eu fico sem jeito."`,
    _kurosakiAlberonOpcoes()
  );
}
window.storyNode_kurosaki_alberon_fortifica2 = storyNode_kurosaki_alberon_fortifica2;

function storyNode_kurosaki_alberon_pos_fortificado() {
  _kurosakiAlberonCenario();
  _alberonFala(
    `"A runa tá aguentando? Se esquentar, é sinal de que está trabalhando. Se esfriar... me traz de volta. E equipada, hein. Já vi gente morrer com a proteção no bolso."\n\nEle olha pela janela, pra rua vazia.\n\n"Cuida dela, rapaz. Da cidade. Eu já não consigo."`,
    _kurosakiAlberonOpcoes()
  );
}
window.storyNode_kurosaki_alberon_pos_fortificado = storyNode_kurosaki_alberon_pos_fortificado;

// ── Alberon apresenta o Presidente e avisa da reunião ───────
//  O jogador (personagem) NÃO sabe quem governa Kurosaki. É o Alberon quem
//  conta, e avisa que, neste exato momento, há uma reunião importante no
//  Império. Ao terminar, libera o pin do Império (a reunião é uma cutscene
//  que o jogador assiste, mas o personagem não está lá).
function kurosakiAlberonPresidentePendente() {
  if (typeof G === 'undefined' || !G || !G.kurosaki) return false;
  const k = G.kurosaki;
  return !!k.alberonConversaVista && !k.alberonPresidenteVisto && !k.imperioReuniaoVista;
}
window.kurosakiAlberonPresidentePendente = kurosakiAlberonPresidentePendente;

function storyNode_kurosaki_alberon_presidente1() {
  _kurosakiAlberonCenario();
  _alberonFala(
    `Ele olha pela janela antes de responder.\n\n"Você me perguntou de Kurosaki, e eu te falei do pó. Mas ainda não te falei de quem manda aqui."\n\n"Essa cidade tem dono, rapaz. Não é rei, não é conselho. Chamam ele de Presidente. Governa a Cidade das Pedras há anos, e ninguém por aqui lembra de ter escolhido."`,
    [{ icon:'❓', text:'Quem é ele?', action: storyNode_kurosaki_alberon_presidente2 }]
  );
}
window.storyNode_kurosaki_alberon_presidente1 = storyNode_kurosaki_alberon_presidente1;

function storyNode_kurosaki_alberon_presidente2() {
  _alberonFala(
    `"Os minérios dessas pedras fizeram dele o homem mais rico de Clivor. O mundo inteiro compra o que sai daqui. O povo, que cava, respira e adoece, não vê uma moeda."\n\n"E tem mais uma coisa: dizem que nada cruza os muros dessa cidade sem ele sentir. Eu acredito. Faz tempo que aprendi a falar baixo dentro de casa."`,
    [{ icon:'💭', text:'E o povo aceita isso?', action: storyNode_kurosaki_alberon_presidente3 }]
  );
}
window.storyNode_kurosaki_alberon_presidente2 = storyNode_kurosaki_alberon_presidente2;

function storyNode_kurosaki_alberon_presidente3() {
  _alberonFala(
    `"Aceitar..." Ele faz um som curto, sem graça nenhuma. "Quem não aceitou já não tá mais aqui pra contar. Os que ficaram aprenderam a olhar pro chão e não perguntar."\n\nAlberon pega o frasco vazio, vira, desvira.\n\n"Mas escuta, porque é por isso que tô te falando hoje."`,
    [{ icon:'▶', text:'Continuar', action: storyNode_kurosaki_alberon_presidente4 }]
  );
}
window.storyNode_kurosaki_alberon_presidente3 = storyNode_kurosaki_alberon_presidente3;

function storyNode_kurosaki_alberon_presidente4() {
  kurosakiInit();
  G.kurosaki.alberonPresidenteVisto = true;
  G.kurosaki.imperioPinLiberado = true;
  if (typeof addLog === 'function') addLog('🏛️ Alberon contou que há uma reunião importante acontecendo no Império, neste exato momento.', 'xp');
  _alberonFala(
    `"Neste exato momento tem uma reunião no Império. Gente grande, rapaz. Os que mandam em Clivor, sentados na mesma mesa. Isso não acontece à toa."\n\n"Eu não fui chamado, e você muito menos. Daqui eu não ouço o que falam lá dentro."\n\n"Mas as paredes dessa cidade ouvem. Quando tudo acabar, elas me contam. Volta aqui depois."`,
    _kurosakiAlberonOpcoes()
  );
}
window.storyNode_kurosaki_alberon_presidente4 = storyNode_kurosaki_alberon_presidente4;

// ── Alberon pede ajuda pra curar a cidade ───────────────────
//  Libera DEPOIS da reunião do Império e de o jogador ter feito algumas
//  lutas (KUROSAKI_ALBERON_CURA_ABATES abates desde o fim da reunião),
//  com a Runa Yu já fortificada. Ele só insinua o que o Presidente foi
//  pra ele no passado — nada é explicado. Marca G.kurosaki.alberonCuraVista
//  (use essa flag pra abrir a parte seguinte: o antídoto no Império).
//  Pra testar na hora, ponha 0 aqui.
const KUROSAKI_ALBERON_CURA_ABATES = 0; // sem espera: a espera de 12 abates agora é na Hiroto (card dela)

function kurosakiAlberonCuraLiberada() {
  if (typeof G === 'undefined' || !G || !G.kurosaki) return false;
  const k = G.kurosaki;
  if (!k.selosYuFortificado || !k.imperioReuniaoVista || k.alberonCuraVista) return false;
  const abates = (G.player && G.player.kills) || 0;
  if (k.reuniaoAbates === undefined) k.reuniaoAbates = abates; // save que já tinha visto a reunião
  return (abates - k.reuniaoAbates) >= KUROSAKI_ALBERON_CURA_ABATES;
}
window.kurosakiAlberonCuraLiberada = kurosakiAlberonCuraLiberada;

function storyNode_kurosaki_alberon_cura1() {
  _kurosakiAlberonCenario();
  _alberonFala(
    `Ele gira um frasco vazio entre os dedos, sem olhar pra ele.\n\n"Demorou. Os frascos já estavam enjoados da minha cara."\n\n"A reunião lá no Império acabou. Nessa cidade as paredes ouvem tudo. É a única coisa que ainda fala por aqui."\n\nOs olhos dele finalmente sobem até você.\n\n"Eu já te falei de quem manda aqui. Agora vou te falar do que eu sei dele."`,
    [{ icon:'❓', text:'Você o conhece?', action: storyNode_kurosaki_alberon_cura2 }]
  );
}
window.storyNode_kurosaki_alberon_cura1 = storyNode_kurosaki_alberon_cura1;

function storyNode_kurosaki_alberon_cura2() {
  _alberonFala(
    `"Conhecer..." Ele pesa a palavra como quem pesa pó numa balança. "Conhecer, não. Mas ele me conhece bem, e isso é diferente."\n\n"Faz muitos anos, ele precisou de mim. Bateu nessa porta, entrou sem limpar a bota e saiu com o que veio buscar."\n\nAlberon aperta o frasco.\n\n"Não pergunte o quê. Eu fiz o que sabia fazer, e ele pagou. Só que o pagamento nunca foi a parte que importava."`,
    [{ icon:'💭', text:'Por que me conta isso agora?', action: storyNode_kurosaki_alberon_cura3 }]
  );
}
window.storyNode_kurosaki_alberon_cura2 = storyNode_kurosaki_alberon_cura2;

function storyNode_kurosaki_alberon_cura3() {
  _alberonFala(
    `Ele vai até a janela. Lá fora, a rua segue sem ninguém.\n\n\"Porque o que eu te disse do pó foi só metade.\"\n\n\"Não tá só no ar, rapaz. Tá na água. Na pedra. Nas casas fechadas ali em frente, e em quem ainda anda lá dentro. A cidade inteira respira isso, bebe isso, dorme em cima disso.\"\n\nUm silêncio curto.\n\n\"A sua runa te segura. Ninguém mais aqui tem runa.\"`,
    [{ icon:'❓', text:'Não existe cura?', action: storyNode_kurosaki_alberon_cura4 }]
  );
}
window.storyNode_kurosaki_alberon_cura3 = storyNode_kurosaki_alberon_cura3;

function storyNode_kurosaki_alberon_cura4() {
  _alberonFala(
    `\"Tem. Quase sempre tem.\" Ele volta pra mesa, devagar. \"O que eu faço é remendo, você já sabe. Mas naquele dia, na mesa dele, eu vi um frasco que não era meu. O antídoto.\"\n\n\"Não me deixou chegar perto. Também não precisava. Um velho não esquece o que vê de longe.\"\n\n\"Se ainda existe um desse, tá lá dentro. Nas mãos dele.\"`,
    [{ icon:'🤝', text:'Então eu vou buscar.', action: storyNode_kurosaki_alberon_cura5 }]
  );
}
window.storyNode_kurosaki_alberon_cura4 = storyNode_kurosaki_alberon_cura4;

function storyNode_kurosaki_alberon_cura5() {
  _alberonFala(
    `"Calma, rapaz. Isso eu não posso te pedir. Ele não me deve nada, e eu já devo demais."\n\nAlberon te encara sem desviar, pela primeira vez desde que você entrou.\n\n"Você é de fora. Ele não sabe o que você carrega, e essa é a única vantagem que a gente tem."\n\n"Não é um pedido que eu faça com facilidade, então digo uma vez só: me ajude a curar essa cidade."`,
    [{ icon:'⚔️', text:'Conte comigo.', action: storyNode_kurosaki_alberon_cura6 }]
  );
}
window.storyNode_kurosaki_alberon_cura5 = storyNode_kurosaki_alberon_cura5;

function storyNode_kurosaki_alberon_cura6() {
  G.kurosaki.alberonCuraVista = true;
  G.kurosaki.hirotoAbatesBase = (G.player && G.player.kills) || 0;
  if (typeof addLog === 'function') addLog('📜 Alberon pediu a sua ajuda para curar Kurosaki.', 'xp');
  _alberonFala(
    `Ele assente uma vez, curto, sem sorrir. Mas os ombros descem um pouco.\n\n\"Eu cuido do caldeirão. O resto é contigo.\"\n\n\"E rapaz... lá dentro, não confia em nada que venha de graça. Nem em gentileza.\"`,
    _kurosakiAlberonOpcoes()
  );
}
window.storyNode_kurosaki_alberon_cura6 = storyNode_kurosaki_alberon_cura6;

// Depois que já pediu ajuda: lembrete curto
function storyNode_kurosaki_alberon_cura_lembrete() {
  _kurosakiAlberonCenario();
  _alberonFala(
    `\"Ainda por aqui?\" Ele tenta parecer bravo, mas a voz não ajuda. \"O que a cidade precisa não tá nessa casa, rapaz. Tá lá dentro. Eu seguro o caldeirão aceso.\"`,
    _kurosakiAlberonOpcoes()
  );
}
window.storyNode_kurosaki_alberon_cura_lembrete = storyNode_kurosaki_alberon_cura_lembrete;

// ══════════════════════════════════════════════════════════════
//  CAPITÃ HIROTO — a "figura diferente" na rua
//  Aparece na rua depois que o Alberon pede ajuda pra curar a cidade
//  (G.kurosaki.alberonCuraVista) e some depois da cena na casa dele.
//  Fluxo: pin na rua → card → conversa dura (3 respostas) → cena dos
//  3 dentro da casa do Alberon.
//  Os 3 NPCs comuns da rua ficam pra você criar: coloque os pins deles
//  em _kurosakiSincronizarPinsRua() logo abaixo.
// ══════════════════════════════════════════════════════════════
const KUROSAKI_HIROTO_RETRATO = 'Imagens/personagens/CHiroto.png';
const KUROSAKI_HIROTO_CONFIG = { X: 81, Y: 70, SIZE: 30 }; // posição (%) e tamanho (px) do pin na rua (ajuste no olho)
// Pré-requisito pra falar com a Hiroto: X abates contados a partir do fim da
// conversa do Alberon (pedido de ajuda). O card dela mostra o contador.
const KUROSAKI_HIROTO_ABATES = 12;

function kurosakiHirotoAbates() {
  kurosakiInit();
  const k = G.kurosaki;
  const kills = (G.player && G.player.kills) || 0;
  if (k.hirotoAbatesBase === undefined) k.hirotoAbatesBase = kills; // save que já tinha visto a conversa
  const feitos = Math.max(0, Math.min(KUROSAKI_HIROTO_ABATES, kills - k.hirotoAbatesBase));
  return { feitos, total: KUROSAKI_HIROTO_ABATES, ok: feitos >= KUROSAKI_HIROTO_ABATES };
}
window.kurosakiHirotoAbates = kurosakiHirotoAbates;
// Imagem da cena dos 3 dentro da casa (Alberon + Hiroto + você). Se for null, usa a
// casa normal. Quando a cena acaba, o fundo volta sozinho pra casa só com o Alberon.
const KUROSAKI_HIROTO_CENA_IMG = 'Imagens/Cidade das pedras/hiroAlber.png';

function _kurosakiSincronizarPinsRua() {
  // Gancho pros 3 NPCs comuns da rua. Exemplo:
  // personagemPinMostrar({ id:'npc_rua_1', x:20, y:60, img:'Imagens/...png', alt:'...', onClick: algumaFuncao });
}

function _kurosakiSincronizarPinHiroto() {
  kurosakiInit();
  const k = G.kurosaki;
  _kurosakiSincronizarPinsRua();
  // Some só quando ela já está com você. Se você recusou (hirotoCenaCasaVista sem hirotoAcompanha), ela continua na rua.
  if (!k.alberonCuraVista || k.hirotoAcompanha || k.hirotoAliada || _kurosakiEmCasaAlberon) {
    personagemPinRemover('hiroto_kurosaki');
    return;
  }
  personagemPinMostrar({
    id: 'hiroto_kurosaki',
    x: KUROSAKI_HIROTO_CONFIG.X,
    y: KUROSAKI_HIROTO_CONFIG.Y,
    img: KUROSAKI_HIROTO_RETRATO,
    alt: 'Capitã Hiroto',
    size: KUROSAKI_HIROTO_CONFIG.SIZE,
    onClick: mostrarCardHiroto,
  });
}
window._kurosakiSincronizarPinHiroto = _kurosakiSincronizarPinHiroto;

function _cardHirotoGarantirDOM() {
  if (document.getElementById('hiroto-card-overlay')) return;
  const el = document.createElement('div');
  el.id = 'hiroto-card-overlay';
  el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.86);display:none;align-items:center;justify-content:center;z-index:9999;padding:16px;';
  el.onclick = (e) => { if (e.target === el) fecharCardHiroto(); };
  document.body.appendChild(el);
}

function mostrarCardHiroto() {
  _cardHirotoGarantirDOM();
  const ab = kurosakiHirotoAbates();
  const pct = Math.round(ab.feitos / ab.total * 100);
  const overlay = document.getElementById('hiroto-card-overlay');
  overlay.innerHTML = `
    <div style="background:#0f0a04;border:1px solid rgba(200,150,10,0.4);max-width:380px;width:100%;padding:0 0 14px;text-align:center;max-height:94vh;overflow:auto;">
      <img src="${KUROSAKI_HIROTO_RETRATO}" alt="Capitã Hiroto" style="width:100%;max-height:70vh;object-fit:contain;display:block;background:#000;">
      <div style="padding:10px 16px 0;font-family:'Noto Serif JP',serif;">
        <div style="font-size:0.58rem;letter-spacing:3px;color:${ab.ok ? '#7fd88a' : '#f0c040'};margin-bottom:5px;">${ab.ok ? '✓ DISPONÍVEL' : '🔒 ABATES'} &nbsp; ${ab.feitos} / ${ab.total}</div>
        <div style="height:5px;background:rgba(255,255,255,0.08);border:1px solid rgba(200,150,10,0.3);"><div style="height:100%;width:${pct}%;background:${ab.ok ? '#7fd88a' : '#c8960a'};"></div></div>
      </div>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:12px;padding:0 14px;">
        <button onclick="iniciarConversaHirotoDoCard()" style="flex:1;background:rgba(200,150,10,0.14);border:1px solid rgba(200,150,10,0.55);color:#f0c040;padding:9px 10px;font-family:'Noto Serif JP',serif;font-size:0.72rem;letter-spacing:1px;cursor:pointer;${ab.ok ? '' : 'opacity:0.55;'}">${ab.ok ? '💬' : '🔒'} CONVERSAR</button>
        <button onclick="fecharCardHiroto()" style="flex:1;background:transparent;border:1px solid rgba(200,150,10,0.4);color:rgba(200,150,10,0.7);padding:9px 10px;font-family:'Noto Serif JP',serif;font-size:0.72rem;letter-spacing:1px;cursor:pointer;">FECHAR</button>
      </div>
    </div>`;
  overlay.style.display = 'flex';
}
window.mostrarCardHiroto = mostrarCardHiroto;

function fecharCardHiroto() {
  const overlay = document.getElementById('hiroto-card-overlay');
  if (overlay) overlay.style.display = 'none';
}
window.fecharCardHiroto = fecharCardHiroto;

function iniciarConversaHirotoDoCard() {
  const ab = kurosakiHirotoAbates();
  if (!ab.ok) { _kurosakiHirotoBloqueioPopup(ab); return; } // sem o pré-requisito, não avança
  fecharCardHiroto();
  if (G.kurosaki.hirotoDueloPendente) return storyNode_kurosaki_hiroto_dueloRetorno(); // já aceitou o duelo e ainda não venceu
  if (G.kurosaki.hirotoCenaCasaVista) return storyNode_kurosaki_hiroto_retorno(); // já recusou uma vez
  storyNode_kurosaki_hiroto1();
}

// Pop-up: explica o pré-requisito (jogador novato sabe o que falta)
function _kurosakiHirotoBloqueioPopup(ab) {
  const old = document.getElementById('hiroto-bloqueio-popup');
  if (old) old.remove();
  const ov = document.createElement('div');
  ov.id = 'hiroto-bloqueio-popup';
  ov.style.cssText = 'position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,0.78);display:flex;align-items:center;justify-content:center;padding:20px;';
  ov.innerHTML = `
    <div style="background:#0f0a04;border:1px solid rgba(200,150,10,0.55);max-width:320px;width:100%;padding:20px 18px;text-align:center;font-family:'Noto Serif JP',serif;">
      <div style="font-size:1.4rem;margin-bottom:8px;">🔒</div>
      <div style="font-size:0.85rem;color:#f0c040;letter-spacing:1px;margin-bottom:10px;">Libera depois de ${ab.total} abates</div>
      <div style="font-size:0.72rem;color:rgba(242,232,208,0.7);line-height:1.6;margin-bottom:16px;">A capitã não fala com quem ainda não provou o que vale. Enfrente criaturas e volte.<br><br>Progresso: <b style="color:#f0c040;">${ab.feitos} / ${ab.total}</b> &nbsp;(faltam ${ab.total - ab.feitos})</div>
      <button id="hiroto-bloqueio-ok" style="background:rgba(200,150,10,0.16);border:1px solid rgba(200,150,10,0.55);color:#f0c040;padding:9px 26px;font-family:'Noto Serif JP',serif;font-size:0.72rem;letter-spacing:2px;cursor:pointer;">ENTENDI</button>
    </div>`;
  document.body.appendChild(ov);
  document.getElementById('hiroto-bloqueio-ok').onclick = () => ov.remove();
}
window.iniciarConversaHirotoDoCard = iniciarConversaHirotoDoCard;

function _hirotoFala(texto, opcoes) { setStory('HIROTO', texto, opcoes, KUROSAKI_HIROTO_RETRATO); }

// ── Encontro na rua: ela estranha o forasteiro ──────────────
function storyNode_kurosaki_hiroto1() {
  kurosakiInit();
  G.kurosaki.hirotoApresentada = true;
  _hirotoFala(
    `A mulher não se move quando você se aproxima. A mão já está no cabo da espada.\n\n\"Pare.\"\n\n\"Conheço cada rosto dessa cidade e cada rosto que cruzou aquele portão. O seu não está em nenhuma lista.\"\n\n\"Nome e motivo. Agora.\"`,
    [
      { icon:'🏠', text:'Estou hospedado na casa do Alberon.', action: storyNode_kurosaki_hiroto_r1 },
      { icon:'🧭', text:'Sou um viajante. Vim ajudar, se alguém aceitar a ajuda.', action: storyNode_kurosaki_hiroto_r2 },
      { icon:'👁', text:'Alguém precisa saber o que aconteceu com esta cidade. Eu quero saber.', action: storyNode_kurosaki_hiroto_r3 },
    ]
  );
}
window.storyNode_kurosaki_hiroto1 = storyNode_kurosaki_hiroto1;

// 1) hospedado: ela estranha MAIS
function storyNode_kurosaki_hiroto_r1() {
  _hirotoFala(
    `A sobrancelha dela mal se mexe.\n\n"Hóspede. Do Alberon."\n\n"Aquele velho não abre a porta pra ninguém. Ou você mente, ou ele amoleceu." Os olhos não largam os seus. "Vamos descobrir. Preciso falar com ele de qualquer jeito, e você vem comigo, onde eu possa te ver. Mãos à vista."`,
    [{ icon:'🚪', text:'Seguir a Hiroto até a casa', action: kurosakiHirotoCenaCasa }]
  );
}
window.storyNode_kurosaki_hiroto_r1 = storyNode_kurosaki_hiroto_r1;

// 2) viajante / ajuda
function storyNode_kurosaki_hiroto_r2() {
  _hirotoFala(
    `Ela te estuda sem pressa.\n\n"Ajuda." Diz a palavra como quem cospe caroço. "Já vieram vários com essa palavra na boca. Todos foram embora antes do sol baixar."\n\n"Você ainda está de pé. Isso conta, mas não prova nada."\n\n"Preciso falar com o Alberon, e você vem comigo. Se quer mesmo ajudar, começa ouvindo."`,
    [{ icon:'🚪', text:'Seguir a Hiroto até a casa', action: kurosakiHirotoCenaCasa }]
  );
}
window.storyNode_kurosaki_hiroto_r2 = storyNode_kurosaki_hiroto_r2;

// 3) quero saber
function storyNode_kurosaki_hiroto_r3() {
  _hirotoFala(
    `"Querer saber." Ela solta uma risada curta, seca. "Eu quero há meses. Quem veio querendo saber foi embora sabendo menos."\n\nOs olhos medem você de cima a baixo, como se mede um recruta.\n\n"Quer mesmo? Então anda. Vou falar com o Alberon, e você vem comigo. Escuta e fica calado."`,
    [{ icon:'🚪', text:'Seguir a Hiroto até a casa', action: kurosakiHirotoCenaCasa }]
  );
}
window.storyNode_kurosaki_hiroto_r3 = storyNode_kurosaki_hiroto_r3;

// ── Cena dos 3 dentro da casa do Alberon ────────────────────
function _hirotoCasaNarra(texto, opcoes) { setStory('', texto, opcoes, null); }
function _hirotoCasaAlberon(texto, opcoes) { setStory('ALBERON', texto, opcoes, KUROSAKI_ALBERON_RETRATO); }

function kurosakiHirotoCenaCasa() {
  kurosakiInit();
  personagemPinRemover('hiroto_kurosaki');
  _kurosakiAlberonCenario();
  if (KUROSAKI_HIROTO_CENA_IMG) {
    const bg = document.getElementById('scene-bg');
    if (bg) { bg.style.backgroundImage = `url('${KUROSAKI_HIROTO_CENA_IMG}')`; bg.style.backgroundSize = 'cover'; bg.style.backgroundPosition = 'center'; }
  }
  if (typeof armazemPinRemover === 'function') armazemPinRemover(); // sem o baú por cima da cena
  _hirotoCasaNarra(
    `A porta range. Alberon levanta os olhos do caldeirão e, ao ver quem entra atrás de você, solta o ar devagar, como quem já esperava essa visita.\n\n\"Capitã.\"\n\n\"Alberon.\" Hiroto fecha a porta com o ombro, sem tirar os olhos de você. \"Esse forasteiro diz que tem assunto nessa casa. Confirma, ou resolvo isso lá fora.\"`,
    [{ icon:'▶', text:'Continuar', action: storyNode_kurosaki_hirotoCasa2 }]
  );
}
window.kurosakiHirotoCenaCasa = kurosakiHirotoCenaCasa;

function storyNode_kurosaki_hirotoCasa2() {
  _hirotoCasaAlberon(
    `\"Confirmo. Fica aqui por minha conta.\" Ele não olha pra você ao dizer, e é isso que dá peso à frase. \"Pergunta o que veio perguntar.\"`,
    [{ icon:'▶', text:'Continuar', action: storyNode_kurosaki_hirotoCasa3 }]
  );
}
window.storyNode_kurosaki_hirotoCasa2 = storyNode_kurosaki_hirotoCasa2;

function storyNode_kurosaki_hirotoCasa3() {
  _hirotoFala(
    `Hiroto não senta. Cruza os braços, e a armadura estala.\n\n"Não vim por cortesia, velho. Você enxerga mais longe que qualquer espada dessa cidade. Sempre enxergou. Por isso vim aqui antes de ir a qualquer outro lugar."\n\n"A reunião no Império acabou, e todo mundo sabe. O Rei Eirik não voltou pra cidade dele. Sou da guarda dele, devia saber onde ele está. Não sei. Você sabe?"`,
    [{ icon:'▶', text:'Continuar', action: storyNode_kurosaki_hirotoCasa4 }]
  );
}
window.storyNode_kurosaki_hirotoCasa3 = storyNode_kurosaki_hirotoCasa3;

function storyNode_kurosaki_hirotoCasa4() {
  _hirotoCasaAlberon(
    `"Não sei, capitã." Ele mexe no caldeirão sem precisar, só pra ter o que fazer com as mãos.\n\n"Sei o mesmo que você. Vi quando ele chegou com a esposa e foram direto pro Império, pra reunião. Dali em diante não vi mais nada. O que se falou lá dentro, ninguém me conta. E nessa cidade a gente aprende a não perguntar."`,
    [{ icon:'▶', text:'Continuar', action: storyNode_kurosaki_hirotoCasa5 }]
  );
}
window.storyNode_kurosaki_hirotoCasa4 = storyNode_kurosaki_hirotoCasa4;

function storyNode_kurosaki_hirotoCasa5() {
  _hirotoFala(
    `Hiroto não se mexe. O maxilar trava.\n\n\"Isso não é do Eirik. Ele não deixa a cidade por motivo nenhum. A Sigrid não deixaria.\"\n\n\"Os dois, sem aviso. Não.\"`,
    [{ icon:'▶', text:'Continuar', action: storyNode_kurosaki_hirotoCasa6 }]
  );
}
window.storyNode_kurosaki_hirotoCasa5 = storyNode_kurosaki_hirotoCasa5;

function storyNode_kurosaki_hirotoCasa6() {
  _hirotoFala(
    `\"Então eu vou lá.\"\n\nSem levantar a voz. A mão vai ao cabo da espada, e dessa vez não é ameaça. É costume.\n\n\"Posso não voltar. Isso não é motivo pra não ir.\"`,
    [{ icon:'▶', text:'Continuar', action: storyNode_kurosaki_hirotoCasa7 }]
  );
}
window.storyNode_kurosaki_hirotoCasa6 = storyNode_kurosaki_hirotoCasa6;

function storyNode_kurosaki_hirotoCasa7() {
  _hirotoCasaAlberon(
    `\"Volta, capitã.\" O tom dele muda, sem aspereza. \"Volta pro castelo, pros seus defensores. O Presidente anda mais louco a cada dia, e louco com poder é o pior jeito de ser louco.\"\n\nEle balança a cabeça, devagar.\n\n\"Não é mais o homem que bateu na minha porta, anos atrás. Eu já enterrei gente demais, capitã. Não me pede mais uma.\"`,
    [{ icon:'▶', text:'Continuar', action: storyNode_kurosaki_hirotoCasa8 }]
  );
}
window.storyNode_kurosaki_hirotoCasa7 = storyNode_kurosaki_hirotoCasa7;

function storyNode_kurosaki_hirotoCasa8() {
  _hirotoFala(
    `"Preciso de uma resposta, Alberon. Você lê o que os outros só enxergam depois, e eu não volto pro castelo sem uma."\n\nNão há o que discutir, e ela sabe. O silêncio que fica é de quem já escolheu.`,
    [{ icon:'▶', text:'Continuar', action: storyNode_kurosaki_hirotoCasa9 }]
  );
}
window.storyNode_kurosaki_hirotoCasa8 = storyNode_kurosaki_hirotoCasa8;

// Alberon pede ajuda SÓ pro jogador: ir com a Hiroto ou não
function storyNode_kurosaki_hirotoCasa9() {
  _hirotoCasaAlberon(
    `Alberon fica olhando pra ela por um tempo. Depois, devagar, pra você.\n\n"Conheço essa mulher faz anos, rapaz. Hiroto, segunda divisão da guarda do Rei Eirik. Das mais fortes que esse reino já viu, e a mais teimosa também. Ela vai de qualquer jeito."\n\n"Se até ela duvida de voltar de lá inteira... bom. Isso já me diz o que tem lá dentro."\n\n"Não vou pedir isso pra ela. Peço pra você. Vai com a capitã. Eu cuido do caldeirão, que é o que eu sei fazer."`,
    [
      { icon:'⚔️', text:'Vou com a Hiroto.', action: storyNode_kurosaki_hirotoCasa_vou },
      { icon:'🚫', text:'Não. Agora não.',   action: storyNode_kurosaki_hirotoCasa_nao },
    ]
  );
}
window.storyNode_kurosaki_hirotoCasa9 = storyNode_kurosaki_hirotoCasa9;

// ── Vai com a Hiroto ──
//  Alberon se despede → Hiroto fala da confiança (vale pra qualquer classe) →
//  ela entra pra equipe (pop-up "NOVA ALIADA") → os dois seguem pro Império.
//  Flags: hirotoCenaCasaVista, hirotoAcompanha, hirotoAliada.
function storyNode_kurosaki_hirotoCasa_vou() {
  kurosakiInit();
  G.kurosaki.hirotoCenaCasaVista = true;
  G.kurosaki.hirotoDueloPendente = true; // só vira aliada (hirotoAcompanha) depois de vencer o duelo
  _hirotoCasaAlberon(
    `Alberon assente, e algo no rosto dele afrouxa um pouco.\n\n"Voltem inteiros. Os dois."\n\nEle volta pro caldeirão antes que alguém veja o que a voz dele quase disse.`,
    [{ icon:'▶', text:'Continuar', action: storyNode_kurosaki_alberon_cristal1 }]
  );
}
window.storyNode_kurosaki_hirotoCasa_vou = storyNode_kurosaki_hirotoCasa_vou;

// ── Cristal de Elo — Alberon entrega antes de vocês partirem ──
//  O item em si (ITEM_DB, barra de carga, golpe da Hiroto) vive no cristal_elo.js.
//  Quem já tem o cristal pula direto pro duelo. Vale para os dois caminhos:
//  "Vou com a Hiroto" (casa) e "Mudei de ideia" (rua → ela manda passar na casa).
// Pra onde ir depois do cristal: se o duelo já foi vencido (save que passou
// dessa parte sem o cristal), volta pro menu do Alberon; senão, segue pro duelo.
function _kurosakiCristalProximo() {
  if (G.kurosaki && G.kurosaki.hirotoDueloVencido) return kurosakiAlberonMenu();
  return storyNode_kurosaki_hirotoDuelo1();
}

function storyNode_kurosaki_alberon_cristal1() {
  kurosakiInit();
  const jaTem = (G.player && G.player.inventory || []).some(i => i && i.id === 'cristal_elo');
  if (jaTem) return _kurosakiCristalProximo();
  if (typeof kurosakiDarCristalElo !== 'function') {
    console.error('[kurosaki] kurosakiDarCristalElo não existe — confira se cristal_elo.js carrega no gat-1.html (depois de palDinh.js e cidade_kurosaki.js).');
    if (typeof notify === 'function') notify('⚠️ cristal_elo.js não carregou — o cristal não pôde ser entregue.', 'red');
    return _kurosakiCristalProximo();
  }
  _kurosakiAlberonCenario();
  _alberonFala(
    `"Espera, rapaz."\n\nAlberon abre uma gaveta baixa do balcão, remexe sem pressa e volta com algo embrulhado num pano escuro. Desfaz o nó devagar.\n\nUm cristal comprido, de quartzo lapidado, preso por uma rede de fios escurecidos e fitas de seda desbotada. No núcleo, uma luz pequena e quente que não combina com a casa.`,
    [{ icon:'▶', text:'Continuar', action: storyNode_kurosaki_alberon_cristal2 }]
  );
}
window.storyNode_kurosaki_alberon_cristal1 = storyNode_kurosaki_alberon_cristal1;

function storyNode_kurosaki_alberon_cristal2() {
  _alberonFala(
    `"Fiz isso faz tempo, pra outra pessoa. Ela nunca veio buscar."\n\n"Serve pra interligar quem anda ao seu lado a você. A pedra escuta quem a carrega e escuta quem caminha com ele. Não me pergunta como, nem se funciona sempre. Funciona do jeito dela."\n\nEle pousa o cristal na sua mão e fecha os seus dedos em volta.\n\n"E não tenta me deixar guardado no armazém. O elo se desfaz longe de quem o carrega. Fica contigo."`,
    [{ icon:'💠', text:'Guardar o cristal', action: storyNode_kurosaki_alberon_cristal3 }]
  );
}
window.storyNode_kurosaki_alberon_cristal2 = storyNode_kurosaki_alberon_cristal2;

function storyNode_kurosaki_alberon_cristal3() {
  kurosakiDarCristalElo();
  if (!((G.player && G.player.inventory) || []).some(i => i && i.id === 'cristal_elo')) {
    console.error('[kurosaki] o cristal não entrou no inventário (addItem falhou).');
    if (typeof notify === 'function') notify('⚠️ Falha ao entregar o cristal. Fale com o Alberon de novo.', 'red');
  }
  _alberonFala(
    `O cristal esquenta na palma da sua mão, depois se acomoda. A luz no centro oscila uma vez e fica firme.\n\n"Agora vai. E volta inteiro. Os dois."`,
    [{ icon:'▶', text:'Continuar', action: _kurosakiCristalProximo }]
  );
}
window.storyNode_kurosaki_alberon_cristal3 = storyNode_kurosaki_alberon_cristal3;

// A confiança entre as duas partes — não menciona classe nem arma de propósito
function storyNode_kurosaki_hirotoConfianca1() {
  _hirotoFala(
    `Hiroto te olha uma vez, de cima a baixo, e dessa vez o olhar não mede. Reconhece.\n\n\"Eu não confio em ninguém de primeira. Confiança, pra mim, se paga em sangue, não em palavra.\"\n\n\"Mas você aceitou ir sem perguntar o que ganha. E ficou de pé na minha frente quando eu tinha a mão na espada.\"\n\nUm silêncio curto.\n\n\"Não sei o que você é. Pelo visto, isso não importa. Tem gente que a gente segue só pelo jeito de ficar de pé. Você é uma dessas.\"`,
    [
      { icon:'🤝', text:'Também confio em você, capitã.', action: () => storyNode_kurosaki_hirotoConfianca2(1) },
      { icon:'⚔️', text:'Então não perdemos tempo. Vamos.', action: () => storyNode_kurosaki_hirotoConfianca2(2) },
    ]
  );
}
window.storyNode_kurosaki_hirotoConfianca1 = storyNode_kurosaki_hirotoConfianca1;

function storyNode_kurosaki_hirotoConfianca2(modo) {
  const abre = (modo === 1)
    ? `Os cantos da boca dela quase se mexem. Quase.\n\n\"Confiança não se pede. Mas eu escolho você hoje. Se mudar de ideia amanhã, aviso antes de tirar a espada.\"`
    : `\"Gosto de quem não enrola.\" Ela quase sorri, e desiste no meio.\n\n\"Confiança não se pede. Mas eu escolho você hoje.\"`;
  _hirotoFala(
    abre + `\n\nHiroto bate o punho fechado no peito, uma vez, a saudação da guarda.\n\n\"Hiroto. Segunda divisão. Minha lâmina anda com a sua até o fim disso.\"`,
    [{ icon:'▶', text:'Continuar', action: () => kurosakiMostrarHirotoAliada(kurosakiImperioPortoes) }]
  );
}
window.storyNode_kurosaki_hirotoConfianca2 = storyNode_kurosaki_hirotoConfianca2;

// Pop-up "NOVA ALIADA" (mesmo estilo do aviso da casa do Alberon)
function kurosakiMostrarHirotoAliada(onContinue) {
  kurosakiInit();
  G.kurosaki.hirotoAliada = true;
  if (typeof addLog === 'function') addLog('🤝 A Capitã Hiroto se juntou a você.', 'xp');
  const old = document.getElementById('hiroto-aliada-popup');
  if (old) old.remove();
  const ov = document.createElement('div');
  ov.id = 'hiroto-aliada-popup';
  ov.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.88);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;overflow-y:auto;';
  ov.innerHTML = `
    <div style="font-family:'Noto Sans JP',sans-serif;font-size:0.6rem;letter-spacing:6px;color:#f0c040;margin-bottom:14px;">NOVA ALIADA</div>
    <img src="${KUROSAKI_HIROTO_RETRATO}" onerror="this.style.display='none';"
         style="max-width:220px;max-height:300px;object-fit:contain;border:1px solid rgba(240,192,64,0.45);filter:drop-shadow(0 0 18px rgba(240,192,64,0.5));margin-bottom:16px;">
    <div style="font-family:'Noto Serif JP',serif;font-size:1.2rem;color:var(--gold2);margin-bottom:6px;">Capitã Hiroto</div>
    <div style="font-size:0.66rem;color:rgba(200,150,10,0.75);letter-spacing:2px;margin-bottom:14px;">GUARDA DO REI EIRIK · 2ª DIVISÃO</div>
    <div style="max-width:290px;font-family:'Noto Serif JP',serif;font-size:0.74rem;color:rgba(242,232,208,0.7);line-height:1.6;margin-bottom:22px;">Ela confia em você. Caminha ao seu lado rumo ao Império, atrás de respostas.</div>
    <button id="hiroto-aliada-ok" style="background:rgba(200,150,10,0.16);border:1px solid rgba(200,150,10,0.55);color:#f0c040;padding:10px 28px;font-family:'Noto Serif JP',serif;font-size:0.75rem;letter-spacing:2px;cursor:pointer;">CONTINUAR</button>`;
  document.body.appendChild(ov);
  document.getElementById('hiroto-aliada-ok').onclick = () => {
    ov.remove();
    if (typeof onContinue === 'function') onContinue();
  };
}
window.kurosakiMostrarHirotoAliada = kurosakiMostrarHirotoAliada;

// ── Rumo ao Império, com a Hiroto ───────────────────────────
//  Chega nos portões. A parte de DENTRO do Império (as respostas) é a próxima
//  etapa: troque kurosakiImperioPortoesBater() quando ela existir.
function kurosakiImperioPortoes() {
  kurosakiSairCasaAlberon(); // fecha a casa e volta pra rua
  kurosakiInit();
  G.kurosaki.imperioPortoesComHiroto = true;
  setStory('',
    `Vocês atravessam a cidade em silêncio. Hiroto vai um passo à frente, e a rua, que já era vazia, parece abrir caminho pra ela.\n\nOs portões do Império surgem no fim da pedra preta. Fechados. Ninguém na guarita.\n\n\"Nenhuma sentinela,\" diz Hiroto, baixo. \"Isso nunca aconteceu. Nem em tempo de guerra.\"\n\n\"Vamos tentar. Se alguém responder, melhor. Se ninguém responder...\" Ela não termina. Não precisa.`,
    [
      { icon:'🚪', text:'Bater nos portões', action: kurosakiImperioPortoesBater },
      { icon:'↩',  text:'Voltar à cidade',   action: storyNode_cidade_kurosaki_entrada },
    ],
    null
  );
}
window.kurosakiImperioPortoes = kurosakiImperioPortoes;

// PLACEHOLDER: o que acontece quando bate nos portões fica pra próxima parte.
function kurosakiImperioPortoesBater() {
  setStory('',
    `Três batidas. O eco volta, e só ele.\n\nHiroto encosta a palma na pedra fria e franze a testa.\n\n\"Alguém ouviu. Só não quer abrir.\"`,
    [{ icon:'↩', text:'Voltar à cidade', action: storyNode_cidade_kurosaki_entrada }],
    null
  );
}
window.kurosakiImperioPortoesBater = kurosakiImperioPortoesBater;

// ── Voltou a falar com ela depois de recusar ──
function storyNode_kurosaki_hiroto_retorno() {
  kurosakiInit();
  _hirotoFala(
    `Hiroto está onde você a deixou, de costas, os olhos fixos no Império. Não se vira quando você se aproxima.\n\n"Voltou." Uma pausa curta. "Mudou de ideia, ou veio só me ver esperar?"\n\nA mão dela continua perto do cabo da espada, mas o ombro desceu um pouco.`,
    [
      { icon:'⚔️', text:'Mudei. Vou com você, capitã.', action: storyNode_kurosaki_hiroto_retornoVou },
      { icon:'🚫', text:'Ainda não.', action: storyNode_kurosaki_hiroto_retornoNao },
    ]
  );
}
window.storyNode_kurosaki_hiroto_retorno = storyNode_kurosaki_hiroto_retorno;

function storyNode_kurosaki_hiroto_retornoVou() {
  kurosakiInit();
  G.kurosaki.hirotoCenaCasaVista = true;
  G.kurosaki.hirotoDueloPendente = true;
  _hirotoFala(
    `Ela finalmente se vira. Os olhos medem você de novo, e dessa vez demoram menos.\n\n"Achei que o velho tinha te convencido a ficar fora disso. Bom saber que não."\n\n"Passa na casa do velho antes. Ele deixou algo pra você e não quis me dizer o quê."`,
    [{ icon:'🚪', text:'Ir até a casa do Alberon', action: storyNode_kurosaki_alberon_cristal1 }]
  );
}
window.storyNode_kurosaki_hiroto_retornoVou = storyNode_kurosaki_hiroto_retornoVou;

function storyNode_kurosaki_hiroto_retornoNao() {
  _hirotoFala(
    `"Então não me faz perder tempo." Ela volta a olhar pro Império. "Eu espero. Mas não por muito."`,
    [{ icon:'↩', text:'Voltar à cidade', action: storyNode_cidade_kurosaki_entrada }]
  );
}
window.storyNode_kurosaki_hiroto_retornoNao = storyNode_kurosaki_hiroto_retornoNao;

// ═════════════════════════════════════════════════════════════
//  DUELO CONTRA A HIROTO
//  Regras: a luta acaba quando o HP dela chega a 10% (conta como vitória:
//  você tirou 90%). Se você perder (ou fugir), ela te humilha e manda
//  tentar de novo — quantas vezes quiser, SEM penalidade (sem morte, sem
//  perder ouro, HP volta cheio). Só vence → ela vira sua aliada.
//  Estratégia (sem mexer no palDinh.js): observa o HP pelo updateBattleHUD
//  (igual ao Ogro) e intercepta o endBattle só quando o inimigo é ela.
// ═════════════════════════════════════════════════════════════
const KUROSAKI_HIROTO_DUELO_CORTE = 0.10; // a luta acaba com 10% do HP dela

const KUROSAKI_HIROTO_DUELO = {
  id: 'hiroto_duelo', name: 'Capitã Hiroto', icon: '❄️',
  img: KUROSAKI_HIROTO_RETRATO,
  elemento: 'gelo',
  // ── Status definidos pelo Marcelo ──
  hp: 3000, atk: 200, def: 210,
  dmgMultBase: 1.9,   // DANO 190%
  critChance: 0.18,   // CRIT 18% (o dano do crítico usa o padrão do motor: ×2)
  spd: 178,           // VEL 178 (o motor ainda não usa VEL do inimigo pra decidir quem age)
  // mag: ?           // MAG "bem alta" — valor ainda a definir; entra junto com as skills de gelo
  xp: 0, gold: 0, isBoss: true, minLevel: 1, maxLevel: 99,
  desc: 'Segunda espada do Rei Eirik. O ar ao redor dela esfria a cada passo.',
  loot: [],
};

// ── Skills da Hiroto (valores provisórios — ajuste aqui) ──
//  Cada turno dela: 40% de usar a passiva (só uma vez na luta); se não, 30% de usar a
//  barreira (se não estiver ativa nem em recarga); senão, ataque normal.
//  Usar uma skill gasta o turno dela (ela não ataca naquele turno).
const KUROSAKI_HIROTO_SKILLS = {
  PASSIVA_CHANCE: 0.40,    // chance por turno de ativar o Inverno Uivante (1x por luta)
  PASSIVA_ATK: 1.15,       // ATQ ×1.15
  PASSIVA_VEL: 1.15,       // VEL ×1.15 (por enquanto o motor ignora a VEL do inimigo)
  PASSIVA_DANO_EXTRA: 1.10,// quem luta contra ela toma +10% de dano
  BARREIRA_CHANCE: 0.30,   // chance por turno de erguer a Armadura de Rilgander
  BARREIRA_HP_PCT: 0.20,   // a barreira absorve 20% do HP máx. dela (600)
  BARREIRA_TURNOS: 3,      // dura 3 turnos seus (ou até quebrar)
  BARREIRA_CD: 2,          // turnos dela de espera até poder erguer de novo
  BARREIRA_REFLEXO: 0.30,  // cada golpe seu na barreira devolve 30% do dano em frio (não mata)
};

// Sorteia a ação do turno dela UMA vez (o motor lê forceSpecialChance duas vezes por turno)
function _kurosakiHirotoRolarAcao(bs) {
  if (bs._hirotoRoll && bs._hirotoRoll.turn === bs.enemyTurnAI) return bs._hirotoRoll.valor;
  const K = KUROSAKI_HIROTO_SKILLS;
  // novo turno dela: gasta duração da barreira / recarga
  if (bs._hirotoBarreiraTurnos > 0) {
    bs._hirotoBarreiraTurnos--;
    if (bs._hirotoBarreiraTurnos <= 0 && bs._hirotoBarreiraHp > 0) {
      bs._hirotoBarreiraHp = 0; bs._hirotoBarreiraCd = K.BARREIRA_CD;
      if (typeof appendBattleLog === 'function') appendBattleLog('🧊 A barreira de gelo racha e se desfaz.', '#80c8ff');
    }
  } else if (bs._hirotoBarreiraCd > 0) {
    bs._hirotoBarreiraCd--;
  }
  let acao = null;
  if (!bs._hirotoPassivaUsada && Math.random() < K.PASSIVA_CHANCE) acao = 'passiva';
  else if (!(bs._hirotoBarreiraHp > 0) && !(bs._hirotoBarreiraCd > 0) && Math.random() < K.BARREIRA_CHANCE) acao = 'barreira';
  bs._hirotoAcao = acao;
  if (typeof ENEMY_AI !== 'undefined' && ENEMY_AI.hiroto_duelo) {
    ENEMY_AI.hiroto_duelo.specialName = acao === 'passiva' ? 'Inverno Uivante' : 'Armadura de Rilgander';
    ENEMY_AI.hiroto_duelo.specialIcon = acao === 'passiva' ? '🌨️' : '🧊';
  }
  bs._hirotoRoll = { turn: bs.enemyTurnAI, valor: acao ? 1 : 0 };
  return bs._hirotoRoll.valor;
}

function _kurosakiHirotoInvernoUivante(bs, p, e) {
  const K = KUROSAKI_HIROTO_SKILLS;
  bs._hirotoPassivaUsada = true;
  e.atk = Math.floor(e.atk * K.PASSIVA_ATK);
  e.spd = Math.floor((e.spd || 0) * K.PASSIVA_VEL);
  e.dmgMultBase = (e.dmgMultBase || 1.0) * K.PASSIVA_DANO_EXTRA; // +10% de dano em quem luta contra ela
  bs._hirotoInverno = true;
  if (typeof showBossSkillSplash === 'function') showBossSkillSplash('Inverno Uivante', 'A temperatura despenca para -17 °C. ATQ e VEL dela aumentam e você sofre +10% de dano até o fim da luta.', '🌨️');
  appendBattleLog('🌨️ INVERNO UIVANTE! A temperatura despenca para -17 °C. ATQ e VEL de Hiroto aumentam, e você toma +10% de dano até o fim da luta!', '#80c8ff');
  if (typeof showFloatingNumber === 'function') showFloatingNumber('enemy', '🌨️ INVERNO', 'status');
}

function _kurosakiHirotoArmadura(bs, p, e) {
  const K = KUROSAKI_HIROTO_SKILLS;
  bs._hirotoBarreiraHp = Math.floor(bs.enemyMaxHp * K.BARREIRA_HP_PCT);
  bs._hirotoBarreiraTurnos = K.BARREIRA_TURNOS;
  bs._hirotoUltHp = bs.enemyHp;
  appendBattleLog(`🧊 ARMADURA DE RILGANDER! Uma barreira de gelo de ${bs._hirotoBarreiraHp} HP envolve Hiroto. Quem a atacar sofre dano de frio!`, '#80c8ff');
  if (typeof showFloatingNumber === 'function') showFloatingNumber('enemy', '🧊 BARREIRA', 'status');
}

// Registra a IA dela no motor (tabela ENEMY_AI do palDinh.js), sem editar o arquivo
if (typeof ENEMY_AI !== 'undefined' && !ENEMY_AI.hiroto_duelo) {
  ENEMY_AI.hiroto_duelo = {
    name: 'gélida',
    specialName: 'Armadura de Rilgander',
    specialIcon: '🧊',
    specialDesc: 'Barreira de gelo que protege Hiroto e fere quem a ataca. Inverno Uivante (passiva): ATQ/VEL maiores e +10% de dano em você.',
    special(bs, p, e) {
      if (bs._hirotoAcao === 'passiva') _kurosakiHirotoInvernoUivante(bs, p, e);
      else if (bs._hirotoAcao === 'barreira') _kurosakiHirotoArmadura(bs, p, e);
    },
  };
}

// Chamado a cada atualização do HUD de batalha:
//  1) barreira: devolve ao HP dela o dano que a barreira absorveu e reflete frio em você
//  2) corte: com 10% de HP dela, a luta acaba como vitória
function _kurosakiCheckDueloHiroto() {
  if (typeof battleState === 'undefined' || !battleState || !battleState.enemyData) return;
  const bs = battleState;
  if (bs.enemyData.id !== 'hiroto_duelo' || bs._battleEnded || bs._hirotoCorte) return;
  const K = KUROSAKI_HIROTO_SKILLS;
  const p = G.player;

  // 1) Armadura de Rilgander
  if (bs._hirotoUltHp == null) bs._hirotoUltHp = bs.enemyHp;
  if (bs._hirotoBarreiraHp > 0 && bs.enemyHp < bs._hirotoUltHp) {
    const dano = bs._hirotoUltHp - bs.enemyHp;
    const absorvido = Math.min(dano, bs._hirotoBarreiraHp);
    bs._hirotoBarreiraHp -= absorvido;
    bs.enemyHp += absorvido;
    let refl = Math.max(1, Math.floor(dano * K.BARREIRA_REFLEXO));
    if (bs._hirotoInverno) refl = Math.floor(refl * K.PASSIVA_DANO_EXTRA);
    p.hp = Math.max(1, p.hp - refl);
    appendBattleLog(`🧊 A barreira absorve ${absorvido} de dano e devolve ${refl} de frio em você!`, '#80c8ff');
    if (typeof showFloatingNumber === 'function') showFloatingNumber('hero', refl, 'dmg');
    if (typeof flashDamage === 'function') flashDamage('hero');
    if (bs._hirotoBarreiraHp <= 0) {
      bs._hirotoBarreiraTurnos = 0; bs._hirotoBarreiraCd = K.BARREIRA_CD;
      appendBattleLog('💥 A barreira de gelo se estilhaça!', '#a0e0ff');
    }
    if (typeof updateHUD === 'function') updateHUD();
    if (window._kurosakiOrigUpdateBattleHUD) window._kurosakiOrigUpdateBattleHUD();
  }
  bs._hirotoUltHp = bs.enemyHp;

  // 2) Corte aos 10%
  if (bs.enemyHp > 0 && bs.enemyMaxHp && (bs.enemyHp / bs.enemyMaxHp) <= KUROSAKI_HIROTO_DUELO_CORTE) {
    bs._hirotoCorte = true;
    bs.enemyHp = 0; // o motor enxerga o fim da luta e segue o caminho normal de vitória
    if (window._kurosakiOrigUpdateBattleHUD) window._kurosakiOrigUpdateBattleHUD();
    if (typeof appendBattleLog === 'function') appendBattleLog('❄ Hiroto ergue a mão e a geada para no ar. "Chega."', '#80c8ff');
    // garantia: se o motor não encerrar sozinho, encerra aqui (endBattle ignora chamada dupla)
    setTimeout(() => { if (!bs._battleEnded && typeof endBattle === 'function') endBattle(true, false); }, 1200);
  }
}

// Derrota/fuga contra ela NÃO é derrota de verdade: vira "vitória" interna com
// resultado 'lose' (HP cheio, sem morte, sem perder ouro) e a conversa decide o resto.
if (typeof endBattle === 'function' && !window._kurosakiOrigEndBattle) {
  window._kurosakiOrigEndBattle = endBattle;
  endBattle = function (won, fled) {
    const bs = (typeof battleState !== 'undefined') ? battleState : null;
    if (bs && bs.enemyData && bs.enemyData.id === 'hiroto_duelo' && !bs._battleEnded) {
      kurosakiInit();
      const p = G.player;
      if (!won) {
        // Talentos de ressurreição: deixa o motor cuidar (a luta continua)
        if (!fled && ((p._talent_phylactery && !bs._phylactery_used) ||
                      (p._talent_resurrection && !bs._resurrection_used) ||
                      (p._talent_undying && !bs._undying_used))) {
          return window._kurosakiOrigEndBattle(won, fled);
        }
        G.kurosaki._dueloResultado = 'lose';
        p.hp = p.maxHp;
        if (p.maxMp != null) p.mp = p.maxMp;
        return window._kurosakiOrigEndBattle(true, false);
      }
      G.kurosaki._dueloResultado = 'win';
    }
    return window._kurosakiOrigEndBattle(won, fled);
  };
}

function _kurosakiDueloIrParaRua() {
  if (_kurosakiEmCasaAlberon) kurosakiSairCasaAlberon(); // fecha a casa e volta pra rua
  personagemPinRemover('hiroto_kurosaki');
}

// ── Abertura ──
function storyNode_kurosaki_hirotoDuelo1() {
  kurosakiInit();
  _kurosakiDueloIrParaRua();
  G.kurosaki.hirotoDueloPendente = true;
  _hirotoFala(
    `Hiroto para no meio da rua, de costas pro Império. Não se vira de imediato.\n\n"Antes de cruzar aquele portão, preciso saber uma coisa."\n\nEla desembainha a espada devagar. O ar ao redor esfria, e a poeira cinza do chão ganha uma camada fina de geada.\n\n"Lá dentro, o menor degrau é pior que isso aqui. Se você não passa por mim, não passa por aquele portão."\n\n"Eu paro quando você me fizer sangrar de verdade. Se eu te derrubar, a gente repete até você aprender."`,
    [
      { icon:'⚔️', text:'Aceitar o duelo.', action: kurosakiHirotoIniciarDuelo },
      { icon:'↩', text:'Agora não.', action: storyNode_cidade_kurosaki_entrada },
    ]
  );
}
window.storyNode_kurosaki_hirotoDuelo1 = storyNode_kurosaki_hirotoDuelo1;

// ── Volta a falar com ela depois de perder (ou de adiar) ──
function storyNode_kurosaki_hiroto_dueloRetorno() {
  kurosakiInit();
  const perdeu = (G.kurosaki.hirotoDueloDerrotas || 0) > 0;
  _hirotoFala(
    perdeu
      ? `Hiroto está onde você a deixou, a espada apoiada no ombro e a geada ainda marcando o chão.\n\n"Voltou de pé. Já é mais do que muita gente."\n\n"Ainda tem um duelo devendo. Pronto?"`
      : `Hiroto está onde você a deixou, a espada apoiada no ombro.\n\n"Mudou de ideia sobre o duelo, ou veio só conferir se eu continuo aqui?"\n\n"Se vai ser agora, é agora. Pronto?"`,
    [
      { icon:'⚔️', text:'Vamos.', action: kurosakiHirotoIniciarDuelo },
      { icon:'↩', text:'Ainda não.', action: storyNode_cidade_kurosaki_entrada },
    ]
  );
}
window.storyNode_kurosaki_hiroto_dueloRetorno = storyNode_kurosaki_hiroto_dueloRetorno;

function kurosakiHirotoIniciarDuelo() {
  kurosakiInit();
  G.kurosaki._dueloResultado = null;
  const kills0 = (G.player && G.player.kills) || 0;
  G._dungeonBattleCallback = () => {
    // um duelo não é um abate: desfaz o +1 que o motor soma na vitória
    G.player.kills = Math.max(0, (G.player.kills || 0) - 1);
    if (G.player.kills > kills0) G.player.kills = kills0;
    if (G.kurosaki._dueloResultado === 'lose') storyNode_kurosaki_hirotoDueloDerrota();
    else storyNode_kurosaki_hirotoDueloVitoria();
  };
  startBattle(KUROSAKI_HIROTO_DUELO);
  _kurosakiHirotoPrepararDuelo();
}
// O battleState é o MESMO objeto em todas as lutas (o motor só reatribui campos conhecidos),
// então zeramos aqui tudo que a Hiroto usa, e ligamos a decisão aleatória de skill dela.
function _kurosakiHirotoPrepararDuelo() {
  if (typeof battleState === 'undefined' || !battleState || !battleState.enemyData) return;
  const bs = battleState, e = bs.enemyData;
  if (e.id !== 'hiroto_duelo') return;
  bs._hirotoCorte = false; bs._hirotoPassivaUsada = false; bs._hirotoInverno = false;
  bs._hirotoBarreiraHp = 0; bs._hirotoBarreiraTurnos = 0; bs._hirotoBarreiraCd = 0;
  bs._hirotoRoll = null; bs._hirotoAcao = null; bs._hirotoUltHp = bs.enemyHp;
  // e é uma cópia só desta luta ({...enemy}), então os buffs do Inverno Uivante não vazam pra próxima
  Object.defineProperty(e, 'forceSpecialChance', {
    configurable: true, enumerable: true,
    get() { return _kurosakiHirotoRolarAcao(bs); },
  });
}
window.kurosakiHirotoIniciarDuelo = kurosakiHirotoIniciarDuelo;

// ── Derrota: ela humilha, você tenta de novo ──
function storyNode_kurosaki_hirotoDueloDerrota() {
  kurosakiInit();
  G.kurosaki.hirotoDueloDerrotas = (G.kurosaki.hirotoDueloDerrotas || 0) + 1;
  const n = G.kurosaki.hirotoDueloDerrotas;
  if (G.player) { G.player.hp = G.player.maxHp; if (G.player.maxMp != null) G.player.mp = G.player.maxMp; }
  if (typeof updateHUD === 'function') updateHUD();
  _hirotoFala(
    n === 1
      ? `Hiroto embainha a espada sem pressa. O frio recua pelas pedras, devagar.\n\n"Foi isso?"\n\n"Se isso fosse tudo que o Império vai encontrar em você, eu enterrava vocês dois antes do portão."\n\nEla não diz com raiva. É pior: diz como quem está só constatando.\n\n"Levanta. Respira. E volta quando tiver aprendido a ficar de pé."`
      : `Hiroto nem precisa dizer nada. Só inclina a cabeça, de leve, esperando.\n\n"De novo? Gosto de teimoso."\n\n"Mas teimoso sem plano só morre mais devagar. Aprende com o que eu te mostrei."`,
    [
      { icon:'⚔️', text:'De novo.', action: kurosakiHirotoIniciarDuelo },
      { icon:'↩', text:'Preciso me preparar.', action: storyNode_cidade_kurosaki_entrada },
    ]
  );
}
window.storyNode_kurosaki_hirotoDueloDerrota = storyNode_kurosaki_hirotoDueloDerrota;

// ── Vitória (ela chegou a 10%): ela vira aliada e a cena segue pra confiança ──
function storyNode_kurosaki_hirotoDueloVitoria() {
  kurosakiInit();
  G.kurosaki.hirotoDueloPendente = false;
  G.kurosaki.hirotoDueloVencido = true;
  G.kurosaki.hirotoAcompanha = true;
  if (G.player) { G.player.hp = G.player.maxHp; if (G.player.maxMp != null) G.player.mp = G.player.maxMp; }
  if (typeof updateHUD === 'function') updateHUD();
  if (typeof addLog === 'function') addLog('❄️ Você tirou 90% da Capitã Hiroto no duelo.', 'xp');
  _hirotoFala(
    `A espada de Hiroto para a um palmo do seu pescoço. A geada que subia pelas pedras estala e recua.\n\n"Chega."\n\nEla respira fundo, uma vez, e pela primeira vez há sangue no canto da boca dela. Ela limpa com as costas da mão e olha pra isso, quase surpresa.\n\n"Noventa por cento. Não costumo dar isso a ninguém."\n\n"E presta atenção: os que ficam no topo daquele Império fazem o que acabou de acontecer parecer treino."`,
    [{ icon:'▶', text:'Continuar', action: storyNode_kurosaki_hirotoConfianca1 }]
  );
}
window.storyNode_kurosaki_hirotoDueloVitoria = storyNode_kurosaki_hirotoDueloVitoria;

// ── Não vai: a conversa se encerra e a casa volta ao normal ──
function storyNode_kurosaki_hirotoCasa_nao() {
  kurosakiInit();
  G.kurosaki.hirotoCenaCasaVista = true;
  G.kurosaki.hirotoAcompanha = false;
  _hirotoFala(
    `Hiroto não diz nada. O olhar dela pesa por um instante, e então ela vai pra porta, sozinha.\n\nA madeira se fecha de leve atrás dela. Pela fresta, dá pra ver que ela não foi longe: parou na rua, de costas, olhando na direção do Império.`,
    [{ icon:'▶', text:'Continuar', action: _kurosakiHirotoCasaVoltaAoNormal }]
  );
}
window.storyNode_kurosaki_hirotoCasa_nao = storyNode_kurosaki_hirotoCasa_nao;

// Fim da cena: fundo volta pra casa normal, só o Alberon trabalhando
function _kurosakiHirotoCasaVoltaAoNormal() {
  _kurosakiAlberonCenario(); // restaura o fundo (tira a imagem da cena dos 3, se houver)
  _alberonFala(
    `A casa volta a ser o que era: o caldeirão borbulhando baixo, os frascos enfileirados, e um velho que prefere o barulho deles ao silêncio da rua.`,
    _kurosakiAlberonOpcoes()
  );
}
window._kurosakiHirotoCasaVoltaAoNormal = _kurosakiHirotoCasaVoltaAoNormal;

// ─────────────────────────────────────────────────────────────
//  7c. IMPÉRIO DO PRESIDENTE — pin preto + cutscene da reunião
//      O pin aparece logo depois de sair da casa do Alberon
//      (G.kurosaki.imperioPinLiberado) e some depois que a reunião
//      foi vista (G.kurosaki.imperioReuniaoVista).
//      A reunião é uma cutscene com balões sobre a cabeça de cada um
//      (Presidente, Valdris, Eirik). Pra continuar a cena depois, é só
//      acrescentar falas em KUROSAKI_IMPERIO_FALAS.
// ─────────────────────────────────────────────────────────────
const KUROSAKI_IMPERIO_CONFIG = { X: 76, Y: 26 }; // posição do pin no mapa da cidade (%)
// ► TESTE: com true, o pin do Império fica SEMPRE na cidade, mesmo depois da reunião já ter sido vista,
//   pra você repetir a cutscene quantas vezes quiser. Quando terminar de ajustar, volte pra false.
const KUROSAKI_IMPERIO_REPETIR = true;
const KUROSAKI_IMPERIO_CENARIO = 'Imagens/Cidade das pedras/imperi463.png';
const KUROSAKI_IMPERIO_NOME = 'O IMPÉRIO'; // ► troque pelo nome do império quando definir (aparece na tela de título ao entrar)
const KUROSAKI_IMPERIO_CARDS = {
  presidente: { img: 'Imagens/personagens/Precisen.png', nome: 'O PRESIDENTE', titulo: 'SOBERANO DO IMPÉRIO' }, // ► nome ainda indefinido
  eirik:      { img: 'Imagens/personagens/Eirik.png',  nome: 'EIRIK',  titulo: 'O REI' },
  sigrid:     { img: 'Imagens/personagens/Sigrid.png', nome: 'SIGRID', titulo: 'A ESPADA DO REI' },
};

// MAPA DOS 8 REINOS — abre sozinho depois da fala marcada com `mapaDepois: true` em KUROSAKI_IMPERIO_FALAS (quando citam os 8 reinos).
// Os números piscam um a um, depois ficam fixos; toque em qualquer lugar pra fechar e a conversa continua.
// x/y = posição de cada número em % da imagem Mundi.png (≈1132×2030). Ajuste aqui se algum cair fora do lugar.
//   8 = Cidade das Pedras (onde acontece a reunião, no sul do mapa)   5 = reino/lar do Eirik
const KUROSAKI_IMPERIO_MAPA = {
  IMG: 'Imagens/Mundi.png',
  PASSO_MS: 700, // tempo entre um número e o próximo
  PONTOS: [
    { n: 1, x: 21.9, y: 21.2 },
    { n: 2, x: 45.1, y: 23.0 },
    { n: 3, x: 71.7, y: 26.4, cor: '#a9d8f5' },
    { n: 4, x:  9.8, y: 41.7 },
    { n: 5, x: 44.1, y: 52.6, destaque: 'azul',  cor: '#4f8fe0', rotulo: 'REINO DE EIRIK' },
    { n: 6, x: 12.9, y: 61.9 },
    { n: 7, x: 87.3, y: 79.2 },
    { n: 8, x: 52.0, y: 89.0, destaque: 'ouro',  cor: '#b8860b', rotulo: 'CIDADE DAS PEDRAS' },
  ],
};
const KUROSAKI_IMPERIO_FORA = 'Imagens/Cidade das pedras/imper675.png'; // fachada do palácio (depois da reunião)

// x/y = onde fica a cabeça de cada um na arte (% da imagem) — ajuste se o balão não cair certo
const KUROSAKI_IMPERIO_PERSONAGENS = {
  presidente: { nome: 'PRESIDENTE', cor: '#e0b050', x: 50, y: 50 },
  valdris:    { nome: 'VALDRIS',    cor: '#d06050', x: 21, y: 56 },
  eirik:      { nome: 'EIRIK',      cor: '#70a8d8', x: 79, y: 54 }, // fora da sala (fachada), as falas usam pos próprio
  singrid:    { nome: 'SIGRID',     cor: '#8cc08c', x: 62, y: 80 },
  narrador:   { nome: 'NARRADOR',   cor: '#b0a080', x: 50, y: 34, semBrilho: true }, // texto de ambientação, sem cabeça
};

const KUROSAKI_IMPERIO_FALAS = [
  // ── Abertura: o personagem NÃO está na sala, quem assiste é o jogador ──
  { quem: 'narrador', gesto: 'Enquanto você está em Kurosaki, longe dali, no coração do Império, três governantes se sentam à mesma mesa. Ninguém na cidade ouve o que será dito.' },

  // ── A reunião ──
  // cardDepois: 'presidente' → DEPOIS que ele termina esta fala, aparece o card com a imagem (KUROSAKI_IMPERIO_CARDS)
  { quem: 'presidente', cardDepois: 'presidente', texto: 'Clivor treme. Senti isso antes de qualquer relatório chegar à minha mesa. Nada se move neste império sem que eu saiba.' },
  // ► O mapa dos 8 reinos abre DEPOIS que o jogador lê esta fala (mapaDepois), que é quando eles citam os reinos
  { quem: 'presidente', texto: 'Oito reinos dividem Clivor. Três são governados por esta mesa. Os outros cinco só não nos pertencem ainda.', mapaDepois: true },
  { quem: 'eirik',      texto: 'Eu governo a maior nação de Clivor. Tenho minérios, armas e defesas. Nada cruza as minhas fronteiras sem a minha ordem.' },
  { quem: 'valdris',    texto: 'Eu não preciso de reino. O meu poder basta.' },
  { quem: 'presidente', texto: 'E eu tenho a Cidade das Pedras. Os minérios dela me fizeram o homem mais rico de Clivor.' },
  { quem: 'presidente', texto: 'Mas hoje o assunto é outro. Valdris, diga o que você encontrou.' },
  { quem: 'valdris',    texto: 'Os selos quebraram. As masmorras acordaram. Há criaturas onde eu não mandei haver criaturas.' },
  { quem: 'valdris',    texto: 'Alguém desfaz o que eu prendi. Ainda não sei quem. Quando eu achar, vou arrancar a mão dele. Ele vai implorar, e eu vou ouvir até o fim.' },
  { quem: 'presidente', texto: 'A pergunta é simples: Clivor resiste ao que vem, ou se adapta? Valdris, a sua resposta primeiro.' },
  { quem: 'valdris',    texto: 'Resistir. Quem sair da fila, eu parto ao meio. Se a mudança vier, vai encontrar Clivor em pé. Ou em pedaços.' },
  { quem: 'eirik',      texto: 'Clivor vai sobreviver, mas só se me ouvirem. Tenho um pedido.' },
  { quem: 'presidente', texto: 'Fale, Eirik. Eu ouço quem merece. Ainda estou decidindo se você merece.' },
  { quem: 'eirik',      texto: 'Libertem a Cidade das Pedras da maldição. Kurosaki apodrece há anos, e todos nesta mesa sabem disso. Quero que ela seja quebrada hoje.' },
  { quem: 'presidente', texto: 'Não.' },
  // Calígula (atribuído): "Oderint dum metuant" — "Que me odeiem, contanto que me temam."
  { quem: 'presidente', texto: 'A maldição fica. Ela alimenta o meu império. Que me odeiem, contanto que me temam.' },
  { quem: 'valdris',    texto: 'Só o medo obedece. Eu cuido disso.' },
  { quem: 'eirik',      texto: 'Então eu recuso. Nada vindo da Cidade das Pedras entra no meu reino. Nem minério, nem mercador, nem uma pedra que carregue aquele pó.' },
  { quem: 'eirik',      texto: 'Se o povo daquela cidade não for curado, a doença não ficará atrás dos muros. Vai cruzar pontes, estradas e portos, e chegar ao mundo inteiro. Eu avisei.' },
  { quem: 'presidente', texto: 'Doença é problema de gente fraca. Há anos eu governo aquele povo e—' }, // cortada por Valdris
  { quem: 'valdris',    texto: 'Chega! Não gaste a sua voz com ele, Presidente. Verme, esta mesa é de Clivor. Os seus problemas ficam do lado de fora, ou eu os arranco de você.' },
  { quem: 'presidente', texto: 'Como você quiser, Valdris. Já ouvi o bastante.' },
  { quem: 'eirik',      texto: 'Dois contra um. Não me intimidam.' },

  // ── O fim da reunião ──
  { quem: 'eirik',      texto: 'Esta conversa acabou. Só voltaremos a falar quando vocês lembrarem com quem estão falando.' },
  { quem: 'presidente', texto: 'Esta reunião acabou. Sem acordo.' },

  // ── A ordem do Presidente: só depois que o Eirik sai da sala, na língua do Valdris ──
  // lingua: true  → o texto (escrito em letras normais aqui) vira a escrita gótica do Lorde das Sombras
  //                 (igual à da Dungeon das Sombras) e o jogador não entende nada
  // treme: true   → as letras tremem de leve enquanto a fala aparece
  // rubro: true   → leve tom avermelhado na tela enquanto essas falas estão ativas
  { quem: 'narrador', gesto: 'Eirik se levanta e deixa a sala. A porta se fecha. O Presidente espera os passos sumirem no corredor.', rubro: true },
  { quem: 'presidente', lingua: true, treme: true, rubro: true, texto: 'Ethar voim suleika, Valdris... claenath vaem torcaethaen. Null caenaet vaetorcas.' },
  { quem: 'valdris',    lingua: true, treme: true, rubro: true, texto: '... Vaemor ethar... sulei null vaetorcas.' },

  // ── Do lado de fora: Eirik e Sigrid (fachada do palácio) ──
  { quem: 'eirik',      texto: 'Sigrid, vamos voltar para casa.', cenario: KUROSAKI_IMPERIO_FORA, pos: { x: 38, y: 82 } },
  { quem: 'singrid',    texto: 'Meu rei, está tudo bem? Senti uma energia pesada vinda daquela sala.', pos: { x: 64, y: 82 } },
  { quem: 'singrid',    texto: 'Não precisa me contar agora. Mas um peso dividido fica mais leve. Estarei com o senhor, aconteça o que acontecer.', pos: { x: 64, y: 82 } },
  { quem: 'eirik',      texto: 'Eu agradeço, Sigrid. Por ora, não posso dividir esse peso. Quando chegar a hora, você será a primeira a saber.', pos: { x: 38, y: 82 } },

  // ── Apresentação dos dois (cards com a imagem, igual ao do Presidente) ──
  { soCard: 'eirik' },
  { soCard: 'sigrid' },
];

function _kurosakiImperioPinImg() {
  const svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>"
    + "<circle cx='50' cy='50' r='50' fill='#050505'/>"
    + "<circle cx='50' cy='50' r='44' fill='none' stroke='#c8960a' stroke-width='3'/>"
    + "<text x='50' y='66' font-size='46' text-anchor='middle' fill='#f0c040' font-family='serif'>帝</text></svg>";
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function _kurosakiSincronizarPinImperio() {
  kurosakiInit();
  const k = G.kurosaki;
  // libera ao sair da casa do Alberon — ou, em saves que já passaram pela conversa dele, direto
  const liberado = KUROSAKI_IMPERIO_REPETIR || k.alberonPresidenteVisto || k.imperioReuniaoVista;
  const jaVista = k.imperioReuniaoVista && !KUROSAKI_IMPERIO_REPETIR;
  if (!liberado || jaVista || _kurosakiEmCasaAlberon) {
    personagemPinRemover('imperio_kurosaki');
    return;
  }
  personagemPinMostrar({
    id: 'imperio_kurosaki',
    x: KUROSAKI_IMPERIO_CONFIG.X,
    y: KUROSAKI_IMPERIO_CONFIG.Y,
    img: _kurosakiImperioPinImg(),
    alt: 'O Império',
    onClick: kurosakiImperioIniciarReuniao,
  });
}

function _kurosakiImperioCSS() {
  if (document.getElementById('kurosaki-imperio-css')) return;
  const st = document.createElement('style');
  st.id = 'kurosaki-imperio-css';
  st.textContent = `
    .kimp-ov{position:fixed;inset:0;z-index:10030;background:#000;display:flex;align-items:center;justify-content:center;
      opacity:0;animation:kimpIn .8s ease forwards;-webkit-tap-highlight-color:transparent;}
    .kimp-ov.kimp-direto{animation:none;opacity:1;}
    .kimp-ov.kimp-out{animation:kimpOut .7s ease forwards;}
    @keyframes kimpIn{to{opacity:1}} @keyframes kimpOut{to{opacity:0}}
    .kimp-stage{position:relative;width:min(100vw,72vh);aspect-ratio:1/1;background-size:cover;background-position:center;
      box-shadow:0 0 60px 20px #000 inset;animation:kimpZoom 14s ease-out forwards;}
    @keyframes kimpZoom{from{transform:scale(1)}to{transform:scale(1.06)}}
    .kimp-glow{position:absolute;width:26%;height:20%;margin:-10% 0 0 -13%;border-radius:50%;pointer-events:none;
      background:radial-gradient(circle,var(--c) 0%,transparent 70%);opacity:0;transition:opacity .35s;mix-blend-mode:screen;}
    .kimp-glow.on{opacity:.55;animation:kimpPulse 1.6s ease-in-out infinite;}
    @keyframes kimpPulse{0%,100%{opacity:.35}50%{opacity:.65}}
    .kimp-bubble{position:absolute;max-width:76%;min-width:42%;padding:10px 14px 12px;background:rgba(10,6,2,.94);
      border:1px solid var(--c);border-radius:12px;box-shadow:0 4px 18px rgba(0,0,0,.7),0 0 12px color-mix(in srgb,var(--c) 35%,transparent);
      font-family:'Noto Serif JP',serif;opacity:0;transform:translateY(6px);transition:opacity .25s,transform .25s;}
    .kimp-bubble.on{opacity:1;transform:translateY(0);}
    .kimp-bubble::after{content:'';position:absolute;bottom:-8px;left:var(--tail,50%);width:12px;height:12px;margin-left:-6px;
      background:rgba(10,6,2,.94);border-right:1px solid var(--c);border-bottom:1px solid var(--c);transform:rotate(45deg);}
    .kimp-nome{font-size:.55rem;letter-spacing:3px;color:var(--c);margin-bottom:5px;}
    .kimp-texto{font-size:.8rem;line-height:1.55;color:#f2e8d0;}
    .kimp-bubble.kimp-gesto .kimp-texto{font-style:italic;color:rgba(242,232,208,.65);}
    /* fala tremida (língua do Valdris): cada letra balança um pouquinho, em ritmos diferentes */
    .kimp-w{display:inline-block;white-space:nowrap;}
    .kimp-tr{display:inline-block;animation:kimpTremor .22s steps(2,end) infinite;}
    .kimp-tr:nth-child(3n){animation-duration:.17s;animation-direction:alternate-reverse;}
    .kimp-tr:nth-child(4n+1){animation-duration:.27s;}
    @keyframes kimpTremor{0%{transform:translate(.5px,-.6px)}25%{transform:translate(-.7px,.4px)}50%{transform:translate(.4px,.7px)}75%{transform:translate(-.5px,-.5px)}100%{transform:translate(.6px,.3px)}}
    .kimp-bubble.kimp-lingua .kimp-texto{font-size:.88rem;letter-spacing:.5px;}
    /* tom avermelhado quase imperceptível */
    .kimp-rubro{position:absolute;inset:0;z-index:5;pointer-events:none;opacity:0;transition:opacity 2.2s ease;
      background:radial-gradient(ellipse at center,rgba(150,10,10,.05) 0%,rgba(130,0,0,.12) 100%);mix-blend-mode:normal;}
    .kimp-rubro.on{opacity:1;animation:kimpRubroPulso 4s ease-in-out infinite;}
    @keyframes kimpRubroPulso{0%,100%{filter:brightness(1)}50%{filter:brightness(1.35)}}
    .kimp-dica{position:absolute;bottom:20px;left:0;right:0;text-align:center;font-family:'Noto Serif JP',serif;
      font-size:.58rem;letter-spacing:3px;color:rgba(200,150,10,.6);pointer-events:none;animation:kimpPulse 2s ease-in-out infinite;}
    .kimp-titulo{position:fixed;inset:0;z-index:10035;background:#000;display:flex;align-items:center;justify-content:center;
      opacity:0;animation:kimpIn .9s ease forwards;}
    .kimp-titulo.kimp-out{animation:kimpOut .8s ease forwards;}
    .kimp-titulo svg{width:min(100vw,55.5vh);height:auto;max-height:100vh;display:block;}
    @keyframes ktRise{from{transform:translateY(22px)}to{transform:translateY(0)}}
    @keyframes ktUp{0%{transform:translateY(0);opacity:0}15%{opacity:1}100%{transform:translateY(-70px);opacity:0}}
    @keyframes ktFly{from{transform:translateX(-30px)}to{transform:translateX(230px)}}
    @keyframes ktFlick{0%,100%{opacity:1}50%{opacity:.5}}
    @keyframes ktMist{0%,100%{transform:translateX(-16px)}50%{transform:translateX(16px)}}
    @keyframes ktFade{from{opacity:0}to{opacity:1}}
    @keyframes ktTwk{0%,100%{opacity:.9}50%{opacity:.2}}
    @keyframes ktFall{0%{transform:translate(0,0);opacity:0}15%{opacity:.8}100%{transform:translate(-26px,120px);opacity:0}}
    @keyframes ktWave{0%,100%{transform:skewY(0deg)}50%{transform:skewY(5deg)}}
    @keyframes ktDrift{0%,100%{transform:translateX(-6px)}50%{transform:translateX(6px)}}
    .kt-sun{animation:ktRise 2.6s ease-out both}
    .kt-crow{animation:ktFly 11s linear infinite}
    .kt-fl{animation:ktFlick 1.7s ease-in-out infinite}
    .kt-mi{animation:ktMist 9s ease-in-out infinite}
    .kt-em{animation:ktUp 4.5s ease-out infinite}
    .kt-tt{animation:ktFade 1.6s ease-out 1.2s both}
    .kt-st{animation:ktTwk 3s ease-in-out infinite}
    .kt-pt{animation:ktFall 7s linear infinite}
    .kt-fg{transform-box:fill-box;transform-origin:left center;animation:ktWave 3s ease-in-out infinite}
    .kt-dr{animation:ktDrift 14s ease-in-out infinite}
    .kimp-card{position:fixed;inset:0;z-index:10040;background:radial-gradient(circle at 50% 45%,rgba(30,14,6,.97),#000 75%);
      display:flex;flex-direction:column;align-items:center;justify-content:center;padding:18px;opacity:0;animation:kimpIn .7s ease forwards;}
    .kimp-card.kimp-out{animation:kimpOut .6s ease forwards;}
    .kimp-card img{max-width:88vw;max-height:66vh;object-fit:contain;border:1px solid rgba(200,150,10,.55);
      box-shadow:0 0 40px rgba(200,150,10,.25),0 0 90px rgba(0,0,0,.9);animation:kimpCardImg 1.2s ease-out both;}
    @keyframes kimpCardImg{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}
    .kimp-card-nome{font-family:'Noto Serif JP',serif;font-size:1.25rem;letter-spacing:8px;color:#f0c040;margin-top:18px;padding-left:8px;
      text-shadow:0 0 14px rgba(200,150,10,.5);opacity:0;animation:kimpIn .8s ease .9s forwards;}
    .kimp-card-titulo{font-family:'Noto Serif JP',serif;font-size:.58rem;letter-spacing:5px;color:rgba(200,150,10,.7);margin-top:8px;
      opacity:0;animation:kimpIn .8s ease 1.3s forwards;}
    /* ── mapa dos 8 reinos ── */
    .kimp-mapa{position:fixed;inset:0;z-index:10045;background:#000;display:flex;align-items:center;justify-content:center;
      opacity:0;animation:kimpIn .6s ease forwards;-webkit-tap-highlight-color:transparent;}
    .kimp-mapa.kimp-out{animation:kimpOut .5s ease forwards;}
    .kimp-mapa-wrap{position:relative;line-height:0;}
    .kimp-mapa-img{display:block;max-width:100vw;max-height:100vh;width:auto;height:auto;filter:brightness(.82);}
    .kimp-mapa-ponto{position:absolute;transform:translate(-50%,-50%);opacity:0;pointer-events:none;--c:#f0c040;}
    .kimp-mapa-ponto.kimp-mapa-azul{--c:#70a8d8;}
    .kimp-mapa-ponto span{position:relative;display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:50%;
      background:#f1e6c8;color:#1a1612;font-family:'Noto Serif JP',serif;font-weight:700;font-size:1.05rem;line-height:1;
      box-shadow:0 0 0 2px rgba(0,0,0,.55);}
    .kimp-mapa-ponto span svg{position:absolute;left:-3px;top:-3px;width:calc(100% + 6px);height:calc(100% + 6px);transform:rotate(-70deg);pointer-events:none;}
    .kimp-mapa-ponto span svg circle{fill:none;stroke:#1a1612;stroke-width:8;stroke-linecap:round;stroke-dasharray:240 36;}
    .kimp-mapa-ponto.kimp-mapa-cor span{background:var(--fundo);}
    .kimp-mapa-ponto.kimp-mapa-forte span{width:56px;height:56px;font-size:1.65rem;}
    .kimp-mapa-ponto.kimp-mapa-forte span svg circle{stroke-width:10;stroke-dasharray:230 46;}
    .kimp-mapa-ponto.on{opacity:1;animation:kimpBlink .9s linear both;}
    @keyframes kimpBlink{0%{opacity:0}16%{opacity:1}33%{opacity:.08}50%{opacity:1}66%{opacity:.08}83%,100%{opacity:1}}
    .kimp-mapa.fixo .kimp-mapa-ponto{opacity:1;animation:none;}
    .kimp-mapa.fixo .kimp-mapa-forte span{animation:kimpMapaPulso 1.8s ease-in-out infinite;}
    @keyframes kimpMapaPulso{0%,100%{box-shadow:0 0 0 2px rgba(0,0,0,.7),0 0 12px color-mix(in srgb,var(--c) 55%,transparent)}
      50%{box-shadow:0 0 0 2px rgba(0,0,0,.7),0 0 30px 6px color-mix(in srgb,var(--c) 85%,transparent)}}
    .kimp-mapa-ponto em{position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:8px;white-space:nowrap;
      font-style:normal;font-family:'Noto Serif JP',serif;font-size:.55rem;letter-spacing:2px;line-height:1.2;color:var(--c);
      background:rgba(0,0,0,.78);padding:4px 9px;border:1px solid var(--c);opacity:0;transition:opacity .6s;}
    .kimp-mapa.fixo .kimp-mapa-ponto em{opacity:1;}
    .kimp-mapa-dica{position:absolute;bottom:20px;left:0;right:0;text-align:center;font-family:'Noto Serif JP',serif;
      font-size:.58rem;letter-spacing:3px;color:rgba(240,192,64,.85);text-shadow:0 0 6px #000,0 0 12px #000;pointer-events:none;
      opacity:0;transition:opacity .6s;}
    .kimp-mapa.fixo .kimp-mapa-dica{opacity:1;animation:kimpPulse 2s ease-in-out infinite;}
    .kimp-pular{position:absolute;top:16px;right:16px;padding:7px 14px;font-family:'Noto Serif JP',serif;font-size:.6rem;
      letter-spacing:2px;color:rgba(200,150,10,.75);border:1px solid rgba(200,150,10,.4);background:rgba(0,0,0,.6);cursor:pointer;z-index:2;}
  `;
  document.head.appendChild(st);
}

let _kurosakiImperioTyper = null;

// Tela de título: castelo ao pôr do sol (SVG animado, tela cheia)
function _kurosakiImperioTituloSVG() {
  return `<svg viewBox="0 0 200 360" role="img" aria-label="O Império"><defs><linearGradient id="ktSk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#090202"/><stop offset="0.55" stop-color="#2c0606"/><stop offset="1" stop-color="#6a1210"/></linearGradient></defs>
<rect width="200" height="360" rx="10" fill="#0a0606"/>
<rect x="6" y="6" width="188" height="232" fill="url(#ktSk)"/>
<g fill="#e8d8b8"><circle class="kt-st" cx="30" cy="40" r="0.8"/><circle class="kt-st" cx="164" cy="52" r="0.9" style="animation-delay:-1s"/><circle class="kt-st" cx="52" cy="76" r="0.6" style="animation-delay:-2s"/><circle class="kt-st" cx="148" cy="30" r="0.7" style="animation-delay:-0.5s"/><circle class="kt-st" cx="24" cy="104" r="0.6" style="animation-delay:-1.5s"/><circle class="kt-st" cx="176" cy="96" r="0.7" style="animation-delay:-2.5s"/><circle class="kt-st" cx="126" cy="64" r="0.5"/><circle class="kt-st" cx="74" cy="34" r="0.6" style="animation-delay:-2.2s"/></g>
<circle cx="100" cy="30" r="10" fill="none" stroke="#a88a3a" stroke-width="1"/>
<circle cx="100" cy="30" r="7.5" fill="none" stroke="#6e0a0a" stroke-width="0.8"/>
<text x="100" y="35" text-anchor="middle" font-family="serif" font-size="13" fill="#d8cdb8">帝</text>
<g class="kt-sun">
<circle cx="100" cy="186" r="100" fill="#7a1010" opacity="0.18"/>
<circle cx="100" cy="186" r="84" fill="#8a1010" opacity="0.3"/>
<circle cx="100" cy="186" r="68" fill="#a81414" opacity="0.5"/>
<circle cx="100" cy="186" r="58" fill="#d02020"/>
<g stroke="#f04040" stroke-width="0.7" opacity="0.45"><line x1="100" y1="186" x2="100" y2="70"/><line x1="100" y1="186" x2="30" y2="100"/><line x1="100" y1="186" x2="170" y2="100"/><line x1="100" y1="186" x2="14" y2="150"/><line x1="100" y1="186" x2="186" y2="150"/></g>
<g fill="#3a0909" opacity="0.9"><rect x="42" y="158" width="116" height="2.5"/><rect x="48" y="168" width="104" height="3"/><rect x="40" y="179" width="120" height="3.5"/><rect x="46" y="191" width="108" height="4"/></g>
</g>
<g class="kt-crow"><path d="M6 120 q4 -4 8 0 q4 -4 8 0" fill="none" stroke="#0a0606" stroke-width="1.6"/></g>
<g class="kt-crow" style="animation-delay:-5s;animation-duration:14s"><path d="M6 104 q3 -3 6 0 q3 -3 6 0" fill="none" stroke="#0a0606" stroke-width="1.3"/></g>
<g class="kt-crow" style="animation-delay:-8s;animation-duration:9s"><path d="M6 140 q3 -3 6 0 q3 -3 6 0" fill="none" stroke="#0a0606" stroke-width="1.3"/></g>
<polygon points="6,214 30,184 52,204 78,168 106,200 134,172 160,202 182,182 194,196 194,238 6,238" fill="#4c0d0d"/>
<g class="kt-dr"><rect x="20" y="206" width="90" height="3" fill="#b02424" opacity="0.28"/><rect x="100" y="198" width="80" height="2.5" fill="#b02424" opacity="0.22"/></g>
<polygon points="6,226 24,208 48,222 74,206 100,222 128,206 156,222 178,208 194,220 194,240 6,240" fill="#2a0808"/>
<g class="kt-mi"><rect x="30" y="224" width="70" height="3" fill="#c03030" opacity="0.22"/><rect x="80" y="230" width="86" height="2.5" fill="#c03030" opacity="0.18"/></g>
<polygon points="6,238 30,226 60,236 100,232 140,236 170,226 194,238 194,244 6,244" fill="#120505"/>
<rect x="6" y="236" width="188" height="122" fill="#0a0606"/>
<polygon points="50,236 60,210 140,210 150,236" fill="#0a0606" stroke="#1e0a0a" stroke-width="0.8"/>
<g stroke="#1e0a0a" stroke-width="0.6"><line x1="54" y1="222" x2="146" y2="222"/><line x1="52" y1="229" x2="148" y2="229"/><line x1="76" y1="210" x2="72" y2="236"/><line x1="100" y1="210" x2="100" y2="236"/><line x1="124" y1="210" x2="128" y2="236"/></g>
<rect x="34" y="204" width="24" height="14" fill="#0a0606"/>
<polygon points="26,206 36,202 46,194 56,202 66,206 62,210 30,210" fill="#0a0606"/>
<rect x="142" y="204" width="24" height="14" fill="#0a0606"/>
<polygon points="134,206 144,202 154,194 164,202 174,206 170,210 138,210" fill="#0a0606"/>
<rect x="70" y="184" width="60" height="26" fill="#0a0606"/>
<path d="M42 188 Q56 192 70 184 L130 184 Q144 192 158 188 L152 196 L48 196 Z" fill="#0a0606"/>
<rect x="78" y="160" width="44" height="24" fill="#0a0606"/>
<path d="M58 164 Q70 168 80 160 L120 160 Q130 168 142 164 L136 172 L64 172 Z" fill="#0a0606"/>
<rect x="86" y="140" width="28" height="20" fill="#0a0606"/>
<path d="M70 144 Q80 148 88 140 L112 140 Q120 148 130 144 L124 152 L76 152 Z" fill="#0a0606"/>
<rect x="92" y="124" width="16" height="16" fill="#0a0606"/>
<path d="M80 128 Q90 132 94 124 L106 124 Q110 132 120 128 L114 134 L86 134 Z" fill="#0a0606"/>
<polygon points="92,124 100,108 108,124" fill="#0a0606"/>
<circle cx="80" cy="128" r="1.8" fill="#a88a3a"/><circle cx="120" cy="128" r="1.8" fill="#a88a3a"/>
<rect x="99.3" y="86" width="1.4" height="24" fill="#0a0606"/>
<polygon class="kt-fg" points="101,87 116,91 101,96" fill="#d02020"/>
<g fill="#ffb347" class="kt-fl"><rect x="76" y="192" width="3" height="5"/><rect x="88" y="192" width="3" height="5"/><rect x="109" y="192" width="3" height="5"/><rect x="121" y="192" width="3" height="5"/><rect x="88" y="168" width="3" height="5"/><rect x="109" y="168" width="3" height="5"/><rect x="95" y="146" width="3" height="5"/><rect x="102" y="146" width="3" height="5"/><rect x="98.5" y="129" width="3" height="5"/></g>
<g fill="#ffb347" class="kt-fl" style="animation-delay:-0.8s"><rect x="40" y="208" width="2.5" height="4"/><rect x="157" y="208" width="2.5" height="4"/></g>
<g fill="#080404"><polygon points="28,196 38,214 18,214"/><polygon points="28,206 41,228 15,228"/><polygon points="28,218 44,240 12,240"/><polygon points="172,198 182,216 162,216"/><polygon points="172,208 185,230 159,230"/><polygon points="172,220 188,242 156,242"/></g>
<polygon points="86,236 114,236 150,292 50,292" fill="#140606"/>
<g stroke="#2c0c0c" stroke-width="0.8"><line x1="84" y1="244" x2="116" y2="244"/><line x1="80" y1="252" x2="120" y2="252"/><line x1="76" y1="260" x2="124" y2="260"/><line x1="71" y1="268" x2="129" y2="268"/><line x1="66" y1="276" x2="134" y2="276"/><line x1="60" y1="284" x2="140" y2="284"/><line x1="100" y1="236" x2="100" y2="292"/></g>
<g class="kt-fl"><circle cx="80" cy="246" r="9" fill="#ff3a1a" opacity="0.22"/><circle cx="120" cy="246" r="9" fill="#ff3a1a" opacity="0.22"/><circle cx="68" cy="264" r="9" fill="#ff3a1a" opacity="0.22"/><circle cx="132" cy="264" r="9" fill="#ff3a1a" opacity="0.22"/></g>
<g fill="#1a0a0a"><rect x="77" y="250" width="6" height="12"/><rect x="117" y="250" width="6" height="12"/><rect x="65" y="268" width="6" height="12"/><rect x="129" y="268" width="6" height="12"/></g>
<g fill="#e22a1a"><rect x="78" y="241" width="4" height="7"/><rect x="118" y="241" width="4" height="7"/><rect x="66" y="259" width="4" height="7"/><rect x="130" y="259" width="4" height="7"/></g>
<g stroke="#3a1414" stroke-width="1.2"><line x1="30" y1="246" x2="30" y2="296"/><line x1="170" y1="246" x2="170" y2="296"/></g>
<polygon class="kt-fg" points="30,248 44,250 44,282 37,276 30,282" fill="#7a0c0c" stroke="#a01414" stroke-width="0.6"/>
<polygon class="kt-fg" points="170,248 156,250 156,282 163,276 170,282" fill="#7a0c0c" stroke="#a01414" stroke-width="0.6" style="transform-origin:right center"/>
<g fill="#ff7a2a"><circle class="kt-em" cx="80" cy="248" r="1.1"/><circle class="kt-em" cx="120" cy="248" r="1.1" style="animation-delay:-1s"/><circle class="kt-em" cx="68" cy="266" r="1" style="animation-delay:-2s"/><circle class="kt-em" cx="132" cy="266" r="1" style="animation-delay:-3s"/><circle class="kt-em" cx="92" cy="258" r="0.8" style="animation-delay:-1.5s"/><circle class="kt-em" cx="108" cy="262" r="0.8" style="animation-delay:-2.5s"/><circle class="kt-em" cx="56" cy="278" r="0.9" style="animation-delay:-3.5s"/><circle class="kt-em" cx="144" cy="278" r="0.9" style="animation-delay:-0.5s"/><circle class="kt-em" cx="100" cy="270" r="0.7" style="animation-delay:-4s"/><circle class="kt-em" cx="76" cy="284" r="0.7" style="animation-delay:-2.2s"/><circle class="kt-em" cx="124" cy="284" r="0.7" style="animation-delay:-1.2s"/></g>
<g fill="#c02828" opacity="0.8"><ellipse class="kt-pt" cx="140" cy="60" rx="1.6" ry="0.9"/><ellipse class="kt-pt" cx="60" cy="90" rx="1.4" ry="0.8" style="animation-delay:-2s"/><ellipse class="kt-pt" cx="170" cy="120" rx="1.6" ry="0.9" style="animation-delay:-4s"/><ellipse class="kt-pt" cx="30" cy="140" rx="1.4" ry="0.8" style="animation-delay:-5.5s"/></g>
<rect x="46" y="292" width="108" height="5" fill="#2a0808" stroke="#8a1010" stroke-width="0.6"/>
<path d="M40 292 Q46 288 54 290 L146 290 Q154 288 160 292 L156 296 L44 296 Z" fill="#1c0606" stroke="#a01414" stroke-width="0.8"/>
<rect x="56" y="302" width="88" height="4" fill="#2a0808" stroke="#8a1010" stroke-width="0.6"/>
<rect x="60" y="296" width="7" height="40" fill="#2a0808" stroke="#a01414" stroke-width="0.8"/>
<rect x="133" y="296" width="7" height="40" fill="#2a0808" stroke="#a01414" stroke-width="0.8"/>
<rect x="98" y="296" width="4" height="6" fill="#2a0808" stroke="#8a1010" stroke-width="0.6"/>
<g class="kt-tt">
<text x="100" y="344" text-anchor="middle" font-family="serif" font-size="13" textLength="104" lengthAdjust="spacing" fill="#d8cdb8">${KUROSAKI_IMPERIO_NOME}</text>
</g>
<g fill="none" stroke="#a88a3a" stroke-width="1"><path d="M10 22 L10 10 L22 10"/><path d="M190 22 L190 10 L178 10"/><path d="M10 338 L10 350 L22 350"/><path d="M190 338 L190 350 L178 350"/></g>
<rect x="3" y="3" width="194" height="354" rx="8" fill="none" stroke="#6e0a0a" stroke-width="1.6"/>
<rect x="7" y="7" width="186" height="346" rx="5" fill="none" stroke="#3a0808" stroke-width="0.8"/>
</svg>`;
}

// Tela de título → depois roda a reunião
function kurosakiImperioIniciarReuniao() {
  kurosakiInit();
  if (document.getElementById('kurosaki-imperio') || document.getElementById('kurosaki-imperio-titulo')) return;
  _kurosakiImperioCSS();
  const t = document.createElement('div');
  t.id = 'kurosaki-imperio-titulo';
  t.className = 'kimp-titulo';
  t.innerHTML = _kurosakiImperioTituloSVG();
  document.body.appendChild(t);
  let feito = false;
  const t0 = Date.now();
  const fim = () => {
    if (feito) return; feito = true;
    // a reunião já nasce preta e opaca POR BAIXO do título; o título some em fade por cima (nunca aparece a cidade)
    _kurosakiImperioRodarReuniao(true);
    t.classList.add('kimp-out');
    setTimeout(() => t.remove(), 800);
  };
  t.addEventListener('click', () => { if (Date.now() - t0 > 900) fim(); });
  setTimeout(fim, 3400);
}
window.kurosakiImperioIniciarReuniao = kurosakiImperioIniciarReuniao;

// Mapa dos 8 reinos: números piscam um a um, depois ficam fixos. Toque: 1º pula a animação, 2º fecha.
function _kurosakiImperioMostrarMapa(onFim) {
  _kurosakiImperioCSS();
  const cfg = KUROSAKI_IMPERIO_MAPA;
  const ov = document.createElement('div');
  ov.className = 'kimp-mapa';
  const pontos = cfg.PONTOS.map(p => {
    const cls = (p.destaque ? ' kimp-mapa-forte' + (p.destaque === 'azul' ? ' kimp-mapa-azul' : '') : '') + (p.cor ? ' kimp-mapa-cor' : '');
    const corStyle = p.cor ? `--fundo:${p.cor};--c:${p.cor};` : '';
    return `<div class="kimp-mapa-ponto${cls}" style="left:${p.x}%;top:${p.y}%;${corStyle}"><span><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44"/></svg>${p.n}</span>${p.rotulo ? `<em>${p.rotulo}</em>` : ''}</div>`;
  }).join('');
  ov.innerHTML = `<div class="kimp-mapa-wrap"><img class="kimp-mapa-img" src="${cfg.IMG}" alt="Mapa de Clivor" onerror="this.style.display='none';">${pontos}</div>
    <div class="kimp-mapa-dica">TOQUE PARA CONTINUAR</div>`;
  document.body.appendChild(ov);

  const pts = Array.from(ov.querySelectorAll('.kimp-mapa-ponto'));
  let k = 0, timer = null, fixo = false, fechando = false;
  const t0 = Date.now();

  function fixar() {
    clearTimeout(timer);
    pts.forEach(p => p.classList.add('on'));
    ov.classList.add('fixo');
    fixo = true;
  }
  function passo() {
    if (k >= pts.length) { timer = setTimeout(fixar, 1100); return; }
    pts[k++].classList.add('on');
    timer = setTimeout(passo, cfg.PASSO_MS);
  }
  function fechar() {
    if (fechando) return; fechando = true;
    clearTimeout(timer);
    ov.classList.add('kimp-out');
    setTimeout(() => { ov.remove(); if (typeof onFim === 'function') onFim(); }, 500);
  }
  ov.addEventListener('click', () => {
    if (Date.now() - t0 < 600) return;
    if (!fixo) return fixar();
    fechar();
  });
  timer = setTimeout(passo, 800);
}

// Card de apresentação de personagem (imagem + nome), toque pra continuar
function _kurosakiImperioMostrarCard(cfg, onFim) {
  _kurosakiImperioCSS();
  const c = document.createElement('div');
  c.className = 'kimp-card';
  c.innerHTML = `<img src="${cfg.img}" alt="${cfg.nome}" onerror="this.style.display='none';">
    <div class="kimp-card-nome">${cfg.nome}</div>
    <div class="kimp-card-titulo">${cfg.titulo}</div>`;
  document.body.appendChild(c);
  let feito = false;
  const t0 = Date.now();
  const fim = () => {
    if (feito) return; feito = true;
    c.classList.add('kimp-out');
    setTimeout(() => { c.remove(); if (onFim) onFim(); }, 600);
  };
  c.addEventListener('click', () => { if (Date.now() - t0 > 1200) fim(); });
}

function _kurosakiImperioRodarReuniao(direto) {
  kurosakiInit();
  if (document.getElementById('kurosaki-imperio')) return;

  // Cena: suspende dano do pó, esconde o painel de conversa e os pins
  G._kurosakiCutscene = true;
  hubiWorldPinRemover();
  personagemPinRemoverTodos();
  const painel = document.getElementById('interaction-panel');
  if (painel) painel.style.setProperty('display', 'none', 'important');

  const ov = document.createElement('div');
  ov.id = 'kurosaki-imperio';
  ov.className = 'kimp-ov' + (direto ? ' kimp-direto' : '');
  const glows = Object.keys(KUROSAKI_IMPERIO_PERSONAGENS).filter(id => !KUROSAKI_IMPERIO_PERSONAGENS[id].semBrilho).map(id => {
    const p = KUROSAKI_IMPERIO_PERSONAGENS[id];
    return `<div class="kimp-glow" data-who="${id}" style="left:${p.x}%;top:${p.y}%;--c:${p.cor};"></div>`;
  }).join('');
  ov.innerHTML = `
    <div class="kimp-stage" style="background-image:url('${KUROSAKI_IMPERIO_CENARIO}');">
      ${glows}
      <div class="kimp-bubble" id="kimp-bubble"><div class="kimp-nome"></div><div class="kimp-texto"></div></div>
    </div>
    <div class="kimp-rubro" id="kimp-rubro"></div>
    <div class="kimp-pular" id="kimp-pular">PULAR</div>
    <div class="kimp-dica">TOQUE PARA CONTINUAR</div>
  `;
  document.body.appendChild(ov);

  let i = -1;
  let digitando = false;
  let textoAtual = '';

  const bubble = ov.querySelector('#kimp-bubble');
  const elNome = bubble.querySelector('.kimp-nome');
  const elTexto = bubble.querySelector('.kimp-texto');
  const stage = ov.querySelector('.kimp-stage');

  function posicionar(p) {
    // balão em cima da cabeça, sem sair da imagem
    const W = stage.clientWidth;
    bubble.style.bottom = (100 - p.y + 8) + '%';
    bubble.style.left = '0px';
    const bw = bubble.offsetWidth;
    let left = (p.x / 100) * W - bw / 2;
    left = Math.max(W * 0.03, Math.min(W - bw - W * 0.13, left)); // margem maior à direita: não encosta no botão de engrenagem
    bubble.style.left = left + 'px';
    const tail = Math.max(18, Math.min(bw - 18, (p.x / 100) * W - left));
    bubble.style.setProperty('--tail', tail + 'px');
  }

  // converte letras normais em escrita gótica (𝖆𝖇𝖈...) — a língua do Lorde das Sombras
  function _linguaValdris(txt) {
    return Array.from(txt).map(ch => {
      const c = ch.charCodeAt(0);
      if (c >= 65 && c <= 90)  return String.fromCodePoint(0x1D56C + (c - 65));
      if (c >= 97 && c <= 122) return String.fromCodePoint(0x1D586 + (c - 97));
      return ch;
    }).join('');
  }
  const _esc = ch => ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch;
  let tremendo = false;
  // mostra os n primeiros caracteres; se estiver tremendo, cada letra vira um <span> que balança
  function _renderTexto(chars, n) {
    if (!tremendo) { elTexto.textContent = chars.slice(0, n).join(''); return; }
    let html = '', k = 0;
    chars.slice(0, n).join('').split(' ').forEach((palavra, w) => {
      if (w > 0) html += ' ';
      html += '<span class="kimp-w">' + Array.from(palavra).map(ch => {
        k++;
        return '<span class="kimp-tr" style="animation-delay:-' + (((k * 53) % 100) / 400).toFixed(2) + 's">' + _esc(ch) + '</span>';
      }).join('') + '</span>';
    });
    elTexto.innerHTML = html;
  }

  function digitar(texto, done) {
    clearInterval(_kurosakiImperioTyper);
    digitando = true;
    textoAtual = texto;
    const chars = Array.from(texto); // por caractere (a escrita gótica ocupa 2 unidades em JS)
    elTexto.textContent = '';
    let n = 0;
    _kurosakiImperioTyper = setInterval(() => {
      n++;
      _renderTexto(chars, n);
      if (n >= chars.length) {
        clearInterval(_kurosakiImperioTyper);
        digitando = false;
        if (done) done();
      }
    }, 22);
  }

  let cenarioAtual = KUROSAKI_IMPERIO_CENARIO;
  let trocando = false;
  const apresentados = {};
  const mapasMostrados = {};
  const cardsDepois = {};

  function proxima() {
    if (trocando) return;
    // mapa dos 8 reinos: abre DEPOIS que o jogador leu a fala marcada com mapaDepois
    const atual = KUROSAKI_IMPERIO_FALAS[i];
    // card do personagem: aparece DEPOIS que ele termina a fala marcada com cardDepois
    if (atual && atual.cardDepois && !cardsDepois[i] && KUROSAKI_IMPERIO_CARDS[atual.cardDepois]) {
      cardsDepois[i] = true;
      trocando = true;
      bubble.classList.remove('on');
      ov.querySelectorAll('.kimp-glow').forEach(g => g.classList.remove('on'));
      _kurosakiImperioMostrarCard(KUROSAKI_IMPERIO_CARDS[atual.cardDepois], () => { trocando = false; proxima(); });
      return;
    }
    if (atual && atual.mapaDepois && !mapasMostrados[i]) {
      mapasMostrados[i] = true;
      trocando = true;
      bubble.classList.remove('on');
      _kurosakiImperioMostrarMapa(() => { trocando = false; proxima(); });
      return;
    }
    i++;
    if (i >= KUROSAKI_IMPERIO_FALAS.length) return terminar();
    const f = KUROSAKI_IMPERIO_FALAS[i];
    // card solto (só a apresentação do personagem, sem fala): { soCard: 'eirik' }
    if (f.soCard) {
      const cfgCard = KUROSAKI_IMPERIO_CARDS[f.soCard];
      if (!cfgCard) return proxima();
      trocando = true;
      bubble.classList.remove('on');
      ov.querySelectorAll('.kimp-glow').forEach(g => g.classList.remove('on'));
      _kurosakiImperioMostrarCard(cfgCard, () => { trocando = false; proxima(); });
      return;
    }
    // apresentação do personagem (card com a imagem) antes da 1ª fala dele
    if (f.apresentar && !apresentados[f.apresentar] && KUROSAKI_IMPERIO_CARDS[f.apresentar]) {
      apresentados[f.apresentar] = true;
      trocando = true;
      bubble.classList.remove('on');
      _kurosakiImperioMostrarCard(KUROSAKI_IMPERIO_CARDS[f.apresentar], () => { trocando = false; i--; proxima(); });
      return;
    }
    // troca de cenário com fade (ex.: sai da sala e vai pra fachada do palácio)
    if (f.cenario && f.cenario !== cenarioAtual) {
      trocando = true;
      ov.querySelector('#kimp-rubro').classList.remove('on');
      bubble.classList.remove('on');
      ov.querySelectorAll('.kimp-glow').forEach(g => g.classList.remove('on'));
      stage.style.transition = 'opacity .5s';
      stage.style.opacity = '0';
      setTimeout(() => {
        cenarioAtual = f.cenario;
        stage.style.backgroundImage = `url('${f.cenario}')`;
        stage.style.opacity = '1';
        setTimeout(() => { trocando = false; i--; proxima(); }, 600);
        // o próximo proxima() já não troca de novo (cenarioAtual igual)
      }, 520);
      return;
    }
    const p = Object.assign({}, KUROSAKI_IMPERIO_PERSONAGENS[f.quem], f.pos || {});
    ov.querySelectorAll('.kimp-glow').forEach(g => g.classList.toggle('on', !f.pos && g.getAttribute('data-who') === f.quem));
    bubble.classList.remove('on');
    bubble.style.setProperty('--c', p.cor);
    let textoFala = f.gesto || f.texto; // gesto = ação sem fala (itálico)
    if (f.lingua && !f.gesto) textoFala = _linguaValdris(textoFala);
    tremendo = !!f.treme;
    ov.querySelector('#kimp-rubro').classList.toggle('on', !!f.rubro); // tom avermelhado só nas falas marcadas
    bubble.classList.toggle('kimp-gesto', !!f.gesto);
    bubble.classList.toggle('kimp-lingua', !!f.lingua);
    elNome.textContent = p.nome;
    elTexto.textContent = textoFala; // mede o balão já com o texto inteiro
    posicionar(p);
    elTexto.textContent = '';
    requestAnimationFrame(() => bubble.classList.add('on'));
    digitar(textoFala);
  }

  function terminar() {
    clearInterval(_kurosakiImperioTyper);
    if (G.kurosaki.reuniaoAbates === undefined) G.kurosaki.reuniaoAbates = (G.player && G.player.kills) || 0;
    G.kurosaki.imperioReuniaoVista = true;
    ov.classList.add('kimp-out');
    setTimeout(() => {
      ov.remove();
      G._kurosakiCutscene = false;
      _kurosakiCasaRestaurarPainel();
      // ► PRÓXIMA PARTE DA HISTÓRIA entra aqui (depois da reunião)
      storyNode_cidade_kurosaki_entrada();
    }, 700);
  }

  ov.addEventListener('click', (e) => {
    if (e.target.id === 'kimp-pular') return terminar();
    if (digitando) { // completa a fala atual
      clearInterval(_kurosakiImperioTyper);
      digitando = false;
      _renderTexto(Array.from(textoAtual), Infinity);
      return;
    }
    proxima();
  });

  setTimeout(proxima, 900);
}

// ─────────────────────────────────────────────────────────────
//  8. NÚCLEO DE PEDRA — pop-up de lore ao tocar na pedra central
//     Reaproveita o overlay-padrão (mesmo estilo do showSeloInfo em
//     palDinh.js) — sem depender de CSS novo no gat-1.html.
//
//     ⚠️ TEXTO PLACEHOLDER: sua descrição por voz cortou no meio
//     ("...indica foi um...") e o resto não veio legível. Troque
//     _PEDRA_NUCLEO_TEXTO abaixo pela versão completa quando tiver —
//     e ajuste PEDRA_NUCLEO_KUROSAKI_CONFIG.X/Y se o pin não cair bem
//     em cima da pedra na sua tela (é só uma estimativa visual).
// ─────────────────────────────────────────────────────────────
const PEDRA_NUCLEO_KUROSAKI_CONFIG = { X: 50, Y: 50 };

const _PEDRA_NUCLEO_TEXTO = `Erguido no centro de Kurosaki, o núcleo de pedra domina a praça como se sempre tivesse estado ali. Faixas trançadas o cercam como um selo — não decoração, mas contenção. Ninguém na cidade fala dele em voz alta.`;

function _pedraNucleoOverlayGarantirDOM() {
  if (document.getElementById('pedra-nucleo-overlay')) return;
  const el = document.createElement('div');
  el.id = 'pedra-nucleo-overlay';
  el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.82);display:none;align-items:center;justify-content:center;z-index:9999;padding:20px;';
  el.onclick = (e) => { if (e.target === el) fecharInfoPedraNucleo(); };
  document.body.appendChild(el);
}

function mostrarInfoPedraNucleo() {
  _pedraNucleoOverlayGarantirDOM();
  const overlay = document.getElementById('pedra-nucleo-overlay');
  overlay.innerHTML = `
    <div style="background:#0f0a04;border:1px solid rgba(200,150,10,0.4);max-width:360px;width:100%;padding:0 0 20px;text-align:center;">
      <img src="Imagens/Cidade das pedras/kiuij.png" alt="Núcleo de Pedra" style="width:100%;display:block;" onerror="this.style.display='none';">
      <div style="font-family:'Noto Serif JP',serif;font-size:1rem;color:#f0c040;letter-spacing:1px;margin:14px 0 10px;">NÚCLEO DE PEDRA</div>
      <div style="font-size:0.8rem;color:rgba(255,255,255,0.8);line-height:1.7;text-align:left;padding:0 18px;">${_PEDRA_NUCLEO_TEXTO}</div>
      <button onclick="fecharInfoPedraNucleo()" style="margin-top:18px;background:transparent;border:1px solid rgba(200,150,10,0.4);color:rgba(200,150,10,0.7);padding:8px 22px;font-family:'Noto Serif JP',serif;font-size:0.68rem;letter-spacing:2px;cursor:pointer;">FECHAR</button>
    </div>
  `;
  overlay.style.display = 'flex';
}
window.mostrarInfoPedraNucleo = mostrarInfoPedraNucleo;

function fecharInfoPedraNucleo() {
  const overlay = document.getElementById('pedra-nucleo-overlay');
  if (overlay) overlay.style.display = 'none';
}
window.fecharInfoPedraNucleo = fecharInfoPedraNucleo;

// ─────────────────────────────────────────────────────────────
//  Runa Yu duplicada — conserto de save + diagnóstico
//  Mantém UMA Runa Yu (equipada > fortificada > com loreOculta >
//  primeira encontrada) e remove as cópias. Roda depois do loadGame
//  e sempre que a aba Selos é desenhada. Também avisa no console
//  (eruda) quando alguém tenta entregar a runa e o jogador já tem.
// ─────────────────────────────────────────────────────────────
(function () {
  'use strict';

  // Reconhece a Runa Yu pelo id, pelo nome ou pela imagem (cobre saves
  // antigos em que o id/nome do item guardado ficou diferente).
  function ehYu(s) {
    return !!s && (s.id === 'runa_yu' || /^runa yu/i.test(s.name || '') ||
      /runa_yu\.png|Picsart_26-07-06_19-13-05-694/.test(s.imgSrc || ''));
  }

  function dedupRunaYu() {
    try {
      // G é `let` no palDinh.js (não vira window.G) — checa pelo nome global.
      if (typeof G === 'undefined' || !G || !G.player) return 0;
      const p = G.player;
      const eq = p.selosEquipados || [], gu = p.selosGuardados || [], inv = p.inventory || [];
      const todas = [];
      eq.forEach(s => { if (ehYu(s)) todas.push({ s, lista: eq, eq: true }); });
      gu.forEach(s => { if (ehYu(s)) todas.push({ s, lista: gu, eq: false }); });
      inv.forEach(s => { if (ehYu(s)) todas.push({ s, lista: inv, eq: !!s.equipped }); });
      if (todas.length <= 1) return 0;

      const nota = x => (x.eq ? 4 : 0) + (x.s.fortificadoKurosaki ? 2 : 0) + (x.s.loreOculta ? 1 : 0);
      let manter = todas[0];
      todas.forEach(x => { if (nota(x) > nota(manter)) manter = x; });

      let removidas = 0;
      todas.forEach(x => {
        if (x === manter) return;
        const i = x.lista.indexOf(x.s);
        if (i !== -1) { x.lista.splice(i, 1); removidas++; }
      });
      if (removidas) { if (typeof updateHUD === 'function') updateHUD(); console.warn('[runa_yu_dedupe] ' + removidas + ' Runa(s) Yu duplicada(s) removida(s).'); }
      return removidas;
    } catch (e) { console.error('[runa_yu_dedupe]', e); return 0; }
  }
  window.dedupRunaYu = dedupRunaYu;

  // Depois de carregar um save
  if (typeof window.loadGame === 'function') {
    const _load = window.loadGame;
    window.loadGame = function () {
      const r = _load.apply(this, arguments);
      dedupRunaYu();
      return r;
    };
  }

  // Sempre que a aba Selos for desenhada
  if (typeof window.buildBolsaSelos === 'function') {
    const _build = window.buildBolsaSelos;
    window.buildBolsaSelos = function () {
      dedupRunaYu();
      return _build.apply(this, arguments);
    };
  }

  // Diagnóstico: quem tenta entregar a Runa Yu de novo?
  function vigia(nome, ehRunaYu) {
    const orig = window[nome];
    if (typeof orig !== 'function') return;
    window[nome] = function () {
      try {
        if (ehRunaYu.apply(null, arguments) && typeof window.playerPossuiRunaYu === 'function' && window.playerPossuiRunaYu()) {
          console.warn('[runa_yu_dedupe] ' + nome + ' chamada com a Runa Yu, mas o jogador JÁ tem uma.', new Error().stack);
        }
      } catch (e) {}
      return orig.apply(this, arguments);
    };
  }
  vigia('addItem', function (it) { return it && it.id === 'runa_yu'; });
  vigia('addSeloToBag', function (it) { return it && it.id === 'runa_yu'; });

  setTimeout(dedupRunaYu, 0);
})();
