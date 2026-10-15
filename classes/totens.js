// ══════════════════════════════════════════════════════════════
//  CHRONICLES OF CLIVOR — classes/totens.js
//  Ponte (bridge file). Nunca edite palDinh.js ou class_arqueiro.js
//  para mexer no sistema de Totens — tudo fica aqui.
//
//  Carrega DEPOIS de classes/class_arqueiro.js (usa window.skillArqueiro)
//  e depende apenas de funções globais já expostas pelo motor
//  (appendBattleLog, showFloatingNumber, flashDamage, animEnemyHit,
//  BATTLE_CONFIG, buildSkillList) — todas acessadas via typeof
//  para nunca quebrar caso a ordem de load mude.
//
//  Contém:
//   1) Catálogo de Totens (TOTEM_TYPES) + Fervor Selvagem
//   2) Cut-in de despertar da Forma (tela cheia)
//   3) NOVO: "Alma Aliada" — a criatura do totem aparece ao lado
//      do herói a cada ataque enquanto a Forma está ativa
//   4) NOVO: ataque exclusivo por totem (TOTEM_ATTACKS), injetado
//      na lista de skills só enquanto a Forma daquele totem dura
//   5) Aba de Totens na Bolsa do Aventureiro
// ══════════════════════════════════════════════════════════════

'use strict';

// ── Catálogo de Totens ──
// soulImg       = ícone/alma pequena que acompanha o herói a cada ataque
// projectileImg = sprite sheet do projétil (4 quadros lado a lado,
//                  crescendo) usado no ataque exclusivo do totem
const TOTEM_TYPES = [
  {
    id: 'aguia', name: 'Águia', elemento: 'Vento', icon: '🦅',
    color: '#9fe8c8',
    img: 'Imagens/formas/aguia.png',
    soulImg: 'Imagens/formas/aliados/aguia_alma.png',
    projectileImg: 'Imagens/vfx/aguia_projetil_sheet.png',
    desc: 'Forma do Vento. Em desenvolvimento — ainda sem efeito em batalha.',
    implemented: false,
  },
  {
    id: 'touro', name: 'Touro', elemento: 'Terra', icon: '🐂',
    color: '#c8a060',
    img: 'Imagens/formas/touro.png',
    soulImg: 'Imagens/formas/aliados/touro_alma.png',
    projectileImg: 'Imagens/vfx/touro_projetil_sheet.png',
    desc: 'Forma da Terra. Em desenvolvimento — ainda sem efeito em batalha.',
    implemented: false,
  },
  {
    id: 'tubarao', name: 'Tubarão', elemento: 'Água', icon: '🦈',
    color: '#60b0e0',
    img: 'Imagens/formas/tubarao.png',
    soulImg: 'Imagens/formas/aliados/tubarao_alma.png',
    projectileImg: 'Imagens/vfx/tubarao_projetil_sheet.png',
    desc: 'Forma da Água. Em desenvolvimento — ainda sem efeito em batalha.',
    implemented: false,
  },
  {
    id: 'dragao', name: 'Dragão', elemento: 'Fogo', icon: '🐉',
    color: '#ff6a1a',
    img: 'Imagens/formas/dragao.png',
    soulImg: 'Imagens/personagens/Arqueiro/dragao_alma.png',
    projectileImg: 'Imagens/personagens/Arqueiro/dragao_projetil_sheet.png',
    bannerImg: 'Imagens/personagens/Arqueiro/Picsart_26-07-26_23-48-25-821.png',
    loomImg: 'Imagens/formas/dragao_grande.png',
    projectileFrames: 4,
    desc: '"Chuva de Flechas" vira uma rajada incendiária em área: não gasta flechas e aplica Queimadura por 3 turnos. Ganha o ataque exclusivo "Sopro do Dragão". Dura 3 turnos.',
    implemented: true,
  },
];
function getTotemType(id) { return TOTEM_TYPES.find(t => t.id === id) || null; }
window.TOTEM_TYPES  = TOTEM_TYPES;
window.getTotemType = getTotemType;

// ── Ataques exclusivos por Forma ──
// Só existem enquanto a Forma correspondente está ativa: são
// injetados em p.classData.skills na ativação e removidos quando
// a Forma se dissipa (ver wrap de tickFormaEspiritual mais abaixo).
const TOTEM_ATTACKS = {
  dragao: {
    key: 'sopro_dragao',
    name: 'Sopro do Dragão',
    icon: '🐉',
    ap: 40,
    arrowCost: 0,
    desc: 'Exclusivo da Forma do Dragão. Dano pesado + Queimadura garantida por 4 turnos. Não gasta flechas.',
    dmg: 'arqueiro:sopro_dragao',
  },
  // águia, touro, tubarão: adicionar aqui quando as Formas forem implementadas.
};
window.TOTEM_ATTACKS = TOTEM_ATTACKS;

// TEMP: Dragão liberado por padrão pra permitir testar o protótipo antes
// de integrarmos a Runa Totêmica de verdade na Ferraria do Gozen.
function isTotemUnlocked(p, totemId) {
  if (!p.totemRunes) p.totemRunes = { dragao: true, aguia: false, touro: false, tubarao: false };
  return !!p.totemRunes[totemId];
}
window.isTotemUnlocked = isTotemUnlocked;

function equipTotem(totemId) {
  const p = G.player;
  if (!p || !isTotemUnlocked(p, totemId)) return false;
  p.equippedTotem = (p.equippedTotem === totemId) ? null : totemId;
  if (typeof updateFervorHUD === 'function') updateFervorHUD(p);
  return true;
}
window.equipTotem = equipTotem;

// ── Ganho de Fervor Selvagem ──
function gainFervor(p, amount) {
  if (!p || !p.classData || p.classData.id !== 'arqueiro') return;
  p.fervor = Math.max(0, Math.min(100, (p.fervor || 0) + amount));
  if (typeof updateFervorHUD === 'function') updateFervorHUD(p);
}
window.gainFervor = gainFervor;

let _fervorCssInjected = false;
function _ensureFervorCss() {
  if (_fervorCssInjected || typeof document === 'undefined') return;
  _fervorCssInjected = true;
  const style = document.createElement('style');
  style.id = 'fervor-css';
  style.textContent = `
    @keyframes fervorReadyPulse {
      0%,100%{ opacity:1; transform:scale(1); }
      50%{ opacity:0.6; transform:scale(1.1); }
    }
    .fervor-ready-badge{
      position:absolute; top:4px; right:4px; display:flex; flex-direction:column; align-items:center; gap:1px;
      animation:fervorReadyPulse 1.1s ease-in-out infinite; cursor:pointer; z-index:40;
    }
    .fervor-ready-badge img{
      width:28px; height:28px; object-fit:contain; display:block;
      filter:drop-shadow(0 0 6px currentColor);
    }
  `;
  document.head.appendChild(style);
}

