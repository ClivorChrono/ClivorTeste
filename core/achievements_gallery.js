// ═══════════════════════════════════════════════════════════════════
//  GALERIA DE CONQUISTAS — tela cheia (scroll 3D, filtros, raridade)
//  Depende de: ACHIEVEMENT_DEFS e Achievements (definidos em missoes.js)
//  Reaproveita G.player, notify(), updateHUD(), checkLevelUp() do jogo.
// ═══════════════════════════════════════════════════════════════════

// categoria de cada conquista — puramente visual, não mexe no save
const AG_CATEGORY = {
  ach_craft: 'forja', ach_compra: 'forja', ach_armadura: 'forja',
  ach_runa_a: 'forja', ach_runa_s: 'forja', ach_runa_ss: 'forja',
  ach_saida_vilarejo: 'exploracao', ach_dungeon: 'exploracao', ach_masmorra: 'exploracao',
  ach_quests_completas: 'desafio',
  ach_kills_50: 'combate', ach_kills_100: 'combate', ach_kills_200: 'combate',
  ach_gold_10k: 'riqueza', ach_gold_20k: 'riqueza', ach_gold_30k: 'riqueza',
};

const AG_CATEGORY_LABELS = {
  todos: 'Todas', forja: 'Forja', exploracao: 'Exploração',
  desafio: 'Desafio', combate: 'Combate', riqueza: 'Riqueza',
};

// raridade derivada da recompensa de XP — quanto mais difícil, mais nobre
function agRarity(def) {
  const xp = def.xpReward || 0;
  if (xp >= 400) return 'lendario';
  if (xp >= 250) return 'epico';
  if (xp >= 100) return 'raro';
  return 'comum';
}

const AG_RARITY_LABELS = { comum: '', raro: 'Raro', epico: 'Épico', lendario: 'Lendário' };

let agActiveCategory = 'todos';

function openAchievementsGallery() {
  Achievements.init();
  document.getElementById('ag-overlay').classList.add('active');
  agRenderGallery();
  // Centraliza no primeiro card PRONTO PRA RESGATAR (unlocked e ainda não
  // claimed), se houver algum — senão cai no primeiro card da lista.
  // Antes disso sempre abria no primeiro card do array (geralmente já
  // resgatado, tipo "Primeira Criação"), então com 16 conquistas numa
  // fileira só de scroll horizontal, dava pra nem perceber que tinha uma
  // pronta pra resgatar lá na frente — parecia que não tinha onde resgatar.
  requestAnimationFrame(() => {
    const container = document.getElementById('ag-scroll-container');
    const readyCard  = document.querySelector('#ag-scroll-content .ag-card:not(.locked):not(.claimed)');
    const firstCard  = document.querySelector('#ag-scroll-content .ag-card');
    const targetCard = readyCard || firstCard;
    if (container && targetCard) {
      container.scrollLeft = targetCard.offsetLeft - (container.clientWidth - targetCard.offsetWidth) / 2;
    }
    agUpdateCoverflow();
  });
}

function closeAchievementsGallery() {
  document.getElementById('ag-overlay').classList.remove('active');
}

