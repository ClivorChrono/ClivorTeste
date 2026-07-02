// =============================================================
//  TEMPLO_VAZIO_ECOANTE.JS — Chronicles of Clivor
//  Masmorra 1 de 6 — O Templo do Vazio Ecoante
//  Depende de: palDinh.js · vilarejo.js
//
//  FASES:
//    Fase 1  → ✅ Entrada e Primeiro Sangue (Espectro Menor)
//    Fase 2  → ✅ Oráculo + Gadanha + Espírito Ancestral (Mini-boss)
//    Fase 3  → ✅ A Sala Infinita — Boss: Espectro Ancestral (Ecorrom)
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
    img: 'Imagens/personagens/file_00000000247c71f58871ae58a3990a1d.png',
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
  espirito_ancestral: {
    id: 'espirito_ancestral',
    name: 'Espírito Ancestral',
    icon: '🌀',
    img: 'Imagens/personagens/file_00000000d16471f5997518b004efd35b.png',
    elemento: 'fantasma',
    hp: 280, atk: 26, def: 6,
    xp: 120, gold: 65,
    isBoss: true,
    hiddenHp: true,          // HP nunca aparece — exibe "??? HP" na UI
    desc: 'Uma forma espectral que existiu antes do templo ser construído. Não tem corpo — e por isso, não pode ser ferido normalmente. Suga a força vital dos vivos para manter sua forma coesa.',
    passiva: 'Drenar Vida',  // suga HP do jogador e se cura
    loot: [
      { id:'cinza_espectral',  name:'Cinza Espectral',     icon:'🌫️', chance:1.0, weight:0.1, type:'material',  desc:'Resíduo de uma alma que se perdeu no vazio.' },
      { id:'essencia_fantasma', name:'Essência Fantasmal', icon:'💠', chance:0.9, weight:0.2, type:'material',  desc:'Substância etérea extraída de um espírito antigo. Usada em encantamentos de vazio.' },
      { id:'pocao_media',      name:'Poção Média', icon:'🫙', imgSrc:'Imagens/cosméticos/PoçãoM.png', chance:0.65, weight:0.5, type:'consumível', desc:'Restaura 60 HP.', heal:60 },
      { id:'chave_vazio',      name:'Chave do Vazio', icon:'🗝️', chance:1.0, weight:0.1, type:'material', desc:'Uma chave fria como a morte. Abre algo mais fundo no templo.' },
    ],
  },

  // ── Fase 3 — Boss Final ────────────────────────────────
  ecorrom: {
    id: 'ecorrom',
    name: 'Espectro Ancestral',
    icon: '👁️',
    img: 'Imagens/personagens/Ecorrom.png',
    elemento: 'vazio',
    hp: 350, atk: 28, def: 8,
    xp: 180, gold: 90,
    isBoss: true,
    missChance: 0.35,           // 35% de chance de falhar cada ataque
    desc: 'Uma entidade ancestral que habita o núcleo do templo desde antes de sua construção. Onde seus olhos pousam, o espaço ao redor se dobra. Ele não tem nome — mas os que chegaram antes o chamaram de Ecorrom, e o nome ficou preso nos ecos.',
    passiva: 'Garra Longa',     // ativa bloqueio de cura ao usar este ataque
    loot: [
      { id:'eco_cristalizado', name:'Eco Cristalizado', icon:'🔮', chance:1.0, weight:0.2, type:'material', desc:'Um fragmento de som solidificado. Pulsa com uma frequência que nenhum ouvido deveria captar.' },
      { id:'fragmento_sombra', name:'Fragmento de Sombra', icon:'🌑', chance:0.75, weight:0.3, type:'material', desc:'Sombra solidificada, ainda escura por dentro.' },
      { id:'pocao_grande',     name:'Poção Grande', icon:'⚗️', imgSrc:'Imagens/cosméticos/PoçãoG.png', chance:0.6, weight:0.5, type:'consumível', desc:'Restaura 120 HP.', heal:120 },
    ],
  },
};

