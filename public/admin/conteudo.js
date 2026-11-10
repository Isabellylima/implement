/* Implement — plano de conteúdo das redes sociais (/admin/conteudo). */
const BASE="#digitalmarketing #digitalstrategy #onlinepresence #businessgrowth #marketingdigital #presencadigital #estrategiadigital #negociosonline";
const EBASE="#marketingdigital #inteligenciaartificial #produtividade #gestaodotempo #empreendedorismo";
const ICON={
 Reel:'<svg class="fmt" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M10 8.5v7l6-3.5z" fill="currentColor"/></svg>',
 Carrossel:'<svg class="fmt" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="3" width="14" height="14" rx="3"/><path d="M3 7v12a2 2 0 0 0 2 2h12"/></svg>',
 "Estático":''};
const SIL='<svg class="sil" viewBox="0 0 64 64"><circle cx="32" cy="24" r="12" fill="#fff"/><path d="M6 64c2-16 13-24 26-24s24 8 26 24z" fill="#fff"/></svg>';
const BEE='<svg viewBox="0 0 64 40" class="bee"><ellipse cx="17" cy="15" rx="15" ry="9" fill="none" stroke="#B3A3E2" stroke-width="3" transform="rotate(-12 17 15)"/><ellipse cx="47" cy="15" rx="15" ry="9" fill="none" stroke="#B3A3E2" stroke-width="3" transform="rotate(12 47 15)"/><ellipse cx="32" cy="24" rx="5.5" ry="12" fill="#F6D97B"/><rect x="26" y="22" width="12" height="2.2" fill="#1C0F3A"/><rect x="26.5" y="27" width="11" height="2.2" fill="#1C0F3A"/></svg>';

