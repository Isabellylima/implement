/* Implement — área da equipa: artigos do blog, autoras e portfólio (trabalhos).
   Rotas: #/ (artigos), #/novo, #/editar/<id>, #/autoras, #/trabalhos, #/trabalhos/novo, #/trabalhos/<id>.
   O conteúdo é guardado como blocos; o servidor volta a limpar tudo antes de guardar e de publicar. */

const app = document.getElementById("app");
const avisoEl = document.getElementById("aviso");
const H = { "Content-Type": "application/json", "X-Implement": "1" };
const CATEGORIAS_ARTIGO = ["Redes sociais", "Marca", "Websites", "Conteúdo", "Fotografia e vídeo", "Estratégia", "Google", "Negócios locais"];
const TIPOS_TRABALHO = [
  { id: "websites", nome: "Websites", dica: "Ecrãs do site no computador e no telemóvel, com link", modelo: ["p", "ecras", "galeria"] },
  { id: "redes", nome: "Redes sociais", dica: "Grelha de publicações, resultados", modelo: ["p", "galeria"] },
  { id: "reels", nome: "Reels e vídeo curto", dica: "Instagram, TikTok, Shorts ou ficheiro", modelo: ["video", "p"] },
  { id: "video", nome: "Vídeo e YouTube", dica: "Vídeos longos, institucionais, YouTube", modelo: ["video", "p"] },
  { id: "fotografia", nome: "Fotografia", dica: "Galeria de fotos de produto, espaço ou evento", modelo: ["p", "galeria"] },
  { id: "marca", nome: "Identidade visual", dica: "Logótipo, cores, aplicações", modelo: ["p", "img", "galeria"] },
  { id: "impressos", nome: "Impressos: cartões, flyers e menus", dica: "Fotos ou mockups das peças", modelo: ["galeria", "p"] },
  { id: "fachadas", nome: "Fachadas e sinalética", dica: "Antes e depois, fotos da loja", modelo: ["antesdepois", "p", "galeria"] },
  { id: "produto", nome: "Produto e embalagem", dica: "Embalagens, rótulos, produto", modelo: ["p", "galeria"] },
];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
const lerLocal = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } };
const gravarLocal = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem armazenamento */ } };

let autoras = [];
let sujo = false;
let editorAtual = null;
let podeVideo = false;

/* ---------- API ---------- */
async function api(caminho, opcoes = {}) {
  const r = await fetch("/api/admin/" + caminho, { credentials: "same-origin", ...opcoes, headers: { ...(opcoes.body instanceof Blob ? { "X-Implement": "1", "Content-Type": opcoes.body.type || "application/octet-stream" } : H), ...(opcoes.headers || {}) } });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401) {
    aviso("A sessão terminou. As alterações ficaram guardadas neste browser: entre outra vez noutro separador e volte a guardar.", "erro", 12000);
    const e = new Error(d.erro || "Sessão terminada"); e.estado = 401; throw e;
  }
  if (!r.ok || !d.ok) { const e = new Error(d.erro || "Não foi possível concluir."); e.estado = r.status; throw e; }
  return d;
}

let avisoTempo;
function aviso(texto, tipo = "ok", ms = 3500) {
  clearTimeout(avisoTempo);
  avisoEl.textContent = texto;
  avisoEl.dataset.tipo = tipo;
  avisoEl.hidden = false;
  avisoTempo = setTimeout(() => { avisoEl.hidden = true; }, ms);
}

/* ---------- Ficheiros: as imagens são reduzidas no browser antes de enviar ---------- */
function escolherFicheiros({ multiplo = false, aceitar = "image/jpeg,image/png,image/webp,image/gif" } = {}) {
  return new Promise((ok) => {
    const i = document.createElement("input");
    i.type = "file";
    i.accept = aceitar;
    i.multiple = multiplo;
    i.addEventListener("change", () => ok([...i.files]), { once: true });
    i.click();
  });
}
async function comprimir(ficheiro, maxLado, quadrado = false) {
  if (ficheiro.type === "image/gif") {
    if (ficheiro.size > 1300 * 1024) throw new Error("GIF demasiado grande (máx. 1,3 MB).");
    return { blob: ficheiro, largura: 1, altura: 1 };
  }
  const bmp = await createImageBitmap(ficheiro);
  let sx = 0, sy = 0, sw = bmp.width, sh = bmp.height;
  if (quadrado) { const l = Math.min(sw, sh); sx = (sw - l) / 2; sy = (sh - l) / 2; sw = sh = l; }
  for (const [lado, q] of [[maxLado, 0.86], [maxLado, 0.76], [Math.round(maxLado * 0.75), 0.76], [Math.round(maxLado * 0.55), 0.72]]) {
    const escala = Math.min(1, lado / Math.max(sw, sh));
    const c = document.createElement("canvas");
    c.width = Math.round(sw * escala); c.height = Math.round(sh * escala);
    const ctx = c.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, c.width, c.height);
    let blob = await new Promise((r) => c.toBlob(r, "image/webp", q));
    if (!blob || blob.type !== "image/webp") blob = await new Promise((r) => c.toBlob(r, "image/jpeg", q));
    if (blob.size <= 1300 * 1024) return { blob, largura: sw, altura: sh };
  }
  throw new Error("Não foi possível reduzir esta imagem. Experimente outra.");
}
async function enviarImagem(f, maxLado, quadrado) {
  const { blob, largura, altura } = await comprimir(f, maxLado, quadrado);
  const d = await api("imagens", { method: "POST", body: blob });
  return { url: d.url, largura, altura };
}
/* Uma imagem: devolve { url, largura, altura } ou null */
async function carregarImagem(maxLado = 1800, quadrado = false) {
  const [f] = await escolherFicheiros();
  if (!f) return null;
  aviso("A carregar a imagem…", "ok", 30000);
  try { const r = await enviarImagem(f, maxLado, quadrado); aviso("Imagem carregada."); return r; }
  catch (e) { aviso(e.message || "Não foi possível carregar a imagem.", "erro", 6000); return null; }
}
/* Várias imagens de uma vez (galerias) */
async function carregarImagens(maxLado = 1800) {
  const fs = await escolherFicheiros({ multiplo: true });
  const urls = [];
  for (const [i, f] of fs.entries()) {
    aviso(`A carregar ${i + 1} de ${fs.length}…`, "ok", 60000);
    try { urls.push((await enviarImagem(f, maxLado)).url); }
    catch (e) { aviso(`${f.name}: ${e.message}`, "erro", 6000); }
  }
  if (urls.length) aviso(urls.length === 1 ? "Imagem carregada." : `${urls.length} imagens carregadas.`);
  return urls;
}
async function carregarVideo() {
  const [f] = await escolherFicheiros({ aceitar: "video/mp4,video/webm" });
  if (!f) return null;
  if (f.size > 50 * 1024 * 1024) { aviso("O vídeo tem mais de 50 MB. Exporte-o mais leve (1080p, H.264) ou use um link do YouTube/Instagram.", "erro", 8000); return null; }
  aviso("A carregar o vídeo… pode demorar um pouco.", "ok", 300000);
  try { const d = await api("imagens", { method: "POST", body: f }); aviso("Vídeo carregado."); return d.url; }
  catch (e) { aviso(e.message, "erro", 8000); return null; }
}
const formatoDe = (l, a) => (!l || !a ? "horizontal" : a / l > 1.12 ? "vertical" : l / a > 1.12 ? "horizontal" : "quadrado");

