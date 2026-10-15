// ─────────────────────────────────────────────────────────────
//  INTEGRAÇÃO — sistema visual do teste_purgatorio.js aplicado no
//  boss FINAL de verdade da masmorra Inazami (Hi-no-Kagutsuchi,
//  id 'hi_no_kagutsuchi').
//
//  Carregar este arquivo DEPOIS de inazami_completo.js no gat-1.html.
//  Pode REMOVER o <script> do teste_purgatorio.js — este arquivo já
//  cobre tudo que ele fazia, só que ligado no boss real em vez do
//  inimigo de teste isolado.
//
//  O QUE MUDA NA PRÁTICA:
//   • Idle: 1 frame fixo do sprite sheet vertical (antes era o
//     retrato estático de OniC.png).
//   • Ataque com garras (decisão "ataque_normal" da hikCombateIA) →
//     animação de soco em chamas (Socoal.png), no lugar do sheet
//     hik_battle_sheet_vertical.png que estava sem uso real de
//     conteúdo (era só o overlay genérico _hikAtaqueNormalFX).
//   • Skill ☄️ Purgatório → conjuração (Purgg.png) no lugar do sheet
//     HIK_PURGATORIO_SHEET antigo — SEM o projétil viajando até o
//     herói (ver aviso abaixo).
//   • Skill 🌡️ Elevação de Temperatura → reaproveita a pose de
//     ataque genérica do sheet vertical, só pra dar um feedback
//     visual (essa skill não tinha FX nenhum antes).
//   • Skill 👁️ Olho de Eir → o olho abre de verdade (OlhoEir.png)
//     quando o buff É sorteado/ativado — e como esse buff é
//     permanente pro resto da luta, o olho fica aberto até o fim da
//     batalha (não fecha sozinho depois de 3 turnos como no teste
//     isolado, que era só demonstração).
//   • Quando o boss acerta você → flash do fog5.png sobre o herói
//     (em qualquer uma das ações dele, não só no Purgatório).
//
//  ⚠️ NÃO plugado (fica pra depois, se você quiser): o projétil
//  viajando do Purgatório até o herói. No teste isolado, o "dano"
//  só era aplicado DEPOIS do projétil chegar. No boss de verdade, o
//  dano já é calculado e aplicado na hora, de forma síncrona, dentro
//  de HIK_SKILLS.purgatorio.executar(). Se eu ligasse o projétil
//  (0.6s) + conjuração (1.68s) igual ao teste sem mexer nesse fluxo,
//  o número de dano ia aparecer ANTES da bola de fogo "chegar" nele
//  — ia parecer bugado. Fazer isso direito exige atrasar a aplicação
//  do dano até o projétil chegar (mexe no fluxo síncrono do
//  special()) — avisa se quiser que eu faça esse passo também.
//
//  Tudo por monkey-patch, igual ao padrão que você já usa no resto
//  do projeto: nada aqui quebra outro inimigo/boss, porque tudo
//  checa `enemy.id === 'hi_no_kagutsuchi'` (ou reaproveita nomes de
//  função que só o próprio Hi-no-Kagutsuchi chama) antes de agir.
// ─────────────────────────────────────────────────────────────

const _pgKfInjected = {};
function _pgEnsureKeyframe(kid, cssText) {
  if (_pgKfInjected[kid]) return;
  _pgKfInjected[kid] = true;
  const style = document.createElement('style');
  style.textContent = cssText;
  document.head.appendChild(style);
}

// ─────────────────────────────────────────────────────────────
//  1) VISUAL DO CORPO — idle parado / attack e hit animados
//     (genérico: já funciona pra qualquer enemy com
//     `_verticalSpriteSheet`, não precisa checar id aqui)
// ─────────────────────────────────────────────────────────────
(function () {
  const _buildEnemyVisualOriginal = window.buildEnemyVisual;

  window.buildEnemyVisual = function (enemy, size, animState) {
    if (enemy && enemy._verticalSpriteSheet) {
      const vs = enemy._verticalSpriteSheet;
      const scale = size / vs.frameW;
      const fw    = Math.round(vs.frameW * scale);
      const fh    = Math.round(vs.frameH * scale);
      const filtro = 'filter: drop-shadow(0 0 22px rgba(200,80,20,0.9)) drop-shadow(0 0 6px rgba(0,0,0,0.95));';

      if (!animState || animState === 'idle') {
        const idleFrame = vs.idleFrame || 0;
        const offY = Math.round(idleFrame * vs.frameH * scale);
        return `<div style="
          width:${fw}px; height:${fh}px; overflow:hidden;
          background-image:url('${vs.src}');
          background-size:${fw}px auto;
          background-position:0 -${offY}px;
          background-repeat:no-repeat;
          ${filtro}
        "></div>`;
      }

      const totalH = Math.round(vs.frameH * vs.frames * scale);
      const fps    = vs.fps || 4;
      const dur    = (vs.frames / fps).toFixed(2) + 's';
      const kid    = `spv_${enemy.id}_${size}`;
      _pgEnsureKeyframe(kid, `@keyframes ${kid} { from { background-position-y: 0; } to { background-position-y: -${totalH}px; } }`);

      return `<div style="
        width:${fw}px; height:${fh}px; overflow:hidden;
        background-image:url('${vs.src}');
        background-size:${fw}px auto;
        background-position:0 0;
        background-repeat:no-repeat;
        animation: ${kid} ${dur} steps(${vs.frames}) infinite;
        ${filtro}
      "></div>`;
    }
    return _buildEnemyVisualOriginal.apply(this, arguments);
  };
})();

