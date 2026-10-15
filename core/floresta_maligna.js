// ═══════════════════════════════════════════════════════════════════
//  FLORESTA MALIGNA — evento noturno aleatório
//  Depende de: G, startBattle, showEnemy, hideEnemy, setStory,
//  storyNode_vilarejo, notify (todos definidos em palDinh.js).
//  Carregar DEPOIS de core/palDinh.js no <script> do gat-1.html.
//
//  Fluxo:
//   1) A cada storyNode_explorar() na floresta, de noite (ciclo dia/noite
//      já existente), há uma chance de mostrar o pop-up de aviso.
//   2) "Voltar ao Vilarejo" cancela e aplica um cooldown curto.
//      "Seguir em Frente" ativa o modo (visual mais pesado na cena).
//   3) Dentro do modo, cada exploração sorteia um inimigo comum (1–7)
//      OU (chance configurável) um dos 4 chefes (8–11).
//   4) O modo SÓ termina de duas formas:
//        • o tempo acaba (4 min)  -> volta pro vilarejo
//        • o jogador MORRE (comum ou chefe) -> volta pro vilarejo
//      Vencer chefes ou inimigos comuns NÃO encerra: segue lutando.
//      Dentro do modo NÃO existe fuga nem descanso, e qualquer botão
//      de explorar/procurar inimigos gera um encontro da floresta maligna.
//
//  PENDENTE (Clau vai mandar depois): sprites/PNGs de todos os
//  inimigos, stats finais dos 4 chefes, e o loot dos chefes.
//  Os valores abaixo são um ponto de partida — fica fácil de ajustar
//  já que tudo está isolado neste arquivo.
// ═══════════════════════════════════════════════════════════════════

// ── Configuração ──
const FL_MALIGNA_CHANCE_DISPARO = 0.18;      // chance de tentar disparar por exploração noturna
const FL_MALIGNA_CHANCE_BOSS    = 0.25;      // chance de cair num chefe em vez de um comum, dentro do modo
const FL_MALIGNA_COOLDOWN_MS    = 3 * 60 * 1000; // "descanso" antes de poder tentar disparar de novo
const FL_MALIGNA_DURACAO_MS     = 4 * 60 * 1000; // duração do modo: 4 minutos de exploração por ativação

