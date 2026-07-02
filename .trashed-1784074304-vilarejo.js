// =============================================================
//  VILAREJO.JS — Chronicles of Clivor
//  Vilarejo da Pedra Branca: reputação, horários e todos os locais
//  Depende de: palDinh.js (G, setScene, setStory, hideEnemy,
//              notify, addLog, updateHUD, addItem,
//              storyNode_floresta, storyNode_explorar)
// =============================================================

'use strict';

// ─────────────────────────────────────────────────────────────
//  1. SISTEMA DE REPUTAÇÃO
// ─────────────────────────────────────────────────────────────

function getRepTier() {
  const r = G.reputation || 0;
  if (r < -30) return { id:'hostil',     label:'Hostil',     color:'#c04030' };
  if (r < 50)  return { id:'neutro',     label:'Neutro',     color:'rgba(200,150,10,0.6)' };
  if (r < 150) return { id:'conhecido',  label:'Conhecido',  color:'#8ab0d0' };
  if (r < 300) return { id:'respeitado', label:'Respeitado', color:'#90b870' };
  return             { id:'lendario',   label:'Lendário',   color:'#f0c040' };
}

function addReputation(amount, reason) {
  G.reputation = Math.max(-100, Math.min(500, (G.reputation || 0) + amount));
  const tier = getRepTier();
  if (amount > 0) notify(`⭐ Reputação +${amount} — ${reason}`, 'gold');
  else if (amount < 0) notify(`💔 Reputação ${amount} — ${reason}`, 'red');
  addLog(`Reputação ${amount > 0 ? '+' : ''}${amount}: ${reason} (${tier.label})`, amount >= 0 ? 'xp' : 'dmg');
}

// ─────────────────────────────────────────────────────────────
//  2. SISTEMA DE HORÁRIO
// ─────────────────────────────────────────────────────────────

const LOCATION_SCHEDULE = {
  estalagem: { alwaysOpen: true },
  taverna:   { alwaysOpen: true },
  mercado:   { open: [0,1,2,3], closedMsg: 'As barracas do mercador estão fechadas. O comerciante só trabalha do amanhecer até o anoitecer.' },
  ferreiro:  { open: [0,1,2,3,4], closedMsg: 'A forja está fria. Gozen descansa à meia-noite. Volte de manhã.' },
  templo:    { open: [0,1,2], closedMsg: 'O Templo está com as portas cerradas. Os ritos noturnos são privados. Retorne durante o dia.' },
  torre:     { alwaysOpen: true },
};

function isLocationOpen(location) {
  const sched = LOCATION_SCHEDULE[location];
  if (!sched) return true;
  if (sched.alwaysOpen) return true;
  return sched.open.includes(G.timeIndex || 1);
}

function locationClosedDialog(location) {
  const msg = (LOCATION_SCHEDULE[location] && LOCATION_SCHEDULE[location].closedMsg) || 'Este local está fechado agora.';
  setStory('NARRADOR', msg, [{ icon:'↩', text:'Voltar ao vilarejo', action: storyNode_vilarejo }]);
}

// ─────────────────────────────────────────────────────────────
//  3. HUB PRINCIPAL DO VILAREJO
// ─────────────────────────────────────────────────────────────

function storyNode_vilarejo() {
  if (!G.mapUnlocked) {
    G.mapUnlocked = true;
    addReputation(20, 'Chegou ao Vilarejo da Pedra Branca pela primeira vez');
  }
  setScene('vilarejo');
  hideEnemy();

  const tier = getRepTier();
  const repLine = `\n\n★ Sua reputação: ${tier.label} (${G.reputation || 0} pts)`;
  const castleKills = G.castle ? G.castle.enemiesKilled : 0;

  let vilText;
  if (castleKills >= 12) {
    vilText = `O Vilarejo da Pedra Branca celebra em voz baixa. As criaturas corrompidas pararam de atacar as fazendas.\n\nO velho ferreiro levanta a cabeça quando te vê: "Você foi lá fundo, não foi?"\n\n◈ Toque nos ícones do mapa para explorar os locais.`;
  } else if (castleKills >= 4) {
    vilText = `O Vilarejo da Pedra Branca respira aliviado — os ataques das criaturas diminuíram.\n\nA sacerdotisa do Templo acena quando te vê: "Continue, viajante. Cada guardião derrubado enfraquece o Senhor das Cinzas."\n\n◈ Toque nos ícones do mapa para explorar os locais.`;
  } else {
    vilText = `O Vilarejo da Pedra Branca pulsa com vida tensa. Ferreiros batem martelos com urgência, e crianças são recolhidas cedo.\n\nUm aviso na parede do poço: "RECOMPENSA — Quem enfrentar o Castelo Maldito ao norte receberá honras e ouro."\n\n◈ Toque nos ícones do mapa para explorar os locais.`;
  }

  setStory('NARRADOR', vilText + repLine, [
    { icon:'🌲', text:'Voltar à floresta', action: storyNode_floresta },
  ]);
}

