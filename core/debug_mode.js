// ─────────────────────────────────────────────────────────────
//  MODO DEBUG — só pra você testar mais rápido, NÃO é pra ir pro
//  jogo publicado. Antes de lançar/build final, tira o <script>
//  deste arquivo do gat-1.html.
//
//  O QUE FAZ:
//   🛡️ Sem dano   → você para de perder HP (em batalha E fora dela,
//                    tipo armadilha de masmorra), sem mexer em
//                    nenhum número real do seu personagem. HP alto
//                    demais? Cura ainda funciona normal.
//   ⚔️ Multiplicador → todo dano que VOCÊ causa no inimigo é
//                    multiplicado (x2, x5, x10, x25, x100), sem
//                    mexer no seu ATQ real nem no cálculo de nada —
//                    só amplifica o resultado final antes de
//                    descontar do HP do inimigo.
//
//  COMO FUNCIONA (por dentro): em vez de caçar toda função que
//  aplica dano (são dezenas espalhadas pelos arquivos de skill),
//  eu intercepto os DOIS lugares onde o HP realmente é gravado —
//  G.player.hp e battleState.enemyHp — usando um getter/setter.
//  Assim, não importa qual sistema causou o dano (ataque normal,
//  skill, veneno, armadilha, o que for): tudo passa por aqui.
//
//  Painel fica escondido atrás do botão 🐞 no canto inferior
//  esquerdo da tela. Carregar este arquivo por último no
//  gat-1.html (depois de palDinh.js).
// ─────────────────────────────────────────────────────────────

// ── Persistência: o modo debug sobrevive a reload da página (F5,
//    fechar/abrir o app, cair o servidor local) via localStorage.
//    Antes, esse estado só existia na memória da aba e resetava
//    silenciosamente pra "desligado" em qualquer reload.
function _pgDebugCarregarEstado() {
  try {
    const salvo = JSON.parse(localStorage.getItem('__PG_DEBUG') || 'null');
    if (salvo && typeof salvo === 'object') {
      return { noDamage: !!salvo.noDamage, dmgMult: Number(salvo.dmgMult) || 1 };
    }
  } catch (e) { /* localStorage indisponível ou dado corrompido — usa padrão */ }
  return { noDamage: false, dmgMult: 1 };
}

function _pgDebugSalvarEstado() {
  try {
    localStorage.setItem('__PG_DEBUG', JSON.stringify(window.__PG_DEBUG));
  } catch (e) { /* localStorage indisponível — segue só na memória */ }
}

window.__PG_DEBUG = window.__PG_DEBUG || _pgDebugCarregarEstado();


// ── Estado sempre normalizado (nunca deixa dmgMult inválido)
window.__PG_DEBUG.dmgMult = Number(window.__PG_DEBUG.dmgMult) || 1;
window.__PG_DEBUG.noDamage = !!window.__PG_DEBUG.noDamage;
window.pgNoDamage = function () { return !!(window.__PG_DEBUG && window.__PG_DEBUG.noDamage); };

// ── Rastreia quais objetos player já têm o guard (WeakSet: não vaza
//    nada pro save, ao contrário da antiga flag __pgHpPatched, que era
//    gravada no save e fazia o patch ser PULADO depois de carregar).
const _pgPlayersPatchados = new WeakSet();

function _pgPatchPlayer(p) {
  if (!p || typeof p !== 'object' || _pgPlayersPatchados.has(p)) return p;
  // limpa lixo de versões antigas deste arquivo que foi parar no save
  try { delete p.__pgHpPatched; } catch (e) {}
  const desc = Object.getOwnPropertyDescriptor(p, 'hp');
  if (desc && desc.configurable === false) return p;
  let real = desc && 'value' in desc ? desc.value : (desc && desc.get ? desc.get.call(p) : p.hp);
  if (typeof real !== 'number' || isNaN(real)) real = Number(real) || 0;
  Object.defineProperty(p, 'hp', {
    configurable: true,
    enumerable: true, // continua indo pro save como número normal
    get() { return real; },
    set(v) {
      if (window.pgNoDamage() && typeof v === 'number' && v < real) {
        // única redução permitida: ajuste pra baixo até o HP máx.
        // (clamp), que não é dano.
        if (!(real > p.maxHp && v >= p.maxHp)) return;
      }
      real = v;
    },
  });
  _pgPlayersPatchados.add(p);
  return p;
}

function _pgPatchBattleState(bs) {
  if (!bs || typeof bs !== 'object' || bs.__pgEnemyHpPatched === true) return;
  let real = bs.enemyHp || 0;
  Object.defineProperty(bs, 'enemyHp', {
    configurable: true,
    enumerable: true,
    get() { return real; },
    set(v) {
      const mult = window.__PG_DEBUG.dmgMult || 1;
      if (mult > 1 && !window.__pgBattleInit && typeof v === 'number' && v < real) {
        real = Math.max(0, real - Math.floor((real - v) * mult));
      } else {
        real = v;
      }
    },
  });
  Object.defineProperty(bs, '__pgEnemyHpPatched', { value: true, enumerable: false, configurable: true });
}

