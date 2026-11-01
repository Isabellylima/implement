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

**Para mudar uma pergunta**, altere só `public/assets/js/perguntas.js` — o formulário e a validação no servidor
atualizam-se juntos.

## Publicar

Como o domínio ainda não foi transferido, o site fica primeiro em `implement.isabellyllimas.workers.dev`.

```bash
npm install
npx wrangler login

# 1. Base de dados dos pedidos (uma só vez)
npx wrangler d1 create implement-pedidos      # tire os comentários do bloco d1_databases em wrangler.jsonc e cole o database_id
npm run db:criar                              # cria a tabela

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
