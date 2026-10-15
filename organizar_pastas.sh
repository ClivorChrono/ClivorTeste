#!/data/data/com.termux/files/usr/bin/bash
# ══════════════════════════════════════════════════════════════
#  organizar_pastas.sh — reorganiza os arquivos do projeto Chronicles
#  of Clivor pra bater com a estrutura que o gat-1.html espera
#  (core/, classes/, dungeons/, npcs/), SEM APAGAR NADA.
#
#  COMO FUNCIONA:
#  1) Roda em modo SIMULAÇÃO por padrão — só mostra o que faria.
#  2) Só mexe em arquivo que está numa pasta ERRADA (ex: solto na
#     raiz quando deveria estar em core/). Arquivo que já está no
#     lugar certo é ignorado.
#  3) Se achar o MESMO nome de arquivo em mais de um lugar, não
#     decide sozinho — avisa e pula, pra você resolver na mão.
#  4) Antes de mover qualquer coisa de verdade, faz um backup
#     completo da pasta inteira (cópia, não link) em
#     ../ClivorRPG_backup_<data>/
#
#  COMO USAR:
#    cd para a pasta raiz do projeto (onde fica o gat-1.html)
#    bash organizar_pastas.sh              → só mostra o plano
#    bash organizar_pastas.sh --aplicar    → faz backup e reorganiza
# ══════════════════════════════════════════════════════════════

set -uo pipefail

APLICAR=false
if [ "${1:-}" = "--aplicar" ]; then
  APLICAR=true
fi

# Confere se estamos na pasta certa
if [ ! -f "gat-1.html" ]; then
  echo "❌ Não achei gat-1.html aqui. Rode este script de dentro da pasta raiz do projeto (ex: cd ~/storage/shared/'Clivor RPG')."
  exit 1
fi

# ── Mapa: onde cada arquivo DEVERIA estar, segundo os <script src="..."> do gat-1.html ──
declare -A DESTINO=(
  ["assassino_lunar.js"]="classes/assassino_lunar.js"
  ["class_arqueiro.js"]="classes/class_arqueiro.js"
  ["class_assassino.js"]="classes/class_assassino.js"
  ["class_mago.js"]="classes/class_mago.js"
  ["class_paladino.js"]="classes/class_paladino.js"
  ["paladino_golpe_sagrado_visual.js"]="classes/paladino_golpe_sagrado_visual.js"
  ["totens.js"]="classes/totens.js"
  ["achievements_gallery.js"]="core/achievements_gallery.js"
  ["ascensao_vilarejo.js"]="core/ascensao_vilarejo.js"
  ["ascensoes_armas.js"]="core/ascensoes_armas.js"
  ["bestiario.js"]="core/bestiario.js"
  ["classes_new.js"]="core/classes_new.js"
  ["despertar_armas.js"]="core/despertar_armas.js"
  ["elementos.js"]="core/elementos.js"
  ["kael_overlay_path.js"]="core/kael_overlay_path.js"
  ["merito_system.js"]="core/merito_system.js"
  ["missoes.js"]="core/missoes.js"
  ["palDinh.js"]="core/palDinh.js"
  ["runas.js"]="core/runas.js"
  ["save_shim.js"]="core/save_shim.js"
  ["talent_system.js"]="core/talent_system.js"
  ["toque_brilho.js"]="core/toque_brilho.js"
  ["dungeon_sombras.js"]="dungeons/dungeon_sombras.js"
  ["inazami_completo.js"]="dungeons/inazami_completo.js"
  ["kappa_dungeon.js"]="dungeons/kappa_dungeon.js"
  ["multi_enemy_battle.js"]="dungeons/multi_enemy_battle.js"
  ["mundial_armor.js"]="dungeons/mundial_armor.js"
  ["nulkhar.js"]="dungeons/nulkhar.js"
  ["templo_vazio_ecoante.js"]="dungeons/templo_vazio_ecoante.js"
  ["cidade_kurosaki.js"]="npcs/cidade_kurosaki.js"
  ["hubi.js"]="npcs/hubi.js"
  ["vilarejo.js"]="npcs/vilarejo.js"
  # Arquivos que devem ficar na RAIZ (não mexe se já estiverem lá)
  ["img_autofix.js"]="img_autofix.js"
  ["gat-1.html"]="gat-1.html"
  ["index.html"]="index.html"
  ["serve.py"]="serve.py"
)