// ─────────────────────────────────────────────────────────────
//  2. DADOS DA MASMORRA
// ─────────────────────────────────────────────────────────────

const TEMPLO_VAZIO_ECOANTE = {
  id:          'temploVazioEcoante',
  ordem:       1,
  nome:        'O Templo do Vazio Ecoante',
  bossIcon:    'Imagens/personagens/Ecorrom.png',
  bossNome:    'Espectro Ancestral',
  descricao:   'Ruínas esquecidas onde o silêncio ganhou voz própria. Dizem que os ecos ali dentro repetem os últimos gritos de quem se perdeu — e que algo, no fundo do templo, ainda escuta.',
  status:      'disponivel',

  stats: [
    { label: 'Dificuldade',  value: '⭐⭐☆☆☆' },
    { label: 'Fases',        value: '3 Fases' },
    { label: 'Chefe',        value: 'Espectro Ancestral' },
    { label: 'Recompensa',   value: 'Eco Cristalizado' },
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
    `O primeiro corredor é longo e estreito. Estátuas de pedra flanqueiam as paredes — figuras encurvadas com as mãos no rosto, como se tentassem abafar um som que não para.\n\nNo centro do corredor, suspenso a meio metro do chão, uma forma translúcida ganha contorno. Sem rosto. Sem peso. Com um grito preso onde deveria haver boca.\n\n<div style="margin:10px 0;padding:8px 12px;border-left:3px solid rgba(140,60,255,0.5);background:rgba(60,0,120,0.12);border-radius:4px;font-size:0.75rem;color:rgba(200,160,255,0.75);line-height:1.6;font-style:italic;">👻 Espectro Menor</div>`,
    [
      { icon:'⚔️', text:'Enfrentar o Espectro Menor', action: temploVazioEcoante_fase1_batalha },
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
      { texto: 'Um espírito antigo a mantém como isca para vivos', correta: true  },
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
    '— O ESPÍRITO —',
    `Você puxa.\n\nA Gadanha não sai um milímetro.\n\nMas algo se move.\n\nNão das sombras — do ar. Do espaço entre as paredes. Uma forma que não deveria estar lá simplesmente começa a existir, como névoa que ganha consciência. Translúcida. Sem peso. Sem chão sob os pés que não tem.\n\nUm Espírito. Ancestral. Mais antigo que o templo onde você está.\n\nEle não tem voz. Mas você sente a mensagem antes de ouvi-la:\n\n<div style="margin:12px 0;padding:10px 12px;border-left:3px solid rgba(140,60,255,0.7);background:rgba(40,0,80,0.2);border-radius:4px;font-family:'Noto Serif JP',serif;font-size:0.82rem;color:#c8a8ff;line-height:1.8;font-style:italic;">"Você não deveria ter tocado nisso.\nAgora preciso de algo que você tem.\nVida."</div>\n\nOs dedos espectrais se estendem na sua direção — e onde tocam o ar, o ar some.`,
    [
      { icon:'⚔️', text:'Lutar — não há escolha', action: temploVazioEcoante_fase2_batalha },
    ]
  );
}

// ── Batalha e Vitória ─────────────────────────────────────

function temploVazioEcoante_fase2_batalha() {
  _tve_scene('tve-f2');
  _tve_battle(TVE_INIMIGOS.espirito_ancestral, temploVazioEcoante_fase2_vitoria);

  // Avisos de mecânica após iniciar batalha
  setTimeout(() => {
    _tve_notify('💠 ESPECIAL: Drenar Vida — causa dano e restaura HP do Espírito!');
    _tve_notify('🌀 PASSIVA: Forma Fantasma — ataques físicos têm 25% de chance de falhar!');
  }, 1200);
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
    id:     'gadanha_espirito',
    name:   'Gadanha',
    icon:   '🌙',
    imgSrc: 'Imagens/icones/gadanha.png',
    type:   'colecionável',
    weight: 2.0,
    desc:   'A foice guardada pelo Espírito Ancestral. Forjada em osso de criatura que nunca existiu. A lâmina não corta carne — ela toca a alma. Exala uma aura roxa pulsante que não some nem ao sol.',
    flavor: '"Quem a empunha começa a ouvir os ecos."',
  };
  const essencia = {
    id: 'essencia_fantasma', name: 'Essência Fantasmal', icon: '💠',
    type: 'material', weight: 0.2,
    desc: 'Substância etérea extraída do Espírito Ancestral. Usada em encantamentos de vazio.',
  };
  if (typeof addItem === 'function') addItem(gadanha,  1);
  if (typeof addItem === 'function') addItem(essencia, 1);

  setTimeout(() => { _tve_notify('🌀 O Espírito Ancestral se desfaz no ar.'); }, 300);
  setTimeout(() => { _tve_notify('🌙 Gadanha adicionada ao inventário!'); }, 1000);
  setTimeout(() => { _tve_notify('💠 Essência Fantasmal obtida!'); }, 1600);

  setStory(
    'FASE 2 — CONCLUÍDA',
    `O Espírito Ancestral não grita quando derrota o chega.\n\nEle simplesmente... para.\n\nA forma translúcida perde coesão — primeiro as extremidades, depois o centro. Sem explosão, sem drama. Como névoa que o sol dissipou, exceto que aqui não existe sol.\n\nA Gadanha cai onde ele estava. Desta vez, você a pega.\n\nEla é mais leve do que parece. Fria como pedra no fundo de um rio congelado. E onde o Espírito passou, uma essência ficou — não no chão, no ar. Você a coleta antes que suma.\n\n<div style="margin:10px 0;padding:8px 12px;border:1px solid rgba(140,60,255,0.4);background:rgba(30,0,60,0.25);border-radius:5px;display:flex;flex-direction:column;gap:6px;">\n  <div style="display:flex;align-items:center;gap:8px;"><span style="font-size:1.3rem;">🌙</span><div><div style="font-family:'Noto Serif JP',serif;font-size:0.82rem;color:#c8a8ff;font-weight:700;">Gadanha</div><div style="font-size:0.68rem;color:rgba(200,160,255,0.6);">Item colecionável obtido</div></div></div>\n  <div style="display:flex;align-items:center;gap:8px;"><span style="font-size:1.3rem;">💠</span><div><div style="font-family:'Noto Serif JP',serif;font-size:0.82rem;color:#c8a8ff;font-weight:700;">Essência Fantasmal</div><div style="font-size:0.68rem;color:rgba(200,160,255,0.6);">Material obtido</div></div></div>\n</div>\n\nO templo estremece. Uma rachadura nova abre na parede norte — fina, vertical, com luz roxa vazando pela borda.\n\nNão é uma porta. É mais como um convite. Ou um aviso.`,
    [
      { icon:'▶', text:'Avançar — Fase 3',  action: temploVazioEcoante_fase3_placeholder },
      { icon:'🏃', text:'Sair da masmorra', action: temploVazioEcoante_sair },
    ]
  );
}

