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
    cor: '#2a8a6a',
    winsToMaster: 10,
    mecanicaPronta: false,
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
    cor: '#c2581f',
    winsToMaster: 12,
    mecanicaPronta: false,
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
    cor: '#3a6a6a',
    winsToMaster: 14,
    mecanicaPronta: false,
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
  cor: '#8a0d18',
  mecanicaPronta: false,
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
// Lua Nova (sempre construída) OU se a fase anterior já foi DOMINADA.
function isLuaConstruida(key, p) {
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

  clearAssassinoLuaEffects(p);
  p._lua_ativa = luaKey;
  p._lua_wins  = 0; // progresso reseta ao trocar de fase — escolha tem peso
  if (typeof lua.passivo === 'function') lua.passivo(p);

  if (!silent) {
    if (lua.mecanicaPronta) {
      if (typeof notify === 'function') notify(`${lua.icon} ${lua.nome} sintonizada.`, 'gold');
      if (typeof addLog === 'function') addLog(`Lua: ${lua.icon} ${lua.nome} ativada — ${lua.beneficio}`, 'xp');
    } else {
      if (typeof notify === 'function') notify(`${lua.icon} ${lua.nome} sintonizada — técnicas ainda em forja, sem efeito de batalha por enquanto.`, 'purple');
    }
  }
  return true;
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
          <span style="font-size:1.6rem;${!construida ? 'filter:grayscale(1);' : ''}">${lua.icon}</span>
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

  const segmentsHTML = ASSASSINO_LUAS.map(l => {
    const filled = !!dominadas[l.key];
    return `<div style="flex:1;height:100%;background:${filled ? sg.cor : 'rgba(255,255,255,0.05)'};${filled ? `box-shadow:0 0 6px ${hexToRgba(sg.cor, 0.55)};` : ''}"></div>`;
  }).join('<div style="width:2px;background:rgba(0,0,0,0.6);"></div>');

  const sangrentaHTML = `
    <div style="margin-top:14px;border-top:1px solid rgba(120,10,20,0.3);padding-top:12px;">
      <div style="font-size:0.5rem;color:rgba(180,30,50,0.55);letter-spacing:3px;margin-bottom:8px;">✦ FORMA FINAL</div>
      <div style="background:linear-gradient(180deg, rgba(30,4,8,0.9), rgba(10,2,4,0.95));
                  border:1px solid rgba(120,10,20,0.4);padding:12px;${todasDominadas ? '' : 'opacity:0.6;'}">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:1.6rem;${todasDominadas ? '' : 'filter:grayscale(0.6);'}">${sg.icon}</span>
          <div>
            <div style="font-family:'Noto Serif JP',serif;font-size:0.8rem;color:#a01828;letter-spacing:1px;">
              ${sg.nome} <span style="font-size:0.52rem;color:rgba(180,30,50,0.6);">— ${sg.subtitulo}</span>
            </div>
            <div style="font-size:0.54rem;color:rgba(180,140,150,0.5);margin-top:3px;line-height:1.55;">${sg.lore}</div>
          </div>
        </div>
        <div style="margin-top:10px;display:flex;height:16px;border:1px solid ${hexToRgba(sg.cor, 0.35)};background:rgba(0,0,0,0.45);overflow:hidden;">
          ${segmentsHTML}
        </div>
        <div style="margin-top:4px;font-size:0.5rem;letter-spacing:1px;color:${todasDominadas ? sg.cor : 'rgba(180,30,50,0.55)'};">
          ${todasDominadas ? '🔥 4/4 fases dominadas — pronta para ser forjada' : `${dominadasCount}/${totalFases} fases dominadas`}
        </div>
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
window.clearAssassinoLuaEffects  = clearAssassinoLuaEffects;
window.getNextLuaKey              = getNextLuaKey;
window.isLuaConstruida            = isLuaConstruida;
window.registerAssassinoVictory   = registerAssassinoVictory;
window.refreshLuaUI               = refreshLuaUI;
window.showLuaChoiceModal         = showLuaChoiceModal;
window.getLuaSkills              = getLuaSkills;
window.executeLuaSkill           = executeLuaSkill;
window.buildLuaPanelHTML         = buildLuaPanelHTML;
