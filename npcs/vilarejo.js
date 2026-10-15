// =============================================================
//  VILAREJO.JS — Chronicles of Clivor
//  Vilarejo da Pedra Branca: reputação, horários e todos os locais
//  Depende de: palDinh.js (G, setScene, setStory, hideEnemy,
//              notify, addLog, updateHUD, addItem,
//              storyNode_floresta, storyNode_explorar)
// =============================================================

'use strict';

// ─────────────────────────────────────────────────────────────
//  1. SISTEMA DE REPUTAÇÃO — MÉRITO DO VILAREJO
//     Cresce derrotando inimigos, completando missões e ajudando
//     o povo. Cada nível dá desconto nas compras do Gozen, bônus
//     nas vendas/recompensas, e desbloqueia uma cena de
//     reconhecimento (mostrada uma única vez, na próxima visita
//     ao vilarejo).
// ─────────────────────────────────────────────────────────────

const REP_TIERS = [
  { id:'hostil',     min:-100, label:'Hostil',           icon:'😠', desconto:0,  bonus:0,  color:'#c04030' },
  { id:'neutro',     min:-30,  label:'Neutro',            icon:'😐', desconto:0,  bonus:0,  color:'rgba(200,150,10,0.6)' },
  { id:'conhecido',  min:50,   label:'Conhecido',         icon:'🙂', desconto:5,  bonus:5,  color:'#8ab0d0' },
  { id:'respeitado', min:150,  label:'Respeitado',        icon:'⭐', desconto:10, bonus:10, color:'#90b870' },
  { id:'admirado',   min:300,  label:'Admirado',          icon:'🤝', desconto:15, bonus:15, color:'#c8a840' },
  { id:'heroi',      min:450,  label:'Herói do Vilarejo', icon:'🛡️', desconto:20, bonus:20, color:'#e08040' },
  { id:'lendario',   min:600,  label:'Lendário',          icon:'👑', desconto:30, bonus:30, color:'#f0c040' },
];

function getRepTierIndex() {
  const r = G.reputation || 0;
  let idx = 0;
  REP_TIERS.forEach((t, i) => { if (r >= t.min) idx = i; });
  return idx;
}

function getRepTier() {
  return REP_TIERS[getRepTierIndex()];
}

// % de desconto nas compras do ferreiro/mercado
function getRepDesconto() { return getRepTier().desconto || 0; }
// % de bônus em vendas e recompensas de batalha
function getRepBonusRecompensa() { return getRepTier().bonus || 0; }

function addReputation(amount, reason) {
  const tierAntesIdx = getRepTierIndex();
  G.reputation = Math.max(-100, Math.min(999, (G.reputation || 0) + amount));
  const tier = getRepTier();
  if (amount > 0) notify(`⭐ Mérito +${amount} — ${reason}`, 'gold');
  else if (amount < 0) notify(`💔 Mérito ${amount} — ${reason}`, 'red');
  addLog(`Mérito do vilarejo ${amount > 0 ? '+' : ''}${amount}: ${reason} (${tier.label})`, amount >= 0 ? 'xp' : 'dmg');

  if (typeof updateHUD === 'function') updateHUD();

  const tierDepoisIdx = getRepTierIndex();
  if (tierDepoisIdx > tierAntesIdx) {
    notify(`${tier.icon} O povo de Pedra Branca agora te vê como: ${tier.label}!`, 'gold');
    if (!G._repTiersVistos) G._repTiersVistos = {};
    if (!G._repTiersVistos[tier.id]) {
      // Marca pra mostrar a cena de reconhecimento na próxima visita ao vilarejo.
      G._repTiersVistos[tier.id] = true;
      G._repMilestonePendente = tier.id;
    }
  }
}

// Ponto de entrada para outros sistemas (ex.: quest_system.js) darem
// mérito ao concluir uma missão do Quadro de Gozen.
function reputationAddQuestReward(amount, reason) {
  addReputation(amount, reason || 'Missão concluída');
}
window.reputationAddQuestReward = reputationAddQuestReward;

// Pequena cena de reconhecimento do povo, mostrada uma vez por marco.
function reputationMilestoneScene(tierId, onDone) {
  // Sincroniza a cena com o vilarejo — sem isso, o cabeçalho/cenário fica
  // travado em qualquer local anterior (ex.: taverna) enquanto o diálogo
  // já mostra outro conteúdo, causando o descompasso título × texto.
  if (typeof setScene === 'function') setScene('vilarejo');
  if (typeof hideEnemy === 'function') hideEnemy();
  const cenas = {
    conhecido: {
      npc: 'MORADORA', img: null,
      txt: `Uma moradora te reconhece na rua e sorri de leve.\n\n"Ei, é você... já ouvi falarem do seu nome por aqui."`,
    },
    respeitado: {
      npc: 'DONA MITSUE', img: 'Imagens/personagens/DMitsue.png',
      txt: `Mitsue serve seu chá com um sorriso maior que o de costume.\n\n"O povo anda falando bem de você, sabia? Estão começando a acreditar que talvez a gente saia dessa."`,
    },
    admirado: {
      npc: 'GOZEN', img: null,
      txt: `Gozen te encara por cima da forja e faz um aceno de respeito — coisa rara nele.\n\n"Você tem feito por merecer, viajante. Poucos aqui duvidam de você agora."`,
    },
    heroi: {
      npc: 'NARRADOR', img: null,
      txt: `Crianças correm para te ver passar. Um fazendeiro larga a enxada só para te cumprimentar.\n\n"É ele! O guardião de Pedra Branca!"\n\nPela primeira vez, você sente que o vilarejo inteiro acredita que você vai salvá-los.`,
    },
    lendario: {
      npc: 'NARRADOR', img: null,
      txt: `O nome de Pedra Branca já não fala mais só do vilarejo — fala de você. Em cada porta, em cada conversa, seu nome é dito com esperança.\n\n"Se alguém pode enfrentar o Senhor das Cinzas... é essa pessoa."\n\nVocê se tornou uma lenda viva entre o povo que jurou proteger.`,
    },
  };
  const cena = cenas[tierId];
  if (!cena) { onDone(); return; }
  setStory(cena.npc, cena.txt, [{ icon:'↩', text:'Continuar', action: onDone }], cena.img);
}

// Popup do HUD com progresso e a lista completa de níveis de mérito.
function reputationShowPopup() {
  const old = document.getElementById('reputacao-popup');
  if (old) old.remove();

  const r = G.reputation || 0;
  const idxAtual   = getRepTierIndex();
  const tierAtual  = REP_TIERS[idxAtual];
  const proxTier   = REP_TIERS[idxAtual + 1] || null;
  const pct = proxTier
    ? Math.max(0, Math.min(100, ((r - tierAtual.min) / (proxTier.min - tierAtual.min)) * 100))
    : 100;

  const linhasTiers = REP_TIERS.map((t, i) => {
    const atual      = i === idxAtual;
    const alcancado  = i <= idxAtual;
    return `
      <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;margin-bottom:4px;
        background:${atual ? 'rgba(240,192,64,0.12)' : 'transparent'};
        border:1px solid ${atual ? 'rgba(240,192,64,0.4)' : 'rgba(255,255,255,0.06)'};">
        <span style="font-size:1.1rem;opacity:${alcancado ? 1 : 0.35};">${t.icon}</span>
        <div style="flex:1;">
          <div style="font-size:0.72rem;color:${alcancado ? t.color : 'rgba(242,232,208,0.4)'};font-weight:${atual ? 700 : 400};">${t.label}</div>
          <div style="font-size:0.56rem;color:rgba(242,232,208,0.45);">${t.desconto}% desconto em compras · +${t.bonus}% em vendas/recompensas</div>
        </div>
        ${atual ? '<span style="font-size:0.55rem;color:#f0c040;">VOCÊ</span>' : ''}
      </div>
    `;
  }).join('');

  const overlay = document.createElement('div');
  overlay.id = 'reputacao-popup';
  overlay.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;
    background:rgba(0,0,0,0.72);display:flex;align-items:center;justify-content:center;padding:16px;
  `;
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML = `
    <div style="background:#0e0a05;border:1px solid rgba(240,192,64,0.4);border-top:3px solid #f0c040;
                width:100%;max-width:340px;max-height:88vh;overflow-y:auto;font-family:'Noto Serif JP',serif;color:var(--gold2);
                border-radius:2px;">
      <div style="padding:6px 14px;background:rgba(240,192,64,0.1);border-bottom:1px solid rgba(240,192,64,0.2);
                  font-family:'Noto Sans JP',sans-serif;font-size:0.52rem;letter-spacing:4px;color:#f0c040;">
        MÉRITO DO VILAREJO
      </div>
      <div style="padding:16px 14px;">
        <div style="text-align:center;margin-bottom:12px;">
          <div style="font-size:1.6rem;">${tierAtual.icon}</div>
          <div style="font-size:1rem;font-weight:700;color:${tierAtual.color};margin-top:4px;">${tierAtual.label}</div>
          <div style="font-size:0.62rem;color:rgba(242,232,208,0.5);margin-top:2px;">${r} pontos de mérito</div>
        </div>

        ${proxTier ? `
        <div style="font-size:0.55rem;letter-spacing:1px;color:rgba(240,192,64,0.7);margin-bottom:4px;">PRÓXIMO NÍVEL: ${proxTier.label}</div>
        <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(240,192,64,0.25);height:9px;border-radius:5px;overflow:hidden;margin-bottom:4px;">
          <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#8a6a10,#f0c040);"></div>
        </div>
        <div style="font-size:0.62rem;color:rgba(242,232,208,0.55);text-align:center;margin-bottom:14px;">${r} / ${proxTier.min} pts</div>
        ` : `<div style="text-align:center;color:#f0c040;font-size:0.7rem;margin-bottom:14px;">Mérito máximo alcançado!</div>`}

        <div style="font-size:0.58rem;letter-spacing:1px;color:rgba(240,192,64,0.7);margin-bottom:8px;">COMO GANHAR MÉRITO</div>
        <div style="font-size:0.65rem;color:rgba(242,232,208,0.6);line-height:1.5;margin-bottom:14px;">
          Derrote inimigos, complete missões do Quadro de Gozen e ajude os moradores de Pedra Branca.
        </div>

        <div style="font-size:0.58rem;letter-spacing:1px;color:rgba(240,192,64,0.7);margin-bottom:6px;">NÍVEIS E RECOMPENSAS</div>
        ${linhasTiers}

        <div style="text-align:center;margin-top:12px;">
          <button id="_rep_popup_close" style="
            font-family:'Noto Serif JP',serif;font-size:0.7rem;letter-spacing:1px;
            padding:9px 22px;border:1px solid rgba(240,192,64,0.4);background:rgba(110,80,10,0.15);
            color:#f0c040;cursor:pointer;">Fechar</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const closeBtn = document.getElementById('_rep_popup_close');
  if (closeBtn) closeBtn.onclick = () => overlay.remove();
}
window.reputationShowPopup = reputationShowPopup;
window.getRepTier = getRepTier;
window.getRepDesconto = getRepDesconto;
window.getRepBonusRecompensa = getRepBonusRecompensa;

// ─────────────────────────────────────────────────────────────
//  2. SISTEMA DE HORÁRIO
// ─────────────────────────────────────────────────────────────

const LOCATION_SCHEDULE = {
  estalagem: { alwaysOpen: true },
  taverna:   { alwaysOpen: true },
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

  // ── Marco de mérito pendente: mostra a cena de reconhecimento uma única vez ──
  if (G._repMilestonePendente) {
    const tierId = G._repMilestonePendente;
    G._repMilestonePendente = null;
    reputationMilestoneScene(tierId, storyNode_vilarejo);
    return;
  }

  // ── Cutscene do Taberneiro pós-Dungeon das Sombras (uma vez, ao reentrar no vilarejo) ──
  if (G.dungeonSombrasConcluida && !G._cutscenePosSombrasVista) {
    storyNode_vilarejo_festa_pos_sombras();
    return;
  }

  // ── Limpar buffs da Divina Trindade ao retornar ao vilarejo ──
  _trindadeClearBuffs();

  setScene('vilarejo');
  hideEnemy();

  // Atualiza estado visual do pin do Templo
  setTimeout(updateTemploPin, 50);

  const tier = getRepTier();
  const repLine = `\n\n★ Mérito com o povo: ${tier.icon} ${tier.label} (${G.reputation || 0} pts)`;
  const castleKills = G.castle ? G.castle.enemiesKilled : 0;

  let vilText;
  if (castleKills >= 12) {
    vilText = `O Vilarejo da Pedra Branca celebra em voz baixa. As criaturas corrompidas pararam de atacar as fazendas, e pela primeira vez em meses ninguém tranca a porta antes do anoitecer.\n\nO velho ferreiro levanta a cabeça quando te vê, o martelo parado no ar. "Você foi lá fundo, não foi? Dá pra ver nos seus olhos."`;
  } else if (castleKills >= 4) {
    vilText = `O Vilarejo da Pedra Branca respira um pouco mais aliviado — os ataques das criaturas diminuíram, mas ninguém baixa a guarda de verdade.\n\nA sacerdotisa do Templo acena quando te vê passar. "Continue, viajante. Cada guardião derrubado enfraquece o Senhor das Cinzas — mesmo que ele ainda não saiba disso."`;
  } else {
    vilText = `O Vilarejo da Pedra Branca pulsa com vida tensa. Ferreiros batem martelos com mais pressa que o normal, e as crianças são recolhidas cedo, antes que o sol se esconda de vez.\n\nUm aviso pregado na parede do poço, a tinta ainda fresca: "RECOMPENSA — Quem enfrentar o Castelo Maldito ao norte receberá honras e ouro."`;
  }

  setStory('NARRADOR', vilText + repLine, [
    { icon:'🌲', text:'Voltar à floresta', action: storyNode_floresta },
  ]);
}

// ─────────────────────────────────────────────────────────────
//  3-B. CUTSCENE — TABERNEIRO PÓS-DUNGEON DAS SOMBRAS
//  Ao reentrar no vilarejo após concluir a Dungeon das Sombras, o
//  jogador é recebido por uma festa e teleportado direto para a
//  taverna, onde o taberneiro revela que tudo foi um teste e
//  entrega um mapa ligando Clivor à Cidade das Pedra.
// ─────────────────────────────────────────────────────────────

function storyNode_vilarejo_festa_pos_sombras() {
  setScene('vilarejo');
  hideEnemy();
  setStory('NARRADOR',
    `Você entra no Vilarejo da Pedra Branca e algo é diferente.\n\nLanternas de papel penduradas entre as casas, uma fogueira acesa na praça, crianças correndo com bandeiras improvisadas. As pessoas param o que fazem para te aplaudir — alguns curvam a cabeça, outros apenas sorriem, aliviados.\n\n"Ele voltou! Voltou da Ilha do Silêncio!"\n\nNo meio da festa, alguém puxa você pelo braço, sorrindo. "Vem. Ele está te esperando na taverna."`,
    [
      { icon:'🍶', text:'Ir até a taverna', action: storyNode_taberneiro_pos_sombras },
    ]
  );
}
window.storyNode_vilarejo_festa_pos_sombras = storyNode_vilarejo_festa_pos_sombras;

