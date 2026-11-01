/* Implement — perguntas do formulário «Start a Project».
   Fonte única: o browser usa este ficheiro para desenhar o formulário e o Worker usa-o para validar as respostas.
   Para acrescentar ou mudar uma pergunta, altere só aqui.

   Tipos: texto · email · tel · url · area (texto longo) · lista (menu) · unica (pílulas, uma opção)
          · multipla (pílulas, várias) · servicos (cartões) · consentimento
   mostrarSe: { campo, inclui } → só aparece (e só é validada) se a resposta a «campo» incluir esse valor. */

export const SERVICOS = [
  { v: "estrategia", icone: "s-estrategia", en: "Strategy & analysis", pt: "Estratégia e análise", den: "Diagnosis and a plan you can measure", dpt: "Diagnóstico e um plano que se mede" },
  { v: "redes", icone: "s-redes", en: "Social media", pt: "Redes sociais", den: "Planning, content and publishing", dpt: "Planeamento, conteúdo e publicação" },
  { v: "website", icone: "s-web", en: "Website or landing page", pt: "Website ou landing page", den: "New site, redesign or support", dpt: "Site novo, redesign ou manutenção" },
  { v: "marca", icone: "s-marca", en: "Brand identity & design", pt: "Identidade visual e design", den: "Logo, brand manual, print", dpt: "Logótipo, manual, impressão" },
  { v: "conteudo", icone: "s-conteudo", en: "Photo & video", pt: "Fotografia e vídeo", den: "Products, spaces, events, reels", dpt: "Produtos, espaços, eventos, reels" },
  { v: "google", icone: "s-google", en: "Google Business profile", pt: "Perfil Google Business", den: "Be found on Google Maps", dpt: "Ser encontrado no Google Maps" },
];

export const GRUPOS = {
  redes: { icone: "s-redes", en: "About your social media", pt: "Sobre as suas redes sociais", mostrarSe: { campo: "servicos", inclui: "redes" } },
  website: { icone: "s-web", en: "About your website", pt: "Sobre o seu website", mostrarSe: { campo: "servicos", inclui: "website" } },
  marca: { icone: "s-marca", en: "About your brand", pt: "Sobre a sua marca", mostrarSe: { campo: "servicos", inclui: "marca" } },
  conteudo: { icone: "s-conteudo", en: "About photo & video", pt: "Sobre fotografia e vídeo", mostrarSe: { campo: "servicos", inclui: "conteudo" } },
  google: { icone: "s-google", en: "About your Google profile", pt: "Sobre o seu perfil Google", mostrarSe: { campo: "servicos", inclui: "google" } },
};

const o = (v, en, pt) => ({ v, en, pt });
const NAO_SEI = o("nao-sei", "Not sure yet", "Ainda não sei");

