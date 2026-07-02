// ═══════════════════════════════════════════════════════════════════
//  CHRONICLES OF CLIVOR — SISTEMA DE TALENTOS v1.0
//  Árvore ramificada com 3 tiers + 2 caminhos nomeados por classe
//  2 Pontos de Talento (PT) por nível · LV máx 20 · 38 PT total
// ═══════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
//  T1. CONSTANTES DE PROGRESSÃO
// ─────────────────────────────────────────────────────────────
const LEVEL_MAX      = 20;
const PT_PER_LEVEL   = 2;        // pontos por nível
const XP_BASE        = 100;
const XP_GROWTH      = 1.45;     // XP necessário = BASE × GROWTH^(lv-1)

// Custo em PT por tier
const TIER_COST = { 1: 1, 2: 2, 3: 3 };

// Pré-requisitos por tier: quantos talentos do tier anterior no mesmo caminho
const TIER_PREREQ = { 2: 3, 3: 2 };   // Tier2 requer 3×T1; Tier3 requer 2×T2

// ─────────────────────────────────────────────────────────────
//  T2. DADOS DAS ÁRVORES — todas as 6 classes
//  Cada caminho: { id, name, lore, color, tiers: [[...],[...],[...]] }
//  Cada talento: { id, name, icon, desc, effect, tier, exclusive? }
//  exclusive: id do talento no outro caminho que bloqueia este
// ─────────────────────────────────────────────────────────────
const TALENT_TREES = {

  // ══════════════════════════════════════════
  guerreiro: {
    paths: [
      {
        id: 'berserker',
        name: 'Berserker',
        lore: 'Abandona a defesa e abraça a fúria. Quanto menor o HP, mais devastador.',
        color: '#c05020',
        icon: '🔥',
        tiers: [
          // Tier 1 — Fundamentos da Fúria
          [
            { id:'g_b_1a', name:'Sede de Sangue',    icon:'🩸', tier:1,
              desc:'Cada abate em batalha te cura 8 HP.',
              effect: p => { p._talent_bloodthirst = true; } },
            { id:'g_b_1b', name:'Pele de Ferro',     icon:'🔩', tier:1,
              desc:'+4 ATQ base.',
              effect: p => { p.atk += 4; } },
            { id:'g_b_1c', name:'Fúria Primitiva',   icon:'😤', tier:1,
              desc:'Ataques físicos ganham +15% dano quando HP < 60%.',
              effect: p => { p._talent_rage_threshold = true; } },
          ],
          // Tier 2 — Frenesi
          [
            { id:'g_b_2a', name:'Golpe Devastador',  icon:'💥', tier:2,
              desc:'Golpe Duplo atinge 3 vezes em vez de 2.',
              effect: p => { p._talent_triple_strike = true; } },
            { id:'g_b_2b', name:'Adrenaline Rush',   icon:'⚡', tier:2,
              desc:'Ao atingir crítico, ganha +20 AP imediatamente.',
              effect: p => { p._talent_adrenaline = true; } },
            { id:'g_b_2c', name:'Resistência Brutal',icon:'🪨', tier:2,
              desc:'+20 HP máx e ignora 2 pontos de DEF inimiga.',
              effect: p => { p.maxHp += 20; p.hp = Math.min(p.maxHp, p.hp + 20); p._talent_armor_pierce = 2; } },
          ],
          // Tier 3 — Maestria (exclusivos)
          [
            { id:'g_b_3a', name:'Frenesi Total',     icon:'🌪️', tier:3,
              exclusive:'g_k_3a',
              desc:'EXCLUSIVO — Abaixo de 30% HP: ATQ dobrado e críticos automáticos por 3 turnos. 1×/batalha.',
              effect: p => { p._talent_frenzy = true; } },
            { id:'g_b_3b', name:'Imortalidade Furiosa',icon:'💀', tier:3,
              exclusive:'g_k_3b',
              desc:'EXCLUSIVO — 1×/batalha: ao chegar a 0 HP, sobrevive com 1 HP e cura 25% MaxHP.',
              effect: p => { p._talent_undying = true; } },
          ],
        ],
      },
      {
        id: 'cavaleiro',
        name: 'Cavaleiro de Ferro',
        lore: 'A muralha viva. Defesa impenetrável que protege e castiga quem ousa atacar.',
        color: '#3a5068',
        icon: '🛡️',
        tiers: [
          // Tier 1
          [
            { id:'g_k_1a', name:'Postura de Guarda', icon:'🛡️', tier:1,
              desc:'+5 DEF base.',
              effect: p => { p.def += 5; } },
            { id:'g_k_1b', name:'Reflexo de Escudo', icon:'↩', tier:1,
              desc:'Chance de contra-ataque ao defender sobe para 28%.',
              effect: p => { p._talent_counter_up = true; } },
            { id:'g_k_1c', name:'Armadura Pesada',   icon:'⛓️', tier:1,
              desc:'Reduz todo dano recebido em 2 pontos fixos.',
              effect: p => { p._talent_dmg_reduce = 2; } },
          ],
          // Tier 2
          [
            { id:'g_k_2a', name:'Escudo Rúnico',     icon:'✨', tier:2,
              desc:'Defender regenera 8 HP além de reduzir dano.',
              effect: p => { p._talent_shield_regen = true; } },
            { id:'g_k_2b', name:'Golpe de Escudo',   icon:'🤜', tier:2,
              desc:'Nova skill: Golpe de Escudo (15 AP) — 1.1× DEF como dano + chance de atordoar.',
              effect: p => { p._talent_shield_bash = true; } },
            { id:'g_k_2c', name:'Fortaleza',         icon:'🏰', tier:2,
              desc:'+30 HP máx. DEF aumenta 1 ponto a cada 3 turnos de batalha.',
              effect: p => { p.maxHp += 30; p.hp = Math.min(p.maxHp, p.hp + 30); p._talent_fortress = true; } },
          ],
          // Tier 3
          [
            { id:'g_k_3a', name:'Muralha Viva',      icon:'🏯', tier:3,
              exclusive:'g_b_3a',
              desc:'EXCLUSIVO — Passivo: cada ponto de DEF acima de 15 converte 50% em ATQ bônus.',
              effect: p => { p._talent_wall = true; } },
            { id:'g_k_3b', name:'Espírito de Aço',   icon:'⚙️', tier:3,
              exclusive:'g_b_3b',
              desc:'EXCLUSIVO — Imune a veneno e sangramento. DEF nunca cai abaixo de 8 em batalha.',
              effect: p => { p._talent_steel_soul = true; } },
          ],
        ],
      },
    ],
  },

  // ══════════════════════════════════════════
  mago: {
    paths: [],
  },

  // ══════════════════════════════════════════
  paladino: {
    paths: [
      {
        id: 'champion',
        name: 'Campeão Sagrado',
        lore: 'A luz da Divina Trindade flui por cada golpe. Cura, protege e ilumina.',
        color: '#c8960a',
        icon: '✨',
        tiers: [
          [
            { id:'p_c_1a', name:'Aura Sagrada',      icon:'🌟', tier:1,
              desc:'Regenera 5 HP ao início de cada turno do jogador.',
              effect: p => { p._talent_holy_aura = true; } },
            { id:'p_c_1b', name:'Golpe Abençoado',   icon:'✝️', tier:1,
              desc:'Golpe Sagrado cura 20 HP em vez de 10.',
              effect: p => { p._talent_holy_heal_up = true; } },
            { id:'p_c_1c', name:'Proteção Divina',   icon:'🛡️', tier:1,
              desc:'Escudo Divino bloqueia 75% do dano (era 60%).',
              effect: p => { p._talent_better_shield = true; } },
          ],
          [
            { id:'p_c_2a', name:'Julgamento',        icon:'⚖️', tier:2,
              desc:'Nova skill: Julgamento (30 AP) — 1.2× ATQ. Inimigo maldito recebe +30% dano por 2 turnos.',
              effect: p => { p._talent_judgment = true; } },
            { id:'p_c_2b', name:'Escudo Sagrado',    icon:'💛', tier:2,
              desc:'Ao defender, 30% chance de refletir 8 dano no inimigo.',
              effect: p => { p._talent_reflect = true; } },
            { id:'p_c_2c', name:'Graça Divina',      icon:'💊', tier:2,
              desc:'+25 HP máx. Poções curam 50% a mais.',
              effect: p => { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); p._talent_grace = true; } },
          ],
          [
            { id:'p_c_3a', name:'Avatar da Luz',     icon:'☀️', tier:3,
              exclusive:'p_s_3a',
              desc:'EXCLUSIVO — Passivo: enquanto HP > 50%, todos os ataques têm +25% dano e curam 5 HP.',
              effect: p => { p._talent_avatar = true; } },
            { id:'p_c_3b', name:'Ressurreição',      icon:'🕊️', tier:3,
              exclusive:'p_s_3b',
              desc:'EXCLUSIVO — Ao ser derrotado, ressuscita automaticamente com 40% HP. 1×/sessão.',
              effect: p => { p._talent_resurrection = true; } },
          ],
        ],
      },
      {
        id: 'shadow_crusader',
        name: 'Cruzado das Sombras',
        lore: 'A escuridão também serve à justiça. Punição inevitável e maldições que consomem.',
        color: '#5030a0',
        icon: '🌑',
        tiers: [
          [
            { id:'p_s_1a', name:'Maldição Sombria',  icon:'💜', tier:1,
              desc:'Golpe Sagrado aplica Maldição: inimigo recebe +15% dano por 2 turnos.',
              effect: p => { p._talent_curse = true; } },
            { id:'p_s_1b', name:'Armadura das Trevas',icon:'⛓️', tier:1,
              desc:'+4 DEF e imune a Sangramento.',
              effect: p => { p.def += 4; p._talent_dark_immune_bleed = true; } },
            { id:'p_s_1c', name:'Punição',           icon:'⚡', tier:1,
              desc:'+3 ATQ. Inimigos que atacam você sofrem 4 de dano de retaliação.',
              effect: p => { p.atk += 3; p._talent_retaliate = 4; } },
          ],
          [
            { id:'p_s_2a', name:'Lâmina das Sombras',icon:'🌑', tier:2,
              desc:'Escudo Divino acumulado não some — recarrega sozinho depois de 3 turnos.',
              effect: p => { p._talent_shield_recharge = true; } },
            { id:'p_s_2b', name:'Drenar Vida',       icon:'🩸', tier:2,
              desc:'20% do dano causado é convertido em HP recuperado.',
              effect: p => { p._talent_lifesteal = 0.20; } },
            { id:'p_s_2c', name:'Ira Sagrada',       icon:'💢', tier:2,
              desc:'+30 HP máx e +5 ATQ ao custo de -3 DEF.',
              effect: p => { p.maxHp += 30; p.hp = Math.min(p.maxHp, p.hp + 30); p.atk += 5; p.def = Math.max(0, p.def - 3); } },
          ],
          [
            { id:'p_s_3a', name:'Paladino das Trevas',icon:'🌚', tier:3,
              exclusive:'p_c_3a',
              desc:'EXCLUSIVO — Transforma Golpe Sagrado: causa 2× ATQ + veneno + sangramento simultâneos.',
              effect: p => { p._talent_dark_paladin = true; } },
            { id:'p_s_3b', name:'Punição Eterna',    icon:'🔗', tier:3,
              exclusive:'p_c_3b',
              desc:'EXCLUSIVO — Passivo: inimigos têm -20% DEF enquanto estiverem com qualquer efeito negativo.',
              effect: p => { p._talent_eternal_punishment = true; } },
          ],
        ],
      },
    ],
  },

  // ══════════════════════════════════════════
  assassino: {
    paths: [
      {
        id: 'phantom',
        name: 'Fantasma',
        lore: 'Invisível até o momento fatal. Golpes que ignoram armadura e deixam os inimigos tremendo.',
        color: '#2a3a50',
        icon: '👻',
        tiers: [
          [
            { id:'a_p_1a', name:'Passo Silencioso',  icon:'👣', tier:1,
              desc:'+8% de chance de esquivar.',
              effect: p => { p._talent_silent_step = 0.08; } },
            { id:'a_p_1b', name:'Lâmina Envenenada', icon:'☠️', tier:1,
              desc:'Ataques normais têm 20% de chance de aplicar Veneno.',
              effect: p => { p._talent_poison_blade = true; } },
            { id:'a_p_1c', name:'Faca nas Costas',   icon:'🔪', tier:1,
              desc:'Primeiro ataque de cada batalha é sempre crítico.',
              effect: p => { p._talent_first_strike = true; } },
          ],
          [
            { id:'a_p_2a', name:'Toque Mortal',      icon:'💀', tier:2,
              desc:'Golpe Sombrio ignora 50% da DEF do inimigo.',
              effect: p => { p._talent_death_touch = true; } },
            { id:'a_p_2b', name:'Fumaça',            icon:'💨', tier:2,
              desc:'Fugir nunca falha. Ao fugir, regenera 20% HP.',
              effect: p => { p._talent_smoke = true; } },
            { id:'a_p_2c', name:'Sombra Duplicada',  icon:'🌫️', tier:2,
              desc:'Dança da Morte atinge 4 vezes em vez de 3.',
              effect: p => { p._talent_shadow_double = true; } },
          ],
          [
            { id:'a_p_3a', name:'Espectro',          icon:'🕸️', tier:3,
              exclusive:'a_v_3a',
              desc:'EXCLUSIVO — Nova skill: Assassinato (50 AP). Se inimigo < 40% HP: causa 300% ATQ. Mata em 1 golpe criaturas fracas.',
              effect: p => { p._talent_assassination = true; } },
            { id:'a_p_3b', name:'Ilusão Perfeita',   icon:'🪞', tier:3,
              exclusive:'a_v_3b',
              desc:'EXCLUSIVO — Passivo: 20% de chance de duplicar qualquer ataque de graça.',
              effect: p => { p._talent_illusion = true; } },
          ],
        ],
      },
      {
        id: 'venomancer',
        name: 'Mestre do Veneno',
        lore: 'O veneno não mata rápido — mata com certeza. Degrada, apodrece e inevitavelmente consome.',
        color: '#406020',
        icon: '☠️',
        tiers: [
          [
            { id:'a_v_1a', name:'Antídoto Perverso', icon:'🧪', tier:1,
              desc:'Imune ao próprio veneno. Veneno causa 12 dano/turno (era 8).',
              effect: p => { p._talent_poison_immune = true; p._talent_poison_up = true; } },
            { id:'a_v_1b', name:'Contaminação',      icon:'🦠', tier:1,
              desc:'Veneno tem 35% de chance de se renovar por mais 2 turnos ao expirar.',
              effect: p => { p._talent_contaminate = true; } },
            { id:'a_v_1c', name:'Agulha Envenenada', icon:'🪡', tier:1,
              desc:'Ataques normais podem aplicar Sangramento (25%) além do efeito normal.',
              effect: p => { p._talent_needle = true; } },
          ],
          [
            { id:'a_v_2a', name:'Nuvem Tóxica',     icon:'☁️', tier:2,
              desc:'Nova skill: Nuvem Tóxica (25 AP) — aplica Veneno + Sangramento + Lentidão simultaneamente.',
              effect: p => { p._talent_toxic_cloud = true; } },
            { id:'a_v_2b', name:'Veneno Neurotóxico',icon:'🧠', tier:2,
              desc:'Inimigo com Veneno perde 15% ATQ e tem 15% menos chance de acertar.',
              effect: p => { p._talent_neuro = true; } },
            { id:'a_v_2c', name:'Alquimia Sombria',  icon:'⚗️', tier:2,
              desc:'Usar item em batalha também aplica Veneno ao inimigo.',
              effect: p => { p._talent_alch = true; } },
          ],
          [
            { id:'a_v_3a', name:'Praga',             icon:'💀', tier:3,
              exclusive:'a_p_3a',
              desc:'EXCLUSIVO — Veneno se torna Praga: 20 dano/turno, se espalha para o turno seguinte sem limite.',
              effect: p => { p._talent_plague = true; } },
            { id:'a_v_3b', name:'Mestre Alquimista', icon:'🧬', tier:3,
              exclusive:'a_p_3b',
              desc:'EXCLUSIVO — Poções causam dano ao inimigo igual à metade do HP curado.',
              effect: p => { p._talent_master_alch = true; } },
          ],
        ],
      },
    ],
  },

  // ══════════════════════════════════════════
  arqueiro: {
    paths: [
      {
        id: 'sniper',
        name: 'Atirador de Elite',
        lore: 'Distância é segurança. Precisão é poder. Cada flecha conta mais que a anterior.',
        color: '#5a7a3a',
        icon: '🎯',
        tiers: [
          [
            { id:'ar_s_1a', name:'Olho Aguçado',     icon:'👁️', tier:1,
              desc:'Flecha Precisa ignora 60% da DEF (era 40%).',
              effect: p => { p._talent_sharp_eye = true; } },
            { id:'ar_s_1b', name:'Tensão Máxima',    icon:'🏹', tier:1,
              desc:'+3 ATQ base. Críticos com arco causam 2.2× (era 1.85×).',
              effect: p => { p.atk += 3; p._talent_max_draw = true; } },
            { id:'ar_s_1c', name:'Flecha Perfurante', icon:'⬆️', tier:1,
              desc:'Ataques normais ignoram 1 ponto de DEF por nível do jogador.',
              effect: p => { p._talent_pierce = true; } },
          ],
          [
            { id:'ar_s_2a', name:'Pontaria Mortal',  icon:'💀', tier:2,
              desc:'Ao acumular 3 ataques seguidos sem errar, o 4º é crítico automático.',
              effect: p => { p._talent_deadly_aim = true; p._aim_streak = 0; } },
            { id:'ar_s_2b', name:'Chuva Mortal',     icon:'🌧️', tier:2,
              desc:'Chuva de Flechas dispara 5 flechas em vez de 4.',
              effect: p => { p._talent_rain_up = true; } },
            { id:'ar_s_2c', name:'Distância Segura',  icon:'🛡️', tier:2,
              desc:'Fugir sempre funciona. Inimigos têm -20% ATQ por 1 turno ao te errar.',
              effect: p => { p._talent_safe_distance = true; } },
          ],
          [
            { id:'ar_s_3a', name:'Tiro Perfeito',    icon:'🌟', tier:3,
              exclusive:'ar_e_3a',
              desc:'EXCLUSIVO — Nova skill: Tiro Perfeito (45 AP). 3× ATQ, ignora toda a DEF. Não pode errar.',
              effect: p => { p._talent_perfect_shot = true; } },
            { id:'ar_s_3b', name:'Fantasma do Arco', icon:'🔮', tier:3,
              exclusive:'ar_e_3b',
              desc:'EXCLUSIVO — Passivo: 25% de chance de disparar uma flecha extra de graça em qualquer ataque.',
              effect: p => { p._talent_ghost_arrow = true; } },
          ],
        ],
      },
      {
        id: 'explorer',
        name: 'Explorador da Floresta',
        lore: 'A floresta é seu lar. Conhece cada erva, cada trilha e cada segredo das sombras.',
        color: '#3a6020',
        icon: '🌿',
        tiers: [
          [
            { id:'ar_e_1a', name:'Herbalismo',       icon:'🌿', tier:1,
              desc:'Ervas coletadas no mundo curam +10 HP extra ao usar.',
              effect: p => { p._talent_herbalism = true; } },
            { id:'ar_e_1b', name:'Armadilha',        icon:'🪤', tier:1,
              desc:'Nova skill: Armadilha (20 AP). Atordoa inimigo por 1 turno.',
              effect: p => { p._talent_trap = true; } },
            { id:'ar_e_1c', name:'Camuflagem',       icon:'🍃', tier:1,
              desc:'+10% de esquiva. Chance de fugir aumenta 20%.',
              effect: p => { p._talent_camo = 0.10; } },
          ],
          [
            { id:'ar_e_2a', name:'Flecha de Erva',   icon:'💚', tier:2,
              desc:'Flecha de Fogo pode alternar para Flecha Curativa: cura 20 HP em vez de dano.',
              effect: p => { p._talent_herb_arrow = true; } },
            { id:'ar_e_2b', name:'Rastreador',       icon:'🐾', tier:2,
              desc:'Sempre encontra loot raro após batalha. Ervas dobradas na exploração.',
              effect: p => { p._talent_tracker = true; } },
            { id:'ar_e_2c', name:'Pele de Couro',    icon:'🦺', tier:2,
              desc:'+20 HP máx e imune a Sangramento.',
              effect: p => { p.maxHp += 20; p.hp = Math.min(p.maxHp, p.hp + 20); p._talent_leather = true; } },
          ],
          [
            { id:'ar_e_3a', name:'Espírito da Floresta',icon:'🌳', tier:3,
              exclusive:'ar_s_3a',
              desc:'EXCLUSIVO — Passivo: recupera 8 HP e 5 AP por turno. Inimigos têm -15% ATQ por você "se fundir" com a floresta.',
              effect: p => { p._talent_forest_spirit = true; } },
            { id:'ar_e_3b', name:'Caçador Lendário', icon:'🏆', tier:3,
              exclusive:'ar_s_3b',
              desc:'EXCLUSIVO — +30% XP e ouro de todos os inimigos. Loot duplo garantido de bosses.',
              effect: p => { p._talent_legendary_hunter = true; } },
          ],
        ],
      },
    ],
  },

  // ══════════════════════════════════════════
  monge: {
    paths: [
      {
        id: 'thunder_fist',
        name: 'Punho do Trovão',
        lore: 'Raios condensados em cada soco. Velocidade e eletricidade destroem qualquer armadura.',
        color: '#e0a030',
        icon: '⚡',
        tiers: [
          [
            { id:'mo_t_1a', name:'Carga Elétrica',   icon:'⚡', tier:1,
              desc:'+4 ATQ e ataques físicos têm 15% de chance de atordoar.',
              effect: p => { p.atk += 4; p._talent_shock = true; } },
            { id:'mo_t_1b', name:'Velocidade do Relâmpago',icon:'💨', tier:1,
              desc:'+5 VEL. Primeiro turno de batalha o monge ataca antes do inimigo.',
              effect: p => { p.spd += 5; p._talent_lightning_speed = true; } },
            { id:'mo_t_1c', name:'Chi Explosivo',    icon:'💥', tier:1,
              desc:'Punho do Trovão tem 35% chance de atordoar (era 25%).',
              effect: p => { p._talent_chi_explosive = true; } },
          ],
          [
            { id:'mo_t_2a', name:'Descarga Total',   icon:'🌩️', tier:2,
              desc:'Soco do Chi causa 1.4× (ATQ + MAG) em vez de 1.2× + 0.8×.',
              effect: p => { p._talent_full_discharge = true; } },
            { id:'mo_t_2b', name:'Corrente de Golpes',icon:'🔁', tier:2,
              desc:'Ao atordoar inimigo, ganha turno extra gratuito.',
              effect: p => { p._talent_stun_chain = true; } },
            { id:'mo_t_2c', name:'Armadura de Chi',  icon:'🔮', tier:2,
              desc:'+4 MAG e +20 HP máx. Chi protege: -2 dano recebido.',
              effect: p => { p.mag += 4; p.maxHp += 20; p.hp = Math.min(p.maxHp, p.hp + 20); p._talent_chi_armor = 2; } },
          ],
          [
            { id:'mo_t_3a', name:'Punho do Dragão',  icon:'🐉', tier:3,
              exclusive:'mo_c_3a',
              desc:'EXCLUSIVO — Nova skill: Punho do Dragão (40 MP). 4× (ATQ+MAG)/2. Se matar: regenera 30% HP e MP.',
              effect: p => { p._talent_dragon_fist = true; } },
            { id:'mo_t_3b', name:'Tempestade Interna',icon:'🌪️', tier:3,
              exclusive:'mo_c_3b',
              desc:'EXCLUSIVO — Passivo: cada turno sem ser atingido aumenta ATQ em 3 (máx +12). Resetar ao levar dano.',
              effect: p => { p._talent_inner_storm = true; p._inner_storm_stacks = 0; } },
          ],
        ],
      },
      {
        id: 'chi_master',
        name: 'Mestre do Chi',
        lore: 'O equilíbrio é o verdadeiro poder. Cura, protege e transcende o corpo físico.',
        color: '#60a0c0',
        icon: '🌊',
        tiers: [
          [
            { id:'mo_c_1a', name:'Cura Interna',     icon:'💙', tier:1,
              desc:'Palma Sagrada cura 30% HP máx (era 20%).',
              effect: p => { p._talent_inner_heal = true; } },
            { id:'mo_c_1b', name:'Meditação',        icon:'🧘', tier:1,
              desc:'Ao descansar fora de batalha, cura 35% HP (era 20%) e 40% MP (era 30%).',
              effect: p => { p._talent_meditation = true; } },
            { id:'mo_c_1c', name:'Fluxo de Chi',     icon:'🌊', tier:1,
              desc:'+4 MAG e recupera 4 MP por turno passivamente.',
              effect: p => { p.mag += 4; p._talent_chi_flow = true; } },
          ],
          [
            { id:'mo_c_2a', name:'Barreira de Chi',  icon:'🔵', tier:2,
              desc:'Nova skill: Barreira (25 MP). Cria escudo que absorve até 30 dano por 2 turnos.',
              effect: p => { p._talent_barrier = true; } },
            { id:'mo_c_2b', name:'Transferência',    icon:'♻️', tier:2,
              desc:'20% do dano causado pela Palma Sagrada é bônus de cura para você.',
              effect: p => { p._talent_transfer = true; } },
            { id:'mo_c_2c', name:'Transcendência',   icon:'✨', tier:2,
              desc:'+10 MAG e imune a atordoamento.',
              effect: p => { p.mag += 10; p._talent_transcend = true; } },
          ],
          [
            { id:'mo_c_3a', name:'Espírito Imortal', icon:'☯️', tier:3,
              exclusive:'mo_t_3a',
              desc:'EXCLUSIVO — Passivo: ao entrar em batalha, escudo de Chi automático absorve 40 dano. Recarrega entre batalhas.',
              effect: p => { p._talent_immortal_spirit = true; } },
            { id:'mo_c_3b', name:'Êxtase de Chi',    icon:'🕊️', tier:3,
              exclusive:'mo_t_3b',
              desc:'EXCLUSIVO — Palma Sagrada afeta você E cura 15 HP do máximo possível por turno em combate.',
              effect: p => { p._talent_chi_ecstasy = true; } },
          ],
        ],
      },
    ],
  },

};

