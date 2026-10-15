// ══════════════════════════════════════════════════════════════════════════════
//  CHRONICLES OF CLIVOR — ascensao_vilarejo.js
//  Painel de Ascensão integrado ao Vilarejo (Ferreiro Gozen)
//  Visual: "Forja de Gozen" — tema ukiyo-e / forja, com têmpera animada e faíscas
// ══════════════════════════════════════════════════════════════════════════════

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  0. ÍCONES DE MATERIAIS (fallback genérico se o id não estiver mapeado)
// ─────────────────────────────────────────────────────────────────────────────

const FORGE_MATERIAL_ICONS = {
  madeira_antigo: '🪵',
  folha_rara: '🍃',
  essencia_sombra: '🌑',
  coracao_negro: '🖤',
  garra_kappa: '🐾',
  escama_ecorron: '🐉',
};

// ─────────────────────────────────────────────────────────────────────────────
//  0.1 OVERLAY DE MENSAGEM (toast centralizado com cor customizável)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mostra uma mensagem centralizada na tela, no estilo visual do jogo.
 * Suporta \n para quebra de linha e cor customizada em hex.
 * @param {string} msg - Texto da mensagem (aceita \n)
 * @param {string} color - Cor em hex (ex: '#ff6b6b')
 */
function showOverlay(msg, color = '#e8c766') {
  let layer = document.getElementById('forge-overlay-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'forge-overlay-layer';
    layer.style.cssText = `
      position:fixed; inset:0; z-index:99999;
      display:flex; align-items:center; justify-content:center;
      pointer-events:none;
    `;
    document.body.appendChild(layer);
  }

  const box = document.createElement('div');
  box.style.cssText = `
    background:rgba(10,6,1,0.95);
    border:2px solid ${color};
    border-radius:10px;
    padding:18px 28px;
    max-width:80vw;
    font-family:'Noto Serif JP',serif;
    font-size:0.95rem;
    color:${color};
    text-align:center;
    white-space:pre-line;
    box-shadow:0 4px 20px rgba(0,0,0,0.6), 0 0 20px ${color}55;
    animation:forge-overlay-in 0.25s ease, forge-overlay-out 0.3s ease 2.2s forwards;
  `;
  box.textContent = msg;
  layer.appendChild(box);

  setTimeout(() => box.remove(), 2600);
}

if (!document.getElementById('forge-overlay-styles')) {
  const style = document.createElement('style');
  style.id = 'forge-overlay-styles';
  style.textContent = `
    @keyframes forge-overlay-in {
      from { opacity:0; transform:scale(0.85) translateY(10px); }
      to   { opacity:1; transform:scale(1) translateY(0); }
    }
    @keyframes forge-overlay-out {
      from { opacity:1; transform:scale(1) translateY(0); }
      to   { opacity:0; transform:scale(0.9) translateY(-10px); }
    }
  `;
  document.head.appendChild(style);
}

function forgeMaterialIcon(id) {
  return FORGE_MATERIAL_ICONS[id] || '◆';
}