// ─────────────────────────────────────────────────────────────
//  7. FASE 3 — A SALA INFINITA / ECORROM
// ─────────────────────────────────────────────────────────────

// ── Entrada da Sala Infinita ──────────────────────────────────
function temploVazioEcoante_fase3_placeholder() {
  // Redireciona para a Fase 3 real
  temploVazioEcoante_fase3_entrada();
}

function temploVazioEcoante_fase3_entrada() {
  // Imagem 1 da Fase 3 — aparece logo ao entrar na sala infinita
  if (typeof setEnemyImage === 'function') {
    setEnemyImage('Imagens/personagens/file_0000000027e8720eb7fe13114fb31d33.png');
  } else {
    const eImg = document.getElementById('enemy-img') || document.querySelector('.enemy-img');
    if (eImg) eImg.src = 'Imagens/personagens/file_0000000027e8720eb7fe13114fb31d33.png';
  }
  _tve_scene('tve-f3');
  setTimeout(() => _tve_notify('🌑 O eco para. Silêncio absoluto.'), 500);

  setStory(
    'FASE 3 — A SALA INFINITA',
    `Você atravessa a rachadura.\n\nE para.\n\nA sala não tem paredes. Não tem teto. Não tem chão visível além dos primeiros passos — apenas um plano escuro que se estende em todas as direções até onde os olhos conseguem alcançar. Ou mais longe.\n\nO eco some. O ar para. Até os seus próprios passos deixam de produzir som.\n\nE então você vê.\n\nNo centro desta vastidão impossível — flutuando.`,
    [
      { icon:'👁️', text:'Olhar para o centro da sala', action: temploVazioEcoante_fase3_observar },
    ]
  );
}

