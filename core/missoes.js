// ═════════════════════════════════════════════════════════════
//  CORE/MISSOES.JS — Chronicles of Clivor
//  Sistema de missões (Quadro de Quests do Gozen + Conquistas).
//
//  Extraído de palDinh.js (seção 11.5/11.6) pra ficar isolado do
//  resto do conteúdo do jogo. Mantém a mesma API pública de antes
//  (window.QuestBoard, window.Achievements, window.getEnemyGoldReward,
//  window.openQuestBoard/closeQuestBoard/switchQuestTab) — nenhum
//  outro arquivo precisa mudar por causa dessa extração.
//
//  ⚠️ ORDEM DE CARGA: este arquivo declara getEnemyGoldReward(), que
//  o palDinh.js chama direto (sem "window."). Ele PRECISA carregar
//  ANTES de core/palDinh.js no <script> do gat-1.html.
//
//  Novidades desta versão:
//   • Categorias/filtros: cada missão agora tem `category`
//     ('combate' | 'coleta' | 'ouro' | 'exploracao' | 'dungeon'),
//     inferida automaticamente do tipo (ver _qbCategoryOf). O
//     Quadro pode filtrar por categoria via QuestBoard.setFilter().
//   • Missões de dungeon específica: contratos exclusivos da
//     Masmorra Inazami (locPrefix 'inazami-'), somados aos que já
//     existiam pra Dungeon das Sombras (locPrefix 'dungeon-').
//     Qualquer def com locPrefix cai automaticamente em 'dungeon'.
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
//  QUADRO DE QUESTS — GOZEN (pin perto da ferraria)
//  Desbloqueia no LV 4. Atualiza a cada 2 "dias" do jogo,
//  que aqui equivalem a 48h em tempo real (2 noites seguidas).
// ─────────────────────────────────────────────────────────────
const QB_UNLOCK_LEVEL   = 4;
// ⚙️ AJUSTES DO QUADRO (mexa só aqui) ─────────────────────────
// Ciclo de renovação. O refresh NÃO apaga mais o progresso: contratos já
// iniciados ou concluídos-sem-resgatar continuam no quadro (ver generateBoard).
const QB_REFRESH_MS = 1000 * 60 * 30;   // 30 min reais (antes 3 min — apagava tudo)
// Falso = o quadro é FINITO: resgatou, a vaga fica "Resgatado" até o ciclo
// acabar. Quando TODOS os contratos forem resgatados, o próximo ciclo vem na
// hora. Verdadeiro = comportamento antigo (vaga reposta na hora, sem fim).
const QB_REPOR_AO_RESGATAR = false;
const QB_RECUSAS_POR_CICLO = 2;          // recusas que ganham contrato novo por ciclo
const QB_COOLDOWN_RECENTES = 8;          // não repete os últimos N contratos feitos/recusados
const QB_RARA_NIVEL_MIN    = 10;         // contratos de drop de boss só a partir deste nível
// Itens comuns: podem ser pedidos desde o começo. Os demais (e os de dungeon)
// só são pedidos depois que o jogador já pegou o item alguma vez.
const QB_ITENS_INICIAIS = ['po_cristal', 'pele_lobo', 'pena_corvo', 'pedra', 'pele_cobra'];
// ─────────────────────────────────────────────────────────────
const QB_LOCATIONS_FLORESTA = ['floresta', 'floresta2'];
const QB_LOC_PREFIX_SOMBRAS  = 'dungeon-';
const QB_LOC_PREFIX_INAZAMI  = 'inazami-';

// Categorias usadas pra filtrar o Quadro. `icon` some no card (já tem o
// ícone da própria missão) — é só pra identificar a aba/pill de filtro.
const QB_CATEGORIES = [
  { id: 'todas',      label: 'Todas',       icon: '◈'  },
  { id: 'combate',    label: 'Combate',     icon: '⚔️' },
  { id: 'coleta',     label: 'Coleta',      icon: '🎒' },
  { id: 'ouro',       label: 'Ouro',        icon: '◈'  },
  { id: 'exploracao', label: 'Exploração',  icon: '🧭' },
  { id: 'dungeon',    label: 'Dungeon',     icon: '🌋' },
];

