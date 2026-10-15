// ══════════════════════════════════════════════════════════════
//  CHRONICLES OF CLIVOR — peitorais_classe.js
//  4 armaduras novas, cada uma travada numa classe específica:
//    • Peitoral do Arvoredo        → Mago
//    • Peitoral Ronin              → Arqueiro
//    • Lunar de Escamas Lunares    → Assassino
//    • Peitoral do Vale Sem Fim    → Paladino  (recompensa da Masmorra 4, sem forja)
//
//  Arquivo isolado (mesmo esquema do mundial_armor.js / nulkhar.js):
//  só adiciona entradas no ITEM_DB e "envolve" (wrap) as funções
//  centrais já existentes — não edita nada nos outros arquivos.
//
//  CARREGAR DEPOIS de: palDinh.js, talent_system.js, class_mago.js,
//  assassino_lunar.js (no <script> do gat-1.html).
// ══════════════════════════════════════════════════════════════

'use strict';

// ─────────────────────────────────────────────────────────────
//  ITEM_DB — as 4 armaduras
// ─────────────────────────────────────────────────────────────
if (typeof ITEM_DB !== 'undefined') {

  // ── Peitoral do Arvoredo (Mago) ──
  // Craftável a partir de material da Floresta Maligna (Casca de Árvore,
  // dropada pelos Colossos). Forja até nível 6: +1 DEF / +3 HP por nível.
  ITEM_DB.peitoral_arvoredo = {
    name: 'Peitoral do Arvoredo', icon: '🌳',
    imgSrc: 'Imagens/Armaduras/peitoral_arvoredo.png',
    type: 'equipamento', equipSlot: 'armadura',
    classRequired: 'mago',
    def: 10, hp: 40, weight: 1.4,
    forjavel: true, forjaMax: 6, forjaDefPorNivel: 1, forjaHpPorNivel: 3,
    forjaMaterialId: 'casca_arvore_flm', forjaCustoPorNivel: 3,
    // Passivas (ver hooks mais abaixo): Planta custa -30% MP, Enraizamento +1 turno.
    plantaMpDiscountPct: 0.30, plantaRootBonusTurns: 1,
    desc: 'Casca viva entrelaçada com raízes que ainda pulsam de leve, moldada por quem domina a Floresta Maligna. Só um Mago consegue sintonizar a seiva que corre por ela — o elemento Planta flui com metade do esforço, e suas raízes prendem por mais tempo.',
  };

  // ── Peitoral Ronin (Arqueiro) ──
  // Craftável com Fragmento de Armadura Negra (drop do boss Samurai da
  // Máscara Partida, Floresta Maligna). Forja até nível 6.
  ITEM_DB.peitoral_ronin = {
    name: 'Peitoral Ronin', icon: '🎌',
    imgSrc: 'Imagens/Armaduras/peitoral_ronin.png',
    type: 'equipamento', equipSlot: 'armadura',
    classRequired: 'arqueiro',
    def: 8, hp: 30, weight: 1.0,
    forjavel: true, forjaMax: 6, forjaDefPorNivel: 1, forjaHpPorNivel: 2,
    forjaMaterialId: 'fragmento_armadura_negra', forjaCustoPorNivel: 3,
    // Passiva (ver hook): 1º ataque de cada batalha é crítico garantido +30% dano.
    roninCritDmgBonusPct: 0.30,
    desc: 'Placas leves, de guerreiro sem senhor. Um Ronin vence o combate na primeira decisão certa — vestida por um Arqueiro, o primeiro golpe de cada luta encontra o ponto fraco sem falha.',
  };

  // ── Lunar de Escamas Lunares (Assassino) ──
  // Craftável com Escama Abissal (drop do boss Serpentinos, Floresta
  // Maligna). Forja até nível 8.
  ITEM_DB.lunar_escamas_lunares = {
    name: 'Lunar de Escamas Lunares', icon: '🌙',
    imgSrc: 'Imagens/Armaduras/lunar_escamas_lunares.png',
    type: 'equipamento', equipSlot: 'armadura',
    classRequired: 'assassino',
    def: 12, hp: 35, weight: 1.3,
    forjavel: true, forjaMax: 8, forjaDefPorNivel: 1, forjaHpPorNivel: 3,
    forjaMaterialId: 'escama_abissal', forjaCustoPorNivel: 3,
    // Passivas (ver hooks): barra da Fase da Lua +15% mais rápida; -20% dano de veneno recebido.
    luaSpeedBonusPct: 0.15, poisonResistPct: 0.20,
    desc: 'Escamas frias mesmo sob a lua cheia, arrancadas de algo que não deveria existir sob este céu. Um Assassino que a veste sente a Fase da Lua avançar mais rápido a cada vitória — e o próprio veneno hesita antes de tocá-lo.',
  };

  // ── Peitoral do Vale Sem Fim (Paladino) ──
  // Recompensa da Masmorra 4 (Baú do Ygirro). SEM forja: status fixos.
  // Foco do Paladino: DEF (vira dano nos golpes dele) e HP. Sem crítico/VEL de propósito.
  // Passiva (ver hook): 1x por batalha, sobrevive com 1 HP + 1 golpe de invencibilidade;
  // ao ativar também cura 15% do HP máx e limpa veneno/sangramento.
  ITEM_DB.peitoral_vale_sem_fim = {
    name: 'Peitoral do Vale Sem Fim', icon: '🌌',
    imgSrc: 'Imagens/Armaduras/peitoral_vale_sem_fim.png',
    type: 'equipamento', equipSlot: 'armadura',
    classRequired: 'paladino',
    def: 38, hp: 120, weight: 2.0,
    ecoSemFimAtivo: true, ecoSemFimCuraPct: 0.15,
    desc: 'Placas pesadas, forjadas para quem atravessa um vale que nunca termina. Um Paladino que a veste carrega um eco protetor: na hora em que tudo devia acabar, sobrevive, recobra o fôlego e livra o corpo de veneno e sangue — e por um instante, nada mais o alcança.',
  };
}

