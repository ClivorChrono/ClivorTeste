// ══════════════════════════════════════════════════════════════
//  CHRONICLES OF CLIVOR — classes/runas_classe.js
//  Efeitos de batalha das Runas da Arma por classe (A → SS).
//  As tabelas (ENCHANT_TIERS) ficam em vilarejo.js; aqui só moram
//  os ganchos que o motor ainda não conhece. Mesmo esquema do
//  peitorais_classe.js: só "envolve" funções existentes.
//
//    Mago      → Ressonância   (_enchantResonance)
//    Paladino  → Retribuição   (_enchantThorns)
//    Arqueiro  → Disparo Veloz (_enchantDoubleShot)
//    Assassino → Marca Lunar   (_enchantLunarBonus — o dano extra
//                               está em class_assassino.js)
//
//  CARREGAR DEPOIS de: palDinh.js, vilarejo.js, class_mago.js,
//  class_assassino.js, assassino_lunar.js.
// ══════════════════════════════════════════════════════════════

'use strict';

function _runaCls(p) { return (p && p.classData && p.classData.id) || ''; }

// ─────────────────────────────────────────────────────────────
//  Início de batalha: guarda o inimigo e zera os contadores
// ─────────────────────────────────────────────────────────────
if (typeof startBattleReal === 'function' && !window._runasClasseBattleWrapped) {
  window._runasClasseBattleWrapped = true;
  const _origStart = startBattleReal;
  window.startBattleReal = function (enemy) {
    window._runaEnemy = enemy || null;
    const r = _origStart(enemy);
    if (typeof battleState === 'object' && battleState) {
      battleState._ressKey    = null;
      battleState._ressStacks = 0;
    }
    return r;
  };
}

// ─────────────────────────────────────────────────────────────
//  ARQUEIRO — Disparo Veloz
//  Chance de uma 2ª flecha (50% do dano) no ataque básico.
//  Roda DEPOIS do ataque original e só se ele realmente acertou
//  (HP do inimigo caiu ou o turno avançou). A 2ª flecha nunca
//  mata sozinha: deixa o inimigo com no mínimo 1 HP, porque a
//  checagem de morte do turno já passou.
// ─────────────────────────────────────────────────────────────
if (typeof doBattleAction === 'function' && !window._runaDoubleShotWrapped) {
  window._runaDoubleShotWrapped = true;
  const _origDoBattleAction = doBattleAction;
  window.doBattleAction = function (action, skillIdx) {
    const p  = G.player;
    const bs = (typeof battleState === 'object') ? battleState : null;
    const quer = action === 'attack' && bs && p && _runaCls(p) === 'arqueiro' &&
                 p._enchantDoubleShot > 0 && bs.enemyHp > 0;
    const hpAntes   = quer ? bs.enemyHp : 0;
    const turnAntes = quer ? (bs.turnCount || 0) : 0;

    const r = _origDoBattleAction(action, skillIdx);

    if (quer && bs.enemyHp > 0 &&
        (bs.enemyHp < hpAntes || (bs.turnCount || 0) > turnAntes) &&
        Math.random() < p._enchantDoubleShot) {
      const e   = window._runaEnemy || {};
      let dmg   = Math.max(1, Math.floor((p.atk - (e.def || 0) / 3) * 0.5 + Math.random() * 3));
      dmg       = Math.min(dmg, bs.enemyHp - 1);
      if (dmg > 0) {
        bs.enemyHp -= dmg;
        if (typeof appendBattleLog === 'function')
          appendBattleLog(`🏹 Disparo Veloz! Uma 2ª flecha corta o ar: -${dmg} HP!`, '#90d060');
        setTimeout(() => {
          if (typeof showFloatingNumber === 'function') showFloatingNumber('enemy', dmg, 'dmg');
          if (typeof flashDamage === 'function') flashDamage('enemy');
          if (typeof updateBattleHUD === 'function') updateBattleHUD();
        }, 350);
      }
    }
    return r;
  };
}

// ─────────────────────────────────────────────────────────────
//  PALADINO — Retribuição
//  Reflete % do dano que realmente tirou HP do jogador (depois de
//  escudo/barreira/Eco Sem Fim). Não mata: deixa 1 HP no mínimo.
// ─────────────────────────────────────────────────────────────
if (typeof applyDmgToPlayer === 'function' && !window._runaThornsWrapped) {
  window._runaThornsWrapped = true;
  const _origApply = applyDmgToPlayer;
  window.applyDmgToPlayer = function (dmg, bs, p, ignoresDef) {
    const hpAntes = p ? (p.hp || 0) : 0;
    const r = _origApply(dmg, bs, p, ignoresDef);
    if (p && bs && _runaCls(p) === 'paladino' && p._enchantThorns > 0 && bs.enemyHp > 1) {
      const sofrido = hpAntes - (p.hp || 0);
      if (sofrido > 0) {
        const refl = Math.min(Math.max(1, Math.floor(sofrido * p._enchantThorns)), bs.enemyHp - 1);
        bs.enemyHp -= refl;
        if (typeof appendBattleLog === 'function')
          appendBattleLog(`🛡️ Retribuição: ${refl} de dano volta ao inimigo!`, '#e0d0a0');
        if (typeof showFloatingNumber === 'function') showFloatingNumber('enemy', refl, 'dmg');
        if (typeof updateBattleHUD === 'function') updateBattleHUD();
      }
    }
    return r;
  };
}

