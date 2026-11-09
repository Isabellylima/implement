#!/usr/bin/env python3
"""Gera a página Serviços (sem preços) e o Preçário (página não ligada, com preços).

Fonte única: a lista CATALOGO abaixo. Para mudar um serviço, uma descrição ou um preço, altere aqui e corra:
    python3 scripts/servicos.py
Isto reescreve:
    public/services.html               página Serviços (ligada no menu, indexada, SEM preços)
    public/precario.html               Preçário (não ligada, noindex, COM preços)
    public/assets/js/i18n-servicos.js  textos em português dos serviços (sem preços)
    public/assets/js/i18n-precos.js    textos em português do preçário (só carregado em precario.html)
Os preços nunca entram em services.html nem em i18n-servicos.js.
"""
from html import escape
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PUBLICO = RAIZ / "public"


# ---------- Preços: formato PT «250 €», EN «€250» ----------
def preco(valor, desde=False, por=None):
    sufixo_pt = {"foto": " / foto", "mes": " / mês"}.get(por, "")
    sufixo_en = {"foto": " / photo", "mes": " / month"}.get(por, "")
    return {
        "pt": f"{'desde ' if desde else ''}{valor} €{sufixo_pt}",
        "en": f"{'from ' if desde else ''}€{valor}{sufixo_en}",
        "valor": valor, "desde": desde, "por": por,
    }


SOB_ORCAMENTO = {"pt": "Sob orçamento", "en": "Quoted per project", "valor": None}
SOB_CONSULTA = {"pt": "Sob consulta", "en": "On request", "valor": None}


def t(en, pt):
    return {"en": en, "pt": pt}