function updateFervorHUD(p) {
  if (typeof document === 'undefined' || !p) return;
  const isArcher = p.classData && p.classData.id === 'arqueiro';
  const totem = p.equippedTotem ? getTotemType(p.equippedTotem) : null;
  const pct = Math.max(0, Math.min(100, p.fervor || 0));
  const color = totem ? totem.color : '#a0c0a8';

  const row = document.getElementById('fervor-row');
  const bar = document.getElementById('bar-fervor');
  if (row && bar) {
    row.style.display = isArcher ? 'flex' : 'none';
    bar.style.width = pct + '%';
    bar.style.background = `linear-gradient(90deg, ${color}88, ${color})`;
  }

  const wrap  = document.getElementById('bat-hero-fervor-wrap');
  const fill  = document.getElementById('bat-hero-fervor-bar');
  const label = document.getElementById('bat-hero-fervor-label');
  if (wrap && fill) {
    if (isArcher) {
      wrap.style.display = 'block';
      fill.style.width = pct + '%';
      fill.style.background = `linear-gradient(90deg, ${color}99, ${color})`;
      fill.style.boxShadow = `0 0 8px ${color}99`;
      if (label) {
        label.textContent = `${totem ? totem.icon + ' ' : '✦ '}FERVOR ${Math.floor(pct)}/100`;
        label.style.color = color;
      }
    } else {
      wrap.style.display = 'none';
    }
  }

  // Removido o badge "DESPERTAR" que ficava sobre o ícone do HuBi —
  // agora despertar a Forma é feito tocando direto no card do dragão
  // (🐉 Sopro), ver onclick em updateDragonCompanionCard().
  const oldBadge = document.getElementById('fervor-ready-badge');
  if (oldBadge) oldBadge.remove();

  updateDragonCompanionCard();
}
window.updateFervorHUD = updateFervorHUD;

// ══════════════════════════════════════════════════════════════
//  CARD DO COMPANHEIRO DRAGÃO — fica ao lado do card do Arqueiro.
//  Estados: dormente (Forma não ativa) / recarregando (cooldown > 0)
//  / pronto (clicável, dispara Sopro do Dragão + anima o sprite sheet).
// ══════════════════════════════════════════════════════════════

// Coordenadas medidas no spritesheet Imagens/formas/dragao_grande.png
// (1685×480px): 3 quadros de largura variável, mesma altura.
// Índice 0 ("parado") não é mais usado pra recorte — ver _setDragonCompanionFrame.
const DRAGON_BREATH_SHEET = { w: 1685, h: 480 };
const DRAGON_BREATH_FRAMES = [
  { x: 1,    w: 414 }, // (não usado — parado agora é dragao_alma.png, imagem única)
  { x: 543,  w: 473 }, // jato curto
  { x: 1093, w: 587 }, // jato completo
];
const DRAGON_BREATH_COOLDOWN = 3;

function _setDragonCompanionFrame(idx) {
  const el = document.getElementById('dragon-companion-sprite');
  if (!el) return;

  if (idx === 0) {
    // Parado: mostra a Alma do Dragão (dragao_alma.png) como imagem única,
    // sem nenhum recorte de sprite sheet — é isso que fica visível o
    // tempo todo ao lado do HuBi enquanto a Forma não está soprando fogo.
    const totem = getTotemType('dragao');
    el.style.width = ''; // volta a ocupar a caixa toda (84px, ver CSS)
    el.style.backgroundImage = `url('${(totem && totem.soulImg) || 'Imagens/personagens/Arqueiro/dragao_alma.png'}')`;
    el.style.backgroundSize = 'contain';
    el.style.backgroundPosition = 'center center';
    return;
  }

  if (!el.clientHeight) return;
  const f = DRAGON_BREATH_FRAMES[idx] || DRAGON_BREATH_FRAMES[1];
  const scale = el.clientHeight / DRAGON_BREATH_SHEET.h;
  // A caixa precisa ter exatamente a largura do quadro (já escalada);
  // antes ficava travada em 64px fixos e, como os quadros do sheet são
  // mais estreitos que isso, o quadro vizinho vazava pra dentro da caixa
  // — era exatamente o "pedaço de outra parte do sprite sheet" relatado.
  el.style.width = Math.round(f.w * scale) + 'px';
  el.style.backgroundImage = `url('Imagens/formas/dragao_grande.png')`;
  el.style.backgroundSize = `${Math.round(DRAGON_BREATH_SHEET.w * scale)}px ${Math.round(DRAGON_BREATH_SHEET.h * scale)}px`;
  el.style.backgroundPosition = `-${Math.round(f.x * scale)}px 0px`;
}

// Toca a animação do sopro (parado → jato curto → jato completo → parado)
// dentro do card pequeno. Puramente visual — o dano já foi aplicado
// separadamente por quem chamou esta função.
function playDragonBreathAnim() {
  const card = document.getElementById('dragon-companion-card');
  _setDragonCompanionFrame(0);
  setTimeout(() => _setDragonCompanionFrame(1), 90);
  setTimeout(() => { _setDragonCompanionFrame(2); if (card) card.classList.add('breathing'); }, 240);
  setTimeout(() => { _setDragonCompanionFrame(0); if (card) card.classList.remove('breathing'); }, 900);
}
window.playDragonBreathAnim = playDragonBreathAnim;

