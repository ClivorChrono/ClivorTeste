// ══════════════════════════════════════════════════════════════
//  CHRONICLES OF CLIVOR — class_arqueiro.js
// ══════════════════════════════════════════════════════════════

'use strict';

const CLASS_ARQUEIRO = {
  id: 'arqueiro',
  name: 'Arqueiro',
  role: 'À DISTÂNCIA · PRECISO',
  icon: '🏹',
  iconImg: 'Imagens/icones/Archer.png',
  color: '#5a7a3a',
  desc: 'Combatente à distância. Ignora parcialmente a defesa do inimigo com flechas precisas.',
  stats: { hp: 90, mp: 0, atk: 8, def: 2, spd: 7, mag: 0 },
  maxAp: 100,
  resource: 'ap',
  // ── Crescimento por level (aplicado em checkLevelUp, palDinh.js) ──
  // DPS físico consistente: bom ganho de ATQ, DEF baixa, VEL moderada.
  growth: { hp: 12, atk: 2, def: 1, spd: 1, mag: 0, mp: 0, ap: 5 },
  // ── Sistema de Flechas ──
  arrows: { max: 30, regenPerTurn: 3 },
  startWeapon: {
    id: 'arco_rustico', name: 'Arco Rústico',
    imgSrc: 'Imagens/Armas/arco.png', icon: '🏹',
    atk: 5, def: 0, spd: 0, mag: 0, weight: 2,
    desc: 'Arco de madeira simples. Alcance médio.'
  },
  skills: [
    {
      key: 'flecha_precisa',
      name: 'Flecha Precisa',
      icon: '🎯',
      iconImg: 'Imagens/personagens/Arqueiro/iconeshab/Picsart_26-08-15_23-09-27-961.png',
      ap: 18,
      arrowCost: 1,
      cooldownTurns: 2,
      desc: 'Mira o ponto fraco do inimigo (~3s). Ignora 40% da DEF + crítico garantido. (1🏹, 2 turnos de recarga)',
      dmg: 'arqueiro:flecha_precisa',
    },
    {
      key: 'chuva_flechas',
      name: 'Chuva de Flechas',
      icon: '🌧️',
      iconImg: 'Imagens/personagens/Arqueiro/iconeshab/Picsart_26-08-15_23-10-04-482.png',
      ap: 30,
      arrowCost: 4,
      desc: '4 flechas. ATQ×0.65 cada. (4🏹)',
      dmg: 'arqueiro:chuva_flechas',
    },
    {
      key: 'marca_cacador',
      name: 'Marca do Caçador',
      icon: '🔖',
      iconImg: 'Imagens/personagens/Arqueiro/iconeshab/ChatGPT Image 15 de ago. de 2026, 23_06_49.png',
      ap: 20,
      arrowCost: 1,
      cooldownTurns: 3,
      desc: 'Marca o inimigo por 3 turnos: seus ataques contra ele ganham +20% de crítico e +15% de dano. (1🏹, 3 turnos de recarga)',
      dmg: 'arqueiro:marca_cacador',
    },
  ],
  statBars: { atk: 55, def: 10, spd: 35 },
  sprite: {
    src: 'Imagens/personagens/Arqueiro/arqueiro.png', // o arquivo antigo (arqueiro_1780709092555.png) não existe mais na pasta
    totalW: 1536, bgH: 1024, posY: 200,
    cols: 3, rows: 1,
    displayH: 560,
    anims: {
      idle:    { row: 0, startCol: 0, frames: 1, fps: 2 },
      prepare: { row: 0, startCol: 1, frames: 1, fps: 4 },
      attack:  { row: 0, startCol: 2, frames: 1, fps: 4 },
      defend:  { row: 0, startCol: 0, frames: 1, fps: 2 },
      hit:     { row: 0, startCol: 0, frames: 1, fps: 2 },
      hit2:    { row: 0, startCol: 0, frames: 1, fps: 2 },
      recover: { row: 0, startCol: 0, frames: 1, fps: 2 },
    }
  },
};

