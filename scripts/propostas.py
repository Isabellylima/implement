#!/usr/bin/env python3
"""Propostas por cliente (procedimento padrão depois da 1.ª reunião / orçamento).

Cada ficheiro propostas/<slug>.json gera public/proposta-<slug>.html (privada, noindex) e
public/assets/js/i18n-proposta-<slug>.js. O cliente responde passo a passo (barra da abelha):
site, redes sociais, orçamento mensal + dúvidas, e-mail. As respostas vão por assets/js/proposta.js
para /api/contacto: ficam na base de dados, chegam a info@ (budget no assunto) e entram no HubSpot.

Modelo: propostas/_modelo.json (gera /proposta-modelo, para ver como fica).
Novo cliente: copiar o modelo para propostas/<slug>.json, preencher e correr  sh scripts/gerar.sh
Valores de referência: PRECOS abaixo (manter iguais ao Preçário)."""
import html
import json
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PUBLICO = RAIZ / "public"
PASTA = RAIZ / "propostas"
SETA = '<svg class="seta" aria-hidden="true"><use href="assets/img/sprite.svg#seta"/></svg>'
PT = {}

# Valores de referência mostrados ao cliente (discretos, «Reference: …»)
PRECOS = {
    "site_um": ("Reference: from €349, or €59/month", "Referência: desde 349 €, ou 59 €/mês"),
    "site_varias": ("Reference: from €690", "Referência: desde 690 €"),
    "plano1": ("Reference: around €240/month", "Referência: cerca de 240 €/mês"),
    "plano2": ("Reference: around €390/month", "Referência: cerca de 390 €/mês"),
}


def t(chave, en, pt, tag="span", attrs="", html_=False):
    PT[chave] = pt
    a = f' data-i18n-html="{chave}"' if html_ else f' data-i18n="{chave}"'
    return f"<{tag}{attrs}{a}>{en if html_ else html.escape(en, quote=False)}</{tag}>"


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


def pilulas(nome, k, lista, tipo="checkbox"):
    return ('<div class="cb-ops cb-ops--pilulas">'
            + "".join(opcao(nome, en, f"{k}{i}", (en, pt), tipo=tipo) for i, (en, pt) in enumerate(lista)) + "</div>")


