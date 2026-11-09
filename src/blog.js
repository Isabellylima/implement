/* Implement — blog (Artigos) e área da equipa (/admin).

   Público
     GET  /insights                 lista de artigos publicados
     GET  /insights/<slug>          artigo (rascunhos só com sessão e ?preview=1)
     GET  /media/<id>.<ext>         imagens carregadas no editor

   Equipa (só e-mails @heyimplement.com; entrada por link enviado por e-mail, sem palavras-passe)
     /admin/login, /admin/entrar    páginas de entrada
     /admin/                        editor (exige sessão)
     /api/admin/*                   API do editor

   Dados na D1 (binding DB). As tabelas são criadas automaticamente.
   Imagens: no R2 se existir o binding MEDIA; senão, na própria D1 (até 1,4 MB por imagem, já comprimida no browser). */
import { CABECA, CABECALHO, RODAPE } from "./modelo.js";
import { ESQUEMA_FINANCAS, apiFinancas, migrarFinancas } from "./financas.js";

const DOMINIO = "heyimplement.com";
const SESSAO_DIAS = 30;
const LINK_MINUTOS = 15;
const LIMITE_IMAGEM_D1 = 1400 * 1024;
const LIMITE_IMAGEM_R2 = 8 * 1024 * 1024;
const LIMITE_ARTIGO = 600 * 1024;
const COOKIE = "__Host-imp";

const ESQUEMA = [
  "CREATE TABLE IF NOT EXISTS autoras (id TEXT PRIMARY KEY, nome TEXT NOT NULL, cargo TEXT NOT NULL DEFAULT '', bio TEXT NOT NULL DEFAULT '', foto TEXT NOT NULL DEFAULT '', ordem INTEGER NOT NULL DEFAULT 0);",
  "INSERT OR IGNORE INTO autoras (id, nome, foto, ordem) VALUES ('isabelly', 'Isabelly Silva', '/assets/img/autoras/isabelly.jpg', 1);",
  "INSERT OR IGNORE INTO autoras (id, nome, foto, ordem) VALUES ('jessica', 'Jessica Martins', '/assets/img/autoras/jessica.jpg', 2);",
  "CREATE TABLE IF NOT EXISTS artigos (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, titulo TEXT NOT NULL, resumo TEXT NOT NULL DEFAULT '', capa TEXT NOT NULL DEFAULT '', capa_alt TEXT NOT NULL DEFAULT '', autora_id TEXT NOT NULL, categoria TEXT NOT NULL DEFAULT '', idioma TEXT NOT NULL DEFAULT 'pt', conteudo TEXT NOT NULL DEFAULT '[]', estado TEXT NOT NULL DEFAULT 'rascunho', publicado_em TEXT, criado_em TEXT NOT NULL, atualizado_em TEXT NOT NULL, atualizado_por TEXT NOT NULL DEFAULT '');",
  "CREATE INDEX IF NOT EXISTS artigos_publicados ON artigos (estado, publicado_em DESC);",
  "CREATE TABLE IF NOT EXISTS trabalhos (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, titulo TEXT NOT NULL, resumo TEXT NOT NULL DEFAULT '', cliente TEXT NOT NULL DEFAULT '', ano TEXT NOT NULL DEFAULT '', local TEXT NOT NULL DEFAULT '', link TEXT NOT NULL DEFAULT '', categorias TEXT NOT NULL DEFAULT '[]', capa TEXT NOT NULL DEFAULT '', capa_alt TEXT NOT NULL DEFAULT '', formato TEXT NOT NULL DEFAULT 'horizontal', destaque INTEGER NOT NULL DEFAULT 0, idioma TEXT NOT NULL DEFAULT 'pt', conteudo TEXT NOT NULL DEFAULT '[]', estado TEXT NOT NULL DEFAULT 'rascunho', publicado_em TEXT, criado_em TEXT NOT NULL, atualizado_em TEXT NOT NULL, atualizado_por TEXT NOT NULL DEFAULT '');",
  "CREATE INDEX IF NOT EXISTS trabalhos_publicados ON trabalhos (estado, destaque DESC, publicado_em DESC);",
  "CREATE TABLE IF NOT EXISTS marcas (id TEXT PRIMARY KEY, nome TEXT NOT NULL, logo TEXT NOT NULL, ordem INTEGER NOT NULL DEFAULT 0, visivel INTEGER NOT NULL DEFAULT 1, criado_em TEXT NOT NULL);",
  "CREATE TABLE IF NOT EXISTS imagens (id TEXT PRIMARY KEY, tipo TEXT NOT NULL, tamanho INTEGER NOT NULL, dados TEXT, criado_em TEXT NOT NULL, criado_por TEXT NOT NULL DEFAULT '');",
  "CREATE TABLE IF NOT EXISTS acessos (hash TEXT PRIMARY KEY, email TEXT NOT NULL, expira INTEGER NOT NULL, usado INTEGER NOT NULL DEFAULT 0);",
  "CREATE TABLE IF NOT EXISTS sessoes (hash TEXT PRIMARY KEY, email TEXT NOT NULL, criada INTEGER NOT NULL, expira INTEGER NOT NULL);",
  "CREATE TABLE IF NOT EXISTS tentativas (chave TEXT NOT NULL, momento INTEGER NOT NULL);",
  "CREATE INDEX IF NOT EXISTS tentativas_chave ON tentativas (chave, momento);",
  ...ESQUEMA_FINANCAS,
].join("\n");

let esquemaPronto = false;
async function esquema(db) {
  if (esquemaPronto) return;
  await db.exec(ESQUEMA);
  await migrarFinancas(db);
  esquemaPronto = true;
}

/* ---------- Utilitários ---------- */
export const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const JSON_H = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex" };
const json = (dados, estado = 200, extra = {}) => new Response(JSON.stringify(dados), { status: estado, headers: { ...JSON_H, ...extra } });
const agora = () => new Date().toISOString();

const CSP_BASE = "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
const FRAMES = "frame-src https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com https://www.loom.com https://www.instagram.com https://www.tiktok.com; media-src 'self'";
const CABECALHOS_HTML = {
  "Content-Type": "text/html; charset=utf-8",
  "Content-Security-Policy": `${CSP_BASE}; img-src 'self' data: https://i.ytimg.com; ${FRAMES}`,
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
};

function aleatorio(bytes = 32) {
  const b = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function idCurto(n = 12) {
  const letras = "23456789abcdefghjkmnpqrstuvwxyz";
  return [...crypto.getRandomValues(new Uint8Array(n))].map((b) => letras[b % letras.length]).join("");
}
async function sha256(texto) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function cookie(request, nome) {
  const c = request.headers.get("Cookie") || "";
  for (const parte of c.split(/;\s*/)) {
    const i = parte.indexOf("=");
    if (i > 0 && parte.slice(0, i) === nome) return parte.slice(i + 1);
  }
  return null;
}
export const emailDaEquipa = (e) => new RegExp(`^[a-z0-9._%+-]+@${DOMINIO.replace(".", "\\.")}$`).test(String(e || "").trim().toLowerCase());

export function slugificar(t) {
  return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/, "");
}