function temploVazioEcoante_fase3_observar() {
  _tve_scene('tve-f3');

  setStory(
    '— ESPECTRO ANCESTRAL —',
    `Uma forma. Sem contornos definidos. Sem peso aparente. Flutuando em silêncio a metros do chão que deveria existir.\n\nNão é humana. Não é espectral. Não se encaixa em nenhum nome que você conheça — e ainda assim, algo em você reconhece que está diante de algo muito, muito antigo.\n\nEle o observa. Você sente isso antes de ver os olhos — dois pontos de luz que se abrem lentamente, como portas para um lugar muito mais vazio do que este.\n\nE então acontece algo estranho:\n\nA energia ao redor dele hesita. Treme. Como se a sua presença aqui fosse uma interferência que ainda não sabe como processar.`,
    [
      { icon:'💬', text:'"Quem... o que você é?"', action: temploVazioEcoante_fase3_responder },
      { icon:'⚔️', text:'Não perder tempo — atacar', action: temploVazioEcoante_fase3_batalha },
    ]
  );
}

// ── Ramificação: Responder ────────────────────────────────────
function temploVazioEcoante_fase3_responder() {
  // Imagem 2 da Fase 3 — muda após o diálogo com o Espectro Ancestral
  if (typeof setEnemyImage === 'function') {
    setEnemyImage('Imagens/personagens/file_0000000068d471f5b4ad607991c8991b.png');
  } else {
    const eImg = document.getElementById('enemy-img') || document.querySelector('.enemy-img');
    if (eImg) eImg.src = 'Imagens/personagens/file_0000000068d471f5b4ad607991c8991b.png';
  }
  _tve_scene('tve-f3b'); // Fundo muda quando o Espectro responde — sala ganha profundidade

  setStory(
    '— O ESPECTRO RESPONDE —',
    `Os olhos se fecham um instante.\n\nQuando se abrem, o fundo da sala muda — o escuro absoluto se parte em algo diferente. Não mais um vazio puro. Um espaço. Com textura. Com profundidade. Como se a pergunta tivesse despertado uma memória enterrada no próprio templo.\n\n<div style="margin:12px 0;padding:10px 12px;border-left:3px solid rgba(100,80,200,0.8);background:rgba(20,10,60,0.3);border-radius:4px;font-family:'Noto Serif JP',serif;font-size:0.82rem;color:#b8a8e8;line-height:1.9;font-style:italic;">"Eu existo antes do nome.\nMas os que chegam até aqui sempre precisam de um.\nEcorrom — foi o que o último chamou, antes de se dissolver no eco.\n\nVocê perturbou a frequência deste lugar.\nIsso não costuma terminar sem sangue."</div>\n\nEle não é hostil. Não é amigável. É uma presença que existe além dessas categorias — antiga demais para qualquer coisa que você conheça.\n\nE então você nota que ele começa a se mover em sua direção.`,
    [
      { icon:'⚔️', text:'Preparar para batalha', action: temploVazioEcoante_fase3_batalha },
    ]
  );
}

