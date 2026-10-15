// ══════════════════════════════════════════════════════════════
//  CRISTAL_ELO.JS — Chronicles of Clivor
//  Cristal de Elo (item de suporte entregue pelo Alberon)
//
//  O que faz:
//   • Registra o item `cristal_elo` no ITEM_DB (tipo 'suporte', igual à Gadanha:
//     fica na bolsa, clique liga/desliga, não ocupa slot).
//   • Durante a batalha, uma barra de carga aparece embaixo da imagem do herói.
//     A carga sobe a cada rodada em que o jogador ataca OU se defende, somando
//     dano causado + dano recebido + bônus de defesa (ver CRISTAL_ELO_CONFIG).
//     Pode demorar algumas rodadas pra encher — não é todo turno.
//   • Com a barra em 100%, o aliado NÃO ataca sozinho: o card dele aparece em
//     herói (no lugar da barra) como BOTÃO. Na sua vez, toque nele pra ela desferir um
//     dos golpes (95% da força total). A barra zera depois do golpe.
//   • Hoje o único aliado é a Capitã Hiroto (G.kurosaki.hirotoAcompanha).
//     Pra um aliado novo, é só somar uma entrada em CRISTAL_ELO_ALIADOS.
//
//  Não afeta o duelo contra a própria Hiroto (hiroto_duelo).
//
//  Depende de (palDinh.js): G, ITEM_DB, battleState, calcEnemyDmg,
//    applyDmgToPlayer, tickPlayerStatusEffects, startBattleReal, endBattle,
//    updateBattleHUD, appendBattleLog, showFloatingNumber, flashDamage,
//    animEnemyHit, addLog, notify, buildInventoryGrid.
//
//  Ordem de load no gat-1.html: DEPOIS de palDinh.js e de cidade_kurosaki.js.
//
//  O item é `unique:true` → o armazém não deixa guardar (ver armazem.js).
// ══════════════════════════════════════════════════════════════

'use strict';

// ─────────────────────────────────────────────────────────────
//  1. CONFIG — ajuste os números aqui
// ─────────────────────────────────────────────────────────────
const CRISTAL_ELO_ID = 'cristal_elo';

const CRISTAL_ELO_CONFIG = {
  // Carga ganha por rodada (a barra vai de 0 a 100)
  GANHO_BASE:           10,   // só por agir (atacar, usar skill ou se defender)
  GANHO_DANO_CAUSADO:   150,  // × (dano causado na rodada ÷ HP máx. do inimigo)
  GANHO_DANO_RECEBIDO:  120,  // × (dano recebido na rodada ÷ HP máx. do jogador)
  GANHO_DEFESA:         8,    // extra se a rodada teve defesa/escudo ativo
  GANHO_BONUS_MAX:      20,   // teto da soma dos bônus de dano (causado + recebido)

  POTENCIA:             0.95, // fração da força total do aliado no golpe
  CARD_MS:              1500, // tempo do card do aliado na tela
  SLASH_DELAY_MS:       150,  // atraso até a lâmina começar a cruzar a tela
  IMPACTO_MS:           480,  // quando a lâmina acerta (número de dano, clarão, estilhaços)
};