PLANO_MOVER=()
PLANO_CONFLITO=()
PLANO_JA_OK=0
PLANO_NAO_ACHADO=()

echo "🔍 Procurando arquivos pelo projeto (isso pode demorar um pouco)..."
echo ""

for nome in "${!DESTINO[@]}"; do
  destino_relativo="${DESTINO[$nome]}"

  # Já está no lugar certo?
  if [ -f "$destino_relativo" ]; then
    PLANO_JA_OK=$((PLANO_JA_OK+1))
    continue
  fi

  # Procura o arquivo em qualquer lugar do projeto, ignorando pastas de backup
  mapfile -t achados < <(find . -type f -name "$nome" -not -path "*/ClivorRPG_backup_*/*" -not -path "*/.git/*" 2>/dev/null)

  if [ "${#achados[@]}" -eq 0 ]; then
    PLANO_NAO_ACHADO+=("$nome  (esperado em: $destino_relativo)")
  elif [ "${#achados[@]}" -eq 1 ]; then
    origem="${achados[0]#./}"
    PLANO_MOVER+=("$origem  →  $destino_relativo")
  else
    PLANO_CONFLITO+=("$nome encontrado em ${#achados[@]} lugares: ${achados[*]}")
  fi
done

echo "════════════════════════════════════════"
echo "  PLANO DE REORGANIZAÇÃO"
echo "════════════════════════════════════════"
echo ""
echo "✅ Já estão no lugar certo: $PLANO_JA_OK arquivo(s)"
echo ""

if [ "${#PLANO_MOVER[@]}" -gt 0 ]; then
  echo "📦 Serão movidos (${#PLANO_MOVER[@]}):"
  for linha in "${PLANO_MOVER[@]}"; do
    echo "   $linha"
  done
  echo ""
fi

if [ "${#PLANO_NAO_ACHADO[@]}" -gt 0 ]; then
  echo "⚠️  Não encontrados em lugar nenhum (pode já ter sumido antes):"
  for linha in "${PLANO_NAO_ACHADO[@]}"; do
    echo "   $linha"
  done
  echo ""
fi

if [ "${#PLANO_CONFLITO[@]}" -gt 0 ]; then
  echo "🟡 CONFLITO — mais de uma cópia encontrada, não vou decidir sozinho:"
  for linha in "${PLANO_CONFLITO[@]}"; do
    echo "   $linha"
  done
  echo "   → Confere na mão qual é a versão certa antes de rodar --aplicar de novo."
  echo ""
fi

if [ "$APLICAR" = false ]; then
  echo "════════════════════════════════════════"
  echo "Isso foi só uma SIMULAÇÃO — nada foi movido."
  echo "Se o plano acima parece certo, rode:"
  echo "   bash organizar_pastas.sh --aplicar"
  echo "════════════════════════════════════════"
  exit 0
fi

if [ "${#PLANO_MOVER[@]}" -eq 0 ]; then
  echo "Nada pra mover. Encerrando sem fazer backup."
  exit 0
fi

# ── Backup completo antes de mover qualquer coisa ──
PASTA_ATUAL="$(basename "$PWD")"
DATA="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="../${PASTA_ATUAL}_backup_${DATA}"

echo ""
echo "🛟 Fazendo backup completo em: $BACKUP_DIR"
cp -r "." "$BACKUP_DIR"
if [ $? -ne 0 ]; then
  echo "❌ Backup falhou — abortando por segurança. Nada foi movido."
  exit 1
fi
echo "✅ Backup concluído."
echo ""

# ── Move de verdade ──
echo "🚚 Movendo arquivos..."
for linha in "${PLANO_MOVER[@]}"; do
  origem="${linha%%  →  *}"
  destino="${linha##*  →  }"
  mkdir -p "$(dirname "$destino")"
  mv -n "$origem" "$destino"
  if [ $? -eq 0 ]; then
    echo "   ✅ $origem → $destino"
  else
    echo "   ❌ FALHOU: $origem → $destino (arquivo de destino já existe? checa na mão)"
  fi
done

echo ""
echo "════════════════════════════════════════"
echo "Concluído. Backup guardado em: $BACKUP_DIR"
echo "Se algo quebrar, copia de volta de lá — nenhum arquivo original foi apagado."
echo "════════════════════════════════════════"