// ─────────────────────────────────────────────────────────────
//  4. ROTEADOR DO MAPA
// ─────────────────────────────────────────────────────────────

function villageGoTo(location) {
  if (location === 'saida') {
    setScene('floresta');
    storyNode_explorar();
    return;
  }
  if (!isLocationOpen(location)) {
    locationClosedDialog(location);
    return;
  }
  switch(location) {
    case 'mercado':   storyNode_mercado();   break;
    case 'estalagem': storyNode_estalagem(); break;
    case 'taverna':   storyNode_taverna();   break;
    case 'ferreiro':  storyNode_ferreiro();  break;
    case 'templo':    storyNode_templo();    break;
    case 'torre':     storyNode_torre();     break;
  }
}
window.villageGoTo = villageGoTo;

// ─────────────────────────────────────────────────────────────
//  5-A. SISTEMA DE ENCANTAMENTOS — RUNA DA ARMA
// ─────────────────────────────────────────────────────────────

const ENCHANT_TIERS = [
  {
    id: 'D',
    label: 'Runa D',
    color: '#9e9e9e',
    glow: '0 0 8px #9e9e9e88',
    req: { level: 3 },
    cost: 30,
    bonus: { atk: 2 },
    desc: 'Entalhe básico. Fio da lâmina mais estável.',
    flavor: '"Gravo a runa mais simples — mas não a menos útil."',
    cssClass: 'enchant-d',
  },
  {
    id: 'C',
    label: 'Runa C',
    color: '#a0622a',
    glow: '0 0 10px #a0622a99',
    req: { level: 7 },
    cost: 60,
    bonus: { atk: 3, def: 1 },
    desc: 'Metal temperado com cinza de Clivor. ATQ+3, DEF+1.',
    flavor: '"Só faço isso para aventureiros que já provaram algo."',
    cssClass: 'enchant-c',
  },
  {
    id: 'B',
    label: 'Runa B',
    color: '#00e5cc',
    glow: '0 0 14px #00e5ccbb',
    req: { level: 9 },
    cost: 100,
    bonus: { atk: 5, spd: 2 },
    desc: 'Traço de cristal ciano. Corte veloz e preciso. ATQ+5, VEL+2.',
    flavor: '"Precisa de mãos firmes para gravar isso. E você vai precisar de sorte."',
    cssClass: 'enchant-b',
  },
  {
    id: 'A',
    label: 'Runa A',
    color: '#e8c840',
    glow: '0 0 18px #e8c840cc',
    req: { dungeonSombras: true },
    cost: 180,
    bonus: { atk: 7, def: 3, spd: 1 },
    desc: 'Forjada com fragmento das Sombras. ATQ+7, DEF+3, VEL+1.',
    flavor: '"Esse metal absorveu algo lá dentro. Respeite-o."',
    cssClass: 'enchant-a',
  },
  {
    id: 'S',
    label: 'Runa S',
    color: '#ff7700',
    glow: '0 0 22px #ff7700dd',
    req: { dungeonKappa: true },
    cost: 300,
    bonus: { atk: 12, def: 5, spd: 3 },
    desc: 'Escama do Kappa fundida no aço. ATQ+12, DEF+5, VEL+3.',
    flavor: '"Não sabia se conseguia gravar isso. Mas aqui está."',
    cssClass: 'enchant-s',
  },
  {
    id: 'SS',
    label: 'Runa SS',
    color: '#cc44ff',
    glow: '0 0 28px #cc44ffee',
    req: { locked: true },
    cost: 0,
    bonus: {},
    desc: '??? — Segredo ainda não revelado.',
    flavor: '"Nem eu sei o que isso vai invocar."',
    cssClass: 'enchant-ss',
  },
  {
    id: 'XZ',
    label: 'Runa XZ',
    color: '#111111',
    glow: '0 0 35px #000000ff, 0 0 8px #ffffffaa',
    req: { locked: true },
    cost: 0,
    bonus: {},
    desc: '??? — Existência proibida.',
    flavor: '"Não pergunte sobre isso."',
    cssClass: 'enchant-xz',
  },
];