// ── Catálogo de Flechas Especiais ──
const ARROW_TYPES = [
  {
    id: 'normal',
    name: 'Flecha Normal',
    icon: '🏹',
    imgSrc: 'Imagens/Armas/flech.png',
    desc: 'Flecha padrão. Permite uso de todas as habilidades.',
    efeito: 'Habilidades disponíveis.',
    color: '#c8c0a0',
    skillsAllowed: true,
    efeitos: {},
  },
  {
    id: 'elfica',
    name: 'Flecha Élfica',
    icon: '🪶',
    imgSrc: 'Imagens/Armas/FÉlfica.png',
    desc: 'Ignora 75% da DEF inimiga, sempre — não importa o quanto o inimigo tenha de defesa. Mira aprimorada reduz chance de erro.',
    efeito: '+75% penetração DEF (fixo) · -50% chance de errar · -15% Crit',
    color: '#80d080',
    skillsAllowed: false,
    efeitos: {
      defPen: 0.75,
      missReduction: 0.5,
      critMod: -0.15,
    },
  },
  {
    id: 'branca',
    name: 'Flecha Branca',
    icon: '🤍',
    imgSrc: 'Imagens/Armas/FBranca.png',
    desc: 'A cada 4 turnos, dispara um Tiro Certeiro automático que não erra e ignora DEF.',
    efeito: 'Tiro Certeiro a cada 4 turnos (não erra, ignora DEF)',
    color: '#e0e8ff',
    skillsAllowed: false,
    efeitos: {
      tiroCerteiroTurns: 4,
    },
  },
  {
    id: 'negra',
    name: 'Flecha Negra',
    icon: '🖤',
    imgSrc: 'Imagens/Armas/FNegra.png',
    desc: 'Poder sombrio: +20% ATQ, +20% Crit — e ambos crescem ainda mais a cada turno que você a mantém equipada. Ao equipar perde 10% HP. Cada turno ativo perde 14% HP total. Inimigo tem +15% chance de critar.',
    efeito: '+20% ATQ · +20% Crit (crescente por turno) · -10% HP ao equipar · -14% HP/turno · Inimigo +15% Crit',
    color: '#c060c0',
    skillsAllowed: false,
    efeitos: {
      atkMod: 0.20,
      critMod: 0.20,
      hpCostEquip: 0.10,
      hpCostTurn: 0.14,
      enemyCritBonus: 0.15,
      stackPerTurn: 0.02,
      stackMax: 0.30,
    },
  },
  {
    id: 'dagua',
    name: "Flecha D'Água",
    icon: '💧',
    imgSrc: "Imagens/Armas/D'Água.png",
    desc: 'A cada 5 turnos, dispara dois ataques: o primeiro normal e o segundo com 10% do dano do primeiro. Também recupera um pouco de HP a cada turno — a cura melhora conforme você sobe de nível, chegando a 3% do HP máximo por turno a partir do nível 5.',
    efeito: 'Ataque duplo a cada 5 turnos (2º hit = 10% do 1º) · Cura passiva por turno (até 3% HP máx no LV5+)',
    color: '#60a0e0',
    skillsAllowed: false,
    efeitos: {
      ataqueDuploTurns: 5,
      healFlat: 1.5,
      healPctAtMaxLevel: 0.03,
      healScaleLevel: 5,
    },
  },
];

function getArrowType(id) {
  return ARROW_TYPES.find(a => a.id === id) || ARROW_TYPES[0];
}
window.ARROW_TYPES   = ARROW_TYPES;
window.getArrowType  = getArrowType;
// ── Talento: Aljava Reforçada (Explorador da Floresta) ──
// Bônus ACUMULADO por nível (índice = nível atual, 0 a 5).
// Nv1:+10  Nv2:+10  Nv3:+15  Nv4:+15  Nv5:+30  → total +80 no Nv5.
const ALJAVA_BONUS_BY_LEVEL = [0, 10, 20, 35, 50, 80];
function getArrowsMax(p) {
  const base = (p.classData && p.classData.arrows) ? p.classData.arrows.max : 30;
  const lv = Math.max(0, Math.min(5, p._talent_aljava_lv || 0));
  return base + ALJAVA_BONUS_BY_LEVEL[lv];
}
window.getArrowsMax = getArrowsMax;

function getArrows(p) {
  if (p.arrows === undefined) p.arrows = getArrowsMax(p);
  return p.arrows;
}
function consumeArrows(p, qty, helpers) {
  p.arrows = Math.max(0, getArrows(p) - qty);
  updateArrowHUD(p);
}
function regenArrows(p) {
  const max = getArrowsMax(p);
  const regen = (p.classData && p.classData.arrows) ? p.classData.arrows.regenPerTurn : 3;
  p.arrows = Math.min(max, getArrows(p) + regen);
  updateArrowHUD(p);
}
function updateArrowHUD(p) {
  const el = document.getElementById('bat-hero-arrows');
  if (!el) return;
  const max = getArrowsMax(p);
  const cur = getArrows(p);
  const color = cur <= 5 ? '#ff6040' : cur <= 10 ? '#e0a030' : '#c8a040';
  const arrowId = p.equippedArrow || 'normal';
  const arrowDef = (typeof getArrowType === 'function') ? getArrowType(arrowId) : null;
  const imgSrc = (arrowDef && arrowDef.imgSrc) ? arrowDef.imgSrc : 'Imagens/Armas/flech.png';
  el.innerHTML = `
    <img src="${imgSrc}"
         style="width:38px;height:auto;object-fit:contain;vertical-align:middle;
                filter:drop-shadow(0 0 4px ${color}) brightness(1.1);
                margin-right:5px;"
         onerror="this.src='Imagens/Armas/flech.png'">
    <span style="color:${color};font-size:0.85rem;font-family:'Noto Serif JP',serif;
                 letter-spacing:1px;vertical-align:middle;">${cur}/${max}</span>`;
}

// ── SFX: som de flechada (AudioContext — zero latência) ──
(function () {
  let _sfxBuf = null;
  let _ctx    = null;

  function _getCtx() {
    if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
    return _ctx;
  }

  function _preload() {
    try {
      const ctx = _getCtx();
      fetch('musicas/efeitos sonoro/flecha.mp3')
        .then(r => r.arrayBuffer())
        .then(ab => ctx.decodeAudioData(ab))
        .then(buf => { _sfxBuf = buf; })
        .catch(() => {});
    } catch(e) {}
  }

  window.playSfxFlecha = function () {
    if (window.AudioSys && window.AudioSys.sfxMuted) return;
    if (!_sfxBuf) return;
    try {
      const ctx = _getCtx();
      if (ctx.state === 'suspended') ctx.resume();
      const vol = (window.AudioSys && window.AudioSys.sfxVolume != null) ? window.AudioSys.sfxVolume : 0.8;
      const gain = ctx.createGain();
      gain.gain.value = Math.min(1, vol * 1.1);
      gain.connect(ctx.destination);
      const src = ctx.createBufferSource();
      src.buffer = _sfxBuf;
      src.connect(gain);
      src.start(0);
    } catch(e) {}
  };

  // Registra listener só quando o DOM estiver pronto
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('click', function _initSfx() {
      _preload();
      window.removeEventListener('click', _initSfx);
    }, { once: true });
  }
})();