function storyNode_taberneiro_pos_sombras() {
  // Marca ANTES de mostrar o diálogo — evita repetir a cena mesmo se algo interromper no meio.
  G._cutscenePosSombrasVista = true;

  setScene('taverna');
  hideEnemy();
  setStory('TABERNEIRO',
    `Quando você entra, o taberneiro já está de pé, dois copos servidos na mesa dele — nenhum dos dois é o sake barato de sempre.\n\n"Sente-se." Ele empurra um copo até você. "Você merece isso."\n\nEle espera você beber um gole antes de continuar.\n\n"O caminho para fora do vilarejo... está liberado agora. Todo esse tempo — cada monstro na floresta, cada porta trancada, cada aviso pregado na parede — era um teste. Meu teste. Eu precisava saber se você aguentava o que vem depois."\n\nEle se inclina para frente, a voz mais séria.\n\n"Seu caminho agora é maior do que Clivor. Está interligado com a Cidade das Pedra."\n\nEle tira de dentro do casaco um mapa dobrado, gasto nas bordas, e coloca na sua mão.`,
    [
      { icon:'🗺️', text:'Aceitar o mapa', action: storyNode_taberneiro_pos_sombras_mapa },
    ], 'Imagens/personagens/Tviajante.png'
  );
}
window.storyNode_taberneiro_pos_sombras = storyNode_taberneiro_pos_sombras;

function storyNode_taberneiro_pos_sombras_mapa() {
  if (typeof addItem === 'function') addItem({ id: 'mapa_cidade_pedra' }, 1);
  notify('🗺️ Mapa da Cidade das Pedra obtido!', 'gold');
  addLog('O taberneiro revelou que tudo era um teste. Novo caminho: Cidade das Pedra.', 'xp');

  setStory('TABERNEIRO',
    `"Guarde bem. Quando estiver pronto, esse mapa vai te mostrar o caminho."\n\nEle recosta na cadeira, o sorriso cansado de quem carregou um segredo por tempo demais.\n\n"Por hoje, aproveite a fest—"`,
    [
      { icon:'➤', text:'A porta da taverna se abre...', action: storyNode_taberneiro_pos_sombras_yuki },
    ], 'Imagens/personagens/Tviajante.png'
  );
}
window.storyNode_taberneiro_pos_sombras_mapa = storyNode_taberneiro_pos_sombras_mapa;

function storyNode_taberneiro_pos_sombras_yuki() {
  setStory('SACERDOTISA YUKI',
    `A frase do taberneiro morre na garganta quando a porta da taverna se abre.\n\nYuki entra, o manto ainda balançando pelo vento de fora, e se aproxima da mesa sem pedir licença.\n\n"Desculpe interromper a festa." Ela não parece muito arrependida. "Mas isso não podia esperar."\n\nEla estende a mão. Sobre a palma dela, uma runa pequena, gravada com um símbolo que você não reconhece, pulsa com uma luz fraca e constante.\n\n"Isso é a Runa Yu."`,
    [
      { icon:'➤', text:'Continuar', action: storyNode_taberneiro_pos_sombras_yuki2 },
    ], 'Imagens/personagens/Syuki.png'
  );
}
window.storyNode_taberneiro_pos_sombras_yuki = storyNode_taberneiro_pos_sombras_yuki;

function storyNode_taberneiro_pos_sombras_yuki2() {
  setStory('SACERDOTISA YUKI',
    `"Equipe no slot de armadura." Ela coloca a runa na sua mão — está fria, depois quente, depois fria de novo. "Mas não se preocupe em ficar trocando ela toda vez que trocar de armadura. Ela funciona sozinha: uma vez equipada, continua ativa em qualquer armadura que você usar, até você mesmo decidir tirá-la."\n\nEla cruza os braços.\n\n"Você vai precisar dela. A Cidade das Pedra tem um pó corrosivo no ar — corrói qualquer um que não seja dali. Só quem nasceu na cidade tem os anticorpos naturais contra ele. Todo o resto..." Ela deixa a frase no ar. "A runa é o que vai te proteger."`,
    [
      { icon:'➤', text:'Aceitar a Runa Yu', action: storyNode_taberneiro_pos_sombras_yuki_fim },
    ], 'Imagens/personagens/Syuki.png'
  );
}
window.storyNode_taberneiro_pos_sombras_yuki2 = storyNode_taberneiro_pos_sombras_yuki2;

function storyNode_taberneiro_pos_sombras_yuki_fim() {
  darRunaYuEquipada();
  G.cidadePedraLiberada = true;
  notify('🔯 Runa Yu obtida e equipada!', 'purple');
  addLog('Yuki entregou a Runa Yu — proteção contra o pó corrosivo da Cidade das Pedra.', 'xp');

  setStory('SACERDOTISA YUKI',
    `Ela dá um passo para trás, a luz da runa ainda pulsando na sua mão.\n\n"Boa sorte, viajante."\n\nSem mais nada a dizer, ela se vira e sai da taverna como entrou — sem pedir licença.\n\nA conversa acaba.`,
    [
      { icon:'↩', text:'Voltar ao vilarejo', action: storyNode_vilarejo },
    ], 'Imagens/personagens/Syuki.png'
  );
}
window.storyNode_taberneiro_pos_sombras_yuki_fim = storyNode_taberneiro_pos_sombras_yuki_fim;

// ─────────────────────────────────────────────────────────────
//  4. ROTEADOR DO MAPA
// ─────────────────────────────────────────────────────────────

function villageGoTo(location) {
  if (location === 'saida') {
    setScene('floresta');
    storyNode_explorar();
    return;
  }
  // ── Templo: bloqueado até concluir a Dungeon das Sombras ──
  if (location === 'templo' && !G.dungeonSombrasConcluida) {
    setStory('SACERDOTISA YUKI',
      'As portas do Templo da Divina Trindade estão seladas. Uma voz ecoa de dentro:\n\n"Apenas quem enfrentou as sombras e sobreviveu pode entrar aqui. Complete a Dungeon das Sombras primeiro."',
      [{ icon:'↩', text:'Voltar ao vilarejo', action: storyNode_vilarejo }]
    );
    return;
  }
  if (!isLocationOpen(location)) {
    locationClosedDialog(location);
    return;
  }
  switch(location) {
    case 'estalagem': storyNode_estalagem(); break;
    case 'taverna':   storyNode_taverna();   break;
    case 'ferreiro':  storyNode_ferreiro();  break;
    case 'templo':    storyNode_templo();    break;
    case 'torre':     storyNode_torre();     break;
    case 'mapa':      storyNode_mapa_mundi(); break;
    case 'vilarejo':  storyNode_vilarejo();   break;
  }
}
window.villageGoTo = villageGoTo;

// ── Atualiza aparência do pin do Templo no mapa ──
function updateTemploPin() {
  const marker = document.getElementById('templo-pin-marker');
  const pinEl  = document.getElementById('templo-pin-icon');
  const label  = document.getElementById('templo-pin-label');
  if (!marker) return;
  const desbloqueado = !!(G && G.dungeonSombrasConcluida);
  if (desbloqueado) {
    marker.classList.remove('quest-locked');
    if (pinEl) {
      pinEl.style.filter = '';
      pinEl.style.opacity = '';
    }
    if (label) { label.style.color = '#f0c040'; label.textContent = 'Templo'; }
  } else {
    marker.classList.add('quest-locked');
    if (pinEl) {
      pinEl.style.filter = 'grayscale(1) brightness(0.45)';
      pinEl.style.opacity = '0.55';
      pinEl.style.animation = 'none';
    }
    if (label) { label.style.color = '#888'; label.textContent = 'Templo 🔒'; }
  }
}
window.updateTemploPin = updateTemploPin;

// ─────────────────────────────────────────────────────────────
//  4-B. MAPA-MÚNDI
//  Mapa geral de Clivor. Por enquanto mostra apenas o Vilarejo
//  (ponto atual) e a Cidade das Pedra (liberada após a cutscene
//  do Taberneiro + Yuki). A Dungeon das Sombras NÃO aparece aqui —
//  ela continua acessível só pela conversa na taverna. As demais
//  regiões entram depois.
// ─────────────────────────────────────────────────────────────

function storyNode_mapa_mundi() {
  setScene('mapa-mundi');
  hideEnemy();

  // ── Fix: força recarregar o fundo do Mapa-Múndi via JS.
  //    O navegador pode ter cacheado uma resposta de erro (404) de uma
  //    tentativa anterior pra essa imagem e não tenta buscar de novo
  //    mesmo com o arquivo já existindo no caminho certo. O "?v=" no
  //    final da URL força o Chrome a tratar como um pedido novo.
  (function forceLoadMundiBg() {
    const bg = document.getElementById('scene-bg');
    if (!bg) return;
    const path = 'Imagens/Cidade das pedras/file_000000007c70720e910d40ab8ef3d7c5.png';
    const test = new Image();
    test.onload = function () {
      bg.style.backgroundImage = `url('${path}')`;
    };
    test.onerror = function () {
      console.error('[Mapa-Múndi] Não foi possível carregar a imagem de fundo em:', path,
        '— confira se o servidor Python está rodando na pasta certa (~/storage/shared/Clivor RPG) e se o caminho é exatamente esse (maiúsculas/minúsculas incluídas).');
    };
    test.src = path + '?v=' + Date.now();
  })();

  setTimeout(updateMundiPins, 50);
  setStory('NARRADOR',
    `Você desdobra o mapa. As linhas de tinta desenham o que já se conhece de Clivor — e, num canto, um traço novo aponta para além das fronteiras do vilarejo.`,
    [
      { icon:'↩', text:'Voltar ao vilarejo', action: storyNode_vilarejo },
    ]
  );
}
window.storyNode_mapa_mundi = storyNode_mapa_mundi;

// Requisito mínimo pra atravessar a Ponte da Fronteira: LV 10 + Dungeon das Sombras concluída.
function _ponteFronteiraLiberada() {
  const lvlOk = (G.player && (G.player.level || 1)) >= 10;
  return !!(lvlOk && G.dungeonSombrasConcluida);
}

// Atualiza aparência do pin da Cidade das Pedra (bloqueado/desbloqueado)
function updateMundiPins() {
  const marker = document.getElementById('mundi-pin-cidade-pedra');
  const icon   = document.getElementById('mundi-pin-cidade-pedra-icon');
  const label  = document.getElementById('mundi-pin-cidade-pedra-label');
  if (!marker) return;
  const liberada = !!(G && G.cidadePedraLiberada);
  marker.classList.toggle('mundi-locked', !liberada);
  if (icon)  icon.style.filter = liberada ? '' : 'grayscale(1) brightness(0.5)';
  if (label) label.textContent = liberada ? 'Cidade das Pedra' : 'Cidade das Pedra 🔒';

  // Mesmo estado, refletido na cópia do pin dentro do mini-mapa flutuante
  const mmMarker = document.getElementById('mm-pin-cidade-pedra');
  const mmIcon   = document.getElementById('mm-pin-cidade-pedra-icon');
  const mmLabel  = document.getElementById('mm-pin-cidade-pedra-label');
  if (mmMarker) {
    mmMarker.classList.toggle('mundi-locked', !liberada);
    if (mmIcon)  mmIcon.style.filter = liberada ? '' : 'grayscale(1) brightness(0.5)';
    if (mmLabel) mmLabel.textContent = liberada ? 'Cidade das Pedra' : 'Cidade das Pedra 🔒';
  }

  // Pin da Ponte da Fronteira (mapa principal + mini-mapa)
  const ponteLiberada = _ponteFronteiraLiberada();
  const ponteMarker = document.getElementById('mundi-pin-ponte');
  const ponteLabel   = document.getElementById('mundi-pin-ponte-label');
  if (ponteMarker) {
    ponteMarker.classList.toggle('mundi-locked', !ponteLiberada);
    if (ponteLabel) ponteLabel.textContent = ponteLiberada ? 'Ponte da Fronteira' : 'Bloqueado';
  }
  const mmPonteMarker = document.getElementById('mm-pin-ponte');
  const mmPonteLabel  = document.getElementById('mm-pin-ponte-label');
  if (mmPonteMarker) {
    mmPonteMarker.classList.toggle('mundi-locked', !ponteLiberada);
    if (mmPonteLabel) mmPonteLabel.textContent = ponteLiberada ? 'Ponte da Fronteira' : 'Bloqueado';
  }
}
window.updateMundiPins = updateMundiPins;

// Roteador de destinos do Mapa-Múndi
function mundiGoTo(destino) {
  if (destino === 'cidade_pedra') {
    if (!G.cidadePedraLiberada) {
      notify('🔒 Esse caminho ainda não foi liberado.', 'red');
      return;
    }
    storyNode_cidade_pedra();
  }
}
window.mundiGoTo = mundiGoTo;

// Entrada da Ponte da Fronteira — só pelo Mapa-Múndi, com requisito mínimo.
function mundiGoToPonte() {
  if (!_ponteFronteiraLiberada()) {
    notify('🔒 Caminho bloqueado.', 'red');
    return;
  }
  storyNode_ponte_fronteira();
}
window.mundiGoToPonte = mundiGoToPonte;

// ─────────────────────────────────────────────────────────────
//  4-C. CIDADE DAS PEDRA — CUTSCENE DE CHEGADA
//  Lore: a Cidade das Pedra era famosa em todo o reino pelo
//  Pó da Cura, exalado por um Núcleo de Pedra Viva sob a cidade.
//  O Clã de Kurogane invadiu a região (via Ponte da Fronteira)
//  querendo tomar o Núcleo para si; nos combates, o Núcleo
//  rachou — o pó que curava virou o pó corrosivo. Nada disso
//  tem relação com Valdris ou a Dungeon das Sombras.
// ─────────────────────────────────────────────────────────────

// Dano ambiente do pó corrosivo — só bate se a Runa Yu não estiver equipada.
// Trava em 1 HP mínimo: não existe game-over de exploração no motor, então
// esse dano desgasta mas nunca mata fora de batalha.
function _cidadePedraCorrosaoTick() {
  const p = G.player;
  if (!p || (typeof playerTemRunaYu === 'function' && playerTemRunaYu())) return;
  const dano = Math.max(1, Math.round((p.maxHp || 1) * 0.10));
  p.hp = Math.max(1, (p.hp || p.maxHp) - dano);
  if (typeof updateHUD === 'function') updateHUD();
  notify(`☠️ O pó corrosivo queima seus pulmões! -${dano} HP`, 'red');
  addLog('A poeira da Cidade das Pedra corroeu seus pulmões — sem a runa, o dano é inevitável.', 'dmg');
}
window._cidadePedraCorrosaoTick = _cidadePedraCorrosaoTick;