// ─────────────────────────────────────────────────────────────
//  T3. MOTOR DE TALENTOS
// ─────────────────────────────────────────────────────────────

// Retorna a árvore da classe atual
function getTalentTree() {
  const cls = G.player.class;
  return TALENT_TREES[cls] || null;
}

// Retorna talentos já comprados pelo jogador
function getPlayerTalents() {
  return G.player.talents || [];
}

// Pontos de talento disponíveis
function getAvailablePT() {
  const spent = (G.player.talents || []).reduce((acc, id) => {
    const t = findTalentById(id);
    return acc + (t ? (TIER_COST[t.tier] || 1) : 0);
  }, 0);
  const total = (G.player.level - 1) * PT_PER_LEVEL;
  return Math.max(0, total - spent);
}

// Busca talento por ID em todas as árvores
function findTalentById(id) {
  for (const cls of Object.values(TALENT_TREES)) {
    for (const path of cls.paths) {
      for (const tier of path.tiers) {
        for (const t of tier) {
          if (t.id === id) return t;
        }
      }
    }
  }
  return null;
}

// Busca talento por ID dentro da árvore de uma classe específica
function findTalentInTree(tree, id) {
  for (const path of tree.paths) {
    for (const tier of path.tiers) {
      for (const t of tier) {
        if (t.id === id) return { talent: t, path };
      }
    }
  }
  return null;
}

// Verifica se pode comprar um talento
function canBuyTalent(talentId) {
  const tree = getTalentTree();
  if (!tree) return { ok: false, reason: 'Sem árvore de talentos.' };

  const found = findTalentInTree(tree, talentId);
  if (!found) return { ok: false, reason: 'Talento não encontrado.' };

  const { talent, path } = found;
  const owned = getPlayerTalents();

  // Já comprou?
  if (owned.includes(talentId)) return { ok: false, reason: 'Já adquirido.' };

  // PT disponíveis
  const cost = TIER_COST[talent.tier] || 1;
  if (getAvailablePT() < cost) return { ok: false, reason: `Pontos insuficientes (custo: ${cost} PT).` };

  // Pré-requisito de tier
  if (talent.tier >= 2) {
    const prevTier = talent.tier - 1;
    const prevReq  = TIER_PREREQ[talent.tier];
    const tierTalents = path.tiers[prevTier - 1] || [];
    const ownedInPrevTier = tierTalents.filter(t => owned.includes(t.id)).length;
    if (ownedInPrevTier < prevReq) {
      return { ok: false, reason: `Requer ${prevReq} talentos do Tier ${prevTier} neste caminho (tem ${ownedInPrevTier}).` };
    }
  }

  // Exclusividade — se tem o outro, bloqueia
  if (talent.exclusive && owned.includes(talent.exclusive)) {
    const blocker = findTalentById(talent.exclusive);
    return { ok: false, reason: `Bloqueado por "${blocker ? blocker.name : talent.exclusive}" (exclusivo).` };
  }

  // Nível mínimo por tier
  const minLevel = { 1: 1, 2: 7, 3: 14 };
  if (G.player.level < (minLevel[talent.tier] || 1)) {
    return { ok: false, reason: `Requer Nível ${minLevel[talent.tier]} (Tier ${talent.tier}).` };
  }

  return { ok: true, cost };
}

// Compra e aplica um talento
function buyTalent(talentId) {
  const check = canBuyTalent(talentId);
  if (!check.ok) { notify(`⚠ ${check.reason}`, 'red'); return false; }

  const talent = findTalentById(talentId);
  if (!talent) return false;

  if (!G.player.talents) G.player.talents = [];
  G.player.talents.push(talentId);

  // Aplicar efeito imediatamente
  if (typeof talent.effect === 'function') talent.effect(G.player);

  updateHUD();
  buildInventoryGrid();
  notify(`✦ "${talent.name}" desbloqueado!`, 'gold');
  addLog(`Talento: ${talent.icon} ${talent.name} adquirido.`, 'xp');
  return true;
}

// Reaplica todos os talentos (usado ao carregar save)
function reapplyAllTalents() {
  const owned = G.player.talents || [];
  // Limpa flags de talento primeiro (não stats base — esses ficam no save)
  owned.forEach(id => {
    const t = findTalentById(id);
    if (t && typeof t.effect === 'function') {
      // Só reaplicar flags booleanas e não-acumulativas
      // Stats numéricos (atk, def, etc.) já estão salvos no player
      const flagOnly = ['_talent_bloodthirst','_talent_rage_threshold','_talent_triple_strike',
        '_talent_adrenaline','_talent_counter_up','_talent_shield_regen','_talent_shield_bash',
        '_talent_fortress','_talent_wall','_talent_steel_soul','_talent_frenzy','_talent_undying',
        '_talent_fire_discount','_talent_combustion','_talent_burn_up','_talent_free_spell',
        '_talent_thunder_amp','_talent_meteor','_talent_battle_mage','_talent_void_slow',
        '_talent_drain','_talent_void_dodge','_talent_freeze','_talent_echo','_talent_mp_regen',
        '_talent_singularity','_talent_phylactery','_talent_holy_aura','_talent_holy_heal_up',
        '_talent_better_shield','_talent_judgment','_talent_reflect','_talent_grace',
        '_talent_avatar','_talent_resurrection','_talent_curse','_talent_dark_immune_bleed',
        '_talent_retaliate','_talent_shield_recharge','_talent_lifesteal','_talent_dark_paladin',
        '_talent_eternal_punishment','_talent_silent_step','_talent_poison_blade','_talent_first_strike',
        '_talent_death_touch','_talent_smoke','_talent_shadow_double','_talent_assassination',
        '_talent_illusion','_talent_poison_immune','_talent_poison_up','_talent_contaminate',
        '_talent_needle','_talent_toxic_cloud','_talent_neuro','_talent_alch','_talent_plague',
        '_talent_master_alch','_talent_sharp_eye','_talent_max_draw','_talent_pierce',
        '_talent_deadly_aim','_talent_rain_up','_talent_safe_distance','_talent_perfect_shot',
        '_talent_ghost_arrow','_talent_herbalism','_talent_trap','_talent_camo',
        '_talent_herb_arrow','_talent_tracker','_talent_leather','_talent_forest_spirit',
        '_talent_legendary_hunter','_talent_shock','_talent_lightning_speed','_talent_chi_explosive',
        '_talent_full_discharge','_talent_stun_chain','_talent_chi_armor','_talent_dragon_fist',
        '_talent_inner_storm','_talent_inner_heal','_talent_meditation','_talent_chi_flow',
        '_talent_barrier','_talent_transfer','_talent_transcend','_talent_immortal_spirit',
        '_talent_chi_ecstasy'];
      flagOnly.forEach(flag => {
        if (G.player[flag] !== undefined) {
          // já existe no save, não reaplica
        }
      });
    }
  });
}