/* kind: imp = só Implement · col = collab (nos dois feeds) · eisa = só Izza */
const posts=[
/* ---------- IMPLEMENT (terças) ---------- */
{id:"P1",kind:"imp",date:"2026-11-10",fmt:"Reel",pillar:"Marca · rebranding",
 tile:BEE+'<div class="h">Nova fase.<br><mark>A mesma intenção.</mark></div>',
 title:"Nova fase, a mesma intenção",
 visual:"<b>Reel de 10–15 s.</b> O logótipo antigo dá lugar à abelha, que ganha vida com um movimento suave. Frase final: “Nova fase. A mesma intenção.”",
 pt:`✨ Uma nova fase para a Implement.

Renovámos a nossa identidade e estamos a preparar uma nova casa digital.
A abelha representa o que fazemos todos os dias: trabalho constante, organizado e em equipa, para que a presença online de cada negócio cresça com consistência.

💬 Vamos conversar sobre o seu negócio.`,
 en:`✨ A new chapter for Implement.

New identity, same intention.
Like bees, we believe in steady, organised teamwork that helps every business grow its online presence with consistency.

💬 Let’s talk about your business.`,tags:"#rebranding #novaidentidade"},
{id:"P2",kind:"imp",date:"2026-11-17",fmt:"Carrossel",pillar:"Presença digital",photo:"detalhe",
 tile:'<div class="h">5 sinais de que a sua presença digital <mark>precisa de atenção</mark></div>',
 title:"5 sinais de que a sua presença digital precisa de atenção",
 visual:"<b>Carrossel de 7 slides.</b> Capa design; no meio, alternar slides de texto com fotos de detalhe do ensaio (mãos no telemóvel, ecrã) com o sinal escrito por cima:",
 slides:["Capa: “Se um cliente o procurar hoje, o que encontra?”","O último post foi há meses.","O Google mostra o horário errado, ou nenhum.","O site não abre bem no telemóvel, ou não existe.","Cada rede diz uma coisa diferente sobre o negócio.","Os clientes perguntam por mensagem o que já devia estar visível.","“Tudo isto tem solução. E não precisa de ser você a tratar.”"],
 pt:`✨ Se um cliente o procurar hoje, o que vai encontrar?

Uma presença digital desatualizada passa uma mensagem, mesmo quando o negócio está a correr bem.
Deslize para ver os 5 sinais mais comuns de que está na altura de organizar. Quantos reconhece?

💬 Vamos conversar sobre o seu negócio.`,
 en:`✨ If a client looked you up today, what would they find?

An outdated online presence sends a message, even when business is going well.
Swipe through the 5 most common signs it’s time to get organised. How many do you recognise?

💬 Let’s talk about your business.`,tags:"#redessociais #socialmedia"},
{id:"P3",kind:"imp",date:"2026-11-24",fmt:"Estático",pillar:"Empreendedores reais",
 tile:'<div class="h">Não precisa de estar em todas as redes. Precisa de estar bem nas <mark><b>certas</b></mark>.</div>',
 title:"Não precisa de estar em todas as redes",
 visual:"<b>Post estático.</b> Frase em Bodoni, palavra “certas” em roxo marcada a amarelo. Abelha pequena no canto.",
 pt:`✨ Não precisa de estar em todas as redes.

Precisa de estar bem nas certas: onde os seus clientes já estão, com uma mensagem clara e consistente.
Menos dispersão, mais resultado. É por aí que começamos com cada cliente.

💬 Vamos conversar sobre o seu negócio.`,
 en:`✨ You don’t need to be on every platform.

You need to be good on the right ones: where your clients already are, with a clear and consistent message.
Less noise, better results. That’s where we start with every client.

💬 Let’s talk about your business.`,tags:"#empreendedorismo #pme"},
{id:"P4",kind:"imp",date:"2026-12-01",fmt:"Carrossel",pillar:"Portfólio",
 tile:'<div class="s">Antes</div><div class="h u-my2">→</div><div class="s s-roxo">Depois</div>',
 title:"Antes e depois: um caso real",
 visual:"<b>Carrossel de 6 slides</b> com um cliente real:",
 slides:["Capa: “Antes → Depois” + nome do cliente","Ponto de partida: perfil, bio e feed","O que mudámos: identidade, bio, linha de conteúdo","O feed novo","Testemunho curto do cliente","“O seu negócio pode ser o próximo.”"],
 flag:"Escolher um cliente que autorize. Só números medidos de facto; sem estimativas.",
 pt:`✨ Do perfil parado a uma presença com intenção.

Neste projeto com [Nome do cliente], começámos por ouvir: o que o negócio faz de melhor, quem quer atrair e o que estava a falhar online.
Depois organizámos tudo: identidade, comunicação e conteúdo com uma linha clara. Deslize para ver o antes e o depois.

💬 Vamos conversar sobre o seu negócio.`,
 en:`✨ From a quiet profile to a presence with intention.

With [Client name], we started by listening: what the business does best, who it wants to reach and what wasn’t working online.
Then we organised everything: identity, messaging and content with a clear direction. Swipe to see the before and after.

💬 Let’s talk about your business.`,tags:"#portfolio #antesedepois"},
{id:"P5",kind:"imp",date:"2026-12-08",fmt:"Reel",pillar:"Novas tecnologias",
 tile:'<div class="h">IA no seu negócio: <mark>por onde começar?</mark></div>',
 title:"IA no seu negócio: o que faz sentido",
 visual:"<b>Reel de 30–40 s</b> com texto animado sobre detalhes do ensaio (mãos no portátil): responder mais depressa a perguntas frequentes; organizar o calendário de conteúdo; perceber o que resulta. Fecho: “A IA ajuda. Quem conhece o seu cliente é você.”",
 photo:"detalhe",
 pt:`✨ Inteligência artificial no seu negócio: por onde começar?

Não precisa de perceber de tecnologia para tirar partido dela. Há usos simples que lhe devolvem tempo, como responder mais depressa a perguntas frequentes ou organizar o calendário de conteúdo.
O que a IA não substitui: conhecer o seu cliente e comunicar com verdade. É aí que estamos ao seu lado.

💬 Vamos conversar sobre o seu negócio.`,
 en:`✨ AI in your business: where to start?

You don’t need to be a tech expert to benefit from it. Simple uses can give you time back, like answering common questions faster or organising your content calendar.
What AI won’t replace: knowing your clients and communicating honestly. That’s where we work alongside you.

💬 Let’s talk about your business.`,tags:"#inteligenciaartificial #aiformarketing"},
{id:"P6",kind:"imp",date:"2026-12-15",fmt:"Carrossel",pillar:"Estratégia",photo:"detalhe",
 tile:'<div class="h">Prepare 2027 em <mark>4 perguntas</mark></div>',
 title:"Prepare 2027 em 4 perguntas",
 visual:"<b>Carrossel de 6 slides</b>, para guardar. Cada pergunta sobre uma foto de detalhe (agenda, caneta, café) com véu lilás:",
 slides:["Capa: “Prepare 2027 em 4 perguntas”","Quem quero atrair este ano?","Onde passa essa pessoa o tempo online?","O que quero que faça quando me encontrar?","Como vou saber se está a resultar?","“Se quiser, respondemos a isto consigo.”"],
 pt:`✨ Antes de pensar em posts, pense nas respostas.

Uma boa estratégia digital começa com perguntas simples. Guarde este carrossel e reserve 20 minutos esta semana para responder às 4 perguntas sobre o seu negócio.
Com as respostas certas, o conteúdo de 2027 fica muito mais fácil.

💬 Vamos conversar sobre o seu negócio.`,
 en:`✨ Before thinking about posts, think about the answers.

Good digital strategy starts with simple questions. Save this post and set aside 20 minutes this week to answer these 4 questions about your business.
With the right answers, your 2027 content becomes much easier.

💬 Let’s talk about your business.`,tags:"#planeamento #estrategia2027"},
{id:"P7",kind:"imp",date:"2026-12-22",fmt:"Reel",pillar:"Bastidores",photo:"detalhe",
 tile:'<div class="s">Boas festas</div><div class="h u-f75 u-mt3">obrigado a quem constrói todos os dias</div>',
 title:"Obrigado a quem constrói todos os dias",
 visual:"<b>Reel de bastidores</b> só com detalhes: mãos a editar, ecrãs, cadernos, gravações em clientes. Texto final: “Boas festas. Em 2027, continuamos lado a lado.”",
 pt:`✨ Este ano, aprendemos com empreendedores reais.

Pessoas que abrem a porta todos os dias, mesmo quando é difícil, e que confiaram em nós para cuidar da sua presença digital.
Obrigado por nos deixarem entrar no vosso negócio. Boas festas, e até 2027.

💬 Conte connosco em 2027.`,
 en:`✨ This year, we learned from real entrepreneurs.

People who open their doors every day, even when it’s hard, and who trusted us with their online presence.
Thank you for letting us into your business. Happy holidays, see you in 2027.

💬 Count on us in 2027.`,tags:"#bastidores #boasfestas"},
{id:"P8",kind:"imp",date:"2026-12-29",fmt:"Carrossel",pillar:"Presença digital · Google",
 tile:'<div class="h">Google Business: <mark>6 ajustes</mark> antes de janeiro</div>',
 title:"Google Business: 6 ajustes antes de janeiro",
 visual:"<b>Carrossel de 8 slides</b> em checklist, lilás com visto amarelo:",
 slides:["Capa","Horário certo, incluindo feriados","Fotos recentes do espaço e da equipa","Categoria e serviços bem escolhidos","Responder a todas as avaliações","Link para o site e para o WhatsApp","Uma publicação por mês no perfil","“Quer ajuda? Tratamos disso por si.”"],
 pt:`✨ Quando alguém procura o seu negócio no Google, a primeira impressão é o seu perfil.

Horários errados, fotos antigas ou avaliações sem resposta afastam clientes antes do primeiro contacto.
Deixamos 6 ajustes simples para começar o ano com o perfil em ordem. Guarde para fazer com calma.

💬 Vamos conversar sobre o seu negócio.`,
 en:`✨ When someone searches for your business on Google, your profile is the first impression.

Wrong opening hours, old photos or unanswered reviews push clients away before the first contact.
Here are 6 simple fixes to start the year with your profile in order. Save it for later.

💬 Let’s talk about your business.`,tags:"#googlebusiness #negociolocal"},
{id:"P9",kind:"imp",date:"2027-01-05",fmt:"Reel",pillar:"A Implement como solução",
 tile:'<div class="h">Você cuida do negócio. <b><mark>Nós tratamos do digital.</mark></b></div>',
 title:"2027: a sua presença digital, resolvida",
 visual:"<b>Reel curto</b> com os 6 serviços a passar sobre detalhes do ensaio. Capa com a frase do site. Termina no ecrã do heyimplement.com.",
 photo:"detalhe",
 pt:`✨ Ano novo, presença digital organizada.

Sabemos que o seu tempo vai para o negócio, e é aí que deve estar.
A Implement trata das redes sociais, do conteúdo, da identidade, do site e do Google Business, com estratégia e acompanhamento de perto. Você fica com a tranquilidade.

💬 Vamos conversar sobre o seu negócio.`,
 en:`✨ New year, organised online presence.

We know your time goes into your business, and that’s where it should be.
Implement handles your social media, content, branding, website and Google Business, with strategy and close support. You get peace of mind.

💬 Book a call.`,tags:"#marketingportugal #agenciadigital"},

/* ---------- COLLAB Izza × Implement (quintas) ---------- */
{id:"C1",kind:"col",date:"2026-11-12",fmt:"Carrossel",pillar:"Apresentação",photo:"retrato",
 tile:'<div class="h">Quem está por trás da <mark>Implement?</mark></div>',
 title:"Quem está por trás da Implement",
 visual:"<b>Carrossel de 5 slides.</b> Capa design, sem rosto. A partir do 2.º slide entra o teu retrato do ensaio:",
 slides:["Capa: “Quem está por trás da Implement?”","Retrato + “Prazer, Isabelly.”","O que faço: estratégia, conteúdo e IA aplicada ao marketing","Como trabalho: perto do negócio, sem complicar","“Por aqui vou partilhar o que aprendo.” + @hey_izza_ e @heyimplement"],
 pt:`✨ Quem está por trás da Implement?

Sou a Isabelly e faço parte da equipa de marketing e comunicação. Todos os dias ajudo empresários a organizar a presença digital, com estratégia, conteúdo e atenção às novas tecnologias.
A partir de agora vou partilhar aqui o que aprendo, de forma simples.

💬 Vamos conversar sobre o seu negócio.`,
 en:`✨ Who’s behind Implement?

I’m Isabelly, part of the marketing and communication team. Every day I help business owners organise their online presence, with strategy, content and an eye on new technology.
From now on I’ll share what I learn here, in a simple way.

💬 Let’s talk about your business.`,tags:"#equipa #bastidores"},
{id:"C2",kind:"col",date:"2026-11-19",fmt:"Reel",pillar:"Bastidores",photo:"detalhe",
 tile:'<div class="s">Um dia na</div><div class="h u-mt2">Implement</div>',
 title:"Um dia de trabalho na Implement",
 visual:"<b>Reel de 20–30 s</b> com cortes rápidos de detalhes: café, agenda aberta, mãos no portátil, telemóvel a gravar, ecrã de edição. Texto no ecrã: 9h planeamento · 11h gravação · 15h edição · 17h relatório.",
 pt:`✨ Como é um dia de trabalho na Implement?

Planear, gravar, editar e rever. Por trás de cada post há horas de organização para que o cliente não tenha de pensar nisso.
É este o trabalho que fica invisível, e é por isso que funciona.

💬 Vamos conversar sobre o seu negócio.`,
 en:`✨ What does a workday at Implement look like?

Planning, filming, editing and reviewing. Behind every post there are hours of organisation, so our clients don’t have to think about it.
That’s the invisible work, and that’s why it works.

💬 Let’s talk about your business.`,tags:"#diadetrabalho #bastidores"},
{id:"C3",kind:"col",date:"2026-11-26",fmt:"Carrossel",pillar:"Gestão de tempo",
 tile:'<div class="h">O que delegar <mark>primeiro</mark> no seu negócio</div>',
 title:"O que delegar primeiro no seu negócio",
 visual:"<b>Carrossel de 6 slides</b>, só design:",
 slides:["Capa","O que se repete todas as semanas","O que não é o seu talento","O que lhe come mais horas","O que mexe com a imagem do negócio (redes, site, Google)","“Comece por um. Nós ajudamos com o digital.”"],
 pt:`✨ Não tem tempo para tudo. Ninguém tem.

Delegar não é perder o controlo, é escolher onde o seu tempo vale mais.
Deslize e veja os 4 critérios que usamos com os clientes para decidir o que sai primeiro da lista do dono do negócio.

💬 Vamos conversar sobre o seu negócio.`,
 en:`✨ You don’t have time for everything. Nobody does.

Delegating isn’t losing control, it’s choosing where your time matters most.
Swipe for the 4 criteria we use with clients to decide what comes off the owner’s list first.

💬 Let’s talk about your business.`,tags:"#gestaodotempo #delegar"},
{id:"C4",kind:"col",date:"2026-12-03",fmt:"Carrossel",pillar:"Novas apps",photo:"detalhe",
 tile:'<div class="h">4 apps que todo pequeno negócio <mark>devia conhecer</mark></div>',
 title:"4 apps que todo pequeno negócio devia conhecer",
 visual:"<b>Carrossel de 6 slides.</b> Cada app com uma foto de detalhe (mão a segurar o telemóvel) e o ícone desenhado de forma simples, sem logótipos oficiais:",
 slides:["Capa","Canva: criar posts e materiais sem designer","Meta Business Suite: agendar publicações no Instagram e Facebook","Google Business Profile: gerir o perfil no Google pelo telemóvel","CapCut: editar vídeos curtos com legendas automáticas","“Ferramentas ajudam. Estratégia decide.”"],
 pt:`✨ Ferramentas certas poupam horas.

Estas 4 apps resolvem tarefas do dia a dia de qualquer pequeno negócio: criar, agendar, gerir o Google e editar vídeo.
Guarde para testar com calma. E se preferir que alguém trate disso por si, estamos cá.

💬 Vamos conversar sobre o seu negócio.`,
 en:`✨ The right tools save hours.

These 4 apps handle everyday tasks for any small business: designing, scheduling, managing Google and editing video.
Save it to try later. And if you’d rather someone handled it for you, we’re here.

💬 Let’s talk about your business.`,tags:"#apps #ferramentasdigitais"},
{id:"C5",kind:"col",date:"2026-12-10",fmt:"Carrossel",pillar:"Portfólio · processo",photo:"detalhe",
 tile:'<div class="h">Do diagnóstico ao post</div><div class="s u-f9 u-mt3">como trabalhamos</div>',
 title:"Do diagnóstico ao post: como trabalhamos",
 visual:"<b>Carrossel de 6 slides</b> com o processo do site, em sequência real:",
 slides:["Capa","Diagnóstico: entender o negócio e o que está a falhar","Estratégia: para quem, onde e com que mensagem","Execução: conteúdo, design, site, Google","Revisão e melhoria: ver o que resulta e ajustar","“Quer ver como seria no seu negócio?”"],
 pt:`✨ Cada post que publicamos começa muito antes do post.

Primeiro entendemos o negócio. Depois definimos a estratégia, executamos e revemos o que está a resultar, todos os meses.
É um processo simples, contínuo e sem promessas milagrosas.

💬 Vamos conversar sobre o seu negócio.`,
 en:`✨ Every post we publish starts long before the post.

First we understand the business. Then we set the strategy, execute and review what’s working, every month.
A simple, ongoing process, with no miracle promises.

💬 Let’s talk about your business.`,tags:"#processo #portfolio"},
{id:"C6",kind:"col",date:"2026-12-17",fmt:"Reel",pillar:"IA na prática",photo:"retrato",
 tile:'<div class="h">O prompt que usamos para planear <mark>um mês de conteúdo</mark></div>',
 title:"O prompt para planear um mês de conteúdo",
 visual:"<b>Reel falado.</b> Tu à câmara com a luz lilás, gravação de ecrã do prompt a correr. A capa é só a frase, para o feed da Implement ficar clean.",
 pt:`✨ Um mês de ideias de conteúdo em 10 minutos.

Este é o ponto de partida que usamos com a IA:
“Sou [tipo de negócio] em [cidade]. Os meus clientes são [quem]. Sugere 8 ideias de posts para o próximo mês, misturando dicas, bastidores e serviços, com um título curto para cada.”
Depois revemos tudo com olhar humano. A IA dá ideias, a estratégia escolhe.

💬 Vamos conversar sobre o seu negócio.`,
 en:`✨ A month of content ideas in 10 minutes.

This is the starting prompt we use with AI:
“I run a [type of business] in [city]. My clients are [who]. Suggest 8 post ideas for next month, mixing tips, behind-the-scenes and services, each with a short title.”
Then we review everything with a human eye. AI brings ideas, strategy chooses.

💬 Let’s talk about your business.`,tags:"#prompt #inteligenciaartificial"},
{id:"C7",kind:"col",date:"2026-12-23",fmt:"Reel",pillar:"Empreendedores reais",photo:"retrato",
 tile:'<div class="h">Quem cuida do negócio também precisa de <mark>cuidado</mark></div>',
 title:"Quem cuida do negócio também precisa de cuidado",
 visual:"<b>Reel falado, 40–60 s.</b> Tu à câmara, tom calmo. Três ideias: horários com fim, delegar o que pesa, pedir ajuda cedo. Liga à tua história sem repetir os detalhes.",
 pt:`✨ Quem cuida do negócio também precisa de cuidado.

Empreender cansa. Quando a cabeça não está bem, o negócio sente e as pessoas à volta também.
Neste fim de ano, deixamos três lembretes: ponha fim ao dia de trabalho, delegue o que pesa e peça ajuda cedo, a amigos ou a um profissional.

💬 Boas festas. Conte connosco em 2027.`,
 en:`✨ The person who takes care of the business needs care too.

Running a business is tiring. When your mind isn’t well, the business feels it, and so do the people around you.
To close the year, three reminders: put an end to your workday, delegate what weighs on you and ask for help early, from friends or a professional.

💬 Happy holidays. Count on us in 2027.`,tags:"#saudemental #empreendedorismo"},
{id:"C8",kind:"col",date:"2026-12-30",fmt:"Carrossel",pillar:"Presença digital",
 tile:'<div class="h">3 lições de 2026 sobre <mark>presença digital</mark></div>',
 title:"3 lições de 2026 sobre presença digital",
 visual:"<b>Carrossel de 5 slides</b>, só design:",
 slides:["Capa","Consistência vale mais do que perfeição","Pessoas reais em vídeo chegam mais longe do que grafismo","Clareza vence criatividade sem rumo","“Em 2027, vamos aplicar isto juntos?”"],
 pt:`✨ O que 2026 nos ensinou sobre presença digital.

Publicar com regularidade, mostrar pessoas reais e dizer com clareza o que se faz. Parece simples, e é. O difícil é manter.
Levamos estas três lições para 2027, connosco e com cada cliente.

💬 Vamos conversar sobre o seu negócio.`,
 en:`✨ What 2026 taught us about online presence.

Post consistently, show real people and say clearly what you do. It sounds simple, and it is. The hard part is keeping it up.
We’re taking these three lessons into 2027, with every client.

💬 Let’s talk about your business.`,tags:"#retrospetiva #licoes2026"},
{id:"C9",kind:"col",date:"2027-01-07",fmt:"Reel",pillar:"Novas tecnologias",photo:"retrato",
 tile:'<div class="h">O que observar no digital <mark>em 2027</mark></div>',
 title:"O que observar no digital em 2027",
 visual:"<b>Reel falado.</b> Três pontos com texto no ecrã: vídeo curto continua forte; as pessoas também perguntam a assistentes de IA, por isso o site e o Google precisam de informação clara; o perfil do Google é a montra local.",
 pt:`✨ Três coisas a observar no digital este ano.

O vídeo curto continua a ser a porta de entrada. Cada vez mais pessoas fazem perguntas a assistentes de IA, por isso informação clara no site e no Google conta mais. E o perfil do Google continua a ser a montra do negócio local.
Não é preciso fazer tudo. É preciso fazer bem o que importa.

💬 Vamos conversar sobre o seu negócio.`,
 en:`✨ Three things to watch online this year.

Short video is still the way in. More and more people ask AI assistants their questions, so clear information on your website and Google matters more. And your Google profile is still the shop window for local business.
You don’t need to do everything. You need to do what matters, well.

💬 Let’s talk about your business.`,tags:"#tendencias2027 #inteligenciaartificial"},

/* ---------- EISA pessoal (segundas) ---------- */
{id:"E1",kind:"eisa",date:"2026-11-09",fmt:"Reel",pillar:"Pessoal · regresso",photo:"retrato",
 tile:SIL+'<div class="h">Voltei. E com mais <mark>clareza</mark> do que nunca.</div>',
 title:"Voltei, e com mais clareza do que nunca",
 visual:"<b>Reel falado, 60–90 s.</b> Luz suave, fundo simples, tom leve. Roteiro:",
 slides:["Gancho: “Fiquei um tempo sem aparecer. Hoje volto com mais clareza.”","Contexto, por cima: um ano difícil, uma fase de depressão e o diagnóstico de TDAH, que ajudou a entender como funcionas.","O que mudou: voltaste a fazer o que gostavas em criança, a ouvir o que te faz bem, e realizaste alguns sonhos.","Trabalho: “A Implement e os meus projetos seguem a todo vapor.”","O que vem: IA, tecnologia, organização e filosofia, do teu jeito."],
 flag:"Falas da tua experiência, sem conselhos clínicos. Um minuto chega; o resto da história fica contigo.",
 cap:`Voltei. E com mais clareza do que nunca.

Esse ano foi difícil. Passei por uma fase de depressão e recebi o diagnóstico de TDAH, que me ajudou a entender muita coisa sobre como eu funciono.
No meio disso, voltei a olhar pra mim: fiz de novo coisas que eu amava fazer quando era criança, ouvi o que gosto de ouvir e realizei alguns sonhos.

E o trabalho? Segue a todo vapor. 💜
Por aqui vou partilhar o que eu descubro sobre IA, tecnologia, organização e filosofia, do meu jeito.

Se você está numa fase difícil, fala com alguém. Ninguém precisa passar por isso sozinho.

💬 Bora recomeçar junto?`,tags:"#recomeço #tdah"},
{id:"E2",kind:"eisa",date:"2026-11-16",fmt:"Reel",pillar:"Gestão de tempo",photo:"retrato",
 tile:SIL+'<div class="h">Como organizo a semana com a cabeça <mark>a mil</mark></div>',
 title:"Como organizo a semana com a cabeça a mil",
 visual:"<b>Reel falado, 40–60 s</b>, luz lilás. Quatro pontos com texto no ecrã:",
 slides:["Tiro tudo da cabeça no domingo, em 15 minutos","3 prioridades por dia, não 10","Uma lista de tarefas leves pros dias de pouca energia","Blocos de 50 minutos com pausa de verdade"],
 cap:`A minha cabeça pensa em mil coisas ao mesmo tempo. Por isso, organização pra mim não é luxo, é o que me deixa criar.

O que funciona comigo: tirar tudo da cabeça no domingo, escolher só 3 prioridades por dia e ter uma lista de tarefas leves pros dias de menos energia.

No vídeo mostro como monto a minha semana. Salva pra testar no domingo.

💬 E você, como organiza a sua?`,tags:"#organizacao #rotina"},
{id:"E3",kind:"eisa",date:"2026-11-23",fmt:"Reel",pillar:"Novas apps",photo:"retrato",
 tile:SIL+'<div class="h">3 apps que <mark>organizam</mark> a minha cabeça</div>',
 title:"3 apps que organizam a minha cabeça",
 visual:"<b>Reel</b> com gravação de ecrã do teu telemóvel intercalada contigo a falar:",
 slides:["Google Agenda: blocos de tempo para cada tipo de trabalho","Todoist: tarefas e prioridades do dia","Notion: ideias, roteiros e calendário de conteúdo"],
 cap:`A minha cabeça funciona melhor quando nada fica só na memória.

Uso 3 apps todos os dias: uma pro tempo, uma pras tarefas e uma pras ideias. Nenhuma é complicada e todas têm versão gratuita.

No vídeo mostro como uso cada uma. Qual delas você já usa?

💬 Me conta nos comentários.`,tags:"#apps #produtividadedigital"},
{id:"E4",kind:"eisa",date:"2026-11-30",fmt:"Reel",pillar:"IA no dia a dia",photo:"retrato",
 tile:SIL+'<div class="h">Planejo a semana com IA em <mark>10 minutos</mark></div>',
 title:"Como uso IA para planejar a semana em 10 minutos",
 visual:"<b>Reel falado + gravação de ecrã</b> do prompt a correr num assistente de IA. Mostra o antes (lista bagunçada) e o depois (semana organizada).",
 cap:`Eu despejo tudo e a IA organiza. Depois eu reviso.

O prompt que uso toda segunda:
“Essas são as minhas tarefas da semana: [lista]. Organiza por prioridade, estima quanto tempo leva cada uma e sugere em que dia fazer, sabendo que tenho [X] horas livres por dia.”

Em 10 minutos tenho a semana no papel. A decisão final continua sendo minha.

💬 Salva e testa amanhã.`,tags:"#ia #prompt"},
{id:"E5",kind:"eisa",date:"2026-12-07",fmt:"Reel",pillar:"Pessoal · criança interior",photo:"retrato",
 tile:SIL+'<div class="h">Voltei a fazer o que eu amava <mark>aos 10 anos</mark></div>',
 title:"Voltei a fazer o que eu amava em criança",
 visual:"<b>Reel falado</b>, com 2 ou 3 cortes de ti a fazer essas coisas (ler, desenhar, ouvir música, o que for). Fecha com um sonho que realizaste este ano.",
 flag:"Escolhe tu as coisas e o sonho; a legenda tem os espaços marcados.",
 cap:`Esse ano fiz uma pergunta simples: do que eu gostava antes de ter que ser produtiva?

A resposta me levou de volta a [coisa que amavas fazer], a [outra] e a [outra]. E, no meio do caminho, realizei um sonho antigo: [sonho].

Olhar pra criança que eu fui me lembrou do que me move. E isso aparece no meu trabalho também.

💬 O que você amava fazer quando era criança?`,tags:"#criancainterior #sonhos"},
{id:"E6",kind:"eisa",date:"2026-12-14",fmt:"Reel",pillar:"Filosofia × IA",photo:"retrato",
 tile:SIL+'<div class="h">O que Sócrates perguntaria a uma <mark>IA?</mark></div>',
 title:"O que Sócrates perguntaria a uma IA?",
 visual:"<b>Reel falado, 45–60 s.</b> Ideia central: Sócrates ensinava a perguntar, não a responder. A IA dá respostas em segundos, por isso o valor passa a estar na pergunta. Fecha com um exemplo de pergunta boa vs. fraca a uma IA.",
 cap:`Sócrates passou a vida a fazer perguntas. Hoje temos uma máquina que responde a quase tudo.

E se o mais valioso agora for exatamente o que ele ensinava? Saber perguntar.
Uma pergunta vaga dá uma resposta vaga, com gente ou com IA. Uma pergunta boa muda tudo.

No vídeo mostro a diferença na prática.

💬 Qual foi a melhor pergunta que você fez esse ano?`,tags:"#filosofia #socrates"},
{id:"E7",kind:"eisa",date:"2026-12-21",fmt:"Reel",pillar:"Filosofia × tempo",photo:"retrato",
 tile:SIL+'<div class="h">Sêneca e o tempo: a vida não é <mark>curta</mark></div>',
 title:"Sêneca e o tempo: a vida não é curta",
 visual:"<b>Reel falado.</b> A ideia de Sêneca em “Sobre a brevidade da vida”: não temos pouco tempo, perdemos muito. Liga ao teu método de organização e ao fim de ano.",
 cap:`Há quase 2000 anos, Sêneca escreveu que a vida não é curta. Nós é que desperdiçamos boa parte dela.

Pensei muito nisso esse ano. Não é sobre fazer mais, é sobre escolher melhor onde o tempo vai.
Às vezes a decisão mais produtiva é parar.

💬 Onde você quer colocar o seu tempo em 2027?`,tags:"#filosofia #seneca"},
{id:"E8",kind:"eisa",date:"2026-12-28",fmt:"Carrossel",pillar:"Retrospectiva 2026",photo:"retrato",
 tile:SIL+'<div class="s">2026</div><div class="h u-mt2">o ano em que voltei <mark>pra mim</mark></div>',
 title:"Retrospectiva: 2026, o ano em que voltei pra mim",
 visual:"<b>Carrossel de 8–10 fotos</b>: retratos do ensaio e momentos do ano (sonhos realizados, lugares, coisas que voltaste a fazer). Frase curta só na primeira e na última.",
 flag:"Escolhe as fotos dos momentos e completa os sonhos na legenda.",
 cap:`2026, o ano em que voltei pra mim.

Foi um ano difícil, e também um dos mais importantes da minha vida.
Aprendi a pedir ajuda, entendi melhor como eu funciono e voltei a fazer o que eu amo.
Realizei sonhos: [sonho 1], [sonho 2], [sonho 3].

Entro em 2027 com o trabalho a todo vapor e a cabeça no lugar.

💜 Obrigada a quem esteve por perto.`,tags:"#retrospectiva2026 #sonhosrealizados"},
{id:"E9",kind:"eisa",date:"2027-01-04",fmt:"Reel",pillar:"Filosofia × IA",photo:"retrato",
 tile:SIL+'<div class="h">A IA vai <mark>pensar</mark> por nós?</div>',
 title:"A IA vai pensar por nós?",
 visual:"<b>Reel falado + ecrã.</b> A evolução da IA em 2026 em 3 frases, e a tua posição: usar a IA para pensar melhor, não para deixar de pensar. Mostra as ferramentas que usas no dia a dia (assistente de IA, NotebookLM, CapCut, Canva).",
 flag:"Confirmar antes de gravar que cada ferramenta e função continua disponível em janeiro.",
 cap:`A pergunta que mais me fazem: a IA vai pensar por nós?

A minha resposta: só se a gente deixar.
Eu uso IA todos os dias pra organizar, estudar e criar. Mas quem decide o que importa, o que é bonito e o que é verdade ainda somos nós.

Em 2027 quero usar a tecnologia pra ter mais tempo pra pensar, não menos.

💬 E você, como está usando a IA?`,tags:"#evolucaodaia #filosofia"},

/* ---------- JESS pessoal (quartas) ---------- */
{id:"J1",kind:"jess",date:"2026-11-11",fmt:"Reel",pillar:"Apresentação",pl:"Foto/vídeo da Jess",
 tile:SIL+'<div class="h">Mãe, designer e a <mark>recomeçar</mark></div>',
 title:"Mãe, designer e a recomeçar",
 visual:"<b>Reel falado, 45–60 s</b>, espontâneo, em casa. Roteiro:",
 slides:["Gancho: “Há 8 meses a minha vida mudou de forma.”","Quem sou: Jess, mãe do Bento, designer no Algarve","O recomeço: trocar de carreira e entrar no digital","O que vou partilhar aqui: design, cores, casa, viagens e a vida real de trabalhar com um bebé","Convite: “Fica por aqui.”"],
 cap:`Olá, sou a Jess. 💛

Há 8 meses tornei-me mãe do Bento, e com ele veio também uma vontade enorme de recomeçar.
Hoje trabalho com design e redes sociais para negócios locais, estou a estudar e a construir o meu caminho no digital, a partir de casa.

Por aqui vou partilhar isso tudo: o trabalho, as cores que me inspiram, a casa, as viagens e os dias que não correm como planeado.

💬 Conta-me: também estás a mudar de rumo?`,tags:"#maedobento #recomeco"},
{id:"J2",kind:"jess",date:"2026-11-18",fmt:"Reel",pillar:"Trabalhar de casa",pl:"Foto/vídeo da Jess",
 tile:SIL+'<div class="h">Trabalhar de casa com um bebé: <mark>a verdade</mark></div>',
 title:"Trabalhar de casa com um bebé de 8 meses",
 visual:"<b>Reel “um dia comigo”</b>, cortes rápidos com texto no ecrã: as sestas viram blocos de trabalho; tarefas leves com ele ao colo; o computador abre de novo quando ele dorme à noite.",
 cap:`Trabalhar de casa com um bebé não é aquela foto bonita do portátil com café ao lado. 😅

É planear o dia à volta das sestas, ter uma lista de tarefas que se fazem com uma mão e aceitar que alguns dias rendem menos.
E está tudo bem. O importante é avançar um bocadinho todos os dias.

💬 Quem também trabalha com os filhos por perto?`,tags:"#trabalharemcasa #maetrabalhadora"},
{id:"J3",kind:"jess",date:"2026-11-25",fmt:"Carrossel",pillar:"TBT · viagens",pl:"Fotos de viagem da Jess",
 tile:SIL+'<div class="s">tbt</div><div class="h u-mt2">5 lugares da Europa que <mark>não esqueço</mark></div>',
 title:"TBT: 5 lugares da Europa que não esqueço",
 visual:"<b>Carrossel de 6–8 fotos de viagem</b> da Jess. Primeira foto com o título; nas seguintes, só o nome do lugar num cantinho rosa.",
 flag:"A Jess escolhe os 5 lugares e completa a legenda com uma frase sobre cada um.",
 cap:`TBT dos lugares da Europa que mais me marcaram. ✨

1. [Lugar] — [porquê]
2. [Lugar] — [porquê]
3. [Lugar] — [porquê]
4. [Lugar] — [porquê]
5. [Lugar] — [porquê]

O que tenho mais saudades? As cores. Cada cidade tem a sua paleta, e é aí que vou buscar muita inspiração para o meu trabalho.

💬 Qual destes já visitaste?`,tags:"#tbt #viagenseuropa"},
{id:"J4",kind:"jess",date:"2026-12-02",fmt:"Reel",pillar:"Criatividade · cerâmica fria",pl:"Vídeo da Jess",
 tile:SIL+'<div class="h">Enfeites de Natal em <mark>cerâmica fria</mark></div>',
 title:"Enfeites de Natal em cerâmica fria",
 visual:"<b>Reel de processo</b>, de cima, com as mãos da Jess: amassar, moldar, pintar. Voz off ou texto no ecrã com os materiais.",
 cap:`Antes do design, eu já criava com as mãos. 🤍

A cerâmica fria foi o meu hobby durante muito tempo, e este Natal voltei a ela para fazer os enfeites cá de casa.
Só precisas de massa de cerâmica fria, um rolo, cortadores de bolachas e tinta. Deixa secar bem antes de pintar.

💬 Queres o passo a passo completo? Diz-me nos comentários.`,tags:"#ceramicafria #diynatal"},
{id:"J5",kind:"jess",date:"2026-12-09",fmt:"Reel",pillar:"Transição de carreira",pl:"Foto/vídeo da Jess",
 tile:SIL+'<div class="h">Voltei a <mark>estudar</mark> (com um bebé ao colo)</div>',
 title:"Voltei a estudar",
 visual:"<b>Reel falado</b>, à secretária. O que está a estudar (design, social media, estratégia), como encaixa o estudo no dia e porque decidiu mudar.",
 cap:`Nunca pensei voltar a estudar com um bebé em casa. E aqui estou eu. 📚

Estou a fazer formações em design, social media e estratégia de marketing, aos bocadinhos, nas horas que consigo.
Não é rápido, mas cada coisa que aprendo vai direta para o trabalho com os clientes.

💬 Estás a aprender algo novo este ano?`,tags:"#transicaodecarreira #aprendersempre"},
{id:"J6",kind:"jess",date:"2026-12-16",fmt:"Carrossel",pillar:"Looks",pl:"Fotos da Jess",
 tile:SIL+'<div class="h">3 looks para quem trabalha <mark>de casa</mark></div>',
 title:"3 looks para quem trabalha de casa",
 visual:"<b>Carrossel de fotos</b> da Jess em casa e à porta: confortável para o dia, pronto para uma videochamada, pronto para uma reunião presencial.",
 cap:`Trabalhar de casa não significa passar o dia de pijama. 😌

Três looks que uso: um para os dias calmos, um que resolve uma videochamada em 2 minutos e um para quando tenho reunião com clientes.
O truque? Uma peça com cor, mesmo nos dias mais simples.

💬 Qual é o teu look de trabalho preferido?`,tags:"#looks #estilo"},
{id:"J7",kind:"jess",date:"2026-12-23",fmt:"Reel",pillar:"Decoração",pl:"Vídeo da Jess",
 tile:SIL+'<div class="h">Mesa de Natal com o que <mark>já tens em casa</mark></div>',
 title:"Mesa de Natal com o que já tens em casa",
 visual:"<b>Reel antes e depois</b> da mesa: escolher 3 cores, juntar texturas (linho, madeira, verde natural), usar os enfeites de cerâmica fria do post de 2 dez.",
 cap:`Uma mesa de Natal bonita não precisa de compras novas. 🎄

Escolhe 3 cores, junta texturas diferentes e traz um pouco de natureza para a mesa. O resto já está em casa.
Usei os enfeites de cerâmica fria que fiz há umas semanas.

💬 Boas festas da minha casa para a tua.`,tags:"#decoracaodenatal #mesadenatal"},
{id:"J8",kind:"jess",date:"2026-12-30",fmt:"Carrossel",pillar:"Reflexão",pl:"Fotos da Jess",
 tile:SIL+'<div class="s">2026</div><div class="h u-mt2">o ano em que fui mãe e <mark>recomecei</mark></div>',
 title:"2026, o ano em que fui mãe e recomecei",
 visual:"<b>Carrossel de fotos do ano</b>: gravidez, o Bento (como combinado), a secretária, primeiros trabalhos. Frase só na primeira e na última.",
 cap:`2026 foi o ano em que me tornei mãe. E também o ano em que tive coragem de recomeçar.

Mudei de carreira, voltei a estudar e comecei a trabalhar com o que me faz feliz.
Nem tudo foi fácil, mas olho para trás com muito orgulho.

💛 Obrigada a quem acompanhou. Venha 2027.`,tags:"#retrospetiva #maternidade"},
{id:"J9",kind:"jess",date:"2027-01-06",fmt:"Reel",pillar:"Viagens",pl:"Foto/vídeo da Jess",
 tile:SIL+'<div class="h">Onde quero levar o Bento <mark>em 2027</mark></div>',
 title:"Onde quero levar o Bento em 2027",
 visual:"<b>Reel falado</b> com fotos dos destinos a passar: 3 lugares na Europa que quer visitar em família e porquê.",
 flag:"A Jess escolhe os 3 destinos.",
 cap:`Este ano a lista de viagens tem um passageiro novo. ✈️

3 lugares onde quero levar o Bento em 2027:
1. [Lugar]
2. [Lugar]
3. [Lugar]

Viajar com bebé é outra aventura, mas quero que ele cresça a conhecer o mundo, e as cores dele.

💬 Dicas de viagens com bebés são muito bem-vindas!`,tags:"#viajarcombebe #europa"},

/* ---------- COLLAB Jess × Implement (sábados) ---------- */
{id:"K1",kind:"jcol",date:"2026-11-14",fmt:"Carrossel",pillar:"Apresentação",pl:"Retrato da Jess (slide 2)",
 tile:'<div class="h">Quem dá <mark>forma</mark> às marcas da Implement?</div>',
 title:"Quem dá forma às marcas da Implement",
 visual:"<b>Carrossel de 5 slides.</b> Capa design, sem rosto; retrato da Jess no 2.º slide:",
 slides:["Capa","Retrato + “Prazer, Jess.”","O que faz: identidade visual, menus, preçários e redes sociais","O olhar dela: cor, fotografia e detalhe","“Vamos dar forma à sua marca?”"],
 pt:`✨ Quem dá forma às marcas da Implement?

A Jess é a designer da equipa. Cria identidades visuais, menus, preçários e conteúdos para negócios locais, com um olhar treinado para a cor e o detalhe.
É ela que transforma a estratégia em algo que se vê.

💬 Vamos conversar sobre o seu negócio.`,
 en:`✨ Who gives shape to Implement’s brands?

Jess is our designer. She creates visual identities, menus, price lists and content for local businesses, with a trained eye for colour and detail.
She turns strategy into something you can see.

💬 Let’s talk about your business.`,tags:"#design #equipa"},
{id:"K2",kind:"jcol",date:"2026-11-21",fmt:"Carrossel",pillar:"Design · cor",
 tile:'<div class="h">Como escolher as <mark>cores</mark> da sua marca</div>',
 title:"Como escolher as cores da sua marca",
 visual:"<b>Carrossel de 6 slides</b> com amostras de cor:",
 slides:["Capa","Comece pelo que quer que sintam (calma, energia, confiança)","Uma cor principal, uma de apoio, uma neutra","Teste no telemóvel, não só no ecrã grande","Use as mesmas cores em tudo: redes, menu, montra","“Quer ajuda a escolher? Fazemos isso consigo.”"],
 pt:`✨ As cores da sua marca dizem muito antes de dizer qualquer palavra.

Não é sobre a cor de que mais gosta, é sobre o que quer que o cliente sinta.
Deslize e veja como escolhemos paletas para negócios locais, em 5 passos simples.

💬 Vamos conversar sobre o seu negócio.`,
 en:`✨ Your brand colours speak before any word does.

It’s not about your favourite colour, it’s about what you want clients to feel.
Swipe to see how we choose palettes for local businesses, in 5 simple steps.

💬 Let’s talk about your business.`,tags:"#paletadecores #identidadevisual"},
{id:"K3",kind:"jcol",date:"2026-11-28",fmt:"Carrossel",pillar:"Negócios locais",
 tile:'<div class="h">Menus e preçários que <mark>vendem</mark></div>',
 title:"Menus e preçários que vendem: 5 dicas",
 visual:"<b>Carrossel de 7 slides</b> com exemplos ilustrados (sem marcas reais):",
 slides:["Capa","Menos opções, decisão mais rápida","Destaque o que quer vender mais","Nomes claros, descrições curtas","Preço sem símbolo e alinhado discretamente","Fotos só se forem boas","“Quer um menu novo? Fale connosco.”"],
 pt:`✨ Um menu bem desenhado vende mais, sem dizer uma palavra a mais.

Na restauração, nos serviços ou no comércio, o preçário é das peças mais vistas do negócio.
Deixamos 5 dicas que usamos sempre que desenhamos um. Guarde para rever o seu.

💬 Vamos conversar sobre o seu negócio.`,
 en:`✨ A well-designed menu sells more, without saying a word too many.

In restaurants, services or retail, the price list is one of the most-seen pieces of a business.
Here are 5 tips we always use when designing one. Save it to review yours.

💬 Let’s talk about your business.`,tags:"#menu #restauracao"},
{id:"K4",kind:"jcol",date:"2026-12-05",fmt:"Reel",pillar:"Fotografia",pl:"Vídeo da Jess",
 tile:'<div class="h">Fotos de produto com o telemóvel: <mark>4 truques</mark></div>',
 title:"Fotos de produto com o telemóvel: 4 truques",
 visual:"<b>Reel</b> com a Jess a mostrar ao vivo: luz de janela de lado, fundo neutro, limpar a lente, fotografar de cima e a 45°. Capa é só a frase.",
 pt:`✨ Não precisa de câmara profissional para ter boas fotos de produto.

Luz natural de lado, um fundo simples, a lente limpa e dois ângulos certos já mudam tudo.
A Jess mostra no vídeo como fazemos nas sessões com clientes.

💬 Vamos conversar sobre o seu negócio.`,
 en:`✨ You don’t need a professional camera for great product photos.

Side natural light, a simple background, a clean lens and two good angles change everything.
Jess shows how we do it in our client sessions.

💬 Let’s talk about your business.`,tags:"#fotografiadeproduto #dicasdefoto"},
{id:"K5",kind:"jcol",date:"2026-12-12",fmt:"Reel",pillar:"Bastidores · sessão",pl:"Vídeo da Jess",
 tile:'<div class="s">bastidores</div><div class="h u-mt2">de uma sessão para um <mark>negócio local</mark></div>',
 title:"Bastidores de uma sessão fotográfica",
 visual:"<b>Reel de bastidores</b> numa sessão com um cliente: montar a luz, escolher props com a paleta da marca, o resultado final.",
 flag:"Pedir autorização ao cliente para mostrar o espaço e o resultado.",
 pt:`✨ O que acontece numa sessão de fotos para um negócio local?

Antes de fotografar, escolhemos cores e objetos que combinam com a identidade da marca. Depois é luz, paciência e detalhe.
O resultado são imagens que parecem o negócio, não um banco de imagens.

💬 Vamos conversar sobre o seu negócio.`,
 en:`✨ What happens in a photo session for a local business?

Before shooting, we pick colours and props that match the brand identity. Then it’s light, patience and detail.
The result: images that look like the business, not stock photos.

💬 Let’s talk about your business.`,tags:"#bastidores #fotografia"},
{id:"K6",kind:"jcol",date:"2026-12-19",fmt:"Carrossel",pillar:"Design · Natal",
 tile:'<div class="h">Natal no feed sem perder a <mark>identidade</mark></div>',
 title:"Natal no feed sem perder a identidade",
 visual:"<b>Carrossel de 5 slides</b>, com exemplos de antes e depois desenhados:",
 slides:["Capa","Mantenha as suas cores; junte um só detalhe festivo","Use a sua tipografia, não letras de Natal","Mostre o seu produto em contexto de festa","“Boas festas, com a sua cara.”"],
 pt:`✨ É possível ter um feed de Natal sem parecer outra marca.

O segredo é manter as suas cores e a sua letra, e juntar só um detalhe da época.
Deslize e veja como fazemos com os nossos clientes.

💬 Vamos conversar sobre o seu negócio.`,
 en:`✨ You can have a festive feed without looking like another brand.

Keep your colours and type, and add just one seasonal detail.
Swipe to see how we do it for our clients.

💬 Let’s talk about your business.`,tags:"#natal #identidadevisual"},
{id:"K7",kind:"jcol",date:"2026-12-26",fmt:"Reel",pillar:"Empreender com família",pl:"Vídeo da Jess",
 tile:'<div class="h">Empreender com <mark>família</mark> por perto</div>',
 title:"Empreender com família por perto",
 visual:"<b>Reel falado</b>, a Jess à câmara num tom leve de pós-Natal: como organiza a semana com o Bento, o apoio da equipa e porque a Implement valoriza tempo e acordos claros.",
 pt:`✨ Na Implement, muitos de nós conciliam o trabalho com a família.

Por isso sabemos o valor de prazos realistas, acordos claros e uma equipa que se apoia.
É assim que trabalhamos uns com os outros e com cada cliente.

💬 Boas festas. Vamos conversar sobre o seu negócio em 2027.`,
 en:`✨ At Implement, many of us balance work and family.

That’s why we value realistic deadlines, clear agreements and a team that supports each other.
That’s how we work together, and with every client.

💬 Happy holidays. Let’s talk about your business in 2027.`,tags:"#maeempreendedora #equipa"},
{id:"K8",kind:"jcol",date:"2027-01-02",fmt:"Carrossel",pillar:"Design · renovação",
 tile:'<div class="h">Renovar a imagem em 2027 <mark>sem mudar tudo</mark></div>',
 title:"Renovar a imagem em 2027 sem mudar tudo",
 visual:"<b>Carrossel de 6 slides</b>, só design:",
 slides:["Capa","Atualize as fotos antes do logótipo","Arrume a paleta: 3 cores, não 7","Uma tipografia para títulos, outra para texto","Leve o mesmo visual ao Google, ao menu e às redes","“Quer uma revisão da sua imagem? Fazemos consigo.”"],
 pt:`✨ Ano novo não tem de significar marca nova.

Muitas vezes basta arrumar o que já existe: fotos atuais, menos cores e o mesmo visual em todo o lado.
Deixamos 4 ajustes que fazem um negócio parecer renovado sem recomeçar do zero.

💬 Vamos conversar sobre o seu negócio.`,
 en:`✨ New year doesn’t have to mean new brand.

Often it’s enough to tidy what’s there: current photos, fewer colours and the same look everywhere.
Here are 4 tweaks that make a business look refreshed without starting from scratch.

💬 Let’s talk about your business.`,tags:"#rebranding #design2027"},
{id:"K9",kind:"jcol",date:"2027-01-09",fmt:"Carrossel",pillar:"Design · educação",
 tile:'<div class="h">Identidade visual é <mark>mais</mark> do que um logótipo</div>',
 title:"Identidade visual é mais do que um logótipo",
 visual:"<b>Carrossel de 6 slides</b> com o exemplo da própria Implement (abelha, paleta, letras):",
 slides:["Capa","Logótipo e símbolo","Paleta de cores","Tipografia","Estilo de imagem","Aplicações: redes, site, menu, cartão"],
 pt:`✨ Identidade visual é muito mais do que um logótipo.

É a paleta, as letras, o estilo das fotos e a forma como tudo isto aparece em cada lugar onde o cliente o encontra.
Usamos a nossa própria marca como exemplo. Deslize.

💬 Vamos conversar sobre o seu negócio.`,
 en:`✨ Visual identity is much more than a logo.

It’s the palette, the type, the photo style and how it all shows up wherever clients find you.
We used our own brand as the example. Swipe.

💬 Let’s talk about your business.`,tags:"#identidadevisual #branding"}
];