export const ETAPAS = [
  {
    id: "negocio",
    en: "Your business", pt: "O seu negócio",
    ien: "Let’s start with the basics. Who are you and what do you do?",
    ipt: "Vamos começar pelo essencial. Quem é e o que faz?",
    campos: [
      { id: "nome", tipo: "texto", obrigatorio: true, max: 80, autocomplete: "name", en: "Your name", pt: "O seu nome" },
      { id: "cargo", tipo: "lista", en: "Your role", pt: "A sua função", opcoes: [
        o("dono", "Owner / partner", "Dono / sócio"), o("gestor", "Manager", "Gestor"), o("marketing", "Marketing / communication", "Marketing / comunicação"), o("outro", "Other", "Outra") ] },
      { id: "empresa", tipo: "texto", obrigatorio: true, max: 120, autocomplete: "organization", en: "Business name", pt: "Nome do negócio" },
      { id: "setor", tipo: "lista", obrigatorio: true, en: "Industry", pt: "Setor", opcoes: [
        o("restauracao", "Restaurant, café or bar", "Restaurante, café ou bar"), o("comercio", "Shop / retail", "Loja / comércio"),
        o("saude", "Health & wellness", "Saúde e bem-estar"), o("beleza", "Beauty & aesthetics", "Beleza e estética"),
        o("imobiliario", "Real estate", "Imobiliário"), o("construcao", "Construction & home", "Construção e casa"),
        o("servicos", "Professional services", "Serviços profissionais"), o("turismo", "Tourism & hospitality", "Turismo e alojamento"),
        o("educacao", "Education & training", "Educação e formação"), o("outro", "Other", "Outro") ] },
      { id: "localizacao", tipo: "texto", obrigatorio: true, max: 100, en: "City and country", pt: "Cidade e país", aen: "e.g. Lisbon, Portugal", apt: "ex.: Braga, Portugal" },
      { id: "anos", tipo: "lista", en: "How long has the business existed?", pt: "Há quanto tempo existe o negócio?", opcoes: [
        o("menos-1", "Less than 1 year", "Menos de 1 ano"), o("1-3", "1 to 3 years", "1 a 3 anos"), o("3-10", "3 to 10 years", "3 a 10 anos"), o("10+", "More than 10 years", "Mais de 10 anos") ] },
      { id: "equipa", tipo: "lista", en: "Team size", pt: "Tamanho da equipa", opcoes: [
        o("1", "Just me", "Só eu"), o("2-5", "2 to 5 people", "2 a 5 pessoas"), o("6-20", "6 to 20 people", "6 a 20 pessoas"), o("21+", "More than 20", "Mais de 20") ] },
      { id: "descricao", tipo: "area", obrigatorio: true, largo: true, max: 1200, en: "What does your business do?", pt: "O que faz o seu negócio?",
        hen: "A few lines are enough: what you sell, to whom, and what you are proud of.", hpt: "Bastam algumas linhas: o que vende, a quem, e do que se orgulha." },
      { id: "links", tipo: "area", largo: true, max: 600, linhas: 2, en: "Website and social media links", pt: "Links do website e das redes sociais",
        hen: "Paste whatever exists today, one per line.", hpt: "Cole o que já existe, um por linha." },
    ],
  },
  {
    id: "publico",
    en: "Your audience", pt: "O seu público",
    ien: "Who you want to reach shapes everything we do next.",
    ipt: "Quem quer alcançar define tudo o que fazemos a seguir.",
    campos: [
      { id: "cliente_ideal", tipo: "area", obrigatorio: true, largo: true, max: 1000, en: "Who is your ideal client?", pt: "Quem é o seu cliente ideal?",
        hen: "Age, profession, where they live, what they value — whatever you know.", hpt: "Idade, profissão, onde vive, o que valoriza — o que souber." },
      { id: "alcance", tipo: "multipla", obrigatorio: true, largo: true, en: "Where are your clients?", pt: "Onde estão os seus clientes?", opcoes: [
        o("local", "Local (my city or region)", "Local (a minha cidade ou região)"), o("nacional", "Across the country", "Em todo o país"), o("internacional", "International", "Internacional"), o("online", "Mostly online", "Sobretudo online") ] },
      { id: "como_chegam", tipo: "multipla", largo: true, en: "How do clients find you today?", pt: "Como é que os clientes o encontram hoje?", opcoes: [
        o("boca", "Word of mouth", "Passa-palavra"), o("google", "Google", "Google"), o("redes", "Social media", "Redes sociais"), o("passagem", "Walk-in", "Passagem na rua"),
        o("parceiros", "Partners or referrals", "Parceiros ou recomendações"), o("anuncios", "Paid ads", "Anúncios pagos"), o("plataformas", "Platforms (Booking, Uber Eats…)", "Plataformas (Booking, Uber Eats…)") ] },
      { id: "diferenca", tipo: "area", obrigatorio: true, largo: true, max: 1000, en: "What makes you different from the competition?", pt: "O que o distingue da concorrência?" },
      { id: "concorrentes", tipo: "area", largo: true, max: 600, linhas: 2, en: "Competitors or brands you look up to", pt: "Concorrentes ou marcas que admira",
        hen: "Names or links. It helps us understand your market and your taste.", hpt: "Nomes ou links. Ajuda-nos a perceber o mercado e o seu gosto." },
    ],
  },
  {
    id: "projeto",
    en: "Your project", pt: "O seu projeto",
    ien: "Choose everything that applies. We’ll ask a few extra questions for each one.",
    ipt: "Escolha tudo o que se aplica. Faremos algumas perguntas extra para cada um.",
    campos: [
      { id: "servicos", tipo: "servicos", obrigatorio: true, largo: true, en: "What can we help you with?", pt: "Em que podemos ajudar?", opcoes: SERVICOS },
      { id: "objetivo", tipo: "unica", obrigatorio: true, largo: true, en: "What is the main goal?", pt: "Qual é o objetivo principal?", opcoes: [
        o("encontrado", "Be found online", "Ser encontrado online"), o("comunicar", "Communicate better", "Comunicar melhor"), o("contactos", "Get more enquiries", "Ter mais pedidos e contactos"),
        o("vender", "Sell online", "Vender online"), o("lancar", "Launch something new", "Lançar algo novo"), o("renovar", "Refresh the brand", "Renovar a marca") ] },

      { id: "redes_quais", grupo: "redes", tipo: "multipla", obrigatorio: true, largo: true, en: "Which platforms?", pt: "Que plataformas?", opcoes: [
        o("instagram", "Instagram", "Instagram"), o("facebook", "Facebook", "Facebook"), o("tiktok", "TikTok", "TikTok"), o("youtube", "YouTube Shorts", "YouTube Shorts"), o("linkedin", "LinkedIn", "LinkedIn") ] },
      { id: "redes_estado", grupo: "redes", tipo: "unica", obrigatorio: true, largo: true, en: "How active are your accounts today?", pt: "Quão ativas estão hoje as suas contas?", opcoes: [
        o("regular", "We post regularly", "Publicamos com regularidade"), o("as-vezes", "Now and then", "De vez em quando"), o("paradas", "Stopped", "Paradas"), o("sem-contas", "No accounts yet", "Ainda não temos contas") ] },
      { id: "redes_quem", grupo: "redes", tipo: "lista", en: "Who manages them now?", pt: "Quem as gere agora?", opcoes: [
        o("eu", "Me", "Eu"), o("equipa", "Someone on the team", "Alguém da equipa"), o("externo", "An agency or freelancer", "Uma agência ou freelancer"), o("ninguem", "Nobody", "Ninguém") ] },
      { id: "redes_material", grupo: "redes", tipo: "lista", en: "Can you send us photos and videos?", pt: "Consegue enviar-nos fotos e vídeos?", opcoes: [
        o("sim", "Yes, regularly", "Sim, com regularidade"), o("alguns", "Some", "Alguns"), o("nao", "No, we need content created", "Não, precisamos que criem conteúdo") ] },

      { id: "site_atual", grupo: "website", tipo: "unica", obrigatorio: true, largo: true, en: "Do you have a website today?", pt: "Tem website atualmente?", opcoes: [
        o("sim", "Yes, and it works", "Sim, e funciona bem"), o("desatualizado", "Yes, but it is outdated", "Sim, mas está desatualizado"), o("nao", "No", "Não") ] },
      { id: "site_funcao", grupo: "website", tipo: "multipla", obrigatorio: true, largo: true, en: "What should the website do?", pt: "O que deve fazer o website?", opcoes: [
        o("apresentar", "Present the business", "Apresentar o negócio"), o("contactos", "Generate enquiries", "Gerar pedidos de contacto"), o("reservas", "Take bookings", "Receber reservas"), o("loja", "Sell online (shop)", "Vender online (loja)"), o("portefolio", "Show work / portfolio", "Mostrar trabalhos") ] },
      { id: "site_paginas", grupo: "website", tipo: "lista", en: "Approximate size", pt: "Dimensão aproximada", opcoes: [
        o("1", "One page (landing page)", "Uma página (landing page)"), o("2-5", "2 to 5 pages", "2 a 5 páginas"), o("6-10", "6 to 10 pages", "6 a 10 páginas"), o("10+", "More than 10 pages", "Mais de 10 páginas"), NAO_SEI ] },
      { id: "site_conteudos", grupo: "website", tipo: "lista", en: "Do you have texts and photos ready?", pt: "Tem textos e fotografias prontos?", opcoes: [
        o("sim", "Yes", "Sim"), o("parte", "Partly", "Em parte"), o("nao", "No, we need help", "Não, precisamos de ajuda") ] },

      { id: "marca_logo", grupo: "marca", tipo: "unica", obrigatorio: true, largo: true, en: "Do you have a logo?", pt: "Já tem logótipo?", opcoes: [
        o("manter", "Yes, and we want to keep it", "Sim, e queremos mantê-lo"), o("renovar", "Yes, but it needs a refresh", "Sim, mas precisa de ser renovado"), o("nao", "No", "Não") ] },
      { id: "marca_pecas", grupo: "marca", tipo: "multipla", largo: true, en: "What do you need?", pt: "Do que precisa?", opcoes: [
        o("logotipo", "Logo", "Logótipo"), o("identidade", "Colours & typography", "Cores e tipografia"), o("manual", "Brand manual", "Manual de marca"), o("papelaria", "Business cards & stationery", "Cartões e papelaria"),
        o("menus", "Menus", "Menus"), o("flyers", "Flyers & brochures", "Flyers e brochuras"), o("modelos", "Social media templates", "Modelos para redes sociais") ] },

      { id: "conteudo_tipo", grupo: "conteudo", tipo: "multipla", obrigatorio: true, largo: true, en: "What kind of content?", pt: "Que tipo de conteúdo?", opcoes: [
        o("produto", "Product photos", "Fotografia de produto"), o("espaco", "Space / venue photos", "Fotografia do espaço"), o("evento", "Event coverage", "Cobertura de eventos"),
        o("reels", "Short videos / reels", "Vídeos curtos / reels"), o("promo", "Promotional video", "Vídeo promocional") ] },
      { id: "conteudo_frequencia", grupo: "conteudo", tipo: "unica", largo: true, en: "How often?", pt: "Com que frequência?", opcoes: [
        o("pontual", "One-off", "Pontual"), o("mensal", "Every month", "Todos os meses"), NAO_SEI ] },

      { id: "google_perfil", grupo: "google", tipo: "unica", obrigatorio: true, largo: true, en: "Do you have a Google Business profile?", pt: "Tem perfil no Google Business?", opcoes: [
        o("ativo", "Yes, and I update it", "Sim, e atualizo-o"), o("abandonado", "Yes, but it is abandoned", "Sim, mas está abandonado"), o("nao", "No", "Não"), NAO_SEI ] },
    ],
  },
  {
    id: "presenca",
    en: "Digital presence", pt: "Presença digital",
    ien: "An honest picture of today helps us prepare a useful first analysis.",
    ipt: "Uma imagem honesta do presente ajuda-nos a preparar uma primeira análise útil.",
    campos: [
      { id: "frustracao", tipo: "area", obrigatorio: true, largo: true, max: 1200, en: "What is not working, or worries you most?", pt: "O que não está a resultar, ou o que mais o preocupa?" },
      { id: "funciona", tipo: "area", largo: true, max: 1000, linhas: 3, en: "What is working well today?", pt: "O que está a funcionar bem hoje?" },
      { id: "experiencia", tipo: "unica", largo: true, en: "Have you worked with an agency or freelancer before?", pt: "Já trabalhou com uma agência ou freelancer?", opcoes: [
        o("bom", "Yes, it went well", "Sim, correu bem"), o("mau", "Yes, it didn’t go well", "Sim, não correu bem"), o("nao", "No, it’s the first time", "Não, é a primeira vez") ] },
      { id: "experiencia_nota", tipo: "area", largo: true, max: 800, linhas: 2, mostrarSe: { campo: "experiencia", inclui: "mau" },
        en: "What would you like to be different this time?", pt: "O que gostaria que fosse diferente desta vez?" },
      { id: "sucesso", tipo: "area", obrigatorio: true, largo: true, max: 1000, linhas: 3, en: "In 6 months, what would make this a success for you?", pt: "Daqui a 6 meses, o que faria disto um sucesso para si?" },
    ],
  },
  {
    id: "orcamento",
    en: "Budget & timeline", pt: "Orçamento e prazos",
    ien: "There are no wrong answers. This helps us suggest something realistic from the start.",
    ipt: "Não há respostas erradas. Isto ajuda-nos a sugerir algo realista desde o início.",
    campos: [
      { id: "tipo_trabalho", tipo: "unica", obrigatorio: true, largo: true, en: "What kind of collaboration?", pt: "Que tipo de colaboração?", opcoes: [
        o("mensal", "Ongoing, every month", "Contínua, todos os meses"), o("projeto", "A one-off project", "Um projeto pontual"), o("ambos", "Both", "Ambos"), NAO_SEI ] },
      { id: "orcamento_mensal", tipo: "unica", obrigatorio: true, largo: true, mostrarSe: { campo: "tipo_trabalho", inclui: ["mensal", "ambos", "nao-sei"] },
        en: "Monthly budget (excl. VAT)", pt: "Orçamento mensal (sem IVA)", opcoes: [
        o("ate-300", "Up to €300", "Até 300 €"), o("300-500", "€300 – €500", "300 € – 500 €"), o("500-800", "€500 – €800", "500 € – 800 €"),
        o("800-1200", "€800 – €1,200", "800 € – 1.200 €"), o("1200+", "More than €1,200", "Mais de 1.200 €"), NAO_SEI ] },
      { id: "orcamento_projeto", tipo: "unica", obrigatorio: true, largo: true, mostrarSe: { campo: "tipo_trabalho", inclui: ["projeto", "ambos"] },
        en: "Project budget (excl. VAT)", pt: "Orçamento do projeto (sem IVA)", opcoes: [
        o("ate-500", "Up to €500", "Até 500 €"), o("500-1000", "€500 – €1,000", "500 € – 1.000 €"), o("1000-2000", "€1,000 – €2,000", "1.000 € – 2.000 €"),
        o("2000+", "More than €2,000", "Mais de 2.000 €"), NAO_SEI ] },
      { id: "prazo", tipo: "unica", obrigatorio: true, largo: true, en: "When would you like to start?", pt: "Quando gostaria de começar?", opcoes: [
        o("ja", "As soon as possible", "O mais rápido possível"), o("1-mes", "Within a month", "Dentro de um mês"), o("1-3-meses", "In 1 to 3 months", "Daqui a 1 a 3 meses"), o("explorar", "Just exploring", "Só estou a explorar") ] },
      { id: "data_limite", tipo: "texto", max: 120, en: "Any date we should know about?", pt: "Há alguma data importante?", aen: "e.g. opening on 15 March", apt: "ex.: inauguração a 15 de março" },
      { id: "decisao", tipo: "lista", en: "Who makes the decision?", pt: "Quem toma a decisão?", opcoes: [
        o("eu", "I do", "Eu"), o("socios", "Me and my partner(s)", "Eu e o(s) sócio(s)"), o("outro", "Someone else", "Outra pessoa") ] },
    ],
  },
  {
    id: "envio",
    en: "Contact & submit", pt: "Contacto e envio",
    ien: "Last step. Tell us how to reach you and check your answers.",
    ipt: "Último passo. Diga-nos como o podemos contactar e reveja as respostas.",
    campos: [
      { id: "email", tipo: "email", obrigatorio: true, max: 254, autocomplete: "email", en: "Email", pt: "E-mail" },
      { id: "telefone", tipo: "tel", max: 30, autocomplete: "tel", en: "Phone / WhatsApp", pt: "Telefone / WhatsApp" },
      { id: "preferencia", tipo: "unica", largo: true, en: "How do you prefer to be contacted?", pt: "Como prefere ser contactado?", opcoes: [
        o("email", "Email", "E-mail"), o("telefone", "Phone call", "Chamada"), o("whatsapp", "WhatsApp", "WhatsApp"), o("video", "Video call", "Videochamada") ] },
      { id: "idioma_contacto", tipo: "unica", largo: true, en: "Preferred language", pt: "Idioma preferido", opcoes: [
        o("pt", "Portuguese", "Português"), o("en", "English", "Inglês") ] },
      { id: "origem", tipo: "lista", en: "How did you hear about us?", pt: "Como nos conheceu?", opcoes: [
        o("instagram", "Instagram", "Instagram"), o("google", "Google", "Google"), o("recomendacao", "A recommendation", "Recomendação"), o("cliente", "I saw your work for a client", "Vi um trabalho vosso para um cliente"), o("outro", "Other", "Outro") ] },
      { id: "notas", tipo: "area", largo: true, max: 1500, linhas: 3, en: "Anything else we should know?", pt: "Mais alguma coisa que devamos saber?" },
      { id: "consentimento", tipo: "consentimento", obrigatorio: true, largo: true,
        en: "I agree that Implement may use these answers to contact me and prepare a proposal. They are not shared with anyone else.",
        pt: "Aceito que a Implement use estas respostas para me contactar e preparar uma proposta. Não são partilhadas com mais ninguém." },
    ],
  },
];