// ══════════════════════════════════════════════════════════════
//  ANIMAÇÃO GRANDE DO SOPRO DO DRAGÃO — aparece no vão vazio da
//  arena (entre o "VS" e o indicador de turno) enquanto o golpe
//  é soltado. É o MESMO arquivo único Imagens/formas/dragao_grande.png
//  (spritesheet 1685×480, 3 quadros lado a lado), só recortado maior
//  — reaproveita as coordenadas já calibradas em DRAGON_BREATH_FRAMES.
// ══════════════════════════════════════════════════════════════
function playDragonBreathBigAnim() {
  if (typeof document === 'undefined') return;
  const wrap = document.getElementById('dragon-breath-bigfx');
  const art  = document.getElementById('dragon-breath-bigfx-art');
  if (!wrap || !art) return;

  const TARGET_H = 110; // precisa bater com a altura definida no CSS de #dragon-breath-bigfx-art
  const scale = TARGET_H / DRAGON_BREATH_SHEET.h;
  const sheetUrl = "url('Imagens/formas/dragao_grande.png')";

  const setFrame = (idx) => {
    const f = DRAGON_BREATH_FRAMES[idx];
    art.style.width = Math.round(f.w * scale) + 'px';
    art.style.height = TARGET_H + 'px';
    art.style.backgroundImage = sheetUrl;
    art.style.backgroundSize = `${Math.round(DRAGON_BREATH_SHEET.w * scale)}px ${TARGET_H}px`;
    art.style.backgroundPosition = `-${Math.round(f.x * scale)}px 0px`;
    art.onerror = () => console.error('[Clivor] dragao_grande.png não carregou pro FX grande');
  };

  wrap.classList.add('show');
  setFrame(1); // jato curto
  const t1 = setTimeout(() => setFrame(2), 220); // jato completo
  const t2 = setTimeout(() => { wrap.classList.remove('show'); art.style.backgroundImage = ''; }, 220 + 550);
  window._dragonBigFxTimers = [t1, t2];
}
window.playDragonBreathBigAnim = playDragonBreathBigAnim;

function updateDragonCompanionCard() {
  if (typeof document === 'undefined') return;
  const card = document.getElementById('dragon-companion-card');
  if (!card) return;
  const p = typeof G !== 'undefined' ? G.player : null;
  const bs = typeof battleState !== 'undefined' ? battleState : null;

  const hasDragon = p && p.classData && p.classData.id === 'arqueiro' && p.equippedTotem === 'dragao';
  if (!hasDragon) {
    card.style.display = 'none';
    _syncSoproDragaoSkillButton(true); // não deixa o botão real preso desabilitado fora desse fluxo
    return;
  }

  card.style.display = 'flex';
  _setDragonCompanionFrame(0);

  const active = !!(bs && bs.formaAtiva === 'dragao');
  const cd = bs ? (bs.dragaoBreathCd || 0) : 0;
  const ready = active && cd <= 0;

  card.classList.toggle('dormant', !active);
  card.classList.toggle('cooling', active && cd > 0);
  card.classList.toggle('ready', ready);

  const cdBadge = document.getElementById('dragon-companion-cd');
  if (cdBadge) {
    if (active && cd > 0) { cdBadge.style.display = 'flex'; cdBadge.textContent = cd; }
    else cdBadge.style.display = 'none';
  }

  card.onclick = () => {
    const totem = getTotemType('dragao');
    if (!totem) return;
    if (!active) {
      const podeDespertar = totem.implemented && (p.fervor || 0) >= 100
        && typeof G !== 'undefined' && G.inBattle;
      if (podeDespertar) {
        if (typeof activateFormaEspiritual === 'function') activateFormaEspiritual();
      } else if (typeof notify === 'function') {
        notify('🐉 Encha o Fervor Selvagem pra despertar a Forma do Dragão primeiro.', totem.color);
      }
      return;
    }
    if (cd > 0) {
      if (typeof notify === 'function') notify(`🐉 Sopro do Dragão recarregando... (${cd} turno${cd === 1 ? '' : 's'})`, totem.color);
      return;
    }
    handleFormaAtivaClick(totem);
  };

  _syncSoproDragaoSkillButton(ready);
}
window.updateDragonCompanionCard = updateDragonCompanionCard;

// Enquanto o Sopro do Dragão estiver em cooldown, o botão real da skill
// (injetado na lista normal de ataques) fica visualmente desabilitado
// pra não permitir um segundo caminho de clique que ignore o cooldown.
function _syncSoproDragaoSkillButton(enabled) {
  const btn = _findSkillButtonByName('Sopro do Dragão');
  if (!btn) return;
  btn.style.pointerEvents = enabled ? '' : 'none';
  btn.style.opacity = enabled ? '' : '0.35';
  btn.style.filter = enabled ? '' : 'grayscale(0.6)';
}

// O motor de combate (palDinh.js) só desenha na tela as skills cujo
// slot key ('b'+índice) esteja em p.equippedSkills — mesmo que a skill
// exista em p.classData.skills. Por isso, ao injetar o ataque exclusivo
// do totem, também precisamos "equipá-lo" nesse array, senão ele fica
// invisível na lista mesmo com tudo certo em classData.skills.
function _equipTotemSkill(p, atkKey) {
  if (!p || !p.classData || !p.classData.skills) return;
  const idx = p.classData.skills.findIndex(s => s.key === atkKey);
  if (idx === -1) return;
  const slotKey = 'b' + idx;
  if (!Array.isArray(p.equippedSkills)) p.equippedSkills = [];
  if (!p.equippedSkills.includes(slotKey)) p.equippedSkills.push(slotKey);
}

function _unequipTotemSkill(p, atkKey) {
  if (!p || !p.classData || !p.classData.skills) return;
  const idx = p.classData.skills.findIndex(s => s.key === atkKey);
  if (idx === -1) return;
  const slotKey = 'b' + idx;
  if (Array.isArray(p.equippedSkills)) {
    p.equippedSkills = p.equippedSkills.filter(k => k !== slotKey);
  }
}

// Ativação da Forma: ação instantânea (não consome o turno), consome a
// barra inteira e ativa a forma por 3 turnos. Também injeta o ataque
// exclusivo do totem (se houver) na lista de skills do Arqueiro.
function activateFormaEspiritual() {
  const p = G.player;
  if (typeof G === 'undefined' || !G.inBattle || !p || !p.classData || p.classData.id !== 'arqueiro') return;
  const totem = p.equippedTotem ? getTotemType(p.equippedTotem) : null;
  if (!totem || !totem.implemented) return;
  if ((p.fervor || 0) < 100) return;
  if (battleState.formaAtiva) return;

  p.fervor = 0;
  battleState.formaAtiva = totem.id;
  battleState.formaTurnsLeft = 3;
  // Sopro do Dragão nasce pronto pra usar assim que a Forma desperta;
  // depois de usado, entra em cooldown de 3 turnos (ver TOTEM_BREATH_COOLDOWN).
  if (totem.id === 'dragao') battleState.dragaoBreathCd = 0;

  if (typeof appendBattleLog === 'function') {
    appendBattleLog(`${totem.icon} FÚRIA DE ${totem.name.toUpperCase()} DESPERTA!`, totem.color);
  }
  if (typeof showFloatingNumber === 'function') showFloatingNumber('hero', `${totem.icon} FORMA!`, 'status');

  if (typeof document !== 'undefined') {
    const flash = document.createElement('div');
    flash.style.cssText = `position:fixed;inset:0;z-index:600;pointer-events:none;
      background:${totem.color}33;animation:screen-flash 0.4s ease-out forwards;`;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 450);
  }

  if (typeof showFormaCutin === 'function') showFormaCutin(totem);

  // Injeta o ataque exclusivo do totem (se existir) na lista de skills.
  const atk = TOTEM_ATTACKS[totem.id];
  if (atk && p.classData.skills && !p.classData.skills.some(s => s.key === atk.key)) {
    p.classData.skills.push({
      key: atk.key, name: atk.name, icon: atk.icon,
      ap: atk.ap, arrowCost: atk.arrowCost || 0, desc: atk.desc, dmg: atk.dmg,
    });
    _equipTotemSkill(p, atk.key);
    if (typeof buildSkillList === 'function') buildSkillList();
  }

  updateFervorHUD(p);
  updateFormaAtivaBanner(totem, battleState.formaTurnsLeft);
  updateDragonCompanionCard();
  if (typeof updateBattleHUD === 'function') updateBattleHUD();
}
window.activateFormaEspiritual = activateFormaEspiritual;