function agSetCategory(cat, btnEl) {
  agActiveCategory = cat;
  document.querySelectorAll('.ag-chip').forEach(c => c.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  agRenderGallery();
  requestAnimationFrame(agUpdateCoverflow);
}

function agRenderGallery() {
  Achievements.init();
  const content = document.getElementById('ag-scroll-content');
  const grid = ACHIEVEMENT_DEFS.filter(def => agActiveCategory === 'todos' || AG_CATEGORY[def.id] === agActiveCategory);

  // header de progresso geral (conta todas as definições, não só as filtradas)
  const total = ACHIEVEMENT_DEFS.length;
  const claimedCount = ACHIEVEMENT_DEFS.filter(d => Achievements.isClaimed(d.id)).length;
  const readyCount = ACHIEVEMENT_DEFS.filter(d => Achievements.isUnlocked(d.id) && !Achievements.isClaimed(d.id)).length;
  const pct = total ? Math.round((claimedCount / total) * 100) : 0;
  const headerStat = document.getElementById('ag-header-stat');
  if (headerStat) headerStat.textContent = `${claimedCount} de ${total} resgatadas · ${pct}%`
    + (readyCount > 0 ? ` · ✨ ${readyCount} pronta${readyCount > 1 ? 's' : ''} pra resgatar` : '');
  const headerBarFill = document.getElementById('ag-header-bar-fill');
  if (headerBarFill) headerBarFill.style.width = pct + '%';

  // chips de categoria com contagem
  const chipsWrap = document.getElementById('ag-chips');
  if (chipsWrap) {
    const cats = ['todos', 'forja', 'exploracao', 'desafio', 'combate', 'riqueza'];
    chipsWrap.innerHTML = cats.map(cat => {
      const count = cat === 'todos' ? total : ACHIEVEMENT_DEFS.filter(d => AG_CATEGORY[d.id] === cat).length;
      if (count === 0 && cat !== 'todos') return '';
      return `<div class="ag-chip${cat === agActiveCategory ? ' active' : ''}" onclick="agSetCategory('${cat}', this)">${AG_CATEGORY_LABELS[cat]} <span>${count}</span></div>`;
    }).join('');
  }

  if (!grid.length) {
    content.innerHTML = `<div class="ag-empty">Nenhuma conquista nesta categoria ainda.</div>`;
    return;
  }

  content.innerHTML = grid.map(def => {
    const claimed = Achievements.isClaimed(def.id);
    const ready = Achievements.isUnlocked(def.id);
    const locked = !ready && !claimed;
    const rarity = agRarity(def);
    const rarityLabel = AG_RARITY_LABELS[rarity];

    let progressHtml = '';
    if (locked && (def.killTarget || def.goldTarget)) {
      const current = def.killTarget ? (G.player.kills || 0) : (G.player.gold || 0);
      const target = def.killTarget || def.goldTarget;
      const p = Math.max(0, Math.min(100, (current / target) * 100));
      progressHtml = `
        <div class="ag-progress-wrap">
          <div class="ag-progress-bar"><div class="ag-progress-fill" style="width:${p}%"></div></div>
          <div class="ag-progress-num">${Math.min(current, target)}/${target}</div>
        </div>`;
    }

    let footerHtml = '';
    if (claimed) {
      footerHtml = `<div class="ag-btn ag-btn-claimed">✓ Resgatada</div>`;
    } else if (ready) {
      footerHtml = `<div class="ag-btn ag-btn-ready" onclick="event.stopPropagation(); agClaim('${def.id}')">Resgatar</div>`;
    } else {
      footerHtml = `<div class="ag-btn ag-btn-locked">🔒 Bloqueada</div>`;
    }

    return `
      <div class="ag-card rarity-${rarity}${locked ? ' locked' : ''}${claimed ? ' claimed' : ''}" data-ach-id="${def.id}" onclick="agShowDetail('${def.id}')">
        <div class="ag-frame-groove"></div>
        <div class="ag-card-header">
          <div class="ag-card-title">${def.title}${rarityLabel ? `<span class="ag-rarity-badge ${rarity}">${rarityLabel}</span>` : ''}</div>
          <div class="ag-status-dot ${claimed ? 'claimed' : ready ? 'ready' : ''}"></div>
        </div>
        <div class="ag-icon-section"><div class="ag-icon">${def.icon}</div></div>
        <div class="ag-card-content">
          <div class="ag-desc">${def.desc}</div>
          <div class="ag-stats">
            <div class="ag-stat"><b>+${def.xpReward || 0}</b><span>XP</span></div>
            <div class="ag-stat"><b>+${def.goldReward || 0}</b><span>OURO</span></div>
          </div>
          ${progressHtml}
        </div>
        <div class="ag-card-footer">${footerHtml}</div>
      </div>
      <div class="ag-divider"></div>`;
  }).join('').replace(/<div class="ag-divider"><\/div>$/, '');

  requestAnimationFrame(agUpdateCoverflow);
}

function agClaim(id) {
  Achievements.claim(id);
  agRenderGallery();
}

function agShowDetail(id) {
  const def = ACHIEVEMENT_DEFS.find(d => d.id === id);
  if (!def) return;
  const claimed = Achievements.isClaimed(id);
  const ready = Achievements.isUnlocked(id);
  const rarity = agRarity(def);

  let actionHtml = '';
  if (claimed) {
    actionHtml = `<div class="ag-modal-btn ag-btn-claimed">✓ Já resgatada</div>`;
  } else if (ready) {
    actionHtml = `<div class="ag-modal-btn ag-btn-ready" onclick="agClaim('${id}'); closeAgModal();">Resgatar Recompensa</div>`;
  } else {
    actionHtml = `<div class="ag-modal-btn ag-btn-locked">🔒 Ainda bloqueada</div>`;
  }

  const modal = document.getElementById('ag-modal-overlay');
  modal.innerHTML = `
    <div class="ag-modal-content rarity-${rarity}" onclick="event.stopPropagation()">
      <button class="ag-modal-close" onclick="closeAgModal()">✕</button>
      <div class="ag-frame-groove"></div>
      <div class="ag-modal-icon">${def.icon}</div>
      <div class="ag-modal-title">${def.title}</div>
      <div class="ag-modal-desc">${def.desc}</div>
      <div class="ag-stats" style="justify-content:center;">
        <div class="ag-stat"><b>+${def.xpReward || 0}</b><span>XP</span></div>
        <div class="ag-stat"><b>+${def.goldReward || 0}</b><span>OURO</span></div>
      </div>
      ${actionHtml}
    </div>`;
  modal.classList.add('active');
}

function closeAgModal() {
  document.getElementById('ag-modal-overlay').classList.remove('active');
}

// ═══ efeito 3D coverflow no scroll horizontal ═══
let agLastCenterId = null;

function agUpdateCoverflow() {
  const container = document.getElementById('ag-scroll-container');
  if (!container) return;
  const cards = document.querySelectorAll('#ag-scroll-content .ag-card');
  const containerCenter = container.scrollLeft + container.clientWidth / 2;
  let newCenterCard = null;

  cards.forEach(card => {
    const cardCenter = card.offsetLeft + card.offsetWidth / 2;
    const distance = cardCenter - containerCenter;
    const normalized = distance / (container.clientWidth / 2);
    const clamped = Math.max(-1.6, Math.min(1.6, normalized));

    const rotateY = clamped * -32;
    const translateZ = -Math.abs(clamped) * 160;
    const scale = 1 - Math.abs(clamped) * 0.28;
    const opacity = 1 - Math.abs(clamped) * 0.5;

    // (sem perspective() aqui dentro — o container já define perspective
    // via CSS; duplicar isso no transform de cada card é o que parece
    // causar o descompasso entre a posição VISUAL do card e a área que
    // o navegador realmente considera "tocável" nele em alguns Android)
    card.style.transform = `rotateY(${rotateY}deg) translateZ(${translateZ}px) scale(${scale})`;
    card.style.opacity = Math.max(0.25, opacity);
    card.style.zIndex = Math.round((1 - Math.abs(clamped)) * 100);
    const isCenter = Math.abs(clamped) < 0.15;
    card.classList.toggle('is-center', isCenter);
    if (isCenter) newCenterCard = card;
  });

  // dispara o "pop" só quando o card central realmente muda — não a cada pixel
  if (newCenterCard) {
    const id = newCenterCard.dataset.achId;
    if (id && id !== agLastCenterId) {
      agLastCenterId = id;
      newCenterCard.classList.remove('just-centered');
      void newCenterCard.offsetWidth; // força reflow pra reiniciar a animação
      newCenterCard.classList.add('just-centered');
    }
  }
}

// ═══ realinha o scroll real com o card visualmente centralizado ═══
// (função referenciada no comentário do CSS mas que nunca existia — sem
// ela, o scrollLeft real do container fica dessincronizado da posição
// visual pós-transform 3D, e o botão RESGATAR do card "central" acaba
// caindo fora da área clicável de verdade, parecendo travado ao toque)
let agSettleTimeout = null;

function agSettleToCenter() {
  const container = document.getElementById('ag-scroll-container');
  if (!container) return;
  const cards = document.querySelectorAll('#ag-scroll-content .ag-card');
  if (!cards.length) return;

  const containerCenter = container.scrollLeft + container.clientWidth / 2;
  let closest = null;
  let closestDist = Infinity;
  cards.forEach(card => {
    const cardCenter = card.offsetLeft + card.offsetWidth / 2;
    const dist = Math.abs(cardCenter - containerCenter);
    if (dist < closestDist) { closestDist = dist; closest = card; }
  });

  if (closest) {
    container.scrollTo({
      left: closest.offsetLeft - (container.clientWidth - closest.offsetWidth) / 2,
      behavior: 'smooth',
    });
  }
}

// ═══ toque manual nos cards da coverflow ═══
// Confirmado por teste real: em alguns Android/Chrome, o toque num
// .ag-card girado/deslocado em 3D (rotateY/translateZ) não é detectado
// pelo navegador na posição visual do card — ele "atravessa" e acerta o
// fundo do #ag-scroll-content por trás. Os onclick="" continuam no HTML
// (não atrapalham, e funcionam normalmente em navegadores sem esse bug),
// mas a fonte de verdade agora é este handler: ele usa
// getBoundingClientRect(), que reflete corretamente a posição pós-
// transform na tela, e decide manualmente qual card/botão foi tocado.
function agFindTapTarget(clientX, clientY) {
  const cards = document.querySelectorAll('#ag-scroll-content .ag-card');
  for (const card of cards) {
    const rect = card.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) continue;
    const id = card.dataset.achId;
    if (!id) return;
    const claimBtn = card.querySelector('.ag-btn-ready');
    if (claimBtn) {
      const bRect = claimBtn.getBoundingClientRect();
      if (clientX >= bRect.left && clientX <= bRect.right && clientY >= bRect.top && clientY <= bRect.bottom) {
        agClaim(id);
        return;
      }
    }
    agShowDetail(id);
    return;
  }
}

