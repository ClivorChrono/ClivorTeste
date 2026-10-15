// =============================================================================
//  FORJA — CINEMÁTICA 3D (bigorna + martelo)
//  Ao tocar em "Forjar Ascensão" (ou "Despertar"): tela escura, o martelo fica
//  parado no alto esperando. Cada TOQUE NA TELA é um golpe na bigorna (3 golpes,
//  4 no despertar), com faíscas de aço. Sem toque, nada acontece. No ÚLTIMO golpe
//  a ascensão é aplicada de verdade. (PULAR aplica direto.)
//
//  Arquivos (pasta 3DI/): ID;bigorna.glb e ID;martelo.glb  (ou forja_bigorna.glb /
//  forja_martelo.glb, e versões *_leve.glb que são tentadas primeiro).
//  O martelo da forja NÃO usa martelo.glb (esse é da Maça Sagrada).
//
//  Sem os modelos / sem WebGL: pula a cinemática e aplica a ascensão direto.
//  Carregar depois de ascensao_vilarejo.js.
// =============================================================================
(function () {
  'use strict';
  if (window.__forjaCine) return;
  window.__forjaCine = true;

  const DIR = '3DI/';
  const FILES = {
    bigorna: ['forja_bigorna_leve.glb', 'forja_bigorna.glb', 'ID;bigorna.glb', 'bigorna.glb'],
    martelo: ['forja_martelo_leve.glb', 'forja_martelo.glb', 'ID;martelo.glb']
  };
  // Ajustes finos (mexa aqui se algo aparecer virado)
  const CFG = {
    hits: 3,            // golpes na ascensão
    hitsAwaken: 4,      // golpes no despertar
    hammerSize: 0.95,   // comprimento do martelo, em relação à largura da bigorna
    hammerFlip: false,  // true = martelo apareceu com a cabeça pra CIMA
    anvilFlipY: false,  // true = bigorna apareceu de cabeça pra baixo
    anvilRotY: 0,       // gira a bigorna (radianos), ex.: Math.PI se o bico estiver pro lado errado
    hammerRot: [0, 0, 270], // giro EXTRA do martelo, em GRAUS [x, y, z] — calibre na tela de teste (#testeforja)
    sfxSrc: 'musicas/Outros/forja.mp3', // som da martelada
    sfxTailMs: 1000,    // quanto do som tocar A PARTIR da batida (o resto do mp3 repete a batida)
    sfxFadeMs: 120,     // fade-out no fim, pra não cortar seco
    sfxOnsetMs: null,   // instante da batida dentro do mp3. null = detecta sozinho (veja o console); ou fixe em ms, ex.: 350
    sfxOnsetThresh: 0.12, // sensibilidade da detecção (0.05 = pega o som mais cedo, 0.3 = só picos fortes)
    sfxOffsetMs: 0,     // ajuste fino: negativo = som mais CEDO, positivo = mais TARDE (ex.: -80)
    hammerTilt: 0.45,   // inclinação do martelo no alto do golpe (radianos); 0 = desce reto
    maxWait: 60000      // ms esperando os modelos antes de desistir da cinemática
  };
  const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js';
  const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/loaders/GLTFLoader.js';

  const S = { busy: false, models: null, loading: null, r: null, prog: {}, sfx: null };

  // ───────────── som da martelada ─────────────
  // O som é disparado NO TOQUE (não no impacto) e calculado pra que a BATIDA que existe
  // dentro do mp3 caia exatamente no frame em que o martelo encosta na bigorna.
  // O instante da batida no mp3 é detectado sozinho (aparece no console: "[Forja] batida do som").
  const AC = window.AudioContext || window.webkitAudioContext;
  function sfxCtx() {
    if (!AC) return null;
    if (!S.ac) { try { S.ac = new AC(); } catch (_) { return null; } }
    if (S.ac.state === 'suspended') S.ac.resume().catch(() => {});
    return S.ac;
  }
  function sfxBase() {   // plano B (HTMLAudio), se o WebAudio falhar
    if (!S.sfx) { S.sfx = new Audio(CFG.sfxSrc); S.sfx.preload = 'auto'; }
    return S.sfx;
  }
  function detectOnset(buf) {
    if (CFG.sfxOnsetMs != null) return CFG.sfxOnsetMs;
    const d = buf.getChannelData(0), n = Math.min(d.length, Math.floor(buf.sampleRate * 3));
    let peak = 0;
    for (let i = 0; i < n; i++) { const v = Math.abs(d[i]); if (v > peak) peak = v; }
    const thr = peak * CFG.sfxOnsetThresh;
    let i = 0; while (i < n && Math.abs(d[i]) < thr) i++;
    return Math.max(0, (i / buf.sampleRate) * 1000 - 3);
  }
  function loadSfx() {   // baixa + decodifica o mp3 uma vez só
    if (S.sfxP) return S.sfxP;
    const ac = sfxCtx();
    if (!ac) return Promise.reject(new Error('sem WebAudio'));
    const p = fetch(CFG.sfxSrc)
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
      .then(ab => new Promise((res, rej) => ac.decodeAudioData(ab, res, rej)))
      .then(buf => {
        const onset = detectOnset(buf);
        console.log('[Forja] batida do som em ' + onset.toFixed(0) + ' ms (áudio de ' + (buf.duration * 1000).toFixed(0) + ' ms)');
        return { buf, onset };
      });
    p.catch(() => { S.sfxP = null; });
    return (S.sfxP = p);
  }
  function sfxVol() {
    return (window.AudioSys && window.AudioSys.sfxVolume != null) ? window.AudioSys.sfxVolume : 0.8;
  }
  // chamado no toque; impactMs = quanto tempo depois do toque o martelo bate
  function scheduleHit(impactMs) {
    const vol = sfxVol(); if (!vol) return;
    const t0 = performance.now();
    loadSfx().then(({ buf, onset }) => {
      const ac = S.ac;
      const lead = impactMs + CFG.sfxOffsetMs - onset - (performance.now() - t0);  // ms até o mp3 começar a tocar
      const when = ac.currentTime + Math.max(0, lead) / 1000;
      const skip = Math.max(0, -lead) / 1000;                                       // batida depois do impacto → pula o começo
      const dur = Math.max(0.05, Math.min(buf.duration, (onset + CFG.sfxTailMs) / 1000) - skip);
      const fade = Math.min(CFG.sfxFadeMs / 1000, dur);
      const src = ac.createBufferSource(); src.buffer = buf;
      const g = ac.createGain(); g.gain.setValueAtTime(vol, when);
      g.gain.setValueAtTime(vol, when + dur - fade); g.gain.linearRampToValueAtTime(0, when + dur);
      src.connect(g); g.connect(ac.destination);
      src.start(when, skip, dur);
    }).catch(() => fallbackHit(impactMs, vol));
  }
  function fallbackHit(impactMs, vol) {
    try {
      const onset = CFG.sfxOnsetMs || 0;
      const lead = impactMs + CFG.sfxOffsetMs - onset;
      const a = sfxBase().cloneNode(); a.volume = vol;
      try { a.currentTime = Math.max(0, -lead) / 1000; } catch (_) {}
      setTimeout(() => {
        const pr = a.play(); if (pr && pr.catch) pr.catch(() => {});
        const fade = CFG.sfxFadeMs;
        setTimeout(() => {
          const t0 = performance.now();
          const iv = setInterval(() => {
            const k = (performance.now() - t0) / fade;
            if (k >= 1) { clearInterval(iv); a.pause(); } else a.volume = vol * (1 - k);
          }, 16);
        }, Math.max(0, onset + CFG.sfxTailMs - Math.max(0, -lead) - fade));
      }, Math.max(0, lead));
    } catch (_) {}
  }

  const ease = {
    outCubic: t => 1 - Math.pow(1 - t, 3),
    inQuad: t => t * t,
    outQuad: t => 1 - (1 - t) * (1 - t)
  };
  const lerp = (a, b, t) => a + (b - a) * t;

  // ───────────── three.js ─────────────
  function loadScript(url) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = url; s.onload = res; s.onerror = () => rej(new Error('falha ao carregar ' + url));
      document.head.appendChild(s);
    });
  }
  function lib() {
    if (typeof _bag3dLib === 'function') return _bag3dLib();   // reaproveita o do visualizador da Bolsa
    return (window.THREE ? Promise.resolve() : loadScript(THREE_URL))
      .then(() => (THREE.GLTFLoader ? null : loadScript(GLTF_URL)));
  }

  // ───────────── modelos ─────────────
  function loadGlb(key, onProg) {
    return new Promise((resolve, reject) => {
      const files = FILES[key];
      const tryFile = i => {
        if (i >= files.length) return reject(new Error('glb não encontrado: ' + key));
        new THREE.GLTFLoader().load(DIR + encodeURIComponent(files[i]), g => resolve(g.scene), onProg, () => tryFile(i + 1));
      };
      tryFile(0);
    });
  }

  function samplePoints(root, maxPerMesh) {
    root.updateMatrixWorld(true);
    const pts = [], v = new THREE.Vector3();
    root.traverse(m => {
      if (!m.isMesh || !m.geometry.attributes.position) return;
      const pos = m.geometry.attributes.position;
      const step = Math.max(1, Math.floor(pos.count / maxPerMesh));
      for (let k = 0; k < pos.count; k += step) pts.push(v.fromBufferAttribute(pos, k).applyMatrix4(m.matrixWorld).clone());
    });
    return pts;
  }

  // Bigorna: base no chão (y=0), centrada, largura 1.7. Descobre o ponto de impacto (topo).
  function prepAnvil(obj) {
    const holder = new THREE.Group(); holder.add(obj);
    obj.rotation.set(CFG.anvilFlipY ? Math.PI : 0, CFG.anvilRotY, 0);
    let b = new THREE.Box3().setFromPoints(samplePoints(holder, 6000));
    const c = b.getCenter(new THREE.Vector3());
    obj.position.set(-c.x, -b.min.y, -c.z);
    const pts = samplePoints(holder, 12000);
    b = new THREE.Box3().setFromPoints(pts);
    const thr = b.max.y - (b.max.y - b.min.y) * 0.12;
    let sx = 0, sz = 0, n = 0;
    pts.forEach(p => { if (p.y >= thr) { sx += p.x; sz += p.z; n++; } });
    const strike = new THREE.Vector3(n ? sx / n : 0, b.max.y, n ? sz / n : 0);
    const width = Math.max(b.max.x - b.min.x, b.max.z - b.min.z);
    const s = 1.7 / width;
    holder.scale.setScalar(s); strike.multiplyScalar(s);
    return { holder, strike, width: 1.7, height: (b.max.y - b.min.y) * s };
  }

  // Martelo: eixo mais comprido vira vertical, lado pesado (cabeça) fica EMBAIXO.
  function prepHammer(obj, anvilW) {
    const holder = new THREE.Group(); holder.add(obj);
    const V = THREE.Vector3;
    obj.quaternion.identity(); obj.position.set(0, 0, 0);   // permite re-montar o martelo (tela de teste)
    let pts = samplePoints(holder, 8000);
    const b0 = new THREE.Box3().setFromPoints(pts);
    const sz0 = b0.getSize(new V()), c0 = b0.getCenter(new V());
    const ax = ['x', 'y', 'z'].sort((p, q) => sz0[q] - sz0[p])[0];
    const mean = pts.reduce((a, p) => a.add(p), new V()).multiplyScalar(1 / pts.length);
    let sign = (mean[ax] - c0[ax]) >= 0 ? 1 : -1;
    if (CFG.hammerFlip) sign = -sign;
    const from = new V(); from[ax] = sign;
    obj.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(from, new V(0, -1, 0)));
    pts = samplePoints(holder, 8000);
    let b = new THREE.Box3().setFromPoints(pts), sz = b.getSize(new V());
    if (sz.z > sz.x) {   // cabeça larga de frente pra câmera
      obj.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new V(0, 1, 0), Math.PI / 2));
      pts = samplePoints(holder, 8000);
      b = new THREE.Box3().setFromPoints(pts); sz = b.getSize(new V());
    }
    const RX = CFG.hammerRot || [0, 0, 0];
    if (RX[0] || RX[1] || RX[2]) {   // giro extra calibrado (face achatada pra baixo)
      const d = Math.PI / 180;
      obj.quaternion.premultiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(RX[0] * d, RX[1] * d, RX[2] * d)));
      pts = samplePoints(holder, 8000);
      b = new THREE.Box3().setFromPoints(pts); sz = b.getSize(new V());
    }
    const lowY = b.min.y + sz.y * 0.2;
    let hx = 0, hz = 0, n = 0;
    pts.forEach(p => { if (p.y <= lowY) { hx += p.x; hz += p.z; n++; } });
    obj.position.set(-(n ? hx / n : 0), -(b.min.y + b.max.y) / 2, -(n ? hz / n : 0));
    const s = (anvilW * CFG.hammerSize) / sz.y;
    holder.scale.setScalar(s);
    return { holder, halfH: sz.y * s / 2 };
  }

  function ensureModels() {
    if (S.models) return Promise.resolve(S.models);
    if (S.loading) return S.loading;
    const prog = key => x => { S.prog[key] = x; };
    S.loading = lib().then(async () => {
      const a = await loadGlb('bigorna', prog('bigorna'));
      const h = await loadGlb('martelo', prog('martelo'));   // um de cada vez: poupa memória
      const anvil = prepAnvil(a);
      S.raw = { h };
      S.models = { anvil, hammer: prepHammer(h, anvil.width) };
      return S.models;
    }).catch(e => { S.loading = null; throw e; });
    return S.loading;
  }

  // ───────────── renderer / cena ─────────────
  function glowTexture(inner, outer) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, inner); gr.addColorStop(0.35, outer); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }

  function ensureRenderer() {
    if (S.r) return S.r;
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);

    // ambiente simples pro metal PBR não ficar escuro
    const envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(new THREE.BoxGeometry(12, 12, 12), new THREE.MeshBasicMaterial({ color: 0x2b2233, side: THREE.BackSide })));
    [[0xfff0d0, 9, [4, 5, 4], [3, 3, 0.2]], [0xc8d8ff, 4, [-5, 2, 3], [2, 4, 0.2]], [0xffc080, 6, [0, -5, 3], [5, 1, 0.2]]].forEach(([c, k, p, sz]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sz[0], sz[1], sz[2]), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) }));
      m.position.set(p[0], p[1], p[2]); m.lookAt(0, 0, 0); envScene.add(m);
    });
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(envScene, 0.04).texture; pm.dispose();

    const key = new THREE.DirectionalLight(0xfff0dd, 1.0); key.position.set(2, 4, 3); scene.add(key);
    const rim = new THREE.DirectionalLight(0xff8a3a, 0.7); rim.position.set(-3, 2, -3); scene.add(rim);
    const flashL = new THREE.PointLight(0xffa040, 0, 7, 2); scene.add(flashL);

    const ground = new THREE.Mesh(new THREE.CircleGeometry(2.8, 48),
      new THREE.MeshBasicMaterial({ map: glowTexture('rgba(255,170,70,0.9)', 'rgba(200,90,20,0.35)'), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = 0.003; scene.add(ground);

    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); S.r = null; });
    S.r = { canvas, renderer, scene, camera, flashL, ground, sparks: makeSparks(scene) };
    return S.r;
  }

  // ───────────── faíscas (3 estilos sorteados) ─────────────
  function makeSparks(scene) {
    const MAX = 800;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(MAX * 3), col = new Float32Array(MAX * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.085, map: glowTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0.55)'), vertexColors: true,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
    });
    const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; scene.add(pts);
    const P = [];
    const rnd = (a, b) => a + Math.random() * (b - a);

    function add(origin, vx, vy, vz, g, life) {
      if (P.length >= MAX) P.shift();
      P.push({ x: origin.x, y: origin.y, z: origin.z, vx, vy, vz, g, life, max: life });
    }
    const styles = [
      // 0 — EXPLOSÃO: sai em todas as direções
      (o, n) => { for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, e = rnd(-0.1, 1.0) * 1.2, sp = rnd(1.8, 4.4);
        add(o, Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp + 0.8, Math.sin(a) * Math.cos(e) * sp, 5.5, rnd(0.55, 1.1)); } },
      // 1 — FONTE: jato fino pra cima, cai em arco
      (o, n) => { for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, tilt = rnd(0, 0.5), sp = rnd(3.2, 5.8);
        add(o, Math.cos(a) * Math.sin(tilt) * sp, Math.cos(tilt) * sp, Math.sin(a) * Math.sin(tilt) * sp, 7.5, rnd(0.9, 1.45)); } },
      // 2 — ANEL + BRASAS: onda rasa ao redor da bigorna e brasas lentas subindo
      (o, n) => {
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + rnd(-0.1, 0.1), sp = rnd(2.0, 3.4);
          add(o, Math.cos(a) * sp, rnd(0.1, 0.9), Math.sin(a) * sp, 2.6, rnd(0.5, 0.95));
        }
        for (let i = 0; i < Math.round(n * 0.4); i++) add(o, rnd(-0.5, 0.5), rnd(0.7, 1.5), rnd(-0.5, 0.5), -0.5, rnd(1.2, 1.9));
      }
    ];
    return {
      styleCount: styles.length,
      burst(style, origin, n) { styles[style](origin, n); },
      update(dt, tint) {
        let n = 0;
        for (let i = P.length - 1; i >= 0; i--) {
          const p = P[i]; p.life -= dt;
          if (p.life <= 0) { P.splice(i, 1); continue; }
          p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
          if (p.y < 0.02 && p.g > 0) { p.y = 0.02; p.vy *= -0.3; p.vx *= 0.7; p.vz *= 0.7; }
        }
        P.forEach(p => {
          const t = p.life / p.max, k = Math.pow(t, 0.7) * (0.7 + 0.3 * Math.random()), core = t > 0.72 ? 0.45 : 0;
          pos[n * 3] = p.x; pos[n * 3 + 1] = p.y; pos[n * 3 + 2] = p.z;
          col[n * 3] = tint[0] * k + core; col[n * 3 + 1] = tint[1] * k + core; col[n * 3 + 2] = tint[2] * k + core * 0.7;
          n++;
        });
        geo.setDrawRange(0, n);
        geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
      },
      clear() { P.length = 0; geo.setDrawRange(0, 0); }
    };
  }

  // ───────────── a cena ─────────────
  function play(opt, applyFn) {
    return new Promise(resolve => {
      S.busy = true;
      try { sfxCtx(); loadSfx().catch(() => { try { sfxBase(); } catch (_) {} }); } catch (_) {}   // pré-carrega e decodifica o som (já no toque do botão)
      const N = opt.hits, tint = opt.tint;
      let applied = false, closed = false, raf = 0, started = 0, skipped = false;
      const apply = () => { if (applied) return; applied = true; try { applyFn(); } catch (e) { console.error('[Forja]', e); } };

      // overlay
      const ov = document.createElement('div');
      ov.id = 'forja-cine';
      ov.style.cssText = 'position:fixed;inset:0;z-index:99990;background:radial-gradient(ellipse at 50% 62%,#2a160a 0%,#0e0805 55%,#060403 100%);font-family:"Noto Serif JP",serif;color:#f0c040;opacity:0;transition:opacity .35s;overflow:hidden;touch-action:none;';
      ov.innerHTML = `
        <div style="position:absolute;top:calc(env(safe-area-inset-top,0px) + 22px);left:0;right:0;text-align:center;pointer-events:none;">
          <div style="font-size:.62rem;letter-spacing:5px;opacity:.7;">FORJA DE GOZEN</div>
          <div id="fc-title" style="font-size:1.05rem;letter-spacing:4px;margin-top:6px;">${opt.title}</div>
          <div id="fc-sub" style="font-size:.7rem;letter-spacing:3px;margin-top:8px;opacity:.85;">Aquecendo a forja…</div>
        </div>
        <div id="fc-flash" style="position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(circle at 50% 62%,#fff3c0 0%,rgba(255,170,60,.5) 35%,rgba(0,0,0,0) 70%);"></div>
        <button id="fc-skip" style="position:absolute;bottom:calc(env(safe-area-inset-bottom,0px) + 26px);left:50%;transform:translateX(-50%);font-family:inherit;font-size:.6rem;letter-spacing:3px;padding:7px 16px;background:transparent;border:1px solid rgba(200,150,10,.35);color:rgba(240,192,64,.6);">PULAR</button>`;
      document.body.appendChild(ov);
      requestAnimationFrame(() => { ov.style.opacity = '1'; });
      const sub = ov.querySelector('#fc-sub'), flash = ov.querySelector('#fc-flash');

      const cleanup = ok => {
        if (closed) return; closed = true;
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', onResize);
        ov.style.opacity = '0';
        setTimeout(() => {
          try {
            const r = S.r;
            if (r) { r.sparks.clear(); r.scene.remove(S.models.anvil.holder); r.scene.remove(S.models.hammer.holder); r.canvas.remove(); }
          } catch (_) {}
          ov.remove(); S.busy = false; resolve(ok);
        }, 400);
      };
      ov.querySelector('#fc-skip').addEventListener('click', () => {
        if (skipped) return; skipped = true; apply(); setTimeout(() => cleanup(true), 150);
      });

      // espera os modelos (com progresso e limite de tempo)
      const prog = setInterval(() => {
        const a = S.prog.bigorna, h = S.prog.martelo;
        const loaded = (a ? a.loaded : 0) + (h ? h.loaded : 0), total = (a ? a.total : 0) + (h ? h.total : 0);
        if (total) sub.textContent = 'Aquecendo a forja… ' + Math.min(99, Math.round(loaded / total * 50 + (h && h.loaded >= h.total ? 40 : 0))) + '%';
      }, 300);
      const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('tempo esgotado carregando a forja')), CFG.maxWait));
      Promise.race([ensureModels(), timeout]).then(models => {
        clearInterval(prog);
        if (skipped || closed) return;
        const R = ensureRenderer(), { renderer, scene, camera, flashL, ground, sparks, canvas } = R;
        ov.insertBefore(canvas, ov.firstChild);
        const fxCv = document.createElement('canvas');   // faíscas 2D por cima da cena 3D
        fxCv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
        ov.insertBefore(fxCv, canvas.nextSibling);
        const fxc = fxCv.getContext('2d');
        let fxW = 1, fxH = 1, fxDpr = 1;
        scene.add(models.anvil.holder); scene.add(models.hammer.holder);
        const strike = models.anvil.strike; let hm = models.hammer;
        let lift = hm.halfH * 2 * 0.9;
        sub.textContent = 'Golpe 0/' + N;
        sparks.clear();

        function onResizeInner() {
          const w = ov.clientWidth || window.innerWidth, h = ov.clientHeight || window.innerHeight;
          renderer.setSize(w, h, false); camera.aspect = w / h;
          fxDpr = Math.min(window.devicePixelRatio || 1, 2); fxW = w; fxH = h; fxCv.width = Math.round(w * fxDpr); fxCv.height = Math.round(h * fxDpr);
          // distância: a bigorna precisa caber na largura em tela de celular (retrato)
          camera.userData.R = Math.min(11, Math.max(4.6, 2.9 / (2 * Math.tan(17 * Math.PI / 180) * camera.aspect)));
          camera.updateProjectionMatrix();
        }
        onResize = onResizeInner; onResizeInner();
        window.addEventListener('resize', onResize);

        const IMPACT = 520, SWING_END = 1500, TAP_OK = 800;   // ms
        let shake = 0, last = 0, endAt = 0, vt = 0, speed = 1, camFront = false;
        let hits = 0, swing = null, done = false, hitstop = 0, cur = 0.55, lastSub = '';
        const awaken = !!opt.awaken;
        const rnd = (x, y) => x + Math.random() * (y - x);
        const FXP = [], FXE = [];
        const vtmp = new THREE.Vector3();

        function restart() { vt = 0; endAt = 0; hits = 0; swing = null; done = false; lastSub = ''; FXP.length = 0; FXE.length = 0; sparks.clear(); }

        // ── TELA DE TESTE: botões pra girar o martelo até a face achatada bater na bigorna ──
        if (opt.test) {
          const skipBtn = ov.querySelector('#fc-skip'); if (skipBtn) skipBtn.textContent = 'FECHAR';
          const panel = document.createElement('div');
          panel.className = 'fc-ui';
          panel.style.cssText = 'position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 64px);display:flex;flex-wrap:wrap;gap:6px;justify-content:center;padding:0 10px;z-index:3;';
          const out = document.createElement('div');
          out.style.cssText = 'width:100%;text-align:center;font:11px monospace;color:#f0c040;opacity:.9;user-select:all;';
          panel.appendChild(out);
          const show = () => { out.textContent = 'hammerFlip: ' + CFG.hammerFlip + ', hammerRot: [' + CFG.hammerRot.join(', ') + '], hammerTilt: ' + CFG.hammerTilt; };
          const rebuild = () => {
            scene.remove(hm.holder);
            const nh = prepHammer(S.raw.h, models.anvil.width);
            models.hammer = nh; hm = nh; lift = hm.halfH * 2 * 0.9;
            scene.add(hm.holder); show();
          };
          const mk = (label, fn) => {
            const bt = document.createElement('button');
            bt.textContent = label;
            bt.style.cssText = 'font-family:inherit;font-size:.62rem;letter-spacing:1px;padding:8px 10px;background:rgba(0,0,0,.45);border:1px solid rgba(200,150,10,.5);color:#f0c040;';
            bt.addEventListener('click', e => { e.stopPropagation(); fn(); });
            panel.appendChild(bt);
          };
          const rot = i => () => { CFG.hammerRot[i] = (CFG.hammerRot[i] + 90) % 360; rebuild(); };
          mk('Girar X 90°', rot(0)); mk('Girar Y 90°', rot(1)); mk('Girar Z 90°', rot(2));
          mk('Inverter', () => { CFG.hammerFlip = !CFG.hammerFlip; rebuild(); });
          mk('Zerar', () => { CFG.hammerFlip = false; CFG.hammerRot = [0, 0, 0]; rebuild(); });
          mk('Câmera lenta', () => { speed = speed === 1 ? 0.25 : 1; });
          mk('Congelar impacto', () => { if (speed === 0) { speed = 1; } else { restart(); swing = { t: IMPACT, h0: 0.55, fired: false }; speed = 0; } });
          mk('Vista de frente', () => { camFront = !camFront; });
          const tilts = [0.45, 0.25, 0];
          mk('Inclinação', () => { CFG.hammerTilt = tilts[(tilts.indexOf(CFG.hammerTilt) + 1) % tilts.length]; show(); });
          mk('Reiniciar', restart);
          ov.appendChild(panel); show();
        }

        // altura do martelo (0 = face na bigorna, 1 = no alto) durante um golpe iniciado pelo toque
        const swingH = s => {
          const t = s.t;
          if (t < 300) return lerp(s.h0, 1, ease.outCubic(t / 300));
          if (t < 400) return 1;
          if (t < IMPACT) return 1 - ease.inQuad((t - 400) / (IMPACT - 400));
          if (t < 720) return 0.28 * ease.outQuad((t - IMPACT) / (720 - IMPACT));
          if (t < SWING_END) return lerp(0.28, 0.55, ease.outCubic((t - 720) / (SWING_END - 720)));
          return 0.55;
        };

        // ── FAÍSCAS DE AÇO (2D por cima da cena) ──
        const proj = () => { vtmp.copy(strike).project(camera); return [(vtmp.x * 0.5 + 0.5) * fxW, (-vtmp.y * 0.5 + 0.5) * fxH]; };
        const pxPerUnit = () => fxH / (2 * Math.tan(17 * Math.PI / 180) * camera.userData.R);
        function sparkCol(a) {
          let r, g, b;
          if (!awaken) {
            if (a < 0.25) { const u = a / 0.25; r = 255; g = lerp(250, 200, u); b = lerp(215, 90, u); }
            else if (a < 0.6) { const u = (a - 0.25) / 0.35; r = 255; g = lerp(200, 110, u); b = lerp(90, 25, u); }
            else { const u = Math.min(1, (a - 0.6) / 0.4); r = lerp(255, 150, u); g = lerp(110, 30, u); b = lerp(25, 10, u); }
          } else {
            if (a < 0.25) { const u = a / 0.25; r = lerp(245, 205, u); g = lerp(235, 160, u); b = 255; }
            else if (a < 0.6) { const u = (a - 0.25) / 0.35; r = lerp(205, 150, u); g = lerp(160, 80, u); b = lerp(255, 235, u); }
            else { const u = Math.min(1, (a - 0.6) / 0.4); r = lerp(150, 60, u); g = lerp(80, 20, u); b = lerp(235, 120, u); }
          }
          return (r | 0) + ',' + (g | 0) + ',' + (b | 0);
        }
        const CORE = awaken ? ['255,250,255', '210,160,255', '120,60,220'] : ['255,252,225', '255,190,80', '255,100,20'];
        const FLARE = awaken ? ['200,150,255', '245,225,255'] : ['255,200,100', '255,240,200'];

        function burst(k, big) {
          const pt = proj(), x0 = pt[0], y0 = pt[1];
          const pxW = pxPerUnit() * 1.7, sc = pxW / 270;
          const grow = big ? 1.3 : 1;
          FXE.push({ t: 0, max: 0.2, draw: q => {
            const r = lerp(12, 95, ease.outCubic(q)) * sc * grow, yy = y0 - 4 * sc;
            const g = fxc.createRadialGradient(x0, yy, 0, x0, yy, r);
            g.addColorStop(0, 'rgba(' + CORE[0] + ',' + (1 - q) + ')');
            g.addColorStop(0.4, 'rgba(' + CORE[1] + ',' + (0.6 * (1 - q)) + ')');
            g.addColorStop(1, 'rgba(' + CORE[2] + ',0)');
            fxc.fillStyle = g; fxc.beginPath(); fxc.arc(x0, yy, r, 0, 7); fxc.fill();
          } });
          FXE.push({ t: 0, max: 0.28, draw: q => {
            const w = lerp(30, 250, ease.outCubic(q)) * sc * grow;
            const g = fxc.createLinearGradient(x0 - w, 0, x0 + w, 0);
            g.addColorStop(0, 'rgba(' + FLARE[0] + ',0)');
            g.addColorStop(0.5, 'rgba(' + FLARE[1] + ',' + (0.9 * (1 - q)) + ')');
            g.addColorStop(1, 'rgba(' + FLARE[0] + ',0)');
            fxc.fillStyle = g; fxc.fillRect(x0 - w, y0 - 2 * sc, w * 2, Math.max(2, 3 * sc));
          } });
          const n = Math.round((90 + 12 * k) * (big ? 1.4 : 1));
          for (let i = 0; i < n; i++) {
            const an = -Math.PI / 2 + rnd(-1.4, 1.4) * (Math.random() < 0.5 ? 1 : 0.6);
            const sp = rnd(130, 780) * sc * (Math.random() < 0.12 ? 1.35 : 1) * (big ? 1.12 : 1);
            FXP.push({ k: 's', x: x0 + rnd(-16, 16) * sc, y: y0 - 2 * sc, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, g: 950 * sc, d: 0.7, age: 0, max: rnd(0.5, 1.5), w: rnd(0.9, 2.5) * Math.max(0.8, sc), fx: x0, fy: y0, hf: 0.32 * pxW });
          }
          for (let i = 0; i < 20; i++) {
            const an = -Math.PI / 2 + rnd(-1.2, 1.2), sp = rnd(60, 260) * sc;
            FXP.push({ k: 'd', x: x0 + rnd(-10, 10) * sc, y: y0 - 2 * sc, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, g: 500 * sc, d: 0.9, age: 0, max: rnd(1, 2.2), w: rnd(2, 4.2) * Math.max(0.8, sc), fx: x0, fy: y0, hf: 0.32 * pxW });
          }
        }

        function fxStep(dt) {
          for (let i = FXP.length - 1; i >= 0; i--) {
            const p = FXP[i]; p.age += dt;
            if (p.age >= p.max) { FXP.splice(i, 1); continue; }
            p.vy += p.g * dt; const dr = Math.exp(-p.d * dt); p.vx *= dr; p.vy *= dr;
            p.x += p.vx * dt; p.y += p.vy * dt;
            if (p.vy > 0 && p.y > p.fy && Math.abs(p.x - p.fx) < p.hf) { p.y = p.fy; p.vy *= -rnd(0.25, 0.45); p.vx *= 0.82; }
          }
          for (let i = FXE.length - 1; i >= 0; i--) { const e = FXE[i]; e.t += dt; if (e.t >= e.max) FXE.splice(i, 1); }
        }
        function fxDraw() {
          fxc.setTransform(fxDpr, 0, 0, fxDpr, 0, 0);
          fxc.clearRect(0, 0, fxW, fxH);
          if (!FXP.length && !FXE.length) return;
          fxc.globalCompositeOperation = 'lighter';
          FXE.forEach(e => e.draw(e.t / e.max));
          FXP.forEach(p => {
            const a = p.age / p.max, al = a < 0.7 ? 1 : 1 - (a - 0.7) / 0.3, c = sparkCol(a);
            if (p.k === 's') {
              fxc.strokeStyle = 'rgba(' + c + ',' + al + ')'; fxc.lineWidth = p.w * (1 - a * 0.5); fxc.lineCap = 'round';
              fxc.beginPath(); fxc.moveTo(p.x - p.vx * 0.032, p.y - p.vy * 0.032); fxc.lineTo(p.x, p.y); fxc.stroke();
            } else {
              const r = p.w * (1 - a * 0.4);
              fxc.fillStyle = 'rgba(' + c + ',' + (al * 0.2) + ')'; fxc.beginPath(); fxc.arc(p.x, p.y, r * 3, 0, 7); fxc.fill();
              fxc.fillStyle = 'rgba(' + c + ',' + al + ')'; fxc.beginPath(); fxc.arc(p.x, p.y, r, 0, 7); fxc.fill();
            }
          });
          fxc.globalCompositeOperation = 'source-over';
        }

        function impact() {
          swing.fired = true; hits++;
          const big = hits >= N, k = hits - 1;
          burst(k, big);
          flashL.position.set(strike.x, strike.y + 0.35, strike.z + 0.4); flashL.intensity = big ? 9 : 5;
          shake = big ? 0.09 : 0.04 + 0.01 * k;
          flash.animate([{ opacity: big ? 0.75 : 0.35 }, { opacity: 0 }], { duration: big ? 420 : 240, easing: 'ease-out' });
          hitstop = big ? 0.09 : 0.05;
          try { if (navigator.vibrate) navigator.vibrate(big ? [30, 40, 70] : 25); } catch (_) {}
          if (big) {
            done = true; lastSub = 'Golpe ' + N + '/' + N; sub.textContent = lastSub; sub.style.opacity = '.9';
            apply(); endAt = vt + 1100;
          }
        }

        // toque na tela = um golpe. Sem toque, o martelo só fica parado no alto esperando.
        const tap = () => {
          if (done || closed) return;
          if (swing && swing.t < TAP_OK) return;
          swing = { t: 0, h0: cur, fired: false };
          scheduleHit(IMPACT);   // som sai alinhado: a batida do áudio cai no impacto do martelo
        };
        ov.addEventListener('pointerdown', ev => {
          if (ev.target && ev.target.closest && ev.target.closest('button,.fc-ui')) return;
          tap();
        });

        function frame(now) {
          raf = requestAnimationFrame(frame);
          if (!started) { started = now; last = now; }
          const real = Math.min(100, now - last); last = now;
          const frozen = hitstop > 0; hitstop = Math.max(0, hitstop - real / 1000);
          const adv = frozen ? 0 : real * speed, dt = adv / 1000;
          vt += adv; if (swing) swing.t += adv;
          try {
            const bob = 0.55 + 0.03 * Math.sin(vt / 180);
            let h = bob;
            if (swing) { if (swing.t >= SWING_END) swing = null; else h = swingH(swing); }
            cur = h;
            hm.holder.position.set(strike.x, strike.y + hm.halfH + h * lift, strike.z);
            hm.holder.rotation.z = -h * CFG.hammerTilt;
            if (swing && !swing.fired && swing.t >= IMPACT) impact();
            if (!done) {
              const prompt = !swing || swing.t >= TAP_OK;
              const want = prompt ? 'Toque na tela para bater · ' + hits + '/' + N : 'Golpe ' + (swing.fired ? hits : hits + 1) + '/' + N;
              if (want !== lastSub) { sub.textContent = want; lastSub = want; }
              sub.style.opacity = prompt ? (0.6 + 0.4 * Math.sin(vt / 260)) : 0.9;
            }
            flashL.intensity *= Math.pow(0.0008, dt);
            ground.material.opacity = 0.3 + Math.min(0.5, flashL.intensity * 0.08);
            shake *= Math.pow(0.002, dt);
            const a = camFront ? 0 : 0.45 + Math.sin(vt / 2200) * 0.12, Rr = camera.userData.R;
            camera.position.set(Math.sin(a) * Rr + (Math.random() - 0.5) * shake, 1.55 + (Math.random() - 0.5) * shake, Math.cos(a) * Rr);
            camera.lookAt(0, strike.y * 0.8 + 0.35, 0);
            sparks.update(dt, tint);
            renderer.render(scene, camera);
            fxStep(dt); fxDraw();
            if (endAt && vt >= endAt && !closed) { if (opt.test) restart(); else cleanup(true); }
          } catch (e) { console.error('[Forja] erro na cena', e); apply(); cleanup(true); }
        }
        raf = requestAnimationFrame(frame);
      }).catch(e => {
        clearInterval(prog);
        console.warn('[Forja] cinemática indisponível, aplicando direto:', e);
        if (opt.test && !closed) {   // no teste, mostra o erro na tela em vez de sumir calado
          sub.style.color = '#ff8a7a'; sub.textContent = 'ERRO: ' + ((e && e.message) || e) + ' — veja a pasta 3DI/';
          return;
        }
        if (!closed) { ov.remove(); closed = true; S.busy = false; resolve(false); }
      });

      var onResize = () => {};
    });
  }

  // ───────────── ligações com o jogo ─────────────
  // Captura o toque no botão "Forjar Ascensão"/"Despertar" ANTES do onclick original.
  // Roda a cinemática e, no último golpe, chama a função original do jogo.
  function erroTela(msg) {
    console.error('[Forja]', msg);
    try { if (typeof showOverlay === 'function') showOverlay('⚠ Forja: ' + msg, '#ff6b6b'); } catch (_) {}
  }

  function install() {
    document.addEventListener('click', ev => {
      const btn = ev.target && ev.target.closest ? ev.target.closest('.fga-cta.ready') : null;
      if (!btn) return;
      const m = (btn.getAttribute('onclick') || '').match(/(performAscension|performAwaken)\('([^']*)'\)/);
      if (!m) return;
      ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
      if (S.busy) return;
      const fnName = m[1], weaponId = m[2];
      const orig = window[fnName];
      if (typeof orig !== 'function') return erroTela(fnName + ' não existe');
      const awaken = fnName === 'performAwaken';
      const opt = awaken
        ? { title: 'DESPERTANDO A LÂMINA', hits: CFG.hitsAwaken, tint: [0.78, 0.45, 1.0], awaken: true }
        : { title: 'FORJANDO ASCENSÃO', hits: CFG.hits, tint: [1.0, 0.62, 0.18] };
      let applied = false;
      const apply = () => { if (applied) return; applied = true; orig.call(window, weaponId); };
      let p;
      try { p = play(opt, apply); } catch (e) { S.busy = false; erroTela(e.message || e); return apply(); }
      p.then(done => {
        if (done === false) erroTela('cinemática indisponível (modelos 3D não carregaram) — ascensão aplicada direto');
        if (!applied) apply();
      }).catch(e => { S.busy = false; erroTela(e.message || e); apply(); });
    }, true);

    // Ao abrir a tela de ascensão, já baixa os modelos em segundo plano
    const open = window.openAscensionPanel;
    if (typeof open === 'function' && !open.__forja) {
      const fn = function () {
        const r = open.apply(this, arguments);
        setTimeout(() => { ensureModels().catch(e => console.warn('[Forja] pré-carga:', e.message)); }, 600);
        return r;
      };
      fn.__forja = true; window.openAscensionPanel = fn;
    }
  }
  install();

  // ───────────── TESTE DO MARTELO (sem gastar material nem subir a arma) ─────────────
  // Abra  http://localhost:8000/gat-1.html#testeforja   (use # e não ?, o ? o servidor não repassa)
  // ou, no console do Eruda, digite:  testeForja()
  window.testeForja = function () {
    if (S.busy) return;
    play({ title: 'TESTE DO MARTELO', hits: CFG.hits, tint: [1.0, 0.62, 0.18], test: true }, function () {});
  };
  console.log('[Forja] teste do martelo disponível: digite testeForja()');
  if (/testeforja/i.test(location.search + location.hash)) {
    window.addEventListener('load', () => setTimeout(() => window.testeForja(), 1500));
  }
})();
