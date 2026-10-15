// ══════════════════════════════════════════════════════════════
//  CHRONICLES OF CLIVOR — nulkhar.js
//  Nul'Khar, o Assassino da Sombra — TESTE de sistema de chefe lendário.
//  Não é canônico. Fica isolado na Floresta, acessível por um botão
//  próprio (NÃO entra no sorteio normal de inimigos da floresta —
//  com 1200 HP ele quebraria o balanceamento dos encontros aleatórios).
//
//  Tudo neste arquivo é "bridge": nada aqui edita gat-1.html nem
//  palDinh.js diretamente. Toda função do motor é interceptada com
//  guarda por enemy.id === 'nulkhar', então nenhum outro inimigo,
//  chefe ou sistema é afetado.
//
//  Carregar DEPOIS de palDinh.js no gat-1.html.
// ══════════════════════════════════════════════════════════════

'use strict';

// ── CHAVE MESTRA — enquanto false, os dois botões (⚔️ desafio e 🗡️ modo)
// nunca aparecem em lugar nenhum, mesmo dentro do jogo. O resto do sistema
// (o chefe em si, a batalha) continua intacto pra quando for reativado.
const NK_UI_ATIVA = false;

const NULKHAR = {
  id: 'nulkhar',
  name: "Nul'Khar",
  icon: '🗡️',
  isBoss: true, // conta como chefe pro Mérito do Vilarejo (+15 rep ao derrotar)

  // ── PNGs individuais por frame (substituiu a spritesheet mesclada —
  //    os efeitos de magia/aura não foram replicados nos PNGs novos,
  //    então essas 2 animações não têm frames próprios; o gancho de
  //    visual logo abaixo faz o fallback delas pra 'attack'/'dano'). ──
  sprite: {
    base: 'Imagens/personagens/Nul`kar/',
    anims: {
      idle:   { frames: ['Picsart_26-07-09_01-42-36-585.png'], fps: 2 },  // parado
      attack: { frames: ['Picsart_26-07-09_01-44-47-936.png', 'nulkhar_attack4.png', 'Picsart_26-07-09_01-45-19-533.png', 'Picsart_26-07-09_01-45-40-795.png'], fps: 3 },  // preparação → avanço → corte → recuo
      dano:   { frames: ['nulkhar_dano1.png', 'Picsart_26-07-09_01-43-18-864.png'], fps: 4 },  // flinch → com sangue
    },
  },

  elemento: 'sombra',

  // ── STATS DE CHEFE LENDÁRIO ──
  hp: 1200, atk: 115, def: 56,
  xp: 520, gold: 360,
  minLevel: 1, maxLevel: 99,

  desc: "Uma lenda sussurrada entre os galhos mais antigos da Floresta Eterna. Nul'Khar não caça — ele espera. Suas lâminas curvadas cortam mais fundo que qualquer aço comum, e a sombra ao seu redor se move como se tivesse vontade própria. Poucos que o encontraram viveram para descrever o que viram.",
  fraqueza: 'luz', // decorativo por enquanto, não plugado em dano ainda

  loot: [
    { id:'fragmento_sombra',  name:'Fragmento de Sombra',   icon:'🌑', imgSrc:'Imagens/icones/materiais/fragSombra.png', chance:0.65, weight:0.2, type:'material', desc:'Fragmento denso de trevas solidificadas.' },
    { id:'essencia_fantasma', name:'Essência Fantasmal',    icon:'💠', imgSrc:'Imagens/icones/materiais/Picsart_26-06-27_03-39-51-719.png', chance:0.5, weight:0.1, type:'material', desc:'Essência etérea coletada de espectros.' },
    { id:'po_cristal',        name:'Pó de Cristal',         icon:'💎', imgSrc:'Imagens/icones/materiais/poCrista.png', chance:0.45, weight:0.2, type:'material', desc:'Pó mágico de cristal.' },
    { id:'nucleo_sombrio',    name:'Núcleo Sombrio',        icon:'🔮', imgSrc:'Imagens/icones/materiais/fragSombra.png', chance:0.2, weight:0.3, type:'material', desc:'O núcleo pulsante que mantinha Nul\'Khar unido à escuridão. Material raro — reservado para receitas futuras.' },
    { id:'erva_cura',         name:'Erva Medicinal',        icon:'🌿', imgSrc:'Imagens/cosméticos/erva.png', chance:0.15, weight:0.2, type:'consumível', desc:'Recupera 15 HP.' },
  ],
};
window.NULKHAR = NULKHAR;

