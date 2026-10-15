

// =============================================================================
//  ═══════════════════════════════════════════════════════════════════════
//   DUNGEON DAS SOMBRAS — fundido aqui dentro do palDinh.js a pedido do dev.
//   Antes era um arquivo separado (dungeons/dungeon_sombras.js), carregado
//   depois do palDinh.js no gat-1.html. Agora que está tudo num arquivo só,
//   o <script src="dungeons/dungeon_sombras.js"> foi removido do HTML.
//  ═══════════════════════════════════════════════════════════════════════
// =============================================================================

// ══════════════════════════════════════════════════════════════
//  CHRONICLES OF CLIVOR — game.js
//  Versão 2 — HTML e JS separados, código limpo e organizado
// ══════════════════════════════════════════════════════════════

'use strict';

// ─────────────────────────────────────────────────────────────
//  🧹 LIMPEZA DIRETA DE SAVES ANTIGOS — Brasas fantasma (Inazami)
//  Roda IMEDIATAMENTE ao carregar o script, direto em cima dos 4
//  slots salvos no localStorage — não depende de loadGame() ter
//  sido chamado, nem de qual save está ativo agora. Assim, mesmo
//  que o navegador tivesse servido uma versão em cache antes e o
//  jogador nunca tenha "recarregado de verdade" o save, na próxima
//  vez que ESTE arquivo rodar (já sem cache, por causa do ?v= novo
//  no gat-1.html) os 4 slots são limpos de uma vez, na hora.
//  Idempotente — não faz nada se já não tiver Brasa nenhuma salva.
// ─────────────────────────────────────────────────────────────
(function _limparBrasasFantasmaDosSaves() {
  const BRASAS_FANTASMA = ['brasa_azul', 'brasa_verde', 'brasa_amarela', 'brasa_roxa'];
  try {
    for (let n = 1; n <= 4; n++) {
      const key = 'clivor_save_' + n;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const data = JSON.parse(raw);
      if (!data || !data.player || !Array.isArray(data.player.inventory)) continue;
      const antes = data.player.inventory.length;
      data.player.inventory = data.player.inventory.filter(it => !BRASAS_FANTASMA.includes(it && it.id));
      if (data.player.inventory.length !== antes) {
        localStorage.setItem(key, JSON.stringify(data));
      }
    }
  } catch (e) {
    console.warn('Limpeza de Brasas fantasma falhou (não é crítico):', e);
  }
})();

// ─────────────────────────────────────────────────────────────
//  1. ESTADO GLOBAL DO JOGO (G)
// ─────────────────────────────────────────────────────────────
const SAVE_VERSION = 3; // v3: migrações com versão (core/save_migracoes.js)

let G = {
  saveSlot: 1,
  location: 'floresta',
  dogDefeated: false,
  tierraDefeated: false,
  mapUnlocked: false,
  reputation: 0,
  tutorialSeen: false,
  kaelEventTriggered: false,
  kaelHelped: null,      // true = ajudou, false = ignorou, null = ainda não ocorreu
  kaelFate: null,        // 'ajudado' | 'abandonado'
  timeIndex: 1,            // 0=Amanhecer 1=Manhã 2=Tarde 3=Anoitecer 4=Noite 5=Meia-Noite
  castle: { enemiesKilled: 0 },
  enemiesDefeated: 0,
  inBattle: false,
  player: {
    name: 'Aventureiro',
    class: '',
    classData: null,
    level: 1,
    xp: 0,
    xpNext: 100,
    hp: 100,
    maxHp: 100,
    mp: 50,
    maxMp: 50,
    ap: 0,
    maxAp: 0,
    atk: 10,
    def: 5,
    spd: 5,
    mag: 0,
    gold: 0,
    kills: 0,
    deaths: 0,
    inventory: [],
    equippedWeapon: null,
    equipped: {},
    maxWeight: 50,
    statusEffects: [],
    talents: [],           // IDs de talentos comprados
    talentPtTotal: 0,      // PT acumulados (para exibição)
    battlesTotal: 0,
    equippedSkills: [],   // chaves de skills ativas em batalha: 'b0','b1','b2' (base) ou 't0','t1'... (talento)
  }
};

// ─────────────────────────────────────────────────────────────
//  2. SISTEMA DE ÁUDIO
// ─────────────────────────────────────────────────────────────
const AudioSys = {
  current: null,
  muted: false,
  volume: 0.6,
  sfxVolume: 0.8,
  sfxMuted: false,
  _unlocked: false,
  _pending: null,
  tracks: {},
  // Playlist da floresta/vilarejo: 4 faixas em ordem aleatória
  _florestaTracks: ['flauta', 'bamboo', 'river', 'ascent'],
  _florestaIdx: 0,
  _florestaActive: false,
  // Playlist exclusiva da Dungeon das Sombras: 3 faixas, ordem fixa, sequencial, em loop
  _dungeonTracks: ['gloria', 'sont', 'sullengate'],
  _dungeonIdx: 0,
  _dungeonActive: false,
  // Playlist da Cidade das Pedra (Kurosaki): 2 faixas alternando em loop infinito
  _cidadeTracks: ['cpedras1', 'cpedras2'],
  _cidadeIdx: 0,
  _cidadeActive: false,
  _fadeMs: 1500, // duração do crossfade em ms

  init() {
    this.tracks = {
      intro:    document.getElementById('audio-intro'),
      floresta: document.getElementById('audio-floresta'),
      flauta:   document.getElementById('audio-flauta'),
      bamboo:   document.getElementById('audio-bamboo'),
      river:    document.getElementById('audio-river'),
      ascent:   document.getElementById('audio-ascent'),
      gloria:      document.getElementById('audio-gloria'),
      sont:        document.getElementById('audio-sont'),
      sullengate:  document.getElementById('audio-sullengate'),
      cpedras1:    document.getElementById('audio-cpedras1'),
      cpedras2:    document.getElementById('audio-cpedras2'),
    };
    const savedVol     = localStorage.getItem('clivor_volume');
    const savedMuted   = localStorage.getItem('clivor_muted');
    const savedSfxVol  = localStorage.getItem('clivor_sfx_volume');
    const savedSfxMuted= localStorage.getItem('clivor_sfx_muted');
    if (savedVol    !== null) this.volume    = parseFloat(savedVol) / 100;
    if (savedMuted  !== null) this.muted     = savedMuted === '1';
    if (savedSfxVol !== null) this.sfxVolume = parseFloat(savedSfxVol) / 100;
    if (savedSfxMuted !== null) this.sfxMuted = savedSfxMuted === '1';

    // Embaralhar playlist para variedade
    this._shufflePlaylist();

    // Quando uma faixa da playlist termina, faz crossfade para a próxima
    const self = this;
    this._florestaTracks.forEach(id => {
      const el = document.getElementById('audio-' + id);
      if (el) el.addEventListener('ended', () => {
        if (self._florestaActive) self._nextFlorestaTrack();
      });
    });
    // Dungeon das Sombras: faixas tocam uma após a outra, em loop infinito
    this._dungeonTracks.forEach(id => {
      const el = document.getElementById('audio-' + id);
      if (el) el.addEventListener('ended', () => {
        if (self._dungeonActive) self._nextDungeonTrack();
      });
    });
    // Cidade das Pedra: faixas alternam uma após a outra, em loop infinito
    this._cidadeTracks.forEach(id => {
      const el = document.getElementById('audio-' + id);
      if (el) el.addEventListener('ended', () => {
        if (self._cidadeActive) self._nextCidadeTrack();
      });
    });
  },

  // Embaralha a playlist (Fisher-Yates)
  _shufflePlaylist() {
    const arr = this._florestaTracks;
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  },

  // Crossfade suave entre duas faixas
  _crossfade(outName, inName, cb) {
    // Cancela qualquer crossfade anterior ainda em andamento para evitar
    // faixas sobrepostas tocando ao mesmo tempo (volume "somando" com o tempo)
    if (this._fadeInterval) { clearInterval(this._fadeInterval); this._fadeInterval = null; }
    // Silencia imediatamente qualquer faixa que não seja a que está entrando,
    // garantindo que nunca sobre mais de uma faixa audível de uma vez
    if (inName) {
      Object.entries(this.tracks).forEach(([key, t]) => {
        if (t && key !== inName && key !== outName && !t.paused) {
          t.pause(); t.currentTime = 0; t.volume = 0;
        }
      });
    }

    const outTrack = outName ? this.tracks[outName] : null;
    const inTrack  = inName  ? this.tracks[inName]  : null;
    const steps = 30;
    const interval = this._fadeMs / steps;
    let step = 0;

    if (inTrack) {
      inTrack.volume = 0;
      inTrack.currentTime = 0;
      inTrack.play().catch(() => {});
    }

    this._fadeInterval = setInterval(() => {
      step++;
      const ratio = step / steps;
      // Lê o volume-alvo a cada passo (não só uma vez no início), para que
      // apertar "Mudo" durante uma troca de faixa seja respeitado imediatamente
      const liveTargetVol = this.muted ? 0 : this.volume;
      if (outTrack && outTrack !== inTrack) outTrack.volume = Math.max(0, liveTargetVol * (1 - ratio));
      if (inTrack)  inTrack.volume  = Math.min(liveTargetVol, liveTargetVol * ratio);
      if (step >= steps) {
        clearInterval(this._fadeInterval);
        this._fadeInterval = null;
        if (outTrack && outTrack !== inTrack) { outTrack.pause(); outTrack.currentTime = 0; outTrack.volume = liveTargetVol; }
        if (cb) cb();
      }
    }, interval);
  },

  _nextFlorestaTrack() {
    const oldName = this._florestaTracks[this._florestaIdx];
    this._florestaIdx = (this._florestaIdx + 1) % this._florestaTracks.length;
    // Re-embaralha ao completar um ciclo
    if (this._florestaIdx === 0) this._shufflePlaylist();
    const newName = this._florestaTracks[this._florestaIdx];
    this.current = newName;
    this._crossfade(oldName, newName);
  },

  _startFlorestaPlaylist() {
    this._florestaActive = true;
    this._dungeonActive = false;
    this._cidadeActive = false;
    this._florestaIdx = 0;
    this._shufflePlaylist();
    const name  = this._florestaTracks[0];
    const track = this.tracks[name];
    if (!track) return;
    // Para tudo antes de começar
    Object.values(this.tracks).forEach(t => { if (t) { t.pause(); t.currentTime = 0; } });
    this.current = name;
    track.volume = this.muted ? 0 : this.volume;
    track.play().catch(() => {});
  },

  // Avança sequencialmente para a próxima faixa da Dungeon das Sombras (sem embaralhar, loop infinito)
  _nextDungeonTrack() {
    const oldName = this._dungeonTracks[this._dungeonIdx];
    this._dungeonIdx = (this._dungeonIdx + 1) % this._dungeonTracks.length;
    const newName = this._dungeonTracks[this._dungeonIdx];
    this.current = newName;
    this._crossfade(oldName, newName);
  },

  _startDungeonPlaylist() {
    this._dungeonActive = true;
    this._florestaActive = false;
    this._cidadeActive = false;
    this._dungeonIdx = 0;
    const name  = this._dungeonTracks[0];
    const track = this.tracks[name];
    if (!track) return;
    // Para tudo antes de começar
    Object.values(this.tracks).forEach(t => { if (t) { t.pause(); t.currentTime = 0; } });
    this.current = name;
    track.volume = this.muted ? 0 : this.volume;
    track.play().catch(() => {});
  },

  // Avança para a próxima faixa da Cidade das Pedra (loop infinito)
  _nextCidadeTrack() {
    const oldName = this._cidadeTracks[this._cidadeIdx];
    this._cidadeIdx = (this._cidadeIdx + 1) % this._cidadeTracks.length;
    const newName = this._cidadeTracks[this._cidadeIdx];
    this.current = newName;
    this._crossfade(oldName, newName);
  },

  _startCidadePlaylist() {
    this._cidadeActive = true;
    this._florestaActive = false;
    this._dungeonActive = false;
    this._cidadeIdx = Math.floor(Math.random() * this._cidadeTracks.length);
    const name  = this._cidadeTracks[this._cidadeIdx];
    const track = this.tracks[name];
    if (!track) return;
    Object.values(this.tracks).forEach(t => { if (t) { t.pause(); t.currentTime = 0; } });
    this.current = name;
    track.volume = this.muted ? 0 : this.volume;
    track.play().catch(() => {});
  },

  unlock() {
    if (this._unlocked) return;
    this._unlocked = true;
    if (this._pending) {
      const p = this._pending;
      this._pending = null;
      this.play(p);
    }
  },

  play(name) {
    if (!this._unlocked) { this._pending = name; return; }
    // 'floresta' e 'intro' (vilarejo) disparam a playlist
    if (name === 'floresta' || name === 'intro') {
      if (!this._florestaActive) {
        // Se havia música tocando, faz crossfade para primeira da playlist
        if (this.current && this.tracks[this.current]) {
          this._florestaActive = true;
          this._dungeonActive = false;
          this._cidadeActive = false;
          this._florestaIdx = 0;
          this._shufflePlaylist();
          const newName = this._florestaTracks[0];
          const self = this;
          this._crossfade(this.current, newName, () => { self.current = newName; });
        } else {
          this._startFlorestaPlaylist();
        }
      }
      return;
    }
    // 'dungeonSombras' dispara a playlist exclusiva da Dungeon das Sombras
    if (name === 'dungeonSombras') {
      if (!this._dungeonActive) {
        if (this.current && this.tracks[this.current]) {
          this._dungeonActive = true;
          this._florestaActive = false;
          this._cidadeActive = false;
          this._dungeonIdx = 0;
          const newName = this._dungeonTracks[0];
          const self = this;
          this._crossfade(this.current, newName, () => { self.current = newName; });
        } else {
          this._startDungeonPlaylist();
        }
      }
      return;
    }
    // 'cidadeKurosaki' dispara a playlist da Cidade das Pedra
    if (name === 'cidadeKurosaki') {
      if (!this._cidadeActive) {
        if (this.current && this.tracks[this.current]) {
          this._cidadeActive = true;
          this._florestaActive = false;
          this._dungeonActive = false;
          this._cidadeIdx = Math.floor(Math.random() * this._cidadeTracks.length);
          const newName = this._cidadeTracks[this._cidadeIdx];
          const self = this;
          this._crossfade(this.current, newName, () => { self.current = newName; });
        } else {
          this._startCidadePlaylist();
        }
      }
      return;
    }
    this._florestaActive = false;
    this._dungeonActive = false;
    this._cidadeActive = false;
    this._doPlay(name);
  },

  _doPlay(name) {
    const track = this.tracks[name];
    if (!track || this.current === name) return;
    const oldName = this.current;
    this.current = name;
    this._crossfade(oldName, name);
  },

  stop() {
    this._florestaActive = false;
    this._dungeonActive = false;
    this._cidadeActive = false;
    if (this._fadeInterval) { clearInterval(this._fadeInterval); this._fadeInterval = null; }
    const self = this;
    if (this.current && this.tracks[this.current]) {
      const outTrack = this.tracks[this.current];
      const targetVol = this.volume;
      const steps = 20;
      const interval = 1000 / steps;
      let step = 0;
      this._fadeInterval = setInterval(() => {
        step++;
        outTrack.volume = Math.max(0, targetVol * (1 - step / steps));
        if (step >= steps) {
          clearInterval(this._fadeInterval);
          this._fadeInterval = null;
          outTrack.pause();
          outTrack.currentTime = 0;
          outTrack.volume = targetVol;
          self.current = null;
        }
      }, interval);
    } else {
      this.current = null;
    }
  }
};
// Expõe globalmente — necessário pois "const" no topo do script NÃO vira
// propriedade de window, e vários checks de mudo/volume de SFX usam
// "window.AudioSys" (que sem isso é sempre undefined e nunca funciona).
window.AudioSys = AudioSys;

// Desbloquear áudio na primeira interação
(function () {
  const unlock = () => {
    AudioSys.unlock();
    document.removeEventListener('click', unlock);
    document.removeEventListener('touchstart', unlock);
  };
  document.addEventListener('click', unlock, { once: true });
  document.addEventListener('touchstart', unlock, { once: true });
})();

// ─────────────────────────────────────────────────────────────
//  3. DADOS — CLASSES
//  ⚠ DEFINIDAS EM classes.js — NÃO EDITAR AQUI.
//  palDinh.js lê window.CLASSES, que é exportado por classes.js.
//  Para adicionar/modificar uma classe, edite classes.js.
// ─────────────────────────────────────────────────────────────
// (CLASSES é injetado via window.CLASSES por classes.js,
//  carregado antes deste arquivo no gat-1.html)

// ─────────────────────────────────────────────────────────────
//  4. DADOS — INIMIGOS DA FLORESTA (por nível)
// ─────────────────────────────────────────────────────────────
// Cada inimigo tem: minLevel, maxLevel (intervalo de spawn), tier (1 = normal, 2 = elite)
// img: caminho relativo à pasta Imagens/personagens/
// A partir do FOREST_TIER2_LEVEL, os mobs tier 2 passam a aparecer JUNTO com
// os normais (não substituem) — ver getPoolPorLevel() logo abaixo.
// Nível a partir do qual os mobs "II" (elite) e a Ovelha Encantada passam
// a aparecer na Floresta — junto com os normais, sem substituí-los.
const FOREST_TIER2_LEVEL = 8;

const INIMIGOS_FLORESTA = [
  // ── LEVEL 1 ─────────────────────────────────────
  {
    id: 'rato',
    name: 'Rato das Sombras',
    icon: '🐀',
    img: 'Imagens/personagens/ratin.png',
    elemento: 'sombra',
    hp: 15, atk: 5, def: 1,
    xp: 10, gold: 4,
    minLevel: 1, maxLevel: 99, tier: 1,
    desc: 'Um rato enorme e fétido, corrompido pela névoa do Lich. Seus dentes afiados rasgam com agilidade traiçoeira.',
    loot: [
      { id:'pelo_rato', name:'Pelo Rançoso', icon:'🐾', imgSrc:'Imagens/icones/materiais/Picsart_26-07-06_09-27-43-192.png', chance:0.6, weight:0.1, type:'material' },
      { id:'erva_cura', name:'Erva Medicinal', icon:'🌿', imgSrc:'Imagens/cosméticos/erva.png', chance:0.15, weight:0.2, type:'consumível', desc:'Recupera 15 HP.' },
      { id:'pedra', name:'Pedra', icon:'🪨', imgSrc:'Imagens/pedra.png', chance:0.35, weight:0.3, type:'material', desc:'Material de craft.' },
      { id:'po_cristal', name:'Pó de Cristal', icon:'💎', imgSrc:'Imagens/icones/materiais/poCrista.png', chance:0.28, weight:0.2, type:'material', desc:'Pó mágico de cristal.' },
    ],
  },
  {
    id: 'aranha',
    name: 'Aranha Venenosa',
    icon: '🕷️',
    img: 'Imagens/personagens/aranha.png',
    elemento: 'veneno',
    hp: 22, atk: 7, def: 2,
    xp: 14, gold: 6,
    minLevel: 1, maxLevel: 99, tier: 1,
    desc: 'Aranha negra do tamanho de um gato. Seu veneno causa dormência e visão turva. Tece armadilhas nas sombras.',
    loot: [
      { id:'veneno_aranha', name:'Glândula Venenosa', icon:'☠️', imgSrc:'Imagens/icones/materiais/Glandul.png', chance:0.55, weight:0.1, type:'material' },
      { id:'teia_aranha', name:'Teia', icon:'🕸️', imgSrc:'Imagens/icones/materiais/Picsart_26-06-20_21-22-07-911.png', chance:0.45, weight:0.05, type:'material', desc:'Fio de teia resistente, fiado pela aranha. Material de craft.' },
      { id:'erva_cura', name:'Erva Medicinal', icon:'🌿', imgSrc:'Imagens/cosméticos/erva.png', chance:0.12, weight:0.2, type:'consumível', desc:'Recupera 15 HP.' },
      { id:'pedra', name:'Pedra', icon:'🪨', imgSrc:'Imagens/pedra.png', chance:0.32, weight:0.3, type:'material', desc:'Material de craft.' },
      { id:'po_cristal', name:'Pó de Cristal', icon:'💎', imgSrc:'Imagens/icones/materiais/poCrista.png', chance:0.28, weight:0.2, type:'material', desc:'Pó mágico de cristal.' },
    ],
  },
  {
    id: 'corvo',
    name: 'Corvo das Cinzas',
    icon: '🐦‍⬛',
    img: 'Imagens/personagens/Corvo.png',
    elemento: 'vento',
    hp: 18, atk: 9, def: 2,
    xp: 13, gold: 7,
    minLevel: 1, maxLevel: 99, tier: 1,
    desc: 'Corvo mensageiro do Castelo Maldito. Suas penas escuras cortam como lâminas e seus grasnidos desorientam.',
    loot: [
      { id:'pena_corvo', name:'Pena de Corvo', icon:'🪶', imgSrc:'Imagens/icones/materiais/penC.png', chance:0.7, weight:0.1, type:'material', desc:'Pena negra de um corvo das cinzas.' },
      { id:'erva_cura', name:'Erva Medicinal', icon:'🌿', imgSrc:'Imagens/cosméticos/erva.png', chance:0.10, weight:0.2, type:'consumível', desc:'Recupera 15 HP.' },
      { id:'pedra', name:'Pedra', icon:'🪨', imgSrc:'Imagens/pedra.png', chance:0.25, weight:0.3, type:'material', desc:'Material de craft.' },
      { id:'po_cristal', name:'Pó de Cristal', icon:'💎', imgSrc:'Imagens/icones/materiais/poCrista.png', chance:0.22, weight:0.2, type:'material', desc:'Pó mágico de cristal.' },
    ],
  },
  // ── LEVEL 1–2 ───────────────────────────────────
  {
    id: 'cobra',
    name: 'Serpente das Trevas',
    icon: '🐍',
    img: 'Imagens/personagens/cobra.png',
    elemento: 'veneno',
    hp: 26, atk: 8, def: 3,
    xp: 16, gold: 8,
    minLevel: 1, maxLevel: 99, tier: 1,
    desc: 'Cobra colossal que rasteja silenciosa entre as raízes podres. Um único bote pode ser fatal.',
    loot: [{ id:'pele_cobra', name:'Pele de Cobra', icon:'🐍', imgSrc:'Imagens/icones/materiais/peledeco.png', chance:0.5, weight:0.2, type:'material', desc:'Escamas finas de uma cobra.' }],
  },
  {
    id: 'lobo',
    name: 'Lobo das Sombras',
    icon: '🐺',
    img: 'Imagens/personagens/Lobo.png',
    elemento: 'sombra',
    hp: 30, atk: 10, def: 3,
    xp: 18, gold: 9,
    minLevel: 1, maxLevel: 99, tier: 1,
    desc: 'Lobo corrompido pela névoa do Senhor das Cinzas. Seus olhos brilham com um roxo sinistro e ataca em manadas.',
    loot: [{ id:'pele_lobo', name:'Pele de Lobo', icon:'🐾', imgSrc:'Imagens/icones/materiais/pele_lobo.png', chance:0.5, weight:0.5, type:'material', desc:'Pele de um lobo selvagem.' }],
  },
  {
    id: 'raposa',
    name: 'Raposa das Neblinas',
    icon: '🦊',
    img: 'Imagens/personagens/raposa.png',
    elemento: 'fogo',
    hp: 24, atk: 9, def: 2,
    xp: 15, gold: 7,
    minLevel: 1, maxLevel: 99, tier: 1,
    desc: 'Uma raposa espectral que vaga pela névoa da floresta, ágil e traiçoeira, deixando rastros de fogo-fátuo por onde passa.',
    loot: [
      { id:'calda_raposa', name:'Calda de Raposa', icon:'🦊', imgSrc:'Imagens/icones/materiais/Caldarapos.png', chance:0.55, weight:0.15, type:'material', desc:'Calda macia e quente de uma raposa das neblinas. Material de craft.' },
      { id:'pedra', name:'Pedra', icon:'🪨', imgSrc:'Imagens/pedra.png', chance:0.3, weight:0.3, type:'material', desc:'Material de craft.' },
    ],
  },
  // ── LEVEL 8+ — VARIANTES "II" (elite) ────────────
  // Cada uma usa PNG próprio (arte nova, não reaproveita a versão normal).
  // Até o arquivo ser adicionado na pasta, cai automaticamente no emoji
  // de fallback. Continuam existindo junto com as versões normais.
  {
    id: 'lobo_ii',
    name: 'Lobo das Sombras II',
    icon: '🐺',
    img: 'Imagens/personagens/lobo_ii.png',
    elemento: 'sombra',
    hp: 75, atk: 24, def: 8,
    xp: 45, gold: 22,
    minLevel: 8, maxLevel: 99, tier: 2,
    desc: 'A névoa do Senhor das Cinzas consumiu esse lobo por completo. Maior, mais rápido, e sedento por sangue — não caça mais em manada, ele domina a matilha.',
    loot: [{ id:'pele_lobo', name:'Pele de Lobo', icon:'🐾', imgSrc:'Imagens/icones/materiais/pele_lobo.png', chance:0.65, weight:0.5, type:'material', desc:'Pele de um lobo selvagem.' }],
  },
  {
    id: 'corvo_ii',
    name: 'Corvo das Cinzas II',
    icon: '🐦‍⬛',
    img: 'Imagens/personagens/corvo_ii.png',
    elemento: 'vento',
    hp: 45, atk: 22, def: 7,
    xp: 38, gold: 18,
    minLevel: 8, maxLevel: 99, tier: 2,
    desc: 'Não é mais um simples mensageiro — suas penas viraram lâminas de sombra, e seu grasnido carrega um eco que corta a mente de quem ouve.',
    loot: [
      { id:'pena_corvo', name:'Pena de Corvo', icon:'🪶', imgSrc:'Imagens/icones/materiais/penC.png', chance:0.75, weight:0.1, type:'material', desc:'Pena negra de um corvo das cinzas.' },
      { id:'po_cristal', name:'Pó de Cristal', icon:'💎', imgSrc:'Imagens/icones/materiais/poCrista.png', chance:0.3, weight:0.2, type:'material', desc:'Pó mágico de cristal.' },
    ],
  },
  {
    id: 'aranha_ii',
    name: 'Aranha Venenosa II',
    icon: '🕷️',
    img: 'Imagens/personagens/aranha_ii.png',
    elemento: 'veneno',
    hp: 55, atk: 19, def: 6,
    xp: 36, gold: 16,
    minLevel: 8, maxLevel: 99, tier: 2,
    desc: 'Cresceu no escuro se alimentando da névoa corrompida. Seu veneno agora não só entorpece — apodrece a carne de quem é mordido.',
    loot: [
      { id:'veneno_aranha', name:'Glândula Venenosa', icon:'☠️', imgSrc:'Imagens/icones/materiais/Glandul.png', chance:0.65, weight:0.1, type:'material' },
      { id:'teia_aranha', name:'Teia', icon:'🕸️', imgSrc:'Imagens/icones/materiais/Picsart_26-06-20_21-22-07-911.png', chance:0.5, weight:0.05, type:'material', desc:'Fio de teia resistente, fiado pela aranha. Material de craft.' },
    ],
  },
  // ── LEVEL 8+ — NOVO MOB EXCLUSIVO ────────────────
  // Sem sprite próprio ainda: cai automaticamente no emoji de fallback (🐑)
  // até que Imagens/personagens/ovelha_encantada.png seja adicionado na pasta.
  {
    id: 'ovelha_encantada',
    name: 'Ovelha Encantada',
    icon: '🐑',
    img: 'Imagens/personagens/ovelha_encantada.png',
    elemento: 'luz',
    hp: 60, atk: 16, def: 5,
    xp: 40, gold: 20,
    minLevel: 8, maxLevel: 99, tier: 2,
    desc: 'Uma ovelha de lã que brilha com uma luz suave e enganosa — sob a aparência dócil esconde um encantamento antigo que confunde quem se aproxima.',
    loot: [
      { id:'la_encantada', name:'Lã Encantada', icon:'✨', imgSrc:'Imagens/icones/materiais/la123.png', chance:0.6, weight:0.15, type:'material', desc:'Lã macia que brilha fracamente. Material de craft raro.' },
      { id:'po_cristal', name:'Pó de Cristal', icon:'💎', imgSrc:'Imagens/icones/materiais/poCrista.png', chance:0.3, weight:0.2, type:'material', desc:'Pó mágico de cristal.' },
    ],
  },

];

// ─────────────────────────────────────────────────────────────
//  INIMIGOS DE MÉRITO — desbloqueados por reputação, não por level
//  A partir de "Herói do Vilarejo" (nível de mérito 5): Urso Pardo (chefe),
//  Cobra Verde e Urso Kodiak passam a aparecer na floresta, junto com o
//  pool normal. Bem mais fortes que os mobs "II": mais HP, DEF, ATQ e
//  chance de crítico. Passiva em comum: ignoram 50% da redução de DEF do
//  jogador (ignoraDefPct: 0.5) — batem quase como se você tivesse metade
//  da defesa.
//  A partir de "Lendário" (nível de mérito 6): o Gorila pode aparecer —
//  não faz parte do sorteio normal, é uma checagem à parte de 13% de
//  chance a cada exploração/combate, só disponível nesse nível pra cima.
// ─────────────────────────────────────────────────────────────
const INIMIGOS_FLORESTA_MERITO = [
  {
    id: 'urso_pardo',
    name: 'Urso Pardo',
    icon: '🐻',
    img: 'Imagens/personagens/urso_pardo.png',
    elemento: 'terra',
    hp: 260, atk: 42, def: 18,
    critChance: 0.15, critMult: 1.8,
    xp: 150, gold: 75,
    minLevel: 1, maxLevel: 99, tier: 3, meritoMin: 5,
    isBoss: true,
    ignoraDefPct: 0.5,
    atkNome: 'ataca com uma garrada brutal',
    desc: 'Um urso pardo colossal, músculos à mostra sob o pelo áspero. Reconhecido como um chefe da floresta em nível de mérito alto — poucos aventureiros voltam pra contar o encontro sem cicatrizes.',
    loot: [
      { id:'garra_urso_pardo', name:'Garra de Urso Pardo', icon:'🐾', imgSrc:'Imagens/icones/materiais/garra_urso_pardo.png', chance:0.6, weight:0.6, type:'material', desc:'Garra afiada e pesada, arrancada de um urso pardo. Material de craft raro.' },
    ],
  },
  {
    id: 'cobra_verde',
    name: 'Cobra Verde',
    icon: '🐍',
    img: 'Imagens/personagens/cobra_verde.png',
    elemento: 'veneno',
    hp: 160, atk: 34, def: 13,
    critChance: 0.15, critMult: 1.8,
    xp: 95, gold: 48,
    minLevel: 1, maxLevel: 99, tier: 3, meritoMin: 5,
    ignoraDefPct: 0.5,
    atkNome: 'ataca com presas venenosas',
    desc: 'Serpente de escamas verde-esmeralda, bem maior que qualquer cobra comum da floresta. Seu veneno age rápido demais pra ser ignorado.',
    loot: [
      { id:'peconha_esmeralda', name:'Peçonha Esmeralda', icon:'☠️', imgSrc:'Imagens/icones/materiais/peconha_esmeralda.png', chance:0.55, weight:0.4, type:'material', desc:'Veneno concentrado e denso, extraído da Cobra Verde. Material de craft raro.' },
    ],
  },
  {
    id: 'urso_kodiak',
    name: 'Urso Kodiak',
    icon: '🐻‍❄️',
    img: 'Imagens/personagens/urso_kodiak.png',
    elemento: 'gelo',
    hp: 210, atk: 38, def: 16,
    critChance: 0.15, critMult: 1.8,
    xp: 120, gold: 60,
    minLevel: 1, maxLevel: 99, tier: 3, meritoMin: 5,
    ignoraDefPct: 0.5,
    atkNome: 'ataca com garras congelantes',
    desc: 'Um urso Kodiak imenso, pelagem grossa gelada ao toque. Mais alto e mais pesado que o Urso Pardo, cada golpe carrega o peso de puro gelo e músculo.',
    loot: [
      { id:'garra_urso_kodiak', name:'Garra de Urso Kodiak', icon:'🐾', imgSrc:'Imagens/icones/materiais/garra_urso_kodiak.png', chance:0.55, weight:0.6, type:'material', desc:'Garra maciça de um urso Kodiak. Material de craft raro.' },
      { id:'presa_urso_kodiak', name:'Presa de Urso Kodiak', icon:'🦷', imgSrc:'Imagens/icones/materiais/presa_urso_kodiak.png', chance:0.4, weight:0.4, type:'material', desc:'Um único dente, enorme, arrancado de um urso Kodiak. Material de craft raro.' },
    ],
  },
  // ── Encontro raríssimo — só a partir de Lendário, 13% de chance ──
  {
    id: 'gorila',
    name: 'Gorila',
    icon: '🦍',
    img: 'Imagens/personagens/gorila.png',
    elemento: 'planta',
    hp: 600, atk: 70, def: 78,
    critChance: 0.5, critMult: 1.6,
    xp: 360, gold: 195,
    minLevel: 1, maxLevel: 99, tier: 4, meritoMin: 6,
    isBoss: true,
    ignoraDefPct: 0.5,
    atkNome: 'ataca com um golpe selvagem',
    desc: 'O Rei da Selva em pessoa. Poucos que atingem Lendário chegam sequer a vê-lo — e menos ainda sobrevivem pra contar como foi.',
    loot: [
      { id:'essencia_rei_selva', name:'Essência do Rei da Selva', icon:'✨', imgSrc:'Imagens/icones/materiais/essencia_rei_selva.png', chance:0.05, weight:0.3, type:'material', desc:'Essência pura extraída do lendário Rei da Selva. Material raríssimo.' },
      { id:'presa_gorila', name:'Presa de Gorila', icon:'🦷', imgSrc:'Imagens/icones/materiais/presa_gorila.png', chance:0.45, weight:0.5, type:'material', desc:'Presa afiada arrancada do Rei da Selva. Material de craft raro.' },
      { id:'pegada_gorila', name:'Pegada de Gorila', icon:'🐾', imgSrc:'Imagens/icones/materiais/pegada_gorila.png', chance:0.55, weight:0.4, type:'material', desc:'Molde de uma pegada gigante, endurecido. Material de craft raro.' },
    ],
  },
];

// Retorna pool de inimigos filtrado pelo level atual do jogador
function getPoolPorLevel(level) {
  return INIMIGOS_FLORESTA.filter(e => level >= e.minLevel && level <= e.maxLevel);
}

// Pool normal + inimigos de mérito liberados (Urso Pardo, Cobra Verde,
// Urso Kodiak) — entram junto assim que o jogador atinge o nível de mérito
// exigido (meritoMin). O Gorila NÃO entra aqui: ele é sorteado à parte,
// ver sortearInimigoFloresta().
function getPoolPorLevelEMerito(level) {
  const pool = getPoolPorLevel(level);
  const meritoLvl = (typeof getMeritoLevel === 'function') ? getMeritoLevel().level : 0;
  const extras = INIMIGOS_FLORESTA_MERITO.filter(e => e.id !== 'gorila' && meritoLvl >= e.meritoMin);
  return pool.concat(extras);
}

// Sorteia o inimigo de um encontro na floresta, já considerando mérito.
// Checa primeiro o Gorila (13% de chance, só a partir de Lendário) — se não
// cair nele, sorteia normalmente do pool (normal + mérito).
function sortearInimigoFloresta(level) {
  const meritoLvl = (typeof getMeritoLevel === 'function') ? getMeritoLevel().level : 0;
  if (meritoLvl >= 6 && Math.random() < 0.12) {
    const gorila = INIMIGOS_FLORESTA_MERITO.find(e => e.id === 'gorila');
    if (gorila) return gorila;
  }
  const pool = getPoolPorLevelEMerito(level);
  return pool[Math.floor(Math.random() * pool.length)];
}

// BOSS DO LEVEL 2 — Cão Guardião Ancestral
const CAO_GUARDIAO = {
  id: 'tierra',
  name: 'Tierra — Guardião da Floresta',
  icon: '🐺',
  hp: 110,
  atk: 20,
  def: 10,
  xp: 90,
  gold: 45,
  isBoss: true,
  elemento: 'planta',
  desc: 'Tierra é o guardião eterno da Floresta de Clivor — filho da Mãe Gaia, forjado de raiz, pedra e vento. Não ataca por ódio. Ataca porque você ainda não provou que merece passar.',
  img: 'Imagens/cai2.png',
  // Ficha exibida ~3s antes da luta começar (ver showBossIntro/startBattle).
  // Sem arquivo próprio — usa o mesmo recorte 'idle' do cai1.png (ver
  // spriteImages abaixo e a lógica de fallback em showBossIntro).
  introImg: null,
  // Poses recortadas de UM ÚNICO arquivo (cai1.png, sprite sheet 1040x1040)
  // via background-position em buildEnemyVisual — não precisa separar em
  // arquivos. Cada entrada com {src,x,y,w,h} é uma região daquele arquivo;
  // 'hit' continua sendo um arquivo próprio (cai2.png), por ser uma pose
  // desenhada à parte.
  spriteImages: {
    idle:    { src:'Imagens/cai1.png', x:95,  y:48,  w:313, h:385 },
    prepare: { src:'Imagens/cai1.png', x:587, y:124, w:327, h:302 },
    attack:  { src:'Imagens/cai1.png', x:373, y:691, w:300, h:222 },
    hit:     'Imagens/cai2.png',
  },
  spriteSheetSize: { w:1040, h:1040 },
  // Mordida — mostrada SOBRE O HERÓI (não no próprio Tierra) quando o
  // ataque dele acerta, via showBiteCutin()/flashDamage(). Sprite sheet
  // de 2 frames empilhados na vertical (boca aberta / boca fechada).
  biteAnim: 'Imagens/icones/Caiolu.png',
  // Arte grande e detalhada — a flutuação padrão do inimigo fica estranha
  // nela, então essa fica parada (ver toggle de '.no-float' em bat-enemy-icon).
  noIdleFloat: true,
  loot: [],
};

// ─────────────────────────────────────────────────────────────
//  5. SISTEMA DE TELAS
// ─────────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('screen-' + id);
  if (el) el.classList.add('active');
}

// ─────────────────────────────────────────────────────────────
//  6. INTRO NARRATIVA
// ─────────────────────────────────────────────────────────────
function iniciarIntroNarrativa() {
  AudioSys.play('intro');
  document.getElementById('intro-fase-titulo').style.display = 'none';
  const fase = document.getElementById('intro-fase-narrativa');
  fase.style.display = 'block';

  const imagens = ['Imagens/C1.png','Imagens/c2.png','Imagens/c3.png','Imagens/c3.png'];
  const paragrafos = [
    "Há séculos, o Reino de Clivor prosperava sob a luz e a harmonia das divindades. Mas a ambição humana é uma névoa que cega até os mais sábios. O Rei Valdris, outrora um governante justo, cedeu aos sussurros dos Pergaminhos Proibidos, quebrando os selos ancestrais para alcançar a imortalidade... tornando-se um <span class='destaque-lich'>Lich</span>.",
    "Com a sua queda, o Castelo outrora glorioso transformou-se no Castelo Maldito, uma fortaleza envolta numa <span class='destaque-nevoa'>névoa roxa e perversa</span> que corrompe tudo o que toca. Monstros ergueram-se das sombras e o caos espalhou-se pela terra.",
    "Agora, resta apenas um último bastião de esperança: o Vilarejo da Pedra Branca, protegido pelo <span class='destaque-trindade'>Templo da Divina Trindade</span>. As profecias dizem que uma alma corajosa cruzará a Floresta Eterna para desafiar o lorde das trevas e restaurar o equilíbrio.",
    "A névoa avança... O teu destino começa aqui.",
  ];
  const labels = ['PRÓLOGO', 'CAPÍTULO I', 'CAPÍTULO II', 'CAPÍTULO III'];

  const textoEl  = document.getElementById('texto-narrativo-intro');
  const botoesEl = document.getElementById('container-botoes-intro');
  const numEl    = document.getElementById('intro-cena-num');
  const faixaEl  = document.getElementById('intro-faixa-texto');
  let indice = 0;
  let activeLayer = 'a';

  // Botão SKIP fixo
  const skipBtn = document.createElement('button');
  skipBtn.id = 'btn-skip-narrativa';
  skipBtn.textContent = 'SKIP ›';
  skipBtn.style.cssText = 'position:fixed;top:18px;right:18px;z-index:999;background:rgba(0,0,0,0.55);border:1px solid rgba(200,150,10,0.35);color:rgba(200,150,10,0.7);font-family:\'Noto Serif JP\',serif;font-size:0.7rem;letter-spacing:3px;padding:7px 14px;cursor:pointer;';
  skipBtn.onclick = () => { skipBtn.remove(); mostrarCapaFinal(); };
  fase.appendChild(skipBtn);

  imagens.forEach(src => { const i = new Image(); i.src = src; });

  function mostrarCena() {
    const layerAtual = document.getElementById('intro-layer-' + activeLayer);
    const imgAtual   = document.getElementById('intro-img-' + activeLayer);
    const nextLayer  = activeLayer === 'a' ? 'b' : 'a';
    const layerProx  = document.getElementById('intro-layer-' + nextLayer);
    const imgProx    = document.getElementById('intro-img-' + nextLayer);

    faixaEl.style.opacity = '0';
    botoesEl.innerHTML = '';
    textoEl.innerHTML  = '';

    if (indice === 0) {
      imgAtual.src = imagens[0];
      imgAtual.style.transform = 'scale(1.08)';
      layerAtual.style.opacity = '1';
      requestAnimationFrame(() => requestAnimationFrame(() => { imgAtual.style.transform = 'scale(1)'; }));
      setTimeout(() => mostrarTexto(), 500);
      return;
    }

    imgProx.src = imagens[indice];
    imgProx.style.transform = 'scale(1.08)';
    layerProx.style.opacity = '0';

    setTimeout(() => {
      layerAtual.style.opacity = '0';
      layerProx.style.opacity  = '1';
      requestAnimationFrame(() => requestAnimationFrame(() => { imgProx.style.transform = 'scale(1)'; }));
      activeLayer = nextLayer;
      setTimeout(() => mostrarTexto(), 800);
    }, 100);
  }

  function mostrarTexto() {
    if (numEl) numEl.textContent = labels[indice] || '';
    faixaEl.style.opacity = '1';
    typewriterIntro(textoEl, paragrafos[indice], () => {
      indice++;
      if (indice >= paragrafos.length) {
        setTimeout(() => mostrarCapaFinal(), 900);
      } else {
        botoesEl.innerHTML = `<button class="btn btn-sm" id="btn-prox" style="letter-spacing:3px;font-size:0.8rem;">AVANÇAR &nbsp;›</button>`;
        document.getElementById('btn-prox').onclick = mostrarCena;
      }
    });
  }
  mostrarCena();
}

function typewriterIntro(elemento, texto, callback) {
  elemento.innerHTML = '';
  let i = 0;
  const velMap = { slow: 40, normal: 22, fast: 9 };
  const vel = velMap[(typeof CONFIG !== 'undefined' && CONFIG.textSpeed) || 'normal'] || 22;
  function digitar() {
    if (texto.charAt(i) === '<') {
      const fim = texto.indexOf('>', i);
      if (fim !== -1) i = fim + 1; else i++;
    } else { i++; }
    elemento.innerHTML = texto.substring(0, i);
    if (i < texto.length) { setTimeout(digitar, vel); }
    else if (callback) { callback(); }
  }
  digitar();
}

function primeiroSlotVazio() {
  for (let n = 1; n <= 4; n++) {
    if (!localStorage.getItem('clivor_save_' + n)) return n;
  }
  return 1; // todos ocupados — fallback pro slot 1 (comportamento anterior)
}

function mostrarCapaFinal() {
  const skip = document.getElementById('btn-skip-narrativa');
  if (skip) skip.remove();
  const fase = document.getElementById('intro-fase-narrativa');
  fase.style.transition = 'opacity 1s ease';
  fase.style.opacity = '0';
  setTimeout(() => {
    fase.style.display = 'none';
    fase.style.opacity = '';
    fase.style.transition = '';

    // A narrativa/intro (INICIAR JORNADA e SKIP) é sempre o "primeiro contato" —
    // vai direto pra seleção de classe, nunca pro menu de saves, independente
    // de já existirem saves salvos. Quem quiser carregar um save existente usa
    // o botão "Continuar Save Existente" na tela de capa (pularIntroParaSave()).
    const introEl = document.getElementById('screen-intro');
    if (introEl) introEl.style.visibility = 'hidden';
    G.saveSlot = primeiroSlotVazio();
    goToClassSelection();
  }, 1000);
}

function pularIntroParaSave() {
  // O save-menu é um overlay: esconde a intro sem usar showScreen (que removeria .active)
  // e exibe o overlay por cima
  const introEl = document.getElementById('screen-intro');
  if (introEl) introEl.style.visibility = 'hidden';
  document.getElementById('save-menu').style.display = 'flex';
  buildSaveMenu();
  if (typeof renderCloudPanel === 'function') renderCloudPanel();
}

function abrirSaveMenu() {
  const introEl = document.getElementById('screen-intro');
  if (introEl) introEl.style.visibility = 'hidden';
  document.getElementById('save-menu').style.display = 'flex';
  buildSaveMenu();
  if (typeof renderCloudPanel === 'function') renderCloudPanel();
}

function buildSaveMenu() {
  const grid = document.getElementById('save-slot-grid');
  grid.innerHTML = '';
  for (let n = 1; n <= 4; n++) {
    const raw = localStorage.getItem('clivor_save_' + n);
    const slot = document.createElement('div');
    slot.className = 'save-slot' + (raw ? ' occupied' : '');

    if (raw) {
      const data = JSON.parse(raw);
      const p = data.player;
      const cls = p.classData;
      slot.innerHTML = `
        <div class="save-slot-num">SLOT ${n}</div>
        <div class="save-slot-name">${cls ? (cls.iconImg ? `<img src="${cls.iconImg}" style="width:20px;height:20px;object-fit:contain;vertical-align:middle;" onerror="this.outerHTML='${(cls.icon||'⚔️').replace(/'/g, "\\'")}'"> ` : cls.icon + ' ') + ((p.name && p.name !== 'Aventureiro') ? String(p.name).replace(/[<>&"']/g,'') + ' · ' : '') + cls.name : 'Aventureiro'}</div>
        <div class="save-slot-info">LV ${p.level || 1} · ${p.kills || 0} abates · ${p.gold || 0}◈</div>
        <div class="save-slot-actions">
          <button class="save-load-btn" onclick="event.stopPropagation();selectSaveSlot(${n},true)">▶ Carregar</button>
          <button class="save-del-btn"  onclick="event.stopPropagation();deleteSave(${n})">✕ Apagar</button>
        </div>
      `;
    } else {
      slot.innerHTML = `
        <div class="save-slot-num">SLOT ${n}</div>
        <div class="save-slot-name" style="color:rgba(200,150,10,0.3);">— Vazio —</div>
        <div class="save-slot-info" style="margin-bottom:6px;">Sem dados</div>
        <button class="save-new-btn" onclick="event.stopPropagation();selectSaveSlot(${n},null)">+ Novo Jogo</button>
      `;
    }
    grid.appendChild(slot);
  }
}

function deleteSave(n) {
  showCustomConfirm(
    `Apagar o save do Slot ${n} permanentemente?
Esta ação não pode ser desfeita.`,
    () => {
      localStorage.removeItem('clivor_save_' + n);
      notify('🗑 Save do Slot ' + n + ' apagado.', 'red');
      buildSaveMenu();
    },
    null
  );
}

function fecharSaveMenu() {
  document.getElementById('save-menu').style.display = 'none';
  const introEl = document.getElementById('screen-intro');
  if (introEl) introEl.style.visibility = '';
  showScreen('intro');
}

function selectSaveSlot(n, raw) {
  G.saveSlot = n;
  if (raw) {
    document.getElementById('save-menu').style.display = 'none';
    loadGame(n);
  } else {
    document.getElementById('save-menu').style.display = 'none';
    goToClassSelection();
  }
}

function loadGame(slot) {
  const raw = localStorage.getItem('clivor_save_' + slot);
  if (!raw) { goToClassSelection(); return; }
  const data = JSON.parse(raw);
  Object.assign(G, data);
  G.saveSlot = slot;
  // Migrações COM VERSÃO (core/save_migracoes.js): cada uma roda 1 vez por save.
  if (typeof rodarMigracoesSave === 'function') {
    try { rodarMigracoesSave(G, data._saveVersion); } catch (e) { console.error('[save] migrações:', e); }
  }
  // Migração: saves afetados pelo bug antigo (evento do Kael travado por checagem
  // de nível) podem ter kaelEventTriggered=true sem o evento nunca ter de fato
  // rodado — nesse caso kaelHelped fica null. Reseta pra liberar o encontro.
  if (G.kaelEventTriggered && G.kaelHelped === null) {
    G.kaelEventTriggered = false;
  }
  // Migração: restaura imgSrc de itens antigos salvos sem esse campo
  if (G.player && G.player.inventory) {
    G.player.inventory.forEach(it => {
      if (it.id && ITEM_DB[it.id] && !it.imgSrc && ITEM_DB[it.id].imgSrc) {
        it.imgSrc = ITEM_DB[it.id].imgSrc;
      }
    });
  }
  // Migração: bug do bônus de Crítico das Runas de arma (encantamento).
  // O bônus era salvo em p._enchantCrit, um campo que o motor de batalha
  // (e o Perfil) nunca liam — só p.critBonus é lido de verdade. Resultado:
  // o crítico extra da runa (ex.: Runa SS do Assassino, +38%) nunca surtia
  // efeito nem em combate nem na tela de status. Se o save tiver um
  // _enchantCrit pendente, move o valor pra p.critBonus (campo correto,
  // já somado com armadura/acessório/ascensão de arma) e some com o campo
  // antigo.
  if (G.player && G.player._enchantCrit) {
    G.player.critBonus = (G.player.critBonus || 0) + G.player._enchantCrit / 100;
    delete G.player._enchantCrit;
  }
  // Migração: Runa da Força → Selo da Força. Era um item de arma (tipo 'runa',
  // sem slot) e virou um item de personagem (slot próprio "SELO", isStickyRune,
  // +10% dano bruto). Converte in-place preservando a posição no inventário.
  if (G.player && G.player.inventory) {
    G.player.inventory.forEach(it => {
      if (it.id === 'runa_forca') {
        Object.assign(it, ITEM_DB.selo_forca, { id: 'selo_forca', equipped: false });
      }
    });
  }
  // Refresca a descrição do Selo da Força pra sempre citar a skill de
  // assinatura certa (Golpe Sagrado / Kuroen / Chuva de Flechas / elemento
  // escolhido do Mago) — necessário mesmo em saves antigos que já tinham
  // o item antes dessa skill-alvo existir.
  // ── Migração pra Bolsa de Selos — qualquer item com ITEM_DB[id].isSelo
  // ainda solto no inventário comum (saves anteriores a esse sistema) é
  // movido pra cá. Se estava equipado, vai pros slots de equipar (máx 3);
  // senão, pros slots de guardar (máx 16). Se as duas bolsas já estiverem
  // cheias, o item fica onde está, no inventário comum, como fallback.
  if (!G.player.selosGuardados) G.player.selosGuardados = [];
  if (!G.player.selosEquipados) G.player.selosEquipados = [];
  if (G.player && G.player.inventory) {
    const idxParaRemover = [];
    G.player.inventory.forEach((it, idx) => {
      const base = ITEM_DB[it.id];
      if (!base || !base.isSelo) return;
      const seloMigrado = Object.assign({}, base, it, {
        desc: (it.id === 'selo_forca' && typeof getSeloForcaDescCompleta === 'function') ? getSeloForcaDescCompleta() : (it.desc || base.desc),
        _uid: 'selo_' + Date.now() + '_' + idx + '_' + Math.floor(Math.random() * 100000)
      });
      delete seloMigrado.equipped; // equip agora é a posição no array, não uma flag
      if (it.equipped && G.player.selosEquipados.length < 3) {
        G.player.selosEquipados.push(seloMigrado);
      } else if (G.player.selosGuardados.length < 16) {
        G.player.selosGuardados.push(seloMigrado);
      } else {
        return; // as duas bolsas de selo estão cheias — deixa no inventário comum
      }
      idxParaRemover.push(idx);
    });
    for (let i = idxParaRemover.length - 1; i >= 0; i--) G.player.inventory.splice(idxParaRemover[i], 1);
  }
  // Refresca a desc de selos que JÁ estavam na Bolsa de Selos (ex: save
  // antigo com texto desatualizado do Selo da Força).
  if (typeof getSeloForcaDescCompleta === 'function') {
    [].concat(G.player.selosGuardados, G.player.selosEquipados).forEach(s => {
      if (s.id === 'selo_forca') s.desc = getSeloForcaDescCompleta();
    });
  }
  // Refresca o imgSrc de selos já migrados a partir do ITEM_DB — sem isso,
  // um selo que já passou pela migração acima fica com o caminho de imagem
  // "congelado" no save (o Object.assign de cima dá prioridade ao `it`
  // salvo sobre o `base` do ITEM_DB), então corrigir só o ITEM_DB não
  // conserta quem já tem o selo. Ex.: Runa Yu, que teve o caminho da
  // imagem corrigido depois que alguns saves já haviam migrado o item.
  [].concat(G.player.selosGuardados, G.player.selosEquipados).forEach(s => {
    const base = ITEM_DB[s.id];
    if (base && base.imgSrc && s.imgSrc !== base.imgSrc) s.imgSrc = base.imgSrc;
  });
  // Recupera a Runa Yu perdida pelo bug da cutscene (ver recuperarRunaYu)
  try { if (typeof recuperarRunaYu === 'function') recuperarRunaYu(); } catch (e) {}
  // Migração: Amuleto da Bênção de Yuki foi salvo com um imgSrc quebrado em
  // versões antigas (caminho/nome de arquivo errados) — força a atualização
  // pro caminho correto atual, mesmo que o item já tenha algum imgSrc salvo.
  if (G.player && G.player.inventory && ITEM_DB.amuleto_yuki) {
    G.player.inventory.forEach(it => {
      if (it.id === 'amuleto_yuki') it.imgSrc = ITEM_DB.amuleto_yuki.imgSrc;
      if (it.id === 'pedra_sacerdotisa_negra') it.imgSrc = ITEM_DB.pedra_sacerdotisa_negra.imgSrc;
    });
  }
  // Migração: fragmentos/amuleto de Inazami foram salvos com imgSrc quebrado
  // (pasta "imagens/" minúscula, incompatível com o WebView do Android, que
  // é case-sensitive; e o amuleto completo apontava pro 3mulet.png em vez do
  // 4mulet.png). Força a atualização pro caminho correto atual.
  if (G.player && G.player.inventory) {
    G.player.inventory.forEach(it => {
      if (it.id === 'amuleto_quebrado_inazami') it.imgSrc = 'Imagens/inazami masmorra/1mulet.png';
      if (it.id === 'amuleto_fragmento_eir')    it.imgSrc = 'Imagens/inazami masmorra/2mulet.png';
      if (it.id === 'fragmento_amuleto_final')  it.imgSrc = 'Imagens/inazami masmorra/3mulet.png';
      if (it.id === 'amuleto_completo_inazami') it.imgSrc = 'Imagens/inazami masmorra/4mulet.png';
    });
  }
  // Migração: Prato do Kappa (drop do chefe Kappa) foi salvo com a imagem provisória
  // e SEM equipSlot/stats (o loot só copiava nome/ícone/desc) — não dava pra equipar.
  // Restaura slot e stats a partir do ITEM_DB e usa a arte definitiva do amuleto.
  if (G.player && G.player.inventory && ITEM_DB.prato_kappa) {
    G.player.inventory.forEach(it => {
      if (it.id !== 'prato_kappa') return;
      const b = ITEM_DB.prato_kappa;
      it.imgSrc = b.imgSrc;
      it.type = 'equipamento';
      it.equipSlot = b.equipSlot;
      it.atk = b.atk; it.spd = b.spd; it.crit = b.crit;
      it.desc = b.desc;
    });
  }
  // Migração: Cinza Espiritual (loot dos Onibi das Cinzas, masmorra Inazami)
  // foi renomeada pra Pedra Esper — não era realmente cinza. Converte
  // in-place preservando quantidade e posição no inventário.
  if (G.player && G.player.inventory) {
    G.player.inventory.forEach(it => {
      if (it.id === 'cinza_espiritual') {
        it.id     = 'pedra_esper';
        it.name   = 'Pedra Esper';
        it.imgSrc = 'Imagens/icones/materiais/Fespirutu.png';
      }
    });
  }
  // Migração: Fragmento de Brasa (loot dos Onibi das Cinzas, masmorra
  // Inazami) teve o ícone atualizado — força o caminho novo mesmo em saves
  // antigos que já tinham o item com o imgSrc velho salvo.
  if (G.player && G.player.inventory) {
    G.player.inventory.forEach(it => {
      if (it.id === 'fragmento_brasa') it.imgSrc = 'Imagens/icones/materiais/Brasiuhdh.png';
    });
  }
  // Migração: Brasa Azul/Verde/Amarela/Roxa (loot antigo dos baús do Salão
  // do Trono, masmorra Inazami) foram removidas — não tinham nenhum uso em
  // craft ou evento, ficavam como item fantasma na bolsa. Remove de saves
  // antigos que já tiverem pego alguma.
  if (G.player && G.player.inventory) {
    const _brasasFantasma = ['brasa_azul', 'brasa_verde', 'brasa_amarela', 'brasa_roxa'];
    G.player.inventory = G.player.inventory.filter(it => !_brasasFantasma.includes(it.id));
  }
  // Migração: Chama do Selo (debuff da Masmorra Inazami) ficava presa em
  // G.inazami.chamaTier se o jogador saísse da masmorra sem passar pelo
  // reset (fuga, saída no meio, etc.) — e por ser um badge global, vazava
  // pra batalhas de outras masmorras. Limpa qualquer chama presa em saves
  // antigos assim que carregam.
  if (typeof G !== 'undefined' && G.inazami && G.inazami.chamaTier) {
    G.inazami.chamaTier = 0;
  }
  // Migração: remove cópias duplicadas de itens marcados como "unique" no
  // ITEM_DB (ex.: Amuleto da Bênção de Yuki, Pedra da Sacerdotisa Negra)
  // que possam ter entrado na bolsa em saves afetados pelo bug antigo de
  // duplicação. Mantém uma única cópia — prioriza a que estiver equipada.
  if (G.player && G.player.inventory) {
    const vistos = {};
    const idxParaRemover = [];
    G.player.inventory.forEach((it, idx) => {
      if (!it.id || !ITEM_DB[it.id] || !ITEM_DB[it.id].unique) return;
      if (!vistos[it.id]) {
        vistos[it.id] = idx;
      } else {
        // já existe uma cópia — decide qual fica: a equipada tem prioridade
        const mantidoIdx = vistos[it.id];
        const mantido = G.player.inventory[mantidoIdx];
        if (it.equipped && !mantido.equipped) {
          idxParaRemover.push(mantidoIdx);
          vistos[it.id] = idx;
        } else {
          idxParaRemover.push(idx);
        }
      }
    });
    idxParaRemover.sort((a, b) => b - a).forEach(idx => G.player.inventory.splice(idx, 1));
  }
  // Migração: Amuleto Quebrado de Inazami — bug antigo do addItem() fazia
  // esse item (marcado unique, mas não-equipamento) somar quantidade em vez
  // de ficar travado em 1 cópia. Normaliza saves afetados de volta pra 1.
  if (G.player && G.player.inventory) {
    const amuletoInazami = G.player.inventory.find(i => i.id === 'amuleto_quebrado_inazami');
    if (amuletoInazami && (amuletoInazami.qty || 1) > 1) amuletoInazami.qty = 1;
  }
  // Migração: regra global de item único — limpa cópias duplicadas que já
  // estejam no save (selos repetidos, amuleto/peitoral/Gadanha/Inazami em dobro).
  // Mantém 1 cópia por id (prioridade: a que está com bônus aplicado, depois a equipada).
  try {
    if (G.player && typeof itemEhUnicoGlobal === 'function') {
      let _dup = 0;
      const _vSelo = {};
      const _limpaSelos = arr => (arr || []).filter(s => {
        if (!s || !s.id) return true;
        if (_vSelo[s.id]) { _dup++; return false; }
        _vSelo[s.id] = true; return true;
      });
      G.player.selosEquipados = _limpaSelos(G.player.selosEquipados);   // equipados primeiro = prioridade
      G.player.selosGuardados = _limpaSelos(G.player.selosGuardados);
      const _inv = G.player.inventory || [];
      const _manter = {};
      const _peso = x => (x._accBonusApplied ? 2 : 0) + (x.equipped ? 1 : 0);
      _inv.forEach(it => {
        if (!itemEhUnicoGlobal(it)) return;
        const atual = _manter[it.id];
        if (!atual || _peso(it) > _peso(atual)) _manter[it.id] = it;
      });
      G.player.inventory = _inv.filter(it => {
        if (!itemEhUnicoGlobal(it)) return true;
        if (_manter[it.id] !== it) { _dup++; return false; }
        if ((it.qty || 1) > 1) it.qty = 1;
        return true;
      });
      if (_dup > 0) { try { notify('🧹 Itens únicos duplicados removidos (' + _dup + ').', 'gold'); } catch (e) {} }
    }
  } catch (e) { console.warn('migração item único falhou', e); }
  // Migração: Coração Incandescente mudou de sistema (era buff instantâneo de
  // 3 turnos em slot de armadura; agora é um amuleto de carga 0→100% no slot
  // de acessório). Saves antigos têm o item preso no slot 'armadura', sem os
  // campos novos (chargeable, imgSrcCarregado, etc.) e com o imgSrc antigo.
  // Atualiza tudo pro formato atual, preservando o item — não precisa pegar de novo.
  if (G.player && G.player.inventory && ITEM_DB.coracao_incandescente) {
    const _baseCoracao = ITEM_DB.coracao_incandescente;
    G.player.inventory.forEach(it => {
      if (it.id !== 'coracao_incandescente') return;
      if (it.equipSlot !== 'acessorio') it.equipSlot = 'acessorio';
      it.imgSrc          = _baseCoracao.imgSrc;
      it.imgSrcCarregado = _baseCoracao.imgSrcCarregado;
      it.chargeable         = true;
      it.chargePerTurn      = _baseCoracao.chargePerTurn;
      it.breakChancePerTurn = _baseCoracao.breakChancePerTurn;
      it.repairItemId       = _baseCoracao.repairItemId;
      it.repairQty          = _baseCoracao.repairQty;
      it.buffAtk  = _baseCoracao.buffAtk;
      it.buffCrit = _baseCoracao.buffCrit;
      it.buffHeal = _baseCoracao.buffHeal;
      it.desc     = _baseCoracao.desc;
      delete it.buffTurns;   // campo do sistema antigo, não existe mais
      delete it.battleBuff;  // idem
      if (typeof it._carga === 'undefined')  it._carga = 0;
      if (typeof it._quebrado === 'undefined') it._quebrado = false;
      it._buffApplied = false; // sempre recalculado ao entrar em batalha
    });
    // Se estava equipado como "armadura" e agora ocupa o slot "acessorio",
    // pode haver conflito com outro acessório já equipado — desequipa o
    // Coração se outro acessório também estiver equipado, pra evitar dois
    // itens equipados no mesmo slot.
    const _acessoriosEquipados = G.player.inventory.filter(i => i.equipped && i.equipSlot === 'acessorio');
    if (_acessoriosEquipados.length > 1) {
      const _coracaoDup = _acessoriosEquipados.find(i => i.id === 'coracao_incandescente');
      if (_coracaoDup) {
        _coracaoDup.equipped = false;
        try { notify('🔥 Coração Incandescente foi desequipado — agora ocupa o slot de acessório e havia outro item equipado nele. Reequipe se quiser.', 'gold'); } catch (e) {}
      }
    }
  }
  // Recuperação: Amuleto/Caixa de Tierra perdidos por bug de save. A Caixa
  // de Tierra guardava a função que monta o amuleto direto no item
  // (_boxBuilder), mas JSON.stringify (usado pra salvar) remove funções —
  // então depois de salvar e recarregar, abrir a caixa a apagava da bolsa
  // sem dar nada. Se o Tierra já foi derrotado e o jogador não tem nem o
  // Amuleto nem a Caixa, devolve a Caixa (agora com o fallback por id já
  // corrigido acima, em useInventoryItem).
  if (G.dogDefeated && G.player && G.player.inventory) {
    // Também procura no Armazém do Alberon (G.armazem.itens): se o amuleto
    // estiver guardado lá, ele NÃO está perdido — sem isso o jogo devolvia
    // uma Caixa de Tierra extra e o jogador ficava com dois amuletos.
    const _ehTierra = i => i && (i.id === 'coleira_tierra' || i.id === 'caixa_tierra');
    const _temAmuletoOuCaixaTierra =
      G.player.inventory.some(_ehTierra) ||
      !!(G.armazem && Array.isArray(G.armazem.itens) && G.armazem.itens.some(_ehTierra));
    if (!_temAmuletoOuCaixaTierra) {
      G.player.inventory.push({
        id: 'caixa_tierra', name: 'Caixa de Tierra', icon: '🎁',
        imgSrc: 'Imagens/icones/materiais/BauB.png',
        qty: 1, weight: 0.5, type: 'caixa_recompensa',
        desc: 'Uma caixa entrelaçada de raízes e folhas, deixada por Tierra. Algo dentro dela pulsa suavemente.',
        _boxBuilder: _abrirCaixaTierra,
      });
      try { notify('🌿 Uma Caixa de Tierra esquecida reapareceu na sua bolsa!', 'gold'); } catch (e) {}
      try { addLog('✦ Caixa de Tierra recuperada (bug de save corrigido).', 'xp'); } catch (e) {}
    }
  }
  // Limpeza: Amuleto de Tierra é único. Se o save já tem cópias (bug antigo da
  // caixa dupla), mantém o equipado (ou o primeiro) e remove as extras não
  // equipadas, tanto da bolsa quanto do armazém.
  if (G.player && G.player.inventory) {
    const _tAmus = [];
    G.player.inventory.forEach(it => { if (it && it.id === 'coleira_tierra') _tAmus.push({ lista: G.player.inventory, it }); });
    if (G.armazem && Array.isArray(G.armazem.itens)) {
      G.armazem.itens.forEach(it => { if (it && it.id === 'coleira_tierra') _tAmus.push({ lista: G.armazem.itens, it }); });
    }
    if (_tAmus.length > 1) {
      const _manter = _tAmus.find(x => x.it.equipped) || _tAmus[0];
      let _removidos = 0;
      _tAmus.forEach(x => {
        if (x === _manter || x.it.equipped) return;
        const k = x.lista.indexOf(x.it);
        if (k >= 0) { x.lista.splice(k, 1); _removidos++; }
      });
      if (_removidos) {
        try { notify('🌿 Amuleto de Tierra duplicado removido (' + _removidos + ').', 'gold'); } catch (e) {}
      }
    }
  }
  // Limpeza: equipamentos de masmorra (Prato do Kappa etc.) acumulados por
  // masmorra repetida. Mantém o equipado (ou o primeiro) e remove as extras
  // não equipadas, da bolsa e do armazém.
  if (G.player && G.player.inventory) {
    ['prato_kappa', 'coracao_incandescente', 'amuleto_hik_olho_de_eir', 'amuleto_inoo'].forEach(_id => {
      const _c = [];
      G.player.inventory.forEach(it => { if (it && it.id === _id) _c.push({ lista: G.player.inventory, it }); });
      if (G.armazem && Array.isArray(G.armazem.itens)) {
        G.armazem.itens.forEach(it => { if (it && it.id === _id) _c.push({ lista: G.armazem.itens, it }); });
      }
      if (_c.length > 1) {
        const _keep = _c.find(x => x.it.equipped) || _c[0];
        _c.forEach(x => {
          if (x === _keep || x.it.equipped) return;
          const k = x.lista.indexOf(x.it);
          if (k >= 0) x.lista.splice(k, 1);
        });
      }
      const _k = _c.length ? (_c.find(x => x.it.equipped) || _c[0]).it : null;
      if (_k && (_k.qty || 1) > 1) _k.qty = 1;
    });
  }
  // Migração: Amuleto de Tierra — saves de versões antigas do jogo podem ter
  // esse item sem 'type'/'equipSlot'/'imgSrc' corretos (o item já existia
  // antes desses campos serem padronizados). Sem 'type: equipamento', o item
  // cai silenciosamente na categoria errada da Bolsa (ou some da view
  // agrupada) mesmo continuando equipado e com o bônus aplicado — corrige
  // aqui, preservando os bônus de classe já gravados no item (def/hp/atk/etc).
  if (G.player && G.player.inventory && ITEM_DB.coleira_tierra) {
    const _baseAmuletoTierra = ITEM_DB.coleira_tierra;
    G.player.inventory.forEach(it => {
      if (it.id !== 'coleira_tierra') return;
      if (it.type !== 'equipamento')      it.type = 'equipamento';
      if (it.equipSlot !== 'acessorio')   it.equipSlot = 'acessorio';
      if (!it.imgSrc)                     it.imgSrc = _baseAmuletoTierra.imgSrc;
      if (!it.icon)                       it.icon = _baseAmuletoTierra.icon;
      if (!it.name)                       it.name = _baseAmuletoTierra.name;
      if (!it.desc)                       it.desc = _baseAmuletoTierra.desc;
      if (typeof it.weight === 'undefined') it.weight = _baseAmuletoTierra.weight;
    });
  }
  // Migração: Cinzas de Juramento — saves antigos podem ter esse item
  // gravado com imgSrc:null (de quando a imagem ainda não existia).
  // Corrige o imgSrc gravado no item sem afetar quantidade/demais campos.
  if (G.player && G.player.inventory) {
    G.player.inventory.forEach(it => {
      if (it.id !== 'cinzas_juramento') return;
      if (!it.imgSrc) it.imgSrc = 'Imagens/icones/materiais/cinzas_juramento.png';
    });
  }
  // Migração: Lã Encantada — saves antigos podem ter esse item gravado
  // com imgSrc:null (de quando a imagem ainda não existia) ou com o
  // caminho antigo 'lã123.png' (com acento, gravado por engano antes
  // de confirmar o nome real do arquivo no dispositivo: 'la123.png').
  if (G.player && G.player.inventory) {
    G.player.inventory.forEach(it => {
      if (it.id !== 'la_encantada') return;
      if (!it.imgSrc || it.imgSrc === 'Imagens/icones/materiais/lã123.png') {
        it.imgSrc = 'Imagens/icones/materiais/la123.png';
      }
    });
  }
  // Migração: Máscara do Monge Esquecido — saves antigos podem ter esse
  // item gravado com imgSrc:null (de quando a imagem ainda não existia).
  if (G.player && G.player.inventory) {
    G.player.inventory.forEach(it => {
      if (it.id !== 'mascara_monge_esquecido') return;
      if (!it.imgSrc) it.imgSrc = 'Imagens/icones/materiais/mascara_monge_esquecido.png';
    });
  }
  // Migração: Papel de Selo Antigo, Fragmento de Espírito e Fragmento de
  // Presa Antiga — saves antigos podem ter esses itens gravados com
  // imgSrc:null (de quando as imagens ainda não existiam).
  if (G.player && G.player.inventory) {
    const _flmImgFix = {
      papel_selo_antigo:      'Imagens/icones/materiais/papel_selo_antigo.png',
      fragmento_espirito:     'Imagens/icones/materiais/fragmento_espirito.png',
      fragmento_presa_antiga: 'Imagens/icones/materiais/fragmento_presa_antiga.png',
    };
    G.player.inventory.forEach(it => {
      if (!_flmImgFix[it.id]) return;
      if (!it.imgSrc) it.imgSrc = _flmImgFix[it.id];
    });
  }
  // Migração: Pérola das Nove — saves antigos podem ter esse item
  // gravado com imgSrc:null (de quando a imagem ainda não existia).
  if (G.player && G.player.inventory) {
    G.player.inventory.forEach(it => {
      if (it.id !== 'perola_das_nove') return;
      if (!it.imgSrc) it.imgSrc = 'Imagens/icones/materiais/perola_das_nove.png';
    });
  }
  // FIX genérico: corrige saves antigos que ficaram com 2+ itens marcados
  // equipped=true no mesmo slot (bug do addItem com itens 'unique', ex.:
  // Amuleto de Tierra + Amuleto da Bênção de Yuki). Mantém o primeiro
  // encontrado equipado e desequipa o(s) resto — sem isso, a bolsa mostra
  // "EQUIPADO" em mais de um item do mesmo slot ao mesmo tempo.
  {
    const _porSlot = {};
    (G.player.inventory || []).forEach(it => {
      // amuleto_yuki é um bônus temporário da Dungeon das Sombras, aplicado
      // direto em atk/crit (_accBonusApplied). Desequipá-lo aqui deixaria o
      // +3 ATQ / +7% crit preso no personagem, porque o _dsRevertYukiBuff só
      // subtrai o bônus se o item ainda estiver equipado. Fica fora do ajuste.
      if (it.equipped && it.equipSlot && it.id !== 'amuleto_yuki') {
        (_porSlot[it.equipSlot] = _porSlot[it.equipSlot] || []).push(it);
      }
    });
    Object.keys(_porSlot).forEach(slot => {
      const itens = _porSlot[slot];
      if (itens.length > 1) {
        const referenciado = G.player.equipped && G.player.equipped[slot];
        const manter = itens.find(i => referenciado && i.id === referenciado.id) || itens[0];
        itens.forEach(i => {
          if (i !== manter) {
            i.equipped = false;
            try { notify(`⚠️ ${i.name} estava marcado como equipado junto com outro item do mesmo slot — desequipado automaticamente. Reequipe se quiser.`, 'gold'); } catch (e) {}
          }
        });
      }
    });
  }
  // Migração: Livro da Mana e cristais soltos (marco HuBi Lv5 e marcos
  // de level do jogador Lv8/12/15). Exclusivo da classe Mago. O gancho
  // normal só dispara no exato momento em que HuBi/jogador sobem de
  // nível — quem já passou desses marcos num save antigo nunca ia
  // receber o livro/cristais. Entrega tudo de forma silenciosa (sem
  // repetir a cutscene), com base no que o save já tem hoje.
  // giveLivroMana()/giveCristalMana() já são idempotentes (não
  // duplicam), então é seguro chamar sempre.
  if (G.player && G.hubi) {
    if (G.player.class === 'mago') {
      if ((G.hubi.level || 0) >= 5 && typeof giveLivroMana === 'function') {
        giveLivroMana();
      }
      if (typeof giveCristalMana === 'function') {
        const marcos = (typeof HUBI_CRISTAL_MANA_MARCOS !== 'undefined')
          ? HUBI_CRISTAL_MANA_MARCOS
          : { 8: 2, 12: 3, 15: 4 };
        Object.keys(marcos).forEach(lvl => {
          if ((G.player.level || 0) >= Number(lvl)) giveCristalMana(marcos[lvl]);
        });
      }
    } else {
      // Save antigo de outra classe pode ter recebido o livro/cristais
      // de quando o sistema ainda não era exclusivo do Mago — remove.
      const idsParaRemover = ['livro_mana', 'cristal_mana_lv1', 'cristal_mana_lv2', 'cristal_mana_lv3', 'cristal_mana_lv4'];
      const antes = G.player.inventory.length;
      G.player.inventory = G.player.inventory.filter(i => !idsParaRemover.includes(i.id));
      if (G.player.inventory.length !== antes) {
        try { notify('📘 O Livro da Mana e os cristais foram removidos — esse sistema agora é exclusivo do Mago.', 'gold'); } catch (e) {}
      }
    }
  }
  // Migração: fragmentos do Amuleto de Inazami acumulados por bug de loot
  // (a flag `unique` se perdia ao passar pelo loot padrão de startBattle,
  // então repetir a luta contra a Eir somava qty em vez de travar em 1).
  // Corrige saves antigos: força qty=1 e marca unique=true pra não voltar
  // a acontecer, sem tirar o item de quem já tem.
  if (G.player && G.player.inventory) {
    const _fragmentosUnicos = ['amuleto_quebrado_inazami', 'amuleto_fragmento_eir', 'fragmento_amuleto_final'];
    let _corrigiuFragmento = false;
    G.player.inventory.forEach(i => {
      if (_fragmentosUnicos.includes(i.id) && ((i.qty || 1) > 1 || !i.unique)) {
        i.qty = 1;
        i.unique = true;
        _corrigiuFragmento = true;
      }
    });
    if (_corrigiuFragmento) {
      try { notify('🔥 Fragmentos do Amuleto de Inazami corrigidos (quantidade duplicada por bug).', 'gold'); } catch (e) {}
    }
  }
  // Recriar referência classData
  if (G.player.class) {
    G.player.classData = CLASSES.find(c => c.id === G.player.class) || G.player.classData;
  }
  // Compatibilidade: inicializa equippedSkills se save antigo não tiver
  if (!G.player.equippedSkills || G.player.equippedSkills.length === 0) {
    const cls = G.player.classData;
    G.player.equippedSkills = cls && cls.skills ? cls.skills.slice(0, 3).map((_, i) => 'b' + i) : [];
  }
  // Compatibilidade: mago de save antigo sem elementoEscolhido válido —
  // undefined ou ausente = assume fogo (comportamento do sistema antigo, todos liberados)
  // null = escolha pendente (novo sistema), mantém null
  if (G.player.class === 'mago' && G.player.elementoEscolhido === undefined) {
    G.player.elementoEscolhido = 'fogo';
  }
  // Após definir elementoEscolhido, limpar slots com elementos agora bloqueados
  if (G.player.class === 'mago' && G.player.elementoEscolhido) {
    const cls = G.player.classData;
    if (cls && cls.skills && G.player.equippedSkills) {
      G.player.equippedSkills = G.player.equippedSkills.filter(key => {
        if (!key || !key.startsWith('b')) return true;
        const sk = cls.skills[parseInt(key.slice(1))];
        return sk ? isElementoDesbloqueado(sk) : true;
      });
    }
  }
  // Garante que _pendingElementChoice não fica travado em save carregado
  G.player._pendingElementChoice = false;

  // ── Paladino Lv5: reinjeta skill Julgamento Divino se já foi escolhida ──
  {
    const p = G.player;
    if (p._pal_lv5_chosen === 'julgamento_divino' && p.classData && p.classData.skills) {
      const cls = window.CLASS_PALADINO;
      const sk = cls && cls.skills && cls.skills.find(s => s.key === 'julgamento_divino');
      if (sk && !p.classData.skills.some(s => s.key === 'julgamento_divino')) {
        p.classData.skills.push(sk);
      }
    }
  }

  // ── REAPPLY ACESSÓRIO EQUIPADO ──
  // Saves antigos já tinham o bônus embutido no p.atk/def etc (aplicado uma vez via boss).
  // A partir de agora usamos _accBonusApplied para controlar.
  // Se o save NÃO tem a flag, o bônus já está embutido: apenas marca a flag.
  // Se o save TEM a flag = false, aplica os bônus agora.
  {
    const p = G.player;
    const acc = (p.inventory || []).find(i => i.equipSlot === 'acessorio' && i.equipped);
    if (acc) {
      if (acc._accBonusApplied === false) {
        // Bônus ainda não foi aplicado — aplica agora
        if (acc.atk)  p.atk   = (p.atk  || 0) + acc.atk;
        if (acc.def)  p.def   = (p.def  || 0) + acc.def;
        if (acc.spd)  p.spd   = (p.spd  || 0) + acc.spd;
        if (acc.mag)  p.mag   = (p.mag  || 0) + acc.mag;
        if (acc.crit) p.critBonus = (p.critBonus || 0) + acc.crit / 100;
        if (acc.hp)  { p.maxHp = (p.maxHp || 1) + acc.hp; p.hp = Math.min((p.hp||0) + acc.hp, p.maxHp); }
        if (acc.mp)  { p.maxMp = (p.maxMp || 0) + acc.mp; }
      }
      // Marca que o bônus está aplicado (para próximos loads)
      acc._accBonusApplied = true;
    }
  }

  // Compatibilidade: saves antigos sem rewardXp nas quests
  if (G.questBoard && G.questBoard.quests) {
    G.questBoard.quests.forEach(q => {
      if (q.rewardXp == null) {
        const def = QUEST_DEFS.find(d => d.id === q.defId);
        q.rewardXp = def ? (def.xpReward || 0) : 0;
      }
    });
  }

  // Vigia (core/vigia.js): confere e conserta dados do save recém-carregado
  if (typeof vigiaVerificar === 'function') { try { vigiaVerificar('carga'); } catch (e) {} }

  initGame();
  showScreen('game');
  // Atualiza o pin do Templo conforme estado do save carregado
  setTimeout(() => { if (window.updateTemploPin) updateTemploPin(); }, 200);
}

function manualSave() {
  if (G.inBattle) { notify('⚠ Não é possível salvar durante batalha!', 'red'); return; }
  showSaveIndicator();
  // Vigia: conserta dado quebrado ANTES de gravar no save
  if (typeof vigiaVerificar === 'function') { try { vigiaVerificar('save'); } catch (e) {} }
  try {
    const data = JSON.parse(JSON.stringify(G));
    data._saveVersion = SAVE_VERSION;
    localStorage.setItem('clivor_save_' + G.saveSlot, JSON.stringify(data));
    addLog('💾 Jogo salvo. Slot ' + G.saveSlot, 'info');
  } catch (e) {
    notify('⚠ Falha ao salvar!', 'red');
  }
}

// ─────────────────────────────────────────────────────────────
//  INDICADOR DE SALVAMENTO 3D (3DI/icones/ID4.glb)
//  Pin 3D girando no canto superior direito enquanto o jogo salva
//  (save manual e auto-save). three.js + GLB carregam sob demanda na
//  1ª vez; texturas reduzidas a 512px; ~30fps só enquanto visível.
//  Se o GLB falhar, aparece um 💾 pulsando no lugar.
// ─────────────────────────────────────────────────────────────
const _saveIcon3D = (function () {
  'use strict';
  const GLB = '3DI/icones/ID4.glb';
  const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js';
  const GLTF_URL  = 'https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/loaders/GLTFLoader.js';
  const TEX_MAX = 512;
  // Orientação do pin. O giro é SEMPRE em volta do eixo vertical da tela
  // (esquerda ⇄ direita, como um prato giratório), nunca de cima pra baixo.
  // Se o modelo aparecer deitado/torto, ajuste aqui (em graus):
  //   TILT_X = inclinar pra frente/trás, TILT_Z = deitar pro lado
  const TILT_X = 0, TILT_Z = 0;


  const S = { state: 'idle', r: null, scene: null, cam: null, pivot: null, raf: 0, last: 0, active: false };


  function loadScript(u) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = u; s.onload = res; s.onerror = () => rej(new Error('script ' + u));
      document.head.appendChild(s);
    });
  }
  function lib() {
    return (window.THREE ? Promise.resolve() : loadScript(THREE_URL))
      .then(() => THREE.GLTFLoader ? null : loadScript(GLTF_URL));
  }

  function _el() { return document.getElementById('save-indicator'); }
  function fallback() {
    const el = _el(); if (!el) return;
    S.state = 'failed';
    if (!el.querySelector('.save-fallback')) {
      const d = document.createElement('div');
      d.className = 'save-fallback';
      d.textContent = '💾';
      d.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:26px;animation:save-fb 1.2s linear infinite;';
      el.appendChild(d);
      if (!document.getElementById('save-fb-style')) {
        const st = document.createElement('style'); st.id = 'save-fb-style';
        st.textContent = '@keyframes save-fb{0%,100%{transform:scale(1)}50%{transform:scale(1.2)}}';
        document.head.appendChild(st);
      }
    }
  }

  function shrinkTextures(root) {
    const seen = new Set();
    root.traverse(o => {
      if (!o.isMesh) return;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
        ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap'].forEach(k => {
          const t = m[k]; if (!t || seen.has(t) || !t.image) return;
          seen.add(t);
          const im = t.image, w = im.width || im.videoWidth, h = im.height || im.videoHeight;
          if (!w || !h || Math.max(w, h) <= TEX_MAX) return;
          const k2 = TEX_MAX / Math.max(w, h);
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(w * k2)); c.height = Math.max(1, Math.round(h * k2));
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          if (im.close) try { im.close(); } catch (e) {}
          t.image = c; t.needsUpdate = true;
        });
      });
    });
  }

  function build(gltf) {
    const el = _el(); if (!el) return;
    const canvas = document.createElement('canvas');
    const r = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.setSize(el.clientWidth || 44, el.clientHeight || 60, false);
    r.outputEncoding = THREE.sRGBEncoding;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.95;
    r.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    // Ambiente simples pro metal PBR não ficar escuro
    const envS = new THREE.Scene();
    envS.add(new THREE.Mesh(new THREE.BoxGeometry(12, 12, 12), new THREE.MeshBasicMaterial({ color: 0x2b2233, side: THREE.BackSide })));
    [[0xfff0d0, 9, [4, 5, 4], [3, 3, .2]], [0xc8d8ff, 4, [-5, 2, 3], [2, 4, .2]], [0xffc080, 5, [0, -5, 3], [5, 1, .2]]].forEach(([c, k, p, z]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(z[0], z[1], z[2]), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) }));
      m.position.set(p[0], p[1], p[2]); m.lookAt(0, 0, 0); envS.add(m);
    });
    const pm = new THREE.PMREMGenerator(r);
    scene.environment = pm.fromScene(envS, 0.04).texture;
    pm.dispose();
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dl = new THREE.DirectionalLight(0xfff0d8, 1.0); dl.position.set(2, 3, 4); scene.add(dl);

    const cam = new THREE.PerspectiveCamera(30, (el.clientWidth || 44) / (el.clientHeight || 60), 0.1, 50);
    cam.position.set(0, 0, 4.6);

    const model = gltf.scene;
    shrinkTextures(model);
    // Mantém a orientação original do modelo (em pé); centraliza e escala
    let box = new THREE.Box3().setFromObject(model);
    let sz = box.getSize(new THREE.Vector3());
    const wrap = new THREE.Group(); wrap.add(model);
    wrap.rotation.x = TILT_X * Math.PI / 180;
    wrap.rotation.z = TILT_Z * Math.PI / 180;
    wrap.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(wrap);
    const c = box.getCenter(new THREE.Vector3());
    model.position.sub(c); // centraliza dentro do wrap rotacionado
    wrap.updateMatrixWorld(true);
    const bs = new THREE.Box3().setFromObject(wrap).getBoundingSphere(new THREE.Sphere());
    const pivot = new THREE.Group(); pivot.add(wrap);
    pivot.scale.setScalar(1.15 / (bs.radius || 1));
    scene.add(pivot);

    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
    el.appendChild(canvas);
    Object.assign(S, { r, scene, cam, pivot, state: 'ready' });
    // compila shaders antes de aparecer
    try { r.compile(scene, cam); } catch (e) {}
    if (S.active) loop();
  }

  function loop(t) {
    if (!S.active || S.state !== 'ready') { S.raf = 0; return; }
    S.raf = requestAnimationFrame(loop);
    if (t && t - S.last < 33) return; // ~30fps
    const dt = S.last && t ? (t - S.last) / 1000 : 0.033;
    S.last = t || 0;
    S.pivot.rotation.y += dt * 4.2; // ~1 volta a cada 1,5s
    S.r.render(S.scene, S.cam);
  }

  function ensure() {
    if (S.state !== 'idle') return;
    S.state = 'loading';
    lib().then(() => new Promise((res, rej) => new THREE.GLTFLoader().load(GLB, res, undefined, rej)))
      .then(build)
      .catch(e => { console.warn('[save3d]', e); fallback(); });
  }


  function startSaveSpin() {
    S.active = true;
    ensure();
    if (S.state === 'ready' && !S.raf) loop();
  }
  function stopSaveSpin() {
    S.active = false;
    if (S.raf) { cancelAnimationFrame(S.raf); S.raf = 0; }
  }
  window._saveIconPreload = ensure;
  return { startSaveSpin, stopSaveSpin };
})();
function startSaveSpin() { _saveIcon3D.startSaveSpin(); }
function stopSaveSpin() { _saveIcon3D.stopSaveSpin(); }


let _saveIndicatorTimeout = null;
function showSaveIndicator(durationMs) {
  const el = document.getElementById('save-indicator');
  if (!el) return;
  if (_saveIndicatorTimeout) clearTimeout(_saveIndicatorTimeout);
  el.classList.add('active');
  startSaveSpin();
  _saveIndicatorTimeout = setTimeout(() => {
    el.classList.remove('active');
    stopSaveSpin();
  }, durationMs || 1200);
}

function startAutoSave() {
  if (window._autoSaveInterval) clearInterval(window._autoSaveInterval);
  window._autoSaveInterval = setInterval(() => {
    if (!CONFIG.autoSave) return;
    if (G.inBattle) return;
    showSaveIndicator();
    if (typeof vigiaVerificar === 'function') { try { vigiaVerificar('autosave'); } catch (e) {} }
    try {
      const data = JSON.parse(JSON.stringify(G));
      data._saveVersion = SAVE_VERSION;
      localStorage.setItem('clivor_save_' + G.saveSlot, JSON.stringify(data));
      addLog('💾 Auto-salvo.', 'info');
    } catch (e) {}
  }, 30000);
}

// ─────────────────────────────────────────────────────────────
//  8. SELEÇÃO DE CLASSE
// ─────────────────────────────────────────────────────────────
function goToClassSelection() {
  if (!window._clivorTrocaClasse && G.player) G.player.name = 'Aventureiro';
  showScreen('class');
  buildClassMandala();
}

function selectClass(id) {
  G.selectedClass = id;
}

// ─────────────────────────────────────────────────────────────
//  8-A. MANDALA CARROSSEL — seleção/troca de classe
//  Monta o anel giratório a partir de window.CLASSES (dados reais
//  do jogo) e reaproveita clsIconHtml() pro ícone de cada classe.
// ─────────────────────────────────────────────────────────────
// Planos de fundo por classe (artes feitas sob medida). Caminho relativo
// à raiz do jogo — mesma convenção usada nos outros assets (Imagens/...).
// Pra trocar/adicionar depois, basta editar este mapa (não precisa mexer
// em classes.js).
const MANDALA_BG_OVERRIDE = {
  paladino:  'Imagens/icones/palads2d.png',
  mago:      'Imagens/icones/maf6653.png',
  arqueiro:  'Imagens/icones/aruan4.png',
  assassino: 'Imagens/icones/ass46dj.png',
};
// Arte de personagem (corpo inteiro) mostrada no fundo da tela preta de
// carregamento (#mdl-blackout), logo depois de tocar na classe na mandala.
// Único plano de fundo, a 45% de opacidade (ver CSS #mdl-blackout-bg).
const CLASS_LOADING_BG = {
  paladino:  'Imagens/paladeu.png',
  mago:      'Imagens/maguio.png',
  arqueiro:  'Imagens/aru.png',
  assassino: 'Imagens/assasuy.png',
};
// Pré-carrega as 4 imagens (arquivos pesados, ~3-4MB cada) assim que a tela
// da mandala abre — sem isso, o navegador só ia baixar a imagem NA HORA do
// clique, o que fazia a transição parecer travada/lenta. Roda uma vez só
// (idempotente: Image já em cache não gasta banda de novo).
(function _preloadClassLoadingBg() {
  Object.values(CLASS_LOADING_BG).forEach(src => { const img = new Image(); img.src = src; });
})();
let _mdl = null; // estado do carrossel (recriado toda vez que a tela abre)

function buildClassMandala() {
  const stageEl   = document.getElementById('mdl-stage');
  const ringEl    = document.getElementById('mdl-ring');
  const focusName = document.getElementById('mdl-focus-name');
  const ringInner = document.getElementById('mdl-ring-inner');
  if (!stageEl || !ringEl) return;

  // Reset visual (caso a tela já tenha sido usada antes nesta sessão)
  ['mdl-focus-name','mdl-subheading','mdl-anchor-marker','mdl-ring-outer','mdl-ring-inner','mdl-crest','mdl-ring','mdl-hint']
    .forEach(id => { const n = document.getElementById(id); if (n){ n.style.opacity = ''; n.style.transition=''; } });
  const ghost = document.getElementById('mdl-ghost');
  const ghostLabel = document.getElementById('mdl-ghost-label');
  const blackout = document.getElementById('mdl-blackout');
  const blackoutBg = document.getElementById('mdl-blackout-bg');
  const loadingText = document.getElementById('mdl-loading-text');
  ghost.style.visibility = 'hidden'; ghost.innerHTML = '';
  ghostLabel.style.opacity = '0';
  blackout.style.opacity = '0';
  if (blackoutBg) blackoutBg.style.backgroundImage = '';
  loadingText.style.opacity = '0';
  const bgLayerA = document.getElementById('mdl-bg-a');
  const bgLayerB = document.getElementById('mdl-bg-b');
  [bgLayerA, bgLayerB].forEach(l => { if (l){ l.classList.remove('mdl-bg-visible'); l.style.backgroundImage = ''; } });

  const list = (window.CLASSES || []).slice();
  const N = list.length;
  if (!N) return;
  const STEP = 360 / N;

  const state = { list, N, STEP, ringEl, focusName, ringInner, RADIUS:0, rotation:0, items:[], animating:false, bgActiveLayer:'a', currentBgId:null };
  _mdl = state;

  function baseAngle(i){ return (i / N) * 360 - 90; }

  function buildRing(){
    const min = Math.min(window.innerWidth, window.innerHeight);
    state.RADIUS = Math.min(min * 0.40, 195);
    ringEl.innerHTML = '';
    state.items = list.map((cls, i) => {
      const el = document.createElement('div');
      el.className = 'mdl-portal';
      el.dataset.i = i;
      el.innerHTML = `<div class="mdl-disc">${clsIconHtml(cls, 44)}</div><div class="mdl-portal-label">${cls.name}</div>`;
      ringEl.appendChild(el);
      el.addEventListener('click', () => onPortalClick(i));
      return el;
    });
    applyRotation(state.rotation, false);
  }

  function applyRotation(rot, animate){
    state.items.forEach((el, i) => {
      const ang = baseAngle(i) + rot;
      el.style.transition = animate ? 'transform .38s cubic-bezier(.3,0,.2,1)' : 'none';
      el.style.transform = `rotate(${ang}deg) translate(${state.RADIUS}px) rotate(${-ang}deg)`;
    });
  }

  function currentTopIndex(rot){
    const raw = Math.round(-rot / state.STEP);
    return ((raw % N) + N) % N;
  }

  function hexToRgba(hex, a){
    if (!hex || hex[0] !== '#') return `rgba(232,198,116,${a})`;
    const n = parseInt(hex.slice(1), 16);
    const r = (n>>16)&255, g=(n>>8)&255, b=n&255;
    return `rgba(${r},${g},${b},${a})`;
  }
  function applyAccent(cls){
    const color = cls.color || '#e8c674';
    stageEl.style.setProperty('--mdl-accent', color);
    stageEl.style.setProperty('--mdl-accent-bright', color);
    stageEl.style.setProperty('--mdl-accent-glow', hexToRgba(color, 0.32));
  }

  // Crossfade do plano de fundo pra classe em foco. Caminho padrão:
  // Imagens/classes/<id>.png — ou cls.bgImg pra sobrescrever no classes.js.
  // Se a imagem não existir, some a atual e mantém só o gradiente base
  // (sem quebrar layout nem mostrar ícone de imagem quebrada).
  function applyClassBackground(cls){
    if (state.currentBgId === cls.id) return;
    state.currentBgId = cls.id;
    const showing = state.bgActiveLayer === 'b' ? bgLayerB : bgLayerA;
    const hidden  = state.bgActiveLayer === 'b' ? bgLayerA : bgLayerB;
    const src = cls.bgImg || MANDALA_BG_OVERRIDE[cls.id] || ('Imagens/classes/' + cls.id + '.png');
    const img = new Image();
    img.onload = () => {
      hidden.style.backgroundImage = `url('${src}')`;
      void hidden.offsetWidth; // força reflow pra garantir a transição
      hidden.classList.add('mdl-bg-visible');
      showing.classList.remove('mdl-bg-visible');
      state.bgActiveLayer = (state.bgActiveLayer === 'b') ? 'a' : 'b';
    };
    img.onerror = () => { showing.classList.remove('mdl-bg-visible'); };
    img.src = src;
  }

  function markActive(rot){
    const idx = currentTopIndex(rot);
    state.items.forEach((el,i)=> el.classList.toggle('active', i===idx));
    focusName.textContent = list[idx].name;
    applyAccent(list[idx]);
    applyClassBackground(list[idx]);
    return idx;
  }

  function pulseCrest(){
    ringInner.classList.remove('mdl-pulse');
    void ringInner.offsetWidth;
    ringInner.classList.add('mdl-pulse');
  }

  // ---- arrastar para girar o anel ----
  let dragging = false, startAngle = 0, startRotation = 0, moved = 0;
  const centerXY = () => ({ x: window.innerWidth/2, y: window.innerHeight/2 });
  function angleFromCenter(x, y){
    const c = centerXY();
    return Math.atan2(y - c.y, x - c.x) * (180/Math.PI);
  }

  ringEl.onpointerdown = (e) => {
    dragging = true; moved = 0;
    startAngle = angleFromCenter(e.clientX, e.clientY);
    startRotation = state.rotation;
    ringEl.setPointerCapture(e.pointerId);
  };
  ringEl.onpointermove = (e) => {
    if(!dragging) return;
    const cur = angleFromCenter(e.clientX, e.clientY);
    let delta = cur - startAngle;
    moved = Math.max(moved, Math.abs(delta));
    state.rotation = startRotation + delta;
    applyRotation(state.rotation, false);
    markActive(state.rotation);
  };
  function endDrag(e){
    if(!dragging) return;
    dragging = false;
    const snapped = Math.round(state.rotation / state.STEP) * state.STEP;
    state.rotation = snapped;
    applyRotation(state.rotation, true);
    markActive(state.rotation);
    setTimeout(pulseCrest, 380);
    if(moved < 4 && e && e.target.closest('.mdl-portal')){
      const tappedI = +e.target.closest('.mdl-portal').dataset.i;
      goToIndex(tappedI);
    }
  }
  ringEl.onpointerup = endDrag;
  ringEl.onpointercancel = endDrag;

  function goToIndex(i){
    const need = -i * state.STEP;
    const already = currentTopIndex(state.rotation) === i;
    state.rotation = need;
    applyRotation(state.rotation, true);
    markActive(state.rotation);
    setTimeout(pulseCrest, 380);
    if(already){
      setTimeout(()=> triggerClassSelection(i), 80);
    }
  }

  function onPortalClick(i){
    if(moved >= 4) return; // era arraste, ignora
    if(currentTopIndex(state.rotation) === i){
      triggerClassSelection(i);
    } else {
      goToIndex(i);
    }
  }

  function triggerClassSelection(i){
    if(state.animating) return;
    state.animating = true;
    if (typeof playSfxClassSelect === 'function') playSfxClassSelect();
    const cls = list[i];
    const el = state.items[i];
    const disc = el.querySelector('.mdl-disc');
    const rect = disc.getBoundingClientRect();

    // ── Fundo da tela de loading (#mdl-blackout): arte do personagem da
    // classe escolhida, a 45% de opacidade, um único plano de fundo.
    const blackoutBg = document.getElementById('mdl-blackout-bg');
    if (blackoutBg) {
      const loadingBgSrc = cls.loadingBgImg || CLASS_LOADING_BG[cls.id] || '';
      blackoutBg.style.backgroundImage = loadingBgSrc ? `url('${loadingBgSrc}')` : '';
    }

    ghost.style.visibility = 'visible';
    ghost.style.width  = rect.width + 'px';
    ghost.style.height = rect.height + 'px';
    ghost.style.top    = rect.top + 'px';
    ghost.style.left   = rect.left + 'px';
    ghost.style.borderRadius = '50%';
    ghost.style.transition = 'none';
    ghost.innerHTML = clsIconHtml(cls, 60);

    document.querySelectorAll('#mdl-focus-name,#mdl-subheading,#mdl-anchor-marker,.mdl-ring-deco,#mdl-crest,#mdl-ring,#mdl-hint').forEach(node=>{
      node.style.transition = 'opacity .25s ease';
      node.style.opacity = '0';
    });

    void ghost.offsetWidth;

    const targetSize = Math.max(window.innerWidth, window.innerHeight) * 1.15;
    const targetTop  = (window.innerHeight - targetSize)/2;
    const targetLeft = (window.innerWidth  - targetSize)/2;

    // ── Timings comprimidos: a sequência inteira (ícone crescendo → nome →
    // tela preta → texto de loading → entra no jogo) agora dura ~0.75s no
    // total, em vez de quase 2s. Mantém o mesmo efeito visual, só mais ágil.
    ghost.style.transition = 'width .25s cubic-bezier(.4,0,.2,1), height .25s cubic-bezier(.4,0,.2,1), top .25s cubic-bezier(.4,0,.2,1), left .25s cubic-bezier(.4,0,.2,1), border-radius .25s ease';
    requestAnimationFrame(()=>{
      ghost.style.width  = targetSize + 'px';
      ghost.style.height = targetSize + 'px';
      ghost.style.top    = targetTop + 'px';
      ghost.style.left   = targetLeft + 'px';
      ghost.style.borderRadius = '0%';
    });

    ghostLabel.textContent = cls.name;
    ghostLabel.style.fontSize = 'clamp(20px, 6vw, 34px)';
    ghostLabel.style.top = '50%'; ghostLabel.style.left = '50%';
    ghostLabel.style.transform = 'translate(-50%,-50%)';
    ghostLabel.style.transition = 'opacity .15s ease';
    setTimeout(()=>{ ghostLabel.style.opacity = '1'; }, 80);
    setTimeout(()=>{ ghostLabel.style.opacity = '0'; }, 260);

    setTimeout(()=>{ blackout.style.transition = 'opacity .25s ease'; blackout.style.opacity = '1'; }, 280);
    setTimeout(()=>{ loadingText.style.transition = 'opacity .22s ease'; loadingText.style.opacity = '1'; }, 480);

    // Confirma a classe de verdade e entra no jogo por trás do blackout
    setTimeout(()=>{
      selectClass(cls.id);
      const entrar = () => { confirmClass(); state.animating = false; };
      // Troca de classe mantém o nome; personagem novo passa pela tela de nome.
      const manterNome = window._clivorTrocaClasse && typeof jogadorTemNome === 'function' && jogadorTemNome();
      window._clivorTrocaClasse = false;
      if (manterNome || typeof mostrarTelaNomeJogador !== 'function') { entrar(); return; }
      loadingText.style.opacity = '0';
      mostrarTelaNomeJogador((nome) => {
        G.player.name = nome;
        loadingText.style.transition = 'opacity .22s ease';
        loadingText.style.opacity = '1';
        setTimeout(entrar, 900);
      });
    }, 750);
  }

  state.buildRing = buildRing;
  buildRing();
  markActive(0);
}

// Um único listener global de resize, sempre delegando pro carrossel
// atualmente montado (evita empilhar listeners a cada troca de classe).
window.addEventListener('resize', () => { if (_mdl && _mdl.buildRing) _mdl.buildRing(); });

// Verifica se um elemento mágico do Mago está desbloqueado:
// - Se elementoEscolhido ainda é null: NENHUM elemento está desbloqueado
// - Os 3 iniciais (fogo/agua/eletrico): só o escolhido fica desbloqueado, os outros 2 ficam SEMPRE bloqueados
// - Os demais elementos (gelo, planta, terra...): seguem levelRequired normalmente
const ELEMENTOS_INICIAIS = ['fogo', 'agua', 'eletrico'];
function isElementoDesbloqueado(sk) {
  if (!sk || !sk.elemento) return true;
  const p = G.player;
  const elem = sk.elemento;

  // Ainda não escolheu: nada liberado
  if (!p || p.elementoEscolhido === null) return false;

  // Elemento é um dos 3 iniciais: só libera se for exatamente o escolhido
  if (ELEMENTOS_INICIAIS.includes(elem)) {
    return elem === p.elementoEscolhido;
  }

  // Demais elementos: seguem levelRequired
  const lvReq = sk.levelRequired || 1;
  return ((p && p.level) || 1) >= lvReq;
}

function escolherElementoInicial(elemento) {
  G.player.elementoEscolhido = elemento;
  // Fecha o overlay de escolha (seja o overlay antigo ou o ingame)
  const ov = document.getElementById('escolha-elemento-overlay');
  if (ov) ov.style.display = 'none';
  const ovIn = document.getElementById('escolha-elemento-ingame');
  if (ovIn) ovIn.style.display = 'none';

  // Nomes e ícones dos elementos para a mensagem de confirmação
  const ELEM_NAMES = { fogo:'Fogo 🔥', agua:'Água 💧', eletrico:'Elétrico ⚡' };
  const elemNome = ELEM_NAMES[elemento] || elemento;

  // Mensagem narrativa confirmando a escolha
  setStory('Voz Interior', `Você sente o elemento ${elemNome} ressoar em sua essência. Os outros caminhos aguardam... mas este é o seu ponto de partida.`, [
    { icon: '▶', text: 'Continuar', action: () => storyNode_floresta() }
  ]);

  // Atualiza skill list e ficha
  if (typeof buildSkillList === 'function') buildSkillList();
  if (typeof saveGame === 'function') saveGame();
  addLog('🔮 Elemento inicial escolhido: ' + elemNome + '.', 'info');
  notify('✦ ' + elemNome + ' desbloqueado como seu elemento inicial!', 'gold');
}
window.escolherElementoInicial = escolherElementoInicial;

// ─────────────────────────────────────────────────────────────
//  8-B. ESCOLHA DE ELEMENTO INGAME (Mago)
// ─────────────────────────────────────────────────────────────
function mostrarEscolhaElementoIngame() {
  // Cria o overlay se não existir ainda
  let ov = document.getElementById('escolha-elemento-ingame');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'escolha-elemento-ingame';
    ov.className = 'elem-overlay';
    ov.innerHTML = `
      <div class="elem-panel">
        <span class="elem-corner-bl"></span><span class="elem-corner-br"></span>
        <div class="elem-title"><span class="elem-rule" style="--dir:left;"></span>✦ ESCOLHA SEU ELEMENTO<span class="elem-rule"></span></div>
        <div class="elem-subtitle">Todo Mago começa canalizando um único elemento.<br>Os demais se revelam conforme você evolui.</div>
        <div class="elem-list">
          <button class="elem-btn elem-btn--fogo" onclick="escolherElementoInicial('fogo')">
            <span class="elem-icon"><svg viewBox="0 0 24 24" fill="none"><path d="M12 2c1 3-3 4-3 8a3 3 0 006 0c0-1-1-2-1-3 2 1 4 4 4 7a6 6 0 11-12 0c0-5 3-8 6-12z" fill="currentColor"/></svg></span>
            Fogo
          </button>
          <button class="elem-btn elem-btn--agua" onclick="escolherElementoInicial('agua')">
            <span class="elem-icon"><svg viewBox="0 0 24 24" fill="none"><path d="M12 2C9 7 5 11.5 5 15.5a7 7 0 0014 0C19 11.5 15 7 12 2z" fill="currentColor"/></svg></span>
            Água
          </button>
          <button class="elem-btn elem-btn--eletrico" onclick="escolherElementoInicial('eletrico')">
            <span class="elem-icon"><svg viewBox="0 0 24 24" fill="none"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" fill="currentColor"/></svg></span>
            Elétrico
          </button>
        </div>
      </div>`;
    document.body.appendChild(ov);
  } else {
    ov.style.display = 'flex';
  }
}
window.mostrarEscolhaElementoIngame = mostrarEscolhaElementoIngame;

function confirmClass() {
  if (!G.selectedClass) return;
  const cls = CLASSES.find(c => c.id === G.selectedClass);

  // ── LIMPEZA DE PROGRESSÃO ANTERIOR ──
  // confirmClass() sempre mutou o G.player já existente em vez de criar um
  // objeto novo — ele reescreve os campos "conhecidos" (atk, hp, inventário
  // etc.) mas NUNCA limpava talentos, flags de talento (_talent_*), runas
  // de arma (_weaponEnchant, _enchant*), selos equipados nem os pontos de
  // talento acumulados (talentPtTotal). Resultado: trocar de classe (ou
  // testar uma classe e voltar) deixava tudo isso "grudado" no personagem
  // novo — foi exatamente isso que causou o Mago LV3 aparecer com
  // "Julgamento" (talento do Paladino) e a Runa B (LV9) já ativa.
  // Isso roda tanto pra um personagem 100% novo quanto pra troca de classe
  // (cfgTrocarClasse), então cobre os dois casos.
  Object.keys(G.player || {}).forEach(key => {
    if (key.startsWith('_talent_') || key.startsWith('_enchant')) delete G.player[key];
  });
  G.player.talents        = [];
  G.player.talentLevels   = {};
  G.player.talentPtTotal  = 0;
  G.player.selosEquipados = [];
  G.player.selosGuardados = [];
  G.player._weaponEnchant = null;
  G.player._pal_lv5_chosen = null;

  G.player.classData = cls;
  G.player.class     = cls.id;

  // Aplicar stats base
  G.player.atk    = cls.stats.atk + (cls.startWeapon.atk || 0);
  G.player.def    = cls.stats.def + (cls.startWeapon.def || 0);
  G.player.spd    = cls.stats.spd + (cls.startWeapon.spd || 0);
  G.player.mag    = cls.stats.mag + (cls.startWeapon.mag || 0);
  G.player.maxHp  = cls.stats.hp;
  G.player.hp     = cls.stats.hp;
  G.player.maxMp  = cls.stats.mp;
  G.player.mp     = cls.stats.mp;
  G.player.equippedWeapon = cls.startWeapon;
  G.player.gold   = 10;
  G.player.kills  = 0;
  G.player.level  = 1;
  G.player.xp     = 0;
  G.player.xpNext = 100;

  // AP para classes guerreiras
  const warriorClasses = window.CLASSES.filter(c=>c.resource==='ap').map(c=>c.id);
  if (warriorClasses.includes(cls.id)) {
    G.player.maxAp = cls.maxAp || 100;
    G.player.ap    = cls.maxAp || 100;
  } else {
    G.player.maxAp = 0;
    G.player.ap    = 0;
  }

  // Paladino — começa com AP cheio e bônus de DEF passivo
  if (cls.id === 'paladino') {
    G.player.maxAp = 100; G.player.ap = 100;
  }

  // Inventário inicial
  const wpn = cls.startWeapon;
  G.player.inventory = [
    { id:'arma_'+wpn.id, icon:wpn.icon, imgSrc:wpn.imgSrc||null, name:wpn.name, weight:wpn.weight||2, qty:1, desc:wpn.desc, type:'equipamento', equipSlot:'weapon', atk:wpn.atk||0, def:wpn.def||0, mag:wpn.mag||0, spd:wpn.spd||0, equipped:true },
    { id:'pocao_pequena', icon:'🧪', imgSrc:'Imagens/cosméticos/poção.png', name:'Poção Pequena', weight:0.5, qty:2, desc:'Restaura 25 HP.', heal:25, type:'consumível' },
    { id:'erva_cura', icon:'🌿', imgSrc:'Imagens/cosméticos/erva.png', name:'Erva Medicinal', weight:0.2, qty:1, desc:'Recupera 15 HP.', type:'consumível' },
  ];

  // Mago: começa com 5 Poções de MP Média — única classe que usa MP como recurso principal.
  if (cls.id === 'mago') {
    G.player.inventory.push(
      { id:'pocao_mp_m', icon:'🔷', imgSrc:'Imagens/cosméticos/MP.png', name:'Poção de MP Média', weight:0.4, qty:5, desc:'Restaura 45 MP.', restoreMP:45, type:'consumível' }
    );
  }

  G.player.equipped = { weapon: G.player.inventory[0] };

  // Inicializa com as 3 primeiras skills base — jogador troca por talentos via Ficha
  G.player.equippedSkills = cls.skills.slice(0, 3).map((_, i) => 'b' + i);

  // Mago: marca que ainda não escolheu elemento (escolha acontece ingame após 2s)
  if (cls.id === 'mago') {
    G.player.elementoEscolhido = null;
    G.player._pendingElementChoice = true;
  }

  initGame();
  showScreen('game');
}

// ─────────────────────────────────────────────────────────────
//  9. INICIALIZAÇÃO DO JOGO
// ─────────────────────────────────────────────────────────────
// Retoma o jogo na cena onde o save foi feito, em vez de sempre cair
// na floresta. Cenas de batalha/dungeon não são seguras pra retomar
// direto (falta o contexto da luta), então caem no fallback padrão.
function resumirNaLocalizacaoSalva() {
  const loc = G.location;

  switch (loc) {
    case 'vilarejo':
      if (typeof storyNode_vilarejo === 'function') return storyNode_vilarejo();
      break;
    case 'cidade-pedra':
      // Se já viu a revelação da guerra, é sinal de que já tinha
      // entrado na cidade — retoma direto lá dentro.
      if (G.cidadePedraGuerraRevelada && typeof storyNode_cidade_pedra_entrada === 'function') {
        return storyNode_cidade_pedra_entrada();
      }
      if (typeof storyNode_cidade_pedra === 'function') return storyNode_cidade_pedra();
      break;
    case 'ponte-pedra':
      if (typeof storyNode_ponte_fronteira === 'function') return storyNode_ponte_fronteira();
      break;
    case 'kurogane':
    case 'kurogane-observatorio':
      if (typeof storyNode_travessia_kurogane === 'function') return storyNode_travessia_kurogane();
      break;
    case 'cidade-kurosaki':
      if (typeof storyNode_cidade_kurosaki_entrada === 'function') return storyNode_cidade_kurosaki_entrada();
      break;
  }

  // floresta, floresta2, dungeons, telas de batalha ou cena
  // desconhecida: fallback seguro.
  storyNode_floresta();
}

function initGame() {
  const cls = G.player.classData;
  if (!cls) return;

  const avatarEl = document.getElementById('hud-avatar');
  avatarEl.textContent = '';
  avatarEl.innerHTML = clsIconHtml(cls, 36);
  document.getElementById('hud-class-name').textContent = (typeof jogadorTemNome === 'function' && jogadorTemNome()) ? G.player.name : cls.name;
  const sceneHeroEl = document.getElementById('scene-hero'); if(sceneHeroEl){ sceneHeroEl.textContent=''; sceneHeroEl.innerHTML=clsIconHtml(cls,52); }



  // Música da floresta — exceto se o save está numa cidade com música própria
  // (Cidade das Pedra / Kurosaki): nesse caso o setScene() da retomada já toca
  // a playlist certa, sem começar pela do vilarejo.
  if (G.location !== 'cidade-kurosaki' && G.location !== 'cidade-pedra') {
    AudioSys.play('floresta');
  }

  updateHUD();
  buildInventoryGrid();
  buildSkillList();

  // Retoma na cena salva (floresta, vilarejo, Cidade das Pedra ou
  // Cidade Kurosaki) — cai na floresta se a cena for desconhecida.
  resumirNaLocalizacaoSalva();

  // Mago com escolha de elemento pendente: mostra overlay narrativo após 2s
  if (G.player.class === 'mago' && G.player._pendingElementChoice) {
    G.player._pendingElementChoice = false;
    setTimeout(() => mostrarEscolhaElementoIngame(), 2000);
  }

  // Auto-save a cada 30 segundos
  startAutoSave();

  // Quadro de Quests do Gozen — checa desbloqueio (LV4) e atualização (48h)
  if (window.QuestBoard) QuestBoard.init();
  if (window.Achievements) Achievements.init();
}

// ─────────────────────────────────────────────────────────────
//  10. HUD
// ─────────────────────────────────────────────────────────────
function updateHUD() {
  const p = G.player;
  if (window.Achievements) Achievements.checkThresholds();

  // HP
  const hpPct = Math.max(0, Math.min(100, (p.hp / p.maxHp) * 100));
  document.getElementById('bar-hp').style.width = hpPct + '%';
  document.getElementById('hp-text').textContent = p.hp + '/' + p.maxHp;

  // MP / AP
  const mpBar   = document.getElementById('bar-mp');
  const mpLabel = document.getElementById('mp-label');
  const mpText  = document.getElementById('mp-text');
  const isWarrior = ((p.classData && p.classData.resource === 'ap') || window.CLASSES.filter(c=>c.resource==='ap').map(c=>c.id).includes(p.class));

  if (isWarrior) {
    mpLabel.textContent = 'AP';
    const apPct = Math.max(0, Math.min(100, ((p.ap || 0) / (p.maxAp || 100)) * 100));
    mpBar.style.width = apPct + '%';
    mpBar.style.background = 'linear-gradient(90deg,#804010,#e09030)';
    mpText.textContent = (p.ap || 0) + '/' + (p.maxAp || 100);
  } else {
    mpLabel.textContent = 'MP';
    const mpPct = Math.max(0, Math.min(100, (p.mp / p.maxMp) * 100));
    mpBar.style.width = mpPct + '%';
    mpBar.style.background = 'linear-gradient(90deg,#1a2744,#3a6888)';
    mpText.textContent = p.mp + '/' + p.maxMp;
  }

  // ── Fervor Selvagem (Arqueiro) ──
  if (typeof updateFervorHUD === 'function') updateFervorHUD(p);

  document.getElementById('hud-gold').textContent = p.gold;
  document.getElementById('hud-level-text').textContent = `LV ${p.level} · EXP ${p.xp}/${p.xpNext}`;

  // Mérito do Vilarejo
  const repIcon  = document.getElementById('hud-rep-icon');
  const repLabel = document.getElementById('hud-rep-label');
  if (repIcon && repLabel && typeof getRepTier === 'function') {
    const tier = getRepTier();
    repIcon.textContent = tier.icon;
    repLabel.textContent = tier.label;
    repLabel.style.color = tier.color;
  }

  // Sidebar stats
  const sb = document.getElementById('sidebar-stats');
  if (sb) {
    sb.innerHTML = `
      ATQ: ${p.atk} &nbsp;|&nbsp; DEF: ${p.def}<br>
      VEL: ${p.spd} &nbsp;|&nbsp; MAG: ${p.mag}<br>
      Mortos: ${p.kills} &nbsp;|&nbsp; Mortes: ${p.deaths}
    `;
  }
}

// ─────────────────────────────────────────────────────────────
//  11. INVENTÁRIO
// ─────────────────────────────────────────────────────────────
function buildInventoryGrid() {
  if (typeof garantirUmEquipadoPorSlot === 'function') garantirUmEquipadoPorSlot();
  const grid = document.getElementById('inventory-grid');
  if (!grid) return;
  grid.innerHTML = '';
  G.player.inventory.forEach((item, i) => {
    const slot = document.createElement('div');
    slot.className = 'inv-slot';
    slot.title = item.name;
    const iconHtml = item.imgSrc
      ? `<img src="${_getItemIconSrc(item)}" style="width:22px;height:22px;object-fit:contain;mix-blend-mode:screen;display:block;">`
      : (item.icon || '📦');
    slot.innerHTML = `${iconHtml}${item.qty > 1 ? `<span class="qty">${item.qty}</span>` : ''}`;
    slot.onclick = () => {
      // Bolsa Aitemu: tocar abre o armazém (só retirar) em vez do popup de detalhes
      if (item.abreArmazem && typeof armazemUsarBolsa === 'function') return armazemUsarBolsa();
      showItemPopup(i, item);
    };
    grid.appendChild(slot);
  });
}

// ─────────────────────────────────────────────────────────────
//  SET "FLORESTA DE TIERRA" — Amuleto de Tierra + Peitoral da
//  Floresta de Clivor, equipados ao mesmo tempo, ativam
//  "Proficiência da Floresta": reduz o custo de AP/MP das
//  habilidades. Chamada sempre que um acessório ou armadura é
//  equipado/desequipado (idempotente — recalcula do zero).
// ─────────────────────────────────────────────────────────────
const TIERRA_SET_REDUCE = 0.15; // -15% de custo de AP/MP em skills
function _updateTierraSetBonus(p) {
  if (!p || !p.inventory) return;
  const temAmuleto  = p.inventory.some(i => i.id === 'coleira_tierra'    && i.equipped);
  const temPeitoral = p.inventory.some(i => i.id === 'peitoral_floresta' && i.equipped);
  const ativoAntes  = !!p._tierraSetAtivo;
  const ativoAgora  = temAmuleto && temPeitoral;

  p._tierraSetAtivo         = ativoAgora;
  p._setProficienciaReduce  = ativoAgora ? TIERRA_SET_REDUCE : 0;

  if (ativoAgora && !ativoAntes) {
    if (typeof notify === 'function') notify('🌳 Conjunto da Floresta ativo — Proficiência: -15% de custo de AP/MP nas habilidades!', 'gold');
    if (typeof addLog === 'function') addLog('✦ Amuleto de Tierra + Peitoral da Floresta: Proficiência da Floresta ativada (-15% custo de skills).', 'xp');
  } else if (!ativoAgora && ativoAntes) {
    if (typeof notify === 'function') notify('🌳 Conjunto da Floresta desfeito — Proficiência da Floresta desativada.', 'gold');
  }
}
window._updateTierraSetBonus = _updateTierraSetBonus;

// ─────────────────────────────────────────────────────────────
//  BÔNUS DE CONJUNTO — "Guarda do Lorde": Coração Incandescente +
//  Peitoral do Lorde das Sombras. Reduz bastante a chance do
//  Coração quebrar por turno (não mexe no item.breakChancePerTurn
//  base, que é sempre restaurado pela migração de save — o desconto
//  é aplicado dinamicamente no momento da rolagem, ver tickPlayerStatusEffects).
//  Chamada sempre que um acessório ou armadura é equipado/desequipado.
// ─────────────────────────────────────────────────────────────
const CORACAO_SET_BREAK_REDUCE = 2.5; // pontos percentuais a menos (ex: 4% -> 1.5%)
function _updateCoracaoSetBonus(p) {
  if (!p || !p.inventory) return;
  const temAmuleto  = p.inventory.some(i => i.id === 'coracao_incandescente'   && i.equipped);
  const temPeitoral = p.inventory.some(i => i.id === 'peitoral_lorde_sombras'  && i.equipped);
  const ativoAntes  = !!p._setCoracaoAtivo;
  const ativoAgora  = temAmuleto && temPeitoral;

  p._setCoracaoAtivo        = ativoAgora;
  p._setCoracaoBreakReduce  = ativoAgora ? CORACAO_SET_BREAK_REDUCE : 0;

  if (ativoAgora && !ativoAntes) {
    if (typeof notify === 'function') notify('🖤 Conjunto do Lorde das Sombras ativo — Guarda do Lorde: chance do Coração quebrar muito reduzida!', 'gold');
    if (typeof addLog === 'function') addLog('✦ Coração Incandescente + Peitoral do Lorde das Sombras: Guarda do Lorde ativada (chance de quebra reduzida).', 'xp');
  } else if (!ativoAgora && ativoAntes) {
    if (typeof notify === 'function') notify('🖤 Conjunto do Lorde das Sombras desfeito — Guarda do Lorde desativada.', 'gold');
  }
}
window._updateCoracaoSetBonus = _updateCoracaoSetBonus;

// Conteúdo da Caixa de Tierra: aplica o bônus permanente por classe, adiciona
// o Amuleto de Tierra à bolsa (já equipado) e revela o popup do item.
function _temTierraAmuletoOuCaixa() {
  const _ehTierra = i => i && (i.id === 'coleira_tierra' || i.id === 'caixa_tierra');
  return !!(
    (G.player && G.player.inventory && G.player.inventory.some(_ehTierra)) ||
    (G.armazem && Array.isArray(G.armazem.itens) && G.armazem.itens.some(_ehTierra))
  );
}
window._temTierraAmuletoOuCaixa = _temTierraAmuletoOuCaixa;

function _abrirCaixaTierra() {
  // Amuleto de Tierra é único: se já existe (bolsa ou armazém), não entrega outro
  // nem aplica o bônus permanente de novo.
  const _jaTemAmu = i => i && i.id === 'coleira_tierra';
  if ((G.player.inventory || []).some(_jaTemAmu) ||
      (G.armazem && Array.isArray(G.armazem.itens) && G.armazem.itens.some(_jaTemAmu))) {
    notify('🌿 Você já possui o Amuleto de Tierra — a caixa estava vazia.', 'gold');
    return;
  }
  const classId = (G.player.classData && G.player.classData.id) || '';
  let buffMsg = '';
  let logMsg  = '';

  // Só há UM slot de acessório. Se já existe outro acessório equipado, o Amuleto de Tierra
  // entra na bolsa DESEQUIPADO e SEM aplicar o bônus agora (o bônus é aplicado quando o
  // jogador equipar, pelo fluxo normal de useInventoryItem — que também troca o acessório).
  const _acessorioEquipado = (G.player.inventory || []).find(
    i => i && i.equipped && (i.equipSlot === 'acessorio' || i.type === 'acessorio')
  );
  const _equiparAgora = !_acessorioEquipado;

  if (!_equiparAgora) {
    // sem bônus direto: só prepara as mensagens
    buffMsg = `🌿 Você já tem ${_acessorioEquipado.name} equipado — o Amuleto de Tierra foi para a bolsa. Equipe-o quando quiser.`;
    logMsg  = '✦ Amuleto de Tierra recebido (não equipado: já havia um acessório equipado)';
  } else if (classId === 'paladino') {
    G.player.def   += 10;
    G.player.maxHp += 20;
    G.player.hp     = Math.min(G.player.hp + 20, G.player.maxHp);
    buffMsg = '🌿 A floresta reconhece sua fé — DEF +10 e HP Máx +20!';
    logMsg  = '✦ Amuleto de Tierra: DEF+10 e HP Máx+20 (Paladino)';
  } else if (classId === 'assassino') {
    G.player.spd += 8;
    G.player.atk += 5;
    buffMsg = '🌿 A floresta abraça sua sombra — VEL +8 e ATQ +5!';
    logMsg  = '✦ Amuleto de Tierra: VEL+8 e ATQ+5 (Assassino)';
  } else if (classId === 'mago') {
    G.player.mag   += 8;
    G.player.maxMp  = (G.player.maxMp || 100) + 30;
    G.player.mp     = Math.min((G.player.mp || 0) + 30, G.player.maxMp);
    buffMsg = '🌿 A essência da floresta flui em você — MAG +8 e MP Máx +30!';
    logMsg  = '✦ Amuleto de Tierra: MAG+8 e MP Máx+30 (Mago)';
  } else if (classId === 'arqueiro') {
    G.player.atk += 7;
    G.player.spd += 5;
    buffMsg = '🌿 O vento da floresta guia suas flechas — ATQ +7 e VEL +5!';
    logMsg  = '✦ Amuleto de Tierra: ATQ+7 e VEL+5 (Arqueiro)';
  } else {
    G.player.def += 10;
    buffMsg = '🌿 DEF +10 permanente!';
    logMsg  = '✦ Amuleto de Tierra: DEF+10';
  }

  const amuStats = { id:'coleira_tierra', name:'Amuleto de Tierra', icon:'🌿',
    imgSrc:'Imagens/Amuleto/amuleto_roxo.png',
    qty:1, weight:0.5, type:'equipamento', equipSlot:'acessorio', equipped:_equiparAgora,
    _accBonusApplied: _equiparAgora, // equipado agora: bônus já aplicado diretamente em p.atk/def/etc acima
    desc:'Amuleto de folhas e pedra viva. Bônus permanente concedido pela floresta de Clivor.' };

  if      (classId === 'mago')     { amuStats.mag = 8; amuStats.mp = 30; }
  else if (classId === 'paladino') { amuStats.def = 10; amuStats.hp = 20; }
  else if (classId === 'assassino'){ amuStats.spd = 8; amuStats.atk = 5; }
  else if (classId === 'arqueiro') { amuStats.atk = 7; amuStats.spd = 5; }
  else                             { amuStats.def = 10; }

  G.player.inventory = G.player.inventory || [];
  G.player.inventory.push(amuStats);
  if (_equiparAgora && typeof _updateTierraSetBonus === 'function') { try { _updateTierraSetBonus(G.player); } catch (e) {} }
  if (typeof updateHUD === 'function') { try { updateHUD(); } catch (e) {} }
  notify(buffMsg, 'gold');
  addLog(logMsg + ' 🌿 Amuleto de Tierra adicionado!', 'xp');

  const idx = G.player.inventory.indexOf(amuStats);
  if (idx !== -1 && typeof showItemPopup === 'function') {
    setTimeout(() => showItemPopup(idx, G.player.inventory[idx]), 350);
  }
}
window._abrirCaixaTierra = _abrirCaixaTierra;

// Registro de builders de caixa por id do item. Precisa disso porque
// JSON.stringify (usado no save) remove funções — então o `_boxBuilder`
// gravado direto no item da Caixa de Tierra vira undefined depois de
// salvar/carregar o jogo, e abrir a caixa a fazia sumir da bolsa sem
// dar nada. Guardando o builder aqui por id, useInventoryItem consegue
// recuperá-lo mesmo que o item já tenha perdido o seu.
window._BOX_BUILDERS = window._BOX_BUILDERS || {};
window._BOX_BUILDERS.caixa_tierra = _abrirCaixaTierra;

function useInventoryItem(idx) {
  const item = G.player.inventory[idx];
  if (!item) return;

  if (item.type === 'consumível') {
    // Elixir de Aaur — buff de ATQ
    if (item.buffAtk) {
      const bs = window.battleState;
      if (bs && G.inBattle) {
        bs._buffAtkTurns = item.buffTurns || 3;
        bs._buffAtkAmt   = item.buffAtk;
        G.player.atk += item.buffAtk;
        item.qty = (item.qty || 1) - 1;
        if (item.qty <= 0) G.player.inventory.splice(idx, 1);
        updateHUD();
        notify(`💙 ${item.name}: ATQ +${item.buffAtk} por ${item.buffTurns} turnos!`, 'gold');
        addLog(`Usou ${item.name}: ATQ +${item.buffAtk} por ${item.buffTurns} turnos.`, 'buff');
      } else {
        notify('⚠ Só pode usar em batalha!', 'gold');
      }
      return;
    }

    // Poções e ervas — cura
    if (item.id.includes('pocao') || item.id.includes('erva') || item.heal || item.restoreAP || item.restoreMP) {
      // Poções de AP
      if (item.restoreAP) {
        const ap = item.restoreAP;
        G.player.ap = Math.min(G.player.maxAp || 100, (G.player.ap || 0) + ap);
        item.qty = (item.qty || 1) - 1;
        if (item.qty <= 0) G.player.inventory.splice(idx, 1);
        updateHUD();
        buildInventoryGrid();
        notify(`⚡ ${item.name}: +${ap} AP!`, 'gold');
        addLog(`Usou ${item.name}: +${ap} AP.`, 'info');
        return;
      }
      // Poções de MP
      if (item.restoreMP || item.id.includes('mp')) {
        const mp = item.restoreMP || 25;
        G.player.mp = Math.min(G.player.maxMp, G.player.mp + mp);
        item.qty = (item.qty || 1) - 1;
        if (item.qty <= 0) G.player.inventory.splice(idx, 1);
        updateHUD();
        buildInventoryGrid();
        notify(`🔵 ${item.name}: +${mp} MP!`, 'blue');
        addLog(`Usou ${item.name}: +${mp} MP.`, 'info');
        return;
      }
      let heal = item.heal
        || (item.id === 'erva_rara' ? 30
          : item.id.includes('grande') ? 120
          : item.id.includes('media')  ? 60
          : item.id.includes('erva')   ? 15 : 25);
      // Graça Divina: poções curam 50% a mais
      if (G.player._talent_grace) heal = Math.floor(heal * 1.5);
      // Pedra da Sacerdotisa Negra: cura 7% a mais (permanente)
      if (G.player._pedraSiuBonusCura) heal = Math.floor(heal * (1 + G.player._pedraSiuBonusCura));
      G.player.hp = Math.min(G.player.maxHp, G.player.hp + heal);
      item.qty = (item.qty || 1) - 1;
      if (item.qty <= 0) G.player.inventory.splice(idx, 1);
      updateHUD();
      buildInventoryGrid();
      notify(`🌿 ${item.name}: +${heal} HP!`, 'green');
      addLog(`Usou ${item.name}: +${heal} HP.`, 'heal');
      return;
    }

  } else if (item.type === 'suporte') {
    // Item de suporte — não ocupa slot, fica na mochila.
    // Clique liga/desliga a passiva (ex.: Gadanha — Ceifada).
    item.active = !item.active;
    if (item.active) {
      notify(`🌙 ${item.name} ativada! A passiva agora está em efeito.`, 'gold');
      addLog(`Ativou: ${item.name}.`, 'info');
    } else {
      notify(`${item.name} desativada.`, 'gold');
      addLog(`Desativou: ${item.name}.`, 'info');
    }
    updateHUD();
    buildInventoryGrid();
    return;

  } else if (item.type === 'caixa_recompensa') {
    // Caixas de recompensa cujo conteúdo depende da classe do jogador (ex.:
    // a caixa do Tierra) — cada uma tem um builder próprio (item._boxBuilder)
    // que aplica os bônus e devolve o item de equipamento a ser revelado.
    const bauIdx = G.player.inventory.indexOf(item);
    if (bauIdx !== -1) G.player.inventory.splice(bauIdx, 1);
    const _builder = (typeof item._boxBuilder === 'function')
      ? item._boxBuilder
      : (window._BOX_BUILDERS && window._BOX_BUILDERS[item.id]);
    if (typeof _builder === 'function') _builder();
    updateHUD();
    buildInventoryGrid();
    return;

  } else if (item.type === 'bau') {
    const p = G.player;
    const reqKeyId = item.requiresKey;
    const keyIdx = reqKeyId ? p.inventory.findIndex(i => i.id === reqKeyId) : -1;

    if (reqKeyId && keyIdx === -1) {
      const keyBase = ITEM_DB[reqKeyId];
      notify(`🔒 ${item.name} está selado. É preciso de: ${keyBase ? keyBase.name : 'uma chave'}.`, 'gold');
      addLog(`Tentou abrir ${item.name} sem a chave necessária.`, 'info');
      return;
    }

    // Consome a chave
    if (keyIdx !== -1) {
      const keyItem = p.inventory[keyIdx];
      keyItem.qty = (keyItem.qty || 1) - 1;
      if (keyItem.qty <= 0) p.inventory.splice(keyIdx, 1);
    }

    // Remove o baú da bolsa
    const bauIdx = p.inventory.indexOf(item);
    if (bauIdx !== -1) p.inventory.splice(bauIdx, 1);

    // Concede o conteúdo do baú
    const ganhos = [];
    const ganhosDetalhados = [];
    (item.lootTable || []).forEach(entry => {
      if (equipDeMasmorraJaTem(ITEM_DB[entry.id] ? { ...ITEM_DB[entry.id], id: entry.id } : null)) return; // já tem: não repete
      addItem({ id: entry.id }, entry.qty || 1, { revealPopup: true });
      const base = ITEM_DB[entry.id];
      const qty = entry.qty || 1;
      ganhos.push(`${base ? base.name : entry.id}${qty > 1 ? ` x${qty}` : ''}`);
      ganhosDetalhados.push({
        icon: base ? base.icon : '📦',
        imgSrc: base ? base.imgSrc : null,
        name: base ? base.name : entry.id,
        qty,
      });
    });
    if (item.lootGold) {
      p.gold = (p.gold || 0) + item.lootGold;
      ganhos.push(`${item.lootGold} ouro`);
    }

    updateHUD();
    buildInventoryGrid();
    addLog(`Abriu ${item.name}. Itens obtidos: ${ganhos.join(', ')}.`, 'xp');
    showChestLootPopup({ chestName: item.name, itens: ganhosDetalhados, gold: item.lootGold || 0 });
    return;

  } else if (item.type === 'equipamento' && item.equipSlot === 'acessorio') {
    const p = G.player;

    // Helper: aplica bônus de um acessório no player
    function _applyAccBonus(acc, sign) {
      if (acc.atk)   p.atk   = Math.max(0, (p.atk   || 0) + sign * acc.atk);
      if (acc.def)   p.def   = Math.max(0, (p.def   || 0) + sign * acc.def);
      if (acc.spd)   p.spd   = Math.max(0, (p.spd   || 0) + sign * acc.spd);
      if (acc.mag)   p.mag   = Math.max(0, (p.mag   || 0) + sign * acc.mag);
      if (acc.crit)  p.critBonus = Math.max(0, (p.critBonus || 0) + sign * (acc.crit / 100));
      if (acc.hp)  { p.maxHp = Math.max(1, (p.maxHp || 1) + sign * acc.hp);  if (sign > 0) p.hp = Math.min((p.hp||0) + acc.hp, p.maxHp); else p.hp = Math.min(p.hp||0, p.maxHp); }
      if (acc.mp)  { p.maxMp = Math.max(0, (p.maxMp || 0) + sign * acc.mp);  if (sign > 0) p.mp = Math.min((p.mp||0) + acc.mp, p.maxMp); else p.mp = Math.min(p.mp||0, p.maxMp); }
      // Bônus percentual de HP Máx (ex.: Amuleto do Olho de Eir, +20% HP Máx).
      // Guarda o valor FLAT calculado no próprio item (_hpPctFlat) pra reverter
      // exatamente o mesmo número ao desequipar, em vez de recalcular a % em
      // cima de um maxHp que pode já ter mudado por outro equipamento.
      if (acc.hpPct) {
        if (sign > 0) {
          const bonus = Math.max(1, Math.round((p.maxHp || 1) * acc.hpPct));
          acc._hpPctFlat = bonus;
          p.maxHp = Math.max(1, (p.maxHp || 1) + bonus);
          p.hp = Math.min((p.hp || 0) + bonus, p.maxHp);
        } else {
          const bonus = acc._hpPctFlat || 0;
          p.maxHp = Math.max(1, (p.maxHp || 1) - bonus);
          p.hp = Math.min(p.hp || 0, p.maxHp);
          acc._hpPctFlat = 0;
        }
      }
    }

    if (item.equipped) {
      // Desequipa — remove bônus
      _applyAccBonus(item, -1);
      item.equipped = false;
      item._accBonusApplied = false;
      const stats = [];
      if (item.atk)  stats.push(`ATQ-${item.atk}`);
      if (item.def)  stats.push(`DEF-${item.def}`);
      if (item.spd)  stats.push(`VEL-${item.spd}`);
      if (item.mag)  stats.push(`MAG-${item.mag}`);
      if (item.crit) stats.push(`Crit-${item.crit}%`);
      if (item.hp)   stats.push(`HP Máx-${item.hp}`);
      if (item.hpPct) stats.push(`HP Máx-${Math.round((item.hpPct||0)*100)}%`);
      if (item.mp)   stats.push(`MP Máx-${item.mp}`);
      notify(`🌿 ${item.name} desequipado.${stats.length ? ' ' + stats.join(' ') : ''}`, 'gold');
      addLog(`Desequipou: ${item.name}.${stats.length ? ' ' + stats.join(' ') : ''}`, 'info');
    } else {
      // Desequipa acessório anterior se houver — remove bônus dele também
      const prev = p.inventory.find(i => i.equipSlot === 'acessorio' && i.equipped);
      if (prev) { _applyAccBonus(prev, -1); prev.equipped = false; }
      // Equipa novo — aplica bônus
      _applyAccBonus(item, +1);
      item.equipped = true;
      item._accBonusApplied = true;
      const stats = [];
      if (item.atk)  stats.push(`ATQ+${item.atk}`);
      if (item.def)  stats.push(`DEF+${item.def}`);
      if (item.spd)  stats.push(`VEL+${item.spd}`);
      if (item.mag)  stats.push(`MAG+${item.mag}`);
      if (item.crit) stats.push(`Crit+${item.crit}%`);
      if (item.hp)   stats.push(`HP Máx+${item.hp}`);
      if (item.hpPct) stats.push(`HP Máx+${Math.round((item.hpPct||0)*100)}% (+${item._hpPctFlat||0})`);
      if (item.mp)   stats.push(`MP Máx+${item.mp}`);
      notify(`🌿 ${item.name} equipado!${stats.length ? ' ' + stats.join(' ') : ''}`, 'gold');
      addLog(`Equipou: ${item.name}.${stats.length ? ' ' + stats.join(' ') : ''}`, 'info');
    }
    if (typeof _updateTierraSetBonus === 'function') _updateTierraSetBonus(p);
    if (typeof _updateCoracaoSetBonus === 'function') _updateCoracaoSetBonus(p);
    updateHUD();
    buildBagItems();
    updateEquippedGearHUD();
    return;

  } else if (item.type === 'equipamento' && item.equipSlot === 'armadura') {
    const p = G.player;

    // Requisito de nível pra equipar (armaduras fortes, tipo Mundial Armor)
    // Só bloqueia ao EQUIPAR — desequipar nunca é bloqueado.
    if (!item.equipped && item.levelRequired && (p.level || 1) < item.levelRequired) {
      notify(`🔒 ${item.name} requer nível ${item.levelRequired} para equipar. (Você: nível ${p.level || 1})`, 'red');
      addLog(`Tentou equipar ${item.name} sem o nível necessário (requer ${item.levelRequired}).`, 'info');
      return;
    }

    // Helper: aplica bônus de uma armadura no player (mesmo padrão do acessório)
    function _applyArmorBonus(arm, sign) {
      if (arm.atk)   p.atk   = Math.max(0, (p.atk   || 0) + sign * arm.atk);
      if (arm.def)   p.def   = Math.max(0, (p.def   || 0) + sign * arm.def);
      if (arm.spd)   p.spd   = Math.max(0, (p.spd   || 0) + sign * arm.spd);
      if (arm.mag)   p.mag   = Math.max(0, (p.mag   || 0) + sign * arm.mag);
      if (arm.crit)  p.critBonus = Math.max(0, (p.critBonus || 0) + sign * (arm.crit / 100));
      if (arm.hp)  { p.maxHp = Math.max(1, (p.maxHp || 1) + sign * arm.hp);  if (sign > 0) p.hp = Math.min((p.hp||0) + arm.hp, p.maxHp); else p.hp = Math.min(p.hp||0, p.maxHp); }
      if (arm.mp)  { p.maxMp = Math.max(0, (p.maxMp || 0) + sign * arm.mp);  if (sign > 0) p.mp = Math.min((p.mp||0) + arm.mp, p.maxMp); else p.mp = Math.min(p.mp||0, p.maxMp); }
    }

    if (item.equipped) {
      // Desequipa — remove bônus
      _applyArmorBonus(item, -1);
      item.equipped = false;
      item._accBonusApplied = false;
      const stats = [];
      if (item.atk)  stats.push(`ATQ-${item.atk}`);
      if (item.def)  stats.push(`DEF-${item.def}`);
      if (item.spd)  stats.push(`VEL-${item.spd}`);
      if (item.mag)  stats.push(`MAG-${item.mag}`);
      if (item.crit) stats.push(`Crit-${item.crit}%`);
      if (item.hp)   stats.push(`HP Máx-${item.hp}`);
      if (item.mp)   stats.push(`MP Máx-${item.mp}`);
      if (item.id === 'mundial_armor') p._mundialArmorEquipped = false;
      notify(`🛡️ ${item.name} desequipado.${stats.length ? ' ' + stats.join(' ') : ''}`, 'gold');
      addLog(`Desequipou: ${item.name}.${stats.length ? ' ' + stats.join(' ') : ''}`, 'info');
    } else {
      // Desequipa armadura anterior se houver — slot próprio, independente de acessório/arma.
      // Exceção: uma "runa fixa" (isStickyRune, ex.: Runa Yu) não compete pelo slot com
      // armaduras normais — cada uma só substitui outra do mesmo tipo (fixa ↔ fixa, normal ↔ normal).
      const prev = p.inventory.find(i => i.equipSlot === 'armadura' && i.equipped && !!i.isStickyRune === !!item.isStickyRune);
      if (prev) {
        _applyArmorBonus(prev, -1);
        prev.equipped = false;
        if (prev.id === 'mundial_armor') p._mundialArmorEquipped = false;
      }
      // Equipa nova — aplica bônus
      _applyArmorBonus(item, +1);
      item.equipped = true;
      item._accBonusApplied = true;
      if (item.id === 'mundial_armor') p._mundialArmorEquipped = true;
      // Conquista "Primeira Armadura" — só pra armadura de verdade, não pra
      // runa fixa (isStickyRune), que tem sua própria conquista de runa.
      if (!item.isStickyRune && window.Achievements) Achievements.unlock('ach_armadura');
      const stats = [];
      if (item.atk)  stats.push(`ATQ+${item.atk}`);
      if (item.def)  stats.push(`DEF+${item.def}`);
      if (item.spd)  stats.push(`VEL+${item.spd}`);
      if (item.mag)  stats.push(`MAG+${item.mag}`);
      if (item.crit) stats.push(`Crit+${item.crit}%`);
      if (item.hp)   stats.push(`HP Máx+${item.hp}`);
      if (item.mp)   stats.push(`MP Máx+${item.mp}`);
      // Descrição dinâmica de bônus por classe (Mundial Armor)
      if (item.id === 'mundial_armor' && typeof _getMundialArmorDesc === 'function') {
        notify(`🛡️ ${item.name} equipado! ${_getMundialArmorDesc()}`, 'gold');
      } else {
        notify(`🛡️ ${item.name} equipado!${stats.length ? ' ' + stats.join(' ') : ''}`, 'gold');
      }
      addLog(`Equipou: ${item.name}.${stats.length ? ' ' + stats.join(' ') : ''}`, 'info');
    }
    if (typeof _updateTierraSetBonus === 'function') _updateTierraSetBonus(p);
    if (typeof _updateCoracaoSetBonus === 'function') _updateCoracaoSetBonus(p);
    // ── Couraça do Rei da Selva: gerenciar stacks da Fúria do Caçador ──
    if (item.id === 'couraca_rei_selva') {
      if (item.equipped) {
        // Equipou: inicializar contador de stacks se não existir
        if (!p._couraca_furia_stack) p._couraca_furia_stack = 0;
      } else {
        // Desequipou: resetar estado da Fúria
        p._couraca_furia_stack = 0;
      }
    }
    updateHUD();
    buildBagItems();
    updateEquippedGearHUD();
    return;

  } else if (item.type === 'equipamento' && item.equipSlot === 'weapon') {
    // ── BUG-04 FIX: lógica de equip/unequip ──
    const p = G.player;

    if (item.equipped) {
      notify(`⚠ ${item.name} já está equipado!`, 'gold');
      return;
    }

    // Desequipa arma atual
    const prevWeapon = p.inventory.find(i => i.equipSlot === 'weapon' && i.equipped);
    if (prevWeapon) {
      // Remove bônus da arma anterior dos stats
      p.atk  -= (prevWeapon.atk  || 0);
      p.def  -= (prevWeapon.def  || 0);
      p.spd  -= (prevWeapon.spd  || 0);
      p.mag  -= (prevWeapon.mag  || 0);
      if (prevWeapon.crit) p.critBonus = Math.max(0, (p.critBonus || 0) - prevWeapon.crit / 100);
      if (prevWeapon.hp)  { p.maxHp = Math.max(1, (p.maxHp || 1) - prevWeapon.hp); p.hp = Math.min(p.hp || 0, p.maxHp); }
      if (prevWeapon.mp)  { p.maxMp = Math.max(0, (p.maxMp || 0) - prevWeapon.mp); if (p.mp !== undefined) p.mp = Math.min(p.mp, p.maxMp); }
      prevWeapon.equipped = false;
    }

    // Equipa a nova arma
    item.equipped = true;
    p.atk  += (item.atk  || 0);
    p.def  += (item.def  || 0);
    p.spd  += (item.spd  || 0);
    p.mag  += (item.mag  || 0);
    if (item.crit) p.critBonus = (p.critBonus || 0) + item.crit / 100;
    if (item.hp)  { p.maxHp = (p.maxHp || 1) + item.hp; p.hp = (p.hp || 0) + item.hp; }
    if (item.mp)  { p.maxMp = (p.maxMp || 0) + item.mp; }
    p.equippedWeapon = item;
    p.equipped = { weapon: item };

    const statsStr = [];
    if (item.atk)  statsStr.push(`ATQ+${item.atk}`);
    if (item.def)  statsStr.push(`DEF+${item.def}`);
    if (item.spd)  statsStr.push(`VEL+${item.spd}`);
    if (item.mag)  statsStr.push(`MAG+${item.mag}`);
    if (item.crit) statsStr.push(`Crit+${item.crit}%`);
    if (item.hp)   statsStr.push(`HP Máx+${item.hp}`);
    if (item.mp)   statsStr.push(`MP Máx+${item.mp}`);

    updateHUD();
    buildInventoryGrid();
    buildSkillList();
    notify(`⚔ ${item.name} equipado!${statsStr.length ? ' ' + statsStr.join(' ') : ''}`, 'gold');
    addLog(`Equipou: ${item.name}.${statsStr.length ? ' ' + statsStr.join(' ') : ''}`, 'info');

  } else {
    notify(`${item.icon || '📦'} ${item.name}`, 'gold');
  }
}

// ─────────────────────────────────────────────────────────────
//  ITEM_DB — Fonte canônica de ícones/imagens de todos os itens
// ─────────────────────────────────────────────────────────────
const ITEM_DB = {
  pocao_pequena:  { name:'Poção Pequena',       icon:'🧪',  imgSrc:'Imagens/cosméticos/poção.png',           type:'consumível', desc:'Restaura 25 HP.',        heal:25,  weight:0.5 },
  pocao_media:    { name:'Poção Média',          icon:'🫙',  imgSrc:'Imagens/cosméticos/poçãoM.png',          type:'consumível', desc:'Restaura 60 HP.',        heal:60,  weight:0.5 },
  pocao_grande:   { name:'Poção Grande',         icon:'⚗️',  imgSrc:'Imagens/cosméticos/poçãoG.png',          type:'consumível', desc:'Restaura 120 HP.',       heal:120, weight:0.5 },
  pocao_cura:     { name:'Poção de Cura',        icon:'🧪',  imgSrc:'Imagens/pocao.png',                      type:'consumível', desc:'Recupera 40 HP.',        heal:40,  weight:0.5 },
  elixir_ap:      { name:'Elixir de AP',         icon:'⚗️',  imgSrc:'Imagens/elixir.png',                     type:'consumível', desc:'Restaura 50 AP.',        restoreAP:50, weight:0.3 },
  aaur_elixir:    { name:'Elixir de MP',          icon:'💙',  imgSrc:'Imagens/cosméticos/aaur.png',            type:'consumível', desc:'Restaura 50 MP.',        restoreMP:50, weight:0.3 },
  erva_cura:      { name:'Erva Medicinal',       icon:'🌿',  imgSrc:'Imagens/cosméticos/erva.png',            type:'consumível', desc:'Recupera 15 HP.',        heal:15,  weight:0.2 },
  erva_rara:      { name:'Erva da Névoa',        icon:'🍃',  imgSrc:'Imagens/icones/materiais/Picsart_26-06-27_02-36-55-008.png', type:'consumível', desc:'Recupera 30 HP. Rara.',  heal:30,  weight:0.2 },
  pedra:          { name:'Pedra',                icon:'🪨',  imgSrc:'Imagens/pedra.png',                      type:'material',   desc:'Material de craft.',               weight:0.3 },
  po_cristal:     { name:'Pó de Cristal',        icon:'💎',  imgSrc:'Imagens/icones/materiais/poCrista.png',   type:'material',   desc:'Pó mágico de cristal. Usado em craft de poções de MP.', weight:0.2 },
  pocao_mp_p:     { name:'Poção de MP',           icon:'🔵',  imgSrc:'Imagens/cosméticos/MP.png',              type:'consumível', desc:'Restaura 25 MP.',        restoreMP:25, weight:0.4 },
  pocao_mp_m:     { name:'Poção de MP Média',     icon:'🔷',  imgSrc:'Imagens/cosméticos/MP.png',              type:'consumível', desc:'Restaura 45 MP.',        restoreMP:45, weight:0.4 },
  pocao_mp_g:     { name:'Poção de MP Grande',    icon:'🔷',  imgSrc:'Imagens/cosméticos/poçãoG.png',          type:'consumível', desc:'Restaura 70 MP.',        restoreMP:70, weight:0.5 },
  pele_lobo:      { name:'Pele de Lobo',         icon:'🐾',  imgSrc:'Imagens/icones/materiais/pele_lobo.png', type:'material',   desc:'Pele de um lobo selvagem.',        weight:0.5 },
  pele_cobra:     { name:'Pele de Cobra',        icon:'🐍',  imgSrc:'Imagens/icones/materiais/peledeco.png',  type:'material',   desc:'Escamas finas de uma cobra.',      weight:0.4 },
  glandula:       { name:'Glândula Venenosa',    icon:'☠️',  imgSrc:'Imagens/icones/materiais/Glandul.png',   type:'material',   desc:'Secreta veneno potente.',          weight:0.3 },

  // ── Drops dos inimigos de mérito (Herói do Vilarejo+) ──
  garra_urso_pardo:    { name:'Garra de Urso Pardo',        icon:'🐾', imgSrc:'Imagens/icones/materiais/garra_urso_pardo.png',    type:'material', desc:'Garra afiada e pesada, arrancada de um urso pardo. Material de craft raro.', weight:0.6 },
  peconha_esmeralda:   { name:'Peçonha Esmeralda',          icon:'☠️', imgSrc:'Imagens/icones/materiais/peconha_esmeralda.png',   type:'material', desc:'Veneno concentrado e denso, extraído da Cobra Verde. Material de craft raro.', weight:0.4 },
  garra_urso_kodiak:   { name:'Garra de Urso Kodiak',       icon:'🐾', imgSrc:'Imagens/icones/materiais/garra_urso_kodiak.png',   type:'material', desc:'Garra maciça de um urso Kodiak. Material de craft raro.', weight:0.6 },
  presa_urso_kodiak:   { name:'Presa de Urso Kodiak',       icon:'🦷', imgSrc:'Imagens/icones/materiais/presa_urso_kodiak.png',   type:'material', desc:'Um único dente, enorme, arrancado de um urso Kodiak. Material de craft raro.', weight:0.4 },
  essencia_rei_selva:  { name:'Essência do Rei da Selva',   icon:'✨', imgSrc:'Imagens/icones/materiais/essencia_rei_selva.png',  type:'material', desc:'Essência pura extraída do lendário Rei da Selva. Material raríssimo.', weight:0.3 },
  presa_gorila:        { name:'Presa de Gorila',            icon:'🦷', imgSrc:'Imagens/icones/materiais/presa_gorila.png',        type:'material', desc:'Presa afiada arrancada do Rei da Selva. Material de craft raro.', weight:0.5 },
  pegada_gorila:       { name:'Pegada de Gorila',           icon:'🐾', imgSrc:'Imagens/icones/materiais/pegada_gorila.png',       type:'material', desc:'Molde de uma pegada gigante, endurecido. Material de craft raro.', weight:0.4 },

  // ── Frascos de Veneno (Assassino) ──
  // Frasco Vazio: universal (qualquer classe pode carregar/comprar), 4 moedas no ferreiro.
  // Frasco Venenoso: craftado na ferraria (Glândula Venenosa + Frasco Vazio) — só Assassino por enquanto.
  // Consumido automaticamente pela skill "Veneno Rápido" (ver class_assassino.js).
  frasco_vazio:   { name:'Frasco Vazio',         icon:'🧴',  imgSrc:'Imagens/icones/materiais/frascoVazio.png', type:'material',   desc:'Frasco de vidro vazio. Pode ser preenchido com veneno na ferraria de Gozen.', weight:0.2 },
  frasco_veneno:  { name:'Frasco Venenoso',      icon:'🧪',  imgSrc:'Imagens/icones/materiais/frascovenenoso.png', type:'material', desc:'Frasco cheio de veneno concentrado. Necessário para usar Veneno Rápido — 1 frasco é consumido por uso.', weight:0.3 },
  coleira_tierra: { name:'Amuleto de Tierra',    icon:'🌿',  imgSrc:'Imagens/Amuleto/amuleto_roxo.png',  type:'equipamento', equipSlot:'acessorio', desc:'Amuleto de folhas e pedra viva. Bônus varia por classe.',  weight:0.5 },
  prato_kappa:    { name:'Prato do Kappa', icon:'🥣', imgSrc:'Imagens/Amuleto/kaikp.png', type:'equipamento', equipSlot:'acessorio', desc:'O prato de água sagrada da cabeça do Kappa.\nPassiva: após sofrer Dano Verdadeiro, seu próximo ataque causa +40% de dano.\nLendário (1x/batalha): ao cair abaixo de 20% de HP, recupera 200 HP.', atk:20, spd:15, crit:12, weight:0.1 },
  amuleto_yuki:   { name:'Amuleto da Bênção de Yuki', icon:'✨',  imgSrc:'Imagens/Amuleto/amuleto_yuki.png', type:'equipamento', equipSlot:'acessorio', desc:'Pingente de luz formado pela bênção de Yuki. A ligação se desfaz ao sair desta dungeon.', atk:3, crit:7, weight:0.3, unique:true },
  pedra_sacerdotisa_negra: { name:'Pedra da Sacerdotisa Negra', icon:'🔮', imgSrc:'Imagens/Amuleto/pedra_sacerdotisa_negra.png', type:'equipamento', equipSlot:'acessorio', desc:'Fragmento de pedra negra que pulsa com a essência de Siu. Sua cura é 7% mais eficaz, permanentemente — mesmo desequipada.', weight:0.5, unique:true },
  pena_corvo:     { name:'Pena de Corvo',        icon:'🪶',  imgSrc:'Imagens/icones/materiais/penC.png',          type:'material',   desc:'Pena negra de um corvo das cinzas.', weight:0.1 },
  cajado_basic:   { name:'Cajado de Novato',     icon:'🪄',  imgSrc:'Imagens/Armas/cajado_1781493098967.png',     type:'equipamento', equipSlot:'arma', desc:'Um cajado com um cristal fraco.', mag:4, spd:1, weight:1 },

  // ── Materiais de Dungeon ──
  cinza_espectral:      { name:'Cinza Espectral',         icon:'🌫️', imgSrc:'Imagens/icones/materiais/Picsart_26-06-27_03-37-16-765.png',   type:'material', desc:'Resíduo espectral deixado por criaturas sombrias.', weight:0.1 },
  essencia_fantasma:    { name:'Essência Fantasmal',       icon:'💠',  imgSrc:'Imagens/icones/materiais/Picsart_26-06-27_03-39-51-719.png',   type:'material', desc:'Essência etérea coletada de espectros.', weight:0.1 },
  eco_cristalizado:     { name:'Eco Cristalizado',         icon:'🔮',  imgSrc:'Imagens/icones/materiais/Picsart_26-06-27_03-46-47-499.png',   type:'material', desc:'Cristal que ressoa com ecos de almas aprisionadas.', weight:0.2 },
  fragmento_sombra:     { name:'Fragmento de Sombra',      icon:'🌑',  imgSrc:'Imagens/icones/materiais/fragsombr.png',       type:'material', desc:'Fragmento denso de trevas solidificadas.', weight:0.2 },
  chave_vazio:          { name:'Chave do Vazio',            icon:'🗝️',  imgSrc:'Imagens/icones/Chavss.png',                     type:'material', desc:'Chave gravada com runas do Vazio. Abre câmaras seladas.', weight:0.1 },
  osso_marionete:       { name:'Osso da Marionete',        icon:'🦴',  imgSrc:'Imagens/icones/materiais/Picsart_26-06-27_03-07-59-948.png',   type:'material', desc:'Osso de uma marionete animada por magia negra.', weight:0.3 },
  po_osso:              { name:'Pó de Osso',               icon:'🏺',  imgSrc:'Imagens/icones/materiais/poOsso.png',           type:'material', desc:'Pó fino de ossos triturados. Ingrediente de craft.', weight:0.1 },
  essencia_espiritual:  { name:'Essência Espiritual',      icon:'👻',  imgSrc:'Imagens/icones/materiais/Picsart_26-06-27_03-02-33-187.png',   type:'material', desc:'Essência pura de um ser espiritual.', weight:0.1 },
  emblema_rei_maldito:  { name:'Emblema do Rei Maldito',   icon:'👑',  imgSrc:'Imagens/icones/materiais/Picsart_26-06-27_03-06-58-212.png',   type:'material', desc:'Insígnia de um rei corrompido pela maldição.', weight:0.4 },
  katana_muichi:        { name:'Katana de Muichi',         icon:'🗡️',  imgSrc:'Imagens/icones/materiais/Picsart_26-06-27_03-27-15-667.png',   type:'material', desc:'Lâmina amaldiçoada do Senhor das Sombras.', weight:0.8 },
  essencia_lorde:       { name:'Essência do Lorde',        icon:'🌙',  imgSrc:'Imagens/icones/materiais/Picsart_26-06-27_03-26-54-664.png',   type:'material', desc:'Essência condensada do poder do Lorde das Sombras.', weight:0.2 },
  humor_espectral:      { name:'Humor Espectral',          icon:'👁️',  imgSrc:'Imagens/icones/materiais/Picsart_26-06-27_02-48-19-388.png',       type:'material', desc:'Fluido sobrenatural segregado por espectros antigos.', weight:0.1 },
  argila_sombria:       { name:'Argila Sombria',           icon:'🟫',  imgSrc:'Imagens/icones/materiais/Picsart_26-06-27_02-52-06-685.png',    type:'material', desc:'Argila impregnada com energia das sombras.', weight:0.5 },
  pelo_rato:            { name:'Pelo Rançoso',             icon:'🐾',  imgSrc:'Imagens/icones/materiais/Picsart_26-07-06_09-27-43-192.png',         type:'material', desc:'Pelo áspero de um rato das masmorras.', weight:0.1 },
  fragmento_cristal_negro: { name:'Fragmento de Cristal Negro', icon:'🔮', imgSrc:'Imagens/icones/materiais/Picsart_26-06-27_02-46-42-072.png', type:'material', desc:'Fragmento de cristal corrompido pela escuridão.', weight:0.2 },
  essencia_sombras:     { name:'Essência das Sombras',     icon:'🌑',  imgSrc:'Imagens/icones/materiais/Picsart_26-06-27_02-50-41-929.png',       type:'material', desc:'Concentrado das trevas mais profundas.', weight:0.1 },
  lamina_quebrada:      { name:'Lâmina Quebrada',          icon:'🗡️',  imgSrc:'Imagens/icones/materiais/laminaQuebrada.png',   type:'material', desc:'Lâmina de espada partida. Ainda pode ser fundida.', weight:0.5 },
  espada_enferrujada:   { name:'Espada Enferrujada',       icon:'⚔️',  imgSrc:'Imagens/icones/materiais/espadaEnf.png',        type:'material', desc:'Espada corroída pelo tempo. Material de craft.', weight:0.6 },
  po_sombra:            { name:'Pó de Sombra',             icon:'🌑',  imgSrc:'Imagens/icones/materiais/Picsart_26-06-27_02-42-37-937.png',         type:'material', desc:'Pó escuro que emana frio ao toque.', weight:0.1 },
  teia_aranha:          { name:'Teia',                     icon:'🕸️',  imgSrc:'Imagens/icones/materiais/Picsart_26-06-20_21-22-07-911.png', type:'material', desc:'Fio de teia resistente. Material de craft.', weight:0.05 },

  // ── Runas de baú (Templo do Vazio Ecoante) ──
  // ── Selo da Força — item de personagem (slot "SELO", isStickyRune), não
  // compete com o sistema de runas D→SS da arma. Enquanto equipado, dá +10%
  // de dano BRUTO nos ataques básicos — ou seja, aumenta o termo de ATQ
  // ANTES da defesa do inimigo entrar na conta, não depois.
  // Ver getSeloForcaMult() logo abaixo de playerTemRunaYu().
  // (Antes se chamava "Runa da Força" / id 'runa_forca' — saves antigos são
  // migrados em loadGame(), ver bloco "Migração: Runa da Força → Selo da Força".)
  selo_forca:  { name:'Selo da Força', icon:'🔴', imgSrc:'Imagens/icones/RuneN.png',
                 type:'equipamento', equipSlot:'armadura', isStickyRune:true, isSelo:true,
                 dmgBrutoPct: 0.10,
                 desc:'Selo gravado com runas de força ancestral. Uma vez equipado no slot de Selo, permanece ativo com qualquer armadura, até você mesmo decidir desequipá-lo. Aumenta em 10% o dano bruto dos seus ataques básicos e concede +8~10% de dano bruto extra (aleatório a cada uso) na skill de assinatura da sua classe.',
                 weight:0.1 },
  runa_sombra: { name:'Runa da Sombra', icon:'🟣', imgSrc:'Imagens/icones/materiais/Picsart_26-06-29_00-36-15-330.png', type:'runa', desc:'Envolve o golpe em trevas — concede penetração de armadura.', weight:0.1 },
  runa_vazio:  { name:'Runa do Vazio',  icon:'⚫', type:'equipamento', equipSlot:'armadura', isStickyRune:true, isSelo:true, desc:'Runa rara obtida apenas nas profundezas do templo. Efeito desconhecido.', weight:0.1 },

  // ── Baú Comum da Dungeon das Sombras — tier comum (BauB) ──
  // Contraparte "fraca" do Baú das Sombras: sem chave, abre na hora, loot
  // menor. Dropa ocasionalmente de inimigos derrotados dentro da dungeon
  // (ver drop em endBattle, gated por G.location.indexOf('dungeon-')===0).
  bau_comum:      { name:'Baú Comum',            icon:'🎁',  imgSrc:'Imagens/icones/materiais/BauB.png',   type:'bau',
                    desc:'Um baú simples, sem fechadura, deixado nos corredores da dungeon. Nada perto do baú do Lorde, mas ainda vale abrir.',
                    lootTable:[ { id:'po_sombra', qty:3 }, { id:'cinza_espectral', qty:2 }, { id:'po_cristal', qty:2 } ], lootGold:75, weight:1.5 },
  // ── Baú das Sombras (Fase 9, Parte 2) — tier raro (BauS) ──
  bau_sombras:    { name:'Baú das Sombras',      icon:'🎁',  imgSrc:'Imagens/icones/materiais/BauS.png',   type:'bau', requiresKey:'chave_sombras',
                    desc:'Um baú de madeira escura reforçada, deixado para trás pelo Lorde das Sombras. Selado — sem a chave certa, não abre de jeito nenhum.',
                    lootTable:[ { id:'coracao_incandescente', qty:1 }, { id:'po_cristal', qty:5 } ], lootGold:300, weight:3 },
  chave_sombras:  { name:'Chave das Sombras',    icon:'🗝️',  imgSrc:'Imagens/icones/materiais/Chavss.png', type:'chave',
                    desc:'Pequena e fria ao toque, gravada com símbolos que ecoam os da câmara do Lorde. Abre o Baú das Sombras.', weight:0.1 },
  // Coração Incandescente: amuleto de CARGA. Não dá bônus ao equipar.
  // Carrega +chargePerTurn% a cada turno de batalha (com ele equipado).
  // Ao atingir 100% "desperta" — ATQ/Crítico permanentes + rajada de cura —
  // e o ícone troca para a versão ligada (imgSrcCarregado). A cada turno de
  // uso tem breakChancePerTurn% de chance de quebrar; quebrado, para de
  // carregar e perde o bônus até ser consertado (repairQty× repairItemId).
  // Morrer zera a carga de volta a 0% (ver bloco "Derrota padrão" em endBattle).
  coracao_incandescente: { name:'Coração Incandescente', icon:'🔥',
                    imgSrc:'Imagens/Amuleto/inscancentehen.png',
                    imgSrcCarregado:'Imagens/Amuleto/Incasndenn.png',
                    type:'equipamento', equipSlot:'acessorio', chargeable:true,
                    chargePerTurn:10, breakChancePerTurn:4,
                    repairItemId:'po_sombra', repairQty:5,
                    buffAtk:12, buffCrit:10, buffHeal:30,
                    desc:'O núcleo pulsante de calor que restava no peito do Lorde das Sombras, agora forjado como amuleto. Carrega 10% a cada turno em batalha; ao atingir 100%, desperta — ATQ +12, Crítico +10% e uma rajada de cura — e permanece ativo até você cair em batalha, quando a carga zera. Pode quebrar com o uso; conserte com Pó de Sombra.',
                    weight:0.6 },

  // ── Mundial Armor ──
  // Recompensa por resgatar 100% do Quadro de Quests. Universal — qualquer
  // classe pode equipar — mas o bônus passivo (ver mundial_armor.js) muda
  // completamente de acordo com a classe atual. Bônus fixos aqui são
  // deliberadamente modestos: a força real do item está nos passivos.
  // levelRequired: 10 — ainda segura o item longe de runs rushadas de
  // quests muito cedo, mas libera mais perto da faixa em que o Tier II de
  // talentos já abriu (level 7) e antes do grind pesado do Kappa.
  mundial_armor: { name:'Mundial Armor', icon:'🛡️', imgSrc:'Imagens/Armaduras/Mundialarmor.png',
                    type:'equipamento', equipSlot:'armadura', levelRequired:10,
                    def:15, hp:40, weight:2,
                    desc:'Peitoral forjado para quem provou seu valor em cada contrato do Vilarejo. Pulsa de um jeito diferente para cada guerreiro que a veste.' },

  // ── Peitoral da Floresta de Clivor ──
  // Par do Amuleto de Tierra (coleira_tierra), craftável na ferraria de
  // Gozen. Sozinho já é uma boa armadura defensiva; equipado JUNTO com o
  // amuleto, ativa o bônus de conjunto "Proficiência da Floresta" (ver
  // _updateTierraSetBonus): reduz o custo de AP/MP das habilidades.
  peitoral_floresta: { name:'Peitoral da Floresta de Clivor', icon:'🌳', imgSrc:'Imagens/Armaduras/Picsart_26-07-05_14-45-40-087.png',
                    type:'equipamento', equipSlot:'armadura',
                    def:8, hp:25, weight:1.2,
                    desc:'Casca viva e folhas entrelaçadas, crescidas sobre uma armação de pedra da floresta de Clivor. Junto ao Amuleto de Tierra, desperta uma ressonância antiga.' },

  // ── Peitoral do Lorde das Sombras ──
  // Par do Coração Incandescente (coracao_incandescente). Forjada com as
  // placas restantes da armadura do Lorde das Sombras — o mesmo chefe cujo
  // núcleo virou o amuleto. Sozinha já é uma armadura pesada e defensiva;
  // equipada JUNTO com o Coração Incandescente, ativa o bônus de conjunto
  // "Guarda do Lorde" (ver _updateCoracaoSetBonus): reduz bastante a chance
  // do Coração quebrar por turno.
  // FORJA: pode ser fortalecida permanentemente gastando Pó de Sombra
  // excedente (o mesmo material usado pra consertar o Coração) — ver
  // forjarPeitoralLorde(). +1 DEF / +3 HP máx por nível, até 10 níveis.
  peitoral_lorde_sombras: { name:'Peitoral do Lorde das Sombras', icon:'🖤', imgSrc:'Imagens/Armaduras/peitoral_lorde_sombras.png',
                    type:'equipamento', equipSlot:'armadura',
                    def:14, hp:40, weight:1.6,
                    forjavel:true, forjaMax:10, forjaCustoPorNivel:10, forjaDefPorNivel:1, forjaHpPorNivel:3,
                    desc:'Placas remanescentes do Lorde das Sombras, ainda quentes ao toque — como se recusassem esfriar de vez. Junto ao Coração Incandescente, forma uma guarda que protege a própria chama.' },

  // ── Couraça do Rei da Selva ──
  // Épica, craftável no Gozen. Dual-passive armor com crescimento via mérito:
  // Passiva 1 — Fervor Selvagem: reativo, 1x/batalha quando HP<50%, +17% ATQ (ou MAG pro Mago)
  // Passiva 2 — Fúria do Caçador: permanente, acumula +13% ATQ cada 20 inimigos com mérito abatidos
  // Forjável: máximo 3 níveis com Essência do Rei da Selva
  // Bônus: +15 HP máx + +2 DEF por nível
  couraca_rei_selva: { name:'Couraça do Rei da Selva', icon:'🐆', imgSrc:'Imagens/Armaduras/armadu.png',
                    type:'equipamento', equipSlot:'armadura',
                    def:3, hp:45, weight:2.0,
                    forjavel:true, forjaMax:3, forjaCustoPorNivel:'essencia_rei_selva',
                    forjaHpPorNivel:15, forjaDefPorNivel:2,
                    desc:'Peitoral forjado a partir de presas e couro de bestas da floresta. Pulsa com a fúria acumulada de cada caça. Equipada com armadura, concede crescimento permanente através de cada inimigo com mérito abatido enquanto usada — e em combate crítico, desperta uma fúria selvagem que amplifica seu ataque.' },

  mapa_cidade_pedra: { name:'Mapa da Cidade das Pedra', icon:'🗺️', imgSrc:'Imagens/icones/mapa_cidade_pedra.png',
                    type:'material', desc:'Mapa gasto, dado pelo taberneiro. Marca o caminho que liga Clivor à Cidade das Pedra.', weight:0.1 },

  // ── Runa Yu — dada por Yuki, protege contra o pó corrosivo da Cidade das Pedra ──
  // isSelo:true faz ela ser migrada automaticamente pra Bolsa de Selos (ver
  // bloco de migração perto do topo do arquivo, mesmo esquema já usado pelo
  // Selo da Força) — some do inventário comum e passa a viver em
  // G.player.selosEquipados/selosGuardados, ocupando um dos 3 slots de Selo.
  // isStickyRune: true continua aqui só por compatibilidade com saves muito
  // antigos que ainda não passaram pela migração.
  runa_yu: { name:'Runa Yu', icon:'🔯', imgSrc:'Imagens/icones/selos/Picsart_26-07-06_19-13-05-694.png',
                    type:'equipamento', equipSlot:'armadura', isStickyRune:true, isSelo:true, protegeCidadePedra:true,
                    desc:'Runa entregue por Yuki. Uma vez equipada no slot de Selo, permanece ativa com qualquer armadura, até você mesmo decidir desequipá-la. Protege contra o pó corrosivo da Cidade das Pedra.',
                    weight:0.1 },

  // ── Bolsa Aitemu — abre o Armazém do Alberon em qualquer lugar (só RETIRAR) ──
  // Toque na bolsa (Bolsa de itens) = abre o armazém. Não funciona em batalha nem em
  // masmorra (ver armazemUsarBolsa em armazem.js). Não pode ser guardada no armazém.
  bolsa_aitemu: { name:'Bolsa Aitemu', icon:'👝', imgSrc:'Imagens/icones/bolsa_Aitemu.png',
                    type:'ferramenta', abreArmazem:true,
                    desc:'Bolsa de couro encantada, ligada ao Armazém do Alberon. Toque nela para retirar itens guardados de qualquer lugar. Não serve para guardar, nem funciona em batalha ou em masmorras.',
                    weight:0.5 },

  // ── Novos Selos (4) — mesma família do Selo da Força / Runa Yu: uma vez
  // equipados no slot de Selo (Bolsa de Selos, isSelo:true), permanecem
  // ativos com qualquer armadura até serem desequipados manualmente.
  // Lógica de batalha de cada um vive em palDinh.js (procure pelos
  // comentários "SELO INN", "SELO DO VALE", "SELO ANCORADO", "SELO INDÊ").
  selo_inn: { name:'Selo Inn', icon:'🗡️', imgSrc:'Imagens/icones/selos/Picsart_26-08-16_03-08-10-918.png',
                 type:'equipamento', equipSlot:'armadura', isStickyRune:true, isSelo:true,
                 chanceDebuffDef:0.15, debuffDefPct:0.25, debuffDefTurnos:2,
                 desc:'Selo afiado como uma lâmina fina. Uma vez equipado no slot de Selo, permanece ativo com qualquer armadura, até você mesmo decidir desequipá-lo. A cada ataque básico, 15% de chance de abrir um corte certeiro que reduz a DEF do oponente em 25% por 2 turnos.',
                 weight:0.1 },

  selo_vale: { name:'Selo do Vale', icon:'🩸', imgSrc:'Imagens/icones/selos/Picsart_26-08-16_02-55-04-540.png',
                 type:'equipamento', equipSlot:'armadura', isStickyRune:true, isSelo:true,
                 sacrificioHpPct:0.15, bonusAtk:20,
                 desc:'Selo forjado no fundo de um vale sem nome. Uma vez equipado no slot de Selo, permanece ativo com qualquer armadura, até você mesmo decidir desequipá-lo. Ao entrar em batalha, sacrifica 15% do seu HP máximo em troca de +20 de ATQ durante toda a luta.',
                 weight:0.1 },

  selo_ancorado: { name:'Selo Ancorado', icon:'⛓️', imgSrc:'Imagens/icones/selos/Picsart_26-08-16_03-08-24-959.png',
                 type:'equipamento', equipSlot:'armadura', isStickyRune:true, isSelo:true,
                 desc:'Selo preso por correntes de sangue antigas. Uma vez equipado no slot de Selo, permanece ativo com qualquer armadura, até você mesmo decidir desequipá-lo. Sempre que sua DEF for maior que a do oponente, um elo de sangue se forma entre vocês: toda cura recebida por qualquer um dos dois lados é replicada integralmente para o outro.',
                 weight:0.1 },

  selo_inde: { name:'Selo Indê', icon:'💥', imgSrc:'Imagens/icones/selos/Picsart_26-08-16_03-07-53-380.png',
                 type:'equipamento', equipSlot:'armadura', isStickyRune:true, isSelo:true,
                 bonusSextoCritPct:0.07,
                 desc:'Selo gravado com o símbolo do combo perfeito. Uma vez equipado no slot de Selo, permanece ativo com qualquer armadura, até você mesmo decidir desequipá-lo. A cada 5 acertos críticos com ataque básico na mesma batalha, o 6º causa 7% de dano extra. A contagem zera a cada nova batalha.',
                 weight:0.1 },

  // ── Selo do Limiar — feito sob medida pra lutas de boss/multi-fase.
  // Não faz nada relevante contra mobs comuns (que raramente cruzam 50%
  // e 25% de HP de forma perceptível); brilha em lutas longas e táticas.
  selo_limiar: { name:'Selo do Limiar', icon:'🌗', imgSrc:'Imagens/icones/selos/Picsart_26-08-16_03-42-32-690.png',
                 type:'equipamento', equipSlot:'armadura', isStickyRune:true, isSelo:true,
                 bonusLimiarPct:0.30,
                 desc:'Selo que ressoa com os momentos decisivos de uma batalha. Uma vez equipado no slot de Selo, permanece ativo com qualquer armadura, até você mesmo decidir desequipá-lo. Sempre que seu ataque fizer o HP do inimigo cruzar 50% ou 25% do máximo pela primeira vez na luta, seu próximo golpe causa +30% de dano bruto. Dispara no máximo 2 vezes por batalha (uma em cada limiar).',
                 weight:0.1 },

  // ── Selo do Bastião — o primeiro pensado puramente pra DEF/tanque.
  // Bônus passivo constante (não depende de sorte nem de condição) +
  // um "botão de pânico" de uso único contra golpes muito grandes.
  selo_bastiao: { name:'Selo do Bastião', icon:'🛡️', imgSrc:'Imagens/icones/selos/Picsart_26-08-16_03-43-31-452.png',
                 type:'equipamento', equipSlot:'armadura', isStickyRune:true, isSelo:true,
                 bonusDefPct:0.15, mitigacaoGolpeGrandePct:0.40, limiarGolpeGrandePct:0.25,
                 desc:'Selo forjado pra suportar o peso de qualquer golpe. Uma vez equipado no slot de Selo, permanece ativo com qualquer armadura, até você mesmo decidir desequipá-lo. Concede +15% de DEF durante toda a batalha. Além disso, na primeira vez que um único golpe inimigo ultrapassar 25% do seu HP máximo na luta, esse golpe é reduzido em 40%.',
                 weight:0.1 },
};

// _getCajadoDesc() foi movida para runas.js (fica lá a versão viva).

// ── Aplica desc dinâmica em itens do cajado antes de exibir ──
function _resolveItemDesc(item) {
  if (item && (item.id === 'cajado_basic' || item.id === 'arma_cajado_basic')) {
    return { ...item, desc: _getCajadoDesc() };
  }
  return item;
}

function _normalizeItem(item) {
  const base = ITEM_DB[item.id];
  if (!base) return item;
  return Object.assign({}, base, item);
}

// ── Amuletos com sistema de carga (ex: Coração Incandescente) ──
// Retorna o imgSrc correto pra exibir: versão "ligada" quando 100% carregado
// e não quebrado, senão a versão normal (0%/quebrado).
function _getItemIconSrc(item) {
  if (item && item.chargeable && item.imgSrcCarregado && (item._carga || 0) >= 100 && !item._quebrado) {
    return item.imgSrcCarregado;
  }
  return item ? item.imgSrc : null;
}

// Conserta um item quebrado (ex: Coração Incandescente) usando o material
// definido em repairItemId/repairQty. Chamado pelo botão "Consertar" do popup.
function repairChargeableItem(invIdx) {
  const item = G.player.inventory[invIdx];
  if (!item || !item.chargeable || !item._quebrado) return;
  const matId = item.repairItemId || 'po_sombra';
  const need  = item.repairQty || 1;
  const mat   = G.player.inventory.find(i => i.id === matId && i.type === 'material');
  const have  = mat ? (mat.qty || 0) : 0;
  if (have < need) {
    notify(`✖ Faltam materiais: precisa de ${need}× ${ITEM_DB[matId]?.name || matId}.`, 'red');
    return;
  }
  mat.qty -= need;
  if (mat.qty <= 0) G.player.inventory.splice(G.player.inventory.indexOf(mat), 1);
  item._quebrado = false;
  notify(`🔧 ${item.name} consertado!`, 'green');
  appendBattleLog && G.inBattle && appendBattleLog(`🔧 ${item.name} foi consertado e volta a carregar.`, '#60c080');
  buildInventoryGrid();
}

// Fortalece permanentemente o Peitoral do Lorde das Sombras gastando Pó de
// Sombra excedente (o mesmo material do conserto do Coração Incandescente).
// +forjaDefPorNivel DEF / +forjaHpPorNivel HP máx por nível, até forjaMax.
// Chamado pelo botão "🔨 Forjar" do popup de item.
function forjarPeitoralLorde(invIdx) {
  const p = G.player;
  const item = p.inventory[invIdx];
  if (!item || !item.forjavel) return;

  const nivelAtual = item._forjaNivel || 0;
  const nivelMax   = item.forjaMax != null ? item.forjaMax : 10;
  if (nivelAtual >= nivelMax) {
    notify('✖ O Peitoral já atingiu o forjamento máximo.', 'gold');
    return;
  }

  const custo = item.forjaCustoPorNivel || 10;
  const mat   = p.inventory.find(i => i.id === 'po_sombra' && i.type === 'material');
  const have  = mat ? (mat.qty || 0) : 0;
  if (have < custo) {
    notify(`✖ Faltam materiais: precisa de ${custo}× Pó de Sombra (tem ${have}).`, 'red');
    return;
  }

  mat.qty -= custo;
  if (mat.qty <= 0) p.inventory.splice(p.inventory.indexOf(mat), 1);

  const defGanho = item.forjaDefPorNivel != null ? item.forjaDefPorNivel : 1;
  const hpGanho  = item.forjaHpPorNivel  != null ? item.forjaHpPorNivel  : 3;

  item._forjaNivel = nivelAtual + 1;
  item.def = (item.def || 0) + defGanho;
  item.hp  = (item.hp  || 0) + hpGanho;

  // Se já está equipado, aplica o ganho direto no jogador também — senão
  // só valeria no próximo equipar/desequipar (mesmo padrão de _applyArmorBonus).
  if (item.equipped) {
    p.def   = (p.def   || 0) + defGanho;
    p.maxHp = Math.max(1, (p.maxHp || 1) + hpGanho);
    p.hp    = Math.min((p.hp || 0) + hpGanho, p.maxHp);
  }

  notify(`🔨 ${item.name} forjado! +${defGanho} DEF, +${hpGanho} HP máx — Nível ${item._forjaNivel}/${nivelMax}`, 'gold');
  addLog(`Forjou o ${item.name}: nível ${item._forjaNivel}/${nivelMax} (+${defGanho} DEF, +${hpGanho} HP máx).`, 'info');
  updateHUD();
  buildBagItems();
  updateEquippedGearHUD();
}
window.forjarPeitoralLorde = forjarPeitoralLorde;

// ── Forjar Couraça do Rei da Selva ──
// Sistema de upgrade com Essência do Rei da Selva (3 níveis máximo)
// Cores por nível: I → Vermelho/Ouro | II → Dourado/Amarelo | III → Azul Marinho
function forjarCouracaReiSelva(invIdx) {
  const p = G.player;
  const item = p.inventory[invIdx];
  if (!item || !item.forjavel) return;

  const nivelAtual = item._forjaNivel || 0;
  const nivelMax   = item.forjaMax != null ? item.forjaMax : 3;
  if (nivelAtual >= nivelMax) {
    notify('✖ A Couraça já atingiu o aperfeiçoamento máximo (nível 3).', 'gold');
    return;
  }

  const custo = 1; // 1 Essência por nível
  const mat   = p.inventory.find(i => i.id === 'essencia_rei_selva' && i.type === 'material');
  const have  = mat ? (mat.qty || 1) : 0;
  if (have < custo) {
    notify(`✖ Faltam Essências: precisa de ${custo}× Essência do Rei da Selva (tem ${have}).`, 'red');
    return;
  }

  mat.qty = (mat.qty || 1) - custo;
  if (mat.qty <= 0) p.inventory.splice(p.inventory.indexOf(mat), 1);

  const defGanho = item.forjaDefPorNivel != null ? item.forjaDefPorNivel : 2;
  const hpGanho  = item.forjaHpPorNivel  != null ? item.forjaHpPorNivel  : 15;

  item._forjaNivel = nivelAtual + 1;
  item.def = (item.def || 0) + defGanho;
  item.hp  = (item.hp  || 0) + hpGanho;

  // Se já está equipado, aplica o ganho direto no jogador também
  if (item.equipped) {
    p.def   = (p.def   || 0) + defGanho;
    p.maxHp = Math.max(1, (p.maxHp || 1) + hpGanho);
    p.hp    = Math.min((p.hp || 0) + hpGanho, p.maxHp);
  }

  // Renderizar nível com romano e cor específica
  const romanos = ['I', 'II', 'III'];
  const cores   = ['#e8a020', '#ffd700', '#003366']; // Ouro (vermelho-ouro), Dourado (amarelo), Azul Marinho
  const nivelRomano = romanos[item._forjaNivel - 1] || 'I';
  const corNivel    = cores[item._forjaNivel - 1] || '#e8a020';

  notify(`🔨 ${item.name} aperfeiçoado! +${defGanho} DEF, +${hpGanho} HP máx — <span style="color:${corNivel};font-weight:bold;">Nível ${nivelRomano}</span>`, 'gold');
  addLog(`Aperfeiçoou a ${item.name}: nível ${nivelRomano}/${romanos[nivelMax-1]} (+${defGanho} DEF, +${hpGanho} HP máx).`, 'info');
  updateHUD();
  buildBagItems();
  updateEquippedGearHUD();
}
window.forjarCouracaReiSelva = forjarCouracaReiSelva;


// opts.revealPopup: quando true e o item é 'equipamento', mostra o popup de
// detalhes do item (showItemPopup) logo após adicioná-lo à bolsa — usado ao
// abrir baús/caixas, craftar ou receber equipamento de qualquer origem, pra
// sempre revelar o que foi obtido, igual ao pedido do Marcelo.
// ── Itens de cópia única (1 por jogador), mas que PODEM ir pro armazém ──
// Diferente de `unique:true` (que o armazém bloqueia): estes podem ser guardados,
// só que nunca existem duas cópias. Regra: a posse vale pra bolsa + armazém.
// Itens comuns (não listados aqui) seguem normal: empilham/duplicam à vontade.
const ITENS_COPIA_UNICA = ['coleira_tierra', 'caixa_tierra', 'amuleto_inoo',
  // Equipamentos de masmorra (repetir a masmorra não gera outra cópia)
  'prato_kappa', 'coracao_incandescente', 'amuleto_hik_olho_de_eir'];

// ── Regra global: amuleto/armadura de masmorra NÃO se repete ──
// Qualquer drop (loot de inimigo/chefe ou baú) de equipamento de slot
// 'acessorio' ou 'armadura' é ignorado se o jogador já tem o item (bolsa ou
// armazém). Vale pra TODAS as masmorras, inclusive as futuras — não precisa
// registrar id por id. Armas e materiais continuam normais.
function _ehEquipDeMasmorra(it) {
  return !!it && (it.type === 'equipamento' || it.type === 'acessorio')
      && (it.equipSlot === 'acessorio' || it.equipSlot === 'armadura');
}
function equipDeMasmorraJaTem(it) {
  return _ehEquipDeMasmorra(it) && playerTemItem(it.id);
}
window.equipDeMasmorraJaTem = equipDeMasmorraJaTem;
function playerTemItem(id) {
  const _eh = i => i && i.id === id;
  return !!(
    (G.player && G.player.inventory && G.player.inventory.some(_eh)) ||
    (G.armazem && Array.isArray(G.armazem.itens) && G.armazem.itens.some(_eh))
  );
}
window.ITENS_COPIA_UNICA = ITENS_COPIA_UNICA;
window.playerTemItem = playerTemItem;

// ══════════════════════════════════════════════════════════════
//  REGRA GLOBAL DE ITEM ÚNICO (1 cópia por jogador, em qualquer origem)
//  Vale pra: amuletos (slot acessório), peitorais/armaduras (slot armadura),
//  TODOS os selos/runas fixas (Runa Yu etc.), Gadanha, Amuleto Completo de
//  Inazami e os 3 fragmentos dele. Posse = bolsa + armazém + bolsa de selos.
//  Não precisa registrar id por id: item novo de acessório/armadura/selo já
//  entra na regra sozinho. Armas, materiais e consumíveis seguem normais.
// ══════════════════════════════════════════════════════════════
const FRAGMENTOS_INAZAMI_IDS = ['amuleto_quebrado_inazami', 'amuleto_fragmento_eir', 'fragmento_amuleto_final'];
const ITENS_UNICOS_GLOBAIS = ['gadanha_espirito', 'amuleto_completo_inazami', 'runa_yu'].concat(FRAGMENTOS_INAZAMI_IDS);

function itemEhUnicoGlobal(it) {
  if (!it || !it.id) return false;
  if (ITENS_UNICOS_GLOBAIS.includes(it.id) || ITENS_COPIA_UNICA.includes(it.id)) return true;
  const base = (typeof ITEM_DB !== 'undefined' && ITEM_DB[it.id]) || {};
  if (it.isSelo || base.isSelo || it.unique || base.unique) return true;
  const tipo = it.type || base.type;
  const slot = it.equipSlot || base.equipSlot;
  return (tipo === 'equipamento' || tipo === 'acessorio') && (slot === 'acessorio' || slot === 'armadura');
}
function playerPossuiItemGlobal(id) {
  if (!id || !G || !G.player) return false;
  if (playerTemItem(id) || playerPossuiSelo(id)) return true;
  // Fragmentos do amuleto de Inazami: depois de montar o amuleto completo
  // (os fragmentos são consumidos), eles não podem cair/ser dados de novo.
  if (FRAGMENTOS_INAZAMI_IDS.includes(id)) {
    if (playerTemItem('amuleto_completo_inazami')) return true;
    if (G.inazami && G.inazami.portaoAberto) return true;
  }
  return false;
}
// true = esse item é único e o jogador já tem → NÃO entregar / NÃO craftar de novo.
function itemUnicoJaPossuido(it) {
  return itemEhUnicoGlobal(it) && playerPossuiItemGlobal(it.id);
}
window.FRAGMENTOS_INAZAMI_IDS = FRAGMENTOS_INAZAMI_IDS;
window.ITENS_UNICOS_GLOBAIS = ITENS_UNICOS_GLOBAIS;
window.itemEhUnicoGlobal = itemEhUnicoGlobal;
window.playerPossuiItemGlobal = playerPossuiItemGlobal;
window.itemUnicoJaPossuido = itemUnicoJaPossuido;

// ══════════════════════════════════════════════════════════════
//  REGRA UNIVERSAL DE EQUIPAR: no máximo 1 item equipado por slot.
//  Item novo que chega já marcado equipped:true (drop de masmorra,
//  baú, craft...) NUNCA passa por cima do que já está equipado: ele
//  entra na bolsa desequipado. Vale pra qualquer equipamento
//  (amuleto/acessório, peitoral/armadura, arma...), inclusive cópias
//  duplicadas do mesmo item. Runa fixa (isStickyRune) tem slot próprio.
// ══════════════════════════════════════════════════════════════
function _grupoSlotEquip(it) {
  if (!it || it.type !== 'equipamento' || !it.equipSlot) return null;
  return it.equipSlot + (it.isStickyRune ? ':runa' : '');
}
function _slotEquipOcupado(novo) {
  const g = _grupoSlotEquip(novo);
  if (!g || !G || !G.player || !Array.isArray(G.player.inventory)) return false;
  return G.player.inventory.some(i => i && i.equipped && _grupoSlotEquip(i) === g);
}
// Rede de segurança: se por qualquer caminho (save antigo, masmorra que seta
// equipped direto...) ficarem 2+ itens equipados no mesmo slot, mantém UM e
// desmarca os outros. Mantém o que teve o bônus aplicado (_accBonusApplied);
// se for empate, o mais antigo da bolsa. Se o excedente tinha bônus aplicado,
// reverte o bônus dele pra não ficar stat fantasma.
function garantirUmEquipadoPorSlot() {
  const p = G && G.player;
  const inv = p && p.inventory;
  if (!Array.isArray(inv)) return false;
  const grupos = {};
  inv.forEach(it => {
    const g = _grupoSlotEquip(it);
    if (g && it.equipped) (grupos[g] = grupos[g] || []).push(it);
  });
  let mudou = false;
  Object.keys(grupos).forEach(g => {
    const lista = grupos[g];
    if (lista.length < 2) return;
    const wId = p.equippedWeapon && p.equippedWeapon.id;
    const manter = (g === 'weapon' && wId && lista.find(i => i.id === wId))
                || lista.find(i => i._accBonusApplied)
                || lista[0];
    lista.forEach(it => {
      if (it === manter) return;
      if (it._accBonusApplied) {
        if (it.atk)  p.atk = Math.max(0, (p.atk || 0) - it.atk);
        if (it.def)  p.def = Math.max(0, (p.def || 0) - it.def);
        if (it.spd)  p.spd = Math.max(0, (p.spd || 0) - it.spd);
        if (it.mag)  p.mag = Math.max(0, (p.mag || 0) - it.mag);
        if (it.crit) p.critBonus = Math.max(0, (p.critBonus || 0) - it.crit / 100);
        if (it.hp)   { p.maxHp = Math.max(1, (p.maxHp || 1) - it.hp); p.hp = Math.min(p.hp || 0, p.maxHp); }
        if (it.mp)   { p.maxMp = Math.max(0, (p.maxMp || 0) - it.mp); p.mp = Math.min(p.mp || 0, p.maxMp); }
        if (it._hpPctFlat) { p.maxHp = Math.max(1, (p.maxHp || 1) - it._hpPctFlat); p.hp = Math.min(p.hp || 0, p.maxHp); it._hpPctFlat = 0; }
      }
      it.equipped = false;
      it._accBonusApplied = false;
      mudou = true;
    });
  });
  return mudou;
}
window.garantirUmEquipadoPorSlot = garantirUmEquipadoPorSlot;
// A bolsa (bag.js) carrega depois: embrulha buildBagItems pra sempre limpar duplicados antes de desenhar.
window.addEventListener('load', function () {
  const o = window.buildBagItems;
  if (typeof o === 'function' && !o._umPorSlot) {
    const w = function () { try { garantirUmEquipadoPorSlot(); } catch (e) {} return o.apply(this, arguments); };
    w._umPorSlot = true;
    window.buildBagItems = w;
  }
});

function addItem(item, qty = 1, opts = {}) {
  const normalized = _normalizeItem(item);

  // ── TRAVA CENTRAL DE ITEM ÚNICO (qualquer origem: drop, baú, craft, quest) ──
  // Item único que o jogador já tem (bolsa, armazém ou selos) nunca entra de novo.
  // Exceção: item `unique` que já está na bolsa segue pro ramo logo abaixo, que
  // só cuida de equipar (não duplica).
  if (itemEhUnicoGlobal(normalized) && playerPossuiItemGlobal(normalized.id)
      && !(normalized.unique && G.player.inventory.some(i => i.id === normalized.id))) {
    buildInventoryGrid();
    return;
  }

  // Cópia única: se já existe na bolsa OU no armazém, não cria outra.
  if (ITENS_COPIA_UNICA.includes(normalized.id) && playerTemItem(normalized.id)) {
    buildInventoryGrid();
    return;
  }

  // ── Mapa da Cidade das Pedra (entregue pelo taberneiro): registra o
  // recebimento e libera o botão do Mapa-Múndi na hora.
  if (normalized.id === 'mapa_cidade_pedra') {
    G.mapaTaberneiroRecebido = true;
    setTimeout(() => { if (typeof atualizarBotaoMinimapa === 'function') atualizarBotaoMinimapa(); }, 0);
  }

  // ── Selos (isSelo:true) nunca entram na bolsa comum de Itens — vão direto
  // pra Bolsa de Selos (guardados por padrão). Sem isso, o item ficava na
  // bolsa comum até a próxima migração de save (loadGame), e o jogador podia
  // acabar equipando ele como acessório normal por engano.
  if (normalized.isSelo) {
    if (!G.player.selosGuardados) G.player.selosGuardados = [];
    if (!G.player.selosEquipados) G.player.selosEquipados = [];
    const jaTem = G.player.selosGuardados.some(s => s.id === normalized.id)
               || G.player.selosEquipados.some(s => s.id === normalized.id);
    if (jaTem) { buildInventoryGrid(); return; }
    const seloNovo = Object.assign({}, normalized, {
      _uid: 'selo_' + Date.now() + '_' + Math.floor(Math.random() * 100000)
    });
    delete seloNovo.equipped; // equip agora é a posição no array, não uma flag
    if (G.player.selosGuardados.length < 16) {
      G.player.selosGuardados.push(seloNovo);
      notify(`🔴 ${normalized.name} guardado na Bolsa de Selos!`, 'purple');
    } else {
      notify('⚠ Bolsa de Selos cheia — não foi possível guardar o selo.', 'red');
    }
    buildInventoryGrid();
    if (window.QuestBoard) QuestBoard.onItemCollected(normalized.id, qty);
    return;
  }

  const existing = G.player.inventory.find(i => i.id === normalized.id && i.type === normalized.type);
  if (existing && normalized.unique) {
    // Item marcado como único (ex.: Amuleto da Bênção de Yuki, Pedra da
    // Sacerdotisa Negra, Amuleto Quebrado de Inazami) — já está na bolsa,
    // não gera uma segunda cópia nem soma quantidade, mesmo que addItem
    // seja chamado de novo por engano (evento de história re-disparado,
    // guard de save falhando, etc.). PRECISA vir antes do branch de baixo:
    // como esse outro branch só exclui 'equipamento', ele capturava
    // qualquer item único de outro tipo (chave, material...) primeiro e
    // ficava somando qty como se não fosse único.
    //
    // FIX: antes de marcar equipped=true aqui, checa se já existe outro
    // item equipado no MESMO slot (equipSlot). Sem essa checagem, dois
    // acessórios (ex.: Amuleto de Tierra + Amuleto da Bênção de Yuki)
    // podiam ficar com equipped=true ao mesmo tempo — sem passar pelo
    // fluxo normal de equipar, que desequipa o anterior e aplica o bônus.
    // Isso deixava a bolsa mostrando "EQUIPADO" nos dois, e podia
    // desequipar o item errado depois (o .find() pega só o primeiro).
    if (normalized.equipped && !existing.equipped) {
      const conflito = normalized.equipSlot
        ? G.player.inventory.find(i => i.equipSlot === normalized.equipSlot && i.equipped && i.id !== existing.id)
        : null;
      if (!conflito) existing.equipped = true;
      // Se já tem outro item equipado nesse slot, não força o flag — o
      // item fica na bolsa desequipado, e o jogador pode trocar manualmente.
    }
  } else if (existing && normalized.type !== 'equipamento') {
    if (!existing.imgSrc && normalized.imgSrc) existing.imgSrc = normalized.imgSrc;
    if (!existing.icon  && normalized.icon)   existing.icon   = normalized.icon;
    existing.qty = (existing.qty || 1) + qty;
  } else {
    const novoItem = { ...normalized, qty };
    // Regra universal: se o slot já tem algo equipado, o item novo entra DESEQUIPADO (não passa por cima).
    if (novoItem.equipped && _slotEquipOcupado(novoItem)) { novoItem.equipped = false; novoItem._accBonusApplied = false; }
    G.player.inventory.push(novoItem);
  }
  garantirUmEquipadoPorSlot();
  buildInventoryGrid();
  if (window.QuestBoard) QuestBoard.onItemCollected(normalized.id, qty);
  if (typeof renderCraftTrackerPanel === 'function' && window.CRAFT_PIN && CRAFT_PIN.length) renderCraftTrackerPanel();

  // Revela o item obtido (amuleto, armadura, arma...) com o popup de detalhes,
  // não importa a origem (baú, craft, drop de chefe).
  if (opts.revealPopup && normalized.type === 'equipamento') {
    const idx = G.player.inventory.findIndex(i => i.id === normalized.id);
    if (idx !== -1 && typeof showItemPopup === 'function') {
      setTimeout(() => showItemPopup(idx, G.player.inventory[idx]), 350);
    }
  }
}

// Verifica se o jogador tem a Runa Yu equipada (proteção contra o pó corrosivo da Cidade das Pedra).
// Útil pra gating futuro de dano/eventos na região.
// Checa a Bolsa de Selos (sistema atual, pós-migração) e o inventário comum
// (fallback pra saves antigos que ainda não passaram pela migração).
function playerTemRunaYu() {
  if (!G || !G.player) return false;
  const naBolsaDeSelos = !!(G.player.selosEquipados && G.player.selosEquipados.some(s => s.id === 'runa_yu'));
  const noInventario = !!(G.player.inventory && G.player.inventory.some(i => i.id === 'runa_yu' && i.equipped));
  return naBolsaDeSelos || noInventario;
}
window.playerTemRunaYu = playerTemRunaYu;

// ── Runa Yu: posse + entrega ──
// (vilarejo.js chamava darRunaYuEquipada() e playerPossuiRunaYu(), mas as duas NÃO existiam:
//  a cutscene da Yuki dava erro e a runa nunca era entregue.)
// Tem a Runa Yu em QUALQUER lugar? (selos equipados/guardados ou bolsa comum)
function playerPossuiRunaYu() {
  if (!G || !G.player) return false;
  return [].concat(G.player.selosEquipados || [], G.player.selosGuardados || [], G.player.inventory || [])
           .some(it => it && it.id === 'runa_yu');
}
window.playerPossuiRunaYu = playerPossuiRunaYu;

// Entrega a Runa Yu direto na Bolsa de Selos: equipa se houver slot livre (máx 3),
// senão guarda (máx 16). Não duplica. Retorna true se entregou agora.
function darRunaYuEquipada() {
  if (!G || !G.player || !ITEM_DB || !ITEM_DB.runa_yu) return false;
  if (playerPossuiRunaYu()) return false;
  if (!G.player.selosEquipados) G.player.selosEquipados = [];
  if (!G.player.selosGuardados) G.player.selosGuardados = [];
  const runa = Object.assign({}, ITEM_DB.runa_yu, { _uid: 'selo_' + Date.now() + '_yu' });
  delete runa.equipped;
  if (G.player.selosEquipados.length < 3) G.player.selosEquipados.push(runa);
  else if (G.player.selosGuardados.length < 16) G.player.selosGuardados.push(runa);
  else { G.player.inventory.push(runa); } // as duas bolsas de selo cheias: cai na bolsa comum
  if (typeof buildInventoryGrid === 'function') { try { buildInventoryGrid(); } catch (e) {} }
  if (typeof updateHUD === 'function') { try { updateHUD(); } catch (e) {} }
  return true;
}
window.darRunaYuEquipada = darRunaYuEquipada;

// Recupera a runa de quem foi vítima do bug: tem o Mapa da Cidade das Pedra (entregue logo
// antes da Yuki) mas nunca recebeu a runa. Roda ao carregar o save; também dá pra chamar
// recuperarRunaYu() no console.
function recuperarRunaYu() {
  if (!G || !G.player) return false;
  const temMapa = (G.player.inventory || []).some(i => i && i.id === 'mapa_cidade_pedra');
  if (!(temMapa || G.cidadePedraLiberada)) return false;
  if (!darRunaYuEquipada()) return false;
  G.cidadePedraLiberada = true;
  if (typeof notify === 'function') notify('🔯 Runa Yu recuperada na sua Bolsa de Selos!', 'purple');
  if (typeof addLog === 'function') addLog('A Runa Yu que Yuki te entregou foi recuperada.', 'xp');
  return true;
}
window.recuperarRunaYu = recuperarRunaYu;

// Selo da Força — multiplicador de dano BRUTO (antes da DEF do inimigo).
// Retorna 1.10 se o selo estiver equipado no slot de Selo, senão 1.
// USO: multiplique o termo de ATQ por isto ANTES de subtrair a defesa do
// inimigo. Ex. na fórmula do Arqueiro (calcArrowDmg): em vez de
//   base = Math.max(1, (p.atk + atkMod) - Math.floor(defUsed/2) + rng);
// fica
//   const seloMult = getSeloForcaMult();
//   base = Math.max(1, Math.floor((p.atk + atkMod) * seloMult) - Math.floor(defUsed/2) + rng);
// Cada classe calcula o dano básico no seu próprio arquivo — essa função só
// devolve o multiplicador; quem chama decide onde aplicar.
function getSeloForcaMult() {
  const equipado = !!(G && G.player && G.player.selosEquipados &&
    G.player.selosEquipados.some(s => s.id === 'selo_forca'));
  if (!equipado) return 1;
  return 1 + (ITEM_DB.selo_forca.dmgBrutoPct || 0);
}
window.getSeloForcaMult = getSeloForcaMult;

// ── Selo da Força — bônus de dano bruto em UMA skill "de assinatura",
// que muda de acordo com a classe do jogador:
//   Paladino  → Golpe Sagrado   (skillKey 'golpe_sagrado')
//   Assassino → Kuroen          (skillKey 'kuroen')
//   Arqueiro  → Chuva de Flechas(skillKey 'chuva_flechas')
//   Mago      → o elemento que o jogador escolheu como inicial
//               (p.elementoEscolhido → skillKey 'elem_<elemento>')
// O bônus é sorteado entre 8% e 10% a CADA uso da skill (não é fixo).
// Isso é além do +10% do ataque básico — os dois efeitos coexistem.
const SELO_FORCA_SKILL_POR_CLASSE = {
  paladino:  'golpe_sagrado',
  assassino: 'kuroen',
  arqueiro:  'chuva_flechas'
};
const SELO_FORCA_ELEMENTO_NOME = {
  fogo:'Fogo', agua:'Água', eletrico:'Elétrico', gelo:'Gelo', planta:'Planta',
  terra:'Terra', energia:'Energia', magia_negra:'Magia Negra', vento:'Vento',
  caos:'Caos', veneno:'Veneno', luz:'Luz'
};

// Retorna a skillKey "alvo" do selo para o jogador atual, ou null se a
// classe não tiver uma skill de assinatura definida (ou Mago sem elemento
// escolhido ainda).
function getSeloForcaSkillAlvo(p) {
  if (!p) return null;
  if (p.class === 'mago') {
    return p.elementoEscolhido ? ('elem_' + p.elementoEscolhido) : null;
  }
  return SELO_FORCA_SKILL_POR_CLASSE[p.class] || null;
}
window.getSeloForcaSkillAlvo = getSeloForcaSkillAlvo;

// Nome de exibição da skill-alvo atual, usado na descrição do item.
function getSeloForcaSkillNome(p) {
  if (!p) return null;
  if (p.class === 'paladino')  return 'Golpe Sagrado';
  if (p.class === 'assassino') return 'Kuroen';
  if (p.class === 'arqueiro')  return 'Chuva de Flechas';
  if (p.class === 'mago') {
    return p.elementoEscolhido
      ? SELO_FORCA_ELEMENTO_NOME[p.elementoEscolhido]
      : 'seu elemento (ainda não escolhido)';
  }
  return null;
}
window.getSeloForcaSkillNome = getSeloForcaSkillNome;

// Retorna a descrição completa e atualizada do Selo da Força, já citando a
// skill de assinatura da classe atual (ou o elemento escolhido, no Mago).
function getSeloForcaDescCompleta() {
  const base = 'Selo gravado com runas de força ancestral. Uma vez equipado no slot de Selo, permanece ativo com qualquer armadura, até você mesmo decidir desequipá-lo. Aumenta em 10% o dano bruto dos seus ataques básicos.';
  const p = G && G.player;
  const skillNome = getSeloForcaSkillNome(p);
  if (!skillNome) return base;
  return base + ` Também concede +8~10% de dano bruto extra (sorteado a cada uso) na skill ${skillNome}.`;
}
window.getSeloForcaDescCompleta = getSeloForcaDescCompleta;

// Bônus percentual (0.08–0.10) de dano bruto do Selo da Força PARA UMA
// SKILL ESPECÍFICA. Retorna 0 se: o selo não estiver equipado, ou skillKey
// não for a skill-alvo da classe atual. Sorteia um novo valor a cada
// chamada — chame UMA VEZ por uso de skill e reutilize o resultado em
// golpes múltiplos (ex. Kuroen, Chuva de Flechas), para manter o mesmo
// bônus em todos os hits daquele uso.
function getSeloForcaSkillBonus(p, skillKey) {
  const equipado = !!(G && G.player && G.player.selosEquipados &&
    G.player.selosEquipados.some(s => s.id === 'selo_forca'));
  if (!equipado) return 0;
  const alvo = getSeloForcaSkillAlvo(p);
  if (!alvo || skillKey !== alvo) return 0;
  return 0.08 + Math.random() * 0.02; // 8% a 10%
}
window.getSeloForcaSkillBonus = getSeloForcaSkillBonus;

// ─────────────────────────────────────────────────────────────
//  SELO ANCORADO — elo de sangue. Enquanto a DEF do jogador for MAIOR
//  que a do inimigo, toda cura recebida por um lado é replicada
//  integralmente pro outro (não importa quem curou primeiro).
//
//  IMPORTANTE: pra esse selo funcionar, toda cura em batalha (sua ou do
//  inimigo) precisa passar por aplicarCuraComLink() em vez de mexer
//  direto em p.hp / bs.enemyHp. Hoje isso já está plugado em:
//    - poções/itens de cura em batalha (useItemInBattle)
//    - regeneração passiva do jogador (Aura/Runa, tick por turno)
//    - a reação genérica do inimigo "percebe o veneno e se cura"
//  Curas específicas de bosses em outros arquivos (Kappa, Colhedor de
//  Almas, Ecorrom, Eir etc.) ainda não passam por aqui — precisam ser
//  adaptadas arquivo por arquivo pra também disparar o elo.
// ─────────────────────────────────────────────────────────────
function playerTemSeloAncorado() {
  return !!(G.player.selosEquipados && G.player.selosEquipados.some(s => s.id === 'selo_ancorado'));
}
window.playerTemSeloAncorado = playerTemSeloAncorado;

function aplicarCuraComLink(alvo, quantidade) {
  const bs = battleState;
  const p = G.player;
  if (!bs || !p || quantidade <= 0) return 0;
  const e = bs.enemyData;
  let curadoReal = 0;

  // ── Fúria da Floresta (Guardiã Yokai — Floresta Maligna): bloqueia
  // TODA recuperação de HP do jogador (poções, skills, HuBi) por N turnos ──
  if (alvo === 'player' && bs._curaBloqueadaTurns > 0) {
    appendBattleLog('😱 Fúria da Floresta ainda ecoa — sua recuperação de HP continua bloqueada!', '#7a9a5a');
    if (typeof showFloatingNumber === 'function') showFloatingNumber('hero', '🚫💚', 'status');
    return 0;
  }

  if (alvo === 'player') {
    const antes = p.hp;
    p.hp = Math.min(p.maxHp, p.hp + quantidade);
    curadoReal = p.hp - antes;
  } else {
    const antes = bs.enemyHp;
    bs.enemyHp = Math.min(bs.enemyMaxHp, bs.enemyHp + quantidade);
    curadoReal = bs.enemyHp - antes;
  }
  if (curadoReal > 0) showFloatingNumber(alvo === 'player' ? 'hero' : 'enemy', curadoReal, 'heal');

  // Elo de sangue: só replica se a DEF do jogador for maior que a do inimigo
  const linkAtivo = playerTemSeloAncorado() && e && (p.def || 0) > (e.def || 0);
  if (linkAtivo && curadoReal > 0) {
    if (alvo === 'player') {
      const antesE = bs.enemyHp;
      bs.enemyHp = Math.min(bs.enemyMaxHp, bs.enemyHp + curadoReal);
      const replicado = bs.enemyHp - antesE;
      if (replicado > 0) {
        appendBattleLog(`⛓️ SELO ANCORADO! O elo de sangue compartilha ${replicado} HP com ${e.name}!`, '#a02040');
        showFloatingNumber('enemy', replicado, 'heal');
      }
    } else {
      const antesP = p.hp;
      p.hp = Math.min(p.maxHp, p.hp + curadoReal);
      const replicado = p.hp - antesP;
      if (replicado > 0) {
        appendBattleLog(`⛓️ SELO ANCORADO! O elo de sangue compartilha ${replicado} HP com você!`, '#a02040');
        showFloatingNumber('hero', replicado, 'heal');
      }
    }
  }
  return curadoReal;
}
window.aplicarCuraComLink = aplicarCuraComLink;

// ─────────────────────────────────────────────────────────────
//  BOLSA DE SELOS — sistema próprio, separado do inventário comum.
//  Até 3 selos ficam EQUIPADOS ao mesmo tempo (G.player.selosEquipados) e
//  até 16 ficam GUARDADOS aqui (G.player.selosGuardados). Um item é um
//  "selo" quando ITEM_DB[id].isSelo === true. Cada instância guardada tem
//  um _uid próprio (não usamos qty/stack — cada selo ocupa seu slot).
// ─────────────────────────────────────────────────────────────
const SELOS_MAX_EQUIPADOS = 3;
const SELOS_MAX_GUARDADOS = 16;

// Adiciona um selo à Bolsa de Selos (nunca ao inventário comum, exceto se
// a bolsa de guardados já estiver cheia — aí cai no inventário normal
// como fallback, pra não perder o item).
// Selos/runas de drop ÚNICO: só podem existir 1 vez no jogo (como os amuletos únicos).
// O baú sorteia só entre os que o jogador ainda não tem, e o addSeloToBag
// recusa a segunda cópia mesmo que alguma masmorra tente entregar de novo.
const SELOS_DROP_UNICO = ['runa_vazio'];

// Tem esse selo em QUALQUER lugar? (equipado, guardado ou bolsa comum)
function playerPossuiSelo(id) {
  if (!G || !G.player) return false;
  return [].concat(G.player.selosEquipados || [], G.player.selosGuardados || [], G.player.inventory || [])
           .some(it => it && it.id === id);
}
window.SELOS_DROP_UNICO = SELOS_DROP_UNICO;
window.playerPossuiSelo = playerPossuiSelo;

function addSeloToBag(seloBase, qty) {
  qty = qty || 1;
  if (seloBase && playerPossuiSelo(seloBase.id)) {
    return false; // selo é único: já tem (equipado, guardado ou bolsa), não entrega outra cópia
  }
  if (!G.player.selosGuardados) G.player.selosGuardados = [];
  for (let n = 0; n < qty; n++) {
    if (G.player.selosGuardados.length >= SELOS_MAX_GUARDADOS) {
      notify(`🎒 Bolsa de Selos cheia (${SELOS_MAX_GUARDADOS}/${SELOS_MAX_GUARDADOS})! ${seloBase.name} foi para o inventário comum.`, 'red');
      if (typeof addItem === 'function') addItem(seloBase, 1);
      continue;
    }
    const instancia = Object.assign({}, seloBase, {
      _uid: 'selo_' + Date.now() + '_' + Math.floor(Math.random() * 100000)
    });
    delete instancia.equipped;
    G.player.selosGuardados.push(instancia);
  }
  const painel = document.getElementById('bag-content-selos');
  if (painel && painel.style.display !== 'none' && typeof buildBolsaSelos === 'function') buildBolsaSelos();
}
window.addSeloToBag = addSeloToBag;

// Move um selo de "guardado" para "equipado" (toca num slot da grade de 16).
function equiparSelo(uid) {
  const p = G.player;
  if (!p.selosGuardados || !p.selosEquipados) return;
  if (p.selosEquipados.length >= SELOS_MAX_EQUIPADOS) {
    notify(`⚠ Só é possível equipar até ${SELOS_MAX_EQUIPADOS} selos ao mesmo tempo! Desequipe um primeiro.`, 'gold');
    return;
  }
  const idx = p.selosGuardados.findIndex(s => s._uid === uid);
  if (idx === -1) return;
  const selo = p.selosGuardados.splice(idx, 1)[0];
  p.selosEquipados.push(selo);
  notify(`🔴 ${selo.name} equipado!`, 'gold');
  if (typeof addLog === 'function') addLog(`Equipou o selo: ${selo.name}.`, 'info');
  if (typeof buildBolsaSelos === 'function') buildBolsaSelos();
  if (typeof updateHUD === 'function') updateHUD();
}
window.equiparSelo = equiparSelo;

// Move um selo de "equipado" de volta para "guardado" (toca num dos 3 slots de cima).
function desequiparSelo(uid) {
  const p = G.player;
  if (!p.selosGuardados || !p.selosEquipados) return;
  if (p.selosGuardados.length >= SELOS_MAX_GUARDADOS) {
    notify('🎒 Bolsa de Selos guardados cheia! Não há espaço para desequipar.', 'red');
    return;
  }
  const idx = p.selosEquipados.findIndex(s => s._uid === uid);
  if (idx === -1) return;
  const selo = p.selosEquipados.splice(idx, 1)[0];
  p.selosGuardados.push(selo);
  notify(`⚪ ${selo.name} desequipado.`, 'gold');
  if (typeof addLog === 'function') addLog(`Desequipou o selo: ${selo.name}.`, 'info');
  if (typeof buildBolsaSelos === 'function') buildBolsaSelos();
  if (typeof updateHUD === 'function') updateHUD();
}
window.desequiparSelo = desequiparSelo;

// Renderiza a aba "Selos" da Bolsa do Aventureiro: 3 slots de equipar em
// cima, grade de 16 slots de guardar embaixo. Toque num guardado equipa;
// toque num equipado guarda de volta.
function buildBolsaSelos() {
  const el = document.getElementById('bag-selos-content');
  if (!el) return;
  const p = G.player;
  if (!p.selosGuardados) p.selosGuardados = [];
  if (!p.selosEquipados) p.selosEquipados = [];

  const slotCss = (filled, selo) => `
    position:relative;aspect-ratio:1;border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    cursor:${filled ? 'pointer' : 'default'};
    background:radial-gradient(circle at 35% 30%, rgba(90,60,20,0.5), rgba(10,7,3,0.9));
    border:2px solid ${(selo && selo.fortificadoKurosaki) ? 'rgba(190,120,255,0.85)' : (filled ? 'rgba(240,192,64,0.55)' : 'rgba(240,192,64,0.18)')};
    box-shadow:${(selo && selo.fortificadoKurosaki) ? '0 0 14px rgba(170,90,255,0.75), 0 0 10px rgba(240,192,64,0.45) inset' : (filled ? '0 0 10px rgba(240,192,64,0.25) inset' : 'none')};
    transition:all 0.15s;
    -webkit-tap-highlight-color:transparent;-webkit-touch-callout:none;
    -webkit-user-select:none;user-select:none;touch-action:manipulation;
  `.replace(/\s+/g, ' ');

  const seloIconHtml = (selo, sizePct) => {
    if (!selo) return '';
    const imgStyle = `width:${sizePct}%;height:${sizePct}%;object-fit:contain;pointer-events:none;-webkit-user-drag:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;user-select:none;`;
    return selo.imgSrc
      ? `<img src="${selo.imgSrc}" draggable="false" style="${imgStyle}" onerror="this.style.display='none';this.nextElementSibling.style.display='block';"><span style="display:none;font-size:1.5rem;pointer-events:none;">${selo.icon || '🔴'}</span>`
      : `<span style="font-size:1.5rem;pointer-events:none;">${selo.icon || '🔴'}</span>`;
  };

  // ── Selos Equipados (3 slots) ──
  let html = `
    <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:10px;">
      <div style="font-family:'Noto Serif JP',serif;font-size:0.65rem;color:rgba(200,150,10,0.6);letter-spacing:2px;text-transform:uppercase;">
        🔴 Selos Equipados (${p.selosEquipados.length}/${SELOS_MAX_EQUIPADOS})
      </div>
      <span onclick="openSeloTutorial()" style="cursor:pointer;font-size:0.6rem;width:16px;height:16px;line-height:16px;text-align:center;border:1px solid rgba(240,192,64,0.4);border-radius:50%;color:#f0c040;flex-shrink:0;">?</span>
    </div>
    <div style="display:flex;gap:16px;justify-content:center;padding:10px 20px 18px;">
  `;

  // Mostra o tutorial de Selos sozinho na primeira vez que essa aba é aberta
  if (!G._tutorialSeloSeen) {
    G._tutorialSeloSeen = true;
    setTimeout(() => { if (typeof openSeloTutorial === 'function') openSeloTutorial(); }, 250);
  }
  for (let i = 0; i < SELOS_MAX_EQUIPADOS; i++) {
    const selo = p.selosEquipados[i];
    const press = selo ? `onpointerdown="seloPointerDown('${selo._uid}')" onpointerup="seloPointerUp('${selo._uid}', true)" onpointerleave="seloPointerCancel()" oncontextmenu="return false;"` : '';
    html += `<div style="width:66px;${slotCss(!!selo, selo)}" ${press}>
      ${selo ? seloIconHtml(selo, 68) : `<span style="font-size:0.5rem;color:rgba(240,192,64,0.22);letter-spacing:1px;">VAZIO</span>`}
    </div>`;
  }
  html += `</div>`;

  // ── Selos Guardados (grade 4×4 = 16) ──
  html += `
    <div style="font-family:'Noto Serif JP',serif;font-size:0.65rem;color:rgba(200,150,10,0.6);letter-spacing:2px;text-transform:uppercase;text-align:center;margin-bottom:10px;padding-top:8px;border-top:1px solid rgba(200,150,10,0.15);">
      🎒 Selos Guardados (${p.selosGuardados.length}/${SELOS_MAX_GUARDADOS})
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:10px 4px 4px;">
  `;
  for (let i = 0; i < SELOS_MAX_GUARDADOS; i++) {
    const selo = p.selosGuardados[i];
    const press = selo ? `onpointerdown="seloPointerDown('${selo._uid}')" onpointerup="seloPointerUp('${selo._uid}', false)" onpointerleave="seloPointerCancel()" oncontextmenu="return false;"` : '';
    html += `<div style="${slotCss(!!selo, selo)}" ${press}>
      ${selo ? seloIconHtml(selo, 65) : ''}
    </div>`;
  }
  html += `</div>`;

  if (p.selosGuardados.length === 0 && p.selosEquipados.length === 0) {
    html += `<div style="text-align:center;color:#666;font-size:0.72rem;font-style:italic;margin:16px 0 8px;">Nenhum selo obtido ainda.<br><span style="font-size:0.65rem;color:#444;">Selos são encontrados em masmorras e baús especiais.</span></div>`;
  } else {
    html += `<div style="text-align:center;color:rgba(200,150,10,0.35);font-size:0.6rem;font-style:italic;margin-top:12px;">Toque rápido: equipa/guarda. Segure: ver informações.</div>`;
  }

  el.innerHTML = html;
}
window.buildBolsaSelos = buildBolsaSelos;

// ── Toque rápido vs. apertar-e-segurar num slot de selo ──
// Toque curto: equipa (se guardado) ou guarda de volta (se equipado), como
// já funcionava. Apertar e segurar (~450ms): abre um popup com nome +
// descrição completa do selo, sem disparar o equip/unequip.
let _seloLongPressTimer = null;
let _seloLongPressFired = false;

function seloPointerDown(uid) {
  _seloLongPressFired = false;
  clearTimeout(_seloLongPressTimer);
  _seloLongPressTimer = setTimeout(() => {
    _seloLongPressFired = true;
    if (navigator.vibrate) navigator.vibrate(15);
    showSeloInfo(uid);
  }, 450);
}
window.seloPointerDown = seloPointerDown;

function seloPointerUp(uid, estaEquipado) {
  clearTimeout(_seloLongPressTimer);
  if (_seloLongPressFired) { _seloLongPressFired = false; return; } // já mostrou o popup, não equipa/desequipa
  if (estaEquipado) desequiparSelo(uid); else equiparSelo(uid);
}
window.seloPointerUp = seloPointerUp;

function seloPointerCancel() {
  clearTimeout(_seloLongPressTimer);
}
window.seloPointerCancel = seloPointerCancel;

// Mostra um popup com ícone, nome e descrição completa do selo (equipado ou
// guardado — busca nos dois arrays pelo _uid).
function showSeloInfo(uid) {
  const p = G.player;
  const selo = (p.selosEquipados || []).find(s => s._uid === uid) ||
               (p.selosGuardados  || []).find(s => s._uid === uid);
  if (!selo) return;
  const old = document.getElementById('selo-info-overlay');
  if (old) old.remove();
  const overlay = document.createElement('div');
  overlay.id = 'selo-info-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.78);z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px;';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  const iconHtml = selo.imgSrc
    ? `<img src="${selo.imgSrc}" style="width:56px;height:56px;object-fit:contain;" onerror="this.style.display='none';this.nextElementSibling.style.display='block';"><span style="display:none;font-size:2.2rem;">${selo.icon||'🔴'}</span>`
    : `<span style="font-size:2.2rem;">${selo.icon||'🔴'}</span>`;
  overlay.innerHTML = `
    <div style="background:#0f0a04;border:1px solid rgba(200,150,10,0.4);padding:22px 20px;max-width:320px;width:100%;text-align:center;">
      <div style="margin-bottom:10px;">${iconHtml}</div>
      <div style="font-family:'Noto Serif JP',serif;font-size:0.95rem;color:#f0c040;letter-spacing:1px;margin-bottom:12px;">${selo.name}</div>
      <div style="font-size:0.75rem;color:rgba(255,255,255,0.75);line-height:1.6;text-align:left;">${selo.desc || 'Sem descrição.'}</div>
      <button onclick="document.getElementById('selo-info-overlay').remove()" style="margin-top:18px;background:transparent;border:1px solid rgba(200,150,10,0.4);color:rgba(200,150,10,0.7);padding:8px 22px;font-family:'Noto Serif JP',serif;font-size:0.68rem;letter-spacing:2px;cursor:pointer;">FECHAR</button>
    </div>
  `;
  document.body.appendChild(overlay);
}
window.showSeloInfo = showSeloInfo;

// ─────────────────────────────────────────────────────────────
//  11.5 / 11.6 QUADRO DE QUESTS + CONQUISTAS — movido para
//  core/missoes.js (extraído a pedido do Marcelo). Esse arquivo
//  precisa carregar ANTES deste (palDinh.js) no <script> do
//  gat-1.html, pois QUEST_DEFS, QuestBoard, Achievements,
//  getEnemyGoldReward, openQuestBoard/closeQuestBoard/
//  switchQuestTab agora vivem lá.
// ─────────────────────────────────────────────────────────────

// ── Mini-mapa flutuante (substitui o antigo pin "Mapa-Múndi" do vilarejo) ──
// O Mapa-Múndi só é liberado quando as DUAS coisas aconteceram: (1) concluir a
// Dungeon das Sombras e (2) receber o Mapa da Cidade das Pedra do taberneiro.
// Concluir a dungeon sozinho NÃO libera mais o botão. A flag
// G.mapaTaberneiroRecebido é gravada quando o item entra na bolsa (ver addItem),
// e o item na bolsa também vale (cobre saves que já tinham o mapa).
function _temMapaDoTaberneiro() {
  if (G.mapaTaberneiroRecebido) return true;
  const inv = (G.player && G.player.inventory) || [];
  if (inv.some(i => i && i.id === 'mapa_cidade_pedra')) {
    G.mapaTaberneiroRecebido = true;
    return true;
  }
  return false;
}
function _podeUsarMinimapa() {
  return !!G.dungeonSombrasConcluida && _temMapaDoTaberneiro();
}
// Mostra/oculta o botão flutuante agora (usado quando o mapa é entregue sem
// trocar de cena, pra o botão aparecer na hora).
function atualizarBotaoMinimapa() {
  const btn = document.getElementById('minimap-toggle');
  if (btn) btn.classList.toggle('visivel', _minimapaNoLocal(G.location) && _podeUsarMinimapa());
}
// Cenas onde o botão do Mapa-Múndi aparece (viagem rápida). Pra liberar em
// mais lugares, é só adicionar o nome da cena (G.location) aqui.
const _MINIMAPA_LOCAIS = {
  'vilarejo':        'Vilarejo da Pedra Branca',
  'cidade-kurosaki': 'Cidade de Kurosaki',
};
function _minimapaNoLocal(loc) {
  return Object.prototype.hasOwnProperty.call(_MINIMAPA_LOCAIS, loc);
}
window._minimapaNoLocal = _minimapaNoLocal;

// Ajusta o painel do mapa conforme onde o jogador está agora:
// no vilarejo o pin dele mostra "você está aqui"; em outros lugares o pin
// vira um destino de viagem rápida e o painel mostra a localização atual.
function _atualizarMinimapaLocal() {
  const loc = G.location;
  const noVil = loc === 'vilarejo';
  const pin = document.getElementById('mm-pin-vilarejo');
  const label = document.getElementById('mm-pin-vilarejo-label');
  if (pin) { pin.classList.toggle('mundi-here', noVil); pin.style.cursor = noVil ? 'default' : 'pointer'; }
  if (label) label.textContent = noVil ? 'Vilarejo da Pedra Branca (você está aqui)' : 'Vilarejo da Pedra Branca';
  const local = document.getElementById('minimap-local');
  if (local) {
    local.textContent = noVil ? '' : '📍 Você está em: ' + (_MINIMAPA_LOCAIS[loc] || '');
    local.style.display = noVil ? 'none' : 'block';
  }
}
function mmGoToVilarejo() {
  if (G.location === 'vilarejo') return;
  closeMinimap();
  if (typeof storyNode_vilarejo === 'function') storyNode_vilarejo();
}
window.mmGoToVilarejo = mmGoToVilarejo;

window._temMapaDoTaberneiro = _temMapaDoTaberneiro;
window._podeUsarMinimapa = _podeUsarMinimapa;
window.atualizarBotaoMinimapa = atualizarBotaoMinimapa;

function openMinimap() {
  // Trava de segurança: o Mapa-Múndi só existe na história depois que o
  // taberneiro entrega o mapa (pós-Dungeon das Sombras). O botão já fica
  // oculto antes disso (ver setScene), mas essa checagem evita abrir o
  // mapa mesmo se o botão for acionado por algum outro caminho.
  if (!_podeUsarMinimapa()) {
    if (typeof notify === 'function') notify('🔒 Você ainda não tem esse mapa.', 'red');
    return;
  }
  if (typeof updateMundiPins === 'function') updateMundiPins();
  _atualizarMinimapaLocal();
  document.getElementById('minimap-overlay').classList.add('active');
}
window.openMinimap = openMinimap;

function closeMinimap() {
  document.getElementById('minimap-overlay').classList.remove('active');
}
window.closeMinimap = closeMinimap;

function toggleMinimap() {
  const ov = document.getElementById('minimap-overlay');
  if (ov.classList.contains('active')) closeMinimap(); else openMinimap();
}
window.toggleMinimap = toggleMinimap;

// ─────────────────────────────────────────────────────────────
//  12. HABILIDADES
// ─────────────────────────────────────────────────────────────
// Abre/fecha o painel de skills (#skill-battle-btns) que fica escondido
// atrás da classe .sb-hidden. Chamada pelo onclick="toggleHabilidadesMenu()"
// do botão "✨ Habilidades" na barra de ações da batalha (gat-1.html).
function toggleHabilidadesMenu() {
  const el = document.getElementById('skill-battle-btns');
  if (!el) return;
  const abrindo = el.classList.contains('sb-hidden');
  // Sempre reconstrói a lista ao abrir, pra refletir AP/cooldowns atuais.
  if (abrindo && typeof buildSkillList === 'function') buildSkillList();
  el.classList.toggle('sb-hidden');
}
window.toggleHabilidadesMenu = toggleHabilidadesMenu;

function buildSkillList() {
  const container = document.getElementById('skill-battle-btns');
  if (!container) return;
  container.innerHTML = '';
  const cls = G.player.classData;
  if (!cls || !cls.skills) return;
  const isWarrior = ((cls && cls.resource === 'ap') || window.CLASSES.filter(c=>c.resource==='ap').map(c=>c.id).includes(cls.id));

  const equipped  = G.player.equippedSkills;
  // Garante que é um array válido com pelo menos 1 item
  const useFilter = Array.isArray(equipped) && equipped.filter(Boolean).length > 0;

  // Skills base da classe — só mostra as equipadas na Ficha
  cls.skills.forEach((sk, i) => {
    const key = 'b' + i;
    if (sk.lv5Choice || sk.despertarSkill) return; // gerenciado separadamente abaixo
    if (useFilter && !equipped.includes(key)) return;
    if (!isElementoDesbloqueado(sk)) return;
    const btn = document.createElement('button');
    btn.className = 'skill-battle-btn';
    // BUG-07 FIX: usa getSkillCost para mostrar e cobrar o mesmo valor
    const cost = (typeof getSkillCost === 'function')
      ? getSkillCost(sk, G.player)
      : (isWarrior ? (sk.ap || 0) : (sk.mp || 0));
    const res  = isWarrior ? (G.player.ap || 0) : (G.player.mp || 0);
    // Badge de elemento (só mago)
    const elemCarregado = (battleState && battleState._elementoCarregado) || null;
    const elemIcores = { fogo: '🔥', agua: '💧', eletrico: '⚡' };
    let elemBadge = '';
    if (sk.elemento) {
      const eIcon = elemIcores[sk.elemento] || '✦';
      const isCarregado = elemCarregado === sk.elemento;
      elemBadge = `<span style="display:inline-block;margin-left:5px;font-size:0.75rem;background:${isCarregado?'rgba(200,150,10,0.35)':'rgba(255,255,255,0.05)'};border:1px solid ${isCarregado?'rgba(200,150,10,0.7)':'rgba(255,255,255,0.1)'};padding:1px 5px;border-radius:2px;vertical-align:middle;">${eIcon}</span>`;
    }
    const skillIconHTML = sk.iconImg
      ? `<img src="${sk.iconImg}" style="width:22px;height:22px;object-fit:contain;vertical-align:middle;image-rendering:pixelated;margin-right:2px;">`
      : `${sk.icon} `;
    // ── Veneno Rápido exige 1 Frasco Venenoso na bolsa ──
    const needsFrasco = sk.key === 'veneno_rapido';
    const temFrasco = !needsFrasco || (typeof _getItemQty === 'function' && _getItemQty('frasco_veneno') >= 1);
    // ── Cooldown de skills marcadas com cooldownTurns (ex.: Tiro Certeiro do Arqueiro) ──
    const cdRemaining = (sk.cooldownTurns && battleState && battleState._cooldowns) ? (battleState._cooldowns[sk.key] || 0) : 0;
    const onCooldown = cdRemaining > 0;
    btn.innerHTML = `${skillIconHTML}${sk.name}${elemBadge} <span style="opacity:0.6;font-size:0.62rem">(${cost}${isWarrior?'AP':'MP'})</span>${needsFrasco ? ` <span style="opacity:0.55;font-size:0.6rem;">🧪×${(typeof _getItemQty === 'function' ? _getItemQty('frasco_veneno') : 0)}</span>` : ''}${onCooldown ? ` <span style="opacity:0.85;font-size:0.6rem;color:#ff9060;">⏳${cdRemaining}</span>` : ''}`;
    btn.disabled = res < cost || !temFrasco || onCooldown;
    if (needsFrasco && !temFrasco) btn.title = 'Precisa de 1 Frasco Venenoso na bolsa — craft na ferraria de Gozen.';
    if (onCooldown) btn.title = `Em recarga: ${cdRemaining} turno${cdRemaining>1?'s':''} restante${cdRemaining>1?'s':''}.`;
    btn.onclick = () => doBattleAction('skill', i);
    container.appendChild(btn);
  });

  // Skills extras de talentos — só mostra as equipadas na Ficha
  if (typeof getTalentSkills === 'function') {
    getTalentSkills().forEach((sk, i) => {
      const key = 't' + i;
      if (useFilter && !equipped.includes(key)) return;
      const btn = document.createElement('button');
      btn.className = 'skill-battle-btn';
      btn.style.borderColor = 'rgba(200,170,80,0.5)';
      btn.style.background  = 'rgba(200,150,10,0.07)';
      const usesAp = sk.ap !== undefined;
      const cost   = usesAp ? sk.ap : (sk.mp || 0);
      const res    = usesAp ? (G.player.ap || 0) : (G.player.mp || 0);
      btn.innerHTML = `${sk.icon} ${sk.name} <span style="opacity:0.6;font-size:0.62rem">(${cost}${usesAp?'AP':'MP'}) ✦</span>`;
      btn.disabled = res < cost;
      btn.onclick = () => doBattleAction('skill', 'talent_' + i);
      container.appendChild(btn);
    });
  }
  // ── Julgamento Divino: 4º botão fixo (só se escolhido e não for passiva) ──
  const palLv5 = G.player._pal_lv5_chosen;
  if (palLv5 === 'julgamento_divino') {
    const sk5 = cls.skills && cls.skills.find(s => s.key === 'julgamento_divino');
    if (sk5) {
      const cost5 = sk5.ap || 100;
      const apAtual = G.player.ap || 0;
      const btn5 = document.createElement('button');
      btn5.className = 'skill-battle-btn';
      btn5.style.borderColor = 'rgba(200,150,10,0.7)';
      btn5.style.background  = 'rgba(200,150,10,0.08)';
      const skillIdx5 = cls.skills.findIndex(s => s.key === 'julgamento_divino');
      const iconHTML5 = sk5.iconImg
        ? `<img src="${sk5.iconImg}" style="width:22px;height:22px;object-fit:contain;vertical-align:middle;margin-right:2px;">`
        : `${sk5.icon} `;
      btn5.innerHTML = `${iconHTML5}${sk5.name} <span style="opacity:0.6;font-size:0.62rem">(${cost5}AP)</span>`;
      btn5.disabled = apAtual < cost5;
      btn5.onclick = () => doBattleAction('skill', skillIdx5);
      container.appendChild(btn5);
    }
  }

  // ── Terra Fria (Despertar VI da Maça Sagrada): botão fixo, fora dos 3 slots ──
  if (typeof window.macaTerraFriaAddButton === 'function') {
    try { window.macaTerraFriaAddButton(container); } catch (err) { console.warn('[terra_fria] botão falhou:', err); }
  }

  // Atualiza visibilidade do botão de Fusão
  if (typeof updateFusaoBtn === 'function') updateFusaoBtn();
}

// ─────────────────────────────────────────────────────────────
//  12b. FICHA DO HERÓI
// ─────────────────────────────────────────────────────────────
function openCharacterScreen() {
  buildCharacterScreen();
  document.getElementById('char-overlay').classList.add('active');
}

function closeCharacterScreen() {
  document.getElementById('char-overlay').classList.remove('active');
}

function charStat(icon, label, value, color) {
  return `<div class="char-stat-row">
    <span class="char-stat-icon">${icon}</span>
    <span class="char-stat-label">${label}</span>
    <span class="char-stat-val" style="color:${color};">${value}</span>
  </div>`;
}

function buildCharacterScreen(targetId) {
  const p   = G.player;
  const cls = p.classData;
  if (!cls) return;

  const isWarrior    = ((cls && cls.resource === 'ap') || window.CLASSES.filter(c=>c.resource==='ap').map(c=>c.id).includes(cls.id));
  const baseSkills   = cls.skills || [];
  const talentSkills = (typeof getTalentSkills === 'function') ? getTalentSkills() : [];
  const allAvailable = baseSkills.length + talentSkills.length;

  // Remove do array de equipados qualquer skill base que esteja bloqueada
  // (ex.: Água/Elétrico presos num slot de uma sessão/save anterior ao bug ser corrigido)
  let equipped = (p.equippedSkills || []).filter(key => {
    if (!key || typeof key !== 'string' || !key.startsWith('b')) return true;
    const sk = baseSkills[parseInt(key.slice(1))];
    if (sk && (sk.lv5Choice || sk.despertarSkill)) return false; // nunca nos slots normais
    return sk ? (typeof isElementoDesbloqueado !== 'function' || isElementoDesbloqueado(sk)) : true;
  });

  // ── 3 slots fixos ──
  // Garante sempre 3 slots (preenche com skills base DESBLOQUEADAS se vazio).
  // Antes pegava cegamente b0/b1/b2 (Fogo/Água/Elétrico no Mago), ignorando
  // se o elemento estava bloqueado — por isso os 3 iniciais apareciam
  // equipados mesmo antes/sem o jogador escolher. Agora pula bloqueados.
  if (equipped.length < 3) {
    for (let idx = 0; idx < baseSkills.length && equipped.length < 3; idx++) {
      const key = 'b' + idx;
      if (equipped.includes(key)) continue;
      const skCandidate = baseSkills[idx];
      if (skCandidate && (skCandidate.lv5Choice || skCandidate.despertarSkill)) continue;
      if (skCandidate && typeof isElementoDesbloqueado === 'function' && !isElementoDesbloqueado(skCandidate)) continue;
      equipped.push(key);
    }
  }
  if (equipped.length > 3) equipped.splice(3);
  G.player.equippedSkills = equipped;

  const slotsHTML = [0, 1, 2].map(i => {
    const key = equipped[i];
    let sk = null, isTalent = false;
    if (key && key.startsWith('b')) sk = baseSkills[parseInt(key.slice(1))];
    else if (key && key.startsWith('t')) { sk = talentSkills[parseInt(key.slice(1))]; isTalent = true; }
    return sk
      ? `<div class="char-skill-slot filled${isTalent ? ' talent' : ''}" onclick="unequipSkillSlot(${i})" title="Toque para desequipar">
          <div class="char-skill-slot-num">SLOT ${i+1}</div>
          <div class="char-skill-slot-icon">${sk.iconImg ? `<img src="${sk.iconImg}" style="width:36px;height:36px;object-fit:contain;image-rendering:pixelated;" onerror="this.outerHTML='${sk.icon}'">` : sk.icon}</div>
          <span>${sk.name}</span>
          <div class="slot-swap-hint" style="font-size:0.45rem;color:rgba(200,80,60,0.5);letter-spacing:1px;">✕ soltar</div>
        </div>`
      : `<div class="char-skill-slot empty" onclick="openSlotPicker(${i})">
          <div class="char-skill-slot-num">SLOT ${i+1}</div>
          <div class="char-skill-slot-icon" style="font-size:0.9rem;color:rgba(200,150,10,0.2);">+</div>
          <span>Vazio</span>
        </div>`;
  }).join('');

  // ── Lista de skills — toque abre picker de slot ──
  let allSkillsHTML = '';

  baseSkills.forEach((sk, i) => {
    if (sk.lv5Choice || sk.despertarSkill) return; // Habilidades especiais de level 5 / despertar não vão na lista normal
    const key  = 'b' + i;
    const slot = equipped.indexOf(key);
    const isEq = slot >= 0;
    const lvReq = sk.levelRequired || 1;
    const isLocked = !isElementoDesbloqueado(sk);
    const cost = (typeof getSkillCost === 'function')
      ? getSkillCost(sk, p)
      : (isWarrior ? (sk.ap || 0) : (sk.mp || 0));
    // Ação: se bloqueado, avisa; se equipado, desequipa; se não equipado, auto-slot livre ou abre picker
    const isPendingChoice = (p.elementoEscolhido === null) && ELEMENTOS_INICIAIS.includes(sk.elemento || '');
    // Os outros 2 elementos iniciais (não escolhidos) ficam bloqueados PARA SEMPRE,
    // não é um bloqueio por nível — então a mensagem não pode dizer "desbloqueia no LV X"
    const isOutroInicial = isLocked && !isPendingChoice && ELEMENTOS_INICIAIS.includes(sk.elemento || '');
    const clickAction = isLocked
      ? (isPendingChoice
          ? `mostrarEscolhaElementoIngame()`
          : (isOutroInicial
              ? `notify('🔒 ${sk.name} não foi seu elemento inicial — permanece bloqueado.', 'red')`
              : `notify('🔒 ${sk.name} desbloqueia no LV ${lvReq}', 'red')`))
      : (isEq ? `unequipSkillSlot(${slot})` : `autoEquipSkill('${key}')`);
    const iconHTML = isLocked
      ? (isPendingChoice
          ? `<span style="font-size:1.4rem;filter:hue-rotate(0deg);opacity:0.7;">🔮</span>`
          : `<span style="font-size:1.4rem;filter:grayscale(1);opacity:0.5;">🔒</span>`)
      : (sk.iconImg
        ? `<img src="${sk.iconImg}" style="width:36px;height:36px;object-fit:contain;image-rendering:pixelated;" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><span style="display:none;font-size:1.4rem;">${sk.icon}</span>`
        : `<span style="font-size:1.4rem;">${sk.icon}</span>`);
    const lockedLabel = isPendingChoice
      ? `<span style="font-size:0.5rem;color:rgba(200,150,10,0.7);background:rgba(200,150,10,0.12);padding:1px 5px;border-radius:2px;">ESCOLHER</span>`
      : (isOutroInicial
          ? `<span style="font-size:0.5rem;color:rgba(200,80,60,0.6);">BLOQUEADO</span>`
          : (isLocked ? `<span style="font-size:0.5rem;color:rgba(200,80,60,0.6);">LV${lvReq}</span>` : ''));
    allSkillsHTML += `
      <div class="char-skill-card${isEq && !isLocked ? ' char-skill-equipped' : ''}${isLocked ? ' char-skill-locked' : ''}" onclick="${clickAction}" style="${isLocked && !isPendingChoice ? 'opacity:0.4;cursor:not-allowed;' : (isPendingChoice ? 'opacity:0.75;cursor:pointer;border-color:rgba(200,150,10,0.3);' : '')}">
        <div class="char-skill-card-icon">${iconHTML}</div>
        <div class="char-skill-card-info">
          <div class="char-skill-card-name">${sk.name}${isEq && !isLocked ? ` <span class="char-eq-badge">SLOT ${slot+1}</span>` : ''} ${lockedLabel}</div>
          <div class="char-skill-card-desc">${isPendingChoice ? 'Toque para escolher seu elemento inicial.' : sk.desc}</div>
          <div class="char-skill-card-cost">${cost}${isWarrior ? 'AP' : 'MP'}</div>
        </div>
        <div style="font-size:1.1rem;color:${isLocked ? (isPendingChoice ? 'rgba(200,150,10,0.6)' : 'rgba(200,80,60,0.4)') : (isEq ? 'rgba(200,80,60,0.8)' : 'rgba(200,150,10,0.18)')};">${isLocked ? (isPendingChoice ? '✦' : '') : (isEq ? '✕' : '○')}</div>
      </div>`;
  });

  talentSkills.forEach((sk, i) => {
    const key    = 't' + i;
    const slot   = equipped.indexOf(key);
    const isEq   = slot >= 0;
    const usesAp = sk.ap !== undefined;
    const cost   = usesAp ? sk.ap : (sk.mp || 0);
    const clickAction = isEq
      ? `unequipSkillSlot(${slot})`
      : `autoEquipSkill('${key}')`;
    allSkillsHTML += `
      <div class="char-skill-card talent-skill${isEq ? ' char-skill-equipped' : ''}" onclick="${clickAction}">
        <div class="char-skill-card-icon"><span style="font-size:1.4rem;">${sk.icon}</span></div>
        <div class="char-skill-card-info">
          <div class="char-skill-card-name">${sk.name} <span style="font-size:0.52rem;color:rgba(200,170,80,0.65);">✦ TALENTO</span>${isEq ? ` <span class="char-eq-badge">SLOT ${slot+1}</span>` : ''}</div>
          <div class="char-skill-card-desc">${sk.desc}</div>
          <div class="char-skill-card-cost">${cost}${usesAp ? 'AP' : 'MP'} · Talento</div>
        </div>
        <div style="font-size:1.1rem;color:${isEq ? 'rgba(200,80,60,0.8)' : 'rgba(200,150,10,0.18)'};">${isEq ? '✕' : '○'}</div>
      </div>`;
  });

  if (!allSkillsHTML) {
    allSkillsHTML = '<div style="color:rgba(200,150,10,0.3);text-align:center;padding:20px;font-size:0.8rem;font-style:italic;">Nenhuma habilidade disponível.</div>';
  }

  // ── Seção especial: Habilidade de Level 5 do Paladino ──
  let lv5HTML = '';
  const isPaladino = p.classData && p.classData.id === 'paladino';
  if (isPaladino) {
    const chosen = p._pal_lv5_chosen;
    const lv5Sk = baseSkills.find(s => s.lv5Choice && (chosen ? s.key === chosen : true));
    if (chosen) {
      // Já escolheu — mostra a skill ativa
      const sk5 = baseSkills.find(s => s.key === chosen);
      if (sk5) {
        const isPassive = sk5.isPassive;
        const iconHTML5 = sk5.iconImg
          ? `<img src="${sk5.iconImg}" style="width:36px;height:36px;object-fit:contain;border-radius:6px;" onerror="this.outerHTML='<span style=\\'font-size:1.4rem;\\'>${sk5.icon}</span>'">`
          : `<span style="font-size:1.4rem;">${sk5.icon}</span>`;
        lv5HTML = `
          <div style="margin-top:10px;border-top:1px solid rgba(200,150,10,0.18);padding-top:10px;">
            <div style="font-size:0.5rem;letter-spacing:3px;color:rgba(200,150,10,0.5);margin-bottom:6px;">✦ HABILIDADE ESPECIAL · LV 5</div>
            <div class="char-skill-card" style="border-color:rgba(200,150,10,0.5);background:rgba(200,150,10,0.05);cursor:default;">
              <div class="char-skill-card-icon">${iconHTML5}</div>
              <div class="char-skill-card-info">
                <div class="char-skill-card-name">${sk5.name} <span style="font-size:0.48rem;color:rgba(200,150,10,0.7);background:rgba(200,150,10,0.12);padding:1px 5px;border-radius:2px;">${isPassive ? 'PASSIVA' : '4ª SKILL'}</span></div>
                <div class="char-skill-card-desc">${sk5.desc}</div>
                <div class="char-skill-card-cost" style="color:rgba(200,150,10,0.5);">${isPassive ? 'Sempre ativa' : sk5.ap + 'AP · Slot fixo'}</div>
              </div>
              <div style="font-size:0.8rem;color:rgba(200,150,10,0.5);">🔒</div>
            </div>
          </div>`;
      }
    } else if ((p.level || 1) < 5) {
      // Ainda não chegou ao level 5
      lv5HTML = `
        <div style="margin-top:10px;border-top:1px solid rgba(200,150,10,0.1);padding-top:10px;">
          <div style="font-size:0.5rem;letter-spacing:3px;color:rgba(200,150,10,0.3);margin-bottom:6px;">✦ HABILIDADE ESPECIAL · LV 5</div>
          <div style="font-size:0.6rem;color:rgba(200,150,10,0.3);font-style:italic;padding:8px 0;">Desbloqueada ao atingir o Level 5.</div>
        </div>`;
    }
    // se level >= 5 mas não escolheu ainda, a tela de escolha deve aparecer — não mostramos nada aqui
  }
  // ── Terra Fria: card da skill do Despertar VI (travado até liberar) ──
  if (typeof window.macaTerraFriaFichaHTML === 'function') {
    try { lv5HTML += window.macaTerraFriaFichaHTML(p); } catch (err) { console.warn('[terra_fria] card falhou:', err); }
  }

  // ── Render Habilidades (3 slots + lista) ──
  const habsHTML = `
    <div class="char-section">
      <div class="char-section-title">⚡ HABILIDADES EM BATALHA</div>
      <div class="char-skill-slots">${slotsHTML}</div>
      <div class="char-section-sub">Toque numa habilidade para escolher em qual slot colocar</div>
      <div class="char-skills-list">${allSkillsHTML}</div>
      ${lv5HTML}
    </div>`;

  // ── Decide onde renderizar ──
  const containerId = targetId || 'char-content';
  if (containerId === 'char-content') {
    // Overlay simples (char-overlay): só perfil
    document.getElementById(containerId).innerHTML = perfilHTML;
  } else {
    // Overlay de talentos: só habilidades (árvore de talentos renderizada separado)
    document.getElementById(containerId).innerHTML = habsHTML;
  }
}

// ── Abre popup para escolher qual slot recebe a skill ──
function openSlotPickerForSkill(key) {
  const p   = G.player;
  const cls = p.classData;
  const baseSkills   = cls ? (cls.skills || []) : [];
  const talentSkills = (typeof getTalentSkills === 'function') ? getTalentSkills() : [];
  const equipped     = p.equippedSkills || ['b0','b1','b2'];

  // Nome da skill selecionada
  let skName = key, skIcon = '⚡';
  if (key.startsWith('b')) {
    const sk = baseSkills[parseInt(key.slice(1))]; if (sk) { skName = sk.name; skIcon = sk.icon; }
  } else if (key.startsWith('t')) {
    const sk = talentSkills[parseInt(key.slice(1))]; if (sk) { skName = sk.name; skIcon = sk.icon; }
  }

  // Monta nomes dos slots atuais
  const slotNames = [0,1,2].map(i => {
    const k = equipped[i];
    if (!k) return 'Vazio';
    if (k.startsWith('b')) { const s = baseSkills[parseInt(k[1])]; return s ? s.name : '?'; }
    if (k.startsWith('t')) { const s = talentSkills[parseInt(k.slice(1))]; return s ? s.name : '?'; }
    return '?';
  });

  // Remove popup anterior se existir
  const old = document.getElementById('slot-picker-popup');
  if (old) old.remove();

  const popup = document.createElement('div');
  popup.id = 'slot-picker-popup';
  popup.style.cssText = `
    position:fixed;inset:0;z-index:900;background:rgba(0,0,0,0.82);
    display:flex;align-items:center;justify-content:center;padding:20px;
  `;

  popup.innerHTML = `
    <div style="background:#0f0a04;border:1px solid rgba(200,150,10,0.4);padding:22px 18px;width:100%;max-width:340px;">
      <div style="font-family:'Noto Serif JP',serif;font-size:0.7rem;color:rgba(200,150,10,0.5);letter-spacing:4px;margin-bottom:4px;">COLOCAR EM QUAL SLOT?</div>
      <div style="font-size:1.1rem;color:var(--gold2);font-family:'Noto Serif JP',serif;margin-bottom:18px;">${skIcon} ${skName}</div>
      <div style="display:flex;flex-direction:column;gap:9px;margin-bottom:16px;">
        ${[0,1,2].map(i => `
          <button onclick="assignSkillToSlot('${key}', ${i})" style="
            display:flex;align-items:center;justify-content:space-between;
            background:rgba(200,150,10,0.06);border:1px solid rgba(200,150,10,0.25);
            color:var(--gold2);font-family:'Noto Serif JP',serif;font-size:0.75rem;
            padding:10px 14px;cursor:pointer;letter-spacing:1px;width:100%;
          ">
            <span>SLOT ${i+1}</span>
            <span style="color:rgba(200,150,10,0.5);font-size:0.68rem;">${slotNames[i]}</span>
            <span style="color:rgba(200,150,10,0.4);">→</span>
          </button>`).join('')}
      </div>
      <button onclick="document.getElementById('slot-picker-popup').remove()" style="
        width:100%;background:transparent;border:1px solid rgba(200,150,10,0.2);
        color:rgba(200,150,10,0.45);font-family:'Noto Serif JP',serif;font-size:0.68rem;
        padding:8px;cursor:pointer;letter-spacing:2px;
      ">CANCELAR</button>
    </div>
  `;

  document.body.appendChild(popup);
}

// ── Confirma a troca de skill num slot específico ──
function assignSkillToSlot(key, slotIdx) {
  const p = G.player;
  if (!p.equippedSkills) p.equippedSkills = ['b0','b1','b2'];
  while (p.equippedSkills.length < 3) p.equippedSkills.push(null);

  const cls = p.classData;
  const baseSkills   = cls ? (cls.skills || []) : [];
  const talentSkills = (typeof getTalentSkills === 'function') ? getTalentSkills() : [];

  let skName = key;
  if (key.startsWith('b')) { const sk = baseSkills[parseInt(key.slice(1))]; if (sk) skName = sk.name; }
  else if (key.startsWith('t')) { const sk = talentSkills[parseInt(key.slice(1))]; if (sk) skName = sk.name; }

  // Remove a skill de qualquer outro slot onde esteja
  p.equippedSkills = p.equippedSkills.map(k => k === key ? null : k);
  // Coloca no slot escolhido
  p.equippedSkills[slotIdx] = key;
  // Garante exatamente 3
  p.equippedSkills = p.equippedSkills.slice(0, 3);

  // Fecha popup
  const popup = document.getElementById('slot-picker-popup');
  if (popup) popup.remove();

  notify(`✓ "${skName}" no Slot ${slotIdx+1}!`, 'gold');

  // Rebuild
  const inOverlay = document.getElementById('talent-overlay') &&
                    document.getElementById('talent-overlay').style.display === 'flex';
  if (inOverlay) {
    buildCharacterScreen('char-content-tt');
    if (typeof buildPerfilPane === 'function') buildPerfilPane();
  } else {
    buildCharacterScreen();
  }
  buildSkillList();
  saveGame();
}

// ── Abre picker clicando direto no slot ──
function openSlotPicker(slotIdx) {
  const p   = G.player;
  const cls = p.classData;
  const baseSkills   = cls ? (cls.skills || []) : [];
  const talentSkills = (typeof getTalentSkills === 'function') ? getTalentSkills() : [];
  const equipped     = p.equippedSkills || ['b0','b1','b2'];

  const old = document.getElementById('slot-picker-popup');
  if (old) old.remove();

  const popup = document.createElement('div');
  popup.id = 'slot-picker-popup';
  popup.style.cssText = `
    position:fixed;inset:0;z-index:900;background:rgba(0,0,0,0.82);
    display:flex;align-items:center;justify-content:center;padding:20px;
  `;

  const allSkills = [
    ...baseSkills.map((sk, i) => ({ key: 'b'+i, sk })),
    ...talentSkills.map((sk, i) => ({ key: 't'+i, sk, isTalent: true })),
  ];

  const skillBtns = allSkills.map(({ key, sk, isTalent }) => {
    const currentSlot = equipped.indexOf(key);
    const label = currentSlot >= 0 ? `<span style="color:rgba(200,170,80,0.6);font-size:0.62rem;">SLOT ${currentSlot+1}</span>` : '';
    return `<button onclick="assignSkillToSlot('${key}', ${slotIdx})" style="
      display:flex;align-items:center;gap:10px;
      background:rgba(200,150,10,0.05);border:1px solid rgba(200,150,10,0.2);
      color:var(--gold2);font-family:'Noto Serif JP',serif;font-size:0.72rem;
      padding:9px 12px;cursor:pointer;width:100%;text-align:left;
    ">
      <span style="font-size:1.1rem;">${sk.icon}</span>
      <span style="flex:1;">${sk.name}${isTalent ? ' <span style="font-size:0.55rem;color:rgba(200,170,80,0.5);">✦</span>' : ''}</span>
      ${label}
    </button>`;
  }).join('');

  popup.innerHTML = `
    <div style="background:#0f0a04;border:1px solid rgba(200,150,10,0.4);padding:22px 18px;width:100%;max-width:340px;max-height:80vh;overflow-y:auto;">
      <div style="font-family:'Noto Serif JP',serif;font-size:0.7rem;color:rgba(200,150,10,0.5);letter-spacing:4px;margin-bottom:14px;">SLOT ${slotIdx+1} — ESCOLHER HABILIDADE</div>
      <div style="display:flex;flex-direction:column;gap:7px;margin-bottom:14px;">${skillBtns}</div>
      <button onclick="document.getElementById('slot-picker-popup').remove()" style="
        width:100%;background:transparent;border:1px solid rgba(200,150,10,0.2);
        color:rgba(200,150,10,0.45);font-family:'Noto Serif JP',serif;font-size:0.68rem;
        padding:8px;cursor:pointer;letter-spacing:2px;
      ">CANCELAR</button>
    </div>
  `;
  document.body.appendChild(popup);
}

// Mantido por compatibilidade (não usado mais diretamente)
function toggleSkillEquip(key) { openSlotPickerForSkill(key); }

// ── Desequipa skill do slot (toque no slot ocupado ou no card equipado) ──
function unequipSkillSlot(slotIdx) {
  const p = G.player;
  if (!p.equippedSkills) return;
  const key = p.equippedSkills[slotIdx];
  if (!key) return;
  p.equippedSkills[slotIdx] = null;
  const cls = p.classData;
  const baseSkills = cls ? (cls.skills || []) : [];
  let skName = key;
  if (key.startsWith('b')) { const sk = baseSkills[parseInt(key.slice(1))]; if (sk) skName = sk.name; }
  notify(`"${skName}" removido do Slot ${slotIdx + 1}`, 'gold');
  _rebuildCharScreen();
  saveGame();
}

// ── Auto-equipa no primeiro slot vazio; se tudo ocupado, abre picker ──
function autoEquipSkill(key) {
  const p = G.player;
  if (!p.equippedSkills) p.equippedSkills = [null, null, null];
  while (p.equippedSkills.length < 3) p.equippedSkills.push(null);
  // Primeiro slot vazio
  const freeSlot = p.equippedSkills.indexOf(null);
  if (freeSlot >= 0) {
    // Remove de qualquer outro slot onde já esteja
    p.equippedSkills = p.equippedSkills.map(k => k === key ? null : k);
    p.equippedSkills[freeSlot] = key;
    const cls = p.classData;
    const baseSkills = cls ? (cls.skills || []) : [];
    const talentSkills = (typeof getTalentSkills === 'function') ? getTalentSkills() : [];
    let skName = key;
    if (key.startsWith('b')) { const sk = baseSkills[parseInt(key.slice(1))]; if (sk) skName = sk.name; }
    else if (key.startsWith('t')) { const sk = talentSkills[parseInt(key.slice(1))]; if (sk) skName = sk.name; }
    notify(`✓ "${skName}" → Slot ${freeSlot + 1}`, 'gold');
    _rebuildCharScreen();
    saveGame();
  } else {
    // Todos ocupados — abre picker para trocar
    openSlotPickerForSkill(key);
  }
}

// ── Helper: reconstrói a tela de habilidades no contexto certo ──
function _rebuildCharScreen() {
  const inOverlay = document.getElementById('talent-overlay') &&
                    document.getElementById('talent-overlay').style.display === 'flex';
  if (inOverlay) {
    buildCharacterScreen('char-content-tt');
    if (typeof buildPerfilPane === 'function') buildPerfilPane();
  } else {
    buildCharacterScreen();
  }
  buildSkillList();
}


// ▶ Seções 13/14 — História, nodos, Floresta, tutorial e Kael movido para historia.js (era linhas 4026–5745 do palDinh.js original)


//  15. SISTEMA DE BATALHA
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
//  15. SISTEMA DE BATALHA — VERSÃO EXPANDIDA
//  · IA de inimigo com comportamentos variados por tipo
//  · Efeitos de status: veneno, queimadura, lentidão, atordoamento, sangramento
//  · Críticos, combo, contra-ataque passivo
//  · Números de dano flutuantes
//  · Flash de dano + shake visual
//  · Medidor de combo (streak de ataques sem levar dano)
//  · Resistências de inimigo
//  · Barra de turno visual
// ─────────────────────────────────────────────────────────────

// ── Constantes de batalha ──
const BATTLE_CONFIG = {
  CRIT_BASE_CHANCE: 0.08,      // 8% chance crítico base
  CRIT_CHANCE_CAP: 0.75,       // teto máximo de chance de crítico do jogador (75%) — evita itens desperdiçados acima disso
  CRIT_MULTIPLIER: 1.85,       // dano crítico = 185% do normal
  COMBO_WINDOW: 3,             // ataques seguidos para ativar bônus combo
  COMBO_BONUS_DMG: 0.15,       // +15% dano por combo tier
  COUNTER_CHANCE: 0.12,        // 12% de contra-atacar ao defender
  ENEMY_SPECIAL_CHANCE: 0.25,  // 25% inimigo usa ataque especial
  MISS_CHANCE: 0.06,           // 6% base de errar
  DODGE_BONUS_PER_SPD: 0.003,  // cada ponto de VEL = +0.3% esquiva

  POISON_DMG_BASE: 8,
  BURN_DMG_BASE: 10,
  BLEED_DMG_BASE: 6,
};

// Soma o dano crítico (%) de TODOS os itens atualmente equipados (arma,
// armadura, acessório etc). Fonte única de verdade — substitui a leitura
// de p.critDamage, que era um campo acumulado por delta (somado a cada
// Têmpera/Despertar) e nunca era subtraído ao trocar/desequipar a arma,
// deixando bônus de armas antigas "grudados" no personagem para sempre
// (ex.: dano crítico subindo pra 470% mesmo com uma arma de só +120%).
function getEquippedCritDamageBonus(p) {
  if (!p || !p.inventory) return 0;
  let total = 0;
  for (const it of p.inventory) {
    if (it && it.equipped && it.critDamage) total += it.critDamage;
  }
  return total;
}

// Multiplicador de dano crítico efetivo de um personagem: valor base global
// (BATTLE_CONFIG.CRIT_MULTIPLIER) + soma ao vivo do critDamage dos itens
// equipados (ver getEquippedCritDamageBonus acima).
function getCritMultiplier(p) {
  return BATTLE_CONFIG.CRIT_MULTIPLIER + getEquippedCritDamageBonus(p);
}

// Chance de crítico total do jogador, já com o teto (CRIT_CHANCE_CAP) aplicado.
// Fonte única de verdade — usada tanto no cálculo de dano em batalha quanto na
// tela de status (buildBagStatus), pra nunca mostrar um número diferente do
// que realmente é usado no roll. Sem isso, itens de Crit% empilhados podiam
// passar de 100% sem o jogador nunca saber (e sem efeito nenhum acima do cap).
//
// extra: bônus contextuais que só existem durante a própria ação (ex.: Marca
// do Caçador, stack da Flecha Negra) — não fazem parte do total "de base"
// mostrado na ficha, mas entram no roll de fato.
// enemyCritResist: reduz a chance final contra alvos específicos (bosses com
// campo opcional e.critResist; se o inimigo não tiver o campo, vale 0).
function getPlayerCritChance(p, extra, enemyCritResist) {
  extra = extra || 0;
  enemyCritResist = enemyCritResist || 0;
  const critBase = BATTLE_CONFIG.CRIT_BASE_CHANCE + ((p.spd || 0) * 0.003);
  const accCritBonus = p.critBonus || 0; // bônus de acessórios/armas equipadas
  const total = critBase + accCritBonus + extra - enemyCritResist;
  return Math.max(0, Math.min(BATTLE_CONFIG.CRIT_CHANCE_CAP, total));
}

// ── Estado de batalha expandido ──
let battleState = {
  enemyHp: 0,
  enemyMaxHp: 0,
  enemyData: null,
  turnCount: 1,
  phase: 'player',             // 'player' | 'enemy' | 'resolving'

  // Defesa e escudo
  defending: false,
  _shieldActive: false,
  _shieldTurns: 0,

  // Combo do jogador
  comboCount: 0,               // ataques consecutivos sem levar dano
  comboTier: 0,                // 0-3, cada tier +15% dano

  // Efeitos no inimigo
  enemyPoisoned: false,
  enemyPoisonTurns: 0,
  enemyBurning: false,
  enemyBurnTurns: 0,
  enemyMarked: false,
  enemyMarkTurns: 0,
  enemySlowed: false,
  enemySlowTurns: 0,
  enemyStunned: false,
  enemyStunTurns: 0,

  // Efeitos no jogador
  playerPoisoned: false,
  playerPoisonTurns: 0,
  playerBleeding: false,
  playerBleedTurns: 0,
  playerBurning: false,
  playerBurnTurns: 0,
  playerStunned: false,
  playerStunTurns: 0,

  // Buffs do jogador
  _buffAtkTurns: 0,
  _buffAtkAmt: 0,
  _buffDefTurns: 0,
  _buffDefAmt: 0,
  _regenTurns: 0,

  // Buff do Coração Incandescente (ativa quando o amuleto chega a 100% de carga)
  _coracaoAtkAmt: 0,
  _coracaoCritAmt: 0,

  // Stats do inimigo para IA
  enemyTurnAI: 0,              // contador de turno do inimigo
  enemyEnraged: false,         // <30% HP: inimigo fica frenético

  // Memória de ações do jogador — usada pelo inimigo para reagir a padrões
  playerActionHistory: [],     // [{turn, type, key, name, isCrit, tags}], mais recente no fim, máx 4

  // Novos status (Mago — sistema de fusões)
  _enemyFrozen: false,
  _enemyRooted: false,        _enemyRootedTurns: 0,
  _enemyDefDown: false,       _enemyDefDownTurns: 0,  _enemyDefDownAmt: 0,
  _enemyAtkDown: false,       _enemyAtkDownTurns: 0,
  _enemyBlinded: false,       _enemyBlindedTurns: 0,
  _enemyMissNext: false,
  _enemyBuffsCleared: false,
  _playerEvasion: 0,          _playerEvasionTurns: 0,
  _geloNegroDrain: false,
  _plantaDrain: false,        _plantaDrainTurns: 0,
};

// ── Padrões de IA por tipo de inimigo ──
const ENEMY_AI = {
  rato: {
    name: 'frenético',
    specialName: 'Investida Rápida',
    specialIcon: '💨',
    specialDesc: 'Ataca duas vezes em um turno!',
    special(bs, p, e) {
      const d1 = calcEnemyDmg(e, p, bs, 0.7);
      const d2 = calcEnemyDmg(e, p, bs, 0.7);
      applyDmgToPlayer(d1 + d2, bs, p);
      appendBattleLog(`${e.icon || '🐀'} Investida Rápida! Dois ataques: -${d1} e -${d2} HP!`, '#e06040');
    }
  },
  aranha: {
    name: 'venenosa',
    specialName: 'Mordida Venenosa',
    specialIcon: '☠️',
    specialDesc: 'Aplica veneno: sangue envenenado por 4 turnos!',
    special(bs, p, e) {
      const d = calcEnemyDmg(e, p, bs, 0.6);
      applyDmgToPlayer(d, bs, p);
      if (!p._talent_steel_soul) {
        bs.playerPoisoned = true;
        bs.playerPoisonTurns = 4;
        appendBattleLog(`${e.icon || '🕷️'} Mordida Venenosa! -${d} HP + ☠ Veneno por 4 turnos!`, '#60c060');
      } else {
        appendBattleLog(`${e.icon || '🕷️'} Mordida Venenosa! -${d} HP (veneno bloqueado pelo Espírito de Aço!)`, '#60c060');
      }
    }
  },
  corvo: {
    name: 'evasivo',
    specialName: 'Bico Furador',
    specialIcon: '🩸',
    specialDesc: 'Causa sangramento: dano ao longo do tempo!',
    special(bs, p, e) {
      const d = calcEnemyDmg(e, p, bs, 0.9);
      applyDmgToPlayer(d, bs, p);
      if (!p._talent_steel_soul && !p._talent_dark_immune_bleed) {
        bs.playerBleeding = true;
        bs.playerBleedTurns = 3;
        appendBattleLog(`${e.icon || '🐦'} Bico Furador! -${d} HP + 🩸 Sangramento por 3 turnos!`, '#c04040');
      } else {
        appendBattleLog(`${e.icon || '🐦'} Bico Furador! -${d} HP (sangramento bloqueado!)`, '#c04040');
      }
    }
  },
  cobra: {
    name: 'traiçoeira',
    specialName: 'Golpe Relâmpago',
    specialIcon: '⚡',
    specialDesc: 'Ignora defesa — ataque puro!',
    special(bs, p, e) {
      const d = Math.max(1, Math.floor(e.atk * 1.4 + Math.random() * 5));
      applyDmgToPlayer(d, bs, p, true); // ignora DEF
      appendBattleLog(`${e.icon || '🐍'} Golpe Relâmpago! Ignora defesa! -${d} HP!`, '#e08020');
    }
  },
  lobo: {
    name: 'feroz',
    specialName: 'Uivo Selvagem',
    specialIcon: '🌑',
    specialDesc: 'Potencializa o próximo ataque (+50% dano)!',
    special(bs, p, e) {
      bs._wolfEnrage = true;
      appendBattleLog(`${e.icon || '🐺'} Uivo Selvagem! Próximo ataque será devastador!`, '#c040c0');
    }
  },
  tierra: {
    name: 'guardião ancestral',
    specialName: 'Pulso da Terra',
    specialIcon: '🌿',
    specialDesc: 'A floresta inteira vibra — atordoa e causa dano em área!',
    special(bs, p, e) {
      const hpPct = bs.enemyHp / bs.enemyMaxHp;

      // FASE 2 — 50% HP: enraivece, ATQ sobe
      if (hpPct <= 0.5 && !bs._tierraPhase2) {
        bs._tierraPhase2 = true;
        e.atk = Math.floor(e.atk * 1.3);
        appendBattleLog(`🌿 Tierra ruge! A floresta responde — ATQ aumentado!`, '#80c040');
        appendBattleLog(`🌿 "Você ainda respira... Então prove que merece isso."`, '#70b830');

        // Pulso da Terra: dano + atordoa
        const d = Math.max(1, Math.floor(e.atk * 1.2 - p.def / 3 + Math.random() * 6));
        applyDmgToPlayer(d, bs, p);
        appendBattleLog(`🌿 Pulso da Terra! O chão treme! -${d} HP!`, '#80c040');
        showFloatingNumber('hero', d, 'dmg');
        flashDamage('hero');
        return;
      }

      // FASE 3 — 20% HP: desespero da floresta
      if (hpPct <= 0.2 && !bs._tierraPhase3) {
        bs._tierraPhase3 = true;
        appendBattleLog(`🌿 Tierra abaixa a cabeça... as folhas caem ao redor dele em silêncio.`, '#a0d060');
        appendBattleLog(`🌿 "...Você é diferente. Sinto isso agora."`, '#90c050');

        // Ataque final poderoso mas deixa mensagem
        const d = Math.max(1, Math.floor(e.atk * 1.6 - p.def / 4 + Math.random() * 8));
        applyDmgToPlayer(d, bs, p);
        appendBattleLog(`🌿 Último Rugido da Floresta! -${d} HP!`, '#c0e060');
        showFloatingNumber('hero', d, 'dmg');
        flashDamage('hero');
        return;
      }

      // Especial normal: Passos Perdidos — confunde e envenena
      const d = Math.max(1, Math.floor(e.atk * 1.1 - p.def / 3 + Math.random() * 5));
      applyDmgToPlayer(d, bs, p);
      if (!p._talent_steel_soul) {
        bs.playerPoisoned  = true;
        bs.playerPoisonTurns = 2;
        appendBattleLog(`🌿 Passos Perdidos! A floresta te confunde! -${d} HP + ☠ Veneno por 2 turnos!`, '#80c040');
      } else {
        appendBattleLog(`🌿 Passos Perdidos! -${d} HP (veneno bloqueado!)`, '#80c040');
      }
      showFloatingNumber('hero', d, 'dmg');
      flashDamage('hero');
    }
  },
  // ── FASE 2: Samurai Caveira (Forma I) — vento, rápido ──
  samurai_caveira_1: {
    name: 'veloz',
    specialName: 'Corte Gêmeo do Vento',
    specialIcon: '🌪️',
    specialDesc: 'Dois golpes de lâmina em rápida sucessão!',
    special(bs, p, e) {
      const d1 = calcEnemyDmg(e, p, bs, 0.85);
      const d2 = calcEnemyDmg(e, p, bs, 0.85);
      applyDmgToPlayer(d1, bs, p);
      applyDmgToPlayer(d2, bs, p);
      appendBattleLog(`${e.icon || '💀'} Corte Gêmeo do Vento! Dois golpes: -${d1} e -${d2} HP!`, '#a0e0c0');
    }
  },

  // ── FASE 2: Samurai Caveira (Forma II) — vento, forte ──
  samurai_caveira_2: {
    name: 'cortante',
    specialName: 'Lâmina Cortante',
    specialIcon: '🗡️',
    specialDesc: 'Golpe forte e preciso que abre um corte profundo!',
    special(bs, p, e) {
      const d = calcEnemyDmg(e, p, bs, 1.3);
      applyDmgToPlayer(d, bs, p);
      if (!p._talent_steel_soul && !p._talent_dark_immune_bleed) {
        bs.playerBleeding = true;
        bs.playerBleedTurns = 2;
        appendBattleLog(`${e.icon || '💀'} Lâmina Cortante! -${d} HP + 🩸 Sangramento por 2 turnos!`, '#c0a060');
      } else {
        appendBattleLog(`${e.icon || '💀'} Lâmina Cortante! -${d} HP (sangramento bloqueado!)`, '#c0a060');
      }
    }
  },

  // ── KAPPA: Líder Supremo (Boss Final) ──
  kappa_lider: {
    name: 'veloz',
    specialName: 'Pressão das Águas',
    specialIcon: '🌊',
    specialDesc: 'Ataque combinado de sumo e velocidade aquática.',
    special(bs, p, e) {
      const hpPct  = bs.enemyHp / bs.enemyMaxHp;
      const hpPerd = bs.enemyMaxHp - bs.enemyHp; // HP total perdido

      // ── FÚRIA PROGRESSIVA — crítico dobra a cada 500 HP perdidos ──
      // Marcas: 3000, 2500, 2000, 1500, 1000, 500
      const marcas = [3000, 2500, 2000, 1500, 1000, 500];
      const furiaAtual = marcas.filter(m => hpPerd >= m).length; // 0 a 6
      if (!bs._kappaFuriaStage) bs._kappaFuriaStage = 0;
      if (furiaAtual > bs._kappaFuriaStage) {
        bs._kappaFuriaStage = furiaAtual;
        // Crítico base 100 → dobra a cada estágio: 100, 200, 400, 800... (cap 95%)
        bs._kappaCritChance = Math.min(0.95, (e.crit / 100) * Math.pow(2, furiaAtual - 1));
        const pctStr = Math.round(bs._kappaCritChance * 100);
        appendBattleLog(`🔥 FÚRIA PROGRESSIVA! Estágio ${furiaAtual}/6 — Crítico do Kappa: ${pctStr}%!`, '#ff6010');
        showFloatingNumber('enemy', `🔥 CRÍTICO ${pctStr}%`, 'status');
        buildStatusBadges();
      }
      if (!bs._kappaCritChance) bs._kappaCritChance = e.crit / 100; // base

      // Helper: rolar crítico do Kappa
      const _rollKappaCrit = () => Math.random() < bs._kappaCritChance;

      // ── PASSIVA: Kodama-Shiri ──
      if (bs.enemyTurnAI % 5 === 0 && !bs._kodamaCarregado) {
        bs._kodamaCarregado = true;
        bs._kodamaProximoGolpe = true;
        appendBattleLog(`💧 Um símbolo de água brilha próximo ao Kappa...\nKodama-Shiri carregando! Próximo golpe ignora toda a sua defesa!`, '#00ccff');
        showFloatingNumber('enemy', '💧 KODAMA', 'status');
        buildStatusBadges();
        const isCrit = _rollKappaCrit();
        const d = Math.max(1, Math.floor(e.atk * (isCrit ? 1.8 : 0.9) + Math.random() * 6));
        applyDmgToPlayer(d, bs, p);
        appendBattleLog(`🐢 Slam! ${isCrit ? '💥 CRÍTICO! ' : ''}-${d} HP!`, '#0070d0');
        showFloatingNumber('hero', d, isCrit ? 'crit' : 'dmg');
        flashDamage('hero');
        return;
      }

      // Golpe Kodama-Shiri — Dano Verdadeiro
      if (bs._kodamaProximoGolpe) {
        bs._kodamaProximoGolpe = false;
        bs._kodamaCarregado = false;
        bs._kappaExausto = true;
        bs._kappaExaustoTurns = 1;
        const isCrit = _rollKappaCrit();
        const d = Math.max(1, Math.floor(e.atk * (isCrit ? 3.2 : 1.8) + Math.random() * 15));
        applyDmgToPlayer(d, bs, p, true);
        appendBattleLog(`💥 KODAMA-SHIRI! Dano Verdadeiro${isCrit ? ' CRÍTICO' : ''}! Ignora toda defesa! -${d} HP!`, '#00ccff');
        appendBattleLog(`💧 A água da cabeça secou! Kappa fica EXAUSTO por 1 turno! (recebe 50% mais dano)`, '#aaddff');
        showFloatingNumber('hero', d, 'crit');
        showFloatingNumber('enemy', '😮 EXAUSTO', 'status');
        flashDamage('hero');
        buildStatusBadges();
        return;
      }

      // Exausto — pula turno
      if (bs._kappaExausto) {
        bs._kappaExaustoTurns--;
        if (bs._kappaExaustoTurns <= 0) {
          bs._kappaExausto = false;
          appendBattleLog(`🐢 O Kappa recuperou o fôlego! Iniciativa Absoluta retorna!`, '#0070d0');
          buildStatusBadges();
        }
        appendBattleLog(`😮 Kappa está EXAUSTO — perde este turno!`, '#aaddff');
        return;
      }

      // ── Fase Frenética — abaixo de 50% HP ──
      if (hpPct <= 0.50 && !bs._kappaFase2) {
        bs._kappaFase2 = true;
        e.atk = Math.floor(e.atk * 1.30);
        appendBattleLog(`🐢 O Kappa bate no chão com os dois punhos! A sala treme!`, '#0070d0');
        appendBattleLog(`🐢 Modo Frenético! ATQ +30%!`, '#ff6010');
        showFloatingNumber('enemy', '🔥 FÚRIA', 'status');
        const isCrit = _rollKappaCrit();
        const d = Math.max(1, Math.floor(e.atk * (isCrit ? 2.8 : 1.5)));
        applyDmgToPlayer(d, bs, p);
        appendBattleLog(`🐢 Pancada Colossal!${isCrit ? ' 💥 CRÍTICO!' : ''} -${d} HP!`, '#0070d0');
        showFloatingNumber('hero', d, isCrit ? 'crit' : 'dmg');
        flashDamage('hero');
        return;
      }

      // ── Golpe Relâmpago (a cada 2 turnos) — ataque duplo ──
      if (bs.enemyTurnAI % 2 === 0) {
        const isCrit1 = _rollKappaCrit();
        const isCrit2 = _rollKappaCrit();
        const d1 = Math.max(1, Math.floor(e.atk * (isCrit1 ? 1.5 : 0.75) + Math.random() * 6));
        const d2 = Math.max(1, Math.floor(e.atk * (isCrit2 ? 1.5 : 0.75) + Math.random() * 6));
        applyDmgToPlayer(d1, bs, p);
        applyDmgToPlayer(d2, bs, p);
        appendBattleLog(`🐢 Golpe Relâmpago! ${isCrit1?'💥':''}${d1} HP / ${isCrit2?'💥':''}${d2} HP!`, '#00aaff');
        showFloatingNumber('hero', d1 + d2, (isCrit1 || isCrit2) ? 'crit' : 'dmg');
        flashDamage('hero');
        return;
      }

      // ── Pressão das Águas (35% chance) ──
      if (Math.random() < 0.35) {
        const isCrit = _rollKappaCrit();
        const d = Math.max(1, Math.floor(e.atk * (isCrit ? 2.2 : 1.2) + Math.random() * 10));
        applyDmgToPlayer(d, bs, p);
        p.def = Math.max(0, p.def - 4);
        appendBattleLog(`🌊 Pressão das Águas!${isCrit ? ' 💥 CRÍTICO!' : ''} -${d} HP! DEF↓4!`, '#0080c0');
        showFloatingNumber('hero', d, isCrit ? 'crit' : 'dmg');
        showFloatingNumber('hero', 'DEF↓', 'status');
        flashDamage('hero');
        return;
      }

      // Slam de Sumo — ataque normal
      const isCrit = _rollKappaCrit();
      const d = Math.max(1, Math.floor(e.atk * (isCrit ? 2.0 : 1.0) + Math.random() * 8));
      applyDmgToPlayer(d, bs, p);
      appendBattleLog(`🐢 Slam de Sumo!${isCrit ? ' 💥 CRÍTICO!' : ''} -${d} HP!`, '#0070d0');
      showFloatingNumber('hero', d, isCrit ? 'crit' : 'dmg');
      flashDamage('hero');
    }
  },

  // ── KAPPA: Sereia das Profundezas (Fase 2.5) ──
  sereia_kappa: {
    name: 'intocável',
    specialName: 'Canto Abissal',
    specialIcon: '🎵',
    specialDesc: 'A melodia suga a vitalidade do viajante e cura a sereia.',
    special(bs, p, e) {
      const hpPct = bs.enemyHp / bs.enemyMaxHp;

      // ── TRAÇO: Proteção das Águas Profundas ──
      // Escudo de 15% HP Máx por 3 turnos — ativado no turno 1
      if (bs.enemyTurnAI === 1 && !bs._sereiaShieldUsed) {
        bs._sereiaShieldUsed = true;
        bs._sereiaShieldHp = Math.floor(bs.enemyMaxHp * 0.15);
        bs._sereiaShieldTurns = 3;
        bs._sereiaShieldActive = true;
        appendBattleLog(`🌊 Proteção das Águas Profundas! A sereia ergue um escudo de ${bs._sereiaShieldHp} HP por 3 turnos! (+10% resistência a dano)`, '#3090d0');
        showFloatingNumber('enemy', '🌊 ESCUDO', 'status');
        buildStatusBadges();
      }

      // ── TRAÇO RARO: Fúria do Lago — abaixo de 40% HP, uma vez ──
      if (hpPct <= 0.40 && !bs._sereiaFuriaUsed) {
        bs._sereiaFuriaUsed = true;
        bs._sereiaFuria = true;
        bs._sereiaFuriaTurns = 2;
        e.atk = Math.floor(e.atk * 1.20);
        appendBattleLog(`🌊 FÚRIA DO LAGO! A sereia entra em desespero! ATQ +20% por 2 turnos!`, '#ff6030');
        showFloatingNumber('enemy', '🔥 FÚRIA', 'status');
      }

      // ── PASSIVA: Canto de Sereia — a cada 3 turnos, drena HP ──
      if (bs.enemyTurnAI % 3 === 0) {
        const drain = Math.max(8, Math.floor(p.hp * 0.12));
        p.hp = Math.max(1, p.hp - drain);
        bs.enemyHp = Math.min(bs.enemyMaxHp, bs.enemyHp + Math.floor(drain * 0.5));
        appendBattleLog(`🎵 Canto Abissal! A melodia drena sua força! -${drain} HP / Sereia recupera ${Math.floor(drain*0.5)} HP!`, '#5090d0');
        showFloatingNumber('hero', drain, 'dmg');
        showFloatingNumber('enemy', Math.floor(drain*0.5), 'heal');
        flashDamage('hero');
        return;
      }

      // Ataque especial — golpe de água poderoso
      const d = Math.max(1, Math.floor(e.atk * 1.3 + Math.random() * 8));
      applyDmgToPlayer(d, bs, p);
      appendBattleLog(`🌊 Onda Abissal! -${d} HP!`, '#3080c0');
      showFloatingNumber('hero', d, 'dmg');
      flashDamage('hero');
    }
  },

  // ── KAPPA DUNGEON: Ooni Blindado (Fase 2 Boss) ──
  ooni_blindado: {
    name: 'colossal',
    specialName: 'Esmagamento Selvagem',
    specialIcon: '💥',
    specialDesc: 'Golpe devastador: causa 30~45% da Vida Atual do alvo!',
    special(bs, p, e) {
      // PASSIVA — Rugido das Profundezas: a cada 4 turnos aplica sono (stun) por 2 turnos
      if (bs.enemyTurnAI % 4 === 0) {
        if (!p._talent_steel_soul) {
          // FIX: playerStunned nunca era checado em doBattleAction — o sono não
          // impedia ações. Usa a flag de sono (playerSleeping), que já bloqueia.
          bs.playerSleeping = true;
          bs.playerSleepTurns = 2;
          appendBattleLog(`👹 RUGIDO DAS PROFUNDEZAS! As águas tremem — você é tomado pelo sono! 😴 (2 turnos)`, '#4060c0');
          showFloatingNumber('hero', '😴 SONO', 'status');
          buildStatusBadges();
        } else {
          appendBattleLog(`👹 RUGIDO DAS PROFUNDEZAS! O rugido ecoa... mas seu espírito resiste ao sono!`, '#4060c0');
        }
        return;
      }

      // SKILL — Esmagamento Selvagem: 30% de chance, causa 30~45% HP atual
      if (Math.random() < 0.30) {
        const pct = 0.30 + Math.random() * 0.15; // 30% a 45%
        const d   = Math.max(1, Math.floor(p.hp * pct));
        applyDmgToPlayer(d, bs, p, true); // ignora DEF
        appendBattleLog(`👹 Esmagamento Selvagem! A clava esmaga com força bruta! -${d} HP! (${Math.round(pct*100)}% da sua vida atual!)`, '#c06010');
        showFloatingNumber('hero', d, 'crit');
        flashDamage('hero');
        return;
      }

      // Ataque especial padrão — clava poderosa
      const d = Math.max(1, Math.floor(e.atk * 1.4 + Math.random() * 8));
      applyDmgToPlayer(d, bs, p, true); // Clava Brutal sempre ignora DEF
      appendBattleLog(`👹 Clava Brutal! O golpe atravessa sua armadura! -${d} HP!`, '#c06010');
      showFloatingNumber('hero', d, 'dmg');
      flashDamage('hero');
    }
  },

  // ── KAPPA DUNGEON: Guardião do Kappa (Boss Final) ──
  guardiao_kappa: {
    name: 'intocável',
    specialName: 'Esmagamento Selvagem',
    specialIcon: '💥',
    specialDesc: 'Golpe devastador que causa 30~45% da Vida Atual do alvo, ignorando defesa!',
    special(bs, p, e) {
      // PASSIVA — Rugido das Profundezas: a cada 4 turnos aplica sono por 2 turnos
      if (bs.enemyTurnAI % 4 === 0) {
        if (!p._talent_steel_soul) {
          // FIX: playerStunned nunca era checado em doBattleAction — o sono não
          // impedia ações. Usa a flag de sono (playerSleeping), que já bloqueia.
          bs.playerSleeping = true;
          bs.playerSleepTurns = 2;
          appendBattleLog(`👹 RUGIDO DAS PROFUNDEZAS! A caverna treme e as águas recuam — você sente o sono tomar conta! 😴 (2 turnos)`, '#2040a0');
          showFloatingNumber('hero', '😴 SONO', 'status');
          buildStatusBadges();
        } else {
          appendBattleLog(`👹 RUGIDO DAS PROFUNDEZAS! O rugido ressoa por toda a caverna... seu espírito de aço resiste!`, '#2040a0');
        }
        return;
      }

      // FASE 2 — abaixo de 50% HP: enraivece, ATQ sobe
      const hpPct = bs.enemyHp / bs.enemyMaxHp;
      if (hpPct <= 0.5 && !bs._guardiaoPhase2) {
        bs._guardiaoPhase2 = true;
        e.atk = Math.floor(e.atk * 1.25);
        appendBattleLog(`👹 O Guardião do Kappa ruge de dor! Sua armadura racha — mas sua fúria aumenta!`, '#ff6010');
        appendBattleLog(`👹 ATQ do Guardião aumentado! Ele está enraivecido!`, '#ff6010');
        bs.enemyEnraged = true;
        const d = Math.max(1, Math.floor(e.atk * 1.3));
        applyDmgToPlayer(d, bs, p, true);
        appendBattleLog(`👹 Pancada Furiosa! -${d} HP!`, '#ff6010');
        showFloatingNumber('hero', d, 'dmg');
        flashDamage('hero');
        return;
      }

      // SKILL — Esmagamento Selvagem: 30% de chance, 30~45% HP atual
      if (Math.random() < 0.30) {
        const pct = 0.30 + Math.random() * 0.15;
        const d   = Math.max(1, Math.floor(p.hp * pct));
        applyDmgToPlayer(d, bs, p, true);
        appendBattleLog(`👹 Esmagamento Selvagem! A clava desce com todo o peso do guardião! -${d} HP! (${Math.round(pct*100)}% da sua vida atual!)`, '#c05000');
        showFloatingNumber('hero', d, 'crit');
        flashDamage('hero');
        return;
      }

      // Ataque especial normal — clava ignora DEF
      const d = Math.max(1, Math.floor(e.atk * 1.3 + Math.random() * 10));
      applyDmgToPlayer(d, bs, p, true); // Clava Brutal sempre ignora 100% DEF
      appendBattleLog(`👹 Clava Brutal! O golpe esmaga qualquer defesa! -${d} HP!`, '#c05000');
      showFloatingNumber('hero', d, 'dmg');
      flashDamage('hero');
    }
  },

  // ── FASE 3 MINIBOSS: Ogro Guardião — terra, esmagador ──
  ogro_terra: {
    name: 'esmagador',
    specialName: 'Punho Esmagador',
    specialIcon: '🗿',
    specialDesc: 'Golpe de terra bruta que ignora parte da defesa!',
    special(bs, p, e) {
      const d = Math.max(1, Math.floor(e.atk * 1.3 + Math.random() * 6));
      applyDmgToPlayer(d, bs, p, true); // ignora DEF — esmaga a guarda
      appendBattleLog(`${e.icon || '🗿'} Punho Esmagador! O golpe atravessa sua guarda! -${d} HP!`, '#a08050');
    }
  },

  // ── FASE 3 MINIBOSS: Ogro Guardião II — planta, venenoso ──
  ogro_granito: {
    name: 'venenoso',
    specialName: 'Esporos Tóxicos',
    specialIcon: '🌿',
    specialDesc: 'Libera esporos venenosos de seu corpo coberto de musgo!',
    special(bs, p, e) {
      const d = calcEnemyDmg(e, p, bs, 1.0);
      applyDmgToPlayer(d, bs, p);
      if (!p._talent_steel_soul) {
        bs.playerPoisoned = true;
        bs.playerPoisonTurns = 3;
        appendBattleLog(`${e.icon || '🪨'} Esporos Tóxicos! -${d} HP + ☠ Veneno por 3 turnos!`, '#80c060');
      } else {
        appendBattleLog(`${e.icon || '🪨'} Esporos Tóxicos! -${d} HP (veneno bloqueado!)`, '#80c060');
      }
    }
  },

  // ── BOSS FASE 8: Siu — Sacerdotisa Negra (feitiçaria, dreno de cura) ──
  siu_sacerdotisa_negra: {
    name: 'feiticeira sombria',
    specialName: 'Sopro das Sombras',
    specialIcon: '🌑',
    specialDesc: 'Feitiço sombrio que drena vida — todo dano causado por Siu cura parte dela!',
    special(bs, p, e) {
      const hpPct = bs.enemyHp / bs.enemyMaxHp;

      // FASE 2 — abaixo de 50% HP: aprofunda o feitiço, fica mais agressiva
      if (hpPct <= 0.5 && !bs._siuPhase2) {
        bs._siuPhase2 = true;
        e.atk = Math.floor(e.atk * 1.2);
        appendBattleLog(`🌑 Siu fecha os olhos. "Vejo que precisarei de mais que palavras."`, '#9050c0');
        appendBattleLog(`🌑 O feitiço de Siu se aprofunda — ATQ aumentado!`, '#9050c0');
      }

      // Feitiço sombrio: dano mágico + cura 7% do dano causado para Siu
      const d = Math.max(1, Math.floor(e.atk * 1.3 + Math.random() * 6));
      applyDmgToPlayer(d, bs, p);
      const siuHeal = Math.max(1, Math.floor(d * 0.07));
      bs.enemyHp = Math.min(bs.enemyMaxHp, bs.enemyHp + siuHeal);
      appendBattleLog(`🌑 Sopro das Sombras! -${d} HP! Siu absorve ${siuHeal} HP do próprio feitiço.`, '#9050c0');
      showFloatingNumber('hero', d, 'dmg');
      showFloatingNumber('enemy', siuHeal, 'heal');
      flashDamage('hero');
    }
  },

  olho_espectral: {
    name: 'psíquico',
    specialName: 'Olhar Penetrante',
    specialIcon: '👁️',
    specialDesc: 'Ataque psíquico — ignora a maior parte da sua defesa física!',
    special(bs, p, e) {
      // Ataque mental: usa só 15% da DEF (contra os 50% do ataque normal),
      // condizente com a descrição de "algo que não pode ser cortado por aço".
      const d = Math.max(1, Math.floor(e.atk * 1.3 - p.def * 0.15 + Math.random() * 6));
      applyDmgToPlayer(d, bs, p);
      appendBattleLog(`${e.icon || '👁️'} Olhar Penetrante! O ataque psíquico atravessa sua mente — -${d} HP!`, '#a060e0');
      showFloatingNumber('hero', d, 'dmg');
      flashDamage('hero');
    }
  },

  // ── MÉRITO — GORILA (Lendário, encontro raríssimo, 12% de chance) ──
  gorila: {
    name: 'fera lendária',
    specialName: 'Fervor Selvagem',
    specialIcon: '🦍',
    specialDesc: 'Ruge e aumenta o próprio ATQ em 17% por 3 turnos, depois desfere um golpe pesado. Abaixo de 50% HP, entra em fúria permanente.',
    special(bs, p, e) {
      if (!e._atkBase) e._atkBase = e.atk;
      const hpPct = bs.enemyHp / bs.enemyMaxHp;

      // FASE 2 — 50% HP: fúria permanente, soma direto no _atkBase (a passiva de 17%
      // passa a calcular em cima desse valor já maior a partir daqui)
      if (hpPct <= 0.5 && !bs._gorilaFuria) {
        bs._gorilaFuria = true;
        e._atkBase = Math.floor(e._atkBase * 1.3);
        e.critChance = Math.min(0.65, (e.critChance || 0.5) + 0.1);
        appendBattleLog(`🦍 O Gorila ruge com fúria — o chão racha sob seus punhos!`, '#e8a020');
        appendBattleLog(`👑 "Nenhum reino além deste... nenhum rei além de mim."`, '#ffd700');
      }

      // Fervor Selvagem — +17% ATQ por 3 turnos, não empilha enquanto já ativo
      if (!bs._gorilaFervorTurns || bs._gorilaFervorTurns <= 0) {
        e.atk = Math.ceil(e._atkBase * 1.17);
        bs._gorilaFervorTurns = 3;
        appendBattleLog(`💢 Fervor Selvagem! ATQ do Gorila +17% por 3 turnos!`, '#e8a020');
      }

      const d = calcEnemyDmg(e, p, bs, 1.2);
      applyDmgToPlayer(d, bs, p);
      appendBattleLog(`🦍 Golpe brutal! -${d} HP!`, '#c07020');
      showFloatingNumber('hero', d, 'dmg');
      flashDamage('hero');
    }
  },

  // ── FLORESTA MALIGNA: Samurai da Máscara Partida ──
  // "ATK duplicado": abaixo de 50% HP, dobra o próprio ATQ pro resto da luta (uma vez).
  // "Forma Ronin": ao acaso (25% de chance, uma vez por luta), entra em descanso por
  // 2-3 turnos — não ataca, recupera 30-50% do HP máx por turno; enquanto isso, seus
  // ataques básicos só acertam 7% das vezes (ver e._roninAtivo no doBattleAction).
  flm_boss_samurai_mascara: {
    name: 'ronin amaldiçoada',
    specialName: 'Fúria da Máscara',
    specialIcon: '⚔️',
    specialDesc: 'Abaixo de 50% de HP dobra o próprio ATQ. De vez em quando entra em Forma Ronin: para de atacar por 2-3 turnos pra recuperar 30-50% de HP por turno, quase impossível de acertar nesse estado.',
    special(bs, p, e) {
      if (!e._atkBase) e._atkBase = e.atk;

      // ── Já está em Forma Ronin: continua recuperando HP em vez de atacar ──
      if (bs._samuraiRoninTurns > 0) {
        const pct = 0.30 + Math.random() * 0.20; // 30% a 50%
        const alvo = Math.max(1, Math.floor(bs.enemyMaxHp * pct));
        const antes = bs.enemyHp;
        bs.enemyHp = Math.min(bs.enemyMaxHp, bs.enemyHp + alvo);
        const curadoReal = bs.enemyHp - antes;
        bs._samuraiRoninTurns--;
        appendBattleLog(`⛩️ Forma Ronin! ${e.name} recupera ${curadoReal} HP em descanso! (${bs._samuraiRoninTurns} turno(s) restante(s))`, '#c0a060');
        showFloatingNumber('enemy', curadoReal, 'heal');
        if (bs._samuraiRoninTurns <= 0) {
          e._roninAtivo = false;
          appendBattleLog(`⛩️ ${e.name} sai da Forma Ronin e volta a atacar!`, '#c0a060');
        }
        buildStatusBadges();
        return;
      }

      const hpPct = bs.enemyHp / bs.enemyMaxHp;

      // ── ATK duplicado: abaixo de 50% HP, uma vez, permanente ──
      if (hpPct <= 0.5 && !bs._samuraiAtkDobrado) {
        bs._samuraiAtkDobrado = true;
        e._atkBase = Math.floor(e._atkBase * 2);
        e.atk = e._atkBase;
        appendBattleLog(`🗡️ A máscara racha ainda mais! ${e.name} dobra seu ATQ!`, '#ff4040');
        showFloatingNumber('enemy', '⚔️ ATQ x2', 'status');
        const d = calcEnemyDmg(e, p, bs, e.dmgMultBase || 1.0);
        applyDmgToPlayer(d, bs, p);
        appendBattleLog(`🗡️ Golpe da Fúria! -${d} HP!`, '#c02020');
        showFloatingNumber('hero', d, 'dmg');
        flashDamage('hero');
        return;
      }

      // ── Forma Ronin: entra ao acaso, só uma vez por luta ──
      if (!bs._samuraiRoninUsado && Math.random() < 0.25) {
        bs._samuraiRoninUsado = true;
        bs._samuraiRoninTurns = 2 + Math.floor(Math.random() * 2); // 2-3 turnos
        e._roninAtivo = true;
        appendBattleLog(`⛩️ ${e.name} entra em Forma Ronin! Ela recolhe a lâmina para recuperar as forças...`, '#c0a060');
        showFloatingNumber('enemy', '⛩️ RONIN', 'status');
        buildStatusBadges();
        return;
      }

      // Ataque especial padrão — golpe de lâmina
      const d = calcEnemyDmg(e, p, bs, (e.dmgMultBase || 1.0) * 1.15);
      applyDmgToPlayer(d, bs, p);
      appendBattleLog(`🗡️ Corte da Máscara Partida! -${d} HP!`, '#c02020');
      showFloatingNumber('hero', d, 'dmg');
      flashDamage('hero');
    }
  },

  // ── FLORESTA MALIGNA: Guardiã Yokai ──
  // "Fúria da Floresta": bloqueia TODA recuperação de HP do jogador (poções,
  // skills e a cura passiva da HuBi) por 2-5 turnos (ver bs._curaBloqueadaTurns
  // em aplicarCuraComLink() e o tick em tickPlayerStatusEffects()).
  // Quebra de guarda: 12% de chance a cada ATAQUE BÁSICO do jogador de
  // derrubar a DEF dela de 100 pra 50 pro resto da luta (ver doBattleAction).
  flm_boss_guardia_yokai: {
    name: 'guardiã do templo',
    specialName: 'Fúria da Floresta',
    specialIcon: '😱',
    specialDesc: 'Solta um grito que bloqueia toda recuperação de HP (poções, skills e HuBi) por 2-5 turnos. 12% de chance por ataque seu de quebrar a guarda dela, derrubando a DEF pra 50.',
    special(bs, p, e) {
      // Só reaplica a Fúria se o bloqueio de cura já tiver acabado
      if (!(bs._curaBloqueadaTurns > 0)) {
        const dur = 2 + Math.floor(Math.random() * 4); // 2 a 5 turnos
        bs._curaBloqueadaTurns = dur;
        bs._hubiSleeping = true;
        bs._hubiSleepingTurns = Math.max(bs._hubiSleepingTurns || 0, dur);
        appendBattleLog(`😱 Fúria da Floresta! Um grito ecoa pela floresta — sua recuperação de HP (e a da HuBi) fica bloqueada por ${dur} turno(s)!`, '#7a9a5a');
        showFloatingNumber('hero', '🚫💚', 'status');
        buildStatusBadges();
      }

      const d = calcEnemyDmg(e, p, bs, e.dmgMultBase || 1.0);
      applyDmgToPlayer(d, bs, p);
      appendBattleLog(`⛩️ ${e.name} avança em fúria! -${d} HP!`, '#7a9a5a');
      showFloatingNumber('hero', d, 'dmg');
      flashDamage('hero');
    }
  },

  // ── FLORESTA MALIGNA: Serpentinos ──
  // 3 formas de ataque embuído com veneno, sorteadas a cada especial. Cada
  // golpe tem e.poisonChance (50%) de aplicar/renovar o veneno no jogador.
  // Duração varia bastante (3 a 8 turnos) e RENOVA a cada novo golpe
  // envenenado — se ele continuar acertando, o veneno pode durar a luta
  // inteira. Dano do veneno = e.poisonAtkPct (70%) do ATQ dele, via
  // bs._playerPoisonDmgOverride (ver tickPlayerStatusEffects).
  flm_boss_serpentinos: {
    name: 'serpente venenosa',
    specialName: 'Presas do Abismo',
    specialIcon: '🐍',
    specialDesc: 'Alterna entre 3 golpes envenenados. 50% de chance por golpe de aplicar/renovar veneno (70% do ATQ dele por turno, duração de 3 a 8 turnos — pode durar a luta toda se ele continuar acertando).',
    special(bs, p, e) {
      const golpes = [
        { nome: 'Presa Venenosa', icon: '🐍', mult: 1.0, cor: '#60c060' },
        { nome: 'Mordida Serpentina', icon: '🦷', mult: 1.15, cor: '#40a040' },
        { nome: 'Cauda Tóxica', icon: '🌿', mult: 0.9, cor: '#308030' },
      ];
      const golpe = golpes[Math.floor(Math.random() * golpes.length)];

      const d = calcEnemyDmg(e, p, bs, (e.dmgMultBase || 1.0) * golpe.mult);
      applyDmgToPlayer(d, bs, p);

      const chancePeconha = e.poisonChance != null ? e.poisonChance : 0.5;
      if (Math.random() < chancePeconha) {
        const dur = 3 + Math.floor(Math.random() * 6); // 3 a 8 turnos, renovável
        bs.playerPoisoned = true;
        bs.playerPoisonTurns = dur;
        bs._playerPoisonDmgOverride = Math.max(1, Math.floor(e.atk * (e.poisonAtkPct != null ? e.poisonAtkPct : 0.7)));
        appendBattleLog(`${golpe.icon} ${golpe.nome}! -${d} HP! ☠ Veneno aplicado/renovado por ${dur} turno(s)!`, golpe.cor);
        showFloatingNumber('hero', '☠ VENENO', 'status');
      } else {
        appendBattleLog(`${golpe.icon} ${golpe.nome}! -${d} HP!`, golpe.cor);
      }
      showFloatingNumber('hero', d, 'dmg');
      flashDamage('hero');
      buildStatusBadges();
    }
  },

  // ── FLORESTA MALIGNA — CHEFE FINAL: Rubrios Yk ──
  // 1) Escolhe 1 elemento (Água/Fogo/Elétrico/Terra) na 1ª skill da luta —
  //    vale até o fim da partida. 2) ATK duplicado abaixo de 50% HP (igual
  //    à Samurai). 3) Muda de Forma: copia nome/ícone/imagem E o special()
  //    de um dos outros 3 chefes da Floresta Maligna, mas com os PRÓPRIOS
  //    status (por isso é "apelão"). 4) União dos Cackrans: +35% dano por
  //    2 turnos. Toda skill mostra um splash em tela cheia (showBossSkillSplash),
  //    não só no log da batalha.
  flm_boss_rubrios_yk: {
    name: 'senhor dos cackrans',
    specialName: 'Fúria dos Cackrans',
    specialIcon: '🔥',
    specialDesc: 'Escolhe um elemento (Água cura 15%/turno, Fogo queima, Elétrico deixa você Chocado — mais dano nos golpes seguintes —, Terra aumenta a DEF dele) que dura a luta toda. Pode copiar a forma E a skill de outro chefe da floresta, unir os cackrans (+35% dano por 2 turnos) e dobra o ATQ abaixo de 50% HP.',
    special(bs, p, e) {
      if (!e._atkBase) e._atkBase = e.atk;

      // ── Já copiou outro chefe: delega o comportamento pra IA dele,
      // usando os PRÓPRIOS status do Rubrios Yk (e é o mesmo objeto) ──
      if (bs._rubriosMimicId && ENEMY_AI[bs._rubriosMimicId]) {
        ENEMY_AI[bs._rubriosMimicId].special(bs, p, e);
        return;
      }

      const hpPct = bs.enemyHp / bs.enemyMaxHp;

      // ── ATK duplicado — igual à Samurai, abaixo de 50% HP, uma vez, permanente ──
      if (hpPct <= 0.5 && !bs._rubriosAtkDobrado) {
        bs._rubriosAtkDobrado = true;
        e._atkBase = Math.floor(e._atkBase * 2);
        e.atk = e._atkBase;
        showBossSkillSplash('ATQ Duplicado', 'Rubrios Yk dobra a força dos golpes!', '⚔️');
        appendBattleLog(`🔥 Rubrios Yk ruge — seus cackrans pesam o dobro! ATQ dobrado!`, '#ff6020');
        showFloatingNumber('enemy', '⚔️ ATQ x2', 'status');
      }

      // ── Escolhe elemento — uma vez, dura até o fim da luta ──
      if (!bs._rubriosElemento) {
        const elementos = ['agua', 'fogo', 'eletrico', 'terra'];
        bs._rubriosElemento = elementos[Math.floor(Math.random() * elementos.length)];
        const info = {
          agua:     { nome: 'Água',     icon: '💧', desc: 'Rubrios Yk regenera 15% do HP máx a cada rodada!' },
          fogo:     { nome: 'Fogo',     icon: '🔥', desc: 'Os golpes de Rubrios Yk agora queimam!' },
          eletrico: { nome: 'Elétrico', icon: '⚡', desc: 'Os golpes de Rubrios Yk agora aplicam Choque!' },
          terra:    { nome: 'Terra',    icon: '🪨', desc: 'A pele de Rubrios Yk vira pedra — DEF aumentada!' },
        }[bs._rubriosElemento];

        if (bs._rubriosElemento === 'terra') {
          e._defBase = e._defBase || e.def;
          e.def = Math.floor(e._defBase * 1.4);
        }

        showBossSkillSplash(`Elemento: ${info.nome}`, info.desc, info.icon);
        appendBattleLog(`🌀 Rubrios Yk canaliza o elemento ${info.nome}! ${info.desc}`, '#c08040');
        buildStatusBadges();
      }

      // ── Skill "Muda de Forma": copia outro chefe (nome/ícone/imagem/IA), chance única por luta ──
      if (!bs._rubriosMimicUsado && Math.random() < 0.20) {
        bs._rubriosMimicUsado = true;
        const opcoes = ['flm_boss_samurai_mascara', 'flm_boss_guardia_yokai', 'flm_boss_serpentinos'];
        const alvoId = opcoes[Math.floor(Math.random() * opcoes.length)];
        const alvoDef = (typeof FLORESTA_MALIGNA_BOSSES !== 'undefined')
          ? FLORESTA_MALIGNA_BOSSES.find(b => b.id === alvoId) : null;
        if (alvoDef) {
          e.name = alvoDef.name; e.icon = alvoDef.icon; e.img = alvoDef.img;
          e.desc = `${alvoDef.desc} (Uma cópia perfeita, forjada por Rubrios Yk — os status continuam sendo os dele.)`;
          bs._rubriosMimicId = alvoId;
          if (typeof showEnemy === 'function') showEnemy(e);
          showBossSkillSplash('Muda de Forma', `Rubrios Yk copia ${alvoDef.name}!`, '🎭');
          appendBattleLog(`🎭 Rubrios Yk se transforma em uma cópia perfeita de ${alvoDef.name}!`, '#c060ff');
          buildStatusBadges();
        }
        return;
      }

      // ── Skill "União dos Cackrans": +35% dano por 2 turnos ──
      if (!(bs._rubriosUniaoTurns > 0) && Math.random() < 0.25) {
        bs._rubriosUniaoTurns = 2;
        showBossSkillSplash('União dos Cackrans', 'As duas lâminas viram uma só — dano aumentado!', '⚔️');
        appendBattleLog(`⚔️ Rubrios Yk une seus dois cackrans em um só — dano aumentado por 2 turnos!`, '#ffcc40');
        showFloatingNumber('enemy', '⚔️ UNIÃO', 'status');
      }

      // ── Golpe padrão, com os multiplicadores elementais/de skill ativos ──
      let mult = e.dmgMultBase || 1.0;
      if (bs._rubriosUniaoTurns > 0) mult *= 1.35;
      if (bs._playerShocked) mult *= 1.20;

      const d = calcEnemyDmg(e, p, bs, mult);
      applyDmgToPlayer(d, bs, p);

      let msg = `${e.icon || '🔥'} ${e.name} golpeia com os cackrans! -${d} HP!`;

      // Fogo: só os golpes com esse elemento ativo queimam (não é fixo em todo ataque)
      if (bs._rubriosElemento === 'fogo' && !p._talent_steel_soul) {
        bs.playerBurning = true;
        bs.playerBurnTurns = 3;
        msg += ' 🔥 Você está queimando!';
      }
      // Elétrico: aplica Choque — próximos golpes dele causam mais dano
      if (bs._rubriosElemento === 'eletrico') {
        bs._playerShocked = true;
        bs._playerShockedTurns = 3;
        msg += ' ⚡ Estado de Choque aplicado!';
      }

      appendBattleLog(msg, '#e06020');
      showFloatingNumber('hero', d, 'dmg');
      flashDamage('hero');
      buildStatusBadges();
    }
  },

  default: {
    name: 'agressivo',
    specialName: 'Ataque Brutal',
    specialIcon: '💀',
    specialDesc: 'Golpe poderoso!',
    special(bs, p, e) {
      const d = calcEnemyDmg(e, p, bs, 1.5);
      applyDmgToPlayer(d, bs, p);
      appendBattleLog(`${e.icon || '👹'} Ataque Brutal! -${d} HP!`, '#e04020');
    }
  },

  // ── MINI-BOSS: Guardião de Cristal ──
  guardiao_cristal: {
    name: 'impenetrável',
    specialName: 'Escudo de Cristal',
    specialIcon: '💎',
    specialDesc: 'Eleva defesa drasticamente por 2 turnos e contra-ataca!',
    special(bs, p, e) {
      const hpPct = bs.enemyHp / bs.enemyMaxHp;

      // FASE 2 — abaixo de 40% HP: fragmenta e enraivece
      if (hpPct <= 0.4 && !bs._cristalPhase2) {
        bs._cristalPhase2 = true;
        e.atk = Math.floor(e.atk * 1.4);
        e.def = Math.max(0, e.def - 6); // cristal racha, perde DEF mas ganha ATK
        appendBattleLog(`💎 O Guardião racha! Fragmentos voam — DEF cai mas ATQ aumenta!`, '#a0d0ff');
        const d = calcEnemyDmg(e, p, bs, 1.2);
        applyDmgToPlayer(d, bs, p);
        appendBattleLog(`💎 Explosão de Cristal! Fragmentos cortam! -${d} HP!`, '#80c0ff');
        showFloatingNumber('hero', d, 'dmg');
        flashDamage('hero');
        return;
      }

      // Especial: Escudo de Cristal — aumenta DEF + contra-ataque na próxima
      if (!bs._cristalShield) {
        bs._cristalShield = true;
        bs._cristalShieldTurns = 2;
        bs._crystalDefBonus = 8;
        e.def += 8;
        appendBattleLog(`💎 Escudo de Cristal! DEF +8 por 2 turnos. Qualquer ataque será refletido!`, '#80c0ff');
        showFloatingNumber('enemy', '🛡 ESCUDO', 'status');
      } else {
        // Se já tem escudo: lança estilhaços
        const d = calcEnemyDmg(e, p, bs, 1.3);
        applyDmgToPlayer(d, bs, p);
        bs.playerBleeding = true;
        bs.playerBleedTurns = 2;
        appendBattleLog(`💎 Chuva de Estilhaços! -${d} HP + 🩸 Sangramento por 2 turnos!`, '#80c0ff');
        showFloatingNumber('hero', d, 'dmg');
        flashDamage('hero');
      }
    }
  },

  // ── MINI-BOSS: Sentinela das Sombras ──
  sentinela_sombras: {
    name: 'implacável',
    specialName: 'Lâmina das Trevas',
    specialIcon: '⚫',
    specialDesc: 'Golpe que drena HP e aplica maldição!',
    special(bs, p, e) {
      const hpPct = bs.enemyHp / bs.enemyMaxHp;

      // FASE 2 — abaixo de 50% HP: modo fúria
      if (hpPct <= 0.5 && !bs._sentinelaPhase2) {
        bs._sentinelaPhase2 = true;
        e.atk = Math.floor(e.atk * 1.25);
        appendBattleLog(`⚫ A Sentinela emite um ruído surdo. A escuridão dentro da armadura pulsa mais rápido!`, '#9040c0');
        appendBattleLog(`⚫ ATQ da Sentinela aumentou!`, '#9040c0');
        bs.enemyEnraged = true;
        // Golpe de entrada da fase 2
        const d = calcEnemyDmg(e, p, bs, 1.3);
        applyDmgToPlayer(d, bs, p);
        appendBattleLog(`⚫ Fúria das Sombras! -${d} HP!`, '#9040c0');
        showFloatingNumber('hero', d, 'dmg');
        flashDamage('hero');
        return;
      }

      // FASE 3 — abaixo de 20% HP: desespero + dreno total
      if (hpPct <= 0.2 && !bs._sentinelaPhase3) {
        bs._sentinelaPhase3 = true;
        const drain = Math.floor(p.hp * 0.15);
        p.hp = Math.max(1, p.hp - drain);
        bs.enemyHp = Math.min(bs.enemyMaxHp, bs.enemyHp + drain);
        appendBattleLog(`⚫ DRENO VITAL! A Sentinela absorve ${drain} HP de você!`, '#c040e0');
        showFloatingNumber('hero', drain, 'dmg');
        showFloatingNumber('enemy', drain, 'heal');
        flashDamage('hero');
        return;
      }

      // Especial normal — Lâmina das Trevas: dano + maldição (reduz ATK do jogador)
      const d = calcEnemyDmg(e, p, bs, 1.4);
      applyDmgToPlayer(d, bs, p);
      bs._cursed = true;
      bs._cursedTurns = 2;
      appendBattleLog(`⚫ Lâmina das Trevas! -${d} HP + 🌑 Maldição por 2 turnos (ATQ reduzido)!`, '#8030b0');
      showFloatingNumber('hero', d, 'dmg');
      flashDamage('hero');
    }
  },

  // ── Colhedor de Almas (Templo do Vazio Ecoante — Fase 2) ──────────
  colhedor_almas: {
    name: 'implacável',
    specialName: 'Corte da Gadanha',
    specialIcon: '💀',
    specialDesc: 'Um corte certeiro que sempre causa crítico.',
    special(bs, p, e) {
      // Corte da Gadanha — crítico fixo de 20 + variação mínima, ignora parte da DEF
      const corteCrit = 20 + Math.floor(Math.random() * 5);
      applyDmgToPlayer(corteCrit, bs, p);
      appendBattleLog(`💀 Corte da Gadanha! Crítico certeiro! -${corteCrit} HP!`, '#9000d0');
      showFloatingNumber('hero', corteCrit, 'crit');
      flashDamage('hero');

      // Cura fase-baixa: 3 curas disponíveis quando HP < 35%
      const hpPct = bs.enemyHp / bs.enemyMaxHp;
      if (hpPct < 0.35 && (bs._colhedorCuras || 0) < 3) {
        bs._colhedorCuras = (bs._colhedorCuras || 0) + 1;
        const cura = bs.enemyMaxHp; // 100% do HP máximo
        bs.enemyHp = Math.min(bs.enemyMaxHp, bs.enemyHp + cura);
        appendBattleLog(`☠️ O Colhedor de Almas colhe energia do vazio — cura total! (${bs._colhedorCuras}/3)`, '#c040ff');
        showFloatingNumber('enemy', cura, 'heal');
      }
    }
  },
};

// ── Helper: dano do inimigo ──
function calcEnemyDmg(e, p, bs, mult = 1.0) {
  // Punição Eterna: inimigo com qualquer debuff ativo → -20% no ATQ do inimigo
  const hasDebuff = bs.enemyPoisoned || bs.enemyBurning || bs.enemyMarked || bs.enemySlowed || bs.enemyStunned || bs.enemyBleeding || bs._cursed || bs._enemy_cursed;
  let eAtk = (p._talent_eternal_punishment && hasDebuff)
    ? Math.floor(e.atk * 0.80)
    : e.atk;
  // Distância Segura (talento do Arqueiro): -20% ATQ por 1 turno após o inimigo errar
  if (bs._safeDistanceDebuff) {
    eAtk = Math.floor(eAtk * 0.80);
    bs._safeDistanceDebuff = false;
  }
  // Piso de dano proporcional ao ATQ do inimigo (mín. 10%, no mínimo 1) — em vez de
  // um piso fixo de 1. Com DEF muito alta (ex.: Paladino), "ATQ - DEF/2" podia zerar
  // ou ficar negativo e todo golpe caía sempre no mínimo de 1, tornando a DEF capaz
  // de anular o combate por completo. Agora sempre passa uma fração do ATQ bruto.
  const _pisoDano = Math.max(1, Math.ceil(eAtk * 0.10));
  let base = Math.max(_pisoDano, eAtk - (e.ignoraDefPct ? Math.floor(Math.floor(p.def / 2) * (1 - e.ignoraDefPct)) : Math.floor(p.def / 2)) + Math.floor(Math.random() * 6) - 2);
  // Dificuldade
  if (window._diffMult && window._diffMult !== 1.0) base = Math.max(1, Math.round(base * window._diffMult));
  // Lobo enraivecido
  if (bs._wolfEnrage) { base = Math.floor(base * 1.5); bs._wolfEnrage = false; }
  // Escudo da Sereia — reduz dano que ela recebe em 10%
  if (bs._sereiaShieldActive && bs._sereiaShieldTurns > 0) {
    base = Math.floor(base * 0.90);
  }

  // Kappa Exausto — recebe 50% a mais de dano
  if (bs._kappaExausto) {
    base = Math.floor(base * 1.50);
  }

  // Inimigo lento
  if (bs.enemySlowed) base = Math.max(1, Math.floor(base * 0.7));
  // Multiplicador
  base = Math.floor(base * mult);
  // Redução de defesa ativa
  if (bs.defending || bs._shieldActive) {
    if (bs._shieldActive) {
      // Proteção Divina (talento): 90% de bloqueio; base: 80%
      const shieldMult = (p._talent_better_shield) ? 0.10 : 0.20;
      base = Math.floor(base * shieldMult);
    } else {
      base = Math.floor(base * 0.5);
    }
    bs._shieldActive = false;
    bs._shieldTurns  = 0;
    hideShieldEffect();
  }
  return Math.max(1, base);
}

// ── Helper: aplica dano ao jogador ──
// ── Reflexo da Ordem (Segunda Ordem — Estátua da Ordem, Corredor das
//    Estátuas, Masmorra Inazami): enquanto ativo, todo dano que o
//    jogador causa reflete uma % de volta nele mesmo. bs._reflexoDano
//    guarda a fração (ex.: 0.10 = 10%). Chamada nos principais pontos
//    onde o jogador aplica dano (ataque básico, skills, fusões do mago).
function _aplicarReflexoOrdem(bs, p, danoAplicado) {
  if (!bs || !bs._reflexoDano || !(danoAplicado > 0)) return;
  const refl = Math.max(1, Math.floor(danoAplicado * bs._reflexoDano));
  p.hp = Math.max(1, p.hp - refl);
  appendBattleLog(`🪞 Reflexo da Ordem! Você sofre ${refl} HP do próprio ataque!`, '#a070ff');
  if (typeof showFloatingNumber === 'function') showFloatingNumber('hero', refl, 'dmg');
  if (typeof flashDamage === 'function') flashDamage('hero');
  if (typeof updateBattleHUD === 'function') updateBattleHUD();
}
window._aplicarReflexoOrdem = _aplicarReflexoOrdem;

function applyDmgToPlayer(dmg, bs, p, ignoresDef = false) {
  // ── Inimigo marcado como noDamage:true (ex: Eir em teste) — zera
  // qualquer dano antes de qualquer outro cálculo, básico ou crítico.
  if (bs && bs.enemyData && bs.enemyData.noDamage) {
    dmg = 0;
  }

  // ── Bênção do Abismo (Runa SS do Paladino): chance de anular todo o dano ──
  if (p._enchantBarrierChance && dmg > 0 && Math.random() < p._enchantBarrierChance) {
    appendBattleLog('🛡 Bênção do Abismo! O dano foi completamente anulado!', '#cc88ff');
    showFloatingNumber('hero', '🛡 ANULADO', 'status');
    dmg = 0;
  }

  // Hook de talento ao receber dano (redução, retaliação, etc.)
  if (typeof applyTalentOnReceiveDamage === 'function') {
    dmg = applyTalentOnReceiveDamage(dmg, bs);
  }

  // ── SELO DO BASTIÃO — 1x por batalha: se um único golpe ultrapassar
  // 25% do HP máximo do jogador, reduz esse golpe específico em 40%.
  if (dmg > 0 && bs && !bs._seloBastiaoUsado &&
      G.player.selosEquipados && G.player.selosEquipados.some(s => s.id === 'selo_bastiao')) {
    const seloBastiao = ITEM_DB.selo_bastiao;
    const limiar = Math.floor(p.maxHp * (seloBastiao.limiarGolpeGrandePct || 0.25));
    if (dmg >= limiar) {
      bs._seloBastiaoUsado = true;
      const dmgOriginal = dmg;
      dmg = Math.max(1, Math.floor(dmg * (1 - (seloBastiao.mitigacaoGolpeGrandePct || 0.40))));
      appendBattleLog(`🛡️ SELO DO BASTIÃO! O golpe é absorvido: -${dmgOriginal - dmg} de dano evitado!`, '#4090ff');
      showFloatingNumber('hero', '🛡 BLOQUEIO', 'status');
    }
  }

  // ── Fé Absoluta (passiva de level 5 do Paladino) ──
  if (p._pal_lv5_chosen === 'fe_absoluta') {
    const hpPct = p.hp / p.maxHp;
    if (hpPct < 0.15) {
      dmg = Math.floor(dmg * 0.70); // -30% dano (threshold mais severo sobrescreve o anterior)
      if (!bs._feAbsolutaGatilho50) {
        // Garante que o gatilho de dano +50% seja flagado apenas uma vez por batalha
        bs._feAbsolutaGatilho50 = true;
        appendBattleLog(`🙏 Fé Absoluta — Limiar Crítico! Próximo ataque +50% dano!`, '#f0c060');
        showFloatingNumber('hero', '🙏 ATQ+50%', 'buff');
      }
    } else if (hpPct < 0.30) {
      dmg = Math.floor(dmg * 0.70); // -30% dano
    } else if (hpPct < 0.50) {
      dmg = Math.floor(dmg * 0.85); // -15% dano
    }
    dmg = Math.max(1, dmg);
  }
  // Espírito de Aço: DEF nunca cai abaixo de 8
  if (p._talent_steel_soul && p.def < 8) p.def = 8;

  // ── Prato do Kappa: Efeito Lendário — ao cair abaixo de 20% HP, recupera 200 HP (1x/batalha) ──
  const pratoPrato = p.inventory && p.inventory.find(i => i.id === 'prato_kappa' && i.equipped);
  if (pratoPrato && !bs._prataKappaLendarioUsado) {
    const hpApos = p.hp - dmg;
    if (hpApos <= p.maxHp * 0.20 && hpApos > 0) {
      bs._prataKappaLendarioUsado = true;
      p.hp = Math.max(0, p.hp - dmg) + 200;
      p.hp = Math.min(p.maxHp, p.hp);
      appendBattleLog(`🥣 EFEITO LENDÁRIO — Prato do Kappa! Recuperou 200 HP ao cair abaixo de 20%!`, '#00ddff');
      showFloatingNumber('hero', 200, 'heal');
      updateHUD();
      updateBattleHUD();
      // Passiva de Dano Verdadeiro
      if (ignoresDef && pratoPrato) { bs._prataKappaProxAtk = true; }
      return;
    }
  }

  // ── Prato do Kappa: Passiva — após Dano Verdadeiro, próximo ataque +40% ──
  if (ignoresDef) {
    const pratoEq = p.inventory && p.inventory.find(i => i.id === 'prato_kappa' && i.equipped);
    if (pratoEq && !bs._prataKappaProxAtk) {
      bs._prataKappaProxAtk = true;
      appendBattleLog(`🥣 Prato do Kappa: Dano Verdadeiro recebido! Próximo ataque +40%!`, '#00ddff');
      showFloatingNumber('hero', '🥣 +40% ATQ', 'status');
    }
  }

  // ── Dano massivo: se o golpe passar de ~25% do HP máximo, marca a
  //    PRÓXIMA linha do log (a mensagem do próprio ataque, chamada logo
  //    em seguida por quem invocou applyDmgToPlayer) pra sair em
  //    vermelho — ver consumo desse flag em appendBattleLog().
  if (dmg >= Math.max(15, Math.floor(p.maxHp * 0.25))) {
    bs._danoMassivoPendente = true;
  }

  p.hp = Math.max(0, p.hp - dmg);
  // Quebrar combo ao levar dano
  if (dmg > 0 && bs.comboCount > 0) {
    bs.comboCount = 0;
    bs.comboTier  = 0;
    updateComboDisplay();
  }
  flashDamage('hero');
  // Animação de dano: forte (>15% HP máx) → cai; leve → defende
  if (dmg > 0 && p.classData && p.classData.sprite) {
    // Limpa qualquer transform residual de animação de ataque anterior
    const _heroEl = document.getElementById('bat-hero-icon');
    if (_heroEl) { _heroEl.style.transition = ''; _heroEl.style.transform = ''; }

    const threshold = Math.max(8, Math.floor(p.maxHp * 0.15));
    if (dmg >= threshold) {
      // Ataque forte: recua com impacto e cai (hit → hit2 → recover → idle)
      if (_heroEl) { _heroEl.style.transition = 'transform 0.09s ease-out'; _heroEl.style.transform = 'translateX(-14px)'; }
      setHeroAnim('hit', 0);
      setTimeout(() => {
        setHeroAnim('hit2', 0);
        const _e2 = document.getElementById('bat-hero-icon');
        if (_e2) { _e2.style.transition = 'transform 0.15s ease-out'; _e2.style.transform = 'translateX(-8px)'; }
      }, 430);
      setTimeout(() => {
        // Paladino reaproveita a imagem 'recover' pra pose de martelo abaixado
        // da própria skill Golpe Sagrado — não é uma pose de sofrer dano.
        // Usar ela aqui fazia aparecer o frame errado (parece que ele está
        // terminando um ataque, não apanhando). Volta direto pro idle nesse caso.
        const _classIdRecover = p.classData && p.classData.id;
        setHeroAnim(_classIdRecover === 'paladino' ? 'idle' : 'recover', 0);
        const _e3 = document.getElementById('bat-hero-icon');
        if (_e3) { _e3.style.transition = 'transform 0.2s ease-out'; _e3.style.transform = 'translateX(0px)'; }
      }, 860);
      setTimeout(() => {
        setHeroAnim('idle', 0);
        const _e4 = document.getElementById('bat-hero-icon');
        if (_e4) { _e4.style.transition = ''; _e4.style.transform = ''; }
      }, 1200);
    } else {
      // Ataque leve: recua um pouco, defende e volta
      if (_heroEl) { _heroEl.style.transition = 'transform 0.08s ease-out'; _heroEl.style.transform = 'translateX(-7px)'; }
      setHeroAnim('defend', 500);
      setTimeout(() => {
        const _e5 = document.getElementById('bat-hero-icon');
        if (_e5) { _e5.style.transition = 'transform 0.14s ease-out'; _e5.style.transform = 'translateX(0px)'; }
      }, 220);
      setTimeout(() => {
        const _e6 = document.getElementById('bat-hero-icon');
        if (_e6) { _e6.style.transition = ''; _e6.style.transform = ''; }
      }, 500);
    }
  }
  updateHUD();
  updateBattleHUD();
}

// ── Efeitos de status visuais ──
function buildStatusBadges() {
  const badges = [];
  const bs = battleState;
  if (bs.enemyPoisoned)   badges.push(`<span class="status-badge poison">☠×${bs.enemyPoisonTurns}</span>`);
  if (bs.enemyBurning)    badges.push(`<span class="status-badge burn">🔥×${bs.enemyBurnTurns}</span>`);
  if (bs.enemyMarked)     badges.push(`<span class="status-badge debuff">🔖×${bs.enemyMarkTurns}</span>`);
  if (bs.enemySlowed)     badges.push(`<span class="status-badge slow">❄×${bs.enemySlowTurns}</span>`);
  if (bs.enemyStunned)    badges.push(`<span class="status-badge stun">⚡×${bs.enemyStunTurns}</span>`);
  if (bs.enemyBleeding)   badges.push(`<span class="status-badge bleed">🩸×${bs.enemyBleedTurns}</span>`);
  if (bs._cursed)         badges.push(`<span class="status-badge debuff">💜×${bs._cursedTurns}</span>`);
  if (bs._enemy_cursed)   badges.push(`<span class="status-badge debuff">⚖×${bs._enemy_cursed_turns}</span>`);
  if (bs._enemyGuardTurns > 0) badges.push(`<span class="status-badge guard">🛡 guarda</span>`);
  if (bs._kodamaCarregado)  badges.push(`<span class="status-badge buff">💧 KODAMA</span>`);
  if (bs._kappaExausto)     badges.push(`<span class="status-badge debuff">😮 EXAUSTO×${bs._kappaExaustoTurns}</span>`);
  if (bs._kappaFuriaStage > 0) badges.push(`<span class="status-badge debuff">🔥 FÚRIA ${bs._kappaFuriaStage}/6 (${Math.round(Math.min(0.95,(bs._kappaCritChance||0))*100)}% CRIT)</span>`);
  const el = document.getElementById('bat-enemy-status');
  if (el) el.innerHTML = badges.join('');

  const pbadges = [];
  if (bs.playerPoisoned)  pbadges.push(`<span class="status-badge poison">☠×${bs.playerPoisonTurns}</span>`);
  if (bs.playerBleeding)  pbadges.push(`<span class="status-badge bleed">🩸×${bs.playerBleedTurns}</span>`);
  if (bs.playerBurning)   pbadges.push(`<span class="status-badge burn">🔥×${bs.playerBurnTurns}</span>`);
  if (bs.playerStunned)   pbadges.push(`<span class="status-badge stun">⚡×${bs.playerStunTurns}</span>`);
  if (bs.playerSleeping)  pbadges.push(`<span class="status-badge stun">💤×${bs.playerSleepTurns}</span>`);
  if (bs._hubiSleeping)   pbadges.push(`<span class="status-badge debuff">🚫💚 HuBi 💤×${bs._hubiSleepingTurns}</span>`);
  if (bs._reflexoDano > 0) pbadges.push(`<span class="status-badge debuff">🪞${Math.round(bs._reflexoDano*100)}%</span>`);
  if (bs._buffAtkTurns>0) pbadges.push(`<span class="status-badge buff">⚔+${bs._buffAtkAmt}×${bs._buffAtkTurns}</span>`);
  // Chama do Selo — debuff fixo da Masmorra Inazami (não some entre batalhas)
  if (typeof G !== 'undefined' && G.inazami && G.inazami.chamaTier > 0 && window.CHAMA_SELO_TIERS) {
    const _ct = window.CHAMA_SELO_TIERS[G.inazami.chamaTier];
    if (_ct) {
      pbadges.push(`<span class="status-badge burn" title="${_ct.nome}"><img src="${_ct.img}" style="width:18px;height:18px;object-fit:contain;vertical-align:middle;"></span>`);
    }
  }
  {
    const _coracao = (G.player.inventory || []).find(i => i.equipped && i.chargeable && i.id === 'coracao_incandescente');
    if (_coracao) {
      if (_coracao._quebrado) pbadges.push(`<span class="status-badge debuff">💔 Coração quebrado</span>`);
      else if ((_coracao._carga||0) >= 100) pbadges.push(`<span class="status-badge buff">🔥 100%</span>`);
      else pbadges.push(`<span class="status-badge buff">🔥 ${_coracao._carga||0}%</span>`);
    }
  }
  const pel = document.getElementById('bat-hero-status');
  if (pel) pel.innerHTML = pbadges.join('');
}

// ── Número flutuante de dano ──
function showFloatingNumber(target, value, type = 'dmg') {
  // target: 'hero' | 'enemy'
  const side = target === 'hero' ? 'bat-hero-side' : 'bat-enemy-side';
  const container = document.getElementById(side) || document.querySelector('.battle-arena');
  if (!container) return;
  const div = document.createElement('div');
  const colorMap = { dmg:'#ff6040', heal:'#60e060', crit:'#ffcc00', miss:'#aaaaaa', buff:'#80ccff', status:'#cc80ff' };

  // ── Escala de combo: dano/crítico infligido no inimigo esquenta de cor
  // e cresce de tamanho conforme battleState.comboTier sobe (0-3),
  // espelhando o bônus real de dano do combo (+15%/+30%/+45%). Some o
  // aviso visual assim que o combo zera (jogador levou dano e
  // comboTier volta a 0 — ver reset em battleState).
  let color = colorMap[type] || '#fff';
  let sizeRem = type === 'crit' ? 1.5 : 1.1;
  let glowExtra = 0;
  if (target === 'enemy' && (type === 'dmg' || type === 'crit') && typeof battleState !== 'undefined') {
    const tier = battleState.comboTier || 0;
    const comboPalette = type === 'crit'
      ? ['#ffcc00', '#ffd400', '#ffaa00', '#ff8800']   // crítico: dourado → laranja intenso
      : ['#ff6040', '#ff7a30', '#ff5020', '#ff3010'];  // dano normal: vermelho-laranja → vermelho puro
    color = comboPalette[tier];
    sizeRem += tier * 0.12;
    glowExtra = tier * 3;
  }

  div.className = 'float-num';
  div.style.cssText = `
    position:absolute; font-family:'Noto Serif JP',serif; font-weight:900;
    font-size:${sizeRem}rem;
    color:${color};
    text-shadow:0 2px ${8 + glowExtra}px rgba(0,0,0,0.9);
    pointer-events:none; z-index:9999;
    left:${20 + Math.random()*60}%; top:${20 + Math.random()*30}%;
    animation:floatUp 1.1s ease forwards;
  `;
  div.textContent = type === 'crit' ? `CRÍTICO! ${value}` : type === 'miss' ? 'ERROU!' : (type==='heal'?'+':'') + value;
  container.style.position = 'relative';
  container.appendChild(div);
  setTimeout(() => div.remove(), 1200);
}

// ── Flash de dano ──
// ── Efeito visual genérico: mostra uma imagem de impacto (raio, gelo,
// folha, pedra, luz, etc.) explodindo sobre o inimigo. Usado por todos os
// elementos do Mago — cada um só passa o nome do arquivo .png. ──
function showElementoFX(fileName) {
  const host = document.getElementById('bat-enemy-side');
  if (!host) return;

  const id = 'mago-elemento-fx';
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('img');
    el.id = id;
    el.style.cssText = `
      display:none;
      position:absolute; top:0; left:0; right:0; bottom:0; margin:auto;
      width:120px; height:120px; object-fit:contain;
      pointer-events:none; z-index:20;
    `;
    host.appendChild(el);
  }

  if (!document.getElementById('mago-elemento-fx-style')) {
    const st = document.createElement('style');
    st.id = 'mago-elemento-fx-style';
    st.textContent = `
      @keyframes magoElementoFxPlay {
        0%   { opacity:0; transform:scale(0.6); }
        20%  { opacity:1; transform:scale(1.15); }
        35%  { opacity:1; transform:scale(1); }
        75%  { opacity:1; transform:scale(1); }
        100% { opacity:0; transform:scale(1.1); }
      }
      #mago-elemento-fx.playing { animation: magoElementoFxPlay 0.55s ease forwards; }
    `;
    document.head.appendChild(st);
  }

  el.src = 'Imagens/personagens/mago/ícones Hab/' + fileName;
  el.style.display = 'block';
  el.classList.remove('playing');
  void el.offsetWidth;
  el.classList.add('playing');

  clearTimeout(el._hideTimeout);
  el._hideTimeout = setTimeout(() => {
    el.style.display = 'none';
    el.classList.remove('playing');
  }, 600);
}

// Compatibilidade: mantém o nome antigo funcionando (usado pelo Elétrico).
function showEletricoShockFX() {
  showElementoFX('staak.png');
}

// ── Cut-in de MORDIDA sobre o herói (ex.: Tierra) ──
// Mesmo padrão do cut-in de Fusão acima: elemento fixo dentro de
// #bat-hero-icon-wrap (nunca dentro de #bat-hero-icon, que é sobrescrito
// a cada animação), então funciona mesmo o herói tendo trocado de pose
// no meio. Sprite sheet de 2 frames empilhados na VERTICAL (boca aberta
// em cima, boca fechada embaixo) — usa background-position em % (0%/100%)
// com background-size 100% 200%, então não precisa saber a resolução
// real do PNG.
function _ensureBiteCutinEl() {
  let el = document.getElementById('bite-cutin-img');
  if (el) return el;

  const wrap = document.getElementById('bat-hero-icon-wrap');
  if (!wrap) return null;

  el = document.createElement('div');
  el.id = 'bite-cutin-img';
  el.style.cssText = `
    display:none;
    position:absolute; top:0; left:0; right:0; bottom:0; margin:auto;
    width:120px; height:80px;
    background-repeat:no-repeat; background-size:100% 200%; background-position-y:0%;
    filter:drop-shadow(0 2px 10px rgba(0,0,0,0.85));
    pointer-events:none; z-index:26;
  `;
  wrap.appendChild(el);

  if (!document.getElementById('bite-cutin-style')) {
    const st = document.createElement('style');
    st.id = 'bite-cutin-style';
    st.textContent = `
      @keyframes biteCutinPlay {
        0%   { opacity:0;   transform:scale(0.7); }
        12%  { opacity:1;   transform:scale(1.12); }
        22%  { opacity:1;   transform:scale(1); }
        75%  { opacity:1;   transform:scale(1); }
        100% { opacity:0;   transform:scale(0.9); }
      }
      #bite-cutin-img.playing { animation: biteCutinPlay 0.65s ease-out forwards; }
    `;
    document.head.appendChild(st);
  }
  return el;
}

// Toca a mordida sobre o herói. Chamado de dentro de flashDamage() quando
// quem causou o dano é um inimigo com enemy.biteAnim definido.
function showBiteCutin(src) {
  const el = _ensureBiteCutinEl();
  if (!el || !src) return;

  el.style.backgroundImage = `url('${src}')`;
  el.style.backgroundPositionY = '0%'; // frame 1: boca aberta
  el.style.display = 'block';
  el.classList.remove('playing');
  void el.offsetWidth; // força reflow pra reiniciar a animação CSS
  el.classList.add('playing');

  // Fecha a boca (frame 2) no "impacto" da mordida
  const t1 = setTimeout(() => { el.style.backgroundPositionY = '100%'; }, 260);
  // Some no final
  const t2 = setTimeout(() => {
    el.style.display = 'none';
    el.classList.remove('playing');
  }, 650);
  _enemyAnimTimers.push(t1, t2);
}

// Esconde a mordida imediatamente — rede de segurança ao terminar a batalha.
function hideBiteCutin() {
  const el = document.getElementById('bite-cutin-img');
  if (el) { el.style.display = 'none'; el.classList.remove('playing'); }
}

// ── Anúncio de skill em tela cheia (splash) — igual ao que o Ecorrom fazia:
// mostra a skill grande na tela, não só no mini-log de batalha. Genérico,
// qualquer chefe pode chamar: showBossSkillSplash('Nome da Skill', 'subtítulo opcional', '🔥').
function showBossSkillSplash(titulo, subtitulo, icone) {
  const host = document.getElementById('battle-overlay') || document.body;
  if (!host) return;

  const el = document.createElement('div');
  el.className = 'boss-skill-splash';
  el.style.cssText = `
    position:absolute; inset:0; z-index:9999;
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    gap:8px; pointer-events:none;
    background:radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 60%, rgba(0,0,0,0) 100%);
    animation: bossSkillSplashFade 1.8s ease forwards;
  `;
  el.innerHTML = `
    ${icone ? `<div style="font-size:2.6rem; filter:drop-shadow(0 0 10px rgba(255,180,60,0.8));">${icone}</div>` : ''}
    <div style="font-family:inherit; font-size:1.5rem; font-weight:900; letter-spacing:2px; color:#ffd77a; text-shadow:0 0 14px rgba(255,150,30,0.9), 0 2px 4px rgba(0,0,0,0.8); text-transform:uppercase; text-align:center; padding:0 20px;">${titulo}</div>
    ${subtitulo ? `<div style="font-size:0.85rem; color:#f0e0c0; text-shadow:0 2px 4px rgba(0,0,0,0.8); text-align:center; padding:0 24px; opacity:0.9;">${subtitulo}</div>` : ''}
  `;

  if (!document.getElementById('boss-skill-splash-style')) {
    const style = document.createElement('style');
    style.id = 'boss-skill-splash-style';
    style.textContent = `
      @keyframes bossSkillSplashFade {
        0%   { opacity:0; transform:scale(0.85); }
        12%  { opacity:1; transform:scale(1.04); }
        20%  { opacity:1; transform:scale(1); }
        78%  { opacity:1; }
        100% { opacity:0; }
      }
    `;
    document.head.appendChild(style);
  }

  host.appendChild(el);
  setTimeout(() => el.remove(), 1850);
}
window.showBossSkillSplash = showBossSkillSplash;

function flashDamage(target) {
  const id = target === 'hero' ? 'bat-hero-icon' : 'bat-enemy-icon';
  const el = document.getElementById(id);
  if (!el) return;
  // Troca de pose ao tomar dano (ex.: cai2.png do Tierra) — roda pra
  // QUALQUER fonte de dano no inimigo, já que todas passam por aqui.
  if (target === 'enemy' && typeof animEnemyHit === 'function') animEnemyHit();
  // Mordida sobre o herói — quando quem bateu foi um inimigo com biteAnim
  // (ex.: Tierra). Roda em cima do dano recebido, não da animação do
  // próprio inimigo.
  if (target === 'hero' && G.currentEnemy && G.currentEnemy.biteAnim) {
    showBiteCutin(G.currentEnemy.biteAnim);
  }
  // Vibração no dano (respeita config)
  if (CONFIG.vibration && navigator.vibrate) {
    navigator.vibrate(target === 'hero' ? [60] : [30]);
  }
  if (el._flashTimeout) { clearTimeout(el._flashTimeout); el.style.opacity = '1'; }
  el.style.transition = 'opacity 0.08s ease';
  el.style.opacity = '0.25';
  el._flashTimeout = setTimeout(() => {
    el.style.opacity = '1';
    el._flashTimeout = null;
    setTimeout(() => { if (el) el.style.transition = ''; }, 100);
  }, 160);
}

// ─────────────────────────────────────────────────────────────
//  GADANHA — Ceifada (proc passivo lendário, 4% por ataque)
//  Ao acertar um ataque, 4% de chance de ceifar o inimigo:
//  causa 35% da VIDA ATUAL do inimigo como dano verdadeiro.
//  Sem limite de usos por batalha. Funciona contra qualquer inimigo.
// ─────────────────────────────────────────────────────────────
function tryGadanhaCeifada(bs, p, e) {
  if (!bs || !p || !e) return;
  if (bs.enemyHp <= 0) return;

  // Verifica se a Gadanha está na mochila e ATIVADA (item de suporte, não ocupa slot de arma)
  const gadanha = (p.inventory || []).find(i => i.id === 'gadanha_espirito');
  if (!gadanha || !gadanha.active) return;

  // 4% de chance
  if (Math.random() >= 0.04) return;

  const dano = Math.max(1, Math.floor(bs.enemyHp * 0.35));
  bs.enemyHp = Math.max(0, bs.enemyHp - dano);
  bs.totalDmgDealt = (bs.totalDmgDealt || 0) + dano;

  // Animação de tela cheia: Gadanha aparece girando
  const overlay = document.getElementById('gadanha-ceifada-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    void overlay.offsetWidth; // força reflow para reiniciar animação
    overlay.classList.add('active');
    setTimeout(() => { overlay.classList.remove('active'); }, 1150);
  }
  if (CONFIG.vibration && navigator.vibrate) navigator.vibrate([40, 60, 90]);

  appendBattleLog(`🌙 CEIFADA! A Gadanha gira sozinha e ceifa ${e.name}! -${dano} HP (35% da vida atual)!`, '#a840ff');
  addLog(`Ceifada da Gadanha: -${dano} ao ${e.name}.`, 'dmg');
  showFloatingNumber('enemy', dano, 'crit');
  flashDamage('enemy');
  if (typeof buildStatusBadges === 'function') buildStatusBadges();
}

// ── Atualiza exibição do combo ──
function updateComboDisplay() {
  const el = document.getElementById('bat-combo');
  if (!el) return;
  const bs = battleState;
  if (bs.comboCount <= 1) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  const tier = Math.min(3, Math.floor(bs.comboCount / BATTLE_CONFIG.COMBO_WINDOW));
  el.textContent = `⚡ COMBO ×${bs.comboCount} ${tier > 0 ? `(+${tier * 15}% ATQ)` : ''}`;
  el.className = 'bat-combo-display tier' + tier;
}

// ── Iniciar batalha ──
// ─────────────────────────────────────────────────────────────
//  LUA CHEIA — INVESTIDA ELEMENTAL
//  Toda batalha em que a Lua Cheia estiver ativa, o Assassino
//  precisa escolher um elemento de "investida" antes de agir.
//  Acertar o elemento certo contra o inimigo = fica mais forte.
//  Errar = fica mais fraco. É uma aposta, não um buff de graça.
// ─────────────────────────────────────────────────────────────
const _LCI_ELEMENTOS = ['fogo','agua','eletrico','gelo','planta','terra','energia',
  'magia_negra','vento','caos','veneno','luz','sombra','cristal'];
const _LCI_ICONES = { fogo:'🔥', agua:'💧', eletrico:'⚡', gelo:'❄️', planta:'🌿', terra:'🪨',
  energia:'✨', magia_negra:'🌑', vento:'🌪️', caos:'🌀', veneno:'☠️', luz:'☀️', sombra:'👤', cristal:'💎' };
const _LCI_NOMES = { fogo:'Fogo', agua:'Água', eletrico:'Elétrico', gelo:'Gelo', planta:'Planta', terra:'Terra',
  energia:'Energia', magia_negra:'Magia Negra', vento:'Vento', caos:'Caos', veneno:'Veneno', luz:'Luz', sombra:'Sombra', cristal:'Cristal' };

function openLuaCheiaInvestidaOverlay(p, enemy, bs) {
  if (!p || !p.classData || p.classData.id !== 'assassino') return;
  if (typeof getAssassinoLuaAtiva !== 'function' || getAssassinoLuaAtiva(p) !== 'cheia') return;
  if (!enemy) return;
  if (document.getElementById('lua-cheia-investida-overlay')) return; // já tem uma aberta

  // Sorteia 3 elementos distintos para escolher
  const pool = [..._LCI_ELEMENTOS].sort(() => Math.random() - 0.5).slice(0, 3);

  setBattleButtons(false);

  const overlay = document.createElement('div');
  overlay.id = 'lua-cheia-investida-overlay';
  overlay.innerHTML = `
    <div class="lci-card">
      <div class="lci-title">🌕 A Lua Cheia desperta seu instinto</div>
      <div class="lci-sub">Escolha sua investida contra <b>${enemy.name}</b>. Acertar o elemento certo te deixa mais forte. Errar, mais fraco.</div>
      <div class="lci-options">
        ${pool.map(el => `<button class="lci-opt" data-el="${el}"><span class="lci-icon">${_LCI_ICONES[el]||''}</span><span>${_LCI_NOMES[el]||el}</span></button>`).join('')}
      </div>
    </div>`;
  document.getElementById('battle-overlay').appendChild(overlay);

  overlay.querySelectorAll('.lci-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      const chosen = btn.dataset.el;
      resolveLuaCheiaInvestida(p, enemy, bs, chosen);
      overlay.remove();
      _finishTurnAfterLuaInvestida(bs, p, enemy);
    });
  });
}

// Finaliza o turno do jogador após a escolha de elemento da Investida
// Elemental (espelha o trecho final padrão de doBattleAction()).
function _finishTurnAfterLuaInvestida(bs, p, e) {
  tickEnemyStatusEffects(bs, e);
  if (bs._enemyGuardTurns > 0 && e) {
    e.def = Math.max(0, (e.def || 0) - (e._guardDefBoost || 0));
    e._guardDefBoost = 0;
    bs._enemyGuardTurns = 0;
    appendBattleLog(`🛡️ A guarda de ${e.name} se desfaz.`, 'rgba(150,170,220,0.7)');
    buildStatusBadges();
  }

  updateBattleHUD();
  buildSkillList();

  if (battleState.enemyHp <= 0) {
    bs.phase = 'resolving';
    setTimeout(() => endBattle(true, false), battleDelay(400));
    return;
  }

  bs.turnCount++;
  setTimeout(() => runEnemyTurn(bs, p, e, false), battleDelay(850));
}

function resolveLuaCheiaInvestida(p, enemy, bs, chosenEl) {
  const enemyEl = (enemy && enemy.elemento) || 'neutro';
  const afin = (typeof AFINIDADE_ELEMENTAL !== 'undefined') ? AFINIDADE_ELEMENTAL[enemyEl] : null;
  let result = 'neutro';
  if (afin) {
    if (afin.forte && afin.forte.includes(chosenEl)) result = 'forte';
    else if (afin.fraco && afin.fraco.includes(chosenEl)) result = 'fraco';
  }

  let bonusPct = 0, logMsg = '', color = '', badgeText = '';
  const elNome = _LCI_NOMES[chosenEl] || chosenEl;
  if (result === 'forte') {
    bonusPct = 0.25;
    logMsg = `🔥 Investida de ${elNome} acerta em cheio a fraqueza de ${enemy.name}! +25% ATQ nesta batalha.`;
    color = '#ff8040';
    badgeText = `🔥 INVESTIDA CERTEIRA +25% ATQ`;
  } else if (result === 'fraco') {
    bonusPct = -0.20;
    logMsg = `❄️ Investida de ${elNome} é a pior escolha contra ${enemy.name}. -20% ATQ nesta batalha.`;
    color = '#6090c0';
    badgeText = `❄️ INVESTIDA FRACA -20% ATQ`;
  } else {
    bonusPct = 0.08;
    logMsg = `🌕 Investida de ${elNome} não tem efeito especial contra ${enemy.name}. +8% ATQ nesta batalha.`;
    color = '#c2a060';
    badgeText = `🌕 INVESTIDA NEUTRA +8% ATQ`;
  }

  const bonusVal = Math.round((p.atk || 0) * bonusPct);
  p._lua_cheia_investida_bonus = (p._lua_cheia_investida_bonus || 0) + bonusVal;
  p.atk = Math.max(0, (p.atk || 0) + bonusVal);

  appendBattleLog(logMsg, color);
  if (typeof showBattleSideBadge === 'function') showBattleSideBadge('hero', badgeText, color);
  updateBattleHUD();
  buildStatusBadges();
}

// Reverte o bônus/penalidade da investida ao fim da batalha (não persiste entre batalhas)
function clearLuaCheiaInvestida(p) {
  if (!p || !p._lua_cheia_investida_bonus) return;
  p.atk = Math.max(0, (p.atk || 0) - p._lua_cheia_investida_bonus);
  p._lua_cheia_investida_bonus = 0;
}

// ─────────────────────────────────────────────────────────────
//  PAPEL DE PAREDE DA ARENA DE BATALHA — por local (.battle-arena).
//  Hoje só a Floresta tem imagem própria; locais sem entrada no mapa
//  caem no gradiente padrão (nenhuma classe extra é aplicada).
//  Chamado em startBattle() e limpo em endBattle().
// ─────────────────────────────────────────────────────────────
const BATTLE_ARENA_BG_MAP = {
  floresta:  'bg-floresta',
  floresta2: 'bg-floresta',
};
function applyBattleArenaBg(location) {
  const arena = document.querySelector('.battle-arena');
  if (!arena) return;
  Object.values(BATTLE_ARENA_BG_MAP).forEach(cls => arena.classList.remove(cls));
  const cls = BATTLE_ARENA_BG_MAP[location];
  if (cls) arena.classList.add(cls);
}
window.applyBattleArenaBg = applyBattleArenaBg;

// ── Apresentação de chefe — tela cheia por ~3s antes da luta, com a arte
// de "ficha" dele (ex.: caopi.png do Tierra) surgindo em zoom+fade, nome
// deslizando e uma linha de destaque no centro. Qualquer inimigo com
// `introImg` definido ganha esse efeito automaticamente ao entrar em
// startBattle(); os demais pulam direto pra luta, sem mudança nenhuma.
function showBossIntro(enemy, onDone) {
  // Aceita tanto uma arte de ficha própria (enemy.introImg) quanto, na
  // ausência dela, a pose 'idle' recortada da sprite sheet do inimigo
  // (enemy.spriteImages) — assim não é preciso ter um arquivo extra só
  // pra essa tela.
  const hasArt = enemy && (enemy.introImg || enemy.spriteImages);
  if (!hasArt) { onDone(); return; }

  if (!document.getElementById('boss-intro-style')) {
    const st = document.createElement('style');
    st.id = 'boss-intro-style';
    st.textContent = `
      #boss-intro-overlay {
        position:fixed; inset:0; z-index:99999;
        background:radial-gradient(ellipse at center, rgba(12,9,4,0.94) 0%, rgba(0,0,0,0.99) 78%);
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        opacity:0; transition:opacity 0.35s ease; pointer-events:none;
      }
      #boss-intro-overlay.active { opacity:1; pointer-events:auto; }
      #boss-intro-line {
        position:absolute; top:50%; left:0; right:0; height:1px;
        background:linear-gradient(90deg, transparent, rgba(210,160,30,0.55), transparent);
        transform:translateY(-50%) scaleX(0); transition:transform 0.7s ease 0.1s;
      }
      #boss-intro-overlay.active #boss-intro-line { transform:translateY(-50%) scaleX(1); }
      #boss-intro-art {
        position:relative; max-width:78vw; max-height:52vh;
        display:flex; align-items:center; justify-content:center;
        filter:drop-shadow(0 0 30px rgba(180,140,40,0.5)) drop-shadow(0 6px 18px rgba(0,0,0,0.9));
        transform:scale(0.82); opacity:0;
        transition:transform 0.6s cubic-bezier(0.16,0.9,0.28,1.05), opacity 0.5s ease;
      }
      #boss-intro-art img { max-width:100%; max-height:100%; object-fit:contain; display:block; }
      #boss-intro-overlay.active #boss-intro-art { transform:scale(1); opacity:1; }
      #boss-intro-name {
        position:relative; margin-top:18px; font-family:'Noto Serif JP',serif; font-weight:900;
        font-size:1.5rem; letter-spacing:0.05em; color:#e8d090; text-align:center;
        text-shadow:0 0 14px rgba(200,150,20,0.7), 0 2px 6px rgba(0,0,0,0.9);
        opacity:0; transform:translateY(14px);
        transition:opacity 0.5s ease 0.25s, transform 0.5s ease 0.25s;
      }
      #boss-intro-overlay.active #boss-intro-name { opacity:1; transform:translateY(0); }
      #boss-intro-sub {
        position:relative; margin-top:4px; font-size:0.8rem; color:#a08050;
        letter-spacing:0.2em; text-transform:uppercase;
        opacity:0; transition:opacity 0.5s ease 0.4s;
      }
      #boss-intro-overlay.active #boss-intro-sub { opacity:1; }
    `;
    document.head.appendChild(st);
  }

  let overlay = document.getElementById('boss-intro-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'boss-intro-overlay';
    overlay.innerHTML = `
      <div id="boss-intro-line"></div>
      <div id="boss-intro-art"></div>
      <div id="boss-intro-name"></div>
      <div id="boss-intro-sub">Chefe se aproxima</div>
    `;
    document.body.appendChild(overlay);
  }
  const artEl = overlay.querySelector('#boss-intro-art');
  if (enemy.introImg) {
    artEl.innerHTML = `<img src="${enemy.introImg}" alt="${enemy.name || ''}"
      onerror="this.outerHTML='<span style=\'font-size:4rem\'>${enemy.icon || ''}</span>'">`;
  } else if (enemy.spriteImages && typeof buildEnemyVisual === 'function') {
    artEl.innerHTML = buildEnemyVisual(enemy, 240, 'idle');
  } else {
    artEl.innerHTML = '';
  }
  overlay.querySelector('#boss-intro-name').textContent = enemy.name || '';
  overlay.style.display = 'flex';
  overlay.classList.remove('active');

  if (CONFIG.vibration && navigator.vibrate) navigator.vibrate([40, 80, 120]);

  requestAnimationFrame(() => {
    void overlay.offsetWidth; // força reflow pra garantir a transição
    overlay.classList.add('active');
  });

  setTimeout(() => {
    overlay.classList.remove('active');
    setTimeout(() => { overlay.style.display = 'none'; onDone(); }, 350);
  }, 3000);
}
window.showBossIntro = showBossIntro;

// Ponto de entrada de toda batalha — decide se mostra a apresentação de
// chefe antes (enemy.introImg) ou vai direto pra luta (startBattleReal).
function startBattle(enemy) {
  fecharBattleItemMenu(); // não deixa o menu de itens da batalha anterior aberto
  if (enemy && (enemy.introImg || enemy.spriteImages)) {
    showBossIntro(enemy, () => startBattleReal(enemy));
  } else {
    startBattleReal(enemy);
  }
}

function startBattleReal(enemy) {
  G.inBattle = true;
  // Bestiário: registra o inimigo (e os membros de grupo) assim que a luta começa.
  // Idempotente; só marca ids que existem em BESTIARY_DEFS.
  try {
    if (enemy && window.Bestiary && typeof BESTIARY_DEFS !== 'undefined') {
      Bestiary.learnFromEnemy(enemy);
      const ids = [enemy.id, enemy.groupId];
      if (Array.isArray(enemy.members)) enemy.members.forEach(m => m && ids.push(m.id));
      ids.filter(Boolean).forEach(id => { if (BESTIARY_DEFS.some(d => d.id === id)) Bestiary.markFound(id); });
    }
  } catch (e) { console.warn('[bestiario] hook:', e); }
  fecharBattleItemMenu();
  if (window.missoeVerificarVisibilidade) missoeVerificarVisibilidade();
  _preloadSpriteImages();
  // Pré-carrega as poses separadas do inimigo (idle/prepare/attack/hit),
  // pra não piscar/atrasar na primeira troca de frame em combate.
  if (enemy && enemy.spriteImages) {
    Object.values(enemy.spriteImages).forEach(pose => {
      const src = pose && typeof pose === 'object' ? pose.src : pose;
      if (src) { const img = new Image(); img.src = src; }
    });
  }
  G.player.battlesTotal = (G.player.battlesTotal || 0) + 1;

  // AP de classes guerreiras agora persiste normalmente entre batalhas
  // (o reset forçado para o máximo foi removido — estava zerando o valor
  // real do jogador toda vez que uma luta começava, mesmo com AP baixo no hub).
  const warriorCheck = window.CLASSES.filter(c=>c.resource==='ap').map(c=>c.id);
  const isApClass = (G.player.classData && G.player.classData.resource === 'ap')
                 || (G.player.classData && warriorCheck.includes(G.player.classData.id));
  if (G.player.classData && isApClass) {
    G.player.ap = Math.max(0, Math.min(G.player.maxAp || 100, G.player.ap || 0));
  }

  // Reset estado
  Object.assign(battleState, {
    _battleEnded: false,
    enemyData: { ...enemy },
    enemyHp: enemy.hp,
    enemyMaxHp: enemy.hp,
    turnCount: 1,
    phase: 'player',
    defending: false,
    _shieldActive: false,
    _shieldTurns: 0,
    _wolfEnrage: false,
    comboCount: 0,
    comboTier: 0,
    enemyPoisoned: false, enemyPoisonTurns: 0,
    enemyBurning: false,  enemyBurnTurns: 0,
    enemyMarked: false,   enemyMarkTurns: 0,
    _sombraMarcada: false, _sombraSSLogged: false,
    enemySlowed: false,   enemySlowTurns: 0,
    enemyStunned: false,  enemyStunTurns: 0,
    playerPoisoned: false, playerPoisonTurns: 0,
    playerBleeding: false, playerBleedTurns: 0,
    playerBurning: false,  playerBurnTurns: 0,
    playerStunned: false,  playerStunTurns: 0,
    _buffAtkTurns: 0, _buffAtkAmt: 0,
    _buffDefTurns: 0, _buffDefAmt: 0,
    _coracaoAtkAmt: 0, _coracaoCritAmt: 0,
    _regenTurns: 0,
    enemyTurnAI: 0,
    enemyEnraged: false,
    // Sangramento inimigo (Paladino das Trevas)
    enemyBleeding: false, enemyBleedTurns: 0,
    // Maldições
    _cursed: false, _cursedTurns: 0,
    _enemy_cursed: false, _enemy_cursed_turns: 0,
    _elementoCarregado: null,
    _magoElementoAtivo: null,
    playerActionHistory: [],
    // Dano massivo recebido pelo jogador — usado por appendBattleLog() pra colorir a linha
    _danoMassivoPendente: false,
    // Comentários de batalha do HuBi (um de cada por luta, pra não poluir o log)
    _hubiComentouDemora: false,
    _hubiZoouGigante: false,
    _hubiFalouAlienigena: false,
    // Teto de XP que o HuBi pode ganhar curando NESSA luta (ver hubiTickCura em hubi.js)
    _hubiXpCuraAcumulado: 0,
    // ── Novos Selos ──
    _seloInnDebuffAtivo: false, _seloInnDebuffTurnos: 0, _seloInnReducaoValor: 0,
    _seloValeAtkAmt: 0,
    _seloIndeCritStreak: 0,
    _seloLimiarUsado50: false, _seloLimiarUsado25: false, _seloLimiarProximoBonus: false,
    _seloBastiaoDefAmt: 0, _seloBastiaoUsado: false,
  });

  // ── SELO DO VALE — ao entrar em batalha, sacrifica 15% do HP MÁXIMO do
  // jogador em troca de +20 ATQ pra luta inteira. O bônus de ATQ é revertido
  // em endBattle() (mesmo padrão do Coração Incandescente), senão acumula
  // permanentemente a cada batalha.
  if (G.player.selosEquipados && G.player.selosEquipados.some(s => s.id === 'selo_vale')) {
    const seloVale = ITEM_DB.selo_vale;
    const sacrificio = Math.max(1, Math.floor(G.player.maxHp * (seloVale.sacrificioHpPct || 0.15)));
    G.player.hp = Math.max(1, G.player.hp - sacrificio);
    G.player.atk = (G.player.atk || 0) + (seloVale.bonusAtk || 20);
    battleState._seloValeAtkAmt = seloVale.bonusAtk || 20;
    if (typeof appendBattleLog === 'function') {
      appendBattleLog(`🩸 Selo do Vale! Sacrificou ${sacrificio} HP em troca de +${seloVale.bonusAtk} ATQ para esta batalha!`, '#a02040');
    }
  }

  // ── SELO DO BASTIÃO — ao entrar em batalha, concede +15% de DEF pra
  // luta inteira. Revertido em endBattle() (mesmo padrão do Selo do Vale),
  // senão o bônus ia acumular permanentemente a cada batalha.
  if (G.player.selosEquipados && G.player.selosEquipados.some(s => s.id === 'selo_bastiao')) {
    const seloBastiao = ITEM_DB.selo_bastiao;
    const bonusDef = Math.max(1, Math.floor(G.player.def * (seloBastiao.bonusDefPct || 0.15)));
    G.player.def = (G.player.def || 0) + bonusDef;
    battleState._seloBastiaoDefAmt = bonusDef;
    if (typeof appendBattleLog === 'function') {
      appendBattleLog(`🛡️ Selo do Bastião! +${bonusDef} DEF para esta batalha.`, '#4090ff');
    }
  }
  const _indEl = document.getElementById('bat-elemento-indicador');
  if (_indEl) _indEl.style.display = 'none';

  // Inicializar flechas do Arqueiro
  const isArcher = G.player.classData && G.player.classData.id === 'arqueiro';
  if (isArcher) {
    const arrowMax = (typeof getArrowsMax === 'function') ? getArrowsMax(G.player) : (G.player.classData.arrows ? G.player.classData.arrows.max : 30);
    G.player.arrows = arrowMax;
    // Resetar contadores de flechas especiais
    battleState._arrowTurnCounter = 0;
    battleState._arrowNegraTurns  = 0;
  }
  // Mostrar/ocultar botão de flecha
  const btnFlecha = document.getElementById('btn-trocar-flecha');
  if (btnFlecha) btnFlecha.style.display = isArcher ? '' : 'none';
  // Atualizar label do botão com flecha equipada
  _updateArrowBtnLabel();

  // Preencher overlay — herói
  const heroIconEl = document.getElementById('bat-hero-icon');
  if (G.player.classData && G.player.classData.sprite) {
    heroIconEl.innerHTML = buildHeroVisual(90, 'idle');
    playHeroEntrance();
  } else {
    heroIconEl.textContent = G.player.classData ? G.player.classData.icon : '⚔';
  }
  document.getElementById('bat-hero-name').textContent   = G.player.classData ? G.player.classData.name : 'Herói';

  // Nome + badge de elemento do inimigo
  const _elemIcones = { fogo:'🔥', agua:'💧', eletrico:'⚡', gelo:'❄️', planta:'🌿', terra:'🪨',
    energia:'✨', magia_negra:'🌑', vento:'🌪️', caos:'🌀', veneno:'☠️', luz:'☀️', sombra:'👤', cristal:'💎' };
  const _elemNomes  = { fogo:'Fogo', agua:'Água', eletrico:'Elétrico', gelo:'Gelo', planta:'Planta',
    terra:'Terra', energia:'Energia', magia_negra:'Magia Negra', vento:'Vento', caos:'Caos',
    veneno:'Veneno', luz:'Luz', sombra:'Sombra', cristal:'Cristal' };
  const _elemInimigo = enemy.elemento;
  document.getElementById('bat-enemy-name').textContent = enemy.name;
  if (typeof hubiChecarInimigoGigante === 'function') hubiChecarInimigoGigante(battleState, enemy);
  const _elemBadgeEl = document.getElementById('bat-enemy-elem-badge');
  if (_elemBadgeEl) {
    if (_elemInimigo && _elemInimigo !== 'neutro') {
      _elemBadgeEl.textContent = `${_elemIcones[_elemInimigo]||''} ${_elemNomes[_elemInimigo]||_elemInimigo}`;
      _elemBadgeEl.style.display = 'inline-block';
    } else {
      _elemBadgeEl.textContent = '';
      _elemBadgeEl.style.display = 'none';
    }
  }

  const batIcon = document.getElementById('bat-enemy-icon');
  batIcon.innerHTML = buildEnemyVisual(enemy, 112, 'idle');
  batIcon.classList.toggle('no-float', !!enemy.noIdleFloat);
  batIcon.style.display = 'flex';
  batIcon.style.alignItems = 'center';
  batIcon.style.justifyContent = 'center';
  batIcon.style.background = 'transparent';
  batIcon.style.border = 'none';

  document.getElementById('battle-log-box').innerHTML = '';
  applyBattleLogCollapsedPref();

  // ── Coração Incandescente: se já estiver 100% carregado (e não quebrado),
  //    o buff ativa assim que a batalha começa. Senão, ele carrega aos
  //    poucos a cada turno (ver tickPlayerStatusEffects) até chegar lá.
  const _accEquip = (G.player.inventory || []).find(i => i.equipped && i.id === 'coracao_incandescente');
  if (_accEquip && !_accEquip._quebrado && (_accEquip._carga || 0) >= 100) {
    const bAtk  = _accEquip.buffAtk  || 12;
    const bCrit = _accEquip.buffCrit || 10;
    const bHeal = _accEquip.buffHeal || 30;
    battleState._coracaoAtkAmt  = bAtk;
    battleState._coracaoCritAmt = bCrit / 100;
    G.player.atk = (G.player.atk || 0) + bAtk;
    G.player.critBonus = (G.player.critBonus || 0) + (bCrit / 100);
    G.player.hp = Math.min(G.player.maxHp, (G.player.hp || 0) + bHeal);
    _accEquip._buffApplied = true;
    appendBattleLog(`🔥 Coração Incandescente está pleno! ATQ +${bAtk}, Crítico +${bCrit}%, +${bHeal} HP!`, '#ff6a2a');
    notify(`🔥 Coração Incandescente ativo! ATQ+${bAtk}, Crítico+${bCrit}%, +${bHeal} HP`, 'gold');
  }


  updateBattleHUD();
  updateEquippedGearHUD();
  buildSkillList();
  buildStatusBadges();
  updateComboDisplay();
  setBattleButtons(true);
  document.getElementById('battle-overlay').classList.add('active');
  // Ambientação visual da Fase da Lua ativa (Assassino) — cores, glow e partículas
  if (typeof applyLuaBattleAmbience === 'function') applyLuaBattleAmbience(G.player);
  // Papel de parede do fundo da arena de batalha, por local
  applyBattleArenaBg(G.location);

  // ── Buffs da Divina Trindade: mostrar no painel se ativos ──
  const _tb = G.player._trindadeBuffs;
  if (_tb) {
    // Usa SVG data URI com emoji como ícone (não depende de arquivo de imagem)
    const _svgIcon = (emoji, cor) =>
      `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48'><rect width='48' height='48' rx='8' fill='${encodeURIComponent(cor)}' opacity='0.25'/><text x='50%' y='54%' font-size='26' text-anchor='middle' dominant-baseline='middle'>${emoji}</text></svg>`;
    if (_tb.hond)    _showBuffPanel('trindade-hond',    _svgIcon('🔥','#ff6030'), '🔥 Hond\nATQ+15');
    if (_tb.celia)   _showBuffPanel('trindade-celia',   _svgIcon('🌿','#60c040'), '🌿 Celia\nHP+30');
    if (_tb.astegar) _showBuffPanel('trindade-astegar', _svgIcon('✨','#f0e080'), '✨ Astegar\nDEF+12');
  }
  if (typeof applyLuaBattleAmbience === 'function') applyLuaBattleAmbience(G.player);

  // Espírito Imortal: escudo inicial
  if (G.player._talent_immortal_spirit) {
    battleState._chi_barrier = 40;
    appendBattleLog('☯️ Espírito Imortal: Escudo de Chi (40) ativo!', '#60a0c0');
  }

  // ── Iniciativa Absoluta — Kappa age PRIMEIRO ──
  if (enemy._kappaVelocidade) {
    setBattleButtons(false);
    appendBattleLog(`🐢 INICIATIVA ABSOLUTA! O Kappa age antes de qualquer um!`, '#00aaff');
    setTimeout(() => runEnemyTurn(battleState, G.player, battleState.enemyData, false), battleDelay(1200));
    return; // jogador só age depois do turno do Kappa
  }

  // Primer de turno
  if (typeof applyTalentTurnStart === 'function') applyTalentTurnStart(battleState);

  // Mensagem de abertura dinâmica
  if (enemy.id === 'gorila') {
    // Encontro raríssimo (13% de chance, só em Lendário) — entrada própria,
    // mais dramática que o banner de chefe padrão.
    appendBattleLog(`🦍 O chão treme. Os pássaros fogem em massa da copa das árvores. O Rei da Selva em pessoa se ergue diante de você!`, '#e8a020');
    appendBattleLog(`👑 ENCONTRO LENDÁRIO!`, '#ffd700');
  } else {
    const openingMsgs = [
      `⚔ ${enemy.name} surge das sombras!`,
      `💀 ${enemy.name} bloqueia seu caminho!`,
      `🌑 ${enemy.name} ataca! Prepare-se!`,
    ];
    appendBattleLog(openingMsgs[Math.floor(Math.random()*openingMsgs.length)], 'rgba(200,80,20,0.8)');

    if (enemy.isBoss) {
      appendBattleLog(`⚠ CHEFE!`, '#ffaa00');
    }
  }

  updateBattleTurnIndicator('player');

  // Tutorial de fusão elemental (só para o Mago, só uma vez)
  if (G.player.classData && G.player.classData.id === 'mago') {
    setTimeout(() => {
      if (typeof mostrarTutorialFusao === 'function') mostrarTutorialFusao();
    }, 1200);
  }

  // Lua Cheia do Assassino: a escolha de investida elemental agora é
  // feita via skill própria ("Investida Elemental") no menu de skills,
  // em vez de abrir automaticamente ao entrar em batalha.
}

// ── Mago: anel elemental sobre o sprite (troca conforme o elemento usado) ──
// Fica ativo até o jogador usar uma skill de OUTRO elemento; ataque normal
// e skills sem elemento mapeado não alteram o anel atual.
const MAGO_ELEM_ICONS = {
  agua:     'Imagens/icones/Picsart_26-06-30_21-16-08-204.png',
  fogo:     'Imagens/icones/Picsart_26-06-30_21-16-40-786.png',
  vento:    'Imagens/icones/Picsart_26-07-01_03-06-23-587.png',
  terra:    'Imagens/icones/Picsart_26-07-01_03-07-08-602.png',
  caos:     'Imagens/icones/Picsart_26-07-01_03-09-47-612.png',
  eletrico: 'Imagens/icones/Picsart_26-07-01_03-05-36-441.png',
  planta:   'Imagens/icones/Picsart_26-06-30_21-17-47-840.png',
  energia:  'Imagens/icones/Picsart_26-06-30_21-17-08-742.png',
};

function updateMagoElemBadge() {
  const badge = document.getElementById('mago-elem-badge');
  if (!badge) return;

  // Injeta CSS de giro suave uma única vez
  if (!document.getElementById('mago-elem-css')) {
    const st = document.createElement('style');
    st.id = 'mago-elem-css';
    st.textContent = `
      @keyframes mago-elem-spin {
        from { transform: translate(-50%,-50%) rotate(0deg); }
        to   { transform: translate(-50%,-50%) rotate(360deg); }
      }
    `;
    document.head.appendChild(st);
  }

  const elem = (typeof battleState !== 'undefined') ? battleState._magoElementoAtivo : null;
  const src  = elem ? MAGO_ELEM_ICONS[elem] : null;

  if (!src) {
    badge.style.display = 'none';
    badge.style.animation = 'none';
    return;
  }

  if (badge.dataset.elem !== elem) {
    badge.src = src;
    badge.dataset.elem = elem;
  }
  badge.style.display = 'block';
  badge.style.animation = 'mago-elem-spin 9s linear infinite';
  badge.style.filter = 'drop-shadow(0 0 12px rgba(255,255,255,0.55))';
}

// ── Aura Protetora: badge animado sobre o sprite do Paladino ──
function updateAuraBadge() {
  const badge = document.getElementById('pal-aura-badge');
  if (!badge) return;

  // Injeta CSS de piscar uma única vez
  if (!document.getElementById('pal-aura-css')) {
    const st = document.createElement('style');
    st.id = 'pal-aura-css';
    st.textContent = `
      @keyframes pal-aura-pulse {
        0%,100% { opacity: var(--aura-op, 1); }
        50%      { opacity: calc(var(--aura-op, 1) * 0.35); }
      }
    `;
    document.head.appendChild(st);
  }

  const turns = (typeof battleState !== 'undefined') ? (battleState._buffDefTurns || 0) : 0;

  if (turns <= 0) {
    // Aura inativa — esconde
    badge.style.display = 'none';
    badge.style.animation = 'none';
  } else if (turns >= 2) {
    // Turnos 3,2 (ativo) — plena, sem piscar
    badge.style.display = 'block';
    badge.style.setProperty('--aura-op', '1');
    badge.style.opacity = '0.72';
    badge.style.animation = 'none';
    badge.style.filter = 'drop-shadow(0 0 12px rgba(255,220,80,1)) drop-shadow(0 0 24px rgba(255,180,0,0.6))';
  } else if (turns === 1) {
    // Turno 2 — 50% opacidade, pisca devagar
    badge.style.display = 'block';
    badge.style.setProperty('--aura-op', '0.5');
    badge.style.animation = 'pal-aura-pulse 1.6s ease-in-out infinite';
    badge.style.filter = 'drop-shadow(0 0 8px rgba(255,220,80,0.6)) drop-shadow(0 0 16px rgba(255,180,0,0.3))';
  }
}

function updateBattleHUD() {
  const p = G.player;

  // Passiva de Siu — Sacerdotisa Negra: toda cura recebida pelo jogador também cura uma parte dela
  const _bossPassiva = G._dungeonEnemyPassiva;

  // Passiva do Lorde das Sombras: drena HP do jogador e aumenta critico a cada turno
  if (_bossPassiva && _bossPassiva.tipo === 'lorde_dreno') {
    if (_bossPassiva._firstTurn) {
      _bossPassiva._firstTurn = false;
      appendBattleLog('🌑 PASSIVA — Dreno das Sombras ativado! O Lorde drena sua vida a cada turno e aumenta seu critico.', '#1aaf3a');
    }
    if (typeof _ds_lorde_checkFuga === 'function' && _ds_lorde_checkFuga()) {
      appendBattleLog('🌑 O Lorde recua! Foge para as sombras!', '#1aaf3a');
      setTimeout(() => { if (typeof endBattle === 'function') endBattle('win'); }, battleDelay(1200));
    }
  }

  if (_bossPassiva && _bossPassiva.tipo === 'siu_dreno_cura') {
    if (typeof battleState._siuLastPlayerHp !== 'number') battleState._siuLastPlayerHp = p.hp;
    if (p.hp > battleState._siuLastPlayerHp) {
      const _healedAmt = p.hp - battleState._siuLastPlayerHp;
      const _siuRoubo = Math.max(1, Math.floor(_healedAmt * (_bossPassiva.curaPctRoubo || 0.3)));
      battleState.enemyHp = Math.min(battleState.enemyMaxHp, battleState.enemyHp + _siuRoubo);
      appendBattleLog(`🌑 Sua cura ecoa até Siu! Ela absorve ${_siuRoubo} HP.`, '#9050c0');
      showFloatingNumber('enemy', _siuRoubo, 'heal');
    }
    battleState._siuLastPlayerHp = p.hp;
  }

  const hpPct = Math.max(0, (p.hp / p.maxHp) * 100);
  document.getElementById('bat-hero-hp-bar').style.width = hpPct + '%';
  document.getElementById('bat-hero-hp').textContent = `${p.hp}/${p.maxHp} HP`;

  // Barra de AP do herói (só aparece para warriors)
  const isWarriorBattle = ((p.classData && p.classData.resource === 'ap') || window.CLASSES.filter(c=>c.resource==='ap').map(c=>c.id).includes(p.class));
  const apBarWrap = document.getElementById('bat-hero-ap-bar-wrap');
  if (apBarWrap) {
    if (isWarriorBattle && p.maxAp > 0) {
      apBarWrap.style.display = 'block';
      const apPct = Math.max(0, Math.min(100, ((p.ap || 0) / p.maxAp) * 100));
      document.getElementById('bat-hero-ap-bar').style.width = apPct + '%';
    } else {
      apBarWrap.style.display = 'none';
    }
  }

  // Barra de MP do mago
  const mpBarWrap = document.getElementById('bat-hero-mp-bar-wrap');
  if (mpBarWrap) {
    if (p.class === 'mago' && p.maxMp > 0) {
      mpBarWrap.style.display = 'block';
      const mpPct = Math.max(0, Math.min(100, ((p.mp || 0) / p.maxMp) * 100));
      document.getElementById('bat-hero-mp-bar').style.width = mpPct + '%';
    } else {
      mpBarWrap.style.display = 'none';
    }
  }

  // HUD de flechas (só para Arqueiro)
  const arrowEl = document.getElementById('bat-hero-arrows');
  if (arrowEl) {
    if (p.class === 'arqueiro') {
      arrowEl.style.display = 'inline-block';
      if (typeof updateArrowHUD === 'function') updateArrowHUD(p);
    } else {
      arrowEl.style.display = 'none';
    }
  }

  // ── Fervor Selvagem / Forma Espiritual (Arqueiro) ──
  if (typeof updateFervorHUD === 'function') updateFervorHUD(p);

  // ── Paladino Lv5: ícone da skill pronta quando AP >= 100 ──
  if (p._pal_lv5_chosen === 'julgamento_divino') {
    let skReadyEl = document.getElementById('pal-lv5-skill-ready');
    const apFull = (p.ap || 0) >= 100;
    if (apFull) {
      if (!skReadyEl) {
        skReadyEl = document.createElement('div');
        skReadyEl.id = 'pal-lv5-skill-ready';
        skReadyEl.style.cssText = `
          position:absolute;top:-6px;right:-10px;
          display:flex;flex-direction:column;align-items:center;gap:1px;
          animation:pal-skill-pulse 1.2s ease-in-out infinite;
          pointer-events:none;z-index:15;
        `;
        // Injeta CSS da animação uma única vez
        if (!document.getElementById('pal-lv5-css')) {
          const style = document.createElement('style');
          style.id = 'pal-lv5-css';
          style.textContent = `
            @keyframes pal-skill-pulse {
              0%,100%{opacity:1;transform:scale(1);}
              50%{opacity:0.65;transform:scale(1.08);}
            }
          `;
          document.head.appendChild(style);
        }
        skReadyEl.innerHTML = `
          <img src="Imagens/personagens/paladino/Picsart_26-06-29_03-23-29-931.png"
            onerror="this.textContent='⚖️';this.style.fontSize='18px';"
            style="width:26px;height:26px;object-fit:contain;border-radius:5px;
                   border:1px solid #c8960a;box-shadow:0 0 6px rgba(200,150,10,0.7);">
          <span style="font-size:0.52rem;color:#f0d890;font-family:'Noto Sans JP',sans-serif;
                       text-shadow:0 0 4px rgba(200,150,10,0.9);">PRONTO</span>
        `;
        // Coloca no canto do ícone do herói (não mais no rodapé, onde fica nome/HP)
        const heroIcon = document.getElementById('bat-hero-icon');
        if (heroIcon) {
          heroIcon.style.position = heroIcon.style.position || 'relative';
          heroIcon.appendChild(skReadyEl);
        }
      }
    } else if (skReadyEl) {
      skReadyEl.remove();
    }
  }

  // ── Paladino: badge da Aura Protetora sobre o sprite ──
  updateAuraBadge(); // (Assassino — só na Lua Sangrenta, valor em p._lua_corrupcao)
  // ── Mago: anel elemental sobre o sprite ──
  updateMagoElemBadge();
  const corrWrap = document.getElementById('bat-hero-corrupcao-wrap');
  if (corrWrap) {
    const isAssassino = p.class === 'assassino' || (p.classData && p.classData.id === 'assassino');
    const luaSangrenta = isAssassino
      && typeof getAssassinoLuaAtiva === 'function'
      && getAssassinoLuaAtiva(p) === 'sangrenta';
    const corrVal = luaSangrenta ? (p._lua_corrupcao || 0) : 0;
    if (typeof applyBloodMoonBattleFX === 'function') applyBloodMoonBattleFX(luaSangrenta);
    if (luaSangrenta) {
      corrWrap.style.display = 'block';
      const corrPct = Math.max(0, Math.min(100, corrVal));
      document.getElementById('bat-hero-corrupcao-bar').style.width = corrPct + '%';
      const label = document.getElementById('bat-hero-corrupcao-label');
      if (label) {
        const isMax = corrVal >= 100;
        label.textContent = `☽ ${corrVal} / 100 CORRUPÇÃO`;
        label.style.color  = isMax ? '#ff2f6e' : '#ce93d8';
        label.style.textShadow = isMax ? '0 0 8px rgba(255,47,110,0.9)' : 'none';
      }
    } else {
      corrWrap.style.display = 'none';
    }
  }

  const ePct = Math.max(0, (battleState.enemyHp / battleState.enemyMaxHp) * 100);
  const eBar = document.getElementById('bat-enemy-hp-bar');
  eBar.style.width = ePct + '%';
  // Cor da barra: verde → amarelo → vermelho (ou azul fixo para feiticeiras como Siu, ou verde fixo para o Lorde das Sombras)
  if (battleState.enemyData && battleState.enemyData.vidaVerde) {
    eBar.style.background = 'linear-gradient(90deg,#0a5c1a,#1aaf3a)';
  } else if (battleState.enemyData && battleState.enemyData.vidaAzul) {
    eBar.style.background = 'linear-gradient(90deg,#1a2a8b,#2050c4)';
  } else if (ePct > 60) eBar.style.background = 'linear-gradient(90deg,#8b1a18,#c43020)';
  else if (ePct > 30) eBar.style.background = 'linear-gradient(90deg,#8b5a00,#c08020)';
  else eBar.style.background = 'linear-gradient(90deg,#300,#c00)';

  document.getElementById('bat-enemy-hp').textContent =
    (battleState.enemyData && battleState.enemyData.hiddenHp)
      ? `??? HP`
      : `${Math.max(0, battleState.enemyHp)}/${battleState.enemyMaxHp} HP`;

  // Inimigo enraivecido?
  if (!battleState.enemyEnraged && battleState.enemyHp / battleState.enemyMaxHp < 0.3) {
    battleState.enemyEnraged = true;
    appendBattleLog(`⚠ ${battleState.enemyData.name} está enraivecido! (+50% ATQ)`, '#ff4020');
    flashDamage('enemy');
  }

  buildStatusBadges();
  updateEquippedGearHUD();
  updateRuneBadgeBattle();
  if (typeof updateHubiBattleBadge === 'function') updateHubiBattleBadge();
}

// Renderiza ícones de itens equipados no HUD de batalha
function updateEquippedGearHUD() {
  if (typeof garantirUmEquipadoPorSlot === 'function') garantirUmEquipadoPorSlot();
  const el = document.getElementById('bat-equipped-gear');
  if (!el) return;
  const inv = (G.player && G.player.inventory) || [];
  const equipped = inv.filter(i => i.equipped && i.type === 'equipamento');
  if (!equipped.length) { el.style.display = 'none'; return; }
  // ── Força layout em linha via !important: uma stylesheet externa
  //    (ex.: ukiyo-e-redesign.css) pode ter regra com !important
  //    definindo flex-direction:column e sobrescrevendo o style inline
  //    original do HTML, fazendo os ícones empilharem verticalmente.
  el.style.setProperty('display', 'flex', 'important');
  el.style.setProperty('flex-direction', 'row', 'important');
  el.style.setProperty('flex-wrap', 'nowrap', 'important');
  el.style.setProperty('align-items', 'center', 'important');
  el.style.setProperty('justify-content', 'center', 'important');
  el.style.setProperty('gap', '4px', 'important');
  el.innerHTML = equipped.map((item, idx) => {
    const img = item.imgSrc
      ? `<img src="${_getItemIconSrc(item)}" style="width:28px;height:28px;object-fit:contain;mix-blend-mode:screen;" title="${item.name}">`
      : `<span title="${item.name}" style="font-size:1.2rem;">${item.icon || '📦'}</span>`;
    // Encontra o índice real no inventário para showItemPopup
    const invIdx = (G.player.inventory || []).indexOf(item);
    return `<div onclick="showItemPopup(${invIdx}, G.player.inventory[${invIdx}])" style="
      display:flex;align-items:center;justify-content:center;
      width:34px;height:34px;
      background:rgba(200,150,10,0.08);
      border:1px solid rgba(200,150,10,0.25);
      border-radius:3px;
      position:relative;
      cursor:pointer;
    " title="Toque para ver detalhes">${img}</div>`;
  }).join('');
}

// updateRuneBadgeBattle(), openRuneDetailPopup() e closeRuneDetailPopup()
// foram movidas para runas.js (fica lá a versão viva).

function updateBattleTurnIndicator(whose) {
  const el = document.getElementById('battle-turn-indicator');
  el.className = whose === 'player' ? 'player-turn' : 'enemy-turn';
  el.textContent = `Turno ${battleState.turnCount} — ${whose === 'player' ? '⚔ Sua Vez' : '💀 Inimigo Age!'}`;
  if (whose === 'player') {
    if (typeof hubiChecarBatalhaDemorada === 'function') hubiChecarBatalhaDemorada(battleState);
    if (typeof hubiTalvezFalarAlienigena === 'function') hubiTalvezFalarAlienigena(battleState);
  }
}

function appendBattleLog(msg, color) {
  const box = document.getElementById('battle-log-box');
  const div = document.createElement('div');

  // ── BUGFIX: o CSS (#battle-log-box > div / .battle-log-box .log-entry)
  //    define "color" com !important em duas folhas de estilo diferentes
  //    (gat-1.html e ukiyo-e-redesign.css), o que sempre vencia a cor
  //    passada aqui — por isso toda linha do log saía na mesma cor
  //    "creme" padrão, mesmo quando o código pedia verde/vermelho/etc.
  //    Um "!important" inline tem prioridade sobre "!important" de
  //    stylesheet (maior especificidade dentro do mesmo nível de
  //    importância), então isso resolve pra TODAS as cores já usadas
  //    no jogo, não só as novas abaixo.
  let corFinal = color || 'rgba(242,232,208,0.7)';
  let msgFinal = msg;
  let negrito  = false;

  // ── Dano massivo recebido: marcado por applyDmgToPlayer() logo antes
  //    de chamar appendBattleLog() pra essa mesma linha. Sobrescreve
  //    qualquer cor específica do ataque, porque "levei um dano gigante"
  //    deve saltar aos olhos sempre.
  if (typeof battleState !== 'undefined' && battleState && battleState._danoMassivoPendente) {
    battleState._danoMassivoPendente = false;
    corFinal = '#ff2020';
    negrito  = true;
  }

  div.style.cssText = `font-size:0.74rem;font-family:'Noto Sans JP',sans-serif;color:${corFinal} !important;padding:2px 0;border-bottom:1px solid rgba(255,255,255,0.03);`;
  if (negrito) div.style.fontWeight = '700';
  div.textContent = msgFinal;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

// ── Minimizar/expandir o registro de batalha (preferência salva) ──
function toggleBattleLog() {
  const box = document.getElementById('battle-log-box');
  const btn = document.getElementById('battle-log-toggle-btn');
  if (!box) return;
  const collapsed = box.classList.toggle('log-collapsed');
  if (btn) btn.classList.toggle('is-collapsed', collapsed);
  try { localStorage.setItem('clivor_battleLogCollapsed', collapsed ? '1' : '0'); } catch (e) {}
}

// Aplica a preferência salva sempre que uma batalha começa.
function applyBattleLogCollapsedPref() {
  const box = document.getElementById('battle-log-box');
  const btn = document.getElementById('battle-log-toggle-btn');
  if (!box) return;
  let collapsed = false;
  try { collapsed = localStorage.getItem('clivor_battleLogCollapsed') === '1'; } catch (e) {}
  box.classList.toggle('log-collapsed', collapsed);
  if (btn) btn.classList.toggle('is-collapsed', collapsed);
}

function setBattleButtons(enabled) {
  const btns = document.querySelectorAll('.battle-btn, .skill-battle-btn');
  btns.forEach(b => b.disabled = !enabled);
}

// ─────────────────────────────────────────────────────────────
//  MEMÓRIA DE AÇÕES DO JOGADOR — guarda as últimas ações pra
//  permitir que o inimigo reaja a padrões (ver 2b, ainda não
//  implementado: gatilhos de reação usando esse histórico).
// ─────────────────────────────────────────────────────────────
const ACTION_TAG_KEYWORDS = {
  veneno:   ['veneno', 'envenena', 'toxina'],
  fogo:     ['fogo', 'queima', 'chama', 'incend'],
  gelo:     ['gelo', 'congela', 'gelad'],
  sangue:   ['sangra', 'sangue', 'corte', 'lamina', 'lâmina'],
  cura:     ['cura', 'regenera', 'restaura'],
  dreno:    ['drena', 'dreno', 'suga', 'rouba'],
  atordoa:  ['atordoa', 'atordo', 'stun'],
  cega:     ['cega', 'cegar', 'cegueira'],
  escudo:   ['escudo', 'defesa', 'bloqueio', 'aura'],
  critico:  ['crítico', 'critico', 'crit'],
};

// Remove acentos e baixa a caixa, pra comparar texto livre de forma simples
function _normalizeBattleText(str) {
  return String(str || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

// Olha nome/descrição da skill e devolve as tags temáticas que reconhecer
function inferActionTags(name, desc) {
  const text = _normalizeBattleText((name || '') + ' ' + (desc || ''));
  const tags = [];
  for (const tag in ACTION_TAG_KEYWORDS) {
    if (ACTION_TAG_KEYWORDS[tag].some(kw => text.includes(_normalizeBattleText(kw)))) {
      tags.push(tag);
    }
  }
  return tags;
}

// Registra uma ação do jogador no histórico da batalha (mantém só as últimas 4)
function recordPlayerAction(bs, info) {
  if (!bs) return;
  if (!Array.isArray(bs.playerActionHistory)) bs.playerActionHistory = [];
  bs.playerActionHistory.push({
    turn: bs.turnCount,
    type: info.type,             // 'attack' | 'skill' | 'item' | 'flee'
    key:  info.key  || null,     // id/chave da skill ou item
    name: info.name || '',
    isCrit: info.isCrit === true,
    tags: info.tags || [],
  });
  if (bs.playerActionHistory.length > 4) bs.playerActionHistory.shift();
}

// ── AÇÃO DO JOGADOR ──
function doBattleAction(action, skillIdx) {
  if (!G.inBattle || battleState.phase !== 'player') return;

  // Botão ITEM funciona como interruptor: aberto → fecha; qualquer outra ação também fecha o popup
  if (action === 'item') {
    if (fecharBattleItemMenu()) return; // estava aberto: só fecha (continua o turno do jogador)
  } else {
    fecharBattleItemMenu();
  }

  const p   = G.player;
  const cls = p.classData;
  const e   = battleState.enemyData;
  const bs  = battleState;
  const isWarrior = ((cls && cls.resource === 'ap') || window.CLASSES.filter(c=>c.resource==='ap').map(c=>c.id).includes(cls.id));

  bs.defending = false;
  bs.phase = 'resolving';
  setBattleButtons(false);

  // ── Sleep (Estátua do Sonho — Corredor das Estátuas) ──
  // Flag própria (bs.playerSleeping), separada de playerStunned, pra não
  // colidir com outros efeitos que já usam essa flag. Enquanto dormindo,
  // o jogador não consegue agir — a ação escolhida é ignorada e o turno
  // vai direto pro inimigo.
  if (bs.playerSleeping && bs.playerSleepTurns > 0) {
    bs.playerSleepTurns--;
    appendBattleLog('💤 Você está dormindo e não consegue agir!', '#8090c0');
    if (bs.playerSleepTurns <= 0) {
      bs.playerSleeping = false;
      appendBattleLog('💤 Você acorda!', '#c0c0e0');
    }
    updateHUD();
    buildStatusBadges();
    setTimeout(() => runEnemyTurn(bs, p, e, false), battleDelay(650));
    return;
  }

  let playerActed = false;
  let skipEnemyTurn = false;

  // ─────────────── ATACAR ───────────────
  if (action === 'attack') {
    // Arqueiro: ataque normal consome 1 flecha
    const isArcher = cls.id === 'arqueiro';
    if (isArcher) {
      const curArrows = (typeof getArrows === 'function') ? getArrows(p) : (p.arrows || 0);
      if (curArrows < 1) {
        appendBattleLog('🏹 Sem flechas! Recupere flechas defendendo ou aguardando.', '#ff6040');
        bs.phase = 'player';
        setBattleButtons(true);
        return;
      }
      if (typeof consumeArrows === 'function') consumeArrows(p, 1);
      if (typeof playSfxFlecha === 'function') playSfxFlecha();

      // ── Efeitos da Flecha Negra por turno ──
      const arrowId = p.equippedArrow || 'normal';
      if (arrowId === 'negra') {
        bs._arrowNegraTurns = (bs._arrowNegraTurns || 0) + 1;
        // Buff crescente: +2% ATQ e +2% Crit por turno ativo, até +30%
        bs._arrowNegraStack = Math.min(15, (bs._arrowNegraStack || 0) + 1);
        const hpCost = Math.ceil(p.maxHp * 0.14);
        p.hp = Math.max(1, p.hp - hpCost);
        appendBattleLog(`🖤 Flecha Negra consome ${hpCost} HP seu!`, '#c060c0');
        updateBattleHUD();
        if (p.hp <= 1) {
          appendBattleLog('⚠ Você está quase morto! Troque de flecha!', '#ff4040');
        }
      }

      // ── Flecha D'Água: cura passiva por turno ──
      if (arrowId === 'dagua') {
        const arrowDefDagua = (typeof getArrowType === 'function') ? getArrowType('dagua') : null;
        const efDagua = (arrowDefDagua && arrowDefDagua.efeitos) || {};
        const scaleLevel = efDagua.healScaleLevel || 5;
        const maxPct = efDagua.healPctAtMaxLevel || 0.03;
        const pctAtual = Math.min(maxPct, (maxPct / scaleLevel) * (p.level || 1));
        const healAmt = Math.max(Math.round(efDagua.healFlat || 1.5), Math.floor(p.maxHp * pctAtual));
        if (p.hp < p.maxHp) {
          p.hp = Math.min(p.maxHp, p.hp + healAmt);
          appendBattleLog(`💧 Flecha D'Água: +${healAmt} HP!`, '#60a0e0');
          showFloatingNumber('hero', healAmt, 'heal');
          updateBattleHUD();
        }
      }

      // ── Contador de turno para flechas com cooldown ──
      bs._arrowTurnCounter = (bs._arrowTurnCounter || 0) + 1;

      // ── Forma Espiritual: decrementa duração a cada ação do Arqueiro ──
      if (typeof tickFormaEspiritual === 'function') tickFormaEspiritual(bs);
    }
    if (p.class === 'mago') playSfxMagoBase();
    playerActed = true;
    animHeroAttack();

    // ── Livro da Mana: recupera MP a cada ataque básico ──
    if (typeof aplicarLivroManaPassivo === 'function') aplicarLivroManaPassivo(bs, p);

    // ── Pegar flecha equipada ──
    const arrowId = (cls.id === 'arqueiro') ? (p.equippedArrow || 'normal') : 'normal';
    const arrowDef = (typeof getArrowType === 'function') ? getArrowType(arrowId) : {efeitos:{}};
    const ef = arrowDef.efeitos || {};

    // Chance de errar (Flecha Élfica reduz miss)
    const baseMiss = BATTLE_CONFIG.MISS_CHANCE - (p.spd * 0.002);
    let missChance = ef.missReduction ? baseMiss * (1 - ef.missReduction) : baseMiss;
    // ── Forma Ronin (Samurai da Máscara Partida): quase impossível de acertar — só 7% de chance ──
    if (e._roninAtivo) missChance = 0.93;
    if (Math.random() < Math.max(0, missChance)) {
      appendBattleLog(`💨 Seu ataque errou!`, 'rgba(180,180,180,0.7)');
      showFloatingNumber('enemy', 0, 'miss');
    } else {
      // ── Flecha Branca: Tiro Certeiro a cada 4 turnos ──
      const tiroCerteiro = (arrowId === 'branca' && bs._arrowTurnCounter > 0 && bs._arrowTurnCounter % 4 === 0);

      // Cálculo de dano
      // Flecha Negra: +20% ATQ, crescendo +2%/turno (até +30% extra)
      const stackBonusAtk = (arrowId === 'negra' && ef.stackPerTurn)
        ? Math.min(ef.stackMax || 0.30, (bs._arrowNegraStack || 0) * ef.stackPerTurn)
        : 0;
      const atkMod = ef.atkMod ? Math.floor(p.atk * (ef.atkMod + stackBonusAtk)) : 0;
      // Flecha Élfica: ignora % da DEF (fixo, ver ARROW_TYPES)
      let defUsed = ef.defPen ? Math.floor(e.def * (1 - ef.defPen)) : e.def;
      // Flecha Perfurante (talento): ataques normais ignoram 1 DEF por nível do jogador
      if (p._talent_pierce) defUsed = Math.max(0, defUsed - (p.level || 1));

      // ── Runa Marca das Sombras (Assassino — runas A/S/S+/SS) ──
      const _sombraTier = (cls.id === 'assassino' && p._enchantShadowMarkEnabled) ? p._enchantShadowMarkTier : null;
      const _sombraSempreIgnora = (_sombraTier === 'SS'); // SS: DEF sempre ignorada, sem precisar marcar
      let _sombraConsumida = false;
      if (_sombraTier) {
        if (_sombraSempreIgnora) {
          defUsed = 0;
        } else if (bs._sombraMarcada) {
          defUsed = 0;
          _sombraConsumida = true;
        }
      }

      let base;
      const seloMult = (typeof getSeloForcaMult === 'function') ? getSeloForcaMult() : 1;
      // Paladino: a DEF substitui o ATQ no ataque básico (p.atk + extra = DEF)
      const _palAtqExtra = (cls.id === 'paladino' && typeof palDefParaAtq === 'function') ? palDefParaAtq(p) : 0;
      if (tiroCerteiro) {
        // Tiro Certeiro: ignora DEF completamente
        base = Math.max(1, Math.floor((p.atk + atkMod + _palAtqExtra) * seloMult) + Math.floor(Math.random() * 6));
        appendBattleLog('🤍 TIRO CERTEIRO! A Flecha Branca não falha!', '#e0e8ff');
      } else {
        base = Math.max(1, Math.floor((p.atk + atkMod + _palAtqExtra) * seloMult) - Math.floor(defUsed / 2) + Math.floor(Math.random() * 6) - 2);
      }

      // Combo bonus
      const comboBonusMult = 1 + (bs.comboTier * BATTLE_CONFIG.COMBO_BONUS_DMG);
      base = Math.floor(base * comboBonusMult);

      // ── SELO DO LIMIAR — consome o bônus de +30% se um limiar (50%/25%
      // de HP do inimigo) acabou de ser cruzado (marcado no golpe anterior;
      // ver checagem de limiar logo depois de aplicar o dano, mais abaixo).
      let _seloLimiarConsumido = false;
      if (bs._seloLimiarProximoBonus && G.player.selosEquipados && G.player.selosEquipados.some(s => s.id === 'selo_limiar')) {
        base = Math.floor(base * 1.30);
        _seloLimiarConsumido = true;
        bs._seloLimiarProximoBonus = false;
        appendBattleLog('🌗 SELO DO LIMIAR! O golpe do momento decisivo causa +30% de dano!', '#c060ff');
      }

      // Enrage do inimigo
      if (bs.enemyEnraged) base = Math.max(1, Math.floor(base * 0.85));

      // Crítico (Flecha Élfica -Crit, Flecha Negra +Crit, Tiro Certeiro nunca critica)
      const stackBonusCrit = (arrowId === 'negra' && ef.stackPerTurn)
        ? Math.min(ef.stackMax || 0.30, (bs._arrowNegraStack || 0) * ef.stackPerTurn)
        : 0;
      const critMod = (ef.critMod || 0) + stackBonusCrit;
      const markCritBonus = bs.enemyMarked ? 0.20 : 0; // Marca do Caçador (Arqueiro)
      const critChance = getPlayerCritChance(p, critMod + markCritBonus, e.critResist || 0);
      let isCrit = !tiroCerteiro && (Math.random() < critChance || bs._frenzy_active);
      // Runa S+: golpe marcado pelas sombras encontra o ponto vital — crítico garantido
      if (_sombraConsumida && _sombraTier === 'S+') isCrit = true;
      if (isCrit) base = Math.floor(base * (p._talent_max_draw ? 2.2 : getCritMultiplier(p)));

      // ── Marca das Sombras: aplica/consome o estado e avisa o jogador ──
      if (_sombraTier && !_sombraSempreIgnora) {
        if (_sombraConsumida) {
          bs._sombraMarcada = false;
          const _sombraMsg = (_sombraTier === 'S+')
            ? '🌑 MARCA DAS SOMBRAS! O golpe encontra o ponto vital — CRÍTICO GARANTIDO!'
            : '🌑 MARCA DAS SOMBRAS! O golpe ignora toda a DEFESA do alvo!';
          appendBattleLog(_sombraMsg, '#7ab8ff');
          showFloatingNumber('enemy', '🌑', 'status');
        } else if (!isCrit) {
          bs._sombraMarcada = true;
          appendBattleLog('🌑 As sombras marcam o alvo — o próximo golpe será fatal.', 'rgba(122,184,255,0.85)');
        }
      } else if (_sombraSempreIgnora && !bs._sombraSSLogged) {
        bs._sombraSSLogged = true;
        appendBattleLog('🌑 A Runa SS consome a defesa do alvo a cada golpe — não existe defesa contra isso.', '#cc44ff');
      }

      // ── SELO INDÊ — a cada 5 críticos de ataque básico na mesma batalha,
      // o 6º causa +7% de dano. Contagem zera a cada nova batalha (ver
      // startBattle) e não é cumulativa entre lutas.
      if (isCrit && G.player.selosEquipados && G.player.selosEquipados.some(s => s.id === 'selo_inde')) {
        bs._seloIndeCritStreak = (bs._seloIndeCritStreak || 0) + 1;
        if (bs._seloIndeCritStreak >= 6) {
          bs._seloIndeCritStreak = 0;
          const bonusPct = ITEM_DB.selo_inde.bonusSextoCritPct || 0.07;
          base = Math.floor(base * (1 + bonusPct));
          appendBattleLog(`💥 SELO INDÊ! O 6º crítico da sequência causa +${Math.round(bonusPct*100)}% de dano!`, '#ff40a0');
        }
      }

      recordPlayerAction(bs, { type: 'attack', key: 'attack', name: 'Ataque', isCrit });

      // ── SELO INN — 15% de chance a cada ataque básico de reduzir a DEF
      // do oponente em 25% por 2 turnos. Não acumula (um debuff ativo por
      // vez); tick/reversão em tickEnemyStatusEffects().
      if (G.player.selosEquipados && G.player.selosEquipados.some(s => s.id === 'selo_inn') && !bs._seloInnDebuffAtivo) {
        const seloInn = ITEM_DB.selo_inn;
        if (Math.random() < (seloInn.chanceDebuffDef || 0.15)) {
          const reducao = Math.max(1, Math.floor((e.def || 0) * (seloInn.debuffDefPct || 0.25)));
          e.def = Math.max(0, (e.def || 0) - reducao);
          bs._seloInnDebuffAtivo = true;
          bs._seloInnDebuffTurnos = seloInn.debuffDefTurnos || 2;
          bs._seloInnReducaoValor = reducao;
          appendBattleLog(`🗡️ SELO INN! Corte certeiro reduz a DEF de ${e.name} em ${reducao} por ${bs._seloInnDebuffTurnos} turnos!`, '#ff8040');
        }
      }
      // ── Fervor Selvagem: ataque normal também enche a barra ──
      if (cls.id === 'arqueiro' && typeof gainFervor === 'function') gainFervor(p, isCrit ? 15 : 6);

      if (bs._frenzy_active) base = Math.floor(base * 2);
      if (p._talent_wall && p.def > 15) base += Math.floor((p.def - 15) * 0.5);
      if (p._talent_avatar && p.hp > p.maxHp * 0.5) {
        base = Math.floor(base * 1.25);
        p.hp = Math.min(p.maxHp, p.hp + 5);
      }
      if (bs._cursed && bs._cursedTurns > 0) base = Math.floor(base * 1.15);
      if (bs._enemy_cursed && bs._enemy_cursed_turns > 0) base = Math.floor(base * 1.30);
      if (bs.enemyMarked) base = Math.floor(base * 1.15); // Marca do Caçador (Arqueiro): +15% dano no alvo marcado

      // ── Prato do Kappa: +40% no próximo ataque após Dano Verdadeiro ──
      if (bs._prataKappaProxAtk) {
        bs._prataKappaProxAtk = false;
        base = Math.floor(base * 1.40);
        appendBattleLog(`🥣 PRATO DO KAPPA! Bônus +40% de dano ativado!`, '#00ddff');
        showFloatingNumber('enemy', '+40%', 'status');
      }

      // ── Fé Absoluta: +50% no próximo golpe quando abaixo de 15% HP ──
      if (p._pal_lv5_chosen === 'fe_absoluta' && bs._feAbsolutaGatilho50) {
        base = Math.floor(base * 1.50);
        bs._feAbsolutaGatilho50 = false;
        appendBattleLog(`🙏 FÉ ABSOLUTA! Golpe catalisado: +50% dano!`, '#f0c060');
        showFloatingNumber('enemy', '🙏+50%', 'status');
      }

      const _seloLimiarHpAntes = bs.enemyHp;
      bs.enemyHp -= base;
      bs.totalDmgDealt = (bs.totalDmgDealt || 0) + base;
      if (typeof applyTalentOnAttack === 'function') {
        const modifiedDmg = applyTalentOnAttack(base, isCrit, bs);
        const talentExtra = modifiedDmg - base;
        if (talentExtra > 0) { bs.enemyHp -= talentExtra; base += talentExtra; }
      }

      // ── SELO DO LIMIAR — checa se esse golpe fez o HP do inimigo cruzar
      // 50% ou 25% do HP máximo PELA PRIMEIRA VEZ na batalha. Se cruzou,
      // arma o bônus de +30% pro PRÓXIMO golpe (consumido lá em cima).
      // Dispara no máximo 1x em cada limiar por luta — não empilha.
      if (G.player.selosEquipados && G.player.selosEquipados.some(s => s.id === 'selo_limiar') && bs.enemyMaxHp > 0) {
        const _pctAntes = _seloLimiarHpAntes / bs.enemyMaxHp;
        const _pctDepois = Math.max(0, bs.enemyHp) / bs.enemyMaxHp;
        if (!bs._seloLimiarUsado50 && _pctAntes > 0.5 && _pctDepois <= 0.5) {
          bs._seloLimiarUsado50 = true;
          bs._seloLimiarProximoBonus = true;
          appendBattleLog(`🌗 O SELO DO LIMIAR desperta! ${e.name} cruzou 50% de HP — o próximo golpe será decisivo!`, '#c060ff');
        } else if (!bs._seloLimiarUsado25 && _pctAntes > 0.25 && _pctDepois <= 0.25) {
          bs._seloLimiarUsado25 = true;
          bs._seloLimiarProximoBonus = true;
          appendBattleLog(`🌗 O SELO DO LIMIAR desperta! ${e.name} cruzou 25% de HP — o próximo golpe será decisivo!`, '#c060ff');
        }
      }

      // Reflexo do Escudo de Cristal
      if (bs._cristalShield) {
        const reflect = Math.max(1, Math.floor(base * 0.3));
        p.hp = Math.max(1, p.hp - reflect);
        appendBattleLog(`💎 Reflexo de Cristal! O escudo devolve ${reflect} HP de dano!`, '#80c0ff');
        showFloatingNumber('hero', reflect, 'dmg');
        flashDamage('hero');
      }
      _aplicarReflexoOrdem(bs, p, base);
      bs.comboCount++;
      bs.comboTier = Math.min(3, Math.floor(bs.comboCount / BATTLE_CONFIG.COMBO_WINDOW));

      const logColor = isCrit ? '#ffcc00' : tiroCerteiro ? '#e0e8ff' : 'rgba(200,150,10,0.9)';
      const logMsg = isCrit
        ? `⚔ CRÍTICO! Você acerta ${e.name} por ${base} HP!`
        : `⚔ Você ataca ${e.name}. -${base} HP${comboBonusMult > 1 ? ` (Combo ×${bs.comboCount}!)` : ''}`;
      appendBattleLog(logMsg, logColor);
      addLog(`Ataque: -${base} ao ${e.name}${isCrit?' [CRÍTICO]':''}.`, 'dmg');
      showFloatingNumber('enemy', base, isCrit ? 'crit' : 'dmg');
      flashDamage('enemy');
      updateComboDisplay();
      animEnemyHit();
      if (typeof arcoPosAtaque === 'function') arcoPosAtaque(bs, p, e, base, isCrit); // Arco Rústico: flecha dupla (arqueiro_arco_efeitos.js)
      if (isCrit && typeof hubiReagirBatalha === 'function') hubiReagirBatalha(bs, 'critico');

      // ── GADANHA: chance de Ceifada (4%) após qualquer ataque acertar ──
      if (bs.enemyHp > 0) tryGadanhaCeifada(bs, p, e);

      // ── FLORESTA MALIGNA — Guardiã Yokai: 12% de chance por ataque básico
      // de quebrar a guarda dela, derrubando a DEF pra 50 pro resto da luta ──
      // ── FLORESTA MALIGNA — Guardiã Yokai (ou Rubrios Yk copiando ela): 12%
      // de chance por ataque básico de quebrar a guarda, DEF cai pra 50 ──
      const _ehGuardiaOuCopia = e.id === 'flm_boss_guardia_yokai' || bs._rubriosMimicId === 'flm_boss_guardia_yokai';
      if (bs.enemyHp > 0 && _ehGuardiaOuCopia && !e._guardaQuebrada && Math.random() < 0.12) {
        e._guardaQuebrada = true;
        e.def = 50;
        appendBattleLog(`🛡️💥 Guarda quebrada! A DEF de ${e.name} despenca para 50!`, '#ffaa30');
        showFloatingNumber('enemy', '🛡️💥 GUARDA QUEBRADA', 'status');
        buildStatusBadges();
      }

      // ── Flecha D'Água: 2º ataque a cada 5 turnos ──
      if (arrowId === 'dagua' && bs._arrowTurnCounter > 0 && bs._arrowTurnCounter % 5 === 0) {
        const segundoHit = Math.max(1, Math.floor(base * 0.10));
        bs.enemyHp -= segundoHit;
        appendBattleLog(`💧 Flecha D'Água: 2º disparo! -${segundoHit} HP!`, '#60a0e0');
        showFloatingNumber('enemy', segundoHit, 'dmg');
      }

      // Ganho de AP em combate (warriors)
      if (isWarrior) {
        const apGain = isCrit ? 18 : 10;
        p.ap = Math.min(p.maxAp, (p.ap || 0) + apGain);
      }
    }

  // ─────────────── TROCAR FLECHA ───────────────
  } else if (action === 'trocar_flecha') {
    bs.phase = 'player';
    setBattleButtons(true);
    openBattleArrowMenu();
    return;

  // ─────────────── ITEM ───────────────
  } else if (action === 'item') {
    const consumiveis = p.inventory.filter(i =>
      (i.id.includes('pocao') || i.id.includes('erva')) && (i.qty || 0) > 0
    );
    if (consumiveis.length > 0) {
      // Abre sub-menu de itens na batalha
      openBattleItemMenu();
      bs.phase = 'player'; // ainda é turno do jogador
      setBattleButtons(true);
      return;
    } else {
      appendBattleLog('🎒 Nenhum item de cura disponível!', '#e08060');
      bs.phase = 'player';
      setBattleButtons(true);
      return;
    }

  // ─────────────── FUGIR ───────────────
  } else if (action === 'flee') {
    // Boss não dá pra fugir
    if (e.isBoss) {
      appendBattleLog('❌ Impossível fugir de um chefe!', '#ff4040');
      bs.phase = 'player';
      setBattleButtons(true);
      return;
    }
    const chance = p._talent_safe_distance ? 1.0 : (0.45 + (p.spd / 80));
    recordPlayerAction(bs, { type: 'flee', key: 'flee', name: 'Fuga' });
    if (Math.random() < (p._talent_safe_distance ? 1.0 : Math.min(0.9, chance))) {
      appendBattleLog('💨 Você fugiu com sucesso!', 'rgba(200,150,10,0.7)');
      setTimeout(() => endBattle(false, true), battleDelay(400));
      return;
    } else {
      appendBattleLog('💨 Fuga falhou! O inimigo bloqueia o caminho.', 'rgba(200,80,20,0.7)');
      playerActed = true;
    }

  // ─────────────── SKILL ───────────────
  } else if (action === 'skill') {
    // Talent skill?
    if (typeof skillIdx === 'string' && skillIdx.startsWith('talent_')) {
      const talentSkills = (typeof getTalentSkills === 'function') ? getTalentSkills() : [];
      const tIdx = parseInt(skillIdx.split('_')[1]);
      const tSk  = talentSkills[tIdx];
      if (!tSk) { bs.phase='player'; setBattleButtons(true); return; }
      const usesAp = tSk.ap !== undefined;
      let cost   = usesAp ? tSk.ap : (tSk.mp || 0);
      // BUGFIX: skills de talento calculavam o custo direto, sem passar por
      // getSkillCost() — então nem a redução genérica de talento
      // (_talSkillCostReduce) nem o set "Floresta de Tierra"
      // (_setProficienciaReduce) valiam pra essas skills. Aplica as duas aqui
      // também, mesma lógica de getSkillCost().
      if (p._talSkillCostReduce && p._talSkillCostReduce > 0) {
        cost = Math.max(0, Math.floor(cost * (1 - p._talSkillCostReduce)));
      }
      if (p._setProficienciaReduce && p._setProficienciaReduce > 0) {
        cost = Math.max(0, Math.floor(cost * (1 - p._setProficienciaReduce)));
      }
      const res    = usesAp ? (p.ap||0) : (p.mp||0);
      if (res < cost) {
        appendBattleLog(`⚡ Sem ${usesAp?'AP':'MP'} suficiente! (${res}/${cost})`, '#e08060');
        bs.phase = 'player'; setBattleButtons(true); return;
      }
      if (usesAp) p.ap = Math.max(0, (p.ap||0) - cost);
      else {
        const echoed = !usesAp && cost > 0 && p._enchantManaEcho && Math.random() < p._enchantManaEcho;
        if (!echoed) p.mp = Math.max(0, p.mp - cost);
        else appendBattleLog('🌀 Eco Arcano! O feitiço não consumiu MP.', '#cc88ff');
      }
      recordPlayerAction(bs, {
        type: 'skill', key: tSk.key || tSk.dmg, name: tSk.name,
        tags: inferActionTags(tSk.name, tSk.desc),
      });
      if (typeof executeTalentSkill === 'function') {
        const tResult = executeTalentSkill(tSk, p, e, bs);
        // Skills assíncronas (ex.: Investida Elemental da Lua Cheia) abrem
        // um overlay e só finalizam o turno quando o jogador escolher.
        if (tResult && tResult.async) { updateHUD(); return; }
      }
      playerActed = true;
      updateHUD();
    } else {
      if (!cls.skills || skillIdx === undefined) { bs.phase='player'; setBattleButtons(true); return; }
      const sk = cls.skills[skillIdx];
      if (!sk) { bs.phase='player'; setBattleButtons(true); return; }
      // BUG-07 FIX: usa getSkillCost() para respeitar redução de talentos
      const cost = (typeof getSkillCost === 'function')
        ? getSkillCost(sk, p)
        : (isWarrior ? (sk.ap || 0) : (sk.mp || 0));
      const res  = isWarrior ? (p.ap || 0) : (p.mp || 0);
      // ── Cooldown de skills marcadas com cooldownTurns (ex.: Tiro Certeiro do Arqueiro) ──
      if (sk.cooldownTurns) {
        bs._cooldowns = bs._cooldowns || {};
        const remaining = bs._cooldowns[sk.key] || 0;
        if (remaining > 0) {
          appendBattleLog(`⏳ ${sk.name} em recarga! (${remaining} turno${remaining>1?'s':''} restante${remaining>1?'s':''})`, '#e08060');
          bs.phase = 'player'; setBattleButtons(true); return;
        }
      }
      if (res < cost) {
        appendBattleLog(`⚡ Sem ${isWarrior?'AP':'MP'} suficiente! (${res}/${cost})`, '#e08060');
        bs.phase = 'player'; setBattleButtons(true); return;
      }
      if (isWarrior) p.ap = Math.max(0, (p.ap || 0) - cost);
      else {
        // Ascensão II+ do Cajado de Novato: +5% de chance de Eco Arcano própria da arma
        const _wpnAsc = p.equippedWeapon || (p.inventory||[]).find(it => it.equipSlot === 'weapon' && it.equipped);
        const _ascEchoChance = (_wpnAsc && _wpnAsc.id === 'cajado_basic' && (_wpnAsc.ascensionLevel||0) >= 2) ? 0.05 : 0;
        const echoed = cost > 0 && (
          (p._enchantManaEcho && Math.random() < p._enchantManaEcho) ||
          (_ascEchoChance && Math.random() < _ascEchoChance)
        );
        if (!echoed) p.mp = Math.max(0, p.mp - cost);
        else appendBattleLog('🌀 Eco Arcano! O feitiço não consumiu MP.', '#cc88ff');
      }
      recordPlayerAction(bs, {
        type: 'skill', key: sk.id || sk.dmg, name: sk.name,
        tags: inferActionTags(sk.name, sk.desc),
      });
      // ── Ativa o cooldown no momento do cast (mesmo pra skills assíncronas) ──
      if (sk.cooldownTurns) {
        bs._cooldowns = bs._cooldowns || {};
        bs._cooldowns[sk.key] = sk.cooldownTurns;
      }

      // ── SFX do Mago: toca ANTES do dano para sincronizar com a animação ──
      if (sk.dmg && sk.dmg.startsWith('mago:')) {
        if (sk.elemento === 'agua')        playSfxMagoAgua();
        else if (sk.elemento === 'fogo')    playSfxMagoFogo();
        else if (sk.elemento === 'eletrico') playSfxMagoEletric();
        // Anel elemental: só troca se o elemento tiver ícone mapeado (MAGO_ELEM_ICONS).
        // Ataque normal e skills sem elemento mapeado mantêm o anel atual como está.
        if (sk.elemento && MAGO_ELEM_ICONS[sk.elemento]) {
          bs._magoElementoAtivo = sk.elemento;
        }
      }

      // ── Reações Elementais (Mago) ──
      const _helpers = { appendBattleLog, showFloatingNumber, flashDamage, animEnemyHit, BATTLE_CONFIG, showShieldEffect };
      const _reacaoDisparada = tryReacaoElemental(sk, p, e, bs, _helpers);
      const result = _reacaoDisparada
        ? { skipEnemyTurn: false, enemyStunned: false, apGain: 0 }
        : executeSkill(sk, p, e, bs);

      // Skill assíncrona (ex: Selo Invertido do Mago) — suspende o turno
      if (result && result.async) {
        updateHUD();
        return;
      }

      playerActed = true;

      // Se reação matou o inimigo, encerra imediatamente
      if (_reacaoDisparada && bs.enemyHp <= 0) {
        updateHUD();
        updateBattleHUD();
        bs.phase = 'resolving';
        setTimeout(() => endBattle(true, false), battleDelay(400));
        return;
      }
      // Anima o herói ao usar skill (suporte não ataca; escudo usa animação de defesa)
      // Compatível com IDs novos (classes.js) e legados
      const _isSupport = sk.isSupport === true
        || sk.dmg === 'paladino:shield' || sk.dmg === 'paladino:aura'
        || sk.dmg === 'shield' || sk.dmg === 'aura';
      const _isShield = sk.dmg === 'paladino:shield' || sk.dmg === 'shield';
      // Se a reação elemental (fusão automática) já disparou, o cut-in
      // (conjuragua → conjurama) cuida sozinho da animação do herói —
      // não rodar a sequência normal de ataque por cima/embaixo dele.
      if (!_isSupport && !_reacaoDisparada) animHeroAttack();
      else if (_isShield) {
        // Paladino: showShieldEffect() (chamada dentro da skill) já trocou
        // o frame pra paladinoEscuderooo.png com revert automático — não
        // sobrescrever aqui, senão o frame de escudo nunca chega a aparecer.
        if (!cls || cls.id !== 'paladino') animHeroDefend();
      }
      if (result.skipEnemyTurn) skipEnemyTurn = true;
      if (result.enemyStunned) { bs.enemyStunned = true; bs.enemyStunTurns = 1; skipEnemyTurn = true; }

      // AP ganho ao usar skill de dano (warriors) — recompensa por usar recursos
      if (isWarrior && result.apGain && result.apGain > 0) {
        p.ap = Math.min(p.maxAp, (p.ap || 0) + result.apGain);
        appendBattleLog(`⚡ +${result.apGain} AP (skill)!`, '#e09030');
      }

      updateHUD();
    }
  }

  // ─── Tick de efeitos de status no inimigo (após ação do jogador) ───
  if (playerActed) {
    tickEnemyStatusEffects(bs, e);
    // Reação "guarda": some depois de absorver UM ataque do jogador
    if (bs._enemyGuardTurns > 0 && e) {
      e.def = Math.max(0, (e.def || 0) - (e._guardDefBoost || 0));
      e._guardDefBoost = 0;
      bs._enemyGuardTurns = 0;
      appendBattleLog(`🛡️ A guarda de ${e.name} se desfaz.`, 'rgba(150,170,220,0.7)');
      buildStatusBadges();
    }
  }

  updateBattleHUD();
  buildSkillList();

  // ─── Verificar morte do inimigo ───
  if (battleState.enemyHp <= 0) {
    bs.phase = 'resolving';
    // Arqueiro: aguarda o som da flecha terminar antes de encerrar
    const isArcherKill = G.player.classData && G.player.classData.id === 'arqueiro';
    // Se alguma skill (ex.: Dança da Morte) marcou um FX em andamento,
    // espera ele terminar em vez de fechar a batalha em 400ms fixo.
    const fxHold = bs._pendingFxHoldMs || 0;
    bs._pendingFxHoldMs = 0;
    const killDelay = Math.max(isArcherKill ? 750 : 400, fxHold);
    setTimeout(() => endBattle(true, false), battleDelay(killDelay));
    return;
  }

  // ─── Turno do Inimigo ───
  if (!playerActed) {
    bs.phase = 'player';
    setBattleButtons(true);
    buildSkillList();
    updateBattleTurnIndicator('player');
    return;
  }

  bs.turnCount++;
  setTimeout(() => runEnemyTurn(bs, p, e, skipEnemyTurn), battleDelay(850));
}

// ── Sub-menu de itens em batalha ──
// Fecha o popup de itens (se estiver aberto). Retorna true se havia um aberto.
function fecharBattleItemMenu() {
  const el = document.getElementById('battle-item-popup');
  if (!el) return false;
  el.remove();
  return true;
}
window.fecharBattleItemMenu = fecharBattleItemMenu;

function openBattleItemMenu() {
  const p = G.player;
  const consumiveis = p.inventory.filter(i =>
    (i.id.includes('pocao') || i.id.includes('erva') || i.restoreMP || i.restoreAP || i.id === 'aaur_elixir' || i.id === 'cristal_mana') && (i.qty || 0) > 0
  );
  const area = document.getElementById('choices-area');
  const origChoices = area.innerHTML;

  // BUG-06 FIX: remove popup anterior se existir (evita duplicação)
  const existing = document.getElementById('battle-item-popup');
  if (existing) existing.remove();

  // Mostra lista de itens como botões temporários
  {
    const popup = document.createElement('div');
    popup.id = 'battle-item-popup';
    popup.style.cssText = `
      position:absolute; bottom:130px; left:50%; transform:translateX(-50%);
      background:rgba(10,6,1,0.98); border:1px solid rgba(200,150,10,0.4);
      border-top:2px solid var(--rust2); padding:10px; min-width:220px;
      z-index:600; font-family:'Noto Serif JP',serif;
    `;
    const title = document.createElement('div');
    title.textContent = '🎒 Escolher Item:';
    title.style.cssText = 'color:var(--gold2);font-size:0.75rem;margin-bottom:7px;letter-spacing:2px;';
    popup.appendChild(title);

    consumiveis.forEach((item, _) => {
      const idx = p.inventory.indexOf(item);

      const isMP = !!(item.restoreMP || item.id.includes('_mp') || item.id === 'aaur_elixir');
      const isAP = !!(item.restoreAP);
      let heal = 0, mpRestore = 0, apRestore = 0;
      if (isAP) {
        apRestore = item.restoreAP;
      } else if (isMP) {
        mpRestore = item.restoreMP || 25;
      } else {
        heal = item.heal
          || (item.id === 'erva_rara' ? 30
            : item.id.includes('media') ? 55
            : item.id.includes('erva') ? 15 : 25);
        // Graça Divina: poções curam 50% a mais
        if (p._talent_grace) heal = Math.floor(heal * 1.5);
        // Pedra da Sacerdotisa Negra: cura 7% a mais (permanente)
        if (p._pedraSiuBonusCura) heal = Math.floor(heal * (1 + p._pedraSiuBonusCura));
      }
      const btn = document.createElement('button');
      btn.style.cssText = `
        display:block; width:100%; text-align:left; background:rgba(255,255,255,0.03);
        border:1px solid rgba(200,150,10,0.2); color:var(--gold2); font-size:0.7rem;
        padding:6px 10px; cursor:pointer; margin-bottom:4px; font-family:inherit;
        letter-spacing:1px;
      `;
      const labelVal = isAP
        ? `<span style="color:#e0c030">(+${apRestore} AP)</span>`
        : isMP
        ? `<span style="color:#5090ff">(+${mpRestore} MP)</span>`
        : `<span style="color:#60d060">(+${heal} HP)</span>`;
      btn.innerHTML = `${item.icon || '🧪'} ${item.name} ×${item.qty} ${labelVal}`;
      btn.onclick = () => {
        useItemInBattle(idx, heal, item, isMP, mpRestore, apRestore);
        popup.remove();
      };
      popup.appendChild(btn);
    });

    const cancel = document.createElement('button');
    cancel.textContent = '✕ Cancelar';
    cancel.style.cssText = `
      display:block; width:100%; background:transparent; border:1px solid rgba(200,80,20,0.3);
      color:rgba(200,80,20,0.7); font-size:0.65rem; padding:5px; cursor:pointer;
      font-family:inherit; margin-top:4px;
    `;
    cancel.onclick = () => popup.remove();
    popup.appendChild(cancel);

    document.querySelector('.battle-arena').appendChild(popup);
  }
}

function useItemInBattle(idx, heal, item, isMP = false, mpRestore = 0, apRestore = 0) {
  const p = G.player;
  recordPlayerAction(battleState, {
    type: 'item', key: item.id || item.name, name: item.name,
    tags: apRestore ? ['energia'] : isMP ? ['mana'] : ['cura'],
  });
  if (apRestore) {
    p.ap = Math.min(p.maxAp || 100, (p.ap || 0) + apRestore);
    item.qty = (item.qty || 1) - 1;
    if (item.qty <= 0) p.inventory.splice(idx, 1);
    appendBattleLog(`⚡ Usou ${item.name}: +${apRestore} AP!`, '#e0c030');
    showFloatingNumber('hero', apRestore, 'heal');
  } else if (isMP) {
    p.mp = Math.min(p.maxMp, (p.mp || 0) + mpRestore);
    item.qty = (item.qty || 1) - 1;
    if (item.qty <= 0) p.inventory.splice(idx, 1);
    appendBattleLog(`🔵 Usou ${item.name}: +${mpRestore} MP!`, '#5090ff');
    showFloatingNumber('hero', mpRestore, 'heal');
  } else {
    aplicarCuraComLink('player', heal);
    item.qty = (item.qty || 1) - 1;
    if (item.qty <= 0) p.inventory.splice(idx, 1);
    appendBattleLog(`🧪 Usou ${item.name}: +${heal} HP!`, '#60d060');
  }
  updateHUD();
  buildInventoryGrid();
  updateBattleHUD();

  // Continua para o turno do inimigo
  battleState.turnCount++;
  const bs = battleState;
  const e  = bs.enemyData;

  // Arqueiro: regenerar flechas a cada turno
  if (p.class === 'arqueiro' && typeof regenArrows === 'function') {
    const before = p.arrows || 0;
    regenArrows(p);
    const gained = (p.arrows || 0) - before;
    const arrowMaxLog = (typeof getArrowsMax === 'function') ? getArrowsMax(p) : p.classData.arrows.max;
    if (gained > 0) appendBattleLog(`🏹 +${gained} flechas regeneradas! (${p.arrows}/${arrowMaxLog})`, '#90d060');
  }

  setTimeout(() => runEnemyTurn(bs, p, e, false), battleDelay(650));
}




// ══════════════════════════════════════════════════════════════
//  SISTEMA DE FUSÃO ELEMENTAL (Mago) — Menu de seleção manual
// ══════════════════════════════════════════════════════════════

// Dados visuais das fusões (reaproveita REACOES_ELEMENTAIS como base)
const FUSAO_DISPLAY = {
  // FOGO
  'fogo+agua':          { levelRequired:1,  nome:'Vapor',              icon:'🌫️', cor:'#c0e0ff', desc:'Dano 2.0× MAG. Remove Lentidão do inimigo.',                        elem1:'fogo',       elem2:'agua'       },
  'fogo+eletrico':      { levelRequired:1,  nome:'Sobrecarga',         icon:'🌩️', cor:'#ffcc00', desc:'Dano 2.8× MAG. 50% chance de Queimadura.',                           elem1:'fogo',       elem2:'eletrico'   },
  'fogo+gelo':          { levelRequired:5,  nome:'Cinzas de Gelo',     icon:'🔵', cor:'#90c0e0', desc:'Dano 3.0× MAG. Remove todos os buffs do inimigo.',                   elem1:'fogo',       elem2:'gelo'       },
  'fogo+planta':        { levelRequired:7,  nome:'Floresta em Chamas', icon:'🔥', cor:'#e06020', desc:'Dano 2.4× MAG. Queimadura por 5 turnos.',                            elem1:'fogo',       elem2:'planta'     },
  // ÁGUA
  'agua+eletrico':      { levelRequired:1,  nome:'Tempestade',         icon:'⛈️', cor:'#80d0ff', desc:'Dano 2.2× MAG. Paralisia + Lentidão.',                               elem1:'agua',       elem2:'eletrico'   },
  'agua+gelo':          { levelRequired:5,  nome:'Explosão Glacial',   icon:'🧊', cor:'#60c8ff', desc:'Dano 2.3× MAG. Congela garantido.',                                  elem1:'agua',       elem2:'gelo'       },
  'agua+terra':         { levelRequired:10, nome:'Lama Tóxica',        icon:'🟤', cor:'#a06030', desc:'Dano 1.9× MAG. Lentidão extrema 4t + DEF reduzida.',                 elem1:'agua',       elem2:'terra'      },
  'agua+planta':        { levelRequired:7,  nome:'Nuvem de Esporos',   icon:'🍄', cor:'#80e080', desc:'Dano 1.8× MAG. Veneno por 4 turnos.',                                elem1:'agua',       elem2:'planta'     },
  // ELÉTRICO
  'eletrico+gelo':      { levelRequired:5,  nome:'Nevasca',            icon:'🌨️', cor:'#b0e0ff', desc:'Dano 2.5× MAG. Paralisia + Congelamento.',                           elem1:'eletrico',   elem2:'gelo'       },
  'eletrico+planta':    { levelRequired:7,  nome:'Raiz Elétrica',      icon:'⚡', cor:'#b0ff80', desc:'Dano 2.1× MAG. Enraizamento + Paralisia.',                           elem1:'eletrico',   elem2:'planta'     },
  'eletrico+terra':     { levelRequired:10, nome:'Terremoto',          icon:'💥', cor:'#d09050', desc:'Dano 2.6× MAG. DEF reduzida por 3 turnos.',                          elem1:'eletrico',   elem2:'terra'      },
  'eletrico+magia_negra': { nome:'Tempestade Negra', icon:'⚫', cor:'#6030a0', desc:'Dano 3.1× MAG. Paralisia + Maldição + drena HP.',                    elem1:'eletrico',   elem2:'magia_negra'},
  // GELO
  'gelo+planta':        { nome:'Geada das Raízes',   icon:'🥶', cor:'#90e8c0', desc:'Dano 2.0× MAG. Congelamento + Enraizamento 2t.',                     elem1:'gelo',       elem2:'planta'     },
  'gelo+vento':         { nome:'Vendaval Glacial',   icon:'🌬️', cor:'#80c8e0', desc:'Dano 2.2× MAG. Lentidão extrema + Congelamento.',                   elem1:'gelo',       elem2:'vento'      },
  'gelo+energia':       { nome:'Onda Fria',          icon:'💠', cor:'#80c0ff', desc:'Dano 2.4× MAG. Congela + ignora DEF.',                               elem1:'gelo',       elem2:'energia'    },
  'gelo+magia_negra':   { nome:'Gelo Negro',         icon:'🖤', cor:'#6040a0', desc:'Dano 2.7× MAG. Congelamento sombrio: drena HP enquanto congelado.',  elem1:'gelo',       elem2:'magia_negra'},
  // PLANTA
  'planta+terra':       { nome:'Pedra Viva',         icon:'🌱', cor:'#90c060', desc:'Dano 2.0× MAG. Reduz ATQ e DEF + Enraizamento.',                     elem1:'planta',     elem2:'terra'      },
  'planta+energia':     { nome:'Pulso de Vida',      icon:'💚', cor:'#40e080', desc:'Dano 1.6× MAG. Cura 20% HP do Mago.',                                elem1:'planta',     elem2:'energia'    },
  'planta+magia_negra': { nome:'Floresta Sombria',   icon:'🌑', cor:'#507030', desc:'Dano 2.3× MAG. Raízes drenam HP por 3 turnos.',                      elem1:'planta',     elem2:'magia_negra'},
  'planta+veneno':      { nome:'Toxina das Raízes',  icon:'🍃', cor:'#50d050', desc:'Dano 1.9× MAG. Veneno 6t + Enraizamento.',                           elem1:'planta',     elem2:'veneno'     },
  // TERRA
  'terra+fogo':         { levelRequired:10, nome:'Pedra em Brasa',     icon:'🌋', cor:'#ff8030', desc:'Dano 2.7× MAG. Queimadura + DEF reduzida.',                          elem1:'terra',      elem2:'fogo'       },
  'terra+vento':        { nome:'Granizo de Pedras',  icon:'💨', cor:'#c0b080', desc:'Dano 2.4× MAG. Dano físico-mágico + Atordoamento.',                  elem1:'terra',      elem2:'vento'      },
  'terra+magia_negra':  { nome:'Abismo',             icon:'🕳️', cor:'#404060', desc:'Dano 2.8× MAG. Maldição + DEF zero por 2t.',                         elem1:'terra',      elem2:'magia_negra'},
  'terra+caos':         { nome:'Terra do Caos',      icon:'🌑', cor:'#806040', desc:'Dano 2.0–4.5× MAG. Múltiplos efeitos aleatórios.',                  elem1:'terra',      elem2:'caos'       },
  // ENERGIA
  'energia+fogo':       { nome:'Nova de Energia',    icon:'🌟', cor:'#e080ff', desc:'Dano 3.2× MAG. Queimadura garantida.',                               elem1:'energia',    elem2:'fogo'       },
  'energia+luz':        { nome:'Luz Divina',         icon:'✝️', cor:'#ffffa0', desc:'Dano 2.6× MAG. Cura 25% HP + Cegueira.',                             elem1:'energia',    elem2:'luz'        },
  'energia+vento':      { nome:'Vórtice Arcano',     icon:'🌀', cor:'#a060e0', desc:'Dano 2.3× MAG. Paralisia + evasão máxima 2t.',                       elem1:'energia',    elem2:'vento'      },
  'energia+caos':       { nome:'Caos Arcano',        icon:'💫', cor:'#d080ff', desc:'Dano 1.5–5.0× MAG. Efeito aleatório devastador.',                   elem1:'energia',    elem2:'caos'       },
  // MAGIA NEGRA
  'magia_negra+vento':  { nome:'Sombra Veloz',       icon:'🌑', cor:'#604080', desc:'Dano 2.5× MAG. Maldição + evasão máxima 3t.',                        elem1:'magia_negra',elem2:'vento'      },
  'magia_negra+veneno': { nome:'Praga Sombria',      icon:'🦠', cor:'#408040', desc:'Dano 2.0× MAG. Maldição + Veneno 6t + drena HP.',                    elem1:'magia_negra',elem2:'veneno'     },
  'magia_negra+caos':   { nome:'Caos Sombrio',       icon:'⚫', cor:'#8020c0', desc:'Dano 2.0–5.0× MAG. Maldição garantida + efeito sombrio.',           elem1:'magia_negra',elem2:'caos'       },
  'magia_negra+luz':    { nome:'Eclipse',            icon:'🌘', cor:'#504070', desc:'Dano 3.5× MAG. Cura Mago + Cegueira + Maldição.',                    elem1:'magia_negra',elem2:'luz'        },
  // VENTO
  'vento+veneno':       { nome:'Tufão Venenoso',     icon:'🌀', cor:'#80c060', desc:'Dano 2.1× MAG. Veneno 4t + reduz acerto inimigo.',                   elem1:'vento',      elem2:'veneno'     },
  'vento+luz':          { nome:'Rajada de Luz',      icon:'🌟', cor:'#e0f060', desc:'Dano 2.3× MAG. Cegueira garantida + cura Mago.',                     elem1:'vento',      elem2:'luz'        },
  'vento+caos':         { nome:'Vento do Caos',      icon:'🌪️', cor:'#c080d0', desc:'Dano 1.5–3.5× MAG. Efeito aleatório + evasão máxima.',             elem1:'vento',      elem2:'caos'       },
  'vento+gelo':         { nome:'Ciclone de Gelo',    icon:'❄️', cor:'#80d8ff', desc:'Dano 2.4× MAG. Congelamento + Lentidão extrema.',                    elem1:'vento',      elem2:'gelo'       },
  // CAOS
  'caos+veneno':        { nome:'Veneno do Caos',     icon:'🌀', cor:'#a0c040', desc:'Dano 2.0–3.5× MAG. Veneno 3–7t imprevisível.',                      elem1:'caos',       elem2:'veneno'     },
  'caos+luz':           { nome:'Luz do Caos',        icon:'💫', cor:'#f0e080', desc:'Dano 2.5–4.0× MAG. Cura ou cega aleatoriamente.',                   elem1:'caos',       elem2:'luz'        },
  'caos+planta':        { nome:'Floresta Caótica',   icon:'🌿', cor:'#80d080', desc:'Dano 1.8–3.0× MAG. Enraizamento + veneno aleatório.',               elem1:'caos',       elem2:'planta'     },
  'caos+agua':          { nome:'Maré do Caos',       icon:'🌊', cor:'#60b0e0', desc:'Dano 2.0–3.8× MAG. Lentidão extrema + efeito aleatório.',           elem1:'caos',       elem2:'agua'       },
  // VENENO
  'veneno+fogo':        { nome:'Chama Corrosiva',    icon:'🔥', cor:'#c06020', desc:'Dano 2.5× MAG. Queimadura + Veneno + DEF zero.',                     elem1:'veneno',     elem2:'fogo'       },
  'veneno+eletrico':    { nome:'Choque Tóxico',      icon:'⚡', cor:'#a0d040', desc:'Dano 2.3× MAG. Veneno + Paralisia simultâneos.',                      elem1:'veneno',     elem2:'eletrico'   },
  'veneno+gelo':        { nome:'Veneno Glacial',     icon:'❄️', cor:'#60b080', desc:'Dano 2.2× MAG. Congelamento + Veneno intensificado 5t.',              elem1:'veneno',     elem2:'gelo'       },
  'veneno+energia':     { nome:'Energia Tóxica',     icon:'✨', cor:'#b0e060', desc:'Dano 2.4× MAG. Ignora DEF + Veneno 5t.',                             elem1:'veneno',     elem2:'energia'    },
  // LUZ
  'luz+agua':           { nome:'Onda Sagrada',       icon:'🌊', cor:'#c0e8ff', desc:'Dano 2.1× MAG. Cura 15% HP + Cegueira.',                             elem1:'luz',        elem2:'agua'       },
  'luz+terra':          { nome:'Pilar de Luz',       icon:'🏔️', cor:'#e0d060', desc:'Dano 2.5× MAG. Cegueira garantida + DEF reduzida.',                  elem1:'luz',        elem2:'terra'      },
  'luz+planta':         { nome:'Jardim Sagrado',     icon:'🌸', cor:'#d0f080', desc:'Dano 1.8× MAG. Cura 30% HP + Enraizamento.',                         elem1:'luz',        elem2:'planta'     },
  'luz+energia':        { nome:'Explosão Sagrada',   icon:'⭐', cor:'#fff080', desc:'Dano 3.0× MAG. Ignora DEF + cura Mago + Cegueira.',                  elem1:'luz',        elem2:'energia'    },
};

// ── Cut-in visual de Fusão Elemental (Mago) ──
// Toca em QUALQUER fusão (menu manual ou combo automático de 2 elementos):
// frame 1 = conjuragua.png entra, frame 2 = conjurama.png assume, depois some.
const FUSAO_CUTIN_FRAMES = {
  frame1: 'Imagens/personagens/mago/conjuragua.png',
  frame2: 'Imagens/personagens/mago/conjurama.png',
};

function _ensureFusaoCutinEl() {
  let el = document.getElementById('fusao-cutin-img');
  if (el) return el;

  // Preso dentro de #bat-hero-icon-wrap (irmão de #bat-hero-icon), o mesmo
  // padrão usado pelo shield-effect / Escudo Divino / Selo do Julgamento —
  // NUNCA dentro de #bat-hero-icon, porque seu innerHTML é sobrescrito a
  // cada troca de animação (setHeroAnim). Isso garante que o cut-in toca
  // exatamente sobre o ícone do herói, e some sozinho junto com a batalha
  // (ele é descendente de #battle-overlay).
  const wrap = document.getElementById('bat-hero-icon-wrap');
  if (!wrap) return null;

  el = document.createElement('img');
  el.id = 'fusao-cutin-img';
  el.style.cssText = `
    display:none;
    position:absolute; top:0; left:0; right:0; bottom:0; margin:auto;
    width:100px; height:100px; object-fit:contain;
    filter:drop-shadow(0 0 20px rgba(120,180,255,0.6));
    pointer-events:none; z-index:25;
  `;
  wrap.appendChild(el);

  if (!document.getElementById('fusao-cutin-style')) {
    const st = document.createElement('style');
    st.id = 'fusao-cutin-style';
    st.textContent = `
      @keyframes fusaoCutinPlay {
        0%   { opacity:0; transform:scale(0.85); }
        15%  { opacity:1; transform:scale(1.06); }
        25%  { opacity:1; transform:scale(1); }
        80%  { opacity:1; transform:scale(1); }
        100% { opacity:0; transform:scale(1.04); }
      }
      #fusao-cutin-img.playing { animation: fusaoCutinPlay 1.15s ease forwards; }
    `;
    document.head.appendChild(st);
  }
  return el;
}

function showFusaoCutin() {
  const el = _ensureFusaoCutinEl();
  if (!el) return;

  el.style.display = 'block';
  el.classList.remove('playing');
  el.src = FUSAO_CUTIN_FRAMES.frame1;
  void el.offsetWidth;
  el.classList.add('playing');

  // Troca pro segundo frame (conjurama.png) na metade da animação
  setTimeout(() => { el.src = FUSAO_CUTIN_FRAMES.frame2; }, 580);

  // Some no final, revelando o ícone do herói de volta
  setTimeout(() => {
    el.style.display = 'none';
    el.classList.remove('playing');
  }, 1200);
}

// Esconde o cut-in de fusão imediatamente, sem esperar o timeout —
// chamado como rede de segurança sempre que a batalha termina (endBattle),
// pra garantir que ele nunca fique preso visível numa cena fora da batalha.
function hideFusaoCutin() {
  const el = document.getElementById('fusao-cutin-img');
  if (el) { el.style.display = 'none'; el.classList.remove('playing'); }
}

// Mostra/esconde o botão de fusão conforme a classe e skills equipadas
function updateFusaoBtn() {
  const btn = document.getElementById('btn-fusao');
  if (!btn) return;
  const p = G.player;
  if (!p || !p.classData || p.classData.id !== 'mago') { btn.style.display = 'none'; return; }
  const fusoes = _getFusoesDisponiveis();
  btn.style.display = fusoes.length > 0 ? '' : 'none';
}

// Retorna quais fusões o mago pode usar agora (tem os 2 elementos equipados + MP suficiente)
function _getFusoesDisponiveis() {
  const p = G.player;
  if (!p || !p.classData || p.classData.id !== 'mago') return [];
  const cls = p.classData;
  const equipped = p.equippedSkills || [];

  // Mapeia elementos -> custo MP das skills equipadas
  const elemCusto = {};
  cls.skills.forEach((sk, i) => {
    const key = 'b' + i;
    if (sk.elemento && equipped.includes(key) && isElementoDesbloqueado(sk)) {
      elemCusto[sk.elemento] = sk.mp || 0;
    }
  });

  const disponíveis = [];
  Object.entries(FUSAO_DISPLAY).forEach(([chave, f]) => {
    const temElem1 = elemCusto[f.elem1] !== undefined;
    const temElem2 = elemCusto[f.elem2] !== undefined;
    if (!temElem1 || !temElem2) return;
    const custoTotal = (elemCusto[f.elem1] || 0) + (elemCusto[f.elem2] || 0);
    disponíveis.push({ ...f, chave, custoTotal, elem1Custo: elemCusto[f.elem1], elem2Custo: elemCusto[f.elem2] });
  });
  return disponíveis;
}

function openFusaoMenu() {
  if (!G.inBattle || !battleState || battleState.phase !== 'player') return;
  const overlay = document.getElementById('fusao-overlay');
  const list    = document.getElementById('fusao-list');
  if (!overlay || !list) return;

  const fusoes = _getFusoesDisponiveis();
  const mp     = G.player.mp || 0;
  list.innerHTML = '';
  // Grade 2 colunas, cada fusão como uma caixa separada com moldura própria
  list.style.cssText = `
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:10px;
  `;

  if (fusoes.length === 0) {
    list.style.display = 'block';
    list.innerHTML = '<div style="color:rgba(242,232,208,0.3);font-size:0.7rem;text-align:center;padding:16px;">Nenhuma fusão disponível.<br>Equipe 2 elementos diferentes.</div>';
  } else {
    const elemNomes = {
      fogo:'Fogo 🔥', agua:'Água 💧', eletrico:'Elétrico ⚡',
      gelo:'Gelo ❄️', planta:'Planta 🌿', terra:'Terra 🪨',
      energia:'Energia ✨', magia_negra:'Magia Negra 🌑',
      vento:'Vento 🌪️', caos:'Caos 🌀', veneno:'Veneno ☠️', luz:'Luz ☀️'
    };
    fusoes.forEach(f => {
      const lvReq = f.levelRequired || 1;
      const bloqueada = (G.player.level || 1) < lvReq;
      const podeUsar = !bloqueada && mp >= f.custoTotal;
      const card = document.createElement('button');

      if (bloqueada) {
        card.style.cssText = `
          display:flex;flex-direction:column;align-items:center;gap:6px;
          padding:12px 10px;
          background:rgba(0,0,0,0.3);
          border:1px solid rgba(255,255,255,0.08);
          border-radius:10px;
          cursor:not-allowed;opacity:0.4;
          text-align:center;
        `;
        card.innerHTML = `
          <span style="font-size:1.6rem;">🔒</span>
          <div style="font-family:'Noto Serif JP',serif;font-size:0.8rem;color:rgba(200,150,10,0.45);">${f.nome}</div>
          <div style="font-size:0.56rem;color:rgba(242,232,208,0.28);font-family:'Noto Sans JP',sans-serif;">Desbloqueado no LV ${lvReq}</div>
          <div style="font-size:0.55rem;color:rgba(200,150,10,0.32);font-family:'Noto Sans JP',sans-serif;">
            ${elemNomes[f.elem1]} + ${elemNomes[f.elem2]}
          </div>
        `;
      } else {
        card.style.cssText = `
          display:flex;flex-direction:column;align-items:center;gap:6px;
          padding:12px 10px;
          background:rgba(255,255,255,0.03);
          border:1px solid ${podeUsar ? 'rgba(200,150,10,0.3)' : 'rgba(255,255,255,0.1)'};
          border-radius:10px;
          box-shadow:${podeUsar ? `inset 0 0 0 1px ${f.cor}33` : 'none'};
          cursor:${podeUsar ? 'pointer' : 'not-allowed'};
          opacity:${podeUsar ? '1' : '0.45'};
          transition:background 0.15s, transform 0.1s;
          text-align:center;
        `;
        card.innerHTML = `
          <span style="font-size:1.6rem;">${f.icon}</span>
          <div style="font-family:'Noto Serif JP',serif;font-size:0.8rem;color:${f.cor};">${f.nome}</div>
          <div style="font-size:0.56rem;color:rgba(242,232,208,0.45);font-family:'Noto Sans JP',sans-serif;">${f.desc}</div>
          <div style="font-size:0.55rem;color:rgba(200,150,10,0.55);font-family:'Noto Sans JP',sans-serif;">
            ${elemNomes[f.elem1]} + ${elemNomes[f.elem2]}
          </div>
          <div style="font-size:0.58rem;">
            <strong style="color:${podeUsar?'#80c0ff':'#c06060'}">${f.custoTotal} MP</strong>
            ${!podeUsar ? ' <span style="color:#c06060">(MP insuficiente)</span>' : ''}
          </div>
        `;
        if (podeUsar) {
          card.onmouseenter = () => { card.style.background = 'rgba(200,150,10,0.08)'; card.style.transform = 'translateY(-1px)'; };
          card.onmouseleave = () => { card.style.background = 'rgba(255,255,255,0.03)'; card.style.transform = 'translateY(0)'; };
          card.onclick = () => { closeFusaoMenu(); executarFusao(f); };
        }
      }
      list.appendChild(card);
    });
  }

  overlay.style.display = 'flex';
}

function closeFusaoMenu() {
  const overlay = document.getElementById('fusao-overlay');
  if (overlay) overlay.style.display = 'none';
}

// ── Aplica os efeitos (status, cura, controle) de uma fusão/reação elemental ──
// Usada tanto pelo Livro de Fusões (executarFusao) quanto pelo combo automático
// de 2 elementos em sequência (tryReacaoElemental), garantindo que TODAS as
// fusões tenham exatamente o mesmo comportamento nos dois caminhos.
function aplicarEfeitosDeReacao(reacao, dano, bs, e, p, showFloatingNumber, appendBattleLog) {
  const ef = reacao.efeito;

  // Curas do Mago
  if (reacao.curaHp) {
    const cura = Math.floor(p.maxHp * reacao.curaHp);
    p.hp = Math.min(p.maxHp, p.hp + cura);
    showFloatingNumber('hero', cura, 'heal');
  }

  // Status no inimigo
  if (ef === 'vapor')        { bs.enemySlowed = false; bs.enemySlowTurns = 0; showFloatingNumber('enemy', '🌫️ VAPOR', 'status'); }
  if (ef === 'sobrecarga')   { if (Math.random() < 0.55) { bs.enemyBurning = true; bs.enemyBurnTurns = 3; showFloatingNumber('enemy', '🔥 QUEIMANDO', 'status'); } }
  if (ef === 'cinzas_gelo')  { bs._enemyBuffsCleared = true; showFloatingNumber('enemy', '🔵 BUFFS REMOVIDOS', 'status'); }
  if (ef === 'florestafogo') { bs.enemyBurning = true; bs.enemyBurnTurns = 5; showFloatingNumber('enemy', '🔥 QUEIMANDO 5T', 'status'); }

  if (ef === 'tempestade')   { if (!e._immuneControl) { bs.enemyStunned = true; bs.enemyStunTurns = 1; bs.enemySlowed = true; bs.enemySlowTurns = 2; showFloatingNumber('enemy', '⚡ PARALISIA', 'status'); } else { showFloatingNumber('enemy', '🛡 IMUNE', 'status'); appendBattleLog(`⚡ ${e.name} é resistente a efeitos de controle!`, '#8888cc'); } }
  if (ef === 'glacial')      { if (!e._immuneControl) { bs.enemyStunned = true; bs.enemyStunTurns = 2; bs._enemyFrozen = true; showFloatingNumber('enemy', '❄️ CONGELADO', 'status'); } else { showFloatingNumber('enemy', '🛡 IMUNE', 'status'); appendBattleLog(`❄️ ${e.name} é resistente a efeitos de controle!`, '#8888cc'); } }
  if (ef === 'lama')         { bs.enemySlowed = true; bs.enemySlowTurns = 4; bs._enemyDefDown = true; bs._enemyDefDownTurns = 2; bs._enemyDefDownAmt = 4; showFloatingNumber('enemy', '🟤 LAMA', 'status'); }
  if (ef === 'esporos')      { bs.enemyPoisoned = true; bs.enemyPoisonTurns = 4; showFloatingNumber('enemy', '🍄 VENENO', 'status'); }

  if (ef === 'nevasca')      { if (!e._immuneControl) { bs.enemyStunned = true; bs.enemyStunTurns = 1; bs._enemyFrozen = true; showFloatingNumber('enemy', '🌨️ PARALISIA+GELO', 'status'); } else { showFloatingNumber('enemy', '🛡 IMUNE', 'status'); appendBattleLog(`🌨️ ${e.name} é resistente a efeitos de controle!`, '#8888cc'); } }
  if (ef === 'raiz_eletrica'){ if (!e._immuneControl) { bs._enemyRooted = true; bs._enemyRootedTurns = 2; bs.enemyStunned = true; bs.enemyStunTurns = 1; showFloatingNumber('enemy', '⚡ ENRAIZADO+PARALISIA', 'status'); } else { showFloatingNumber('enemy', '🛡 IMUNE', 'status'); appendBattleLog(`⚡ ${e.name} é resistente a efeitos de controle!`, '#8888cc'); } }
  if (ef === 'terremoto')    { bs._enemyDefDown = true; bs._enemyDefDownTurns = 3; bs._enemyDefDownAmt = 4; showFloatingNumber('enemy', '💥 DEF↓', 'status'); }
  if (ef === 'tempestade_negra') { if (!e._immuneControl) { bs.enemyStunned = true; bs.enemyStunTurns = 1; } bs._cursed = true; bs._cursedTurns = 3; const dr = Math.floor(dano * 0.2); p.hp = Math.min(p.maxHp, p.hp + dr); showFloatingNumber('hero', dr, 'heal'); showFloatingNumber('enemy', e._immuneControl ? '⚫ TREVAS (imune controle)' : '⚫ TREVAS+PARALISIA', 'status'); }

  if (ef === 'geada_planta') { if (!e._immuneControl) { bs._enemyFrozen = true; bs.enemyStunned = true; bs.enemyStunTurns = 2; bs._enemyRooted = true; bs._enemyRootedTurns = 2; showFloatingNumber('enemy', '🥶 CONGELADO+ENRAIZADO', 'status'); } else { showFloatingNumber('enemy', '🛡 IMUNE', 'status'); appendBattleLog(`🥶 ${e.name} é resistente a efeitos de controle!`, '#8888cc'); } }
  if (ef === 'vendaval_gelo'){ bs.enemySlowed = true; bs.enemySlowTurns = 4; bs._enemyFrozen = true; bs._playerEvasion = 0.3; bs._playerEvasionTurns = 2; showFloatingNumber('enemy', '🌬️ GELO+LENTIDÃO', 'status'); }
  if (ef === 'onda_fria')    { if (!e._immuneControl) { bs._enemyFrozen = true; bs.enemyStunned = true; bs.enemyStunTurns = 2; showFloatingNumber('enemy', '💠 CONGELADO', 'status'); } else { showFloatingNumber('enemy', '🛡 IMUNE', 'status'); appendBattleLog(`💠 ${e.name} é resistente a efeitos de controle!`, '#8888cc'); } }
  if (ef === 'gelo_negro')   { if (!e._immuneControl) { bs._enemyFrozen = true; bs.enemyStunned = true; bs.enemyStunTurns = 2; } bs._cursed = true; bs._cursedTurns = 3; bs._geloNegroDrain = true; showFloatingNumber('enemy', e._immuneControl ? '🖤 GELO SOMBRIO (imune controle)' : '🖤 GELO SOMBRIO', 'status'); }

  if (ef === 'pedra_viva')   { bs._enemyAtkDown = true; bs._enemyAtkDownTurns = 3; bs._enemyDefDown = true; bs._enemyDefDownTurns = 3; bs._enemyRooted = true; bs._enemyRootedTurns = 2; showFloatingNumber('enemy', '🌱 ATQ+DEF↓', 'status'); }
  if (ef === 'vida_planta')  { /* cura já aplicada acima */ showFloatingNumber('hero', '💚 VIDA', 'status'); }
  if (ef === 'trevas_planta'){ bs._cursed = true; bs._cursedTurns = 3; bs._plantaDrain = true; bs._plantaDrainTurns = 3; showFloatingNumber('enemy', '🌑 RAÍZES SOMBRIAS', 'status'); }
  if (ef === 'veneno_planta'){ bs.enemyPoisoned = true; bs.enemyPoisonTurns = 6; bs._enemyRooted = true; bs._enemyRootedTurns = 3; showFloatingNumber('enemy', '🍃 VENENO+ENRAIZADO', 'status'); }

  if (ef === 'pedra_fogo')   { bs.enemyBurning = true; bs.enemyBurnTurns = 3; bs._enemyDefDown = true; bs._enemyDefDownTurns = 2; bs._enemyDefDownAmt = 5; showFloatingNumber('enemy', '🌋 BRASA', 'status'); }
  if (ef === 'rocha_vento')  { bs.enemyStunned = true; bs.enemyStunTurns = 1; showFloatingNumber('enemy', '💨 ATORDOADO', 'status'); }
  if (ef === 'abismo')       { bs._cursed = true; bs._cursedTurns = 3; bs._enemyDefDown = true; bs._enemyDefDownTurns = 2; bs._enemyDefDownAmt = 99; showFloatingNumber('enemy', '🕳️ ABISMO', 'status'); }
  if (ef === 'terra_caos') {
    const r = Math.random();
    if (r < 0.25)      { bs.enemyBurning = true; bs.enemyBurnTurns = 3; showFloatingNumber('enemy', '🔥', 'status'); }
    else if (r < 0.50) { bs.enemyStunned = true; bs.enemyStunTurns = 2; showFloatingNumber('enemy', '⚡', 'status'); }
    else if (r < 0.70) { bs._cursed = true; bs._cursedTurns = 3; showFloatingNumber('enemy', '💜', 'status'); }
    else               { bs.enemyPoisoned = true; bs.enemyPoisonTurns = 5; showFloatingNumber('enemy', '☠️', 'status'); }
  }

  if (ef === 'nova')         { bs.enemyBurning = true; bs.enemyBurnTurns = 4; showFloatingNumber('enemy', '🌟 QUEIMADURA', 'status'); }
  if (ef === 'luz_divina')   { bs._enemyBlinded = true; bs._enemyBlindedTurns = 3; showFloatingNumber('enemy', '✝️ CEGO', 'status'); }
  if (ef === 'vortice')      { bs.enemyStunned = true; bs.enemyStunTurns = 1; bs._playerEvasion = 0.5; bs._playerEvasionTurns = 2; showFloatingNumber('enemy', '🌀 PARALISIA', 'status'); }
  if (ef === 'caos_arcano') {
    const r = Math.random();
    if (r < 0.2)       { bs.enemyStunned = true; bs.enemyStunTurns = 2; showFloatingNumber('enemy', '⚡ PARALISIA', 'status'); }
    else if (r < 0.4)  { bs._cursed = true; bs._cursedTurns = 4; showFloatingNumber('enemy', '💜 MALDIÇÃO', 'status'); }
    else if (r < 0.6)  { const c = Math.floor(p.maxHp * 0.3); p.hp = Math.min(p.maxHp, p.hp + c); showFloatingNumber('hero', c, 'heal'); }
    else               { const x = Math.floor(p.mag * 2); bs.enemyHp -= x; showFloatingNumber('enemy', x, 'crit'); }
  }

  if (ef === 'sombra_vento') { bs._cursed = true; bs._cursedTurns = 3; bs._playerEvasion = 0.5; bs._playerEvasionTurns = 3; showFloatingNumber('enemy', '🌑 MALDIÇÃO', 'status'); }
  if (ef === 'praga')        { bs._cursed = true; bs._cursedTurns = 4; bs.enemyPoisoned = true; bs.enemyPoisonTurns = 6; const dr = Math.floor(dano * 0.2); p.hp = Math.min(p.maxHp, p.hp + dr); showFloatingNumber('hero', dr, 'heal'); showFloatingNumber('enemy', '🦠 PRAGA', 'status'); }
  if (ef === 'caos_sombrio') {
    bs._cursed = true; bs._cursedTurns = 4;
    const r = Math.random();
    if (r < 0.3)       { bs.enemyStunned = true; bs.enemyStunTurns = 2; showFloatingNumber('enemy', '⚫ PARALISIA', 'status'); }
    else if (r < 0.6)  { bs.enemyPoisoned = true; bs.enemyPoisonTurns = 5; showFloatingNumber('enemy', '⚫ VENENO', 'status'); }
    else               { const dr2 = Math.floor(dano * 0.3); p.hp = Math.min(p.maxHp, p.hp + dr2); showFloatingNumber('hero', dr2, 'heal'); showFloatingNumber('enemy', '⚫ DRENAGEM', 'status'); }
  }
  if (ef === 'eclipse')      { bs._cursed = true; bs._cursedTurns = 4; bs._enemyBlinded = true; bs._enemyBlindedTurns = 3; showFloatingNumber('enemy', '🌘 ECLIPSE', 'status'); }

  if (ef === 'tufao_veneno') { bs.enemyPoisoned = true; bs.enemyPoisonTurns = 4; bs._enemyMissNext = true; showFloatingNumber('enemy', '🌀 VENENO+ERRO', 'status'); }
  if (ef === 'luz_vento')    { bs._enemyBlinded = true; bs._enemyBlindedTurns = 3; bs._playerEvasion = 0.4; bs._playerEvasionTurns = 2; showFloatingNumber('enemy', '🌟 CEGO', 'status'); }
  if (ef === 'vento_caos') {
    bs._playerEvasion = 0.5; bs._playerEvasionTurns = 1;
    const r = Math.random();
    if (r < 0.25)      { bs.enemyBurning = true; bs.enemyBurnTurns = 2; }
    else if (r < 0.5)  { bs.enemyStunned = true; bs.enemyStunTurns = 1; }
    else if (r < 0.75) { bs.enemyPoisoned = true; bs.enemyPoisonTurns = 3; }
    else               { const c2 = Math.floor(p.maxHp * 0.2); p.hp = Math.min(p.maxHp, p.hp + c2); showFloatingNumber('hero', c2, 'heal'); }
    showFloatingNumber('enemy', '🌪️ CAOS', 'status');
  }
  if (ef === 'ciclone_gelo') { bs._enemyFrozen = true; bs.enemyStunned = true; bs.enemyStunTurns = 2; bs.enemySlowed = true; bs.enemySlowTurns = 3; bs._playerEvasion = 0.3; bs._playerEvasionTurns = 2; showFloatingNumber('enemy', '❄️ CICLONE', 'status'); }

  if (ef === 'caos_veneno')  { const t = 3 + Math.floor(Math.random() * 5); bs.enemyPoisoned = true; bs.enemyPoisonTurns = t; showFloatingNumber('enemy', `🌀 VENENO ${t}T`, 'status'); }
  if (ef === 'caos_luz') {
    const r = Math.random();
    if (r < 0.5) { bs._enemyBlinded = true; bs._enemyBlindedTurns = 3; showFloatingNumber('enemy', '💫 CEGO', 'status'); }
    else         { const c3 = Math.floor(p.maxHp * 0.25); p.hp = Math.min(p.maxHp, p.hp + c3); showFloatingNumber('hero', c3, 'heal'); }
  }
  if (ef === 'caos_planta')  {
    bs._enemyRooted = true; bs._enemyRootedTurns = 2;
    if (Math.random() < 0.5) { bs.enemyPoisoned = true; bs.enemyPoisonTurns = 3; showFloatingNumber('enemy', '🌿 VENENO', 'status'); }
    showFloatingNumber('enemy', '🌿 ENRAIZADO', 'status');
  }
  if (ef === 'caos_agua')    { bs.enemySlowed = true; bs.enemySlowTurns = 4; showFloatingNumber('enemy', '🌊 LENTIDÃO', 'status'); }

  if (ef === 'veneno_fogo')  { bs.enemyBurning = true; bs.enemyBurnTurns = 4; bs.enemyPoisoned = true; bs.enemyPoisonTurns = 4; bs._enemyDefDown = true; bs._enemyDefDownTurns = 3; bs._enemyDefDownAmt = 99; showFloatingNumber('enemy', '🔥 ÁCIDO', 'status'); }
  if (ef === 'veneno_eletrico') { bs.enemyPoisoned = true; bs.enemyPoisonTurns = 4; bs.enemyStunned = true; bs.enemyStunTurns = 1; showFloatingNumber('enemy', '⚡ TÓXICO', 'status'); }
  if (ef === 'veneno_gelo')  { bs._enemyFrozen = true; bs.enemyStunned = true; bs.enemyStunTurns = 2; bs.enemyPoisoned = true; bs.enemyPoisonTurns = 5; showFloatingNumber('enemy', '❄️ VENENO GLACIAL', 'status'); }
  if (ef === 'veneno_energia'){ bs.enemyPoisoned = true; bs.enemyPoisonTurns = 5; showFloatingNumber('enemy', '✨ VENENO ARCANO', 'status'); }

  if (ef === 'luz_agua')     { bs._enemyBlinded = true; bs._enemyBlindedTurns = 2; showFloatingNumber('enemy', '🌊 CEGO', 'status'); }
  if (ef === 'luz_terra')    { bs._enemyBlinded = true; bs._enemyBlindedTurns = 3; bs._enemyDefDown = true; bs._enemyDefDownTurns = 3; bs._enemyDefDownAmt = 4; showFloatingNumber('enemy', '🏔️ PILAR', 'status'); }
  if (ef === 'luz_planta')   { bs._enemyRooted = true; bs._enemyRootedTurns = 3; if (bs.playerPoisoned) { bs.playerPoisoned = false; bs.playerPoisonTurns = 0; appendBattleLog('☀️ Luz purifica o veneno!', '#ffe060'); } showFloatingNumber('enemy', '🌸 ENRAIZADO', 'status'); }
  if (ef === 'luz_energia')  { bs._enemyBlinded = true; bs._enemyBlindedTurns = 3; showFloatingNumber('enemy', '⭐ EXPLOSÃO SAGRADA', 'status'); }

  return ef;
}

function executarFusao(f) {
  const p  = G.player;
  const e  = battleState.enemyData || G.currentEnemy;
  const bs = battleState;
  if (!p || !e || !bs || bs.phase !== 'player') return;

  if (p.mp < f.custoTotal) { notify('MP insuficiente para a fusão!', 'red'); return; }
  p.mp = Math.max(0, p.mp - f.custoTotal);

  const lvScale = 1 + (p.level || 0) * 0.05;
  const reacao  = REACOES_ELEMENTAIS[f.chave];
  if (!reacao) return;

  bs.phase = 'resolving';
  setBattleButtons(false);
  animHeroFusao();

  // ── Cálculo de dano base ──
  let multFinal = reacao.danoMult;
  if (typeof reacao.danoMin === 'number') {
    multFinal = reacao.danoMin + Math.random() * (reacao.danoMax - reacao.danoMin);
  }
  // Ascensão IV do Cajado de Novato: +10% de dano em feitiços elementais
  const _wpnAscFusao = p.equippedWeapon || (p.inventory||[]).find(it => it.equipSlot === 'weapon' && it.equipped);
  if (_wpnAscFusao && _wpnAscFusao.id === 'cajado_basic' && (_wpnAscFusao.ascensionLevel||0) >= 4) {
    multFinal *= 1.10;
  }
  // ── Afinidade elemental ──
  const elemInimigo = e.elemento || 'neutro';
  // Elemento dominante da fusão (usa o primeiro elemento da chave)
  const elemFusao = f.chave ? f.chave.split('+')[0] : 'neutro';
  const { mult: multElem, tipo: tipoElem } = calcMultiplicadorElemental(elemFusao, elemInimigo);
  const dano = Math.max(1, Math.floor(p.mag * multFinal * lvScale * multElem));

  // ── Prato do Kappa: +40% no próximo ataque após Dano Verdadeiro ──
  let danoFinal = dano;
  if (bs._prataKappaProxAtk) {
    bs._prataKappaProxAtk = false;
    danoFinal = Math.floor(dano * 1.40);
    appendBattleLog(`🥣 PRATO DO KAPPA! Bônus +40% de dano ativado!`, '#00ddff');
    showFloatingNumber('enemy', '+40%', 'status');
  }
  bs.enemyHp -= danoFinal;
  bs.totalDmgDealt = (bs.totalDmgDealt || 0) + danoFinal;

  // ── Log de afinidade ──
  if (tipoElem === 'vantagem') {
    appendBattleLog(`⚡ VANTAGEM ELEMENTAL! ${e.name} é fraco a este elemento!`, '#ffee40');
    showFloatingNumber('enemy', '✦ FRAQUEZA', 'status');
  } else if (tipoElem === 'desvantagem') {
    appendBattleLog(`🛡 RESISTÊNCIA! ${e.name} resiste a este elemento!`, '#80a0c0');
    showFloatingNumber('enemy', '✦ RESIST', 'status');
  }

  // ── Efeitos por fusão (delega à função compartilhada) ──
  aplicarEfeitosDeReacao(reacao, dano, bs, e, p, showFloatingNumber, appendBattleLog);

  const _sufixoElem = tipoElem === 'vantagem' ? ' ⚡×1.7' : tipoElem === 'desvantagem' ? ' 🛡×0.6' : '';
  appendBattleLog(`${reacao.icon} FUSÃO ${reacao.nome.toUpperCase()}! ${dano} dano elemental!${_sufixoElem}`, reacao.cor);
  showFloatingNumber('enemy', dano, 'crit');
  flashDamage('enemy');
  // Sem animHeroAttack() aqui: o cut-in (showFusaoCutin, já chamado acima)
  // é quem representa a animação do herói na fusão. Chamar animHeroAttack()
  // também trocaria o sprite de baixo (prepare/attack/tak) ao mesmo tempo,
  // atropelando os frames do cut-in (conjuragua → conjurama).

  bs._elementoCarregado = null;
  const ind = document.getElementById('bat-elemento-indicador');
  if (ind) ind.style.display = 'none';

  updateHUD();
  updateBattleHUD();
  buildSkillList();

  if (bs.enemyHp <= 0) { setTimeout(() => endBattle(true, false), battleDelay(400)); return; }

  bs.turnCount = (bs.turnCount || 0) + 1;
  setTimeout(() => runEnemyTurn(bs, p, e, false), battleDelay(850));
}

// ══════════════════════════════════════════════════════════════
//  SISTEMA DE REAÇÕES ELEMENTAIS (Mago) — 48 fusões
// ══════════════════════════════════════════════════════════════
//  A grade de afinidade elemental (AFINIDADE_ELEMENTAL) e a função
//  calcMultiplicadorElemental() foram extraídas para o arquivo
//  core/elementos.js — carregado ANTES deste arquivo no
//  gat-1.html. Ambos continuam disponíveis globalmente (window),
//  então nada muda para o código abaixo que os utiliza.
// ══════════════════════════════════════════════════════════════

const REACOES_ELEMENTAIS = {
  // FOGO
  'fogo+agua':          { nome:'Vapor',              icon:'🌫️', cor:'#c0e0ff', danoMult:2.0, efeito:'vapor',           curaHp:0    },
  'agua+fogo':          { nome:'Vapor',              icon:'🌫️', cor:'#c0e0ff', danoMult:2.0, efeito:'vapor',           curaHp:0    },
  'fogo+eletrico':      { nome:'Sobrecarga',         icon:'🌩️', cor:'#ffcc00', danoMult:2.8, efeito:'sobrecarga',      curaHp:0    },
  'eletrico+fogo':      { nome:'Sobrecarga',         icon:'🌩️', cor:'#ffcc00', danoMult:2.8, efeito:'sobrecarga',      curaHp:0    },
  'fogo+gelo':          { nome:'Cinzas de Gelo',     icon:'🔵', cor:'#90c0e0', danoMult:3.0, efeito:'cinzas_gelo',     curaHp:0    },
  'gelo+fogo':          { nome:'Cinzas de Gelo',     icon:'🔵', cor:'#90c0e0', danoMult:3.0, efeito:'cinzas_gelo',     curaHp:0    },
  'fogo+planta':        { nome:'Floresta em Chamas', icon:'🔥', cor:'#e06020', danoMult:2.4, efeito:'florestafogo',    curaHp:0    },
  'planta+fogo':        { nome:'Floresta em Chamas', icon:'🔥', cor:'#e06020', danoMult:2.4, efeito:'florestafogo',    curaHp:0    },
  // ÁGUA
  'agua+eletrico':      { nome:'Tempestade',         icon:'⛈️', cor:'#80d0ff', danoMult:2.2, efeito:'tempestade',      curaHp:0    },
  'eletrico+agua':      { nome:'Tempestade',         icon:'⛈️', cor:'#80d0ff', danoMult:2.2, efeito:'tempestade',      curaHp:0    },
  'agua+gelo':          { nome:'Explosão Glacial',   icon:'🧊', cor:'#60c8ff', danoMult:2.3, efeito:'glacial',         curaHp:0    },
  'gelo+agua':          { nome:'Explosão Glacial',   icon:'🧊', cor:'#60c8ff', danoMult:2.3, efeito:'glacial',         curaHp:0    },
  'agua+terra':         { nome:'Lama Tóxica',        icon:'🟤', cor:'#a06030', danoMult:1.9, efeito:'lama',            curaHp:0    },
  'terra+agua':         { nome:'Lama Tóxica',        icon:'🟤', cor:'#a06030', danoMult:1.9, efeito:'lama',            curaHp:0    },
  'agua+planta':        { nome:'Nuvem de Esporos',   icon:'🍄', cor:'#80e080', danoMult:1.8, efeito:'esporos',         curaHp:0    },
  'planta+agua':        { nome:'Nuvem de Esporos',   icon:'🍄', cor:'#80e080', danoMult:1.8, efeito:'esporos',         curaHp:0    },
  // ELÉTRICO
  'eletrico+gelo':      { nome:'Nevasca',            icon:'🌨️', cor:'#b0e0ff', danoMult:2.5, efeito:'nevasca',         curaHp:0    },
  'gelo+eletrico':      { nome:'Nevasca',            icon:'🌨️', cor:'#b0e0ff', danoMult:2.5, efeito:'nevasca',         curaHp:0    },
  'eletrico+planta':    { nome:'Raiz Elétrica',      icon:'⚡', cor:'#b0ff80', danoMult:2.1, efeito:'raiz_eletrica',   curaHp:0    },
  'planta+eletrico':    { nome:'Raiz Elétrica',      icon:'⚡', cor:'#b0ff80', danoMult:2.1, efeito:'raiz_eletrica',   curaHp:0    },
  'eletrico+terra':     { nome:'Terremoto',          icon:'💥', cor:'#d09050', danoMult:2.6, efeito:'terremoto',       curaHp:0    },
  'terra+eletrico':     { nome:'Terremoto',          icon:'💥', cor:'#d09050', danoMult:2.6, efeito:'terremoto',       curaHp:0    },
  'eletrico+magia_negra':{ nome:'Tempestade Negra',  icon:'⚫', cor:'#6030a0', danoMult:3.1, efeito:'tempestade_negra',curaHp:0    },
  'magia_negra+eletrico':{ nome:'Tempestade Negra',  icon:'⚫', cor:'#6030a0', danoMult:3.1, efeito:'tempestade_negra',curaHp:0    },
  // GELO
  'gelo+planta':        { nome:'Geada das Raízes',   icon:'🥶', cor:'#90e8c0', danoMult:2.0, efeito:'geada_planta',    curaHp:0    },
  'planta+gelo':        { nome:'Geada das Raízes',   icon:'🥶', cor:'#90e8c0', danoMult:2.0, efeito:'geada_planta',    curaHp:0    },
  'gelo+vento':         { nome:'Vendaval Glacial',   icon:'🌬️', cor:'#80c8e0', danoMult:2.2, efeito:'vendaval_gelo',   curaHp:0    },
  'gelo+energia':       { nome:'Onda Fria',          icon:'💠', cor:'#80c0ff', danoMult:2.4, efeito:'onda_fria',       curaHp:0    },
  'energia+gelo':       { nome:'Onda Fria',          icon:'💠', cor:'#80c0ff', danoMult:2.4, efeito:'onda_fria',       curaHp:0    },
  'gelo+magia_negra':   { nome:'Gelo Negro',         icon:'🖤', cor:'#6040a0', danoMult:2.7, efeito:'gelo_negro',      curaHp:0    },
  'magia_negra+gelo':   { nome:'Gelo Negro',         icon:'🖤', cor:'#6040a0', danoMult:2.7, efeito:'gelo_negro',      curaHp:0    },
  // PLANTA
  'planta+terra':       { nome:'Pedra Viva',         icon:'🌱', cor:'#90c060', danoMult:2.0, efeito:'pedra_viva',      curaHp:0    },
  'terra+planta':       { nome:'Pedra Viva',         icon:'🌱', cor:'#90c060', danoMult:2.0, efeito:'pedra_viva',      curaHp:0    },
  'planta+energia':     { nome:'Pulso de Vida',      icon:'💚', cor:'#40e080', danoMult:1.6, efeito:'vida_planta',     curaHp:0.20 },
  'energia+planta':     { nome:'Pulso de Vida',      icon:'💚', cor:'#40e080', danoMult:1.6, efeito:'vida_planta',     curaHp:0.20 },
  'planta+magia_negra': { nome:'Floresta Sombria',   icon:'🌑', cor:'#507030', danoMult:2.3, efeito:'trevas_planta',   curaHp:0    },
  'magia_negra+planta': { nome:'Floresta Sombria',   icon:'🌑', cor:'#507030', danoMult:2.3, efeito:'trevas_planta',   curaHp:0    },
  'planta+veneno':      { nome:'Toxina das Raízes',  icon:'🍃', cor:'#50d050', danoMult:1.9, efeito:'veneno_planta',   curaHp:0    },
  'veneno+planta':      { nome:'Toxina das Raízes',  icon:'🍃', cor:'#50d050', danoMult:1.9, efeito:'veneno_planta',   curaHp:0    },
  // TERRA
  'terra+fogo':         { nome:'Pedra em Brasa',     icon:'🌋', cor:'#ff8030', danoMult:2.7, efeito:'pedra_fogo',      curaHp:0    },
  'fogo+terra':         { nome:'Pedra em Brasa',     icon:'🌋', cor:'#ff8030', danoMult:2.7, efeito:'pedra_fogo',      curaHp:0    },
  'terra+vento':        { nome:'Granizo de Pedras',  icon:'💨', cor:'#c0b080', danoMult:2.4, efeito:'rocha_vento',     curaHp:0    },
  'vento+terra':        { nome:'Granizo de Pedras',  icon:'💨', cor:'#c0b080', danoMult:2.4, efeito:'rocha_vento',     curaHp:0    },
  'terra+magia_negra':  { nome:'Abismo',             icon:'🕳️', cor:'#404060', danoMult:2.8, efeito:'abismo',          curaHp:0    },
  'magia_negra+terra':  { nome:'Abismo',             icon:'🕳️', cor:'#404060', danoMult:2.8, efeito:'abismo',          curaHp:0    },
  'terra+caos':         { nome:'Terra do Caos',      icon:'🌑', cor:'#806040', danoMin:2.0, danoMax:4.5, efeito:'terra_caos', curaHp:0 },
  'caos+terra':         { nome:'Terra do Caos',      icon:'🌑', cor:'#806040', danoMin:2.0, danoMax:4.5, efeito:'terra_caos', curaHp:0 },
  // ENERGIA
  'energia+fogo':       { nome:'Nova de Energia',    icon:'🌟', cor:'#e080ff', danoMult:3.2, efeito:'nova',            curaHp:0    },
  'fogo+energia':       { nome:'Nova de Energia',    icon:'🌟', cor:'#e080ff', danoMult:3.2, efeito:'nova',            curaHp:0    },
  'energia+luz':        { nome:'Luz Divina',         icon:'✝️', cor:'#ffffa0', danoMult:2.6, efeito:'luz_divina',      curaHp:0.25 },
  'energia+vento':      { nome:'Vórtice Arcano',     icon:'🌀', cor:'#a060e0', danoMult:2.3, efeito:'vortice',         curaHp:0    },
  'vento+energia':      { nome:'Vórtice Arcano',     icon:'🌀', cor:'#a060e0', danoMult:2.3, efeito:'vortice',         curaHp:0    },
  'energia+caos':       { nome:'Caos Arcano',        icon:'💫', cor:'#d080ff', danoMin:1.5, danoMax:5.0, efeito:'caos_arcano', curaHp:0 },
  'caos+energia':       { nome:'Caos Arcano',        icon:'💫', cor:'#d080ff', danoMin:1.5, danoMax:5.0, efeito:'caos_arcano', curaHp:0 },
  // MAGIA NEGRA
  'magia_negra+vento':  { nome:'Sombra Veloz',       icon:'🌑', cor:'#604080', danoMult:2.5, efeito:'sombra_vento',    curaHp:0    },
  'vento+magia_negra':  { nome:'Sombra Veloz',       icon:'🌑', cor:'#604080', danoMult:2.5, efeito:'sombra_vento',    curaHp:0    },
  'magia_negra+veneno': { nome:'Praga Sombria',      icon:'🦠', cor:'#408040', danoMult:2.0, efeito:'praga',           curaHp:0    },
  'veneno+magia_negra': { nome:'Praga Sombria',      icon:'🦠', cor:'#408040', danoMult:2.0, efeito:'praga',           curaHp:0    },
  'magia_negra+caos':   { nome:'Caos Sombrio',       icon:'⚫', cor:'#8020c0', danoMin:2.0, danoMax:5.0, efeito:'caos_sombrio', curaHp:0 },
  'caos+magia_negra':   { nome:'Caos Sombrio',       icon:'⚫', cor:'#8020c0', danoMin:2.0, danoMax:5.0, efeito:'caos_sombrio', curaHp:0 },
  'magia_negra+luz':    { nome:'Eclipse',            icon:'🌘', cor:'#504070', danoMult:3.5, efeito:'eclipse',         curaHp:0.20 },
  'luz+magia_negra':    { nome:'Eclipse',            icon:'🌘', cor:'#504070', danoMult:3.5, efeito:'eclipse',         curaHp:0.20 },
  // VENTO
  'vento+veneno':       { nome:'Tufão Venenoso',     icon:'🌀', cor:'#80c060', danoMult:2.1, efeito:'tufao_veneno',    curaHp:0    },
  'veneno+vento':       { nome:'Tufão Venenoso',     icon:'🌀', cor:'#80c060', danoMult:2.1, efeito:'tufao_veneno',    curaHp:0    },
  'vento+luz':          { nome:'Rajada de Luz',      icon:'🌟', cor:'#e0f060', danoMult:2.3, efeito:'luz_vento',       curaHp:0.10 },
  'luz+vento':          { nome:'Rajada de Luz',      icon:'🌟', cor:'#e0f060', danoMult:2.3, efeito:'luz_vento',       curaHp:0.10 },
  'vento+caos':         { nome:'Vento do Caos',      icon:'🌪️', cor:'#c080d0', danoMin:1.5, danoMax:3.5, efeito:'vento_caos', curaHp:0 },
  'caos+vento':         { nome:'Vento do Caos',      icon:'🌪️', cor:'#c080d0', danoMin:1.5, danoMax:3.5, efeito:'vento_caos', curaHp:0 },
  'vento+gelo':         { nome:'Ciclone de Gelo',    icon:'❄️', cor:'#80d8ff', danoMult:2.4, efeito:'ciclone_gelo',   curaHp:0    },
  // CAOS
  'caos+veneno':        { nome:'Veneno do Caos',     icon:'🌀', cor:'#a0c040', danoMin:2.0, danoMax:3.5, efeito:'caos_veneno', curaHp:0 },
  'veneno+caos':        { nome:'Veneno do Caos',     icon:'🌀', cor:'#a0c040', danoMin:2.0, danoMax:3.5, efeito:'caos_veneno', curaHp:0 },
  'caos+luz':           { nome:'Luz do Caos',        icon:'💫', cor:'#f0e080', danoMin:2.5, danoMax:4.0, efeito:'caos_luz',   curaHp:0 },
  'luz+caos':           { nome:'Luz do Caos',        icon:'💫', cor:'#f0e080', danoMin:2.5, danoMax:4.0, efeito:'caos_luz',   curaHp:0 },
  'caos+planta':        { nome:'Floresta Caótica',   icon:'🌿', cor:'#80d080', danoMin:1.8, danoMax:3.0, efeito:'caos_planta',curaHp:0 },
  'planta+caos':        { nome:'Floresta Caótica',   icon:'🌿', cor:'#80d080', danoMin:1.8, danoMax:3.0, efeito:'caos_planta',curaHp:0 },
  'caos+agua':          { nome:'Maré do Caos',       icon:'🌊', cor:'#60b0e0', danoMin:2.0, danoMax:3.8, efeito:'caos_agua',  curaHp:0 },
  'agua+caos':          { nome:'Maré do Caos',       icon:'🌊', cor:'#60b0e0', danoMin:2.0, danoMax:3.8, efeito:'caos_agua',  curaHp:0 },
  // VENENO
  'veneno+fogo':        { nome:'Chama Corrosiva',    icon:'🔥', cor:'#c06020', danoMult:2.5, efeito:'veneno_fogo',     curaHp:0    },
  'fogo+veneno':        { nome:'Chama Corrosiva',    icon:'🔥', cor:'#c06020', danoMult:2.5, efeito:'veneno_fogo',     curaHp:0    },
  'veneno+eletrico':    { nome:'Choque Tóxico',      icon:'⚡', cor:'#a0d040', danoMult:2.3, efeito:'veneno_eletrico', curaHp:0    },
  'eletrico+veneno':    { nome:'Choque Tóxico',      icon:'⚡', cor:'#a0d040', danoMult:2.3, efeito:'veneno_eletrico', curaHp:0    },
  'veneno+gelo':        { nome:'Veneno Glacial',     icon:'❄️', cor:'#60b080', danoMult:2.2, efeito:'veneno_gelo',     curaHp:0    },
  'gelo+veneno':        { nome:'Veneno Glacial',     icon:'❄️', cor:'#60b080', danoMult:2.2, efeito:'veneno_gelo',     curaHp:0    },
  'veneno+energia':     { nome:'Energia Tóxica',     icon:'✨', cor:'#b0e060', danoMult:2.4, efeito:'veneno_energia',  curaHp:0    },
  'energia+veneno':     { nome:'Energia Tóxica',     icon:'✨', cor:'#b0e060', danoMult:2.4, efeito:'veneno_energia',  curaHp:0    },
  // LUZ
  'luz+agua':           { nome:'Onda Sagrada',       icon:'🌊', cor:'#c0e8ff', danoMult:2.1, efeito:'luz_agua',        curaHp:0.15 },
  'agua+luz':           { nome:'Onda Sagrada',       icon:'🌊', cor:'#c0e8ff', danoMult:2.1, efeito:'luz_agua',        curaHp:0.15 },
  'luz+terra':          { nome:'Pilar de Luz',       icon:'🏔️', cor:'#e0d060', danoMult:2.5, efeito:'luz_terra',       curaHp:0.10 },
  'terra+luz':          { nome:'Pilar de Luz',       icon:'🏔️', cor:'#e0d060', danoMult:2.5, efeito:'luz_terra',       curaHp:0.10 },
  'luz+planta':         { nome:'Jardim Sagrado',     icon:'🌸', cor:'#d0f080', danoMult:1.8, efeito:'luz_planta',      curaHp:0.30 },
  'planta+luz':         { nome:'Jardim Sagrado',     icon:'🌸', cor:'#d0f080', danoMult:1.8, efeito:'luz_planta',      curaHp:0.30 },
  'luz+energia':        { nome:'Explosão Sagrada',   icon:'⭐', cor:'#fff080', danoMult:3.0, efeito:'luz_energia',     curaHp:0.15 },
};

function tryReacaoElemental(sk, p, e, bs, helpers) {
  if (!p.classData || p.classData.id !== 'mago') return false;
  if (!sk.elemento) return false;
  const { appendBattleLog, showFloatingNumber, flashDamage } = helpers;
  if (bs._elementoCarregado) {
    const elemAnterior = bs._elementoCarregado;
    const chave = elemAnterior + '+' + sk.elemento;
    const reacao = REACOES_ELEMENTAIS[chave];
    bs._elementoCarregado = null;
    const ind = document.getElementById('bat-elemento-indicador');
    if (ind) ind.style.display = 'none';
    if (reacao) {
      animHeroFusao();
      const lvScale = 1 + (p.level || 0) * 0.05;

      // ── Cálculo de dano base (suporta danoMult fixo OU danoMin–danoMax aleatório) ──
      let multFinal = reacao.danoMult;
      if (typeof reacao.danoMin === 'number') {
        multFinal = reacao.danoMin + Math.random() * (reacao.danoMax - reacao.danoMin);
      }
      // Ascensão IV do Cajado de Novato: +10% de dano em feitiços elementais
      const _wpnAscReacao = p.equippedWeapon || (p.inventory||[]).find(it => it.equipSlot === 'weapon' && it.equipped);
      if (_wpnAscReacao && _wpnAscReacao.id === 'cajado_basic' && (_wpnAscReacao.ascensionLevel||0) >= 4) {
        multFinal *= 1.10;
      }

      // ── Afinidade elemental (usa o primeiro elemento carregado como dominante) ──
      const elemInimigo = e.elemento || 'neutro';
      const { mult: multElem, tipo: tipoElem } = calcMultiplicadorElemental(elemAnterior, elemInimigo);

      let dano = Math.max(1, Math.floor(p.mag * multFinal * lvScale * multElem));

      if (bs._prataKappaProxAtk) {
        bs._prataKappaProxAtk = false;
        dano = Math.floor(dano * 1.40);
        appendBattleLog(`🥣 PRATO DO KAPPA! Bônus +40% de dano ativado!`, '#00ddff');
        showFloatingNumber('enemy', '+40%', 'status');
      }
      bs.enemyHp -= dano;
      bs.totalDmgDealt = (bs.totalDmgDealt || 0) + dano;
      _aplicarReflexoOrdem(bs, p, dano);

      if (tipoElem === 'vantagem') {
        appendBattleLog(`⚡ VANTAGEM ELEMENTAL! ${e.name} é fraco a este elemento!`, '#ffee40');
        showFloatingNumber('enemy', '✦ FRAQUEZA', 'status');
      } else if (tipoElem === 'desvantagem') {
        appendBattleLog(`🛡 RESISTÊNCIA! ${e.name} resiste a este elemento!`, '#80a0c0');
        showFloatingNumber('enemy', '✦ RESIST', 'status');
      }

      // ── Aplica todos os efeitos de status/cura da fusão (mesma lógica do Livro de Fusões) ──
      aplicarEfeitosDeReacao(reacao, dano, bs, e, p, showFloatingNumber, appendBattleLog);

      const _sufixoElem = tipoElem === 'vantagem' ? ' ⚡×1.7' : tipoElem === 'desvantagem' ? ' 🛡×0.6' : '';
      appendBattleLog(reacao.icon + ' REAÇÃO: ' + reacao.nome + '! ' + dano + ' dano elemental!' + _sufixoElem, reacao.cor);
      showFloatingNumber('enemy', dano, 'crit');
      flashDamage('enemy');
      return true;
    }
  }
  bs._elementoCarregado = sk.elemento;
  // Badge nos botões indica o elemento carregado
  return false;
}

// ── Bridge: executa skill da classe ──
// Delega inteiramente ao executeClassSkill de classes.js.
// ⚠ NÃO adicione lógica de skill aqui. Edite classes.js.
function executeSkill(sk, p, e, bs) {
  // Skills de talento (dmg começa com 'TALENT_')
  if (sk.dmg && sk.dmg.startsWith('TALENT_')) {
    if (typeof window.executeTalentSkill === 'function') {
      const result = window.executeTalentSkill(sk, p, e, bs);
      addLog(`Skill de talento "${sk.name}": executada.`, 'dmg');
      return result || { skipEnemyTurn: false, enemyStunned: false, apGain: 0 };
    }
  }
  if (typeof window.executeClassSkill !== 'function') {
    console.error('[Clivor] classes.js não carregado! executeClassSkill ausente.');
    return { skipEnemyTurn: false, enemyStunned: false, apGain: 0 };
  }
  const result = window.executeClassSkill(sk, p, e, bs, {
    appendBattleLog,
    showFloatingNumber,
    flashDamage,
    animEnemyHit,
    BATTLE_CONFIG,
    showShieldEffect,
    showGolpeSagradoEffect,
  });
  // ── Buff do Caldeirão de Alberon (Masmorra Inazami — LV1) ──
  // Só se aplica à habilidade BÁSICA escolhida (nunca em skills de talento/lua,
  // que já retornaram antes de chegar aqui — ver início desta função).
  // Ver getInazamiCaldeiraoBonus() em alberon_forja_selada.js.
  if (typeof getInazamiCaldeiraoBonus === 'function' && result && result.dmgDealt > 0) {
    const caldeiraoMult = getInazamiCaldeiraoBonus(sk);
    if (caldeiraoMult > 1) {
      const bonusCaldeirao = Math.floor(result.dmgDealt * (caldeiraoMult - 1));
      if (bonusCaldeirao > 0) {
        bs.enemyHp = Math.max(0, bs.enemyHp - bonusCaldeirao);
        result.dmgDealt += bonusCaldeirao;
        appendBattleLog(`🔥 Chama do Caldeirão! +${bonusCaldeirao} de dano bônus!`, '#ff9040');
        showFloatingNumber('enemy', bonusCaldeirao, 'crit');
      }
    }
  }

  // ── Reflexo da Ordem (Corredor das Estátuas) — reflete % do dano de skill ──
  if (result && result.dmgDealt > 0) _aplicarReflexoOrdem(bs, p, result.dmgDealt);

  // ── Prato do Kappa: +40% no próximo ataque após Dano Verdadeiro (skills) ──
  // O bs._prataKappaProxAtk é consumido aqui após a skill causar dano
  if (bs._prataKappaProxAtk && result && result.dmgDealt > 0) {
    bs._prataKappaProxAtk = false;
    const bonus = Math.floor(result.dmgDealt * 0.40);
    bs.enemyHp = Math.max(0, bs.enemyHp - bonus);
    appendBattleLog(`🥣 PRATO DO KAPPA! +40% de dano extra! -${bonus} HP!`, '#00ddff');
    showFloatingNumber('enemy', bonus, 'crit');
  }
  // SFX de flecha para skills do Arqueiro
  if (sk.dmg && sk.dmg.startsWith('arqueiro:')) {
    if (typeof playSfxFlecha === 'function') playSfxFlecha();
    // ── Forma Espiritual: decrementa duração a cada skill usada ──
    if (typeof tickFormaEspiritual === 'function') tickFormaEspiritual(bs);
  }
  addLog(`Skill "${sk.name}": executada.`, 'dmg');
  return result;
}

// ── Tick de efeitos de status no inimigo ──
function tickEnemyStatusEffects(bs, e) {
  // Fervor Selvagem do Gorila expira após 3 turnos
  if (e.id === 'gorila' && bs._gorilaFervorTurns > 0) {
    bs._gorilaFervorTurns--;
    if (bs._gorilaFervorTurns <= 0 && e._atkBase) {
      e.atk = e._atkBase;
      appendBattleLog('🦍 O Fervor Selvagem se esvai — o Gorila volta ao ritmo normal.', '#c08040');
    }
  }
  // ── FLORESTA MALIGNA — Rubrios Yk: elemento Água regenera 15% do HP máx por rodada ──
  if (e.id === 'flm_boss_rubrios_yk' && bs._rubriosElemento === 'agua') {
    const cura = Math.max(1, Math.floor(bs.enemyMaxHp * 0.15));
    const antes = bs.enemyHp;
    bs.enemyHp = Math.min(bs.enemyMaxHp, bs.enemyHp + cura);
    const curadoReal = bs.enemyHp - antes;
    if (curadoReal > 0) {
      appendBattleLog(`💧 A água regenera Rubrios Yk: +${curadoReal} HP!`, '#40a0e0');
      showFloatingNumber('enemy', curadoReal, 'heal');
    }
  }
  // ── Rubrios Yk: União dos Cackrans expira após 2 turnos ──
  if (bs._rubriosUniaoTurns > 0) {
    bs._rubriosUniaoTurns--;
    if (bs._rubriosUniaoTurns <= 0) {
      appendBattleLog('⚔️ Rubrios Yk separa os cackrans de volta.', '#c0a060');
    }
  }
  if (bs.enemyPoisoned && bs.enemyPoisonTurns > 0) {
    const pdmg = BATTLE_CONFIG.POISON_DMG_BASE;
    bs.enemyHp -= pdmg;
    bs.enemyPoisonTurns--;
    appendBattleLog(`☠ Veneno corrói ${e.name}: -${pdmg} HP! (${bs.enemyPoisonTurns} turnos restantes)`, '#60c060');
    if (bs.enemyPoisonTurns <= 0) { bs.enemyPoisoned = false; appendBattleLog('☠ Veneno dissipado.', '#408040'); }
    if (bs.enemyHp <= 0) { setTimeout(() => endBattle(true, false), battleDelay(300)); return; } // BUG-01 FIX
  }
  if (bs.enemyBurning && bs.enemyBurnTurns > 0) {
    const bdmg = BATTLE_CONFIG.BURN_DMG_BASE;
    bs.enemyHp -= bdmg;
    bs.enemyBurnTurns--;
    appendBattleLog(`🔥 Queimadura: -${bdmg} HP ao inimigo! (${bs.enemyBurnTurns}t)`, '#e08030');
    if (bs.enemyBurnTurns <= 0) { bs.enemyBurning = false; appendBattleLog('🔥 Queimadura extinta.', '#804020'); }
    if (bs.enemyHp <= 0) { setTimeout(() => endBattle(true, false), battleDelay(300)); return; } // BUG-01 FIX
  }
  // Sangramento inimigo (Paladino das Trevas)
  if (bs.enemyBleeding && bs.enemyBleedTurns > 0) {
    const blddmg = BATTLE_CONFIG.BLEED_DMG_BASE;
    bs.enemyHp -= blddmg;
    bs.enemyBleedTurns--;
    appendBattleLog(`🩸 Sangramento: -${blddmg} HP ao inimigo! (${bs.enemyBleedTurns}t)`, '#c04040');
    if (bs.enemyBleedTurns <= 0) { bs.enemyBleeding = false; appendBattleLog('🩸 Sangramento estancado.', '#804040'); }
    if (bs.enemyHp <= 0) { setTimeout(() => endBattle(true, false), battleDelay(300)); return; }
  }
  if (bs.enemySlowed && bs.enemySlowTurns > 0) {
    bs.enemySlowTurns--;
    if (bs.enemySlowTurns <= 0) { bs.enemySlowed = false; appendBattleLog('❄ Lentidão terminou.', '#6088aa'); }
  }
  // ── SELO INN — decrementa e reverte a redução de DEF quando expira ──
  if (bs._seloInnDebuffAtivo && bs._seloInnDebuffTurnos > 0) {
    bs._seloInnDebuffTurnos--;
    if (bs._seloInnDebuffTurnos <= 0) {
      e.def = (e.def || 0) + (bs._seloInnReducaoValor || 0);
      bs._seloInnDebuffAtivo = false;
      bs._seloInnReducaoValor = 0;
      appendBattleLog(`🗡️ A DEF de ${e.name} volta ao normal.`, '#c08050');
    }
  }
  // Marca do Caçador (Arqueiro): decrementa duração — sem dano por turno
  if (bs.enemyMarked && bs.enemyMarkTurns > 0) {
    bs.enemyMarkTurns--;
    if (bs.enemyMarkTurns <= 0) { bs.enemyMarked = false; appendBattleLog('🔖 A Marca do Caçador se desfaz.', '#8a6a30'); }
  }
  if (bs.enemyStunned && bs.enemyStunTurns > 0) {
    bs.enemyStunTurns--;
    if (bs.enemyStunTurns <= 0) { bs.enemyStunned = false; }
  }
  // Maldição Sombria (Paladino): decrementa duração
  if (bs._cursed && bs._cursedTurns > 0) {
    bs._cursedTurns--;
    if (bs._cursedTurns <= 0) { bs._cursed = false; appendBattleLog('💜 Maldição dissipada.', '#8040a0'); }
  }
  // Maldição do Julgamento (Talento): decrementa duração
  if (bs._enemy_cursed && bs._enemy_cursed_turns > 0) {
    bs._enemy_cursed_turns--;
    if (bs._enemy_cursed_turns <= 0) { bs._enemy_cursed = false; appendBattleLog('⚖️ Maldição do Julgamento dissipada.', '#8040a0'); }
  }
  // ── Novos status de fusão (Mago) ──
  if (bs._enemyRooted && bs._enemyRootedTurns > 0) {
    bs._enemyRootedTurns--;
    if (bs._enemyRootedTurns <= 0) { bs._enemyRooted = false; appendBattleLog('🌿 Enraizamento removido.', '#60d060'); }
  }
  if (bs._enemyDefDown && bs._enemyDefDownTurns > 0) {
    bs._enemyDefDownTurns--;
    if (bs._enemyDefDownTurns <= 0) { bs._enemyDefDown = false; bs._enemyDefDownAmt = 0; appendBattleLog('🪨 DEF do inimigo restaurada.', '#c08040'); }
  }
  if (bs._enemyAtkDown && bs._enemyAtkDownTurns > 0) {
    bs._enemyAtkDownTurns--;
    if (bs._enemyAtkDownTurns <= 0) { bs._enemyAtkDown = false; appendBattleLog('🌱 ATQ do inimigo restaurado.', '#90c060'); }
  }
  if (bs._enemyBlinded && bs._enemyBlindedTurns > 0) {
    bs._enemyBlindedTurns--;
    if (bs._enemyBlindedTurns <= 0) { bs._enemyBlinded = false; appendBattleLog('☀️ Cegueira removida.', '#ffe060'); }
  }
  if (bs._playerEvasion > 0 && bs._playerEvasionTurns > 0) {
    bs._playerEvasionTurns--;
    if (bs._playerEvasionTurns <= 0) { bs._playerEvasion = 0; appendBattleLog('🌪️ Bônus de evasão expirou.', '#80d0ff'); }
  }
  // Escudo de Cristal (Guardião de Cristal)
  if (bs._cristalShield && bs._cristalShieldTurns > 0) {
    bs._cristalShieldTurns--;
    if (bs._cristalShieldTurns <= 0) {
      bs._cristalShield = false;
      e.def = Math.max(0, e.def - (bs._crystalDefBonus || 8));
      bs._crystalDefBonus = 0;
      appendBattleLog('💎 Escudo de Cristal se desfez.', '#80c0ff');
    }
  }
  // Gelo Negro: drena HP enquanto congelado
  if (bs._geloNegroDrain && bs._enemyFrozen && bs.enemyHp > 0) {
    const p = G.player;
    const dr = Math.floor((p ? p.mag * 0.5 : 8));
    bs.enemyHp -= dr;
    if (p) { p.hp = Math.min(p.maxHp, p.hp + Math.floor(dr * 0.5)); showFloatingNumber('hero', Math.floor(dr * 0.5), 'heal'); }
    appendBattleLog(`🖤 Gelo Negro drena ${dr} HP do inimigo!`, '#6040a0');
    if (bs.enemyHp <= 0) { setTimeout(() => endBattle(true, false), battleDelay(300)); return; }
  }
  // Raízes Sombrias: drena HP por turno
  if (bs._plantaDrain && bs._plantaDrainTurns > 0) {
    const p = G.player;
    const dr2 = Math.floor((p ? p.mag * 0.4 : 6));
    bs.enemyHp -= dr2;
    if (p) { p.hp = Math.min(p.maxHp, p.hp + Math.floor(dr2 * 0.4)); showFloatingNumber('hero', Math.floor(dr2 * 0.4), 'heal'); }
    bs._plantaDrainTurns--;
    appendBattleLog(`🌑 Raízes Sombrias drenam ${dr2} HP! (${bs._plantaDrainTurns}t)`, '#507030');
    if (bs._plantaDrainTurns <= 0) { bs._plantaDrain = false; }
    if (bs.enemyHp <= 0) { setTimeout(() => endBattle(true, false), battleDelay(300)); return; }
  }
}

// ── Tick de efeitos de status no jogador ──
function tickPlayerStatusEffects(bs, p, e) {
  // Inimigo noDamage:true (ex: Eir em teste) — os DOTs (veneno/sangramento/
  // queimadura) não devem causar dano; o resto da função (regen, cura do
  // HuBi etc.) continua normal.
  const _noDmg = !!(bs && bs.enemyData && bs.enemyData.noDamage);
  if (!_noDmg && bs.playerPoisoned && bs.playerPoisonTurns > 0) {
    // Override por-fonte (ex.: Serpentinos — Floresta Maligna): veneno causa
    // uma % do ATQ de quem aplicou em vez do dano flat padrão do jogo.
    const pdmg = (bs._playerPoisonDmgOverride != null)
      ? bs._playerPoisonDmgOverride
      : BATTLE_CONFIG.POISON_DMG_BASE - 2; // veneno no jogador é levemente menor
    p.hp = Math.max(0, p.hp - pdmg);
    bs.playerPoisonTurns--;
    appendBattleLog(`☠ Veneno drena seu HP: -${pdmg}! (${bs.playerPoisonTurns}t)`, '#80ff80');
    showFloatingNumber('hero', pdmg, 'dmg');
    if (bs.playerPoisonTurns <= 0) { bs.playerPoisoned = false; bs._playerPoisonDmgOverride = null; appendBattleLog('☠ Veneno curado.', '#408040'); }
  }
  // ── Rubrios Yk (elemento Elétrico): estado de Choque expira sozinho ──
  if (bs._playerShocked && bs._playerShockedTurns > 0) {
    bs._playerShockedTurns--;
    if (bs._playerShockedTurns <= 0) {
      bs._playerShocked = false;
      appendBattleLog('⚡ O Estado de Choque se dissipa.', '#e0d060');
    }
  }
  if (!_noDmg && bs.playerBleeding && bs.playerBleedTurns > 0) {
    const bdmg = BATTLE_CONFIG.BLEED_DMG_BASE;
    p.hp = Math.max(0, p.hp - bdmg);
    bs.playerBleedTurns--;
    appendBattleLog(`🩸 Sangramento: -${bdmg} HP! (${bs.playerBleedTurns}t)`, '#c04040');
    showFloatingNumber('hero', bdmg, 'dmg');
    if (bs.playerBleedTurns <= 0) { bs.playerBleeding = false; appendBattleLog('🩸 Sangramento estancado.', '#804040'); }
  }
  // ── Reflexo da Ordem: decrementa duração (Corredor das Estátuas) ──
  if (bs._reflexoDano > 0 && bs._reflexoDanoTurns > 0) {
    bs._reflexoDanoTurns--;
    if (bs._reflexoDanoTurns <= 0) {
      bs._reflexoDano = 0;
      appendBattleLog('🪞 O reflexo da Ordem se desfaz.', '#a070ff');
    }
  }
  if (!_noDmg && bs.playerBurning && bs.playerBurnTurns > 0) {
    const qdmg = Math.max(1, Math.floor((p.maxHp || 100) * 0.035));
    p.hp = Math.max(0, p.hp - qdmg);
    bs.playerBurnTurns--;
    appendBattleLog(`🔥 Queimadura consome sua pele: -${qdmg} HP! (${bs.playerBurnTurns}t)`, '#e08030');
    showFloatingNumber('hero', qdmg, 'dmg');
    if (bs.playerBurnTurns <= 0) { bs.playerBurning = false; appendBattleLog('🔥 Queimadura extinta.', '#804020'); }
  }
  if (bs._regenTurns > 0) {
    const regen = Math.floor(p.maxHp * 0.04);
    aplicarCuraComLink('player', regen);
    bs._regenTurns--;
    appendBattleLog(`💚 Regeneração: +${regen} HP!`, '#40c040');
  }
  // ── Regen passivo da Runa (Paladino A/S) ──
  if (p._enchantRegen && p._enchantRegen > 0) {
    const enchRegen = Math.max(1, Math.floor(p.maxHp * p._enchantRegen));
    aplicarCuraComLink('player', enchRegen);
    appendBattleLog(`✨ Runa Sagrada: +${enchRegen} HP regenerado!`, '#d0d0ff');
  }
  // ── Cura passiva do HuBi (aliado desperto na estalagem) ──
  // Bloqueada enquanto a HuBi estiver "dormindo" (Segunda Ordem da
  // Estátua da Ordem — Corredor das Estátuas, Masmorra Inazami).
  if (bs._hubiSleeping && bs._hubiSleepingTurns > 0) {
    bs._hubiSleepingTurns--;
    appendBattleLog('💤 A HuBi está dormindo e não consegue te curar!', '#8090c0');
    if (bs._hubiSleepingTurns <= 0) {
      bs._hubiSleeping = false;
      appendBattleLog('💤 A HuBi acorda!', '#c0c0e0');
    }
  } else if (typeof hubiTickCura === 'function') {
    hubiTickCura(bs, p);
  }
  // ── Fúria da Floresta (Guardiã Yokai): decrementa o bloqueio geral de cura ──
  if (bs._curaBloqueadaTurns > 0) {
    bs._curaBloqueadaTurns--;
    if (bs._curaBloqueadaTurns <= 0) {
      appendBattleLog('😌 A Fúria da Floresta se dissipa — sua recuperação de HP volta ao normal.', '#7a9a5a');
    }
  }
  // ── Escudo da Sereia: decrementa turno ──
  if (bs._sereiaShieldActive && bs._sereiaShieldTurns > 0) {
    bs._sereiaShieldTurns--;
    if (bs._sereiaShieldTurns <= 0) {
      bs._sereiaShieldActive = false;
      appendBattleLog('🌊 O escudo da sereia se dissipou!', '#3090d0');
      showFloatingNumber('enemy', '🌊 ESCUDO ROMPIDO', 'status');
    } else {
      appendBattleLog(`🌊 Escudo da sereia: ${bs._sereiaShieldTurns} turno(s) restante(s).`, '#3090d0');
    }
  }
  // ── Fúria do Lago: decrementa turno ──
  if (bs._sereiaFuria && bs._sereiaFuriaTurns > 0) {
    bs._sereiaFuriaTurns--;
    if (bs._sereiaFuriaTurns <= 0) { bs._sereiaFuria = false; }
  }

  // Desfazer buff ATQ
  if (bs._buffAtkTurns > 0) {
    bs._buffAtkTurns--;
    if (bs._buffAtkTurns <= 0 && bs._buffAtkAmt > 0) {
      p.atk -= bs._buffAtkAmt;
      bs._buffAtkAmt = 0;
      appendBattleLog('📉 Buff de ATQ expirou.', '#888');
    }
  }
  if (bs._buffDefTurns > 0) {
    bs._buffDefTurns--;
    if (bs._buffDefTurns <= 0 && bs._buffDefAmt > 0) {
      p.def -= bs._buffDefAmt;
      bs._buffDefAmt = 0;
    }
  }

  // ── Escudo Divino (Paladino): decai por turno — muda pro frame de 50%
  // aos 2/3 do tempo, e explode/dissipa quando os 3 turnos terminam sem
  // absorver nenhum golpe (se absorver antes, já explode em calcEnemyDmg) ──
  if (bs._shieldActive && bs._shieldTurns > 0) {
    bs._shieldTurns--;
    if (bs._shieldTurns === 1) {
      if (typeof updatePalEscudoOrbStage === 'function') updatePalEscudoOrbStage(bs._shieldTurns);
    } else if (bs._shieldTurns <= 0) {
      bs._shieldActive = false;
      bs.defending     = false;
      appendBattleLog('✨ O Escudo Divino se dissipou.', '#b0c0ff');
      hideShieldEffect();
    }
  }

  // ── Julgamento Divino: decai escudo de DEF ──
  if (bs._julgamentoShieldTurns > 0) {
    bs._julgamentoShieldTurns--;
    if (bs._julgamentoShieldTurns <= 0 && bs._julgShieldApplied) {
      p.def -= bs._julgShieldApplied;
      bs._julgShieldApplied = 0;
      appendBattleLog('⚖️ Escudo do Julgamento Divino se dissipou.', '#aaa');
    }
  }

  // ── Fé Absoluta: reseta gatilho +50% de dano quando HP sobe acima de 15% ──
  if (p._pal_lv5_chosen === 'fe_absoluta' && bs._feAbsolutaGatilho50) {
    if ((p.hp / p.maxHp) >= 0.15) {
      bs._feAbsolutaGatilho50 = false;
    }
  }
  // ── Amuletos com sistema de carga (ex: Coração Incandescente) ──
  // A cada turno de batalha em que estiver equipado e não quebrado:
  //  1) rola chance de quebrar (uso desgasta o amuleto);
  //  2) se não quebrou e ainda não chegou a 100%, carrega mais um pouco;
  //  3) se acabou de chegar a 100%, ativa o buff (ATQ/Crítico/Cura) na hora.
  (G.player.inventory || []).forEach(it => {
    if (!it.equipped || !it.chargeable || it._quebrado) return;

    // Guarda do Lorde (conjunto Coração Incandescente + Peitoral do Lorde
    // das Sombras): desconta pontos percentuais fixos da chance de quebra.
    const _breakChance = Math.max(0, (it.breakChancePerTurn || 0) - (p._setCoracaoBreakReduce || 0));
    if (Math.random() * 100 < _breakChance) {
      it._quebrado = true;
      if (it._buffApplied) {
        if (bs._coracaoAtkAmt)  { p.atk = Math.max(0, p.atk - bs._coracaoAtkAmt); bs._coracaoAtkAmt = 0; }
        if (bs._coracaoCritAmt) { p.critBonus = Math.max(0, (p.critBonus || 0) - bs._coracaoCritAmt); bs._coracaoCritAmt = 0; }
        it._buffApplied = false;
      }
      appendBattleLog(`💔 ${it.name} racha e se quebra! Precisa ser consertado com ${it.repairQty || 1}× ${ITEM_DB[it.repairItemId]?.name || 'material'}.`, '#a05050');
      notify(`💔 ${it.name} quebrou!`, 'red');
      return;
    }

    if ((it._carga || 0) < 100) {
      it._carga = Math.min(100, (it._carga || 0) + (it.chargePerTurn || 10));
      if (it._carga >= 100 && !it._buffApplied) {
        const bAtk  = it.buffAtk  || 0;
        const bCrit = it.buffCrit || 0;
        const bHeal = it.buffHeal || 0;
        bs._coracaoAtkAmt  = (bs._coracaoAtkAmt  || 0) + bAtk;
        bs._coracaoCritAmt = (bs._coracaoCritAmt || 0) + (bCrit / 100);
        p.atk = (p.atk || 0) + bAtk;
        p.critBonus = (p.critBonus || 0) + (bCrit / 100);
        p.hp = Math.min(p.maxHp, (p.hp || 0) + bHeal);
        it._buffApplied = true;
        appendBattleLog(`🔥 ${it.name} atinge 100% e desperta! ATQ +${bAtk}, Crítico +${bCrit}%, +${bHeal} HP!`, '#ff6a2a');
        notify(`🔥 ${it.name} está 100% carregado!`, 'gold');
      }
    }
  });
}

// ── IA do Inimigo ──
// Mostra um selo curto sobre um dos lados da batalha (reação do inimigo ou buff do herói)
function showBattleSideBadge(side, text, color) {
  const container = document.getElementById(side === 'hero' ? 'bat-hero-side' : 'bat-enemy-side');
  if (!container) return;
  if (!container.style.position) container.style.position = 'relative';
  const badge = document.createElement('div');
  badge.className = 'enemy-reaction-badge';
  badge.textContent = text;
  badge.style.cssText += `background:${typeof hexToRgba === 'function' ? hexToRgba(color, 0.22) : 'rgba(0,0,0,0.4)'}; border:1px solid ${color}; color:${color};`;
  container.appendChild(badge);
  setTimeout(() => badge.remove(), 1850);
}
// Mantém o nome antigo funcionando (usado pelas reações do inimigo)
function showEnemyReactionBadge(text, color) { showBattleSideBadge('enemy', text, color); }

// ─────────────────────────────────────────────────────────────
//  REAÇÃO DO INIMIGO — lê o histórico de ações do jogador e
//  decide se o inimigo muda de comportamento neste turno.
//  Regras (nessa ordem de prioridade):
//   • 2 ações de veneno seguidas  → inimigo se cura antes de agir
//   • 2 críticos seguidos         → inimigo entra em guarda (reduz
//                                    dano do PRÓXIMO ataque do jogador)
//   • mesma skill 3x seguidas     → inimigo antecipa o padrão e
//                                    golpeia com dano bônus
// ─────────────────────────────────────────────────────────────
function evaluateEnemyReaction(bs) {
  const hist = bs.playerActionHistory || [];
  if (hist.length < 2) return null;
  const last2 = hist.slice(-2);
  const last3 = hist.slice(-3);

  if (last2.every(a => a.tags && a.tags.includes('veneno'))) {
    return { type: 'heal' };
  }
  if (last2.every(a => a.isCrit)) {
    return { type: 'guard' };
  }
  if (last3.length === 3 && last3.every(a => a.key && a.key === last3[0].key)) {
    return { type: 'predict' };
  }
  return null;
}

function runEnemyTurn(bs, p, e, skipTurn) {
  // ── DEBUG/TESTE: snapshot do HP antes do turno do inimigo.
  //    Se G.debugNoDamage estiver true, o HP é restaurado a este
  //    valor antes de cada checagem de morte, anulando qualquer
  //    dano/dreno sofrido no turno (ataque normal, especial ou
  //    status). Ligar/desligar pelo console (eruda): G.debugNoDamage = true
  const _hpAntesTurnoInimigo = p.hp;
  // ── Cooldowns de skills (ex.: Tiro Certeiro) tickam uma vez por rodada ──
  if (bs._cooldowns) {
    Object.keys(bs._cooldowns).forEach(k => {
      if (bs._cooldowns[k] > 0) bs._cooldowns[k]--;
    });
  }
  updateBattleTurnIndicator('enemy');

  // Se atordoado, pula o turno
  if (bs.enemyStunned || skipTurn) {
    appendBattleLog(`⚡ ${e.name} está atordoado e perde o turno!`, '#ffee40');
    tickPlayerStatusEffects(bs, p, e);
    if (typeof G !== 'undefined' && G.debugNoDamage) p.hp = _hpAntesTurnoInimigo;
    updateHUD();
    updateBattleHUD();
    // BUG-02 FIX: checar se jogador morreu por status no path de stun
    if (p.hp <= 0) {
      p.hp = 0;
      setTimeout(() => endBattle(false, false), battleDelay(400));
      return;
    }
    bs.phase = 'player';
    setBattleButtons(true);
    buildSkillList();
    updateBattleTurnIndicator('player');
    return;
  }

  bs.enemyTurnAI = (bs.enemyTurnAI || 0) + 1;

  // ── Reação a padrões do jogador ──
  const _reaction = (typeof evaluateEnemyReaction === 'function') ? evaluateEnemyReaction(bs) : null;
  let _reactionDmgMult = 1;
  let _reactionForceNormal = false;
  if (_reaction) {
    bs.playerActionHistory = []; // some o padrão lido, pra não reagir de novo no turno seguinte sem motivo novo
    if (_reaction.type === 'heal') {
      const healAmt = Math.floor(bs.enemyMaxHp * 0.12);
      aplicarCuraComLink('enemy', healAmt);
      appendBattleLog(`🧠 ${e.name} percebe o veneno repetido e se cura ${healAmt} HP antes de agir!`, '#60d090');
      showEnemyReactionBadge('🧠 PERCEBEU O VENENO', '#60d090');
      updateBattleHUD();
    } else if (_reaction.type === 'guard') {
      const guardBoost = Math.max(2, Math.floor((e.def || 0) * 0.5));
      e.def = (e.def || 0) + guardBoost;
      e._guardDefBoost = (e._guardDefBoost || 0) + guardBoost;
      bs._enemyGuardTurns = 1;
      appendBattleLog(`🛡️ ${e.name} percebe seus críticos seguidos e se prepara — guarda alta no seu próximo ataque!`, '#80a0ff');
      showEnemyReactionBadge('🛡 ENTROU EM GUARDA', '#80a0ff');
    } else if (_reaction.type === 'predict') {
      _reactionDmgMult = 1.3;
      _reactionForceNormal = true;
      appendBattleLog(`👁️ ${e.name} antecipa seu padrão e golpeia com mais força!`, '#ff8060');
      showEnemyReactionBadge('👁 ANTECIPOU SEU PADRÃO', '#ff8060');
    }
  }

  // Anima sprite do inimigo: attack
  animEnemyAttack();

  // Tick de status do jogador (no turno do inimigo)
  tickPlayerStatusEffects(bs, p, e);

  // Decidir ação do inimigo
  const aiKey = e.id || 'default';
  const ai = ENEMY_AI[aiKey] || ENEMY_AI.default;

  // Inimigo enraivecido usa especial mais vezes
  const specialChance = bs.enemyEnraged
    ? BATTLE_CONFIG.ENEMY_SPECIAL_CHANCE * 1.5
    : BATTLE_CONFIG.ENEMY_SPECIAL_CHANCE;

  // A cada 3 turnos ou com chance aleatória → ataque especial (a menos que esteja antecipando o padrão)
  // e.forceSpecialChance permite a um chefe específico sobrescrever essa
  // chance (ex.: Hi-no-Kagutsuchi usa 1.0 pra sempre passar pelo
  // caminho que dispara os FX de sprite dele — não afeta outros inimigos).
  const _usaChanceForcada = typeof e.forceSpecialChance === 'number';
  const _condicaoEspecial = _usaChanceForcada
    ? Math.random() < e.forceSpecialChance
    : (bs.enemyTurnAI % 3 === 0 || Math.random() < specialChance);
  if (!_reactionForceNormal && _condicaoEspecial) {
    // Ataque especial
    appendBattleLog(`${e.icon||'👹'} ${e.name} usa ${ai.specialIcon} ${ai.specialName}!`, '#ff8040');
    setTimeout(() => {
      ai.special(bs, p, e);
      if (typeof G !== 'undefined' && G.debugNoDamage) p.hp = _hpAntesTurnoInimigo;
      updateHUD();
      updateBattleHUD();
      buildStatusBadges();

      if (p.hp <= 0) {
        p.hp = 0; setTimeout(() => endBattle(false, false), battleDelay(500));
      } else {
        bs.phase = 'player';
        setBattleButtons(true);
        buildSkillList();
        updateBattleTurnIndicator('player');
      }
    }, 400);

  } else {
    // Ataque normal
    setTimeout(() => {
      // Esquiva do jogador
      const dodgeChance = BATTLE_CONFIG.MISS_CHANCE + (p.spd * BATTLE_CONFIG.DODGE_BONUS_PER_SPD) + (p._lua_dodge_bonus || 0);
      if (Math.random() < Math.min(0.4, dodgeChance)) {
        appendBattleLog(`💨 Você esquivou do ataque de ${e.name}!`, 'rgba(200,200,200,0.7)');
        showFloatingNumber('hero', 0, 'miss');
        if (typeof hubiReagirBatalha === 'function') hubiReagirBatalha(bs, 'esquiva');
        // Manter combo ao esquivar
        bs.comboCount++;
        bs.comboTier = Math.min(3, Math.floor(bs.comboCount / BATTLE_CONFIG.COMBO_WINDOW));
        updateComboDisplay();
        // ── Fervor Selvagem: esquivar também enche a barra ──
        if (p.classData && p.classData.id === 'arqueiro' && typeof gainFervor === 'function') gainFervor(p, 10);
        // ── Distância Segura (talento do Arqueiro): inimigo -20% ATQ no próximo turno ──
        if (p._talent_safe_distance) {
          bs._safeDistanceDebuff = true;
          appendBattleLog(`🛡️ Distância Segura! ${e.name} perde força ao errar!`, '#80a0ff');
        }
      } else {
        const _passiva = G._dungeonEnemyPassiva;
        const _critDungeon = _passiva && _passiva.tipo === 'critico_alto' && Math.random() < (_passiva.chance || 0.4);
        // Crítico genérico pra inimigos fora de masmorra com critChance próprio
        // (Urso Pardo, Cobra Verde, Urso Kodiak, Gorila)
        const _critProprio = !_critDungeon && e.critChance && Math.random() < e.critChance;
        const _isCrit = _critDungeon || _critProprio;
        const _critMult = _critDungeon ? (_passiva.mult || 2.0) : (e.critMult || 2.0);
        // Inimigos com _ignoraDefBasico calculam dano sem descontar DEF
        let dmgFinal;
        if (e._ignoraDefBasico) {
          const atkBase = bs.enemyEnraged ? Math.floor(e.atk * 1.5) : e.atk;
          dmgFinal = Math.max(1, Math.floor(atkBase * (_isCrit ? _critMult : 1.0) * _reactionDmgMult + Math.random() * 8));
        } else {
          // e.dmgMultBase: multiplicador de dano básico próprio do inimigo (ex.: 1.5 = 150%),
          // combinado com o multiplicador de enfurecido quando aplicável.
          // Rubrios Yk: União dos Cackrans (+35%) e Estado de Choque no jogador (+20%)
          // também valem pro ataque básico dele, não só pra skill especial.
          const _rubriosBuff = (e.id === 'flm_boss_rubrios_yk')
            ? (bs._rubriosUniaoTurns > 0 ? 1.35 : 1.0) * (bs._playerShocked ? 1.20 : 1.0)
            : 1.0;
          const _multBase = (e.dmgMultBase || 1.0) * (bs.enemyEnraged ? 1.5 : 1.0) * _rubriosBuff;
          const dmg = calcEnemyDmg(e, p, bs, _multBase) * (_isCrit ? _critMult : 1.0) * _reactionDmgMult;
          dmgFinal = Math.floor(dmg);
        }
        applyDmgToPlayer(dmgFinal, bs, p);
        if (_isCrit) {
          appendBattleLog(`💀 ${e.name} — CORTE CRÍTICO! -${dmgFinal} HP! ⚡ A lâmina cortou o vento!`, '#ff4040');
          showFloatingNumber('hero', dmgFinal, 'crit');
        } else {
          appendBattleLog(`💀 ${e.name} ${e.atkNome || 'ataca'}! -${dmgFinal} HP!`, 'rgba(200,80,20,0.9)');
          showFloatingNumber('hero', dmgFinal, 'dmg');
        }
        // Passiva de Siu — Sacerdotisa Negra: todo ataque (normal ou especial) cura 7% do dano causado
        if (_passiva && _passiva.tipo === 'siu_dreno_cura') {
          const _siuHealNormal = Math.max(1, Math.floor(dmgFinal * (_passiva.curaPctAtaque || 0.07)));
          bs.enemyHp = Math.min(bs.enemyMaxHp, bs.enemyHp + _siuHealNormal);
          appendBattleLog(`🌑 Siu absorve ${_siuHealNormal} HP do próprio golpe.`, '#9050c0');
          showFloatingNumber('enemy', _siuHealNormal, 'heal');
        }
        // Passiva do Lorde das Sombras — drena 5% do HP atual do jogador todo turno + aumenta critico
        if (_passiva && _passiva.tipo === 'lorde_dreno') {
          const _dreno = Math.max(2, Math.floor(p.hp * (_passiva.drenoPct || 0.05)));
          p.hp = Math.max(1, p.hp - _dreno);
          _passiva.criticoBonus = (_passiva.criticoBonus || 0) + (_passiva.criticoStep || 0.05);
          appendBattleLog(`🌑 Dreno das Sombras! -${_dreno} HP drenado. Critico do Lorde +${Math.round((_passiva.criticoStep||0.05)*100)}%! (total: ${Math.round(_passiva.criticoBonus*100)}%)`, '#1aaf3a');
          showFloatingNumber('hero', _dreno, 'dmg');
        }
        flashDamage('hero');
        animHeroHit();

        // Contra-ataque ao defender (Reflexo de Escudo eleva chance para 28%)
        const counterChance = p._talent_counter_up ? 0.28 : BATTLE_CONFIG.COUNTER_CHANCE;
        if (bs.defending && Math.random() < counterChance) {
          const cDmg = Math.max(1, Math.floor((p.class === 'paladino' ? p.def : p.atk) * 0.6 + Math.random() * 4));
          bs.enemyHp -= cDmg;
          appendBattleLog(`⚡ CONTRA-ATAQUE! -${cDmg} HP ao ${e.name}!`, '#ffcc40');
          showFloatingNumber('enemy', cDmg, 'crit');
          flashDamage('enemy');
        }
        bs.defending = false;
      }

      if (typeof G !== 'undefined' && G.debugNoDamage) p.hp = _hpAntesTurnoInimigo;
      updateHUD();
      updateBattleHUD();
      buildStatusBadges();

      // Verificar se inimigo morreu (contra-ataque)
      if (bs.enemyHp <= 0) {
        setTimeout(() => endBattle(true, false), battleDelay(400));
        return;
      }

      if (p.hp <= 0) {
        p.hp = 0; setTimeout(() => endBattle(false, false), battleDelay(500));
      } else {
        bs.phase = 'player';
        if (typeof applyTalentTurnStart === 'function') applyTalentTurnStart(bs);
        setBattleButtons(true);
        buildSkillList();
        updateBattleHUD();
        updateBattleTurnIndicator('player');
        setHeroAnim('idle'); // volta ao idle no início do turno do jogador
      }
    }, 300);
  }
}

// ── Pré-carrega imagens de sprite para evitar pisca na troca de frames ──
function _preloadSpriteImages() {
  const cls = G.player && G.player.classData;
  if (!cls || !cls.sprite || cls.sprite.type !== 'images') return;
  if (cls.sprite.attackSheet && cls.sprite.attackSheet.src) {
    const sheetImg = new Image();
    sheetImg.src = cls.sprite.attackSheet.src;
  }
  Object.values(cls.sprite.images).forEach(src => {
    if (src) { const img = new Image(); img.src = src; }
  });
}

// ── IDs dos timers de animação — evita acúmulo ao clicar rápido ──
const _heroAnimTimers = [];
function _clearHeroAnimTimers() {
  _heroAnimTimers.forEach(id => clearTimeout(id));
  _heroAnimTimers.length = 0;
}

// ── Animações de sprite ──
function animHeroAttack() {
  const cls = G.player && G.player.classData;
  if (!cls || !cls.sprite) return;

  // Cancela qualquer animação anterior ainda em andamento
  _clearHeroAnimTimers();

  if (cls.sprite.type === 'images') {
    const el = document.getElementById('bat-hero-icon');

    if (cls.id === 'paladino') {
      // frame 1: base (prepare)
      setHeroAnim('prepare');
      if (el) { el.style.transition = ''; el.style.transform = 'translateX(0px)'; }

      _heroAnimTimers.push(setTimeout(() => {
        // frame 2: martelo levantado
        setHeroAnim('attack');
        if (el) { el.style.transition = 'transform 0.13s ease-in'; el.style.transform = 'translateX(18px)'; }
      }, 140));

      _heroAnimTimers.push(setTimeout(() => {
        // frame 3: bateu o martelo no chão
        setHeroAnim('recover');
        if (el) { el.style.transition = 'transform 0.11s ease-out'; el.style.transform = 'translateX(6px)'; }
      }, 320));

      _heroAnimTimers.push(setTimeout(() => {
        setHeroAnim('idle');
        if (el) { el.style.transition = 'transform 0.13s ease-out'; el.style.transform = 'translateX(0px)'; }
      }, 500));

      _heroAnimTimers.push(setTimeout(() => {
        if (el) { el.style.transition = ''; el.style.transform = ''; }
      }, 650));
      return;
    }

    if (cls.id === 'assassino') {
      // Sequência com os 4 frames do sheet único (Assassino0000.png):
      // idle -> preparo (agachar) -> golpe -> golpe final -> idle
      // + avanço rápido no bote (bem mais brusco que o Paladino, combina
      // com a classe ágil) e volta suave pro idle.
      setHeroAnim('prepare');
      if (el) { el.style.transition = 'transform 0.1s ease-in'; el.style.transform = 'translateX(-6px)'; } // pequeno recuo antes do bote
      _heroAnimTimers.push(setTimeout(() => {
        setHeroAnim('attack');
        if (el) { el.style.transition = 'transform 0.14s cubic-bezier(0.3,0,0.2,1)'; el.style.transform = 'translateX(20px)'; }
      }, 180));
      _heroAnimTimers.push(setTimeout(() => {
        setHeroAnim('attack2');
        if (el) { el.style.transition = 'transform 0.1s ease-out'; el.style.transform = 'translateX(26px)'; }
      }, 420));
      _heroAnimTimers.push(setTimeout(() => {
        setHeroAnim('idle');
        if (el) { el.style.transition = 'transform 0.18s ease-out'; el.style.transform = 'translateX(0px)'; }
      }, 720));
      _heroAnimTimers.push(setTimeout(() => {
        if (el) { el.style.transition = ''; el.style.transform = ''; }
      }, 900));
      return;
    }

    // Mago: só 2 frames no ataque normal — frame1 (idle) -> frame2 (attack) -> frame1
    // Movimento sutil (não é bote corpo-a-corpo): um leve avanço/inclinação
    // pra frente, condizente com uma classe que conjura à distância.
    if (cls.id === 'mago') {
      setHeroAnim('attack');
      if (el) { el.style.transition = 'transform 0.12s ease-out'; el.style.transform = 'translateX(9px)'; }
      _heroAnimTimers.push(setTimeout(() => {
        setHeroAnim('idle');
        if (el) { el.style.transition = 'transform 0.16s ease-out'; el.style.transform = 'translateX(0px)'; }
      }, 380));
      _heroAnimTimers.push(setTimeout(() => {
        if (el) { el.style.transition = ''; el.style.transform = ''; }
      }, 540));
      return;
    }

    // Outras classes com type:images (ex: Arqueiro) — mesmo padrão de
    // avanço-e-retorno do Paladino, com timing próprio.
    setHeroAnim('prepare');
    if (el) { el.style.transition = ''; el.style.transform = 'translateX(0px)'; }
    _heroAnimTimers.push(setTimeout(() => {
      setHeroAnim('attack');
      if (el) { el.style.transition = 'transform 0.13s ease-in'; el.style.transform = 'translateX(16px)'; }
    }, 220));
    _heroAnimTimers.push(setTimeout(() => {
      setHeroAnim('tak');
      if (el) { el.style.transition = 'transform 0.11s ease-out'; el.style.transform = 'translateX(9px)'; }
    }, 520));
    _heroAnimTimers.push(setTimeout(() => {
      setHeroAnim('idle');
      if (el) { el.style.transition = 'transform 0.14s ease-out'; el.style.transform = 'translateX(0px)'; }
    }, 900));
    _heroAnimTimers.push(setTimeout(() => {
      if (el) { el.style.transition = ''; el.style.transform = ''; }
    }, 1050));
    return;
  }

  // Fallback: classes sem sprite.type 'images' (sprite simples) — mesmo
  // padrão de avanço-e-retorno, aplicado no elemento do herói.
  {
    const elFallback = document.getElementById('bat-hero-icon');
    setHeroAnim('prepare');
    if (elFallback) { elFallback.style.transition = ''; elFallback.style.transform = 'translateX(0px)'; }
    _heroAnimTimers.push(setTimeout(() => {
      setHeroAnim('attack');
      if (elFallback) { elFallback.style.transition = 'transform 0.13s ease-in'; elFallback.style.transform = 'translateX(16px)'; }
    }, 220));
    _heroAnimTimers.push(setTimeout(() => {
      setHeroAnim('recover');
      if (elFallback) { elFallback.style.transition = 'transform 0.15s ease-out'; elFallback.style.transform = 'translateX(0px)'; }
    }, 850));
    _heroAnimTimers.push(setTimeout(() => {
      setHeroAnim('idle');
      if (elFallback) { elFallback.style.transition = ''; elFallback.style.transform = ''; }
    }, 1150));
  }
}

function animHeroHit() {
  // Apenas o flash visual indica o dano — sem troca de spritesheet ao receber dano
  // A animação de defesa só ocorre ao apertar o botão Defender (animHeroDefend)
}

// ── Animação de ataque de FUSÃO do Mago (frame1 -> frame3 -> frame4 -> frame1) ──
// Usa o próprio sprite do herói (igual ao ataque normal), NUNCA passa pelo
// frame2 (esse é só do ataque normal de um elemento só).
function animHeroFusao() {
  const cls = G.player && G.player.classData;
  if (!cls || !cls.sprite || cls.id !== 'mago') return;
  _clearHeroAnimTimers();
  setHeroAnim('fusion1');
  _heroAnimTimers.push(setTimeout(() => setHeroAnim('fusion2'), 320));
  _heroAnimTimers.push(setTimeout(() => setHeroAnim('idle'),    720));
}

function animHeroDefend() {
  const cls = G.player && G.player.classData;
  if (!cls || !cls.sprite) return;
  // Usa sheetDef.png (cols 1→2) — só chamada ao apertar botão Defender
  setHeroAnim('defend');
  // Mantém a pose de defesa até o inimigo atacar; volta ao idle no próximo turno do jogador
}

// Troca a pose de um inimigo com poses "montadas" (enemy.spriteImages, ex.:
// Tierra) com um crossfade curto, em vez de cortar a imagem instantaneamente
// — a troca seca deixava visível que são recortes/imagens diferentes.
// Inimigos de spritesheet em grid (enemy.sprite) não passam por aqui: eles
// já são animados via CSS steps() e a troca instantânea não se aplica.
// ── Timer list + token do inimigo — evita que animEnemyHit e
// animEnemyAttack (ou chamadas repetidas da mesma) briguem pelo mesmo
// elemento quando disparam em sequência rápida (apanhar + atacar).
// Cada nova sequência cancela os timers pendentes da anterior e sobe o
// token; callbacks de sequências antigas se auto-anulam ao conferir o token.
const _enemyAnimTimers = [];
let _enemyAnimToken = 0;
function _clearEnemyAnimTimers() {
  _enemyAnimTimers.forEach(id => clearTimeout(id));
  _enemyAnimTimers.length = 0;
}

function _swapEnemyPoseFade(el, enemy, size, state, token) {
  if (!el) return;
  // Crossfade REAL: a pose nova entra por cima da atual (opacity 0→1) sem
  // nunca deixar o inimigo invisível no meio da troca. A versão anterior
  // fazia fade-out até opacity 0, SÓ ENTÃO trocava a imagem e fazia
  // fade-in — isso criava um instante real de "nada visível" (um flash
  // quase preto), que é o que aparecia como pisca-pisca no vídeo.
  const layer = document.createElement('div');
  layer.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.12s ease-out;';
  layer.innerHTML = buildEnemyVisual(enemy, size, state);
  el.appendChild(layer);
  requestAnimationFrame(() => {
    if (token !== undefined && token !== _enemyAnimToken) { layer.remove(); return; }
    layer.style.opacity = '1';
  });
  const t = setTimeout(() => {
    if (token !== undefined && token !== _enemyAnimToken) { layer.remove(); return; }
    // Promove a camada nova a conteúdo definitivo do elemento — remove a(s)
    // pose(s) antiga(s) de baixo, evitando acumular <div> a cada troca.
    el.innerHTML = layer.innerHTML;
  }, 150);
  _enemyAnimTimers.push(t);
}

// Anima a reação de dano do inimigo (chamada de dentro de flashDamage()
// pra qualquer fonte de dano — skill, contra-ataque, Ceifada da Gadanha,
// etc. — sem precisar mexer em cada ponto que causa dano). Funciona tanto
// com spritesheet em grid (enemy.sprite) quanto com poses separadas
// (enemy.spriteImages, ex.: Tierra).
function animEnemyHit() {
  const enemy = G.currentEnemy;
  if (!enemy || (!enemy.sprite && !enemy.spriteImages)) return;
  const batIcon = document.getElementById('bat-enemy-icon');
  if (!batIcon) return;
  _clearEnemyAnimTimers();
  const token = ++_enemyAnimToken;
  const hitState = enemy.spriteImages ? (enemy.spriteImages.hit ? 'hit' : 'idle') : 'run';
  const revertDelay = enemy.spriteImages ? 340 : 500;
  // Crossfade curto pros dois tipos (spriteImages e grid/steps()) — trocar
  // via innerHTML seco reinicia a animação CSS do zero (volta pro frame 0),
  // o que "piscava" quando hit e attack disparavam perto um do outro.
  _swapEnemyPoseFade(batIcon, enemy, 112, hitState, token);
  _enemyAnimTimers.push(setTimeout(() => {
    if (G.currentEnemy === enemy && token === _enemyAnimToken) _swapEnemyPoseFade(batIcon, enemy, 112, 'idle', token);
  }, revertDelay));
}

function animEnemyAttack() {
  const enemy = G.currentEnemy;
  if (!enemy || (!enemy.sprite && !enemy.spriteImages)) return;
  const batIcon = document.getElementById('bat-enemy-icon');
  const sceneEl = document.getElementById('scene-enemy');
  const sceneVisible = sceneEl && sceneEl.style.display !== 'none';
  _clearEnemyAnimTimers();
  const token = ++_enemyAnimToken;
  const paint = (state) => {
    _swapEnemyPoseFade(batIcon, enemy, 112, state, token);
    if (sceneVisible) _swapEnemyPoseFade(sceneEl, enemy, 150, state, token);
  };
  // Poses separadas com estágio de preparação (ex.: Tierra: idle → iniciando
  // o ataque → atacando → idle). Inimigos de spritesheet em grid continuam
  // no comportamento antigo (attack → idle), a menos que também definam
  // um frame 'prepare' nos anims do sheet.
  if (enemy.spriteImages && enemy.spriteImages.prepare) {
    paint('prepare');
    _enemyAnimTimers.push(setTimeout(() => { if (token === _enemyAnimToken) paint('attack'); }, 150));
    _enemyAnimTimers.push(setTimeout(() => { if (G.currentEnemy === enemy && token === _enemyAnimToken) paint('idle'); }, 460));
  } else {
    paint('attack');
    _enemyAnimTimers.push(setTimeout(() => { if (G.currentEnemy === enemy && token === _enemyAnimToken) paint('idle'); }, 700));
  }
}


function endBattle(won, fled) {
  // GUARDA GLOBAL: evita que a mesma batalha seja finalizada duas vezes
  // (ex: um tick de dano contínuo mata o inimigo e chama endBattle, e o
  // golpe/ação que causou o dano chama endBattle de novo logo em seguida).
  // Sem isso, a 2ª chamada consome/pisa em cima do resultado da 1ª —
  // era isso que fazia a vitória de masmorra "piscar" e virar o texto
  // genérico da floresta, mesmo com G._dungeonBattleCallback certo.
  if (battleState._battleEnded) return;
  battleState._battleEnded = true;
  fecharBattleItemMenu();
  if (typeof _clearEnemyAnimTimers === 'function') _clearEnemyAnimTimers();
  if (typeof _enemyAnimToken !== 'undefined') _enemyAnimToken++; // anula fades/timeouts pendentes do inimigo anterior

  // ── Talento: Caçador Absoluto (Arqueiro) — matou um alvo marcado por
  // Marca do Caçador: recupera 15 flechas e zera o cooldown da skill. ──
  if (won && battleState.enemyMarked && G.player && G.player._talent_absolute_hunter) {
    const _maxArrows = (typeof getArrowsMax === 'function') ? getArrowsMax(G.player) : 30;
    const _curArrows = (typeof getArrows === 'function') ? getArrows(G.player) : (G.player.arrows || 0);
    G.player.arrows = Math.min(_maxArrows, _curArrows + 15);
    if (battleState._cooldowns) battleState._cooldowns['marca_cacador'] = 0;
    if (typeof appendBattleLog === 'function') appendBattleLog('👑 Caçador Absoluto! Alvo marcado abatido — +15 flechas e Marca do Caçador pronta novamente!', '#e0c040');
  }

  G.inBattle = false;
  // Bênçãos da Divina Trindade: gasta 1 batalha (fugir não conta)
  if (!fled && typeof _trindadeTickBattle === 'function') _trindadeTickBattle();
  if (typeof hubiStopIdleAnim === 'function') hubiStopIdleAnim();
  if (window.missoeVerificarVisibilidade) missoeVerificarVisibilidade();
  document.getElementById('battle-overlay').classList.remove('active');
  if (typeof clearLuaBattleAmbience === 'function') clearLuaBattleAmbience();
  if (typeof applyBattleArenaBg === 'function') applyBattleArenaBg(null);
  if (typeof clearLuaCheiaInvestida === 'function') clearLuaCheiaInvestida(G.player);
  if (typeof hideFusaoCutin === 'function') hideFusaoCutin();
  if (typeof hideBiteCutin === 'function') hideBiteCutin();
  const _lciOverlay = document.getElementById('lua-cheia-investida-overlay');
  if (_lciOverlay) _lciOverlay.remove();
  hideEnemy();

  // ── CLEANUP: Coração Incandescente — remove buff ao fim da batalha.
  // Sem isso, o ATQ bônus (+12) fica permanente acumulando a cada batalha.
  // A carga (_carga) NÃO é zerada aqui — só zera se o jogador morrer
  // (ver "Derrota padrão" mais abaixo) — então na próxima batalha, se
  // ainda estiver 100% e não quebrado, o buff volta a ativar na hora.
  {
    const bs_pre = battleState;
    if (bs_pre._coracaoAtkAmt && bs_pre._coracaoAtkAmt > 0) {
      G.player.atk = Math.max(0, (G.player.atk || 0) - bs_pre._coracaoAtkAmt);
      bs_pre._coracaoAtkAmt = 0;
    }
    if (bs_pre._coracaoCritAmt && bs_pre._coracaoCritAmt > 0) {
      G.player.critBonus = Math.max(0, (G.player.critBonus || 0) - bs_pre._coracaoCritAmt);
      bs_pre._coracaoCritAmt = 0;
    }
    const _coracaoEquip = (G.player.inventory || []).find(i => i.equipped && i.id === 'coracao_incandescente');
    if (_coracaoEquip) _coracaoEquip._buffApplied = false;

    // ── CLEANUP: Selo do Vale — reverte o +20 ATQ concedido no início da
    // batalha (ver startBattle). Sem isso o bônus fica permanente e
    // acumula a cada luta.
    if (bs_pre._seloValeAtkAmt && bs_pre._seloValeAtkAmt > 0) {
      G.player.atk = Math.max(0, (G.player.atk || 0) - bs_pre._seloValeAtkAmt);
      bs_pre._seloValeAtkAmt = 0;
    }

    // ── CLEANUP: Selo do Bastião — reverte o +15% DEF concedido no
    // início da batalha (ver startBattle), senão acumula pra sempre.
    if (bs_pre._seloBastiaoDefAmt && bs_pre._seloBastiaoDefAmt > 0) {
      G.player.def = Math.max(0, (G.player.def || 0) - bs_pre._seloBastiaoDefAmt);
      bs_pre._seloBastiaoDefAmt = 0;
    }

    // ── CLEANUP: Aura Protetora (Paladino) — reverte DEF temporário pendente.
    // Sem isso, se a batalha acabar antes dos 3 turnos do buff terminarem,
    // o +6 DEF fica permanente e acumula a cada uso.
    if (bs_pre._buffDefAmt && bs_pre._buffDefAmt > 0) {
      G.player.def = Math.max(0, (G.player.def || 0) - bs_pre._buffDefAmt);
      bs_pre._buffDefAmt = 0;
    }
    bs_pre._buffDefTurns = 0;

    // ── CLEANUP: Julgamento Divino (Paladino Lv5) — reverte o escudo de
    // DEF temporário (50% do DEF) se a batalha acabar antes dos 2 turnos.
    // Sem isso o DEF vaza permanentemente e cada uso futuro calcula 50%
    // em cima de um DEF já inflado, empilhando cada vez mais.
    if (bs_pre._julgShieldApplied && bs_pre._julgShieldApplied > 0) {
      G.player.def = Math.max(0, (G.player.def || 0) - bs_pre._julgShieldApplied);
      bs_pre._julgShieldApplied = 0;
    }
    bs_pre._julgamentoShieldTurns = 0;
  }

  const enemy = battleState.enemyData;
  const bs    = battleState;

  if (won) {
    // ── Blindagem: qualquer inimigo (de qualquer masmorra, atual ou futura)
    // que não tenha "gold" definido no seu objeto não trava mais a recompensa
    // em NaN/undefined — cai automaticamente pra um valor justo baseado no XP
    // (mesma regra usada no Quadro de Quests, via getEnemyGoldReward).
    const _enemyGoldBase = getEnemyGoldReward(enemy);

    // ── Mérito do Vilarejo: bônus de ouro conforme o nível de mérito atual ──
    const _repBonusPct = (typeof getRepBonusRecompensa === 'function') ? getRepBonusRecompensa() : 0;
    const _goldBonus   = _repBonusPct > 0 ? Math.round(_enemyGoldBase * (_repBonusPct / 100)) : 0;
    const _goldTotal   = _enemyGoldBase + _goldBonus;

    G.player.gold += _goldTotal;
    G.player.kills = (G.player.kills || 0) + 1;
    G.player.xp   += enemy.xp;
    G.enemiesDefeated = (G.enemiesDefeated || 0) + 1;
    if (window.QuestBoard) QuestBoard.onBattleWon(enemy, G.location);
    // ── HuBi: mérito com o vilarejo (antes de despertar) / progressão de nível (depois) ──
    if (typeof onHubiEnemyDefeated === 'function') onHubiEnemyDefeated(enemy);
    if (typeof hubiRegisterVitoria === 'function') hubiRegisterVitoria();
    // ── Mérito do Vilarejo: pontos por inimigo derrotado ──
    if (G.location === 'floresta' && typeof applyMeritOnVictory === 'function') {
      // Sistema de Mérito (7 níveis): +2/+15 pts e 25% de chance de loot dobrado
      applyMeritOnVictory(enemy);
    } else if (typeof addReputation === 'function') {
      const _repGanho = enemy.isBoss ? 15
        : (enemy.isSubBoss || enemy.subBoss || enemy.subChefe || enemy.isSubChefe) ? 8
        : 2;
      addReputation(_repGanho, `Derrotou ${enemy.name}`);
    }
    addLog(`Vitória! +${enemy.xp}XP +${_goldTotal}◈`, 'xp');
    notify(`⚔ Vitória! +${enemy.xp} XP`, 'purple');
    notify(`◈ +${_goldTotal} moedas!${_goldBonus > 0 ? ` (+${_goldBonus} por mérito)` : ''}`, 'gold');

    // Pontos de Talento disponíveis após ganhar XP (Mago não usa PT — visual omitido)
    const ptDisp = typeof getAvailablePT === 'function' ? getAvailablePT() : 0;
    if (ptDisp > 0 && (!G.player.classData || G.player.classData.id !== 'mago')) {
      notify(`✦ ${ptDisp} Ponto(s) de Talento disponíveis!`, 'gold');
    }

    // Loot padrão
    if (enemy.loot) {
      enemy.loot.forEach(l => {
        // Amuleto/armadura que o jogador já tem não cai de novo (masmorra repetida).
        if (!l._isRunaMaterial && equipDeMasmorraJaTem(l)) return;
        const chance = (l.chance != null) ? l.chance : 1.0;
        if (Math.random() < chance) {
          if (l._isRunaMaterial) {
            // Runa material — vai para runasMateriais, não para o inventário
            if (typeof addRunaMaterial === 'function') {
              addRunaMaterial(l._isRunaMaterial, l.qty || 1);
            }
            notify(`💎 ${l.name} adicionada ao estoque de runas!`, 'gold');
          } else {
            // BUG-LOOT FIX: inclui imgSrc para itens com imagem (ex: Erva Medicinal)
            // BUG-LOOT FIX 2: preserva a flag `unique` da tabela de loot — sem isso,
            // itens marcados como únicos (ex.: fragmentos de amuleto de boss) perdiam
            // a flag ao passar por addItem() e podiam duplicar/acumular a cada luta.
            const _dropItem = { id:l.id, name:l.name, icon:l.icon, imgSrc:l.imgSrc||null, weight:l.weight||0.5, qty:1, desc:l.desc||'', type:l.type||'material', unique:l.unique||false };
            // BUG-LOOT FIX 3: equipamentos dropados (ex.: Prato do Kappa) perdiam equipSlot e os
            // stats ao passar por aqui — ficavam na bolsa sem conseguir equipar. Preserva-os.
            if (l.type === 'equipamento') {
              ['equipSlot','atk','def','spd','mag','crit','hp','mp'].forEach(k => { if (l[k] != null) _dropItem[k] = l[k]; });
            }
            addItem(_dropItem);
            notify(`🎁 ${l.icon} ${l.name} obtido!`, 'gold');
          }
        }
      });
    }

    // Guarda do Lorde ativa: pequena chance extra de achar Pó de Sombra
    // ao vencer — o próprio material usado pra consertar o Coração,
    // fechando o ciclo do conjunto.
    if (G.player._setCoracaoAtivo && Math.random() < 0.12) {
      const _po = ITEM_DB.po_sombra;
      addItem({ id:'po_sombra', name:_po.name, icon:_po.icon, imgSrc:_po.imgSrc||null, weight:_po.weight||0.1, qty:1, desc:_po.desc||'', type:'material' });
      notify('🖤 Guarda do Lorde: Pó de Sombra extra encontrado!', 'gold');
    }

    // Baú Comum (BauB): drop ocasional dentro da Dungeon das Sombras,
    // contraparte mais fraca do Baú das Sombras (que só vem do chefe).
    if (G.location && G.location.indexOf('dungeon-') === 0 && Math.random() < 0.08) {
      const _bau = ITEM_DB.bau_comum;
      addItem({ id:'bau_comum', name:_bau.name, icon:_bau.icon, imgSrc:_bau.imgSrc||null, weight:_bau.weight||1.5, desc:_bau.desc||'', type:'bau', lootTable:_bau.lootTable, lootGold:_bau.lootGold }, 1);
      notify('🎁 Um Baú Comum foi encontrado nos escombros!', 'gold');
    }

    // Hooks de talentos na vitória
    if (typeof applyTalentOnVictory === 'function') applyTalentOnVictory(enemy, bs);

    // Punho do Dragão: cura extra se matou
    if (G.player._talent_dragon_fist) {
      const h = Math.floor(G.player.maxHp * 0.30);
      G.player.hp = Math.min(G.player.maxHp, G.player.hp + h);
      G.player.mp = Math.min(G.player.maxMp, G.player.mp + Math.floor(G.player.maxMp * 0.30));
      notify(`🐉 Punho do Dragão: +${h} HP e MP restaurado!`, 'green');
    }

    // Boss — Ooni Blindado (Fase 2 Kappa)
    if (enemy.id === 'ooni_blindado') {
      const jaTemInoo = playerTemItem('amuleto_inoo');
      if (!jaTemInoo) {
        const inoo = {
          id: 'amuleto_inoo', name: 'Amuleto Inoo', icon: '🪬',
          imgSrc: 'Imagens/icones/materiais/Inoo.png',
          qty: 1, weight: 0.3, type: 'acessorio',
          equipSlot: 'acessorio',
          desc: '"Poucos atravessam o caminho do Ooni Blindado e permanecem vivos para contar a história. Ele não protege tesouros. Não protege terras. Protege apenas a vontade do Kappa."'
        };
        G.player.inventory = G.player.inventory || [];
        G.player.inventory.push(inoo);
        notify('🪬 Amuleto Inoo obtido!', 'gold');
        addLog('✦ Amuleto Inoo adicionado ao inventário.', 'xp');
      }
    }

    // Boss — Tierra: dropa uma caixa em vez de dar o amuleto direto. Abrir a
    // caixa (useInventoryItem → tipo 'caixa_recompensa') que aplica o bônus
    // por classe, adiciona o Amuleto de Tierra e revela o popup do item.
    if (enemy.id === 'tierra' || enemy.name === 'Tierra — Guardião da Floresta') {
      G.dogDefeated = true;
      // Procura também no Armazém do Alberon: antes só olhava a bolsa, então
      // quem guardava o amuleto lá e vencia Tierra de novo ganhava outra caixa.
      const jaTemAmuletoOuCaixa = _temTierraAmuletoOuCaixa();
      if (!jaTemAmuletoOuCaixa) {
        G.player.inventory = G.player.inventory || [];
        G.player.inventory.push({
          id: 'caixa_tierra', name: 'Caixa de Tierra', icon: '🎁',
          imgSrc: 'Imagens/icones/materiais/BauB.png',
          qty: 1, weight: 0.5, type: 'caixa_recompensa',
          desc: 'Uma caixa entrelaçada de raízes e folhas, deixada por Tierra. Algo dentro dela pulsa suavemente.',
          _boxBuilder: _abrirCaixaTierra,
        });
        notify('🌿 Tierra derrotado! Uma caixa apareceu na sua bolsa.', 'gold');
        addLog('✦ Caixa de Tierra adicionada ao inventário.', 'xp');
      }
    }

    // Boss final da masmorra Inazami — Hi-no-Kagutsuchi: zerou a masmorra,
    // então libera a Casa do Alberon em Kurosaki (+ armazém) com o pop-up
    // de desbloqueio.
    if (enemy && typeof enemy.id === 'string' && /kagutsuchi/i.test(enemy.id)
        && typeof window.kurosakiLiberarCasaAlberon === 'function') {
      setTimeout(() => window.kurosakiLiberarCasaAlberon(), 1800);
    }

    updateHUD();
    buildInventoryGrid();
    checkLevelUp();

    setTimeout(() => {
      // Dungeon callback customizado (ex: Dungeon das Sombras)
      if (G._dungeonBattleCallback) {
        const cb = G._dungeonBattleCallback;
        G._dungeonBattleCallback = null;
        cb(enemy);
        return;
      }
      // BUG-DS FIX: se estiver numa cena de dungeon e o callback foi consumido
      // (ex: endBattle chamado duas vezes por status-tick + golpe final),
      // não chamar storyNode_afterBattle — usar o resumeCallback pendente se existir
      if (G.location && (G.location.startsWith('dungeon-') || G.location.startsWith('kappa-'))) {
        if (G._dungeonResumeCallback) {
          const rcb = G._dungeonResumeCallback;
          G._dungeonResumeCallback = null;
          rcb(enemy);
          return;
        }
        // Sem callback e sem resume — apenas avisa, não redireciona para floresta
        addLog('⚠ Callback de dungeon perdido. Use os botões de navegação.', 'info');
        return;
      }
      if (enemy.id === 'tierra' || enemy.name === 'Tierra — Guardião da Floresta') storyNode_vitoriaBoss();
      else {
        if (typeof hideStoryCutscene === 'function') hideStoryCutscene();
        storyNode_afterBattle(enemy);
      }
    }, 500);

  } else if (fled) {
    // BUG FIX: mesmo problema do ramo de derrota — fugir de uma dungeon
    // deixava o callback preso, causando o mesmo redirecionamento indevido.
    G._dungeonBattleCallback = null;
    G._dungeonResumeCallback = null;
    G._dungeonEnemyPassiva   = null;
    _kaelRestoreHp();

    // ── Masmorra Inazami: fugir de uma batalha ainda dentro da masmorra
    // também conta como "sair" — reseta o progresso dos pins do mapa
    // igual à derrota (ver bloco acima).
    if (typeof G.location === 'string' && (G.location.indexOf('inazami') === 0 || G.location === 'dungeon-inazami')
        && typeof window.inazamiResetPinsProgress === 'function') {
      window.inazamiResetPinsProgress();
    }

    // Talentos de fuga (Fumaça: cura 20% HP)
    if (G.player._talent_smoke) {
      const h = Math.floor(G.player.maxHp * 0.20);
      G.player.hp = Math.min(G.player.maxHp, G.player.hp + h);
      notify(`💨 Fumaça: +${h} HP ao fugir!`, 'green');
    }
    notify('💨 Fugiu da batalha.', 'gold');
    updateHUD();
    // FIX Kappa: fugir dentro da masmorra do Kappa caía no storyNode_floresta()
    // (monstros da floresta dentro da caverna). Agora sai pelo fluxo da masmorra.
    if ((G.location === 'dungeon-kappa' || (G.location || '').indexOf('kappa-') === 0) && typeof window.kappaSairDaMasmorra === 'function') {
      setTimeout(() => window.kappaSairDaMasmorra('fuga'), 300);
    } else if (((G.location || '').indexOf('aranhas-') === 0 || G.location === 'dungeon-aranhas') && typeof window.aranhasSairDaMasmorra === 'function') {
      // Masmorra 4 (Ninho dos Fios Ilusórios): fugir sai pelo fluxo da própria masmorra
      setTimeout(() => window.aranhasSairDaMasmorra('fuga'), 300);
    } else {
      setTimeout(() => storyNode_floresta(), 300);
    }

  } else {
    // Lich Menor: ressurreição
    if (G.player._talent_phylactery && !bs._phylactery_used) {
      bs._phylactery_used = true;
      G.player.hp = Math.floor(G.player.maxHp * 0.25);
      G.player.mp = G.player.maxMp;
      G.inBattle = true;
      document.getElementById('battle-overlay').classList.add('active');
      if (typeof applyLuaBattleAmbience === 'function') applyLuaBattleAmbience(G.player);
      if (typeof applyBattleArenaBg === 'function') applyBattleArenaBg(G.location);
      updateHUD(); updateBattleHUD();
      appendBattleLog('💀 LICH MENOR! Você ressuscita das cinzas com 25% HP!', '#9040e0');
      notify('💀 Lich Menor: Ressurreição!', 'purple');
      battleState.phase = 'player';
      setBattleButtons(true);
      buildSkillList();
      return;
    }

    // Ressurreição do Paladino
    if (G.player._talent_resurrection && !bs._resurrection_used) {
      bs._resurrection_used = true;
      G.player.hp = Math.floor(G.player.maxHp * 0.40);
      G.inBattle = true;
      document.getElementById('battle-overlay').classList.add('active');
      if (typeof applyLuaBattleAmbience === 'function') applyLuaBattleAmbience(G.player);
      if (typeof applyBattleArenaBg === 'function') applyBattleArenaBg(G.location);
      updateHUD(); updateBattleHUD();
      appendBattleLog('🕊️ RESSURREIÇÃO! Você retorna da morte com 40% HP!', '#c8960a');
      notify('🕊️ Ressurreição Divina!', 'gold');
      battleState.phase = 'player';
      setBattleButtons(true);
      buildSkillList();
      return;
    }

    // Imortalidade Furiosa (Berserker)
    if (G.player._talent_undying && !bs._undying_used) {
      bs._undying_used = true;
      G.player.hp = Math.max(1, Math.floor(G.player.maxHp * 0.25));
      G.inBattle = true;
      document.getElementById('battle-overlay').classList.add('active');
      if (typeof applyLuaBattleAmbience === 'function') applyLuaBattleAmbience(G.player);
      if (typeof applyBattleArenaBg === 'function') applyBattleArenaBg(G.location);
      updateHUD(); updateBattleHUD();
      appendBattleLog('💀 IMORTALIDADE FURIOSA! Sobreviveu com 1 HP — cura 25% HP!', '#c05020');
      notify('💀 Imortalidade Furiosa!', 'red');
      battleState.phase = 'player';
      setBattleButtons(true);
      buildSkillList();
      return;
    }

    // ── Floresta Maligna: derrota no chefe tem regra própria — perde 50%
    // do ouro (em vez dos 25% padrão) e, ao fechar o resumo, encerra o
    // modo e volta pro vilarejo em vez de continuar na floresta normal.
    const _flMalignaFinish = G._florestaMalignaDefeatCallback || null;
    const _saiKappa = ((G.location === 'dungeon-kappa' || (G.location || '').indexOf('kappa-') === 0) && typeof window.kappaSairDaMasmorra === 'function');
    const _saiAranhas = (((G.location || '').indexOf('aranhas-') === 0 || G.location === 'dungeon-aranhas') && typeof window.aranhasSairDaMasmorra === 'function');
    G._florestaMalignaDefeatCallback = null;

    // BUG FIX: derrota dentro de uma dungeon deixava G._dungeonBattleCallback
    // (e resume/passiva) presos — na próxima vitória na floresta, o endBattle
    // achava esse callback "fantasma" e reabria a dungeon em vez de seguir o fluxo normal.
    G._dungeonBattleCallback = null;
    G._dungeonResumeCallback = null;
    G._dungeonEnemyPassiva   = null;
    _kaelRestoreHp();

    // ── Masmorra Inazami: morrer ainda dentro da masmorra (antes de
    // derrotar o chefe final) faz a expedição falhar — todo o progresso
    // de pins do mapa (Onibi, Eir, Alberon, Trono) reseta, então a
    // próxima entrada começa do zero em vez de aparecer tudo "concluído".
    if (typeof G.location === 'string' && (G.location.indexOf('inazami') === 0 || G.location === 'dungeon-inazami')
        && typeof window.inazamiResetPinsProgress === 'function') {
      window.inazamiResetPinsProgress();
    }

    // Derrota padrão (Floresta Maligna perde 50% em vez de 25%)
    G.player.deaths = (G.player.deaths || 0) + 1;
    const _lostGoldPct = _flMalignaFinish ? 0.5 : 0.25;
    const lostGold = Math.floor(G.player.gold * _lostGoldPct);
    G.player.hp   = Math.floor(G.player.maxHp * 0.5);
    G.player.gold = Math.floor(G.player.gold * (1 - _lostGoldPct));

    // ── Mérito do Vilarejo: perde pontos ao ser derrotado na floresta ──
    if (G.location === 'floresta' && typeof applyMeritOnDefeat === 'function') {
      applyMeritOnDefeat(enemy);
    }

    // ── Amuletos com sistema de carga (ex: Coração Incandescente): morrer zera a carga ──
    (G.player.inventory || []).forEach(it => {
      if (it.chargeable && (it._carga || 0) > 0) {
        it._carga = 0;
        it._buffApplied = false;
      }
    });

    updateHUD();
    addLog('💀 Derrota... você acorda enfraquecido.', 'dmg');
    notify('💀 Derrotado!', 'red');

    // ── Estatísticas da run ──
    const runTurns    = bs.turn || 0;
    const runDmgDealt = bs.totalDmgDealt || 0;
    const runKills    = G.player.kills || 0;
    const enemyName   = enemy ? (enemy.name || 'Inimigo') : 'Inimigo';
    const playerLv    = G.player.level || 1;

    // ── Dica contextual baseada na situação ──
    const _defeatTips = [];
    if (runDmgDealt < 30)  _defeatTips.push('💡 Seu dano está baixo — invista em ATQ ou MAG nos talentos antes de entrar na dungeon.');
    if (runTurns <= 3)     _defeatTips.push('💡 Você caiu muito rápido! Suba de nível ou equipe itens de DEF antes de continuar.');
    if (playerLv < 5)      _defeatTips.push(`💡 Nível ${playerLv} ainda é baixo para essa área — chegue ao nível ${playerLv + 2} e tente de novo.`);
    if (lostGold > 0)      _defeatTips.push(`💡 Perdeu ${lostGold} moedas — compre poções na taverna antes de entrar para não perder tanto.`);
    if (runTurns > 8)      _defeatTips.push('💡 Você aguentou bastante! Equipe uma habilidade de cura ou use poções no momento certo.');
    if (_defeatTips.length === 0) _defeatTips.push('💡 Cada derrota ensina algo. Revise seus talentos e tente uma estratégia diferente!');
    const _defeatTip = _defeatTips[Math.floor(Math.random() * _defeatTips.length)];

    // ── Avaliação de desempenho ──
    let _avaliacao = '';
    if (runTurns >= 12)      _avaliacao = '⭐⭐⭐ Chegou longe! Estava quase lá.';
    else if (runTurns >= 6)  _avaliacao = '⭐⭐ Bom esforço — mais alguns níveis e você passa!';
    else if (runTurns >= 3)  _avaliacao = '⭐ Precisa se preparar melhor antes da dungeon.';
    else                     _avaliacao = '💀 Caiu na primeira investida — reforce seus atributos!';

    setTimeout(() => {
      setStory('NARRADOR',
        `Você cai diante de ${enemyName}. A escuridão te engole por um instante...\n\n` +
        `Você acorda enfraquecido na beira da floresta. Mas Clivor ainda precisa de você.`,
        []
      );
      showDefeatSummaryPopup({
        enemyName, runTurns, runDmgDealt, runKills, lostGold,
        avaliacao: _avaliacao, dica: _defeatTip,
        // FIX Kappa: derrota na masmorra do Kappa também não deve cair na floresta.
        onClose: _flMalignaFinish || (_saiKappa ? () => window.kappaSairDaMasmorra('derrota') : (_saiAranhas ? () => window.aranhasSairDaMasmorra('derrota') : null)),
      });
    }, 400);
  }
}


// ─────────────────────────────────────────────────────────────
//  POP-UP — Resumo da Derrota
//  Antes esse conteúdo (stats + dica) ficava dentro do texto do
//  Narrador, empurrando o botão "Levantar e continuar" pra baixo
//  do scroll. Agora aparece como um pop-up centralizado por cima
//  da tela, no mesmo estilo do tutorial da Bolsa.
// ─────────────────────────────────────────────────────────────
function showDefeatSummaryPopup(d) {
  const old = document.getElementById('defeat-summary-popup');
  if (old) old.remove();

  const linhas = [
    { icon:'⚔', label:'Inimigo que te derrotou', val: d.enemyName },
    { icon:'🔄', label:'Turnos sobrevividos', val: d.runTurns },
    { icon:'💥', label:'Dano total causado', val: d.runDmgDealt },
    { icon:'💀', label:'Inimigos abatidos (total)', val: d.runKills },
    { icon:'📉', label:'Moedas perdidas', val: d.lostGold },
  ];
  const linhasHtml = linhas.map(l => `
    <div style="display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid rgba(200,60,60,0.14);">
      <span style="font-size:0.62rem;color:rgba(242,232,208,0.75);"><span style="margin-right:6px;">${l.icon}</span>${l.label}</span>
      <span style="font-size:0.66rem;color:#ff8a80;font-weight:700;">${l.val}</span>
    </div>
  `).join('');

  const overlay = document.createElement('div');
  overlay.id = 'defeat-summary-popup';
  overlay.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;z-index:10000;
    background:rgba(6,0,1,0.82);display:flex;align-items:center;justify-content:center;padding:16px;
    animation:defeatPopupFadeIn 0.35s ease;
  `;
  if (!document.getElementById('defeat-popup-styles')) {
    const st = document.createElement('style');
    st.id = 'defeat-popup-styles';
    st.textContent = `@keyframes defeatPopupFadeIn{from{opacity:0}to{opacity:1}}`;
    document.head.appendChild(st);
  }
  overlay.innerHTML = `
    <div style="background:#0e0605;border:1px solid rgba(200,60,60,0.45);border-top:3px solid #b71c1c;
                width:100%;max-width:340px;max-height:88vh;overflow-y:auto;font-family:'Noto Serif JP',serif;
                color:#f2e8d0;border-radius:2px;box-shadow:0 0 40px rgba(180,0,20,0.35);">
      <div style="padding:6px 14px;background:rgba(180,0,20,0.14);border-bottom:1px solid rgba(200,60,60,0.25);
                  font-family:'Noto Sans JP',sans-serif;font-size:0.52rem;letter-spacing:4px;color:#ff5252;">
        💀 RESUMO DA DERROTA
      </div>
      <div style="padding:16px 14px;">
        <div style="text-align:center;font-size:0.7rem;color:#ffab91;margin-bottom:10px;">${d.avaliacao}</div>
        <div style="border-top:1px solid rgba(200,60,60,0.2);">
          ${linhasHtml}
        </div>
        <div style="font-size:0.62rem;color:rgba(242,232,208,0.7);line-height:1.6;margin-top:14px;">
          ${d.dica}
        </div>
        <div style="text-align:center;margin-top:16px;">
          <button id="_defeat_summary_close" style="
            font-family:'Noto Serif JP',serif;font-size:0.7rem;letter-spacing:1px;
            padding:9px 22px;border:1px solid rgba(255,82,82,0.5);background:rgba(140,0,10,0.18);
            color:#ff8a80;cursor:pointer;">↩ Levantar e continuar</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const closeBtn = document.getElementById('_defeat_summary_close');
  const closeAndContinue = () => {
    overlay.remove();
    if (typeof d.onClose === 'function') { d.onClose(); return; }
    if (typeof storyNode_floresta === 'function') storyNode_floresta();
  };
  if (closeBtn) closeBtn.onclick = closeAndContinue;
  overlay.onclick = (e) => { if (e.target === overlay) closeAndContinue(); };
}
window.showDefeatSummaryPopup = showDefeatSummaryPopup;


// ─────────────────────────────────────────────────────────────
//  POP-UP — Loot de Baú
//  Mesmo layout do "Resumo da Derrota", porém no tema dourado
//  usado na Bolsa (mochila), mostrando os itens ganhos ao abrir
//  um baú.
// ─────────────────────────────────────────────────────────────
function showChestLootPopup(d) {
  const old = document.getElementById('chest-loot-popup');
  if (old) old.remove();

  const itens = d.itens || [];
  const linhasHtml = itens.map(it => {
    const iconHtml = it.imgSrc
      ? `<img src="${it.imgSrc}" style="width:22px;height:22px;object-fit:contain;vertical-align:middle;margin-right:6px;">`
      : `<span style="margin-right:6px;">${it.icon || '📦'}</span>`;
    return `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid rgba(240,192,64,0.22);">
      <span style="font-size:0.64rem;color:rgba(255,232,180,0.9);display:flex;align-items:center;">${iconHtml}${it.name}</span>
      <span style="font-size:0.66rem;color:#ffd866;font-weight:700;text-shadow:0 0 8px rgba(255,216,102,0.4);">${it.qty > 1 ? `x${it.qty}` : ''}</span>
    </div>
  `;
  }).join('');

  const goldHtml = d.gold ? `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid rgba(240,192,64,0.22);">
      <span style="font-size:0.64rem;color:rgba(255,232,180,0.9);"><span style="margin-right:6px;">💰</span>Ouro</span>
      <span style="font-size:0.66rem;color:#ffd866;font-weight:700;text-shadow:0 0 8px rgba(255,216,102,0.4);">+${d.gold}</span>
    </div>
  ` : '';

  const overlay = document.createElement('div');
  overlay.id = 'chest-loot-popup';
  overlay.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;z-index:10000;
    background:rgba(0,0,0,0.78);display:flex;align-items:center;justify-content:center;padding:16px;
    animation:defeatPopupFadeIn 0.35s ease;
  `;
  if (!document.getElementById('defeat-popup-styles')) {
    const st = document.createElement('style');
    st.id = 'defeat-popup-styles';
    st.textContent = `@keyframes defeatPopupFadeIn{from{opacity:0}to{opacity:1}}`;
    document.head.appendChild(st);
  }
  overlay.innerHTML = `
    <div style="background:
                  repeating-linear-gradient(0deg, rgba(240,192,64,0.05) 0px, rgba(240,192,64,0.05) 1px, transparent 1px, transparent 3px),
                  linear-gradient(160deg, rgba(160,120,10,0.28) 0%, rgba(60,42,4,0.5) 45%, #0e0a03 100%);
                border:1px solid rgba(240,192,64,0.6);border-top:3px solid #f0c040;
                width:100%;max-width:340px;max-height:88vh;overflow-y:auto;font-family:'Noto Serif JP',serif;
                color:var(--gold2);border-radius:2px;box-shadow:0 0 55px rgba(240,192,64,0.4), inset 0 0 30px rgba(240,192,64,0.06);">
      <div style="padding:6px 14px;background:linear-gradient(90deg, rgba(240,192,64,0.28), rgba(240,192,64,0.08));
                  border-bottom:1px solid rgba(240,192,64,0.35);
                  font-family:'Noto Sans JP',sans-serif;font-size:0.52rem;letter-spacing:4px;color:#ffd866;
                  text-shadow:0 0 10px rgba(255,216,102,0.6);">
        🎁 BAÚ ABERTO
      </div>
      <div style="padding:16px 14px;">
        <div style="text-align:center;font-size:0.72rem;color:#ffd866;font-weight:700;margin-bottom:10px;
                    text-shadow:0 0 12px rgba(255,216,102,0.5);">${d.chestName || 'Baú'}</div>
        <div style="border-top:1px solid rgba(240,192,64,0.3);">
          ${linhasHtml}${goldHtml}
        </div>
        <div style="text-align:center;margin-top:16px;">
          <button id="_chest_loot_close" style="
            font-family:'Noto Serif JP',serif;font-size:0.7rem;letter-spacing:1px;
            padding:9px 22px;border:1px solid rgba(240,192,64,0.65);
            background:linear-gradient(180deg, rgba(240,192,64,0.28), rgba(140,100,10,0.22));
            color:#ffd866;font-weight:700;cursor:pointer;box-shadow:0 0 14px rgba(240,192,64,0.25);">Coletar</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const closeBtn = document.getElementById('_chest_loot_close');
  const close = () => overlay.remove();
  if (closeBtn) closeBtn.onclick = close;
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
}
window.showChestLootPopup = showChestLootPopup;


// ─────────────────────────────────────────────────────────────
//  LEVEL UP OVERLAY + SFX
// ─────────────────────────────────────────────────────────────
function playSfxLevelUp() {
  const el = document.getElementById('sfx-levelup');
  if (!el) return;
  if (window.AudioSys && window.AudioSys.sfxMuted) return;
  const vol = (window.AudioSys && window.AudioSys.sfxVolume != null) ? window.AudioSys.sfxVolume : 0.8;
  el.volume = Math.min(1, vol);
  try { el.pause(); el.currentTime = 0; } catch(e) {}
  el.play().catch(() => {});
}

// ── Som de toque: pool de instâncias para tocar instantaneamente,
//    sem o atraso de "rebobinar" (currentTime=0) uma <audio> já em uso ──
const TAP_SOUND_SRC = 'musicas/STUDO/liecio-menu_beep_short_snap-533778.mp3';
const _tapSoundPool = [];
let _tapPoolIdx = 0;
function _initTapSoundPool() {
  for (let i = 0; i < 5; i++) {
    const a = new Audio(TAP_SOUND_SRC);
    a.preload = 'auto';
    try { a.load(); } catch (e) {}
    _tapSoundPool.push(a);
  }
}
function playTapSound() {
  if (CONFIG.tapSound === false) return;
  if (window.AudioSys && AudioSys.sfxMuted) return;
  if (_tapSoundPool.length === 0) _initTapSoundPool();
  const a = _tapSoundPool[_tapPoolIdx];
  _tapPoolIdx = (_tapPoolIdx + 1) % _tapSoundPool.length;
  const vol = (window.AudioSys && AudioSys.sfxVolume != null) ? AudioSys.sfxVolume : 0.8;
  a.volume = Math.min(1, vol);
  if (!a.paused) { try { a.pause(); } catch (e) {} }
  try { a.currentTime = 0; } catch (e) {}
  a.play().catch(() => {});
}
window.playTapSound = playTapSound;

// ── Helper genérico de SFX ──
function _playSfxById(id) {
  const el = document.getElementById(id);
  if (!el) return;
  if (window.AudioSys && window.AudioSys.sfxMuted) return;
  const vol = (window.AudioSys && window.AudioSys.sfxVolume != null) ? window.AudioSys.sfxVolume : 0.8;
  el.volume = Math.min(1, vol);
  el.currentTime = 0;
  el.play().catch(() => {});
}

function playSfxFlecha()      { _playSfxById('sfx-flecha'); }
function playSfxMagoBase()    { _playSfxById('sfx-mago-base'); }
function playSfxMagoAgua()    { _playSfxById('sfx-mago-agua'); }
function playSfxMagoFogo()    { _playSfxById('sfx-mago-fogo'); }
function playSfxMagoEletric() { _playSfxById('sfx-mago-eletric'); }
function playSfxClassSelect() { _playSfxById('sfx-class-select'); }

// Nomes de exibição pros códigos curtos de stat usados em checkLevelUp()
const LEVELUP_STAT_LABELS = {
  HP:  'Vida Máxima',
  ATQ: 'Ataque',
  DEF: 'Defesa',
  VEL: 'Velocidade',
  MAG: 'Magia',
  MP:  'Mana'
};

function showLevelUpOverlay(level, statsStr, ptMsg) {
  const overlay = document.getElementById('levelup-overlay');
  const numEl   = document.getElementById('levelup-num');
  const listEl  = document.getElementById('levelup-stats-list');
  const ptEl    = document.getElementById('levelup-pt');
  const parEl   = document.getElementById('levelup-particles');
  if (!overlay) return;

  // Preenche número do nível
  numEl.textContent = level;

  // Extrai cada par "CÓDIGO+valor" de statsStr (ex: "HP+12, ATQ+2, DEF+1, VEL+1 MAG+3")
  // e monta uma linha por stat, na ordem em que aparecem.
  listEl.innerHTML = '';
  const statMatches = String(statsStr || '').match(/[A-Z]+\+-?\d+/g) || [];
  statMatches.forEach(tok => {
    const m = tok.match(/^([A-Z]+)\+(-?\d+)$/);
    if (!m) return;
    const code = m[1];
    const val  = m[2];
    const label = LEVELUP_STAT_LABELS[code] || code;
    const row = document.createElement('div');
    row.className = 'levelup-stat-row';
    row.innerHTML = `<span>${label}</span><b>+${val}</b>`;
    listEl.appendChild(row);
  });

  // Pontos de talento — extrai o número de ptMsg (" · 2 PT disponíveis!")
  const ptMatch = String(ptMsg || '').match(/(\d+)\s*PT/);
  if (ptMatch) {
    ptEl.textContent = `✦ ${ptMatch[1]} Ponto${ptMatch[1] === '1' ? '' : 's'} de Talento disponíve${ptMatch[1] === '1' ? 'l' : 'is'}`;
    ptEl.style.display = '';
  } else {
    ptEl.textContent = '';
    ptEl.style.display = 'none';
  }

  parEl.innerHTML = '';

  // Poeira dourada subindo do chão junto com o feixe
  for (let i = 0; i < 26; i++) {
    const m = document.createElement('div');
    m.className = 'lu-mote';
    m.style.left = (25 + Math.random() * 50) + '%';
    m.style.setProperty('--drift', (Math.random() * 80 - 40) + 'px');
    m.style.animationDuration = (1 + Math.random()) + 's';
    m.style.animationDelay = (Math.random() * 0.9) + 's';
    parEl.appendChild(m);
  }

  // Faíscas quando a carta "pousa" (~0.5s após o feixe subir)
  clearTimeout(overlay._luSparkTimer);
  overlay._luSparkTimer = setTimeout(() => {
    for (let i = 0; i < 16; i++) {
      const s = document.createElement('div');
      s.className = 'lu-spark';
      const angle = Math.random() * 360;
      const dist  = 40 + Math.random() * 130;
      const sx = Math.round(Math.cos(angle * Math.PI / 180) * dist);
      const sy = Math.round(Math.sin(angle * Math.PI / 180) * dist);
      const size = 2 + Math.random() * 3;
      s.style.cssText = `left:50%; top:44%; width:${size}px; height:${size}px; --sx:${sx}px; --sy:${sy}px; animation-duration:${0.6+Math.random()*0.5}s;`;
      parEl.appendChild(s);
    }
  }, 480);

  // Toca o som
  playSfxLevelUp();
  // Vibração de celebração no level up
  if (CONFIG.vibration && navigator.vibrate) navigator.vibrate([80, 40, 80, 40, 120]);

  // Mostra overlay
  overlay.style.display = 'block';

  // Fecha após 3.2s (a carta leva ~1.05s pra revelar tudo, dá tempo de ler)
  clearTimeout(overlay._luTimer);
  overlay._luTimer = setTimeout(() => {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.4s';
    setTimeout(() => {
      overlay.style.display = 'none';
      overlay.style.opacity = '';
      overlay.style.transition = '';
    }, 420);
  }, 3200);
}

// ── Tela de Escolha de Habilidade — Paladino Level 5 ──
function showPaladinoLv5Choice() {
  const p = G.player;
  if (!p || p._pal_lv5_chosen) return; // já escolheu

  const overlay = document.createElement('div');
  overlay.id = 'pal-lv5-overlay';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:1200;
    background:rgba(0,0,0,0.88);
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    padding:20px;box-sizing:border-box;
    font-family:'Noto Serif JP',serif;
  `;

  overlay.innerHTML = `
    <div style="text-align:center;margin-bottom:18px;">
      <div style="font-size:0.65rem;letter-spacing:4px;color:#c8960a;margin-bottom:4px;">NÍVEL 5 · PALADINO</div>
      <div style="font-size:1.1rem;color:#f2e8d0;letter-spacing:2px;">Escolha sua Habilidade</div>
      <div style="font-size:0.6rem;color:rgba(242,232,208,0.45);margin-top:4px;font-style:italic;">Esta escolha é permanente e não pode ser desfeita.</div>
    </div>

    <div style="display:flex;gap:14px;width:100%;max-width:400px;">

      <!-- Julgamento Divino -->
      <div id="pal-choice-julgamento" onclick="confirmPaladinoLv5('julgamento_divino')" style="
        flex:1;border:1px solid rgba(200,150,10,0.4);border-radius:10px;
        background:rgba(20,15,5,0.85);padding:14px 10px;cursor:pointer;
        transition:border-color 0.2s,background 0.2s;text-align:center;
      ">
        <img src="Imagens/personagens/paladino/Picsart_26-06-29_03-23-29-931.png"
          onerror="this.style.display='none'"
          style="width:56px;height:56px;object-fit:contain;border-radius:8px;margin-bottom:8px;display:block;margin-left:auto;margin-right:auto;">
        <div style="font-size:0.75rem;color:#f0d890;letter-spacing:1px;margin-bottom:4px;">⚖️ Julgamento Divino</div>
        <div style="font-size:0.55rem;color:rgba(255,230,150,0.6);margin-bottom:6px;">Ativável · 100 AP</div>
        <div style="font-size:0.58rem;color:rgba(242,232,208,0.72);line-height:1.5;">
          Concentra toda sua defesa em um único golpe.<br>
          <b style="color:#f0d890;">Dano = 200% DEF + 120% ATQ</b><br>
          Após atacar: escudo +50% DEF por 2 turnos.
        </div>
      </div>

      <!-- Fé Absoluta -->
      <div id="pal-choice-fe" onclick="confirmPaladinoLv5('fe_absoluta')" style="
        flex:1;border:1px solid rgba(200,150,10,0.4);border-radius:10px;
        background:rgba(20,15,5,0.85);padding:14px 10px;cursor:pointer;
        transition:border-color 0.2s,background 0.2s;text-align:center;
      ">
        <img src="Imagens/personagens/paladino/Picsart_26-06-29_03-35-49-266.png"
          onerror="this.style.display='none'"
          style="width:56px;height:56px;object-fit:contain;border-radius:8px;margin-bottom:8px;display:block;margin-left:auto;margin-right:auto;">
        <div style="font-size:0.75rem;color:#f0d890;letter-spacing:1px;margin-bottom:4px;">🙏 Fé Absoluta</div>
        <div style="font-size:0.55rem;color:rgba(255,230,150,0.6);margin-bottom:6px;">Passiva · Sempre ativa</div>
        <div style="font-size:0.58rem;color:rgba(242,232,208,0.72);line-height:1.5;">
          Quanto menor seu HP, maior sua resistência.<br>
          <b style="color:#f0d890;">&lt;50% HP → -15% dano recebido</b><br>
          &lt;30% HP → -30% dano recebido<br>
          &lt;15% HP → próximo golpe +50% ATQ
        </div>
      </div>
    </div>
  `;

  // Hover
  overlay.addEventListener('mouseover', e => {
    const card = e.target.closest('[id^="pal-choice-"]');
    if (card) card.style.borderColor = '#c8960a';
  });
  overlay.addEventListener('mouseout', e => {
    const card = e.target.closest('[id^="pal-choice-"]');
    if (card) card.style.borderColor = 'rgba(200,150,10,0.4)';
  });

  document.body.appendChild(overlay);
}

function confirmPaladinoLv5(choiceKey) {
  const p = G.player;
  if (!p || p._pal_lv5_chosen) return;

  const overlay = document.getElementById('pal-lv5-overlay');

  if (choiceKey === 'julgamento_divino') {
    p._pal_lv5_chosen = 'julgamento_divino';
    // Adiciona a skill ativa ao array de skills do jogador
    const cls = window.CLASS_PALADINO;
    const sk = cls && cls.skills && cls.skills.find(s => s.key === 'julgamento_divino');
    if (sk && p.classData && p.classData.skills) {
      const jaExiste = p.classData.skills.some(s => s.key === 'julgamento_divino');
      if (!jaExiste) p.classData.skills.push(sk);
    }
    notify('⚖️ Julgamento Divino desbloqueado! Custo: 100 AP.', 'gold');
  } else {
    p._pal_lv5_chosen = 'fe_absoluta';
    notify('🙏 Fé Absoluta desbloqueada! A passiva está sempre ativa.', 'gold');
  }

  if (overlay) overlay.remove();
  saveGame();
  updateHUD();
  // Rebuild skill buttons se em batalha
  if (typeof buildSkillButtons === 'function') buildSkillButtons();
}

window.confirmPaladinoLv5 = confirmPaladinoLv5;

// ── Fallback de segurança: LEVEL_MAX/XP_BASE/XP_GROWTH vivem em talent_system.js.
//    Se por qualquer motivo esse arquivo não carregar (cache, 404, ordem dos
//    <script>), essas funções evitam que o level up quebre o jogo inteiro. ──
function _lvlMax()   { return (typeof LEVEL_MAX  !== 'undefined') ? LEVEL_MAX  : 20; }
function _xpBase()   { return (typeof XP_BASE    !== 'undefined') ? XP_BASE    : 100; }
function _xpGrowth() { return (typeof XP_GROWTH  !== 'undefined') ? XP_GROWTH  : 1.45; }

function checkLevelUp() {
  const p = G.player;
  while (p.xp >= p.xpNext && p.level < _lvlMax()) {
    p.xp    -= p.xpNext;
    p.level += 1;
    p.xpNext = Math.floor(_xpBase() * Math.pow(_xpGrowth(), p.level - 1));

    // Marcos do HuBi: cristais soltos de mana em Lv8/12/15.
    if (typeof hubiCheckCristalManaMarcos === 'function') hubiCheckCristalManaMarcos(p.level);

    const cls = p.classData;

    // ── Crescimento de stats por level — orientado por dados ──
    // Cada classe define seu próprio `growth` (ver class_paladino.js,
    // class_assassino.js, class_arqueiro.js, class_mago.js). Isso permite
    // curvas diferentes por papel (tanque, veloz, dps, caster) sem precisar
    // checar cls.id manualmente aqui. Fallback genérico para segurança
    // caso alguma classe futura não defina `growth`.
    const DEFAULT_GROWTH = { hp: 12, atk: 2, def: 1, spd: 1, mag: 0, mp: 0, ap: 5 };
    const g = (cls && cls.growth) ? cls.growth : DEFAULT_GROWTH;

    const hpGain = g.hp || 0;
    p.maxHp += hpGain;
    p.hp = Math.min(p.maxHp, p.hp + hpGain);

    if (cls) {
      p.atk += g.atk || 0;
      p.def += g.def || 0;
      p.spd += g.spd || 0;
      if (g.mag) {
        p.mag = (p.mag || 0) + g.mag;
      }
      if (g.mp) {
        p.maxMp = (p.maxMp || 0) + g.mp;
        p.mp = Math.min(p.maxMp, (p.mp || 0) + g.mp);
      }
      if (g.ap) {
        p.maxAp = Math.min(200, (p.maxAp || 100) + g.ap);
      }
    }

    // ── Pontos de Talento ──
    p.talentPtTotal = (p.talentPtTotal || 0) + PT_PER_LEVEL;
    const ptAvail = getAvailablePT();
    const isMago  = cls && cls.id === 'mago';

    updateHUD();

    // ── Mensagem detalhada (Mago não usa PT — visual omitido) ──
    const ptMsg = (!isMago && ptAvail > 0) ? ` · ${ptAvail} PT disponíveis!` : '';
    const extraParts = [];
    if (g.mag) extraParts.push(`MAG+${g.mag}`);
    if (g.mp)  extraParts.push(`MP+${g.mp}`);
    const levelStats = `HP+${g.hp||0}, ATQ+${g.atk||0}, DEF+${g.def||0}, VEL+${g.spd||0}${extraParts.length ? ' ' + extraParts.join(' ') : ''}`;
    notify(isMago ? `🌟 LEVEL UP! LV ${p.level}` : `🌟 LEVEL UP! LV ${p.level} — +2PT Talentos${ptMsg}`, 'gold');
    addLog(`🌟 LV ${p.level} — ${levelStats}${ptMsg}`, 'xp');
    showLevelUpOverlay(p.level, levelStats, ptMsg);

    // ── Milestones de nível ──
    if (p.level === 2 && !G.dogDefeated) {
      setTimeout(() => notify('⚠ 🌿 Tierra, o Guardião da Floresta, desperta...', 'red'), 1000);
    }
    if (p.level === 2 && cls && cls.id === 'mago') {
      setTimeout(() => notify('📜 Você recebeu o Pergaminho do Guia Elemental! Veja na Bolsa.', 'gold'), 2800);
    }
    if (p.level === 7) {
      setTimeout(() => notify('✦ TIER II desbloqueado! Novos talentos disponíveis!', 'gold'), 1200);
    }
    if (p.level === 14) {
      setTimeout(() => notify('✦✦ TIER III desbloqueado! Talentos de Maestria!', 'gold'), 1200);
    }

    // ── Level 5: Paladino escolhe skill exclusiva ──
    if (p.level === 5 && cls && cls.id === 'paladino' && !p._pal_lv5_chosen) {
      setTimeout(() => showPaladinoLv5Choice(), 2600);
    }
    if (p.level === _lvlMax()) {
      notify('👑 NÍVEL MÁXIMO ATINGIDO!', 'gold');
    }

    // ── Abre árvore de talentos automaticamente no 1º level up ──
    if (p.level === 2) {
      setTimeout(() => {
        // Não abrir talentTree dentro de dungeon para não interromper o fluxo
        const emDungeon = G.location && G.location.startsWith('dungeon-');
        if (!emDungeon && typeof openTalentTree === 'function') openTalentTree();
      }, 1800);
    }
  }

  // Se já no nível máximo, travamos o XP
  if (p.level >= _lvlMax()) {
    p.xp = p.xpNext;
  }

  if (window.QuestBoard) QuestBoard.onLevelChanged();
}

// ▶ Seção 16 — Bag (Bolsa), Runas, Lightbox movido para bag.js (era linhas 11520–13012 do palDinh.js original)

// ▶ Seções 17/18 — Notificações, log, acessibilidade e Custom Confirm movido para notificacoes.js (era linhas 13013–13159 do palDinh.js original)


// ─────────────────────────────────────────────────────────────
//  19. INICIALIZAÇÃO DA PÁGINA
// ─────────────────────────────────────────────────────────────
window.addEventListener('load', function () {
  AudioSys.init();
  _initTapSoundPool();

  // Som de toque: toca em qualquer clique em elemento interativo do jogo
  document.addEventListener('click', function(e) {
    if (CONFIG.tapSound === false) return;
    const el = e.target.closest('button, [onclick], .svp-marker, .choice-btn, .qb-slot-claim, a');
    if (!el) return;
    playTapSound();
  }, true);

  if (typeof window.villageGoTo === 'function' && !window._villageGoToWrapped) {
    window._villageGoToWrapped = true;
    const _origVillageGoTo = window.villageGoTo;
    window.villageGoTo = function(dest) {
      _origVillageGoTo(dest);
      const reallyOpened = dest === 'saida' || typeof isLocationOpen !== 'function' || isLocationOpen(dest);
      if (window.QuestBoard && reallyOpened) QuestBoard.onVisit(dest);
    };
  }

  // ── Restaurar preferências visuais ──
  const daltonico = localStorage.getItem('clivor_daltonico') === '1';
  if (daltonico) document.body.classList.add('daltonico');
  const dBtn = document.getElementById('cfg-daltonico');
  if (dBtn) { dBtn.textContent = daltonico ? 'Ligado' : 'Desligado'; if (daltonico) dBtn.classList.add('active'); }

  window._notifMuted = localStorage.getItem('clivor_notif_muted') === '1';
  const nBtn = document.getElementById('cfg-notif');
  if (nBtn) { nBtn.textContent = window._notifMuted ? 'Mudo' : 'Ligado'; nBtn.classList.toggle('active', !window._notifMuted); }

  // Verificar saves existentes
  for (let n = 1; n <= 4; n++) {
    if (localStorage.getItem('clivor_save_' + n)) {
      const btn = document.getElementById('btn-continuar-save');
      if (btn) btn.style.display = 'block';
      break;
    }
  }
});

// ─────────────────────────────────────────────────────────────
//  SISTEMA DE CONFIGURAÇÕES
// ─────────────────────────────────────────────────────────────
const CONFIG = {
  textSpeed:    'normal',   // slow | normal | fast
  battleSpeed:  'normal',
  fontSize:     100,
  brightness:   100,
  difficulty:   'normal',
  autoSave:     true,
  vibration:    true,
  animations:   true,
  boldText:     false,
  tapSound:     true,
  missoesTabAtiva: true,
};
// Multiplicadores de delay
const TEXT_SPEED_MAP   = { slow: 2.0, normal: 1.0, fast: 0.4 };
const BATTLE_SPEED_MAP = { slow: 1.8, normal: 1.0, fast: 0.5 };

// Aplica o multiplicador de "Velocidade de Batalha" (Config) a um delay em ms.
// Usado nos setTimeout que controlam o ritmo dos turnos (fim de turno,
// turno do inimigo, transição de vitória/derrota).
function battleDelay(ms) {
  const mult = BATTLE_SPEED_MAP[CONFIG.battleSpeed] || 1.0;
  return Math.max(50, Math.round(ms * mult));
}

function openConfig() {
  const ov = document.getElementById('config-overlay');
  if (!ov) return;
  ov.classList.add('active');
  // Música
  const vol = Math.round(AudioSys.volume * 100);
  const sv = document.getElementById('cfg-volume');
  if (sv) sv.value = vol;
  const svv = document.getElementById('cfg-volume-val');
  if (svv) svv.textContent = vol + '%';
  _cfgToggle('cfg-sound-on', 'cfg-sound-off', !AudioSys.muted);
  // SFX
  const sfxVol = Math.round(AudioSys.sfxVolume * 100);
  const ssfx = document.getElementById('cfg-sfx-volume');
  if (ssfx) ssfx.value = sfxVol;
  const ssfxv = document.getElementById('cfg-sfx-volume-val');
  if (ssfxv) ssfxv.textContent = sfxVol + '%';
  _cfgToggle('cfg-sfx-on', 'cfg-sfx-off', !AudioSys.sfxMuted);
  // Velocidade
  _cfgSetActive('cfg-txt', CONFIG.textSpeed);
  _cfgSetActive('cfg-bat', CONFIG.battleSpeed);
  // Layout
  const sfv = document.getElementById('cfg-font-val');
  if (sfv) sfv.textContent = (CONFIG.fontSize || 100) + '%';
  const sb = document.getElementById('cfg-brightness');
  if (sb) sb.value = CONFIG.brightness;
  const sbv = document.getElementById('cfg-bright-val');
  if (sbv) sbv.textContent = CONFIG.brightness + '%';
  // Dificuldade
  _cfgSetActive('cfg-dif', CONFIG.difficulty);
  // Toggles
  _cfgToggleSingle('cfg-autosave', CONFIG.autoSave);
  _cfgToggleSingle('cfg-vibration', CONFIG.vibration);
  _cfgToggleSingle('cfg-animations', CONFIG.animations);
  _cfgToggleSingle('cfg-tapsound', CONFIG.tapSound !== false);
  _cfgToggleSingle('cfg-missoes-tab', CONFIG.missoesTabAtiva !== false);
  // Negrito
  const boldBtn = document.getElementById('cfg-bold');
  if (boldBtn) { boldBtn.classList.toggle('active', !!CONFIG.boldText); boldBtn.textContent = CONFIG.boldText ? 'Ligado' : 'Desligado'; }
}

function closeConfig() {
  const ov = document.getElementById('config-overlay');
  if (ov) ov.classList.remove('active');
  localStorage.setItem('clivor_cfg', JSON.stringify(CONFIG));
  localStorage.setItem('clivor_volume', Math.round(AudioSys.volume * 100));
  localStorage.setItem('clivor_muted', AudioSys.muted ? '1' : '0');
  localStorage.setItem('clivor_sfx_volume', Math.round(AudioSys.sfxVolume * 100));
  localStorage.setItem('clivor_sfx_muted', AudioSys.sfxMuted ? '1' : '0');
}

function cfgUpdateVolume(val) {
  const v = parseInt(val);
  AudioSys.volume = v / 100;
  const vv = document.getElementById('cfg-volume-val');
  if (vv) vv.textContent = v + '%';
  // Aplicar ao track atual
  if (AudioSys.current && AudioSys.tracks[AudioSys.current]) {
    AudioSys.tracks[AudioSys.current].volume = AudioSys.muted ? 0 : AudioSys.volume;
  }
}

function cfgSetMute(muted) {
  AudioSys.muted = muted;
  Object.values(AudioSys.tracks).forEach(t => {
    if (t && !t.paused) t.volume = muted ? 0 : AudioSys.volume;
  });
  _cfgToggle('cfg-sound-on', 'cfg-sound-off', !muted);
}

function cfgSetTextSpeed(speed) {
  CONFIG.textSpeed = speed;
  _cfgSetActive('cfg-txt', speed);
  localStorage.setItem('clivor_cfg', JSON.stringify(CONFIG));
}

function cfgSetBattleSpeed(speed) {
  CONFIG.battleSpeed = speed;
  _cfgSetActive('cfg-bat', speed);
  localStorage.setItem('clivor_cfg', JSON.stringify(CONFIG));
}

function cfgUpdateFont(val) {
  CONFIG.fontSize = parseInt(val);
  document.body.style.fontSize = val + 'px';
  const fv = document.getElementById('cfg-font-val');
  if (fv) fv.textContent = val + 'px';
}

function cfgFontStep(delta) {
  const min = 80, max = 130; // zoom % em vez de px
  CONFIG.fontSize = Math.min(max, Math.max(min, (CONFIG.fontSize || 100) + delta * 5));
  document.body.style.zoom = CONFIG.fontSize + '%';
  const fv = document.getElementById('cfg-font-val');
  if (fv) fv.textContent = CONFIG.fontSize + '%';
  localStorage.setItem('clivor_cfg', JSON.stringify(CONFIG));
}

function cfgUpdateBrightness(val) {
  CONFIG.brightness = parseInt(val);
  const bw = document.getElementById('brightness-wrap');
  if (bw) bw.style.filter = 'brightness(' + val + '%)';
  const bv = document.getElementById('cfg-bright-val');
  if (bv) bv.textContent = val + '%';
}

function cfgGoToMenu() {
  showCustomConfirm('Salvar e voltar ao menu principal?', () => {
    manualSave();
    closeConfig();
    // Voltar para tela de intro/save
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const intro = document.getElementById('screen-intro');
    if (intro) intro.classList.add('active');
    AudioSys.play('intro');
  });
}

function cfgTrocarClasse() {
  showCustomConfirm(
    'Trocar de classe recomeça seu personagem do zero (nível, itens, missões) neste mesmo slot. O save atual será apagado. Deseja continuar?',
    () => {
      manualSave(); // guarda uma última cópia antes de zerar, por segurança
      localStorage.removeItem('clivor_save_' + G.saveSlot);
      closeConfig();
      // Vai direto pra tela de seleção de classe, sem recarregar a página.
      // A flag faz o jogo manter o nome atual (não pede de novo).
      window._clivorTrocaClasse = true;
      goToClassSelection();
    }
  );
}
window.cfgTrocarClasse = cfgTrocarClasse;

function cfgResetConfirm() {
  showCustomConfirm(
    'Reiniciar a partida? Todo o progresso será perdido!',
    () => {
      showCustomConfirm(
        'Tem certeza? Esta ação não pode ser desfeita!',
        () => {
          localStorage.removeItem('clivor_save_' + G.saveSlot);
          location.reload();
        },
        null
      );
    },
    null
  );
}

function cfgUpdateSfxVolume(val) {
  const v = parseInt(val);
  AudioSys.sfxVolume = v / 100;
  const vv = document.getElementById('cfg-sfx-volume-val');
  if (vv) vv.textContent = v + '%';
}

function cfgSetSfxMute(muted) {
  AudioSys.sfxMuted = muted;
  _cfgToggle('cfg-sfx-on', 'cfg-sfx-off', !muted);
}

function cfgSetDifficulty(diff) {
  CONFIG.difficulty = diff;
  _cfgSetActive('cfg-dif', diff);
  // Aplica multiplicador de dano dos inimigos
  const map = { easy: 0.65, normal: 1.0, hard: 1.5 };
  window._diffMult = map[diff] || 1.0;
  localStorage.setItem('clivor_cfg', JSON.stringify(CONFIG));
}

function cfgToggleAutoSave() {
  CONFIG.autoSave = !CONFIG.autoSave;
  const el = document.getElementById('cfg-autosave');
  if (el) { el.classList.toggle('active', CONFIG.autoSave); el.textContent = CONFIG.autoSave ? 'Ligado' : 'Desligado'; }
  localStorage.setItem('clivor_cfg', JSON.stringify(CONFIG));
}

function cfgToggleVibration() {
  CONFIG.vibration = !CONFIG.vibration;
  const el = document.getElementById('cfg-vibration');
  if (el) { el.classList.toggle('active', CONFIG.vibration); el.textContent = CONFIG.vibration ? 'Ligado' : 'Desligado'; }
  localStorage.setItem('clivor_cfg', JSON.stringify(CONFIG));
}

function cfgToggleAnimations() {
  CONFIG.animations = !CONFIG.animations;
  const el = document.getElementById('cfg-animations');
  if (el) { el.classList.toggle('active', CONFIG.animations); el.textContent = CONFIG.animations ? 'Ligado' : 'Desligado'; }
  localStorage.setItem('clivor_cfg', JSON.stringify(CONFIG));
}

function cfgToggleTapSound() {
  CONFIG.tapSound = !CONFIG.tapSound;
  const el = document.getElementById('cfg-tapsound');
  if (el) { el.classList.toggle('active', CONFIG.tapSound); el.textContent = CONFIG.tapSound ? 'Ligado' : 'Desligado'; }
  localStorage.setItem('clivor_cfg', JSON.stringify(CONFIG));
}

function cfgToggleMissoesTab() {
  CONFIG.missoesTabAtiva = CONFIG.missoesTabAtiva === false ? true : false;
  const el = document.getElementById('cfg-missoes-tab');
  if (el) { el.classList.toggle('active', CONFIG.missoesTabAtiva); el.textContent = CONFIG.missoesTabAtiva ? 'Ligado' : 'Desligado'; }
  localStorage.setItem('clivor_cfg', JSON.stringify(CONFIG));
  // Aplica na hora, sem precisar fechar o Config
  if (typeof missoeVerificarVisibilidade === 'function') missoeVerificarVisibilidade();
}

function cfgToggleBold() {
  CONFIG.boldText = !CONFIG.boldText;
  document.body.classList.toggle('bold-mode', CONFIG.boldText);
  const el = document.getElementById('cfg-bold');
  if (el) { el.classList.toggle('active', CONFIG.boldText); el.textContent = CONFIG.boldText ? 'Ligado' : 'Desligado'; }
  localStorage.setItem('clivor_cfg', JSON.stringify(CONFIG));
}

// Helpers internos
function _cfgToggle(idOn, idOff, isOn) {
  const on = document.getElementById(idOn);
  const off = document.getElementById(idOff);
  if (on)  on.classList.toggle('active', isOn);
  if (off) off.classList.toggle('active', !isOn);
}
function _cfgToggleSingle(id, isOn) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('active', isOn);
}
function _cfgSetActive(prefix, val) {
  // Suporta velocidade (slow/normal/fast) e dificuldade (easy/normal/hard)
  ['slow','normal','fast','easy','hard'].forEach(s => {
    const el = document.getElementById(prefix + '-' + s);
    if (el) el.classList.toggle('active', s === val);
  });
}

// Carregar config salva
(function() {
  // Garante _diffMult padrão
  window._diffMult = 1.0;
  try {
    const saved = localStorage.getItem('clivor_cfg');
    if (saved) {
      const c = JSON.parse(saved);
      Object.assign(CONFIG, c);
      if (CONFIG.fontSize && CONFIG.fontSize !== 100) {
        // Guarda contra valores antigos em px (≤30 = era px, não %)
        if (CONFIG.fontSize <= 30) CONFIG.fontSize = 100;
        document.body.style.zoom = CONFIG.fontSize + '%';
      }
      if (CONFIG.brightness !== 100) {
        const bw = document.getElementById('brightness-wrap');
        if (bw) bw.style.filter = 'brightness(' + CONFIG.brightness + '%)';
      }
      if (CONFIG.boldText) document.body.classList.add('bold-mode');
      // Aplica dificuldade salva
      const diffMap = { easy: 0.65, normal: 1.0, hard: 1.5 };
      window._diffMult = diffMap[CONFIG.difficulty] || 1.0;
    }
  } catch(e) {}
})();

// ── Efeito visual Escudo Divino ──
function _showBuffPanel(id, imgSrc, label) {
  const panel = document.getElementById('skill-buff-panel');
  if (!panel) return;
  // Evita duplicar
  if (document.getElementById('buff-' + id)) return;
  const entry = document.createElement('div');
  entry.className = 'buff-entry';
  entry.id = 'buff-' + id;
  entry.innerHTML = `<img src="${imgSrc}" alt="" onerror="this.onerror=null;this.src='data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%2748%27 height=%2748%27><text x=%2750%25%27 y=%2754%25%27 font-size=%2728%27 text-anchor=%27middle%27 dominant-baseline=%27middle%27>✨</text></svg>'"><div class="buff-label">${label}</div>`;
  panel.appendChild(entry);
  // trigger animação de entrada
  void entry.offsetWidth;
  entry.classList.add('visible');
}
function _hideBuffPanel(id) {
  const entry = document.getElementById('buff-' + id);
  if (!entry) return;
  entry.classList.remove('visible');
  setTimeout(() => { if (entry.parentNode) entry.parentNode.removeChild(entry); }, 350);
}

// ── Efeito visual — Golpe Sagrado (Paladino): Selo do Julgamento no card do inimigo ──
function showGolpeSagradoEffect() {
  const el    = document.getElementById('golpe-sagrado-selo');
  const burst = document.getElementById('golpe-sagrado-burst');
  const rays  = document.getElementById('golpe-sagrado-rays');
  const flash = document.getElementById('golpe-sagrado-flash');
  const icon  = document.getElementById('bat-enemy-icon');
  if (!el) return;

  // Selo principal
  el.style.display = 'block';
  el.classList.remove('active');
  void el.offsetWidth; // força reflow pra reiniciar a animação mesmo em uso repetido
  el.classList.add('active');

  // Raios girando atrás do selo
  if (rays) {
    rays.style.display = 'block';
    rays.classList.remove('active');
    void rays.offsetWidth;
    rays.classList.add('active');
  }

  // Estouro de luz no impacto
  if (burst) {
    burst.style.display = 'block';
    burst.classList.remove('active');
    void burst.offsetWidth;
    burst.classList.add('active');
  }

  // Flash dourado na tela
  if (flash) {
    flash.style.display = 'block';
    flash.classList.remove('active');
    void flash.offsetWidth;
    flash.classList.add('active');
  }

  // Tremida de impacto no ícone do inimigo
  if (icon) {
    icon.classList.remove('golpe-sagrado-hit-shake');
    void icon.offsetWidth;
    icon.classList.add('golpe-sagrado-hit-shake');
  }

  setTimeout(() => {
    el.classList.remove('active');
    el.style.display = 'none';
    if (rays)  { rays.classList.remove('active');  rays.style.display  = 'none'; }
    if (burst) { burst.classList.remove('active'); burst.style.display = 'none'; }
    if (flash) { flash.classList.remove('active'); flash.style.display = 'none'; }
  }, 1200);
}

// ── Escudo Divino (Paladino) — orbe cobrindo o personagem inteiro ──
// Frame 1: cheio (escudodivivi.png) · Frame 2: 50%, rachando (escudoDivi.png)
// Frame 3: explodindo (escudodiv.png). Dura 3 turnos (ver tickPlayerStatusEffects).
const PAL_ESCUDO_FRAMES = {
  full:  'Imagens/personagens/paladino/escudodivivi.png',
  crack: 'Imagens/personagens/paladino/escudoDivi.png',
  burst: 'Imagens/personagens/paladino/escudodiv.png',
};

function showPalEscudoOrb() {
  const el = document.getElementById('pal-escudo-orb');
  if (!el) return;
  el.classList.remove('exploding', 'stage2');
  el.style.transition = '';
  el.style.opacity = '';
  el.style.transform = '';
  el.src = PAL_ESCUDO_FRAMES.full;
  el.style.display = 'block';
  void el.offsetWidth;
  el.classList.add('active');
}

// Chamada quando resta 1 turno de escudo — crossfade suave pro frame de
// 50% (rachando, se preparando pra explodir).
function updatePalEscudoOrbStage(turnsLeft) {
  const el = document.getElementById('pal-escudo-orb');
  if (!el || el.style.display === 'none') return;
  el.style.transition = 'opacity 0.28s ease';
  el.style.opacity = '0';
  setTimeout(() => {
    if (!el || el.style.display === 'none') return;
    el.src = PAL_ESCUDO_FRAMES.crack;
    el.classList.add('stage2');
    el.style.opacity = '1';
  }, 280);
}

// Explosão final: troca pro frame de estilhaços, dá um "estouro" visual
// (escala + brilho) e some.
function explodePalEscudoOrb() {
  const el = document.getElementById('pal-escudo-orb');
  if (!el || el.style.display === 'none') return;
  el.src = PAL_ESCUDO_FRAMES.burst;
  el.classList.remove('active', 'stage2');
  el.style.transition = '';
  el.style.opacity = '1';
  el.style.transform = '';
  void el.offsetWidth;
  el.classList.add('exploding');
  setTimeout(() => {
    if (!el) return;
    el.style.display = 'none';
    el.classList.remove('exploding');
    el.style.transition = '';
    el.style.transform = '';
    el.style.opacity = '';
  }, 550);
}

function showShieldEffect() {
  // Troca o frame do Paladino pro pose de escudo (paladinoEscuderooo.png)
  // e volta pro idle sozinho — vale pra qualquer skill de escudo.
  const cls = G.player && G.player.classData;
  const isPaladino = cls && cls.id === 'paladino';
  if (typeof setHeroAnim === 'function' && isPaladino) {
    setHeroAnim('shield', 900);
  }

  if (isPaladino) {
    // Novo visual: orbe cobrindo o personagem inteiro, com frames que
    // degradam ao longo de 3 turnos, em vez do ícone amarelo pequeno.
    showPalEscudoOrb();
  } else {
    const el = document.getElementById('shield-effect');
    if (el) {
      el.style.display = 'block';
      el.style.opacity = '0';
      el.style.transform = 'scale(0) rotate(-20deg)';
      el.style.transition = 'none';
      el.style.filter = 'drop-shadow(0 0 14px rgba(200,160,10,1))';
      void el.offsetWidth;
      el.style.transition = 'transform 0.4s cubic-bezier(0.175,0.885,0.32,1.275), opacity 0.3s ease';
      el.style.transform = 'scale(1.1) rotate(0deg)';
      el.style.opacity = '1';
      setTimeout(() => {
        if (!el) return;
        el.style.transform = 'scale(1) rotate(0deg)';
        el.classList.add('active');
      }, 400);
    }
  }
  // Mostra também no painel de buffs lateral
  _showBuffPanel('escudo-divino', 'Imagens/icones/EscudoDivin.png', 'Escudo\nDivino');
}

function hideShieldEffect() {
  const cls = G.player && G.player.classData;
  if (cls && cls.id === 'paladino') {
    explodePalEscudoOrb();
  } else {
    const el = document.getElementById('shield-effect');
    if (el) {
      el.classList.remove('active');
      el.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
      el.style.transform = 'scale(0.3)';
      el.style.opacity = '0';
      setTimeout(() => {
        el.style.display = 'none';
        el.style.transform = '';
        el.style.opacity = '';
        el.style.transition = '';
        el.classList.remove('active');
      }, 300);
    }
  }
  // Remove do painel de buffs lateral
  _hideBuffPanel('escudo-divino');
}

// ═══════════════════════════════════════════════
// ── SISTEMA DE FLECHAS ESPECIAIS ──
// ═══════════════════════════════════════════════

function _updateArrowBtnLabel() {
  const btn = document.getElementById('btn-trocar-flecha');
  if (!btn) return;
  const p = G.player;
  if (!p.classData || p.classData.id !== 'arqueiro') { btn.style.display='none'; return; }
  const arrowId = p.equippedArrow || 'normal';
  const arrow = (typeof getArrowType === 'function') ? getArrowType(arrowId) : { icon:'🏹', name:'Normal' };
  btn.textContent = arrow.icon + ' ' + arrow.name;
}
window._updateArrowBtnLabel = _updateArrowBtnLabel;

function openBattleArrowMenu() {
  const old = document.getElementById('popup-arrow-menu');
  if (old) old.remove();

  const arrows = (typeof ARROW_TYPES !== 'undefined') ? ARROW_TYPES : [];
  const p = G.player;
  const equipped = p.equippedArrow || 'normal';

  const popup = document.createElement('div');
  popup.id = 'popup-arrow-menu';
  popup.style.cssText = `
    position:fixed; inset:0; z-index:800;
    background:rgba(0,0,0,0.82);
    display:flex; align-items:flex-end; justify-content:center;
  `;

  let html = `
    <div style="width:100%;max-width:480px;background:rgba(14,8,2,0.99);border:1px solid rgba(160,192,64,0.3);border-bottom:none;padding:18px 16px 28px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
        <div style="font-size:0.7rem;letter-spacing:3px;color:rgba(160,192,64,0.7);font-family:'Noto Sans JP',sans-serif;">🏹 TROCAR FLECHA</div>
        <button onclick="document.getElementById('popup-arrow-menu').remove()" style="background:none;border:none;color:rgba(200,150,10,0.5);font-size:1rem;cursor:pointer;">✕</button>
      </div>
      <div style="font-size:0.58rem;color:rgba(200,220,100,0.4);font-style:italic;margin-bottom:14px;">Trocar flecha consome seu turno. Flecha Normal libera as habilidades.</div>
  `;

  arrows.forEach(a => {
    const isEq = a.id === equipped;
    html += `
      <div onclick="selectBattleArrow('${a.id}')" style="
        display:flex;align-items:center;gap:12px;padding:11px 13px;
        border:1px solid ${isEq ? 'rgba(160,192,64,0.6)' : 'rgba(160,192,64,0.12)'};
        background:${isEq ? 'rgba(160,192,64,0.1)' : 'rgba(160,192,64,0.02)'};
        margin-bottom:6px;cursor:pointer;transition:all 0.15s;
      ">
        <span style="font-size:1.8rem;min-width:36px;text-align:center;">${a.imgSrc ? `<img src="${a.imgSrc}" style="width:38px;height:38px;object-fit:contain;vertical-align:middle;" onerror="this.outerHTML='${a.icon}'">` : a.icon}</span>
        <div style="flex:1;">
          <div style="font-size:0.78rem;color:${a.color};font-family:'Noto Serif JP',serif;">${a.name}${isEq?' <span style="font-size:0.55rem;color:rgba(160,192,64,0.6);margin-left:6px;">EQUIPADA</span>':''}</div>
          <div style="font-size:0.58rem;color:rgba(200,220,100,0.45);margin-top:3px;line-height:1.5;">${a.efeito}</div>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  popup.innerHTML = html;
  document.body.appendChild(popup);
}
window.openBattleArrowMenu = openBattleArrowMenu;

function selectBattleArrow(arrowId) {
  const popup = document.getElementById('popup-arrow-menu');
  if (popup) popup.remove();

  const p = G.player;
  const oldId = p.equippedArrow || 'normal';
  if (oldId === arrowId) {
    // mesma flecha — não consome turno
    return;
  }

  p.equippedArrow = arrowId;
  const arrow = (typeof getArrowType === 'function') ? getArrowType(arrowId) : { name: arrowId, icon: '🏹' };

  // Flecha Negra: perde 10% HP ao equipar
  if (arrowId === 'negra') {
    const hpCost = Math.ceil(p.maxHp * 0.10);
    p.hp = Math.max(1, p.hp - hpCost);
    appendBattleLog(`🖤 Flecha Negra equipada! Você perde ${hpCost} HP.`, '#c060c0');
    battleState._arrowNegraTurns = 0;
    updateBattleHUD();
  }

  // Resetar contador de turno ao trocar
  battleState._arrowTurnCounter = 0;
  battleState._arrowNegraStack = 0;

  appendBattleLog(`🏹 Flecha trocada para ${arrow.icon} ${arrow.name}. Turno gasto.`, '#a0c040');

  // Bloquear/liberar habilidades
  _updateSkillBlockByArrow(arrowId);
  _updateArrowBtnLabel();

  // Consome o turno — passa para o inimigo
  const bs = battleState;
  const p2 = G.player;
  const e2 = bs.enemyData;
  bs.phase = 'enemy';
  setBattleButtons(false);
  setTimeout(() => runEnemyTurn(bs, p2, e2, false), battleDelay(700));
}
window.selectBattleArrow = selectBattleArrow;

function _updateSkillBlockByArrow(arrowId) {
  const arrow = (typeof getArrowType === 'function') ? getArrowType(arrowId) : null;
  const skillsAllowed = !arrow || arrow.skillsAllowed !== false;
  const skillBtns = document.querySelectorAll('.skill-battle-btn');
  skillBtns.forEach(btn => {
    if (!skillsAllowed) {
      btn.disabled = true;
      btn.style.opacity = '0.25';
      btn.title = 'Troque para Flecha Normal para usar habilidades';
    } else {
      btn.style.opacity = '';
      btn.title = '';
    }
  });
}
window._updateSkillBlockByArrow = _updateSkillBlockByArrow;

// ── Aba de Flechas na Bolsa ──
function buildArrowBagTab() {
  const arrows = (typeof ARROW_TYPES !== 'undefined') ? ARROW_TYPES : [];
  const p = G.player;
  const equipped = p.equippedArrow || 'normal';
  const eqArrow = arrows.find(a => a.id === equipped) || arrows[0];

  // Slot equipada
  const eqEl = document.getElementById('arrow-equipped-display');
  if (eqEl) {
    eqEl.innerHTML = `
      <div class="arrow-equipped-slot">
        <div class="arrow-slot-icon">${eqArrow.imgSrc ? `<img src="${eqArrow.imgSrc}" style="width:48px;height:48px;object-fit:contain;filter:drop-shadow(0 0 6px rgba(160,192,64,0.5));" onerror="this.outerHTML='${eqArrow.icon}'">` : eqArrow.icon}</div>
        <div class="arrow-slot-info">
          <div class="arrow-slot-name">${eqArrow.name}</div>
          <div class="arrow-slot-desc">${eqArrow.desc}</div>
          <div class="arrow-slot-badge">${eqArrow.skillsAllowed ? '✓ HABILIDADES LIBERADAS' : '✗ HABILIDADES BLOQUEADAS'}</div>
        </div>
      </div>
    `;
  }

  // Lista de flechas
  const listEl = document.getElementById('arrow-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  arrows.forEach(a => {
    const isEq = a.id === equipped;
    const card = document.createElement('div');
    card.className = 'arrow-card' + (isEq ? ' equipped' : '');
    card.innerHTML = `
      <div class="arrow-card-icon">${a.imgSrc ? `<img src="${a.imgSrc}" style="width:42px;height:42px;object-fit:contain;filter:drop-shadow(0 0 5px rgba(160,192,64,0.4));" onerror="this.outerHTML='${a.icon}'">` : a.icon}</div>
      <div style="flex:1;">
        <div class="arrow-card-name">${a.name}</div>
        <div class="arrow-card-desc">${a.desc}</div>
      </div>
      <div class="arrow-card-eq">${isEq ? '✓' : ''}</div>
    `;
    card.onclick = () => {
      p.equippedArrow = a.id;
      if (a.id === 'negra' && !isEq) {
        const cost = Math.ceil(p.maxHp * 0.10);
        p.hp = Math.max(1, p.hp - cost);
        notify(`🖤 Flecha Negra equipada! -${cost} HP`, '#c060c0');
        updateHUD();
      }
      _updateArrowBtnLabel();
      _updateSkillBlockByArrow(a.id);
      notify(`🏹 ${a.name} equipada!`, '#a0c040');
      buildArrowBagTab();
    };
    listEl.appendChild(card);
  });
}
window.buildArrowBagTab = buildArrowBagTab;

// ── Mostrar aba flechas só para arqueiro ──
const _origOpenBag = window.openBag;
window.openBag = function() {
  if (typeof _origOpenBag === 'function') _origOpenBag();
  const p = G.player;
  const isArcher = p.classData && p.classData.id === 'arqueiro';
  const tabBtn = document.getElementById('btab-flechas');
  if (tabBtn) tabBtn.style.display = isArcher ? '' : 'none';
  if (isArcher) buildArrowBagTab();
  const totemTabBtn = document.getElementById('btab-totens');
  if (totemTabBtn) totemTabBtn.style.display = isArcher ? '' : 'none';
  if (isArcher && typeof buildTotemBagTab === 'function') buildTotemBagTab();
};

// ── Aplicar bloqueio de skills quando entra em batalha ──
const _origBuildSkillList = window.buildSkillList;
window.buildSkillList = function() {
  if (typeof _origBuildSkillList === 'function') _origBuildSkillList();
  const p = G.player;
  if (p.classData && p.classData.id === 'arqueiro') {
    _updateSkillBlockByArrow(p.equippedArrow || 'normal');
  }
};

// ══════════════════════════════════════════════════════════════
//  GUIA ELEMENTAL — Animação de Pergaminho
// ══════════════════════════════════════════════════════════════
function abrirGuiaElemental() {
  const overlay = document.getElementById('guia-elemental-overlay');
  const wrapper = document.getElementById('guia-tabela-wrapper');
  if (!overlay || !wrapper) return;

  // Abre o overlay
  overlay.style.display = 'flex';
  wrapper.style.maxWidth = '';

  const aplicarAltura = (img) => {
    const larguraWrapper = wrapper.clientWidth || 1;
    const aspecto = img.naturalHeight / img.naturalWidth; // altura por unidade de largura
    let alturaAlvo = larguraWrapper * aspecto;
    const alturaMaxDisponivel = window.innerHeight * 0.62;
    if (alturaAlvo > alturaMaxDisponivel) {
      // A imagem não cabe inteira nessa largura: reduz a largura proporcionalmente
      // para que a imagem inteira (sem cortes) caiba na altura disponível.
      wrapper.style.maxWidth = (alturaMaxDisponivel / aspecto) + 'px';
      alturaAlvo = alturaMaxDisponivel;
    }
    wrapper.style.maxHeight = alturaAlvo + 'px';
  };

  // Pequeno delay para o CSS de transição pegar
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const img = wrapper.querySelector('img');
      if (!img) { wrapper.style.maxHeight = '500px'; return; }
      if (img.complete && img.naturalWidth) {
        aplicarAltura(img);
      } else {
        img.onload = () => aplicarAltura(img);
      }
    });
  });
}

function fecharGuiaElemental() {
  const overlay = document.getElementById('guia-elemental-overlay');
  const wrapper = document.getElementById('guia-tabela-wrapper');
  if (!overlay || !wrapper) return;

  // Fecha enrolando
  wrapper.style.maxHeight = '0';
  setTimeout(() => { overlay.style.display = 'none'; }, 600);
}

window.abrirGuiaElemental = abrirGuiaElemental;
window.fecharGuiaElemental = fecharGuiaElemental;

// ══════════════════════════════════════════════════════════════
//  LIVRO DE FUSÕES (Mago) — registro de todas as fusões conhecidas
//  Reaproveita os dados de FUSAO_DISPLAY (a mesma fonte usada pelo
//  menu de fusão em batalha), mas mostra TODAS as fusões como
//  referência/enciclopédia — sem checar MP nem elementos equipados,
//  só o bloqueio por nível (levelRequired).
// ══════════════════════════════════════════════════════════════
function abrirLivroMago() {
  const overlay = document.getElementById('livro-mago-overlay');
  const list = document.getElementById('livro-mago-list');
  if (!overlay || !list) return;

  const elemNomes = {
    fogo:'Fogo 🔥', agua:'Água 💧', eletrico:'Elétrico ⚡',
    gelo:'Gelo ❄️', planta:'Planta 🌿', terra:'Terra 🪨',
    energia:'Energia ✨', magia_negra:'Magia Negra 🌑',
    vento:'Vento 🌪️', caos:'Caos 🌀', veneno:'Veneno ☠️', luz:'Luz ☀️'
  };
  const lvAtual = (G.player && G.player.level) || 1;

  list.innerHTML = '';
  list.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px;padding-top:2px;';

  const entradas = Object.values(FUSAO_DISPLAY || {});
  if (entradas.length === 0) {
    list.style.display = 'block';
    list.innerHTML = '<div style="color:rgba(242,232,208,0.3);font-size:0.7rem;text-align:center;padding:16px;">Nenhuma fusão registrada.</div>';
  } else {
    entradas.forEach(f => {
      const lvReq = f.levelRequired || 1;
      const bloqueada = lvAtual < lvReq;
      const card = document.createElement('div');

      if (bloqueada) {
        card.style.cssText = `
          display:flex;flex-direction:column;align-items:center;gap:6px;
          padding:12px 10px;
          background:rgba(0,0,0,0.3);
          border:1px solid rgba(255,255,255,0.08);
          border-radius:10px;
          opacity:0.4;
          text-align:center;
        `;
        card.innerHTML = `
          <span style="font-size:1.6rem;">🔒</span>
          <div style="font-family:'Noto Serif JP',serif;font-size:0.8rem;color:rgba(200,150,10,0.45);">???</div>
          <div style="font-size:0.56rem;color:rgba(242,232,208,0.28);font-family:'Noto Sans JP',sans-serif;">Desbloqueado no LV ${lvReq}</div>
        `;
      } else {
        card.style.cssText = `
          display:flex;flex-direction:column;align-items:center;gap:6px;
          padding:12px 10px;
          background:rgba(255,255,255,0.03);
          border:1px solid rgba(200,150,10,0.3);
          border-radius:10px;
          box-shadow:inset 0 0 0 1px ${f.cor}33;
          text-align:center;
        `;
        card.innerHTML = `
          <span style="font-size:1.6rem;">${f.icon}</span>
          <div style="font-family:'Noto Serif JP',serif;font-size:0.8rem;color:${f.cor};">${f.nome}</div>
          <div style="font-size:0.56rem;color:rgba(242,232,208,0.45);font-family:'Noto Sans JP',sans-serif;">${f.desc}</div>
          <div style="font-size:0.55rem;color:rgba(200,150,10,0.55);font-family:'Noto Sans JP',sans-serif;">
            ${elemNomes[f.elem1] || f.elem1} + ${elemNomes[f.elem2] || f.elem2}
          </div>
        `;
      }
      list.appendChild(card);
    });
  }

  overlay.style.display = 'flex';
}

function fecharLivroMago() {
  const overlay = document.getElementById('livro-mago-overlay');
  if (overlay) overlay.style.display = 'none';
}

window.abrirLivroMago = abrirLivroMago;
window.fecharLivroMago = fecharLivroMago;

// ─────────────────────────────────────────────────────────────
//  FINALIZAÇÃO DE TURNO ASSÍNCRONO
//  Chamado por skills que abrem popup antes de concluir o turno
//  (ex: Selo Invertido do Mago)
// ─────────────────────────────────────────────────────────────
window._finalizarTurnoAssincrono = function(bs, playerActedFlag) {
  const p = G.player;
  const e = bs.enemyData || null;

  updateHUD();
  buildSkillList();

  if (!playerActedFlag) {
    // Turno abortado (cancelou) — devolve controle ao jogador
    bs.phase = 'player';
    setBattleButtons(true);
    updateBattleHUD();
    updateBattleTurnIndicator('player');
    return;
  }

  // Ticks de status do inimigo
  if (e) tickEnemyStatusEffects(bs, e);

  updateBattleHUD();
  buildSkillList();

  // Verifica morte do inimigo
  if (bs.enemyHp <= 0) {
    bs.phase = 'resolving';
    setTimeout(() => endBattle(true, false), battleDelay(400));
    return;
  }

  // Turno do inimigo
  bs.phase = 'enemy';
  updateBattleTurnIndicator('enemy');
  setBattleButtons(false);
  setTimeout(() => runEnemyTurn(bs, p, e, false), battleDelay(BATTLE_CONFIG.ENEMY_TURN_DELAY || 800));
};

// ══════════════════════════════════════════════════════════════
//  LIVRO DA MANA (Mago) — item único com encaixes de cristal.
//  O livro vem com o Cristal Lv1 já encaixado (dado no evento de
//  HuBi Lv5). Os cristais Lv2/Lv3/Lv4 são entregues pelo HuBi
//  quando o JOGADOR atinge Level 8 / 12 / 15, e precisam ser
//  encaixados manualmente pelo jogador no popup do livro — o
//  encaixe consome o cristal em definitivo.
// ══════════════════════════════════════════════════════════════

// Cada entrada = 1 socket físico numa página do livro.
// pageImg é a arte da página (spread com moldura), slotOffset
// posiciona o quadrado do encaixe dentro da imagem em % (ajustável
// se a arte mudar). pageImg repetido = mesma página com 2 encaixes.
const LIVRO_MANA_SOCKETS = [
  { level: 1, pct: 0.01, pageImg: 'Imagens/personagens/mago/ícones Hab/pag1.png', slotLeft: '60%', slotTop: '25%' },
  { level: 2, pct: 0.06, pageImg: 'Imagens/personagens/mago/ícones Hab/pag2.png', slotLeft: '24%', slotTop: '22%' },
  { level: 3, pct: 0.12, pageImg: 'Imagens/personagens/mago/ícones Hab/pag2.png', slotLeft: '74%', slotTop: '22%' },
  { level: 4, pct: 0.20, pageImg: 'Imagens/personagens/mago/ícones Hab/pag3.png', slotLeft: '74%', slotTop: '22%' },
];
const LIVRO_MANA_CAPA = 'Imagens/personagens/mago/ícones Hab/caftu.png';

// Os 4 cristais de mana — cor escalando de terroso (Lv1) a
// luminoso/azulado (Lv4), acompanhando a cor da mana no HUD.
const CRISTAL_MANA_DB = {
  1: { id: 'cristal_mana_lv1', name: 'Cristal de Mana I',   img: 'Imagens/icones/ver.png', pct: 0.01,
    historia: 'HuBi achou essa pedra no primeiro dia, perto da fogueira onde vocês dois dormiram com fome. Pedra pequena, poder pequeno... mas HuBi guardou porque ela lembra HuBi de um coração batendo: bate devagar, mas bate sempre. Por isso ela devolve só um pouquinho de mana a cada golpe — devagarzinho, feito o primeiro fôlego depois de acordar.' }, // jaspe vermelho
  2: { id: 'cristal_mana_lv2', name: 'Cristal de Mana II',  img: 'Imagens/icones/tig.png', pct: 0.06,
    historia: 'Essa, HuBi encontrou nos olhos de uma fera que não quis brigar. Ela olhou pra HuBi, HuBi olhou pra ela, e ninguém atacou. A pedra ficou com o brilho daquele olhar. Por isso ela puxa mana de volta quando você golpeia: o olho vê a abertura antes de você, e a magia volta rápido pra sua mão.' }, // olho de tigre
  3: { id: 'cristal_mana_lv3', name: 'Cristal de Mana III', img: 'Imagens/icones/am.png',  pct: 0.12,
    historia: 'Ametista veio de dentro da montanha, onde HuBi ficou preso sozinho três dias, há muito tempo, antes de te conhecer. Roxa, fria, mas quieta — feito o silêncio que ensina a esperar. HuBi aprendeu lá que mana também precisa de silêncio pra voltar. Por isso essa pedra devolve tanto: ela carrega a paciência de quem já ficou perdido e voltou.' }, // ametista
  4: { id: 'cristal_mana_lv4', name: 'Cristal de Mana IV',  img: 'Imagens/icones/lu.png',  pct: 0.20,
    historia: 'Essa, HuBi não achou. Essa foi dada — por alguém que HuBi não fala o nome, mas que confiava em você antes mesmo de te conhecer direito. Pedra da lua só brilha à noite, mas dentro do livro ela nunca dorme. Ela é a mais forte porque carrega a mesma coisa que faz HuBi te curar sem pedir nada: cuidado que não cansa. Por isso, a cada golpe seu, ela devolve um quinto da sua mana — de coração aberto, feito a lua que sempre volta.' }, // pedra da lua
};

// Garante que nenhum cristal já encaixado no livro continue duplicado
// solto na bolsa — o cristal "mora" só no livro depois de encaixado.
function livroManaLimparInventario(p) {
  p = p || G.player;
  const livro = p.inventory.find(i => i.id === 'livro_mana');
  if (!livro || !livro.cristaisEncaixados) return;
  let mudou = false;
  LIVRO_MANA_SOCKETS.forEach(s => {
    if (!livro.cristaisEncaixados[s.level]) return;
    const cristalDef = CRISTAL_MANA_DB[s.level];
    const idx = p.inventory.findIndex(i => i.id === cristalDef.id);
    if (idx !== -1) { p.inventory.splice(idx, 1); mudou = true; }
  });
  if (mudou && document.getElementById('bag-item-list')) buildBagItems();
}
window.livroManaLimparInventario = livroManaLimparInventario;

// Dá um cristal solto (level 2/3/4) ao inventário — chame nos
// marcos de level do jogador (Level 8 / 12 / 15).
function giveCristalMana(level) {
  const def = CRISTAL_MANA_DB[level];
  if (!def) return;
  const p = G.player;
  const livro = p.inventory.find(i => i.id === 'livro_mana');
  if (livro && livro.cristaisEncaixados && livro.cristaisEncaixados[level]) return; // já encaixado, não dá de novo
  if (p.inventory.find(i => i.id === def.id)) return; // já tem, não duplica
  p.inventory.push({
    id: def.id, name: def.name, icon: '💎', imgSrc: def.img,
    type: 'material', qty: 1,
    desc: `Encaixe no Livro da Mana para aprender a recuperar ${Math.round(def.pct * 100)}% da mana máxima.`,
  });
  notify(`✦ HuBi te entregou o ${def.name}!`, 'gold');
  addLog(`💎 Recebeu o ${def.name}.`, 'xp');
  if (document.getElementById('bag-item-list')) buildBagItems();
}
window.giveCristalMana = giveCristalMana;

// Dá o livro (com o socket Lv1 já preenchido de fábrica) — chamado
// no evento de HuBi atingir Level 5.
function giveLivroMana() {
  const p = G.player;
  if (p.inventory.find(i => i.id === 'livro_mana')) {
    notify('Você já tem o Livro da Mana.', 'gold');
    return;
  }
  p.inventory.push({
    id: 'livro_mana', name: 'Livro da Mana', icon: '📘',
    imgSrc: LIVRO_MANA_CAPA,
    type: 'livro', qty: 1, unique: true,
    desc: 'Um tomo antigo. Cada página tem um encaixe para um cristal de mana. Enquanto estiver na bolsa, recupera MP a cada ataque básico em batalha.',
    cristaisEncaixados: { 1: true, 2: false, 3: false, 4: false }, // Lv1 já vem encaixado
  });
  notify('✦ Você recebeu o Livro da Mana!', 'gold');
  addLog('📘 Recebeu o Livro da Mana, com o Cristal de Mana I já encaixado.', 'xp');
  if (document.getElementById('bag-item-list')) buildBagItems();
}
window.giveLivroMana = giveLivroMana;

// % de recuperação de mana hoje = o encaixe mais alto já preenchido.
function getLivroManaPctAtual(p) {
  p = p || G.player;
  const livro = p.inventory.find(i => i.id === 'livro_mana');
  if (!livro || !livro.cristaisEncaixados) return 0;
  let best = 0;
  LIVRO_MANA_SOCKETS.forEach(s => {
    if (livro.cristaisEncaixados[s.level]) best = Math.max(best, s.pct);
  });
  return best;
}
window.getLivroManaPctAtual = getLivroManaPctAtual;

// ── Popup do livro: páginas com os encaixes, efeito de virar página ──
function openLivroManaPopup() {
  const old = document.getElementById('livro-mana-popup');
  if (old) old.remove();

  const p = G.player;
  const livro = p.inventory.find(i => i.id === 'livro_mana');
  if (!livro) return;
  livro.cristaisEncaixados = livro.cristaisEncaixados || { 1: true, 2: false, 3: false, 4: false };
  livroManaLimparInventario(p); // some qualquer cristal duplicado que já esteja encaixado

  if (!document.getElementById('livro-mana-style')) {
    const st = document.createElement('style');
    st.id = 'livro-mana-style';
    st.textContent = `
      @keyframes livroPageFlip { 0%{ transform:rotateY(0deg); } 100%{ transform:rotateY(-25deg); } }
      .livro-mana-page.flipping { animation: livroPageFlip 0.45s ease-in-out; }
      .livro-mana-book { perspective: 1200px; }
      .livro-mana-socket { transition: transform 0.15s ease, box-shadow 0.15s ease; }
      .livro-mana-socket:active { transform: translate(-50%,-50%) scale(0.92); }
    `;
    document.head.appendChild(st);
  }

  const overlay = document.createElement('div');
  overlay.id = 'livro-mana-popup';
  overlay.style.cssText = `
    position:fixed; inset:0; z-index:950; background:rgba(4,2,1,0.88);
    display:flex; align-items:center; justify-content:center; padding:16px;
  `;
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  const box = document.createElement('div');
  box.className = 'livro-mana-book';
  box.style.cssText = `
    width:min(92vw, 360px); max-height:88vh; overflow-y:auto;
    background:rgba(10,7,4,0.98); border:1px solid rgba(200,150,10,0.4);
    border-radius:10px; padding:16px; font-family:'Noto Serif JP',serif;
    color:#e0c870; text-align:center;
  `;
  box.onclick = (e) => e.stopPropagation();

  const pctAtual = getLivroManaPctAtual(p);
  box.innerHTML = `
    <div style="font-size:1.05rem;letter-spacing:2px;margin-bottom:10px;">📘 Livro da Mana</div>
    <div style="font-size:0.72rem;color:rgba(224,200,112,0.7);margin-bottom:14px;">
      Recuperação de mana ativa: <strong style="color:#5090ff;">${Math.round(pctAtual*100)}%</strong>
    </div>
    <div id="livro-mana-pages"></div>
    <div id="livro-mana-nav" style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;"></div>
    <button onclick="document.getElementById('livro-mana-popup').remove()" style="width:100%;padding:8px;margin-top:14px;
      background:rgba(150,100,10,0.3);border:1px solid rgba(200,150,10,0.3);
      color:#e0c870;font-family:'Noto Serif JP',serif;font-size:0.75rem;border-radius:6px;cursor:pointer;">
      ✕ Fechar
    </button>
  `;

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  const pagesHost = box.querySelector('#livro-mana-pages');
  const navHost = box.querySelector('#livro-mana-nav');

  // Agrupa os sockets por página (pag2 tem 2 encaixes na mesma arte),
  // preservando a ordem definida em LIVRO_MANA_SOCKETS.
  const paginas = []; // [{ pageImg, sockets: [...] }]
  LIVRO_MANA_SOCKETS.forEach(s => {
    let pagina = paginas.find(pg => pg.pageImg === s.pageImg);
    if (!pagina) { pagina = { pageImg: s.pageImg, sockets: [] }; paginas.push(pagina); }
    pagina.sockets.push(s);
  });

  // Mantém a página atual entre re-renderizações (ex.: após encaixar cristal).
  if (typeof livro._paginaAtual !== 'number' || livro._paginaAtual < 0 || livro._paginaAtual >= paginas.length) {
    livro._paginaAtual = 0;
  }

  function renderPagina(idx, dir) {
    livro._paginaAtual = idx;
    const pagina = paginas[idx];

    const pageWrap = document.createElement('div');
    pageWrap.className = 'livro-mana-page' + (dir ? ' flipping' : '');
    pageWrap.style.cssText = 'position:relative;border-radius:6px;overflow:hidden;';

    pageWrap.innerHTML = `<img class="icon-fallback-img" src="${pagina.pageImg}" data-fallback-icon="📖"
        style="width:100%;display:block;border-radius:6px;">
      <span style="display:none;font-size:3rem;width:100%;padding:30px 0;">📖</span>`;

    pagina.sockets.forEach(s => {
      const preenchido = !!livro.cristaisEncaixados[s.level];
      const cristalDef = CRISTAL_MANA_DB[s.level];
      const temNoInventario = p.inventory.find(i => i.id === cristalDef.id && (i.qty || 0) > 0);

      const socket = document.createElement('div');
      socket.className = 'livro-mana-socket';
      socket.style.cssText = `
        position:absolute; left:${s.slotLeft}; top:${s.slotTop}; transform:translate(-50%,-50%);
        width:15%; aspect-ratio:1; border-radius:50%; display:flex; align-items:center; justify-content:center;
        background:${preenchido ? 'transparent' : 'rgba(0,0,0,0.25)'};
        border:${preenchido ? 'none' : '1.5px dashed rgba(200,150,10,0.4)'};
        cursor:${preenchido || temNoInventario ? 'pointer' : 'default'};
        -webkit-user-select:none; user-select:none;
      `;

      if (preenchido) {
        socket.innerHTML = `<img class="icon-fallback-img" src="${cristalDef.img}" data-fallback-icon="💎"
            style="width:78%;height:78%;object-fit:contain;border-radius:50%;pointer-events:none;">
          <span style="display:none;font-size:1rem;">💎</span>`;
        socket.title = `${cristalDef.name} — ${Math.round(cristalDef.pct*100)}% de mana`;

        // ── Aperta e segura: HuBi conta a história desse cristal ──
        let _pressTimer = null;
        let _pressFired = false;
        const _startPress = (ev) => {
          ev.preventDefault();
          _pressFired = false;
          _pressTimer = setTimeout(() => {
            _pressFired = true;
            abrirHistoriaCristal(s.level);
          }, 450);
        };
        const _cancelPress = () => { if (_pressTimer) clearTimeout(_pressTimer); };
        socket.addEventListener('pointerdown', _startPress);
        socket.addEventListener('pointerup', _cancelPress);
        socket.addEventListener('pointerleave', _cancelPress);
        socket.addEventListener('pointercancel', _cancelPress);
      } else if (temNoInventario) {
        socket.innerHTML = `<span style="font-size:0.9rem;">➕</span>`;
        socket.title = `Encaixar ${cristalDef.name}`;
        socket.onclick = () => encaixarCristalMana(s.level);
      } else {
        socket.innerHTML = `<span style="font-size:0.85rem;opacity:0.5;">🔒</span>`;
        socket.title = 'Cristal ainda não obtido';
      }

      pageWrap.appendChild(socket);
    });

    pagesHost.innerHTML = '';
    pagesHost.appendChild(pageWrap);

    // ── Navegação: ◀ anterior · pontinhos · próxima ▶ ──
    const dots = paginas.map((_, i) =>
      `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;margin:0 3px;
        background:${i === idx ? '#e0c870' : 'rgba(224,200,112,0.3)'};"></span>`
    ).join('');

    navHost.innerHTML = `
      <button id="livro-mana-prev" ${idx === 0 ? 'disabled' : ''} style="padding:6px 14px;
        background:rgba(150,100,10,0.25);border:1px solid rgba(200,150,10,0.3);border-radius:6px;
        color:#e0c870;font-family:'Noto Serif JP',serif;font-size:0.85rem;cursor:${idx === 0 ? 'default' : 'pointer'};
        opacity:${idx === 0 ? '0.35' : '1'};">◀</button>
      <div>${dots}</div>
      <button id="livro-mana-next" ${idx === paginas.length - 1 ? 'disabled' : ''} style="padding:6px 14px;
        background:rgba(150,100,10,0.25);border:1px solid rgba(200,150,10,0.3);border-radius:6px;
        color:#e0c870;font-family:'Noto Serif JP',serif;font-size:0.85rem;cursor:${idx === paginas.length - 1 ? 'default' : 'pointer'};
        opacity:${idx === paginas.length - 1 ? '0.35' : '1'};">▶</button>
    `;

    const prevBtn = navHost.querySelector('#livro-mana-prev');
    const nextBtn = navHost.querySelector('#livro-mana-next');
    if (prevBtn && idx > 0) prevBtn.onclick = () => renderPagina(idx - 1, 'prev');
    if (nextBtn && idx < paginas.length - 1) nextBtn.onclick = () => renderPagina(idx + 1, 'next');
  }

  renderPagina(livro._paginaAtual, null);
}
window.openLivroManaPopup = openLivroManaPopup;

// Encaixa um cristal específico na página — some do inventário
// (consumido em definitivo) e ativa o efeito de virar página.
function encaixarCristalMana(level) {
  const p = G.player;
  const livro = p.inventory.find(i => i.id === 'livro_mana');
  const cristalDef = CRISTAL_MANA_DB[level];
  if (!livro || !cristalDef) return;

  const idx = p.inventory.findIndex(i => i.id === cristalDef.id);
  if (idx === -1) return;

  // Consome o cristal em definitivo.
  p.inventory[idx].qty = (p.inventory[idx].qty || 1) - 1;
  if (p.inventory[idx].qty <= 0) p.inventory.splice(idx, 1);

  livro.cristaisEncaixados = livro.cristaisEncaixados || {};
  livro.cristaisEncaixados[level] = true;

  notify(`💠 ${cristalDef.name} encaixado! Recuperação de mana agora em ${Math.round(cristalDef.pct*100)}%.`, 'gold');
  addLog(`📘 Encaixou o ${cristalDef.name} no Livro da Mana.`, 'xp');

  const pageEl = document.querySelectorAll('.livro-mana-page');
  pageEl.forEach(pe => {
    if (pe.querySelector(`img[src*="${cristalDef.img.split('/').pop()}"]`)) return; // já preenchido
  });

  openLivroManaPopup(); // redesenha com efeito de flip já embutido no CSS da página
}
window.encaixarCristalMana = encaixarCristalMana;

// ── Aperta-e-segura num cristal encaixado: HuBi conta a história dele ──
function abrirHistoriaCristal(level) {
  const old = document.getElementById('livro-mana-historia-popup');
  if (old) old.remove();

  const cristalDef = CRISTAL_MANA_DB[level];
  if (!cristalDef || !cristalDef.historia) return;

  const overlay = document.createElement('div');
  overlay.id = 'livro-mana-historia-popup';
  overlay.style.cssText = `
    position:fixed; inset:0; z-index:970; background:rgba(4,2,1,0.92);
    display:flex; align-items:center; justify-content:center; padding:20px;
  `;
  overlay.onclick = () => overlay.remove();

  const box = document.createElement('div');
  box.style.cssText = `
    width:min(90vw, 340px); background:rgba(12,8,4,0.98); border:1px solid rgba(126,200,126,0.4);
    border-radius:10px; padding:18px; font-family:'Noto Serif JP',serif; color:#e0c870; text-align:center;
  `;
  box.onclick = (e) => e.stopPropagation();
  box.innerHTML = `
    <img class="icon-fallback-img" src="${cristalDef.img}" data-fallback-icon="💎"
      style="width:56px;height:56px;object-fit:contain;border-radius:50%;margin-bottom:10px;">
    <span style="display:none;font-size:2rem;">💎</span>
    <div style="font-size:0.95rem;letter-spacing:1px;margin-bottom:4px;">${cristalDef.name}</div>
    <div style="font-size:0.68rem;color:#7ec87e;letter-spacing:2px;margin-bottom:12px;">🌿 HuBi CONTA</div>
    <div style="font-size:0.8rem;line-height:1.6;color:rgba(224,200,112,0.9);text-align:left;">${cristalDef.historia}</div>
    <button onclick="document.getElementById('livro-mana-historia-popup').remove()" style="width:100%;padding:7px;margin-top:16px;
      background:rgba(126,200,126,0.15);border:1px solid rgba(126,200,126,0.35);
      color:#e0c870;font-family:'Noto Serif JP',serif;font-size:0.72rem;border-radius:6px;cursor:pointer;">
      ✕ Fechar
    </button>
  `;

  overlay.appendChild(box);
  document.body.appendChild(overlay);
}
window.abrirHistoriaCristal = abrirHistoriaCristal;

// ── Passivo em batalha: dispara a cada ATAQUE BÁSICO, recuperando %
//    da mana máxima conforme o cristal mais alto encaixado no livro.
//    Não consome turno — é chamado de dentro do próprio doBattleAction()
//    no bloco 'attack', junto com o golpe do jogador.
function aplicarLivroManaPassivo(bs, p) {
  p = p || G.player;
  if (!p.inventory || !p.inventory.find(i => i.id === 'livro_mana')) return;
  const pct = getLivroManaPctAtual(p);
  if (pct <= 0) return;
  if ((p.mp || 0) >= (p.maxMp || 0)) return; // já no máximo, nada a recuperar

  const mpRestore = Math.max(1, Math.floor((p.maxMp || 0) * pct));
  const antes = p.mp || 0;
  p.mp = Math.min(p.maxMp, antes + mpRestore);
  const restaurado = p.mp - antes;
  if (restaurado <= 0) return;

  appendBattleLog(`📘 Livro da Mana: +${restaurado} MP (${Math.round(pct*100)}%)!`, '#5090ff');
  if (typeof showFloatingNumber === 'function') showFloatingNumber('hero', restaurado, 'heal');
  if (typeof updateBattleHUD === 'function') updateBattleHUD();
}
window.aplicarLivroManaPassivo = aplicarLivroManaPassivo;
