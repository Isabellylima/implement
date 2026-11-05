/* Implement — editor de artigos (área da equipa).
   Rotas: #/ (lista), #/novo, #/editar/<id>, #/autoras.
   O texto é guardado como blocos (parágrafo, título, lista, citação, imagem, vídeo, separador);
   o servidor volta a limpar tudo antes de guardar e de publicar. */

const app = document.getElementById("app");
const avisoEl = document.getElementById("aviso");
const H = { "Content-Type": "application/json", "X-Implement": "1" };
const CATEGORIAS = ["Redes sociais", "Marca", "Websites", "Conteúdo", "Fotografia e vídeo", "Estratégia", "Google", "Negócios locais"];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
const lerLocal = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } };
const gravarLocal = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem armazenamento */ } };

let autoras = [];
let sujo = false;
let editorAtual = null;

/* ---------- API ---------- */
async function api(caminho, opcoes = {}) {
  const r = await fetch("/api/admin/" + caminho, { credentials: "same-origin", ...opcoes, headers: { ...(opcoes.body instanceof Blob ? { "X-Implement": "1", "Content-Type": opcoes.body.type } : H), ...(opcoes.headers || {}) } });
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

/* ---------- Imagens: reduz no browser antes de enviar ---------- */
function escolherImagem() {
  return new Promise((ok) => {
    const i = document.createElement("input");
    i.type = "file";
    i.accept = "image/jpeg,image/png,image/webp,image/gif";
    i.addEventListener("change", () => ok(i.files[0] || null), { once: true });
    i.click();
  });
}
async function comprimir(ficheiro, maxLado, quadrado = false) {
  if (ficheiro.type === "image/gif") {
    if (ficheiro.size > 1300 * 1024) throw new Error("GIF demasiado grande (máx. 1,3 MB).");
    return ficheiro;
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
    if (blob.size <= 1300 * 1024) return blob;
  }
  throw new Error("Não foi possível reduzir esta imagem. Experimente outra.");
}
async function carregarImagem(maxLado = 1800, quadrado = false) {
  const f = await escolherImagem();
  if (!f) return null;
  aviso("A carregar a imagem…", "ok", 20000);
  try {
    const blob = await comprimir(f, maxLado, quadrado);
    const d = await api("imagens", { method: "POST", body: blob });
    aviso("Imagem carregada.");
    return d.url;
  } catch (e) {
    aviso(e.message || "Não foi possível carregar a imagem.", "erro", 6000);
    return null;
  }
}

/* ---------- Vídeo (o mesmo critério do servidor) ---------- */
function videoEmbed(entrada) {
  let s = String(entrada || "").trim();
  const ifr = /src\s*=\s*["']([^"']+)["']/i.exec(s);
  if (ifr) s = ifr[1];
  let u;
  try { u = new URL(s.startsWith("http") ? s : "https://" + s); } catch { return null; }
  const host = u.hostname.replace(/^www\.|^m\./, "");
  const p = u.pathname.split("/").filter(Boolean);
  let id = null;
  if (host === "youtu.be") id = p[0];
  else if (["youtube.com", "youtube-nocookie.com", "music.youtube.com"].includes(host)) id = p[0] === "watch" ? u.searchParams.get("v") : ["embed", "shorts", "live", "v"].includes(p[0]) ? p[1] : null;
  if (id && /^[\w-]{6,20}$/.test(id)) return { src: `https://www.youtube-nocookie.com/embed/${id}`, vertical: p[0] === "shorts" };
  if (host === "vimeo.com" || host === "player.vimeo.com") { const n = u.pathname.match(/(\d{5,12})/); if (n) return { src: `https://player.vimeo.com/video/${n[1]}` }; }
  if (host === "loom.com") { const n = u.pathname.match(/\/(?:share|embed)\/([a-f0-9]{20,40})/i); if (n) return { src: `https://www.loom.com/embed/${n[1]}` }; }
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
  if (editorAtual && sujo && !location.hash.startsWith(editorAtual.hash)) {
    if (!confirm("Há alterações por guardar neste artigo. Sair mesmo assim?")) { history.replaceState(null, "", editorAtual.hash); return; }
  }
  sujo = false; editorAtual = null; app.onclick = null;
  const h = location.hash.replace(/^#/, "") || "/";
  $$(".admin-topo__nav [data-rota]").forEach((a) => a.toggleAttribute("aria-current", (a.dataset.rota === "autoras") === h.startsWith("/autoras")));
  try {
    if (!autoras.length) autoras = (await api("autoras")).autoras;
    if (h.startsWith("/autoras")) await vistaAutoras();
    else if (h === "/novo") await vistaEditor(null);
    else if (h.startsWith("/editar/")) await vistaEditor(h.slice(8));
    else await vistaLista();
  } catch (e) {
    if (e.estado === 401) { location.href = "/admin/login"; return; }
    app.innerHTML = `<div class="admin-vazio"><h1>Algo correu mal</h1><p>${esc(e.message)}</p><a class="botao" href="#/"><span>Voltar aos artigos</span></a></div>`;
  }
  app.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", rota);
window.addEventListener("beforeunload", (ev) => { if (sujo) { ev.preventDefault(); ev.returnValue = ""; } });

/* ---------- Lista ---------- */
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

/* ---------- Autoras ---------- */
async function vistaAutoras() {
  autoras = (await api("autoras")).autoras;
  app.innerHTML = `
    <div class="admin-cabeca"><div><p class="legenda">Blog</p><h1>Autoras</h1><p class="admin-cabeca__nota">A foto, o nome e a descrição aparecem em cada artigo.</p></div></div>
    <div class="admin-autoras">${autoras.map((a) => `
      <form class="admin-autora" data-autora="${a.id}">
        <div class="admin-autora__foto"><img src="${esc(a.foto || "/assets/img/sprite.svg#abelha")}" alt="Foto de ${esc(a.nome)}"><button type="button" class="botao botao--pequeno botao--secundario" data-foto><span>Trocar foto</span></button></div>
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
      const url = await carregarImagem(640, true);
      if (!url) return;
      f.elements.foto.value = url;
      f.querySelector(".admin-autora__foto img").src = url;
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

/* ---------- Editor ---------- */
const TIPOS_TEXTO = { p: "Parágrafo", h2: "Título", h3: "Subtítulo", citacao: "Citação" };

async function vistaEditor(id) {
  let a = id ? (await api(`artigos/${id}`)).artigo : {
    id: null, titulo: "", resumo: "", capa: "", capa_alt: "", autora_id: autoras[0]?.id, categoria: "", idioma: "pt", slug: "",
    estado: "rascunho", publicado_em: null, conteudo: [{ t: "p", html: "" }],
  };
  const chaveCopia = `implement-artigo-${id || "novo"}`;
  const copia = lerLocal(chaveCopia);
  editorAtual = { hash: id ? `#/editar/${id}` : "#/novo" };

  app.innerHTML = `
    <div class="ed">
      <div class="ed__principal">
        <p class="ed__voltar"><a href="#/">← Artigos</a> <span class="ed__guardado" id="guardado"></span></p>
        <div class="ed__recuperar" id="recuperar" hidden>Há uma versão deste artigo que não chegou a ser guardada (${copia ? new Date(copia.quando).toLocaleString("pt-PT") : ""}). <button type="button" id="usar-copia">Recuperar</button> <button type="button" id="ignorar-copia">Ignorar</button></div>
        <div class="ed__capa" id="capa"></div>
        <label class="sr-only" for="titulo">Título</label>
        <textarea class="ed__titulo" id="titulo" rows="1" maxlength="180" placeholder="Título do artigo"></textarea>
        <label class="sr-only" for="resumo">Resumo</label>
        <textarea class="ed__resumo" id="resumo" rows="2" maxlength="320" placeholder="Resumo curto: aparece na lista de artigos, nas partilhas e no Google."></textarea>
        <div class="ed__barra" role="toolbar" aria-label="Formatação e blocos">
          <div class="ed__grupo">
            <button type="button" data-cmd="bold" title="Negrito (Ctrl+B)" aria-label="Negrito"><strong>B</strong></button>
            <button type="button" data-cmd="italic" title="Itálico (Ctrl+I)" aria-label="Itálico"><em>I</em></button>
            <button type="button" data-cmd="link" title="Link (Ctrl+K)" aria-label="Link">Link</button>
            <button type="button" data-cmd="unlink" title="Tirar link" aria-label="Tirar link">Tirar link</button>
          </div>
          <div class="ed__grupo ed__grupo--inserir"><span>Inserir:</span>
            <button type="button" data-novo="p">Parágrafo</button>
            <button type="button" data-novo="h2">Título</button>
            <button type="button" data-novo="h3">Subtítulo</button>
            <button type="button" data-novo="lista">Lista</button>
            <button type="button" data-novo="citacao">Citação</button>
            <button type="button" data-novo="img">Imagem</button>
            <button type="button" data-novo="video">Vídeo</button>
            <button type="button" data-novo="sep">Separador</button>
          </div>
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
        <div class="ed__cartao">
          <p class="campo__rotulo">Autora</p>
          <div class="ed__autoras" role="radiogroup" aria-label="Autora">${autoras.map((x) => `<label class="ed__autora"><input type="radio" name="autora" value="${x.id}"><img src="${esc(x.foto)}" alt=""><span>${esc(x.nome)}</span></label>`).join("")}</div>
          <div class="campo"><label class="campo__rotulo" for="categoria">Categoria</label><input class="entrada" id="categoria" list="categorias" maxlength="40"><datalist id="categorias">${CATEGORIAS.map((c) => `<option value="${esc(c)}">`).join("")}</datalist></div>
          <div class="campo"><label class="campo__rotulo" for="idioma">Idioma do artigo</label><select class="entrada" id="idioma"><option value="pt">Português</option><option value="en">Inglês</option></select></div>
          <div class="campo"><label class="campo__rotulo" for="data">Data de publicação</label><input class="entrada" id="data" type="datetime-local"><p class="ed__dica">Vazio = no momento em que publicar. Uma data futura agenda o artigo.</p></div>
          <div class="campo"><label class="campo__rotulo" for="slug">Endereço</label><div class="ed__slug"><span>/insights/</span><input class="entrada" id="slug" maxlength="80" placeholder="gerado-a-partir-do-titulo"></div></div>
        </div>
        ${id ? '<button type="button" class="ed__apagar" id="apagar">Apagar artigo</button>' : ""}
      </aside>
    </div>`;

  const blocosEl = $("#blocos");
  let ultimo = null;

  function marcar() {
    sujo = true;
    $("#guardado").textContent = "Alterações por guardar";
    clearTimeout(marcar.t);
    marcar.t = setTimeout(() => { if (document.body.contains(blocosEl) && sujo) gravarLocal(chaveCopia, { quando: Date.now(), artigo: recolher() }); }, 800);
  }

  /* --- Capa --- */
  function desenharCapa() {
    $("#capa").innerHTML = a.capa
      ? `<figure><img src="${esc(a.capa)}" alt=""><div class="ed__capa-acoes"><button type="button" data-capa="trocar">Trocar capa</button><button type="button" data-capa="tirar">Tirar</button></div></figure>
         <label class="sr-only" for="capa-alt">Descrição da imagem de capa</label><input class="entrada ed__capa-alt" id="capa-alt" maxlength="300" placeholder="Descreva a imagem de capa (para quem não a vê e para o Google)" value="${esc(a.capa_alt)}">`
      : '<button type="button" class="ed__capa-vazia" data-capa="trocar"><span>+ Imagem de capa</span><small>Horizontal, de preferência 1600 × 900 px ou maior</small></button>';
  }
  $("#capa").addEventListener("click", async (ev) => {
    const b = ev.target.closest("[data-capa]");
    if (!b) return;
    if (b.dataset.capa === "tirar") { a.capa = ""; a.capa_alt = ""; desenharCapa(); marcar(); return; }
    const url = await carregarImagem(2000);
    if (url) { a.capa = url; desenharCapa(); marcar(); }
  });
  $("#capa").addEventListener("input", (ev) => { if (ev.target.id === "capa-alt") { a.capa_alt = ev.target.value; marcar(); } });

  /* --- Blocos --- */
  function controlos(tipo) {
    const troca = TIPOS_TEXTO[tipo] ? `<label class="sr-only">Tipo de bloco</label><select class="bl__tipo" aria-label="Tipo de bloco">${Object.entries(TIPOS_TEXTO).map(([k, t]) => `<option value="${k}"${k === tipo ? " selected" : ""}>${t}</option>`).join("")}</select>` : `<span class="bl__nome">${{ lista: "Lista", img: "Imagem", video: "Vídeo", sep: "Separador" }[tipo]}</span>`;
    return `<div class="bl__ctl">${troca}<button type="button" data-bl="cima" aria-label="Subir bloco">↑</button><button type="button" data-bl="baixo" aria-label="Descer bloco">↓</button><button type="button" data-bl="apagar" aria-label="Apagar bloco">×</button></div>`;
  }
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
      el.dataset.ordenada = b.ordenada ? "1" : "";
      el.innerHTML = `${controlos(b.t)}<label class="bl__opcao"><input type="checkbox" data-campo="ordenada"${b.ordenada ? " checked" : ""}> Numerada</label><div class="bl__editavel" contenteditable="true"><${tag}>${(b.itens?.length ? b.itens : [""]).map((x) => `<li>${x || "<br>"}</li>`).join("")}</${tag}></div>`;
    } else if (b.t === "img") {
      el.innerHTML = `${controlos(b.t)}<figure>${b.src ? `<img src="${esc(b.src)}" alt="">` : '<button type="button" class="ed__capa-vazia" data-img><span>+ Escolher imagem</span></button>'}</figure>
        <div class="bl__campos"><input class="entrada" data-campo="alt" maxlength="300" placeholder="Descrição da imagem (obrigatória para acessibilidade)" value="${esc(b.alt || "")}">
        <input class="entrada" data-campo="legenda" maxlength="300" placeholder="Legenda (opcional)" value="${esc(b.legenda || "")}">
        <label class="bl__opcao"><input type="checkbox" data-campo="larga"${b.largura === "larga" ? " checked" : ""}> Mais larga que o texto</label>
        ${b.src ? '<button type="button" class="bl__trocar" data-img>Trocar imagem</button>' : ""}</div>`;
      el.dataset.src = b.src || "";
    } else if (b.t === "video") {
      el.innerHTML = `${controlos(b.t)}<input class="entrada" data-campo="url" placeholder="Cole o link do YouTube, Vimeo ou Loom (ou o código de incorporação)" value="${esc(b.url || "")}">
        <div class="bl__video" data-previa></div><input class="entrada" data-campo="legenda" maxlength="300" placeholder="Legenda (opcional)" value="${esc(b.legenda || "")}">`;
      previaVideo(el);
    } else if (b.t === "sep") {
      el.innerHTML = `${controlos(b.t)}<hr>`;
    }
    return el;
  }
  function previaVideo(el) {
    const url = $('[data-campo="url"]', el).value;
    const v = videoEmbed(url);
    const caixa = $("[data-previa]", el);
    if (!url.trim()) { caixa.innerHTML = '<p class="bl__dica">O vídeo aparece aqui.</p>'; return; }
    if (!v) { caixa.innerHTML = '<p class="bl__dica bl__dica--erro">Não reconheço este link. Use um link do YouTube, Vimeo ou Loom.</p>'; return; }
    if (caixa.dataset.src === v.src) return;
    caixa.dataset.src = v.src;
    caixa.innerHTML = `<div class="artigo__video-caixa${v.vertical ? " vertical" : ""}"><iframe src="${esc(v.src)}" title="Pré-visualização do vídeo" allowfullscreen></iframe></div>`;
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
    if (el.tagName === "LI" && el.innerHTML === "<br>") { const r = document.createRange(); r.setStart(el, 0); r.collapse(true); const s = getSelection(); s.removeAllRanges(); s.addRange(r); return; }
    const r = document.createRange();
    r.selectNodeContents(el);
    r.collapse(inicio);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  }
  function lerBloco(el) {
    const t = el.dataset.t;
    const ed = $(".bl__editavel", el);
    const campo = (c) => $(`[data-campo="${c}"]`, el);
    if (t === "p") return { t, html: ed.innerHTML };
    if (t === "citacao") return { t, html: ed.innerHTML, autor: campo("autor").value };
    if (t === "h2" || t === "h3") return { t, texto: ed.textContent.trim() };
    if (t === "lista") return { t, ordenada: campo("ordenada").checked, itens: $$("li", ed).map((li) => li.innerHTML.replace(/^<br>$/, "")) };
    if (t === "img") return { t, src: el.dataset.src, alt: campo("alt").value, legenda: campo("legenda").value, largura: campo("larga").checked ? "larga" : "normal" };
    if (t === "video") return { t, url: campo("url").value, legenda: campo("legenda").value };
    return { t };
  }
  function recolher() {
    return {
      ...a, titulo: $("#titulo").value.trim(), resumo: $("#resumo").value.trim(),
      autora_id: $('input[name="autora"]:checked')?.value || a.autora_id, categoria: $("#categoria").value.trim(),
      idioma: $("#idioma").value, publicado_em: deLocal($("#data").value), slug: $("#slug").value.trim(),
      conteudo: $$(".bl", blocosEl).map(lerBloco),
    };
  }
  function preencher(x) {
    a = { ...a, ...x };
    $("#titulo").value = a.titulo; $("#resumo").value = a.resumo || "";
    $("#categoria").value = a.categoria || ""; $("#idioma").value = a.idioma || "pt";
    $("#data").value = paraLocal(a.publicado_em); $("#slug").value = a.slug || "";
    const r = $(`input[name="autora"][value="${a.autora_id}"]`) || $('input[name="autora"]');
    if (r) r.checked = true;
    blocosEl.innerHTML = "";
    ultimo = null;
    (a.conteudo?.length ? a.conteudo : [{ t: "p", html: "" }]).forEach((b) => { const el = criarBloco(b); blocosEl.append(el); });
    ultimo = blocosEl.lastElementChild;
    desenharCapa(); estadoUi(); ajustar($("#titulo")); ajustar($("#resumo"));
  }
  function estadoUi() {
    const e = estadoDe(a);
    $("#selo").className = `selo selo--${e.k}`;
    $("#selo").textContent = a.id ? e.t : "Novo";
    $("#publicar span").textContent = a.estado === "publicado" ? "Atualizar artigo" : "Publicar";
    $("#rascunho span").textContent = a.estado === "publicado" ? "Passar a rascunho" : "Guardar rascunho";
    const ver = $("#ver");
    ver.hidden = !a.id;
    if (a.id) { ver.href = e.k === "publicado" ? `/insights/${a.slug}` : `/insights/${a.slug}?preview=1`; ver.textContent = e.k === "publicado" ? "Ver artigo ↗" : "Pré-visualizar ↗"; }
  }
  const ajustar = (t) => { t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; };

  preencher(a);
  if (copia && copia.artigo && (!a.atualizado_em || copia.quando > new Date(a.atualizado_em).getTime() + 2000)) {
    $("#recuperar").hidden = false;
    $("#usar-copia").addEventListener("click", () => { preencher(copia.artigo); $("#recuperar").hidden = true; marcar(); });
    $("#ignorar-copia").addEventListener("click", () => { gravarLocal(chaveCopia, null); $("#recuperar").hidden = true; });
  }
  $("#guardado").textContent = a.atualizado_em ? `Guardado ${new Date(a.atualizado_em).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })}` : "";

  /* --- Eventos do editor --- */
  const raiz = $(".ed");
  raiz.addEventListener("input", (ev) => {
    const t = ev.target;
    if (t.id === "titulo" || t.id === "resumo") ajustar(t);
    const bl = t.closest(".bl");
    if (bl && t.dataset.campo === "url") previaVideo(bl);
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
    if (t.closest('[role="radiogroup"]') || ["categoria", "idioma", "data", "slug"].includes(t.id) || bl || t.id === "titulo" || t.id === "resumo") marcar();
  });
  blocosEl.addEventListener("focusin", (ev) => { const bl = ev.target.closest(".bl"); if (bl) ultimo = bl; });

  blocosEl.addEventListener("click", async (ev) => {
    const bl = ev.target.closest(".bl");
    if (!bl) return;
    const c = ev.target.closest("[data-bl]");
    if (c) {
      if (c.dataset.bl === "cima" && bl.previousElementSibling) bl.previousElementSibling.before(bl);
      else if (c.dataset.bl === "baixo" && bl.nextElementSibling) bl.nextElementSibling.after(bl);
      else if (c.dataset.bl === "apagar") { ultimo = bl.previousElementSibling || bl.nextElementSibling; bl.remove(); if (!blocosEl.children.length) inserir({ t: "p", html: "" }, null); }
      marcar();
      return;
    }
    if (ev.target.closest("[data-img]")) {
      const url = await carregarImagem(1800);
      if (!url) return;
      const b = lerBloco(bl); b.src = url;
      const el = criarBloco(b); bl.replaceWith(el); ultimo = el;
      $('[data-campo="alt"]', el).focus();
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
      // divide o parágrafo no cursor
      const s = getSelection();
      if (!s.rangeCount) return;
      const r = s.getRangeAt(0);
      r.deleteContents();
      const resto = document.createRange();
      resto.setStart(r.endContainer, r.endOffset);
      resto.setEnd(ed, ed.childNodes.length);
      const frag = resto.extractContents();
      const tmp = document.createElement("div"); tmp.append(frag);
      const novo = inserir({ t: "p", html: tmp.innerHTML.replace(/^(<br>)+/, "") }, bl);
      colocarCursor($(".bl__editavel", novo), true);
      return;
    }
    if (ev.key === "Backspace") {
      const s = getSelection();
      const vazio = !ed.textContent.trim() && !$("img", ed);
      if (vazio && t !== "lista" && blocosEl.children.length > 1 && s.isCollapsed) {
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
    if (n) {
      const t = n.dataset.novo;
      const novo = t === "lista" ? { t, itens: [""] } : t === "h2" || t === "h3" ? { t, texto: "" } : t === "img" || t === "video" || t === "sep" ? { t } : { t, html: "" };
      const el = inserir(novo);
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      if (t === "img") $("[data-img]", el).click();
      if (t === "sep") inserir({ t: "p", html: "" }, el);
    }
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
    if (estado === "publicado") {
      const semAlt = dados.conteudo.some((b) => b.t === "img" && b.src && !b.alt.trim());
      if (semAlt) { $("#erro").textContent = "Há imagens sem descrição. Escreva uma descrição curta em cada uma antes de publicar."; return; }
      if (dados.capa && !dados.capa_alt.trim()) { $("#erro").textContent = "Escreva a descrição da imagem de capa antes de publicar."; $("#capa-alt")?.focus(); return; }
    }
    const botoes = [$("#publicar"), $("#rascunho")];
    botoes.forEach((b) => (b.disabled = true));
    try {
      const r = await api(a.id ? `artigos/${a.id}` : "artigos", { method: a.id ? "PUT" : "POST", body: JSON.stringify(dados) });
      const novo = !a.id;
      a = { ...dados, id: r.id, slug: r.slug, estado: r.estado, publicado_em: r.publicado_em, atualizado_em: new Date().toISOString() };
      $("#slug").value = r.slug; $("#data").value = paraLocal(r.publicado_em);
      sujo = false;
      gravarLocal(chaveCopia, null);
      $("#guardado").textContent = `Guardado às ${new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}`;
      estadoUi();
      const e = estadoDe(a);
      aviso(e.k === "publicado" ? "Artigo publicado." : e.k === "agendado" ? `Artigo agendado para ${new Date(a.publicado_em).toLocaleString("pt-PT", { dateStyle: "long", timeStyle: "short" })}.` : "Rascunho guardado.");
      if (novo) { editorAtual.hash = `#/editar/${r.id}`; history.replaceState(null, "", `#/editar/${r.id}`); }
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
    if (!confirm(`Apagar «${a.titulo || "este artigo"}»? Esta ação não pode ser desfeita.`)) return;
    try { await api(`artigos/${a.id}`, { method: "DELETE" }); sujo = false; gravarLocal(chaveCopia, null); aviso("Artigo apagado."); location.hash = "#/"; }
    catch (e) { aviso(e.message, "erro"); }
  });
}

/* ---------- Arranque ---------- */
(async () => {
  try {
    const eu = await api("eu");
    document.getElementById("conta").textContent = eu.email;
  } catch { location.href = "/admin/login"; return; }
  document.getElementById("sair").addEventListener("click", async () => {
    if (sujo && !confirm("Há alterações por guardar. Sair mesmo assim?")) return;
    sujo = false;
    try { await api("sair", { method: "POST", body: "{}" }); } catch { /* já sem sessão */ }
    location.href = "/admin/login";
  });
  rota();
})();