// ── Inimigos comuns (1–7) ──
const FLORESTA_MALIGNA_COMUNS = [
  {
    id: 'flm_lobo', name: 'Kurogami', icon: '🐺',
    img: 'Imagens/personagens/LoboOi.png',
    elemento: 'sombra',
    hp: 95, atk: 26, def: 9,
    xp: 55, gold: 26, minLevel: 1, maxLevel: 99, tier: 3,
    desc: 'Inimigo básico. HP baixo, DEF baixa, ataques rápidos.',
    loot: [
      { id:'pedaco_pergaminho_flm', name:'Pedaço de Pergaminho', icon:'📜', imgSrc:'Imagens/icones/materiais/pedaco_pergaminho_flm.png', chance:0.25, weight:0.1, type:'material', desc:'Fragmento de um pergaminho antigo, rasgado. Sozinho não diz muita coisa.' },
      { id:'raiz_retorcida', name:'Raiz Retorcida', icon:'🌿', imgSrc:'Imagens/icones/materiais/raiz_retorcida.png', chance:0.2, weight:0.2, type:'material', desc:'Raiz negra e retorcida, ainda pulsando de leve. Material de craft.' },
      { id:'olho_rubro_cacador', name:'Olho Rubro do Caçador', icon:'👁️', imgSrc:'Imagens/icones/materiais/olho_rubro_cacador.png', chance:0.08, weight:0.1, type:'material', desc:'Um olho vermelho-vivo que parece observar mesmo fora do corpo. Item raro.' },
    ],
  },
  {
    id: 'flm_lobo_oni', name: 'Lobo Oni', icon: '👹',
    img: 'Imagens/personagens/LoboOni.png',
    elemento: 'sombra',
    hp: 135, atk: 32, def: 12,
    xp: 68, gold: 32, minLevel: 1, maxLevel: 99, tier: 3,
    desc: 'Versão mais forte do Kurogami. ATK e DEF acima da média.',
    loot: [
      { id:'pedaco_pergaminho_flm', name:'Pedaço de Pergaminho', icon:'📜', imgSrc:'Imagens/icones/materiais/pedaco_pergaminho_flm.png', chance:0.3, weight:0.1, type:'material', desc:'Fragmento de um pergaminho antigo, rasgado.' },
      { id:'raiz_retorcida', name:'Raiz Retorcida', icon:'🌿', imgSrc:'Imagens/icones/materiais/raiz_retorcida.png', chance:0.15, weight:0.2, type:'material' },
      { id:'olho_rubro_cacador', name:'Olho Rubro do Caçador', icon:'👁️', imgSrc:'Imagens/icones/materiais/olho_rubro_cacador.png', chance:0.1, weight:0.1, type:'material' },
    ],
  },
  {
    id: 'flm_colosso_verde', name: 'Colosso Verde da Floresta', icon: '🌲',
    img: 'Imagens/personagens/ColossoVerde.png',
    elemento: 'planta',
    hp: 175, atk: 27, def: 20,
    xp: 82, gold: 38, minLevel: 1, maxLevel: 99, tier: 3,
    desc: 'Tanque. HP alto, DEF alta, dano abaixo da média.',
    loot: [
      { id:'casca_arvore_flm', name:'Casca de Árvore', icon:'🪵', imgSrc:'Imagens/icones/materiais/casca_arvore_flm.png', chance:0.45, weight:0.3, type:'material' },
      { id:'raiz_retorcida', name:'Raiz Retorcida', icon:'🌿', imgSrc:'Imagens/icones/materiais/raiz_retorcida.png', chance:0.25, weight:0.2, type:'material' },
      { id:'pedaco_pergaminho_flm', name:'Pedaço de Pergaminho', icon:'📜', imgSrc:'Imagens/icones/materiais/pedaco_pergaminho_flm.png', chance:0.15, weight:0.1, type:'material' },
    ],
  },
  {
    id: 'flm_colosso_arboreo', name: 'Colosso Arbóreo', icon: '🌳',
    img: 'Imagens/personagens/arvored.png',
    elemento: 'planta',
    hp: 195, atk: 29, def: 24,
    xp: 90, gold: 42, minLevel: 1, maxLevel: 99, tier: 3,
    desc: 'Versão upada do Colosso Verde. Mais HP e DEF.',
    loot: [
      { id:'casca_arvore_flm', name:'Casca de Árvore', icon:'🪵', imgSrc:'Imagens/icones/materiais/casca_arvore_flm.png', chance:0.5, weight:0.3, type:'material' },
      { id:'raiz_retorcida', name:'Raiz Retorcida', icon:'🌿', imgSrc:'Imagens/icones/materiais/raiz_retorcida.png', chance:0.3, weight:0.2, type:'material' },
      { id:'pedaco_pergaminho_flm', name:'Pedaço de Pergaminho', icon:'📜', imgSrc:'Imagens/icones/materiais/pedaco_pergaminho_flm.png', chance:0.15, weight:0.1, type:'material' },
    ],
  },
  {
    id: 'flm_raposa', name: 'Raposa Japonesa', icon: '🦊',
    img: 'Imagens/personagens/flm_raposa.png',
    elemento: 'fogo',
    hp: 100, atk: 30, def: 10,
    xp: 62, gold: 30, minLevel: 1, maxLevel: 99, tier: 3,
    desc: 'Rápida e agressiva. ATK alto, DEF baixa. Elemento fogo.',
    loot: [
      { id:'perola_das_nove', name:'Pérola das Nove', icon:'🔮', imgSrc:'Imagens/icones/materiais/perola_das_nove.png', chance:0.12, weight:0.1, type:'material', desc:'Pérola pálida, dizem que uma para cada cauda. Item raro.' },
      { id:'mascara_raposa', name:'Máscara da Raposa', icon:'🎭', imgSrc:'Imagens/icones/materiais/mascara_raposa.png', chance:0.08, weight:0.15, type:'material', desc:'Máscara de madeira laqueada, ainda quente ao toque. Item raro.' },
    ],
  },
  {
    id: 'flm_mago', name: 'Mago', icon: '🧙',
    img: 'Imagens/personagens/flm_mago.png',
    elemento: 'energia',
    hp: 115, atk: 35, def: 8,
    xp: 70, gold: 34, minLevel: 1, maxLevel: 99, tier: 3,
    desc: 'Glass cannon. ATK muito alto, DEF muito baixa. Elemento arcano.',
    loot: [
      { id:'pergaminho_flm', name:'Pergaminho', icon:'📜', imgSrc:'Imagens/icones/materiais/pergaminho_flm.png', chance:0.4, weight:0.1, type:'material', desc:'Pergaminho selado, coberto de símbolos que ardem levemente ao toque.' },
      { id:'selo_eclipse', name:'Selo do Eclipse', icon:'🌑', imgSrc:'Imagens/icones/materiais/selo_eclipse.png', chance:0.03, weight:0.1, type:'material', desc:'Selo raríssimo, frio mesmo perto do fogo. Diz-se que guarda um pedaço da própria noite.', unique:true },
    ],
  },
  {
    id: 'flm_urso_yokai', name: 'Urso Yokai', icon: '🐻',
    img: 'Imagens/personagens/ursobYokai.png',
    elemento: 'sombra',
    hp: 225, atk: 36, def: 22,
    critChance: 0.12, critMult: 1.6,
    xp: 105, gold: 48, minLevel: 1, maxLevel: 99, tier: 3,
    desc: 'HP e ATK altos. Crítico 12% / dano crítico x1.6.',
    loot: [
      { id:'osso_guardiao_furioso', name:'Osso do Guardião Furioso', icon:'🦴', imgSrc:'Imagens/icones/materiais/osso_guardiao_furioso.png', chance:0.35, weight:0.4, type:'material' },
      { id:'garra_negra_flm', name:'Garra Negra', icon:'🐾', imgSrc:'Imagens/icones/materiais/garra_negra_flm.png', chance:0.25, weight:0.3, type:'material' },
    ],
  },
];