// ─────────────────────────────────────────────────────────────
//  T4. INTEGRAÇÃO COM BATALHA — Hooks de talento
// ─────────────────────────────────────────────────────────────

// Chamado após jogador atacar — retorna dano modificado
function applyTalentOnAttack(baseDmg, isCrit, bs) {
  const p = G.player;
  let dmg = baseDmg;

  // Berserker: fúria primitiva (HP < 60%)
  if (p._talent_rage_threshold && p.hp < p.maxHp * 0.6) dmg = Math.floor(dmg * 1.15);

  // Berserker: Muralha Viva (DEF → ATQ bonus)
  if (p._talent_wall && p.def > 15) dmg += Math.floor((p.def - 15) * 0.5);

  // Mago de Combate
  if (p._talent_battle_mage) dmg += Math.floor(p.mag * 0.6);

  // Atirador Fantasma: 25% de flecha extra
  if (p._talent_ghost_arrow && Math.random() < 0.25) {
    const bonus = Math.max(1, Math.floor(p.atk * 0.5));
    dmg += bonus;
    appendBattleLog('🔮 Flecha Fantasma! +' + bonus + ' de bônus!', '#c0a0ff');
  }

  // Primeiro ataque crítico garantido (Faca nas Costas)
  if (p._talent_first_strike && bs.turnCount <= 1 && !bs._first_strike_used) {
    bs._first_strike_used = true;
    dmg = Math.floor(dmg * 1.85);
    appendBattleLog('🔪 Faca nas Costas! Primeiro golpe CRÍTICO automático!', '#ffcc00');
  }

  // Adrenaline Rush: crítico → +20 AP
  if (p._talent_adrenaline && isCrit) {
    p.ap = Math.min(p.maxAp, (p.ap || 0) + 20);
    appendBattleLog('⚡ Adrenalina! +20 AP por crítico!', '#e0c030');
  }

  // Sede de Sangue: abate cura 8 HP (verificado em endBattle)

  // Inner Storm (Monge): acumula ATQ por turno sem dano
  if (p._talent_inner_storm) {
    if (!bs._inner_storm_stacks) bs._inner_storm_stacks = 0;
    // Stacks só crescem quando não leva dano — verificado no turno inimigo
    dmg += bs._inner_storm_stacks * 3;
    if (bs._inner_storm_stacks > 0) appendBattleLog(`🌪️ Tempestade Interna: +${bs._inner_storm_stacks * 3} ATQ!`, '#e0c030');
  }

  // Combo 3-hit → 4º crítico automático (Arqueiro)
  if (p._talent_deadly_aim) {
    if (!bs._aim_streak) bs._aim_streak = 0;
    bs._aim_streak++;
    if (bs._aim_streak >= 4) {
      dmg = Math.floor(dmg * 1.85);
      bs._aim_streak = 0;
      appendBattleLog('🎯 Pontaria Mortal! Crítico automático!', '#ffcc00');
    }
  }

  // Veneno na lâmina (Assassino, 20% chance)
  if (p._talent_poison_blade && Math.random() < 0.20 && !bs.enemyPoisoned) {
    bs.enemyPoisoned = true;
    bs.enemyPoisonTurns = 3;
    appendBattleLog('☠️ Lâmina Envenenada! Veneno aplicado!', '#60c060');
  }

  // Agulha envenenada: sangramento 25%
  if (p._talent_needle && Math.random() < 0.25 && !bs.enemyPoisoned) {
    bs.playerBleeding = false; // sangramento no inimigo
    bs.enemyPoisoned = true;
    bs.enemyPoisonTurns = 2;
  }

  // Choque elétrico (Monge, 15% chance de atordoar)
  if (p._talent_shock && Math.random() < 0.15 && !bs.enemyStunned) {
    bs.enemyStunned = true;
    bs.enemyStunTurns = 1;
    appendBattleLog('⚡ Choque Elétrico! Inimigo atordoado!', '#ffee40');
  }

  // Lifesteal (Paladino das Sombras, 20%)
  if (p._talent_lifesteal) {
    const healed = Math.floor(dmg * p._talent_lifesteal);
    if (healed > 0) {
      p.hp = Math.min(p.maxHp, p.hp + healed);
      appendBattleLog(`🩸 Dreno de Vida: +${healed} HP!`, '#c04040');
    }
  }

  // Ilusão Perfeita: 20% de duplicar qualquer ataque
  if (p._talent_illusion && Math.random() < 0.20) {
    const bonus = Math.max(1, Math.floor(dmg * 0.8));
    dmg += bonus;
    appendBattleLog(`🪞 Ilusão Duplicada! +${bonus} dano extra!`, '#c0a0ff');
  }

  return Math.max(1, dmg);
}

// Chamado quando jogador leva dano — retorna dano após modificadores
function applyTalentOnReceiveDamage(rawDmg, bs) {
  const p = G.player;
  let dmg = rawDmg;

  // Redução fixa de dano (Armadura Pesada)
  if (p._talent_dmg_reduce) dmg = Math.max(1, dmg - p._talent_dmg_reduce);

  // Chi como armadura (Monge)
  if (p._talent_chi_armor) dmg = Math.max(1, dmg - p._talent_chi_armor);

  // Barreira de Chi (absorção)
  if (bs._chi_barrier && bs._chi_barrier > 0) {
    const absorbed = Math.min(bs._chi_barrier, dmg);
    bs._chi_barrier -= absorbed;
    dmg -= absorbed;
    if (absorbed > 0) appendBattleLog(`🔵 Barreira absorve ${absorbed} dano! (${bs._chi_barrier} restante)`, '#4090c0');
  }

  // Avatar da Luz: punição por atacar enquanto HP > 50% — não, Avatar é bônus de ATQ/heal, não reduz dano
  // Retaliação do Paladino
  if (p._talent_retaliate && p._talent_retaliate > 0) {
    bs.enemyHp -= p._talent_retaliate;
    appendBattleLog(`⚡ Retaliação! -${p._talent_retaliate} HP ao inimigo!`, '#e0c030');
  }

  // Inner Storm: ao levar dano, reseta stacks
  if (p._talent_inner_storm && bs._inner_storm_stacks > 0) {
    bs._inner_storm_stacks = 0;
  }

  // Espírito Imortal (Monge): escudo inicial da batalha
  // já inicializado em startBattle

  return Math.max(0, dmg);
}

// Chamado no início de cada turno do JOGADOR
function applyTalentTurnStart(bs) {
  const p = G.player;

  // Aura Sagrada: +5 HP
  if (p._talent_holy_aura) {
    p.hp = Math.min(p.maxHp, p.hp + 5);
    appendBattleLog('🌟 Aura Sagrada: +5 HP!', '#c8960a');
    showFloatingNumber('hero', 5, 'heal');
  }

  // Chi Flow: +4 MP por turno
  if (p._talent_chi_flow) {
    p.mp = Math.min(p.maxMp, p.mp + 4);
  }

  // Regeneração Mística: +5 MP por turno se não usar skill
  if (p._talent_mp_regen) {
    p.mp = Math.min(p.maxMp, p.mp + 5);
  }

  // Inner Storm: acumula stacks se não levou dano no turno anterior
  if (p._talent_inner_storm) {
    if (!bs._inner_storm_stacks) bs._inner_storm_stacks = 0;
    if (!bs._inner_storm_damaged_last_turn) {
      bs._inner_storm_stacks = Math.min(4, bs._inner_storm_stacks + 1);
    }
    bs._inner_storm_damaged_last_turn = false;
  }

  // Escudo Sagrado recarrega após 3 turnos
  if (p._talent_shield_recharge) {
    if (!bs._shield_recharge_counter) bs._shield_recharge_counter = 0;
    if (!bs._shieldActive) {
      bs._shield_recharge_counter++;
      if (bs._shield_recharge_counter >= 3) {
        bs._shieldActive = true;
        bs._shield_recharge_counter = 0;
        appendBattleLog('✨ Escudo Sagrado recarregado automaticamente!', '#c0c0ff');
      }
    }
  }

  // Fortaleza: +1 DEF a cada 3 turnos
  if (p._talent_fortress) {
    if (!bs._fortress_counter) bs._fortress_counter = 0;
    bs._fortress_counter++;
    if (bs._fortress_counter % 3 === 0) {
      p.def++;
      appendBattleLog('🏰 Fortaleza: +1 DEF permanente!', '#6080c0');
    }
  }

  // Flecha de Fogo → Flecha Curativa alterna (apenas atualiza a skill UI)
  // Frenesi Total: ativa abaixo de 30% HP
  if (p._talent_frenzy && !bs._frenzy_active && p.hp < p.maxHp * 0.3 && !bs._frenzy_used) {
    bs._frenzy_active = true;
    bs._frenzy_turns = 3;
    bs._frenzy_used = true;
    appendBattleLog('🌪️ FRENESI TOTAL! ATQ dobrado e críticos automáticos por 3 turnos!', '#ff4020');
    notify('🌪️ FRENESI TOTAL ATIVADO!', 'red');
  }
  if (bs._frenzy_active) {
    if (bs._frenzy_turns > 0) bs._frenzy_turns--;
    else { bs._frenzy_active = false; appendBattleLog('Frenesi terminou.', '#888'); }
  }

  // Espírito da Floresta: regen passiva
  if (p._talent_forest_spirit) {
    p.hp = Math.min(p.maxHp, p.hp + 8);
    p.ap = Math.min(p.maxAp, (p.ap || 0) + 5);
  }

  // Chi Ecstasy: regen de HP em combate
  if (p._talent_chi_ecstasy) {
    const regen = Math.floor(p.maxHp * 0.04);
    p.hp = Math.min(p.maxHp, p.hp + regen);
    if (regen > 0) appendBattleLog(`🕊️ Chi Êxtase: +${regen} HP!`, '#60d0d0');
  }

  // Escudo Defesa com regen (Cavaleiro)
  if (p._talent_shield_regen && bs.defending) {
    p.hp = Math.min(p.maxHp, p.hp + 8);
    appendBattleLog('🛡️ Escudo Rúnico: +8 HP!', '#6080c0');
    showFloatingNumber('hero', 8, 'heal');
  }

  // Magia acelerada: conta uso de skills
  if (p._talent_free_spell && p._free_spell_count === undefined) p._free_spell_count = 0;

  updateHUD();
}

// Chamado ao defender
function applyTalentOnDefend(bs) {
  const p = G.player;

  // Reflexo de Escudo: aumenta chance de contra-ataque
  // (verificado em runEnemyTurn via _talent_counter_up)

  // Reflejo do Escudo Sagrado: 30% chance de refletir 8 dano
  if (p._talent_reflect && Math.random() < 0.30) {
    bs.enemyHp -= 8;
    appendBattleLog('💛 Reflexo do Escudo! -8 HP ao inimigo!', '#c0c060');
    showFloatingNumber('enemy', 8, 'dmg');
  }
}

// Chamado ao fim da batalha (vitória)
function applyTalentOnVictory(enemy, bs) {
  const p = G.player;

  // Sede de Sangue: cura 8 HP
  if (p._talent_bloodthirst) {
    p.hp = Math.min(p.maxHp, p.hp + 8);
    notify('🩸 Sede de Sangue: +8 HP!', 'green');
  }

  // Caçador Lendário: +30% XP e ouro
  if (p._talent_legendary_hunter) {
    const bonusXP  = Math.floor(enemy.xp * 0.30);
    const bonusGold = Math.floor(enemy.gold * 0.30);
    G.player.xp   += bonusXP;
    G.player.gold += bonusGold;
    notify(`🏆 Caçador Lendário: +${bonusXP} XP +${bonusGold}◈`, 'gold');
  }

  // Rastreador: loot extra garantido
  if (p._talent_tracker && enemy.loot && enemy.loot.length > 0) {
    const extraLoot = enemy.loot[Math.floor(Math.random() * enemy.loot.length)];
    addItem({ id: extraLoot.id, name: extraLoot.name, icon: extraLoot.icon,
      weight: extraLoot.weight || 0.5, qty: 1, desc: extraLoot.desc || '', type: extraLoot.type || 'material' });
    notify(`🐾 Rastreador: ${extraLoot.icon} ${extraLoot.name} extra!`, 'gold');
  }

  // Punho do Dragão: cura ao matar
  // (verificado na skill diretamente)

  // Lich Menor: reseta flag de ressurreição
  bs._phylactery_used = false;
}

// ─────────────────────────────────────────────────────────────
//  T5. UI DA ÁRVORE DE TALENTOS
// ─────────────────────────────────────────────────────────────

// ── BUG-07 FIX: retorna o custo real de uma skill após talentos de redução ──
function getSkillCost(sk, p) {
  const isWarriorCls = p.classData && ['paladino','assassino','arqueiro'].includes(p.classData.id);
  let cost = isWarriorCls ? (sk.ap || 0) : (sk.mp || 0);

  // Redução de custo por talento (ex: _talent_fire_discount para Mago)
  if (sk.id === 'bola_fogo' && p._talent_fire_discount) {
    cost = Math.max(0, cost - p._talent_fire_discount);
  }

  // Redução genérica de AP/MP por talento (se implementado)
  if (p._talSkillCostReduce && p._talSkillCostReduce > 0) {
    cost = Math.max(0, Math.floor(cost * (1 - p._talSkillCostReduce)));
  }

  return cost;
}

function openTalentTree(secao) {
  const tree = getTalentTree();
  if (!tree) { notify('Sem árvore disponível para esta classe.', 'red'); return; }

  // Exibe overlay
  const overlay = document.getElementById('talent-overlay');
  overlay.style.display = 'flex';

  // Renderiza aba Perfil: stats + equipamentos
  if (typeof buildPerfilPane === 'function') buildPerfilPane();
  // Renderiza árvore de talentos
  buildTalentTreeUI(tree);

  // Ativa a aba correta
  const aba = (secao === 'talentos') ? 'talentos' : 'perfil';
  switchOverlayTab(aba);
}

