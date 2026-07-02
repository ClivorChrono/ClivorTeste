// ══════════════════════════════════════════════════════════════
//  CHRONICLES OF CLIVOR — assassino_lunar.js
//  SISTEMA "FASES DA LUA" — Super Talentos do Assassino
//  ──────────────────────────────────────────────────────────
//  PARTE 2/N — Progressão por BATALHA, não por Level.
//  Lua Nova implementada e jogável. Lua Crescente, Lua Cheia e
//  Lua Minguante existem como lore/rascunho ("mecanicaPronta:
//  false") até decidirmos a mecânica de cada uma — mas agora já
//  fazem parte do motor de progressão real.
//
//  CONCEITO GERAL
//  O Assassino não compra mais talentos com PT. Em vez disso,
//  "sintoniza" uma Fase da Lua de cada vez (fora de batalha, no
//  painel de talentos). Cada fase é um pacote fechado:
//    • 1 passivo com BENEFÍCIO e MALEFÍCIO (sempre os dois —
//      poder lunar tem preço).
//    • 1-2 skills exclusivas daquela fase.
//  Trocar de fase troca completamente o estilo de jogo.
//
//  PROGRESSÃO (NOVO):
//  • Cada fase tem uma barra grande, alimentada por VITÓRIAS em
//    batalha enquanto aquela fase está ativa (não por Level).
//  • Só a barra da fase ATIVA enche. Ao trocar de fase, o
//    progresso da fase anterior reseta a 0 — de propósito, pra
//    dar mais peso à escolha de "ficar ou trocar".
//  • Ao enchê-la (winsToMaster vitórias), a fase é DOMINADA e a
//    próxima fase da sequência (nova→crescente→cheia→minguante)
//    é CONSTRUÍDA. Um modal pergunta: ficar na fase atual, ou
//    sintonizar a nova.
//  • Quando as 4 fases normais são dominadas, a Lua Sangrenta
//    fica pronta a nível de lore (ainda sem mecânica própria).
//
//  Lua Sangrenta / Modo Obscuro é a forma final: a ideia é que
//  ela "corrompa" as skills das 4 fases normais em versões
//  sombrias mais fortes, com um malefício maior ainda (autodano,
//  não pode curar, etc). Gatilho e skills ainda em aberto.
// ══════════════════════════════════════════════════════════════

'use strict';

