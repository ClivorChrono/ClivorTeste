// =============================================================
//  TEMPLO_VAZIO_ECOANTE.JS — Chronicles of Clivor
//  Masmorra 1 de 6 — O Templo do Vazio Ecoante
//  Depende de: palDinh.js · vilarejo.js
//
//  FASES PREVISTAS:
//    Fase 1  → ✅ Entrada e Primeiro Sangue
//    Fase 2  → 🔒 (a implementar)
//    Fase 3  → 🔒 (a implementar)
//    Fase 4+ → 🔒 (a implementar)
// =============================================================

'use strict';

// ─────────────────────────────────────────────────────────────
//  1. INIMIGOS DO TEMPLO DO VAZIO ECOANTE
// ─────────────────────────────────────────────────────────────

const TVE_INIMIGOS = {

  // ── Fase 1 ──────────────────────────────────────────────
  espectro_menor: {
    id: 'espectro_menor',
    name: 'Espectro Menor',
    icon: '👻',
    img: 'Imagens/personagens/espectro.png',
    elemento: 'sombra',
    hp: 38, atk: 13, def: 4,
    xp: 22, gold: 12,
    desc: 'Uma forma espectral sem rosto. Flutua em silêncio absoluto — exceto pelo eco distante de um grito antigo que ressoa ao seu redor.',
    loot: [
      { id:'cinza_espectral', name:'Cinza Espectral', icon:'🌫️', chance:0.7, weight:0.1, type:'material', desc:'Resíduo de uma alma que se perdeu no vazio. Ainda pulsa levemente.' },
      { id:'po_cristal',      name:'Pó de Cristal',  icon:'💎', imgSrc:'Imagens/icones/materiais/poCrista.png', chance:0.4, weight:0.2, type:'material', desc:'Pó mágico de cristal.' },
      { id:'erva_cura',       name:'Erva Medicinal', icon:'🌿', imgSrc:'Imagens/cosméticos/erva.png', chance:0.2, weight:0.2, type:'consumível', desc:'Recupera 15 HP.', heal:15 },
    ],
  },

  // ── Fase 2 — Mini-boss ─────────────────────────────────
  colhedor_almas: {
    id: 'colhedor_almas',
    name: 'Colhedor de Almas',
    icon: '💀',
    img: 'Imagens/personagens/espectro.png',
    elemento: 'sombra',
    hp: 600, atk: 34, def: 10,
    xp: 120, gold: 65,
    isBoss: true,
    hiddenHp: true,          // HP nunca aparece — exibe "??? HP" na UI
    desc: 'Uma silhueta de capuz que não toca o chão. Onde passa, o ar apodrece. Mantém a Gadanha presa ao solo para atrair presas — e colhe as almas dos que chegam até ela.',
    loot: [
      { id:'cinza_espectral',  name:'Cinza Espectral',     icon:'🌫️', chance:1.0, weight:0.1, type:'material',  desc:'Resíduo de uma alma que se perdeu no vazio.' },
      { id:'fragmento_sombra', name:'Fragmento de Sombra', icon:'🌑', chance:0.8, weight:0.3, type:'material',  desc:'Um fragmento de sombra solidificada. Ainda escuro por dentro.' },
      { id:'pocao_media',      name:'Poção Média', icon:'🫙', imgSrc:'Imagens/cosméticos/PoçãoM.png', chance:0.65, weight:0.5, type:'consumível', desc:'Restaura 60 HP.', heal:60 },
      { id:'chave_vazio',      name:'Chave do Vazio', icon:'🗝️', chance:1.0, weight:0.1, type:'material', desc:'Uma chave fria como a morte. Abre algo mais fundo no templo.' },
    ],
  },

  // ── Fases 3+ (a preencher) ─────────────────────────────
  // espectro_guardiao: { ... },   // Fase 3
  // sacerdote_eco:     { ... },   // Fase 4+
};

// ─────────────────────────────────────────────────────────────
//  2. DADOS DA MASMORRA
// ─────────────────────────────────────────────────────────────