function switchOverlayTab(aba) {
  document.querySelectorAll('.ov-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.aba === aba));
  document.querySelectorAll('.ov-tab-pane').forEach(p => p.classList.toggle('active', p.dataset.aba === aba));
}

function closeTalentTree() {
  document.getElementById('talent-overlay').style.display = 'none';
}

function ttStatChip(icon, label, value, color) {
  return `<div style="display:flex;align-items:center;gap:5px;padding:4px 10px;border:1px solid rgba(200,150,10,0.13);background:rgba(0,0,0,0.15);">
    <span style="font-size:0.85rem;">${icon}</span>
    <span style="font-family:'Noto Sans JP',sans-serif;font-size:0.58rem;color:rgba(200,150,10,0.45);">${label}</span>
    <span style="font-family:'Noto Serif JP',serif;font-size:0.78rem;color:${color};font-weight:700;">${value}</span>
  </div>`;
}


// ══════════════════════════════════════════════════════════════
//  LIVRO DE REAÇÕES ELEMENTAIS (Mago)
// ══════════════════════════════════════════════════════════════
const MAGO_ELEMENTOS = [
  { key: 'fogo',        icon: '🔥',  img: 'Imagens/personagens/mago/ícones Hab/fogo.png',        nome: 'Fogo',        cor: '#ff6020', desc: 'Dano alto 2.4× MAG. Chance de Queimadura por 3 turnos.',                          mp: 20 },
  { key: 'agua',        icon: '💧',  img: 'Imagens/personagens/mago/ícones Hab/agua.png',        nome: 'Água',        cor: '#40a0ff', desc: 'Dano médio 1.8× MAG. Chance de Lentidão por 3 turnos.',                          mp: 15 },
  { key: 'eletrico',    icon: '⚡',  img: 'Imagens/personagens/mago/ícones Hab/eletrico.png',    nome: 'Elétrico',    cor: '#ffee40', desc: 'Dano 1.4× MAG. Chance de Paralisia (pula turno inimigo).',                       mp: 25 },
  { key: 'gelo',        icon: '❄️',  img: 'Imagens/personagens/mago/ícones Hab/Egelo.png',        nome: 'Gelo',        cor: '#a0e8ff', desc: 'Dano 1.6× MAG. Chance de Congelar inimigo por 2 turnos.',                        mp: 22 },
  { key: 'planta',      icon: '🌿',  img: 'Imagens/personagens/mago/ícones Hab/EPlanta.png',      nome: 'Planta',      cor: '#60d060', desc: 'Dano 1.2× MAG. Aplica Enraizamento: inimigo não pode fugir por 3 turnos.',       mp: 18 },
  { key: 'terra',       icon: '🪨',  img: 'Imagens/personagens/mago/ícones Hab/ETerra.png',       nome: 'Terra',       cor: '#c08040', desc: 'Dano 1.5× MAG. Reduz DEF do inimigo em 3 por 2 turnos.',                         mp: 20 },
  { key: 'energia',     icon: '✨',  img: 'Imagens/personagens/mago/ícones Hab/EENERGIA.png',     nome: 'Energia',     cor: '#e0a0ff', desc: 'Dano 1.3× MAG. Ignora 50% da DEF mágica do inimigo.',                            mp: 28 },
  { key: 'magia_negra', icon: '🌑',  img: 'Imagens/personagens/mago/ícones Hab/EmagiaN.png', nome: 'Magia Negra', cor: '#9040c0', desc: 'Dano 2.0× MAG. Drena HP do inimigo e cura o Mago. Aplica Maldição.',             mp: 30 },
  { key: 'vento',       icon: '🌪️', img: 'Imagens/personagens/mago/ícones Hab/Evento.png',       nome: 'Vento',       cor: '#80d0ff', desc: 'Dano 1.3× MAG. Aumenta sua esquiva. Chance do inimigo errar próximo ataque.',    mp: 16 },
  { key: 'caos',        icon: '🌀',  img: 'Imagens/personagens/mago/ícones Hab/Ecaos.png',        nome: 'Caos',        cor: '#c060ff', desc: 'Dano 1.0–4.0× MAG aleatório. Efeito imprevisível a cada uso.',                  mp: 35 },
  { key: 'veneno',      icon: '☠️',  img: 'Imagens/personagens/mago/ícones Hab/Veneno.png',      nome: 'Veneno',      cor: '#60c060', desc: 'Dano 1.1× MAG. Aplica Veneno Profundo: 5 turnos de dano corrosivo.',             mp: 18 },
  { key: 'luz',         icon: '☀️',  img: 'Imagens/personagens/mago/ícones Hab/ELuz.png',         nome: 'Luz',         cor: '#ffe060', desc: 'Dano 1.6× MAG sagrado. Cura 10% do HP máx do Mago. Cega o inimigo por 2 turnos.', mp: 24 },
];

const MAGO_REACOES = [
  // ══ FOGO (4 fusões) ══
  { key: 'vapor',          levelRequired:1,          icon: '🌫️', img: 'Imagens/personagens/mago/ícones Hab/vapor.png',          nome: 'Vapor',            cor: '#c0e0ff', a: 'fogo',       b: 'agua',       aIcon: '🔥', bIcon: '💧',  aImg: 'Imagens/personagens/mago/ícones Hab/fogo.png',        bImg: 'Imagens/personagens/mago/ícones Hab/agua.png',        mult: '2.0×', desc: 'Choque térmico cria vapor escaldante. Remove Lentidão do inimigo e causa dano moderado.' },
  { key: 'sobrecarga',     levelRequired:1,     icon: '🌩️', img: 'Imagens/personagens/mago/ícones Hab/sobrecarga.png',     nome: 'Sobrecarga',       cor: '#ffcc00', a: 'fogo',       b: 'eletrico',   aIcon: '🔥', bIcon: '⚡',  aImg: 'Imagens/personagens/mago/ícones Hab/fogo.png',        bImg: 'Imagens/personagens/mago/ícones Hab/eletrico.png',    mult: '2.8×', desc: 'Calor amplifica a descarga elétrica numa explosão devastadora. 50% chance de Queimadura.' },
  { key: 'cinzas_gelo',   levelRequired:5,   icon: '🔵', img: 'Imagens/personagens/mago/ícones Hab/cinzas_gelo.png',   nome: 'Cinzas de Gelo',   cor: '#90c0e0', a: 'fogo',       b: 'gelo',       aIcon: '🔥', bIcon: '❄️', aImg: 'Imagens/personagens/mago/ícones Hab/fogo.png',        bImg: 'Imagens/personagens/mago/ícones Hab/Egelo.png',        mult: '3.0×', desc: 'Choque de fogo e gelo gera explosão de energia pura. Dano altíssimo, remove buffs do inimigo.' },
  { key: 'florestafogo',   levelRequired:7,   icon: '🔥', img: 'Imagens/personagens/mago/ícones Hab/florestafogo.png',   nome: 'Floresta em Chamas', cor: '#e06020', a: 'fogo',      b: 'planta',     aIcon: '🔥', bIcon: '🌿', aImg: 'Imagens/personagens/mago/ícones Hab/fogo.png',        bImg: 'Imagens/personagens/mago/ícones Hab/EPlanta.png',      mult: '2.4×', desc: 'Vegetação pega fogo numa explosão verde-flamejante. Queimadura por 5 turnos e dano contínuo.' },

  // ══ ÁGUA (4 fusões) ══
  { key: 'tempestade',     levelRequired:1,     icon: '⛈️', img: 'Imagens/personagens/mago/ícones Hab/tempestade.png',     nome: 'Tempestade',       cor: '#80d0ff', a: 'agua',       b: 'eletrico',   aIcon: '💧', bIcon: '⚡',  aImg: 'Imagens/personagens/mago/ícones Hab/agua.png',        bImg: 'Imagens/personagens/mago/ícones Hab/eletrico.png',    mult: '2.2×', desc: 'Água conduz o raio criando tempestade relampejante. Paralisia garantida e Lentidão por 2 turnos.' },
  { key: 'glacial',        levelRequired:5,        icon: '🧊', img: 'Imagens/personagens/mago/ícones Hab/glacial.png',        nome: 'Explosão Glacial', cor: '#60c8ff', a: 'agua',       b: 'gelo',       aIcon: '💧', bIcon: '❄️', aImg: 'Imagens/personagens/mago/ícones Hab/agua.png',        bImg: 'Imagens/personagens/mago/ícones Hab/Egelo.png',        mult: '2.3×', desc: 'Água amplifica o frio extremo. Congela o inimigo com garantia e causa dano de área glacial.' },
  { key: 'lama',           levelRequired:10,           icon: '🟤', img: 'Imagens/personagens/mago/ícones Hab/lama.png',           nome: 'Lama Tóxica',      cor: '#a06030', a: 'agua',       b: 'terra',      aIcon: '💧', bIcon: '🪨', aImg: 'Imagens/personagens/mago/ícones Hab/agua.png',        bImg: 'Imagens/personagens/mago/ícones Hab/ETerra.png',       mult: '1.9×', desc: 'Terra e água criam lama corrosiva. Lentidão extrema por 4 turnos e DEF reduzida.' },
  { key: 'esporos',        levelRequired:7,        icon: '🍄', img: 'Imagens/personagens/mago/ícones Hab/esporos.png',        nome: 'Nuvem de Esporos', cor: '#80e080', a: 'agua',       b: 'planta',     aIcon: '💧', bIcon: '🌿', aImg: 'Imagens/personagens/mago/ícones Hab/agua.png',        bImg: 'Imagens/personagens/mago/ícones Hab/EPlanta.png',      mult: '1.8×', desc: 'Água ativa esporos criando nuvem venenosa. Aplica Veneno por 4 turnos.' },

  // ══ ELÉTRICO (4 fusões) ══
  { key: 'nevasca',        levelRequired:5,        icon: '🌨️', img: 'Imagens/personagens/mago/ícones Hab/nevasca.png',        nome: 'Nevasca',          cor: '#b0e0ff', a: 'eletrico',   b: 'gelo',       aIcon: '⚡', bIcon: '❄️', aImg: 'Imagens/personagens/mago/ícones Hab/eletrico.png',    bImg: 'Imagens/personagens/mago/ícones Hab/Egelo.png',        mult: '2.5×', desc: 'Corrente elétrica em ambiente gelado causa choque devastador. Paralisia + Congelamento simultâneos.' },
  { key: 'raiz_eletrica',  levelRequired:7,  icon: '⚡', img: 'Imagens/personagens/mago/ícones Hab/raiz_eletrica.png',  nome: 'Raiz Elétrica',    cor: '#b0ff80', a: 'eletrico',   b: 'planta',     aIcon: '⚡', bIcon: '🌿', aImg: 'Imagens/personagens/mago/ícones Hab/eletrico.png',    bImg: 'Imagens/personagens/mago/ícones Hab/EPlanta.png',      mult: '2.1×', desc: 'Raízes conduzem eletricidade diretamente ao inimigo. Enraizamento + Paralisia simultâneos.' },
  { key: 'terremoto',      levelRequired:10,      icon: '💥', img: 'Imagens/personagens/mago/ícones Hab/terremoto.png',      nome: 'Terremoto',        cor: '#d09050', a: 'eletrico',   b: 'terra',      aIcon: '⚡', bIcon: '🪨', aImg: 'Imagens/personagens/mago/ícones Hab/eletrico.png',    bImg: 'Imagens/personagens/mago/ícones Hab/ETerra.png',       mult: '2.6×', desc: 'Energia mágica amplificada pela terra. Dano físico-mágico e reduz DEF por 3 turnos.' },
  { key: 'tempestade_negra', levelRequired:10, icon: '⚫', img: 'Imagens/personagens/mago/ícones Hab/tempestade_negra.png', nome: 'Tempestade Negra', cor: '#6030a0', a: 'eletrico', b: 'magia_negra', aIcon: '⚡', bIcon: '🌑', aImg: 'Imagens/personagens/mago/ícones Hab/eletrico.png',    bImg: 'Imagens/personagens/mago/ícones Hab/EmagiaN.png', mult: '3.1×', desc: 'Raio sombrio descarrega trevas corruptas. Paralisia + Maldição + drena HP do inimigo.' },

  // ══ GELO (4 fusões) ══
  { key: 'geada_planta',   icon: '🥶', img: 'Imagens/personagens/mago/ícones Hab/geada_planta.png',   nome: 'Geada das Raízes', cor: '#90e8c0', a: 'gelo',       b: 'planta',     aIcon: '❄️', bIcon: '🌿', aImg: 'Imagens/personagens/mago/ícones Hab/Egelo.png',        bImg: 'Imagens/personagens/mago/ícones Hab/EPlanta.png',      mult: '2.0×', desc: 'Gelo congela as raízes que prendem o inimigo. Congelamento garantido + Enraizamento por 2 turnos.' },
  { key: 'vendaval_gelo',  icon: '🌬️', img: 'Imagens/personagens/mago/ícones Hab/vendaval_gelo.png',  nome: 'Vendaval Glacial', cor: '#80c8e0', a: 'gelo',       b: 'vento',      aIcon: '❄️', bIcon: '🌪️',aImg: 'Imagens/personagens/mago/ícones Hab/Egelo.png',        bImg: 'Imagens/personagens/mago/ícones Hab/Evento.png',       mult: '2.2×', desc: 'Vento ártico avança sobre o inimigo. Lentidão extrema + Congelamento + reduz chance de acerto.' },
  { key: 'onda_fria',      icon: '💠', img: 'Imagens/personagens/mago/ícones Hab/onda_fria.png',      nome: 'Onda Fria',        cor: '#80c0ff', a: 'gelo',       b: 'energia',    aIcon: '❄️', bIcon: '✨', aImg: 'Imagens/personagens/mago/ícones Hab/Egelo.png',        bImg: 'Imagens/personagens/mago/ícones Hab/EENERGIA.png',     mult: '2.4×', desc: 'Pulso de energia amplificado pelo frio absoluto. Congela e causa dano ignorando DEF.' },
  { key: 'gelo_negro',     icon: '🖤', img: 'Imagens/personagens/mago/ícones Hab/gelo_negro.png',     nome: 'Gelo Negro',       cor: '#6040a0', a: 'gelo',       b: 'magia_negra', aIcon: '❄️', bIcon: '🌑', aImg: 'Imagens/personagens/mago/ícones Hab/Egelo.png',       bImg: 'Imagens/personagens/mago/ícones Hab/EmagiaN.png', mult: '2.7×', desc: 'Trevas congelam a alma do inimigo. Congelamento sombrio: HP drenado a cada turno enquanto congelado.' },

  // ══ PLANTA (4 fusões) ══
  { key: 'pedra_viva',     icon: '🌱', img: 'Imagens/personagens/mago/ícones Hab/pedra_viva.png',     nome: 'Pedra Viva',       cor: '#90c060', a: 'planta',     b: 'terra',      aIcon: '🌿', bIcon: '🪨', aImg: 'Imagens/personagens/mago/ícones Hab/EPlanta.png',      bImg: 'Imagens/personagens/mago/ícones Hab/ETerra.png',       mult: '2.0×', desc: 'Terra fértil faz nascer pedras vivas. Reduz ATQ e DEF do inimigo por 3 turnos. Enraizamento.' },
  { key: 'vida_planta',    icon: '💚', img: 'Imagens/personagens/mago/ícones Hab/vida_planta.png',    nome: 'Pulso de Vida',    cor: '#40e080', a: 'planta',     b: 'energia',    aIcon: '🌿', bIcon: '✨', aImg: 'Imagens/personagens/mago/ícones Hab/EPlanta.png',      bImg: 'Imagens/personagens/mago/ícones Hab/EENERGIA.png',     mult: '1.6×', desc: 'Energia vital canalizada pela natureza. Cura 20% do HP máx do Mago e causa dano moderado.' },
  { key: 'trevas_planta',  icon: '🌑', img: 'Imagens/personagens/mago/ícones Hab/trevas_planta.png',  nome: 'Floresta Sombria', cor: '#507030', a: 'planta',     b: 'magia_negra', aIcon: '🌿', bIcon: '🌑', aImg: 'Imagens/personagens/mago/ícones Hab/EPlanta.png',     bImg: 'Imagens/personagens/mago/ícones Hab/EmagiaN.png', mult: '2.3×', desc: 'Trevas corrompem a floresta. Raízes sombrias enroscam e drenam HP do inimigo por 3 turnos.' },
  { key: 'veneno_planta',  icon: '🍃', img: 'Imagens/personagens/mago/ícones Hab/veneno_planta.png',  nome: 'Toxina das Raízes', cor: '#50d050', a: 'planta',    b: 'veneno',     aIcon: '🌿', bIcon: '☠️', aImg: 'Imagens/personagens/mago/ícones Hab/EPlanta.png',      bImg: 'Imagens/personagens/mago/ícones Hab/Veneno.png',      mult: '1.9×', desc: 'Raízes inoculam veneno diretamente na corrente sanguínea. Veneno por 6 turnos + Enraizamento.' },

  // ══ TERRA (4 fusões) ══
  { key: 'pedra_fogo',     icon: '🌋', img: 'Imagens/personagens/mago/ícones Hab/pedra_fogo.png',     nome: 'Pedra em Brasa',   cor: '#ff8030', a: 'terra',      b: 'fogo',       aIcon: '🪨', bIcon: '🔥', aImg: 'Imagens/personagens/mago/ícones Hab/ETerra.png',       bImg: 'Imagens/personagens/mago/ícones Hab/fogo.png',        mult: '2.7×', desc: 'Terra aquecida explode como magma. Dano alto, Queimadura e reduz DEF do inimigo.' },
  { key: 'rocha_vento',    icon: '💨', img: 'Imagens/personagens/mago/ícones Hab/rocha_vento.png',    nome: 'Granizo de Pedras', cor: '#c0b080', a: 'terra',     b: 'vento',      aIcon: '🪨', bIcon: '🌪️',aImg: 'Imagens/personagens/mago/ícones Hab/ETerra.png',       bImg: 'Imagens/personagens/mago/ícones Hab/Evento.png',       mult: '2.4×', desc: 'Vento arremessa fragmentos de rocha em alta velocidade. Dano físico-mágico + Atordoamento.' },
  { key: 'abismo',         icon: '🕳️', img: 'Imagens/personagens/mago/ícones Hab/abismo.png',         nome: 'Abismo',           cor: '#404060', a: 'terra',      b: 'magia_negra', aIcon: '🪨', bIcon: '🌑', aImg: 'Imagens/personagens/mago/ícones Hab/ETerra.png',      bImg: 'Imagens/personagens/mago/ícones Hab/EmagiaN.png', mult: '2.8×', desc: 'Trevas abrem um buraco no chão que suga o inimigo. Maldição + DEF zero por 2 turnos.' },
  { key: 'terra_caos',     icon: '🌑', img: 'Imagens/personagens/mago/ícones Hab/terra_caos.png',     nome: 'Terra do Caos',    cor: '#806040', a: 'terra',      b: 'caos',       aIcon: '🪨', bIcon: '🌀', aImg: 'Imagens/personagens/mago/ícones Hab/ETerra.png',       bImg: 'Imagens/personagens/mago/ícones Hab/Ecaos.png',        mult: '2.0–4.5×', desc: 'O caos fragmenta a terra em explosões imprevisíveis. Múltiplos efeitos aleatórios + dano massivo.' },

  // ══ ENERGIA (4 fusões) ══
  { key: 'nova',           icon: '🌟', img: 'Imagens/personagens/mago/ícones Hab/nova.png',           nome: 'Nova de Energia',  cor: '#e080ff', a: 'energia',    b: 'fogo',       aIcon: '✨', bIcon: '🔥', aImg: 'Imagens/personagens/mago/ícones Hab/EENERGIA.png',     bImg: 'Imagens/personagens/mago/ícones Hab/fogo.png',        mult: '3.2×', desc: 'Energia pura + fogo geram nova estelar. O dano mais alto do jogo. Queimadura garantida.' },
  { key: 'luz_divina',     icon: '✝️', img: 'Imagens/personagens/mago/ícones Hab/luz_divina.png',     nome: 'Luz Divina',       cor: '#ffffa0', a: 'energia',    b: 'luz',        aIcon: '✨', bIcon: '☀️', aImg: 'Imagens/personagens/mago/ícones Hab/EENERGIA.png',     bImg: 'Imagens/personagens/mago/ícones Hab/ELuz.png',         mult: '2.6×', desc: 'Energia sagrada amplificada. Cura 25% HP do Mago, cega o inimigo e causa dano sagrado massivo.' },
  { key: 'vortice',        icon: '🌀', img: 'Imagens/personagens/mago/ícones Hab/vortice.png',        nome: 'Vórtice Arcano',   cor: '#a060e0', a: 'energia',    b: 'vento',      aIcon: '✨', bIcon: '🌪️',aImg: 'Imagens/personagens/mago/ícones Hab/EENERGIA.png',     bImg: 'Imagens/personagens/mago/ícones Hab/Evento.png',       mult: '2.3×', desc: 'Vórtice de energia arcana suga o inimigo. Paralisia + evasão máxima do Mago por 2 turnos.' },
  { key: 'caos_arcano',    icon: '💫', img: 'Imagens/personagens/mago/ícones Hab/caos_arcano.png',    nome: 'Caos Arcano',      cor: '#d080ff', a: 'energia',    b: 'caos',       aIcon: '✨', bIcon: '🌀', aImg: 'Imagens/personagens/mago/ícones Hab/EENERGIA.png',     bImg: 'Imagens/personagens/mago/ícones Hab/Ecaos.png',        mult: '1.5–5.0×', desc: 'Energia amplifica o caos ao extremo. Dano imprevisível + efeito aleatório devastador.' },

  // ══ MAGIA NEGRA (4 fusões) ══
  { key: 'sombra_vento',   icon: '🌑', img: 'Imagens/personagens/mago/ícones Hab/sombra_vento.png',   nome: 'Sombra Veloz',     cor: '#604080', a: 'magia_negra', b: 'vento',    aIcon: '🌑', bIcon: '🌪️',aImg: 'Imagens/personagens/mago/ícones Hab/EmagiaN.png', bImg: 'Imagens/personagens/mago/ícones Hab/Evento.png',       mult: '2.5×', desc: 'Trevas se movem como vento. Maldição + evasão máxima por 3 turnos + chance de ataque duplo.' },
  { key: 'praga',          icon: '🦠', img: 'Imagens/personagens/mago/ícones Hab/praga.png',          nome: 'Praga Sombria',    cor: '#408040', a: 'magia_negra', b: 'veneno',   aIcon: '🌑', bIcon: '☠️', aImg: 'Imagens/personagens/mago/ícones Hab/EmagiaN.png', bImg: 'Imagens/personagens/mago/ícones Hab/Veneno.png',      mult: '2.0×', desc: 'Veneno corrompido por trevas se torna praga. Maldição + Veneno por 6 turnos + drenagem de HP.' },
  { key: 'caos_sombrio',   icon: '⚫', img: 'Imagens/personagens/mago/ícones Hab/caos_sombrio.png',   nome: 'Caos Sombrio',     cor: '#8020c0', a: 'magia_negra', b: 'caos',     aIcon: '🌑', bIcon: '🌀', aImg: 'Imagens/personagens/mago/ícones Hab/EmagiaN.png', bImg: 'Imagens/personagens/mago/ícones Hab/Ecaos.png',        mult: '2.0–5.0×', desc: 'O caos corrompe as próprias trevas. Dano imprevísivel + Maldição garantida + efeito aleatório sombrio.' },
  { key: 'eclipse',        icon: '🌘', img: 'Imagens/personagens/mago/ícones Hab/eclipse.png',        nome: 'Eclipse',          cor: '#504070', a: 'magia_negra', b: 'luz',      aIcon: '🌑', bIcon: '☀️', aImg: 'Imagens/personagens/mago/ícones Hab/EmagiaN.png', bImg: 'Imagens/personagens/mago/ícones Hab/ELuz.png',         mult: '3.5×', desc: 'Luz e trevas colidem em eclipse total. Dano máximo + cura o Mago + cega e amaldiçoa o inimigo.' },

  // ══ VENTO (4 fusões) ══
  { key: 'tufao_veneno',   icon: '🌀', img: 'Imagens/personagens/mago/ícones Hab/tufao_veneno.png',   nome: 'Tufão Venenoso',   cor: '#80c060', a: 'vento',      b: 'veneno',     aIcon: '🌪️', bIcon: '☠️', aImg: 'Imagens/personagens/mago/ícones Hab/Evento.png',      bImg: 'Imagens/personagens/mago/ícones Hab/Veneno.png',      mult: '2.1×', desc: 'Vento espalha veneno em área. Veneno por 4 turnos + reduz chance de acerto do inimigo.' },
  { key: 'luz_vento',      icon: '🌟', img: 'Imagens/personagens/mago/ícones Hab/luz_vento.png',      nome: 'Rajada de Luz',    cor: '#e0f060', a: 'vento',      b: 'luz',        aIcon: '🌪️', bIcon: '☀️', aImg: 'Imagens/personagens/mago/ícones Hab/Evento.png',      bImg: 'Imagens/personagens/mago/ícones Hab/ELuz.png',         mult: '2.3×', desc: 'Vento carrega feixes de luz sagrada. Cega o inimigo garantidamente + cura Mago + alta evasão.' },
  { key: 'vento_caos',     icon: '🌪️', img: 'Imagens/personagens/mago/ícones Hab/vento_caos.png',    nome: 'Vento do Caos',    cor: '#c080d0', a: 'vento',      b: 'caos',       aIcon: '🌪️', bIcon: '🌀', aImg: 'Imagens/personagens/mago/ícones Hab/Evento.png',      bImg: 'Imagens/personagens/mago/ícones Hab/Ecaos.png',        mult: '1.5–3.5×', desc: 'Vento caótico gira sem controle. Efeito completamente aleatório + evasão máxima por 1 turno.' },
  { key: 'ciclone_gelo',   icon: '❄️', img: 'Imagens/personagens/mago/ícones Hab/ciclone_gelo.png',  nome: 'Ciclone de Gelo',  cor: '#80d8ff', a: 'vento',      b: 'gelo',       aIcon: '🌪️', bIcon: '❄️', aImg: 'Imagens/personagens/mago/ícones Hab/Evento.png',      bImg: 'Imagens/personagens/mago/ícones Hab/Egelo.png',        mult: '2.4×', desc: 'Ciclone ártico envolve o inimigo. Congelamento + Lentidão extrema + evasão aumentada.' },

  // ══ CAOS (4 fusões) ══
  { key: 'caos_veneno',    icon: '🌀', img: 'Imagens/personagens/mago/ícones Hab/caos_veneno.png',   nome: 'Veneno do Caos',   cor: '#a0c040', a: 'caos',       b: 'veneno',     aIcon: '🌀', bIcon: '☠️', aImg: 'Imagens/personagens/mago/ícones Hab/Ecaos.png',        bImg: 'Imagens/personagens/mago/ícones Hab/Veneno.png',      mult: '2.0–3.5×', desc: 'Caos potencializa o veneno de forma imprevisível. Veneno por 3–7 turnos com dano variável.' },
  { key: 'caos_luz',       icon: '💫', img: 'Imagens/personagens/mago/ícones Hab/caos_luz.png',       nome: 'Luz do Caos',      cor: '#f0e080', a: 'caos',       b: 'luz',        aIcon: '🌀', bIcon: '☀️', aImg: 'Imagens/personagens/mago/ícones Hab/Ecaos.png',        bImg: 'Imagens/personagens/mago/ícones Hab/ELuz.png',         mult: '2.5–4.0×', desc: 'Luz sagrada enlouquece o caos. Cura ou cega aleatoriamente + dano imprevisível altíssimo.' },
  { key: 'caos_planta',    icon: '🌿', img: 'Imagens/personagens/mago/ícones Hab/caos_planta.png',    nome: 'Floresta Caótica', cor: '#80d080', a: 'caos',       b: 'planta',     aIcon: '🌀', bIcon: '🌿', aImg: 'Imagens/personagens/mago/ícones Hab/Ecaos.png',        bImg: 'Imagens/personagens/mago/ícones Hab/EPlanta.png',      mult: '1.8–3.0×', desc: 'Caos faz a floresta enlouquecer. Enraizamento aleatório + veneno + efeito surpresa.' },
  { key: 'caos_agua',      icon: '🌊', img: 'Imagens/personagens/mago/ícones Hab/caos_agua.png',      nome: 'Maré do Caos',     cor: '#60b0e0', a: 'caos',       b: 'agua',       aIcon: '🌀', bIcon: '💧', aImg: 'Imagens/personagens/mago/ícones Hab/Ecaos.png',        bImg: 'Imagens/personagens/mago/ícones Hab/agua.png',        mult: '2.0–3.8×', desc: 'Água amplificada pelo caos vira maré imparável. Lentidão extrema + efeito aleatório.' },

  // ══ VENENO (4 fusões) ══
  { key: 'veneno_fogo',    icon: '🔥', img: 'Imagens/personagens/mago/ícones Hab/veneno_fogo.png',    nome: 'Chama Corrosiva',  cor: '#c06020', a: 'veneno',     b: 'fogo',       aIcon: '☠️', bIcon: '🔥', aImg: 'Imagens/personagens/mago/ícones Hab/Veneno.png',      bImg: 'Imagens/personagens/mago/ícones Hab/fogo.png',        mult: '2.5×', desc: 'Veneno + fogo criam ácido flamejante. Queimadura + Veneno simultâneos. DEF reduzida ao zero.' },
  { key: 'veneno_eletrico', icon: '⚡', img: 'Imagens/personagens/mago/ícones Hab/veneno_eletrico.png', nome: 'Choque Tóxico',  cor: '#a0d040', a: 'veneno',    b: 'eletrico',   aIcon: '☠️', bIcon: '⚡', aImg: 'Imagens/personagens/mago/ícones Hab/Veneno.png',      bImg: 'Imagens/personagens/mago/ícones Hab/eletrico.png',    mult: '2.3×', desc: 'Veneno conduz eletricidade pelo corpo do inimigo. Veneno + Paralisia: turno perdido envenenado.' },
  { key: 'veneno_gelo',    icon: '❄️', img: 'Imagens/personagens/mago/ícones Hab/veneno_gelo.png',    nome: 'Veneno Glacial',   cor: '#60b080', a: 'veneno',     b: 'gelo',       aIcon: '☠️', bIcon: '❄️', aImg: 'Imagens/personagens/mago/ícones Hab/Veneno.png',      bImg: 'Imagens/personagens/mago/ícones Hab/Egelo.png',        mult: '2.2×', desc: 'Gelo cristaliza o veneno nas veias do inimigo. Congelamento + Veneno intensificado por 5 turnos.' },
  { key: 'veneno_energia', icon: '✨', img: 'Imagens/personagens/mago/ícones Hab/veneno_energia.png', nome: 'Energia Tóxica',   cor: '#b0e060', a: 'veneno',     b: 'energia',    aIcon: '☠️', bIcon: '✨', aImg: 'Imagens/personagens/mago/ícones Hab/Veneno.png',      bImg: 'Imagens/personagens/mago/ícones Hab/EENERGIA.png',     mult: '2.4×', desc: 'Energia mágica amplifica o veneno. Ignora DEF + Veneno por 5 turnos + drena MP do inimigo.' },

  // ══ LUZ (4 fusões) ══
  { key: 'luz_agua',       icon: '🌊', img: 'Imagens/personagens/mago/ícones Hab/luz_agua.png',       nome: 'Onda Sagrada',     cor: '#c0e8ff', a: 'luz',        b: 'agua',       aIcon: '☀️', bIcon: '💧', aImg: 'Imagens/personagens/mago/ícones Hab/ELuz.png',         bImg: 'Imagens/personagens/mago/ícones Hab/agua.png',        mult: '2.1×', desc: 'Água sagrada purifica o campo. Cura 15% HP do Mago + remove Lentidão + Cegueira no inimigo.' },
  { key: 'luz_terra',      icon: '🏔️', img: 'Imagens/personagens/mago/ícones Hab/luz_terra.png',     nome: 'Pilar de Luz',     cor: '#e0d060', a: 'luz',        b: 'terra',      aIcon: '☀️', bIcon: '🪨', aImg: 'Imagens/personagens/mago/ícones Hab/ELuz.png',         bImg: 'Imagens/personagens/mago/ícones Hab/ETerra.png',       mult: '2.5×', desc: 'Pilar de luz sagrada cai sobre o inimigo. Cegueira garantida + DEF reduzida + cura Mago.' },
  { key: 'luz_planta',     icon: '🌸', img: 'Imagens/personagens/mago/ícones Hab/luz_planta.png',     nome: 'Jardim Sagrado',   cor: '#d0f080', a: 'luz',        b: 'planta',     aIcon: '☀️', bIcon: '🌿', aImg: 'Imagens/personagens/mago/ícones Hab/ELuz.png',         bImg: 'Imagens/personagens/mago/ícones Hab/EPlanta.png',      mult: '1.8×', desc: 'Luz nutre a natureza sagrada. Cura 30% HP do Mago + Enraizamento + purifica veneno do Mago.' },
  { key: 'luz_energia',    icon: '⭐', img: 'Imagens/personagens/mago/ícones Hab/luz_energia.png',    nome: 'Explosão Sagrada', cor: '#fff080', a: 'luz',        b: 'energia',    aIcon: '☀️', bIcon: '✨', aImg: 'Imagens/personagens/mago/ícones Hab/ELuz.png',         bImg: 'Imagens/personagens/mago/ícones Hab/EENERGIA.png',     mult: '3.0×', desc: 'Energia sagrada em sua forma mais pura. Dano massivo ignorando DEF + cura Mago + Cegueira.' },
];

function abrirPopupReacao(tipo, key) {
  // Remove popup anterior
  const old = document.getElementById('popup-reacao-el');
  if (old) old.remove();

  let dados = null;
  let isReacao = false;
  if (tipo === 'elem') {
    dados = MAGO_ELEMENTOS.find(e => e.key === key);
  } else {
    dados = MAGO_REACOES.find(r => r.key === key);
    isReacao = true;
  }
  if (!dados) return;

  const overlay = document.createElement('div');
  overlay.id = 'popup-reacao-el';
  overlay.style.cssText = `
    position:fixed; inset:0; z-index:10100;
    background:rgba(0,0,0,0.82);
    display:flex; align-items:center; justify-content:center;
    padding:12px;
  `;
  overlay.onclick = (ev) => { if (ev.target === overlay) overlay.remove(); };

  const _img = (src, icon, sz) => src
    ? `<img src="${src}" style="width:${sz};height:${sz};object-fit:contain;image-rendering:pixelated;" onerror="this.outerHTML='<span style=\\'font-size:3rem\\'>${icon}</span>'">`
    : `<span style="font-size:3rem;">${icon}</span>`;

  // ── Layout split: imagem grande esquerda | info direita ──
  let bodyHTML = '';
  if (!isReacao) {
    // ELEMENTO BASE — igual à imagem 1
    // Verifica qual slot está equipado (se aplicável)
    const p = window.G && window.G.player;
    const cls = p && p.classData;
    const equippedSkills = (p && p.equippedSkills) || [];
    const baseSkills = cls ? (cls.skills || []) : [];
    const skillIdx = baseSkills.findIndex(sk => sk.elemento === key || sk.key === ('elem_' + key));
    const skillKey = skillIdx >= 0 ? 'b' + skillIdx : null;
    const slotIdx  = skillKey ? equippedSkills.indexOf(skillKey) : -1;
    const slotLabel = slotIdx >= 0
      ? `<div style="font-size:0.52rem;color:#60e060;letter-spacing:1px;margin-top:2px;">✓ Equipado · SLOT ${slotIdx+1}</div>`
      : '';
    const equipBtnHTML = skillKey ? `
      <div style="margin-top:14px;display:flex;gap:8px;">
        ${[0,1,2].map(i => {
          const isThis = equippedSkills[i] === skillKey;
          return `<button onclick="window._magoEquiparSlot('${skillKey}',${i})" style="
            flex:1;padding:8px 4px;
            background:${isThis ? dados.cor+'22' : 'rgba(200,150,10,0.06)'};
            border:1px solid ${isThis ? dados.cor : 'rgba(200,150,10,0.25)'};
            color:${isThis ? dados.cor : 'rgba(200,150,10,0.6)'};
            font-family:'Noto Serif JP',serif;font-size:0.6rem;
            cursor:pointer;letter-spacing:1px;
          ">${isThis ? '✓' : '+'} SLOT ${i+1}</button>`;
        }).join('')}
      </div>` : '';

    bodyHTML = `
      <div style="display:flex;min-height:200px;">
        <!-- Lado esquerdo: imagem grande -->
        <div style="flex:0 0 48%;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;border-right:1px solid ${dados.cor}33;padding:20px;">
          ${_img(dados.img, dados.icon, '120px')}
        </div>
        <!-- Lado direito: info -->
        <div style="flex:1;padding:22px 18px;display:flex;flex-direction:column;justify-content:center;gap:14px;">
          <div style="font-size:0.48rem;letter-spacing:3px;color:${dados.cor};opacity:0.7;">E L E M E N T O</div>
          <div style="font-size:1.25rem;color:${dados.cor};font-family:'Noto Serif JP',serif;line-height:1.2;">${dados.nome}</div>
          <div style="display:inline-flex;align-items:center;gap:8px;background:${dados.cor}18;border:1px solid ${dados.cor}60;padding:8px 14px;border-radius:2px;width:fit-content;">
            <span style="font-size:0.7rem;color:${dados.cor};">♦</span>
            <span style="font-size:0.8rem;color:${dados.cor};letter-spacing:2px;">${dados.mp} MP</span>
          </div>
          <div style="font-size:0.65rem;color:rgba(242,232,208,0.8);line-height:1.7;">${dados.desc}</div>
          ${slotLabel}
          ${equipBtnHTML}
        </div>
      </div>`;
  } else {
    // FUSÃO — layout compacto com combinação + split
    bodyHTML = `
      <div style="display:flex;min-height:200px;">
        <!-- Lado esquerdo: imagem resultado grande -->
        <div style="flex:0 0 48%;background:rgba(0,0,0,0.35);display:flex;flex-direction:column;align-items:center;justify-content:center;border-right:1px solid ${dados.cor}33;padding:16px;gap:10px;">
          ${_img(dados.img, dados.icon, '100px')}
          <!-- mini combo abaixo -->
          <div style="display:flex;align-items:center;gap:4px;margin-top:4px;">
            ${dados.aImg ? `<img src="${dados.aImg}" style="width:18px;height:18px;object-fit:contain;image-rendering:pixelated;">` : `<span style="font-size:0.8rem;">${dados.aIcon}</span>`}
            <span style="font-size:0.55rem;color:rgba(200,150,10,0.5);">+</span>
            ${dados.bImg ? `<img src="${dados.bImg}" style="width:18px;height:18px;object-fit:contain;image-rendering:pixelated;">` : `<span style="font-size:0.8rem;">${dados.bIcon}</span>`}
          </div>
        </div>
        <!-- Lado direito: info -->
        <div style="flex:1;padding:20px 16px;display:flex;flex-direction:column;justify-content:center;gap:12px;">
          <div style="font-size:0.45rem;letter-spacing:3px;color:${dados.cor};opacity:0.7;">F U S Ã O</div>
          <div style="font-size:1.05rem;color:${dados.cor};font-family:'Noto Serif JP',serif;line-height:1.3;">${dados.nome}</div>
          <div style="display:inline-flex;align-items:center;gap:8px;background:${dados.cor}18;border:1px solid ${dados.cor}60;padding:7px 12px;border-radius:2px;width:fit-content;">
            <span style="font-size:0.7rem;color:${dados.cor};">♦</span>
            <span style="font-size:0.75rem;color:${dados.cor};letter-spacing:2px;">${dados.mult} MAG</span>
          </div>
          <div style="font-size:0.62rem;color:rgba(242,232,208,0.8);line-height:1.7;">${dados.desc}</div>
        </div>
      </div>`;
  }

  const box = document.createElement('div');
  box.style.cssText = `
    background:#100c04;
    border:1px solid ${dados.cor}88;
    border-top:3px solid ${dados.cor};
    width:min(400px,94vw);
    border-radius:2px;
    font-family:'Noto Serif JP',serif;
    overflow:hidden;
    transform:scale(0.88);opacity:0;
    transition:transform 0.22s cubic-bezier(0.175,0.885,0.32,1.275),opacity 0.18s ease;
  `;

  box.innerHTML = `
    <!-- Topbar -->
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid ${dados.cor}33;">
      <div style="font-size:0.65rem;letter-spacing:3px;color:${dados.cor};">${dados.nome.toUpperCase()}</div>
      <button onclick="document.getElementById('popup-reacao-el').remove()" style="
        background:${dados.cor}22;border:1px solid ${dados.cor}55;
        color:${dados.cor};padding:4px 12px;font-size:0.7rem;
        cursor:pointer;font-family:'Noto Serif JP',serif;
      ">✕</button>
    </div>
    ${bodyHTML}
  `;

  overlay.appendChild(box);
  document.body.appendChild(overlay);
  // Anima entrada
  requestAnimationFrame(() => requestAnimationFrame(() => {
    box.style.transform = 'scale(1)';
    box.style.opacity = '1';
  }));
}

function _tocarSomLivro() {
  try {
    const sfx = new Audio('musicas/efeitos sonoro/benkirb-shine-1-268902.mp3');
    sfx.volume = 0.22;
    sfx.play().catch(() => {});
  } catch(e) {}
}

function abrirLivroMago() {
  _tocarSomLivro();

  // Efeito visual na capa da bolsa
  const capaImg = document.getElementById('livro-capa-img');
  if (capaImg) {
    capaImg.style.transform = 'scale(1.15) rotate(-3deg)';
    capaImg.style.filter = 'drop-shadow(0 0 28px rgba(200,150,10,1))';
    setTimeout(() => {
      capaImg.style.transform = '';
      capaImg.style.filter = 'drop-shadow(0 0 14px rgba(200,150,10,0.6))';
    }, 400);
  }

  const old = document.getElementById('modal-livro-mago');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'modal-livro-mago';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:10000;
    background:rgba(0,0,0,0);
    display:flex;align-items:center;justify-content:center;
    padding:10px;
    transition:background 0.3s;
  `;
  overlay.onclick = ev => { if (ev.target === overlay) fecharLivroMago(); };
  document.body.appendChild(overlay);
  requestAnimationFrame(() => { overlay.style.background = 'rgba(0,0,0,0.88)'; });

  // Grupos de reações por categoria
  const grupos = [
    { titulo: '✦ ELEMENTOS BASE',           cor: '#c8960a', itens: MAGO_ELEMENTOS,                                              tipo: 'elem'   },
    { titulo: '🔥 FUSÕES · FOGO',           cor: '#ff6020', itens: MAGO_REACOES.filter(r => r.a === 'fogo'),                   tipo: 'reacao' },
    { titulo: '💧 FUSÕES · ÁGUA',           cor: '#40a0ff', itens: MAGO_REACOES.filter(r => r.a === 'agua'),                   tipo: 'reacao' },
    { titulo: '⚡ FUSÕES · ELÉTRICO',       cor: '#ffee40', itens: MAGO_REACOES.filter(r => r.a === 'eletrico'),               tipo: 'reacao' },
    { titulo: '❄️ FUSÕES · GELO',           cor: '#a0e8ff', itens: MAGO_REACOES.filter(r => r.a === 'gelo'),                   tipo: 'reacao' },
    { titulo: '🌿 FUSÕES · PLANTA',         cor: '#60d060', itens: MAGO_REACOES.filter(r => r.a === 'planta'),                 tipo: 'reacao' },
    { titulo: '🪨 FUSÕES · TERRA',          cor: '#c08040', itens: MAGO_REACOES.filter(r => r.a === 'terra'),                  tipo: 'reacao' },
    { titulo: '✨ FUSÕES · ENERGIA',        cor: '#e0a0ff', itens: MAGO_REACOES.filter(r => r.a === 'energia'),               tipo: 'reacao' },
    { titulo: '🌑 FUSÕES · MAGIA NEGRA',    cor: '#9040c0', itens: MAGO_REACOES.filter(r => r.a === 'magia_negra'),           tipo: 'reacao' },
    { titulo: '🌪️ FUSÕES · VENTO',         cor: '#80d0ff', itens: MAGO_REACOES.filter(r => r.a === 'vento'),                 tipo: 'reacao' },
    { titulo: '🌀 FUSÕES · CAOS',           cor: '#c060ff', itens: MAGO_REACOES.filter(r => r.a === 'caos'),                  tipo: 'reacao' },
    { titulo: '☠️ FUSÕES · VENENO',         cor: '#60c060', itens: MAGO_REACOES.filter(r => r.a === 'veneno'),                tipo: 'reacao' },
    { titulo: '☀️ FUSÕES · LUZ',            cor: '#ffe060', itens: MAGO_REACOES.filter(r => r.a === 'luz'),                   tipo: 'reacao' },
  ];

  const gruposHTML = grupos.map(g => {
    const cardsHTML = g.itens.map(item => {
      const isReacao = g.tipo === 'reacao';
      const miniCombina = isReacao ? `
        <div style="display:flex;align-items:center;gap:2px;margin-bottom:4px;">
          ${item.aImg ? `<img src="${item.aImg}" style="width:13px;height:13px;object-fit:contain;">` : `<span style="font-size:0.55rem;">${item.aIcon}</span>`}
          <span style="font-size:0.45rem;color:rgba(200,150,10,0.4);">+</span>
          ${item.bImg ? `<img src="${item.bImg}" style="width:13px;height:13px;object-fit:contain;">` : `<span style="font-size:0.55rem;">${item.bIcon}</span>`}
        </div>` : '';
      const lvReq = item.levelRequired || 1;
      const playerLevel = (window.G && window.G.player && window.G.player.level) || 1;
      const isLocked = isReacao && playerLevel < lvReq;
      const iconHTML = isLocked
        ? `<span style="font-size:1.5rem;filter:grayscale(1);opacity:0.5;">🔒</span>`
        : (item.img
          ? `<img src="${item.img}" style="width:48px;height:48px;object-fit:contain;image-rendering:pixelated;" onerror="this.outerHTML='<span style=\'font-size:1.5rem\'>${item.icon}</span>'">`
          : `<span style="font-size:1.5rem;">${item.icon}</span>`);
      return isLocked ? `
        <div style="
          display:flex;flex-direction:column;align-items:center;gap:2px;
          padding:8px 4px;border:1px solid rgba(255,255,255,0.06);
          background:rgba(0,0,0,0.2);border-radius:2px;
          min-width:72px;flex:1;opacity:0.35;cursor:not-allowed;
        ">
          ${iconHTML}
          <div style="font-size:0.5rem;color:rgba(200,150,10,0.3);letter-spacing:0.5px;text-align:center;line-height:1.3;margin-top:2px;">${item.nome}</div>
          <div style="font-size:0.42rem;color:rgba(200,150,10,0.25);">LV${lvReq}</div>
        </div>` : `
        <div onclick="abrirPopupReacao('${g.tipo}','${item.key}')" style="
          display:flex;flex-direction:column;align-items:center;gap:2px;
          padding:8px 4px;border:1px solid ${item.cor}55;
          background:${item.cor}0d;cursor:pointer;border-radius:2px;
          min-width:72px;flex:1;
        ">
          ${miniCombina}
          ${iconHTML}
          <div style="font-size:0.5rem;color:${item.cor};letter-spacing:0.5px;text-align:center;line-height:1.3;margin-top:2px;">${item.nome}</div>
          ${isReacao ? `<div style="font-size:0.45rem;color:rgba(200,150,10,0.35);">${item.mult} MAG</div>` : `<div style="font-size:0.45rem;color:rgba(200,150,10,0.35);">${item.mp} MP</div>`}
        </div>`;
    }).join('');
    return `
      <div style="margin-bottom:14px;">
        <div style="font-size:0.48rem;color:${g.cor};letter-spacing:2px;margin-bottom:6px;opacity:0.8;">${g.titulo}</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;">${cardsHTML}</div>
      </div>`;
  }).join('');

  const box = document.createElement('div');
  box.style.cssText = `
    width:min(380px,96vw);
    max-height:88vh;
    overflow-y:auto;
    background-image:url('Imagens/icones/L8li.png');
    background-size:cover;
    background-position:center top;
    border:1px solid rgba(200,150,10,0.5);
    border-top:3px solid #c8960a;
    border-radius:2px;
    font-family:'Noto Serif JP',serif;
    position:relative;
    transform:scale(0.7) rotateY(30deg);
    opacity:0;
    transition:transform 0.35s cubic-bezier(0.175,0.885,0.32,1.275), opacity 0.3s ease;
  `;
  box.innerHTML = `
    <div style="background:rgba(8,5,1,0.82);min-height:100%;padding:0 0 20px 0;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid rgba(200,150,10,0.2);">
        <div style="display:flex;align-items:center;gap:10px;">
          <img src="Imagens/icones/li.png" style="width:28px;height:28px;object-fit:contain;" onerror="this.style.display='none'">
          <div>
            <div style="font-size:0.72rem;letter-spacing:2px;color:#c8960a;">LIVRO DE FUSÕES</div>
            <div style="font-size:0.5rem;color:rgba(200,150,10,0.45);letter-spacing:1px;">Toque num elemento para ver detalhes</div>
          </div>
        </div>
        <button onclick="fecharLivroMago()" style="
          background:none;border:1px solid rgba(200,150,10,0.3);
          color:rgba(200,150,10,0.7);padding:4px 12px;font-size:0.65rem;cursor:pointer;
        ">✕</button>
      </div>
      <div style="padding:14px 12px 0;">
        ${gruposHTML}
      </div>
    </div>
  `;

  overlay.appendChild(box);

  // Anima abertura do livro
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      box.style.transform = 'scale(1) rotateY(0deg)';
      box.style.opacity = '1';
    });
  });
}