// ─────────────────────────────────────────────────────────────
//  DADOS — As 4 Fases da Lua
//  cor          → identidade visual única da fase (cards + barra)
//  winsToMaster → vitórias em batalha, com a fase ativa, para
//                 dominá-la e construir a próxima
//  mecanicaPronta → false = só lore/rascunho por enquanto. A fase
//                 já pode ser CONSTRUÍDA e até sintonizada, mas
//                 sem passivo/skills até decidirmos a mecânica.
// ─────────────────────────────────────────────────────────────
const ASSASSINO_LUAS = [
  {
    key: 'nova',
    nome: 'Lua Nova',
    icon: '🌑',
    iconImg: 'Imagens/personagens/assassino/IconesAsas/Picsart_26-06-19_04-37-43-127.png',
    cor: '#6a4a9a',
    winsToMaster: 8,
    mecanicaPronta: true,
    lore: 'Onde não há luz, o Assassino se torna sombra pura. Golpeia antes de ser visto — mas paga o preço de abrir mão da guarda.',
    beneficio: '+18% chance de esquiva enquanto ativa.',
    maleficio: '-4 DEF fixos enquanto ativa.',
    passivo: p => {
      p._lua_dodge_bonus = 0.18;
      p._lua_def_penalty_active = 4;
      p.def = Math.max(0, (p.def || 0) - 4);
    },
    skills: [
      {
        key: 'corte_invisivel', name: 'Corte Invisível', icon: '🌑',
        ap: 18,
        desc: '1.8× ATQ, ignora 30% da DEF inimiga. Primeiro golpe da batalha: dano dobrado e crítico garantido.',
        dmg: 'TALENT_LUA_CORTE_INVISIVEL',
      },
      {
        key: 'veu_sombrio', name: 'Véu Sombrio', icon: '👁️‍🗨️',
        ap: 24,
        desc: '1.1× ATQ + 45% de chance de Cegar o inimigo por 2 turnos (reduz a chance de acerto dele).',
        dmg: 'TALENT_LUA_VEU_SOMBRIO',
      },
    ],
  },
  {
    key: 'crescente',
    nome: 'Lua Crescente',
    icon: '🌒',
    iconImg: 'Imagens/personagens/assassino/IconesAsas/Picsart_26-06-19_04-36-52-914.png',
    cor: '#2a8a6a',
    winsToMaster: 10,
    mecanicaPronta: true,
    lore: 'A lua cresce, e com ela o poder se acumula. Fraco no início do combate, devastador quando atinge o auge.',
    beneficio: 'Eclipse Lunar acumula 1 lua por golpe (máx. 4). Ao completar o ciclo: ataque supremo concede +10 ATQ (Eclipse Lunar) ou +10% de crítico (Eclipse Solar), alternando a cada ciclo completo.',
    maleficio: 'Golpes que apenas acumulam luas (sem completar o ciclo) causam 15% a menos de dano que um ataque normal.',
    passivo: p => {
      p._eclipse_stacks = 0;
      p._eclipse_mode = 'lunar';
    },
    skills: [
      {
        key: 'eclipse_lunar', name: 'Eclipse Lunar', icon: '🌒',
        ap: 16,
        desc: 'Cada golpe acumula 1 lua (máx. 4). Ao completar as 4 luas, desfere um ataque supremo: +10 ATQ por um golpe — e as luas escurecem. No próximo ciclo (Eclipse Solar), o ataque supremo concede +10% de crítico em vez de ATQ. Alterna entre os dois a cada ciclo completo.',
        dmg: 'TALENT_LUA_ECLIPSE',
      },
      {
        key: 'investida_crescente', name: 'Investida Crescente', icon: '🌗',
        ap: 32,
        desc: 'Consome todas as cargas acumuladas: 1.0× ATQ por carga. Crítico garantido com 4+ cargas. Zera as cargas.',
        dmg: 'TALENT_LUA_INVESTIDA_CRESCENTE',
      },
    ],
  },
  {
    key: 'cheia',
    nome: 'Lua Cheia',
    icon: '🌕',
    iconImg: 'Imagens/personagens/assassino/IconesAsas/Picsart_26-06-19_04-36-01-624.jpg',
    cor: '#c2581f',
    winsToMaster: 12,
    mecanicaPronta: true,
    lore: 'Sob a lua cheia, o Assassino abraça o instinto bruto. Toda sutileza é trocada por poder destrutivo.',
    beneficio: '+30% ATQ fixo enquanto ativa.',
    maleficio: '-8 DEF fixos enquanto ativa. Golpes desta fase consomem HP do próprio Assassino além do AP.',
    passivo: p => {
      p._lua_cheia_atk_bonus_active = Math.floor((p.atk || 0) * 0.3);
      p.atk = (p.atk || 0) + p._lua_cheia_atk_bonus_active;
      p._lua_def_penalty_active = (p._lua_def_penalty_active || 0) + 8;
      p.def = Math.max(0, (p.def || 0) - 8);
    },
    skills: [
      {
        key: 'investida_elemental', name: 'Investida Elemental', icon: '🌙',
        ap: 14,
        desc: 'Escolha um elemento de investida contra o inimigo atual. Acertar a fraqueza dele te fortalece nesta batalha (+25% ATQ); errar, te enfraquece (-20% ATQ). Não causa dano.',
        dmg: 'TALENT_LUA_INVESTIDA_ELEMENTAL',
      },
      {
        key: 'investida_lunar', name: 'Investida Lunar', icon: '🌕',
        ap: 22,
        desc: '2.2× ATQ, +25% chance de crítico. Custa 6% do HP máximo do Assassino como recuo.',
        dmg: 'TALENT_LUA_INVESTIDA_LUNAR',
      },
      {
        key: 'furia_lua_cheia', name: 'Fúria da Lua Cheia', icon: '🔥',
        ap: 38,
        desc: '3× ATQ, ignora 20% da DEF inimiga. Custa 10% do HP atual do Assassino além do AP.',
        dmg: 'TALENT_LUA_FURIA_CHEIA',
      },
    ],
  },
  {
    key: 'minguante',
    nome: 'Lua Minguante',
    icon: '🌘',
    iconImg: 'Imagens/personagens/assassino/IconesAsas/Picsart_26-06-19_04-37-19-324.png',
    cor: '#3a6a6a',
    winsToMaster: 14,
    mecanicaPronta: true,
    lore: 'O que mingua na lua, mingua também no inimigo. Cada golpe rouba força, vida e esperança.',
    beneficio: 'Golpes desta fase drenam HP do inimigo, curando o Assassino, e aplicam debuffs fortes.',
    maleficio: '-20% ATQ fixo enquanto ativa — foco em drenagem e enfraquecimento, não em força bruta.',
    passivo: p => {
      p._lua_minguante_atk_penalty_active = Math.floor((p.atk || 0) * 0.2);
      p.atk = Math.max(0, (p.atk || 0) - p._lua_minguante_atk_penalty_active);
    },
    skills: [
      {
        key: 'sanguessuga_sombria', name: 'Sanguessuga Sombria', icon: '🩸',
        ap: 18,
        desc: '1.3× ATQ. Cura o Assassino em 40% do dano causado.',
        dmg: 'TALENT_LUA_SANGUESSUGA',
      },
      {
        key: 'maldicao_minguante', name: 'Maldição Minguante', icon: '🌘',
        ap: 28,
        desc: '1.0× ATQ. Reduz o ATQ do inimigo em 25% por 3 turnos. Cura o Assassino em 25% do dano causado.',
        dmg: 'TALENT_LUA_MALDICAO',
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
//  DADOS — Lua Sangrenta / Modo Obscuro (forma final)
//  Não é sangue — é um fragmento lunar de outro mundo, rachado,
//  revelando um núcleo abissal por dentro. Mecânica própria:
//  CORRUPÇÃO (0-100, sobe ao usar as skills desta fase) +
//  INVESTIDA PESADA (aposta tática estilo "all-in" — arma o
//  próximo golpe pra sair amplificado, com risco real de queimar
//  o próprio Assassino se o "fôlego cósmico" vier hostil).
//  Ao encher 100 de Corrupção, libera a ultimate.
// ─────────────────────────────────────────────────────────────
const ASSASSINO_LUA_SANGRENTA = {
  key: 'sangrenta',
  nome: 'Lua Sangrenta',
  subtitulo: 'Fragmento de um Mundo Que Não é o Nosso',
  icon: '🩸',
  iconImg: 'Imagens/personagens/assassino/IconesAsas/Picsart_26-06-19_04-36-25-582.png',
  cor: '#8a0d18',
  mecanicaPronta: true,
  lore: 'O que chamam de "Lua Sangrenta" nunca foi sangue. É a rachadura de um corpo celeste que não nasceu sob este céu — e, por dentro, um núcleo abissal pulsa em uma cor que o olho humano mal reconhece como cor.',
  beneficio: '+15% ATQ fixo. Todas as skills das 4 fases ganham versão corrompida e acumulam Corrupção (0-100).',
  maleficio: 'Ao encher 100 de Corrupção, a ultimate consome tudo e deixa -50% DEF por 2 ações.',
  conceito: 'Sistema "Investida Pesada": arme a aposta antes do golpe — se o fôlego cósmico vier a favor, o golpe sai turbinado de graça; se vier hostil, cobra HP do próprio Assassino.',
  passivo: p => {
    p._lua_sangrenta_atk_bonus_active = Math.floor((p.atk || 0) * 0.15);
    p.atk = (p.atk || 0) + p._lua_sangrenta_atk_bonus_active;
    p._lua_corrupcao = 0;
    p._lua_sangrenta_aposta = false;
    p._lua_sangrenta_def_penalty_turns = 0;
  },
  skills: [
    {
      key: 'convergencia_cosmica', name: 'Convergência Cósmica', icon: '🌌',
      ap: 10,
      desc: 'Arma uma Investida Pesada: o PRÓXIMO golpe corrompido sai amplificado. 50% de chance de sair de graça — 50% de chance de custar HP do próprio Assassino.',
      dmg: 'TALENT_LUA_SANG_APOSTA',
    },
    {
      key: 'corte_do_vazio', name: 'Corte do Vazio', icon: '🕳️',
      ap: 20,
      desc: '2.0× ATQ, ignora 50% da DEF inimiga. +18 Corrupção. Amplificado por Investida Pesada.',
      dmg: 'TALENT_LUA_SANG_CORTE_VAZIO',
    },
    {
      key: 'colapso_estelar', name: 'Colapso Estelar', icon: '💫',
      ap: 30,
      desc: 'Dano cresce com a Corrupção atual (até +60% extra a 100 Corrupção). +22 Corrupção. Amplificado por Investida Pesada.',
      dmg: 'TALENT_LUA_SANG_COLAPSO',
    },
    {
      key: 'impacto_de_outro_mundo', name: 'Impacto de Outro Mundo', icon: '☄️',
      ap: 36,
      desc: '3.2× ATQ. +25 Corrupção. Amplificado por Investida Pesada (dano e recuo dobrados).',
      dmg: 'TALENT_LUA_SANG_IMPACTO',
    },
    {
      key: 'sugador_abissal', name: 'Sugador Abissal', icon: '👁️',
      ap: 24,
      desc: 'Cura 55% do dano causado. Rouba 1 ponto de ATQ do inimigo (permanente na batalha). +15 Corrupção.',
      dmg: 'TALENT_LUA_SANG_SUGADOR',
    },
    {
      key: 'implosao_de_outro_mundo', name: 'Implosão de um Outro Mundo', icon: '🌠',
      ap: 0,
      desc: 'ULTIMATE — requer 100 de Corrupção. Dano devastador. Consome toda a Corrupção e deixa -50% DEF por 2 ações.',
      dmg: 'TALENT_LUA_SANG_ULTIMATE',
    },
  ],
};

// ─────────────────────────────────────────────────────────────
//  MOTOR — getters/setters de fase ativa
// ─────────────────────────────────────────────────────────────
function getAssassinoLuaData(key) {
  if (key === ASSASSINO_LUA_SANGRENTA.key) return ASSASSINO_LUA_SANGRENTA;
  return ASSASSINO_LUAS.find(l => l.key === key) || null;
}

function getAssassinoLuaAtiva(p) {
  return (p && p._lua_ativa) || null;
}

// Garante que o Assassino sempre tenha uma fase ativa (Lua Nova por padrão)
function ensureAssassinoLuaDefault(p) {
  if (!p || !p.classData || p.classData.id !== 'assassino') return;
  if (!p._lua_ativa) {
    setAssassinoLua(p, 'nova', true); // silent — é a fase inicial, não precisa de notificação
  }
}

// Remove os efeitos passivos da fase atualmente ativa
function clearAssassinoLuaEffects(p) {
  if (p._lua_def_penalty_active) {
    p.def = (p.def || 0) + p._lua_def_penalty_active;
    p._lua_def_penalty_active = 0;
  }
  if (p._lua_cheia_atk_bonus_active) {
    p.atk = Math.max(0, (p.atk || 0) - p._lua_cheia_atk_bonus_active);
    p._lua_cheia_atk_bonus_active = 0;
  }
  if (p._lua_minguante_atk_penalty_active) {
    p.atk = (p.atk || 0) + p._lua_minguante_atk_penalty_active;
    p._lua_minguante_atk_penalty_active = 0;
  }
  if (p._lua_sangrenta_atk_bonus_active) {
    p.atk = Math.max(0, (p.atk || 0) - p._lua_sangrenta_atk_bonus_active);
    p._lua_sangrenta_atk_bonus_active = 0;
  }
  if (p._lua_sangrenta_def_penalty_turns > 0 && p._lua_sangrenta_def_penalty_value) {
    p.def = (p.def || 0) + p._lua_sangrenta_def_penalty_value;
    p._lua_sangrenta_def_penalty_turns = 0;
    p._lua_sangrenta_def_penalty_value = 0;
  }
  delete p._lua_corrupcao;
  delete p._lua_sangrenta_aposta;
  delete p._lua_dodge_bonus;
  delete p._eclipse_stacks;
  delete p._eclipse_mode;
}

// ─────────────────────────────────────────────────────────────
//  PROGRESSÃO — fase seguinte na sequência / fase já construída
// ─────────────────────────────────────────────────────────────
function getNextLuaKey(key) {
  const idx = ASSASSINO_LUAS.findIndex(l => l.key === key);
  if (idx === -1 || idx === ASSASSINO_LUAS.length - 1) return null;
  return ASSASSINO_LUAS[idx + 1].key;
}

function getPrevLuaData(key) {
  const idx = ASSASSINO_LUAS.findIndex(l => l.key === key);
  if (idx <= 0) return null;
  return ASSASSINO_LUAS[idx - 1];
}

// Uma fase está "construída" (disponível pra sintonizar) se for a
// Lua Nova (sempre construída), se a fase anterior já foi DOMINADA,
// ou — no caso da Lua Sangrenta — se as 4 fases normais já caíram.
function isLuaConstruida(key, p) {
  if (key === ASSASSINO_LUA_SANGRENTA.key) {
    return !!(p && p._lua_dominadas && ASSASSINO_LUAS.every(l => p._lua_dominadas[l.key]));
  }
  const idx = ASSASSINO_LUAS.findIndex(l => l.key === key);
  if (idx <= 0) return true;
  const prevKey = ASSASSINO_LUAS[idx - 1].key;
  return !!(p && p._lua_dominadas && p._lua_dominadas[prevKey]);
}

// Troca a fase ativa. silent=true evita notificação (usado no auto-set inicial)
function setAssassinoLua(p, luaKey, silent) {
  const lua = getAssassinoLuaData(luaKey);
  if (!lua) return false;
  if (!isLuaConstruida(luaKey, p)) {
    if (!silent && typeof notify === 'function') {
      notify('🔒 Esta fase ainda não foi construída — domine a fase anterior primeiro.', 'red');
    }
    return false;
  }
  if (p._lua_ativa === luaKey) return true; // já está ativa

  const prevLua = getAssassinoLuaData(p._lua_ativa);

  clearAssassinoLuaEffects(p);
  p._lua_ativa = luaKey;
  p._lua_wins  = 0; // progresso reseta ao trocar de fase — escolha tem peso
  if (typeof lua.passivo === 'function') lua.passivo(p);

  if (!silent) {
    if (prevLua && typeof document !== 'undefined') showLuaEclipseEffect(prevLua, lua);
    if (lua.mecanicaPronta) {
      if (typeof notify === 'function') notify(`${lua.icon} ${lua.nome} sintonizada.`, 'gold');
      if (typeof addLog === 'function') addLog(`Lua: ${lua.icon} ${lua.nome} ativada — ${lua.beneficio}`, 'xp');
    } else {
      if (typeof notify === 'function') notify(`${lua.icon} ${lua.nome} sintonizada — técnicas ainda em forja, sem efeito de batalha por enquanto.`, 'purple');
    }
  }
  return true;
}

// ─────────────────────────────────────────────────────────────
//  FX — "Eclipse": a fase atual apaga, a nova nasce. Disparado
//  toda vez que a fase ativa muda (não-silencioso).
// ─────────────────────────────────────────────────────────────
function showLuaEclipseEffect(oldLua, newLua) {
  const old = document.getElementById('lua-eclipse-fx');
  if (old) old.remove();

  const ov = document.createElement('div');
  ov.id = 'lua-eclipse-fx';
  ov.style.cssText = `
    position:fixed; inset:0; z-index:10200; pointer-events:none;
    display:flex; align-items:center; justify-content:center;
    background:radial-gradient(circle, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.6) 75%);
    opacity:0; transition:opacity 0.45s ease;
  `;

  const moonOld = document.createElement('div');
  moonOld.textContent = oldLua.icon;
  moonOld.style.cssText = `
    position:absolute; font-size:5.2rem; line-height:1;
    filter:drop-shadow(0 0 30px ${hexToRgba(oldLua.cor, 0.8)});
    transition:transform 0.9s ease, opacity 0.9s ease;
  `;

  const moonNew = document.createElement('div');
  moonNew.textContent = newLua.icon;
  moonNew.style.cssText = `
    position:absolute; font-size:5.2rem; line-height:1;
    opacity:0; transform:scale(0.25) rotate(-15deg);
    filter:drop-shadow(0 0 34px ${hexToRgba(newLua.cor, 0.9)});
    transition:transform 1s cubic-bezier(0.175,0.885,0.32,1.275), opacity 1s ease;
  `;

  ov.appendChild(moonOld);
  ov.appendChild(moonNew);
  document.body.appendChild(ov);

  requestAnimationFrame(() => requestAnimationFrame(() => {
    ov.style.opacity = '1';
    moonOld.style.transform = 'scale(0.15) rotate(20deg)';
    moonOld.style.opacity = '0';
  }));

  setTimeout(() => {
    moonNew.style.opacity = '1';
    moonNew.style.transform = 'scale(1) rotate(0deg)';
  }, 550);

  setTimeout(() => {
    ov.style.opacity = '0';
    setTimeout(() => ov.remove(), 480);
  }, 1750);
}

// Chamado a cada vitória em batalha do Assassino. Acumula 1 vitória
// na fase ATIVA; ao bater winsToMaster, marca a fase como dominada,
// constrói a próxima da sequência e abre o modal de escolha.
function registerAssassinoVictory(p) {
  if (!p || !p.classData || p.classData.id !== 'assassino') return;
  ensureAssassinoLuaDefault(p);

  const ativaKey = getAssassinoLuaAtiva(p);
  const lua = getAssassinoLuaData(ativaKey);
  if (!lua) return;

  p._lua_dominadas = p._lua_dominadas || {};
  if (p._lua_dominadas[ativaKey]) return; // já dominada — nada mais a acumular

  p._lua_wins = (p._lua_wins || 0) + 1;
  const threshold = lua.winsToMaster || 10;

  if (p._lua_wins < threshold) {
    refreshLuaUI(); // barra avança em tempo real se o painel estiver aberto
    return;
  }

  // ── Fase dominada! ──
  p._lua_dominadas[ativaKey] = true;
  if (typeof notify === 'function') notify(`${lua.icon} ${lua.nome} DOMINADA!`, 'gold');
  if (typeof addLog === 'function') addLog(`✦ ${lua.nome} foi totalmente dominada pela batalha!`, 'xp');

  const nextKey = getNextLuaKey(ativaKey);
  if (nextKey) {
    const nextLua = getAssassinoLuaData(nextKey);
    if (typeof notify === 'function') notify(`🌙 ${nextLua.icon} ${nextLua.nome} foi construída!`, 'purple');
    refreshLuaUI();
    showLuaChoiceModal(ativaKey, nextKey);
  } else {
    // Lua Minguante dominada — verifica se as 4 fases fecharam o ciclo
    const todasDominadas = ASSASSINO_LUAS.every(l => p._lua_dominadas[l.key]);
    if (todasDominadas && typeof notify === 'function') {
      notify('🩸 As quatro fases foram dominadas... a Lua Sangrenta aguarda.', 'red');
    }
    refreshLuaUI();
  }
}

// Atualiza painel de talentos / HUD / ficha se estiverem montados na tela
function refreshLuaUI() {
  if (typeof buildTalentTreeUI === 'function' && typeof getTalentTree === 'function') {
    buildTalentTreeUI(getTalentTree());
  }
  if (typeof updateHUD === 'function') updateHUD();
  if (typeof buildCharacterScreen === 'function') buildCharacterScreen('char-content-tt');
}

// Converte hex (#rrggbb) em rgba(...) com alpha — usado pra glow/transparência
function hexToRgba(hex, alpha) {
  const h = String(hex).replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─────────────────────────────────────────────────────────────
//  MODAL — "ficar na fase atual ou sintonizar a nova"
// ─────────────────────────────────────────────────────────────
function showLuaChoiceModal(currentKey, nextKey) {
  const old = document.getElementById('lua-choice-modal');
  if (old) old.remove();

  const cur = getAssassinoLuaData(currentKey);
  const nxt = getAssassinoLuaData(nextKey);
  if (!cur || !nxt) return;

  const overlay = document.createElement('div');
  overlay.id = 'lua-choice-modal';
  overlay.style.cssText = `
    position:fixed; inset:0; z-index:10150;
    background:rgba(0,0,0,0.86);
    display:flex; align-items:center; justify-content:center;
    padding:16px;
  `;

  const box = document.createElement('div');
  box.style.cssText = `
    background:#100c04;
    border:1px solid ${hexToRgba(nxt.cor, 0.5)};
    border-top:3px solid ${nxt.cor};
    width:min(380px,94vw);
    border-radius:2px;
    font-family:'Noto Serif JP',serif;
    overflow:hidden;
    transform:scale(0.88);opacity:0;
    transition:transform 0.22s cubic-bezier(0.175,0.885,0.32,1.275),opacity 0.18s ease;
  `;

  box.innerHTML = `
    <div style="padding:18px 18px 14px;text-align:center;border-bottom:1px solid ${hexToRgba(nxt.cor, 0.25)};">
      <div style="font-size:0.5rem;letter-spacing:3px;color:rgba(200,150,10,0.7);margin-bottom:6px;">✦ FASE DOMINADA ✦</div>
      <div style="font-size:0.95rem;color:#c8960a;">${cur.icon} ${cur.nome} foi superada</div>
      <div style="font-size:0.72rem;margin-top:10px;color:${nxt.cor};">${nxt.icon} ${nxt.nome} foi construída</div>
      <div style="font-size:0.56rem;color:rgba(232,216,180,0.6);margin-top:8px;line-height:1.65;">${nxt.lore}</div>
      ${!nxt.mecanicaPronta ? `<div style="font-size:0.5rem;color:rgba(180,150,120,0.6);margin-top:8px;letter-spacing:1px;">⚒ técnicas desta fase ainda em forja</div>` : ''}
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;padding:16px 18px;">
      <button id="lua-choice-stay" style="
        padding:10px;background:rgba(200,150,10,0.08);border:1px solid rgba(200,150,10,0.35);
        color:#c8960a;font-family:'Noto Serif JP',serif;font-size:0.6rem;letter-spacing:2px;cursor:pointer;
      ">${cur.icon} CONTINUAR EM ${cur.nome.toUpperCase()}</button>
      <button id="lua-choice-switch" style="
        padding:10px;background:${hexToRgba(nxt.cor, 0.1)};border:1px solid ${hexToRgba(nxt.cor, 0.5)};
        color:${nxt.cor};font-family:'Noto Serif JP',serif;font-size:0.6rem;letter-spacing:2px;cursor:pointer;
      ">${nxt.icon} SINTONIZAR ${nxt.nome.toUpperCase()}</button>
    </div>
  `;

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  requestAnimationFrame(() => requestAnimationFrame(() => {
    box.style.transform = 'scale(1)';
    box.style.opacity = '1';
  }));

  const close = () => {
    box.style.transform = 'scale(0.9)';
    box.style.opacity = '0';
    setTimeout(() => overlay.remove(), 180);
  };

  overlay.onclick = (ev) => { if (ev.target === overlay) close(); };
  box.querySelector('#lua-choice-stay').onclick = () => close();
  box.querySelector('#lua-choice-switch').onclick = () => {
    setAssassinoLua(G.player, nextKey);
    close();
    refreshLuaUI();
  };
}

// ─────────────────────────────────────────────────────────────
//  FX — Efeito visual de golpe por fase da lua. Cada fase tem
//  identidade própria nos golpes: partículas, anel de cor, e
//  modos extras (tremor de tela na Lua Cheia, glitch na Sangrenta).
// ─────────────────────────────────────────────────────────────
const LUA_FX_CONFIG = {
  nova:       { cor: '#6a4a9a', icon: '🌑', mode: 'burst',  particles: 6 },
  crescente:  { cor: '#2a8a6a', icon: '🌒', mode: 'ring',   particles: 5 },
  cheia:      { cor: '#c2581f', icon: '🔥', mode: 'shake',  particles: 8 },
  minguante:  { cor: '#3a6a6a', icon: '🌘', mode: 'drain',  particles: 4 },
  sangrenta:  { cor: '#ff2f6e', icon: '🌌', mode: 'glitch', particles: 7 },
};

let _luaFxStylesInjected = false;
function ensureLuaFxStyles() {
  if (_luaFxStylesInjected || typeof document === 'undefined') return;
  _luaFxStylesInjected = true;
  const style = document.createElement('style');
  style.id = 'lua-fx-styles';
  style.textContent = `
    @keyframes luaFxRingPulse { from { transform:scale(0.55); opacity:0.95; } to { transform:scale(1.7); opacity:0; } }
    @keyframes luaFxParticle {
      0%   { transform:translate(-50%,-50%) scale(1); opacity:1; }
      100% { transform:translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(0.35); opacity:0; }
    }
    @keyframes luaFxParticleDrain {
      0%   { transform:translate(-50%,-50%) scale(1); opacity:1; }
      55%  { opacity:1; }
      100% { transform:translate(calc(-50% + var(--dx) * -1.6), calc(-50% + 130px)) scale(0.3); opacity:0; }
    }
    @keyframes luaFxShake {
      0%, 100% { transform:translateX(0); }
      20% { transform:translateX(-7px); }
      40% { transform:translateX(6px); }
      60% { transform:translateX(-5px); }
      80% { transform:translateX(4px); }
    }
    @keyframes luaFxGlitch {
      0%   { filter:hue-rotate(0deg) contrast(1); transform:translateX(0); }
      25%  { filter:hue-rotate(45deg) contrast(2) saturate(2.2); transform:translateX(-3px); }
      50%  { filter:hue-rotate(-35deg) contrast(1.6); transform:translateX(3px); }
      75%  { filter:hue-rotate(20deg) contrast(1.3); transform:translateX(-2px); }
      100% { filter:none; transform:translateX(0); }
    }
    .lua-fx-shake-anim  { animation: luaFxShake 0.4s ease; }
    .lua-fx-glitch-anim { animation: luaFxGlitch 0.36s steps(2); }
  `;
  document.head.appendChild(style);
}

// ─────────────────────────────────────────────────────────────
//  AMBIENTAÇÃO — identidade visual PERSISTENTE da fase da lua
//  durante toda a batalha (não só no golpe). Tinge o fundo da
//  arena, a borda do battle-overlay, e solta partículas lentas
//  de fundo continuamente enquanto a batalha estiver ativa.
// ─────────────────────────────────────────────────────────────
let _luaAmbienceInterval = null;

function ensureLuaAmbienceStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('lua-ambience-styles')) return;
  const style = document.createElement('style');
  style.id = 'lua-ambience-styles';
  style.textContent = `
    @keyframes luaAmbienceDrift {
      0%   { transform:translate(0,0) scale(1);   opacity:0; }
      10%  { opacity:0.55; }
      90%  { opacity:0.4; }
      100% { transform:translate(var(--adx), var(--ady)) scale(0.6); opacity:0; }
    }
    #battle-overlay.lua-ambience { transition: background 0.8s ease; }
    .battle-arena.lua-ambience { transition: box-shadow 1s ease, border-color 1s ease; }
    .lua-ambience-particle { position:absolute; pointer-events:none; z-index:2; will-change:transform,opacity; }
  `;
  document.head.appendChild(style);
}

// Aplica a ambientação da fase ativa do Assassino na tela de batalha.
// Chamar sempre que o battle-overlay for ativado (início de batalha
// e nos pontos de "ressuscitar e continuar batalha").
function applyLuaBattleAmbience(p) {
  if (typeof document === 'undefined') return;
  clearLuaBattleAmbience(); // sempre reinicia do zero, idempotente

  if (!p || !p.classData || p.classData.id !== 'assassino') return;
  const luaKey = getAssassinoLuaAtiva(p);
  const cfg = LUA_FX_CONFIG[luaKey];
  if (!cfg) return;

  ensureLuaFxStyles();
  ensureLuaAmbienceStyles();

  const overlay = document.getElementById('battle-overlay');
  const arena   = document.querySelector('.battle-arena');
  if (!overlay || !arena) return;

  overlay.classList.add('lua-ambience');
  arena.classList.add('lua-ambience');

  // Tingimento de fundo — mantém a base escura, só adiciona um glow radial da cor da fase
  overlay.style.background = `
    radial-gradient(ellipse 120% 60% at 50% 0%, ${hexToRgba(cfg.cor, 0.22)} 0%, transparent 65%),
    radial-gradient(ellipse 80% 40% at 20% 100%, ${hexToRgba(cfg.cor, 0.10)} 0%, transparent 50%),
    #07080f`;

  // Brilho na borda da arena, na cor da fase
  arena.style.boxShadow = `0 0 80px rgba(0,0,0,0.95), 0 0 50px ${hexToRgba(cfg.cor, 0.22)}, inset 0 0 40px ${hexToRgba(cfg.cor, 0.06)}`;
  arena.style.borderLeftColor  = hexToRgba(cfg.cor, 0.5);
  arena.style.borderRightColor = hexToRgba(cfg.cor, 0.5);

  // Partículas de fundo lentas, soltadas periodicamente enquanto a batalha durar
  const spawnAmbienceParticle = () => {
    if (!document.body.contains(arena)) { clearLuaBattleAmbience(); return; }
    const part = document.createElement('div');
    part.className = 'lua-ambience-particle';
    part.textContent = cfg.icon;
    const startX = 10 + Math.random() * 80;
    const adx = (Math.random() - 0.5) * 40;
    const ady = -60 - Math.random() * 50;
    part.style.cssText = `
      left:${startX}%; top:92%; font-size:${0.7 + Math.random() * 0.6}rem;
      filter:drop-shadow(0 0 4px ${cfg.cor});
      --adx:${adx}px; --ady:${ady}px;
      animation: luaAmbienceDrift ${3.5 + Math.random() * 2}s ease-out forwards;
    `;
    arena.appendChild(part);
    setTimeout(() => part.remove(), 6000);
  };
  spawnAmbienceParticle();
  _luaAmbienceInterval = setInterval(spawnAmbienceParticle, 1400);
}

// Remove a ambientação visual (chamar ao fechar a tela de batalha de verdade)
function clearLuaBattleAmbience() {
  if (typeof document === 'undefined') return;
  if (_luaAmbienceInterval) { clearInterval(_luaAmbienceInterval); _luaAmbienceInterval = null; }

  const overlay = document.getElementById('battle-overlay');
  const arena   = document.querySelector('.battle-arena');
  if (overlay) {
    overlay.classList.remove('lua-ambience');
    overlay.style.background = '';
  }
  if (arena) {
    arena.classList.remove('lua-ambience');
    arena.style.boxShadow = '';
    arena.style.borderLeftColor = '';
    arena.style.borderRightColor = '';
    arena.querySelectorAll('.lua-ambience-particle').forEach(el => el.remove());
  }
}

// Dispara o efeito visual do golpe da fase ativa do Assassino.
// target: 'enemy' | 'hero'. opts.heavy: efeito mais intenso (crítico/ultimate).
function triggerLuaAttackFX(p, target, opts) {
  if (typeof document === 'undefined') return;
  if (!p || !p.classData || p.classData.id !== 'assassino') return;
  const luaKey = getAssassinoLuaAtiva(p);
  const cfg = LUA_FX_CONFIG[luaKey];
  if (!cfg) return;
  opts = opts || {};

  ensureLuaFxStyles();

  const containerId = target === 'hero' ? 'bat-hero-side' : 'bat-enemy-side';
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!container.style.position) container.style.position = 'relative';

  // Tremor de tela — Lua Cheia (e qualquer golpe pesado)
  if (cfg.mode === 'shake' || opts.heavy) {
    const arena = document.querySelector('.battle-arena');
    if (arena) {
      arena.classList.remove('lua-fx-shake-anim');
      void arena.offsetWidth; // reinicia a animação
      arena.classList.add('lua-fx-shake-anim');
    }
  }

  // Glitch cósmico — Lua Sangrenta
  if (cfg.mode === 'glitch') {
    const icon = document.getElementById(target === 'hero' ? 'bat-hero-icon' : 'bat-enemy-icon');
    if (icon) {
      icon.classList.remove('lua-fx-glitch-anim');
      void icon.offsetWidth;
      icon.classList.add('lua-fx-glitch-anim');
    }
  }

  // Anel de cor pulsante
  const ring = document.createElement('div');
  ring.style.cssText = `
    position:absolute; inset:-6px; border-radius:50%;
    border:2px solid ${cfg.cor}; box-shadow:0 0 18px ${hexToRgba(cfg.cor, 0.8)};
    opacity:0.95; pointer-events:none; z-index:30;
    animation:luaFxRingPulse 0.6s ease forwards;
  `;
  container.appendChild(ring);
  setTimeout(() => ring.remove(), 650);

  // Partículas temáticas da fase
  const particleCount = opts.heavy ? cfg.particles + 3 : cfg.particles;
  for (let i = 0; i < particleCount; i++) {
    const part = document.createElement('div');
    part.textContent = cfg.icon;
    const angle = Math.random() * 360;
    const dist = 26 + Math.random() * 36;
    const dx = Math.cos(angle * Math.PI / 180) * dist;
    const dy = Math.sin(angle * Math.PI / 180) * dist;
    part.style.cssText = `
      position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);
      font-size:${0.65 + Math.random() * 0.55}rem; pointer-events:none; z-index:31;
      opacity:0.95; filter:drop-shadow(0 0 4px ${cfg.cor});
      --dx:${dx}px; --dy:${dy}px;
      animation:${cfg.mode === 'drain' ? 'luaFxParticleDrain' : 'luaFxParticle'} 0.85s ease forwards;
    `;
    container.appendChild(part);
    setTimeout(() => part.remove(), 900);
  }
}

// ─────────────────────────────────────────────────────────────
//  SKILLS DA FASE ATIVA (mescladas na lista de skills equipáveis)
// ─────────────────────────────────────────────────────────────
function getLuaSkills(p) {
  if (!p || !p.classData || p.classData.id !== 'assassino') return [];
  ensureAssassinoLuaDefault(p);
  const lua = getAssassinoLuaData(getAssassinoLuaAtiva(p));
  if (!lua || !lua.skills || !lua.skills.length) return [];
  return lua.skills.map(sk => ({ ...sk, isTalent: true }));
}

// Executa as skills da fase ativa (chamadas via dmg 'TALENT_LUA_...')
function executeLuaSkill(sk, p, e, bs) {
  const dmgStr = sk.dmg;

  // Desgaste do "vazio aberto": a penalidade de DEF da ultimate da Lua
  // Sangrenta dura 2 ações do jogador, contadas a partir da PRÓXIMA skill.
  if (p._lua_sangrenta_def_penalty_turns > 0 && dmgStr !== 'TALENT_LUA_SANG_ULTIMATE') {
    p._lua_sangrenta_def_penalty_turns -= 1;
    if (p._lua_sangrenta_def_penalty_turns <= 0 && p._lua_sangrenta_def_penalty_value) {
      p.def = (p.def || 0) + p._lua_sangrenta_def_penalty_value;
      p._lua_sangrenta_def_penalty_value = 0;
    }
  }

  if (dmgStr === 'TALENT_LUA_CORTE_INVISIVEL') {
    const isFirstStrike = !bs._lua_first_strike_used;
    bs._lua_first_strike_used = true;

    const effectiveDef = Math.floor((e.def || 0) * 0.7); // ignora 30% da DEF
    let d = Math.max(1, Math.floor(p.atk * 1.8 - effectiveDef / 3 + Math.random() * 5));
    let isCrit = isFirstStrike || Math.random() < 0.12;
    if (isFirstStrike) d *= 2;
    if (isCrit) d = Math.floor(d * 1.85);

    bs.enemyHp -= d;
    appendBattleLog(`🌑 Corte Invisível${isFirstStrike ? ' — golpe das sombras!' : ''}: ${isCrit ? 'CRÍTICO! ' : ''}${d} HP!`, '#6a4a9a');
    showFloatingNumber('enemy', d, isCrit ? 'crit' : 'dmg');
    flashDamage('enemy');
    if (typeof triggerLuaAttackFX === 'function') triggerLuaAttackFX(p, 'enemy');
    if (typeof animEnemyHit === 'function') animEnemyHit();

    return { skipEnemyTurn: false, enemyStunned: false, apGain: isCrit ? 12 : 6 };
  }

  if (dmgStr === 'TALENT_LUA_VEU_SOMBRIO') {
    const d = Math.max(1, Math.floor(p.atk * 1.1 - (e.def || 0) / 4 + Math.random() * 4));
    bs.enemyHp -= d;

    let cegou = false;
    if (Math.random() < 0.45) {
      bs._enemyBlinded = true;
      bs._enemyBlindedTurns = 2;
      cegou = true;
    }

    appendBattleLog(`👁️ Véu Sombrio: -${d} HP${cegou ? ' + 🌑 Inimigo Cego por 2 turnos!' : ''}`, '#4a3a6a');
    showFloatingNumber('enemy', d, 'dmg');
    if (cegou) showFloatingNumber('enemy', '🌑 CEGO', 'status');
    flashDamage('enemy');
    if (typeof triggerLuaAttackFX === 'function') triggerLuaAttackFX(p, 'enemy');

    return { skipEnemyTurn: false, enemyStunned: false, apGain: 6 };
  }

  // ── Lua Crescente: Eclipse Lunar ⇄ Eclipse Solar ──
  if (dmgStr === 'TALENT_LUA_ECLIPSE') {
    const stacksBefore = p._eclipse_stacks || 0;
    const mode = p._eclipse_mode || 'lunar'; // 'lunar' = luas claras · 'solar' = luas escuras
    const isSupremo = stacksBefore >= 3; // 4ª lua completa o ciclo = ataque supremo

    let atkBonus = 0, critBonus = 0;
    if (isSupremo) {
      if (mode === 'lunar') atkBonus = 10;
      else critBonus = 0.10;
    }

    const effAtk = (p.atk || 0) + atkBonus;
    const mult = isSupremo ? 1.0 : 0.85; // golpes que só acumulam luas saem 15% mais fracos
    let d = Math.max(1, Math.floor(effAtk * 1.2 * mult - (e.def || 0) / 3 + Math.random() * 4));
    let isCrit = Math.random() < (0.18 + critBonus);
    if (isCrit) d = Math.floor(d * 1.8);
    bs.enemyHp -= d;

    const nomeAtaque = mode === 'lunar' ? 'Eclipse Lunar' : 'Eclipse Solar';
    const corAtaque  = mode === 'lunar' ? '#2a8a6a' : '#504070';

    if (isSupremo) {
      // Ciclo completo — reseta as luas e alterna pro próximo modo
      p._eclipse_stacks = 0;
      p._eclipse_mode = (mode === 'lunar') ? 'solar' : 'lunar';
      const bonusTxt = mode === 'lunar' ? '+10 ATQ' : '+10% crítico';
      appendBattleLog(`🌘 ${nomeAtaque} completo! (${bonusTxt}) ${isCrit ? 'CRÍTICO! ' : ''}${d} HP! As luas ${mode === 'lunar' ? 'escurecem...' : 'voltam a brilhar...'}`, corAtaque);
      if (typeof notify === 'function') notify(`${mode === 'lunar' ? '🌑' : '🌕'} ${nomeAtaque} ativado!`, mode === 'lunar' ? 'purple' : 'gold');
    } else {
      p._eclipse_stacks = stacksBefore + 1;
      appendBattleLog(`${mode === 'lunar' ? '🌒' : '🌘'} ${nomeAtaque}: ${isCrit ? 'CRÍTICO! ' : ''}${d} HP! (${p._eclipse_stacks}/4 luas)`, corAtaque);
    }

    showFloatingNumber('enemy', d, isCrit ? 'crit' : 'dmg');
    flashDamage('enemy');
    if (typeof triggerLuaAttackFX === 'function') triggerLuaAttackFX(p, 'enemy');
    if (typeof animEnemyHit === 'function') animEnemyHit();

    return { skipEnemyTurn: false, enemyStunned: false, apGain: isSupremo ? 16 : (isCrit ? 12 : 6) };
  }

  if (dmgStr === 'TALENT_LUA_INVESTIDA_CRESCENTE') {
    const stacks = p._eclipse_stacks || 0;
    let d = Math.max(1, Math.floor(p.atk * 1.0 * Math.max(1, stacks) - (e.def || 0) / 3 + Math.random() * 5));
    const isCrit = stacks >= 3 || Math.random() < 0.15;
    if (isCrit) d = Math.floor(d * 1.7);
    bs.enemyHp -= d;
    p._eclipse_stacks = 0;

    appendBattleLog(`🌗 Investida Crescente: ${isCrit ? 'CRÍTICO! ' : ''}${d} HP! (${stacks} luas consumidas)`, '#2a8a6a');
    showFloatingNumber('enemy', d, isCrit ? 'crit' : 'dmg');
    flashDamage('enemy');
    if (typeof triggerLuaAttackFX === 'function') triggerLuaAttackFX(p, 'enemy');
    if (typeof animEnemyHit === 'function') animEnemyHit();

    return { skipEnemyTurn: false, enemyStunned: false, apGain: isCrit ? 14 : 7 };
  }

  // ── Lua Cheia ──
  if (dmgStr === 'TALENT_LUA_INVESTIDA_ELEMENTAL') {
    // Skill assíncrona: abre o overlay de escolha de elemento e só
    // finaliza o turno quando o jogador escolher (ver palDinh.js).
    if (typeof openLuaCheiaInvestidaOverlay === 'function') {
      openLuaCheiaInvestidaOverlay(p, e, bs);
    }
    return { skipEnemyTurn: false, enemyStunned: false, apGain: 0, async: true };
  }

  if (dmgStr === 'TALENT_LUA_INVESTIDA_LUNAR') {
    let d = Math.max(1, Math.floor(p.atk * 2.2 - (e.def || 0) / 3 + Math.random() * 6));
    const isCrit = Math.random() < 0.25 + (BATTLE_CONFIG.CRIT_BASE_CHANCE || 0);
    if (isCrit) d = Math.floor(d * BATTLE_CONFIG.CRIT_MULTIPLIER);
    bs.enemyHp -= d;

    const recoil = Math.max(1, Math.floor((p.maxHp || p.hp) * 0.06));
    p.hp = Math.max(1, p.hp - recoil);

    appendBattleLog(`🌕 Investida Lunar: ${isCrit ? 'CRÍTICO! ' : ''}${d} HP! (recuo: -${recoil} HP próprio)`, '#c2581f');
    showFloatingNumber('enemy', d, isCrit ? 'crit' : 'dmg');
    showFloatingNumber('player', recoil, 'dmg');
    if (typeof triggerLuaAttackFX === 'function') triggerLuaAttackFX(p, 'hero');
    flashDamage('enemy');
    if (typeof triggerLuaAttackFX === 'function') triggerLuaAttackFX(p, 'enemy');
    if (typeof animEnemyHit === 'function') animEnemyHit();

    return { skipEnemyTurn: false, enemyStunned: false, apGain: isCrit ? 14 : 7 };
  }

  if (dmgStr === 'TALENT_LUA_FURIA_CHEIA') {
    const effectiveDef = Math.floor((e.def || 0) * 0.8); // ignora 20% da DEF
    let d = Math.max(1, Math.floor(p.atk * 3.0 - effectiveDef / 3 + Math.random() * 8));
    bs.enemyHp -= d;

    const recoil = Math.max(1, Math.floor(p.hp * 0.10));
    p.hp = Math.max(1, p.hp - recoil);

    appendBattleLog(`🔥 Fúria da Lua Cheia: -${d} HP! (custo: -${recoil} HP próprio)`, '#c2581f');
    showFloatingNumber('enemy', d, 'dmg');
    showFloatingNumber('player', recoil, 'dmg');
    if (typeof triggerLuaAttackFX === 'function') triggerLuaAttackFX(p, 'hero');
    flashDamage('enemy');
    if (typeof triggerLuaAttackFX === 'function') triggerLuaAttackFX(p, 'enemy');
    if (typeof animEnemyHit === 'function') animEnemyHit();

    return { skipEnemyTurn: false, enemyStunned: false, apGain: 14 };
  }

  // ── Lua Minguante ──
  if (dmgStr === 'TALENT_LUA_SANGUESSUGA') {
    let d = Math.max(1, Math.floor(p.atk * 1.3 - (e.def || 0) / 3 + Math.random() * 4));
    const isCrit = Math.random() < 0.15;
    if (isCrit) d = Math.floor(d * 1.7);
    bs.enemyHp -= d;

    const heal = Math.max(1, Math.floor(d * 0.4));
    p.hp = Math.min(p.maxHp || p.hp, p.hp + heal);

    appendBattleLog(`🩸 Sanguessuga Sombria: ${isCrit ? 'CRÍTICO! ' : ''}${d} HP! Cura ${heal} HP.`, '#3a6a6a');
    showFloatingNumber('enemy', d, isCrit ? 'crit' : 'dmg');
    showFloatingNumber('player', heal, 'heal');
    flashDamage('enemy');
    if (typeof triggerLuaAttackFX === 'function') triggerLuaAttackFX(p, 'enemy');
    if (typeof animEnemyHit === 'function') animEnemyHit();

    return { skipEnemyTurn: false, enemyStunned: false, apGain: isCrit ? 12 : 6 };
  }

  if (dmgStr === 'TALENT_LUA_MALDICAO') {
    let d = Math.max(1, Math.floor(p.atk * 1.0 - (e.def || 0) / 4 + Math.random() * 3));
    bs.enemyHp -= d;

    e.atk = Math.max(0, Math.floor((e.atk || 0) * 0.75));
    bs._enemyCursedTurns = 3;

    const heal = Math.max(1, Math.floor(d * 0.25));
    p.hp = Math.min(p.maxHp || p.hp, p.hp + heal);

    appendBattleLog(`🌘 Maldição Minguante: -${d} HP! ATQ inimigo -25% por 3 turnos. Cura ${heal} HP.`, '#3a6a6a');
    showFloatingNumber('enemy', d, 'dmg');
    showFloatingNumber('enemy', '🌘 MALDITO', 'status');
    showFloatingNumber('player', heal, 'heal');
    flashDamage('enemy');
    if (typeof triggerLuaAttackFX === 'function') triggerLuaAttackFX(p, 'enemy');

    return { skipEnemyTurn: false, enemyStunned: false, apGain: 7 };
  }

  // ── Lua Sangrenta — Investida Pesada (arma a aposta) ──
  if (dmgStr === 'TALENT_LUA_SANG_APOSTA') {
    p._lua_sangrenta_aposta = true;
    appendBattleLog(`🌌 Convergência Cósmica: o próximo golpe corrompido está armado para Investida Pesada.`, '#8a0d18');
    showFloatingNumber('player', '🌌 ARMADO', 'status');
    if (typeof triggerLuaAttackFX === 'function') triggerLuaAttackFX(p, 'hero');
    return { skipEnemyTurn: false, enemyStunned: false, apGain: 4 };
  }

  // Resolve a Investida Pesada armada: retorna {amp, selfCost} e consome a aposta
  function resolveApostaPesada(p, baseSelfCostPct) {
    if (!p._lua_sangrenta_aposta) return { amp: 1, selfCost: 0, apostou: false };
    p._lua_sangrenta_aposta = false;
    const folegoFavoravel = Math.random() < 0.5;
    if (folegoFavoravel) {
      return { amp: 1.8, selfCost: 0, apostou: true, favoravel: true };
    }
    const selfCost = Math.max(1, Math.floor((p.maxHp || p.hp) * baseSelfCostPct));
    p.hp = Math.max(1, p.hp - selfCost);
    return { amp: 1.8, selfCost, apostou: true, favoravel: false };
  }

  if (dmgStr === 'TALENT_LUA_SANG_CORTE_VAZIO') {
    const aposta = resolveApostaPesada(p, 0.10);
    const effectiveDef = Math.floor((e.def || 0) * 0.5);
    let d = Math.max(1, Math.floor(p.atk * 2.0 * aposta.amp - effectiveDef / 3 + Math.random() * 6));
    bs.enemyHp -= d;
    p._lua_corrupcao = Math.min(100, (p._lua_corrupcao || 0) + 18);

    let msg = `🕳️ Corte do Vazio: -${d} HP!`;
    if (aposta.apostou) msg += aposta.favoravel ? ' Fôlego cósmico favorável — amplificado de graça!' : ` Fôlego hostil — custou ${aposta.selfCost} HP próprio.`;
    appendBattleLog(msg + ` (Corrupção: ${p._lua_corrupcao}/100)`, '#8a0d18');
    showFloatingNumber('enemy', d, 'dmg');
    if (aposta.selfCost) showFloatingNumber('player', aposta.selfCost, 'dmg');
    flashDamage('enemy');
    if (typeof triggerLuaAttackFX === 'function') triggerLuaAttackFX(p, 'enemy');
    if (typeof animEnemyHit === 'function') animEnemyHit();

    return { skipEnemyTurn: false, enemyStunned: false, apGain: 10 };
  }

  if (dmgStr === 'TALENT_LUA_SANG_COLAPSO') {
    const aposta = resolveApostaPesada(p, 0.10);
    const corrupcaoMult = 1 + (p._lua_corrupcao || 0) / 100 * 0.6; // até +60% a 100 corrupção
    let d = Math.max(1, Math.floor(p.atk * 1.8 * corrupcaoMult * aposta.amp - (e.def || 0) / 3 + Math.random() * 6));
    bs.enemyHp -= d;
    p._lua_corrupcao = Math.min(100, (p._lua_corrupcao || 0) + 22);

    let msg = `💫 Colapso Estelar: -${d} HP!`;
    if (aposta.apostou) msg += aposta.favoravel ? ' Fôlego favorável!' : ` Fôlego hostil — -${aposta.selfCost} HP próprio.`;
    appendBattleLog(msg + ` (Corrupção: ${p._lua_corrupcao}/100)`, '#8a0d18');
    showFloatingNumber('enemy', d, 'dmg');
    if (aposta.selfCost) showFloatingNumber('player', aposta.selfCost, 'dmg');
    flashDamage('enemy');
    if (typeof triggerLuaAttackFX === 'function') triggerLuaAttackFX(p, 'enemy');
    if (typeof animEnemyHit === 'function') animEnemyHit();

    return { skipEnemyTurn: false, enemyStunned: false, apGain: 12 };
  }

  if (dmgStr === 'TALENT_LUA_SANG_IMPACTO') {
    const aposta = resolveApostaPesada(p, 0.12);
    let d = Math.max(1, Math.floor(p.atk * 3.2 * aposta.amp - (e.def || 0) / 4 + Math.random() * 8));
    bs.enemyHp -= d;
    p._lua_corrupcao = Math.min(100, (p._lua_corrupcao || 0) + 25);

    let recoil = Math.max(1, Math.floor(p.hp * 0.08));
    if (aposta.apostou && aposta.favoravel) recoil *= 2; // amplificado também dobra o recuo natural
    p.hp = Math.max(1, p.hp - recoil);

    let msg = `☄️ Impacto de Outro Mundo: -${d} HP! (recuo: -${recoil} HP)`;
    if (aposta.apostou) msg += aposta.favoravel ? ' Fôlego favorável — amplificado!' : ` Fôlego hostil — +${aposta.selfCost} HP de custo.`;
    appendBattleLog(msg + ` (Corrupção: ${p._lua_corrupcao}/100)`, '#8a0d18');
    showFloatingNumber('enemy', d, 'crit');
    showFloatingNumber('player', recoil + aposta.selfCost, 'dmg');
    if (typeof triggerLuaAttackFX === 'function') triggerLuaAttackFX(p, 'hero');
    flashDamage('enemy');
    if (typeof triggerLuaAttackFX === 'function') triggerLuaAttackFX(p, 'enemy');
    if (typeof animEnemyHit === 'function') animEnemyHit();

    return { skipEnemyTurn: false, enemyStunned: false, apGain: 16 };
  }

  if (dmgStr === 'TALENT_LUA_SANG_SUGADOR') {
    const aposta = resolveApostaPesada(p, 0.08);
    let d = Math.max(1, Math.floor(p.atk * 1.4 * aposta.amp - (e.def || 0) / 4 + Math.random() * 4));
    bs.enemyHp -= d;
    const heal = Math.max(1, Math.floor(d * 0.55));
    p.hp = Math.min(p.maxHp || p.hp, p.hp + heal);
    e.atk = Math.max(0, (e.atk || 0) - 1);
    p._lua_corrupcao = Math.min(100, (p._lua_corrupcao || 0) + 15);

    let msg = `👁️ Sugador Abissal: -${d} HP! Cura ${heal} HP. Roubou 1 ATQ do inimigo.`;
    if (aposta.apostou) msg += aposta.favoravel ? ' Fôlego favorável!' : ` Fôlego hostil — -${aposta.selfCost} HP próprio.`;
    appendBattleLog(msg + ` (Corrupção: ${p._lua_corrupcao}/100)`, '#8a0d18');
    showFloatingNumber('enemy', d, 'dmg');
    showFloatingNumber('player', heal, 'heal');
    if (aposta.selfCost) showFloatingNumber('player', aposta.selfCost, 'dmg');
    flashDamage('enemy');
    if (typeof triggerLuaAttackFX === 'function') triggerLuaAttackFX(p, 'enemy');

    return { skipEnemyTurn: false, enemyStunned: false, apGain: 10 };
  }

  if (dmgStr === 'TALENT_LUA_SANG_ULTIMATE') {
    if ((p._lua_corrupcao || 0) < 100) {
      appendBattleLog(`🌠 Implosão de um Outro Mundo exige 100 de Corrupção (atual: ${p._lua_corrupcao || 0}/100).`, '#8a0d18');
      if (typeof notify === 'function') notify('🌠 Corrupção insuficiente para a ultimate.', 'red');
      return { skipEnemyTurn: false, enemyStunned: false, apGain: 0 };
    }

    let d = Math.max(1, Math.floor(p.atk * 5.0 - (e.def || 0) / 5 + Math.random() * 10));
    bs.enemyHp -= d;
    p._lua_corrupcao = 0;

    p._lua_sangrenta_def_penalty_value = Math.floor((p.def || 0) * 0.5);
    p.def = Math.max(0, (p.def || 0) - p._lua_sangrenta_def_penalty_value);
    p._lua_sangrenta_def_penalty_turns = 2;

    appendBattleLog(`🌠 Implosão de um Outro Mundo: ${d} HP devastadores! O Assassino fica -50% DEF por 2 ações.`, '#ff2f6e');
    showFloatingNumber('enemy', d, 'crit');
    showFloatingNumber('player', '🌠 VAZIO ABERTO', 'status');
    if (typeof triggerLuaAttackFX === 'function') triggerLuaAttackFX(p, 'hero', { heavy: true });
    flashDamage('enemy');
    if (typeof triggerLuaAttackFX === 'function') triggerLuaAttackFX(p, 'enemy');
    if (typeof animEnemyHit === 'function') animEnemyHit();

    return { skipEnemyTurn: false, enemyStunned: false, apGain: 20 };
  }

  return { skipEnemyTurn: false, enemyStunned: false, apGain: 0 };
}

// ─────────────────────────────────────────────────────────────
//  UI — barra de progresso grande de cada fase
// ─────────────────────────────────────────────────────────────
function buildLuaBarHTML(lua, isAtiva, construida, dominada, wins, threshold) {
  if (!construida) {
    return `
      <div class="lua-bar-track" style="margin-top:10px;height:16px;background:rgba(0,0,0,0.45);border:1px solid rgba(120,100,140,0.25);position:relative;overflow:hidden;">
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:0.5rem;color:rgba(120,100,140,0.6);letter-spacing:1px;">🔒 SELADA</div>
      </div>`;
  }

  const pct = dominada ? 100 : Math.min(100, Math.round((wins / threshold) * 100));
  const cor = lua.cor;

  return `
    <div class="lua-bar-track" style="margin-top:10px;height:16px;background:rgba(0,0,0,0.45);border:1px solid ${hexToRgba(cor, 0.35)};position:relative;overflow:hidden;">
      <div class="lua-bar-fill${dominada ? ' lua-bar-dominated' : ''}" style="height:100%;width:${pct}%;background:linear-gradient(90deg, ${hexToRgba(cor, 0.5)}, ${cor});transition:width 0.7s cubic-bezier(0.22,0.9,0.3,1);${isAtiva && !dominada ? `box-shadow:0 0 8px ${hexToRgba(cor, 0.6)};` : ''}"></div>
    </div>
    <div style="margin-top:4px;font-size:0.5rem;letter-spacing:1px;color:${dominada ? cor : 'rgba(176,160,192,0.55)'};">
      ${dominada ? '✦ FASE DOMINADA ✦' : `${wins}/${threshold} vitórias${isAtiva ? '' : ' · sintonize para progredir'}`}
    </div>`;
}

// ─────────────────────────────────────────────────────────────
//  UI — Painel "Fases da Lua" (substitui a árvore de talentos
//  no overlay do Assassino). Estética dark Ukiyo-e.
// ─────────────────────────────────────────────────────────────
function buildLuaPanelHTML(cls) {
  const p = G.player;
  ensureAssassinoLuaDefault(p);
  const ativa      = getAssassinoLuaAtiva(p);
  const dominadas  = p._lua_dominadas || {};
  const winsAtual  = p._lua_wins || 0;

  const cardsHTML = ASSASSINO_LUAS.map(lua => {
    const isAtiva    = ativa === lua.key;
    const construida = isLuaConstruida(lua.key, p);
    const dominada   = !!dominadas[lua.key];
    const threshold  = lua.winsToMaster || 10;
    const wins       = isAtiva ? winsAtual : 0;
    const borderColor = isAtiva ? '#c8960a' : (!construida ? 'rgba(120,40,60,0.22)' : lua.cor);
    const glowBg = construida ? `radial-gradient(circle at 28% 18%, ${hexToRgba(lua.cor, 0.16)}, transparent 62%), ` : '';

    let detailHTML;
    if (!construida) {
      const prevLua = getPrevLuaData(lua.key);
      detailHTML = `<div style="margin-top:8px;font-size:0.54rem;color:rgba(120,100,140,0.6);letter-spacing:1px;">🔒 Domine ${prevLua ? prevLua.nome : ''} para construir esta fase.</div>`;
    } else if (!lua.mecanicaPronta) {
      detailHTML = `<div style="margin-top:8px;font-size:0.54rem;color:rgba(180,150,120,0.65);letter-spacing:1px;">⚒ Fase construída — técnicas ainda em forja.</div>`;
    } else {
      detailHTML = `
        <div style="margin-top:8px;display:flex;flex-direction:column;gap:3px;">
          <div style="font-size:0.54rem;color:#7ac88a;">✦ ${lua.beneficio}</div>
          <div style="font-size:0.54rem;color:#c87a7a;">✦ ${lua.maleficio}</div>
        </div>`;
    }

    return `
      <div class="lua-card${isAtiva ? ' lua-card-active' : ''}" style="background:${glowBg}linear-gradient(180deg, rgba(10,8,18,0.92), rgba(20,12,28,0.92));
                  border:1px solid ${borderColor};
                  ${isAtiva ? `box-shadow:0 0 14px ${hexToRgba(lua.cor, 0.35)};` : ''}
                  padding:12px;margin-bottom:10px;position:relative;${!construida ? 'opacity:0.55;' : ''}">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="display:inline-flex;width:1.9rem;height:1.9rem;border-radius:50%;overflow:hidden;flex-shrink:0;${!construida ? 'filter:grayscale(1);opacity:0.6;' : ''}">${lua.iconImg ? `<img src="${lua.iconImg}" alt="${lua.nome}" style="width:100%;height:100%;object-fit:cover;" onerror="this.outerHTML='${lua.icon}'">` : lua.icon}</span>
          <div style="flex:1;">
            <div style="font-family:'Noto Serif JP',serif;font-size:0.8rem;color:${isAtiva ? '#c8960a' : (construida ? lua.cor : '#b0a0c0')};letter-spacing:1px;">
              ${lua.nome}${isAtiva ? ' <span style="font-size:0.48rem;color:#c8960a;">● ATIVA</span>' : ''}${dominada ? ` <span style="font-size:0.48rem;color:${lua.cor};">✦ DOMINADA</span>` : ''}
            </div>
            <div style="font-size:0.54rem;color:rgba(176,160,192,0.55);margin-top:3px;line-height:1.55;">${lua.lore}</div>
          </div>
        </div>
        ${detailHTML}
        ${buildLuaBarHTML(lua, isAtiva, construida, dominada, wins, threshold)}
        ${construida && !isAtiva ? `
        <button onclick="window.onLuaCardClick && window.onLuaCardClick('${lua.key}')" style="
          margin-top:10px;width:100%;padding:7px;background:${hexToRgba(lua.cor, 0.08)};
          border:1px solid ${hexToRgba(lua.cor, 0.4)};color:${lua.cor};font-family:'Noto Serif JP',serif;
          font-size:0.58rem;letter-spacing:2px;cursor:pointer;">SINTONIZAR</button>` : ''}
      </div>`;
  }).join('');

  const sg = ASSASSINO_LUA_SANGRENTA;
  const dominadasCount  = ASSASSINO_LUAS.filter(l => dominadas[l.key]).length;
  const totalFases      = ASSASSINO_LUAS.length;
  const todasDominadas  = dominadasCount === totalFases;
  const sgAtiva         = ativa === sg.key;
  const corrupcao       = sgAtiva ? (p._lua_corrupcao || 0) : 0;

  const segmentsHTML = ASSASSINO_LUAS.map(l => {
    const filled = !!dominadas[l.key];
    return `<div style="flex:1;height:100%;background:${filled ? sg.cor : 'rgba(255,255,255,0.05)'};${filled ? `box-shadow:0 0 6px ${hexToRgba(sg.cor, 0.55)};` : ''}"></div>`;
  }).join('<div style="width:2px;background:rgba(0,0,0,0.6);"></div>');

  const sangrentaHTML = `
    <div style="margin-top:14px;border-top:1px solid rgba(120,10,20,0.3);padding-top:12px;">
      <div style="font-size:0.5rem;color:rgba(180,30,50,0.55);letter-spacing:3px;margin-bottom:8px;">✦ FORMA FINAL</div>
      <div style="background:linear-gradient(180deg, rgba(30,4,8,0.9), rgba(10,2,4,0.95));
                  border:1px solid ${sgAtiva ? '#c8960a' : 'rgba(120,10,20,0.4)'};padding:12px;${todasDominadas ? '' : 'opacity:0.6;'}
                  ${sgAtiva ? `box-shadow:0 0 14px ${hexToRgba(sg.cor, 0.4)};` : ''}">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="display:inline-flex;width:1.9rem;height:1.9rem;border-radius:50%;overflow:hidden;flex-shrink:0;${todasDominadas ? '' : 'filter:grayscale(0.6);opacity:0.7;'}">${sg.iconImg ? `<img src="${sg.iconImg}" alt="${sg.nome}" style="width:100%;height:100%;object-fit:cover;" onerror="this.outerHTML='${sg.icon}'">` : sg.icon}</span>
          <div>
            <div style="font-family:'Noto Serif JP',serif;font-size:0.8rem;color:#a01828;letter-spacing:1px;">
              ${sg.nome}${sgAtiva ? ' <span style="font-size:0.48rem;color:#c8960a;">● ATIVA</span>' : ''} <span style="font-size:0.52rem;color:rgba(180,30,50,0.6);">— ${sg.subtitulo}</span>
            </div>
            <div style="font-size:0.54rem;color:rgba(180,140,150,0.5);margin-top:3px;line-height:1.55;">${sg.lore}</div>
          </div>
        </div>
        ${todasDominadas ? `
        <div style="margin-top:8px;display:flex;flex-direction:column;gap:3px;">
          <div style="font-size:0.54rem;color:#7ac88a;">✦ ${sg.beneficio}</div>
          <div style="font-size:0.54rem;color:#c87a7a;">✦ ${sg.maleficio}</div>
        </div>` : ''}
        <div style="margin-top:10px;display:flex;height:16px;border:1px solid ${hexToRgba(sg.cor, 0.35)};background:rgba(0,0,0,0.45);overflow:hidden;">
          ${segmentsHTML}
        </div>
        <div style="margin-top:4px;font-size:0.5rem;letter-spacing:1px;color:${todasDominadas ? sg.cor : 'rgba(180,30,50,0.55)'};">
          ${todasDominadas ? '🔥 4/4 fases dominadas — pronta para ser forjada' : `${dominadasCount}/${totalFases} fases dominadas`}
        </div>
        ${sgAtiva ? `
        <div style="margin-top:10px;">
          <div style="font-size:0.48rem;letter-spacing:2px;color:#ff2f6e;margin-bottom:3px;">CORRUPÇÃO ${corrupcao}/100</div>
          <div style="height:10px;border:1px solid rgba(255,47,110,0.4);background:rgba(0,0,0,0.45);overflow:hidden;">
            <div style="height:100%;width:${corrupcao}%;background:linear-gradient(90deg,#7c1fd1,#ff2f6e);${corrupcao>=100?'box-shadow:0 0 10px rgba(255,47,110,0.8);':''}"></div>
          </div>
        </div>` : ''}
        ${todasDominadas && !sgAtiva ? `
        <button onclick="window.onLuaCardClick && window.onLuaCardClick('${sg.key}')" style="
          margin-top:10px;width:100%;padding:7px;background:${hexToRgba(sg.cor, 0.1)};
          border:1px solid ${hexToRgba(sg.cor, 0.5)};color:#ff2f6e;font-family:'Noto Serif JP',serif;
          font-size:0.58rem;letter-spacing:2px;cursor:pointer;">SINTONIZAR</button>` : ''}
      </div>
    </div>`;

  return `
    <div style="margin:14px 12px 0;">
      <div style="font-size:0.56rem;color:rgba(176,160,192,0.5);letter-spacing:3px;margin-bottom:8px;">✦ FASES DA LUA</div>
      ${cardsHTML}
      ${sangrentaHTML}
    </div>`;
}

// Handler do botão "SINTONIZAR" nos cards
window.onLuaCardClick = function (luaKey) {
  const p = G.player;
  const ok = setAssassinoLua(p, luaKey);
  if (ok) refreshLuaUI();
};

// ─────────────────────────────────────────────────────────────
//  PONTE — encaixa o sistema de Luas no fluxo já existente de
//  getTalentSkills()/executeTalentSkill() (talent_system.js),
//  sem precisar tocar em palDinh.js. Mesmo padrão usado pelo
//  Mago para suas reações elementais. Também escuta vitórias
//  (applyTalentOnVictory) pra alimentar a barra de progresso.
// ─────────────────────────────────────────────────────────────
(function () {
  const _origGetTalentSkills = window.getTalentSkills;
  window.getTalentSkills = function () {
    const base = (typeof _origGetTalentSkills === 'function') ? _origGetTalentSkills() : [];
    const p = (typeof G !== 'undefined') ? G.player : null;
    if (p && p.classData && p.classData.id === 'assassino') {
      return base.concat(getLuaSkills(p));
    }
    return base;
  };

  const _origExecuteTalentSkill = window.executeTalentSkill;
  window.executeTalentSkill = function (sk, p, e, bs) {
    if (sk && sk.dmg && sk.dmg.startsWith('TALENT_LUA_')) {
      return executeLuaSkill(sk, p, e, bs);
    }
    if (typeof _origExecuteTalentSkill === 'function') return _origExecuteTalentSkill(sk, p, e, bs);
    return { skipEnemyTurn: false, enemyStunned: false, apGain: 0 };
  };

  const _origApplyTalentOnVictory = window.applyTalentOnVictory;
  window.applyTalentOnVictory = function (enemy, bs) {
    if (typeof _origApplyTalentOnVictory === 'function') _origApplyTalentOnVictory(enemy, bs);
    const p = (typeof G !== 'undefined') ? G.player : null;
    if (p && p.classData && p.classData.id === 'assassino') {
      registerAssassinoVictory(p);
    }
  };
})();

// ─────────────────────────────────────────────────────────────
//  EXPORTS
// ─────────────────────────────────────────────────────────────
window.ASSASSINO_LUAS            = ASSASSINO_LUAS;
window.ASSASSINO_LUA_SANGRENTA   = ASSASSINO_LUA_SANGRENTA;
window.getAssassinoLuaData       = getAssassinoLuaData;
window.getAssassinoLuaAtiva      = getAssassinoLuaAtiva;
window.ensureAssassinoLuaDefault = ensureAssassinoLuaDefault;
window.setAssassinoLua           = setAssassinoLua;
window.showLuaEclipseEffect      = showLuaEclipseEffect;
window.clearAssassinoLuaEffects  = clearAssassinoLuaEffects;
window.getNextLuaKey              = getNextLuaKey;
window.isLuaConstruida            = isLuaConstruida;
window.registerAssassinoVictory   = registerAssassinoVictory;
window.refreshLuaUI               = refreshLuaUI;
window.showLuaChoiceModal         = showLuaChoiceModal;
window.getLuaSkills              = getLuaSkills;
window.executeLuaSkill           = executeLuaSkill;
window.buildLuaPanelHTML         = buildLuaPanelHTML;
window.triggerLuaAttackFX        = triggerLuaAttackFX;
window.applyLuaBattleAmbience    = applyLuaBattleAmbience;
window.clearLuaBattleAmbience    = clearLuaBattleAmbience;
