// ══════════════════════════════════════════════════════════════
//  CHRONICLES OF CLIVOR — assassino_lunar.js
//  SISTEMA "FASES DA LUA" — Super Talentos do Assassino
//  ──────────────────────────────────────────────────────────
//  PARTE 1/N — Lua Nova implementada e jogável.
//  Lua Crescente, Lua Cheia, Lua Minguante e Lua Sangrenta
//  (Modo Obscuro) estão estruturadas como rascunho/lore, mas
//  TRANCADAS (locked:true) até decidirmos a mecânica de cada uma.
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
//  Lua Sangrenta / Modo Obscuro é a forma final: a ideia é que
//  ela "corrompa" as skills das 4 fases normais em versões
//  sombrias mais fortes, com um malefício maior ainda (autodano,
//  não pode curar, etc). Gatilho e skills ainda em aberto.
// ══════════════════════════════════════════════════════════════

'use strict';

// ─────────────────────────────────────────────────────────────
//  DADOS — As 4 Fases da Lua
// ─────────────────────────────────────────────────────────────
const ASSASSINO_LUAS = [
  {
    key: 'nova',
    nome: 'Lua Nova',
    icon: '🌑',
    cor: '#3a2a5a',
    locked: false,
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
    cor: '#2a3a5a',
    locked: true,
    lore: 'A lua cresce, e com ela o poder se acumula. Fraco no início do combate, devastador quando atinge o auge.',
    beneficio: '(em desenvolvimento) — conceito: cada acerto acumula poder; explode em dano no pico.',
    maleficio: '(em desenvolvimento) — conceito: penalidade nos primeiros turnos, antes de "crescer".',
    passivo: null,
    skills: [],
  },
  {
    key: 'cheia',
    nome: 'Lua Cheia',
    icon: '🌕',
    cor: '#4a2a5a',
    locked: true,
    lore: 'Sob a lua cheia, o Assassino abraça o instinto bruto. Toda sutileza é trocada por poder destrutivo.',
    beneficio: '(em desenvolvimento) — conceito: ATQ e crítico muito altos.',
    maleficio: '(em desenvolvimento) — conceito: DEF baixíssima, talvez perda de HP por turno.',
    passivo: null,
    skills: [],
  },
  {
    key: 'minguante',
    nome: 'Lua Minguante',
    icon: '🌘',
    cor: '#2a4a3a',
    locked: true,
    lore: 'O que mingua na lua, mingua também no inimigo. Cada golpe rouba força, vida e esperança.',
    beneficio: '(em desenvolvimento) — conceito: drena HP/MP do inimigo, aplica debuffs fortes.',
    maleficio: '(em desenvolvimento) — conceito: dano direto menor, foco em drenagem/debuff.',
    passivo: null,
    skills: [],
  },
];

// ─────────────────────────────────────────────────────────────
//  DADOS — Lua Sangrenta / Modo Obscuro (forma final, em aberto)
// ─────────────────────────────────────────────────────────────
const ASSASSINO_LUA_SANGRENTA = {
  key: 'sangrenta',
  nome: 'Lua Sangrenta',
  subtitulo: 'Modo Obscuro',
  icon: '🩸',
  cor: '#5a0a14',
  locked: true,
  lore: 'Quando as quatro fases se completam, o Assassino atravessa para o lado sombrio. Todas as suas habilidades ganham uma versão corrompida — mais letal, mais perigosa para quem a usa.',
  conceito: 'Cada skill das 4 luas normais ganha uma versão "Obscura" (dano/efeito maior) com um custo extra — ex: autodano por turno, impossibilidade de curar, ou consumo de HP em vez de AP.',
  gatilhoEmAberto: 'A definir: pode exigir já ter "dominado" as 4 fases, ou só ficar disponível abaixo de um % de HP, ou ter duração limitada por batalha. Para decidirmos juntos na próxima parte.',
};

// ─────────────────────────────────────────────────────────────
//  MOTOR — getters/setters de fase ativa
// ─────────────────────────────────────────────────────────────
function getAssassinoLuaData(key) {
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
  delete p._lua_dodge_bonus;
}

// Troca a fase ativa. silent=true evita notificação (usado no auto-set inicial)
function setAssassinoLua(p, luaKey, silent) {
  const lua = getAssassinoLuaData(luaKey);
  if (!lua) return false;
  if (lua.locked) {
    if (!silent && typeof notify === 'function') {
      notify('🔒 Esta fase da lua ainda não está disponível — em desenvolvimento.', 'red');
    }
    return false;
  }
  if (p._lua_ativa === luaKey) return true; // já está ativa

  clearAssassinoLuaEffects(p);
  p._lua_ativa = luaKey;
  if (typeof lua.passivo === 'function') lua.passivo(p);

  if (!silent) {
    if (typeof notify === 'function') notify(`${lua.icon} ${lua.nome} sintonizada.`, 'gold');
    if (typeof addLog === 'function') addLog(`Lua: ${lua.icon} ${lua.nome} ativada — ${lua.beneficio}`, 'xp');
  }
  return true;
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

    return { skipEnemyTurn: false, enemyStunned: false, apGain: 6 };
  }

  return { skipEnemyTurn: false, enemyStunned: false, apGain: 0 };
}