// ── Chefes (8–11) — sorteado UM por evento, dentre estes ──
// Stats de rascunho: mais fortes que os inimigos comuns acima, na
// mesma faixa geral do Urso Pardo/Cobra Verde/Urso Kodiak (mérito 5).
// Chances de drop seguindo a raridade definida por Clau:
// Comum ~55% cada, Raro ~12% cada, Lendário ~2% (Rubrios Yk).
const FLORESTA_MALIGNA_BOSSES = [
  {
    id: 'flm_boss_samurai_mascara', name: 'Samurai da Máscara Partida', icon: '🗡️',
    subtitulo: 'A Guerreira dos Dois Destinos',
    img: 'Imagens/personagens/guerreironn.png',
    elemento: 'sombra',
    hp: 1300, atk: 110, def: 86, gold: 80,
    critChance: 0.20, critMult: 1.7,
    dmgMultBase: 1.5, // Dano DMG 150% — multiplicador do ataque básico dela (ver ENEMY_AI/calcEnemyDmg)
    xp: 220, minLevel: 1, maxLevel: 99, tier: 4,
    isBoss: true,
    desc: 'Chefe 1/4. Crítico 20% / dano crítico x1.7. DMG base 150%.',
    loot: [
      { id:'fragmento_armadura_negra', name:'Fragmento de Armadura Negra', icon:'🖤', imgSrc:'Imagens/icones/materiais/fragmento_armadura_negra.png', chance:0.55, weight:0.3, type:'material' },
      { id:'fita_carmesim', name:'Fita Carmesim', icon:'🎀', imgSrc:'Imagens/icones/materiais/fita_carmesim.png', chance:0.55, weight:0.1, type:'material' },
      { id:'cinzas_juramento', name:'Cinzas de Juramento', icon:'⚱️', imgSrc:'Imagens/icones/materiais/cinzas_juramento.png', chance:0.55, weight:0.1, type:'material' },
      { id:'metade_mascara_partida', name:'Metade da Máscara Partida', icon:'🎭', imgSrc:'Imagens/icones/materiais/metade_mascara_partida.png', chance:0.12, weight:0.2, type:'material', desc:'Relíquia rara — necessária para receitas especiais.' },
      { id:'insignia_guerreira_caida', name:'Insígnia da Guerreira Caída', icon:'🏅', imgSrc:'Imagens/icones/materiais/insignia_guerreira_caida.png', chance:0.12, weight:0.2, type:'material', desc:'Relíquia rara.' },
    ],
  },
  {
    id: 'flm_boss_guardia_yokai', name: 'Guardiã Yokai', icon: '⛩️',
    img: 'Imagens/personagens/escorpios.png',
    elemento: 'sombra',
    hp: 700, atk: 140, def: 100, gold: 80,
    critChance: 0.10, critMult: 1.7,
    dmgMultBase: 1.2, // Dano DMG 120% — multiplicador do ataque básico dela (ver ENEMY_AI/calcEnemyDmg)
    xp: 225, minLevel: 1, maxLevel: 99, tier: 4,
    isBoss: true,
    desc: 'Chefe 2/4. ATK e DEF altos, HP menor que os outros chefes. DMG base 120%.',
    loot: [
      { id:'papel_selo_antigo', name:'Papel de Selo Antigo', icon:'📜', imgSrc:'Imagens/icones/materiais/papel_selo_antigo.png', chance:0.55, weight:0.1, type:'material' },
      { id:'cinzas_santuario', name:'Cinzas do Santuário', icon:'⚱️', imgSrc:'Imagens/icones/materiais/cinzas_santuario.png', chance:0.55, weight:0.1, type:'material' },
      { id:'fragmento_espirito', name:'Fragmento de Espírito', icon:'👻', imgSrc:'Imagens/icones/materiais/fragmento_espirito.png', chance:0.55, weight:0.1, type:'material' },
      { id:'sino_silencio_eterno', name:'Sino do Silêncio Eterno', icon:'🔔', imgSrc:'Imagens/icones/materiais/sino_silencio_eterno.png', chance:0.12, weight:0.2, type:'material', desc:'Relíquia rara.' },
      { id:'mascara_monge_esquecido', name:'Máscara do Monge Esquecido', icon:'🎭', imgSrc:'Imagens/icones/materiais/mascara_monge_esquecido.png', chance:0.12, weight:0.2, type:'material', desc:'Relíquia rara.' },
    ],
  },
  {
    id: 'flm_boss_serpentinos', name: 'Serpentinos', icon: '🐍',
    img: 'Imagens/personagens/serpentinos.png',
    elemento: 'veneno',
    hp: 1800, atk: 150, def: 70, gold: 85,
    critChance: 0.30, critMult: 1.7,
    dmgMultBase: 1.8, // Dano DMG 180%
    poisonChance: 0.5,   // 50% de chance de aplicar/renovar veneno a cada golpe embuído
    poisonAtkPct: 0.7,   // veneno causa 70% do ATQ dele por turno (ver ENEMY_AI/tickPlayerStatusEffects)
    xp: 235, minLevel: 1, maxLevel: 99, tier: 4,
    isBoss: true,
    desc: 'Chefe 3/4. Aplica veneno: 50% de chance por golpe, dano de 70% do ATK por turno.',
    loot: [
      { id:'escama_abissal', name:'Escama Abissal', icon:'🐍', imgSrc:'Imagens/icones/materiais/escama_abissal.png', chance:0.55, weight:0.3, type:'material' },
      { id:'veneno_espiritual', name:'Veneno Espiritual', icon:'☠️', imgSrc:'Imagens/icones/materiais/veneno_espiritual.png', chance:0.55, weight:0.1, type:'material' },
      { id:'fragmento_presa_antiga', name:'Fragmento de Presa Antiga', icon:'🦷', imgSrc:'Imagens/icones/materiais/fragmento_presa_antiga.png', chance:0.55, weight:0.2, type:'material' },
      { id:'olho_serpente_ancestral', name:'Olho da Serpente Ancestral', icon:'👁️', imgSrc:'Imagens/icones/materiais/olho_serpente_ancestral.png', chance:0.12, weight:0.2, type:'material', desc:'Relíquia rara.' },
      { id:'escama_lua_negra', name:'Escama da Lua Negra', icon:'🌑', imgSrc:'Imagens/icones/materiais/escama_lua_negra.png', chance:0.12, weight:0.2, type:'material', desc:'Relíquia rara.' },
    ],
  },
  {
    id: 'flm_boss_rubrios_yk', name: 'Rubrios Yk', icon: '🔥',
    img: 'Imagens/personagens/RubriosYK.png',
    elemento: 'fogo',
    hp: 2000, atk: 150, def: 120, gold: 95,
    critChance: 0.27, critMult: 1.7,
    dmgMultBase: 1.5, // Dano DMG 150%
    xp: 250, minLevel: 1, maxLevel: 99, tier: 4,
    isBoss: true,
    desc: 'Chefe 4/4. Maior HP e DEF do grupo. Drop lendário raro (2%).',
    loot: [
      { id:'fragmento_metal_sombrio', name:'Fragmento de Metal Sombrio', icon:'⚙️', imgSrc:'Imagens/icones/materiais/fragmento_metal_sombrio.png', chance:0.55, weight:0.3, type:'material' },
      { id:'emblema_carrasco', name:'Emblema do Carrasco', icon:'🏵️', imgSrc:'Imagens/icones/materiais/emblema_carrasco.png', chance:0.55, weight:0.1, type:'material' },
      { id:'residuo_energia_carmesim', name:'Resíduo de Energia Carmesim', icon:'🔴', imgSrc:'Imagens/icones/materiais/residuo_energia_carmesim.png', chance:0.55, weight:0.1, type:'material' },
      { id:'anel_executor', name:'Anel do Executor', icon:'💍', imgSrc:'Imagens/icones/materiais/anel_executor.png', chance:0.12, weight:0.1, type:'material', desc:'Relíquia rara.' },
      { id:'medalhao_lua_sangrenta', name:'Medalhão da Lua Sangrenta', icon:'🩸', imgSrc:'Imagens/icones/materiais/medalhao_lua_sangrenta.png', chance:0.12, weight:0.1, type:'material', desc:'Relíquia rara.' },
      // Drop lendário — item passivo: aumenta a chance de drop de itens da
      // floresta. O efeito em si (bônus de drop rate) ainda precisa ser
      // ligado à mão no sistema de loot; por ora só existe como item colecionável.
      { id:'selo_fortuna_floresta', name:'Selo da Fortuna da Floresta', icon:'🍀', imgSrc:'Imagens/icones/materiais/selo_fortuna_floresta.png', chance:0.02, weight:0.1, type:'material', unique:true, desc:'Selo raríssimo — dizem que aumenta a sorte de quem caça na floresta.' },
    ],
  },
];