let agTouchStartX = 0, agTouchStartY = 0, agTouchStartTime = 0;

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('ag-scroll-container');
  if (container) {
    container.addEventListener('scroll', () => {
      requestAnimationFrame(agUpdateCoverflow);
      // só assenta de vez quando o usuário parar de arrastar — durante o
      // gesto ativo isso brigaria com o toque/momentum do navegador.
      clearTimeout(agSettleTimeout);
      agSettleTimeout = setTimeout(agSettleToCenter, 120);
    });

    container.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0];
      agTouchStartX = t.clientX;
      agTouchStartY = t.clientY;
      agTouchStartTime = Date.now();
    }, { passive: true });

    container.addEventListener('touchend', (e) => {
      const t = e.changedTouches[0];
      const dx = Math.abs(t.clientX - agTouchStartX);
      const dy = Math.abs(t.clientY - agTouchStartY);
      const dt = Date.now() - agTouchStartTime;
      // só conta como toque se o dedo praticamente não arrastou — senão
      // é parte do gesto de arrastar o carrossel, não um clique num card.
      if (dx < 10 && dy < 10 && dt < 500) {
        agFindTapTarget(t.clientX, t.clientY);
      }
    });

    // fallback pra mouse (teste em desktop) — não atrapalha touch porque
    // touchend já tratou o toque antes do click sintético do navegador.
    container.addEventListener('click', (e) => {
      if (e.pointerType === 'touch') return;
      agFindTapTarget(e.clientX, e.clientY);
    });
  }
});

