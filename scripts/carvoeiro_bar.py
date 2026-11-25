#!/usr/bin/env python3
"""Gera public/carvoeiro-bar.html (página privada, noindex, sempre em inglês) para o Carvoeiro Bar (Bob van Goethem):
perguntas passo a passo (com a barra da abelha) para ele escolher site e/ou redes e dizer o valor mensal que quer investir;
no fim só pede o e-mail. Também gera public/assets/js/i18n-carvoeiro-bar.js (textos em PT).

As respostas são enviadas por assets/js/carvoeiro-bar.js para /api/contacto (base de dados + e-mail + HubSpot).
Para mudar textos ou valores: altere aqui e volte a gerar com  sh scripts/gerar.sh"""
import html
import json
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PUBLICO = RAIZ / "public"
PT = {}
SETA = '<svg class="seta" aria-hidden="true"><use href="assets/img/sprite.svg#seta"/></svg>'


def t(chave, en, pt, tag="span", attrs="", html_=False):
    PT[chave] = pt
    a = f' data-i18n-html="{chave}"' if html_ else f' data-i18n="{chave}"'
    return f"<{tag}{attrs}{a}>{en if html_ else html.escape(en, quote=False)}</{tag}>"


def lista(prefixo, itens):
    return '<ul class="ps-lista">' + "".join(t(f"{prefixo}.{i}", en, pt, "li") for i, (en, pt) in enumerate(itens)) + "</ul>"


# ---------- Linha do tempo ----------
def opcao(nome, valor, k, titulo, preco=None, itens=(), tipo="radio", mostra=None):
    """Cartão de escolha. value = texto em inglês (é o que chega à equipa)."""
    corpo = f'<strong class="cb-op__nome">{t(f"{k}.n", *titulo)}</strong>'
    if preco:
        corpo += f'<span class="cb-op__preco">{t(f"{k}.p", *preco)}</span>'
    if itens:
        corpo += '<ul class="cb-op__itens">' + "".join(t(f"{k}.i{i}", en, pt, "li") for i, (en, pt) in enumerate(itens)) + "</ul>"
    m = f' data-mostra="{mostra}"' if mostra else ""
    return (f'<label class="cb-op{" cb-op--pilula" if tipo == "checkbox" else ""}"><input type="{tipo}" name="{nome}" value="{html.escape(valor)}"{m}>'
            f'<span class="cb-op__caixa">{corpo}</span></label>')


def passo(id_, k, titulo, ajuda, conteudo, se=None, curto=("", "")):
    s_ = f' data-se="{se}"' if se else ""
    return (f'<fieldset class="etapa" data-passo="{id_}"{s_} hidden>'
            + t(f"{k}.curto", *curto, "span", ' class="cb-curto" hidden')
            + t(f"{k}.t", *titulo, "legend", ' class="etapa__titulo"')
            + (t(f"{k}.a", *ajuda, "p", ' class="etapa__intro"') if ajuda else '<p class="etapa__intro"></p>')
            + f'<div class="cb-passo__conteudo">{conteudo}</div></fieldset>')