function forgePrettyName(id) {
  if (!id) return '';
  return id
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Reaproveita o mesmo helper do jogo (_getItemIconSrc) quando disponível,
// pra respeitar itens carregáveis (ex: Coração Incandescente) do jeito
// que o resto do código já faz. Se não existir (ex: preview isolado),
// cai pro imgSrc puro do item.
function forgeItemImgSrc(itemLike) {
  if (!itemLike) return null;
  if (typeof _getItemIconSrc === 'function') {
    try {
      const src = _getItemIconSrc(itemLike);
      if (src) return src;
    } catch (e) { /* ignora e cai no fallback abaixo */ }
  }
  return itemLike.imgSrc || null;
}

// Busca nome/imagem/emoji reais de um material a partir do ITEM_DB do jogo,
// caindo pro id "bonito" e pro mapa de emojis local se o ITEM_DB não tiver
// (ex: item ainda não cadastrado, ou id com erro de digitação).
function forgeMaterialLookup(id) {
  const dbEntry = (typeof ITEM_DB !== 'undefined') ? ITEM_DB[id] : null;
  return {
    name: (dbEntry && dbEntry.name) || forgePrettyName(id),
    imgSrc: dbEntry ? forgeItemImgSrc(dbEntry) : null,
    emoji: (dbEntry && dbEntry.icon) || forgeMaterialIcon(id),
  };
}

function forgeMatIconHtml(id) {
  const d = forgeMaterialLookup(id);
  if (d.imgSrc) {
    return `<img src="${d.imgSrc}" alt="" style="width:20px;height:20px;object-fit:contain;mix-blend-mode:screen;display:block;" onerror="this.style.display='none'; this.insertAdjacentHTML('afterend', '<span>${d.emoji}</span>')">`;
  }
  return `<span>${d.emoji}</span>`;
}

// Ícone/imagem real da arma no quadro de destaque, com fallback pro emoji
// da própria arma (weapon.icon) ou, na falta dele, pro baseIcon cadastrado
// em WEAPON_ASCENSIONS — sem depender de nenhum caminho novo: usa o
// imgSrc que o item já carrega desde que foi criado no inventário.
function forgeWeaponIconHtml(weapon, fallbackEmoji) {
  const src = forgeItemImgSrc(weapon);
  const emoji = fallbackEmoji || (weapon && weapon.icon) || '⚔️';
  if (src) {
    return `<img src="${src}" alt="" style="width:70%;height:70%;object-fit:contain;mix-blend-mode:screen;display:block;filter:drop-shadow(0 6px 10px rgba(0,0,0,.6));" onerror="this.style.display='none'; this.insertAdjacentHTML('afterend', '<div class=fga-weapon-icon>${emoji}</div>')">`;
  }
  return `<div class="fga-weapon-icon">${emoji}</div>`;
}


// ─────────────────────────────────────────────────────────────────────────────
//  ARMA 3D NA MOLDURA DA FORJA (reaproveita o visualizador da Bolsa — bag.js)
//  Arco / Adaga / Cajado / Maça Sagrada aparecem em 3D no lugar da imagem 2D.
//  Se não houver modelo ou der erro, a imagem 2D antiga continua lá.
// ─────────────────────────────────────────────────────────────────────────────
function forjaMontar3D(weapon) {
  try {
    if (typeof _bag3dKey !== 'function' || typeof _bag3dReady !== 'function' ||
        typeof _bag3dPlace !== 'function' || typeof _bag3dMakeLabel !== 'function') return;
    const key = _bag3dKey(Object.assign({}, weapon, { type: 'equipamento' }));
    const host = document.getElementById('fga-3d-host');
    const frame = document.getElementById('fga-weapon-frame');
    if (!key || !host || !frame) return;
    const label = _bag3dMakeLabel(host, 'Carregando 3D…');
    _bag3dReady(key, label).then(model => {
      if (!host.isConnected) return;            // a tela foi re-renderizada
      label.remove();
      _bag3d.panel = host; _bag3d.rune = null;
      _bag3dPlace(host, model, null);
      frame.querySelectorAll('img, .fga-weapon-icon').forEach(el => { el.style.visibility = 'hidden'; });
    }).catch(err => { _bag3dFail(label, err); });
  } catch (e) {
    console.warn('[Forja 3D]', e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  1. ABRE PAINEL DE ASCENSÃO (chamado do Ferreiro)
// ─────────────────────────────────────────────────────────────────────────────

// Saves antigos podem ter o item da arma salvo com um id diferente do
// id atual usado em WEAPON_ASCENSIONS (ex: a arma foi cadastrada/ajustada
// depois que o save já existia, ou o id mudou de nome internamente).
// Como o nome exibido é bem mais estável entre versões do que o id
// interno, usamos ele como plano B pra achar a config certa — e também
// corrigimos o id salvo, pra não precisar repetir essa busca toda vez.
function resolveWeaponAscensionConfig(weapon) {
  if (!weapon || !weapon.id) return null;
  const idAtual = weapon.id.replace('arma_', '');
  if (WEAPON_ASCENSIONS[idAtual]) return WEAPON_ASCENSIONS[idAtual];

  const idPorNome = Object.keys(WEAPON_ASCENSIONS).find(
    k => WEAPON_ASCENSIONS[k].name === weapon.name
  );
  if (idPorNome) {
    weapon.id = 'arma_' + idPorNome; // corrige o id salvo pra próxima vez
    return WEAPON_ASCENSIONS[idPorNome];
  }
  return null;
}

// Aplica a mesma correção de id em todo o inventário (não só na arma
// equipada), rodando uma vez ao carregar o save.
function _migrarIdsArmaAscensao() {
  if (typeof G === 'undefined' || !G.player || !G.player.inventory) return;
  G.player.inventory.forEach(it => {
    if (!it || it.equipSlot !== 'weapon' || !it.id) return;
    resolveWeaponAscensionConfig(it);
  });
}
if (typeof window !== 'undefined' && typeof loadGame === 'function') {
  const _origLoadGame_ascensaoArmas = loadGame;
  window.loadGame = function (slot) {
    _origLoadGame_ascensaoArmas(slot);
    try { _migrarIdsArmaAscensao(); } catch (e) {}
  };
}

function openAscensionPanel() {
  if (typeof G === 'undefined' || !G.player) return;

  // Encontra arma equipada
  const weapon = G.player.equipped?.weapon;
  if (!weapon) {
    showOverlay('Você não está equipado com nenhuma arma!', '#ff6b6b');
    return;
  }

  const weaponConfig = resolveWeaponAscensionConfig(weapon);

  if (!weaponConfig) {
    showOverlay('Esta arma não possui ascensões disponíveis.', '#ffaa00');
    return;
  }

  renderAscensionUI(weapon, weaponConfig);
}

// ─────────────────────────────────────────────────────────────────────────────
//  2. ESTILOS DA FORJA (injetados uma única vez)
// ─────────────────────────────────────────────────────────────────────────────

function injectForgeAscensionStyles() {
  if (document.getElementById('forge-ascension-styles')) return;

  if (!document.getElementById('forge-ascension-fonts')) {
    const preconnect = document.createElement('link');
    preconnect.rel = 'preconnect';
    preconnect.href = 'https://fonts.googleapis.com';
    document.head.appendChild(preconnect);

    const fontLink = document.createElement('link');
    fontLink.id = 'forge-ascension-fonts';
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;700;800&family=Zen+Maru+Gothic:wght@400;500;700;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap';
    document.head.appendChild(fontLink);
  }

  const style = document.createElement('style');
  style.id = 'forge-ascension-styles';
  style.textContent = `
    .fga-overlay-bg{
      min-height:100%; background:rgba(6,4,3,.72);
      display:flex; align-items:flex-start; justify-content:center;
      padding:28px 14px 40px; box-sizing:border-box;
    }
    .fga-panel{
      position:relative;
      width:100%; max-width:460px;
      border-radius:26px;
      overflow:hidden;
      background: radial-gradient(120% 90% at 50% -10%, #241a10 0%, #1d1712 45%, #14120f 100%);
      box-shadow: 0 40px 80px -20px rgba(0,0,0,.8), 0 0 0 1px #000, inset 0 0 0 2px #000;
      font-family:'Zen Maru Gothic', sans-serif;
      color:#ece1cc;
    }
    .fga-texture{
      position:absolute; inset:0; opacity:.05; z-index:0; pointer-events:none;
      background-image:
        repeating-radial-gradient(circle at 20% 30%, transparent 0 10px, #fff 11px, transparent 12px 40px),
        repeating-radial-gradient(circle at 80% 75%, transparent 0 14px, #fff 15px, transparent 16px 50px);
      mix-blend-mode:overlay;
    }
    .fga-embers{position:absolute; inset:0; pointer-events:none; overflow:hidden; z-index:1;}
    .fga-embers span{
      position:absolute; bottom:-10px; width:3px; height:3px; border-radius:50%;
      background:#ff8a3d; box-shadow:0 0 6px 2px rgba(255,138,61,.8);
      animation:fga-rise linear infinite; opacity:0;
    }
    @keyframes fga-rise{
      0%{ transform:translateY(0) translateX(0); opacity:0; }
      8%{ opacity:1; }
      100%{ transform:translateY(-560px) translateX(var(--drift,10px)); opacity:0; }
    }

    .fga-content{position:relative; z-index:2; padding:22px 18px 26px;}

    .fga-crumb{
      display:flex; align-items:center; gap:8px;
      font-family:'JetBrains Mono', monospace;
      font-size:10.5px; letter-spacing:.14em; text-transform:uppercase;
      color:#8c7f6d; margin-bottom:6px;
    }
    .fga-crumb .fga-dot{width:4px; height:4px; background:#ff8a3d; border-radius:50%; box-shadow:0 0 6px #ff8a3d;}

    .fga-title-row{display:flex; align-items:flex-start; justify-content:space-between; gap:10px;}
    .fga-title-row h1{
      font-family:'Shippori Mincho', serif; font-weight:800;
      font-size:26px; line-height:1.08; margin:0; color:#ece1cc;
      text-shadow:0 2px 0 #000, 0 0 30px rgba(255,138,61,.15);
    }
    .fga-back{
      flex-shrink:0; cursor:pointer;
      font-family:'JetBrains Mono', monospace;
      font-size:10px; letter-spacing:.1em; text-transform:uppercase;
      color:#e0a544; border:1px solid #a67a35; border-radius:20px;
      padding:8px 12px; white-space:nowrap; background:transparent;
    }
    .fga-back:active{transform:scale(.96);}

    .fga-subtitle{
      font-family:'JetBrains Mono', monospace; font-size:11px;
      color:#a67a35; letter-spacing:.08em; margin-top:6px;
    }

    /* hero */
    .fga-hero{
      margin-top:18px; border-radius:18px;
      background: linear-gradient(180deg, rgba(255,138,61,.06), transparent 40%), #241d16;
      border:1px solid #3a2e21; padding:20px 16px 18px;
      display:flex; gap:16px; position:relative; overflow:hidden;
    }
    .fga-hero::before{
      content:""; position:absolute; inset:0;
      background: radial-gradient(circle at 85% 10%, rgba(255,80,20,.18), transparent 55%);
      pointer-events:none;
    }
    .fga-gauge-wrap{display:flex; flex-direction:column; align-items:center; gap:8px; width:34px; flex-shrink:0;}
    .fga-gauge{
      position:relative; width:14px; height:190px; border-radius:8px;
      background: linear-gradient(180deg,#050403 0%, #0d0a08 100%);
      border:1px solid #000; overflow:visible;
    }
    .fga-gauge-track{position:absolute; inset:0; border-radius:8px; overflow:hidden;}
    .fga-gauge-fill{
      position:absolute; left:0; right:0; bottom:0; width:100%;
      background: linear-gradient(180deg, #fff3d6 0%, #ff8a3d 28%, #ff4d1c 62%, #c23b2f 100%);
      box-shadow: 0 0 14px 2px rgba(255,110,40,.55);
      transition: height .8s cubic-bezier(.2,.9,.3,1.2);
    }
    .fga-gauge-fill::after{
      content:""; position:absolute; inset:0;
      background: repeating-linear-gradient(0deg, rgba(0,0,0,.18) 0 2px, transparent 2px 9px);
    }
    .fga-gauge-ticks{position:absolute; inset:0; display:flex; flex-direction:column-reverse; justify-content:space-between; pointer-events:none;}
    .fga-gauge-ticks i{height:1px; background:rgba(0,0,0,.5); box-shadow:0 1px 0 rgba(255,255,255,.05);}
    .fga-gauge-label{font-family:'JetBrains Mono', monospace; font-size:10px; color:#e0a544; letter-spacing:.05em; text-align:center;}
    .fga-gauge-label b{display:block; font-size:15px; color:#ece1cc;}

    .fga-hero-main{flex:1; min-width:0;}
    .fga-weapon-frame{
      width:100%; aspect-ratio:1/0.72; border-radius:12px;
      background: radial-gradient(120% 140% at 30% 20%, rgba(255,110,40,.25), transparent 55%), linear-gradient(160deg, #0f0c09, #1a1410 60%, #0a0807);
      border:1px solid #3a2e21; display:flex; align-items:center; justify-content:center;
      position:relative; overflow:hidden;
    }
    .fga-3d-host{position:absolute; inset:0; z-index:2;}
    .fga-3d-host canvas{display:block; width:100%; height:100%;}
    .fga-weapon-icon{font-size:54px; filter:drop-shadow(0 6px 10px rgba(0,0,0,.6));}
    .fga-anvil-glow{
      position:absolute; bottom:-30px; left:50%; transform:translateX(-50%);
      width:140%; height:60px; background: radial-gradient(ellipse, rgba(255,138,61,.35), transparent 70%);
    }
    .fga-ascension-pill{margin-top:10px; display:flex; align-items:center; justify-content:space-between;}
    .fga-ascension-pill .fga-lvl{font-family:'JetBrains Mono', monospace; font-size:11px; color:#8c7f6d; letter-spacing:.08em;}
    .fga-ascension-pill .fga-lvl b{color:#e0a544; font-size:13px;}

    /* traço de despertar — canto superior esquerdo da moldura da arma */
    .fga-awaken-badge{
      position:absolute; top:8px; left:8px; z-index:3;
      width:26px; height:26px; border-radius:50%;
      display:flex; align-items:center; justify-content:center;
      font-family:'Shippori Mincho', serif; font-weight:800; font-size:12px;
      color:#1a1208; background:linear-gradient(180deg,#ffcf8a,#e0a544 55%,#a67a35);
      border:1px solid #ffdca0; box-shadow:0 0 10px rgba(224,165,68,.6);
    }

    /* section label */
    .fga-section-label{display:flex; align-items:center; gap:10px; margin:24px 0 10px;}
    .fga-section-label .fga-line{flex:1; height:1px; background:linear-gradient(90deg, #3a2e21, transparent);}
    .fga-section-label span{font-family:'JetBrains Mono', monospace; font-size:10.5px; letter-spacing:.16em; text-transform:uppercase; color:#8c7f6d;}

    /* status atual */
    .fga-stat-tags{display:flex; gap:10px; flex-wrap:wrap;}
    .fga-tag{
      flex:1; min-width:100px;
      background: linear-gradient(180deg, #262019, #1b1611);
      border:1px solid #3a2e21; border-radius:12px; padding:12px 12px 10px; position:relative;
    }
    .fga-tag::before{content:""; position:absolute; top:8px; right:8px; width:5px; height:5px; border-radius:50%; background:#a67a35; box-shadow:0 0 4px #a67a35;}
    .fga-tag .fga-t-label{font-family:'JetBrains Mono', monospace; font-size:10px; color:#8c7f6d; letter-spacing:.06em; text-transform:uppercase; display:flex; align-items:center; gap:6px; margin-bottom:6px;}
    .fga-tag .fga-t-val{font-family:'Shippori Mincho', serif; font-weight:700; font-size:26px; color:#ece1cc;}

    .fga-trait-plaque{
      margin-top:10px; border-radius:10px; border:1px dashed #3a2e21; background:rgba(0,0,0,.18);
      padding:12px 14px; font-size:13px; line-height:1.5; color:#c9bda3;
    }
    .fga-trait-plaque b{color:#9fb3bc; font-weight:700;}

    /* proxima ascensao */
    .fga-next-card{margin-top:22px; border-radius:18px; padding:2px; background: linear-gradient(160deg, var(--tier, #a67a35), #2a2016 40%, #000 100%);}
    .fga-next-inner{border-radius:16px; background: linear-gradient(180deg, #201911, #17120c); padding:20px 16px 18px; position:relative; overflow:hidden;}
    .fga-next-inner::after{content:""; position:absolute; top:-40%; right:-20%; width:220px; height:220px; background: radial-gradient(circle, rgba(255,138,61,.14), transparent 65%);}
    .fga-next-head{display:flex; align-items:center; gap:10px; margin-bottom:2px; position:relative; z-index:2;}
    .fga-stamp{
      width:30px; height:30px; border-radius:50%; border:1.5px solid var(--tier, #e0a544);
      display:flex; align-items:center; justify-content:center;
      font-family:'Shippori Mincho', serif; font-weight:800; font-size:13px; color:var(--tier, #e0a544);
      flex-shrink:0; box-shadow:0 0 10px rgba(224,165,68,.25);
    }
    .fga-next-head h2{font-family:'Shippori Mincho', serif; font-size:19px; margin:0; color:#ece1cc; font-weight:700;}
    .fga-next-head .fga-lv{font-family:'JetBrains Mono', monospace; font-size:11px; color:#a67a35;}

    .fga-delta-row{display:flex; gap:10px; margin-top:16px; flex-wrap:wrap; position:relative; z-index:2;}
    .fga-delta{flex:1; min-width:110px; background:rgba(0,0,0,.25); border:1px solid #2c241a; border-radius:10px; padding:10px 10px;}
    .fga-delta .fga-d-label{font-family:'JetBrains Mono', monospace; font-size:9.5px; color:#8c7f6d; letter-spacing:.06em; text-transform:uppercase; margin-bottom:4px;}
    .fga-delta .fga-d-val{font-family:'JetBrains Mono', monospace; font-size:14px; color:#7fd88f; font-weight:600;}
    .fga-delta .fga-d-val .fga-from{color:#8c7f6d; font-weight:400;}

    .fga-special-line{margin-top:14px; padding:12px 14px; border-radius:10px; background: linear-gradient(90deg, rgba(255,138,61,.12), rgba(255,138,61,.02)); border-left:2px solid #ff8a3d; font-size:13px; line-height:1.5; color:#ffd9ab; position:relative; z-index:2;}
    .fga-special-line .fga-k{display:block; font-family:'JetBrains Mono', monospace; font-size:9.5px; letter-spacing:.1em; text-transform:uppercase; color:#ff8a3d; margin-bottom:4px;}

    .fga-tray{margin-top:18px; border-radius:12px; background:rgba(0,0,0,.28); border:1px solid #2c241a; padding:14px 14px 12px; position:relative; z-index:2;}
    .fga-tray-title{font-family:'JetBrains Mono', monospace; font-size:10px; letter-spacing:.12em; text-transform:uppercase; color:#8c7f6d; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; gap:8px;}

    .fga-req-row{display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:8px; font-size:12.5px;}
    .fga-req-row .fga-ok{color:#7fd88f;}
    .fga-req-row .fga-fail{color:#c23b2f;}

    .fga-coin-row{display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;}
    .fga-coin-row .fga-c-left{display:flex; align-items:center; gap:8px;}
    .fga-coin-row .fga-c-val{font-family:'JetBrains Mono', monospace; font-size:14px; color:#ece1cc; font-weight:600;}
    .fga-coin-bar{height:6px; border-radius:4px; background:#000; overflow:hidden; margin-bottom:14px; border:1px solid #2c241a;}
    .fga-coin-bar-fill{height:100%; background:linear-gradient(90deg, #a67a35, #e0a544);}

    .fga-mat-list{display:flex; flex-direction:column; gap:8px;}
    .fga-mat{display:flex; align-items:center; gap:10px; padding:9px 10px; border-radius:9px; background:rgba(255,255,255,.02); border:1px solid #241d15;}
    .fga-mat-icon{width:30px; height:30px; border-radius:7px; background:linear-gradient(160deg,#2c2318,#171009); border:1px solid #3a2e1f; display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0;}
    .fga-mat-name{flex:1; font-size:12.5px; color:#d6c8ab;}
    .fga-mat-count{font-family:'JetBrains Mono', monospace; font-size:12px; color:#c23b2f; font-weight:600;}
    .fga-mat.complete .fga-mat-count{color:#7fd88f;}

    .fga-cta{
      margin-top:16px; width:100%; text-align:center; padding:14px 10px; border-radius:11px;
      font-family:'JetBrains Mono', monospace; font-size:12.5px; letter-spacing:.08em; text-transform:uppercase;
      font-weight:700; border:1px solid transparent; position:relative; z-index:2;
    }
    .fga-cta.ready{
      background: linear-gradient(180deg, #ffcf8a, #e0a544 55%, #a67a35);
      color:#1a1208; cursor:pointer; box-shadow:0 8px 18px -6px rgba(224,165,68,.5);
    }
    .fga-cta.ready:active{transform:scale(.98);}
    .fga-cta.locked{
      background:linear-gradient(180deg,#39301f,#241c11); border-color:#4a3c26; color:#6b5f4a; cursor:not-allowed;
    }
    .fga-cta .fga-missing{display:block; font-size:9.5px; color:#c23b2f; margin-top:3px; letter-spacing:.04em;}

    /* max level */
    .fga-max-card{
      margin-top:22px; border-radius:16px; text-align:center; padding:24px 18px;
      background: linear-gradient(180deg, rgba(224,165,68,.12), transparent 60%), #201911;
      border:1px solid #a67a35;
    }
    .fga-max-card .fga-crown{font-size:30px; margin-bottom:6px;}
    .fga-max-card .fga-max-title{font-family:'Shippori Mincho', serif; font-weight:700; font-size:18px; color:#e0a544;}
    .fga-max-card .fga-max-sub{margin-top:8px; font-size:12.5px; color:#8c7f6d; line-height:1.5;}

    .fga-back-row{margin-top:20px; display:flex;}
    .fga-back-full{
      flex:1; text-align:center; padding:13px 10px; border-radius:11px;
      font-family:'JetBrains Mono', monospace; font-size:12.5px; letter-spacing:.08em; text-transform:uppercase;
      color:#8c7f6d; border:1px solid #3a2e21; cursor:pointer; background:transparent;
    }
    .fga-back-full:active{transform:scale(.98);}

    /* faíscas de ascensão */
    .fga-spark{
      position:absolute; left:50%; top:50%; width:4px; height:4px; border-radius:50%;
      background:#ffe2a8; box-shadow:0 0 8px 2px rgba(255,180,80,.9);
      pointer-events:none; z-index:5;
      animation: fga-spark-burst .9s ease-out forwards;
    }
    @keyframes fga-spark-burst{
      0%{ transform:translate(-50%,-50%) translate(0,0) scale(1); opacity:1; }
      100%{ transform:translate(-50%,-50%) translate(var(--sx), var(--sy)) scale(.2); opacity:0; }
    }
    .fga-levelup-flash{
      position:absolute; inset:0; border-radius:12px; pointer-events:none; z-index:4;
      background: radial-gradient(circle at 50% 50%, rgba(255,210,150,.55), transparent 70%);
      animation: fga-flash-pulse .7s ease-out forwards;
    }
    @keyframes fga-flash-pulse{
      0%{ opacity:0; }
      30%{ opacity:1; }
      100%{ opacity:0; }
    }

    @media (prefers-reduced-motion: reduce){
      .fga-embers span, .fga-spark, .fga-levelup-flash{ animation:none !important; opacity:0 !important; }
    }
  `;
  document.head.appendChild(style);
}

function fgaBuildEmbers(count) {
  let out = '';
  for (let i = 0; i < count; i++) {
    const left = Math.random() * 100;
    const dur = (4 + Math.random() * 5).toFixed(2);
    const delay = (Math.random() * 8).toFixed(2);
    const drift = (Math.random() * 40 - 20).toFixed(0) + 'px';
    out += `<span style="left:${left}%; animation-duration:${dur}s; animation-delay:${delay}s; --drift:${drift};"></span>`;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
//  3. RENDERIZAR UI DE ASCENSÃO (visual "Forja de Gozen")
// ─────────────────────────────────────────────────────────────────────────────

function renderAscensionUI(weapon, weaponConfig) {
  injectForgeAscensionStyles();

  const container = document.getElementById('overlay-content') || createOverlayContainer();
  if (!container) return;

  const currentLevel = WeaponAscension.getLevel(weapon);
  const currentLevelData = weaponConfig.levels[currentLevel];
  const tierColor = currentLevelData.borderColor && currentLevelData.borderColor !== 'none'
    ? currentLevelData.borderColor
    : '#e0a544';

  // Nível máximo real desta arma (antes só existia até LV4, cravado no código —
  // agora respeita quantos níveis a arma realmente tem, ex: Adaga vai até 10)
  const maxLevel = Math.max(...Object.keys(weaponConfig.levels).map(Number));
  const tierName = currentLevelData.tierLabel || 'Têmpera';

  // Traço de Despertar (algarismo romano), se a arma já despertou alguma vez
  const awakenRomanLabel = (typeof WeaponAwaken !== 'undefined') ? WeaponAwaken.getRomanLabel(weapon) : '';

  // Stats atuais da arma — direto do item, JÁ incluindo todos os bônus de
  // têmpera aplicados até agora. Antes esse bloco subtraía de volta todo
  // bônus já ganho pra "achar a base", então "Status Atual" sempre voltava
  // pro valor original (ex: sempre 5) mesmo depois de várias ascensões —
  // era só um problema de exibição, o ataque real (usado em combate)
  // sempre esteve correto.
  let baseStats = {
    atk: weapon.atk || 0, def: weapon.def || 0, spd: weapon.spd || 0, mag: weapon.mag || 0,
    critDamage: weapon.critDamage || 0, critChance: weapon.critBonus || 0,
  };

  const statLabels = {
    atk: { icon: '⚔', label: 'Ataque' },
    def: { icon: '🛡', label: 'Defesa' },
    spd: { icon: '🌀', label: 'Velocidade' },
    mag: { icon: '✨', label: 'Magia' },
    critDamage: { icon: '💥', label: 'Crítico DMG', pct: true },
    critChance: { icon: '🎯', label: 'Chance de Crítico', pct: true },
  };

  let statTagsHtml = '';
  for (const [key, meta] of Object.entries(statLabels)) {
    if (baseStats[key] > 0) {
      const displayVal = meta.pct ? `+${Math.round(baseStats[key] * 100)}%` : baseStats[key];
      statTagsHtml += `
        <div class="fga-tag">
          <div class="fga-t-label">${meta.icon} ${meta.label}</div>
          <div class="fga-t-val">${displayVal}</div>
        </div>
      `;
    }
  }

  const gaugePct = (currentLevel / maxLevel) * 100;

  let html = `
    <div class="fga-overlay-bg" id="fga-overlay-bg">
      <div class="fga-panel" id="fga-panel">
        <div class="fga-texture"></div>
        <div class="fga-embers">${fgaBuildEmbers(20)}</div>

        <div class="fga-content">
          <div class="fga-crumb"><span class="fga-dot"></span>FORJA DE GOZEN · ASCENSÃO</div>
          <div class="fga-title-row">
            <h1>${weaponConfig.name}</h1>
            <div class="fga-back" onclick="closeAscensionPanel()">← Voltar</div>
          </div>
          <div class="fga-subtitle">ARMA EQUIPADA · ${tierName.toUpperCase()} ${currentLevel}/${maxLevel}</div>

          <!-- HERO -->
          <div class="fga-hero">
            <div class="fga-gauge-wrap">
              <div class="fga-gauge" id="fga-gauge">
                <div class="fga-gauge-track">
                  <div class="fga-gauge-fill" style="height:${gaugePct}%;"></div>
                </div>
                <div class="fga-gauge-ticks"><i></i><i></i><i></i><i></i><i></i></div>
              </div>
              <div class="fga-gauge-label">${tierName.toUpperCase()}<b>${currentLevel}/${maxLevel}</b></div>
            </div>

            <div class="fga-hero-main">
              <div class="fga-weapon-frame" id="fga-weapon-frame">
                <div class="fga-anvil-glow"></div>
                ${awakenRomanLabel ? `<div class="fga-awaken-badge" title="Despertar ${awakenRomanLabel}">${awakenRomanLabel}</div>` : ''}
                ${forgeWeaponIconHtml(weapon, weaponConfig.baseIcon)}
                <div class="fga-3d-host" id="fga-3d-host"></div>
              </div>
              <div class="fga-ascension-pill">
                <div class="fga-lvl">NÍVEL DE ASCENSÃO <b>${currentLevel} / ${maxLevel}</b></div>
              </div>
            </div>
          </div>

          <!-- STATUS ATUAL -->
          <div class="fga-section-label"><span>Status Atual</span><div class="fga-line"></div></div>
          <div class="fga-stat-tags">${statTagsHtml}</div>
          <div class="fga-trait-plaque"><b>Traço da lâmina —</b> ${currentLevelData.effectDesc}</div>
  `;

  // Próxima ascensão OU estado máximo
  if (currentLevel < maxLevel) {
    const nextLevel = currentLevel + 1;
    const nextData = weaponConfig.levels[nextLevel];
    const nextTierColor = nextData.borderColor && nextData.borderColor !== 'none' ? nextData.borderColor : '#e0a544';
    const canAscend = WeaponAscension.canAscend(weapon);

    let deltaHtml = '';
    for (const [key, bonus] of Object.entries(nextData.statBonus || {})) {
      if (bonus > 0) {
        const meta = statLabels[key];
        const current = baseStats[key] || 0;
        const next = current + bonus;
        const fmt = v => (meta && meta.pct) ? `+${Math.round(v * 100)}%` : v;
        deltaHtml += `
          <div class="fga-delta">
            <div class="fga-d-label">${meta?.icon || ''} ${meta?.label || key}</div>
            <div class="fga-d-val"><span class="fga-from">${fmt(current)} →</span> ${fmt(next)}</div>
          </div>
        `;
      }
    }

    // Requisitos
    let reqRowsHtml = '';
    if (nextData.levelRequirement) {
      const meetsLevel = G.player.level >= nextData.levelRequirement;
      reqRowsHtml += `
        <div class="fga-req-row">
          <span class="${meetsLevel ? 'fga-ok' : 'fga-fail'}">${meetsLevel ? '✓' : '✗'} Nível mínimo ${nextData.levelRequirement}</span>
        </div>
      `;
    }

    let coinBlockHtml = '';
    if (nextData.costGold) {
      const hasGold = G.player.gold >= nextData.costGold;
      const shortage = nextData.costGold - G.player.gold;
      const pct = Math.min(100, (G.player.gold / nextData.costGold) * 100);
      coinBlockHtml = `
        <div class="fga-coin-row">
          <div class="fga-c-left">🪙 <span class="fga-c-val">${G.player.gold} / ${nextData.costGold}</span></div>
          ${!hasGold ? `<span class="fga-fail" style="font-family:'JetBrains Mono', monospace; font-size:11px;">faltam ${shortage}</span>` : `<span class="fga-ok" style="font-family:'JetBrains Mono', monospace; font-size:11px;">✓ completo</span>`}
        </div>
        <div class="fga-coin-bar"><div class="fga-coin-bar-fill" style="width:${pct}%;"></div></div>
      `;
    }

    let matListHtml = '';
    const scaledMatItems = (canAscend.scaledCostItems && canAscend.scaledCostItems.length > 0)
      ? canAscend.scaledCostItems
      : (nextData.costItems || []);
    if (scaledMatItems.length > 0) {
      for (const req of scaledMatItems) {
        const invItem = G.player.inventory.find(i => i.id === req.id);
        const qty = invItem?.qty || 0;
        const hasItem = qty >= req.qty;
        const matInfo = forgeMaterialLookup(req.id);
        matListHtml += `
          <div class="fga-mat ${hasItem ? 'complete' : ''}">
            <div class="fga-mat-icon">${forgeMatIconHtml(req.id)}</div>
            <div class="fga-mat-name">${matInfo.name}</div>
            <div class="fga-mat-count">${qty} / ${req.qty}</div>
          </div>
        `;
      }
    }

    const ctaClass = canAscend.canAscend ? 'fga-cta ready' : 'fga-cta locked';
    const ctaOnclick = canAscend.canAscend ? `onclick="performAscension('${weapon.id}')"` : '';
    const ctaLabel = canAscend.canAscend
      ? '🔥 Forjar Ascensão'
      : `🔒 Bloqueado`;
    const ctaSub = !canAscend.canAscend ? `<span class="fga-missing">${canAscend.reason}</span>` : '';

    html += `
          <div class="fga-next-card" style="--tier:${nextTierColor};">
            <div class="fga-next-inner">
              <div class="fga-next-head">
                <div class="fga-stamp">${nextLevel}</div>
                <div>
                  <h2>Próxima Têmpera</h2>
                  <div class="fga-lv">Ascensão para o Nível ${nextLevel}</div>
                </div>
              </div>

              <div class="fga-delta-row">${deltaHtml}</div>

              <div class="fga-special-line">
                <span class="fga-k">Efeito desperto</span>
                ${nextData.effectDesc}
              </div>

              <div class="fga-tray">
                <div class="fga-tray-title"><span>Sobre a bigorna</span></div>
                ${reqRowsHtml}
                ${coinBlockHtml}
                <div class="fga-mat-list">${matListHtml}</div>
              </div>

              <div class="${ctaClass}" ${ctaOnclick}>
                ${ctaLabel}
                ${ctaSub}
              </div>
            </div>
          </div>
    `;
  } else {
    // Têmpera maxada (4/4). Verifica se essa arma tem sistema de Despertar
    // (WEAPON_AWAKENINGS) e, se tiver, mostra o card de Despertar em vez do
    // aviso estático antigo.
    const weaponIdRaw = weapon.id.replace('arma_', '');
    const hasAwakenSystem = (typeof WEAPON_AWAKENINGS !== 'undefined') && !!WEAPON_AWAKENINGS[weaponIdRaw];

    if (!hasAwakenSystem) {
      // Arma sem Despertar definido ainda — mantém o card genérico de sempre
      html += `
          <div class="fga-max-card">
            <div class="fga-crown">👑</div>
            <div class="fga-max-title">Têmpera Lendária Completa</div>
            <div class="fga-max-sub">Esta arma atingiu o auge da forja de Gozen.</div>
          </div>
      `;
    } else {
      const awakenLevel = WeaponAwaken.getLevel(weapon);
      const lastCycleData = WeaponAwaken.getCycleData(weaponIdRaw, awakenLevel);
      const isFullyAwakened = lastCycleData && lastCycleData.isFinal;

      if (isFullyAwakened) {
        // Ciclo final concluído — teto máximo da arma
        html += `
          <div class="fga-max-card">
            <div class="fga-crown">👑</div>
            <div class="fga-max-title">Despertar Lendário Completo</div>
            <div class="fga-max-sub">Esta arma atingiu o teto absoluto da forja de Gozen — Despertar ${lastCycleData.romanLabel || 'VI'}.</div>
          </div>
        `;
      } else {
        // Pronta pra tentar despertar (ou faltando requisitos pro próximo ciclo)
        const check = WeaponAwaken.canAwaken(weapon);
        const nextData = check.nextCycleData;

        let awakenDeltaHtml = '';
        if (nextData && nextData.awakenBonus) {
          const bonusMeta = {
            atk: { icon: '⚔', label: 'Ataque' },
            def: { icon: '🛡', label: 'Defesa' },
            critChance: { icon: '🎯', label: 'Chance de Crítico', pct: true },
            spd: { icon: '🌀', label: 'Velocidade' },
            critDamage: { icon: '💥', label: 'Dano Crítico', pct: true },
          };
          for (const [key, val] of Object.entries(nextData.awakenBonus)) {
            if (!val) continue;
            const meta = bonusMeta[key];
            if (!meta) continue;
            const fmt = meta.pct ? `+${Math.round(val * 100)}%` : `+${val}`;
            awakenDeltaHtml += `
              <div class="fga-delta">
                <div class="fga-d-label">${meta.icon} ${meta.label}</div>
                <div class="fga-d-val">${fmt}</div>
              </div>
            `;
          }
        }

        let awakenReqRowsHtml = '';

        let awakenCoinHtml = '';
        if (nextData && nextData.costGold) {
          const hasGold = G.player.gold >= nextData.costGold;
          const shortage = nextData.costGold - G.player.gold;
          const pct = Math.min(100, (G.player.gold / nextData.costGold) * 100);
          awakenCoinHtml = `
            <div class="fga-coin-row">
              <div class="fga-c-left">🪙 <span class="fga-c-val">${G.player.gold} / ${nextData.costGold}</span></div>
              ${!hasGold ? `<span class="fga-fail" style="font-family:'JetBrains Mono', monospace; font-size:11px;">faltam ${shortage}</span>` : `<span class="fga-ok" style="font-family:'JetBrains Mono', monospace; font-size:11px;">✓ completo</span>`}
            </div>
            <div class="fga-coin-bar"><div class="fga-coin-bar-fill" style="width:${pct}%;"></div></div>
          `;
        }

        let awakenMatListHtml = '';
        if (nextData && nextData.costItems && nextData.costItems.length > 0) {
          for (const req of nextData.costItems) {
            const invItem = G.player.inventory.find(i => i.id === req.id);
            const qty = invItem?.qty || 0;
            const hasItem = qty >= req.qty;
            const matInfo = forgeMaterialLookup(req.id);
            awakenMatListHtml += `
              <div class="fga-mat ${hasItem ? 'complete' : ''}">
                <div class="fga-mat-icon">${forgeMatIconHtml(req.id)}</div>
                <div class="fga-mat-name">${matInfo.name}</div>
                <div class="fga-mat-count">${qty} / ${req.qty}</div>
              </div>
            `;
          }
        }

        const awakenCtaClass = check.canAwaken ? 'fga-cta ready' : 'fga-cta locked';
        const awakenCtaOnclick = check.canAwaken ? `onclick="performAwaken('${weapon.id}')"` : '';
        const awakenCtaLabel = check.canAwaken ? '🌟 Despertar' : '🔒 Bloqueado';
        const awakenCtaSub = !check.canAwaken ? `<span class="fga-missing">${check.reason}</span>` : '';

        html += `
          <div class="fga-next-card" style="--tier:#c58cff;">
            <div class="fga-next-inner">
              <div class="fga-next-head">
                <div class="fga-stamp">${nextData ? nextData.romanLabel : ''}</div>
                <div>
                  <h2>${nextData ? nextData.name : 'Despertar'}</h2>
                  <div class="fga-lv">Bônus permanente · têmpera reinicia mais forte</div>
                </div>
              </div>

              <div class="fga-delta-row">${awakenDeltaHtml}</div>

              <div class="fga-special-line">
                <span class="fga-k">Ao despertar</span>
                ${nextData && nextData.effectDesc ? nextData.effectDesc : 'A arma reinicia sua têmpera do zero, mais forte que antes.'}
              </div>

              <div class="fga-tray">
                <div class="fga-tray-title"><span>Sobre a bigorna</span></div>
                ${awakenReqRowsHtml}
                ${awakenCoinHtml}
                <div class="fga-mat-list">${awakenMatListHtml}</div>
              </div>

              <div class="${awakenCtaClass}" ${awakenCtaOnclick}>
                ${awakenCtaLabel}
                ${awakenCtaSub}
              </div>
            </div>
          </div>
        `;
      }
    }
  }

  html += `
          <div class="fga-back-row">
            <div class="fga-back-full" onclick="closeAscensionPanel()">← Voltar à Ferraria</div>
          </div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
  container.style.display = 'block';
  forjaMontar3D(weapon);

  const overlay = document.getElementById('overlay');
  if (overlay) overlay.style.display = 'block';
}

// ─────────────────────────────────────────────────────────────────────────────
//  4. FAÍSCAS DE ASCENSÃO — disparadas ao subir de nível
// ─────────────────────────────────────────────────────────────────────────────

function spawnAscensionSparks(targetEl, sparkCount = 22) {
  if (!targetEl) return;

  // Flash dourado sobre o quadro da arma
  const flash = document.createElement('div');
  flash.className = 'fga-levelup-flash';
  targetEl.appendChild(flash);
  setTimeout(() => flash.remove(), 750);

  for (let i = 0; i < sparkCount; i++) {
    const spark = document.createElement('span');
    spark.className = 'fga-spark';
    const angle = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 90;
    const sx = Math.cos(angle) * dist;
    const sy = Math.sin(angle) * dist - 20; // leve tendência pra cima, como faíscas de forja
    spark.style.setProperty('--sx', `${sx}px`);
    spark.style.setProperty('--sy', `${sy}px`);
    spark.style.left = (40 + Math.random() * 20) + '%';
    spark.style.top = (30 + Math.random() * 40) + '%';
    spark.style.animationDelay = (Math.random() * 0.15) + 's';
    targetEl.appendChild(spark);
    setTimeout(() => spark.remove(), 1100);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  5. EXECUTAR ASCENSÃO
// ─────────────────────────────────────────────────────────────────────────────

function performAscension(weaponId) {
  if (!weaponId || typeof G === 'undefined' || !G.player) return;

  const weapon = G.player.equipped?.weapon;
  if (!weapon || weapon.id !== weaponId) {
    showOverlay('Erro: arma não encontrada', '#ff6b6b');
    return;
  }

  const check = WeaponAscension.canAscend(weapon);
  if (!check.canAscend) {
    showOverlay(`Não pode ascender: ${check.reason}`, '#ff6b6b');
    return;
  }

  // Executa ascensão
  if (WeaponAscension.ascendWeapon(weapon)) {
    const newLevel = WeaponAscension.getLevel(weapon);

    // Dispara faíscas sobre a lâmina antes de re-renderizar a tela
    const gaugeEl = document.getElementById('fga-gauge');
    const frameEl = document.getElementById('fga-weapon-frame');
    if (gaugeEl) spawnAscensionSparks(gaugeEl, 14);
    if (frameEl) spawnAscensionSparks(frameEl, 20);

    showOverlay(
      `🌟 Ascensão bem-sucedida!\n${weapon.name} agora é nível ${newLevel}!`,
      '#4ade80'
    );

    // Rerender UI (depois das faíscas terminarem de aparecer)
    setTimeout(() => {
      const config = resolveWeaponAscensionConfig(weapon);
      renderAscensionUI(weapon, config);
    }, 900);

    // Salvar jogo
    if (typeof saveGame !== 'undefined') {
      saveGame();
    }
  } else {
    showOverlay('Erro ao ascender a arma', '#ff6b6b');
  }
}

function performAwaken(weaponId) {
  if (!weaponId || typeof G === 'undefined' || !G.player) return;
  if (typeof WeaponAwaken === 'undefined') return;

  const weapon = G.player.equipped?.weapon;
  if (!weapon || weapon.id !== weaponId) {
    showOverlay('Erro: arma não encontrada', '#ff6b6b');
    return;
  }

  const check = WeaponAwaken.canAwaken(weapon);
  if (!check.canAwaken) {
    showOverlay(`Não pode despertar: ${check.reason}`, '#ff6b6b');
    return;
  }

  const cycleName = check.nextCycleData ? check.nextCycleData.name : 'Despertar';

  if (WeaponAwaken.awakenWeapon(weapon)) {
    // Faíscas sobre a lâmina antes de re-renderizar a tela
    const gaugeEl = document.getElementById('fga-gauge');
    const frameEl = document.getElementById('fga-weapon-frame');
    if (gaugeEl) spawnAscensionSparks(gaugeEl, 18);
    if (frameEl) spawnAscensionSparks(frameEl, 26);

    showOverlay(
      `🌟 ${cycleName}!\n${weapon.name} despertou com mais poder!`,
      '#c58cff'
    );

    // Rerender UI (depois das faíscas terminarem de aparecer)
    setTimeout(() => {
      const config = resolveWeaponAscensionConfig(weapon);
      renderAscensionUI(weapon, config);
    }, 900);

    // Salvar jogo
    if (typeof saveGame !== 'undefined') {
      saveGame();
    }
  } else {
    showOverlay('Erro ao despertar a arma', '#ff6b6b');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  6. FECHAR PAINEL
// ─────────────────────────────────────────────────────────────────────────────

function closeAscensionPanel() {
  const overlay = document.getElementById('overlay');
  if (overlay) {
    overlay.style.display = 'none';
  }

  const container = document.getElementById('overlay-content');
  if (container) {
    container.style.display = 'none';
    container.innerHTML = '';
  }

  // Rerender tela anterior (se vilarejo aberta)
  if (typeof showVillageScreen !== 'undefined') {
    showVillageScreen('menuprinc');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  7. HELPER: criar overlay container se não existir
// ─────────────────────────────────────────────────────────────────────────────

function createOverlayContainer() {
  let container = document.getElementById('overlay-content');
  if (!container) {
    container = document.createElement('div');
    container.id = 'overlay-content';
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.overflowY = 'auto';
    container.style.zIndex = '1001';
    document.body.appendChild(container);
  }
  return container;
}

console.log('✓ Ascensão Vilarejo (Forja de Gozen) carregado');