const QUEST_DEFS = [
  { id:'q_floresta_kills', icon:'🌲', title:'Limpeza da Floresta',
    desc:'Derrote N inimigos na floresta.', type:'kill_loc', locs:QB_LOCATIONS_FLORESTA,
    amountMin:5, amountMax:8, goldMin:40, goldMax:70, xpReward:80 },
  { id:'q_sombras_kills', icon:'🌑', title:'Caçador das Sombras',
    desc:'Derrote N inimigos na Dungeon das Sombras.', type:'kill_loc', locPrefix:QB_LOC_PREFIX_SOMBRAS,
    amountMin:4, amountMax:6, goldMin:60, goldMax:100, xpReward:150 },
  { id:'q_any_kills', icon:'⚔️', title:'Contrato de Caça',
    desc:'Vença N batalhas, em qualquer lugar.', type:'kill_any',
    amountMin:8, amountMax:12, goldMin:50, goldMax:90, xpReward:120 },
  { id:'q_collect_cristal', icon:'💎', title:'Pó Precioso',
    desc:'Colete N de Pó de Cristal.', type:'collect', itemId:'po_cristal',
    amountMin:4, amountMax:6, goldMin:35, goldMax:60, xpReward:70 },
  { id:'q_collect_lobo', icon:'🐾', title:'Peles para o Curtume',
    desc:'Colete N de Pele de Lobo.', type:'collect', itemId:'pele_lobo',
    amountMin:3, amountMax:5, goldMin:35, goldMax:60, xpReward:70 },
  { id:'q_collect_corvo', icon:'🪶', title:'Penas Negras',
    desc:'Colete N de Pena de Corvo.', type:'collect', itemId:'pena_corvo',
    amountMin:3, amountMax:5, goldMin:30, goldMax:55, xpReward:60 },
  { id:'q_gold_earn', icon:'◈', title:'Fortuna Crescente',
    desc:'Acumule N de ouro em batalhas.', type:'gold',
    amountMin:150, amountMax:250, goldMin:50, goldMax:80, xpReward:90 },
  { id:'q_level_up', icon:'🌟', title:'Ascensão',
    desc:'Alcance o próximo nível.', type:'level',
    amountMin:1, amountMax:1, goldMin:60, goldMax:100, xpReward:200 },
  { id:'q_visit', icon:'🏮', title:'Explorador do Vilarejo',
    desc:'Visite N locais diferentes do vilarejo.', type:'visit',
    amountMin:3, amountMax:3, goldMin:30, goldMax:50, xpReward:50 },

  // ── Coleta — materiais de drop já existentes no jogo ──
  { id:'q_collect_pedra', icon:'🪨', title:'Pedreiro Amador',
    desc:'Colete N de Pedra.', type:'collect', itemId:'pedra',
    amountMin:6, amountMax:10, goldMin:25, goldMax:45, xpReward:50 },
  { id:'q_collect_pele_cobra', icon:'🐍', title:'Couro de Serpente',
    desc:'Colete N de Pele de Cobra.', type:'collect', itemId:'pele_cobra',
    amountMin:3, amountMax:5, goldMin:35, goldMax:60, xpReward:65 },
  { id:'q_collect_glandula', icon:'☠️', title:'Veneno Coletado',
    desc:'Colete N de Glândula Venenosa.', type:'collect', itemId:'glandula',
    amountMin:2, amountMax:4, goldMin:40, goldMax:70, xpReward:70 },
  { id:'q_collect_frasco', icon:'🧴', title:'Frascos para Gozen',
    desc:'Colete N de Frasco Vazio.', type:'collect', itemId:'frasco_vazio',
    amountMin:3, amountMax:6, goldMin:20, goldMax:40, xpReward:40 },
  { id:'q_collect_cinza', icon:'🌫️', title:'Cinzas do Vazio',
    desc:'Colete N de Cinza Espectral.', type:'collect', itemId:'cinza_espectral',
    amountMin:3, amountMax:5, goldMin:45, goldMax:75, xpReward:80 },
  { id:'q_collect_essfant', icon:'💠', title:'Ecos do Além',
    desc:'Colete N de Essência Fantasmal.', type:'collect', itemId:'essencia_fantasma',
    amountMin:2, amountMax:4, goldMin:50, goldMax:85, xpReward:90 },
  { id:'q_collect_ecocris', icon:'🔮', title:'Ressonância Cristalina',
    desc:'Colete N de Eco Cristalizado.', type:'collect', itemId:'eco_cristalizado',
    amountMin:2, amountMax:4, goldMin:45, goldMax:75, xpReward:80 },
  { id:'q_collect_fragsombra', icon:'🌑', title:'Fragmentos das Trevas',
    desc:'Colete N de Fragmento de Sombra.', type:'collect', itemId:'fragmento_sombra',
    amountMin:3, amountMax:5, goldMin:50, goldMax:85, xpReward:90 },
  { id:'q_collect_ossomari', icon:'🦴', title:'Ossos Amaldiçoados',
    desc:'Colete N de Osso da Marionete.', type:'collect', itemId:'osso_marionete',
    amountMin:3, amountMax:5, goldMin:40, goldMax:70, xpReward:75 },
  { id:'q_collect_poosso', icon:'🏺', title:'Pó Ritualístico',
    desc:'Colete N de Pó de Osso.', type:'collect', itemId:'po_osso',
    amountMin:4, amountMax:6, goldMin:30, goldMax:55, xpReward:60 },
  { id:'q_collect_essesp', icon:'👻', title:'Presença Espiritual',
    desc:'Colete N de Essência Espiritual.', type:'collect', itemId:'essencia_espiritual',
    amountMin:2, amountMax:4, goldMin:55, goldMax:90, xpReward:95 },
  { id:'q_collect_humoresp', icon:'👁️', title:'Fluido dos Antigos',
    desc:'Colete N de Humor Espectral.', type:'collect', itemId:'humor_espectral',
    amountMin:2, amountMax:4, goldMin:45, goldMax:75, xpReward:80 },
  { id:'q_collect_argila', icon:'🟫', title:'Argila das Sombras',
    desc:'Colete N de Argila Sombria.', type:'collect', itemId:'argila_sombria',
    amountMin:3, amountMax:5, goldMin:35, goldMax:60, xpReward:65 },
  { id:'q_collect_pelorato', icon:'🐾', title:'Pragas do Subsolo',
    desc:'Colete N de Pelo Rançoso.', type:'collect', itemId:'pelo_rato',
    amountMin:5, amountMax:8, goldMin:25, goldMax:45, xpReward:50 },
  { id:'q_collect_fragcris', icon:'🔮', title:'Cristais Corrompidos',
    desc:'Colete N de Fragmento de Cristal Negro.', type:'collect', itemId:'fragmento_cristal_negro',
    amountMin:2, amountMax:4, goldMin:50, goldMax:85, xpReward:90 },
  { id:'q_collect_esssombras', icon:'🌑', title:'Essência Pura das Trevas',
    desc:'Colete N de Essência das Sombras.', type:'collect', itemId:'essencia_sombras',
    amountMin:2, amountMax:4, goldMin:55, goldMax:90, xpReward:95 },
  { id:'q_collect_laminaqueb', icon:'🗡️', title:'Lâminas Perdidas',
    desc:'Colete N de Lâmina Quebrada.', type:'collect', itemId:'lamina_quebrada',
    amountMin:2, amountMax:4, goldMin:40, goldMax:70, xpReward:75 },
  { id:'q_collect_espenf', icon:'⚔️', title:'Ferro Velho',
    desc:'Colete N de Espada Enferrujada.', type:'collect', itemId:'espada_enferrujada',
    amountMin:2, amountMax:4, goldMin:40, goldMax:70, xpReward:75 },
  { id:'q_collect_posombra', icon:'🌑', title:'Pó das Trevas',
    desc:'Colete N de Pó de Sombra.', type:'collect', itemId:'po_sombra',
    amountMin:4, amountMax:6, goldMin:35, goldMax:60, xpReward:65 },
  { id:'q_collect_teia', icon:'🕸️', title:'Fios Resistentes',
    desc:'Colete N de Teia.', type:'collect', itemId:'teia_aranha',
    amountMin:5, amountMax:8, goldMin:20, goldMax:40, xpReward:45 },

  // ── Coleta rara — materiais de boss, amount fixo em 1, recompensa alta ──
  { id:'q_collect_emblema', icon:'👑', title:'Relíquia do Rei Maldito',
    desc:'Obtenha N Emblema do Rei Maldito.', type:'collect', itemId:'emblema_rei_maldito',
    amountMin:1, amountMax:1, goldMin:150, goldMax:220, xpReward:250 },
  { id:'q_collect_katana', icon:'🗡️', title:'Lâmina do Senhor das Sombras',
    desc:'Obtenha N Katana de Muichi.', type:'collect', itemId:'katana_muichi',
    amountMin:1, amountMax:1, goldMin:180, goldMax:250, xpReward:280 },
  { id:'q_collect_esslorde', icon:'🌙', title:'Poder do Lorde',
    desc:'Obtenha N Essência do Lorde.', type:'collect', itemId:'essencia_lorde',
    amountMin:1, amountMax:1, goldMin:160, goldMax:230, xpReward:260 },

  // ── Combate — variações de kill_any / kill_loc ──
  { id:'q_kill_quick', icon:'⚔️', title:'Serviço Rápido',
    desc:'Vença N batalhas, em qualquer lugar.', type:'kill_any',
    amountMin:4, amountMax:6, goldMin:30, goldMax:50, xpReward:60 },
  { id:'q_kill_veteran', icon:'🛡️', title:'Prova de Veterano',
    desc:'Vença N batalhas, em qualquer lugar.', type:'kill_any',
    amountMin:15, amountMax:20, goldMin:90, goldMax:140, xpReward:200 },
  { id:'q_kill_daily', icon:'⚔️', title:'Rotina de Combate',
    desc:'Vença N batalhas, em qualquer lugar.', type:'kill_any',
    amountMin:6, amountMax:9, goldMin:45, goldMax:70, xpReward:90 },
  { id:'q_kill_floresta2', icon:'🌲', title:'Guarda da Mata Densa',
    desc:'Derrote N inimigos na floresta.', type:'kill_loc', locs:QB_LOCATIONS_FLORESTA,
    amountMin:6, amountMax:10, goldMin:45, goldMax:75, xpReward:90 },
  { id:'q_kill_sombras2', icon:'🌑', title:'Exterminador das Trevas',
    desc:'Derrote N inimigos na Dungeon das Sombras.', type:'kill_loc', locPrefix:QB_LOC_PREFIX_SOMBRAS,
    amountMin:8, amountMax:12, goldMin:100, goldMax:150, xpReward:220 },

  // ── Dungeon específica — Masmorra Inazami (Oni das Chamas) ──
  { id:'q_inazami_kills', icon:'🔥', title:'Caçador das Cinzas Eternas',
    desc:'Derrote N Onibi na Masmorra Inazami.', type:'kill_loc', locPrefix:QB_LOC_PREFIX_INAZAMI,
    amountMin:3, amountMax:5, goldMin:70, goldMax:110, xpReward:160 },
  { id:'q_inazami_kills2', icon:'🔥', title:'Guardião do Santuário das Cinzas',
    desc:'Derrote N inimigos na Masmorra Inazami.', type:'kill_loc', locPrefix:QB_LOC_PREFIX_INAZAMI,
    amountMin:6, amountMax:9, goldMin:110, goldMax:160, xpReward:240 },
  { id:'q_inazami_cinza', icon:'🌫️', title:'Cinzas Sagradas',
    desc:'Colete N de Cinza Espiritual.', type:'collect', itemId:'cinza_espiritual', category:'dungeon',
    amountMin:3, amountMax:5, goldMin:55, goldMax:90, xpReward:100 },

  // ── Ouro — variações ──
  { id:'q_gold_small', icon:'◈', title:'Moedas do Dia a Dia',
    desc:'Acumule N de ouro em batalhas.', type:'gold',
    amountMin:80, amountMax:150, goldMin:30, goldMax:50, xpReward:60 },
  { id:'q_gold_big', icon:'◈', title:'Cofre Cheio',
    desc:'Acumule N de ouro em batalhas.', type:'gold',
    amountMin:400, amountMax:600, goldMin:120, goldMax:180, xpReward:220 },
];

