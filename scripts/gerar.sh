#!/bin/sh
# Gera as páginas de serviços/preçário, acrescenta as versões aos ficheiros e atualiza o menu dos artigos/portfólio.
set -e
cd "$(dirname "$0")/.."
python3 scripts/servicos.py
python3 scripts/versao.py
python3 scripts/modelo.py
