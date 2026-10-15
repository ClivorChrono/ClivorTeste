// =============================================================
//  TERRA_ARANHAS.JS — Chronicles of Clivor
//  Masmorra 4 — O Ninho dos Fios Ilusórios (Rainha Aranha)
//  Local: Vila de Tsumugi (vila de tecelões, treino da Hiroto e do protagonista)
//  Arquivo separado, mesmo padrão de kappa_dungeon.js / inazami_completo.js
//  Depende de: palDinh.js (G, setScene, setStory, hideEnemy, notify,
//              addLog, updateHUD, saveGame, startBattle),
//              vilarejo.js (registerDungeon, storyNode_vilarejo),
//              multi_enemy_battle.js (startMultiEnemyBattle)
//
//  DESIGN (decidido):
//   • Curta: 3 fases, muitos inimigos (podem repetir), SEM drop.
//   • Boss final: Rainha Aranha + filho dela (outra aranha) batem ao
//     mesmo tempo — impossível vencer sozinho.
//   • A Hiroto luta contra o filho numa luta paralela 100% aleatória
//     (5+ eventos, ~8 de 10 vitórias). Isso fica em bracoDireito.js.
//   • Ao concluir: G.aranhas.dungeonAranhasCompleta = true e
//     G.dungeonAranhasCleared = true → libera o sistema Braço Direito.
//   • Entrada exige o Cristal de Elo, mas o jogo NÃO diz isso
//     claramente (texto formal/sutil).
//
//  STATUS: intro, trava, chegada, Ygirro, treino, conversas e o
//  puzzle do selo (A Lança de Sino) prontos.
//  Fase 1 (gêmeos Itsuki/Kumiko + núcleo, até o ataque à criatura) escrita;
//  resgate do Tsuiro, falas da Tsumugi e boss Tsumugi (2 formas) escritos;
//  Olhar da Tsumugi (efeito haki) e Kagerō (3º filho, luta da Hiroto) prontos;
//  Final pós-Rainha (revelação do casulo vazio, resgate do Ygirro e do Tsuiro,
//  casa do Ygirro) pronto; gancho window.aranhasEscolherArmadura(cb) reservado.
//  Recompensas/armaduras: TODO.
// =============================================================

'use strict';

// ─────────────────────────────────────────────────────────────
//  ESTADO
// ─────────────────────────────────────────────────────────────

// ⚠ MODO TESTE: masmorra aberta e sem exigir Cristal de Elo.
// Quando terminar os testes, troque para false.
const ARANHAS_MODO_TESTE = true;

// Imagens usadas nos pop-ups e na Torre
const ARANHAS_ICONE_TORRE  = 'Imagens/icones/medalhyru7.png';          // ícone do card da Masmorra 4 na Torre das Masmorras
const ARANHAS_FUNDO_FORMA2 = 'Imagens/Vila de Tsumugi/tsuru878.png';   // plano de fundo do pop-up "A SEGUNDA FORMA"
const ARANHAS_ICONE_ESCALA = 0.86;   // tamanho do ícone dentro do card da Torre (1 = preenche tudo; menor = mais margem, como os outros ícones)

// O card da Torre desenha o ícone encostado nas bordas; os outros ícones são medalhões redondos com margem.
// Pra não mexer no código da Torre, o ajuste é feito por CSS, só nessa imagem (achada pelo nome do arquivo).
(function _aranhasIconeTorreCss() {
  if (document.getElementById('aranhas-icone-torre-css')) return;
  const st = document.createElement('style');
  st.id = 'aranhas-icone-torre-css';
  st.textContent = 'img[src*="medalhyru7"] { border-radius:50% !important; transform:scale(' + ARANHAS_ICONE_ESCALA + ') !important; transform-origin:center; }';
  document.head.appendChild(st);
})();

// Baú do Ygirro (recompensa da masmorra). Registrado aqui no ITEM_DB, então o palDinh.js não precisa mudar.
// Abre pela Bolsa como os outros baús (type:'bau'). lootTable VAZIA de propósito: o conteúdo
// (armaduras por classe) será definido depois. Troque a imagem em ARANHAS_BAU_IMG quando tiver a arte.
const ARANHAS_BAU_IMG = 'Imagens/icones/materiais/BauS.png';
// Armadura que o Baú do Ygirro dá, por classe. Por enquanto só o Paladino; as outras 3 classes
// ainda estão em definição (o baú delas abre vazio até entrarem aqui).
const ARANHAS_BAU_ARMADURA = {
  paladino: 'peitoral_vale_sem_fim',
  // mago: '...', assassino: '...', arqueiro: '...'   ← TODO
};

// Antes de abrir o baú pela Bolsa, preenche o conteúdo de acordo com a classe do jogador.
(function _aranhasBauPorClasse() {
  function instala() {
    if (typeof useInventoryItem !== 'function') { setTimeout(instala, 200); return; }
    if (window._aranhasBauWrapped) return;
    window._aranhasBauWrapped = true;
    const _orig = useInventoryItem;
    window.useInventoryItem = function (idx) {
      try {
        const item = G.player && G.player.inventory && G.player.inventory[idx];
        if (item && item.id === 'bau_ygirro') {
          const cls = G.player.classData && G.player.classData.id;
          const arm = ARANHAS_BAU_ARMADURA[cls];
          if (arm && typeof ITEM_DB !== 'undefined' && !ITEM_DB[arm]) {
            if (typeof notify === 'function') notify('⚠ A armadura do baú não foi carregada (falta o peitorais_classe.js no gat-1.html).', 'red');
            return;                                   // não gasta o baú
          }
          item.lootTable = arm ? [{ id: arm, qty: 1 }] : [];
        }
      } catch (e) { console.error('[Masmorra 4] baú por classe', e); }
      return _orig(idx);
    };
  }
  instala();
})();

(function _aranhasRegistrarBau() {
  function reg() {
    if (typeof ITEM_DB === 'undefined') { setTimeout(reg, 200); return; }
    if (ITEM_DB.bau_ygirro) return;
    ITEM_DB.bau_ygirro = {
      name: 'Baú do Ygirro', icon: '🎁', imgSrc: ARANHAS_BAU_IMG, type: 'bau',
      desc: 'Um baú de madeira escura, atado com fios de seda cortados. Pertenceu ao pai do Ygirro, que o guardou até alguém merecer abri-lo.',
      lootTable: [],   // preenchida na hora de abrir, conforme a classe (ver ARANHAS_BAU_ARMADURA)
      lootGold: 0,
      weight: 1.5,
    };
  }
  reg();
})();

function _aranhasInit() {
  if (!G.aranhas) {
    G.aranhas = {
      fase: 0,                    // 0 = fora, 1..3 = fases, 4 = boss
      ondas: 0,                   // contador de ondas da fase atual
      dungeonAranhasCompleta: false,
      seloAberto: false,          // 1º puzzle (selo da caverna) já resolvido?
    };
  }
  return G.aranhas;
}

function _aranhasTemCristalElo() {
  const inv = (G.player && G.player.inventory) || [];
  return ARANHAS_MODO_TESTE || inv.some(i => i && i.id === 'cristal_elo');
}

function _aranhasLiberada() {
  // Libera quando a masmorra 3 (Inazami) foi concluída.
  return ARANHAS_MODO_TESTE || !!(typeof G !== 'undefined' && G.inazami && G.inazami.dungeonInazamiCompleta);
}

// ─────────────────────────────────────────────────────────────
//  CENÁRIOS (plano de fundo próprio, sem depender do CSS do gat-1.html)
//  O setScene() só conhece os cenários que ele mesmo registra: pra um
//  nome novo ele mostra o rótulo, mas cai no fundo padrão. Então aqui a
//  gente chama o setScene e, logo depois, aplica o fundo por uma regra
//  CSS injetada (classe .aranhas-vila, com !important).
//  Se a imagem não carregar, volta pro fundo da caverna e avisa no console.
// ─────────────────────────────────────────────────────────────

const ARANHAS_CENAS = {
  'aranhas-vila': { img: 'Imagens/Vila de Tsumugi/vilaYumhu.png', rotulo: 'VILA DE TSUMUGI' },
  // Fundo provisório: caverna do Kappa, até chegar a imagem própria da entrada da caverna.
  'aranhas-caverna': { img: 'Imagens/KappaMasmorra/cavernaE.png', rotulo: 'O NINHO DOS FIOS ILUSÓRIOS' },
  // Entrada da caverna: imagem 8 (cachoeira + teia com a parte azul) e imagem 9 (a "porta" com o selo)
  'aranhas-frente': { img: 'Imagens/Vila de Tsumugi/santuario.png', rotulo: 'ENTRADA DA CAVERNA' },
  'aranhas-porta':  { img: 'Imagens/Vila de Tsumugi/seloTsu.png',            rotulo: 'ENTRADA DA CAVERNA' },
  'aranhas-ts1': { img: 'Imagens/Vila de Tsumugi/Ts1.png', rotulo: 'O NINHO DOS FIOS ILUSÓRIOS' },
  'aranhas-ts2': { img: 'Imagens/Vila de Tsumugi/Ts2.png', rotulo: 'CORREDOR DE TEIAS DOURADAS' },
  // Núcleo do ninho (base da Tsumugi): imagem ainda a definir. Troque o caminho quando tiver a arte.
  'aranhas-nucleo': { img: 'Imagens/Vila de Tsumugi/fundonov.png', rotulo: 'NÚCLEO DO NINHO' }, // provisório: o Ts3.png não existe na pasta
  // Cenas do resgate do Tsuiro e do encontro com a Tsumugi
  'aranhas-teia':   { img: 'Imagens/Vila de Tsumugi/teiaamarr.png', rotulo: 'NÚCLEO DO NINHO' },   // Tsuiro preso nas teias
  'aranhas-solto':  { img: 'Imagens/Vila de Tsumugi/soltouyu.png',  rotulo: 'NÚCLEO DO NINHO' },   // depois de cortar as teias
  'aranhas-trono':  { img: 'Imagens/Vila de Tsumugi/fundonov.png',  rotulo: 'O TRONO DA RAINHA' }, // diálogo e luta com a Tsumugi
  // Final da masmorra: casa do Ygirro (o protagonista leva pai e filho pra lá depois da Rainha)
  'aranhas-casa':   { img: 'Imagens/Vila de Tsumugi/casaYgirr.png', rotulo: 'CASA DO YGIRRO' },
};
let _aranhasCenaAtual = null;

function _aranhasInjetaCss() {
  let st = document.getElementById('aranhas-cenas-style');
  if (!st) { st = document.createElement('style'); st.id = 'aranhas-cenas-style'; document.head.appendChild(st); }
  st.textContent = Object.keys(ARANHAS_CENAS).map(function (k) {
    return ".scene-bg." + k + " { background-image:url('" + ARANHAS_CENAS[k].img + "') !important; " +
           "background-size:cover !important; background-position:center !important; background-repeat:no-repeat !important; " +
           "background-color:#120c08; filter:none !important; }";
  }).join('\n');
}

// ─────────────────────────────────────────────────────────────
//  HOTSPOT (área tocável em cima da imagem)
//  Posição em FRAÇÃO da imagem (fx, fy = centro; fw = largura), recalculada
//  com a mesma conta do background-size:cover, então acerta a parte azul
//  em qualquer tamanho de tela. As imagens são quadradas (1:1).
// ─────────────────────────────────────────────────────────────
let _aranhasHotspot = null;
let _aranhasHotspotObs = null;

function _aranhasRemoveHotspot() {
  if (_aranhasHotspot) {
    if (_aranhasHotspot._reflow) window.removeEventListener('resize', _aranhasHotspot._reflow);
    _aranhasHotspot.remove();
    _aranhasHotspot = null;
  }
  const velho = document.getElementById('aranhas-hotspot');
  if (velho) velho.remove();
  if (_aranhasHotspotObs) { _aranhasHotspotObs.disconnect(); _aranhasHotspotObs = null; }
}

function _aranhasCriaHotspot(cfg) {
  // cfg: { cena, fx, fy, fw, rotulo, aoTocar }
  _aranhasRemoveHotspot();
  const bg = document.getElementById('scene-bg');
  if (!bg || !bg.parentNode) return;
  if (!document.getElementById('aranhas-hotspot-style')) {
    const st = document.createElement('style');
    st.id = 'aranhas-hotspot-style';
    st.textContent = `
      #aranhas-hotspot { position:absolute; z-index:6; transform:translate(-50%,-50%); border-radius:50%;
        cursor:pointer; background:radial-gradient(circle, rgba(120,180,255,.28) 0%, rgba(120,180,255,.10) 55%, rgba(120,180,255,0) 72%);
        border:1px solid rgba(160,200,255,.45); box-shadow:0 0 22px rgba(90,150,255,.55);
        animation:aranhasHot 1.8s ease-in-out infinite; -webkit-tap-highlight-color:transparent; padding:0; }
      @keyframes aranhasHot { 0%,100%{ opacity:.55; transform:translate(-50%,-50%) scale(.94); }
                              50%{ opacity:1; transform:translate(-50%,-50%) scale(1.06); } }
      @media (prefers-reduced-motion:reduce) { #aranhas-hotspot { animation:none; opacity:.85; } }
    `;
    document.head.appendChild(st);
  }
  const el = document.createElement('button');
  el.id = 'aranhas-hotspot';
  el.type = 'button';
  el.setAttribute('aria-label', cfg.rotulo || 'Tocar');
  el.onclick = function (ev) {
    if (ev && ev.stopPropagation) ev.stopPropagation();
    if (_aranhasCenaAtual !== cfg.cena) return;
    _aranhasRemoveHotspot();
    cfg.aoTocar();
  };
  bg.parentNode.appendChild(el);
  _aranhasHotspot = el;

  // mesma conta do background-size:cover com background-position:center
  const posiciona = function () {
    const W = bg.clientWidth, H = bg.clientHeight;
    if (!W || !H) return;
    const lado = Math.max(W, H);                 // imagem quadrada coberta: lado = maior dimensão
    const offX = (lado - W) / 2, offY = (lado - H) / 2;
    el.style.left   = (cfg.fx * lado - offX) + 'px';
    el.style.top    = (cfg.fy * lado - offY) + 'px';
    el.style.width  = (cfg.fw * lado) + 'px';
    el.style.height = (cfg.fw * lado) + 'px';
  };
  posiciona();
  setTimeout(posiciona, 150);                    // depois do layout assentar
  el._reflow = posiciona;
  window.addEventListener('resize', posiciona);

  // se a cena mudar por qualquer outro caminho, o hotspot some junto
  if (typeof MutationObserver === 'function') {
    _aranhasHotspotObs = new MutationObserver(function () {
      if (!bg.classList.contains(cfg.cena)) _aranhasRemoveHotspot();
    });
    _aranhasHotspotObs.observe(bg, { attributes: true, attributeFilter: ['class'] });
  }
}

function _aranhasCena(nome) {
  _aranhasRemoveHotspot();
  if (typeof _aranhasRemoveMapa === 'function') _aranhasRemoveMapa();
  setScene(nome);
  const cfg = ARANHAS_CENAS[nome];
  _aranhasCenaAtual = cfg ? nome : null;
  _aranhasMapaRegistrar(nome);
  if (!cfg) return;
  _aranhasInjetaCss();
  let falhou = false;
  const aplicar = function (primeira) {
    if (falhou || _aranhasCenaAtual !== nome) return;   // imagem falhou ou já mudou de cena
    const rot = document.getElementById('location-name');
    if (!primeira && rot && rot.textContent !== cfg.rotulo && rot.textContent !== nome.toUpperCase()) {
      return;                                        // outra cena assumiu o cabeçalho: não mexe
    }
    const bg = document.getElementById('scene-bg');
    if (bg && !bg.classList.contains(nome)) bg.classList.add(nome);
    if (rot && cfg.rotulo) rot.textContent = cfg.rotulo;
  };
  aplicar(true);
  setTimeout(aplicar, 120);   // caso o setScene aplique o fundo com atraso (transição)
  setTimeout(aplicar, 600);
  // se a imagem não existir/carregar, não deixa a cena em branco
  const teste = new Image();
  teste.onerror = function () {
    falhou = true;
    console.error('[Masmorra 4] Não consegui carregar o fundo:', cfg.img,
      '— confira o caminho e as maiúsculas/minúsculas (pasta "Imagens/Vila de Tsumugi/").');
    const bg = document.getElementById('scene-bg');
    if (bg && _aranhasCenaAtual === nome) { bg.classList.remove(nome); bg.classList.add('aranhas-ts1'); }   // reserva: Ts1 (da própria masmorra), nunca a caverna do Kappa
  };
  teste.src = cfg.img;
}

// ─────────────────────────────────────────────────────────────
//  REGISTRO NA TORRE DAS MASMORRAS
// ─────────────────────────────────────────────────────────────