// ─────────────────────────────────────────────────────────────
//  UI — Painel "Fases da Lua" (substitui a árvore de talentos
//  no overlay do Assassino). Estética dark proposital — primeira
//  pincelada do redesign visual; refinamos junto com o resto.
// ─────────────────────────────────────────────────────────────
function buildLuaPanelHTML(cls) {
  const p = G.player;
  ensureAssassinoLuaDefault(p);
  const ativa = getAssassinoLuaAtiva(p);

  const cardsHTML = ASSASSINO_LUAS.map(lua => {
    const isAtiva = ativa === lua.key;
    const locked  = lua.locked;
    const borderColor = isAtiva ? '#c8960a' : (locked ? 'rgba(120,40,60,0.22)' : lua.cor);

    return `
      <div style="background:linear-gradient(180deg, rgba(10,8,18,0.92), rgba(20,12,28,0.92));
                  border:1px solid ${borderColor};
                  ${isAtiva ? 'box-shadow:0 0 14px rgba(200,150,10,0.22);' : ''}
                  padding:12px;margin-bottom:8px;position:relative;${locked ? 'opacity:0.55;' : ''}">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:1.6rem;${locked ? 'filter:grayscale(1);' : ''}">${lua.icon}</span>
          <div style="flex:1;">
            <div style="font-family:'Noto Serif JP',serif;font-size:0.8rem;color:${isAtiva ? '#c8960a' : '#b0a0c0'};letter-spacing:1px;">
              ${lua.nome}${isAtiva ? ' <span style="font-size:0.48rem;color:#c8960a;">● ATIVA</span>' : ''}
            </div>
            <div style="font-size:0.54rem;color:rgba(176,160,192,0.55);margin-top:3px;line-height:1.55;">${lua.lore}</div>
          </div>
        </div>
        ${!locked ? `
        <div style="margin-top:8px;display:flex;flex-direction:column;gap:3px;">
          <div style="font-size:0.54rem;color:#7ac88a;">✦ ${lua.beneficio}</div>
          <div style="font-size:0.54rem;color:#c87a7a;">✦ ${lua.maleficio}</div>
        </div>` : `
        <div style="margin-top:8px;font-size:0.54rem;color:rgba(120,100,140,0.6);letter-spacing:1px;">🔒 EM DESENVOLVIMENTO</div>
        `}
        ${!locked && !isAtiva ? `
        <button onclick="window.onLuaCardClick && window.onLuaCardClick('${lua.key}')" style="
          margin-top:10px;width:100%;padding:7px;background:rgba(200,150,10,0.08);
          border:1px solid rgba(200,150,10,0.3);color:#c8960a;font-family:'Noto Serif JP',serif;
          font-size:0.58rem;letter-spacing:2px;cursor:pointer;">SINTONIZAR</button>` : ''}
      </div>`;
  }).join('');

  const sg = ASSASSINO_LUA_SANGRENTA;
  const sangrentaHTML = `
    <div style="margin-top:14px;border-top:1px solid rgba(120,10,20,0.3);padding-top:12px;">
      <div style="font-size:0.5rem;color:rgba(180,30,50,0.55);letter-spacing:3px;margin-bottom:8px;">✦ FORMA FINAL</div>
      <div style="background:linear-gradient(180deg, rgba(30,4,8,0.9), rgba(10,2,4,0.95));
                  border:1px solid rgba(120,10,20,0.4);padding:12px;opacity:0.6;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:1.6rem;filter:grayscale(0.6);">${sg.icon}</span>
          <div>
            <div style="font-family:'Noto Serif JP',serif;font-size:0.8rem;color:#a01828;letter-spacing:1px;">
              ${sg.nome} <span style="font-size:0.52rem;color:rgba(180,30,50,0.6);">— ${sg.subtitulo}</span>
            </div>
            <div style="font-size:0.54rem;color:rgba(180,140,150,0.5);margin-top:3px;line-height:1.55;">${sg.lore}</div>
          </div>
        </div>
        <div style="margin-top:8px;font-size:0.54rem;color:rgba(180,30,50,0.55);letter-spacing:1px;">🔒 EM DESENVOLVIMENTO</div>
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
  if (ok) {
    if (typeof buildTalentTreeUI === 'function' && typeof getTalentTree === 'function') {
      buildTalentTreeUI(getTalentTree());
    }
    if (typeof updateHUD === 'function') updateHUD();
    if (typeof buildCharacterScreen === 'function') buildCharacterScreen('char-content-tt');
  }
};

// ─────────────────────────────────────────────────────────────
//  PONTE — encaixa o sistema de Luas no fluxo já existente de
//  getTalentSkills()/executeTalentSkill() (talent_system.js),
//  sem precisar tocar em palDinh.js. Mesmo padrão usado pelo
//  Mago para suas reações elementais.
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
})();

// ─────────────────────────────────────────────────────────────
//  EXPORTS
// ─────────────────────────────────────────────────────────────
window.ASSASSINO_LUAS           = ASSASSINO_LUAS;
window.ASSASSINO_LUA_SANGRENTA  = ASSASSINO_LUA_SANGRENTA;
window.getAssassinoLuaData      = getAssassinoLuaData;
window.getAssassinoLuaAtiva     = getAssassinoLuaAtiva;
window.ensureAssassinoLuaDefault = ensureAssassinoLuaDefault;
window.setAssassinoLua          = setAssassinoLua;
window.clearAssassinoLuaEffects = clearAssassinoLuaEffects;
window.getLuaSkills             = getLuaSkills;
window.executeLuaSkill          = executeLuaSkill;
window.buildLuaPanelHTML        = buildLuaPanelHTML;