PASSOS = "".join([
    passo("foco", "cb.p1", ("What would you like to start with?", "Por onde quer começar?"), None,
          '<div class="cb-ops cb-ops--3">'
          + opcao("foco", "Website", "cb.p1.site", ("A website", "Um site"), mostra="site")
          + opcao("foco", "Social media", "cb.p1.redes", ("Social media", "Redes sociais"), mostra="redes")
          + opcao("foco", "Website + social media", "cb.p1.ambos", ("Both", "Os dois"), mostra="site redes")
          + "</div>", curto=("Start", "Início")),
    passo("site", "cb.p2", ("Choose your website", "Escolha o seu site"), ("Prices + VAT. You see a preview before paying.", "Valores + IVA. Vê uma prévia antes de pagar."),
          '<div class="cb-ops cb-ops--3">'
          + opcao("site", "Essential website, €349 once", "cb.p2.e", ("Essential", "Essencial"), ("€349 once", "349 € pagamento único"),
                  [("1 complete page", "1 página completa"), ("Menu, events, hours, map", "Menu, eventos, horário, mapa"), ("WhatsApp button", "Botão de WhatsApp"), ("Ready in 7 days", "Pronto em 7 dias")])
          + opcao("site", "Essential website, €59/month + €99 activation", "cb.p2.m", ("Essential monthly", "Essencial mensal"), ("€59/month + €99", "59 €/mês + 99 €"),
                  [("Same website", "O mesmo site"), ("Hosting included", "Alojamento incluído"), ("Spread over the year", "Pago ao longo do ano")])
          + opcao("site", "Professional website, €690", "cb.p2.p", ("Professional", "Profissional"), ("€690 once", "690 € pagamento único"),
                  [("Up to 5 pages", "Até 5 páginas"), ("Local SEO + Google profile", "SEO local + perfil Google"), ("Reviews on the site", "Avaliações no site")])
          + "</div>"
          + t("cb.p2.lin", "Languages", "Línguas", "p", ' class="cb-sub"')
          + '<div class="cb-ops cb-ops--pilulas">'
          + "".join(opcao("linguas", en, f"cb.p2.l{i}", (en, pt), tipo="checkbox") for i, (en, pt) in enumerate([("English", "Inglês"), ("Dutch", "Neerlandês"), ("Portuguese", "Português"), ("German", "Alemão")]))
          + "</div>", se="site", curto=("Website", "Site")),
    passo("redes", "cb.p3", ("Choose your social media plan", "Escolha o plano de redes sociais"), ("Monthly, + VAT, minimum 3 months.", "Mensal, + IVA, mínimo de 3 meses."),
          '<div class="cb-ops cb-ops--3">'
          + opcao("redes", "Package 1 Essential, €240/month", "cb.p3.1", ("Package 1", "Pacote 1"), ("€240/month", "240 €/mês"),
                  [("1 alignment meeting a month", "1 reunião de alinhamento por mês"), ("1 content session at the bar", "1 sessão de captação no bar"), ("8 posts (2 a week) + 8 stories", "8 publicações (2 por semana) + 8 stories"), ("2 reels", "2 reels")])
          + opcao("redes", "Package 2 Growth, €390/month", "cb.p3.2", ("Package 2", "Pacote 2"), ("€390/month", "390 €/mês"),
                  [("2 networks", "2 redes"), ("12 posts, 4 reels, 12 stories", "12 publicações, 4 reels, 12 stories"), ("Replies to comments", "Resposta a comentários")])
          + opcao("redes", "Something smaller to begin with", "cb.p3.m", ("Something smaller", "Algo mais pequeno"), ("To begin with", "Para começar"),
                  [("We adapt it to your budget", "Adaptamos ao seu orçamento")])
          + "</div>", se="redes", curto=("Social media", "Redes")),
    passo("valor", "cb.p4", ("How much would you like to invest per month?", "Quanto gostaria de investir por mês?"),
          ("Your honest figure. We’ll build the package around it.", "O seu valor real. Montamos o pacote à volta dele."),
          '<div class="cb-ops cb-ops--pilulas" id="cb-sugestoes">'
          + "".join(f'<button type="button" class="cb-chip" data-valor="{v}">{v} €</button>' for v in (100, 150, 200, 300, 400))
          + '</div><label class="cb-valor"><span class="sr-only">€</span><input class="entrada" id="cb-valor" name="valor" type="number" inputmode="numeric" min="1" max="100000" step="1">'
          + t("cb.p4.mes", "€ / month", "€ / mês", "span", ' class="cb-valor__suf"') + "</label>", curto=("Budget", "Orçamento")),
    passo("email", "cb.p5", ("Where should we send your proposal?", "Para onde enviamos a proposta?"), None,
          '<div class="cb-email"><label class="sr-only" for="cb-mail">Email</label>'
          '<input class="entrada" id="cb-mail" name="email" type="email" autocomplete="email" inputmode="email" placeholder="email@example.com"></div>'
          + '<p class="cb-privado">' + t("cb.priv", "We only use your email to send you the proposal.", "Usamos o seu e-mail apenas para lhe enviar a proposta.")
          + ' <a href="/privacy.html" target="_blank" rel="noopener">' + t("cb.politica", "Privacy policy", "Política de privacidade") + '</a></p>', curto=("Email", "E-mail")),
])