function _qbRand(min, max) { return Math.floor(min + Math.random() * (max - min + 1)); }

// Quantas missões ficam visíveis no Quadro por vez (de um pool bem maior —
// ver QUEST_DEFS). Mantém o tamanho do grid que já existia (3x3).
const QB_BOARD_SIZE = 6;

// Embaralha uma cópia do array (Fisher-Yates) — não mexe no original.
function _qbShuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Infere a categoria de uma def pro filtro do Quadro. Uma def pode forçar
// a própria categoria com `category: '...'` (usado, por ex., em coletas de
// dungeon específica que senão cairiam em 'coleta' genérica); do contrário,
// a categoria é deduzida do tipo/local.
function _qbCategoryOf(def) {
  if (def.category) return def.category;
  if (def.type === 'kill_loc' && def.locPrefix) return 'dungeon';
  if (def.type === 'kill_loc' || def.type === 'kill_any') return 'combate';
  if (def.type === 'collect') return 'coleta';
  if (def.type === 'gold') return 'ouro';
  if (def.type === 'level' || def.type === 'visit') return 'exploracao';
  return 'exploracao';
}

// ─────────────────────────────────────────────────────────────
//  INTELIGÊNCIA DO QUADRO
//  O quadro observa o que o jogador realmente faz (onde luta, o que
//  coleta) e só oferece contratos que ele consegue cumprir agora, com
//  tamanho e recompensa proporcionais ao nível. Guardado em G.questStats
//  (vai junto no save).
// ─────────────────────────────────────────────────────────────
function _qbStats() {
  if (!G.questStats || typeof G.questStats !== 'object') G.questStats = {};
  const st = G.questStats;
  if (!st.kills || typeof st.kills !== 'object') st.kills = {};
  if (!st.items || typeof st.items !== 'object') st.items = {};
  if (!Array.isArray(st.recent)) st.recent = [];
  return st;
}

// Área de um local de batalha (mesma lógica dos contratos kill_loc).
function _qbAreaOf(location) {
  const loc = String(location || '');
  if (QB_LOCATIONS_FLORESTA.includes(loc)) return 'floresta';
  if (loc.indexOf(QB_LOC_PREFIX_SOMBRAS) === 0) return 'sombras';
  if (loc.indexOf(QB_LOC_PREFIX_INAZAMI) === 0) return 'inazami';
  return 'outros';
}

// Área que uma def de kill_loc exige (null se não for de local).
function _qbDefArea(def) {
  if (def.locs) return 'floresta';
  if (def.locPrefix === QB_LOC_PREFIX_SOMBRAS) return 'sombras';
  if (def.locPrefix === QB_LOC_PREFIX_INAZAMI) return 'inazami';
  return null;
}

