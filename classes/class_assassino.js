// ══════════════════════════════════════════════════════════════
//  CHRONICLES OF CLIVOR — class_assassino.js
// ══════════════════════════════════════════════════════════════

'use strict';

const CLASS_ASSASSINO = {
  id: 'assassino',
  name: 'Assassino',
  role: 'VELOZ · CRÍTICO',
  icon: '🗡️',
  iconImg: 'Imagens/icones/iconassa_1782716578179.png',
  color: '#3a5068',
  desc: 'Especialista em golpes rápidos e críticos. Alta velocidade e dano. Usa AP acumulado em sigilo.',
  stats: { hp: 85, mp: 0, atk: 12, def: 5, spd: 15, mag: 0 },
  maxAp: 100,
  resource: 'ap',
  // ── Crescimento por level (aplicado em checkLevelUp, palDinh.js) ──
  // Veloz/crítico: maior ganho de VEL e ATQ, HP e DEF ficam mais frágeis.
  growth: { hp: 11, atk: 2, def: 1, spd: 2, mag: 0, mp: 0, ap: 5 },
  startWeapon: {
    id: 'adaga_sombria', name: 'Adaga Sombria', icon: '🔪',
    imgSrc: 'Imagens/personagens/Assassino/Picsart_26-07-05_14-34-00-422.png',
    atk: 7, def: 0, spd: 4, mag: 0, weight: 1,
    desc: 'Adaga leve feita para golpes rápidos.'
  },
  skills: [
    {
      key: 'golpe_sombrio',
      name: 'Golpe Sombrio',
      icon: '🌑',
      ap: 20,
      desc: '1.6× ATQ. 30% chance de crítico.',
      dmg: 'assassino:golpe_sombrio',
    },
    {
      key: 'veneno_rapido',
      name: 'Veneno Rápido',
      icon: '☠️',
      ap: 15,
      desc: 'Aplica veneno. 8 dmg/turno × 4.',
      dmg: 'assassino:veneno_rapido',
    },
    {
      key: 'kuroen',
      name: 'Kuroen',
      icon: '🌪️',
      ap: 40,
      desc: '3 golpes rápidos. ATQ×0.9 cada.',
      dmg: 'assassino:kuroen',
    },
  ],
  statBars: { atk: 70, def: 30, spd: 95 },
  sprite: {
    type: 'images',
    scale: 1.4, // zoom visual do personagem em batalha (ancorado nos pés)
    images: {}, // corpo inteiro vem do sprite sheet único abaixo (sem imagem idle separada)
    // Sprite sheet único em GRADE 2x2 (Assassino0000.png, 1209x901):
    // [col,row] → 0,0=idle · 1,0=preparo/mira · 0,1=golpe · 1,1=golpe final
    attackSheet: {
      src: 'Imagens/personagens/Assassino/Assassino0000.png',
      frameW: 604.5,
      frameH: 450.5,
      cols: 2,
      rows: 2,
      frameMap: { idle: [0, 0], prepare: [1, 0], attack: [0, 1], attack2: [1, 1] },
    },
    // ── Skins alternativas ──
    // Desbloqueadas por mecânica de jogo (não por equipamento). A skin
    // "lua_crescente" só fica disponível pra escolha enquanto a fase
    // Lua Crescente está ativa (ver assassino_lunar.js: setAssassinoSkin).
    // Mesma grade 2x2 e o mesmo frameMap do sheet padrão — só a arte muda.
    // ⚠️ Ajuste frameW/frameH abaixo se o novo PNG não tiver exatamente
    // a mesma proporção do Assassino0000.png (1209x901, metade = 604.5x450.5).
    altSkins: {
      lua_crescente: {
        nome: 'Manto Pardo',
        src: 'Imagens/personagens/Assassino/Assassinpardo.png',
        frameW: 604.5,
        frameH: 450.5,
        cols: 2,
        rows: 2,
        frameMap: { idle: [0, 0], prepare: [1, 0], attack: [0, 1], attack2: [1, 1] },
      },
      // "lua_sangrenta" é equipada automaticamente ao entrar na Lua
      // Sangrenta (ver assassino_lunar.js: setAssassinoLua) — não é
      // escolha manual como o Manto Pardo, e volta ao padrão sozinha
      // ao sair da fase.
      lua_sangrenta: {
        nome: 'Manto Sangrento',
        src: 'Imagens/personagens/Assassino/frame1skil.png',
        frameW: 606,
        frameH: 536,
        cols: 2,
        rows: 2,
        frameMap: { idle: [0, 0], prepare: [1, 0], attack: [0, 1], attack2: [1, 1] },
      },
    },
  },
};