// Injeta CSS de encantamentos dinamicamente (uma vez)
(function injectEnchantCSS() {
  if (document.getElementById('enchant-style')) return;
  const style = document.createElement('style');
  style.id = 'enchant-style';
  style.textContent = `
    /* ── Auras de encantamento na imagem da arma ── */
    .weapon-enchant-d  { filter: drop-shadow(0 0 6px #9e9e9e); }
    .weapon-enchant-c  { filter: drop-shadow(0 0 8px #a0622a); }
    .weapon-enchant-b  { filter: drop-shadow(0 0 12px #00e5cc); animation: enchant-pulse-b 1.8s ease-in-out infinite; }
    .weapon-enchant-a  { filter: drop-shadow(0 0 14px #e8c840); animation: enchant-pulse-a 1.4s ease-in-out infinite; }
    .weapon-enchant-s  { filter: drop-shadow(0 0 18px #ff7700); animation: enchant-pulse-s 1.1s ease-in-out infinite; }
    .weapon-enchant-ss { filter: drop-shadow(0 0 24px #cc44ff); animation: enchant-pulse-ss 0.9s ease-in-out infinite; }
    .weapon-enchant-xz { filter: drop-shadow(0 0 30px #ffffff) brightness(0.1); animation: enchant-pulse-xz 0.7s ease-in-out infinite; }

    @keyframes enchant-pulse-b  { 0%,100%{filter:drop-shadow(0 0 8px #00e5cc)}  50%{filter:drop-shadow(0 0 18px #00e5cc)} }
    @keyframes enchant-pulse-a  { 0%,100%{filter:drop-shadow(0 0 10px #e8c840)} 50%{filter:drop-shadow(0 0 22px #e8c840)} }
    @keyframes enchant-pulse-s  { 0%,100%{filter:drop-shadow(0 0 14px #ff7700)} 50%{filter:drop-shadow(0 0 28px #ff7700)} }
    @keyframes enchant-pulse-ss { 0%,100%{filter:drop-shadow(0 0 18px #cc44ff)} 50%{filter:drop-shadow(0 0 36px #cc44ff)} }
    @keyframes enchant-pulse-xz { 0%,100%{filter:drop-shadow(0 0 24px #fff) brightness(0.05)} 50%{filter:drop-shadow(0 0 48px #fff) brightness(0.2)} }

    /* ── Badge de runa exibido no HUD/equipamento ── */
    .enchant-badge {
      display: inline-block;
      font-size: 0.7em;
      font-weight: bold;
      padding: 1px 6px;
      border-radius: 4px;
      margin-left: 4px;
      vertical-align: middle;
      letter-spacing: 1px;
      border: 1px solid currentColor;
    }
    .enchant-badge-d  { color:#9e9e9e; border-color:#9e9e9e44; background:#1a1a1a; }
    .enchant-badge-c  { color:#c07840; border-color:#a0622a66; background:#1a1208; }
    .enchant-badge-b  { color:#00e5cc; border-color:#00e5cc66; background:#001a18; box-shadow:0 0 6px #00e5cc44; }
    .enchant-badge-a  { color:#e8c840; border-color:#e8c84066; background:#1a1600; box-shadow:0 0 8px #e8c84044; }
    .enchant-badge-s  { color:#ff7700; border-color:#ff770066; background:#1a0800; box-shadow:0 0 12px #ff770055; animation:enchant-pulse-badge-s 1.1s ease-in-out infinite; }
    .enchant-badge-ss { color:#cc44ff; border-color:#cc44ff66; background:#0d001a; box-shadow:0 0 14px #cc44ff55; animation:enchant-pulse-badge-ss 0.9s ease-in-out infinite; }
    .enchant-badge-xz { color:#fff;    border-color:#ffffff66; background:#000;    box-shadow:0 0 18px #ffffff55; animation:enchant-pulse-badge-xz 0.7s ease-in-out infinite; }

    @keyframes enchant-pulse-badge-s  { 0%,100%{box-shadow:0 0 8px #ff770055}  50%{box-shadow:0 0 18px #ff7700bb} }
    @keyframes enchant-pulse-badge-ss { 0%,100%{box-shadow:0 0 10px #cc44ff55} 50%{box-shadow:0 0 22px #cc44ffbb} }
    @keyframes enchant-pulse-badge-xz { 0%,100%{box-shadow:0 0 14px #ffffff55} 50%{box-shadow:0 0 30px #ffffffbb} }

    /* ── Tela de seleção de encantamento no Gozen ── */
    .enchant-menu {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 8px 0;
    }
    .enchant-card {
      border-radius: 8px;
      border: 1px solid #333;
      padding: 10px 12px;
      background: #0d0d0d;
      cursor: pointer;
      transition: border-color 0.2s, box-shadow 0.2s;
      position: relative;
    }
    .enchant-card:not(.locked):not(.active):hover { border-color: #666; }
    .enchant-card.active  { border-color: var(--ec); box-shadow: 0 0 10px var(--ec-glow); }
    .enchant-card.locked  { opacity: 0.45; cursor: not-allowed; }
    .enchant-card.unavail { opacity: 0.6; cursor: not-allowed; }
    .enchant-card-header  { display:flex; align-items:center; gap:8px; margin-bottom:4px; }
    .enchant-card-name    { font-weight:bold; font-size:1em; }
    .enchant-card-cost    { margin-left:auto; font-size:0.85em; color:#c8a84a; }
    .enchant-card-desc    { font-size:0.8em; color:#aaa; }
    .enchant-card-bonus   { font-size:0.78em; color:#88c888; margin-top:2px; }
    .enchant-card-flavor  { font-size:0.75em; color:#666; font-style:italic; margin-top:4px; }
    .enchant-card-req     { font-size:0.75em; margin-top:2px; }
    .enchant-active-tag   { position:absolute; top:6px; right:8px; font-size:0.68em; font-weight:bold; color:#000; background:var(--ec); padding:1px 5px; border-radius:3px; }
  `;
  document.head.appendChild(style);
})();