const TEMPLO_VAZIO_ECOANTE = {
  id:          'temploVazioEcoante',
  ordem:       1,
  nome:        'O Templo do Vazio Ecoante',
  bossIcon:    'Imagens/icones/garrio.png',
  bossNome:    'Espectro Ancestral',
  descricao:   'Ruínas esquecidas onde o silêncio ganhou voz própria. Dizem que os ecos ali dentro repetem os últimos gritos de quem se perdeu — e que algo, no fundo do templo, ainda escuta.',
  status:      'disponivel',

  stats: [
    { label: 'Dificuldade',  value: '⭐⭐☆☆☆' },
    { label: 'Fases',        value: '4+ Fases' },
    { label: 'Chefe',        value: 'Espectro Ancestral' },
    { label: 'Recompensa',   value: 'A revelar' },
  ],

  entrar() {
    if (typeof closeTorreOverlay === 'function') closeTorreOverlay();
    setTimeout(() => temploVazioEcoante_intro(), 120);
  }
};

window.TEMPLO_VAZIO_ECOANTE = TEMPLO_VAZIO_ECOANTE;

if (typeof registerDungeon === 'function') {
  registerDungeon(TEMPLO_VAZIO_ECOANTE);
}

// ─────────────────────────────────────────────────────────────
//  3. UTILITÁRIOS INTERNOS
// ─────────────────────────────────────────────────────────────

// Garante que o jogador está fora de batalha e na cena certa
function _tve_scene(scene) {
  G.inBattle = false;
  G.location = scene;
  if (typeof setScene === 'function') setScene(scene);
  if (typeof hideEnemy === 'function') hideEnemy();
}

// Batalha com callback automático pós-vitória
function _tve_battle(enemy, onWin) {
  G._dungeonBattleCallback = onWin;
  if (typeof startBattle === 'function') startBattle(enemy);
}

// Aviso de fase com notificação dourada
function _tve_notify(msg) {
  if (typeof notify === 'function') notify(msg, 'gold');
}

// ─────────────────────────────────────────────────────────────
//  4. INTRO — ENTRADA NO TEMPLO
//     Narrativa em múltiplos atos antes da Fase 1
// ─────────────────────────────────────────────────────────────

function temploVazioEcoante_intro() {
  _tve_scene('tve-entrada'); // Paisagem de aproximação — fundo escuro/sombrio
  setStory(
    'TEMPLO DO VAZIO ECOANTE',
    `A entrada se abre diante de você como uma ferida na pedra.\n\nPilares de basalto negro flanqueiam o corredor — cobertos de runas que ninguém consegue ler. O chão absorve o som dos seus passos. O ar é denso, frio demais para o clima lá fora.`,
    [
      { icon:'▶', text:'Avançar com cautela', action: temploVazioEcoante_intro_2 },
    ]
  );
}

function temploVazioEcoante_intro_2() {
  _tve_scene('tve-interior');
  setStory(
    'TEMPLO DO VAZIO ECOANTE',
    `Você adentra o templo.\n\nA escuridão não é comum — ela tem textura, como se estivesse viva. Tochas antigas queimam com uma chama violeta imóvel, sem ventilação para alimentá-las.\n\nNo fundo do corredor, algo ecoa. Não é um som. É a ausência dele — um vazio que pulsa.`,
    [
      { icon:'▶', text:'Continuar', action: temploVazioEcoante_intro_3 },
    ]
  );
}

function temploVazioEcoante_intro_3() {
  _tve_scene('tve-f1');

  // Mensagem que remete à força do lugar — aparece como notificação atmosférica
  setTimeout(() => {
    _tve_notify('⚠️ Uma presença impossível de ignorar pressiona sua mente.');
  }, 600);

  setStory(
    '— O ECO —',
    `Você para.\n\nNão por escolha — seus pés simplesmente travam. Uma aura se expande a partir das paredes, das pedras, do próprio ar. Não é hostil. É pesada. Antiga. Como se o templo inteiro respirasse ao seu redor e aguardasse.\n\n<div style="margin:12px 0;padding:10px 12px;border-left:3px solid rgba(140,60,255,0.6);background:rgba(60,0,120,0.15);border-radius:4px;font-family:'Noto Serif JP',serif;font-size:0.8rem;color:#c8a8ff;letter-spacing:0.5px;line-height:1.7;font-style:italic;">"Este lugar não pertence aos vivos.<br>Mas você já foi convidado.<br>Pelo eco. Pelo vazio.<br>Pelo que ainda grita aqui dentro."</div>\n\nVocê sente que este templo precisa de algo que apenas quem avança pode dar. Salvação — ou destruição. O templo não distingue.`,
    [
      { icon:'⚔️', text:'Avançar — Fase 1: Primeiro Sangue', action: temploVazioEcoante_fase1_inicio },
    ]
  );
}