# Cada item: id, nome, desc, nota (aparece nas duas páginas), nota_preco (só no preçário), preco
CATALOGO = [
    {
        "id": "marca", "icone": "s-marca",
        "legenda": t("Visual identity", "Identidade visual"),
        "titulo": t("Brand & design", "Marca e design"),
        "intro": t("Logos, visual identities and the everyday pieces that keep your brand consistent. Final files are delivered in digital formats ready to use.",
                   "Logótipos, identidades visuais e as peças do dia a dia que mantêm a marca coerente. Os ficheiros finais são entregues em formatos digitais prontos a usar."),
        "grupos": [
            {"itens": [
                {"id": "logo", "nome": t("Essential logo", "Logótipo essencial"),
                 "desc": t("2 initial proposals, 2 rounds of adjustments and PNG, SVG and PDF files.", "2 propostas iniciais, 2 rondas de ajustes e ficheiros PNG, SVG e PDF."),
                 "nota": t("Estimated time: 5 to 7 working days", "Prazo estimado: 5 a 7 dias úteis"), "preco": preco(250)},
                {"id": "id-base", "nome": t("Core visual identity", "Identidade visual base"),
                 "desc": t("Logo and versions, colour palette, typography, profile icon and 2 digital applications.", "Logótipo e versões, paleta de cores, tipografia, ícone de perfil e 2 aplicações digitais."),
                 "nota": t("Estimated time: 8 to 12 working days", "Prazo estimado: 8 a 12 dias úteis"), "preco": preco(450)},
                {"id": "id-completa", "nome": t("Complete visual identity", "Identidade visual completa"),
                 "desc": t("Everything in the core identity, plus a mini brand manual and 3 applications of your choice.", "Tudo da identidade base, mini manual da marca e 3 aplicações à escolha."),
                 "nota": t("Timing and final price depend on the scope", "Prazo e valor final dependem do âmbito"), "preco": preco(790, desde=True)},
            ]},
            {"titulo": t("Graphic pieces", "Peças gráficas"), "duas": True, "itens": [
                {"id": "flyer-1", "nome": t("Flyer or poster · 1 side", "Flyer ou cartaz · 1 face"),
                 "desc": t("1 proposal, digital file and print-ready PDF.", "1 proposta e ficheiro digital + PDF para impressão."),
                 "nota": t("2 rounds of adjustments", "2 rondas de ajustes"), "preco": preco(90)},
                {"id": "flyer-2", "nome": t("Flyer · double-sided", "Flyer · frente e verso"),
                 "desc": t("Design of both sides, digital version and print-ready PDF.", "Design das duas faces, versão digital e PDF para impressão."),
                 "nota": t("2 rounds of adjustments", "2 rondas de ajustes"), "preco": preco(135)},
                {"id": "cartao", "nome": t("Business card", "Cartão de visita"),
                 "desc": t("Front and back design; print-ready file.", "Design frente e verso; ficheiro pronto para impressão."),
                 "nota": t("Printing not included", "Impressão não incluída"), "preco": preco(50)},
                {"id": "brochura", "nome": t("Brochure up to 4 pages", "Brochura até 4 páginas"),
                 "desc": t("Layout and final PDF; texts and images supplied by you.", "Paginação e PDF final; textos e imagens fornecidos pelo cliente."),
                 "nota": t("More pages quoted separately", "Mais páginas sob orçamento"), "preco": preco(220)},
            ]},
        ],
        "caixa": {
            "servicos": (t("Good to know", "Bom saber"),
                         t("Printing, stock images and copywriting are quoted separately.", "Impressão, compra de imagens e redação de textos são orçamentadas à parte.")),
            "precos": (t("What can change the price", "O que pode alterar o valor"),
                       t("More concepts, revisions, languages, illustration, formats or applications. Printing, stock images and copywriting are charged separately.",
                         "Mais conceitos, revisões, idiomas, ilustração, formatos ou aplicações. Impressão, compra de imagens e redação de textos são cobradas à parte.")),
        },
    },
    {
        "id": "fotografia", "icone": "s-conteudo",
        "legenda": t("Visual content", "Conteúdo visual"),
        "titulo": t("Menus & photography", "Menus e fotografia"),
        "intro": t("For restaurants, cafés, holiday rentals, shops and local brands in the Algarve.",
                   "Para restaurantes, cafés, alojamentos, lojas e marcas locais do Algarve."),
        "grupos": [
            {"itens": [
                {"id": "menu-2", "nome": t("Menu up to 2 pages", "Menu até 2 páginas"),
                 "desc": t("Layout and digital PDF for printing or for use with a QR code.", "Layout e PDF digital para impressão ou utilização por QR code."),
                 "nota": t("Printing and food photography not included", "Impressão e fotografia dos pratos não incluídas"), "preco": preco(130)},
                {"id": "menu-6", "nome": t("Menu · 3 to 6 pages", "Menu · 3 a 6 páginas"),
                 "desc": t("Design and layout; digital version and print-ready PDF.", "Design e paginação; versão digital e PDF para impressão."),
                 "nota": t("Additional languages quoted separately", "Idiomas adicionais sob orçamento"), "preco": preco(250)},
                {"id": "menu-atualizar", "nome": t("Menu update", "Atualização de menu"),
                 "desc": t("Up to 15 changes to prices or items in an existing layout.", "Até 15 alterações de preços ou itens num layout existente."),
                 "nota": t("New graphic elements are quoted separately", "Novos elementos gráficos são orçamentados"), "preco": preco(35)},
            ]},
            {"titulo": t("Photography", "Fotografia"), "duas": True, "itens": [
                {"id": "foto-neutro", "nome": t("Product · neutral background", "Produto · fundo neutro"),
                 "desc": t("Basic editing; minimum of 10 photos.", "Edição básica; mínimo de 10 fotografias."),
                 "nota": t("You send or drop off the products", "Cliente envia ou entrega os produtos"), "preco": preco(10, por="foto"), "min": 10},
                {"id": "foto-estilo", "nome": t("Product · simple styling", "Produto · estilo simples"),
                 "desc": t("Simple composition with your props; minimum of 8.", "Composição simples com adereços do cliente; mínimo 8."),
                 "nota": t("Special props not included", "Adereços especiais não incluídos"), "preco": preco(18, por="foto"), "min": 8},
                {"id": "foto-espaco", "nome": t("Venue or business · 2 h", "Espaço ou negócio · 2 h"),
                 "desc": t("On-site session and up to 15 edited photos.", "Sessão no local e até 15 fotografias editadas."),
                 "nota": t("Travel may be charged", "Deslocação pode acrescer"), "preco": preco(190)},
                {"id": "foto-evento", "nome": t("Event · up to 2 h", "Evento · até 2 h"),
                 "desc": t("Coverage and up to 25 edited photos.", "Cobertura e até 25 fotografias editadas."),
                 "nota": t("Extra hours available", "Horas extra disponíveis"),
                 "nota_preco": t("Extra hour: €45", "Hora extra: 45 €"), "preco": preco(130)},
            ]},
        ],
        "caixa": {
            "servicos": (t("Photo sessions", "Sessões fotográficas"),
                         t("Each session is planned around the type of product, number of images, preparation, location and travel. Models, props, venue hire and advanced retouching are quoted separately.",
                           "Cada sessão é planeada conforme o tipo de produto, o número de imagens, a preparação, o local e a deslocação. Modelos, adereços, aluguer de espaço e retoque avançado são orçamentados à parte.")),
            "precos": (t("Photo sessions", "Sessões fotográficas"),
                       t("These are launch prices and depend on the type of product, number of images, preparation, location and travel. Models, props, venue hire and advanced retouching are quoted separately.",
                         "Os valores são de lançamento e dependem do tipo de produto, número de imagens, preparação, local e deslocação. Produção de modelos, adereços, aluguer de espaço e retoque avançado são orçamentados à parte.")),
        },
    },
    {
        "id": "video", "icone": "s-redes",
        "legenda": t("Digital production", "Produção digital"),
        "titulo": t("Video", "Vídeo"),
        "intro": t("Vertical content for Instagram, TikTok and other platforms.", "Conteúdo vertical para Instagram, TikTok e outras plataformas."),
        "grupos": [
            {"itens": [
                {"id": "video-30", "nome": t("Short video edit · up to 30 s", "Edição de vídeo curto · até 30 s"),
                 "desc": t("Editing of footage you supply, captions and licensed library music.", "Edição de imagens fornecidas pelo cliente, legendas e música de biblioteca licenciada."),
                 "nota": t("1 round of adjustments", "1 ronda de ajustes"), "preco": preco(50)},
                {"id": "video-60", "nome": t("Promotional video · up to 60 s", "Vídeo promocional · até 60 s"),
                 "desc": t("Editing, captions and export in vertical format.", "Edição, legendas e exportação em formato vertical."),
                 "nota": t("Up to 2 rounds of adjustments", "Até 2 rondas de ajustes"), "preco": preco(125)},
                {"id": "captacao", "nome": t("Filming + video editing", "Captação + edição de vídeo"),
                 "desc": t("Session of up to 2 h in the Algarve and 1 final video of up to 30 s.", "Sessão até 2 h no Algarve e 1 vídeo final até 30 s."),
                 "nota": t("Travel and extra deliverables on request", "Deslocação e entregáveis extra sob consulta"), "preco": preco(290, desde=True)},
            ]},
        ],
    },
    {
        "id": "redes", "icone": "s-redes",
        "legenda": t("Monthly management", "Gestão mensal"),
        "titulo": t("Social media", "Redes sociais"),
        "intro": t("Monthly plans with a minimum 3-month commitment. Posts are counted per month and spread across the networks in the plan.",
                   "Planos mensais com compromisso mínimo de 3 meses. Publicações totais por mês, distribuídas pelas redes do plano."),
        "grupos": [
            {"itens": [
                {"id": "essencial", "nome": t("Essential", "Essencial"),
                 "desc": t("1 social network · 8 posts · 2 short videos edited from your footage · 8 stories. Planning, scheduling and a monthly summary.",
                           "1 rede social · 8 publicações · 2 vídeos curtos editados de material do cliente · 8 stories. Planeamento, agendamento e resumo mensal."),
                 "nota": t("No comment replies; filming not included", "Sem resposta a comentários; conteúdos de captação não incluídos"), "preco": preco(240, por="mes")},
                {"id": "crescimento", "nome": t("Growth", "Crescimento"),
                 "desc": t("2 social networks · 12 posts · 4 short videos · 12 stories. Planning, scheduling, replies to comments on working days and a monthly report.",
                           "2 redes sociais · 12 publicações · 4 vídeos curtos · 12 stories. Planeamento, agendamento, resposta a comentários em dias úteis e relatório mensal."),
                 "nota": t("On-site filming not included", "Captação presencial não incluída"), "preco": preco(390, por="mes")},
                {"id": "presenca", "nome": t("Presence+", "Presença+"),
                 "desc": t("2 social networks · 16 posts · 6 short videos · 20 stories. Includes 1 h of on-site filming per month, planning and a report.",
                           "2 redes sociais · 16 publicações · 6 vídeos curtos · 20 stories. Inclui 1 h de captação mensal no local, planeamento e relatório."),
                 "nota": t("Travel outside the agreed area may be charged", "Deslocação fora da zona acordada pode acrescer"), "preco": preco(590, por="mes")},
            ]},
        ],
        "lista": (t("Plan notes", "Notas dos planos"), [
            t("Short videos use content you send us, unless filming is explicitly included.", "Os vídeos curtos usam conteúdos enviados pelo cliente, salvo captação expressamente incluída."),
            t("Does not include ad spend, replies to private messages, influencers or customer service.", "Não inclui investimento em anúncios, resposta a mensagens privadas, influenciadores ou atendimento ao cliente."),
            t("Planning starts once we receive the materials and the calendar is approved. Results are not guaranteed.", "O planeamento começa após recebermos os materiais e a aprovação do calendário. Os resultados não são garantidos."),
        ]),
        "caixa": {
            "precos": (t("Local reference", "Referência local"),
                       t("A provider in the Algarve publishes monthly management from €395 + VAT and a €545 + VAT plan with 2 h of filming. Our launch prices sit below these public references; the scope is not directly equivalent.",
                         "Um prestador no Algarve publica gestão mensal desde 395 € + IVA e um plano de 545 € + IVA com 2 h de captação. Os nossos valores de lançamento ficam abaixo dessas referências públicas; o âmbito não é diretamente equivalente.")),
        },
    },
    {
        "id": "digital", "icone": "s-web",
        "legenda": t("Online presence", "Presença online"),
        "titulo": t("Websites, apps & Google", "Websites, aplicações e Google"),
        "intro": t("Projects shaped around your business. We prepare the proposal after a conversation about goals, features and content.",
                   "Projetos à medida do seu negócio. Preparamos a proposta depois de uma conversa sobre objetivos, funcionalidades e conteúdos."),
        "grupos": [
            {"itens": [
                {"id": "estrategia", "nome": t("Digital strategy & analysis", "Estratégia e análise digital"),
                 "desc": t("A look at your current presence, audience and competitors, and a plan with priorities you can measure.",
                           "Análise da sua presença atual, do público e da concorrência, e um plano com prioridades que se podem medir."),
                 "preco": SOB_ORCAMENTO},
                {"id": "website", "nome": t("Websites & landing pages", "Websites e landing pages"),
                 "desc": t("Clear, fast, mobile-first websites that explain what you do and turn visits into enquiries.",
                           "Websites claros, rápidos e pensados para o telemóvel, que explicam o que faz e transformam visitas em contactos."),
                 "preco": SOB_ORCAMENTO},
                {"id": "google", "nome": t("Google Business profile", "Perfil Google Business"),
                 "desc": t("A complete, up-to-date Google profile so that people nearby find you and know how to reach you.",
                           "Um perfil Google completo e atualizado, para que quem está perto o encontre e saiba como chegar."),
                 "preco": SOB_ORCAMENTO},
                {"id": "apps", "nome": t("Custom apps", "Aplicações à medida"),
                 "desc": t("Digital applications built for your business. We quote after talking about goals, features, platforms, integrations, content and maintenance.",
                           "Aplicações digitais criadas para o seu negócio. O orçamento é preparado após uma conversa sobre objetivos, funcionalidades, plataformas, integrações, conteúdos e manutenção."),
                 "preco": SOB_CONSULTA},
            ]},
        ],
        "caixa": {
            "servicos": (t("What shapes the quote", "O que influencia o orçamento"),
                         t("Number of screens and features, login or payments, connections to other systems, app store publishing and future maintenance. Hosting, subscriptions, licences and third-party services are listed separately in the proposal.",
                           "Número de ecrãs e funcionalidades, login ou pagamentos, ligação a sistemas externos, publicação nas lojas e manutenção futura. Alojamento, subscrições, licenças e serviços de terceiros são indicados à parte na proposta.")),
        },
    },
    {
        "id": "pacotes", "icone": "s-estrategia",
        "legenda": t("Made-to-measure projects", "Projetos à medida"),
        "titulo": t("Packages", "Pacotes"),
        "intro": t("Starter combinations for a professional presence from day one.", "Combinações de lançamento para começar com uma presença profissional."),
        "grupos": [
            {"itens": [
                {"id": "pack-local", "nome": t("Local business", "Negócio local"),
                 "desc": t("Essential logo + single-sided flyer.", "Logótipo essencial + flyer de 1 face."),
                 "nota_preco": t("Separately: €340", "Preço individual: 340 €"), "preco": preco(325, desde=True), "componentes": [("logo", 1), ("flyer-1", 1)]},
                {"id": "pack-restaurante", "nome": t("Restaurant or café", "Restaurante ou café"),
                 "desc": t("Menu up to 2 pages + 8 styled photos + 2 short video edits.", "Menu até 2 páginas + 8 fotografias estilizadas + 2 edições de vídeo curto."),
                 "nota_preco": t("Separately: €374", "Preço individual: 374 €"), "preco": preco(335, desde=True), "componentes": [("menu-2", 1), ("foto-estilo", 8), ("video-30", 2)]},
                {"id": "pack-loja", "nome": t("Shop or retail", "Loja ou comércio"),
                 "desc": t("Core visual identity + double-sided flyer + 10 neutral product photos.", "Identidade base + flyer frente e verso + 10 fotos de produto neutras."),
                 "nota_preco": t("Separately: €685", "Preço individual: 685 €"), "preco": preco(590, desde=True), "componentes": [("id-base", 1), ("flyer-2", 1), ("foto-neutro", 10)]},
            ]},
        ],
    },
]