function storyNode_cidade_pedra() {
  // Rede de segurança: se por qualquer motivo o jogador chegou aqui sem
  // nunca ter recebido a Runa Yu (bug na cutscene do vilarejo, save antigo
  // etc.), Yuki intercepta e entrega antes de deixar ele prosseguir.
  if (typeof playerPossuiRunaYu === 'function' && !playerPossuiRunaYu()) {
    return storyNode_cidade_pedra_yuki_emergencia();
  }

  _cidadePedraCorrosaoTick();
  setScene('cidade-pedra');
  hideEnemy();
  setStory('NARRADOR',
    `Você ouviu falar da Cidade das Pedra a vida inteira antes mesmo de sair do Vilarejo.\n\nDizem que sob suas ruas corre um veio de pedra viva tão antigo quanto o próprio Clivor — e que o pó que ele exala cura qualquer ferida, qualquer doença, qualquer coisa que a vida quebra. Peregrinos atravessavam reinos inteiros só para respirar aquele ar uma vez.\n\nAs muralhas cinzas finalmente se erguem no horizonte, mais altas do que pareciam no mapa.`,
    [
      { icon:'👁', text:'Aproximar-se', action: storyNode_cidade_pedra_chegada },
    ]
  );
}
window.storyNode_cidade_pedra = storyNode_cidade_pedra;

// ── Rede de segurança: Yuki intercepta antes da entrada, caso falte a runa ──
function storyNode_cidade_pedra_yuki_emergencia() {
  hideEnemy();
  setStory('SACERDOTISA YUKI',
    `Antes que você dê o primeiro passo em direção à Cidade das Pedra, uma voz te chama.\n\nYuki se aproxima, sem pressa, e abre a mão. Sobre a palma, uma runa pequena pulsa com uma luz fraca e constante.\n\n"Quase esqueci de te dar isso." Ela não parece incomodada. "Isso é a Runa Yu — vou deixar já equipada pra você. Uma vez ativa, funciona sozinha, não precisa se preocupar em trocar."\n\nEla olha na direção da cidade, séria.\n\n"Entre com ela equipada. Sem isso, o ar de lá vai te fazer mal."`,
    [
      { icon:'➤', text:'Aceitar a Runa Yu', action: storyNode_cidade_pedra_yuki_emergencia_fim },
    ], 'Imagens/personagens/Syuki.png'
  );
}
window.storyNode_cidade_pedra_yuki_emergencia = storyNode_cidade_pedra_yuki_emergencia;

function storyNode_cidade_pedra_yuki_emergencia_fim() {
  darRunaYuEquipada();
  notify('🔯 Runa Yu obtida e equipada!', 'purple');
  addLog('Yuki interceptou você antes da Cidade das Pedra e entregou a Runa Yu.', 'xp');
  setStory('SACERDOTISA YUKI',
    `"Vou deixar você seguir por aqui." Ela já está se afastando. "Cuide-se lá dentro."\n\nSem mais explicações, ela desaparece pelo caminho de volta ao vilarejo.`,
    [
      { icon:'👁', text:'Aproximar-se da cidade', action: storyNode_cidade_pedra_chegada },
    ], 'Imagens/personagens/Syuki.png'
  );
}
window.storyNode_cidade_pedra_yuki_emergencia_fim = storyNode_cidade_pedra_yuki_emergencia_fim;

function storyNode_cidade_pedra_chegada() {
  setScene('cidade-pedra');
  hideEnemy();
  setStory('NARRADOR',
    `Quanto mais perto, mais errado tudo parece.\n\nA névoa está lá — fina, esbranquiçada, exatamente como contavam. Mas não brilha como nas histórias. Não é quente. Ela arde de leve nos olhos, e o cheiro é mais próximo de pedra queimada do que de qualquer coisa que cure.\n\nA Runa Yu, presa à sua armadura, pulsa uma vez — um aviso silencioso — e o ardor na sua pele simplesmente para. Ela sabe reconhecer isso. Você não.`,
    [
      { icon:'👁', text:'Continuar observando', action: storyNode_cidade_pedra_guerra },
    ]
  );
}
window.storyNode_cidade_pedra_chegada = storyNode_cidade_pedra_chegada;

function storyNode_cidade_pedra_guerra() {
  setScene('cidade-pedra');
  hideEnemy();
  setStory('NARRADOR',
    `É então que você nota o resto.\n\nAlém das muralhas, no céu baixo, uma coluna fina de fumaça sobe — longe, mas não o suficiente. Um som chega arrastado pelo vento, quase abafado pela distância: metal contra metal, e algo que pode ser um grito. Ou só o vento entre as pedras. Você não tem certeza.\n\nEstandartes que você nunca viu antes tremulam nos postos mais distantes da muralha — não são do Vilarejo, e não são desta cidade. Vieram de além da Travessia de Kurogane.\n\nO taberneiro tinha razão. Isso é maior do que a Dungeon das Sombras.`,
    [
      { icon:'👁', text:'Continuar observando', action: storyNode_cidade_pedra_final },
    ]
  );
}
window.storyNode_cidade_pedra_guerra = storyNode_cidade_pedra_guerra;

function storyNode_cidade_pedra_final() {
  setScene('cidade-pedra');
  hideEnemy();
  if (!G.cidadePedraGuerraRevelada) {
    G.cidadePedraGuerraRevelada = true;
    addLog('Cidade das Pedra: a guerra de Kurogane chegou perto da cidade, e o pó da cura virou corrosivo.', 'xp');
  }
  setStory('NARRADOR',
    `Os portões ainda estão longe. Ninguém te viu chegar, e ninguém sai para te receber.\n\nA cidade que curava o mundo inteiro agora mal se cura de si mesma.\n\nMas os portões não estão trancados. Ninguém te impede de entrar.`,
    [
      { icon:'🚪', text:'Entrar na cidade', action: storyNode_cidade_pedra_entrada },
      { icon:'↩', text:'Voltar ao mapa', action: storyNode_mapa_mundi },
    ]
  );
}
window.storyNode_cidade_pedra_final = storyNode_cidade_pedra_final;

// ─────────────────────────────────────────────────────────────
//  4-C-2. CIDADE DAS PEDRA — PRIMEIRA ENTRADA
//  (stub — conteúdo completo entra depois; por enquanto só a
//  primeira impressão do jogador ao cruzar os portões)
// ─────────────────────────────────────────────────────────────

function storyNode_cidade_pedra_entrada() {
  setScene('cidade-pedra');
  hideEnemy();
  setStory('NARRADOR',
    `Você cruza os portões sem que ninguém te detenha. Nenhum guarda pergunta seu nome, nenhuma voz te barra o caminho.\n\nLá dentro, a Cidade das Pedra se abre em ruas estreitas de pedra cinza. O comércio é modesto — poucas barracas, pouco movimento — nada perto da vida farta que os viajantes contam por aí.\n\nNo centro, dominando o horizonte entre os telhados baixos, ergue-se uma pedra gigantesca — o núcleo vivo que sustenta a cidade inteira, ainda pulsando fraco sob a névoa corrosiva.\n\nAo seu redor, a cidade parece calma. Um povo fiel ao seu governante segue a rotina sem levantar os olhos pra você — como se um estranho não fosse novidade nenhuma.`,
    [
      { icon:'↩', text:'Voltar ao mapa', action: storyNode_mapa_mundi },
    ]
  );
}
window.storyNode_cidade_pedra_entrada = storyNode_cidade_pedra_entrada;

// ─────────────────────────────────────────────────────────────
//  4-D. PONTE DA FRONTEIRA (stub — conteúdo completo entra depois)
// ─────────────────────────────────────────────────────────────

function storyNode_ponte_fronteira() {
  setScene('ponte-pedra');
  hideEnemy();

  // Enquanto o ogro e os filhos da bruxa não forem derrotados (ver
  // kurosakiTravessiaLivre em cidade_kurosaki.js), a Ponte da Fronteira
  // mostra o gigante adormecido bloqueando a travessia + a menina
  // misteriosa pedindo ajuda — mesmo antes do jogador entrar na
  // Travessia de Kurogane propriamente.
  const bloqueada = (typeof kurosakiTravessiaLivre === 'function') && !kurosakiTravessiaLivre();
  const bg = document.getElementById('scene-bg');
  if (bg) {
    // Só usa a transição estilizada (dissolve + brilho) quando o estado
    // realmente muda de figura — visitas normais trocam a classe na hora.
    // O estado anterior fica em G.kurosaki (não na classe do próprio bg):
    // o setScene() logo acima já zerou bg.className antes desse trecho
    // rodar, então ler a classe aqui sempre dava "mudou", disparando o
    // efeito em toda visita — daí o bug do "plano de fundo ligando feito TV".
    const estadoAnterior = G.kurosaki && G.kurosaki._bgPonteBloqueada;
    const estadoMudou = (estadoAnterior !== undefined) && (estadoAnterior !== bloqueada);
    if (G.kurosaki) G.kurosaki._bgPonteBloqueada = bloqueada;
    if (estadoMudou && typeof trocarVisualCenaComTransicao === 'function') {
      trocarVisualCenaComTransicao(() => bg.classList.toggle('ponte-bloqueada', bloqueada));
    } else {
      bg.classList.toggle('ponte-bloqueada', bloqueada);
    }
  }

  // Texto do narrador: três variantes, conforme o estado da travessia.
  //  1) bloqueada — o gigante ainda dorme no meio da ponte (texto original).
  //  2) livre, mas é a 1ª vez que o jogador volta aqui depois da vitória —
  //     o narrador comenta o que acabou de acontecer (ogro morto, bruxa
  //     fugiu com os filhos), como narração — nunca como se fosse um
  //     personagem falando.
  //  3) livre, visitas seguintes — texto padrão, mais curto, sem repetir
  //     a narração do que já passou.
  let textoNarrador;
  if (bloqueada) {
    textoNarrador = `A ponte de pedra se estende à sua frente, marcando a fronteira das terras conhecidas do Vilarejo. O vento é mais forte aqui, e o caminho adiante ainda guarda seus segredos.`;
  } else if (typeof G !== 'undefined' && G.kurosaki && !G.kurosaki.pontePosVitoriaNarrada) {
    G.kurosaki.pontePosVitoriaNarrada = true;
    textoNarrador = `O vento aqui ainda carrega cheiro de pó e cinzas. Onde o gigante dormia, agora só restam tábuas rachadas e um silêncio pesado demais para ser só alívio.\n\nA bruxa fugiu, levando consigo o que restou dos filhos — mas, pela primeira vez, a Travessia de Kurogane está livre.`;
  } else {
    textoNarrador = `A ponte de pedra se estende à sua frente, agora livre da sombra do gigante que a bloqueava. O caminho para a Travessia de Kurogane está aberto.`;
  }

  setStory('NARRADOR',
    textoNarrador,
    [
      { icon:'↩', text:'Voltar ao vilarejo', action: storyNode_vilarejo },
    ]
  );

  if (bloqueada && typeof personagemPinMostrar === 'function' && typeof KUROSAKI_MENINA_CONFIG !== 'undefined') {
    personagemPinMostrar({
      id: 'menina_kurogane',
      x: KUROSAKI_MENINA_CONFIG.X,
      y: KUROSAKI_MENINA_CONFIG.Y,
      img: KUROSAKI_MENINA_CONFIG.IMG,
      alt: 'Menina misteriosa',
      onClick: storyNode_menina_kurogane,
    });
  }
}
window.storyNode_ponte_fronteira = storyNode_ponte_fronteira;

