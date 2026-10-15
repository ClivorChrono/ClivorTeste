// =============================================================
//  HUBI.JS — Chronicles of Clivor
//  Aliado HuBi: mérito com o vilarejo, despertar da pedra no
//  sótão de Dona Mitsue, cura passiva em batalha, amuleto com
//  contador de feição, sprite animada + som ao ajudar, falas
//  evolutivas em 3ª pessoa (ileísmo, item 11), reação sarcástica
//  à derrota (item 12), mecânica de "Intuição"/pedir ajuda em
//  batalha (item 13) e reserva pra quarta parede no futuro (item 14).
//
//  Depende de (definidos em palDinh.js / vilarejo.js):
//    G, setStory, setScene, notify, addLog, updateHUD, addItem,
//    appendBattleLog, showFloatingNumber, battleState, endBattle,
//    storyNode_estalagem, showItemPopup
//
//  Ordem de load no gat-1.html: depois de vilarejo.js
//
//  PASTA DE ASSETS: tudo fica dentro de Hbi/ (imagens) e
//  Hbi/sons/ (áudio).
// =============================================================

'use strict';

// ─────────────────────────────────────────────────────────────
//  1. CONFIGURAÇÃO
// ─────────────────────────────────────────────────────────────

const HUBI_CONFIG = {
  META_MERITO:        700,  // mérito necessário para a pedra despertar
  REVELACAO_MERITO:   250,  // mérito mínimo para Mitsue revelar a existência da pedra
                             // (ajustável — o pedido original só fixou os 700 do despertar)
  PONTOS: {
    floresta:         4,    // cada inimigo comum da floresta
    dungeon_sombras:  8,    // cada inimigo comum da Dungeon das Sombras
    masmorra:         6,    // cada inimigo comum de outras masmorras (Kappa, Inazami, TVE...)
    chefe:            100,  // chefe de fase — substitui o valor do local
    subchefe:         75,   // subchefe — substitui o valor do local
  },
  MAX_LEVEL:          10,
  // Níveis em que HuBi ganha 1 ponto de talento (pontos limitados —
  // 6 pontos no total pra 12 talentos — o suficiente pra fechar UM
  // caminho inteiro de 6 tiers, nunca os dois).
  NIVEIS_COM_PONTO:   [1, 2, 4, 6, 8, 10],
  VITORIAS_POR_LEVEL: 6,    // (legado — não usado mais para subir de nível, ver sistema de XP abaixo)
  // Cura por nível: índice 0 = Lv0 (12 HP) ... índice 10 = Lv máximo (150 HP)
  CURA_POR_LEVEL: [12, 26, 40, 53, 67, 81, 95, 109, 122, 136, 150],

  // ── Sistema de XP / Talentos ──
  XP_POR_VITORIA: 25,       // XP fixo ganho a cada vitória em batalha (com HuBi já desperto)
  XP_POR_CURA:    0.4,      // (não usado mais — XP agora só vem de vitória, ver hubiRegisterVitoria)
  // XP acumulado total necessário para alcançar cada nível (índice = nível).
  // Curva ~50% mais exigente que a anterior (era fácil demais chegar no
  // Lv10). Continua acelerando mais nos níveis finais, mesmo formato de
  // antes, só que "mediana" em vez de fácil.
  XP_THRESHOLDS: [0, 140, 310, 500, 730, 1000, 1330, 1720, 2180, 2700, 3300],

  ICON_FALLBACK: '🌿', // usado se alguma imagem não carregar

  // ── Assets — tudo dentro da pasta Hbi/ ──
  PASTA:          'Hbi/',
  ICON:           'Hbi/icone00000000d72471f593e207d261f3b210_1784805652363.png', // ícone/retrato (menus, diálogo)
  SPRITE_BATALHA: 'Hbi/Hbii26-07-04_23-31-59-259.png',                    // spritesheet único, 3 frames lado a lado:
                                                                           // frame1 dormindo | frame2 curando | frame3 dormindo
  IMG_OBTIDO:     'Hbi/file_000000002cb8720e96b61b095be46211.png',        // splash ao despertar
  IMG_AMULETO:    'Hbi/Picsart_26-07-04_23-37-18-635_1784805652460.png',   // item "Amuleto HuBi"
  SOM_AJUDA:      "Hbi/sons/ElevenLabs_Um_pulso_restaurador_ecoando__'Inspire_renovação,_expire_a_tensão'.mp3",

  // Duração da animação do frame de cura antes de voltar a "dormindo" (ms)
  DUR_FRAME_CURA: 900,
  // Intervalo de troca de frame no "respirar" dormindo (frame1 <-> frame3)
  DUR_IDLE_CICLO: 1800,
};

// ─────────────────────────────────────────────────────────────
//  2. ESTADO
// ─────────────────────────────────────────────────────────────

