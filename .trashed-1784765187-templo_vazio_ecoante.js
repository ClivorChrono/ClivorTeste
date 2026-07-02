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

  // ── Fases futuras (esqueletos do registro — preencher depois) ──

  // espectro_guardiao: { ... },  // Fase 2
  // fragmento_vazio:   { ... },  // Fase 3
  // sacerdote_eco:     { ... },  // Fase 4+
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
      { icon:'▶', text:'Avançar para a Fase 2', action: temploVazioEcoante_fase2_placeholder },
      { icon:'🏃', text:'Sair da masmorra', action: temploVazioEcoante_sair },
    ]
  );
}

// ─────────────────────────────────────────────────────────────
//  6. FASE 2 — PLACEHOLDER (a implementar)
// ─────────────────────────────────────────────────────────────

function temploVazioEcoante_fase2_placeholder() {
  _tve_scene('tve-f2');
  setStory(
    'FASE 2 — EM CONSTRUÇÃO',
    `As paredes além da porta são diferentes. Mais antigas. Mais úmidas.\n\nO eco aqui é mais alto.\n\n<span style="color:rgba(200,150,10,0.5);font-style:italic;">— Esta fase ainda está sendo tecida pelas sombras. Volte em breve. —</span>`,
    [
      { icon:'↩', text:'Voltar ao corredor anterior', action: temploVazioEcoante_fase1_vitoria },
      { icon:'🏃', text:'Sair da masmorra', action: temploVazioEcoante_sair },
    ]
  );
}

// ─────────────────────────────────────────────────────────────
//  7. FASE 3+ — PLACEHOLDERS (a implementar)
// ─────────────────────────────────────────────────────────────

// function temploVazioEcoante_fase3() { ... }
// function temploVazioEcoante_fase4() { ... }
// → A partir da Fase 3, espera-se um mini-boss ou evento narrativo de ponto médio.
// → A Fase final culmina no Espectro Ancestral (boss).

// ─────────────────────────────────────────────────────────────
//  8. SAÍDA DA MASMORRA
// ─────────────────────────────────────────────────────────────

function temploVazioEcoante_sair() {
  _tve_notify('Você saiu do Templo do Vazio Ecoante.');
  if (typeof storyNode_vilarejo === 'function') storyNode_vilarejo();
}