/* ---------- Vídeo (o mesmo critério do servidor) ---------- */
function videoEmbed(entrada) {
  let s = String(entrada || "").trim();
  const ifr = /src\s*=\s*["']([^"']+)["']/i.exec(s);
  if (ifr) s = ifr[1];
  const bloco = /data-instgrm-permalink\s*=\s*["']([^"']+)["']|cite\s*=\s*["'](https:\/\/www\.tiktok\.com[^"']+)["']/i.exec(s);
  if (bloco) s = bloco[1] || bloco[2];
  let u;
  try { u = new URL(s.startsWith("http") ? s : "https://" + s); } catch { return null; }
  const host = u.hostname.replace(/^www\.|^m\./, "");
  const p = u.pathname.split("/").filter(Boolean);
  let id = null;
  if (host === "youtu.be") id = p[0];
  else if (["youtube.com", "youtube-nocookie.com", "music.youtube.com"].includes(host)) id = p[0] === "watch" ? u.searchParams.get("v") : ["embed", "shorts", "live", "v"].includes(p[0]) ? p[1] : null;
  if (id && /^[\w-]{6,20}$/.test(id)) return { fonte: "youtube", src: `https://www.youtube-nocookie.com/embed/${id}`, vertical: p[0] === "shorts" };
  if (host === "vimeo.com" || host === "player.vimeo.com") { const n = u.pathname.match(/(\d{5,12})/); if (n) return { fonte: "vimeo", src: `https://player.vimeo.com/video/${n[1]}` }; }
  if (host === "loom.com") { const n = u.pathname.match(/\/(?:share|embed)\/([a-f0-9]{20,40})/i); if (n) return { fonte: "loom", src: `https://www.loom.com/embed/${n[1]}` }; }
  if (host === "instagram.com") { const i = p.findIndex((x) => ["p", "reel", "reels", "tv"].includes(x)); if (i >= 0 && /^[\w-]{5,40}$/.test(p[i + 1] || "")) return { fonte: "instagram", vertical: true, src: `https://www.instagram.com/${p[i] === "reels" ? "reel" : p[i]}/${p[i + 1]}/embed/` }; }
  if (host === "tiktok.com") { const n = u.pathname.match(/\/video\/(\d{8,25})/) || u.pathname.match(/\/embed\/(?:v2\/)?(\d{8,25})/); if (n) return { fonte: "tiktok", vertical: true, src: `https://www.tiktok.com/embed/v2/${n[1]}` }; }
  return null;
}