ADICIONAIS = [
    (t("Extra round of adjustments", "Ronda extra de ajustes"), preco(25)),
    (t("Additional hour of design", "Hora adicional de design"), preco(25)),
    (t("Adaptation to an extra format", "Adaptação a formato extra"), preco(20)),
    (t("Initial social media setup", "Configuração inicial de redes"), preco(70)),
    (t("Rush (subject to availability)", "Urgência (sujeito a disponibilidade)"), t("+25%", "+25%")),
]

CONDICOES = t(
    "50% deposit to start; the balance before final delivery. Each proposal confirms timing, revisions and deliverables. Printing, ads, licences and travel outside the agreed area are not included. Prices in euros; VAT added where applicable. Launch prices subject to review.",
    "50% de sinal para iniciar; saldo antes da entrega final. Cada proposta confirma prazo, revisões e entregáveis. Impressão, anúncios, licenças e deslocações fora da zona acordada não estão incluídos. Valores em euros; IVA acresce quando aplicável. Preços de lançamento sujeitos a revisão.",
)
COMO = t(
    "These are launch prices set by Implement, not official averages. We compared public local offers and adjusted the scope for a team starting out. Prices vary with deliverables, experience, travel and complexity.",
    "São preços de lançamento definidos pela Implement, não médias oficiais. Comparámos ofertas públicas locais e ajustámos o âmbito para uma equipa em início de atividade. Os preços variam conforme entregáveis, experiência, deslocação e complexidade.",
)