function fecharLivroMago() {
  const overlay = document.getElementById('modal-livro-mago');
  if (!overlay) return;
  const box = overlay.firstElementChild;
  if (box) {
    box.style.transform = 'scale(0.7) rotateY(-30deg)';
    box.style.opacity = '0';
  }
  overlay.style.background = 'rgba(0,0,0,0)';
  setTimeout(() => overlay.remove(), 320);
}

// ══════════════════════════════════════════════════════════════
//  TUTORIAL DE FUSÃO ELEMENTAL (aparece uma única vez)
// ══════════════════════════════════════════════════════════════
function mostrarTutorialFusao() {
  const CHAVE = 'clivor_tutorial_fusao_v1';
  if (localStorage.getItem(CHAVE)) return; // já viu
  localStorage.setItem(CHAVE, '1');

  const overlay = document.createElement('div');
  overlay.id = 'tutorial-fusao-overlay';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:99999;
    background:rgba(0,0,0,0);
    display:flex;align-items:center;justify-content:center;
    padding:16px;
    transition:background 0.4s;
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => { overlay.style.background = 'rgba(0,0,0,0.85)'; });

  const box = document.createElement('div');
  box.style.cssText = `
    width:min(340px,94vw);
    background:#0d0a03;
    border:1px solid rgba(200,150,10,0.5);
    border-top:3px solid #c8960a;
    border-radius:2px;
    font-family:'Noto Serif JP',serif;
    transform:scale(0.8) translateY(30px);
    opacity:0;
    transition:transform 0.4s cubic-bezier(0.175,0.885,0.32,1.275), opacity 0.35s ease;
  `;

  box.innerHTML = `
    <div style="padding:16px 18px;border-bottom:1px solid rgba(200,150,10,0.15);">
      <div style="font-size:0.65rem;letter-spacing:3px;color:#c8960a;">⚗ FUSÃO ELEMENTAL</div>
      <div style="font-size:0.5rem;color:rgba(200,150,10,0.4);letter-spacing:1px;margin-top:3px;">Como funciona?</div>
    </div>

    <div style="padding:18px 18px 0;">
      <div style="font-size:0.68rem;color:rgba(242,232,208,0.8);line-height:1.8;text-align:center;margin-bottom:18px;">
        Use <strong style="color:#ff8040;">dois elementos em sequência</strong><br>para desencadear uma reação poderosa!
      </div>

      <!-- Exemplo 1 -->
      <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:12px;">
        <div style="background:rgba(255,96,32,0.12);border:1px solid rgba(255,96,32,0.3);padding:8px 12px;border-radius:2px;text-align:center;">
          <img src="Imagens/personagens/mago/ícones Hab/fogo.png" style="width:36px;height:36px;object-fit:contain;" onerror="this.outerHTML='<div style=\'font-size:1.6rem\'>🔥</div>'">
          <div style="font-size:0.48rem;color:#ff8040;margin-top:3px;">Fogo</div>
        </div>
        <div style="font-size:1rem;color:rgba(200,150,10,0.5);">+</div>
        <div style="background:rgba(64,160,255,0.12);border:1px solid rgba(64,160,255,0.3);padding:8px 12px;border-radius:2px;text-align:center;">
          <img src="Imagens/personagens/mago/ícones Hab/agua.png" style="width:36px;height:36px;object-fit:contain;" onerror="this.outerHTML='<div style=\'font-size:1.6rem\'>💧</div>'">
          <div style="font-size:0.48rem;color:#40a0ff;margin-top:3px;">Água</div>
        </div>
        <div style="font-size:1rem;color:rgba(200,150,10,0.5);">→</div>
        <div style="background:rgba(192,224,255,0.10);border:1px solid rgba(192,224,255,0.35);padding:8px 12px;border-radius:2px;text-align:center;">
          <img src="Imagens/personagens/mago/ícones Hab/vapor.png" style="width:36px;height:36px;object-fit:contain;" onerror="this.outerHTML='<div style=\'font-size:1.6rem\'>🌫️</div>'">
          <div style="font-size:0.48rem;color:#c0e0ff;margin-top:3px;">Vapor 2.0×</div>
        </div>
      </div>

      <!-- Exemplo 2 -->
      <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:18px;">
        <div style="background:rgba(255,96,32,0.12);border:1px solid rgba(255,96,32,0.3);padding:8px 12px;border-radius:2px;text-align:center;">
          <img src="Imagens/personagens/mago/ícones Hab/fogo.png" style="width:36px;height:36px;object-fit:contain;" onerror="this.outerHTML='<div style=\'font-size:1.6rem\'>🔥</div>'">
          <div style="font-size:0.48rem;color:#ff8040;margin-top:3px;">Fogo</div>
        </div>
        <div style="font-size:1rem;color:rgba(200,150,10,0.5);">+</div>
        <div style="background:rgba(255,238,64,0.12);border:1px solid rgba(255,238,64,0.3);padding:8px 12px;border-radius:2px;text-align:center;">
          <img src="Imagens/personagens/mago/ícones Hab/eletrico.png" style="width:36px;height:36px;object-fit:contain;" onerror="this.outerHTML='<div style=\'font-size:1.6rem\'>⚡</div>'">
          <div style="font-size:0.48rem;color:#ffee40;margin-top:3px;">Elétrico</div>
        </div>
        <div style="font-size:1rem;color:rgba(200,150,10,0.5);">→</div>
        <div style="background:rgba(255,204,0,0.10);border:1px solid rgba(255,204,0,0.35);padding:8px 12px;border-radius:2px;text-align:center;">
          <img src="Imagens/personagens/mago/ícones Hab/sobrecarga.png" style="width:36px;height:36px;object-fit:contain;" onerror="this.outerHTML='<div style=\'font-size:1.6rem\'>🌩️</div>'">
          <div style="font-size:0.48rem;color:#ffcc00;margin-top:3px;">Sobrecarga 2.8×</div>
        </div>
      </div>

      <div style="font-size:0.56rem;color:rgba(200,150,10,0.45);text-align:center;line-height:1.7;margin-bottom:20px;">
        Consulte o <strong style="color:rgba(200,150,10,0.7);">📖 Livro</strong> na sua bolsa<br>para ver todas as fusões disponíveis.
      </div>
    </div>

    <div style="padding:0 18px 20px;">
      <button onclick="fecharTutorialFusao()" style="
        width:100%;padding:11px;
        background:rgba(200,150,10,0.12);
        border:1px solid rgba(200,150,10,0.4);
        color:#c8960a;
        font-family:'Noto Serif JP',serif;
        font-size:0.7rem;letter-spacing:2px;
        cursor:pointer;
        transition:background 0.2s;
      ">✦ ENTENDI!</button>
    </div>
  `;

  overlay.appendChild(box);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      box.style.transform = 'scale(1) translateY(0)';
      box.style.opacity = '1';
    });
  });
}