function hubiInit() {
  if (!G.hubi) {
    G.hubi = {
      merito:     0,      // 0 a HUBI_CONFIG.META_MERITO
      revelado:   false,  // Mitsue já contou sobre a pedra?
      despertado: false,  // pedra despertou — HuBi ativo em batalha
      level:      0,
      vitorias:   0,      // legado, não usado mais para progressão
      xp:             0,  // XP acumulado total do HuBi
      pontosTalento:  0,  // pontos de talento não gastos
      talentos:       {}, // { idDoTalento: true }
      branchEscolhido: null, // 'cura' | 'protecao' — definido ao aprender o 1º talento, bloqueia o outro caminho
      _cutsceneVista: false,
      _amuletoDado:   false,
    };
  } else {
    // Migração de saves antigos (de antes do sistema de XP/talentos existir)
    if (G.hubi.xp === undefined) {
      G.hubi.xp = HUBI_CONFIG.XP_THRESHOLDS[G.hubi.level || 0] || 0;
    }
    if (G.hubi.pontosTalento === undefined) {
      // Concede retroativamente pontos conforme a nova curva limitada (NIVEIS_COM_PONTO),
      // pra não prejudicar quem já jogou, mas sem estourar o novo limite.
      const nivelAtual = G.hubi.level || 0;
      G.hubi.pontosTalento = HUBI_CONFIG.NIVEIS_COM_PONTO.filter(n => n <= nivelAtual).length;
    }
    if (!G.hubi.talentos) G.hubi.talentos = {};
    if (G.hubi.branchEscolhido === undefined) {
      // Infere o ramo já seguido a partir de talentos que a pessoa já tiver comprado.
      G.hubi.branchEscolhido = null;
      for (const id in G.hubi.talentos) {
        const t = HUBI_TALENTOS.find(x => x.id === id);
        if (t && t.branch) { G.hubi.branchEscolhido = t.branch; break; }
      }
    }
  }

  // Migração: corrige o item "Amuleto HuBi" se ele já foi dado ANTES de
  // imgSrc/isHubiAmulet existirem no código (save antigo fica com o item
  // "cru", sem imagem e sem abrir o popup especial). Sempre sincroniza com
  // o config atual — assim, se o caminho da imagem mudar no futuro, o item
  // já salvo se atualiza sozinho sem precisar de outra migração manual.
  if (G.player && G.player.inventory) {
    const amuletoExistente = G.player.inventory.find(i => i.id === 'amuleto_hubi');
    if (amuletoExistente) {
      // Migração: o amuleto agora só deve existir na mochila DEPOIS do despertar
      // (100% de mérito). Saves antigos que o receberam na revelação (250 mérito)
      // têm o item removido aqui; ele volta pra mochila no momento certo, via
      // hubiDarAmuleto() dentro de hubiNode_despertar().
      if (!G.hubi.despertado) {
        G.player.inventory = G.player.inventory.filter(i => i.id !== 'amuleto_hubi');
        G.hubi._amuletoDado = false;
      } else {
        amuletoExistente.imgSrc = HUBI_CONFIG.IMG_AMULETO;
        if (!amuletoExistente.isHubiAmulet) amuletoExistente.isHubiAmulet = true;
        if (!amuletoExistente.icon) amuletoExistente.icon = '💠';
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────
//  2b. ÁRVORE DE TALENTOS — 12 talentos em 2 CAMINHOS EXCLUSIVOS:
//      🌿 Caminho do Curandeiro  (branch:'cura')
//      🛡️ Caminho do Guardião    (branch:'protecao')
//      O primeiro talento aprendido define o caminho e bloqueia o
//      outro pro resto da run. 6 pontos de talento no total
//      (ver NIVEIS_COM_PONTO) — dá pra fechar um caminho inteiro,
//      nunca os dois.
// ─────────────────────────────────────────────────────────────

const HUBI_TALENTOS = [
  // ── 🌿 Caminho do Curandeiro ──
  { id:'cura_prolongada',      nome:'Cura Prolongada',       icon:'🌿', tier:1, branch:'cura', requires:[],
    desc:'A cura de HuBi por turno aumenta em 15%.' },
  { id:'fluxo_vital',          nome:'Fluxo Vital',           icon:'💧', tier:2, branch:'cura', requires:['cura_prolongada'],
    desc:'A cura de HuBi também restaura 5% do seu HP máximo, além do valor base.' },
  { id:'purificacao',          nome:'Purificação',           icon:'✨', tier:3, branch:'cura', requires:['fluxo_vital'],
    desc:'20% de chance, a cada cura, de remover veneno, sangramento ou queimadura.' },
  { id:'renovacao',            nome:'Renovação',             icon:'💠', tier:4, branch:'cura', requires:['purificacao'],
    desc:'A cura de HuBi também restaura 5 pontos de AP e 5 pontos de MP.' },
  { id:'furia_curativa',       nome:'Fúria Curativa',        icon:'🔥', tier:5, branch:'cura', requires:['renovacao'],
    desc:'Quando seu HP está abaixo de 30%, a cura de HuBi é dobrada.' },
  { id:'renascimento_bosque',  nome:'Renascimento do Bosque',icon:'🌳', tier:6, branch:'cura', requires:['furia_curativa'],
    desc:'Uma vez por batalha: se um golpe fosse te derrubar a 0 HP, HuBi te protege e te deixa com 50% do HP máximo.' },

  // ── 🛡️ Caminho do Guardião ──
  { id:'casca_protetora',      nome:'Casca Protetora',       icon:'🛡️', tier:1, branch:'protecao', requires:[],
    desc:'10% de chance, a cada turno, de bloquear metade do dano que você recebe.' },
  { id:'vigilia_atenta',       nome:'Vigília Atenta',        icon:'👁️', tier:2, branch:'protecao', requires:['casca_protetora'],
    desc:'A chance de Casca Protetora ativar sobe de 10% para 20%.' },
  { id:'escudo_verdejante',    nome:'Escudo Verdejante',     icon:'🍃', tier:3, branch:'protecao', requires:['vigilia_atenta'],
    desc:'A cada cura, HuBi cria um escudo que absorve dano igual a 10% do valor curado (dura até o próximo turno).' },
  { id:'barreira_absoluta',    nome:'Barreira Absoluta',     icon:'🔰', tier:4, branch:'protecao', requires:['escudo_verdejante'],
    desc:'Quando Casca Protetora ativa, bloqueia 100% do dano em vez de 50%.' },
  { id:'fortaleza_inabalavel', nome:'Fortaleza Inabalável',  icon:'⛰️', tier:5, branch:'protecao', requires:['barreira_absoluta'],
    desc:'Enquanto seu HP estiver abaixo de 50%, a chance de Casca Protetora ativar dobra.' },
  { id:'guardiao_eterno',      nome:'Guardião Eterno',       icon:'👑', tier:6, branch:'protecao', requires:['fortaleza_inabalavel'],
    desc:'Uma vez por batalha: se um golpe fosse te derrubar a 0 HP, HuBi te protege, te deixa com 65% do HP máximo e cria um escudo extra de 20% do HP máximo por 2 turnos.' },
];

function hubiTemTalento(id) {
  hubiInit();
  return !!(G.hubi.talentos && G.hubi.talentos[id]);
}

function hubiTalentoDisponivel(t) {
  hubiInit();
  if (hubiTemTalento(t.id)) return false;
  if (!G.hubi.pontosTalento || G.hubi.pontosTalento <= 0) return false;
  if (G.hubi.branchEscolhido && t.branch && t.branch !== G.hubi.branchEscolhido) return false;
  return t.requires.every(reqId => hubiTemTalento(reqId));
}

// Talento existe, ainda não foi aprendido, mas pertence ao caminho que a
// pessoa NÃO escolheu — fica bloqueado pelo resto da run.
function hubiTalentoBloqueadoPorRamo(t) {
  hubiInit();
  if (hubiTemTalento(t.id)) return false;
  return !!(G.hubi.branchEscolhido && t.branch && t.branch !== G.hubi.branchEscolhido);
}

function hubiComprarTalento(id) {
  hubiInit();
  const t = HUBI_TALENTOS.find(x => x.id === id);
  if (!t || !hubiTalentoDisponivel(t)) return;
  G.hubi.talentos[id] = true;
  G.hubi.pontosTalento -= 1;
  if (!G.hubi.branchEscolhido && t.branch) {
    G.hubi.branchEscolhido = t.branch;
    const nomeRamo = t.branch === 'cura' ? '🌿 Caminho do Curandeiro' : '🛡️ Caminho do Guardião';
    if (typeof notify === 'function') notify(`HuBi seguirá o ${nomeRamo}! O outro caminho está bloqueado nesta jornada.`, 'gold');
    if (typeof addLog === 'function') addLog(`HuBi escolheu o ${nomeRamo} — o outro caminho de talentos ficou bloqueado.`, 'xp');
  }
  if (typeof notify === 'function') notify(`🌿 HuBi aprendeu: ${t.nome}!`, 'green');
  if (typeof addLog === 'function') addLog(`HuBi aprendeu o talento "${t.nome}".`, 'xp');
  hubiShowAmuletoPopup(); // re-renderiza o popup já atualizado
}

// ─────────────────────────────────────────────────────────────
//  3. MÉRITO — ganho por inimigo derrotado
// ─────────────────────────────────────────────────────────────

function hubiClassificarLocal() {
  const loc = G.location || '';
  // Kappa e Inazami setam G.location = 'dungeon-kappa' / 'dungeon-inazami'
  // (confirmado em kappa_dungeon.js / inazami_dungeon.js) — ou seja, o valor
  // real COMEÇA com "dungeon-" e nunca batia no teste antigo de "kappa-"/
  // "inazami-" (que esperava começar assim, mas o prefixo real é outro).
  // Isso fazia essas duas masmorras caírem sempre no branch de cima e
  // pontuarem como Dungeon das Sombras (8) em vez de masmorra (6). Corrigido
  // testando essas duas ANTES do prefixo genérico "dungeon-".
  if (loc.indexOf('kappa') !== -1 || loc.indexOf('inazami') !== -1 || loc.indexOf('tve-') === 0) {
    return 'masmorra';
  }
  if (loc.indexOf('dungeon-') === 0) return 'dungeon_sombras';
  return 'floresta';
}

// Aceita variações de flag pra ficar compatível com os módulos de
// masmorra que ainda não tiverem exatamente "isBoss" / "isSubBoss".
function hubiPontosPorInimigo(enemy) {
  if (enemy && enemy.isBoss) return HUBI_CONFIG.PONTOS.chefe;
  if (enemy && (enemy.isSubBoss || enemy.subBoss || enemy.subChefe || enemy.isSubChefe)) {
    return HUBI_CONFIG.PONTOS.subchefe;
  }
  const tipo = hubiClassificarLocal();
  return HUBI_CONFIG.PONTOS[tipo] || HUBI_CONFIG.PONTOS.floresta;
}

// Dá ao jogador o item "Amuleto HuBi" (mostra o progresso de feição no bolso).
function hubiDarAmuleto() {
  hubiInit();
  if (G.hubi._amuletoDado) return;
  G.hubi._amuletoDado = true;
  if (typeof addItem === 'function') {
    addItem({
      id: 'amuleto_hubi',
      name: 'Amuleto HuBi',
      icon: '💠',
      imgSrc: HUBI_CONFIG.IMG_AMULETO,
      qty: 1,
      weight: 0.1,
      type: 'outro',
      isHubiAmulet: true,
      desc: 'Uma pedra fria ao toque, guardada há anos no sótão da estalagem. Algo grandioso parece dormir em seu interior, esperando. Parece reagir, aos poucos, à Feição que ela sente por você — algo só dela, diferente do que o resto do vilarejo pensa a seu respeito.',
    });
  }
}

function hubiAddMerito(amount, reason) {
  hubiInit();
  if (G.hubi.despertado || amount <= 0) return;
  G.hubi.merito = Math.max(0, Math.min(HUBI_CONFIG.META_MERITO, G.hubi.merito + amount));
  addLog(`Mérito com HuBi +${amount} (${G.hubi.merito}/${HUBI_CONFIG.META_MERITO}) — ${reason}`, 'xp');

  if (!G.hubi.revelado && G.hubi.merito >= HUBI_CONFIG.REVELACAO_MERITO) {
    G.hubi.revelado = true;
    // Não entrega mais o amuleto aqui — isso agora acontece em hubiNode_despertar(),
    // quando o jogador de fato visita Dona Mitsue e vê a cutscene.
    notify('💠 Dona Mitsue parece querer te contar algo...', 'gold');
  }
  if (G.hubi.merito >= HUBI_CONFIG.META_MERITO) {
    notify('💠 Você sente que algo no sótão da estalagem despertou seu interesse...', 'gold');
  }
}

// Chamado a partir de endBattle() quando o jogador vence.
function onHubiEnemyDefeated(enemy) {
  hubiInit();
  if (G.hubi.despertado) return;
  const pontos = hubiPontosPorInimigo(enemy);
  hubiAddMerito(pontos, (enemy && enemy.name) || 'inimigo derrotado');
}

// Ganho de XP do HuBi (já desperto) — sobe de nível e concede pontos de talento.
function hubiAddXP(amount, reason) {
  hubiInit();
  if (!G.hubi.despertado || amount <= 0) return;
  if (G.hubi.level >= HUBI_CONFIG.MAX_LEVEL) return;
  G.hubi.xp += Math.round(amount);
  while (G.hubi.level < HUBI_CONFIG.MAX_LEVEL && G.hubi.xp >= HUBI_CONFIG.XP_THRESHOLDS[G.hubi.level + 1]) {
    G.hubi.level++;
    const novaCura = HUBI_CONFIG.CURA_POR_LEVEL[G.hubi.level];
    if (HUBI_CONFIG.NIVEIS_COM_PONTO.includes(G.hubi.level)) {
      G.hubi.pontosTalento = (G.hubi.pontosTalento || 0) + 1;
      if (typeof notify === 'function') notify(`🌿 HuBi subiu para o Lv${G.hubi.level}! +1 ponto de talento (cura base ${novaCura} HP/turno).`, 'green');
    } else {
      if (typeof notify === 'function') notify(`🌿 HuBi subiu para o Lv${G.hubi.level}! (cura base ${novaCura} HP/turno).`, 'green');
    }
    if (typeof addLog === 'function') addLog(`HuBi evoluiu para o nível ${G.hubi.level}.`, 'xp');

    // Marco: HuBi Lv5 — entrega o Livro da Mana (com o Cristal I já encaixado).
    // Exclusivo da classe Mago.
    if (G.hubi.level === 5 && G.player && G.player.class === 'mago' && typeof hubiTriggerLivroManaCutscene === 'function') {
      hubiTriggerLivroManaCutscene();
    }
  }
}

// Chamado a partir de endBattle() quando o jogador vence, para progressão de nível do HuBi.
function hubiRegisterVitoria() {
  hubiInit();
  if (!G.hubi.despertado) return;
  hubiAddXP(HUBI_CONFIG.XP_POR_VITORIA, 'vitória em batalha');
}

// ─────────────────────────────────────────────────────────────
//  4. SOM — toca só quando HuBi ajuda (cura / escudo / etc.)
// ─────────────────────────────────────────────────────────────

let _hubiAudio = null;
function hubiPlaySom() {
  try {
    if (!_hubiAudio) {
      _hubiAudio = new Audio(encodeURI(HUBI_CONFIG.SOM_AJUDA));
      _hubiAudio.volume = 0.65;
    }
    _hubiAudio.currentTime = 0;
    _hubiAudio.play().catch(() => {});
  } catch (e) { /* silencioso — não quebra a batalha se o áudio falhar */ }
}

// ─────────────────────────────────────────────────────────────
//  5. SPRITE DE BATALHA — 3 frames (dormindo / curando / dormindo)
// ─────────────────────────────────────────────────────────────

let _hubiIdleTimer   = null;
let _hubiIdleFrame3  = false; // false = frame1, true = frame3
let _hubiSpriteReady = false;

function hubiSetBadgeFrame(frame) {
  const box = document.getElementById('hubi-sprite-box');
  if (!box) return;
  const pos = ['0% 0%', '50% 0%', '100% 0%'][frame - 1] || '0% 0%';
  box.style.backgroundPosition = pos;
}

function hubiStopIdleAnim() {
  if (_hubiIdleTimer) { clearInterval(_hubiIdleTimer); _hubiIdleTimer = null; }
}

// Fica parado no frame 1 (dormindo), sem ficar alternando/tremendo.
// A troca de frame só acontece de verdade quando HuBi cura (frame 2).
function hubiStartIdleAnim() {
  if (!_hubiSpriteReady) return;
  hubiStopIdleAnim();
  hubiSetBadgeFrame(1);
}

// Toca o frame de cura (frame 2) e volta a "dormir" depois.
function hubiPlayCuraFrame() {
  if (!_hubiSpriteReady) return;
  hubiStopIdleAnim();
  hubiSetBadgeFrame(2);
  setTimeout(() => { hubiStartIdleAnim(); }, HUBI_CONFIG.DUR_FRAME_CURA);
}

// ─────────────────────────────────────────────────────────────
//  6. CURA PASSIVA EM BATALHA — chamado de tickPlayerStatusEffects()
// ─────────────────────────────────────────────────────────────

function hubiTickCura(bs, p) {
  hubiInit();
  if (!G.hubi.despertado) return;
  if (p.hp >= p.maxHp) return;
  // ── Couraça do Rei da Selva: bloqueia cura passiva do HuBi quando Fervor Selvagem está ativa ──
  if (bs._couraca_fervor_ativa) return;
  // ── Ar corrosivo de Kurosaki: sem a Runa Yu fortificada e equipada, o HuBi não consegue curar ──
  if (typeof window.kurosakiCuraBloqueada === 'function' && window.kurosakiCuraBloqueada()) return;

  let cura = HUBI_CONFIG.CURA_POR_LEVEL[G.hubi.level] || HUBI_CONFIG.CURA_POR_LEVEL[0];
  if (hubiTemTalento('cura_prolongada')) cura = Math.round(cura * 1.15);
  if (hubiTemTalento('fluxo_vital'))     cura += Math.round((p.maxHp || 0) * 0.05);
  const hpCriticoFuria = hubiTemTalento('furia_curativa') && p.hp < p.maxHp * 0.30;
  if (hpCriticoFuria) cura *= 2;

  const antes = p.hp;
  p.hp = Math.min(p.maxHp, p.hp + cura);
  const curado = p.hp - antes;
  if (curado > 0) {
    appendBattleLog(`🌿 HuBi canta e cura ${curado} HP!${hpCriticoFuria ? ' (Fúria Curativa!)' : ''}`, '#7ec87e');
    if (typeof showFloatingNumber === 'function') showFloatingNumber('hero', curado, 'heal');
    hubiPlayCuraFrame();
    hubiPlaySom(); // só toca quando ele realmente ajuda
    // XP por cura removido — HuBi agora só ganha XP ao vencer batalhas (hubiRegisterVitoria).

    if (hubiTemTalento('renovacao')) {
      let renovMsg = [];
      if (p.ap !== undefined) {
        p.ap = Math.min(p.maxAp || p.ap, (p.ap || 0) + 5);
        renovMsg.push('+5 AP');
      }
      if (p.mp !== undefined) {
        p.mp = Math.min(p.maxMp || p.mp, (p.mp || 0) + 5);
        renovMsg.push('+5 MP');
      }
      if (renovMsg.length) appendBattleLog(`💠 Renovação: ${renovMsg.join(' e ')}!`, '#a0c8ff');
    }
    if (hubiTemTalento('purificacao') && Math.random() < 0.20) {
      let purificou = false;
      if (bs.playerPoisoned) { bs.playerPoisoned = false; purificou = true; }
      if (bs.playerBleeding) { bs.playerBleeding = false; purificou = true; }
      if (bs.playerBurning)  { bs.playerBurning  = false; purificou = true; }
      if (purificou) appendBattleLog('✨ Purificação! HuBi removeu um efeito negativo.', '#d0ffe0');
    }
    if (hubiTemTalento('escudo_verdejante')) {
      bs._hubiEscudo = Math.round(curado * 0.10);
      if (bs._hubiEscudo > 0) {
        appendBattleLog(`🍃 Escudo Verdejante: absorve até ${bs._hubiEscudo} de dano no próximo turno.`, '#8fd98f');
      }
    }
  }
}

// ── Proteções passivas do HuBi contra dano recebido (Casca Protetora,
//    Vigília Atenta, Barreira Absoluta, Escudo Verdejante, Renascimento) ──
function hubiAplicarProtecoes(dmg, bs) {
  hubiInit();
  if (!G.hubi.despertado || !bs || dmg <= 0) return dmg;
  const p = G.player;

  // Escudo Verdejante — consome o "estoque" criado na última cura.
  if (bs._hubiEscudo && bs._hubiEscudo > 0) {
    const absorvido = Math.min(dmg, bs._hubiEscudo);
    dmg -= absorvido;
    bs._hubiEscudo -= absorvido;
    if (absorvido > 0) appendBattleLog(`🍃 Escudo Verdejante absorveu ${absorvido} de dano!`, '#8fd98f');
  }

  // Casca Protetora / Vigília Atenta / Barreira Absoluta
  if (hubiTemTalento('casca_protetora') && dmg > 0) {
    const chance = hubiTemTalento('vigilia_atenta') ? 0.20 : 0.10;
    if (Math.random() < chance) {
      const reducao   = hubiTemTalento('barreira_absoluta') ? 1.0 : 0.5;
      const bloqueado = Math.round(dmg * reducao);
      dmg -= bloqueado;
      appendBattleLog(`🛡️ Casca Protetora de HuBi bloqueou ${bloqueado} de dano!`, '#7ec8e8');
      if (typeof showFloatingNumber === 'function') showFloatingNumber('hero', '🛡️ BLOQUEADO', 'status');
    }
  }

  // Renascimento do Bosque — impede a morte 1x por batalha, deixando em 50% do HP máx.
  if (p && hubiTemTalento('renascimento_bosque') && !bs._hubiRenascimentoUsado) {
    const hpApos = p.hp - dmg;
    if (hpApos <= 0) {
      bs._hubiRenascimentoUsado = true;
      const alvo = Math.floor((p.maxHp || 0) * 0.5);
      dmg = Math.max(0, p.hp - alvo);
      appendBattleLog('🌳 Renascimento do Bosque! HuBi te envolve numa luz verde e te protege da queda!', '#7ec87e');
      if (typeof showFloatingNumber === 'function') showFloatingNumber('hero', '🌳 RENASCIMENTO', 'status');
      if (typeof notify === 'function') notify('🌳 HuBi usou Renascimento do Bosque para te salvar!', 'gold');
    }
  }

  return Math.max(0, dmg);
}

// Intercepta o hook de dano do jogo (mesmo ponto usado pelos talentos do
// jogador) pra aplicar as proteções do HuBi sem precisar tocar em palDinh.js.
if (typeof window.applyTalentOnReceiveDamage === 'function' && !window._hubiOrigApplyTalentOnReceiveDamage) {
  window._hubiOrigApplyTalentOnReceiveDamage = window.applyTalentOnReceiveDamage;
}
window.applyTalentOnReceiveDamage = function (dmg, bs) {
  if (typeof window._hubiOrigApplyTalentOnReceiveDamage === 'function') {
    dmg = window._hubiOrigApplyTalentOnReceiveDamage(dmg, bs);
  }
  return hubiAplicarProtecoes(dmg, bs);
};

// ─────────────────────────────────────────────────────────────
//  7. BADGE PEQUENO NA TELA DE BATALHA — chamado de updateBattleHUD()
// ─────────────────────────────────────────────────────────────

function updateHubiBattleBadge() {
  hubiInit();
  const heroSide = document.getElementById('bat-hero-side');
  if (!heroSide) return;
  let badge = document.getElementById('hubi-battle-badge');

  if (!G.hubi.despertado) {
    if (badge) badge.style.display = 'none';
    hubiStopIdleAnim();
    return;
  }

  const cura = HUBI_CONFIG.CURA_POR_LEVEL[G.hubi.level] || HUBI_CONFIG.CURA_POR_LEVEL[0];

  if (!badge) {
    // Reseta o estado global do sprite a cada novo badge — evita que o
    // "pronto" de uma batalha anterior vaze pra um badge novo (isso causava
    // ícone + spritesheet + emoji aparecendo sobrepostos).
    _hubiSpriteReady = false;
    hubiStopIdleAnim();

    badge = document.createElement('div');
    badge.id = 'hubi-battle-badge';
    badge.style.cssText = `
      position:absolute; top:2px; left:4px; z-index:15;
      display:flex; flex-direction:column; align-items:center; gap:1px;
      cursor:pointer;
    `;
    badge.title = 'HuBi — toque para ver detalhes';
    badge.onclick = hubiShowInfoPopup;

    const box = document.createElement('div');
    box.id = 'hubi-sprite-box';
    box.style.cssText = `
      width:26px;height:26px;border-radius:50%;overflow:hidden;position:relative;
      border:1px solid #7ec87e;box-shadow:0 0 5px rgba(126,200,126,0.7);
      background-color:rgba(10,20,10,0.4);background-repeat:no-repeat;
      display:flex;align-items:center;justify-content:center;
    `;

    const img = document.createElement('img');
    img.id = 'hubi-sprite-fallback';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;object-position:center;display:block;';
    img.src = HUBI_CONFIG.ICON;

    const emoji = document.createElement('span');
    emoji.id = 'hubi-sprite-emoji-fallback';
    emoji.style.cssText = 'font-size:1rem;display:none;';
    emoji.textContent = HUBI_CONFIG.ICON_FALLBACK;

    // Se o ícone falhar, esconde a img e mostra só o emoji (nunca os dois).
    img.onerror = () => {
      img.style.display = 'none';
      emoji.style.display = 'inline';
    };

    box.appendChild(img);
    box.appendChild(emoji);

    const label = document.createElement('span');
    label.id = 'hubi-battle-label';
    label.style.cssText = `
      font-size:0.48rem;color:#a8e8a8;font-family:'Noto Sans JP',sans-serif;
      text-shadow:0 0 3px rgba(0,0,0,0.8);white-space:nowrap;
    `;
    label.textContent = `HuBi Lv${G.hubi.level} +${cura}`;

    badge.appendChild(box);
    badge.appendChild(label);
    heroSide.style.position = heroSide.style.position || 'relative';
    heroSide.appendChild(badge);

    // Retrato estático, sempre centralizado — sem spritesheet, sem troca de
    // frame. HuBi não fica "se mexendo" no badge de batalha.
  }

  badge.style.display = 'flex';
  const label = document.getElementById('hubi-battle-label');
  if (label) label.textContent = `HuBi Lv${G.hubi.level} +${cura}`;
}

// Pequeno popup ao tocar no badge de batalha: mostra status e, se
// houver usos disponíveis, o botão "Pedir ajuda a HuBi" (ver item 13).
function hubiShowInfoPopup() {
  hubiInit();
  if (!G.hubi.despertado) return;

  const old = document.getElementById('hubi-battle-popup');
  if (old) { old.remove(); return; } // toque de novo no badge fecha o popup

  const cura    = HUBI_CONFIG.CURA_POR_LEVEL[G.hubi.level];
  const pontos  = G.hubi.pontosTalento || 0;
  const bs      = (typeof battleState !== 'undefined') ? battleState : null;
  const emBatalha = !!(bs && typeof G !== 'undefined' && G.inBattle);
  const usos    = bs ? (bs._hubiAjudaUsos || 0) : 0;
  const max     = hubiIntuicaoUsosMax();
  const podeAjudar = emBatalha && max > 0 && usos < max;

  const box = document.createElement('div');
  box.id = 'hubi-battle-popup';
  box.style.cssText = `
    position:absolute; top:34px; left:4px; z-index:20; min-width:150px;
    background:rgba(10,8,4,0.95); border:1px solid rgba(126,200,126,0.4);
    border-radius:8px; padding:8px; font-family:'Noto Serif JP',serif;
    font-size:0.6rem; line-height:1.35; color:var(--gold2,#e8d9a8);
    box-shadow:0 2px 10px rgba(0,0,0,0.5);
  `;
  box.innerHTML = `
    <div style="margin-bottom:6px;">🌿 HuBi Lv${G.hubi.level} — cura ${cura} HP/turno${
      pontos > 0 ? `<br><span style="color:#e8d878;">${pontos} ponto(s) de talento disponível(is)!</span>` : ''
    }</div>
    ${podeAjudar
      ? `<button id="_hubi_pedir_ajuda_btn" style="width:100%;padding:5px;font-size:0.58rem;border:1px solid rgba(126,200,126,0.5);background:rgba(40,100,40,0.25);color:#7ec87e;cursor:pointer;border-radius:4px;">Pedir ajuda a HuBi (${max - usos} restante${(max - usos) === 1 ? '' : 's'})</button>`
      : (emBatalha ? `<div style="opacity:0.6;">HuBi já ajudou o quanto pôde nessa batalha.</div>` : '')}
  `;

  const badge = document.getElementById('hubi-battle-badge');
  (badge || document.body).appendChild(box);

  const btn = document.getElementById('_hubi_pedir_ajuda_btn');
  if (btn) btn.onclick = (e) => { e.stopPropagation(); hubiPedirAjuda(); box.remove(); };

  // Fecha se tocar fora do popup.
  setTimeout(() => {
    document.addEventListener('click', function fechaFora(e) {
      if (!box.contains(e.target) && e.target.id !== 'hubi-battle-badge') {
        box.remove();
        document.removeEventListener('click', fechaFora);
      }
    });
  }, 50);
}

// ─────────────────────────────────────────────────────────────
//  8. AMULETO — popup de detalhes com contador de feição (0.0% → 100.0%)
// ─────────────────────────────────────────────────────────────

// Monta um "node" (nó) visual de talento pro grid da árvore.
// `capstone` = true para a última habilidade do caminho (tier 6),
// que recebe um destaque visual próprio (moldura dourada) por ser
// a habilidade final/culminante do caminho.
function hubiRenderTalentoNode(t, capstone) {
  const owned     = hubiTemTalento(t.id);
  const bloqueado = hubiTalentoBloqueadoPorRamo(t);
  const available = hubiTalentoDisponivel(t);

  const cor    = owned ? '#7ec87e' : bloqueado ? 'rgba(220,120,120,0.55)' : (available ? '#e8d878' : 'rgba(210,210,210,0.45)');
  const borda  = owned ? '#7ec87e' : bloqueado ? 'rgba(220,120,120,0.3)' : (available ? '#e8d878' : 'rgba(210,210,210,0.25)');
  const bg     = owned ? 'rgba(126,200,126,0.14)' : bloqueado ? 'rgba(220,120,120,0.05)' : (available ? 'rgba(232,216,120,0.10)' : 'rgba(255,255,255,0.03)');
  const brilho = available ? 'box-shadow:0 0 8px rgba(232,216,120,0.35);' : '';
  const opacidade = bloqueado ? 'opacity:0.5;' : '';
  const bordaFinal = capstone && !owned && !bloqueado ? 'rgba(232,216,120,0.55)' : borda;
  const larguraExtra = capstone ? 'min-width:96px;max-width:112px;padding:9px 6px;' : 'min-width:72px;max-width:88px;padding:7px 4px;';

  return `
    <div class="_hubi_talento_node" data-id="${t.id}"
         style="border:1px solid ${bordaFinal};background:${bg};${brilho}${opacidade}border-radius:6px;${larguraExtra}
                text-align:center;cursor:pointer;flex:1 1 72px;">
      <div style="font-size:${capstone ? '1.5' : '1.25'}rem;line-height:1.1;">${bloqueado ? '🔒' : t.icon}</div>
      <div style="font-size:0.52rem;color:${cor};margin-top:3px;line-height:1.2;">${t.nome}</div>
      ${owned ? '<div style="font-size:0.46rem;color:#7ec87e;margin-top:2px;">✔ aprendido</div>' : ''}
    </div>
  `;
}

// Monta a árvore inteira, separada nos dois caminhos (cura / proteção).
// Os tiers 1–5 aparecem em pares (2 colunas), pra ocupar menos altura
// e exigir menos rolagem. O tier 6 (capstone) fica sozinho, centralizado
// e destacado, já que é a habilidade final do caminho.
function hubiRenderArvoreTalentos() {
  const ramos = [
    { branch:'cura',     titulo:'🌿 Caminho do Curandeiro' },
    { branch:'protecao', titulo:'🛡️ Caminho do Guardião' },
  ];
  return ramos.map(ramo => {
    const talentosDoRamo = HUBI_TALENTOS.filter(t => t.branch === ramo.branch).sort((a,b) => a.tier - b.tier);
    const capstone  = talentosDoRamo[talentosDoRamo.length - 1];
    const regulares = talentosDoRamo.slice(0, -1);
    const escolhido = G.hubi.branchEscolhido;
    const destacado = escolhido === ramo.branch;
    const apagado   = escolhido && escolhido !== ramo.branch;

    // Agrupa os talentos regulares em pares (2 por fileira).
    const fileiras = [];
    for (let i = 0; i < regulares.length; i += 2) {
      fileiras.push(regulares.slice(i, i + 2));
    }

    return `
      <div style="margin-bottom:10px;${apagado ? 'opacity:0.5;' : ''}">
        <div style="text-align:center;font-size:0.58rem;letter-spacing:1px;margin-bottom:5px;
                    color:${destacado ? '#e8d878' : 'rgba(242,232,208,0.55)'};">${ramo.titulo}${destacado ? ' ✔' : ''}</div>
        ${fileiras.map((fileira, i) => `
          ${i > 0 ? '<div style="text-align:center;color:rgba(126,200,126,0.3);font-size:0.6rem;margin:1px 0;">↓</div>' : ''}
          <div style="display:flex;justify-content:center;gap:6px;flex-wrap:wrap;">
            ${fileira.map(t => hubiRenderTalentoNode(t, false)).join('')}
          </div>
        `).join('')}
        <div style="text-align:center;color:rgba(232,216,120,0.4);font-size:0.6rem;margin:1px 0;">↓</div>
        <div style="display:flex;justify-content:center;">${hubiRenderTalentoNode(capstone, true)}</div>
      </div>
    `;
  }).join('');
}

function hubiShowAmuletoPopup() {
  hubiInit();
  const old = document.getElementById('hubi-amuleto-popup');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'hubi-amuleto-popup';
  overlay.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;
    background:rgba(0,0,0,0.72);display:flex;align-items:center;justify-content:center;padding:16px;
  `;
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  let innerHtml;

  if (!G.hubi.despertado) {
    // ── Antes do despertar: tela de progresso de Feição (igual antes) ──
    const pct    = Math.max(0, Math.min(100, (G.hubi.merito / HUBI_CONFIG.META_MERITO) * 100));
    const pctStr = pct.toFixed(1);
    innerHtml = `
      <div style="padding:18px 16px;text-align:center;">
        <img src="${HUBI_CONFIG.IMG_AMULETO}" onerror="this.style.display='none';"
             style="width:72px;height:72px;object-fit:contain;margin:0 auto 10px;display:block;">
        <div style="font-size:1.05rem;font-weight:700;margin-bottom:10px;">Amuleto HuBi</div>
        <div style="font-size:0.75rem;color:rgba(242,232,208,0.55);font-style:italic;margin-bottom:16px;line-height:1.5;">
          Uma pedra fria ao toque, guardada há anos no sótão da estalagem. Algo grandioso parece dormir em seu interior, esperando. Parece reagir, aos poucos, à Feição que ela sente por você — algo só dela, diferente do que o resto do vilarejo pensa a seu respeito.
        </div>
        <div style="font-size:0.6rem;letter-spacing:2px;color:#a8d8f0;margin-bottom:5px;">FEIÇÃO</div>
        <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(120,190,232,0.3);height:10px;border-radius:5px;overflow:hidden;margin-bottom:6px;">
          <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#1e4e78,#7ec8e8);"></div>
        </div>
        <div style="font-size:0.85rem;color:#c8e0f0;">${pctStr}%</div>
        <div style="font-size:0.65rem;color:rgba(242,232,208,0.5);font-style:italic;margin-top:12px;">Sinta a Feição da pedra crescer conforme você ajuda o povo de Pedra Branca... Algo mais parece observar, esperando o momento de se revelar.</div>
        <button id="_hubi_amuleto_close" style="
          margin-top:18px;font-family:'Noto Serif JP',serif;font-size:0.7rem;letter-spacing:1px;
          padding:9px 22px;border:1px solid rgba(120,190,232,0.4);background:rgba(30,70,110,0.15);
          color:#7ec8e8;cursor:pointer;">Fechar</button>
      </div>
    `;
  } else {
    // ── Depois do despertar: árvore de talentos do HuBi ──
    const noMax          = G.hubi.level >= HUBI_CONFIG.MAX_LEVEL;
    const xpAtualNoNivel  = G.hubi.xp - HUBI_CONFIG.XP_THRESHOLDS[G.hubi.level];
    const xpNecessario    = noMax ? 0 : (HUBI_CONFIG.XP_THRESHOLDS[G.hubi.level + 1] - HUBI_CONFIG.XP_THRESHOLDS[G.hubi.level]);
    const xpPct           = noMax ? 100 : Math.max(0, Math.min(100, (xpAtualNoNivel / xpNecessario) * 100));
    const pontos          = G.hubi.pontosTalento || 0;

    innerHtml = `
      <div style="padding:14px 12px;">
        <div style="text-align:center;margin-bottom:10px;">
          <img src="${HUBI_CONFIG.ICON}" onerror="this.style.display='none';"
               style="width:52px;height:52px;object-fit:cover;border-radius:50%;border:1px solid rgba(126,200,126,0.5);margin:0 auto 6px;display:block;">
          <div style="font-size:1rem;font-weight:700;color:var(--gold2);">HuBi — Nível ${G.hubi.level}${noMax ? ' (máx.)' : ''}</div>
          <div style="font-size:0.6rem;letter-spacing:1px;color:#a8e8a8;margin-top:4px;">🌟 ${pontos} ponto(s) de talento disponível(is)</div>
          <div style="font-size:0.58rem;letter-spacing:1px;margin-top:2px;color:${G.hubi.branchEscolhido ? '#e8d878' : 'rgba(242,232,208,0.5)'};">
            ${G.hubi.branchEscolhido ? `Caminho escolhido: ${G.hubi.branchEscolhido === 'cura' ? '🌿 Curandeiro' : '🛡️ Guardião'}` : 'Caminho ainda não escolhido — o 1º talento aprendido define e trava o outro.'}
          </div>
        </div>

        <div style="font-size:0.55rem;letter-spacing:2px;color:#a8d8f0;margin-bottom:4px;text-align:center;">${noMax ? 'XP MÁXIMO' : 'XP'}</div>
        <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(126,200,126,0.3);height:9px;border-radius:5px;overflow:hidden;margin-bottom:4px;">
          <div style="width:${xpPct}%;height:100%;background:linear-gradient(90deg,#2d5a2d,#7ec87e);"></div>
        </div>
        <div style="font-size:0.7rem;color:#c8e8c8;text-align:center;margin-bottom:14px;">
          ${noMax ? 'Nível máximo alcançado' : `${xpAtualNoNivel} / ${xpNecessario} XP`}
        </div>

        <div style="font-size:0.6rem;letter-spacing:2px;color:#a8d8f0;margin-bottom:8px;text-align:center;">ÁRVORE DE TALENTOS</div>
        <div id="_hubi_arvore" style="max-height:230px;overflow-y:auto;margin-bottom:10px;padding:2px;">
          ${hubiRenderArvoreTalentos()}
        </div>

        <div id="_hubi_talento_detalhe" style="
          background:rgba(255,255,255,0.03);border:1px solid rgba(126,200,126,0.2);border-radius:6px;
          padding:10px;min-height:56px;font-size:0.68rem;color:rgba(242,232,208,0.75);line-height:1.4;margin-bottom:12px;">
          Toque em um talento para ver os detalhes.
        </div>

        <div style="text-align:center;">
          <button id="_hubi_amuleto_close" style="
            font-family:'Noto Serif JP',serif;font-size:0.7rem;letter-spacing:1px;
            padding:9px 22px;border:1px solid rgba(120,190,232,0.4);background:rgba(30,70,110,0.15);
            color:#7ec8e8;cursor:pointer;">Fechar</button>
        </div>
      </div>
    `;
  }

  overlay.innerHTML = `
    <div style="background:#0e0a05;border:1px solid rgba(120,190,232,0.4);border-top:3px solid #7ec8e8;
                width:100%;max-width:${G.hubi.despertado ? 360 : 320}px;font-family:'Noto Serif JP',serif;color:var(--gold2);
                border-radius:2px;overflow:hidden;">
      <div style="padding:6px 14px;background:rgba(120,190,232,0.1);border-bottom:1px solid rgba(120,190,232,0.2);
                  font-family:'Noto Sans JP',sans-serif;font-size:0.52rem;letter-spacing:4px;color:#7ec8e8;">
        ${G.hubi.despertado ? 'ALIADO' : 'RELÍQUIA'}
      </div>
      ${innerHtml}
    </div>
  `;
  document.body.appendChild(overlay);

  const closeBtn = document.getElementById('_hubi_amuleto_close');
  if (closeBtn) closeBtn.onclick = () => overlay.remove();

  if (G.hubi.despertado) {
    const arvore   = document.getElementById('_hubi_arvore');
    const detalhe  = document.getElementById('_hubi_talento_detalhe');
    if (arvore && detalhe) {
      arvore.querySelectorAll('._hubi_talento_node').forEach(node => {
        node.addEventListener('click', () => {
          const id = node.getAttribute('data-id');
          const t  = HUBI_TALENTOS.find(x => x.id === id);
          if (!t) return;
          const owned      = hubiTemTalento(id);
          const disponivel = hubiTalentoDisponivel(t);
          const reqsNomes  = t.requires.map(r => (HUBI_TALENTOS.find(x => x.id === r) || {}).nome).filter(Boolean).join(', ');

          let extra;
          if (owned) {
            extra = '<div style="color:#7ec87e;margin-top:8px;font-size:0.65rem;">✔ Já aprendido</div>';
          } else if (hubiTalentoBloqueadoPorRamo(t)) {
            const nomeRamoAtual = G.hubi.branchEscolhido === 'cura' ? '🌿 Caminho do Curandeiro' : '🛡️ Caminho do Guardião';
            extra = `<div style="color:rgba(220,120,120,0.85);margin-top:8px;font-size:0.62rem;">🔒 Bloqueado — você já escolheu o ${nomeRamoAtual} nesta jornada.</div>`;
          } else if (disponivel) {
            extra = `<button id="_hubi_aprender_btn" style="margin-top:8px;font-family:'Noto Serif JP',serif;font-size:0.65rem;
                     padding:6px 16px;border:1px solid rgba(126,200,126,0.5);background:rgba(40,100,40,0.2);
                     color:#7ec87e;cursor:pointer;">Aprender (1 ponto)</button>`;
          } else if (reqsNomes) {
            extra = `<div style="color:rgba(232,150,150,0.85);margin-top:8px;font-size:0.62rem;">Requer: ${reqsNomes}</div>`;
          } else {
            extra = `<div style="color:rgba(232,216,120,0.75);margin-top:8px;font-size:0.62rem;">Sem pontos de talento disponíveis.</div>`;
          }

          detalhe.innerHTML = `<div style="color:var(--gold2);font-weight:700;margin-bottom:4px;">${t.icon} ${t.nome}</div><div>${t.desc}</div>${extra}`;
          const aprenderBtn = document.getElementById('_hubi_aprender_btn');
          if (aprenderBtn) aprenderBtn.onclick = () => hubiComprarTalento(id);
        });
      });
    }
  }
}

