// Monta a versão artefacto (claude.ai) a partir de public/: uma só página com vistas por #hash.
// Uso: node scripts/construir-artefacto.mjs   →   dist-artefacto/
// O site do Cloudflare continua a ser public/ tal como está; isto só gera uma cópia para pré-visualização.
import { readFile, writeFile, mkdir, rm, cp } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SAIDA = path.join(RAIZ, "dist-artefacto");
const ler = (f) => readFile(path.join(RAIZ, f), "utf8");

const entre = (s, a, b) => { const i = s.indexOf(a); const j = s.indexOf(b, i); if (i < 0 || j < 0) throw new Error(`Não encontrei ${a}`); return s.slice(i, j); };
const interior = (s, abre, fecha) => { const i = s.indexOf(">", s.indexOf(abre)) + 1; return s.slice(i, s.lastIndexOf(fecha)); };

// Links das páginas separadas → vistas da página única
function paraVistas(html) {
  return html
    .replace(/href="start-a-project\.html"/g, 'href="#start-a-project"')
    .replace(/href="index\.html#/g, 'href="#')
    .replace(/href="index\.html"/g, 'href="#inicio"')
    .replace(/href="(about|work|insights|contact|privacy)\.html"/g, 'href="#em-breve"');
}

const inicio = await ler("public/index.html");
const projeto = await ler("public/start-a-project.html");
const emBreve = await ler("public/about.html");

const topo = entre(inicio, '<div class="faixa"', "<main");
const rodape = entre(inicio, '<footer class="rodape">', "</body>")
  .replace('<a href="privacy.html" data-i18n="c.privacidade">Privacy policy</a>',
    '<span><a href="#pedidos" data-so-editores hidden>Pedidos recebidos</a> · <a href="privacy.html" data-i18n="c.privacidade">Privacy policy</a></span>');
const vistaInicio = interior(inicio, '<main id="conteudo"', "</main>");
const vistaProjeto = interior(projeto, '<main id="conteudo"', "</main>");
const vistaEmBreve = interior(emBreve, '<main id="conteudo"', "</main>");
const fontes = entre(inicio, '<link rel="preconnect" href="https://fonts.googleapis.com">', '<link rel="stylesheet" href="assets/css/site.css">');

const pagina = paraVistas(`<title>Website Implement</title>
<meta name="description" content="Novo website da Implement: Home e formulário Start a Project.">
<meta name="theme-color" content="#1C0F3A">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
${fontes}<link rel="stylesheet" href="assets/css/site.css">
<link rel="stylesheet" href="assets/css/artefacto.css">
<script src="assets/js/i18n.js" defer></script>
<script src="assets/js/i18n-formulario.js" defer></script>
<script src="assets/js/site.js" defer></script>
<script src="assets/js/formulario.js" type="module"></script>
<script src="assets/js/artefacto.js" type="module"></script>
<a class="saltar" href="#conteudo" data-i18n="c.saltar">Skip to content</a>

${topo}<main id="conteudo">
  <div data-vista="inicio">${vistaInicio}</div>
  <div data-vista="start-a-project" class="projeto" hidden>${vistaProjeto}</div>
  <div data-vista="em-breve" class="pagina-404" hidden>${vistaEmBreve}</div>
  <section data-vista="pedidos" class="painel-pedidos" hidden aria-labelledby="t-pedidos">
    <div class="contentor">
      <p class="legenda">Só para a equipa</p>
      <div class="painel-pedidos__cabeca">
        <h1 id="t-pedidos">Pedidos recebidos</h1>
        <button type="button" class="botao botao--secundario botao--pequeno" id="pedidos-atualizar">Atualizar</button>
      </div>
      <p class="painel-pedidos__nota">Respostas enviadas pelo formulário nesta pré-visualização. Só o dono e quem tem acesso de Editor vê esta lista. No site publicado, os pedidos ficam na base de dados D1 do Cloudflare.</p>
      <p id="pedidos-estado" class="painel-pedidos__estado" aria-live="polite"></p>
      <div id="pedidos-lista" class="painel-pedidos__lista"></div>
    </div>
  </section>
</main>

${rodape}`);

await rm(SAIDA, { recursive: true, force: true });
await mkdir(SAIDA, { recursive: true });
await cp(path.join(RAIZ, "public/assets"), path.join(SAIDA, "assets"), { recursive: true });
await cp(path.join(RAIZ, "public/favicon.svg"), path.join(SAIDA, "favicon.svg"));
await cp(path.join(RAIZ, "artefacto/artefacto.js"), path.join(SAIDA, "assets/js/artefacto.js"));
await cp(path.join(RAIZ, "artefacto/artefacto.css"), path.join(SAIDA, "assets/css/artefacto.css"));
const form = path.join(SAIDA, "assets/js/formulario.js");
await writeFile(form, (await readFile(form, "utf8")).replace('href="index.html"', 'href="#inicio"'));
await writeFile(path.join(SAIDA, "index.html"), pagina);
console.log("Artefacto montado em", SAIDA);