// ─────────────────────────────────────────────────────────────
//  ESCALONAMENTO DE DIFICULDADE — o inimigo lê os seus status
//  (ATQ, DEF e HP máx) na hora do encontro e se ajusta.
//
//  Fórmulas do jogo (palDinh.js):
//    dano que você causa  = SEU_ATQ  − DEF_inimigo / 2
//    dano que você recebe = ATQ_inimigo − SUA_DEF / 2
//
//  Lógica:
//   • DEF do inimigo  = fração do seu ATQ  (não deixa seu ATQ virar 1 de dano)
//   • HP do inimigo   = quantos "turnos seus" ele deve aguentar
//   • ATQ do inimigo  = dano-alvo por golpe (fração do seu HP máx, aliviado pela sua DEF)
//   • Cada inimigo mantém a identidade dele: o Colosso continua tanque,
//     o Mago continua glass cannon (multiplicadores relativos ao grupo).
//   • O inimigo NUNCA fica mais fraco que o valor base (só sobe).
//   • FORCA < 1 faz o inimigo acompanhar seu poder sem anulá-lo por
//     completo — evoluir ainda compensa.
// ─────────────────────────────────────────────────────────────
const FL_ESCALA = {
  ativo: true,
  forca: 0.70,            // 0 = sem escala (valores base) · 1 = acompanha 100% o seu poder
  turnoMult: 1.3,         // seu dano médio por turno ≈ ATQ × isso (ataques + skills)
  comum: {
    defRatio: 0.30,       // DEF do inimigo ≈ 30% do seu ATQ
    turnosParaMatar: 3,   // ~3 turnos seus pra derrubar um comum médio
    turnosParaMorrer: 11, // um comum médio te derruba em ~11 golpes seguidos
  },
  boss: {
    defRatio: 0.45,
    turnosParaMatar: 7,
    turnosParaMorrer: 8,
  },
  defAlivioMax: 0.30,     // o máximo que a sua DEF pode reduzir o golpe-alvo (30%) — DEF alta ajuda, mas não anula o combate
  recompensa: 0.35,       // XP/ouro sobem junto (0 = não sobe) — proporcional ao fator de poder
  recompensaMax: 2.5,     // teto do multiplicador de XP/ouro
};

