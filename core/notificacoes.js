// =============================================================================
//  notificacoes.js — Chronicles of Clivor
//  Notificações/log, acessibilidade e preferências visuais, Custom Confirm (seções 17 e 18).
//  Extraído do palDinh.js (linhas originais 13013–13159).
//  Carregar DEPOIS do palDinh.js no HTML (mesmo escopo global, sem módulos).
// =============================================================================

'use strict';

// ─────────────────────────────────────────────────────────────
//  17. NOTIFICAÇÕES E LOG
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
//  ACESSIBILIDADE & PREFERÊNCIAS VISUAIS
// ─────────────────────────────────────────────────────────────


// ── Modo Daltônico ──
(function initDaltonico() {
  const on = localStorage.getItem('clivor_daltonico') === '1';
  if (on) document.body.classList.add('daltonico');
  const btn = document.getElementById('cfg-daltonico');
  if (btn) { btn.textContent = on ? 'Ligado' : 'Desligado'; if (on) btn.classList.add('active'); }
})();


// ── Notificações ──
window._notifMuted = localStorage.getItem('clivor_notif_muted') === '1';
(function initNotif() {
  const btn = document.getElementById('cfg-notif');
  if (!btn) return;
  if (window._notifMuted) { btn.textContent = 'Mudo'; btn.classList.remove('active'); }
  else { btn.textContent = 'Ligado'; btn.classList.add('active'); }
})();

function cfgToggleNotif() {
  window._notifMuted = !window._notifMuted;
  localStorage.setItem('clivor_notif_muted', window._notifMuted ? '1' : '0');
  const btn = document.getElementById('cfg-notif');
  if (btn) { btn.textContent = window._notifMuted ? 'Mudo' : 'Ligado'; btn.classList.toggle('active', !window._notifMuted); }
  // Mostra feedback mesmo com notif mudo, pois é a própria config
  const container = document.getElementById('notif-container');
  const div = document.createElement('div');
  div.className = 'notif gold';
  div.textContent = window._notifMuted ? '🔕 Notificações desativadas' : '🔔 Notificações ativadas';
  container.appendChild(div);
  setTimeout(() => div.remove(), 3100);
}
window.cfgToggleNotif = cfgToggleNotif;

// ── Espera o jogo abrir ──
// Avisos e popups que chegam ANTES da tela do jogo (#screen-game) ficar ativa — por exemplo
// durante o carregamento do save, na intro ou na seleção de classe — entram numa fila e só
// aparecem depois que o jogo abre, um de cada vez.
const _esperaFila = [];
let _esperaRodando = false;
let _esperaObs = null;

function _jogoAberto() {
  const g = document.getElementById('screen-game');
  return !!(g && g.classList.contains('active'));
}

function _esperaIniciar() {
  if (_esperaRodando || !_jogoAberto()) return;
  _esperaRodando = true;
  const proximo = function () {
    if (!_jogoAberto()) { _esperaRodando = false; return; }   // saiu do jogo: o resto espera
    const item = _esperaFila.shift();
    if (!item) { _esperaRodando = false; return; }
    try { item.fn(); } catch (e) { console.warn('[notificacoes]', e); }
    setTimeout(proximo, item.gap);
  };
  setTimeout(proximo, 1200);   // respira um pouco depois que a tela do jogo abre
}

function _esperarJogo(fn, gap) {
  if (_jogoAberto() && _esperaFila.length === 0 && !_esperaRodando) { fn(); return; }
  // sem repetir a mesma mensagem em seguida e sem lotar a fila
  if (_esperaFila.length >= 8) _esperaFila.shift();
  _esperaFila.push({ fn: fn, gap: gap || 450 });
  _esperaIniciar();
}

(function _esperaObservar() {
  const g = document.getElementById('screen-game');
  if (!g || typeof MutationObserver !== 'function') return;
  _esperaObs = new MutationObserver(function () { if (_jogoAberto()) _esperaIniciar(); });
  _esperaObs.observe(g, { attributes: true, attributeFilter: ['class'] });
})();

function notify(msg, type = 'gold') {
  if (window._notifMuted) return;
  const mostrar = function () {
    const container = document.getElementById('notif-container');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'notif ' + (type || 'gold');
    div.textContent = msg;
    container.appendChild(div);
    setTimeout(() => div.remove(), 3100);
  };
  _esperarJogo(mostrar, 450);
}

