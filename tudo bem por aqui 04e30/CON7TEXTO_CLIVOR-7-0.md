# 📜 CHRONICLES OF CLIVOR — CONTEXTO COMPLETO DO JOGO
**Versão do contexto: 7.0 — Sessão 8**

---

## ⚠️ REGRA ABSOLUTA PARA QUALQUER IA LENDO ESTE ARQUIVO

> **LEIA ISTO ANTES DE QUALQUER COISA. NÃO PULE.**

### 🔒 PRESERVAÇÃO TOTAL DE CÓDIGO — PROIBIDO REMOVER OU REESCREVER

Este projeto foi construído em múltiplas sessões. Cada função, cada sistema, cada bloco de lógica foi desenvolvido, testado e corrigido com esforço real. Qualquer IA que edite este projeto deve seguir as regras abaixo **sem exceção**:

#### ❌ NUNCA faça isso:
- **Nunca reescreva um arquivo inteiro** para fazer uma pequena mudança.
- **Nunca remova código de uma classe para trabalhar em outra.**
- **Nunca "simplifique" ou "limpe" código existente** sem ser explicitamente pedido.
- **Nunca remova um if/else, um handler de skill, uma função de talento, uma entrada de ENEMY_AI, ou qualquer bloco de dados** sem autorização explícita.
- **Nunca assuma que código antigo está "quebrado" só porque você não entende o contexto.**

#### ✅ SEMPRE faça isso:
- **Edições cirúrgicas:** identifique exatamente onde a mudança ocorre e altere só aquele trecho.
- **Antes de editar qualquer arquivo**, leia-o por completo.
- **Se uma função já existe**, modifique-a. Não crie uma segunda versão.
- **Ao adicionar nova classe, skill, inimigo ou talento**, faça de forma aditiva.

---

## 🗂 ESTRUTURA DE ARQUIVOS

```
/
├── gat-1.html              → HTML principal (estrutura, CSS, telas) ~1394 linhas
├── palDinh.js              → JS principal (toda lógica do jogo) ~3226 linhas
├── talent_system-1.js      → Sistema de talentos + hooks de batalha ~1289 linhas
├── audio/
│   ├── intro.mp3
│   └── floresta.mp3
└── Imagens/
    ├── capa.png
    ├── erva.png
    ├── c1.png / c2.png / c3.png
    ├── icones/
    │   ├── palaicon.png        → Ícone real do Paladino (substitui emoji)
    │   └── EscudoDivin.png     → Ícone do buff Escudo Divino (painel lateral)
    └── personagens/
        ├── rato.png            → Spritesheet do Rato das Sombras (1536x1024, 3x3)
        └── paladino/
            ├── Martelo.png
            ├── Paladino.png
            ├── JulgamentoProfano.png
            ├── AuraProtetora.png
            ├── paladino_spritesheet.png  → Spritesheet ATAQUE (192x64, 3 frames, fundo transparente)
            └── sheetDef.png              → Spritesheet DEFESA (192x64, 3 frames, fundo TRANSPARENTE)
```

---

## 🎮 FLUXO DE TELAS

```
[INTRO] → [NARRATIVA CINEMATOGRÁFICA] → [SELEÇÃO DE CLASSE] → [JOGO]
```