// ─────────────────────────────────────────────────────────────
//  GARANTE que ele NÃO entra no sorteio aleatório da floresta.
//  (Se uma versão antiga dele ficou salva em algum save ou foi
//  injetada por outro script, removemos aqui por segurança.)
// ─────────────────────────────────────────────────────────────
if (typeof INIMIGOS_FLORESTA !== 'undefined') {
  const _idx = INIMIGOS_FLORESTA.findIndex(en => en.id === 'nulkhar');
  if (_idx !== -1) INIMIGOS_FLORESTA.splice(_idx, 1);
} else {
  console.warn('[nulkhar.js] INIMIGOS_FLORESTA não encontrado — confirme que palDinh.js foi carregado ANTES deste arquivo.');
}

// ─────────────────────────────────────────────────────────────
//  ESTILO — botão de desafio + fundo escuro/obscuro exclusivo
//  da batalha contra o Nul'Khar.
// ─────────────────────────────────────────────────────────────
if (!document.getElementById('nulkhar-style')) {
  const style = document.createElement('style');
  style.id = 'nulkhar-style';
  style.textContent = `
    #nulkhar-challenge-btn {
      position: fixed; bottom: 80px; left: 14px; z-index: 58;
      display: none;
      width: 34px; height: 34px; border-radius: 50%;
      align-items: center; justify-content: center;
      background: linear-gradient(135deg, rgba(8,0,12,0.94), rgba(35,0,20,0.94));
      border: 1px solid rgba(160,40,190,0.55);
      color: #e8c8ff;
      font-size: 0.85rem;
      padding: 0;
      cursor: pointer;
      box-shadow: 0 0 14px rgba(120,20,140,0.4), inset 0 0 8px rgba(120,20,140,0.15);
      transition: box-shadow 0.3s ease, transform 0.15s ease, opacity 0.2s ease;
    }
    #nulkhar-challenge-btn:hover {
      box-shadow: 0 0 20px rgba(160,30,180,0.65), inset 0 0 10px rgba(160,30,180,0.25);
      transform: translateY(-1px);
    }
    #nulkhar-challenge-btn:active { transform: translateY(0); }

    /* ── Interruptor pequeno "Modo Nul'Khar" — só aparece quando você já
       está dentro do jogo (nunca na tela de título/menu). Liga/desliga
       se o botão de desafio (acima) pode aparecer ou não. ── */
    #nulkhar-mode-toggle {
      position: fixed; bottom: 80px; right: 14px; z-index: 57;
      width: 34px; height: 34px; border-radius: 50%;
      display: none; align-items: center; justify-content: center;
      background: rgba(10,4,14,0.85);
      border: 1px solid rgba(160,40,190,0.4);
      color: rgba(232,200,255,0.55);
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    #nulkhar-mode-toggle.ativo {
      color: #e8c8ff;
      border-color: rgba(160,40,190,0.9);
      box-shadow: 0 0 10px rgba(160,30,180,0.5);
    }

    /* ── Cenário escuro e obscuro exclusivo da luta contra Nul'Khar ──
       Precisa vencer .battle-arena e .battle-combatants (que têm fundo
       próprio com !important vindo do ukiyo-e-redesign.css) — por isso
       as regras abaixo usam #battle-overlay.nulkhar-battle-active como
       prefixo: especificidade maior que as regras originais. */
    #battle-overlay.nulkhar-battle-active {
      background:
        radial-gradient(ellipse 90% 55% at 50% 0%, rgba(70,0,50,0.32) 0%, transparent 62%),
        radial-gradient(ellipse 75% 45% at 50% 100%, rgba(90,0,60,0.14) 0%, transparent 55%),
        #000000 !important;
    }
    #battle-overlay.nulkhar-battle-active .battle-arena {
      background: linear-gradient(180deg, #060005 0%, #030002 60%, #000000 100%) !important;
      box-shadow: 0 0 90px rgba(0,0,0,0.98), inset 0 0 50px rgba(90,0,60,0.12) !important;
    }
    #battle-overlay.nulkhar-battle-active .battle-arena::before {
      background: linear-gradient(90deg,
        transparent 0%, rgba(160,20,180,0.45) 20%,
        rgba(190,30,200,1) 50%, rgba(160,20,180,0.45) 80%, transparent 100%) !important;
      box-shadow: 0 0 20px rgba(160,20,180,0.6), 0 0 60px rgba(160,20,180,0.25) !important;
    }
    #battle-overlay.nulkhar-battle-active .battle-arena::after {
      background: linear-gradient(90deg, transparent 0%, rgba(160,20,180,0.18) 50%, transparent 100%) !important;
    }
    #battle-overlay.nulkhar-battle-active .battle-combatants {
      background:
        radial-gradient(ellipse 55% 80% at 15% 100%, rgba(120,10,90,0.1) 0%, transparent 60%),
        radial-gradient(ellipse 55% 80% at 85% 100%, rgba(120,10,90,0.14) 0%, transparent 60%),
        linear-gradient(180deg, #030002 0%, #000000 100%) !important;
    }
    #battle-overlay.nulkhar-battle-active #bat-enemy-icon {
      filter: drop-shadow(0 0 22px rgba(150,10,110,0.55)) drop-shadow(0 0 40px rgba(60,0,40,0.5));
    }
    #battle-overlay.nulkhar-battle-active #bat-enemy-name {
      color: #d890f0; text-shadow: 0 0 10px rgba(150,20,150,0.6);
    }
  `;
  document.head.appendChild(style);
}

