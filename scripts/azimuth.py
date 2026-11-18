#!/usr/bin/env python3
"""Gera public/azimuth.html (página privada, noindex) com as assinaturas propostas à Azimuth e os links de pagamento do Stripe,
e public/assets/js/i18n-azimuth.js (textos em português).

Para mudar valores ou links: altere aqui e volte a gerar com  sh scripts/gerar.sh"""
import html
import json
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PUBLICO = RAIZ / "public"

# Links de pagamento do Stripe (Payment Links)
LINK_HOSPEDAGEM = "https://buy.stripe.com/dRm4gz5njafO3Xp1246Ri01"  # 43,05 €/mês (35 € + IVA)
LINK_CONTEUDO = "https://buy.stripe.com/bJe28r5njcnWctVbGI6Ri02"  # 79,95 €/mês (65 € + IVA)

PT = {}


def t(chave, en, pt, tag="span", attrs="", html_=False):
    PT[chave] = pt
    a = f' data-i18n-html="{chave}"' if html_ else f' data-i18n="{chave}"'
    return f"<{tag}{attrs}{a}>{en if html_ else html.escape(en, quote=False)}</{tag}>"


def lista(prefixo, itens):
    return '<ul class="ps-lista">' + "".join(t(f"{prefixo}.{i}", en, pt, "li") for i, (en, pt) in enumerate(itens)) + "</ul>"


def botao_pagar(link, chave):
    if link:
        return f'<a class="botao ps-pacote__botao" href="{html.escape(link)}" rel="noopener">{t(chave, "Subscribe", "Subscrever")}<svg class="seta" aria-hidden="true"><use href="assets/img/sprite.svg#seta"/></svg></a>'
    return f'<span class="botao botao--secundario ps-pacote__botao az-em-breve">{t("az.embreve", "Payment link coming soon", "Link de pagamento em breve")}</span>'


WA = "https://wa.me/351962951161?text=" + "Ol%C3%A1%21%20Tenho%20uma%20d%C3%BAvida%20sobre%20as%20assinaturas%20da%20Azimuth."

main = f'''<main id="conteudo">
<section class="heroi heroi-servicos heroi-servicos--precos ps-heroi">
  <div class="contentor">
    {t("az.legenda", "Azimuth · Subscriptions", "Azimuth · Assinaturas", "p", ' class="legenda"')}
    {t("az.titulo", 'Your website and content, <span class="destaque">on autopilot.</span>', 'O seu site e conteúdo, <span class="destaque">sem preocupações.</span>', "h1", html_=True)}
    {t("az.intro", "Choose what you want to activate. Payment is made securely with Stripe, by card, and is charged automatically every month until the end of the plan.", "Escolha o que quer ativar. O pagamento é feito em segurança pelo Stripe, com cartão, e é cobrado automaticamente todos os meses até ao fim do plano.", "p", ' class="heroi-servicos__intro"')}
    <p class="selo-iva">{t("az.iva", "Prices before VAT (23%)", "Valores sem IVA (23%)")}</p>
  </div>
</section>

<section class="seccao ps-precos" id="assinaturas" aria-labelledby="t-assinaturas">
  <div class="contentor">
    <header class="cabeca-seccao">
      {t("az.ass.leg", "Subscriptions", "Assinaturas", "p", ' class="legenda"')}
      {t("az.ass.t", "Two plans, one monthly payment each.", "Dois planos, um pagamento mensal cada.", "h2", ' id="t-assinaturas"')}
    </header>
    <ul class="ps-pacotes ps-pacotes--duas">
      <li class="ps-pacote">
        {t("az.h.leg", "12 months", "12 meses", "p", ' class="ps-pacote__leg"')}
        {t("az.h.nome", "Website hosting", "Alojamento do site", "h3", ' class="ps-pacote__nome"')}
        <p class="ps-pacote__preco">{t("az.h.preco", "€35", "35 €")} <small>{t("az.mes.iva", "/month + VAT", "/mês + IVA")}</small></p>
        {t("az.h.total", "€43.05/month with VAT · 12 payments", "43,05 €/mês com IVA · 12 pagamentos", "p", ' class="ps-pacote__extra"')}
        {lista("az.h.i", [("Your website online for a full year", "O seu site online durante um ano inteiro"), ("Automatic monthly payment by card", "Pagamento mensal automático com cartão"), ("12-month plan, then it ends", "Plano de 12 meses, termina no fim")])}
        {botao_pagar(LINK_HOSPEDAGEM, "az.h.botao")}
      </li>
      <li class="ps-pacote ps-pacote--destaque">
        {t("az.c.leg", "Winter · 4 months", "Inverno · 4 meses", "p", ' class="ps-pacote__leg"')}
        {t("az.c.nome", "Winter content", "Conteúdo de inverno", "h3", ' class="ps-pacote__nome"')}
        <p class="ps-pacote__preco">{t("az.c.preco", "€65", "65 €")} <small>{t("az.mes.iva", "/month + VAT", "/mês + IVA")}</small></p>
        {t("az.c.total", "€79.95/month with VAT · 4 payments", "79,95 €/mês com IVA · 4 pagamentos", "p", ' class="ps-pacote__extra"')}
        {lista("az.c.i", [("2 posts a week on your feed", "2 publicações por semana no feed"), ("About 8 posts a month, 4 months of content", "Cerca de 8 publicações por mês, durante 4 meses"), ("Automatic monthly payment by card", "Pagamento mensal automático com cartão"), ("4-month plan, then it ends", "Plano de 4 meses, termina no fim")])}
        {botao_pagar(LINK_CONTEUDO, "az.c.botao")}
      </li>
    </ul>
  </div>
</section>

<section class="seccao catalogo--nevoa ps-como" aria-labelledby="t-como">
  <div class="contentor">
    <header class="cabeca-seccao">
      {t("az.como.leg", "How it works", "Como funciona", "p", ' class="legenda"')}
      {t("az.como.t", "Subscribe in a couple of minutes.", "Subscreva em dois minutos.", "h2", ' id="t-como"')}
    </header>
    <ol class="passos ps-passos">
      <li class="passo">{t("az.como.1.t", "Choose the plan", "Escolha o plano", "h3")}{t("az.como.1.p", "Click “Subscribe” on the plan you want. You can activate one or both.", "Clique em “Subscrever” no plano que quer. Pode ativar um ou os dois.", "p")}</li>
      <li class="passo">{t("az.como.2.t", "Pay by card", "Pague com cartão", "h3")}{t("az.como.2.p", "The secure Stripe page opens. The first month is charged today.", "Abre a página segura do Stripe. O primeiro mês é cobrado no dia.", "p")}</li>
      <li class="passo">{t("az.como.3.t", "We take it from there", "Nós tratamos do resto", "h3")}{t("az.como.3.p", "You receive the receipt by email and the following months are charged automatically.", "Recebe o recibo por e-mail e os meses seguintes são cobrados automaticamente.", "p")}</li>
    </ol>
  </div>
</section>

<section class="seccao chamada" aria-labelledby="t-chamada">
  <svg class="chamada__abelha chamada__abelha--1 abelha--branca" aria-hidden="true"><use href="assets/img/sprite.svg#abelha"/></svg>
  <svg class="chamada__abelha chamada__abelha--2 abelha--branca" aria-hidden="true"><use href="assets/img/sprite.svg#abelha"/></svg>
  <div class="contentor">
    {t("az.cta.t", "Any questions before subscribing?", "Alguma dúvida antes de subscrever?", "h2", ' id="t-chamada"')}
    {t("az.cta.p", "Talk to us. We’ll reply quickly.", "Fale connosco. Respondemos depressa.", "p")}
    <div class="chamada__acoes">
      <a class="botao botao--claro" href="{WA}" rel="noopener" data-whatsapp>{t("az.cta.wa", "Talk on WhatsApp", "Falar no WhatsApp")}<svg class="seta" aria-hidden="true"><use href="assets/img/sprite.svg#seta"/></svg></a>
      <a class="botao botao--secundario" href="mailto:info@heyimplement.com">info@heyimplement.com</a>
    </div>
  </div>
</section>
</main>'''