(function _registerAranhas() {
  function _doRegister() {
    if (typeof registerDungeon !== 'function') {
      setTimeout(_doRegister, 200); return;
    }
    registerDungeon({
      id:        'terra_aranhas',
      ordem:     4,
      nome:      'O Ninho dos Fios Ilusórios',
      bossNome:  'Rainha Aranha',
      bossIcon:  ARANHAS_ICONE_TORRE,
      get descricao() {
        return _aranhasLiberada()
          ? 'A Vila de Tsumugi encolheu em silêncio. Aldeões que caminham sorrindo rumo a uma caverna. E fios que ninguém consegue ver.'
          : 'Conclua a Masmorra Inazami para revelar este lugar.';
      },
      get status() {
        return _aranhasLiberada() ? 'ativa' : 'bloqueada';
      },
      stats: [
        { label: 'Dificuldade', value: '★★★★★' },
        { label: 'Recompensa',  value: 'Um novo vínculo' },
      ],
      entrar: storyNode_aranhas_intro,
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _doRegister);
  } else {
    _doRegister();
  }
})();

// ─────────────────────────────────────────────────────────────
//  INTRODUÇÃO + TRAVA (sutil, sem dizer "precisa do Cristal de Elo")
// ─────────────────────────────────────────────────────────────

function storyNode_aranhas_intro() {
  _aranhasInit();
  _aranhasCenaAtual = null;
  // TODO: trocar 'kappa-caverna' pelo cenário próprio das aranhas
  _aranhasCena('aranhas-caverna');
  hideEnemy();

  if (!_aranhasTemCristalElo()) {
    return setStory(
      'NARRADOR',
      `Os fios de seda cobrem a entrada da caverna de parede a parede, tensos como cordas de um instrumento.\n\nVocê toca um deles. Ele vibra... e se recolhe, como quem recusa.\n\nAlgo nesta passagem responde a um vínculo que você ainda não carrega.`,
      [
        { icon:'🏘️', text:'Voltar ao vilarejo', action: () => {
            G.location = 'vilarejo';
            if (typeof storyNode_vilarejo === 'function') storyNode_vilarejo();
        } },
      ]
    );
  }

  storyNode_aranhas_chegada();
}

// ─────────────────────────────────────────────────────────────
//  HISTÓRIA — Chegada ao vilarejo (Hiroto + protagonista)
//  Nomes de falante: 'HIROTO', 'YGIRRO'. O protagonista fala com o
//  nome do próprio personagem (G.player.name), qualquer classe.
//  TODO: passar retratos no 4º argumento do setStory (Hiroto/Ygirro)
// ─────────────────────────────────────────────────────────────

function _aranhasNomeHeroi() {
  return (G.player && G.player.name) ? String(G.player.name).toUpperCase() : 'VOCÊ';
}

// Pequena variação por classe pro treino (sem mudar o fluxo)
const ARANHAS_TREINO_CLASSE = {
  guerreiro: 'Você firma os pés e descarrega golpe atrás de golpe, até o antebraço queimar.',
  paladino:  'Você aprende a segurar a linha: cada estocada de Ygirro quebra contra a sua guarda, e cada quebra ensina onde ela cede.',
  monge:     'Você troca a força pelo ritmo: respiração, passo, soco. Ygirro corrige a sua postura com a haste da lança.',
  assassino: 'Você entra e sai do alcance da lança em um piscar, e descobre que Ygirro já estava esperando a sua saída.',
  arqueiro:  'Você atira de longe e cada flecha é desviada pelo giro da lança. Ele manda você encurtar a distância.',
  mago:      'Você conjura sob pressão enquanto a lança corta o ar a um palmo do seu rosto. Concentrar assim ensina rápido.',
};

function storyNode_aranhas_chegada() {
  _aranhasCena('aranhas-vila'); // TODO: cenário próprio do vilarejo
  hideEnemy();
  setStory(
    'NARRADOR',
    `Vocês deixaram a Cidade das Pedras faz dois dias. O império exige guerreiros cada vez mais fortes, e a cidade não tem espaço pra treinar a sério.\n\nHiroto, Capitã da 2ª Divisão de Eirik, caminha na frente. Quando a Vila de Tsumugi surge no fim da estrada, com o nome gravado numa placa de madeira gasta, ela desacelera.\n\nPortas fechadas. Hortas sem dono. Nenhuma criança na rua.\n\nNo núcleo do Cristal de Elo, a luz oscila, como se reagisse ao silêncio.`,
    [
      { icon:'▶', text:'Entrar no vilarejo', action: storyNode_aranhas_chegada2 },
    ]
  );
}

function storyNode_aranhas_chegada2() {
  _aranhasCena('aranhas-vila');
  hideEnemy();
  setStory(
    'HIROTO',
    `\"Estranho. Da última vez que passei por aqui, essa rua era cheia de gente.\"\n\nEla tira a mão do cabo da arma devagar, sem tirar os olhos das janelas.\n\n\"Procuramos espaço pra treinar. Se tiver alguém vivo aqui, é a pessoa certa pra pedir.\"\n\nAo fundo, o som seco de madeira batendo em madeira. Alguém treina sozinho.`,
    [
      { icon:'🔊', text:'Seguir o som', action: storyNode_aranhas_ygirro1 },
    ]
  );
}

// ── Ygirro, o Mestre de Lanças ───────────────────────────────

function storyNode_aranhas_ygirro1() {
  _aranhasCena('aranhas-vila');
  hideEnemy();
  setStory(
    'NARRADOR',
    `Atrás de uma casa torta, um terreno largo de terra batida. No centro, um homem de ombros largos e cabelo cinza repete uma estocada contra um poste de treino. Sempre a mesma. Sempre perfeita.\n\nEle para no meio do movimento antes de vocês dizerem uma palavra.\n\n\"Quem está aí?\"`,
    [
      { icon:'▶', text:'Apresentar-se', action: storyNode_aranhas_ygirro2 },
    ]
  );
}

function storyNode_aranhas_ygirro2() {
  _aranhasCena('aranhas-vila');
  hideEnemy();
  setStory(
    'YGIRRO',
    `O homem se vira. Olha para você. Olha para Hiroto. Demora no rosto dela.\n\n\"...Esse queixo. Esse jeito de pisar.\" Ele solta o ar pelo nariz. \"Você é a filha dele.\"\n\n\"Mestre Ygirro.\" Hiroto inclina a cabeça, mais fundo do que costuma fazer diante de qualquer um. \"O senhor ainda lembra.\"\n\n\"Seu pai me deu o pior hematoma da minha vida num treino de lanças. Não se esquece uma coisa dessas.\"`,
    [
      { icon:'▶', text:'Continuar', action: storyNode_aranhas_ygirro3 },
    ]
  );
}

function storyNode_aranhas_ygirro3() {
  _aranhasCena('aranhas-vila');
  hideEnemy();
  setStory(
    'HIROTO',
    `Ela se vira pra você.\n\n\"Ygirro treinou com o meu pai quando os dois eram jovens. Foi ele quem me ensinou a segurar uma lança pela primeira vez, antes de eu saber andar direito.\"\n\n\"Fazia anos que eu não vinha. Achei que o terreno já tivesse virado mato.\"\n\nYgirro dá de ombros. \"Alguém tinha que manter o chão limpo.\"`,
    [
      { icon:'▶', text:'Pedir o terreno emprestado', action: storyNode_aranhas_ygirro4 },
    ]
  );
}

function storyNode_aranhas_ygirro4() {
  _aranhasCena('aranhas-vila');
  hideEnemy();
  const nome = _aranhasNomeHeroi();
  setStory(
    nome,
    `\"Viemos treinar. O império exige mais a cada ano e a gente precisa de um lugar sem ninguém pra atrapalhar.\"\n\nYgirro te mede de cima a baixo, sem pressa. Seu olhar passa pelo Cristal de Elo preso ao seu cinto e fica ali um instante a mais.\n\n\"Sem ninguém pra atrapalhar, é isso que não falta por aqui.\" Ele aponta o terreno com o queixo. \"É de vocês enquanto quiserem. Mas não reclamem se eu corrigir o que vir de errado.\"\n\n\"Vai corrigir mesmo?\", pergunta Hiroto, quase sorrindo.\n\n\"Vou. Sua guarda está aberta desde a hora em que você entrou.\"`,
    [
      { icon:'⚔️', text:'Começar o treino', action: storyNode_aranhas_treino1 },
    ]
  );
}

// ── Treino + conversas nos intervalos ────────────────────────

function storyNode_aranhas_treino1() {
  _aranhasCena('aranhas-vila');
  hideEnemy();
  const cls = (G.player && G.player.class) || 'guerreiro';
  const linhaClasse = ARANHAS_TREINO_CLASSE[cls] || ARANHAS_TREINO_CLASSE['guerreiro'];
  setStory(
    'NARRADOR',
    `A primeira rodada de treino começa de manhã e só termina quando o sol já passa do meio do céu.\n\n${linhaClasse}\n\nHiroto luta no limite do terreno, em duelo com o próprio Ygirro. Ela é rápida, precisa e mais forte do que você lembrava, mas ele a empurra de volta cada vez que ela pensa estar na frente.\n\nNo fim, os três param ao mesmo tempo, ofegantes.`,
    [
      { icon:'💧', text:'Descansar um pouco', action: storyNode_aranhas_conversa1 },
    ]
  );
}

function storyNode_aranhas_conversa1() {
  _aranhasCena('aranhas-vila');
  hideEnemy();
  setStory(
    'HIROTO',
    `Vocês se sentam na sombra do poste de treino. Ygirro vai buscar água e demora.\n\n\"Ele ficou mais velho,\" ela diz baixo. \"Mas a estocada continua a mesma de quando eu era criança.\"\n\nUm silêncio curto.\n\n\"Eirik não voltou pra cidade depois da reunião dos três governantes. Ninguém explica. Enquanto isso o império aperta e quer soldados mais fortes. Eu preciso ficar pronta pra qualquer coisa. E você também.\"\n\nEla olha de lado pro cristal no seu cinto. \"Ele está mais quente quando estou perto, né?\"`,
    [
      { icon:'💠', text:'Admitir que sim', action: storyNode_aranhas_conversa2 },
    ]
  );
}

function storyNode_aranhas_conversa2() {
  _aranhasCena('aranhas-vila');
  hideEnemy();
  setStory(
    'YGIRRO',
    `Ygirro volta com a água e um pano molhado. Joga o pano na sua cara sem cerimônia.\n\n\"A sua postura pende pra esquerda quando você cansa. Conserte isso, ou o primeiro inimigo de verdade vai achar o seu lado fraco em dois golpes.\"\n\nEle se vira pra Hiroto. \"E você está tentando provar algo pro seu pai que ele nunca pediu. Luta pra você, não pra ele.\"\n\nHiroto ri pelo nariz, sem argumentar. É a primeira vez que você a vê calada depois de uma correção.`,
    [
      { icon:'⚔️', text:'Segunda rodada de treino', action: storyNode_aranhas_treino2 },
    ]
  );
}

function storyNode_aranhas_treino2() {
  _aranhasCena('aranhas-vila');
  hideEnemy();
  setStory(
    'NARRADOR',
    `Treinam até a luz ficar laranja. Ygirro ajusta o seu pé, o seu ombro, o seu fôlego. Hiroto e você trocam de lado no duelo e descobrem que se leem melhor a cada rodada, como se o cristal ajudasse a adivinhar o próximo passo um do outro.\n\nQuando por fim as armas descem, o estômago de alguém ronca alto.`,
    [
      { icon:'🍚', text:'Sugerir sair pra comer', action: storyNode_aranhas_comida },
    ]
  );
}

// ── A comida: Ygirro foge do assunto ─────────────────────────

function storyNode_aranhas_comida() {
  _aranhasCena('aranhas-vila');
  hideEnemy();
  const nome = _aranhasNomeHeroi();
  setStory(
    nome,
    `\"Tem alguma casa de comida por aqui? Depois de um dia assim, eu comeria qualquer coisa.\"\n\nYgirro, que enrolava uma faixa na mão, para de enrolar.\n\n\"Não tem.\"\n\n\"Nenhuma?\", pergunta Hiroto. \"Eu me lembro de uma estalagem aqui na entrada. Servia um ensopado que...\"\n\n\"Fechada.\" Ele nem olha pra ela. \"Todas as lojas estão fechadas. Por tempo indeterminado.\"`,
    [
      { icon:'🤔', text:'Perguntar o motivo', action: storyNode_aranhas_comida2 },
    ]
  );
}

function storyNode_aranhas_comida2() {
  _aranhasCena('aranhas-vila');
  hideEnemy();
  setStory(
    'YGIRRO',
    `\"O motivo é problema meu e dos poucos que sobraram.\" A voz sai áspera, rápida demais. \"Treinem o quanto quiserem. Dormem no galpão atrás da casa. Tem arroz e peixe seco na despensa. Mas não perguntem de lojas.\"\n\nHiroto franze a testa. Você vê o seu dedo se fechar devagar na empunhadura.\n\n\"Mestre... quando eu cheguei, as ruas estavam vazias.\"\n\n\"Eu disse que não vou falar disso.\"\n\nEle vira de costas e entra em casa. A porta bate. Pela fresta, antes de fechar, você percebe que ele olhou para a direção da caverna, e depois desviou o olhar como quem se queima.`,
    [
      { icon:'🌆', text:'Deixar o assunto de lado (por ora)', action: storyNode_aranhas_tsuiro1 },
    ]
  );
}

// ── Tsuiro, filho de Ygirro, o Desperto ──────────────────────
// Sem lojas abertas, quem alimenta o grupo é Tsuiro: ele caça e pesca.

function storyNode_aranhas_tsuiro1() {
  _aranhasCena('aranhas-vila'); // TODO: cenário próprio
  hideEnemy();
  setStory(
    'NARRADOR',
    `Sem estalagem aberta, o jantar parece perdido. Quando a luz vai embora, alguém empurra a porta do galpão com o ombro.\n\nUm rapaz entra carregando um cesto cheio de peixes e uma lebre pendurada no cinto. Magro, queimado de sol, com os mesmos olhos estreitos do mestre de lanças.\n\n\"Então vocês são os visitantes. Meu pai disse que tinha gente no terreno.\"\n\nEle ri sem jeito, apoiando o cesto no chão.`,
    [
      { icon:'▶', text:'Perguntar quem é', action: storyNode_aranhas_tsuiro2 },
    ]
  );
}

function storyNode_aranhas_tsuiro2() {
  _aranhasCena('aranhas-vila');
  hideEnemy();
  setStory(
    'TSUIRO',
    `\"Tsuiro. Sou filho do Ygirro.\" Ele aponta pra cabeça, brincando. \"Puxei o queixo duro dele, mas o resto é da minha mãe.\"\n\nHiroto estreita os olhos. \"Você é aquele garoto que eu vi uma vez de colo?\"\n\n\"Provavelmente. Eu era chorão.\" Ele já está limpando um peixe com uma faca pequena. \"Como não tem onde comprar comida, eu pesco no rio e caço na mata. Deixa que eu cuido do jantar. Meu pai não vai tocar no assunto, mas eu sei que ele ficou sem jeito de não oferecer nada.\"`,
    [
      { icon:'🍲', text:'Ajudar com o jantar', action: storyNode_aranhas_tsuiro3 },
    ]
  );
}

function storyNode_aranhas_tsuiro3() {
  _aranhasCena('aranhas-vila');
  hideEnemy();
  const nome = _aranhasNomeHeroi();
  setStory(
    nome,
    `A fogueira estala. Hiroto conta uma história do tempo em que treinava aqui; Tsuiro ri nos lugares certos e pergunta como é a vida na Divisão, como é a Cidade das Pedras, como é lutar de verdade.\n\n\"Vocês vão ficar quanto tempo?\"\n\n\"O suficiente pra ficar mais fortes,\" responde Hiroto.\n\nTsuiro mexe na brasa com um graveto. \"Que sorte. Eu queria muito poder sair daqui e treinar com alguém assim.\" Ele hesita. \"Só que eu não posso deixar o meu pai sozinho. Ele não admite, mas está cansado.\"\n\nVocê percebe que ele repara em tudo: nas casas fechadas, nas luzes que ficam menos a cada noite. E percebe que ele não diz nada sobre isso.`,
    [
      { icon:'🌆', text:'Sair pra ver a noite', action: storyNode_aranhas_cenario },
    ]
  );
}

// ── Anoitecer: o ritual (Tsuiro é o único que enxerga) ───────

function storyNode_aranhas_cenario() {
  _aranhasCena('aranhas-vila'); // TODO: cenário próprio
  hideEnemy();
  setStory(
    'NARRADOR',
    `Depois do jantar, vocês saem pra respirar. Uma pequena fila de aldeões caminha devagar rumo à caverna, sorrindo.\n\n\"Hoje é dia do ritual de fortalecimento,\" diz um deles, sem desviar os olhos da entrada. \"Quem entra sai mais forte. Todos dizem isso.\"\n\nTsuiro está parado ao lado, os braços cruzados, o olhar fixo nos aldeões. Você não vê nada de errado. Ele vê.\n\nNo núcleo do Cristal de Elo, a luz oscila. Cansados do treino, vocês voltam pro galpão.`,
    [
      { icon:'🌙', text:'Dormir', action: storyNode_aranhas_noite_tsuiro },
    ]
  );
}

// A partir daqui a cena é do ponto de vista do Tsuiro.
function storyNode_aranhas_noite_tsuiro() {
  _aranhasCena('aranhas-vila');
  hideEnemy();
  setStory(
    'NARRADOR',
    `Tsuiro não consegue dormir.\n\nDe pé na janela da casa do pai, ele vê a rua em silêncio. E então vê os guardas: dois vultos magros, de pernas longas demais, andando de lado pela vila.\n\nHoje não há procissão calma. Eles arrombam uma porta e arrastam um morador pela gola. O homem não grita. Os olhos dele estão abertos e vazios, sorrindo, mas as pernas se debatem como se o corpo soubesse o que a mente não sabe.\n\nTsuiro sente a garganta apertar. Ele vê, finalmente, aquilo que nunca soube explicar: fios finos como cabelo, brilhando de leve, presos nas costas do homem e subindo até a escuridão.`,
    [
      { icon:'👁️', text:'Ver os fios', action: storyNode_aranhas_noite_tsuiro2 },
    ]
  );
}

function storyNode_aranhas_noite_tsuiro2() {
  _aranhasCena('aranhas-vila');
  hideEnemy();
  setStory(
    'TSUIRO',
    `\"Não existe ritual nenhum.\"\n\nO sussurro quase não sai. Todo mundo que ele viu sumir, um por um, nunca voltou mais forte. Voltou nunca.\n\nEle olha pro quarto do pai. Pensa em acordar o velho. Pensa no que Ygirro faria: se atiraria sozinho contra a caverna, e não voltaria.\n\n\"Eu não vou deixar o senhor ir. Não dessa vez.\"\n\nEle pega a lança curta que fica atrás da porta, a que o pai ensinou a segurar. Sai de mansinho, de pé descalço, atrás do guarda e do homem que ele arrasta.`,
    [
      { icon:'🕸️', text:'Acompanhar Tsuiro', action: storyNode_aranhas_rainha_popup },
    ]
  );
}

// ── Pop-up da Rainha tecendo (tela cheia; tocar volta ao vilarejo) ──

function storyNode_aranhas_rainha_popup() {
  _aranhasPopupTelaCheia({
    titulo: 'NO FUNDO DA CAVERNA',
    texto: `No coração da caverna, a Rainha Aranha tece.\n\nSeus dedos finos puxam centenas de fios, cada um ligado a uma mente da vila. Ela os afina como cordas de um instrumento, e os aldeões sorriem em seus sonos.\n\nO ventre pesa. O terceiro filho já está quase pronto, e a fome é maior que a paciência.\n\n\"Vagarosos demais,\" ela murmura. \"Se não vêm por vontade, virão por força.\"\n\nUm dos fios vibra. Alguém acabou de ver através dele.`,
    dica: 'Toque para voltar ao vilarejo',
    aoFechar: storyNode_aranhas_vila_volta,
  });
}

function storyNode_aranhas_vila_volta() {
  _aranhasCena('aranhas-vila');
  hideEnemy();
  setStory(
    'NARRADOR',
    `De volta ao vilarejo, a rua está vazia outra vez.\n\nO guarda e o homem já sumiram na curva do caminho para a caverna. Atrás deles, uma sombra pequena, com uma lança curta na mão, se afasta da casa de Ygirro sem fazer barulho.\n\nNo galpão, o Cristal de Elo esquenta de repente contra o seu cinto. Algo, em algum lugar, acabou de se mover.`,
    [
      { icon:'🌅', text:'Esperar o amanhecer', action: storyNode_aranhas_manha1 },
    ]
  );
}

// ─────────────────────────────────────────────────────────────
//  O RESGATE E A INVASÃO (A Decisão)
//  Ygirro descobre o sumiço do filho, tenta mandar o grupo embora,
//  o grupo recusa, a verdade vem à tona e os três partem juntos.
//  Depois disso a masmorra começa de verdade (fase 1).
// ─────────────────────────────────────────────────────────────

function storyNode_aranhas_manha1() {
  _aranhasCena('aranhas-vila');
  hideEnemy();
  setStory(
    'NARRADOR',
    `O amanhecer chega cinzento. Ainda no escuro do galpão, vocês ouvem passos pesados do outro lado do terreno, depois silêncio, depois um som baixo de madeira sendo arrastada.\n\nPela fresta da porta, você vê Ygirro parado diante do quarto do filho. A cama está arrumada. O prego atrás da porta, onde ficava a lança curta, está vazio.\n\nEle não grita. Não xinga. Fica tão imóvel que parece ter parado de respirar. Então se vira em direção à caverna, ao longe, e a mão grande se fecha em volta do pano que usava pra enrolar a faixa.`,
    [
      { icon:'👀', text:'Observar em silêncio', action: storyNode_aranhas_manha2 },
    ]
  );
}

function storyNode_aranhas_manha2() {
  _aranhasCena('aranhas-vila');
  hideEnemy();
  setStory(
    'YGIRRO',
    `Minutos depois, ele bate na porta do galpão. A voz está firme demais, controlada demais.\n\n\"Preciso que vocês saiam hoje. Agora, se der.\"\n\n\"Como?\", pergunta Hiroto.\n\n\"Recebi aviso de uma reunião de última hora. Os anciãos vão usar o terreno e a casa. Não é lugar pra visitantes.\" Ele evita olhar nos olhos dela. \"Levem o que for de vocês. Eu mando comida pro caminho.\"`,
    [
      { icon:'🤨', text:'Estranhar a desculpa', action: storyNode_aranhas_manha3 },
    ]
  );
}

function storyNode_aranhas_manha3() {
  _aranhasCena('aranhas-vila');
  hideEnemy();
  setStory(
    'HIROTO',
    `\"Reunião de anciãos?\" Hiroto cruza os braços. \"Mestre, a gente contou. Sobraram cinco pessoas nessa vila, contando o senhor e o Tsuiro. Que reunião é essa?\"\n\nYgirro abre a boca. Fecha. Não tem resposta.\n\nNo seu cinto, o Cristal de Elo esquenta contra a sua perna. Não é a luz calma de ontem. É um pulso, rápido, insistente.\n\n\"E tem mais uma coisa,\" ela continua, mais baixo. \"O Tsuiro não está em casa, está? A lança dele sumiu da porta. Eu vi.\"`,
    [
      { icon:'💬', text:'Insistir com ele', action: storyNode_aranhas_manha4 },
    ]
  );
}

function storyNode_aranhas_manha4() {
  _aranhasCena('aranhas-vila');
  hideEnemy();
  const nome = _aranhasNomeHeroi();
  setStory(
    nome,
    `\"A gente não vai embora. Não com o senhor tentando nos mandar pra longe e o filho sumido. Se o Tsuiro está em perigo, o senhor não precisa carregar isso sozinho.\"\n\nO silêncio dura tempo demais. Os ombros largos de Ygirro, que ontem seguravam a lança sem tremer, cedem um centímetro. Depois outro.\n\n\"...Vocês não entendem.\" A voz racha. \"Se eu contar, vão querer ir. E se forem, não voltam.\"\n\n\"Se não contar, o Tsuiro não volta,\" responde Hiroto, firme.`,
    [
      { icon:'🕯️', text:'Esperar a verdade', action: storyNode_aranhas_manha5 },
    ]
  );
}

function storyNode_aranhas_manha5() {
  _aranhasCena('aranhas-vila');
  hideEnemy();
  setStory(
    'YGIRRO',
    `Ele senta no degrau do galpão, de repente muito mais velho.\n\n\"Já fomos trinta. Primeiro sumiu um, depois dois, depois famílias inteiras. Todos entravam na caverna sorrindo, falando de ritual, de força. Nenhum voltou.\"\n\n\"Eu sentia o mesmo puxão. A cabeça fica leve quando olho pra lá. Aprendi a morder a língua até sangrar pra me manter inteiro.\" Ele mostra uma cicatriz fina no lábio. \"Fechei as lojas, tranquei o que pude. Achei que se eu não falasse, se ninguém visse, o que quer que fosse perderia o interesse.\"\n\n\"O Tsuiro foi o único que nunca sorriu na procissão. Eu sabia. E sabia o que ele faria no dia em que enxergasse tudo.\" A voz some. \"E foi hoje.\"`,
    [
      { icon:'⚔️', text:'Decidir ir atrás dele', action: storyNode_aranhas_decisao },
    ]
  );
}

function storyNode_aranhas_decisao() {
  _aranhasCena('aranhas-vila');
  hideEnemy();
  const nome = _aranhasNomeHeroi();
  setStory(
    'HIROTO',
    `Hiroto já está de pé, ajeitando a arma.\n\n\"Uma vila inteira sumindo é assunto do império e assunto meu. Mas agora é mais que isso. É o filho do homem que me ensinou a segurar uma lança.\"\n\nEla olha pra você.\n\n\"Vamos?\"\n\nYgirro levanta devagar, apanha a lança longa da parede e passa o polegar pela ponta, como fazia no treino. Dessa vez não há correção na voz dele. Só um pedido.\n\n\"Eu não consigo ir sozinho. Não de novo. Me ajudem a trazer meu filho de volta.\"`,
    [
      { icon:'🤝', text:'\"Os três vão juntos.\"', action: storyNode_aranhas_partida },
      { icon:'💠', text:'Olhar o cristal e acenar com a cabeça', action: storyNode_aranhas_partida },
    ]
  );
}

function storyNode_aranhas_partida() {
  _aranhasInit();
  G.aranhas.ygirroAcompanha = true; // flag pra uso futuro (diálogos / ajuda na masmorra)
  if (typeof saveGame === 'function') saveGame();
  _aranhasCena('aranhas-vila');
  hideEnemy();
  if (G.aranhas.seloAberto) return storyNode_aranhas_frente();
  setStory(
    'NARRADOR',
    `Vocês atravessam a vila quase correndo. As casas fechadas passam como sombras. Ninguém aparece nas janelas.`,
    [
      { icon:'🕳️', text:'Seguir até a caverna', action: storyNode_aranhas_frente },
    ]
  );
}

// Frente da caverna (imagem 8): toca na parte azul (ou no botão) pra chegar na "porta"
function storyNode_aranhas_frente() {
  _aranhasInit();
  _aranhasCena('aranhas-frente');
  hideEnemy();
  _aranhasLiberarMapa();             // o mapa já aparece aqui, na entrada com o selo
  _aranhasMapaMostrarBotao();
  if (G.aranhas.seloAberto) {
    return setStory(
      'NARRADOR',
      `Os fios do selo continuam soltos, pendurados como cortinas rasgadas. A passagem está livre.\n\nYgirro vai na retaguarda, a lança em guarda.`,
      [
        { icon:'🕷️', text:'Entrar na caverna', action: storyNode_aranhas_fase1 },
      ]
    );
  }
  setStory(
    'NARRADOR',
    `A entrada da caverna surge entre as pedras. Os fios de seda agora cobrem a abertura de parede a parede, tecidos em círculo. No centro, um selo pulsa devagar, como um coração.\n\nNa terra, pegadas de sandália vão até a teia e param. Tsuiro entrou. E os fios se fecharam atrás dele.`,
    [
      { icon:'🔍', text:'Examinar o selo', action: storyNode_aranhas_selo1 },
    ]
  );
  _aranhasCriaHotspot({
    cena: 'aranhas-frente', fx: 0.40, fy: 0.23, fw: 0.40,
    rotulo: 'Examinar o selo', aoTocar: storyNode_aranhas_selo1,
  });
}

// ─────────────────────────────────────────────────────────────
//  SELO DA CAVERNA — 1º puzzle: "A Lança de Sino"
//  Ygirro tem na lança uma ponta de aço de sino, feita por um
//  ferreiro da cidade. Cada fio do selo tem uma nota. O selo toca
//  uma sequência; o jogador responde tocando nos fios na ordem, e a
//  lança do Ygirro soa a nota de cada fio.
//  • Sem punição: errou, o selo repete. Sem vidas, sem game over.
//  • Quando vence: G.aranhas.seloAberto = true (não repete o puzzle).
// ─────────────────────────────────────────────────────────────

const ARANHAS_SELO_RODADAS  = 4;   // rodadas até abrir o selo
const ARANHAS_SELO_INICIAIS = 3;   // notas na 1ª rodada (cada rodada soma 1)
const ARANHAS_SELO_NOTAS = [293.66, 329.63, 392.00, 440.00, 523.25]; // ré, mi, sol, lá, dó
const ARANHAS_SELO_CORES = ['#c9a24b', '#b0453b', '#3f9a76', '#5468c0', '#9a68c8'];
const ARANHAS_SELO_KANJI = ['一', '二', '三', '四', '五'];

function _aranhasPuzzleSelo(cfg) {
  cfg = cfg || {};
  const antigo = document.getElementById('aranhas-selo');
  if (antigo) antigo.remove();

  if (!document.getElementById('aranhas-selo-style')) {
    const st = document.createElement('style');
    st.id = 'aranhas-selo-style';
    st.textContent = `
      #aranhas-selo { position:fixed; inset:0; z-index:99999; display:flex; flex-direction:column;
        align-items:center; justify-content:space-between;
        padding:calc(18px + env(safe-area-inset-top,0px)) 16px calc(18px + env(safe-area-inset-bottom,0px));
        background:radial-gradient(ellipse at 50% 40%, #1c1209 0%, #07050a 75%);
        color:#e9dcc0; opacity:0; transition:opacity .5s ease;
        font-family:'Noto Serif JP','Noto Serif',Georgia,serif; -webkit-user-select:none; user-select:none; }
      #aranhas-selo.on { opacity:1; }
      #aranhas-selo .as-titulo { font-size:.85rem; letter-spacing:.3em; color:#b48cd8; text-align:center; }
      #aranhas-selo .as-fala { min-height:5.4em; max-width:480px; text-align:center; font-size:1rem;
        line-height:1.6; display:flex; align-items:center; justify-content:center; padding:0 6px; }
      #aranhas-selo .as-anel { position:relative; width:min(88vw,46vh,420px); aspect-ratio:1; }
      #aranhas-selo .as-fios { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; }
      #aranhas-selo .as-fios line, #aranhas-selo .as-fios polygon { stroke:rgba(217,222,228,.28); stroke-width:.5; fill:none;
        transition:stroke .15s, stroke-width .15s; }
      #aranhas-selo .as-fios line.on { stroke:#e8c46a; stroke-width:1.3; }
      #aranhas-selo .as-selo { position:absolute; left:50%; top:50%; width:26%; aspect-ratio:1;
        transform:translate(-50%,-50%); border-radius:50%; border:2px solid #c9a24b; background:#120c06;
        display:flex; align-items:center; justify-content:center; font-size:clamp(1.6rem,9vw,2.6rem); color:#c9a24b;
        box-shadow:0 0 22px rgba(201,162,75,.35); animation:asPulso 2.4s ease-in-out infinite; }
      @keyframes asPulso { 50% { box-shadow:0 0 40px rgba(201,162,75,.7); } }
      #aranhas-selo .as-no { position:absolute; width:22%; aspect-ratio:1; border-radius:50%;
        border:2px solid var(--c); background:#15100a; color:var(--c); font:inherit; font-size:1.4rem;
        transform:translate(-50%,-50%); padding:0; cursor:pointer; touch-action:manipulation;
        -webkit-tap-highlight-color:transparent; transition:background .08s, box-shadow .08s, color .08s; }
      #aranhas-selo .as-no.lit { background:var(--c); color:#0d0a07; box-shadow:0 0 30px var(--c); }
      #aranhas-selo .as-no:disabled { cursor:default; }
      #aranhas-selo .as-info { font-size:.85rem; color:#9a8a68; letter-spacing:.1em; min-height:1.4em; }
      #aranhas-selo .as-botoes { display:flex; gap:10px; width:100%; max-width:420px; }
      #aranhas-selo .as-botoes button { flex:1; padding:12px 8px; background:#1d1409; color:#e9dcc0;
        border:1px solid #6d5522; border-radius:8px; font:inherit; font-size:.9rem; cursor:pointer; }
      #aranhas-selo .as-botoes button:disabled { opacity:.4; cursor:default; }
      #aranhas-selo.aberto .as-selo { border-color:#9fd8b8; color:#9fd8b8; box-shadow:0 0 44px rgba(159,216,184,.65); animation:none; }
      @media (prefers-reduced-motion:reduce) { #aranhas-selo .as-selo { animation:none; } }
    `;
    document.head.appendChild(st);
  }

  const el = document.createElement('div');
  el.id = 'aranhas-selo';
  const pos = i => {
    const a = -Math.PI / 2 + i * 2 * Math.PI / 5;
    return { x: 50 + 36 * Math.cos(a), y: 50 + 36 * Math.sin(a) };
  };
  let svg = '<svg class="as-fios" viewBox="0 0 100 100" aria-hidden="true">';
  svg += '<polygon points="' + ARANHAS_SELO_NOTAS.map((_, i) => pos(i).x + ',' + pos(i).y).join(' ') + '"/>';
  ARANHAS_SELO_NOTAS.forEach((_, i) => {
    const p = pos(i);
    svg += '<line data-i="' + i + '" x1="50" y1="50" x2="' + p.x + '" y2="' + p.y + '"/>';
  });
  svg += '</svg>';
  el.innerHTML = `
    <div class="as-titulo">SELO DA CAVERNA</div>
    <div class="as-fala"></div>
    <div class="as-anel">${svg}<div class="as-selo"><span class="as-glifo">封</span></div></div>
    <div class="as-info"></div>
    <div class="as-botoes">
      <button type="button" class="as-ouvir">Ouvir de novo</button>
      <button type="button" class="as-sair">Recuar</button>
    </div>`;
  const anel = el.querySelector('.as-anel');
  const falaEl = el.querySelector('.as-fala');
  const infoEl = el.querySelector('.as-info');
  const btnOuvir = el.querySelector('.as-ouvir');
  const btnSair = el.querySelector('.as-sair');
  const linhas = Array.prototype.slice.call(el.querySelectorAll('.as-fios line'));
  const nos = ARANHAS_SELO_NOTAS.map((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'as-no';
    b.textContent = ARANHAS_SELO_KANJI[i];
    b.setAttribute('aria-label', 'Fio ' + (i + 1));
    b.style.setProperty('--c', ARANHAS_SELO_CORES[i]);
    b.style.left = pos(i).x + '%';
    b.style.top = pos(i).y + '%';
    b.disabled = true;
    b.addEventListener('pointerdown', function (e) { e.preventDefault(); aperta(i); });
    anel.appendChild(b);
    return b;
  });

  let seq = [], idx = 0, rod = 0, aceita = false, tocando = false, runId = 0, fechado = false, erros = 0, ac = null;
  const FALAS_ERRO = [
    'Ygirro: \"Fora do tom. Escute de novo.\"',
    'Ygirro: \"Sem pressa. O selo só ouve quem espera a nota.\"',
    'Ygirro: \"A lança canta. Você só acompanha.\"',
  ];

  function say(t) { falaEl.textContent = t; }
  function info() { infoEl.textContent = 'Rodada ' + Math.min(rod + 1, ARANHAS_SELO_RODADAS) + ' de ' + ARANHAS_SELO_RODADAS; }
  function travar(b) { nos.forEach(n => { n.disabled = b; }); }

  // som da lança: aço de sino (fundamental + parciais inarmônicos)
  function tom(i) {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      const t = ac.currentTime, f = ARANHAS_SELO_NOTAS[i];
      [[1, .28, 1.1], [2.76, .09, .5], [5.4, .03, .25]].forEach(function (p) {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine'; o.frequency.value = f * p[0];
        g.gain.setValueAtTime(.0001, t);
        g.gain.exponentialRampToValueAtTime(p[1], t + .01);
        g.gain.exponentialRampToValueAtTime(.0001, t + p[2]);
        o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + p[2] + .05);
      });
    } catch (e) { /* sem áudio: o puzzle continua jogável só com as luzes */ }
  }
  function acende(i, ms) {
    nos[i].classList.add('lit'); linhas[i].classList.add('on'); tom(i);
    setTimeout(function () { nos[i].classList.remove('lit'); linhas[i].classList.remove('on'); }, ms);
  }
  function novaNota() {
    let n;
    do { n = Math.floor(Math.random() * 5); } while (seq.length >= 2 && n === seq[seq.length - 1] && n === seq[seq.length - 2]);
    seq.push(n);
  }
  function tocaSeq() {
    const my = ++runId;
    aceita = false; tocando = true; idx = 0;
    travar(true); btnOuvir.disabled = true;
    say('Escute o selo...');
    const passo = Math.max(520, 720 - rod * 60);
    let t = 700;
    seq.forEach(function (n) {
      setTimeout(function () { if (my === runId) acende(n, 380); }, t);
      t += passo;
    });
    setTimeout(function () {
      if (my !== runId) return;
      tocando = false; aceita = true; idx = 0;
      travar(false); btnOuvir.disabled = false;
      say('Sua vez. Toque os fios na mesma ordem.');
    }, t + 150);
  }
  function aperta(i) {
    if (!aceita || tocando || fechado) return;
    acende(i, 260);
    if (i === seq[idx]) {
      idx++;
      if (idx === seq.length) {
        rod++; aceita = false; travar(true); info();
        if (rod >= ARANHAS_SELO_RODADAS) return vence();
        novaNota();
        say('A lança responde. O selo acrescenta mais uma nota...');
        setTimeout(tocaSeq, 1200);
      }
    } else {
      aceita = false; travar(true);
      say(FALAS_ERRO[erros++ % FALAS_ERRO.length]);
      setTimeout(tocaSeq, 1500);
    }
  }
  function fechar(cb) {
    if (fechado) return;
    fechado = true; runId++;
    el.classList.remove('on');
    setTimeout(function () {
      el.remove();
      try { if (ac) ac.close(); } catch (e) {}
      if (typeof cb === 'function') cb();
    }, 450);
  }
  function vence() {
    runId++; aceita = false; tocando = false;
    btnOuvir.disabled = true; btnSair.disabled = true;
    el.classList.add('aberto');
    el.querySelector('.as-glifo').textContent = '開';
    linhas.forEach(function (l) { l.classList.add('on'); });
    say('A última nota se apaga. Os fios soltam, um a um.');
    setTimeout(function () { fechar(cfg.aoVencer); }, 2200);
  }

  btnOuvir.addEventListener('click', function () { if (!tocando && !fechado) tocaSeq(); });
  btnSair.addEventListener('click', function () { fechar(cfg.aoSair); });

  seq = [];
  for (let k = 0; k < ARANHAS_SELO_INICIAIS; k++) novaNota();
  info();
  say('Ygirro: \"Escute o selo. Cada fio tem uma nota.\"');
  document.body.appendChild(el);
  requestAnimationFrame(function () { el.classList.add('on'); });
  setTimeout(tocaSeq, 1400);
}

