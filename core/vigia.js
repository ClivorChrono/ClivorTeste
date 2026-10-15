// ══════════════════════════════════════════════════════════════
//  VIGIA.JS — Chronicles of Clivor
//  Detector de bugs em tempo real.
//
//  Faz 3 coisas:
//   1) ERROS: captura erros de JavaScript, promessas quebradas e
//      arquivos que não carregaram (imagem/script/áudio com 404).
//   2) REGRAS DO JOGO: a cada 15 s, ao carregar e ANTES de salvar,
//      confere os dados do jogo (item de cópia única repetido,
//      quantidade inválida, stat NaN, item equipado no armazém...)
//      e conserta sozinho o que é seguro consertar.
//   3) RELATÓRIO: tudo fica guardado e dá pra ver/copiar:
//        vigiaPainel()      → abre um painel na tela
//        vigiaRelatorio()   → texto pronto pra copiar e me mandar
//        vigiaVerificar()   → força uma verificação agora
//      (também no console do Eruda: VIGIA.erros, VIGIA.achados)
//
//  Avisos na tela (notify) só aparecem com ?debug na URL, exceto
//  quando o vigia CONSERTA um dado do save (aí avisa sempre, 1x).
//  Não mexe em batalha: consertos esperam a batalha acabar.
//
//  Carregar DEPOIS de palDinh.js e armazem.js.
// ══════════════════════════════════════════════════════════════
'use strict';