function getEnchantTier(id) {
  return ENCHANT_TIERS.find(t => t.id === id) || null;
}

function checkEnchantReq(tier) {
  if (tier.req.locked) return { ok: false, reason: 'Bloqueado — segredo não revelado.' };
  if (tier.req.level && (G.player.level || 1) < tier.req.level)
    return { ok: false, reason: `Nível mínimo: ${tier.req.level} (você tem ${G.player.level || 1})` };
  if (tier.req.dungeonSombras && !G.dungeonSombrasCleared)
    return { ok: false, reason: 'Requer: concluir o Dungeon das Sombras.' };
  if (tier.req.dungeonKappa && !G.dungeonKappaCleared)
    return { ok: false, reason: 'Requer: vencer a Masmorra do Kappa.' };
  return { ok: true };
}

// Aplica aura CSS na imagem da arma (se houver elemento com id="weapon-img")
function applyWeaponEnchantVisual(enchantId) {
  const imgs = document.querySelectorAll('.weapon-img, #weapon-img, [data-weapon-img]');
  imgs.forEach(img => {
    // remove classes anteriores
    img.classList.forEach(c => { if (c.startsWith('weapon-enchant-')) img.classList.remove(c); });
    if (enchantId) img.classList.add(`weapon-enchant-${enchantId.toLowerCase()}`);
  });
}

// Retorna badge HTML para uso em qualquer tela
function enchantBadgeHTML(enchantId) {
  if (!enchantId) return '';
  const t = getEnchantTier(enchantId);
  if (!t) return '';
  return `<span class="enchant-badge enchant-badge-${t.id.toLowerCase()}">${t.label}</span>`;
}
window.enchantBadgeHTML = enchantBadgeHTML;
window.applyWeaponEnchantVisual = applyWeaponEnchantVisual;