// O jogador já teve esse item? (coletou depois do update, ou tem na bolsa/armazém)
function _qbJaViuItem(id) {
  if (_qbStats().items[id] > 0) return true;
  const inv = (G.player && G.player.inventory) || [];
  if (inv.some(i => i && i.id === id)) return true;
  const arm = (G.armazem && G.armazem.itens) || [];
  return arm.some(i => i && i.id === id);
}

// Dá pra cumprir esse contrato agora? (evita ofertar o que o jogador não alcança)
function _qbElegivel(def, level) {
  const st = _qbStats();
  if (def.type === 'kill_loc') {
    const area = _qbDefArea(def);
    if (area === 'floresta') return true;
    if (area === 'sombras' && G.dungeonSombrasConcluida) return true;
    return (st.kills[area] || 0) > 0;           // só onde ele já lutou
  }
  if (def.type === 'collect') {
    const rara = def.amountMax === 1;
    if (rara && level < QB_RARA_NIVEL_MIN) return false;
    return QB_ITENS_INICIAIS.includes(def.itemId) || _qbJaViuItem(def.itemId);
  }
  return true;
}

// Tamanho/recompensa crescem com o nível (nível 4 = base).
function _qbEscala(level, forca) {
  return Math.min(2.2, 1 + Math.max(0, (level || 1) - QB_UNLOCK_LEVEL) * forca);
}

// Peso de sorteio: contratos do que o jogador mais faz aparecem mais.
function _qbPeso(def) {
  const st = _qbStats();
  let w = 1;
  const area = _qbDefArea(def);
  if (area) w += Math.min(3, (st.kills[area] || 0) / 10);
  if (def.type === 'collect') {
    w += Math.min(2, (st.items[def.itemId] || 0) / 5);
    if (def.amountMax === 1) w *= 0.4;          // drop de boss: raro no quadro
  }
  if (def.type === 'visit' || def.type === 'level') w *= 0.5;
  return w;
}

// Escolhe `count` contratos que combinam entre si (variedade por categoria),
// sem repetir o que já está no quadro nem o que ele fez/recusou há pouco.
function _qbEscolher(count, level, jaNoQuadro) {
  const st = _qbStats();
  const usados = new Set((jaNoQuadro || []).map(q => q.defId));
  const recentes = new Set(st.recent.slice(-QB_COOLDOWN_RECENTES));
  const LIMITE = { combate: 2, coleta: 3, ouro: 1, exploracao: 1, dungeon: 2 };
  const porCat = {};
  (jaNoQuadro || []).forEach(q => { porCat[q.category] = (porCat[q.category] || 0) + 1; });

  let base = QUEST_DEFS.filter(d => !usados.has(d.id) && _qbElegivel(d, level));
  const semRecentes = base.filter(d => !recentes.has(d.id));
  if (semRecentes.length >= count) base = semRecentes;

  const escolhidos = [];
  const temVitoriaRapida = (jaNoQuadro || []).some(q => q.type === 'kill_any');
  for (let n = 0; n < count && base.length; n++) {
    let cand = base.filter(d => (porCat[_qbCategoryOf(d)] || 0) < (LIMITE[_qbCategoryOf(d)] || 2));
    // sempre ao menos 1 contrato "vença batalhas" (cumpre-se jogando normalmente)
    if (n === 0 && !temVitoriaRapida) {
      const rapidos = base.filter(d => d.type === 'kill_any');
      if (rapidos.length) cand = rapidos;
    }
    if (!cand.length) cand = base;               // sem opção dentro do limite: relaxa
    const total = cand.reduce((a, d) => a + _qbPeso(d), 0);
    let r = Math.random() * total, pick = cand[cand.length - 1];
    for (const d of cand) { r -= _qbPeso(d); if (r <= 0) { pick = d; break; } }
    escolhidos.push(pick);
    const cat = _qbCategoryOf(pick);
    porCat[cat] = (porCat[cat] || 0) + 1;
    base = base.filter(d => d.id !== pick.id);
  }
  return escolhidos.map(d => _qbMakeQuest(d, level));
}

// Converte uma definição do pool (QUEST_DEFS) numa missão ativa do board.
// Combate/ouro escalam com o nível; coleta não (depende de drop, não de nível).
function _qbMakeQuest(def, level) {
  let amount = _qbRand(def.amountMin, def.amountMax);
  if (def.type === 'kill_any' || def.type === 'kill_loc' || def.type === 'gold') {
    amount = Math.max(1, Math.round(amount * _qbEscala(level, 0.05)));
  }
  const esc = _qbEscala(level, 0.06);
  return {
    defId: def.id,
    icon: def.icon,
    title: def.title,
    desc: def.desc.replace(/\bN\b/, amount),
    type: def.type,
    category: _qbCategoryOf(def),
    itemId: def.itemId || null,
    locs: def.locs || null,
    locPrefix: def.locPrefix || null,
    amount: def.type === 'level' ? (level + 1) : amount,
    progress: def.type === 'level' ? level : 0,
    rewardGold: Math.round(_qbRand(def.goldMin, def.goldMax) * esc),
    rewardXp: Math.round((def.xpReward || 0) * esc),
    cycles: 0,
    completed: false,
    claimed: false,
  };
}

// ── Ouro de recompensa de um inimigo, com fallback seguro ──
// Qualquer inimigo (de qualquer masmorra/arquivo, atual ou futuro) que não
// tenha "gold" definido no seu objeto de dados cai automaticamente pra um
// valor justo baseado no XP, em vez de gerar NaN/undefined e travar a
// recompensa do jogador. Usado tanto na vitória de batalha quanto no
// progresso de contratos "gold" do Quadro de Quests.
function getEnemyGoldReward(enemy) {
  if (!enemy) return 0;
  return (typeof enemy.gold === 'number' && !isNaN(enemy.gold))
    ? enemy.gold
    : Math.max(1, Math.round((enemy.xp || 10) * 0.5));
}
window.getEnemyGoldReward = getEnemyGoldReward;

