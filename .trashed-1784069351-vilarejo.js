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