function storyNode_encantamentos() {
  const p = G.player;
  const current = p._weaponEnchant || null;
  const curTier = current ? getEnchantTier(current) : null;

  // Monta HTML do menu de encantamentos
  let cardsHTML = '<div class="enchant-menu">';
  ENCHANT_TIERS.forEach(tier => {
    const req = checkEnchantReq(tier);
    const isActive = current === tier.id;
    const isLocked = tier.req.locked;
    const canAfford = p.gold >= tier.cost;
    const isAvail = req.ok && canAfford && !isActive;

    let classes = 'enchant-card';
    if (isLocked) classes += ' locked';
    else if (isActive) classes += ' active';
    else if (!req.ok || !canAfford) classes += ' unavail';

    // bonus text
    const bonusParts = [];
    if (tier.bonus.atk) bonusParts.push(`ATQ+${tier.bonus.atk}`);
    if (tier.bonus.def) bonusParts.push(`DEF+${tier.bonus.def}`);
    if (tier.bonus.spd) bonusParts.push(`VEL+${tier.bonus.spd}`);
    const bonusText = bonusParts.length ? bonusParts.join(', ') : '???';

    const colorVar = `--ec:${tier.color}; --ec-glow:${tier.color}44;`;

    cardsHTML += `
      <div class="enchant-card ${classes.replace('enchant-card ','')}" style="${colorVar}"
           onclick="enchantSelect('${tier.id}')">
        ${isActive ? `<span class="enchant-active-tag">ATIVA</span>` : ''}
        <div class="enchant-card-header">
          <span class="enchant-card-name" style="color:${tier.color}">${tier.label}</span>
          ${!isLocked ? `<span class="enchant-card-cost">${tier.cost > 0 ? tier.cost+'◈' : '—'}</span>` : ''}
        </div>
        <div class="enchant-card-desc">${tier.desc}</div>
        ${!isLocked ? `<div class="enchant-card-bonus">${bonusText}</div>` : ''}
        ${!req.ok && !isLocked ? `<div class="enchant-card-req" style="color:#c06040">⚠ ${req.reason}</div>` : ''}
        ${!canAfford && req.ok && !isLocked && !isActive ? `<div class="enchant-card-req" style="color:#c06040">⚠ Sem moedas suficientes</div>` : ''}
        <div class="enchant-card-flavor">${tier.flavor}</div>
      </div>`;
  });
  cardsHTML += '</div>';

  const currentLine = curTier
    ? `Encantamento atual: <span style="color:${curTier.color};font-weight:bold">${curTier.label}</span>`
    : 'Sua arma não possui encantamento.';

  setScene('vilarejo');
  setStory('FERREIRO GOZEN',
    `Gozen coloca os óculos escuros de trabalho e examina a lâmina à luz da forja.\n\n"Runas antigas, gravadas no metal. Cada uma pede um preço — em moedas e em sangue derramado."\n\n${currentLine}\n\nVocê tem ${p.gold} moedas.\n\n${cardsHTML}`,
    [
      { icon:'↩', text:'Voltar à ferraria', action: storyNode_ferreiro },
    ],
    'Imagens/personagens/gozen.png'
  );

  // Aplica visual se já tem encantamento
  setTimeout(() => applyWeaponEnchantVisual(current), 100);
}

function enchantSelect(tierId) {
  const tier = getEnchantTier(tierId);
  if (!tier) return;
  const req = checkEnchantReq(tier);
  const p = G.player;

  if (tier.req.locked) { notify('🔒 Esse encantamento ainda está bloqueado.', 'red'); return; }
  if (!req.ok) { notify(`⚠ ${req.reason}`, 'red'); return; }
  if (p._weaponEnchant === tierId) { notify('Esse encantamento já está ativo!', 'gold'); return; }
  if (p.gold < tier.cost) { notify('◈ Sem moedas suficientes!', 'red'); return; }

  // Remove bônus do encantamento anterior
  const prev = p._weaponEnchant ? getEnchantTier(p._weaponEnchant) : null;
  if (prev) {
    if (prev.bonus.atk) p.atk = Math.max(1, p.atk - prev.bonus.atk);
    if (prev.bonus.def) p.def = Math.max(0, p.def - prev.bonus.def);
    if (prev.bonus.spd) p.spd = Math.max(1, p.spd - prev.bonus.spd);
  }

  // Cobra e aplica novo
  p.gold -= tier.cost;
  p._weaponEnchant = tierId;
  if (tier.bonus.atk) p.atk += tier.bonus.atk;
  if (tier.bonus.def) p.def += tier.bonus.def;
  if (tier.bonus.spd) p.spd += tier.bonus.spd;

  updateHUD();
  applyWeaponEnchantVisual(tierId);
  notify(`✨ ${tier.label} gravada na arma!`, tier.color || 'gold');
  addLog(`Encantamento ${tier.label} aplicado na arma. (${tier.cost}◈)`, 'loot');

  // Atualiza tela
  storyNode_encantamentos();
}
window.enchantSelect = enchantSelect;

// ─────────────────────────────────────────────────────────────
//  5. FERREIRO GOZEN
// ─────────────────────────────────────────────────────────────