// ─────────────────────────────────────────────────────────────
//  2. ALIADOS — quem pode atacar pelo cristal
//     ativo()   → o aliado está com você agora?
//     atk/crit  → mesmos valores da ficha dela no duelo (KUROSAKI_HIROTO_DUELO)
//     efeitoImg → (opcional) imagem da lâmina/efeito que cruza a tela no golpe
//     golpes    → um deles é sorteado a cada disparo (mult = ×força; pode ter efeitoImg próprio)
// ─────────────────────────────────────────────────────────────
const CRISTAL_ELO_ALIADOS = [
  {
    id: 'hiroto',
    nome: 'Capitã Hiroto',
    retrato: 'Imagens/personagens/CHiroto.png',
    efeitoImg: 'Imagens/Cidade das pedras/efeito visual/hir4e.png', // lâmina de gelo que cruza a tela
    cor: '#80c8ff',
    atk: 200,
    crit: 0.18,
    ativo: () => !!(G && G.kurosaki && (G.kurosaki.hirotoAcompanha || G.kurosaki.hirotoAliada)),
    golpes: [
      { nome: 'Lâmina de Geada',  icon: '❄️', mult: 1.00,
        texto: 'Hiroto cruza a lâmina no ar e a geada corta {alvo} ao meio.' },
      { nome: 'Corte Invernal',   icon: '🌨️', mult: 1.10,
        texto: 'Um arco de gelo atravessa o campo — Hiroto golpeia {alvo} sem aviso.' },
      { nome: 'Estocada Glacial', icon: '🗡️', mult: 0.95,
        texto: 'Hiroto avança num passo só e crava a estocada glacial em {alvo}.' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
//  3. ITEM — registra no ITEM_DB
// ─────────────────────────────────────────────────────────────
if (typeof ITEM_DB !== 'undefined' && !ITEM_DB[CRISTAL_ELO_ID]) {
  ITEM_DB[CRISTAL_ELO_ID] = {
    name: 'Cristal de Elo',
    icon: '💠',
    imgSrc: 'Imagens/Amuleto/hirusj.png',
    type: 'suporte',
    unique: true,       // 1 só; o armazém bloqueia (ver _armazemBloqueio)
    active: true,       // já nasce ligado; o clique na bolsa liga/desliga
    desc: 'Cristal de quartzo lapidado, preso por uma rede de fios escurecidos e fitas de seda. A luz em seu núcleo oscila conforme quem o porta avança ou recua, como se respondesse a algo além do portador.',
    weight: 0.2,
  };
}

// Entrega o cristal (não duplica: o addItem já segura 'unique').
function kurosakiDarCristalElo() {
  if (typeof G === 'undefined' || !G || !G.player) return false;
  if ((G.player.inventory || []).some(i => i && i.id === CRISTAL_ELO_ID)) return false;
  const _tem = () => (G.player.inventory || []).some(i => i && i.id === CRISTAL_ELO_ID);
  try { addItem({ id: CRISTAL_ELO_ID, active: true }, 1); } catch (e) { console.error('[cristal_elo] addItem(obj):', e); }
  if (!_tem()) { try { addItem(CRISTAL_ELO_ID, 1); } catch (e) { console.error('[cristal_elo] addItem(id):', e); } }
  if (!_tem()) { console.error('[cristal_elo] addItem não colocou o cristal no inventário.'); return false; }
  // garante o cristal ligado (o clique na bolsa liga/desliga)
  const _it = _cristalItem(); if (_it && _it.active === undefined) _it.active = true;
  if (typeof notify === 'function') notify('💠 Cristal de Elo recebido!', 'gold');
  if (typeof addLog === 'function') addLog('Alberon lhe entregou o Cristal de Elo.', 'xp');
  return true;
}
window.kurosakiDarCristalElo = kurosakiDarCristalElo;

// ─────────────────────────────────────────────────────────────
//  4. ESTADO DA BATALHA
// ─────────────────────────────────────────────────────────────
function _cristalItem() {
  return (G && G.player && G.player.inventory || []).find(i => i && i.id === CRISTAL_ELO_ID) || null;
}

function _cristalAliadosAtivos() {
  return CRISTAL_ELO_ALIADOS.filter(a => { try { return a.ativo(); } catch (e) { return false; } });
}

// O cristal está valendo nesta batalha?
function _cristalAtivoAgora(bs) {
  if (!bs || !G || !G.inBattle) return false;
  if (bs._battleEnded) return false;
  if (bs.enemyData && bs.enemyData.id === 'hiroto_duelo') return false; // não vale no duelo contra ela
  const it = _cristalItem();
  if (!it || !it.active) return false;
  return _cristalAliadosAtivos().length > 0;
}

function _cristalReset(bs) {
  bs._cristalCarga = 0;
  bs._cristalUltDealt = bs.totalDmgDealt || 0;
  bs._cristalTaken = 0;
  bs._cristalDefendeu = false;
  bs._cristalUltTurno = -1;
  bs._cristalPronto = false;
}

// ─────────────────────────────────────────────────────────────
//  5. CARGA — roda uma vez por rodada (fim do turno do inimigo)
// ─────────────────────────────────────────────────────────────
function _cristalTick(bs, p, e) {
  if (!_cristalAtivoAgora(bs)) return;
  if (bs._cristalUltTurno === bs.turnCount) return; // já contou esta rodada
  bs._cristalUltTurno = bs.turnCount;
  if (bs.enemyHp <= 0 || p.hp <= 0) return;

  const C = CRISTAL_ELO_CONFIG;
  const causado  = Math.max(0, (bs.totalDmgDealt || 0) - (bs._cristalUltDealt || 0));
  const recebido = Math.max(0, bs._cristalTaken || 0);
  const pctCausado  = bs.enemyMaxHp > 0 ? causado / bs.enemyMaxHp : 0;
  const pctRecebido = p.maxHp > 0 ? recebido / p.maxHp : 0;

  let ganho = C.GANHO_BASE;
  ganho += Math.min(C.GANHO_BONUS_MAX, pctCausado * C.GANHO_DANO_CAUSADO + pctRecebido * C.GANHO_DANO_RECEBIDO);
  if (bs._cristalDefendeu) ganho += C.GANHO_DEFESA;
  ganho = Math.round(ganho);

  bs._cristalUltDealt = bs.totalDmgDealt || 0;
  bs._cristalTaken = 0;
  bs._cristalDefendeu = false;

  bs._cristalCarga = Math.min(100, (bs._cristalCarga || 0) + ganho);
  _cristalAtualizarBarra();

  // Carga cheia: NÃO ataca sozinho. Libera o botão (card da aliada) pro
  // jogador tocar.
  if (bs._cristalCarga >= 100 && !bs._cristalPronto) {
    bs._cristalPronto = true;
    appendBattleLog('💠 O Cristal de Elo brilha! Toque no card da aliada para ela atacar.', '#80c8ff');
    _cristalAtualizarBarra();
  }
}

// Toque no card da aliada: dispara o golpe (só na vez do jogador, 1x por carga)
function _cristalAoTocar() {
  const bs = (typeof battleState !== 'undefined') ? battleState : null;
  if (!bs || !bs._cristalPronto || !_cristalAtivoAgora(bs)) { _cristalRemoverBotao(); return; }
  if (bs.phase && bs.phase !== 'player') {
    if (typeof notify === 'function') notify('💠 Espere a sua vez para chamar a aliada.', 'gold');
    return;
  }
  bs._cristalPronto = false;
  _cristalRemoverBotao();
  _cristalDisparar(bs, G.player, bs.enemyData || {});
  if (typeof updateBattleHUD === 'function') updateBattleHUD();
}

// ─────────────────────────────────────────────────────────────
//  6. GOLPE DO ALIADO
// ─────────────────────────────────────────────────────────────
function _cristalCalcDano(aliado, golpe, e) {
  const C = CRISTAL_ELO_CONFIG;
  const forca = aliado.atk * C.POTENCIA * golpe.mult;
  const defMetade = Math.floor((e.def || 0) / 2);
  const piso = Math.max(1, Math.ceil(forca * 0.10));
  let dano = Math.max(piso, Math.floor(forca - defMetade + Math.floor(Math.random() * 6) - 2));
  const crit = Math.random() < (aliado.crit || 0);
  if (crit) dano = Math.floor(dano * 2);
  return { dano, crit };
}

function _cristalDisparar(bs, p, e) {
  const aliados = _cristalAliadosAtivos();
  if (!aliados.length) return;
  const aliado = aliados[Math.floor(Math.random() * aliados.length)];
  const golpe = aliado.golpes[Math.floor(Math.random() * aliado.golpes.length)];
  const { dano, crit } = _cristalCalcDano(aliado, golpe, e);

  // Barra cheia por um instante, depois zera com a transição do CSS
  _cristalPintarBarra(100, true);
  setTimeout(() => { if (G.inBattle) _cristalPintarBarra(0, false); }, 120);
  bs._cristalCarga = 0;
  bs._cristalPronto = false;

  _cristalMostrarCard(aliado, golpe);

  bs.enemyHp = Math.max(0, bs.enemyHp - dano);
  bs.totalDmgDealt = (bs.totalDmgDealt || 0) + dano;
  bs._cristalUltDealt = bs.totalDmgDealt; // o golpe do aliado não conta como carga

  const alvo = (e && e.name) || 'o inimigo';
  appendBattleLog(`💠 ${aliado.nome} responde ao Cristal de Elo — ${golpe.icon} ${golpe.nome}!`, aliado.cor);
  appendBattleLog(`${golpe.texto.replace('{alvo}', alvo)} ${crit ? 'CRÍTICO! ' : ''}-${dano} HP!`, crit ? '#ffcc00' : aliado.cor);
  if (typeof addLog === 'function') addLog(`${aliado.nome} (${golpe.nome}): -${dano} ao ${alvo}${crit ? ' [CRÍTICO]' : ''}.`, 'dmg');
  // Com efeito de lâmina, o número/clarão/tremor do inimigo esperam o momento do impacto.
  const efeitoImg = golpe.efeitoImg || aliado.efeitoImg || '';
  const atraso = efeitoImg ? CRISTAL_ELO_CONFIG.IMPACTO_MS : 0;
  if (efeitoImg) { try { _cristalEfeitoGolpe(efeitoImg, crit); } catch (err) { console.error('[cristal_elo] efeito', err); } }
  setTimeout(() => {
    if (typeof showFloatingNumber === 'function') showFloatingNumber('enemy', dano, crit ? 'crit' : 'dmg');
    if (typeof flashDamage === 'function') flashDamage('enemy');
    if (typeof animEnemyHit === 'function') animEnemyHit();
    try { if (typeof CONFIG !== 'undefined' && CONFIG.vibration && navigator.vibrate) navigator.vibrate([30, 40, 70]); } catch (_) {}
  }, atraso);
  if (typeof buildStatusBadges === 'function') buildStatusBadges();

  // Se o golpe derrubou o inimigo, fecha a batalha (endBattle ignora chamada dupla)
  if (bs.enemyHp <= 0) {
    setTimeout(() => {
      if (!bs._battleEnded && typeof endBattle === 'function') endBattle(true, false);
    }, 700 + (atraso ? atraso + 200 : 0));
  }
}

// ─────────────────────────────────────────────────────────────
//  7. VISUAL — slot fixo embaixo do herói + card no espaço do "VS"
//
//  Layout (pensado pra não bagunçar a tela):
//   • A barra de ELO e o botão moram no MESMO slot, na coluna do herói.
//     O slot tem altura fixa → quando a barra vira botão (e volta), nada
//     embaixo pula (ícones de equipamento, status, etc. ficam parados).
//   • O botão é compacto, cabe na largura da coluna e o texto não vaza.
//   • Depois do toque o botão some e o card do golpe aparece por CARD_MS
//     centralizado no "VS". O "VS" some enquanto o card está na tela pra
//     os dois não ficarem um em cima do outro.
// ─────────────────────────────────────────────────────────────
function _cristalCSS() {
  if (document.getElementById('cristal-elo-css')) return;
  const st = document.createElement('style');
  st.id = 'cristal-elo-css';
  st.textContent = `
    /* slot: altura fixa, barra e botão se revezam no mesmo lugar */
    .ce-slot{display:none;flex-direction:column;align-items:center;justify-content:center;
      box-sizing:border-box;width:124px;max-width:100%;height:44px;margin:4px auto 2px;
      font-family:'Noto Serif JP',serif;flex:none;}
    .ce-barra{position:relative;width:100%;pointer-events:none;}
    .ce-barra-rot{font-size:.5rem;letter-spacing:2px;color:rgba(240,192,64,.85);text-align:center;margin-bottom:2px;text-shadow:0 0 4px #000;white-space:nowrap;}
    .ce-barra-trilho{height:6px;background:rgba(10,6,2,.85);border:1px solid rgba(200,150,10,.55);overflow:hidden;border-radius:3px;}
    .ce-barra-fill{height:100%;width:0;background:linear-gradient(90deg,#4f8fe0,#a9d8f5);transition:width .45s ease-out;}
    .ce-barra.ce-cheia .ce-barra-fill{background:linear-gradient(90deg,#f0c040,#fff3c0);transition:none;}
    .ce-barra.ce-cheia .ce-barra-trilho{box-shadow:0 0 10px rgba(240,192,64,.9);}
    /* botão pronto: ocupa o lugar da barra */
    .ce-slot.ce-pronta .ce-barra{display:none;}

    .ce-btn{position:relative;display:flex;align-items:center;gap:6px;box-sizing:border-box;
      width:100%;height:100%;margin:0;padding:3px 5px 3px 3px;overflow:hidden;cursor:pointer;pointer-events:auto;
      background:rgba(8,14,30,.92);border:2px solid var(--c);border-radius:8px;
      box-shadow:0 0 12px var(--c),0 0 3px #000;
      -webkit-tap-highlight-color:transparent;touch-action:manipulation;
      animation:ceBtnPulse 1s ease-in-out infinite;}
    .ce-btn img{display:block;height:100%;width:auto;aspect-ratio:3/4;object-fit:cover;border-radius:4px;background:#000;flex:none;}
    .ce-btn span{display:block;min-width:0;flex:1 1 auto;overflow:hidden;font-size:.44rem;line-height:1.35;letter-spacing:.4px;
      color:var(--c);text-shadow:0 0 4px #000;text-align:left;white-space:nowrap;}
    @keyframes ceBtnPulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.35) drop-shadow(0 0 6px var(--c))}}

    /* card do golpe: centralizado no "VS" */
    .ce-card{position:fixed;z-index:9001;pointer-events:none;opacity:0;text-align:center;}
    .ce-card img{display:block;width:var(--w,62px);height:var(--h,84px);object-fit:cover;border:1px solid var(--c);
      border-radius:3px;box-shadow:0 0 14px var(--c),0 0 4px #000;background:#000;margin:0 auto;}
    .ce-card span{display:block;margin-top:3px;font-family:'Noto Serif JP',serif;font-size:.55rem;letter-spacing:1.5px;
      color:var(--c);text-shadow:0 0 4px #000,0 0 8px #000;white-space:nowrap;}
    .ce-card.on{animation:ceCard var(--ms) ease-out forwards;}
    @keyframes ceCard{0%{opacity:0;transform:translate(-50%,8px) scale(.85)}
      15%{opacity:1;transform:translate(-50%,0) scale(1)}
      80%{opacity:1;transform:translate(-50%,-4px) scale(1)}
      100%{opacity:0;transform:translate(-50%,-10px) scale(.95)}}

    /* efeito da lâmina cruzando a tela (tudo position:fixed, não mexe no layout) */
    .ce-slash{position:fixed;z-index:9000;pointer-events:none;opacity:0;clip-path:inset(0 100% 0 0);
      filter:drop-shadow(0 0 10px #6fc8ff) drop-shadow(0 0 26px rgba(90,170,255,.7));}
    .ce-slash.go{animation:ceCut .55s cubic-bezier(.2,.7,.2,1) forwards;}
    .ce-slash.crit{filter:drop-shadow(0 0 12px #fff) drop-shadow(0 0 34px #7fc4ff) saturate(1.3);}
    @keyframes ceCut{
      0%{opacity:0;clip-path:inset(0 100% 0 0);transform:scaleX(var(--f)) translateX(40px) scale(.8)}
      12%{opacity:1}
      62%{opacity:1;clip-path:inset(0 0 0 0);transform:scaleX(var(--f)) translateX(-6px) scale(1.04)}
      100%{opacity:0;clip-path:inset(0 0 0 0);transform:scaleX(var(--f)) translateX(-34px) scale(1.14)}}
    .ce-flash{position:fixed;inset:0;z-index:9002;pointer-events:none;opacity:0;animation:ceFl .35s ease-out forwards;}
    @keyframes ceFl{0%{opacity:.9}100%{opacity:0}}
    .ce-shard{position:fixed;z-index:9003;pointer-events:none;width:var(--s);height:calc(var(--s)*1.7);
      background:linear-gradient(135deg,#fff,#8fd3ff 55%,#3d7fe0);clip-path:polygon(50% 0,100% 40%,70% 100%,20% 85%,0 35%);
      animation:ceSd .75s cubic-bezier(.1,.7,.3,1) forwards;}
    @keyframes ceSd{0%{opacity:1;transform:translate(0,0) rotate(0) scale(1)}
      100%{opacity:0;transform:translate(var(--dx),var(--dy)) rotate(var(--r)) scale(.3)}}
    .battle-arena.ce-shake{animation:ceSh .38s;}
    .battle-arena.ce-shake.crit{animation:ceShc .5s;}
    @keyframes ceSh{0%,100%{transform:none}20%{transform:translate(-4px,2px)}40%{transform:translate(4px,-2px)}60%{transform:translate(-3px,1px)}80%{transform:translate(2px,0)}}
    @keyframes ceShc{0%,100%{transform:none}15%{transform:translate(-8px,4px)}30%{transform:translate(8px,-4px)}45%{transform:translate(-6px,3px)}60%{transform:translate(5px,-2px)}80%{transform:translate(-2px,1px)}}
    #bat-enemy-icon.ce-gelo{filter:hue-rotate(-15deg) saturate(1.3) brightness(1.3) drop-shadow(0 0 12px #7fd4ff);transition:filter .3s;}
    @media (prefers-reduced-motion:reduce){.battle-arena.ce-shake{animation:none}}

    /* "VS" some enquanto o card está na tela */
    #battle-overlay .battle-vs{transition:opacity .15s;}
    #battle-overlay .battle-vs.ce-oculto{opacity:0;}
  `;
  document.head.appendChild(st);
}

function _cristalAncora() {
  const hero = document.getElementById('bat-hero-icon');
  if (!hero) return null;
  const r = hero.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  return r;
}

// Slot = barra de ELO + botão. Criado uma vez por batalha.
function _cristalGarantirSlot() {
  _cristalCSS();
  let slot = document.getElementById('cristal-elo-slot');
  if (slot) return slot;
  slot = document.createElement('div');
  slot.id = 'cristal-elo-slot';
  slot.className = 'ce-slot';
  slot.innerHTML = `<div id="cristal-elo-barra" class="ce-barra"><div class="ce-barra-rot">💠 ELO</div><div class="ce-barra-trilho"><div class="ce-barra-fill"></div></div></div>`;
  _cristalEncaixarSlot(slot);
  return slot;
}

// Encaixa o slot no FLUXO da coluna do herói (logo depois das barras de HP/MP/AP),
// em vez de flutuar por cima do ícone/nome/status.
function _cristalEncaixarSlot(el) {
  const lado = document.getElementById('bat-hero-side');
  let ref = null;
  if (lado) {
    ref = document.getElementById('bat-hero-ap-bar-wrap')
       || document.getElementById('bat-hero-mp-bar-wrap')
       || (document.getElementById('bat-hero-hp-bar') || {}).parentNode
       || null;
  }
  if (ref && ref.parentNode) {
    if (el.previousSibling !== ref || el.parentNode !== ref.parentNode) ref.parentNode.insertBefore(el, ref.nextSibling);
  } else if (!el.parentNode) {
    el.style.cssText += ';position:fixed;left:8px;top:50%;width:96px;';  // fallback: cena sem a coluna do herói
    document.body.appendChild(el);
  }
}

function _cristalPintarBarra(pct, cheia) {
  const el = document.getElementById('cristal-elo-barra');
  if (!el) return;
  const fill = el.querySelector('.ce-barra-fill');
  if (fill) fill.style.width = Math.max(0, Math.min(100, pct)) + '%';
  el.classList.toggle('ce-cheia', !!cheia);
}

function _cristalRemoverBarra() {
  const el = document.getElementById('cristal-elo-slot');
  if (el) el.remove();
}

function _cristalRemoverBotao() {
  const b = document.getElementById('cristal-elo-btn');
  if (b) b.remove();
  const slot = document.getElementById('cristal-elo-slot');
  if (slot) slot.classList.remove('ce-pronta');
}

// Botão: ocupa o lugar da barra dentro do slot (não empurra nada pra baixo)
function _cristalMostrarBotao() {
  _cristalCSS();
  const aliado = _cristalAliadosAtivos()[0];
  const slot = document.getElementById('cristal-elo-slot');
  if (!aliado || !slot) { _cristalRemoverBotao(); return; }
  let b = document.getElementById('cristal-elo-btn');
  if (!b) {
    b = document.createElement('div');
    b.id = 'cristal-elo-btn';
    b.className = 'ce-btn';
    b.setAttribute('role', 'button');
    b.style.setProperty('--c', aliado.cor);
    b.innerHTML = `<img src="${aliado.retrato}" alt="${aliado.nome}" onerror="this.style.display='none';"><span>💠 TOQUE<br>PARA ATACAR</span>`;
    b.addEventListener('click', (ev) => { ev.stopPropagation(); _cristalAoTocar(); });
  }
  if (b.parentNode !== slot) slot.appendChild(b);
  slot.classList.add('ce-pronta');
}

// Mantém o slot encaixado (abaixo das barras do herói) e atualiza o preenchimento
function _cristalAtualizarBarra() {
  const bs = (typeof battleState !== 'undefined') ? battleState : null;
  if (!_cristalAtivoAgora(bs)) { _cristalRemoverBarra(); return; }
  const r = _cristalAncora();
  if (!r) { _cristalRemoverBarra(); return; }
  const slot = _cristalGarantirSlot();
  _cristalEncaixarSlot(slot);           // reencaixa se a HUD tiver redesenhado a coluna
  slot.style.display = 'flex';
  _cristalPintarBarra(bs._cristalCarga || 0, !!bs._cristalPronto);
  if (bs._cristalPronto) _cristalMostrarBotao(); else _cristalRemoverBotao();
}

// Card do golpe no espaço livre entre herói e inimigo (área do "VS"; some sozinho)
function _cristalMostrarCard(aliado, golpe) {
  _cristalCSS();
  const antigo = document.getElementById('cristal-elo-card');
  if (antigo) antigo.remove();

  const r  = _cristalAncora();
  const ini = document.getElementById('bat-enemy-icon');
  const ri = ini ? ini.getBoundingClientRect() : null;
  const vs = document.querySelector('#battle-overlay .battle-vs');
  const rv = vs ? vs.getBoundingClientRect() : null;

  // Centro: o próprio "VS"; se não existir, o meio entre herói e inimigo
  let cx = window.innerWidth / 2, cy = 160;
  if (rv && rv.width) { cx = rv.left + rv.width / 2; cy = rv.top + rv.height / 2; }
  else if (r && ri && ri.width) { cx = (r.right + ri.left) / 2; cy = r.top + r.height / 2; }
  else if (r) { cx = r.left + r.width / 2; cy = r.top + r.height / 2; }

  // Tamanho do card se adapta ao espaço livre (telas estreitas)
  let w = 62;
  if (r && ri && ri.width) w = Math.max(46, Math.min(72, Math.floor(ri.left - r.right) - 10));
  const h = Math.round(w * 84 / 62);
  const altura = h + 20; // imagem + nome do golpe

  const el = document.createElement('div');
  el.id = 'cristal-elo-card';
  el.className = 'ce-card';
  el.style.setProperty('--c', aliado.cor);
  el.style.setProperty('--w', w + 'px');
  el.style.setProperty('--h', h + 'px');
  el.style.setProperty('--ms', CRISTAL_ELO_CONFIG.CARD_MS + 'ms');
  el.innerHTML = `<img src="${aliado.retrato}" alt="${aliado.nome}" onerror="this.style.display='none';"><span>${golpe.icon} ${golpe.nome.toUpperCase()}</span>`;
  const meio = Math.max(w / 2 + 6, 56); // nome do golpe é mais largo que a imagem
  el.style.left = Math.round(Math.max(meio, Math.min(window.innerWidth - meio, cx))) + 'px';
  el.style.top  = Math.round(Math.max(8, cy - altura / 2)) + 'px';
  document.body.appendChild(el);

  if (vs) vs.classList.add('ce-oculto');
  void el.offsetWidth;
  el.classList.add('on');
  setTimeout(() => {
    el.remove();
    if (vs) vs.classList.remove('ce-oculto');
  }, CRISTAL_ELO_CONFIG.CARD_MS + 80);
}

// ─────────────────────────────────────────────────────────────
//  7b. EFEITO DO GOLPE — lâmina cruzando do herói até o inimigo
//      Demo aprovada: card no VS → lâmina corta (ponta chega primeiro) →
//      impacto: clarão, tremor, estilhaços, inimigo congelado por um instante.
//      Tudo em elementos position:fixed no <body>; some sozinho.
// ─────────────────────────────────────────────────────────────
function _cristalCentro(id) {
  const el = document.getElementById(id);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
}

function _cristalEfeitoGolpe(img, crit) {
  _cristalCSS();
  const C = CRISTAL_ELO_CONFIG;
  const h = _cristalCentro('bat-hero-icon');
  const e = _cristalCentro('bat-enemy-icon');
  if (!h || !e) return;

  // Lâmina: centro no meio do caminho, largura proporcional à distância (min/max pra caber na tela)
  const dir = e.x >= h.x ? 1 : -1;                 // inimigo à direita → espelha (ponta aponta pra ele)
  let w = Math.abs(e.x - h.x) * 1.35 + 80;
  w = Math.max(180, Math.min(window.innerWidth * 0.96, w));
  const alt = w * 937 / 1667;
  const mx = (h.x + e.x) / 2, my = (h.y + e.y) / 2;
  const sl = document.createElement('img');
  sl.className = 'ce-slash' + (crit ? ' crit' : '');
  sl.alt = '';
  sl.src = img;
  sl.style.cssText = `--f:${-dir};width:${Math.round(w)}px;height:${Math.round(alt)}px;` +
    `left:${Math.round(mx - w / 2)}px;top:${Math.round(my - alt / 2)}px;`;
  document.body.appendChild(sl);
  setTimeout(() => { sl.classList.add('go'); }, C.SLASH_DELAY_MS);
  setTimeout(() => sl.remove(), C.SLASH_DELAY_MS + 700);

  // Impacto
  setTimeout(() => {
    if (!G || !G.inBattle) return;
    const fl = document.createElement('div');
    fl.className = 'ce-flash';
    fl.style.background = `radial-gradient(circle at ${Math.round(e.x)}px ${Math.round(e.y)}px,#fff,rgba(130,205,255,.6) 22%,transparent 55%)`;
    document.body.appendChild(fl);
    setTimeout(() => fl.remove(), 420);

    const arena = document.querySelector('.battle-arena');
    if (arena) {
      arena.classList.remove('ce-shake', 'crit'); void arena.offsetWidth;
      arena.classList.add('ce-shake'); if (crit) arena.classList.add('crit');
      setTimeout(() => arena.classList.remove('ce-shake', 'crit'), 560);
    }
    const ic = document.getElementById('bat-enemy-icon');
    if (ic) { ic.classList.add('ce-gelo'); setTimeout(() => ic.classList.remove('ce-gelo'), 700); }

    const n = crit ? 26 : 16;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('i');
      s.className = 'ce-shard';
      const a = Math.random() * 6.283, d = 40 + Math.random() * (crit ? 130 : 90), z = 5 + Math.random() * (crit ? 11 : 8);
      s.style.cssText = `left:${Math.round(e.x)}px;top:${Math.round(e.y)}px;--s:${z.toFixed(1)}px;` +
        `--dx:${Math.round(Math.cos(a) * d)}px;--dy:${Math.round(Math.sin(a) * d)}px;--r:${Math.round(Math.random() * 540 - 270)}deg`;
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 800);
    }
  }, C.IMPACTO_MS);
}

function _cristalLimparEfeitos() {
  document.querySelectorAll('.ce-slash,.ce-flash,.ce-shard').forEach(n => n.remove());
  const arena = document.querySelector('.battle-arena');
  if (arena) arena.classList.remove('ce-shake', 'crit');
  const ic = document.getElementById('bat-enemy-icon');
  if (ic) ic.classList.remove('ce-gelo');
}

// Pré-carrega as imagens de efeito (evita o 1º golpe aparecer sem a lâmina)
try {
  CRISTAL_ELO_ALIADOS.forEach(a => {
    [a.efeitoImg].concat((a.golpes || []).map(g => g.efeitoImg)).filter(Boolean).forEach(u => { const im = new Image(); im.src = u; });
  });
} catch (_) {}

// ─────────────────────────────────────────────────────────────
//  8. GANCHOS NO MOTOR (sem editar o palDinh.js)
//     Mesmo padrão do cidade_kurosaki.js: embrulha a função original.
// ─────────────────────────────────────────────────────────────

// 8a. Nova batalha → zera a carga
if (typeof startBattleReal === 'function' && !window._cristalOrigStartBattleReal) {
  window._cristalOrigStartBattleReal = startBattleReal;
  startBattleReal = function (enemy) {
    const r = window._cristalOrigStartBattleReal.apply(this, arguments);
    try { _cristalReset(battleState); } catch (e) { console.error('[cristal_elo]', e); }
    return r;
  };
}

// 8b. Rodada com defesa/escudo ativo → bônus de carga (calcEnemyDmg lê e consome essas flags)
if (typeof calcEnemyDmg === 'function' && !window._cristalOrigCalcEnemyDmg) {
  window._cristalOrigCalcEnemyDmg = calcEnemyDmg;
  calcEnemyDmg = function (e, p, bs, mult) {
    try { if (bs && (bs.defending || bs._shieldActive)) bs._cristalDefendeu = true; } catch (_) {}
    return window._cristalOrigCalcEnemyDmg.apply(this, arguments);
  };
}

// 8c. Dano recebido na rodada → soma na carga
if (typeof applyDmgToPlayer === 'function' && !window._cristalOrigApplyDmg) {
  window._cristalOrigApplyDmg = applyDmgToPlayer;
  applyDmgToPlayer = function (dmg, bs, p, ignoresDef) {
    const antes = p ? p.hp : 0;
    const r = window._cristalOrigApplyDmg.apply(this, arguments);
    try { if (bs && p && p.hp < antes) bs._cristalTaken = (bs._cristalTaken || 0) + (antes - p.hp); } catch (_) {}
    return r;
  };
}

// 8d. Fim da rodada → conta a carga e, se encheu, o aliado ataca
if (typeof tickPlayerStatusEffects === 'function' && !window._cristalOrigTick) {
  window._cristalOrigTick = tickPlayerStatusEffects;
  tickPlayerStatusEffects = function (bs, p, e) {
    const r = window._cristalOrigTick.apply(this, arguments);
    try { _cristalTick(bs, p, e); } catch (err) { console.error('[cristal_elo]', err); }
    return r;
  };
}

// 8e. HUD da batalha → mantém a barra no lugar
if (typeof updateBattleHUD === 'function' && !window._cristalOrigUpdateBattleHUD) {
  window._cristalOrigUpdateBattleHUD = updateBattleHUD;
  updateBattleHUD = function () {
    const r = window._cristalOrigUpdateBattleHUD.apply(this, arguments);
    try { _cristalAtualizarBarra(); } catch (_) {}
    return r;
  };
}

// 8f. Fim da batalha → some com a barra e o card
if (typeof endBattle === 'function' && !window._cristalOrigEndBattle) {
  window._cristalOrigEndBattle = endBattle;
  endBattle = function () {
    _cristalRemoverBarra();
    const c = document.getElementById('cristal-elo-card');
    if (c) c.remove();
    const vs = document.querySelector('#battle-overlay .battle-vs');
    if (vs) vs.classList.remove('ce-oculto');
    _cristalLimparEfeitos();
    return window._cristalOrigEndBattle.apply(this, arguments);
  };
}

window.CRISTAL_ELO_CONFIG = CRISTAL_ELO_CONFIG;
window.CRISTAL_ELO_ALIADOS = CRISTAL_ELO_ALIADOS;
