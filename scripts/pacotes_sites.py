#!/usr/bin/env python3
"""Gera public/pacotes-sites.html (página não ligada, noindex) com os pacotes de sites para pequenos negócios de todos os tipos,
e public/assets/js/i18n-pacotes-sites.js (textos em português).

Base: o PDF «Implement — Pacotes de Sites». Altere os textos/valores aqui e volte a gerar:  sh scripts/gerar.sh"""
import html
import json
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PUBLICO = RAIZ / "public"
PT = {}


def t(chave, en, pt, tag="span", attrs="", html_=False):
    """Elemento com texto em inglês (base) e tradução para português (i18n)."""
    PT[chave] = pt
    a = f' data-i18n-html="{chave}"' if html_ else f' data-i18n="{chave}"'
    corpo = en if html_ else html.escape(en, quote=False)
    return f"<{tag}{attrs}{a}>{corpo}</{tag}>"


def lista(prefixo, itens):
    return "<ul class=\"ps-lista\">" + "".join(t(f"{prefixo}.{i}", en, pt, "li") for i, (en, pt) in enumerate(itens)) + "</ul>"


WA = "https://wa.me/351962951161?text=" + "Ol%C3%A1%21%20Gostava%20de%20pedir%20a%20pr%C3%A9via%20gratuita%20do%20meu%20site."
SETA = '<svg class="seta" aria-hidden="true"><use href="assets/img/sprite.svg#seta"/></svg>'

PACOTES = [
    dict(id="essencial", leg=("To get started", "Para começar"), nome=("Essential", "Essencial"), preco=("€349", "349 €"),
         itens=[("Complete one-page website", "Site de 1 página completa"),
                ("WhatsApp button and quote request", "Botão de WhatsApp e pedido de orçamento"),
                ("Google Maps link", "Ligação ao Google Maps"),
                ("Ready in 7 days", "Pronto em 7 dias")]),
    dict(id="profissional", leg=("Most chosen", "Mais escolhido"), nome=("Professional", "Profissional"), preco=("€690", "690 €"), destaque=True,
         itens=[("Up to 5 pages, one per service", "Até 5 páginas, uma por serviço"),
                ("Local SEO for your area", "SEO local para a sua zona"),
                ("Optimised Google Business Profile", "Google Business Profile otimizado"),
                ("Reviews on the website", "Avaliações no site"),
                ("Ready in 10 days", "Pronto em 10 dias")]),
    dict(id="premium", leg=("Complete presence", "Presença completa"), nome=("Premium", "Premium"), preco=("€1,190", "1.190 €"),
         itens=[("Everything in Professional", "Tudo do Profissional"),
                ("Simple logo", "Logótipo simples"),
                ("Pages per city or area", "Páginas por cidade ou zona"),
                ("Google Analytics set up", "Google Analytics configurado"),
                ("1 month of Google Ads", "1 mês de anúncios Google"),
                ("Ready in 15 days", "Pronto em 15 dias")]),
]


def cartao_pacote(p):
    k = f"ps.p.{p['id']}"
    return (f'<li class="ps-pacote{" ps-pacote--destaque" if p.get("destaque") else ""}">'
            + t(f"{k}.leg", *p["leg"], "p", ' class="ps-pacote__leg"')
            + t(f"{k}.nome", *p["nome"], "h3", ' class="ps-pacote__nome"')
            + t(f"{k}.preco", *p["preco"], "p", ' class="ps-pacote__preco"')
            + lista(f"{k}.i", p["itens"])
            + f'<a class="botao{"" if p.get("destaque") else " botao--secundario"} ps-pacote__botao" href="{WA}" rel="noopener" data-whatsapp>'
            + t("ps.previa.curto", "Ask for a free preview", "Pedir prévia gratuita") + "</a></li>")


SEM_IVA = t("ps.iva", "Prices in euros, before VAT", "Valores em euros, sem IVA")