// ─────────────────────────────────────────────────────────────
//  5. FASE 1 — PRIMEIRO SANGUE
//     Um espectro menor bloqueia a passagem
// ─────────────────────────────────────────────────────────────

function temploVazioEcoante_fase1_inicio() {
  _tve_scene('tve-f1');
  setStory(
    'FASE 1 — O CORREDOR DOS ECOS',
    `O primeiro corredor é longo e estreito. Estátuas de pedra flanqueiam as paredes — figuras encurvadas com as mãos no rosto, como se tentassem abafar um som que não para.\n\nNo centro do corredor, suspenso a meio metro do chão, uma forma translúcida ganha contorno. Sem rosto. Sem peso. Com um grito preso onde deveria haver boca.`,
    [
      { icon:'⚔️', text:'Enfrentar o Espectro Menor', action: temploVazioEcoante_fase1_batalha },
      { icon:'💊', text:'Usar item antes de combater', action: temploVazioEcoante_fase1_batalha }, // mesma ação — placeholder p/ inventário
    ]
  );
}

function temploVazioEcoante_fase1_batalha() {
  _tve_scene('tve-f1');
  _tve_battle(TVE_INIMIGOS.espectro_menor, temploVazioEcoante_fase1_vitoria);
}

function temploVazioEcoante_fase1_vitoria() {
  _tve_scene('tve-f1');

  setTimeout(() => {
    _tve_notify('✨ O espectro se dissolve — sua cinza paira no ar antes de sumir.');
  }, 300);

  setStory(
    'FASE 1 — CONCLUÍDA',
    `O espectro se fragmenta em silêncio. Seus restos — uma névoa violeta fina — flutuam para cima e desaparecem pelas rachaduras do teto.\n\nO corredor abre. Uma porta de pedra gravada com o símbolo de uma boca fechada começa a ranger lentamente.\n\nO que há além ainda não é visível. Mas o eco voltou — diferente agora. Mais próximo. Como se soubesse que você passou.`,
    [
      { icon:'▶', text:'Avançar para a Fase 2', action: temploVazioEcoante_oraculo_inicio },
      { icon:'🏃', text:'Sair da masmorra',      action: temploVazioEcoante_sair },
    ]
  );
}

// ─────────────────────────────────────────────────────────────
//  6. FASE 2 — O ORÁCULO SILENCIOSO + GADANHA + COLHEDOR DE ALMAS
// ─────────────────────────────────────────────────────────────

const TVE_ORACULO_PERGUNTAS = [
  {
    texto: 'O eco neste templo é formado por quê?',
    opcoes: [
      { texto: 'Pelos gritos dos que morreram aqui',   correta: true  },
      { texto: 'Por magia elemental de vento',          correta: false },
      { texto: 'Por uma armadilha mecânica antiga',     correta: false },
    ],
  },
  {
    texto: 'O que a chama violeta das tochas indica?',
    opcoes: [
      { texto: 'O fogo foi corrompido por energia espectral', correta: true  },
      { texto: 'As tochas usam cristal colorido',              correta: false },
      { texto: 'Alguém passou aqui recentemente',              correta: false },
    ],
  },
  {
    texto: 'Por que a Gadanha está presa ao chão?',
    opcoes: [
      { texto: 'O Colhedor de Almas a mantém como isca', correta: true  },
      { texto: 'Ela é um artefato selado por sacerdotes', correta: false },
      { texto: 'O peso dela é sobrenatural demais',       correta: false },
    ],
  },
];

let _tve_oraculo_acertos     = 0;
let _tve_oraculo_perguntaIdx = 0;