function fecharTutorialFusao() {
  const overlay = document.getElementById('tutorial-fusao-overlay');
  if (!overlay) return;
  const box = overlay.firstElementChild;
  if (box) { box.style.transform = 'scale(0.85) translateY(20px)'; box.style.opacity = '0'; }
  overlay.style.background = 'rgba(0,0,0,0)';
  setTimeout(() => overlay.remove(), 350);
}

window.mostrarTutorialFusao = mostrarTutorialFusao;
window.fecharTutorialFusao  = fecharTutorialFusao;

window.abrirLivroMago = abrirLivroMago;
window.fecharLivroMago = fecharLivroMago;

function buildLivroReacoesHTML(cls) {
  return ''; // Livro movido para a Bolsa (aba 📖 Livro)
}

function buildTalentTreeUI(tree) {
  const container = document.getElementById('talent-tree-content');
  const pt        = getAvailablePT();
  const owned     = getPlayerTalents();
  const p         = G.player;
  const cls       = p.classData;
  const isWarrior = cls && ['paladino','assassino','arqueiro'].includes(cls.id);
  const baseSkills   = cls ? (cls.skills || []) : [];
  const talentSkills = getTalentSkills();
  const equipped     = p.equippedSkills || ['b0','b1','b2'];

  // ── Painel de slots ──
  const refreshTree = "setTimeout(()=>{const t=getTalentTree();if(t)buildTalentTreeUI(t);},200);";
  const slotsHTML = [0,1,2].map(i => {
    const key = equipped[i];
    let sk = null, isTalent = false;
    if (key && key.startsWith('b')) sk = baseSkills[parseInt(key[1])];
    else if (key && key.startsWith('t')) { sk = talentSkills[parseInt(key.slice(1))]; isTalent = true; }
    const usesAp = sk ? (sk.ap !== undefined) : true;
    const cost   = sk ? (usesAp ? sk.ap : (sk.mp || 0)) : 0;
    return sk ? `
      <div onclick="openSlotPickerForSkill('${key}');${refreshTree}" style="
        flex:1;padding:8px 4px;border:1px solid rgba(200,150,10,${isTalent?'0.55':'0.25'});
        background:rgba(200,150,10,${isTalent?'0.1':'0.04'});cursor:pointer;text-align:center;
        display:flex;flex-direction:column;align-items:center;gap:3px;min-width:0;
      ">
        <div style="font-size:0.5rem;color:rgba(200,150,10,0.45);letter-spacing:2px;">SLOT ${i+1}</div>
        ${sk.iconImg ? `<img src="${sk.iconImg}" style="width:38px;height:38px;object-fit:contain;image-rendering:pixelated;">` : `<div style="font-size:1.2rem;">${sk.icon}</div>`}
        <div style="font-size:0.62rem;color:#c8960a;font-family:'Noto Serif JP',serif;line-height:1.2;word-break:break-word;">${sk.name}</div>
        <div style="font-size:0.52rem;color:rgba(200,150,10,0.4);">${cost}${usesAp?'AP':'MP'}${isTalent?' ✦':''}</div>
        <div style="font-size:0.48rem;color:rgba(200,150,10,0.28);margin-top:1px;">↕ trocar</div>
      </div>` : `
      <div onclick="openSlotPicker(${i});${refreshTree}" style="
        flex:1;padding:8px 4px;border:1px dashed rgba(200,150,10,0.18);
        background:transparent;cursor:pointer;text-align:center;
        display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-width:0;
      ">
        <div style="font-size:0.5rem;color:rgba(200,150,10,0.28);letter-spacing:2px;">SLOT ${i+1}</div>
        <div style="font-size:1.1rem;color:rgba(200,150,10,0.18);">+</div>
        <div style="font-size:0.58rem;color:rgba(200,150,10,0.22);">vazio</div>
      </div>`;
  }).join('');

  // ── Lista de skills disponíveis ──
  let skillListHTML = '';
  baseSkills.forEach((sk, i) => {
    const key  = 'b' + i;
    const slot = equipped.indexOf(key);
    const isEq = slot >= 0;
    const cost = isWarrior ? (sk.ap||0) : (sk.mp||0);
    skillListHTML += `
      <div onclick="openSlotPickerForSkill('${key}');${refreshTree}" style="
        display:flex;align-items:center;gap:10px;padding:9px 12px;
        border:1px solid rgba(200,150,10,${isEq?'0.35':'0.12'});
        background:rgba(200,150,10,${isEq?'0.08':'0.02'});cursor:pointer;
      ">
        <div style="min-width:26px;text-align:center;">${sk.iconImg ? `<img src="${sk.iconImg}" style="width:34px;height:34px;object-fit:contain;image-rendering:pixelated;vertical-align:middle;">` : sk.icon}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:0.7rem;color:#c8960a;font-family:'Noto Serif JP',serif;">
            ${sk.name}
            ${isEq ? `<span style="font-size:0.5rem;background:rgba(200,150,10,0.2);padding:1px 5px;border:1px solid rgba(200,150,10,0.3);margin-left:4px;">SLOT ${slot+1}</span>` : ''}
          </div>
          <div style="font-size:0.58rem;color:rgba(200,150,10,0.42);margin-top:2px;">${sk.desc}</div>
          <div style="font-size:0.56rem;color:rgba(200,150,10,0.32);margin-top:1px;">${cost}${isWarrior?'AP':'MP'}</div>
        </div>
        <div style="font-size:0.95rem;color:rgba(200,150,10,${isEq?'0.7':'0.18'});">${isEq?'●':'○'}</div>
      </div>`;
  });

  if (talentSkills.length > 0) {
    skillListHTML += `<div style="font-size:0.56rem;color:rgba(200,150,10,0.38);letter-spacing:3px;padding:8px 0 4px;">✦ TALENTOS DESBLOQUEADOS</div>`;
    talentSkills.forEach((sk, i) => {
      const key  = 't' + i;
      const slot = equipped.indexOf(key);
      const isEq = slot >= 0;
      const usesAp = sk.ap !== undefined;
      const cost = usesAp ? sk.ap : (sk.mp||0);
      skillListHTML += `
        <div onclick="openSlotPickerForSkill('${key}');${refreshTree}" style="
          display:flex;align-items:center;gap:10px;padding:9px 12px;
          border:1px solid rgba(200,170,80,${isEq?'0.45':'0.22'});
          background:rgba(200,150,10,${isEq?'0.1':'0.04'});cursor:pointer;
        ">
          <div style="min-width:26px;text-align:center;">${sk.iconImg ? `<img src="${sk.iconImg}" style="width:34px;height:34px;object-fit:contain;image-rendering:pixelated;vertical-align:middle;">` : sk.icon}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:0.7rem;color:#c8960a;font-family:'Noto Serif JP',serif;">
              ${sk.name} <span style="font-size:0.48rem;color:rgba(200,170,80,0.55);">✦</span>
              ${isEq ? `<span style="font-size:0.5rem;background:rgba(200,150,10,0.2);padding:1px 5px;border:1px solid rgba(200,150,10,0.3);margin-left:4px;">SLOT ${slot+1}</span>` : ''}
            </div>
            <div style="font-size:0.58rem;color:rgba(200,150,10,0.42);margin-top:2px;">${sk.desc}</div>
            <div style="font-size:0.56rem;color:rgba(200,150,10,0.32);margin-top:1px;">${cost}${usesAp?'AP':'MP'} · talento</div>
          </div>
          <div style="font-size:0.95rem;color:rgba(200,170,80,${isEq?'0.8':'0.2'});">${isEq?'●':'○'}</div>
        </div>`;
    });
  }

  container.innerHTML = `
    <div style="padding:12px 12px 0;">
      <div style="font-size:0.56rem;color:rgba(200,150,10,0.42);letter-spacing:3px;margin-bottom:8px;">⚡ HABILIDADES EM BATALHA</div>
      <div style="display:flex;gap:5px;margin-bottom:6px;">${slotsHTML}</div>
      <div style="display:flex;flex-direction:column;gap:4px;">${skillListHTML}</div>
    </div>
    ${buildLivroReacoesHTML(cls)}
    ${cls && cls.id === 'mago' ? '' : `
    <div style="margin:14px 12px 0;border-top:1px solid rgba(200,150,10,0.15);padding-top:12px;">
      <div style="font-size:0.56rem;color:rgba(200,150,10,0.42);letter-spacing:3px;margin-bottom:8px;">✦ ÁRVORE DE TALENTOS</div>
      <div style="display:flex;gap:10px;margin-bottom:10px;">
        <div style="background:rgba(200,150,10,0.08);border:1px solid rgba(200,150,10,0.2);padding:8px 16px;text-align:center;">
          <div style="font-size:1.25rem;color:#c8960a;font-family:'Noto Serif JP',serif;font-weight:900;">${pt}</div>
          <div style="font-size:0.52rem;color:rgba(200,150,10,0.45);letter-spacing:1px;">PT DISPONÍVEIS</div>
        </div>
        <div style="background:rgba(200,150,10,0.05);border:1px solid rgba(200,150,10,0.15);padding:8px 16px;text-align:center;">
          <div style="font-size:1.25rem;color:#c8960a;font-family:'Noto Serif JP',serif;font-weight:900;">LV ${p.level}</div>
          <div style="font-size:0.52rem;color:rgba(200,150,10,0.45);letter-spacing:1px;">/ ${LEVEL_MAX} MÁX</div>
        </div>
      </div>
      <div style="display:flex;gap:4px;margin-bottom:10px;">
        ${['TIER I · LV 1+','TIER II · LV 7+','TIER III · LV 14+'].map(t=>`
          <div style="flex:1;text-align:center;font-size:0.5rem;color:rgba(200,150,10,0.38);border-bottom:1px solid rgba(200,150,10,0.18);padding-bottom:4px;">${t}</div>
        `).join('')}
      </div>
    </div>
    ${tree.paths.map(path => buildPathUI(path, owned, pt)).join('<div style="height:6px;"></div>')}`}
  `;
}

