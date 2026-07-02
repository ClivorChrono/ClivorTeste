// ══════════════════════════════════════════════════════════════
//  CHRONICLES OF CLIVOR — class_mago.js
// ══════════════════════════════════════════════════════════════

'use strict';

const CLASS_MAGO = {
  id: 'mago',
  name: 'Mago',
  role: 'MÁGICO · PODEROSO',
  icon: '🔮',
  iconImg: 'Imagens/icones/iconmago.png',
  color: '#7040a0',
  desc: 'Manipula os elementos com Mana (MP). Ataques mágicos ignoram parte da defesa inimiga.',
  stats: { hp: 70, mp: 100, atk: 5, def: 3, spd: 7, mag: 18 },
  maxAp: 0,
  resource: 'mp',
  startWeapon: {
    id: 'cajado_basic', name: 'Cajado de Novato', icon: '🪄',
    atk: 0, def: 0, spd: 1, mag: 4, weight: 1,
    desc: 'Um cajado com um cristal fraco.'
  },
  skills: [
    {
      key: 'elem_fogo',
      name: 'Fogo',
      icon: '🔥',
      iconImg: 'Imagens/personagens/mago/ícones Hab/fogo.png',
      mp: 20,
      elemento: 'fogo',
      desc: 'Dano alto 2.4× MAG. Chance de Queimadura.',
      dmg: 'mago:elem_fogo',
    },
    {
      key: 'elem_agua',
      name: 'Água',
      icon: '💧',
      iconImg: 'Imagens/personagens/mago/ícones Hab/agua.png',
      mp: 15,
      elemento: 'agua',
      desc: 'Dano 1.8× MAG. Chance de Lentidão.',
      dmg: 'mago:elem_agua',
    },
    {
      key: 'elem_eletrico',
      name: 'Elétrico',
      icon: '⚡',
      iconImg: 'Imagens/personagens/mago/ícones Hab/eletrico.png',
      mp: 25,
      elemento: 'eletrico',
      desc: 'Dano 1.4× MAG. Chance de Paralisia (pula turno).',
      dmg: 'mago:elem_eletrico',
    },
  ],
  statBars: { atk: 20, def: 20, spd: 50, mag: 95 },
  // O mago usa imagens separadas, sem spritesheet.
  // Caminho dos arquivos:
  // Imagens/personagens/mago/Mago_idle_1781321199647.png
  // Imagens/personagens/mago/Mago-attack_1781321199564.png
  // Imagens/personagens/mago/Mago_tak_1781321199618.png
  sprite: {
    type: 'images',
    displayH: 160,
    images: {
      idle:    'Imagens/personagens/mago/Mago_idle_1781321199647.png',
      prepare: 'Imagens/personagens/mago/Mago-attack_1781321199564.png',
      attack:  'Imagens/personagens/mago/Mago-attack_1781321199564.png',
      tak:     'Imagens/personagens/mago/Mago_tak_1781321199618.png',
      finish:  'Imagens/personagens/mago/Mago_tak_1781321199618.png',
      defend:  'Imagens/personagens/mago/Mago_idle_1781321199647.png',
      hit:     'Imagens/personagens/mago/Mago_idle_1781321199647.png',
      hit2:    'Imagens/personagens/mago/Mago_idle_1781321199647.png',
      recover: 'Imagens/personagens/mago/Mago_idle_1781321199647.png',
    },
    attackSequence: [
      'Imagens/personagens/mago/Mago_idle_1781321199647.png',
      'Imagens/personagens/mago/Mago-attack_1781321199564.png',
      'Imagens/personagens/mago/Mago_tak_1781321199618.png',
      'Imagens/personagens/mago/Mago_idle_1781321199647.png',
    ],
    anims: {
      idle:    { frames: 1, fps: 2 },
      prepare: { frames: 1, fps: 4 },
      attack:  { frames: 1, fps: 8 },
      tak:     { frames: 1, fps: 8 },
      finish:  { frames: 1, fps: 8 },
      defend:  { frames: 1, fps: 2 },
      hit:     { frames: 1, fps: 2 },
      hit2:    { frames: 1, fps: 2 },
      recover: { frames: 1, fps: 2 },
    }
  }
};