// ── FX: sprite sheet de "Chuva de Flechas" (5 frames de 64x64px, 20px de
// espaçamento entre eles — sheet total 400x64px). Como o espaçamento não é
// proporcional a divisões iguais, a posição de cada frame é calculada em
// pixels reais (não em % de background-size), escalada pro tamanho de
// exibição do overlay (#chuva-flechas-fx, 96x96 no HTML).
(function () {
  const FRAME_W = 64, FRAME_H = 64, GAP = 20, TOTAL_FRAMES = 5;
  const SHEET_W = FRAME_W * TOTAL_FRAMES + GAP * (TOTAL_FRAMES - 1); // 400
  const FRAME_MS = 110; // cadência por frame

  window.playChuvaFlechasFx = function (numHits) {
    const el = document.getElementById('chuva-flechas-fx');
    if (!el) return;
    const displayW = el.offsetWidth || 96;
    const scale = displayW / FRAME_W;
    el.style.backgroundSize = `${SHEET_W * scale}px ${FRAME_H * scale}px`;
    el.style.backgroundPosition = '0px 0px';
    el.style.display = 'block';
    // força reflow antes de animar a opacidade (senão a transição não dispara)
    void el.offsetWidth;
    el.style.opacity = '1';
    let frame = 0;
    const iv = setInterval(() => {
      frame++;
      if (frame >= TOTAL_FRAMES) {
        clearInterval(iv);
        setTimeout(() => {
          el.style.opacity = '0';
          setTimeout(() => { el.style.display = 'none'; }, 200);
        }, FRAME_MS + 60);
        return;
      }
      el.style.backgroundPosition = `-${frame * (FRAME_W + GAP) * scale}px 0px`;
    }, FRAME_MS);
  };
})();

// ── FX: Tiro Certeiro — a mira (Imagens/personagens/Arqueiro/TiroCerteiro.png)
// "vasculha" o inimigo por ~3s procurando o ponto fraco, travando nele no
// final. onLocked() é chamado quando a animação termina, e é aí que o dano
// de verdade é calculado — a skill vira assíncrona (ver flecha_precisa).
(function () {
  const SCAN_MS = 3000; // duração total da busca
  const HOP_MS  = 380;  // intervalo entre cada pulo da mira

  window.playTiroCerteiroFx = function (onLocked) {
    const el   = document.getElementById('tiro-certeiro-fx');
    const host = document.getElementById('bat-enemy-side');
    if (!el || !host) { if (onLocked) onLocked(); return; }

    const hops = Math.max(3, Math.round(SCAN_MS / HOP_MS));
    let hop = 0;

    function randomPos() {
      el.style.left = (18 + Math.random() * 55) + '%';
      el.style.top  = (6  + Math.random() * 48) + '%';
    }

    el.classList.remove('locked');
    el.style.display = 'block';
    randomPos();
    void el.offsetWidth; // força reflow antes de animar a opacidade
    el.style.opacity = '1';

    const iv = setInterval(() => {
      hop++;
      if (hop >= hops) {
        clearInterval(iv);
        // ── Trava no ponto fraco ──
        el.style.left = '50%';
        el.style.top  = '34%';
        el.classList.add('locked');
        if (typeof window.playSfxFlecha === 'function') window.playSfxFlecha();
        setTimeout(() => {
          el.style.opacity = '0';
          setTimeout(() => {
            el.style.display = 'none';
            el.classList.remove('locked');
            if (onLocked) onLocked();
          }, 200);
        }, 260);
        return;
      }
      randomPos();
    }, HOP_MS);
  };
})();