// Tenta localizar o botão real da skill exclusiva (ex: "Sopro do Dragão")
// que foi injetado em p.classData.skills. Ele deveria estar na lista de
// ataques — procuramos pelo texto do nome pra não depender de saber a
// classe/estrutura exata do botão (isso vive em outro arquivo, fora do
// totens.js). Se achar, disparamos um clique nele — assim toda a lógica
// real de custo de AP, flechas e passagem de turno roda normalmente,
// mesmo que o botão esteja escondido/cortado na tela.
function _findSkillButtonByName(name) {
  if (typeof document === 'undefined') return null;
  const all = document.querySelectorAll('body *');
  for (const el of all) {
    if (el.children.length > 2) continue; // queremos o elemento "folha" do botão, não um container grande
    const txt = (el.textContent || '').trim();
    if (txt.startsWith(name) && el.offsetParent !== null) return el;
  }
  return null;
}

// Clique no banner "FORMA DO DRAGÃO" ativo = disparar o ataque exclusivo
// (ex: Sopro do Dragão) sem precisar procurar o botão na lista de skills.
function handleFormaAtivaClick(totem) {
  if (!totem) return;
  const atk = TOTEM_ATTACKS[totem.id];
  if (!atk) return; // totem sem ataque exclusivo próprio — banner só informativo

  const btn = _findSkillButtonByName(atk.name);
  if (btn) {
    btn.click();
    return;
  }
  // Não achamos o botão real na tela — avisa em vez de fingir que funcionou.
  if (typeof appendBattleLog === 'function') {
    appendBattleLog(`⚠️ Não encontrei o botão de "${atk.name}" na lista de ataques pra disparar automaticamente. Use-o na lista de skills.`, 'rgba(255,180,80,0.85)');
  }
}
window.handleFormaAtivaClick = handleFormaAtivaClick;

// Mostra/atualiza/esconde o banner de "Forma Ativa" (imagem + nome + turnos
// restantes), exibido logo abaixo do combo, acima do indicador de turno.
// Chame com (totem, turnsLeft) pra mostrar/atualizar, ou sem args pra esconder.
function updateFormaAtivaBanner(totem, turnsLeft) {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('forma-ativa-banner');
  if (!el) return;

  if (!totem) { el.style.display = 'none'; hideDragonLoom(); return; }

  const img    = document.getElementById('forma-ativa-img');
  const nome   = document.getElementById('forma-ativa-nome');
  const turnos = document.getElementById('forma-ativa-turnos');
  if (img)    { img.src = totem.bannerImg || totem.img || ''; img.alt = totem.name; }
  if (nome)   nome.textContent = `${totem.icon} FORMA DO ${totem.name.toUpperCase()}`;
  if (turnos) turnos.textContent = `Dura mais ${turnsLeft} turno${turnsLeft === 1 ? '' : 's'}`;
  el.style.setProperty('--forma-color', totem.color);
  el.style.display = 'flex';

  // Se o totem tem ataque exclusivo, o banner vira também o botão de ataque.
  const atk = TOTEM_ATTACKS[totem.id];
  if (atk) {
    el.style.cursor = 'pointer';
    el.title = `Toque para usar ${atk.name}`;
    el.onclick = () => handleFormaAtivaClick(totem);
  } else {
    el.style.cursor = 'default';
    el.onclick = null;
  }

  // A arte grande do dragão pairando sobre o card do inimigo foi removida —
  // a "Alma Aliada" (showTotemAllySoul, ao lado do herói) já cobre isso.
}
window.updateFormaAtivaBanner = updateFormaAtivaBanner;

let _loomCssInjected = false;
function _ensureLoomCss() {
  if (_loomCssInjected || typeof document === 'undefined') return;
  _loomCssInjected = true;
  const style = document.createElement('style');
  style.id = 'dragon-loom-css';
  style.textContent = `
    @keyframes dragonLoomIn{ from{ opacity:0; transform:translateX(-50%) translateY(8px) scale(0.94); } to{ opacity:0.92; transform:translateX(-50%) translateY(0) scale(1); } }
    #dragon-loom-art{
      position:absolute; bottom:6px; left:50%; transform:translateX(-50%); width:72%; max-width:220px;
      pointer-events:none; z-index:5;
      opacity:0.92; filter:drop-shadow(0 0 18px rgba(255,106,26,0.55));
      animation:dragonLoomIn 0.5s ease-out forwards;
    }
    #dragon-loom-art img{ width:100%; display:block; }
  `;
  document.head.appendChild(style);
}

// Mostra a arte grande do dragão pairando sobre a cena (canto superior
// direito, acima do inimigo) enquanto a Forma do Dragão estiver ativa.
function showDragonLoom(totem) {
  if (typeof document === 'undefined' || !totem || !totem.loomImg) return;
  _ensureLoomCss();
  const stage = document.getElementById('bat-enemy-side') || document.querySelector('.battle-combatants') || document.body;
  let wrap = document.getElementById('dragon-loom-art');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'dragon-loom-art';
    stage.style.position = stage.style.position || 'relative';
    stage.appendChild(wrap);
  }
  wrap.innerHTML = `<img src="${totem.loomImg}" alt="${totem.name}" onerror="this.parentNode.remove()">`;
}
window.showDragonLoom = showDragonLoom;

function hideDragonLoom() {
  if (typeof document === 'undefined') return;
  const wrap = document.getElementById('dragon-loom-art');
  if (wrap) wrap.remove();
}
window.hideDragonLoom = hideDragonLoom;