// ── Batalha com o Espectro Ancestral ─────────────────────────
function temploVazioEcoante_fase3_batalha() {
  // Preparar o inimigo com a missChance e passiva
  const ecorrom = Object.assign({}, TVE_INIMIGOS.ecorrom);

  // Hook: Garra Longa ativa bloqueio de cura
  // Implementado via ENEMY_AI customizado — usamos flag no battleState
  _tve_scene('tve-f3');
  _tve_battle(ecorrom, temploVazioEcoante_fase3_vitoria);

  // Notificação após iniciar batalha
  setTimeout(() => {
    _tve_notify('🌑 PASSIVA: Garra Longa — bloqueia sua cura ao ativar.');
    _tve_notify('⚠️ Ataques do Espectro Ancestral têm 35% de chance de falhar.');
  }, 1200);
}

// ── Vitória contra o Espectro Ancestral ──────────────────────
function temploVazioEcoante_fase3_vitoria() {
  _tve_scene('tve-f3');

  setStory(
    'FASE 3 — O ESPECTRO CAI',
    `O Espectro Ancestral não cai.\n\nEle se dissolve.\n\nNão em fragmentos, não em fumaça — simplesmente em silêncio. Como se a frequência que o sustentava por séculos tivesse finalmente encontrado resolução no fio da sua lâmina.\n\nE com ele, a sala muda.\n\nO vazio infinito que se estendia em todas as direções começa a tomar forma. Limites surgem onde não havia limites. Proporções impossíveis cedem para algo compreensível.\n\nNo centro do espaço onde a entidade flutuava, um baú de pedra negra emerge lentamente do chão — coberto de runas que pulsam uma última vez antes de se apagarem.`,
    [
      { icon:'📦', text:'Abrir o baú do Espectro', action: temploVazioEcoante_fase3_bau },
    ]
  );
}