(function () {
  const MODO_DEBUG = /[?&]debug\b/.test(location.search);
  const CHAVE_LOG = 'clivor_vigia_log';

  const VIGIA = {
    ativo: true,
    intervaloMs: 15000,
    erros: [],      // {k, tipo, msg, onde, n, quando}
    recursos: [],   // {k, src, n}
    achados: [],    // {k, check, msg, reparado, n, quando}
    registrar: null,
  };
  window.VIGIA = VIGIA;

  const agora = () => new Date().toLocaleTimeString('pt-BR');
  const _avisados = new Set();
  const G_ = () => (typeof G !== 'undefined' ? G : null);

  function _aviso(chave, texto, cor) {
    if (_avisados.has(chave)) return;
    _avisados.add(chave);
    try { if (typeof notify === 'function') notify(texto, cor || 'gold'); } catch (e) {}
  }

  // ── Log persistente (sobrevive a travamento) ──
  let _salvando = false;
  function _persistir() {
    if (_salvando) return;
    _salvando = true;
    setTimeout(() => {
      _salvando = false;
      try {
        localStorage.setItem(CHAVE_LOG, JSON.stringify({
          erros: VIGIA.erros.slice(-40),
          achados: VIGIA.achados.slice(-40),
        }));
      } catch (e) {}
    }, 1500);
  }

  function _push(lista, k, obj, max) {
    const ex = lista.find(x => x.k === k);
    if (ex) { ex.n++; ex.quando = agora(); return ex; }
    obj.k = k; obj.n = 1; obj.quando = agora();
    lista.push(obj);
    if (lista.length > max) lista.shift();
    return obj;
  }

  // Usado também pelo save_migracoes.js
  VIGIA.registrar = function (tipo, msg, onde) {
    const e = _push(VIGIA.erros, tipo + '|' + msg + '|' + (onde || ''), { tipo, msg, onde: onde || '' }, 100);
    if (e.n === 1 && MODO_DEBUG) _aviso('err|' + e.k, '🐞 ' + String(msg).slice(0, 80), 'red');
    _persistir();
  };

  // ───────────────────────────────────────────────────────────
  //  1) Captura de erros
  // ───────────────────────────────────────────────────────────
  window.addEventListener('error', (ev) => {
    const t = ev.target;
    if (t && t !== window && (t.src || t.href)) {
      const src = t.src || t.href;
      if (/^data:/.test(src)) return;
      const r = _push(VIGIA.recursos, src, { src }, 300);
      if (r.n === 1) _persistir();
      return;
    }
    const arq = (ev.filename || '').split('/').pop().split('?')[0];
    VIGIA.registrar('js', ev.message || 'erro', arq ? `${arq}:${ev.lineno}` : '');
  }, true);

  window.addEventListener('unhandledrejection', (ev) => {
    const r = ev.reason;
    VIGIA.registrar('promessa', (r && (r.message || String(r))) || 'promessa rejeitada', '');
  });

  // ───────────────────────────────────────────────────────────
  //  2) Regras do jogo
  // ───────────────────────────────────────────────────────────
  function _listas() {
    const g = G_();
    const out = [];
    if (g && g.player && Array.isArray(g.player.inventory)) out.push({ nome: 'bolsa', lista: g.player.inventory });
    if (g && g.armazem && Array.isArray(g.armazem.itens)) out.push({ nome: 'armazém', lista: g.armazem.itens });
    return out;
  }

  // Cada check: (reparar) → [{msg, reparado}]
  const CHECKS = [

    // Itens de cópia única (Amuleto de Tierra etc.): só 1 na bolsa + armazém
    { id: 'copia_unica', rodar(reparar) {
      const res = [];
      const ids = window.ITENS_COPIA_UNICA || [];
      ids.forEach(id => {
        const todos = [];
        _listas().forEach(L => L.lista.forEach(it => { if (it && it.id === id) todos.push({ L, it }); }));
        if (todos.length > 1) {
          const manter = todos.find(x => x.it.equipped) || todos[0];
          let removidos = 0, sobrou = 0;
          todos.forEach(x => {
            if (x === manter) return;
            if (x.it.equipped) { sobrou++; return; }
            if (reparar) {
              const k = x.L.lista.indexOf(x.it);
              if (k >= 0) { x.L.lista.splice(k, 1); removidos++; }
            }
          });
          const nome = manter.it.name || id;
          res.push({
            msg: `${nome}: ${todos.length} cópias (deveria ser 1)` + (sobrou ? ' — mais de uma equipada, não mexi' : ''),
            reparado: removidos > 0,
          });
        } else if (todos.length === 1 && (todos[0].it.qty || 1) > 1) {
          const qAntes = todos[0].it.qty;
          if (reparar) todos[0].it.qty = 1;
          res.push({ msg: `${todos[0].it.name || id}: quantidade ${qAntes} (deveria ser 1)`, reparado: reparar });
        }
      });
      return res;
    } },

    // Itens marcados unique:true: nunca mais de 1
    { id: 'unique_flag', rodar(reparar) {
      const res = [];
      const g = G_();
      if (!g || !g.player || !Array.isArray(g.player.inventory)) return res;
      const vistos = {};
      g.player.inventory.slice().forEach(it => {
        if (!it || !it.unique) return;
        if ((it.qty || 1) > 1) {
          const qAntes = it.qty;
          if (reparar) it.qty = 1;
          res.push({ msg: `${it.name || it.id} (único): quantidade ${qAntes}`, reparado: reparar });
        }
        if (vistos[it.id] && !it.equipped) {
          if (reparar) { const k = g.player.inventory.indexOf(it); if (k >= 0) g.player.inventory.splice(k, 1); }
          res.push({ msg: `${it.name || it.id} (único): cópia extra na bolsa`, reparado: reparar });
        }
        vistos[it.id] = true;
      });
      return res;
    } },

    // Entradas quebradas nas listas (null, sem id, quantidade inválida)
    { id: 'itens_invalidos', rodar(reparar) {
      const res = [];
      _listas().forEach(L => {
        for (let i = L.lista.length - 1; i >= 0; i--) {
          const it = L.lista[i];
          if (!it || !it.id) {
            if (reparar) L.lista.splice(i, 1);
            res.push({ msg: `${L.nome}: entrada sem id/vazia na posição ${i}`, reparado: reparar });
          } else if (typeof it.qty === 'number' && !isFinite(it.qty)) {
            if (reparar) it.qty = 1;
            res.push({ msg: `${L.nome}: ${it.name || it.id} com quantidade inválida`, reparado: reparar });
          } else if (typeof it.qty === 'number' && it.qty <= 0 && it.type !== 'equipamento') {
            if (reparar) L.lista.splice(i, 1);
            res.push({ msg: `${L.nome}: ${it.name || it.id} com quantidade ${it.qty}`, reparado: reparar });
          }
        }
      });
      return res;
    } },

    // Formato do armazém
    { id: 'armazem_formato', rodar(reparar) {
      const g = G_();
      if (!g || g.armazem === undefined || g.armazem === null) return [];
      if (typeof g.armazem === 'object' && Array.isArray(g.armazem.itens)) return [];
      if (reparar) g.armazem = { itens: [] };
      return [{ msg: 'G.armazem com formato inválido', reparado: reparar }];
    } },

    // Item guardado não pode estar marcado como equipado
    { id: 'equipado_no_armazem', rodar(reparar) {
      const res = [];
      const g = G_();
      if (!g || !g.armazem || !Array.isArray(g.armazem.itens)) return res;
      g.armazem.itens.forEach(it => {
        if (it && it.equipped) {
          if (reparar) delete it.equipped;
          res.push({ msg: `${it.name || it.id} no armazém estava marcado como equipado`, reparado: reparar });
        }
      });
      return res;
    } },

    // Stats com NaN/Infinity ou HP acima do máximo
    { id: 'stats', rodar(reparar) {
      const res = [];
      const g = G_();
      const p = g && g.player;
      if (!p) return res;
      ['hp', 'maxHp', 'mp', 'maxMp', 'atk', 'def', 'spd', 'mag', 'level'].forEach(k => {
        if (!(k in p)) return;
        const v = p[k];
        if (typeof v !== 'number' || !isFinite(v)) {
          let reparado = false;
          if (reparar && k === 'hp' && isFinite(p.maxHp)) { p.hp = p.maxHp; reparado = true; }
          if (reparar && k === 'mp' && isFinite(p.maxMp)) { p.mp = p.maxMp; reparado = true; }
          res.push({ msg: `Stat ${k} inválido (${String(v)})`, reparado });
        }
      });
      if (isFinite(p.hp) && isFinite(p.maxHp) && p.hp > p.maxHp) {
        const hpAntes = p.hp;
        if (reparar) p.hp = p.maxHp;
        res.push({ msg: `HP ${hpAntes} acima do máximo ${p.maxHp}`, reparado: reparar });
      }
      if (isFinite(p.mp) && isFinite(p.maxMp) && p.mp > p.maxMp) {
        if (reparar) p.mp = p.maxMp;
        res.push({ msg: `MP acima do máximo`, reparado: reparar });
      }
      return res;
    } },

    // Dois itens equipados no mesmo slot — só AVISA (desequipar por flag
    // sem reverter bônus deixaria stat preso, então não mexo sozinho)
    { id: 'slot_duplicado', rodar() {
      const res = [];
      const g = G_();
      if (!g || !g.player || !Array.isArray(g.player.inventory)) return res;
      const porSlot = {};
      g.player.inventory.forEach(it => {
        if (!it || !it.equipped || !it.equipSlot || it.id === 'amuleto_yuki') return;
        const slot = (it.equipSlot === 'weapon') ? 'arma' : it.equipSlot;
        (porSlot[slot] = porSlot[slot] || []).push(it.name || it.id);
      });
      Object.keys(porSlot).forEach(s => {
        if (porSlot[s].length > 1) res.push({ msg: `Slot ${s}: ${porSlot[s].length} itens equipados (${porSlot[s].join(', ')})`, reparado: false });
      });
      return res;
    } },
  ];

  function vigiaVerificar(origem) {
    if (!VIGIA.ativo || !G_() || !G_().player) return [];
    const emBatalha = !!G_().inBattle;
    const reparar = !emBatalha; // em batalha só observa
    const novos = [];
    let mudou = false;

    CHECKS.forEach(c => {
      let achados = [];
      try { achados = c.rodar(reparar) || []; }
      catch (e) { VIGIA.registrar('vigia', `check ${c.id} falhou: ${e && e.message}`, ''); }
      achados.forEach(a => {
        const e = _push(VIGIA.achados, c.id + '|' + a.msg, { check: c.id, msg: a.msg, reparado: !!a.reparado }, 100);
        if (a.reparado) mudou = true;
        if (e.n === 1) novos.push(e);
        if (a.reparado) _aviso('rep|' + e.k, '🛠 Vigia consertou: ' + a.msg, 'gold');
        else if (MODO_DEBUG) _aviso('ach|' + e.k, '⚠ Vigia: ' + a.msg, 'red');
      });
    });

    if (mudou) {
      try { if (typeof buildInventoryGrid === 'function') buildInventoryGrid(); } catch (e) {}
      try { if (typeof updateHUD === 'function') updateHUD(); } catch (e) {}
    }
    if (novos.length) _persistir();
    return novos;
  }
  window.vigiaVerificar = vigiaVerificar;

  // ───────────────────────────────────────────────────────────
  //  3) Relatório e painel
  // ───────────────────────────────────────────────────────────
  function vigiaRelatorio() {
    const g = G_();
    const L = [];
    L.push('=== VIGIA — Chronicles of Clivor ===');
    L.push(`Hora: ${agora()} | Save v${g && g._saveVersion} | Classe: ${g && g.player && g.player.class}`);
    L.push('');
    L.push(`ERROS (${VIGIA.erros.length}):`);
    VIGIA.erros.forEach(e => L.push(`- [${e.tipo}] ${e.msg} ${e.onde ? '@ ' + e.onde : ''} (x${e.n}, ${e.quando})`));
    L.push('');
    L.push(`ACHADOS NOS DADOS (${VIGIA.achados.length}):`);
    VIGIA.achados.forEach(a => L.push(`- [${a.check}] ${a.msg} ${a.reparado ? '(consertado)' : '(só aviso)'} x${a.n}`));
    L.push('');
    L.push(`ARQUIVOS QUE NÃO CARREGARAM (${VIGIA.recursos.length}):`);
    VIGIA.recursos.slice(0, 40).forEach(r => L.push(`- ${r.src} (x${r.n})`));
    return L.join('\n');
  }
  window.vigiaRelatorio = vigiaRelatorio;

  function vigiaPainel() {
    const antigo = document.getElementById('vigia-painel');
    if (antigo) { antigo.remove(); return; }
    const ov = document.createElement('div');
    ov.id = 'vigia-painel';
    ov.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;padding:10px;';
    const esc = t => String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    ov.innerHTML = `
      <div style="background:#0f0a04;border:1px solid rgba(200,150,10,0.5);width:100%;max-width:440px;height:88vh;display:flex;flex-direction:column;padding:12px;box-sizing:border-box;font-family:'Noto Serif JP',serif;color:#f0c040;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <b style="letter-spacing:2px;">🐞 VIGIA</b>
          <button id="vg-x" style="background:transparent;border:1px solid rgba(200,150,10,0.4);color:#f0c040;width:30px;height:30px;">✕</button>
        </div>
        <pre id="vg-txt" style="flex:1;overflow:auto;margin:0;font-size:0.62rem;line-height:1.5;white-space:pre-wrap;color:rgba(255,255,255,0.85);background:rgba(255,255,255,0.03);padding:8px;">${esc(vigiaRelatorio())}</pre>
        <div style="display:flex;gap:6px;margin-top:8px;">
          <button id="vg-ver" style="flex:1;padding:9px;background:rgba(200,150,10,0.16);border:1px solid rgba(200,150,10,0.55);color:#f0c040;">VERIFICAR</button>
          <button id="vg-cp" style="flex:1;padding:9px;background:rgba(200,150,10,0.16);border:1px solid rgba(200,150,10,0.55);color:#f0c040;">COPIAR</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    const atualiza = () => { document.getElementById('vg-txt').textContent = vigiaRelatorio(); };
    ov.querySelector('#vg-x').onclick = () => ov.remove();
    ov.querySelector('#vg-ver').onclick = () => { vigiaVerificar('painel'); atualiza(); };
    ov.querySelector('#vg-cp').onclick = () => {
      const t = vigiaRelatorio();
      try { navigator.clipboard.writeText(t).then(() => _aviso('cp' + Date.now(), '📋 Relatório copiado!', 'gold')); }
      catch (e) { const ta = document.getElementById('vg-txt'); const r = document.createRange(); r.selectNodeContents(ta); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
    };
  }
  window.vigiaPainel = vigiaPainel;

  // ── Ciclo automático ──
  setInterval(() => { try { vigiaVerificar('ciclo'); } catch (e) {} }, VIGIA.intervaloMs);
})();