function _pgPlayPose(state, revertMs) {
  const enemy = G.currentEnemy;
  const batIcon = document.getElementById('bat-enemy-icon');
  if (!batIcon || typeof _swapEnemyPoseFade !== 'function') return;
  _clearEnemyAnimTimers();
  const token = ++_enemyAnimToken;
  _swapEnemyPoseFade(batIcon, enemy, 112, state, token);
  _enemyAnimTimers.push(setTimeout(() => {
    if (G.currentEnemy === enemy && token === _enemyAnimToken) {
      _swapEnemyPoseFade(batIcon, enemy, 112, 'idle', token);
    }
  }, revertMs));
}

// Hit reagindo quando o JOGADOR acerta o boss — isso é chamado pelo
// motor genérico independente da IA custom dele, então vale manter.
(function () {
  const _animEnemyHitOriginal = window.animEnemyHit;
  window.animEnemyHit = function () {
    const enemy = G.currentEnemy;
    if (enemy && enemy.id === 'hi_no_kagutsuchi') {
      _pgPlayPose('hit', 400);
      return;
    }
    return _animEnemyHitOriginal.apply(this, arguments);
  };
})();

// ─────────────────────────────────────────────────────────────
//  2) HIT FX (fog5.png) sobre o HERÓI — dispara sempre que o
//     Hi-no-Kagutsuchi acerta o jogador (garras, Purgatório ou
//     Elevação de Temperatura acima do limiar de queimadura)
// ─────────────────────────────────────────────────────────────
const PURGATORIO_HIT_FX = { src: 'Imagens/teste/fog5.png', size: 140 };

function _pgEnsureHitFxEl() {
  let el = document.getElementById('pg-hitfx-img');
  if (el) return el;
  const wrap = document.getElementById('bat-hero-icon-wrap');
  if (!wrap) return null;

  el = document.createElement('img');
  el.id = 'pg-hitfx-img';
  el.src = PURGATORIO_HIT_FX.src;
  el.style.cssText = `
    display:none; position:absolute; top:50%; left:50%;
    width:${PURGATORIO_HIT_FX.size}px; height:${PURGATORIO_HIT_FX.size}px;
    transform:translate(-50%,-50%) scale(0.6);
    object-fit:contain; pointer-events:none; z-index:27;
    filter:drop-shadow(0 0 14px rgba(255,90,20,0.9));
  `;
  wrap.appendChild(el);

  _pgEnsureKeyframe('pgHitFxPlay', `
    @keyframes pgHitFxPlay {
      0%   { opacity:0; transform:translate(-50%,-50%) scale(0.5); }
      20%  { opacity:1; transform:translate(-50%,-50%) scale(1.15); }
      40%  { opacity:1; transform:translate(-50%,-50%) scale(1); }
      100% { opacity:0; transform:translate(-50%,-50%) scale(1.1); }
    }
    #pg-hitfx-img.playing { animation: pgHitFxPlay 0.55s ease-out forwards; }
  `);
  return el;
}

function _pgShowHitFx() {
  const el = _pgEnsureHitFxEl();
  if (!el) return;
  el.style.display = 'block';
  el.classList.remove('playing');
  void el.offsetWidth;
  el.classList.add('playing');
  setTimeout(() => { el.style.display = 'none'; el.classList.remove('playing'); }, 560);
}

(function () {
  const _flashDamageOriginal = window.flashDamage;
  window.flashDamage = function (target) {
    if (target === 'hero' && G.currentEnemy && G.currentEnemy.id === 'hi_no_kagutsuchi') {
      _pgShowHitFx();
    }
    return _flashDamageOriginal.apply(this, arguments);
  };
})();