def pagina(c):
    PT.clear()
    slug, cliente, marca = c["slug"], c["cliente"], c["marca"]
    neg_en, neg_pt = c.get("negocio", ["your business", "o seu negócio"])
    em_en, em_pt = c.get("local", ["at your business", "no seu negócio"])
    um_item = c.get("pagina_unica", ["Services, contacts and map", "Serviços, contactos e mapa"])
    sessao = (f"1 content session {em_en} a month", f"1 sessão de captação {em_pt} por mês")
    comum = [("On the networks we agree on", "Nas redes que combinarmos"), ("1 planning meeting a month", "1 reunião de alinhamento por mês"), sessao, ("We create and publish the posts", "Criamos e publicamos os posts")]
    nao = [("We’ll suggest what makes sense", "Sugerimos o que fizer sentido")]

    passos = "".join([
        passo("site", "pp.p1", (f"What kind of website suits {neg_en}?", f"Que tipo de site faz sentido para {neg_pt}?"),
              ("Choose what feels right. Values are only a reference: your proposal will be made for you.", "Escolha o que lhe parece melhor. Os valores são só uma referência: a proposta é feita à sua medida."),
              '<div class="cb-ops cb-ops--3">'
              + opcao("site", "One complete page", "pp.p1.um", ("One complete page", "Uma página completa"), PRECOS["site_um"],
                      [("Everything on one page", "Tudo numa página"), tuple(um_item), ("WhatsApp button", "Botão de WhatsApp"), ("Ready in 7 days", "Pronto em 7 dias")])
              + opcao("site", "A few pages", "pp.p1.varias", ("A few pages", "Algumas páginas"), PRECOS["site_varias"],
                      [("Up to 5 pages", "Até 5 páginas"), ("Found on Google in the area", "Encontrado no Google na zona"), ("Google profile and reviews", "Perfil Google e avaliações")])
              + opcao("site", "Not sure yet", "pp.p1.nao", ("Not sure yet", "Ainda não sei"), None, nao)
              + "</div>"
              + t("pp.p1.mostrar", "What should it show?", "O que deve mostrar?", "p", ' class="cb-sub"')
              + pilulas("site_conteudo", "pp.p1.c", c.get("site_conteudo", []))
              + t("pp.p1.lin", "Languages", "Línguas", "p", ' class="cb-sub"')
              + pilulas("linguas", "pp.p1.l", c.get("linguas", []))
              + t("pp.p1.pag", "For the website, you’d rather…", "Para o site, prefere…", "p", ' class="cb-sub"')
              + pilulas("pagamento", "pp.p1.pg", [("Pay once", "Pagar de uma vez"), ("Spread it monthly", "Dividir por meses"), ("Not sure", "Ainda não sei")], tipo="radio"),
              curto=("Website", "Site")),
        passo("redes", "pp.p2", (f"How present do you want {neg_en} to be on social media?", f"Quanta presença quer que {neg_pt} tenha nas redes?"),
              (f"We plan with you, film {em_en}, and create and publish the posts for you.", f"Planeamos consigo, filmamos {em_pt}, e criamos e publicamos os posts por si."),
              '<div class="cb-ops cb-ops--3">'
              + opcao("redes", "Plan 1: 2 posts + 1 reel per week, up to 5 stories", "pp.p2.a", ("Plan 1", "Plano 1"), PRECOS["plano1"],
                      [("2 posts + 1 reel per week", "2 publicações + 1 reel por semana"), ("Up to 5 stories per week", "Até 5 stories por semana")] + comum)
              + opcao("redes", "Plan 2: 3 posts + 2 reels per week, up to 12 stories", "pp.p2.b", ("Plan 2", "Plano 2"), PRECOS["plano2"],
                      [("3 posts + 2 reels per week", "3 publicações + 2 reels por semana"), ("Up to 12 stories per week", "Até 12 stories por semana")] + comum)
              + opcao("redes", "Not sure yet", "pp.p2.nao", ("Not sure yet", "Ainda não sei"), None, nao)
              + "</div>"
              + t("pp.p2.red", "Which networks?", "Que redes?", "p", ' class="cb-sub"')
              + pilulas("redes_lista", "pp.p2.r", c.get("redes", [["Instagram", "Instagram"], ["Facebook", "Facebook"], ["TikTok", "TikTok"], ["Google", "Google"]])),
              curto=("Social media", "Redes")),
        passo("valor", "pp.p4", ("How much would you like to invest per month?", "Quanto gostaria de investir por mês?"),
              ("Your honest figure. We’ll build the package around it.", "O seu valor real. Montamos o pacote à volta dele."),
              '<div class="cb-ops cb-ops--pilulas" id="cb-sugestoes">'
              + "".join(f'<button type="button" class="cb-chip" data-valor="{v}">{v} €</button>' for v in c.get("sugestoes", [100, 150, 200, 300, 400]))
              + '</div><label class="cb-valor"><span class="sr-only">€</span><input class="entrada" id="cb-valor" name="valor" type="number" inputmode="numeric" min="1" max="100000" step="1">'
              + t("pp.p4.mes", "€ / month", "€ / mês", "span", ' class="cb-valor__suf"') + "</label>"
              + '<label class="cb-sub" for="cb-notas">' + t("pp.p4.notas", "Any questions or comments?", "Alguma dúvida ou observação?")
              + ' <span class="opcional">' + t("pp.opcional", "optional", "opcional") + '</span></label>'
              + '<textarea class="entrada cb-notas" id="cb-notas" name="notas" maxlength="1500" rows="4"></textarea>', curto=("Budget", "Orçamento")),
        passo("email", "pp.p5", ("Where should we send your proposal?", "Para onde enviamos a proposta?"), None,
              '<div class="cb-email"><label class="sr-only" for="cb-mail">Email</label>'
              '<input class="entrada" id="cb-mail" name="email" type="email" autocomplete="email" inputmode="email" placeholder="email@example.com"></div>'
              + '<p class="cb-privado">' + t("pp.priv", "We only use your email to send you the proposal.", "Usamos o seu e-mail apenas para lhe enviar a proposta.")
              + ' <a href="/privacy.html" target="_blank" rel="noopener">' + t("pp.politica", "Privacy policy", "Política de privacidade") + '</a></p>', curto=("Email", "E-mail")),
    ])

    nome_curto = cliente.split()[0]
    e = lambda x: html.escape(x, quote=True)
    main = f'''<main id="conteudo">
<section class="seccao cb-pagina">
  <div class="contentor cb-grelha">
    <div>
      <header class="cb-topo">
        {t("pp.legenda", f"{marca} · {nome_curto}", f"{marca} · {nome_curto}", "p", ' class="legenda"')}
        {t("pp.titulo", 'Let’s shape your proposal <span class="destaque">together.</span>', 'Vamos montar a sua proposta <span class="destaque">juntos.</span>', "h1", html_=True)}
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
        <form id="cb-form" novalidate data-cliente="{e(cliente)}" data-marca="{e(marca)}">
          <div class="form-corpo">{passos}<p class="aviso-erro" id="cb-aviso" aria-live="polite"></p></div>
          <div class="mel-pote" aria-hidden="true"><label>Company website <input type="text" name="site_empresa" tabindex="-1" autocomplete="off"></label></div>
          <div class="form-pe">
            {t("pp.pe", "Takes less than a minute", "Demora menos de um minuto", "span", ' class="form-pe__guardado"')}
            <div class="form-pe__botoes">
              <button type="button" class="botao-voltar" id="cb-voltar" hidden>{t("pp.voltar", "Back", "Voltar")}</button>
              <button type="button" class="botao" id="cb-seguinte">{t("pp.seguinte", "Next", "Seguinte")}{SETA}</button>
              <button type="submit" class="botao" id="cb-enviar" hidden>{t("pp.enviar", "Send", "Enviar")}{SETA}</button>
            </div>
          </div>
        </form>
        <div class="sucesso" id="cb-sucesso" hidden tabindex="-1">
          <svg class="abelha-grande" aria-hidden="true"><use href="assets/img/sprite.svg#abelha"/></svg>
          {t("pp.ok.t", f"Thank you, {nome_curto}!", f"Obrigada, {nome_curto}!", "h2")}
          {t("pp.ok.p", "We’re going to work on a personalised package that fits what you need and your budget. We’ll be in touch very soon.", "Vamos trabalhar num pacote personalizado que responda ao que precisa e ao seu orçamento. Falamos consigo muito em breve.", "p")}
        </div>
      </div>
    </div>
    <aside class="cb-resumo" aria-live="polite">
      {t("pp.r.t", "Your choices", "As suas escolhas", "p", ' class="cb-resumo__titulo"')}
      <ul class="cb-resumo__lista" id="cb-resumo"></ul>
      {t("pp.r.vazio", "Your choices will appear here.", "As suas escolhas aparecem aqui.", "p", ' class="cb-resumo__vazio" id="cb-resumo-vazio"')}
    </aside>
  </div>
</section>
</main>'''

    idioma = c.get("idioma", "en")
    base = (PUBLICO / "contact.html").read_text(encoding="utf-8")
    cabeca = base[:base.index("</head>")]
    cabeca = re.sub(r"<title>.*?</title>\n", "", cabeca)
    for padrao in [r'<meta name="titulo-pt"[^>]*>\n', r'<meta name="description"[^>]*>\n', r'<meta name="robots"[^>]*>\n', r'<link rel="canonical"[^>]*>\n',
                   r'<meta property="og:[^>]*>\n', r'<meta name="twitter:[^>]*>\n', r'<script src="assets/js/contacto\.js[^"]*"[^>]*></script>\n?']:
        cabeca = re.sub(padrao, "", cabeca)
    meta = (f'<title>{e(marca)} · Your proposal — Implement</title>\n<meta name="titulo-pt" content="{e(marca)} · A sua proposta — Implement">\n'
            f'<meta name="robots" content="noindex, nofollow">\n<meta name="description" content="Website and social media proposal for {e(marca)}.">')
    cabeca = cabeca.replace('<meta charset="utf-8">\n', f'<meta charset="utf-8">\n<!-- Gerado por scripts/propostas.py a partir de propostas/{slug}.json: altere lá e volte a gerar. -->\n', 1)
    cabeca = cabeca.replace('<html lang="en">', f'<html lang="{"pt-PT" if idioma == "pt" else "en"}" data-idioma-fixo="{idioma}">', 1)
    cabeca = cabeca.replace('<meta name="viewport"', meta + '\n<meta name="viewport"', 1)
    cabeca, n = re.subn(r'(<script src="assets/js/i18n\.js[^"]*" defer></script>)',
                        lambda m: m.group(1) + f'\n<script src="assets/js/i18n-proposta-{slug}.js" defer></script>\n<script src="assets/js/proposta.js" defer></script>', cabeca, count=1)
    assert n == 1
    topo = base[base.index('<a class="saltar"'):base.index("<main")].replace(' aria-current="page"', "")
    rodape = base[base.index('<footer class="rodape">'):base.index("</body>")]
    (PUBLICO / f"proposta-{slug}.html").write_text(cabeca + "</head>\n<body>\n" + topo + main + "\n\n" + rodape + "</body>\n</html>\n", encoding="utf-8")
    linhas = ",\n".join(f"  {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)}" for k, v in PT.items())
    (PUBLICO / f"assets/js/i18n-proposta-{slug}.js").write_text(
        f"/* Textos em português da proposta {marca}. Gerado por scripts/propostas.py. */\n"
        f"Object.assign(window.IMPLEMENT_PT = window.IMPLEMENT_PT || {{}}, {{\n{linhas}\n}});\n", encoding="utf-8")
    return slug


if __name__ == "__main__":
    feitos = []
    for f in sorted(PASTA.glob("*.json")):
        c = json.loads(f.read_text(encoding="utf-8"))
        c.setdefault("slug", "modelo" if f.stem == "_modelo" else f.stem)
        assert re.fullmatch(r"[a-z0-9-]+", c["slug"]), f"slug inválido em {f.name}"
        feitos.append(pagina(c))
    # Apaga páginas de propostas cujo .json já não existe
    for antiga in PUBLICO.glob("proposta-*.html"):
        s = antiga.stem.removeprefix("proposta-")
        if s not in feitos:
            antiga.unlink()
            (PUBLICO / f"assets/js/i18n-proposta-{s}.js").unlink(missing_ok=True)
    print("Propostas geradas:", ", ".join(f"/proposta-{s}" for s in feitos) or "nenhuma")