function _pgDebugInstalarPatches() {
  if (typeof G === 'undefined' || !G || typeof battleState === 'undefined') {
    setTimeout(_pgDebugInstalarPatches, 200);
    return;
  }

  // G.player vira um accessor: QUALQUER objeto novo atribuído (loadGame,
  // novo jogo, Object.assign(G,data)) é protegido automaticamente.
  const d = Object.getOwnPropertyDescriptor(G, 'player');
  if (!d || !d.get || !d.get.__pg) {
    let _player = d && 'value' in d ? d.value : G.player;
    const get = function () { return _player; };
    get.__pg = true;
    Object.defineProperty(G, 'player', {
      configurable: true, enumerable: true,
      get,
      set(v) { _player = _pgPatchPlayer(v); },
    });
    _player = _pgPatchPlayer(_player);
  }

  // Espelha o gancho nativo do jogo (G.debugNoDamage), sem ir pro save
  const dn = Object.getOwnPropertyDescriptor(G, 'debugNoDamage');
  if (!dn || !dn.get) {
    Object.defineProperty(G, 'debugNoDamage', {
      configurable: true, enumerable: false,
      get() { return window.pgNoDamage(); },
      set(v) { /* controlado só pelo painel */ },
    });
  }

  _pgPatchBattleState(battleState);

  // Início de batalha: enemyHp é (re)inicializado — não amplificar
  if (typeof startBattleReal === 'function' && !startBattleReal.__pgWrapped) {
    const orig = startBattleReal;
    const w = function (...a) {
      window.__pgBattleInit = true;
      try { return orig.apply(this, a); }
      finally { window.__pgBattleInit = false; _pgPatchBattleState(battleState); }
    };
    w.__pgWrapped = true;
    window.startBattleReal = w;
    try { startBattleReal = w; } catch (e) {}
  }

  // Cinto e suspensório: se algo dano chegar via applyDmgToPlayer, zera
  if (typeof applyDmgToPlayer === 'function' && !applyDmgToPlayer.__pgWrapped) {
    const orig = applyDmgToPlayer;
    const w = function (dmg, ...rest) {
      if (window.pgNoDamage()) dmg = 0;
      return orig.call(this, dmg, ...rest);
    };
    w.__pgWrapped = true;
    window.applyDmgToPlayer = w;
    try { applyDmgToPlayer = w; } catch (e) {}
  }

  console.log('🐞 Debug patches instalados (sem dano / multiplicador de dano).');
}
_pgDebugInstalarPatches();

// Watchdog: garante o guard mesmo se algo trocar o objeto por baixo
setInterval(function () {
  try {
    if (typeof G === 'undefined' || !G) return;
    if (G.player) _pgPatchPlayer(G.player);
    if (typeof battleState !== 'undefined') _pgPatchBattleState(battleState);
  } catch (e) {}
}, 500);

function _pgDebugRewrapLoadGame() {
  if (typeof loadGame !== 'function') { setTimeout(_pgDebugRewrapLoadGame, 200); return; }
  if (loadGame.__pgWrapped) return;
  const _orig = loadGame;
  const w = function (...args) {
    const r = _orig.apply(this, args);
    _pgDebugInstalarPatches();
    if (G && G.player) _pgPatchPlayer(G.player);
    return r;
  };
  w.__pgWrapped = true;
  window.loadGame = w;
  try { loadGame = w; } catch (e) {}
}
_pgDebugRewrapLoadGame();