// ─────────────────────────────────────────────────────────────
//  3) CONJURAÇÃO (Purgg.png, grid 3x2, 6 frames) — toca no lado do
//     boss quando a skill ☄️ Purgatório é usada de verdade.
// ─────────────────────────────────────────────────────────────
const PURGG_CONJURA = {
  src: 'Imagens/teste/Purgg.png',
  SHEET_W: 1536, SHEET_H: 1024,
  cols: 3, rows: 2, frames: 6,
  displaySize: 180,
  frameDuration: 280,
  crossfadeMs: 100,
};
PURGG_CONJURA.duration = PURGG_CONJURA.frames * PURGG_CONJURA.frameDuration;

function _pgPlayConjura() {
  const enemySide = document.getElementById('bat-enemy-side');
  if (!enemySide) return;

  const frameW = PURGG_CONJURA.SHEET_W / PURGG_CONJURA.cols;
  const frameH = PURGG_CONJURA.SHEET_H / PURGG_CONJURA.rows;
  const scale  = PURGG_CONJURA.displaySize / Math.max(frameW, frameH);
  const fw  = Math.round(frameW * scale);
  const fh  = Math.round(frameH * scale);
  const bgW = Math.round(PURGG_CONJURA.SHEET_W * scale);
  const bgH = Math.round(PURGG_CONJURA.SHEET_H * scale);

  const wrap = document.createElement('div');
  wrap.id = 'pg-conjura-fx';
  wrap.style.cssText = `
    position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);
    width:${fw}px; height:${fh}px; pointer-events:none; z-index:22;
  `;

  function makeInner() {
    const el = document.createElement('div');
    el.style.cssText = `
      position:absolute; inset:0; overflow:hidden;
      background-image:url('${PURGG_CONJURA.src}');
      background-size:${bgW}px ${bgH}px;
      background-repeat:no-repeat;
      filter: drop-shadow(0 0 18px rgba(255,60,20,0.85));
      opacity:0; transition: opacity ${PURGG_CONJURA.crossfadeMs}ms linear;
    `;
    return el;
  }
  const innerA = makeInner();
  const innerB = makeInner();
  wrap.appendChild(innerA);
  wrap.appendChild(innerB);
  enemySide.appendChild(wrap);

  function drawFrame(idx, el) {
    const col = idx % PURGG_CONJURA.cols;
    const row = Math.floor(idx / PURGG_CONJURA.cols);
    el.style.backgroundPosition = `-${Math.round(col * frameW * scale)}px -${Math.round(row * frameH * scale)}px`;
  }

  let i = 0;
  let visible = innerA, hidden = innerB;
  drawFrame(0, visible);
  requestAnimationFrame(() => { visible.style.opacity = '1'; });

  const timer = setInterval(() => {
    i++;
    if (i >= PURGG_CONJURA.frames) {
      clearInterval(timer);
      wrap.remove();
      return;
    }
    drawFrame(i, hidden);
    hidden.style.opacity = '1';
    visible.style.opacity = '0';
    const tmp = visible; visible = hidden; hidden = tmp;
  }, PURGG_CONJURA.frameDuration);
}

// ─────────────────────────────────────────────────────────────
//  4) SOCO EM CHAMAS (Socoal.png) — vira o visual do ataque com
//     garras (decisão "ataque_normal"). Recorte manual por não ser
//     um grid uniforme (ver medidas abaixo).
// ─────────────────────────────────────────────────────────────
const PURG_SOCO = {
  src: 'Imagens/teste/Socoal.png',
  SHEET_W: 1040, SHEET_H: 1040,
  frames: [
    { x: 69,  y: 56,  w: 220, h: 365 },
    { x: 382, y: 79,  w: 264, h: 346 },
    { x: 710, y: 94,  w: 275, h: 320 },
    { x: 46,  y: 693, w: 366, h: 313 },
    { x: 600, y: 669, w: 372, h: 359 },
  ],
  displayHeight: 150,
  frameDuration: 130,
  crossfadeMs: 70,
};

