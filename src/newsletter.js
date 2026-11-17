/* Implement — newsletter: inscrição pública (POST /api/newsletter) e lista na área da equipa (/api/admin/newsletter). */
import { enviarHubspot, hubspotAtivo } from "./hubspot.js";

export const ESQUEMA_NEWSLETTER = [
  "CREATE TABLE IF NOT EXISTS newsletter (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, nome TEXT NOT NULL DEFAULT '', idioma TEXT NOT NULL DEFAULT 'pt', origem TEXT NOT NULL DEFAULT '', pais TEXT, hubspot INTEGER NOT NULL DEFAULT 0, criado_em TEXT NOT NULL, atualizado_em TEXT NOT NULL);",
];
const EMAIL = /^[^\s@<>()[\]\\,;:"]{1,64}@[a-z0-9.-]{1,190}\.[a-z]{2,24}$/i;
const ORIGENS = new Set(["popup", "rodape", "artigo"]);
const id = () => [...crypto.getRandomValues(new Uint8Array(9))].map((b) => "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36]).join("");

export async function receberNewsletter(request, env, ctx, url, json) {
  const origemH = request.headers.get("Origin");
  if (origemH && new URL(origemH).host !== url.host) return json({ ok: false, erro: "Origem recusada" }, 403);
  if (!(request.headers.get("Content-Type") || "").includes("application/json")) return json({ ok: false, erro: "Formato inválido" }, 415);
  const texto = await request.text();
  if (texto.length > 4096) return json({ ok: false, erro: "Pedido demasiado grande" }, 413);
  let c; try { c = JSON.parse(texto); } catch { return json({ ok: false, erro: "JSON inválido" }, 400); }
  if (!c || typeof c !== "object") return json({ ok: false, erro: "JSON inválido" }, 400);
  const idioma = c.idioma === "pt" ? "pt" : "en";
  // Anti-spam silencioso: campo-armadilha
  if (String(c.site_empresa || "").trim()) return json({ ok: true });
  const email = String(c.email || "").trim().toLowerCase().slice(0, 254);
  if (!EMAIL.test(email)) return json({ ok: false, erros: { email: idioma === "pt" ? "Escreva um e-mail válido." : "Please enter a valid email." } }, 400);
  if (c.consentimento !== true) return json({ ok: false, erros: { consentimento: idioma === "pt" ? "Confirme que quer receber os e-mails." : "Please confirm you want to receive the emails." } }, 400);
  const nome = String(c.nome || "").trim().replace(/\s+/g, " ").slice(0, 80);
  const origem = ORIGENS.has(c.origem) ? c.origem : "rodape";
  let pagina = "";
  try { const p = new URL(String(c.pagina || ""), url.origin); if (p.host === url.host) pagina = p.origin + p.pathname; } catch {}
  if (!env.DB && !hubspotAtivo(env, "newsletter")) return json({ ok: false, erro: "Newsletter ainda não configurada" }, 503);

  const agora = new Date().toISOString();
  const pais = (request.cf && request.cf.country) || null;
  if (env.DB) {
    const gravar = () => env.DB.prepare(`INSERT INTO newsletter (id, email, nome, idioma, origem, pais, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET nome = CASE WHEN excluded.nome != '' THEN excluded.nome ELSE nome END, idioma = excluded.idioma, atualizado_em = excluded.atualizado_em`)
      .bind(id(), email, nome, idioma, origem, pais, agora, agora).run();
    try { await gravar(); } catch (e) {
      if (!/no such table/i.test(String(e && e.message))) throw e;
      await env.DB.exec(ESQUEMA_NEWSLETTER.join("\n"));
      await gravar();
    }
  }
  if (hubspotAtivo(env, "newsletter")) {
    const envio = enviarHubspot(env, "newsletter", { email, nome, idioma, pagina, origem: `Newsletter (${origem})` })
      .then(async () => { if (env.DB) await env.DB.prepare("UPDATE newsletter SET hubspot = 1 WHERE email = ?").bind(email).run(); })
      .catch((e) => console.error(JSON.stringify({ evento: "hubspot_newsletter_falhou", erro: String(e && e.message).slice(0, 300) })));
    if (env.DB) ctx.waitUntil(envio); else await envio;
  }
  console.log(JSON.stringify({ evento: "newsletter_inscricao", origem }));
  return json({ ok: true });
}

export async function apiNewsletter(rota, metodo, env, { json, ErroPedido }) {
  if (rota === "newsletter" && metodo === "GET") {
    const { results } = await env.DB.prepare("SELECT id, email, nome, idioma, origem, pais, hubspot, criado_em FROM newsletter ORDER BY criado_em DESC").all();
    return json({ ok: true, inscritos: results, hubspot: hubspotAtivo(env, "newsletter") });
  }
  const m = rota.match(/^newsletter\/([a-z0-9]{6,32})$/);
  if (m && metodo === "DELETE") {
    await env.DB.prepare("DELETE FROM newsletter WHERE id = ?").bind(m[1]).run();
    return json({ ok: true });
  }
  if (rota.startsWith("newsletter")) throw new ErroPedido(404, "Não encontrado.");
  return null;
}