// ── FX de spritesheet — Kuroen (chamas roxas, 4 frames) ──
// Arquivo: Imagens/personagens/Assassino/dancadaM.png (2095×622, 4 frames lado a lado)
// Cadência: cada golpe revela um frame (chama crescendo) com fade suave entre
// eles; o último frame (explosão) só aparece depois do 3º golpe e fica
// visível por mais tempo.
let _dancaMorteFxStylesInjected = false;
function ensureDancaMorteFxStyles() {
  if (_dancaMorteFxStylesInjected || typeof document === 'undefined') return;
  _dancaMorteFxStylesInjected = true;
  const style = document.createElement('style');
  style.id = 'danca-morte-fx-styles';
  style.textContent = `
    .danca-morte-fx {
      position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);
      width:220px; aspect-ratio: 523.75 / 622;
      pointer-events:none; z-index:35;
    }
    .danca-morte-fx .dm-frame {
      position:absolute; inset:0;
      background-image:url('Imagens/personagens/Assassino/dancadaM.png');
      background-repeat:no-repeat;
      background-size:400% 100%;
      opacity:0;
      filter:drop-shadow(0 0 20px rgba(140,50,220,0.7));
      transition: opacity 0.18s ease-in-out, filter 0.18s ease-in-out;
    }
    .danca-morte-fx .dm-frame.dm-visible { opacity:1; }
    .danca-morte-fx .dm-frame.dm-final { filter:drop-shadow(0 0 32px rgba(180,80,255,0.95)); }
  `;
  document.head.appendChild(style);
}

// target: 'enemy' | 'hero' — por padrão o golpe do Assassino acerta o inimigo.
// hitCount: quantos golpes revelar em cadência antes do frame final (padrão 3).
// Retorna a duração total (ms) da sequência, pra quem chamou saber quanto esperar.
function playDancaDaMorteFX(target, hitCount) {
  if (typeof document === 'undefined') return 0;
  ensureDancaMorteFxStyles();
  const containerId = target === 'hero' ? 'bat-hero-side' : 'bat-enemy-side';
  const iconId       = target === 'hero' ? 'bat-hero-icon'  : 'bat-enemy-icon';
  const container = document.getElementById(containerId);
  const icon      = document.getElementById(iconId);
  if (!container) return 0;
  if (!container.style.position) container.style.position = 'relative';
  const fx = document.createElement('div');
  fx.className = 'danca-morte-fx';

  // Centraliza o efeito exatamente sobre o retrato do alvo (ícone pequeno
  // OU card grande de inimigo de dungeon) — calcula a posição real do
  // retrato em vez de ancorar no fundo do container inteiro.
  if (icon) {
    const iconRect = icon.getBoundingClientRect();
    const contRect = container.getBoundingClientRect();
    fx.style.left = (iconRect.left + iconRect.width / 2 - contRect.left) + 'px';
    fx.style.top  = (iconRect.top  + iconRect.height / 2 - contRect.top) + 'px';
    const maiorLado = Math.max(iconRect.width, iconRect.height);
    fx.style.width = Math.max(140, Math.min(280, maiorLado * 1.5)) + 'px';
  }
  container.appendChild(fx);

  const n = Math.max(1, hitCount || 3);
  const stepMs = 340;       // intervalo entre golpes (mais espaçado que antes)
  const crossfadeMs = 180;  // duração do fade entre frames (bate com a transição CSS)
  const holdFinalMs = 420;  // quanto tempo a explosão final fica visível

  // Um <div> de frame por golpe (posição fixa no sheet); só a opacidade
  // muda ao longo do tempo, o que gera o crossfade suave entre eles.
  //
  // IMPORTANTE: com background-size:400% (sheet = 4x a largura do
  // container), o background-position em % NÃO anda em passos de "100%
  // por frame" — a fórmula real do CSS é:
  //   offset = (tamanho_container - tamanho_imagem) × porcentagem
  //          = (W - 4W) × p = -3W × p
  // Pra mostrar o frame i de 4 (0..3), a % certa é i/(4-1) × 100%, ou
  // seja 0%, 33.33%, 66.67%, 100%. Usar -100%/-200%/-300% (como antes)
  // empurra o sheet pra fora da área visível — como background-repeat é
  // no-repeat, esses frames ficam em branco/transparentes na tela.
  const totalFrames = 4; // sheet tem 4 quadros (dancadaM.png)
  const frames = [];
  for (let i = 0; i < n; i++) {
    const fr = document.createElement('div');
    fr.className = 'dm-frame';
    fr.style.backgroundPositionX = (i / (totalFrames - 1) * 100) + '%';
    fx.appendChild(fr);
    frames.push(fr);
  }
  const finalFrame = document.createElement('div');
  finalFrame.className = 'dm-frame';
  finalFrame.style.backgroundPositionX = '100%'; // último quadro do sheet = explosão
  fx.appendChild(finalFrame);

  frames.forEach((fr, i) => {
    setTimeout(() => {
      if (i > 0) frames[i - 1].classList.remove('dm-visible');
      fr.classList.add('dm-visible');
    }, i * stepMs);
  });

  const finalDelay = n * stepMs;
  setTimeout(() => {
    frames[n - 1].classList.remove('dm-visible');
    finalFrame.classList.add('dm-visible', 'dm-final');
  }, finalDelay);

  const totalMs = finalDelay + holdFinalMs;
  setTimeout(() => fx.remove(), totalMs + crossfadeMs + 100);
  return totalMs;
}
window.playDancaDaMorteFX = playDancaDaMorteFX;

