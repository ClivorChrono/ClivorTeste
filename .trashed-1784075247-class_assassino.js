// ══════════════════════════════════════════════════════════════
//  CHRONICLES OF CLIVOR — class_assassino.js
// ══════════════════════════════════════════════════════════════

'use strict';

const CLASS_ASSASSINO = {
  id: 'assassino',
  name: 'Assassino',
  role: 'VELOZ · CRÍTICO',
  icon: '🗡️',
  iconImg: 'Imagens/icones/iconassa.png',
  color: '#3a5068',
  desc: 'Especialista em golpes rápidos e críticos. Alta velocidade e dano. Usa AP acumulado em sigilo.',
  stats: { hp: 85, mp: 0, atk: 12, def: 5, spd: 15, mag: 0 },
  maxAp: 100,
  resource: 'ap',
  startWeapon: {
    id: 'adaga_sombria', name: 'Adaga Sombria', icon: '🔪',
    atk: 7, def: 0, spd: 4, mag: 0, weight: 1,
    desc: 'Adaga leve feita para golpes rápidos.'
  },
  skills: [
    {
      key: 'golpe_sombrio',
      name: 'Golpe Sombrio',
      icon: '🌑',
      ap: 20,
      desc: '1.6× ATQ. 30% chance de crítico.',
      dmg: 'assassino:golpe_sombrio',
    },
    {
      key: 'veneno_rapido',
      name: 'Veneno Rápido',
      icon: '☠️',
      ap: 15,
      desc: 'Aplica veneno. 8 dmg/turno × 4.',
      dmg: 'assassino:veneno_rapido',
    },
    {
      key: 'danca_morte',
      name: 'Dança da Morte',
      icon: '🌪️',
      ap: 40,
      desc: '3 golpes rápidos. ATQ×0.9 cada.',
      dmg: 'assassino:danca_morte',
    },
  ],
  statBars: { atk: 70, def: 30, spd: 95 },
  sprite: {
    src: 'Imagens/personagens/Assassino/assassin.png',
    totalW: 1536, bgH: 1024, posY: 339,
    cols: 3, rows: 1,
    displayH: 400,
    anims: {
      idle:    { row: 0, startCol: 0, frames: 1, fps: 2 },
      prepare: { row: 0, startCol: 1, frames: 1, fps: 4 },
      attack:  { row: 0, startCol: 1, frames: 2, fps: 8 },
      defend:  { row: 0, startCol: 2, frames: 1, fps: 2 },
      hit:     { row: 0, startCol: 0, frames: 1, fps: 2 },
      recover: { row: 0, startCol: 0, frames: 1, fps: 2 },
    }
  },
};

// ── Skills do Assassino ──
function skillAssassino(skillKey, p, e, bs, helpers) {
  const { appendBattleLog, showFloatingNumber, flashDamage, animEnemyHit, BATTLE_CONFIG } = helpers;
  const result = { skipEnemyTurn: false, enemyStunned: false, apGain: 0 };
  const isCrit = Math.random() < (BATTLE_CONFIG.CRIT_BASE_CHANCE * 1.5 + (p._enchantCrit || 0) / 100);

  if (skillKey === 'golpe_sombrio') {
    let d = Math.max(1, Math.floor(p.atk * 1.6 - e.def / 3 + Math.random() * 5));
    if (isCrit) d = Math.floor(d * BATTLE_CONFIG.CRIT_MULTIPLIER);
    bs.enemyHp -= d;
    appendBattleLog(`🌑 Golpe Sombrio: ${isCrit ? 'CRÍTICO! ' : ''}${d} HP!`, 'rgba(60,80,104,0.95)');
    showFloatingNumber('enemy', d, isCrit ? 'crit' : 'dmg');
    flashDamage('enemy'); animEnemyHit();
    if (!isCrit && Math.random() < 0.30) {
      const bonus = Math.floor(d * 0.5);
      bs.enemyHp -= bonus;
      appendBattleLog(`🌑 Golpe nas sombras! Crítico extra: -${bonus}!`, '#c0a0ff');
      showFloatingNumber('enemy', bonus, 'crit');
    }
    result.apGain = isCrit ? 12 : 5;
  }

  else if (skillKey === 'veneno_rapido') {
    const base = Math.max(1, Math.floor(p.atk * 0.6 - e.def / 4 + Math.random() * 3));
    bs.enemyHp      -= base;
    bs.enemyPoisoned    = true;
    bs.enemyPoisonTurns = 4;
    appendBattleLog(`☠️ Veneno Rápido: -${base} HP + ☠ Veneno! 8 dano/turno.`, '#60c060');
    showFloatingNumber('enemy', base, 'dmg');
    showFloatingNumber('enemy', '☠ VENENO', 'status');
    flashDamage('enemy');
    result.apGain = 5;
  }

  else if (skillKey === 'danca_morte') {
    const hits = [];
    for (let i = 0; i < 3; i++) {
      hits.push(Math.max(1, Math.floor(p.atk * 0.9 - e.def / 4 + Math.random() * 3)));
    }
    const total = hits.reduce((a, b) => a + b, 0);
    bs.enemyHp -= total;
    appendBattleLog(`🌪️ Dança da Morte: 3 golpes! -${hits.join('/-')} = ${total} HP total!`, 'rgba(60,80,104,0.95)');
    showFloatingNumber('enemy', total, 'dmg');
    flashDamage('enemy'); animEnemyHit();
    result.apGain = isCrit ? 12 : 5;
  }

  return result;
}

window.CLASS_ASSASSINO = CLASS_ASSASSINO;
window.skillAssassino  = skillAssassino;