// ─────────────────────────────────────────────────────────────
//  MODO NUL'KHAR — interruptor manual. Enquanto desligado (padrão),
//  o botão de desafio nunca aparece, nem na Floresta. Fica salvo
//  no localStorage, então a escolha persiste entre sessões.
// ─────────────────────────────────────────────────────────────
function _nkModoAtivo() {
  return localStorage.getItem('nk_modo_ativo') === '1';
}
function _nkSetModoAtivo(v) {
  localStorage.setItem('nk_modo_ativo', v ? '1' : '0');
  _nkToggleChallengeBtn();
  const t = document.getElementById('nulkhar-mode-toggle');
  if (t) t.classList.toggle('ativo', v);
}
window.toggleModoNulkhar = function () { _nkSetModoAtivo(!_nkModoAtivo()); };

if (!document.getElementById('nulkhar-mode-toggle')) {
  const toggle = document.createElement('div');
  toggle.id = 'nulkhar-mode-toggle';
  toggle.title = "Modo Nul'Khar (chefe de teste) — toque pra ligar/desligar";
  toggle.textContent = '🗡️';
  if (_nkModoAtivo()) toggle.classList.add('ativo');
  toggle.onclick = function () { window.toggleModoNulkhar(); };
  document.body.appendChild(toggle);
}

if (!document.getElementById('nulkhar-challenge-btn')) {
  const btn = document.createElement('button');
  btn.id = 'nulkhar-challenge-btn';
  btn.title = "Desafiar Nul'Khar (chefe de teste)";
  btn.textContent = '⚔️';
  btn.onclick = function () {
    if (typeof G === 'undefined' || G.inBattle) return;
    if (typeof showEnemy === 'function') showEnemy(NULKHAR);
    if (typeof startBattle === 'function') startBattle(NULKHAR);
  };
  document.body.appendChild(btn);
}

// Atualiza os dois elementos: o interruptor só existe/aparece quando há
// uma partida em andamento (G definido) E a pessoa já está de fato dentro
// do jogo — nunca na tela de título/capa nem na seleção de save, mesmo que
// G.location já esteja preenchido de um save carregado anteriormente.
function _nkTelaDeMenuVisivel() {
  const intro = document.getElementById('screen-intro');
  const saveMenu = document.getElementById('save-menu');
  const introAtiva = !!(intro && intro.classList.contains('active'));
  const saveMenuAtivo = !!(saveMenu && getComputedStyle(saveMenu).display !== 'none');
  return introAtiva || saveMenuAtivo;
}

function _nkToggleChallengeBtn() {
  const btn = document.getElementById('nulkhar-challenge-btn');
  const toggle = document.getElementById('nulkhar-mode-toggle');

  if (!NK_UI_ATIVA) {
    if (toggle) toggle.style.display = 'none';
    if (btn) btn.style.display = 'none';
    return;
  }

  const emJogo = (typeof G !== 'undefined' && G !== null && !!G.location && !_nkTelaDeMenuVisivel());

  if (toggle) toggle.style.display = emJogo ? 'flex' : 'none';
  if (!btn) return;
  if (!emJogo) { btn.style.display = 'none'; return; }

  const emFloresta = (G.location === 'floresta' || G.location === 'floresta2');
  btn.style.display = (_nkModoAtivo() && emFloresta && !G.inBattle) ? 'flex' : 'none';
}