function storyNode_ferreiro() {
  const cls = (G.player.classData && G.player.classData.id) || '';
  const greetByClass = {
    arqueiro:  `"As pontas das suas flechas são aço, e aço eu entendo." O ferreiro limpa as mãos no avental. "Posso afiar os ferros e reforçar o bracelete do pulso."\n\nVocê tem ${G.player.gold} moedas.`,
    mago:      `"Não costumo receber feiticeiros aqui." Gozen coça a barba. "Mas se o cajado rachar dentro do castelo, eu cuido do que o fogo pode curar."\n\nVocê tem ${G.player.gold} moedas.`,
    paladino:  `"Um paladino." Gozen faz aceno respeitoso. "Posso reforçar sem apagar a bênção. Confie em mim."\n\nVocê tem ${G.player.gold} moedas.`,
    assassino: `Gozen nem levanta os olhos da forja, mas fala baixo: "Adaga das Sombras. Metal negro — reconheço o brilho. Não pergunto pra que vai usar."\n\nVocê tem ${G.player.gold} moedas.`,
  };
  const greeting = greetByClass[cls] || `"Hmm. Você parece alguém que sabe usar uma lâmina — e que vai precisar dela."\n\nO ferreiro Gozen limpa as mãos e examina seu equipamento.\n\nVocê tem ${G.player.gold} moedas.`;

  setScene('vilarejo');
  setStory('FERREIRO GOZEN', greeting, [
    { icon:'🪄', text: (() => {
        const n = G.player._totalSharpens || 0;
        const custo = 10 + n * 8;
        if (n >= 10) return '✕ Afiar arma — LIMITE ATINGIDO (10×)';
        return `Afiar arma (${custo}◈ — ATQ+2) [${n}/10]${G.player.gold >= custo ? '' : ' (sem moedas)'}`;
      })(), action: () => {
        const n = G.player._totalSharpens || 0;
        const custo = 10 + n * 8;
        if (n >= 10) { notify('⚒ Limite de afiações atingido!', 'red'); return; }
        if (G.player.gold < custo) { notify('◈ Sem moedas!', 'red'); return; }
        G.player.gold -= custo; G.player.atk += 2; G.player._totalSharpens = n + 1;
        updateHUD(); notify(`⚒ Arma afiada: ATQ+2! (${n+1}/10)`, 'gold');
        addLog(`Afiou arma com Gozen: ATQ+2 (${n+1}×)`, 'loot'); storyNode_ferreiro();
    }},
    { icon:'🛡️', text: (() => {
        const n = G.player._totalReinforces || 0;
        const custo = 15 + n * 12;
        if (n >= 8) return '✕ Reforçar armadura — LIMITE ATINGIDO (8×)';
        return `Reforçar armadura (${custo}◈ — DEF+2) [${n}/8]${G.player.gold >= custo ? '' : ' (sem moedas)'}`;
      })(), action: () => {
        const n = G.player._totalReinforces || 0;
        const custo = 15 + n * 12;
        if (n >= 8) { notify('🛡 Limite de reforços atingido!', 'red'); return; }
        if (G.player.gold < custo) { notify('◈ Sem moedas!', 'red'); return; }
        G.player.gold -= custo; G.player.def += 2; G.player._totalReinforces = n + 1;
        updateHUD(); notify(`🛡 Armadura reforçada: DEF+2! (${n+1}/8)`, 'gold');
        addLog(`Reforçou armadura com Gozen: DEF+2 (${n+1}×)`, 'loot'); storyNode_ferreiro();
    }},
    { icon:'✨', text: (() => {
        const e = G.player._weaponEnchant;
        const t = e ? getEnchantTier(e) : null;
        return t
          ? `Encantamento de Arma — Ativa: ${t.label}`
          : 'Encantamento de Arma (Runas)';
      })(), action: storyNode_encantamentos },
    { icon:'↩', text:'Sair da ferraria', action: storyNode_vilarejo },
  ], 'Imagens/personagens/gozen.png');
}

// ─────────────────────────────────────────────────────────────
//  6. TAVERNA
// ─────────────────────────────────────────────────────────────

function storyNode_taverna() {
  const rumors = [
    { speaker:'VELHO BÊBADO', text:`"O Senhor das Cinzas... eu o vi. Antes de se tornar um lich, era um rei. Um bom rei. Mas queria vencer a morte — e pagou o preço." Ele ri amargo. "Agora governa um castelo de cinzas e servidores mortos."` },
    { speaker:'VELHO BÊBADO', text:`"Tem gente que voltou do castelo. Poucos. Muito poucos. Todos dizem a mesma coisa — que a voz do Senhor das Cinzas ressoa nas paredes antes mesmo de você ouvi-lo."` },
    { speaker:'VELHO BÊBADO', text:`"As criaturas na floresta ficaram maiores desde que o lich rompeu os selos. Quem o derrotar será lendário... ou estará morto." Ele ri e entorna o sake.` },
  ];
  setScene('vilarejo');
  setStory('TABERNEIRO',
    `"Ei, aventureiro! Sente-se."\n\nA taverna cheira a cedro queimado e caldo de missô. No canto, um velho bêbado gesticula para um viajante jovem que claramente não acredita em nada.\n\nVocê tem ${G.player.gold} moedas.`,
    [
      { icon:'🍶', text:'Comprar sake (5◈ — +25 MP)', action: () => {
          if (G.player.gold < 5) { notify('◈ Sem moedas!', 'red'); return; }
          G.player.gold -= 5;
          G.player.mp = Math.min(G.player.maxMp, (G.player.mp || 0) + 25);
          updateHUD(); notify('🍶 Sake de Clivor: +25 MP', 'purple');
          addLog('Bebeu sake na taverna: +25 MP', 'heal'); storyNode_taverna();
      }},
      { icon:'🍖', text:'Comer caldo quente (8◈ — +20 HP)', action: () => {
          if (G.player.gold < 8) { notify('◈ Sem moedas!', 'red'); return; }
          G.player.gold -= 8;
          G.player.hp = Math.min(G.player.maxHp, G.player.hp + 20);
          updateHUD(); notify('🍲 Caldo de missô: +20 HP', 'green');
          addLog('Comeu na taverna: +20 HP', 'heal'); storyNode_taverna();
      }},
      { icon:'👂', text:'Ouvir o rumor do velho bêbado', action: () => {
          const r = rumors[Math.floor(Math.random() * rumors.length)];
          setStory(r.speaker, r.text, [{ icon:'↩', text:'Voltar à taverna', action: storyNode_taverna }], 'Imagens/personagens/Tviajante.png');
      }},
      { icon:'↩', text:'Sair da taverna', action: storyNode_vilarejo },
    ], 'Imagens/personagens/Tviajante.png'
  );
}