// Intercepta showItemPopup: se for o Amuleto HuBi, abre o popup próprio
// (feição/progresso) em vez da tela genérica de item.
if (typeof showItemPopup === 'function' && !window._hubiOrigShowItemPopup) {
  window._hubiOrigShowItemPopup = showItemPopup;
  showItemPopup = function (idx, item) {
    if (item && item.isHubiAmulet) { hubiShowAmuletoPopup(); return; }
    return window._hubiOrigShowItemPopup(idx, item);
  };
}

// ─────────────────────────────────────────────────────────────
//  9. SPLASH "NOVO ALIADO" — mostrado assim que a pedra desperta
// ─────────────────────────────────────────────────────────────

function hubiShowObtidoOverlay(onContinue) {
  const old = document.getElementById('hubi-obtido-overlay');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'hubi-obtido-overlay';
  overlay.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;z-index:10000;
    background:rgba(0,0,0,0.88);display:flex;flex-direction:column;
    align-items:center;justify-content:center;padding:24px;text-align:center;
  `;
  overlay.innerHTML = `
    <div style="font-family:'Noto Sans JP',sans-serif;font-size:0.6rem;letter-spacing:6px;color:#7ec87e;margin-bottom:14px;">NOVO ALIADO</div>
    <img src="${HUBI_CONFIG.IMG_OBTIDO}" onerror="this.style.display='none';"
         style="max-width:220px;max-height:260px;object-fit:contain;filter:drop-shadow(0 0 18px rgba(126,200,126,0.6));margin-bottom:16px;">
    <div style="font-family:'Noto Serif JP',serif;font-size:1.2rem;color:var(--gold2);margin-bottom:6px;">HuBi despertou!</div>
    <div style="font-family:'Noto Serif JP',serif;font-size:0.8rem;color:rgba(242,232,208,0.6);margin-bottom:22px;">Ele agora luta ao seu lado, curando-o em batalha.</div>
    <button id="_hubi_obtido_continuar" style="
      font-family:'Noto Serif JP',serif;font-size:0.75rem;letter-spacing:1px;
      padding:10px 26px;border:1px solid rgba(126,200,126,0.5);background:rgba(40,100,40,0.2);
      color:#7ec87e;cursor:pointer;">Continuar</button>
  `;
  document.body.appendChild(overlay);
  const btn = document.getElementById('_hubi_obtido_continuar');
  if (btn) btn.onclick = () => {
    overlay.remove();
    if (typeof onContinue === 'function') onContinue();
  };
}

// ─────────────────────────────────────────────────────────────
//  10. NARRATIVA — Dona Mitsue / sótão / despertar
// ─────────────────────────────────────────────────────────────

// Chamado no início de storyNode_estalagem(). Se ainda não mostrou a
// cutscene de revelação e o mérito já bateu o mínimo, mostra e retorna
// true (quem chamou deve interromper o fluxo normal da estalagem).
function hubiCheckCutsceneRevelacao() {
  hubiInit();
  if (G.hubi.revelado && !G.hubi._cutsceneVista) {
    G.hubi._cutsceneVista = true;
    hubiNode_revelacao();
    return true;
  }
  return false;
}

function hubiNode_revelacao() {
  const img = 'Imagens/personagens/DMitsue.png';
  if (typeof setScene === 'function') setScene('hubi-sotao');
  if (typeof showStoryCutscene === 'function') {
    showStoryCutscene('Imagens/file_000000000ba4820e871ac75268023415.png', { hubiSotao: true });
  }
  setStory('DONA MITSUE',
    `Mitsue pousa a xícara de chá devagar, observando você por um instante mais longo que o normal.\n\n"Você tem ajudado bastante por aqui... o povo já fala do seu nome pelas ruas."\n\nEla se levanta e olha para uma escada estreita nos fundos da estalagem, quase escondida entre as prateleiras.\n\n"Lá no sótão desta casa eu guardo algo há muitos anos. Uma pedra. Chamam de HuBi. Dizem que ela dorme, esperando alguém digno."\n\n"Se continuar ajudando os moradores de Pedra Branca, talvez ela desperte para caminhar ao seu lado. Ela tem sua própria forma de sentir isso — o que eu chamo de Feição — e ela exige muito: precisa alcançar ${HUBI_CONFIG.META_MERITO}."\n\n(Volte a conversar comigo sempre que quiser saber o quanto falta.)`,
    [{ icon:'↩', text:'Continuar', action: storyNode_estalagem }],
    img
  );
}

// Entrada do menu de HuBi na estalagem (chamado pelo botão em vilarejo.js).
function hubiNode_estalagemMenu() {
  hubiInit();
  const img = 'Imagens/personagens/DMitsue.png';

  if (!G.hubi.despertado) {
    if (G.hubi.merito >= HUBI_CONFIG.META_MERITO) {
      hubiNode_despertar();
      return;
    }
    const pct = ((G.hubi.merito / HUBI_CONFIG.META_MERITO) * 100).toFixed(1);
    if (typeof setScene === 'function') setScene('hubi-sotao');
    if (typeof showStoryCutscene === 'function') {
      showStoryCutscene('Imagens/file_000000000ba4820e871ac75268023415.png', { hubiSotao: true });
    }
    setStory('DONA MITSUE',
      `Mitsue olha para o teto, na direção do sótão.\n\n"A pedra ainda dorme. Sinto a Feição dela por você crescendo aos poucos — hoje, ${G.hubi.merito} de ${HUBI_CONFIG.META_MERITO} (${pct}%)."\n\n"Continue ajudando o povo de Pedra Branca, e volte quando sentir que é hora."`,
      [{ icon:'↩', text:'Voltar', action: storyNode_estalagem }],
      img
    );
  } else {
    const cura   = HUBI_CONFIG.CURA_POR_LEVEL[G.hubi.level];
    const noMax  = G.hubi.level >= HUBI_CONFIG.MAX_LEVEL;
    const pontos = G.hubi.pontosTalento || 0;
    const progresso = noMax
      ? ' (nível máximo)'
      : '\n\nEle ganha experiência lutando ao seu lado e curando você em batalha.';
    const pontosMsg = pontos > 0
      ? `\n\nHuBi tem ${pontos} ponto(s) de talento esperando para serem usados — toque no Amuleto HuBi na sua bolsa para abrir a árvore de talentos.`
      : '';
    setStory('HUBI',
      `HuBi se aninha perto de você, soltando um brilho suave verde-azulado.\n\n"${hubiFraseCura(cura)}"${progresso}${pontosMsg}`,
      [{ icon:'↩', text:'Voltar', action: storyNode_estalagem }],
      HUBI_CONFIG.ICON
    );
  }
}

// Disponível depois que HuBi desperta — Mitsue fala, em suspense, de uma
// amiga antiga que não vê há anos. Não revela nada sobre a natureza dela
// nem sobre o que o amuleto completo realmente significa (sem spoilers).
function hubiNode_amigaAntiga() {
  const img = 'Imagens/personagens/DMitsue.png';
  setStory('DONA MITSUE',
    `Mitsue segura a xícara com as duas mãos, sem bebê-la, olhando para o caminho que sobe em direção às montanhas.\n\n"Tenho uma amiga," ela diz, baixinho. "Há anos não a vejo. Não por briga... por escolha. As coisas ficaram... complicadas, da última vez."\n\nEla hesita, como se estivesse prestes a dizer mais, mas se contém.\n\n"Ela sempre entendeu HuBi melhor do que eu jamais entenderia. Se a pedra um dia se completar... acho que vou ter que escrever a ela. Ou talvez ela já saiba. Sempre soube das coisas antes de acontecerem."\n\nMitsue sorri de leve, mas os olhos permanecem sérios por um instante longo demais.\n\n"Continue ajudando o povo. Falta pouco."`,
    [{ icon:'↩', text:'Voltar à estalagem', action: storyNode_estalagem }],
    img
  );
}

function hubiNode_despertar() {
  const img = 'Imagens/personagens/DMitsue.png';
  if (typeof setScene === 'function') setScene('hubi-sotao');
  setStory('DONA MITSUE',
    `Mitsue sobe com você a escada estreita até o sótão, em silêncio. No canto empoeirado, sobre um pano velho, uma pequena pedra pulsa com uma luz verde-azulada fraca.\n\n"Chegou a hora," ela sussurra, se afastando um passo. "Toque nela."`,
    [{ icon:'✋', text:'Tocar a pedra', action: () => {
        hubiInit();
        G.hubi.despertado = true;
        G.hubi.level = 0;
        G.hubi.vitorias = 0;
        hubiDarAmuleto(); // entrega o Amuleto HuBi na mochila só agora, no despertar de fato
        notify('💠 A pedra HuBi despertou!', 'gold');
        addLog('HuBi despertou e agora luta ao seu lado, curando-o em batalha.', 'xp');
        hubiShowObtidoOverlay(() => {
          setStory('HUBI',
            `A pedra racha suavemente e uma pequena criatura peluda, azul e verde, se desenrola de dentro dela. Ela pisca os olhos grandes e brilhantes, e sorri para você.\n\n"...Bili? Zun-zun..." A voz é suave, quase cantada — sons estranhos, sem forma ainda, como se testasse a própria boca pela primeira vez. Depois de um instante, ela tenta de novo, mais devagar: "...Hu... bi?"\n\nHuBi flutua até seu ombro, os olhos percorrendo tudo ao redor com um espanto enorme, como se o mundo inteiro fosse novo demais pra caber naquele olhar. A partir de agora, ele estará ao seu lado nas batalhas, curando-o a cada turno — mesmo sem saber ainda dizer isso em palavras.`,
            [{ icon:'↩', text:'Voltar à estalagem', action: storyNode_estalagem }],
            HUBI_CONFIG.ICON
          );
        });
    }}],
    img
  );
}

// ─────────────────────────────────────────────────────────────
//  11. FALA DO HUBI — Hubistês evoluindo pra Português, sempre em
//      3ª pessoa (ileísmo, tipo Paimon). Ele aprende a falar aos
//      poucos, junto com o nível de HuBi (mesma progressão de
//      sempre — reaproveita G.hubi.level, 0 a 10), e aparece do
//      nada em qualquer canto do jogo pra soltar uma fala curta,
//      nunca durante batalha.
// ─────────────────────────────────────────────────────────────

const HUBI_FALA_CONFIG = {
  CHANCE_APARECER: 0.16,   // chance de aparecer a cada troca de cena
  COOLDOWN_MS:     45000,  // tempo mínimo entre aparições
  DURACAO_MS:      5200,   // quanto tempo a fala fica na tela
};

// Tiers de fala, por nível de HuBi. Tier 0 = recém-desperto, quase só
// sons inventados (Hubistês). Vai ganhando palavras e frases curtas de
// verdade conforme o nível sobe — nunca usa "eu", sempre "HuBi".
const HUBI_FALAS = {
  0: [ // Lv0 — Hubistês puro, só sons, sem palavras reais ainda
    '"Bili-bili... zun?"',
    '"Mmm... Hu-bi. HuBi disse HuBi!"',
    '"Zaa... zaa-tu?"',
    '"...Nn? Nn!"',
    '"Bu-bili... tu?"',
  ],
  1: [ // Lv1–2 — primeiras palavras soltas, gramática quase nula
    '"HuBi... anda? HuBi tenta andar."',
    '"Isso! HuBi gosta disso. Zun."',
    '"Grande. Tudo grande. HuBi pequeno."',
    '"HuBi guarda palavra nova hoje."',
    '"Cheiro bom. HuBi cheira de novo?"',
  ],
  2: [ // Lv3–5 — frases curtas, torta mas entendível
    '"HuBi acha que é por ali. Ou não. HuBi ainda aprende."',
    '"HuBi nunca viu isso antes. HuBi gostou."',
    '"Psiu. HuBi só queria olhar um pouco."',
    '"HuBi ficou com fome só de olhar isso."',
    '"HuBi acha esse lugar estranho. Estranho bom."',
  ],
  3: [ // Lv6–8 — quase fluente, tagarela, comentando o mundo
    '"HuBi acha que hoje é um bom dia. HuBi decidiu isso agora."',
    '"Sabia que HuBi nunca se cansa disso? Nunca."',
    '"HuBi não vai atrapalhar. Só queria dizer oi."',
    '"HuBi acha que esse lugar tem história. HuBi sente."',
    '"HuBi ficou pensando... isso aqui tem nome?"',
  ],
  4: [ // Lv9–10 — fluente, confiante, cheio de opiniõezinhas
    '"HuBi decidiu que gosta muito daqui. Oficial."',
    '"HuBi ainda se lembra de quando não sabia nada disso. Engraçado."',
    '"HuBi tava só passando. Curioso, como sempre."',
    '"HuBi acha que devia ter mais comida por perto. Só uma opinião."',
    '"HuBi aprendeu bastante desde a pedra. HuBi tá orgulhoso."',
  ],
};

function hubiTierAtual() {
  const lvl = (G.hubi && G.hubi.level) || 0;
  if (lvl <= 0) return 0;
  if (lvl <= 2) return 1;
  if (lvl <= 5) return 2;
  if (lvl <= 8) return 3;
  return 4;
}

// ── Falas de CONTEXTO — comentários sobre o lugar em que HuBi está,
//    em vez de só falas genéricas soltas. Casa com G.location por
//    substring (nunca quebra se o local não bater com nada — nesse
//    caso cai de volta pras falas genéricas de HUBI_FALAS). Só entra
//    a partir do tier 2 (Lv3+), quando HuBi já forma frase com sentido;
//    tiers 0–1 continuam só com sons/palavras soltas, sem comentar nada.
const HUBI_FALAS_CONTEXTO = {
  floresta: {
    2: [
      '"HuBi conhece essa floresta. Cheiro de terra molhada."',
      '"Árvores grandes. HuBi gosta de andar aqui."',
      '"Tem passarinho cantando. HuBi para pra escutar."',
      '"Chão macio aqui. HuBi gosta de pisar devagar."',
    ],
    3: [
      '"Essa floresta HuBi já cruzou várias vezes. Ainda acha bonita."',
      '"HuBi sente que tem algo se movendo longe. Fica de olho."',
      '"O vento muda de cheiro aqui. HuBi sempre repara."',
      '"HuBi já se perdeu nessa floresta uma vez. Só uma."',
    ],
    4: [
      '"HuBi conhece cada trilha dessa floresta de cor, quase."',
      '"Sempre tem um barulho novo aqui. HuBi presta atenção."',
      '"Essa floresta mudou desde a primeira vez que HuBi veio. Ou HuBi mudou."',
    ],
  },
  vilarejo: {
    2: [
      '"Pedra Branca de novo. HuBi gosta desse lugar."',
      '"O povo daqui é gentil com HuBi."',
      '"Tem cheiro de comida boa vindo de algum lugar."',
      '"HuBi acha esse vilarejo bonito de manhã."',
    ],
    3: [
      '"HuBi sente que o vilarejo confia mais na gente agora."',
      '"Cheiro de comida da estalagem. HuBi sempre nota."',
      '"As pessoas daqui já acenam pra HuBi. Isso é bom."',
      '"Pedra Branca parece mais viva a cada visita, HuBi acha."',
    ],
    4: [
      '"HuBi já conhece quase todo mundo em Pedra Branca pelo nome."',
      '"Esse lugar parece mais seu lar a cada dia, HuBi acha."',
      '"HuBi lembra de quando esse vilarejo era só um lugar de passagem."',
    ],
  },
  estalagem: {
    2: [
      '"A estalagem da Dona Mitsue é quentinha. HuBi gosta."',
      '"HuBi lembra do sótão. Foi lá que tudo começou."',
      '"Cheiro de chá. HuBi sempre sente esse cheiro primeiro."',
    ],
    3: [
      '"Dona Mitsue sempre cuida bem da gente aqui."',
      '"HuBi ainda sente o cheiro de chá quando entra aqui."',
      '"HuBi gosta desse cantinho perto da lareira."',
    ],
    4: [
      '"Esse lugar sempre vai ser especial pra HuBi. Foi aqui que ele acordou."',
      '"HuBi ainda se lembra de cada detalhe daquele sótão empoeirado."',
    ],
  },
  dungeon_sombras: {
    2: [
      '"Escuro aqui. HuBi fica mais perto de você."',
      '"HuBi não gosta desse lugar. Mas fica, mesmo assim."',
      '"Frio diferente aqui dentro. HuBi sente na pele."',
    ],
    3: [
      '"Tem algo errado nessas sombras. HuBi sente."',
      '"HuBi promete: fica de olho em tudo aqui dentro."',
      '"O silêncio aqui é pesado demais pro gosto de HuBi."',
    ],
    4: [
      '"Esse tipo de escuridão HuBi já enfrentou antes. Não vai ser diferente agora."',
      '"HuBi aprendeu a não confiar no silêncio desse lugar."',
    ],
  },
  masmorra: {
    2: [
      '"Lugar apertado. HuBi não gosta muito, mas aguenta."',
      '"HuBi acha que essa masmorra guarda segredo."',
      '"Pedra fria por todo lado. HuBi sente isso."',
    ],
    3: [
      '"HuBi sente o ar pesado aqui dentro. Cuidado."',
      '"Cada masmorra tem seu próprio silêncio. Esse aqui é estranho."',
      '"HuBi acha que já ouviu esse eco antes, em outro lugar."',
    ],
    4: [
      '"HuBi já perdeu a conta de quantas masmorras já cruzou com você."',
      '"Lugares assim sempre escondem mais do que mostram no começo."',
    ],
  },
  castelo: {
    2: [
      '"Grande demais. HuBi se sente pequeno aqui."',
      '"Tudo tão silencioso pra um lugar tão grande."',
      '"HuBi acha os corredores daqui meio assustadores."',
    ],
    3: [
      '"HuBi sente peso nesse castelo. História antiga, talvez."',
      '"As paredes daqui parecem guardar segredo. HuBi curioso."',
      '"HuBi acha que esse lugar já viu coisa demais."',
    ],
    4: [
      '"Lugares como esse sempre escondem mais do que mostram, HuBi acha."',
      '"HuBi sente que essas paredes têm história pra contar, se pudessem falar."',
    ],
  },
};

// Classifica G.location numa categoria de contexto (mais granular que
// hubiClassificarLocal, que só serve pro cálculo de mérito).
function hubiClassificarLocalFala() {
  const loc = (G.location || '').toLowerCase();
  // Kappa e Inazami setam G.location = 'dungeon-kappa'/'dungeon-inazami'
  // (confirmado em kappa_dungeon.js/inazami_dungeon.js) — por isso PRECISAM
  // ser testados antes do prefixo genérico "dungeon-" (mesmo ajuste feito
  // em hubiClassificarLocal, ver comentário lá em cima).
  if (loc.indexOf('kappa') !== -1 || loc.indexOf('inazami') !== -1) return 'masmorra';
  if (loc.indexOf('tve-') === 0) return 'masmorra'; // Templo do Vazio Ecoante — confirmado em templo_vazio_ecoante.js
  if (loc.indexOf('dungeon-') === 0 || loc.indexOf('sombras') !== -1) return 'dungeon_sombras'; // confirmado: dungeon-fase1..9, dungeon-castel, dungeon-dentro, dungeon-barco
  // Os quatro checks abaixo ainda são chute (não confirmados em arquivo
  // nenhum que vi até agora) — se o G.location real da estalagem/castelo/
  // vilarejo/kurosaki for diferente disso, essas falas de contexto
  // simplesmente não disparam ali (caem pra genérica, sem quebrar nada).
  if (loc.indexOf('estalagem') !== -1 || loc.indexOf('hubi-sotao') !== -1) return 'estalagem';
  if (loc.indexOf('castelo') !== -1) return 'castelo';
  if (loc.indexOf('vilarejo') !== -1 || loc.indexOf('kurosaki') !== -1) return 'vilarejo'; // 'vilarejo' confirmado (dungeon_sombras.js volta pra cá); 'kurosaki' ainda é chute
  if (loc.indexOf('floresta') !== -1) return 'floresta'; // ainda não confirmado
  return null;
}

// Escolhe uma fala pro tier atual: prioriza fala de CONTEXTO (sobre o
// lugar) e só cai pra fala genérica se não houver contexto pro local
// atual nesse tier.
// Escolhe uma fala de CONTEXTO ainda não vista nesse save, pra esse
// local+tier específico. Cada fala de contexto só aparece 1 vez por
// save (fica marcada em G.hubi._falasVistas, que é salvo junto com o
// resto do progresso do HuBi) — assim, revisitar a mesma dungeon várias
// vezes não repete o mesmo comentário. Quando o pool daquele local+tier
// já foi todo visto, devolve null (quem chamou cai pra fala genérica).
function hubiEscolherFalaContextoInedita(contexto, tier) {
  const pool = HUBI_FALAS_CONTEXTO[contexto] && HUBI_FALAS_CONTEXTO[contexto][tier];
  if (!pool || !pool.length) return null;

  hubiInit();
  if (!G.hubi._falasVistas) G.hubi._falasVistas = {};
  const chave = `${contexto}:${tier}`;
  const vistas = G.hubi._falasVistas[chave] || [];

  const indicesDisponiveis = pool.map((_, i) => i).filter(i => !vistas.includes(i));
  if (!indicesDisponiveis.length) return null; // já viu tudo desse local nesse tier

  const idx = indicesDisponiveis[Math.floor(Math.random() * indicesDisponiveis.length)];
  G.hubi._falasVistas[chave] = vistas.concat(idx);
  return pool[idx];
}

function hubiEscolherFala(tier) {
  // Reservado pra quando a mecânica de quarta parede (item 14) for ligada.
  if (tier === 4 && HUBI_QUARTA_PAREDE.ATIVA && Math.random() < HUBI_QUARTA_PAREDE.CHANCE) {
    return HUBI_QUARTA_PAREDE.FALAS[Math.floor(Math.random() * HUBI_QUARTA_PAREDE.FALAS.length)];
  }
  const contexto = hubiClassificarLocalFala();
  if (contexto && tier >= 2) {
    const falaContexto = hubiEscolherFalaContextoInedita(contexto, tier);
    if (falaContexto) return falaContexto;
    // Pool desse local+tier já foi todo usado nesse save — cai pra
    // genérica em vez de repetir o mesmo comentário sobre o lugar.
  }
  const generico = HUBI_FALAS[tier] || HUBI_FALAS[0];
  return generico[Math.floor(Math.random() * generico.length)];
}

// Fala usada na tela de status do HuBi (estalagem) — reporta a cura
// atual, mas com o vocabulário do tier em que ele está.
function hubiFraseCura(cura) {
  const tier = hubiTierAtual();
  if (tier === 0) return `Bili... "${cura}"? HuBi ainda não sabe esse número direito.`;
  if (tier === 1) return `HuBi cuida. HuBi cura ${cura}. HuBi tenta sempre mais.`;
  if (tier === 2) return `Nível ${G.hubi.level}. HuBi cura ${cura} de vida a cada turno agora.`;
  if (tier === 3) return `HuBi tá no nível ${G.hubi.level} — cura ${cura} de vida por turno. HuBi melhorou bastante.`;
  return `Nível ${G.hubi.level}. HuBi cura ${cura} de vida por turno — e ainda acha que pode melhorar mais.`;
}

let _hubiFalaUltimaVez = 0;

// Tenta fazer HuBi aparecer com uma fala curta. Nunca em batalha, nunca
// antes de despertar, respeita cooldown e chance.
function hubiTentarAparecer() {
  hubiInit();
  if (!G.hubi.despertado) return;
  if (typeof G !== 'undefined' && G.inBattle) return;
  const agora = Date.now();
  if (agora - _hubiFalaUltimaVez < HUBI_FALA_CONFIG.COOLDOWN_MS) return;
  if (Math.random() > HUBI_FALA_CONFIG.CHANCE_APARECER) return;

  const tier = hubiTierAtual();
  const fala = hubiEscolherFala(tier);

  _hubiFalaUltimaVez = agora;
  hubiMostrarBolhaFala(fala);
}
window.hubiTentarAparecer = hubiTentarAparecer;

function hubiMostrarBolhaFala(texto) {
  const old = document.getElementById('hubi-fala-bolha');
  if (old) old.remove();

  if (!document.getElementById('hubi-fala-style')) {
    const style = document.createElement('style');
    style.id = 'hubi-fala-style';
    style.textContent = `
      @keyframes hubiFalaIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
    `;
    document.head.appendChild(style);
  }

  const wrap = document.createElement('div');
  wrap.id = 'hubi-fala-bolha';
  wrap.style.cssText = `
    position:fixed; left:14px; bottom:88px; z-index:9500;
    display:flex; align-items:flex-end; gap:8px; max-width:76vw;
    animation: hubiFalaIn 0.35s ease-out; cursor:pointer;
  `;
  wrap.innerHTML = `
    <img src="${HUBI_CONFIG.ICON}" onerror="this.style.display='none';" style="
      width:38px;height:38px;object-fit:contain;border-radius:50%;flex-shrink:0;
      border:1px solid rgba(126,200,126,0.5);background:rgba(10,10,10,0.6);
      box-shadow:0 0 10px rgba(126,200,126,0.35);
    ">
    <div style="
      font-family:'Noto Serif JP',serif; font-size:0.7rem; line-height:1.4;
      color:var(--gold2,#e8d9a8); background:rgba(10,8,4,0.92);
      border:1px solid rgba(126,200,126,0.35); border-radius:10px 10px 10px 2px;
      padding:8px 12px; box-shadow:0 2px 10px rgba(0,0,0,0.4);
    ">${texto}</div>
  `;
  document.body.appendChild(wrap);
  wrap.onclick = () => wrap.remove();

  clearTimeout(window._hubiFalaTimeout);
  window._hubiFalaTimeout = setTimeout(() => {
    const el = document.getElementById('hubi-fala-bolha');
    if (!el) return;
    el.style.transition = 'opacity 0.4s ease';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 420);
  }, HUBI_FALA_CONFIG.DURACAO_MS);
}

// Gancho: toda troca de cena é uma chance de HuBi aparecer (fora de
// batalha — checado de novo dentro de hubiTentarAparecer, já que o
// estado de G.inBattle pode mudar entre o setScene e o timeout).
if (typeof setScene === 'function' && !window._hubiOrigSetSceneFala) {
  window._hubiOrigSetSceneFala = setScene;
  setScene = function (...args) {
    const r = window._hubiOrigSetSceneFala.apply(this, args);
    setTimeout(hubiTentarAparecer, 600);
    return r;
  };
}

// ─────────────────────────────────────────────────────────────
//  12. REAÇÃO À DERROTA — quando você morre em batalha, HuBi
//      reage. Nos tiers 0–1 (recém-desperto) é só confusão/susto.
//      A partir do tier 2 (Lv3+) ele começa a soltar farpa
//      sarcástica — e vai ficando mais afiado conforme o nível sobe,
//      igual às falas normais.
// ─────────────────────────────────────────────────────────────

const HUBI_FALAS_DERROTA = {
  0: ['"...Nn?? Nn! Nn!!"', '"Zaa... zaa não! Zaa não!"'],
  1: ['"HuBi... HuBi não gostou disso."', '"Cai? Por que cai?"'],
  2: [
    '"Ih. Isso foi feio. HuBi viu tudo."',
    '"HuBi avisou, né? ...Não avisou. Mas devia ter."',
  ],
  3: [
    '"Uau. Nem HuBi esperava por isso, e olha que HuBi espera pouco."',
    '"HuBi vai fingir que não viu. Mentira, HuBi viu tudo. Foi ruim."',
    '"De novo? HuBi tá começando a achar que isso é sua marca registrada."',
  ],
  4: [
    '"HuBi já perdeu a conta de quantas vezes te ressuscitou hoje."',
    '"Impressionante. HuBi acha que você tem talento nato pra isso, especificamente."',
    '"HuBi vai anotar essa aqui pra contar pra Dona Mitsue depois. Com detalhes."',
    '"Relaxa. HuBi já viu pior. ...Não muito pior, mas já viu."',
  ],
};

function hubiFalaDerrota() {
  const tier = hubiTierAtual();
  const pool = HUBI_FALAS_DERROTA[tier] || HUBI_FALAS_DERROTA[0];
  return pool[Math.floor(Math.random() * pool.length)];
}

// Mostra a bolha de fala de HuBi reagindo à derrota. Pode ser chamada
// automaticamente (ver gancho de endBattle logo abaixo) ou na mão, se
// você preferir plugar isso direto no ponto exato onde palDinh.js trata
// a derrota do jogador.
function hubiReagirDerrota() {
  hubiInit();
  if (!G.hubi.despertado) return;
  hubiMostrarBolhaFala(hubiFalaDerrota());
}
window.hubiReagirDerrota = hubiReagirDerrota;

// Gancho automático: intercepta endBattle() (definida em palDinh.js) e,
// se o HP do jogador estiver em 0 depois que ela rodar, dispara a
// reação de derrota com um pequeno atraso (pra bolha não brigar com a
// tela de resultado da batalha). Não depende de saber o formato exato
// dos parâmetros de endBattle — só olha o HP do jogador no final.
// Se o seu fluxo de derrota já usa outro caminho (ex: uma tela própria
// de Game Over sem passar HP a 0), chame hubiReagirDerrota() direto
// nesse ponto em vez de confiar só nesse gancho.
// Assinatura real confirmada em multi_enemy_battle.js: endBattle(won, fled).
// won === false e fled falso = derrota de verdade (fugir não conta como
// derrota, então não dispara sarcasmo). Fica um checkGP.player.hp<=0 como
// reforço, caso algum fluxo específico chame endBattle sem esses parâmetros.
if (typeof endBattle === 'function' && !window._hubiOrigEndBattleDerrota) {
  window._hubiOrigEndBattleDerrota = endBattle;
  endBattle = function (...args) {
    const r = window._hubiOrigEndBattleDerrota.apply(this, args);
    try {
      const [won, fled] = args;
      const derrotaPorFlag = (won === false && !fled);
      const derrotaPorHp   = !!(G.player && G.player.hp <= 0);
      if (derrotaPorFlag || derrotaPorHp) {
        setTimeout(hubiReagirDerrota, 900);
      }
    } catch (e) { /* silencioso — não quebra o fim de batalha */ }
    return r;
  };
}

// ─────────────────────────────────────────────────────────────
//  13. INTUIÇÃO DE HUBI — a "inteligência" dele como MECÂNICA, não
//      como fala mais esperta: uma vez por batalha (duas vezes nos
//      níveis mais altos) você pode pedir ajuda a HuBi e ele entrega
//      uma dica tática real sobre o inimigo. A dica fica mais precisa
//      conforme o nível dele sobe — isso é a "inteligência" crescendo.
// ─────────────────────────────────────────────────────────────

const HUBI_INTUICAO_CONFIG = {
  // Usos por batalha, indexado pelo tier de fala (0–4, ver hubiTierAtual).
  USOS_POR_BATALHA: [0, 1, 1, 1, 2],
};

function hubiIntuicaoUsosMax() {
  const tier = hubiTierAtual();
  return HUBI_INTUICAO_CONFIG.USOS_POR_BATALHA[tier] !== undefined
    ? HUBI_INTUICAO_CONFIG.USOS_POR_BATALHA[tier]
    : 1;
}

// Nomes de exibição dos elementos (mesmo mapeamento usado nos badges de
// batalha em multi_enemy_battle.js) — só pra HuBi falar "Fogo" em vez de
// "fogo" cru na dica.
const HUBI_ELEM_NOMES = {
  fogo:'Fogo', agua:'Água', eletrico:'Elétrico', gelo:'Gelo', planta:'Planta',
  terra:'Terra', energia:'Energia', magia_negra:'Magia Negra', vento:'Vento',
  caos:'Caos', veneno:'Veneno', luz:'Luz', sombra:'Sombra', cristal:'Cristal',
};

// Monta a dica com base no que dá pra observar do inimigo ATIVO da
// batalha. Usa os campos reais do motor (battleState.enemyData +
// battleState.enemyHp/enemyMaxHp — confirmado em multi_enemy_battle.js),
// nunca `enemyData.hp` (esse HP fica fora do objeto, direto no
// battleState). Nunca quebra por falta de campo — cai pra dica genérica.
function hubiGerarDica(bs) {
  const tier = hubiTierAtual();
  const enemyData = bs && bs.enemyData;
  if (!enemyData) return '"HuBi tenta sentir alguma coisa... mas não sente nada aqui."';

  const hpAtual = bs.enemyHp;
  const hpMax   = bs.enemyMaxHp;
  const hpPct   = (hpMax && hpAtual !== undefined) ? Math.round((hpAtual / hpMax) * 100) : null;

  if (tier <= 1) {
    // Ainda sem vocabulário — reage só por instinto, sem dica formada.
    return (hpPct !== null && hpPct <= 30)
      ? '"Nn! Nn! Fraco! Fraco ali!"'
      : '"...Nn. HuBi sente algo. Não sabe dizer o quê."';
  }

  const partes = [];
  if (hpPct !== null) {
    if (hpPct <= 25) partes.push('já está quase caindo — mais um pouco resolve.');
    else if (hpPct <= 60) partes.push('já tirou bastante dele, mas ainda aguenta uns golpes.');
    else partes.push('ele ainda está inteiro. Vai ser longo.');
  }
  const elemento = enemyData.elemento && enemyData.elemento !== 'neutro' ? enemyData.elemento : null;
  if (elemento && tier >= 2) {
    const nomeElem = HUBI_ELEM_NOMES[elemento] || elemento;
    partes.push(`sente que ele é do elemento ${nomeElem}. Pode ajudar escolher o ataque certo.`);
  }
  if (enemyData.isBoss && tier >= 3) partes.push('acha melhor guardar seus golpes fortes pra fase decisiva dele.');
  if (!partes.length) partes.push('está de olho nele, mas ainda não achou um ponto fraco claro.');

  return `"HuBi ${partes.join(' HuBi ')}"`;
}

// Chamado pelo botão "Pedir ajuda a HuBi" no popup de batalha. Usa
// battleState.enemyData/enemyHp/enemyMaxHp — os campos reais do motor
// de batalha (confirmado em multi_enemy_battle.js), inclusive durante
// lutas em grupo, já que o "alvo ativo" fica sempre nesses mesmos
// campos por causa de como o motor de multi-inimigo disfarça o membro
// ativo de inimigo normal.
function hubiPedirAjuda() {
  hubiInit();
  if (!G.hubi.despertado) return;
  const bs = (typeof battleState !== 'undefined') ? battleState : null;
  if (!bs) return;
  bs._hubiAjudaUsos = bs._hubiAjudaUsos || 0;
  const max = hubiIntuicaoUsosMax();
  if (bs._hubiAjudaUsos >= max) {
    if (typeof notify === 'function') notify('HuBi já ajudou o quanto pôde nessa batalha.', 'gold');
    return;
  }
  bs._hubiAjudaUsos++;

  const dica = hubiGerarDica(bs);
  hubiMostrarBolhaFala(dica);
  if (typeof appendBattleLog === 'function') appendBattleLog(`🌿 HuBi tenta ajudar: ${dica}`, '#a8e8a8');
}
window.hubiPedirAjuda = hubiPedirAjuda;

// ─────────────────────────────────────────────────────────────
//  14. QUARTA PAREDE (RESERVADO PRO FUTURO) — desligado por padrão.
//      Quando quiser ligar, é só trocar ATIVA pra true: no tier
//      máximo de fala (Lv9-10), HuBi passa a ter uma pequena chance
//      de soltar uma dessas falas em vez das normais.
// ─────────────────────────────────────────────────────────────

const HUBI_QUARTA_PAREDE = {
  ATIVA:  false, // troque pra true quando quiser ligar essa mecânica
  CHANCE: 0.05,  // 5% de chance de escolher uma fala de quarta parede (só tier 4)
  FALAS: [
    '"HuBi sabe que alguém está olhando a gente agora. Sempre soube."',
    '"Às vezes HuBi sente que essa história já foi contada antes. Estranho."',
    '"HuBi se pergunta se você também está do outro lado da tela."',
  ],
};

// ─────────────────────────────────────────────────────────────
//  15. MARCO: HuBi Lv5 — entrega do Livro da Mana
//      Cutscene simples e autocontida (overlay próprio, não depende
//      do sistema de nós de diálogo) — mostra a arte, uma fala do
//      HuBi, e ao continuar entrega o livro (com o Cristal I já
//      encaixado) via giveLivroMana(), definido em palDinh.js.
//      Arte: coloque o PNG da cena de entrega em
//      'Imagens/personagens/mago/ícones Hab/hubi_entrega_livro.png'
//      (ajuste o caminho abaixo se salvar em outro lugar).
// ─────────────────────────────────────────────────────────────
function hubiTriggerLivroManaCutscene() {
  if (document.getElementById('hubi-livro-cutscene')) return; // já está mostrando

  const overlay = document.createElement('div');
  overlay.id = 'hubi-livro-cutscene';
  overlay.style.cssText = `
    position:fixed; inset:0; z-index:960; background:rgba(2,1,0,0.94);
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    padding:20px; gap:14px;
  `;

  overlay.innerHTML = `
    <img class="icon-fallback-img" src="Imagens/personagens/mago/ícones Hab/hubi_entrega_livro.png"
      data-fallback-icon="📘"
      style="max-width:92vw; max-height:60vh; object-fit:contain; border-radius:8px; box-shadow:0 0 30px rgba(200,150,10,0.25);">
    <span style="display:none;font-size:5rem;">📘</span>
    <div style="max-width:420px; text-align:center; font-family:'Noto Serif JP',serif; color:#e0c870; font-size:0.85rem; line-height:1.5;">
      HuBi estende as patinhas, segurando um tomo antigo. Depois de tudo que vocês passaram juntos, ele finalmente confia em você o suficiente pra entregar o Livro da Mana.
    </div>
    <button id="hubi-livro-cutscene-continuar" style="padding:10px 28px; margin-top:6px;
      background:rgba(150,100,10,0.35); border:1px solid rgba(200,150,10,0.5);
      color:#e0c870; font-family:'Noto Serif JP',serif; font-size:0.8rem; letter-spacing:1px;
      border-radius:6px; cursor:pointer;">
      Continuar
    </button>
  `;

  document.body.appendChild(overlay);

  document.getElementById('hubi-livro-cutscene-continuar').onclick = () => {
    overlay.remove();
    if (typeof giveLivroMana === 'function') giveLivroMana();
  };
}
window.hubiTriggerLivroManaCutscene = hubiTriggerLivroManaCutscene;

// ─────────────────────────────────────────────────────────────
//  16. MARCOS DE LEVEL DO JOGADOR — cristais soltos Lv2/Lv3/Lv4.
//      Chame hubiCheckCristalManaMarcos() a partir de checkLevelUp()
//      em palDinh.js (depois de p.level ser incrementado), ou de
//      qualquer outro ponto que rode logo após o level do jogador
//      mudar. Idempotente — giveCristalMana() já evita duplicar.
// ─────────────────────────────────────────────────────────────
const HUBI_CRISTAL_MANA_MARCOS = { 8: 2, 12: 3, 15: 4 };
function hubiCheckCristalManaMarcos(playerLevel) {
  // Exclusivo da classe Mago.
  if (!G.player || G.player.class !== 'mago') return;
  const cristalLevel = HUBI_CRISTAL_MANA_MARCOS[playerLevel];
  if (cristalLevel && typeof giveCristalMana === 'function') {
    giveCristalMana(cristalLevel);
  }
}
window.hubiCheckCristalManaMarcos = hubiCheckCristalManaMarcos;