main = f'''<main id="conteudo">
<section class="heroi heroi-servicos heroi-servicos--precos ps-heroi">
  <div class="contentor">
    {t("ps.legenda", "Websites for small businesses", "Sites para pequenos negócios", "p", ' class="legenda"')}
    {t("ps.titulo", 'Your professional website, <span class="destaque">ready in 7 days.</span>', 'O seu site profissional, <span class="destaque">pronto em 7 dias.</span>', "h1", html_=True)}
    {t("ps.intro", "Fixed-price packages or a monthly plan, for every kind of business: services, shops, restaurants, health and wellbeing, and much more.", "Pacotes de preço fixo ou plano mensal, para negócios de todos os tipos: serviços, lojas, restauração, saúde e bem-estar, e muito mais.", "p", ' class="heroi-servicos__intro"')}
    <div class="heroi__acoes">
      <a class="botao" href="{WA}" rel="noopener" data-whatsapp>{t("ps.previa", "Ask for your free preview", "Pedir a prévia gratuita")}{SETA}</a>
      <a class="botao botao--secundario" href="#pacotes">{t("ps.ver", "See the packages", "Ver os pacotes")}</a>
    </div>
    <p class="selo-iva">{SEM_IVA}</p>
  </div>
</section>

<section class="seccao ps-problema" aria-labelledby="t-problema">
  <div class="contentor">
    <header class="cabeca-seccao">
      {t("ps.prob.leg", "The problem", "O problema", "p", ' class="legenda"')}
      {t("ps.prob.t", "When people look for a business near them, they choose whoever shows up first.", "Quem procura um negócio na sua zona escolhe quem aparece primeiro.", "h2", ' id="t-problema"')}
    </header>
    <ul class="ps-cartoes">
      <li class="ps-cartao">{t("ps.prob.1.t", "Without a website, you’re invisible", "Sem site, fica invisível", "h3")}{t("ps.prob.1.p", "Businesses without a website lose Google searches to the competition.", "Quem não tem site perde as pesquisas no Google para a concorrência.", "p")}</li>
      <li class="ps-cartao">{t("ps.prob.2.t", "A Google listing isn’t enough", "A ficha do Google não chega", "h3")}{t("ps.prob.2.p", "A few photos and little information about what you do won’t convince a new customer.", "Poucas fotos e pouca informação sobre o que faz não convencem um cliente novo.", "p")}</li>
      <li class="ps-cartao">{t("ps.prob.3.t", "Word of mouth has its limits", "O passa-a-palavra tem limite", "h3")}{t("ps.prob.3.p", "It works, but it doesn’t bring in new customers every week.", "Funciona, mas não traz clientes novos todas as semanas.", "p")}</li>
    </ul>
  </div>
</section>

<section class="seccao catalogo--nevoa ps-como" aria-labelledby="t-como">
  <div class="contentor">
    <header class="cabeca-seccao">
      {t("ps.como.leg", "How it works", "Como funciona", "p", ' class="legenda"')}
      {t("ps.como.t", "See your website before you pay.", "Vê o seu site antes de pagar.", "h2", ' id="t-como"')}
    </header>
    <ol class="passos ps-passos">
      <li class="passo">{t("ps.como.1.t", "Free preview", "Prévia gratuita", "h3")}{t("ps.como.1.p", "We prepare a proposal for your website with your name, services and photos.", "Preparamos uma proposta do seu site com o seu nome, serviços e fotos.", "p")}</li>
      <li class="passo">{t("ps.como.2.t", "Approve and adjust", "Aprova e ajusta", "h3")}{t("ps.como.2.p", "You choose the package and tell us what to change.", "Escolhe o pacote e diz-nos o que mudar.", "p")}</li>
      <li class="passo">{t("ps.como.3.t", "Online in 7 days", "Online em 7 dias", "h3")}{t("ps.como.3.p", "The website goes live, connected to Google and WhatsApp.", "O site fica publicado, ligado ao Google e ao WhatsApp.", "p")}</li>
    </ol>
  </div>
</section>

<section class="seccao ps-precos" id="pacotes" aria-labelledby="t-pacotes">
  <div class="contentor">
    <header class="cabeca-seccao">
      {t("ps.pac.leg", "Packages", "Pacotes", "p", ' class="legenda"')}
      {t("ps.pac.t", "Fixed-price packages.", "Pacotes de preço fixo.", "h2", ' id="t-pacotes"')}
    </header>
    <ul class="ps-pacotes">{"".join(cartao_pacote(p) for p in PACOTES)}</ul>
    <p class="ps-nota-iva">{SEM_IVA}</p>
  </div>
</section>

<section class="seccao catalogo--nevoa ps-mensal" id="mensal" aria-labelledby="t-mensal">
  <div class="contentor ps-mensal__grelha">
    <div>
      {t("ps.men.leg", "Monthly plan", "Plano mensal", "p", ' class="legenda"')}
      {t("ps.men.t", "A professional website without paying it all at once.", "Um site profissional sem pagar tudo de uma vez.", "h2", ' id="t-mensal"')}
      {t("ps.men.p", "The same website as the Essential package, with hosting and changes included, for a fixed monthly fee.", "O mesmo site do pacote Essencial, com alojamento e alterações incluídos, por uma mensalidade fixa.", "p", ' class="ps-mensal__texto"')}
    </div>
    <div class="ps-pacote ps-pacote--mensal">
      {t("ps.men.c.leg", "No big upfront investment", "Sem grande investimento inicial", "p", ' class="ps-pacote__leg"')}
      <p class="ps-pacote__preco">{t("ps.men.preco", "€59", "59 €")} <small>{t("ps.mes", "/month", "/mês")}</small></p>
      {t("ps.men.ativ", "+ €99 setup fee", "+ 99 € de ativação", "p", ' class="ps-pacote__extra"')}
      {lista("ps.men.i", [("Complete one-page website", "Site de 1 página completa"), ("WhatsApp button and quote request", "Botão de WhatsApp e pedido de orçamento"), ("Google Maps link", "Ligação ao Google Maps"), ("Hosting, domain and text changes", "Alojamento, domínio e alterações de texto"), ("Ready in 7 days", "Pronto em 7 dias")])}
      {t("ps.men.fid", "12-month commitment. After that, you continue with maintenance only, at €29/month.", "Fidelização de 12 meses. Depois, continua só com a manutenção a 29 €/mês.", "p", ' class="ps-pacote__nota"')}
      <a class="botao ps-pacote__botao" href="{WA}" rel="noopener" data-whatsapp>{t("ps.previa.curto", "Ask for a free preview", "Pedir prévia gratuita")}</a>
    </div>
  </div>
</section>

<section class="seccao ps-depois" aria-labelledby="t-depois">
  <div class="contentor">
    <header class="cabeca-seccao">
      {t("ps.dep.leg", "After the website", "Depois do site", "p", ' class="legenda"')}
      {t("ps.dep.t", "We look after your website while you work.", "Cuidamos do site enquanto trabalha.", "h2", ' id="t-depois"')}
    </header>
    <ul class="ps-pacotes ps-pacotes--duas">
      <li class="ps-pacote">{t("ps.dep.m.n", "Maintenance", "Manutenção", "h3", ' class="ps-pacote__nome"')}<p class="ps-pacote__preco">{t("ps.dep.m.p", "€29", "29 €")} <small>{t("ps.mes", "/month", "/mês")}</small></p>{lista("ps.dep.m.i", [("Hosting and domain", "Alojamento e domínio"), ("Security and backups", "Segurança e cópias de segurança"), ("Small text changes", "Pequenas alterações de texto")])}</li>
      <li class="ps-pacote">{t("ps.dep.c.n", "Growth", "Crescimento", "h3", ' class="ps-pacote__nome"')}<p class="ps-pacote__preco">{t("ps.dep.c.p", "€69", "69 €")} <small>{t("ps.mes", "/month", "/mês")}</small></p>{lista("ps.dep.c.i", [("Everything in Maintenance", "Tudo da Manutenção"), ("New photos and updates from your business on the website and on Google", "Fotos e novidades do seu negócio no site e no Google"), ("Review management", "Gestão de avaliações"), ("Simple monthly report", "Relatório mensal simples")])}</li>
    </ul>
  </div>
</section>

<section class="seccao catalogo--nevoa ps-pagamento" aria-labelledby="t-pagamento">
  <div class="contentor">
    <header class="cabeca-seccao">
      {t("ps.pag.leg", "Payment options", "Formas de pagamento", "p", ' class="legenda"')}
      {t("ps.pag.t", "Choose how you prefer to pay.", "Escolha como prefere pagar.", "h2", ' id="t-pagamento"')}
    </header>
    <ul class="ps-cartoes">
      <li class="ps-cartao">{t("ps.pag.1.t", "One-off payment", "Pagamento único", "h3")}{t("ps.pag.1.p", "50% when you confirm and 50% on delivery.", "50% na adjudicação e 50% na entrega.", "p")}{t("ps.pag.1.n", "For the Essential package, payment is made in full when you confirm.", "No Essencial, o pagamento é feito na adjudicação.", "p", ' class="ps-cartao__nota"')}</li>
      <li class="ps-cartao">{t("ps.pag.2.t", "Monthly", "Mensal", "h3")}{t("ps.pag.2.p", "€99 setup + €59/month, by automatic direct debit.", "99 € de ativação + 59 €/mês, por débito direto automático.", "p")}{t("ps.pag.2.n", "12-month commitment.", "Fidelização de 12 meses.", "p", ' class="ps-cartao__nota"')}</li>
      <li class="ps-cartao">{t("ps.pag.3.t", "Yearly", "Anual", "h3")}{t("ps.pag.3.p", "12 months at once with a 10% discount: €637 instead of €708.", "12 meses de uma vez com 10% de desconto: 637 € em vez de 708 €.", "p")}{t("ps.pag.3.n", "No monthly payments during the year.", "Sem mensalidades durante o ano.", "p", ' class="ps-cartao__nota"')}</li>
    </ul>
  </div>
</section>

<section class="seccao ps-extras" aria-labelledby="t-extras">
  <div class="contentor ps-extras__grelha">
    <header class="cabeca-seccao">
      {t("ps.ext.leg", "Extras", "Extras", "p", ' class="legenda"')}
      {t("ps.ext.t", "Add only what you need.", "Acrescente só o que precisa.", "h2", ' id="t-extras"')}
    </header>
    <table class="tabela-precos">
      <tr><th scope="row">{t("ps.ext.1.n", "Extra page", "Página extra")}</th><td>{t("ps.ext.1.p", "€75", "75 €")}</td></tr>
      <tr><th scope="row">{t("ps.ext.2.n", "Simple logo", "Logótipo simples")}</th><td>{t("ps.ext.2.p", "€90", "90 €")}</td></tr>
      <tr><th scope="row">{t("ps.ext.3.n", "Photo editing", "Edição de fotos")}</th><td>{t("ps.ext.3.p", "€60", "60 €")}</td></tr>
      <tr><th scope="row">{t("ps.ext.4.n", "Google Ads setup (monthly management charged separately)", "Configuração de anúncios Google (gestão mensal à parte)")}</th><td>{t("ps.ext.4.p", "€150", "150 €")}</td></tr>
    </table>
  </div>
</section>

<section class="seccao chamada" aria-labelledby="t-chamada">
  <svg class="chamada__abelha chamada__abelha--1 abelha--branca" aria-hidden="true"><use href="assets/img/sprite.svg#abelha"/></svg>
  <svg class="chamada__abelha chamada__abelha--2 abelha--branca" aria-hidden="true"><use href="assets/img/sprite.svg#abelha"/></svg>
  <div class="contentor">
    {t("ps.cta.t", "If you don’t like the first version, you don’t pay.", "Se não gostar da primeira versão, não paga.", "h2", ' id="t-chamada"')}
    {t("ps.cta.p", "Ask for the free preview of your new website today.", "Peça já a prévia gratuita do seu novo site.", "p")}
    <div class="chamada__acoes">
      <a class="botao botao--claro" href="{WA}" rel="noopener" data-whatsapp>{t("ps.cta.wa", "Ask on WhatsApp", "Pedir no WhatsApp")}{SETA}</a>
      <a class="botao botao--secundario" href="tel:+351933690514">{t("ps.cta.tel", "Call (+351) 933 690 514", "Ligar (+351) 933 690 514")}</a>
    </div>
    <p class="ps-cta__contactos"><a href="mailto:info@heyimplement.com">info@heyimplement.com</a> · <a href="https://www.instagram.com/heyimplement" rel="noopener">@heyimplement</a></p>
  </div>
</section>
</main>'''