// Popup central de conquista desbloqueada (pergaminho de vidro esmeralda).
// Não substitui o notify() de canto — os dois disparam juntos, pra garantir
// que dá pra ver mesmo se o jogador não estiver olhando pro centro na hora.
function showAchievementPopup(def) {
  if (!def) return;
  _esperarJogo(function () { _mostrarAchievementPopup(def); }, 3900);
}
function _mostrarAchievementPopup(def) {
  const layer = document.getElementById('ach-popup-layer');
  if (!layer || !def) return;
  layer.innerHTML = ''; // corta popup anterior se ainda estiver rodando

  const wrap = document.createElement('div');
  wrap.className = 'ach-popup';
  wrap.innerHTML = `
    <div class="ach-popup-scroll">
      <div class="ach-popup-rod top"></div>
      <div class="ach-popup-medal">${def.icon}</div>
      <div class="ach-popup-eyebrow">Conquista Desbloqueada</div>
      <div class="ach-popup-title">${def.title}</div>
      <div class="ach-popup-sub">${def.desc}</div>
      <div class="ach-popup-reward">+${def.goldReward || 0}◈ · +${def.xpReward || 0} XP</div>
      <div class="ach-popup-rod bottom"></div>
    </div>
  `;
  layer.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('play'));
  setTimeout(() => { if (wrap.parentNode) wrap.remove(); }, 3700);
}
window.showAchievementPopup = showAchievementPopup;
window._jogoAberto = _jogoAberto;

// Popup central de recompensas — usado ao vencer chefes, abrir baús, etc.
// Bem mais fácil de ver que o quadro roxo que ficava dentro do texto do
// narrador (setStory). Fica aberto até o jogador tocar em "Continuar".
//
// items: [{ icon, imgSrc, name, qty }, ...]
// opts:  { gold: número opcional, para mostrar uma linha "💰 X de ouro" }
function showLootPopup(title, items, opts) {
  opts = opts || {};
  const overlay = document.getElementById('loot-popup-overlay');
  const titleEl = document.getElementById('loot-popup-title');
  const listEl  = document.getElementById('loot-popup-list');
  if (!overlay || !listEl) return;

  if (titleEl) titleEl.textContent = title || 'Recompensas Obtidas';
  listEl.innerHTML = '';

  (items || []).forEach((it, i) => {
    if (!it) return;
    const row = document.createElement('div');
    row.className = 'loot-popup-row';
    row.style.animationDelay = (i * 0.06) + 's';
    const iconHtml = it.imgSrc
      ? `<img class="lp-icon" src="${it.imgSrc}" alt=""
             onerror="this.style.display='none';this.nextElementSibling.style.display='inline-block';">
         <span class="lp-icon-emoji" style="display:none;">${it.icon || '❔'}</span>`
      : `<span class="lp-icon-emoji">${it.icon || '❔'}</span>`;
    row.innerHTML = `${iconHtml}<span class="lp-name">${it.name}</span>${it.qty ? `<span class="lp-qty">×${it.qty}</span>` : ''}`;
    listEl.appendChild(row);
  });

  if (opts.gold) {
    const row = document.createElement('div');
    row.className = 'loot-popup-row lp-gold';
    row.style.animationDelay = ((items || []).length * 0.06) + 's';
    row.innerHTML = `<span class="lp-icon-emoji">💰</span><span class="lp-name">${opts.gold} de ouro</span>`;
    listEl.appendChild(row);
  }

  overlay.classList.add('active');
}
window.showLootPopup = showLootPopup;

function closeLootPopup() {
  const overlay = document.getElementById('loot-popup-overlay');
  if (overlay) overlay.classList.remove('active');
}
window.closeLootPopup = closeLootPopup;

function addLog(msg, type = 'info') {
  const log = document.getElementById('battle-log');
  if (!log) return;
  const div = document.createElement('div');
  div.className = 'log-entry ' + type;
  div.textContent = msg;
  log.insertBefore(div, log.firstChild);
  // Manter no máximo 40 entradas
  while (log.children.length > 40) log.removeChild(log.lastChild);
}

// ─────────────────────────────────────────────────────────────
//  18. CUSTOM CONFIRM
// ─────────────────────────────────────────────────────────────
function showCustomConfirm(msg, onOk, onCancel) {
  const el = document.getElementById('custom-confirm');
  document.getElementById('custom-confirm-msg').textContent = msg;
  el.style.display = 'flex';
  document.getElementById('custom-confirm-ok').onclick = () => { el.style.display='none'; if (onOk) onOk(); };
  document.getElementById('custom-confirm-cancel').onclick = () => { el.style.display='none'; if (onCancel) onCancel(); };
}