function temploVazioEcoante_oraculo_inicio() {
  _tve_oraculo_acertos     = 0;
  _tve_oraculo_perguntaIdx = 0;
  _tve_scene('tve-f2');

  setTimeout(() => _tve_notify('🔮 Uma presença interroga sua mente...'), 400);

  setStory(
    '— O ORÁCULO SILENCIOSO —',
    `No centro da câmara, uma estátua sem cabeça ergue os braços para cima. Entre seus dedos, algo pulsa — não luz, não sombra. É uma frequência.\n\nVocê sente as perguntas antes de ouvi-las. Como se já soubesse que há um teste. E que ele vai custar algo se você errar.\n\n<div style="margin:10px 0;padding:8px 12px;border-left:3px solid rgba(140,60,255,0.5);background:rgba(60,0,120,0.12);border-radius:4px;font-family:'Noto Serif JP',serif;font-size:0.75rem;color:#c8a8ff;line-height:1.6;font-style:italic;">"O templo observa.\nResponda com verdade — ou sangre."</div>`,
    [
      { icon:'🔮', text:'Responder ao Oráculo', action: () => temploVazioEcoante_oraculo_pergunta(0) },
      { icon:'🏃', text:'Ignorar e avançar',    action: temploVazioEcoante_pos_oraculo },
    ]
  );
}

function temploVazioEcoante_oraculo_pergunta(idx) {
  _tve_oraculo_perguntaIdx = idx;
  const q      = TVE_ORACULO_PERGUNTAS[idx];
  const total  = TVE_ORACULO_PERGUNTAS.length;
  const opcoes = [...q.opcoes].sort(() => Math.random() - 0.5);
  const choices = opcoes.map(op => ({
    icon: '◈',
    text: op.texto,
    action: () => temploVazioEcoante_oraculo_resposta(op.correta, idx),
  }));
  setStory(
    `ORÁCULO — PERGUNTA ${idx + 1} DE ${total}`,
    `<div style="font-family:'Noto Serif JP',serif;font-size:0.85rem;color:#e8d8b8;line-height:1.7;padding:4px 0;">${q.texto}</div>`,
    choices
  );
}

function temploVazioEcoante_oraculo_resposta(correta, idx) {
  const p    = G.player;
  const prox = idx + 1;
  if (correta) {
    _tve_oraculo_acertos++;
    _tve_notify('✅ O eco ressoa com aprovação.');
  } else {
    const dano = Math.max(8, Math.floor(p.maxHp * 0.12));
    p.hp = Math.max(1, p.hp - dano);
    if (typeof updateHUD === 'function') updateHUD();
    _tve_notify(`💀 Errado. Você perde ${dano} HP.`);
  }
  if (prox < TVE_ORACULO_PERGUNTAS.length) {
    setTimeout(() => temploVazioEcoante_oraculo_pergunta(prox), 600);
  } else {
    setTimeout(() => temploVazioEcoante_oraculo_resultado(), 600);
  }
}

function temploVazioEcoante_oraculo_resultado() {
  const total   = TVE_ORACULO_PERGUNTAS.length;
  const acertos = _tve_oraculo_acertos;
  const p       = G.player;
  let textoResultado, choices;

  if (acertos === total) {
    const buffAtk = 4;
    p._tve_oraculo_buff = { atk: buffAtk };
    p.atk = (p.atk || 0) + buffAtk;
    if (typeof updateHUD === 'function') updateHUD();
    const pocao = { id:'pocao_media', name:'Poção Média', icon:'🫙', imgSrc:'Imagens/cosméticos/PoçãoM.png', type:'consumível', desc:'Restaura 60 HP.', heal:60 };
    if (typeof addItem === 'function') addItem(pocao, 2);
    _tve_notify('⭐ Oráculo completo! +4 ATQ e 2× Poção Média obtidos!');
    textoResultado = `<b style="color:#ffe080;">${acertos}/${total} respostas corretas.</b>\n\nO Oráculo recua. A frequência some. Algo no ar parece mais leve — como se o próprio templo reconhecesse seu valor.\n\nDuas poções pousam ao seus pés. Você sente sua determinação afiar como lâmina.\n\n<span style="color:#a0e0a0;font-size:0.78rem;">✅ +4 ATQ (buff temporário) · 2× Poção Média adicionada ao inventário</span>`;
    choices = [{ icon:'▶', text:'Seguir em frente', action: temploVazioEcoante_pos_oraculo }];
  } else {
    textoResultado = `<b style="color:#e07070;">${acertos}/${total} respostas corretas.</b>\n\nO Oráculo se cala. A frequência some com uma nota de desapontamento.\n\nVocê avança — um pouco mais fraco, mas ainda de pé.`;
    choices = [{ icon:'▶', text:'Continuar mesmo assim', action: temploVazioEcoante_pos_oraculo }];
  }
  setStory('ORÁCULO — RESULTADO', textoResultado, choices);
}