// Mostra/esconde o botão sempre que a cena mudar (guarda: chama o setScene original sempre)
if (typeof setScene === 'function' && !window._nulkharSetScenePatched) {
  window._nulkharSetScenePatched = true;
  const _origSetScene = setScene;
  window.setScene = function (loc) {
    _origSetScene(loc);
    _nkToggleChallengeBtn();
  };
}

// ─────────────────────────────────────────────────────────────
//  Liga/desliga o fundo escuro da batalha + esconde o botão de
//  desafio durante o combate. Guard por enemy.id, então nenhum
//  outro inimigo (nem outros chefes) é afetado.
// ─────────────────────────────────────────────────────────────
if (typeof startBattle === 'function' && !window._nulkharStartBattlePatched) {
  window._nulkharStartBattlePatched = true;
  const _origStartBattle = startBattle;
  window.startBattle = function (enemy) {
    _origStartBattle(enemy);
    const overlay = document.getElementById('battle-overlay');
    if (overlay) {
      if (enemy && enemy.id === 'nulkhar') overlay.classList.add('nulkhar-battle-active');
      else overlay.classList.remove('nulkhar-battle-active');
    }
    _nkToggleChallengeBtn();
  };
}

// ─────────────────────────────────────────────────────────────
//  GANCHO DE VISUAL — Nul'Khar não usa mais spritesheet mesclada,
//  e sim PNGs individuais por frame (sprite.anims[estado].frames).
//  A troca de frame é feita 100% em CSS (keyframes trocando
//  background-image), sem recriar o elemento a cada frame.
//  Fallback: 'magia' reaproveita os frames de 'attack'; 'sumir'
//  reaproveita o último frame de 'dano' com um fade de opacidade
//  (efeitos de partícula ainda não foram replicados nos PNGs novos).
// ─────────────────────────────────────────────────────────────
if (typeof buildEnemyVisual === 'function' && !window._nulkharVisualPatched) {
  window._nulkharVisualPatched = true;
  const _origBuildEnemyVisual = buildEnemyVisual;

  window.buildEnemyVisual = function (enemy, size, animState) {
    if (!enemy || enemy.id !== 'nulkhar' || !enemy.sprite || !enemy.sprite.anims) {
      return _origBuildEnemyVisual(enemy, size, animState);
    }

    const s = enemy.sprite;
    let key = animState;
    let fadeOut = false;
    if (!s.anims[key]) {
      if (key === 'magia') key = 'attack';
      else if (key === 'sumir') { key = 'dano'; fadeOut = true; }
      else key = 'idle';
    }
    const anim   = s.anims[key] || s.anims.idle;
    const frames = fadeOut ? [anim.frames[anim.frames.length - 1]] : anim.frames;
    const fps    = anim.fps || 6;
    const dur    = (frames.length / fps).toFixed(2) + 's';

    const w = size;
    const h = Math.round(size * 1.45); // caixa mais alta que larga (retrato)

    const kid = `sp_nk_${key}${fadeOut ? '_sumir' : ''}`;
    const animParts = [];
    let kfCss = '';

    if (frames.length > 1) {
      let kfBody = '';
      frames.forEach((f, i) => {
        const pct = (i / frames.length) * 100;
        kfBody += `${pct.toFixed(3)}% { background-image:url('${s.base}${f}'); }\n`;
      });
      kfBody += `100% { background-image:url('${s.base}${frames[0]}'); }\n`;
      kfCss = `@keyframes ${kid} { ${kfBody} }`;
      animParts.push(`${kid} ${dur} steps(1) infinite`);
    }
    if (fadeOut) animParts.push('sp_nk_dissolve 1.1s ease-out forwards');
    const animCss = animParts.length ? `animation: ${animParts.join(', ')};` : '';

    return `
    <style>
      @keyframes sp_nk_dissolve { from { opacity:1; } to { opacity:0; } }
      ${kfCss}
    </style>
    <div style="
      width:${w}px; height:${h}px;
      background-image:url('${s.base}${frames[0]}');
      background-size:contain;
      background-position:center bottom;
      background-repeat:no-repeat;
      ${animCss}
      filter: drop-shadow(0 0 22px rgba(200,80,20,0.9)) drop-shadow(0 0 6px rgba(0,0,0,0.95));
    "></div>`;
  };
}