// ── FX de imagem — Golpe Sombrio ──
// Arquivo: Imagens/personagens/Assassino/IconesAsas/Golpefatalpp.png
// Ancorada no ícone do alvo (igual ao Corte Lunar), com uma pequena variação
// de posição entre o 1º e o 2º golpe — sem estourar pra fora do card.
// Fade suave (não é um blink brusco). Efeito total: ~1.9s.
let _golpeSombrioFxStylesInjected = false;
function ensureGolpeSombrioFxStyles() {
  if (_golpeSombrioFxStylesInjected || typeof document === 'undefined') return;
  _golpeSombrioFxStylesInjected = true;
  const style = document.createElement('style');
  style.id = 'golpe-sombrio-fx-styles';
  style.textContent = `
    @keyframes golpeSombrioBlink {
      0%   { opacity:0;   transform:translate(-50%,-50%) scale(0.75); }
      10%  { opacity:1;   transform:translate(-50%,-50%) scale(1.0);  }
      32%  { opacity:0.3; }
      52%  { opacity:1;   }
      74%  { opacity:0.35;}
      100% { opacity:0;   transform:translate(-50%,-50%) scale(1.05); }
    }
    .golpe-sombrio-fx-img {
      position:absolute; transform:translate(-50%,-50%);
      max-width:none; object-fit:contain; pointer-events:none; z-index:33;
      filter:drop-shadow(0 0 8px rgba(120,90,180,0.8)) drop-shadow(0 0 16px rgba(50,35,95,0.5));
      animation: golpeSombrioBlink 0.85s ease-in-out forwards;
    }
  `;
  document.head.appendChild(style);
}

