// ══════════════════════════════════════════════════════════════
//  CHRONICLES OF CLIVOR — selos_mago_novos.js
//  2 novos Selos pensados pra cobrir o buraco de suporte que o
//  Mago tem hoje entre os Selos existentes (ver handoff: Inn/
//  Indê/Limiar só disparam em ataque básico, Vale usa p.atk que
//  o Mago não escala, Ancorado exige DEF que o Mago não tem).
//
//  Ambos determinísticos (sem rolar dado — regra fixada no
//  projeto). Checam classData.resource === 'mp', não class ===
//  'mago', então qualquer classe mágica futura herda automático
//  (mesmo padrão já usado em selos_arcanos.js).
//
//  Regra do projeto: nunca editar palDinh.js/classes_new.js
//  diretamente. Este arquivo só faz Object.assign no ITEM_DB e
//  "embrulha" (rewrap) 2 funções já existentes, chamando a
//  original por dentro.
//
//  Precisa carregar DEPOIS de palDinh.js E de classes_new.js no
//  gat-1.html (ambos precisam já existir: ITEM_DB pra receber os
//  itens novos, window.executeClassSkill pra ser embrulhada).
//
//  ── Selo da Convicção Arcana ──
//  Quanto menor seu HP (abaixo de 50%), maior o dano das suas
//  skills mágicas — até +30% de dano bruto com o HP no limite.
//  Escala linear entre 50% e 0% de HP. Complementa o buraco do
//  Selo do Vale pro Mago sem reduzir HP máximo artificialmente —
//  só recompensa o risco que a luta já está impondo.
//
//  ── Selo do Fluxo Arcano ──
//  Cada skill mágica lançada em sequência (sem intercalar ataque
//  básico) aumenta o dano da PRÓXIMA em +5%, acumulando até +20%
//  (4 lançamentos seguidos). Usar ataque básico zera a sequência.
//  Pensado pro Mago que joga majoritariamente de skill — o oposto
//  do problema que os selos condicionais legados têm.
//
//  Ambos ainda SEM receita de craft/drop configurada — mesmo
//  buraco de distribuição que os 6 Selos "soltos" antigos (ver
//  pendência 1 do handoff). Item funcional, falta forma de chegar
//  ao jogador.
// ══════════════════════════════════════════════════════════════

'use strict';

// ── 1) Novos itens no ITEM_DB ──
if (typeof ITEM_DB === 'undefined') {
  console.error('[selos_mago_novos] ITEM_DB não existe — carregue este arquivo DEPOIS de palDinh.js.');
} else {
  Object.assign(ITEM_DB, {
    selo_convicao_arcana: {
      name: 'Selo da Convicção Arcana', icon: '🔥',
      imgSrc: 'Imagens/icones/selos/selo_convicao_arcana.png',
      type: 'equipamento', equipSlot: 'armadura', isStickyRune: true, isSelo: true,
      bonusMaxDmgPct: 0.30, hpLimiarPct: 0.5,
      desc: 'Selo que se alimenta do desespero do combate. Uma vez equipado no slot de Selo, permanece ativo com qualquer armadura, até você mesmo decidir desequipá-lo. Sempre que seu HP estiver abaixo de 50%, suas skills mágicas causam dano extra — quanto mais perto da morte, maior o bônus, até +30% de dano bruto com o HP no limite.',
      weight: 0.1,
    },
    selo_fluxo_arcano: {
      name: 'Selo do Fluxo Arcano', icon: '🌀',
      imgSrc: 'Imagens/icones/selos/selo_fluxo_arcano.png',
      type: 'equipamento', equipSlot: 'armadura', isStickyRune: true, isSelo: true,
      bonusPorStack: 0.05, maxStacks: 4,
      desc: 'Selo que ressoa mais forte quanto mais fundo você mergulha no fluxo mágico. Uma vez equipado no slot de Selo, permanece ativo com qualquer armadura, até você mesmo decidir desequipá-lo. Cada skill mágica lançada em sequência (sem intercalar ataque básico) aumenta o dano da próxima em +5%, acumulando até +20% após 4 lançamentos seguidos. Usar ataque básico zera a sequência.',
      weight: 0.1,
    },
  });
}