// ─────────────────────────────────────────────────────────────
//  GANCHO DE DANO — troca 'idle' por 'dano' só quando o Nul'Khar
//  apanha. Guarda a função original e chama ela pra qualquer
//  outro inimigo (nenhum outro mob é afetado).
// ─────────────────────────────────────────────────────────────
if (typeof animEnemyHit === 'function' && !window._nulkharHitPatched) {
  window._nulkharHitPatched = true;
  const _origAnimEnemyHit = animEnemyHit;

  window.animEnemyHit = function () {
    const enemy = G.currentEnemy;
    if (!enemy || enemy.id !== 'nulkhar' || !enemy.sprite) {
      return _origAnimEnemyHit();
    }
    const batIcon = document.getElementById('bat-enemy-icon');
    const sceneEl = document.getElementById('scene-enemy');
    batIcon.innerHTML = buildEnemyVisual(enemy, 112, 'dano');
    if (sceneEl && sceneEl.style.display !== 'none') {
      sceneEl.innerHTML = buildEnemyVisual(enemy, 150, 'dano');
    }
    setTimeout(() => {
      if (G.currentEnemy && G.currentEnemy.id === 'nulkhar') {
        batIcon.innerHTML = buildEnemyVisual(enemy, 112, 'idle');
        if (sceneEl && sceneEl.style.display !== 'none') {
          sceneEl.innerHTML = buildEnemyVisual(enemy, 150, 'idle');
        }
      }
    }, 650);
  };
}

// ─────────────────────────────────────────────────────────────
//  GANCHO DE ATAQUE — visual padrão de cada turno do Nul'Khar.
//  1 em cada 3 ataques comuns usa a animação de magia sombria.
//  As especiais de fase/retardo forçam sua própria pose dentro
//  de ENEMY_AI.nulkhar (função _nkForcePose), sobrescrevendo isso.
// ─────────────────────────────────────────────────────────────
if (typeof animEnemyAttack === 'function' && !window._nulkharAttackPatched) {
  window._nulkharAttackPatched = true;
  const _origAnimEnemyAttack = animEnemyAttack;

  window.animEnemyAttack = function () {
    const enemy = G.currentEnemy;
    if (!enemy || enemy.id !== 'nulkhar' || !enemy.sprite) {
      return _origAnimEnemyAttack();
    }
    const useMagia = Math.random() < 0.33;
    const state = useMagia ? 'magia' : 'attack';
    const batIcon = document.getElementById('bat-enemy-icon');
    const sceneEl = document.getElementById('scene-enemy');
    batIcon.innerHTML = buildEnemyVisual(enemy, 112, state);
    if (sceneEl && sceneEl.style.display !== 'none') {
      sceneEl.innerHTML = buildEnemyVisual(enemy, 150, state);
    }
    setTimeout(() => {
      if (G.currentEnemy && G.currentEnemy.id === 'nulkhar') {
        batIcon.innerHTML = buildEnemyVisual(enemy, 112, 'idle');
        if (sceneEl && sceneEl.style.display !== 'none') {
          sceneEl.innerHTML = buildEnemyVisual(enemy, 150, 'idle');
        }
      }
    }, useMagia ? 1500 : 1450);
  };
}

// Força uma pose específica no ícone de batalha (usada pelas especiais de fase/retardo)
function _nkForcePose(enemyCopy, state) {
  if (!enemyCopy || !enemyCopy.sprite) return;
  const batIcon = document.getElementById('bat-enemy-icon');
  if (batIcon) batIcon.innerHTML = buildEnemyVisual(enemyCopy, 112, state);
  setTimeout(() => {
    if (G.currentEnemy && G.currentEnemy.id === 'nulkhar' && batIcon) {
      batIcon.innerHTML = buildEnemyVisual(enemyCopy, 112, 'idle');
    }
  }, state === 'magia' ? 1500 : 1450);
}