// Multiplicadores de identidade: stat do inimigo ÷ média do grupo dele
function _flMedia(arr, k) { return arr.reduce((a, e) => a + (e[k] || 0), 0) / arr.length; }
const _FL_MEDIA_COMUM = { hp: _flMedia(FLORESTA_MALIGNA_COMUNS, 'hp'), atk: _flMedia(FLORESTA_MALIGNA_COMUNS, 'atk'), def: _flMedia(FLORESTA_MALIGNA_COMUNS, 'def') };
const _FL_MEDIA_BOSS  = { hp: _flMedia(FLORESTA_MALIGNA_BOSSES, 'hp'),  atk: _flMedia(FLORESTA_MALIGNA_BOSSES, 'atk'),  def: _flMedia(FLORESTA_MALIGNA_BOSSES, 'def') };

function flMalignaEscalar(base) {
  const e = { ...base };
  if (!FL_ESCALA.ativo || !G || !G.player) return e;

  const pAtk = Math.max(1, G.player.atk   || 1);
  const pDef = Math.max(0, G.player.def   || 0);
  const pHp  = Math.max(1, G.player.maxHp || 1);

  const cfg   = e.isBoss ? FL_ESCALA.boss : FL_ESCALA.comum;
  const media = e.isBoss ? _FL_MEDIA_BOSS : _FL_MEDIA_COMUM;
  const mHp = base.hp / media.hp, mAtk = base.atk / media.atk, mDef = base.def / media.def;

  // 1) DEF alvo
  const defAlvo = pAtk * cfg.defRatio * mDef;

  // 2) HP alvo: aguenta N turnos do seu dano médio já descontando a DEF dele
  const danoTurno = Math.max(1, pAtk * FL_ESCALA.turnoMult - defAlvo / 2);
  const hpAlvo = danoTurno * cfg.turnosParaMatar * mHp;

  // 3) ATQ alvo: dano-alvo por golpe (fração do seu HP máx, aliviada um pouco pela sua DEF)
  //    + a metade da DEF que o jogo subtrai do dano (pra o golpe realmente chegar no alvo)
  const alivio = FL_ESCALA.defAlivioMax * (pDef / (pDef + 150));
  const golpeAlvo = (pHp / cfg.turnosParaMorrer) * mAtk * (1 - alivio);
  const atkAlvo = golpeAlvo + (pDef / 2);

  // 4) Mistura com o valor base (só sobe, nunca desce)
  const mix = (baseV, alvo) => Math.max(baseV, Math.round(baseV + (alvo - baseV) * FL_ESCALA.forca));
  e.hp  = mix(base.hp,  hpAlvo);
  e.atk = mix(base.atk, atkAlvo);
  e.def = mix(base.def, defAlvo);

  // 5) Recompensa acompanha o aumento de poder
  const fator = ((e.hp / base.hp) + (e.atk / base.atk)) / 2;
  const mult = Math.min(FL_ESCALA.recompensaMax, 1 + (fator - 1) * FL_ESCALA.recompensa);
  if (base.xp)   e.xp   = Math.round(base.xp * mult);
  if (base.gold) e.gold = Math.round(base.gold * mult);

  e._flEscalado = true;
  return e;
}
window.flMalignaEscalar = flMalignaEscalar;

