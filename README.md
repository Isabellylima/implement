# Website Implement — heyimplement.com

Novo website da Implement com o rebranding da abelha. Corre num **Cloudflare Worker com ficheiros estáticos**:
as páginas são servidas diretamente pelo Cloudflare e o Worker só trata do formulário (`/api/*`).

## O que está feito (fase 1)

| Página | Endereço | Estado |
|---|---|---|
| Home | `/` | pronta (EN + PT) |
| Start a Project | `/start-a-project` | pronta: 6 etapas, perguntas condicionais, guarda na D1, e-mail opcional |
| Páginas «a caminho» | `/about`, `/work`, `/insights`, `/contact`, `/privacy` | placeholders com a marca, até essas páginas existirem |

Idioma: o HTML está em inglês; o português está em `public/assets/js/i18n.js` (e `i18n-formulario.js`).
O site escolhe PT automaticamente quando o browser está em português; o visitante pode mudar no botão EN | PT.
Também se pode forçar com `?lang=pt` ou `?lang=en`.

## Estrutura

```
public/                    páginas e ficheiros estáticos
  index.html               Home
  start-a-project.html     formulário
  about.html … privacy.html  páginas «a caminho»
  404.html
  _headers                 cabeçalhos de segurança
  assets/css/site.css      todo o estilo (cores e fontes do manual de identidade)
  assets/js/perguntas.js   AS PERGUNTAS DO FORMULÁRIO (usadas pelo browser e pelo Worker)
  assets/js/formulario.js  comportamento do formulário
  assets/js/i18n*.js       traduções PT
  assets/img/sprite.svg    abelha e ícones
src/worker.js              API do formulário
artefacto/ + scripts/       versão de pré-visualização no claude.ai (não vai para o Cloudflare)
schema.sql                 tabela «pedidos» da base de dados D1
test/worker.test.js        testes (npm test)
```

**Depois de mudar CSS ou JS**, correr `sh scripts/gerar.sh` (acrescenta `?v=…` aos ficheiros para os browsers não usarem versões antigas em cache).

**Para mudar uma pergunta**, altere só `public/assets/js/perguntas.js` — o formulário e a validação no servidor
atualizam-se juntos.

## Publicar

Como o domínio ainda não foi transferido, o site fica primeiro em `implement.isabellyllimas.workers.dev`.

```bash
npm install
npx wrangler login

# 1. Base de dados dos pedidos (uma só vez)
# (feito) base de dados implement-pedidos ligada em wrangler.jsonc; a tabela é criada sozinha no primeiro pedido

# 2. Publicar
npm run deploy

# 3. Confirmar
curl https://implement.isabellyllimas.workers.dev/api/saude   # → {"ok":true,"baseDeDados":true,...}
```

Ver os últimos pedidos: `npm run pedidos`.

### Com GitHub (publicação automática)

No painel do Cloudflare: **Workers & Pages → implement → Settings → Builds → Connect** ao repositório.
Cada `git push` passa a publicar sozinho. Comando de build: nenhum. Comando de deploy: `npx wrangler deploy`.

### Quando o domínio passar para o Cloudflare

1. **Domínio**: Workers & Pages → implement → Settings → Domains & Routes → adicionar `heyimplement.com` e `www.heyimplement.com`.
2. **E-mail de notificação** (cada pedido chega a info@heyimplement.com, e responder ao e-mail responde ao cliente):
   - Compute & AI → Email Service → Onboard Domain → `heyimplement.com` (acrescenta os registos SPF/DKIM).
   - Em `wrangler.jsonc`, tirar o comentário de `"send_email": [{ "name": "EMAIL" }]` e publicar.
   - O envio de e-mails exige o plano Workers Paid.
   - Atenção: se o e-mail info@heyimplement.com estiver alojado noutro serviço (Google Workspace, por exemplo), confirmar que os registos MX não são alterados.
3. Até lá, os pedidos ficam guardados na base de dados — nada se perde.

## Antes de lançar — por confirmar

- **Logótipo oficial**: o nome «implement» no cabeçalho e no rodapé é provisório (Playfair Display). O manual diz que o
  logótipo é um desenho à medida e que a Playfair nunca o substitui → enviar o SVG do logótipo (versão horizontal,
  roxo e lilás) para trocar em `.marca__nome`.
- **Abelha**: redesenhada em SVG a partir da imagem de perfil. Se houver o ficheiro vetorial original, substituir o
  `<symbol id="abelha">` em `assets/img/sprite.svg` (e `favicon.svg`).
- **Fontes**: vêm do Google Fonts. Para não depender de um serviço externo (RGPD), podem ser alojadas em
  `assets/fonts/` — basta trocar o `<link>` por `@font-face`.
- **Política de privacidade** (`/privacy/`): necessária antes de recolher dados pelo formulário. O texto deve ser
  revisto por um jurista.
- **Redes sociais**: os links do rodapé assumem `@heyimplement` em Instagram, Facebook, TikTok e YouTube — confirmar.
- **Anti-spam**: há um campo-armadilha e um tempo mínimo de preenchimento. Se aparecer spam, acrescentar Cloudflare
  Turnstile.

## Testar localmente