function _pgPlaySoco(onDone) {
  const batIcon = document.getElementById('bat-enemy-icon');
  if (!batIcon) { if (onDone) onDone(); return; }

  const previousChildren = Array.from(batIcon.children);
  previousChildren.forEach(ch => { ch.style.visibility = 'hidden'; });

  const layer = document.createElement('div');
  layer.style.cssText = 'position:absolute; inset:0; z-index:5;';

  function makeInner() {
    const el = document.createElement('div');
    el.style.cssText = `
      position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);
      overflow:hidden; background-repeat:no-repeat;
      filter: drop-shadow(0 0 16px rgba(255,80,20,0.85));
      opacity:0; transition: opacity ${PURG_SOCO.crossfadeMs}ms linear;
    `;
    return el;
  }
  const innerA = makeInner();
  const innerB = makeInner();
  layer.appendChild(innerA);
  layer.appendChild(innerB);

  const prevPosition = batIcon.style.position;
  if (!prevPosition || prevPosition === 'static') batIcon.style.position = 'relative';
  batIcon.appendChild(layer);

  function drawFrame(idx, el) {
    const f = PURG_SOCO.frames[idx];
    const scale = PURG_SOCO.displayHeight / f.h;
    const fw  = Math.round(f.w * scale);
    const fh  = Math.round(f.h * scale);
    const bgW = Math.round(PURG_SOCO.SHEET_W * scale);
    const bgH = Math.round(PURG_SOCO.SHEET_H * scale);
    el.style.width = fw + 'px';
    el.style.height = fh + 'px';
    el.style.backgroundImage = `url('${PURG_SOCO.src}')`;
    el.style.backgroundSize = `${bgW}px ${bgH}px`;
    el.style.backgroundPosition = `-${Math.round(f.x * scale)}px -${Math.round(f.y * scale)}px`;
  }

  let i = 0;
  let visible = innerA, hidden = innerB;
  drawFrame(0, visible);
  requestAnimationFrame(() => { visible.style.opacity = '1'; });

  const timer = setInterval(() => {
    i++;
    if (i >= PURG_SOCO.frames.length) {
      clearInterval(timer);
      layer.remove();
      previousChildren.forEach(ch => { ch.style.visibility = ''; });
      if (onDone) onDone();
      return;
    }
    drawFrame(i, hidden);
    hidden.style.opacity = '1';
    visible.style.opacity = '0';
    const tmp = visible; visible = hidden; hidden = tmp;
  }, PURG_SOCO.frameDuration);
}

// ─────────────────────────────────────────────────────────────
//  5) OLHO DE EIR (OlhoEir.png, grid 2×2, 4 frames) — toca a
//     abertura (0→3) UMA VEZ quando o buff real é sorteado, e fica
//     PARADO aberto pro resto da luta (o buff da skill real é
//     permanente, então não faz sentido o olho fechar sozinho).
//     ⚠️ Ajuste SHEET_W/SHEET_H/cols/rows se o recorte real do
//     OlhoEir.png não for um grid 2×2 uniforme.
// ─────────────────────────────────────────────────────────────
const OLHO_EIR = {
  src: 'Imagens/teste/OlhoEir.png',
  SHEET_W: 1024, SHEET_H: 1024, // AJUSTE: medir certinho quando integrar de vez
  cols: 2, rows: 2, frames: 4,
  displaySize: 70,
  openFrameDuration: 300,
  crossfadeMs: 100,
  offsetTop: '-8%',
  offsetRight: '-10%',
};

let _olhoEirWrap = null; // fica setado enquanto o olho estiver aberto nesta luta

function _olhoEirFrameRect(idx) {
  const fw = OLHO_EIR.SHEET_W / OLHO_EIR.cols;
  const fh = OLHO_EIR.SHEET_H / OLHO_EIR.rows;
  const col = idx % OLHO_EIR.cols;
  const row = Math.floor(idx / OLHO_EIR.cols);
  return { fw, fh, x: col * fw, y: row * fh };
}