// Debug: no console rode  flMalignaDebugEscala()  pra ver como cada inimigo ficaria com os seus status atuais
window.flMalignaDebugEscala = function () {
  const linha = e => { const s = flMalignaEscalar(e); return { nome: e.name, hp: `${e.hp}→${s.hp}`, atk: `${e.atk}→${s.atk}`, def: `${e.def}→${s.def}`, xp: `${e.xp}→${s.xp}` }; };
  console.table(FLORESTA_MALIGNA_COMUNS.map(linha));
  console.table(FLORESTA_MALIGNA_BOSSES.map(linha));
};

// ─────────────────────────────────────────────────────────────
//  Ponto de entrada — chamado de dentro de storyNode_explorar()
//  Retorna true se assumiu o controle do fluxo (o chamador deve
//  parar ali), false se a exploração normal deve continuar.
// ─────────────────────────────────────────────────────────────
function flMalignaTentarDisparo() {
  if (G.location !== 'floresta' || G.inBattle) return false;

  // Já está dentro do modo: toda exploração vira um encontro dele
  if (G._florestaMalignaAtiva) {
    flMalignaExplorar();
    return true;
  }

  // Só tenta disparar de noite (ciclo dia/noite já existente da floresta)
  if (window._florestaPeriodoAtual !== 'noite') return false;

  // Cooldown simples pra não bater no aviso toda hora
  if (G._florestaMalignaCooldown && Date.now() < G._florestaMalignaCooldown) return false;

  if (Math.random() < FL_MALIGNA_CHANCE_DISPARO) {
    flMalignaAbrirAviso();
    return true;
  }
  return false;
}
window.flMalignaTentarDisparo = flMalignaTentarDisparo;

// ── Pop-up de aviso ──
function flMalignaAbrirAviso() {
  const el = document.getElementById('fmaligna-overlay');
  if (!el) { flMalignaAtivar(); return; } // fallback se o HTML ainda não tiver o overlay

  const msg = document.getElementById('fmaligna-msg');
  if (msg) msg.textContent =
    '⚠️ ANOMALIA DETECTADA\n\nInimigos fora do padrão normal à frente. Dificuldade escalada com base nos seus stats. Recompensas maiores. Você luta até o tempo acabar — sem fugir e sem descansar. Só voltará ao Vilarejo se o tempo esgotar ou se você morrer (e morrer custa 50% do seu ouro).';

  el.classList.add('active');

  const btnVoltar = document.getElementById('fmaligna-btn-voltar');
  const btnContinuar = document.getElementById('fmaligna-btn-continuar');

  if (btnVoltar) btnVoltar.onclick = () => {
    el.classList.remove('active');
    G._florestaMalignaCooldown = Date.now() + FL_MALIGNA_COOLDOWN_MS;
    if (typeof storyNode_vilarejo === 'function') storyNode_vilarejo();
  };
  if (btnContinuar) btnContinuar.onclick = () => {
    el.classList.remove('active');
    flMalignaAtivar();
  };
}

// ── Ativa o modo: muda o clima visual, liga o cronômetro e começa os encontros ──
function flMalignaAtivar() {
  G._florestaMalignaAtiva = true;
  G._florestaMalignaExpirada = false;
  G._florestaMalignaEndAt = Date.now() + FL_MALIGNA_DURACAO_MS;
  flMalignaAplicarFundo();

  if (typeof setStory === 'function') {
    setStory('NARRADOR',
      '🔴 MODO FLORESTA MALIGNA ATIVO\n\nVocê tem 4 minutos. Cada exploração gera um combate, e derrotar chefes NÃO encerra o modo. Não dá para fugir nem descansar. O modo só termina quando o tempo acabar ou se você morrer (volta ao Vilarejo e perde 50% do ouro).',
      []
    );
  }

  if (G._florestaMalignaTimerInterval) clearInterval(G._florestaMalignaTimerInterval);
  flMalignaAtualizarTimer();
  G._florestaMalignaTimerInterval = setInterval(flMalignaAtualizarTimer, 1000);

  setTimeout(() => flMalignaExplorar(), 900);
}

