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
//  5-A. SISTEMA DE ENCANTAMENTOS — RUNA DA ARMA (POR CLASSE)
// ─────────────────────────────────────────────────────────────
//
//  Cada tier tem `bonusByClass`: bônus exclusivo por classe.
//  Campos suportados: atk, def, mag, hp, mp, crit
//    - crit: chance extra de crítico em % (armazenada em p._enchantCrit)
//    - hp: aumenta maxHp (e hp atual proporcionalmente)
//    - mp: aumenta maxMp
//  Se a classe não estiver no mapa, usa `bonusDefault`.
//
//  VEL foi removido — jogo por turnos, irrelevante.
// ─────────────────────────────────────────────────────────────

const ENCHANT_TIERS = [
  // ── D: Runa básica ──────────────────────────────────────────
  {
    id: 'D',
    label: 'Runa D',
    color: '#9e9e9e',
    glow: '0 0 8px #9e9e9e88',
    req: { level: 3 },
    cost: 30,
    bonusDefault: { atk: 2 },
    bonusByClass: {
      mago:      { mag: 2 },
      paladino:  { def: 2 },
      monge:     { atk: 1, mag: 1 },
      assassino: { atk: 2 },
      arqueiro:  { atk: 2 },
      guerreiro: { atk: 2 },
    },
    descByClass: {
      mago:      'Entalhe de foco arcano. Canaliza mana com mais clareza. MAG+2.',
      paladino:  'Runa de aço sagrado. Fortalece o escudo interno. DEF+2.',
      monge:     'Sulco de chi equilibrado. Corpo e espírito em sintonia. ATQ+1, MAG+1.',
      assassino: 'Corte de sombra. Fio invisível que não perdoa. ATQ+2.',
      arqueiro:  'Entalhe de pontaria. A flecha parte mais firme. ATQ+2.',
      guerreiro: 'Entalhe bruto. A lâmina quer sangue. ATQ+2.',
    },
    descDefault: 'Entalhe básico. Fio da lâmina mais estável.',
    flavor: '"Gravo a runa mais simples — mas não a menos útil."',
    cssClass: 'enchant-d',
  },

  // ── C: Runa cinza-chama ──────────────────────────────────────
  {
    id: 'C',
    label: 'Runa C',
    color: '#a0622a',
    glow: '0 0 10px #a0622a99',
    req: { level: 7 },
    cost: 60,
    bonusDefault: { atk: 3 },
    bonusByClass: {
      mago:      { mag: 3, mp: 10 },
      paladino:  { def: 2, hp: 15 },
      monge:     { atk: 2, mag: 2 },
      assassino: { atk: 3, crit: 4 },
      arqueiro:  { atk: 4 },
      guerreiro: { atk: 3, crit: 3 },
    },
    descByClass: {
      mago:      'Cinza de Clivor fundida no cajado. Mana flui mais rápido. MAG+3, MP+10.',
      paladino:  'Metal bento pela cinza. Resistência sagrada. DEF+2, HP+15.',
      monge:     'Cinza de chi antigo. Força e espírito crescem juntos. ATQ+2, MAG+2.',
      assassino: 'Lâmina enegrecida. Corte certeiro nas brechas. ATQ+3, Crit+4%.',
      arqueiro:  'Ponta de ferro clivado. Mais penetração no impacto. ATQ+4.',
      guerreiro: 'Aço temperado em ira. Golpes pesados e precisos. ATQ+3, Crit+3%.',
    },
    descDefault: 'Metal temperado com cinza de Clivor. ATQ+3.',
    flavor: '"Só faço isso para aventureiros que já provaram algo."',
    cssClass: 'enchant-c',
  },

  // ── B: Runa de cristal ciano ─────────────────────────────────
  {
    id: 'B',
    label: 'Runa B',
    color: '#00e5cc',
    glow: '0 0 14px #00e5ccbb',
    req: { level: 9 },
    cost: 100,
    bonusDefault: { atk: 5 },
    bonusByClass: {
      mago:      { mag: 5, mp: 20 },
      paladino:  { def: 4, hp: 25 },
      monge:     { atk: 3, mag: 3, hp: 10 },
      assassino: { atk: 5, crit: 7 },
      arqueiro:  { atk: 6, crit: 4 },
      guerreiro: { atk: 5, crit: 6 },
    },
    descByClass: {
      mago:      'Cristal ciano fundido no núcleo arcano. Magia potencializada. MAG+5, MP+20.',
      paladino:  'Cristal ciano na borda do escudo. Barreira impenetrável. DEF+4, HP+25.',
      monge:     'Chi ciano circula pelo corpo. Golpes e feitiços amplificados. ATQ+3, MAG+3, HP+10.',
      assassino: 'Cristal ciano na lâmina oculta. Golpe letal nos pontos certos. ATQ+5, Crit+7%.',
      arqueiro:  'Ponta ciana que corta o vento. Precisão de predador. ATQ+6, Crit+4%.',
      guerreiro: 'Aço ciano que vibra na batalha. Fúria canalizada. ATQ+5, Crit+6%.',
    },
    descDefault: 'Traço de cristal ciano. Corte afiado e preciso.',
    flavor: '"Precisa de mãos firmes para gravar isso. E você vai precisar de sorte."',
    cssClass: 'enchant-b',
  },

  // ── A: Runa das Sombras (rara) ───────────────────────────────
  {
    id: 'A',
    label: 'Runa A',
    color: '#e8c840',
    glow: '0 0 18px #e8c840cc',
    req: { dungeonSombras: true },
    cost: 180,
    bonusDefault: { atk: 7, def: 2 },
    bonusByClass: {
      mago:      { mag: 8, mp: 30,  _enchantMagPen: 0.20 },
      paladino:  { def: 6, hp: 40,  _enchantRegen: 0.015 },
      monge:     { atk: 5, mag: 5, hp: 15 },
      assassino: { atk: 8, crit: 12, _enchantShadowMarkEnabled: true },
      arqueiro:  { atk: 9, crit: 8 },
      guerreiro: { atk: 8, crit: 10 },
    },
    descByClass: {
      mago:      'Fragmento das Sombras no cajado. Feitiços ignoram 20% da defesa inimiga. MAG+8, MP+30.',
      paladino:  'Luz sagrada capturada na escuridão. Regenera HP a cada turno do inimigo. DEF+6, HP+40.',
      monge:     'Sombra e chi em equilíbrio perfeito. Poder obscuro e puro. ATQ+5, MAG+5, HP+15.',
      assassino: 'Metal que lembra a escuridão de onde veio. Sem crítico? As sombras marcam o alvo — próximo golpe ignora DEF. ATQ+8, Crit+12%.',
      arqueiro:  'Flecha que segue a sombra do alvo. Dificilmente falha. ATQ+9, Crit+8%.',
      guerreiro: 'Fúria das sombras condensa no aço. Golpe que apaga a luz. ATQ+8, Crit+10%.',
    },
    descDefault: 'Forjada com fragmento das Sombras. Poder sombrio.',
    flavor: '"Esse metal absorveu algo lá dentro. Respeite-o."',
    cssClass: 'enchant-a',
  },

  // ── S: Runa do Kappa (épica) ─────────────────────────────────
  {
    id: 'S',
    label: 'Runa S',
    color: '#ff7700',
    glow: '0 0 22px #ff7700dd',
    req: { dungeonKappa: true },
    cost: 300,
    bonusDefault: { atk: 12, def: 4 },
    bonusByClass: {
      mago:      { mag: 13, mp: 50,  _enchantMagPen: 0.35 },
      paladino:  { def: 10, hp: 60,  _enchantRegen: 0.028 },
      monge:     { atk: 8, mag: 8, hp: 25 },
      assassino: { atk: 13, crit: 18, _enchantShadowMarkEnabled: true },
      arqueiro:  { atk: 14, crit: 12 },
      guerreiro: { atk: 13, crit: 16 },
    },
    descByClass: {
      mago:      'Escama do Kappa imbuída de mana aquática. Feitiços ignoram 35% da defesa inimiga. MAG+13, MP+50.',
      paladino:  'Escama do Kappa forjada na armadura sagrada. Regeneração por turno amplificada. DEF+10, HP+60.',
      monge:     'Chi do Kappa fluindo pelo corpo. Força que vem de dentro e de fora. ATQ+8, MAG+8, HP+25.',
      assassino: 'Escama negra do Kappa. Cada golpe perdido abre a brecha certa — próximo ataque ignora toda DEF. ATQ+13, Crit+18%.',
      arqueiro:  'Escama de Kappa na ponta da flecha. Perfura até couro de dragão. ATQ+14, Crit+12%.',
      guerreiro: 'Aço do Kappa fundido em fúria. O inimigo não se levanta. ATQ+13, Crit+16%.',
    },
    descDefault: 'Escama do Kappa fundida no aço. Poder lendário.',
    flavor: '"Não sabia se conseguia gravar isso. Mas aqui está."',
    cssClass: 'enchant-s',
  },

  // ── S+: Runa Primordial (fusão de 4× S) ─────────────────────
  {
    id: 'S+',
    label: 'Runa S+',
    color: '#ff2266',
    glow: '0 0 26px #ff2266ee',
    req: { fusion: true, fusionId: 'S+' },
    cost: 0,
    bonusDefault: { atk: 18, def: 6 },
    bonusByClass: {
      mago:      { mag: 20, mp: 70,  _enchantMagPen: 0.50 },
      paladino:  { def: 16, hp: 85,  _enchantRegen: 0.042 },
      monge:     { atk: 13, mag: 13, hp: 35 },
      assassino: { atk: 20, crit: 26, _enchantShadowMarkEnabled: true },
      arqueiro:  { atk: 22, crit: 18 },
      guerreiro: { atk: 20, crit: 22 },
    },
    descByClass: {
      mago:      'Quatro escamas do Kappa fundidas em chama primordial. Feitiços ignoram 50% da defesa. MAG+20, MP+70.',
      paladino:  'Luz e trevas forjadas em equilíbrio absoluto. Regeneração máxima por turno. DEF+16, HP+85.',
      monge:     'Chi primordial condensado. Corpo e espírito transcendem o limite mortal. ATQ+13, MAG+13, HP+35.',
      assassino: 'Quatro sombras fundidas em uma só lâmina. Cada golpe encontra o ponto vital. ATQ+20, Crit+26%.',
      arqueiro:  'Flecha que rasga o tecido do espaço. Nada pode bloqueá-la. ATQ+22, Crit+18%.',
      guerreiro: 'Fúria de quatro batalhas condensada no aço. O inimigo não respira depois. ATQ+20, Crit+22%.',
    },
    descDefault: 'Quatro runas S fundidas. Poder primordial — além do que qualquer ferreiro deveria conhecer.',
    flavor: '"Isso... não deveria ser possível. E mesmo assim está aqui."',
    cssClass: 'enchant-splus',
  },

  // ── SS: Runa do Abismo (fusão de 3× S+ + 2 masmorras maiores) ──
  {
    id: 'SS',
    label: 'Runa SS',
    color: '#cc44ff',
    glow: '0 0 28px #cc44ffee',
    req: { fusion: true, fusionId: 'SS' },
    cost: 0,
    bonusDefault: { atk: 28, def: 10 },
    bonusByClass: {
      mago:      { mag: 30, mp: 100, _enchantMagPen: 0.70 },
      paladino:  { def: 24, hp: 120, _enchantRegen: 0.065 },
      monge:     { atk: 20, mag: 20, hp: 50 },
      assassino: { atk: 30, crit: 38, _enchantShadowMarkEnabled: true },
      arqueiro:  { atk: 33, crit: 26 },
      guerreiro: { atk: 30, crit: 32 },
    },
    descByClass: {
      mago:      'O abismo responde à sua voz. Feitiços ignoram 70% da defesa inimiga. MAG+30, MP+100.',
      paladino:  'Luz que consome as trevas e trevas que fortalecem a luz. Regeneração impossível de bloquear. DEF+24, HP+120.',
      monge:     'O chi do universo flui por você. Golpes reescrevem a realidade. ATQ+20, MAG+20, HP+50.',
      assassino: 'A própria morte gravada na lâmina. Não existe defesa contra isso. ATQ+30, Crit+38%.',
      arqueiro:  'A flecha decide onde o destino termina. ATQ+33, Crit+26%.',
      guerreiro: 'O aço que derrubou deuses. Seu inimigo já perdeu. ATQ+30, Crit+32%.',
    },
    descDefault: 'Três runas S+ fundidas com o poder de dois abismos conquistados. Arma além da compreensão mortal.',
    flavor: '"Gozen fecha os olhos por um longo tempo. \'Não grave isso em lâmina normal. Ela não suportaria.\'"',
    cssClass: 'enchant-ss',
  },

  // ── XZ: Proibida ─────────────────────────────────────────────
  {
    id: 'XZ',
    label: 'Runa XZ',
    color: '#111111',
    glow: '0 0 35px #000000ff, 0 0 8px #ffffffaa',
    req: { locked: true },
    cost: 0,
    bonusDefault: {},
    bonusByClass: {},
    descByClass: {},
    descDefault: '??? — Existência proibida.',
    flavor: '"Não pergunte sobre isso."',
    cssClass: 'enchant-xz',
  },
];