// ─────────────────────────────────────────────────────────────
//  Helpers — a armadura X está equipada agora?
// ─────────────────────────────────────────────────────────────
function _peitoralClasseEquipado(id) {
  return !!(G.player && G.player.inventory &&
    G.player.inventory.some(i => i.id === id && i.equipped));
}
function hasPeitoralArvoredo()       { return _peitoralClasseEquipado('peitoral_arvoredo'); }
function hasPeitoralRonin()          { return _peitoralClasseEquipado('peitoral_ronin'); }
function hasPeitoralEscamasLunares() { return _peitoralClasseEquipado('lunar_escamas_lunares'); }
function hasPeitoralValeSemFim()     { return _peitoralClasseEquipado('peitoral_vale_sem_fim'); }
window.hasPeitoralArvoredo       = hasPeitoralArvoredo;
window.hasPeitoralRonin          = hasPeitoralRonin;
window.hasPeitoralEscamasLunares = hasPeitoralEscamasLunares;
window.hasPeitoralValeSemFim     = hasPeitoralValeSemFim;

// ─────────────────────────────────────────────────────────────
//  FORJA — função genérica pras 4 (material OU ouro por nível)
// ─────────────────────────────────────────────────────────────
function forjarPeitoralClasse(invIdx) {
  const p = G.player;
  const item = p.inventory[invIdx];
  if (!item || !item.forjavel) return;

  const nivelAtual = item._forjaNivel || 0;
  const nivelMax   = item.forjaMax != null ? item.forjaMax : 6;
  if (nivelAtual >= nivelMax) {
    notify(`✖ ${item.name} já atingiu o forjamento máximo.`, 'gold');
    return;
  }

  const defGanho = item.forjaDefPorNivel != null ? item.forjaDefPorNivel : 1;
  const hpGanho  = item.forjaHpPorNivel  != null ? item.forjaHpPorNivel  : 3;

  if (item.forjaMaterialId) {
    // ── Forja por material ──
    const custo = item.forjaCustoPorNivel || 1;
    const mat   = p.inventory.find(i => i.id === item.forjaMaterialId && i.type === 'material');
    const have  = mat ? (mat.qty || 0) : 0;
    if (have < custo) {
      const matNome = (ITEM_DB[item.forjaMaterialId] && ITEM_DB[item.forjaMaterialId].name) || item.forjaMaterialId;
      notify(`✖ Faltam materiais: precisa de ${custo}× ${matNome} (tem ${have}).`, 'red');
      return;
    }
    mat.qty -= custo;
    if (mat.qty <= 0) p.inventory.splice(p.inventory.indexOf(mat), 1);
  } else if (item.forjaGoldPorNivel) {
    // ── Forja por ouro ──
    const custo = item.forjaGoldPorNivel;
    if ((p.gold || 0) < custo) {
      notify(`✖ Ouro insuficiente: precisa de ${custo} (tem ${p.gold || 0}).`, 'red');
      return;
    }
    p.gold -= custo;
  }

  item._forjaNivel = nivelAtual + 1;
  item.def = (item.def || 0) + defGanho;
  item.hp  = (item.hp  || 0) + hpGanho;

  // Se já equipada, aplica o ganho direto no jogador (mesmo padrão de forjarPeitoralLorde)
  if (item.equipped) {
    p.def   = (p.def   || 0) + defGanho;
    p.maxHp = Math.max(1, (p.maxHp || 1) + hpGanho);
    p.hp    = Math.min((p.hp || 0) + hpGanho, p.maxHp);
  }

  notify(`🔨 ${item.name} forjado! +${defGanho} DEF, +${hpGanho} HP máx — Nível ${item._forjaNivel}/${nivelMax}`, 'gold');
  if (typeof addLog === 'function') addLog(`Forjou o ${item.name}: nível ${item._forjaNivel}/${nivelMax} (+${defGanho} DEF, +${hpGanho} HP máx).`, 'info');
  updateHUD();
  buildBagItems();
  updateEquippedGearHUD();
}
window.forjarPeitoralClasse = forjarPeitoralClasse;

