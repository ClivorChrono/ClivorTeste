/* rig_player.js — Chronicles of Clivor
   Player leve para os rigs exportados pelo Rig Editor (rig-editor.html).
   Não depende de nada além de Canvas 2D puro — sem libs externas.

   USO BÁSICO
   ----------
   const rp = new RigPlayer(document.getElementById('meuCanvas'));
   rp.load(projectJSON, () => {
     // projeto carregado, imagens prontas — já aplica a pose "idle" se existir
     rp.tweenTo('attack', 180, () => rp.tweenTo('idle', 220));
   });

   'projectJSON' é exatamente o objeto exportado pelo Rig Editor
   (o mesmo formato do .json baixado por lá).
*/
(function (global) {
  'use strict';

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  class RigPlayer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.stageSize = 320;
      this.refHeight = 120;
      this.layers = [];       // { id, name, z, img, natW, natH, pivU, pivV, x, y, rot, scale, visible, parentId }
      this.poses = {};        // { poseName: { layerId: {x,y,rot,scale} } }
      this.currentPose = null;
      this.raf = null;
      this.loaded = false;
      this._pendingImages = 0;
      this._onReady = null;
    }

    // Carrega um projeto (objeto já parseado, não o texto do .json).
    // cb(rigPlayer) é chamado quando todas as imagens já carregaram.
    load(project, cb) {
      this.stop();
      this.stageSize = project.stageSize || 320;
      this.refHeight = project.refHeight || 120;
      this.poses = project.poses || {};
      this.layers = [];
      this.currentPose = null;
      this.loaded = false;
      this._onReady = cb || null;
      this._setupCanvas();

      const list = project.layers || [];
      this._pendingImages = list.length;
      if (!list.length) { this._ready(); return; }

      list.forEach(pl => {
        const img = new Image();
        const layer = {
          id: pl.id, name: pl.name, z: pl.z,
          img, natW: 1, natH: 1,
          pivU: pl.pivU != null ? pl.pivU : 0.5,
          pivV: pl.pivV != null ? pl.pivV : 0.5,
          x: this.stageSize / 2, y: this.stageSize / 2, rot: 0, scale: 1,
          visible: true,
          parentId: pl.parentId || null,
        };
        const done = () => {
          this._pendingImages--;
          if (this._pendingImages <= 0) this._ready();
        };
        img.onload = () => { layer.natW = img.naturalWidth; layer.natH = img.naturalHeight; done(); };
        img.onerror = done; // imagem faltando não deve travar o carregamento do resto
        img.src = pl.src;
        this.layers.push(layer);
      });
    }

    _ready() {
      this.loaded = true;
      if (this.poses.idle) this.setPose('idle');
      this.draw();
      if (this._onReady) this._onReady(this);
    }

    _setupCanvas() {
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = this.stageSize * dpr;
      this.canvas.height = this.stageSize * dpr;
      this.canvas.style.width = this.stageSize + 'px';
      this.canvas.style.height = this.stageSize + 'px';
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    hasPose(name) { return !!this.poses[name]; }

    _getLayerById(id) { return this.layers.find(l => l.id === id); }

    // Matriz-mundo de uma camada: compõe sua transformação local com a do pai,
    // recursivamente (mesma lógica do Rig Editor). Guarda contra ciclos.
    _worldMatrix(layer, visited) {
      visited = visited || new Set();
      const local = new DOMMatrix()
        .translate(layer.x, layer.y)
        .rotate(layer.rot)
        .scale(layer.scale, layer.scale);
      if (layer.parentId && !visited.has(layer.id)) {
        const parent = this._getLayerById(layer.parentId);
        if (parent) {
          visited.add(layer.id);
          return this._worldMatrix(parent, visited).multiply(local);
        }
      }
      return local;
    }

    // Aplica uma pose instantaneamente (sem transição).
    setPose(name) {
      const snap = this.poses[name];
      if (!snap) return false;
      this.layers.forEach(l => {
        const t = snap[l.id];
        if (t) { l.x = t.x; l.y = t.y; l.rot = t.rot; l.scale = t.scale; }
      });
      this.currentPose = name;
      this.draw();
      return true;
    }

    draw() {
      const ctx = this.ctx, H = this.refHeight;
      ctx.clearRect(0, 0, this.stageSize, this.stageSize);
      const sorted = this.layers.slice().sort((a, b) => a.z - b.z);
      sorted.forEach(l => {
        if (!l.visible || !l.img.complete || !l.natW) return;
        const dispW = H * (l.natW / l.natH);
        const m = this._worldMatrix(l);
        ctx.save();
        ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f);
        ctx.drawImage(l.img, -dispW * l.pivU, -H * l.pivV, dispW, H);
        ctx.restore();
      });
    }

    stop() {
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = null;
    }

    // Anima suavemente da pose atual até 'poseName'. Se ainda não há pose atual,
    // aplica direto (sem transição) — evita "vir do nada" no primeiro uso.
    tweenTo(poseName, durMs, cb) {
      const to = this.poses[poseName];
      if (!to) { if (cb) cb(); return; }
      const from = this.currentPose ? this.poses[this.currentPose] : null;
      if (!from) { this.setPose(poseName); if (cb) cb(); return; }

      this.stop();
      const start = performance.now();
      const dur = durMs != null ? durMs : 220;
      const step = (now) => {
        const t = Math.min(1, (now - start) / dur);
        const e = easeOutCubic(t);
        this.layers.forEach(l => {
          const a = from[l.id], b = to[l.id];
          if (!a || !b) return;
          l.x = a.x + (b.x - a.x) * e;
          l.y = a.y + (b.y - a.y) * e;
          l.rot = a.rot + (b.rot - a.rot) * e;
          l.scale = a.scale + (b.scale - a.scale) * e;
        });
        this.draw();
        if (t < 1) {
          this.raf = requestAnimationFrame(step);
        } else {
          this.currentPose = poseName;
          this.raf = null;
          if (cb) cb();
        }
      };
      this.raf = requestAnimationFrame(step);
    }

    // Toca uma sequência de poses em cadeia, ex: ['prepare','attack','recover','idle']
    playSequence(poseNames, durMs, onDone) {
      this.stop();
      let i = 0;
      const next = () => {
        if (i >= poseNames.length) { if (onDone) onDone(); return; }
        this.tweenTo(poseNames[i++], durMs, next);
      };
      next();
    }
  }

  global.RigPlayer = RigPlayer;

})(typeof window !== 'undefined' ? window : this);