function storyNode_aranhas_selo1() {
  _aranhasCena('aranhas-porta');
  hideEnemy();
  setStory(
    'HIROTO',
    `Hiroto desembainha e corta um fio com um golpe limpo. O fio se reata sozinho, mais apertado do que antes.\n\n\"Aço comum não adianta. Isso aqui responde a outra coisa.\"\n\nYgirro observa o selo em silêncio. Depois, sem pressa, vira a lança de lado e olha a ponta.`,
    [
      { icon:'🔱', text:'Perguntar sobre a lança', action: storyNode_aranhas_selo2 },
    ]
  );
}

function storyNode_aranhas_selo2() {
  _aranhasCena('aranhas-porta');
  hideEnemy();
  const botoes = [
    { icon:'🔔', text:'Escutar o selo', action: storyNode_aranhas_selo_puzzle },
  ];
  if (ARANHAS_MODO_TESTE) {
    botoes.push({ icon:'⏭️', text:'Pular o selo (teste)', action: function () {
      _aranhasInit(); G.aranhas.seloAberto = true;
      if (typeof saveGame === 'function') saveGame();
      storyNode_aranhas_selo_aberto();
    } });
  }
  setStory(
    'YGIRRO',
    `\"A ponta não é de forja daqui. Mandei fazer na cidade, anos atrás, com um ferreiro que fundia sinos de templo. Eu tinha ouvido esses fios cantando com o vento e pedi um aço que cantasse de volta.\"\n\nEle bate o cabo no chão. Um som limpo e longo sobe da lança, e um dos fios do selo vibra na mesma nota.\n\n\"Cada fio tem a sua nota. O selo repete uma sequência. Quem responder certo faz ele lembrar que é só seda.\"\n\nEle olha pra você.\n\n\"Eu bato a lança. Você escolhe os fios.\"`,
    botoes
  );
  _aranhasCriaHotspot({
    cena: 'aranhas-porta', fx: 0.50, fy: 0.583, fw: 0.45,
    rotulo: 'Tocar no selo', aoTocar: storyNode_aranhas_selo_puzzle,
  });
}

function storyNode_aranhas_selo_puzzle() {
  _aranhasPuzzleSelo({
    aoVencer: function () {
      _aranhasInit();
      G.aranhas.seloAberto = true;
      if (typeof saveGame === 'function') saveGame();
      storyNode_aranhas_selo_aberto();
    },
    aoSair: storyNode_aranhas_selo2,
  });
}

function storyNode_aranhas_selo_aberto() {
  _aranhasCena('aranhas-porta');
  hideEnemy();
  setStory(
    'NARRADOR',
    `A última nota se apaga no ar. Os fios soltam um a um, como cabelo desfeito, e o selo se desfaz no meio.\n\nYgirro abaixa a lança devagar. A ponta ainda vibra, baixinho.\n\n\"Eu cuido da retaguarda,\" diz ele, já em guarda. \"Vocês dois na frente.\"\n\nA caverna respira. Lá dentro, algo pequeno chora, ou ri, ou apenas ecoa.\n\nÉ aqui que começa de verdade.`,
    [
      { icon:'🕷️', text:'Entrar na caverna', action: storyNode_aranhas_fase1 },
    ]
  );
}

// ── Utilitário: pop-up tela cheia (toque fecha e chama o callback) ──
function _aranhasPopupTelaCheia(cfg) {
  const antigo = document.getElementById('aranhas-popup');
  if (antigo) antigo.remove();

  if (!document.getElementById('aranhas-popup-style')) {
    const st = document.createElement('style');
    st.id = 'aranhas-popup-style';
    st.textContent = `
      #aranhas-popup { position:fixed; inset:0; z-index:99999; display:flex; flex-direction:column;
        align-items:center; justify-content:center; padding:calc(24px + env(safe-area-inset-top,0px)) 22px calc(24px + env(safe-area-inset-bottom,0px));
        background:radial-gradient(ellipse at 50% 30%, rgba(60,20,70,.96), rgba(6,2,10,.99) 70%);
        color:#e9dcc0; text-align:center; cursor:pointer; opacity:0; transition:opacity .5s ease; }
      #aranhas-popup.on { opacity:1; }
      #aranhas-popup svg { width:min(70vw,320px); height:auto; opacity:.45; margin-bottom:18px; filter:drop-shadow(0 0 4px rgba(6,2,10,.8)); }
      #aranhas-popup .ap-titulo { font-size:.85rem; letter-spacing:.35em; color:#b48cd8; margin-bottom:16px; }
      #aranhas-popup .ap-texto { font-size:1.02rem; line-height:1.7; max-width:520px; white-space:pre-line; text-shadow:0 0 6px rgba(6,2,10,.95), 0 1px 3px rgba(6,2,10,.9); }
      #aranhas-popup .ap-dica { margin-top:26px; font-size:.78rem; letter-spacing:.2em; color:#8a7aa0; animation:apPulse 1.8s ease-in-out infinite; }
      @keyframes apPulse { 0%,100% { opacity:.35 } 50% { opacity:1 } }
    `;
    document.head.appendChild(st);
  }

  const el = document.createElement('div');
  el.id = 'aranhas-popup';
  el.innerHTML = `
    <svg viewBox="0 0 200 200" fill="none" stroke="#b48cd8" stroke-width="1.2" aria-hidden="true">
      <g>
        <line x1="100" y1="100" x2="100" y2="6"/><line x1="100" y1="100" x2="194" y2="100"/>
        <line x1="100" y1="100" x2="100" y2="194"/><line x1="100" y1="100" x2="6" y2="100"/>
        <line x1="100" y1="100" x2="166" y2="34"/><line x1="100" y1="100" x2="166" y2="166"/>
        <line x1="100" y1="100" x2="34" y2="166"/><line x1="100" y1="100" x2="34" y2="34"/>
        <polygon points="100,56 144,100 100,144 56,100"/>
        <polygon points="100,28 172,100 100,172 28,100"/>
        <polygon points="100,80 120,100 100,120 80,100"/>
      </g>
    </svg>
    <div class="ap-titulo"></div>
    <div class="ap-texto"></div>
    <div class="ap-dica"></div>`;
  if (cfg.fundo) {
    // imagem de fundo + véu escuro leve (o texto continua legível) + o degradê roxo como reserva
    el.style.background = 'linear-gradient(rgba(6,2,10,.06), rgba(6,2,10,.22)), url("' + cfg.fundo + '") center/cover no-repeat, ' +
      'radial-gradient(ellipse at 50% 30%, rgba(60,20,70,.96), rgba(6,2,10,.99) 70%)';
  }
  el.querySelector('.ap-titulo').textContent = cfg.titulo || '';
  el.querySelector('.ap-texto').textContent  = cfg.texto  || '';
  el.querySelector('.ap-dica').textContent   = cfg.dica   || 'Toque para continuar';

  let fechado = false;
  el.addEventListener('click', function () {
    if (fechado) return;
    fechado = true;
    el.classList.remove('on');
    setTimeout(function () {
      el.remove();
      if (typeof cfg.aoFechar === 'function') cfg.aoFechar();
    }, 350);
  });

  document.body.appendChild(el);
  requestAnimationFrame(function () { el.classList.add('on'); });
}