// ── Fundo do modo: 1ª metade dos 4 min = flores.png, 2ª metade = tesrn.png ──
// (as classes e as imagens estão no CSS do gat-1.html). Também esconde o relógio
// dia/noite: durante o modo ele fica pausado, então só o cronômetro do modo aparece.
function flMalignaAplicarFundo() {
  const bg = document.getElementById('scene-bg');
  if (!bg) return;
  const ativo = !!G._florestaMalignaAtiva && (G.location === 'floresta' || G.location === 'floresta2');
  if (!ativo) {
    bg.classList.remove('fmaligna-ativa', 'fmaligna-fase-1', 'fmaligna-fase-2');
    return;
  }
  const rest = Math.max(0, (G._florestaMalignaEndAt || 0) - Date.now());
  const fase = rest > FL_MALIGNA_DURACAO_MS / 2 ? 1 : 2;
  bg.classList.add('fmaligna-ativa');
  bg.classList.toggle('fmaligna-fase-1', fase === 1);
  bg.classList.toggle('fmaligna-fase-2', fase === 2);
  const clock = document.getElementById('floresta-clock');
  if (clock) clock.classList.remove('show');
}
window.flMalignaAplicarFundo = flMalignaAplicarFundo;

// setScene() zera as classes do fundo a cada troca de cena (ex.: depois de uma
// batalha) — sem isso o modo perdia o fundo e o relógio dia/noite voltava.
(function () {
  const orig = window.setScene;
  if (typeof orig !== 'function' || orig._flMalignaWrap) return;
  const wrapped = function () {
    const r = orig.apply(this, arguments);
    try { flMalignaAplicarFundo(); } catch (e) {}
    return r;
  };
  wrapped._flMalignaWrap = true;
  window.setScene = wrapped;
})();

// ── Atualiza o widget do cronômetro e encerra o modo sozinho quando o tempo acaba ──
function flMalignaAtualizarTimer() {
  const widget = document.getElementById('fmaligna-timer');
  const ativo = !!G._florestaMalignaAtiva;

  if (widget) widget.classList.toggle('show', ativo);
  if (!ativo) return;

  // Fundo (fase 1 = flores.png, fase 2 = tesrn.png) e relógio único
  flMalignaAplicarFundo();

  const msRestante = Math.max(0, (G._florestaMalignaEndAt || 0) - Date.now());
  if (widget) {
    const totalSeg = Math.ceil(msRestante / 1000);
    const mm = String(Math.floor(totalSeg / 60)).padStart(2, '0');
    const ss = String(totalSeg % 60).padStart(2, '0');
    const fill = widget.querySelector('.fmt-bar-fill');
    const time = widget.querySelector('.fmt-time');
    if (fill) fill.style.width = ((msRestante / FL_MALIGNA_DURACAO_MS) * 100).toFixed(1) + '%';
    if (time) time.textContent = mm + ':' + ss;
  }

  if (msRestante <= 0) {
    G._florestaMalignaExpirada = true;
    // Não interrompe uma batalha em andamento — o próprio flMalignaExplorar()
    // encerra o modo assim que a exploração seguinte for tentada.
    if (!G.inBattle) flMalignaFinalizar('tempo');
  }
}

// ── Sorteia o próximo encontro dentro do modo ──
function flMalignaExplorar() {
  if (typeof hideEnemy === 'function') hideEnemy();

  // Tempo esgotado: encerra o modo em vez de gerar um novo encontro
  if (G._florestaMalignaExpirada || Date.now() >= (G._florestaMalignaEndAt || 0)) {
    flMalignaFinalizar('tempo');
    return;
  }

  if (Math.random() < FL_MALIGNA_CHANCE_BOSS) {
    flMalignaIniciarBoss();
    return;
  }

  const enemy = flMalignaEscalar(FLORESTA_MALIGNA_COMUNS[Math.floor(Math.random() * FLORESTA_MALIGNA_COMUNS.length)]);
  if (typeof showEnemy === 'function') showEnemy(enemy);

  // Vitória sobre comum: cai no fluxo normal do jogo (storyNode_afterBattle, que
  // já sabe que o modo está ativo). Derrota: encerra o modo e vai pro vilarejo.
  G._dungeonBattleCallback = null;
  G._florestaMalignaDefeatCallback = () => flMalignaFinalizar(false);

  // Sem opção de fuga: o modo só acaba por tempo ou morte.
  setStory('NARRADOR',
    `⚔️ INIMIGO: ${enemy.name}\nUma presença hostil surge entre as sombras da floresta.\n\nSem opção de fuga.`,
    [
      { icon:'⚔️', text:`Lutar contra o ${enemy.name}!`, action: () => startBattle(enemy) },
    ]
  );
}

