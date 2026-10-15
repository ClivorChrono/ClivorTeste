// ══════════════════════════════════════════════════════════════
//  CHRONICLES OF CLIVOR — paladino_terra_fria.js
//  Skill TERRA FRIA do Paladino — liberada pelo Despertar VI da Maça Sagrada.
//
//  O martelo sobe (a altura em metros = DEF do herói), despenca no inimigo
//  e, ao tocar o chão, congela a terra e EXPLODE: dois danos.
//    impacto   = DEF efetiva × multiplicador de crítico
//    explosão  = 60% do impacto
//  Custo: 45% da barra de AP. Recarga: 2 turnos (sistema cooldownTurns).
//
//  Carregar DEPOIS de core/palDinh.js, classes/class_paladino.js,
//  core/classes_new.js e classes/paladino_maca_efeitos.js no gat-1.html.
//  Imagem do martelo: Imagens/personagens/paladino/telorut.png
//  Explosão (sprite sheet, 3 frames): Imagens/personagens/paladino/guys7.png
// ══════════════════════════════════════════════════════════════

'use strict';

(function () {
  // true = libera a skill sem precisar do Despertar VI (só pra testar no celular)
  const TERRA_FRIA_TESTE = false;

  const CFG = {
    apPct: 0.45,          // custo: 45% da barra de AP
    cooldown: 2,          // rodadas de recarga
    explosao: 0.60,       // explosão final = 60% do impacto
    despertarMin: 6,      // Despertar da Maça necessário
    img: 'Imagens/personagens/paladino/telorut.png',
    desc: 'O martelo sagrado sobe aos céus e despenca sobre o inimigo. Ao tocar o chão, congela a terra e detona numa explosão gélida. Quanto mais firme a sua armadura, mais alto o martelo sobe.',
  };

  // ── Sprite sheet da explosão (guys7.png: 3 frames empilhados, do menor ao maior) ──
  // Cada frame é recortado SOZINHO (dentro do próprio retângulo) num canvas, então
  // nunca aparece pedaço do frame de cima/de baixo. Os retângulos são detectados
  // automaticamente pelas faixas transparentes entre os frames; se não achar,
  // divide a imagem em partes iguais.
  const SHEET = { src: 'Imagens/personagens/paladino/guys7.png', frames: 3, alphaMin: 24 };
  let _sheet = null, _sheetPromise = null;

  // INICIO-detectarFrames
  function detectarFrames(data, w, h, n, alphaMin) {
    const rowHas = new Uint8Array(h);
    for (let y = 0; y < h; y++) {
      let c = 0;
      for (let x = 0; x < w && c < 2; x++) if (data[(y * w + x) * 4 + 3] > alphaMin) c++;
      rowHas[y] = c >= 2 ? 1 : 0;
    }
    let y0 = 0, y1 = h - 1;
    while (y0 < h && !rowHas[y0]) y0++;
    while (y1 > y0 && !rowHas[y1]) y1--;
    // faixas vazias entre y0 e y1 — as (n-1) maiores separam os frames
    const gaps = [];
    for (let y = y0; y <= y1;) {
      if (rowHas[y]) { y++; continue; }
      let s = y; while (y <= y1 && !rowHas[y]) y++;
      gaps.push({ start: s, len: y - s });
    }
    gaps.sort((a, b) => b.len - a.len);
    let cuts;
    if (gaps.length >= n - 1) {
      cuts = gaps.slice(0, n - 1).map(g => g.start + Math.floor(g.len / 2)).sort((a, b) => a - b);
    } else {
      cuts = []; for (let i = 1; i < n; i++) cuts.push(Math.round(h * i / n)); // partes iguais
    }
    const edges = [0].concat(cuts, [h]);
    const rects = [];
    for (let i = 0; i < n; i++) {
      const a = edges[i], b = edges[i + 1];
      let minX = w, maxX = -1, minY = b, maxY = -1;
      for (let y = a; y < b; y++) for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > alphaMin) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
      rects.push(maxX < 0 ? { x: 0, y: a, w: w, h: b - a }
                          : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 });
    }
    return rects;
  }
  // FIM-detectarFrames

  function carregarSheet() {
    if (_sheetPromise) return _sheetPromise;
    _sheetPromise = new Promise(function (resolve) {
      const im = new Image();
      im.onload = function () {
        try {
          const W = im.naturalWidth, H = im.naturalHeight, n = SHEET.frames;
          let rects;
          try {
            const full = document.createElement('canvas'); full.width = W; full.height = H;
            const fx = full.getContext('2d'); fx.drawImage(im, 0, 0);
            rects = detectarFrames(fx.getImageData(0, 0, W, H).data, W, H, n, SHEET.alphaMin);
          } catch (e) { // canvas bloqueado (ex.: file://): partes iguais, sem aparar
            rects = []; for (let i = 0; i < n; i++) rects.push({ x: 0, y: Math.round(H * i / n), w: W, h: Math.round(H * (i + 1) / n) - Math.round(H * i / n) });
          }
          const frames = rects.map(function (r) {
            const c = document.createElement('canvas'); c.width = r.w; c.height = r.h;
            c.getContext('2d').drawImage(im, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
            return c;
          });
          _sheet = { frames: frames };
          console.log('[terra_fria] sprite sheet ' + W + 'x' + H + ' — frames:', JSON.stringify(rects));
        } catch (err) { _sheet = null; console.warn('[terra_fria] sprite sheet falhou:', err); }
        resolve(_sheet);
      };
      im.onerror = function () { _sheet = null; console.warn('[terra_fria] não achei ' + SHEET.src); resolve(null); };
      im.src = SHEET.src;
    });
    return _sheetPromise;
  }
  carregarSheet(); // pré-carrega pra já estar pronto na primeira vez que usar

  // ── Liberação ──────────────────────────────────────────────
  function despertarDaMaca(p) {
    const w = p && (p.equippedWeapon || (p.equipped && p.equipped.weapon));
    if (!w || !w.id) return 0;
    if (String(w.id).replace('arma_', '') !== 'maca_sagrada') return 0;
    return w.awakenLevel || 0;
  }

  function terraFriaDisponivel(p) {
    if (!p || !p.classData || p.classData.id !== 'paladino') return false;
    return TERRA_FRIA_TESTE || despertarDaMaca(p) >= CFG.despertarMin;
  }
  window.macaTerraFriaDisponivel = terraFriaDisponivel;

  function custoAP(p) {
    return Math.max(1, Math.floor(((p && p.maxAp) || 100) * CFG.apPct));
  }

  // ── Definição da skill (entra em classData.skills sem aparecer nos 3 slots) ──
  function criarSkill() {
    return {
      key: 'terra_fria',
      name: 'Terra Fria',
      icon: '🔨',
      iconImg: CFG.img,
      get ap() { return custoAP(window.G && window.G.player); }, // 45% da barra, acompanha o maxAp
      cooldownTurns: CFG.cooldown,
      desc: CFG.desc,
      dmg: 'paladino:terra_fria',
      despertarSkill: true, // fora dos slots normais (mesmo esquema do Julgamento Divino)
    };
  }

  // Garante a skill em classData.skills (também em saves antigos) e devolve o índice
  function garantirSkill(p) {
    const cls = p && p.classData;
    if (!cls || !Array.isArray(cls.skills)) return -1;
    let i = cls.skills.findIndex(s => s && s.key === 'terra_fria');
    if (i < 0) { cls.skills.push(criarSkill()); i = cls.skills.length - 1; }
    else {
      const d = Object.getOwnPropertyDescriptor(cls.skills[i], 'ap');
      if (!d || !d.get) cls.skills[i] = criarSkill(); // save antigo: custo fixo -> volta a acompanhar o maxAp
    }
    return i;
  }

  // ── Botão fixo na batalha (chamado por buildSkillList) ─────
  window.macaTerraFriaAddButton = function (container) {
    const p = window.G && window.G.player;
    if (!container || !terraFriaDisponivel(p)) return;
    const idx = garantirSkill(p);
    if (idx < 0) return;
    const sk = p.classData.skills[idx];
    const cost = sk.ap;
    const bs = (typeof battleState !== 'undefined') ? battleState : null;
    const cd = (bs && bs._cooldowns && bs._cooldowns[sk.key]) || 0;

    const btn = document.createElement('button');
    btn.className = 'skill-battle-btn';
    btn.style.borderColor = 'rgba(150,210,255,0.7)';
    btn.style.background = 'rgba(120,190,240,0.08)';
    btn.innerHTML =
      `<img src="${sk.iconImg}" style="width:22px;height:22px;object-fit:contain;vertical-align:middle;margin-right:2px;">` +
      `${sk.name} <span style="opacity:0.6;font-size:0.62rem">(${cost}AP)</span>` +
      (cd > 0 ? ` <span style="opacity:0.85;font-size:0.6rem;color:#ff9060;">⏳${cd}</span>` : '');
    btn.disabled = (p.ap || 0) < cost || cd > 0;
    if (cd > 0) btn.title = `Em recarga: ${cd} turno${cd > 1 ? 's' : ''} restante${cd > 1 ? 's' : ''}.`;
    btn.onclick = () => doBattleAction('skill', idx);
    container.appendChild(btn);
  };

  // ── Card na Ficha do herói (travado até o Despertar VI) ────
  window.macaTerraFriaFichaHTML = function (p) {
    if (!p || !p.classData || p.classData.id !== 'paladino') return '';
    const liberada = terraFriaDisponivel(p);
    const cor = liberada ? 'rgba(150,210,255,0.6)' : 'rgba(150,210,255,0.25)';
    return `
      <div style="margin-top:10px;border-top:1px solid rgba(120,190,240,0.2);padding-top:10px;">
        <div style="font-size:0.5rem;letter-spacing:3px;color:rgba(150,210,255,0.6);margin-bottom:6px;">✦ DESPERTAR VI · MAÇA SAGRADA</div>
        <div class="char-skill-card" style="border-color:${cor};background:rgba(120,190,240,0.05);cursor:default;${liberada ? '' : 'opacity:0.7;'}">
          <div class="char-skill-card-icon"><img src="${CFG.img}" style="width:36px;height:36px;object-fit:contain;"></div>
          <div class="char-skill-card-info">
            <div class="char-skill-card-name">Terra Fria <span style="font-size:0.48rem;color:rgba(150,210,255,0.8);background:rgba(120,190,240,0.12);padding:1px 5px;border-radius:2px;">5ª SKILL</span></div>
            <div class="char-skill-card-desc">${CFG.desc}</div>
            <div class="char-skill-card-cost" style="color:rgba(150,210,255,0.6);">${Math.round(CFG.apPct * 100)}% da barra de AP · Recarga ${CFG.cooldown} turnos${liberada ? ' · Slot fixo' : ' · Requer Maça Sagrada no Despertar VI'}</div>
          </div>
          <div style="font-size:0.8rem;color:rgba(150,210,255,0.5);">${liberada ? '🔓' : '🔒'}</div>
        </div>
      </div>`;
  };

  // ── Execução (dano + visual) ───────────────────────────────
  function executarTerraFria(sk, p, e, bs, h) {
    const defReal = Math.max(0, Math.floor(p.def || 0));
    const altura = defReal; // metros (só visual/log: o martelo "sobe" tanto quanto a DEF)
    const defEf = defReal * ((typeof window.macaDanoMult === 'function') ? window.macaDanoMult(p) : 1);
    const critMult = (typeof getCritMultiplier === 'function')
      ? getCritMultiplier(p)
      : ((typeof BATTLE_CONFIG !== 'undefined' && BATTLE_CONFIG.CRIT_MULTIPLIER) || 1.85);

    const impacto  = Math.max(1, Math.floor(defEf * critMult + Math.random() * 6));
    const explosao = Math.max(1, Math.floor(impacto * CFG.explosao));

    bs.enemyHp -= (impacto + explosao);
    bs.totalDmgDealt = (bs.totalDmgDealt || 0) + impacto + explosao;

    const log = h.appendBattleLog || (() => {});
    log(`🔨 TERRA FRIA! O martelo sobe ${altura} m e despenca sobre ${e.name || 'o inimigo'}: -${impacto} HP!`, '#9fd8ff');
    log(`❄️💥 A terra congela e explode! -${explosao} HP!`, '#cfeaff');

    const t = terraFriaVisual(altura);
    const vivo = () => { const bo = document.getElementById('battle-overlay'); return !!(bo && bo.classList.contains('active')); };
    setTimeout(() => {
      if (!vivo()) return;
      if (h.showFloatingNumber) h.showFloatingNumber('enemy', impacto, 'crit');
      if (h.flashDamage) h.flashDamage('enemy');
      if (h.animEnemyHit) h.animEnemyHit();
    }, t.impacto);
    setTimeout(() => {
      if (!vivo()) return;
      if (h.showFloatingNumber) h.showFloatingNumber('enemy', explosao, 'dmg');
      if (h.flashDamage) h.flashDamage('enemy');
    }, t.explosao);

    return { skipEnemyTurn: false, enemyStunned: false, apGain: 0, dmgDealt: impacto + explosao };
  }
  window.macaTerraFriaExecutar = executarTerraFria;

  // ── Visual: martelo cai, colisão gélida, explosão ──────────
  function terraFriaVisual(altura) {
    // Quanto maior a DEF (altura), mais tempo o martelo leva pra cair
    const tImpacto  = 380 + Math.min(260, Math.floor(altura * 0.5));
    const tExplosao = tImpacto + 560;
    try {
      const alvo = document.getElementById('bat-enemy-icon');
      const r = alvo ? alvo.getBoundingClientRect()
                     : { left: innerWidth / 2 - 40, top: innerHeight * 0.3, width: 80, height: 80 };
      const cx = r.left + r.width / 2;
      const baseY = r.top + r.height * 0.85;

      const sheet = (_sheet && _sheet.frames && _sheet.frames.length) ? _sheet : null;
      if (!sheet) carregarSheet();

      const root = document.createElement('div');
      root.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:99998;overflow:hidden;';
      document.body.appendChild(root);

      const mk = (css) => { const d = document.createElement('div'); d.style.cssText = css; root.appendChild(d); return d; };
      const shake = (amp, ms) => {
        const bo = document.getElementById('battle-overlay');
        if (bo && bo.animate) bo.animate([
          { transform: 'translate(0,0)' },
          { transform: `translate(${-amp}px,${amp * 0.7}px)` },
          { transform: `translate(${amp}px,${-amp}px)` },
          { transform: `translate(${-amp * 0.5}px,${amp * 0.4}px)` },
          { transform: 'translate(0,0)' },
        ], { duration: ms });
      };
      const flash = (cor, ms) => {
        const f = mk(`position:absolute;left:0;top:0;width:100%;height:100%;background:${cor};opacity:0;`);
        f.animate([{ opacity: 0.9 }, { opacity: 0 }], { duration: ms, fill: 'forwards' });
      };
      const ring = (w, escala, cor, ms) => {
        const d = mk(`position:absolute;left:${cx}px;top:${baseY}px;width:${w}px;height:${w * 0.42}px;margin:${-w * 0.21}px 0 0 ${-w / 2}px;border-radius:50%;border:3px solid ${cor};box-shadow:0 0 18px ${cor};opacity:0;`);
        d.animate([{ transform: 'scale(0.15)', opacity: 1 }, { transform: `scale(${escala})`, opacity: 0 }], { duration: ms, easing: 'ease-out', fill: 'forwards' });
      };
      const fragmentos = (qtd, gelo) => {
        for (let i = 0; i < qtd; i++) {
          const ang = (-Math.PI) + Math.random() * Math.PI; // pra cima/lados
          const dist = 90 + Math.random() * 150;
          const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist;
          const tam = gelo ? 8 + Math.random() * 8 : 5 + Math.random() * 5;
          const d = mk(gelo
            ? `position:absolute;left:${cx}px;top:${baseY}px;width:${tam}px;height:${tam * 2.2}px;background:linear-gradient(#fff,#8fd0ff);clip-path:polygon(50% 0,100% 100%,0 100%);opacity:0;`
            : `position:absolute;left:${cx}px;top:${baseY}px;width:${tam}px;height:${tam}px;border-radius:50%;background:#ffd86b;box-shadow:0 0 8px #ffd86b;opacity:0;`);
          d.animate([
            { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
            { transform: `translate(${dx}px,${dy}px) rotate(${Math.random() * 360}deg)`, opacity: 1, offset: 0.55 },
            { transform: `translate(${dx * 1.2}px,${dy + 90}px) rotate(${Math.random() * 540}deg)`, opacity: 0 },
          ], { duration: 650 + Math.random() * 250, easing: 'ease-out', fill: 'forwards' });
        }
      };

      // Explosão em sprite: frames 1→2→3 crescendo a partir do chão (mesma escala nos 3)
      const sprite = () => {
        const fr = sheet.frames;
        const alvoW = Math.min(innerWidth * 0.96, 520);
        const k = alvoW / Math.max.apply(null, fr.map(c => c.width));
        const passo = 190;   // ms entre frames
        let ant = null;
        fr.forEach((c, i) => {
          const w = c.width * k, hh = c.height * k;
          const el = mk(`position:absolute;left:${cx - w / 2}px;top:${baseY - hh * 0.85}px;width:${w}px;height:${hh}px;opacity:0;transform-origin:50% 100%;filter:drop-shadow(0 0 10px rgba(255,214,120,0.75));`);
          c.style.cssText = 'width:100%;height:100%;display:block;';
          el.appendChild(c);
          el.animate([
            { opacity: 0, transform: 'scale(0.55) translateY(6px)' },
            { opacity: 1, transform: 'scale(1) translateY(0)' },
          ], { duration: 160, delay: i * passo, easing: 'ease-out', fill: 'both' });
          if (ant) ant.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, delay: i * passo + 40, fill: 'forwards' });
          ant = el;
        });
        // último frame (o maior) segura um instante e some
        ant.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, delay: (fr.length - 1) * passo + 520, fill: 'forwards' });
      };

      // Martelo caindo
      const hw = Math.min(innerWidth * 0.42, 230);
      const img = new Image();
      img.src = CFG.img;
      img.style.cssText = `position:absolute;width:${hw}px;left:${cx - hw / 2}px;bottom:${innerHeight - baseY - hw * 0.04}px;opacity:0;filter:drop-shadow(0 0 14px rgba(150,220,255,0.9));transform-origin:50% 100%;`;
      root.appendChild(img);
      img.animate([
        { transform: `translateY(${-innerHeight}px) rotate(-5deg)`, opacity: 1 },
        { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
      ], { duration: tImpacto, easing: 'cubic-bezier(.6,0,1,.5)', fill: 'forwards' });

      // Colisão
      setTimeout(() => {
        shake(9, 320);
        flash('rgba(200,235,255,0.55)', 240);
        if (sheet) sprite();
        else {
          ring(90, 7, 'rgba(190,235,255,0.95)', 620);
          ring(60, 5, 'rgba(255,255,255,0.9)', 480);
          fragmentos(16, true);
        }
      }, tImpacto);

      // Explosão final
      setTimeout(() => {
        shake(14, 420);
        flash('rgba(255,250,230,0.7)', 300);
        if (!sheet) {
          const b = mk(`position:absolute;left:${cx}px;top:${baseY - 40}px;width:140px;height:140px;margin:-70px 0 0 -70px;border-radius:50%;background:radial-gradient(circle,#fff 0%,#cfeaff 28%,rgba(255,216,107,0.85) 50%,rgba(255,216,107,0) 72%);opacity:0;`);
          b.animate([{ transform: 'scale(0.2)', opacity: 1 }, { transform: 'scale(3.4)', opacity: 0 }], { duration: 560, easing: 'ease-out', fill: 'forwards' });
          ring(120, 9, 'rgba(255,216,107,0.95)', 640);
        }
        fragmentos(sheet ? 14 : 22, false);
        img.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.15)' }], { duration: 320, fill: 'forwards' });
      }, tExplosao);

      setTimeout(() => { if (root.parentNode) root.parentNode.removeChild(root); }, tExplosao + 950);
    } catch (err) {
      console.warn('[terra_fria] visual falhou (o dano continua valendo):', err);
    }
    return { impacto: tImpacto, explosao: tExplosao };
  }

  // ── Liga a skill ao executor de classes (core/classes_new.js) ──
  function instalar() {
    if (window._terraFriaInstalada) return;
    const orig = window.executeClassSkill;
    if (typeof orig !== 'function') return;
    window._terraFriaInstalada = true;
    window.executeClassSkill = function (sk, p, e, bs, helpers) {
      if (sk && sk.key === 'terra_fria') return executarTerraFria(sk, p, e, bs, helpers || {});
      return orig.apply(this, arguments);
    };
  }
  instalar();
  if (!window._terraFriaInstalada) window.addEventListener('load', instalar);

  console.log('✓ Terra Fria (paladino_terra_fria.js) carregada');
})();