// ─────────────────────────────────────────────────────────────
//  INIMIGOS — Os Filhos de Tsumugi: Itsuki (menino) + Kumiko (menina)
//  UM card só (arte trurish.png), mas DUAS barras de vida separadas:
//  Itsuki = barra VERDE · Kumiko = barra AZUL. Tocar na barra mira
//  naquele irmão. Usa o motor de grupo (multi_enemy_battle.js), que
//  já cuida de alvo ativo, fila de velocidade e morte individual.
//  Ainda NÃO ligado a nenhuma fase — para testar no console:
//      aranhasIniciarFilhos();
//
//  Status de CADA irmão: HP 2700 · ATK 170 · DEF 180 · crit 20% · dano crit 200%
//  Elemento veneno. Sem drop.
//   • Todo golpe: 40% de envenenar (3 turnos, 20% do HP MÁX do jogador/turno).
//   • Ataque de Veneno: +12% de chance de veneno (40→52%), CD 2.
//   • Carapaça de Seda: +10% DEF por 4 turnos, acumulativa, CD 2.
//   • Teia Prendedora: ATK do jogador −20% por 2 turnos, CD 4.
// ─────────────────────────────────────────────────────────────

const ARANHAS_FILHOS_IMG = 'Imagens/personagens/trurish.png';
const ARANHAS_VENENO   = { turns: 3, pctMaxHp: 0.20, chanceGolpe: 0.40, bonusSkill: 0.12 };
const ARANHAS_CARAPACA = { pct: 0.10, turns: 4, cd: 2 };
const ARANHAS_CD_VENENO = 2;
const ARANHAS_TEIA     = { atkPct: 0.20, turns: 2, cd: 4 };
const ARANHAS_COR      = { aranha_itsuki: '#4cc464', aranha_kumiko: '#4a9bff' };

function _aranhasMembro(id, name) {
  return {
    id: id, name: name, img: ARANHAS_FILHOS_IMG, icon: '🕷️',
    hp: 2700, atk: 170, def: 180, spd: 14, elemento: 'veneno',
    critChance: 0.20, critMult: 2.0,
  };
}

function aranhasDefAtual(m) {
  const soma = (m._defStacks || []).reduce((a, b) => a + b.pct, 0);
  return Math.round((m.baseDef || m.def) * (1 + soma));
}

function _aranhasEnvenenar(bs, p) {
  bs.playerPoisoned = true;
  bs.playerPoisonTurns = ARANHAS_VENENO.turns;
  bs._playerPoisonDmgOverride = Math.max(1, Math.round(p.maxHp * ARANHAS_VENENO.pctMaxHp));
  if (typeof showFloatingNumber === 'function') showFloatingNumber('hero', '☠ VENENO', 'status');
}

function _aranhasRestaurarAtk(bs, p) {
  if (bs && bs._aranhasTeiaAmt) {
    p.atk += bs._aranhasTeiaAmt;
    bs._aranhasTeiaAmt = 0;
  }
  if (bs) bs._aranhasTeiaTurns = 0;
}

// Ação de UM irmão (chamada pelo motor de grupo, na ordem da fila de SPD).
function aranhasFilhosAgir(bs, p, m, done) {
  const mb = G._multiBattle;
  if (!m._aranhasInit) {
    m._aranhasInit = true;
    m._defStacks = []; m._cdVeneno = 0; m._cdCarapaca = 0; m._cdTeia = 0;
  }
  // tick do turno anterior: buffs e cooldowns andam 1 turno
  m._defStacks.forEach(b => b.turns--);
  m._defStacks = m._defStacks.filter(b => b.turns > 0);
  if (m._cdVeneno > 0) m._cdVeneno--;
  if (m._cdCarapaca > 0) m._cdCarapaca--;
  if (m._cdTeia > 0) m._cdTeia--;
  m.def = aranhasDefAtual(m);
  const syncDef = () => {
    if (mb && mb.activeId === m.id && battleState.enemyData) battleState.enemyData.def = m.def;
  };
  syncDef();

  const fim = () => setTimeout(done, (typeof battleDelay === 'function') ? battleDelay(600) : 600);
  const cor = ARANHAS_COR[m.id] || '#80d060';

  // Skill 2 — Carapaça de Seda (acumulativa)
  if (m._cdCarapaca === 0 && Math.random() < 0.5) {
    m._defStacks.push({ pct: ARANHAS_CARAPACA.pct, turns: ARANHAS_CARAPACA.turns });
    m._cdCarapaca = ARANHAS_CARAPACA.cd;
    m.def = aranhasDefAtual(m);
    syncDef();
    appendBattleLog(`🕸️ ${m.name} tece a Carapaça de Seda! DEF +10% por 4 turnos (DEF ${m.def}, ${m._defStacks.length} acúmulo(s)).`, '#c0a0ff');
    if (typeof showFloatingNumber === 'function') showFloatingNumber('enemy', '🕸️ DEF+', 'status');
    return fim();
  }

  // Skill 3 — Teia Prendedora (ATK do jogador −20% por 2 turnos)
  if (m._cdTeia === 0 && !(bs._aranhasTeiaTurns > 0) && Math.random() < 0.4) {
    m._cdTeia = ARANHAS_TEIA.cd;
    const amt = Math.max(1, Math.floor(p.atk * ARANHAS_TEIA.atkPct));
    p.atk -= amt;
    bs._aranhasTeiaAmt = amt;
    bs._aranhasTeiaTurns = ARANHAS_TEIA.turns;
    appendBattleLog(`🕸️ ${m.name} lança a Teia Prendedora! Seu ATK −${amt} (−20%) por 2 turnos.`, '#c0a0ff');
    if (typeof showFloatingNumber === 'function') showFloatingNumber('hero', '🕸️ ATK−', 'status');
    if (typeof buildStatusBadges === 'function') buildStatusBadges();
    return fim();
  }

  // Golpe (normal ou Ataque de Veneno)
  const usaVeneno = m._cdVeneno === 0 && Math.random() < 0.5;
  if (usaVeneno) m._cdVeneno = ARANHAS_CD_VENENO;

  const crit = Math.random() < m.critChance;
  let d = calcEnemyDmg(m, p, bs, 1.0);
  if (crit) d = Math.floor(d * m.critMult);
  applyDmgToPlayer(d, bs, p);

  const chance = ARANHAS_VENENO.chanceGolpe + (usaVeneno ? ARANHAS_VENENO.bonusSkill : 0);
  const envenenou = Math.random() < chance;
  if (envenenou) _aranhasEnvenenar(bs, p);

  appendBattleLog(
    `${usaVeneno ? '☠️ Ataque de Veneno' : '🕷️ Golpe'} de ${m.name}${crit ? ' — CRÍTICO!' : ''} -${d} HP!` +
    (envenenou ? ` ☠ Veneno ${ARANHAS_VENENO.turns}t (${bs._playerPoisonDmgOverride}/turno)!` : ''),
    crit ? '#ff4040' : cor
  );
  if (typeof showFloatingNumber === 'function') showFloatingNumber('hero', d, crit ? 'crit' : 'dmg');
  if (typeof flashDamage === 'function') flashDamage('hero');
  if (typeof animHeroHit === 'function') animHeroHit();
  if (typeof buildStatusBadges === 'function') buildStatusBadges();
  fim();
}

// ── Barras de vida duplas (verde = Itsuki, azul = Kumiko) ──
function _aranhasInjetarCSS() {
  if (document.getElementById('aranhas-dupla-css')) return;
  const st = document.createElement('style');
  st.id = 'aranhas-dupla-css';
  st.textContent = `
    #bat-enemy-side.aranhas-dupla .battle-hp-bar,
    #bat-enemy-side.aranhas-dupla #bat-enemy-hp { display: none !important; }
    #bat-multi-enemy-row.aranhas-dupla-hide { display: none !important; }
    #aranhas-dupla-hp { display:flex; flex-direction:column; gap:5px; width:100%; max-width:230px; margin:4px auto 2px; }
    .ad-row { display:flex; flex-direction:column; gap:2px; padding:3px 5px; border-radius:6px;
      border:1px solid transparent; cursor:pointer; transition:opacity .3s, border-color .2s, background .2s; }
    .ad-row.ad-ativo { border-color:rgba(255,255,255,.45); background:rgba(255,255,255,.07); }
    .ad-row.ad-morto { opacity:.35; cursor:default; }
    .ad-top { display:flex; justify-content:space-between; font-size:.68rem; color:#e8e0d0; }
    .ad-bar { height:8px; border-radius:4px; background:rgba(0,0,0,.55); overflow:hidden; }
    .ad-fill { height:100%; width:100%; border-radius:4px; transition:width .35s ease; }
  `;
  document.head.appendChild(st);
}

function aranhasRenderBarras() {
  const mb = G._multiBattle;
  const side = document.getElementById('bat-enemy-side');
  if (!side) return;
  let box = document.getElementById('aranhas-dupla-hp');
  if (!mb || !mb.active || mb.groupId !== 'aranha_filhos_tsumugi') {
    if (box) box.remove();
    side.classList.remove('aranhas-dupla');
    const row = document.getElementById('bat-multi-enemy-row');
    if (row) row.classList.remove('aranhas-dupla-hide');
    return;
  }
  side.classList.add('aranhas-dupla');
  const row = document.getElementById('bat-multi-enemy-row');
  if (row) row.classList.add('aranhas-dupla-hide');
  if (!box) {
    box = document.createElement('div');
    box.id = 'aranhas-dupla-hp';
    const ref = document.getElementById('bat-enemy-hp');
    if (ref && ref.parentNode) ref.parentNode.insertBefore(box, ref.nextSibling);
    else side.appendChild(box);
  }
  box.innerHTML = mb.members.map(m => {
    const ativo = m.id === mb.activeId;
    const hp = Math.max(0, Math.round(ativo ? battleState.enemyHp : m.hp));
    const pct = Math.max(0, Math.min(100, hp / m.maxHp * 100));
    const cor = ARANHAS_COR[m.id] || '#80d060';
    return `<div class="ad-row${ativo && m.alive ? ' ad-ativo' : ''}${m.alive ? '' : ' ad-morto'}"
        onclick="mebSelectTarget('${m.id}')">
      <div class="ad-top"><span style="color:${cor}">${m.name}</span><span>${m.alive ? hp + '/' + m.maxHp : '💀'}</span></div>
      <div class="ad-bar"><div class="ad-fill" style="width:${pct}%;background:${cor}"></div></div>
    </div>`;
  }).join('');
}

function _aranhasInstalarPatches() {
  if (window._aranhasPatches) return;
  window._aranhasPatches = true;
  const oHud = window.updateBattleHUD;
  window.updateBattleHUD = function () {
    const r = oHud.apply(this, arguments);
    try { aranhasRenderBarras(); } catch (e) { console.error(e); }
    return r;
  };
  const oEnd = window.endBattle;
  window.endBattle = function (won, fled) {
    const r = oEnd.apply(this, arguments);
    if (!G._multiBattle) { // luta realmente encerrada
      try { _aranhasRestaurarAtk(battleState, G.player); aranhasRenderBarras(); } catch (e) { console.error(e); }
    }
    return r;
  };
}

function aranhasIniciarFilhos() {
  if (!window._mebInstalled || typeof window.startMultiEnemyBattle !== 'function') {
    setTimeout(aranhasIniciarFilhos, 150); // motor de grupo ainda carregando
    return;
  }
  _aranhasInjetarCSS();
  _aranhasInstalarPatches();
  battleState._aranhasTeiaAmt = 0;
  battleState._aranhasTeiaTurns = 0;
  window.startMultiEnemyBattle({
    groupId: 'aranha_filhos_tsumugi',
    groupName: 'Itsuki & Kumiko',
    icon: '🕷️', elemento: 'veneno', isBoss: false,
    desc: 'Os filhos de Tsumugi — dois irmãos aranha que lutam como um só.',
    xp: 0, gold: 0, loot: [],
    members: [
      _aranhasMembro('aranha_itsuki', 'Itsuki'),
      _aranhasMembro('aranha_kumiko', 'Kumiko'),
    ],
    actHandler: aranhasFilhosAgir,
    // Teia: dura 2 rodadas completas do jogador (conta no começo de cada rodada inimiga)
    onRoundStart: function (bs, p) {
      if (bs._aranhasTeiaTurns > 0) {
        bs._aranhasTeiaTurns--;
        if (bs._aranhasTeiaTurns <= 0) {
          _aranhasRestaurarAtk(bs, p);
          appendBattleLog('🕸️ A teia se rompe — seu ATK volta ao normal.', '#c0a0ff');
        }
      }
    },
  });
}

window.ARANHAS_VENENO        = ARANHAS_VENENO;
window.aranhasIniciarFilhos  = aranhasIniciarFilhos;
window.aranhasFilhosAgir     = aranhasFilhosAgir;
window.aranhasRenderBarras   = aranhasRenderBarras;

// ─────────────────────────────────────────────────────────────
//  FASE 1 / 2 / 3 — TODO
//  Plano: muitos inimigos aranha (alguns repetidos), sem drop,
//  usando startMultiEnemyBattle para grupos. Cada fase termina
//  com G.aranhas.fase++ e saveGame().
//  Inimigos sem loot: loot: [], xp/gold definidos por inimigo.
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
//  FASE 1 — Corredor de teias, os gêmeos e o núcleo do ninho
//  Fundos: Ts1 (interior da caverna) → Ts2 (corredor, Ygirro preso
//  na teia dourada, luta dos gêmeos) → volta pra Ts1 após a vitória
//  → pin → núcleo (Ts3, imagem ainda a definir).
//  A espada da Hiroto: ITOKIRI, "a Cortadora de Fios".
// ─────────────────────────────────────────────────────────────

const ARANHAS_ESPADA_HIROTO = 'Itokiri';

// Pin pulsando sobre a própria cena (sem tela de mapa). Tocar nele (ou no
// botão "Avançar") segue pro próximo local e troca o plano de fundo.
let _aranhasPinPendente = null;   // função "ir" do pin atual (o círculo do mapa também avança)

function _aranhasRemoveMapa() {
  _aranhasPinPendente = null;
  const velho = document.getElementById('aranhas-pin');
  if (velho) velho.remove();
  const m = document.getElementById('aranhas-mapa');   // restos da versão antiga com mapa
  if (m) m.remove();
}

function _aranhasPin(cfg) {
  _aranhasRemoveMapa();
  const bg = document.getElementById('scene-bg');
  if (!bg || !bg.parentNode) return function () { if (typeof cfg.aoTocar === 'function') cfg.aoTocar(); };
  if (!document.getElementById('aranhas-pin-style')) {
    const st = document.createElement('style');
    st.id = 'aranhas-pin-style';
    st.textContent = `
      #aranhas-pin { position:absolute; left:50%; top:40%; z-index:6; transform:translate(-50%,-50%);
        display:flex; flex-direction:column; align-items:center; gap:4px; background:none; border:0; padding:6px;
        cursor:pointer; -webkit-tap-highlight-color:transparent; opacity:0; transition:opacity .5s; }
      #aranhas-pin.on { opacity:1; }
      #aranhas-pin .ap-ico { display:block; width:46px; height:46px; border-radius:50%; box-sizing:border-box;
        border:3px solid #f0c040; background:radial-gradient(circle, rgba(240,192,64,.50) 0%, rgba(240,192,64,.14) 58%, rgba(240,192,64,0) 100%);
        box-shadow:0 0 16px rgba(240,192,64,.9), inset 0 0 12px rgba(240,192,64,.55);
        animation:apPinPulso 1.4s ease-in-out infinite; }
      #aranhas-pin .ap-rot { font-size:.62rem; letter-spacing:.18em; color:#f0e0b8; padding:2px 9px; border-radius:9px;
        background:rgba(10,6,16,.78); border:1px solid rgba(240,200,120,.5); white-space:nowrap; }
      @keyframes apPinPulso { 0%,100% { transform:scale(.88); opacity:.75; } 50% { transform:scale(1.1); opacity:1; } }
      @media (prefers-reduced-motion:reduce) { #aranhas-pin .ap-ico { animation:none; } }
    `;
    document.head.appendChild(st);
  }
  const el = document.createElement('button');
  el.type = 'button';
  el.id = 'aranhas-pin';
  el.setAttribute('aria-label', cfg.rotulo || 'Avançar');
  el.innerHTML = '<span class="ap-ico"></span><span class="ap-rot"></span>';
  el.querySelector('.ap-rot').textContent = cfg.rotulo || '';
  let usado = false;
  const ir = function () {
    if (usado) return; usado = true;
    _aranhasRemoveMapa();
    if (typeof cfg.aoTocar === 'function') cfg.aoTocar();
  };
  el.addEventListener('click', function (ev) { ev.stopPropagation(); ir(); });
  bg.parentNode.appendChild(el);
  _aranhasPinPendente = ir;
  requestAnimationFrame(function () { el.classList.add('on'); });
  return ir;
}

// ─────────────────────────────────────────────────────────────
//  MAPA DO NINHO — botão no canto superior direito, igual ao do vilarejo
//  Botão próprio (#aranhas-mapa-toggle), no mesmo estilo do mini-mapa do vilarejo e do
//  mapa da Inazami: círculo dourado com a miniatura do mapa da masmorra. Aparece dentro
//  da masmorra depois de liberado em fase1_avanco e abre o map656.png.
// ─────────────────────────────────────────────────────────────
const ARANHAS_MAPA_IMG = 'Imagens/Vila de Tsumugi/map656.png';
const ARANHAS_MAPA_CIRCULO = false;   // true = desenha o círculo dourado pulsando no núcleo (e tocar nele avança)
// Posição do círculo em fração do mapa (medida na arte): centro 51,2% / 48,8%, largura 36%.

// Pontos do mapa (fração do quadro 1:1, medidos na arte map656.png) e a cena que cai em cada um.
// O ponto "você está aqui" acompanha a cena em que o jogador está; os pontos já visitados
// ficam marcados e ligados por uma linha tracejada (a trilha de por onde ele passou).
const ARANHAS_MAPA_PONTOS = {
  entrada:  { x: 0.500, y: 0.865, nome: 'Entrada da caverna' },
  corredor: { x: 0.500, y: 0.730, nome: 'Interior da caverna' },
  dourado:  { x: 0.505, y: 0.620, nome: 'Corredor de teias douradas' },
  nucleo:   { x: 0.512, y: 0.488, nome: 'Núcleo do ninho' },
};
const ARANHAS_MAPA_CENA_PONTO = {
  'aranhas-frente': 'entrada', 'aranhas-porta': 'entrada',
  'aranhas-ts1': 'corredor', 'aranhas-ts2': 'dourado',
  'aranhas-nucleo': 'nucleo', 'aranhas-teia': 'nucleo', 'aranhas-solto': 'nucleo', 'aranhas-trono': 'nucleo',
};

// Registra o ponto por onde o jogador passou (chamado a cada troca de cena).
function _aranhasMapaRegistrar(cena) {
  try {
    const p = ARANHAS_MAPA_CENA_PONTO[cena];
    if (!p || !G || !G.aranhas) return;
    if (cena === 'aranhas-frente') G.aranhas.mapaTrilha = [];   // começou a masmorra de novo
    const t = G.aranhas.mapaTrilha || (G.aranhas.mapaTrilha = []);
    if (t.indexOf(p) < 0) t.push(p);
  } catch (_) {}
}

// Ponto atual: pela cena em uso; se o jogo foi recarregado, acha pela classe do fundo.
function _aranhasMapaPontoAtual() {
  let c = _aranhasCenaAtual;
  if (!c || !ARANHAS_MAPA_CENA_PONTO[c]) {
    c = null;
    const bg = document.getElementById('scene-bg');
    if (bg) for (const k in ARANHAS_MAPA_CENA_PONTO) { if (bg.classList.contains(k)) { c = k; break; } }
  }
  return c ? ARANHAS_MAPA_CENA_PONTO[c] : null;
}

// Libera o mapa (uma vez só) assim que o jogador chega na entrada da caverna.
function _aranhasLiberarMapa() {
  const a = _aranhasInit();
  if (a.mapaNinho) return;
  a.mapaNinho = true;
  try { if (typeof notify === 'function') notify('🗺️ Mapa do Ninho liberado, no canto superior direito.', 'gold'); } catch (_) {}
}

function _aranhasMapaAtivo() {
  try {
    const loc = String((G && G.location) || '');
    return !!(G && G.aranhas && G.aranhas.mapaNinho && /aranhas/.test(loc) && !/aranhas-(vila|casa)$/.test(loc));
  } catch (_) { return false; }
}

function _aranhasMapaFechar() {
  const ov = document.getElementById('aranhas-mapa-ov');
  if (ov) ov.remove();
}