// ── Chefe: sorteia um dos 4, sem opção de fuga ──
function flMalignaIniciarBoss() {
  const boss = flMalignaEscalar(FLORESTA_MALIGNA_BOSSES[Math.floor(Math.random() * FLORESTA_MALIGNA_BOSSES.length)]);

  // Vitória: NÃO encerra o modo — segue lutando até o tempo acabar
  // (hook genérico _dungeonBattleCallback, consumido no endBattle de palDinh.js)
  G._dungeonBattleCallback = () => {
    G._dungeonBattleCallback = null;
    flMalignaPosBoss();
  };
  // Derrota (morte): perde 50% do ouro em vez dos 25% padrão, encerra o modo e vai
  // pro vilarejo (consumido dentro do endBattle, em palDinh.js)
  G._florestaMalignaDefeatCallback = () => flMalignaFinalizar(false);

  if (typeof showEnemy === 'function') showEnemy(boss);
  const _subtitulo = boss.subtitulo ? ` — ${boss.subtitulo}` : '';
  setStory('NARRADOR',
    `🔥 CHEFE: ${boss.name}${_subtitulo}\nUma presença muito mais poderosa toma conta do ar ao seu redor.\n\nSem opção de fuga.`,
    [
      { icon:'⚔️', text:`Enfrentar ${boss.name}!`, action: () => startBattle(boss) },
    ]
  );
}

// ── Chefe derrotado: o modo CONTINUA. Mostra um respiro curto e segue o loop ──
function flMalignaPosBoss() {
  G._florestaMalignaVitorias = (G._florestaMalignaVitorias || 0) + 1;
  if (typeof notify === 'function') notify('✅ Floresta Maligna: chefe derrotado', 'purple');
  if (typeof hideEnemy === 'function') hideEnemy();

  // Se o tempo acabou durante a luta, fecha agora
  if (G._florestaMalignaExpirada || Date.now() >= (G._florestaMalignaEndAt || 0)) {
    flMalignaFinalizar('tempo');
    return;
  }
  setStory('NARRADOR',
    '💀 O chefe tomba, mas a floresta não se acalma.\n\nOutras presenças já se aproximam entre as sombras. Não há descanso aqui — siga lutando até o tempo acabar.',
    [
      { icon:'⚔️', text:'Continuar explorando', action: flMalignaExplorar },
    ]
  );
}
window.flMalignaPosBoss = flMalignaPosBoss;

// ── (sem uso no fluxo atual: fuga foi removida do modo) ──
function flMalignaSairSemPerder() {
  flMalignaFinalizar(null);
}

// ── Encerra o modo: desliga o visual, o cronômetro, limpa flags e volta pro vilarejo ──
// venceu: false (você morreu), 'tempo' (os 4 minutos acabaram). true/null não são mais usados
// pelo fluxo normal (vencer chefe não encerra o modo; não há fuga).
function flMalignaFinalizar(venceu) {
  G._florestaMalignaAtiva = false;
  G._florestaMalignaExpirada = false;
  G._florestaMalignaEndAt = null;
  G._florestaMalignaCooldown = Date.now() + FL_MALIGNA_COOLDOWN_MS;

  if (G._florestaMalignaTimerInterval) {
    clearInterval(G._florestaMalignaTimerInterval);
    G._florestaMalignaTimerInterval = null;
  }
  const widget = document.getElementById('fmaligna-timer');
  if (widget) widget.classList.remove('show');

  const bg = document.getElementById('scene-bg');
  if (bg) bg.classList.remove('fmaligna-ativa', 'fmaligna-fase-1', 'fmaligna-fase-2');
  // religa o ciclo dia/noite (ficou pausado durante o modo)
  window._florestaPeriodoAtual = null;
  if (typeof aplicarFlorestaPorHorario === 'function') aplicarFlorestaPorHorario();
  if (typeof hideEnemy === 'function') hideEnemy();

  if (venceu === true && typeof notify === 'function') {
    G._florestaMalignaVitorias = (G._florestaMalignaVitorias || 0) + 1;
    notify('✅ Floresta Maligna: chefe derrotado', 'purple');
  } else if (venceu === 'tempo' && typeof notify === 'function') {
    notify('⏳ Floresta Maligna: o tempo se esgotou', 'purple');
  }

  setTimeout(() => {
    if (typeof storyNode_vilarejo === 'function') storyNode_vilarejo();
  }, 400);
}
window.flMalignaFinalizar = flMalignaFinalizar;
