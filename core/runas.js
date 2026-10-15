// ══════════════════════════════════════════════════════════════
//  CHRONICLES OF CLIVOR — runas.js
//  Sistema de UI das Runas (encantamentos): badge de batalha,
//  popup de detalhes, descrição dinâmica do cajado e os helpers
//  de badge/stats usados nos painéis de item da bolsa.
//
//  Dados das runas (ENCHANT_TIERS, getEnchantTier, getEnchantBonus,
//  getEnchantDesc, enchantBadgeHTML, fusão, etc.) continuam em
//  vilarejo.js — este arquivo só cuida da exibição.
//
//  Extraído de palDinh.js para deixá-lo mais leve.
// ══════════════════════════════════════════════════════════════

'use strict';

// ── Descrição dinâmica do cajado por tier de encantamento ──
function _getCajadoDesc() {
  const enchant = G && G.player && G.player._weaponEnchant;
  const descByTier = {
    null:      'Um cajado com um cristal fraco. O mínimo para canalizar magia.',
    undefined: 'Um cajado com um cristal fraco. O mínimo para canalizar magia.',
    'D':  'O cajado respira. A runa básica estabiliza o fluxo arcano — menos desperdício de mana.',
    'C':  'Cinza de Clivor fundida no cristal. A luz mágica pulsa com mais intensidade.',
    'B':  'Cristal ciano brilha ao toque. O cajado amplifica feitiços além do que o corpo suporta.',
    'A':  'Escrito em runa dourada — raramente visto. O cajado parece antecipar cada feitiço.',
    'S':  'O cajado transcendeu o comum. O cristal irradia energia latente mesmo em silêncio.',
    'SS': 'Lenda entre os magos de Clivor. Dizem que o cajado pensa sozinho na batalha.',
    'SSS':'Não existe catalogado. O cajado e o portador tornaram-se a mesma coisa.',
  };
  return descByTier[enchant] || descByTier[null];
}
window._getCajadoDesc = _getCajadoDesc;

// ─────────────────────────────────────────────────────────────
//  BADGE DE RUNA — exibido no canto do herói durante batalha
// ─────────────────────────────────────────────────────────────
function updateRuneBadgeBattle() {
  const el = document.getElementById('bat-rune-badge');
  if (!el) return;
  const enchantId = G.player && G.player._weaponEnchant;
  if (!enchantId || typeof getEnchantTier !== 'function') {
    el.style.display = 'none';
    return;
  }
  const tier = getEnchantTier(enchantId);
  if (!tier) { el.style.display = 'none'; return; }

  // Monta o ícone: usa imagem da pasta Imagens/icones/
  const imgMap = {
    D:  'RuneD.png',
    C:  'RuneC.png',
    B:  'RuneB.png',
    A:  'RuneA.png',
    S:  'RuneS.png',
    'S+': 'RuneS+.png',
    SS: 'RuneSS.png',
  };
  const imgFile = imgMap[tier.id] || null;
  const imgSrc  = imgFile ? `Imagens/icones/${imgFile}` : null;

  el.style.setProperty('--rune-color', tier.color || '#9e9e9e');
  el.style.setProperty('--rune-glow',  (tier.color || '#9e9e9e') + '66');
  el.style.display = 'flex';
  el.style.flexDirection = 'column';
  el.style.alignItems = 'center';

  if (imgSrc) {
    el.innerHTML = `
      <img class="rune-icon-img" src="${imgSrc}"
           onerror="this.style.display='none';this.nextElementSibling.style.fontSize='1.4rem';"
           alt="${tier.label}">
      <span class="rune-label-small">${tier.label}</span>`;
  } else {
    el.innerHTML = `
      <span style="font-size:1.4rem;line-height:1;">✨</span>
      <span class="rune-label-small">${tier.label}</span>`;
  }
}
window.updateRuneBadgeBattle = updateRuneBadgeBattle;