function _aranhasMapaAbrir() {
  _aranhasMapaFechar();
  if (!document.getElementById('aranhas-mapa-ov-style')) {
    const st = document.createElement('style');
    st.id = 'aranhas-mapa-ov-style';
    st.textContent = `
      #aranhas-mapa-ov { position:fixed; inset:0; z-index:9800; display:flex; align-items:center; justify-content:center;
        background:rgba(4,3,9,.88); padding:env(safe-area-inset-top,0px) 12px env(safe-area-inset-bottom,0px); box-sizing:border-box; }
      #aranhas-mapa-ov .amo-box { position:relative; display:flex; flex-direction:column; align-items:center; gap:8px; max-width:100%; }
      #aranhas-mapa-ov .amo-titulo { font-size:.72rem; letter-spacing:.3em; color:#e8c46a; text-align:center; }
      #aranhas-mapa-ov .amo-quadro { position:relative; width:min(92vw, 62vh); aspect-ratio:1; border:2px solid rgba(232,196,106,.55);
        border-radius:6px; box-shadow:0 0 24px rgba(0,0,0,.8); background:#1a120a url('__MAPA__') center/100% 100% no-repeat; }
      #aranhas-mapa-ov .amo-circulo { position:absolute; left:51.2%; top:48.8%; width:36%; aspect-ratio:1; transform:translate(-50%,-50%);
        border-radius:50%; border:3px solid #f0c040; background:radial-gradient(circle, rgba(240,192,64,.18) 0%, rgba(240,192,64,0) 70%);
        box-shadow:0 0 16px rgba(240,192,64,.9), inset 0 0 14px rgba(240,192,64,.5); padding:0; cursor:default;
        animation:amoPulso 1.6s ease-in-out infinite; -webkit-tap-highlight-color:transparent; }
      #aranhas-mapa-ov .amo-circulo.pend { cursor:pointer; }
      @keyframes amoPulso { 0%,100% { transform:translate(-50%,-50%) scale(.93); opacity:.7; } 50% { transform:translate(-50%,-50%) scale(1.07); opacity:1; } }
      #aranhas-mapa-ov .amo-trilha { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; }
      #aranhas-mapa-ov .amo-visto { position:absolute; width:2.6%; aspect-ratio:1; transform:translate(-50%,-50%); border-radius:50%;
        background:#f0c040; box-shadow:0 0 6px rgba(240,192,64,.9); pointer-events:none; }
      #aranhas-mapa-ov .amo-voce { position:absolute; width:9%; aspect-ratio:1; transform:translate(-50%,-50%); border-radius:50%; box-sizing:border-box;
        border:3px solid #7cc4ff; background:radial-gradient(circle, rgba(255,255,255,.95) 0%, rgba(124,196,255,.55) 38%, rgba(124,196,255,0) 72%);
        box-shadow:0 0 16px rgba(124,196,255,.95), 0 0 30px rgba(90,150,255,.6); pointer-events:none; animation:amoVoce 1.5s ease-in-out infinite; }
      @keyframes amoVoce { 0%,100% { transform:translate(-50%,-50%) scale(.85); opacity:.8; } 50% { transform:translate(-50%,-50%) scale(1.12); opacity:1; } }
      @media (prefers-reduced-motion:reduce) { #aranhas-mapa-ov .amo-voce { animation:none; } }
      #aranhas-mapa-ov .amo-local { padding:3px 12px; border-radius:10px; font-size:.7rem; letter-spacing:.12em; color:#f0e0b8;
        background:rgba(10,6,16,.78); border:1px solid rgba(240,200,120,.5); text-align:center; }
      #aranhas-mapa-ov .amo-x { position:absolute; top:-6px; right:-4px; width:34px; height:34px; border-radius:50%; font-size:1rem; line-height:1;
        color:#f0e0b8; background:rgba(10,6,16,.9); border:1px solid rgba(240,200,120,.6); cursor:pointer; z-index:2; }
      @media (prefers-reduced-motion:reduce) { #aranhas-mapa-ov .amo-circulo { animation:none; } }
    `.replace('__MAPA__', ARANHAS_MAPA_IMG);
    document.head.appendChild(st);
  }
  const rotEl = document.getElementById('location-name');
  const onde = (rotEl && rotEl.textContent || '').trim();
  const ov = document.createElement('div');
  ov.id = 'aranhas-mapa-ov';
  ov.innerHTML = '<div class="amo-box"><button type="button" class="amo-x" aria-label="Fechar mapa">✕</button>' +
    '<div class="amo-titulo">MAPA DO NINHO</div>' +
    '<div class="amo-quadro">' + (ARANHAS_MAPA_CIRCULO ? '<button type="button" class="amo-circulo" aria-label="Núcleo do ninho"></button>' : '') + '</div>' +
    '<div class="amo-local"></div></div>';
  ov.querySelector('.amo-local').textContent = onde ? '📍 Você está em: ' + onde : '📍 Núcleo do ninho marcado';
  ov.addEventListener('click', _aranhasMapaFechar);                                   // toque fora fecha
  ov.querySelector('.amo-box').addEventListener('click', function (ev) { ev.stopPropagation(); });
  ov.querySelector('.amo-x').addEventListener('click', _aranhasMapaFechar);
  // Trilha por onde o jogador passou + marcador "você está aqui"
  const quadro = ov.querySelector('.amo-quadro');
  const atual = _aranhasMapaPontoAtual();
  const trilha = ((G.aranhas && G.aranhas.mapaTrilha) || []).filter(function (k) { return ARANHAS_MAPA_PONTOS[k]; });
  if (atual) { for (const k in ARANHAS_MAPA_PONTOS) { if (ARANHAS_MAPA_PONTOS[k] === atual && trilha.indexOf(k) < 0) trilha.push(k); } }
  if (trilha.length > 1) {
    const pts = trilha.map(function (k) { return (ARANHAS_MAPA_PONTOS[k].x * 100) + ',' + (ARANHAS_MAPA_PONTOS[k].y * 100); }).join(' ');
    quadro.insertAdjacentHTML('beforeend', '<svg class=\"amo-trilha\" viewBox=\"0 0 100 100\" preserveAspectRatio=\"none\">' +
      '<polyline points=\"' + pts + '\" fill=\"none\" stroke=\"#f0c040\" stroke-width=\"0.9\" stroke-dasharray=\"1.6 1.8\" stroke-linecap=\"round\" opacity=\".85\"/></svg>');
  }
  trilha.forEach(function (k) {
    const p = ARANHAS_MAPA_PONTOS[k];
    if (p === atual) return;
    const d = document.createElement('div'); d.className = 'amo-visto';
    d.style.left = (p.x * 100) + '%'; d.style.top = (p.y * 100) + '%';
    quadro.appendChild(d);
  });
  if (atual) {
    const v = document.createElement('div'); v.className = 'amo-voce'; v.title = 'Você está aqui';
    v.style.left = (atual.x * 100) + '%'; v.style.top = (atual.y * 100) + '%';
    quadro.appendChild(v);
    ov.querySelector('.amo-local').textContent = '📍 Você está em: ' + atual.nome;
  }
  const circ = ov.querySelector('.amo-circulo');
  if (circ) {
    if (_aranhasPinPendente) circ.classList.add('pend');
    circ.addEventListener('click', function () {
      const ir = _aranhasPinPendente;
      if (!ir) return;                                // círculo só avança enquanto o pin da cena estiver ativo
      _aranhasMapaFechar();
      ir();
    });
  }
  document.body.appendChild(ov);
}

// Botão próprio da masmorra (#aranhas-mapa-toggle): mesmo padrão do botão do mapa da Inazami
// (#inazami-mapa-toggle) — círculo dourado de 54px no canto superior direito, com a miniatura
// do mapa DA MASMORRA (map656.png) em vez da do Mapa-Múndi do vilarejo. O botão do vilarejo
// (#minimap-toggle) não é tocado.
function _aranhasMapaGarantirBotao() {
  let btn = document.getElementById('aranhas-mapa-toggle');
  if (btn) return btn;
  const ref = document.getElementById('minimap-toggle');          // só pra achar o mesmo contêiner (a cena)
  if (!ref || !ref.parentNode) return null;
  if (!document.getElementById('aranhas-mapa-toggle-style')) {
    const st = document.createElement('style');
    st.id = 'aranhas-mapa-toggle-style';
    st.textContent = `
      #aranhas-mapa-toggle { position:absolute; top:10px; right:10px; z-index:20; width:54px; height:54px; border-radius:50%;
        border:2px solid var(--gold,#c8960a); overflow:hidden; cursor:pointer;
        box-shadow:0 0 12px rgba(200,150,10,.55), 0 2px 8px rgba(0,0,0,.8);
        background-image:url('__MAPA__'); background-size:cover; background-position:center;
        visibility:hidden; opacity:0; transition:opacity .3s, visibility .3s, transform .2s; }
      #aranhas-mapa-toggle.visivel { visibility:visible; opacity:1; }
      #aranhas-mapa-toggle:active { transform:scale(.92); }
    `.replace('__MAPA__', ARANHAS_MAPA_IMG);
    document.head.appendChild(st);
  }
  btn = document.createElement('div');
  btn.id = 'aranhas-mapa-toggle';
  btn.title = 'Mapa do Ninho';
  btn.addEventListener('click', function (ev) {
    ev.stopPropagation();
    if (document.getElementById('aranhas-mapa-ov')) _aranhasMapaFechar(); else _aranhasMapaAbrir();
  });
  ref.parentNode.insertBefore(btn, ref);
  return btn;
}

// Liga/desliga o botão conforme a masmorra (visível só dentro dela, depois de liberado o mapa).
function _aranhasMapaMostrarBotao() {
  const ativo = _aranhasMapaAtivo();
  const btn = ativo ? _aranhasMapaGarantirBotao() : document.getElementById('aranhas-mapa-toggle');
  if (btn) btn.classList.toggle('visivel', ativo);
}

// Confere o botão de tempos em tempos (o setScene troca de cena o tempo todo) e fecha o mapa em batalha/saída.
setInterval(function () {
  try {
    _aranhasMapaMostrarBotao();
    if (!_aranhasMapaAtivo() || G.inBattle) _aranhasMapaFechar();
  } catch (_) {}
}, 400);

// Tremor de tela (grito do Ygirro / caverna balançando)
function _aranhasTremer(ms) {
  if (!document.getElementById('aranhas-tremor-style')) {
    const st = document.createElement('style');
    st.id = 'aranhas-tremor-style';
    st.textContent = `@keyframes apTremor { 0%,100% { transform:translate(0,0) } 10% { transform:translate(-7px,4px) }
      25% { transform:translate(6px,-5px) } 40% { transform:translate(-5px,-4px) } 55% { transform:translate(7px,5px) }
      70% { transform:translate(-6px,3px) } 85% { transform:translate(4px,-3px) } }
      body.aranhas-tremor { animation:apTremor .35s linear infinite; }`;
    document.head.appendChild(st);
  }
  document.body.classList.add('aranhas-tremor');
  setTimeout(function () { document.body.classList.remove('aranhas-tremor'); }, ms || 1800);
}

function storyNode_aranhas_fase1() {
  _aranhasInit();
  G.aranhas.fase = 1;
  G.location = 'dungeon-aranhas';
  _aranhasCena('aranhas-ts1');
  hideEnemy();
  setStory(
    'NARRADOR',
    `A teia do selo se fecha atrás de vocês sem fazer barulho.\n\nO ar da caverna é úmido e azulado. Fios finíssimos descem do teto como chuva parada, brilhando onde a luz pálida das rochas encosta neles. O chão é de pedra molhada, e o silêncio tem peso.\n\nNa lama, as pegadas de sandália de Tsuiro seguem em frente. Só uma fileira. Nenhuma de volta.\n\nYgirro vem na retaguarda, a lança baixa. Dá pra ouvir a respiração dele.`,
    [
      { icon:'▶', text:'Avançar', action: storyNode_aranhas_fase1_b },
    ]
  );
}

function storyNode_aranhas_fase1_b() {
  _aranhasCena('aranhas-ts1');
  hideEnemy();
  setStory(
    'HIROTO',
    `\"Não toquem nos fios do teto. Passem por baixo, sem encostar.\"\n\nEla caminha de lado, a mão pousada no cabo da ${ARANHAS_ESPADA_HIROTO}, olhando cada sombra duas vezes.\n\n\"Se o Tsuiro veio por aqui sem tocar em nada, ou ele é muito sortudo, ou alguém deixou o caminho aberto pra ele.\"\n\nYgirro não responde. Ele já não está mais na retaguarda. Passou na frente de vocês dois, o passo cada vez mais rápido, os olhos fixos no fundo do túnel.\n\n\"Ygirro, espera!\"`,
    [
      { icon:'▶', text:'Avançar', action: storyNode_aranhas_fase1_teia },
    ]
  );
}

function storyNode_aranhas_fase1_teia() {
  _aranhasCena('aranhas-ts2');
  hideEnemy();
  setStory(
    'NARRADOR',
    `O túnel se estreita num corredor longo, e os fios mudam de cor. Já não são pálidos: são dourados, grossos como corda, e cintilam como se guardassem calor.\n\nYgirro pisa dentro do corredor sem ver. Os fios dourados reagem de uma vez: laçam as botas, sobem pelas pernas e o puxam do chão com um estalo seco. Em segundos, a lança longa cai tilintando e ele fica pendurado de cabeça pra cima, preso na teia de ouro.\n\n\"YGIRRO!\" grita Hiroto.\n\nO teto se mexe. Duas sombras compridas descem pelos fios, devagar, sem pressa. Dois rostos pálidos, de cabelo escuro e sorrisos cheios de presas.`,
    [
      { icon:'🕷️', text:'Enfrentar Itsuki e Kumiko', action: storyNode_aranhas_fase1_luta },
    ]
  );
}

function storyNode_aranhas_fase1_luta() {
  _aranhasCena('aranhas-ts2');
  hideEnemy();
  G._dungeonBattleCallback = function () { storyNode_aranhas_fase1_vitoria(); };
  setStory(
    'HIROTO',
    `\"Eu seguro o Ygirro!\" Ela se joga contra a teia, a lâmina já de fora, mas os fios dourados se apertam em volta do braço dela também. \"Não consigo me soltar sozinha! ${_aranhasNomeHeroi()}, segura os dois!\"\n\nAs duas aranhas se movem juntas, como um só corpo, e estalam a língua em uníssono.\n\n\"Mais um pra nossa mãe,\" diz o menino.\n\n\"Mais um pra nossa mãe,\" repete a menina, rindo.`,
    [
      { icon:'⚔️', text:'Lutar!', action: () => {
          G._dungeonBattleCallback = function () { storyNode_aranhas_fase1_vitoria(); };
          aranhasIniciarFilhos();
      } },
    ]
  );
}

function storyNode_aranhas_fase1_vitoria() {
  _aranhasInit();
  G.location = 'dungeon-aranhas';
  hideEnemy();
  // depois dos gêmeos, o cenário volta pro interior da caverna (Ts1)
  _aranhasCena('aranhas-ts1');
  setStory(
    'NARRADOR',
    `Itsuki e Kumiko tombam juntos, e os fios dourados perdem a tensão de uma vez, como corda sem mão que a segure.\n\nHiroto aproveita a folga. Gira o pulso, e a ${ARANHAS_ESPADA_HIROTO} desce em um arco limpo, tão rápido que a luz dos fios acompanha o corte um instante depois. A teia se abre ao meio, sem resistir, e Ygirro desaba no chão de pedra com um baque surdo.\n\n\"A ${ARANHAS_ESPADA_HIROTO} corta o que não se deixa cortar,\" diz ela, guardando a lâmina. \"Foi por isso que o império me deu ela.\"`,
    [
      { icon:'🤝', text:'Ajudar Ygirro a levantar', action: storyNode_aranhas_fase1_ygirro },
    ]
  );
}

function storyNode_aranhas_fase1_ygirro() {
  _aranhasCena('aranhas-ts1');
  hideEnemy();
  setStory(
    'YGIRRO',
    `Ele fica de joelhos, puxando o ar em goles curtos, a mão apertada no peito.\n\n\"Não... consigo respirar direito.\" A voz sai arranhada. \"Quando os fios me pegaram, senti eles sugando. Como se puxassem alguma coisa de dentro de mim. A força, o fôlego... a vida.\"\n\nHiroto olha pros restos da teia dourada, agora mortos e opacos.\n\n\"Então não toquem em nenhum fio dessa cor. Nenhum.\"\n\nYgirro faz que sim, apanha a lança do chão e se apoia nela, mais pálido do que antes. \"Eu aguento. Meu filho está lá na frente. Vamos.\"`,
    [
      { icon:'▶', text:'Avançar', action: storyNode_aranhas_fase1_avanco },
    ]
  );
}

function storyNode_aranhas_fase1_avanco() {
  _aranhasLiberarMapa();             // (já liberado na entrada; cobre saves antigos)
  _aranhasCena('aranhas-ts1');
  hideEnemy();
  setStory(
    'NARRADOR',
    `Vocês seguem mais um pouco, em silêncio, cada um vigiando o teto do outro.\n\nO túnel desce. A luz azulada fica mais densa, quase palpável, e o ar passa a ter gosto de ferro. Há um zumbido no fundo das rochas, constante, como um coração batendo debaixo do chão.\n\nDepois de uma curva, o corredor se abre: o núcleo do ninho.\n\nO mapa, no canto da tela, já marca o núcleo. Um pin pulsa no fundo do corredor.`,
    [
      { icon:'▶', text:'Avançar', action: () => {
          if (typeof irPin === 'function') irPin();
      } },
    ]
  );
  _aranhasMapaMostrarBotao();
  // pin: toque nele (ou no botão) pra avançar de local
  var irPin = _aranhasPin({
    rotulo: 'NÚCLEO DO NINHO',
    aoTocar: storyNode_aranhas_nucleo1,
  });
}

function storyNode_aranhas_nucleo1() {
  _aranhasCena('aranhas-nucleo');
  hideEnemy();
  setStory(
    'NARRADOR',
    `É aqui que fica a base de Tsumugi.\n\nA câmara é enorme, tecida de cima a baixo em seda cinza, e no centro pulsa um casulo do tamanho de uma casa. Ao redor dele, jogados no chão como restos de uma refeição, há corpos. Pedaços de corpos. Braços de aldeões ainda de mangas bordadas, sandálias soltas, cabelos presos em fios.\n\nNinguém fala. Nem Hiroto.\n\nÉ Ygirro quem vê primeiro. Entre os pedaços, uma sandália que ele conhece. Uma faixa que ele ensinou a amarrar. Uma lança curta, partida no meio.\n\nEle dá um passo. Depois outro. E olha o estado do filho.`,
    [
      { icon:'💔', text:'Ver Ygirro', action: storyNode_aranhas_nucleo2 },
    ]
  );
}

function storyNode_aranhas_nucleo2() {
  _aranhasCena('aranhas-nucleo');
  hideEnemy();
  setStory(
    'NARRADOR',
    `Ygirro fica paralisado. A lança escorrega da mão e bate na pedra sem que ele pareça notar.\n\nPor um segundo longo, não existe som algum. Então o peito dele sobe, inteiro, e a garganta solta o que estava guardado há anos.\n\n\"TSUMUGIIIIIIIIIIII!!!!!!!!!\"`,
    [
      { icon:'😱', text:'...', action: storyNode_aranhas_nucleo3 },
    ]
  );
  _aranhasTremer(2200);
}

function storyNode_aranhas_nucleo3() {
  _aranhasCena('aranhas-nucleo');
  hideEnemy();
  setStory(
    'NARRADOR',
    `A caverna treme. Poeira e fios caem do teto em cortinas, e o casulo no centro se contrai, como se tivesse escutado.\n\nYgirro apanha a lança e corre. Hiroto grita o nome dele, e ele não escuta. Corre em direção à silhueta que se ergue por trás do casulo, a Rainha Aranha, alta e fina, de olhos meio fechados, sem pressa nenhuma.\n\nEle salta, a lança em riste, o grito ainda na garganta.\n\nUm único movimento. Nem dá pra ver a mão dela. Um corte horizontal atravessa o ar, e Ygirro é lançado como um boneco de pano contra a parede da câmara, e bate com tudo.\n\nA pedra racha. Ele escorrega até o chão e não se mexe.`,
    [
      { icon:'👁️', text:'Olhar a Rainha', action: storyNode_aranhas_nucleo4 },
    ]
  );
}

function storyNode_aranhas_nucleo4() {
  _aranhasCena('aranhas-nucleo');
  hideEnemy();
  setStory(
    'KAGERŌ',
    `Do alto do casulo, uma voz jovem e entediada desce junto com um novo vulto, o terceiro filho de Tsumugi, Kagerō, ainda úmido de seda, a postura de quem acabou de nascer sabendo exatamente o que fazer.\n\n\"Idiota.\" Ele olha pra Ygirro caído, depois pro teto que ainda solta poeira. \"Vocês vão derrubar a caverna desse jeito.\"\n\nA Rainha vira o rosto devagar, e a mão dela ainda pinga.`,
    [
      { icon:'🕷️', text:'Ver o que ele vai fazer', action: storyNode_aranhas_nucleo5 },
      { icon:'🏘️', text:'Sair (teste)', action: () => window.aranhasSairDaMasmorra('fuga') },
    ]
  );
}

function storyNode_aranhas_nucleo5() {
  _aranhasCena('aranhas-nucleo');
  hideEnemy();
  setStory(
    'NARRADOR',
    `Kagerō, o terceiro filho, desce do casulo sem pressa e caminha direto até Ygirro, caído junto à parede rachada. Cada passo dele estala na seda do chão.\n\nEle para na frente do corpo imóvel e ergue a mão, as garras abertas. Não é raiva. É só o jeito de quem vai terminar uma tarefa.\n\nVocê tenta correr, mas não chega a tempo.\n\nUm clangor seco enche a câmara. Faíscas voam. A ${ARANHAS_ESPADA_HIROTO} está atravessada entre as garras e o Ygirro, e Hiroto, plantada no meio, segura o golpe com os dois braços tremendo.`,
    [
      { icon:'🗡️', text:'Ver Hiroto segurar', action: storyNode_aranhas_nucleo6 },
    ]
  );
}