// Decrementa a duração da forma a cada ação do Arqueiro (ataque ou skill).
// Também dispara a visual da Alma Aliada e, quando a Forma se dissipa,
// remove o ataque exclusivo injetado.
function tickFormaEspiritual(bs) {
  if (!bs || !bs.formaAtiva) return;

  // ── Alma Aliada: aparece a cada ação enquanto a Forma está ativa ──
  const totemAtivo = getTotemType(bs.formaAtiva);
  if (totemAtivo && typeof showTotemAllySoul === 'function') {
    showTotemAllySoul(totemAtivo);
  }

  // ── Sopro do Dragão: recarrega 1 turno a cada ação do Arqueiro ──
  if (bs.formaAtiva === 'dragao' && (bs.dragaoBreathCd || 0) > 0) {
    bs.dragaoBreathCd--;
  }

  bs.formaTurnsLeft = (bs.formaTurnsLeft || 1) - 1;
  if (bs.formaTurnsLeft <= 0) {
    const totem = getTotemType(bs.formaAtiva);
    if (typeof appendBattleLog === 'function') {
      appendBattleLog(`${totem ? totem.icon : '✦'} A Forma Espiritual se dissipa...`, 'rgba(200,200,200,0.6)');
    }
    // Remove o ataque exclusivo injetado, se houver.
    const atk = totem ? TOTEM_ATTACKS[totem.id] : null;
    const p = typeof G !== 'undefined' ? G.player : null;
    if (atk && p && p.classData && p.classData.skills) {
      _unequipTotemSkill(p, atk.key);
      p.classData.skills = p.classData.skills.filter(s => s.key !== atk.key);
      if (typeof buildSkillList === 'function') buildSkillList();
    }
    bs.formaAtiva = null;
    bs.formaTurnsLeft = 0;
    bs.dragaoBreathCd = 0;
    if (typeof updateFervorHUD === 'function' && typeof G !== 'undefined' && G.player) updateFervorHUD(G.player);
    updateFormaAtivaBanner(null);
  } else if (totemAtivo) {
    updateFormaAtivaBanner(totemAtivo, bs.formaTurnsLeft);
  }
  updateDragonCompanionCard();
}
window.tickFormaEspiritual = tickFormaEspiritual;

// Segurança: se a batalha terminar (vitória/fuga/derrota) com a Forma
// ainda ativa, limpa o ataque exclusivo pra ele não vazar pra fora da
// batalha ou pra próxima luta.
(function () {
  const _origEndBattle = window.endBattle;
  if (typeof _origEndBattle === 'function') {
    window.endBattle = function (...args) {
      const p = typeof G !== 'undefined' ? G.player : null;
      if (p && p.classData && p.classData.skills) {
        Object.values(TOTEM_ATTACKS).forEach(atk => {
          _unequipTotemSkill(p, atk.key);
          p.classData.skills = p.classData.skills.filter(s => s.key !== atk.key);
        });
      }
      updateFormaAtivaBanner(null);
      hideDragonLoom();
      if (typeof battleState !== 'undefined') battleState.dragaoBreathCd = 0;
      updateDragonCompanionCard();
      return _origEndBattle.apply(this, args);
    };
  }
})();

// ══════════════════════════════════════════════════════════════
//  ATAQUE EXCLUSIVO: Sopro do Dragão
//  Empacotado como wrap de window.skillArqueiro pra não precisar
//  tocar em class_arqueiro.js. Qualquer outro skillKey continua
//  indo direto pro handler original.
// ══════════════════════════════════════════════════════════════
(function () {
  const _origSkillArqueiro = window.skillArqueiro;

  window.skillArqueiro = function (skillKey, p, e, bs, helpers) {
    if (skillKey !== 'sopro_dragao') {
      return _origSkillArqueiro(skillKey, p, e, bs, helpers);
    }

    const { appendBattleLog, showFloatingNumber, flashDamage, animEnemyHit, BATTLE_CONFIG } = helpers;

    // ── Segurança: o card/botão já ficam desabilitados em cooldown, mas se
    // esse handler for alcançado mesmo assim, não aplicamos o golpe — só
    // devolvemos o AP gasto (o motor já descontou antes de chamar isso).
    if ((bs.dragaoBreathCd || 0) > 0) {
      const atkDef = TOTEM_ATTACKS.dragao;
      if (atkDef) p.ap = Math.min(p.maxAp || p.ap || 0, (p.ap || 0) + atkDef.ap);
      appendBattleLog(`🐉 Sopro do Dragão ainda recarregando (${bs.dragaoBreathCd} turno${bs.dragaoBreathCd === 1 ? '' : 's'}).`, 'rgba(255,180,80,0.85)');
      return { skipEnemyTurn: false, enemyStunned: false, apGain: 0, dmgDealt: 0 };
    }

    const result = { skipEnemyTurn: false, enemyStunned: false, apGain: 0 };
    // +50% de chance relativa (equivalente ao antigo "* 1.5"), agora via
    // função central: soma VEL e o crítico real de itens equipados — o
    // antigo p._enchantCrit nunca era lido de fato (já migrado para
    // p.critBonus antes de chegar aqui).
    const isCrit = (typeof getPlayerCritChance === 'function')
      ? Math.random() < getPlayerCritChance(p, BATTLE_CONFIG.CRIT_BASE_CHANCE * 0.5, (e && e.critResist) || 0)
      : Math.random() < (BATTLE_CONFIG.CRIT_BASE_CHANCE * 1.5);

    let d = Math.max(1, Math.floor(p.atk * 1.9 - e.def * 0.35 + Math.random() * 8));
    if (isCrit) d = Math.floor(d * (p._talent_max_draw ? 2.2 : (typeof getCritMultiplier === 'function' ? getCritMultiplier(p) : BATTLE_CONFIG.CRIT_MULTIPLIER)));
    bs.enemyHp -= d;
    bs.enemyBurning   = true;
    bs.enemyBurnTurns = 4;

    appendBattleLog(`🐉 Sopro do Dragão: ${isCrit ? 'CRÍTICO! ' : ''}a fera ancestral cospe fogo! -${d} HP + 🔥 Queimadura por 4 turnos!`, '#ff6a1a');
    showFloatingNumber('enemy', d, isCrit ? 'crit' : 'dmg');
    showFloatingNumber('enemy', '🔥 QUEIMADURA', 'status');
    flashDamage('enemy'); animEnemyHit();

    // ── Projétil animado: voa do herói até o inimigo. Puramente visual —
    // o dano já foi aplicado acima, então não atrasa nem arrisca a lógica
    // de turno/vitória do motor. Se esse golpe matar o inimigo, o
    // _pendingFxHoldMs segura a tela de vitória até o voo terminar
    // (mesmo mecanismo usado pelo Kuroen do Assassino).
    const totemDragao = getTotemType('dragao');
    if (typeof showTotemProjectile === 'function' && totemDragao) {
      const flightMs = showTotemProjectile(totemDragao);
      bs._pendingFxHoldMs = Math.max(bs._pendingFxHoldMs || 0, flightMs);
    }

    result.apGain = isCrit ? 14 : 6;
    if (typeof gainFervor === 'function') gainFervor(p, isCrit ? 14 : 6);

    // ── Cooldown do Sopro do Dragão: 3 turnos até poder usar de novo ──
    bs.dragaoBreathCd = DRAGON_BREATH_COOLDOWN;
    if (typeof playDragonBreathAnim === 'function') playDragonBreathAnim();
    if (typeof playDragonBreathBigAnim === 'function') playDragonBreathBigAnim();
    if (typeof updateDragonCompanionCard === 'function') updateDragonCompanionCard();

    return result;
  };
})();