window.openAchievementsGallery = openAchievementsGallery;
window.closeAchievementsGallery = closeAchievementsGallery;
window.agSetCategory = agSetCategory;
window.agClaim = agClaim;
window.agShowDetail = agShowDetail;
window.closeAgModal = closeAgModal;
window.agSettleToCenter = agSettleToCenter;
window.agFindTapTarget = agFindTapTarget;


// ══════════════════════════════════════════════════════════════
//  LINHA ÚNICA — substitui a pilha de notificações (notify) por UMA
//  linha na barra do local (onde fica "FLORESTA DE CLIVOR").
//   • Vitória/moedas/mérito/talento viram chips numa linha só, somados
//     (3 vitórias seguidas = 1 aviso).
//   • Outros avisos passam um por vez, na mesma linha.
//   • Tocou na barra → abre o painel com TUDO que você pegou; tocou em
//     qualquer lugar da tela → fecha. Nada cobre o mapa.
//  Não mexe no notify nem no palDinh.js — só "ouve" o #notif-container,
//  esconde ele e redireciona o texto pra cá.
//  Desligar: localStorage.setItem('clivor_linha_unica','0') e recarregar.
// ══════════════════════════════════════════════════════════════
(function () {
  if (typeof document === 'undefined') return;
  const KEY = 'clivor_linha_unica';
  function ativo() { try { return localStorage.getItem(KEY) !== '0'; } catch (e) { return true; } }
  if (!ativo()) return;

  const st = document.createElement('style');
  st.id = 'linha-unica-css';
  st.textContent = `
    #notif-container{ display:none !important; }
    #lu-line{ position:absolute; inset:0; z-index:12; display:none; align-items:center;
      padding:0 36px 0 14px; background:#0a0501; border-bottom:1px solid rgba(240,192,64,0.45);
      font-family:'Noto Sans JP',sans-serif; font-size:0.68rem; color:#f2e8d0; overflow:hidden; cursor:pointer; }
    #lu-line>div{ white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; animation:luUp .35s ease-out; }
    #lu-line .lu-red{ color:#e08060; } #lu-line .lu-purple{ color:#c080ff; } #lu-line .lu-green{ color:#90b870; }
    .lu-chip{ margin-right:12px; letter-spacing:.04em; }
    #lu-dot{ position:absolute; right:12px; top:11px; z-index:13; display:none;
      min-width:16px; height:16px; padding:0 4px; box-sizing:border-box; border-radius:8px; background:#f0c040; color:#1a1000;
      font:700 .55rem/16px 'Noto Sans JP',sans-serif; text-align:center; box-shadow:0 0 8px rgba(240,192,64,.7); pointer-events:none; }
    @keyframes luUp{ from{ transform:translateY(100%); opacity:0 } to{ transform:none; opacity:1 } }
    #lu-catch{ position:fixed; inset:0; z-index:1600; display:none; background:rgba(0,0,0,.35); }
    #lu-panel{ position:fixed; left:0; right:0; z-index:1601; display:none; max-height:55vh; overflow-y:auto;
      box-sizing:border-box; padding:10px 14px 12px; background:rgba(10,6,1,.98); border-bottom:1px solid rgba(240,192,64,.55);
      font-family:'Noto Sans JP',sans-serif; font-size:.72rem; color:#f2e8d0; animation:luUp .25s ease-out; }
    #lu-panel .lu-tot{ display:flex; flex-wrap:wrap; gap:6px 14px; padding-bottom:8px; margin-bottom:6px;
      border-bottom:1px solid rgba(240,192,64,.25); color:#f0c040; font-size:.78rem; }
    #lu-panel .lu-it{ padding:4px 0 4px 8px; border-left:3px solid #f0c040; margin:3px 0; line-height:1.35; }
    #lu-panel .lu-it.red{ border-color:#c0502a; color:#e08060; } #lu-panel .lu-it.purple{ border-color:#9040e0; color:#c080ff; }
    #lu-panel .lu-it.green{ border-color:#6a9a4a; color:#90b870; }
    #lu-panel .lu-hint{ margin-top:6px; font-size:.58rem; color:rgba(242,232,208,.4); text-align:center; letter-spacing:1px; }
  `;
  document.head.appendChild(st);

  const num = s => parseInt(String(s).replace(/\./g, ''), 10) || 0;
  let feed = [], tot = { xp: 0, coin: 0, merit: 0, tal: null };
  let batch = null, timer = null, playing = false, showing = false, ultimoTal = null;

  // Lê a mensagem: se for "só número" (XP, moedas, mérito, talento) soma; senão é aviso de texto.
  function parse(text, type) {
    const r = { xp: 0, coin: 0, merit: 0, tal: null, texto: null };
    let m;
    if ((m = text.match(/Vitória!\s*\+\s*([\d.]+)\s*XP/i))) r.xp = num(m[1]);
    else if ((m = text.match(/^[^\p{L}\p{N}]*\+?\s*([\d.]+)\s*moedas/iu))) r.coin = num(m[1]);
    else if ((m = text.match(/Mérito\s*\+\s*(\d+)/i))) r.merit = num(m[1]);
    else if ((m = text.match(/(\d+)\s*Ponto\(s\)\s*de\s*Talento/i))) r.tal = num(m[1]);
    else r.texto = { t: text, type: type };
    return r;
  }
  window._luParse = parse;

  const bar = () => document.querySelector('.scene-location');
  const visivel = () => { const b = bar(); return !!b && b.offsetParent !== null; };
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function ensureEls() {
    const b = bar();
    if (!b) return null;
    let line = document.getElementById('lu-line');
    if (!line) {
      line = document.createElement('div'); line.id = 'lu-line';
      const dot = document.createElement('div'); dot.id = 'lu-dot';
      b.appendChild(line); b.appendChild(dot);
      b.addEventListener('click', () => { if (feed.length) abrir(); });
    }
    return line;
  }
  function atualizaDot() {
    const d = document.getElementById('lu-dot');
    if (d) { d.style.display = (feed.length && !showing) ? 'block' : 'none'; d.textContent = feed.length; }
  }
  function swap(line, html) { const d = document.createElement('div'); d.innerHTML = html; line.replaceChildren(d); }

  function entrada(r, text, type) {
    tot.xp += r.xp; tot.coin += r.coin; tot.merit += r.merit; if (r.tal != null) tot.tal = r.tal;
    const last = feed[feed.length - 1];
    if (last && last.t === text) last.n++; else feed.push({ t: text, type: type, n: 1 });
    if (feed.length > 60) feed.shift();
  }

  function enfileirar(text, type) {
    const r = parse(text, type);
    entrada(r, text, type);
    batch = batch || { xp: 0, coin: 0, merit: 0, tal: null, textos: [] };
    batch.xp += r.xp; batch.coin += r.coin; batch.merit += r.merit; if (r.tal != null) batch.tal = r.tal;
    if (r.texto) batch.textos.push(r.texto);
    atualizaDot();
    clearTimeout(timer);
    timer = setTimeout(tocar, 600);   // junta tudo que chegar em 0,6s
  }

  async function tocar() {
    if (playing) { timer = setTimeout(tocar, 400); return; }
    playing = true;
    for (let i = 0; i < 40 && !visivel(); i++) await sleep(500);   // espera a barra aparecer (ex.: saindo de batalha)
    const line = ensureEls();
    while (batch && line && visivel()) {
      const b = batch; batch = null;
      showing = true; atualizaDot();
      const cap = document.getElementById('location-caption');   // cobre só nome + legenda; o relógio fica visível
      line.style.bottom = cap ? 'auto' : '0';
      line.style.height = cap ? (cap.offsetTop + cap.offsetHeight + 6) + 'px' : '';
      line.style.display = 'flex';
      const chips = [];
      if (b.xp) chips.push(`<span class="lu-chip">⚔ +${b.xp} XP</span>`);
      if (b.coin) chips.push(`<span class="lu-chip">◈ +${b.coin}</span>`);
      if (b.merit) chips.push(`<span class="lu-chip">★ +${b.merit}</span>`);
      if (b.tal != null && b.tal !== ultimoTal) chips.push(`<span class="lu-chip">✦ ${b.tal} pts</span>`);   // só quando muda
      if (b.tal != null) ultimoTal = b.tal;
      if (chips.length) { swap(line, chips.join('')); await sleep(2300); }
      const extra = b.textos.length > 3 ? b.textos.length - 3 : 0;
      for (const x of b.textos.slice(0, 3)) {
        swap(line, `<span class="lu-${x.type}">${esc(x.t)}</span>`); await sleep(2100);
      }
      if (extra) { swap(line, `<span>+${extra} avisos — toque pra ver</span>`); await sleep(1600); }
    }
    if (line) line.style.display = 'none';
    showing = false; playing = false; atualizaDot();
  }

  function esc(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

  function abrir() {
    const b = bar(); if (!b || !feed.length) return;
    let catcher = document.getElementById('lu-catch'), panel = document.getElementById('lu-panel');
    if (!catcher) {
      catcher = document.createElement('div'); catcher.id = 'lu-catch';
      panel = document.createElement('div'); panel.id = 'lu-panel';
      const fecha = e => { e.preventDefault(); e.stopPropagation(); fechar(); };
      catcher.addEventListener('click', fecha); panel.addEventListener('click', fecha);
      document.body.appendChild(catcher); document.body.appendChild(panel);
    }
    panel.innerHTML = feed.slice().reverse().map(f => `<div class="lu-it ${f.type || ''}">${esc(f.t)}${f.n > 1 ? ' ×' + f.n : ''}</div>`).join('')
      + `<div class="lu-hint">TOQUE EM QUALQUER LUGAR PARA FECHAR</div>`;
    panel.style.top = Math.round(b.getBoundingClientRect().bottom) + 'px';
    catcher.style.display = 'block'; panel.style.display = 'block';
    panel.scrollTop = 0;
  }
  function fechar() {
    ['lu-catch', 'lu-panel'].forEach(id => { const e = document.getElementById(id); if (e) e.style.display = 'none'; });
    feed = []; tot = { xp: 0, coin: 0, merit: 0, tal: null };   // viu tudo: zera
    atualizaDot();
  }
  window.linhaUnica = { abrir: abrir, fechar: fechar };

  // Ouve o container das notificações antigas (funciona não importa como o notify foi escrito)
  function ligar() {
    const c = document.getElementById('notif-container');
    if (!c) return;
    const vistos = new WeakSet();
    new MutationObserver(muts => {
      muts.forEach(m => m.addedNodes.forEach(n => {
        if (!n.classList || !n.classList.contains('notif') || vistos.has(n)) return;
        vistos.add(n);
        const txt = (n.textContent || '').replace(/\s+/g, ' ').trim();
        if (!txt) return;
        const type = ['red', 'green', 'purple'].find(k => n.classList.contains(k)) || 'gold';
        enfileirar(txt, type);
      }));
    }).observe(c, { childList: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ligar); else ligar();
})();