const QuestBoard = {

  // Filtro de categoria ativo no Quadro (runtime only — não é salvo, sempre
  // volta pra 'todas' ao reabrir o jogo).
  currentFilter: 'todas',

  isUnlocked() {
    return (G.player && G.player.level || 1) >= QB_UNLOCK_LEVEL;
  },

  init() {
    this.checkUnlockAndRefresh();
    if (!window._qbInterval) {
      window._qbInterval = setInterval(() => this.checkUnlockAndRefresh(), 60 * 1000);
    }
  },

  // Gera um novo ciclo do quadro SEM apagar o que o jogador já avançou:
  //  • contrato concluído e não resgatado → sempre continua (nunca perde recompensa)
  //  • contrato iniciado (progress > 0)   → continua por até 3 ciclos
  //  • o resto (intocado/resgatado/recusado) → vaga nova, escolhida pela
  //    inteligência do quadro (_qbEscolher)
  generateBoard() {
    const level = G.player.level || 1;
    const antigo = G.questBoard;
    const mantidos = [];
    if (antigo && Array.isArray(antigo.quests)) {
      antigo.quests.forEach(q => {
        if (q.claimed || q.declined) return;
        if (q.completed) { mantidos.push(q); return; }
        if (q.progress > 0 && (q.cycles || 0) < 3) { q.cycles = (q.cycles || 0) + 1; mantidos.push(q); }
      });
    }
    const novos = _qbEscolher(Math.max(0, QB_BOARD_SIZE - mantidos.length), level, mantidos);
    G.questBoard = {
      lastRefresh: Date.now(),
      claimedThisCycle: 0,
      recusasUsadas: 0,
      visited: (antigo && antigo.visited) ? antigo.visited : {},
      quests: mantidos.concat(novos),
    };
    notify('📋 Novos contratos disponíveis no Quadro de Quests!', 'gold');
  },

  checkUnlockAndRefresh() {
    if (!G.player) return;
    const unlocked = this.isUnlocked();
    if (unlocked && (!G.questBoard || (Date.now() - G.questBoard.lastRefresh) >= QB_REFRESH_MS)) {
      this.generateBoard();
    }
    this._reporRecusados();
    this.updatePin();
  },

  // Contratos recusados pela gaveta (✕) viram "declined" lá no gat-1.html.
  // Aqui eles ganham vaga nova (até QB_RECUSAS_POR_CICLO por ciclo) e entram
  // no cooldown pra não voltarem logo em seguida.
  _reporRecusados() {
    const b = G.questBoard;
    if (!b || !Array.isArray(b.quests)) return;
    const st = _qbStats();
    const level = G.player.level || 1;
    let mudou = false;
    b.quests.forEach((q, idx) => {
      if (!q.declined || q._reposto) return;
      q._reposto = true;
      st.recent.push(q.defId);
      if ((b.recusasUsadas || 0) >= QB_RECUSAS_POR_CICLO) return;
      const novo = _qbEscolher(1, level, b.quests.filter(x => !x.declined && !x.claimed));
      if (novo.length) { b.quests[idx] = novo[0]; b.recusasUsadas = (b.recusasUsadas || 0) + 1; mudou = true; }
    });
    if (st.recent.length > 40) st.recent.splice(0, st.recent.length - 40);
    if (mudou && typeof window.renderMissoes === 'function') setTimeout(() => window.renderMissoes(), 0);
  },

  updatePin() {
    if (G.questBoard) this._reporRecusados();
    const marker = document.getElementById('quest-pin-marker');
    const label  = document.getElementById('quest-pin-label');
    if (!marker) return;
    const unlocked = this.isUnlocked();
    marker.classList.toggle('quest-locked', !unlocked);
    marker.classList.toggle('quest-unlocked', unlocked);
    const hasReward = unlocked && G.questBoard && G.questBoard.quests.some(q => q.completed && !q.claimed);
    marker.classList.toggle('quest-has-reward', !!hasReward);
    if (label) label.textContent = unlocked ? 'Quadro de Quests' : `Quadro (Nv.${QB_UNLOCK_LEVEL})`;
    if (window.missoeVerificarVisibilidade) missoeVerificarVisibilidade();
    if (window.missoeAtualizarBadge) missoeAtualizarBadge();
  },

  _findOpen(type) {
    if (!G.questBoard) return [];
    return G.questBoard.quests.filter(q => q.type === type && !q.completed && !q.claimed && !q.declined);
  },

  _completeIfReady(q) {
    if (q.progress >= q.amount && !q.completed) {
      q.completed = true;
      notify(`✅ Missão concluída: ${q.title}! Volte ao Quadro para resgatar.`, 'gold');
    }
  },

  onBattleWon(enemy, location) {
    // O quadro aprende onde o jogador luta (mesmo antes de o quadro existir).
    const _st = _qbStats(), _area = _qbAreaOf(location);
    _st.kills[_area] = (_st.kills[_area] || 0) + 1;
    if (!G.questBoard) return;
    this._findOpen('kill_any').forEach(q => { q.progress++; this._completeIfReady(q); });
    this._findOpen('kill_loc').forEach(q => {
      const defMatch = (q.locs && q.locs.includes(location)) ||
                        (q.locPrefix && location && location.indexOf(q.locPrefix) === 0);
      if (defMatch) { q.progress++; this._completeIfReady(q); }
    });
    if (enemy) {
      const _egr = getEnemyGoldReward(enemy);
      if (_egr > 0) {
        this._findOpen('gold').forEach(q => { q.progress += _egr; this._completeIfReady(q); });
      }
    }
    this.updatePin();
  },

  onItemCollected(itemId, qty) {
    if (itemId) { const _st = _qbStats(); _st.items[itemId] = (_st.items[itemId] || 0) + (qty || 1); }
    if (!G.questBoard) return;
    this._findOpen('collect').filter(q => q.itemId === itemId).forEach(q => {
      q.progress += qty; this._completeIfReady(q);
    });
    this.updatePin();
  },

  onLevelChanged() {
    this.checkUnlockAndRefresh();
    if (!G.questBoard) return;
    const level = G.player.level || 1;
    this._findOpen('level').forEach(q => { q.progress = level; this._completeIfReady(q); });
    this.updatePin();
  },

  onVisit(dest) {
    if (!G.questBoard || !dest) return;
    G.questBoard.visited[dest] = true;
    const count = Object.keys(G.questBoard.visited).length;
    this._findOpen('visit').forEach(q => { q.progress = count; this._completeIfReady(q); });
    this.updatePin();
  },

  // Recusa um contrato antes de completá-lo (sem recompensa). Segue o mesmo
  // caminho da gaveta: marca como recusado e a vaga é reposta pela
  // inteligência do quadro, respeitando QB_RECUSAS_POR_CICLO.
  decline(idx) {
    if (!G.questBoard) return;
    const q = G.questBoard.quests[idx];
    if (!q || q.claimed || q.completed) return;
    q.declined = true;
    q.claimed = true;
    notify(`✕ Contrato recusado: ${q.title}.`, 'gold');
    this._reporRecusados();
    this.renderBoard();
    this.updatePin();
    if (window.renderMissoes) renderMissoes();
  },

  claim(idx) {
    if (!G.questBoard) return;
    const q = G.questBoard.quests[idx];
    if (!q || !q.completed || q.claimed) return;
    q.claimed = true;
    G.player.gold += q.rewardGold;
    if (q.rewardXp > 0) {
      G.player.xp = (G.player.xp || 0) + q.rewardXp;
      if (window.checkLevelUp) checkLevelUp();
    }
    notify(`🎁 Recompensa resgatada: +${q.rewardGold}◈ e +${q.rewardXp} XP!`, 'gold');
    // Conquista "Quadro Completo" — resgatou QB_BOARD_SIZE contratos dentro
    // do mesmo ciclo (não precisa mais ser os 9 originais ao mesmo tempo,
    // já que agora a vaga é reposta na hora — conta cumulativo do ciclo).
    G.questBoard.claimedThisCycle = (G.questBoard.claimedThisCycle || 0) + 1;
    if (window.Achievements && G.questBoard.claimedThisCycle >= QB_BOARD_SIZE) {
      Achievements.unlock('ach_quests_completas');
    }
    _qbStats().recent.push(q.defId);
    if (QB_REPOR_AO_RESGATAR) {
      // modo antigo (sem fim): vaga reposta na hora
      const novo = _qbEscolher(1, G.player.level || 1, G.questBoard.quests.filter(x => !x.claimed && !x.declined));
      if (novo.length) G.questBoard.quests[idx] = novo[0];
    } else if (G.questBoard.quests.every(x => x.claimed || x.declined)) {
      // quadro finito: resgatou tudo → próximo ciclo imediato, sem esperar o relógio
      this.generateBoard();
    }
    updateHUD();
    this.renderBoard();
    this.updatePin();
    // Atualiza também o drawer rápido de "Missões Ativas" (gat-1.html), caso
    // o resgate tenha vindo de lá em vez da tela cheia do Quadro.
    if (typeof window.renderMissoes === 'function') window.renderMissoes();
    // Conta o contrato resgatado (contador ACUMULADO em G.player.questsResgatadas)
    // e libera a Mundial Armor ao bater a meta — ver mundial_armor.js.
    if (typeof registrarQuestResgatada === 'function') registrarQuestResgatada();
  },

  // Troca o filtro de categoria ativo e re-renderiza o Quadro.
  setFilter(category) {
    this.currentFilter = category || 'todas';
    this.renderBoard();
  },

  // Retorna [{q, idx}] com o índice original em G.questBoard.quests
  // preservado — os botões de clique/resgate do card usam esse idx.
  getFiltered() {
    if (!G.questBoard) return [];
    const cat = this.currentFilter || 'todas';
    return G.questBoard.quests
      .map((q, idx) => ({ q, idx }))
      .filter(({ q }) => cat === 'todas' || q.category === cat);
  },

  // Desenha a barra de filtros por categoria, se o container existir no
  // HTML (id="quest-board-filters"). Se não existir, não faz nada — o
  // Quadro continua funcionando normalmente sem filtro visível.
  renderFilters() {
    const bar = document.getElementById('quest-board-filters');
    if (!bar) return;
    const cat = this.currentFilter || 'todas';
    bar.innerHTML = QB_CATEGORIES.map(c => `
      <button class="qb-filter-btn${cat === c.id ? ' active' : ''}" onclick="QuestBoard.setFilter('${c.id}')">${c.icon} ${c.label}</button>
    `).join('');
  },

  renderBoard() {
    const grid = document.getElementById('quest-board-grid');
    const note = document.getElementById('quest-board-refresh-note');
    if (!grid) return;
    this.renderFilters();
    this._reporRecusados();
    if (!G.questBoard) { grid.innerHTML = ''; return; }
    const filtered = this.getFiltered();
    if (!filtered.length) {
      grid.innerHTML = `<div class="qb-empty-note">Nenhum contrato dessa categoria no momento.</div>`;
      void grid.offsetHeight;
      return;
    }
    // Monta tudo como uma única string e insere de uma vez (em vez de
    // appendChild por item dentro do loop) — evita o bug de WebView onde
    // o layout do grid "perde" a altura de alguns itens ao inserir um por
    // um, deixando vãos vazios entre os cards até rolar/interagir de novo.
    const slotsHtml = filtered.map(({ q, idx }) => {
      const pct = Math.min(100, Math.round((q.progress / q.amount) * 100));
      const cls = 'qb-slot' + (q.completed ? ' completed' : '') + (q.claimed ? ' claimed' : '');
      return `
        <div class="${cls}" style="cursor:pointer;" onclick="QuestModal.openQuestDetail(${idx})">
          <div class="qb-slot-icon">${q.icon}</div>
          <div class="qb-slot-title">${q.title}</div>
          <div class="qb-slot-desc">${q.desc}</div>
          <div class="qb-slot-bar"><div class="qb-slot-bar-fill" style="width:${pct}%;"></div></div>
          <div class="qb-slot-prog">${Math.min(q.progress, q.amount)}/${q.amount}</div>
          <div class="qb-slot-reward">+${q.rewardGold}◈ · +${q.rewardXp ?? 0} XP</div>
          ${q.claimed ? '<div class="qb-slot-prog">Resgatado</div>' :
            q.completed ? `<button class="qb-slot-claim" onclick="event.stopPropagation(); QuestBoard.claim(${idx})">Resgatar</button>` : ''}
        </div>`;
    }).join('');
    grid.innerHTML = slotsHtml;
    // Força o WebView a repintar: sem isso, cards fora da área visível no
    // momento da injeção do innerHTML ficam em branco (sem fundo/texto) até
    // o usuário interagir de algum jeito com a tela.
    void grid.offsetHeight;
    if (note) {
      const nextRefresh = G.questBoard.lastRefresh + QB_REFRESH_MS;
      const minutesLeft = Math.max(0, Math.ceil((nextRefresh - Date.now()) / (1000 * 60)));
      const total = (G.player && typeof G.player.questsResgatadas === 'number') ? G.player.questsResgatadas : null;
      note.textContent = `Novos contratos em ${minutesLeft}min.` + (total !== null ? ` · Contratos resgatados: ${total}` : '');
    }
  },
};
window.QuestBoard = QuestBoard;

