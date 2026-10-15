// ══════════════════════════════════════════════════════════════════════════════
//  CHRONICLES OF CLIVOR — merito_system.js
//  Sistema de Mérito com 7 Níveis
//  A cada nível, os inimigos da floresta ficam um pouco mais fortes em HP e ATK
//  (curva suave — máximo 3.0× no nível mais alto, não mais exponencial/128×)
// ══════════════════════════════════════════════════════════════════════════════

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  1. NÍVEIS DE MÉRITO (0–7)
// ─────────────────────────────────────────────────────────────────────────────

const MERITO_NIVEIS = [
  { level: 0, name: 'Hostil',                minPts: 0,    maxPts: 39,   emoji: '😠', multiplicador: 1.0 },
  { level: 1, name: 'Neutro',                minPts: 40,   maxPts: 79,   emoji: '😐', multiplicador: 1.15 },
  { level: 2, name: 'Conhecido',             minPts: 80,   maxPts: 119,  emoji: '🙂', multiplicador: 1.3 },
  { level: 3, name: 'Respeitado',            minPts: 120,  maxPts: 159,  emoji: '😊', multiplicador: 1.5 },
  { level: 4, name: 'Admirado',              minPts: 160,  maxPts: 199,  emoji: '😍', multiplicador: 1.75 },
  { level: 5, name: 'Herói do Vilarejo',     minPts: 200,  maxPts: 239,  emoji: '🌟', multiplicador: 2.0 },
  { level: 6, name: 'Lendário',              minPts: 240,  maxPts: 279,  emoji: '👑', multiplicador: 2.5 },
  { level: 7, name: 'Lendário Completo',     minPts: 280,  maxPts: 999,  emoji: '💎', multiplicador: 3.0 },
];

// ─────────────────────────────────────────────────────────────────────────────
//  2. AUXILIARES: Obter nível e dados de mérito
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna o nível de mérito atual (0–7) baseado em G.reputation
 */
function getMeritoLevel(repPoints = null) {
  const pts = repPoints !== null ? repPoints : (G.reputation || 0);
  const nivel = MERITO_NIVEIS.find(n => pts >= n.minPts && pts <= n.maxPts);
  return nivel || MERITO_NIVEIS[0];
}

/**
 * Retorna os dados completos do nível de mérito (name, emoji, multiplicador)
 */
function getMeritoData(repPoints = null) {
  return getMeritoLevel(repPoints);
}

/**
 * Retorna apenas o multiplicador (1.0, 2.0, 4.0, ..., 128.0)
 */
function getMeritoMultiplier(repPoints = null) {
  return getMeritoLevel(repPoints).multiplicador;
}

// ─────────────────────────────────────────────────────────────────────────────
//  3. APLICAR MODIFICADOR AOS INIMIGOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Clona um inimigo e aplica o modificador de mérito ao HP e ATK
 * Mantém todos os outros stats originais
 * 
 * Uso:
 *   const enemyModificado = applyMeritModifierToEnemy(enemyOriginal);
 *   showEnemy(enemyModificado);
 *   startBattle(enemyModificado);
 */
function applyMeritModifierToEnemy(enemy) {
  if (!enemy) return enemy;
  
  // Clone completo do inimigo
  const modified = JSON.parse(JSON.stringify(enemy));
  
  // Só aplica se o mérito for > 0
  const multiplier = getMeritoMultiplier();
  if (multiplier <= 1.0) return modified;
  
  // Aplicar modificador: HP e ATK escalam com o mérito (curva suave, até 3×)
  modified.hp = Math.ceil(enemy.hp * multiplier);
  modified.atk = Math.ceil(enemy.atk * multiplier);
  
  // Opcional: também escalar XP e GOLD (vem mais forte, vale mais)
  // Descomente se quiser que o inimigo forneça mais recompensas em mérito alto:
  // modified.xp = Math.ceil(enemy.xp * multiplier);
  // modified.gold = Math.ceil(enemy.gold * multiplier);
  
  return modified;
}

