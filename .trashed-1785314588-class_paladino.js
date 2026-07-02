// ══════════════════════════════════════════════════════════════
//  CHRONICLES OF CLIVOR — class_paladino.js
// ══════════════════════════════════════════════════════════════

'use strict';

const CLASS_PALADINO = {
  id: 'paladino',
  name: 'Paladino',
  role: 'TANQUE · SUPORTE',
  icon: '🛡️',
  iconImg: 'Imagens/icones/palaicon.png',
  color: '#c8960a',
  desc: 'Guerreiro sagrado da Divina Trindade. Alta resistência e cura em combate. Escudo Divino absorve grande dano.',
  stats: { hp: 115, mp: 0, atk: 11, def: 12, spd: 5, mag: 0 },
  maxAp: 100,
  resource: 'ap',
  startWeapon: {
    id: 'maca_sagrada', name: 'Maça Sagrada',
    imgSrc: 'Imagens/personagens/paladino/Martelo.png', icon: '🔨',
    atk: 6, def: 3, spd: 0, mag: 0, weight: 3,
    desc: 'Maça abençoada pela Divina Trindade. Golpes pesados que ignoram parte da armadura inimiga.'
  },
  skills: [
    {
      key: 'shield',
      name: 'Escudo Divino',
      icon: '✨',
      ap: 20,
      desc: 'Reduz 80% do próximo dano recebido. Regenera 10 HP.',
      dmg: 'paladino:shield',
      isSupport: true,
    },
    {
      key: 'golpe_sagrado',
      name: 'Golpe Sagrado',
      icon: '⚡',
      ap: 22,
      desc: '1.6× ATQ + cura 18% do HP máximo.',
      dmg: 'paladino:golpe_sagrado',
    },
    {
      key: 'aura',
      name: 'Aura Protetora',
      icon: '🌟',
      ap: 35,
      desc: 'Cura 30% HP + DEF +6 por 3 turnos.',
      dmg: 'paladino:aura',
      isSupport: true,
    },
    // ── Skills de Level 5 (apenas uma é desbloqueada via escolha) ──
    {
      key: 'julgamento_divino',
      name: 'Julgamento Divino',
      icon: '⚖️',
      iconImg: 'Imagens/personagens/paladino/Picsart_26-06-29_03-23-29-931.png',
      ap: 100,
      desc: 'Concentra toda sua defesa em um único golpe. Dano = 200% DEF + 120% ATQ. Após: +50% DEF como escudo por 2 turnos.',
      dmg: 'paladino:julgamento_divino',
      lv5Choice: true,
    },
    {
      key: 'fe_absoluta',
      name: 'Fé Absoluta',
      icon: '🙏',
      iconImg: 'Imagens/personagens/paladino/Picsart_26-06-29_03-35-49-266.png',
      ap: 0,
      desc: 'Passiva — Quanto menor seu HP, maior sua resistência. <50% HP: -15% dano. <30%: -30% dano. <15%: próximo golpe +50% dano.',
      dmg: 'paladino:fe_absoluta',
      isPassive: true,
      lv5Choice: true,
    },
  ],
  statBars: { atk: 60, def: 95, spd: 28 },

  // ── Sistema de imagens separadas por estado ──
  // Imagem 2 (escudo) = base/idle/defesa
  // Imagem 1 (martelo erguido) = ataque
  // Imagem 3 (martelo balançando) = prepare/golpe_sagrado/recover
  sprite: {
    type: 'images',
    displayH: 220,
    images: {
      idle:     'Imagens/personagens/paladino/file_0000000036dc71f5af95fbaae41f5fdb.png',
      defend:   'Imagens/personagens/paladino/file_0000000036dc71f5af95fbaae41f5fdb.png',
      hit:      'Imagens/personagens/paladino/file_0000000036dc71f5af95fbaae41f5fdb.png',
      tak:      'Imagens/personagens/paladino/file_0000000036dc71f5af95fbaae41f5fdb.png',
      prepare:  'Imagens/personagens/paladino/file_000000000c2471f59ab7d0f4a9bb4b80.png',
      recover:  'Imagens/personagens/paladino/file_000000000c2471f59ab7d0f4a9bb4b80.png',
      recover2: 'Imagens/personagens/paladino/file_000000000c2471f59ab7d0f4a9bb4b80.png',
      attack:   'Imagens/personagens/paladino/file_00000000ca98720e8e108d0c1618b2ed.png',
    }
  },
};

