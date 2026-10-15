// ══════════════════════════════════════════════════════════════
//  CHRONICLES OF CLIVOR — classes.js
//  Arquivo central: registra as classes e despacha skills.
//  Para editar uma classe, abra o arquivo individual:
//    class_paladino.js · class_mago.js
//    class_assassino.js · class_arqueiro.js
// ══════════════════════════════════════════════════════════════

'use strict';

// ── Registro central ──
const CLASSES = [
  CLASS_ASSASSINO,
  CLASS_PALADINO,
  CLASS_MAGO,
  CLASS_ARQUEIRO,
];

// ── Dispatcher de skills ──
// palDinh.js chama: executeClassSkill(sk, p, e, bs, helpers)
function executeClassSkill(sk, p, e, bs, helpers) {
  const dmg = sk.dmg || '';
  const [clsId, skillKey] = dmg.split(':');

  const dispatch = {
    assassino: window.skillAssassino,
    paladino:  window.skillPaladino,
    mago:      window.skillMago,
    arqueiro:  window.skillArqueiro,
  };

  const handler = dispatch[clsId];
  if (handler) return handler(skillKey, p, e, bs, helpers);

  // Fallback genérico
  const { appendBattleLog, showFloatingNumber, flashDamage } = helpers;
  const d = Math.max(1, p.atk - Math.floor(e.def / 2) + Math.floor(Math.random() * 4));
  bs.enemyHp -= d;
  appendBattleLog(`${sk.icon} ${sk.name}: -${d} HP!`, 'rgba(200,150,10,0.9)');
  showFloatingNumber('enemy', d, 'dmg');
  flashDamage('enemy');
  return { skipEnemyTurn: false, enemyStunned: false, apGain: 0 };
}

window.CLASSES           = CLASSES;
window.executeClassSkill = executeClassSkill;