REFERENCIAS = (t("Public references checked on 1 Nov 2026", "Referências públicas consultadas em 1 nov. 2026"), [
    t("VORX Digital · social media management in the Algarve · from €395/month", "VORX Digital · gestão de redes no Algarve · desde 395 €/mês"),
    t("DEMARCA · graphic design in Faro · logo from €300", "DEMARCA · design gráfico em Faro · logótipo desde 300 €"),
    t("Garrett Walsh · video content in the Algarve · half day €300", "Garrett Walsh · conteúdo de vídeo no Algarve · meio dia 300 €"),
    t("Catch Algarve · photo and video · package from €450", "Catch Algarve · fotografia e vídeo · pacote desde 450 €"),
])

# Textos de página: (chave, en, pt)
PAGINA_SERVICOS = {
    "sv.legenda": t("Services", "Serviços"),
    "sv.titulo": t('Creative and digital services for <span class="destaque">growing businesses.</span>',
                   'Serviços criativos e digitais para <span class="destaque">negócios em crescimento.</span>'),
    "sv.intro": t("Brand, content, social media and online presence, from one team. Every project gets a proposal with scope, timing and deliverables defined before we start.",
                  "Marca, conteúdo, redes sociais e presença online, numa só equipa. Cada projeto recebe uma proposta com âmbito, prazos e entregáveis definidos antes de começarmos."),
    "sv.saltar": t("Jump to a service", "Ir para um serviço"),
    "sv.proposta": t("Ask for a proposal", "Pedir proposta"),
    "sv.cta.titulo": t("Not sure what you need?", "Não sabe bem do que precisa?"),
    "sv.cta.p": t("Tell us about your business in a few minutes. We’ll suggest the right combination and send a proposal made for you.",
                  "Fale-nos do seu negócio em poucos minutos. Sugerimos a combinação certa e enviamos uma proposta feita para si."),
    "sv.cta.wa": t("Talk on WhatsApp", "Falar pelo WhatsApp"),
}
PAGINA_PRECOS = {
    "pr.legenda": t("Creative and digital services · Algarve · 2026", "Serviços criativos e digitais · Algarve · 2026"),
    "pr.titulo": t('Launch <span class="destaque">price list.</span>', 'Preçário de <span class="destaque">lançamento.</span>'),
    "pr.intro": t("Prices designed for small businesses that are starting out. Each project gets a final proposal with scope, timing and deliverables defined.",
                  "Preços pensados para pequenos negócios que estão a começar. Cada projeto recebe uma proposta final com âmbito, prazos e entregáveis definidos."),
    "pr.iva": t("Prices in euros, before VAT", "Valores em euros, sem IVA"),
    "pr.adicionais": t("Additional services", "Serviços adicionais"),
    "pr.condicoes": t("Terms", "Condições comerciais"),
    "pr.como": t("How we set these prices", "Como definimos estes valores"),
}