// ══════════════════════════════════════════════════════════════
//  FX DE IMPACTO DO ARQUEIRO — Flecha Precisa (mira + carimbo 急所) e
//  Chuva de Flechas (tiro pro céu + salva de flechas).
//  Tudo desenhado por cima de .battle-arena numa camada própria
//  (#arq-fx), medindo a posição de #bat-hero-icon e #bat-enemy-icon,
//  então não depende de nenhum HTML novo. Respeita a velocidade de
//  batalha via battleDelay(). Sem som novo: só o playSfxFlecha() que
//  já existia.
// ══════════════════════════════════════════════════════════════
(function () {
  const T = ms => (typeof battleDelay === 'function') ? battleDelay(ms) : ms;
  const sleep = ms => new Promise(r => setTimeout(r, T(ms)));
  const R = (a, b) => a + Math.random() * (b - a);
  const FRAME = () => new Promise(r => requestAnimationFrame(r));

  function ensureStyle() {
    if (document.getElementById('arq-fx-style')) return;
    const st = document.createElement('style');
    st.id = 'arq-fx-style';
    st.textContent = `
      #arq-fx{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:60}
      #arq-fx>*{position:absolute}
      .arq-arrow{left:0;top:0;width:48px;height:3px;margin-left:-48px;transform-origin:100% 50%;background:linear-gradient(90deg,transparent,#fff3d0 70%,#ffd36b);border-radius:2px;box-shadow:0 0 8px #ffd36b}
      .arq-arrow::after{content:"";position:absolute;right:-3px;top:-3px;border-left:8px solid #fff3d0;border-top:4.5px solid transparent;border-bottom:4.5px solid transparent}
      .arq-arrow.long{width:130px;height:2px;margin-left:-130px;background:linear-gradient(90deg,transparent,#ffd36b 60%,#fff)}
      .arq-arrow.fire{background:linear-gradient(90deg,transparent,#ff8a30 60%,#ffd36b);box-shadow:0 0 10px #ff6a1a}
      .arq-arrow.fire::after{border-left-color:#ffb060}
      .arq-stuck{left:0;top:0;width:26px;height:2px;margin-left:-26px;transform-origin:100% 50%;background:#c9b27a}
      .arq-spark{width:5px;height:5px;border-radius:50%}
      .arq-ring{width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;border:3px solid #c8402f;box-shadow:0 0 14px #c8402f,inset 0 0 10px #c8402f}
      .arq-beam{height:1.5px;transform-origin:0 50%;background:linear-gradient(90deg,#ffd36b,#c8402f);box-shadow:0 0 6px #ffd36b}
      .arq-glow{width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;background:radial-gradient(#fff,#ffd36b 40%,transparent 70%)}
      .arq-stamp{font-family:'Noto Serif JP',serif;font-size:40px;font-weight:900;color:#c8402f;border:3px solid #c8402f;padding:2px 8px;background:rgba(10,8,16,.55);letter-spacing:.05em;white-space:nowrap}
      .arq-spd{height:2px;transform-origin:0 50%;background:linear-gradient(90deg,#fff,transparent)}
      .arq-flash{inset:0;background:#fff;opacity:0}
      .arq-dim{inset:0;opacity:0}
    `;
    document.head.appendChild(st);
  }

  // Mede o palco: posição do arco do herói e do inimigo, relativa à arena.
  function getCtx() {
    const arena = document.querySelector('.battle-arena');
    const heroEl = document.getElementById('bat-hero-icon');
    const foeEl = document.getElementById('bat-enemy-icon') || document.getElementById('bat-enemy-side');
    if (!arena || !heroEl || !foeEl || !arena.animate) return null;
    ensureStyle();
    if (getComputedStyle(arena).position === 'static') arena.style.position = 'relative';
    let layer = document.getElementById('arq-fx');
    if (!layer) { layer = document.createElement('div'); layer.id = 'arq-fx'; }
    arena.appendChild(layer); // sempre por último = por cima
    layer.innerHTML = '';
    const ar = arena.getBoundingClientRect(), hr = heroEl.getBoundingClientRect(), er = foeEl.getBoundingClientRect();
    return {
      arena, layer, heroEl, foeEl, W: ar.width, H: ar.height,
      bow: { x: hr.right - hr.width * 0.12 - ar.left, y: hr.top + hr.height * 0.42 - ar.top },
      foe: { x: er.left + er.width / 2 - ar.left, y: er.top + er.height / 2 - ar.top, w: er.width, h: er.height, bottom: er.bottom - ar.top }
    };
  }

  function mk(layer, cls, css, txt) {
    const e = document.createElement('div');
    e.className = cls; e.style.cssText = css || '';
    if (txt) e.textContent = txt;
    layer.appendChild(e);
    return e;
  }

  // Flecha voando de a até b (parábola leve), tip na ponta.
  function fly(ctx, a, b, dur, arc, cls) {
    return new Promise(res => {
      const el = mk(ctx.layer, 'arq-arrow ' + (cls || ''));
      const d = T(dur), t0 = performance.now();
      let px = a.x, py = a.y;
      (function step(t) {
        const k = Math.min(1, (t - t0) / d);
        const x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k - Math.sin(Math.PI * k) * (arc || 0);
        const ang = (x === px && y === py) ? Math.atan2(b.y - a.y, b.x - a.x) : Math.atan2(y - py, x - px);
        el.style.transform = `translate(${x}px,${y}px) rotate(${ang * 57.2958}deg)`;
        px = x; py = y;
        if (k < 1) requestAnimationFrame(step); else { el.remove(); res(); }
      })(t0);
    });
  }

  function sparks(ctx, p, n, col) {
    for (let i = 0; i < n; i++) {
      const e = mk(ctx.layer, 'arq-spark', `left:${p.x}px;top:${p.y}px;background:${col}`);
      const a = R(0, 6.283), d = R(22, 62);
      e.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
                 { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d}px) scale(.2)`, opacity: 0 }],
                { duration: T(R(300, 600)), easing: 'ease-out' }).onfinish = () => e.remove();
    }
  }

  function shake(ctx, m) {
    const k = [];
    for (let i = 0; i < 8; i++) k.push({ transform: `translate(${R(-m, m)}px,${R(-m, m)}px)` });
    k.push({ transform: 'translate(0,0)' });
    try { ctx.arena.animate(k, { duration: T(280), composite: 'add' }); } catch (e) {}
  }

  function nudgeHero(ctx, px) {
    try {
      ctx.heroEl.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${-px}px)`, offset: .3 }, { transform: 'translateX(0)' }],
                         { duration: T(280), composite: 'add' });
    } catch (e) {}
  }

  function zoomIn(ctx, wp, scale) {
    const a = ctx.arena, par = a.parentElement;
    const saved = { f: a.style.filter, tr: a.style.transition, o: a.style.transformOrigin, po: par ? par.style.overflow : '' };
    if (par) par.style.overflow = 'hidden';
    a.style.transformOrigin = `${wp.x}px ${wp.y}px`;
    a.style.transition = 'filter .5s';
    a.style.filter = 'saturate(.35) contrast(1.1)';
    const z = a.animate([{ transform: 'scale(1)' }, { transform: `scale(${scale})` }],
                        { duration: T(900), fill: 'forwards', easing: 'cubic-bezier(.2,.7,.3,1)' });
    return function zoomOut() {
      a.animate([{ transform: `scale(${scale})` }, { transform: 'scale(1)' }], { duration: T(350), easing: 'ease-in-out' });
      z.cancel();
      a.style.filter = saved.f; a.style.transition = saved.tr; a.style.transformOrigin = saved.o;
      setTimeout(() => { if (par) par.style.overflow = saved.po; }, T(380));
    };
  }

  // ── Flecha Precisa: mira fecha no ponto fraco, disparo, carimbo 急所 ──
  const _oldTiro = window.playTiroCerteiroFx;
  window.playTiroCerteiroFx = function (onLocked) {
    let done = false;
    const finish = () => { if (done) return; done = true; try { onLocked && onLocked(); } catch (e) { console.error(e); } };
    const ctx = getCtx();
    if (!ctx) { if (_oldTiro) _oldTiro(onLocked); else finish(); return; }
    (async () => {
      const { layer, bow, foe } = ctx;
      const wp = { x: foe.x - foe.w * 0.05, y: foe.y - foe.h * 0.12 };
      let zoomOut = null, savedFilter = ctx.foeEl.style.filter;
      try {
        const dim = mk(layer, 'arq-dim', `background:radial-gradient(circle at ${wp.x}px ${wp.y}px,transparent 18%,rgba(0,0,0,.85) 95%)`);
        dim.animate([{ opacity: 0 }, { opacity: .7 }], { duration: T(500), fill: 'forwards' });
        zoomOut = zoomIn(ctx, wp, 1.1);
        const len = Math.hypot(wp.x - bow.x, wp.y - bow.y), ang = Math.atan2(wp.y - bow.y, wp.x - bow.x) * 57.2958;
        const beam = mk(layer, 'arq-beam', `left:${bow.x}px;top:${bow.y}px;width:${len}px`);
        beam.animate([{ transform: `rotate(${ang}deg) scaleX(0)` }, { transform: `rotate(${ang}deg) scaleX(1)` }],
                     { duration: T(600), fill: 'forwards', easing: 'ease-out' });
        const ring = mk(layer, 'arq-ring', `left:${wp.x}px;top:${wp.y}px`);
        ring.animate([{ transform: 'scale(4) rotate(0)', opacity: 0 }, { transform: 'scale(1) rotate(180deg)', opacity: 1 }],
                     { duration: T(800), fill: 'forwards', easing: 'ease-in' });
        const glow = mk(layer, 'arq-glow', `left:${bow.x}px;top:${bow.y}px`);
        glow.animate([{ transform: 'scale(.2)', opacity: .2 }, { transform: 'scale(2.2)', opacity: 1 }], { duration: T(800), fill: 'forwards' });
        await sleep(900);
        nudgeHero(ctx, 14);
        if (typeof window.playSfxFlecha === 'function') window.playSfxFlecha();
        glow.remove(); beam.remove();
        await fly(ctx, bow, wp, 90, 0, 'long');
        ring.remove();
        // impacto
        const fl = mk(layer, 'arq-flash');
        fl.animate([{ opacity: .9 }, { opacity: 0 }], { duration: T(200) }).onfinish = () => fl.remove();
        for (let i = 0; i < 16; i++) {
          const a = i * 22.5 + R(-6, 6);
          const s = mk(layer, 'arq-spd', `left:${wp.x}px;top:${wp.y}px;width:${R(50, 110)}px`);
          s.animate([{ transform: `rotate(${a}deg) scaleX(0)`, opacity: 1 }, { transform: `rotate(${a}deg) scaleX(1)`, opacity: 0 }],
                    { duration: T(380), easing: 'ease-out' }).onfinish = () => s.remove();
        }
        const sx = Math.max(6, Math.min(ctx.W - 100, foe.x - 50)), sy = Math.max(6, foe.y - foe.h * 0.55);
        const st = mk(layer, 'arq-stamp', `left:${sx}px;top:${sy}px`, '急所');
        st.animate([{ transform: 'rotate(-8deg) scale(2.4)', opacity: 0 }, { transform: 'rotate(-8deg) scale(1)', opacity: 1, offset: .25 },
                    { transform: 'rotate(-8deg) scale(1)', opacity: 1, offset: .8 }, { transform: 'rotate(-8deg) scale(1)', opacity: 0 }],
                   { duration: T(1100) }).onfinish = () => st.remove();
        // hitstop: o inimigo "congela" branco por um instante antes do dano aparecer
        ctx.foeEl.style.filter = 'brightness(6) saturate(0)';
        await sleep(220);
        ctx.foeEl.style.filter = savedFilter;
        finish();                       // aqui o motor aplica o dano, número e pose de dano
        shake(ctx, 18);
        fly(ctx, wp, { x: ctx.W + 60, y: wp.y - 20 }, 160, 0, 'long'); // atravessa (ignora DEF)
        sparks(ctx, { x: wp.x + 30, y: wp.y }, 10, '#ffd36b');
        await sleep(520);
      } catch (e) { console.error('[arqueiro fx]', e); }
      finally {
        ctx.foeEl.style.filter = savedFilter;
        if (zoomOut) zoomOut();
        layer.innerHTML = '';
        finish();
      }
    })();
  };

  // ── Chuva de Flechas: tiro pro céu + salva ──
  // hits = array de dano por flecha que acerta o inimigo (as demais caem no chão).
  // opts: { fire:bool (Chuva de Fogo), onHit(i,isLast), onDone() }
  window.playChuvaFlechasFxAsync = function (hits, opts) {
    opts = opts || {};
    let done = false;
    const finish = () => { if (done) return; done = true; try { opts.onDone && opts.onDone(); } catch (e) { console.error(e); } };
    const ctx = getCtx();
    if (!ctx) { hits.forEach((_, i) => { try { opts.onHit && opts.onHit(i, i === hits.length - 1); } catch (e) {} }); finish(); return; }
    (async () => {
      const { layer, bow, foe, W, H } = ctx;
      const cls = opts.fire ? 'fire' : '';
      let zoomOut = null;
      try {
        const dim = mk(layer, 'arq-dim', `background:radial-gradient(circle at ${foe.x}px ${foe.y}px,rgba(0,0,0,.25),rgba(0,0,0,.85))`);
        dim.animate([{ opacity: 0 }, { opacity: .6 }], { duration: T(350), fill: 'forwards' });
        nudgeHero(ctx, 12);
        await sleep(170);
        if (typeof window.playSfxFlecha === 'function') window.playSfxFlecha();
        await fly(ctx, bow, { x: bow.x + 50, y: -40 }, 320, 0, 'long ' + cls);
        sparks(ctx, { x: bow.x + 50, y: 8 }, 10, opts.fire ? '#ff9a40' : '#fff3d0');
        await sleep(220);

        const N = 34, nHit = Math.max(1, hits.length);
        const hitAt = {};
        for (let k = 0; k < nHit; k++) hitAt[Math.round((k + 0.5) * N / nHit)] = k;
        const jobs = [];
        for (let i = 0; i < N; i++) jobs.push((async () => {
          await sleep(i * 28 + R(0, 40));
          const k = hitAt[i];
          let tx, ty;
          if (k !== undefined) {
            tx = foe.x + R(-foe.w * .28, foe.w * .28); ty = foe.y + R(-foe.h * .28, foe.h * .22);
          } else {
            let tries = 0;
            do { tx = R(Math.min(W - 20, bow.x + 60), W - 12); tries++; } while (Math.abs(tx - foe.x) < foe.w * .42 && tries < 8);
            ty = Math.max(24, Math.min(H - 8, foe.bottom - R(-6, 38)));
          }
          const sx = tx + R(50, 80);
          await fly(ctx, { x: sx, y: -30 }, { x: tx, y: ty }, R(240, 320), 0, cls);
          if (k !== undefined) {
            sparks(ctx, { x: tx, y: ty }, 5, opts.fire ? '#ff9a40' : '#fff3d0');
            try { opts.onHit && opts.onHit(k, k === nHit - 1); } catch (e) { console.error(e); }
          } else {
            const s = mk(layer, 'arq-stuck', `left:${tx}px;top:${ty}px;transform:rotate(${Math.atan2(ty + 30, tx - sx) * 57.2958}deg)`);
            sparks(ctx, { x: tx, y: ty }, 3, '#a8946a');
            setTimeout(() => { s.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T(500), fill: 'forwards' }).onfinish = () => s.remove(); }, T(900));
          }
        })());
        await Promise.all(jobs);
        shake(ctx, 12);
        await sleep(350);
      } catch (e) { console.error('[arqueiro fx]', e); }
      finally {
        layer.innerHTML = '';
        finish();
      }
    })();
  };
})();