// ─────────────────────────────────────────────────────────────
//  TRAVA DE CLASSE — bloqueia equipar item.classRequired != classe atual
//  (desequipar nunca é bloqueado; mesmo espírito do bloqueio de levelRequired)
// ─────────────────────────────────────────────────────────────
if (typeof useInventoryItem === 'function' && !window._peitorClasseLockWrapped) {
  window._peitorClasseLockWrapped = true;
  const _origUseInventoryItem = useInventoryItem;
  window.useInventoryItem = function (idx) {
    const p = G.player;
    const item = p.inventory && p.inventory[idx];
    if (item && item.classRequired && !item.equipped &&
        (!p.classData || p.classData.id !== item.classRequired)) {
      const nomes = { paladino: 'Paladino', assassino: 'Assassino', mago: 'Mago', arqueiro: 'Arqueiro' };
      notify(`🔒 ${item.name} só pode ser equipado pela classe ${nomes[item.classRequired] || item.classRequired}.`, 'red');
      return;
    }
    return _origUseInventoryItem(idx);
  };
}

// ─────────────────────────────────────────────────────────────
//  RESET POR BATALHA — flags que os hooks abaixo usam
// ─────────────────────────────────────────────────────────────
if (typeof startBattleReal === 'function' && !window._peitorClasseBattleResetWrapped) {
  window._peitorClasseBattleResetWrapped = true;
  const _origStartBattleReal = startBattleReal;
  window.startBattleReal = function (enemy) {
    const r = _origStartBattleReal(enemy);
    battleState._roninFirstStrikeUsado = false;
    battleState._ecoSemFimUsado        = false;
    battleState._ecoSemFimInvencivel   = false;
    return r;
  };
}

// ─────────────────────────────────────────────────────────────
//  MAGO — Peitoral do Arvoredo
//  1) Elemento Planta custa -30% MP (via getSkillCost, talent_system.js)
//  2) Enraizamento dura +1 turno (via skillMago, class_mago.js)
// ─────────────────────────────────────────────────────────────
if (typeof getSkillCost === 'function' && !window._peitorArvoredoCostWrapped) {
  window._peitorArvoredoCostWrapped = true;
  const _origGetSkillCost = getSkillCost;
  window.getSkillCost = function (sk, p) {
    let cost = _origGetSkillCost(sk, p);
    if (sk && sk.elemento === 'planta' && hasPeitoralArvoredo()) {
      const desconto = (ITEM_DB.peitoral_arvoredo && ITEM_DB.peitoral_arvoredo.plantaMpDiscountPct) || 0.30;
      cost = Math.max(0, Math.floor(cost * (1 - desconto)));
    }
    return cost;
  };
}