/* ---------- Regras partilhadas (browser e Worker) ---------- */
export function todosOsCampos() { return ETAPAS.flatMap((e) => e.campos); }

export function visivel(campo, respostas) {
  const regra = campo.mostrarSe || (campo.grupo && GRUPOS[campo.grupo] && GRUPOS[campo.grupo].mostrarSe);
  if (!regra) return true;
  const valor = respostas[regra.campo];
  const lista = Array.isArray(valor) ? valor : valor ? [valor] : [];
  const precisa = Array.isArray(regra.inclui) ? regra.inclui : [regra.inclui];
  return precisa.some((p) => lista.includes(p));
}

const EMAIL = /^[^\s@<>()[\]\\,;:"]{1,64}@[a-z0-9.-]{1,253}\.[a-z]{2,24}$/i;
const ERROS = {
  obrigatorio: { en: "Please answer this question.", pt: "Responda a esta pergunta, por favor." },
  email: { en: "Please check this email address.", pt: "Confirme este endereço de e-mail." },
  tel: { en: "Please check this phone number.", pt: "Confirme este número de telefone." },
  longo: { en: "This answer is too long.", pt: "Esta resposta é demasiado longa." },
  opcao: { en: "Please choose one of the options.", pt: "Escolha uma das opções." },
  consentimento: { en: "We need your agreement to contact you.", pt: "Precisamos da sua autorização para o contactar." },
};

/* Valida e limpa um campo. Devolve { valor } ou { erro: {en, pt} }. */
export function validarCampo(campo, bruto) {
  const vazio = bruto == null || (typeof bruto === "string" && !bruto.trim()) || (Array.isArray(bruto) && !bruto.length) || bruto === false;
  if (vazio) return campo.obrigatorio ? { erro: campo.tipo === "consentimento" ? ERROS.consentimento : ERROS.obrigatorio } : { valor: undefined };
  const validos = (campo.opcoes || []).map((x) => x.v);
  switch (campo.tipo) {
    case "consentimento": return bruto === true || bruto === "sim" ? { valor: true } : { erro: ERROS.consentimento };
    case "multipla":
    case "servicos": {
      const lista = [...new Set((Array.isArray(bruto) ? bruto : [bruto]).map(String))];
      return lista.every((x) => validos.includes(x)) ? { valor: lista } : { erro: ERROS.opcao };
    }
    case "unica":
    case "lista": return validos.includes(String(bruto)) ? { valor: String(bruto) } : { erro: ERROS.opcao };
    default: {
      const texto = String(bruto).replace(/\u0000/g, "").trim();
      if (texto.length > (campo.max || 500)) return { erro: ERROS.longo };
      if (campo.tipo === "email" && !EMAIL.test(texto)) return { erro: ERROS.email };
      if (campo.tipo === "tel" && (!/^\+?[0-9 ().-]{6,30}$/.test(texto) || texto.replace(/\D/g, "").length < 6)) return { erro: ERROS.tel };
      return { valor: texto };
    }
  }
}

/* Valida todas as respostas visíveis. Ignora campos desconhecidos e os que estão escondidos. */
export function validarTudo(respostas) {
  const limpas = {};
  const erros = {};
  for (const campo of todosOsCampos()) {
    if (!visivel(campo, respostas)) continue;
    const r = validarCampo(campo, respostas[campo.id]);
    if (r.erro) erros[campo.id] = r.erro;
    else if (r.valor !== undefined) limpas[campo.id] = r.valor;
  }
  return { limpas, erros, valido: Object.keys(erros).length === 0 };
}

/* Texto legível de uma resposta (para o resumo e o e-mail) */
export function textoResposta(campo, valor, idioma = "en") {
  if (valor === undefined || valor === null || valor === "") return "";
  if (campo.tipo === "consentimento") return idioma === "pt" ? "Sim" : "Yes";
  const opcoes = campo.opcoes || [];
  const nome = (v) => { const x = opcoes.find((y) => y.v === v); return x ? x[idioma] : v; };
  if (Array.isArray(valor)) return valor.map(nome).join(", ");
  return opcoes.length ? nome(valor) : String(valor);
}

/* ---------- Formulário da página Contacto ---------- */
export const CONTACTO = [
  { id: "nome", tipo: "texto", obrigatorio: true, max: 80, autocomplete: "name", en: "Your name", pt: "O seu nome" },
  { id: "email", tipo: "email", obrigatorio: true, max: 254, autocomplete: "email", en: "Email", pt: "E-mail" },
  { id: "telefone", tipo: "tel", max: 30, autocomplete: "tel", en: "Phone / WhatsApp", pt: "Telefone / WhatsApp" },
  { id: "empresa", tipo: "texto", max: 120, autocomplete: "organization", en: "Business", pt: "Empresa" },
  { id: "assunto", tipo: "lista", obrigatorio: true, en: "Subject", pt: "Assunto", opcoes: [
    o("projeto", "A new project", "Um novo projeto"), o("duvida", "A question", "Uma dúvida"),
    o("parceria", "Partnership", "Parceria"), o("outro", "Something else", "Outro assunto") ] },
  { id: "mensagem", tipo: "area", obrigatorio: true, largo: true, max: 3000, en: "Message", pt: "Mensagem" },
  { id: "consentimento", tipo: "consentimento", obrigatorio: true, largo: true,
    en: "I agree that Implement may use these details to reply to my message.",
    pt: "Aceito que a Implement use estes dados para responder à minha mensagem." },
];

export function validarContacto(respostas) {
  const limpas = {};
  const erros = {};
  for (const campo of CONTACTO) {
    const r = validarCampo(campo, respostas[campo.id]);
    if (r.erro) erros[campo.id] = r.erro;
    else if (r.valor !== undefined) limpas[campo.id] = r.valor;
  }
  return { limpas, erros, valido: Object.keys(erros).length === 0 };
}
