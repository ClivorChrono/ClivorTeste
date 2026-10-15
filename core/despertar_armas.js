// ══════════════════════════════════════════════════════════════════════════════
//  CHRONICLES OF CLIVOR — despertar_armas.js
//  Sistema de Despertar (Prestígio) de Armas
//  Ciclo: Têmpera 0/4 → 4/4 → Desperta → reseta Têmpera → repete até V
// ══════════════════════════════════════════════════════════════════════════════
//
//  COMO FUNCIONA (resumo):
//  - Uma arma some primeiro pela Têmpera normal (0→4), via ascensoes_armas.js.
//  - Ao chegar em 4/4, ela pode ser DESPERTADA (Despertar I, II, III, IV, V).
//  - Cada Despertar dá um bônus PERMANENTE de stats (ATK + crit%, não reseta
//    nunca) e reseta item.ascensionLevel de volta pra 0, liberando a Têmpera
//    de novo — só que agora com um multiplicador maior nos ganhos de cada
//    nível de têmpera. SEM specialEffect próprio — só stats mesmo, por
//    decisão de design (evita redundância com sistemas como o HuBi e não
//    depender de mecânicas que nem toda classe usa, tipo Escudo Divino).
//  - No Despertar V (isFinal), a arma para de resetar: fica em 4/4 pra sempre,
//    com o multiplicador máximo. É o teto ("Despertar Lendário").
//
//  ESTE ARQUIVO SÓ CUIDA DA CAMADA DE DESPERTAR.
//  A têmpera 1-4 continua sendo tratada pelo ascensoes_armas.js (WEAPON_ASCENSIONS
//  / WeaponAscension) — este módulo só entra quando ascensionLevel chega em 4.
// ══════════════════════════════════════════════════════════════════════════════

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  1. DEFINIÇÕES DE DESPERTAR POR ARMA
// ─────────────────────────────────────────────────────────────────────────────