// ── Pós-oráculo: a Gadanha no chão ────────────────────────

function temploVazioEcoante_pos_oraculo() {
  _tve_scene('tve-f2');
  setStory(
    'FASE 2 — O BRAÇO ESQUERDO',
    `Além da câmara do Oráculo, o corredor se abre numa sala circular.\n\nO chão aqui é diferente — mais escuro, quase translúcido, como vidro sobre um abismo. Tochas extintas. Silêncio absoluto.\n\nE então você vê.\n\nNo centro da sala, encravada verticalmente no chão, uma foice.\n\nSua lâmina não é de metal. É de algo que absorve luz. A haste parece osso negro polido. E ao redor dela — uma aura. Roxa. Pulsante. Como um coração.\n\nO nome vem à sua mente antes de qualquer inscrição:`,
    [
      { icon:'🌑', text:'Examinar a Gadanha', action: temploVazioEcoante_gadanha_examinar },
    ]
  );
}

function temploVazioEcoante_gadanha_examinar() {
  _tve_scene('tve-f2');
  setStory(
    '⚔️ GADANHA',
    `<div style="margin:6px 0 12px;padding:10px 14px;border:1px solid rgba(140,60,255,0.45);border-top:2px solid rgba(140,60,255,0.9);background:rgba(30,0,60,0.3);border-radius:6px;">
  <div style="font-family:'Noto Serif JP',serif;font-size:0.9rem;font-weight:900;color:#c8a8ff;letter-spacing:1px;margin-bottom:4px;">GADANHA</div>
  <div style="font-size:0.68rem;color:rgba(200,150,255,0.6);letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Arma — Foice de Colheita / ???</div>
  <div style="font-size:0.75rem;color:#b8a8d0;line-height:1.6;border-left:2px solid rgba(140,60,255,0.35);padding-left:8px;font-style:italic;">Uma foice forjada em osso de criatura que nunca existiu. A lâmina não corta — ela extrai. Dizem que cada alma colhida alimenta aquele que a empunha.</div>
  <div style="margin-top:10px;font-size:0.7rem;color:rgba(200,150,255,0.5);">⚠️ Encravada no solo — não pode ser removida</div>
</div>

Você se abaixa e envolve a haste com as mãos.\n\nEla não cede. Não vibra. Não reage.\n\nÉ como tentar arrancar a raiz de uma árvore milenar com os dedos.\n\nE então você percebe — a Gadanha não está presa. Ela está sendo segurada.`,
    [
      { icon:'💀', text:'Tentar puxar com força', action: temploVazioEcoante_gadanha_revelar },
    ]
  );
}

function temploVazioEcoante_gadanha_revelar() {
  _tve_scene('tve-f2');
  setTimeout(() => _tve_notify('⚠️ Uma presença imensa emerge da sombra...'), 500);
  setStory(
    '— O COLHEDOR —',
    `Você puxa.\n\nA Gadanha não sai um milímetro.\n\nMas algo se move.\n\nDas sombras atrás da foice — das sombras que você jurava serem apenas sombras — uma forma emerge. Lenta. Alta demais para o teto que deveria bloqueá-la. Um capuz negro sem rosto dentro. Dois pontos de luz violeta onde deveriam estar os olhos.\n\nEle não grita. Não fala.\n\nMas você entende:\n\n<div style="margin:12px 0;padding:10px 12px;border-left:3px solid rgba(140,60,255,0.7);background:rgba(40,0,80,0.2);border-radius:4px;font-family:'Noto Serif JP',serif;font-size:0.82rem;color:#c8a8ff;line-height:1.8;font-style:italic;">"A Gadanha chama os tolos.\nVocê veio até mim.\nAgora eu colho."</div>\n\nO Colhedor de Almas ergue a mão — e a Gadanha voa para ela.`,
    [
      { icon:'⚔️', text:'Lutar — não há escolha', action: temploVazioEcoante_fase2_batalha },
    ]
  );
}

// ── Batalha e Vitória ─────────────────────────────────────

function temploVazioEcoante_fase2_batalha() {
  _tve_scene('tve-f2');
  _tve_battle(TVE_INIMIGOS.colhedor_almas, temploVazioEcoante_fase2_vitoria);
}