if (typeof skillMago === 'function' && !window._peitorArvoredoRootWrapped) {
  window._peitorArvoredoRootWrapped = true;
  const _origSkillMago = skillMago;
  window.skillMago = function (skillKey, p, e, bs, helpers) {
    const result = _origSkillMago(skillKey, p, e, bs, helpers);
    if (skillKey === 'elem_planta' && hasPeitoralArvoredo() && bs && bs._enemyRootedTurns > 0) {
      const bonus = (ITEM_DB.peitoral_arvoredo && ITEM_DB.peitoral_arvoredo.plantaRootBonusTurns) || 1;
      bs._enemyRootedTurns += bonus;
    }
    return result;
  };
}

// ─────────────────────────────────────────────────────────────
//  ARQUEIRO — Peitoral Ronin
//  1º ataque básico de cada batalha: crítico garantido + dano extra.
//  Flag _roninFirstStrikeArm só fica "ligada" durante a chamada síncrona
//  de doBattleAction('attack', ...) — não afeta cálculos de crítico feitos
//  fora de uma ação real (ex.: tela de status).
// ─────────────────────────────────────────────────────────────
if (typeof getPlayerCritChance === 'function' && !window._peitorRoninCritWrapped) {
  window._peitorRoninCritWrapped = true;
  const _origGetPlayerCritChance = getPlayerCritChance;
  window.getPlayerCritChance = function (p, extra, enemyCritResist) {
    if (window._roninFirstStrikeArm && hasPeitoralRonin()) return 1;
    return _origGetPlayerCritChance(p, extra, enemyCritResist);
  };
}

if (typeof doBattleAction === 'function' && !window._peitorRoninActionWrapped) {
  window._peitorRoninActionWrapped = true;
  const _origDoBattleAction = doBattleAction;
  window.doBattleAction = function (action, skillIdx) {
    const arma = action === 'attack' && hasPeitoralRonin() &&
      battleState && !battleState._roninFirstStrikeUsado;
    if (arma) {
      window._roninFirstStrikeArm = true;
      battleState._roninFirstStrikeUsado = true;
    }
    const r = _origDoBattleAction(action, skillIdx);
    window._roninFirstStrikeArm = false;
    return r;
  };
}

// Dano extra do golpe de abertura (o crítico garantido já vem do getPlayerCritChance
// acima; aqui só soma o +30% extra de dano por cima do multiplicador de crítico normal).
if (typeof getCritMultiplier === 'function' && !window._peitorRoninDmgWrapped) {
  window._peitorRoninDmgWrapped = true;
  const _origGetCritMultiplier = getCritMultiplier;
  window.getCritMultiplier = function (p) {
    const base = _origGetCritMultiplier(p);
    if (window._roninFirstStrikeArm && hasPeitoralRonin()) {
      const bonus = (ITEM_DB.peitoral_ronin && ITEM_DB.peitoral_ronin.roninCritDmgBonusPct) || 0.30;
      return base + bonus;
    }
    return base;
  };
}

// ─────────────────────────────────────────────────────────────
//  ASSASSINO — Lunar de Escamas Lunares
//  1) Barra da Fase da Lua +15% mais rápida (via registerAssassinoVictory)
//  2) -20% de dano de veneno recebido (via tickPlayerStatusEffects)
// ─────────────────────────────────────────────────────────────
if (typeof registerAssassinoVictory === 'function' && !window._peitorEscamasLuaWrapped) {
  window._peitorEscamasLuaWrapped = true;
  const _origRegisterAssassinoVictory = registerAssassinoVictory;
  window.registerAssassinoVictory = function (p) {
    _origRegisterAssassinoVictory(p);
    if (hasPeitoralEscamasLunares() && p && p.classData && p.classData.id === 'assassino') {
      const bonus = (ITEM_DB.lunar_escamas_lunares && ITEM_DB.lunar_escamas_lunares.luaSpeedBonusPct) || 0.15;
      // "15% mais rápido" = 15% de chance da vitória contar em dobro pra barra
      if (Math.random() < bonus) _origRegisterAssassinoVictory(p);
    }
  };
}