// ─────────────────────────────────────────────────────────────────────────────
//  4. GANHO/PERDA DE MÉRITO EM BATALHA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aplicar ganho de mérito ao derrotar inimigo
 * Chance de 25% de DOBRAR quantidade de loot
 */
function applyMeritOnVictory(enemy) {
  if (!enemy) return;
  
  const meritoData = getMeritoData();
  
  // Ganho padrão: +2 pontos por inimigo normal, +15 por boss
  let meritoGanho = enemy.isBoss ? 15 : 2;
  
  if (typeof addReputation === 'function') {
    addReputation(meritoGanho, `Derrotou ${enemy.name} em mérito ${meritoData.level}`);
  }
  
  // Chance 25% de dobrar loot
  if (Math.random() < 0.25) {
    appendBattleLog('✨ Bênção do Vilarejo: Loot DOBRADO!', '#FFD700');
    notify('✨ 25% de sorte! Loot dobrado!', 'gold');
    
    // Multiplicar quantidade de itens no loot do inimigo
    if (enemy.loot && Array.isArray(enemy.loot)) {
      enemy.loot.forEach(l => {
        if (l.qty) l.qty *= 2;
        else l.qty = 2;
      });
    }
  }
}

/**
 * Aplicar perda de mérito ao ser derrotado
 * Inimigos da floresta: -3 pontos
 * Boss (Tierra, etc): -10 pontos
 */
function applyMeritOnDefeat(enemy) {
  if (!enemy) return;
  
  const meritoData = getMeritoData();
  
  // Perda padrão: -3 pontos por derrota normal, -10 por boss
  let meritoPerdido = enemy.isBoss ? 10 : 3;
  
  if (typeof addReputation === 'function') {
    addReputation(-meritoPerdido, `Derrota para ${enemy.name} em mérito ${meritoData.level}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  5. EXIBIR STATUS ATUAL DO MÉRITO (no HUD ou em popup)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna string formatada do mérito atual
 * Exemplo: "😐 Neutro (40/79 pts)"
 */
function getMeritoStatusText() {
  const data = getMeritoData();
  const pts = G.reputation || 0;
  return `${data.emoji} ${data.name} (${pts}/${data.maxPts} pts)`;
}

/**
 * Retorna progresso visual em barras (ex: "████░░░ 50%")
 */
function getMeritoProgressBar(length = 8) {
  const data = getMeritoData();
  const pts = G.reputation || 0;
  const progress = (pts - data.minPts) / (data.maxPts - data.minPts);
  const filled = Math.round(progress * length);
  const empty = length - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const pct = Math.round(progress * 100);
  return `${bar} ${pct}%`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  6. ESCALA VISUAL: Mostrar impacto dos inimigos escalados
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna array de 7 níveis com HP/ATK base e modificados
 * Útil pra debugging ou mostrar ao jogador como o sistema funciona
 */
function getMeritoScalePreview(baseEnemy) {
  if (!baseEnemy) return [];
  
  return MERITO_NIVEIS.map(nivel => ({
    level: nivel.level,
    name: nivel.name,
    emoji: nivel.emoji,
    hpBase: baseEnemy.hp,
    hpModificado: Math.ceil(baseEnemy.hp * nivel.multiplicador),
    atkBase: baseEnemy.atk,
    atkModificado: Math.ceil(baseEnemy.atk * nivel.multiplicador),
  }));
}

/**
 * Log visual (console) mostrando escala exponencial
 * getMeritoScaleLog(INIMIGOS_FLORESTA[0]) // Mostra escala do Rato
 */
function getMeritoScaleLog(enemy) {
  if (!enemy) return;
  const preview = getMeritoScalePreview(enemy);
  console.table(preview);
}

console.log('✓ Sistema de Mérito (7 níveis exponenciais) carregado');