// target: 'enemy' | 'hero'. Retorna a duração total (ms) do efeito,
// pra quem chamou saber quanto esperar antes de liberar o próximo turno.
function playGolpeSombrioFX(target) {
  if (typeof document === 'undefined') return 0;
  ensureGolpeSombrioFxStyles();
  const containerId = target === 'hero' ? 'bat-hero-side' : 'bat-enemy-side';
  const iconId       = target === 'hero' ? 'bat-hero-icon'  : 'bat-enemy-icon';
  const container = document.getElementById(containerId);
  const icon      = document.getElementById(iconId);
  if (!container) return 0;
  if (!container.style.position) container.style.position = 'relative';

  // Posição e tamanho base a partir do retrato real do alvo (com margem —
  // não usa o card inteiro, senão a imagem escapa das bordas).
  let baseLeftPct = 50, baseTopPct = 50, sizePx = 150;
  if (icon) {
    const iconRect = icon.getBoundingClientRect();
    const contRect = container.getBoundingClientRect();
    baseLeftPct = (iconRect.left + iconRect.width / 2 - contRect.left) / contRect.width * 100;
    baseTopPct  = (iconRect.top  + iconRect.height / 2 - contRect.top)  / contRect.height * 100;
    const maiorLado = Math.max(iconRect.width, iconRect.height);
    sizePx = Math.max(110, Math.min(200, maiorLado * 1.15));
  }

  // Pequeno deslocamento entre os 2 golpes (bem contido, com margem de sobra
  // dentro do retrato) — dá a sensação de ângulos diferentes sem sair do card.
  const offsets = [
    { dx: -4, dy: -3 },
    { dx: 4, dy: 4 },
  ];
  const hitDelays = [0, 900]; // 2º golpe entra logo após o 1º sumir

  offsets.forEach((off, i) => {
    setTimeout(() => {
      if (!container.isConnected) return;
      const img = document.createElement('img');
      img.src = 'Imagens/personagens/Assassino/IconesAsas/Golpefatalpp.png';
      img.alt = 'Golpe Sombrio';
      img.className = 'golpe-sombrio-fx-img';
      img.style.left = (baseLeftPct + off.dx) + '%';
      img.style.top = (baseTopPct + off.dy) + '%';
      img.style.width = sizePx + 'px';
      img.onerror = function() { this.remove(); };
      container.appendChild(img);
      setTimeout(() => img.remove(), 850);
    }, hitDelays[i]);
  });

  return 1900;
}
window.playGolpeSombrioFX = playGolpeSombrioFX;

// ── FX de "sumiço" do herói — Golpe Sombrio ──
// O personagem some rapidamente (como se tivesse se dissolvido na sombra e
// virado o próprio golpe) e reaparece perto do momento em que a imagem
// acerta o alvo. Só mexe em opacidade/blur — não interfere na troca de
// frames do sprite (que continua acontecendo por baixo, invisível).
function playGolpeSombrioCasterVanishFX() {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('bat-hero-icon');
  if (!el) return;
  if (el._golpeSombrioVanishTimeouts) {
    el._golpeSombrioVanishTimeouts.forEach(clearTimeout);
  }
  el._golpeSombrioVanishTimeouts = [];

  // Some logo no começo do bote (bate com o frame "attack" do herói)
  el._golpeSombrioVanishTimeouts.push(setTimeout(() => {
    el.style.transition = 'opacity 0.12s ease, filter 0.12s ease';
    el.style.opacity = '0';
    el.style.filter = 'blur(2px)';
  }, 120));

  // Reaparece perto do instante em que o golpe conecta no alvo
  el._golpeSombrioVanishTimeouts.push(setTimeout(() => {
    el.style.transition = 'opacity 0.25s ease, filter 0.25s ease';
    el.style.opacity = '1';
    el.style.filter = '';
    setTimeout(() => { if (el) el.style.transition = ''; }, 260);
  }, 900));
}
window.playGolpeSombrioCasterVanishFX = playGolpeSombrioCasterVanishFX;

