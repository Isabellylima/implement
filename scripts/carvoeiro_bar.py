#!/usr/bin/env python3
"""Gera public/carvoeiro-bar.html (página privada, noindex) para o Carvoeiro Bar (Bob van Goethem):
mostra os pacotes mínimos de site e de gestão de redes e um questionário para ele escolher os serviços
e dizer o valor mensal que quer investir. Também gera public/assets/js/i18n-carvoeiro-bar.js (textos em PT).

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


# ---------- Pacotes ----------
def pacote(k, leg, nome, preco, sufixo, extra, itens, nota=None, destaque=False):
    return (f'<li class="ps-pacote{" ps-pacote--destaque" if destaque else ""}">'
            + t(f"{k}.leg", *leg, "p", ' class="ps-pacote__leg"')
            + t(f"{k}.nome", *nome, "h3", ' class="ps-pacote__nome"')
            + f'<p class="ps-pacote__preco">{t(f"{k}.preco", *preco)} <small>{t(f"{k}.suf", *sufixo)}</small></p>'
            + (t(f"{k}.extra", *extra, "p", ' class="ps-pacote__extra"') if extra else "")
            + lista(f"{k}.i", itens)
            + (t(f"{k}.nota", *nota, "p", ' class="ps-pacote__nota"') if nota else "")
            + "</li>")


SITES = "".join([
    pacote("cb.s.ess", ("The minimum to start", "O mínimo para começar"), ("Essential website", "Site Essencial"), ("€349", "349 €"), ("one-off + VAT", "pagamento único + IVA"),
           ("Or €59/month + €99 activation (monthly plan)", "Ou 59 €/mês + 99 € de ativação (plano mensal)"),
           [("One complete page for the bar", "Uma página completa para o bar"),
            ("Drinks, food and events in one place", "Bebidas, comida e eventos num só sítio"),
            ("Opening hours and Google Maps location", "Horário e localização no Google Maps"),
            ("WhatsApp button so people can reach you", "Botão de WhatsApp para falarem consigo"),
            ("Works on every phone", "Funciona em qualquer telemóvel"),
            ("Ready in 7 days", "Pronto em 7 dias")],
           ("Hosting and small updates: €29/month + VAT", "Alojamento e pequenas alterações: 29 €/mês + IVA"), destaque=True),
    pacote("cb.s.pro", ("More pages, more reach", "Mais páginas, mais alcance"), ("Professional website", "Site Profissional"), ("€690", "690 €"), ("one-off + VAT", "pagamento único + IVA"),
           ("50% to start, 50% on delivery", "50% para começar, 50% na entrega"),
           [("Up to 5 pages (menu, events, gallery…)", "Até 5 páginas (menu, eventos, galeria…)"),
            ("Local SEO for Carvoeiro and Lagoa", "SEO local para Carvoeiro e Lagoa"),
            ("Google Business Profile optimised", "Perfil Google Business otimizado"),
            ("Your reviews shown on the website", "As suas avaliações no site"),
            ("Ready in 10 days", "Pronto em 10 dias")]),
])

REDES = "".join([
    pacote("cb.r.ess", ("Package 1 · the minimum", "Pacote 1 · o mínimo"), ("Social media · Essential", "Redes sociais · Essencial"), ("€240", "240 €"), ("/month + VAT", "/mês + IVA"),
           ("Minimum 3 months", "Mínimo de 3 meses"),
           [("1 alignment meeting a month to plan events, music nights and promotions", "1 reunião de alinhamento por mês para planear eventos, noites de música e promoções"),
            ("1 content session at the bar a month (photos and short videos)", "1 sessão de captação no bar por mês (fotos e vídeos curtos)"),
            ("8 posts a month (2 a week) on 1 network", "8 publicações por mês (2 por semana) em 1 rede"),
            ("2 short videos (reels) a month", "2 vídeos curtos (reels) por mês"),
            ("8 stories a month", "8 stories por mês"),
            ("Planning, scheduling and a monthly summary", "Planeamento, agendamento e resumo mensal")],
           ("Ad spend, replies to messages and comments are not included.", "Não inclui investimento em anúncios nem resposta a mensagens e comentários."), destaque=True),
    pacote("cb.r.cre", ("Package 2", "Pacote 2"), ("Social media · Growth", "Redes sociais · Crescimento"), ("€390", "390 €"), ("/month + VAT", "/mês + IVA"),
           ("Minimum 3 months", "Mínimo de 3 meses"),
           [("2 networks (e.g. Instagram + Facebook)", "2 redes (ex.: Instagram + Facebook)"),
            ("12 posts, 4 short videos and 12 stories a month", "12 publicações, 4 vídeos curtos e 12 stories por mês"),
            ("Replies to comments on working days", "Resposta a comentários em dias úteis"),
            ("Monthly report", "Relatório mensal")]),
    pacote("cb.r.mais", ("Package 3", "Pacote 3"), ("Social media · Presence+", "Redes sociais · Presença+"), ("€590", "590 €"), ("/month + VAT", "/mês + IVA"),
           ("Minimum 3 months", "Mínimo de 3 meses"),
           [("2 networks", "2 redes"),
            ("16 posts, 6 short videos and 20 stories a month", "16 publicações, 6 vídeos curtos e 20 stories por mês"),
            ("1 h of filming at the bar every month", "1 h de captação no bar todos os meses"),
            ("Planning and monthly report", "Planeamento e relatório mensal")]),
])


# ---------- Questionário ----------
def escolhas(k, pergunta_en, pergunta_pt, nome, opcoes, tipo="checkbox", ajuda=None, obrigatorio=False):
    """Pílulas: o value é o texto em inglês (é o que chega à equipa)."""
    pilulas = "".join(
        f'<label class="opcao"><input type="{tipo}" name="{nome}" value="{html.escape(en)}"{" required" if obrigatorio and tipo == "radio" and i == 0 else ""}>{t(f"{k}.o{i}", en, pt)}</label>'
        for i, (en, pt) in enumerate(opcoes))
    return (f'<fieldset class="campo campo--largo" data-pergunta="{html.escape(pergunta_en)}">'
            f'<legend class="campo__rotulo">{t(f"{k}.q", pergunta_en, pergunta_pt)}</legend>'
            + (t(f"{k}.a", *ajuda, "p", ' class="campo__ajuda"') if ajuda else "")
            + f'<div class="opcoes">{pilulas}</div><p class="erro-campo" data-erro="{nome}"></p></fieldset>')


def bloco(k, titulo_en, titulo_pt, conteudo, id_=""):
    return (f'<div class="cb-bloco"{f" id={chr(34)}{id_}{chr(34)}" if id_ else ""}>'
            + t(f"{k}.t", titulo_en, titulo_pt, "h3", ' class="cb-bloco__titulo"')
            + f'<div class="campos">{conteudo}</div></div>')


def campo(k, en, pt, nome, tipo="text", obrigatorio=False, largo=False, auto="", extra="", ajuda=None, valor=""):
    rotulo = t(f"{k}.l", en, pt) + ("" if obrigatorio else f' <span class="opcional">{t("cb.opcional", "optional", "opcional")}</span>')
    if tipo == "area":
        entrada = f'<textarea class="entrada" id="cb-{nome}" name="{nome}" maxlength="900"{extra}></textarea>'
    else:
        entrada = (f'<input class="entrada" id="cb-{nome}" name="{nome}" type="{tipo}"'
                   + (f' autocomplete="{auto}"' if auto else "") + (" required" if obrigatorio else "")
                   + (f' value="{html.escape(valor)}"' if valor else "") + extra + ">")
    return (f'<div class="campo{" campo--largo" if largo else ""}"><label class="campo__rotulo" for="cb-{nome}">{rotulo}</label>'
            + (t(f"{k}.a", *ajuda, "p", ' class="campo__ajuda"') if ajuda else "")
            + f'{entrada}<p class="erro-campo" data-erro="{nome}"></p></div>')


FORM = "".join([
    bloco("cb.f1", "1. What would you like to start with?", "1. Por onde gostaria de começar?",
          escolhas("cb.f1.serv", "Which services interest you right now?", "Que serviços lhe interessam agora?", "servicos", [
              ("A new website", "Um site novo"),
              ("Social media management", "Gestão de redes sociais"),
              ("Google Business profile update", "Atualizar o perfil Google Business"),
              ("Posters for events (live music, karaoke, football)", "Cartazes para eventos (música ao vivo, karaoke, futebol)"),
              ("A photo and video session at the bar", "Uma sessão de fotos e vídeo no bar"),
              ("Not sure yet, I’d like advice", "Ainda não sei, gostava de uma sugestão")],
              ajuda=("Tick as many as you like.", "Pode escolher várias."))
          + escolhas("cb.f1.obj", "What matters most for the bar?", "O que é mais importante para o bar?", "objetivos", [
              ("More tourists finding us", "Mais turistas a encontrar-nos"),
              ("More locals and regulars", "Mais clientes locais e habituais"),
              ("Filling event nights", "Encher as noites de eventos"),
              ("Busier months outside summer", "Mais movimento fora do verão"),
              ("Looking more professional online", "Uma imagem mais profissional online"),
              ("Not having to think about it", "Não ter de pensar nisso")])),
    bloco("cb.f2", "2. Your website", "2. O seu site",
          escolhas("cb.f2.pac", "Which option feels closest to what you need?", "Que opção está mais perto do que precisa?", "site_pacote", [
              ("Essential, paid once (€349)", "Essencial, pago de uma vez (349 €)"),
              ("Essential, monthly plan (€59/month + €99)", "Essencial, plano mensal (59 €/mês + 99 €)"),
              ("Professional (€690)", "Profissional (690 €)"),
              ("I don’t need a website now", "Agora não preciso de site"),
              ("Not sure yet", "Ainda não sei")], tipo="radio")
          + escolhas("cb.f2.sec", "What should the website show?", "O que deve ter o site?", "site_conteudo", [
              ("Drinks and food menu", "Menu de bebidas e comida"),
              ("Events calendar", "Calendário de eventos"),
              ("Photo gallery", "Galeria de fotos"),
              ("Opening hours and map", "Horário e mapa"),
              ("Reviews", "Avaliações"),
              ("Table bookings or groups", "Reservas de mesa ou grupos"),
              ("WhatsApp button", "Botão de WhatsApp")])
          + escolhas("cb.f2.lin", "In which languages?", "Em que línguas?", "site_linguas", [
              ("English", "Inglês"), ("Dutch", "Neerlandês"), ("Portuguese", "Português"), ("German", "Alemão")])),
    bloco("cb.f3", "3. Your social media", "3. As suas redes sociais",
          escolhas("cb.f3.pac", "Which social media package feels right?", "Que pacote de redes sociais faz sentido?", "redes_pacote", [
              ("Package 1 · Essential (€240/month)", "Pacote 1 · Essencial (240 €/mês)"),
              ("Package 2 · Growth (€390/month)", "Pacote 2 · Crescimento (390 €/mês)"),
              ("Package 3 · Presence+ (€590/month)", "Pacote 3 · Presença+ (590 €/mês)"),
              ("Something smaller to begin with", "Algo mais pequeno para começar"),
              ("Not now, maybe later", "Agora não, talvez mais tarde")], tipo="radio")
          + escolhas("cb.f3.red", "Which networks?", "Que redes?", "redes", [
              ("Instagram", "Instagram"), ("Facebook", "Facebook"), ("TikTok", "TikTok"), ("Google Business", "Google Business")])
          + escolhas("cb.f3.freq", "How often would you like to post?", "Com que frequência gostaria de publicar?", "frequencia", [
              ("Once a week", "Uma vez por semana"), ("Twice a week", "Duas vezes por semana"), ("3 or more a week", "3 ou mais por semana"), ("Only for events", "Só para eventos")], tipo="radio")
          + escolhas("cb.f3.mat", "Can you send us photos and videos from the bar?", "Consegue enviar-nos fotos e vídeos do bar?", "material", [
              ("Yes, regularly", "Sim, com regularidade"), ("Sometimes", "Às vezes"), ("No, I’d rather you film", "Não, prefiro que sejam vocês a filmar")], tipo="radio")),
    bloco("cb.f4", "4. Your investment", "4. O seu investimento",
          campo("cb.f4.valor", "What monthly amount would you really be comfortable investing? (€)", "Que valor mensal estaria realmente confortável em investir? (€)", "valor_mensal", "number", obrigatorio=True, largo=True,
                extra=' inputmode="numeric" min="0" max="100000" step="1"',
                ajuda=("Please be honest. There’s no wrong answer: we’ll shape the proposal around this figure.", "Seja sincero, não há respostas erradas: vamos montar a proposta à volta deste valor."))
          + escolhas("cb.f4.pag", "For the website, would you prefer to…", "Para o site, prefere…", "pagamento", [
              ("Pay once", "Pagar de uma vez"), ("Spread it monthly", "Dividir por meses"), ("Not sure", "Ainda não sei")], tipo="radio")
          + escolhas("cb.f4.quando", "When would you like to start?", "Quando gostaria de começar?", "inicio", [
              ("Now", "Já"), ("In January", "Em janeiro"), ("Before the spring season", "Antes da época da primavera"), ("Not sure yet", "Ainda não sei")], tipo="radio")),
    bloco("cb.f5", "5. Your details", "5. Os seus dados",
          campo("cb.f5.nome", "Your name", "O seu nome", "nome", obrigatorio=True, auto="name", valor="Bob van Goethem")
          + campo("cb.f5.email", "Email", "E-mail", "email", "email", obrigatorio=True, auto="email")
          + campo("cb.f5.tel", "Phone / WhatsApp", "Telefone / WhatsApp", "telefone", "tel", auto="tel")
          + campo("cb.f5.msg", "Anything else you’d like us to know?", "Mais alguma coisa que queira dizer-nos?", "notas", "area", largo=True)
          + '<div class="campo campo--largo"><label class="consentimento"><input type="checkbox" name="consentimento" required> '
          + t("cb.consent", "I agree that Implement may use these details to prepare my proposal and contact me.", "Aceito que a Implement use estes dados para preparar a minha proposta e entrar em contacto.")
          + ' <a href="/privacy.html" target="_blank" rel="noopener">' + t("cb.politica", "Privacy policy", "Política de privacidade") + '</a></label>'
          + '<p class="erro-campo" data-erro="consentimento"></p></div>'),
])

main = f'''<main id="conteudo">
<section class="heroi heroi-servicos heroi-servicos--precos ps-heroi">
  <div class="contentor">
    {t("cb.legenda", "For Bob · Carvoeiro Bar", "Para o Bob · Carvoeiro Bar", "p", ' class="legenda"')}
    {t("cb.titulo", 'Let’s find the right plan <span class="destaque">for your bar.</span>', 'Vamos encontrar o plano certo <span class="destaque">para o seu bar.</span>', "h1", html_=True)}
    {t("cb.intro", "Thank you for meeting us. Here is a clear overview of what we offer and what each option includes. Tick what makes sense for you and tell us the monthly amount that feels right: we’ll shape a proposal around it. No commitment.", "Obrigada pela reunião. Aqui está um resumo claro do que oferecemos e do que inclui cada opção. Escolha o que faz sentido para si e diga-nos o valor mensal que lhe parece certo: preparamos uma proposta à medida. Sem compromisso.", "p", ' class="heroi-servicos__intro"')}
    <div class="heroi__acoes">
      <a class="botao" href="#questionario">{t("cb.ir", "Answer the questions (3 min)", "Responder às perguntas (3 min)")}{SETA}</a>
      <a class="botao botao--secundario" href="#site">{t("cb.ver", "See the packages", "Ver os pacotes")}</a>
    </div>
  </div>
</section>

<section class="seccao ps-problema" aria-labelledby="t-ideia">
  <div class="contentor">
    <header class="cabeca-seccao">
      {t("cb.ideia.leg", "Our suggestion", "A nossa sugestão", "p", ' class="legenda"')}
      {t("cb.ideia.t", "Start with a website, then keep it alive with social media.", "Começar pelo site e depois mantê-lo vivo com as redes sociais.", "h2", ' id="t-ideia"')}
    </header>
    <ul class="ps-cartoes">
      <li class="ps-cartao">{t("cb.ideia.1.t", "1 · A website people can find", "1 · Um site que se encontra", "h3")}{t("cb.ideia.1.p", "Visitors in Carvoeiro search on their phones. A simple website with your drinks, events, hours and location turns those searches into guests.", "Quem visita Carvoeiro pesquisa no telemóvel. Um site simples com bebidas, eventos, horário e localização transforma essas pesquisas em clientes.", "p")}</li>
      <li class="ps-cartao">{t("cb.ideia.2.t", "2 · Social media that shows the vibe", "2 · Redes que mostram o ambiente", "h3")}{t("cb.ideia.2.p", "Live music, karaoke, football and the people: that’s what makes guests come back. We plan it with you once a month and capture it at the bar.", "Música ao vivo, karaoke, futebol e as pessoas: é isso que faz os clientes voltarem. Planeamos consigo uma vez por mês e captamos no bar.", "p")}</li>
      <li class="ps-cartao">{t("cb.ideia.3.t", "3 · A budget that works for you", "3 · Um orçamento que funcione para si", "h3")}{t("cb.ideia.3.p", "You can start with one service and add the other later. Tell us what you’re comfortable with and we’ll adapt.", "Pode começar por um serviço e juntar o outro mais tarde. Diga-nos com o que se sente confortável e nós adaptamos.", "p")}</li>
    </ul>
  </div>
</section>

<section class="seccao catalogo--nevoa ps-como" id="site" aria-labelledby="t-site">
  <div class="contentor">
    <header class="cabeca-seccao">
      {t("cb.site.leg", "Website", "Site", "p", ' class="legenda"')}
      {t("cb.site.t", "Your website: what’s included.", "O seu site: o que inclui.", "h2", ' id="t-site"')}
    </header>
    <ul class="ps-pacotes ps-pacotes--duas">{SITES}</ul>
    {t("cb.site.nota", "You see a preview of your website before paying anything. Prices in euros, VAT not included.", "Vê uma prévia do site antes de pagar. Valores em euros, sem IVA.", "p", ' class="ps-nota-iva"')}
  </div>
</section>

<section class="seccao ps-como" id="redes" aria-labelledby="t-redes">
  <div class="contentor">
    <header class="cabeca-seccao">
      {t("cb.redes.leg", "Social media management", "Gestão de redes sociais", "p", ' class="legenda"')}
      {t("cb.redes.t", "Your social media: what’s included.", "As suas redes sociais: o que inclui.", "h2", ' id="t-redes"')}
    </header>
    <ul class="ps-pacotes">{REDES}</ul>
    {t("cb.redes.nota", "Monthly plans, minimum 3 months. Prices in euros, VAT not included. Results depend on many factors and are not guaranteed.", "Planos mensais, mínimo de 3 meses. Valores em euros, sem IVA. Os resultados dependem de muitos fatores e não são garantidos.", "p", ' class="ps-nota-iva"')}
  </div>
</section>

<section class="seccao catalogo--nevoa" id="questionario" aria-labelledby="t-q">
  <div class="contentor cb-contentor">
    <header class="cabeca-seccao">
      {t("cb.q.leg", "A few questions", "Algumas perguntas", "p", ' class="legenda"')}
      {t("cb.q.t", "Help us prepare the right proposal.", "Ajude-nos a preparar a proposta certa.", "h2", ' id="t-q"')}
    </header>
    <div class="cartao-form" id="cb-cartao">
      <form id="cb-form" novalidate>
        <div class="form-corpo">
          {FORM}
          <p class="aviso-erro" id="cb-aviso" aria-live="polite"></p>
        </div>
        <div class="mel-pote" aria-hidden="true"><label>Company website <input type="text" name="site_empresa" tabindex="-1" autocomplete="off"></label></div>
        <div class="form-pe">
          {t("cb.destino", "Goes straight to the Implement team", "Vai diretamente para a equipa da Implement", "span", ' class="form-pe__guardado"')}
          <div class="form-pe__botoes">
            <button type="submit" class="botao" id="cb-enviar">{t("cb.enviar", "Send my answers", "Enviar as respostas")}{SETA}</button>
          </div>
        </div>
      </form>
      <div class="sucesso" id="cb-sucesso" hidden tabindex="-1">
        <svg class="abelha-grande" aria-hidden="true"><use href="assets/img/sprite.svg#abelha"/></svg>
        {t("cb.ok.t", "Thank you, Bob!", "Obrigada, Bob!", "h2")}
        {t("cb.ok.p", "We’ve received your answers. We’ll prepare a proposal that fits your budget and get back to you within two working days.", "Recebemos as suas respostas. Vamos preparar uma proposta à medida do seu orçamento e respondemos em até dois dias úteis.", "p")}
      </div>
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
meta = '''<title>Carvoeiro Bar · Your plan — Implement</title>
<meta name="titulo-pt" content="Carvoeiro Bar · O seu plano — Implement">
<meta name="robots" content="noindex, nofollow">
<meta name="description" content="Website and social media packages for Carvoeiro Bar, and a short questionnaire to shape the proposal.">'''
cabeca = cabeca.replace('<meta charset="utf-8">\n', '<meta charset="utf-8">\n<!-- Gerado por scripts/carvoeiro_bar.py: altere o conteúdo lá e volte a gerar. -->\n', 1)
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