function storyNode_aranhas_nucleo6() {
  _aranhasCena('aranhas-nucleo');
  hideEnemy();
  setStory(
    'HIROTO',
    `"Nem pense nisso." A voz sai entre os dentes, firme. "Quem quiser encostar no meu mestre vai ter que passar por mim."\n\nKagerō inclina a cabeça, mais irritado que surpreso.\n\n"Que incômodo. Eu só queria acabar logo com isso."\n\nHiroto empurra a lâmina e o faz recuar um passo. Ela nem olha pra trás.\n\n"Eu seguro esse aqui! ${_aranhasNomeHeroi()}, não olha pra mim. Olha pra frente!"`,
    [
      { icon:'👁️', text:'Olhar para a frente', action: storyNode_aranhas_nucleo7 },
    ]
  );
}

function storyNode_aranhas_nucleo7() {
  _aranhasCena('aranhas-teia');
  hideEnemy();
  setStory(
    'NARRADOR',
    `Do outro lado da câmara, junto ao casulo, uma criatura de pernas longas e escuras está debruçada sobre o filho de Ygirro. Ela não se mexe quando o choque das lâminas ecoa. Só vira a cabeça devagar na sua direção.\n\nO sangue sobe à cabeça. Você aperta a arma e parte pra cima dela, sem esperar mais nada.`,
    [
      { icon:'⚔️', text:'Atacar a criatura', action: storyNode_aranhas_nucleo8 },
      { icon:'🏘️', text:'Sair (teste)', action: () => window.aranhasSairDaMasmorra('fuga') },
    ]
  );
}

function storyNode_aranhas_nucleo8() {
  _aranhasCena('aranhas-solto');
  hideEnemy();
  setStory(
    'NARRADOR',
    `Você investe antes que a criatura reaja. A lâmina passa rente ao corpo dela e corta os fios grossos que prendiam o filho de Ygirro ao casulo.\n\nA criatura, Tsukumo, o segundo filho de Tsumugi, recua com um chiado, as patas longas arranhando a pedra.\n\nOs fios soltam. Tsuiro cai de joelhos no chão, vivo, tossindo, e tenta se levantar apoiado num pedaço da própria lança.`,
    [
      { icon:'👀', text:'Olhar para Tsuiro', action: storyNode_aranhas_nucleo9 },
    ]
  );
}

function storyNode_aranhas_nucleo9() {
  _aranhasCena('aranhas-solto');
  hideEnemy();
  setStory(
    'TSUIRO',
    `"Eu... ouvi meu pai gritar."\n\nEle olha pro canto da câmara, onde Ygirro está caído, e pro choque de lâminas de Hiroto ao fundo. O rosto dele muda.\n\n"Vocês vieram mesmo. Ele não tinha como enfrentar isso sozinho."\n\nTsuiro se coloca ao seu lado, o pedaço de lança em guarda, as pernas ainda tremendo.`,
    [
      { icon:'🤝', text:'Ficar lado a lado com Tsuiro', action: storyNode_aranhas_nucleo10 },
    ]
  );
}

function storyNode_aranhas_nucleo10() {
  _aranhasCena('aranhas-trono');
  hideEnemy();
  setStory(
    'NARRADOR',
    `De repente o choque das lâminas para.\n\nTsukumo e Kagerō se afastam sem que ninguém mande, abrindo caminho. Hiroto, ofegante, mantém a ${ARANHAS_ESPADA_HIROTO} erguida, sem entender.\n\nDo alto do casulo, a Rainha Aranha desce um degrau de seda. Ela não corre, não grita. Só observa vocês, um por um, enquanto os fios do teto vibram em silêncio.`,
    [
      { icon:'👁️', text:'Encarar a Rainha', action: storyNode_aranhas_nucleo11 },
    ]
  );
}

function storyNode_aranhas_nucleo11() {
  _aranhasCena('aranhas-trono');
  hideEnemy();
  setStory(
    'TSUMUGI',
    `"Por quê?"\n\nA voz não é alta, mas faz a seda do teto tremer.\n\n"Por que tudo isso? Vocês entram na minha casa, cortam os meus fios, derrubam os meus filhos. Tudo por um punhado de aldeões que já eram meus antes de vocês chegarem?"`,
    [
      { icon:'👂', text:'Ouvir a Rainha', action: storyNode_aranhas_nucleo12 },
    ],
    'Imagens/personagens/tsumugiBa.png'
  );
}

function storyNode_aranhas_nucleo12() {
  _aranhasCena('aranhas-trono');
  hideEnemy();
  setStory(
    'TSUMUGI',
    `"Não havia necessidade de chegar a esse ponto."\n\nEla desce mais um degrau. Cada pata toca o chão como um martelo.\n\n"Eu devolveria todos eles pra cidade. Um por um, de volta pras casas deles. Só não sei..." Ela inclina a cabeça, os lábios se abrem num sorriso fino. "...se com vida."\n\nA risada vem em seguida, grave, e a câmara inteira treme junto com ela.`,
    [
      { icon:'😨', text:'Aguentar o riso', action: storyNode_aranhas_nucleo13 },
    ],
    'Imagens/personagens/tsumugiBa.png'
  );
}

function storyNode_aranhas_nucleo13() {
  _aranhasCena('aranhas-trono');
  hideEnemy();
  setStory(
    'TSUMUGI',
    `O riso morre devagar. Os olhos vermelhos dela param em você.\n\n"Você é bem forte, né?"\n\nEla se inclina até você sentir o ar frio do corpo dela. Olha dentro dos seus olhos, sem piscar, como quem escolhe onde morder.`,
    [
      { icon:'👁️', text:'Encarar o olhar dela', action: () => window.aranhasOlharHaki(storyNode_aranhas_nucleo14) },
    ],
    'Imagens/personagens/tsumugiBa.png'
  );
}

function storyNode_aranhas_nucleo14() {
  _aranhasCena('aranhas-trono');
  hideEnemy();
  setStory(
    'NARRADOR',
    `O ar fica pesado de repente. A pele arrepia, os joelhos querem dobrar e, por um instante, o corpo inteiro esquece como se mexe.\n\nAtrás de você, Hiroto aperta a espada com as duas mãos e Tsuiro dá um passo pra trás, a respiração presa. Mas você firma os pés e segura o olhar dela.\n\nTsumugi sorri de leve.`,
    [
      { icon:'⚔️', text:'Enfrentar Tsumugi', action: storyNode_aranhas_boss_tsumugi },
      { icon:'🏘️', text:'Sair (teste)', action: () => window.aranhasSairDaMasmorra('fuga') },
    ]
  );
}

// ─────────────────────────────────────────────────────────────
//  EFEITO DO OLHAR DA TSUMUGI (estilo Haki do Rei, One Piece)
//  Flash branco → vermelho, anéis de choque, raios pretos com borda
//  vermelha, tela tremendo e a imagem olhu.png surgindo e pulsando.
//  Fecha sozinho em ~3,6 s (ou ao tocar, depois de 1,4 s) e chama aoFechar.
//  Para testar no console:  aranhasOlharHaki(() => console.log('fim'));
// ─────────────────────────────────────────────────────────────
const ARANHAS_OLHAR_IMG = 'Imagens/Vila de Tsumugi/olhu.png';

function _aranhasInjetarCssHaki() {
  if (document.getElementById('aranhas-haki-css')) return;
  const st = document.createElement('style'); st.id = 'aranhas-haki-css';
  st.textContent = `
    #aranhas-haki{position:fixed;inset:0;z-index:100001;overflow:hidden;background:radial-gradient(ellipse at 50% 48%,rgba(60,0,0,.55) 0%,#000 78%);
      animation:hkIn .35s ease-out both;-webkit-tap-highlight-color:transparent;}
    #aranhas-haki.out{animation:hkOut .5s ease-in forwards;}
    #aranhas-haki .hk-stage{position:absolute;inset:0;animation:hkShake .09s linear infinite;}
    #aranhas-haki.calmo .hk-stage{animation:hkShakeLeve .22s linear infinite;}
    #aranhas-haki .hk-flash{position:absolute;inset:0;background:#fff;opacity:0;animation:hkFlash .7s ease-out both;pointer-events:none;}
    #aranhas-haki .hk-ring{position:absolute;left:50%;top:48%;width:24px;height:24px;border-radius:50%;border:3px solid rgba(255,45,45,.85);
      box-shadow:0 0 28px rgba(255,0,0,.8),inset 0 0 18px rgba(255,0,0,.6);transform:translate(-50%,-50%) scale(0);opacity:0;animation:hkRing 1.7s ease-out infinite;}
    #aranhas-haki .r2{animation-delay:.55s}#aranhas-haki .r3{animation-delay:1.1s}
    #aranhas-haki .hk-bolts{position:absolute;inset:0;width:100%;height:100%;filter:drop-shadow(0 0 3px #f00) drop-shadow(0 0 8px #a00);}
    #aranhas-haki .hk-bolts polyline{fill:none;stroke:#000;stroke-width:.9;stroke-linejoin:bevel;opacity:0;animation:hkBolt .5s steps(1) infinite;}
    #aranhas-haki .hk-eyes{position:absolute;left:50%;top:46%;width:min(96vw,560px);transform:translate(-50%,-50%) scale(.7);opacity:0;
      mix-blend-mode:screen;filter:drop-shadow(0 0 26px #f00) contrast(1.2) saturate(1.3);animation:hkEyes 3.6s ease-out forwards;}
    #aranhas-haki .hk-text{position:absolute;left:0;right:0;bottom:14%;text-align:center;color:#ffb3b3;font:600 .95rem/1.4 'Noto Serif JP',Georgia,serif;
      letter-spacing:.12em;text-shadow:0 0 12px #f00;opacity:0;animation:hkTxt .9s ease-out 1.3s forwards;padding:0 24px;}
    @keyframes hkIn{from{opacity:0}to{opacity:1}}
    @keyframes hkOut{to{opacity:0}}
    @keyframes hkFlash{0%{opacity:1;background:#fff}25%{opacity:.95;background:#ff3030}100%{opacity:0;background:#900}}
    @keyframes hkRing{0%{transform:translate(-50%,-50%) scale(0);opacity:.95}100%{transform:translate(-50%,-50%) scale(70);opacity:0}}
    @keyframes hkBolt{0%{opacity:0}20%{opacity:1}35%{opacity:0}60%{opacity:1}75%{opacity:0}}
    @keyframes hkEyes{0%{opacity:0;transform:translate(-50%,-50%) scale(.7)}18%{opacity:1}55%{transform:translate(-50%,-50%) scale(1.02)}100%{opacity:1;transform:translate(-50%,-50%) scale(1.14)}}
    @keyframes hkTxt{to{opacity:1}}
    @keyframes hkShake{0%{transform:translate(0,0)}25%{transform:translate(-5px,3px)}50%{transform:translate(4px,-4px)}75%{transform:translate(-3px,-2px)}100%{transform:translate(3px,4px)}}
    @keyframes hkShakeLeve{0%{transform:translate(0,0)}50%{transform:translate(2px,-1px)}100%{transform:translate(-2px,1px)}}
    @media (prefers-reduced-motion:reduce){#aranhas-haki .hk-stage,#aranhas-haki.calmo .hk-stage{animation:none}#aranhas-haki .hk-ring{display:none}#aranhas-haki .hk-bolts polyline{animation:none;opacity:.8}}
  `;
  document.head.appendChild(st);
}

window.aranhasOlharHaki = function (aoFechar) {
  _aranhasInjetarCssHaki();
  const velho = document.getElementById('aranhas-haki'); if (velho) velho.remove();
  const ov = document.createElement('div'); ov.id = 'aranhas-haki';
  // raios pretos com borda vermelha (coordenadas em % da tela), cada um com atraso próprio
  const raios = [
    '2,8 14,22 9,34 22,46 15,60', '98,6 84,20 90,33 76,47 83,62', '30,0 36,14 28,24 40,38', '70,0 62,16 71,26 60,40',
    '0,70 16,76 12,86 28,92', '100,72 84,80 90,88 72,96',
  ];
  ov.innerHTML = '<div class="hk-stage"><div class="hk-flash"></div>' +
    '<div class="hk-ring"></div><div class="hk-ring r2"></div><div class="hk-ring r3"></div>' +
    '<svg class="hk-bolts" viewBox="0 0 100 100" preserveAspectRatio="none">' +
    raios.map(function (pts, i) { return '<polyline points="' + pts + '" style="animation-delay:' + (i * 0.13).toFixed(2) + 's;animation-duration:' + (0.42 + (i % 3) * 0.11).toFixed(2) + 's"/>'; }).join('') +
    '</svg>' +
    '<img class="hk-eyes" src="' + ARANHAS_OLHAR_IMG + '" alt="" onerror="this.style.display=\'none\'">' +
    '<div class="hk-text">O olhar dela pesa sobre você.</div></div>';
  document.body.appendChild(ov);
  if (typeof _aranhasTremer === 'function') { try { _aranhasTremer(2600); } catch (_) {} }
  try { if (navigator.vibrate) navigator.vibrate([90, 40, 180, 40, 320]); } catch (_) {}
  setTimeout(function () { ov.classList.add('calmo'); }, 1500);   // a tremedeira diminui depois do impacto
  const t0 = Date.now(); let fechado = false;
  function fechar() {
    if (fechado) return; fechado = true;
    ov.classList.add('out');
    setTimeout(function () { ov.remove(); if (typeof aoFechar === 'function') aoFechar(); }, 500);
  }
  setTimeout(fechar, 3600);
  ov.addEventListener('click', function () { if (Date.now() - t0 > 1400) fechar(); });
};
window.aranhasTestarHaki = function () { window.aranhasOlharHaki(function () { console.log('[Haki] fim'); }); };

// ─────────────────────────────────────────────────────────────
//  BOSS — TSUMUGI, A RAINHA ARANHA (2 formas)
//  Forma 1 = tsumugiBa.png (robusta, venenosa).
//  Forma 2 = tsumugiFina.png (estilo Elden Ring: golpes carregados,
//            combos, drenos e fúria). Ao zerar o HP da forma 1 a luta
//            NÃO acaba: toca a transição, o HP enche de novo e a forma 2
//            assume (mesmo truque do multi_enemy_battle.js no endBattle).
//
//  STATUS — todos acima do MAIOR valor de cada atributo entre os bosses
//  (Kappa HP 5500 · Hi-no-Kagutsuchi ATK 200 · Lorde das Sombras DEF 175 ·
//   Eir SPD 85). Pra balancear, mexa só em TSU_FORMAS e TSU_VENENO abaixo.
//  O boss da Tengu (Raijin-Ko) não estava nos arquivos enviados.
//
//  Moveset base (o Amazon vai refinar depois):
//   FORMA 1  Garra Peçonhenta · Mordida Peçonhenta (veneno garantido) ·
//            Teia Dourada Drenante (rouba HP e cura ela) · Casulo de Seda
//            (DEF +20%, acumula até 2x) · Chuva de Agulhas (3 golpes)
//   FORMA 2  Dança das Oito Pernas (4 golpes) · Fios Ilusórios (ATK −25%) ·
//            Abraço de Seda (agarra e drena) · Névoa Carmesim (veneno forte) ·
//            Tear da Execução (carrega 1 turno e depois bate muito forte) ·
//            Fúria da Rainha (abaixo de 40% HP: ATK +20% e golpe extra todo turno)
//  Veneno acumulativo: cada novo veneno em cima do anterior soma +3% do HP
//  máx. por turno, até 25%.
//  Para testar no console:  aranhasTestarTsumugi();
// ─────────────────────────────────────────────────────────────

const ARANHAS_FILHO3 = 'Kagerō';   // 3º filho da Tsumugi (luta com a Hiroto no Braço Direito)

const TSU_FORMAS = {
  1: { nome: 'Tsumugi, a Rainha Aranha',   img: 'Imagens/personagens/tsumugiBa.png',
       hp: 7500, atk: 230, def: 180, spd: 95,  crit: 0.25, critMult: 2.0 },
  2: { nome: 'Tsumugi, a Tecelã Carmesim', img: 'Imagens/personagens/tsumugiFina.png',
       hp: 9500, atk: 275, def: 205, spd: 120, crit: 0.30, critMult: 2.2 },
};
const TSU_VENENO = {
  f1: { pct: 0.10, turns: 3 },
  f2: { pct: 0.14, turns: 4 },
  passo: 0.03,   // soma por veneno acumulado
  teto:  0.25,   // máximo do HP máx. do jogador por turno
};
const TSU_FALAS = {
  1: ['"Ajoelhe-se diante da sua rainha."', '"Meus fios já estão em você."', '"Que adorável. Você ainda tenta."'],
  2: ['"Eu não vou deixar nenhum de vocês sair daqui."', '"Isso é tudo o que você tem?"', '"Mais perto. Eu quero ver o seu rosto."'],
};

let _tsuEstado = null;   // estado da luta (não vai pro save)

function _tsuNovoEstado() {
  return { ativo: true, fase: 1, turno: 0, cd: {}, defStacks: [], carga: 0,
           furia: false, atkAmt: 0, atkTurns: 0, venenoPct: 0, transicionando: false };
}
function _tsuIniciar(e) {
  _tsuEstado = _tsuNovoEstado();
  const f = TSU_FORMAS[1];
  e.maxHp = f.hp; e.hp = f.hp; e.atk = f.atk; e.baseDef = f.def; e.def = f.def; e.spd = f.spd;
  e.critChance = f.crit; e.critMult = f.critMult;
}
function _tsuLog(msg, cor) { if (typeof appendBattleLog === 'function') appendBattleLog(msg, cor || '#c0a0ff'); }
function _tsuFloat(alvo, v, tipo) { if (typeof showFloatingNumber === 'function') showFloatingNumber(alvo, v, tipo); }
function _tsuBadges() { if (typeof buildStatusBadges === 'function') buildStatusBadges(); }

function _tsuDefAtual(t, e) {
  const soma = t.defStacks.reduce(function (a, b) { return a + b.pct; }, 0);
  return Math.round((e.baseDef || e.def) * (1 + soma));
}
function _tsuSortear(lista) {
  const total = lista.reduce(function (a, x) { return a + x[1]; }, 0);
  let r = Math.random() * total;
  for (let i = 0; i < lista.length; i++) { r -= lista[i][1]; if (r <= 0) return lista[i][0]; }
  return lista[lista.length - 1][0];
}
function _tsuRestaurarAtk(bs, p) {
  const t = _tsuEstado;
  if (!t || !p) return;
  if (t.atkAmt) { p.atk += t.atkAmt; t.atkAmt = 0; }
  t.atkTurns = 0;
  _tsuBadges();
}
function _tsuCurar(bs, e, qtd) {
  const max = bs.enemyMaxHp || e.maxHp;
  const antes = bs.enemyHp;
  bs.enemyHp = Math.min(max, bs.enemyHp + qtd);
  e.hp = bs.enemyHp;
  const c = bs.enemyHp - antes;
  if (c > 0) _tsuFloat('enemy', c, 'heal');
  return c;
}

// Golpe com dano normal do jogo (calcEnemyDmg) + crítico próprio
function _tsuGolpe(bs, p, e, mult, rotulo, cor) {
  if (p.hp <= 0) return null;
  const crit = Math.random() < (e.critChance || 0.25);
  let d = Math.floor(calcEnemyDmg(e, p, bs, mult));
  if (crit) d = Math.floor(d * (e.critMult || 2));
  d = Math.max(1, d);
  if (window.bracoDireito) d = Math.max(1, Math.floor(d * window.bracoDireito.protecaoMult()));   // resgate da Hiroto
  applyDmgToPlayer(d, bs, p);
  _tsuLog(rotulo + ' -' + d + ' HP' + (crit ? ' — CRÍTICO' : '') + '!', crit ? '#ff4040' : (cor || '#c0a0ff'));
  _tsuFloat('hero', d, crit ? 'crit' : 'dmg');
  if (typeof flashDamage === 'function') flashDamage('hero');
  if (typeof animHeroHit === 'function') animHeroHit();
  return { d: d, crit: crit };
}

// Veneno acumulativo (usa os mesmos campos do veneno dos gêmeos)
function _tsuEnvenenar(bs, p, forma) {
  const t = _tsuEstado, cfg = TSU_VENENO['f' + forma];
  const jaEnvenenado = bs.playerPoisoned && (bs.playerPoisonTurns || 0) > 0;
  t.venenoPct = jaEnvenenado ? Math.min(TSU_VENENO.teto, (t.venenoPct || cfg.pct) + TSU_VENENO.passo) : cfg.pct;
  bs.playerPoisoned = true;
  bs.playerPoisonTurns = Math.max(bs.playerPoisonTurns || 0, cfg.turns);
  bs._playerPoisonDmgOverride = Math.max(1, Math.round(p.maxHp * t.venenoPct));
  _tsuFloat('hero', '☠ VENENO', 'status');
  _tsuLog('☠ Veneno de Tsumugi: ' + Math.round(t.venenoPct * 100) + '% do seu HP máx. por turno (' + bs.playerPoisonTurns + ' turnos)!', '#7ddc7d');
  _tsuBadges();
}

function _tsuDreno(bs, p, e, pctPlayer, pctCura, nome) {
  if (p.hp <= 0) return;
  let d = Math.max(1, Math.floor(p.maxHp * pctPlayer));
  if (window.bracoDireito) d = Math.max(1, Math.floor(d * window.bracoDireito.protecaoMult()));
  applyDmgToPlayer(d, bs, p);
  const cura = Math.floor((bs.enemyMaxHp || e.maxHp) * pctCura);
  _tsuLog('🕸️ ' + nome + '! Ela drena -' + d + ' HP seus e recupera ' + cura + ' HP.', '#ffd070');
  _tsuFloat('hero', d, 'dmg');
  if (typeof flashDamage === 'function') flashDamage('hero');
  _tsuCurar(bs, e, cura);
}