// ─────────────────────────────────────────────────────────────
//  CONQUISTAS (marcos únicos — não expiram, não competem
//  com os contratos rotativos do Quadro de Quests).
//
//  Diferente do QuestBoard (que sorteia contratos novos a cada 48h),
//  cada conquista aqui só existe uma vez na vida do save. Assim que o
//  jogador resgata, ela some da lista — "pending()" só retorna o que
//  ainda falta, então o quadro visualmente encolhe e, quando tudo foi
//  resgatado, fica vazio (exatamente como pedido).
//
//  Conquistas mais difíceis dão mais XP/ouro (ex: Runa SS > Runa A).
// ─────────────────────────────────────────────────────────────
const ACHIEVEMENT_DEFS = [
  { id:'ach_craft',           icon:'⚗️', title:'Primeira Criação',
    desc:'Fabrique seu primeiro item na forja de Gozen.', xpReward:40,  goldReward:20 },
  { id:'ach_compra',          icon:'🛒', title:'Primeira Compra',
    desc:'Compre um item de um vendedor.', xpReward:30,  goldReward:15 },
  { id:'ach_armadura',        icon:'🛡️', title:'Primeira Armadura',
    desc:'Equipe sua primeira armadura.', xpReward:40,  goldReward:20 },
  { id:'ach_saida_vilarejo',  icon:'🚪', title:'Além dos Portões',
    desc:'Deixe o Vilarejo da Pedra Branca pela primeira vez.', xpReward:20,  goldReward:10 },
  { id:'ach_dungeon',         icon:'🌑', title:'Primeira Dungeon',
    desc:'Entre na Dungeon das Sombras pela primeira vez.', xpReward:150, goldReward:80 },
  { id:'ach_masmorra',        icon:'🏯', title:'Primeira Masmorra',
    desc:'Entre em uma masmorra (Kappa ou Templo do Vazio Ecoante) pela primeira vez.', xpReward:200, goldReward:100 },
  { id:'ach_quests_completas',icon:'📋', title:'Quadro Completo',
    desc:'Resgate todas as missões do Quadro de Quests em um mesmo ciclo.', xpReward:250, goldReward:150 },
  { id:'ach_runa_a',          icon:'💎', title:'Runa A Forjada',
    desc:'Forje o encantamento de Runa A na sua arma.', xpReward:180, goldReward:100 },
  { id:'ach_runa_s',          icon:'💠', title:'Runa S Forjada',
    desc:'Forje o encantamento de Runa S na sua arma.', xpReward:300, goldReward:200 },
  { id:'ach_runa_ss',         icon:'✨', title:'Runa SS Forjada',
    desc:'Forje o encantamento máximo de Runa SS na sua arma.', xpReward:500, goldReward:350 },
  { id:'ach_kills_50',        icon:'⚔️', title:'Caçador Iniciante',
    desc:'Derrote 50 inimigos.', xpReward:80,  goldReward:50,  killTarget:50 },
  { id:'ach_kills_100',       icon:'⚔️', title:'Caçador Experiente',
    desc:'Derrote 100 inimigos.', xpReward:150, goldReward:100, killTarget:100 },
  { id:'ach_kills_200',       icon:'⚔️', title:'Caçador Lendário',
    desc:'Derrote 200 inimigos.', xpReward:300, goldReward:200, killTarget:200 },
  { id:'ach_gold_10k',        icon:'◈', title:'Pequena Fortuna',
    desc:'Acumule 10.000 de ouro.', xpReward:400, goldReward:250, goldTarget:10000 },
  { id:'ach_gold_20k',        icon:'◈', title:'Grande Fortuna',
    desc:'Acumule 20.000 de ouro.', xpReward:700, goldReward:500, goldTarget:20000 },
  { id:'ach_gold_30k',        icon:'◈', title:'Fortuna Lendária',
    desc:'Acumule 30.000 de ouro.', xpReward:1000, goldReward:800, goldTarget:30000 },
];