// ══════════════════════════════════════════════════════════════
//  ALMA ALIADA — a criatura do totem some/aparece junto do herói
// ══════════════════════════════════════════════════════════════

let _totemAllyCssInjected = false;
function _ensureTotemAllyCss() {
  if (_totemAllyCssInjected || typeof document === 'undefined') return;
  _totemAllyCssInjected = true;
  const style = document.createElement('style');
  style.id = 'totem-ally-css';
  style.textContent = `
    /* O dragão em si (totem.img): do tamanho do personagem, ancorado
       ao lado do herói enquanto a Forma do Dragão está ativa. */
    .totem-ally-soul{
      position:absolute; left:100%; bottom:0; margin-left:6px;
      width:120px; height:150px;
      background-repeat:no-repeat; background-position:center bottom;
      background-size:contain;
      pointer-events:none; z-index:30; opacity:0;
      animation: totemAllySoulPulse 1.1s ease forwards;
    }
    @keyframes totemAllySoulPulse{
      0%{ opacity:0; transform:scale(0.5) translateY(8px); }
      25%{ opacity:1; transform:scale(1.08) translateY(0); }
      75%{ opacity:1; transform:scale(1) translateY(0); }
      100%{ opacity:0; transform:scale(0.9) translateY(-8px); }
    }

    /* Projétil: sprite sheet horizontal (N quadros) que voa do herói
       até o inimigo, crescendo e trocando de quadro conforme avança. */
    .totem-projectile{
      position:fixed; width:150px; height:70px; margin-left:-75px; margin-top:-35px;
      background-repeat:no-repeat; background-position:0% 0%; pointer-events:none;
      z-index:700; opacity:0; will-change:left,top,transform;
      transition:left var(--proj-dur,0.62s) cubic-bezier(.32,.58,.2,1),
                 top var(--proj-dur,0.62s) cubic-bezier(.32,.58,.2,1);
    }
    .totem-projectile-fly{
      opacity:1;
      animation: totemProjFrames var(--proj-dur,0.62s) steps(var(--proj-steps,3)) forwards,
                 totemProjGrow var(--proj-dur,0.62s) ease-out forwards;
    }
    @keyframes totemProjFrames{ 0%{background-position:0% 0%;} 100%{background-position:100% 0%;} }
    @keyframes totemProjGrow{
      0%{ transform:rotate(var(--proj-angle,0deg)) scale(0.4); }
      100%{ transform:rotate(var(--proj-angle,0deg)) scale(1.4); }
    }
    .totem-projectile-impact{ opacity:0 !important; transition:opacity 0.22s ease-out; }
  `;
  document.head.appendChild(style);
}

// O dragão em si — ancorado em #bat-hero-icon, do lado do herói e do
// mesmo tamanho dele (ver .totem-ally-soul no CSS acima). Usa totem.img
// (Imagens/formas/dragao.png), não totem.soulImg — soulImg é a "alma"
// (dragao_alma.png) que fica no card pequeno perto do HuBi, não este.
function showTotemAllySoul(totem) {
  const src = totem && (totem.img || totem.soulImg);
  if (typeof document === 'undefined' || !totem || !src) return;
  _ensureTotemAllyCss();
  const anchor = document.getElementById('bat-hero-icon');
  if (!anchor) return;
  if (getComputedStyle(anchor).position === 'static') anchor.style.position = 'relative';

  const old = document.getElementById('totem-ally-soul');
  if (old) old.remove();

  const el = document.createElement('div');
  el.id = 'totem-ally-soul';
  el.className = 'totem-ally-soul';
  el.style.backgroundImage = `url('${src}')`;
  el.style.filter = `drop-shadow(0 0 10px ${totem.color})`;

  anchor.appendChild(el);
  setTimeout(() => { if (el.parentNode) el.remove(); }, 1150);
}
window.showTotemAllySoul = showTotemAllySoul;

// Projétil animado do ataque exclusivo — voa de #bat-hero-icon até
// #bat-enemy-icon, trocando de quadro do sprite sheet conforme avança
// e crescendo em direção ao alvo. Retorna a duração em ms (pra quem
// chamou poder segurar o fim de batalha com _pendingFxHoldMs).
function showTotemProjectile(totem) {
  const DURATION = 620;
  if (typeof document === 'undefined' || !totem || !totem.projectileImg) return DURATION;
  _ensureTotemAllyCss();

  const heroEl  = document.getElementById('bat-hero-icon');
  const enemyEl = document.getElementById('bat-enemy-icon');
  if (!heroEl || !enemyEl) return DURATION;

  const heroRect  = heroEl.getBoundingClientRect();
  const enemyRect = enemyEl.getBoundingClientRect();
  const startX = heroRect.left + heroRect.width  * 0.55;
  const startY = heroRect.top  + heroRect.height * 0.4;
  const endX   = enemyRect.left + enemyRect.width  * 0.45;
  const endY   = enemyRect.top  + enemyRect.height * 0.4;
  const dx = endX - startX, dy = endY - startY;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  const old = document.getElementById('totem-projectile');
  if (old) old.remove();

  const frames = totem.projectileFrames || 4;
  const el = document.createElement('div');
  el.id = 'totem-projectile';
  el.className = 'totem-projectile';
  el.style.backgroundImage = `url(${totem.projectileImg})`;
  el.style.backgroundSize = `${frames * 100}% 100%`;
  el.style.filter = `drop-shadow(0 0 16px ${totem.color})`;
  el.style.setProperty('--proj-dur', (DURATION / 1000) + 's');
  el.style.setProperty('--proj-steps', frames - 1);
  el.style.setProperty('--proj-angle', angle.toFixed(1) + 'deg');
  el.style.left = startX + 'px';
  el.style.top  = startY + 'px';
  document.body.appendChild(el);

  // Força reflow antes de disparar a transição de posição + animação.
  void el.offsetWidth;
  el.style.left = endX + 'px';
  el.style.top  = endY + 'px';
  el.classList.add('totem-projectile-fly');

  setTimeout(() => {
    el.classList.add('totem-projectile-impact');
    setTimeout(() => { if (el.parentNode) el.remove(); }, 240);
  }, DURATION);

  return DURATION + 240;
}
window.showTotemProjectile = showTotemProjectile;

