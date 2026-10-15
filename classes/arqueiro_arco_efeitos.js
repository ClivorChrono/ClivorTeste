// ══════════════════════════════════════════════════════════════
//  CHRONICLES OF CLIVOR — arqueiro_arco_efeitos.js
//  Liga os efeitos do Arco Rústico (têmpera + despertar) ao combate.
//  Carregar DEPOIS de palDinh.js, class_arqueiro.js, totens.js,
//  ascensoes_armas.js e despertar_armas.js no gat-1.html.
//
//  Efeitos (todos lidos do Arco EQUIPADO, G.player.equipped.weapon):
//    fervor        (têmpera 2+) ganha mais Fervor Selvagem
//    semGasto      (têmpera 3+) chance de NÃO gastar flecha
//    dupla         (têmpera 4+) crítico no ataque básico solta 2ª flecha
//    Último Disparo (Despertar V) sobrevive 1x/batalha com 1 HP
//    Flecha do Fim  (Despertar VI) 1º crítico de cada batalha = flecha
//                   dupla garantida, e a 2ª flecha causa 100% do dano
//
//  Os efeitos NÃO somem no reset da têmpera pós-Despertar: o progresso é
//  contado em "passos" (awakenLevel * 4 + ascensionLevel).
//  Para balancear, mexa só na tabela ARCO_EFEITOS abaixo.
// ══════════════════════════════════════════════════════════════

'use strict';