/* ---------- helpers ---------- */
const WD=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"],MO=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"],MF=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const dt=s=>{const[y,m,d]=s.split("-").map(Number);return new Date(Date.UTC(y,m-1,d))};
const lab=s=>{const d=dt(s);return WD[d.getUTCDay()]+" · "+d.getUTCDate()+" "+MO[d.getUTCMonth()]};
const esc=s=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;");
const JBASE="#designgrafico #socialmedia #maeempreendedora #transicaodecarreira #algarve";
const PERSONAL={eisa:EBASE,jess:JBASE};
const full=p=>PERSONAL[p.kind]?p.cap+"\n\n"+PERSONAL[p.kind]+" "+p.tags:p.pt+"\n\n"+p.en+"\n\n"+BASE+" "+p.tags;
const byDate=(a,b)=>b.date.localeCompare(a.date);
const feeds={
  implement:posts.filter(p=>["imp","col","jcol"].includes(p.kind)).sort(byDate),
  eisa:posts.filter(p=>["eisa","col"].includes(p.kind)).sort(byDate),
  jess:posts.filter(p=>["jess","jcol"].includes(p.kind)).sort(byDate)
};
/* cover colour is fixed per post, chosen so the Implement grid reads as a diagonal */
const PAL=["white","lilac","dark"];
feeds.implement.forEach((p,i)=>{p.color=PAL[(Math.floor(i/3)+i%3+1)%3]});
posts.filter(p=>p.kind==="eisa").forEach(p=>p.color="photo");
/* Jess: her photos, with two soft-pink design breaks */
posts.filter(p=>p.kind==="jess").forEach(p=>p.color=["J3","J8"].includes(p.id)?"pink":"jphoto");
const jessOld=[
 {color:"pink",html:'<div class="h u-f8">Hello, I’m <mark>By Jess Design</mark></div>'},
 {color:"jphoto",html:SIL+'<div class="h u-f8">cool girls <mark>change careers</mark></div>'}];