base = (PUBLICO / "contact.html").read_text(encoding="utf-8")
cabeca = base[:base.index("</head>")]
cabeca = re.sub(r"<title>.*?</title>\n", "", cabeca)
for padrao in [r'<meta name="titulo-pt"[^>]*>\n', r'<meta name="description"[^>]*>\n', r'<meta name="robots"[^>]*>\n', r'<link rel="canonical"[^>]*>\n',
               r'<meta property="og:[^>]*>\n', r'<meta name="twitter:[^>]*>\n', r'<script src="assets/js/contacto\.js[^"]*"[^>]*></script>\n?']:
    cabeca = re.sub(padrao, "", cabeca)
assert "contacto.js" not in cabeca
meta = '''<title>Website packages — Implement</title>
<meta name="titulo-pt" content="Pacotes de sites — Implement">
<meta name="robots" content="noindex, nofollow">
<meta name="description" content="Professional websites for small businesses of every kind, ready in 7 days. Fixed-price packages or a monthly plan.">'''
cabeca = cabeca.replace('<meta charset="utf-8">\n', '<meta charset="utf-8">\n<!-- Gerado por scripts/pacotes_sites.py: altere o conteúdo lá e volte a gerar. -->\n', 1)
cabeca = cabeca.replace('<meta name="viewport"', meta + '\n<meta name="viewport"', 1)
cabeca, n = re.subn(r'(<script src="assets/js/i18n\.js[^"]*" defer></script>)', lambda m: m.group(1) + '\n<script src="assets/js/i18n-pacotes-sites.js" defer></script>', cabeca, count=1)
assert n == 1
topo = base[base.index('<a class="saltar"'):base.index("<main")].replace(' aria-current="page"', "")
rodape = base[base.index('<footer class="rodape">'):base.index("</body>")]
doc = cabeca + "</head>\n<body>\n" + topo + main + "\n\n" + rodape + "</body>\n</html>\n"
(PUBLICO / "pacotes-sites.html").write_text(doc, encoding="utf-8")

linhas = ",\n".join(f"  {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)}" for k, v in PT.items())
(PUBLICO / "assets/js/i18n-pacotes-sites.js").write_text(
    "/* Textos em português da página de pacotes de sites. Só é carregado em pacotes-sites.html.\n   Gerado por scripts/pacotes_sites.py: altere lá e volte a gerar. */\n"
    f"Object.assign(window.IMPLEMENT_PT = window.IMPLEMENT_PT || {{}}, {{\n{linhas}\n}});\n", encoding="utf-8")
print("pacotes-sites.html e i18n-pacotes-sites.js gerados.")