const Achievements = {
  init() {
    if (!G.achievements) G.achievements = {};
  },

  isUnlocked(id) { return !!(G.achievements && G.achievements[id] && G.achievements[id].unlocked); },
  isClaimed(id)  { return !!(G.achievements && G.achievements[id] && G.achievements[id].claimed); },

  unlock(id) {
    this.init();
    const def = ACHIEVEMENT_DEFS.find(d => d.id === id);
    if (!def) return;
    if (!G.achievements[id]) G.achievements[id] = { unlocked: false, claimed: false };
    if (G.achievements[id].unlocked) return; // já desbloqueada antes — não repete o aviso
    G.achievements[id].unlocked = true;
    notify(`🏆 Conquista desbloqueada: ${def.title}! Volte ao Quadro para resgatar.`, 'gold');
    if (window.showAchievementPopup) showAchievementPopup(def);
    this.updatePin();
  },

  claim(id) {
    this.init();
    const state = G.achievements[id];
    const def   = ACHIEVEMENT_DEFS.find(d => d.id === id);
    if (!state || !def || !state.unlocked || state.claimed) return;
    state.claimed = true;
    if (def.goldReward) G.player.gold += def.goldReward;
    if (def.xpReward)   {
      G.player.xp = (G.player.xp || 0) + def.xpReward;
      if (window.checkLevelUp) {
        try { checkLevelUp(); } catch (e) { console.error('checkLevelUp falhou ao resgatar conquista:', e); }
      }
    }
    notify(`🏆 Conquista resgatada: ${def.title}! +${def.goldReward || 0}◈ +${def.xpReward || 0} XP`, 'gold');
    // Cada atualização de tela roda isolada — se uma falhar (ex.: algum
    // elemento do HUD não estar presente na tela naquele momento), as
    // outras (e a galeria de conquistas, que depende de claim() ter
    // terminado) continuam funcionando normalmente.
    try { updateHUD(); } catch (e) { console.error('updateHUD falhou ao resgatar conquista:', e); }
    try { this.renderBoard(); } catch (e) { console.error('renderBoard (Achievements) falhou ao resgatar conquista:', e); }
    try { this.updatePin(); } catch (e) { console.error('updatePin (Achievements) falhou ao resgatar conquista:', e); }
    // Atualiza também o drawer rápido de "Missões Ativas", caso o resgate
    // tenha vindo de lá em vez da tela cheia do Quadro.
    if (typeof window.renderMissoes === 'function') {
      try { window.renderMissoes(); } catch (e) { console.error('renderMissoes falhou ao resgatar conquista:', e); }
    }
  },

  // Checagem de marcos numéricos (abates/ouro) — chamada a cada updateHUD(),
  // então qualquer ação que altere kills/gold (batalha, venda, quest, etc.)
  // acaba disparando a conquista automaticamente, sem precisar de gancho
  // manual em cada lugar que mexe nesses números.
  checkThresholds() {
    this.init();
    const p = G.player;
    ACHIEVEMENT_DEFS.forEach(def => {
      if (def.killTarget && (p.kills || 0) >= def.killTarget) this.unlock(def.id);
      if (def.goldTarget && (p.gold  || 0) >= def.goldTarget) this.unlock(def.id);
    });
  },

  // Lista só do que ainda falta resgatar — conforme o jogador resgata,
  // essa lista encolhe; quando tudo foi resgatado, fica vazia.
  pending() {
    this.init();
    return ACHIEVEMENT_DEFS.filter(def => !this.isClaimed(def.id));
  },

  hasUnclaimedReward() {
    this.init();
    return ACHIEVEMENT_DEFS.some(d => this.isUnlocked(d.id) && !this.isClaimed(d.id));
  },

  updatePin() {
    // Reaproveita o mesmo pin visual do Quadro de Quests pra avisar de
    // conquista pronta pra resgatar (ícone de "tem recompensa").
    const marker = document.getElementById('quest-pin-marker');
    if (marker && this.hasUnclaimedReward()) marker.classList.add('quest-has-reward');
    // ⚠️ Estas duas funções (aba "MISSÕES" que soma/aparece sozinha) ficam
    // no gat-1.html — checadas via feature-detection, então funcionam
    // independente da ordem de carga.
    if (window.missoeVerificarVisibilidade) missoeVerificarVisibilidade();
    if (window.missoeAtualizarBadge) missoeAtualizarBadge();
  },

  renderBoard() {
    // Espera um <div id="achievements-board-grid"> dentro do overlay do
    // Quadro de Quests (gat-1.html) — se ainda não existir, não faz nada.
    const grid = document.getElementById('achievements-board-grid');
    if (!grid) return;
    const pending = this.pending();
    if (!pending.length) {
      grid.innerHTML = `<div class="ach-empty-note">Todas as conquistas foram resgatadas. Novos marcos aparecerão conforme você avança.</div>`;
      return;
    }
    // Mesma correção do QuestBoard: monta tudo como uma única string HTML e
    // insere de uma vez, em vez de criar+anexar card por card num loop —
    // isso é o que causava os vãos vazios enormes entre conquistas na WebView.
    const cardsHtml = pending.map(def => {
      const ready = this.isUnlocked(def.id);

      // Barra de progresso só faz sentido pra marcos numéricos (abates/ouro);
      // as demais conquistas (evento único) mostram só "Em progresso...".
      let progressHtml = '';
      if (!ready && (def.killTarget || def.goldTarget)) {
        const current = def.killTarget ? (G.player.kills || 0) : (G.player.gold || 0);
        const target  = def.killTarget || def.goldTarget;
        const pct = Math.max(0, Math.min(100, (current / target) * 100));
        progressHtml = `
          <div class="ach-progress-wrap">
            <div class="ach-progress-bar"><div class="ach-progress-fill" style="width:${pct}%"></div></div>
            <div class="ach-progress-num">${Math.min(current, target)}/${target}</div>
          </div>`;
      } else if (!ready) {
        progressHtml = `<div class="ach-meta">Em progresso...</div>`;
      }

      return `
        <div class="ach-card${ready ? ' ready' : ''}">
          <div class="ach-medal">${def.icon}</div>
          <div class="ach-body">
            <div class="ach-title">${def.title}</div>
            <div class="ach-desc">${def.desc}</div>
            <div class="ach-meta">+${def.goldReward || 0}◈ · +${def.xpReward || 0} XP</div>
            ${progressHtml}
            ${ready ? `<button class="ach-claim-btn" onclick="Achievements.claim('${def.id}')">Resgatar</button>` : ''}
          </div>
        </div>`;
    }).join('');
    grid.innerHTML = cardsHtml;
    void grid.offsetHeight;
  },
};
window.Achievements = Achievements;