// ── Skills do Paladino ──
function skillPaladino(skillKey, p, e, bs, helpers) {
  const { appendBattleLog, showFloatingNumber, flashDamage, animEnemyHit, BATTLE_CONFIG, showShieldEffect, showGolpeSagradoEffect } = helpers;
  const result = { skipEnemyTurn: false, enemyStunned: false, apGain: 0 };
  const isCrit = Math.random() < (BATTLE_CONFIG.CRIT_BASE_CHANCE * 1.5);

  if (skillKey === 'shield') {
    bs.defending     = true;
    bs._shieldActive = true;
    const heal = 10;
    p.hp = Math.min(p.maxHp, p.hp + heal);
    appendBattleLog(`✨ Escudo Divino: Sagrado! -80% próximo dano + ${heal} HP recuperados!`, '#d0d0ff');
    showFloatingNumber('hero', heal, 'heal');
    showFloatingNumber('hero', 'ESCUDO 🛡', 'buff');
    showShieldEffect();
  }

  else if (skillKey === 'golpe_sagrado') {
    let d = Math.max(1, Math.floor(p.atk * 1.6 - e.def / 4 + Math.random() * 6));
    if (bs.enemyEnraged) d = Math.floor(d * 0.9);
    if (bs._cursed && bs._cursedTurns > 0) d = Math.floor(d * 1.15);
    if (isCrit) d = Math.floor(d * BATTLE_CONFIG.CRIT_MULTIPLIER);
    bs.enemyHp -= d;
    if (p._talent_curse) { bs._cursed = true; bs._cursedTurns = 2; }
    if (p._talent_dark_paladin) {
      bs.enemyPoisoned = true; bs.enemyPoisonTurns = 4;
      bs.enemyBleeding = true; bs.enemyBleedTurns  = 3;
      appendBattleLog(`⚡ Golpe Sagrado: ${d} dano + ☠ Veneno + 🩸 Sangramento!`, '#c040c0');
      showFloatingNumber('enemy', '☠+🩸', 'status');
    } else {
      const healAmt = p._talent_holy_heal_up
        ? Math.max(20, Math.floor(p.maxHp * 0.18))
        : Math.max(10, Math.floor(p.maxHp * 0.18));
      p.hp = Math.min(p.maxHp, p.hp + healAmt);
      appendBattleLog(`⚡ Golpe Sagrado: ${isCrit ? 'CRÍTICO! ' : ''}Luz! -${d} HP + ✨ Cura ${healAmt} HP!`, '#e0d060');
      showFloatingNumber('hero', healAmt, 'heal');
    }
    showFloatingNumber('enemy', d, isCrit ? 'crit' : 'dmg');
    flashDamage('enemy'); animEnemyHit();
    if (typeof showGolpeSagradoEffect === 'function') showGolpeSagradoEffect();
    result.apGain = isCrit ? 12 : 5;
  }

  else if (skillKey === 'aura') {
    // Remove buff anterior se ainda ativo (evita stack de DEF)
    if (bs._buffDefTurns > 0 && bs._buffDefAmt > 0) {
      p.def -= bs._buffDefAmt;
      bs._buffDefAmt = 0;
      bs._buffDefTurns = 0;
    }
    const healAmt = Math.max(15, Math.floor(p.maxHp * 0.30));
    p.hp = Math.min(p.maxHp, p.hp + healAmt);
    const defBonus = 6;
    p.def          += defBonus;
    bs._buffDefAmt   = defBonus;
    bs._buffDefTurns = 2;
    appendBattleLog(`🌟 Aura Protetora: +${healAmt} HP + DEF +${defBonus} por 3 turnos!`, '#ffe080');
    showFloatingNumber('hero', healAmt, 'heal');
    showFloatingNumber('hero', `+${defBonus} DEF`, 'buff');
  }

  // ── Julgamento Divino (skill ativa de level 5) ──
  else if (skillKey === 'julgamento_divino') {
    // Dano = 200% DEF + 120% ATQ
    let d = Math.floor(p.def * 2.0 + p.atk * 1.2);
    if (isCrit) d = Math.floor(d * BATTLE_CONFIG.CRIT_MULTIPLIER);
    bs.enemyHp -= d;

    // Escudo pós-ataque: 50% DEF por 2 turnos
    const shieldAmt = Math.floor(p.def * 0.5);
    bs._julgamentoShieldAmt   = shieldAmt;
    bs._julgamentoShieldTurns = 2;

    appendBattleLog(
      `⚖️ Julgamento Divino: ${isCrit ? 'CRÍTICO! ' : ''}${d} dano sagrado! 🛡 Escudo +${shieldAmt} DEF por 2 turnos!`,
      '#f0d890'
    );
    showFloatingNumber('enemy', d, isCrit ? 'crit' : 'dmg');
    showFloatingNumber('hero', `🛡+${shieldAmt}`, 'buff');
    flashDamage('enemy'); animEnemyHit();

    // Aplica escudo como bônus de DEF temporário
    if (bs._julgShieldApplied) { p.def -= bs._julgShieldApplied; }
    p.def += shieldAmt;
    bs._julgShieldApplied = shieldAmt;

    result.apGain = isCrit ? 15 : 8;
  }

  // ── Fé Absoluta é passiva — não tem lógica ativa aqui ──
  // O efeito é aplicado em applyDmgToPlayer no palDinh.js

  return result;
}

window.CLASS_PALADINO = CLASS_PALADINO;
window.skillPaladino  = skillPaladino;