```bash
npm test          # testes da API (sem wrangler)
npm run dev       # site completo em http://localhost:8787 (e-mail simulado na consola)
npm run db:criar:local   # antes do primeiro dev, para criar a tabela localmente
```

## Pré-visualização no claude.ai (artefacto)

O mesmo código gera uma versão de uma só página para ver e testar no claude.ai, com o formulário a guardar as
respostas na base de dados do próprio artefacto e um painel «Pedidos recebidos» (só para o dono e editores, no rodapé).

```bash
node scripts/construir-artefacto.mjs   # gera dist-artefacto/ (não entra no Git)
```

No Cloudflare nada disto é usado: o formulário deteta que não está no claude.ai e envia para `/api/start-a-project`.

## Blog e área da equipa

- **Escrever:** `heyimplement.com/admin` → entrar com um e-mail `@heyimplement.com` (chega um link por e-mail, válido 15 min, uma vez). Sessão de 30 dias.
- **Plano de conteúdo:** `heyimplement.com/admin/conteudo` (menu Redes sociais) — feeds da Implement, da Izza e da Jess, com a copy de cada post. Os ficheiros estão em `public/admin/conteudo.*` e só abrem com sessão iniciada.
- **Artigos:** título, resumo, imagem de capa, parágrafos, títulos, listas, citações, imagens, vídeos (YouTube, Vimeo, Loom) e separadores. Rascunho, publicar ou agendar (data futura).
- **Autoras:** Isabelly Silva e Jessica Martins; foto, função e descrição editáveis em «Autoras».
- **Público:** `/insights` (lista) e `/insights/<endereço>` (artigo), gerados pelo Worker a partir da D1.
- **Imagens:** reduzidas no browser e guardadas na D1 (até 1,4 MB cada). Para usar o R2: ativar o R2 no painel, criar o bucket e acrescentar `"r2_buckets": [{ "binding": "MEDIA", "bucket_name": "implement-media" }]` em `wrangler.jsonc`.
- **Menu e rodapé dos artigos:** vêm de `src/modelo.js`; depois de mudar o menu, correr `python3 scripts/modelo.py`.
- **Testar localmente:** `node test/servidor-local.mjs` (D1 em SQLite; os e-mails de entrada ficam em `/tmp/implement-emails.jsonl`).

## Portfólio (Trabalho)

- **Acrescentar:** área da equipa → **Trabalhos** → «Novo trabalho» → escolher o tipo (websites, redes sociais, reels, vídeo, fotografia, identidade visual, impressos, fachadas, produto). A página já vem com os blocos certos.
- **Blocos:** texto, imagem, **galeria** (várias imagens de uma vez, 2–4 colunas), **website** (capturas dentro de um ecrã de computador e de telemóvel, com link), **antes e depois**, **vídeo/reel** (YouTube, Shorts, Instagram, TikTok, Vimeo, Loom), testemunho e separador.
- **Na grelha:** a capa define o formato do cartão (horizontal, vertical ou quadrado, detetado automaticamente). «Destacar» põe o trabalho no topo.
- **Público:** `/work` (grelha com filtros por tipo) e `/work/<endereço>` (página do projeto).
- **Ficheiros de vídeo (MP4):** só com R2 ativo (binding `MEDIA`); até 50 MB.

## Marcas na Home

- **Gerir:** área da equipa → **Marcas**: carregar o logótipo (PNG transparente ou JPG; o fundo liso sai automaticamente), escrever o nome, ordenar, esconder ou apagar.
- **Na Home:** secção «Marcas que trabalham connosco» logo a seguir à fita roxa; os logótipos aparecem num só tom roxo, como marca de água, e ao passar o rato crescem e mostram o nome. Sem links. Se não houver marcas visíveis, a secção não aparece.
- **Dados:** tabela `marcas` na D1; a Home lê `/api/marcas` (cache de 5 min).

## Finanças (área da equipa → Finanças)

- **Clientes:** nome, contacto, NIF; desativar em vez de apagar quando já têm valores.
- **Fixos e assinaturas:** assinaturas e custos fixos (saídas) e avenças de clientes (entradas), mensais, trimestrais ou anuais, com mês de início e, opcionalmente, de fim. Contam sozinhos em cada mês.
- **Mês a mês:** os fixos aparecem já lançados (pode ajustar o valor só daquele mês ou marcar «Não houve»); acrescentam-se os gastos variáveis e os serviços pontuais (cliente, serviço, valor). «Fechar o mês» bloqueia as alterações e guarda os totais.
- **IVA:** cada cliente, avença, serviço, custo fixo ou gasto pode ser «sem IVA» ou «com IVA» (23/13/6%). Entradas: o valor escrito é sem IVA e o IVA soma-se (cliente paga mais). Saídas: o valor escrito é o total da fatura e o IVA lá dentro é dedutível. IVA a entregar = cobrado − dedutível, por mês e por trimestre; o resultado já desconta esse IVA.
- **Painel:** resumo do mês, gráfico do ano (meses futuros = previsão: fixos + média dos últimos 3 meses de variáveis e serviços pontuais), trimestres para a declaração com exportação CSV, receita por cliente.
- **Dados:** tabelas `fin_*` na D1, valores em cêntimos (`src/financas.js`).