let _qbScrollY = 0;
function openQuestBoard() {
  if (!QuestBoard.isUnlocked()) {
    notify(`🔒 O Quadro de Quests abre a partir do Nível ${QB_UNLOCK_LEVEL}.`, 'red');
    return;
  }
  QuestBoard.checkUnlockAndRefresh();
  QuestBoard.renderBoard();
  Achievements.renderBoard();
  document.getElementById('quest-board-overlay').classList.add('active');
  // "Cutuca" o scroll do painel pra forçar o WebView a repintar tudo de
  // uma vez — cobre qualquer card que o reflow do grid sozinho não pegue.
  const qbPanelEl = document.querySelector('#quest-board-overlay .qb-panel');
  if (qbPanelEl) {
    requestAnimationFrame(() => {
      qbPanelEl.scrollTop += 1;
      requestAnimationFrame(() => { qbPanelEl.scrollTop -= 1; });
    });
  }
  // Trava o scroll do body enquanto o painel está aberto — no WebView do
  // Acode o scroll interno do .qb-panel pode "vazar" pra página por trás
  // e desalinhar o HUD/minimapa, que não são fixed de verdade.
  _qbScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${_qbScrollY}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.width = '100%';
}
window.openQuestBoard = openQuestBoard;

function closeQuestBoard() {
  document.getElementById('quest-board-overlay').classList.remove('active');
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.width = '';
  window.scrollTo(0, _qbScrollY);
}
window.closeQuestBoard = closeQuestBoard;

function switchQuestTab(tabName, btn) {
  // Esconde todas as abas
  document.querySelectorAll('.qb-tab-content').forEach(tab => {
    tab.classList.remove('active');
  });

  // Desativa todos os botões
  document.querySelectorAll('.qb-tab-btn').forEach(button => {
    button.classList.remove('active');
  });

  // Mostra a aba selecionada
  const selectedTab = document.getElementById('tab-' + tabName);
  if (selectedTab) {
    selectedTab.classList.add('active');
  }

  btn.classList.add('active');
}
window.switchQuestTab = switchQuestTab;
