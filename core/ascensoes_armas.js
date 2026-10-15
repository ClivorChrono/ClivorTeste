// ══════════════════════════════════════════════════════════════════════════════
//  CHRONICLES OF CLIVOR — ascensoes_armas.js
//  Sistema de Ascensões de Armas: progressão visual + stat + efeitos especiais
// ══════════════════════════════════════════════════════════════════════════════

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  1. DEFINIÇÕES DE ASCENSÃO POR ARMA
// ─────────────────────────────────────────────────────────────────────────────

const WEAPON_ASCENSIONS = {
  // ──────────────────────────────────────────────────────────────────────────
  //  ADAGA SOMBRIA (Assassino) — SISTEMA DE TEMPERA REFORMULADO
  // ──────────────────────────────────────────────────────────────────────────
  adaga_sombria: {
    name: 'Adaga Sombria',
    baseIcon: '🔪',
    levels: {
      0: {
        // Nível base (sem Tempera)
        name: 'Adaga Sombria',
        stars: 0,
        statBonus: { atk: 0, def: 0, spd: 0 },
        effectDesc: 'Adaga leve feita para golpes rápidos.',
        borderColor: 'none',
        borderGlow: 'none',
        requirementsMet: () => true,
      },
      1: {
        // Tempera LV1 - 250 ouro
        name: 'Adaga Sombria ◆',
        stars: 1,
        statBonus: { atk: 3, def: 0, critDamage: 0.15 },
        effectDesc: 'Detalhes brilhantes aparecem na lâmina.',
        borderColor: '#4a7c8e',
        borderGlow: '0 0 8px #4a7c8e',
        costGold: 250,
        costItems: [],
        requirementsMet: () => true,
      },
      2: {
        // Tempera LV2 - 500 ouro
        name: 'Adaga Sombria ◆◆',
        stars: 2,
        statBonus: { atk: 3, def: 0, critDamage: 0.15 },
        effectDesc: 'O brilho da lâmina intensifica-se.',
        borderColor: '#6b8e99',
        borderGlow: '0 0 10px #6b8e99',
        costGold: 500,
        costItems: [],
        requirementsMet: () => true,
      },
      3: {
        // Tempera LV3 - 600 ouro
        name: 'Adaga Sombria ◆◆◆',
        stars: 3,
        statBonus: { atk: 4, def: 0, critDamage: 0.15 },
        effectDesc: 'Marcas sombrias surgem ao longo da lâmina.',
        borderColor: '#8b6f47',
        borderGlow: '0 0 12px #8b6f47',
        costGold: 600,
        costItems: [],
        requirementsMet: () => true,
      },
      4: {
        // Tempera LV4 - 400 ouro + 5 pedras
        name: 'Adaga Sombria ◆◆◆◆',
        stars: 4,
        statBonus: { atk: 5, def: 0, critDamage: 0.2 },
        effectDesc: 'Cristais sombrios cravados na lâmina aumentam seu potencial.',
        specialEffect: 'bleed_chance_5', // 5% chance de sangramento
        borderColor: '#6b3fa5',
        borderGlow: '0 0 14px #6b3fa5',
        costGold: 400,
        costItems: [
          { id: 'pedra', qty: 5 },
        ],
        requirementsMet: () => true,
      },
      5: {
        // Tempera LV5 - 500 ouro + 1 essência das sombras
        name: 'Adaga Sombria ◆◆◆◆◆',
        stars: 5,
        statBonus: { atk: 6, def: 0, critDamage: 0.25 },
        effectDesc: 'A essência sombria permeia toda a arma.',
        specialEffect: 'crit_shadow_damage', // Críticos = +50% de dano extra sombrio
        borderColor: '#4a2966',
        borderGlow: '0 0 16px #7b4db8',
        costGold: 500,
        costItems: [
          { id: 'essencia_sombras', qty: 1 },
        ],
        requirementsMet: () => true,
      },
      6: {
        // Tempera LV6 - 500 ouro + 1 essência das sombras + 4 pó de sombra
        name: 'Adaga Sombria ◆◆◆◆◆◆',
        stars: 6,
        tierLabel: 'Têmpera',
        statBonus: { atk: 7, def: 0, critDamage: 0.3 },
        effectDesc: 'Primeiro ataque após esquiva é sempre crítico.',
        specialEffect: 'crit_after_dodge', // Após dodge: próximo ataque = sempre crit
        borderColor: '#8b0000',
        borderGlow: '0 0 20px #ff4444',
        costGold: 500,
        costItems: [
          { id: 'essencia_sombras', qty: 1 },
          { id: 'po_sombra', qty: 4 },
        ],
        requirementsMet: () => true,
      },
      // ────────────────────────────────────────────────────────────────────
      //  DESPERTAR — fase seguinte à Têmpera, desbloqueada em nível alto
      // ────────────────────────────────────────────────────────────────────
      7: {
        // Despertar I - 800 ouro + 2 essência das sombras + 6 pó de sombra
        name: 'Adaga Sombria ✦',
        stars: 7,
        tierLabel: 'Despertar',
        statBonus: { atk: 8, def: 0, critDamage: 0.35 },
        effectDesc: 'A lâmina suga parte da vida inimiga em cada corte crítico.',
        specialEffect: 'crit_lifesteal_15', // Crítico cura 15% do dano causado
        borderColor: '#3d0a4f',
        borderGlow: '0 0 22px #b23fd6',
        costGold: 800,
        costItems: [
          { id: 'essencia_sombras', qty: 2 },
          { id: 'po_sombra', qty: 6 },
        ],
        requirementsMet: () => true,
      },
      8: {
        // Despertar II - 1200 ouro + 3 essência das sombras + 2 fragmento de sombra — requer nível 15+
        name: 'Adaga Sombria ✦✦',
        stars: 8,
        tierLabel: 'Despertar',
        statBonus: { atk: 9, def: 0, critDamage: 0.4, critChance: 0.08 },
        effectDesc: 'Instintos sombrios aguçam os reflexos — sua chance de crítico aumenta permanentemente.',
        borderColor: '#2d0640',
        borderGlow: '0 0 24px #d24fff',
        costGold: 1200,
        costItems: [
          { id: 'essencia_sombras', qty: 3 },
          { id: 'fragmento_sombra', qty: 2 },
        ],
        requirementsMet: () => {
          return typeof G !== 'undefined' && G.player && G.player.level >= 15;
        },
        levelRequirement: 15,
      },
      9: {
        // Despertar III - 1800 ouro + 4 essência + 3 fragmento de sombra + 1 essência fantasma — requer nível 20+
        name: 'Adaga Sombria ✦✦✦',
        stars: 9,
        tierLabel: 'Despertar',
        statBonus: { atk: 10, def: 0, critDamage: 0.45 },
        effectDesc: 'Golpes contra inimigos já feridos rasgam fundo — dano extra contra alvos abaixo de 20% de vida.',
        specialEffect: 'execute_bonus_20', // +20% de dano contra inimigos com HP < 20%
        borderColor: '#1a0330',
        borderGlow: '0 0 28px #e060ff',
        costGold: 1800,
        costItems: [
          { id: 'essencia_sombras', qty: 4 },
          { id: 'fragmento_sombra', qty: 3 },
          { id: 'essencia_fantasma', qty: 1 },
        ],
        requirementsMet: () => {
          return typeof G !== 'undefined' && G.player && G.player.level >= 20;
        },
        levelRequirement: 20,
      },
      10: {
        // Despertar IV - 2500 ouro + 5 essência + 4 fragmento de sombra + 2 essência fantasma + 1 eco cristalizado — requer nível 20+
        name: 'Adaga Sombria ✦✦✦✦',
        stars: 10,
        tierLabel: 'Despertar',
        statBonus: { atk: 12, def: 0, critDamage: 0.5 },
        effectDesc: 'A adaga desperta por completo — cada crítico rasga a sombra do alvo, causando dano sombrio devastador.',
        specialEffect: 'crit_shadow_burst', // Crítico = +75% de dano sombrio extra (substitui o efeito do LV5)
        borderColor: '#000000',
        borderGlow: '0 0 32px #ff2fd0',
        costGold: 2500,
        costItems: [
          { id: 'essencia_sombras', qty: 5 },
          { id: 'fragmento_sombra', qty: 4 },
          { id: 'essencia_fantasma', qty: 2 },
          { id: 'eco_cristalizado', qty: 1 },
        ],
        requirementsMet: () => {
          return typeof G !== 'undefined' && G.player && G.player.level >= 20;
        },
        levelRequirement: 20,
      },
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  //  MAÇA SAGRADA (Paladino) — TÊMPERA FOCADA EM DEF (v2)
  //  - ATK = 0 em tudo: o Paladino usa DEF como ATQ (palDefParaAtq), ATK é inútil.
  //  - Sem cura: HuBi já cura. Os efeitos agora são mitigação, AP e dano via DEF.
  //  - Os efeitos são lidos por paladino_maca_efeitos.js (ligados ao combate).
  //  - Custos altos de propósito (boss da masmorra 4 tem ~17k de HP).
  //  - statBonus é por nível e SOMA (3+6+9+13 = 31 DEF). Depois de cada
  //    Despertar a têmpera reseta e re-sobe multiplicada (ver despertar_armas.js).
  // ──────────────────────────────────────────────────────────────────────────
  maca_sagrada: {
    name: 'Maça Sagrada',
    baseIcon: '🔨',
    levels: {
      0: {
        name: 'Maça Sagrada',
        stars: 0,
        statBonus: { atk: 0, def: 0, spd: 0 },
        effectDesc: 'Maça abençoada pela Divina Trindade. Golpes pesados que ignoram parte da armadura inimiga.',
        borderColor: 'none',
        borderGlow: 'none',
        requirementsMet: () => true,
      },
      1: {
        name: 'Maça Sagrada ◆',
        stars: 1,
        statBonus: { atk: 0, def: 3, spd: 0 },
        effectDesc: 'Reforço de aço sagrado na cabeça da maça. DEF +3.',
        borderColor: '#4a7c8e',
        borderGlow: '0 0 8px #4a7c8e',
        costGold: 600,
        costItems: [
          { id: 'pedra', qty: 10 },
        ],
        requirementsMet: () => true,
      },
      2: {
        name: 'Maça Sagrada ◆◆',
        stars: 2,
        statBonus: { atk: 0, def: 6, spd: 0 },
        effectDesc: 'Muralha de Aço: runas de proteção reduzem 6% de todo dano recebido (+2% por Despertar).',
        specialEffect: 'maca_muralha',
        borderColor: '#8b4513',
        borderGlow: '0 0 12px #8b4513',
        costGold: 1200,
        costItems: [
          { id: 'po_cristal', qty: 8 },
          { id: 'garra_urso_pardo', qty: 3 },
        ],
        requirementsMet: () => true,
      },
      3: {
        name: 'Maça Sagrada ◆◆◆',
        stars: 3,
        statBonus: { atk: 0, def: 9, spd: 1 },
        effectDesc: 'Contra-Pulso: cada golpe que você sofre devolve +4 AP (+1 por Despertar). Julgamento Divino fica mais perto.',
        specialEffect: 'maca_contrapulso',
        borderColor: '#2d1b4e',
        borderGlow: '0 0 16px #6b2c91',
        costGold: 2000,
        costItems: [
          { id: 'garra_urso_kodiak', qty: 4 },
          { id: 'fragmento_sombra', qty: 3 },
        ],
        requirementsMet: () => true,
      },
      4: {
        name: 'Maça Sagrada ◆◆◆◆',
        stars: 4,
        statBonus: { atk: 0, def: 13, spd: 1 },
        effectDesc: 'Peso do Martelo: ataque básico, Golpe Sagrado e Julgamento Divino usam +20% de DEF (+10% por Despertar).',
        specialEffect: 'maca_peso_martelo',
        borderColor: '#8b0000',
        borderGlow: '0 0 20px #ff4444',
        costGold: 3000,
        costItems: [
          { id: 'pedra', qty: 15 },
          { id: 'essencia_sombras', qty: 2 },
        ],
        requirementsMet: () => true,
      },
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  //  CAJADO DE NOVATO (Mago)
  // ──────────────────────────────────────────────────────────────────────────
  cajado_basic: {
    name: 'Cajado de Novato',
    baseIcon: '🪄',
    levels: {
      0: {
        // Nível base (sem ascensão)
        name: 'Cajado de Novato',
        stars: 0,
        statBonus: { atk: 0, def: 0, spd: 0, mag: 0 },
        effectDesc: 'Um cajado simples com um cristal fraco.',
        borderColor: 'none',
        borderGlow: 'none',
        requirementsMet: () => true,
      },
      1: {
        // Ascensão I - Acessível com dinheiro
        name: 'Cajado de Novato ◆',
        stars: 1,
        statBonus: { atk: 0, def: 0, spd: 1, mag: 3 },
        effectDesc: 'O cristal central começa a ressoar com energia própria.',
        borderColor: '#4a7c8e',
        borderGlow: '0 0 8px #4a7c8e',
        costGold: 250,
        costItems: [],
        requirementsMet: () => true,
      },
      2: {
        // Ascensão II - Floresta + moedas
        name: 'Cajado de Novato ◆◆',
        stars: 2,
        statBonus: { atk: 0, def: 0, spd: 1, mag: 6 },
        effectDesc: 'Runas arcanas emergem na haste, ampliando o poder dos feitiços.',
        specialEffect: 'mp_restore_on_cast_5', // 5% de chance de não gastar MP ao conjurar
        borderColor: '#3a6ea5',
        borderGlow: '0 0 12px #3a6ea5',
        costGold: 500,
        costItems: [],
        requirementsMet: () => true,
      },
      3: {
        // Ascensão III - Dungeon das Sombras
        name: 'Cajado de Novato ◆◆◆',
        stars: 3,
        statBonus: { atk: 0, def: 0, spd: 2, mag: 10 },
        effectDesc: 'O cristal absorveu energia sombria da masmorra — feitiços elementais ganham potência extra.',
        specialEffect: 'elemental_dmg_boost_10', // +10% de dano em feitiços elementais
        borderColor: '#6b2c91',
        borderGlow: '0 0 16px #6b2c91',
        costGold: 600,
        costItems: [],
        requirementsMet: () => true,
      },
      4: {
        // Ascensão IV
        name: 'Cajado de Novato ◆◆◆◆',
        stars: 4,
        statBonus: { atk: 0, def: 0, spd: 3, mag: 15 },
        effectDesc: 'O cajado desperta seu potencial máximo — cada feitiço carrega um eco do vazio.',
        specialEffect: 'void_echo_chance_10', // 10% de chance de ecoar o feitiço (dano extra)
        borderColor: '#8b0000',
        borderGlow: '0 0 20px #ff4444',
        costGold: 400,
        costItems: [
          { id: 'pedra', qty: 5 },
        ],
        requirementsMet: () => true,
      },
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  //  ARCO RÚSTICO (Arqueiro)
  // ──────────────────────────────────────────────────────────────────────────
  arco_rustico: {
    name: 'Arco Rústico',
    baseIcon: '🏹',
    levels: {
      0: {
        // Nível base (sem ascensão)
        name: 'Arco Rústico',
        stars: 0,
        statBonus: { atk: 0, def: 0, spd: 0 },
        effectDesc: 'Arco de madeira simples. Alcance médio.',
        borderColor: 'none',
        borderGlow: 'none',
        requirementsMet: () => true,
      },
      1: {
        // Ascensão I - Acessível com dinheiro
        name: 'Arco Rústico ◆',
        stars: 1,
        statBonus: { atk: 3, def: 0, spd: 1 },
        effectDesc: 'A madeira é reforçada e a corda trocada por uma mais tensa.',
        borderColor: '#4a7c8e',
        borderGlow: '0 0 8px #4a7c8e',
        costGold: 250,
        costItems: [],
        requirementsMet: () => true,
      },
      2: {
        // Ascensão II - Floresta + moedas
        name: 'Arco Rústico ◆◆',
        stars: 2,
        statBonus: { atk: 7, def: 0, spd: 2 },
        effectDesc: 'Runas de caça aceleram o Fervor Selvagem: +10% de ganho (+4% por Despertar).',
        specialEffect: 'fervor_gain_boost_10', // +10% de ganho de Fervor Selvagem
        borderColor: '#8b4513',
        borderGlow: '0 0 12px #8b4513',
        costGold: 500,
        costItems: [],
        requirementsMet: () => true,
      },
      3: {
        // Ascensão III - Dungeon das Sombras
        name: 'Arco Rústico ◆◆◆',
        stars: 3,
        statBonus: { atk: 11, def: 0, spd: 3 },
        effectDesc: 'Flechas sombrias atravessam o alvo sem gastar munição: 10% de chance (+3% por Despertar).',
        specialEffect: 'arrow_no_cost_chance_10', // 10% de chance de não gastar flecha
        borderColor: '#2d1b4e',
        borderGlow: '0 0 16px #6b2c91',
        costGold: 600,
        costItems: [],
        requirementsMet: () => true,
      },
      4: {
        // Ascensão IV
        name: 'Arco Rústico ◆◆◆◆',
        stars: 4,
        statBonus: { atk: 15, def: 0, spd: 4 },
        effectDesc: 'O arco desperta um instinto predador — críticos no ataque básico soltam uma segunda flecha: 10% de chance (+4% por Despertar).',
        specialEffect: 'flecha_dupla_chance_10', // 10% de chance de disparar uma flecha extra em críticos
        borderColor: '#8b0000',
        borderGlow: '0 0 20px #ff4444',
        costGold: 400,
        costItems: [
          { id: 'pedra', qty: 5 },
        ],
        requirementsMet: () => true,
      },
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  //  ADICIONE OUTRAS ARMAS AQUI (Espada Sagrada, etc)
  // ──────────────────────────────────────────────────────────────────────────
};

// ─────────────────────────────────────────────────────────────────────────────
//  2. UTILITÁRIOS DE ASCENSÃO
// ─────────────────────────────────────────────────────────────────────────────

const WeaponAscension = {
  /**
   * Obtém o nível de ascensão de uma arma no inventário
   * @param {Object} item - item do inventário
   * @returns {number} nível de ascensão (0-4)
   */
  getLevel(item) {
    if (!item || !item.id) return 0;
    return item.ascensionLevel || 0;
  },

  /**
   * Obtém os dados de ascensão para uma arma e nível
   * @param {string} weaponId - ID da arma (ex: 'adaga_sombria')
   * @param {number} level - nível de ascensão (0-4)
   * @returns {Object|null} dados do nível, ou null se não existe
   */
  getLevelData(weaponId, level) {
    const weapon = WEAPON_ASCENSIONS[weaponId];
    if (!weapon || !weapon.levels[level]) return null;
    return weapon.levels[level];
  },

  /**
   * Calcula stats finais de uma arma após ascensões
   * @param {Object} baseWeapon - dados base da arma
   * @param {number} ascensionLevel - nível de ascensão (0-4)
   * @returns {Object} stats finais (atk, def, spd, etc)
   */
  calculateStats(baseWeapon, ascensionLevel) {
    const weaponId = baseWeapon.id;
    let finalStats = {
      atk: baseWeapon.atk || 0,
      def: baseWeapon.def || 0,
      spd: baseWeapon.spd || 0,
      mag: baseWeapon.mag || 0,
    };

    // Aplica bônus acumulativos de 0 até ascensionLevel
    for (let i = 1; i <= ascensionLevel; i++) {
      const levelData = WeaponAscension.getLevelData(weaponId, i);
      if (levelData && levelData.statBonus) {
        if (levelData.statBonus.atk) finalStats.atk += levelData.statBonus.atk;
        if (levelData.statBonus.def) finalStats.def += levelData.statBonus.def;
        if (levelData.statBonus.spd) finalStats.spd += levelData.statBonus.spd;
        if (levelData.statBonus.mag) finalStats.mag += levelData.statBonus.mag;
      }
    }

    return finalStats;
  },

  /**
   * Obtém a descrição visual do nome da arma com nível
   * @param {Object} item - item do inventário
   * @returns {string} nome com estrelas/nível
   */
  getDisplayName(item) {
    if (!item || !item.id) return item?.name || '?';
    const ascLevel = WeaponAscension.getLevel(item);
    const weaponId = item.id.replace('arma_', '');
    const levelData = WeaponAscension.getLevelData(weaponId, ascLevel);
    return levelData ? levelData.name : item.name;
  },

  /**
   * Verifica se uma arma pode ser ascendida pro próximo nível
   * @param {Object} item - item do inventário
   * @returns {Object} { canAscend: bool, reason: string, costs: {...} }
   */
  canAscend(item) {
    if (!item || !item.id) {
      return { canAscend: false, reason: 'Item inválido' };
    }

    const weaponId = item.id.replace('arma_', '');
    const currentLevel = WeaponAscension.getLevel(item);
    const nextLevel = currentLevel + 1;
    const weaponConfig = WEAPON_ASCENSIONS[weaponId];

    if (!weaponConfig) {
      return { canAscend: false, reason: 'Arma não tem ascensão' };
    }

    const nextLevelData = weaponConfig.levels[nextLevel];
    if (!nextLevelData) {
      return { canAscend: false, reason: 'Ascensão máxima atingida' };
    }

    // Verifica level requirement
    if (nextLevelData.levelRequirement) {
      if (typeof G === 'undefined' || !G.player || G.player.level < nextLevelData.levelRequirement) {
        return {
          canAscend: false,
          reason: `Nível mínimo: ${nextLevelData.levelRequirement}`,
          nextLevelData,
        };
      }
    }

    // Verifica ouro
    if (nextLevelData.costGold) {
      if (typeof G === 'undefined' || !G.player || G.player.gold < nextLevelData.costGold) {
        return {
          canAscend: false,
          reason: `Faltam ${nextLevelData.costGold - (G?.player?.gold || 0)} moedas`,
          nextLevelData,
        };
      }
    }

    // Verifica itens — quantidade escala com o ciclo de Despertar atual da arma
    // (mesmo multiplicador usado no ganho de stats da têmpera: ciclo 0 = 1x,
    // Despertar I = 1.25x, II = 1.5x, III = 1.75x, IV = 2.0x, V = 2.5x).
    // Uma arma que já despertou várias vezes exige mais material a cada
    // re-têmpera — não fica pedindo sempre a mesma quantidade de Pedra.
    const temperMult = (typeof WeaponAwaken !== 'undefined') ? WeaponAwaken.getTemperMultiplier(item) : 1;
    const scaledCostItems = (nextLevelData.costItems || []).map(req => ({
      id: req.id,
      qty: Math.max(req.qty, Math.ceil(req.qty * temperMult)),
    }));

    if (scaledCostItems.length > 0) {
      const missing = [];
      for (const required of scaledCostItems) {
        const hasItem = typeof G !== 'undefined' && G.player && G.player.inventory.find(
          inv => inv.id === required.id && (inv.qty || 1) >= required.qty
        );
        if (!hasItem) {
          missing.push(required);
        }
      }
      if (missing.length > 0) {
        return {
          canAscend: false,
          reason: `Faltam itens`,
          missingItems: missing,
          nextLevelData,
          scaledCostItems,
        };
      }
    }

    // Tudo OK
    return {
      canAscend: true,
      reason: 'Pronto para ascender',
      nextLevelData,
      scaledCostItems,
      costs: {
        gold: nextLevelData.costGold || 0,
        items: scaledCostItems,
      },
    };
  },

  /**
   * Ascende uma arma para o próximo nível
   * @param {Object} item - item do inventário (será modificado)
   * @returns {boolean} sucesso
   */
  ascendWeapon(item) {
    if (!item || !item.id) return false;

    const check = WeaponAscension.canAscend(item);
    if (!check.canAscend) return false;

    // Deduz custos
    if (check.costs.gold > 0 && typeof G !== 'undefined' && G.player) {
      G.player.gold -= check.costs.gold;
    }

    if (check.costs.items && check.costs.items.length > 0 && typeof G !== 'undefined' && G.player) {
      for (const required of check.costs.items) {
        const invItem = G.player.inventory.find(inv => inv.id === required.id);
        if (invItem) {
          invItem.qty = (invItem.qty || 1) - required.qty;
          if (invItem.qty <= 0) {
            G.player.inventory.splice(G.player.inventory.indexOf(invItem), 1);
          }
        }
      }
    }

    // Incrementa nível
    item.ascensionLevel = (item.ascensionLevel || 0) + 1;

    // Aplica o bônus de stats do novo nível DIRETO no item (atk/def/spd/mag/critDamage),
    // e se a arma estiver equipada, aplica o mesmo delta em G.player —
    // espelha exatamente o padrão usado ao equipar/desequipar armas.
    //
    // Multiplicador de re-têmpera pós-Despertar: se a arma já despertou pelo
    // menos uma vez (WeaponAwaken.getLevel > 0), cada novo nível de têmpera
    // (1-4) ganha stats multiplicados pelo temperMultiplier daquele ciclo de
    // Despertar (ex: ciclo I = 1.25x, ciclo II = 1.5x...). Arma que nunca
    // despertou usa multiplicador 1 (têmpera normal, sem alteração nenhuma).
    const temperMult = (typeof WeaponAwaken !== 'undefined') ? WeaponAwaken.getTemperMultiplier(item) : 1;
    const bonus = check.nextLevelData.statBonus || {};
    const gainAtk = Math.round((bonus.atk || 0) * temperMult);
    const gainDef = Math.round((bonus.def || 0) * temperMult);
    const gainSpd = Math.round((bonus.spd || 0) * temperMult);
    const gainMag = Math.round((bonus.mag || 0) * temperMult);

    item.atk = (item.atk || 0) + gainAtk;
    item.def = (item.def || 0) + gainDef;
    item.spd = (item.spd || 0) + gainSpd;
    item.mag = (item.mag || 0) + gainMag;
    item.critDamage = (item.critDamage || 0) + (bonus.critDamage || 0);
    // critChance (Despertar II+) vira bônus fixo de chance de crítico,
    // somado ao mesmo campo que o motor de batalha já lê (p.critBonus)
    item.critBonus = (item.critBonus || 0) + (bonus.critChance || 0);

    if (item.equipped && typeof G !== 'undefined' && G.player) {
      G.player.atk = (G.player.atk || 0) + gainAtk;
      G.player.def = (G.player.def || 0) + gainDef;
      G.player.spd = (G.player.spd || 0) + gainSpd;
      G.player.mag = (G.player.mag || 0) + gainMag;
      G.player.critDamage = (G.player.critDamage || 0) + (bonus.critDamage || 0);
      G.player.critBonus = (G.player.critBonus || 0) + (bonus.critChance || 0);
    }

    return true;
  },

  /**
   * Aplica efeitos especiais da ascensão em combate
   * @param {string} effectKey - chave do efeito (ex: 'bleed_chance_5')
   * @param {Object} attacker - personagem atacante
   * @param {Object} defender - personagem defendendo
   * @param {boolean} wasCrit - se o ataque foi crítico
   * @returns {Object} { applied: bool, message: string }
   */
  applySpecialEffect(effectKey, attacker, defender, wasCrit = false) {
    if (!effectKey || typeof attacker === 'undefined' || typeof defender === 'undefined') {
      return { applied: false };
    }

    // Processa por tipo de efeito
    switch (effectKey) {
      case 'bleed_chance_5': {
        // 5% de chance de aplicar sangramento
        if (Math.random() < 0.05) {
          // Aplica sangramento (3 turns, 5 dmg/turn)
          if (!defender.statusEffects) defender.statusEffects = [];
          defender.statusEffects.push({
            type: 'bleeding',
            dmgPerTurn: 5,
            turnsLeft: 3,
            source: 'arma_ascensao',
          });
          return { applied: true, message: 'Sangramento aplicado!' };
        }
        return { applied: false };
      }

      case 'crit_shadow_damage': {
        // Se foi crítico, adiciona dano sombrio extra (50% do dano base)
        if (wasCrit) {
          return {
            applied: true,
            message: 'Dano sombrio adicional!',
            shadowDamageMultiplier: 0.5,
          };
        }
        return { applied: false };
      }

      case 'crit_after_dodge': {
        // Marca que próximo ataque será crítico (gerenciado em combate)
        if (!attacker._ascensionFlags) attacker._ascensionFlags = {};
        attacker._ascensionFlags.nextCritAfterDodge = true;
        return { applied: true, message: 'Próximo ataque será crítico!' };
      }

      case 'crit_lifesteal_15': {
        // Se foi crítico, cura 15% do dano causado (o dano em si é calculado pelo chamador)
        if (wasCrit) {
          return { applied: true, message: 'A adaga suga vida do golpe!', lifestealPct: 0.15 };
        }
        return { applied: false };
      }

      case 'execute_bonus_20': {
        // +20% de dano contra inimigos abaixo de 20% de HP (checagem de HP feita pelo chamador)
        return { applied: true, message: 'Golpe de execução!', executeBonusPct: 0.20 };
      }

      case 'crit_shadow_burst': {
        // Versão mais forte do dano sombrio em crítico (substitui crit_shadow_damage)
        if (wasCrit) {
          return {
            applied: true,
            message: 'Explosão de dano sombrio!',
            shadowDamageMultiplier: 0.75,
          };
        }
        return { applied: false };
      }

      default:
        return { applied: false };
    }
  },

  /**
   * Gera CSS dinamicamente para efeitos visuais de ascensão
   */
  injectAscensionStyles() {
    if (document.getElementById('ascension-styles')) return; // já injetado

    const style = document.createElement('style');
    style.id = 'ascension-styles';
    style.textContent = `
      /* ─── Bordas e Glows de Ascensão ─── */
      .weapon-ascension-1 {
        filter: drop-shadow(0 0 8px #4a7c8e);
        animation: ascension-pulse-1 2s ease-in-out infinite;
      }
      .weapon-ascension-2 {
        filter: drop-shadow(0 0 12px #8b4513);
        animation: ascension-pulse-2 1.8s ease-in-out infinite;
      }
      .weapon-ascension-3 {
        filter: drop-shadow(0 0 16px #6b2c91);
        animation: ascension-pulse-3 1.5s ease-in-out infinite;
      }
      .weapon-ascension-4 {
        filter: drop-shadow(0 0 20px #ff4444);
        animation: ascension-pulse-4 1.2s ease-in-out infinite;
      }

      /* ─── Animations ─── */
      @keyframes ascension-pulse-1 {
        0%, 100% { filter: drop-shadow(0 0 6px #4a7c8e); }
        50% { filter: drop-shadow(0 0 14px #4a7c8e); }
      }
      @keyframes ascension-pulse-2 {
        0%, 100% { filter: drop-shadow(0 0 10px #8b4513); }
        50% { filter: drop-shadow(0 0 18px #8b4513); }
      }
      @keyframes ascension-pulse-3 {
        0%, 100% { filter: drop-shadow(0 0 14px #6b2c91); }
        50% { filter: drop-shadow(0 0 24px #6b2c91); }
      }
      @keyframes ascension-pulse-4 {
        0%, 100% { filter: drop-shadow(0 0 18px #ff4444); }
        50% { filter: drop-shadow(0 0 32px #ff4444); }
      }

      /* ─── Star Indicator ─── */
      .ascension-stars {
        display: inline-block;
        font-size: 0.9em;
        letter-spacing: 2px;
        margin-left: 4px;
      }
      .ascension-star-1 { color: #4a7c8e; }
      .ascension-star-2 { color: #8b4513; }
      .ascension-star-3 { color: #6b2c91; }
      .ascension-star-4 { color: #ff4444; }
    `;
    document.head.appendChild(style);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
//  MIGRAÇÃO: Converter SPD em critDamage para saves antigos
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Migra armas do sistema antigo (spd) para o novo (critDamage)
 * Chamada automaticamente ao carregar o save
 */
function _migrarArmasAncensaoSPDCritDamage() {
  if (typeof G === 'undefined' || !G.player || !G.player.inventory) return;

  G.player.inventory.forEach(item => {
    if (!item || item.equipSlot !== 'weapon') return;

    // Se tem SPD mas não tem critDamage, é do sistema antigo
    if (typeof item.spd === 'number' && !item.critDamage) {
      // Converte: cada ponto de spd antigo = +0.05 de critDamage
      const spdValue = item.spd || 0;
      item.critDamage = spdValue * 0.05;
      
      // Remove SPD antigo pra evitar conflitos
      delete item.spd;
      
      console.log(`✓ Migrado: ${item.name || item.id} — SPD ${spdValue} → Crit Dmg +${item.critDamage.toFixed(2)}`);
    }
  });

  // Também migra o player equipado se tiver SPD
  if (G.player.spd && !G.player.critDamage) {
    const spdValue = G.player.spd || 0;
    // Nota: Não alteramos G.player.spd aqui pois pode vir de outras fontes
    // (armaduras, etc). Apenas sincronizamos critDamage.
    if (!G.player.critDamage) G.player.critDamage = 0;
    G.player.critDamage += (spdValue * 0.05);
  }
}

// Hook para rodar migração ao carregar
if (typeof window !== 'undefined' && typeof loadGame === 'function') {
  const _origLoadGame_weaponAscension = loadGame;
  window.loadGame = function (slot) {
    _origLoadGame_weaponAscension(slot);
    try { _migrarArmasAncensaoSPDCritDamage(); } catch (e) {
      console.error('Erro ao migrar armas:', e);
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────

function initWeaponAscensions() {
  // Injetar estilos CSS
  WeaponAscension.injectAscensionStyles();

  console.log('✓ Sistema de Ascensões de Armas carregado');
}

// Auto-inicializar quando o arquivo carregar
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWeaponAscensions);
  } else {
    initWeaponAscensions();
  }
}