# ---------- Gerador de orçamentos (só no preçário; ferramenta interna, em português) ----------
CALCULADORA = (RAIZ / "scripts/calculadora.html").read_text(encoding="utf-8")


def dados_js():
    """Módulo com os preços em números, para a calculadora. Só é importado pelo preçário."""
    import json
    itens = []
    for cat in CATALOGO:
        for grupo in cat["grupos"]:
            for it in grupo["itens"]:
                pr = it["preco"]
                itens.append({
                    "id": it["id"], "cat": cat["id"], "categoria": cat["titulo"],
                    "nome": {"pt": it["nome"]["pt"], "en": it["nome"]["en"]},
                    "desc": {"pt": it["desc"]["pt"], "en": it["desc"]["en"]},
                    "valor": pr.get("valor"), "desde": bool(pr.get("desde")), "por": pr.get("por"),
                    "min": it.get("min", 1),
                    "rotuloPreco": {"pt": pr["pt"], "en": pr["en"]},
                    "componentes": [{"id": i, "qtd": q} for i, q in it.get("componentes", [])],
                })
    adicionais = []
    for j, (n, pr) in enumerate(ADICIONAIS):
        adicionais.append({"id": f"ad{j}", "nome": n, "valor": pr.get("valor"), "rotuloPreco": {"pt": pr["pt"], "en": pr["en"]}})
    dados = {"itens": itens, "adicionais": adicionais, "condicoes": CONDICOES,
             "notasRedes": [l for l in next(c for c in CATALOGO if c["id"] == "redes")["lista"][1]]}
    return ("/* Preços em números para o gerador de orçamentos do preçário.\n   Gerado por scripts/servicos.py: altere lá e volte a gerar. */\n"
            f"export const DADOS = {json.dumps(dados, ensure_ascii=False, indent=1)};\n")