// ── Baú de recompensas da masmorra ───────────────────────────
function temploVazioEcoante_fase3_bau() {
  _tve_scene('tve-f3');

  // ── Marca masmorra 1 como concluída (desbloqueia Masmorra 2) ──
  if (G) G.dungeonTemploVazioCleared = true;

  // ── Recompensas garantidas ──
  const eco = {
    id:     'eco_cristalizado',
    name:   'Eco Cristalizado',
    icon:   '🔮',
    imgSrc: 'Imagens/icones/eco_cristalizado.png',
    type:   'material',
    weight: 0.2,
    desc:   'Um fragmento de som solidificado, arrancado do Espectro Ancestral. Pulsa com uma frequência que nenhum ouvido deveria captar. Usado em encantamentos avançados.',
  };
  const pocaoG = {
    id: 'pocao_grande', name: 'Poção Grande', icon: '⚗️',
    imgSrc: 'Imagens/cosméticos/PoçãoG.png', type: 'consumível',
    desc: 'Restaura 120 HP.', heal: 120, weight: 0.5,
  };
  const fragmento = {
    id: 'fragmento_sombra', name: 'Fragmento de Sombra', icon: '🌑',
    type: 'material', weight: 0.3,
    desc: 'Sombra solidificada arrancada do núcleo do templo. Ainda escura por dentro.',
  };

  if (typeof addItem === 'function') {
    addItem(eco,        1);
    addItem(pocaoG,     1);
    addItem(fragmento,  2);
  }

  // ── Ouro ──
  const ouro = 90 + Math.floor(Math.random() * 31); // 90–120 de ouro
  if (G && G.player) {
    G.player.gold = (G.player.gold || 0) + ouro;
    if (typeof updateHUD === 'function') updateHUD();
  }

  // ── Runa aleatória (bônus) ──
  const runas = [
    { id:'runa_forca',    name:'Runa da Força',    icon:'🔴', type:'runa', desc:'Aumenta ATQ permanentemente ao encantar uma arma.' },
    { id:'runa_sombra',   name:'Runa da Sombra',   icon:'🟣', type:'runa', desc:'Envolve o golpe em trevas — concede penetração de armadura.' },
    { id:'runa_vazio',    name:'Runa do Vazio',     icon:'⚫', type:'runa', desc:'Runa rara obtida apenas nas profundezas do templo. Efeito desconhecido.' },
  ];
  const runaObtida = runas[Math.floor(Math.random() * runas.length)];
  if (typeof addItem === 'function') addItem(runaObtida, 1);

  setTimeout(() => _tve_notify('🔮 Eco Cristalizado obtido!'),            300);
  setTimeout(() => _tve_notify('⚗️ Poção Grande obtida!'),                 800);
  setTimeout(() => _tve_notify('🌑 2× Fragmento de Sombra obtidos!'),     1300);
  setTimeout(() => _tve_notify(`${runaObtida.icon} ${runaObtida.name} obtida!`), 1800);
  setTimeout(() => _tve_notify(`💰 ${ouro} de ouro encontrados no baú!`), 2300);

  setStory(
    '📦 BAÚ DO ESPECTRO ANCESTRAL',
    `O baú se abre sem resistência — como se esperasse por você.\n\nDentro, embrulhado em sombra solidificada, um cristal roxa pulsa lentamente. Ao lado, frascos, fragmentos e uma runa gravada em pedra negra que você nunca viu antes.\n\n<div style="margin:10px 0;border:1px solid rgba(100,80,200,0.4);background:rgba(20,10,60,0.28);border-radius:6px;overflow:hidden;">
  <div style="padding:6px 12px;background:rgba(100,80,200,0.15);font-family:'Noto Serif JP',serif;font-size:0.7rem;color:#b8a8e8;letter-spacing:1px;text-transform:uppercase;">Recompensas obtidas</div>
  <div style="padding:8px 12px;display:flex;flex-direction:column;gap:6px;">
    <div style="display:flex;align-items:center;gap:8px;font-size:0.8rem;color:#e0d0ff;">🔮 <span>Eco Cristalizado</span><span style="margin-left:auto;color:rgba(255,255,255,0.4);font-size:0.68rem;">×1</span></div>
    <div style="display:flex;align-items:center;gap:8px;font-size:0.8rem;color:#e0d0ff;">⚗️ <span>Poção Grande</span><span style="margin-left:auto;color:rgba(255,255,255,0.4);font-size:0.68rem;">×1</span></div>
    <div style="display:flex;align-items:center;gap:8px;font-size:0.8rem;color:#e0d0ff;">🌑 <span>Fragmento de Sombra</span><span style="margin-left:auto;color:rgba(255,255,255,0.4);font-size:0.68rem;">×2</span></div>
    <div style="display:flex;align-items:center;gap:8px;font-size:0.8rem;color:#e0d0ff;">${runaObtida.icon} <span>${runaObtida.name}</span><span style="margin-left:auto;color:rgba(255,200,100,0.6);font-size:0.68rem;">×1 runa</span></div>
    <div style="display:flex;align-items:center;gap:8px;font-size:0.8rem;color:#ffe090;">💰 <span>${ouro} de ouro</span></div>
  </div>
</div>\n\nA sala finalmente tem limites. O templo, silêncio.\n\nVocê conquista o Templo do Vazio Ecoante.`,
    [
      { icon:'🏆', text:'Sair vitorioso', action: temploVazioEcoante_sair },
    ]
  );
}

// ─────────────────────────────────────────────────────────────
//  7-B. ENEMY_AI — ESPÍRITO ANCESTRAL (Mini-boss Fase 2)
//       Mecânicas: Forma Fantasma + Drenar Vida
// ─────────────────────────────────────────────────────────────