// ── 2) Dano: embrulha window.executeClassSkill (definida em
//    classes_new.js, chamada de dentro de executeSkill() em
//    palDinh.js). Aplica o bônus DEPOIS do dano original já
//    calculado — mesmo ponto onde o bônus do Caldeirão de Alberon
//    é aplicado em executeSkill(), então é seguro empilhar aqui. ──
(function () {
  if (typeof window.executeClassSkill !== 'function') {
    console.warn('[selos_mago_novos] window.executeClassSkill ainda não existe — bônus de dano não aplicado. Confira a ordem dos <script> no gat-1.html.');
    return;
  }

  const _origExecuteClassSkill = window.executeClassSkill;

  window.executeClassSkill = function (sk, p, e, bs, helpers) {
    const result = _origExecuteClassSkill(sk, p, e, bs, helpers);

    const isMpClass = !!(p && p.classData && p.classData.resource === 'mp');
    if (!isMpClass || !result || !(result.dmgDealt > 0)) return result;

    const selos = (p.selosEquipados || []);
    let dmgExtra = 0;

    // ── Selo da Convicção Arcana ──
    if (selos.some(s => s.id === 'selo_convicao_arcana') && p.maxHp > 0) {
      const hpPct = p.hp / p.maxHp;
      const limiar = ITEM_DB.selo_convicao_arcana.hpLimiarPct || 0.5;
      if (hpPct < limiar) {
        const bonusMax = ITEM_DB.selo_convicao_arcana.bonusMaxDmgPct || 0.30;
        const bonusPct = Math.min(bonusMax, ((limiar - hpPct) / limiar) * bonusMax);
        const extra = Math.floor(result.dmgDealt * bonusPct);
        if (extra > 0) {
          dmgExtra += extra;
          appendBattleLog(`🔥 SELO DA CONVICÇÃO ARCANA! HP baixo desperta +${Math.round(bonusPct * 100)}% de dano!`, '#ff6030');
        }
      }
    }

    // ── Selo do Fluxo Arcano ──
    if (selos.some(s => s.id === 'selo_fluxo_arcano')) {
      const maxStacks = ITEM_DB.selo_fluxo_arcano.maxStacks || 4;
      const porStack = ITEM_DB.selo_fluxo_arcano.bonusPorStack || 0.05;
      const stackAtual = Math.min(maxStacks, bs._seloFluxoArcanoStack || 0);
      if (stackAtual > 0) {
        const bonusPct = stackAtual * porStack;
        const extra = Math.floor(result.dmgDealt * bonusPct);
        if (extra > 0) {
          dmgExtra += extra;
          appendBattleLog(`🌀 SELO DO FLUXO ARCANO! Sequência mágica (${stackAtual}x) concede +${Math.round(bonusPct * 100)}% de dano!`, '#40c0ff');
        }
      }
      // Incrementa a sequência (some no ataque básico — ver wrap abaixo)
      bs._seloFluxoArcanoStack = Math.min(maxStacks, stackAtual + 1);
    }

    if (dmgExtra > 0) {
      bs.enemyHp = Math.max(0, bs.enemyHp - dmgExtra);
      result.dmgDealt += dmgExtra;
      if (typeof showFloatingNumber === 'function') showFloatingNumber('enemy', dmgExtra, 'crit');
    }

    return result;
  };
})();

// ── 3) Reset da sequência do Fluxo Arcano: embrulha
//    aplicarLivroManaPassivo (definida em palDinh.js), chamada
//    UMA VEZ por turno, só dentro do branch de ataque básico do
//    doBattleAction — ponto exato pra saber "o jogador atacou no
//    básico agora", sem precisar tocar em doBattleAction. ──
(function () {
  if (typeof aplicarLivroManaPassivo !== 'function') {
    console.warn('[selos_mago_novos] aplicarLivroManaPassivo ainda não existe — reset do Fluxo Arcano não aplicado.');
    return;
  }

  const _origLivroMana = aplicarLivroManaPassivo;

  window.aplicarLivroManaPassivo = function (bs, p) {
    const isMpClass = !!(p && p.classData && p.classData.resource === 'mp');
    const temFluxo = !!(p && p.selosEquipados && p.selosEquipados.some(s => s.id === 'selo_fluxo_arcano'));
    if (isMpClass && temFluxo && bs._seloFluxoArcanoStack) {
      bs._seloFluxoArcanoStack = 0;
    }
    return _origLivroMana(bs, p);
  };
})();