base = (PUBLICO / "contact.html").read_text(encoding="utf-8")
cabeca = base[:base.index("</head>")]
cabeca = re.sub(r"<title>.*?</title>\n", "", cabeca)
for padrao in [r'<meta name="titulo-pt"[^>]*>\n', r'<meta name="description"[^>]*>\n', r'<meta name="robots"[^>]*>\n', r'<link rel="canonical"[^>]*>\n',
               r'<meta property="og:[^>]*>\n', r'<meta name="twitter:[^>]*>\n', r'<script src="assets/js/contacto\.js[^"]*"[^>]*></script>\n?']:
    cabeca = re.sub(padrao, "", cabeca)
meta = '''<title>Azimuth subscriptions — Implement</title>
<meta name="titulo-pt" content="Assinaturas Azimuth — Implement">
<meta name="robots" content="noindex, nofollow">
<meta name="description" content="Website hosting and winter content subscriptions for Azimuth.">'''
cabeca = cabeca.replace('<meta charset="utf-8">\n', '<meta charset="utf-8">\n<!-- Gerado por scripts/azimuth.py: altere o conteúdo lá e volte a gerar. -->\n', 1)
cabeca = cabeca.replace('<meta name="viewport"', meta + '\n<meta name="viewport"', 1)
cabeca, n = re.subn(r'(<script src="assets/js/i18n\.js[^"]*" defer></script>)', lambda m: m.group(1) + '\n<script src="assets/js/i18n-azimuth.js" defer></script>', cabeca, count=1)
assert n == 1
topo = base[base.index('<a class="saltar"'):base.index("<main")].replace(' aria-current="page"', "")
rodape = base[base.index('<footer class="rodape">'):base.index("</body>")]
(PUBLICO / "azimuth.html").write_text(cabeca + "</head>\n<body>\n" + topo + main + "\n\n" + rodape + "</body>\n</html>\n", encoding="utf-8")
linhas = ",\n".join(f"  {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)}" for k, v in PT.items())
(PUBLICO / "assets/js/i18n-azimuth.js").write_text(
    "/* Textos em português da página da Azimuth. Gerado por scripts/azimuth.py. */\n"
    f"Object.assign(window.IMPLEMENT_PT = window.IMPLEMENT_PT || {{}}, {{\n{linhas}\n}});\n", encoding="utf-8")
print("azimuth.html e i18n-azimuth.js gerados.")