const WEAPON_AWAKENINGS = {
  // ──────────────────────────────────────────────────────────────────────────
  //  MAÇA SAGRADA (Paladino) — DESPERTAR FOCADO EM DEF (v2)
  //  ATK = 0 (inútil pro Paladino). Cada Despertar sobe DEF + crítico e
  //  também a força dos efeitos da têmpera (ver paladino_maca_efeitos.js):
  //    Muralha de Aço  = 6% + 2% por Despertar      (VI = 18%)
  //    Contra-Pulso    = 4 AP + 1 por Despertar     (VI = 10 AP)
  //    Peso do Martelo = +20% + 10% por Despertar   (VI = +80% da DEF usada no dano)
  //  Despertar V libera o Último Juramento (1x por batalha). Despertar VI é o teto.
  // ──────────────────────────────────────────────────────────────────────────
  maca_sagrada: {
    maxCycle: 6,
    cycles: {
      1: {
        romanLabel: 'I',
        name: 'Despertar I',
        awakenBonus: { atk: 0, def: 10, critChance: 0.02 },
        temperMultiplier: 1.25,
        effectDesc: 'A Maça pulsa em dourado: DEF +10 e os efeitos da têmpera ficam mais fortes.',
        costGold: 1200,
        costItems: [{ id: 'emblema_rei_maldito', qty: 4 }],
      },
      2: {
        romanLabel: 'II',
        name: 'Despertar II',
        awakenBonus: { atk: 0, def: 14, critChance: 0.02 },
        temperMultiplier: 1.5,
        effectDesc: 'Runas antigas acordam na haste: DEF +14.',
        costGold: 2400,
        costItems: [{ id: 'osso_marionete', qty: 3 }],
      },
      3: {
        romanLabel: 'III',
        name: 'Despertar III',
        awakenBonus: { atk: 0, def: 20, critChance: 0.03 },
        temperMultiplier: 1.75,
        effectDesc: 'O brilho vira escudo: DEF +20.',
        costGold: 3900,
        costItems: [
          { id: 'eco_cristalizado', qty: 4 },
          { id: 'essencia_fantasma', qty: 2 },
        ],
      },
      4: {
        romanLabel: 'IV',
        name: 'Despertar IV',
        awakenBonus: { atk: 0, def: 28, critChance: 0.04 },
        temperMultiplier: 2.0,
        effectDesc: 'A Maça pesa como uma muralha: DEF +28.',
        costGold: 5500,
        costItems: [{ id: 'katana_muichi', qty: 5 }],
      },
      5: {
        romanLabel: 'V',
        name: 'Despertar V',
        awakenBonus: { atk: 0, def: 40, critChance: 0.05 },
        temperMultiplier: 2.5, // agora vale: o V reseta a têmpera, que sobe de novo ×2.5 até o VI
        effectDesc: 'Último Juramento: 1x por batalha, um golpe que mataria você deixa 1 HP e ativa o Escudo Divino.',
        costGold: 8000,
        costItems: [
          { id: 'essencia_lorde', qty: 8 },
          { id: 'fragmento_cristal_negro', qty: 3 },
        ],
      },
      6: {
        romanLabel: 'VI',
        name: 'Despertar VI',
        awakenBonus: { atk: 0, def: 100, critChance: 0.09 },
        temperMultiplier: 3.0, // não é usado: o VI é o teto e não reseta
        isFinal: true,
        // Skill exclusiva: Terra Fria (ver paladino_terra_fria.js). Só existe com a Maça no Despertar VI.
        effectDesc: 'Despertar Lendário: DEF +100, crítico +9% e a skill Terra Fria.',
        costGold: 12000,
        // Essência do Rei da Selva = item mais raro do jogo (2% de drop, boss com 12% de aparecer).
        // Você pediu 12; 12 seriam ~5000 caçadas em média. Está em 3 — troque o qty se quiser mais.
        costItems: [
          { id: 'essencia_rei_selva', qty: 3 },
        ],
      },
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  //  ARCO RÚSTICO (Arqueiro) — DESPERTAR FOCADO EM ATQ + CRÍTICO
  //  Mesma estrutura, custos e multiplicadores de têmpera da Maça Sagrada.
  //  Cada Despertar sobe ATQ, crítico e dano crítico, e também a força
  //  dos efeitos da têmpera (ver arqueiro_arco_efeitos.js):
  //    Fervor Selvagem  = +10% de ganho + 4% por Despertar   (VI = +34%)
  //    Flecha Sombria   = 10% de não gastar flecha + 3%/Desp. (VI = 28%)
  //    Flecha Dupla     = 10% em crítico + 4% por Despertar   (VI = 34%)
  //  Despertar V libera o Último Disparo (1x por batalha).
  //  Despertar VI é o teto: Flecha Dupla garantida no 1º crítico da batalha.
  // ──────────────────────────────────────────────────────────────────────────
  arco_rustico: {
    maxCycle: 6,
    cycles: {
      1: {
        romanLabel: 'I',
        name: 'Despertar I',
        awakenBonus: { atk: 14, critChance: 0.02 },
        temperMultiplier: 1.25,
        effectDesc: 'A corda vibra como se estivesse viva: ATQ +14 e os efeitos da têmpera ficam mais fortes.',
        costGold: 1200,
        costItems: [{ id: 'emblema_rei_maldito', qty: 4 }],
      },
      2: {
        romanLabel: 'II',
        name: 'Despertar II',
        awakenBonus: { atk: 20, critChance: 0.02 },
        temperMultiplier: 1.5,
        effectDesc: 'Runas de caça acordam na madeira: ATQ +20.',
        costGold: 2400,
        costItems: [{ id: 'osso_marionete', qty: 3 }],
      },
      3: {
        romanLabel: 'III',
        name: 'Despertar III',
        awakenBonus: { atk: 28, critChance: 0.03, critDamage: 0.05 },
        temperMultiplier: 1.75,
        effectDesc: 'A mira fica afiada: ATQ +28 e dano crítico +5%.',
        costGold: 3900,
        costItems: [
          { id: 'eco_cristalizado', qty: 4 },
          { id: 'essencia_fantasma', qty: 2 },
        ],
      },
      4: {
        romanLabel: 'IV',
        name: 'Despertar IV',
        awakenBonus: { atk: 40, critChance: 0.04, critDamage: 0.08 },
        temperMultiplier: 2.0,
        effectDesc: 'O arco canta ao ser retesado: ATQ +40 e dano crítico +8%.',
        costGold: 5500,
        costItems: [{ id: 'katana_muichi', qty: 5 }],
      },
      5: {
        romanLabel: 'V',
        name: 'Despertar V',
        awakenBonus: { atk: 56, critChance: 0.05, critDamage: 0.12 },
        temperMultiplier: 2.5, // o V reseta a têmpera, que sobe de novo ×2.5 até o VI
        effectDesc: 'Último Disparo: 1x por batalha, um golpe que mataria você deixa 1 HP, enche a aljava e o Fervor.',
        costGold: 8000,
        costItems: [
          { id: 'essencia_lorde', qty: 8 },
          { id: 'fragmento_cristal_negro', qty: 3 },
        ],
      },
      6: {
        romanLabel: 'VI',
        name: 'Despertar VI',
        awakenBonus: { atk: 160, critChance: 0.09, critDamage: 0.25 },
        temperMultiplier: 3.0, // não é usado: o VI é o teto e não reseta
        isFinal: true,
        effectDesc: 'Despertar Lendário: ATQ +160, crítico +9%, dano crítico +25% e Flecha Dupla garantida no 1º crítico de cada batalha.',
        costGold: 12000,
        costItems: [
          { id: 'essencia_rei_selva', qty: 3 },
        ],
      },
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  //  ADICIONE OUTRAS ARMAS AQUI (mesmo padrão da Maça Sagrada)
  // ──────────────────────────────────────────────────────────────────────────
};

// ─────────────────────────────────────────────────────────────────────────────
//  2. UTILITÁRIOS DE DESPERTAR
// ─────────────────────────────────────────────────────────────────────────────

const WeaponAwaken = {
  /**
   * Nível de despertar atual da arma (0 = nunca despertou, até maxCycle)
   */
  getLevel(item) {
    if (!item || !item.id) return 0;
    return item.awakenLevel || 0;
  },

  /**
   * Dados de despertar da arma no ciclo informado
   */
  getCycleData(weaponId, cycle) {
    const cfg = WEAPON_AWAKENINGS[weaponId];
    if (!cfg || !cfg.cycles[cycle]) return null;
    return cfg.cycles[cycle];
  },

  /**
   * Algarismo romano do despertar atual (usado no traço visual, canto superior esquerdo)
   * Retorna '' se a arma nunca despertou (awakenLevel 0).
   */
  getRomanLabel(item) {
    const lvl = WeaponAwaken.getLevel(item);
    if (lvl <= 0) return '';
    const weaponId = item.id.replace('arma_', '');
    const data = WeaponAwaken.getCycleData(weaponId, lvl);
    return data ? data.romanLabel : '';
  },

  /**
   * Multiplicador de têmpera vigente pro ciclo ATUAL da arma.
   * Ciclo 0 (nunca despertou) = multiplicador 1 (têmpera normal, sem bônus).
   * Usado pelo ascensoes_armas.js na hora de calcular o statBonus de cada nível de têmpera.
   */
  getTemperMultiplier(item) {
    const lvl = WeaponAwaken.getLevel(item);
    if (lvl <= 0) return 1;
    const weaponId = item.id.replace('arma_', '');
    const data = WeaponAwaken.getCycleData(weaponId, lvl);
    return data ? data.temperMultiplier : 1;
  },

  /**
   * A arma está pronta pra tentar despertar? (têmpera atual maxada em 4/4
   * e ainda não bateu no ciclo final)
   */
  isReadyToAwaken(item) {
    if (!item || !item.id) return false;
    const weaponId = item.id.replace('arma_', '');
    const cfg = WEAPON_AWAKENINGS[weaponId];
    if (!cfg) return false;

    const currentCycle = WeaponAwaken.getLevel(item);
    const lastCycleData = WeaponAwaken.getCycleData(weaponId, currentCycle);
    if (lastCycleData && lastCycleData.isFinal) return false; // já é V, não desperta mais

    return (item.ascensionLevel || 0) >= 4;
  },

  /**
   * Verifica se pode despertar agora (têmpera maxada + custo + nível do jogador)
   * @returns {Object} { canAwaken: bool, reason: string, nextCycleData }
   */
  canAwaken(item) {
    if (!WeaponAwaken.isReadyToAwaken(item)) {
      return { canAwaken: false, reason: 'Têmpera precisa estar em 4/4' };
    }

    const weaponId = item.id.replace('arma_', '');
    const nextCycle = WeaponAwaken.getLevel(item) + 1;
    const nextData = WeaponAwaken.getCycleData(weaponId, nextCycle);

    if (!nextData) {
      return { canAwaken: false, reason: 'Despertar máximo atingido' };
    }

    if (nextData.costGold) {
      if (typeof G === 'undefined' || !G.player || G.player.gold < nextData.costGold) {
        return {
          canAwaken: false,
          reason: `Faltam ${nextData.costGold - (G?.player?.gold || 0)} moedas`,
          nextCycleData: nextData,
        };
      }
    }

    if (nextData.costItems && nextData.costItems.length > 0) {
      const missing = [];
      for (const required of nextData.costItems) {
        const hasItem = typeof G !== 'undefined' && G.player && G.player.inventory.find(
          inv => inv.id === required.id && (inv.qty || 1) >= required.qty
        );
        if (!hasItem) missing.push(required);
      }
      if (missing.length > 0) {
        return {
          canAwaken: false,
          reason: 'Faltam itens',
          missingItems: missing,
          nextCycleData: nextData,
        };
      }
    }

    return { canAwaken: true, reason: 'Pronta para despertar', nextCycleData: nextData };
  },

  /**
   * Executa o Despertar: cobra custo, aplica o bônus permanente,
   * reseta a têmpera pra 0 (exceto se for o ciclo final) e sobe o awakenLevel.
   * @returns {boolean} sucesso
   */
  awakenWeapon(item) {
    const check = WeaponAwaken.canAwaken(item);
    if (!check.canAwaken) return false;

    const nextData = check.nextCycleData;

    // Deduz custos
    if (nextData.costGold > 0 && typeof G !== 'undefined' && G.player) {
      G.player.gold -= nextData.costGold;
    }
    if (nextData.costItems && nextData.costItems.length > 0 && typeof G !== 'undefined' && G.player) {
      for (const required of nextData.costItems) {
        const invItem = G.player.inventory.find(inv => inv.id === required.id);
        if (invItem) {
          invItem.qty = (invItem.qty || 1) - required.qty;
          if (invItem.qty <= 0) {
            G.player.inventory.splice(G.player.inventory.indexOf(invItem), 1);
          }
        }
      }
    }

    // Aplica bônus PERMANENTE (nunca é removido, nem em reset de têmpera)
    const bonus = nextData.awakenBonus || {};
    item.atk = (item.atk || 0) + (bonus.atk || 0);
    item.def = (item.def || 0) + (bonus.def || 0);
    item.mag = (item.mag || 0) + (bonus.mag || 0);
    // critChance de despertar é acumulativo, mesmo campo que o motor de
    // batalha já lê (critBonus) — igual ao padrão usado na têmpera (Despertar II+)
    item.critBonus = (item.critBonus || 0) + (bonus.critChance || 0);
    // VEL e dano crítico (Arqueiro). O dano crítico é lido AO VIVO do item
    // equipado (getEquippedCritDamageBonus), então só o item recebe o valor.
    item.spd = (item.spd || 0) + (bonus.spd || 0);
    item.critDamage = (item.critDamage || 0) + (bonus.critDamage || 0);

    if (item.equipped && typeof G !== 'undefined' && G.player) {
      G.player.atk = (G.player.atk || 0) + (bonus.atk || 0);
      G.player.def = (G.player.def || 0) + (bonus.def || 0);
      G.player.mag = (G.player.mag || 0) + (bonus.mag || 0);
      G.player.spd = (G.player.spd || 0) + (bonus.spd || 0);
      G.player.critBonus = (G.player.critBonus || 0) + (bonus.critChance || 0);
    }

    // Sobe o ciclo de despertar
    item.awakenLevel = (item.awakenLevel || 0) + 1;

    // Reseta a têmpera pra 0/4 — a não ser que esse despertar seja o final (V)
    if (!nextData.isFinal) {
      item.ascensionLevel = 0;
      // Nota: os statBonus da têmpera já aplicados nos níveis 1-4 anteriores
      // ficam mantidos no item (são permanentes, assim como o bônus de despertar);
      // só o CONTADOR de têmpera (ascensionLevel) volta a 0, liberando a UI
      // pra subir 1→4 de novo, agora com temperMultiplier maior.
    }

    return true;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
//  3. INTEGRAÇÃO COM ascensoes_armas.js (ainda a fazer, só comentário-guia)
// ─────────────────────────────────────────────────────────────────────────────
//
//  Pontos que vão precisar de ajuste no ascensoes_armas.js quando plugarmos:
//
//  1) WeaponAscension.canAscend() — hoje, quando ascensionLevel chega no
//     nível máximo (4), retorna "Ascensão máxima atingida". Vai precisar
//     verificar primeiro se WeaponAwaken.isReadyToAwaken(item) é true, e
//     nesse caso mostrar a opção de Despertar em vez de "máximo atingido".
//
//  2) WeaponAscension.ascendWeapon() — o statBonus de cada nível de têmpera
//     precisa ser multiplicado por WeaponAwaken.getTemperMultiplier(item)
//     antes de aplicar, pra refletir o ciclo de despertar atual.
//
//  3) ascensao_vilarejo.js (renderAscensionUI) — precisa checar
//     WeaponAwaken.isReadyToAwaken(item) quando ascensionLevel === 4 e,
//     se for o caso, trocar o card "👑 Têmpera Lendária Completa" por um
//     card de "🌟 Despertar disponível" chamando performAwaken().
//
//  4) Exibição do traço romano (I, II, III, IV, V) no canto superior
//     esquerdo da tela da arma — usa WeaponAwaken.getRomanLabel(item).
//
//  Despertar NÃO tem specialEffect próprio (decisão de design) — só ATK,
//  DEF e crit% acumulados. Os efeitos especiais continuam concentrados
//  na Têmpera (WEAPON_ASCENSIONS), como já era.
//
//  Nada disso foi alterado nos arquivos existentes ainda — este arquivo é
//  autocontido e não conflita com nada. Integração vem depois que os
//  bônus/efeitos de cada Despertar estiverem definidos.
// ─────────────────────────────────────────────────────────────────────────────

console.log('✓ Sistema de Despertar de Armas carregado (aguardando integração)');