// ── Skills do Mago ──
function skillMago(skillKey, p, e, bs, helpers) {
  const { appendBattleLog, showFloatingNumber, flashDamage, animEnemyHit, BATTLE_CONFIG } = helpers;
  const result = { skipEnemyTurn: false, enemyStunned: false, apGain: 0 };
  const isCrit = Math.random() < (BATTLE_CONFIG.CRIT_BASE_CHANCE * 1.5);

  // ── 🔥 FOGO ──
  if (skillKey === 'elem_fogo') {
    let d = Math.max(1, Math.floor(p.mag * 2.4) + Math.floor(Math.random() * 5));
    if (isCrit) d = Math.floor(d * BATTLE_CONFIG.CRIT_MULTIPLIER);
    bs.enemyHp -= d;
    const burnChance = p._talent_combustion ? 0.60 : 0.35;
    if (Math.random() < burnChance) {
      bs.enemyBurning = true; bs.enemyBurnTurns = 3;
      appendBattleLog(`🔥 Fogo: ${isCrit ? 'CRÍTICO! ' : ''}${d} dano + 🔥 Queimadura!`, '#ff6020');
      showFloatingNumber('enemy', '🔥', 'status');
    } else {
      appendBattleLog(`🔥 Fogo: ${isCrit ? 'CRÍTICO! ' : ''}${d} dano mágico!`, '#ff8040');
    }
    showFloatingNumber('enemy', d, isCrit ? 'crit' : 'dmg');
    flashDamage('enemy'); animEnemyHit();
  }

  // ── 💧 ÁGUA ──
  else if (skillKey === 'elem_agua') {
    let d = Math.max(1, Math.floor(p.mag * 1.8) + Math.floor(Math.random() * 4));
    if (isCrit) d = Math.floor(d * BATTLE_CONFIG.CRIT_MULTIPLIER);
    bs.enemyHp -= d;
    const slowChance = p._talent_void_slow ? 0.70 : 0.50;
    if (Math.random() < slowChance) {
      bs.enemySlowed = true; bs.enemySlowTurns = 3;
      appendBattleLog(`💧 Água: ${isCrit ? 'CRÍTICO! ' : ''}${d} dano + 💧 Lentidão!`, '#40a0ff');
      showFloatingNumber('enemy', '💧 LENTO', 'status');
    } else {
      appendBattleLog(`💧 Água: ${isCrit ? 'CRÍTICO! ' : ''}${d} dano mágico!`, '#60c0ff');
    }
    showFloatingNumber('enemy', d, isCrit ? 'crit' : 'dmg');
    flashDamage('enemy'); animEnemyHit();
  }

  // ── ⚡ ELÉTRICO ──
  else if (skillKey === 'elem_eletrico') {
    let d = Math.max(1, Math.floor(p.mag * 1.4) + Math.floor(Math.random() * 4));
    if (isCrit) d = Math.floor(d * BATTLE_CONFIG.CRIT_MULTIPLIER);
    bs.enemyHp -= d;
    const paraChance = p._talent_thunder_amp ? 0.45 : 0.25;
    if (Math.random() < paraChance) {
      bs.enemyStunned = true; bs.enemyStunTurns = 1;
      result.enemyStunned = true;
      result.skipEnemyTurn = true;
      appendBattleLog(`⚡ Elétrico: ${isCrit ? 'CRÍTICO! ' : ''}${d} dano + ⚡ PARALISIA!`, '#ffee40');
      showFloatingNumber('enemy', '⚡ PARALISIA', 'status');
    } else {
      appendBattleLog(`⚡ Elétrico: ${isCrit ? 'CRÍTICO! ' : ''}${d} dano mágico!`, '#ffee40');
    }
    showFloatingNumber('enemy', d, isCrit ? 'crit' : 'dmg');
    flashDamage('enemy'); animEnemyHit();
    if (p._talent_echo && Math.random() < 0.40) {
      const eco = Math.max(1, Math.floor(p.mag * 0.8));
      bs.enemyHp -= eco;
      appendBattleLog(`👻 Eco Espectral! +${eco} dano extra!`, '#c0c0ff');
      showFloatingNumber('enemy', eco, 'dmg');
    }
  }

  return result;
}

window.CLASS_MAGO = CLASS_MAGO;
window.skillMago  = skillMago;