// ─────────────────────────────────────────────────────────────
//  TICK DE STATUS DO JOGADOR — cuida da contagem regressiva do
//  Retardo Sombrio (aplicado por ENEMY_AI.nulkhar). Só age quando
//  a batalha atual É contra o Nul'Khar — nenhum outro status ou
//  inimigo é tocado.
// ─────────────────────────────────────────────────────────────
if (typeof tickPlayerStatusEffects === 'function' && !window._nulkharTickPatched) {
  window._nulkharTickPatched = true;
  const _origTickPlayerStatus = tickPlayerStatusEffects;

  window.tickPlayerStatusEffects = function (bs, p, e) {
    _origTickPlayerStatus(bs, p, e);
    if (!bs || !bs.enemyData || bs.enemyData.id !== 'nulkhar') return;
    if (bs._nkRetardoTurns > 0) {
      bs._nkRetardoTurns--;
      if (bs._nkRetardoTurns <= 0 && bs._nkRetardoAmt > 0) {
        p.spd += bs._nkRetardoAmt;
        bs._nkRetardoAmt = 0;
        appendBattleLog('⛓️ Os grilhões sombrios se rompem — sua velocidade volta ao normal.', '#a060c0');
      } else {
        appendBattleLog(`⛓️ Ainda preso pelos Grilhões da Sombra Eterna... (${bs._nkRetardoTurns}t restantes)`, '#7010a0');
      }
    }
  };
}

// ─────────────────────────────────────────────────────────────
//  IA DE CHEFE — Nul'Khar, o Assassino da Sombra.
//  · Fase 2 (65% HP): Fúria da Lâmina — enraivece, ATQ +30%, golpe forte.
//  · Fase 3 (30% HP): Despertar Sombrio — ATQ +25% extra, golpe brutal
//    ignorando parte da DEF + sangramento.
//  · Passiva massiva — Grilhões da Sombra Eterna: retardo pesado de VEL
//    por 3 turnos (não empilha — só reaplica quando expira).
//  · Caso contrário — Corte das Mil Sombras: combo duplo comum.
// ─────────────────────────────────────────────────────────────
if (typeof ENEMY_AI !== 'undefined') {
  ENEMY_AI.nulkhar = {
    name: 'lendário',
    specialName: 'Grilhões da Sombra Eterna',
    specialIcon: '⛓️',
    specialDesc: 'Alterna correntes sombrias que retardam brutalmente seus movimentos com cortes multiplicados vindos da escuridão. A cada fase de vida perdida, sua fúria verdadeira desperta.',
    special(bs, p, e) {
      const hpPct = bs.enemyHp / bs.enemyMaxHp;

      // ── FASE 2 — 65% HP: Fúria da Lâmina (uma vez) ──
      if (hpPct <= 0.65 && !bs._nkPhase2) {
        bs._nkPhase2 = true;
        e.atk = Math.floor(e.atk * 1.3);
        bs.enemyEnraged = true;
        _nkForcePose(e, 'magia');
        appendBattleLog(`🗡️ Nul'Khar solta um grito silencioso — sua lâmina começa a pulsar sombra pura!`, '#a020c0');
        appendBattleLog(`👤 "Você ainda está de pé... interessante."`, '#c060e0');
        const d = Math.max(1, Math.floor(e.atk * 1.35 - p.def / 3 + Math.random() * 10));
        applyDmgToPlayer(d, bs, p, true);
        appendBattleLog(`🗡️ Corte das Mil Sombras! -${d} HP! (ignora parte da defesa)`, '#a020c0');
        showFloatingNumber('hero', d, 'crit');
        flashDamage('hero');
        return;
      }

      // ── FASE 3 — 30% HP: Despertar Sombrio (uma vez) ──
      if (hpPct <= 0.30 && !bs._nkPhase3) {
        bs._nkPhase3 = true;
        e.atk = Math.floor(e.atk * 1.25);
        _nkForcePose(e, 'magia');
        appendBattleLog(`🌑 A sombra ao redor de Nul'Khar desmorona — ele desperta em sua forma verdadeira!`, '#600070');
        appendBattleLog(`👤 "Chega de brincadeiras. Sinta o vazio."`, '#8000a0');
        const d = Math.max(1, Math.floor(e.atk * 1.5 - p.def / 4 + Math.random() * 12));
        applyDmgToPlayer(d, bs, p, true);
        if (!p._talent_steel_soul && !p._talent_dark_immune_bleed) {
          bs.playerBleeding = true;
          bs.playerBleedTurns = 3;
          appendBattleLog(`🌑 Despertar Sombrio! -${d} HP + 🩸 Sangramento por 3 turnos!`, '#600070');
        } else {
          appendBattleLog(`🌑 Despertar Sombrio! -${d} HP (sangramento resistido!)`, '#600070');
        }
        showFloatingNumber('hero', d, 'crit');
        flashDamage('hero');
        return;
      }

      // ── PASSIVA MASSIVA — Grilhões da Sombra Eterna (retardo) ──
      const podeRetardar = !(bs._nkRetardoTurns > 0);
      const usaRetardo = podeRetardar && Math.random() < 0.6;

      if (usaRetardo) {
        const amt = Math.max(4, Math.floor((p.spd || 5) * 0.55));
        p.spd = Math.max(1, (p.spd || 5) - amt);
        bs._nkRetardoAmt = amt;
        bs._nkRetardoTurns = 3;
        _nkForcePose(e, 'magia');
        const d = Math.max(1, Math.floor(e.atk * 0.9 - p.def / 3 + Math.random() * 6));
        applyDmgToPlayer(d, bs, p);
        appendBattleLog(`⛓️ Grilhões da Sombra Eterna! Correntes escuras prendem seus membros — VEL reduzida drasticamente por 3 turnos! -${d} HP!`, '#7010a0');
        showFloatingNumber('hero', '⛓️ RETARDO', 'status');
        showFloatingNumber('hero', d, 'dmg');
        flashDamage('hero');
        return;
      }

      // ── Corte das Mil Sombras — combo duplo comum ──
      _nkForcePose(e, 'attack');
      const d1 = calcEnemyDmg(e, p, bs, 0.75);
      const d2 = calcEnemyDmg(e, p, bs, 0.75);
      applyDmgToPlayer(d1, bs, p);
      applyDmgToPlayer(d2, bs, p);
      appendBattleLog(`🗡️ Corte das Mil Sombras! Dois golpes vindos da escuridão: -${d1} e -${d2} HP!`, '#901090');
      showFloatingNumber('hero', d1, 'dmg');
      flashDamage('hero');
    },
  };
} else {
  console.warn('[nulkhar.js] ENEMY_AI não encontrado — a IA de fases do Nul\'Khar não foi registrada.');
}

