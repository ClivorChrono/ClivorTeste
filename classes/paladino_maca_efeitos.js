// ══════════════════════════════════════════════════════════════
//  CHRONICLES OF CLIVOR — paladino_maca_efeitos.js
//  Liga os efeitos da Maça Sagrada (têmpera + despertar) ao combate.
//  Carregar DEPOIS de core/palDinh.js, class_paladino.js,
//  ascensoes_armas.js e despertar_armas.js no gat-1.html.
//
//  Efeitos (todos lidos da Maça EQUIPADA, G.player.equipped.weapon):
//    maca_muralha      (têmpera 2+) reduz dano recebido
//    maca_contrapulso  (têmpera 3+) ganha AP ao ser atingido
//    maca_peso_martelo (têmpera 4+) +% de DEF usada no dano
//    Último Juramento  (Despertar V) sobrevive 1x/batalha com 1 HP
//
//  Os efeitos NÃO somem no reset da têmpera pós-Despertar: o progresso é
//  contado em "passos" (awakenLevel * 4 + ascensionLevel).
//  Para balancear, mexa só na tabela MACA_EFEITOS abaixo.
// ══════════════════════════════════════════════════════════════

'use strict';

(function () {
  const MACA_EFEITOS = {
    muralha:    { passo: 2, base: 0.06, porDespertar: 0.02 }, // -6%  (+2% por Despertar) → VI = 18%
    contrapulso:{ passo: 3, base: 4,    porDespertar: 1    }, // +4 AP (+1 por Despertar) → VI = 10
    peso:       { passo: 4, base: 0.20, porDespertar: 0.10 }, // +20% (+10% por Despertar) → VI = 80%
    juramentoDespertar: 5,                                    // Último Juramento no Despertar V
  };

  function macaEstado(p) {
    const w = p && p.equipped && p.equipped.weapon;
    if (!w || !w.id) return null;
    if (String(w.id).replace('arma_', '') !== 'maca_sagrada') return null;
    const asc = w.ascensionLevel || 0;
    const aw  = w.awakenLevel || 0;
    const passo = aw * 4 + asc;
    return {
      aw, asc, passo,
      muralha:     passo >= MACA_EFEITOS.muralha.passo     ? MACA_EFEITOS.muralha.base     + MACA_EFEITOS.muralha.porDespertar * aw : 0,
      contrapulso: passo >= MACA_EFEITOS.contrapulso.passo ? MACA_EFEITOS.contrapulso.base + MACA_EFEITOS.contrapulso.porDespertar * aw : 0,
      peso:        passo >= MACA_EFEITOS.peso.passo        ? MACA_EFEITOS.peso.base        + MACA_EFEITOS.peso.porDespertar * aw : 0,
      juramento:   aw >= MACA_EFEITOS.juramentoDespertar,
    };
  }
  window.macaEstado = macaEstado;

  // Multiplicador da DEF usada no dano (1 = sem Maça/sem efeito)
  function macaDanoMult(p) {
    const st = macaEstado(p);
    return st ? 1 + st.peso : 1;
  }
  window.macaDanoMult = macaDanoMult;

  // ── Peso do Martelo no ataque básico e no Golpe Sagrado ──
  // Os dois usam (p.atk + palDefParaAtq(p)); aumentar o retorno de
  // palDefParaAtq equivale a usar DEF * mult como ATQ efetivo.
  const _origPalDefParaAtq = window.palDefParaAtq;
  if (typeof _origPalDefParaAtq === 'function') {
    window.palDefParaAtq = function (p) {
      const mult = macaDanoMult(p);
      if (mult === 1) return _origPalDefParaAtq(p);
      return Math.max(0, Math.floor((p.def || 0) * mult - (p.atk || 0)));
    };
  } else {
    console.warn('[paladino_maca_efeitos] palDefParaAtq não encontrado — Peso do Martelo só vale no Julgamento.');
  }

  // ── Muralha de Aço, Contra-Pulso e Último Juramento ──
  const _origApplyDmg = window.applyDmgToPlayer;
  if (typeof _origApplyDmg !== 'function') {
    console.warn('[paladino_maca_efeitos] applyDmgToPlayer não encontrado — efeitos defensivos não aplicados.');
    return;
  }

  window.applyDmgToPlayer = function (dmg, bs, p, ignoresDef) {
    const st = macaEstado(p);
    if (!st) return _origApplyDmg.apply(this, arguments);

    // Muralha de Aço: reduz o dano antes de tudo
    let dano = dmg;
    if (dano > 0 && st.muralha > 0) {
      dano = Math.max(1, Math.floor(dano * (1 - st.muralha)));
    }

    const r = _origApplyDmg.call(this, dano, bs, p, ignoresDef);

    // Último Juramento: golpe que mataria deixa 1 HP + Escudo Divino (1x por batalha)
    if (st.juramento && bs && p.hp <= 0 && !bs._macaJuramentoUsado) {
      bs._macaJuramentoUsado = true;
      p.hp = 1;
      bs._shieldActive = true;
      bs._shieldTurns  = 3;
      if (typeof appendBattleLog === 'function') appendBattleLog('⚖️ ÚLTIMO JURAMENTO! A Maça segura você em pé com 1 HP — Escudo Divino ativo!', '#f0d890');
      if (typeof showFloatingNumber === 'function') showFloatingNumber('hero', '⚖️ JURAMENTO', 'buff');
      if (typeof showShieldEffect === 'function') showShieldEffect();
      if (typeof updateBattleHUD === 'function') updateBattleHUD();
      if (typeof updateHUD === 'function') updateHUD();
    }

    // Contra-Pulso: ganha AP quando leva dano e continua de pé
    if (dano > 0 && st.contrapulso > 0 && p.hp > 0 && p.maxAp) {
      p.ap = Math.min(p.maxAp, (p.ap || 0) + st.contrapulso);
      if (typeof updateBattleHUD === 'function') updateBattleHUD();
    }
    return r;
  };

  console.log('✓ Efeitos da Maça Sagrada (paladino_maca_efeitos.js) carregados');
})();