// ── Retoma o fluxo de turno depois que uma skill assíncrona do Arqueiro
// (ex.: mira do Tiro Certeiro) termina. Espelha o trecho final que
// doBattleAction roda pra skills síncronas (tick de status, HUD, checagem
// de morte do inimigo, turno do inimigo) — precisa existir aqui porque
// skills async pulam esse trecho com um "return" antecipado.
window.finishArqueiroSniperSkill = function (bs, p, e, skipEnemyTurn) {
  if (typeof tickEnemyStatusEffects === 'function') tickEnemyStatusEffects(bs, e);
  if (bs._enemyGuardTurns > 0 && e) {
    e.def = Math.max(0, (e.def || 0) - (e._guardDefBoost || 0));
    e._guardDefBoost = 0;
    bs._enemyGuardTurns = 0;
    if (typeof appendBattleLog === 'function') appendBattleLog(`🛡️ A guarda de ${e.name} se desfaz.`, 'rgba(150,170,220,0.7)');
    if (typeof buildStatusBadges === 'function') buildStatusBadges();
  }
  if (typeof updateBattleHUD === 'function') updateBattleHUD();
  if (typeof buildSkillList === 'function') buildSkillList();

  if (bs.enemyHp <= 0) {
    bs.phase = 'resolving';
    const fxHold = bs._pendingFxHoldMs || 0;
    bs._pendingFxHoldMs = 0;
    const killDelay = Math.max(750, fxHold); // arqueiro: aguarda o som da flecha
    setTimeout(() => endBattle(true, false), battleDelay(killDelay));
    return;
  }

  bs.turnCount++;
  setTimeout(() => runEnemyTurn(bs, p, e, skipEnemyTurn), battleDelay(850));
};