// ══════════════════════════════════════════════════════════════
//  CUT-IN DAS FORMAS ESPIRITUAIS — arte em tela cheia ao despertar
// ══════════════════════════════════════════════════════════════

let _formaCutinCssInjected = false;
function _ensureFormaCutinCss() {
  if (_formaCutinCssInjected || typeof document === 'undefined') return;
  _formaCutinCssInjected = true;
  const style = document.createElement('style');
  style.id = 'forma-cutin-css';
  style.textContent = `
    .forma-cutin{
      position:fixed; inset:0; z-index:850; display:flex; align-items:center; justify-content:center;
      flex-direction:column; pointer-events:none; overflow:hidden; opacity:0;
      animation:formaCutinFade 1.65s ease forwards;
    }
    .forma-cutin-backdrop{
      position:absolute; inset:0;
      background:radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.88) 100%);
    }
    .forma-cutin-art-wrap{ position:relative; width:280px; height:280px; }
    .forma-cutin-img-main{
      position:absolute; inset:-15%; width:130%; height:130%; object-fit:contain;
      mix-blend-mode:screen; animation:formaCutinZoom 0.6s cubic-bezier(.2,.9,.3,1.2) forwards;
    }
    .forma-cutin-title{
      position:relative; margin-top:14px; text-align:center; font-family:'Noto Sans JP',sans-serif;
      letter-spacing:2px; font-size:0.95rem; text-shadow:0 0 10px currentColor, 0 0 22px currentColor;
      opacity:0; animation:formaTitleIn 0.5s ease 0.35s forwards;
    }
    @keyframes formaCutinFade{ 0%{opacity:0;} 8%{opacity:1;} 82%{opacity:1;} 100%{opacity:0;} }
    @keyframes formaCutinZoom{ 0%{transform:scale(0.6);opacity:0;} 22%{transform:scale(1.08);opacity:1;} 32%{transform:scale(1);} 100%{transform:scale(1);} }
    @keyframes formaTitleIn{ 0%{opacity:0;transform:translateY(6px);} 100%{opacity:1;transform:translateY(0);} }

    /* ── FOGO (Dragão): brasas subindo ── */
    .ember{
      position:absolute; bottom:6%; width:5px; height:5px; border-radius:50%;
      background:radial-gradient(circle, #ffd080, #ff6a1a 70%, transparent);
      animation:emberRise 1.8s ease-in forwards;
    }
    @keyframes emberRise{ 0%{transform:translateY(0) scale(1);opacity:0.9;} 100%{transform:translateY(-240px) scale(0.3);opacity:0;} }

    /* ── ÁGUA (Tubarão): holograma ── */
    .forma-cutin-ghost{
      position:absolute; inset:-15%; width:130%; height:130%; object-fit:contain;
      mix-blend-mode:screen; opacity:0.32;
    }
    .forma-cutin-ghost.g1{ filter:hue-rotate(20deg); animation:holoChromaA 2.2s infinite; }
    .forma-cutin-ghost.g2{ filter:hue-rotate(-20deg); animation:holoChromaB 2.2s infinite; }
    @keyframes holoChromaA{ 0%,100%{transform:translateX(3px);} 50%{transform:translateX(6px);} }
    @keyframes holoChromaB{ 0%,100%{transform:translateX(-3px);} 50%{transform:translateX(-6px);} }
    .forma-cutin-scanlines{
      position:absolute; inset:0; mix-blend-mode:overlay;
      background:repeating-linear-gradient(0deg, rgba(180,240,255,0.10) 0 1px, transparent 2px 4px);
    }
    .forma-cutin-scanbar{
      position:absolute; left:0; right:0; height:36px; mix-blend-mode:screen;
      background:linear-gradient(180deg, transparent, rgba(160,230,255,0.3), transparent);
      animation:holoScan 1.5s linear infinite;
    }
    @keyframes holoScan{ 0%{top:-15%;} 100%{top:115%;} }
    .forma-cutin-img-main.holo-flicker{
      animation:formaCutinZoom 0.6s cubic-bezier(.2,.9,.3,1.2) forwards, holoFlicker 2.2s 0.6s infinite steps(1);
    }
    @keyframes holoFlicker{ 0%,90%,100%{opacity:1;} 91%{opacity:0.4;} 92%{opacity:0.9;} 93%{opacity:0.3;} 94%{opacity:1;} }

    /* ── TERRA (Touro): impacto/poeira ── */
    .forma-cutin.forma-cutin-terra .forma-cutin-art-wrap{ animation:formaCutinShake 0.5s 0.32s; }
    @keyframes formaCutinShake{
      0%,100%{transform:translate(0,0);} 20%{transform:translate(-6px,2px);}
      40%{transform:translate(5px,-2px);} 60%{transform:translate(-4px,1px);} 80%{transform:translate(3px,-1px);}
    }
    .forma-dust{
      position:absolute; bottom:-4%; border-radius:50%;
      background:radial-gradient(circle, rgba(210,180,130,0.9), rgba(120,90,50,0) 70%);
      animation:formaDustRise 1.4s ease-out forwards;
    }
    @keyframes formaDustRise{ 0%{transform:translateY(0) scale(0.6);opacity:0.8;} 100%{transform:translateY(-110px) scale(1.6);opacity:0;} }
    .forma-cutin-ring{
      position:absolute; left:50%; top:50%; border:2px solid rgba(200,160,90,0.65); border-radius:50%;
      transform:translate(-50%,-50%); animation:formaRingExpand 0.8s ease-out 0.28s forwards; opacity:0;
    }
    @keyframes formaRingExpand{ 0%{width:20px;height:20px;opacity:0.9;} 100%{width:320px;height:320px;opacity:0;} }

    /* ── VENTO (Águia): rajada ── */
    .forma-cutin-streak{
      position:absolute; height:3px;
      background:linear-gradient(90deg, transparent, rgba(159,232,200,0.9), transparent);
      animation:formaStreakMove 0.7s ease-in forwards;
    }
    @keyframes formaStreakMove{ 0%{transform:translateX(-140%);opacity:0;} 30%{opacity:1;} 100%{transform:translateX(140%);opacity:0;} }
    .forma-cutin-img-main.wind-blur{
      animation:formaCutinZoom 0.6s cubic-bezier(.2,.9,.3,1.2) forwards, formaWindPulse 1.3s ease-in-out infinite;
    }
    @keyframes formaWindPulse{ 0%,100%{filter:blur(0);} 50%{filter:blur(1.5px);} }
  `;
  document.head.appendChild(style);
}