// ─────────────────────────────────────────────────────────────
//  7. TEMPLO
// ─────────────────────────────────────────────────────────────

function storyNode_templo() {
  setScene('templo');
  hideEnemy();
  setStory('SACERDOTISA YUKI',
    `O Templo da Divina Trindade está silencioso. A sacerdotisa Yuki inclina a cabeça ao te ver.\n\n"Seja bem-vindo, viajante. Os altares estão prontos para receber suas oferendas."\n\nVocê tem ${G.player.gold} moedas.`,
    [
      { icon:'✨', text:`Bênção da Cura (15◈ — +HP completo)`, action: () => {
          if (G.player.gold < 15) { notify('◈ Sem moedas!', 'red'); return; }
          G.player.gold -= 15;
          G.player.hp = G.player.maxHp;
          updateHUD(); notify('✨ Bênção da Cura: HP restaurado!', 'gold');
          addLog('Recebeu Bênção da Cura no Templo.', 'heal'); storyNode_templo();
      }},
      { icon:'⚡', text:`Bênção do Vigor (20◈ — +AP/MP completo)`, action: () => {
          if (G.player.gold < 20) { notify('◈ Sem moedas!', 'red'); return; }
          G.player.gold -= 20;
          if (G.player.maxAp > 0) G.player.ap = G.player.maxAp;
          if (G.player.maxMp > 0) G.player.mp = G.player.maxMp;
          updateHUD(); notify('⚡ Bênção do Vigor: AP/MP restaurado!', 'gold');
          addLog('Recebeu Bênção do Vigor no Templo.', 'heal'); storyNode_templo();
      }},
      { icon:'🛡', text:`Bênção da Proteção (25◈ — DEF+3 por 5 batalhas)`, action: () => {
          if (G.player.gold < 25) { notify('◈ Sem moedas!', 'red'); return; }
          G.player.gold -= 25;
          G.player.def += 3; G.player._blessingDef = (G.player._blessingDef || 0) + 5;
          updateHUD(); notify('🛡 Bênção da Proteção: DEF+3!', 'gold');
          addLog('Recebeu Bênção da Proteção no Templo.', 'loot'); storyNode_templo();
      }},
      { icon:'↩', text:'Sair do Templo', action: storyNode_vilarejo },
    ]
  );
}

// ─────────────────────────────────────────────────────────────
//  8. MERCADO
// ─────────────────────────────────────────────────────────────