def pagina_orcamento():
    """Gerador de orçamentos na área da equipa (/admin/orcamento, só com sessão). Usa o topo de public/admin/index.html."""
    base = (PUBLICO / "admin/index.html").read_text(encoding="utf-8")
    topo = base[:base.index('<main id="app"')]
    topo = topo.replace("<title>Área da equipa · Implement</title>", "<title>Orçamentos · Implement</title>")
    topo = re.sub(r'<script src="/assets/js/admin\.js(\?v=[0-9a-f]+)?" type="module"></script>', '<script src="/assets/js/admin-conta.js" type="module"></script>\n<script src="/assets/js/orcamento.js" type="module"></script>', topo)
    topo = topo.replace('<body class="admin">', '<body class="admin admin--orcamento">')
    topo = topo.replace('data-rota="orcamento"', 'data-rota="orcamento" aria-current="page"')
    assert "orcamento.js" in topo and 'aria-current="page"' in topo
    return topo + '<main id="conteudo" class="admin-orcamento">\n' + CALCULADORA + "</main>\n</body>\n</html>\n"


# ---------- Montagem ----------
def campos_pt(prefixo, d, saida):
    saida[prefixo] = d["pt"]
    return d["en"]


def gerar(modo):
    """modo = 'servicos' (sem preços) ou 'precos'."""
    com_precos = modo == "precos"
    pt = {}
    pt_precos = {}

    def txt(chave, d, tag="span", attrs="", html=False, destino=None):
        (destino if destino is not None else pt)[chave] = d["pt"]
        a = f' data-i18n-html="{chave}"' if html else f' data-i18n="{chave}"'
        conteudo = d["en"] if html else escape(d["en"])
        return f"<{tag}{attrs}{a}>{conteudo}</{tag}>"

    partes = []
    for i, cat in enumerate(CATALOGO):
        c = cat["id"]
        if not com_precos and c == "pacotes":
            pass
        corpo = []
        for g, grupo in enumerate(cat["grupos"]):
            if grupo.get("titulo"):
                corpo.append(txt(f"sv.{c}.g{g}", grupo["titulo"], "h3", ' class="catalogo__sub"'))
            itens = []
            for it in grupo["itens"]:
                k = f"sv.{c}.{it['id']}"
                topo = txt(f"{k}.n", it["nome"], "h4", ' class="oferta__nome"')
                if com_precos:
                    topo += txt(f"pr.{c}.{it['id']}.p", it["preco"], "p", ' class="oferta__preco"', destino=pt_precos)
                linhas = [f'<div class="oferta__topo">{topo}</div>', txt(f"{k}.d", it["desc"], "p", ' class="oferta__desc"')]
                notas = []
                if it.get("nota"):
                    notas.append(txt(f"{k}.o", it["nota"], "span"))
                if com_precos and it.get("nota_preco"):
                    notas.append(txt(f"pr.{c}.{it['id']}.o", it["nota_preco"], "span", destino=pt_precos))
                if notas:
                    linhas.append(f'<p class="oferta__nota">{" · ".join(notas)}</p>')
                itens.append(f'<li class="oferta" id="{c}-{it["id"]}">' + "".join(linhas) + "</li>")
            classe = "ofertas ofertas--duas" if len(grupo["itens"]) in (2, 4) else "ofertas"
            corpo.append(f'<ul class="{classe}">' + "".join(itens) + "</ul>")
        if cat.get("lista"):
            titulo, linhas = cat["lista"]
            li = "".join(txt(f"sv.{c}.l{j}", l, "li") for j, l in enumerate(linhas))
            corpo.append(f'<div class="caixa-nota">{txt(f"sv.{c}.lt", titulo, "h3")}<ul>{li}</ul></div>')
        caixa = (cat.get("caixa") or {}).get("precos" if com_precos else "servicos") or (cat.get("caixa") or {}).get("servicos")
        if caixa:
            pref = "pr" if com_precos and "precos" in cat.get("caixa", {}) else "sv"
            dest = pt_precos if pref == "pr" else None
            corpo.append(f'<div class="caixa-nota">{txt(f"{pref}.{c}.ct", caixa[0], "h3", destino=dest)}{txt(f"{pref}.{c}.cp", caixa[1], "p", destino=dest)}</div>')
        corpo.append(f'<p class="catalogo__acao"><a class="ligacao-seta" href="start-a-project.html">{txt("sv.proposta", PAGINA_SERVICOS["sv.proposta"])}<svg class="seta" aria-hidden="true"><use href="assets/img/sprite.svg#seta"/></svg></a></p>')

        cabeca = (f'<header class="cabeca-seccao catalogo__cabeca">'
                  f'<span class="catalogo__icone"><svg aria-hidden="true"><use href="assets/img/sprite.svg#{cat["icone"]}"/></svg></span>'
                  f'{txt(f"sv.{c}.leg", cat["legenda"], "p", " class=\"legenda\"")}'
                  f'{txt(f"sv.{c}.t", cat["titulo"], "h2", f" id=\"t-{c}\"")}'
                  f'{txt(f"sv.{c}.i", cat["intro"], "p", " class=\"catalogo__intro\"")}'
                  f'</header>')
        fundo = "" if i % 2 else " catalogo--nevoa"
        partes.append(f'<section class="seccao catalogo{fundo}" id="{c}" aria-labelledby="t-{c}"><div class="contentor">{cabeca}<div class="catalogo__corpo">{"".join(corpo)}</div></div></section>')

    if com_precos:
        linhas = "".join(f'<tr><th scope="row">{txt(f"pr.ad{j}.n", n, "span", destino=pt_precos)}</th><td>{txt(f"pr.ad{j}.p", p, "span", destino=pt_precos)}</td></tr>'
                         for j, (n, p) in enumerate(ADICIONAIS))
        partes.append(f'''<section class="seccao catalogo catalogo--nevoa" id="condicoes" aria-labelledby="t-adicionais"><div class="contentor">
<header class="cabeca-seccao catalogo__cabeca">{txt("pr.adicionais", PAGINA_PRECOS["pr.adicionais"], "h2", ' id="t-adicionais"', destino=pt_precos)}</header>
<div class="catalogo__corpo"><table class="tabela-precos">{linhas}</table>
<div class="caixa-nota">{txt("pr.condicoes", PAGINA_PRECOS["pr.condicoes"], "h3", destino=pt_precos)}{txt("pr.condicoes.p", CONDICOES, "p", destino=pt_precos)}</div>
<div class="caixa-nota caixa-nota--simples">{txt("pr.como", PAGINA_PRECOS["pr.como"], "h3", destino=pt_precos)}{txt("pr.como.p", COMO, "p", destino=pt_precos)}</div>
<div class="caixa-nota caixa-nota--simples">{txt("pr.ref", REFERENCIAS[0], "h3", destino=pt_precos)}<ul class="lista-referencias">{"".join(txt(f"pr.ref{j}", r, "li", destino=pt_precos) for j, r in enumerate(REFERENCIAS[1]))}</ul></div>
</div></div></section>''')

    chips = "".join(f'<li><a href="#{cat["id"]}">{txt(f"sv.{cat["id"]}.t", cat["titulo"], "span")}</a></li>' for cat in CATALOGO)
    return "\n".join(partes), chips, pt, pt_precos


