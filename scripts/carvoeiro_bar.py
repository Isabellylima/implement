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
    if itens:
        corpo += '<ul class="cb-op__itens">' + "".join(t(f"{k}.i{i}", en, pt, "li") for i, (en, pt) in enumerate(itens)) + "</ul>"
    if preco:
        corpo += f'<span class="cb-op__ref">{t(f"{k}.p", *preco)}</span>'
    m = f' data-mostra="{mostra}"' if mostra else ""
    return (f'<label class="cb-op{" cb-op--pilula" if tipo == "checkbox" or not (itens or preco) else ""}"><input type="{tipo}" name="{nome}" value="{html.escape(valor)}"{m}>'
            f'<span class="cb-op__caixa">{corpo}</span></label>')


def passo(id_, k, titulo, ajuda, conteudo, se=None, curto=("", "")):
    s_ = f' data-se="{se}"' if se else ""
    return (f'<fieldset class="etapa" data-passo="{id_}"{s_} hidden>'
            + t(f"{k}.curto", *curto, "span", ' class="cb-curto" hidden')
            + t(f"{k}.t", *titulo, "legend", ' class="etapa__titulo"')
            + (t(f"{k}.a", *ajuda, "p", ' class="etapa__intro"') if ajuda else '<p class="etapa__intro"></p>')
            + f'<div class="cb-passo__conteudo">{conteudo}</div></fieldset>')


PASSOS = "".join([
    passo("site", "cb.p1", ("What kind of website suits the bar?", "Que tipo de site faz sentido para o bar?"),
          ("Choose what feels right. Values are only a reference: your proposal will be made for you.", "Escolha o que lhe parece melhor. Os valores são só uma referência: a proposta é feita à sua medida."),
          '<div class="cb-ops cb-ops--3">'
          + opcao("site", "One complete page", "cb.p1.um", ("One complete page", "Uma página completa"), ("Reference: from €349, or €59/month", "Referência: desde 349 €, ou 59 €/mês"),
                  [("Everything on one page", "Tudo numa página"), ("Menu, events, hours and map", "Menu, eventos, horário e mapa"), ("WhatsApp button", "Botão de WhatsApp"), ("Ready in 7 days", "Pronto em 7 dias")])
          + opcao("site", "A few pages", "cb.p1.varias", ("A few pages", "Algumas páginas"), ("Reference: from €690", "Referência: desde 690 €"),
                  [("Up to 5 pages", "Até 5 páginas"), ("Found on Google in the area", "Encontrado no Google na zona"), ("Google profile and reviews", "Perfil Google e avaliações")])
          + opcao("site", "Not sure yet", "cb.p1.nao", ("Not sure yet", "Ainda não sei"), None,
                  [("We’ll suggest what makes sense", "Sugerimos o que fizer sentido")])
          + "</div>"
          + t("cb.p1.mostrar", "What should it show?", "O que deve mostrar?", "p", ' class="cb-sub"')
          + '<div class="cb-ops cb-ops--pilulas">'
          + "".join(opcao("site_conteudo", en, f"cb.p1.c{i}", (en, pt), tipo="checkbox") for i, (en, pt) in enumerate([('Drinks & food menu', 'Menu de bebidas e comida'), ('Events', 'Eventos'), ('Photo gallery', 'Galeria de fotos'), ('Opening hours & map', 'Horário e mapa'), ('Reviews', 'Avaliações'), ('WhatsApp button', 'Botão de WhatsApp')]))
          + "</div>"
          + t("cb.p1.lin", "Languages", "Línguas", "p", ' class="cb-sub"')
          + '<div class="cb-ops cb-ops--pilulas">'
          + "".join(opcao("linguas", en, f"cb.p1.l{i}", (en, pt), tipo="checkbox") for i, (en, pt) in enumerate([('English', 'Inglês'), ('Dutch', 'Neerlandês'), ('Portuguese', 'Português'), ('German', 'Alemão')]))
          + "</div>"
          + t("cb.p1.pag", "For the website, you’d rather…", "Para o site, prefere…", "p", ' class="cb-sub"')
          + '<div class="cb-ops cb-ops--pilulas">'
          + "".join(opcao("pagamento", en, f"cb.p1.pg{i}", (en, pt)) for i, (en, pt) in enumerate([("Pay once", "Pagar de uma vez"), ("Spread it monthly", "Dividir por meses"), ("Not sure", "Ainda não sei")]))
          + "</div>", curto=("Website", "Site")),
    passo("redes", "cb.p2", ("How present do you want the bar to be on social media?", "Quanta presença quer que o bar tenha nas redes?"),
          ("We plan with you, film at the bar, and create and publish the posts for you.", "Planeamos consigo, filmamos no bar, e criamos e publicamos os posts por si."),
          '<div class="cb-ops cb-ops--3">'
          + opcao("redes", "Steady: 2 posts a week", "cb.p2.a", ("Steady", "Regular"), ("Reference: around €240/month", "Referência: cerca de 240 €/mês"),
                  [("2 posts a week on 1 network", "2 publicações por semana em 1 rede"), ("1 planning meeting a month", "1 reunião de alinhamento por mês"), ("1 content session at the bar a month", "1 sessão de captação no bar por mês"), ("We create and publish the posts", "Criamos e publicamos os posts"), ("2 reels and 8 stories a month", "2 reels e 8 stories por mês")])
          + opcao("redes", "Stronger: 3 posts a week", "cb.p2.b", ("Stronger", "Mais forte"), ("Reference: around €390/month", "Referência: cerca de 390 €/mês"),
                  [("3 posts a week on 2 networks", "3 publicações por semana em 2 redes"), ("1 planning meeting a month", "1 reunião de alinhamento por mês"), ("1 content session at the bar a month", "1 sessão de captação no bar por mês"), ("We create and publish the posts", "Criamos e publicamos os posts"), ("4 reels, 12 stories and replies to comments", "4 reels, 12 stories e resposta a comentários")])
          + opcao("redes", "Not sure yet", "cb.p2.nao", ("Not sure yet", "Ainda não sei"), None,
                  [("We’ll suggest what makes sense", "Sugerimos o que fizer sentido")])
          + "</div>"
          + t("cb.p2.red", "Which networks?", "Que redes?", "p", ' class="cb-sub"')
          + '<div class="cb-ops cb-ops--pilulas">'
          + "".join(opcao("redes_lista", en, f"cb.p2.r{i}", (en, pt), tipo="checkbox") for i, (en, pt) in enumerate([('Instagram', 'Instagram'), ('Facebook', 'Facebook'), ('TikTok', 'TikTok'), ('Google', 'Google')]))
          + "</div>", curto=("Social media", "Redes")),
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
        {t("cb.titulo", 'Let’s shape your proposal <span class="destaque">together.</span>', 'Vamos montar a sua proposta <span class="destaque">juntos.</span>', "h1", html_=True)}
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
      {t("cb.r.t", "Your choices", "As suas escolhas", "p", ' class="cb-resumo__titulo"')}
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
