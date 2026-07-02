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
  stats: { hp: 90, mp: 0, atk: 11, def: 6, spd: 11, mag: 0 },
  maxAp: 100,
  resource: 'ap',
  // ── Sistema de Flechas ──
  arrows: { max: 30, regenPerTurn: 3 },
  startWeapon: {
    id: 'arco_rustico', name: 'Arco Rústico',
    imgSrc: 'Imagens/Armas/arco.png', icon: '🏹',
    atk: 8, def: 0, spd: 3, mag: 0, weight: 2,
    desc: 'Arco de madeira simples. Alcance médio.'
  },
  skills: [
    {
      key: 'flecha_precisa',
      name: 'Flecha Precisa',
      icon: '🎯',
      ap: 18,
      arrowCost: 1,
      desc: 'Ignora 40% da DEF. ATQ×1.4. (1🏹)',
      dmg: 'arqueiro:flecha_precisa',
    },
    {
      key: 'chuva_flechas',
      name: 'Chuva de Flechas',
      icon: '🌧️',
      ap: 30,
      arrowCost: 4,
      desc: '4 flechas. ATQ×0.65 cada. (4🏹)',
      dmg: 'arqueiro:chuva_flechas',
    },
    {
      key: 'flecha_fogo',
      name: 'Flecha de Fogo',
      icon: '🔥',
      ap: 25,
      arrowCost: 1,
      desc: '1.2× ATQ + queimadura 3 turnos. (1🏹)',
      dmg: 'arqueiro:flecha_fogo',
    },
  ],
  statBars: { atk: 75, def: 40, spd: 80 },
  sprite: {
    src: 'Imagens/personagens/Arqueiro/arqueiro_1780709092555.png',
    totalW: 1536, bgH: 1024, posY: 200,
    cols: 3, rows: 1,
    displayH: 480,
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

// ── Helpers de Flechas ──
function getArrows(p) {
  if (p.arrows === undefined) p.arrows = CLASS_ARQUEIRO.arrows.max;
  return p.arrows;
}
function consumeArrows(p, qty, helpers) {
  p.arrows = Math.max(0, getArrows(p) - qty);
  updateArrowHUD(p);
}
function regenArrows(p) {
  const max = (p.classData && p.classData.arrows) ? p.classData.arrows.max : 30;
  const regen = (p.classData && p.classData.arrows) ? p.classData.arrows.regenPerTurn : 3;
  p.arrows = Math.min(max, getArrows(p) + regen);
  updateArrowHUD(p);
}
function updateArrowHUD(p) {
  const el = document.getElementById('bat-hero-arrows');
  if (!el) return;
  const max = (p.classData && p.classData.arrows) ? p.classData.arrows.max : 30;
  const cur = getArrows(p);
  const color = cur <= 5 ? '#ff6040' : cur <= 10 ? '#e0a030' : '#c8a040';
  el.innerHTML = `
    <img src="Imagens/Armas/flech.png"
         style="width:38px;height:auto;object-fit:contain;vertical-align:middle;
                filter:drop-shadow(0 0 4px ${color}) brightness(1.1);
                margin-right:5px;">
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

// ── Skills do Arqueiro ──
function skillArqueiro(skillKey, p, e, bs, helpers) {
  const { appendBattleLog, showFloatingNumber, flashDamage, animEnemyHit, BATTLE_CONFIG } = helpers;
  const result = { skipEnemyTurn: false, enemyStunned: false, apGain: 0 };
  const isCrit = Math.random() < (BATTLE_CONFIG.CRIT_BASE_CHANCE * 1.5);

  // Verificar custo de flechas
  const sk = CLASS_ARQUEIRO.skills.find(s => s.key === skillKey);
  const arrowCost = sk ? (sk.arrowCost || 0) : 0;
  if (arrowCost > 0 && getArrows(p) < arrowCost) {
    appendBattleLog(`🏹 Sem flechas suficientes! (${getArrows(p)}/${arrowCost} necessárias)`, '#ff6040');
    return result;
  }

  if (skillKey === 'flecha_precisa') {
    consumeArrows(p, arrowCost, helpers);
    let d = Math.max(1, Math.floor(p.atk * 1.4 - e.def * 0.2 + Math.random() * 4));
    if (isCrit) d = Math.floor(d * BATTLE_CONFIG.CRIT_MULTIPLIER);
    bs.enemyHp -= d;
    appendBattleLog(`🎯 Flecha Precisa: ${isCrit ? 'CRÍTICO! ' : ''}Ignora armadura! -${d} HP!`, '#90d060');
    showFloatingNumber('enemy', d, isCrit ? 'crit' : 'dmg');
    flashDamage('enemy'); animEnemyHit();
    result.apGain = isCrit ? 12 : 5;
  }

  else if (skillKey === 'chuva_flechas') {
    consumeArrows(p, arrowCost, helpers);
    const hits = [];
    for (let i = 0; i < 4; i++) {
      hits.push(Math.max(1, Math.floor(p.atk * 0.65 - e.def / 5 + Math.random() * 3)));
    }
    const total = hits.reduce((a, b) => a + b, 0);
    bs.enemyHp -= total;
    appendBattleLog(`🌧️ Chuva de Flechas: 4 flechas! Total ${total} HP!`, '#90d060');
    showFloatingNumber('enemy', total, 'dmg');
    flashDamage('enemy'); animEnemyHit();
    result.apGain = isCrit ? 12 : 5;
  }

  else if (skillKey === 'flecha_fogo') {
    consumeArrows(p, arrowCost, helpers);
    let d = Math.max(1, Math.floor(p.atk * 1.2 - e.def / 3 + Math.random() * 5));
    if (isCrit) d = Math.floor(d * BATTLE_CONFIG.CRIT_MULTIPLIER);
    bs.enemyHp -= d;
    bs.enemyBurning   = true;
    bs.enemyBurnTurns = 3;
    appendBattleLog(`🔥 Flecha de Fogo: ${isCrit ? 'CRÍTICO! ' : ''}-${d} HP + 🔥 Queimadura por 3 turnos!`, '#ff8020');
    showFloatingNumber('enemy', d, isCrit ? 'crit' : 'dmg');
    showFloatingNumber('enemy', '🔥 FOGO', 'status');
    flashDamage('enemy'); animEnemyHit();
    result.apGain = isCrit ? 12 : 5;
  }

  return result;
}

window.CLASS_ARQUEIRO = CLASS_ARQUEIRO;
window.skillArqueiro  = skillArqueiro;