const old=[
 {color:"lilac",html:'<div class="h u-f8">We don’t just manage. We create. <mark>with intention.</mark></div>'},
 {color:"dark",html:'<div class="h u-f9">implement</div>'},
 {color:"lilac",html:'<div class="h">implement</div>'}];

function build(name){
  const grid=document.getElementById("grid-"+name), cal=document.getElementById("cal-"+name);
  feeds[name].forEach(p=>{
    const b=document.createElement("button");
    b.className="tile "+p.color; b.dataset.id=p.id;
    b.setAttribute("aria-label",lab(p.date)+": "+p.title);
    const wm=PERSONAL[p.kind]?"":'<span class="wm">implement</span>';
    b.innerHTML=wm+(ICON[p.fmt]||"")+p.tile+'<span class="date">'+lab(p.date).split("· ")[1]+'</span>'+(["col","jcol"].includes(p.kind)?'<span class="tag">collab</span>':"");
    b.addEventListener("click",()=>go(name,p.id));
    grid.appendChild(b);
  });
  if(name==="jess")jessOld.forEach(o=>{const d=document.createElement("div");d.className="tile old "+o.color;d.setAttribute("aria-hidden","true");d.innerHTML=o.html+'<span class="date">publicado</span>';grid.appendChild(d)});
  if(name==="implement")old.forEach(o=>{const d=document.createElement("div");d.className="tile old "+o.color;d.setAttribute("aria-hidden","true");d.innerHTML=o.html+'<span class="date">publicado</span>';grid.appendChild(d)});

  let last="";
  [...feeds[name]].reverse().forEach(p=>{
    const d=dt(p.date), m=MF[d.getUTCMonth()]+" "+d.getUTCFullYear();
    if(m!==last){const h=document.createElement("h2");h.className="month";h.textContent=m;cal.appendChild(h);last=m}
    const txt=full(p), a=document.createElement("article");
    a.className="post"; a.id=name+"-"+p.id;
    const chips=['<span class="chip">'+p.pillar+'</span>','<span class="chip f">'+p.fmt+'</span>'];
    if(p.kind==="col")chips.push('<span class="chip c">Collab Izza × Implement</span>');
    if(p.kind==="jcol")chips.push('<span class="chip c">Collab Jess × Implement</span>');
    if(p.pl)chips.push('<span class="chip f">'+p.pl+'</span>');
    else if(p.photo)chips.push('<span class="chip f">Foto do ensaio: '+p.photo+'</span>');
    a.innerHTML=`<div class="post-head"><span class="d">${lab(p.date)}</span><h3>${p.title}</h3></div>
     <div class="cc-chips">${chips.join("")}</div>
     <div><p class="visual">${p.visual}</p>${p.slides?'<ol class="slides">'+p.slides.map(s=>"<li>"+s+"</li>").join("")+"</ol>":""}</div>
     ${p.flag?'<p class="flag">'+p.flag+'</p>':""}
     <details id="d-${name}-${p.id}"><summary>${PERSONAL[p.kind]?"Legenda":"Legenda PT + EN + hashtags"}</summary><pre class="copy">${esc(txt)}</pre><button class="btn" type="button">Copiar legenda</button></details>`;
    const btn=a.querySelector(".btn"),pre=a.querySelector("pre");
    btn.addEventListener("click",()=>{
      const done=()=>{btn.textContent="Copiado";setTimeout(()=>btn.textContent="Copiar legenda",1600)};
      const fb=()=>{const r=document.createRange();r.selectNodeContents(pre);const s=getSelection();s.removeAllRanges();s.addRange(r);btn.textContent="Texto selecionado, copie manualmente"};
      try{navigator.clipboard.writeText(txt).then(done,fb)}catch(e){fb()}
    });
    cal.appendChild(a);
  });
}
function go(name,id){
  document.querySelectorAll("#grid-"+name+" .tile.active").forEach(t=>t.classList.remove("active"));
  const t=document.querySelector(`#grid-${name} [data-id="${id}"]`); if(t)t.classList.add("active");
  const el=document.getElementById(name+"-"+id);
  document.getElementById("d-"+name+"-"+id).open=true;
  el.classList.add("flash"); setTimeout(()=>el.classList.remove("flash"),1400);
  el.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});
}
build("implement"); build("eisa"); build("jess");
function sizeTiles(){document.querySelectorAll(".grid").forEach(g=>{const w=(g.clientWidth-4)/3;if(w>0)g.style.setProperty("--u",(w/100)+"px")})}
try{const ro=new ResizeObserver(sizeTiles);document.querySelectorAll(".grid").forEach(g=>ro.observe(g))}catch(e){}
addEventListener("resize",sizeTiles);
function route(){
  const h=location.hash.slice(1), v=["eisa","jess"].includes(h)?h:"implement";
  ["implement","eisa","jess"].forEach(n=>{
    document.getElementById("view-"+n).hidden=n!==v;
    const t=document.getElementById("tab-"+n);
    if(n===v)t.setAttribute("aria-current","page");else t.removeAttribute("aria-current");
  });
}
addEventListener("hashchange",()=>{route();sizeTiles()}); route(); sizeTiles();