function storyNode_mercado() {
  setScene('vilarejo');
  const p = G.player;
  setStory('MERCADOR',
    `"Boa mercadoria para um bom aventureiro!" O mercador sorri.\n\nVocê tem ${p.gold} moedas.`,
    [
      { icon:'🌿', text:'Erva Medicinal (10◈ — cura 15 HP)', action: () => {
          if (p.gold < 10) { notify('◈ Sem moedas!', 'red'); return; }
          p.gold -= 10;
          addItem({ id:'erva_cura', name:'Erva Medicinal', icon:'🌿', imgSrc:'Imagens/cosméticos/erva.png', desc:'Recupera 15 HP.', type:'consumível', weight:0.2 });
          updateHUD(); notify('🌿 Erva Medicinal comprada!', 'green');
          addLog('Comprou Erva Medicinal no mercado.', 'loot'); storyNode_mercado();
      }},
      { icon:'🧪', text:'Poção de Cura (25◈ — cura 40 HP)', action: () => {
          if (p.gold < 25) { notify('◈ Sem moedas!', 'red'); return; }
          p.gold -= 25;
          addItem({ id:'pocao_cura', name:'Poção de Cura', icon:'🧪', imgSrc:'Imagens/pocao.png', desc:'Recupera 40 HP.', type:'consumível', weight:0.5 });
          updateHUD(); notify('🧪 Poção de Cura comprada!', 'green');
          addLog('Comprou Poção de Cura no mercado.', 'loot'); storyNode_mercado();
      }},
      { icon:'⚗️', text:'Elixir de AP (30◈ — restaura 50 AP)', action: () => {
          if (p.gold < 30) { notify('◈ Sem moedas!', 'red'); return; }
          p.gold -= 30;
          addItem({ id:'elixir_ap', name:'Elixir de AP', icon:'⚗️', imgSrc:'Imagens/elixir.png', desc:'Restaura 50 AP.', type:'consumível', weight:0.3 });
          updateHUD(); notify('⚗️ Elixir de AP comprado!', 'gold');
          addLog('Comprou Elixir de AP no mercado.', 'loot'); storyNode_mercado();
      }},
      { icon:'↩', text:'Sair do mercado', action: storyNode_vilarejo },
    ]
  );
}

// ─────────────────────────────────────────────────────────────
//  9. ESTALAGEM — DONA MITSUE
// ─────────────────────────────────────────────────────────────

function storyNode_estalagem() {
  setScene('estalagem');
  hideEnemy();
  const healCost = 20;
  const p = G.player;
  setStory('DONA MITSUE',
    `A estalagem cheira a lenha e ervas secas. Dona Mitsue levanta os olhos do seu bordado e te observa com calma.\n\n"Precisa descansar? Tenho um quarto limpo e caldo quente."\n\nVocê tem ${p.gold} moedas.`,
    [
      { icon:'🛏️', text:`Descanso completo (${healCost}◈ — HP/AP/MP cheios)`, action: () => {
          if (p.gold < healCost) { notify('◈ Sem moedas!', 'red'); return; }
          p.gold -= healCost;
          p.hp = p.maxHp;
          if (p.maxAp > 0) p.ap = p.maxAp;
          if (p.maxMp > 0) p.mp = p.maxMp;
          updateHUD();
          notify('🛏️ Descansou na estalagem: HP/AP/MP restaurados!', 'green');
          addLog(`Descansou na estalagem de Dona Mitsue: recuperação total.`, 'heal');
          setStory('DONA MITSUE',
            `"Dormiu bem?" Mitsue sorri enquanto serve um chá. "Descansado, o caminho parece mais curto."\n\nHP, AP e MP totalmente restaurados.`,
            [{ icon:'🏘️', text:'Voltar ao vilarejo', action: storyNode_vilarejo }]
          );
      }},
      { icon:'💬', text:'"Me conte sobre o vilarejo..."', action: () => {
          setStory('DONA MITSUE',
            `Mitsue deposita o bordado com cuidado.\n\n"Pedra Branca foi fundada há três séculos por refugiados do leste. O nome vem das pedras brancas do rio que ainda corre atrás do templo."\n\nEla faz uma pausa. "Desde que o Senhor das Cinzas acordou no castelo ao norte, as coisas mudaram. As crianças não brincam mais à noite. Os fazendeiros dormem com ferramentas ao lado."\n\nSua voz fica mais suave: "Mas as pessoas aqui são fortes. Sempre foram."`,
            [{ icon:'↩', text:'Voltar à estalagem', action: storyNode_estalagem }]
          );
      }},
      { icon:'↩', text:'Sair da estalagem', action: storyNode_vilarejo },
    ]
  );
}

// ─────────────────────────────────────────────────────────────
//  10. TORRE DAS MASMORRAS (placeholder)
// ─────────────────────────────────────────────────────────────

function storyNode_torre() {
  setScene('vilarejo');
  hideEnemy();
  setStory('TORRE DAS MASMORRAS',
    `A torre erguida no canto do vilarejo parece mais antiga que os prédios ao redor. Pedras negras cobertas de musgo. Uma porta de ferro enferrujada.\n\nDentro, dizem, há passagens que levam a masmorras antigas — cheias de tesouros e criaturas que não deveriam existir.`,
    [
      { icon:'🏯', text:'Entrar na Torre (em breve)', action: () => {
          notify('🏯 A Torre das Masmorras chegará em breve!', 'gold');
          storyNode_vilarejo();
      }},
      { icon:'↩', text:'Voltar ao vilarejo', action: storyNode_vilarejo },
    ]
  );
}