function openRuneDetailPopup() {
  const enchantId = G.player && G.player._weaponEnchant;
  if (!enchantId || typeof getEnchantTier !== 'function') return;
  const tier = getEnchantTier(enchantId);
  if (!tier) return;

  const imgMap = {
    D:  'RuneD.png',
    C:  'RuneC.png',
    B:  'RuneB.png',
    A:  'RuneA.png',
    S:  'RuneS.png',
    'S+': 'RuneS+.png',
    SS: 'RuneSS.png',
  };
  const imgFile = imgMap[tier.id] || null;
  const imgSrc  = imgFile ? `Imagens/icones/${imgFile}` : '';

  // Cor do popup
  const inner = document.getElementById('rune-detail-inner');
  if (inner) {
    inner.style.setProperty('--rune-popup-color', tier.color || '#9e9e9e');
    inner.style.setProperty('--rune-popup-glow',  (tier.color || '#9e9e9e') + '44');
    inner.style.borderTopColor = tier.color || '#9e9e9e';
    inner.style.boxShadow = `0 0 30px ${(tier.color || '#9e9e9e')}33`;
  }

  // Ícone
  const iconEl = document.getElementById('rdp-icon-img');
  if (iconEl) { iconEl.src = imgSrc; iconEl.style.display = imgSrc ? 'block' : 'none'; }

  // Label
  const labelEl = document.getElementById('rdp-label');
  if (labelEl) { labelEl.textContent = tier.label; labelEl.style.color = tier.color || '#9e9e9e'; }

  // Descrição (específica para a classe do jogador)
  const desc = (typeof getEnchantDesc === 'function') ? getEnchantDesc(tier) : (tier.descDefault || '');
  const descEl = document.getElementById('rdp-desc');
  if (descEl) { descEl.textContent = desc; descEl.style.borderLeftColor = tier.color || '#9e9e9e'; }

  // Bônus
  const bonus = (typeof getEnchantBonus === 'function') ? getEnchantBonus(tier) : {};
  const parts = [];
  if (bonus.atk)  parts.push(`⚔ ATQ +${bonus.atk}`);
  if (bonus.def)  parts.push(`🛡 DEF +${bonus.def}`);
  if (bonus.mag)  parts.push(`✨ MAG +${bonus.mag}`);
  if (bonus.hp)   parts.push(`❤ HP +${bonus.hp}`);
  if (bonus.mp)   parts.push(`💙 MP +${bonus.mp}`);
  if (bonus.crit) parts.push(`🎯 Crit +${bonus.crit}%`);
  if (bonus._enchantMagPen)  parts.push(`🔮 Penetração Mágica +${Math.round(bonus._enchantMagPen*100)}%`);
  if (bonus._enchantManaEcho) parts.push(`🌀 Eco Arcano ${Math.round(bonus._enchantManaEcho*100)}% (chance de não gastar MP)`);
  if (bonus._enchantRegen)   parts.push(`♻ Regeneração por turno`);
  if (bonus._enchantBarrierChance) parts.push(`🛡 Bênção do Abismo ${Math.round(bonus._enchantBarrierChance*100)}% (chance de anular dano)`);
  if (bonus._enchantShadowMarkEnabled) parts.push(`🌑 Marca das Sombras ativa`);
  const bonusEl = document.getElementById('rdp-bonus');
  if (bonusEl) bonusEl.innerHTML = parts.length ? parts.join(' &nbsp;·&nbsp; ') : '';

  // Flavor
  const flavorEl = document.getElementById('rdp-flavor');
  if (flavorEl) flavorEl.textContent = tier.flavor || '';

  const popup = document.getElementById('rune-detail-popup');
  if (popup) popup.classList.add('active');
}
window.openRuneDetailPopup = openRuneDetailPopup;

function closeRuneDetailPopup() {
  const popup = document.getElementById('rune-detail-popup');
  if (popup) popup.classList.remove('active');
}
window.closeRuneDetailPopup = closeRuneDetailPopup;

// ─────────────────────────────────────────────────────────────
//  HELPERS PARA OS PAINÉIS DE ITEM (bag detail + popup de uso)
//  Usados por palDinh.js em showDetail() e showItemPopup() pra
//  não duplicar a lógica de badge/stats da runa em cada lugar.
// ─────────────────────────────────────────────────────────────

// Retorna o id da runa ativa, se o item for a arma equipada com runa.
function _getActiveRuneId(item) {
  const isWeaponSlot = item.equipSlot === 'weapon' || item.equipSlot === 'arma';
  return (isWeaponSlot && item.equipped) ? (G.player && G.player._weaponEnchant) : null;
}
window._getActiveRuneId = _getActiveRuneId;

// Badge clicável da runa — toca pra abrir o popup de detalhes (mesmo da batalha).
function buildRuneBadgeHTML(item) {
  const enchantId = _getActiveRuneId(item);
  if (!enchantId || typeof getEnchantTier !== 'function') return '';
  const tier = getEnchantTier(enchantId);
  if (!tier) return '';
  return `<span style="margin-left:5px;vertical-align:middle;cursor:pointer;" onclick="event.stopPropagation();openRuneDetailPopup()" title="Ver detalhes da Runa">${enchantBadgeHTML(enchantId)}</span>`;
}
window.buildRuneBadgeHTML = buildRuneBadgeHTML;

// Pills com os bônus de stats da runa ativa (ATQ/DEF/MAG/HP/MP/Crítico).
function buildRuneStatsHTML(item) {
  const enchantId = _getActiveRuneId(item);
  if (!enchantId || typeof getEnchantTier !== 'function') return '';
  const tier = getEnchantTier(enchantId);
  if (!tier || typeof getEnchantBonus !== 'function') return '';
  const rb = getEnchantBonus(tier);
  const parts = [];
  if (rb.atk)  parts.push(`ATQ +${rb.atk}`);
  if (rb.def)  parts.push(`DEF +${rb.def}`);
  if (rb.mag)  parts.push(`MAG +${rb.mag}`);
  if (rb.hp)   parts.push(`HP +${rb.hp}`);
  if (rb.mp)   parts.push(`MP +${rb.mp}`);
  if (rb.crit) parts.push(`Crítico +${rb.crit}%`);
  if (!parts.length) return '';
  return `<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:5px;justify-content:center;">
    ${parts.map(s=>`<span style="font-size:0.65rem;font-family:'Noto Sans JP',sans-serif;background:rgba(40,120,220,0.12);border:1px solid rgba(80,160,255,0.35);padding:2px 8px;color:#7ab8ff;">✨ ${s}</span>`).join('')}
  </div>`;
}
window.buildRuneStatsHTML = buildRuneStatsHTML;