def pagina(modo, base):
    com_precos = modo == "precos"
    seccoes, chips, pt, pt_precos = gerar(modo)
    textos = PAGINA_PRECOS if com_precos else PAGINA_SERVICOS
    alvo = pt_precos if com_precos else pt

    def txt(chave, tag, attrs="", html=False):
        d = textos[chave]
        alvo[chave] = d["pt"]
        a = f' data-i18n-html="{chave}"' if html else f' data-i18n="{chave}"'
        return f"<{tag}{attrs}{a}>{d['en'] if html else escape(d['en'])}</{tag}>"

    if com_precos:
        heroi = f'''<section class="heroi heroi-servicos heroi-servicos--precos">
  <div class="contentor">
    {txt("pr.legenda", "p", ' class="legenda"')}
    {txt("pr.titulo", "h1", "", html=True)}
    {txt("pr.intro", "p", ' class="heroi-servicos__intro"')}
    <p class="selo-iva">{txt("pr.iva", "span")}</p>
    <nav class="chips" aria-label="Sections"><ul>{chips}</ul></nav>
  </div>
</section>'''
    else:
        heroi = f'''<section class="heroi heroi-servicos">
  <div class="contentor">
    {txt("sv.legenda", "p", ' class="legenda"')}
    {txt("sv.titulo", "h1", "", html=True)}
    {txt("sv.intro", "p", ' class="heroi-servicos__intro"')}
    <nav class="chips" aria-labelledby="t-saltar"><p class="sr-only" id="t-saltar" data-i18n="sv.saltar">Jump to a service</p><ul>{chips}</ul></nav>
  </div>
</section>'''
    pt["sv.saltar"] = PAGINA_SERVICOS["sv.saltar"]["pt"]

    chamada_titulo = PAGINA_SERVICOS["sv.cta.titulo"]
    pt.update({k: PAGINA_SERVICOS[k]["pt"] for k in ("sv.cta.titulo", "sv.cta.p", "sv.cta.wa", "sv.proposta")})
    chamada = f'''<section class="seccao chamada" aria-labelledby="t-chamada">
    <svg class="chamada__abelha chamada__abelha--1 abelha--branca" aria-hidden="true"><use href="assets/img/sprite.svg#abelha"/></svg>
    <svg class="chamada__abelha chamada__abelha--2 abelha--branca" aria-hidden="true"><use href="assets/img/sprite.svg#abelha"/></svg>
    <div class="contentor">
      <h2 id="t-chamada" data-i18n="sv.cta.titulo">{escape(chamada_titulo["en"])}</h2>
      <p data-i18n="sv.cta.p">{escape(PAGINA_SERVICOS["sv.cta.p"]["en"])}</p>
      <div class="chamada__acoes">
        <a class="botao botao--claro" href="start-a-project.html"><span data-i18n="c.comecar">Start a project</span><svg class="seta" aria-hidden="true"><use href="assets/img/sprite.svg#seta"/></svg></a>
        <a class="botao botao--secundario" href="https://wa.me/351962951161" rel="noopener" data-whatsapp><span data-i18n="sv.cta.wa">{escape(PAGINA_SERVICOS["sv.cta.wa"]["en"])}</span></a>
      </div>
    </div>
  </section>'''

    main = f'<main id="conteudo">\n{heroi}\n{seccoes}\n{chamada}\n</main>'

    # Cabeçalho e rodapé: os mesmos da página Contacto
    head_ini = base.index("<head>")
    head_fim = base.index("</head>")
    cabeca = base[head_ini:head_fim]
    if com_precos:
        meta = '''<title>Price list — Implement</title>
<meta name="titulo-pt" content="Preçário — Implement">
<meta name="robots" content="noindex, nofollow">
<meta name="description" content="Implement launch price list.">'''
        scripts = '<script src="assets/js/i18n-servicos.js" defer></script>\n<script src="assets/js/i18n-precos.js" defer></script>'
    else:
        meta = '''<title>Services — Implement</title>
<meta name="titulo-pt" content="Serviços — Implement">
<meta name="description" content="Brand and design, menus and photography, video, social media management, websites and Google Business for small businesses in Portugal and beyond.">
<link rel="canonical" href="https://heyimplement.com/services">'''
        scripts = '<script src="assets/js/i18n-servicos.js" defer></script>'
    import re
    cabeca = re.sub(r"<title>.*?</title>\n", "", cabeca)
    cabeca = re.sub(r'<meta name="titulo-pt"[^>]*>\n', "", cabeca)
    cabeca = re.sub(r'<meta name="description"[^>]*>\n', "", cabeca)
    cabeca = re.sub(r'<meta name="robots"[^>]*>\n', "", cabeca)
    cabeca = re.sub(r'<link rel="canonical"[^>]*>\n', "", cabeca)
    cabeca = re.sub(r'<script src="assets/js/contacto\.js[^"]*" type="module"></script>\n?', "", cabeca)
    assert "contacto.js" not in cabeca
    cabeca = cabeca.replace('<meta charset="utf-8">\n', '<meta charset="utf-8">\n' + "<!-- Gerado por scripts/servicos.py: altere o conteúdo lá e volte a gerar. -->\n", 1)
    cabeca = cabeca.replace('<meta name="viewport"', meta + '\n<meta name="viewport"', 1)
    cabeca = cabeca.replace('<script src="assets/js/i18n.js" defer></script>', '<script src="assets/js/i18n.js" defer></script>\n' + scripts)

    topo = base[base.index('<a class="saltar"'):base.index("<main")]
    topo = topo.replace(' aria-current="page"', "")
    if not com_precos:
        topo = topo.replace('<a href="services.html" data-i18n="c.nav.servicos">', '<a href="services.html" aria-current="page" data-i18n="c.nav.servicos">')
    rodape = base[base.index('<footer class="rodape">'):base.index("</body>")]
    doc = base[: head_ini] + cabeca + "</head>\n<body>\n" + topo + main + "\n\n" + rodape + "</body>\n</html>\n"
    return doc, pt, pt_precos