function _pgPlayOlhoDeEirBoss() {
  if (_olhoEirWrap) return; // já está aberto — não reabre/reinicia

  const batIcon = document.getElementById('bat-enemy-icon');
  if (!batIcon) return;
  const prevPosition = batIcon.style.position;
  if (!prevPosition || prevPosition === 'static') batIcon.style.position = 'relative';

  const { fw, fh } = _olhoEirFrameRect(0);
  const scale = OLHO_EIR.displaySize / Math.max(fw, fh);
  const dw  = Math.round(fw * scale);
  const dh  = Math.round(fh * scale);
  const bgW = Math.round(OLHO_EIR.SHEET_W * scale);
  const bgH = Math.round(OLHO_EIR.SHEET_H * scale);

  const wrap = document.createElement('div');
  wrap.id = 'olho-eir-fx-hik';
  wrap.style.cssText = `
    position:absolute; top:${OLHO_EIR.offsetTop}; right:${OLHO_EIR.offsetRight};
    width:${dw}px; height:${dh}px; pointer-events:none; z-index:24;
  `;

  function makeInner() {
    const el = document.createElement('div');
    el.style.cssText = `
      position:absolute; inset:0; overflow:hidden;
      background-image:url('${OLHO_EIR.src}');
      background-size:${bgW}px ${bgH}px;
      background-repeat:no-repeat;
      filter: drop-shadow(0 0 10px rgba(255,40,20,0.85));
      opacity:0; transition: opacity ${OLHO_EIR.crossfadeMs}ms linear;
    `;
    return el;
  }
  const innerA = makeInner();
  const innerB = makeInner();
  wrap.appendChild(innerA);
  wrap.appendChild(innerB);
  batIcon.appendChild(wrap);
  _olhoEirWrap = wrap;

  function drawFrame(idx, el) {
    const { x, y } = _olhoEirFrameRect(idx);
    el.style.backgroundPosition = `-${Math.round(x * scale)}px -${Math.round(y * scale)}px`;
  }

  let i = 0;
  let visible = innerA, hidden = innerB;
  drawFrame(0, visible);
  requestAnimationFrame(() => { visible.style.opacity = '1'; });

  const openTimer = setInterval(() => {
    i++;
    if (i >= OLHO_EIR.frames) {
      clearInterval(openTimer);
      return; // fica parado no último frame (olho aberto) até o fim da luta
    }
    drawFrame(i, hidden);
    hidden.style.opacity = '1';
    visible.style.opacity = '0';
    const tmp = visible; visible = hidden; hidden = tmp;
  }, OLHO_EIR.openFrameDuration);
}

// Reseta o olho quando uma NOVA luta contra o boss começa (senão ele
// ficaria "lembrando" que já abriu de uma luta anterior).
(function () {
  const _originalStartBattle = window.startBattle;
  window.startBattle = function (enemy) {
    if (enemy && (enemy.id === 'hi_no_kagutsuchi' || enemy.ai === 'hi_no_kagutsuchi')) {
      const oldEl = document.getElementById('olho-eir-fx-hik');
      if (oldEl) oldEl.remove();
      _olhoEirWrap = null;
      // Anexa o sprite sheet vertical no inimigo desta luta, pro idle
      // e as poses attack/hit (bloco 1) funcionarem nele.
      enemy._verticalSpriteSheet = {
        src: 'Imagens/teste/purgatorio_sheet_vertical.png',
        frameW: 307,
        frameH: 486,
        frames: 4,
        fps: 4,
      };
    }
    return _originalStartBattle.apply(this, arguments);
  };
})();

// ─────────────────────────────────────────────────────────────
//  6) LIGAÇÃO NOS PONTOS REAIS DE FX DO BOSS — substitui as funções
//     que HIK_SKILLS/special() já chamam pelo nome, sem precisar
//     tocar em inazami_completo.js. Precisa rodar DEPOIS que esse
//     arquivo já carregou (por isso o setTimeout de retry).
// ─────────────────────────────────────────────────────────────
(function _ligarFxNoBossReal() {
  if (typeof window._hikAtaqueNormalFX !== 'function' || typeof window._hikPurgatorioCastFX !== 'function' || typeof window.HIK_SKILLS === 'undefined') {
    setTimeout(_ligarFxNoBossReal, 200);
    return;
  }

  // Ataque com garras (ataque_normal) → soco em chamas.
  window._hikAtaqueNormalFX = function () {
    _pgPlaySoco();
  };

  // Skill Purgatório → conjuração (sem projétil — ver aviso no topo).
  window._hikPurgatorioCastFX = function () {
    _pgPlayConjura();
  };

  // Skill Elevação de Temperatura → não tinha FX nenhum; agora toca a
  // pose de ataque genérica do sheet vertical, só como feedback visual.
  const _elevOriginal = HIK_SKILLS.elevacaoTemperatura.executar;
  HIK_SKILLS.elevacaoTemperatura.executar = function (hikStats, playerRuntime) {
    _pgPlayPose('attack', 700);
    return _elevOriginal.call(this, hikStats, playerRuntime);
  };

  // Skill Olho de Eir → abre o olho de verdade quando o buff é sorteado.
  const _olhoOriginal = HIK_SKILLS.olhoDeEir.executar;
  HIK_SKILLS.olhoDeEir.executar = function (hikStats) {
    _pgPlayOlhoDeEirBoss();
    return _olhoOriginal.call(this, hikStats);
  };

  console.log('🔥 FX do teste_purgatorio.js ligados no Hi-no-Kagutsuchi real!');
})();