(function _injectEspiritoAncestralAI() {
  function inject() {
    if (typeof ENEMY_AI === 'undefined') {
      setTimeout(inject, 80);
      return;
    }

    // ── IA do Espírito Ancestral ──────────────────────────────
    // PASSIVA 1: Forma Fantasma — 25% de chance de ignorar completamente o dano
    // ESPECIAL: Drenar Vida — causa dano e restaura o mesmo valor de HP no inimigo
    ENEMY_AI.espirito_ancestral = {
      name: 'espírito ancestral',
      specialName: 'Drenar Vida',
      specialIcon: '💠',
      specialDesc: 'O Espírito suga sua força vital — causa dano e se cura pelo mesmo valor.',
      special(bs, p, e) {
        // Dano de 1.2× + drain: inimigo recupera o que drenou
        const d = calcEnemyDmg(e, p, bs, 1.2);
        applyDmgToPlayer(d, bs, p);
        // Cura o próprio inimigo
        const curaAntes = e.hp;
        e.hp = Math.min(e.maxHp || e.hp + d, e.hp + d);
        const curado = e.hp - curaAntes;
        appendBattleLog(
          `💠 Espírito Ancestral — Drenar Vida! -${d} HP seu! O espírito recupera ${curado} HP!`,
          '#80c8ff'
        );
        showFloatingNumber('hero',  d,      'dmg');
        showFloatingNumber('enemy', curado, 'heal');
        flashDamage('hero');
        if (typeof updateBattleHUD === 'function') updateBattleHUD();
        showBattleSideBadge('hero', '💠 VIDA DRENADA', '#80c8ff');
      }
    };

    // ── Hook: Forma Fantasma — 25% de desvio total de dano físico ───
    // Intercepta o momento em que o jogador aplica dano no inimigo.
    // Se o inimigo é o Espírito Ancestral, rola a chance de ignorar.
    const _origApplyDmgToEnemy = window.applyDmgToEnemy || null;
    if (_origApplyDmgToEnemy) {
      window.applyDmgToEnemy = function(dmg, bs, p, e, isMagic) {
        if (e && e.id === 'espirito_ancestral') {
          // Magia passa direto — só defesa física é ignorada
          if (!isMagic && Math.random() < 0.25) {
            appendBattleLog(
              `🌀 Forma Fantasma! O ataque atravessa o Espírito Ancestral — sem efeito!`,
              'rgba(140,200,255,0.8)'
            );
            showFloatingNumber('enemy', 0, 'miss');
            if (typeof updateBattleHUD === 'function') updateBattleHUD();
            return; // Dano ignorado
          }
        }
        return _origApplyDmgToEnemy(dmg, bs, p, e, isMagic);
      };
    }
  }
  inject();
})();

// ─────────────────────────────────────────────────────────────
//  7-C. ENEMY_AI — ESPECTRO ANCESTRAL / ECORROM (Boss Fase 3)
// ─────────────────────────────────────────────────────────────