/* ---------- Datas ---------- */
const dataCurta = (iso) => (iso ? new Date(iso).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" }) : "—");
const paraLocal = (iso) => { if (!iso) return ""; const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const deLocal = (v) => (v ? new Date(v).toISOString() : null);
function estadoDe(a) {
  if (a.estado !== "publicado") return { k: "rascunho", t: "Rascunho" };
  if (a.publicado_em && new Date(a.publicado_em) > new Date()) return { k: "agendado", t: "Agendado" };
  return { k: "publicado", t: "Publicado" };
}

/* ---------- Rotas ---------- */
async function rota() {
  if (editorAtual && sujo && location.hash !== editorAtual.hash) {
    if (!confirm("Há alterações por guardar. Sair mesmo assim?")) { history.replaceState(null, "", editorAtual.hash); return; }
  }
  sujo = false; editorAtual = null; app.onclick = null;
  const h = location.hash.replace(/^#/, "") || "/";
  const seccao = h.startsWith("/autoras") ? "autoras" : h.startsWith("/trabalhos") ? "trabalhos" : "lista";
  $$(".admin-topo__nav [data-rota]").forEach((a) => a.toggleAttribute("aria-current", a.dataset.rota === seccao));
  try {
    if (!autoras.length) autoras = (await api("autoras")).autoras;
    if (h.startsWith("/autoras")) await vistaAutoras();
    else if (h === "/trabalhos") await vistaTrabalhos();
    else if (h === "/trabalhos/novo") vistaNovoTrabalho();
    else if (h.startsWith("/trabalhos/novo/")) await editor(CFG_TRABALHO, null, h.slice(16));
    else if (h.startsWith("/trabalhos/")) await editor(CFG_TRABALHO, h.slice(11));
    else if (h === "/novo") await editor(CFG_ARTIGO, null);
    else if (h.startsWith("/editar/")) await editor(CFG_ARTIGO, h.slice(8));
    else await vistaLista();
  } catch (e) {
    if (e.estado === 401) { location.href = "/admin/login"; return; }
    app.innerHTML = `<div class="admin-vazio"><h1>Algo correu mal</h1><p>${esc(e.message)}</p><a class="botao" href="#/"><span>Voltar</span></a></div>`;
  }
  app.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", rota);
window.addEventListener("beforeunload", (ev) => { if (sujo) { ev.preventDefault(); ev.returnValue = ""; } });

/* ---------- Lista de artigos ---------- */
async function vistaLista() {
  const { artigos } = await api("artigos");
  const nomeAutora = (id) => autoras.find((a) => a.id === id)?.nome || "—";
  let filtro = sessionStorage.getItem("implement-filtro") || "todos";
  let procura = "";
  app.innerHTML = `
    <div class="admin-cabeca">
      <div><p class="legenda">Blog</p><h1>Artigos</h1></div>
      <a class="botao" href="#/novo"><span>Novo artigo</span><svg class="seta" aria-hidden="true"><use href="/assets/img/sprite.svg#seta"/></svg></a>
    </div>
    <div class="admin-filtros">
      <div class="admin-separadores" role="group" aria-label="Filtrar artigos">
        ${[["todos", "Todos"], ["publicado", "Publicados"], ["agendado", "Agendados"], ["rascunho", "Rascunhos"]].map(([k, t]) => `<button type="button" data-filtro="${k}">${t} <span></span></button>`).join("")}
      </div>
      <label class="sr-only" for="procura">Procurar</label>
      <input class="entrada admin-procura" id="procura" type="search" placeholder="Procurar por título…">
    </div>
    <ul class="admin-lista" id="lista"></ul>`;
  const desenhar = () => {
    const contagem = { todos: artigos.length, publicado: 0, agendado: 0, rascunho: 0 };
    artigos.forEach((a) => contagem[estadoDe(a).k]++);
    $$("[data-filtro]").forEach((b) => { b.setAttribute("aria-pressed", String(b.dataset.filtro === filtro)); b.querySelector("span").textContent = contagem[b.dataset.filtro]; });
    const lista = artigos.filter((a) => (filtro === "todos" || estadoDe(a).k === filtro) && (!procura || a.titulo.toLowerCase().includes(procura)));
    $("#lista").innerHTML = lista.length ? lista.map((a) => {
      const e = estadoDe(a);
      const ver = e.k === "publicado" ? `/insights/${a.slug}` : `/insights/${a.slug}?preview=1`;
      return `<li class="admin-item">
        <a class="admin-item__capa" href="#/editar/${a.id}" tabindex="-1" aria-hidden="true">${a.capa ? `<img src="${esc(a.capa)}" alt="" loading="lazy">` : '<svg class="abelha abelha--lilas" aria-hidden="true"><use href="/assets/img/sprite.svg#abelha"/></svg>'}</a>
        <div class="admin-item__texto">
          <a class="admin-item__titulo" href="#/editar/${a.id}">${esc(a.titulo)}</a>
          <p><span class="selo selo--${e.k}">${e.t}</span> ${esc(nomeAutora(a.autora_id))} · ${e.k === "rascunho" ? "editado " + dataCurta(a.atualizado_em) : dataCurta(a.publicado_em)}${a.categoria ? " · " + esc(a.categoria) : ""} · ${a.idioma.toUpperCase()}</p>
        </div>
        <div class="admin-item__acoes">
          <a href="#/editar/${a.id}">Editar</a>
          <a href="${esc(ver)}" target="_blank" rel="noopener">${e.k === "publicado" ? "Ver" : "Pré-visualizar"}</a>
          <button type="button" data-apagar="${a.id}">Apagar</button>
        </div></li>`;
    }).join("") : `<li class="admin-vazio">${artigos.length ? "Nenhum artigo corresponde a este filtro." : `<h2>Ainda não há artigos</h2><p>Escreva o primeiro: título, imagem de capa, texto, imagens e vídeos.</p><a class="botao" href="#/novo"><span>Escrever o primeiro artigo</span></a>`}</li>`;
  };
  app.onclick = async (ev) => {
    const f = ev.target.closest("[data-filtro]");
    if (f) { filtro = f.dataset.filtro; sessionStorage.setItem("implement-filtro", filtro); desenhar(); return; }
    const ap = ev.target.closest("[data-apagar]");
    if (ap) {
      const a = artigos.find((x) => x.id === ap.dataset.apagar);
      if (!confirm(`Apagar «${a.titulo}»? Esta ação não pode ser desfeita.`)) return;
      await api(`artigos/${a.id}`, { method: "DELETE" });
      artigos.splice(artigos.indexOf(a), 1);
      aviso("Artigo apagado.");
      desenhar();
    }
  };
  $("#procura").addEventListener("input", (ev) => { procura = ev.target.value.trim().toLowerCase(); desenhar(); });
  desenhar();
}

/* ---------- Portfólio: lista ---------- */
async function vistaTrabalhos() {
  const { trabalhos } = await api("trabalhos");
  let filtro = "todos";
  const nomeTipo = (id) => TIPOS_TRABALHO.find((t) => t.id === id)?.nome || id;
  app.innerHTML = `
    <div class="admin-cabeca">
      <div><p class="legenda">Portfólio</p><h1>Trabalhos</h1><p class="admin-cabeca__nota">Aparecem em <a href="/work" target="_blank" rel="noopener">heyimplement.com/work</a>, com filtros por tipo. Os destacados aparecem primeiro.</p></div>
      <a class="botao" href="#/trabalhos/novo"><span>Novo trabalho</span><svg class="seta" aria-hidden="true"><use href="/assets/img/sprite.svg#seta"/></svg></a>
    </div>
    <div class="admin-filtros"><div class="admin-separadores" role="group" aria-label="Filtrar trabalhos" id="filtros"></div></div>
    <ul class="admin-trabalhos" id="lista"></ul>`;
  const desenhar = () => {
    const usados = TIPOS_TRABALHO.filter((t) => trabalhos.some((x) => x.categorias.includes(t.id)));
    $("#filtros").innerHTML = [["todos", "Todos", trabalhos.length], ...usados.map((t) => [t.id, t.nome, trabalhos.filter((x) => x.categorias.includes(t.id)).length])]
      .map(([k, n, c]) => `<button type="button" data-filtro="${k}" aria-pressed="${k === filtro}">${esc(n)} <span>${c}</span></button>`).join("");
    const lista = trabalhos.filter((t) => filtro === "todos" || t.categorias.includes(filtro));
    $("#lista").innerHTML = lista.length ? lista.map((t) => {
      const e = estadoDe(t);
      return `<li class="admin-trabalho">
        <a class="admin-trabalho__img admin-trabalho__img--${esc(t.formato)}" href="#/trabalhos/${t.id}">${t.capa ? `<img src="${esc(t.capa)}" alt="" loading="lazy">` : '<svg class="abelha abelha--lilas" aria-hidden="true"><use href="/assets/img/sprite.svg#abelha"/></svg>'}${t.destaque ? '<span class="admin-trabalho__destaque" title="Destacado">★ Destaque</span>' : ""}</a>
        <div class="admin-trabalho__texto">
          <a class="admin-item__titulo" href="#/trabalhos/${t.id}">${esc(t.titulo)}</a>
          <p><span class="selo selo--${e.k}">${e.t}</span> ${esc([t.cliente, t.ano].filter(Boolean).join(" · "))}</p>
          <p class="admin-trabalho__tipos">${t.categorias.map((c) => `<span>${esc(nomeTipo(c))}</span>`).join("")}</p>
          <div class="admin-item__acoes"><a href="#/trabalhos/${t.id}">Editar</a><a href="/work/${esc(t.slug)}${e.k === "publicado" ? "" : "?preview=1"}" target="_blank" rel="noopener">${e.k === "publicado" ? "Ver" : "Pré-visualizar"}</a><button type="button" data-apagar="${t.id}">Apagar</button></div>
        </div></li>`;
    }).join("") : `<li class="admin-vazio"><h2>Ainda não há trabalhos</h2><p>Comece pelo tipo de trabalho: preparamos a página com os blocos certos (galeria, ecrãs do site, antes e depois, reels…).</p><a class="botao" href="#/trabalhos/novo"><span>Acrescentar o primeiro trabalho</span></a></li>`;
  };
  app.onclick = async (ev) => {
    const f = ev.target.closest("[data-filtro]");
    if (f) { filtro = f.dataset.filtro; desenhar(); return; }
    const ap = ev.target.closest("[data-apagar]");
    if (ap) {
      const t = trabalhos.find((x) => x.id === ap.dataset.apagar);
      if (!confirm(`Apagar «${t.titulo}» do portfólio? Esta ação não pode ser desfeita.`)) return;
      await api(`trabalhos/${t.id}`, { method: "DELETE" });
      trabalhos.splice(trabalhos.indexOf(t), 1);
      aviso("Trabalho apagado.");
      desenhar();
    }
  };
  desenhar();
}

function vistaNovoTrabalho() {
  app.innerHTML = `
    <p class="ed__voltar"><a href="#/trabalhos">← Trabalhos</a></p>
    <div class="admin-cabeca"><div><p class="legenda">Novo trabalho</p><h1>Que tipo de trabalho é?</h1><p class="admin-cabeca__nota">Preparamos a página com os blocos certos. Pode juntar mais tipos e mudar tudo depois.</p></div></div>
    <ul class="admin-tipos">${TIPOS_TRABALHO.map((t) => `<li><a href="#/trabalhos/novo/${t.id}"><strong>${esc(t.nome)}</strong><span>${esc(t.dica)}</span></a></li>`).join("")}</ul>`;
}

/* ---------- Autoras ---------- */
async function vistaAutoras() {
  autoras = (await api("autoras")).autoras;
  app.innerHTML = `
    <div class="admin-cabeca"><div><p class="legenda">Blog</p><h1>Autoras</h1><p class="admin-cabeca__nota">A foto, o nome e a descrição aparecem em cada artigo.</p></div></div>
    <div class="admin-autoras">${autoras.map((a) => `
      <form class="admin-autora" data-autora="${a.id}">
        <div class="admin-autora__foto"><img src="${esc(a.foto || "/favicon.svg")}" alt="Foto de ${esc(a.nome)}"><button type="button" class="botao botao--pequeno botao--secundario" data-foto><span>Trocar foto</span></button></div>
        <div class="campos">
          <div class="campo"><label class="campo__rotulo" for="n-${a.id}">Nome</label><input class="entrada" id="n-${a.id}" name="nome" value="${esc(a.nome)}" required maxlength="80"></div>
          <div class="campo"><label class="campo__rotulo" for="c-${a.id}">Função <span class="opcional">(opcional)</span></label><input class="entrada" id="c-${a.id}" name="cargo" value="${esc(a.cargo)}" maxlength="80" placeholder="ex.: Fundadora · Marketing & Comunicação"></div>
          <div class="campo campo--largo"><label class="campo__rotulo" for="b-${a.id}">Sobre a autora <span class="opcional">(opcional)</span></label><textarea class="entrada" id="b-${a.id}" name="bio" rows="3" maxlength="600" placeholder="Duas ou três frases que aparecem no fim de cada artigo.">${esc(a.bio)}</textarea></div>
        </div>
        <input type="hidden" name="foto" value="${esc(a.foto)}">
        <div class="admin-autora__acoes"><button class="botao botao--pequeno" type="submit"><span>Guardar</span></button></div>
      </form>`).join("")}
    </div>`;
  $$(".admin-autora").forEach((f) => {
    f.querySelector("[data-foto]").addEventListener("click", async () => {
      const r = await carregarImagem(640, true);
      if (!r) return;
      f.elements.foto.value = r.url;
      f.querySelector(".admin-autora__foto img").src = r.url;
      f.requestSubmit();
    });
    f.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      try {
        await api(`autoras/${f.dataset.autora}`, { method: "PUT", body: JSON.stringify({ nome: f.elements.nome.value, cargo: f.elements.cargo.value, bio: f.elements.bio.value, foto: f.elements.foto.value }) });
        autoras = (await api("autoras")).autoras;
        aviso("Autora guardada.");
      } catch (e) { aviso(e.message, "erro", 6000); }
    });
  });
}

/* ---------- Configuração dos dois editores ---------- */
const CFG_ARTIGO = {
  nome: "artigo", api: "artigos", voltar: ["#/", "Artigos"], hash: (id) => (id ? `#/editar/${id}` : "#/novo"), publico: "/insights/",
  tituloPh: "Título do artigo", resumoPh: "Resumo curto: aparece na lista de artigos, nas partilhas e no Google.",
  capaDica: "Horizontal, de preferência 1600 × 900 px ou maior",
  blocos: [["p", "Parágrafo"], ["h2", "Título"], ["h3", "Subtítulo"], ["lista", "Lista"], ["citacao", "Citação"], ["img", "Imagem"], ["galeria", "Galeria"], ["video", "Vídeo"], ["sep", "Separador"]],
  novo: () => ({ id: null, titulo: "", resumo: "", capa: "", capa_alt: "", autora_id: autoras[0]?.id, categoria: "", idioma: "pt", slug: "", estado: "rascunho", publicado_em: null, conteudo: [{ t: "p", html: "" }] }),
  lado: () => `
    <div class="ed__cartao">
      <p class="campo__rotulo">Autora</p>
      <div class="ed__autoras" role="radiogroup" aria-label="Autora">${autoras.map((x) => `<label class="ed__autora"><input type="radio" name="autora" value="${x.id}"><img src="${esc(x.foto)}" alt=""><span>${esc(x.nome)}</span></label>`).join("")}</div>
      <div class="campo"><label class="campo__rotulo" for="categoria">Categoria</label><input class="entrada" id="categoria" list="categorias" maxlength="40"><datalist id="categorias">${CATEGORIAS_ARTIGO.map((c) => `<option value="${esc(c)}">`).join("")}</datalist></div>
      ${ladoComum("/insights/", "artigo")}
    </div>`,
  preencher: (a) => {
    $("#categoria").value = a.categoria || "";
    const r = $(`input[name="autora"][value="${a.autora_id}"]`) || $('input[name="autora"]');
    if (r) r.checked = true;
  },
  recolher: (a) => ({ autora_id: $('input[name="autora"]:checked')?.value || a.autora_id, categoria: $("#categoria").value.trim() }),
  validar: (d) => {
    if (d.conteudo.some((b) => b.t === "img" && b.src && !b.alt.trim())) return "Há imagens sem descrição. Escreva uma descrição curta em cada uma antes de publicar.";
    if (d.capa && !d.capa_alt.trim()) return "Escreva a descrição da imagem de capa antes de publicar.";
    return "";
  },
  mensagens: { publicado: "Artigo publicado.", rascunho: "Rascunho guardado.", atualizar: "Atualizar artigo", apagado: "Artigo apagado.", ver: "Ver artigo ↗" },
};

const CFG_TRABALHO = {
  nome: "trabalho", api: "trabalhos", voltar: ["#/trabalhos", "Trabalhos"], hash: (id) => (id ? `#/trabalhos/${id}` : "#/trabalhos/novo"), publico: "/work/",
  tituloPh: "Nome do trabalho (ex.: Website da Tasca do Mar)", resumoPh: "Uma ou duas frases: o que foi feito, para quem e com que resultado.",
  capaDica: "É a imagem da grelha do portfólio. Pode ser horizontal, vertical (reels) ou quadrada.",
  blocos: [["p", "Texto"], ["h2", "Título"], ["lista", "Lista"], ["citacao", "Testemunho"], ["img", "Imagem"], ["galeria", "Galeria"], ["ecras", "Website (ecrãs)"], ["antesdepois", "Antes e depois"], ["video", "Vídeo / reel"], ["sep", "Separador"]],
  novo: (tipo) => {
    const t = TIPOS_TRABALHO.find((x) => x.id === tipo);
    const vazio = { p: { t: "p", html: "" }, ecras: { t: "ecras" }, galeria: { t: "galeria", imagens: [], colunas: 3 }, video: { t: "video" }, img: { t: "img" }, antesdepois: { t: "antesdepois" } };
    return { id: null, titulo: "", resumo: "", capa: "", capa_alt: "", formato: tipo === "reels" ? "vertical" : "horizontal", categorias: t ? [t.id] : [], cliente: "", ano: String(new Date().getFullYear()), local: "", link: "", destaque: false, idioma: "pt", slug: "", estado: "rascunho", publicado_em: null, conteudo: (t ? t.modelo : ["p"]).map((k) => ({ ...vazio[k] })) };
  },
  lado: () => `
    <div class="ed__cartao">
      <p class="campo__rotulo">Tipo de trabalho <span class="opcional">(escolha um ou mais)</span></p>
      <div class="ed__tipos">${TIPOS_TRABALHO.map((t) => `<label><input type="checkbox" name="cat" value="${t.id}"><span>${esc(t.nome)}</span></label>`).join("")}</div>
      <label class="ed__destaque"><input type="checkbox" id="destaque"> <span><strong>Destacar</strong> no topo do portfólio</span></label>
    </div>
    <div class="ed__cartao">
      <div class="campo"><label class="campo__rotulo" for="cliente">Cliente</label><input class="entrada" id="cliente" maxlength="100" placeholder="ex.: Tasca do Mar"></div>
      <div class="ed__par">
        <div class="campo"><label class="campo__rotulo" for="ano">Ano</label><input class="entrada" id="ano" maxlength="12" inputmode="numeric"></div>
        <div class="campo"><label class="campo__rotulo" for="local">Local</label><input class="entrada" id="local" maxlength="80" placeholder="ex.: Lagos"></div>
      </div>
      <div class="campo"><label class="campo__rotulo" for="link">Link do projeto <span class="opcional">(opcional)</span></label><input class="entrada" id="link" maxlength="300" placeholder="site ou perfil do cliente"></div>
      <div class="campo"><label class="campo__rotulo" for="formato">Formato da capa na grelha</label><select class="entrada" id="formato"><option value="horizontal">Horizontal</option><option value="vertical">Vertical (reels, stories)</option><option value="quadrado">Quadrado</option></select></div>
      ${ladoComum("/work/", "trabalho")}
    </div>`,
  preencher: (a) => {
    $$('input[name="cat"]').forEach((c) => (c.checked = (a.categorias || []).includes(c.value)));
    $("#destaque").checked = Boolean(a.destaque);
    $("#cliente").value = a.cliente || ""; $("#ano").value = a.ano || ""; $("#local").value = a.local || ""; $("#link").value = a.link || "";
    $("#formato").value = a.formato || "horizontal";
  },
  recolher: () => ({
    categorias: $$('input[name="cat"]:checked').map((c) => c.value), destaque: $("#destaque").checked,
    cliente: $("#cliente").value.trim(), ano: $("#ano").value.trim(), local: $("#local").value.trim(), link: $("#link").value.trim(), formato: $("#formato").value,
  }),
  validar: (d) => {
    if (!d.categorias.length) return "Escolha pelo menos um tipo de trabalho (ao lado).";
    if (!d.capa && !d.conteudo.some((b) => b.t === "video" && videoEmbed(b.url)?.fonte === "youtube")) return "Acrescente uma imagem de capa: é ela que aparece na grelha do portfólio.";
    return "";
  },
  aoCarregarCapa: (r) => { $("#formato").value = formatoDe(r.largura, r.altura); },
  mensagens: { publicado: "Trabalho publicado no portfólio.", rascunho: "Rascunho guardado.", atualizar: "Atualizar trabalho", apagado: "Trabalho apagado.", ver: "Ver no portfólio ↗" },
};

function ladoComum(prefixo, nome) {
  return `
    <div class="campo"><label class="campo__rotulo" for="idioma">Idioma do texto</label><select class="entrada" id="idioma"><option value="pt">Português</option><option value="en">Inglês</option></select></div>
    <div class="campo"><label class="campo__rotulo" for="data">Data de publicação</label><input class="entrada" id="data" type="datetime-local"><p class="ed__dica">Vazio = no momento em que publicar. Uma data futura agenda o ${nome}.</p></div>
    <div class="campo"><label class="campo__rotulo" for="slug">Endereço</label><div class="ed__slug"><span>${prefixo}</span><input class="entrada" id="slug" maxlength="80" placeholder="gerado-a-partir-do-titulo"></div></div>`;
}

/* ---------- Editor (artigos e trabalhos) ---------- */
const TIPOS_TEXTO = { p: "Parágrafo", h2: "Título", h3: "Subtítulo", citacao: "Citação" };
const NOMES_BLOCO = { lista: "Lista", img: "Imagem", galeria: "Galeria", ecras: "Website", antesdepois: "Antes e depois", video: "Vídeo", sep: "Separador" };

async function editor(cfg, id, tipoNovo) {
  let a = id ? (await api(`${cfg.api}/${id}`))[cfg.nome] : cfg.novo(tipoNovo);
  const chaveCopia = `implement-${cfg.nome}-${id || "novo"}`;
  const copia = lerLocal(chaveCopia);
  editorAtual = { hash: location.hash || cfg.hash(id) };

  app.innerHTML = `
    <div class="ed ed--${cfg.nome}">
      <div class="ed__principal">
        <p class="ed__voltar"><a href="${cfg.voltar[0]}">← ${cfg.voltar[1]}</a> <span class="ed__guardado" id="guardado"></span></p>
        <div class="ed__recuperar" id="recuperar" hidden>Há uma versão que não chegou a ser guardada (${copia ? new Date(copia.quando).toLocaleString("pt-PT") : ""}). <button type="button" id="usar-copia">Recuperar</button> <button type="button" id="ignorar-copia">Ignorar</button></div>
        <div class="ed__capa" id="capa"></div>
        <label class="sr-only" for="titulo">Título</label>
        <textarea class="ed__titulo" id="titulo" rows="1" maxlength="180" placeholder="${esc(cfg.tituloPh)}"></textarea>
        <label class="sr-only" for="resumo">Resumo</label>
        <textarea class="ed__resumo" id="resumo" rows="2" maxlength="400" placeholder="${esc(cfg.resumoPh)}"></textarea>
        <div class="ed__barra" role="toolbar" aria-label="Formatação e blocos">
          <div class="ed__grupo">
            <button type="button" data-cmd="bold" title="Negrito (Ctrl+B)" aria-label="Negrito"><strong>B</strong></button>
            <button type="button" data-cmd="italic" title="Itálico (Ctrl+I)" aria-label="Itálico"><em>I</em></button>
            <button type="button" data-cmd="link" title="Link (Ctrl+K)" aria-label="Link">Link</button>
            <button type="button" data-cmd="unlink" title="Tirar link" aria-label="Tirar link">Tirar link</button>
          </div>
          <div class="ed__grupo ed__grupo--inserir"><span>Inserir:</span>${cfg.blocos.map(([k, n]) => `<button type="button" data-novo="${k}">${n}</button>`).join("")}</div>
          <div class="ed__link" id="caixa-link" hidden>
            <label class="sr-only" for="link-url">Endereço do link</label>
            <input class="entrada" id="link-url" type="url" placeholder="https://… e carregue Enter">
            <button type="button" id="link-ok">Aplicar</button><button type="button" id="link-cancelar">Cancelar</button>
          </div>
        </div>
        <div class="ed__blocos" id="blocos"></div>
      </div>
      <aside class="ed__lado">
        <div class="ed__cartao">
          <p class="ed__estado">Estado: <span class="selo" id="selo"></span></p>
          <button type="button" class="botao ed__publicar" id="publicar"><span>Publicar</span></button>
          <button type="button" class="botao botao--secundario botao--pequeno" id="rascunho"><span>Guardar rascunho</span></button>
          <a class="ed__ver" id="ver" target="_blank" rel="noopener" hidden>Pré-visualizar ↗</a>
          <p class="ed__erro" id="erro" role="alert"></p>
        </div>
        ${cfg.lado()}
        ${id ? `<button type="button" class="ed__apagar" id="apagar">Apagar ${cfg.nome}</button>` : ""}
      </aside>
    </div>`;

  const blocosEl = $("#blocos");
  let ultimo = null;

  function marcar() {
    sujo = true;
    $("#guardado").textContent = "Alterações por guardar";
    clearTimeout(marcar.t);
    marcar.t = setTimeout(() => { if (document.body.contains(blocosEl) && sujo) gravarLocal(chaveCopia, { quando: Date.now(), dados: recolher() }); }, 800);
  }

  /* --- Capa --- */
  function desenharCapa() {
    $("#capa").innerHTML = a.capa
      ? `<figure><img src="${esc(a.capa)}" alt="" class="ed__capa-img--${esc(a.formato || "horizontal")}"><div class="ed__capa-acoes"><button type="button" data-capa="trocar">Trocar capa</button><button type="button" data-capa="tirar">Tirar</button></div></figure>
         <label class="sr-only" for="capa-alt">Descrição da imagem de capa</label><input class="entrada ed__capa-alt" id="capa-alt" maxlength="300" placeholder="Descreva a imagem de capa (para quem não a vê e para o Google)" value="${esc(a.capa_alt)}">`
      : `<button type="button" class="ed__capa-vazia" data-capa="trocar"><span>+ Imagem de capa</span><small>${esc(cfg.capaDica)}</small></button>`;
  }
  $("#capa").addEventListener("click", async (ev) => {
    const b = ev.target.closest("[data-capa]");
    if (!b) return;
    if (b.dataset.capa === "tirar") { a.capa = ""; a.capa_alt = ""; desenharCapa(); marcar(); return; }
    const r = await carregarImagem(2000);
    if (!r) return;
    a.capa = r.url;
    if (cfg.aoCarregarCapa) { cfg.aoCarregarCapa(r); a.formato = $("#formato").value; }
    desenharCapa(); marcar();
  });
  $("#capa").addEventListener("input", (ev) => { if (ev.target.id === "capa-alt") { a.capa_alt = ev.target.value; marcar(); } });

  /* --- Blocos --- */
  function controlos(tipo) {
    const troca = TIPOS_TEXTO[tipo] ? `<select class="bl__tipo" aria-label="Tipo de bloco">${Object.entries(TIPOS_TEXTO).map(([k, t]) => `<option value="${k}"${k === tipo ? " selected" : ""}>${t}</option>`).join("")}</select>` : `<span class="bl__nome">${NOMES_BLOCO[tipo]}</span>`;
    return `<div class="bl__ctl">${troca}<button type="button" data-bl="cima" aria-label="Subir bloco">↑</button><button type="button" data-bl="baixo" aria-label="Descer bloco">↓</button><button type="button" data-bl="apagar" aria-label="Apagar bloco">×</button></div>`;
  }
  const vaga = (campo, rotulo, src, dica = "") => `<div class="bl__vaga" data-vaga="${campo}">${src ? `<img src="${esc(src)}" alt=""><button type="button" class="bl__vaga-trocar" data-escolher="${campo}">Trocar</button>` : `<button type="button" class="bl__vaga-vazia" data-escolher="${campo}"><strong>+ ${rotulo}</strong>${dica ? `<small>${dica}</small>` : ""}</button>`}<span class="bl__vaga-rotulo">${rotulo}</span></div>`;

  function criarBloco(b) {
    const el = document.createElement("div");
    el.className = `bl bl--${b.t}`;
    el.dataset.t = b.t;
    if (b.t === "p" || b.t === "citacao") {
      el.innerHTML = `${controlos(b.t)}<div class="bl__editavel" contenteditable="true" data-ph="${b.t === "p" ? "Escreva aqui…" : "Texto da citação…"}"></div>${b.t === "citacao" ? `<input class="entrada bl__extra" data-campo="autor" placeholder="Quem disse (opcional)" value="${esc(b.autor || "")}">` : ""}`;
      $(".bl__editavel", el).innerHTML = b.html || "";
    } else if (b.t === "h2" || b.t === "h3") {
      el.innerHTML = `${controlos(b.t)}<div class="bl__editavel" contenteditable="true" data-simples data-ph="${b.t === "h2" ? "Título da secção" : "Subtítulo"}"></div>`;
      $(".bl__editavel", el).textContent = b.texto || "";
    } else if (b.t === "lista") {
      const tag = b.ordenada ? "ol" : "ul";
      el.innerHTML = `${controlos(b.t)}<label class="bl__opcao"><input type="checkbox" data-campo="ordenada"${b.ordenada ? " checked" : ""}> Numerada</label><div class="bl__editavel" contenteditable="true"><${tag}>${(b.itens?.length ? b.itens : [""]).map((x) => `<li>${x || "<br>"}</li>`).join("")}</${tag}></div>`;
    } else if (b.t === "img") {
      el.innerHTML = `${controlos(b.t)}<figure>${b.src ? `<img src="${esc(b.src)}" alt="">` : '<button type="button" class="ed__capa-vazia" data-img><span>+ Escolher imagem</span></button>'}</figure>
        <div class="bl__campos"><input class="entrada" data-campo="alt" maxlength="300" placeholder="Descrição da imagem (para acessibilidade)" value="${esc(b.alt || "")}">
        <input class="entrada" data-campo="legenda" maxlength="300" placeholder="Legenda (opcional)" value="${esc(b.legenda || "")}">
        <label class="bl__opcao"><input type="checkbox" data-campo="larga"${b.largura === "larga" ? " checked" : ""}> Mais larga que o texto</label>
        ${b.src ? '<button type="button" class="bl__trocar" data-img>Trocar imagem</button>' : ""}</div>`;
      el.dataset.src = b.src || "";
    } else if (b.t === "galeria") {
      el.dataset.imagens = JSON.stringify(b.imagens || []);
      el.innerHTML = `${controlos(b.t)}<div class="bl__galeria" data-grelha></div>
        <div class="bl__linha"><button type="button" class="bl__trocar" data-mais>+ Acrescentar imagens</button>
        <label class="bl__opcao">Colunas <select data-campo="colunas">${[2, 3, 4].map((n) => `<option${Number(b.colunas || 3) === n ? " selected" : ""}>${n}</option>`).join("")}</select></label></div>
        <input class="entrada" data-campo="legenda" maxlength="300" placeholder="Legenda da galeria (opcional)" value="${esc(b.legenda || "")}">`;
      desenharGaleria(el);
    } else if (b.t === "ecras") {
      el.dataset.desktop = b.desktop || ""; el.dataset.mobile = b.mobile || "";
      el.innerHTML = `${controlos(b.t)}<p class="bl__dica-curta">Capturas do site: aparecem dentro de um ecrã de computador e de um telemóvel.</p>
        <div class="bl__vagas bl__vagas--ecras">${vaga("desktop", "Computador", b.desktop, "captura horizontal")}${vaga("mobile", "Telemóvel", b.mobile, "captura vertical")}</div>
        <input class="entrada" data-campo="url" maxlength="300" placeholder="Endereço do site (ex.: tascadomar.pt)" value="${esc(b.url || "")}">
        <input class="entrada" data-campo="legenda" maxlength="300" placeholder="Legenda (opcional)" value="${esc(b.legenda || "")}">`;
    } else if (b.t === "antesdepois") {
      el.dataset.antes = b.antes || ""; el.dataset.depois = b.depois || "";
      el.innerHTML = `${controlos(b.t)}<div class="bl__vagas">${vaga("antes", "Antes", b.antes)}${vaga("depois", "Depois", b.depois)}</div>
        <input class="entrada" data-campo="legenda" maxlength="300" placeholder="Legenda (opcional)" value="${esc(b.legenda || "")}">`;
    } else if (b.t === "video") {
      el.dataset.ficheiro = b.ficheiro || "";
      el.innerHTML = `${controlos(b.t)}<input class="entrada" data-campo="url" placeholder="Cole o link: YouTube, Shorts, Instagram (reel), TikTok, Vimeo ou Loom" value="${esc(b.url || "")}">
        ${podeVideo ? `<div class="bl__linha"><button type="button" class="bl__trocar" data-ficheiro>${b.ficheiro ? "Trocar ficheiro de vídeo" : "ou carregar ficheiro MP4"}</button><label class="bl__opcao"><input type="checkbox" data-campo="vertical"${b.vertical ? " checked" : ""}> Vídeo vertical</label></div>` : ""}
        <div class="bl__video" data-previa></div><input class="entrada" data-campo="legenda" maxlength="300" placeholder="Legenda (opcional)" value="${esc(b.legenda || "")}">`;
      previaVideo(el);
    } else if (b.t === "sep") {
      el.innerHTML = `${controlos(b.t)}<hr>`;
    }
    return el;
  }
  function desenharGaleria(el) {
    const imgs = JSON.parse(el.dataset.imagens || "[]");
    $("[data-grelha]", el).innerHTML = imgs.length
      ? imgs.map((x, i) => `<div class="bl__galeria-item"><img src="${esc(x.src)}" alt=""><div><button type="button" data-g="esq" data-i="${i}" aria-label="Mover para trás"${i === 0 ? " disabled" : ""}>←</button><button type="button" data-g="dir" data-i="${i}" aria-label="Mover para a frente"${i === imgs.length - 1 ? " disabled" : ""}>→</button><button type="button" data-g="tirar" data-i="${i}" aria-label="Tirar imagem">×</button></div></div>`).join("")
      : '<button type="button" class="ed__capa-vazia" data-mais><span>+ Escolher imagens</span><small>Pode selecionar várias de uma vez</small></button>';
  }
  function previaVideo(el) {
    const caixa = $("[data-previa]", el);
    const ficheiro = el.dataset.ficheiro;
    const url = $('[data-campo="url"]', el).value;
    if (ficheiro && !url.trim()) {
      const vert = $('[data-campo="vertical"]', el)?.checked;
      if (caixa.dataset.src === ficheiro + vert) return;
      caixa.dataset.src = ficheiro + vert;
      caixa.innerHTML = `<div class="artigo__video-caixa artigo__video-caixa--ficheiro${vert ? " vertical" : ""}"><video src="${esc(ficheiro)}" controls playsinline preload="metadata"></video></div>`;
      return;
    }
    const v = videoEmbed(url);
    if (!url.trim()) { caixa.dataset.src = ""; caixa.innerHTML = '<p class="bl__dica">O vídeo aparece aqui.</p>'; return; }
    if (!v) { caixa.dataset.src = ""; caixa.innerHTML = '<p class="bl__dica bl__dica--erro">Não reconheço este link. Use um link do YouTube, Instagram, TikTok, Vimeo ou Loom.</p>'; return; }
    if (caixa.dataset.src === v.src) return;
    caixa.dataset.src = v.src;
    caixa.innerHTML = `<div class="artigo__video-caixa${v.vertical ? " vertical" : ""} fonte-${v.fonte}"><iframe src="${esc(v.src)}" title="Pré-visualização do vídeo" allowfullscreen></iframe></div>`;
  }
  function inserir(b, depois = ultimo, focar = true) {
    const el = criarBloco(b);
    if (depois && depois.parentNode === blocosEl) depois.after(el); else blocosEl.append(el);
    ultimo = el;
    if (focar) {
      const e = $(".bl__editavel", el) || $("input.entrada", el);
      if (e) { e.focus(); colocarCursor($("li:last-child", e) || e, false); }
    }
    marcar();
    return el;
  }
  function colocarCursor(el, inicio) {
    if (!el.isContentEditable) return;
    const r = document.createRange();
    if (el.tagName === "LI" && el.innerHTML === "<br>") { r.setStart(el, 0); r.collapse(true); }
    else { r.selectNodeContents(el); r.collapse(inicio); }
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  }
  function lerBloco(el) {
    const t = el.dataset.t;
    const ed = $(".bl__editavel", el);
    const campo = (c) => $(`[data-campo="${c}"]`, el);
    const v = (c) => campo(c)?.value || "";
    if (t === "p") return { t, html: ed.innerHTML };
    if (t === "citacao") return { t, html: ed.innerHTML, autor: v("autor") };
    if (t === "h2" || t === "h3") return { t, texto: ed.textContent.trim() };
    if (t === "lista") return { t, ordenada: campo("ordenada").checked, itens: $$("li", ed).map((li) => li.innerHTML.replace(/^<br>$/, "")) };
    if (t === "img") return { t, src: el.dataset.src, alt: v("alt"), legenda: v("legenda"), largura: campo("larga").checked ? "larga" : "normal" };
    if (t === "galeria") return { t, imagens: JSON.parse(el.dataset.imagens || "[]"), colunas: Number(v("colunas") || 3), legenda: v("legenda") };
    if (t === "ecras") return { t, desktop: el.dataset.desktop, mobile: el.dataset.mobile, url: v("url"), legenda: v("legenda") };
    if (t === "antesdepois") return { t, antes: el.dataset.antes, depois: el.dataset.depois, legenda: v("legenda") };
    if (t === "video") return { t, url: v("url"), ficheiro: el.dataset.ficheiro || "", vertical: Boolean(campo("vertical")?.checked), legenda: v("legenda") };
    return { t };
  }
  function recolher() {
    return {
      ...a, titulo: $("#titulo").value.trim(), resumo: $("#resumo").value.trim(),
      idioma: $("#idioma").value, publicado_em: deLocal($("#data").value), slug: $("#slug").value.trim(),
      ...cfg.recolher(a),
      conteudo: $$(".bl", blocosEl).map(lerBloco),
    };
  }
  function preencher(x) {
    a = { ...a, ...x };
    $("#titulo").value = a.titulo || ""; $("#resumo").value = a.resumo || "";
    $("#idioma").value = a.idioma || "pt";
    $("#data").value = paraLocal(a.publicado_em); $("#slug").value = a.slug || "";
    cfg.preencher(a);
    blocosEl.innerHTML = "";
    (a.conteudo?.length ? a.conteudo : [{ t: "p", html: "" }]).forEach((b) => blocosEl.append(criarBloco(b)));
    ultimo = blocosEl.lastElementChild;
    desenharCapa(); estadoUi(); ajustar($("#titulo")); ajustar($("#resumo"));
  }
  function estadoUi() {
    const e = estadoDe(a);
    $("#selo").className = `selo selo--${e.k}`;
    $("#selo").textContent = a.id ? e.t : "Novo";
    $("#publicar span").textContent = a.estado === "publicado" ? cfg.mensagens.atualizar : "Publicar";
    $("#rascunho span").textContent = a.estado === "publicado" ? "Passar a rascunho" : "Guardar rascunho";
    const ver = $("#ver");
    ver.hidden = !a.id;
    if (a.id) { ver.href = cfg.publico + a.slug + (e.k === "publicado" ? "" : "?preview=1"); ver.textContent = e.k === "publicado" ? cfg.mensagens.ver : "Pré-visualizar ↗"; }
  }
  const ajustar = (t) => { t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; };

  preencher(a);
  if (copia && copia.dados && (!a.atualizado_em || copia.quando > new Date(a.atualizado_em).getTime() + 2000)) {
    $("#recuperar").hidden = false;
    $("#usar-copia").addEventListener("click", () => { preencher(copia.dados); $("#recuperar").hidden = true; marcar(); });
    $("#ignorar-copia").addEventListener("click", () => { gravarLocal(chaveCopia, null); $("#recuperar").hidden = true; });
  }
  $("#guardado").textContent = a.atualizado_em ? `Guardado ${new Date(a.atualizado_em).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })}` : "";

  /* --- Eventos --- */
  const raiz = $(".ed");
  raiz.addEventListener("input", (ev) => {
    const t = ev.target;
    if (t.id === "titulo" || t.id === "resumo") ajustar(t);
    if (t.id === "formato") { a.formato = t.value; desenharCapa(); }
    const bl = t.closest(".bl");
    if (bl && bl.dataset.t === "video" && (t.dataset.campo === "url" || t.dataset.campo === "vertical")) previaVideo(bl);
    if (bl && t.dataset.campo === "ordenada") {
      const ed = $(".bl__editavel", bl);
      const velho = $("ul, ol", ed);
      const novo = document.createElement(t.checked ? "ol" : "ul");
      novo.innerHTML = velho ? velho.innerHTML : "<li><br></li>";
      ed.innerHTML = ""; ed.append(novo);
    }
    if (bl && t.classList.contains("bl__tipo")) {
      const b = lerBloco(bl);
      const html = b.html ?? esc(b.texto || "");
      const novo = t.value === "h2" || t.value === "h3" ? { t: t.value, texto: $(".bl__editavel", bl).textContent } : { t: t.value, html };
      const el = criarBloco(novo);
      bl.replaceWith(el); ultimo = el;
      $(".bl__editavel", el).focus(); colocarCursor($(".bl__editavel", el), false);
    }
    marcar();
  });
  blocosEl.addEventListener("focusin", (ev) => { const bl = ev.target.closest(".bl"); if (bl) ultimo = bl; });

  blocosEl.addEventListener("click", async (ev) => {
    const bl = ev.target.closest(".bl");
    if (!bl) return;
    ultimo = bl;
    const c = ev.target.closest("[data-bl]");
    if (c) {
      if (c.dataset.bl === "cima" && bl.previousElementSibling) bl.previousElementSibling.before(bl);
      else if (c.dataset.bl === "baixo" && bl.nextElementSibling) bl.nextElementSibling.after(bl);
      else if (c.dataset.bl === "apagar") { ultimo = bl.previousElementSibling || bl.nextElementSibling; bl.remove(); if (!blocosEl.children.length) inserir({ t: "p", html: "" }, null); }
      marcar();
      return;
    }
    if (ev.target.closest("[data-img]")) {
      const r = await carregarImagem(1800);
      if (!r) return;
      const b = lerBloco(bl); b.src = r.url;
      const el = criarBloco(b); bl.replaceWith(el); ultimo = el;
      $('[data-campo="alt"]', el).focus();
      marcar();
      return;
    }
    const esc_ = ev.target.closest("[data-escolher]");
    if (esc_) {
      const campo = esc_.dataset.escolher;
      const r = await carregarImagem(campo === "mobile" ? 1200 : 2000);
      if (!r) return;
      bl.dataset[campo] = r.url;
      const el = criarBloco(lerBloco(bl)); bl.replaceWith(el); ultimo = el;
      marcar();
      return;
    }
    if (ev.target.closest("[data-mais]")) {
      const urls = await carregarImagens(1800);
      if (!urls.length) return;
      const imgs = JSON.parse(bl.dataset.imagens || "[]").concat(urls.map((src) => ({ src, alt: "" })));
      bl.dataset.imagens = JSON.stringify(imgs);
      desenharGaleria(bl); marcar();
      return;
    }
    const g = ev.target.closest("[data-g]");
    if (g) {
      const imgs = JSON.parse(bl.dataset.imagens || "[]");
      const i = Number(g.dataset.i);
      if (g.dataset.g === "tirar") imgs.splice(i, 1);
      else { const j = g.dataset.g === "esq" ? i - 1 : i + 1; [imgs[i], imgs[j]] = [imgs[j], imgs[i]]; }
      bl.dataset.imagens = JSON.stringify(imgs);
      desenharGaleria(bl); marcar();
      return;
    }
    if (ev.target.closest("[data-ficheiro]")) {
      const url = await carregarVideo();
      if (!url) return;
      bl.dataset.ficheiro = url;
      $('[data-campo="url"]', bl).value = "";
      const el = criarBloco(lerBloco(bl)); bl.replaceWith(el); ultimo = el;
      marcar();
    }
  });

  blocosEl.addEventListener("keydown", (ev) => {
    const ed = ev.target.closest(".bl__editavel");
    if (!ed) return;
    const bl = ed.closest(".bl");
    const t = bl.dataset.t;
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "k") { ev.preventDefault(); abrirLink(); return; }
    if (ev.key === "Enter" && !ev.shiftKey) {
      if (t === "lista") {
        const s = getSelection();
        const li = s.anchorNode && (s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentElement).closest("li");
        if (li && !li.textContent.trim() && li === li.parentElement.lastElementChild) {
          ev.preventDefault();
          if (li.parentElement.children.length > 1) li.remove();
          inserir({ t: "p", html: "" }, bl);
        }
        return;
      }
      ev.preventDefault();
      if (t === "h2" || t === "h3") { inserir({ t: "p", html: "" }, bl); return; }
      const s = getSelection();
      if (!s.rangeCount) return;
      const r = s.getRangeAt(0);
      r.deleteContents();
      const resto = document.createRange();
      resto.setStart(r.endContainer, r.endOffset);
      resto.setEnd(ed, ed.childNodes.length);
      const tmp = document.createElement("div"); tmp.append(resto.extractContents());
      const novo = inserir({ t: "p", html: tmp.innerHTML.replace(/^(<br>)+/, "") }, bl);
      colocarCursor($(".bl__editavel", novo), true);
      return;
    }
    if (ev.key === "Backspace") {
      const s = getSelection();
      if (!ed.textContent.trim() && t !== "lista" && blocosEl.children.length > 1 && s.isCollapsed) {
        ev.preventDefault();
        const ant = bl.previousElementSibling;
        bl.remove(); marcar();
        const e = ant && $(".bl__editavel", ant);
        if (e) { e.focus(); colocarCursor(e, false); ultimo = ant; }
      }
    }
  });

  blocosEl.addEventListener("paste", (ev) => {
    const ed = ev.target.closest(".bl__editavel");
    if (!ed) return;
    ev.preventDefault();
    const texto = (ev.clipboardData || window.clipboardData).getData("text/plain").replace(/\r/g, "");
    const t = ed.closest(".bl").dataset.t;
    if (t !== "p") { document.execCommand("insertText", false, ed.dataset.simples !== undefined ? texto.replace(/\s*\n\s*/g, " ") : texto); return; }
    const partes = texto.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
    if (!partes.length) return;
    document.execCommand("insertText", false, partes[0].replace(/\n/g, " "));
    let depois = ed.closest(".bl");
    for (const p of partes.slice(1)) depois = inserir({ t: "p", html: esc(p).replace(/\n/g, "<br>") }, depois);
  });

  /* --- Barra --- */
  let intervalo = null;
  const barra = $(".ed__barra");
  barra.addEventListener("mousedown", (ev) => { if (ev.target.closest("[data-cmd]")) ev.preventDefault(); });
  function abrirLink() {
    const s = getSelection();
    if (!s.rangeCount || s.isCollapsed || !s.anchorNode.parentElement?.closest(".bl__editavel")) { aviso("Selecione primeiro o texto que quer transformar em link.", "erro"); return; }
    intervalo = s.getRangeAt(0).cloneRange();
    $("#caixa-link").hidden = false;
    $("#link-url").value = "";
    $("#link-url").focus();
  }
  function aplicarLink() {
    let url = $("#link-url").value.trim();
    $("#caixa-link").hidden = true;
    if (!url || !intervalo) return;
    if (!/^(https?:\/\/|mailto:|\/)/i.test(url)) url = (url.includes("@") && !url.includes("/") ? "mailto:" : "https://") + url;
    const s = getSelection(); s.removeAllRanges(); s.addRange(intervalo);
    document.execCommand("createLink", false, url);
    intervalo = null; marcar();
  }
  barra.addEventListener("click", (ev) => {
    const c = ev.target.closest("[data-cmd]");
    if (c) {
      if (c.dataset.cmd === "link") abrirLink();
      else { document.execCommand(c.dataset.cmd); marcar(); }
      return;
    }
    const n = ev.target.closest("[data-novo]");
    if (!n) return;
    const t = n.dataset.novo;
    const novo = t === "lista" ? { t, itens: [""] } : t === "h2" || t === "h3" ? { t, texto: "" } : t === "galeria" ? { t, imagens: [], colunas: 3 } : ["p", "citacao"].includes(t) ? { t, html: "" } : { t };
    const el = inserir(novo);
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    if (t === "img") $("[data-img]", el).click();
    if (t === "galeria") $("[data-mais]", el).click();
    if (t === "sep") inserir({ t: "p", html: "" }, el);
  });
  $("#link-ok").addEventListener("click", aplicarLink);
  $("#link-cancelar").addEventListener("click", () => { $("#caixa-link").hidden = true; intervalo = null; });
  $("#link-url").addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); aplicarLink(); } if (ev.key === "Escape") $("#caixa-link").hidden = true; });

  /* --- Guardar --- */
  async function guardar(estado) {
    const dados = recolher();
    dados.estado = estado;
    $("#erro").textContent = "";
    if (!dados.titulo) { $("#erro").textContent = "Escreva um título."; $("#titulo").focus(); return; }
    if (estado === "publicado") { const erro = cfg.validar(dados); if (erro) { $("#erro").textContent = erro; return; } }
    const botoes = [$("#publicar"), $("#rascunho")];
    botoes.forEach((b) => (b.disabled = true));
    try {
      const r = await api(a.id ? `${cfg.api}/${a.id}` : cfg.api, { method: a.id ? "PUT" : "POST", body: JSON.stringify(dados) });
      const novo = !a.id;
      a = { ...dados, id: r.id, slug: r.slug, estado: r.estado, publicado_em: r.publicado_em, atualizado_em: new Date().toISOString() };
      $("#slug").value = r.slug; $("#data").value = paraLocal(r.publicado_em);
      sujo = false;
      gravarLocal(chaveCopia, null);
      $("#guardado").textContent = `Guardado às ${new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}`;
      estadoUi();
      const e = estadoDe(a);
      aviso(e.k === "publicado" ? cfg.mensagens.publicado : e.k === "agendado" ? `Agendado para ${new Date(a.publicado_em).toLocaleString("pt-PT", { dateStyle: "long", timeStyle: "short" })}.` : cfg.mensagens.rascunho);
      if (novo) { editorAtual.hash = cfg.hash(r.id); history.replaceState(null, "", cfg.hash(r.id)); }
    } catch (e) {
      $("#erro").textContent = e.message;
    } finally {
      botoes.forEach((b) => (b.disabled = false));
    }
  }
  $("#publicar").addEventListener("click", () => guardar("publicado"));
  $("#rascunho").addEventListener("click", () => guardar("rascunho"));
  raiz.addEventListener("keydown", (ev) => { if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "s") { ev.preventDefault(); guardar(a.estado === "publicado" ? "publicado" : "rascunho"); } });
  $("#apagar")?.addEventListener("click", async () => {
    if (!confirm(`Apagar «${a.titulo || "este " + cfg.nome}»? Esta ação não pode ser desfeita.`)) return;
    try { await api(`${cfg.api}/${a.id}`, { method: "DELETE" }); sujo = false; gravarLocal(chaveCopia, null); aviso(cfg.mensagens.apagado); location.hash = cfg.voltar[0]; }
    catch (e) { aviso(e.message, "erro"); }
  });
}

/* ---------- Arranque ---------- */
(async () => {
  try {
    const eu = await api("eu");
    document.getElementById("conta").textContent = eu.email;
    podeVideo = Boolean(eu.video);
  } catch { location.href = "/admin/login"; return; }
  document.getElementById("sair").addEventListener("click", async () => {
    if (sujo && !confirm("Há alterações por guardar. Sair mesmo assim?")) return;
    sujo = false;
    try { await api("sair", { method: "POST", body: "{}" }); } catch { /* já sem sessão */ }
    location.href = "/admin/login";
  });
  rota();
})();