// Retorna o bonus correto para a classe atual
function getEnchantBonus(tier) {
  const cls = (G.player.classData && G.player.classData.id) || '';
  return (tier.bonusByClass && tier.bonusByClass[cls]) || tier.bonusDefault || {};
}

// Retorna descrição correta para a classe atual
function getEnchantDesc(tier) {
  const cls = (G.player.classData && G.player.classData.id) || '';
  return (tier.descByClass && tier.descByClass[cls]) || tier.descDefault || '';
}

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
    .weapon-enchant-splus { filter: drop-shadow(0 0 22px #ff2266); animation: enchant-pulse-splus 0.95s ease-in-out infinite; }
    .weapon-enchant-ss { filter: drop-shadow(0 0 24px #cc44ff); animation: enchant-pulse-ss 0.9s ease-in-out infinite; }
    .weapon-enchant-xz { filter: drop-shadow(0 0 30px #ffffff) brightness(0.1); animation: enchant-pulse-xz 0.7s ease-in-out infinite; }

    @keyframes enchant-pulse-b  { 0%,100%{filter:drop-shadow(0 0 8px #00e5cc)}  50%{filter:drop-shadow(0 0 18px #00e5cc)} }
    @keyframes enchant-pulse-a  { 0%,100%{filter:drop-shadow(0 0 10px #e8c840)} 50%{filter:drop-shadow(0 0 22px #e8c840)} }
    @keyframes enchant-pulse-s  { 0%,100%{filter:drop-shadow(0 0 14px #ff7700)} 50%{filter:drop-shadow(0 0 28px #ff7700)} }
    @keyframes enchant-pulse-splus { 0%,100%{filter:drop-shadow(0 0 16px #ff2266)} 50%{filter:drop-shadow(0 0 34px #ff2266)} }
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
    .enchant-badge-splus { color:#ff2266; border-color:#ff226666; background:#1a0010; box-shadow:0 0 14px #ff226655; animation:enchant-pulse-badge-splus 0.95s ease-in-out infinite; }
    .enchant-badge-ss { color:#cc44ff; border-color:#cc44ff66; background:#0d001a; box-shadow:0 0 14px #cc44ff55; animation:enchant-pulse-badge-ss 0.9s ease-in-out infinite; }
    .enchant-badge-xz { color:#fff;    border-color:#ffffff66; background:#000;    box-shadow:0 0 18px #ffffff55; animation:enchant-pulse-badge-xz 0.7s ease-in-out infinite; }

    @keyframes enchant-pulse-badge-s  { 0%,100%{box-shadow:0 0 8px #ff770055}  50%{box-shadow:0 0 18px #ff7700bb} }
    @keyframes enchant-pulse-badge-splus { 0%,100%{box-shadow:0 0 10px #ff226655} 50%{box-shadow:0 0 20px #ff2266bb} }
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
  if (tier.req.fusion) return { ok: false, reason: `Apenas por fusão de runas — fale com Gozen.` };
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

// Abre o popup de segunda tela do Gozen (encantamento/fusão), por cima da cena do vilarejo
function openFerreiroOverlay(title, bodyHtml) {
  const titleEl = document.getElementById('ferreiro-overlay-title');
  const bodyEl  = document.getElementById('ferreiro-overlay-body');
  if (!titleEl || !bodyEl) return;
  titleEl.textContent = title;
  bodyEl.innerHTML = bodyHtml;
  document.getElementById('ferreiro-overlay').classList.add('active');
  bodyEl.scrollTop = 0;
}
window.openFerreiroOverlay = openFerreiroOverlay;

function closeFerreiroOverlay() {
  const ov = document.getElementById('ferreiro-overlay');
  if (ov) ov.classList.remove('active');
}
window.closeFerreiroOverlay = closeFerreiroOverlay;

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

    // bonus text — usa bônus específico da classe
    const bonus = getEnchantBonus(tier);
    const bonusParts = [];
    if (bonus.atk)  bonusParts.push(`ATQ+${bonus.atk}`);
    if (bonus.def)  bonusParts.push(`DEF+${bonus.def}`);
    if (bonus.mag)  bonusParts.push(`MAG+${bonus.mag}`);
    if (bonus.hp)   bonusParts.push(`HP+${bonus.hp}`);
    if (bonus.mp)   bonusParts.push(`MP+${bonus.mp}`);
    if (bonus.crit) bonusParts.push(`Crit+${bonus.crit}%`);
    const bonusText = bonusParts.length ? bonusParts.join(', ') : '???';
    const desc = getEnchantDesc(tier);

    const colorVar = `--ec:${tier.color}; --ec-glow:${tier.color}44;`;

    cardsHTML += `
      <div class="enchant-card ${classes.replace('enchant-card ','')}" style="${colorVar}"
           onclick="enchantSelect('${tier.id}')">
        ${isActive ? `<span class="enchant-active-tag">ATIVA</span>` : ''}
        <div class="enchant-card-header">
          <span class="enchant-card-name" style="color:${tier.color}">${tier.label}</span>
          ${!isLocked ? `<span class="enchant-card-cost">${tier.cost > 0 ? tier.cost+'◈' : '—'}</span>` : ''}
        </div>
        <div class="enchant-card-desc">${desc}</div>
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

  const introHtml = `
    <div id="ferreiro-overlay-intro">
      Gozen coloca os óculos escuros de trabalho e examina a lâmina à luz da forja.<br><br>
      "Runas antigas, gravadas no metal. Cada uma pede um preço — em moedas e em sangue derramado."<br><br>
      ${currentLine}<br>
      Você tem <span class="fo-gold">${p.gold}</span> moedas.
    </div>`;

  openFerreiroOverlay('✨ ENCANTAMENTO DE ARMA', introHtml + cardsHTML);

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

  // Remove bônus do encantamento anterior (usa bônus que foi aplicado para a classe)
  const prevId = p._weaponEnchant || null;
  const prev = prevId ? getEnchantTier(prevId) : null;
  if (prev) {
    const pb = getEnchantBonus(prev);
    if (pb.atk)  p.atk   = Math.max(1, p.atk - pb.atk);
    if (pb.def)  p.def   = Math.max(0, p.def - pb.def);
    if (pb.mag)  p.mag   = Math.max(0, (p.mag || 0) - pb.mag);
    if (pb.hp)  { p.maxHp = Math.max(1, p.maxHp - pb.hp); p.hp = Math.min(p.hp, p.maxHp); }
    if (pb.mp)  { p.maxMp = Math.max(0, (p.maxMp || 0) - pb.mp); if (p.mp !== undefined) p.mp = Math.min(p.mp, p.maxMp); }
    if (pb.crit) p._enchantCrit = Math.max(0, (p._enchantCrit || 0) - pb.crit);
    // Remove efeitos especiais
    if (pb._enchantMagPen)           p._enchantMagPen           = 0;
    if (pb._enchantRegen)            p._enchantRegen            = 0;
    if (pb._enchantShadowMarkEnabled) { p._enchantShadowMarkEnabled = false; p._enchantShadowMark = false; }
    // ♻ Guarda runa anterior como material de fusão
    recycleEnchantToMaterial(prevId);
  }

  // Cobra e aplica novo
  p.gold -= tier.cost;
  p._weaponEnchant = tierId;
  const nb = getEnchantBonus(tier);
  if (nb.atk)  p.atk  += nb.atk;
  if (nb.def)  p.def  += nb.def;
  if (nb.mag)  p.mag   = (p.mag || 0) + nb.mag;
  if (nb.hp)  { p.maxHp += nb.hp; p.hp += nb.hp; }
  if (nb.mp)  { p.maxMp = (p.maxMp || 0) + nb.mp; }
  if (nb.crit) p._enchantCrit = (p._enchantCrit || 0) + nb.crit;
  // Aplica efeitos especiais
  if (nb._enchantMagPen)            p._enchantMagPen            = nb._enchantMagPen;
  if (nb._enchantRegen)             p._enchantRegen             = nb._enchantRegen;
  if (nb._enchantShadowMarkEnabled) p._enchantShadowMarkEnabled = true;

  updateHUD();
  applyWeaponEnchantVisual(tierId);
  notify(`✨ ${tier.label} gravada na arma!`, tier.color || 'gold');
  addLog(`Encantamento ${tier.label} aplicado na arma. (${tier.cost}◈)`, 'loot');

  // Atualiza tela
  storyNode_encantamentos();
}
window.enchantSelect = enchantSelect;

// ─────────────────────────────────────────────────────────────
//  5-B. SISTEMA DE RUNAS COMO ITENS (material de fusão)
// ─────────────────────────────────────────────────────────────
//
//  Runas coletadas ficam em G.player.runasMateriais = { D:0, C:0, B:0, A:0, S:0, 'S+':0, SS:0 }
//  O jogador obtém runas ao comprar (D/C/B) ou ao substituir encantamento por um superior.
//  A fusão consome as runas-material e equipa a nova runa.
//
//  RECEITAS DE FUSÃO:
//    A   = 4× Runa B   (só em masmorra — req.dungeonAny)
//    S   = 2× Runa A   (só em masmorra)
//    S+  = 4× Runa S   (só em masmorra)
//    SS  = 3× Runa S+  + 2 masmorras maiores concluídas
// ─────────────────────────────────────────────────────────────

const FUSION_RECIPES = {
  A: {
    label: 'Runa A',
    color: '#e8c840',
    ingredients: [{ id:'B', qty:4 }],
    reqDungeon: true,   // precisa de qualquer masmorra concluída
    reqDungeonMajor: 0,
    flavorForge: '"Quatro pedaços de cristal ciano... e algo que aprendi no fundo da masmorra. Segure firme."',
  },
  S: {
    label: 'Runa S',
    color: '#ff7700',
    ingredients: [{ id:'A', qty:2 }],
    reqDungeon: true,
    reqDungeonMajor: 0,
    flavorForge: '"Duas sombras fundidas em escama do Kappa. Isso vai queimar — não você, o metal."',
  },
  'S+': {
    label: 'Runa S+',
    color: '#ff2266',
    ingredients: [{ id:'S', qty:4 }],
    reqDungeon: true,
    reqDungeonMajor: 0,
    flavorForge: '"Quatro escamas do Kappa. Eu nunca pensei que alguém me pediria isso." Gozen inspira fundo. "Vai demorar. Volte ao amanhecer."',
  },
  SS: {
    label: 'Runa SS',
    color: '#cc44ff',
    ingredients: [{ id:'S+', qty:3 }],
    reqDungeon: true,
    reqDungeonMajor: 2,
    flavorForge: '"Três runas primordiais... e o peso de dois abismos conquistados." Gozen não sorri. "Isso vai mudar você."',
  },
};

// Retorna o total de masmorras maiores concluídas
function countMajorDungeons() {
  let count = 0;
  if (G.dungeonKappaCleared)   count++;
  if (G.dungeonSombrasCleared) count++;
  // Adicione mais masmorras futuras aqui
  return count;
}

// Verifica se qualquer masmorra foi concluída
function anyDungeonCleared() {
  return !!(G.dungeonKappaCleared || G.dungeonSombrasCleared);
}

// Garante que a estrutura de materiais existe
function ensureRunaMateriais() {
  if (!G.player.runasMateriais) G.player.runasMateriais = {};
  ['D','C','B','A','S','S+','SS'].forEach(id => {
    if (typeof G.player.runasMateriais[id] !== 'number') G.player.runasMateriais[id] = 0;
  });
}

// Adiciona uma runa ao estoque de materiais
function addRunaMaterial(id, qty) {
  ensureRunaMateriais();
  qty = qty || 1;
  G.player.runasMateriais[id] = (G.player.runasMateriais[id] || 0) + qty;
  addLog(`+${qty}× ${id} adicionada ao estoque de runas.`, 'loot');
}
window.addRunaMaterial = addRunaMaterial;

// Quando o jogador substitui um encantamento por um superior, a runa antiga vira material
function recycleEnchantToMaterial(enchantId) {
  if (!enchantId) return;
  ensureRunaMateriais();
  G.player.runasMateriais[enchantId] = (G.player.runasMateriais[enchantId] || 0) + 1;
  notify(`♻ Runa ${enchantId} guardada como material de fusão!`, '#aaa');
  addLog(`Runa ${enchantId} reciclada como material.`, 'loot');
}

// Verifica se pode fundir determinada runa
function checkFusionReq(resultId) {
  const recipe = FUSION_RECIPES[resultId];
  if (!recipe) return { ok: false, reason: 'Receita desconhecida.' };
  ensureRunaMateriais();
  const mat = G.player.runasMateriais;

  // Ingredientes
  for (const ing of recipe.ingredients) {
    const have = mat[ing.id] || 0;
    if (have < ing.qty) {
      return { ok: false, reason: `Faltam runas ${ing.id}: você tem ${have}/${ing.qty}.` };
    }
  }
  // Masmorra qualquer
  if (recipe.reqDungeon && !anyDungeonCleared()) {
    return { ok: false, reason: 'Requer: concluir ao menos uma masmorra.' };
  }
  // Masmorras maiores
  if (recipe.reqDungeonMajor > 0) {
    const major = countMajorDungeons();
    if (major < recipe.reqDungeonMajor) {
      return { ok: false, reason: `Requer ${recipe.reqDungeonMajor} masmorras maiores (você tem ${major}).` };
    }
  }
  return { ok: true };
}

// Executa a fusão de runas
function doRunaFusion(resultId) {
  const recipe = FUSION_RECIPES[resultId];
  if (!recipe) { notify('❌ Receita inválida.', 'red'); return; }
  const check = checkFusionReq(resultId);
  if (!check.ok) { notify(`❌ ${check.reason}`, 'red'); return; }

  ensureRunaMateriais();

  // Guarda encantamento atual como material (se tiver)
  const prev = G.player._weaponEnchant;
  if (prev) {
    // Remove bônus do encantamento anterior
    const prevTier = getEnchantTier(prev);
    if (prevTier) {
      const pb = getEnchantBonus(prevTier);
      if (pb.atk)  G.player.atk   = Math.max(1, G.player.atk - pb.atk);
      if (pb.def)  G.player.def   = Math.max(0, G.player.def - pb.def);
      if (pb.mag)  G.player.mag   = Math.max(0, (G.player.mag||0) - pb.mag);
      if (pb.hp)  { G.player.maxHp = Math.max(1, G.player.maxHp - pb.hp); G.player.hp = Math.min(G.player.hp, G.player.maxHp); }
      if (pb.mp)  { G.player.maxMp = Math.max(0,(G.player.maxMp||0)-pb.mp); if(G.player.mp!==undefined) G.player.mp=Math.min(G.player.mp,G.player.maxMp); }
      if (pb.crit) G.player._enchantCrit = Math.max(0,(G.player._enchantCrit||0)-pb.crit);
      if (pb._enchantMagPen)            G.player._enchantMagPen = 0;
      if (pb._enchantRegen)             G.player._enchantRegen  = 0;
      if (pb._enchantShadowMarkEnabled) { G.player._enchantShadowMarkEnabled = false; G.player._enchantShadowMark = false; }
    }
    recycleEnchantToMaterial(prev);
  }

  // Consome ingredientes
  for (const ing of recipe.ingredients) {
    G.player.runasMateriais[ing.id] -= ing.qty;
  }

  // Equipa nova runa e aplica bônus
  G.player._weaponEnchant = resultId;
  const tier = getEnchantTier(resultId);
  const nb = getEnchantBonus(tier);
  if (nb.atk)  G.player.atk  += nb.atk;
  if (nb.def)  G.player.def  += nb.def;
  if (nb.mag)  G.player.mag   = (G.player.mag||0) + nb.mag;
  if (nb.hp)  { G.player.maxHp += nb.hp; G.player.hp += nb.hp; }
  if (nb.mp)  { G.player.maxMp  = (G.player.maxMp||0) + nb.mp; }
  if (nb.crit) G.player._enchantCrit = (G.player._enchantCrit||0) + nb.crit;
  if (nb._enchantMagPen)            G.player._enchantMagPen            = nb._enchantMagPen;
  if (nb._enchantRegen)             G.player._enchantRegen             = nb._enchantRegen;
  if (nb._enchantShadowMarkEnabled) G.player._enchantShadowMarkEnabled = true;

  updateHUD();
  applyWeaponEnchantVisual(resultId);
  notify(`🔥 ${recipe.label} forjada com sucesso!`, recipe.color || 'gold');
  addLog(`Fusão de Runa: ${recipe.label} equipada.`, 'loot');

  storyNode_fusao_runas();
}
window.doRunaFusion = doRunaFusion;

// ─────────────────────────────────────────────────────────────
//  5-C. TELA DE FUSÃO DE RUNAS (Gozen)
// ─────────────────────────────────────────────────────────────
function storyNode_fusao_runas() {
  ensureRunaMateriais();
  const mat = G.player.runasMateriais;
  const majorCount = countMajorDungeons();
  const hasDungeon = anyDungeonCleared();

  // Cabeçalho — estoque de materiais
  const stockLines = ['D','C','B','A','S','S+','SS'].map(id => {
    const qty = mat[id] || 0;
    const tier = getEnchantTier(id);
    const color = tier ? tier.color : '#888';
    return `<span style="color:${color};font-weight:bold;">${id}</span>: ${qty}`;
  }).join('  ·  ');

  let cardsHTML = `<div style="font-size:0.72rem;font-family:'Noto Sans JP',sans-serif;color:#888;margin-bottom:10px;line-height:2;">📦 Estoque de Runas:<br><span style="font-size:0.78rem;">${stockLines}</span></div>`;
  cardsHTML += `<div style="font-size:0.7rem;color:#666;margin-bottom:8px;">🏯 Masmorras maiores concluídas: <strong style="color:#c8a84a;">${majorCount}</strong></div>`;
  cardsHTML += `<div class="enchant-menu">`;

  Object.entries(FUSION_RECIPES).forEach(([resultId, recipe]) => {
    const check = checkFusionReq(resultId);
    const tier  = getEnchantTier(resultId);
    const isActive = G.player._weaponEnchant === resultId;
    const colorVar = `--ec:${recipe.color}; --ec-glow:${recipe.color}44;`;

    // Ingredientes formatados
    const ingText = recipe.ingredients.map(ing => {
      const have = mat[ing.id] || 0;
      const ok = have >= ing.qty;
      const c  = ok ? '#88c888' : '#c06040';
      return `<span style="color:${c}">${ing.qty}× Runa ${ing.id} (tens ${have})</span>`;
    }).join(' + ');

    // Requisitos extras
    let extraReqs = '';
    if (recipe.reqDungeon) {
      const c = hasDungeon ? '#88c888' : '#c06040';
      extraReqs += `<span style="color:${c}">⚔ 1 masmorra concluída (${hasDungeon ? '✓' : '✗'})</span>  `;
    }
    if (recipe.reqDungeonMajor > 0) {
      const c = majorCount >= recipe.reqDungeonMajor ? '#88c888' : '#c06040';
      extraReqs += `<span style="color:${c}">🏯 ${recipe.reqDungeonMajor} masmorras maiores (tens ${majorCount})</span>`;
    }

    const cardClass = isActive ? 'enchant-card active' : (check.ok ? 'enchant-card' : 'enchant-card unavail');

    cardsHTML += `
      <div class="${cardClass}" style="${colorVar}" ${check.ok && !isActive ? `onclick="doRunaFusion('${resultId}')"` : ''}>
        ${isActive ? `<span class="enchant-active-tag">ATIVA</span>` : ''}
        <div class="enchant-card-header">
          <span class="enchant-card-name" style="color:${recipe.color}">${recipe.label}</span>
        </div>
        <div style="font-size:0.75rem;color:#aaa;margin:3px 0;">${ingText}</div>
        ${extraReqs ? `<div style="font-size:0.72rem;margin-top:2px;">${extraReqs}</div>` : ''}
        ${!check.ok && !isActive ? `<div class="enchant-card-req" style="color:#c06040;">⚠ ${check.reason}</div>` : ''}
        ${check.ok && !isActive ? `<div class="enchant-card-bonus" style="cursor:pointer;">🔥 Toque para fundir</div>` : ''}
        <div class="enchant-card-flavor">${recipe.flavorForge}</div>
      </div>`;
  });

  cardsHTML += '</div>';

  const curTier = G.player._weaponEnchant ? getEnchantTier(G.player._weaponEnchant) : null;
  const curLine = curTier
    ? `Encantamento atual: <span style="color:${curTier.color};font-weight:bold">${curTier.label}</span>`
    : 'Sua arma não possui encantamento.';

  const introHtml = `
    <div id="ferreiro-overlay-intro">
      Gozen abre uma gaveta de ferro que você nunca tinha visto antes. Dentro, moldes antigos gravados em bronze e pedra negra.<br><br>
      "Fusão de runas é diferente de encantamento comum. Você precisa de runas como material — e de ter provado seu valor nas masmorras."<br><br>
      ${curLine}
    </div>`;

  openFerreiroOverlay('🔥 FUSÃO DE RUNAS', introHtml + cardsHTML);
}
window.storyNode_fusao_runas = storyNode_fusao_runas;

// ─────────────────────────────────────────────────────────────
//  5. FERREIRO GOZEN
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
//  GOZEN POPUP — retrato + diálogo + grade de opções
// ─────────────────────────────────────────────────────────────

function openGozenPopup() {
  const cls = (G.player.classData && G.player.classData.id) || '';
  const greetByClass = {
    arqueiro:  `"As pontas das suas flechas são aço, e aço eu entendo." O ferreiro limpa as mãos no avental. "Posso gravar runas e fazer fusões para você."`,
    mago:      `"Não costumo receber feiticeiros aqui." Gozen coça a barba. "Mas runas eu sei gravar — no cajado também."`,
    paladino:  `"Um paladino." Gozen faz aceno respeitoso. "Posso gravar runas sagradas sem apagar a bênção. Confie em mim."`,
    assassino: `Gozen nem levanta os olhos da forja, mas fala baixo: "Adaga das Sombras. Metal negro — reconheço o brilho. Runas de sombra são minha especialidade."`,
  };
  const greeting = greetByClass[cls] || `"Hmm. Você parece alguém que sabe usar uma lâmina — e que vai precisar dela." O ferreiro Gozen limpa as mãos e examina seu equipamento.`;

  const showTutorialHint = !G._tutorialEnchantSeen && !G.player._weaponEnchant && (G.player.level || 1) >= 3;
  const tutorialLine = showTutorialHint
    ? `<div class="gz-tutorial">💡 Nível 3 atingido — grave sua primeira Runa!</div>`
    : '';

  // Monta as opções
  const enchantE = G.player._weaponEnchant;
  const enchantT = enchantE ? getEnchantTier(enchantE) : null;
  const enchantLabel = enchantT ? `Runa Ativa: ${enchantT.label}` : 'Encantamento de Arma';

  ensureRunaMateriais();
  const runasTotal = Object.values(G.player.runasMateriais || {}).reduce((a,b)=>a+b,0);
  const fusaoLocked = (G.player.level || 1) < 2;
  const fusaoLabel  = fusaoLocked
    ? 'Fusão de Runas 🔒'
    : runasTotal > 0 ? `Fusão de Runas (${runasTotal})` : 'Fusão de Runas';

  const opcoes = [
    { icon:'✨', label: enchantLabel,       sub: 'Runas & Encantamentos', action: 'enchant'  },
    { icon:'🔥', label: fusaoLabel,          sub: fusaoLocked ? 'Req. Nível 2' : 'Materiais de Masmorra', action: 'fusao', locked: fusaoLocked },
    { icon:'⚗️', label: 'Craft de Itens',   sub: 'Usar materiais',        action: 'craft'   },
    { icon:'🛒', label: 'Suprimentos',       sub: 'Comprar poções & itens',action: 'loja'    },
    { icon:'💰', label: 'Vender Itens',      sub: 'Bolsa → Moedas',        action: 'vender'  },
    { icon:'↩',  label: 'Sair',             sub: 'Voltar ao vilarejo',     action: 'sair'    },
  ];

  const botoesHTML = opcoes.map(op => `
    <button class="gz-opt${op.locked ? ' gz-locked' : ''}" onclick="gozenOpcao('${op.action}')">
      <span class="gz-opt-icon">${op.icon}</span>
      <span class="gz-opt-label">${op.label}</span>
      <span class="gz-opt-sub">${op.sub}</span>
    </button>`).join('');

  const popup = document.getElementById('gozen-popup');
  if (!popup) return;

  popup.querySelector('#gz-greeting').innerHTML =
    greeting + tutorialLine +
    `<div class="gz-gold">◈ ${G.player.gold} moedas</div>`;
  popup.querySelector('#gz-grid').innerHTML = botoesHTML;
  popup.classList.add('active');
}
window.openGozenPopup = openGozenPopup;

function closeGozenPopup() {
  const popup = document.getElementById('gozen-popup');
  if (popup) popup.classList.remove('active');
}
window.closeGozenPopup = closeGozenPopup;

function gozenOpcao(action) {
  if (action === 'sair') {
    closeGozenPopup();
    storyNode_vilarejo();
    return;
  }
  // Sub-menus abrem dentro do ferreiro-overlay existente;
  // o botão "Voltar" dentro deles chama openGozenPopup() de volta
  closeGozenPopup();
  if (action === 'enchant') {
    G._tutorialEnchantSeen = true;
    storyNode_encantamentos();
  } else if (action === 'fusao') {
    if ((G.player.level || 1) < 2) {
      openFerreiroOverlay('🔥 FUSÃO DE RUNAS',
        `<div id="ferreiro-overlay-intro">
          Gozen balança a cabeça lentamente.<br><br>
          "Fusão de runas... não é algo que ensino a qualquer um. Volte quando tiver mais experiência."<br><br>
          <em style="color:#c06040">Nível mínimo: 2 (você tem ${G.player.level || 1}).</em>
        </div>
        <div style="text-align:center;margin-top:24px">
          <button class="fo-back-btn" onclick="closeFerreiroOverlay();openGozenPopup()">↩ Voltar à ferraria</button>
        </div>`
      );
      return;
    }
    storyNode_fusao_runas();
  } else if (action === 'craft') {
    storyNode_gozen_craft();
  } else if (action === 'loja') {
    storyNode_gozen_loja();
  } else if (action === 'vender') {
    storyNode_gozen_vender();
  }
}
window.gozenOpcao = gozenOpcao;

function storyNode_ferreiro() {
  setScene('vilarejo');
  openGozenPopup();
}

// ─────────────────────────────────────────────────────────────
//  5-D. GOZEN — CRAFT DE ITENS
// ─────────────────────────────────────────────────────────────

const GOZEN_CRAFT = [
  {
    id: 'pocao_ap_p',
    name: 'Essência de Energia',
    icon: '⚡',
    desc: 'Restaura 25 AP em batalha.',
    effect: '+25 AP',
    cost: [ { id:'cinza_espectral', name:'Cinza Espectral', icon:'🌫️', qty:2 }, { id:'erva_cura', name:'Erva Medicinal', icon:'🌿', qty:1 } ],
    result: { id:'pocao_ap_p', name:'Essência de Energia', icon:'⚡', imgSrc:'Imagens/cosméticos/Poção.png', type:'consumível', desc:'Restaura 25 AP.', restoreAP:25 },
  },
  {
    id: 'pocao_ap_m',
    name: 'Elixir de Vigor',
    icon: '⚡',
    desc: 'Restaura 50 AP em batalha.',
    effect: '+50 AP',
    cost: [ { id:'cinza_espectral', name:'Cinza Espectral', icon:'🌫️', qty:3 }, { id:'po_cristal', name:'Pó de Cristal', icon:'💎', qty:2 } ],
    result: { id:'pocao_ap_m', name:'Elixir de Vigor', icon:'⚡', imgSrc:'Imagens/cosméticos/PoçãoM.png', type:'consumível', desc:'Restaura 50 AP.', restoreAP:50 },
  },
  {
    id: 'pocao_ap_g',
    name: 'Essência Ancestral',
    icon: '⚡',
    desc: 'Restaura 100 AP. Usa essência fantasmal.',
    effect: '+100 AP',
    cost: [ { id:'essencia_fantasma', name:'Essência Fantasmal', icon:'💠', qty:2 }, { id:'cinza_espectral', name:'Cinza Espectral', icon:'🌫️', qty:4 } ],
    result: { id:'pocao_ap_g', name:'Essência Ancestral', icon:'⚡', imgSrc:'Imagens/cosméticos/PoçãoG.png', type:'consumível', desc:'Restaura 100 AP.', restoreAP:100 },
  },
  {
    id: 'cristal_mana',
    name: 'Cristal de Mana',
    icon: '💎',
    desc: 'Restaura 40 MP. Pó de cristal purificado.',
    effect: '+40 MP',
    cost: [ { id:'po_cristal', name:'Pó de Cristal', icon:'💎', qty:3 }, { id:'pedra', name:'Pedra', icon:'🪨', qty:1 } ],
    result: { id:'cristal_mana', name:'Cristal de Mana', icon:'💎', imgSrc:'Imagens/cosméticos/MP.png', type:'consumível', desc:'Restaura 40 MP.', restoreMP:40 },
  },
  {
    id: 'pocao_vazio_m',
    name: 'Poção do Vazio',
    icon: '🔮',
    desc: 'Restaura 80 HP. Eco Cristalizado destilado.',
    effect: '+80 HP',
    cost: [ { id:'eco_cristalizado', name:'Eco Cristalizado', icon:'🔮', qty:1 }, { id:'erva_cura', name:'Erva Medicinal', icon:'🌿', qty:3 } ],
    result: { id:'pocao_vazio_m', name:'Poção do Vazio', icon:'🔮', imgSrc:'Imagens/cosméticos/PoçãoM.png', type:'consumível', desc:'Restaura 80 HP.', heal:80 },
  },
  {
    id: 'elixir_sombra',
    name: 'Elixir das Sombras',
    icon: '🌑',
    desc: 'Restaura 60 MP e 30 HP ao mesmo tempo.',
    effect: '+60 MP +30 HP',
    cost: [ { id:'fragmento_sombra', name:'Fragmento de Sombra', icon:'🌑', qty:2 }, { id:'essencia_fantasma', name:'Essência Fantasmal', icon:'💠', qty:1 } ],
    result: { id:'elixir_sombra', name:'Elixir das Sombras', icon:'🌑', imgSrc:'Imagens/cosméticos/aaur.png', type:'consumível', desc:'Restaura 60 MP e 30 HP.', restoreMP:60, heal:30 },
  },
];

function _gozenItemQty(id) {
  return (G.player.inventory || []).filter(i => i.id === id).reduce((s,i) => s + (i.qty||1), 0);
}

function storyNode_gozen_craft() {
  const rows = GOZEN_CRAFT.map(r => {
    const canCraft = r.cost.every(c => _gozenItemQty(c.id) >= c.qty);
    const costHtml = r.cost.map(c => {
      const have = _gozenItemQty(c.id);
      const color = have >= c.qty ? '#80d080' : '#d06060';
      return `<span style="color:${color}">${c.icon}${c.name} ${have}/${c.qty}</span>`;
    }).join(' · ');
    return `
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(200,150,10,${canCraft?'0.35':'0.12'});
        border-radius:8px;padding:10px 12px;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span style="font-family:'Noto Serif JP',serif;font-size:0.85rem;color:${canCraft?'#e0c870':'rgba(200,150,10,0.5)'};">
            ${r.icon} ${r.name}
          </span>
          <span style="font-size:0.7rem;color:#80d4a0;background:rgba(0,100,50,0.2);padding:2px 6px;border-radius:4px;">${r.effect}</span>
        </div>
        <div style="font-size:0.68rem;color:rgba(200,180,140,0.6);margin-bottom:6px;">${r.desc}</div>
        <div style="font-size:0.65rem;margin-bottom:8px;">${costHtml}</div>
        <button onclick="gozenDoCraft('${r.id}')"
          style="width:100%;padding:6px;background:${canCraft?'rgba(150,100,10,0.4)':'rgba(60,60,60,0.3)'};
          border:1px solid rgba(200,150,10,${canCraft?'0.4':'0.1'});color:${canCraft?'#e0c870':'rgba(150,130,80,0.4)'};
          font-family:'Noto Serif JP',serif;font-size:0.72rem;border-radius:5px;cursor:${canCraft?'pointer':'default'};"
          ${canCraft?'':'disabled'}>
          ${canCraft ? '⚗️ Forjar' : '🔒 Sem materiais'}
        </button>
      </div>`;
  }).join('');

  openFerreiroOverlay('⚗️ CRAFT DE ITENS',
    `<div style="font-size:0.72rem;color:rgba(200,150,10,0.6);margin-bottom:12px;">
      "Traga os materiais certos e eu transformo isso em algo útil." — Gozen
    </div>${rows}`
  );
}
window.storyNode_gozen_craft = storyNode_gozen_craft;

function gozenDoCraft(recipeId) {
  const r = GOZEN_CRAFT.find(x => x.id === recipeId);
  if (!r) return;
  const canCraft = r.cost.every(c => _gozenItemQty(c.id) >= c.qty);
  if (!canCraft) { if (typeof notify === 'function') notify('Sem materiais suficientes!', 'red'); return; }

  // Consumir materiais
  r.cost.forEach(c => {
    let rem = c.qty;
    const inv = G.player.inventory;
    for (let i = inv.length - 1; i >= 0 && rem > 0; i--) {
      if (inv[i].id === c.id) {
        const take = Math.min(rem, inv[i].qty || 1);
        inv[i].qty = (inv[i].qty || 1) - take;
        rem -= take;
        if (inv[i].qty <= 0) inv.splice(i, 1);
      }
    }
  });

  // Adicionar resultado
  if (typeof addItem === 'function') addItem(r.result, 1);
  if (typeof notify === 'function') notify(`⚗️ ${r.name} criado!`, 'gold');
  if (typeof updateHUD === 'function') updateHUD();

  // Reabrir tela atualizada
  setTimeout(() => storyNode_gozen_craft(), 300);
}
window.gozenDoCraft = gozenDoCraft;

// ─────────────────────────────────────────────────────────────
//  5-E. GOZEN — LOJA (COMPRAR)
// ─────────────────────────────────────────────────────────────

const GOZEN_LOJA = [
  { id:'erva_cura',   name:'Erva Medicinal', icon:'🌿', price:5,  result:{ id:'erva_cura',   name:'Erva Medicinal', icon:'🌿', imgSrc:'Imagens/cosméticos/erva.png',   type:'consumível', desc:'Recupera 15 HP.', heal:15 } },
  { id:'pocao_p',     name:'Poção Pequena',  icon:'🧪', price:12, result:{ id:'pocao_pequena', name:'Poção Pequena', icon:'🧪', imgSrc:'Imagens/cosméticos/Poção.png',   type:'consumível', desc:'Restaura 25 HP.',  heal:25 } },
  { id:'pocao_m_buy', name:'Poção Média',    icon:'🫙', price:25, result:{ id:'pocao_media',  name:'Poção Média',   icon:'🫙', imgSrc:'Imagens/cosméticos/PoçãoM.png',  type:'consumível', desc:'Restaura 60 HP.',  heal:60 } },
  { id:'pocao_mp_buy',name:'Poção de MP',    icon:'🔵', price:20, result:{ id:'pocao_mp_p',   name:'Poção de MP',   icon:'🔵', imgSrc:'Imagens/cosméticos/MP.png',      type:'consumível', desc:'Restaura 25 MP.',  restoreMP:25 } },
  { id:'pocao_ap_buy',name:'Essência de Energia', icon:'⚡', price:20, result:{ id:'pocao_ap_p', name:'Essência de Energia', icon:'⚡', imgSrc:'Imagens/cosméticos/Poção.png', type:'consumível', desc:'Restaura 25 AP.', restoreAP:25 } },
  { id:'pedra_buy',   name:'Pedra',          icon:'🪨', price:3,  result:{ id:'pedra',       name:'Pedra',         icon:'🪨', imgSrc:'Imagens/pedra.png',              type:'material',   desc:'Material de craft.', weight:0.3 } },
];

function storyNode_gozen_loja() {
  const rows = GOZEN_LOJA.map(item => {
    const canBuy = G.player.gold >= item.price;
    const imgSrc = item.result && item.result.imgSrc ? item.result.imgSrc : null;
    const iconHtml = imgSrc
      ? `<img src="${imgSrc}" style="width:28px;height:28px;object-fit:contain;mix-blend-mode:screen;display:block;"
           onerror="this.outerHTML='<span style=\\'font-size:1.2rem;\\'>${item.icon||'📦'}</span>'">`
      : `<span style="font-size:1.2rem;">${item.icon||'📦'}</span>`;
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;
        background:rgba(255,255,255,0.03);border:1px solid rgba(200,150,10,0.18);
        border-radius:7px;padding:9px 12px;margin-bottom:7px;">
        <div style="display:flex;align-items:center;gap:8px;">
          ${iconHtml}
          <div>
            <div style="font-family:'Noto Serif JP',serif;font-size:0.8rem;color:#e0c870;">${item.name}</div>
            <div style="font-size:0.65rem;color:rgba(200,150,10,0.55);">◈ ${item.price} moedas</div>
          </div>
        </div>
        <button onclick="gozenComprar('${item.id}')"
          style="padding:5px 12px;background:${canBuy?'rgba(150,100,10,0.4)':'rgba(60,60,60,0.3)'};
          border:1px solid rgba(200,150,10,${canBuy?'0.4':'0.1'});color:${canBuy?'#e0c870':'rgba(150,130,80,0.4)'};
          font-family:'Noto Serif JP',serif;font-size:0.7rem;border-radius:5px;cursor:${canBuy?'pointer':'default'};"
          ${canBuy?'':'disabled'}>
          ${canBuy ? 'Comprar' : 'Sem ouro'}
        </button>
      </div>`;
  }).join('');

  openFerreiroOverlay('🛒 SUPRIMENTOS',
    `<div style="font-size:0.72rem;color:rgba(200,150,10,0.6);margin-bottom:12px;">
      Você tem <strong style="color:#e0c870;">◈ ${G.player.gold}</strong> moedas.
    </div>${rows}`
  );
}
window.storyNode_gozen_loja = storyNode_gozen_loja;

function gozenComprar(itemId) {
  const item = GOZEN_LOJA.find(x => x.id === itemId);
  if (!item) return;
  if (G.player.gold < item.price) { if (typeof notify === 'function') notify('Sem ouro suficiente!', 'red'); return; }
  G.player.gold -= item.price;
  if (typeof addItem === 'function') addItem(item.result, 1);
  if (typeof notify === 'function') notify(`🛒 ${item.name} comprado!`, 'gold');
  if (typeof updateHUD === 'function') updateHUD();
  setTimeout(() => storyNode_gozen_loja(), 200);
}
window.gozenComprar = gozenComprar;

// ─────────────────────────────────────────────────────────────
//  5-F. GOZEN — VENDER ITENS
// ─────────────────────────────────────────────────────────────

// Preço de venda por tipo/id
const GOZEN_PRECO_VENDA = {
  // Materiais específicos
  cinza_espectral:  3,
  essencia_fantasma: 12,
  eco_cristalizado: 18,
  fragmento_sombra:  8,
  chave_vazio:       5,
  po_cristal:        4,
  pedra:             1,
  pena_corvo:        3,
  // Por tipo
  material:   2,
  consumível: 5,
};

function _gozenPreco(item) {
  return GOZEN_PRECO_VENDA[item.id] || GOZEN_PRECO_VENDA[item.type] || 1;
}

function storyNode_gozen_vender() {
  const inv = G.player.inventory || [];
  // Apenas materiais e consumíveis não equipados
  const vendaveis = inv.filter(i =>
    (i.type === 'material' || i.type === 'consumível') &&
    !i.equipped && i.id !== 'gadanha_espirito'
  );

  if (vendaveis.length === 0) {
    openFerreiroOverlay('💰 VENDER ITENS',
      `<div style="color:rgba(200,150,10,0.6);font-size:0.8rem;padding:20px 0;text-align:center;">
        "Não tem nada pra vender. Volte quando a bolsa estiver pesada." — Gozen
      </div>
      <button onclick="closeFerreiroOverlay();openGozenPopup()" style="width:100%;padding:8px;margin-top:8px;
        background:rgba(150,100,10,0.3);border:1px solid rgba(200,150,10,0.3);
        color:#e0c870;font-family:'Noto Serif JP',serif;font-size:0.75rem;border-radius:6px;cursor:pointer;">
        ↩ Voltar
      </button>`
    );
    return;
  }

  const totalTudo = vendaveis.reduce((s,i) => s + _gozenPreco(i) * (i.qty||1), 0);

  const rows = vendaveis.map((item, idx) => {
    const preco = _gozenPreco(item);
    const qty   = item.qty || 1;
    // resolve imgSrc via ITEM_DB se o item no inventário não tiver
    const dbEntry = (typeof ITEM_DB !== 'undefined' && ITEM_DB[item.id]) || {};
    const imgSrc  = item.imgSrc || dbEntry.imgSrc || null;
    const iconHtml = imgSrc
      ? `<img src="${imgSrc}" style="width:28px;height:28px;object-fit:contain;mix-blend-mode:screen;display:block;flex-shrink:0;"
           onerror="this.outerHTML='<span style=\\'font-size:1.1rem;line-height:28px;\\'>${item.icon||'📦'}</span>'">`
      : `<span style="font-size:1.1rem;flex-shrink:0;">${item.icon||'📦'}</span>`;
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;
        background:rgba(255,255,255,0.03);border:1px solid rgba(200,150,10,0.15);
        border-radius:7px;padding:8px 10px;margin-bottom:6px;">
        <div style="display:flex;align-items:center;gap:7px;min-width:0;flex:1;">
          ${iconHtml}
          <div style="min-width:0;">
            <div style="font-family:'Noto Serif JP',serif;font-size:0.75rem;color:#e0c870;
              white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.name} ×${qty}</div>
            <div style="font-size:0.62rem;color:rgba(200,150,10,0.5);">◈ ${preco}/un · Total: ${preco*qty}</div>
          </div>
        </div>
        <div style="display:flex;gap:5px;flex-shrink:0;margin-left:8px;">
          ${qty > 1 ? `<button onclick="gozenVender('${item.id}',1)"
            style="padding:4px 8px;background:rgba(100,70,10,0.4);border:1px solid rgba(200,150,10,0.3);
            color:#c8a040;font-size:0.65rem;border-radius:4px;cursor:pointer;font-family:inherit;">
            ×1
          </button>` : ''}
          <button onclick="gozenVender('${item.id}',${qty})"
            style="padding:4px 8px;background:rgba(150,100,10,0.4);border:1px solid rgba(200,150,10,0.4);
            color:#e0c870;font-size:0.65rem;border-radius:4px;cursor:pointer;font-family:inherit;">
            Tudo
          </button>
        </div>
      </div>`;
  }).join('');

  openFerreiroOverlay('💰 VENDER ITENS',
    `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <span style="font-size:0.72rem;color:rgba(200,150,10,0.6);">Você tem <strong style="color:#e0c870;">◈ ${G.player.gold}</strong> moedas.</span>
      <button onclick="gozenVenderTudo()" style="padding:5px 10px;background:rgba(120,80,10,0.5);
        border:1px solid rgba(200,150,10,0.4);color:#e0c870;font-size:0.65rem;
        border-radius:5px;cursor:pointer;font-family:'Noto Serif JP',serif;">
        Vender tudo (◈${totalTudo})
      </button>
    </div>${rows}`
  );
}
window.storyNode_gozen_vender = storyNode_gozen_vender;

function gozenVender(itemId, qty) {
  const inv = G.player.inventory;
  const item = inv.find(i => i.id === itemId && (i.type === 'material' || i.type === 'consumível') && !i.equipped);
  if (!item) return;
  const preco = _gozenPreco(item);
  const vendendo = Math.min(qty, item.qty || 1);
  G.player.gold += preco * vendendo;
  item.qty = (item.qty || 1) - vendendo;
  if (item.qty <= 0) inv.splice(inv.indexOf(item), 1);
  if (typeof notify === 'function') notify(`💰 Vendido: ${item.name} ×${vendendo} → +◈${preco*vendendo}`, 'gold');
  if (typeof updateHUD === 'function') updateHUD();
  setTimeout(() => storyNode_gozen_vender(), 200);
}
window.gozenVender = gozenVender;

function gozenVenderTudo() {
  const inv = G.player.inventory || [];
  const vendaveis = inv.filter(i =>
    (i.type === 'material' || i.type === 'consumível') &&
    !i.equipped && i.id !== 'gadanha_espirito'
  );
  let total = 0;
  vendaveis.forEach(item => {
    total += _gozenPreco(item) * (item.qty || 1);
  });
  // Remover todos da inv
  vendaveis.forEach(item => {
    const idx = G.player.inventory.indexOf(item);
    if (idx !== -1) G.player.inventory.splice(idx, 1);
  });
  G.player.gold += total;
  if (typeof notify === 'function') notify(`💰 Tudo vendido! +◈${total}`, 'gold');
  if (typeof updateHUD === 'function') updateHUD();
  setTimeout(() => storyNode_gozen_vender(), 200);
}
window.gozenVenderTudo = gozenVenderTudo;
// ─────────────────────────────────────────────────────────────

function storyNode_taverna() {
  const rumors = [
    { speaker:'VELHO BÊBADO', text:`"O Senhor das Cinzas... eu o vi. Antes de se tornar um lich, era um rei. Um bom rei. Mas queria vencer a morte — e pagou o preço." Ele ri amargo. "Agora governa um castelo de cinzas e servidores mortos."` },
    { speaker:'VELHO BÊBADO', text:`"Tem gente que voltou do castelo. Poucos. Muito poucos. Todos dizem a mesma coisa — que a voz do Senhor das Cinzas ressoa nas paredes antes mesmo de você ouvi-lo."` },
    { speaker:'VELHO BÊBADO', text:`"As criaturas na floresta ficaram maiores desde que o lich rompeu os selos. Quem o derrotar será lendário... ou estará morto." Ele ri e entorna o sake.` },
  ];
  setScene('taverna');
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
      { icon:'🌑', text:'Falar sobre a Ilha das Sombras', action: storyNode_dungeon_sombras_intro },
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
      { icon:'⚡', text:`Bênção do Vigor (20◈ — recurso completo)`, action: () => {
          if (G.player.gold < 20) { notify('◈ Sem moedas!', 'red'); return; }
          G.player.gold -= 20;
          const _iw = window.CLASSES && window.CLASSES.filter(c=>c.resource==='ap').map(c=>c.id).includes(G.player.class);
          if (_iw && G.player.maxAp > 0) G.player.ap = G.player.maxAp;
          if (!_iw && G.player.maxMp > 0) G.player.mp = G.player.maxMp;
          updateHUD(); notify(_iw ? '⚡ Bênção do Vigor: AP restaurado!' : '⚡ Bênção do Vigor: MP restaurado!', 'gold');
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
  const _mitsueImg = 'Imagens/personagens/DMitsue.png';
  const _isWarrior = window.CLASSES && window.CLASSES.filter(c=>c.resource==='ap').map(c=>c.id).includes(p.class);
  const _resLabel  = _isWarrior ? 'HP/AP cheios' : 'HP/MP cheios';
  const _resMsg    = _isWarrior ? 'HP e AP totalmente restaurados.' : 'HP e MP totalmente restaurados.';
  const _notifMsg  = _isWarrior ? '🛏️ Descansou na estalagem: HP/AP restaurados!' : '🛏️ Descansou na estalagem: HP/MP restaurados!';
  setStory('DONA MITSUE',
    `A estalagem cheira a lenha e ervas secas. Dona Mitsue levanta os olhos do seu bordado e te observa com calma.\n\n"Precisa descansar? Tenho um quarto limpo e caldo quente."\n\nVocê tem ${p.gold} moedas.`,
    [
      { icon:'🛏️', text:`Descanso completo (${healCost}◈ — ${_resLabel})`, action: () => {
          if (p.gold < healCost) { notify('◈ Sem moedas!', 'red'); return; }
          p.gold -= healCost;
          p.hp = p.maxHp;
          if (_isWarrior && p.maxAp > 0) p.ap = p.maxAp;
          if (!_isWarrior && p.maxMp > 0) p.mp = p.maxMp;
          updateHUD();
          notify(_notifMsg, 'green');
          addLog(`Descansou na estalagem de Dona Mitsue: recuperação total.`, 'heal');
          setStory('DONA MITSUE',
            `"Dormiu bem?" Mitsue sorri enquanto serve um chá. "Descansado, o caminho parece mais curto."\n\n${_resMsg}`,
            [{ icon:'🏘️', text:'Voltar ao vilarejo', action: storyNode_vilarejo }],
            _mitsueImg
          );
      }},
      { icon:'💬', text:'"Me conte sobre o vilarejo..."', action: () => {
          setStory('DONA MITSUE',
            `Mitsue deposita o bordado com cuidado.\n\n"Pedra Branca foi fundada há três séculos por refugiados do leste. O nome vem das pedras brancas do rio que ainda corre atrás do templo."\n\nEla faz uma pausa. "Desde que o Senhor das Cinzas acordou no castelo ao norte, as coisas mudaram. As crianças não brincam mais à noite. Os fazendeiros dormem com ferramentas ao lado."\n\nSua voz fica mais suave: "Mas as pessoas aqui são fortes. Sempre foram."`,
            [{ icon:'↩', text:'Voltar à estalagem', action: storyNode_estalagem }],
            _mitsueImg
          );
      }},
      { icon:'↩', text:'Sair da estalagem', action: storyNode_vilarejo },
    ],
    _mitsueImg
  );
}

// ─────────────────────────────────────────────────────────────
//  10. TORRE DAS MASMORRAS
//      Hub com as 6 masmorras do jogo. Cada masmorra se registra
//      aqui a partir do seu próprio arquivo (ex.: templo_vazio_ecoante.js
//      chama registerDungeon({...}) com ordem:1).
//      Slots sem masmorra registrada aparecem bloqueados ("Em breve").
// ─────────────────────────────────────────────────────────────

const TOTAL_MASMORRAS_TORRE = 6;

window.DUNGEON_TOWER_REGISTRY = window.DUNGEON_TOWER_REGISTRY || [];

function registerDungeon(cfg) {
  // Evita duplicar caso o arquivo da masmorra seja recarregado.
  window.DUNGEON_TOWER_REGISTRY = window.DUNGEON_TOWER_REGISTRY.filter(d => d.id !== cfg.id);
  window.DUNGEON_TOWER_REGISTRY.push(cfg);
}
window.registerDungeon = registerDungeon;

// Chamado pelo botão "Entrar na Masmorra" de cada card.
function entrarMasmorraTorre(id) {
  const dungeon = window.DUNGEON_TOWER_REGISTRY.find(d => d.id === id);
  if (dungeon && typeof dungeon.entrar === 'function') dungeon.entrar();
}
window.entrarMasmorraTorre = entrarMasmorraTorre;

// Injeta CSS dos cards da torre dinamicamente (uma vez)
(function injectDungeonTowerCSS() {
  if (document.getElementById('dungeon-tower-style')) return;
  const style = document.createElement('style');
  style.id = 'dungeon-tower-style';
  style.textContent = `
    .dungeon-tower-list   { display:flex; flex-direction:column; gap:10px; margin-top:14px; }
    .dungeon-tower-card   {
      border-radius:8px;
      border:1px solid rgba(200,150,10,0.35);
      background:linear-gradient(135deg, rgba(20,14,8,0.92), rgba(8,6,3,0.96));
      padding:10px;
      box-shadow:0 0 10px rgba(200,150,10,0.08);
    }
    .dungeon-tower-card.locked {
      border-color:#2c2c2c;
      background:#0d0d0d;
      opacity:0.62;
    }
    .dungeon-tower-top    { display:flex; gap:10px; align-items:flex-start; }
    .dungeon-tower-visual {
      flex-shrink:0; width:56px; height:56px; border-radius:6px;
      border:1px solid rgba(200,150,10,0.5);
      background:radial-gradient(circle at center, rgba(40,20,10,0.9), rgba(5,3,1,0.95));
      display:flex; align-items:center; justify-content:center;
      overflow:hidden; box-shadow:inset 0 0 10px rgba(0,0,0,0.6);
    }
    .dungeon-tower-visual img    { width:100%; height:100%; object-fit:cover; }
    .dungeon-tower-visual.locked { border-color:#3a3a3a; background:#111; }
    .dungeon-tower-lock   { font-size:1.3rem; color:#555; }
    .dungeon-tower-info   { flex:1; min-width:0; }
    .dungeon-tower-name   { font-family:'Noto Serif JP',serif; font-size:0.82rem; font-weight:700; color:var(--gold2); letter-spacing:0.5px; }
    .dungeon-tower-badge  { font-family:'Noto Sans JP',sans-serif; font-size:0.6rem; color:#888; letter-spacing:1px; text-transform:uppercase; margin:2px 0 4px; }
    .dungeon-tower-desc   { font-family:'Noto Sans JP',sans-serif; font-size:0.7rem; color:#aaa; line-height:1.5; }
    .dungeon-tower-enter-btn {
      width:100%; margin-top:9px; background:rgba(200,150,10,0.1);
      border:1px solid rgba(200,150,10,0.5); color:var(--gold2);
      font-family:'Noto Serif JP',serif; font-size:0.72rem; letter-spacing:1px;
      padding:7px 0; border-radius:5px; cursor:pointer; transition:all 0.18s;
    }
    .dungeon-tower-enter-btn:hover  { background:rgba(200,150,10,0.22); box-shadow:0 0 10px rgba(200,150,10,0.3); }
    .dungeon-tower-enter-btn.locked { background:#111; border-color:#333; color:#555; cursor:not-allowed; }
  `;
  document.head.appendChild(style);
})();

// ── Event delegation: captura cliques nos cards e botões da Torre ──
// Listener no overlay dedicado (não no story-text) — compatível com WebViews Android.
(function _setupDungeonCardDelegation() {
  function _attachDelegation() {
    const body = document.getElementById('torre-overlay-body');
    if (!body) { setTimeout(_attachDelegation, 200); return; }

    body.addEventListener('click', function(e) {
      const btn  = e.target.closest('[data-dungeon-open]');
      const card = e.target.closest('[data-dungeon-card]');
      const id   = (btn || card)
        ? ((btn || card).dataset.dungeonOpen || (btn || card).dataset.dungeonCard)
        : null;
      if (id) { e.stopPropagation(); openDungeonPopup(id); }
    });

    // Popup de detalhe: fecha backdrop ao tocar fora do painel
    const backdrop = document.getElementById('dungeon-popup-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', function(e) {
        if (e.target === backdrop) closeDungeonPopup();
      });
    }
    const closeBtn = document.getElementById('dungeon-popup-close');
    if (closeBtn) closeBtn.addEventListener('click', closeDungeonPopup);

    // Botão fechar overlay da Torre
    const torrebtn = document.getElementById('torre-overlay-close');
    if (torrebtn) torrebtn.addEventListener('click', closeTorreOverlay);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _attachDelegation);
  } else {
    _attachDelegation();
  }
})();

function openTorreOverlay() {
  const overlay = document.getElementById('torre-overlay');
  const body    = document.getElementById('torre-overlay-body');
  if (!overlay || !body) return;

  // Re-registra masmorras com status dinâmico (pode ter mudado após conclusão)
  if (typeof window._reregisterDungeons === 'function') window._reregisterDungeons();

  // Monta os cards
  let html = `<div class="torre-intro">Pedras negras cobertas de musgo. Uma porta de ferro enferrujada, mais antiga que o resto do vilarejo.<br>Dentro, seis passagens levam a masmorras esquecidas — cada uma escondendo tesouros, criaturas e segredos que não deveriam existir.</div>`;
  html += `<div class="dungeon-tower-list">`;
  for (let i = 1; i <= TOTAL_MASMORRAS_TORRE; i++) {
    const dungeon = window.DUNGEON_TOWER_REGISTRY.find(d => d.ordem === i);
    html += _dungeonTowerCardHTML(dungeon, i);
  }
  html += `</div>`;

  body.innerHTML = html;
  body.scrollTop = 0;
  overlay.classList.add('active');
}
window.openTorreOverlay = openTorreOverlay;

function closeTorreOverlay() {
  const overlay = document.getElementById('torre-overlay');
  if (overlay) overlay.classList.remove('active');
}
window.closeTorreOverlay = closeTorreOverlay;

// ── Popup de Masmorra ──────────────────────────────────────
function openDungeonPopup(id) {
  const dungeon = window.DUNGEON_TOWER_REGISTRY.find(d => d.id === id);
  if (!dungeon) return;

  const backdrop = document.getElementById('dungeon-popup-backdrop');
  const iconImg  = document.getElementById('dp-icon-img');
  const iconPh   = document.getElementById('dp-icon-placeholder');
  const orderEl  = document.getElementById('dp-order');
  const nameEl   = document.getElementById('dp-name');
  const descEl   = document.getElementById('dp-desc');
  const statsEl  = document.getElementById('dp-stats');
  const enterBtn = document.getElementById('dp-enter-btn');
  if (!backdrop) return;

  // Ícone
  iconImg.src = dungeon.bossIcon || '';
  iconImg.style.display = '';
  iconPh.style.display = 'none';
  iconImg.onerror = () => { iconImg.style.display='none'; iconPh.style.display='flex'; };

  // Textos
  orderEl.textContent = `Masmorra ${dungeon.ordem} de ${TOTAL_MASMORRAS_TORRE}`;
  nameEl.textContent  = dungeon.nome;
  descEl.textContent  = dungeon.descricao;

  // Stats grid
  const stats = dungeon.stats || [];
  if (stats.length > 0) {
    statsEl.innerHTML = stats.map(s => `
      <div class="dp-stat">
        <div class="dp-stat-label">${s.label}</div>
        <div class="dp-stat-value">${s.value}</div>
      </div>`).join('');
    statsEl.style.display = '';
  } else {
    statsEl.innerHTML = '';
    statsEl.style.display = 'none';
  }

  // Botão entrar — usa .onclick (JS property, funciona em qualquer WebView)
  const locked    = dungeon.status === 'em_construcao';
  const bloqueada = dungeon.status === 'bloqueada';
  const inacessivel = locked || bloqueada;
  enterBtn.className = 'dp-enter-btn' + (inacessivel ? ' dp-locked' : '');
  enterBtn.textContent = locked ? '🔒 Em construção...' : bloqueada ? '🔒 Conclua a masmorra anterior' : '🗝️ ENTRAR NA MASMORRA';
  enterBtn.onclick = inacessivel ? null : () => { closeDungeonPopup(); entrarMasmorraTorre(id); };

  const panel = document.getElementById('dungeon-popup-panel');
  if (panel) panel.scrollTop = 0;
  backdrop.classList.add('active');
}
window.openDungeonPopup = openDungeonPopup;

function closeDungeonPopup() {
  const backdrop = document.getElementById('dungeon-popup-backdrop');
  if (backdrop) backdrop.classList.remove('active');
}
window.closeDungeonPopup = closeDungeonPopup;

// ── Cards da Torre ─────────────────────────────────────────
// Usa data-dungeon-card / data-dungeon-open ao invés de onclick inline
function _dungeonTowerCardHTML(dungeon, ordem) {
  if (!dungeon) {
    return `
      <div class="dungeon-tower-card locked">
        <div class="dungeon-tower-top">
          <div class="dungeon-tower-visual locked"><span class="dungeon-tower-lock">🔒</span></div>
          <div class="dungeon-tower-info">
            <div class="dungeon-tower-name">Masmorra Desconhecida</div>
            <div class="dungeon-tower-badge">Masmorra ${ordem} de ${TOTAL_MASMORRAS_TORRE}</div>
            <div class="dungeon-tower-desc">Os caminhos além ainda estão envoltos em névoa. Volte mais tarde.</div>
          </div>
        </div>
        <button class="dungeon-tower-enter-btn locked" disabled>🔒 Em breve</button>
      </div>`;
  }
  const locked      = dungeon.status === 'em_construcao';
  const bloqueada   = dungeon.status === 'bloqueada';
  const inacessivel = locked || bloqueada;
  return `
    <div class="dungeon-tower-card${inacessivel ? ' locked' : ''}" style="cursor:${inacessivel ? 'default' : 'pointer'}" ${inacessivel ? '' : `data-dungeon-card="${dungeon.id}"`}>
      <div class="dungeon-tower-top">
        <div class="dungeon-tower-visual${inacessivel ? ' locked' : ''}" style="position:relative;">
          <img src="${dungeon.bossIcon}" alt="${dungeon.bossNome || dungeon.nome}" style="width:100%;height:100%;object-fit:cover;${inacessivel ? 'filter:brightness(0.3) grayscale(0.8);' : ''}">
          ${inacessivel ? '<span class="dungeon-tower-lock" style="position:absolute;font-size:1.3rem;">🔒</span>' : ''}
        </div>
        <div class="dungeon-tower-info">
          <div class="dungeon-tower-name">${inacessivel ? (bloqueada ? dungeon.nome : 'Masmorra Bloqueada') : dungeon.nome}</div>
          <div class="dungeon-tower-badge">Masmorra ${ordem} de ${TOTAL_MASMORRAS_TORRE}</div>
          <div class="dungeon-tower-desc">${dungeon.descricao}</div>
        </div>
      </div>
      <button class="dungeon-tower-enter-btn${inacessivel ? ' locked' : ''}" ${inacessivel ? 'disabled' : `data-dungeon-open="${dungeon.id}"`}>
        ${locked ? '🔒 Em construção...' : bloqueada ? '🔒 Conclua a masmorra anterior' : '🗝️ Ver Masmorra'}
      </button>
    </div>`;
}

function storyNode_torre() {
  setScene('vilarejo');
  hideEnemy();
  openTorreOverlay();
}