(function _injectEcorromAI() {
  // Aguarda o palDinh definir ENEMY_AI antes de injetar
  function inject() {
    if (typeof ENEMY_AI === 'undefined') {
      setTimeout(inject, 80);
      return;
    }

    // ── IA do Espectro Ancestral ──────────────────────────────
    // Passiva: Garra Longa — ao ativar o especial, bloqueia cura
    // do jogador por 2 turnos (flag battleState._ecorromCuraBlock)
    ENEMY_AI.ecorrom = {
      name: 'espectro ancestral',
      specialName: 'Garra Longa',
      specialIcon: '🌑',
      specialDesc: 'A garra rasga o espaço entre vocês — bloqueia sua cura por 2 turnos.',
      special(bs, p, e) {
        const d = calcEnemyDmg(e, p, bs, 1.4);
        applyDmgToPlayer(d, bs, p);
        // Bloqueia cura
        bs._ecorromCuraBlock = 2;
        appendBattleLog(
          `👁️ Espectro Ancestral — Garra Longa! -${d} HP! ⛔ Sua cura está bloqueada por 2 turnos!`,
          '#b090ff'
        );
        showFloatingNumber('hero', d, 'dmg');
        flashDamage('hero');
        showBattleSideBadge('hero', '⛔ CURA BLOQUEADA', '#b090ff');
      }
    };

    // ── Hook de missChance — Espectro Ancestral ──────────────
    // O inimigo tem 35% de chance de errar cada ataque normal.
    // Sobrescrevemos runEnemyTurn para interceptar quando o inimigo é o Espectro.
    const _origRunEnemyTurn = window.runEnemyTurn || null;
    if (_origRunEnemyTurn) {
      window.runEnemyTurn = function(bs, p, e, skipTurn) {
        if (e && e.id === 'ecorrom' && !bs.enemyStunned && !skipTurn) {
          const missChance = e.missChance || 0.35;
          if (Math.random() < missChance) {
            appendBattleLog(
              `👁️ O Espectro Ancestral avança — mas a garra rasga o ar do lado errado. O ataque falha!`,
              'rgba(180,160,230,0.7)'
            );
            showFloatingNumber('enemy', 0, 'miss');
            // Ticks de status do jogador mesmo sem dano
            if (typeof tickPlayerStatusEffects === 'function') tickPlayerStatusEffects(bs, p);
            if (typeof updateHUD === 'function') updateHUD();
            if (typeof updateBattleHUD === 'function') updateBattleHUD();
            if (typeof buildStatusBadges === 'function') buildStatusBadges();
            // Tick do bloqueio de cura
            if (bs._ecorromCuraBlock > 0) {
              bs._ecorromCuraBlock--;
              if (bs._ecorromCuraBlock <= 0) {
                appendBattleLog('✅ Bloqueio de cura do Espectro Ancestral se dissipou.', '#80c080');
              }
            }
            if (p.hp <= 0) {
              p.hp = 0;
              setTimeout(() => { if (typeof endBattle === 'function') endBattle(false, false); }, 400);
              return;
            }
            bs.phase = 'player';
            if (typeof setBattleButtons === 'function') setBattleButtons(true);
            if (typeof buildSkillList === 'function') buildSkillList();
            if (typeof updateBattleTurnIndicator === 'function') updateBattleTurnIndicator('player');
            return;
          }
        }
        // Tick do bloqueio de cura (turno normal do inimigo)
        if (e && e.id === 'ecorrom' && bs._ecorromCuraBlock > 0) {
          bs._ecorromCuraBlock--;
          if (bs._ecorromCuraBlock <= 0) {
            appendBattleLog('✅ Bloqueio de cura do Espectro Ancestral se dissipou.', '#80c080');
          }
        }
        return _origRunEnemyTurn(bs, p, e, skipTurn);
      };
    }

    // ── Hook de cura bloqueada — intercepta useItemInBattle ──
    const _origUseItem = window.useItemInBattle || null;
    if (_origUseItem) {
      window.useItemInBattle = function(idx, heal, item, isMP, mpRestore) {
        const bs = typeof battleState !== 'undefined' ? battleState : null;
        if (bs && bs._ecorromCuraBlock > 0 && !isMP && heal > 0) {
          appendBattleLog(
            `⛔ A Garra Longa ainda bloqueia sua cura! (${bs._ecorromCuraBlock} turno${bs._ecorromCuraBlock > 1 ? 's' : ''} restante${bs._ecorromCuraBlock > 1 ? 's' : ''})`,
            '#b090ff'
          );
          if (typeof notify === 'function') notify('⛔ Cura bloqueada pela Garra Longa!', 'gold');
          return; // Aborta o uso do item sem consumir
        }
        return _origUseItem(idx, heal, item, isMP, mpRestore);
      };
    }
  }
  inject();
})();

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