// ── Skills do Arqueiro ──
function skillArqueiro(skillKey, p, e, bs, helpers) {
  const { appendBattleLog, showFloatingNumber, flashDamage, animEnemyHit, BATTLE_CONFIG } = helpers;
  const result = { skipEnemyTurn: false, enemyStunned: false, apGain: 0 };
  const markCritBonus = (bs && bs.enemyMarked) ? 0.20 : 0; // Marca do Caçador
  // Skills de precisão do Arqueiro têm +50% de chance relativa em cima da
  // chance base (equivalente ao antigo "* 1.5"), mas agora passando pela
  // função central: respeita o teto de 75%, soma VEL e o crítico real de
  // itens equipados (p.critBonus) — o antigo p._enchantCrit nunca era lido
  // de fato, pois já era migrado/apagado antes de chegar aqui (ver palDinh.js).
  const isCrit = (typeof getPlayerCritChance === 'function')
    ? Math.random() < getPlayerCritChance(p, BATTLE_CONFIG.CRIT_BASE_CHANCE * 0.5 + markCritBonus, (e && e.critResist) || 0)
    : Math.random() < (BATTLE_CONFIG.CRIT_BASE_CHANCE * 1.5 + markCritBonus);

  // Verificar custo de flechas
  const sk = CLASS_ARQUEIRO.skills.find(s => s.key === skillKey);
  const arrowCost = sk ? (sk.arrowCost || 0) : 0;
  // ── Forma do Dragão: Chuva de Flechas vira Chuva de Fogo e não gasta flecha ──
  const formaDragaoChuva = bs && bs.formaAtiva === 'dragao' && skillKey === 'chuva_flechas';
  if (!formaDragaoChuva && arrowCost > 0 && getArrows(p) < arrowCost) {
    appendBattleLog(`🏹 Sem flechas suficientes! (${getArrows(p)}/${arrowCost} necessárias)`, '#ff6040');
    return result;
  }

  if (skillKey === 'flecha_precisa') {
    consumeArrows(p, arrowCost, helpers);
    // ── Olho Aguçado: ignora 60% da DEF em vez de 40% ──
    const defIgnorePct = p._talent_sharp_eye ? 0.60 : 0.40;
    // A flecha equipada também entra na conta (ex.: Élfica soma penetração)
    const arrowId = p.equippedArrow || 'normal';
    const arrowDef = (typeof getArrowType === 'function') ? getArrowType(arrowId) : null;
    const ef = (arrowDef && arrowDef.efeitos) || {};

    // ── Tiro Certeiro: a mira busca o ponto fraco do inimigo por ~3s antes
    // de disparar. Isso suspende o turno (skill assíncrona) — o dano só é
    // calculado no callback onLocked, quando a mira "trava".
    if (typeof window.playTiroCerteiroFx === 'function') {
      window.playTiroCerteiroFx(() => {
        const totalDefIgnore = Math.min(0.95, defIgnorePct + (ef.defPen || 0) * 0.5);
        const defUsed = e.def * (1 - totalDefIgnore);
        const atkBonus = ef.atkMod ? p.atk * ef.atkMod : 0;
        // Ponto fraco encontrado — o golpe é sempre crítico.
        let d = Math.max(1, Math.floor((p.atk + atkBonus) * 1.4 - defUsed * 0.5 + Math.random() * 4));
        d = Math.floor(d * (p._talent_max_draw ? 2.2 : (typeof getCritMultiplier === 'function' ? getCritMultiplier(p) : BATTLE_CONFIG.CRIT_MULTIPLIER)));
        if (bs.enemyMarked) d = Math.floor(d * 1.15); // Marca do Caçador
        bs.enemyHp -= d;
        appendBattleLog(`🎯 Tiro Certeiro! Ponto fraco encontrado — CRÍTICO! Ignora armadura! -${d} HP!`, '#90d060');
        showFloatingNumber('enemy', d, 'crit');
        flashDamage('enemy'); animEnemyHit();
        if (typeof gainFervor === 'function') gainFervor(p, 14);
        p.ap = Math.min(p.maxAp, (p.ap || 0) + 12);
        appendBattleLog('⚡ +12 AP (skill)!', '#e09030');
        if (typeof updateHUD === 'function') updateHUD();
        window.finishArqueiroSniperSkill(bs, p, e, false);
      });
      result.async = true;
      return result;
    }
    // Fallback síncrono, caso o overlay #tiro-certeiro-fx não exista no HTML
    const totalDefIgnoreFallback = Math.min(0.95, defIgnorePct + (ef.defPen || 0) * 0.5);
    const defUsedFallback = e.def * (1 - totalDefIgnoreFallback);
    const atkBonusFallback = ef.atkMod ? p.atk * ef.atkMod : 0;
    let dFallback = Math.max(1, Math.floor((p.atk + atkBonusFallback) * 1.4 - defUsedFallback * 0.5 + Math.random() * 4));
    if (isCrit) dFallback = Math.floor(dFallback * (p._talent_max_draw ? 2.2 : (typeof getCritMultiplier === 'function' ? getCritMultiplier(p) : BATTLE_CONFIG.CRIT_MULTIPLIER)));
    if (bs.enemyMarked) dFallback = Math.floor(dFallback * 1.15); // Marca do Caçador
    bs.enemyHp -= dFallback;
    appendBattleLog(`🎯 Flecha Precisa: ${isCrit ? 'CRÍTICO! ' : ''}Ignora armadura! -${dFallback} HP!`, '#90d060');
    showFloatingNumber('enemy', dFallback, isCrit ? 'crit' : 'dmg');
    flashDamage('enemy'); animEnemyHit();
    result.apGain = isCrit ? 12 : 5;
  }

  else if (skillKey === 'chuva_flechas') {
    if (!formaDragaoChuva) consumeArrows(p, arrowCost, helpers);
    // ── Chuva Mortal: 5 flechas em vez de 4 ──
    const numHits = p._talent_rain_up ? 5 : 4;
    const arrowId2 = p.equippedArrow || 'normal';
    const arrowDef2 = (typeof getArrowType === 'function') ? getArrowType(arrowId2) : null;
    const ef2 = (arrowDef2 && arrowDef2.efeitos) || {};
    const atkBonus2 = ef2.atkMod ? p.atk * ef2.atkMod : 0;
    // Fúria do Dragão: rajada carregada de fogo, um pouco mais forte
    const dragaoMult = formaDragaoChuva ? 1.15 : 1;
    // Selo da Força — bônus de 8~10% de dano bruto (Chuva de Flechas é a
    // skill de assinatura do Arqueiro para esse item). Sorteado uma vez e
    // aplicado igualmente em todos os golpes deste uso.
    const seloBonusChuva = (typeof getSeloForcaSkillBonus === 'function') ? getSeloForcaSkillBonus(p, 'chuva_flechas') : 0;
    const hits = [];
    for (let i = 0; i < numHits; i++) {
      hits.push(Math.max(1, Math.floor((p.atk + atkBonus2) * 0.65 * dragaoMult * (1 + seloBonusChuva) - e.def / 5 + Math.random() * 3)));
    }
    let total = hits.reduce((a, b) => a + b, 0);
    if (bs.enemyMarked) total = Math.floor(total * 1.15); // Marca do Caçador
    bs.enemyHp -= total;
    if (formaDragaoChuva) {
      bs.enemyBurning   = true;
      bs.enemyBurnTurns = Math.max(bs.enemyBurnTurns || 0, 3);
      appendBattleLog(`🐉🔥 Fúria do Dragão — Chuva de Fogo! ${numHits} rajadas em área! -${total} HP + 🔥 Queimadura! (sem gastar flecha)`, '#ff6a1a');
      showFloatingNumber('enemy', '🔥 QUEIMADURA', 'status');
    } else {
      appendBattleLog(`🌧️ Chuva de Flechas: ${numHits} flechas! Total ${total} HP!`, '#90d060');
    }
    // ── FX novo (arqueiro_fx): tiro pro céu + salva de flechas. Skill
    // assíncrona — o turno só segue quando a chuva termina (mesmo esquema
    // do Tiro Certeiro). Sem a função nova, cai no FX antigo logo abaixo.
    if (typeof window.playChuvaFlechasFxAsync === 'function') {
      const markMult = bs.enemyMarked ? 1.15 : 1;
      const apG = isCrit ? 12 : 5;
      if (typeof gainFervor === 'function') gainFervor(p, isCrit ? 14 : 6);
      window.playChuvaFlechasFxAsync(hits, {
        fire: formaDragaoChuva,
        onHit: (i) => { showFloatingNumber('enemy', Math.floor(hits[i] * markMult), 'dmg'); flashDamage('enemy'); },
        onDone: () => {
          p.ap = Math.min(p.maxAp, (p.ap || 0) + apG);
          appendBattleLog(`⚡ +${apG} AP (skill)!`, '#e09030');
          if (typeof updateHUD === 'function') updateHUD();
          window.finishArqueiroSniperSkill(bs, p, e, false);
        }
      });
      result.async = true;
      return result;
    }
    showFloatingNumber('enemy', total, 'dmg');
    playChuvaFlechasFx(numHits);
    flashDamage('enemy'); animEnemyHit();
    result.apGain = isCrit ? 12 : 5;
  }

  else if (skillKey === 'marca_cacador') {
    consumeArrows(p, arrowCost, helpers);
    let d = Math.max(1, Math.floor(p.atk * 0.7 - e.def / 4 + Math.random() * 4));
    if (isCrit) d = Math.floor(d * (p._talent_max_draw ? 2.2 : (typeof getCritMultiplier === 'function' ? getCritMultiplier(p) : BATTLE_CONFIG.CRIT_MULTIPLIER)));
    if (bs.enemyMarked) d = Math.floor(d * 1.15); // já marcado (refresh) — mantém o bônus vigente
    bs.enemyHp -= d;
    bs.enemyMarked    = true;
    bs.enemyMarkTurns = 3;
    appendBattleLog(`🔖 Marca do Caçador: ${isCrit ? 'CRÍTICO! ' : ''}-${d} HP! Alvo marcado — seus ataques ganham +20% de crítico e +15% de dano por 3 turnos!`, '#e0c040');
    showFloatingNumber('enemy', d, isCrit ? 'crit' : 'dmg');
    showFloatingNumber('enemy', '🔖 MARCADO', 'status');
    // ── Talento: Instinto Certeiro — Marca do Caçador também reduz 15% da DEF do alvo ──
    if (p._talent_hunter_instinct) {
      const defDownAmt = Math.floor(e.def * 0.15);
      e.def = Math.max(0, e.def - defDownAmt);
      bs._enemyDefDown      = true;
      bs._enemyDefDownTurns = 3;
      bs._enemyDefDownAmt   = defDownAmt;
      appendBattleLog(`🎯 Instinto Certeiro: DEF do alvo reduzida em 15%!`, '#c0a040');
      showFloatingNumber('enemy', '🎯 DEF-15%', 'status');
    }
    flashDamage('enemy'); animEnemyHit();
    result.apGain = isCrit ? 12 : 5;
  }

  // ── Fervor Selvagem: skills também enchem a barra (crítico enche mais) ──
  if (typeof gainFervor === 'function') gainFervor(p, isCrit ? 14 : 6);

  return result;
}

window.CLASS_ARQUEIRO = CLASS_ARQUEIRO;
window.skillArqueiro  = skillArqueiro;

// ══════════════════════════════════════════════════════════════
//  FORMAS ESPIRITUAIS (Totens elementais) — movido para o arquivo
//  próprio classes/totens.js (ponte). NÃO recoloque essa lógica
//  aqui — edite totens.js. Ele carrega depois deste arquivo e usa
//  TOTEM_TYPES, gainFervor, activateFormaEspiritual etc. de lá.
// ══════════════════════════════════════════════════════════════