/* ---------- Limpeza do texto rico (negrito, itálico, links, quebras de linha) ---------- */
const PROTOCOLO_OK = /^(https?:\/\/|mailto:|\/(?!\/)|#)/i;
const desfazer = (s) => s.replace(/&nbsp;/g, "\u00a0").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&#(\d{1,7});/g, (_, n) => String.fromCodePoint(Math.min(Number(n), 0x10ffff))).replace(/&#x([\da-f]{1,6});/gi, (_, n) => String.fromCodePoint(Math.min(parseInt(n, 16), 0x10ffff))).replace(/&amp;/g, "&");
export function limparTexto(html) {
  let s = String(html ?? "").slice(0, 20000)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|embed|svg|math|template|noscript)\b[\s\S]*?<\/\1\s*>/gi, "");
  const saida = [];
  const abertas = [];
  const re = /<\s*(\/?)\s*([a-zA-Z0-9]+)([^>]*)>|([^<]+)|(<)/g;
  let m;
  while ((m = re.exec(s))) {
    if (m[4] !== undefined) { saida.push(esc(desfazer(m[4]))); continue; }
    if (m[5] !== undefined) { saida.push("&lt;"); continue; }
    const fecho = Boolean(m[1]);
    let tag = m[2].toLowerCase();
    if (tag === "b") tag = "strong";
    if (tag === "i") tag = "em";
    if (tag === "br") { if (!fecho) saida.push("<br>"); continue; }
    if (tag === "div" || tag === "p") { if (fecho && saida.length) saida.push("<br>"); continue; }
    if (!["strong", "em", "a"].includes(tag)) continue;
    if (fecho) {
      const i = abertas.lastIndexOf(tag);
      if (i === -1) continue;
      while (abertas.length > i) saida.push(`</${abertas.pop()}>`);
      continue;
    }
    if (tag === "a") {
      const h = /href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(m[3]);
      const href = h ? desfazer(h[1] ?? h[2] ?? h[3] ?? "").trim() : "";
      if (!href || !PROTOCOLO_OK.test(href)) continue;
      const externo = /^https?:\/\//i.test(href) && !new RegExp(`^https?://(www\\.)?${DOMINIO.replace(".", "\\.")}`, "i").test(href);
      saida.push(`<a href="${esc(href)}"${externo ? ' rel="noopener" target="_blank"' : ""}>`);
    } else saida.push(`<${tag}>`);
    abertas.push(tag);
  }
  while (abertas.length) saida.push(`</${abertas.pop()}>`);
  let r = saida.join("");
  for (let i = 0; i < 3; i++) r = r.replace(/<(strong|em)>(\s*)<\/\1>/g, "$2").replace(/<a [^>]*>(\s*)<\/a>/g, "$1");
  return r.replace(/\u00a0/g, " ").replace(/^(<br>|\s)+|(<br>|\s)+$/g, "").replace(/(<br>){3,}/g, "<br><br>");
}
const textoSimples = (html) => desfazer(String(html || "").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

/* ---------- Vídeos (YouTube, Vimeo, Loom) ---------- */
export function videoEmbed(entrada) {
  let s = String(entrada || "").trim();
  const iframe = /src\s*=\s*["']([^"']+)["']/i.exec(s);
  if (iframe) s = iframe[1];
  const bloco = /data-instgrm-permalink\s*=\s*["']([^"']+)["']|cite\s*=\s*["'](https:\/\/www\.tiktok\.com[^"']+)["']/i.exec(s);
  if (bloco) s = bloco[1] || bloco[2];
  let u;
  try { u = new URL(s.startsWith("http") ? s : "https://" + s); } catch { return null; }
  const host = u.hostname.replace(/^www\.|^m\./, "");
  const p = u.pathname.split("/").filter(Boolean);
  let id = null;
  if (host === "youtu.be") id = p[0];
  else if (["youtube.com", "youtube-nocookie.com", "music.youtube.com"].includes(host)) id = p[0] === "watch" ? u.searchParams.get("v") : ["embed", "shorts", "live", "v"].includes(p[0]) ? p[1] : null;
  if (id && /^[\w-]{6,20}$/.test(id)) return { fonte: "youtube", vertical: p[0] === "shorts", src: `https://www.youtube-nocookie.com/embed/${id}`, miniatura: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` };
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const n = u.pathname.match(/(\d{5,12})/);
    if (n) return { fonte: "vimeo", vertical: false, src: `https://player.vimeo.com/video/${n[1]}` };
  }
  if (host === "loom.com") {
    const n = u.pathname.match(/\/(?:share|embed)\/([a-f0-9]{20,40})/i);
    if (n) return { fonte: "loom", vertical: false, src: `https://www.loom.com/embed/${n[1]}` };
  }
  if (host === "instagram.com") {
    const i = p.findIndex((x) => ["p", "reel", "reels", "tv"].includes(x));
    if (i >= 0 && /^[\w-]{5,40}$/.test(p[i + 1] || "")) return { fonte: "instagram", vertical: true, src: `https://www.instagram.com/${p[i] === "reels" ? "reel" : p[i]}/${p[i + 1]}/embed/` };
  }
  if (host === "tiktok.com") {
    const n = u.pathname.match(/\/video\/(\d{8,25})/) || u.pathname.match(/\/embed\/(?:v2\/)?(\d{8,25})/);
    if (n) return { fonte: "tiktok", vertical: true, src: `https://www.tiktok.com/embed/v2/${n[1]}` };
  }
  return null;
}

/* ---------- Blocos (artigos e trabalhos) ---------- */
const IMAGEM_OK = /^(\/media\/[a-z0-9]{6,32}\.(webp|jpg|png|gif)|\/assets\/img\/[\w\/.-]+\.(webp|jpg|jpeg|png|svg))$/;
const VIDEO_OK = /^\/media\/[a-z0-9]{6,32}\.(mp4|webm)$/;
const txt = (v, n = 300) => String(v ?? "").trim().slice(0, n);
const imagemLimpa = (x) => (x && IMAGEM_OK.test(String(x.src || "")) ? { src: String(x.src), alt: txt(x.alt) } : null);
export function limparBlocos(lista) {
  if (!Array.isArray(lista)) return [];
  const saida = [];
  for (const b of lista.slice(0, 400)) {
    if (!b || typeof b !== "object") continue;
    const t = String(b.t || "");
    if (t === "p" || t === "citacao") {
      const html = limparTexto(b.html);
      if (textoSimples(html)) saida.push({ t, html, ...(t === "citacao" && b.autor ? { autor: txt(b.autor, 120) } : {}) });
    } else if (t === "h2" || t === "h3") {
      const texto = textoSimples(b.texto ?? b.html).slice(0, 200);
      if (texto) saida.push({ t, texto });
    } else if (t === "lista") {
      const itens = (Array.isArray(b.itens) ? b.itens : []).map(limparTexto).filter((x) => textoSimples(x)).slice(0, 100);
      if (itens.length) saida.push({ t, ordenada: Boolean(b.ordenada), itens });
    } else if (t === "img") {
      const src = String(b.src || "");
      if (IMAGEM_OK.test(src)) saida.push({ t, src, alt: txt(b.alt), legenda: txt(b.legenda), largura: b.largura === "larga" ? "larga" : "normal" });
    } else if (t === "video") {
      const ficheiro = String(b.ficheiro || "");
      if (VIDEO_OK.test(ficheiro)) saida.push({ t, ficheiro, vertical: Boolean(b.vertical), legenda: txt(b.legenda) });
      else if (videoEmbed(b.url)) saida.push({ t, url: txt(b.url, 600), legenda: txt(b.legenda) });
    } else if (t === "galeria") {
      const imagens = (Array.isArray(b.imagens) ? b.imagens : []).map(imagemLimpa).filter(Boolean).slice(0, 60);
      if (imagens.length) saida.push({ t, imagens, colunas: [2, 3, 4].includes(Number(b.colunas)) ? Number(b.colunas) : 3, legenda: txt(b.legenda) });
    } else if (t === "ecras") {
      const desktop = IMAGEM_OK.test(String(b.desktop || "")) ? String(b.desktop) : "";
      const mobile = IMAGEM_OK.test(String(b.mobile || "")) ? String(b.mobile) : "";
      let url = txt(b.url, 300);
      if (url && !/^https?:\/\//i.test(url)) url = "https://" + url;
      if (desktop || mobile) saida.push({ t, desktop, mobile, url, legenda: txt(b.legenda) });
    } else if (t === "antesdepois") {
      const antes = IMAGEM_OK.test(String(b.antes || "")) ? String(b.antes) : "";
      const depois = IMAGEM_OK.test(String(b.depois || "")) ? String(b.depois) : "";
      if (antes && depois) saida.push({ t, antes, depois, legenda: txt(b.legenda) });
    } else if (t === "sep") saida.push({ t });
  }
  return saida;
}

const ROTULOS = {
  pt: { antes: "Antes", depois: "Depois", video: "Vídeo", imagem: "Imagem", ver: "Ver website" },
  en: { antes: "Before", depois: "After", video: "Video", imagem: "Image", ver: "Visit website" },
};
const iframeVideo = (v, titulo) => `<iframe src="${esc(v.src)}" title="${esc(titulo)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"${v.fonte === "instagram" || v.fonte === "tiktok" ? ' scrolling="no"' : ""}></iframe>`;

export function blocosHtml(blocos, { idioma = "pt", altBase = "" } = {}) {
  const R = ROTULOS[idioma === "en" ? "en" : "pt"];
  const alt = (x, n) => esc(x || (altBase ? `${altBase} — ${R.imagem.toLowerCase()} ${n}` : ""));
  const usados = new Set();
  const ancora = (texto) => { let a = slugificar(texto) || "seccao"; let n = a, i = 2; while (usados.has(n)) n = `${a}-${i++}`; usados.add(n); return n; };
  let nImg = 0;
  const legenda = (b) => (b.legenda ? `<figcaption>${esc(b.legenda)}</figcaption>` : "");
  return blocos.map((b) => {
    switch (b.t) {
      case "p": return `<p>${limparTexto(b.html)}</p>`;
      case "h2": return `<h2 id="${ancora(b.texto)}">${esc(b.texto)}</h2>`;
      case "h3": return `<h3 id="${ancora(b.texto)}">${esc(b.texto)}</h3>`;
      case "citacao": return `<blockquote><p>${limparTexto(b.html)}</p>${b.autor ? `<cite>${esc(b.autor)}</cite>` : ""}</blockquote>`;
      case "lista": { const tag = b.ordenada ? "ol" : "ul"; return `<${tag}>${b.itens.map((x) => `<li>${limparTexto(x)}</li>`).join("")}</${tag}>`; }
      case "img": return `<figure class="artigo__figura${b.largura === "larga" ? " artigo__figura--larga" : ""}"><img src="${esc(b.src)}" alt="${alt(b.alt, ++nImg)}" loading="lazy" decoding="async">${legenda(b)}</figure>`;
      case "video": {
        if (b.ficheiro) return `<figure class="artigo__video${b.vertical ? " artigo__video--vertical" : ""}"><div class="artigo__video-caixa artigo__video-caixa--ficheiro"><video src="${esc(b.ficheiro)}" controls playsinline preload="metadata"></video></div>${legenda(b)}</figure>`;
        const v = videoEmbed(b.url);
        if (!v) return "";
        return `<figure class="artigo__video${v.vertical ? " artigo__video--vertical" : ""} artigo__video--${v.fonte}"><div class="artigo__video-caixa">${iframeVideo(v, b.legenda || R.video)}</div>${legenda(b)}</figure>`;
      }
      case "galeria": return `<figure class="galeria galeria--${b.colunas}"><div class="galeria__grelha">${b.imagens.map((x) => `<img src="${esc(x.src)}" alt="${alt(x.alt, ++nImg)}" loading="lazy" decoding="async">`).join("")}</div>${legenda(b)}</figure>`;
      case "ecras": return `<figure class="ecras${b.desktop && b.mobile ? "" : " ecras--um"}">
        ${b.desktop ? `<div class="ecras__browser"><div class="ecras__barra" aria-hidden="true"><i></i><i></i><i></i><span>${esc((b.url || "").replace(/^https?:\/\//, "").replace(/\/$/, ""))}</span></div><img src="${esc(b.desktop)}" alt="${alt("", ++nImg)}" loading="lazy" decoding="async"></div>` : ""}
        ${b.mobile ? `<div class="ecras__telemovel"><img src="${esc(b.mobile)}" alt="${alt("", ++nImg)}" loading="lazy" decoding="async"></div>` : ""}
        ${b.url || b.legenda ? `<figcaption>${esc(b.legenda)}${b.url ? ` <a href="${esc(b.url)}" rel="noopener" target="_blank">${R.ver} ↗</a>` : ""}</figcaption>` : ""}</figure>`;
      case "antesdepois": return `<figure class="antes-depois"><div class="antes-depois__par"><div><img src="${esc(b.antes)}" alt="${esc(R.antes)}" loading="lazy" decoding="async"><span>${R.antes}</span></div><div><img src="${esc(b.depois)}" alt="${esc(R.depois)}" loading="lazy" decoding="async"><span>${R.depois}</span></div></div>${legenda(b)}</figure>`;
      case "sep": return '<hr class="artigo__sep">';
      default: return "";
    }
  }).join("\n");
}

const minutosLeitura = (blocos) => Math.max(1, Math.round(blocos.reduce((n, b) => n + textoSimples(b.html || b.texto || (b.itens || []).join(" ")).split(" ").filter(Boolean).length, 0) / 200));

/* ---------- Sessão ---------- */
async function sessao(request, env) {
  const t = cookie(request, COOKIE);
  if (!t || t.length < 30 || !env.DB) return null;
  await esquema(env.DB);
  const linha = await env.DB.prepare("SELECT email, expira FROM sessoes WHERE hash = ?").bind(await sha256(t)).first();
  if (!linha || linha.expira < Date.now()) return null;
  return { email: linha.email };
}

async function contarTentativa(db, chave, limite) {
  const desde = Date.now() - 3600 * 1000;
  const r = await db.prepare("SELECT COUNT(*) AS n FROM tentativas WHERE chave = ? AND momento > ?").bind(chave, desde).first();
  if ((r?.n || 0) >= limite) return false;
  await db.prepare("INSERT INTO tentativas (chave, momento) VALUES (?, ?)").bind(chave, Date.now()).run();
  return true;
}

async function lerJson(request, limite = 64 * 1024) {
  if (!(request.headers.get("Content-Type") || "").includes("application/json")) throw new ErroPedido(415, "Formato inválido");
  const texto = await request.text();
  if (texto.length > limite) throw new ErroPedido(413, "Conteúdo demasiado grande");
  try { return JSON.parse(texto); } catch { throw new ErroPedido(400, "JSON inválido"); }
}
class ErroPedido extends Error { constructor(estado, msg) { super(msg); this.estado = estado; } }

function mesmaOrigem(request, url) {
  const o = request.headers.get("Origin");
  if (o) { try { if (new URL(o).host !== url.host) return false; } catch { return false; } }
  return request.headers.get("X-Implement") === "1";
}

/* ---------- Router ---------- */
export async function tratarBlog(request, env, ctx, url) {
  const p = url.pathname;
  try {
    if (p === "/insights.html" || p === "/insights/") return Response.redirect(new URL("/insights" + url.search, url), 301);
    if (p === "/work.html" || p === "/work/") return Response.redirect(new URL("/work" + url.search, url), 301);
    if (p === "/work") return await paginaTrabalhos(request, env, url);
    if (p.startsWith("/work/")) return await paginaTrabalho(request, env, url, decodeURIComponent(p.slice(6)).replace(/\/$/, ""));
    if (p === "/insights") return await paginaLista(request, env, url);
    if (p.startsWith("/insights/")) return await paginaArtigo(request, env, url, decodeURIComponent(p.slice(10)).replace(/\/$/, ""));
    if (p.startsWith("/media/")) return await servirImagem(request, env, ctx, p.slice(7));
    if (p === "/api/marcas" && request.method === "GET") return await marcasPublicas(env);
    if (p.startsWith("/api/admin/")) return await api(request, env, ctx, url, p.slice(11));
    if (p === "/admin" || p.startsWith("/admin/")) return await paginaAdmin(request, env, url);
  } catch (e) {
    if (e instanceof ErroPedido) return json({ ok: false, erro: e.message }, e.estado);
    console.error(JSON.stringify({ evento: "blog_erro", caminho: p, erro: String(e && e.stack || e).slice(0, 500) }));
    if (p.startsWith("/api/")) return json({ ok: false, erro: "Erro interno" }, 500);
    return new Response("Erro interno", { status: 500 });
  }
  return null;
}

/* ---------- Páginas da equipa ---------- */
async function paginaAdmin(request, env, url) {
  const p = url.pathname;
  const livres = ["/admin/login", "/admin/login.html", "/admin/entrar", "/admin/entrar.html"];
  const s = await sessao(request, env).catch(() => null);
  if (livres.includes(p)) {
    if (s && p.startsWith("/admin/login")) return Response.redirect(new URL("/admin/", url), 302);
  } else if (!s) {
    return Response.redirect(new URL("/admin/login", url), 302);
  } else if (p === "/admin") return Response.redirect(new URL("/admin/", url), 302);
  const alvo = new URL(p.replace(/\.html$/, ""), url);
  const r = await env.ASSETS.fetch(new Request(alvo, { headers: request.headers }));
  const h = new Headers(r.headers);
  h.set("Content-Security-Policy", `${CSP_BASE}; img-src 'self' data: blob: https://i.ytimg.com; ${FRAMES}`);
  h.set("X-Robots-Tag", "noindex, nofollow");
  h.set("Cache-Control", "no-store");
  h.set("Referrer-Policy", "same-origin");
  return new Response(r.body, { status: r.status, headers: h });
}

/* ---------- API ---------- */
async function api(request, env, ctx, url, rota) {
  if (!env.DB) return json({ ok: false, erro: "Base de dados não configurada" }, 503);
  await esquema(env.DB);
  const metodo = request.method;
  if (metodo !== "GET" && !mesmaOrigem(request, url)) return json({ ok: false, erro: "Origem recusada" }, 403);

  if (rota === "pedir-acesso" && metodo === "POST") return pedirAcesso(request, env, url);
  if (rota === "entrar" && metodo === "POST") return entrar(request, env);

  const s = await sessao(request, env);
  if (!s) return json({ ok: false, erro: "Sessão terminada. Entre outra vez." }, 401);

  if (rota === "sair" && metodo === "POST") {
    const t = cookie(request, COOKIE);
    if (t) await env.DB.prepare("DELETE FROM sessoes WHERE hash = ?").bind(await sha256(t)).run();
    return json({ ok: true }, 200, { "Set-Cookie": `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0` });
  }
  if (rota === "eu") return json({ ok: true, email: s.email, video: Boolean(env.MEDIA) });

  if (rota === "autoras" && metodo === "GET") {
    const { results } = await env.DB.prepare("SELECT id, nome, cargo, bio, foto FROM autoras ORDER BY ordem, nome").all();
    return json({ ok: true, autoras: results });
  }
  let m = rota.match(/^autoras\/([a-z0-9-]{1,40})$/);
  if (m && metodo === "PUT") {
    const c = await lerJson(request);
    const nome = String(c.nome || "").trim().slice(0, 80);
    if (!nome) throw new ErroPedido(400, "O nome é obrigatório.");
    const foto = String(c.foto || "");
    if (foto && !IMAGEM_OK.test(foto)) throw new ErroPedido(400, "Foto inválida.");
    const r = await env.DB.prepare("UPDATE autoras SET nome = ?, cargo = ?, bio = ?, foto = ? WHERE id = ?")
      .bind(nome, String(c.cargo || "").trim().slice(0, 80), String(c.bio || "").trim().slice(0, 600), foto, m[1]).run();
    if (!r.meta || r.meta.changes === 0) { const e = await env.DB.prepare("SELECT id FROM autoras WHERE id = ?").bind(m[1]).first(); if (!e) throw new ErroPedido(404, "Autora não encontrada."); }
    return json({ ok: true });
  }

  if (rota.startsWith("financas/")) {
    const r = await apiFinancas(rota.slice(9), metodo, request, env, s, { json, lerJson, ErroPedido, idCurto });
    if (r) return r;
  }

  if (rota === "artigos" && metodo === "GET") {
    const { results } = await env.DB.prepare("SELECT id, slug, titulo, resumo, capa, autora_id, categoria, idioma, estado, publicado_em, atualizado_em, atualizado_por FROM artigos ORDER BY COALESCE(publicado_em, atualizado_em) DESC").all();
    return json({ ok: true, artigos: results });
  }
  if (rota === "artigos" && metodo === "POST") return guardarArtigo(request, env, s, null);
  m = rota.match(/^artigos\/([a-z0-9]{6,32})$/);
  if (m && metodo === "GET") {
    const a = await env.DB.prepare("SELECT * FROM artigos WHERE id = ?").bind(m[1]).first();
    if (!a) return json({ ok: false, erro: "Artigo não encontrado." }, 404);
    return json({ ok: true, artigo: { ...a, conteudo: JSON.parse(a.conteudo || "[]") } });
  }
  if (m && metodo === "PUT") return guardarArtigo(request, env, s, m[1]);
  if (m && metodo === "DELETE") {
    await env.DB.prepare("DELETE FROM artigos WHERE id = ?").bind(m[1]).run();
    return json({ ok: true });
  }

  if (rota === "trabalhos" && metodo === "GET") {
    const { results } = await env.DB.prepare("SELECT id, slug, titulo, cliente, ano, categorias, capa, formato, destaque, estado, publicado_em, atualizado_em FROM trabalhos ORDER BY destaque DESC, COALESCE(publicado_em, atualizado_em) DESC").all();
    return json({ ok: true, trabalhos: results.map((t) => ({ ...t, categorias: JSON.parse(t.categorias || "[]") })) });
  }
  if (rota === "trabalhos" && metodo === "POST") return guardarTrabalho(request, env, s, null);
  m = rota.match(/^trabalhos\/([a-z0-9]{6,32})$/);
  if (m && metodo === "GET") {
    const t = await env.DB.prepare("SELECT * FROM trabalhos WHERE id = ?").bind(m[1]).first();
    if (!t) return json({ ok: false, erro: "Trabalho não encontrado." }, 404);
    return json({ ok: true, trabalho: { ...t, categorias: JSON.parse(t.categorias || "[]"), conteudo: JSON.parse(t.conteudo || "[]"), destaque: Boolean(t.destaque) } });
  }
  if (m && metodo === "PUT") return guardarTrabalho(request, env, s, m[1]);
  if (m && metodo === "DELETE") {
    await env.DB.prepare("DELETE FROM trabalhos WHERE id = ?").bind(m[1]).run();
    return json({ ok: true });
  }

  if (rota === "marcas" && metodo === "GET") {
    const { results } = await env.DB.prepare("SELECT id, nome, logo, ordem, visivel FROM marcas ORDER BY ordem, criado_em").all();
    return json({ ok: true, marcas: results.map((m) => ({ ...m, visivel: Boolean(m.visivel) })) });
  }
  if (rota === "marcas" && metodo === "POST") {
    const c = await lerJson(request);
    const nome = txt(c.nome, 80), logo = String(c.logo || "");
    if (!nome) throw new ErroPedido(400, "Escreva o nome da marca.");
    if (!IMAGEM_OK.test(logo)) throw new ErroPedido(400, "Carregue o logótipo.");
    const ultimo = await env.DB.prepare("SELECT COALESCE(MAX(ordem), 0) AS m FROM marcas").first();
    const id = idCurto(12);
    await env.DB.prepare("INSERT INTO marcas (id, nome, logo, ordem, visivel, criado_em) VALUES (?, ?, ?, ?, 1, ?)").bind(id, nome, logo, (ultimo?.m || 0) + 1, agora()).run();
    return json({ ok: true, id });
  }
  if (rota === "marcas/ordem" && metodo === "POST") {
    const c = await lerJson(request);
    const ids = (Array.isArray(c.ids) ? c.ids : []).map(String).slice(0, 300);
    for (const [i, mid] of ids.entries()) await env.DB.prepare("UPDATE marcas SET ordem = ? WHERE id = ?").bind(i + 1, mid).run();
    return json({ ok: true });
  }
  m = rota.match(/^marcas\/([a-z0-9]{6,32})$/);
  if (m && metodo === "PUT") {
    const c = await lerJson(request);
    const nome = txt(c.nome, 80), logo = String(c.logo || "");
    if (!nome) throw new ErroPedido(400, "Escreva o nome da marca.");
    if (!IMAGEM_OK.test(logo)) throw new ErroPedido(400, "Logótipo inválido.");
    await env.DB.prepare("UPDATE marcas SET nome = ?, logo = ?, visivel = ? WHERE id = ?").bind(nome, logo, c.visivel === false ? 0 : 1, m[1]).run();
    return json({ ok: true });
  }
  if (m && metodo === "DELETE") {
    await env.DB.prepare("DELETE FROM marcas WHERE id = ?").bind(m[1]).run();
    return json({ ok: true });
  }

  if (rota === "imagens" && metodo === "POST") return carregarImagem(request, env, s);
  return json({ ok: false, erro: "Não encontrado" }, 404);
}

async function pedirAcesso(request, env, url) {
  const c = await lerJson(request, 2048);
  const email = String(c.email || "").trim().toLowerCase();
  if (!emailDaEquipa(email)) return json({ ok: false, erro: `Só é possível entrar com um e-mail @${DOMINIO}.` }, 400);
  const ip = request.headers.get("CF-Connecting-IP") || "local";
  if (!(await contarTentativa(env.DB, "ip:" + ip, 15)) || !(await contarTentativa(env.DB, "email:" + email, 5))) {
    return json({ ok: false, erro: "Demasiados pedidos. Tente outra vez daqui a uma hora." }, 429);
  }
  await env.DB.prepare("DELETE FROM tentativas WHERE momento < ?").bind(Date.now() - 86400000).run();
  await env.DB.prepare("DELETE FROM acessos WHERE expira < ?").bind(Date.now()).run();
  if (!env.EMAIL) return json({ ok: false, erro: "O envio de e-mail não está configurado." }, 503);
  const token = aleatorio(32);
  await env.DB.prepare("INSERT INTO acessos (hash, email, expira) VALUES (?, ?, ?)").bind(await sha256(token), email, Date.now() + LINK_MINUTOS * 60000).run();
  const link = `${url.origin}/admin/entrar#t=${token}`;
  await env.EMAIL.send({
    from: { email: env.EMAIL_REMETENTE || `site@${DOMINIO}`, name: "Implement" },
    to: email,
    subject: "O seu link para entrar · Implement",
    text: `Olá,\n\nUse este link para entrar na área da equipa da Implement:\n\n${link}\n\nO link funciona uma vez e expira em ${LINK_MINUTOS} minutos. Se não pediu para entrar, pode ignorar este e-mail.`,
    html: `<div style="max-width:520px;margin:0 auto;padding:28px;font:15px/1.6 Arial,sans-serif;color:#17131F">
      <p style="font:700 11px/1 Arial,sans-serif;letter-spacing:.28em;text-transform:uppercase;color:#5B2BB5;margin:0 0 16px">Implement · Área da equipa</p>
      <h1 style="font:700 24px/1.25 Georgia,serif;margin:0 0 12px">Entrar no editor de artigos</h1>
      <p style="margin:0 0 24px">Carregue no botão para entrar. O link funciona uma vez e expira em ${LINK_MINUTOS} minutos.</p>
      <p style="margin:0 0 28px"><a href="${esc(link)}" style="display:inline-block;background:#8B52E8;color:#fff;text-decoration:none;font-weight:700;padding:14px 26px;border-radius:999px">Entrar</a></p>
      <p style="font-size:13px;color:#6B6578;margin:0">Se não pediu para entrar, ignore este e-mail.</p></div>`,
  });
  console.log(JSON.stringify({ evento: "link_enviado", email }));
  return json({ ok: true });
}

async function entrar(request, env) {
  const c = await lerJson(request, 2048);
  const token = String(c.token || "");
  if (token.length < 30) return json({ ok: false, erro: "Link inválido." }, 400);
  const h = await sha256(token);
  const a = await env.DB.prepare("SELECT email, expira, usado FROM acessos WHERE hash = ?").bind(h).first();
  if (!a || a.usado) return json({ ok: false, erro: "Este link já foi usado ou não é válido. Peça um novo." }, 400);
  if (a.expira < Date.now()) return json({ ok: false, erro: "Este link expirou. Peça um novo." }, 400);
  await env.DB.prepare("UPDATE acessos SET usado = 1 WHERE hash = ?").bind(h).run();
  const sess = aleatorio(32);
  await env.DB.prepare("INSERT INTO sessoes (hash, email, criada, expira) VALUES (?, ?, ?, ?)").bind(await sha256(sess), a.email, Date.now(), Date.now() + SESSAO_DIAS * 86400000).run();
  await env.DB.prepare("DELETE FROM sessoes WHERE expira < ?").bind(Date.now()).run();
  console.log(JSON.stringify({ evento: "entrou", email: a.email }));
  return json({ ok: true, email: a.email }, 200, { "Set-Cookie": `${COOKIE}=${sess}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSAO_DIAS * 86400}` });
}

async function guardarArtigo(request, env, s, id) {
  const c = await lerJson(request, LIMITE_ARTIGO);
  const titulo = String(c.titulo || "").trim().slice(0, 180);
  if (!titulo) throw new ErroPedido(400, "Escreva um título.");
  const estado = c.estado === "publicado" ? "publicado" : "rascunho";
  const autora = await env.DB.prepare("SELECT id FROM autoras WHERE id = ?").bind(String(c.autora_id || "")).first();
  if (!autora) throw new ErroPedido(400, "Escolha a autora.");
  const capa = String(c.capa || "");
  if (capa && !IMAGEM_OK.test(capa)) throw new ErroPedido(400, "Imagem de capa inválida.");
  const conteudo = limparBlocos(c.conteudo);
  if (estado === "publicado" && !conteudo.length) throw new ErroPedido(400, "O artigo ainda não tem conteúdo.");
  let publicado = c.publicado_em ? new Date(c.publicado_em) : null;
  if (publicado && isNaN(publicado)) publicado = null;
  if (estado === "publicado" && !publicado) publicado = new Date();

  // slug único
  let base = slugificar(c.slug || titulo) || "artigo";
  let slug = base, n = 2;
  while (await env.DB.prepare("SELECT id FROM artigos WHERE slug = ? AND id != ?").bind(slug, id || "").first()) slug = `${base.slice(0, 74)}-${n++}`;

  const campos = [slug, titulo, String(c.resumo || "").trim().slice(0, 320), capa, String(c.capa_alt || "").trim().slice(0, 300), autora.id,
    String(c.categoria || "").trim().slice(0, 40), c.idioma === "en" ? "en" : "pt", JSON.stringify(conteudo), estado,
    publicado ? publicado.toISOString() : null, agora(), s.email];
  if (id) {
    const r = await env.DB.prepare("UPDATE artigos SET slug=?, titulo=?, resumo=?, capa=?, capa_alt=?, autora_id=?, categoria=?, idioma=?, conteudo=?, estado=?, publicado_em=?, atualizado_em=?, atualizado_por=? WHERE id = ?")
      .bind(...campos, id).run();
    if (r.meta && r.meta.changes === 0) throw new ErroPedido(404, "Artigo não encontrado.");
  } else {
    id = idCurto(12);
    await env.DB.prepare("INSERT INTO artigos (slug, titulo, resumo, capa, capa_alt, autora_id, categoria, idioma, conteudo, estado, publicado_em, atualizado_em, atualizado_por, id, criado_em) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(...campos, id, agora()).run();
  }
  console.log(JSON.stringify({ evento: "artigo_guardado", id, estado, por: s.email }));
  return json({ ok: true, id, slug, estado, publicado_em: campos[10], conteudo });
}

export const CATEGORIAS = [
  { id: "websites", en: "Websites", pt: "Websites" },
  { id: "redes", en: "Social media", pt: "Redes sociais" },
  { id: "reels", en: "Reels & short video", pt: "Reels e vídeo curto" },
  { id: "video", en: "Video & YouTube", pt: "Vídeo e YouTube" },
  { id: "fotografia", en: "Photography", pt: "Fotografia" },
  { id: "marca", en: "Brand identity", pt: "Identidade visual" },
  { id: "impressos", en: "Print: cards, flyers & menus", pt: "Impressos: cartões, flyers e menus" },
  { id: "fachadas", en: "Shopfronts & signage", pt: "Fachadas e sinalética" },
  { id: "produto", en: "Product & packaging", pt: "Produto e embalagem" },
];
const CAT_IDS = new Set(CATEGORIAS.map((c) => c.id));

async function guardarTrabalho(request, env, s, id) {
  const c = await lerJson(request, LIMITE_ARTIGO);
  const titulo = txt(c.titulo, 160);
  if (!titulo) throw new ErroPedido(400, "Escreva o nome do trabalho.");
  const estado = c.estado === "publicado" ? "publicado" : "rascunho";
  const categorias = [...new Set((Array.isArray(c.categorias) ? c.categorias : []).map(String).filter((x) => CAT_IDS.has(x)))];
  const capa = String(c.capa || "");
  if (capa && !IMAGEM_OK.test(capa)) throw new ErroPedido(400, "Imagem de capa inválida.");
  const conteudo = limparBlocos(c.conteudo);
  if (estado === "publicado") {
    if (!categorias.length) throw new ErroPedido(400, "Escolha pelo menos um tipo de trabalho.");
    if (!capa && !conteudo.some((b) => b.t === "video" && videoEmbed(b.url)?.miniatura)) throw new ErroPedido(400, "Acrescente uma imagem de capa: é ela que aparece na grelha do portfólio.");
  }
  let link = txt(c.link, 300);
  if (link && !/^https?:\/\//i.test(link)) link = "https://" + link;
  let publicado = c.publicado_em ? new Date(c.publicado_em) : null;
  if (publicado && isNaN(publicado)) publicado = null;
  if (estado === "publicado" && !publicado) publicado = new Date();
  const base = slugificar(c.slug || titulo) || "trabalho";
  let slug = base, n = 2;
  while (await env.DB.prepare("SELECT id FROM trabalhos WHERE slug = ? AND id != ?").bind(slug, id || "").first()) slug = `${base.slice(0, 74)}-${n++}`;
  const campos = [slug, titulo, txt(c.resumo, 400), txt(c.cliente, 100), txt(c.ano, 12), txt(c.local, 80), link, JSON.stringify(categorias), capa, txt(c.capa_alt),
    ["horizontal", "vertical", "quadrado"].includes(c.formato) ? c.formato : "horizontal", c.destaque ? 1 : 0, c.idioma === "en" ? "en" : "pt",
    JSON.stringify(conteudo), estado, publicado ? publicado.toISOString() : null, agora(), s.email];
  if (id) {
    const r = await env.DB.prepare("UPDATE trabalhos SET slug=?, titulo=?, resumo=?, cliente=?, ano=?, local=?, link=?, categorias=?, capa=?, capa_alt=?, formato=?, destaque=?, idioma=?, conteudo=?, estado=?, publicado_em=?, atualizado_em=?, atualizado_por=? WHERE id = ?").bind(...campos, id).run();
    if (r.meta && r.meta.changes === 0) throw new ErroPedido(404, "Trabalho não encontrado.");
  } else {
    id = idCurto(12);
    await env.DB.prepare("INSERT INTO trabalhos (slug, titulo, resumo, cliente, ano, local, link, categorias, capa, capa_alt, formato, destaque, idioma, conteudo, estado, publicado_em, atualizado_em, atualizado_por, id, criado_em) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(...campos, id, agora()).run();
  }
  console.log(JSON.stringify({ evento: "trabalho_guardado", id, estado, por: s.email }));
  return json({ ok: true, id, slug, estado, publicado_em: campos[15], conteudo });
}

const TIPOS = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "video/mp4": "mp4", "video/webm": "webm" };
const LIMITE_VIDEO = 50 * 1024 * 1024;
function tipoReal(b) {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "image/gif";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) return "video/mp4";
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return "video/webm";
  return null;
}
const paraBase64 = (b) => { let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); };
const deBase64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function carregarImagem(request, env, s) {
  const limite = env.MEDIA ? LIMITE_VIDEO : LIMITE_IMAGEM_D1;
  const kb = (n) => (n >= 1024 * 1024 ? `${Math.round(n / 1024 / 1024)} MB` : `${Math.round(n / 1024)} KB`);
  if (Number(request.headers.get("Content-Length") || 0) > limite) throw new ErroPedido(413, `O ficheiro é demasiado grande (máx. ${kb(limite)}).`);
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (!bytes.length) throw new ErroPedido(400, "Ficheiro vazio.");
  if (bytes.length > limite) throw new ErroPedido(413, `O ficheiro é demasiado grande (máx. ${kb(limite)}).`);
  const tipo = tipoReal(bytes);
  if (!tipo) throw new ErroPedido(415, "Formato não suportado. Use JPG, PNG, WebP ou GIF (e MP4 para vídeo).");
  const video = tipo.startsWith("video/");
  if (video && !env.MEDIA) throw new ErroPedido(415, "Para carregar ficheiros de vídeo é preciso ativar o R2. Por agora, use um link do YouTube, Instagram, TikTok ou Vimeo.");
  if (!video && bytes.length > (env.MEDIA ? 8 * 1024 * 1024 : LIMITE_IMAGEM_D1)) throw new ErroPedido(413, "A imagem é demasiado grande.");
  const id = idCurto(16);
  if (env.MEDIA) {
    await env.MEDIA.put(`${id}.${TIPOS[tipo]}`, bytes, { httpMetadata: { contentType: tipo, cacheControl: "public, max-age=31536000, immutable" } });
    await env.DB.prepare("INSERT INTO imagens (id, tipo, tamanho, dados, criado_em, criado_por) VALUES (?, ?, ?, NULL, ?, ?)").bind(id, tipo, bytes.length, agora(), s.email).run();
  } else {
    await env.DB.prepare("INSERT INTO imagens (id, tipo, tamanho, dados, criado_em, criado_por) VALUES (?, ?, ?, ?, ?, ?)").bind(id, tipo, bytes.length, paraBase64(bytes), agora(), s.email).run();
  }
  return json({ ok: true, url: `/media/${id}.${TIPOS[tipo]}` });
}

async function servirImagem(request, env, ctx, nome) {
  const m = nome.match(/^([a-z0-9]{6,32})\.(webp|jpg|png|gif|mp4|webm)$/);
  if (!m || !env.DB) return new Response("Não encontrado", { status: 404 });
  const base = { "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" };
  if (m[2] === "mp4" || m[2] === "webm") {
    // Vídeos: sempre do R2, com suporte a pedidos parciais (para avançar no vídeo)
    if (!env.MEDIA) return new Response("Não encontrado", { status: 404 });
    const r = /bytes=(\d*)-(\d*)/.exec(request.headers.get("Range") || "");
    let o;
    if (r && (r[1] || r[2])) {
      const opt = r[1] ? { offset: Number(r[1]), ...(r[2] ? { length: Number(r[2]) - Number(r[1]) + 1 } : {}) } : { suffix: Number(r[2]) };
      o = await env.MEDIA.get(nome, { range: opt });
      if (!o) return new Response("Não encontrado", { status: 404 });
      const inicio = o.range?.offset ?? (o.size - (o.range?.suffix || 0));
      const comp = o.range?.length ?? (o.size - inicio);
      return new Response(o.body, { status: 206, headers: { ...base, "Content-Type": `video/${m[2]}`, "Accept-Ranges": "bytes", "Content-Range": `bytes ${inicio}-${inicio + comp - 1}/${o.size}`, "Content-Length": String(comp) } });
    }
    o = await env.MEDIA.get(nome);
    if (!o) return new Response("Não encontrado", { status: 404 });
    return new Response(o.body, { headers: { ...base, "Content-Type": `video/${m[2]}`, "Accept-Ranges": "bytes", "Content-Length": String(o.size) } });
  }
  const cache = typeof caches !== "undefined" ? caches.default : null;
  const chave = new Request(new URL(`/media/${nome}`, request.url).toString());
  if (cache) { const hit = await cache.match(chave); if (hit) return hit; }
  await esquema(env.DB);
  const linha = await env.DB.prepare("SELECT tipo, dados FROM imagens WHERE id = ?").bind(m[1]).first();
  if (!linha) return new Response("Não encontrado", { status: 404 });
  let corpo;
  if (linha.dados) corpo = deBase64(linha.dados);
  else if (env.MEDIA) { const o = await env.MEDIA.get(nome); if (!o) return new Response("Não encontrado", { status: 404 }); corpo = o.body; }
  else return new Response("Não encontrado", { status: 404 });
  const r = new Response(corpo, { headers: { ...base, "Content-Type": linha.tipo } });
  if (cache && ctx) ctx.waitUntil(cache.put(chave, r.clone()));
  return r;
}

/* ---------- Páginas públicas ---------- */
const dataLonga = (iso, idioma) => (iso ? new Date(iso).toLocaleDateString(idioma === "en" ? "en-GB" : "pt-PT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Lisbon" }) : "");
const T = {
  pt: { leitura: (n) => `${n} min de leitura`, por: "Por", voltar: "Todos os artigos", partilhar: "Partilhar", mais: "Continue a ler", sobre: "Sobre a autora", rascunho: "Pré-visualização · rascunho" },
  en: { leitura: (n) => `${n} min read`, por: "By", voltar: "All articles", partilhar: "Share", mais: "Keep reading", sobre: "About the author", rascunho: "Preview · draft" },
};

function pagina({ titulo, descricao, canonico, imagem, tipo = "website", corpo, idioma = "en", extraHead = "", indexar = true, tituloPt, ativo = "/insights", classe = "pagina-artigos" }) {
  const img = imagem ? new URL(imagem, canonico).toString() : "https://heyimplement.com/assets/img/og.png";
  return `<!doctype html>
<html lang="${idioma}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(titulo)}</title>
${tituloPt ? `<meta name="titulo-pt" content="${esc(tituloPt)}">` : ""}
<meta name="description" content="${esc(descricao)}">
<link rel="canonical" href="${esc(canonico)}">
${indexar ? "" : '<meta name="robots" content="noindex">'}
<meta property="og:type" content="${tipo}">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descricao)}">
<meta property="og:url" content="${esc(canonico)}">
${imagem ? `<meta property="og:image" content="${esc(img)}">\n<meta name="twitter:card" content="summary_large_image">` : ""}
${CABECA}
${extraHead}
</head>
<body class="${classe}">
${CABECALHO.replace(`<a href="${ativo}" data-i18n`, `<a href="${ativo}" aria-current="page" data-i18n`)}
${corpo}
${RODAPE}
</body>
</html>`;
}

async function autorasMapa(db) {
  const { results } = await db.prepare("SELECT id, nome, cargo, bio, foto FROM autoras").all();
  return Object.fromEntries(results.map((a) => [a.id, a]));
}

function cartaoArtigo(a, autora) {
  const idioma = a.idioma;
  const blocos = JSON.parse(a.conteudo || "[]");
  return `<li><a class="cartao-artigo" href="/insights/${esc(a.slug)}">
    <span class="cartao-artigo__capa">${a.capa ? `<img src="${esc(a.capa)}" alt="" loading="lazy" decoding="async">` : '<svg class="abelha abelha--lilas" aria-hidden="true"><use href="/assets/img/sprite.svg#abelha"/></svg>'}</span>
    <span class="cartao-artigo__texto" lang="${idioma}">
      ${a.categoria ? `<span class="legenda">${esc(a.categoria)}</span>` : ""}
      <span class="cartao-artigo__titulo">${esc(a.titulo)}</span>
      ${a.resumo ? `<span class="cartao-artigo__resumo">${esc(a.resumo)}</span>` : ""}
      <span class="autoria">${autora?.foto ? `<img src="${esc(autora.foto)}" alt="" width="36" height="36" loading="lazy">` : ""}<span><strong>${esc(autora?.nome || "")}</strong><span>${esc(dataLonga(a.publicado_em, idioma))} · ${esc(T[idioma].leitura(minutosLeitura(blocos)))}</span></span></span>
    </span></a></li>`;
}

async function paginaLista(request, env, url) {
  let artigos = [], autoras = {};
  if (env.DB) {
    await esquema(env.DB);
    const r = await env.DB.prepare("SELECT slug, titulo, resumo, capa, autora_id, categoria, idioma, conteudo, publicado_em FROM artigos WHERE estado = 'publicado' AND publicado_em <= ? ORDER BY publicado_em DESC LIMIT 60").bind(agora()).all();
    artigos = r.results;
    autoras = await autorasMapa(env.DB);
  }
  const [destaque, ...resto] = artigos;
  const corpo = `<main id="conteudo">
  <section class="heroi heroi-servicos heroi-artigos">
    <div class="contentor">
      <p class="legenda" data-i18n="ar.legenda">Insights</p>
      <h1 data-i18n-html="ar.titulo">Ideas for businesses that want to <span class="destaque">grow.</span></h1>
      <p class="heroi-servicos__intro" data-i18n="ar.intro">Practical notes on social media, branding, websites and content — written by the Implement team.</p>
    </div>
  </section>
  <section class="seccao catalogo catalogo--nevoa artigos" aria-label="Articles">
    <div class="contentor">
      ${artigos.length ? `
      <ul class="lista-artigos">${destaque ? cartaoArtigo(destaque, autoras[destaque.autora_id]).replace('class="cartao-artigo"', 'class="cartao-artigo cartao-artigo--destaque"') : ""}${resto.map((a) => cartaoArtigo(a, autoras[a.autora_id])).join("")}</ul>`
      : `<div class="artigos-vazio"><svg class="abelha" aria-hidden="true"><use href="/assets/img/sprite.svg#abelha"/></svg><h2 data-i18n="ar.vazio">The first articles are on their way.</h2><p data-i18n="ar.vazio.p">In the meantime, tell us about your business — we’re happy to help.</p><a class="botao" href="/start-a-project"><span data-i18n="c.comecar">Start a project</span><svg class="seta" aria-hidden="true"><use href="/assets/img/sprite.svg#seta"/></svg></a></div>`}
    </div>
  </section>
</main>`;
  const html = pagina({ titulo: "Insights — Implement", tituloPt: "Artigos — Implement", descricao: "Articles by Implement on social media, branding, websites and content for growing businesses.", canonico: `${url.origin}/insights`, corpo });
  return new Response(html, { headers: { ...CABECALHOS_HTML, "Cache-Control": "public, max-age=60" } });
}

async function paginaArtigo(request, env, url, slug) {
  if (!env.DB || !/^[a-z0-9-]{1,90}$/.test(slug)) return naoEncontrado(env, request);
  await esquema(env.DB);
  const pre = url.searchParams.get("preview") === "1" && (await sessao(request, env));
  const a = await env.DB.prepare("SELECT * FROM artigos WHERE slug = ?").bind(slug).first();
  if (!a) return naoEncontrado(env, request);
  const publico = a.estado === "publicado" && a.publicado_em && a.publicado_em <= agora();
  if (!publico && !pre) return naoEncontrado(env, request);
  const autoras = await autorasMapa(env.DB);
  const autora = autoras[a.autora_id] || { nome: "Implement", foto: "", cargo: "", bio: "" };
  const blocos = JSON.parse(a.conteudo || "[]");
  const idioma = a.idioma === "en" ? "en" : "pt";
  const t = T[idioma];
  const canonico = `${url.origin}/insights/${a.slug}`;
  const partilha = encodeURIComponent(canonico);
  const outros = (await env.DB.prepare("SELECT slug, titulo, resumo, capa, autora_id, categoria, idioma, conteudo, publicado_em FROM artigos WHERE estado = 'publicado' AND publicado_em <= ? AND slug != ? ORDER BY publicado_em DESC LIMIT 3").bind(agora(), a.slug).all()).results;
  const ld = JSON.stringify({
    "@context": "https://schema.org", "@type": "BlogPosting", headline: a.titulo, description: a.resumo || undefined,
    image: a.capa ? new URL(a.capa, url).toString() : undefined, datePublished: a.publicado_em, dateModified: a.atualizado_em,
    author: { "@type": "Person", name: autora.nome }, publisher: { "@type": "Organization", name: "Implement Digital Marketing", url: "https://heyimplement.com" },
    mainEntityOfPage: canonico, inLanguage: idioma === "en" ? "en" : "pt-PT",
  }).replace(/</g, "\\u003c");

  const corpo = `<main id="conteudo">
${pre && !publico ? `<p class="aviso-rascunho">${t.rascunho} · <a href="/admin/#/editar/${esc(a.id)}">Editar</a></p>` : ""}
<article class="artigo" lang="${idioma}">
  <header class="artigo__cabeca contentor">
    <p class="legenda"><a href="/insights">${esc(t.voltar)}</a>${a.categoria ? ` · ${esc(a.categoria)}` : ""}</p>
    <h1>${esc(a.titulo)}</h1>
    ${a.resumo ? `<p class="artigo__resumo">${esc(a.resumo)}</p>` : ""}
    <div class="autoria autoria--grande">${autora.foto ? `<img src="${esc(autora.foto)}" alt="" width="52" height="52">` : ""}<span><strong>${esc(autora.nome)}</strong><span>${esc(dataLonga(a.publicado_em || a.atualizado_em, idioma))} · ${esc(t.leitura(minutosLeitura(blocos)))}</span></span></div>
  </header>
  ${a.capa ? `<figure class="artigo__capa contentor"><img src="${esc(a.capa)}" alt="${esc(a.capa_alt)}" decoding="async" fetchpriority="high"></figure>` : ""}
  <div class="artigo__corpo contentor">
${blocosHtml(blocos, { idioma })}
  </div>
  <footer class="artigo__fim contentor">
    <div class="partilhar"><span>${t.partilhar}</span>
      <a href="https://www.linkedin.com/sharing/share-offsite/?url=${partilha}" rel="noopener" target="_blank">LinkedIn</a>
      <a href="https://www.facebook.com/sharer/sharer.php?u=${partilha}" rel="noopener" target="_blank">Facebook</a>
      <a href="https://wa.me/?text=${encodeURIComponent(a.titulo + " " + canonico)}" rel="noopener" target="_blank">WhatsApp</a>
    </div>
    <div class="cartao-autora">${autora.foto ? `<img src="${esc(autora.foto)}" alt="" width="88" height="88" loading="lazy">` : ""}
      <div><p class="legenda">${t.sobre}</p><p class="cartao-autora__nome">${esc(autora.nome)}</p>${autora.cargo ? `<p class="cartao-autora__cargo">${esc(autora.cargo)}</p>` : ""}${autora.bio ? `<p>${esc(autora.bio)}</p>` : ""}</div>
    </div>
  </footer>
</article>
${outros.length ? `<section class="seccao catalogo catalogo--nevoa" aria-labelledby="t-mais"><div class="contentor"><header class="cabeca-seccao"><h2 id="t-mais">${t.mais}</h2></header><ul class="lista-artigos lista-artigos--tres">${outros.map((o) => cartaoArtigo(o, autoras[o.autora_id])).join("")}</ul></div></section>` : ""}
<section class="seccao chamada" aria-labelledby="t-chamada">
  <svg class="chamada__abelha chamada__abelha--1 abelha--branca" aria-hidden="true"><use href="/assets/img/sprite.svg#abelha"/></svg>
  <svg class="chamada__abelha chamada__abelha--2 abelha--branca" aria-hidden="true"><use href="/assets/img/sprite.svg#abelha"/></svg>
  <div class="contentor">
    <h2 id="t-chamada" data-i18n="ar.cta.titulo">Not sure what you need?</h2>
    <p data-i18n="ar.cta.p">Tell us about your business in a few minutes. We’ll suggest the right combination and send a proposal made for you.</p>
    <div class="chamada__acoes">
      <a class="botao botao--claro" href="/start-a-project"><span data-i18n="c.comecar">Start a project</span><svg class="seta" aria-hidden="true"><use href="/assets/img/sprite.svg#seta"/></svg></a>
      <a class="botao botao--secundario" href="https://wa.me/351962951161" rel="noopener" data-whatsapp><span data-i18n="ar.cta.wa">Talk on WhatsApp</span></a>
    </div>
  </div>
</section>
</main>`;
  const html = pagina({
    titulo: `${a.titulo} — Implement`, descricao: a.resumo || textoSimples(blocos.find((b) => b.t === "p")?.html || "").slice(0, 160),
    canonico, imagem: a.capa || autora.foto, tipo: "article", corpo, idioma, indexar: publico,
    extraHead: `<script type="application/ld+json">${ld}</script>`,
  });
  return new Response(html, { headers: { ...CABECALHOS_HTML, "Cache-Control": pre ? "no-store" : "public, max-age=60" } });
}

/* ---------- Marcas (Home) ---------- */
async function marcasPublicas(env) {
  let marcas = [];
  if (env.DB) {
    await esquema(env.DB);
    marcas = (await env.DB.prepare("SELECT nome, logo FROM marcas WHERE visivel = 1 ORDER BY ordem, criado_em LIMIT 120").all()).results;
  }
  return new Response(JSON.stringify({ ok: true, marcas }), { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300", "X-Content-Type-Options": "nosniff" } });
}

/* ---------- Portfólio (/work) ---------- */
const TT = {
  pt: { todos: "Todos os trabalhos", cliente: "Cliente", ano: "Ano", local: "Local", servicos: "Serviços", ver: "Ver o projeto", proximo: "Mais trabalhos", rascunho: "Pré-visualização · rascunho" },
  en: { todos: "All work", cliente: "Client", ano: "Year", local: "Location", servicos: "Services", ver: "View the project", proximo: "More work", rascunho: "Preview · draft" },
};
const catNome = (id, idioma) => CATEGORIAS.find((c) => c.id === id)?.[idioma === "en" ? "en" : "pt"] || id;
const capaDe = (t) => t.capa || JSON.parse(t.conteudo || "[]").map((b) => b.t === "video" && videoEmbed(b.url)?.miniatura).find(Boolean) || "";
const temVideo = (t) => JSON.parse(t.conteudo || "[]").some((b) => b.t === "video");

function cartaoTrabalho(t) {
  const cats = JSON.parse(t.categorias || "[]");
  const capa = capaDe(t);
  return `<li class="portfolio__item portfolio__item--${esc(t.formato)}${t.destaque ? " portfolio__item--destaque" : ""}" data-cats="${esc(cats.join(" "))}">
    <a class="cartao-trabalho" href="/work/${esc(t.slug)}">
      <span class="cartao-trabalho__img">${capa ? `<img src="${esc(capa)}" alt="${esc(t.capa_alt || "")}" loading="lazy" decoding="async">` : '<svg class="abelha abelha--lilas" aria-hidden="true"><use href="/assets/img/sprite.svg#abelha"/></svg>'}
        ${temVideo(t) ? '<span class="cartao-trabalho__play" aria-hidden="true"></span>' : ""}
        <span class="cartao-trabalho__ver" aria-hidden="true"><svg class="seta"><use href="/assets/img/sprite.svg#seta"/></svg></span></span>
      <span class="cartao-trabalho__texto" lang="${t.idioma}">
        <span class="cartao-trabalho__titulo">${esc(t.titulo)}</span>
        ${t.cliente || t.ano ? `<span class="cartao-trabalho__meta">${esc([t.cliente, t.ano].filter(Boolean).join(" · "))}</span>` : ""}
        <span class="cartao-trabalho__tags">${cats.map((c) => `<span data-i18n="tb.cat.${c}">${esc(catNome(c, "en"))}</span>`).join("")}</span>
      </span></a></li>`;
}

async function paginaTrabalhos(request, env, url) {
  let lista = [];
  if (env.DB) {
    await esquema(env.DB);
    lista = (await env.DB.prepare("SELECT slug, titulo, cliente, ano, categorias, capa, capa_alt, formato, destaque, idioma, conteudo FROM trabalhos WHERE estado = 'publicado' AND publicado_em <= ? ORDER BY destaque DESC, publicado_em DESC LIMIT 200").bind(agora()).all()).results;
  }
  const contagem = {};
  lista.forEach((t) => JSON.parse(t.categorias || "[]").forEach((c) => (contagem[c] = (contagem[c] || 0) + 1)));
  const tipo = CAT_IDS.has(url.searchParams.get("tipo")) ? url.searchParams.get("tipo") : "";
  const filtros = CATEGORIAS.filter((c) => contagem[c.id]);
  const corpo = `<main id="conteudo">
  <section class="heroi heroi-servicos heroi-trabalho">
    <div class="contentor">
      <p class="legenda" data-i18n="tb.legenda">Our work</p>
      <h1 data-i18n-html="tb.titulo">Work that helps businesses <span class="destaque">get noticed.</span></h1>
      <p class="heroi-servicos__intro" data-i18n="tb.intro">Websites, social media, reels, photography, brand identities, print and shopfronts — made with and for real businesses.</p>
    </div>
  </section>
  <section class="seccao catalogo catalogo--nevoa trabalhos" aria-label="Work">
    <div class="contentor">
      ${lista.length ? `
      ${filtros.length > 1 ? `<nav class="filtros-trabalho" aria-label="Filter by type"><ul>
        <li><a href="/work" data-filtro=""${tipo ? "" : ' aria-current="true"'}><span data-i18n="tb.todos">All</span> <small>${lista.length}</small></a></li>
        ${filtros.map((c) => `<li><a href="/work?tipo=${c.id}" data-filtro="${c.id}"${tipo === c.id ? ' aria-current="true"' : ""}><span data-i18n="tb.cat.${c.id}">${esc(c.en)}</span> <small>${contagem[c.id]}</small></a></li>`).join("")}
      </ul></nav>` : ""}
      <ul class="portfolio" id="portfolio">${lista.map(cartaoTrabalho).map((h, i) => (tipo && !JSON.parse(lista[i].categorias).includes(tipo) ? h.replace("<li ", "<li hidden ") : h)).join("")}</ul>`
      : `<div class="artigos-vazio"><svg class="abelha" aria-hidden="true"><use href="/assets/img/sprite.svg#abelha"/></svg><h2 data-i18n="tb.vazio">Our portfolio is being put together.</h2><p data-i18n="tb.vazio.p">In the meantime, tell us about your business and we’ll show you examples close to what you need.</p><a class="botao" href="/start-a-project"><span data-i18n="c.comecar">Start a project</span><svg class="seta" aria-hidden="true"><use href="/assets/img/sprite.svg#seta"/></svg></a></div>`}
    </div>
  </section>
  ${chamadaHtml()}
</main>`;
  const html = pagina({ titulo: "Work — Implement", tituloPt: "Trabalho — Implement", descricao: "Selected work by Implement: websites, social media, reels, photography, brand identity, print and shopfronts.", canonico: `${url.origin}/work`, corpo, ativo: "/work", classe: "pagina-trabalho", imagem: lista[0] ? capaDe(lista[0]) : "", extraHead: '<script src="/assets/js/trabalhos.js" defer></script>' });
  return new Response(html, { headers: { ...CABECALHOS_HTML, "Cache-Control": "public, max-age=60" } });
}

const chamadaHtml = () => `<section class="seccao chamada" aria-labelledby="t-chamada">
  <svg class="chamada__abelha chamada__abelha--1 abelha--branca" aria-hidden="true"><use href="/assets/img/sprite.svg#abelha"/></svg>
  <svg class="chamada__abelha chamada__abelha--2 abelha--branca" aria-hidden="true"><use href="/assets/img/sprite.svg#abelha"/></svg>
  <div class="contentor">
    <h2 id="t-chamada" data-i18n="tb.cta.titulo">Want something like this for your business?</h2>
    <p data-i18n="tb.cta.p">Tell us about your business in a few minutes. We’ll suggest the right combination and send a proposal made for you.</p>
    <div class="chamada__acoes">
      <a class="botao botao--claro" href="/start-a-project"><span data-i18n="c.comecar">Start a project</span><svg class="seta" aria-hidden="true"><use href="/assets/img/sprite.svg#seta"/></svg></a>
      <a class="botao botao--secundario" href="https://wa.me/351962951161" rel="noopener" data-whatsapp><span data-i18n="ar.cta.wa">Talk on WhatsApp</span></a>
    </div>
  </div>
</section>`;

async function paginaTrabalho(request, env, url, slug) {
  if (!env.DB || !/^[a-z0-9-]{1,90}$/.test(slug)) return naoEncontrado(env, request);
  await esquema(env.DB);
  const pre = url.searchParams.get("preview") === "1" && (await sessao(request, env));
  const t = await env.DB.prepare("SELECT * FROM trabalhos WHERE slug = ?").bind(slug).first();
  if (!t) return naoEncontrado(env, request);
  const publico = t.estado === "publicado" && t.publicado_em && t.publicado_em <= agora();
  if (!publico && !pre) return naoEncontrado(env, request);
  const idioma = t.idioma === "en" ? "en" : "pt";
  const L = TT[idioma];
  const cats = JSON.parse(t.categorias || "[]");
  const blocos = JSON.parse(t.conteudo || "[]");
  const capa = t.capa;
  const outros = (await env.DB.prepare("SELECT slug, titulo, cliente, ano, categorias, capa, capa_alt, formato, destaque, idioma, conteudo FROM trabalhos WHERE estado = 'publicado' AND publicado_em <= ? AND slug != ? ORDER BY destaque DESC, publicado_em DESC LIMIT 30").bind(agora(), t.slug).all()).results;
  // Próximos: primeiro os do mesmo tipo
  outros.sort((a, b) => Number(JSON.parse(b.categorias).some((c) => cats.includes(c))) - Number(JSON.parse(a.categorias).some((c) => cats.includes(c))));
  const canonico = `${url.origin}/work/${t.slug}`;
  const ficha = [
    t.cliente && [L.cliente, esc(t.cliente)],
    t.ano && [L.ano, esc(t.ano)],
    t.local && [L.local, esc(t.local)],
    cats.length && [L.servicos, cats.map((c) => esc(catNome(c, idioma))).join(", ")],
  ].filter(Boolean);
  const corpo = `<main id="conteudo">
${pre && !publico ? `<p class="aviso-rascunho">${L.rascunho} · <a href="/admin/#/trabalhos/${esc(t.id)}">Editar</a></p>` : ""}
<article class="caso" lang="${idioma}">
  <header class="caso__cabeca contentor">
    <p class="legenda"><a href="/work">${L.todos}</a></p>
    <h1>${esc(t.titulo)}</h1>
    ${t.resumo ? `<p class="caso__resumo">${esc(t.resumo)}</p>` : ""}
    ${ficha.length || t.link ? `<div class="caso__ficha">${ficha.length ? `<dl>${ficha.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>` : ""}${t.link ? `<a class="botao botao--secundario" href="${esc(t.link)}" rel="noopener" target="_blank"><span>${L.ver} ↗</span></a>` : ""}</div>` : ""}
  </header>
  ${capa ? `<figure class="caso__capa contentor"><img src="${esc(capa)}" alt="${esc(t.capa_alt)}" decoding="async" fetchpriority="high" class="caso__capa-img caso__capa-img--${esc(t.formato)}"></figure>` : ""}
  ${blocos.length ? `<div class="artigo__corpo caso__corpo contentor">\n${blocosHtml(blocos, { idioma, altBase: t.titulo })}\n  </div>` : ""}
</article>
${outros.length ? `<section class="seccao catalogo catalogo--nevoa" aria-labelledby="t-proximos"><div class="contentor"><header class="cabeca-seccao"><h2 id="t-proximos">${L.proximo}</h2></header><ul class="portfolio portfolio--tres">${outros.slice(0, 3).map(cartaoTrabalho).join("")}</ul></div></section>` : ""}
${chamadaHtml()}
</main>`;
  const html = pagina({
    titulo: `${t.titulo} — Implement`, descricao: t.resumo || `${t.titulo} — ${cats.map((c) => catNome(c, idioma)).join(", ")}`,
    canonico, imagem: capaDe(t), tipo: "article", corpo, idioma, indexar: publico, ativo: "/work", classe: "pagina-trabalho",
  });
  return new Response(html, { headers: { ...CABECALHOS_HTML, "Cache-Control": pre ? "no-store" : "public, max-age=60" } });
}

async function naoEncontrado(env, request) {
  const r = await env.ASSETS.fetch(new Request(new URL("/404", request.url)));
  return new Response(r.body, { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
