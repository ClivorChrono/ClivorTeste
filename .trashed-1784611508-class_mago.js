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
    imgSrc: 'Imagens/Armas/cajado_1781493098967.png',
    atk: 0, def: 0, spd: 1, mag: 4, weight: 1,
    desc: 'Um cajado com um cristal fraco.'
  },
  skills: [
    // ── Elementos Originais ──
    {
      key: 'elem_fogo',      name: 'Fogo',        icon: '🔥',  iconImg: 'Imagens/personagens/mago/ícones Hab/fogo.png',
      mp: 20, elemento: 'fogo',      desc: 'Dano alto 2.4× MAG. Chance de Queimadura por 3 turnos.',        dmg: 'mago:elem_fogo',      levelRequired: 1,
    },
    {
      key: 'elem_agua',      name: 'Água',        icon: '💧',  iconImg: 'Imagens/personagens/mago/ícones Hab/agua.png',
      mp: 15, elemento: 'agua',      desc: 'Dano 1.8× MAG. Chance de Lentidão por 3 turnos.',               dmg: 'mago:elem_agua',      levelRequired: 1,
    },
    {
      key: 'elem_eletrico',  name: 'Elétrico',    icon: '⚡',  iconImg: 'Imagens/personagens/mago/ícones Hab/eletrico.png',
      mp: 25, elemento: 'eletrico',  desc: 'Dano 1.4× MAG. Chance de Paralisia (pula turno inimigo).',      dmg: 'mago:elem_eletrico',  levelRequired: 1,
    },
    {
      key: 'elem_gelo',      name: 'Gelo',        icon: '❄️',  iconImg: 'Imagens/personagens/mago/ícones Hab/Egelo.png',
      mp: 22, elemento: 'gelo',      desc: 'Dano 1.6× MAG. Chance de Congelar inimigo por 2 turnos.',       dmg: 'mago:elem_gelo',      levelRequired: 4,
    },
    {
      key: 'elem_planta',    name: 'Planta',      icon: '🌿',  iconImg: 'Imagens/personagens/mago/ícones Hab/EPlanta.png',
      mp: 18, elemento: 'planta',    desc: 'Dano 1.2× MAG. Aplica Enraizamento: inimigo não pode fugir.',   dmg: 'mago:elem_planta',    levelRequired: 6,
    },
    {
      key: 'elem_terra',     name: 'Terra',       icon: '🪨',  iconImg: 'Imagens/personagens/mago/ícones Hab/ETerra.png',
      mp: 20, elemento: 'terra',     desc: 'Dano 1.5× MAG. Reduz DEF do inimigo por 2 turnos.',             dmg: 'mago:elem_terra',     levelRequired: 8,
    },
    {
      key: 'elem_energia',   name: 'Energia',     icon: '✨',  iconImg: 'Imagens/personagens/mago/ícones Hab/EENERGIA.png',
      mp: 28, elemento: 'energia',   desc: 'Dano 1.3× MAG. Ignora 50% da DEF mágica do inimigo.',           dmg: 'mago:elem_energia',   levelRequired: 10,
    },
    // ── Novos Elementos ──
    {
      key: 'elem_magia_negra', name: 'Magia Negra', icon: '🌑', iconImg: 'Imagens/personagens/mago/ícones Hab/EmagiaN.png',
      mp: 30, elemento: 'magia_negra', desc: 'Dano 2.0× MAG. Drena HP do inimigo e cura o Mago. Aplica Maldição.', dmg: 'mago:elem_magia_negra', levelRequired: 13,
    },
    {
      key: 'elem_vento',     name: 'Vento',       icon: '🌪️', iconImg: 'Imagens/personagens/mago/ícones Hab/Evento.png',
      mp: 16, elemento: 'vento',     desc: 'Dano 1.3× MAG. Aumenta esquiva. Chance de o inimigo errar próximo ataque.', dmg: 'mago:elem_vento', levelRequired: 15,
    },
    {
      key: 'elem_caos',      name: 'Caos',        icon: '🌀',  iconImg: 'Imagens/personagens/mago/ícones Hab/Ecaos.png',
      mp: 35, elemento: 'caos',      desc: 'Dano 1.0–4.0× MAG aleatório. Efeito imprevisível a cada uso.',  dmg: 'mago:elem_caos',      levelRequired: 18,
    },
    {
      key: 'elem_veneno',    name: 'Veneno',      icon: '☠️',  iconImg: 'Imagens/personagens/mago/ícones Hab/Veneno.png',
      mp: 18, elemento: 'veneno',    desc: 'Dano 1.1× MAG. Aplica Veneno Profundo: 5 turnos de dano corrosivo.', dmg: 'mago:elem_veneno', levelRequired: 20,
    },
    {
      key: 'elem_luz',       name: 'Luz',         icon: '☀️',  iconImg: 'Imagens/personagens/mago/ícones Hab/ELuz.png',
      mp: 24, elemento: 'luz',       desc: 'Dano 1.6× MAG sagrado. Cura 10% HP máx do Mago. Cega o inimigo.', dmg: 'mago:elem_luz',      levelRequired: 25,
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

  // ── Penetração Mágica (Runa A/S) ──
  // Reduz temporariamente a DEF do inimigo durante o feitiço
  const magPenPct = p._enchantMagPen || 0; // ex: 0.20 = ignora 20% da DEF do inimigo
  const origEnemyDef = e.def || 0;
  if (magPenPct > 0) e.def = Math.floor(origEnemyDef * (1 - magPenPct));
  const _restoreEnemyDef = () => { e.def = origEnemyDef; };

  // Cores elementais para o número de dano flutuante
  const ELEM_CORES = {
    elem_fogo:       '#ff6020',
    elem_agua:       '#40a0ff',
    elem_eletrico:   '#ffee40',
    elem_gelo:       '#a0e8ff',
    elem_planta:     '#60d060',
    elem_terra:      '#c08040',
    elem_energia:    '#e0a0ff',
    elem_magia_negra:'#9040c0',
    elem_vento:      '#80d0ff',
    elem_caos:       '#c060ff',
    elem_veneno:     '#60c060',
    elem_luz:        '#ffe060',
  };
  const elemColor = ELEM_CORES[skillKey] || null;
  // Tipo de dano: usa cor elemental se disponível
  const dmgType  = elemColor ? `elem:${elemColor}` : 'dmg';
  const critType = elemColor ? `elem:${elemColor}` : 'crit';
  // _showDmg: dano normal usa cor elemental; crit continua amarelo mas com glow colorido
  const _showDmg = (val, isCritical) => {
    if (isCritical) {
      showFloatingNumber('enemy', val, 'crit');
    } else {
      showFloatingNumber('enemy', val, dmgType);
    }
  };

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
    _showDmg(d, isCrit);
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
    _showDmg(d, isCrit);
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
    _showDmg(d, isCrit);
    flashDamage('enemy'); animEnemyHit();
    if (p._talent_echo && Math.random() < 0.40) {
      const eco = Math.max(1, Math.floor(p.mag * 0.8));
      bs.enemyHp -= eco;
      appendBattleLog(`👻 Eco Espectral! +${eco} dano extra!`, '#c0c0ff');
      showFloatingNumber('enemy', eco, 'dmg');
    }
  }

  // ── ❄️ GELO ──
  else if (skillKey === 'elem_gelo') {
    let d = Math.max(1, Math.floor(p.mag * 1.6) + Math.floor(Math.random() * 4));
    if (isCrit) d = Math.floor(d * BATTLE_CONFIG.CRIT_MULTIPLIER);
    bs.enemyHp -= d;
    if (Math.random() < 0.40) {
      bs.enemyStunned = true; bs.enemyStunTurns = 2;
      bs._enemyFrozen = true;
      result.enemyStunned = true; result.skipEnemyTurn = true;
      appendBattleLog(`❄️ Gelo: ${isCrit ? 'CRÍTICO! ' : ''}${d} dano + ❄️ CONGELADO!`, '#a0e8ff');
      showFloatingNumber('enemy', '❄️ CONGELADO', 'status');
    } else {
      appendBattleLog(`❄️ Gelo: ${isCrit ? 'CRÍTICO! ' : ''}${d} dano de frio!`, '#a0e8ff');
    }
    _showDmg(d, isCrit);
    flashDamage('enemy'); animEnemyHit();
  }

  // ── 🌿 PLANTA ──
  else if (skillKey === 'elem_planta') {
    let d = Math.max(1, Math.floor(p.mag * 1.2) + Math.floor(Math.random() * 3));
    if (isCrit) d = Math.floor(d * BATTLE_CONFIG.CRIT_MULTIPLIER);
    bs.enemyHp -= d;
    bs._enemyRooted = true; bs._enemyRootedTurns = 3;
    appendBattleLog(`🌿 Planta: ${isCrit ? 'CRÍTICO! ' : ''}${d} dano + 🌿 ENRAIZAMENTO!`, '#60d060');
    showFloatingNumber('enemy', '🌿 ENRAIZADO', 'status');
    _showDmg(d, isCrit);
    flashDamage('enemy'); animEnemyHit();
  }

  // ── 🪨 TERRA ──
  else if (skillKey === 'elem_terra') {
    let d = Math.max(1, Math.floor(p.mag * 1.5) + Math.floor(Math.random() * 4));
    if (isCrit) d = Math.floor(d * BATTLE_CONFIG.CRIT_MULTIPLIER);
    bs.enemyHp -= d;
    bs._enemyDefDown = true; bs._enemyDefDownTurns = 2; bs._enemyDefDownAmt = 3;
    appendBattleLog(`🪨 Terra: ${isCrit ? 'CRÍTICO! ' : ''}${d} dano + DEF inimigo reduzida!`, '#c08040');
    showFloatingNumber('enemy', '🪨 DEF↓', 'status');
    _showDmg(d, isCrit);
    flashDamage('enemy'); animEnemyHit();
  }

  // ── ✨ ENERGIA ──
  else if (skillKey === 'elem_energia') {
    const defIgnore = 0.5;
    let d = Math.max(1, Math.floor(p.mag * 1.3) + Math.floor(Math.random() * 4));
    if (isCrit) d = Math.floor(d * BATTLE_CONFIG.CRIT_MULTIPLIER);
    bs.enemyHp -= d;
    appendBattleLog(`✨ Energia: ${isCrit ? 'CRÍTICO! ' : ''}${d} dano arcano (ignora DEF)!`, '#e0a0ff');
    _showDmg(d, isCrit);
    flashDamage('enemy'); animEnemyHit();
  }

  // ── 🌑 MAGIA NEGRA ──
  else if (skillKey === 'elem_magia_negra') {
    let d = Math.max(1, Math.floor(p.mag * 2.0) + Math.floor(Math.random() * 5));
    if (isCrit) d = Math.floor(d * BATTLE_CONFIG.CRIT_MULTIPLIER);
    bs.enemyHp -= d;
    const drain = Math.floor(d * 0.25);
    p.hp = Math.min(p.maxHp, p.hp + drain);
    bs._cursed = true; bs._cursedTurns = 3;
    appendBattleLog(`🌑 Magia Negra: ${isCrit ? 'CRÍTICO! ' : ''}${d} dano sombrio + drenagem ${drain} HP + 💜 Maldição!`, '#9040c0');
    showFloatingNumber('enemy', '💜 MALDIÇÃO', 'status');
    showFloatingNumber('hero', drain, 'heal');
    _showDmg(d, isCrit);
    flashDamage('enemy'); animEnemyHit();
  }

  // ── 🌪️ VENTO ──
  else if (skillKey === 'elem_vento') {
    let d = Math.max(1, Math.floor(p.mag * 1.3) + Math.floor(Math.random() * 3));
    if (isCrit) d = Math.floor(d * BATTLE_CONFIG.CRIT_MULTIPLIER);
    bs.enemyHp -= d;
    bs._playerEvasion = (bs._playerEvasion || 0) + 0.25;
    bs._playerEvasionTurns = 2;
    bs._enemyMissNext = Math.random() < 0.50;
    appendBattleLog(`🌪️ Vento: ${isCrit ? 'CRÍTICO! ' : ''}${d} dano + Esquiva aumentada! ${bs._enemyMissNext ? 'Inimigo vai errar!' : ''}`, '#80d0ff');
    _showDmg(d, isCrit);
    showFloatingNumber('hero', '🌪️ EVASÃO', 'status');
    flashDamage('enemy'); animEnemyHit();
  }

  // ── 🌀 CAOS ──
  else if (skillKey === 'elem_caos') {
    const multMin = 1.0, multMax = 4.0;
    const mult = multMin + Math.random() * (multMax - multMin);
    let d = Math.max(1, Math.floor(p.mag * mult));
    if (isCrit) d = Math.floor(d * BATTLE_CONFIG.CRIT_MULTIPLIER);
    bs.enemyHp -= d;
    // Efeito aleatório
    const caosRoll = Math.random();
    let caosEfeito = '';
    if (caosRoll < 0.20) {
      bs.enemyBurning = true; bs.enemyBurnTurns = 3;
      caosEfeito = '🔥 Queimadura!';
    } else if (caosRoll < 0.40) {
      bs.enemyStunned = true; bs.enemyStunTurns = 1; result.skipEnemyTurn = true;
      caosEfeito = '⚡ Paralisia!';
    } else if (caosRoll < 0.55) {
      bs.enemyPoisoned = true; bs.enemyPoisonTurns = 4;
      caosEfeito = '☠️ Veneno!';
    } else if (caosRoll < 0.70) {
      bs.enemySlowed = true; bs.enemySlowTurns = 3;
      caosEfeito = '💧 Lentidão!';
    } else if (caosRoll < 0.82) {
      const heal = Math.floor(p.maxHp * 0.15);
      p.hp = Math.min(p.maxHp, p.hp + heal);
      showFloatingNumber('hero', heal, 'heal');
      caosEfeito = `💚 Caos cura você: +${heal} HP!`;
    } else {
      // Efeito duplo: dano extra
      const extra = Math.floor(p.mag * 1.5);
      bs.enemyHp -= extra;
      showFloatingNumber('enemy', extra, 'crit');
      caosEfeito = `💥 Explosão de Caos! +${extra} dano extra!`;
    }
    const multStr = mult.toFixed(1);
    appendBattleLog(`🌀 Caos (${multStr}×): ${isCrit ? 'CRÍTICO! ' : ''}${d} dano! ${caosEfeito}`, '#c060ff');
    _showDmg(d, isCrit);
    flashDamage('enemy'); animEnemyHit();
  }

  // ── ☠️ VENENO ──
  else if (skillKey === 'elem_veneno') {
    let d = Math.max(1, Math.floor(p.mag * 1.1) + Math.floor(Math.random() * 3));
    if (isCrit) d = Math.floor(d * BATTLE_CONFIG.CRIT_MULTIPLIER);
    bs.enemyHp -= d;
    bs.enemyPoisoned = true; bs.enemyPoisonTurns = 5;
    bs._deepPoison = true;
    appendBattleLog(`☠️ Veneno: ${isCrit ? 'CRÍTICO! ' : ''}${d} dano + ☠️ Veneno Profundo (5 turnos)!`, '#60c060');
    showFloatingNumber('enemy', '☠️ VENENO', 'status');
    _showDmg(d, isCrit);
    flashDamage('enemy'); animEnemyHit();
  }

  // ── ☀️ LUZ ──
  else if (skillKey === 'elem_luz') {
    let d = Math.max(1, Math.floor(p.mag * 1.6) + Math.floor(Math.random() * 4));
    if (isCrit) d = Math.floor(d * BATTLE_CONFIG.CRIT_MULTIPLIER);
    bs.enemyHp -= d;
    const cure = Math.floor(p.maxHp * 0.10);
    p.hp = Math.min(p.maxHp, p.hp + cure);
    bs._enemyBlinded = true; bs._enemyBlindedTurns = 2;
    appendBattleLog(`☀️ Luz: ${isCrit ? 'CRÍTICO! ' : ''}${d} dano sagrado + cura ${cure} HP + 😵 Cegueira!`, '#ffe060');
    showFloatingNumber('enemy', '😵 CEGO', 'status');
    showFloatingNumber('hero', cure, 'heal');
    _showDmg(d, isCrit);
    flashDamage('enemy'); animEnemyHit();
  }

  _restoreEnemyDef();
  return result;
}

window.CLASS_MAGO = CLASS_MAGO;
window.skillMago  = skillMago;