// ─────────────────────────────────────────────────────────────
//  MAGO — Ressonância
//  Lançar o MESMO elemento em turnos seguidos acumula bônus de
//  dano (até 3 acúmulos). Trocar de elemento zera. O bônus é
//  somado como dano extra sobre o que o feitiço acabou de causar.
// ─────────────────────────────────────────────────────────────
if (typeof skillMago === 'function' && !window._runaResonanceWrapped) {
  window._runaResonanceWrapped = true;
  const _origSkillMago = skillMago;
  window.skillMago = function (skillKey, p, e, bs, helpers) {
    const pct   = (p && p._enchantResonance) || 0;
    const ehElem = pct > 0 && bs && typeof skillKey === 'string' && skillKey.indexOf('elem_') === 0;
    const hpAntes = ehElem ? bs.enemyHp : 0;

    const result = _origSkillMago(skillKey, p, e, bs, helpers);

    if (ehElem && !(result && result.async)) {
      const acumulos = (bs._ressKey === skillKey) ? (bs._ressStacks || 0) : 0;
      const causado  = hpAntes - bs.enemyHp;
      if (acumulos > 0 && causado > 0) {
        const extra = Math.max(1, Math.floor(causado * pct * acumulos));
        bs.enemyHp -= extra;
        if (helpers && helpers.appendBattleLog)
          helpers.appendBattleLog(`🔮 Ressonância x${acumulos}: +${extra} de dano!`, '#e0a0ff');
        if (helpers && helpers.showFloatingNumber)
          setTimeout(() => helpers.showFloatingNumber('enemy', extra, 'dmg'), 250);
      }
      bs._ressStacks = (bs._ressKey === skillKey) ? Math.min(3, (bs._ressStacks || 0) + 1) : 1;
      bs._ressKey    = skillKey;
    }
    return result;
  };
}

// ─────────────────────────────────────────────────────────────
//  MIGRAÇÃO DE SAVE (tabela de runas v2)
//  A tabela mudou (Arqueiro: ATQ menor; Assassino: Crit menor) e
//  surgiram flags novas. Quem já tem runa equipada guardou os
//  valores antigos em p.atk / p.critBonus — aqui o delta é
//  corrigido uma única vez e as flags novas são ligadas.
// ─────────────────────────────────────────────────────────────
const _RUNAS_V1 = {
  arqueiro:  { A: { atk: 9 },  S: { atk: 14 }, 'S+': { atk: 22 }, SS: { atk: 33 } },
  assassino: { S: { crit: 18 }, 'S+': { crit: 26 }, SS: { crit: 38 } },
};

function migrarRunasClasseV2(p) {
  if (!p || p._enchantTableVer >= 2) return;
  const id  = p._weaponEnchant;
  const cls = _runaCls(p);
  if (id && cls && typeof getEnchantTier === 'function') {
    const tier = getEnchantTier(id);
    const novo = tier ? getEnchantBonus(tier) : null;
    const velho = _RUNAS_V1[cls] && _RUNAS_V1[cls][id];
    if (novo && velho) {
      if (velho.atk  != null) p.atk       = Math.max(1, p.atk + ((novo.atk  || 0) - velho.atk));
      if (velho.crit != null) p.critBonus = Math.max(0, (p.critBonus || 0) + ((novo.crit || 0) - velho.crit) / 100);
    }
    if (novo && window.ENCHANT_SPECIAL_KEYS) {
      window.ENCHANT_SPECIAL_KEYS.forEach(k => { if (novo[k]) p[k] = novo[k]; });
    }
  }
  p._enchantTableVer = 2;
}
window.migrarRunasClasseV2 = migrarRunasClasseV2;

if (typeof loadGame === 'function' && !window._runasClasseLoadWrapped) {
  window._runasClasseLoadWrapped = true;
  const _origLoad = loadGame;
  window.loadGame = function () {
    const r = _origLoad.apply(this, arguments);
    try { migrarRunasClasseV2(G.player); if (typeof updateHUD === 'function') updateHUD(); }
    catch (err) { console.error('[runas_classe] migração falhou:', err); }
    return r;
  };
}
// Caso o save já esteja carregado quando este script roda
try { if (typeof G !== 'undefined' && G.player) migrarRunasClasseV2(G.player); } catch (_) {}