// ─────────────────────────────────────────────────────────────
//  4-E. TRAVESSIA DE KUROGANE
//  Implementação completa agora mora em cidade_kurosaki.js — o stub
//  antigo daqui foi removido porque estava sobrescrevendo a versão
//  completa (pins do cenário, olho na ponte, fala do HuBi etc.) e
//  travava o jogador numa tela sem opção de seguir pra Kurosaki.
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
//  5-A. SISTEMA DE ENCANTAMENTOS — RUNA DA ARMA (POR CLASSE)
// ─────────────────────────────────────────────────────────────
//
//  Cada tier tem `bonusByClass`: bônus exclusivo por classe.
//  Campos suportados: atk, def, mag, hp, mp, crit
//    - crit: chance extra de crítico em % (somada em p.critBonus, o mesmo
//      campo usado por armadura/acessório/ascensão de arma — é o campo que
//      o motor de batalha realmente lê pra calcular a chance de crítico)
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
      arqueiro:  { atk: 8, crit: 8, _enchantDoubleShot: 0.08 },
      guerreiro: { atk: 8, crit: 10 },
    },
    descByClass: {
      mago:      'Fragmento das Sombras no cajado. Feitiços ignoram 20% da defesa inimiga. MAG+8, MP+30.',
      paladino:  'Luz sagrada capturada na escuridão. Regenera HP a cada turno do inimigo. DEF+6, HP+40.',
      monge:     'Sombra e chi em equilíbrio perfeito. Poder obscuro e puro. ATQ+5, MAG+5, HP+15.',
      assassino: 'Metal que lembra a escuridão de onde veio. Sem crítico? A Marca Lunar fica no alvo — próximo Golpe Sombrio ignora DEF. ATQ+8, Crit+12%.',
      arqueiro:  'Flecha que segue a sombra do alvo. Disparo Veloz: 8% de chance de uma 2ª flecha no ataque básico. ATQ+8, Crit+8%.',
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
      mago:      { mag: 13, mp: 50,  _enchantMagPen: 0.35, _enchantResonance: 0.05 },
      paladino:  { def: 10, hp: 60,  _enchantRegen: 0.028, _enchantThorns: 0.08 },
      monge:     { atk: 8, mag: 8, hp: 25 },
      assassino: { atk: 13, crit: 14, _enchantShadowMarkEnabled: true },
      arqueiro:  { atk: 12, crit: 12, _enchantDoubleShot: 0.12 },
      guerreiro: { atk: 13, crit: 16 },
    },
    descByClass: {
      mago:      'Escama do Kappa imbuída de mana aquática. Feitiços ignoram 35% da defesa inimiga. Ressonância: o mesmo elemento em turnos seguidos dá +5% de dano por acúmulo (até 3). MAG+13, MP+50.',
      paladino:  'Escama do Kappa forjada na armadura sagrada. Regeneração por turno amplificada. Retribuição: reflete 8% do dano recebido. DEF+10, HP+60.',
      monge:     'Chi do Kappa fluindo pelo corpo. Força que vem de dentro e de fora. ATQ+8, MAG+8, HP+25.',
      assassino: 'Escama negra do Kappa. Sem crítico, a Marca Lunar abre a brecha — próximo Golpe Sombrio ignora toda DEF. ATQ+13, Crit+14%.',
      arqueiro:  'Escama de Kappa na ponta da flecha. Perfura até couro de dragão. Disparo Veloz: 12% de chance de 2ª flecha. ATQ+12, Crit+12%.',
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
    req: { dungeonAny: true },
    cost: 500,
    bonusDefault: { atk: 18, def: 6 },
    bonusByClass: {
      mago:      { mag: 20, mp: 70,  _enchantMagPen: 0.50, _enchantResonance: 0.08 },
      paladino:  { def: 16, hp: 85,  _enchantRegen: 0.042, _enchantThorns: 0.12 },
      monge:     { atk: 13, mag: 13, hp: 35 },
      assassino: { atk: 20, crit: 20, _enchantShadowMarkEnabled: true, _enchantLunarBonus: 0.10 },
      arqueiro:  { atk: 20, crit: 18, _enchantDoubleShot: 0.16 },
      guerreiro: { atk: 20, crit: 22 },
    },
    descByClass: {
      mago:      'Quatro escamas do Kappa fundidas em chama primordial. Feitiços ignoram 50% da defesa. Ressonância: +8% de dano por acúmulo (até 3). MAG+20, MP+70.',
      paladino:  'Luz e trevas forjadas em equilíbrio absoluto. Regeneração máxima por turno. Retribuição: reflete 12% do dano recebido. DEF+16, HP+85.',
      monge:     'Chi primordial condensado. Corpo e espírito transcendem o limite mortal. ATQ+13, MAG+13, HP+35.',
      assassino: 'Quatro sombras fundidas em uma só lâmina. Golpe marcado ignora DEF e causa +10% de dano. ATQ+20, Crit+20%.',
      arqueiro:  'Flecha que rasga o tecido do espaço. Nada pode bloqueá-la. Disparo Veloz: 16% de chance de 2ª flecha. ATQ+20, Crit+18%.',
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
    req: { dungeonMajor: 2 },
    cost: 900,
    bonusDefault: { atk: 28, def: 10 },
    bonusByClass: {
      mago:      { mag: 30, mp: 100, _enchantMagPen: 0.70, _enchantManaEcho: 0.25, _enchantResonance: 0.10 },
      paladino:  { def: 24, hp: 120, _enchantRegen: 0.065, _enchantBarrierChance: 0.20, _enchantThorns: 0.15 },
      monge:     { atk: 20, mag: 20, hp: 50 },
      assassino: { atk: 30, crit: 30, _enchantShadowMarkEnabled: true, _enchantLunarBonus: 0.20 },
      arqueiro:  { atk: 30, crit: 26, _enchantDoubleShot: 0.20 },
      guerreiro: { atk: 30, crit: 32 },
    },
    descByClass: {
      mago:      'O abismo responde à sua voz. Feitiços ignoram 70% da defesa inimiga. Eco Arcano: 25% de chance do feitiço não gastar MP. Ressonância: +10% de dano por acúmulo (até 3). MAG+30, MP+100.',
      paladino:  'Luz que consome as trevas e trevas que fortalecem a luz. Regeneração impossível de bloquear. Bênção do Abismo: 20% de chance de anular todo o dano recebido. Retribuição: reflete 15% do dano recebido. DEF+24, HP+120.',
      monge:     'O chi do universo flui por você. Golpes reescrevem a realidade. ATQ+20, MAG+20, HP+50.',
      assassino: 'A própria morte gravada na lâmina. Golpe marcado ignora DEF e causa +20% de dano. ATQ+30, Crit+30%.',
      arqueiro:  'A flecha decide onde o destino termina. Disparo Veloz: 20% de chance de 2ª flecha. ATQ+30, Crit+26%.',
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

// Efeitos especiais por classe (guardados direto em p.*). Qualquer chave nova
// de runa entra só aqui — aplicar/remover/reciclar/fundir usam esta lista.
const ENCHANT_SPECIAL_KEYS = [
  '_enchantMagPen', '_enchantManaEcho', '_enchantResonance',      // Mago
  '_enchantRegen', '_enchantBarrierChance', '_enchantThorns',     // Paladino
  '_enchantLunarBonus',                                           // Assassino (Marca Lunar)
  '_enchantDoubleShot',                                           // Arqueiro (Disparo Veloz)
];
window.ENCHANT_SPECIAL_KEYS = ENCHANT_SPECIAL_KEYS;

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
  // BUGFIX: estava checando G.dungeonSombrasCleared (nunca definido em lugar
  // nenhum) em vez de G.dungeonSombrasConcluida (o flag real, setado ao
  // vencer a Dungeon das Sombras e usado em todo o resto do jogo — ver
  // templo, ponte da fronteira, cutscene do taberneiro). Por isso a Runa A
  // ficava travada mesmo depois de concluir a dungeon.
  if (tier.req.dungeonSombras && !G.dungeonSombrasConcluida)
    return { ok: false, reason: 'Requer: concluir o Dungeon das Sombras.' };
  if (tier.req.dungeonKappa && !G.dungeonKappaCleared)
    return { ok: false, reason: 'Requer: vencer a Masmorra do Kappa.' };
  if (tier.req.dungeonAny && !anyDungeonCleared())
    return { ok: false, reason: 'Requer: concluir ao menos uma masmorra.' };
  if (tier.req.dungeonMajor && countMajorDungeons() < tier.req.dungeonMajor)
    return { ok: false, reason: `Requer ${tier.req.dungeonMajor} masmorras maiores (você tem ${countMajorDungeons()}).` };
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

// ─────────────────────────────────────────────────────────────
//  RUNA DA ARMA — menu único com EVOLUÇÃO (substitui o antigo
//  "Encantamento de Arma" + "Fusão de Runas").
//
//  A runa evolui em ordem: D → C → B → A → S → S+ → SS.
//  Cada evolução custa moedas (campo `cost` do tier) e respeita o
//  `req` do tier (nível, masmorras). Se o jogador tiver uma runa do
//  tier-alvo guardada em G.player.runasMateriais (drop de masmorra),
//  ela é consumida no lugar das moedas — evolução gratuita.
// ─────────────────────────────────────────────────────────────
const ENCHANT_ORDER = ['D', 'C', 'B', 'A', 'S', 'S+', 'SS'];

// Próximo tier da evolução (ou null se já está no máximo / tier especial)
function getNextEnchantTier(currentId) {
  if (!currentId) return getEnchantTier(ENCHANT_ORDER[0]);
  const i = ENCHANT_ORDER.indexOf(currentId);
  if (i < 0) return null;
  return getEnchantTier(ENCHANT_ORDER[i + 1]) || null;
}

function _enchantBonusText(bonus) {
  const parts = [];
  if (bonus.atk)  parts.push(`ATQ+${bonus.atk}`);
  if (bonus.def)  parts.push(`DEF+${bonus.def}`);
  if (bonus.mag)  parts.push(`MAG+${bonus.mag}`);
  if (bonus.hp)   parts.push(`HP+${bonus.hp}`);
  if (bonus.mp)   parts.push(`MP+${bonus.mp}`);
  if (bonus.crit) parts.push(`Crit+${bonus.crit}%`);
  return parts.length ? parts.join(', ') : '???';
}

// Remove do jogador os bônus de um tier (stats + efeitos especiais)
function _enchantRemoveFromPlayer(p, tier) {
  const pb = getEnchantBonus(tier);
  if (pb.atk)  p.atk   = Math.max(1, p.atk - pb.atk);
  if (pb.def)  p.def   = Math.max(0, p.def - pb.def);
  if (pb.mag)  p.mag   = Math.max(0, (p.mag || 0) - pb.mag);
  if (pb.hp)  { p.maxHp = Math.max(1, p.maxHp - pb.hp); p.hp = Math.min(p.hp, p.maxHp); }
  if (pb.mp)  { p.maxMp = Math.max(0, (p.maxMp || 0) - pb.mp); if (p.mp !== undefined) p.mp = Math.min(p.mp, p.maxMp); }
  if (pb.crit) p.critBonus = Math.max(0, (p.critBonus || 0) - pb.crit / 100);
  ENCHANT_SPECIAL_KEYS.forEach(k => { if (pb[k]) p[k] = 0; });
  if (pb._enchantShadowMarkEnabled) { p._enchantShadowMarkEnabled = false; p._enchantShadowMark = false; p._enchantShadowMarkTier = null; }
}

// Aplica no jogador os bônus de um tier (stats + efeitos especiais)
function _enchantApplyToPlayer(p, tier) {
  const nb = getEnchantBonus(tier);
  if (nb.atk)  p.atk  += nb.atk;
  if (nb.def)  p.def  += nb.def;
  if (nb.mag)  p.mag   = (p.mag || 0) + nb.mag;
  if (nb.hp)  { p.maxHp += nb.hp; p.hp += nb.hp; }
  if (nb.mp)  { p.maxMp = (p.maxMp || 0) + nb.mp; }
  if (nb.crit) p.critBonus = (p.critBonus || 0) + nb.crit / 100;
  ENCHANT_SPECIAL_KEYS.forEach(k => { if (nb[k]) p[k] = nb[k]; });
  if (nb._enchantShadowMarkEnabled) { p._enchantShadowMarkEnabled = true; p._enchantShadowMarkTier = tier.id; }
  p._enchantTableVer = 2; // runa gravada já com a tabela nova (ver runas_classe.js)
}

function storyNode_encantamentos() {
  const p = G.player;
  ensureRunaMateriais();
  const current = p._weaponEnchant || null;
  const curTier = current ? getEnchantTier(current) : null;
  const next    = getNextEnchantTier(current);

  let cardsHTML = '<div class="enchant-menu">';

  // ── Runa atual ──
  if (curTier) {
    cardsHTML += `
      <div class="enchant-card active" style="--ec:${curTier.color}; --ec-glow:${curTier.color}44;">
        <span class="enchant-active-tag">ATIVA</span>
        <div class="enchant-card-header">
          <span class="enchant-card-name" style="color:${curTier.color}">${curTier.label}</span>
        </div>
        <div class="enchant-card-desc">${getEnchantDesc(curTier)}</div>
        <div class="enchant-card-bonus">${_enchantBonusText(getEnchantBonus(curTier))}</div>
        <div class="enchant-card-flavor">${curTier.flavor}</div>
      </div>`;
  }

  // ── Próxima evolução ──
  if (next) {
    const req       = checkEnchantReq(next);
    const temEstoque = (p.runasMateriais[next.id] || 0) > 0;
    const podePagar = temEstoque || p.gold >= next.cost;
    const classes   = 'enchant-card' + ((req.ok && podePagar) ? '' : ' unavail');
    const custoTxt  = temEstoque ? '🎁 runa guardada' : `${next.cost}◈`;
    cardsHTML += `
      <div class="${classes}" style="--ec:${next.color}; --ec-glow:${next.color}44;" onclick="enchantSelect('${next.id}')">
        <div class="enchant-card-header">
          <span class="enchant-card-name" style="color:${next.color}">⬆ ${curTier ? 'Evoluir para' : 'Gravar'} ${next.label}</span>
          <span class="enchant-card-cost">${custoTxt}</span>
        </div>
        <div class="enchant-card-desc">${getEnchantDesc(next)}</div>
        <div class="enchant-card-bonus">${_enchantBonusText(getEnchantBonus(next))}</div>
        ${temEstoque ? `<div class="enchant-card-req" style="color:#88c888">🎁 Você tem 1× ${next.label} guardada — a evolução não custa moedas.</div>` : ''}
        ${!req.ok ? `<div class="enchant-card-req" style="color:#c06040">⚠ ${req.reason}</div>` : ''}
        ${(req.ok && !podePagar) ? `<div class="enchant-card-req" style="color:#c06040">⚠ Sem moedas suficientes</div>` : ''}
        <div class="enchant-card-flavor">${next.flavor}</div>
      </div>`;
  } else if (curTier && current !== 'XZ') {
    cardsHTML += `<div class="enchant-card-flavor" style="text-align:center;padding:10px;">Sua runa chegou ao limite do que Gozen sabe gravar.</div>`;
  }

  // ── Caminho restante (só leitura) ──
  const idxProx = next ? ENCHANT_ORDER.indexOf(next.id) : ENCHANT_ORDER.length;
  const restantes = ENCHANT_ORDER.slice(idxProx + 1).map(getEnchantTier).filter(Boolean);
  if (restantes.length) {
    cardsHTML += `<div class="enchant-card-flavor" style="text-align:center;margin-top:6px;">— caminho da runa —</div>`;
    restantes.forEach(t => {
      cardsHTML += `
        <div class="enchant-card locked" style="--ec:${t.color};">
          <div class="enchant-card-header">
            <span class="enchant-card-name" style="color:${t.color}">${t.label}</span>
            <span class="enchant-card-cost">${t.cost > 0 ? t.cost + '◈' : ''}</span>
          </div>
          <div class="enchant-card-bonus">${_enchantBonusText(getEnchantBonus(t))}</div>
        </div>`;
    });
  }
  cardsHTML += '</div>';

  const currentLine = curTier
    ? `Runa atual: <span style="color:${curTier.color};font-weight:bold">${curTier.label}</span>`
    : 'Sua arma não possui runa.';

  const introHtml = `
    <div id="ferreiro-overlay-intro">
      Gozen coloca os óculos escuros de trabalho e examina a lâmina à luz da forja.<br><br>
      "Runas antigas, gravadas no metal. Cada uma pede um preço — em moedas e em sangue derramado."<br><br>
      ${currentLine}<br>
      Você tem <span class="fo-gold">${p.gold}</span> moedas.
    </div>`;

  const voltarHtml = `
    <div style="text-align:center;margin-top:18px">
      <button class="fo-back-btn" onclick="closeFerreiroOverlay();openGozenPopup()">↩ Voltar à ferraria</button>
    </div>`;

  openFerreiroOverlay('✨ RUNA DA ARMA', introHtml + cardsHTML + voltarHtml);

  setTimeout(() => applyWeaponEnchantVisual(current), 100);
}

// Evolui a runa pro próximo tier. Só aceita o tier seguinte da ordem.
function enchantSelect(tierId) {
  const tier = getEnchantTier(tierId);
  if (!tier) return;
  const p = G.player;

  if (tier.req.locked) { notify('🔒 Esse encantamento ainda está bloqueado.', 'red'); return; }
  if (p._weaponEnchant === tierId) { notify('Essa runa já está ativa!', 'gold'); return; }

  const next = getNextEnchantTier(p._weaponEnchant || null);
  if (!next || next.id !== tierId) { notify('⚠ A runa evolui em ordem — um tier por vez.', 'red'); return; }

  const req = checkEnchantReq(tier);
  if (!req.ok) { notify(`⚠ ${req.reason}`, 'red'); return; }

  ensureRunaMateriais();
  const usaEstoque = (p.runasMateriais[tierId] || 0) > 0;
  if (!usaEstoque && p.gold < tier.cost) { notify('◈ Sem moedas suficientes!', 'red'); return; }

  // Remove a runa anterior (a evolução substitui, não guarda como material)
  const prev = p._weaponEnchant ? getEnchantTier(p._weaponEnchant) : null;
  if (prev) _enchantRemoveFromPlayer(p, prev);

  // Paga: runa guardada tem prioridade sobre moedas
  if (usaEstoque) p.runasMateriais[tierId] -= 1;
  else            p.gold -= tier.cost;

  p._weaponEnchant = tierId;
  _enchantApplyToPlayer(p, tier);

  // Conquistas de forja — Runa A/S/SS (marcos únicos)
  if (window.Achievements && ['A', 'S', 'SS'].includes(tierId)) {
    Achievements.unlock('ach_runa_' + tierId.toLowerCase());
  }

  updateHUD();
  applyWeaponEnchantVisual(tierId);
  notify(prev ? `✨ Runa evoluída: ${prev.label} → ${tier.label}!` : `✨ ${tier.label} gravada na arma!`, tier.color || 'gold');
  addLog(`Runa ${prev ? 'evoluída para' : 'gravada:'} ${tier.label}. (${usaEstoque ? 'runa guardada' : tier.cost + '◈'})`, 'loot');

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

// ─────────────────────────────────────────────────────────────
//  MASMORRAS MAIORES — lista de flags reconhecidas como "maior"
//  pra fins de fusão de runas (Runa SS exige 2 concluídas).
//
//  Hoje: Sombras (evento canônico) + Kappa (Torre #2).
//  Quando implementar Inazami, Urso Ancestral, Raiju e Tengu,
//  só adiciona a flag de conclusão de cada uma nessa lista —
//  não precisa mexer em mais nada.
// ─────────────────────────────────────────────────────────────
const MAJOR_DUNGEON_FLAGS = [
  'dungeonSombrasConcluida',
  'dungeonKappaCleared',
  // 'dungeonInazamiCleared',      // ← adicionar quando existir
  // 'dungeonUrsoAncestralCleared',// ← adicionar quando existir
  // 'dungeonRaijuCleared',        // ← adicionar quando existir
  // 'dungeonTenguCleared',        // ← adicionar quando existir
];

// Retorna o total de masmorras maiores concluídas
function countMajorDungeons() {
  return MAJOR_DUNGEON_FLAGS.reduce((n, flag) => n + (G[flag] ? 1 : 0), 0);
}

// Verifica se qualquer masmorra foi concluída
function anyDungeonCleared() {
  return MAJOR_DUNGEON_FLAGS.some(flag => !!G[flag]);
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

// ─────────────────────────────────────────────────────────────
//  RECICLAR ENCANTAMENTO ATUAL — vira material de fusão direto,
//  sem precisar comprar outra runa por cima pra "empurrar" a
//  atual pro estoque (truque que existia mas não era explicado
//  em lugar nenhum da UI).
// ─────────────────────────────────────────────────────────────
function recycleCurrentEnchant() {
  const p = G.player;
  const prevId = p._weaponEnchant || null;
  if (!prevId) { notify('⚠ Sua arma não tem encantamento pra reciclar.', 'red'); return; }

  const prevTier = getEnchantTier(prevId);
  if (prevTier) _enchantRemoveFromPlayer(p, prevTier);

  p._weaponEnchant = null;
  recycleEnchantToMaterial(prevId);
  updateHUD();
  applyWeaponEnchantVisual(null);
  addLog(`Runa ${prevId} reciclada manualmente em material.`, 'loot');

  storyNode_fusao_runas();
}
window.recycleCurrentEnchant = recycleCurrentEnchant;

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
    if (prevTier) _enchantRemoveFromPlayer(G.player, prevTier);
    recycleEnchantToMaterial(prev);
  }

  // Consome ingredientes
  for (const ing of recipe.ingredients) {
    G.player.runasMateriais[ing.id] -= ing.qty;
  }

  // Equipa nova runa e aplica bônus
  G.player._weaponEnchant = resultId;
  // Conquistas de forja — Runa A/S/SS (marcos únicos, não repete o aviso
  // se o jogador trocar de runa e voltar depois).
  if (window.Achievements && ['A', 'S', 'SS'].includes(resultId)) {
    Achievements.unlock('ach_runa_' + resultId.toLowerCase());
  }
  const tier = getEnchantTier(resultId);
  _enchantApplyToPlayer(G.player, tier);

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

  const recycleBtnHtml = curTier
    ? `<div style="margin:10px 0 4px;text-align:center;">
        <button onclick="recycleCurrentEnchant()" style="
          background:rgba(255,255,255,0.05);
          border:1px solid rgba(200,200,200,0.3);
          color:#ccc;
          font-family:'Noto Serif JP',serif;
          font-size:0.72rem;
          letter-spacing:1px;
          padding:8px 14px;
          cursor:pointer;
        ">♻ RECICLAR ${curTier.label} EM MATERIAL</button>
        <div style="font-size:0.65rem;color:#666;margin-top:4px;">Remove o encantamento da arma e guarda como 1× material de fusão.</div>
       </div>`
    : '';

  const introHtml = `
    <div id="ferreiro-overlay-intro">
      Gozen abre uma gaveta de ferro que você nunca tinha visto antes. Dentro, moldes antigos gravados em bronze e pedra negra.<br><br>
      "Fusão de runas é diferente de encantamento comum. Você precisa de runas como material — e de ter provado seu valor nas masmorras."<br><br>
      "Se já tem uma runa gravada e não quer usar mais, eu reciclo. Vira material pra fusão. É isso ou deixar parada."<br><br>
      ${curLine}
    </div>${recycleBtnHtml}`;

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

  let greeting;
  if (!G._gozenPrimeiraVisita) {
    G._gozenPrimeiraVisita = true;
    greeting = `Gozen levanta os olhos da bigorna só por um instante, avaliando você dos pés à cabeça sem pressa.\n\n"Uma cara nova por aqui." Ele bate a marreta contra a bancada, de leve. "Já que veio até a forja — vamos ver o que posso fazer por você."`;
  } else {
    greeting = greetByClass[cls] || `"Hmm. Você parece alguém que sabe usar uma lâmina — e que vai precisar dela." O ferreiro Gozen limpa as mãos e examina seu equipamento.`;
  }

  // Reação se alguma receita fixada (📌) já estiver pronta pra craftar
  const _pinPronto = (window.CRAFT_PIN || []).find(id => {
    const r = GOZEN_CRAFT.find(x => x.id === id);
    if (!r || (r.requer && !r.requer())) return false;
    const temOuro = !r.goldCost || (G.player.gold || 0) >= r.goldCost;
    return temOuro && r.cost.every(c => _gozenItemQty(c.id) >= c.qty);
  });
  const _receitaPronta = _pinPronto ? GOZEN_CRAFT.find(x => x.id === _pinPronto) : null;
  const pinLine = _receitaPronta
    ? `<div class="gz-tutorial">🔥 Você já tem tudo pra fazer ${_receitaPronta.name}!</div>`
    : '';

  const showTutorialHint = !G._tutorialEnchantSeen && !G.player._weaponEnchant && (G.player.level || 1) >= 3;
  const tutorialLine = showTutorialHint
    ? `<div class="gz-tutorial">💡 Nível 3 atingido — grave sua primeira Runa!</div>`
    : '';

  // Monta as opções
  const enchantE = G.player._weaponEnchant;
  const enchantT = enchantE ? getEnchantTier(enchantE) : null;
  const enchantLabel = enchantT ? `Runa Ativa: ${enchantT.label}` : 'Gravar Runa';

  ensureRunaMateriais();
  const runasTotal = Object.values(G.player.runasMateriais || {}).reduce((a,b)=>a+b,0);

  const opcoes = [
    { icon:'✨', label: enchantLabel,       sub: runasTotal > 0 ? `Evoluir runa (${runasTotal} guardada${runasTotal>1?'s':''})` : 'Evoluir sua runa', action: 'enchant'  },
    { icon:'🌟', label: 'Ascensões',        sub: 'Evoluir sua arma',      action: 'ascensao' },
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
    greeting + tutorialLine + pinLine +
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
  } else if (action === 'ascensao') {
    closeGozenPopup();
    if (typeof openAscensionPanel === 'function') {
      openAscensionPanel();
    } else {
      console.error('[Ascensão] openAscensionPanel não encontrado — verifique se ascensao_vilarejo.js foi carregado.');
    }
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
  {
    id: 'peitoral_floresta',
    name: 'Peitoral da Floresta de Clivor',
    icon: '🌳',
    desc: 'Armadura de casca viva e folhas entrelaçadas. Par do Amuleto de Tierra — juntos ativam Proficiência da Floresta.',
    effect: 'DEF+8 HP+25',
    cost: [
      { id:'pele_lobo', name:'Pele de Lobo',  icon:'🐾', qty:5 },
      { id:'pelo_rato', name:'Pelo Rançoso',  icon:'🐾', qty:6 },
      { id:'pedra',     name:'Pedra',         icon:'🪨', qty:9 },
    ],
    goldCost: 400,
    result: { id:'peitoral_floresta', name:'Peitoral da Floresta de Clivor', icon:'🌳', imgSrc:'Imagens/Armaduras/Picsart_26-07-05_14-45-40-087.png', type:'equipamento', equipSlot:'armadura', def:8, hp:25, weight:1.2, desc:'Casca viva e folhas entrelaçadas, crescidas sobre uma armação de pedra da floresta de Clivor. Junto ao Amuleto de Tierra, desperta uma ressonância antiga.' },
  },
  {
    id: 'frasco_veneno',
    name: 'Frasco Venenoso',
    icon: '🧪',
    desc: 'Preenche um frasco vazio com veneno concentrado. Necessário para usar Veneno Rápido.',
    effect: '1 uso de Veneno Rápido',
    classOnly: 'assassino',
    cost: [
      { id:'veneno_aranha', name:'Glândula Venenosa', icon:'☠️', qty:1 },
      { id:'frasco_vazio', name:'Frasco Vazio',      icon:'🧴', qty:1 },
    ],
    result: { id:'frasco_veneno', name:'Frasco Venenoso', icon:'🧪', imgSrc:'Imagens/icones/materiais/frascovenenoso.png', type:'material', desc:'Frasco cheio de veneno concentrado. Necessário para usar Veneno Rápido.' },
  },
  {
    id: 'couraca_rei_selva',
    name: 'Couraça do Rei da Selva',
    icon: '🐆',
    desc: 'Peitoral forjado com presas e couro de bestas. Cresce através de cada caça com mérito. Upável com Essência do Rei da Selva (máx 3 níveis).',
    effect: 'HP+45 / Fervor Selvagem + Fúria do Caçador / Forjável',
    cost: [
      { id:'presa_gorila', name:'Presa de Gorila',     icon:'🦷', qty:5 },
      { id:'pegada_gorila', name:'Pegada de Gorila',   icon:'🐾', qty:10 },
    ],
    goldCost: 1500,
    result: { id:'couraca_rei_selva', name:'Couraça do Rei da Selva', icon:'🐆', imgSrc:'Imagens/Armaduras/armadu.png', type:'equipamento', equipSlot:'armadura', def:3, hp:45, weight:2.0, forjavel:true, forjaMax:3, forjaCustoPorNivel:'essencia_rei_selva', forjaHpPorNivel:15, forjaDefPorNivel:2, desc:'Peitoral forjado a partir de presas e couro de bestas da floresta. Pulsa com a fúria acumulada de cada caça. Equipada com armadura, concede crescimento permanente através de cada inimigo com mérito abatido enquanto usada — e em combate crítico, desperta uma fúria selvagem que amplifica seu ataque.' },
  },
  {
    id: 'bolsa_aitemu',
    name: 'Bolsa Aitemu',
    icon: '👝',
    desc: 'Bolsa encantada ligada ao Armazém do Alberon. Toque nela na bolsa para RETIRAR itens de qualquer lugar. Não guarda itens, e não funciona em batalha nem em masmorras.',
    effect: 'Abre o armazém (só retirar)',
    unico: true,
    requer: () => !!(typeof armazemLiberado === 'function' && armazemLiberado()),
    cost: [
      { id:'teia_aranha', name:'Teia',         icon:'🕸️', qty:10 },
      { id:'pele_lobo',   name:'Pele de Lobo', icon:'🐾', qty:15 },
      { id:'la_encantada',name:'Lã Encantada', icon:'✨', qty:6  },
    ],
    goldCost: 2000,
    result: { id:'bolsa_aitemu', name:'Bolsa Aitemu', icon:'👝', imgSrc:'Imagens/icones/bolsa_Aitemu.png', type:'ferramenta', abreArmazem:true, desc:'Bolsa de couro encantada, ligada ao Armazém do Alberon. Toque nela para retirar itens guardados de qualquer lugar. Não serve para guardar, nem funciona em batalha ou em masmorras.', weight:0.5 },
  },
];

function _gozenItemQty(id) {
  return (G.player.inventory || []).filter(i => i.id === id).reduce((s,i) => s + (i.qty||1), 0);
}

// ─────────────────────────────────────────────────────────────
//  SISTEMA DE PRESENTES — dar itens específicos a NPCs por afinidade
// ─────────────────────────────────────────────────────────────
const NPC_PRESENTES = {
  mitsue: {
    nome: 'Dona Mitsue',
    img: 'Imagens/personagens/DMitsue.png',
    voltar: () => storyNode_estalagem(),
    itens: {
      pedra: {
        nome: 'Pedra',
        primeira: `Ela pega a pedra e a examina contra a luz da lamparina.\n\n"Uma pedra branca do rio..." Sua voz fica distante por um instante. "É por causa delas que esse lugar tem esse nome. Obrigada por lembrar disso, aventureiro."`,
        repetida: `"Outra pedra do rio?" Ela sorri, guardando junto às outras. "Você tem bom olho."`,
        recompensa: { gold: 20 },
        recompensaRepetida: { gold: 5 },
      },
      erva_cura: {
        nome: 'Erva Medicinal',
        primeira: `Ela cheira o punhado de ervas e sorri de leve.\n\n"Minha mãe fazia chá com isso, nas noites frias." Guarda com cuidado atrás do balcão. "Vou usar bem, prometo."`,
        repetida: `"Mais ervas? Vou fazer um bom chá hoje à noite." Ela agradece com a cabeça.`,
        recompensa: { gold: 20 },
        recompensaRepetida: { gold: 5 },
      },
    },
  },
  yuki: {
    nome: 'Sacerdotisa Yuki',
    voltar: () => storyNode_templo(),
    itens: {
      cristal_mana: {
        nome: 'Cristal de Mana',
        primeira: `Ela segura o cristal com as duas mãos, os olhos fechados por um instante.\n\n"Este cristal ainda ressoa com energia pura." Ela o deposita diante das estátuas da Trindade. "Uma boa oferenda, viajante."`,
        repetida: `"Outro cristal..." Ela sorri serenamente e o deposita junto aos demais.`,
        recompensa: { gold: 25 },
        recompensaRepetida: { gold: 8 },
      },
      fragmento_sombra: {
        nome: 'Fragmento de Sombra',
        primeira: `Ela hesita antes de tocar o fragmento — depois o envolve num pano branco.\n\n"Isto carrega escuridão de verdade." Ela fecha os olhos, murmurando algo baixo. "Eu cuido disso. Foi corajoso trazer até aqui."`,
        repetida: `Ela recebe o fragmento com cautela, já familiarizada com o ritual de purificação.`,
        recompensa: { gold: 25 },
        recompensaRepetida: { gold: 8 },
      },
    },
  },
};

function _presenteItemQty(id) {
  return (G.player.inventory || []).filter(i => i.id === id).reduce((s,i) => s + (i.qty||1), 0);
}

function _presenteRemoverItem(id) {
  const inv = G.player.inventory;
  for (let i = inv.length - 1; i >= 0; i--) {
    if (inv[i].id === id) {
      inv[i].qty = (inv[i].qty || 1) - 1;
      if (inv[i].qty <= 0) inv.splice(i, 1);
      return true;
    }
  }
  return false;
}

function npcAbrirPresentear(npcKey) {
  const cfg = NPC_PRESENTES[npcKey];
  if (!cfg) return;

  const disponiveis = Object.entries(cfg.itens).filter(([id]) => _presenteItemQty(id) > 0);

  if (!disponiveis.length) {
    setStory(cfg.nome.toUpperCase(),
      `Você procura na bolsa, mas não tem nada que ${cfg.nome} gostaria de receber agora.`,
      [{ icon:'↩', text:'Voltar', action: cfg.voltar }], cfg.img);
    return;
  }

  const opcoes = disponiveis.map(([id, item]) => ({
    icon: '🎁',
    text: `Dar ${item.nome} (x${_presenteItemQty(id)})`,
    action: () => npcDarPresente(npcKey, id),
  }));
  opcoes.push({ icon:'↩', text:'Voltar', action: cfg.voltar });

  setStory(cfg.nome.toUpperCase(), `O que você quer dar de presente?`, opcoes, cfg.img);
}
window.npcAbrirPresentear = npcAbrirPresentear;

function npcDarPresente(npcKey, itemId) {
  const cfg = NPC_PRESENTES[npcKey];
  const item = cfg && cfg.itens[itemId];
  if (!cfg || !item) return;
  if (!_presenteRemoverItem(itemId)) { if (typeof notify === 'function') notify('Você não tem mais esse item.', 'red'); return; }

  G._presentesDados = G._presentesDados || {};
  const chave = `${npcKey}_${itemId}`;
  const primeiraVez = !G._presentesDados[chave];
  G._presentesDados[chave] = true;

  const recompensa = primeiraVez ? item.recompensa : (item.recompensaRepetida || item.recompensa);
  if (recompensa && recompensa.gold) {
    G.player.gold = (G.player.gold || 0) + recompensa.gold;
    if (typeof notify === 'function') notify(`◈ +${recompensa.gold} moedas`, 'gold');
  }

  if (typeof updateHUD === 'function') updateHUD();
  setStory(cfg.nome.toUpperCase(), primeiraVez ? item.primeira : item.repetida,
    [{ icon:'↩', text:'Voltar', action: cfg.voltar }], cfg.img);
}
window.npcDarPresente = npcDarPresente;

// ─────────────────────────────────────────────────────────────
//  CRAFT TRACKER — pin de receitas (aba flutuante, não salva)
// ─────────────────────────────────────────────────────────────
window.CRAFT_PIN = [];
const CRAFT_PIN_MAX = 2;

function toggleCraftPin(recipeId) {
  const idx = CRAFT_PIN.indexOf(recipeId);
  if (idx >= 0) {
    CRAFT_PIN.splice(idx, 1);
  } else {
    if (CRAFT_PIN.length >= CRAFT_PIN_MAX) {
      if (typeof notify === 'function') notify(`Só dá pra fixar ${CRAFT_PIN_MAX} receitas por vez.`, 'red');
      return;
    }
    CRAFT_PIN.push(recipeId);
  }
  renderCraftTracker();
  const fo = document.getElementById('ferreiro-overlay');
  if (fo && fo.classList.contains('active') && typeof storyNode_gozen_craft === 'function') {
    storyNode_gozen_craft();
  }
}
window.toggleCraftPin = toggleCraftPin;

function _craftTrackerRecipe(id) {
  return GOZEN_CRAFT.find(r => r.id === id) || null;
}

function renderCraftTracker() {
  const existingTab = document.getElementById('craft-tracker-tab');
  const existingPanel = document.getElementById('craft-tracker-panel');

  if (!CRAFT_PIN.length) {
    if (existingTab) existingTab.remove();
    if (existingPanel) existingPanel.remove();
    return;
  }

  let tab = existingTab;
  if (!tab) {
    tab = document.createElement('div');
    tab.id = 'craft-tracker-tab';
    tab.onclick = () => toggleCraftTrackerPanel();
    tab.style.cssText = `
      position:fixed; right:0; top:46%; transform:translateY(-50%);
      z-index:870; background:rgba(20,14,8,0.92);
      border:1px solid rgba(200,150,10,0.4); border-right:none;
      border-radius:10px 0 0 10px; padding:10px 8px;
      display:flex; flex-direction:column; align-items:center; gap:2px;
      cursor:pointer; box-shadow:-2px 0 8px rgba(0,0,0,0.4);`;
    document.body.appendChild(tab);
  }
  tab.innerHTML = `
    <img src="Imagens/icones/Picsart_26-07-07_23-25-44-730.png" style="width:1.3rem;height:1.3rem;object-fit:contain;" onerror="this.outerHTML='🧪'">
    <span style="font-size:0.62rem;color:#e0c870;font-family:'Noto Serif JP',serif;">${CRAFT_PIN.length}</span>`;

  renderCraftTrackerPanel();
}
window.renderCraftTracker = renderCraftTracker;

function toggleCraftTrackerPanel() {
  const panel = document.getElementById('craft-tracker-panel');
  if (!panel) return;
  const isOpen = panel.dataset.open === '1';
  panel.style.transform = isOpen ? 'translate(110%,-50%)' : 'translate(0,-50%)';
  panel.dataset.open = isOpen ? '0' : '1';
}
window.toggleCraftTrackerPanel = toggleCraftTrackerPanel;

function renderCraftTrackerPanel() {
  let panel = document.getElementById('craft-tracker-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'craft-tracker-panel';
    panel.style.cssText = `
      position:fixed; right:0; top:46%; transform:translate(110%,-50%);
      max-height:60vh; width:min(72vw, 260px);
      z-index:869; background:rgba(10,7,4,0.97);
      border:1px solid rgba(200,150,10,0.35); border-right:none;
      border-radius:10px 0 0 10px;
      transition:transform 0.25s ease;
      overflow-y:auto; padding:12px 12px 14px; box-shadow:-4px 0 16px rgba(0,0,0,0.5);`;
    document.body.appendChild(panel);
  }

  const cards = CRAFT_PIN.map(id => {
    const r = _craftTrackerRecipe(id);
    if (!r) return '';
    const imgSrc = r.result && r.result.imgSrc || null;
    const iconHtml = imgSrc
      ? `<img src="${imgSrc}" style="width:40px;height:40px;object-fit:contain;mix-blend-mode:screen;" onerror="this.outerHTML='<span style=\\'font-size:1.6rem;\\'>${r.icon || '⚗️'}</span>';">`
      : `<span style="font-size:1.6rem;">${r.icon || '⚗️'}</span>`;
    const matHtml = r.cost.map(c => {
      const have = _gozenItemQty(c.id);
      const color = have >= c.qty ? '#80d080' : '#d06060';
      return `<div style="font-size:0.68rem;color:${color};">${c.icon} ${c.name} ${have}/${c.qty}</div>`;
    }).join('');
    return `
      <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(200,150,10,0.2);
        border-radius:8px; padding:10px; margin-bottom:10px; position:relative;">
        <button onclick="toggleCraftPin('${id}')" title="Remover da lista"
          style="position:absolute; top:6px; right:6px; width:24px; height:24px;
          display:flex; align-items:center; justify-content:center;
          background:rgba(200,60,40,0.18); border:1px solid rgba(200,80,60,0.45);
          border-radius:50%; color:#e08878; font-size:0.8rem; line-height:1; cursor:pointer;">✕</button>
        <div style="display:flex; gap:10px; align-items:center; margin-bottom:6px;">
          ${iconHtml}
          <span style="font-family:'Noto Serif JP',serif; font-size:0.82rem; color:#e0c870;">${r.name}</span>
        </div>
        ${matHtml}
      </div>`;
  }).join('');

  panel.innerHTML = `
    <div style="font-family:'Noto Serif JP',serif; color:#e0c870; font-size:0.85rem;
      margin-bottom:12px; border-bottom:1px solid rgba(200,150,10,0.25); padding-bottom:8px;">
      📌 Craft fixado
    </div>
    ${cards}`;
}
window.renderCraftTrackerPanel = renderCraftTrackerPanel;

function storyNode_gozen_craft() {
  const clsId = (G.player.classData && G.player.classData.id) || '';
  const rows = GOZEN_CRAFT.filter(r => (!r.classOnly || r.classOnly === clsId) && (!r.requer || r.requer())).map(r => {
    const temOuro  = !r.goldCost || (G.player.gold || 0) >= r.goldCost;
    const canCraft = r.cost.every(c => _gozenItemQty(c.id) >= c.qty) && temOuro;
    const costHtml = r.cost.map(c => {
      const have = _gozenItemQty(c.id);
      const color = have >= c.qty ? '#80d080' : '#d06060';
      return `<span style="color:${color};font-size:0.7rem;">${c.icon}${c.name} ${have}/${c.qty}</span>`;
    }).join('<span style="color:rgba(200,150,10,0.3);margin:0 4px;">·</span>')
      + (r.goldCost ? `<span style="color:rgba(200,150,10,0.3);margin:0 4px;">·</span><span style="color:${temOuro?'#80d080':'#d06060'};font-size:0.7rem;">◈ ${G.player.gold||0}/${r.goldCost}</span>` : '');

    // Ícone: tenta imgSrc do result, senão emoji
    const imgSrc = r.result && (r.result.imgSrc || (typeof ITEM_DB !== 'undefined' && ITEM_DB[r.result] && ITEM_DB[r.result].imgSrc)) || null;
    const iconHtml = imgSrc
      ? `<img src="${imgSrc}" style="width:58px;height:58px;object-fit:contain;display:block;"
           onerror="this.outerHTML='<span style=\\'font-size:2.4rem;line-height:58px;display:block;text-align:center;\\'>${r.icon||'⚗️'}</span>'">`
      : `<span style="font-size:2.4rem;line-height:58px;display:block;text-align:center;">${r.icon||'⚗️'}</span>`;

    return `
      <div style="background:rgba(255,255,255,0.03);
        border:1px solid rgba(200,150,10,${canCraft?'0.32':'0.10'});
        border-radius:10px;padding:12px 14px;margin-bottom:10px;">
        <div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:10px;">
          <div style="width:58px;height:58px;flex-shrink:0;display:flex;align-items:center;justify-content:center;
            background:rgba(0,0,0,0.3);border-radius:8px;border:1px solid rgba(200,150,10,0.15);">
            ${iconHtml}
          </div>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;margin-bottom:4px;">
              <span style="font-family:'Noto Serif JP',serif;font-size:0.9rem;
                color:${canCraft?'#e0c870':'rgba(180,140,60,0.5)'};">${r.name}</span>
              <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                <span style="font-size:0.68rem;color:#80d4a0;background:rgba(0,100,50,0.2);
                  padding:3px 8px;border-radius:5px;white-space:nowrap;">${r.effect}</span>
                <button onclick="toggleCraftPin('${r.id}')" title="Fixar receita"
                  style="background:none;border:none;font-size:1rem;line-height:1;cursor:pointer;padding:0;
                  color:${CRAFT_PIN.includes(r.id) ? '#e0c870' : 'rgba(200,150,10,0.35)'};">📌</button>
              </div>
            </div>
            <div style="font-size:0.7rem;color:rgba(200,180,140,0.55);margin-bottom:6px;">${r.desc}</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px;">${costHtml}</div>
          </div>
        </div>
        <button onclick="gozenDoCraft('${r.id}')"
          style="width:100%;padding:9px;
          background:${canCraft?'rgba(150,100,10,0.45)':'rgba(60,60,60,0.25)'};
          border:1px solid rgba(200,150,10,${canCraft?'0.45':'0.08'});
          color:${canCraft?'#e0c870':'rgba(150,130,80,0.35)'};
          font-family:'Noto Serif JP',serif;font-size:0.78rem;
          border-radius:7px;cursor:${canCraft?'pointer':'default'};letter-spacing:0.03em;"
          ${canCraft?'':'disabled'}>
          ${canCraft ? '⚗️ Forjar' : '🔒 Sem materiais'}
        </button>
      </div>`;
  }).join('');

  openFerreiroOverlay('⚗️ CRAFT DE ITENS',
    `<div style="font-size:0.72rem;color:rgba(200,150,10,0.55);
      margin-bottom:14px;padding:8px 12px;
      background:rgba(0,0,0,0.2);border-radius:7px;
      border-left:3px solid rgba(200,150,10,0.3);">
      "Traga os materiais certos e eu transformo isso em algo útil." — Gozen
    </div>${rows}`
  );
  // Primeira vez que a Bolsa Aitemu aparece no craft: mostra o tutorial dela (uma vez por save)
  if (typeof aitemuTutorialPrimeiraVez === 'function') setTimeout(aitemuTutorialPrimeiraVez, 300);
}
window.storyNode_gozen_craft = storyNode_gozen_craft;

function gozenDoCraft(recipeId) {
  const r = GOZEN_CRAFT.find(x => x.id === recipeId);
  if (!r) return;
  if (r.classOnly && r.classOnly !== ((G.player.classData && G.player.classData.id) || '')) {
    if (typeof notify === 'function') notify('Só sua classe pode fabricar isso!', 'red');
    return;
  }
  if (r.requer && !r.requer()) { if (typeof notify === 'function') notify('Esta receita ainda não foi liberada.', 'red'); return; }
  if (r.unico && _gozenItemQty(r.id) > 0) { if (typeof notify === 'function') notify('Você já tem este item!', 'red'); return; }
  const temOuro  = !r.goldCost || (G.player.gold || 0) >= r.goldCost;
  const canCraft = r.cost.every(c => _gozenItemQty(c.id) >= c.qty) && temOuro;
  if (!canCraft) { if (typeof notify === 'function') notify(!temOuro ? 'Ouro insuficiente!' : 'Sem materiais suficientes!', 'red'); return; }

  // Consumir ouro
  if (r.goldCost) G.player.gold = (G.player.gold || 0) - r.goldCost;

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
  if (typeof addItem === 'function') addItem(r.result, 1, { revealPopup: true });
  if (window.Achievements) Achievements.unlock('ach_craft');
  if (typeof notify === 'function') notify(`⚗️ ${r.name} criado!`, 'gold');
  if (typeof updateHUD === 'function') updateHUD();

  // Craftou com sucesso → some da lista de fixados automaticamente
  const _pinIdx = CRAFT_PIN.indexOf(recipeId);
  if (_pinIdx >= 0) {
    CRAFT_PIN.splice(_pinIdx, 1);
    if (typeof renderCraftTracker === 'function') renderCraftTracker();
  } else if (typeof renderCraftTrackerPanel === 'function' && CRAFT_PIN.length) {
    renderCraftTrackerPanel();
  }

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
  { id:'frasco_vazio_buy', name:'Frasco Vazio', icon:'🧴', price:4, result:{ id:'frasco_vazio', name:'Frasco Vazio', icon:'🧴', imgSrc:'Imagens/icones/materiais/frascoVazio.png', type:'material', desc:'Frasco de vidro vazio. Pode ser preenchido com veneno na ferraria de Gozen.', weight:0.2 } },
];

// Preço de compra já considerando o desconto por mérito com o vilarejo.
function _gozenPrecoCompra(item) {
  const descontoPct = (typeof getRepDesconto === 'function') ? getRepDesconto() : 0;
  return Math.max(1, Math.round(item.price * (1 - descontoPct / 100)));
}

function storyNode_gozen_loja() {
  const descontoPct = (typeof getRepDesconto === 'function') ? getRepDesconto() : 0;
  const rows = GOZEN_LOJA.map(item => {
    const precoFinal = _gozenPrecoCompra(item);
    const canBuy = G.player.gold >= precoFinal;
    const imgSrc = item.result && item.result.imgSrc ? item.result.imgSrc : null;
    const iconHtml = imgSrc
      ? `<img src="${imgSrc}" style="width:62px;height:62px;object-fit:contain;mix-blend-mode:screen;display:block;flex-shrink:0;"
           onerror="this.outerHTML='<span style=\\'font-size:2.8rem;line-height:62px;text-align:center;display:block;\\'>${item.icon||'📦'}</span>'">`
      : `<span style="font-size:2.8rem;line-height:62px;display:block;text-align:center;flex-shrink:0;">${item.icon||'📦'}</span>`;
    const precoHtml = descontoPct > 0
      ? `<span style="text-decoration:line-through;opacity:0.5;margin-right:4px;">◈${item.price}</span>◈ ${precoFinal} moedas`
      : `◈ ${precoFinal} moedas`;
    return `
      <div style="display:flex;align-items:center;gap:14px;
        background:rgba(255,255,255,0.04);
        border:1px solid rgba(200,150,10,${canBuy?'0.28':'0.12'});
        border-radius:10px;padding:12px 14px;margin-bottom:10px;">
        <div style="width:62px;height:62px;flex-shrink:0;display:flex;align-items:center;justify-content:center;
          background:rgba(0,0,0,0.3);border-radius:8px;border:1px solid rgba(200,150,10,0.15);">
          ${iconHtml}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-family:'Noto Serif JP',serif;font-size:0.92rem;color:${canBuy?'#e0c870':'rgba(180,140,60,0.6)'};margin-bottom:3px;">${item.name}</div>
          <div style="font-size:0.72rem;color:rgba(200,150,10,0.6);">${precoHtml}</div>
        </div>
        <button onclick="gozenComprar('${item.id}')"
          style="flex-shrink:0;padding:9px 16px;
          background:${canBuy?'rgba(150,100,10,0.5)':'rgba(60,60,60,0.3)'};
          border:1px solid rgba(200,150,10,${canBuy?'0.5':'0.1'});
          color:${canBuy?'#e0c870':'rgba(150,130,80,0.35)'};
          font-family:'Noto Serif JP',serif;font-size:0.78rem;
          border-radius:7px;cursor:${canBuy?'pointer':'default'};
          font-weight:600;letter-spacing:0.02em;"
          ${canBuy?'':'disabled'}>
          ${canBuy ? 'Comprar' : 'Sem ouro'}
        </button>
      </div>`;
  }).join('');

  const descontoLine = descontoPct > 0
    ? `<div style="font-size:0.62rem;color:#90c870;margin-top:4px;">🤝 ${descontoPct}% de desconto por seu mérito com o povo!</div>`
    : '';

  openFerreiroOverlay('🛒 SUPRIMENTOS',
    `<div style="display:flex;flex-direction:column;gap:2px;
      background:rgba(0,0,0,0.25);border-radius:8px;padding:10px 14px;margin-bottom:14px;
      border:1px solid rgba(200,150,10,0.2);">
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="font-size:1.1rem;">◈</span>
        <span style="font-family:'Noto Serif JP',serif;font-size:0.85rem;color:rgba(200,150,10,0.7);">
          Você tem <strong style="color:#e0c870;font-size:1rem;">${G.player.gold}</strong> moedas
        </span>
      </div>
      ${descontoLine}
    </div>${rows}`
  );
}
window.storyNode_gozen_loja = storyNode_gozen_loja;

function gozenComprar(itemId) {
  const item = GOZEN_LOJA.find(x => x.id === itemId);
  if (!item) return;
  const precoFinal = _gozenPrecoCompra(item);
  if (G.player.gold < precoFinal) { if (typeof notify === 'function') notify('Sem ouro suficiente!', 'red'); return; }
  G.player.gold -= precoFinal;
  if (typeof addItem === 'function') addItem(item.result, 1);
  if (window.Achievements) Achievements.unlock('ach_compra');
  if (typeof notify === 'function') notify(`🛒 ${item.name} comprado!`, 'gold');
  if (typeof updateHUD === 'function') updateHUD();
  setTimeout(() => storyNode_gozen_loja(), 200);
}
window.gozenComprar = gozenComprar;

// ─────────────────────────────────────────────────────────────
//  5-F. GOZEN — VENDER ITENS
// ─────────────────────────────────────────────────────────────

// Preço de venda por tipo/id
// ── Reajuste de economia (2026-07): materiais de masmorra/dungeon
//    vendiam pelo mesmo preço de material comum (fallback 2). Agora têm
//    preço próprio, escalado pela raridade/fase da dungeon de origem.
const GOZEN_PRECO_VENDA = {
  // ── Comuns (Floresta de Clivor / trilhas iniciais) ──
  pedra:             1,
  teia_aranha:       2,
  pelo_rato:         2,
  pena_corvo:        3,
  po_cristal:        4,
  calda_raposa:      4,
  glandula:          4,   // Glândula Venenosa (id canônico no ITEM_DB)
  veneno_aranha:     4,   // mesmo item, id usado no loot inline da aranha
  pele_lobo:         4,
  pele_cobra:        4,
  frasco_vazio:      3,
  frasco_veneno:     5,
  po_osso:           5,
  lamina_quebrada:   6,
  espada_enferrujada: 6,
  escama_sereia:     14,  // Kappa — boss Sereia das Profundezas

  // ── Mérito (Herói do Vilarejo+) — Urso Pardo / Cobra Verde / Urso Kodiak ──
  peconha_esmeralda:   20,  // Cobra Verde
  garra_urso_kodiak:   22,  // Urso Kodiak
  garra_urso_pardo:    25,  // Urso Pardo (chefe)
  presa_urso_kodiak:   30,  // Urso Kodiak — drop mais raro do bicho (40% vs 55%)

  // ── Mérito (Lendário) — Gorila, encontro raríssimo (12%) ──
  pegada_gorila:       50,  // drop mais comum do Gorila (55%)
  presa_gorila:        65,  // drop menos comum do Gorila (45%)
  essencia_rei_selva:  1000, // item mais raro do jogo — 2% de drop, boss com só 12% de chance de aparecer (exceção ao teto de 200)

  // ── Dungeon das Sombras (Fase 9) — bem mais raros, preço bem acima do comum ──
  argila_sombria:        7,
  po_sombra:             8,   // material de conserto do Coração Incandescente
  osso_marionete:        9,
  humor_espectral:       10,
  cinza_espectral:       10,
  chave_vazio:           12,
  fragmento_sombra:      12,
  essencia_espiritual:   14,
  essencia_fantasma:     15,
  emblema_rei_maldito:   18,
  fragmento_cristal_negro: 18,
  eco_cristalizado:      22,
  essencia_sombras:      22,
  katana_muichi:         24,
  essencia_lorde:        30,  // Essência do Lorde — condensada do chefe final da Dungeon das Sombras

  // ── Por tipo (fallback pra qualquer item sem preço específico acima) ──
  material:   3,
  consumível: 6,
};

function _gozenPreco(item) {
  const base = GOZEN_PRECO_VENDA[item.id] || GOZEN_PRECO_VENDA[item.type] || 1;
  const bonusPct = (typeof getRepBonusRecompensa === 'function') ? getRepBonusRecompensa() : 0;
  return Math.max(1, Math.round(base * (1 + bonusPct / 100)));
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
    const dbEntry = (typeof ITEM_DB !== 'undefined' && ITEM_DB[item.id]) || {};
    const imgSrc  = item.imgSrc || dbEntry.imgSrc || null;
    const iconHtml = imgSrc
      ? `<img src="${imgSrc}" style="width:60px;height:60px;object-fit:contain;mix-blend-mode:screen;display:block;flex-shrink:0;"
           onerror="this.outerHTML='<span style=\\'font-size:2.5rem;line-height:60px;display:block;text-align:center;\\'>${item.icon||'📦'}</span>'">`
      : `<span style="font-size:2.5rem;line-height:60px;display:block;text-align:center;flex-shrink:0;">${item.icon||'📦'}</span>`;
    return `
      <div style="display:flex;align-items:center;gap:14px;
        background:rgba(255,255,255,0.04);
        border:1px solid rgba(200,150,10,0.18);
        border-radius:10px;padding:12px 14px;margin-bottom:10px;">
        <div style="width:60px;height:60px;flex-shrink:0;display:flex;align-items:center;justify-content:center;
          background:rgba(0,0,0,0.3);border-radius:8px;border:1px solid rgba(200,150,10,0.15);">
          ${iconHtml}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-family:'Noto Serif JP',serif;font-size:0.88rem;color:#e0c870;margin-bottom:3px;
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.name} <span style="color:rgba(200,150,10,0.6);">×${qty}</span></div>
          <div style="font-size:0.7rem;color:rgba(200,150,10,0.55);">◈ ${preco}/un <span style="color:rgba(200,150,10,0.35);">·</span> Total: <span style="color:#c8a840;">◈${preco*qty}</span></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0;">
          ${qty > 1 ? `<button onclick="gozenVender('${item.id}',1)"
            style="padding:7px 12px;background:rgba(100,70,10,0.4);border:1px solid rgba(200,150,10,0.3);
            color:#c8a040;font-size:0.72rem;border-radius:6px;cursor:pointer;font-family:inherit;
            font-weight:600;">×1</button>` : ''}
          <button onclick="gozenVender('${item.id}',${qty})"
            style="padding:7px 12px;background:rgba(150,100,10,0.5);border:1px solid rgba(200,150,10,0.45);
            color:#e0c870;font-size:0.72rem;border-radius:6px;cursor:pointer;font-family:inherit;
            font-weight:600;">Tudo</button>
        </div>
      </div>`;
  }).join('');

  openFerreiroOverlay('💰 VENDER ITENS',
    `<div style="display:flex;justify-content:space-between;align-items:center;
      background:rgba(0,0,0,0.25);border-radius:8px;padding:10px 14px;margin-bottom:14px;
      border:1px solid rgba(200,150,10,0.2);">
      <span style="font-family:'Noto Serif JP',serif;font-size:0.82rem;color:rgba(200,150,10,0.7);">
        Você tem <strong style="color:#e0c870;font-size:0.95rem;">◈ ${G.player.gold}</strong> moedas
      </span>
      <button onclick="gozenVenderTudo()" style="padding:7px 14px;
        background:rgba(120,80,10,0.55);border:1px solid rgba(200,150,10,0.45);
        color:#e0c870;font-size:0.75rem;border-radius:7px;cursor:pointer;
        font-family:'Noto Serif JP',serif;font-weight:600;">
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
  // Se a Dungeon das Sombras já foi concluída mas a cutscene de revelação do
  // taberneiro (festa → mapa → Yuki/Runa) ainda não rodou, ela tem prioridade
  // sobre a taverna genérica — mesmo se o jogador chegar aqui por um caminho
  // que não passa por storyNode_vilarejo (ex.: atalho vindo de outra tela).
  // Sem isso, dava pra "pular" a revelação e cair direto na taverna normal,
  // que ainda trata a Cidade das Pedra como segredo.
  if (G.dungeonSombrasConcluida && !G._cutscenePosSombrasVista) {
    storyNode_vilarejo_festa_pos_sombras();
    return;
  }

  // Cada rumor só aparece quando a condição de progresso é satisfeita.
  // Os 3 primeiros (lich_*) ficam sempre disponíveis, como antes.
  const RUMORES_TAVERNA = [
    { id:'lich_1', unlocked: () => true,
      text: `"O Senhor das Cinzas... eu o vi. Antes de se tornar um lich, era um rei. Um bom rei. Mas queria vencer a morte — e pagou o preço." Ele ri amargo. "Agora governa um castelo de cinzas e servidores mortos."` },
    { id:'lich_2', unlocked: () => true,
      text: `"Tem gente que voltou do castelo. Poucos. Muito poucos. Todos dizem a mesma coisa — que a voz do Senhor das Cinzas ressoa nas paredes antes mesmo de você ouvi-lo."` },
    { id:'lich_3', unlocked: () => true,
      text: `"As criaturas na floresta ficaram maiores desde que o lich rompeu os selos. Quem o derrotar será lendário... ou estará morto." Ele ri e entorna o sake.` },
    { id:'sombras_1', unlocked: () => !!G.dungeonSombrasConcluida,
      text: `"Soube que você voltou da Ilha das Sombras inteiro." Ele te olha com um misto de respeito e desconfiança. "Isso não é pouca coisa, sabia? A maioria que entra lá some de vez."` },
    { id:'pedra_1', unlocked: () => !!G.cidadePedraLiberada,
      text: `"Cidade das Pedra..." Ele baixa a voz, olhando de canto. "Dizem que lá o ar é tão pesado de pó que só quem carrega a runa certa sobrevive um dia inteiro. Você tem sorte de ter essa runa."` },
    { id:'flmaligna_1', unlocked: () => (G._florestaMalignaVitorias || 0) >= 1,
      text: `"A floresta anda mais quieta desde que você começou a limpar ela à noite." Ele dá um gole longo. "Quieta de um jeito ruim. Como se estivesse... esperando algo maior."` },
    { id:'flmaligna_2', unlocked: () => (G._florestaMalignaVitorias || 0) >= 3,
      text: `"Três chefes na Floresta Maligna e ainda de pé." Ele assobia baixo. "Continua assim e vou ter que começar a te chamar de outra coisa além de 'aventureiro'."` },
    { id:'nivel5_1', unlocked: () => (G.player.level || 1) >= 5,
      text: `"Você não é mais o mesmo aventureiro perdido que entrou aqui pela primeira vez." Ele ergue o copo num brinde discreto. "Só cuidado pra não deixar isso subir à cabeça."` },
  ];

  function rumoresDisponiveis() {
    return RUMORES_TAVERNA.filter(r => r.unlocked());
  }

  setScene('taverna');
  
  // Função auxiliar para mostrar o diálogo de resposta do taverneiro
  function mostraTaverneiro(texto) {
    if (typeof setStory === 'function') {
      setStory('TABERNEIRO', texto, [{ icon:'↩', text:'Voltar à taverna', action: storyNode_taverna }], 'Imagens/personagens/Tviajante.png');
    }
  }
  
  // Função auxiliar para mostrar rumor do velho bêbado
  function mostraRumor(rumor) {
    if (typeof setStory === 'function') {
      setStory('VELHO BÊBADO', rumor.text, [{ icon:'↩', text:'Voltar à taverna', action: storyNode_taverna }], 'Imagens/personagens/Tviajante.png');
    }
  }
  
  setStory('TABERNEIRO',
    `"Ei, aventureiro! Sente-se."\n\nA taverna cheira a cedro queimado e caldo de missô. No canto, um velho bêbado gesticula para um viajante jovem que claramente não acredita em nada.`,
    [
      { icon:'💬', text:'Perguntar sobre a Cidade das Pedra', action: function() {
          const texto = G.cidadePedraLiberada
            ? `Ele baixa a voz, como se as paredes da taverna também estivessem escutando.\n\n"A Cidade das Pedra guarda mais segredos do que eu poderia te contar numa tarde. Lá dentro, tudo é feito de pedra cinza — até os telhados. E o povo... o povo é feito de outra coisa. Só eles aguentam aquele ar."\n\n"Você tem a runa da Yuki agora. Isso já é mais do que a maioria consegue."`
            : `Ele hesita, olhando para a porta como se alguém pudesse estar ouvindo.\n\n"Ainda não é hora de falar sobre isso. Termine o que está pela frente primeiro — o resto vem depois."`;
          mostraTaverneiro(texto);
      }},
      { icon:'🗝️', text:'Perguntar por que ele te testou', action: function() {
          const texto = G.dungeonSombrasConcluida
            ? `Ele gira o copo entre os dedos antes de responder.\n\n"Não foi por prazer, se é isso que você tá pensando." Ele ri, sem humor. "Muita gente passou por essa porta dizendo que ia salvar o vilarejo. A maioria não voltou da Ilha das Sombras — ou voltou diferente. Eu precisava saber que tipo de pessoa você era antes de te mandar pra algo maior."\n\n"Você voltou o mesmo. Isso conta muito."`
            : `Ele sorri de canto, evasivo. "Testar? Eu só sirvo sake, aventureiro. Talvez a floresta esteja te deixando desconfiado demais."`;
          mostraTaverneiro(texto);
      }},
      { icon:'👂', text:'Ouvir o rumor do velho bêbado', action: function() {
          G._rumoresOuvidos = G._rumoresOuvidos || {};
          const disponiveis = rumoresDisponiveis();
          const naoOuvidos = disponiveis.filter(r => !G._rumoresOuvidos[r.id]);
          // Prioriza um rumor novo (recém-desbloqueado); se já ouviu tudo, repete um aleatório.
          const pool = naoOuvidos.length ? naoOuvidos : disponiveis;
          const escolhido = pool[Math.floor(Math.random() * pool.length)];
          G._rumoresOuvidos[escolhido.id] = true;
          mostraRumor(escolhido);
      }},
      { icon:'🎲', text:'Jogar Dama com o Taberneiro', action: function() {
          if (typeof abrirDamaTaverna === 'function') abrirDamaTaverna();
      }},
      { icon:'🌑', text:'Falar sobre a Ilha das Sombras', action: storyNode_dungeon_sombras_intro },
      { icon:'↩', text:'Sair da taverna', action: storyNode_vilarejo },
    ], 'Imagens/personagens/Tviajante.png'
  );
}

// ─────────────────────────────────────────────────────────────
//  7. TEMPLO
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
//  SISTEMA DE BUFFS DA DIVINA TRINDADE
//  Buffs duram TRINDADE_BUFF_BATALHAS batalhas (ou até voltar ao vilarejo)
//  Hond (Fogo) — ATQ+15
//  Celia (Natureza) — MaxHP+30 e HP+30
//  Astegar (Luz) — DEF+12
// ─────────────────────────────────────────────────────────────

// Quantas batalhas cada bênção dura (ajuste aqui pra deixar mais curta/longa)
const TRINDADE_BUFF_BATALHAS = 3;

const TRINDADE_BUFFS = {
  hond:    { nome:'Hond',    elemento:'Fogo',      stat:'atk',   bonus:15, cor:'#ff6030', icon:'🔥',
             descBuff:'ATQ +15 durante ' + TRINDADE_BUFF_BATALHAS + ' batalhas.' },
  celia:   { nome:'Celia',   elemento:'Natureza',  stat:'maxHp', bonus:30, cor:'#60c040', icon:'🌿',
             descBuff:'HP máximo +30 durante ' + TRINDADE_BUFF_BATALHAS + ' batalhas.' },
  astegar: { nome:'Astegar', elemento:'Luz',       stat:'def',   bonus:12, cor:'#f0e080', icon:'✨',
             descBuff:'DEF +12 durante ' + TRINDADE_BUFF_BATALHAS + ' batalhas.' },
};

function _trindadeApplyBuff(key) {
  const p = G.player;
  const def = TRINDADE_BUFFS[key];
  if (!def) return;
  if (!G.player._trindadeBuffs) G.player._trindadeBuffs = {};
  if (G.player._trindadeBuffs[key]) return; // já ativo
  G.player._trindadeBuffs[key] = TRINDADE_BUFF_BATALHAS; // batalhas restantes
  if (def.stat === 'atk')   { p.atk   = (p.atk   || 0) + def.bonus; }
  if (def.stat === 'def')   { p.def   = (p.def   || 0) + def.bonus; }
  if (def.stat === 'maxHp') {
    p.maxHp = (p.maxHp || 0) + def.bonus;
    p.hp    = Math.min(p.maxHp, (p.hp || 0) + def.bonus);
  }
  if (window.updateHUD) updateHUD();
}

function _trindadeClearBuffs() {
  const p = G.player;
  const tb = p._trindadeBuffs;
  if (!tb) return;
  if (tb.hond)    { p.atk   = Math.max(0, (p.atk   || 0) - TRINDADE_BUFFS.hond.bonus);    }
  if (tb.celia)   {
    p.maxHp = Math.max(1, (p.maxHp || 0) - TRINDADE_BUFFS.celia.bonus);
    p.hp    = Math.min(p.maxHp, p.hp || 0);
  }
  if (tb.astegar) { p.def   = Math.max(0, (p.def   || 0) - TRINDADE_BUFFS.astegar.bonus); }
  p._trindadeBuffs = {};
  if (window.updateHUD) updateHUD();
}
window._trindadeClearBuffs = _trindadeClearBuffs;

// Chamada no fim de cada batalha (ver endBattle em palDinh.js): gasta 1 batalha
// de cada bênção ativa e remove o bônus quando acaba.
function _trindadeTickBattle() {
  const p = G.player;
  const tb = p && p._trindadeBuffs;
  if (!tb) return;
  let mudou = false;
  ['hond','celia','astegar'].forEach(k => {
    if (!tb[k]) return;
    let restam = (typeof tb[k] === 'number') ? tb[k] : TRINDADE_BUFF_BATALHAS; // saves antigos (true)
    restam--;
    const def = TRINDADE_BUFFS[k];
    if (restam > 0) {
      tb[k] = restam;
      if (typeof addLog === 'function') addLog(`${def.icon} Bênção de ${def.nome}: restam ${restam} batalha(s).`, 'info');
      return;
    }
    if (def.stat === 'atk')   p.atk   = Math.max(0, (p.atk   || 0) - def.bonus);
    if (def.stat === 'def')   p.def   = Math.max(0, (p.def   || 0) - def.bonus);
    if (def.stat === 'maxHp') { p.maxHp = Math.max(1, (p.maxHp || 0) - def.bonus); p.hp = Math.min(p.maxHp, p.hp || 0); }
    delete tb[k];
    mudou = true;
    if (typeof _hideBuffPanel === 'function') _hideBuffPanel('trindade-' + k);
    if (typeof notify === 'function') notify(`${def.icon} A bênção de ${def.nome} se dissipou.`, 'gold');
    if (typeof addLog === 'function') addLog(`A bênção de ${def.nome} se dissipou.`, 'info');
  });
  if (mudou && window.updateHUD) updateHUD();
}
window._trindadeTickBattle = _trindadeTickBattle;


function storyNode_templo() {
  setScene('templo');
  hideEnemy();

  const p = G.player;
  const tb = p._trindadeBuffs || {};

  // Linha de status dos buffs ativos
  const ativos = ['hond','celia','astegar'].filter(k => tb[k]);
  const ativosStr = ativos.length
    ? `\n\n🌟 Buffs ativos: ${ativos.map(k => `${TRINDADE_BUFFS[k].icon} ${TRINDADE_BUFFS[k].nome}`).join(', ')}`
    : '';

  const opcoes = [];

  // ── Hond — ATQ ──
  const hondLabel = tb.hond
    ? `🔥 Hond — Fogo (ATIVO — ATQ +15)`
    : `🔥 Hond — Fogo (30◈ — ATQ +15 por ${TRINDADE_BUFF_BATALHAS} batalhas)`;
  opcoes.push({ icon:'🔥', text: hondLabel, action: () => {
    if (tb.hond) { notify('🔥 Hond já está abençoando você!', 'gold'); return; }
    if (p.gold < 30) { notify('◈ Sem moedas suficientes!', 'red'); return; }
    p.gold -= 30;
    _trindadeApplyBuff('hond');
    notify('🔥 Bênção de Hond: ATQ +15 ativa!', '#ff6030');
    addLog('Recebeu Bênção de Hond (ATQ+15).', 'loot');
    storyNode_templo();
  }});

  // ── Celia — HP ──
  const celiaLabel = tb.celia
    ? `🌿 Celia — Natureza (ATIVA — HP máx. +30)`
    : `🌿 Celia — Natureza (30◈ — HP máx. +30 por ${TRINDADE_BUFF_BATALHAS} batalhas)`;
  opcoes.push({ icon:'🌿', text: celiaLabel, action: () => {
    if (tb.celia) { notify('🌿 Celia já está abençoando você!', 'gold'); return; }
    if (p.gold < 30) { notify('◈ Sem moedas suficientes!', 'red'); return; }
    p.gold -= 30;
    _trindadeApplyBuff('celia');
    notify('🌿 Bênção de Celia: HP máx. +30 ativa!', '#60c040');
    addLog('Recebeu Bênção de Celia (HP máx.+30).', 'heal');
    storyNode_templo();
  }});

  // ── Astegar — DEF ──
  const astegarLabel = tb.astegar
    ? `✨ Astegar — Luz (ATIVA — DEF +12)`
    : `✨ Astegar — Luz (30◈ — DEF +12 por ${TRINDADE_BUFF_BATALHAS} batalhas)`;
  opcoes.push({ icon:'✨', text: astegarLabel, action: () => {
    if (tb.astegar) { notify('✨ Astegar já está abençoando você!', 'gold'); return; }
    if (p.gold < 30) { notify('◈ Sem moedas suficientes!', 'red'); return; }
    p.gold -= 30;
    _trindadeApplyBuff('astegar');
    notify('✨ Bênção de Astegar: DEF +12 ativa!', '#f0e080');
    addLog('Recebeu Bênção de Astegar (DEF+12).', 'loot');
    storyNode_templo();
  }});

  opcoes.push({ icon:'🎁', text:'Dar um presente à Sacerdotisa', action: () => npcAbrirPresentear('yuki') });
  opcoes.push({ icon:'↩', text:'Sair do Templo', action: storyNode_vilarejo });

  setStory('SACERDOTISA YUKI',
    `As três estátuas da Divina Trindade repousam em silêncio sagrado.\n\n"Viajante, os deuses te observam. Cada bênção dura apenas algumas batalhas — e se dissolve ao retornar ao vilarejo."\n\nVocê tem ${p.gold} moedas.${ativosStr}`,
    opcoes
  );
}

// ─────────────────────────────────────────────────────────────
//  8. MERCADO — removido a pedido do Marcelo (20/08). Pin, node de
//  história e horário de funcionamento tirados; ach_compra ainda
//  dispara normalmente por outros vendedores (ver linha ~2045).
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
//  9. ESTALAGEM — DONA MITSUE
// ─────────────────────────────────────────────────────────────

function storyNode_estalagem() {
  setScene('estalagem');
  hideEnemy();
  if (typeof hideStoryCutscene === 'function') hideStoryCutscene();
  // ── HuBi: cutscene única de revelação da pedra, se o mérito já chegou lá ──
  if (typeof hubiCheckCutsceneRevelacao === 'function' && hubiCheckCutsceneRevelacao()) return;
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
      { icon:'🎁', text:'Dar um presente', action: () => npcAbrirPresentear('mitsue') },
      ...(G.hubi && G.hubi.revelado ? [{
        icon: '💠',
        text: G.hubi.despertado ? 'HuBi' : 'Sobre a pedra HuBi',
        action: hubiNode_estalagemMenu,
      }] : []),
      ...(G.hubi && G.hubi.despertado && typeof hubiNode_amigaAntiga === 'function' ? [{
        icon: '💬',
        text: '"Você já teve amigos assim?"',
        action: hubiNode_amigaAntiga,
      }] : []),
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
  enterBtn.onclick = inacessivel ? null : () => { closeDungeonPopup(); closeTorreOverlay(); entrarMasmorraTorre(id); };

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