function _tsuTurnoF1(bs, p, e, t) {
  const op = [['garra', 30]];
  if (!t.cd.mordida)  op.push(['mordida', 22]);
  if (!t.cd.dreno)    op.push(['dreno', 18]);
  if (!t.cd.agulhas)  op.push(['agulhas', 18]);
  if (!t.cd.carapaca && t.defStacks.length < 2) op.push(['carapaca', 14]);
  const a = _tsuSortear(op);

  if (a === 'garra') {
    const r = _tsuGolpe(bs, p, e, 1.0, '🕷️ Garra Peçonhenta de Tsumugi', '#c0a0ff');
    if (r && Math.random() < 0.45) _tsuEnvenenar(bs, p, 1);
  } else if (a === 'mordida') {
    t.cd.mordida = 3;
    const r = _tsuGolpe(bs, p, e, 1.5, '🦷 Mordida Peçonhenta', '#9be37a');
    if (r) _tsuEnvenenar(bs, p, 1);
  } else if (a === 'dreno') {
    t.cd.dreno = 3;
    _tsuDreno(bs, p, e, 0.09, 0.03, 'Teia Dourada Drenante');
  } else if (a === 'agulhas') {
    t.cd.agulhas = 3;
    _tsuLog('🪡 Tsumugi dispara a Chuva de Agulhas!', '#c0a0ff');
    for (let i = 0; i < 3; i++) {
      const r = _tsuGolpe(bs, p, e, 0.55, '🪡 Agulha ' + (i + 1), '#c0a0ff');
      if (r && Math.random() < 0.20) _tsuEnvenenar(bs, p, 1);
    }
  } else if (a === 'carapaca') {
    t.cd.carapaca = 4;
    t.defStacks.push({ pct: 0.20, turns: 3 });
    e.def = _tsuDefAtual(t, e);
    if (bs.enemyData) bs.enemyData.def = e.def;
    _tsuLog('🕸️ Tsumugi se cobre com o Casulo de Seda! DEF +20% por 3 turnos (DEF ' + e.def + ').', '#c0a0ff');
    _tsuFloat('enemy', '🕸️ DEF+', 'status');
  }
}

function _tsuTurnoF2(bs, p, e, t) {
  // Tear da Execução: carregou no turno anterior → solta agora
  if (t.carga > 0) {
    t.carga = 0; t.cd.execucao = 7;
    _tsuLog('☠️ TEAR DA EXECUÇÃO!', '#ff4040');
    const r = _tsuGolpe(bs, p, e, 3.0, '☠️ Os fios cortam tudo à frente', '#ff4040');
    if (r) _tsuEnvenenar(bs, p, 2);
    return 'carga';
  }
  const op = [['garra', 20], ['danca', 28]];
  if (!t.cd.fios)      op.push(['fios', 16]);
  if (!t.cd.abraco)    op.push(['abraco', 16]);
  if (!t.cd.nevoa)     op.push(['nevoa', 14]);
  if (!t.cd.execucao)  op.push(['carregar', 22]);
  const a = _tsuSortear(op);

  if (a === 'garra') {
    const r = _tsuGolpe(bs, p, e, 1.1, '🕷️ Golpe de Tsumugi', '#c0a0ff');
    if (r && Math.random() < 0.50) _tsuEnvenenar(bs, p, 2);
  } else if (a === 'danca') {
    _tsuLog('🕷️ Tsumugi ataca com a Dança das Oito Pernas!', '#c0a0ff');
    let envenenou = false;
    for (let i = 0; i < 4; i++) {
      const r = _tsuGolpe(bs, p, e, 0.6, '🦵 Perna ' + (i + 1), '#c0a0ff');
      if (r && !envenenou && Math.random() < 0.25) { _tsuEnvenenar(bs, p, 2); envenenou = true; }
    }
  } else if (a === 'fios') {
    t.cd.fios = 4;
    const r = _tsuGolpe(bs, p, e, 0.8, '🕸️ Fios Ilusórios', '#c0a0ff');
    if (r && !(t.atkTurns > 0)) {
      const amt = Math.max(1, Math.floor(p.atk * 0.25));
      p.atk -= amt; t.atkAmt = amt; t.atkTurns = 2;
      _tsuLog('🕸️ Os fios prendem seus braços! Seu ATK −' + amt + ' (−25%) por 2 turnos.', '#c0a0ff');
      _tsuFloat('hero', '🕸️ ATK−', 'status');
      _tsuBadges();
    }
  } else if (a === 'abraco') {
    t.cd.abraco = 4;
    _tsuLog('🫂 Tsumugi te agarra com os fios e puxa você pra perto!', '#ffd070');
    const r = _tsuGolpe(bs, p, e, 1.9, '🫂 Abraço de Seda', '#ffd070');
    if (r) _tsuDreno(bs, p, e, 0.06, 0.02, 'O Abraço aperta');
  } else if (a === 'nevoa') {
    t.cd.nevoa = 5;
    _tsuLog('☁️ Uma névoa carmesim sobe do chão!', '#9be37a');
    const r = _tsuGolpe(bs, p, e, 0.8, '☁️ Névoa Carmesim', '#9be37a');
    if (r) { _tsuEnvenenar(bs, p, 2); _tsuEnvenenar(bs, p, 2); }
  } else if (a === 'carregar') {
    t.carga = 1;
    _tsuLog('⚠️ Tsumugi ergue os oito braços e começa a tecer algo enorme... O próximo golpe vai ser devastador!', '#ffb040');
    _tsuFloat('enemy', '⚠️ CARREGANDO', 'status');
    return 'carga';
  }
}

function _tsuAgir(bs, p, e) {
  let t = _tsuEstado;
  if (!t || !t.ativo) { _tsuIniciar(e); t = _tsuEstado; }
  t.turno++;
  Object.keys(t.cd).forEach(function (k) { if (t.cd[k] > 0) t.cd[k]--; });
  t.defStacks.forEach(function (b) { b.turns--; });
  t.defStacks = t.defStacks.filter(function (b) { return b.turns > 0; });
  e.def = _tsuDefAtual(t, e);
  if (bs.enemyData) bs.enemyData.def = e.def;

  // Teia/fios no jogador: contagem de turnos
  if (t.atkTurns > 0) {
    t.atkTurns--;
    if (t.atkTurns <= 0) { _tsuRestaurarAtk(bs, p); _tsuLog('🕸️ Os fios se soltam — seu ATK volta ao normal.', '#c0a0ff'); }
  }

  // Fúria da Rainha (forma 2, abaixo de 40% do HP, uma vez)
  const maxHp = bs.enemyMaxHp || e.maxHp;
  if (t.fase === 2 && !t.furia && bs.enemyHp / maxHp <= 0.40) {
    t.furia = true;
    e.atk = Math.round(e.atk * 1.20);
    _tsuLog('🔥 FÚRIA DA RAINHA! Tsumugi solta um grito que racha as paredes. ATK +20% e um golpe extra por turno!', '#ff4040');
    _tsuFloat('enemy', '🔥 FÚRIA', 'status');
    if (typeof _aranhasTremer === 'function') _aranhasTremer(1500);
  }

  // Provocação ocasional
  if (Math.random() < 0.18) {
    const falas = TSU_FALAS[t.fase];
    _tsuLog('👑 Tsumugi: ' + falas[Math.floor(Math.random() * falas.length)], '#d9b8ff');
  }

  const r = (t.fase === 1) ? _tsuTurnoF1(bs, p, e, t) : _tsuTurnoF2(bs, p, e, t);

  // Fúria: golpe extra em todo turno (menos quando só carregou)
  if (t.furia && r !== 'carga' && p.hp > 0) {
    _tsuGolpe(bs, p, e, 0.5, '🔥 Fio Cortante (combo da Fúria)', '#ff6a40');
  }

  e.hp = bs.enemyHp;
  if (window.bracoDireito) window.bracoDireito.fimTurnoBoss();   // conta os turnos da proteção da Hiroto
  if (typeof updateHUD === 'function') updateHUD();
  if (typeof updateBattleHUD === 'function') updateBattleHUD();
}

// ── Transição forma 1 → forma 2 ─────────────────────────────
function _tsuTransicao() {
  const t = _tsuEstado;
  if (!t) return;
  t.transicionando = true;
  if (window.bracoDireito) window.bracoDireito.pausar(true);   // a luta da Hiroto espera a cena
  _tsuRestaurarAtk(battleState, G.player);
  if (typeof _aranhasTremer === 'function') _aranhasTremer(2400);
  _aranhasPopupTelaCheia({
    titulo: 'A SEGUNDA FORMA',
    fundo: ARANHAS_FUNDO_FORMA2,
    texto: 'Tsumugi cai de joelhos, e a seda do corpo dela racha como casca seca.\n\nAs costas se abrem. Oito patas finas, vermelhas como brasa, rasgam a carne e se firmam no chão. A coroa de fios se desfaz, e os olhos, antes meio fechados, se abrem de uma vez.\n\n"Você me obrigou a mostrar isso."\n\nO ninho inteiro prende a respiração.',
    dica: 'Toque para continuar',
    aoFechar: _tsuAplicarForma2,
  });
}

function _tsuAplicarForma2() {
  const t = _tsuEstado, bs = battleState;
  if (!t || !bs) return;
  const f = TSU_FORMAS[2], e = bs.enemyData || {};
  t.fase = 2; t.turno = 0; t.cd = {}; t.defStacks = []; t.carga = 0; t.furia = false; t.transicionando = false;
  if (window.bracoDireito) window.bracoDireito.pausar(false);
  e.name = f.nome; e.img = f.img; e.hp = f.hp; e.maxHp = f.hp; e.atk = f.atk;
  e.baseDef = f.def; e.def = f.def; e.spd = f.spd; e.critChance = f.crit; e.critMult = f.critMult;
  bs.enemyHp = f.hp; bs.enemyMaxHp = f.hp;
  bs._battleEnded = false;

  try { const pre = new Image(); pre.src = f.img; } catch (_) {}
  // a batalha usa uma CÓPIA do inimigo (enemyData); o inimigo "atual" da cena é outro objeto
  try {
    const cur = G.currentEnemy;
    if (cur && cur !== e) { cur.name = f.nome; cur.img = f.img; cur.maxHp = f.hp; cur.hp = f.hp; }
  } catch (_) {}
  const nameEl = document.getElementById('bat-enemy-name');
  if (nameEl) nameEl.textContent = f.nome;
  const batIcon = document.getElementById('bat-enemy-icon');
  if (batIcon && typeof buildEnemyVisual === 'function') batIcon.innerHTML = buildEnemyVisual(e, 112, 'idle');
  try { if (typeof showEnemy === 'function') showEnemy(e); } catch (_) {}

  _tsuDevolverTurno();
  _tsuLog('👑 ' + f.nome + ' assume a SEGUNDA FORMA! HP restaurado: ' + f.hp + '.', '#ff4040');
}

// Devolve o turno ao jogador sem encerrar a luta (mesmo passo do multi_enemy_battle.js)
function _tsuDevolverTurno() {
  const bs = battleState;
  bs._battleEnded = false;
  bs.phase = 'player';
  if (typeof setBattleButtons === 'function') setBattleButtons(true);
  if (typeof buildSkillList === 'function') buildSkillList();
  if (typeof updateBattleHUD === 'function') updateBattleHUD();
  if (typeof updateBattleTurnIndicator === 'function') updateBattleTurnIndicator('player');
  if (typeof setHeroAnim === 'function') setHeroAnim('idle');
}

// Braço Direito: o filho da Tsumugi sustenta a Rainha enquanto estiver de pé.
// Ela não morre: fica com um fiapo de HP até a Hiroto derrubar o filho.
function _tsuProtegerRainha() {
  const bs = battleState, e = bs.enemyData || {};
  const max = bs.enemyMaxHp || e.maxHp || 1;
  bs.enemyHp = Math.max(1, Math.ceil(max * 0.03));
  e.hp = bs.enemyHp;
  _tsuLog('🕸️ Os fios do filho sustentam a Rainha! Ela não cai enquanto ele estiver de pé. Ajude a Hiroto!', '#ffd070');
  _tsuFloat('enemy', '🕸️ PROTEGIDA', 'status');
  const batIcon = document.getElementById('bat-enemy-icon');
  if (batIcon && typeof buildEnemyVisual === 'function') batIcon.innerHTML = buildEnemyVisual(e, 112, 'idle');
  _tsuDevolverTurno();
}

// ── Instalação (IA + hooks de startBattle / runEnemyTurn / endBattle) ──
(function _tsuInstalar() {
  function regAI() {
    if (typeof ENEMY_AI === 'undefined') { setTimeout(regAI, 200); return; }
    ENEMY_AI['tsumugi'] = {
      name: 'Tsumugi',
      specialName: 'Teia da Rainha',
      specialIcon: '🕸️',
      specialDesc: 'A Rainha Aranha usa uma de suas técnicas.',
      init: function (e) { _tsuIniciar(e); },
      // Rede de segurança: erro aqui não pode travar o turno do chefe
      special: function (bs, p, e) {
        try { _tsuAgir(bs, p, e); }
        catch (err) {
          console.error('[Tsumugi] erro no turno do chefe:', err);
          try { _tsuLog('🕷️ Tsumugi hesita por um instante...', '#c0a0ff'); } catch (_) {}
          try { updateHUD(); updateBattleHUD(); } catch (_) {}
        }
      },
    };
  }
  function hookStart() {
    if (typeof window.startBattle !== 'function') { setTimeout(hookStart, 200); return; }
    const orig = window.startBattle;
    window.startBattle = function (enemy) {
      if (enemy && (enemy.id === 'tsumugi' || enemy.ai === 'tsumugi')) {
        _tsuIniciar(enemy);
        enemy.id = 'tsumugi';
        try { _aranhasGarantirHiroto(); } catch (_) {}   // a Hiroto SEMPRE luta junto, por qualquer caminho que o boss comece
      }
      return orig.call(this, enemy);
    };
  }
  function hookTurn() {
    if (typeof window.runEnemyTurn !== 'function') { setTimeout(hookTurn, 200); return; }
    const orig = window.runEnemyTurn;
    window.runEnemyTurn = function (bs, p, e) {
      if (e && e.id === 'tsumugi') {
        if (bs._battleEnded) return;
        if (_tsuEstado && _tsuEstado.transicionando) return;   // sem turno inimigo durante a transição
      }
      return orig.apply(this, arguments);
    };
  }
  function hookEnd() {
    if (typeof window.endBattle !== 'function') { setTimeout(hookEnd, 200); return; }
    const orig = window.endBattle;
    window.endBattle = function (won, fled) {
      const t = _tsuEstado, bs = (typeof battleState !== 'undefined') ? battleState : null;   // 'let' no palDinh.js: NÃO existe window.battleState
      const ehTsu = t && t.ativo && bs && bs.enemyData && bs.enemyData.id === 'tsumugi';
      if (ehTsu) {
        if (won && t.fase === 1) { if (!t.transicionando) _tsuTransicao(); return; }
        if (t.transicionando) return;
        // Braço Direito: enquanto o filho estiver vivo, a Rainha não morre
        if (won && t.fase === 2 && window.bracoDireito && window.bracoDireito.bloqueiaVitoria()) {
          _tsuProtegerRainha(); return;
        }
        try { _tsuRestaurarAtk(bs, G.player); } catch (_) {}
        try { if (window.bracoDireito) window.bracoDireito.encerrar(); } catch (_) {}
        t.ativo = false;
      }
      return orig.apply(this, arguments);
    };
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { regAI(); hookStart(); hookTurn(); hookEnd(); });
  } else { regAI(); hookStart(); hookTurn(); hookEnd(); }
})();

function _tsuMontarBoss() {
  const f = TSU_FORMAS[1];
  return {
    id: 'tsumugi', ai: 'tsumugi',
    name: f.nome, icon: '🕷️', img: f.img, elemento: 'veneno',
    hp: f.hp, maxHp: f.hp, atk: f.atk, def: f.def, spd: f.spd,
    critChance: f.crit, critMult: f.critMult,
    isBoss: true,
    forceSpecialChance: 1,   // todo turno passa pela IA própria (special)
    atkNome: 'ataca com as garras',
    desc: 'A Rainha Aranha. Tece os fios que prendem a vila inteira e luta em duas formas.',
    xp: 2500, gold: 800,
    loot: [],                // TODO: definir recompensas
  };
}

function storyNode_aranhas_boss_tsumugi() {
  _aranhasInit();
  G.aranhas.fase = 4;
  G.location = 'dungeon-aranhas';
  _aranhasCena('aranhas-trono');   // grava G.location = 'aranhas-trono' (usado pela saída por fuga/derrota)
  const boss = _tsuMontarBoss();
  G._dungeonBattleCallback = function () { storyNode_aranhas_vitoria(); };
  // Sistema Braço Direito: a Hiroto luta contra o filho da Tsumugi em paralelo
  // (se o bracoDireito.js não estiver no gat-1.html, ele é carregado aqui mesmo)
  _aranhasGarantirHiroto();
  if (typeof showEnemy === 'function') showEnemy(boss);
  startBattle(boss);
}
window.aranhasTestarTsumugi = storyNode_aranhas_boss_tsumugi;

// Garante que o Braço Direito esteja CARREGADO e RODANDO na luta da Tsumugi.
//  • se window.bracoDireito já existe → só inicia (se ainda não estiver rodando);
//  • se não existe (faltou o <script> no gat-1.html) → carrega o arquivo na hora,
//    tentando dungeons/bracoDireito.js e depois bracoDireito.js, e inicia ao carregar;
//  • se não achar o arquivo, avisa na tela (notify) e no console.
// É chamado no começo do boss E de novo no startBattle da Tsumugi (qualquer caminho de teste).
let _aranhasBdCarregando = false;
function _aranhasGarantirHiroto() {
  const iniciar = function () {
    try {
      const bd = window.bracoDireito;
      if (!bd) return;
      if (typeof bd.ativa === 'function' && bd.ativa()) return;      // já está rodando
      bd.iniciar({ filho: { nome: ARANHAS_FILHO3 } });
    } catch (e) { console.error('[Masmorra 4] bracoDireito.iniciar falhou', e); }
  };
  if (window.bracoDireito) { iniciar(); return; }
  if (_aranhasBdCarregando) return;
  _aranhasBdCarregando = true;
  const caminhos = ['dungeons/bracoDireito.js', 'bracoDireito.js'];
  const tentar = function (i) {
    if (i >= caminhos.length) {
      _aranhasBdCarregando = false;
      console.warn('[Masmorra 4] bracoDireito.js não encontrado (tentei: ' + caminhos.join(', ') + '). A Hiroto não vai lutar.');
      try { if (typeof notify === 'function') notify('⚠ bracoDireito.js não encontrado em dungeons/ — a Hiroto não vai lutar.', 'red'); } catch (_) {}
      return;
    }
    const sc = document.createElement('script');
    sc.src = caminhos[i] + '?v=' + Date.now();                     // evita o cache do Chrome no Android
    sc.onload = function () {
      _aranhasBdCarregando = false;
      const bs = (typeof battleState !== 'undefined') ? battleState : null;
      const naTsumugi = !!(G && G.inBattle && bs && bs.enemyData && bs.enemyData.id === 'tsumugi');
      if (naTsumugi) iniciar();
    };
    sc.onerror = function () { sc.remove(); tentar(i + 1); };
    document.head.appendChild(sc);
  };
  tentar(0);
}
window._aranhasGarantirHiroto = _aranhasGarantirHiroto;

// ─────────────────────────────────────────────────────────────
//  BOSS FINAL — TODO
//  Rainha Aranha + Filho (dano de dois). Luta da Hiroto é paralela
//  (bracoDireito.js): só dá pra vencer depois que ela derruba o filho.
//  Ao vencer: storyNode_aranhas_vitoria()
// ─────────────────────────────────────────────────────────────

function storyNode_aranhas_vitoria() {
  _aranhasInit();
  G.aranhas.dungeonAranhasCompleta = true;
  G.dungeonAranhasCleared = true;
  if (window.bracoDireito) window.bracoDireito.desbloquear();   // libera o sistema Braço Direito
  if (window.bracoDireito) window.bracoDireito.encerrar();
  G.location = 'dungeon-aranhas';
  if (typeof saveGame === 'function') saveGame();
  _aranhasCena('aranhas-trono');
  hideEnemy();
  setStory(
    'NARRADOR',
    `O último golpe encontra a Rainha sem que ela tente desviar.\n\nTsumugi desaba de joelhos sobre os degraus de seda. Os fios do teto perdem a tensão de uma vez, descem moles e se espalham pelo chão como cabelo molhado. Do outro lado da câmara, Kagerō cai também, e a luta de Hiroto termina junto com a sua.\n\nO zumbido que vinha do fundo da pedra, o coração batendo debaixo do chão, para. A caverna inteira respira fundo e fica quieta.`,
    [
      { icon:'👁️', text:'Olhar a Rainha', action: storyNode_aranhas_vitoria2 },
    ]
  );
}

function storyNode_aranhas_vitoria2() {
  _aranhasCena('aranhas-trono');
  hideEnemy();
  setStory(
    'TSUMUGI',
    `Ela não olha pra vocês. Os olhos vermelhos, agora sem brilho, estão fixos no casulo no centro da câmara.\n\n\"Calma... calma, meu amor.\" A voz sai fina, quase de ninar. \"A mamãe já vai. Ninguém mais vai te machucar.\"\n\nEla rasteja devagar pelos degraus, arrastando as patas, até encostar a mão no casulo. Os dedos tremem sobre a seda.\n\n\"Está ouvindo? Está quase na hora de nascer.\"`,
    [
      { icon:'😶', text:'Acompanhar o olhar dela', action: storyNode_aranhas_vitoria3 },
    ],
    'Imagens/personagens/tsumugiFina.png'
  );
}