function buildPathUI(path, owned, ptAvail) {
  const talentsOwned = getPlayerTalents();

  return `
    <div class="tt-path" style="--path-color:${path.color}">
      <div class="tt-path-header">
        <span class="tt-path-icon">${path.icon}</span>
        <div>
          <div class="tt-path-name">${path.name}</div>
          <div class="tt-path-lore">${path.lore}</div>
        </div>
      </div>
      <div class="tt-tiers">
        ${path.tiers.map((tier, ti) => `
          <div class="tt-tier-col">
            ${tier.map(t => buildTalentNodeUI(t, talentsOwned, ptAvail, path)).join('')}
          </div>
        `).join('<div class="tt-tier-arrow">›</div>')}
      </div>
    </div>
  `;
}


// Mapa: talentId (ID real da árvore) → flag do player que indica se tem skill
const TALENT_SKILL_FLAGS = {
  'g_k_2b':  '_talent_shield_bash',   // Guerreiro — Golpe de Escudo
  'p_c_2a':  '_talent_judgment',      // Paladino — Julgamento
  'ar_e_1b': '_talent_trap',          // Arqueiro — Armadilha
  'a_v_2a':  '_talent_toxic_cloud',   // Assassino — Nuvem Tóxica
  'm_f_3a':  '_talent_meteor',        // Mago — Meteoro
  'm_v_3a':  '_talent_singularity',   // Mago — Colapso do Vazio
  'a_p_3a':  '_talent_assassination', // Assassino — Assassinato
  'ar_s_3a': '_talent_perfect_shot',  // Arqueiro — Tiro Perfeito
  'mo_t_3a': '_talent_dragon_fist',   // Monge — Punho do Dragão
  'mo_c_2a': '_talent_barrier',       // Monge — Barreira de Chi
};

