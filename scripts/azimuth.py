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


def botao_pagar(link, chave, en="Subscribe", pt="Subscrever", secundario=False):
    if link:
        return f'<a class="botao{" botao--secundario" if secundario else ""} ps-pacote__botao" href="{html.escape(link)}" rel="noopener">{t(chave, en, pt)}<svg class="seta" aria-hidden="true"><use href="assets/img/sprite.svg#seta"/></svg></a>'
    return f'<span class="botao botao--secundario ps-pacote__botao az-em-breve">{t("az.embreve", "Payment link coming soon", "Link de pagamento em breve")}</span>'


WA = "https://wa.me/351962951161?text=" + "Ol%C3%A1%21%20Tenho%20uma%20d%C3%BAvida%20sobre%20o%20plano%20do%20site%20da%20Azimuth."

main = f'''<main id="conteudo">
<section class="heroi heroi-servicos heroi-servicos--precos ps-heroi">
  <div class="contentor">
    {t("az.legenda", "Azimuth · Your website", "Azimuth · O seu site", "p", ' class="legenda"')}
    {t("az.titulo", 'Your website is ready. <span class="destaque">Just one step left.</span>', 'O seu site está pronto. <span class="destaque">Falta só um passo.</span>', "h1", html_=True)}
    {t("az.intro", "To keep your website online, all that’s left is to activate the hosting plan we agreed on. It takes two minutes and payment is made securely with Stripe.", "Para o site continuar online, só falta ativar o plano de alojamento que combinámos. Demora dois minutos e o pagamento é feito em segurança pelo Stripe.", "p", ' class="heroi-servicos__intro"')}
    <div class="heroi__acoes">
      <a class="botao" href="#plano">{t("az.ver", "See my plan", "Ver o meu plano")}<svg class="seta" aria-hidden="true"><use href="assets/img/sprite.svg#seta"/></svg></a>
    </div>
  </div>
</section>

<section class="seccao catalogo--nevoa ps-mensal" id="plano" aria-labelledby="t-plano">
  <div class="contentor ps-mensal__grelha">
    <div>
      {t("az.plano.leg", "Your plan", "O seu plano", "p", ' class="legenda"')}
      {t("az.plano.t", "Hosting and changes to your website.", "Alojamento e alterações do site.", "h2", ' id="t-plano"')}
      {t("az.plano.p", "This is the plan you joined. Hosting is what keeps your website online, and it also covers the changes you need along the way. Once it’s active, you don’t need to do anything else: the following months are charged automatically.", "Este é o plano a que aderiu. O alojamento é o que mantém o site online e inclui também as alterações de que precisar ao longo do ano. Depois de ativar, não precisa de fazer mais nada: os meses seguintes são cobrados automaticamente.", "p", ' class="ps-mensal__texto"')}
    </div>
    <div class="ps-pacote ps-pacote--mensal">
      {t("az.h.leg", "12 months", "12 meses", "p", ' class="ps-pacote__leg"')}
      {t("az.h.nome", "Website hosting and changes", "Alojamento e alterações do site", "h3", ' class="ps-pacote__nome"')}
      <p class="ps-pacote__preco">{t("az.h.preco", "€35", "35 €")} <small>{t("az.mes.iva", "/month + VAT", "/mês + IVA")}</small></p>
      {t("az.h.total", "€43.05/month with VAT · 12 payments", "43,05 €/mês com IVA · 12 pagamentos", "p", ' class="ps-pacote__extra"')}
      {lista("az.h.i", [("Your website online for a full year", "O seu site online durante um ano inteiro"), ("Changes to your website included", "Alterações ao site incluídas"), ("Automatic monthly payment by card", "Pagamento mensal automático com cartão")])}
      {botao_pagar(LINK_HOSPEDAGEM, "az.h.botao", "Activate my plan", "Ativar o meu plano")}
    </div>
  </div>
</section>


<section class="seccao ps-mensal" id="conteudo-inverno" aria-labelledby="t-extra">
  <div class="contentor ps-mensal__grelha">
    <div>
      {t("az.extra.leg", "Optional", "Opcional", "p", ' class="legenda"')}
      {t("az.extra.t", "And if you’d like, we can also look after your social media this winter.", "E, se quiser, também cuidamos das suas redes este inverno.", "h2", ' id="t-extra"')}
      {t("az.extra.p", "This one is entirely up to you and doesn’t affect your website. Two posts a week on your feed, so your business keeps showing up during the quieter months.", "Este é à sua escolha e não tem nada a ver com o site. Duas publicações por semana no feed, para o seu negócio continuar presente nos meses mais calmos.", "p", ' class="ps-mensal__texto"')}
    </div>
    <div class="ps-pacote ps-pacote--destaque">
      {t("az.c.leg", "Winter · 4 months", "Inverno · 4 meses", "p", ' class="ps-pacote__leg"')}
      {t("az.c.nome", "Winter content", "Conteúdo de inverno", "h3", ' class="ps-pacote__nome"')}
      <p class="ps-pacote__preco">{t("az.c.preco", "€65", "65 €")} <small>{t("az.mes.iva", "/month + VAT", "/mês + IVA")}</small></p>
      {t("az.c.total", "€79.95/month with VAT · 4 payments", "79,95 €/mês com IVA · 4 pagamentos", "p", ' class="ps-pacote__extra"')}
      {lista("az.c.i", [("2 posts a week on your feed", "2 publicações por semana no feed"), ("About 8 posts a month, for 4 months", "Cerca de 8 publicações por mês, durante 4 meses"), ("Automatic monthly payment by card", "Pagamento mensal automático com cartão")])}
      {botao_pagar(LINK_CONTEUDO, "az.c.botao", "I’d like this too", "Quero também")}
    </div>
  </div>
</section>

<section class="seccao catalogo--nevoa ps-como" aria-labelledby="t-como">
  <div class="contentor">
    <header class="cabeca-seccao">
      {t("az.como.leg", "How to activate", "Como ativar", "p", ' class="legenda"')}
      {t("az.como.t", "Three quick steps.", "Três passos rápidos.", "h2", ' id="t-como"')}
    </header>
    <ol class="passos ps-passos">
      <li class="passo">{t("az.como.1.t", "Click “Activate my plan”", "Clique em “Ativar o meu plano”", "h3")}{t("az.como.1.p", "The secure Stripe page opens with your plan already filled in.", "Abre a página segura do Stripe, já com o seu plano.", "p")}</li>
      <li class="passo">{t("az.como.2.t", "Enter your card", "Indique o cartão", "h3")}{t("az.como.2.p", "Add your company name and VAT number if you want them on the invoice.", "Pode indicar o nome da empresa e o NIF para a fatura.", "p")}</li>
      <li class="passo">{t("az.como.3.t", "All set", "Está feito", "h3")}{t("az.como.3.p", "Your website stays online and you receive the receipt by email.", "O site continua online e recebe o recibo por e-mail.", "p")}</li>
    </ol>
  </div>
</section>

<section class="seccao chamada" aria-labelledby="t-chamada">
  <svg class="chamada__abelha chamada__abelha--1 abelha--branca" aria-hidden="true"><use href="assets/img/sprite.svg#abelha"/></svg>
  <svg class="chamada__abelha chamada__abelha--2 abelha--branca" aria-hidden="true"><use href="assets/img/sprite.svg#abelha"/></svg>
  <div class="contentor">
    {t("az.cta.t", "Thank you for trusting us with your website.", "Obrigada pela confiança no nosso trabalho.", "h2", ' id="t-chamada"')}
    {t("az.cta.p", "If you have any questions before activating, just talk to us.", "Se tiver alguma dúvida antes de ativar, é só falar connosco.", "p")}
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
meta = '''<title>Azimuth website — Implement</title>
<meta name="titulo-pt" content="O seu site — Azimuth · Implement">
<meta name="robots" content="noindex, nofollow">
<meta name="description" content="Activate the hosting plan for the Azimuth website.">'''
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