main = f'''<main id="conteudo">
<section class="seccao cb-pagina">
  <div class="contentor cb-grelha">
    <div>
      <header class="cb-topo">
        {t("cb.legenda", "Carvoeiro Bar · Bob", "Carvoeiro Bar · Bob", "p", ' class="legenda"')}
        {t("cb.titulo", 'Build your plan <span class="destaque">step by step.</span>', 'Monte o seu plano <span class="destaque">passo a passo.</span>', "h1", html_=True)}
      </header>
      <div class="cartao-form" id="cb-cartao">
        <div class="progresso" aria-hidden="true">
          <div class="progresso__topo"><strong id="cb-prog-nome"></strong><span id="cb-prog-passo"></span></div>
          <div class="progresso__barra">
            <div class="progresso__enchido" id="cb-prog-enchido"></div>
            <div class="progresso__abelha" id="cb-prog-abelha"><svg><use href="assets/img/sprite.svg#abelha"/></svg></div>
          </div>
          <ol class="etapas-lista" id="cb-etapas"></ol>
        </div>
        <form id="cb-form" novalidate>
          <div class="form-corpo">{PASSOS}<p class="aviso-erro" id="cb-aviso" aria-live="polite"></p></div>
          <div class="mel-pote" aria-hidden="true"><label>Company website <input type="text" name="site_empresa" tabindex="-1" autocomplete="off"></label></div>
          <div class="form-pe">
            {t("cb.pe", "Takes less than a minute", "Demora menos de um minuto", "span", ' class="form-pe__guardado"')}
            <div class="form-pe__botoes">
              <button type="button" class="botao-voltar" id="cb-voltar" hidden>{t("cb.voltar", "Back", "Voltar")}</button>
              <button type="button" class="botao" id="cb-seguinte">{t("cb.seguinte", "Next", "Seguinte")}{SETA}</button>
              <button type="submit" class="botao" id="cb-enviar" hidden>{t("cb.enviar", "Send", "Enviar")}{SETA}</button>
            </div>
          </div>
        </form>
        <div class="sucesso" id="cb-sucesso" hidden tabindex="-1">
          <svg class="abelha-grande" aria-hidden="true"><use href="assets/img/sprite.svg#abelha"/></svg>
          {t("cb.ok.t", "Thank you, Bob!", "Obrigada, Bob!", "h2")}
          {t("cb.ok.p", "We’re going to work on a personalised package that fits what you need and your budget. We’ll be in touch very soon.", "Vamos trabalhar num pacote personalizado que responda ao que precisa e ao seu orçamento. Falamos consigo muito em breve.", "p")}
        </div>
      </div>
    </div>
    <aside class="cb-resumo" aria-live="polite">
      {t("cb.r.t", "Your plan", "O seu plano", "p", ' class="cb-resumo__titulo"')}
      <ul class="cb-resumo__lista" id="cb-resumo"></ul>
      {t("cb.r.vazio", "Your choices will appear here.", "As suas escolhas aparecem aqui.", "p", ' class="cb-resumo__vazio" id="cb-resumo-vazio"')}
    </aside>
  </div>
</section>
</main>'''

base = (PUBLICO / "contact.html").read_text(encoding="utf-8")
cabeca = base[:base.index("</head>")]
cabeca = re.sub(r"<title>.*?</title>\n", "", cabeca)
for padrao in [r'<meta name="titulo-pt"[^>]*>\n', r'<meta name="description"[^>]*>\n', r'<meta name="robots"[^>]*>\n', r'<link rel="canonical"[^>]*>\n',
               r'<meta property="og:[^>]*>\n', r'<meta name="twitter:[^>]*>\n', r'<script src="assets/js/contacto\.js[^"]*"[^>]*></script>\n?']:
    cabeca = re.sub(padrao, "", cabeca)
meta = '''<title>Carvoeiro Bar · Your plan — Implement</title>
<meta name="titulo-pt" content="Carvoeiro Bar · O seu plano — Implement">
<meta name="robots" content="noindex, nofollow">
<meta name="description" content="Build a website and social media plan for Carvoeiro Bar.">'''
cabeca = cabeca.replace('<meta charset="utf-8">\n', '<meta charset="utf-8">\n<!-- Gerado por scripts/carvoeiro_bar.py: altere o conteúdo lá e volte a gerar. -->\n', 1)
cabeca = cabeca.replace('<html lang="en">', '<html lang="en" data-idioma-fixo="en">', 1)
cabeca = cabeca.replace('<meta name="viewport"', meta + '\n<meta name="viewport"', 1)
cabeca, n = re.subn(r'(<script src="assets/js/i18n\.js[^"]*" defer></script>)',
                    lambda m: m.group(1) + '\n<script src="assets/js/i18n-carvoeiro-bar.js" defer></script>\n<script src="assets/js/carvoeiro-bar.js" defer></script>', cabeca, count=1)
assert n == 1
topo = base[base.index('<a class="saltar"'):base.index("<main")].replace(' aria-current="page"', "")
rodape = base[base.index('<footer class="rodape">'):base.index("</body>")]
(PUBLICO / "carvoeiro-bar.html").write_text(cabeca + "</head>\n<body>\n" + topo + main + "\n\n" + rodape + "</body>\n</html>\n", encoding="utf-8")
linhas = ",\n".join(f"  {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)}" for k, v in PT.items())
(PUBLICO / "assets/js/i18n-carvoeiro-bar.js").write_text(
    "/* Textos em português da página do Carvoeiro Bar. Gerado por scripts/carvoeiro_bar.py. */\n"
    f"Object.assign(window.IMPLEMENT_PT = window.IMPLEMENT_PT || {{}}, {{\n{linhas}\n}});\n", encoding="utf-8")
print("carvoeiro-bar.html e i18n-carvoeiro-bar.js gerados.")
