#!/usr/bin/env python3
"""Gera src/modelo.js: o cabeçalho e o rodapé do site (a partir de public/contact.html), com caminhos absolutos,
para o Worker montar as páginas de artigos (/insights e /insights/<slug>).

Volte a correr sempre que mudar o menu ou o rodapé:  python3 scripts/modelo.py"""
import json
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
base = (RAIZ / "public/contact.html").read_text(encoding="utf-8")


def absoluto(html):
    # href="x.html" / src="assets/…" → caminhos a partir da raiz (as páginas de artigos estão em /insights/…)
    html = re.sub(r'(href|src)="(?!https?:|mailto:|tel:|#|/)([^"]+)"', lambda m: f'{m.group(1)}="/{m.group(2)}"', html)
    html = html.replace('href="/index.html"', 'href="/"').replace('href="/index.html#', 'href="/#')
    html = re.sub(r'href="/([a-z-]+)\.html"', r'href="/\1"', html)
    return html


cabecalho = base[base.index('<a class="saltar"'):base.index("</header>") + len("</header>")]
cabecalho = absoluto(cabecalho.replace(' aria-current="page"', ""))
cabecalho = cabecalho.replace('href="/work.html"', 'href="/work"')
assert 'aria-current' not in cabecalho and 'href="/work" data-i18n="c.nav.trabalho"' in cabecalho

rodape = absoluto(base[base.index('<footer class="rodape">'):base.index("</footer>") + len("</footer>")])

cabeca = base[base.index('<meta name="theme-color"'):base.index("</head>")]
cabeca = re.sub(r'\s*<script src="assets/js/contacto\.js[^"]*"[^>]*></script>', "", cabeca)
assert "contacto.js" not in cabeca
cabeca = absoluto(cabeca)

js = (
    "/* Gerado por scripts/modelo.py a partir de public/contact.html. Não editar à mão. */\n"
    f"export const CABECA = {json.dumps(cabeca, ensure_ascii=False)};\n"
    f"export const CABECALHO = {json.dumps(cabecalho, ensure_ascii=False)};\n"
    f"export const RODAPE = {json.dumps(rodape, ensure_ascii=False)};\n"
)
(RAIZ / "src/modelo.js").write_text(js, encoding="utf-8")
print("src/modelo.js gerado.")