def js(nome, comentario, dic):
    linhas = ",\n".join(f"  {chave!r}: {valor!r}".replace("'", '"', 2) if False else f'  "{chave}": {_js(valor)}' for chave, valor in dic.items())
    return f"/* {comentario}\n   Gerado por scripts/servicos.py: altere lá e volte a gerar. */\nObject.assign(window.IMPLEMENT_PT = window.IMPLEMENT_PT || {{}}, {{\n{linhas}\n}});\n"


def _js(s):
    import json
    return json.dumps(s, ensure_ascii=False)


if __name__ == "__main__":
    base = (PUBLICO / "contact.html").read_text(encoding="utf-8")
    serv, pt_s, _ = pagina("servicos", base)
    prec, pt_s2, pt_p = pagina("precos", base)
    pt_servicos = {**pt_s, **pt_s2}
    assert not any(any(ch.isdigit() for ch in v) and "€" in v for v in pt_servicos.values()), "Há preços nos textos públicos!"
    assert "€" not in serv, "Há preços na página Serviços!"
    (PUBLICO / "services.html").write_text(serv, encoding="utf-8")
    (PUBLICO / "precario.html").write_text(prec, encoding="utf-8")
    (PUBLICO / "assets/js/i18n-servicos.js").write_text(js("", "Textos em português da página Serviços e das descrições do Preçário (sem preços).", pt_servicos), encoding="utf-8")
    (PUBLICO / "assets/js/i18n-precos.js").write_text(js("", "Textos em português com preços. Só é carregado em precario.html.", pt_p), encoding="utf-8")
    (PUBLICO / "assets/js/precos-dados.js").write_text(dados_js(), encoding="utf-8")
    (PUBLICO / "admin/orcamento.html").write_text(pagina_orcamento(), encoding="utf-8")
    print("precos-dados.js gerado.")
    print("services.html, precario.html, i18n-servicos.js e i18n-precos.js gerados.")