// Monta e mostra o cut-in de acordo com o elemento do totem.
function showFormaCutin(totem) {
  if (typeof document === 'undefined' || !totem || !totem.img) return;
  _ensureFormaCutinCss();

  const old = document.getElementById('forma-cutin-overlay');
  if (old) old.remove();

  const elementoClasse = { dragao:'fogo', tubarao:'agua', touro:'terra', aguia:'vento' }[totem.id] || 'fogo';

  let imgClass = 'forma-cutin-img-main';
  let extraLayers = '';

  if (totem.id === 'tubarao') {
    imgClass += ' holo-flicker';
    extraLayers = `
      <img class="forma-cutin-ghost g1" src="${totem.img}">
      <img class="forma-cutin-ghost g2" src="${totem.img}">
      <div class="forma-cutin-scanlines"></div>
      <div class="forma-cutin-scanbar"></div>`;
  } else if (totem.id === 'dragao') {
    let embers = '';
    for (let i = 0; i < 14; i++) {
      const left = Math.round(Math.random() * 100);
      const delay = (Math.random() * 0.8).toFixed(2);
      const dur = (1.2 + Math.random() * 1.2).toFixed(2);
      embers += `<div class="ember" style="left:${left}%;animation-delay:${delay}s;animation-duration:${dur}s;"></div>`;
    }
    extraLayers = embers;
  } else if (totem.id === 'touro') {
    let dust = '';
    for (let i = 0; i < 10; i++) {
      const left = Math.round(10 + Math.random() * 80);
      const size = Math.round(10 + Math.random() * 18);
      const delay = (Math.random() * 0.4).toFixed(2);
      dust += `<div class="forma-dust" style="left:${left}%;width:${size}px;height:${size}px;animation-delay:${delay}s;"></div>`;
    }
    extraLayers = dust + `<div class="forma-cutin-ring"></div>`;
  } else if (totem.id === 'aguia') {
    imgClass += ' wind-blur';
    let streaks = '';
    for (let i = 0; i < 6; i++) {
      const top = Math.round(10 + Math.random() * 80);
      const width = Math.round(60 + Math.random() * 120);
      const delay = (Math.random() * 0.5).toFixed(2);
      streaks += `<div class="forma-cutin-streak" style="top:${top}%;width:${width}px;animation-delay:${delay}s;"></div>`;
    }
    extraLayers = streaks;
  }

  const el = document.createElement('div');
  el.id = 'forma-cutin-overlay';
  el.className = `forma-cutin forma-cutin-${elementoClasse}`;
  el.style.color = totem.color;
  el.innerHTML = `
    <div class="forma-cutin-backdrop"></div>
    <div class="forma-cutin-art-wrap">
      <img class="${imgClass}" src="${totem.img}" onerror="this.style.display='none'">
      ${extraLayers}
    </div>
    <div class="forma-cutin-title">${totem.icon} FORMA DO ${totem.name.toUpperCase()}</div>
  `;
  document.body.appendChild(el);
  setTimeout(() => { if (el.parentNode) el.remove(); }, 1650);
}
window.showFormaCutin = showFormaCutin;

// ── Aba de Totens na Bolsa (mesmo padrão da aba de Flechas) ──
function buildTotemBagTab() {
  if (typeof document === 'undefined') return;
  const p = G.player;
  const equipped = p.equippedTotem || null;

  const eqEl = document.getElementById('totem-equipped-display');
  if (eqEl) {
    if (equipped) {
      const t = getTotemType(equipped);
      eqEl.innerHTML = `
        <div class="arrow-equipped-slot" style="border-color:${t.color}55;border-left-color:${t.color};background:${t.color}12;">
          <div class="arrow-slot-icon">${t.icon}</div>
          <div class="arrow-slot-info">
            <div class="arrow-slot-name" style="color:${t.color};">${t.name} — ${t.elemento}</div>
            <div class="arrow-slot-desc">${t.desc}</div>
            <div class="arrow-slot-badge" style="border-color:${t.color}55;color:${t.color};background:${t.color}18;">
              ${t.implemented ? '✓ FORMA DISPONÍVEL' : '✗ EM DESENVOLVIMENTO'}
            </div>
          </div>
        </div>`;
    } else {
      eqEl.innerHTML = `
        <div class="arrow-equipped-slot" style="justify-content:center;opacity:0.6;">
          <div class="arrow-slot-info" style="text-align:center;">
            <div class="arrow-slot-desc">Nenhuma Forma Espiritual equipada.</div>
          </div>
        </div>`;
    }
  }

  const listEl = document.getElementById('totem-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  TOTEM_TYPES.forEach(t => {
    const isEq = t.id === equipped;
    const unlocked = isTotemUnlocked(p, t.id);
    const card = document.createElement('div');
    card.className = 'arrow-card' + (isEq ? ' equipped' : '');
    if (!unlocked) card.style.opacity = '0.4';
    card.innerHTML = `
      <div class="arrow-card-icon">${t.icon}</div>
      <div style="flex:1;">
        <div class="arrow-card-name" style="color:${t.color};">${t.name} — ${t.elemento}</div>
        <div class="arrow-card-desc">${unlocked ? t.desc : 'Bloqueado. Requer Runa Totêmica (crafting com Gozen em breve).'}</div>
      </div>
      <div class="arrow-card-eq">${isEq ? '✓' : (unlocked ? '' : '🔒')}</div>
    `;
    if (unlocked) {
      card.onclick = () => {
        equipTotem(t.id);
        if (typeof notify === 'function') {
          notify(isEq ? `${t.icon} ${t.name} desequipada.` : `${t.icon} ${t.name} equipada!`, t.color);
        }
        buildTotemBagTab();
      };
    }
    listEl.appendChild(card);
  });
}
window.buildTotemBagTab = buildTotemBagTab;
