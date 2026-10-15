// ══════════════════════════════════════════════════════════════
//  CHRONICLES OF CLIVOR — mundial_armor.js
//  Recompensa por completar (resgatar) TODAS as missões do Quadro
//  de Quests num mesmo ciclo: a Mundial Armor.
//
//  O item em si (DEF/HP fixos) está no ITEM_DB, em palDinh.js.
//  Aqui ficam: o desbloqueio (gancho no QuestBoard.claim) e o
//  efeito passivo único de cada classe, que os outros arquivos
//  (talent_system.js, class_arqueiro.js, assassino_lunar.js,
//  palDinh.js) consultam através das funções abaixo.
// ══════════════════════════════════════════════════════════════

'use strict';

// ── A Mundial Armor está equipada agora? ──
function hasMundialArmor() {
  return !!(G.player && G.player._mundialArmorEquipped);
}
window.hasMundialArmor = hasMundialArmor;

// ── Descrição dinâmica do item, mostrando o bônus da classe atual ──
function _getMundialArmorDesc() {
  const base = 'Peitoral forjado para quem provou seu valor em cada contrato do Vilarejo. ';
  const clsId = G.player && G.player.classData && G.player.classData.id;
  const porClasse = {
    paladino: 'Em quem carrega a fé do Paladino, suas auras pedem 10% menos AP — e sua devoção ecoa: parte do excesso de DEF vira força nos golpes.',
    mago:     'Na mão de um Mago, as fusões elementais custam 15% menos MP.',
    assassino:'Sobre um Assassino, a barra da Fase da Lua ativa enche 8% mais rápido.',
    arqueiro: 'No Arqueiro, a aljava ganha +5 flechas máximas e regenera +1 por turno.',
  };
  return base + (porClasse[clsId] || 'Pulsa de um jeito diferente para cada guerreiro que a veste.');
}
window._getMundialArmorDesc = _getMundialArmorDesc;

// ── Verifica se o Quadro de Quests foi 100% resgatado; se sim e ainda não
//    foi concedida, dá a Mundial Armor (uma única vez na vida do save). ──
function checkMundialArmorUnlock() {
  if (!G.questBoard || !G.player) return;
  if (G.player._mundialArmorUnlocked) return;
  const quests = G.questBoard.quests || [];
  if (!quests.length || !quests.every(q => q.claimed)) return;

  G.player._mundialArmorUnlocked = true;
  if (typeof addItem === 'function') addItem({ id: 'mundial_armor' }, 1);
  if (typeof notify === 'function') notify('🛡️ Quadro de Quests completo! Você recebeu a Mundial Armor!', 'gold');
  if (typeof addLog === 'function') addLog('Completou todas as missões do Quadro de Quests e recebeu a Mundial Armor.', 'xp');
}
window.checkMundialArmorUnlock = checkMundialArmorUnlock;

// ─────────────────────────────────────────────────────────────
//  BÔNUS POR CLASSE (toda a "força" do item mora aqui — pra
//  ajustar números, mexe só neste arquivo)
// ─────────────────────────────────────────────────────────────

// Paladino — % de desconto de AP no custo de uma skill (só a Aura Protetora)
function mundialArmorApBonus(sk, p) {
  if (hasMundialArmor() && p && p.classData && p.classData.id === 'paladino' && sk && sk.key === 'aura') {
    return 0.10;
  }
  return 0;
}
window.mundialArmorApBonus = mundialArmorApBonus;

// Paladino — "Eco de Força": converte parte do excesso de DEF sobre ATQ em
// ATQ efetivo nas skills de dano do Paladino. Só "liga" quando DEF > ATQ
// (o caso normal do Paladino) — em qualquer outra classe/situação retorna 0,
// então não precisa de checagem extra em nenhum outro arquivo.
// Ajuste o multiplicador (0.45) aqui se quiser recalibrar o quanto ele ajuda.
function mundialArmorEcoDeForcaBonus(p) {
  if (!hasMundialArmor() || !p || !p.classData || p.classData.id !== 'paladino') return 0;
  const diff = (p.def || 0) - (p.atk || 0);
  return diff > 0 ? Math.floor(diff * 0.45) : 0;
}
window.mundialArmorEcoDeForcaBonus = mundialArmorEcoDeForcaBonus;

// Mago — % de desconto de MP no custo total de uma fusão elemental
function mundialArmorFusionDiscount(p) {
  return (hasMundialArmor() && p && p.classData && p.classData.id === 'mago') ? 0.15 : 0;
}
window.mundialArmorFusionDiscount = mundialArmorFusionDiscount;

// Assassino — multiplicador de velocidade de preenchimento da barra da Lua
function mundialArmorLuaSpeedMult(p) {
  return (hasMundialArmor() && p && p.classData && p.classData.id === 'assassino') ? 1.08 : 1;
}
window.mundialArmorLuaSpeedMult = mundialArmorLuaSpeedMult;

// Arqueiro — bônus de flechas (máximo da aljava + regeneração por turno)
function mundialArmorArrowBonus(p) {
  return (hasMundialArmor() && p && p.classData && p.classData.id === 'arqueiro')
    ? { maxBonus: 5, regenBonus: 1 }
    : { maxBonus: 0, regenBonus: 0 };
}
window.mundialArmorArrowBonus = mundialArmorArrowBonus;