(function () {
  const ARCO_EFEITOS = {
    fervor:   { passo: 2, base: 0.10, porDespertar: 0.04 },  // +10% ganho (+4% por Despertar) → VI = +34%
    semGasto: { passo: 3, base: 0.10, porDespertar: 0.03 },  // 10% (+3% por Despertar)         → VI = 28%
    dupla:    { passo: 4, base: 0.10, porDespertar: 0.04, dano: 0.60, danoFinal: 1.0 }, // → VI = 34%
    ultimoDisparoDespertar: 5,                               // Último Disparo no Despertar V
    ultimoDisparo: { apGanho: 40, fervorGanho: 100 },        // recompensa ao sobreviver (aljava enche sempre)
    flechaDoFimDespertar: 6,                                 // Flecha Dupla garantida no Despertar VI
  };

  function arcoEstado(p) {
    const w = p && p.equipped && p.equipped.weapon;
    if (!w || !w.id) return null;
    if (String(w.id).replace('arma_', '') !== 'arco_rustico') return null;
    const asc = w.ascensionLevel || 0;
    const aw  = w.awakenLevel || 0;
    const passo = aw * 4 + asc;
    const ef = (cfg) => (passo >= cfg.passo ? cfg.base + cfg.porDespertar * aw : 0);
    return {
      aw, asc, passo,
      fervor:   ef(ARCO_EFEITOS.fervor),
      semGasto: ef(ARCO_EFEITOS.semGasto),
      dupla:    ef(ARCO_EFEITOS.dupla),
      ultimo:   aw >= ARCO_EFEITOS.ultimoDisparoDespertar,
      fim:      aw >= ARCO_EFEITOS.flechaDoFimDespertar,
    };
  }
  window.arcoEstado = arcoEstado;

  // ── Fervor Selvagem: ganho maior ──
  const _origGainFervor = window.gainFervor;
  if (typeof _origGainFervor === 'function') {
    window.gainFervor = function (p, amount) {
      const st = arcoEstado(p);
      if (st && st.fervor > 0 && amount > 0) amount = Math.round(amount * (1 + st.fervor));
      return _origGainFervor.call(this, p, amount);
    };
  } else {
    console.warn('[arqueiro_arco_efeitos] gainFervor não encontrado — bônus de Fervor não aplicado.');
  }

  // ── Flecha Sombria: chance de não gastar flecha ──
  const _origConsume = window.consumeArrows;
  if (typeof _origConsume === 'function') {
    window.consumeArrows = function (p, qty) {
      const st = arcoEstado(p);
      if (st && st.semGasto > 0 && qty > 0 && Math.random() < st.semGasto) {
        if (typeof appendBattleLog === 'function') appendBattleLog('🏹 A flecha sombria atravessa o alvo — nenhuma munição gasta!', '#b58cff');
        if (typeof updateArrowHUD === 'function') { try { updateArrowHUD(p); } catch (_) {} }
        return;
      }
      return _origConsume.apply(this, arguments);
    };
  } else {
    console.warn('[arqueiro_arco_efeitos] consumeArrows não encontrado — Flecha Sombria não aplicada.');
  }

  // ── Flecha Dupla: chamada pelo ataque básico (gancho em palDinh.js) ──
  window.arcoPosAtaque = function (bs, p, e, base, isCrit) {
    try {
      if (!isCrit || !bs) return;
      const st = arcoEstado(p);
      if (!st || st.dupla <= 0) return;
      const garantida = st.fim && !bs._arcoDuplaGarantidaUsada;
      if (!garantida && Math.random() >= st.dupla) return;
      if (garantida) bs._arcoDuplaGarantidaUsada = true;
      const mult  = st.fim ? ARCO_EFEITOS.dupla.danoFinal : ARCO_EFEITOS.dupla.dano;
      const extra = Math.max(1, Math.floor(base * mult));
      bs.enemyHp -= extra;
      bs.totalDmgDealt = (bs.totalDmgDealt || 0) + extra;
      if (typeof appendBattleLog === 'function') {
        appendBattleLog(garantida
          ? `🏹🏹 FLECHA DO FIM! A segunda flecha parte junto com a primeira — -${extra} HP!`
          : `🏹🏹 Flecha Dupla! Uma segunda flecha acompanha o crítico — -${extra} HP!`, '#e8c060');
      }
      if (typeof showFloatingNumber === 'function') showFloatingNumber('enemy', extra, 'crit');
    } catch (err) {
      console.warn('[arqueiro_arco_efeitos] arcoPosAtaque:', err);
    }
  };

  // ── Último Disparo (Despertar V) ──
  const _origApplyDmg = window.applyDmgToPlayer;
  if (typeof _origApplyDmg !== 'function') {
    console.warn('[arqueiro_arco_efeitos] applyDmgToPlayer não encontrado — Último Disparo não aplicado.');
    return;
  }
  window.applyDmgToPlayer = function (dmg, bs, p, ignoresDef) {
    const st = arcoEstado(p);
    if (!st || !st.ultimo) return _origApplyDmg.apply(this, arguments);

    const r = _origApplyDmg.apply(this, arguments);

    if (bs && p.hp <= 0 && !bs._arcoUltimoDisparoUsado) {
      bs._arcoUltimoDisparoUsado = true;
      p.hp = 1;
      if (typeof getArrowsMax === 'function') p.arrows = getArrowsMax(p);
      if (typeof updateArrowHUD === 'function') { try { updateArrowHUD(p); } catch (_) {} }
      if (p.maxAp) p.ap = Math.min(p.maxAp, (p.ap || 0) + ARCO_EFEITOS.ultimoDisparo.apGanho);
      if (typeof window.gainFervor === 'function') window.gainFervor(p, ARCO_EFEITOS.ultimoDisparo.fervorGanho);
      if (typeof appendBattleLog === 'function') appendBattleLog('🏹 ÚLTIMO DISPARO! O Arco segura você em pé com 1 HP — aljava cheia e Fervor em chamas!', '#f0d890');
      if (typeof showFloatingNumber === 'function') showFloatingNumber('hero', '🏹 ÚLTIMO DISPARO', 'buff');
      if (typeof updateBattleHUD === 'function') updateBattleHUD();
      if (typeof updateHUD === 'function') updateHUD();
    }
    return r;
  };

  console.log('✓ Efeitos do Arco Rústico (arqueiro_arco_efeitos.js) carregados');
})();
