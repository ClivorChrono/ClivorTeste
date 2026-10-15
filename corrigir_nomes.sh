#!/data/data/com.termux/files/usr/bin/bash
# =============================================================
#  CORRIGIR_NOMES.SH — Chronicles of Clivor
#  Renomeia os arquivos com nome/pasta diferente do código,
#  fazendo o arquivo real bater exatamente com o que o jogo pede.
#
#  Uso: rode DENTRO da pasta raiz do projeto
#     bash corrigir_nomes.sh
# =============================================================

echo "🔧 Corrigindo nomes de arquivos..."
echo ""

renomear() {
  local de="$1"
  local para="$2"
  if [ "$de" = "$para" ]; then
    return
  fi
  if [ -f "$de" ]; then
    mkdir -p "$(dirname "$para")"
    # Alguns sistemas de arquivo do Android tratam maiúscula/minúscula
    # como o MESMO arquivo. Se o mv falhar por isso, não é erro real —
    # já está tudo certo, só ignora e segue.
    if mv -v "$de" "$para" 2>./_tmp_mv_err.log; then
      :
    else
      if grep -q "are the same file" ./_tmp_mv_err.log 2>/dev/null; then
        echo "✅ Já é o mesmo arquivo no sistema (case-insensitive): $para"
      else
        echo "❌ Erro ao mover $de -> $para:"
        cat ./_tmp_mv_err.log
      fi
    fi
  else
    echo "⚠️  Pulei (não encontrado): $de"
  fi
}

renomear "./Imagens/C1.png"                                  "./Imagens/c1.png"
renomear "./Imagens/cosméticos/poção.png"                     "./Imagens/cosméticos/Poção.png"
renomear "./Imagens/cosméticos/poçãoG.png"                    "./Imagens/cosméticos/PoçãoG.png"
renomear "./Imagens/cosméticos/poçãoM.png"                    "./Imagens/cosméticos/PoçãoM.png"
renomear "./Imagens/icones/l8li.png"                          "./Imagens/icones/L8li.png"
renomear "./Imagens/icones/materiais/peledeco.png"            "./Imagens/icones/materiais/Peledeco.png"
renomear "./Imagens/personagens/Corvo.png"                    "./Imagens/personagens/corvo.png"
renomear "./Imagens/personagens/Gozen.png"                    "./Imagens/personagens/gozen.png"
renomear "./Imagens/personagens/Lobo.png"                     "./Imagens/personagens/lobo.png"
renomear "./Imagens/personagens/paladino/martelo.png"         "./Imagens/personagens/paladino/Martelo.png"
renomear "./Imagens/personagens/paladino/escudoDivi.png"      "./Imagens/personagens/paladino/escudodivi.png"

# Caso especial: "caop.png" é pedido em 2 lugares diferentes (Imagens/inimigos/caop.png E caop.png),
# mas o arquivo real só existe em Imagens/Caop.png (mesmo nome, case diferente —
# provavelmente já funciona já que o Android costuma ignorar isso).
# Aqui só garantimos as CÓPIAS extras nos outros 2 lugares que o código pede.
if [ -f "./Imagens/caop.png" ] || [ -f "./Imagens/Caop.png" ]; then
  ORIGEM="./Imagens/caop.png"
  [ -f "$ORIGEM" ] || ORIGEM="./Imagens/Caop.png"
  mkdir -p "./Imagens/inimigos"
  cp -v "$ORIGEM" "./Imagens/inimigos/caop.png" 2>./_tmp_mv_err.log || cat ./_tmp_mv_err.log
  cp -v "$ORIGEM" "./caop.png" 2>./_tmp_mv_err.log || cat ./_tmp_mv_err.log
else
  echo "⚠️  Pulei (não encontrado): Imagens/Caop.png ou Imagens/caop.png"
fi

rm -f ./_tmp_mv_err.log

echo ""
echo "✨ Pronto! Recarrega o jogo (Ctrl+Shift+R no Chrome) e testa."