// ── Skills do Assassino ──
function skillAssassino(skillKey, p, e, bs, helpers) {
  const { appendBattleLog, showFloatingNumber, flashDamage, animEnemyHit, BATTLE_CONFIG } = helpers;
  const result = { skipEnemyTurn: false, enemyStunned: false, apGain: 0 };
  // +50% de chance relativa (equivalente ao antigo "* 1.5"), mas agora via
  // função central: respeita o teto de 75%, soma VEL e o crítico real de
  // itens equipados. O antigo p._enchantCrit nunca era lido de fato — já
  // era migrado/apagado para p.critBonus antes de chegar aqui.
  const isCrit = (typeof getPlayerCritChance === 'function')
    ? Math.random() < getPlayerCritChance(p, BATTLE_CONFIG.CRIT_BASE_CHANCE * 0.5, (e && e.critResist) || 0)
    : Math.random() < (BATTLE_CONFIG.CRIT_BASE_CHANCE * 1.5);

  // ── Marca Lunar (Runa A+ Assassino) ──
  // Se não crit, o próximo ataque ignora DEF do inimigo (já ativo neste turno se marcado)
  // Marca única por batalha (bs._sombraMarcada) — a mesma do ataque básico (palDinh.js).
  const _ssSempre = !!(p._enchantShadowMarkEnabled && p._enchantShadowMarkTier === 'SS'); // SS: DEF sempre ignorada
  const hasShadowMark = !!(bs._sombraMarcada && skillKey === 'golpe_sombrio');
  const effectiveDef = (hasShadowMark || (_ssSempre && skillKey === 'golpe_sombrio')) ? 0 : (e.def || 0);
  if (hasShadowMark) {
    bs._sombraMarcada = false;
    appendBattleLog(`🌙 Marca Lunar: ataque ignora a defesa do inimigo!`, '#c0a0ff');
    showFloatingNumber('enemy', '🌙 DEF IGNORADA', 'status');
  }

  if (skillKey === 'golpe_sombrio') {
    let d = Math.max(1, Math.floor(p.atk * 1.6 - effectiveDef / 3 + Math.random() * 5));
    // Marca Lunar (Runa S+/SS): golpe marcado causa dano extra além de ignorar a DEF
    if (hasShadowMark && p._enchantLunarBonus > 0) {
      d = Math.floor(d * (1 + p._enchantLunarBonus));
      appendBattleLog(`🌙 Marca Lunar: +${Math.round(p._enchantLunarBonus * 100)}% de dano!`, '#c0a0ff');
    }
    if (isCrit) d = Math.floor(d * (typeof getCritMultiplier === 'function' ? getCritMultiplier(p) : BATTLE_CONFIG.CRIT_MULTIPLIER));
    bs.enemyHp -= d;
    appendBattleLog(`🌑 Golpe Sombrio: ${isCrit ? 'CRÍTICO! ' : ''}${d} HP!`, 'rgba(60,80,104,0.95)');

    // Golpefatalpp.png golpeia o card em 2 pontos e some — efeito de 2s.
    // O dano já foi aplicado ao HP acima, mas o feedback visual (número
    // flutuante + flash) é sincronizado com o 2º golpe da FX, pra bater
    // com o momento em que a imagem realmente "acerta" o alvo na tela.
    let fxDuration = 0;
    if (typeof playGolpeSombrioFX === 'function') {
      fxDuration = playGolpeSombrioFX('enemy');
      bs._pendingFxHoldMs = Math.max(bs._pendingFxHoldMs || 0, fxDuration + 50);
    }
    if (typeof playGolpeSombrioCasterVanishFX === 'function') playGolpeSombrioCasterVanishFX();
    const hitSyncMs = 900; // bate com o 2º hitDelay de playGolpeSombrioFX
    setTimeout(() => {
      showFloatingNumber('enemy', d, isCrit ? 'crit' : 'dmg');
      flashDamage('enemy'); animEnemyHit();
    }, hitSyncMs);

    // Se não acertou crit E tem Runa S: marca para ignorar DEF no próximo golpe
    if (p._enchantShadowMarkEnabled) {
      if (!isCrit && !hasShadowMark) {
        bs._sombraMarcada = true;
        appendBattleLog(`🌙 A lua marca o alvo... próximo golpe ignora DEF!`, '#8060a0');
      }
    } else if (!isCrit && Math.random() < 0.30) {
      const bonus = Math.floor(d * 0.5);
      bs.enemyHp -= bonus;
      appendBattleLog(`🌑 Golpe nas sombras! Crítico extra: -${bonus}!`, '#c0a0ff');
      setTimeout(() => showFloatingNumber('enemy', bonus, 'crit'), hitSyncMs);
    }
    result.apGain = isCrit ? 12 : 5;
  }

  else if (skillKey === 'veneno_rapido') {
    // Precisa de 1 Frasco Venenoso na bolsa — sem ele, o veneno não é aplicado.
    const frascoItem = p.inventory && p.inventory.find(i => i.id === 'frasco_veneno' && (i.qty || 1) > 0);
    if (!frascoItem) {
      appendBattleLog(`☠️ Veneno Rápido falhou: nenhum Frasco Venenoso na bolsa!`, '#c06040');
      showFloatingNumber('enemy', 'SEM FRASCO', 'status');
      result.apGain = 0;
      result.dmgDealt = 0;
      return result;
    }
    frascoItem.qty = (frascoItem.qty || 1) - 1;
    if (frascoItem.qty <= 0) p.inventory = p.inventory.filter(i => i !== frascoItem);
    if (typeof buildInventoryGrid === 'function') buildInventoryGrid();

    const base = Math.max(1, Math.floor(p.atk * 0.6 - effectiveDef / 4 + Math.random() * 3));
    bs.enemyHp      -= base;
    bs.enemyPoisoned    = true;
    bs.enemyPoisonTurns = 4;
    appendBattleLog(`☠️ Veneno Rápido: -${base} HP + ☠ Veneno! 8 dano/turno. (Frasco Venenoso consumido)`, '#60c060');
    showFloatingNumber('enemy', base, 'dmg');
    showFloatingNumber('enemy', '☠ VENENO', 'status');
    flashDamage('enemy');
    result.apGain = 5;
    result.dmgDealt = base;
  }

  else if (skillKey === 'kuroen') {
    // Selo da Força — bônus de 8~10% de dano bruto (Kuroen é a skill de
    // assinatura do Assassino para esse item). Sorteado uma vez e aplicado
    // igualmente nos 3 golpes deste uso.
    const seloBonusKuroen = (typeof getSeloForcaSkillBonus === 'function') ? getSeloForcaSkillBonus(p, 'kuroen') : 0;
    const hits = [];
    for (let i = 0; i < 3; i++) {
      hits.push(Math.max(1, Math.floor(p.atk * 0.9 * (1 + seloBonusKuroen) - effectiveDef / 4 + Math.random() * 3)));
    }
    const total = hits.reduce((a, b) => a + b, 0);
    bs.enemyHp -= total;
    appendBattleLog(`🌪️ Kuroen: 3 golpes! -${hits.join('/-')} = ${total} HP total!`, 'rgba(60,80,104,0.95)');

    let fxDuration = 0;
    if (typeof playDancaDaMorteFX === 'function') {
      fxDuration = playDancaDaMorteFX('enemy', hits.length);
      bs._pendingFxHoldMs = Math.max(bs._pendingFxHoldMs || 0, fxDuration + 50);
    }

    // ── Ícone do Kuroen (Golpefatalpp.png) piscando a cada golpe ──
    // Reaproveita o mesmo estilo de blink já usado no Golpe Sombrio
    // (ensureGolpeSombrioFxStyles / .golpe-sombrio-fx-img), mas dispara uma
    // vez por golpe do Kuroen, exatamente no instante em que o dano daquele
    // golpe é aplicado — não em posições fixas como no Golpe Sombrio.
    if (typeof ensureGolpeSombrioFxStyles === 'function') ensureGolpeSombrioFxStyles();
    const kuroenContainer = document.getElementById('bat-enemy-side');
    const kuroenIcon      = document.getElementById('bat-enemy-icon');
    let kBaseLeftPct = 50, kBaseTopPct = 50, kSizePx = 150;
    if (kuroenContainer && kuroenIcon) {
      if (!kuroenContainer.style.position) kuroenContainer.style.position = 'relative';
      const iconRect = kuroenIcon.getBoundingClientRect();
      const contRect = kuroenContainer.getBoundingClientRect();
      kBaseLeftPct = (iconRect.left + iconRect.width / 2 - contRect.left) / contRect.width * 100;
      kBaseTopPct  = (iconRect.top  + iconRect.height / 2 - contRect.top)  / contRect.height * 100;
      const maiorLado = Math.max(iconRect.width, iconRect.height);
      kSizePx = Math.max(110, Math.min(200, maiorLado * 1.15));
    }

    // Reação do inimigo sincronizada com cada frame da chama — ele "sente"
    // cada golpe conforme o efeito visual avança, em vez de um flash único.
    const stepMs = 340; // deve bater com o stepMs de playDancaDaMorteFX
    hits.forEach((d, i) => {
      setTimeout(() => {
        showFloatingNumber('enemy', d, 'dmg');
        flashDamage('enemy');
        animEnemyHit();
        if (kuroenContainer && kuroenContainer.isConnected) {
          const img = document.createElement('img');
          img.src = 'Imagens/personagens/Assassino/IconesAsas/Golpefatalpp.png';
          img.alt = 'Kuroen';
          img.className = 'golpe-sombrio-fx-img';
          img.style.left = kBaseLeftPct + '%';
          img.style.top  = kBaseTopPct + '%';
          img.style.width = kSizePx + 'px';
          img.onerror = function() { this.remove(); };
          kuroenContainer.appendChild(img);
          setTimeout(() => img.remove(), 850);
        }
      }, i * stepMs);
    });

    result.apGain = isCrit ? 12 : 5;
  }

  return result;
}

window.CLASS_ASSASSINO = CLASS_ASSASSINO;
window.skillAssassino  = skillAssassino;
