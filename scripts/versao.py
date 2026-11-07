#!/usr/bin/env python3
"""Acrescenta ?v=<impressão digital> aos ficheiros CSS e JS referidos nas páginas (e aos import entre módulos),
para que os browsers busquem logo a versão nova depois de cada publicação, em vez de usarem a cópia em cache.

Correr depois de qualquer alteração em public/assets/css ou public/assets/js:  sh scripts/gerar.sh"""
import hashlib
import re
from pathlib import Path

PUBLICO = Path(__file__).resolve().parent.parent / "public"
JS = PUBLICO / "assets/js"
CSS = PUBLICO / "assets/css"
cache = {}


def impressao(ficheiro: Path) -> str:
    if ficheiro not in cache:
        cache[ficheiro] = hashlib.sha256(ficheiro.read_bytes()).hexdigest()[:10]
    return cache[ficheiro]


# 1) Import entre módulos (perguntas.js, precos-dados.js…), dos que não importam nada para os que importam
IMPORT = re.compile(r'(from\s+["\'])(\./[\w.-]+\.js)(\?v=[0-9a-f]+)?(["\'])')
modulos = sorted(JS.glob("*.js"), key=lambda f: len(IMPORT.findall(f.read_text(encoding="utf-8"))))
for f in modulos:
    t = f.read_text(encoding="utf-8")
    novo = IMPORT.sub(lambda m: f"{m.group(1)}{m.group(2)}?v={impressao(JS / m.group(2)[2:])}{m.group(4)}", t)
    if novo != t:
        f.write_text(novo, encoding="utf-8")
        cache.pop(f, None)

# 2) Referências nas páginas HTML
REF = re.compile(r'((?:href|src)=")(/?assets/(?:css|js)/[\w.-]+\.(?:css|js))(\?v=[0-9a-f]+)?(")')
mudadas = 0
for pagina in PUBLICO.rglob("*.html"):
    t = pagina.read_text(encoding="utf-8")
    def trocar(m):
        alvo = PUBLICO / m.group(2).lstrip("/")
        return f"{m.group(1)}{m.group(2)}?v={impressao(alvo)}{m.group(4)}" if alvo.exists() else m.group(0)
    novo = REF.sub(trocar, t)
    if novo != t:
        pagina.write_text(novo, encoding="utf-8")
        mudadas += 1
print(f"versões atualizadas em {mudadas} páginas.")