function storyNode_aranhas_vitoria3() {
  _aranhasCena('aranhas-nucleo');
  hideEnemy();
  setStory(
    'NARRADOR',
    `Hiroto atravessa a câmara com a ${ARANHAS_ESPADA_HIROTO} baixa. O casulo, rompido pelos tremores da luta, está rasgado de cima a baixo, e a seda pende aberta como uma cortina.\n\nEla espia lá dentro. Fica parada um longo instante.\n\nNão há nada. Nem ovo, nem criança, nem sombra de nascimento. Só fios enrolados sobre si mesmos, camada sobre camada, como alguém que teceu e teceu para tapar um buraco.\n\n\"Não tinha filho nenhum...\" Hiroto diz baixo, quase pra si. \"Ela nunca esteve esperando ninguém. Tudo isso, os aldeões, os fios, o ninho... pra cuidar de um casulo vazio.\"`,
    [
      { icon:'💔', text:'Olhar de novo para a Rainha', action: storyNode_aranhas_vitoria4 },
    ]
  );
}

function storyNode_aranhas_vitoria4() {
  _aranhasCena('aranhas-trono');
  hideEnemy();
  setStory(
    'TSUMUGI',
    `Tsumugi não ouviu. Ela se arrastou até o casulo e, sem olhar dentro, fecha os braços em volta da seda rasgada, como quem protege alguém do frio.\n\n\"Shhh... não foi nada, meu amor.\" A voz sai fina, de ninar. \"Os homens maus já vão embora. A mamãe está aqui.\"\n\nHiroto abre a boca pra falar, e você balança a cabeça. Contar agora não ia mudar nada.\n\n\"Está ouvindo? Ele respira tão quietinho...\" O sorriso se desfaz devagar, sem dor. A cabeça tomba sobre a seda. Os dedos ainda afagam o vazio por um instante, e depois param.\n\nTsumugi morre abraçada ao filho que nunca existiu, certa, até o fim, de que ele estava ali.`,
    [
      { icon:'🕯️', text:'Deixá-la em paz', action: storyNode_aranhas_vitoria5 },
    ],
    'Imagens/personagens/tsumugiFina.png'
  );
}

function storyNode_aranhas_vitoria5() {
  _aranhasCena('aranhas-solto');
  hideEnemy();
  setStory(
    'NARRADOR',
    `Um gemido curto vem da parede rachada. Ygirro está sentado junto à pedra, a lança caída ao lado. Ele nem chegou a lutar de verdade: o golpe da Rainha o jogou longe, mas o que o deixou assim foi outra coisa. Os olhos dele estão fixos no filho, e não se desprendem.\n\nTsuiro continua caído onde Tsukumo o soltou, de bruços na pedra molhada, os dedos arranhando o chão. Ele respira fundo, uma vez. Duas.\n\nPrimeiro um joelho. Depois o outro. Apoia-se no pedaço de lança e se põe de pé, trêmulo, e a primeira coisa que faz não é olhar pra si. É olhar pro pai.`,
    [
      { icon:'👀', text:'Ver Tsuiro ir até o pai', action: storyNode_aranhas_vitoria6 },
    ]
  );
}

function storyNode_aranhas_vitoria6() {
  _aranhasCena('aranhas-solto');
  hideEnemy();
  setStory(
    'YGIRRO',
    `Tsuiro atravessa a câmara mancando e se ajoelha ao lado do pai. Não fala nada. Só encosta a testa no ombro dele, e Ygirro fecha os olhos por um instante inteiro.\n\n\"Eu vi você preso naquela teia...\" A voz sai rouca, devagar. \"Não consegui pensar em mais nada. Corri, e nem sei o que fiz.\" Ele passa a mão no rosto, e a mão está tremendo. \"Anos ensinando os outros a manter a cabeça fria, e eu entrei aqui sem ela.\"\n\n\"Eu estou aqui, pai.\" Tsuiro firma o braço dele. \"Vem. Eu ajudo.\"\n\nYgirro olha pra você, depois pra Hiroto, e consegue um aceno fraco. \"Acabou?\"\n\nVocê faz que sim.`,
    [
      { icon:'🤝', text:'Ajudar os dois a sair', action: storyNode_aranhas_saida },
    ]
  );
}

function storyNode_aranhas_saida() {
  _aranhasCena('aranhas-ts1');
  hideEnemy();
  setStory(
    'NARRADOR',
    `Tsuiro, ainda tremendo, passa o braço do pai sobre os ombros e se recusa a soltar. Você assume o outro lado. Hiroto vai na frente, cortando os fios mortos que ainda pendem do teto, sem pressa, sem precisar mais olhar cada sombra duas vezes.\n\nO túnel que vocês desceram tenso e em silêncio agora é só um caminho comprido. A luz azulada perde a força aos poucos. O ar perde o gosto de ferro.\n\nNa boca da caverna, a teia do selo já virou pó branco no chão. Lá fora é fim de tarde, e o vento chega com cheiro de folha e de fumaça de cozinha.\n\n\"Vamos pra sua casa,\" diz Hiroto, e Ygirro, pela primeira vez em muito tempo, não discute.`,
    [
      { icon:'🏡', text:'Seguir até a casa de Ygirro', action: storyNode_aranhas_casa },
    ]
  );
}

function storyNode_aranhas_casa() {
  _aranhasCena('aranhas-casa');
  hideEnemy();
  setStory(
    'NARRADOR',
    `A casa de Ygirro está exatamente como ele deixou: as portas de papel abertas para a varanda, o chá esfriado sobre a mesa baixa, duas xícaras viradas, esperando.\n\nTsuiro acomoda o pai junto à mesa e acende a lamparina. Hiroto se encosta no batente da porta, olhando as montanhas ficarem cor de brasa no fim do dia. Pela primeira vez desde que vocês chegaram à Vila de Tsumugi, ninguém está de guarda.\n\n\"Esse chá está horrível,\" diz Ygirro, depois de um gole, e ri, um riso curto e cansado. \"Mas é o melhor que já tomei.\"`,
    [
      { icon:'🍵', text:'Sentar com eles', action: storyNode_aranhas_casa2 },
    ]
  );
}

function storyNode_aranhas_casa2() {
  _aranhasCena('aranhas-casa');
  hideEnemy();
  setStory(
    'YGIRRO',
    `\"Eu te devo o meu filho,\" ele diz, sem rodeio. \"E te devo a vila, que vai demorar pra entender o que aconteceu. Se algum dia você precisar de uma lança, ou de um lugar pra dormir, esta porta não tranca pra você.\"\n\nTsuiro assente, e Hiroto, no batente, só sorri de lado, o que nela já é um discurso.\n\nLá fora, o sol termina de descer. No fundo do vale, uma a uma, as luzes da vila vão acendendo.`,
    [
      { icon:'🎁', text:'Ver o que Ygirro tem a oferecer', action: function () {
          if (_aranhasInit().bauEntregue) return storyNode_aranhas_fim();
          storyNode_aranhas_bau();
      } },
    ]
  );
}

// Baú do Ygirro: a recompensa da masmorra. Vai pra bolsa e é aberto lá, como os outros baús do jogo.
// O conteúdo (lootTable) ainda está VAZIO de propósito: será definido depois (armaduras por classe).
function storyNode_aranhas_bau() {
  _aranhasCena('aranhas-casa');
  hideEnemy();
  setStory(
    'NARRADOR',
    `Ygirro faz um sinal pro filho. Tsuiro some por uma porta de correr e volta carregando, com as duas mãos, um baú de madeira escura, atado com fios de seda cortados.\n\n\"Era do meu pai,\" diz Ygirro. \"Guardei pro dia em que alguém merecesse abrir. Esse dia chegou.\"\n\nTsuiro pousa o baú aos seus pés e recua um passo, quase em reverência.`,
    [
      { icon:'🎁', text:'Pegar o baú', action: storyNode_aranhas_bau2 },
    ]
  );
}

function _aranhasEntregarBau() {
  const a = _aranhasInit();
  if (a.bauEntregue) return false;
  a.bauEntregue = true;
  try { if (typeof addItem === 'function') addItem({ id: 'bau_ygirro' }, 1); }
  catch (e) { console.error('[Masmorra 4] não consegui dar o Baú do Ygirro', e); a.bauEntregue = false; return false; }
  try { if (typeof notify === 'function') notify('🎁 Baú do Ygirro guardado na bolsa. Abra por lá!', 'gold'); } catch (_) {}
  try { if (typeof addLog === 'function') addLog('Recebeu o Baú do Ygirro.', 'xp'); } catch (_) {}
  if (typeof saveGame === 'function') saveGame();
  return true;
}

function storyNode_aranhas_bau2() {
  _aranhasEntregarBau();
  _aranhasCena('aranhas-casa');
  hideEnemy();
  setStory(
    'NARRADOR',
    `Você guarda o baú com cuidado. É pesado, e a madeira ainda guarda o calor da casa.\n\nHiroto se desencosta do batente e para ao seu lado, olhando o vale acender. Ygirro serve mais uma xícara pro filho, que aceita sem dizer nada.\n\nÉ uma noite quieta, daquelas que só existem depois que o pior termina.`,
    [
      { icon:'🌅', text:'Encerrar a noite', action: storyNode_aranhas_fim },
    ]
  );
}

function storyNode_aranhas_fim() {
  _aranhasInit();
  G.aranhas.fase = 0;
  G.aranhas.ondas = 0;
  G._dungeonBattleCallback = null;
  G._dungeonResumeCallback = null;
  if (typeof saveGame === 'function') saveGame();
  // Gancho: a tela de escolha da nova armadura entra aqui (ainda a definir).
  if (typeof window.aranhasEscolherArmadura === 'function') {
    return window.aranhasEscolherArmadura(function () { _aranhasVoltarAoVilarejo(); });
  }
  _aranhasVoltarAoVilarejo();
}

function _aranhasVoltarAoVilarejo() {
  G.location = 'vilarejo';
  if (typeof storyNode_vilarejo === 'function') storyNode_vilarejo();
}

// ─────────────────────────────────────────────────────────────
//  SAÍDA (fuga ou derrota)
//  O endBattle() do palDinh.js já chama isto (fuga e derrota) quando
//  G.location começa com 'aranhas-' (o setScene grava a cena em G.location).
// ─────────────────────────────────────────────────────────────

window.aranhasSairDaMasmorra = function (motivo) {
  try { if (window.bracoDireito) window.bracoDireito.encerrar(); } catch (_) {}
  G._dungeonBattleCallback = null;
  G._dungeonResumeCallback = null;
  if (G.aranhas) { G.aranhas.fase = 0; G.aranhas.ondas = 0; }
  _aranhasCena('aranhas-vila');
  hideEnemy();
  const texto = (motivo === 'derrota')
    ? 'Os fios se fecham atrás de você e a caverna te devolve ao vilarejo, vivo, mas de mãos vazias.\n\nO ninho continua esperando — o caminho precisa ser refeito.'
    : 'Você recua entre os fios até deixar a caverna para trás.\n\nO ninho continua esperando — o caminho precisa ser refeito.';
  setStory('NARRADOR', texto, [
    { icon:'🏘️', text:'Voltar ao Vilarejo', action: () => {
        G.location = 'vilarejo';
        if (typeof storyNode_vilarejo === 'function') storyNode_vilarejo();
    } },
  ]);
};

// ─────────────────────────────────────────────────────────────
//  DEBUG — RESETAR A MASMORRA 4
//  Aparece no painel 🐞 do debug_mode.js, em "🧪 Resetar masmorra"
//  (registro em window.DEBUG_RESET_MASMORRAS). 1º toque arma, 2º confirma.
//  Zera: progresso da masmorra (fase, selo, mapa do ninho, Ygirro), a conclusão
//  (dungeonAranhasCleared) e o Braço Direito desbloqueado; encerra a luta da
//  Hiroto e fecha mapa/pop-ups. NÃO mexe em XP, itens, ouro nem em outras masmorras.
//  Não reseta no meio de uma batalha.
// ─────────────────────────────────────────────────────────────
function aranhasResetarMasmorra() {
  if (typeof G !== 'undefined' && G && G.inBattle) {
    try { if (typeof notify === 'function') notify('⚠ Saia da batalha antes de resetar a Masmorra 4.', 'red'); } catch (_) {}
    return false;
  }
  try { if (window.bracoDireito) window.bracoDireito.encerrar(); } catch (_) {}
  try { _aranhasMapaFechar(); } catch (_) {}
  try { _aranhasRemoveMapa(); } catch (_) {}
  try { _aranhasRemoveHotspot(); } catch (_) {}
  try { const pop = document.getElementById('aranhas-popup'); if (pop) pop.remove(); } catch (_) {}
  _tsuEstado = null;
  _aranhasCenaAtual = null;
  const estavaNaMasmorra = /aranhas/.test(String(G.location || ''));
  G._dungeonBattleCallback = null;
  G._dungeonResumeCallback = null;
  delete G.aranhas;                 // _aranhasInit() recria zerado na próxima entrada
  G.dungeonAranhasCleared = false;
  delete G.bracoDireito;            // o sistema Braço Direito volta a ficar bloqueado
  try { if (typeof window._reregisterDungeons === 'function') window._reregisterDungeons(); } catch (_) {}
  try { if (typeof saveGame === 'function') saveGame(); } catch (_) {}
  try { if (typeof notify === 'function') notify('🧪 Masmorra 4 resetada: progresso zerado e Braço Direito bloqueado.', 'gold'); } catch (_) {}
  if (estavaNaMasmorra) {           // estava dentro da masmorra: volta pro vilarejo
    G.location = 'vilarejo';
    if (typeof storyNode_vilarejo === 'function') storyNode_vilarejo();
  }
  return true;
}
window.aranhasResetarMasmorra = aranhasResetarMasmorra;
window.DEBUG_RESET_MASMORRAS = window.DEBUG_RESET_MASMORRAS || {};
window.DEBUG_RESET_MASMORRAS.terra_aranhas = { label: 'Masmorra 4 (Ninho das Aranhas)', reset: aranhasResetarMasmorra };

// ─────────────────────────────────────────────────────────────
//  RE-REGISTRO DINÂMICO (Torre reflete o status atual)
// ─────────────────────────────────────────────────────────────

(function _setupAranhasReregister() {
  function _doReregister() {
    if (typeof registerDungeon !== 'function') return;
    const bloqueada = !_aranhasLiberada();
    registerDungeon({
      id:        'terra_aranhas',
      ordem:     4,
      nome:      'O Ninho dos Fios Ilusórios',
      bossNome:  'Rainha Aranha',
      bossIcon:  ARANHAS_ICONE_TORRE,
      descricao: bloqueada
        ? 'Conclua a Masmorra Inazami para revelar este lugar.'
        : 'A Vila de Tsumugi encolheu em silêncio. Aldeões que caminham sorrindo rumo a uma caverna. E fios que ninguém consegue ver.',
      status:    bloqueada ? 'bloqueada' : 'ativa',
      stats: [
        { label: 'Dificuldade', value: '★★★★★' },
        { label: 'Recompensa',  value: 'Um novo vínculo' },
      ],
      entrar: storyNode_aranhas_intro,
    });
  }
  const _prev = window._reregisterDungeons;
  window._reregisterDungeons = function () {
    if (typeof _prev === 'function') _prev();
    _doReregister();
  };
})();

window.storyNode_aranhas_intro    = storyNode_aranhas_intro;
window.storyNode_aranhas_cenario  = storyNode_aranhas_cenario;
window.storyNode_aranhas_chegada  = storyNode_aranhas_chegada;
window.storyNode_aranhas_chegada2 = storyNode_aranhas_chegada2;
window.storyNode_aranhas_ygirro1  = storyNode_aranhas_ygirro1;
window.storyNode_aranhas_ygirro2  = storyNode_aranhas_ygirro2;
window.storyNode_aranhas_ygirro3  = storyNode_aranhas_ygirro3;
window.storyNode_aranhas_ygirro4  = storyNode_aranhas_ygirro4;
window.storyNode_aranhas_treino1  = storyNode_aranhas_treino1;
window.storyNode_aranhas_conversa1 = storyNode_aranhas_conversa1;
window.storyNode_aranhas_conversa2 = storyNode_aranhas_conversa2;
window.storyNode_aranhas_treino2  = storyNode_aranhas_treino2;
window.storyNode_aranhas_comida   = storyNode_aranhas_comida;
window.storyNode_aranhas_comida2  = storyNode_aranhas_comida2;
window.storyNode_aranhas_tsuiro1  = storyNode_aranhas_tsuiro1;
window.storyNode_aranhas_tsuiro2  = storyNode_aranhas_tsuiro2;
window.storyNode_aranhas_tsuiro3  = storyNode_aranhas_tsuiro3;
window.storyNode_aranhas_noite_tsuiro  = storyNode_aranhas_noite_tsuiro;
window.storyNode_aranhas_noite_tsuiro2 = storyNode_aranhas_noite_tsuiro2;
window.storyNode_aranhas_rainha_popup  = storyNode_aranhas_rainha_popup;
window.storyNode_aranhas_vila_volta    = storyNode_aranhas_vila_volta;
window.storyNode_aranhas_manha1   = storyNode_aranhas_manha1;
window.storyNode_aranhas_manha2   = storyNode_aranhas_manha2;
window.storyNode_aranhas_manha3   = storyNode_aranhas_manha3;
window.storyNode_aranhas_manha4   = storyNode_aranhas_manha4;
window.storyNode_aranhas_manha5   = storyNode_aranhas_manha5;
window.storyNode_aranhas_decisao  = storyNode_aranhas_decisao;
window.storyNode_aranhas_partida  = storyNode_aranhas_partida;


window.storyNode_aranhas_fase1    = storyNode_aranhas_fase1;
window.storyNode_aranhas_fase1_b  = storyNode_aranhas_fase1_b;
window.storyNode_aranhas_fase1_teia = storyNode_aranhas_fase1_teia;
window.storyNode_aranhas_fase1_luta = storyNode_aranhas_fase1_luta;
window.storyNode_aranhas_fase1_vitoria = storyNode_aranhas_fase1_vitoria;
window.storyNode_aranhas_fase1_ygirro = storyNode_aranhas_fase1_ygirro;
window.storyNode_aranhas_fase1_avanco = storyNode_aranhas_fase1_avanco;
window.storyNode_aranhas_nucleo1  = storyNode_aranhas_nucleo1;
window.storyNode_aranhas_nucleo2  = storyNode_aranhas_nucleo2;
window.storyNode_aranhas_nucleo3  = storyNode_aranhas_nucleo3;
window.storyNode_aranhas_nucleo4  = storyNode_aranhas_nucleo4;
window.storyNode_aranhas_nucleo5  = storyNode_aranhas_nucleo5;
window.storyNode_aranhas_nucleo6  = storyNode_aranhas_nucleo6;
window.storyNode_aranhas_nucleo7  = storyNode_aranhas_nucleo7;
window.storyNode_aranhas_nucleo8  = storyNode_aranhas_nucleo8;
window.storyNode_aranhas_nucleo9  = storyNode_aranhas_nucleo9;
window.storyNode_aranhas_nucleo10 = storyNode_aranhas_nucleo10;
window.storyNode_aranhas_nucleo11 = storyNode_aranhas_nucleo11;
window.storyNode_aranhas_nucleo12 = storyNode_aranhas_nucleo12;
window.storyNode_aranhas_nucleo13 = storyNode_aranhas_nucleo13;
window.storyNode_aranhas_nucleo14 = storyNode_aranhas_nucleo14;
window.storyNode_aranhas_boss_tsumugi = storyNode_aranhas_boss_tsumugi;
window.storyNode_aranhas_vitoria  = storyNode_aranhas_vitoria;
window.storyNode_aranhas_vitoria2 = storyNode_aranhas_vitoria2;
window.storyNode_aranhas_vitoria3 = storyNode_aranhas_vitoria3;
window.storyNode_aranhas_vitoria4 = storyNode_aranhas_vitoria4;
window.storyNode_aranhas_vitoria5 = storyNode_aranhas_vitoria5;
window.storyNode_aranhas_vitoria6 = storyNode_aranhas_vitoria6;
window.storyNode_aranhas_saida = storyNode_aranhas_saida;
window.storyNode_aranhas_casa = storyNode_aranhas_casa;
window.storyNode_aranhas_casa2 = storyNode_aranhas_casa2;
window.storyNode_aranhas_fim = storyNode_aranhas_fim;
window.storyNode_aranhas_bau = storyNode_aranhas_bau;
window.storyNode_aranhas_bau2 = storyNode_aranhas_bau2;
window.storyNode_aranhas_frente       = storyNode_aranhas_frente;
window.storyNode_aranhas_selo1        = storyNode_aranhas_selo1;
window.storyNode_aranhas_selo2        = storyNode_aranhas_selo2;
window.storyNode_aranhas_selo_puzzle  = storyNode_aranhas_selo_puzzle;
window.storyNode_aranhas_selo_aberto  = storyNode_aranhas_selo_aberto;
window._aranhasPuzzleSelo             = _aranhasPuzzleSelo;