function temploVazioEcoante_fase2_vitoria() {
  _tve_scene('tve-f2');
  const p = G.player;

  // Remove buff do Oráculo se existia
  if (p._tve_oraculo_buff) {
    p.atk = Math.max(0, (p.atk || 0) - (p._tve_oraculo_buff.atk || 0));
    delete p._tve_oraculo_buff;
    if (typeof updateHUD === 'function') updateHUD();
  }

  // Gadanha como item colecionável
  const gadanha = {
    id:     'gadanha_colhedor',
    name:   'Gadanha',
    icon:   '🌙',
    imgSrc: 'Imagens/icones/gadanha.png',
    type:   'colecionável',
    weight: 2.0,
    desc:   'A foice do Colhedor de Almas. Forjada em osso de criatura que nunca existiu. A lâmina não corta carne — ela extrai alma. Exala uma aura roxa pulsante que não some nem ao sol.',
    flavor: '"Quem a empunha começa a ouvir os ecos."',
  };
  if (typeof addItem === 'function') addItem(gadanha, 1);

  setTimeout(() => { _tve_notify('💀 O Colhedor se fragmenta. A Gadanha é sua.'); }, 300);
  setTimeout(() => { _tve_notify('🌙 Gadanha adicionada ao inventário!'); }, 1200);

  setStory(
    'FASE 2 — CONCLUÍDA',
    `O Colhedor recua — não foge, não grita. Simplesmente se desintegra, camada por camada, até restar apenas o capuz caindo vazio no chão.\n\nA Gadanha cai junto. Desta vez, você a pega.\n\nEla é mais leve do que parece. Fria como pedra no fundo de um rio congelado. E a aura — roxa, pulsante — não desaparece. Você sente como se ela respirasse junto com você.\n\n<div style="margin:10px 0;padding:8px 12px;border:1px solid rgba(140,60,255,0.4);background:rgba(30,0,60,0.25);border-radius:5px;display:flex;align-items:center;gap:10px;">\n  <span style="font-size:1.5rem;">🌙</span>\n  <div><div style="font-family:'Noto Serif JP',serif;font-size:0.82rem;color:#c8a8ff;font-weight:700;">Gadanha</div><div style="font-size:0.7rem;color:rgba(200,160,255,0.65);">Item colecionável obtido</div></div>\n</div>\n\nO templo estremece. Uma rachadura nova abre na parede norte — fina, vertical, com luz roxa vazando pela borda.\n\nNão é uma porta. É mais como um convite. Ou um aviso.`,
    [
      { icon:'▶', text:'Avançar — Fase 3',  action: temploVazioEcoante_fase3_placeholder },
      { icon:'🏃', text:'Sair da masmorra', action: temploVazioEcoante_sair },
    ]
  );
}

// ─────────────────────────────────────────────────────────────
//  7. FASE 3+ — PLACEHOLDERS (a implementar)
// ─────────────────────────────────────────────────────────────

function temploVazioEcoante_fase3_placeholder() {
  _tve_scene('tve-f3');
  setStory(
    'FASE 3 — EM CONSTRUÇÃO',
    `Além da rachadura, o ar é diferente.\n\nMais pesado. Mais velho.\n\nO eco aqui não é mais um eco. É uma voz.\n\n<span style="color:rgba(200,150,10,0.5);font-style:italic;">— Esta fase ainda está sendo tecida. Volte em breve. —</span>`,
    [
      { icon:'↩', text:'Voltar', action: temploVazioEcoante_fase2_vitoria },
      { icon:'🏃', text:'Sair da masmorra', action: temploVazioEcoante_sair },
    ]
  );
}

// function temploVazioEcoante_fase3() { ... }   // A implementar
// function temploVazioEcoante_fase4() { ... }   // A implementar — boss final: Espectro Ancestral

// ─────────────────────────────────────────────────────────────
//  8. SAÍDA DA MASMORRA
// ─────────────────────────────────────────────────────────────

function temploVazioEcoante_sair() {
  const p = G.player;
  if (p._tve_oraculo_buff) {
    p.atk = Math.max(0, (p.atk || 0) - (p._tve_oraculo_buff.atk || 0));
    delete p._tve_oraculo_buff;
    if (typeof updateHUD === 'function') updateHUD();
  }
  _tve_notify('Você saiu do Templo do Vazio Ecoante.');
  if (typeof storyNode_vilarejo === 'function') storyNode_vilarejo();
}