// ─────────────────────────────────────────────────────────────
//  PAINEL FLUTUANTE
// ─────────────────────────────────────────────────────────────
function _pgDebugCriarPainel() {
  if (document.getElementById('pg-debug-btn')) return;

  const btn = document.createElement('div');
  btn.id = 'pg-debug-btn';
  btn.textContent = '🐞';
  btn.style.cssText = `
    position:fixed; left:10px; bottom:10px; z-index:99999;
    width:38px; height:38px; border-radius:50%;
    background:rgba(20,10,10,0.85); border:1px solid rgba(200,60,60,0.6);
    display:flex; align-items:center; justify-content:center;
    font-size:1.2rem; cursor:pointer; box-shadow:0 2px 10px rgba(0,0,0,0.6);
  `;

  const panel = document.createElement('div');
  panel.id = 'pg-debug-panel';
  panel.style.cssText = `
    position:fixed; left:10px; bottom:56px; z-index:99999;
    display:none; flex-direction:column; gap:8px;
    background:rgba(15,8,8,0.95); border:1px solid rgba(200,60,60,0.5);
    border-radius:8px; padding:10px 12px; width:200px;
    font-family:sans-serif; font-size:0.8rem; color:#f0d8d8;
    box-shadow:0 4px 16px rgba(0,0,0,0.7);
  `;
  panel.innerHTML = `
    <div style="font-weight:bold;color:#ff8080;">🐞 Modo Debug</div>
    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
      <input type="checkbox" id="pg-dbg-nodmg" style="width:15px;height:15px;">
      🛡️ Sem dano
    </label>
    <div>
      <div style="margin-bottom:4px;">⚔️ Multiplicador de dano</div>
      <div id="pg-dbg-mult-row" style="display:flex;gap:4px;flex-wrap:wrap;"></div>
    </div>
    <div>
      <div style="margin-bottom:4px;">🧪 Resetar masmorra</div>
      <div id="pg-dbg-reset-row" style="display:flex;flex-direction:column;gap:4px;"></div>
    </div>
  `;

  document.body.appendChild(btn);
  document.body.appendChild(panel);

  // Indicador visual no botão flutuante: borda verde quando "Sem dano"
  // está ativo, mesmo com o painel fechado (evita confiar de olho fechado
  // num estado que pode ter resetado).
  function _pgAtualizarBotao() {
    btn.style.borderColor = window.__PG_DEBUG.noDamage
      ? 'rgba(80,220,120,0.9)'
      : 'rgba(200,60,60,0.6)';
    btn.style.boxShadow = window.__PG_DEBUG.noDamage
      ? '0 0 10px rgba(80,220,120,0.7)'
      : '0 2px 10px rgba(0,0,0,0.6)';
  }
  _pgAtualizarBotao();

  // Lista de masmorras resetáveis (registradas em window.DEBUG_RESET_MASMORRAS,
  // ex.: dungeons/inazami_selo_final.js). Refeita a cada abertura do painel.
  function _pgListarResets() {
    const row = panel.querySelector('#pg-dbg-reset-row');
    row.innerHTML = '';
    const reg = window.DEBUG_RESET_MASMORRAS || {};
    const ids = Object.keys(reg);
    if (!ids.length) { row.textContent = '(nenhuma registrada)'; return; }
    ids.forEach(id => {
      const b = document.createElement('button');
      const rotulo = '↺ ' + (reg[id].label || id);
      let armado = false;
      b.textContent = rotulo;
      b.style.cssText = `
        padding:5px 0; border-radius:4px; cursor:pointer;
        border:1px solid rgba(200,60,60,0.5); background:rgba(60,20,20,0.6);
        color:#f0d8d8; font-size:0.75rem;
      `;
      b.onclick = () => {
        if (!armado) {   // 1º toque arma, 2º confirma (evita reset sem querer)
          armado = true; b.textContent = '⚠️ Toque de novo';
          setTimeout(() => { armado = false; b.textContent = rotulo; }, 3000);
          return;
        }
        try { reg[id].reset(); } catch (e) { console.error('[reset ' + id + ']', e); }
        armado = false; b.textContent = rotulo;
        panel.style.display = 'none';
      };
      row.appendChild(b);
    });
  }

  btn.onclick = () => {
    const abrir = (panel.style.display === 'none');
    if (abrir) _pgListarResets();
    panel.style.display = abrir ? 'flex' : 'none';
  };

  const chk = panel.querySelector('#pg-dbg-nodmg');
  chk.checked = window.__PG_DEBUG.noDamage;
  chk.onchange = () => { window.__PG_DEBUG.noDamage = chk.checked; _pgDebugSalvarEstado(); _pgAtualizarBotao(); };

  const multRow = panel.querySelector('#pg-dbg-mult-row');
  [1, 2, 5, 10, 25, 100].forEach(m => {
    const b = document.createElement('button');
    b.textContent = 'x' + m;
    b.dataset.mult = m;
    b.style.cssText = `
      flex:1 0 28%; padding:4px 0; border-radius:4px; cursor:pointer;
      border:1px solid rgba(200,60,60,0.5); background:rgba(60,20,20,0.6);
      color:#f0d8d8; font-size:0.75rem;
    `;
    b.onclick = () => {
      window.__PG_DEBUG.dmgMult = m;
      _pgDebugSalvarEstado();
      multRow.querySelectorAll('button').forEach(x => {
        x.style.background = (Number(x.dataset.mult) === m) ? 'rgba(200,60,60,0.75)' : 'rgba(60,20,20,0.6)';
      });
    };
    if (m === window.__PG_DEBUG.dmgMult) b.style.background = 'rgba(200,60,60,0.75)';
    multRow.appendChild(b);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _pgDebugCriarPainel);
} else {
  _pgDebugCriarPainel();
}