if (typeof tickPlayerStatusEffects === 'function' && !window._peitorEscamasVenenoWrapped) {
  window._peitorEscamasVenenoWrapped = true;
  const _origTickPlayerStatusEffects = tickPlayerStatusEffects;
  window.tickPlayerStatusEffects = function (bs, p, e) {
    if (hasPeitoralEscamasLunares() && bs && bs.playerPoisoned && bs.playerPoisonTurns > 0) {
      const reducao = (ITEM_DB.lunar_escamas_lunares && ITEM_DB.lunar_escamas_lunares.poisonResistPct) || 0.20;
      const baseDmg = (bs._playerPoisonDmgOverride != null)
        ? bs._playerPoisonDmgOverride
        : (BATTLE_CONFIG.POISON_DMG_BASE - 2);
      bs._playerPoisonDmgOverride = Math.max(1, Math.floor(baseDmg * (1 - reducao)));
    }
    return _origTickPlayerStatusEffects(bs, p, e);
  };
}

// ─────────────────────────────────────────────────────────────
//  PALADINO — Peitoral do Vale Sem Fim
//  "Eco Sem Fim": 1x por batalha, ao levar um golpe que zeraria o HP,
//  sobrevive com 1 HP; o próximo golpe recebido é anulado (invencibilidade).
// ─────────────────────────────────────────────────────────────
if (typeof applyDmgToPlayer === 'function' && !window._peitorValeWrapped) {
  window._peitorValeWrapped = true;
  const _origApplyDmgToPlayer = applyDmgToPlayer;
  window.applyDmgToPlayer = function (dmg, bs, p, ignoresDef = false) {
    let _ecoDisparou = false;
    if (hasPeitoralValeSemFim() && bs) {
      if (bs._ecoSemFimInvencivel && dmg > 0) {
        bs._ecoSemFimInvencivel = false;
        appendBattleLog('🌌 Eco Sem Fim: o golpe atravessa sem tocar você!', '#a0c0ff');
        showFloatingNumber('hero', 'INVENCÍVEL', 'status');
        dmg = 0;
      } else if (!bs._ecoSemFimUsado && dmg >= (p.hp || 0) && (p.hp || 0) > 0) {
        bs._ecoSemFimUsado = true;
        bs._ecoSemFimInvencivel = true;
        _ecoDisparou = true;
        dmg = p.hp - 1;
        appendBattleLog('✨ Eco Sem Fim! Você sobrevive com 1 HP — o próximo golpe não vai te alcançar!', '#e0d0ff');
        showFloatingNumber('hero', '💫 ECO SEM FIM', 'buff');
      }
    }
    const r = _origApplyDmgToPlayer(dmg, bs, p, ignoresDef);
    if (_ecoDisparou && p && p.hp > 0) {
      // Reforço: cura % do HP máx e limpa veneno/sangramento (o veneno tira HP direto,
      // sem passar por aqui, então sem isso a passiva não salvava contra veneno).
      const pct = (ITEM_DB.peitoral_vale_sem_fim && ITEM_DB.peitoral_vale_sem_fim.ecoSemFimCuraPct) || 0.15;
      const cura = Math.max(1, Math.floor((p.maxHp || 1) * pct));
      p.hp = Math.min(p.maxHp, p.hp + cura);
      bs.playerPoisoned = false; bs.playerPoisonTurns = 0; bs._playerPoisonDmgOverride = null;
      bs.playerBleeding = false; bs.playerBleedTurns = 0;
      appendBattleLog('🌌 Eco Sem Fim: +' + cura + ' HP e o corpo se livra de veneno e sangramento!', '#a0e0c0');
      showFloatingNumber('hero', cura, 'heal');
      try { if (typeof buildStatusBadges === 'function') buildStatusBadges(); } catch (_) {}
      try { if (typeof updateHUD === 'function') updateHUD(); if (typeof updateBattleHUD === 'function') updateBattleHUD(); } catch (_) {}
    }
    return r;
  };
}