// ─────────────────────────────────────────────────────────────
//  MORTE — animação 'sumir' (dissolve em sombra) antes de fechar
//  a batalha, e limpeza de qualquer Retardo pendente (pra não
//  vazar VEL reduzida pro resto do jogo se a luta acabar no meio
//  do efeito). Guard total por enemyData.id === 'nulkhar'.
// ─────────────────────────────────────────────────────────────
if (typeof endBattle === 'function' && !window._nulkharEndBattlePatched) {
  window._nulkharEndBattlePatched = true;
  const _origEndBattle = endBattle;

  window.endBattle = function (won, fled) {
    const bs = (typeof battleState !== 'undefined') ? battleState : null;
    const isNulkhar = !!(bs && bs.enemyData && bs.enemyData.id === 'nulkhar');

    // Limpa Retardo pendente antes de sair da batalha
    if (isNulkhar && bs._nkRetardoAmt > 0) {
      G.player.spd = (G.player.spd || 0) + bs._nkRetardoAmt;
      bs._nkRetardoAmt = 0;
      bs._nkRetardoTurns = 0;
    }
    if (isNulkhar) { bs._nkPhase2 = false; bs._nkPhase3 = false; }

    // Fundo escuro sai junto com a batalha
    const overlay = document.getElementById('battle-overlay');
    if (overlay) overlay.classList.remove('nulkhar-battle-active');

    if (isNulkhar && won && !fled) {
      appendBattleLog(`🌑 O corpo de Nul'Khar se desfaz em fumaça sombria...`, '#801090');
      const batIcon = document.getElementById('bat-enemy-icon');
      if (batIcon && bs.enemyData.sprite) {
        batIcon.innerHTML = buildEnemyVisual(bs.enemyData, 112, 'sumir');
      }
      setTimeout(() => {
        _origEndBattle(won, fled);
        _nkToggleChallengeBtn();
      }, 750);
      return;
    }

    _origEndBattle(won, fled);
    _nkToggleChallengeBtn();
  };
}

// Estado inicial ao carregar o script (ex: recarregou a página já dentro da floresta)
_nkToggleChallengeBtn();

// Rede de segurança: revalida a cada 1s, caso alguma transição de tela não
// passe pelos ganchos acima (setScene/startBattle). Custo desprezível.
setInterval(_nkToggleChallengeBtn, 1000);