function talentHasSkill(talentId) {
  const flag = TALENT_SKILL_FLAGS[talentId];
  return flag && G.player[flag] === true;
}

function getTalentSkillKey(talentId) {
  // Retorna o índice 't0','t1'... correspondente ao talento na lista de getTalentSkills()
  const skills = getTalentSkills();
  // Mapeia talentId → dmg string da skill em getTalentSkills()
  const flagMap = {
    'g_k_2b':  'TALENT_SHIELD_BASH',
    'p_c_2a':  'TALENT_JUDGMENT',
    'ar_e_1b': 'TALENT_TRAP',
    'a_v_2a':  'TALENT_TOXIC_CLOUD',
    'm_f_3a':  'TALENT_METEOR',
    'm_v_3a':  'TALENT_SINGULARITY',
    'a_p_3a':  'TALENT_ASSASSINATION',
    'ar_s_3a': 'TALENT_PERFECT_SHOT',
    'mo_t_3a': 'TALENT_DRAGON_FIST',
    'mo_c_2a': 'TALENT_BARRIER',
  };
  const dmg = flagMap[talentId];
  if (!dmg) return null;
  const idx = skills.findIndex(s => s.dmg === dmg);
  return idx >= 0 ? 't' + idx : null;
}

function buildTalentNodeUI(t, owned, ptAvail, path) {
  const check  = canBuyTalent(t.id);
  const isOwned = owned.includes(t.id);
  const isBlocked = t.exclusive && owned.includes(t.exclusive);
  const cost   = TIER_COST[t.tier] || 1;

  let stateClass = 'talent-locked';
  if (isOwned)   stateClass = 'talent-owned';
  else if (isBlocked) stateClass = 'talent-blocked';
  else if (check.ok)  stateClass = 'talent-available';

  const stateIcon = isOwned ? '✦' : isBlocked ? '✕' : check.ok ? '○' : '◌';

  const hasSkillBadge = isOwned && talentHasSkill(t.id)
    ? '<div style="font-size:0.55rem;color:rgba(200,170,80,0.8);letter-spacing:1px;margin-top:3px;border:1px solid rgba(200,170,80,0.3);padding:1px 4px;">⚡ TOCAR P/ SLOT</div>'
    : '';

  return `
    <div class="talent-node ${stateClass}" onclick="onTalentClick('${t.id}')" title="${t.desc}">
      <div class="talent-node-header">
        <span class="talent-state-icon">${stateIcon}</span>
        <span class="talent-icon">${t.icon}</span>
        <span class="talent-cost">${isOwned ? '✓' : cost + 'PT'}</span>
      </div>
      <div class="talent-name">${t.name}</div>
      <div class="talent-desc">${t.desc}</div>
      ${hasSkillBadge}
      ${t.exclusive ? '<div class="talent-exclusive-badge">EXCLUSIVO</div>' : ''}
    </div>
  `;
}

function onTalentClick(id) {
  const check  = canBuyTalent(id);
  const talent = findTalentById(id);
  if (!talent) return;

  const owned = getPlayerTalents();

  // Se já comprou E tem skill → abre popup de slot
  if (owned.includes(id) && talentHasSkill(id)) {
    const key = getTalentSkillKey(id);
    if (key && typeof openSlotPickerForSkill === 'function') {
      openSlotPickerForSkill(key);
    } else {
      notify(`✦ "${talent.name}" já adquirido. Vá em Habilidades para equipar.`, 'gold');
    }
    return;
  }

  // Se já comprou mas não tem skill (passivo/bônus de stat)
  if (owned.includes(id)) {
    notify(`✦ "${talent.name}" já foi adquirido.`, 'gold');
    return;
  }

  if (!check.ok) {
    notify(`⚠ ${check.reason}`, 'red');
    return;
  }

  showCustomConfirm(
    `Adquirir "${talent.name}"?\n\nCusto: ${check.cost} PT\n\n${talent.desc}`,
    () => {
      if (buyTalent(id)) {
        const tree = getTalentTree();
        if (tree) buildTalentTreeUI(tree);
        // Se o talento tem skill, abre picker automaticamente
        if (talentHasSkill(id)) {
          setTimeout(() => {
            const key = getTalentSkillKey(id);
            if (key && typeof openSlotPickerForSkill === 'function') {
              openSlotPickerForSkill(key);
            }
          }, 300);
        }
      }
    },
    null
  );
}

// ─────────────────────────────────────────────────────────────
//  T6. SKILLS EXTRAS DE TALENTOS (adicionadas ao buildSkillList)
// ─────────────────────────────────────────────────────────────

function getTalentSkills() {
  const p = G.player;
  const skills = [];

  if (p._talent_shield_bash) {
    skills.push({ name:'Golpe de Escudo', icon:'🤜', ap:15, desc:'1.1× DEF como dano + chance de atordoar.', dmg:'TALENT_SHIELD_BASH', isTalent:true });
  }
  if (p._talent_judgment) {
    skills.push({ name:'Julgamento', icon:'⚖️', ap:30, desc:'1.2× ATQ + Maldição por 2 turnos.', dmg:'TALENT_JUDGMENT', isTalent:true });
  }
  if (p._talent_trap) {
    skills.push({ name:'Armadilha', icon:'🪤', ap:20, desc:'Atordoa inimigo por 1 turno.', dmg:'TALENT_TRAP', isTalent:true });
  }
  if (p._talent_toxic_cloud) {
    skills.push({ name:'Nuvem Tóxica', icon:'☁️', ap:25, desc:'Veneno + Sangramento + Lentidão.', dmg:'TALENT_TOXIC_CLOUD', isTalent:true });
  }
  if (p._talent_meteor) {
    skills.push({ name:'Meteoro', icon:'🌋', mp:50, desc:'4× MAG + Queimadura garantida 5t.', dmg:'TALENT_METEOR', isTalent:true });
  }
  if (p._talent_singularity) {
    skills.push({ name:'Colapso do Vazio', icon:'🕳️', mp:45, desc:'Remove buffs + 3× MAG.', dmg:'TALENT_SINGULARITY', isTalent:true });
  }
  if (p._talent_assassination) {
    skills.push({ name:'Assassinato', icon:'🕸️', ap:50, desc:'Se inimigo < 40% HP: 300% ATQ.', dmg:'TALENT_ASSASSINATION', isTalent:true });
  }
  if (p._talent_perfect_shot) {
    skills.push({ name:'Tiro Perfeito', icon:'🌟', ap:45, desc:'3× ATQ, ignora toda DEF.', dmg:'TALENT_PERFECT_SHOT', isTalent:true });
  }
  if (p._talent_dragon_fist) {
    skills.push({ name:'Punho do Dragão', icon:'🐉', mp:40, desc:'4× (ATQ+MAG)/2. Se matar: +30% HP e MP.', dmg:'TALENT_DRAGON_FIST', isTalent:true });
  }
  if (p._talent_barrier) {
    skills.push({ name:'Barreira de Chi', icon:'🔵', mp:25, desc:'Escudo que absorve 30 dano por 2 turnos.', dmg:'TALENT_BARRIER', isTalent:true });
  }

  return skills;
}

// Executa skills de talento (chamado dentro de executeSkill via dmgStr)
function executeTalentSkill(sk, p, e, bs) {
  const dmgStr = sk.dmg;

  if (dmgStr === 'TALENT_SHIELD_BASH') {
    const dmg = Math.max(1, Math.floor(p.def * 1.1 + Math.random() * 4));
    bs.enemyHp -= dmg;
    if (Math.random() < 0.40) { bs.enemyStunned = true; bs.enemyStunTurns = 1; appendBattleLog(`🤜 Golpe de Escudo: -${dmg} HP + Atordoado!`, '#c0c0ff'); }
    else appendBattleLog(`🤜 Golpe de Escudo: -${dmg} HP!`, '#c0c0ff');
    showFloatingNumber('enemy', dmg, 'dmg'); flashDamage('enemy');

  } else if (dmgStr === 'TALENT_JUDGMENT') {
    const dmg = Math.max(1, Math.floor(p.atk * 1.2 - e.def / 3 + Math.random() * 5));
    bs.enemyHp -= dmg;
    bs._enemy_cursed = true; bs._enemy_cursed_turns = 2;
    appendBattleLog(`⚖️ Julgamento: -${dmg} HP + Maldição (inimigo recebe +30% dano)!`, '#c8960a');
    showFloatingNumber('enemy', dmg, 'dmg'); flashDamage('enemy');

  } else if (dmgStr === 'TALENT_TRAP') {
    bs.enemyStunned = true; bs.enemyStunTurns = 1;
    appendBattleLog(`🪤 Armadilha! Inimigo atordoado por 1 turno!`, '#ffee40');
    showFloatingNumber('enemy', '⚡ PRESO', 'status');

  } else if (dmgStr === 'TALENT_TOXIC_CLOUD') {
    bs.enemyPoisoned = true; bs.enemyPoisonTurns = 4;
    bs.enemyBurning = false; // usa sangramento em vez de burn
    bs.playerBleeding = false;
    bs.enemySlowed = true; bs.enemySlowTurns = 3;
    const dmg = Math.max(1, Math.floor(p.atk * 0.5 + Math.random() * 3));
    bs.enemyHp -= dmg;
    appendBattleLog(`☁️ Nuvem Tóxica! ☠ Veneno + ❄ Lentidão + -${dmg} HP!`, '#60c060');
    showFloatingNumber('enemy', '☠+❄', 'status');

  } else if (dmgStr === 'TALENT_METEOR') {
    const dmg = Math.max(1, Math.floor(p.mag * 4 + Math.random() * 10));
    bs.enemyHp -= dmg;
    bs.enemyBurning = true; bs.enemyBurnTurns = 5;
    appendBattleLog(`🌋 METEORO! -${dmg} HP + 🔥 Queimadura garantida por 5 turnos!`, '#ff4020');
    showFloatingNumber('enemy', dmg, 'crit'); flashDamage('enemy');

  } else if (dmgStr === 'TALENT_SINGULARITY') {
    const dmg = Math.max(1, Math.floor(p.mag * 3 + Math.random() * 8));
    bs.enemyHp -= dmg;
    // Remove todos efeitos positivos (enrage) e atordoa
    bs.enemyEnraged = false;
    bs._wolfEnrage = false;
    appendBattleLog(`🕳️ Colapso do Vazio! Buffs removidos! -${dmg} HP!`, '#9040e0');
    showFloatingNumber('enemy', dmg, 'crit'); flashDamage('enemy');

  } else if (dmgStr === 'TALENT_ASSASSINATION') {
    const lowHp = bs.enemyHp / bs.enemyMaxHp < 0.40;
    const mult  = lowHp ? 3.0 : 1.0;
    const dmg   = Math.max(1, Math.floor(p.atk * mult - e.def / 4 + Math.random() * 6));
    bs.enemyHp -= dmg;
    if (lowHp) appendBattleLog(`🕸️ ASSASSINATO! Inimigo fraco! -${dmg} HP (300% ATQ)!`, '#ff4080');
    else appendBattleLog(`🕸️ Assassinato: -${dmg} HP (inimigo acima de 40% HP).`, '#c080ff');
    showFloatingNumber('enemy', dmg, lowHp ? 'crit' : 'dmg'); flashDamage('enemy');

  } else if (dmgStr === 'TALENT_PERFECT_SHOT') {
    const dmg = Math.max(1, Math.floor(p.atk * 3 + Math.random() * 8)); // ignora DEF
    bs.enemyHp -= dmg;
    appendBattleLog(`🌟 TIRO PERFEITO! -${dmg} HP! (Ignora toda DEF!)`, '#ffcc00');
    showFloatingNumber('enemy', dmg, 'crit'); flashDamage('enemy');

  } else if (dmgStr === 'TALENT_DRAGON_FIST') {
    const dmg = Math.max(1, Math.floor((p.atk + p.mag) / 2 * 4 - e.def / 3 + Math.random() * 10));
    bs.enemyHp -= dmg;
    appendBattleLog(`🐉 PUNHO DO DRAGÃO! -${dmg} HP!`, '#e0a030');
    showFloatingNumber('enemy', dmg, 'crit'); flashDamage('enemy');
    // Se matar, processado em endBattle (talento _dragon_fist)

  } else if (dmgStr === 'TALENT_BARRIER') {
    bs._chi_barrier = 30;
    bs._chi_barrier_turns = 2;
    appendBattleLog(`🔵 Barreira de Chi! Absorve até 30 dano por 2 turnos!`, '#4090c0');
    showFloatingNumber('hero', 'ESCUDO 30', 'buff');
  }
}


// ──────────────────────────────────────────────────────────────
//  HELPER: equipa elemento direto do popup (botões SLOT 1/2/3)
// ──────────────────────────────────────────────────────────────
window._magoEquiparSlot = function(skillKey, slotIdx) {
  if (typeof assignSkillToSlot === 'function') {
    assignSkillToSlot(skillKey, slotIdx);
  } else if (typeof window.assignSkillToSlot === 'function') {
    window.assignSkillToSlot(skillKey, slotIdx);
  }
  // Fecha o popup de detalhes após equipar
  const popup = document.getElementById('popup-reacao-el');
  if (popup) popup.remove();
};

// Exporta para escopo global
window.executeTalentSkill      = executeTalentSkill;
window.getTalentSkills         = getTalentSkills;
window.applyTalentOnAttack     = applyTalentOnAttack;
window.applyTalentOnReceiveDamage = applyTalentOnReceiveDamage;
window.applyTalentTurnStart    = applyTalentTurnStart;
window.applyTalentOnDefend     = applyTalentOnDefend;
window.applyTalentOnVictory    = applyTalentOnVictory;
window.openTalentTree             = openTalentTree;
window.switchOverlayTab           = switchOverlayTab;
window.closeTalentTree            = closeTalentTree;
window.onTalentClick              = onTalentClick;
window.buildTalentTreeUI          = buildTalentTreeUI;
window.abrirPopupReacao           = abrirPopupReacao;
window.getTalentTree              = getTalentTree;
window.canBuyTalent               = canBuyTalent;
window.buyTalent                  = buyTalent;
window.getAvailablePT             = getAvailablePT;
window.reapplyAllTalents          = reapplyAllTalents;
window.openSlotPicker             = openSlotPicker;
window.openSlotPickerForSkill     = openSlotPickerForSkill;
window.toggleSkillEquip           = toggleSkillEquip;