- **Intro** (#screen-intro): capa.png + partículas + botão iniciar/continuar
- **Narrativa** (#intro-fase-narrativa): 4 cenas, typewriter, crossfade
- **Classe** (#screen-class): 6 cards → confirmClass() → jogo
- **Jogo** (#screen-game): HUD + painel cena + sidebar + ciclo dia/noite (20min = 1 dia)

---

## ⚙️ ESTADO GLOBAL (objeto G)

```js
G = {
  saveSlot: 1,
  location: 'floresta',
  dogDefeated: false,
  enemiesDefeated: 0,
  inBattle: false,
  currentEnemy: null,
  player: {
    name, class, classData, level, xp, xpNext,
    hp, maxHp, mp, maxMp, ap, maxAp,
    atk, def, spd, mag, gold, kills, deaths,
    inventory[], equippedWeapon, equipped{},
    maxWeight: 50, statusEffects[],
    talents[], talentPtTotal,
    battlesTotal
  }
}
```

---

## 💾 SISTEMA DE SAVE

- 4 slots → localStorage com chave clivor_save_N
- SAVE_VERSION = 2
- Volume e mute: clivor_volume, clivor_muted

---

## 🎵 SISTEMA DE ÁUDIO (AudioSys)

- intro → audio/intro.mp3 | floresta → audio/floresta.mp3
- Unlock no 1º clique; crossfade simples

---

## 🧙 CLASSES (6)

| Classe     | Recurso | HP  | ATQ | DEF | VEL | MAG | Arma Inicial          |
|------------|---------|-----|-----|-----|-----|-----|-----------------------|
| Guerreiro  | AP 100  | 120 | 14  | 10  | 6   | 0   | Espada Simples        |
| Mago       | MP 100  | 70  | 5   | 3   | 7   | 18  | Cajado de Novato      |
| Paladino   | AP 100  | 115 | 11  | 12  | 5   | 0   | Maca Sagrada          |
| Assassino  | AP 100  | 85  | 12  | 5   | 15  | 0   | Adaga Sombria         |
| Arqueiro   | AP 100  | 90  | 11  | 6   | 11  | 0   | Arco Rustico          |
| Monge      | MP 60   | 100 | 10  | 8   | 9   | 8   | Luvas de Chi          |

### Skills do Paladino — verificadas e funcionando (Sessão 7):

**Escudo Divino (20AP)** → dmg:'shield'
- bs._shieldActive = true + cura 10HP imediata
- calcEnemyDmg aplica ×0.20 no próximo dano e reseta _shieldActive
- Não pode ser reativado enquanto estiver ativo (bloqueado em doBattleAction)
- Badge: "ESCUDO" aparece no status do herói

**Golpe Sagrado (22AP)** → dmg:'ATQ×1.6+heal'
- Match: dmgStr.includes('ATQ×1.6') && dmgStr.includes('heal')
- Dano: ATQ×1.6 com ignore parcial armadura (÷4 em vez de ÷3)
- Cura: max(10, maxHp×0.18) HP

**Aura Protetora (35AP)** → dmg:'aura'
- Cura: max(15, maxHp×0.30) HP
- DEF +6 por 3 turnos (bs._buffDefAmt=6, bs._buffDefTurns=3)
- Não pode ser reativada enquanto ativa (bloqueado)
- Expira com log "Aura Protetora expirou. DEF voltou ao normal."
- Badge: "DEF+6×T" aparece no status do herói

---

## 🔒 SISTEMA DE LIMITE DE BUFFS (Sessão 7)

Máximo de 3 buffs de suporte simultâneos. Buffs contados por countActiveSupportBuffs(bs):
- bs._shieldActive → Escudo Divino ativo
- bs._buffDefTurns > 0 → Aura Protetora ativa
- bs._buffAtkTurns > 0 → buff de ATQ ativo

Verificações em doBattleAction (antes de descontar custo):
1. isSupportSkill && countActiveSupportBuffs >= 3 → "Limite de 3 buffs ativos atingido!"
2. shield já ativo → "Escudo Divino já está ativo!"
3. aura já ativa → "Aura Protetora já está ativa! (Xt restantes)"

---

## 🎨 SISTEMA DE SPRITES DE BATALHA

### Arquitetura (palDinh.js)

```js
const _heroKFInjected = {};
function _ensureHeroKeyframe(kid, offsetX, animW) { ... }
function buildHeroVisual(size, animName) { ... }
function setHeroAnim(animName, revertAfterMs) { ... }
```

### Paladino — Spritesheets

paladino_spritesheet.png — Ataque/Idle (fundo TRANSPARENTE)
192x64px | 3 cols × 1 row | frame = 64x64
col 0 → idle | col 1 → prepare | col 1→2 → attack (2 frames, 8fps)

sheetDef.png — Defesa (fundo TRANSPARENTE)
192x64px | 3 cols × 1 row | frame = 64x64
col 0 → idle-defesa | col 1→2 → defend (2 frames, 8fps)

### Regras de animação

| Evento                  | Spritesheet          | Animação |
|-------------------------|----------------------|----------|
| Batalha inicia          | paladino_spritesheet | idle     |
| Jogador ataca           | paladino_spritesheet | attack   |
| Jogador aperta Defender | sheetDef             | defend   |
| Usa Escudo Divino       | sheetDef             | defend   |
| Jogador recebe dano     | — (só flash opacity) | —        |

### buildHeroVisual — lógica atual
```js
const defAnims = ['defend', 'hit', 'hit2', 'recover'];
const s = (cls.spriteDef && defAnims.includes(animName)) ? cls.spriteDef : cls.sprite;
// position-y: -30px (fixo para os dois spritesheets)
```

### flashDamage — lógica atual
```js
// Usa opacity (0.2 → 1 → 0.4 → 1) em vez de filter
// Evita resetar o drop-shadow do sprite filho
```

---

## 🛡️ PAINEL DE BUFFS DE BATALHA (Sessão 7)

```html
<div class="skill-battle-area">
  <div class="skill-battle-btns" id="skill-battle-btns"></div>
  <div class="skill-buff-panel" id="skill-buff-panel"></div>
</div>
```

CSS:
- .skill-buff-panel → width:90px, sem borda, justify-content:center
- .buff-entry img → 72×72px + animação buff-pulse com drop-shadow dourado

Funções JS:
- _showBuffPanel(id, imgSrc, label) → cria entrada no painel com fade-in
- _hideBuffPanel(id) → remove com fade-out
- showShieldEffect() → mostra #shield-effect sobre sprite + _showBuffPanel('escudo-divino', ...)
- hideShieldEffect() → oculta ambos

Badges de status do herói (buildStatusBadges):
- _buffAtkTurns > 0 → badge ATQ+Amt×Turns
- _buffDefTurns > 0 → badge DEF+Amt×Turns
- _shieldActive → badge ESCUDO

---

## 🗂️ OVERLAY UNIFICADO — TALENTOS + FICHA (Sessão 8)

A Ficha do Herói foi integrada como aba dentro do overlay de Talentos. O `#char-overlay` ainda existe no HTML mas não é mais usado diretamente — toda navegação passa pelo `#talent-overlay`.

### Estrutura do talent-overlay (gat-1.html):
```html
<div id="talent-overlay">
  <!-- topbar com título e botão FECHAR -->
  <div class="tt-tab-bar">
    <button id="tt-tab-btn-talentos" onclick="switchTTTab('talentos')">✦ TALENTOS</button>
    <button id="tt-tab-btn-ficha"    onclick="switchTTTab('ficha')">⚔ FICHA DO HERÓI</button>
  </div>
  <div id="tt-pane-talentos" class="tt-tab-pane">
    <div id="talent-tree-content"></div>
  </div>
  <div id="tt-pane-ficha" class="tt-tab-pane">
    <div class="char-panel">
      <div id="char-content-tt"></div>  <!-- Ficha renderizada aqui -->
    </div>
  </div>
</div>
```

### Funções envolvidas:
- `switchTTTab(tab)` → em gat-1.html (script inline); alterna abas e chama buildCharacterScreen('char-content-tt') ao abrir ficha
- `openTalentTree(abaInicial)` → talent_system-1.js; aceita 'talentos' ou 'ficha'
- `buildCharacterScreen(targetId?)` → palDinh.js; aceita ID do container opcionalmente (default: 'char-content')
- `toggleSkillEquip(key)` → rebuild no container ativo (char-content-tt ou char-content)

### Botões HUD:
- **✦ Talentos** → `openTalentTree('talentos')`

- Botão "Ficha" removido do HUD completamente. A Ficha é acessível pela aba dentro do overlay de Talentos (botão ✦ Talentos no HUD)

### Atributos — única fonte de verdade:
- Os chips de atributos (HP, AP/MP, ATQ, DEF, VEL, MAG, Ouro, Abates, Mortes, EXP) ficam exclusivamente no bloco de stats do `buildTalentTreeUI` (talent_system-1.js linhas ~1071-1082)
- A seção `📊 ATRIBUTOS` foi **removida** do `buildCharacterScreen` (palDinh.js) — não há mais duplicata

---

## 👹 INIMIGOS DA FLORESTA

| Inimigo             | HP | ATQ | DEF | XP | Ouro | Visual                      |
|---------------------|----|-----|-----|----|------|-----------------------------|
| Rato das Sombras    | 15 | 5   | 1   | 10 | 4    | ratin.png (PNG simples, sem spritesheet) |
| Aranha Venenosa     | 22 | 6   | 2   | 18 | 12   | card de imagem              |
| Lobo das Sombras    | 30 | 9   | 3   | 28 | 18   | card de imagem              |
| Serpente das Trevas | 26 | 7   | 2   | 22 | 15   | card de imagem              |
| Cao Maldito (boss)  | 80 | 14  | 6   | 80 | 50   | card de imagem              |

---

## ⚔️ SISTEMA DE BATALHA

- startBattle(enemy) → abre overlay, restaura AP, inicia turno
- endBattle(victory, fled, defeat)
- Ordem de ressurreição: _talent_phylactery → _talent_resurrection → _talent_undying
- animEnemyHit() / animEnemyAttack() → animam inimigo
- setHeroAnim(name, revertMs) → anima herói
- animHeroDefend() → usa sheetDef.png (ao apertar Defender ou usar Escudo Divino)
- animHeroHit() → vazio (só flash visual)
- countActiveSupportBuffs(bs) → conta buffs de suporte ativos (máx 3)

---

## 🔮 SISTEMA DE TALENTOS (talent_system-1.js)

- 2 PT por level up (PT_PER_LEVEL = 2)
- 6 árvores, 2 caminhos × 3 tiers cada
- Tier 2 requer 3 do Tier 1; Tier 3 requer 2 do Tier 2
- getSkillCost(sk, p) → custo real após talentos
- getAvailablePT() = (level-1)*2 - ptGasto

### Tela de Talentos
- Header: ícone da classe + nome + role + PT disponíveis + LV atual
- Paladino: usa palaicon.png em vez de emoji
- Stats visíveis: HP, AP/MP, ATQ, DEF, VEL, MAG (se aplicável), Ouro, Abates, Mortes, EXP

Árvores: Guerreiro (Berserker/Cavaleiro de Ferro) | Mago (Arquimago/Feiticeiro do Vazio) | Paladino (Campeão Sagrado/Cruzado das Sombras) | Assassino (Fantasma/Venenoso) | Arqueiro (Atirador/Explorador) | Monge (Punho do Trovão/Mestre do Chi)

---

## 🐛 BUGS — STATUS ATUAL

### Corrigidos (sessões 1–8)
- BUG-01 a BUG-09 (versão 3.2)
- BUG-SPRITE-BLEND, BUG-SPRITE-JUMP, BUG-KEYFRAME, BUG-SPRITEDEF-DUPLO
- BUG-FLASH-PISCAR, BUG-HIT-ANIM, BUG-BUFF-BORDER
- BUG-AURA-DEF, BUG-BUFF-NODUPLICATE, BUG-BUFF-LIMIT
- BUG-ATRIBUTOS-DUPLICADOS: seção ATRIBUTOS aparecia tanto na Ficha quanto nos Talentos → unificado nos chips de stats do buildTalentTreeUI
- sheetDef.png fundo transparente confirmado

### Pendentes
- (nenhum crítico no momento)

---

## 📋 PRÓXIMAS PRIORIDADES

1. Vilarejo da Pedra Branca (nova área)
2. Revisão da árvore de talentos do Paladino
3. Ícones reais para outras classes (além do Paladino)
4. Painel de buff para skills de outras classes
